import { Fragment, useEffect, useRef, useState } from 'react';
import './BoardExplorer.css';
import {
  AI_DIE_FACES,
  CHRONOBOT_ACTIONS,
  Chronobot,
  DEFAULT_CONFIG,
  MECH_PLACEMENT,
  PASSING_RULE,
  rollAiDie,
  rollShapeDie,
  type ChronobotActionId,
  type ChronobotState,
  type CommandToken,
  type CommandTokensState,
  type GameState,
  type Instruction,
  type PathId,
  type Resource,
  type Worker,
  type BreakthroughShape,
} from './engine';
import {
  BOARD_COUNTERS,
  CHRONOBOT_HOTSPOTS,
  type Hotspot,
} from './board/chronobotHotspots';
import { TIME_TRAVEL_TRACK, WARP_MARKER } from './board/timeTravelTrack';
import {
  COMMAND_MARKER_IMG,
  MARKER_WIDTH,
  PATH_SPOTS,
} from './board/chronobotPaths';
import { ActionIcon } from './board/ActionIcon';

/** Time Travel marker spot keys used in the calibration flow (tt0 = start). */
const TT_KEYS = TIME_TRAVEL_TRACK.spots.map((_, i) => `tt${i}`);
/** Command-path step keys for calibration, e.g. "short0" / "long7". */
const pathKey = (path: PathId, index: number) => `${path}${index}`;
const SHORT_KEYS = PATH_SPOTS.short.map((_, i) => pathKey('short', i));
const LONG_KEYS = PATH_SPOTS.long.map((_, i) => pathKey('long', i));
const PATH_KEYS = [...SHORT_KEYS, ...LONG_KEYS];
/** Calibration key for the Warp-tile marker (image + count). */
const WARP_KEY = 'warp';
/** Every calibratable point: count badges, the 7 Time Travel spots, path steps, warp. */
const CAL_KEYS: string[] = [
  ...BOARD_COUNTERS.map((c) => c.key),
  ...TT_KEYS,
  ...PATH_KEYS,
  WARP_KEY,
];

type PendingStep =
  | null
  | 'mech'
  | 'buildingVP'
  | 'mineOpen'
  | 'mineResources'
  | 'recruitWorker'
  | 'geniusQuestion'
  | 'geniusRecruit'
  | 'research'
  | 'removeAnomaly'
  | 'reboot'
  | 'timeTravel';

/**
 * A serializable snapshot of everything needed to restore a moment: the engine
 * state, the Command-token positions, and the die/token shown for the turn that
 * produced this state. Undo, History, and (later) Persistence all build on it.
 */
interface Snapshot {
  state: GameState;
  tokens: CommandTokensState;
  botDie: number | null;
  activeToken: CommandToken | null;
}

/** One entry on the undo/history stack: the pre-commit snapshot + what happened. */
interface UndoEntry {
  snap: Snapshot;
  label: string;
  /** Concise per-turn change-list (mech placed, cubes gained, +5 set, etc.). */
  effects: string[];
}

const BUILDING_LABEL: Record<string, string> = {
  factory: 'Factory',
  lab: 'Lab',
  powerplant: 'Power Plant',
  support: 'Life Support',
};

/**
 * Summarize the concrete board/virtual changes of a turn from the pre→post
 * Chronobot state (using instruction ids only to spot the +5 VP set bonuses).
 * These are the things the player physically applies: mech placed, tile taken for
 * X VP, cubes gained/discarded, Warp tile removed, etc.
 */
function summarizeTurn(
  pre: ChronobotState,
  post: ChronobotState,
  instructions: Instruction[],
): string[] {
  const out: string[] = [];
  const hasId = (part: string) => instructions.some((i) => i.id.includes(part));

  if (post.exosuitsAvailable < pre.exosuitsAvailable) out.push('🤖 Mech placed');
  if (hasId('fail')) out.push('⚠️ Failed action (+1 VP)');

  (['factory', 'lab', 'powerplant', 'support'] as const).forEach((t) => {
    if (post.buildings[t] > pre.buildings[t]) {
      const vp = post.buildingVps[t][post.buildingVps[t].length - 1];
      out.push(`🏛 ${BUILDING_LABEL[t]} taken (${vp} VP)`);
    }
  });
  if (post.superprojects > pre.superprojects) {
    const vp = post.superprojectVps[post.superprojectVps.length - 1];
    out.push(`🏗 Superproject taken (${vp} VP) · Breakthrough discarded`);
  }

  (['circle', 'triangle', 'square'] as const).forEach((s) => {
    if (post.breakthroughs[s] > pre.breakthroughs[s]) {
      out.push(`🔷 Breakthrough taken (${s})`);
    }
  });

  if (hasId('recruit-set')) {
    out.push('♻️ Worker set completed — discard one of each (+5 VP)');
  } else {
    (['genius', 'administrator', 'engineer', 'scientist'] as const).forEach((w) => {
      if (post.workers[w] > pre.workers[w]) out.push(`👤 Recruited ${w}`);
    });
  }

  const resTypes = ['neutronium', 'uranium', 'gold', 'titanium'] as const;
  if (hasId('mine-set')) {
    out.push('♻️ Resource set completed — discard one of each (+5 VP)');
  } else {
    resTypes.forEach((r) => {
      const d = post.resources[r] - pre.resources[r];
      if (d > 0) out.push(`⛏ Gained ${d > 1 ? d + ' ' : ''}${r}`);
    });
    resTypes.forEach((r) => {
      const d = pre.resources[r] - post.resources[r];
      if (d > 0) out.push(`➖ Discarded ${d > 1 ? d + ' ' : ''}${r}`);
    });
  }

  if (post.anomalies < pre.anomalies) out.push('☢️ Removed 1 Anomaly');
  if (
    post.warpTilesOnTimeline < pre.warpTilesOnTimeline ||
    post.timeTravelTrack > pre.timeTravelTrack
  ) {
    out.push('⏳ Warp tile removed → Time Travel advances');
  }
  return out;
}

/** Cap the undo/history depth so persisted state stays bounded. */
const UNDO_CAP = 50;

// --- Persistence (localStorage) ---------------------------------------------
// Survives refresh and browser restart. Only the committed game shape is saved
// (engine state, tokens, undo/history, debug flag) — transient UI (open dialog,
// shown die, calibrate positions) is not persisted. A version guards the schema.
const PERSIST_KEY = 'anachrony:chronobot';
const PERSIST_VERSION = 2;

interface PersistedGame {
  version: number;
  state: GameState;
  tokens: CommandTokensState;
  undoStack: UndoEntry[];
  debug: boolean;
}

function loadPersisted(): PersistedGame | null {
  try {
    const raw = localStorage.getItem(PERSIST_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as PersistedGame;
    if (data?.version !== PERSIST_VERSION || !data.state || !data.tokens) return null;
    return data;
  } catch {
    return null;
  }
}

function savePersisted(p: Omit<PersistedGame, 'version'>): void {
  try {
    localStorage.setItem(
      PERSIST_KEY,
      JSON.stringify({ version: PERSIST_VERSION, ...p }),
    );
  } catch {
    /* quota / disabled storage — ignore */
  }
}

function clearPersisted(): void {
  try {
    localStorage.removeItem(PERSIST_KEY);
  } catch {
    /* ignore */
  }
}

/** Describe a Resource-cube discard list, e.g. "2 titanium + 1 gold". */
function describeCubes(cubes: Resource[]): string {
  const order: Resource[] = ['neutronium', 'titanium', 'gold', 'uranium', 'water'];
  const counts = new Map<Resource, number>();
  for (const c of cubes) counts.set(c, (counts.get(c) ?? 0) + 1);
  return order
    .filter((r) => counts.has(r))
    .map((r) => `${counts.get(r)} ${r}`)
    .join(' + ');
}

/** Cropped icon per Breakthrough shape (only the shape matters to the Chronobot). */
const SHAPE_IMG: Record<BreakthroughShape, string> = {
  circle: '/assets/solo/breakthroughs/circle.png',
  triangle: '/assets/solo/breakthroughs/triangle.png',
  square: '/assets/solo/breakthroughs/square.png',
};
const SHAPE_ORDER: BreakthroughShape[] = ['circle', 'triangle', 'square'];

function ShapeIcon({ shape, size }: { shape: BreakthroughShape; size: number }) {
  return (
    <img
      className="shape-icon"
      src={SHAPE_IMG[shape]}
      alt={shape}
      style={{ width: size, height: size }}
    />
  );
}

function isConstructBuilding(a: ChronobotActionId): boolean {
  return a.startsWith('construct-') && a !== 'construct-superproject';
}

/** Value for each board tracking spot. */
function counterValue(
  bot: ChronobotState,
  key: (typeof BOARD_COUNTERS)[number]['key'],
): number {
  switch (key) {
    case 'superproject':
      return bot.superprojects;
    case 'anomaly':
      return bot.anomalies;
    case 'mech':
      return bot.exosuitsAvailable;
    case 'breakthrough':
      return (
        bot.breakthroughs.circle +
        bot.breakthroughs.triangle +
        bot.breakthroughs.square
      );
    case 'neutronium':
    case 'uranium':
    case 'gold':
    case 'titanium':
      return bot.resources[key];
    case 'genius':
    case 'administrator':
    case 'engineer':
    case 'scientist':
      return bot.workers[key];
    default:
      return bot.buildings[key];
  }
}

/** Building-tracker keys whose tooltip lists the specific VP of each tile. */
const BUILDING_KEYS = ['factory', 'lab', 'powerplant', 'support'] as const;

/** Tooltip text for a board tracker badge. */
function counterTooltip(
  bot: ChronobotState,
  c: (typeof BOARD_COUNTERS)[number],
): string {
  const count = counterValue(bot, c.key);
  if (c.key === 'superproject') {
    const vps = bot.superprojectVps;
    return vps.length
      ? `${c.label} ×${count} — VP: ${vps.join(', ')}`
      : `${c.label}: 0`;
  }
  if ((BUILDING_KEYS as readonly string[]).includes(c.key)) {
    const vps = bot.buildingVps[c.key as (typeof BUILDING_KEYS)[number]];
    return vps.length
      ? `${c.label} ×${count} — VP: ${vps.join(', ')} (max 3 of a type)`
      : `${c.label}: 0 (max 3 of a type)`;
  }
  switch (c.key) {
    case 'breakthrough':
      return `${c.label}: ${count} — click for per-shape counts`;
    case 'mech':
      return `${c.label}: ${count} powered Exosuit${count === 1 ? '' : 's'} available`;
    case 'anomaly':
      return `${c.label}: ${count} (max 3)`;
    case 'neutronium':
    case 'uranium':
    case 'gold':
    case 'titanium':
      return `${c.label}: ${count} cube${count === 1 ? '' : 's'}`;
    case 'genius':
    case 'administrator':
    case 'engineer':
    case 'scientist':
      return `${c.label}: ${count}`;
    default:
      return `${c.label}: ${count}`;
  }
}

/**
 * Board-first explorer + debug harness. Tapping an action tile treats it as the
 * rolled action. Because "can a mech be placed?" depends on board state the app
 * can't see, any action that places a mech first prompts the player to Confirm
 * placed / Cannot place before the engine resolves (Cannot place → the failed
 * action that spends no Exosuit and scores 1 VP).
 */

const DEFAULT_PANEL: [number, number, number, number] = [48.5, 2, 50.5, 78];

/** Debug starting state: powered up, 2 Warp tiles on the Timeline, mid-Action-Rounds. */
function initDebugState(): GameState {
  const s = Chronobot.setup({ ...DEFAULT_CONFIG, bot: 'chronobot' });
  return {
    ...s,
    phase: 'actions',
    chronobot: { ...s.chronobot, warpTilesOnTimeline: 2, exosuitsAvailable: 6 },
  };
}

export default function BoardExplorer() {
  // Rehydrate a saved game once on mount (null → fresh game).
  const [persisted] = useState(loadPersisted);
  const [state, setState] = useState<GameState>(
    () => persisted?.state ?? initDebugState(),
  );
  const [active, setActive] = useState<Hotspot | null>(null);
  const [pending, setPending] = useState<PendingStep>(null);
  const [result, setResult] = useState<Instruction[]>([]);
  const [selectedVP, setSelectedVP] = useState<number | null>(null);
  const [selectedResources, setSelectedResources] = useState<Resource[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [rolledShape, setRolledShape] = useState<BreakthroughShape | null>(null);
  const [showBreakthroughs, setShowBreakthroughs] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  // True only for a play-mode free-tap (the read-only rule view), never for a
  // die-driven bot turn (which resolves even in play mode).
  const [ruleView, setRuleView] = useState(false);
  // The End-of-Actions details show as a dismissible popover (opened from a top
  // status chip), closing whenever a top action fires.
  const [showStatus, setShowStatus] = useState(false);
  const [outline, setOutline] = useState(false);
  const [passMsg, setPassMsg] = useState<string | null>(null);
  // Debug OFF = play mode: tapping a tile only shows its rules (no activation),
  // and the calibrate/outline dev controls are hidden. Defaults OFF.
  const [debug, setDebug] = useState(() => persisted?.debug ?? false);

  // --- Command tokens (2–5) travelling the two Action paths ---
  const [tokens, setTokens] = useState<CommandTokensState>(
    () => persisted?.tokens ?? Chronobot.initialCommandTokens(),
  );
  const [botDie, setBotDie] = useState<number | null>(null);
  const [activeToken, setActiveToken] = useState<CommandToken | null>(null);
  // Undo/history stack: each entry is the snapshot *before* a committed step.
  const [undoStack, setUndoStack] = useState<UndoEntry[]>(
    () => persisted?.undoStack ?? [],
  );
  // Refs mirror the die/token for the synchronous immediate-resolve path
  // (state updates are async, so `resolve` reads these instead).
  const botDieRef = useRef<number | null>(null);
  const activeTokenRef = useRef<CommandToken | null>(null);
  // Marks the open Time Travel dialog as the bot's forced final Time Travel
  // before passing (out of Exosuits): committing it resolves the pass, not a
  // normal Action turn.
  const passTimeTravelRef = useRef<boolean>(false);

  // --- Badge / Time Travel spot position calibration ---
  const [calibrate, setCalibrate] = useState(false);
  const [positions, setPositions] = useState<Record<string, [number, number]>>(
    () => ({
      ...Object.fromEntries(BOARD_COUNTERS.map((c) => [c.key, c.pos])),
      ...Object.fromEntries(TIME_TRAVEL_TRACK.spots.map((p, i) => [`tt${i}`, p])),
      ...Object.fromEntries(SHORT_KEYS.map((k, i) => [k, PATH_SPOTS.short[i]])),
      ...Object.fromEntries(LONG_KEYS.map((k, i) => [k, PATH_SPOTS.long[i]])),
      [WARP_KEY]: WARP_MARKER.pos,
    }),
  );
  const [markerWidth, setMarkerWidth] = useState<number>(TIME_TRAVEL_TRACK.markerWidth);
  const [cmdMarkerWidth, setCmdMarkerWidth] = useState<number>(MARKER_WIDTH);
  const [warpMarkerWidth, setWarpMarkerWidth] = useState<number>(WARP_MARKER.width);
  const [selected, setSelected] = useState<string>(BOARD_COUNTERS[0].key);

  useEffect(() => {
    if (!calibrate) return;
    const onKey = (e: KeyboardEvent) => {
      const step = e.shiftKey ? 1 : 0.2;
      let dx = 0;
      let dy = 0;
      if (e.key === 'ArrowLeft') dx = -step;
      else if (e.key === 'ArrowRight') dx = step;
      else if (e.key === 'ArrowUp') dy = -step;
      else if (e.key === 'ArrowDown') dy = step;
      else return;
      e.preventDefault();
      setPositions((p) => {
        const [x, y] = p[selected];
        return { ...p, [selected]: [+(x + dx).toFixed(1), +(y + dy).toFixed(1)] };
      });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [calibrate, selected]);

  const onBoardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!calibrate) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = +(((e.clientX - rect.left) / rect.width) * 100).toFixed(1);
    const y = +(((e.clientY - rect.top) / rect.height) * 100).toFixed(1);
    setPositions((p) => ({ ...p, [selected]: [x, y] }));
    const i = CAL_KEYS.indexOf(selected);
    setSelected(CAL_KEYS[(i + 1) % CAL_KEYS.length]);
  };

  const bot = state.chronobot;

  // Persist the committed game whenever it changes (transient UI is excluded).
  useEffect(() => {
    savePersisted({ state, tokens, undoStack, debug });
  }, [state, tokens, undoStack, debug]);

  // Dismiss the status popover on Escape or a click outside it (and its chip).
  useEffect(() => {
    if (!showStatus) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest('.eoa-popover') && !t.closest('.status-chip')) {
        setShowStatus(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowStatus(false);
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [showStatus]);

  const closePanel = () => {
    setActive(null);
    setPending(null);
    setResult([]);
    setSelectedVP(null);
    setSelectedResources([]);
    setSelectedWorker(null);
    setRolledShape(null);
    setBotDie(null);
    setActiveToken(null);
    setRuleView(false);
    botDieRef.current = null;
    activeTokenRef.current = null;
    passTimeTravelRef.current = false;
  };

  // Commit a state change: push the current (pre-commit) snapshot + a history
  // label onto the undo stack, then apply the next state + tokens. Every
  // committed turn routes through here so Undo/History have one source of truth.
  const commit = (
    next: GameState,
    nextTokens: CommandTokensState,
    label: string,
    effects: string[] = [],
  ) => {
    const pre: Snapshot = { state, tokens, botDie, activeToken };
    setUndoStack((s) => [...s, { snap: pre, label, effects }].slice(-UNDO_CAP));
    setState(next);
    setTokens(nextTokens);
  };

  /** One-line history label for a resolved Action turn. */
  const turnLabel = (
    instructions: Instruction[],
    die: number | null,
    actionLabel: string,
  ) => {
    const vp = instructions.reduce((n, i) => n + (i.effect?.vp ?? 0), 0);
    const diePart = die != null ? `🎲${die} · ` : '';
    const vpPart = vp ? ` · +${vp} VP` : '';
    return `Era ${state.era} · ${diePart}${actionLabel}${vpPart}`;
  };

  // Undo the last committed step: restore its snapshot wholesale, including the
  // die that was shown (so re-taking the turn repeats the same roll).
  const undo = () => {
    if (undoStack.length === 0) return;
    const { snap } = undoStack[undoStack.length - 1];
    closePanel(); // clears panel + die/token/refs first…
    setState(snap.state);
    setTokens(snap.tokens);
    setBotDie(snap.botDie); // …then restore the die/token from the snapshot
    setActiveToken(snap.activeToken);
    botDieRef.current = snap.botDie;
    activeTokenRef.current = null;
    setPassMsg(null);
    setUndoStack((s) => s.slice(0, -1));
  };

  // "Reset Game" — confirm, clear saved state, and start a brand-new game.
  const reset = () => {
    if (
      !window.confirm(
        'Start a new game? This clears the current Chronobot game and its history.',
      )
    ) {
      return;
    }
    clearPersisted();
    setState(initDebugState());
    setTokens(Chronobot.initialCommandTokens());
    setUndoStack([]);
    setShowBreakthroughs(false);
    setShowHistory(false);
    setPassMsg(null);
    closePanel();
  };

  // Debug toggle. Turning it OFF (play mode) also forces the dev-only outline and
  // calibrate controls off; any open panel is closed so the mode switch is clean.
  const toggleDebug = () => {
    setDebug((d) => {
      const next = !d;
      if (!next) {
        setOutline(false);
        setCalibrate(false);
      }
      return next;
    });
    closePanel();
  };

  // "Take Bot Action": the bot's turn. First consult the "Passing and End of
  // Actions" rule (rulebook p. 6). On a terminal decision the bot passes instead
  // of taking a normal Action:
  //  - out of Exosuits (and not preempted by your pass) → one final Time Travel,
  //    then it passes;
  //  - you passed first and it has met its minimum → the phase ends immediately.
  // Otherwise it rolls the AI die, activates the matching Command token, and opens
  // that Action's dialog; on commit, `resolve` advances the token along its path.
  const takeBotAction = () => {
    setShowStatus(false);
    const decision = Chronobot.botPassDecision(state);
    if (decision === 'time-travel-then-pass') {
      // Out of Exosuits: its final turn is a Time Travel, then it passes. Show
      // the Time Travel box just as if that space activated; committing it (via
      // startTurn) resolves the pass. If no Warp tiles remain there is nothing to
      // remove, so resolve the (failed) Time Travel + pass straight away.
      botDieRef.current = null;
      activeTokenRef.current = null;
      setBotDie(null);
      setActiveToken(null);
      setPassMsg(null);
      const h = CHRONOBOT_HOTSPOTS.find((x) => x.action === 'time-travel');
      if (h && bot.warpTilesOnTimeline > 0) {
        passTimeTravelRef.current = true;
        onTileClick(h, true);
      } else {
        const { state: next, instructions } = Chronobot.resolveBotPass(state);
        commit(
          next,
          tokens,
          `Era ${state.era} · Bot: Time Travel + pass`,
          summarizeTurn(state.chronobot, next.chronobot, instructions),
        );
        setPassMsg(instructions.map((i) => i.text).join(' '));
      }
      return;
    }
    if (decision === 'pass') {
      const { state: next, instructions } = Chronobot.resolveBotPass(state);
      commit(next, tokens, `Era ${state.era} · Bot passed`);
      setPassMsg(instructions.map((i) => i.text).join(' '));
      setBotDie(null);
      setActiveToken(null);
      botDieRef.current = null;
      activeTokenRef.current = null;
      return;
    }
    // 'continue' / 'must-continue-min3' → take a normal die-driven Action turn.
    // Reuse a die already shown (e.g. restored by Undo) so it repeats the same roll.
    const die = botDie ?? rollAiDie();
    const token = die as CommandToken;
    const pos = tokens.positions[token];
    const action = Chronobot.tokenAction(pos);
    const h = CHRONOBOT_HOTSPOTS.find((x) => x.action === action);
    if (!h) return;
    setPassMsg(null);
    botDieRef.current = die;
    activeTokenRef.current = token;
    setBotDie(die);
    setActiveToken(token);
    onTileClick(h, true);
  };

  // "Passing and End of Actions" (rulebook p. 6): the player passes. The engine
  // then decides (on the next Take Bot Action) whether the phase ends, the bot
  // must keep going to its minimum, or it owes a final Time Travel before passing.
  const playerPass = () => {
    setShowStatus(false);
    commit(Chronobot.markPlayerPassed(state), tokens, `Era ${state.era} · You passed`);
    setPassMsg(null);
    closePanel();
  };

  const resolve = (
    h: Hotspot,
    opts: {
      cannotPlace?: boolean;
      buildingVP?: number;
      minedResources?: Resource[];
      recruitedWorker?: Worker;
      shape?: BreakthroughShape;
      geniusAvailable?: boolean;
    },
  ) => {
    const { state: next, instructions } = Chronobot.takeActionTurn(state, {
      dieRoll: botDieRef.current ?? rollAiDie(),
      actionId: h.action,
      shape: opts.shape ?? rollShapeDie(),
      geniusAvailable: opts.geniusAvailable ?? false,
      noSpaceAvailable: opts.cannotPlace,
      buildingVP: opts.buildingVP,
      minedResources: opts.minedResources,
      recruitedWorker: opts.recruitedWorker,
    });
    // Die-driven turn: advance the activated Command token to its next path step.
    const tk = activeTokenRef.current;
    const nextTokens = tk != null ? Chronobot.advanceActiveToken(tokens, tk) : tokens;
    commit(
      next,
      nextTokens,
      turnLabel(instructions, botDie, CHRONOBOT_ACTIONS[h.action].label),
      summarizeTurn(state.chronobot, next.chronobot, instructions),
    );
    setResult(instructions);
    setPending(null);
    activeTokenRef.current = null;
  };

  // `force` bypasses play-mode read-only: the die-driven bot turn always resolves,
  // even in play mode. Only a player free-tap respects the Debug/play flag.
  const onTileClick = (h: Hotspot, force = false) => {
    setShowStatus(false);
    setActive(h);
    setResult([]);
    setSelectedVP(null);
    setSelectedResources([]);
    setSelectedWorker(null);
    setRolledShape(null);
    const showRuleOnly = !debug && !force;
    setRuleView(showRuleOnly);
    if (showRuleOnly) {
      // Play mode free-tap: show the rule reference only, no engine activation.
      setPending(null);
      return;
    }
    if (h.action === 'mine-resource') {
      setPending('mineOpen'); // Mine uses a Mine space — first ask if one is open
    } else if (h.action === 'recruit-genius-research') {
      setPending('geniusQuestion'); // Genius + space available? else Research
    } else if (h.action === 'remove-anomaly') {
      setPending('removeAnomaly'); // outcome fully determined by bot state
    } else if (h.action === 'reboot') {
      setPending('reboot'); // Chronobot does nothing
    } else if (h.action === 'time-travel' && bot.warpTilesOnTimeline > 0) {
      setPending('timeTravel'); // player removes a Warp tile & advances the marker
    } else if (CHRONOBOT_ACTIONS[h.action].placesExosuit) {
      setPending('mech'); // ask before spending a mech
    } else {
      resolve(h, {}); // no mech / no Warp tile — resolve immediately
    }
  };

  const onConfirmPlace = () => {
    if (!active) return;
    const a = active.action;
    // Successful Construct (building or superproject) → ask for the tile's VP next.
    if (a === 'construct-superproject') {
      const hasBreakthrough =
        bot.breakthroughs.circle +
          bot.breakthroughs.triangle +
          bot.breakthroughs.square >
        0;
      if (bot.superprojects < 3 && hasBreakthrough) {
        setSelectedVP(null);
        setPending('buildingVP');
      } else resolve(active, {});
    } else if (isConstructBuilding(a)) {
      const type = a.replace('construct-', '') as keyof typeof bot.buildings;
      if (bot.buildings[type] < 3) {
        setSelectedVP(null);
        setPending('buildingVP');
      } else resolve(active, {});
    } else if (a === 'recruit') {
      // Missing a Worker type → pick which was recruited; else resolve the set bonus.
      if (Chronobot.chooseRecruitWorker(bot)) {
        setSelectedWorker(Chronobot.recruitWorkerOrder(bot)[0]);
        setPending('recruitWorker');
      } else resolve(active, {});
    } else if (a === 'research' || a === 'recruit-genius-research') {
      // Research (or the Recruit-Genius-Research fallback): roll the shape die.
      setRolledShape(rollShapeDie());
      setPending('research');
    } else {
      resolve(active, {});
    }
  };

  const onCannotPlace = () => {
    if (active) resolve(active, { cannotPlace: true });
  };

  // Mine: player confirmed an open Mine space → pre-select the priority pair.
  const onMineHasSpace = () => {
    setSelectedResources(Chronobot.mineResourceOrder(bot).slice(0, 2));
    setPending('mineResources');
  };
  // Mine: no open Mine space → Failed Action (no Exosuit placed, +1 VP).
  const onMineNoSpace = () => {
    if (active) resolve(active, { cannotPlace: true });
  };

  // Pick a VP value — highlights it but does not commit; the player can re-pick.
  const onPickVP = (vp: number) => setSelectedVP(vp);

  // Pick the recruited Worker (single select) — highlights but does not commit.
  const onPickWorker = (w: Worker) => setSelectedWorker(w);

  // Recruit Genius / Research: player answers the Genius + space check.
  const onGeniusYes = () => setPending('geniusRecruit');
  // No Genius / no space → perform the Research action (its own mech gate + roll).
  const onGeniusNo = () => setPending('mech');

  // Click a Resource to add one; click again for ×2; a 3rd click clears it.
  // Total is capped at 2 (a Mine space grants 2 cubes, possibly the same twice).
  const onToggleResource = (r: Resource) => {
    setSelectedResources((cur) => {
      const countR = cur.filter((x) => x === r).length;
      if (countR === 2) return cur.filter((x) => x !== r); // ×2 → clear
      const next = [...cur, r]; // increment this resource
      while (next.length > 2) {
        // drop the most recent *other* resource to stay at 2 total
        for (let i = next.length - 1; i >= 0; i--) {
          if (next[i] !== r) {
            next.splice(i, 1);
            break;
          }
        }
      }
      return next;
    });
  };

  // "Start Your Turn" — commit any pending selection, then close the box.
  const startTurn = () => {
    if (pending === 'buildingVP' && selectedVP != null && active) {
      resolve(active, { buildingVP: selectedVP });
    } else if (pending === 'mineResources' && selectedResources.length === 2 && active) {
      resolve(active, { minedResources: selectedResources });
    } else if (pending === 'recruitWorker' && selectedWorker && active) {
      resolve(active, { recruitedWorker: selectedWorker });
    } else if (pending === 'research' && rolledShape && active) {
      resolve(active, { shape: rolledShape });
    } else if (pending === 'geniusRecruit' && active) {
      resolve(active, { geniusAvailable: true });
    } else if (pending === 'removeAnomaly' && active) {
      resolve(active, {});
    } else if (pending === 'reboot' && active) {
      resolve(active, {});
    } else if (pending === 'timeTravel' && active) {
      if (passTimeTravelRef.current) {
        // The bot's forced final Time Travel before passing — resolve the pass
        // (does the Time Travel effect, then marks the bot passed).
        const { state: next, instructions } = Chronobot.resolveBotPass(state);
        commit(
          next,
          tokens,
          `Era ${state.era} · Bot: Time Travel + pass`,
          summarizeTurn(state.chronobot, next.chronobot, instructions),
        );
        setPassMsg(instructions.map((i) => i.text).join(' '));
      } else {
        resolve(active, {});
      }
    }
    closePanel();
  };

  return (
    <div className="explorer">
      <StatsBar
        bot={state.chronobot}
        debug={debug}
        onToggleDebug={toggleDebug}
        outline={outline}
        onToggleOutline={() => setOutline((o) => !o)}
        onReset={reset}
        calibrate={calibrate}
        onToggleCalibrate={() => {
          setShowBreakthroughs(false);
          setCalibrate((c) => !c);
        }}
        botDie={botDie}
        botPassed={bot.passed}
        canTakeAction={!calibrate && active == null && !bot.passed}
        onTakeBotAction={takeBotAction}
        playerPassed={state.playerPassed}
        canPass={!calibrate && active == null}
        onPlayerPass={playerPass}
        canUndo={undoStack.length > 0}
        onUndo={undo}
        historyOpen={showHistory}
        onToggleHistory={() => setShowHistory((v) => !v)}
        statusOpen={showStatus}
        onToggleStatus={() => setShowStatus((v) => !v)}
      />

      <div className={`board-stage ${showHistory ? 'with-history' : ''}`}>
        <div
          className={`board-wrap ${calibrate ? 'calibrating' : ''}`}
          onClick={onBoardClick}
        >
          <img
            src="/assets/solo/board-chronobot.jpg"
            alt="Chronobot solo board"
            className="board"
          />

          {CHRONOBOT_HOTSPOTS.map((h) => {
            const [l, t, w, hgt] = h.rect;
            const def = CHRONOBOT_ACTIONS[h.action];
            const isActive = active?.id === h.id;
            return (
              <button
                key={h.id}
                className={`hotspot ${outline ? 'outlined' : ''} ${isActive ? 'active' : ''}`}
                style={{ left: `${l}%`, top: `${t}%`, width: `${w}%`, height: `${hgt}%` }}
                onClick={() => {
                  // Free-tap (debug): not a die-driven turn, so it advances no token.
                  botDieRef.current = null;
                  activeTokenRef.current = null;
                  setBotDie(null);
                  setActiveToken(null);
                  onTileClick(h);
                }}
                aria-label={def.label}
                title={def.label}
              />
            );
          })}

          {BOARD_COUNTERS.map((c) => {
            const count = counterValue(bot, c.key);
            const [x, y] = positions[c.key] ?? c.pos;
            const sel = calibrate && selected === c.key;
            const breakdown = c.key === 'breakthrough' && !calibrate;
            return (
              <div
                key={c.key}
                className={`count-badge ${sel ? 'cal-selected' : ''} ${breakdown ? 'clickable' : ''}`}
                style={{ left: `${x}%`, top: `${y}%` }}
                title={calibrate ? c.label : counterTooltip(bot, c)}
                onClick={breakdown ? () => setShowBreakthroughs((v) => !v) : undefined}
              >
                {calibrate ? (sel ? '◎' : '·') : count}
                {breakdown && showBreakthroughs && (
                  <div className="bt-popover" onClick={(e) => e.stopPropagation()}>
                    {SHAPE_ORDER.map((s) => (
                      <span key={s} className="bt-pop-row">
                        <ShapeIcon shape={s} size={22} />
                        <b>{bot.breakthroughs[s]}</b>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Time Travel marker — at its track spot; all 7 shown while calibrating. */}
          {calibrate
            ? TT_KEYS.map((key, i) => {
                const [x, y] = positions[key] ?? TIME_TRAVEL_TRACK.spots[i];
                return (
                  <img
                    key={key}
                    src="/assets/solo/timetravel-marker.png"
                    alt=""
                    className={`tt-marker ${selected === key ? 'cal-selected' : 'cal-ghost'}`}
                    style={{ left: `${x}%`, top: `${y}%`, width: `${markerWidth}%` }}
                  />
                );
              })
            : (() => {
                const spot = Chronobot.timeTravelSpot(bot);
                const [x, y] = positions[`tt${spot}`] ?? TIME_TRAVEL_TRACK.spots[spot];
                return (
                  <img
                    src="/assets/solo/timetravel-marker.png"
                    alt="Time Travel marker"
                    className="tt-marker"
                    style={{ left: `${x}%`, top: `${y}%`, width: `${markerWidth}%` }}
                  />
                );
              })()}

          {/* Command-token markers. Calibrating: all 12 path steps as ghosts. */}
          {calibrate
            ? PATH_KEYS.map((key) => {
                const [x, y] = positions[key];
                return (
                  <div
                    key={key}
                    className={`cmd-spot ${selected === key ? 'cal-selected' : ''}`}
                    style={{ left: `${x}%`, top: `${y}%` }}
                  >
                    {selected === key ? '◎' : '·'}
                  </div>
                );
              })
            : Chronobot.COMMAND_TOKENS.map((tk) => {
                const pos = tokens.positions[tk];
                const [x, y] = positions[pathKey(pos.path, pos.index)] ??
                  PATH_SPOTS[pos.path][pos.index];
                // When a pair shares a spot, split them: the bottom token shifts
                // half a marker-width right, the top one half-width left, so the
                // top marker stays visible. A solo marker sits dead-centre.
                const stack = Chronobot.tokensAtPosition(tokens, pos.path, pos.index);
                const rank = stack.indexOf(tk); // 0 = bottom of the stack
                const half = cmdMarkerWidth / 2;
                const dx = stack.length >= 2 ? (rank === 0 ? half : -half) : 0;
                return (
                  <img
                    key={tk}
                    src={COMMAND_MARKER_IMG[tk]}
                    alt={`Command token ${tk}`}
                    className={`cmd-marker ${activeToken === tk ? 'active' : ''}`}
                    style={{
                      left: `${x + dx}%`,
                      top: `${y}%`,
                      width: `${cmdMarkerWidth}%`,
                      zIndex: 4 + rank,
                    }}
                  />
                );
              })}

          {/* Warp-tile marker (image + count underneath), calibratable. */}
          {(() => {
            const [wx, wy] = positions[WARP_KEY] ?? WARP_MARKER.pos;
            const sel = calibrate && selected === WARP_KEY;
            return (
              <div
                className={`warp-marker ${sel ? 'cal-selected' : ''}`}
                style={{ left: `${wx}%`, top: `${wy}%`, width: `${warpMarkerWidth}%` }}
                title={`Chronobot Warp tiles on the Timeline: ${bot.warpTilesOnTimeline}`}
              >
                <img
                  className="warp-img"
                  src="/assets/solo/warp-tile.png"
                  alt="Chronobot Warp tile"
                />
                <span className="warp-count">{bot.warpTilesOnTimeline}</span>
              </div>
            );
          })()}

          {!calibrate && active && (
            <DetailPanel
              hotspot={active}
              readOnly={ruleView}
              pending={pending}
              result={result}
              selectedVP={selectedVP}
              selectedResources={selectedResources}
              selectedWorker={selectedWorker}
              rolledShape={rolledShape}
              breakthroughs={bot.breakthroughs}
              removeAnomaly={(() => {
                const discards = Chronobot.chooseRemoveAnomalyDiscards(bot);
                return {
                  canRemove: bot.anomalies >= 1 && discards != null,
                  discards: discards ? describeCubes(discards) : '',
                  reason:
                    bot.anomalies < 1
                      ? 'it has no Anomaly to remove'
                      : 'it lacks 2 Resource cubes (or a Neutronium) to spend',
                };
              })()}
              mineOrder={Chronobot.mineResourceOrder(bot)}
              workerOrder={Chronobot.recruitWorkerOrder(bot)}
              onConfirmPlace={onConfirmPlace}
              onCannotPlace={onCannotPlace}
              onMineHasSpace={onMineHasSpace}
              onMineNoSpace={onMineNoSpace}
              onGeniusYes={onGeniusYes}
              onGeniusNo={onGeniusNo}
              onPickVP={onPickVP}
              onToggleResource={onToggleResource}
              onPickWorker={onPickWorker}
              onStartTurn={startTurn}
              onClose={closePanel}
            />
          )}
        </div>
      </div>

      {!calibrate && showStatus && (
        <EndOfActionsBar
          state={state}
          passMsg={passMsg}
          minActions={Chronobot.chronobotMinActions(state)}
          onClose={() => setShowStatus(false)}
        />
      )}

      {showHistory && (
        <HistoryPane entries={undoStack} onClose={() => setShowHistory(false)} />
      )}

      {calibrate && (
        <CalibrationPanel
          positions={positions}
          selected={selected}
          onSelect={setSelected}
          markerWidth={markerWidth}
          onMarkerWidth={setMarkerWidth}
          cmdMarkerWidth={cmdMarkerWidth}
          onCmdMarkerWidth={setCmdMarkerWidth}
          warpMarkerWidth={warpMarkerWidth}
          onWarpMarkerWidth={setWarpMarkerWidth}
        />
      )}
    </div>
  );
}

/** Human-readable summary of the bot's pass decision (rulebook p. 6). */
function describeDecision(
  d: ReturnType<typeof Chronobot.botPassDecision>,
  min: number,
): string {
  switch (d) {
    case 'continue':
      return `Continue taking bot turns until ${min} have been taken.`;
    case 'must-continue-min3':
      return `The Chronobot is out of Exosuits but has not taken ${min} Actions yet — it keeps taking turns (Time Travel / Reboot) until it reaches ${min}.`;
    case 'time-travel-then-pass':
      return 'The Chronobot is out of Exosuits — it takes a final Time Travel Action (if able), then passes.';
    case 'pass':
      return 'The Chronobot passes for this Era.';
  }
}

/**
 * The "Passing and End of Actions" strip (rulebook p. 6). Shows the pass state,
 * lets the player pass, and drives the Chronobot's pass decision through the
 * engine (immediate end / keep going / final Time Travel then pass).
 */
/**
 * The "End of Actions" details, shown as a dismissible popover anchored under the
 * top-bar status chip (rulebook p. 6 pass state + minimum Actions).
 */
function EndOfActionsBar({
  state,
  passMsg,
  minActions,
  onClose,
}: {
  state: GameState;
  passMsg: string | null;
  minActions: number;
  onClose: () => void;
}) {
  const bot = state.chronobot;
  const decision = Chronobot.botPassDecision(state);
  const canEnd = Chronobot.actionRoundsCanEnd(state);
  const [showRule, setShowRule] = useState(false);

  return (
    <div className="eoa-popover">
      <div className="eoa-pop-head">
        <span className="eoa-pop-title">End of Actions</span>
        <button className="eoa-pop-close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>
      <div className="eoa-flags">
        <span className={`eoa-flag ${state.playerPassed ? 'on' : ''}`}>
          You: {state.playerPassed ? 'passed' : 'active'}
        </span>
        <span className={`eoa-flag ${bot.passed ? 'on' : ''}`}>
          Bot: {bot.passed ? 'passed' : 'active'}
        </span>
        <span className="eoa-count">
          Actions <b>{bot.actionsThisEra}</b> / min {minActions}
        </span>
      </div>

      <p className="eoa-hint">{passMsg ?? describeDecision(decision, minActions)}</p>

      {canEnd && (
        <div className="eoa-buttons">
          <span className="eoa-end">✓ Action Rounds Phase ends</span>
        </div>
      )}

      <div className="eoa-rule">
        <button className="eoa-rule-cta" onClick={() => setShowRule((s) => !s)}>
          📖 Passing &amp; End of Actions rules {showRule ? '▾' : '▸'}
        </button>
        {showRule && (
          <div className="eoa-rule-body">
            {PASSING_RULE.split('\n\n').map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Right-docked pane listing the committed turns newest-first (from the undo stack). */
function HistoryPane({
  entries,
  onClose,
}: {
  entries: UndoEntry[];
  onClose: () => void;
}) {
  const rows = [...entries].reverse(); // newest first
  return (
    <div className="history-pane">
      <div className="history-head">
        <h3>History</h3>
        <button className="history-close" onClick={onClose} aria-label="Close history">
          ×
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="history-empty">No turns taken yet.</p>
      ) : (
        <ol className="history-list">
          {rows.map((e, i) => (
            <li key={entries.length - i} className="history-row">
              <span className="history-num">{entries.length - i}</span>
              <span className="history-main">
                <span className="history-label">{e.label}</span>
                {e.effects.length > 0 && (
                  <ul className="history-effects">
                    {e.effects.map((eff, j) => (
                      <li key={j}>{eff}</li>
                    ))}
                  </ul>
                )}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function CalibrationPanel({
  positions,
  selected,
  onSelect,
  markerWidth,
  onMarkerWidth,
  cmdMarkerWidth,
  onCmdMarkerWidth,
  warpMarkerWidth,
  onWarpMarkerWidth,
}: {
  positions: Record<string, [number, number]>;
  selected: string;
  onSelect: (k: string) => void;
  markerWidth: number;
  onMarkerWidth: (w: number) => void;
  cmdMarkerWidth: number;
  onCmdMarkerWidth: (w: number) => void;
  warpMarkerWidth: number;
  onWarpMarkerWidth: (w: number) => void;
}) {
  const literal =
    'export const BOARD_COUNTERS: BoardCounter[] = [\n' +
    BOARD_COUNTERS.map((c) => {
      const [x, y] = positions[c.key] ?? c.pos;
      return `  { key: '${c.key}', pos: [${x}, ${y}], label: '${c.label}' },`;
    }).join('\n') +
    '\n];';
  const ttLiteral =
    'export const TIME_TRAVEL_TRACK: TimeTravelTrackLayout = {\n  spots: [\n' +
    TT_KEYS.map((key, i) => {
      const [x, y] = positions[key] ?? TIME_TRAVEL_TRACK.spots[i];
      return `    [${x}, ${y}],`;
    }).join('\n') +
    `\n  ],\n  markerWidth: ${markerWidth},\n};`;
  const pathBody = (path: PathId) =>
    PATH_SPOTS[path]
      .map((seed, i) => {
        const [x, y] = positions[pathKey(path, i)] ?? seed;
        const action = Chronobot.CHRONOBOT_PATHS[path][i];
        return `  [${x}, ${y}], // ${path[0].toUpperCase()}${path.slice(1)}-${i + 1} ${action}`;
      })
      .join('\n');
  const pathLiteral =
    `export const SHORT_PATH: PathSpot[] = [\n${pathBody('short')}\n];\n\n` +
    `export const LONG_PATH: PathSpot[] = [\n${pathBody('long')}\n];\n\n` +
    `export const MARKER_WIDTH = ${cmdMarkerWidth};`;
  const [wx, wy] = positions[WARP_KEY] ?? WARP_MARKER.pos;
  const warpLiteral =
    `export const WARP_MARKER: WarpMarkerLayout = {\n  pos: [${wx}, ${wy}],\n  width: ${warpMarkerWidth},\n};`;
  const ttLabel = (i: number) =>
    i === 0 ? 'TT start (0 VP)' : `TT +${i} (${Chronobot.TIME_TRAVEL_VP[i]} VP)`;
  const pathLabel = (path: PathId, i: number) =>
    `${path === 'short' ? 'S' : 'L'}${i + 1} ${Chronobot.CHRONOBOT_PATHS[path][i]}`;
  return (
    <div className="cal-panel">
      <p className="cal-hint">
        <b>Calibrate.</b> Pick a spot, click the board to place it, then arrow-keys
        nudge (0.2% / Shift = 1%). Copy the result to me when done.
      </p>
      <label className="cal-size">
        TT marker width: <b>{markerWidth}%</b>
        <input
          type="range"
          min={1}
          max={12}
          step={0.1}
          value={markerWidth}
          onChange={(e) => onMarkerWidth(+e.target.value)}
        />
      </label>
      <label className="cal-size">
        Command marker width: <b>{cmdMarkerWidth}%</b>
        <input
          type="range"
          min={1}
          max={12}
          step={0.1}
          value={cmdMarkerWidth}
          onChange={(e) => onCmdMarkerWidth(+e.target.value)}
        />
      </label>
      <label className="cal-size">
        Warp marker width: <b>{warpMarkerWidth}%</b>
        <input
          type="range"
          min={1}
          max={14}
          step={0.1}
          value={warpMarkerWidth}
          onChange={(e) => onWarpMarkerWidth(+e.target.value)}
        />
      </label>
      <div className="cal-list">
        {BOARD_COUNTERS.map((c) => (
          <button
            key={c.key}
            className={`cal-item ${selected === c.key ? 'on' : ''}`}
            onClick={() => onSelect(c.key)}
          >
            {c.label}{' '}
            <span className="cal-xy">
              {(positions[c.key] ?? c.pos).join(', ')}
            </span>
          </button>
        ))}
        {TT_KEYS.map((key, i) => (
          <button
            key={key}
            className={`cal-item tt ${selected === key ? 'on' : ''}`}
            onClick={() => onSelect(key)}
          >
            {ttLabel(i)}{' '}
            <span className="cal-xy">
              {(positions[key] ?? TIME_TRAVEL_TRACK.spots[i]).join(', ')}
            </span>
          </button>
        ))}
        {(['short', 'long'] as PathId[]).flatMap((path) =>
          PATH_SPOTS[path].map((seed, i) => {
            const key = pathKey(path, i);
            return (
              <button
                key={key}
                className={`cal-item path ${selected === key ? 'on' : ''}`}
                onClick={() => onSelect(key)}
              >
                {pathLabel(path, i)}{' '}
                <span className="cal-xy">
                  {(positions[key] ?? seed).join(', ')}
                </span>
              </button>
            );
          }),
        )}
        <button
          className={`cal-item warp ${selected === WARP_KEY ? 'on' : ''}`}
          onClick={() => onSelect(WARP_KEY)}
        >
          Warp tile{' '}
          <span className="cal-xy">{(positions[WARP_KEY] ?? WARP_MARKER.pos).join(', ')}</span>
        </button>
      </div>
      <textarea className="cal-out" readOnly value={literal} />
      <textarea className="cal-out" readOnly value={ttLiteral} />
      <textarea className="cal-out" readOnly value={pathLiteral} />
      <textarea className="cal-out" readOnly value={warpLiteral} />
    </div>
  );
}

/**
 * The Chronobot's VP as an expandable pill. Collapsed shows the total; clicking
 * reveals the breakdown: "token" VP (everything except Buildings & Time Travel),
 * "bldg" VP (Construct tiles), and "time travel" VP (the track position).
 */
function VpPill({
  botVp,
  buildingVp,
  timeTravelVp,
  breakthroughVp,
}: {
  botVp: number;
  buildingVp: number;
  timeTravelVp: number;
  breakthroughVp: number;
}) {
  const [open, setOpen] = useState(false);
  const nonBuilding = botVp - buildingVp;
  const total = botVp + timeTravelVp + breakthroughVp;
  return (
    <button
      type="button"
      className={`stat-pill lead vp-pill ${open ? 'open' : ''}`}
      onClick={() => setOpen((o) => !o)}
      title="Click to break VP down: total · token · bldg · time travel · breakthrough"
      aria-expanded={open}
    >
      <span className="vp-caret">{open ? '▾' : '▸'}</span>
      <span className="vp-seg">
        <b>{total}</b> VP
      </span>
      {open && (
        <>
          <span className="vp-seg vp-sub" title="Token VP — everything except Buildings, Time Travel & Breakthroughs">
            <b>{nonBuilding}</b> token
          </span>
          <span className="vp-seg vp-sub" title="Building VP — from Construct actions (Buildings & Superprojects)">
            <b>{buildingVp}</b> bldg
          </span>
          <span className="vp-seg vp-sub" title="Time Travel VP — from the marker's track position">
            <b>{timeTravelVp}</b> time travel
          </span>
          <span className="vp-seg vp-sub" title="Breakthrough VP — 1 each + 2 per complete shape set">
            <b>{breakthroughVp}</b> breakthrough
          </span>
        </>
      )}
    </button>
  );
}

function StatsBar({
  bot,
  debug,
  onToggleDebug,
  outline,
  onToggleOutline,
  onReset,
  calibrate,
  onToggleCalibrate,
  botDie,
  botPassed,
  canTakeAction,
  onTakeBotAction,
  playerPassed,
  canPass,
  onPlayerPass,
  canUndo,
  onUndo,
  historyOpen,
  onToggleHistory,
  statusOpen,
  onToggleStatus,
}: {
  bot: ChronobotState;
  debug: boolean;
  onToggleDebug: () => void;
  outline: boolean;
  onToggleOutline: () => void;
  onReset: () => void;
  calibrate: boolean;
  onToggleCalibrate: () => void;
  botDie: number | null;
  botPassed: boolean;
  canTakeAction: boolean;
  onTakeBotAction: () => void;
  playerPassed: boolean;
  canPass: boolean;
  onPlayerPass: () => void;
  canUndo: boolean;
  onUndo: () => void;
  historyOpen: boolean;
  onToggleHistory: () => void;
  statusOpen: boolean;
  onToggleStatus: () => void;
}) {
  // Warp is now tracked on the board (see the Warp-tile marker), not here.
  const stats: { label: string; value: string | number }[] = [];
  return (
    <div className="stats-bar">
      <div className="stats-left">
        <button
          type="button"
          className={`debug-badge ${debug ? 'on' : 'off'}`}
          onClick={onToggleDebug}
          title={
            debug
              ? 'Debug ON — tap tiles to activate them; calibrate & outlines available'
              : 'Play mode — tap tiles to read rules only. Click to enable Debug.'
          }
          aria-pressed={debug}
        >
          {debug ? '🛠 DEBUG' : '▶ PLAY'}
        </button>
        <div className="stats-row">
          <VpPill
            botVp={bot.vp}
            buildingVp={bot.buildingVp}
            timeTravelVp={Chronobot.timeTravelVp(bot)}
            breakthroughVp={Chronobot.breakthroughVp(bot)}
          />
          {stats.map((s) => (
            <span key={s.label} className="stat-pill">
              <b>{s.value}</b> {s.label}
            </span>
          ))}
        </div>
      </div>
      {!calibrate && (
        <div className="bot-turn">
          <button
            className={`take-bot-action ${botPassed ? 'passed' : ''}`}
            onClick={onTakeBotAction}
            disabled={!canTakeAction}
            title={
              botPassed
                ? 'The Chronobot has passed for this Era'
                : `Roll the AI die (faces ${AI_DIE_FACES.join(',')}) and activate that Command token`
            }
          >
            {botPassed ? '✓ Bot Passed' : '🎲 Take Bot Action'}
          </button>
          {botDie != null && (
            <span className="bot-die" aria-label={`AI die shows ${botDie}`}>
              {botDie}
            </span>
          )}
          <button
            className="you-pass"
            onClick={onPlayerPass}
            disabled={!canPass || playerPassed}
            title="Pass for the Action Rounds phase"
          >
            {playerPassed ? '✓ You passed' : '🛑 You Pass'}
          </button>
          <button
            className={`stat-pill status-chip ${statusOpen ? 'on' : ''}`}
            onClick={onToggleStatus}
            title="End of Actions — pass status & minimum Actions"
            aria-pressed={statusOpen}
          >
            <b>{bot.actionsThisEra}</b> Actions
          </button>
        </div>
      )}
      <div className="stats-controls">
        {debug && (
          <>
            <label className="outline-toggle" title="Show the tappable tile outlines">
              <input type="checkbox" checked={outline} onChange={onToggleOutline} />
              outlines
            </label>
            <label className="outline-toggle" title="Calibrate badge positions">
              <input type="checkbox" checked={calibrate} onChange={onToggleCalibrate} />
              calibrate
            </label>
          </>
        )}
        <button
          className="undo-btn"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo the last step (restores the same die roll)"
        >
          ↶ Undo
        </button>
        <button
          className={`history-btn ${historyOpen ? 'on' : ''}`}
          onClick={onToggleHistory}
          title="Show the turn history"
          aria-pressed={historyOpen}
        >
          🕑 History
        </button>
        <button className="reset-btn" onClick={onReset}>
          ⟳ Reset Game
        </button>
      </div>
    </div>
  );
}

/** Short name of the Main-board Action space this action targets. */
function spaceLabel(action: ChronobotActionId): string {
  if (action.startsWith('construct')) return 'Construct';
  // The Recruit-Genius-Research mech gate is only reached via the Research fallback.
  if (action === 'recruit-genius-research') return 'Research';
  return CHRONOBOT_ACTIONS[action].label;
}

function DetailPanel({
  hotspot,
  readOnly,
  pending,
  result,
  selectedVP,
  selectedResources,
  selectedWorker,
  rolledShape,
  breakthroughs,
  removeAnomaly,
  mineOrder,
  workerOrder,
  onConfirmPlace,
  onCannotPlace,
  onMineHasSpace,
  onMineNoSpace,
  onGeniusYes,
  onGeniusNo,
  onPickVP,
  onToggleResource,
  onPickWorker,
  onStartTurn,
  onClose,
}: {
  hotspot: Hotspot;
  readOnly: boolean;
  pending: PendingStep;
  result: Instruction[];
  selectedVP: number | null;
  selectedResources: Resource[];
  selectedWorker: Worker | null;
  rolledShape: BreakthroughShape | null;
  breakthroughs: Record<BreakthroughShape, number>;
  removeAnomaly: { canRemove: boolean; discards: string; reason: string };
  mineOrder: Resource[];
  workerOrder: Worker[];
  onConfirmPlace: () => void;
  onCannotPlace: () => void;
  onMineHasSpace: () => void;
  onMineNoSpace: () => void;
  onGeniusYes: () => void;
  onGeniusNo: () => void;
  onPickVP: (vp: number) => void;
  onToggleResource: (r: Resource) => void;
  onPickWorker: (w: Worker) => void;
  onStartTurn: () => void;
  onClose: () => void;
}) {
  const def = CHRONOBOT_ACTIONS[hotspot.action];
  const [l, t, w, h] = hotspot.panel ?? DEFAULT_PANEL;
  const [showMech, setShowMech] = useState(false);
  // In play mode the rule opens expanded (mech placement stays collapsed).
  const [showRule, setShowRule] = useState(readOnly);
  const toggleMech = () => setShowMech((s) => !s);
  const toggleRule = () => setShowRule((s) => !s);

  const paragraphs = def.rule.split('\n\n');
  const buildingLabel = def.label.replace('Construct — ', '');
  const isSuperproject = hotspot.action === 'construct-superproject';
  const ruleLabel = hotspot.action.startsWith('construct')
    ? 'Construct rules'
    : `${def.label} rules`;
  const failedInstr = result.find((ins) => /fail/i.test(ins.id));

  return (
    <div
      className="detail-panel"
      style={{ left: `${l}%`, top: `${t}%`, width: `${w}%`, height: `${h}%` }}
      role="dialog"
      aria-label={def.label}
    >
      <div className="dp-head">
        <div className="dp-title">
          <ActionIcon action={hotspot.action} size={92} />
          <h2>{def.label}</h2>
        </div>
        <button className="dp-close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>
      <div className="dp-body">
        {hotspot.note && <p className="dp-note">{hotspot.note}</p>}

        {readOnly && (
          <p className="pp-instruct read-only-note">
            📖 Rule reference (view only). Turn on <b>Debug</b> to activate spaces
            by tapping.
          </p>
        )}

        {/* Step 1 — placement gate for any mech-placing action. */}
        {pending === 'mech' && (
          <div className="place-prompt">
            <p className="pp-instruct">
              Place the Chronobot’s mech on the topmost available{' '}
              <b>{spaceLabel(hotspot.action)}</b> Action space (or a World Council
              space if none are free).
            </p>
            <div className="pp-buttons">
              <button className="pp-confirm" onClick={onConfirmPlace}>
                ✓ Confirm placed
              </button>
              <button className="pp-cannot" onClick={onCannotPlace}>
                ✗ Cannot place
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — Construct: take the higher-VP building, enter its printed VP. */}
        {pending === 'buildingVP' && (
          <div className="place-prompt">
            <p className="pp-instruct">
              {isSuperproject ? (
                <>
                  Take the <b>highest-VP Superproject</b> (oldest if tied). Tap its
                  printed VP (3–7).
                </>
              ) : (
                <>
                  Take the higher-VP <b>{buildingLabel}</b> (secondary stack if
                  tied). Tap its printed VP (1–4) — then discard it.
                </>
              )}
            </p>
            <div className="vp-digits">
              {(isSuperproject ? [3, 4, 5, 6, 7] : [1, 2, 3, 4]).map((n) => (
                <button
                  key={n}
                  className={`vp-digit ${selectedVP === n ? 'selected' : ''}`}
                  onClick={() => onPickVP(n)}
                >
                  {n}
                </button>
              ))}
            </div>
            {selectedVP != null && (
              <button className="start-turn" onClick={onStartTurn}>
                ▶ Start Your Turn
              </button>
            )}
          </div>
        )}

        {/* Step 1 (Mine) — Mine spaces aren't Capital Action spaces: ask first. */}
        {pending === 'mineOpen' && (
          <div className="place-prompt">
            <p className="pp-instruct">
              <b>Is there one or more Mining Action space available?</b>
            </p>
            <div className="pp-buttons">
              <button className="pp-confirm" onClick={onMineHasSpace}>
                ✓ Yes — a Mining space is open
              </button>
              <button className="pp-cannot" onClick={onMineNoSpace}>
                ✗ No open Mining space
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — Mine: place the mech in the matching space & pick Resources. */}
        {pending === 'mineResources' && (
          <div className="place-prompt">
            <p className="pp-instruct">
              Place the Chronobot’s mech in an open <b>Mine</b> space granting
              the best 2 Resources by priority order below, based on
              lacking-first. Give it those <b>2 Resources</b> (pre-selected;
              adjust to match the space — click a cube twice for <b>×2</b>),
              then <b>discard those 2 Resource cubes from the board</b>.
            </p>
            <div className="resource-picks">
              {mineOrder.map((r, i) => (
                <Fragment key={r}>
                  {i > 0 && <span className="pick-sep">&gt;</span>}
                  <ResourceSwatch
                    resource={r}
                    count={selectedResources.filter((x) => x === r).length}
                    onClick={() => onToggleResource(r)}
                  />
                </Fragment>
              ))}
            </div>
            {selectedResources.length === 2 && (
              <button className="start-turn" onClick={onStartTurn}>
                ▶ Start Your Turn
              </button>
            )}
          </div>
        )}

        {/* Step 2 — Recruit: pick which Worker type was recruited. */}
        {pending === 'recruitWorker' && (
          <div className="place-prompt">
            <p className="pp-instruct">
              Recruit the highest-priority <b>Worker</b> the Chronobot lacks by
              the priority order below (missing-first); if that type isn’t
              available, take the next available one. Pick the recruited Worker
              (+1 VP).
            </p>
            <div className="resource-picks worker-picks">
              {workerOrder.map((w, i) => (
                <Fragment key={w}>
                  {i > 0 && <span className="pick-sep">&gt;</span>}
                  <WorkerSwatch
                    worker={w}
                    selected={selectedWorker === w}
                    onClick={() => onPickWorker(w)}
                  />
                </Fragment>
              ))}
            </div>
            {selectedWorker && (
              <button className="start-turn" onClick={onStartTurn}>
                ▶ Start Your Turn
              </button>
            )}
          </div>
        )}

        {/* Recruit Genius / Research — Genius AND an open Recruit space available? */}
        {pending === 'geniusQuestion' && (
          <div className="place-prompt">
            <p className="pp-instruct">
              Is a <b>Genius</b> available to recruit <b>and</b> an open Recruit
              Action space (or World Council space)? If so, the Chronobot
              recruits a Genius. If not, it performs a Research action instead.
            </p>
            <div className="pp-buttons">
              <button className="pp-confirm" onClick={onGeniusYes}>
                ✓ Yes — recruit a Genius
              </button>
              <button className="pp-alt" onClick={onGeniusNo}>
                ✗ No — Research instead
              </button>
            </div>
          </div>
        )}

        {/* Recruit Genius / Research — Genius available → place mech + recruit a Genius. */}
        {pending === 'geniusRecruit' && (
          <div className="place-prompt">
            <p className="pp-instruct">
              Place the Chronobot’s mech on the topmost available <b>Recruit</b>{' '}
              Action space (or a World Council space if full) and recruit a{' '}
              <b>Genius</b>, removing it from the board. The bot gains 1 VP.
            </p>
            <div className="resource-picks worker-picks">
              <WorkerSwatch worker="genius" selected onClick={() => {}} />
            </div>
            <button className="start-turn" onClick={onStartTurn}>
              ▶ Start Your Turn
            </button>
          </div>
        )}

        {/* Research — the app rolled the shape die; take a Breakthrough of that shape. */}
        {pending === 'research' && rolledShape && (
          <div className="place-prompt">
            <p className="pp-instruct">
              The shape die rolled <b>{rolledShape}</b> — the Chronobot keeps a{' '}
              <b>{rolledShape}</b> Breakthrough.
            </p>
            <div className="shape-roll">
              <ShapeIcon shape={rolledShape} size={52} />
              <div className="shape-tally">
                {SHAPE_ORDER.map((s) => (
                  <span key={s} className="shape-count">
                    <ShapeIcon shape={s} size={22} />
                    {breakthroughs[s] + (s === rolledShape ? 1 : 0)}
                  </span>
                ))}
              </div>
            </div>
            <button className="start-turn" onClick={onStartTurn}>
              ▶ Start Your Turn
            </button>
          </div>
        )}

        {/* Reboot — the Chronobot does nothing. */}
        {pending === 'reboot' && (
          <div className="place-prompt">
            <p className="pp-instruct">Reboot: Chronobot does nothing.</p>
            <button className="start-turn" onClick={onStartTurn}>
              ▶ Start Your Turn
            </button>
          </div>
        )}

        {/* Time Travel — the player physically removes a Warp tile & advances the marker. */}
        {pending === 'timeTravel' && (
          <div className="place-prompt">
            <p className="pp-instruct">
              Remove one of the Chronobot’s <b>Warp tiles</b> from the past
              Timeline tile where it has the most (oldest if tied).
            </p>
            <button className="start-turn" onClick={onStartTurn}>
              ▶ Start Your Turn
            </button>
          </div>
        )}

        {/* Remove Anomaly — outcome is fully determined by the bot's state. */}
        {pending === 'removeAnomaly' &&
          (removeAnomaly.canRemove ? (
            <div className="place-prompt">
              <p className="pp-instruct">
                Discard <b>{removeAnomaly.discards}</b> from the Chronobot and
                remove 1 Anomaly. (Remove Anomaly places no mech.)
              </p>
              <button className="start-turn" onClick={onStartTurn}>
                ▶ Start Your Turn
              </button>
            </div>
          ) : (
            <div className="place-prompt failed-note">
              <p className="pp-instruct">
                Failed Action: {removeAnomaly.reason} — the Chronobot takes +1 VP
                instead (no mech placed).
              </p>
              <button className="start-turn" onClick={onStartTurn}>
                ▶ Start Your Turn
              </button>
            </div>
          ))}

        {/* Failed Action notice — the only post-action detail we surface. */}
        {!pending && failedInstr && (
          <div className="place-prompt failed-note">
            <p className="pp-instruct">{failedInstr.text}</p>
          </div>
        )}

        {/* Once the bot's action has resolved, hand control back to the player. */}
        {!pending && result.length > 0 && (
          <button className="start-turn" onClick={onStartTurn}>
            ▶ Start Your Turn
          </button>
        )}

        {/* Verbatim action rule — a collapsed explanation, available in every
            step: under the mech-placement box first, then by itself. */}
        <RuleExplainer
          label={ruleLabel}
          paragraphs={paragraphs}
          open={showRule}
          onToggle={toggleRule}
          onMechClick={toggleMech}
        />

        {/* Mech-placement rules — always below the orange boxes, on demand. */}
        {def.placesExosuit && (
          <MechRules open={showMech} onToggle={toggleMech} />
        )}
      </div>
    </div>
  );
}

/** Collapsible verbatim rules for how the Chronobot places its mech. */
function MechRules({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <div className="mech-rules">
      <button className="mech-cta" onClick={onToggle}>
        📖 Placing the Chronobot’s mech (Exosuit) {open ? '▾' : '▸'}
      </button>
      {open && (
        <ul>
          {MECH_PLACEMENT.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Display metadata per Resource: label + cropped cube art (transparent PNG). */
const RESOURCE_META: Record<Resource, { label: string; img?: string }> = {
  neutronium: { label: 'Neutronium', img: '/assets/solo/resources/neutronium.png' },
  uranium: { label: 'Uranium', img: '/assets/solo/resources/uranium.png' },
  gold: { label: 'Gold', img: '/assets/solo/resources/gold.png' },
  titanium: { label: 'Titanium', img: '/assets/solo/resources/titanium.png' },
  water: { label: 'Water' },
};

/** A selectable Resource cube. `count` is how many are picked (0, 1 or 2). */
function ResourceSwatch({
  resource,
  count,
  onClick,
}: {
  resource: Resource;
  count: number;
  onClick: () => void;
}) {
  const meta = RESOURCE_META[resource];
  return (
    <button
      type="button"
      className={`resource-swatch ${count > 0 ? 'selected' : ''}`}
      onClick={onClick}
      aria-pressed={count > 0}
    >
      <span className="resource-cube-wrap">
        <img className="resource-cube" src={meta.img} alt="" />
        {count === 2 && <span className="cube-x2">×2</span>}
      </span>
      <span className="resource-name">{meta.label}</span>
    </button>
  );
}

/** Display metadata per Worker: label + cropped figure art (transparent PNG). */
const WORKER_META: Record<Worker, { label: string; img: string }> = {
  genius: { label: 'Genius', img: '/assets/solo/workers/genius.png' },
  administrator: { label: 'Administrator', img: '/assets/solo/workers/administrator.png' },
  engineer: { label: 'Engineer', img: '/assets/solo/workers/engineer.png' },
  scientist: { label: 'Scientist', img: '/assets/solo/workers/scientist.png' },
};

/** A selectable Worker figure (single-select). */
function WorkerSwatch({
  worker,
  selected,
  onClick,
}: {
  worker: Worker;
  selected: boolean;
  onClick: () => void;
}) {
  const meta = WORKER_META[worker];
  return (
    <button
      type="button"
      className={`resource-swatch worker-swatch ${selected ? 'selected' : ''}`}
      onClick={onClick}
      aria-pressed={selected}
    >
      <img className="worker-fig" src={meta.img} alt="" />
      <span className="resource-name">{meta.label}</span>
    </button>
  );
}

/** Collapsible verbatim rule text for the action (defaults collapsed). */
function RuleExplainer({
  label,
  paragraphs,
  open,
  onToggle,
  onMechClick,
}: {
  label: string;
  paragraphs: string[];
  open: boolean;
  onToggle: () => void;
  onMechClick: () => void;
}) {
  return (
    <div className="mech-rules">
      <button className="mech-cta" onClick={onToggle}>
        📖 {label} {open ? '▾' : '▸'}
      </button>
      {open && (
        <div className="rule-body">
          {paragraphs.map((para, i) => (
            <p key={i} className="dp-rule">
              {renderRule(para, onMechClick)}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Render a verbatim rule paragraph, turning the literal phrase
 * "places an/the Exosuit" into a clickable "how to place a mech" link.
 */
function renderRule(text: string, onMechClick: () => void) {
  const re = /places (?:an|the) Exosuit/g;
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(<Fragment key={key++}>{text.slice(last, m.index)}</Fragment>);
    nodes.push(
      <button key={key++} className="mech-link" onClick={onMechClick}>
        {m[0]}
      </button>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(<Fragment key={key++}>{text.slice(last)}</Fragment>);
  return nodes;
}
