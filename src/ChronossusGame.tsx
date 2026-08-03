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
import ChronossusSetupFlow from './phases/ChronossusSetupFlow';
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
import { CHRONOSSUS_TILES, TILE_ACTION_CODE } from './board/chronossusTiles';
import {
  CHRONOSSUS_OVERLAYS,
  OVERLAY_KEYS,
  OVERLAY_LABEL,
  overlayKey,
  type OverlayKey,
} from './board/botOverlays';
import { BotOverlayLayer } from './board/BotOverlayLayer';

const HERO = '/assets/solo/chronossus-hero.jpg';

// Persistence (own key so it survives refresh, separate from the Chronobot's).
const CX_PERSIST_KEY = 'anachrony:chronossus';
const CX_PERSIST_VERSION = 1;

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
}
const emptyCxUi = (): ChronossusUi => ({
  markerSteps: initialMarkerSteps(),
  botDie: null,
  activeMarker: null,
  lastDraw: null,
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
      return `${c.label}: ${count} (max 3)`;
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
      return bot.anomalies;
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
  // A modular-tile dialog opened read-only (play-mode tap / SCV row): shows the
  // tile's rules with no ▶ Start, taking no turn (mirrors the action rule view).
  const [tileRuleView, setTileRuleView] = useState(false);

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
  // A rolled-but-not-yet-committed AI die: cleared only when a turn commits (or on
  // a full reset), NOT when the dialog is cancelled — so closing a bot dialog and
  // re-hitting Take Bot Action repeats the same roll / action rather than re-rolling.
  const pendingDieRef = useRef<CommandNum | null>(null);

  // ---- Calibrate mode ----------------------------------------------------
  const [calibrate, setCalibrate] = useState(false);
  const [outline, setOutline] = useState(false); // debug: show tile hit-boxes
  const [paradoxes, setParadoxes] = useState(0); // debug: fill 0–3 Paradox slots
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
  const [selected, setSelected] = useState<string>(CAL_KEYS[0]);
  const [hsWidth, setHsWidth] = useState<number>(CHRONOSSUS_ACTION_HOTSPOTS[0].rect[2]);
  const [hsHeight, setHsHeight] = useState<number>(CHRONOSSUS_ACTION_HOTSPOTS[0].rect[3]);
  const [markerWidth, setMarkerWidth] = useState<number>(CHRONOSSUS_MARKER_WIDTH);
  const [tileWidth, setTileWidth] = useState<number>(CHRONOSSUS_TILE_WIDTH);
  const [ttWidth, setTtWidth] = useState<number>(CHRONOSSUS_TIME_TRAVEL_TRACK.markerWidth);
  const [warpWidth, setWarpWidth] = useState<number>(CHRONOSSUS_WARP_MARKER.width);
  const [paradoxWidth, setParadoxWidth] = useState<number>(CHRONOSSUS_PARADOX_SLOTS.width);

  const bot = state.chronossus!;
  const score = Chronossus.scoreChronossus(bot);
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

  // The ui slice to store for a committed turn: advance the marker driving the
  // turn one step (no-op on a player free-tap, where activeMarkerRef is null).
  const advancedUi = (): ChronossusUi => {
    const m = activeMarkerRef.current;
    const nextMarkerSteps =
      m != null ? { ...ui.markerSteps, [m]: nextStep(m, ui.markerSteps[m]) } : ui.markerSteps;
    return {
      markerSteps: nextMarkerSteps,
      botDie: botDieRef.current,
      activeMarker: activeMarkerRef.current,
      lastDraw: ui.lastDraw,
    };
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
    },
  ) => {
    const input: ChronossusActionInput = { actionId: h.action };
    if (opts.cannotPlace) input.noSpaceAvailable = true;
    if (opts.buildingVP != null) input.buildingVP = opts.buildingVP;
    if (opts.minedResources) input.minedResources = opts.minedResources;
    if (opts.recruitedWorker) input.recruitedWorker = opts.recruitedWorker;
    if (opts.shape) input.shape = opts.shape;
    if (opts.geniusAvailable) input.geniusAvailable = true;
    const { state: next, instructions } = Chronossus.resolveAction(state, input);
    commit(
      next,
      advancedUi(), // the marker advances after its action resolves
      turnLabel(instructions, CHRONOBOT_ACTIONS[h.action].label),
      summarizeTurn(state.chronossus!, next.chronossus!, instructions),
      botDieRef.current,
    );
    setResult(instructions);
    setLastResult(instructions);
    setPending(null);
    activeMarkerRef.current = null;
    pendingDieRef.current = null; // roll consumed — the next turn rolls fresh
  };

  const onTileClick = (h: Hotspot, force = false) => {
    if (calibrate) {
      setSelected(hsKey(h.id)); // select instead of activating
      return;
    }
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
      setRolledShape(rollShapeDie());
      setPending('research');
    } else {
      resolve(active, {});
    }
  };

  const onCannotPlace = () => {
    if (active) resolve(active, { cannotPlace: true });
  };
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
    closePanel();
  };

  // Show an action's rules read-only (from a Simple Command View row) — opens the
  // DetailPanel without taking a turn.
  const showActionRules = (action: ChronossusActionId) => {
    const h = CHRONOSSUS_ACTION_HOTSPOTS.find((x) => x.action === action);
    if (!h) return;
    botDieRef.current = null;
    activeMarkerRef.current = null;
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
    setResult([]);
    setTileRuleView(true);
    setPendingTile(tileAction);
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
    const tileAction = p.action as ChronossusTileActionId;
    if (!debug) {
      showTileRules(tileAction);
      return;
    }
    botDieRef.current = null;
    activeMarkerRef.current = null;
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
      return {
        num,
        action: tp.action,
        label: Chronossus.chronossusActionLabel(tp.action),
        tile: tp.tile ?? null,
      };
    }
    const [x, y] = positions[key] ?? [0, 0];
    const h = nearestHotspot(x, y);
    return { num, action: h.action, label: CHRONOBOT_ACTIONS[h.action].label, tile: null };
  });

  // The action dialog. On mobile (flow=true) it renders in normal flow at the top
  // of the stage, pushing the board down; on desktop it's an absolute panel on the
  // board. Mirrors the Chronobot's renderDetailPanel.
  const renderDetailPanel = (flow: boolean) =>
    !calibrate && active ? (
      <DetailPanel
        flow={flow}
        hotspot={{ ...active, panel: active.panel ?? CHRONOSSUS_PANEL }}
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
  // Finish Setup: seed the chosen difficulty and enter Era 1, Phase 1.
  const beginGame = (difficulty: string[]) => {
    setState((s) => startFirstEra({ ...s, config: { ...s.config, difficulty } }));
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
  // each roll — same logic as the Chronobot's rollBotParadox.
  const rollBotParadox = (rolled: number) => {
    const res = Chronossus.rollParadox(state, rolled);
    const pre = state.chronossus!;
    const post = res.state.chronossus!;
    const effects: string[] = [];
    if (post.paradoxes !== pre.paradoxes) effects.push(`Paradox tracker → ${post.paradoxes}/3`);
    if (post.anomalies > pre.anomalies) effects.push('Gained 1 Anomaly (−3 VP)');
    if (post.warpTilesOnTimeline < pre.warpTilesOnTimeline)
      effects.push('Warp tile removed from the Timeline');
    commit(res.state, ui, `Era ${state.era} · Paradox roll (+${Math.max(0, rolled)})`, effects);
    return res;
  };
  const advanceParadox = () => setState(Chronossus.endParadoxPhase(state));
  // Warp phase: place the Chronossus's rolled Warp tiles and commit (so the
  // placement lands in History) — mirrors the Chronobot's commitWarp.
  const commitWarp = (paradoxes: number) => {
    const place = Math.max(0, paradoxes);
    const next = Chronossus.resolveWarp(state, place);
    commit(
      next,
      ui,
      `Era ${state.era} · Warp: placed ${place}`,
      place > 0
        ? [`Placed ${place} Warp tile${place === 1 ? '' : 's'} on the Timeline`]
        : ['Placed no Warp tiles'],
    );
  };
  // End of Action Rounds → ask who took First Player next Era, then Clean Up.
  const endActions = () => {
    closePanel();
    setShowFirstPlayer(true);
  };
  const proceedToCleanup = (playerFirst: boolean) => {
    setShowFirstPlayer(false);
    setState(
      Chronossus.resolveCleanUp({ ...state, firstPlayer: playerFirst ? 'player' : 'bot' }),
    );
  };
  const afterCleanUp = () => {
    const next = finishEra(state);
    setUi((u) => ({ ...u, lastDraw: null }));
    setState(next);
  };
  // Clean Up → End Game: the game ended (Era 7, or the Capital collapsed in Era
  // 5–6 when flipping Collapsing Capital tiles). Mirrors the Chronobot exactly.
  const endGameNow = () => {
    setUi((u) => ({ ...u, lastDraw: null }));
    setState((s) => ({ ...s, phase: 'endgame', finished: true }));
  };
  const goPhase = (p: Phase) => {
    closePanel();
    // Leaving Power Up consumes this Era's draw (so it can't re-show / re-draw).
    setUi((u) => ({ ...u, lastDraw: null }));
    setState((s) => ({ ...s, phase: p }));
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
    }
    activeMarkerRef.current = null;
    setLastResult([]);
  };

  // Take Bot Action: roll the AI die (faces 2/3/4/5), activate that Command
  // marker, resolve the Action space it currently sits on, then advance it.
  const takeBotTurn = () => {
    if (bot.passed || active || pendingTile) return;
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
      // TrackPos.action on a tile slot is always a modular tile action.
      setResult([]);
      setPendingTile(tp.action as ChronossusTileActionId);
      return;
    }
    const [x, y] = positions[key] ?? [0, 0];
    onTileClick(nearestHotspot(x, y), true); // die-driven turn: activate, not rule-view
  };

  // Commit a modular tile action (Reboot / Score / Energy Pack). No player input,
  // so ▶ Start resolves it and advances the marker (the caller then closes).
  const resolveTileSlot = (actionId: ChronossusActionId) => {
    const { state: next, instructions } = Chronossus.resolveAction(state, { actionId });
    commit(
      next,
      advancedUi(),
      turnLabel(instructions, Chronossus.chronossusActionLabel(actionId)),
      summarizeTurn(state.chronossus!, next.chronossus!, instructions),
      botDieRef.current,
    );
    setResult(instructions);
    setLastResult(instructions);
    activeMarkerRef.current = null;
    pendingDieRef.current = null; // roll consumed — the next turn rolls fresh
  };
  // ▶ Start on the tile dialog: resolve and close immediately (like the printed
  // actions) — the result lands in History / the turn-status aside, no Done step.
  const startTileTurn = () => {
    if (!pendingTile) return;
    resolveTileSlot(pendingTile);
    closeTile();
  };
  // Close the tile dialog. If it hasn't resolved yet (no result), the marker does
  // not advance (a cancelled turn).
  const closeTile = () => {
    setPendingTile(null);
    setTileRuleView(false);
    setResult([]);
    botDieRef.current = null;
    activeMarkerRef.current = null;
    pendingDieRef.current = null;
    setUi((u) => ({ ...u, botDie: null, activeMarker: null }));
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
    (active != null && !ruleView) || (pendingTile != null && !tileRuleView);

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
              onShowTileRules={showTileRules}
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
                return (
                  <img
                    key={k}
                    className={`cx-tile-art ${sel ? 'cal-selected' : ''}`}
                    src={`/assets/solo/chronossus/tiles/${p.tile}.png`}
                    alt={`Modular tile ${p.tile}`}
                    style={{ left: `${x}%`, top: `${y}%`, width: `${tileWidth}%` }}
                    title={`Slot ${p.label} · ${p.tile}${p.action ? ` — ${TILE_DESC[p.action] ?? ''}` : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onTileArtClick(p);
                    }}
                  />
                );
              })}

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
              onShowTileRules={showTileRules}
                />
              )}
              {scvMode !== 'below' && renderDetailPanel(false)}
              {pendingTile && (
                <CxTileDialog
                  action={pendingTile}
                  panel={CHRONOSSUS_PANEL}
                  readOnly={tileRuleView}
                  onStart={startTileTurn}
                  onClose={cancelPanel}
                />
              )}
            </div>
            {simpleView && !calibrate && scvMode === 'below' && (
              <CxSimpleCommandView
                rows={scvRows}
                activeMarker={activeMarker}
                onShowRules={showActionRules}
              onShowTileRules={showTileRules}
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
                  <span className="eoa-flag cx-exosuit-flag" title="Powered Exosuits available">
                    <CxExosuit count={bot.exosuitsAvailable} size={18} />
                  </span>
                  <span
                    className="eoa-flag cx-energy-flag"
                    title="Energy Pool — Energy Cores / Exhausted Energy Cores"
                  >
                    <CxEnergyPool pool={bot.energyPool} size={18} />
                  </span>
                </>
              }
              hint={chronossusTurnHint(bot)}
              canEnd={bothPassed}
              turnRules={CHRONOSSUS_PHASE_META.actions?.rules}
              difficulty={[]}
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
            onAnswer={proceedToCleanup}
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
                    <img src={EXOSUIT_ICON} alt="" />
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
      body = (
        <WarpPhaseBody
          state={state}
          meta={meta!}
          onCommit={commitWarp}
          botName="Chronossus"
          warpTileSrc="/assets/solo/chronossus/warp-tile.png"
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
              🏁 Finish &amp; Score ▶
            </button>
          ) : postImpact ? (
            <>
              <div className="capital-check">
                Are all Collapsing Capital tiles flipped? If so, proceed to Game Ended
                below.
              </div>
              <div className="setup-actions">
                <button className="phase-primary" onClick={afterCleanUp}>
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
          state={state}
          bot={bot}
          meta={meta!}
          onRoll={rollBotParadox}
          onAdvance={advanceParadox}
          botName="Chronossus"
        />
      );
      break;
    case 'preparation':
      body = (
        <button className="phase-primary" onClick={() => setState(advanceFromPreparation(state))}>
          Continue ▶
        </button>
      );
      break;
    default: // setup — skeleton for now (reconciled later)
      body = (
        <>
          {meta?.rules && <p className="phase-note">{meta.rules}</p>}
          <p className="phase-note">
            (This phase is a placeholder — its Chronossus-specific behavior is reconciled after
            Phase 5.)
          </p>
          <button className="phase-primary" onClick={() => goPhase('powerup')}>Continue ▶</button>
        </>
      );
  }

  return (
    <>
      {rulesModal}
      {debugBar}
      <PhaseScreen {...phaseProps}>{body}</PhaseScreen>
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

/** Friendly, player-facing instruction for each in-play tile action. */
const TILE_INSTRUCT: Record<ChronossusTileActionId, string> = {
  'tile-reboot': 'The Chronossus does nothing this turn — its Command marker still advances.',
  'tile-score': 'The Chronossus scores +2 VP.',
  'tile-energy-pack': 'Add 1 non-exhausted Energy Core to the Chronossus’s Energy Pool.',
};

/** Tile codes whose effect warrants the verbatim rules box (empty for now — the
 *  base tiles are simple; the Autoleap/skip tiles go here when implemented). */
const TILES_WITH_RULES_BOX = new Set<string>([]);

function CxTileDialog({
  action,
  panel,
  readOnly = false,
  onStart,
  onClose,
}: {
  action: ChronossusTileActionId;
  panel: [number, number, number, number];
  readOnly?: boolean;
  onStart: () => void;
  onClose: () => void;
}) {
  const code = TILE_ACTION_CODE[action];
  const tile = CHRONOSSUS_TILES[code];
  const showRulesBox = TILES_WITH_RULES_BOX.has(code);
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
          <p className="pp-instruct">{TILE_INSTRUCT[action]}</p>
          {!readOnly && (
            <button className="start-turn" onClick={onStart}>
              ▶ Start Your Turn
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
  onShowTileRules: (action: ChronossusTileActionId) => void;
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
            onClick={() =>
              r.tile
                ? onShowTileRules(r.action as ChronossusTileActionId)
                : onShowRules(r.action)
            }
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
      return `  { key: '${key}', pos: [${x}, ${y}], width: ${w} },`;
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
          sizeSlider(
            `${OVERLAY_LABEL[selOverlay]} width`,
            overlayWidths[selOverlay] ?? 6,
            (w) => onOverlayWidth(selOverlay, w),
            20,
          )
        ) : (
          <p className="cal-note">Pick a type below to enable its size slider.</p>
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
            <li title="−3 VP per Anomaly the Chronossus still holds at game end">
              <span>Anomalies (−3 each)</span><b>{score.anomalyVP}</b>
            </li>
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
const CX_TALLY_FIELDS: { key: string; label: string; mult: number; sub?: boolean }[] = [
  { key: 'buildings', label: 'Buildings', mult: 1 },
  { key: 'anomalies', label: 'Anomalies', mult: 1 },
  { key: 'superprojects', label: 'Superprojects', mult: 1 },
  { key: 'timeTravel', label: 'Time Travel', mult: 1 },
  { key: 'morale', label: 'Morale', mult: 1 },
  { key: 'vpTokens', label: 'Victory Point tokens', mult: 1 },
  { key: 'soloObjectives', label: 'Solo Objectives (highest levels)', mult: 1 },
  { key: 'breakthroughs', label: 'Breakthroughs (×1 each)', mult: 1 },
  { key: 'breakthroughSets', label: 'Breakthrough sets (×2 each)', mult: 2 },
  { key: 'timelinePenalties', label: 'Timeline penalties (−)', mult: 1, sub: true },
];

const CX_PLAYER_SCORING_RULE =
  'Tally your points from Buildings, Anomalies, Superprojects, Time Travel, Morale, ' +
  'Victory Point tokens and Timeline penalties as normal. Each Breakthrough is worth ' +
  '1 VP; a set of three different shapes is worth an additional 2 VP. In addition, ' +
  'score points for the highest level you reached on each of your 3 Solo Objectives — ' +
  'the Chronossus never scores Solo Objectives.';

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
  const [mode, setMode] = useState<'number' | 'tally'>('number');
  const [num, setNum] = useState('');
  const [tally, setTally] = useState<Record<string, number>>({});
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const tallyTotal = CX_TALLY_FIELDS.reduce((sum, f) => {
    const v = (tally[f.key] ?? 0) * f.mult;
    return sum + (f.sub ? -v : v);
  }, 0);
  const playerScore =
    mode === 'number' ? (num.trim() === '' ? null : Number(num)) : tallyTotal;
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
    } catch {
      setSaveState('error');
    }
  };
  // Auto-save once the game has a player score (debounced, once per game).
  useEffect(() => {
    if (!user || result == null || playerScore == null || Number.isNaN(playerScore)) return;
    if (saveState !== 'idle') return;
    const id = setTimeout(() => saveGame(), 900);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, result, playerScore, saveState]);

  return (
    <div className="modal-overlay">
      <div className="score-screen" onClick={(e) => e.stopPropagation()}>
        <div className="score-head">
          <h2>Final Score — Era {state.era}</h2>
          <button className="dp-close" onClick={onHome} aria-label="Close">
            ×
          </button>
        </div>

        {/* Bot total + breakdown */}
        <div className="score-bot">
          <div className="score-total">
            <span className="score-total-num">{score.total}</span>
            <span className="score-total-label">Chronossus VP</span>
          </div>
          <ul className="score-breakdown">
            <li><span>Token VP</span><b>{score.tokenVP}</b></li>
            <li><span>Building VP</span><b>{score.buildingVP}</b></li>
            <li><span>Time Travel</span><b>{score.timeTravelVP}</b></li>
            <li><span>Breakthroughs (1 each)</span><b>{score.breakthroughVP}</b></li>
            <li><span>Breakthrough sets (+2 each)</span><b>{score.shapeSetBonus}</b></li>
            <li><span>Anomalies (−3 each)</span><b>{score.anomalyVP}</b></li>
            <li className="score-sum"><span>Total</span><b>{score.total}</b></li>
            <li className="score-turns"><span>Bot turns taken</span><b>{totalActions}</b></li>
          </ul>
          <div className="score-rules">
            <RulesBox label="End Game scoring — rulebook text">
              <p>{CHRONOSSUS_ENDGAME_RULES}</p>
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
              placeholder="Enter your total VP (including Solo Objectives)"
              value={num}
              onChange={(e) => setNum(e.target.value)}
            />
          ) : (
            <>
              <p className="score-rule">{CX_PLAYER_SCORING_RULE}</p>
              <div className="tally-grid">
                {CX_TALLY_FIELDS.map((f) => (
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
              ? '🎉 You win! (more points than the Chronossus)'
              : 'You lose — the Chronossus has at least as many points.'}
          </div>
        )}

        {user && saveState !== 'idle' && (
          <div className="score-save">
            {saveState === 'saving' && <span className="score-save-ok">Saving…</span>}
            {saveState === 'saved' && <span className="score-save-ok">✓ Saved to your history</span>}
            {saveState === 'error' && (
              <span className="score-save-err">Couldn't save automatically.</span>
            )}
          </div>
        )}

        <div className="score-actions">
          <button className="modal-no" onClick={onHome}>
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

