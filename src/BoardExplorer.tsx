import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import './BoardExplorer.css';
import { useAuth } from './auth/useAuth';
import { recordGame } from './data/gameData';
import HistoryScreen from './history/HistoryScreen';
import HistoryPane from './history/HistoryPane';
import AdminStats from './history/AdminStats';
import ReadyToBegin from './phases/ReadyToBegin';
import FirstPlayerPrompt from './phases/FirstPlayerPrompt';
import TurnBarOverview from './phases/TurnBarOverview';
import AnchoredPopover from './components/AnchoredPopover';
import DebugBar from './components/DebugBar';
import { useMediaQuery } from './game/useMediaQuery';
// Re-exported for existing importers (e.g. ChronossusGame).
export { AnchoredPopover };
import RulesFrame, { RulesButton } from './rules/RulesFrame';
import {
  AI_DIE_FACES,
  CHRONOBOT_ACTIONS,
  Chronobot,
  Chronossus,
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
  type Phase,
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
  CHRONOBOT_OVERLAYS,
  OVERLAY_KEYS,
  OVERLAY_LABEL,
  overlayKey,
  type OverlayKey,
} from './board/botOverlays';
import { BotOverlayLayer } from './board/BotOverlayLayer';
import { overlayCount, withOverlayCount } from './board/botOverlays';
import { OverlayDebugControls } from './components/OverlayDebugControls';
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
/** Calibration keys for the bot-placement overlay images (one per type). */
const OV_KEYS = OVERLAY_KEYS.map((k) => overlayKey(k));
/** Every calibratable point: count badges, 7 TT spots, path steps, warp, paradox, hotspots, overlays. */
const CAL_KEYS: string[] = [
  ...HOTSPOT_KEYS,
  ...BOARD_COUNTERS.map((c) => c.key),
  ...TT_KEYS,
  ...PATH_KEYS,
  WARP_KEY,
  ...PARADOX_KEYS,
  ...OV_KEYS,
];

/** Phases the Debug jump-to-phase bar can hop between (both bots share this list). */
const DEBUG_PHASES: Phase[] = [
  'setup',
  'preparation',
  'paradox',
  'powerup',
  'warp',
  'actions',
  'cleanup',
  'endgame',
];

/** Fractures: the Blink check drew a Flux Core — an Exosuit already on the board moves to
 *  this Action instead of a new one being placed. Shared by the Action and tile dialogs. */
export function BlinkPanel({
  blink,
  fluxDrawSrc,
  destination,
  onConfirm,
}: {
  blink: { spaceLabel: string; sameSpaceCount: number; rule: 'command-token' | 'bottom-left'; token?: number };
  fluxDrawSrc?: string | null;
  destination: string;
  onConfirm: () => void;
}) {
  return (
    <div className="place-prompt">
      {fluxDrawSrc && (
        <div className="flux-draw">
          <img src={fluxDrawSrc} alt="Flux Core drawn" />
          <span>Drawn from the Flux Pool — Blink activated.</span>
        </div>
      )}
      {/* The selection rule is folded into the instruction rather than explained beside
          it — the verbatim box below carries the rulebook's own wording. */}
      <p className="pp-instruct">
        Move its Exosuit from <b>{blink.spaceLabel}</b> (bottom-most space) to{' '}
        <b>{destination}</b>, and return that Exosuit’s Energy Core to the supply.
      </p>
      <div className="pp-buttons">
        <button className="pp-confirm" onClick={onConfirm}>
          ✓ Confirm moved
        </button>
      </div>
    </div>
  );
}

/**
 * Collapsible VERBATIM Blink rules. Rendered by each dialog's FOOTER, below the boxes with
 * the other 📖 rule collapsibles — not inside the Blink step, which is a `.place-prompt`
 * box of its own.
 */
export function BlinkRuleBlock() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mech-rules">
      <button className="mech-cta" onClick={() => setOpen((o) => !o)}>
        📖 Blink rules {open ? '▾' : '▸'}
      </button>
      {open && (
        <div className="rule-body">
          {Chronossus.BLINK_RULE.split('\n').map((line, i) =>
            line ? (
              <p key={i} className="dp-rule">
                {line}
              </p>
            ) : (
              <p key={i} className="dp-rule dp-rule-gap" />
            ),
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Fractures: place one of the bot's available powered Exosuits — the step that tells the
 * player to
 * place, which only comes AFTER the space was confirmed free and the Blink check ran (a
 * Blink moves an Exosuit already on the board instead, so the app has to know the outcome
 * before it can say what to do). `drewCasing` adds the Empty-Flux-Casing note when the
 * check ran and produced no Blink; without it this is simply the placement step. The Flux
 * Pool is app-held, so the draw is only REPORTED here — never handed to the player to
 * discard or set aside.
 */
export function PlaceExosuitPanel({
  destination,
  fluxDrawSrc,
  drewCasing = false,
  onContinue,
}: {
  /** Where it places — the confirmed space ("Construct", "World Council", …). */
  destination: string;
  fluxDrawSrc?: string | null;
  drewCasing?: boolean;
  onContinue: () => void;
}) {
  return (
    <div className="place-prompt">
      {drewCasing && fluxDrawSrc && (
        <div className="flux-draw">
          <img src={fluxDrawSrc} alt="Empty Flux Casing drawn" />
          <span>Drawn from the Flux Pool — no Blink.</span>
        </div>
      )}
      <p className="pp-instruct">
        Place one of its <b>available powered Exosuits</b> on <b>{destination}</b>, and put
        an Energy Core from the supply into it.
      </p>
      <div className="pp-buttons">
        <button className="pp-confirm" onClick={onContinue}>
          ✓ Confirm placed
        </button>
      </div>
    </div>
  );
}

export type PendingStep =
  | null
  | 'mech'
  /** Guardians: no space anywhere, so a Guardian goes on its own Guardian board slot. */
  | 'guardianSpace'
  | 'buildingVP'
  | 'mineOpen'
  | 'mineResources'
  | 'recruitWorker'
  | 'geniusQuestion'
  | 'geniusRecruit'
  | 'research'
  | 'removeAnomaly'
  | 'reboot'
  | 'timeTravel'
  // Fractures of Time (Chronossus only): the split placement gate + the Blink check.
  | 'worldCouncil'
  | 'blink'
  | 'fluxCasing';

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
  /** The AI die rolled for a bot turn, shown as the die symbol in History. */
  die?: number | null;
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
export function summarizeTurn(
  pre: ChronobotState,
  post: ChronobotState,
  instructions: Instruction[],
): string[] {
  const out: string[] = [];
  const hasId = (part: string) => instructions.some((i) => i.id.includes(part));

  // A Failed Action costs the Chronossus an active Exosuit — it is discarded, not placed,
  // so the same "one fewer Exosuit" delta has to read differently.
  if (post.exosuitsAvailable < pre.exosuitsAvailable) {
    out.push(hasId('fail') ? 'Discarded an active Exosuit' : 'Exosuit placed');
  }
  // The VP granted for a Failed Action is normally +1, but the Chronossus's
  // "Failed Actions score VP" difficulty replaces that with +2 — read the actual
  // delta rather than hardcoding +1, so this line never contradicts the turn's
  // own VP total.
  if (hasId('fail')) out.push(`Failed action (+${post.vp - pre.vp} VP)`);

  (['factory', 'lab', 'powerplant', 'support'] as const).forEach((t) => {
    if (post.buildings[t] > pre.buildings[t]) {
      const vp = post.buildingVps[t][post.buildingVps[t].length - 1];
      out.push(`${BUILDING_LABEL[t]} taken (${vp} VP)`);
    }
  });
  if (post.superprojects > pre.superprojects) {
    const vp = post.superprojectVps[post.superprojectVps.length - 1];
    out.push(`Superproject taken (${vp} VP) · Breakthrough discarded`);
  }

  (['circle', 'triangle', 'square'] as const).forEach((s) => {
    if (post.breakthroughs[s] > pre.breakthroughs[s]) {
      out.push(`Breakthrough taken (${s})`);
    }
  });

  if (hasId('recruit-set')) {
    out.push('Worker set completed — discard one of each (+5 VP)');
  } else {
    (['genius', 'administrator', 'engineer', 'scientist'] as const).forEach((w) => {
      if (post.workers[w] > pre.workers[w]) out.push(`Recruited ${w}`);
    });
  }

  const resTypes = ['neutronium', 'uranium', 'gold', 'titanium'] as const;
  if (hasId('mine-set')) {
    out.push('Resource set completed — discard one of each (+5 VP)');
  } else {
    resTypes.forEach((r) => {
      const d = post.resources[r] - pre.resources[r];
      if (d > 0) out.push(`Gained ${d > 1 ? d + ' ' : ''}${r}`);
    });
    resTypes.forEach((r) => {
      const d = pre.resources[r] - post.resources[r];
      if (d > 0) out.push(`Discarded ${d > 1 ? d + ' ' : ''}${r}`);
    });
  }

  if (post.anomalies < pre.anomalies) out.push('Removed 1 Anomaly');
  if (
    post.warpTilesOnTimeline < pre.warpTilesOnTimeline ||
    post.timeTravelTrack > pre.timeTravelTrack
  ) {
    out.push('Warp tile removed — Time Travel advances');
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

// The Simple Command View is a display preference (a play aid), independent of the
// game snapshot — persisted under its own key so it survives across games.
const SIMPLE_VIEW_KEY = 'anachrony:simpleView';
function loadSimpleView(): boolean {
  try {
    // On by default: only an explicit '0' (the player turned it off) disables it.
    return localStorage.getItem(SIMPLE_VIEW_KEY) !== '0';
  } catch {
    return true;
  }
}
function saveSimpleView(on: boolean): void {
  try {
    localStorage.setItem(SIMPLE_VIEW_KEY, on ? '1' : '0');
  } catch {
    /* ignore */
  }
}

function clearPersisted(): void {
  try {
    localStorage.removeItem(PERSIST_KEY);
  } catch {
    /* ignore */
  }
}

// Save keys of the *other* Solo opponents. Only ONE opponent may be cached at a
// time, so starting a fresh Chronobot game clears any of these. (Chronossus
// isn't implemented yet; when it is, its new-game path must likewise clear
// PERSIST_KEY so the invariant holds both ways.)
const OTHER_OPPONENT_KEYS = ['anachrony:chronossus'];
function clearOtherOpponentSaves(): void {
  try {
    for (const k of OTHER_OPPONENT_KEYS) localStorage.removeItem(k);
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

export function ShapeIcon({ shape, size }: { shape: BreakthroughShape; size: number }) {
  return (
    <img
      className="shape-icon"
      src={SHAPE_IMG[shape]}
      alt={shape}
      style={{ width: size, height: size }}
    />
  );
}

/** A tapped tracker-badge info popover — anchored to the badge, clamped on screen. */
export function BadgePopover({
  rect,
  variant,
  children,
}: {
  rect: DOMRect | null;
  variant: 'bt' | 'text';
  children: React.ReactNode;
}) {
  return (
    <AnchoredPopover rect={rect} className={`badge-portal ${variant}`}>
      {children}
    </AnchoredPopover>
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
  era: number,
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
    case 'mech': {
      // Placed this Era = powered (set at Power Up) − still available.
      const deployed = Math.max(0, Chronobot.chronobotPoweredExosuits(era) - count);
      return (
        `${c.label}: ${count} powered Exosuit${count === 1 ? '' : 's'} available` +
        ` · ${deployed} deployed on board`
      );
    }
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
  // Viewport rect of the last-tapped badge, so its popover (portaled to <body>
  // to escape the badge's transform) can anchor near it while staying on-screen.
  const [tappedRect, setTappedRect] = useState<DOMRect | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  // Rules mode: a full-viewport GameBrain rules frame overlays the game view
  // (which stays mounted underneath, so Back-to-Game restores the exact spot).
  const [modeRules, setModeRules] = useState(false);
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
  // Simple Command View: an at-a-glance overlay of the Command tokens, the Action
  // space each sits on, and how the AI die moves them. A play aid for all players.
  const [simpleView, setSimpleView] = useState<boolean>(loadSimpleView);
  const [simpleViewShown, setSimpleViewShown] = useState(true);
  useEffect(() => saveSimpleView(simpleView), [simpleView]);
  // On phones the on-board overlay doesn't fit; render it below the board instead.
  const scvBelow = useMediaQuery('(max-width: 760px)');
  // Measure the board-stage content box (excludes the History dock's reserved
  // padding) so we can dock the Simple Command View to the left of the board
  // whenever there's horizontal room to spare beside it.
  const [stageEl, setStageEl] = useState<HTMLDivElement | null>(null);
  const [stageSize, setStageSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    if (!stageEl) return;
    const px = (v: string) => parseFloat(v) || 0;
    const measure = () => {
      const cs = getComputedStyle(stageEl);
      setStageSize({
        w: stageEl.clientWidth - px(cs.paddingLeft) - px(cs.paddingRight),
        h: stageEl.clientHeight - px(cs.paddingTop) - px(cs.paddingBottom),
      });
    };
    const ro = new ResizeObserver(measure);
    ro.observe(stageEl);
    measure();
    return () => ro.disconnect();
  }, [stageEl]);
  // Board renders height-constrained (aspect-locked), so its width is derived
  // from the stage height; dock left only when the leftover width fits the panel.
  const SCV_SIDE_W = 320;
  const boardFitW = Math.min(stageSize.w, stageSize.h * (1500 / 1110));
  const scvMode: 'below' | 'side' | 'overlay' = scvBelow
    ? 'below'
    : stageSize.w > 0 && stageSize.w - boardFitW >= SCV_SIDE_W + 24
      ? 'side'
      : 'overlay';
  // Debug OFF = play mode: tapping a tile only shows its rules (no activation),
  // and the calibrate/outline dev controls are hidden. Defaults OFF. Debug is
  // admin-only, so a confirmed non-admin can never have it on.
  const [debug, setDebug] = useState(() => persisted?.debug ?? false);
  const { user: authUser, loading: authLoading } = useAuth();
  useEffect(() => {
    if (!authLoading && !authUser?.isAdmin && debug) {
      setDebug(false);
      setOutline(false);
      setCalibrate(false);
    }
  }, [authLoading, authUser, debug]);
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
  // A rolled-but-not-yet-committed AI die: cleared only when a turn commits (or on
  // a full reset), NOT when the dialog is cancelled — so closing a bot dialog and
  // re-hitting Take Bot Action repeats the same roll / action rather than re-rolling.
  const pendingDieRef = useRef<number | null>(null);
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
      ...Object.fromEntries(CHRONOBOT_OVERLAYS.map((o) => [overlayKey(o.key), o.pos])),
    }),
  );
  // Per-type overlay-image widths (calibrated separately from position).
  const [overlayWidths, setOverlayWidths] = useState<Record<string, number>>(() =>
    Object.fromEntries(CHRONOBOT_OVERLAYS.map((o) => [o.key, o.width])),
  );
  // Per-type overlay corner rounding (border-radius %).
  const [overlayCurves, setOverlayCurves] = useState<Record<string, number>>(() =>
    Object.fromEntries(CHRONOBOT_OVERLAYS.map((o) => [o.key, o.curve ?? 0])),
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

  // Theme the document for the Chronobot (purple defaults) while mounted; clears
  // any Chronossus theme attribute left on the root.
  useEffect(() => {
    document.documentElement.dataset.bot = 'chronobot';
    return () => {
      delete document.documentElement.dataset.bot;
    };
  }, []);

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
      if (!t.closest('.count-badge') && !t.closest('.badge-portal')) setTappedBadge(null);
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

  // Close the dialog UI + selections (not the pending roll or the shown die).
  const clearDialogState = () => {
    setActive(null);
    setPending(null);
    setResult([]);
    setSelectedVP(null);
    setSelectedResources([]);
    setSelectedWorker(null);
    setRolledShape(null);
    setRuleView(false);
    activeTokenRef.current = null;
    passTimeTravelRef.current = false;
  };
  // Full close: dialog + the rolled die + token. Used after a committed turn and on
  // resets — the next Take Bot Action rolls fresh.
  const closePanel = () => {
    clearDialogState();
    setBotDie(null);
    setActiveToken(null);
    botDieRef.current = null;
    pendingDieRef.current = null;
  };
  // Cancel (the dialog ×): close the dialog but KEEP the rolled die + token so
  // re-hitting Take Bot Action repeats the same roll. If the turn already committed
  // (or this was a rule-view tap), pendingDieRef is null, so clear the die too.
  const cancelPanel = () => {
    clearDialogState();
    if (pendingDieRef.current == null) {
      setBotDie(null);
      setActiveToken(null);
      botDieRef.current = null;
    }
  };

  // Commit a state change: push the current (pre-commit) snapshot + a history
  // label onto the undo stack, then apply the next state + tokens. Every
  // committed turn routes through here so Undo/History have one source of truth.
  const commit = (
    next: GameState,
    nextTokens: CommandTokensState,
    label: string,
    effects: string[] = [],
    die: number | null = null,
  ) => {
    const pre: Snapshot = { state, tokens, botDie, activeToken };
    setUndoStack((s) => [...s, { snap: pre, label, die, effects }].slice(-UNDO_CAP));
    setState(next);
    setTokens(nextTokens);
  };

  /** One-line history label for a resolved Action turn. */
  const turnLabel = (
    instructions: Instruction[],
    die: number | null,
    actionLabel: string,
  ) => {
    // The die is shown as a symbol in History (see HistoryPane), not inline text.
    void die;
    const vp = instructions.reduce((n, i) => n + (i.effect?.vp ?? 0), 0);
    const vpPart = vp ? ` · +${vp} VP` : '';
    return `Era ${state.era} · ${actionLabel}${vpPart}`;
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
    pendingDieRef.current = snap.botDie; // pending again → next Take repeats the roll
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
      activeTokenRef.current = null;
      setActiveToken(null);
      setPassMsg(null);
      // A bot turn always starts with a roll — this one is a turn (it takes the final
      // Time Travel and counts toward its Actions), so roll and SHOW the die even though
      // the Action is forced. History records it, so a later read-back sees the turn that
      // ended in the pass rather than a bare "Bot passed".
      const passDie = pendingDieRef.current ?? rollAiDie();
      pendingDieRef.current = null;
      botDieRef.current = passDie;
      setBotDie(passDie);
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
          [
            ...summarizeTurn(state.chronobot, next.chronobot, instructions),
            'Out of Exosuits — its final Time Travel, then it passes',
          ],
          passDie,
        );
        setPassMsg(instructions.map((i) => i.text).join(' '));
      }
      return;
    }
    if (decision === 'pass') {
      const { state: next, instructions } = Chronobot.resolveBotPass(state);
      // No roll here: this isn't a bot turn — you passed first and it has met its minimum,
      // so the phase ends immediately (rulebook's "However" exception).
      commit(next, tokens, `Era ${state.era} · Bot passed`, [
        `You passed and it has taken its ${Chronobot.chronobotMinActions(state)} Actions — the Action Rounds Phase ends`,
      ]);
      setPassMsg(instructions.map((i) => i.text).join(' '));
      setBotDie(null);
      setActiveToken(null);
      botDieRef.current = null;
      activeTokenRef.current = null;
      pendingDieRef.current = null;
      return;
    }
    // 'continue' / 'must-continue-min3' → take a normal die-driven Action turn.
    // Reuse a rolled-but-uncommitted die (after cancelling the dialog, or Undo) so
    // it repeats the same roll / action; otherwise roll fresh.
    const die = pendingDieRef.current ?? rollAiDie();
    pendingDieRef.current = die;
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
      botDie,
    );
    setResult(instructions);
    setPending(null);
    activeTokenRef.current = null;
    pendingDieRef.current = null; // roll consumed — the next turn rolls fresh
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

  // Simple Command View: tapping a row shows that action's rules only (a
  // reference), matching a play-mode free-tap on the main board — never an
  // engine activation, regardless of debug.
  const showActionRules = (action: ChronobotActionId) => {
    const h = CHRONOBOT_HOTSPOTS.find((x) => x.action === action);
    if (!h) return;
    botDieRef.current = null;
    activeTokenRef.current = null;
    setBotDie(null);
    setActiveToken(null);
    setShowStatus(false);
    setActive(h);
    setResult([]);
    setSelectedVP(null);
    setSelectedResources([]);
    setSelectedWorker(null);
    setRolledShape(null);
    setRuleView(true);
    setPending(null);
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
          [
            ...summarizeTurn(state.chronobot, next.chronobot, instructions),
            'Out of Exosuits — its final Time Travel, then it passes',
          ],
          botDieRef.current,
        );
        setPassMsg(instructions.map((i) => i.text).join(' '));
      } else {
        resolve(active, {});
      }
    }
    closePanel();
  };

  // Debug: jump straight to a phase (may skip engine setup — a testing shortcut).
  const goPhaseDebug = (p: Phase) => {
    closePanel();
    setState((s) => ({ ...s, phase: p }));
  };
  const toggleImpact = () => setState((s) => ({ ...s, impact: !s.impact }));

  // The unified Debug bar (Debug dropdown + jump-to-phase), shown in every phase
  // view when Debug is on. All the scattered Era/Paradox controls live here now.
  const debugBar = debug ? (
    <DebugBar
      phases={DEBUG_PHASES}
      currentPhase={state.phase}
      onGoPhase={goPhaseDebug}
      era={state.era}
      maxEra={Chronobot.MAX_ERA}
      onEra={changeEra}
      paradoxes={paradoxes}
      onParadox={(d) => setParadoxes((n) => Math.max(0, Math.min(3, n + d)))}
      impact={state.impact}
      onToggleImpact={toggleImpact}
      timeTravel={Chronobot.timeTravelSpot(bot)}
      maxTimeTravel={Chronobot.TIME_TRAVEL_VP.length - 1}
      onTimeTravel={(d) =>
        setState((s) => ({
          ...s,
          chronobot: {
            ...s.chronobot,
            timeTravelTrack: Math.max(
              0,
              Math.min(Chronobot.TIME_TRAVEL_VP.length - 1, s.chronobot.timeTravelTrack + d),
            ),
          },
        }))
      }
      extra={
        <OverlayDebugControls
          count={(k) => overlayCount(bot, k)}
          onSet={(k, v) =>
            setState((s) => ({ ...s, chronobot: withOverlayCount(s.chronobot, k, v) }))
          }
        />
      }
    />
  ) : null;

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
  // Answer "who took the First Player spot next Era?". Where it leads depends on
  // WHEN it's asked: at the end of Action Rounds (Eras 1–4) it flows into Clean Up;
  // deferred to after the Clean Up game-end check (Eras 5–6) it starts the next Era.
  const answerFirstPlayer = (playerFirst: boolean) => {
    setShowFirstPlayer(false);
    setShowStatus(false);
    setState((s) => {
      const withFp: GameState = { ...s, firstPlayer: playerFirst ? 'player' : 'bot' };
      return s.phase === 'cleanup'
        ? Chronobot.startNextEra(withFp)
        : Chronobot.resolveCleanUp(withFp);
    });
  };

  // End of Action Rounds → Clean Up. The First-Player prompt (who leads next Era)
  // is only worth asking when a next Era is guaranteed to happen:
  //  • Final Era (7): the game ends in Clean Up — no prompt.
  //  • Post-Impact Eras (5–6): the game MIGHT end when flipping Collapsing Capital,
  //    so go to Clean Up first and defer the prompt to the "Game continues" choice.
  //  • Eras 1–4: no end-game branch, so ask now, then Clean Up.
  const endActions = () => {
    const era = state.era;
    if (era >= Chronobot.MAX_ERA) {
      // Last Era: no Clean Up step — go straight to scoring.
      setShowStatus(false);
      endGameNow();
      return;
    }
    if (era === 5 || era === 6) {
      setShowStatus(false);
      setState((s) => Chronobot.resolveCleanUp(s));
      return;
    }
    setShowFirstPlayer(true);
  };

  // Seed the chosen difficulty and enter Era 1, Phase 1 (Preparation).
  const beginWithDifficulty = (difficulty: string[]) => {
    // A brand-new Chronobot game is now the only cached opponent.
    clearOtherOpponentSaves();
    setState((s) => startFirstEra({ ...s, config: { ...s.config, difficulty } }));
  };

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
        actionInProgress={active != null && !ruleView}
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
        onOpenRules={() => setModeRules(true)}
        simpleView={simpleView}
        onToggleSimpleView={() => setSimpleView((v) => !v)}
      />
  );

  // The action dialog. On mobile it renders in normal flow (flow=true) at the
  // top of the stage, pushing the board + Command View down; on desktop it's an
  // absolute panel on the board. Returns null when no action is active.
  const renderDetailPanel = (flow: boolean) =>
    !calibrate && active ? (
      <DetailPanel
        flow={flow}
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
        onClose={cancelPanel}
      />
    ) : null;

  const boardStage = (
      <div
        className={`board-stage ${showHistory ? 'with-history' : ''}`}
        ref={setStageEl}
      >
        {/* Mobile: the action box fills the space under the top bar, pushing the
            board + Command View down; it disappears (restoring them) on close. */}
        {scvMode === 'below' && renderDetailPanel(true)}
        {simpleView && !calibrate && scvMode === 'side' && (
          <SimpleCommandView
            tokens={tokens}
            shown
            onToggleShown={() => {}}
            activeToken={activeToken}
            onShowRules={showActionRules}
            variant="side"
          />
        )}
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
                title={calibrate ? c.label : counterTooltip(bot, c, state.era)}
                onClick={
                  tappable
                    ? (e) => {
                        setTappedRect(e.currentTarget.getBoundingClientRect());
                        setTappedBadge((k) => (k === c.key ? null : c.key));
                      }
                    : undefined
                }
              >
                {calibrate ? (sel ? '◎' : '·') : count}
                {open && c.key === 'breakthrough' && (
                  <BadgePopover rect={tappedRect} variant="bt">
                    {SHAPE_ORDER.map((s) => (
                      <span key={s} className="bt-pop-row">
                        <ShapeIcon shape={s} size={22} />
                        <b>{bot.breakthroughs[s]}</b>
                      </span>
                    ))}
                  </BadgePopover>
                )}
                {open && c.key !== 'breakthrough' && (
                  <BadgePopover rect={tappedRect} variant="text">
                    {counterTooltip(bot, c, state.era)}
                  </BadgePopover>
                )}
              </div>
            );
          })}

          {/* Bot-placement overlay art — covers the real board spot when the bot
              owns > 0 of a type (buildings, resources, workers, etc.). */}
          <BotOverlayLayer
            overlays={CHRONOBOT_OVERLAYS}
            count={(k) => counterValue(bot, k)}
            positions={positions}
            widths={overlayWidths}
            curves={overlayCurves}
            calibrate={calibrate}
            selected={selected}
            onSelect={setSelected}
          />

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

          {simpleView && !calibrate && scvMode === 'overlay' && (
            <SimpleCommandView
              tokens={tokens}
              shown={simpleViewShown}
              onToggleShown={() => setSimpleViewShown((v) => !v)}
              activeToken={activeToken}
              onShowRules={showActionRules}
            />
          )}

          {scvMode !== 'below' && renderDetailPanel(false)}
        </div>
        {simpleView && !calibrate && scvMode === 'below' && (
          <SimpleCommandView
            tokens={tokens}
            shown
            onToggleShown={() => {}}
            activeToken={activeToken}
            onShowRules={showActionRules}
            variant="below"
          />
        )}
        {showHistory && (
          <HistoryPane entries={undoStack} onClose={() => setShowHistory(false)} />
        )}
      </div>
  );

  const modals = (
    <>
      <RulesFrame
        open={modeRules}
        onBack={() => setModeRules(false)}
        onHome={onHome}
        settings={
          <SettingsMenu
            debug={debug}
            onToggleDebug={toggleDebug}
            outline={outline}
            onToggleOutline={() => setOutline((o) => !o)}
            calibrate={calibrate}
            onToggleCalibrate={() => {
              setTappedBadge(null);
              setCalibrate((c) => !c);
            }}
            onReset={reset}
            historyOpen={showHistory}
            onToggleHistory={() => setShowHistory((v) => !v)}
            simpleView={simpleView}
            onToggleSimpleView={() => setSimpleView((v) => !v)}
          />
        }
      />

      {!calibrate && showStatus && (
        <TurnBarOverview
          botName="Chronobot"
          era={state.era}
          phaseNumber={PHASE_NUMBER[state.phase] ?? '—'}
          actionsThisEra={bot.actionsThisEra}
          minActions={Chronobot.chronobotMinActions(state)}
          hint={
            passMsg ??
            describeDecision(
              Chronobot.botPassDecision(state),
              Chronobot.chronobotMinActions(state),
            )
          }
          canEnd={Chronobot.actionRoundsCanEnd(state)}
          turnRules={PHASE_META.actions?.rules}
          difficulty={state.config.difficulty.map((f) => DIFFICULTY_LABEL[f] ?? f)}
          entries={undoStack.filter(
            (e) => e.snap.state.era === state.era && !e.label.includes('You passed'),
          )}
          passingRule={PASSING_RULE}
          onClose={() => setShowStatus(false)}
        />
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
          overlayWidths={overlayWidths}
          onOverlayWidth={(key, w) =>
            setOverlayWidths((m) => ({ ...m, [key]: w }))
          }
          overlayCurves={overlayCurves}
          onOverlayCurve={(key, c) =>
            setOverlayCurves((m) => ({ ...m, [key]: c }))
          }
        />
      )}

      {showFirstPlayer && (
        <FirstPlayerPrompt
          onAnswer={answerFirstPlayer}
          onCancel={() => setShowFirstPlayer(false)}
        />
      )}
    </>
  );

  // Pre-game: Start → Difficulty → Setup.
  if (state.phase === 'setup') {
    return (
      <div className="explorer">
        {debugBar}
        <SetupFlow onHome={onHome} onBegin={beginWithDifficulty} />
        {modals}
      </div>
    );
  }

  // End Game: the final score screen (reached after the last Era's Clean Up).
  if (state.phase === 'endgame') {
    return (
      <div className="explorer">
        {debugBar}
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
        {debugBar}
        <PhaseScreen
          era={state.era}
          phaseNumber={meta.number}
          phaseName={meta.name}
          overview={meta.overview}
          onHome={onHome}
          headerRight={
            <>
              <VpPill bot={bot} />
              <RulesButton onClick={() => setModeRules(true)} />
            </>
          }
          statusView={boardStage}
        >
          {state.phase === 'warp' ? (
            <WarpPhaseBody state={state} meta={meta} onCommit={commitWarp} />
          ) : state.phase === 'paradox' ? (
            <ParadoxPhaseBody
              state={state}
              bot={state.chronobot}
              meta={meta}
              onRoll={rollBotParadox}
              onAdvance={advancePhase}
            />
          ) : state.phase === 'cleanup' ? (
            <CleanUpPhaseBody
              state={state}
              meta={meta}
              onNextEra={
                state.era === 5 || state.era === 6
                  ? () => setShowFirstPlayer(true)
                  : startNextEraNow
              }
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
      {debugBar}
      {boardStage}
      {isActionsPhase &&
        !calibrate &&
        bot.actionsThisEra === 0 &&
        !bot.passed &&
        !state.playerPassed &&
        actionsIntroEra !== state.era && (
          <ReadyToBegin
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
          <button className="phase-primary" onClick={endActions}>
            Continue to Clean Up ▶
          </button>
        </div>
      )}
      {modals}
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
          Finish &amp; Score ▶
        </button>
      ) : postImpact ? (
        <div className="place-prompt">
          <p className="pp-instruct">
            Are all Collapsing Capital tiles flipped? If so, the game has ended — choose
            below.
          </p>
          <div className="pp-buttons">
            <button className="pp-confirm" onClick={onNextEra}>
              Game continues — start Era {era + 1} ▶
            </button>
            <button className="pp-cannot" onClick={onEndGame}>
              Game Ended — Finish &amp; Score
            </button>
          </div>
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
export function WarpPhaseBody({
  state,
  meta,
  onCommit,
  botName = 'Chronobot',
  warpTileSrc = '/assets/solo/warp-tile.png',
  roll,
  onRoll,
  followUp,
  intro,
  extraRules,
}: {
  state: GameState;
  meta: PhaseMeta;
  onCommit: (paradoxes: number) => void;
  /** Bot name shown in the copy (defaults to the Chronobot). */
  botName?: string;
  /** The bot's Warp-tile art (placed on the Main board), shown next to the roll. */
  warpTileSrc?: string;
  /**
   * An extra step rendered in place of the "Continue" button once the roll is shown —
   * Alternate Timelines' positive-space question. Keeping it here rather than on its own
   * screen leaves the roll result and rules text above it for context.
   */
  followUp?: ReactNode;
  /**
   * Optional controlled roll: when `onRoll` is provided the rolled value lives in the
   * parent (persisted across Undo, so backing to this phase re-shows the same roll —
   * #10). Otherwise the roll is held in local state (the Chronobot's current behavior).
   */
  roll?: number | null;
  onRoll?: () => void;
  /**
   * Replaces the default "Warping occurs in player order" note. Alternate Timelines
   * overrides that order (Solo Opponents p.18 — you decide your own Warp first, THEN
   * roll), so the module supplies its own instruction rather than leaving a contradicting
   * one on screen.
   */
  intro?: ReactNode;
  /** An extra verbatim rules box, rendered under the phase's own. */
  extraRules?: ReactNode;
}) {
  const [localRolled, setLocalRolled] = useState<number | null>(null);
  const controlled = onRoll != null;
  const rolled = controlled ? (roll ?? null) : localRolled;
  const doRoll = controlled ? onRoll! : () => setLocalRolled(rollParadoxDie());
  const botFirst = state.firstPlayer === 'bot';
  return (
    <>
      {intro ?? (
        <p className="phase-note">
          Warping occurs in player order.{' '}
          {botFirst
            ? `The ${botName} is First Player this Era, so it Warps first — roll for it below, then place your own 0–2 Warp tiles as normal.`
            : `You are First Player this Era, so place your own 0–2 Warp tiles first, then roll for the ${botName}.`}
        </p>
      )}

      {rolled == null ? (
        <button className="phase-primary" onClick={doRoll}>
          Roll for the {botName}'s Warp
        </button>
      ) : (
        <>
          <div className="warp-roll-result">
            <span className="warp-roll-num">{rolled}</span>
            {rolled > 0 && (
              <img className="warp-roll-tile" src={warpTileSrc} alt={`${botName} Warp tile`} />
            )}
            <p className="phase-note">
              {rolled === 0
                ? `The ${botName} rolled no Paradoxes — it places no Warp tiles this phase.`
                : `The ${botName} rolled ${rolled} Paradox${rolled > 1 ? 'es' : ''} — place ${rolled} Warp tile${rolled > 1 ? 's' : ''} for it on the current Timeline tile. Any tiles will do; the ${botName} gains nothing from them.`}
            </p>
          </div>
          {followUp ?? (
            <button className="phase-primary" onClick={() => onCommit(rolled)}>
              Continue ▶
            </button>
          )}
        </>
      )}

      {/* Verbatim rules last, same as the Paradox screen: reference material sits under
          what the player has to act on. */}
      {meta.rules && (
        <RulesBox label={`${meta.name} — rulebook text`}>
          <p>{meta.rules}</p>
        </RulesBox>
      )}
      {extraRules}
    </>
  );
}

/**
 * Phase 2 (Paradox) body. The Chronobot checks each past Timeline tile (up to
 * Era − 1 of them): on any where it has the most (or tied-most) Warp tiles it
 * rolls the Paradox die — answering "yes" rolls immediately, no separate button.
 * It stops early if it gains an Anomaly or has no Warp tiles left on the Timeline.
 */
/** Tracker-chip art for the Paradox phase. The Anomaly and Hypersync tiles are the
 *  same pieces for both bots; only the Warp tile has a per-bot face. */
export const PARADOX_ICONS = {
  paradox: '/assets/solo/paradox.png',
  anomaly: '/assets/solo/chronossus/anomaly.png',
  warp: '/assets/solo/warp-tile.png',
  hypersync: '/assets/solo/chronossus/hypersync-solo-tile.png',
};

export function ParadoxPhaseBody({
  state,
  bot,
  meta,
  onRoll,
  onAdvance,
  botName = 'Chronobot',
  hypersyncTiles,
  pendingRoll,
  followUp,
  icons = PARADOX_ICONS,
}: {
  state: GameState;
  /** The active bot's slice fields the Paradox phase reads (shared shape). */
  bot: { warpTilesOnTimeline: number; paradoxes: number; anomalies: number };
  meta: PhaseMeta;
  onRoll: (rolled: number) => { instructions: Instruction[]; stop: boolean };
  onAdvance: () => void;
  /** Bot name shown in the copy (defaults to the Chronobot). */
  botName?: string;
  /**
   * Hypersync mode only: the bot's total Solo Hypersync tiles in play. When set,
   * two Future-Imperfect rules apply (rulebook p.5): a Hypersync tile counts as a
   * Warp tile for the per-Timeline-tile majority, and after the Warp checks the
   * player(s) with the most TOTAL Hypersync tiles make one more Paradox roll
   * (unless they gained an Anomaly this phase). Undefined = not Hypersync mode.
   */
  hypersyncTiles?: number;
  /**
   * Optional reusable roll (restored from an undone Paradox-roll entry): when set, the
   * NEXT roll reuses this value instead of re-randomizing, so backing to the phase can't
   * fish for a different result (#10). Consumed once per commit by the parent.
   */
  pendingRoll?: number | null;
  /**
   * A step that must be resolved before rolling continues — Variable Anomalies' "which
   * tile did it take?" question. Rendered under the roll log in place of the roll/continue
   * controls, so the roll that triggered it stays on screen for context.
   */
  followUp?: ReactNode;
  /** Per-bot art for the tracker chips (the Chronossus has its own Warp-tile face). */
  icons?: typeof PARADOX_ICONS;
}) {
  const [asked, setAsked] = useState(0);
  const [stopped, setStopped] = useState(false);
  // The player clicked "No / Done" — the bot no longer leads or ties any tile.
  const [finished, setFinished] = useState(false);
  const [rolls, setRolls] = useState<{ n: number; text: string }[]>([]);
  // Hypersync extra-roll step: resolved once (rolled or skipped) after the Warp checks.
  const [hsAsked, setHsAsked] = useState(false);

  // Possible rolls are capped at the smaller of (Era − 1) and the bot's Warp tiles on
  // the Timeline: it can only lead/tie a tile that has a Warp tile on it (#8).
  const maxChecks = Math.max(0, Math.min(state.era - 1, bot.warpTilesOnTimeline));
  const noWarp = bot.warpTilesOnTimeline === 0;
  const done = stopped || noWarp || finished || asked >= maxChecks;

  // A roll's log line: the result text PLUS its detail (e.g. the "remove one Warp
  // tile from the tile where it has the most (oldest if tied)" instruction on an
  // Anomaly) so the player is actually told to remove the tile.
  const rollLine = (res: { instructions: Instruction[] }) => {
    const ins = res.instructions[0];
    return ins ? `${ins.text}${ins.detail ? ' ' + ins.detail : ''}` : '';
  };

  const answerYes = () => {
    const n = pendingRoll ?? rollParadoxDie();
    const res = onRoll(n);
    setRolls((r) => [...r, { n, text: rollLine(res) }]);
    setAsked((a) => a + 1);
    if (res.stop) setStopped(true);
  };
  const answerNo = () => setFinished(true);

  // Hypersync extra roll: offered once the Warp checks are done, only if the bot
  // has ≥1 Hypersync tile and did NOT gain an Anomaly this phase (rulebook p.5).
  const hypersyncEligible = hypersyncTiles != null && hypersyncTiles > 0 && !stopped;
  const hsAnswerYes = () => {
    const n = pendingRoll ?? rollParadoxDie();
    const res = onRoll(n);
    setRolls((r) => [...r, { n, text: rollLine(res) }]);
    setHsAsked(true);
    if (res.stop) setStopped(true);
  };
  const hsAnswerNo = () => setHsAsked(true);

  // Screen order: what the phase is -> what just happened -> what you must answer ->
  // supplementary trackers and verbatim rules. Everything the player acts on sits above
  // the reference material they only consult to double-check.
  return (
    <>
      <p className="phase-note">
        The {botName} rolls for Paradoxes on each past Timeline tile where it has the
        most (or tied-most) Warp tiles. It keeps checking until it gains an Anomaly.
      </p>
      {hypersyncTiles != null && (
        <p className="phase-note">
          <b>Hypersync:</b> a Hypersync tile counts as a Warp tile when deciding who has
          the most Warp tiles on a Timeline tile — but a tile with <b>zero</b> Warp tiles
          never rolls, even with a Hypersync tile present.
        </p>
      )}

      {rolls.length > 0 && (
        <div className="paradox-log">
          {rolls.map((r, i) => (
            <div key={i} className="warp-roll-result">
              <span className="warp-roll-num">{r.n}</span>
              {/* Blank rolls show no symbol, same as a 0 Warp roll shows no tile. */}
              {r.n > 0 && (
                <img className="warp-roll-tile" src={icons.paradox} alt="Paradox" />
              )}
              <p className="phase-note">{r.text}</p>
            </div>
          ))}
        </div>
      )}

      {followUp ? (
        followUp
      ) : !done ? (
        <div className="place-prompt">
          <p className="pp-instruct">
            Does the {botName} still have the most (or tied-most) Warp tiles on a past
            Timeline tile{hypersyncTiles != null ? ' (Hypersync tiles count)' : ''}? Keep
            rolling for each such tile.
          </p>
          {maxChecks > 0 && (
            <p className="pp-sub">
              {asked} of up to {maxChecks} roll{maxChecks === 1 ? '' : 's'} this phase.
            </p>
          )}
          <div className="pp-buttons">
            <button className="pp-confirm" onClick={answerYes}>
              Yes — it ties or leads (roll)
            </button>
            <button className="pp-cannot" onClick={answerNo}>
              No — done
            </button>
          </div>
        </div>
      ) : hypersyncEligible && !hsAsked ? (
        <div className="place-prompt">
          <p className="pp-instruct">
            <b>Hypersync — extra Paradox roll.</b> The player(s) with the most total
            Hypersync tiles in play make one more Paradox roll. Does the {botName} have
            the most (or tied-most) total Hypersync tiles in play (it has{' '}
            <b>{hypersyncTiles}</b>)?
          </p>
          <div className="pp-buttons">
            <button className="pp-confirm" onClick={hsAnswerYes}>
              Yes — it ties or leads (roll)
            </button>
            <button className="pp-cannot" onClick={hsAnswerNo}>
              No
            </button>
          </div>
        </div>
      ) : (
        <>
          {noWarp && asked === 0 && (
            <p className="phase-note">
              The {botName} has no Warp tiles on the Timeline
              {hypersyncTiles != null ? ' — its Warp-tile Paradox checks are skipped' : ' — it rolls no Paradoxes this phase'}.
            </p>
          )}
          <button className="phase-primary" onClick={onAdvance}>
            Continue to Power Up ▶
          </button>
        </>
      )}

      {/* Supplementary: the same counts the copy above already states, as a double-check
          against the physical board. */}
      <div className="paradox-status">
        <span>
          <img src={icons.paradox} alt="" />
          <span>
            Paradoxes <b>{bot.paradoxes}</b>/3
          </span>
        </span>
        <span>
          <img src={icons.anomaly} alt="" />
          <span>
            Anomalies <b>{bot.anomalies}</b>/3
          </span>
        </span>
        <span>
          <img src={icons.warp} alt="" />
          <span>
            Warp tiles <b>{bot.warpTilesOnTimeline}</b>
          </span>
        </span>
        {hypersyncTiles != null && (
          <span>
            <img src={icons.hypersync} alt="" />
            <span>
              Hypersync <b>{hypersyncTiles}</b>
            </span>
          </span>
        )}
      </div>

      {meta.rules && (
        <RulesBox label={`${meta.name} — rulebook text`}>
          <p>{meta.rules}</p>
        </RulesBox>
      )}

      {/* The two Hypersync Paradox rules live in the Future Imperfect rulebook, not the
          Solo Opponents one (which carries them over wholesale, p.17: "All of the
          Hypersync Future Actions module and Chronossus base rules apply, unless noted
          below" — and its notes never touch the Paradox Phase). Verbatim so the player
          can check the majority + extra-roll prompts against the source. */}
      {hypersyncTiles != null && (
        <RulesBox label="Hypersync in the Paradox Phase — rulebook text">
          <p>
            During the Paradox Phase, the presence of a Hypersync tile counts as a Warp
            tile when checking for most Warp tiles per Timeline tile. Therefore, if a
            player has two Warp tiles on a Timeline tile, while another has a single Warp
            tile and a Hypersync tile, they both roll for Paradox.
          </p>
          <p>
            <b>IMPORTANT:</b> Just like in the base game, players that have zero Warp
            tiles on a Timeline tile do not roll for a Paradox, even if they have a
            Hypersync tile present.
          </p>
          <p>
            Additionally, the player (or players) with the most total Hypersync tiles
            (across all Timeline tiles) in play make one more Paradox roll, unless they
            have already received an Anomaly during the current Paradox Phase. (If no
            player has any Hypersync tiles in play, this roll is skipped.)
          </p>
          <p className="rules-cite">Future Imperfect rulebook, p. 5</p>
        </RulesBox>
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
  const { user } = useAuth();
  const [mode, setMode] = useState<'number' | 'tally'>('number');
  const [num, setNum] = useState('');
  const [tally, setTally] = useState<Record<string, number>>({});
  // Tally mode always sums to a number (0 to start), so don't treat it as a
  // finished score until the player clicks Done — otherwise it auto-saves 0.
  const [tallyDone, setTallyDone] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const tallyTotal = TALLY_FIELDS.reduce((sum, f) => {
    const v = (tally[f.key] ?? 0) * f.mult;
    return sum + (f.sub ? -v : v);
  }, 0);
  const playerScore =
    mode === 'number'
      ? num.trim() === ''
        ? null
        : Number(num)
      : tallyDone
        ? tallyTotal
        : null;
  const result =
    playerScore == null || Number.isNaN(playerScore)
      ? null
      : playerScore > s.total
        ? 'win'
        : 'lose';

  const difficultyFlags = state.config.difficulty ?? [];
  // Human-readable adjustments — used as the History difficulty column and as
  // the BG Stats play notes. "Base" when no modifiers are configured.
  const difficultyLabel =
    difficultyFlags.length === 0
      ? 'Base'
      : difficultyFlags.map((f) => DIFFICULTY_LABEL[f] ?? f).join('; ');

  const saveGame = async () => {
    if (result == null || playerScore == null) return;
    setSaveState('saving');
    try {
      await recordGame({
        won: result === 'win',
        bot_score: s.total,
        player_score: playerScore,
        difficulty: difficultyLabel,
        era_reached: state.era,
        payload: {
          breakdown: s,
          botTurns: bot.totalActions,
          difficultyFlags,
        },
      });
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  };

  // Auto-save once a completed game has a player score (number or tally). No
  // button: the first stable score is recorded automatically for logged-in
  // players. Debounced so typing doesn't fire mid-entry; saves once per game.
  useEffect(() => {
    if (!user || result == null || playerScore == null || Number.isNaN(playerScore)) return;
    if (saveState !== 'idle') return;
    const id = setTimeout(() => saveGame(), 900);
    return () => clearTimeout(id);
    // saveGame reads the latest score via closure; gate on saveState to save once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, result, playerScore, saveState]);

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
          <ScoreBreakdown score={s} botTurns={bot.totalActions} />
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
                  <div key={f.key} className="tally-row">
                    <span>{f.label}</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={tally[f.key] ?? ''}
                      onChange={(e) =>
                        setTally((t) => {
                          const next = { ...t };
                          if (e.target.value === '') delete next[f.key];
                          else next[f.key] = Number(e.target.value);
                          return next;
                        })
                      }
                    />
                    <button
                      type="button"
                      className="tally-clear"
                      aria-label={`Clear ${f.label}`}
                      title="Clear"
                      disabled={tally[f.key] == null}
                      onClick={() =>
                        setTally((t) => {
                          const next = { ...t };
                          delete next[f.key];
                          return next;
                        })
                      }
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <div className="tally-total">
                Your total: <b>{tallyTotal}</b>
              </div>
              {!tallyDone && (
                <button className="tally-done" onClick={() => setTallyDone(true)}>
                  Done — use this total
                </button>
              )}
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

        {user && saveState !== 'idle' && (
          <div className="score-save">
            {saveState === 'saving' && <span className="score-save-ok">Saving…</span>}
            {saveState === 'saved' && (
              <span className="score-save-ok">✓ Saved to your history</span>
            )}
            {saveState === 'error' && (
              <span className="score-save-err">Couldn't save automatically.</span>
            )}
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
  overlayWidths,
  onOverlayWidth,
  overlayCurves,
  onOverlayCurve,
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
  overlayWidths: Record<string, number>;
  onOverlayWidth: (key: OverlayKey, w: number) => void;
  overlayCurves: Record<string, number>;
  onOverlayCurve: (key: OverlayKey, c: number) => void;
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
  const overlayLiteral =
    'export const CHRONOBOT_OVERLAYS: BotOverlay[] = [\n' +
    OVERLAY_KEYS.map((key) => {
      const [x, y] = positions[overlayKey(key)] ?? [50, 50];
      const w = overlayWidths[key] ?? 6;
      const c = overlayCurves[key] ?? 0;
      const curve = c > 0 ? `, curve: ${c}` : '';
      return `  { key: '${key}', pos: [${x}, ${y}], width: ${w}${curve} },`;
    }).join('\n') +
    '\n];';
  const selOverlay = OVERLAY_KEYS.find((k) => overlayKey(k) === selected);
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

      <details className="cal-group">
        <summary>Bot overlays ({OVERLAY_KEYS.length})</summary>
        <p className="cal-note">
          Art that covers the real board spot; shows when the bot owns &gt; 0.
          Select a type to resize just that image.
        </p>
        {selOverlay ? (
          <>
            {sizeSlider(
              `${OVERLAY_LABEL[selOverlay]} width`,
              overlayWidths[selOverlay] ?? 6,
              (w) => onOverlayWidth(selOverlay, w),
              30,
            )}
            {sizeSlider(
              `${OVERLAY_LABEL[selOverlay]} curve`,
              overlayCurves[selOverlay] ?? 0,
              (c) => onOverlayCurve(selOverlay, c),
              50,
            )}
          </>
        ) : (
          <p className="cal-note">Pick a type below to enable its size + curve sliders.</p>
        )}
        <div className="cal-list">
          {OVERLAY_KEYS.map((key) =>
            item(
              overlayKey(key),
              OVERLAY_LABEL[key],
              positions[overlayKey(key)] ?? [50, 50],
              'overlay-item',
            ),
          )}
        </div>
        <textarea className="cal-out" readOnly value={overlayLiteral} />
      </details>
    </div>
  );
}

/**
 * The itemized Chronobot VP breakdown — every scoring avenue as a line that sums
 * to the total. Shared by the live VP popover and the End-Game score screen.
 */
function ScoreBreakdown({
  score,
  botTurns,
}: {
  score: ReturnType<typeof Chronobot.scoreChronobot>;
  /** Optional: total Actions the bot has taken (informational; not scored). */
  botTurns?: number;
}) {
  return (
    <ul className="score-breakdown">
      <li title="Everything except Buildings, Time Travel & Breakthroughs">
        <span>Token VP</span><b>{score.tokenVP}</b>
      </li>
      <li title="From Construct actions (Buildings & Superprojects)">
        <span>Building VP</span><b>{score.buildingVP}</b>
      </li>
      <li title="From the Time Travel marker's track position (0/2/4/…/12)">
        <span>Time Travel</span><b>{score.timeTravelVP}</b>
      </li>
      <li title="1 VP per Breakthrough">
        <span>Breakthroughs (1 each)</span><b>{score.breakthroughVP}</b>
      </li>
      <li title="+2 VP per complete shape set (one of each)">
        <span>Breakthrough sets (+2 each)</span><b>{score.shapeSetBonus}</b>
      </li>
      <li className={score.anomalyVP < 0 ? 'score-neg' : ''} title="−3 VP per remaining Anomaly">
        <span>Anomalies (−3 each)</span><b>{score.anomalyVP}</b>
      </li>
      <li className="score-sum"><span>Total</span><b>{score.total}</b></li>
      {botTurns != null && (
        <li className="score-turns"><span>Bot turns taken</span><b>{botTurns}</b></li>
      )}
    </ul>
  );
}

/**
 * The Chronobot's VP as a pill; clicking opens a popover score box itemizing
 * every way the bot is scoring (including the live Anomaly penalty) summing to
 * the total. The total matches the End-Game score exactly.
 */
function VpPill({ bot }: { bot: ChronobotState }) {
  const [open, setOpen] = useState(false);
  // Anchor rect of the pill, captured on open so the portaled popover (below)
  // sits right under the bar and clamps on screen — like the tracker popovers.
  const pillRef = useRef<HTMLButtonElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const score = Chronobot.scoreChronobot(bot);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest('.vp-pill-wrap') && !t.closest('.vp-popover')) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = () =>
    setOpen((o) => {
      if (!o && pillRef.current) setRect(pillRef.current.getBoundingClientRect());
      return !o;
    });

  return (
    <div className="vp-pill-wrap">
      <button
        ref={pillRef}
        type="button"
        className={`stat-pill lead vp-pill ${open ? 'open' : ''}`}
        onClick={toggle}
        title="Click for the full VP breakdown"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span className="vp-caret">{open ? '▾' : '▸'}</span>
        <span className="vp-seg">
          <b>{score.total}</b> VP
        </span>
      </button>
      {open && (
        <AnchoredPopover rect={rect} className="vp-popover">
          <div className="vp-popover-title">Chronobot VP</div>
          <ScoreBreakdown score={score} botTurns={bot.totalActions} />
        </AnchoredPopover>
      )}
    </div>
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
  actionInProgress,
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
  onOpenRules,
  simpleView,
  onToggleSimpleView,
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
  actionInProgress: boolean;
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
  onOpenRules: () => void;
  simpleView: boolean;
  onToggleSimpleView: () => void;
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
          <VpPill bot={bot} />
          {/* Primary turn controls — kept together on the top row when wrapping.
              While a bot action is in progress, hide Take Bot Action / You Pass
              (the turn is underway) and show only the rolled die. */}
          <div className="turn-core">
            {!actionInProgress && (
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
            )}
            {botDie != null && (
              <span className="bot-die" aria-label={`AI die shows ${botDie}`}>
                {botDie}
              </span>
            )}
            {!actionInProgress && (
              <button
                className="you-pass"
                onClick={onPlayerPass}
                disabled={!canPass || playerPassed}
                title="Pass for the Action Rounds phase"
              >
                {playerPassed ? '✓ You passed' : 'You Pass'}
              </button>
            )}
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
            className={`stat-pill status-chip turn-chip ${statusOpen ? 'on' : ''}`}
            onClick={onToggleStatus}
            title="Turn tracker — pass status, minimum Actions & recent bot turns"
            aria-pressed={statusOpen}
          >
            Turn <b>{bot.actionsThisEra}</b>
          </button>
        </div>
      )}
      <div className="stats-controls">
        <RulesButton onClick={onOpenRules} />
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
          simpleView={simpleView}
          onToggleSimpleView={onToggleSimpleView}
        />
      </div>
    </div>
  );
}

// Simple Command View layout, as % of the board image (calibrated by hand).
// Box: [left, top, right, bottom]; the show/hide toggle is a single [x, y] point.
const SCV_BOX: [number, number, number, number] = [1.4, 0.9, 48.8, 72.1];
const SCV_TOGGLE: [number, number] = [4.8, 3.0];

/**
 * Simple Command View — an at-a-glance overlay over the left half of the board.
 * Shows one row per occupied Action space (in board-reading order): the Command
 * token marker(s) sitting there (up to two), the space's tile image, and its
 * name. Below the grid is the verbatim rule for how the AI die moves the tokens,
 * plus the die's six faces. A show/hide toggle collapses the whole overlay.
 */
function SimpleCommandView({
  tokens,
  activeToken,
  shown,
  onToggleShown,
  onShowRules,
  variant = 'overlay',
}: {
  tokens: CommandTokensState;
  /** The token the AI die just activated, highlighted like on the board. */
  activeToken: CommandToken | null;
  shown: boolean;
  onToggleShown: () => void;
  onShowRules: (action: ChronobotActionId) => void;
  /**
   * 'overlay' floats on the board (desktop, tight width); 'side' docks left of
   * the board when there's room; 'below' is a static block (mobile).
   */
  variant?: 'overlay' | 'side' | 'below';
}) {
  const rows: {
    path: PathId;
    index: number;
    stack: CommandToken[];
    action: ChronobotActionId;
  }[] = [];
  (['short', 'long'] as const).forEach((path) => {
    Chronobot.CHRONOBOT_PATHS[path].forEach((_, index) => {
      const stack = Chronobot.tokensAtPosition(tokens, path, index);
      if (stack.length === 0) return;
      rows.push({ path, index, stack, action: Chronobot.tokenAction({ path, index }) });
    });
  });

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  const content = (
    <>
      <div className="scv-title">What Chronobot might do next</div>
      <div className="scv-grid">
        {rows.map((r) => (
          <button
            type="button"
            className={`scv-row ${
              activeToken != null && r.stack.includes(activeToken) ? 'active-row' : ''
            }`}
            key={`${r.path}-${r.index}`}
            onClick={() => onShowRules(r.action)}
            title={`Show the ${CHRONOBOT_ACTIONS[r.action].label} rules`}
          >
            <div className="scv-markers">
              {r.stack.map((tk) => (
                <img
                  key={tk}
                  src={COMMAND_MARKER_IMG[tk]}
                  alt={`Command token ${tk}`}
                  className={`scv-marker ${activeToken === tk ? 'active' : ''}`}
                />
              ))}
            </div>
            <div className="scv-icon">
              <ActionIcon action={r.action} size={58} />
            </div>
            <div className="scv-name">{CHRONOBOT_ACTIONS[r.action].label}</div>
          </button>
        ))}
      </div>
      <div className="scv-die">
        <span className="scv-die-label">AI die faces</span>
        <div className="scv-die-faces">
          {AI_DIE_FACES.map((f, i) => (
            <span key={i} className="scv-die-face">
              {f}
            </span>
          ))}
        </div>
      </div>
      <RulesBox label="How the AI die moves the tokens">
        <p>{PHASE_META.actions?.rules}</p>
      </RulesBox>
    </>
  );

  // Non-overlay variants are static blocks with no floating toggle: 'side' docks
  // left of the board, 'below' stacks under it (mobile).
  if (variant !== 'overlay') {
    return <div className={variant === 'side' ? 'scv-side' : 'scv-below'}>{content}</div>;
  }

  return (
    <>
      <button
        className={`scv-toggle ${shown ? 'shown' : ''}`}
        style={{ left: `${SCV_TOGGLE[0]}%`, top: `${SCV_TOGGLE[1]}%` }}
        onClick={(e) => {
          stop(e);
          onToggleShown();
        }}
        title={`Simple Command View — click to ${shown ? 'hide' : 'show'}`}
        aria-label={`Simple Command View — click to ${shown ? 'hide' : 'show'}`}
      >
        {shown ? '◂ Hide' : '▸ Show'}
      </button>
      {shown && (
        <div
          className="scv-overlay"
          style={{
            left: `${SCV_BOX[0]}%`,
            top: `${SCV_BOX[1]}%`,
            width: `${SCV_BOX[2] - SCV_BOX[0]}%`,
            height: `${SCV_BOX[3] - SCV_BOX[1]}%`,
          }}
          onClick={stop}
        >
          {content}
        </div>
      )}
    </>
  );
}

/** Top-right ⚙ menu: play/debug, dev toggles (in debug), and Reset Game.
 *  Shared by both solo-bot views so the menu items/behavior stay identical. */
export function SettingsMenu({
  debug,
  onToggleDebug,
  outline,
  onToggleOutline,
  calibrate,
  onToggleCalibrate,
  onReset,
  historyOpen,
  onToggleHistory,
  simpleView,
  onToggleSimpleView,
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
  simpleView: boolean;
  onToggleSimpleView: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [showMyHistory, setShowMyHistory] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
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
          <button
            className={`settings-item cmd-view ${simpleView ? 'active' : ''}`}
            onClick={onToggleSimpleView}
            role="menuitemcheckbox"
            aria-checked={simpleView}
          >
            <img
              className="settings-cmd-icon"
              src="/assets/solo/commands/marker-3.png"
              alt=""
              aria-hidden="true"
            />
            Command View
          </button>
          {/* Debug mode is admin-only to turn ON, but always offer to turn it OFF
              (so it can never get stuck on). Its dev sub-toggles are debug-only. */}
          {(user?.isAdmin || debug) && (
            <>
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
            </>
          )}
          <div className="settings-sep" />
          <button className="settings-item danger" onClick={onReset} role="menuitem">
            ⟳ Reset Game
          </button>
          <div className="settings-sep" />
          {user && (
            <>
              <button
                className="settings-item"
                onClick={() => {
                  setShowMyHistory(true);
                  setOpen(false);
                }}
                role="menuitem"
              >
                🗄 My history
              </button>
              {user.isAdmin && (
                <button
                  className="settings-item"
                  onClick={() => {
                    setShowAdmin(true);
                    setOpen(false);
                  }}
                  role="menuitem"
                >
                  📊 Overall stats
                </button>
              )}
            </>
          )}
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
              👤 Log in
            </button>
          )}
        </div>
      )}
      {showMyHistory && <HistoryScreen onClose={() => setShowMyHistory(false)} />}
      {showAdmin && <AdminStats onClose={() => setShowAdmin(false)} />}
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

export function DetailPanel({
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
  onGuardianSpace = () => {},
  fractures = false,
  blinkCheck = false,
  placementHandled = false,
  blink,
  fluxDrawSrc = null,
  placeDestination = null,
  onWorldCouncilYes = () => {},
  onWorldCouncilNo = () => {},
  onConfirmBlink = () => {},
  onFluxCasingContinue = () => {},
  onMineHasSpace,
  onMineNoSpace,
  onGeniusYes,
  onGeniusNo,
  onPickVP,
  onToggleResource,
  onPickWorker,
  onStartTurn,
  onClose,
  flow = false,
  botName = 'Chronobot',
  startLabel = '▶ Start Your Turn',
  researchNewShape = false,
  figure = 'exosuit',
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
  /** Guardians: the player confirmed the Guardian went on its Guardian board space. */
  onGuardianSpace?: () => void;
  /** Fractures of Time: splits the placement gate and enables the Blink steps. */
  fractures?: boolean;
  /**
   * Fractures: a Blink check will run once this space is confirmed (the Flux Pool holds a
   * Core AND a Blink-ready Exosuit exists). Then the gate only ASKS — what to do comes
   * after the draw. When no check can happen there is nothing to wait for, so the gate
   * instructs the placement directly, exactly like a base-game Action.
   */
  blinkCheck?: boolean;
  /**
   * Fractures: the Blink check already ran this turn, so the Blink / Empty-Flux-Casing
   * panel has told the player what to move or place. A later step that would otherwise
   * repeat "place the Exosuit …" drops that clause.
   */
  placementHandled?: boolean;
  /**
   * Fractures: the space the placement/Blink actually settled on — the printed Action
   * space or World Council. Named by the caller because only it knows which gate answer
   * came back; without it a Blink into World Council would read "to Construct".
   */
  placeDestination?: string | null;
  /** Fractures: the Blink the app just resolved, when `pending` is 'blink'. */
  blink?: {
    spaceLabel: string;
    sameSpaceCount: number;
    rule: 'command-token' | 'bottom-left';
    token?: number;
  } | null;
  /** Art for the token the Blink check just drew (Flux Core or Empty Flux Casing). */
  fluxDrawSrc?: string | null;
  onWorldCouncilYes?: () => void;
  onWorldCouncilNo?: () => void;
  onConfirmBlink?: () => void;
  onFluxCasingContinue?: () => void;
  onMineHasSpace: () => void;
  onMineNoSpace: () => void;
  onGeniusYes: () => void;
  onGeniusNo: () => void;
  onPickVP: (vp: number) => void;
  onToggleResource: (r: Resource) => void;
  onPickWorker: (w: Worker) => void;
  onStartTurn: () => void;
  onClose: () => void;
  /** Render in normal flow (mobile) rather than absolutely on the board. */
  flow?: boolean;
  /** Bot name shown in the instruction copy (defaults to the Chronobot). */
  botName?: string;
  /** Commit-button label — set to "Advance to Autoleap Action" when the marker's next
   *  step lands on an Autoleap tile (Chronossus). Defaults to "▶ Start Your Turn". */
  startLabel?: string;
  /** Chronossus "Research takes a new Breakthrough shape" difficulty: the rolled shape
   *  was forced to one the bot doesn't already have (or has the fewest of), not a free
   *  roll. Changes the Research step's copy; no-op (default) for the Chronobot. */
  researchNewShape?: boolean;
  /**
   * Guardians (Chronossus): which figure the bot would place next. It places Guardians
   * LAST, so once its own Exosuits are gone the instruction has to name the Guardian —
   * the engine has already decided, and the player is looking for a different miniature.
   * Defaults to 'exosuit' (every other mode and the Chronobot).
   */
  figure?: 'exosuit' | 'guardian';
}) {
  const def = CHRONOBOT_ACTIONS[hotspot.action];
  /** What to call the piece being placed — a Guardian is an Exosuit type of its own. */
  const figureLabel = figure === 'guardian' ? 'Guardian' : 'Exosuit';
  const [l, t, w, h] = hotspot.panel ?? DEFAULT_PANEL;
  const [showMech, setShowMech] = useState(false);
  // In play mode the rule opens expanded (mech placement stays collapsed).
  const [showRule, setShowRule] = useState(readOnly);
  const toggleMech = () => setShowMech((s) => !s);
  const toggleRule = () => setShowRule((s) => !s);

  // Swap the bot's name into any displayed rulebook/verbatim text when this is
  // not the Chronobot (no-op for the default). Keeps the rule copy on-theme.
  const sub = (s: string) => (botName === 'Chronobot' ? s : s.replace(/Chronobot/g, botName));
  const paragraphs = def.rule.split('\n\n').map(sub);
  const buildingLabel = def.label.replace('Construct — ', '');
  const isSuperproject = hotspot.action === 'construct-superproject';
  const ruleLabel = hotspot.action.startsWith('construct')
    ? 'Construct rules'
    : `${def.label} rules`;
  const failedInstr = result.find((ins) => /fail/i.test(ins.id));

  return (
    <div
      className={`detail-panel ${flow ? 'dp-flow' : ''}`}
      style={
        flow
          ? undefined
          : { left: `${l}%`, top: `${t}%`, width: `${w}%`, height: `${h}%` }
      }
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
        {hotspot.note && <p className="dp-note">{sub(hotspot.note)}</p>}


        {/* Step 1 — placement gate for any mech-placing action. Fractures asks it as two
            questions, because Blink selection has to know whether the Exosuit ended up on
            the printed Action space or overflowed to World Council. */}
        {pending === 'mech' && (
          <div className="place-prompt">
            <p className="pp-instruct">
              {fractures ? (
                <>
                  Is a <b>{spaceLabel(hotspot.action)}</b> Action space open (not World
                  Council)?
                  {!blinkCheck && (
                    <> Place the {botName}’s {figureLabel} on the topmost one.</>
                  )}
                </>
              ) : (
                <>
                  Place the {botName}’s {figureLabel} on the topmost available{' '}
                  <b>{spaceLabel(hotspot.action)}</b> Action space (or a World Council
                  space if none are free).
                </>
              )}
            </p>
            {fractures && (
              <p className="pp-sub">
                {blinkCheck
                  ? `Don’t place anything yet — the ${botName} Blink-checks first, and a Blink moves an Exosuit it already has on the board instead.`
                  : 'Put an Energy Core from the supply into that Exosuit. (No Blink is possible, so it places as usual.)'}
              </p>
            )}
            <div className="pp-buttons">
              <button className="pp-confirm" onClick={onConfirmPlace}>
                {!fractures
                  ? '✓ Confirm placed'
                  : blinkCheck
                    ? '✓ Yes — check for Blink'
                    : '✓ Yes — placed there'}
              </button>
              <button className="pp-cannot" onClick={onCannotPlace}>
                {fractures ? '✗ No — none open' : '✗ Cannot place'}
              </button>
            </div>
          </div>
        )}

        {/* Guardians — no space anywhere, so it uses a Guardian's own board space. The
            Action still happens (not a Failed Action), so its normal steps follow. */}
        {pending === 'guardianSpace' && (
          <div className="place-prompt">
            <p className="pp-instruct">
              No Action space was open, so the {botName} places a <b>Guardian</b> on the{' '}
              <b>Guardian board</b>, on an open space marked with one of its{' '}
              <b>Path markers</b> — and performs the Action from there.
            </p>
            <p className="pp-sub">
              It doesn’t matter which of its marked spaces you use. This is <b>not</b> a
              Failed Action, so it takes no +1 VP.
            </p>
            <div className="pp-buttons">
              <button className="pp-confirm" onClick={onGuardianSpace}>
                ✓ Placed on the Guardian board
              </button>
            </div>
          </div>
        )}

        {/* Step 1b (Fractures) — the World Council overflow question. */}
        {pending === 'worldCouncil' && (
          <div className="place-prompt">
            <p className="pp-instruct">
              No <b>{spaceLabel(hotspot.action)}</b> space was open. Is the{' '}
              <b>World Council</b> space open?
              {!blinkCheck && <> Place the {botName}’s {figureLabel} there instead.</>}
            </p>
            <p className="pp-sub">
              It still performs the Action from there.{' '}
              {blinkCheck
                ? 'Nothing to place yet — the Blink check comes first.'
                : 'Put an Energy Core from the supply into that Exosuit.'}
            </p>
            <div className="pp-buttons">
              <button className="pp-confirm" onClick={onWorldCouncilYes}>
                {blinkCheck ? '✓ Yes — check for Blink' : '✓ Yes — placed on World Council'}
              </button>
              <button className="pp-cannot" onClick={onWorldCouncilNo}>
                ✗ No — nothing open
              </button>
            </div>
          </div>
        )}

        {/* Fractures — the Blink check's two outcomes (shared with the tile dialog). */}
        {pending === 'blink' && blink && (
          <BlinkPanel
            blink={blink}
            fluxDrawSrc={fluxDrawSrc}
            destination={placeDestination ?? spaceLabel(hotspot.action)}
            onConfirm={onConfirmBlink}
          />
        )}
        {pending === 'fluxCasing' && (
          <PlaceExosuitPanel
            destination={placeDestination ?? spaceLabel(hotspot.action)}
            fluxDrawSrc={fluxDrawSrc}
            drewCasing
            onContinue={onFluxCasingContinue}
          />
        )}


        {/* Step 2 — Construct: take the higher-VP building, enter its printed VP. */}
        {pending === 'buildingVP' && (
          <div className="place-prompt">
            <p className="pp-instruct">
              {isSuperproject ? (
                <>
                  Take the <b>highest-VP Superproject</b> (oldest if tied). Tap its
                  printed VP (3–8).
                </>
              ) : (
                <>
                  Take the higher-VP <b>{buildingLabel}</b> (secondary stack if
                  tied). Tap its printed VP (1–4) — then discard it.
                </>
              )}
            </p>
            <div className="vp-digits">
              {(isSuperproject ? [3, 4, 5, 6, 7, 8] : [1, 2, 3, 4]).map((n) => (
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
                {startLabel}
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
              {blinkCheck ? 'Find the' : `Place the ${botName}’s Exosuit in an`} open{' '}
              <b>Mine</b> space granting the best 2 Resources by priority order below, based
              on lacking-first. Give it those <b>2 Resources</b> (pre-selected; adjust to
              match the space — click a cube twice for <b>×2</b>), then{' '}
              <b>discard those 2 Resource cubes from the board</b>.
            </p>
            {/* A Mine space is a Blink destination too, and which Mine space it is depends
                on the Resources — so the check runs after they're picked, not before. */}
            {blinkCheck && (
              <p className="pp-sub">
                Don’t place anything yet — the {botName} Blink-checks first, and a Blink
                moves an Exosuit it already has on the board into that space instead.
              </p>
            )}
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
                {blinkCheck ? '✓ Check for Blink' : startLabel}
              </button>
            )}
          </div>
        )}

        {/* Step 2 — Recruit: pick which Worker type was recruited. */}
        {pending === 'recruitWorker' && (
          <div className="place-prompt">
            <p className="pp-instruct">
              Recruit the highest-priority <b>Worker</b> the {botName} lacks by
              the priority order below (missing-first); if that type isn’t
              available, take the next available one. Pick the recruited Worker
              (+1 VP) — then discard its Worker tile from the board.
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
                {startLabel}
              </button>
            )}
          </div>
        )}

        {/* Recruit Genius / Research — Genius AND an open Recruit space available? */}
        {pending === 'geniusQuestion' && (
          <div className="place-prompt">
            <p className="pp-instruct">
              Is a <b>Genius</b> available to recruit <b>and</b> an open Recruit
              Action space (or World Council space)? If so, the {botName}
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
              {placementHandled ? (
                <>
                  The {botName} recruits a <b>Genius</b> from that Recruit space, removing it
                  from the board. The bot gains 1 VP.
                </>
              ) : (
                <>
                  Place the {botName}’s Exosuit on the topmost available <b>Recruit</b> Action
                  space (or a World Council space if full) and recruit a <b>Genius</b>,
                  removing it from the board. The bot gains 1 VP.
                </>
              )}
            </p>
            <div className="resource-picks worker-picks">
              <WorkerSwatch worker="genius" selected onClick={() => {}} />
            </div>
            <button className="start-turn" onClick={onStartTurn}>
              {startLabel}
            </button>
          </div>
        )}

        {/* Research — the app rolled the shape die; take a Breakthrough of that shape. */}
        {pending === 'research' && rolledShape && (
          <div className="place-prompt">
            <p className="pp-instruct">
              {researchNewShape ? (
                <>
                  Difficulty: the {botName} takes a Breakthrough shape it doesn't already
                  have (or has the fewest of) — a <b>{rolledShape}</b> Breakthrough.
                </>
              ) : (
                <>
                  The shape die rolled <b>{rolledShape}</b> — the {botName} keeps a{' '}
                  <b>{rolledShape}</b> Breakthrough.
                </>
              )}
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
              {startLabel}
            </button>
          </div>
        )}

        {/* Reboot — the Chronobot does nothing. */}
        {pending === 'reboot' && (
          <div className="place-prompt">
            <p className="pp-instruct">Reboot: {botName} does nothing.</p>
            <button className="start-turn" onClick={onStartTurn}>
              {startLabel}
            </button>
          </div>
        )}

        {/* Time Travel — the player physically removes a Warp tile & advances the marker. */}
        {pending === 'timeTravel' && (
          <div className="place-prompt">
            <p className="pp-instruct">
              Remove one of the {botName}’s <b>Warp tiles</b> from the past
              Timeline tile where it has the most (oldest if tied).
            </p>
            <button className="start-turn" onClick={onStartTurn}>
              {startLabel}
            </button>
          </div>
        )}

        {/* Remove Anomaly — outcome is fully determined by the bot's state. */}
        {pending === 'removeAnomaly' &&
          (removeAnomaly.canRemove ? (
            <div className="place-prompt">
              <p className="pp-instruct">
                Discard <b>{removeAnomaly.discards}</b> from the {botName} and
                remove 1 Anomaly. (Remove Anomaly places no Exosuit.)
              </p>
              <button className="start-turn" onClick={onStartTurn}>
                {startLabel}
              </button>
            </div>
          ) : (
            <div className="place-prompt failed-note">
              <p className="pp-instruct">
                Failed Action: {removeAnomaly.reason} — the {botName} takes +1 VP
                instead (no Exosuit placed).
              </p>
              <button className="start-turn" onClick={onStartTurn}>
                {startLabel}
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
            {startLabel}
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
          <MechRules open={showMech} onToggle={toggleMech} botName={botName} />
        )}

        {/* Fractures — the Blink rules keep the other rule boxes company while the
            Blink check's outcome is on screen. */}
        {(pending === 'blink' || pending === 'fluxCasing') && <BlinkRuleBlock />}
      </div>
    </div>
  );
}

/** Collapsible verbatim rules for how the bot places its mech. */
function MechRules({
  open,
  onToggle,
  botName = 'Chronobot',
}: {
  open: boolean;
  onToggle: () => void;
  botName?: string;
}) {
  return (
    <div className="mech-rules">
      <button className="mech-cta" onClick={onToggle}>
        📖 Placing the {botName}’s Exosuit {open ? '▾' : '▸'}
      </button>
      {open && (
        <ul>
          {MECH_PLACEMENT.map((line, i) => (
            <li key={i}>
              {botName === 'Chronobot' ? line : line.replace(/Chronobot/g, botName)}
            </li>
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
