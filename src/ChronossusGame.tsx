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

import { createContext, useContext, useEffect, useId, useRef, useState } from 'react';
import './BoardExplorer.css';
import './ChronossusExplorer.css';
import './phases/phases.css';
import PhaseScreen from './phases/PhaseScreen';
import { CHRONOSSUS_PHASE_META, CHRONOSSUS_ENDGAME_RULES } from './phases/chronossusPhaseMeta';
import {
  DetailPanel,
  AnchoredPopover,
  WarpTileBreakdown,
  BadgePopover,
  ShapeIcon,
  SettingsMenu,
  WarpPhaseBody,
  ParadoxPhaseBody,
  PARADOX_ICONS,
  BlinkPanel,
  BlinkRuleBlock,
  PlaceExosuitPanel,
  summarizeTurn,
  type PendingStep,
} from './BoardExplorer';
import HistoryPane from './history/HistoryPane';
import ReadyToBegin from './phases/ReadyToBegin';
import FirstPlayerPrompt from './phases/FirstPlayerPrompt';
import TurnBarOverview, { DifficultyList } from './phases/TurnBarOverview';
import DebugBar from './components/DebugBar';
import { useUndoableGame } from './game/useUndoableGame';
import { useMediaQuery } from './game/useMediaQuery';
import { summarizeChronossusExtras } from './game/chronossusHistory';
import { clearPersisted, peekSaved, type HistoryEntry } from './game/undo';
import { clearSavedChronobot } from './BoardExplorer';
import { ActionIcon } from './board/ActionIcon';
import RulesBox from './phases/RulesBox';
import RulesFrame, { RulesButton } from './rules/RulesFrame';
import { rulesFrameUrl } from './rules/gamebrain';
import { useAuth } from './auth/useAuth';
import { recordGame, type GameSummary } from './data/gameData';
import { queuePendingGame } from './data/pendingGames';
import {
  Chronobot,
  Chronossus,
  CHRONOBOT_ACTIONS,
  createInitialState,
  emptyChronossusState,
  drawEnergyPool,
  rollShapeDie,
  rollAdventureDie,
  shuffleAdventureDeck,
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
import {
  finishEra,
  advanceFromPreparation,
  startFirstEra,
  pastTimelineTiles,
} from './game/flow';
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
import { TILE_DESC, tileInstruction } from './board/tileText';
import {
  adventureCardArt,
  adventureDeckCards,
  adventureDeckIds,
  type AdventureCard,
  type AdventureDeck,
} from './data/adventureCards';
import { resolveAdventure, type AdventureInput, type AdventureResult } from './engine/bots/pioneers';
import { placeWarpTiles, removeAnyWarpTile, warpRemoval } from './engine/warpTiles';
import {
  getMode,
  selectedModeLabels,
  slotAtPos,
  slotCovering,
  tileCodeFor,
  type CoveredAction,
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
  /**
   * An Autoleap the marker has landed on whose Action has NOT been resolved yet. The
   * marker already moved and the previous turn is committed, so this resolution is owed —
   * closing its dialog must not lose it, and Take Bot Action must re-open it rather than
   * roll a fresh die. Cleared when it resolves. Persisted, so a reload resumes it too.
   */
  owedLeap: { code: string; actionId: ChronossusTileActionId | null; isHypersync: boolean } | null;
}
const emptyCxUi = (): ChronossusUi => ({
  markerSteps: initialMarkerSteps(),
  botDie: null,
  activeMarker: null,
  lastDraw: null,
  warpRoll: null,
  paradoxRoll: null,
  hsRolledHex: null,
  owedLeap: null,
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
  // A Guardian is an Exosuit, so "out of Exosuits" means out of both — it just has to
  // COUNT them (`placeableFigures`), not name them separately.
  if (Chronossus.placeableFigures(bot) <= 0) {
    return 'The Chronossus is out of Exosuits — it passes the next time it would place one (Time Travel / Reboot still resolve).';
  }
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
/**
 * The Capital Action spaces. Both module fallbacks that stand in for an Exosuit — HFA's
 * Solo Hypersync tile and the Guardian board space — apply to these ONLY, never to Mine,
 * Time Travel, Remove Anomaly or Reboot. One list, shared with the engine's pass rule, so
 * the two can't drift apart.
 */
const CAPITAL_ACTIONS = new Set<ChronossusActionId>(Chronossus.CAPITAL_ACTION_IDS);
/** Reverse of TILE_ACTION_FAMILY: a tile family → its in-play tile-action id. */
const FAMILY_TO_TILE_ACTION: Record<string, ChronossusTileActionId> = {
  C01: 'tile-reboot',
  C02: 'tile-score',
  C03: 'tile-energy-pack',
  // Fractures of Time. C14 is the harder Assimilate that can replace C04, so it maps to
  // the same action; `tileFamily` on the resolve input keeps its own effect.
  C04: 'tile-assimilate',
  C14: 'tile-assimilate',
  C05: 'tile-extract',
  C06: 'tile-power-pack',
  // Guardians of the Council
  C11: 'tile-acquire-guardian',
  // Pioneers of New Earth. C09 sits in a tile slot; C10 covers the printed "Recruit
  // Genius or Research" space. Both are the same Adventure Action.
  C09: 'tile-adventure',
  C10: 'tile-adventure',
  // Doomsday. Separate Actions, so no shared id and no `liveTileFamily` ambiguity.
  C07: 'tile-experiment-1',
  C08: 'tile-experiment-2',
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
        📖 Time Travel {open ? '▾' : '▸'}
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
        📖 Autoleap {open ? '▾' : '▸'}
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
    case 'mech': {
      const guardians = bot.guardians?.powered ?? 0;
      return guardians > 0
        ? `${c.label}: ${count} to place — ${bot.exosuitsAvailable} normal Exosuit${bot.exosuitsAvailable === 1 ? '' : 's'} and ${guardians} Guardian${guardians === 1 ? '' : 's'}`
        : `${c.label}: ${count} powered Exosuit${count === 1 ? '' : 's'} available`;
    }
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
    case 'genius':
    case 'administrator':
    case 'engineer':
    case 'scientist': {
      // Fractures: Operators sit in these columns as wildcards, so they need no tracker of
      // their own — but the column should say when one of its Workers is an Operator.
      const ops = bot.operatorSlots?.[c.key] ?? 0;
      return ops > 0
        ? `${c.label}: ${count} (${ops} ${ops === 1 ? 'is an Operator' : 'are Operators'})`
        : `${c.label}: ${count}`;
    }
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
      // Guardians are figures it can place too (last), so the tracker counts both —
      // the pop-out and tooltip break them apart.
      return bot.exosuitsAvailable + (bot.guardians?.powered ?? 0);
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
// Fractures: the Flux Pool's two token kinds — Flux Cores and the Empty Flux
// Casings drawn out of it (the exhausted-core art is the empty casing).
const FC_ICON = '/assets/solo/chronossus/flux-core.png';
/** Pioneers: the Power fist, cropped from the Adventure die art. */
const POWER_ICON = '/assets/solo/chronossus/power-icon.png';
/** Where an Adventure placement (or Blink) lands — the app never renders that board. */
const ADVENTURE_DESTINATION = "the Adventure board's hex pool space";
/**
 * Where each Resource slot sits on the Upgrade board art, as a % of the image — measured
 * off `upgrade-board-A.jpg` (565x800); both sides share the layout. This is the printed
 * left-to-right order, NOT the Power Upgrade tie-break order.
 */
// Measured off upgrade-board-A.jpg (565x800): the printed cube centres are at x = 89,
// 221, 350, 477 px and y = 457 — the overlay used to sit about 1% left of each.
const UPGRADE_SLOT_POS = [
  { resource: 'titanium' as const, x: 15.8, y: 57.2, power: 2 },
  { resource: 'uranium' as const, x: 39.2, y: 57.2, power: 3 },
  { resource: 'gold' as const, x: 61.9, y: 57.2, power: 3 },
  { resource: 'neutronium' as const, x: 84.5, y: 57.2, power: 4 },
];
/**
 * The VP-token space on the same art: the ▼ inside the ringed circle at the bottom, where
 * the tokens physically stack. Measured off upgrade-board-A.jpg (565x800) at (283, 749);
 * the chip is centre-anchored.
 */
const UPGRADE_VP_POS = { x: 50, y: 95.9 };

/** Printed Action spaces a mode's tile can cover (slots IV/V). */
const COVERED_ACTIONS: CoveredAction[] = ['time-travel', 'recruit-genius-research'];
const EFC_ICON = '/assets/solo/chronossus/exhausted-flux-core.png';
const EXOSUIT_ICON = '/assets/solo/chronossus/exosuit.png';
const PATH_ICON = '/assets/solo/chronossus/path-marker.png';

/** The Exosuit icon + count (replaces the 🦾 emoji in the stat bar / Turn popover). */
function CxExosuit({
  count,
  guardians = 0,
  size = 18,
}: {
  /** Powered plain Exosuits. */
  count: number;
  /** Guardians of the Council: powered Guardians, counted in the same total. */
  guardians?: number;
  size?: number;
}) {
  // Guardians are Exosuits the bot places (last), so they belong in the same number —
  // a separate chip made the player add two counts to know what it can still do.
  return (
    <span className="cx-exosuit">
      <img src={EXOSUIT_ICON} alt="Powered Exosuits" style={{ height: size }} />
      {count + guardians} Exo
      {guardians > 0 && (
        <span className="cx-exo-guardians">
          {' '}
          (inc {guardians} Guardian{guardians === 1 ? '' : 's'})
        </span>
      )}
    </span>
  );
}

/**
 * Pioneers: the Chronossus Exosuit Upgrade board, shown as the real component with its
 * current state marked on it — which Resource slots have been filled by Power Upgrades,
 * how many VP tokens are on it, and the Power that adds up to.
 *
 * The board itself is player-managed (like the Valley and Guardian boards), so this is a
 * read-only status view: it never asks for anything, it just shows what the app believes
 * is sitting there, and the Power total is what decides which Adventure deck it draws from.
 */
function CxUpgradeBoardPopout({
  bot,
  onClose,
}: {
  bot: ChronossusState;
  onClose: () => void;
}) {
  const [showTokenCount, setShowTokenCount] = useState(false);
  const p = bot.pioneers;
  if (!p) return null;
  const breakdown = Chronossus.powerBreakdown(bot);
  const total = Chronossus.boardPower(bot);
  // The VP-token spot is a tracker: it reads as the Power those tokens add (which is what
  // matters in play), and tapping it swaps to how many tokens are actually sitting there.
  const tokenPower = p.vpTokens * Chronossus.VP_TOKEN_POWER[p.boardSide];
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="cx-upgrade-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Chronossus Exosuit Upgrade board"
      >
        <div className="dp-head">
          <div className="dp-title">
            <h2>Exosuit Upgrade board</h2>
          </div>
          <button className="dp-close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>
        <div className="cx-upgrade-body">
          <div className="cx-upgrade-art">
            <img
              src={`/assets/solo/chronossus/upgrade-board-${p.boardSide}.jpg`}
              alt={`Chronossus Exosuit Upgrade board, ${p.boardSide} side`}
            />
            {/* A filled slot gets its Resource cube laid over the printed placeholder, so
                the pop-out reads like the physical board rather than a list. */}
            {UPGRADE_SLOT_POS.map((slot) => (
              <span
                key={slot.resource}
                className={`cx-upgrade-slot ${p.upgraded[slot.resource] ? 'filled' : ''}`}
                style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
                title={
                  p.upgraded[slot.resource]
                    ? `${slot.resource}: upgraded (+${slot.power} Power)`
                    : `${slot.resource}: empty (+${slot.power} Power when filled)`
                }
              >
                {p.upgraded[slot.resource] && (
                  <img src={`/assets/solo/chronossus/resource-${slot.resource}.png`} alt="" />
                )}
              </span>
            ))}
            {p.vpTokens > 0 && (
              <button
                type="button"
                className="cx-upgrade-tokens"
                style={{ left: `${UPGRADE_VP_POS.x}%`, top: `${UPGRADE_VP_POS.y}%` }}
                onClick={() => setShowTokenCount((v) => !v)}
                title={
                  showTokenCount
                    ? `${p.vpTokens} VP token${p.vpTokens === 1 ? '' : 's'} on the board`
                    : `+${tokenPower} Power from its VP tokens — tap for the token count`
                }
                aria-label={`VP tokens: ${p.vpTokens}, worth ${tokenPower} Power`}
              >
                {showTokenCount ? (
                  <>
                    {p.vpTokens} <span className="cx-upgrade-tokens-unit">VP</span>
                  </>
                ) : (
                  <>
                    +{tokenPower}
                    {/* No teal outline here: this chip sits on its own amber background,
                        where the fist already reads (same call as the die faces). */}
                    <img src={POWER_ICON} alt="" aria-hidden="true" />
                  </>
                )}
              </button>
            )}
          </div>
          <div className="cx-upgrade-side">
            <p className="cx-upgrade-total">
              <b>{total}</b>
              <img src={POWER_ICON} alt="Power" className="cx-power-icon lg" />
            </p>
            <ul className="cx-upgrade-rows">
              {breakdown.map((b) => (
                <li key={b.label}>
                  <span>{b.label}</span>
                  <b>+{b.power}</b>
                </li>
              ))}
            </ul>
            <p className="cx-upgrade-note">
              At <b>{Chronossus.BIG_DECK_THRESHOLD}</b> or more Power — including the Path
              marker&rsquo;s bonus, before the die — it draws from the <b>10+</b> Adventure
              deck.
            </p>
            {p.vpTokens > 0 && (
              <p className="cx-upgrade-note">
                Its {p.vpTokens} VP token{p.vpTokens === 1 ? '' : 's'} add Power but are{' '}
                <b>not</b> VP, unless that difficulty option is on.
              </p>
            )}
            <p className="cx-upgrade-note">
              Adventures completed: <b>{p.adventures}</b>.
            </p>
          </div>
        </div>
      </div>
    </div>
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

/**
 * Fractures' Flux Pool, shown the same way as the Energy Pool: Flux Cores and Empty Flux
 * Casings still in the pool, plus the Casings set aside this Era (they return in Clean Up)
 * — the pool's contents are what decide how often it Blinks.
 */
function CxFluxPool({
  pool,
  size = 20,
}: {
  pool: NonNullable<ChronossusState['fluxPool']>;
  size?: number;
}) {
  return (
    <span className="cx-energy-pool">
      <span className="cx-energy" title="Flux Cores in the Flux Pool — each one is a Blink">
        <img src={FC_ICON} alt="Flux Cores" style={{ height: size }} />
        <b>{pool.cores}</b>
      </span>
      <span className="cx-energy" title="Empty Flux Casings still in the Flux Pool">
        <img src={EFC_ICON} alt="Empty Flux Casings" style={{ height: size }} />
        <b>{pool.casings}</b>
      </span>
      {pool.setAside > 0 && (
        <span
          className="cx-energy cx-flux-aside"
          title="Empty Flux Casings set aside this Era — they return to the pool in Clean Up"
        >
          <span aria-hidden>⊘</span>
          <b>{pool.setAside}</b>
        </span>
      )}
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
  // Docked open by default: the turn log is the main way to see what the bot just did
  // (and why it passed), so it should be there without being asked for. The ⚙ menu and
  // the 🕑 button still toggle it.
  const [showHistory, setShowHistory] = useState(true);
  const [modeRules, setModeRules] = useState(false); // GameBrain rules overlay open
  const [actionsIntroEra, setActionsIntroEra] = useState<number | null>(null);
  const [showFirstPlayer, setShowFirstPlayer] = useState(false);
  const [showStatus, setShowStatus] = useState(false); // Turn-chip popover
  // Read-only rule view (a free-tap / SCV row shows the action's rules, no turn).
  const [ruleView, setRuleView] = useState(false);
  // A modular tile action (Reboot / Score / Energy Pack) awaiting its ▶ Start
  // (the marker landed on a tile slot). Its dialog waits like every other action.
  const [pendingTile, setPendingTile] = useState<ChronossusTileActionId | null>(null);
  /**
   * Which tile FAMILY the open dialog is for. Two families can share one action id —
   * Pioneers puts C09 in a tile slot and C10 over "Recruit Genius or Research", and both
   * are `tile-adventure` — so the action id alone cannot say which tile was activated.
   * `liveTileFamily` would just return whichever comes first in the mode's slots, which
   * rendered C10 as C09 and applied C09's side effects.
   */
  const [pendingTileFamily, setPendingTileFamily] = useState<string | null>(null);
  /**
   * Guardians (C11): which step of the Acquire Guardian flow is on screen. It asks before
   * it instructs — availability (Era 4 only) → the World Council space (only when it has a
   * figure to place) → then the step that says what to physically do.
   */
  const [guardianStep, setGuardianStep] = useState<
    'available' | 'world-council' | 'place' | 'worker' | 'failed' | null
  >(null);
  /** The answers gathered so far this Acquire Guardian, replayed into the resolver. */
  /** Guardians: this turn's Action is being taken from a Guardian board space. */
  const guardianSpaceRef = useRef(false);
  /** Same fact, kept for `finishTurn`'s History line (resolve clears the one above). */
  const guardianBoardTurnRef = useRef(false);
  const guardianAnswersRef = useRef<{ worldCouncilFree: boolean; guardianAvailable: boolean }>({
    worldCouncilFree: false,
    guardianAvailable: true,
  });
  /**
   * Doomsday (C07/C08): which step of the Experiment flow is on screen. The Timeline's
   * Experiment cards are not modelled, so the dialog states the rulebook's selection rule
   * and asks what is actually on the table: is one of this level carrying a Path marker,
   * what VP is printed on it, and can a marker be placed for next time.
   */
  const [experimentStep, setExperimentStep] = useState<'marked' | 'vp' | 'prepare' | null>(null);
  /** The answers gathered so far this Experiment, replayed into the resolver. */
  const experimentAnswersRef = useRef<Chronossus.ExperimentInput>({
    markedAvailable: false,
    canPrepare: true,
  });
  /**
   * Pioneers (C09/C10): which step of the Adventure flow is on screen. It asks which
   * strength-bonus slot the marker went on (that column is shared with the player's own
   * markers), then — in shared-deck mode — which two cards were drawn, then shows the
   * result before committing.
   */
  const [adventureStep, setAdventureStep] = useState<
    'slot' | 'blink' | 'casing' | 'shared-draw' | 'result' | null
  >(null);
  /** Fractures: this Adventure is being taken by Blinking rather than placing. */
  const advBlinkedRef = useRef(false);
  /** Pioneers: the Exosuit Upgrade board pop-out (opened from under the Exo tracker). */
  const [showUpgradeBoard, setShowUpgradeBoard] = useState(false);
  /**
   * The Adventure's inputs, kept in a ref so Undo re-shows the SAME roll and the SAME two
   * cards rather than rolling again (the roll-persistence rule the other flows follow).
   */
  const advInputRef = useRef<AdventureInput | null>(null);
  const [advResult, setAdvResult] = useState<AdventureResult | null>(null);
  const [advSharedPicked, setAdvSharedPicked] = useState<string[]>([]);
  const advSlotRef = useRef<number>(0);
  /** Shared-deck mode: the rolled die, held so a re-render (or Undo) can't reroll it. */
  const advDieRef = useRef<number | null>(null);
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
  // Fractures: the Blink the app resolved for the current Action (shown in the panel),
  // and the space answer for the placement gate's two questions.
  const [fluxDraw, setFluxDraw] = useState<'core' | 'casing' | null>(null);
  // Fractures: the Blink-check step inside the Valley tile dialog, and the space answered.
  const [tileBlinkStep, setTileBlinkStep] = useState<
    'blink' | 'casing' | 'operators' | 'assimilate' | null
  >(null);
  const valleySpaceRef = useRef<'action' | 'capital'>('action');
  // Fractures' Assimilate: the shape rolled for this turn, and the placement answers held
  // while the "are there Operators left?" gate is up (Solo Opponents p.13).
  const assimShapeRef = useRef<BreakthroughShape | null>(null);
  const assimGateRef = useRef<{ space?: 'action' | 'capital'; blinked: boolean }>({ blinked: false });
  // Same, for the Hypersync dialog (its hex is another off-board Blink destination).
  const [hsBlinkStep, setHsBlinkStep] = useState<'blink' | 'casing' | null>(null);
  const hsInputRef = useRef<Chronossus.HypersyncActionInput | null>(null);
  const [blink, setBlink] = useState<{
    spaceLabel: string;
    sameSpaceCount: number;
    rule: 'command-token' | 'bottom-left';
    token?: number;
  } | null>(null);
  const placementSpaceRef = useRef<'action' | 'world-council'>('action');
  const blinkRef = useRef(false);
  // Where the Action's own sub-flow resumes once the Blink check has resolved. Mine and
  // Recruit-Genius ask their own placement question instead of the shared `mech` gate, so
  // the continuation can't be derived from the Action id the way `beginPlacementSubflow`
  // does for the gated Actions.
  const postBlinkRef = useRef<(() => void) | null>(null);
  // Where the Exosuit a Blink is about to move came from and where it lands, kept for the
  // History line so a Blink doesn't read like an ordinary placement (`blink` state is
  // cleared per turn). Both ends are named by their Capital Action SPACE ("Construct", not
  // "Construct — Superproject") — the space is what the board shows.
  const blinkFromRef = useRef<{
    spaceLabel: string;
    toLabel: string;
  } | null>(null);
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
  /** Fractures of Time: splits the placement gate, runs the Blink check, tracks the Flux Pool. */
  const fracturesMode = Chronossus.isFracturesMode(state.config.chronossusMode);
  const guardiansMode = Chronossus.isGuardiansMode(state.config.chronossusMode);
  const doomsdayMode = Chronossus.isDoomsdayMode(state.config.chronossusMode);
  /** The last Era of this game — 5 with Fractures' shorter Timeline, else 7. */
  const maxEra = Chronossus.maxEraFor(state.config);
  /** The first post-Impact Era — 4 with Fractures, 5 normally, and with Doomsday whatever
   *  the player has reported (its Impact tile moves, so it cannot be derived). */
  const postImpactEra = Chronossus.postImpactEraFor(state.config, state.chronossus);
  /** Post-Impact from that Era on, whatever the stored flag says (it can lag a debug jump). */
  const postImpactNow =
    state.impact || Chronossus.isPostImpact(state.era, state.config, state.chronossus);
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
  /**
   * Pioneers covers the printed "Recruit Genius or Research" space with C10 — the first
   * module to use slot IV. Whenever that space is activated (die-driven or tapped) the
   * Adventure runs instead of the printed Action.
   */
  const adventureCoversGeniusResearch = (): boolean =>
    !!slotCovering(mode, 'recruit-genius-research');
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
      // The Warp marker is a badge for this purpose too — clicking it must not be read as
      // an outside click, or its popover closes on the same press that opened it.
      if (!t.closest('.count-badge') && !t.closest('.warp-marker') && !t.closest('.badge-portal'))
        setTappedBadge(null);
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
  /** Clear the per-turn Fractures answers (placement space + Blink). */
  const resetFracturesTurn = () => {
    placementSpaceRef.current = 'action';
    blinkRef.current = false;
    postBlinkRef.current = null;
    blinkFromRef.current = null;
    setBlink(null);
    setFluxDraw(null);
    setTileBlinkStep(null);
    valleySpaceRef.current = 'action';
    setHsBlinkStep(null);
    hsInputRef.current = null;
  };

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
    setPendingTileFamily(null);
    setTileRuleView(false);
    // A cancelled turn must not leave the Guardian-board flag set for the next one.
    guardianSpaceRef.current = false;
    resetFracturesTurn();
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

  /**
   * The tile action a track position triggers *in this mode*. `chronossusPaths.ts` names
   * the base-game tile (m2p3 → 'tile-reboot' for C01), so a mode that fills that slot with
   * a different tile — Fractures' C04/C05/C06 — has to map through its own slot instead.
   */
  const tileActionAt = (posKey: string): ChronossusTileActionId | null => {
    const slot = slotAtPos(mode, posKey);
    if (slot) return FAMILY_TO_TILE_ACTION[slot.family] ?? null;
    const tp = trackPos(posKey);
    return (tp?.action as ChronossusTileActionId | undefined) ?? null;
  };

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
  /**
   * History detail for a pass. The die and the Action it landed on are the whole reason
   * the bot passed, so a later read-back can see WHY without replaying the turn.
   */
  const passEffects = (actionId: ChronossusActionId): string[] => {
    const label = Chronossus.chronossusActionLabel(actionId);
    // "Out of Exosuits" covers Guardians too — a Guardian IS an Exosuit, so naming them
    // separately here would imply they're a different resource.
    return [
      `Rolled onto ${label}, which needs a figure placed`,
      'Out of Exosuits — it passes',
    ];
  };

  const finishTurn = (
    stateA: GameState,
    instrA: Instruction[],
    actionLabel: string,
    extraLeap = false,
  ) => {
    const preC = state.chronossus!;
    const marker = activeMarkerRef.current;
    // Fractures: if this turn was a Blink, the placement moved an Exosuit already on the
    // board (so `summarizeTurn` sees no Exosuit spent and would read as a plain turn) —
    // call it out with where it came from. Consumed here so it can't leak into a later turn.
    const blinkFrom = blinkFromRef.current;
    blinkFromRef.current = null;
    // `{flux}` renders as the Flux Core art (HistoryText) — the Blink's own component.
    // The Energy Core going back to the supply is in the rules and implied here.
    const blinkEffect = blinkFrom
      ? `{flux} Blink — Exosuit moved from **${blinkFrom.spaceLabel}** to **${blinkFrom.toLabel}**`
      : null;
    /** The move IS the placement, so it replaces the shared summarizer's "Exosuit placed". */
    const withBlink = (effects: string[]) => {
      if (!blinkEffect) return effects;
      const out = effects.filter((e) => e !== 'Exosuit placed');
      out.unshift(blinkEffect);
      return out;
    };
    if (marker == null) {
      const soloEffects = summarizeTurn(preC, stateA.chronossus!, instrA);
      summarizeChronossusExtras(preC, stateA.chronossus!, soloEffects, {
        guardianBoard: guardianBoardTurnRef.current,
      });
      guardianBoardTurnRef.current = false;
      commit(stateA, ui, turnLabel(instrA, actionLabel), withBlink(soloEffects), botDieRef.current);
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
      // Record an Autoleap the marker just landed on: its Action still owes a resolution,
      // so closing the dialog must not drop it (Take Bot Action re-opens it).
      owedLeap: leap ? { code: leap.code, actionId: leap.actionId, isHypersync: leap.isHypersync } : null,
    };
    // History effects: the action's state-diff summary + Energy Cores gained
    // (summarizeTurn doesn't read the Energy Pool, so an energy-only tile like C03B would
    // otherwise leave no trace).
    const effects = summarizeTurn(preC, stateA.chronossus!, instrA);
    summarizeChronossusExtras(preC, stateA.chronossus!, effects, {
      guardianBoard: guardianBoardTurnRef.current,
    });
    guardianBoardTurnRef.current = false;
    const ec = stateA.chronossus!.energyPool.energized - preC.energyPool.energized;
    if (ec > 0) effects.unshift(`+${ec} Energy Core${ec === 1 ? '' : 's'}`);
    commit(stateA, newUi, turnLabel(instrA, actionLabel), withBlink(effects), botDieRef.current);
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
    setPendingTileFamily(null);
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

  // One-line History label for a resolved turn (Era · action · +VP). A Blink stays OFF this
  // line — the Action taken is what matters; how the Exosuit got there is an effect below.
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
    // Guardians: the Action ran from a Guardian board space — the engine takes that
    // branch off the same no-space input plus a powered Guardian.
    if (guardianSpaceRef.current) input.noSpaceAvailable = true;
    if (opts.buildingVP != null) input.buildingVP = opts.buildingVP;
    if (opts.minedResources) input.minedResources = opts.minedResources;
    if (opts.recruitedWorker) input.recruitedWorker = opts.recruitedWorker;
    if (opts.shape) input.shape = opts.shape;
    if (opts.geniusAvailable) input.geniusAvailable = true;
    // Fractures: which space this placement took, and whether it was a Blink (the moved
    // Exosuit IS the placement, so no new one comes off the supply).
    if (fracturesMode) {
      input.placementSpace = placementSpaceRef.current;
      input.tokenActions = otherTokenActions();
      if (blinkRef.current) input.blink = true;
    }
    // Hypersync no-space fallback: perform the Capital Action via a Solo Hypersync
    // tile (no Exosuit, not a Failed Action).
    if (hypersyncTileRef.current) input.placeHypersyncTile = true;
    if (opts.hypersyncNoTile) input.hypersyncNoTile = true;
    const { state: next, instructions } = Chronossus.resolveAction(state, input);
    setPending(null);
    hypersyncTileRef.current = false; // consumed
    guardianBoardTurnRef.current = guardianSpaceRef.current; // for the History line
    guardianSpaceRef.current = false; // consumed
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
    setPendingTileFamily(null);
    setTileRuleView(false);
    setPendingHypersync(null);
    setResult([]);
  };

  /**
   * The passing rule, for whichever Action a rolled marker landed on: out of figures and
   * this Action would place one → the Chronossus passes instead of taking it (its token
   * does NOT advance), unless Fractures makes a Blink possible.
   *
   * Every path that activates an Action calls this — the printed space, a modular tile
   * slot, and a tile COVERING a printed space (Pioneers' C10). Returns true when it
   * passed, meaning the caller must stop.
   */
  const passIfOutOfFigures = (
    actionId: ChronossusActionId,
    opts?: {
      /**
       * The Blink check has already run and drew an Empty Flux Casing, so there is no
       * Blink to stand in for the placement — judge this one as a plain placement. The
       * exemption is what let the Action get this far with an empty supply, so leaving it
       * on here would place an Exosuit the bot does not have.
       */
      blinkFailed?: boolean;
    },
  ): boolean => {
    if (
      !Chronossus.passesInsteadOfAction(bot, actionId, {
        fractures: fracturesMode && !opts?.blinkFailed,
        hypersync: { era: state.era, active: hypersyncMode },
      })
    ) {
      return false;
    }
    const { state: next, instructions } = Chronossus.passChronossus(state);
    // The token does NOT advance on a pass → keep ui.markerSteps as-is. The rolled die
    // and the Action it hit go into the entry, so History shows why it passed.
    commit(
      next,
      { ...ui, botDie: botDieRef.current },
      `Era ${state.era} · Chronossus passed`,
      passEffects(actionId),
      botDieRef.current,
    );
    closePanel();
    setLastResult(instructions); // shown in the turn-status aside
    return true;
  };

  /**
   * What a printed Action space actually resolves as: with Pioneers' C10 on it, "Recruit
   * Genius or Research" IS the Adventure, and every rule that keys off the Action id (the
   * passing rule above, the Blink check) has to judge that one.
   */
  const actedActionId = (action: string): ChronossusActionId =>
    action === 'recruit-genius-research' && adventureCoversGeniusResearch()
      ? 'tile-adventure'
      : (action as ChronossusActionId);

  /**
   * Fractures: the Blink check drew an Empty Flux Casing and the bot has no figure left,
   * so this Action ends in a pass, not a placement — the panels say so instead of asking
   * for an Exosuit that does not exist.
   */
  const blinkFailedPass = (actionId: ChronossusActionId | null | undefined): boolean =>
    !!actionId &&
    fluxDraw === 'casing' &&
    Chronossus.passesInsteadOfAction(bot, actionId, {
      hypersync: { era: state.era, active: hypersyncMode },
    });

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
    // The Action this space actually resolves as (Pioneers' C10 makes it the Adventure).
    const acted = actedActionId(h.action);
    if (passIfOutOfFigures(acted)) return;
    // HFA: out of figures, but a Solo Hypersync tile can stand in for the Exosuit — so
    // there is nothing to place and no space question to ask. Go straight to the tile.
    if (
      hypersyncMode &&
      CAPITAL_ACTIONS.has(h.action) &&
      Chronossus.placeableFigures(bot) <= 0 &&
      Chronossus.canPlaceHypersyncTile(bot, state.era)
    ) {
      setShowHypersyncTilePrompt(true);
      return;
    }
    if (h.action === 'recruit-genius-research' && adventureCoversGeniusResearch()) {
      // C10 sits on this printed space: it is an Adventure, not Recruit Genius/Research.
      setPending(null);
      setPendingTileFamily(slotCovering(mode, 'recruit-genius-research')?.family ?? null);
      setPendingTile('tile-adventure');
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
    } else if (h.action === 'time-travel') {
      // Always opens — without a Warp tile the dialog states the Failed Action (+VP)
      // rather than resolving silently.
      setPending('timeTravel');
    } else if (CHRONOBOT_ACTIONS[h.action].placesExosuit) {
      setPending('mech');
    } else {
      resolve(h, {});
    }
  };

  // Fractures Blink check: draw 1 token from the Flux Pool. A Flux Core is discarded and
  // the Chronossus Blinks (the app picks which Exosuit); an Empty Flux Casing is set
  // aside and it places as usual. The draw is committed to state either way.
  const runBlinkCheck = (action: string) => {
    const pool = bot.fluxPool!;
    const { drawn, pool: nextPool } = Chronossus.drawFlux(pool, Math.random());
    setState((cur) => ({
      ...cur,
      chronossus: { ...cur.chronossus!, fluxPool: nextPool },
    }));
    setFluxDraw(drawn);
    if (drawn === 'casing') {
      blinkRef.current = false;
      blinkFromRef.current = null;
      setBlink(null);
      setPending('fluxCasing');
      return;
    }
    const sel = Chronossus.selectBlinkExosuit(bot, action, otherTokenActions());
    if (!sel) {
      // Shouldn't happen (shouldCheckBlink gates on a ready Exosuit), but fall back to a
      // normal placement rather than stalling the turn.
      blinkRef.current = false;
      setPending('mech');
      return;
    }
    blinkRef.current = true;
    const toSpace = Chronossus.blinkSpaceOf(action, placementSpaceRef.current);
    blinkFromRef.current = {
      spaceLabel: Chronossus.BLINK_SPACE_LABEL[sel.space],
      toLabel: toSpace
        ? Chronossus.BLINK_SPACE_LABEL[toSpace]
        : (CHRONOBOT_ACTIONS[action as ChronobotActionId]?.label ?? action),
    };
    setBlink({
      spaceLabel: Chronossus.BLINK_SPACE_LABEL[sel.space],
      sameSpaceCount: sel.sameSpaceCount,
      rule: sel.rule,
      token: sel.token,
    });
    setPending('blink');
  };

  /** Which Action each OTHER Command token currently sits on (Blink rule A). */
  const otherTokenActions = (): Record<number, string> => {
    const out: Record<number, string> = {};
    for (const n of [2, 3, 4, 5] as const) {
      if (n === activeMarkerRef.current) continue;
      const key = markerPosKey(n, ui.markerSteps[n]);
      const action = trackPos(key)?.action;
      if (action) out[n] = action;
    }
    return out;
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

  // A space is free (either the printed one or World Council). In Fractures the Blink
  // check happens HERE — the Chronossus only Blinks into a space it could have placed
  // into, so there has to be a confirmed destination first. Then the Action's own inputs.
  const onConfirmPlace = () => {
    if (!active) return;
    if (fracturesMode && pending === 'mech') placementSpaceRef.current = 'action';
    if (fracturesMode && Chronossus.shouldCheckBlink(bot, active.action)) {
      runBlinkCheck(active.action);
      return;
    }
    beginPlacementSubflow();
  };

  /**
   * Guardians: the player has put the Guardian on its Guardian board space. The Action
   * itself is unaffected, so fall into its normal input steps (Construct's VP tap, Mine's
   * resources…) — `guardianSpaceRef` makes `resolve` send the no-space input the engine
   * keys the Guardian branch off.
   */
  const onGuardianSpace = () => {
    if (!active) return;
    beginPlacementSubflow();
  };

  /** The Action's own input steps, once placement (or a Blink) is settled. */
  const beginPlacementSubflow = () => {
    if (!active) return;
    // Mine / Recruit-Genius run the check from their own question and say where to pick up.
    const resume = postBlinkRef.current;
    if (resume) {
      postBlinkRef.current = null;
      resume();
      return;
    }
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

  // Fractures: "no Capital Action space open" asks about World Council before failing.
  const onWorldCouncilYes = () => {
    placementSpaceRef.current = 'world-council';
    if (active && Chronossus.shouldCheckBlink(bot, active.action)) {
      runBlinkCheck(active.action);
      return;
    }
    beginPlacementSubflow();
  };
  const onWorldCouncilNo = () => {
    placementSpaceRef.current = 'action';
    cannotPlaceFallback();
  };
  // The Exosuit has been moved into the confirmed space — carry on with the Action.
  const onConfirmBlink = () => beginPlacementSubflow();
  // The Casing is set aside: "The Chronossus places an Exosuit or passes, as usual"
  // (Solo Opponents p.12). With no figure left that resolves to the PASS — the Blink
  // exemption is what let this Action start, and the Blink just failed.
  const onFluxCasingContinue = () => {
    if (active && passIfOutOfFigures(actedActionId(active.action), { blinkFailed: true })) {
      return;
    }
    beginPlacementSubflow();
  };

  const onCannotPlace = () => {
    if (!active) return;
    if (fracturesMode) {
      // Two-question gate: the printed space is full, so ask about World Council.
      setPending('worldCouncil');
      return;
    }
    cannotPlaceFallback();
  };

  const cannotPlaceFallback = () => {
    if (!active) return;
    // Guardians: a Capital Action with no space anywhere puts a Guardian on its own
    // Guardian board space and performs the Action normally. Checked FIRST — it beats
    // Hypersync's Solo-tile fallback in the combo (Solo Opponents p.16).
    if (Chronossus.canUseGuardianSpace(bot, active.action)) {
      guardianSpaceRef.current = true;
      setPending('guardianSpace');
      return;
    }
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
  // "Is a Mining space open?" IS this Action's placement gate — so the Blink check belongs
  // right after it, before anything is placed, exactly like the Genius question. Which
  // Mine space it is comes from the Resources picked next; the Blink/placement itself is
  // settled at the Action's granularity ("Mine"), which is all the panels name.
  const onMineHasSpace = () => {
    const resources = () => {
      setSelectedResources(Chronobot.mineResourceOrder(bot).slice(0, 2));
      setPending('mineResources');
    };
    if (fracturesMode && Chronossus.shouldCheckBlink(bot, 'mine-resource')) {
      placementSpaceRef.current = 'action';
      postBlinkRef.current = resources;
      runBlinkCheck('mine-resource');
      return;
    }
    resources();
  };
  const onMineNoSpace = () => {
    if (active) resolve(active, { cannotPlace: true });
  };
  const onPickVP = (vp: number) => setSelectedVP(vp);
  const onPickWorker = (w: Worker) => setSelectedWorker(w);
  // The Genius question already confirms an open Recruit space, so it IS this Action's
  // placement gate — the Blink check belongs right after it, before anything is placed.
  const onGeniusYes = () => {
    const recruit = () => setPending('geniusRecruit');
    if (fracturesMode && Chronossus.shouldCheckBlink(bot, 'recruit-genius-research')) {
      placementSpaceRef.current = 'action';
      postBlinkRef.current = recruit;
      runBlinkCheck('recruit-genius-research');
      return;
    }
    recruit();
  };
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
      // The Blink check already ran, back at the "is a Mining space open?" gate.
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
    // AFTER closeDialogs — it clears pendingTile, and with it the family.
    setPendingTileFamily(tileCode.slice(0, -1));
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
    // The live tile for THIS mode — `p.action` is the base-game tile the path data names
    // for the slot, so reading it directly opened Reboot/Score/Energy Pack on top of a
    // Fractures game's C04/C05/C06 art.
    const tileAction = tileActionAt(p.key);
    if (!tileAction) return;
    if (!debug) {
      showTileRules(tileAction);
      return;
    }
    botDieRef.current = null;
    activeMarkerRef.current = null;
    closeDialogs();
    setResult([]);
    // A debug tap activates the Action for real, exactly as a tap on a printed Action
    // space does — so the passing rule applies here too.
    if (passIfOutOfFigures(tileAction)) return;
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
      // The live tile action for this mode (Fractures fills these slots with C04-C06).
      const live = tileActionAt(key) ?? tp.action;
      const label = modeSlot
        ? (CHRONOSSUS_TILES[code]?.name ?? Chronossus.chronossusActionLabel(live))
        : Chronossus.chronossusActionLabel(live);
      return { num, action: live, label, tile: code };
    }
    const [x, y] = positions[key] ?? [0, 0];
    const h = nearestHotspot(x, y);
    // A mode can COVER a printed Action space with a tile — Hypersync's C13 over Time
    // Travel, Pioneers' C10 over "Recruit Genius or Research". The row has to name the
    // tile actually sitting there; naming the printed Action tells the player to take an
    // Action the tile replaced. Driven off `slotCovering` so a new module's covered space
    // works without another special case here.
    const covered = COVERED_ACTIONS.find((c) => c === h.action);
    const coveringSlot = covered ? slotCovering(mode, covered) : undefined;
    if (coveringSlot) {
      const code = tileCodeFor(coveringSlot.family, tileSides);
      return {
        num,
        action: h.action,
        label: CHRONOSSUS_TILES[code]?.name ?? CHRONOBOT_ACTIONS[h.action].label,
        tile: code,
      };
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
        timeTravel={(() => {
          const r = warpRemoval(bot, state.era);
          return {
            canTravel: r.eligible,
            fromEra: r.era,
            onlyCurrentEra: !r.eligible && bot.warpTilesOnTimeline > 0,
          };
        })()}
        failVP={Chronossus.failedActionVP(state.config.difficulty)}
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
        figure={Chronossus.nextFigure(bot) ?? 'exosuit'}
        onConfirmPlace={onConfirmPlace}
        onCannotPlace={onCannotPlace}
        onGuardianSpace={onGuardianSpace}
        fractures={fracturesMode}
        blinkCheck={fracturesMode && Chronossus.shouldCheckBlink(bot, active.action)}
        placementHandled={fracturesMode && fluxDraw != null}
        outOfFigures={blinkFailedPass(actedActionId(active.action))}
        placeDestination={(() => {
          const space = Chronossus.blinkSpaceOf(active.action, placementSpaceRef.current);
          if (!space) return null; // not a Capital Action space — the panel names the Action
          if (space === 'world-council') return 'the World Council space';
          // Mine picks its space by the Resources it grants, not by reading down the
          // column — and the Blink check runs at its space gate, before the Resources are
          // named, so this points forward to that step rather than back at a choice made.
          if (space === 'mine') return 'a Mine Action space (which one comes next, with the Resources)';
          return `the topmost open ${Chronossus.BLINK_SPACE_LABEL[space]} Action space`;
        })()}
        blink={blink}
        fluxDrawSrc={fluxDraw === 'core' ? FC_ICON : fluxDraw === 'casing' ? EFC_ICON : null}
        onWorldCouncilYes={onWorldCouncilYes}
        onWorldCouncilNo={onWorldCouncilNo}
        onConfirmBlink={onConfirmBlink}
        onFluxCasingContinue={onFluxCasingContinue}
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

  /**
   * The module dialogs (modular tile / Hypersync Action / Hypersync-tile fallback).
   * They render exactly where a board Action's DetailPanel does — absolutely on the board
   * normally, in normal flow under the top bar on small screens — so a module Action never
   * takes over the whole screen when a base-game one wouldn't.
   */
  const renderModDialogs = (flow: boolean) => (
    <>
      {pendingTile && (
        <CxTileDialog
          action={pendingTile}
          family={pendingTileFamily}
          tileSides={state.config.tileSides}
          panel={CHRONOSSUS_PANEL}
          flow={flow}
          readOnly={tileRuleView}
          autoleap={tileAutoleap}
          startLabel={startLabel}
          onStart={startTileTurn}
          onClose={cancelPanel}
          guardianGate={
            pendingTile === 'tile-acquire-guardian' && !tileRuleView && guardianStep
              ? {
                  step: guardianStep,
                  worker: Chronossus.guardianWorkerToSpend(bot),
                  figure: Chronossus.nextFigure(bot),
                  impact: postImpactNow,
                  failVP: Chronossus.failedActionVP(state.config.difficulty),
                  postImpact2VP: state.config.difficulty.includes(
                    Chronossus.DIFFICULTY_GUARDIANS_POSTIMPACT_2VP,
                  ),
                  onAvailable: onGuardianAvailable,
                  onWorldCouncil: onGuardianWorldCouncil,
                  onCommit: commitGuardian,
                }
              : null
          }
          experimentGate={
            (pendingTile === 'tile-experiment-1' || pendingTile === 'tile-experiment-2') &&
            !tileRuleView &&
            experimentStep
              ? {
                  step: experimentStep,
                  level: pendingTile === 'tile-experiment-1' ? 1 : 2,
                  locked: Chronossus.tracksLocked({
                    impactOccurred: bot.doomsday?.impactEra != null,
                    botTracker: bot.doomsday?.botTracker ?? 'seal-fate',
                    botSlot: bot.doomsday?.botSlot ?? Chronossus.DOOMSDAY_START_SLOT,
                    playerTrackerFinal: bot.doomsday?.playerTrackerFinal ?? false,
                  }),
                  trackerLabel:
                    bot.doomsday?.botTracker === 'save-earth' ? 'Save Earth' : 'Seal Fate',
                  nextSlotVp: Chronossus.botVpAt(
                    Chronossus.nextSlot(
                      bot.doomsday?.botTracker ?? 'seal-fate',
                      bot.doomsday?.botSlot ?? Chronossus.DOOMSDAY_START_SLOT,
                    ),
                  ),
                  onMarked: onExperimentMarked,
                  onVp: onExperimentVp,
                  onPrepare: onExperimentPrepare,
                }
              : null
          }
          adventureGate={
            pendingTile === 'tile-adventure' && !tileRuleView && adventureStep
              ? {
                  step: adventureStep,
                  breakdown: Chronossus.powerBreakdown(bot),
                  result: advResult,
                  sharedDeck: Chronossus.deckFor(
                    Chronossus.boardPower(bot) + advSlotRef.current,
                  ),
                  // Alphabetical, and minus anything the Chronossus has already taken —
                  // a card it holds cannot come out of the deck again.
                  sharedChoices: adventureDeckCards(
                    Chronossus.deckFor(Chronossus.boardPower(bot) + advSlotRef.current),
                  )
                    .filter(
                      (c) => !(bot.pioneers?.decks[c.deck].discard ?? []).includes(c.id),
                    )
                    .sort((a, b) => a.name.localeCompare(b.name)),
                  sharedPicked: advSharedPicked,
                  die: advDieRef.current ?? 0,
                  totalPower:
                    Chronossus.boardPower(bot) + advSlotRef.current + (advDieRef.current ?? 0),
                  blink,
                  fluxDrawSrc:
                    fluxDraw === 'core' ? FC_ICON : fluxDraw === 'casing' ? EFC_ICON : null,
                  noFigures: blinkFailedPass('tile-adventure'),
                  placementHandled: fracturesMode && fluxDraw != null,
                  // Both outcomes of the check hand off to the Path-marker question — the
                  // figure is on the hex pool (moved or placed) before the marker is asked for.
                  onConfirmBlink: () => setAdventureStep('slot'),
                  onCasingContinue: () => {
                    // No Blink and no figure → it passes, exactly as on a printed space,
                    // and no Path marker is ever placed.
                    if (passIfOutOfFigures('tile-adventure', { blinkFailed: true })) return;
                    setAdventureStep('slot');
                  },
                  onSlot: onAdventureSlot,
                  onSharedPick: onAdventureSharedPick,
                  onSharedConfirm: onAdventureSharedConfirm,
                  onShowUpgradeBoard: () => setShowUpgradeBoard(true),
                  onCommit: commitAdventure,
                }
              : null
          }
          valleyGate={
            fracturesMode &&
            Chronossus.VALLEY_TILE_ACTIONS.includes(pendingTile) &&
            !tileRuleView
              ? { onPlace: onValleyPlace, step: tileBlinkStep, blink, fluxDrawSrc:
                  fluxDraw === 'core' ? FC_ICON : fluxDraw === 'casing' ? EFC_ICON : null,
                  noFigures: blinkFailedPass(pendingTile),
                  onConfirmBlink: () => startTileTurn(valleySpaceRef.current, true),
                  onCasingContinue: () => {
                    if (passIfOutOfFigures(pendingTile, { blinkFailed: true })) return;
                    startTileTurn(valleySpaceRef.current, false);
                  },
                  onOperatorsAnswer: onOperatorsAnswer,
                  onNoSpace: onValleyNoSpace,
                  onAssimilateContinue,
                  assimilateShape: assimShapeRef.current,
                  blinkCheck: Chronossus.shouldCheckBlink(bot, pendingTile) }
              : null
          }
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
          flow={flow}
          rolledHex={ui.hsRolledHex}
          onRollHex={(hex) => setUi((u) => ({ ...u, hsRolledHex: hex }))}
          startLabel={nextMarkerIsAutoleap ? startLabel : undefined}
          onResolve={resolveHypersyncTurn}
          onClose={closeHypersync}
          blinkStep={hsBlinkStep}
          deferPlacement={fracturesMode && Chronossus.shouldCheckBlink(bot, 'time-travel')}
          blink={blink}
          fluxDrawSrc={
            fluxDraw === 'core' ? FC_ICON : fluxDraw === 'casing' ? EFC_ICON : null
          }
          onConfirmBlink={() =>
            resolveHypersyncTurn({
              ...hsInputRef.current!,
              blink: true,
              tokenActions: otherTokenActions(),
            })
          }
          onCasingContinue={() => {
            setHsBlinkStep(null);
            resolveHypersyncTurn(hsInputRef.current!);
          }}
        />
      )}
      {showHypersyncTilePrompt && active && (
        <HypersyncTilePrompt
          era={state.era}
          actionLabel={CHRONOBOT_ACTIONS[active.action].label}
          panel={CHRONOSSUS_PANEL}
          flow={flow}
          onConfirm={confirmHypersyncTile}
          onCancel={cancelHypersyncTile}
        />
      )}
    </>
  );

  // ---- Phase transitions -------------------------------------------------
  // Every phase advance goes on the undo stack, even the ones that change nothing but
  // the phase, so ↶ Undo always steps back to the screen you came from. Leaving Power
  // Up also consumes this Era's draw (`lastDraw: null`) — restored by the snapshot.
  const commitPhase = (next: GameState, label: string, effects: string[] = []) =>
    // Leaving the phase drops any owed Autoleap: Action Rounds are over, so there is no
    // turn left to resolve it in.
    commit(next, { ...ui, lastDraw: null, owedLeap: null }, label, effects);
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
        adventureDeckMode: result.adventureDeckMode,
        doomsdayPlayerPath: result.doomsdayPlayerPath,
      };
      return startFirstEra({
        ...s,
        config,
        // D3: extra starting Energy Cores — applied once here, since
        // emptyChronossusState() (mount time) predates the player's setup choices.
        // Pioneers also seeds its Upgrade board and shuffles the bot's Adventure decks
        // here; the shuffle is app randomness, handed in from the engine boundary.
        chronossus:
          s.chronossus &&
          Chronossus.applyDifficultySetup(s.chronossus, config, shuffleAdventureDeck),
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
    // Guardians power up first and share the same number, so the total is Exosuits +
    // Guardians — the label said only the Exosuit half, making a 5 read as a 4. The two
    // are split across their own lines, since they are different miniatures to pull.
    const guardiansUp = b.guardians?.powered ?? 0;
    const total = b.exosuitsAvailable + guardiansUp;
    const plural = (n: number) => (n === 1 ? '' : 's');
    commit(
      next,
      { ...ui, lastDraw: draw },
      `Era ${state.era} · Power Up: ${total} Exosuit${plural(total)}`,
      [
        `Drew ${draw.energized} Energy + ${draw.exhausted} Exhausted`,
        ...(guardiansUp > 0
          ? [
              `Powered up ${b.exosuitsAvailable} Normal Exosuit${plural(b.exosuitsAvailable)}`,
              `Powered up ${guardiansUp} Guardian${plural(guardiansUp)}`,
            ]
          : [`Powered up ${b.exosuitsAvailable} Exosuit${plural(b.exosuitsAvailable)}`]),
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
    // Fractures' one-off Era Zero Warp runs the same resolver; it just places on the
    // Era Zero tile and hands off to Era 1's Preparation instead of Action Rounds.
    const eraZero = state.phase === 'era0warp';
    const next = Chronossus.resolveWarp(state, place, positiveSpaces, eraZero);
    const bonusVP = positiveSpaces * altTimelinesPerSpace;
    commit(
      next,
      { ...ui, warpRoll: null },
      `Era ${eraZero ? 0 : state.era} · Warp: placed ${place}`,
      [
        place > 0
          ? `Placed ${place} Warp tile${place === 1 ? '' : 's'} on the ${eraZero ? 'Era Zero tile' : 'Timeline'}`
          : 'Placed no Warp tiles',
        ...(bonusVP ? [`Alternate Timelines: +${bonusVP} VP (${positiveSpaces} positive space${positiveSpaces === 1 ? '' : 's'})`] : []),
      ],
    );
    setAltTimelinesPending(null);
  };
  // End of Action Rounds → ask who took First Player next Era, then Clean Up.
  // On the last Era there is no next Era, so skip the prompt and go to Clean Up.
  // End of Action Rounds → Clean Up. Only ask who leads next Era when a next Era is
  // guaranteed: the final Era (7, or 5 with Fractures) ends in Clean Up (no prompt);
  // the post-Impact Eras before it might end when flipping Collapsing Capital, so defer
  // the prompt to the "Game continues" choice; the pre-Impact Eras ask now.
  const endActions = () => {
    closePanel();
    const era = state.era;
    if (era >= maxEra) {
      // Last Era: no Clean Up step — go straight to scoring.
      endGameNow();
      return;
    }
    if (era >= postImpactEra) {
      const next = Chronossus.resolveCleanUp(state);
      commitPhase(next, enteredLabel(next));
      return;
    }
    setShowFirstPlayer(true);
  };
  // Answer the First-Player question. Asked at the end of Action Rounds (the pre-Impact
  // Eras) it flows into Clean Up; deferred past the Clean Up game-end check (the
  // post-Impact Eras before the last) it starts the next Era.
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
  /**
   * Doomsday: record this Era's Check for Impact. The player rolls the Trajectory dice and
   * moves the Impact tile themselves — the app only asks what happened, because the tile's
   * position is not modelled (and cannot be derived once it starts moving).
   *
   * "Earth is saved" ends the game on the spot with no Impact and no Evacuation; every other
   * answer leaves the Clean Up screen to carry on with its usual branches, which now read
   * the recorded Impact Era.
   */
  const answerImpactCheck = (outcome: Chronossus.CheckForImpactOutcome) => {
    const bot = Chronossus.answerCheckForImpact(state.chronossus!, state.era, outcome);
    const next: GameState = { ...state, chronossus: bot };
    const note =
      outcome === 'earth-saved'
        ? 'Earth is saved — the Impact never happens'
        : outcome === 'impact-now'
          ? 'Seal Fate locked in — the Impact resolves immediately'
          : outcome === 'impact-occurred'
            ? `The Impact occurred at the end of Era ${state.era}`
            : 'The Impact has not occurred yet';
    if (outcome === 'earth-saved') {
      commitPhase(
        { ...next, phase: 'endgame', finished: true },
        `Era ${state.era} · → End Game`,
        [note],
      );
      return;
    }
    commitPhase(next, `Era ${state.era} · Check for Impact`, [note]);
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
    setShowHistory(true);
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
    // An Autoleap the marker already moved onto still owes its Action. Closing that
    // dialog must not skip it — re-open it instead of rolling a new die (the leap takes
    // no roll of its own; the marker is already there).
    const owed = ui.owedLeap;
    if (owed) {
      botDieRef.current = null;
      activeMarkerRef.current = ui.activeMarker;
      chainOpenRef.current = true;
      setResult([]);
      setUi((u) => ({ ...u, botDie: null }));
      if (owed.isHypersync) {
        setPendingHypersync({ code: owed.code, readOnly: false, viaChain: true });
      } else if (owed.actionId) {
        setTileAutoleap(true);
        setPendingTile(owed.actionId);
      }
      return;
    }
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
      // TrackPos.action on a tile slot is always a modular tile action — but which one
      // depends on the mode's slot, not the base tile printed in the path data.
      const tileAction = tileActionAt(key) ?? (tp.action as ChronossusTileActionId);
      // Fractures' Valley Actions and Pioneers' Adventure take an Exosuit, so the passing
      // rule applies to them — including its Blink exemption, since both of those boards
      // are legal Blink destinations.
      if (passIfOutOfFigures(tileAction)) return;
      setResult([]);
      setPendingTileFamily(slotAtPos(mode, key)?.family ?? null);
      setPendingTile(tileAction);
      return;
    }
    const [x, y] = positions[key] ?? [0, 0];
    const h = nearestHotspot(x, y);
    // Pioneers covers "Recruit Genius or Research" with C10 → the Adventure flow. This
    // path skips onTileClick, so it has to run the passing rule itself — against the
    // ADVENTURE, not the printed Action the tile replaced.
    if (h.action === 'recruit-genius-research' && adventureCoversGeniusResearch()) {
      if (passIfOutOfFigures('tile-adventure')) return;
      setResult([]);
      setPendingTileFamily(slotCovering(mode, 'recruit-genius-research')?.family ?? null);
      setPendingTile('tile-adventure');
      return;
    }
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
  // The live family comes from the mode (so Fractures' C14-for-C04 swap resolves C14's
  // effect through the shared Assimilate action), falling back to the id's own family.
  const liveTileFamily = (actionId: ChronossusActionId): string | undefined =>
    mode.slots.map((sl) => sl.family).find((f) => FAMILY_TO_TILE_ACTION[f] === actionId) ??
    TILE_ACTION_FAMILY[actionId as keyof typeof TILE_ACTION_FAMILY];
  /** Does this tile action resolve an Assimilate (C04 / C14, either side)? */
  const tileAssimilates = (actionId: ChronossusActionId): boolean => {
    const family = liveTileFamily(actionId);
    if (!family) return false;
    return tileEffect(`${family}${state.config.tileSides?.[family] ?? 'A'}`).assimilate === true;
  };

  const resolveTileSlot = (
    actionId: ChronossusActionId,
    valleySpace?: 'action' | 'capital',
    blinked = false,
    operatorsAvailable = true,
    adventure?: AdventureInput,
  ) => {
    const family = pendingTileFamily ?? liveTileFamily(actionId);
    const tileSide = family ? (state.config.tileSides?.[family] ?? 'A') : 'A';
    // Fractures' Assimilate rolls the Research shape die first (Solo Opponents p.13);
    // the app rolls it, as it does for Research. The gate below may have rolled it already.
    const assimilates = tileAssimilates(actionId);
    const shape = assimShapeRef.current ?? rollShapeDie();
    const { state: next, instructions } = Chronossus.resolveAction(state, {
      actionId,
      tileSide,
      tileFamily: family,
      // A Valley Action with no free space goes to the Valley Capital space; reuse the
      // 'world-council' marker for it (the same "overflowed to the shared space" idea).
      ...(valleySpace ? { placementSpace: valleySpace === 'capital' ? 'world-council' : 'action' } : {}),
      ...(blinked ? { blink: true, tokenActions: otherTokenActions() } : {}),
      ...(assimilates ? { shape, operatorsAvailable } : {}),
      ...(actionId === 'tile-acquire-guardian' ? guardianAnswersRef.current : {}),
      ...(actionId === 'tile-experiment-1' || actionId === 'tile-experiment-2'
        ? { experiment: experimentAnswersRef.current }
        : {}),
      ...(adventure ? { adventure } : {}),
    });
    // finishTurn advances the marker one step; if that lands on an Autoleap tile it
    // opens its dialog (so the chain continues one tile at a time).
    const label = Chronossus.chronossusActionLabel(actionId);
    assimShapeRef.current = null;
    finishTurn(next, instructions, tileAutoleap ? `Autoleap — ${label}` : label);
  };
  // ▶ Start on the tile dialog: resolve and (unless the resolution chained onto another
  // Autoleap tile) close. The result lands in History / the turn-status aside.
  // --- Pioneers (C09/C10): the Adventure flow ------------------------------------
  /** Deck mode: the bot's own shuffled copy (default) or the player's physical decks. */
  const adventureDeckMode = state.config.adventureDeckMode ?? 'virtual';

  /**
   * Switch deck mode mid-game (⚙ menu). Switching to the bot's own deck rebuilds a fresh
   * shuffled pair of decks minus whatever it has already taken, so a mid-game switch can't
   * hand it a card it already holds.
   */
  const toggleAdventureDeckMode = () => {
    setState((s) => {
      const mode = (s.config.adventureDeckMode ?? 'virtual') === 'virtual' ? 'shared' : 'virtual';
      const p = s.chronossus?.pioneers;
      if (!s.chronossus || !p) return { ...s, config: { ...s.config, adventureDeckMode: mode } };
      const rebuild = (deck: AdventureDeck) => {
        const taken = new Set(p.decks[deck].discard);
        return {
          draw: shuffleAdventureDeck(adventureDeckIds(deck).filter((id) => !taken.has(id))),
          discard: p.decks[deck].discard,
        };
      };
      return {
        ...s,
        config: { ...s.config, adventureDeckMode: mode },
        chronossus: {
          ...s.chronossus,
          pioneers:
            mode === 'virtual'
              ? { ...p, decks: { '5+': rebuild('5+'), '10+': rebuild('10+') } }
              : p,
        },
      };
    });
  };

  /**
   * Open the Adventure. With Fractures the Blink check comes FIRST: the whole Action
   * hangs on whether a figure reaches the hex pool at all, and if the draw is an Empty
   * Flux Casing with nothing left to place the Chronossus passes — so asking for the Path
   * marker before that would have the player place a marker for a turn that never
   * happened. Only once the figure is settled does the slot question go up.
   */
  const openAdventureFlow = () => {
    advInputRef.current = null;
    advDieRef.current = null;
    setAdvResult(null);
    setAdvSharedPicked([]);
    if (fracturesMode && Chronossus.shouldCheckBlink(bot, 'tile-adventure')) {
      runAdventureBlinkCheck();
      return;
    }
    advBlinkedRef.current = false;
    setAdventureStep('slot');
  };

  /** The Adventure's Blink check: draw one Flux token and show what it means. */
  const runAdventureBlinkCheck = () => {
    const { drawn, pool: nextPool } = Chronossus.drawFlux(bot.fluxPool!, Math.random());
    setState((cur) => ({ ...cur, chronossus: { ...cur.chronossus!, fluxPool: nextPool } }));
    setFluxDraw(drawn);
    if (drawn === 'casing') {
      advBlinkedRef.current = false;
      blinkFromRef.current = null;
      setBlink(null);
      setAdventureStep('casing');
      return;
    }
    const sel = Chronossus.selectBlinkExosuit(bot, 'tile-adventure', otherTokenActions());
    if (!sel) {
      // Shouldn't happen (shouldCheckBlink gates on a ready Exosuit) — place as usual.
      advBlinkedRef.current = false;
      setAdventureStep('slot');
      return;
    }
    advBlinkedRef.current = true;
    blinkFromRef.current = {
      spaceLabel: Chronossus.BLINK_SPACE_LABEL[sel.space],
      toLabel: 'Adventure (Adventure board)',
    };
    setBlink({
      spaceLabel: Chronossus.BLINK_SPACE_LABEL[sel.space],
      sameSpaceCount: sel.sameSpaceCount,
      rule: sel.rule,
      token: sel.token,
    });
    setAdventureStep('blink');
  };

// The Adventure's first screen IS its first step: opening the tile dialog puts the slot
  // question up rather than a summary of the whole Action behind a ▶ Start Your Turn.
  useEffect(() => {
    if (pendingTile === 'tile-adventure' && !tileRuleView) {
      if (adventureStep === null) openAdventureFlow();
    } else if (adventureStep !== null) {
      setAdventureStep(null);
      setAdvResult(null);
      advInputRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingTile, tileRuleView]);

    /** Draw two card ids off the bot's own deck without mutating state (virtual mode). */
  const drawTwoVirtual = (deck: AdventureDeck): string[] => {
    const pile = bot.pioneers?.decks[deck];
    if (!pile) return [];
    // Rejected cards go back to the BOTTOM, so `draw` only shrinks by cards actually
    // taken — it cannot realistically empty. Fall back to the discard pile if it ever does.
    const source = pile.draw.length >= 2 ? pile.draw : [...pile.draw, ...pile.discard];
    return source.slice(0, 2);
  };

  /** Compute what the Adventure WILL do, without committing — the engine is pure, so
   *  the same inputs give the same result when `resolveAction` runs on commit. */
  const previewAdventure = (input: AdventureInput): AdventureResult | null => {
    if (!bot.pioneers) return null;
    const clone = structuredClone(bot);
    return resolveAdventure(clone, [], 0, input);
  };

  /**
   * The player answered which strength-bonus slot the bot's Path marker went on. With
   * Fractures the figure is already settled by then (the Blink check runs when the
   * Adventure opens), so this only feeds the Power total and the draw.
   */
  const onAdventureSlot = (bonus: number) => {
    advSlotRef.current = bonus;
    beginAdventureDraw(bonus);
  };

  /** Roll and draw for the Adventure (or ask which card, in shared-deck mode). */
  const beginAdventureDraw = (bonus: number) => {
    const deck = Chronossus.deckFor(Chronossus.boardPower(bot) + bonus);
    if (adventureDeckMode === 'shared') {
      // The player needs the total Power before they can say which card it takes, so the
      // die is rolled here rather than after the pick.
      advDieRef.current = advDieRef.current ?? rollAdventureDie();
      setAdvSharedPicked([]);
      setAdventureStep('shared-draw');
      return;
    }
    const input: AdventureInput = {
      powerSlot: bonus,
      die: rollAdventureDie(),
      drawn: drawTwoVirtual(deck),
    };
    advInputRef.current = input;
    setAdvResult(previewAdventure(input));
    setAdventureStep('result');
  };

  /** Shared-deck mode: which card the Chronossus takes ('none' = it met neither). */
  const onAdventureSharedPick = (id: string) => {
    setAdvSharedPicked(id ? [id] : []);
  };

  /** Shared-deck mode: the card is named — resolve and show the result. */
  const onAdventureSharedConfirm = () => {
    const picked = advSharedPicked[0];
    const input: AdventureInput = {
      powerSlot: advSlotRef.current,
      die: advDieRef.current ?? rollAdventureDie(),
      // 'none' means it met neither of the two the player drew — the engine's
      // "meets nothing" branch (+1 VP) is exactly an empty draw.
      drawn: !picked || picked === 'none' ? [] : [picked],
    };
    advInputRef.current = input;
    setAdvResult(previewAdventure(input));
    setAdventureStep('result');
  };

  /** ▶ Start Your Turn on the Adventure result: resolve it for real. */
  const commitAdventure = () => {
    if (!pendingTile || !advInputRef.current) return;
    chainOpenRef.current = false;
    resolveTileSlot(pendingTile, undefined, advBlinkedRef.current, true, advInputRef.current);
    setAdventureStep(null);
    setAdvResult(null);
    advInputRef.current = null;
    if (!chainOpenRef.current) closeTile();
  };

  /**
   * Guardians (C11): the first question of an Acquire Guardian. The supply question only
   * matters in Era 4, and the World Council question only when it has a figure to place —
   * with none it isn't an Exosuit Action at all and goes straight to the Worker option.
   */
  const openGuardianFlow = () => {
    guardianAnswersRef.current = { worldCouncilFree: false, guardianAvailable: true };
    if (postImpactNow) return setGuardianStep('failed');
    if (Chronossus.shouldAskGuardianAvailable(state.era)) return setGuardianStep('available');
    if (Chronossus.acquireGuardianAsksWorldCouncil(bot)) return setGuardianStep('world-council');
    return setGuardianStep(Chronossus.guardianWorkerToSpend(bot) ? 'worker' : 'failed');
  };
  /** Answer to "is a Guardian still available?" (Era 4). */
  const onGuardianAvailable = (available: boolean) => {
    guardianAnswersRef.current = { ...guardianAnswersRef.current, guardianAvailable: available };
    if (!available) return setGuardianStep('failed');
    if (Chronossus.acquireGuardianAsksWorldCouncil(bot)) return setGuardianStep('world-council');
    return setGuardianStep(Chronossus.guardianWorkerToSpend(bot) ? 'worker' : 'failed');
  };
  /** Answer to "is the World Council Action space open?" */
  const onGuardianWorldCouncil = (free: boolean) => {
    guardianAnswersRef.current = { ...guardianAnswersRef.current, worldCouncilFree: free };
    if (free) return setGuardianStep('place');
    return setGuardianStep(Chronossus.guardianWorkerToSpend(bot) ? 'worker' : 'failed');
  };
  /**
   * Doomsday (C07/C08): open an Experiment.
   *
   * Step 1's question is skipped on the FIRST Experiment Action of a game — no Path markers
   * can be out yet, so the answer is known. The "pre-seed Path markers" difficulty puts some
   * out at setup, and then it must be asked from the very first turn.
   */
  const openExperimentFlow = () => {
    const seeded = state.config.difficulty.includes(
      Chronossus.DIFFICULTY_DOOMSDAY_SEED_MARKERS,
    );
    const askable = seeded || bot.doomsday?.experimentActionRun === true;
    experimentAnswersRef.current = { markedAvailable: false, canPrepare: true };
    setExperimentStep(askable ? 'marked' : 'prepare');
  };
  /** Step 1's answer — is an Experiment of this level carrying one of its Path markers? */
  const onExperimentMarked = (available: boolean) => {
    experimentAnswersRef.current = { ...experimentAnswersRef.current, markedAvailable: available };
    setExperimentStep(available ? 'vp' : 'prepare');
  };
  /** Step 1's follow-up — the VP printed on the Experiment it took. */
  const onExperimentVp = (vp: number) => {
    experimentAnswersRef.current = { ...experimentAnswersRef.current, experimentVp: vp };
    setExperimentStep('prepare');
  };
  /** Step 2's answer, which also commits the turn. */
  const onExperimentPrepare = (can: boolean) => {
    experimentAnswersRef.current = { ...experimentAnswersRef.current, canPrepare: can };
    if (!pendingTile) return;
    chainOpenRef.current = false;
    resolveTileSlot(pendingTile);
    setExperimentStep(null);
    if (!chainOpenRef.current) closeTile();
  };

  /** Commit the Acquire Guardian once the player has been told what to do. */
  const commitGuardian = () => {
    if (!pendingTile) return;
    chainOpenRef.current = false;
    resolveTileSlot(pendingTile);
    setGuardianStep(null);
    if (!chainOpenRef.current) closeTile();
  };

  // Acquire Guardian opens on a question, whichever way the tile was reached (die roll,
  // Autoleap chain, or a debug tap) — one effect instead of a call at every open site.
  useEffect(() => {
    if (pendingTile === 'tile-acquire-guardian' && !tileRuleView) {
      if (guardianStep === null) openGuardianFlow();
    } else if (guardianStep !== null) {
      setGuardianStep(null);
    }
    // openGuardianFlow reads the live bot/era; re-running on those would restart the flow.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingTile, tileRuleView]);

  // The Experiment opens on its first question the same way.
  useEffect(() => {
    const isExperiment =
      pendingTile === 'tile-experiment-1' || pendingTile === 'tile-experiment-2';
    if (isExperiment && !tileRuleView) {
      if (experimentStep === null) openExperimentFlow();
    } else if (experimentStep !== null) {
      setExperimentStep(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingTile, tileRuleView]);

  const startTileTurn = (valleySpace?: 'action' | 'capital', blinked = false) => {
    if (!pendingTile) return;
    // Assimilate rolls the shape die once the Exosuit is settled, then SHOWS the result
    // before resolving: the Operator branch needs an answer ("any left in the Valley?" —
    // with none left it is a Failed Action, Solo Opponents p.13) and the Technology branch
    // still has to tell the player which card to take.
    if (pendingTile === 'tile-adventure') {
      // The Adventure asks for the Power slot first, then rolls — nothing resolves until
      // the player has seen the result.
      openAdventureFlow();
      return;
    }
    if (tileAssimilates(pendingTile)) {
      const shape = assimShapeRef.current ?? rollShapeDie();
      assimShapeRef.current = shape;
      assimGateRef.current = { space: valleySpace, blinked };
      setTileBlinkStep(Chronossus.assimilateTakesOperator(bot, shape) ? 'operators' : 'assimilate');
      return;
    }
    chainOpenRef.current = false; // finishTurn re-sets it if the chain continues
    resolveTileSlot(pendingTile, valleySpace, blinked);
    setTileBlinkStep(null);
    if (!chainOpenRef.current) closeTile();
  };
  /**
   * Neither a Valley Action space nor the Valley Capital space was open — the shared
   * no-space branch handles it as a Failed Action (VP + discard an active Exosuit).
   */
  const onValleyNoSpace = () => {
    if (!pendingTile) return;
    const { state: next, instructions } = Chronossus.resolveAction(state, {
      actionId: pendingTile,
      noSpaceAvailable: true,
    });
    chainOpenRef.current = false;
    setTileBlinkStep(null);
    finishTurn(next, instructions, Chronossus.chronossusActionLabel(pendingTile));
    if (!chainOpenRef.current) closeTile();
  };

  /** The Technology branch of Assimilate: the result was shown, now resolve it. */
  const onAssimilateContinue = () => {
    if (!pendingTile) return;
    const { space, blinked } = assimGateRef.current;
    chainOpenRef.current = false;
    resolveTileSlot(pendingTile, space, blinked);
    setTileBlinkStep(null);
    if (!chainOpenRef.current) closeTile();
  };

  /** The Operator gate's answer: resolve the Assimilate with (or without) an Operator. */
  const onOperatorsAnswer = (available: boolean) => {
    if (!pendingTile) return;
    const { space, blinked } = assimGateRef.current;
    chainOpenRef.current = false;
    resolveTileSlot(pendingTile, space, blinked, available);
    setTileBlinkStep(null);
    if (!chainOpenRef.current) closeTile();
  };

  /**
   * Fractures: a Valley Action space is confirmed. The Valley board is a legal Blink
   * *destination* (never a source), so the same check runs here before the tile resolves.
   */
  const onValleyPlace = (space: 'action' | 'capital') => {
    if (!pendingTile) return;
    valleySpaceRef.current = space;
    if (Chronossus.shouldCheckBlink(bot, pendingTile)) {
      const { drawn, pool: nextPool } = Chronossus.drawFlux(bot.fluxPool!, Math.random());
      setState((cur) => ({ ...cur, chronossus: { ...cur.chronossus!, fluxPool: nextPool } }));
      setFluxDraw(drawn);
      if (drawn === 'casing') {
        blinkFromRef.current = null;
        setBlink(null);
        setTileBlinkStep('casing');
        return;
      }
      const sel = Chronossus.selectBlinkExosuit(bot, pendingTile, otherTokenActions());
      if (sel) {
        blinkFromRef.current = {
          spaceLabel: Chronossus.BLINK_SPACE_LABEL[sel.space],
          toLabel: `${Chronossus.chronossusActionLabel(pendingTile)} (Valley board)`,
        };
        setBlink({
          spaceLabel: Chronossus.BLINK_SPACE_LABEL[sel.space],
          sameSpaceCount: sel.sameSpaceCount,
          rule: sel.rule,
          token: sel.token,
        });
        setTileBlinkStep('blink');
        return;
      }
    }
    startTileTurn(space, false);
  };
  // Close the tile dialog. If it hasn't resolved yet (no result), the marker does
  // not advance (a cancelled turn).
  const closeTile = () => {
    setPendingTile(null);
    setPendingTileFamily(null);
    setTileAutoleap(false);
    setTileRuleView(false);
    setGuardianStep(null);
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
    // Fractures combo: sending an Exosuit to a Hypersync hex is a placement, so the Blink
    // check applies — the hex is already chosen, i.e. the destination is confirmed.
    if (
      fracturesMode &&
      input.outcome === 'hypersync' &&
      !input.blink &&
      hsBlinkStep == null &&
      Chronossus.shouldCheckBlink(bot, 'time-travel')
    ) {
      const { drawn, pool: nextPool } = Chronossus.drawFlux(bot.fluxPool!, Math.random());
      setState((cur) => ({ ...cur, chronossus: { ...cur.chronossus!, fluxPool: nextPool } }));
      setFluxDraw(drawn);
      hsInputRef.current = input;
      if (drawn === 'casing') {
        blinkFromRef.current = null;
        setBlink(null);
        setHsBlinkStep('casing');
        return;
      }
      const sel = Chronossus.selectBlinkExosuit(bot, 'time-travel', otherTokenActions());
      if (sel) {
        blinkFromRef.current = {
          spaceLabel: Chronossus.BLINK_SPACE_LABEL[sel.space],
          toLabel: 'the Hypersync space',
        };
        setBlink({
          spaceLabel: Chronossus.BLINK_SPACE_LABEL[sel.space],
          sameSpaceCount: sel.sameSpaceCount,
          rule: sel.rule,
          token: sel.token,
        });
        setHsBlinkStep('blink');
        return;
      }
    }
    setHsBlinkStep(null);
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
    // An abandoned Blink check must not label the next committed turn as a Blink.
    blinkFromRef.current = null;
    botDieRef.current = null;
    activeMarkerRef.current = null;
    pendingDieRef.current = null;
    // Cancelling (not committing) abandons any rolled hex → next open rolls fresh.
    setUi((u) => ({ ...u, botDie: null, activeMarker: null, hsRolledHex: null }));
  };
  const changeEra = (d: number) =>
    setState((s) => {
      const era = Math.max(1, Math.min(maxEra, s.era + d));
      // Keep the Impact flag with the Era, as `startNextEra` does. Without this a debug
      // jump to Era 5 left `impact` false, so every post-Impact rule (the 2+X Power Up,
      // Acquire Guardian's post-Impact branch) silently kept its pre-Impact behaviour.
      return { ...s, era, impact: Chronossus.isPostImpact(era, s.config, s.chronossus) };
    });
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

  // This Era's committed bot Action turns (drives the Bot Turns count + its list).
  // Excludes the pre-Action phase events (Power Up / Warp / Paradox), which still appear
  // in the full History pane but are not Action Rounds "turns" — including the phase-entry
  // entries `commitPhase` pushes (`Era N · → Power Up`), which were being counted as turns.
  const thisEraEntries: HistoryEntry[] = entries.filter(
    (e) =>
      e.state.era === state.era &&
      !/You passed|Power Up|Warp|Paradox|· → /.test(e.label),
  );
  const turnsThisEra = thisEraEntries.length;

  /**
   * Debug: step the bot's pending Solo Hypersync tiles. Adding puts the tile on the
   * furthest-back Era that doesn't already have one (max one per Era), because only a
   * tile in a PRIOR Era is retrievable — dropping it on the current Era would leave the
   * Hypersync Action with nothing to take, which is the opposite of what this is for.
   * Removing takes the most recent tile back off.
   */
  const setDebugHypersyncTiles = (delta: number) => {
    setState((s) => {
      const c = s.chronossus!;
      const tiles = [...c.hypersyncTiles].sort((a, b) => a - b);
      if (delta > 0) {
        if (tiles.length >= Chronossus.MAX_HYPERSYNC_TILES) return s;
        // Eras 1..era-1, first one free; fall back to the current Era only if the past
        // is full (still legal state, just not retrievable this turn).
        const era =
          Array.from({ length: Math.max(0, s.era - 1) }, (_, i) => i + 1).find(
            (e) => !tiles.includes(e),
          ) ?? (tiles.includes(s.era) ? null : s.era);
        if (era == null) return s;
        return { ...s, chronossus: { ...c, hypersyncTiles: [...tiles, era].sort((a, b) => a - b) } };
      }
      if (!tiles.length) return s;
      return { ...s, chronossus: { ...c, hypersyncTiles: tiles.slice(0, -1) } };
    });
  };

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
  const upgradeBoardModal = showUpgradeBoard && bot.pioneers && (
    <CxUpgradeBoardPopout bot={bot} onClose={() => setShowUpgradeBoard(false)} />
  );

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
      adventureDeck={
        Chronossus.isPioneersMode(state.config.chronossusMode)
          ? { mode: adventureDeckMode, onToggle: toggleAdventureDeckMode }
          : null
      }
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
      maxEra={maxEra}
      onEra={changeEra}
      paradoxes={paradoxes}
      onParadox={(d) => setParadoxes((n) => Math.max(0, Math.min(3, n + d)))}
      impact={state.impact}
      onToggleImpact={() => setState((s) => ({ ...s, impact: !s.impact }))}
      onEndActions={endActions}
      warpTiles={bot.warpTilesOnTimeline}
      onWarpTiles={(d) =>
        setState((s) => {
          const b = s.chronossus!;
          const total = Math.max(0, b.warpTilesOnTimeline + d);
          if (total === b.warpTilesOnTimeline) return s;
          // Keep the per-Era map in step, or Time Travel would read the debug tiles as
          // untracked. A debug-added tile goes on the most recent PAST tile, which is what
          // you want when stepping the count up to try a Time Travel.
          const byEra =
            d > 0
              ? placeWarpTiles(b.warpTilesByEra, Math.max(0, s.era - 1), d)
              : removeAnyWarpTile(b.warpTilesByEra);
          return { ...s, chronossus: { ...b, warpTilesOnTimeline: total, warpTilesByEra: byEra } };
        })
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
      {...(hypersyncMode
        ? {
            hypersyncTiles: bot.hypersyncTiles.length,
            maxHypersyncTiles: Chronossus.MAX_HYPERSYNC_TILES,
            onHypersyncTiles: (d: number) => setDebugHypersyncTiles(d),
          }
        : {})}
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
          {scvMode === 'below' && renderModDialogs(true)}
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
                // Describe the tile actually sitting here in this mode, not the base-game
                // tile the path data names for the slot.
                const liveAction = tileActionAt(p.key);
                const desc = liveAction ? TILE_DESC[liveAction] : undefined;
                return (
                  <img
                    key={k}
                    className={`cx-tile-art ${sel ? 'cal-selected' : ''}`}
                    src={`/assets/solo/chronossus/tiles/${code}.png`}
                    alt={`Modular tile ${code}`}
                    style={{ left: `${x}%`, top: `${y}%`, width: `${tileWidth}%` }}
                    title={`Slot ${p.label} · ${code}${desc ? ` — ${desc}` : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onTileArtClick(p);
                    }}
                  />
                );
              })}

              {/* Pioneers: the C10 tile COVERS the printed "Recruit Genius or Research"
                  space. Same treatment as Hypersync's C13 over Time Travel — without it
                  the player sees the printed Action and no sign the tile replaced it. */}
              {(() => {
                const slot = slotCovering(mode, 'recruit-genius-research');
                if (!slot) return null;
                const code = tileCodeFor(slot.family, tileSides);
                const hs = CHRONOSSUS_ACTION_HOTSPOTS.find(
                  (h) => h.action === 'recruit-genius-research',
                );
                if (!hs) return null;
                const [x, y] = positions[hsKey(hs.id)] ?? HS_CENTER(hs);
                return (
                  <img
                    className="cx-tile-art cx-tile-cover"
                    src={`/assets/solo/chronossus/tiles/${code}.png`}
                    alt={`Modular tile ${code} (covers Recruit Genius or Research)`}
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      width: `${tileWidth}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    title={`Covers Recruit Genius or Research · ${code} — ${CHRONOSSUS_TILES[code]?.name ?? ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      closeDialogs();
                      if (debug) {
                        setResult([]);
                        // Same as any other debug activation: out of figures → it passes.
                        if (passIfOutOfFigures('tile-adventure')) return;
                        setPendingTileFamily(slot.family);
                        setPendingTile('tile-adventure');
                      } else {
                        showTileRulesByCode(code);
                      }
                    }}
                  />
                );
              })()}

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
              {/* Pioneers: the same Upgrade-board button as the turn overview's, sitting
                  under the main board's Exosuit tracker — the Upgrade board is the other
                  half of "what can this bot do", and the tracker is where the player is
                  already looking. Positioned off the mech counter so it follows any
                  recalibration of that badge. */}
              {bot.pioneers && !calibrate && (() => {
                const mech = CHRONOSSUS_COUNTERS.find((c) => c.key === 'mech');
                if (!mech) return null;
                const [mx, my] = positions.mech ?? mech.pos;
                return (
                  <button
                    type="button"
                    className="cx-upgrade-btn on-board"
                    style={{ left: `${mx}%`, top: `${my + 5.2}%` }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowUpgradeBoard(true);
                    }}
                    title="Show the Chronossus's Exosuit Upgrade board and its current Power"
                  >
                    <img src={POWER_ICON} alt="" aria-hidden="true" className="cx-power-icon" />
                    {Chronossus.boardPower(bot)}
                  </button>
                );
              })()}
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
                          {(bot.guardians?.powered ?? 0) > 0 ? (
                            <>
                              <div>
                                {bot.exosuitsAvailable + bot.guardians!.powered} powered
                                figure
                                {bot.exosuitsAvailable + bot.guardians!.powered === 1
                                  ? ''
                                  : 's'}{' '}
                                to place
                              </div>
                              <div className="cx-mech-pop-energy">
                                <span className="cx-mech-pop-label">Normal Exosuits</span>
                                <span>{bot.exosuitsAvailable}</span>
                              </div>
                              <div className="cx-mech-pop-energy">
                                <span className="cx-mech-pop-label">Guardians</span>
                                <span>
                                  {bot.guardians!.powered}/{bot.guardians!.owned} powered
                                </span>
                              </div>
                            </>
                          ) : (
                            <div>
                              {bot.exosuitsAvailable} powered Exosuit
                              {bot.exosuitsAvailable === 1 ? '' : 's'} available
                            </div>
                          )}
                          <div className="cx-mech-pop-energy">
                            <span className="cx-mech-pop-label">Energy Pool</span>
                            <CxEnergyPool pool={bot.energyPool} size={24} />
                          </div>
                          {/* What matters here is THIS Era: a tile can be placed only once
                              per Era, so "N" means the no-space fallback is still open. The
                              running pending total lives on the turn-overview chip. */}
                          {hypersyncMode && (
                            <div className="cx-mech-pop-energy">
                              <span className="cx-mech-pop-label">Hypersync placed</span>
                              <span>{bot.hypersyncTiles.includes(state.era) ? 'Y' : 'N'}</span>
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
                // A Guardian is an Exosuit — a better one — so it counts in the same
                // marker pile as the rest. `counterValue` includes powered Guardians, and
                // the badge's pop-out is where the two are broken apart.
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
                    className={`warp-marker ${sel ? 'cal-selected' : ''} ${!calibrate ? 'clickable' : ''}`}
                    style={{ left: `${wx}%`, top: `${wy}%`, width: `${warpWidth}%` }}
                    title={
                      calibrate
                        ? undefined
                        : `Chronossus Warp tiles on the Timeline: ${bot.warpTilesOnTimeline} — tap for the past / current Era split`
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      if (calibrate) {
                        setSelected(WARP_KEY);
                      } else {
                        setTappedRect(e.currentTarget.getBoundingClientRect());
                        setTappedBadge((k) => (k === WARP_KEY ? null : WARP_KEY));
                      }
                    }}
                  >
                    <img className="warp-img" src="/assets/solo/chronossus/warp-tile.png" alt="Chronossus Warp tile" />
                    <span className="warp-count">{bot.warpTilesOnTimeline}</span>
                    {/* Time Travel may only take a tile off a PAST Timeline tile, so the
                        total on its own doesn't say what the bot can actually do — the
                        split is the point of tapping this. */}
                    {!calibrate && tappedBadge === WARP_KEY && (
                      <BadgePopover rect={tappedRect} variant="text">
                        <WarpTileBreakdown bot={bot} era={state.era} />
                      </BadgePopover>
                    )}
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
              {scvMode !== 'below' && renderModDialogs(false)}
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
      {upgradeBoardModal}
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
              actionsThisEra={turnsThisEra}
              countLabel="Bot Turns"
              extraFlags={
                <TapFlagRow>
                  <span className="cx-exo-stack">
                    <TapFlag
                      className="cx-exosuit-flag"
                      hint={
                        (bot.guardians?.powered ?? 0) > 0
                          ? `Figures it can still place this Era: ${bot.exosuitsAvailable} normal Exosuit${bot.exosuitsAvailable === 1 ? '' : 's'} and ${bot.guardians!.powered} Guardian${bot.guardians!.powered === 1 ? '' : 's'}. Guardians power up first and are placed last, and each has its own Action space on the Guardian board.`
                          : 'Powered Exosuits available this Era'
                      }
                    >
                      <CxExosuit
                        count={bot.exosuitsAvailable}
                        guardians={bot.guardians?.powered ?? 0}
                        size={18}
                      />
                    </TapFlag>
                    {/* No Power chip here: the overview already carries one further right,
                        and that one opens the Upgrade board. Two said the same thing. */}
                  </span>
                  <TapFlag
                    className="cx-energy-flag"
                    hint="Energy Pool — non-exhausted Energy Cores / Exhausted Energy Cores"
                  >
                    <CxEnergyPool pool={bot.energyPool} size={18} />
                  </TapFlag>
                  {fracturesMode && bot.fluxPool && (
                    <TapFlag
                      className="cx-energy-flag"
                      hint="Flux Pool — Flux Cores / Empty Flux Casings, and any Casings set aside this Era (they return in Clean Up). A drawn Flux Core makes the Chronossus Blink."
                    >
                      <CxFluxPool pool={bot.fluxPool} size={18} />
                    </TapFlag>
                  )}
                  {/* Pioneers: the Chronossus's Power. It lives on a board the app doesn't
                      render, and it decides which Adventure deck the bot draws from, so the
                      running total plus its breakdown belongs in the turn overview. */}
                  {bot.pioneers && (
                    <TapFlag
                      className="cx-energy-flag"
                      onClick={() => setShowUpgradeBoard(true)}
                      hint={
                        `Exosuit Upgrade board (${bot.pioneers.boardSide} side) — ` +
                        Chronossus.powerBreakdown(bot)
                          .map((b) => `${b.power} ${b.label}`)
                          .join(' + ') +
                        `. At ${Chronossus.BIG_DECK_THRESHOLD}+ Power (with the Path-marker ` +
                        'bonus) it draws from the 10+ Adventure deck. Tap to open the board.'
                      }
                    >
                      <span className="cx-tech-ops">
                        <b>{Chronossus.boardPower(bot)}</b>
                        <img src={POWER_ICON} alt="Power" className="cx-power-icon" />
                      </span>
                    </TapFlag>
                  )}
                  {/* No Operator count: an Operator is a wildcard Worker, so it is already
                      tracked by the Worker slot it filled — a separate chip only duplicated it. */}
                  {fracturesMode && (
                    <TapFlag
                      className="cx-hypersync-flag"
                      hint="Technology cards it holds (3 VP each at the end)"
                    >
                      <span className="cx-tech-ops">
                        <b>{bot.technologies ?? 0}</b> Tech
                      </span>
                    </TapFlag>
                  )}
                  {/* No separate Guardians chip: a powered Guardian is one of the figures
                      the Exosuit chip counts (it shows "inc N Guardians"). This one is the
                      total ENLISTED, which the Exosuit count can't show — they persist
                      across Eras while `powered` resets. */}
                  {guardiansMode && (
                    <TapFlag
                      className="cx-hypersync-flag"
                      hint="Guardians powered up this Era / Guardians it has. They are permanent — each keeps a Path marker on its own Guardian board slot — and every Era it powers up as many of them as it can before its own Exosuits. A gap means it has a Guardian it could not power up."
                    >
                      <span className="cx-tech-ops">
                        <b>{bot.guardians?.powered ?? 0}</b>/{bot.guardians?.owned ?? 0}{' '}
                        Guardian{(bot.guardians?.owned ?? 0) === 1 ? '' : 's'}
                      </span>
                    </TapFlag>
                  )}
                  {/* Doomsday: its tracker's slot, and the Experiments it has completed. The
                      slot is the one piece of the Doomsday board the app owns — the VP every
                      future Experiment earns depends on it, and the player moves the physical
                      token when told, so a readout is how they check the two agree. */}
                  {doomsdayMode && bot.doomsday && (
                    <TapFlag
                      className="cx-hypersync-flag"
                      hint={
                        `The Chronossus moves the ${
                          bot.doomsday.botTracker === 'save-earth' ? 'Save Earth' : 'Seal Fate'
                        } tracker (the one opposing yours), now on slot ${
                          bot.doomsday.botSlot
                        } of 10. Landing there is worth ${Chronossus.botVpAt(
                          bot.doomsday.botSlot,
                        )} VP — it takes BOTH Paths' printed values, unlike you. ` +
                        `Experiments completed: ${bot.doomsday.experimentsCompleted}` +
                        (Chronossus.tracksLocked({
                          impactOccurred: bot.doomsday.impactEra != null,
                          botTracker: bot.doomsday.botTracker,
                          botSlot: bot.doomsday.botSlot,
                          playerTrackerFinal: bot.doomsday.playerTrackerFinal,
                        })
                          ? '. The tracks are locked — Experiments still score, but nothing moves.'
                          : '.')
                      }
                    >
                      <span className="cx-tech-ops">
                        <b>
                          {bot.doomsday.botTracker === 'save-earth' ? 'Save Earth' : 'Seal Fate'}
                        </b>{' '}
                        {bot.doomsday.botSlot}/10 · {bot.doomsday.experimentsCompleted} Exp
                      </span>
                    </TapFlag>
                  )}
                  {hypersyncMode && (
                    <TapFlag
                      className="cx-hypersync-flag"
                      hint={`Pending Solo Hypersync tiles (max one per Era, 3 total). Hypersync placed this Era: ${
                        bot.hypersyncTiles.includes(state.era) ? 'Y' : 'N — the no-space fallback is still open'
                      }`}
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
                </TapFlagRow>
              }
              hint={chronossusTurnHint(bot)}
              canEnd={bothPassed}
              turnRules={CHRONOSSUS_PHASE_META.actions?.rules}
              extraRules={
                guardiansMode ? (
                  <RulesBox label="Guardians of the Council">
                    <p>
                      <b>3 POWER UP PHASE:</b> The Chronossus first powers up as many
                      Guardians as it can, then it powers up its own Exosuits (e.g. if it
                      needs to power up 4 Exosuits and has 2 Guardians, it will power up
                      both of them and 2 of its own).
                    </p>
                    <p>
                      <b>GAMEPLAY CHANGES:</b> When deciding which Exosuit to place, the
                      Chronossus places Guardians last. If it wants to take a Capital Action
                      (Research, Recruit, Construct) and there are no Action spaces
                      remaining (including the World Council Action space), it places a
                      Guardian (if it has any) on the reserved Guardian Action space and
                      performs the Capital Action. This means the Action is not a Failed
                      Action, so it does not take 1 VP.
                    </p>
                  </RulesBox>
                ) : undefined
              }
              modes={selectedModeLabels(state.config)}
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
      {upgradeBoardModal}
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
      {upgradeBoardModal}
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
    // The Era Zero Warp is played before Era 1 (state.era is already 1) — the header
    // says Era 0, which is the tile the player is actually placing on.
    era: state.phase === 'era0warp' ? 0 : state.era,
    phaseNumber: meta?.number ?? 0,
    phaseName: meta?.name ?? state.phase,
    // With Fractures the Era-1 Paradox phase is played, not skipped (the Era Zero tile
    // is already in the past), so the stock "Skipped in the first Era" line would lie.
    overview:
      state.phase === 'paradox' && fracturesMode
        ? 'Paradox phase – Players who strained the Timeline with Warping roll for ' +
          'Paradoxes. With Fractures of Time it is played in Era 1 as well, since the ' +
          'Era Zero tile is already in the past.'
        : meta?.overview,
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
                  {/* Guardians power up FIRST and share the same number, so the player has
                      to be told which pieces to pull — they're different miniatures. */}
                  {(bot.guardians?.powered ?? 0) > 0 ? (
                    <span>
                      Powered up{' '}
                      <b>{bot.guardians!.powered + bot.exosuitsAvailable}</b> in total —{' '}
                      <b>{bot.guardians!.powered}</b> Guardian
                      {bot.guardians!.powered === 1 ? '' : 's'}
                      {bot.exosuitsAvailable > 0 ? (
                        <>
                          {' '}
                          and <b>{bot.exosuitsAvailable}</b> normal Exosuit
                          {bot.exosuitsAvailable === 1 ? '' : 's'}
                        </>
                      ) : (
                        ' (its whole number)'
                      )}
                      . It powers up as many Guardians as it can first. Set these aside
                      ready to place on the board for this Era.
                    </span>
                  ) : (
                    <span>
                      Powered up <b>{bot.exosuitsAvailable}</b> Exosuit
                      {bot.exosuitsAvailable === 1 ? '' : 's'}. Set these aside ready to
                      place on the board for this Era.
                    </span>
                  )}
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
    case 'era0warp':
    case 'warp': {
      // Fractures' Era Zero Warp is the same phase, played once before Era 1 — same
      // roll, same placement, only the tile it lands on and what follows differ.
      const eraZero = state.phase === 'era0warp';
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
          tileLabel={eraZero ? 'the Era Zero tile' : undefined}
          // Alternate Timelines replaces the base turn-order instruction: the decision
          // has to be made BEFORE the roll, whoever is First Player (p.18).
          intro={
            // Era Zero: no note — the phase's own overview line and the verbatim rules
            // box below already say all of it. Alternate Timelines still gets its note,
            // since it changes the ORDER you act in and that is nowhere else on screen.
            eraZero && !altTimelines ? null : altTimelines ? (
              <p className="phase-note">
                <b>Alternate Timelines:</b> decide how many Resources and/or Workers{' '}
                <b>you</b> are warping <b>before</b> rolling for the Chronossus. Once
                you've decided, roll below and place the tiles in turn order as usual.
              </p>
            ) : undefined
          }
          extraRules={
            <>
              {/* Era Zero's own box carries the Fractures rule; the Chronossus's normal
                  Warp rule still applies to it, so show that one too. */}
              {eraZero && (
                <RulesBox label="Warp">
                  <p>{CHRONOSSUS_PHASE_META.warp!.rules}</p>
                  <p className="rules-cite">Solo Opponents rulebook, p. 9</p>
                </RulesBox>
              )}
              {altTimelines && (
                <RulesBox label="Alternate Timelines">
                  <p>
                    <b>WARP PHASE:</b> In the Warp Phase, you must decide how many
                    Resources and/or Workers to warp first, then roll for the Chronossus.
                    Place the tiles in turn order, as usual.
                  </p>
                  <p>
                    It ignores penalties (red spaces), and it receives 2 VPs instead of
                    any positive rewards. You resolve both positive and negative effects
                    as normal.
                  </p>
                  {altTimelinesPerSpace === 3 && (
                    <p>
                      <b>INCREASING THE DIFFICULTY:</b> The Chronossus scores 3 VPs per
                      positive effect.
                    </p>
                  )}
                  <p className="rules-cite">Solo Opponents rulebook, p. 18</p>
                </RulesBox>
              )}
            </>
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
                <div className="vp-digits">
                  {Array.from({ length: altTimelinesPending + 1 }, (_, n) => n).map((n) => (
                    <button
                      key={n}
                      type="button"
                      className="vp-digit"
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
    }
    case 'cleanup': {
      // Impact + game-end flow, identical to the Chronobot: the Impact resolves at the
      // end of the last pre-Impact Era; in the post-Impact Eras before the last,
      // flipping the Collapsing Capital tiles decides whether the game continues; the
      // final Era always ends. Fractures shifts all three (Impact after Era 3, check in
      // Era 4, game ends after Era 5) — hence the derived Eras rather than 4/5–6/7.
      const era = state.era;
      const finalEra = era >= maxEra;
      const postImpact = era >= postImpactEra && !finalEra;
      // Doomsday runs its own Check for Impact here, and until it is answered the rest of
      // the screen has nothing to say: the Impact tile moves during play, so whether this
      // Era is the one is the player's to report, not ours to predict.
      const impactCheckDue = doomsdayMode && Chronossus.needsImpactCheck(bot, era);
      const botLocked = doomsdayMode && Chronossus.botTrackerLocked(bot);
      body = (
        <>
          <p className="phase-note">
            Retrieve the Chronossus’s Exosuits along with your own.
          </p>
          {impactCheckDue && (
            <>
              <p className="phase-note">
                <b>Check for Impact.</b> Roll the two Trajectory dice and count their (+) and
                (−) symbols together with the ones printed beside both trackers’ current
                slots, then move the Impact tile accordingly.
              </p>
              <RulesBox label="Doomsday — Check for Impact">
                {Chronossus.DOOMSDAY_CHECK_FOR_IMPACT_RULE.split('\n\n').map((para, i) => (
                  <p key={i} style={{ whiteSpace: 'pre-line' }}>
                    {para}
                  </p>
                ))}
              </RulesBox>
              {botLocked && (
                <p className="phase-note">
                  The Chronossus’s own marker is already on its final slot — the tracks are
                  locked and the Impact tile cannot move.
                </p>
              )}
              <div className="place-prompt">
                <p className="pp-instruct">Is either tracker locked in?</p>
                <div className="pp-buttons">
                  <button className="pp-confirm" onClick={() => answerImpactCheck('earth-saved')}>
                    “Save Earth” is topmost — Earth is saved
                  </button>
                  <button className="pp-confirm" onClick={() => answerImpactCheck('impact-now')}>
                    “Seal Fate” is bottommost — Impact now
                  </button>
                  <button className="pp-cannot" onClick={() => answerImpactCheck('not-yet')}>
                    Neither
                  </button>
                </div>
              </div>
            </>
          )}
          {doomsdayMode && !impactCheckDue && bot.doomsday?.impactEra == null && (
            <div className="place-prompt">
              <p className="pp-instruct">
                Did the Impact occur at the end of this Era?
              </p>
              <div className="pp-buttons">
                <button
                  className="pp-confirm"
                  onClick={() => answerImpactCheck('impact-occurred')}
                >
                  Yes — the Impact resolved
                </button>
                <button className="pp-cannot" onClick={afterCleanUp}>
                  No — not yet
                </button>
              </div>
            </div>
          )}
          {!doomsdayMode && era === postImpactEra - 1 && (
            <p className="phase-note">
              <b>The Impact occurs now</b> — resolve it using the usual procedure at
              the end of Era {era}. From Era {postImpactEra} on, the Chronossus powers
              up 2+X Exosuits (max 4) instead of 3+X (max 6).
            </p>
          )}
          {postImpact && (
            <p className="phase-note">
              Flip the Collapsing Capital tiles using the usual procedure, then check
              for game end.
            </p>
          )}
          {meta?.rules && !impactCheckDue && <p className="phase-note">{meta.rules}</p>}
          {impactCheckDue ? null : finalEra ? (
            <button className="phase-primary" onClick={afterCleanUp}>
              Finish &amp; Score ▶
            </button>
          ) : postImpact ? (
            <div className="place-prompt">
              <p className="pp-instruct">
                Are all Collapsing Capital tiles flipped? If so, the game has ended —
                choose below.
              </p>
              <div className="pp-buttons">
                <button
                  className="pp-confirm"
                  onClick={() => setShowFirstPlayer(true)}
                >
                  Game continues — start Era {era + 1} ▶
                </button>
                <button className="pp-cannot" onClick={endGameNow}>
                  Game Ended — Finish &amp; Score
                </button>
              </div>
            </div>
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
          // Fractures: the Era Zero tile is a past Timeline tile too, so Era 1 already
          // has one tile to check (and its Paradox phase is not skipped).
          pastTiles={pastTimelineTiles(state)}
          pendingRoll={ui.paradoxRoll}
          icons={{ ...PARADOX_ICONS, warp: '/assets/solo/chronossus/warp-tile.png' }}
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
      {upgradeBoardModal}
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

/**
 * Pioneers: what the Adventure produced, in the order the rulebook resolves it (p.15) —
 * the Power BEFORE the die (which is what picks the deck), the draw, both cards with the
 * taken one highlighted, only then the die and the total, and finally the outcome.
 *
 * Nothing here shows the card's printed Success box: that is the PLAYER's rule, and after
 * the four p.15 conversions it routinely describes something the Chronossus never does.
 */
function AdventureResultPanel({
  result,
  breakdown,
  startLabel,
  onCommit,
  onShowUpgradeBoard,
}: {
  result: AdventureResult;
  breakdown: { label: string; power: number }[];
  startLabel: string;
  onCommit: () => void;
  /** Opens the Exosuit Upgrade board pop-out, as the turn overview's Power chip does. */
  onShowUpgradeBoard: () => void;
}) {
  const boardTotal = breakdown.reduce((n, b) => n + b.power, 0);
  const slotBonus = result.powerBeforeRoll - boardTotal;
  const die = result.totalPower - result.powerBeforeRoll;
  const did = [
    ...(result.gains.length ? [`gains ${result.gains.join(', ')}`] : []),
    ...result.actions,
  ];
  return (
    <>
      {/* 1. Power before the roll. */}
      <div className="cx-adv-power">
        <span className="cx-adv-total">{result.powerBeforeRoll}</span>
        <img src={POWER_ICON} alt="Power" className="cx-power-icon lg" />
        <span className="cx-adv-label">Power before the roll</span>
      </div>
      {/* Two numbers, not the whole per-slot breakdown: the Upgrade board's own total —
          as the same clickable Power chip the turn overview uses, so the board itself is
          one tap away — plus the Path-marker bonus. */}
      <p className="cx-adv-brk">
        <button
          type="button"
          className="cx-upgrade-btn"
          onClick={onShowUpgradeBoard}
          title="Show the Chronossus's Exosuit Upgrade board and its current Power"
        >
          <img src={POWER_ICON} alt="" aria-hidden="true" className="cx-power-icon" />
          {boardTotal} Power
        </button>
        {` ${slotBonus >= 0 ? '+' : '−'} ${Math.abs(slotBonus)} Path marker`}
      </p>

      {/* 2. Which deck that Power picked. */}
      <p className="pp-instruct">
        It draws <b>2 cards</b> from the <b>{result.deck}</b> deck.
      </p>

      {/* 3. The two cards, the taken one highlighted. */}
      <div className="cx-adv-cards">
        {result.drawn.map((c) => (
          <figure
            key={c.id}
            className={`cx-adv-card ${result.taken?.id === c.id ? 'taken' : ''}`}
          >
            <img src={adventureCardArt(c)} alt={c.name} />
            <figcaption>
              {c.name} · {c.power}
              {result.taken?.id === c.id ? ' ✓' : ''}
            </figcaption>
          </figure>
        ))}
      </div>

      {/* 4. Only now the die, and the total it is measured against. */}
      <div className="cx-adv-power">
        <img
          src={`/assets/solo/chronossus/adventure-die-${die}.png`}
          alt={`Adventure die: ${die}`}
          className="cx-adv-die lg"
        />
        <span className="cx-adv-total">{result.totalPower}</span>
        <img src={POWER_ICON} alt="Power" className="cx-power-icon lg" />
        <span className="cx-adv-label">Total Power</span>
      </div>
      <p className="cx-adv-brk">
        {result.powerBeforeRoll} before the roll + {die} on the Adventure die
      </p>

      {/* 5. What it takes, what that gives it, and the rule that converted it. */}
      {result.taken ? (
        <>
          {/* The card art already prints its Power, and the highlighted card beside the
              rejected one shows the "highest requirement it meets" pick — no need to
              restate either here. */}
          <p className="pp-instruct">
            The Chronossus takes <b>{result.taken.name}</b>.
            {did.length ? (
              <>
                {' '}
                It <b>{did.join(', ')}</b>.
              </>
            ) : null}
          </p>
          {result.followUps.map((f) => (
            <p className="pp-instruct" key={f}>
              {f}
            </p>
          ))}
          {result.taken.bot.conversion && (
            <p className="pp-sub">
              <b>Rule used:</b> {result.taken.bot.conversion}
            </p>
          )}
          {result.taken.bot.note && <p className="pp-sub">{result.taken.bot.note}</p>}
        </>
      ) : (
        <p className="pp-instruct">
          The Chronossus meets <b>neither</b> card’s Power requirement — it gains{' '}
          <b>1 VP</b> and both cards go to the bottom of their decks.
        </p>
      )}

      {/* 6. Step 2 of the Action. */}
      <p className="pp-instruct">
        {result.upgraded ? (
          <>
            <b>Power Upgrade:</b> the Chronossus moves 1 <b>{result.upgraded}</b> from its
            board onto its Exosuit Upgrade board.
          </>
        ) : (
          <>
            <b>Power Upgrade:</b> the Chronossus has no Resource with a free slot, so it
            places 1 <b>VP token</b> from the supply on its Exosuit Upgrade board instead.
          </>
        )}
      </p>
      <button className="start-turn" onClick={onCommit}>
        {startLabel}
      </button>
    </>
  );
}

function CxTileDialog({
  action,
  family,
  tileSides,
  panel,
  readOnly = false,
  autoleap = false,
  startLabel = '▶ Start Your Turn',
  onStart,
  onClose,
  guardianGate = null,
  valleyGate = null,
  adventureGate = null,
  experimentGate = null,
  flow = false,
}: {
  action: ChronossusTileActionId;
  /**
   * The tile family actually on screen. Required whenever two families share one action
   * id (Pioneers' C09 and C10 are both `tile-adventure`) — without it the dialog falls
   * back to whichever family the action maps to first, and renders the wrong tile's art,
   * name and verbatim rule box.
   */
  family?: string | null;
  tileSides?: Record<string, 'A' | 'B'>;
  panel: [number, number, number, number];
  readOnly?: boolean;
  /** Reached by an Autoleap (marker moved onto it) — show the Autoleap note. */
  autoleap?: boolean;
  /** Commit-button label ("Advance to Autoleap Action" when the next step autoleaps). */
  startLabel?: string;
  onStart: () => void;
  onClose: () => void;
  /**
   * Fractures: the Valley placement question for the tile Actions that take an Exosuit,
   * plus the Blink check that follows it (the Valley board is a legal Blink destination).
   */
  /**
   * Guardians (C11): the Acquire Guardian flow. It asks first (is a Guardian left? is the
   * World Council space open?) and only then says what to physically do — the app decides
   * which branch runs, exactly like the Fractures placement gate.
   */
  guardianGate?: {
    step: 'available' | 'world-council' | 'place' | 'worker' | 'failed';
    /** The Worker the bot would spend (Most > Scientist > Engineer > Administrator > Genius). */
    worker: Worker | null;
    /** Which figure it would place on the World Council space, if it places one. */
    figure: 'exosuit' | 'guardian' | null;
    impact: boolean;
    failVP: number;
    postImpact2VP: boolean;
    onAvailable: (available: boolean) => void;
    onWorldCouncil: (free: boolean) => void;
    onCommit: () => void;
  } | null;
  valleyGate?: {
    onPlace: (space: 'action' | 'capital') => void;
    step: 'blink' | 'casing' | 'operators' | 'assimilate' | null;
    blink: {
      spaceLabel: string;
      sameSpaceCount: number;
      rule: 'command-token' | 'bottom-left';
      token?: number;
    } | null;
    fluxDrawSrc: string | null;
    /** The Casing came out and there is no figure left — the Action ends in a pass. */
    noFigures: boolean;
    onConfirmBlink: () => void;
    onCasingContinue: () => void;
    /** Assimilate only: the player's answer to "are there Operators left in the Valley?" */
    onOperatorsAnswer: (available: boolean) => void;
    /** Neither the Valley Action space nor the Valley Capital space was open. */
    onNoSpace: () => void;
    /** Assimilate's Technology branch: the result was shown, resolve the Action. */
    onAssimilateContinue: () => void;
    /** The shape the app rolled for this Assimilate, shown with the result. */
    assimilateShape: BreakthroughShape | null;
    /** A Blink check will run once the space is confirmed — see DetailPanel's blinkCheck. */
    blinkCheck: boolean;
  } | null;
  /**
   * Pioneers (C09/C10): the Adventure flow. It asks which strength-bonus slot the player
   * put the bot's Path marker on (that column is shared, so the app never assumes), then
   * rolls, draws, and shows what the Chronossus takes before committing.
   */
  adventureGate?: {
    step: 'slot' | 'blink' | 'casing' | 'shared-draw' | 'result';
    breakdown: { label: string; power: number }[];
    result: AdventureResult | null;
    /** Shared-deck mode: the deck to draw from, and the cards to pick between. */
    sharedDeck: AdventureDeck | null;
    sharedChoices: AdventureCard[];
    sharedPicked: string[];
    /** Shared-deck mode: the die the app rolled, and the resulting total Power. */
    die: number;
    totalPower: number;
    /** Fractures (fractures+pioneers): the Blink check that follows the slot answer. */
    blink: {
      spaceLabel: string;
      sameSpaceCount: number;
      rule: 'command-token' | 'bottom-left';
      token?: number;
    } | null;
    fluxDrawSrc: string | null;
    /** The Casing came out and there is no figure left — the Action ends in a pass. */
    noFigures: boolean;
    /**
     * Fractures: the Blink check already ran (it opens the Adventure), so the Blink /
     * Casing panel has said what to move or place — the slot step drops that clause and
     * asks only for the Path marker.
     */
    placementHandled: boolean;
    onConfirmBlink: () => void;
    onCasingContinue: () => void;
    onSlot: (bonus: number) => void;
    onSharedPick: (id: string) => void;
    onSharedConfirm: () => void;
    /** Opens the Exosuit Upgrade board pop-out from the Power chip. */
    onShowUpgradeBoard: () => void;
    onCommit: () => void;
  } | null;
  /**
   * Doomsday (C07/C08): the Experiment flow. There is no model of the Timeline's Experiment
   * cards — the player can remove one of the bot's Path markers on their own turn — so each
   * step states the rulebook's selection rule and asks what is on the table.
   */
  experimentGate?: {
    step: 'marked' | 'vp' | 'prepare';
    /** Which level this tile executes (C07 = 1, C08 = 2). */
    level: 1 | 2;
    /** Whether the tracks are locked, so a successful Experiment moves nothing. */
    locked: boolean;
    /** The tracker the Chronossus moves, and where it would land. */
    trackerLabel: string;
    nextSlotVp: number;
    onMarked: (available: boolean) => void;
    onVp: (vp: number) => void;
    onPrepare: (can: boolean) => void;
  } | null;
  /** Render in normal flow (mobile) rather than absolutely on the board — same as
   *  DetailPanel, so a module dialog opens exactly where a board Action's does. */
  flow?: boolean;
}) {
  const code = family
    ? `${family}${tileSides?.[family] ?? 'A'}`
    : liveTileCode(action as keyof typeof TILE_ACTION_FAMILY, tileSides);
  const tile = CHRONOSSUS_TILES[code];
  // The Valley board's printed Action spaces are always Assimilate and Extract, whichever
  // tile side (or C14) sits on the Chronossus board — so the player is pointed at the
  // space's own name, never the tile's ("Assimilate and Score", "Efficient Extract"…).
  const valleySpaceName = Chronossus.chronossusActionLabel(action);
  // Where a Valley placement/Blink lands, including the Capital fallback (p.11) — the app
  // never renders the Valley board, so the instruction has to name both.
  const valleyDestination = `${valleySpaceName} (Valley board, topmost space — or the Valley Capital Action space if none is available)`;
  // The verbatim rule box sits below the dialog body for EVERY tile, like a base-game
  // Action's rule box — collapsed mid-turn, expanded for a tap explanation (readOnly),
  // where the rulebook text IS the explanation.
  const [showRule, setShowRule] = useState(readOnly); // a tap explanation opens expanded
  const [l, t, w, h] = panel;
  return (
    <div
      className={`detail-panel cx-tile-dialog ${flow ? 'dp-flow' : ''}`}
      style={flow ? undefined : { left: `${l}%`, top: `${t}%`, width: `${w}%`, height: `${h}%` }}
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
        {/* BlinkPanel / PlaceExosuitPanel are `.place-prompt` boxes themselves, so they
            render OUTSIDE the wrapper below — nesting them drew a box inside a box. */}
        {valleyGate && !readOnly && valleyGate.step === 'blink' && valleyGate.blink && (
          <BlinkPanel
            blink={valleyGate.blink}
            fluxDrawSrc={valleyGate.fluxDrawSrc}
            destination={valleyDestination}
            onConfirm={valleyGate.onConfirmBlink}
          />
        )}
        {valleyGate && !readOnly && valleyGate.step === 'casing' && (
          <PlaceExosuitPanel
            destination={valleyDestination}
            fluxDrawSrc={valleyGate.fluxDrawSrc}
            drewCasing
            offBoard
            noFigures={valleyGate.noFigures}
            onContinue={valleyGate.onCasingContinue}
          />
        )}
        {adventureGate && !readOnly && adventureGate.step === 'blink' && adventureGate.blink && (
          <BlinkPanel
            blink={adventureGate.blink}
            fluxDrawSrc={adventureGate.fluxDrawSrc}
            destination={ADVENTURE_DESTINATION}
            onConfirm={adventureGate.onConfirmBlink}
          />
        )}
        {adventureGate && !readOnly && adventureGate.step === 'casing' && (
          <PlaceExosuitPanel
            destination={ADVENTURE_DESTINATION}
            fluxDrawSrc={adventureGate.fluxDrawSrc}
            drewCasing
            offBoard
            noFigures={adventureGate.noFigures}
            onContinue={adventureGate.onCasingContinue}
          />
        )}
        {/* A play-mode tap is an EXPLANATION: the expanded rule box below is the whole
            answer, so no instruction box at all. Anything else would read as if the tile
            had just been activated. */}
        {!readOnly &&
          !(
            valleyGate &&
            (valleyGate.step === 'blink' || valleyGate.step === 'casing')
          ) &&
          !(
            adventureGate &&
            (adventureGate.step === 'blink' || adventureGate.step === 'casing')
          ) && (
        <div className="place-prompt">
          {autoleap && (
            <p className="pp-sub">
              <b>Autoleap:</b> the marker moved onto this tile, so its Action activates
              now — then the Command marker advances one extra space.
            </p>
          )}
          {/* Guardians (C11): ask, decide, then instruct. */}
          {guardianGate && !readOnly && guardianGate.step === 'available' ? (
            <>
              <p className="pp-instruct">
                Is a <b>Guardian</b> still available on the <b>Guardian board</b>?
              </p>
              <p className="pp-sub">
                The six Guardians are shared with you, so the app can’t see how many are
                left. From this Era on they could be gone.
              </p>
              <div className="pp-buttons">
                <button className="pp-confirm" onClick={() => guardianGate.onAvailable(true)}>
                  ✓ Yes — one is available
                </button>
                <button className="pp-cannot" onClick={() => guardianGate.onAvailable(false)}>
                  ✗ None left — Failed Action (+{guardianGate.failVP} VP)
                </button>
              </div>
            </>
          ) : guardianGate && !readOnly && guardianGate.step === 'world-council' ? (
            <>
              <p className="pp-instruct">
                Is the <b>World Council Action space</b> open?
              </p>
              <p className="pp-sub">
                Don’t place anything yet — if it’s taken, the Chronossus spends a Worker
                instead and places no Exosuit at all.
              </p>
              <div className="pp-buttons">
                <button className="pp-confirm" onClick={() => guardianGate.onWorldCouncil(true)}>
                  ✓ Yes — it’s open
                </button>
                <button className="pp-cannot" onClick={() => guardianGate.onWorldCouncil(false)}>
                  ✗ No — it’s taken
                </button>
              </div>
            </>
          ) : guardianGate && !readOnly && guardianGate.step === 'place' ? (
            <>
              <p className="pp-instruct">
                Place the Chronossus’s{' '}
                <b>{guardianGate.figure === 'guardian' ? 'Guardian' : 'Exosuit'}</b> on the{' '}
                <b>World Council Action space</b> — it becomes the <b>First Player</b>. It
                performs no Action there; instead it recruits the <b>leftmost available
                Guardian</b> at no cost.
              </p>
              <p className="pp-instruct">
                Put one of the Chronossus’s <b>Path markers</b> on an empty Guardian board
                slot for it — that slot becomes this Guardian’s own Action space. (If its
                Path markers run out, use an unused Path’s markers.)
              </p>
              <button className="start-turn" onClick={guardianGate.onCommit}>
                {startLabel}
              </button>
            </>
          ) : guardianGate && !readOnly && guardianGate.step === 'worker' ? (
            <>
              <p className="pp-instruct">
                The Chronossus spends a <b>{guardianGate.worker}</b> and recruits the{' '}
                <b>leftmost available Guardian</b> — no Exosuit is placed.
              </p>
              <p className="pp-instruct">
                Put one of the Chronossus’s <b>Path markers</b> on an empty Guardian board
                slot for the new Guardian — that slot becomes its own Action space.
              </p>
              <p className="pp-sub">
                Worker priority: the one it has most of, then Scientist &gt; Engineer &gt;
                Administrator &gt; Genius.
              </p>
              <button className="start-turn" onClick={guardianGate.onCommit}>
                {startLabel}
              </button>
            </>
          ) : guardianGate && !readOnly && guardianGate.step === 'failed' ? (
            <>
              <p className="pp-instruct">
                {/* No Exosuit discard: with the World Council space taken this Action
                    spends a Worker instead, so it never was an Exosuit placement. */}
                {guardianGate.impact
                  ? guardianGate.postImpact2VP
                    ? 'The Impact has happened, so the Chronossus can no longer acquire Guardians — difficulty option: it scores 2 VP instead.'
                    : `The Impact has happened, so the Chronossus can no longer acquire Guardians — Failed Action: +${guardianGate.failVP} VP.`
                  : guardianGate.worker
                    ? `Failed Action: +${guardianGate.failVP} VP.`
                    : `It has no Workers left to spend on a Guardian — Failed Action: +${guardianGate.failVP} VP.`}
              </p>
              <button className="start-turn" onClick={guardianGate.onCommit}>
                {startLabel}
              </button>
            </>
          ) : /* Pioneers (C09/C10): ask which Power slot the marker went on, then show the
              roll and what it takes. The bonus column is shared with the player's own
              markers, so the app asks every time rather than tracking it. */
          adventureGate && !readOnly && adventureGate.step === 'slot' ? (
            <>
              <p className="pp-instruct">
                {adventureGate.placementHandled ? (
                  <>
                    The Chronossus performs an <b>Adventure</b> — put a <b>Path marker</b> on
                    the topmost free <b>Power slot</b>. (Its figure is already on the hex
                    pool.)
                  </>
                ) : (
                  <>
                    The Chronossus performs an <b>Adventure</b> — put an Exosuit onto the
                    Adventure board’s <b>hex pool</b> and a <b>Path marker</b> on the topmost
                    free <b>Power slot</b>.
                  </>
                )}
              </p>
              {/* Same weight as the instruction above it — this IS the question the step
                  asks, not a footnote to it. */}
              <p className="pp-instruct">Which Power slot did its Path marker go on?</p>
              <div className="pp-buttons cx-adv-slots">
                {Chronossus.POWER_SLOTS.map((bonus) => (
                  <button
                    key={bonus}
                    className="pp-confirm"
                    onClick={() => adventureGate.onSlot(bonus)}
                  >
                    {bonus > 0 ? `+${bonus}` : bonus}
                  </button>
                ))}
                <button
                  className="pp-cannot"
                  onClick={() => adventureGate.onSlot(Chronossus.NO_SLOT_PENALTY)}
                >
                  ✗ None free ({Chronossus.NO_SLOT_PENALTY})
                </button>
              </div>
            </>
          ) : adventureGate && !readOnly && adventureGate.step === 'shared-draw' ? (
            <>
              {/* Rules order (p.15): the Power BEFORE the die picks the deck, and only
                  then is the die rolled — so the draw comes first, the die after it. */}
              <div className="cx-adv-power">
                <span className="cx-adv-total">
                  {adventureGate.totalPower - adventureGate.die}
                </span>
                <img src={POWER_ICON} alt="Power" className="cx-power-icon lg" />
                <span className="cx-adv-label">Power before the roll</span>
              </div>
              <p className="pp-instruct">
                Draw <b>2 cards</b> from the <b>{adventureGate.sharedDeck}</b> deck for the
                Chronossus to evaluate.
              </p>
              <div className="cx-adv-power">
                <img
                  src={`/assets/solo/chronossus/adventure-die-${adventureGate.die}.png`}
                  alt={`Adventure die: ${adventureGate.die}`}
                  className="cx-adv-die lg"
                />
                <span className="cx-adv-total">{adventureGate.totalPower}</span>
                <img src={POWER_ICON} alt="Power" className="cx-power-icon lg" />
                <span className="cx-adv-label">Total Power</span>
              </div>
              <p className="cx-adv-brk">
                {adventureGate.totalPower - adventureGate.die} before the roll +{' '}
                {adventureGate.die} on the Adventure die
              </p>
              <p className="pp-sub">
                It takes the one with the <b>highest Power requirement it meets</b> — pick
                that card below. The other goes to the bottom of the deck.
              </p>
              <select
                className="cx-adv-select"
                value={adventureGate.sharedPicked[0] ?? ''}
                onChange={(e) => adventureGate.onSharedPick(e.target.value)}
              >
                <option value="">Which card does it take?</option>
                <option value="none">
                  Neither — it meets no requirement (+1 VP)
                </option>
                {adventureGate.sharedChoices.map((c) => (
                  <option
                    key={c.id}
                    value={c.id}
                    disabled={adventureGate.totalPower < c.power}
                  >
                    {c.name} — {c.power} Power
                    {adventureGate.totalPower < c.power ? ' (not met)' : ''}
                  </option>
                ))}
              </select>
              <div className="pp-buttons">
                <button
                  className="pp-confirm"
                  disabled={adventureGate.sharedPicked.length === 0}
                  onClick={adventureGate.onSharedConfirm}
                >
                  ✓ Confirm
                </button>
              </div>
            </>
          ) : adventureGate && !readOnly && adventureGate.step === 'result' && adventureGate.result ? (
            <AdventureResultPanel
              result={adventureGate.result}
              breakdown={adventureGate.breakdown}
              startLabel={startLabel}
              onCommit={adventureGate.onCommit}
              onShowUpgradeBoard={adventureGate.onShowUpgradeBoard}
            />
          ) : valleyGate && !readOnly && valleyGate.step === 'assimilate' ? (
            <>
              <p className="pp-instruct">
                The shape die rolled <b>{valleyGate.assimilateShape}</b> — the Chronossus
                takes a <b>Technology card</b>, preferring the secondary stack.
              </p>
              {valleyGate.assimilateShape && (
                <div className="shape-roll">
                  <ShapeIcon shape={valleyGate.assimilateShape} size={52} />
                </div>
              )}
              <p className="pp-sub">It is worth 3 VP at the end of the game.</p>
              <div className="pp-buttons">
                <button className="pp-confirm" onClick={valleyGate.onAssimilateContinue}>
                  ✓ Confirm taken
                </button>
              </div>
            </>
          ) : valleyGate && !readOnly && valleyGate.step === 'operators' ? (
            <>
              <p className="pp-instruct">
                The shape die rolled <b>{valleyGate.assimilateShape}</b> — the Chronossus
                recruits an <b>Operator</b>. Are there any left in the <b>Valley</b>?
              </p>
              {valleyGate.assimilateShape && (
                <div className="shape-roll">
                  <ShapeIcon shape={valleyGate.assimilateShape} size={52} />
                </div>
              )}
              {/* The Chronossus's Worker collection is app-tracked, so the only physical
                  action is taking the Operator out of the Valley. */}
              <p className="pp-sub">
                If so, discard one <b>Operator</b> from the Valley.
              </p>
              <div className="pp-buttons">
                <button
                  className="pp-confirm"
                  onClick={() => valleyGate.onOperatorsAnswer(true)}
                >
                  ✓ Yes — it takes an Operator
                </button>
                <button
                  className="pp-cannot"
                  onClick={() => valleyGate.onOperatorsAnswer(false)}
                >
                  ✗ None left — Failed Action (+1 VP)
                </button>
              </div>
            </>
          ) : valleyGate && !readOnly ? (
            <>
              {/* One question for both spaces: the Valley Capital space is the automatic
                  fallback (p.11), so what matters is whether EITHER is open. */}
              <p className="pp-instruct">
                Is an <b>{valleySpaceName}</b> Action space — or the{' '}
                <b>Valley Capital Action space</b> — open on the <b>Valley board</b>?
                {!valleyGate.blinkCheck && (
                  <> Place the Chronossus’s Exosuit on the <b>topmost</b> available{' '}
                    {valleySpaceName} space, or on the Valley Capital space if no{' '}
                    {valleySpaceName} space is open.</>
                )}
              </p>
              {/* No Energy Core line: the core marks an Exosuit that could Blink, and one
                  on the Valley board never can. */}
              {valleyGate.blinkCheck && (
                <p className="pp-sub">
                  Don’t place anything yet — the Chronossus Blink-checks first, and a Blink
                  moves an Exosuit it already has on the Main board onto the Valley space
                  instead.
                </p>
              )}
              <div className="pp-buttons">
                <button className="pp-confirm" onClick={() => valleyGate.onPlace('action')}>
                  {valleyGate.blinkCheck ? '✓ Yes — check for Blink' : '✓ Yes — placed there'}
                </button>
                <button className="pp-cannot" onClick={valleyGate.onNoSpace}>
                  ✗ No — neither is open
                </button>
              </div>
              {/* No effect blurb here: the gate is only asking about the space. What the
                  Action does comes with the steps that resolve it (and the 📖 box below). */}
            </>
          ) : experimentGate && !readOnly && experimentGate.step === 'marked' ? (
            <>
              <p className="pp-instruct">
                <b>Step 1 — Execute Experiment.</b> Is there a{' '}
                <b>Level {experimentGate.level} Experiment</b> on the Timeline with one of the
                Chronossus’s <b>Path markers</b> on it?
              </p>
              <p className="pp-sub">
                If more than one, it takes the <b>leftmost</b> — and discards the Path marker.
              </p>
              <div className="pp-buttons">
                <button className="pp-confirm" onClick={() => experimentGate.onMarked(true)}>
                  ✓ Yes — it takes one
                </button>
                <button className="pp-cannot" onClick={() => experimentGate.onMarked(false)}>
                  ✗ None — skip this step
                </button>
              </div>
            </>
          ) : experimentGate && !readOnly && experimentGate.step === 'vp' ? (
            <>
              <p className="pp-instruct">
                What is the <b>Victory Point value</b> printed on that Experiment?
              </p>
              <div className="pp-buttons">
                {[2, 3].map((v) => (
                  <button key={v} className="pp-confirm" onClick={() => experimentGate.onVp(v)}>
                    {v} VP
                  </button>
                ))}
              </div>
              {experimentGate.locked ? (
                <p className="pp-sub">
                  The Doomsday tracks are locked, so its <b>{experimentGate.trackerLabel}</b>{' '}
                  marker will not move — the Experiment still scores.
                </p>
              ) : (
                <p className="pp-sub">
                  It will then move its <b>{experimentGate.trackerLabel}</b> marker one step
                  {experimentGate.nextSlotVp > 0
                    ? `, scoring the ${experimentGate.nextSlotVp} VP printed there.`
                    : ' (no VP printed there).'}
                </p>
              )}
            </>
          ) : experimentGate && !readOnly ? (
            <>
              <p className="pp-instruct">
                <b>Step 2 — Prepare for Experimentation.</b> Place one of the Chronossus’s{' '}
                <b>Path markers</b> on a face-up Experiment that does not already have one —
                a <b>Level 1 before a Level 2</b>, and the <b>furthest in the past</b> to
                break a tie.
              </p>
              <p className="pp-sub">
                Never the Experiment under the next Era. Your Focus marker has no effect on
                this choice.
              </p>
              <div className="pp-buttons">
                <button className="pp-confirm" onClick={() => experimentGate.onPrepare(true)}>
                  {startLabel}
                </button>
                <button className="pp-cannot" onClick={() => experimentGate.onPrepare(false)}>
                  ✗ All of them already have one
                </button>
              </div>
            </>
          ) : (
            <p className="pp-instruct">{tileInstruction(code)}</p>
          )}
          {!readOnly && !valleyGate && !guardianGate && !adventureGate && !experimentGate && (
            <button className="start-turn" onClick={onStart}>
              {startLabel}
            </button>
          )}
        </div>
        )}

        {/* Verbatim rulebook text, collapsible — mirrors the action dialogs, and shown
            for every tile in every step so the box is always in the same place. */}
        <div className="mech-rules">
          <button className="mech-cta" onClick={() => setShowRule((s) => !s)}>
            📖 {tile.name} ({code}) {showRule ? '▾' : '▸'}
          </button>
          {showRule && (
            <div className="rule-body">
              {tile.rule.split('\n').map((line, i) => (
                <p key={i} className="dp-rule">
                  {line}
                </p>
              ))}
              {/* The module section's fuller write-up of the same Action, when the
                  rulebook prints one (the new module tiles). */}
              {tile.detail?.split('\n').map((line, i) =>
                line === '' ? (
                  <p key={`d${i}`} className="dp-rule dp-rule-gap" />
                ) : (
                  <p key={`d${i}`} className="dp-rule">
                    {line}
                  </p>
                ),
              )}
            </div>
          )}
        </div>

        {/* Fractures — the Blink rules sit with the tile's own rule box, below the
            boxes rather than inside the Blink step. */}
        {valleyGate &&
          !readOnly &&
          (valleyGate.step === 'blink' || valleyGate.step === 'casing') && <BlinkRuleBlock />}
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// Hypersync Action dialog (C12 / C13). Walks the player through the branch:
//   1. Intro — the tile + plan. If it has a pending tile AND an Exosuit, offer to
//      check the Hypersync hexes; otherwise it Time-Travels (or Fails).
//   2. Hexes — mark any of the 3 Hypersync hex spaces already occupied.
//   3a. Hypersync — pick a random available hex, place an Exosuit, retrieve the bot's
//       oldest pending tile (2 VP), and apply the tile's post-bonus. With the targeted
//       difficulty the space is instead the one matching one of YOUR pending tiles
//       (furthest in the past) — asked as a question, since only you can see them; with
//       no match of yours it falls through to the normal roll.
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
  blinkStep = null,
  blink = null,
  fluxDrawSrc = null,
  onConfirmBlink = () => {},
  onCasingContinue = () => {},
  deferPlacement = false,
  flow = false,
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
  /**
   * Fractures combo: the Blink check that runs once the hex is settled — the Hypersync
   * board is another off-Main-board destination an Exosuit can Blink onto.
   */
  blinkStep?: 'blink' | 'casing' | null;
  blink?: {
    spaceLabel: string;
    sameSpaceCount: number;
    rule: 'command-token' | 'bottom-left';
    token?: number;
  } | null;
  fluxDrawSrc?: string | null;
  onConfirmBlink?: () => void;
  onCasingContinue?: () => void;
  /**
   * Fractures combo: the hex is a Blink destination, so the dialog only NAMES the space
   * here — the Blink check decides whether an Exosuit is placed or moved, and the step
   * after it gives the instruction.
   */
  deferPlacement?: boolean;
  /** Render in normal flow (mobile), like DetailPanel — see CxTileDialog. */
  flow?: boolean;
}) {
  const tile = CHRONOSSUS_TILES[code];
  const plan = Chronossus.hypersyncPlan(bot, era);
  // Same past-tile rule as the Action itself: tiles placed this Era don't count.
  const canTimeTravel = warpRemoval(bot, era).eligible;
  const isAutoleap = tileEffect(code).autoleap === true;
  // When a Hypersync Action is possible (pending tile + available Exosuit), skip the
  // intro and open straight on the 3 hexes; only fall back to Time Travel / Failed once
  // all 3 are marked unavailable (#11). The intro is kept for the not-canHypersync case.
  const [step, setStep] = useState<
    'intro' | 'hexes' | 'targeted' | 'targeted-place' | 'roll' | 'timetravel'
  >(plan.canHypersync ? 'hexes' : 'intro');
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
    // The difficulty aims the Chronossus at one of YOUR pending tiles — but only the
    // player can see whether an available space matches one, so ask before rolling.
    if (targeted) {
      setStep('targeted');
      return;
    }
    if (rolledHex == null || !available.some((n) => n === rolledHex)) rollSpace();
    setStep('roll');
  };
  /** "Does an available space match one of YOUR pending tiles?" */
  const answerTargeted = (matches: boolean) => {
    if (matches) {
      setStep('targeted-place');
      return;
    }
    // No tile of yours to aim at → the normal random space (rulebook default).
    if (rolledHex == null || !available.some((n) => n === rolledHex)) rollSpace();
    setStep('roll');
  };
  // Commit the Hypersync Action on the rolled (or targeted) space.
  const takeHypersync = () =>
    onResolve({ code, outcome: 'hypersync', hex: targeted ? undefined : (rolledHex ?? undefined) });

  return (
    <div
      className={`detail-panel cx-tile-dialog ${flow ? 'dp-flow' : ''}`}
      style={flow ? undefined : { left: `${l}%`, top: `${t}%`, width: `${w}%`, height: `${h}%` }}
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
        {readOnly ? null : step === 'intro' ? (
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
                  {canTimeTravel
                    ? ''
                    : bot.warpTilesOnTimeline > 0
                      ? ', but its only Warp tiles are on the current Era’s Timeline tile, so it is a Failed Action'
                      : ', but no Warp tiles remain, so it is a Failed Action'}.
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
          </div>
        ) : step === 'hexes' ? (
          <div className="place-prompt">
            <p className="pp-instruct">
              Tap any Hypersync hex space that is already occupied on the board.
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
          </div>
        ) : blinkStep === 'blink' && blink ? (
          <BlinkPanel
            blink={blink}
            fluxDrawSrc={fluxDrawSrc}
            destination={`Hypersync hex ${rolledHex ?? ''}`.trim()}
            onConfirm={onConfirmBlink}
          />
        ) : blinkStep === 'casing' ? (
          <PlaceExosuitPanel
            destination={
              rolledHex != null
                ? `Hypersync space ${rolledHex}`
                : 'the Hypersync space matching your furthest-in-the-past pending tile'
            }
            fluxDrawSrc={fluxDrawSrc}
            drewCasing
            offBoard
            onContinue={onCasingContinue}
          />
        ) : step === 'targeted' ? (
          // Difficulty: the Chronossus aims at one of YOUR pending tiles instead of
          // rolling — only you can see whether an available space matches one.
          <div className="place-prompt">
            <p className="pp-instruct">
              Does one of the available Hypersync spaces ({available.join(', ')}) match a{' '}
              <b>Hypersync tile you have pending</b> from a <b>prior Era</b>?
            </p>
            <div className="pp-buttons">
              <button className="pp-confirm" onClick={() => answerTargeted(true)}>
                ✓ Yes — one matches
              </button>
              <button className="pp-cannot" onClick={() => answerTargeted(false)}>
                ✗ No — none of mine
              </button>
            </div>
          </div>
        ) : step === 'targeted-place' ? (
          <div className="place-prompt">
            <p className="pp-instruct">
              The Chronossus takes the space matching <b>your furthest-in-the-past</b>{' '}
              pending Hypersync tile.
            </p>
            <p className="pp-sub">
              {deferPlacement
                ? 'It scores 2 VP and retrieves its own oldest pending tile (no Time Travel advance). Don’t place anything yet — the Blink check comes next.'
                : 'Place a bot Exosuit on that space to block it; it scores 2 VP and retrieves its own oldest pending tile. (No Time Travel advance.)'}
            </p>
            <button className="start-turn" onClick={takeHypersync}>
              {startLabel ?? '▶ Take Turn'}
            </button>
          </div>
        ) : step === 'roll' ? (
          // Roll step: randomize among the available spaces → show where to place
          // the blocking bot Exosuit.
          <div className="place-prompt">
            {rolledHex == null ? (
              <>
                <p className="pp-instruct">
                  Roll to randomize between the available Hypersync spaces (
                  {available.join(', ')}).
                </p>
                <div className="hs-hex-row">
                  {Chronossus.HYPERSYNC_HEXES.map((n) => {
                    const off = occupied.has(n);
                    return (
                      <div key={n} className={`hs-hex ${off ? 'occupied' : ''}`} aria-hidden>
                        {off ? '⊘' : n}
                      </div>
                    );
                  })}
                </div>
                <button className="start-turn" onClick={rollSpace}>
                  🎲 Roll available space
                </button>
              </>
            ) : (
              <>
                <p className="pp-instruct">
                  {deferPlacement ? (
                    <>
                      The Chronossus takes <b>Hypersync space {rolledHex}</b> — it takes the
                      Hypersync tile from the oldest Era (Era {plan.oldestTileEra}).
                    </>
                  ) : (
                    <>
                      Place a Bot Exosuit on <b>Hypersync space {rolledHex}</b> — the
                      Chronossus takes the Hypersync tile from the oldest Era (Era{' '}
                      {plan.oldestTileEra}).
                    </>
                  )}
                </p>
                <div className="hs-hex-row">
                  {Chronossus.HYPERSYNC_HEXES.map((n) => {
                    const off = occupied.has(n);
                    return (
                      <div
                        key={n}
                        className={`hs-hex ${off ? 'occupied' : n === rolledHex ? 'rolled' : 'dimmed'}`}
                        aria-hidden
                      >
                        {off ? '⊘' : n}
                      </div>
                    );
                  })}
                </div>
                <p className="pp-sub">
                  It scores 2 VP. Do not advance the Time Travel marker.
                  {deferPlacement ? ' Don’t place anything yet — the Blink check comes next.' : ''}
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
          </div>
        )}

        {/* Verbatim rule boxes, always below the dialog body and in the same order,
            whichever step is on screen — the tile's own text first, then the rules the
            current step brings with it (Time Travel fallback, Autoleap, Blink). The
            readOnly tap explanation already prints the tile text expanded above. */}
        {/* A tap opens the box; mid-turn it starts collapsed. Either way it is the same
            📖 collapsible every other dialog shows. */}
        {readOnly ? (
          <HypersyncRules tile={tile} code={code} startOpen />
        ) : (
          <>
            <HypersyncRules tile={tile} code={code} startOpen={false} />
            {targeted && (
              <RulesBox label="Targeted Hypersync (difficulty)">
                <p>
                  Instead of randomly selecting a Hypersync Action space to take, the
                  Chronossus takes the one corresponding to one of your pending Hypersync
                  tiles. If you have more than one, it takes the one furthest in the past.
                </p>
              </RulesBox>
            )}
            {step === 'timetravel' && <TimeTravelRuleBlockCollapsible />}
            {isAutoleap && <AutoleapRuleBlockCollapsible />}
          </>
        )}
        {(blinkStep === 'blink' || blinkStep === 'casing') && <BlinkRuleBlock />}
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
        <b>Variable Anomalies — the Chronossus receives an Anomaly.</b> From the visible
        Anomaly tiles give it the one that <b>lets it retrieve a Warp tile</b> right now
        (check each tile's Before/After Impact icon against this Era's Impact status). If{' '}
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
      <RulesBox label="Variable Anomalies">
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
  flow = false,
}: {
  era: number;
  actionLabel: string;
  panel: [number, number, number, number];
  onConfirm: () => void;
  onCancel: () => void;
  /** Render in normal flow (mobile), like DetailPanel — see CxTileDialog. */
  flow?: boolean;
}) {
  const [l, t, w, h] = panel;
  return (
    <div
      className={`detail-panel cx-tile-dialog ${flow ? 'dp-flow' : ''}`}
      style={flow ? undefined : { left: `${l}%`, top: `${t}%`, width: `${w}%`, height: `${h}%` }}
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
        📖 {tile.name} ({code}) {open ? '▾' : '▸'}
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
/**
 * Which tracker chip's popover is open, shared by every `TapFlag` in one row — with
 * per-chip state they all stayed open at once, so tapping the next one just added another
 * popover instead of replacing it. Provided by `TapFlagRow`.
 */
const TapFlagCtx = createContext<{
  openId: string | null;
  setOpenId: (id: string | null) => void;
} | null>(null);

/** Wraps a row of `TapFlag` chips so only one popover is open at a time. */
function TapFlagRow({ children }: { children: React.ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null);
  return <TapFlagCtx.Provider value={{ openId, setOpenId }}>{children}</TapFlagCtx.Provider>;
}

function TapFlag({
  className,
  hint,
  children,
  onClick,
}: {
  className: string;
  hint: string;
  children: React.ReactNode;
  /**
   * Makes the chip DO something instead of toggling its own tooltip popover (the Power
   * chip opens the Exosuit Upgrade board). The hover tooltip stays either way.
   */
  onClick?: () => void;
}) {
  const ctx = useContext(TapFlagCtx);
  const id = useId();
  // Standalone (no row provider) falls back to its own state.
  const [soloOpen, setSoloOpen] = useState(false);
  const open = ctx ? ctx.openId === id : soloOpen;
  const toggle = () => {
    if (ctx) ctx.setOpenId(open ? null : id);
    else setSoloOpen((o) => !o);
  };
  const close = () => (ctx ? ctx.setOpenId(null) : setSoloOpen(false));
  return (
    <span className="tap-flag-wrap">
      <button
        type="button"
        className={`eoa-flag tap-flag ${className}`}
        title={hint}
        aria-label={hint}
        aria-expanded={onClick ? undefined : open}
        onClick={onClick ?? toggle}
      >
        {children}
      </button>
      {open && (
        <span className="tap-flag-pop" role="tooltip" onClick={close}>
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
            {score.experimentVP > 0 && (
              <li title="Doomsday: the VP printed on the Experiment cards it claimed. Already counted in the total — split out of Token VP, because it discards each card and nothing is left to count back. Doomsday track VP is ordinary VP and stays in the token line.">
                <span>Experiments claimed</span><b>{score.experimentVP}</b>
              </li>
            )}
            {score.technologyVP > 0 && (
              <li title="Fractures: 3 VP per Technology card the Chronossus holds">
                <span>Technologies (3 each)</span><b>{score.technologyVP}</b>
              </li>
            )}
            {score.leftoverFluxVP > 0 && (
              <li title="Fractures difficulty: 1 VP per Flux Core left in the Flux Pool">
                <span>Leftover Flux Cores</span><b>{score.leftoverFluxVP}</b>
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
  // Module lines. Only rendered for the modes that use them, but they stay in this list
  // so a value already typed still counts if the rows re-render.
  { key: 'technologies', label: 'Technology cards' },
  { key: 'fractureDevice', label: 'Fracture Device' },
  { key: 'glitches', label: 'Glitches', neg: true },
  { key: 'hypersyncTiles', label: 'Hypersync tiles remaining', neg: true },
  // Doomsday: the Experiment cards leave the table as they are claimed, so there is nothing
  // to recount at the end. (Doomsday track VP is ordinary VP — it goes in 'vpTokens'.)
  { key: 'experiments', label: 'Experiments' },
];
const CX_TALLY_BY_KEY: Record<string, CxTallyField> = Object.fromEntries(
  CX_TALLY_FIELDS.map((f) => [f.key, f]),
);

// Side-by-side score rows: shared rows carry both a player tally key and the bot's
// pre-filled value; player-only rows omit botValue. The bot's "Token / Action VP" is
// shown on the "Victory Point tokens" line next to the player's own tally.
//
// A module's rows appear whenever that module is in play — not only when the bot scored
// something for it — because most of them are the PLAYER's alone (the Fracture Device,
// Glitches, leftover Hypersync tiles). Negative lines show the per-piece rate as a hint
// but take the total, and the field forces the sign.
const CX_SCORE_ROWS = (
  score: ReturnType<typeof Chronossus.scoreChronossus>,
  hypersync: boolean,
  fractures: boolean,
  doomsday: boolean,
): { label: string; playerKey?: string; botValue?: number }[] => [
  { label: 'Buildings', playerKey: 'buildings', botValue: score.buildingVP },
  { label: 'Superprojects', playerKey: 'superprojects', botValue: score.superprojectVP },
  { label: 'Time Travel', playerKey: 'timeTravel', botValue: score.timeTravelVP },
  // Rate hints read the same on every line ("3 each", "−2 each") — no "×", since these
  // fields take a total, not a count to be multiplied.
  { label: 'Breakthroughs (1 each)', playerKey: 'breakthroughs', botValue: score.breakthroughVP },
  { label: 'Breakthrough sets (set of shapes 2 each)', playerKey: 'breakthroughSets', botValue: score.shapeSetBonus },
  { label: 'Anomalies (−3 each)', playerKey: 'anomalies', botValue: score.anomalyVP },
  { label: 'Victory Point tokens', playerKey: 'vpTokens', botValue: score.tokenVP },
  { label: 'Morale', playerKey: 'morale' },
  { label: 'Solo Objectives (highest levels)', playerKey: 'soloObjectives' },
  { label: 'Timeline penalties', playerKey: 'timelinePenalties' },
  // Fractures: Technologies score for both sides (3 VP each); the Fracture Device and
  // Glitches are the player's alone — the Chronossus has neither.
  ...(fractures
    ? [
        { label: 'Technology cards (3 each)', playerKey: 'technologies', botValue: score.technologyVP },
        { label: 'Fracture Device', playerKey: 'fractureDevice' },
        { label: 'Glitches (−2 each)', playerKey: 'glitches' },
      ]
    : []),
  // Hypersync: the player loses 4 VP per tile still in the future; the bot never does.
  ...(hypersync
    ? [{ label: 'Hypersync tiles remaining (−4 each)', playerKey: 'hypersyncTiles' }]
    : []),
  // Doomsday: the Experiment cards get their own row because they are DISCARDED as they are
  // claimed — neither side can recount them at the end. The Doomsday track's VP is not
  // broken out: it is granted as ordinary VP as the marker is pushed along, so it sits in
  // "Victory Point tokens" with everything else.
  ...(doomsday ? [{ label: 'Experiments', playerKey: 'experiments', botValue: score.experimentVP }] : []),
  // D5 difficulty (bot-only, no player equivalent) — only shown when it scored anything.
  ...(score.leftoverEnergyVP
    ? [{ label: 'Leftover Energy Cores (difficulty, 1 each)', botValue: score.leftoverEnergyVP }]
    : []),
  // Fractures' leftover Flux Cores are bot-only, and only with that difficulty option.
  ...(score.upgradeTokenVP
    ? [
        {
          label: 'Upgrade board VP tokens (difficulty, 1 each)',
          botValue: score.upgradeTokenVP,
        },
      ]
    : []),
  ...(score.leftoverFluxVP
    ? [{ label: 'Leftover Flux Cores (difficulty, 1 each)', botValue: score.leftoverFluxVP }]
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
  const { user, login } = useAuth();
  // Whether this game uses a Hypersync mode (adds the Hypersync-tile note to the
  // player's Timeline-penalties line — the bot never loses VP for those tiles).
  const hypersyncMode = getMode(state.config.chronossusMode).slots.some(
    (s) => tileEffect(`${s.family}A`).hypersync === true,
  );
  // Fractures adds three tally lines (Technologies, Fracture Device, Glitches), two of
  // them the player's alone.
  const fracturesMode = Chronossus.isFracturesMode(state.config.chronossusMode);
  const doomsdayMode = Chronossus.isDoomsdayMode(state.config.chronossusMode);
  const [mode, setMode] = useState<'number' | 'tally'>('tally');
  const [num, setNum] = useState('');
  const [tally, setTally] = useState<Record<string, number>>({});
  // Tally mode always sums to a number (0 to start), so don't treat it as a
  // finished score until the player clicks Done — otherwise it auto-saves 0.
  const [tallyDone, setTallyDone] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  // A human-readable reason for a failed save (session expired vs. a generic error).
  const [saveErr, setSaveErr] = useState<string>('');
  /** The failure was a lapsed login — the one case the player can act on, with a button. */
  const [saveExpired, setSaveExpired] = useState(false);

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

  /** The finished game as the data service takes it — also what gets queued on a failure. */
  const pendingSummary = (): GameSummary => ({
    won: result === 'win',
    bot_score: score.total,
    player_score: playerScore,
    difficulty: 'Chronossus',
    era_reached: state.era,
    payload: { opponent: 'Chronossus', breakdown: score, botTurns: totalActions },
  });
  const saveGame = async () => {
    if (result == null || playerScore == null) return;
    setSaveState('saving');
    try {
      await recordGame(pendingSummary());
      setSaveState('saved');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const expired = /\b40[13]\b/.test(msg);
      // Hold the result on this device BEFORE saying anything: logging in is a full-page
      // redirect, so a game left only in React state would be gone by the time it returns.
      queuePendingGame(pendingSummary());
      // 401/403 → the shared BGE session lapsed; anything else is network/server.
      setSaveErr(
        expired
          ? 'Your login session expired. This game is saved on this device and will upload once you log in.'
          : "Couldn't reach your history service. This game is saved on this device and will upload next time.",
      );
      setSaveExpired(expired);
      setSaveState('error');
    }
  };
  // Share / save the score summary as a PNG (native share sheet on mobile, download
  // on desktop). Includes the top line, the breakdown, and the modes + difficulty (#7).
  const [shareMsg, setShareMsg] = useState<string>('');
  const handleShare = async () => {
    const rows: ScoreShareRow[] = CX_SCORE_ROWS(score, hypersyncMode, fracturesMode, doomsdayMode).map((r) => ({
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
              {score.technologyVP > 0 && (
                <li><span>Technologies (3 each)</span><b>{score.technologyVP}</b></li>
              )}
              {score.upgradeTokenVP > 0 && (
                <li><span>Upgrade board VP tokens (difficulty)</span><b>{score.upgradeTokenVP}</b></li>
              )}
              {score.leftoverFluxVP > 0 && (
                <li><span>Leftover Flux Cores (difficulty)</span><b>{score.leftoverFluxVP}</b></li>
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
              {CX_SCORE_ROWS(score, hypersyncMode, fracturesMode, doomsdayMode).map((r) => (
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

        {/* What the game was played at, under the tally rather than above it — it is
            reference, not something to fill in. Same block as the turn overview's. */}
        <DifficultyList
          difficulty={state.config.difficulty.map((f) =>
            chronossusDifficultyLabel(f, state.config.difficultyValues),
          )}
        />

        <ul className="score-breakdown score-meta">
          <li className="score-turns"><span>Bot turns taken</span><b>{totalActions}</b></li>
        </ul>
        <div className="score-rules">
          <RulesBox label="End Game scoring">
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
                {/* The old message told the player to log in again and gave them no way to
                    — and nothing held the result. The game is queued by now, so this can
                    safely redirect. */}
                {saveExpired && (
                  <button className="score-save-retry" onClick={login}>
                    Log in
                  </button>
                )}{' '}
                <button
                  className="score-save-retry"
                  onClick={() => {
                    setSaveErr('');
                    setSaveExpired(false);
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

