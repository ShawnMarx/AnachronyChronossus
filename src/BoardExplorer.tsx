import { Fragment, useEffect, useRef, useState } from 'react';
import './BoardExplorer.css';
import { useAuth } from './auth/useAuth';
import {
  AI_DIE_FACES,
  CHRONOBOT_ACTIONS,
  Chronobot,
  DEFAULT_CONFIG,
  MECH_PLACEMENT,
  PASSING_RULE,
  PHASE_NUMBER,
  PLAYER_SCORING_RULE,
  rollAiDie,
  rollParadoxDie,
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
import {
  PARADOX_SLOTS,
  TIME_TRAVEL_TRACK,
  WARP_MARKER,
} from './board/timeTravelTrack';
import {
  COMMAND_MARKER_IMG,
  MARKER_WIDTH,
  PATH_SPOTS,
} from './board/chronobotPaths';
import './phases/phases.css';
import PhaseScreen from './phases/PhaseScreen';
import SetupFlow from './phases/SetupFlow';
import RulesBox from './phases/RulesBox';
import { ENDGAME_RULES, PHASE_META, type PhaseMeta } from './phases/phaseMeta';
import { advanceFromPreparation, finishEra, startFirstEra } from './game/flow';
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
/** Calibration keys for the 3 Paradox slots. */
const PARADOX_KEYS = PARADOX_SLOTS.slots.map((_, i) => `paradox${i}`);
/** Calibration key for one action-tile hotspot, anchored at its box top-left. */
const hotspotKey = (id: string) => `hs_${id}`;
const HOTSPOT_KEYS = CHRONOBOT_HOTSPOTS.map((h) => hotspotKey(h.id));
/** Every calibratable point: count badges, 7 TT spots, path steps, warp, paradox, hotspots. */
const CAL_KEYS: string[] = [
  ...HOTSPOT_KEYS,
  ...BOARD_COUNTERS.map((c) => c.key),
  ...TT_KEYS,
  ...PATH_KEYS,
  WARP_KEY,
  ...PARADOX_KEYS,
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

/** Short labels for the difficulty flags (kept in sync with SetupFlow). */
const DIFFICULTY_LABEL: Record<string, string> = {
  [Chronobot.DIFFICULTY_REBOOT_ADVANCE]: 'Advance off Reboot immediately',
  [Chronobot.DIFFICULTY_NO_LEADER]: 'Play without your Leader power',
  [Chronobot.DIFFICULTY_BOT_EXTRA_TURN]: 'One extra Chronobot turn after you pass',
  [Chronobot.DIFFICULTY_MIN_ACTIONS_6]: 'Minimum Actions raised to 6',
  [Chronobot.DIFFICULTY_HEX_UNAVAILABLE]: 'Right World Council space covered (Hex Unavailable)',
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

  if (post.exosuitsAvailable < pre.exosuitsAvailable) out.push('🤖 Exosuit placed');
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

/**
 * Summarize a Paradox-phase die roll from the pre→post Chronobot state: the
 * tracker movement, and — when the roll hit 3 — the Anomaly gained (−3 VP) and
 * the Warp tile pulled off the Timeline.
 */
function summarizeParadox(pre: ChronobotState, post: ChronobotState): string[] {
  const out: string[] = [];
  if (post.paradoxes !== pre.paradoxes) {
    out.push(`Paradox tracker → ${post.paradoxes}/3`);
  }
  if (post.anomalies > pre.anomalies) out.push('Gained 1 Anomaly (−3 VP)');
  if (post.warpTilesOnTimeline < pre.warpTilesOnTimeline) {
    out.push('Warp tile removed from the Timeline');
  }
  return out;
}

/** Summarize the Warp phase: how many Warp tiles the Chronobot placed. */
function summarizeWarp(pre: ChronobotState, post: ChronobotState): string[] {
  const d = post.warpTilesOnTimeline - pre.warpTilesOnTimeline;
  return d > 0 ? [`Placed ${d} Warp tile${d === 1 ? '' : 's'} on the Timeline`] : [];
}

/** Cap the undo/history depth so persisted state stays bounded. */
const UNDO_CAP = 50;

// --- Persistence (localStorage) ---------------------------------------------
// Survives refresh and browser restart. Only the committed game shape is saved
// (engine state, tokens, undo/history, debug flag) — transient UI (open dialog,
// shown die, calibrate positions) is not persisted. A version guards the schema.
const PERSIST_KEY = 'anachrony:chronobot';
// v6: full phase flow now lives in GameState (phase/era/firstPlayer/impact/
// config.difficulty + the paradox tracker on chronobot), so the UI-only
// `paradoxes` field is gone. Bumping invalidates pre-flow saves.
const PERSIST_VERSION = 6;

interface PersistedGame {
  version: number;
  state: GameState;
  tokens: CommandTokensState;
  undoStack: UndoEntry[];
  debug: boolean;
  /** Epoch ms of the last committed save — drives the "last played" prompt. */
  savedAt: number;
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

function savePersisted(p: Omit<PersistedGame, 'version' | 'savedAt'>): void {
  try {
    localStorage.setItem(
      PERSIST_KEY,
      JSON.stringify({ version: PERSIST_VERSION, savedAt: Date.now(), ...p }),
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

/** Landing-page helper: the saved Chronobot game's timestamp, or null if none. */
export function peekSavedChronobot(): { savedAt: number } | null {
  const p = loadPersisted();
  return p ? { savedAt: p.savedAt } : null;
}

/** Landing-page helper: discard any saved Chronobot game (for "New game"). */
export function clearSavedChronobot(): void {
  clearPersisted();
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
/** A fresh game at the Setup phase (Start → Difficulty → Setup → Era 1). */
function initNewGame(): GameState {
  return Chronobot.setup({ ...DEFAULT_CONFIG, bot: 'chronobot' });
}

export default function BoardExplorer({
  onHome,
  readOnly = false,
}: { onHome?: () => void; readOnly?: boolean } = {}) {
  // Rehydrate a saved game once on mount (null → fresh game).
  const [persisted] = useState(loadPersisted);
  const [state, setState] = useState<GameState>(
    () => persisted?.state ?? initNewGame(),
  );
  const [active, setActive] = useState<Hotspot | null>(null);
  const [pending, setPending] = useState<PendingStep>(null);
  const [result, setResult] = useState<Instruction[]>([]);
  const [selectedVP, setSelectedVP] = useState<number | null>(null);
  const [selectedResources, setSelectedResources] = useState<Resource[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [rolledShape, setRolledShape] = useState<BreakthroughShape | null>(null);
  // Which board track box has its tap-to-reveal info popover open (its counter
  // `key`, e.g. 'neutronium' / 'breakthrough'), or null. Mirrors the native
  // `title` tooltip so the info is reachable on touch. Dismissed by any tap
  // outside a badge (or Escape) via the effect below.
  const [tappedBadge, setTappedBadge] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  // True only for a play-mode free-tap (the read-only rule view), never for a
  // die-driven bot turn (which resolves even in play mode).
  const [ruleView, setRuleView] = useState(false);
  // The End-of-Actions details show as a dismissible popover (opened from a top
  // status chip), closing whenever a top action fires.
  const [showStatus, setShowStatus] = useState(false);
  // End of Action Rounds: the "did you take the First Player spot?" prompt that
  // sets the next Era's first player and advances to Clean Up (Phase 6).
  const [showFirstPlayer, setShowFirstPlayer] = useState(false);
  // Which Era's Action-Rounds intro splash has been dismissed (shows once/Era).
  const [actionsIntroEra, setActionsIntroEra] = useState<number | null>(null);
  const [outline, setOutline] = useState(false);
  const [passMsg, setPassMsg] = useState<string | null>(null);
  // Debug OFF = play mode: tapping a tile only shows its rules (no activation),
  // and the calibrate/outline dev controls are hidden. Defaults OFF.
  const [debug, setDebug] = useState(() => persisted?.debug ?? false);
  // Paradoxes are tracked on the engine state (chronobot.paradoxes, 0–2; the
  // Paradox phase drives it, resetting to 0 on gaining an Anomaly). The debug
  // P +/- control below nudges the same value for testing.
  const paradoxes = state.chronobot.paradoxes;
  const setParadoxes = (updater: number | ((n: number) => number)) =>
    setState((s) => {
      const nextVal =
        typeof updater === 'function' ? updater(s.chronobot.paradoxes) : updater;
      return {
        ...s,
        chronobot: {
          ...s.chronobot,
          paradoxes: Math.max(0, Math.min(3, nextVal)),
        },
      };
    });

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
      ...Object.fromEntries(PARADOX_KEYS.map((k, i) => [k, PARADOX_SLOTS.slots[i]])),
      // Stored as the box CENTER (rect is top-left + size), so hotspots share the
      // center-anchor convention of every other overlay.
      ...Object.fromEntries(
        CHRONOBOT_HOTSPOTS.map((h) => [
          hotspotKey(h.id),
          [h.rect[0] + h.rect[2] / 2, h.rect[1] + h.rect[3] / 2],
        ]),
      ),
    }),
  );
  const [markerWidth, setMarkerWidth] = useState<number>(TIME_TRAVEL_TRACK.markerWidth);
  const [cmdMarkerWidth, setCmdMarkerWidth] = useState<number>(MARKER_WIDTH);
  const [warpMarkerWidth, setWarpMarkerWidth] = useState<number>(WARP_MARKER.width);
  const [paradoxWidth, setParadoxWidth] = useState<number>(PARADOX_SLOTS.width);
  const [hotspotWidth, setHotspotWidth] = useState<number>(CHRONOBOT_HOTSPOTS[0].rect[2]);
  const [hotspotHeight, setHotspotHeight] = useState<number>(CHRONOBOT_HOTSPOTS[0].rect[3]);
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

  // Dismiss the tapped track-box info popover on Escape or any tap that isn't on
  // a badge (tapping another badge is handled by that badge's own onClick, which
  // fires after this outside check passes it through).
  useEffect(() => {
    if (tappedBadge == null) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest('.count-badge')) setTappedBadge(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTappedBadge(null);
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [tappedBadge]);

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
    setState(initNewGame());
    setTokens(Chronobot.initialCommandTokens());
    setUndoStack([]);
    setTappedBadge(null);
    setShowHistory(false);
    setPassMsg(null);
    closePanel();
  };

  // Debug Era modifier: set the Era (1–MAX) and match powered Exosuits to it
  // (Eras 5–7 → 4, else 6) so the late-game rule is testable in the harness.
  const changeEra = (delta: number) => {
    setState((s) => {
      const era = Math.max(1, Math.min(Chronobot.MAX_ERA, s.era + delta));
      return {
        ...s,
        era,
        chronobot: {
          ...s.chronobot,
          exosuitsAvailable: Chronobot.chronobotPoweredExosuits(era),
        },
      };
    });
  };

  // Clean Up (Phase 6) → start the next Era at Preparation (Phase 1).
  const startNextEraNow = () => setState((s) => Chronobot.startNextEra(s));
  // Clean Up → End Game: the game ended (Era 7, or the Capital collapsed in Era
  // 5–6 when flipping Collapsing Capital tiles). Show the final score.
  const endGameNow = () =>
    setState((s) => ({ ...s, phase: 'endgame', finished: true }));

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

  // Which phase view to render. Non-Action phases show the PhaseScreen shell; the
  // board is read-only whenever it's not the Action Rounds phase (or forced R/O).
  const isActionsPhase = state.phase === 'actions';
  const boardReadOnly = readOnly || (!isActionsPhase && !calibrate);
  const meta = PHASE_META[state.phase];
  // The Action Rounds phase can end once both players have passed and the bot has
  // met its minimum Actions — then we ask about First Player and move to Clean Up.
  const canEndActions = isActionsPhase && Chronobot.actionRoundsCanEnd(state);

  // Answer the First-Player question and advance to Clean Up (Phase 6). Whoever
  // took the First Player spot leads the next Era's Warp + Action Rounds.
  const proceedToCleanup = (playerFirst: boolean) => {
    setShowFirstPlayer(false);
    setShowStatus(false);
    setState((s) =>
      Chronobot.resolveCleanUp({ ...s, firstPlayer: playerFirst ? 'player' : 'bot' }),
    );
  };

  // Seed the chosen difficulty and enter Era 1, Phase 1 (Preparation).
  const beginWithDifficulty = (difficulty: string[]) =>
    setState((s) => startFirstEra({ ...s, config: { ...s.config, difficulty } }));

  // Paradox phase: apply one Paradox-die roll to the tracker and return the
  // outcome (so the body knows whether the bot must keep rolling).
  const rollBotParadox = (rolled: number) => {
    const res = Chronobot.rollParadox(state, rolled);
    commit(
      res.state,
      tokens,
      `Era ${state.era} · Paradox roll (+${Math.max(0, rolled)})`,
      summarizeParadox(state.chronobot, res.state.chronobot),
    );
    return res;
  };

  // Warp phase: place the Chronobot's rolled Warp tiles (via commit, so the
  // placement lands in History like an Action turn).
  const commitWarp = (paradoxes: number) => {
    const next = Chronobot.resolveWarp(state, paradoxes);
    commit(
      next,
      tokens,
      `Era ${state.era} · Warp: placed ${Math.max(0, paradoxes)}`,
      summarizeWarp(state.chronobot, next.chronobot),
    );
  };

  // Advance out of the current non-Action phase (calls the matching resolver).
  const advancePhase = () =>
    setState((s) => {
      switch (s.phase) {
        case 'preparation':
          return advanceFromPreparation(s);
        case 'paradox':
          return Chronobot.endParadoxPhase(s);
        case 'powerup':
          return Chronobot.resolvePowerUp(s);
        case 'warp':
          return Chronobot.resolveWarp(s, 0);
        case 'cleanup':
          return finishEra(s);
        default:
          return s;
      }
    });

  const topBar = (
      <StatsBar
        onHome={onHome}
        bot={state.chronobot}
        debug={debug}
        onToggleDebug={toggleDebug}
        outline={outline}
        onToggleOutline={() => setOutline((o) => !o)}
        onReset={reset}
        calibrate={calibrate}
        onToggleCalibrate={() => {
          setTappedBadge(null);
          setCalibrate((c) => !c);
        }}
        botDie={botDie}
        botPassed={bot.passed}
        canTakeAction={!boardReadOnly && !calibrate && active == null && !bot.passed}
        onTakeBotAction={takeBotAction}
        playerPassed={state.playerPassed}
        canPass={!boardReadOnly && !calibrate && active == null}
        onPlayerPass={playerPass}
        canUndo={undoStack.length > 0}
        onUndo={undo}
        historyOpen={showHistory}
        onToggleHistory={() => setShowHistory((v) => !v)}
        statusOpen={showStatus}
        onToggleStatus={() => setShowStatus((v) => !v)}
        paradoxes={paradoxes}
        onParadox={(d) => setParadoxes((n) => Math.max(0, Math.min(3, n + d)))}
        era={state.era}
        onEra={changeEra}
      />
  );

  const boardStage = (
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
            const w = hotspotWidth;
            const hgt = hotspotHeight;
            // Center point (transform: translate(-50%,-50%) places the box around it).
            const [l, t] = positions[hotspotKey(h.id)] ?? [
              h.rect[0] + h.rect[2] / 2,
              h.rect[1] + h.rect[3] / 2,
            ];
            const def = CHRONOBOT_ACTIONS[h.action];
            const isActive = active?.id === h.id;
            const sel = calibrate && selected === hotspotKey(h.id);
            return (
              <button
                key={h.id}
                className={`hotspot ${outline || calibrate ? 'outlined' : ''} ${isActive ? 'active' : ''} ${sel ? 'cal-selected' : ''}`}
                style={{ left: `${l}%`, top: `${t}%`, width: `${w}%`, height: `${hgt}%` }}
                disabled={boardReadOnly}
                onClick={() => {
                  if (boardReadOnly) return;
                  // Free-tap (debug): not a die-driven turn, so it advances no token.
                  botDieRef.current = null;
                  activeTokenRef.current = null;
                  setBotDie(null);
                  setActiveToken(null);
                  onTileClick(h);
                }}
                aria-label={def.label}
                title={def.label}
              >
                <img
                  className="hotspot-tile"
                  src={`/assets/solo/actions/${h.action}.png`}
                  alt=""
                />
              </button>
            );
          })}

          {BOARD_COUNTERS.map((c) => {
            const count = counterValue(bot, c.key);
            const [x, y] = positions[c.key] ?? c.pos;
            const sel = calibrate && selected === c.key;
            // Every track box is tap-to-reveal outside calibrate mode; the
            // breakthrough box shows a per-shape breakdown, the rest their
            // tooltip text ("what they are" + any details).
            const tappable = !calibrate;
            const open = tappable && tappedBadge === c.key;
            return (
              <div
                key={c.key}
                className={`count-badge ${sel ? 'cal-selected' : ''} ${tappable ? 'clickable' : ''}`}
                style={{ left: `${x}%`, top: `${y}%` }}
                title={calibrate ? c.label : counterTooltip(bot, c)}
                onClick={
                  tappable
                    ? () => setTappedBadge((k) => (k === c.key ? null : c.key))
                    : undefined
                }
              >
                {calibrate ? (sel ? '◎' : '·') : count}
                {open && c.key === 'breakthrough' && (
                  <div className="bt-popover" onClick={(e) => e.stopPropagation()}>
                    {SHAPE_ORDER.map((s) => (
                      <span key={s} className="bt-pop-row">
                        <ShapeIcon shape={s} size={22} />
                        <b>{bot.breakthroughs[s]}</b>
                      </span>
                    ))}
                  </div>
                )}
                {open && c.key !== 'breakthrough' && (
                  <div className="badge-popover" onClick={(e) => e.stopPropagation()}>
                    {counterTooltip(bot, c)}
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

          {/* Paradox slots. Only the ones actually placed are shown (none at 0);
              in calibrate mode all 3 show as ghosts so they can be positioned. */}
          {PARADOX_KEYS.map((key, i) => {
            const filled = i < paradoxes;
            if (!calibrate && !filled) return null;
            const [px, py] = positions[key] ?? PARADOX_SLOTS.slots[i];
            const sel = calibrate && selected === key;
            const rot = i === 1 ? -90 : 90; // middle left, outer right
            return (
              <img
                key={key}
                src="/assets/solo/paradox.png"
                alt={`Paradox slot ${i + 1}`}
                title={`Paradox ${paradoxes}`}
                className={`paradox-slot ${sel ? 'cal-selected' : ''} ${
                  calibrate && !filled ? 'cal-ghost' : ''
                }`}
                style={{
                  left: `${px}%`,
                  top: `${py}%`,
                  width: `${paradoxWidth}%`,
                  transform: `translate(-50%, -50%) rotate(${rot}deg)`,
                }}
              />
            );
          })}

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
  );

  const modals = (
    <>
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
          paradoxWidth={paradoxWidth}
          onParadoxWidth={setParadoxWidth}
          hotspotWidth={hotspotWidth}
          onHotspotWidth={setHotspotWidth}
          hotspotHeight={hotspotHeight}
          onHotspotHeight={setHotspotHeight}
        />
      )}
    </>
  );

  // Pre-game: Start → Difficulty → Setup.
  if (state.phase === 'setup') {
    return (
      <div className="explorer">
        <SetupFlow onHome={onHome} onBegin={beginWithDifficulty} />
        {modals}
      </div>
    );
  }

  // End Game: the final score screen (reached after the last Era's Clean Up).
  if (state.phase === 'endgame') {
    return (
      <div className="explorer">
        <ScoreScreen
          state={state}
          onClose={() => onHome?.()}
          onNewGame={reset}
        />
      </div>
    );
  }

  // Non-Action phases (1–4, 6): the splash-banner shell with the board on a tab.
  if (meta && !isActionsPhase && !calibrate) {
    return (
      <div className="explorer">
        <PhaseScreen
          era={state.era}
          phaseNumber={meta.number}
          phaseName={meta.name}
          overview={meta.overview}
          onHome={onHome}
          headerRight={
            <VpPill
              botVp={bot.vp}
              buildingVp={bot.buildingVp}
              timeTravelVp={Chronobot.timeTravelVp(bot)}
              breakthroughVp={Chronobot.breakthroughVp(bot)}
            />
          }
          statusView={boardStage}
        >
          {state.phase === 'warp' ? (
            <WarpPhaseBody state={state} meta={meta} onCommit={commitWarp} />
          ) : state.phase === 'paradox' ? (
            <ParadoxPhaseBody
              state={state}
              meta={meta}
              onRoll={rollBotParadox}
              onAdvance={advancePhase}
            />
          ) : state.phase === 'cleanup' ? (
            <CleanUpPhaseBody
              state={state}
              meta={meta}
              onNextEra={startNextEraNow}
              onEndGame={endGameNow}
            />
          ) : (
            <PhaseBody state={state} meta={meta} onAdvance={advancePhase} />
          )}
        </PhaseScreen>
        {modals}
      </div>
    );
  }

  // Action Rounds (Phase 5) — the full board — plus the calibrate/debug harness.
  return (
    <div className="explorer">
      {topBar}
      {boardStage}
      {isActionsPhase &&
        !calibrate &&
        bot.actionsThisEra === 0 &&
        !bot.passed &&
        !state.playerPassed &&
        actionsIntroEra !== state.era && (
          <ActionsIntro
            firstPlayer={state.firstPlayer}
            era={state.era}
            onDismiss={() => setActionsIntroEra(state.era)}
            onTakeBotAction={() => {
              setActionsIntroEra(state.era);
              takeBotAction();
            }}
          />
        )}
      {canEndActions && !showFirstPlayer && (
        <div className="end-phase-banner">
          <span>✓ Everyone has passed — the Action Rounds Phase is complete.</span>
          <button className="phase-primary" onClick={() => setShowFirstPlayer(true)}>
            Continue to Clean Up ▶
          </button>
        </div>
      )}
      {showFirstPlayer && (
        <FirstPlayerPrompt
          onAnswer={proceedToCleanup}
          onCancel={() => setShowFirstPlayer(false)}
        />
      )}
      {modals}
    </div>
  );
}

/**
 * Asked at the end of the Action Rounds phase: who took the First Player spot?
 * The answer sets who leads the next Era's Warp + Action Rounds, then advances to
 * Clean Up (Phase 6).
 */
/**
 * The "Ready to begin?" splash at the start of each Era's Action Rounds. If you
 * are First Player you take your turn first, then run the bot; otherwise the
 * Chronobot begins.
 */
function ActionsIntro({
  firstPlayer,
  era,
  onDismiss,
  onTakeBotAction,
}: {
  firstPlayer: 'bot' | 'player';
  era: number;
  onDismiss: () => void;
  onTakeBotAction: () => void;
}) {
  const botFirst = firstPlayer === 'bot';
  return (
    <div className="modal-overlay" onClick={onDismiss}>
      <div className="fp-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>Ready to begin — Era {era}</h3>
        <p>
          {botFirst
            ? 'The Chronobot is First Player this Era — it takes the first turn. Press “Take Bot Action” to roll the AI die and resolve it.'
            : 'You are First Player this Era. Take your turn on the Main board first, then press “Take Bot Action” for the Chronobot’s turn.'}
        </p>
        <div className="fp-actions">
          {botFirst ? (
            <button className="phase-primary" onClick={onTakeBotAction}>
              Take Bot Action
            </button>
          ) : (
            <button className="phase-primary" onClick={onDismiss}>
              Your turn first — got it
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function FirstPlayerPrompt({
  onAnswer,
  onCancel,
}: {
  onAnswer: (playerFirst: boolean) => void;
  onCancel: () => void;
}) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="fp-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>First Player next Era</h3>
        <p>
          Did you take the First Player spot this Era? Whoever is First Player leads
          the next Era's Warp and Action Rounds.
        </p>
        <div className="fp-actions">
          <button className="phase-primary" onClick={() => onAnswer(true)}>
            Yes, I took it
          </button>
          <button className="phase-secondary" onClick={() => onAnswer(false)}>
            No — the Chronobot did
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * The body shown inside a non-Action PhaseScreen: a short per-phase note, the
 * verbatim rulebook box, and a Continue button that advances the phase. Fuller
 * per-phase controls (Paradox rolling, Warp placement, etc.) arrive with their
 * own features; this is the shared skeleton.
 */
function PhaseBody({
  state,
  meta,
  onAdvance,
}: {
  state: GameState;
  meta: PhaseMeta;
  onAdvance: () => void;
}) {
  const phase = state.phase;
  const powered = Chronobot.chronobotPoweredExosuits(state.era);
  return (
    <>
      {phase === 'preparation' && (
        <p className="phase-note">
          No changes for the Chronobot this phase — set up the Era as normal, then
          continue.
        </p>
      )}
      {phase === 'powerup' && (
        <p className="phase-note">
          Power up <b>{powered}</b> of the Chronobot's Exosuits (Eras 1–4 → 6,
          Eras 5–7 → 4). Collect those Exosuits to place when the app prompts you;
          it neither gains nor spends Energy Cores or Water.
        </p>
      )}
      {meta.rules && (
        <RulesBox label={`${meta.name} — rulebook text`}>
          <p>{meta.rules}</p>
        </RulesBox>
      )}
      <button className="phase-primary" onClick={onAdvance}>
        Continue ▶
      </button>
    </>
  );
}

/**
 * Phase 6 (Clean Up) body. Retrieve Exosuits; in post-Impact Eras (5–6) flip the
 * Collapsing Capital tiles — the step that decides whether the game ends. Era 7
 * always ends. Otherwise start the next Era.
 */
function CleanUpPhaseBody({
  state,
  meta,
  onNextEra,
  onEndGame,
}: {
  state: GameState;
  meta: PhaseMeta;
  onNextEra: () => void;
  onEndGame: () => void;
}) {
  const era = state.era;
  const postImpact = era === 5 || era === 6;
  const finalEra = era >= Chronobot.MAX_ERA;
  return (
    <>
      <p className="phase-note">
        Retrieve the Chronobot's Exosuits along with your own.
      </p>
      {era === 4 && (
        <p className="phase-note">
          <b>The Impact occurs now</b> — resolve it using the usual procedure at the
          end of Era 4. From Era 5 on, the Chronobot powers up 4 Exosuits instead of 6.
        </p>
      )}
      {postImpact && (
        <p className="phase-note">
          Flip using the usual procedure the Collapsing Capital tiles, then check
          for game end.
        </p>
      )}
      {meta.rules && (
        <RulesBox label={`${meta.name} — rulebook text`}>
          <p>{meta.rules}</p>
        </RulesBox>
      )}
      {finalEra ? (
        <button className="phase-primary" onClick={onEndGame}>
          🏁 Finish &amp; Score ▶
        </button>
      ) : postImpact ? (
        <div className="setup-actions">
          <button className="phase-primary" onClick={onNextEra}>
            Game continues — start Era {era + 1} ▶
          </button>
          <button className="phase-secondary" onClick={onEndGame}>
            The game ended — Finish &amp; Score
          </button>
        </div>
      ) : (
        <button className="phase-primary" onClick={onNextEra}>
          End the Era — start Era {era + 1} ▶
        </button>
      )}
    </>
  );
}

/**
 * Phase 4 (Warp) body: Warping happens in player order. You place your own 0–2
 * Warp tiles; the app rolls the Paradox die for the Chronobot and places that
 * many Warp tiles for it (0, 1, or 2 — it gains nothing and any tile will do).
 * The roll is always shown, even when it's zero, before you can continue.
 */
function WarpPhaseBody({
  state,
  meta,
  onCommit,
}: {
  state: GameState;
  meta: PhaseMeta;
  onCommit: (paradoxes: number) => void;
}) {
  const [rolled, setRolled] = useState<number | null>(null);
  const botFirst = state.firstPlayer === 'bot';
  return (
    <>
      <p className="phase-note">
        Warping occurs in player order.{' '}
        {botFirst
          ? 'The Chronobot is First Player this Era, so it Warps first — roll for it below, then place your own 0–2 Warp tiles as normal.'
          : 'You are First Player this Era, so place your own 0–2 Warp tiles first, then roll for the Chronobot.'}
      </p>

      {meta.rules && (
        <RulesBox label={`${meta.name} — rulebook text`}>
          <p>{meta.rules}</p>
        </RulesBox>
      )}

      {rolled == null ? (
        <button className="phase-primary" onClick={() => setRolled(rollParadoxDie())}>
          Roll for the Chronobot's Warp
        </button>
      ) : (
        <>
          <div className="warp-roll-result">
            <span className="warp-roll-num">{rolled}</span>
            <p className="phase-note">
              {rolled === 0
                ? 'The Chronobot rolled no Paradoxes — it places no Warp tiles this phase.'
                : `The Chronobot rolled ${rolled} Paradox${rolled > 1 ? 'es' : ''} — place ${rolled} Warp tile${rolled > 1 ? 's' : ''} for it on the current Timeline tile. Any tiles will do; the Chronobot gains nothing from them.`}
            </p>
          </div>
          <button className="phase-primary" onClick={() => onCommit(rolled)}>
            Continue ▶
          </button>
        </>
      )}
    </>
  );
}

/**
 * Phase 2 (Paradox) body. The Chronobot checks each past Timeline tile (up to
 * Era − 1 of them): on any where it has the most (or tied-most) Warp tiles it
 * rolls the Paradox die — answering "yes" rolls immediately, no separate button.
 * It stops early if it gains an Anomaly or has no Warp tiles left on the Timeline.
 */
function ParadoxPhaseBody({
  state,
  meta,
  onRoll,
  onAdvance,
}: {
  state: GameState;
  meta: PhaseMeta;
  onRoll: (rolled: number) => ReturnType<typeof Chronobot.rollParadox>;
  onAdvance: () => void;
}) {
  const [asked, setAsked] = useState(0);
  const [stopped, setStopped] = useState(false);
  const [rolls, setRolls] = useState<string[]>([]);
  const bot = state.chronobot;

  const maxChecks = Math.max(0, state.era - 1);
  const noWarp = bot.warpTilesOnTimeline === 0;
  const done = stopped || noWarp || asked >= maxChecks;

  const answerYes = () => {
    const res = onRoll(rollParadoxDie());
    setRolls((r) => [...r, res.instructions[0]?.text ?? '']);
    setAsked((a) => a + 1);
    if (res.stop) setStopped(true);
  };
  const answerNo = () => setAsked((a) => a + 1);

  return (
    <>
      <p className="phase-note">
        The Chronobot rolls for Paradoxes on each past Timeline tile where it has the
        most (or tied-most) Warp tiles. It has <b>{bot.warpTilesOnTimeline}</b> Warp
        tile{bot.warpTilesOnTimeline === 1 ? '' : 's'} on the Timeline and keeps checking
        until it gains an Anomaly.
      </p>
      <div className="paradox-status">
        <span>
          Paradox tracker <b>{bot.paradoxes}</b>/3
        </span>
        <span>
          Anomalies <b>{bot.anomalies}</b>/3
        </span>
      </div>

      {meta.rules && (
        <RulesBox label={`${meta.name} — rulebook text`}>
          <p>{meta.rules}</p>
        </RulesBox>
      )}

      {rolls.length > 0 && (
        <div className="paradox-log">
          {rolls.map((t, i) => (
            <p key={i} className="phase-note">
              {t}
            </p>
          ))}
        </div>
      )}

      {done ? (
        <>
          {noWarp && asked === 0 && (
            <p className="phase-note">
              The Chronobot has no Warp tiles on the Timeline — it rolls no Paradoxes
              this phase.
            </p>
          )}
          <button className="phase-primary" onClick={onAdvance}>
            Continue to Power Up ▶
          </button>
        </>
      ) : (
        <div className="paradox-question">
          <p className="phase-note">
            Past Timeline tile {asked + 1} of {maxChecks}: does the Chronobot have the
            most (or tied-most) Warp tiles on it?
          </p>
          <div className="setup-actions">
            <button className="phase-primary" onClick={answerYes}>
              Yes — it ties or leads (roll)
            </button>
            <button className="phase-secondary" onClick={answerNo}>
              No
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/** Human-readable summary of the bot's pass decision (rulebook p. 6). */
function describeDecision(
  d: ReturnType<typeof Chronobot.botPassDecision>,
  min: number,
): string {
  switch (d) {
    case 'continue':
      return `The bot alternates turns with you and only passes once either you have passed and it has taken at least its minimum of ${min} turns, or it has used all its Exosuits and taken one additional Time Travel action.`;
    case 'continue-extra':
      return 'Difficulty: the Chronobot takes one additional turn after you passed — roll the AI die for it.';
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
        <span className="eoa-pop-title">
          Era {state.era} · Phase {PHASE_NUMBER[state.phase] ?? '—'}
        </span>
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

      {PHASE_META.actions?.rules && (
        <RulesBox label="Chronobot's turn — rulebook text">
          <p>{PHASE_META.actions.rules}</p>
        </RulesBox>
      )}

      <div className="eoa-difficulty">
        <span className="eoa-diff-title">Difficulty options</span>
        {state.config.difficulty.length === 0 ? (
          <span className="eoa-diff-none">Standard game — none selected</span>
        ) : (
          <ul className="eoa-diff-list">
            {state.config.difficulty.map((f) => (
              <li key={f}>{DIFFICULTY_LABEL[f] ?? f}</li>
            ))}
          </ul>
        )}
      </div>

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

/** Player score tally categories (rulebook). Timeline penalties subtract. */
const TALLY_FIELDS: {
  key: string;
  label: string;
  mult: number;
  sub?: boolean;
}[] = [
  { key: 'buildings', label: 'Buildings', mult: 1 },
  { key: 'anomalies', label: 'Anomalies', mult: 1 },
  { key: 'superprojects', label: 'Superprojects', mult: 1 },
  { key: 'timeTravel', label: 'Time Travel', mult: 1 },
  { key: 'morale', label: 'Morale', mult: 1 },
  { key: 'vpTokens', label: 'Victory Point tokens', mult: 1 },
  { key: 'endgame', label: 'Endgame Conditions', mult: 1 },
  { key: 'breakthroughs', label: 'Breakthroughs (×1 each)', mult: 1 },
  { key: 'breakthroughSets', label: 'Breakthrough sets (×2 each)', mult: 2 },
  { key: 'timelinePenalties', label: 'Timeline penalties (−)', mult: 1, sub: true },
];

/** Final score screen: bot tally + turns, and the player's score (number or tally). */
function ScoreScreen({
  state,
  onClose,
  onNewGame,
}: {
  state: GameState;
  onClose: () => void;
  onNewGame: () => void;
}) {
  const bot = state.chronobot;
  const s = Chronobot.scoreChronobot(bot);
  const [mode, setMode] = useState<'number' | 'tally'>('number');
  const [num, setNum] = useState('');
  const [tally, setTally] = useState<Record<string, number>>({});

  const tallyTotal = TALLY_FIELDS.reduce((sum, f) => {
    const v = (tally[f.key] ?? 0) * f.mult;
    return sum + (f.sub ? -v : v);
  }, 0);
  const playerScore =
    mode === 'number' ? (num.trim() === '' ? null : Number(num)) : tallyTotal;
  const result =
    playerScore == null || Number.isNaN(playerScore)
      ? null
      : playerScore > s.total
        ? 'win'
        : 'lose';

  return (
    <div className="modal-overlay">
      <div className="score-screen" onClick={(e) => e.stopPropagation()}>
        <div className="score-head">
          <h2>Final Score — Era {state.era}</h2>
          <button className="dp-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {/* Bot total + breakdown */}
        <div className="score-bot">
          <div className="score-total">
            <span className="score-total-num">{s.total}</span>
            <span className="score-total-label">Chronobot VP</span>
          </div>
          <ul className="score-breakdown">
            <li><span>During-game VP</span><b>{s.duringGameVP}</b></li>
            <li><span>Breakthroughs (1 each)</span><b>{s.breakthroughVP}</b></li>
            <li><span>Breakthrough sets (+2 each)</span><b>{s.shapeSetBonus}</b></li>
            {bot.anomalies > 0 && (
              <li><span>Anomalies (−3 each)</span><b>{s.anomalyVP}</b></li>
            )}
            <li className="score-sum"><span>Total</span><b>{s.total}</b></li>
            <li className="score-turns"><span>Bot turns taken</span><b>{bot.totalActions}</b></li>
          </ul>
          <div className="score-rules">
            <RulesBox label="End Game scoring — rulebook text">
              <p>{ENDGAME_RULES}</p>
            </RulesBox>
          </div>
        </div>

        {/* Player score */}
        <div className="score-player">
          <div className="score-player-head">
            <h3>Your score</h3>
            <div className="score-mode">
              <button className={mode === 'number' ? 'on' : ''} onClick={() => setMode('number')}>
                Number
              </button>
              <button className={mode === 'tally' ? 'on' : ''} onClick={() => setMode('tally')}>
                Tally sheet
              </button>
            </div>
          </div>

          {mode === 'number' ? (
            <input
              className="score-num-input"
              type="number"
              placeholder="Enter your total VP"
              value={num}
              onChange={(e) => setNum(e.target.value)}
            />
          ) : (
            <>
              <p className="score-rule">{PLAYER_SCORING_RULE}</p>
              <div className="tally-grid">
                {TALLY_FIELDS.map((f) => (
                  <label key={f.key} className="tally-row">
                    <span>{f.label}</span>
                    <input
                      type="number"
                      value={tally[f.key] ?? ''}
                      onChange={(e) =>
                        setTally((t) => ({ ...t, [f.key]: Number(e.target.value) || 0 }))
                      }
                    />
                  </label>
                ))}
              </div>
              <div className="tally-total">
                Your total: <b>{tallyTotal}</b>
              </div>
            </>
          )}
        </div>

        {result && (
          <div className={`score-result ${result}`}>
            {result === 'win'
              ? '🎉 You win! (more points than the Chronobot)'
              : 'You lose — the Chronobot has at least as many points.'}
          </div>
        )}

        <div className="score-actions">
          <button className="modal-no" onClick={onClose}>
            Close
          </button>
          <button className="modal-yes" onClick={onNewGame}>
            ⟳ New Game
          </button>
        </div>
      </div>
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
  paradoxWidth,
  onParadoxWidth,
  hotspotWidth,
  onHotspotWidth,
  hotspotHeight,
  onHotspotHeight,
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
  paradoxWidth: number;
  onParadoxWidth: (w: number) => void;
  hotspotWidth: number;
  onHotspotWidth: (w: number) => void;
  hotspotHeight: number;
  onHotspotHeight: (h: number) => void;
}) {
  const literal =
    'export const BOARD_COUNTERS: BoardCounter[] = [\n' +
    BOARD_COUNTERS.map((c) => {
      const [x, y] = positions[c.key] ?? c.pos;
      return `  { key: '${c.key}', pos: [${x}, ${y}], label: '${c.label}' },`;
    }).join('\n') +
    '\n];';
  const hotspotLiteral =
    'export const CHRONOBOT_HOTSPOTS: Hotspot[] = [\n' +
    CHRONOBOT_HOTSPOTS.map((h) => {
      const [cx, cy] = positions[hotspotKey(h.id)] ?? [
        h.rect[0] + h.rect[2] / 2,
        h.rect[1] + h.rect[3] / 2,
      ];
      // Convert the calibrated center back to a top-left rect [left, top, w, h].
      const left = +(cx - hotspotWidth / 2).toFixed(1);
      const top = +(cy - hotspotHeight / 2).toFixed(1);
      const note = h.note ? `, note: '${h.note}'` : '';
      return `  { id: '${h.id}', action: '${h.action}', rect: [${left}, ${top}, ${hotspotWidth}, ${hotspotHeight}]${note} },`;
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
  const paradoxLiteral =
    'export const PARADOX_SLOTS: ParadoxLayout = {\n  slots: [\n' +
    PARADOX_KEYS.map((key, i) => {
      const [x, y] = positions[key] ?? PARADOX_SLOTS.slots[i];
      return `    [${x}, ${y}],`;
    }).join('\n') +
    `\n  ],\n  width: ${paradoxWidth},\n};`;
  const ttLabel = (i: number) =>
    i === 0 ? 'TT start (0 VP)' : `TT +${i} (${Chronobot.TIME_TRAVEL_VP[i]} VP)`;
  const pathLabel = (path: PathId, i: number) =>
    `${path === 'short' ? 'S' : 'L'}${i + 1} ${Chronobot.CHRONOBOT_PATHS[path][i]}`;
  // One selectable item button. `def` is the seed position shown until placed.
  const item = (
    key: string,
    label: React.ReactNode,
    def: [number, number],
    extraClass = '',
  ) => (
    <button
      key={key}
      className={`cal-item ${extraClass} ${selected === key ? 'on' : ''}`}
      onClick={() => onSelect(key)}
    >
      {label}{' '}
      <span className="cal-xy">{(positions[key] ?? def).join(', ')}</span>
    </button>
  );
  const sizeSlider = (
    label: string,
    value: number,
    onChange: (w: number) => void,
    max: number,
  ) => (
    <label className="cal-size">
      {label}: <b>{value}%</b>
      <input
        type="range"
        min={1}
        max={max}
        step={0.1}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
      />
    </label>
  );
  return (
    <div className="cal-panel">
      <p className="cal-hint">
        <b>Calibrate.</b> Pick a spot, click the board to place it, then arrow-keys
        nudge (0.2% / Shift = 1%). Copy each group's text to me when done.
      </p>

      <details className="cal-group" open>
        <summary>Action places ({HOTSPOT_KEYS.length})</summary>
        <p className="cal-note">Anchor point = center of the tile box (same as every other overlay).</p>
        {sizeSlider('Tile width', hotspotWidth, onHotspotWidth, 20)}
        {sizeSlider('Tile height', hotspotHeight, onHotspotHeight, 20)}
        <div className="cal-list">
          {CHRONOBOT_HOTSPOTS.map((h) =>
            item(
              hotspotKey(h.id),
              CHRONOBOT_ACTIONS[h.action].label,
              [h.rect[0] + h.rect[2] / 2, h.rect[1] + h.rect[3] / 2],
              'hotspot-item',
            ),
          )}
        </div>
        <textarea className="cal-out" readOnly value={hotspotLiteral} />
      </details>

      <details className="cal-group">
        <summary>Count badges ({BOARD_COUNTERS.length})</summary>
        <div className="cal-list">
          {BOARD_COUNTERS.map((c) => item(c.key, c.label, c.pos))}
        </div>
        <textarea className="cal-out" readOnly value={literal} />
      </details>

      <details className="cal-group">
        <summary>Time Travel track ({TT_KEYS.length})</summary>
        {sizeSlider('TT marker width', markerWidth, onMarkerWidth, 12)}
        <div className="cal-list">
          {TT_KEYS.map((key, i) =>
            item(key, ttLabel(i), TIME_TRAVEL_TRACK.spots[i], 'tt'),
          )}
        </div>
        <textarea className="cal-out" readOnly value={ttLiteral} />
      </details>

      <details className="cal-group">
        <summary>Command paths ({PATH_KEYS.length})</summary>
        {sizeSlider('Command marker width', cmdMarkerWidth, onCmdMarkerWidth, 12)}
        <div className="cal-list">
          {(['short', 'long'] as PathId[]).flatMap((path) =>
            PATH_SPOTS[path].map((seed, i) =>
              item(pathKey(path, i), pathLabel(path, i), seed, 'path'),
            ),
          )}
        </div>
        <textarea className="cal-out" readOnly value={pathLiteral} />
      </details>

      <details className="cal-group">
        <summary>Warp tile</summary>
        {sizeSlider('Warp marker width', warpMarkerWidth, onWarpMarkerWidth, 14)}
        <div className="cal-list">
          {item(WARP_KEY, 'Warp tile', WARP_MARKER.pos, 'warp')}
        </div>
        <textarea className="cal-out" readOnly value={warpLiteral} />
      </details>

      <details className="cal-group">
        <summary>Paradox slots ({PARADOX_KEYS.length})</summary>
        {sizeSlider('Paradox width', paradoxWidth, onParadoxWidth, 14)}
        <div className="cal-list">
          {PARADOX_KEYS.map((key, i) =>
            item(
              key,
              `Paradox ${i + 1} ${i === 1 ? '(◀)' : '(▶)'}`,
              PARADOX_SLOTS.slots[i],
              'paradox',
            ),
          )}
        </div>
        <textarea className="cal-out" readOnly value={paradoxLiteral} />
      </details>
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
  onHome,
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
  paradoxes,
  onParadox,
  era,
  onEra,
}: {
  onHome?: () => void;
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
  paradoxes: number;
  onParadox: (delta: number) => void;
  era: number;
  onEra: (delta: number) => void;
}) {
  // Warp is now tracked on the board (see the Warp-tile marker), not here.
  const stats: { label: string; value: string | number }[] = [];
  return (
    <div className="stats-bar">
      <div className="stats-left">
        {onHome && (
          <button
            className="home-btn"
            onClick={onHome}
            title="Back to the home screen"
            aria-label="Back to the home screen"
          >
            <img src="/favicon-512.png" alt="" />
          </button>
        )}
        {debug && (
          <span className="debug-badge on" title="Debug mode is on (see the ⚙ menu)">
            🛠 DEBUG
          </span>
        )}
        {debug && (
          <div className="paradox-ctl" title="Set the Era (1–7)">
            <button onClick={() => onEra(-1)} disabled={era <= 1} aria-label="Previous era">
              −
            </button>
            <span className="paradox-ctl-val">Era {era}</span>
            <button onClick={() => onEra(1)} disabled={era >= 7} aria-label="Next era">
              +
            </button>
          </div>
        )}
        {debug && (
          <div className="paradox-ctl" title="Set the number of Paradoxes (0–3)">
            <button onClick={() => onParadox(-1)} disabled={paradoxes <= 0} aria-label="Fewer paradoxes">
              −
            </button>
            <span className="paradox-ctl-val">P {paradoxes}</span>
            <button onClick={() => onParadox(1)} disabled={paradoxes >= 3} aria-label="More paradoxes">
              +
            </button>
          </div>
        )}
        <div className="stats-row">
          {stats.map((s) => (
            <span key={s.label} className="stat-pill">
              <b>{s.value}</b> {s.label}
            </span>
          ))}
        </div>
      </div>
      {!calibrate && (
        <div className="bot-turn">
          <VpPill
            botVp={bot.vp}
            buildingVp={bot.buildingVp}
            timeTravelVp={Chronobot.timeTravelVp(bot)}
            breakthroughVp={Chronobot.breakthroughVp(bot)}
          />
          {/* Primary turn controls — kept together on the top row when wrapping. */}
          <div className="turn-core">
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
              {botPassed ? '✓ Bot Passed' : 'Take Bot Action'}
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
              {playerPassed ? '✓ You passed' : 'You Pass'}
            </button>
            <button
              className="undo-btn"
              onClick={onUndo}
              disabled={!canUndo}
              title="Undo the last step (restores the same die roll)"
            >
              ↶ Undo
            </button>
          </div>
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
        <SettingsMenu
          debug={debug}
          onToggleDebug={onToggleDebug}
          outline={outline}
          onToggleOutline={onToggleOutline}
          calibrate={calibrate}
          onToggleCalibrate={onToggleCalibrate}
          onReset={onReset}
          historyOpen={historyOpen}
          onToggleHistory={onToggleHistory}
        />
      </div>
    </div>
  );
}

/** Top-right ⚙ menu: play/debug, dev toggles (in debug), and Reset Game. */
function SettingsMenu({
  debug,
  onToggleDebug,
  outline,
  onToggleOutline,
  calibrate,
  onToggleCalibrate,
  onReset,
  historyOpen,
  onToggleHistory,
}: {
  debug: boolean;
  onToggleDebug: () => void;
  outline: boolean;
  onToggleOutline: () => void;
  calibrate: boolean;
  onToggleCalibrate: () => void;
  onReset: () => void;
  historyOpen: boolean;
  onToggleHistory: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { user, loading, login, logout } = useAuth();
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.settings-menu')) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="settings-menu">
      <button
        className={`gear-btn ${debug ? 'debug-on' : ''} ${open ? 'on' : ''}`}
        onClick={() => setOpen((o) => !o)}
        title="Settings"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        ⚙
      </button>
      {open && (
        <div className="settings-dropdown" role="menu">
          <button
            className={`settings-item ${historyOpen ? 'active' : ''}`}
            onClick={() => {
              onToggleHistory();
              setOpen(false);
            }}
            role="menuitem"
          >
            🕑 History
          </button>
          <div className="settings-sep" />
          <button
            className="settings-item toggle"
            onClick={onToggleDebug}
            role="menuitemcheckbox"
            aria-checked={debug}
          >
            <span>Debug mode</span>
            <span className={`sw ${debug ? 'on' : ''}`}>{debug ? 'ON' : 'OFF'}</span>
          </button>
          {debug && (
            <>
              <button
                className="settings-item toggle sub"
                onClick={onToggleOutline}
                role="menuitemcheckbox"
                aria-checked={outline}
              >
                <span>Tile outlines</span>
                <span className={`sw ${outline ? 'on' : ''}`}>{outline ? 'ON' : 'OFF'}</span>
              </button>
              <button
                className="settings-item toggle sub"
                onClick={onToggleCalibrate}
                role="menuitemcheckbox"
                aria-checked={calibrate}
              >
                <span>Calibrate positions</span>
                <span className={`sw ${calibrate ? 'on' : ''}`}>{calibrate ? 'ON' : 'OFF'}</span>
              </button>
            </>
          )}
          <div className="settings-sep" />
          <button className="settings-item danger" onClick={onReset} role="menuitem">
            ⟳ Reset Game
          </button>
          <div className="settings-sep" />
          {loading ? (
            <button className="settings-item disabled" disabled role="menuitem">
              👤 …
            </button>
          ) : user ? (
            <button className="settings-item" onClick={logout} role="menuitem" title={`Signed in as ${user.username}`}>
              👤 Sign out ({user.username})
            </button>
          ) : (
            <button className="settings-item" onClick={login} role="menuitem">
              👤 Log in with BoardGameEdge
            </button>
          )}
        </div>
      )}
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


        {/* Step 1 — placement gate for any mech-placing action. */}
        {pending === 'mech' && (
          <div className="place-prompt">
            <p className="pp-instruct">
              Place the Chronobot’s Exosuit on the topmost available{' '}
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
              Place the Chronobot’s Exosuit in an open <b>Mine</b> space granting
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
              Place the Chronobot’s Exosuit on the topmost available <b>Recruit</b>{' '}
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
                remove 1 Anomaly. (Remove Anomaly places no Exosuit.)
              </p>
              <button className="start-turn" onClick={onStartTurn}>
                ▶ Start Your Turn
              </button>
            </div>
          ) : (
            <div className="place-prompt failed-note">
              <p className="pp-instruct">
                Failed Action: {removeAnomaly.reason} — the Chronobot takes +1 VP
                instead (no Exosuit placed).
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
        📖 Placing the Chronobot’s Exosuit {open ? '▾' : '▸'}
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
