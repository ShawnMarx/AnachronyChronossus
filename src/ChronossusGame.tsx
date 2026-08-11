// ChronossusGame — the full guided Era flow for the Chronossus.
//
// Structure mirrors the Chronobot (Setup → 1 Preparation → 2 Paradox → 3 Power Up
// → 4 Warp → 5 Action Rounds → 6 Clean Up → next Era | End Game) but uses the
// Chronossus engine + board. It reuses the shared PhaseScreen shell (now
// parameterised with the Chronossus hero/label) and flow.ts sequencing.
//
// Phase 5 (Action Rounds) reuses the Chronobot's exported `DetailPanel` verbatim
// (passing botName="Chronossus"), so the action pop-ups look and behave EXACTLY
// like the Chronobot's — only the board + coordinates differ. Actions resolve
// through Chronossus.resolveAction (no Command-token advancement yet — the token
// paths are a later feature). A calibrate mode positions the hotspots + markers.
//
// DEV STANCE (per plan): boots straight into Phase 5 with 4 powered Exosuits so we
// can reconcile the Action Rounds first. The non-Phase-5 phase bodies are honest
// skeletons for now; a debug phase rail lets you jump around.

import { useEffect, useRef, useState } from 'react';
import './BoardExplorer.css';
import './ChronossusExplorer.css';
import './phases/phases.css';
import PhaseScreen from './phases/PhaseScreen';
import { CHRONOSSUS_PHASE_META, CHRONOSSUS_ENDGAME_RULES } from './phases/chronossusPhaseMeta';
import {
  DetailPanel,
  AnchoredPopover,
  BadgePopover,
  ShapeIcon,
  SettingsMenu,
  WarpPhaseBody,
  ParadoxPhaseBody,
  summarizeTurn,
  type PendingStep,
} from './BoardExplorer';
import HistoryPane from './history/HistoryPane';
import ReadyToBegin from './phases/ReadyToBegin';
import FirstPlayerPrompt from './phases/FirstPlayerPrompt';
import TurnBarOverview from './phases/TurnBarOverview';
import DebugBar from './components/DebugBar';
import { useUndoableGame } from './game/useUndoableGame';
import { useMediaQuery } from './game/useMediaQuery';
import { clearPersisted, peekSaved, type HistoryEntry } from './game/undo';
import { clearSavedChronobot } from './BoardExplorer';
import { ActionIcon } from './board/ActionIcon';
import RulesBox from './phases/RulesBox';
import RulesFrame, { RulesButton } from './rules/RulesFrame';
import { rulesFrameUrl } from './rules/gamebrain';
import { useAuth } from './auth/useAuth';
import { recordGame } from './data/gameData';
import {
  Chronobot,
  Chronossus,
  CHRONOBOT_ACTIONS,
  createInitialState,
  emptyChronossusState,
  drawEnergyPool,
  rollShapeDie,
  rollAiDie,
  rollParadoxDie,
  AI_DIE_FACES,
  PHASE_NUMBER,
  type GameState,
  type ChronossusState,
  type ChronobotActionId,
  type Phase,
  type Resource,
  type Worker,
  type BreakthroughShape,
  type Instruction,
  type EnergyPool,
} from './engine';
import { finishEra, advanceFromPreparation, startFirstEra } from './game/flow';
import ChronossusSetupFlow, { type ChronossusSetupResult } from './phases/ChronossusSetupFlow';
import type {
  ChronossusActionInput,
  ChronossusActionId,
  ChronossusTileActionId,
  EnergyDraw,
} from './engine/bots/chronossus';
import {
  CHRONOSSUS_ACTION_HOTSPOTS,
  CHRONOSSUS_PANEL,
  CHRONOSSUS_COUNTERS,
  CHRONOSSUS_TIME_TRAVEL_TRACK,
  CHRONOSSUS_WARP_MARKER,
  CHRONOSSUS_PARADOX_SLOTS,
} from './board/chronossusHotspots';
import {
  CHRONOSSUS_TRACK_POSITIONS,
  CHRONOSSUS_TILE_WIDTH,
  CHRONOSSUS_MARKER_WIDTH,
  COMMAND_NUMS,
  initialMarkerSteps,
  markerPosKey,
  nextStep,
  trackPos,
  type CommandNum,
  type TrackPos,
} from './board/chronossusPaths';
import type { BoardCounter, Hotspot } from './board/chronobotHotspots';
import {
  CHRONOSSUS_TILES,
  TILE_ACTION_FAMILY,
  liveTileCode,
  tileEffect,
} from './board/chronossusTiles';
import {
  getMode,
  slotAtPos,
  slotCovering,
  tileCodeFor,
} from './board/chronossusModes';
import {
  DIFFICULTY_HYPERSYNC_TARGETED,
  chronossusDifficultyLabel,
} from './phases/ChronossusSetupFlow';
import { shareScoreImage, type ScoreShareRow } from './game/shareScore';
import {
  CHRONOSSUS_OVERLAYS,
  OVERLAY_KEYS,
  OVERLAY_LABEL,
  overlayKey,
  type OverlayKey,
} from './board/botOverlays';
import { BotOverlayLayer } from './board/BotOverlayLayer';
import { overlayCount, withOverlayCount } from './board/botOverlays';
import { OverlayDebugControls } from './components/OverlayDebugControls';

const HERO = '/assets/solo/chronossus-hero.jpg';

// Persistence (own key so it survives refresh, separate from the Chronobot's).
const CX_PERSIST_KEY = 'anachrony:chronossus';
// v2: added ChronossusState.hypersyncTiles + config.chronossusMode / tileSides
// (Hypersync mode + B-side tiles). Bumping discards pre-change saves that lack
// these fields so a stale game can't rehydrate into an inconsistent state.
const CX_PERSIST_VERSION = 2;

/** Landing/AppRoot helpers: the saved Chronossus game's timestamp, or null. */
export function peekSavedChronossus(): { savedAt: number } | null {
  return peekSaved(CX_PERSIST_KEY, CX_PERSIST_VERSION);
}
/** Discard any saved Chronossus game (for "New game" / opponent switch). */
export function clearSavedChronossus(): void {
  clearPersisted(CX_PERSIST_KEY);
}

/** The transient per-view slice (Command-marker positions + shown AI die +
 *  this Era's Power-Up draw). Persisted, so a reload during Power Up restores the
 *  result instead of offering a second draw. */
interface ChronossusUi {
  markerSteps: Record<CommandNum, number>;
  botDie: number | null;
  activeMarker: CommandNum | null;
  lastDraw: EnergyDraw | null;
  // Persisted phase rolls, so backing to a phase (Undo) re-shows the SAME roll rather
  // than re-randomizing (#4, #10): the Warp-phase Paradox-die roll, a reusable Paradox
  // roll (restored from the undone entry's die), and the Hypersync target hex.
  warpRoll: number | null;
  paradoxRoll: number | null;
  hsRolledHex: number | null;
}
const emptyCxUi = (): ChronossusUi => ({
  markerSteps: initialMarkerSteps(),
  botDie: null,
  activeMarker: null,
  lastDraw: null,
  warpRoll: null,
  paradoxRoll: null,
  hsRolledHex: null,
});

// Simple Command View is a display preference shared across bots (own key).
const SIMPLE_VIEW_KEY = 'anachrony:simpleView';
const loadSimpleView = (): boolean => {
  try {
    return localStorage.getItem(SIMPLE_VIEW_KEY) !== '0';
  } catch {
    return true;
  }
};
const saveSimpleView = (on: boolean): void => {
  try {
    localStorage.setItem(SIMPLE_VIEW_KEY, on ? '1' : '0');
  } catch {
    /* ignore */
  }
};
/** Floating SCV toggle + overlay box on the board (overlay variant), % of board. */
const CX_SCV_TOGGLE: [number, number] = [4.8, 3.0];
const CX_SCV_BOX: [number, number, number, number] = [1.4, 0.9, 48.8, 72.1];

/** One Simple-Command-View row: a marker + the action it currently sits on. */
interface ScvRow {
  num: CommandNum;
  action: ChronossusActionId;
  label: string;
  /** Modular tile art code (e.g. 'C01A') when on a tile slot; null on a printed space. */
  tile: string | null;
}

/** A fresh Chronossus game at the Setup screen (Era 1, the pre-game flow). */
function initState(): GameState {
  const base = createInitialState({
    bot: 'chronossus',
    expansions: ['base'],
    difficulty: [],
    playerBoardSide: 'A',
  });
  return { ...base, chronossus: emptyChronossusState(), firstPlayer: 'bot' };
}

const PHASE_RAIL: Phase[] = [
  'setup',
  'preparation',
  'paradox',
  'powerup',
  'warp',
  'actions',
  'cleanup',
  'endgame',
];

/** Format a cube list ("2 gold + 1 titanium") for the Remove-Anomaly prompt. */
function describeCubes(cubes: Resource[]): string {
  const counts: Partial<Record<Resource, number>> = {};
  for (const c of cubes) counts[c] = (counts[c] ?? 0) + 1;
  return Object.entries(counts)
    .map(([r, c]) => `${c} ${r}`)
    .join(' + ');
}

function isConstructBuilding(a: string): boolean {
  return a.startsWith('construct-') && a !== 'construct-superproject';
}

/** One-line status hint for the Turn popover (the Chronossus pass model). */
function chronossusTurnHint(bot: ChronossusState): string {
  if (bot.passed) return 'The Chronossus has passed for this Era.';
  if (bot.exosuitsAvailable <= 0)
    return 'The Chronossus is out of Exosuits — it passes the next time it would place one (Time Travel / Reboot still resolve).';
  return 'The Chronossus alternates turns with you. It passes once it is out of Exosuits and would place one; when you have both passed, the Action Rounds Phase ends.';
}

// ---- Calibration keys ----------------------------------------------------
const hsKey = (id: string) => `hs_${id}`;
const ttKey = (i: number) => `tt_${i}`;
const pdxKey = (i: number) => `pdx_${i}`;
const tileKey = (key: string) => `tile_${key}`;
const WARP_KEY = 'warp';
const HS_CENTER = (h: Hotspot): [number, number] => [
  h.rect[0] + h.rect[2] / 2,
  h.rect[1] + h.rect[3] / 2,
];
const TT_KEYS = CHRONOSSUS_TIME_TRAVEL_TRACK.spots.map((_, i) => ttKey(i));
const PDX_KEYS = CHRONOSSUS_PARADOX_SLOTS.slots.map((_, i) => pdxKey(i));
const TRACK_KEYS = CHRONOSSUS_TRACK_POSITIONS.map((p) => p.key);
/** The 3 modular tile slots (I/II/III) — their tile ART is calibrated separately. */
const MOD_SLOTS = CHRONOSSUS_TRACK_POSITIONS.filter((p) => p.tile);
/** Capital Actions (Research / Recruit / Construct) — the ones the Hypersync
 *  no-space fallback lets the Chronossus perform via a Solo Hypersync tile. */
const CAPITAL_ACTIONS = new Set<ChronossusActionId>([
  'research',
  'recruit',
  'recruit-genius-research',
  'construct-factory',
  'construct-lab',
  'construct-powerplant',
  'construct-support',
  'construct-superproject',
]);
/** Reverse of TILE_ACTION_FAMILY: a tile family → its in-play tile-action id. */
const FAMILY_TO_TILE_ACTION: Record<string, ChronossusTileActionId> = {
  C01: 'tile-reboot',
  C02: 'tile-score',
  C03: 'tile-energy-pack',
};

/** Verbatim Time Travel Action rule — shown below the Hypersync tile rules, since
 *  the Hypersync Action falls back to a normal Time Travel Action. */
const TIME_TRAVEL_RULE = CHRONOBOT_ACTIONS['time-travel'].rule;

/** The Time Travel rulebook text block (the Hypersync fallback Action). */
function TimeTravelRuleBlock() {
  return (
    <div className="hs-tt-rule">
      <p className="dp-rule">
        <b>Time Travel Action (the fallback):</b>
      </p>
      {TIME_TRAVEL_RULE.split('\n').map((line, i) =>
        line ? (
          <p key={i} className="dp-rule">
            {line}
          </p>
        ) : null,
      )}
    </div>
  );
}

/** Collapsible "Time Travel rules ▸" — matches the printed-action rules toggle. */
function TimeTravelRuleBlockCollapsible() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mech-rules">
      <button className="mech-cta" onClick={() => setOpen((s) => !s)}>
        📖 Time Travel rules {open ? '▾' : '▸'}
      </button>
      {open && (
        <div className="rule-body">
          {TIME_TRAVEL_RULE.split('\n').map((line, i) =>
            line ? (
              <p key={i} className="dp-rule">
                {line}
              </p>
            ) : null,
          )}
        </div>
      )}
    </div>
  );
}
/** Verbatim Autoleap rule (Solo Opponents rulebook p. 10). */
const AUTOLEAP_RULE =
  "If the Command token is moved to a space with the Autoleap Action symbol, the " +
  "Action on that space's tile is immediately resolved. Then, the token is advanced " +
  'one space further.';

/** Collapsible "Autoleap rules ▸" — shown on Autoleap tiles' dialogs. */
function AutoleapRuleBlockCollapsible() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mech-rules">
      <button className="mech-cta" onClick={() => setOpen((s) => !s)}>
        📖 Autoleap rules {open ? '▾' : '▸'}
      </button>
      {open && (
        <div className="rule-body">
          <p className="dp-rule">{AUTOLEAP_RULE}</p>
        </div>
      )}
    </div>
  );
}

const CAL_KEYS: string[] = [
  ...CHRONOSSUS_ACTION_HOTSPOTS.map((h) => hsKey(h.id)),
  ...TRACK_KEYS,
  ...MOD_SLOTS.map((p) => tileKey(p.key)),
  ...CHRONOSSUS_COUNTERS.map((c) => c.key),
  ...TT_KEYS,
  WARP_KEY,
  ...PDX_KEYS,
  ...OVERLAY_KEYS.map((k) => overlayKey(k)),
];

/** Short effect text for the modular tile actions (for slot tooltips). */
const TILE_DESC: Partial<Record<ChronossusActionId, string>> = {
  'tile-reboot': 'Reboot: the Chronossus does nothing',
  'tile-score': 'Score: +2 VP',
  'tile-energy-pack': 'Energy Pack: +1 Energy Core',
};

const SHAPE_ORDER: BreakthroughShape[] = ['circle', 'triangle', 'square'];
const BUILDING_KEYS = ['factory', 'lab', 'powerplant', 'support'] as const;

/** Popover text for a tracker badge (the same info as the Chronobot's tooltips). */
function counterInfo(bot: ChronossusState, c: BoardCounter): string {
  const count = counterValue(bot, c.key);
  if (c.key === 'superproject') {
    return bot.superprojectVps.length
      ? `${c.label} ×${count} — VP: ${bot.superprojectVps.join(', ')}`
      : `${c.label}: 0`;
  }
  if ((BUILDING_KEYS as readonly string[]).includes(c.key)) {
    const vps = bot.buildingVps[c.key as (typeof BUILDING_KEYS)[number]];
    return vps.length
      ? `${c.label} ×${count} — VP: ${vps.join(', ')} (max 3 of a type)`
      : `${c.label}: 0 (max 3 of a type)`;
  }
  switch (c.key) {
    case 'mech':
      return `${c.label}: ${count} powered Exosuit${count === 1 ? '' : 's'} available`;
    case 'anomaly':
      // Variable Anomalies: list each held tile's VP, same pattern as buildings.
      return bot.anomalyVps
        ? bot.anomalyVps.length
          ? `${c.label} ×${count} — VP: ${bot.anomalyVps.join(', ')} (max 3)`
          : `${c.label}: 0 (max 3)`
        : `${c.label}: ${count} (max 3)`;
    case 'neutronium':
    case 'uranium':
    case 'gold':
    case 'titanium':
      return `${c.label}: ${count} cube${count === 1 ? '' : 's'}`;
    default:
      return `${c.label}: ${count}`;
  }
}

/** Value for a tracker badge (the Chronossus slice shares the Chronobot's fields). */
function counterValue(bot: ChronossusState, key: BoardCounter['key']): number {
  switch (key) {
    case 'superproject':
      return bot.superprojects;
    case 'anomaly':
      return bot.anomalyVps?.length ?? bot.anomalies;
    case 'mech':
      return bot.exosuitsAvailable;
    case 'breakthrough':
      return bot.breakthroughs.circle + bot.breakthroughs.triangle + bot.breakthroughs.square;
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

const EC_ICON = '/assets/solo/chronossus/energy-core.png';
const EEC_ICON = '/assets/solo/chronossus/exhausted-energy-core.png';
const EXOSUIT_ICON = '/assets/solo/chronossus/exosuit.png';
const PATH_ICON = '/assets/solo/chronossus/path-marker.png';

/** The Exosuit icon + count (replaces the 🦾 emoji in the stat bar / Turn popover). */
function CxExosuit({ count, size = 18 }: { count: number; size?: number }) {
  return (
    <span className="cx-exosuit">
      <img src={EXOSUIT_ICON} alt="Powered Exosuits" style={{ height: size }} />
      {count} Exo
    </span>
  );
}

/** The Chronossus Energy Pool shown with its component icons + counts
 *  (Energy Core ×N / Exhausted Energy Core ×N), e.g. the "EC5 / EEC3" display. */
function CxEnergyPool({ pool, size = 20 }: { pool: EnergyPool; size?: number }) {
  return (
    <span className="cx-energy-pool">
      <span className="cx-energy" title="Energy Cores in the Energy Pool">
        <img src={EC_ICON} alt="Energy Cores" style={{ height: size }} />
        <b>{pool.energized}</b>
      </span>
      <span className="cx-energy" title="Exhausted Energy Cores in the Energy Pool">
        <img src={EEC_ICON} alt="Exhausted Energy Cores" style={{ height: size }} />
        <b>{pool.exhausted}</b>
      </span>
    </span>
  );
}

export default function ChronossusGame({ onHome }: { onHome: () => void }) {
  // Shared turn-loop store: engine state + the transient ui slice + undo/history
  // + localStorage persistence (survives refresh).
  const {
    state,
    setState,
    ui,
    setUi,
    entries,
    canUndo,
    debug,
    setDebug,
    commit,
    undo,
    reset: hookReset,
  } = useUndoableGame<ChronossusUi>({
    storageKey: CX_PERSIST_KEY,
    version: CX_PERSIST_VERSION,
    initialState: initState,
    initialUi: emptyCxUi,
    initialDebug: false, // real game starts at Setup, play mode (admins can toggle)
  });
  // Read-aliases so the render/logic below keep referring to these by name.
  const markerSteps = ui.markerSteps;
  const activeMarker = ui.activeMarker;
  const botDie = ui.botDie;
  const lastDraw = ui.lastDraw; // this Era's Power-Up draw (persisted in the ui slice)
  const [showHistory, setShowHistory] = useState(false);
  const [modeRules, setModeRules] = useState(false); // GameBrain rules overlay open
  const [actionsIntroEra, setActionsIntroEra] = useState<number | null>(null);
  const [showFirstPlayer, setShowFirstPlayer] = useState(false);
  const [showStatus, setShowStatus] = useState(false); // Turn-chip popover
  // Read-only rule view (a free-tap / SCV row shows the action's rules, no turn).
  const [ruleView, setRuleView] = useState(false);
  // A modular tile action (Reboot / Score / Energy Pack) awaiting its ▶ Start
  // (the marker landed on a tile slot). Its dialog waits like every other action.
  const [pendingTile, setPendingTile] = useState<ChronossusTileActionId | null>(null);
  // The current pendingTile was reached by an Autoleap (marker moved onto it): its
  // dialog shows the Autoleap note and its resolution is logged "Autoleap — …".
  const [tileAutoleap, setTileAutoleap] = useState(false);
  // A modular-tile dialog opened read-only (play-mode tap / SCV row): shows the
  // tile's rules with no ▶ Start, taking no turn (mirrors the action rule view).
  const [tileRuleView, setTileRuleView] = useState(false);
  // A pending C12/C13 Hypersync Action (Hypersync mode): the tile code driving it,
  // plus whether the dialog is read-only (rules view). Its own multi-step flow
  // lives in HypersyncDialog.
  // `viaChain`: the dialog was opened by the Autoleap chain (marker moved onto the
  // tile), so its resolve already advances the extra Autoleap step — don't add another.
  const [pendingHypersync, setPendingHypersync] = useState<{
    code: string;
    readOnly: boolean;
    viaChain?: boolean;
  } | null>(null);
  // Hypersync no-space fallback: showing the "place a Solo Hypersync tile" prompt
  // after the player says a Capital Action cannot be placed.
  const [showHypersyncTilePrompt, setShowHypersyncTilePrompt] = useState(false);

  // Simple Command View (play aid) + the board-stage sizing mechanism, ported
  // verbatim from the Chronobot so the board + SCV reflow identically on mobile.
  const [simpleView, setSimpleView] = useState<boolean>(loadSimpleView);
  const [simpleViewShown, setSimpleViewShown] = useState(true);
  useEffect(() => saveSimpleView(simpleView), [simpleView]);
  const scvBelow = useMediaQuery('(max-width: 760px)');
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
  const SCV_SIDE_W = 320;
  const boardFitW = Math.min(stageSize.w, stageSize.h * (1500 / 1110));
  const scvMode: 'below' | 'side' | 'overlay' = scvBelow
    ? 'below'
    : stageSize.w > 0 && stageSize.w - boardFitW >= SCV_SIDE_W + 24
      ? 'side'
      : 'overlay';

  // ---- Phase 5 action-dialog controller (mirrors BoardExplorer) ----------
  const [active, setActive] = useState<Hotspot | null>(null);
  const [pending, setPending] = useState<PendingStep>(null);
  const [result, setResult] = useState<Instruction[]>([]);
  const [selectedVP, setSelectedVP] = useState<number | null>(null);
  const [selectedResources, setSelectedResources] = useState<Resource[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [rolledShape, setRolledShape] = useState<BreakthroughShape | null>(null);
  // Alternate Timelines: Warp tiles placed this phase, awaiting the player's
  // positive-effect-space count before the Warp phase actually commits.
  const [altTimelinesPending, setAltTimelinesPending] = useState<number | null>(null);
  // Variable Anomalies: awaiting the player's report of the 2 offered tiles.
  const [variableAnomalyPending, setVariableAnomalyPending] = useState(false);
  // Bumped by Undo to remount the Paradox body (its roll log lives in local state).
  const [paradoxNonce, setParadoxNonce] = useState(0);
  const [, setLastResult] = useState<Instruction[]>([]); // kept for turn bookkeeping

  // Tapped tracker-badge popover (like the Chronobot's board tooltips).
  const [tappedBadge, setTappedBadge] = useState<string | null>(null);
  const [tappedRect, setTappedRect] = useState<DOMRect | null>(null);

  // ---- Command markers (Take Bot Action) ---------------------------------
  // The marker to advance + die shown when the current bot-driven turn resolves
  // (refs stay in sync for the synchronous resolve path; null on a player
  // free-tap, so free taps never move a marker).
  const activeMarkerRef = useRef<CommandNum | null>(null);
  const botDieRef = useRef<number | null>(null);
  // Set by finishTurn when a resolution advanced the marker onto an Autoleap tile
  // (simple OR Hypersync) and opened its follow-up dialog — so the caller's teardown
  // (startTurn's closePanel / startTileTurn's closeTile) preserves that dialog + the
  // marker ref instead of tearing it down.
  const chainOpenRef = useRef(false);
  // A rolled-but-not-yet-committed AI die: cleared only when a turn commits (or on
  // a full reset), NOT when the dialog is cancelled — so closing a bot dialog and
  // re-hitting Take Bot Action repeats the same roll / action rather than re-rolling.
  const pendingDieRef = useRef<CommandNum | null>(null);
  // Hypersync mode: set while the current Capital Action is being performed via a
  // Solo Hypersync tile (no-space fallback) — threaded into resolve()'s input.
  const hypersyncTileRef = useRef<boolean>(false);

  // ---- Calibrate mode ----------------------------------------------------
  const [calibrate, setCalibrate] = useState(false);
  const [outline, setOutline] = useState(false); // debug: show tile hit-boxes
  const [positions, setPositions] = useState<Record<string, [number, number]>>(() => {
    const seed: Record<string, [number, number]> = {};
    for (const h of CHRONOSSUS_ACTION_HOTSPOTS) seed[hsKey(h.id)] = HS_CENTER(h);
    for (const p of CHRONOSSUS_TRACK_POSITIONS) seed[p.key] = p.pos;
    for (const p of MOD_SLOTS) seed[tileKey(p.key)] = p.tilePos ?? p.pos;
    for (const c of CHRONOSSUS_COUNTERS) seed[c.key] = c.pos;
    CHRONOSSUS_TIME_TRAVEL_TRACK.spots.forEach((p, i) => (seed[ttKey(i)] = p));
    seed[WARP_KEY] = CHRONOSSUS_WARP_MARKER.pos;
    CHRONOSSUS_PARADOX_SLOTS.slots.forEach((p, i) => (seed[pdxKey(i)] = p));
    for (const o of CHRONOSSUS_OVERLAYS) seed[overlayKey(o.key)] = o.pos;
    return seed;
  });
  // Per-type overlay-image widths (calibrated separately from position).
  const [overlayWidths, setOverlayWidths] = useState<Record<string, number>>(() =>
    Object.fromEntries(CHRONOSSUS_OVERLAYS.map((o) => [o.key, o.width])),
  );
  // Per-type overlay corner rounding (border-radius %).
  const [overlayCurves, setOverlayCurves] = useState<Record<string, number>>(() =>
    Object.fromEntries(CHRONOSSUS_OVERLAYS.map((o) => [o.key, o.curve ?? 0])),
  );
  const [selected, setSelected] = useState<string>(CAL_KEYS[0]);
  const [hsWidth, setHsWidth] = useState<number>(CHRONOSSUS_ACTION_HOTSPOTS[0].rect[2]);
  const [hsHeight, setHsHeight] = useState<number>(CHRONOSSUS_ACTION_HOTSPOTS[0].rect[3]);
  const [markerWidth, setMarkerWidth] = useState<number>(CHRONOSSUS_MARKER_WIDTH);
  const [tileWidth, setTileWidth] = useState<number>(CHRONOSSUS_TILE_WIDTH);
  const [ttWidth, setTtWidth] = useState<number>(CHRONOSSUS_TIME_TRAVEL_TRACK.markerWidth);
  const [warpWidth, setWarpWidth] = useState<number>(CHRONOSSUS_WARP_MARKER.width);
  const [paradoxWidth, setParadoxWidth] = useState<number>(CHRONOSSUS_PARADOX_SLOTS.width);

  const bot = state.chronossus!;
  const score = Chronossus.scoreChronossus(bot, state.config.difficulty);

  // Paradoxes are tracked on the engine state (chronossus.paradoxes, 0–2; the
  // Paradox phase drives it, resetting to 0 on gaining an Anomaly). The debug
  // P +/- control nudges the same value for testing — mirrors the Chronobot.
  const paradoxes = bot.paradoxes;
  const setParadoxes = (updater: number | ((n: number) => number)) =>
    setState((s) => {
      const nextVal = typeof updater === 'function' ? updater(s.chronossus!.paradoxes) : updater;
      return {
        ...s,
        chronossus: { ...s.chronossus!, paradoxes: Math.max(0, Math.min(3, nextVal)) },
      };
    });

  // ---- Mode / Hypersync helpers -----------------------------------------
  const mode = getMode(state.config.chronossusMode, state.config.difficulty);
  const tileSides = state.config.tileSides;
  const hypersyncMode = mode.slots.some((s) => tileEffect(`${s.family}A`).hypersync === true);
  const hypersyncTargeted = state.config.difficulty?.includes(DIFFICULTY_HYPERSYNC_TARGETED) ?? false;
  // D7 ("Failed Actions score VP"): +2 VP replaces the base +1 — read once here so
  // every pre-commit "Failed Action" button label agrees with what actually resolves.
  const failedActionVP = state.config.difficulty?.includes(Chronossus.DIFFICULTY_FAILED_ACTION_VP)
    ? 2
    : 1;
  const altTimelines = state.config.extraModules?.includes(
    Chronossus.EXTRA_MODULE_ALTERNATE_TIMELINES,
  ) ?? false;
  // VP the Chronossus scores per positive-effect space it Warps onto (3 with that
  // module's difficulty option selected, otherwise the printed 2).
  const altTimelinesPerSpace = state.config.difficulty.includes(
    Chronossus.DIFFICULTY_ALT_TIMELINES_3VP,
  )
    ? 3
    : 2;
  // The live Hypersync tile code (C12/C13 + side) triggered at a given board spot,
  // or null when this mode has no Hypersync tile there.
  const hypersyncCodeAtSlot = (posKey: string): string | null => {
    const slot = slotAtPos(mode, posKey);
    if (slot && tileEffect(`${slot.family}A`).hypersync) return tileCodeFor(slot.family, tileSides);
    return null;
  };
  const hypersyncCodeForTimeTravel = (): string | null => {
    const slot = slotCovering(mode, 'time-travel');
    if (slot && tileEffect(`${slot.family}A`).hypersync) return tileCodeFor(slot.family, tileSides);
    return null;
  };
  // The live tile code shown at a track position (mode family + selected side),
  // falling back to the base tile-action family, then the static tile art.
  const slotTileCode = (p: TrackPos): string => {
    const s = slotAtPos(mode, p.key);
    if (s) return tileCodeFor(s.family, tileSides);
    if (p.action && p.action in TILE_ACTION_FAMILY) {
      return liveTileCode(p.action as keyof typeof TILE_ACTION_FAMILY, tileSides);
    }
    return p.tile ?? '';
  };
  // The board is interactive only in Action Rounds; elsewhere (the PhaseScreen
  // "Status" tab) it's the read-only bot-status view.
  const isActionsPhase = state.phase === 'actions';

  // Arrow-key nudge for the selected calibration point.
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

  // Theme the whole document (incl. popovers portaled to <body>) for Chronossus
  // while this view is mounted; the shared-UI tokens override to the warm palette.
  useEffect(() => {
    document.documentElement.dataset.bot = 'chronossus';
    return () => {
      delete document.documentElement.dataset.bot;
    };
  }, []);

  // Dismiss the Turn-chip status popover on Escape or an outside click.
  useEffect(() => {
    if (!showStatus) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest('.eoa-popover') && !t.closest('.status-chip')) setShowStatus(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setShowStatus(false);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [showStatus]);

  // Dismiss the tapped tracker-badge popover on Escape or an outside click.
  useEffect(() => {
    if (tappedBadge == null) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest('.count-badge') && !t.closest('.badge-portal')) setTappedBadge(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setTappedBadge(null);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [tappedBadge]);

  const onBoardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!calibrate) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = +(((e.clientX - rect.left) / rect.width) * 100).toFixed(1);
    const y = +(((e.clientY - rect.top) / rect.height) * 100).toFixed(1);
    setPositions((p) => ({ ...p, [selected]: [x, y] }));
    const i = CAL_KEYS.indexOf(selected);
    setSelected(CAL_KEYS[(i + 1) % CAL_KEYS.length]);
  };

  // ---- Action resolution -------------------------------------------------
  // Close the dialog UI + the shared selection state (not the pending roll).
  const clearDialogState = () => {
    setActive(null);
    setPending(null);
    setResult([]);
    setSelectedVP(null);
    setSelectedResources([]);
    setSelectedWorker(null);
    setRolledShape(null);
    setRuleView(false);
    setPendingTile(null);
    setTileRuleView(false);
  };
  // Full close: dialog + the rolled die + marker highlight. Used after a committed
  // turn and on resets — the next Take Bot Action rolls fresh.
  const closePanel = () => {
    clearDialogState();
    activeMarkerRef.current = null;
    botDieRef.current = null;
    pendingDieRef.current = null;
    setUi((u) => ({ ...u, botDie: null, activeMarker: null }));
  };
  // Cancel (the dialog ×): close the dialog. If a rolled die is still pending
  // (a genuine cancel — the turn was not committed), KEEP it shown so re-hitting
  // Take Bot Action repeats the same roll. If the turn already committed (or this
  // was a rule-view tap), pendingDieRef is null, so clear the die display too.
  const cancelPanel = () => {
    clearDialogState();
    activeMarkerRef.current = null;
    if (pendingDieRef.current == null) {
      botDieRef.current = null;
      setUi((u) => ({ ...u, botDie: null, activeMarker: null }));
    }
  };
  // Close the DetailPanel + its sub-step/selections, but KEEP pendingTile/pendingHypersync
  // and the marker ref — used when a turn resolves straight into an Autoleap chain dialog.
  const closeActionPanelForChain = () => {
    setActive(null);
    setPending(null);
    setSelectedVP(null);
    setSelectedResources([]);
    setSelectedWorker(null);
    setRolledShape(null);
    setRuleView(false);
  };

  // ---- Autoleap ----------------------------------------------------------
  // Rulebook (p.10): "If the Command token is moved to a space with the Autoleap
  // Action symbol, the Action on that space's tile is immediately resolved. Then,
  // the token is advanced one space further." So Autoleap fires when a token
  // ADVANCES ONTO an Autoleap tile (never when it is rolled/rests on one — it
  // always leaps past), resolving that tile as a second Action and advancing again.

  /** The live tile code sitting at a track position, or null if it isn't a tile slot. */
  const tileCodeAt = (posKey: string): string | null => {
    const slot = slotAtPos(mode, posKey);
    if (slot) return tileCodeFor(slot.family, tileSides);
    const tp = trackPos(posKey);
    if (tp?.action && tp.action in TILE_ACTION_FAMILY) {
      return liveTileCode(tp.action as keyof typeof TILE_ACTION_FAMILY, tileSides);
    }
    return null;
  };

  /**
   * If the marker advanced onto an Autoleap tile at `step`, return it (with its tile
   * Action, or the Hypersync flag) so the caller can open a dialog — Autoleap tiles are
   * NOT auto-resolved: each shows a dialog stating its effect (it activates immediately,
   * then the marker advances one extra space) with a ▶ Start Your Turn, like every other
   * Action. Returns null when the marker just rests on a normal space.
   */
  const autoleapAt = (
    marker: CommandNum,
    step: number,
  ): { code: string; actionId: ChronossusTileActionId | null; isHypersync: boolean } | null => {
    const code = tileCodeAt(markerPosKey(marker, step));
    if (!code || !tileEffect(code).autoleap) return null;
    if (tileEffect(code).hypersync) return { code, actionId: null, isHypersync: true };
    const actionId = (FAMILY_TO_TILE_ACTION[code.slice(0, -1)] ??
      null) as ChronossusTileActionId | null;
    return { code, actionId, isHypersync: false };
  };

  /**
   * Commit a resolved bot turn: advance the active marker one step for the Action,
   * resolve any Autoleap tiles it lands on, and — if it lands on a Hypersync Autoleap
   * tile — open that dialog to resolve it. On a free-tap (no active marker) nothing
   * advances and no Autoleap fires.
   */
  const finishTurn = (
    stateA: GameState,
    instrA: Instruction[],
    actionLabel: string,
    extraLeap = false,
  ) => {
    const preC = state.chronossus!;
    const marker = activeMarkerRef.current;
    if (marker == null) {
      commit(stateA, ui, turnLabel(instrA, actionLabel), summarizeTurn(preC, stateA.chronossus!, instrA), botDieRef.current);
      setResult(instrA);
      setLastResult(instrA);
      return;
    }
    // Advance the marker. `extraLeap` (a rest/tap on a Hypersync Autoleap tile) adds one
    // extra step for the Autoleap before the normal advance.
    let baseStep = ui.markerSteps[marker];
    if (extraLeap) baseStep = nextStep(marker, baseStep);
    const step1 = nextStep(marker, baseStep);
    const leap = autoleapAt(marker, step1);
    const newUi: ChronossusUi = {
      ...ui,
      markerSteps: { ...ui.markerSteps, [marker]: step1 },
      botDie: botDieRef.current,
      // Keep the marker highlighted only while an Autoleap dialog continues the turn;
      // when the turn is fully done, clear it so no marker stays lit afterwards.
      activeMarker: leap ? marker : null,
      lastDraw: ui.lastDraw,
      // A Hypersync roll (if this turn was one) is consumed by this commit; the snapshot
      // pushed by commit still carries it, so Undo re-seeds the same hex (#4).
      hsRolledHex: null,
    };
    // History effects: the action's state-diff summary + Energy Cores gained
    // (summarizeTurn doesn't read the Energy Pool, so an energy-only tile like C03B would
    // otherwise leave no trace).
    const effects = summarizeTurn(preC, stateA.chronossus!, instrA);
    const ec = stateA.chronossus!.energyPool.energized - preC.energyPool.energized;
    if (ec > 0) effects.unshift(`+${ec} Energy Core${ec === 1 ? '' : 's'}`);
    commit(stateA, newUi, turnLabel(instrA, actionLabel), effects, botDieRef.current);
    setResult(instrA);
    setLastResult(instrA);
    pendingDieRef.current = null;
    if (leap) {
      // The follow-up Autoleap resolution takes NO die roll → clear the die so its
      // History entry is die-less (only die-rolled turns show a die). Also close the
      // just-resolved action's DetailPanel so the Autoleap dialog shows on its own.
      botDieRef.current = null;
      closeActionPanelForChain();
    }
    if (leap?.isHypersync) {
      // Marker moved onto a Hypersync Autoleap tile → open its dialog (resolve advances
      // the extra step). Keep activeMarkerRef so it advances from here.
      chainOpenRef.current = true;
      setPendingHypersync({ code: leap.code, readOnly: false, viaChain: true });
      setPendingTile(null);
      setTileAutoleap(false);
    } else if (leap && leap.actionId) {
      // Marker moved onto a simple Autoleap tile (C01B/C03B…) → open its dialog stating
      // the effect + Autoleap note; ▶ Start Your Turn resolves it and advances one more,
      // which may chain onto the next Autoleap tile. Keep activeMarkerRef.
      chainOpenRef.current = true;
      setTileAutoleap(true);
      setPendingTile(leap.actionId);
    } else {
      chainOpenRef.current = false;
      setTileAutoleap(false);
      activeMarkerRef.current = null;
    }
  };

  // One-line History label for a resolved turn (Era · action · +VP).
  const turnLabel = (instructions: Instruction[], actionLabel: string): string => {
    const vp = instructions.reduce((n, i) => n + (i.effect?.vp ?? 0), 0);
    return `Era ${state.era} · ${actionLabel}${vp ? ` · +${vp} VP` : ''}`;
  };

  // The action hotspot nearest a board point (used to map a marker's landing
  // spot to the Action space it sits on).
  const nearestHotspot = (x: number, y: number): Hotspot => {
    let best = CHRONOSSUS_ACTION_HOTSPOTS[0];
    let bestD = Infinity;
    for (const h of CHRONOSSUS_ACTION_HOTSPOTS) {
      const [hx, hy] = positions[hsKey(h.id)] ?? HS_CENTER(h);
      const d = (hx - x) ** 2 + (hy - y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = h;
      }
    }
    return best;
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
      hypersyncNoTile?: boolean;
    },
  ) => {
    const input: ChronossusActionInput = { actionId: h.action };
    if (opts.cannotPlace) input.noSpaceAvailable = true;
    if (opts.buildingVP != null) input.buildingVP = opts.buildingVP;
    if (opts.minedResources) input.minedResources = opts.minedResources;
    if (opts.recruitedWorker) input.recruitedWorker = opts.recruitedWorker;
    if (opts.shape) input.shape = opts.shape;
    if (opts.geniusAvailable) input.geniusAvailable = true;
    // Hypersync no-space fallback: perform the Capital Action via a Solo Hypersync
    // tile (no Exosuit, not a Failed Action).
    if (hypersyncTileRef.current) input.placeHypersyncTile = true;
    if (opts.hypersyncNoTile) input.hypersyncNoTile = true;
    const { state: next, instructions } = Chronossus.resolveAction(state, input);
    setPending(null);
    hypersyncTileRef.current = false; // consumed
    // Advance the marker + resolve any Autoleap tiles it lands on, then commit.
    finishTurn(next, instructions, CHRONOBOT_ACTIONS[h.action].label);
  };

  // Close every open read/action dialog (DetailPanel + modular tile + Hypersync)
  // so tapping a new tile REPLACES the current one rather than stacking on it.
  const closeDialogs = () => {
    setActive(null);
    setRuleView(false);
    setPending(null);
    setPendingTile(null);
    setTileRuleView(false);
    setPendingHypersync(null);
    setResult([]);
  };

  const onTileClick = (h: Hotspot, force = false) => {
    if (calibrate) {
      setSelected(hsKey(h.id)); // select instead of activating
      return;
    }
    closeDialogs();
    setActive(h);
    setResult([]);
    setSelectedVP(null);
    setSelectedResources([]);
    setSelectedWorker(null);
    setRolledShape(null);
    // Play mode free-tap (not debug, not a die-driven turn): show the rule
    // reference only, no engine activation — mirrors the Chronobot.
    const showRuleOnly = !debug && !force;
    setRuleView(showRuleOnly);
    if (showRuleOnly) {
      setPending(null);
      return;
    }
    if (bot.passed) return; // the Chronossus has passed for this Era
    // Passing rule: out of Exosuits + this action would place one → the
    // Chronossus passes instead of taking the action (its token doesn't advance).
    if (Chronossus.wouldPassOn(bot, h.action)) {
      const { state: next, instructions } = Chronossus.passChronossus(state);
      // The token does NOT advance on a pass → keep ui.markerSteps as-is.
      commit(next, { ...ui, botDie: botDieRef.current }, `Era ${state.era} · Chronossus passed`);
      closePanel();
      setLastResult(instructions); // shown in the turn-status aside
      return;
    }
    if (h.action === 'mine-resource') {
      setPending('mineOpen');
    } else if (h.action === 'recruit-genius-research') {
      setPending('geniusQuestion');
    } else if (h.action === 'remove-anomaly') {
      setPending('removeAnomaly');
    } else if (h.action === 'reboot') {
      setPending('reboot');
    } else if (h.action === 'time-travel' && bot.warpTilesOnTimeline > 0) {
      setPending('timeTravel');
    } else if (CHRONOBOT_ACTIONS[h.action].placesExosuit) {
      setPending('mech');
    } else {
      resolve(h, {});
    }
  };

  // D8 ("Research takes a new Breakthrough shape"): roll the shape die as usual, but
  // reroll if the result isn't one of the shape(s) tied for the bot's lowest count.
  // With a unique lowest shape this just takes a few extra rolls to converge on it.
  const pickResearchShape = (): BreakthroughShape => {
    if (!state.config.difficulty?.includes(Chronossus.DIFFICULTY_RESEARCH_NEW_SHAPE)) {
      return rollShapeDie();
    }
    const candidates = Chronossus.researchShapeCandidates(bot);
    let shape = rollShapeDie();
    while (!candidates.includes(shape)) shape = rollShapeDie();
    return shape;
  };

  const onConfirmPlace = () => {
    if (!active) return;
    const a = active.action;
    if (a === 'construct-superproject') {
      const hasBreakthrough =
        bot.breakthroughs.circle + bot.breakthroughs.triangle + bot.breakthroughs.square > 0;
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
      if (Chronobot.chooseRecruitWorker(bot)) {
        setSelectedWorker(Chronobot.recruitWorkerOrder(bot)[0]);
        setPending('recruitWorker');
      } else resolve(active, {});
    } else if (a === 'research' || a === 'recruit-genius-research') {
      setRolledShape(pickResearchShape());
      setPending('research');
    } else {
      resolve(active, {});
    }
  };

  const onCannotPlace = () => {
    if (!active) return;
    // Hypersync mode: a Capital Action with no space places a Solo Hypersync tile
    // instead (if allowed) rather than Failing.
    if (hypersyncMode && CAPITAL_ACTIONS.has(active.action)) {
      if (Chronossus.canPlaceHypersyncTile(bot, state.era)) {
        setShowHypersyncTilePrompt(true);
        return;
      }
      resolve(active, { hypersyncNoTile: true }); // no tile available → Failed Action
      return;
    }
    resolve(active, { cannotPlace: true });
  };
  // Confirm placing a Solo Hypersync tile: run the Capital Action's normal input
  // sub-flow, but with the tile flag set (no Exosuit, not a Failed Action).
  const confirmHypersyncTile = () => {
    hypersyncTileRef.current = true;
    setShowHypersyncTilePrompt(false);
    onConfirmPlace();
  };
  const cancelHypersyncTile = () => setShowHypersyncTilePrompt(false);
  const onMineHasSpace = () => {
    setSelectedResources(Chronobot.mineResourceOrder(bot).slice(0, 2));
    setPending('mineResources');
  };
  const onMineNoSpace = () => {
    if (active) resolve(active, { cannotPlace: true });
  };
  const onPickVP = (vp: number) => setSelectedVP(vp);
  const onPickWorker = (w: Worker) => setSelectedWorker(w);
  const onGeniusYes = () => setPending('geniusRecruit');
  const onGeniusNo = () => setPending('mech');
  const onToggleResource = (r: Resource) => {
    setSelectedResources((cur) => {
      const countR = cur.filter((x) => x === r).length;
      if (countR === 2) return cur.filter((x) => x !== r);
      const next = [...cur, r];
      while (next.length > 2) {
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

  const startTurn = () => {
    chainOpenRef.current = false; // finishTurn re-sets it if resolving opens a chain dialog
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
      resolve(active, {});
    }
    // If resolving advanced the marker onto an Autoleap tile, finishTurn already closed
    // the DetailPanel and opened the follow-up dialog (keeping the marker ref) — so only
    // tear everything down when the turn did NOT chain.
    if (!chainOpenRef.current) closePanel();
  };

  // Show an action's rules read-only (from a Simple Command View row) — opens the
  // DetailPanel without taking a turn.
  const showActionRules = (action: ChronossusActionId) => {
    const h = CHRONOSSUS_ACTION_HOTSPOTS.find((x) => x.action === action);
    if (!h) return;
    botDieRef.current = null;
    activeMarkerRef.current = null;
    closeDialogs();
    setActive(h);
    setPending(null);
    setResult([]);
    setRuleView(true);
  };

  // Show a modular tile action's rules read-only (a play-mode tap on the tile
  // space, or its SCV row) — opens the tile dialog with no ▶ Start, no turn.
  const showTileRules = (tileAction: ChronossusTileActionId) => {
    botDieRef.current = null;
    activeMarkerRef.current = null;
    closeDialogs();
    setResult([]);
    setTileRuleView(true);
    setPendingTile(tileAction);
  };

  // Show a modular tile's rules from its live CODE (used by the SCV, where a mode
  // slot may carry a Hypersync tile or a flipped side, not the base tile action).
  const showTileRulesByCode = (tileCode: string) => {
    botDieRef.current = null;
    activeMarkerRef.current = null;
    closeDialogs();
    if (tileEffect(tileCode).hypersync) {
      setResult([]);
      setPendingHypersync({ code: tileCode, readOnly: true });
      return;
    }
    const action = FAMILY_TO_TILE_ACTION[tileCode.slice(0, -1)];
    if (action) {
      setResult([]);
      setTileRuleView(true);
      setPendingTile(action);
    }
  };

  // A tap on a modular tile SPACE (I/II/III). Calibrate → select; play mode →
  // rules only; debug free-tap → the interactive dialog (advances no marker,
  // since this isn't a die-driven turn).
  const onTileArtClick = (p: TrackPos) => {
    if (calibrate) {
      setSelected(tileKey(p.key));
      return;
    }
    if (!p.action) return;
    // Hypersync slot (C12): show / take the Hypersync Action instead of the tile.
    const hs = hypersyncCodeAtSlot(p.key);
    if (hs) {
      botDieRef.current = null;
      activeMarkerRef.current = null;
      closeDialogs();
      setResult([]);
      setPendingHypersync({ code: hs, readOnly: !debug });
      return;
    }
    const tileAction = p.action as ChronossusTileActionId;
    if (!debug) {
      showTileRules(tileAction);
      return;
    }
    botDieRef.current = null;
    activeMarkerRef.current = null;
    closeDialogs();
    setResult([]);
    setTileRuleView(false);
    setPendingTile(tileAction);
  };

  // Rows for the Simple Command View: each of the 4 markers, the action it now
  // sits on (a modular tile action, or the nearest printed Action space).
  const scvRows: ScvRow[] = COMMAND_NUMS.map((num) => {
    const key = markerPosKey(num, markerSteps[num]);
    const tp = trackPos(key);
    if (tp?.action) {
      const code = slotTileCode(tp);
      const modeSlot = slotAtPos(mode, key);
      const label = modeSlot
        ? (CHRONOSSUS_TILES[code]?.name ?? Chronossus.chronossusActionLabel(tp.action))
        : Chronossus.chronossusActionLabel(tp.action);
      return { num, action: tp.action, label, tile: code };
    }
    const [x, y] = positions[key] ?? [0, 0];
    const h = nearestHotspot(x, y);
    // Hypersync mode covers the Time Travel space with C13.
    if (h.action === 'time-travel') {
      const hs = hypersyncCodeForTimeTravel();
      if (hs) return { num, action: h.action, label: CHRONOSSUS_TILES[hs]?.name ?? 'Hypersync', tile: hs };
    }
    return { num, action: h.action, label: CHRONOBOT_ACTIONS[h.action].label, tile: null };
  });

  // Will completing the current turn advance the active marker onto an Autoleap tile?
  // If so, the commit buttons read "Advance to Autoleap Action" as a heads-up that the
  // Autoleap dialog comes next (shared by every action dialog).
  const nextMarkerIsAutoleap =
    activeMarker != null &&
    autoleapAt(activeMarker, nextStep(activeMarker, ui.markerSteps[activeMarker])) != null;
  const startLabel = nextMarkerIsAutoleap
    ? '▶ Advance to Autoleap Action'
    : '▶ Start Your Turn';

  // The action dialog. On mobile (flow=true) it renders in normal flow at the top
  // of the stage, pushing the board down; on desktop it's an absolute panel on the
  // board. Mirrors the Chronobot's renderDetailPanel.
  const renderDetailPanel = (flow: boolean) =>
    !calibrate && active ? (
      <DetailPanel
        flow={flow}
        startLabel={startLabel}
        hotspot={{ ...active, panel: active.panel ?? CHRONOSSUS_PANEL }}
        readOnly={ruleView}
        pending={pending}
        result={result}
        selectedVP={selectedVP}
        selectedResources={selectedResources}
        selectedWorker={selectedWorker}
        rolledShape={rolledShape}
        researchNewShape={state.config.difficulty?.includes(Chronossus.DIFFICULTY_RESEARCH_NEW_SHAPE) ?? false}
        breakthroughs={bot.breakthroughs}
        removeAnomaly={(() => {
          const discards = Chronobot.chooseRemoveAnomalyDiscards(bot);
          const anomalyCount = bot.anomalyVps?.length ?? bot.anomalies;
          return {
            canRemove: anomalyCount >= 1 && discards != null,
            discards: discards ? describeCubes(discards) : '',
            reason:
              anomalyCount < 1
                ? 'it has no Anomaly to remove'
                : 'it lacks 2 Resource cubes (or a Neutronium) to spend',
          };
        })()}
        mineOrder={Chronobot.mineResourceOrder(bot)}
        workerOrder={Chronobot.recruitWorkerOrder(bot)}
        botName="Chronossus"
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

  // ---- Phase transitions -------------------------------------------------
  // Every phase advance goes on the undo stack, even the ones that change nothing but
  // the phase, so ↶ Undo always steps back to the screen you came from. Leaving Power
  // Up also consumes this Era's draw (`lastDraw: null`) — restored by the snapshot.
  const commitPhase = (next: GameState, label: string, effects: string[] = []) =>
    commit(next, { ...ui, lastDraw: null }, label, effects);
  /** "Era 3 · → Power Up" — the label a phase move gets in History. */
  const enteredLabel = (next: GameState) =>
    `Era ${next.era} · → ${CHRONOSSUS_PHASE_META[next.phase]?.name ?? next.phase}`;
  // Finish Setup: seed the chosen module / difficulty / tile sides, enter Era 1.
  const beginGame = (result: ChronossusSetupResult) => {
    setState((s) => {
      const config = {
        ...s.config,
        difficulty: result.difficulty,
        difficultyValues: result.difficultyValues,
        chronossusMode: result.mode,
        tileSides: result.tileSides,
        extraModules: result.extraModules,
      };
      return startFirstEra({
        ...s,
        config,
        // D3: extra starting Energy Cores — applied once here, since
        // emptyChronossusState() (mount time) predates the player's setup choices.
        chronossus: s.chronossus && Chronossus.applyDifficultySetup(s.chronossus, config),
      });
    });
  };
  const drawAndPowerUp = () => {
    if (ui.lastDraw) return; // already drawn this Era — never deplete the pool twice
    const draw = drawEnergyPool(bot.energyPool);
    // resolvePowerUp advances to Warp; stay on 'powerup' to show the result. Commit
    // so the power-up lands in History (like the Chronobot's phase events), and keep
    // the draw in the persisted ui so a reload restores it (no second draw).
    const resolved = Chronossus.resolvePowerUp(state, draw);
    const next = { ...resolved, phase: 'powerup' as Phase };
    const b = next.chronossus!;
    commit(
      next,
      { ...ui, lastDraw: draw },
      `Era ${state.era} · Power Up: ${b.exosuitsAvailable} Exosuit${b.exosuitsAvailable === 1 ? '' : 's'}`,
      [
        `Drew ${draw.energized} Energy + ${draw.exhausted} Exhausted`,
        `Powered up ${b.exosuitsAvailable} Exosuit${b.exosuitsAvailable === 1 ? '' : 's'}`,
        `Pool now ${b.energyPool.energized}/${b.energyPool.exhausted}`,
      ],
    );
  };
  // Paradox phase (Era 2+): roll the Paradox die for the Chronossus and commit
  // each roll — same logic as the Chronobot's rollBotParadox. Variable Anomalies:
  // when rollParadox defers the gain (needs the 2 offered tiles' data), open the
  // gain-input prompt instead of showing a resolved Anomaly effect.
  const rollBotParadox = (rolled: number) => {
    const res = Chronossus.rollParadox(state, rolled);
    const pre = state.chronossus!;
    const post = res.state.chronossus!;
    const needsVariableAnomalyInput = res.instructions.some((i) => i.id === 'paradox-anomaly-variable');
    const effects: string[] = [];
    if (post.paradoxes !== pre.paradoxes) effects.push(`Paradox tracker → ${post.paradoxes}/3`);
    if (post.anomalies > pre.anomalies) effects.push('Gained 1 Anomaly (−3 VP)');
    if (needsVariableAnomalyInput) effects.push('Gained an Anomaly — resolve which Variable Anomaly tile');
    if (post.warpTilesOnTimeline < pre.warpTilesOnTimeline)
      effects.push('Warp tile removed from the Timeline');
    // Store the rolled value on the entry (die) so Undo can re-seed the same roll
    // (no re-randomize); clear the reusable roll going forward.
    commit(
      res.state,
      { ...ui, paradoxRoll: null },
      `Era ${state.era} · Paradox roll (+${Math.max(0, rolled)})`,
      effects,
      rolled,
    );
    if (needsVariableAnomalyInput) setVariableAnomalyPending(true);
    return res;
  };
  // Variable Anomalies: the player applies the RECEIVING ANOMALIES criteria to the 2
  // visible tiles and reports the taken tile's VP + whether it retrieves a Warp tile.
  const finishVariableAnomalyGain = (taken: Chronossus.VariableAnomalyCandidate) => {
    const next = Chronossus.resolveVariableAnomalyGain(state, taken);
    const vps = next.chronossus!.anomalyVps!;
    commit(next, ui, `Era ${state.era} · Variable Anomaly gained`, [
      `Anomaly VP: ${vps[vps.length - 1]}`,
    ]);
    setVariableAnomalyPending(false);
  };
  // Roll the Warp-phase Paradox die once and stash it in the ui slice so backing to
  // the Warp phase (Undo) re-shows the same roll instead of re-rolling (#10).
  const rollWarp = () => setUi((u) => ({ ...u, warpRoll: rollParadoxDie() }));
  const advanceParadox = () => {
    const next = Chronossus.endParadoxPhase(state);
    commitPhase(next, enteredLabel(next));
  };
  // Warp phase: place the Chronossus's rolled Warp tiles and commit (so the
  // placement lands in History) — mirrors the Chronobot's commitWarp. Alternate
  // Timelines intercepts first: ask how many landed on a positive space before
  // actually resolving/committing.
  const commitWarp = (paradoxes: number) => {
    const place = Math.max(0, paradoxes);
    if (altTimelines && place > 0) {
      setAltTimelinesPending(place);
      return;
    }
    finishWarp(place, 0);
  };
  const finishWarp = (place: number, positiveSpaces: number) => {
    const next = Chronossus.resolveWarp(state, place, positiveSpaces);
    const bonusVP = positiveSpaces * altTimelinesPerSpace;
    commit(
      next,
      { ...ui, warpRoll: null },
      `Era ${state.era} · Warp: placed ${place}`,
      [
        place > 0
          ? `Placed ${place} Warp tile${place === 1 ? '' : 's'} on the Timeline`
          : 'Placed no Warp tiles',
        ...(bonusVP ? [`Alternate Timelines: +${bonusVP} VP (${positiveSpaces} positive space${positiveSpaces === 1 ? '' : 's'})`] : []),
      ],
    );
    setAltTimelinesPending(null);
  };
  // End of Action Rounds → ask who took First Player next Era, then Clean Up.
  // On the last Era there is no next Era, so skip the prompt and go to Clean Up.
  // End of Action Rounds → Clean Up. Only ask who leads next Era when a next Era is
  // guaranteed: the final Era (7) ends in Clean Up (no prompt); post-Impact Eras
  // (5–6) might end when flipping Collapsing Capital, so defer the prompt to the
  // "Game continues" choice; Eras 1–4 ask now.
  const endActions = () => {
    closePanel();
    const era = state.era;
    if (era >= Chronossus.MAX_ERA) {
      // Last Era: no Clean Up step — go straight to scoring.
      endGameNow();
      return;
    }
    if (era === 5 || era === 6) {
      const next = Chronossus.resolveCleanUp(state);
      commitPhase(next, enteredLabel(next));
      return;
    }
    setShowFirstPlayer(true);
  };
  // Answer the First-Player question. Asked at the end of Action Rounds (Eras 1–4)
  // it flows into Clean Up; deferred past the Clean Up game-end check (Eras 5–6) it
  // starts the next Era.
  const answerFirstPlayer = (playerFirst: boolean) => {
    setShowFirstPlayer(false);
    const withFp: GameState = { ...state, firstPlayer: playerFirst ? 'player' : 'bot' };
    const next = state.phase === 'cleanup' ? finishEra(withFp) : Chronossus.resolveCleanUp(withFp);
    commitPhase(next, enteredLabel(next), [
      `First Player next: ${playerFirst ? 'you' : 'the Chronossus'}`,
    ]);
  };
  const afterCleanUp = () => {
    const next = finishEra(state);
    commitPhase(next, enteredLabel(next));
  };
  // Clean Up → End Game: the game ended (Era 7, or the Capital collapsed in Era
  // 5–6 when flipping Collapsing Capital tiles). Mirrors the Chronobot exactly.
  const endGameNow = () =>
    commitPhase({ ...state, phase: 'endgame', finished: true }, `Era ${state.era} · → End Game`);
  const goPhase = (p: Phase) => {
    closePanel();
    const next = { ...state, phase: p };
    commitPhase(next, enteredLabel(next));
  };
  const reset = () => {
    clearPersisted(CX_PERSIST_KEY);
    clearSavedChronobot(); // only one opponent's game may be active at a time
    hookReset(initState(), emptyCxUi());
    closePanel();
    setLastResult([]);
    setCalibrate(false);
    setShowHistory(false);
    setShowFirstPlayer(false);
    setActionsIntroEra(null);
    botDieRef.current = null;
    activeMarkerRef.current = null;
  };

  // Undo the last committed turn: restore its snapshot, re-showing its die and
  // making it pending again so the next Take Bot Action repeats that same roll.
  const undoTurn = () => {
    closePanel();
    const snap = undo();
    if (snap) {
      botDieRef.current = snap.ui.botDie;
      pendingDieRef.current = snap.ui.botDie as CommandNum | null;
      // Re-seed a reusable Paradox roll from the undone entry's die so re-rolling in the
      // Paradox phase repeats the same value instead of re-randomizing (#10). Only a
      // Paradox-roll entry restores to a paradox-phase state.
      if (snap.state.phase === 'paradox' && snap.die != null) {
        setUi((u) => ({ ...u, paradoxRoll: snap.die as number }));
      }
      // Variable Anomalies: whether the gain prompt is owed is a property of the restored
      // state — undoing the gain re-opens it (the roll that deferred it is back), undoing
      // the roll itself closes it.
      setVariableAnomalyPending(
        snap.state.currentInstructions.some((i) => i.id === 'paradox-anomaly-variable'),
      );
      // The Paradox body keeps its roll log / "how many checks so far" in local state,
      // which no snapshot rewinds — remount it so it can't contradict the restored state.
      // Cost: the on-screen log for that phase clears (🕑 History keeps the full record).
      setParadoxNonce((n) => n + 1);
    }
    activeMarkerRef.current = null;
    setLastResult([]);
  };

  // Take Bot Action: roll the AI die (faces 2/3/4/5), activate that Command
  // marker, resolve the Action space it currently sits on, then advance it.
  const takeBotTurn = () => {
    if (bot.passed || active || pendingTile || pendingHypersync) return;
    // Reuse a rolled-but-uncommitted die (e.g. after cancelling the dialog, or an
    // Undo) so it repeats the same roll; otherwise roll fresh.
    const die = (pendingDieRef.current ?? rollAiDie()) as CommandNum;
    pendingDieRef.current = die;
    botDieRef.current = die;
    activeMarkerRef.current = die;
    setUi((u) => ({ ...u, botDie: die, activeMarker: die }));
    const key = markerPosKey(die, ui.markerSteps[die]);
    const tp = trackPos(key);
    // Modular tile slots (I/II/III) carry an explicit tile action — open its
    // dialog (with a ▶ Start Your Turn button) like every other action, rather
    // than resolving instantly. Every other spot sits on a printed Action space,
    // resolved via the nearest Action hotspot (the full DetailPanel flow).
    if (tp?.action) {
      // Hypersync mode replaces slot I's tile (C01) with C12 → the Hypersync flow.
      const hs = hypersyncCodeAtSlot(key);
      if (hs) {
        setResult([]);
        setPendingHypersync({ code: hs, readOnly: false });
        return;
      }
      // TrackPos.action on a tile slot is always a modular tile action.
      setResult([]);
      setPendingTile(tp.action as ChronossusTileActionId);
      return;
    }
    const [x, y] = positions[key] ?? [0, 0];
    const h = nearestHotspot(x, y);
    // Hypersync mode covers the Time Travel space with C13 → the Hypersync flow.
    if (h.action === 'time-travel') {
      const hs = hypersyncCodeForTimeTravel();
      if (hs) {
        setResult([]);
        setPendingHypersync({ code: hs, readOnly: false });
        return;
      }
    }
    onTileClick(h, true); // die-driven turn: activate, not rule-view
  };

  // Commit a modular tile action (Reboot / Score / Energy Pack). No player input,
  // so ▶ Start resolves it and advances the marker (the caller then closes).
  const resolveTileSlot = (actionId: ChronossusActionId) => {
    const family = TILE_ACTION_FAMILY[actionId as keyof typeof TILE_ACTION_FAMILY];
    const tileSide = family ? (state.config.tileSides?.[family] ?? 'A') : 'A';
    const { state: next, instructions } = Chronossus.resolveAction(state, { actionId, tileSide });
    // finishTurn advances the marker one step; if that lands on an Autoleap tile it
    // opens its dialog (so the chain continues one tile at a time).
    const label = Chronossus.chronossusActionLabel(actionId);
    finishTurn(next, instructions, tileAutoleap ? `Autoleap — ${label}` : label);
  };
  // ▶ Start on the tile dialog: resolve and (unless the resolution chained onto another
  // Autoleap tile) close. The result lands in History / the turn-status aside.
  const startTileTurn = () => {
    if (!pendingTile) return;
    chainOpenRef.current = false; // finishTurn re-sets it if the chain continues
    resolveTileSlot(pendingTile);
    if (!chainOpenRef.current) closeTile();
  };
  // Close the tile dialog. If it hasn't resolved yet (no result), the marker does
  // not advance (a cancelled turn).
  const closeTile = () => {
    setPendingTile(null);
    setTileAutoleap(false);
    setTileRuleView(false);
    setResult([]);
    botDieRef.current = null;
    activeMarkerRef.current = null;
    pendingDieRef.current = null;
    chainOpenRef.current = false;
    setUi((u) => ({ ...u, botDie: null, activeMarker: null }));
  };

  // Commit a C12/C13 Hypersync Action once the HypersyncDialog has walked the
  // player through its branch (hex placement / Time Travel fallback / Failed).
  const resolveHypersyncTurn = (input: Chronossus.HypersyncActionInput) => {
    const { state: next, instructions, autoleap } = Chronossus.resolveHypersyncAction(state, input);
    // Autoleap tiles (C12B/C13B): advance the marker one EXTRA space after resolving,
    // on every outcome (including a Failed Action). Skip when the chain opened the
    // dialog (its resolve already lands the extra step) to avoid a double-advance.
    const extraLeap = autoleap === true && !pendingHypersync?.viaChain;
    setPendingHypersync(null); // close the Hypersync dialog
    // Advance the marker + resolve any Autoleap it lands on (may re-open a Hypersync
    // dialog if the marker moves onto a Hypersync Autoleap tile).
    finishTurn(next, instructions, CHRONOSSUS_TILES[input.code]?.name ?? input.code, extraLeap);
  };
  const closeHypersync = () => {
    setPendingHypersync(null);
    botDieRef.current = null;
    activeMarkerRef.current = null;
    pendingDieRef.current = null;
    // Cancelling (not committing) abandons any rolled hex → next open rolls fresh.
    setUi((u) => ({ ...u, botDie: null, activeMarker: null, hsRolledHex: null }));
  };
  const changeEra = (d: number) =>
    setState((s) => ({ ...s, era: Math.max(1, Math.min(Chronossus.MAX_ERA, s.era + d)) }));
  const playerPass = () => {
    closePanel();
    setState((s) => ({ ...s, playerPassed: true }));
  };
  const bothPassed = Chronossus.actionRoundsEnded(state);
  // A bot turn is underway (an action or tile dialog is open, not a rule view).
  // While it is, the turn controls hide and only the rolled die shows (like the
  // Chronobot), returning once the dialog completes.
  const actionInProgress =
    (active != null && !ruleView) ||
    (pendingTile != null && !tileRuleView) ||
    (pendingHypersync != null && !pendingHypersync.readOnly);

  // This Era's committed bot Action turns (drives the Turn tracker + its hover
  // list). Excludes the pre-Action phase events (Power Up / Warp / Paradox), which
  // still appear in the full History pane but are not Action Rounds "turns".
  const thisEraEntries: HistoryEntry[] = entries.filter(
    (e) =>
      e.state.era === state.era && !/You passed|Power Up:|Warp:|Paradox/.test(e.label),
  );
  const turnsThisEra = thisEraEntries.length;

  // Debug toggle: turning it OFF also forces the dev-only outline/calibrate off
  // (so they can't get stuck on) and closes any open panel — mirrors the Chronobot.
  const toggleDebug = () => {
    setDebug((d) => {
      const next = !d;
      if (!next) {
        setOutline(false);
        setCalibrate(false);
      }
      return next;
    });
  };

  // The shared ⚙ settings menu (identical to the Chronobot; themed via the
  // Chronossus tokens). One element, rendered in both the top bar and the rules
  // frame — each gets its own open state.
  const settingsMenu = (
    <SettingsMenu
      debug={debug}
      onToggleDebug={toggleDebug}
      outline={outline}
      onToggleOutline={() => setOutline((o) => !o)}
      calibrate={calibrate}
      onToggleCalibrate={() => {
        closePanel();
        setCalibrate((c) => !c);
      }}
      onReset={reset}
      historyOpen={showHistory}
      onToggleHistory={() => setShowHistory((v) => !v)}
      simpleView={simpleView}
      onToggleSimpleView={() => setSimpleView((v) => !v)}
    />
  );

  // Full top bar — mirrors the Chronobot StatsBar (recolored to the Chronossus
  // scheme). The AI-die / pass / undo / history controls are visible-but-disabled
  // stubs for now (those systems land with the Command-token feature).
  const topBar = (
    <div className="stats-bar cx-statsbar">
      <div className="stats-left">
        <button className="home-btn" onClick={onHome} title="Back to the home screen" aria-label="Home">
          <img src="/favicon-512.png" alt="" />
        </button>
      </div>
      {!calibrate && (
        <div className="bot-turn">
          <CxVpPill score={score} totalActions={bot.totalActions} />
          <div className="turn-core">
            {!actionInProgress && (
              <button
                className={`take-bot-action ${bot.passed ? 'passed' : ''}`}
                onClick={takeBotTurn}
                disabled={bot.passed}
                title={
                  bot.passed
                    ? 'The Chronossus has passed for this Era'
                    : `Roll the AI die (faces ${AI_DIE_FACES.join(',')}) and activate that Command marker`
                }
              >
                {bot.passed ? '✓ Bot Passed' : 'Take Bot Action'}
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
                onClick={playerPass}
                disabled={state.playerPassed}
                title="Pass for the Action Rounds phase"
              >
                {state.playerPassed ? '✓ You passed' : 'You Pass'}
              </button>
            )}
            <button
              className="undo-btn"
              onClick={undoTurn}
              disabled={!canUndo || actionInProgress}
              title="Undo the last committed turn"
            >
              ↶ Undo
            </button>
          </div>
          <button
            className={`stat-pill status-chip turn-chip ${showStatus ? 'on' : ''}`}
            onClick={() => setShowStatus((v) => !v)}
            title="Turn tracker — pass status & recent bot turns"
            aria-pressed={showStatus}
          >
            Turn <b>{turnsThisEra}</b>
          </button>
        </div>
      )}
      <div className="stats-controls">
        <RulesButton onClick={() => setModeRules(true)} />
        {settingsMenu}
      </div>
    </div>
  );

  // The GameBrain rules reference overlay (persistent iframe). Kept mounted across
  // phases so its scroll/session survives Back-to-Game — mirrors the Chronobot's
  // {modals}. Opens on the "Solo Chronossus" chat preset.
  const rulesModal = (
    <RulesFrame
      open={modeRules}
      onBack={() => setModeRules(false)}
      onHome={onHome}
      src={rulesFrameUrl('Solo Chronossus')}
      settings={settingsMenu}
    />
  );

  // Unified Debug bar (Debug dropdown + jump-to-phase), shown in every phase view
  // when Debug is on. Mirrors the Chronobot's DebugBar.
  const debugBar = debug ? (
    <DebugBar
      phases={PHASE_RAIL}
      currentPhase={state.phase}
      onGoPhase={goPhase}
      era={state.era}
      maxEra={Chronossus.MAX_ERA}
      onEra={changeEra}
      paradoxes={paradoxes}
      onParadox={(d) => setParadoxes((n) => Math.max(0, Math.min(3, n + d)))}
      impact={state.impact}
      onToggleImpact={() => setState((s) => ({ ...s, impact: !s.impact }))}
      onEndActions={endActions}
      warpTiles={bot.warpTilesOnTimeline}
      onWarpTiles={(d) =>
        setState((s) => ({
          ...s,
          chronossus: {
            ...s.chronossus!,
            warpTilesOnTimeline: Math.max(0, s.chronossus!.warpTilesOnTimeline + d),
          },
        }))
      }
      timeTravel={Math.min(bot.timeTravelTrack, Chronobot.TIME_TRAVEL_VP.length - 1)}
      maxTimeTravel={Chronobot.TIME_TRAVEL_VP.length - 1}
      onTimeTravel={(d) =>
        setState((s) => ({
          ...s,
          chronossus: {
            ...s.chronossus!,
            timeTravelTrack: Math.max(
              0,
              Math.min(Chronobot.TIME_TRAVEL_VP.length - 1, s.chronossus!.timeTravelTrack + d),
            ),
          },
        }))
      }
      extra={
        <OverlayDebugControls
          count={(k) => overlayCount(bot, k)}
          onSet={(k, v) =>
            setState((s) => ({
              ...s,
              chronossus: withOverlayCount(s.chronossus!, k, v),
            }))
          }
        />
      }
    />
  ) : null;

  // ---- Phase 5: Action Rounds (the real board) ---------------------------
  // The full board stage (Phase 5 board + SCV + dialogs). Reused read-only as the
  // "Status" tab of the shared PhaseScreen in the non-Action phases.
  const boardStage = (
        <div
          className={`board-stage cx-stage ${showHistory ? 'with-history' : ''}`}
          ref={setStageEl}
        >
          {/* Mobile: the action box renders in flow at the top, pushing the board
              down; disappears on close. Desktop: absolute on the board (below). */}
          {scvMode === 'below' && renderDetailPanel(true)}
          {simpleView && !calibrate && scvMode === 'side' && (
            <CxSimpleCommandView
              rows={scvRows}
              activeMarker={activeMarker}
              onShowRules={showActionRules}
              onShowTileRules={showTileRulesByCode}
              variant="side"
            />
          )}
          <div
            className={`board-wrap ${calibrate ? 'calibrating' : ''}`}
            onClick={onBoardClick}
          >
            <img
              src="/assets/solo/board-chronossus.jpg"
              alt="Chronossus solo board"
              className="board"
            />

              {CHRONOSSUS_ACTION_HOTSPOTS.map((h) => {
                const [l, t] = positions[hsKey(h.id)] ?? HS_CENTER(h);
                const isActive = active?.id === h.id;
                const sel = calibrate && selected === hsKey(h.id);
                return (
                  <button
                    key={h.id}
                    // Transparent click target over the tile printed on the board
                    // (no overlaid image). `outlined` only while calibrating.
                    className={`hotspot ${outline || calibrate ? 'outlined' : ''} ${isActive ? 'active' : ''} ${sel ? 'cal-selected' : ''}`}
                    style={{
                      left: `${l}%`,
                      top: `${t}%`,
                      width: `${hsWidth}%`,
                      height: `${hsHeight}%`,
                    }}
                    onClick={
                      isActionsPhase || calibrate
                        ? (e) => {
                            e.stopPropagation();
                            onTileClick(h);
                          }
                        : undefined
                    }
                    title={CHRONOBOT_ACTIONS[h.action].label}
                    aria-label={CHRONOBOT_ACTIONS[h.action].label}
                  />
                );
              })}

              {/* Command markers on their tracks. Calibrating: show every distinct
                  track position as a selectable ghost; otherwise the 4 live markers
                  at their current step (paired-split when they share a spot). */}
              {calibrate
                ? CHRONOSSUS_TRACK_POSITIONS.map((p) => {
                    const [x, y] = positions[p.key] ?? p.pos;
                    return (
                      <div
                        key={p.key}
                        className={`cmd-spot ${p.label ? 'cx-slot' : ''} ${selected === p.key ? 'cal-selected' : ''}`}
                        style={{ left: `${x}%`, top: `${y}%` }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelected(p.key);
                        }}
                        title={p.label ? `Modular tile slot ${p.label}` : p.key}
                      >
                        {p.label ?? (selected === p.key ? '◎' : '·')}
                      </div>
                    );
                  })
                : COMMAND_NUMS.map((num) => {
                    const key = markerPosKey(num, markerSteps[num]);
                    const [x, y] = positions[key] ?? [0, 0];
                    // Split markers that share a board spot so all stay visible.
                    const sharers = COMMAND_NUMS.filter(
                      (n) => markerPosKey(n, markerSteps[n]) === key,
                    );
                    const rank = sharers.indexOf(num);
                    const dx =
                      sharers.length > 1
                        ? (rank - (sharers.length - 1) / 2) * (markerWidth * 0.7)
                        : 0;
                    return (
                      <img
                        key={num}
                        src={`/assets/solo/commands/chronossus-marker-${num}.png`}
                        alt={`Command marker ${num}`}
                        className={`cx-cmd-marker ${activeMarker === num ? 'active' : ''}`}
                        style={{
                          left: `${x + dx}%`,
                          top: `${y}%`,
                          width: `${markerWidth}%`,
                          zIndex: 4 + rank,
                        }}
                      />
                    );
                  })}

              {/* Modular tile art (I/II/III) — the printed tile SPACE, a separate
                  board location from where the marker lands. Base-game setup:
                  I=C01A Reboot, II=C02A Score, III=C03A Energy Pack. Selectable in
                  calibrate mode (its own calibration position). */}
              {MOD_SLOTS.map((p) => {
                const k = tileKey(p.key);
                const [x, y] = positions[k] ?? p.tilePos ?? p.pos;
                const sel = calibrate && selected === k;
                // Render the live tile for this mode (family + selected A/B side).
                const code = slotTileCode(p);
                return (
                  <img
                    key={k}
                    className={`cx-tile-art ${sel ? 'cal-selected' : ''}`}
                    src={`/assets/solo/chronossus/tiles/${code}.png`}
                    alt={`Modular tile ${code}`}
                    style={{ left: `${x}%`, top: `${y}%`, width: `${tileWidth}%` }}
                    title={`Slot ${p.label} · ${code}${p.action ? ` — ${TILE_DESC[p.action] ?? ''}` : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onTileArtClick(p);
                    }}
                  />
                );
              })}

              {/* Hypersync mode: C13 tile COVERS the printed Time Travel space.
                  Render its art centered on the Time Travel hotspot; a tap opens
                  the Hypersync rules (or, in debug, takes the Action). */}
              {(() => {
                const ttCode = hypersyncCodeForTimeTravel();
                if (!ttCode) return null;
                const ttHs = CHRONOSSUS_ACTION_HOTSPOTS.find((h) => h.action === 'time-travel');
                if (!ttHs) return null;
                const [x, y] = positions[hsKey(ttHs.id)] ?? HS_CENTER(ttHs);
                return (
                  <img
                    className="cx-tile-art cx-tile-cover"
                    src={`/assets/solo/chronossus/tiles/${ttCode}.png`}
                    alt={`Modular tile ${ttCode} (covers Time Travel)`}
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      width: `${tileWidth}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    title={`Covers Time Travel · ${ttCode} — ${CHRONOSSUS_TILES[ttCode]?.name ?? ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      closeDialogs();
                      setPendingHypersync({ code: ttCode, readOnly: !debug });
                    }}
                  />
                );
              })()}

              {/* Count/track badges (buildings, resources, workers, etc.). Tap a
                  badge (outside calibrate) for a themed info popover. */}
              {CHRONOSSUS_COUNTERS.map((c) => {
                const [x, y] = positions[c.key] ?? c.pos;
                const sel = calibrate && selected === c.key;
                const open = !calibrate && tappedBadge === c.key;
                return (
                  <div
                    key={c.key}
                    className={`count-badge ${sel ? 'cal-selected' : ''} ${!calibrate ? 'clickable' : ''}`}
                    style={{ left: `${x}%`, top: `${y}%` }}
                    title={calibrate ? c.label : undefined}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (calibrate) {
                        setSelected(c.key);
                      } else {
                        setTappedRect(e.currentTarget.getBoundingClientRect());
                        setTappedBadge((k) => (k === c.key ? null : c.key));
                      }
                    }}
                  >
                    {calibrate ? (sel ? '◎' : '·') : counterValue(bot, c.key)}
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
                    {/* The Exosuit tracker also surfaces the Energy Pool (the two
                        feed each other: the pool powers up Exosuits each Era). */}
                    {open && c.key === 'mech' && (
                      <BadgePopover rect={tappedRect} variant="text">
                        <div className="cx-mech-pop">
                          <div>
                            {bot.exosuitsAvailable} powered Exosuit
                            {bot.exosuitsAvailable === 1 ? '' : 's'} available
                          </div>
                          <div className="cx-mech-pop-energy">
                            <span className="cx-mech-pop-label">Energy Pool</span>
                            <CxEnergyPool pool={bot.energyPool} size={24} />
                          </div>
                          {hypersyncMode && (
                            <div className="cx-mech-pop-energy">
                              <span className="cx-mech-pop-label">Hypersync tiles</span>
                              <span>
                                {bot.hypersyncTiles.length}/{Chronossus.MAX_HYPERSYNC_TILES}
                                {bot.hypersyncTiles.length > 0
                                  ? ` (Eras ${[...bot.hypersyncTiles].sort((a, b) => a - b).join(', ')})`
                                  : ''}
                              </span>
                            </div>
                          )}
                        </div>
                      </BadgePopover>
                    )}
                    {open && c.key !== 'breakthrough' && c.key !== 'mech' && (
                      <BadgePopover rect={tappedRect} variant="text">
                        {counterInfo(bot, c)}
                      </BadgePopover>
                    )}
                  </div>
                );
              })}

              {/* Bot-placement overlay art — covers the real board spot when the
                  Chronossus owns > 0 of a type. Shared art with the Chronobot. */}
              <BotOverlayLayer
                overlays={CHRONOSSUS_OVERLAYS}
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
                    const [x, y] = positions[key] ?? CHRONOSSUS_TIME_TRAVEL_TRACK.spots[i];
                    return (
                      <img
                        key={key}
                        src="/assets/solo/timetravel-marker.png"
                        alt=""
                        className={`tt-marker ${selected === key ? 'cal-selected' : 'cal-ghost'}`}
                        style={{ left: `${x}%`, top: `${y}%`, width: `${ttWidth}%` }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelected(key);
                        }}
                      />
                    );
                  })
                : (() => {
                    const spot = Math.min(bot.timeTravelTrack, TT_KEYS.length - 1);
                    const [x, y] = positions[ttKey(spot)] ?? CHRONOSSUS_TIME_TRAVEL_TRACK.spots[spot];
                    return (
                      <img
                        src="/assets/solo/timetravel-marker.png"
                        alt="Time Travel marker"
                        className="tt-marker"
                        style={{ left: `${x}%`, top: `${y}%`, width: `${ttWidth}%` }}
                      />
                    );
                  })()}

              {/* Warp-tile marker (image + count underneath). */}
              {(() => {
                const [wx, wy] = positions[WARP_KEY] ?? CHRONOSSUS_WARP_MARKER.pos;
                const sel = calibrate && selected === WARP_KEY;
                return (
                  <div
                    className={`warp-marker ${sel ? 'cal-selected' : ''}`}
                    style={{ left: `${wx}%`, top: `${wy}%`, width: `${warpWidth}%` }}
                    title={`Chronossus Warp tiles on the Timeline: ${bot.warpTilesOnTimeline}`}
                    onClick={
                      calibrate
                        ? (e) => {
                            e.stopPropagation();
                            setSelected(WARP_KEY);
                          }
                        : undefined
                    }
                  >
                    <img className="warp-img" src="/assets/solo/chronossus/warp-tile.png" alt="Chronossus Warp tile" />
                    <span className="warp-count">{bot.warpTilesOnTimeline}</span>
                  </div>
                );
              })()}

              {/* Paradox slots — only the placed ones show (all 3 while calibrating). */}
              {PDX_KEYS.map((key, i) => {
                const filled = i < paradoxes;
                if (!calibrate && !filled) return null;
                const [px, py] = positions[key] ?? CHRONOSSUS_PARADOX_SLOTS.slots[i];
                const sel = calibrate && selected === key;
                const rot = i === 1 ? -90 : 90;
                return (
                  <img
                    key={key}
                    src="/assets/solo/paradox.png"
                    alt={`Paradox slot ${i + 1}`}
                    title={`Paradox ${paradoxes}`}
                    className={`paradox-slot ${sel ? 'cal-selected' : ''} ${calibrate && !filled ? 'cal-ghost' : ''}`}
                    style={{
                      left: `${px}%`,
                      top: `${py}%`,
                      width: `${paradoxWidth}%`,
                      transform: `translate(-50%, -50%) rotate(${rot}deg)`,
                    }}
                    onClick={
                      calibrate
                        ? (e) => {
                            e.stopPropagation();
                            setSelected(key);
                          }
                        : undefined
                    }
                  />
                );
              })}

              {simpleView && !calibrate && scvMode === 'overlay' && (
                <CxSimpleCommandView
                  rows={scvRows}
                  activeMarker={activeMarker}
                  shown={simpleViewShown}
                  onToggleShown={() => setSimpleViewShown((v) => !v)}
                  onShowRules={showActionRules}
              onShowTileRules={showTileRulesByCode}
                />
              )}
              {scvMode !== 'below' && renderDetailPanel(false)}
              {pendingTile && (
                <CxTileDialog
                  action={pendingTile}
                  tileSides={state.config.tileSides}
                  panel={CHRONOSSUS_PANEL}
                  readOnly={tileRuleView}
                  autoleap={tileAutoleap}
                  startLabel={startLabel}
                  onStart={startTileTurn}
                  onClose={cancelPanel}
                />
              )}
              {pendingHypersync && (
                <HypersyncDialog
                  code={pendingHypersync.code}
                  bot={bot}
                  era={state.era}
                  targeted={hypersyncTargeted}
                  failVP={failedActionVP}
                  readOnly={pendingHypersync.readOnly}
                  panel={CHRONOSSUS_PANEL}
                  rolledHex={ui.hsRolledHex}
                  onRollHex={(hex) => setUi((u) => ({ ...u, hsRolledHex: hex }))}
                  startLabel={nextMarkerIsAutoleap ? startLabel : undefined}
                  onResolve={resolveHypersyncTurn}
                  onClose={closeHypersync}
                />
              )}
              {showHypersyncTilePrompt && active && (
                <HypersyncTilePrompt
                  era={state.era}
                  actionLabel={CHRONOBOT_ACTIONS[active.action].label}
                  panel={CHRONOSSUS_PANEL}
                  onConfirm={confirmHypersyncTile}
                  onCancel={cancelHypersyncTile}
                />
              )}
            </div>
            {simpleView && !calibrate && scvMode === 'below' && (
              <CxSimpleCommandView
                rows={scvRows}
                activeMarker={activeMarker}
                onShowRules={showActionRules}
              onShowTileRules={showTileRulesByCode}
                variant="below"
              />
            )}
            {showHistory && !calibrate && (
              <HistoryPane entries={entries} onClose={() => setShowHistory(false)} />
            )}
          </div>
  );

  if (state.phase === 'actions') {
    return (
      <div className="chronossus-harness">
        {rulesModal}
        {topBar}
        {debugBar}
        {boardStage}
          {calibrate && (
            <CalibrationPanel
              positions={positions}
              selected={selected}
              onSelect={setSelected}
              hsWidth={hsWidth}
              onHsWidth={setHsWidth}
              hsHeight={hsHeight}
              onHsHeight={setHsHeight}
              markerWidth={markerWidth}
              onMarkerWidth={setMarkerWidth}
              tileWidth={tileWidth}
              onTileWidth={setTileWidth}
              ttWidth={ttWidth}
              onTtWidth={setTtWidth}
              warpWidth={warpWidth}
              onWarpWidth={setWarpWidth}
              paradoxWidth={paradoxWidth}
              onParadoxWidth={setParadoxWidth}
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
          {bothPassed && !showFirstPlayer && (
            <div className="end-phase-banner">
              <span>✓ Everyone has passed — the Action Rounds Phase is complete.</span>
              <button className="phase-primary" onClick={endActions}>
                Continue to Clean Up ▶
              </button>
            </div>
          )}
          {!calibrate && showStatus && (
            <TurnBarOverview
              botName="Chronossus"
              era={state.era}
              phaseNumber={PHASE_NUMBER[state.phase] ?? '—'}
              playerPassed={state.playerPassed}
              botPassed={bot.passed}
              actionsThisEra={turnsThisEra}
              countLabel="Turns"
              extraFlags={
                <>
                  <TapFlag className="cx-exosuit-flag" hint="Powered Exosuits available this Era">
                    <CxExosuit count={bot.exosuitsAvailable} size={18} />
                  </TapFlag>
                  <TapFlag
                    className="cx-energy-flag"
                    hint="Energy Pool — non-exhausted Energy Cores / Exhausted Energy Cores"
                  >
                    <CxEnergyPool pool={bot.energyPool} size={18} />
                  </TapFlag>
                  {hypersyncMode && (
                    <TapFlag
                      className="cx-hypersync-flag"
                      hint="Pending Solo Hypersync tiles (max one per Era, 3 total)"
                    >
                      <img
                        src="/assets/solo/chronossus/hypersync-solo-tile.png"
                        alt="Hypersync tiles"
                        width={18}
                        height={18}
                      />
                      {bot.hypersyncTiles.length}/{Chronossus.MAX_HYPERSYNC_TILES}
                    </TapFlag>
                  )}
                </>
              }
              hint={chronossusTurnHint(bot)}
              canEnd={bothPassed}
              turnRules={CHRONOSSUS_PHASE_META.actions?.rules}
              difficulty={state.config.difficulty.map((f) =>
                chronossusDifficultyLabel(f, state.config.difficultyValues),
              )}
              entries={thisEraEntries}
              passingRule={Chronossus.CHRONOSSUS_PASSING_RULE}
              onClose={() => setShowStatus(false)}
            />
          )}

        {/* Ready-to-begin splash (once/Era); if the Chronossus is First Player its
            button fires the first Take Bot Action. */}
        {!calibrate &&
          !bothPassed &&
          turnsThisEra === 0 &&
          !bot.passed &&
          !state.playerPassed &&
          actionsIntroEra !== state.era && (
            <ReadyToBegin
              firstPlayer={state.firstPlayer}
              era={state.era}
              botName="Chronossus"
              onDismiss={() => setActionsIntroEra(state.era)}
              onTakeBotAction={() => {
                setActionsIntroEra(state.era);
                takeBotTurn();
              }}
            />
          )}

        {/* End of Action Rounds → who's First Player next Era → Clean Up. */}
        {showFirstPlayer && (
          <FirstPlayerPrompt
            botName="Chronossus"
            onAnswer={answerFirstPlayer}
            onCancel={() => setShowFirstPlayer(false)}
          />
        )}
      </div>
    );
  }

  // ---- Setup: the pre-game flow (Intro → Modules → Difficulty → Setup) --
  if (state.phase === 'setup') {
    return (
      <>
        {rulesModal}
        {debugBar}
        <ChronossusSetupFlow onHome={onHome} onBegin={beginGame} />
      </>
    );
  }

  // ---- End Game: score screen -------------------------------------------
  if (state.phase === 'endgame') {
    return (
      <div className="chronossus-harness">
        {rulesModal}
        {topBar}
        {debugBar}
        <CxScoreScreen
          state={state}
          score={score}
          totalActions={bot.totalActions}
          onHome={onHome}
          onNewGame={reset}
        />
      </div>
    );
  }

  // ---- Non-Phase-5 phases: shared PhaseScreen shell ----------------------
  const meta = CHRONOSSUS_PHASE_META[state.phase];
  const phaseProps = {
    era: state.era,
    phaseNumber: meta?.number ?? 0,
    phaseName: meta?.name ?? state.phase,
    overview: meta?.overview,
    onHome,
    hero: HERO,
    statusLabel: 'Chronossus Status',
    heroAlt: 'Chronossus',
    headerRight: (
      <>
        <CxVpPill score={score} totalActions={bot.totalActions} />
        {/* Same Undo as the Action Rounds top bar: restores the last committed step of
            this phase — rolls come back as they were rather than being re-rolled. */}
        <button
          className="undo-btn cx-undo-btn"
          onClick={undoTurn}
          disabled={!canUndo}
          title="Undo the last committed step"
        >
          ↶ Undo
        </button>
        <RulesButton onClick={() => setModeRules(true)} />
      </>
    ),
    statusView: boardStage,
  };

  let body: React.ReactNode;
  switch (state.phase) {
    case 'powerup':
      body = (
        <>
          {meta?.rules && <p className="phase-note">{meta.rules}</p>}
          {lastDraw ? (
            <>
              <div className="cx-drawn">
                <div className="cx-drawn-row">
                  <span className="cx-drawn-label">
                    Drew {lastDraw.energized + lastDraw.exhausted}:
                  </span>
                  <CxEnergyPool
                    pool={{ energized: lastDraw.energized, exhausted: lastDraw.exhausted }}
                    size={24}
                  />
                </div>
                <div className="cx-drawn-row">
                  <span className="cx-drawn-label">Back to the pool:</span>
                  {lastDraw.exhausted > 0 ? (
                    <span className="cx-energy" title="One Exhausted Energy Core returns">
                      <img src={EEC_ICON} alt="Exhausted Energy Core" style={{ height: 24 }} />
                      <b>1</b>
                    </span>
                  ) : (
                    <span className="cx-drawn-none">nothing</span>
                  )}
                  <span className="cx-drawn-note">
                    (the rest are removed from the game)
                  </span>
                </div>
                <div className="cx-drawn-row">
                  <span className="cx-drawn-label">Pool now:</span>
                  <CxEnergyPool pool={bot.energyPool} size={24} />
                </div>
                <p className="cx-user-action">
                  <span className="cx-user-action-icon" aria-hidden="true">
                    <img className="cx-exosuit-outlined" src={EXOSUIT_ICON} alt="" />
                    <img src={PATH_ICON} alt="" />
                  </span>
                  <span>
                    Powered up <b>{bot.exosuitsAvailable}</b> Exosuit
                    {bot.exosuitsAvailable === 1 ? '' : 's'}. Set these aside ready to
                    place on the board for this Era.
                  </span>
                </p>
              </div>
              <button className="phase-primary" onClick={() => goPhase('warp')}>Continue to Warp ▶</button>
            </>
          ) : (
            <button className="phase-primary" onClick={drawAndPowerUp}>
              Draw 3 from the Energy Pool
            </button>
          )}
        </>
      );
      break;
    case 'warp':
      // Alternate Timelines' positive-space question renders under the roll result
      // rather than on its own screen, so the player still sees what was rolled and
      // placed while answering it.
      body = (
        <WarpPhaseBody
          state={state}
          meta={meta!}
          onCommit={commitWarp}
          botName="Chronossus"
          warpTileSrc="/assets/solo/chronossus/warp-tile.png"
          roll={ui.warpRoll}
          onRoll={rollWarp}
          // Alternate Timelines replaces the base turn-order instruction: the decision
          // has to be made BEFORE the roll, whoever is First Player (p.18).
          intro={
            altTimelines ? (
              <p className="phase-note">
                <b>Alternate Timelines:</b> decide how many Resources and/or Workers{' '}
                <b>you</b> are warping <b>before</b> rolling for the Chronossus. Once
                you've decided, roll below and place the tiles in turn order as usual.
              </p>
            ) : undefined
          }
          extraRules={
            altTimelines ? (
              <RulesBox label="Alternate Timelines — rulebook text">
                <p>
                  <b>WARP PHASE:</b> In the Warp Phase, you must decide how many Resources
                  and/or Workers to warp first, then roll for the Chronossus. Place the
                  tiles in turn order, as usual.
                </p>
                <p>
                  It ignores penalties (red spaces), and it receives 2 VPs instead of any
                  positive rewards. You resolve both positive and negative effects as
                  normal.
                </p>
                {altTimelinesPerSpace === 3 && (
                  <p>
                    <b>INCREASING THE DIFFICULTY:</b> The Chronossus scores 3 VPs per
                    positive effect.
                  </p>
                )}
                <p className="rules-cite">Solo Opponents rulebook, p. 18</p>
              </RulesBox>
            ) : undefined
          }
          followUp={
            altTimelinesPending != null ? (
              <div className="place-prompt">
                <p className="pp-instruct">
                  Alternate Timelines: how many of the Chronossus’s {altTimelinesPending}{' '}
                  newly placed Warp tile{altTimelinesPending === 1 ? '' : 's'} landed on a{' '}
                  <b>positive</b>-effect Timeline space?
                </p>
                <p className="pp-sub">
                  It ignores negative/penalty spaces entirely — nothing to report for
                  those. Each positive one scores it {altTimelinesPerSpace} VP.
                </p>
                <div className="difficulty-sub-values">
                  {Array.from({ length: altTimelinesPending + 1 }, (_, n) => n).map((n) => (
                    <button
                      key={n}
                      type="button"
                      className="difficulty-sub-value"
                      onClick={() => finishWarp(altTimelinesPending, n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            ) : undefined
          }
        />
      );
      break;
    case 'cleanup': {
      // Impact + game-end flow, identical to the Chronobot: the Impact resolves at
      // the end of Era 4; in the post-Impact Eras 5–6 flipping the Collapsing
      // Capital tiles decides whether the game continues; Era 7 always ends.
      const era = state.era;
      const postImpact = era === 5 || era === 6;
      const finalEra = era >= Chronossus.MAX_ERA;
      body = (
        <>
          <p className="phase-note">
            Retrieve the Chronossus’s Exosuits along with your own.
          </p>
          {era === 4 && (
            <p className="phase-note">
              <b>The Impact occurs now</b> — resolve it using the usual procedure at
              the end of Era 4. From Era 5 on, the Chronossus powers up 2+X Exosuits
              (max 4) instead of 3+X (max 6).
            </p>
          )}
          {postImpact && (
            <p className="phase-note">
              Flip the Collapsing Capital tiles using the usual procedure, then check
              for game end.
            </p>
          )}
          {meta?.rules && <p className="phase-note">{meta.rules}</p>}
          {finalEra ? (
            <button className="phase-primary" onClick={afterCleanUp}>
              Finish &amp; Score ▶
            </button>
          ) : postImpact ? (
            <>
              <div className="capital-check">
                Are all Collapsing Capital tiles flipped? If so, proceed to Game Ended
                below.
              </div>
              <div className="setup-actions">
                <button
                  className="phase-primary"
                  onClick={() => setShowFirstPlayer(true)}
                >
                  Game continues — start Era {era + 1} ▶
                </button>
                <button className="phase-end-pink" onClick={endGameNow}>
                  Game Ended — Finish &amp; Score
                </button>
              </div>
            </>
          ) : (
            <button className="phase-primary" onClick={afterCleanUp}>
              End the Era — start Era {era + 1} ▶
            </button>
          )}
        </>
      );
      break;
    }
    case 'paradox':
      body = (
        <ParadoxPhaseBody
          key={`paradox-${paradoxNonce}`}
          state={state}
          // Variable Anomalies: anomalyVps replaces the flat counter, which stays 0
          // in those games — shim the "Anomalies X/3" display to read the real count.
          bot={{ ...bot, anomalies: bot.anomalyVps?.length ?? bot.anomalies }}
          meta={meta!}
          onRoll={rollBotParadox}
          onAdvance={advanceParadox}
          botName="Chronossus"
          hypersyncTiles={hypersyncMode ? bot.hypersyncTiles.length : undefined}
          pendingRoll={ui.paradoxRoll}
          followUp={
            variableAnomalyPending ? (
              <VariableAnomalyGainPrompt onConfirm={finishVariableAnomalyGain} />
            ) : undefined
          }
        />
      );
      break;
    case 'preparation':
      body = (
        <button
          className="phase-primary"
          onClick={() => {
            const next = advanceFromPreparation(state);
            commitPhase(next, enteredLabel(next));
          }}
        >
          Continue ▶
        </button>
      );
      break;
  }

  return (
    <>
      {rulesModal}
      {debugBar}
      <PhaseScreen {...phaseProps}>{body}</PhaseScreen>
      {showFirstPlayer && (
        <FirstPlayerPrompt
          botName="Chronossus"
          onAnswer={answerFirstPlayer}
          onCancel={() => setShowFirstPlayer(false)}
        />
      )}
    </>
  );
}

// --------------------------------------------------------------------------
// Tile-action dialog — the modular tiles (Reboot / Score / Energy Pack). Matches
// the printed-action DetailPanel format: tile art + name in the head, a friendly
// instruction, and a ▶ Start Your Turn button (then the result). Reuses the
// shared .detail-panel / .start-turn styling.
//
// The current base tiles have simple rules the instruction line fully conveys, so
// the collapsible verbatim rules box is suppressed for them. More involved tiles
// (e.g. the Autoleap "skip"/token-advance tiles) will want it — add their codes
// to TILES_WITH_RULES_BOX and the box renders automatically.
// --------------------------------------------------------------------------

/** Friendly, player-facing instruction derived from a tile code's effect. */
function tileInstruction(code: string): string {
  const eff = tileEffect(code);
  const parts: string[] = [];
  if (eff.vp) parts.push(`scores +${eff.vp} VP`);
  if (eff.energyCores)
    parts.push(
      `adds ${eff.energyCores} non-exhausted Energy Core${eff.energyCores === 1 ? '' : 's'} to its Energy Pool`,
    );
  let s = parts.length
    ? `The Chronossus ${parts.join(' and ')}.`
    : 'The Chronossus does nothing this turn — its Command marker still advances.';
  if (eff.autoleap) s += ' Its Command marker then advances one EXTRA step (Autoleap).';
  return s;
}

function CxTileDialog({
  action,
  tileSides,
  panel,
  readOnly = false,
  autoleap = false,
  startLabel = '▶ Start Your Turn',
  onStart,
  onClose,
}: {
  action: ChronossusTileActionId;
  tileSides?: Record<string, 'A' | 'B'>;
  panel: [number, number, number, number];
  readOnly?: boolean;
  /** Reached by an Autoleap (marker moved onto it) — show the Autoleap note. */
  autoleap?: boolean;
  /** Commit-button label ("Advance to Autoleap Action" when the next step autoleaps). */
  startLabel?: string;
  onStart: () => void;
  onClose: () => void;
}) {
  const code = liveTileCode(action as keyof typeof TILE_ACTION_FAMILY, tileSides);
  const tile = CHRONOSSUS_TILES[code];
  // Surface the verbatim rules box for B-side tiles (Autoleap / combined effects).
  const showRulesBox = code.endsWith('B');
  const [showRule, setShowRule] = useState(readOnly); // play mode opens it expanded
  const [l, t, w, h] = panel;
  return (
    <div
      className="detail-panel cx-tile-dialog"
      style={{ left: `${l}%`, top: `${t}%`, width: `${w}%`, height: `${h}%` }}
      role="dialog"
      aria-label={tile.name}
    >
      <div className="dp-head">
        <div className="dp-title">
          <img
            className="cx-tile-dialog-art"
            src={`/assets/solo/chronossus/tiles/${code}.png`}
            alt={`${tile.name} tile (${code})`}
          />
          <h2>{tile.name}</h2>
        </div>
        <button className="dp-close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>
      <div className="dp-body">
        <div className="place-prompt">
          {autoleap && (
            <p className="pp-sub">
              <b>Autoleap:</b> the marker moved onto this tile, so its Action activates
              now — then the Command marker advances one extra space.
            </p>
          )}
          <p className="pp-instruct">{tileInstruction(code)}</p>
          {!readOnly && (
            <button className="start-turn" onClick={onStart}>
              {startLabel}
            </button>
          )}
        </div>

        {/* Verbatim rulebook text, collapsible — mirrors the action dialogs.
            Only for tiles complex enough to warrant it (see TILES_WITH_RULES_BOX). */}
        {showRulesBox && (
          <div className="mech-rules">
            <button className="mech-cta" onClick={() => setShowRule((s) => !s)}>
              📖 {tile.name} rules ({code}) {showRule ? '▾' : '▸'}
            </button>
            {showRule && (
              <div className="rule-body">
                {tile.rule.split('\n').map((line, i) => (
                  <p key={i} className="dp-rule">
                    {line}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// Hypersync Action dialog (C12 / C13). Walks the player through the branch:
//   1. Intro — the tile + plan. If it has a pending tile AND an Exosuit, offer to
//      check the Hypersync hexes; otherwise it Time-Travels (or Fails).
//   2. Hexes — mark any of the 3 Hypersync hex spaces already occupied.
//   3a. Hypersync — pick a random available hex (or, with the difficulty, the one
//       matching the furthest-past pending tile), place an Exosuit, retrieve the
//       oldest pending tile (2 VP), and apply the tile's post-bonus.
//   3b. Fallback — perform a normal Time Travel Action, or a Failed Action.
// --------------------------------------------------------------------------
function HypersyncDialog({
  code,
  bot,
  era,
  targeted,
  failVP,
  readOnly = false,
  panel,
  rolledHex,
  onRollHex,
  startLabel,
  onResolve,
  onClose,
}: {
  code: string;
  bot: ChronossusState;
  era: number;
  targeted: boolean;
  /** VP a Failed Action grants here (2 with the D7 difficulty active, else 1). */
  failVP: number;
  readOnly?: boolean;
  panel: [number, number, number, number];
  /** "Take Turn" (default) or "Advance to Autoleap Action" when the next step autoleaps. */
  startLabel?: string;
  /** Persisted rolled hex (ui slice), so an Undo → re-take re-shows the same roll (#4). */
  rolledHex: number | null;
  /** Persist a rolled hex to the ui slice (survives Undo). */
  onRollHex: (hex: number) => void;
  onResolve: (input: Chronossus.HypersyncActionInput) => void;
  onClose: () => void;
}) {
  const tile = CHRONOSSUS_TILES[code];
  const plan = Chronossus.hypersyncPlan(bot, era);
  const canTimeTravel = bot.warpTilesOnTimeline > 0;
  const isAutoleap = tileEffect(code).autoleap === true;
  // When a Hypersync Action is possible (pending tile + available Exosuit), skip the
  // intro and open straight on the 3 hexes; only fall back to Time Travel / Failed once
  // all 3 are marked unavailable (#11). The intro is kept for the not-canHypersync case.
  const [step, setStep] = useState<'intro' | 'hexes' | 'roll' | 'timetravel'>(
    plan.canHypersync ? 'hexes' : 'intro',
  );
  const [occupied, setOccupied] = useState<Set<number>>(new Set());
  const [l, t, w, h] = panel;

  const toggleHex = (n: number) =>
    setOccupied((s) => {
      const next = new Set(s);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });

  const available = Chronossus.HYPERSYNC_HEXES.filter((n) => !occupied.has(n));

  // Randomize between the available spaces (the app does the roll for you); the value
  // is persisted in the ui slice so an Undo → re-take shows the same roll (#4).
  const rollSpace = () => onRollHex(available[Math.floor(Math.random() * available.length)]);
  // Confirm the available spaces → auto-roll and show the result, or fall back if
  // none are free (the Time Travel dialog step, or a Failed Action when no Warp
  // tiles remain). Reuse a persisted roll (after Undo) when it's still available rather
  // than re-randomizing; otherwise roll fresh.
  const confirmHexes = () => {
    if (available.length === 0) {
      if (canTimeTravel) setStep('timetravel');
      else onResolve({ code, outcome: 'failed' });
      return;
    }
    if (rolledHex == null || !available.some((n) => n === rolledHex)) rollSpace();
    setStep('roll');
  };
  // Commit the Hypersync Action on the rolled (or targeted) space.
  const takeHypersync = () =>
    onResolve({ code, outcome: 'hypersync', hex: targeted ? undefined : (rolledHex ?? undefined) });

  return (
    <div
      className="detail-panel cx-tile-dialog"
      style={{ left: `${l}%`, top: `${t}%`, width: `${w}%`, height: `${h}%` }}
      role="dialog"
      aria-label={tile?.name ?? code}
    >
      <div className="dp-head">
        <div className="dp-title">
          {step === 'timetravel' ? (
            <>
              <img
                className="cx-tile-dialog-art"
                src="/assets/solo/actions/time-travel.png"
                alt="Time Travel"
              />
              <h2>Time Travel</h2>
            </>
          ) : (
            <>
              <img
                className="cx-tile-dialog-art"
                src={`/assets/solo/chronossus/tiles/${code}.png`}
                alt={`${tile?.name ?? code} tile (${code})`}
              />
              <h2>{tile?.name ?? code}</h2>
            </>
          )}
        </div>
        <button className="dp-close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>
      <div className="dp-body">
        {readOnly ? (
          <div className="rule-body">
            {(tile?.rule ?? '').split('\n').map((line, i) => (
              <p key={i} className="dp-rule">
                {line}
              </p>
            ))}
            <TimeTravelRuleBlock />
          </div>
        ) : step === 'intro' ? (
          <div className="place-prompt">
            {plan.canHypersync ? (
              <>
                <p className="pp-instruct">
                  The Chronossus has {plan.pendingCount} pending Hypersync tile
                  {plan.pendingCount === 1 ? '' : 's'} (furthest in the past: Era{' '}
                  {plan.oldestTileEra}) and an available Exosuit. Check which Hypersync
                  hex spaces are open on your board.
                </p>
                <button className="start-turn" onClick={() => setStep('hexes')}>
                  ▶ Check Hypersync hexes
                </button>
              </>
            ) : (
              <>
                <p className="pp-instruct">
                  No pending Hypersync Action is available
                  {plan.pendingCount === 0 && !plan.hasExosuit
                    ? ' (no retrievable tile in a prior Era, and no available Exosuit)'
                    : plan.pendingCount === 0
                      ? ' (no retrievable Hypersync tile in a prior Era)'
                      : ' (no available Exosuit)'}
                  . The Chronossus performs a normal Time Travel Action instead
                  {canTimeTravel ? '' : ', but no Warp tiles remain, so it is a Failed Action'}.
                </p>
                <button
                  className="start-turn"
                  onClick={() =>
                    canTimeTravel ? setStep('timetravel') : onResolve({ code, outcome: 'failed' })
                  }
                >
                  {canTimeTravel ? '▶ Go to Time Travel' : `▶ Failed Action (+${failVP} VP)`}
                </button>
              </>
            )}
            <HypersyncRules tile={tile} code={code} startOpen={false} />
            {isAutoleap && <AutoleapRuleBlockCollapsible />}
          </div>
        ) : step === 'hexes' ? (
          <div className="place-prompt">
            <p className="pp-instruct">
              Tap any Hypersync hex space that is already occupied on your board, then
              confirm which spaces are available.
            </p>
            <div className="hs-hex-row">
              {Chronossus.HYPERSYNC_HEXES.map((n) => {
                const off = occupied.has(n);
                return (
                  <button
                    key={n}
                    className={`hs-hex ${off ? 'occupied' : ''}`}
                    onClick={() => toggleHex(n)}
                    aria-pressed={off}
                    title={off ? 'Occupied — unavailable' : 'Available'}
                  >
                    {off ? '⊘' : n}
                  </button>
                );
              })}
            </div>
            <p className="pp-sub">
              {available.length === 0
                ? `No available space — the Chronossus performs a ${canTimeTravel ? 'Time Travel Action' : 'Failed Action'} instead.`
                : `Available: ${available.join(', ')}.`}
            </p>
            <button className="start-turn" onClick={confirmHexes}>
              {available.length === 0
                ? canTimeTravel
                  ? '▶ Go to Time Travel'
                  : `▶ Failed Action (+${failVP} VP)`
                : '▶ Confirm Available Hypersync space'}
            </button>
            <HypersyncRules tile={tile} code={code} startOpen={false} />
            {isAutoleap && <AutoleapRuleBlockCollapsible />}
          </div>
        ) : step === 'roll' ? (
          // Roll step: randomize among the available spaces → show where to place
          // the blocking bot Exosuit.
          <div className="place-prompt">
            {targeted ? (
              <>
                <p className="pp-instruct">
                  Difficulty: no random roll — the Chronossus takes the Hypersync space
                  matching its furthest-past pending tile (Era {plan.oldestTileEra}).
                </p>
                <p className="pp-sub">
                  Place a bot Exosuit on that space to block it; it scores 2 VP and
                  retrieves the tile. (No Time Travel advance.)
                </p>
                <button className="start-turn" onClick={takeHypersync}>
                  {startLabel ?? '▶ Take Turn'}
                </button>
              </>
            ) : rolledHex == null ? (
              <>
                <p className="pp-instruct">
                  Roll to randomize between the available Hypersync spaces (
                  {available.join(', ')}).
                </p>
                <div className="hs-hex-row">
                  {available.map((n) => (
                    <div key={n} className="hs-hex" aria-hidden>
                      {n}
                    </div>
                  ))}
                </div>
                <button className="start-turn" onClick={rollSpace}>
                  🎲 Roll available space
                </button>
              </>
            ) : (
              <>
                <p className="pp-instruct">
                  Place a Bot Exosuit on <b>Hypersync space {rolledHex}</b> — the
                  Chronossus takes the Hypersync tile from the oldest Era (Era{' '}
                  {plan.oldestTileEra}).
                </p>
                <div className="hs-hex-row">
                  {available.map((n) => (
                    <div
                      key={n}
                      className={`hs-hex ${n === rolledHex ? 'rolled' : 'dimmed'}`}
                      aria-hidden
                    >
                      {n}
                    </div>
                  ))}
                </div>
                <p className="pp-sub">
                  It scores 2 VP. Do not advance the Time Travel marker.
                </p>
                <button className="start-turn" onClick={takeHypersync}>
                  {startLabel ?? '▶ Take Turn'}
                </button>
              </>
            )}
          </div>
        ) : (
          // Time Travel step: the Hypersync Action fell back to a normal Time
          // Travel Action — shown like the printed Time Travel dialog.
          <div className="place-prompt">
            <p className="pp-instruct">
              Remove one of the Chronossus’s <b>Warp tiles</b> from the past Timeline tile
              where it has the most (oldest if tied), then advance its Time Travel marker.
            </p>
            <button className="start-turn" onClick={() => onResolve({ code, outcome: 'time-travel' })}>
              ▶ Start Your Turn
            </button>
            <TimeTravelRuleBlockCollapsible />
            {isAutoleap && <AutoleapRuleBlockCollapsible />}
          </div>
        )}
      </div>
    </div>
  );
}

// Variable Anomalies: the Chronossus gained an Anomaly (Paradox hit 3). Same pattern as
// Construct's building VP — state the rulebook's selection criteria, the player applies
// it to the 2 visible tiles, then reports the taken tile's printed VP and whether it
// retrieves a Warp tile. No tile-code catalog; nothing is simulated. Rendered inline as
// the Paradox phase's `followUp`, under the roll log that triggered the gain.
const VARIABLE_ANOMALY_VP_OPTIONS = [-2, -3, -4, -5, -6];
function VariableAnomalyGainPrompt({
  onConfirm,
}: {
  onConfirm: (taken: Chronossus.VariableAnomalyCandidate) => void;
}) {
  // The Warp-retrieval answer commits the gain outright — no separate Confirm step.
  // A mis-tap is fixed with ↶ Undo (which restores the roll without re-rolling it).
  const [vp, setVp] = useState<number | null>(null);
  return (
    <div className="place-prompt">
      <p className="pp-instruct">
        <b>Anomaly — the Chronossus receives one.</b> From the visible Anomaly tiles give
        it the one that <b>lets it retrieve a Warp tile</b> right now (check each tile's
        Before/After Impact icon against this Era's Impact status). If{' '}
        <b>both or neither</b> do, give it the one with the <b>smaller VP penalty</b>{' '}
        (closer to 0). Tap its printed VP.
      </p>
      <div className="vp-digits">
        {VARIABLE_ANOMALY_VP_OPTIONS.map((v) => (
          <button
            key={v}
            type="button"
            className={`vp-digit ${vp === v ? 'selected' : ''}`}
            onClick={() => setVp(v)}
          >
            {v}
          </button>
        ))}
      </div>
      {vp != null && (
        <>
          <p className="pp-instruct">
            <b>Does the tile it took retrieve a Warp tile?</b>
          </p>
          <div className="pp-buttons">
            <button
              className="pp-confirm"
              onClick={() => onConfirm({ vp, retrieveEligible: true })}
            >
              ✓ Yes — it retrieves one
            </button>
            <button
              className="pp-cannot"
              onClick={() => onConfirm({ vp, retrieveEligible: false })}
            >
              ✗ No
            </button>
          </div>
        </>
      )}
      <RulesBox label="Variable Anomalies — rulebook text">
        <p>
          <b>CHANGES AT SETUP:</b> The Chronossus ignores all unique effects of the
          Anomalies and does not receive an Anomaly Remover tile.
        </p>
        <p>
          <b>RECEIVING ANOMALIES:</b> When receiving Anomalies, the Chronossus will select
          one that will allow it to retrieve a Warp tile. If both or neither do, it will
          select the one with the smaller VP penalty.
        </p>
        <p className="rules-cite">Solo Opponents rulebook, p. 18</p>
      </RulesBox>
    </div>
  );
}

// The no-space Capital-Action fallback: place a Solo Hypersync tile on this Era
// and perform the Action normally (no Exosuit, not a Failed Action).
function HypersyncTilePrompt({
  era,
  actionLabel,
  panel,
  onConfirm,
  onCancel,
}: {
  era: number;
  actionLabel: string;
  panel: [number, number, number, number];
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [l, t, w, h] = panel;
  return (
    <div
      className="detail-panel cx-tile-dialog"
      style={{ left: `${l}%`, top: `${t}%`, width: `${w}%`, height: `${h}%` }}
      role="dialog"
      aria-label="Place a Solo Hypersync tile"
    >
      <div className="dp-head">
        <div className="dp-title">
          <img
            className="cx-tile-dialog-art"
            src="/assets/solo/chronossus/hypersync-solo-tile.png"
            alt="Solo Hypersync tile"
          />
          <h2>Hypersync tile</h2>
        </div>
        <button className="dp-close" onClick={onCancel} aria-label="Close">
          ×
        </button>
      </div>
      <div className="dp-body">
        <div className="place-prompt">
          <p className="pp-instruct">
            No Action space remained for the “{actionLabel}” Action. Place one of the
            Chronossus’s Solo Hypersync tiles <b>above Era {era}</b> and perform the Action
            normally — no Exosuit is placed, and this is <b>not</b> a Failed Action.
          </p>
          <button className="start-turn" onClick={onConfirm}>
            ▶ Place tile &amp; perform the Action
          </button>
        </div>
      </div>
    </div>
  );
}

/** Collapsible verbatim rulebook text for a Hypersync tile. */
function HypersyncRules({
  tile,
  code,
  startOpen,
}: {
  tile: (typeof CHRONOSSUS_TILES)[string] | undefined;
  code: string;
  startOpen: boolean;
}) {
  const [open, setOpen] = useState(startOpen);
  if (!tile) return null;
  return (
    <div className="mech-rules">
      <button className="mech-cta" onClick={() => setOpen((s) => !s)}>
        📖 {tile.name} rules ({code}) {open ? '▾' : '▸'}
      </button>
      {open && (
        <div className="rule-body">
          {tile.rule.split('\n').map((line, i) => (
            <p key={i} className="dp-rule">
              {line}
            </p>
          ))}
          <TimeTravelRuleBlock />
        </div>
      )}
    </div>
  );
}

// A Turn-bar tracker chip whose description opens on TAP (works on iPad, where a
// `title` hover-tooltip never appears) as well as on hover.
function TapFlag({
  className,
  hint,
  children,
}: {
  className: string;
  hint: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <span className="tap-flag-wrap">
      <button
        type="button"
        className={`eoa-flag tap-flag ${className}`}
        title={hint}
        aria-label={hint}
        onClick={() => setOpen((o) => !o)}
      >
        {children}
      </button>
      {open && (
        <span className="tap-flag-pop" role="tooltip" onClick={() => setOpen(false)}>
          {hint}
        </span>
      )}
    </span>
  );
}

// --------------------------------------------------------------------------
// Simple Command View — the Chronossus play aid mirroring the Chronobot's SCV:
// each of the 4 Command markers, the Action it currently sits on, and the AI-die
// faces. Reuses the shared .scv-* classes so it looks identical (retinted).
// --------------------------------------------------------------------------
function CxSimpleCommandView({
  rows,
  activeMarker,
  shown = true,
  onToggleShown,
  onShowRules,
  onShowTileRules,
  variant = 'overlay',
}: {
  rows: ScvRow[];
  activeMarker: CommandNum | null;
  shown?: boolean;
  onToggleShown?: () => void;
  onShowRules: (action: ChronossusActionId) => void;
  onShowTileRules: (tileCode: string) => void;
  variant?: 'overlay' | 'side' | 'below';
}) {
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  const content = (
    <>
      <div className="scv-title">What Chronossus might do next</div>
      <div className="scv-grid">
        {rows.map((r) => (
          <button
            type="button"
            className={`scv-row ${activeMarker === r.num ? 'active-row' : ''}`}
            key={r.num}
            onClick={() => (r.tile ? onShowTileRules(r.tile) : onShowRules(r.action))}
            title={`Show the ${r.label} rules`}
          >
            <div className="scv-markers">
              <img
                src={`/assets/solo/commands/chronossus-marker-${r.num}.png`}
                alt={`Command marker ${r.num}`}
                className={`scv-marker ${activeMarker === r.num ? 'active' : ''}`}
              />
            </div>
            <div className="scv-icon">
              {r.tile ? (
                <img
                  className="scv-tile-img"
                  src={`/assets/solo/chronossus/tiles/${r.tile}.png`}
                  alt={r.label}
                />
              ) : (
                <ActionIcon action={r.action as ChronobotActionId} size={58} />
              )}
            </div>
            <div className="scv-name">{r.label}</div>
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
      <RulesBox label="How the AI die moves the markers">
        <p>{CHRONOSSUS_PHASE_META.actions?.rules}</p>
      </RulesBox>
    </>
  );

  if (variant !== 'overlay') {
    return <div className={variant === 'side' ? 'scv-side' : 'scv-below'}>{content}</div>;
  }
  return (
    <>
      <button
        className={`scv-toggle ${shown ? 'shown' : ''}`}
        style={{ left: `${CX_SCV_TOGGLE[0]}%`, top: `${CX_SCV_TOGGLE[1]}%` }}
        onClick={(e) => {
          stop(e);
          onToggleShown?.();
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
            left: `${CX_SCV_BOX[0]}%`,
            top: `${CX_SCV_BOX[1]}%`,
            width: `${CX_SCV_BOX[2] - CX_SCV_BOX[0]}%`,
            height: `${CX_SCV_BOX[3] - CX_SCV_BOX[1]}%`,
          }}
          onClick={stop}
        >
          {content}
        </div>
      )}
    </>
  );
}

// --------------------------------------------------------------------------
// Calibration panel — emits paste-ready CHRONOSSUS_ACTION_HOTSPOTS +
// CHRONOSSUS_COMMAND_MARKERS literals.
// --------------------------------------------------------------------------
function CalibrationPanel({
  positions,
  selected,
  onSelect,
  hsWidth,
  onHsWidth,
  hsHeight,
  onHsHeight,
  markerWidth,
  onMarkerWidth,
  tileWidth,
  onTileWidth,
  ttWidth,
  onTtWidth,
  warpWidth,
  onWarpWidth,
  paradoxWidth,
  onParadoxWidth,
  overlayWidths,
  onOverlayWidth,
  overlayCurves,
  onOverlayCurve,
}: {
  positions: Record<string, [number, number]>;
  selected: string;
  onSelect: (k: string) => void;
  hsWidth: number;
  onHsWidth: (w: number) => void;
  hsHeight: number;
  onHsHeight: (h: number) => void;
  markerWidth: number;
  onMarkerWidth: (w: number) => void;
  tileWidth: number;
  onTileWidth: (w: number) => void;
  ttWidth: number;
  onTtWidth: (w: number) => void;
  warpWidth: number;
  onWarpWidth: (w: number) => void;
  paradoxWidth: number;
  onParadoxWidth: (w: number) => void;
  overlayWidths: Record<string, number>;
  onOverlayWidth: (key: OverlayKey, w: number) => void;
  overlayCurves: Record<string, number>;
  onOverlayCurve: (key: OverlayKey, c: number) => void;
}) {
  const hotspotLiteral =
    'export const CHRONOSSUS_ACTION_HOTSPOTS: Hotspot[] = [\n' +
    CHRONOSSUS_ACTION_HOTSPOTS.map((h) => {
      const [cx, cy] = positions[hsKey(h.id)] ?? HS_CENTER(h);
      const left = +(cx - hsWidth / 2).toFixed(1);
      const top = +(cy - hsHeight / 2).toFixed(1);
      return `  { id: '${h.id}', action: '${h.action}', rect: [${left}, ${top}, ${hsWidth}, ${hsHeight}] },`;
    }).join('\n') +
    '\n];';
  const trackLiteral =
    'export const CHRONOSSUS_TRACK_POSITIONS: TrackPos[] = [\n' +
    CHRONOSSUS_TRACK_POSITIONS.map((p) => {
      const [x, y] = positions[p.key] ?? p.pos;
      let extra = '';
      if (p.action) {
        extra += `, action: '${p.action}', label: '${p.label}'`;
        if (p.tile) {
          const [tx, ty] = positions[tileKey(p.key)] ?? p.tilePos ?? p.pos;
          extra += `, tile: '${p.tile}', tilePos: [${tx}, ${ty}]`;
        }
      }
      return `  { key: '${p.key}', pos: [${x}, ${y}]${extra} },`;
    }).join('\n') +
    `\n];\n\nexport const CHRONOSSUS_TILE_WIDTH = ${tileWidth};` +
    `\nexport const CHRONOSSUS_MARKER_WIDTH = ${markerWidth};`;
  const countersLiteral =
    'export const CHRONOSSUS_COUNTERS: BoardCounter[] = [\n' +
    CHRONOSSUS_COUNTERS.map((c) => {
      const [x, y] = positions[c.key] ?? c.pos;
      return `  { key: '${c.key}', pos: [${x}, ${y}], label: '${c.label}' },`;
    }).join('\n') +
    '\n];';
  const ttLiteral =
    'export const CHRONOSSUS_TIME_TRAVEL_TRACK: TimeTravelTrackLayout = {\n  spots: [\n' +
    TT_KEYS.map((key, i) => {
      const [x, y] = positions[key] ?? CHRONOSSUS_TIME_TRAVEL_TRACK.spots[i];
      return `    [${x}, ${y}],`;
    }).join('\n') +
    `\n  ],\n  markerWidth: ${ttWidth},\n};`;
  const [wx, wy] = positions[WARP_KEY] ?? CHRONOSSUS_WARP_MARKER.pos;
  const warpLiteral =
    `export const CHRONOSSUS_WARP_MARKER: WarpMarkerLayout = {\n  pos: [${wx}, ${wy}],\n  width: ${warpWidth},\n};`;
  const paradoxLiteral =
    'export const CHRONOSSUS_PARADOX_SLOTS: ParadoxLayout = {\n  slots: [\n' +
    PDX_KEYS.map((key, i) => {
      const [x, y] = positions[key] ?? CHRONOSSUS_PARADOX_SLOTS.slots[i];
      return `    [${x}, ${y}],`;
    }).join('\n') +
    `\n  ],\n  width: ${paradoxWidth},\n};`;
  const overlayLiteral =
    'export const CHRONOSSUS_OVERLAYS: BotOverlay[] = [\n' +
    OVERLAY_KEYS.map((key) => {
      const [x, y] = positions[overlayKey(key)] ?? [50, 50];
      const w = overlayWidths[key] ?? 6;
      const c = overlayCurves[key] ?? 0;
      const curve = c > 0 ? `, curve: ${c}` : '';
      return `  { key: '${key}', pos: [${x}, ${y}], width: ${w}${curve} },`;
    }).join('\n') +
    '\n];';
  const selOverlay = OVERLAY_KEYS.find((k) => overlayKey(k) === selected);
  const ttLabel = (i: number) => (i === 0 ? 'TT start (0 VP)' : `TT +${i}`);

  const item = (key: string, label: React.ReactNode, def: [number, number]) => (
    <button
      key={key}
      className={`cal-item ${selected === key ? 'on' : ''}`}
      onClick={() => onSelect(key)}
    >
      {label} <span className="cal-xy">{(positions[key] ?? def).join(', ')}</span>
    </button>
  );
  const sizeSlider = (label: string, value: number, onChange: (w: number) => void, max: number) => (
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
        nudge (0.2% / Shift = 1%). Copy each group's text back into
        <code> chronossusHotspots.ts</code>.
      </p>

      <details className="cal-group" open>
        <summary>Action spaces ({CHRONOSSUS_ACTION_HOTSPOTS.length})</summary>
        <p className="cal-note">Anchor point = center of the tile box.</p>
        {sizeSlider('Tile width', hsWidth, onHsWidth, 20)}
        {sizeSlider('Tile height', hsHeight, onHsHeight, 20)}
        <div className="cal-list">
          {CHRONOSSUS_ACTION_HOTSPOTS.map((h) =>
            item(hsKey(h.id), CHRONOBOT_ACTIONS[h.action].label, HS_CENTER(h)),
          )}
        </div>
        <textarea className="cal-out" readOnly value={hotspotLiteral} />
      </details>

      <details className="cal-group">
        <summary>Command-marker track ({CHRONOSSUS_TRACK_POSITIONS.length})</summary>
        <p className="cal-note">
          Distinct board spots the 4 markers walk. Shared spots (m2p1–m2p5) are
          visited by more than one marker — place each once. → paste into <code>chronossusPaths.ts</code>.
        </p>
        {sizeSlider('Marker width', markerWidth, onMarkerWidth, 12)}
        {sizeSlider('Mod-tile width', tileWidth, onTileWidth, 24)}
        <div className="cal-list">
          {CHRONOSSUS_TRACK_POSITIONS.map((p) =>
            item(p.key, p.label ? `${p.key} · marker step (slot ${p.label})` : p.key, p.pos),
          )}
        </div>
        <textarea className="cal-out" readOnly value={trackLiteral} />
      </details>

      <details className="cal-group">
        <summary>Mod-tile spaces ({MOD_SLOTS.length})</summary>
        <p className="cal-note">
          The printed tile SPACE (separate from the marker step). Sizing uses the
          Mod-tile width slider above; positions round-trip in the track literal.
        </p>
        <div className="cal-list">
          {MOD_SLOTS.map((p) =>
            item(tileKey(p.key), `slot ${p.label} · ${p.tile}`, p.tilePos ?? p.pos),
          )}
        </div>
      </details>

      <details className="cal-group">
        <summary>Count badges ({CHRONOSSUS_COUNTERS.length})</summary>
        <div className="cal-list">
          {CHRONOSSUS_COUNTERS.map((c) => item(c.key, c.label, c.pos))}
        </div>
        <textarea className="cal-out" readOnly value={countersLiteral} />
      </details>

      <details className="cal-group">
        <summary>Time Travel track ({TT_KEYS.length})</summary>
        {sizeSlider('Marker width', ttWidth, onTtWidth, 12)}
        <div className="cal-list">
          {TT_KEYS.map((key, i) => item(key, ttLabel(i), CHRONOSSUS_TIME_TRAVEL_TRACK.spots[i]))}
        </div>
        <textarea className="cal-out" readOnly value={ttLiteral} />
      </details>

      <details className="cal-group">
        <summary>Warp marker</summary>
        {sizeSlider('Marker width', warpWidth, onWarpWidth, 12)}
        <div className="cal-list">{item(WARP_KEY, 'Warp tile', CHRONOSSUS_WARP_MARKER.pos)}</div>
        <textarea className="cal-out" readOnly value={warpLiteral} />
      </details>

      <details className="cal-group">
        <summary>Paradox slots ({PDX_KEYS.length})</summary>
        {sizeSlider('Slot width', paradoxWidth, onParadoxWidth, 12)}
        <div className="cal-list">
          {PDX_KEYS.map((key, i) => item(key, `Paradox ${i + 1}`, CHRONOSSUS_PARADOX_SLOTS.slots[i]))}
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
            item(overlayKey(key), OVERLAY_LABEL[key], positions[overlayKey(key)] ?? [50, 50]),
          )}
        </div>
        <textarea className="cal-out" readOnly value={overlayLiteral} />
      </details>
    </div>
  );
}

// --------------------------------------------------------------------------
// Top-bar sub-components (mirror the Chronobot's VpPill + SettingsMenu, reusing
// the shared .stats-bar classes; recolored to Chronossus via .chronossus-harness).
// --------------------------------------------------------------------------

/** Expandable VP pill → a Chronossus score breakdown popover. */
function CxVpPill({
  score,
  totalActions,
}: {
  score: ReturnType<typeof Chronossus.scoreChronossus>;
  totalActions: number;
}) {
  const [open, setOpen] = useState(false);
  const pillRef = useRef<HTMLButtonElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
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
        <AnchoredPopover rect={rect} className="vp-popover cx-vp-popover">
          <div className="vp-popover-title">Chronossus VP</div>
          <ul className="score-breakdown">
            <li title="Everything except Buildings, Time Travel & Breakthroughs">
              <span>Token VP</span><b>{score.tokenVP}</b>
            </li>
            <li title="From Construct actions — Buildings only">
              <span>Building VP</span><b>{score.buildingVP}</b>
            </li>
            <li title="From Construct actions — Superprojects only">
              <span>Superproject VP</span><b>{score.superprojectVP}</b>
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
            <li title="−3 VP per Anomaly the Chronossus still holds at game end">
              <span>Anomalies (−3 each)</span><b>{score.anomalyVP}</b>
            </li>
            {score.leftoverEnergyVP > 0 && (
              <li title="Difficulty: 1 VP per energized Energy Core currently in the pool">
                <span>Leftover Energy Cores</span><b>{score.leftoverEnergyVP}</b>
              </li>
            )}
            <li className="score-sum"><span>Total</span><b>{score.total}</b></li>
            <li className="score-turns"><span>Bot turns taken</span><b>{totalActions}</b></li>
          </ul>
        </AnchoredPopover>
      )}
    </div>
  );
}

// --------------------------------------------------------------------------
// End-game score screen — the Chronossus total + breakdown, the player's score
// (Number or Tally), win/lose, and an auto-save to the player's history. Mirrors
// the Chronobot's ScoreScreen; the player's tally swaps the base game's Endgame
// Conditions for Solo Objectives (the Chronossus never scores objectives).
// --------------------------------------------------------------------------
// `neg`: this field can only reduce the score — typing 3 stores −3, and only these
// (Anomalies + Timeline penalties) plus nothing else may go negative. Every field is an
// absolute VP value (no ×2 multiplier — the player enters the points directly).
interface CxTallyField { key: string; label: string; neg?: boolean }
const CX_TALLY_FIELDS: CxTallyField[] = [
  { key: 'buildings', label: 'Buildings' },
  { key: 'anomalies', label: 'Anomalies', neg: true },
  { key: 'superprojects', label: 'Superprojects' },
  { key: 'timeTravel', label: 'Time Travel' },
  { key: 'morale', label: 'Morale' },
  { key: 'vpTokens', label: 'Victory Point tokens' },
  { key: 'soloObjectives', label: 'Solo Objectives (highest levels)' },
  { key: 'breakthroughs', label: 'Breakthroughs' },
  { key: 'breakthroughSets', label: 'Breakthrough sets' },
  { key: 'timelinePenalties', label: 'Timeline penalties', neg: true },
];
const CX_TALLY_BY_KEY: Record<string, CxTallyField> = Object.fromEntries(
  CX_TALLY_FIELDS.map((f) => [f.key, f]),
);

// Side-by-side score rows: shared rows carry both a player tally key and the bot's
// pre-filled value; player-only rows omit botValue. The bot's "Token / Action VP" is
// shown on the "Victory Point tokens" line next to the player's own tally.
// `hypersync` adds the Hypersync-tile note to the Timeline-penalties row (player-only).
const CX_SCORE_ROWS = (
  score: ReturnType<typeof Chronossus.scoreChronossus>,
  hypersync: boolean,
): { label: string; playerKey?: string; botValue?: number }[] => [
  { label: 'Buildings', playerKey: 'buildings', botValue: score.buildingVP },
  { label: 'Superprojects', playerKey: 'superprojects', botValue: score.superprojectVP },
  { label: 'Time Travel', playerKey: 'timeTravel', botValue: score.timeTravelVP },
  { label: 'Breakthroughs (×1 each)', playerKey: 'breakthroughs', botValue: score.breakthroughVP },
  { label: 'Breakthrough sets (set of shapes ×2 each)', playerKey: 'breakthroughSets', botValue: score.shapeSetBonus },
  { label: 'Anomalies (−3 each)', playerKey: 'anomalies', botValue: score.anomalyVP },
  { label: 'Victory Point tokens', playerKey: 'vpTokens', botValue: score.tokenVP },
  { label: 'Morale', playerKey: 'morale' },
  { label: 'Solo Objectives (highest levels)', playerKey: 'soloObjectives' },
  {
    label: hypersync
      ? 'Timeline penalties (Hypersync tiles −4 each)'
      : 'Timeline penalties',
    playerKey: 'timelinePenalties',
  },
  // D5 difficulty (bot-only, no player equivalent) — only shown when it scored anything.
  ...(score.leftoverEnergyVP
    ? [{ label: 'Leftover Energy Cores (difficulty, 1 each)', botValue: score.leftoverEnergyVP }]
    : []),
];

function CxScoreScreen({
  state,
  score,
  totalActions,
  onHome,
  onNewGame,
}: {
  state: GameState;
  score: ReturnType<typeof Chronossus.scoreChronossus>;
  totalActions: number;
  onHome: () => void;
  onNewGame: () => void;
}) {
  const { user } = useAuth();
  // Whether this game uses a Hypersync mode (adds the Hypersync-tile note to the
  // player's Timeline-penalties line — the bot never loses VP for those tiles).
  const hypersyncMode = getMode(state.config.chronossusMode).slots.some(
    (s) => tileEffect(`${s.family}A`).hypersync === true,
  );
  const [mode, setMode] = useState<'number' | 'tally'>('tally');
  const [num, setNum] = useState('');
  const [tally, setTally] = useState<Record<string, number>>({});
  // Tally mode always sums to a number (0 to start), so don't treat it as a
  // finished score until the player clicks Done — otherwise it auto-saves 0.
  const [tallyDone, setTallyDone] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  // A human-readable reason for a failed save (session expired vs. a generic error).
  const [saveErr, setSaveErr] = useState<string>('');

  // Every field is stored as a signed absolute VP value (neg fields already hold a
  // negative number), so the total is a plain sum.
  const tallyTotal = CX_TALLY_FIELDS.reduce((sum, f) => sum + (tally[f.key] ?? 0), 0);
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
      : playerScore > score.total
        ? 'win'
        : 'lose';

  const saveGame = async () => {
    if (result == null || playerScore == null) return;
    setSaveState('saving');
    try {
      await recordGame({
        won: result === 'win',
        bot_score: score.total,
        player_score: playerScore,
        difficulty: 'Chronossus',
        era_reached: state.era,
        payload: { opponent: 'Chronossus', breakdown: score, botTurns: totalActions },
      });
      setSaveState('saved');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // 401/403 → the shared BGE session lapsed; anything else is network/server.
      setSaveErr(
        /\b40[13]\b/.test(msg)
          ? 'Your login session expired — log in again to save this game.'
          : "Couldn't reach your history service.",
      );
      setSaveState('error');
    }
  };
  // Share / save the score summary as a PNG (native share sheet on mobile, download
  // on desktop). Includes the top line, the breakdown, and the modes + difficulty (#7).
  const [shareMsg, setShareMsg] = useState<string>('');
  const handleShare = async () => {
    const rows: ScoreShareRow[] = CX_SCORE_ROWS(score, hypersyncMode).map((r) => ({
      // Strip the parenthetical rule hints for the compact share card (they don't wrap).
      label: r.label.replace(/\s*\([^)]*\)/g, ''),
      you: r.playerKey ? (tally[r.playerKey] ?? null) : null,
      bot: r.botValue ?? null,
    }));
    rows.push({ label: 'Bot turns taken', you: null, bot: totalActions });
    const setup: string[] = [`Mode: ${getMode(state.config.chronossusMode).label}`];
    const bSides = Object.entries(state.config.tileSides ?? {})
      .filter(([, s]) => s === 'B')
      .map(([k]) => k);
    if (bSides.length) setup.push(`B-side tiles: ${bSides.join(', ')}`);
    for (const flag of state.config.difficulty) {
      setup.push(`Difficulty: ${chronossusDifficultyLabel(flag, state.config.difficultyValues)}`);
    }
    try {
      const how = await shareScoreImage({
        title: `Anachrony — Solo vs Chronossus (Era ${state.era})`,
        playerScore,
        botScore: score.total,
        result,
        rows,
        setup,
        footer: `anachrony.boardgameedge.com · ${new Date().toLocaleDateString()}`,
      });
      setShareMsg(how === 'downloaded' ? '✓ Image downloaded' : '');
    } catch {
      setShareMsg("Couldn't create the image.");
    }
  };
  // Auto-save once the game has a player score (debounced, once per game). A failed
  // attempt leaves saveState 'error'; the player can Retry (which resets to idle).
  useEffect(() => {
    if (!user || result == null || playerScore == null || Number.isNaN(playerScore)) return;
    if (saveState !== 'idle') return;
    const id = setTimeout(() => saveGame(), 900);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, result, playerScore, saveState]);

  // A tally input cell: clear button then the number field, so the input sits flush at
  // the column's right edge — directly under the "You" header (not the × button).
  const tallyCell = (key: string) => (
    <div className="cx-scell">
      <button
        type="button"
        className="tally-clear"
        aria-label={`Clear ${key}`}
        title="Clear"
        disabled={tally[key] == null}
        onClick={() =>
          setTally((t) => {
            const next = { ...t };
            delete next[key];
            return next;
          })
        }
      >
        ×
      </button>
      <input
        type="number"
        inputMode="numeric"
        value={tally[key] ?? ''}
        onChange={(e) =>
          setTally((t) => {
            const next = { ...t };
            if (e.target.value === '') delete next[key];
            // neg fields (Anomalies / Timeline penalties) always store a negative:
            // typing 3 records −3.
            else if (CX_TALLY_BY_KEY[key]?.neg) next[key] = -Math.abs(Number(e.target.value));
            else next[key] = Number(e.target.value);
            return next;
          })
        }
      />
    </div>
  );

  return (
    <div className="modal-overlay">
      <div className="score-screen" onClick={(e) => e.stopPropagation()}>
        <div className="score-head">
          <h2>Final Score — Era {state.era}</h2>
          <button className="dp-close" onClick={onHome} aria-label="Close">
            ×
          </button>
        </div>

        {/* Top line: Chronossus vs You */}
        <div className={`score-vs ${result ?? ''}`}>
          <div className="score-vs-side">
            <span className="score-vs-num">{playerScore ?? '—'}</span>
            <span className="score-vs-label">You</span>
          </div>
          <span className="score-vs-x">vs</span>
          <div className="score-vs-side">
            <span className="score-vs-num">{score.total}</span>
            <span className="score-vs-label">Chronossus</span>
          </div>
        </div>

        {state.config.difficulty.length > 0 && (
          <p className="score-setup-note">
            Difficulty:{' '}
            {state.config.difficulty
              .map((f) => chronossusDifficultyLabel(f, state.config.difficultyValues))
              .join(', ')}
          </p>
        )}

        <div className="score-mode">
          <button className={mode === 'number' ? 'on' : ''} onClick={() => setMode('number')}>
            Number
          </button>
          <button className={mode === 'tally' ? 'on' : ''} onClick={() => setMode('tally')}>
            Tally sheet
          </button>
        </div>

        {mode === 'number' ? (
          <>
            <input
              className="score-num-input"
              type="number"
              placeholder="Enter your total VP (including Solo Objectives)"
              value={num}
              onChange={(e) => setNum(e.target.value)}
            />
            {/* Bot breakdown still shown for reference in Number mode. */}
            <ul className="score-breakdown">
              <li><span>Token VP</span><b>{score.tokenVP}</b></li>
              <li><span>Building VP</span><b>{score.buildingVP}</b></li>
              <li><span>Superproject VP</span><b>{score.superprojectVP}</b></li>
              <li><span>Time Travel</span><b>{score.timeTravelVP}</b></li>
              <li><span>Breakthroughs (1 each)</span><b>{score.breakthroughVP}</b></li>
              <li><span>Breakthrough sets (+2 each)</span><b>{score.shapeSetBonus}</b></li>
              <li><span>Anomalies (−3 each)</span><b>{score.anomalyVP}</b></li>
              {score.leftoverEnergyVP > 0 && (
                <li><span>Leftover Energy Cores (difficulty)</span><b>{score.leftoverEnergyVP}</b></li>
              )}
              <li className="score-sum"><span>Chronossus total</span><b>{score.total}</b></li>
            </ul>
          </>
        ) : (
          <>
            {/* Side-by-side: shared rows align (You left, Chronossus right); player-only
                and bot-only rows leave the other column blank. */}
            <div className="cx-tally">
              <div className="cx-trow cx-thead">
                <span className="cx-tlabel"></span>
                <span className="cx-tyou">You</span>
                <span className="cx-tbot">Chronossus</span>
              </div>
              {CX_SCORE_ROWS(score, hypersyncMode).map((r) => (
                <div key={r.label} className="cx-trow">
                  <span className="cx-tlabel">{r.label}</span>
                  <span className="cx-tyou">
                    {r.playerKey ? tallyCell(r.playerKey) : <span className="cx-dash">—</span>}
                  </span>
                  <span className="cx-tbot">
                    {r.botValue != null ? r.botValue : <span className="cx-dash">—</span>}
                  </span>
                </div>
              ))}
              <div className="cx-trow cx-tsum">
                <span className="cx-tlabel">Total</span>
                <span className="cx-tyou">{tallyTotal}</span>
                <span className="cx-tbot">{score.total}</span>
              </div>
            </div>
            {!tallyDone && (
              <button className="tally-done" onClick={() => setTallyDone(true)}>
                Done — use this total
              </button>
            )}
          </>
        )}

        <ul className="score-breakdown score-meta">
          <li className="score-turns"><span>Bot turns taken</span><b>{totalActions}</b></li>
        </ul>
        <div className="score-rules">
          <RulesBox label="End Game scoring — rulebook text">
            <p>{CHRONOSSUS_ENDGAME_RULES}</p>
          </RulesBox>
        </div>

        {result && (
          <div className={`score-result ${result}`}>
            {result === 'win'
              ? '🎉 You win! (more points than the Chronossus)'
              : 'You lose — the Chronossus has at least as many points.'}
          </div>
        )}

        {user && saveState !== 'idle' && (
          <div className="score-save">
            {saveState === 'saving' && <span className="score-save-ok">Saving…</span>}
            {saveState === 'saved' && <span className="score-save-ok">✓ Saved to your history</span>}
            {saveState === 'error' && (
              <span className="score-save-err">
                {saveErr || "Couldn't save automatically."}{' '}
                <button
                  className="score-save-retry"
                  onClick={() => {
                    setSaveErr('');
                    setSaveState('idle'); // re-arms the auto-save effect
                  }}
                >
                  Retry
                </button>
              </span>
            )}
          </div>
        )}

        {shareMsg && <div className="score-share-msg">{shareMsg}</div>}

        <div className="score-actions">
          <button className="modal-no" onClick={onHome}>
            Close
          </button>
          <button className="score-share-btn" onClick={handleShare}>
            📤 Share / Save image
          </button>
          <button className="modal-yes" onClick={onNewGame}>
            ⟳ New Game
          </button>
        </div>
      </div>
    </div>
  );
}

