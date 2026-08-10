import type {
  BotModeId,
  BreakthroughShape,
  BuildingType,
  ExpansionId,
  GameConfig,
  Resource,
  ResourcePool,
  Worker,
} from './types';

/**
 * A single instruction shown to the player. The UI renders these as a checklist
 * for the current phase/turn; the player performs the physical action.
 */
export interface Instruction {
  id: string;
  /** Short imperative text, e.g. "Place a Chronobot Exosuit on the Mine". */
  text: string;
  /** Optional longer explanation / rules reminder (the "why" — JIT rule). */
  detail?: string;
  /** Resources/VP the bot gains or loses, for the player to apply. */
  effect?: ResourcePool & { vp?: number };
  /** Marks a decision the player must resolve on their physical board. */
  requiresInput?: boolean;
}

/** The ordered phases of a solo Era. */
export type Phase =
  | 'setup'
  | 'preparation'
  | 'paradox'
  | 'powerup'
  | 'warp'
  | 'actions'
  | 'cleanup'
  | 'endgame';

export const PHASE_ORDER: Phase[] = [
  'preparation',
  'paradox',
  'powerup',
  'warp',
  'actions',
  'cleanup',
];

/** Rulebook phase numbers (Solo Opponents): Action Rounds is Phase 5. */
export const PHASE_NUMBER: Partial<Record<Phase, number>> = {
  preparation: 1,
  paradox: 2,
  powerup: 3,
  warp: 4,
  actions: 5,
  cleanup: 6,
};

/** Everything the app tracks about the Chronobot itself. */
export interface ChronobotState {
  exosuitsTotal: number;
  /** Powered-up Exosuits available to place this Era. */
  exosuitsAvailable: number;
  vp: number;
  /** Portion of `vp` earned from Building + Superproject tiles (the rest is "token" VP). */
  buildingVp: number;
  resources: Record<Resource, number>;
  workers: Record<Worker, number>;
  breakthroughs: Record<BreakthroughShape, number>;
  buildings: Record<BuildingType, number>;
  /** The printed VP of each constructed building, per type (order built). */
  buildingVps: Record<BuildingType, number[]>;
  superprojects: number;
  /** The printed VP of each constructed Superproject (order built). */
  superprojectVps: number[];
  /**
   * Paradoxes on the Chronobot's tracker (0–2). Rolling in the Paradox phase
   * accumulates here; reaching 3 resets to 0 and gains an Anomaly.
   */
  paradoxes: number;
  anomalies: number;
  /** Total Warp tiles still on the Timeline (per-tile split lives on the table). */
  warpTilesOnTimeline: number;
  warpTilesTotal: number;
  timeTravelTrack: number;
  /** Actions the bot has taken so far this Era (min 3 before it can stop). */
  actionsThisEra: number;
  totalActions: number;
  /** True once the bot has passed for the Era. */
  passed: boolean;
}

/**
 * The Chronossus's Energy Pool: a bag of Energy Core tokens drawn (without
 * looking) during the Power Up phase. "Energized" = non-exhausted cores (each
 * powers up an extra Exosuit); "exhausted" cores contribute nothing. Starts at
 * 5 / 5; the pool only shrinks over the game (drawn tokens are removed, except
 * one exhausted core returned each Power Up).
 */
export interface EnergyPool {
  energized: number;
  exhausted: number;
}

/** Starting Energy Pool composition (base game): 5 Energy + 5 Exhausted cores. */
export const ENERGY_POOL_START: EnergyPool = { energized: 5, exhausted: 5 };

/**
 * Everything the app tracks about the Chronossus itself. Mirrors the shared
 * trackers of `ChronobotState` (so scoring/board overlays can be shared) and
 * adds the Chronossus-only `energyPool`. Unlike the Chronobot it has no
 * `actionsThisEra` (no min-3 rule) and receives no starting assets/workers.
 */
export interface ChronossusState {
  exosuitsTotal: number;
  /** Powered-up Exosuits available to place this Era (set in Power Up). */
  exosuitsAvailable: number;
  vp: number;
  /** Portion of `vp` from Building + Superproject tiles (rest is "token" VP). */
  buildingVp: number;
  resources: Record<Resource, number>;
  workers: Record<Worker, number>;
  breakthroughs: Record<BreakthroughShape, number>;
  buildings: Record<BuildingType, number>;
  buildingVps: Record<BuildingType, number[]>;
  superprojects: number;
  superprojectVps: number[];
  /** Paradoxes on the tracker (0–2); 3 resets to 0 and gains an Anomaly. */
  paradoxes: number;
  anomalies: number;
  warpTilesOnTimeline: number;
  warpTilesTotal: number;
  timeTravelTrack: number;
  /**
   * Actions taken this Era. The Chronossus has no min-3-actions rule (unlike the
   * Chronobot), but tracking it keeps this slice structurally compatible with
   * `ChronobotState`, so the tested decision helpers (Recruit/Mine/Anomaly
   * priorities) can be reused directly.
   */
  actionsThisEra: number;
  totalActions: number;
  passed: boolean;
  /** The Energy Pool bag (drives Power Up). Starts `ENERGY_POOL_START`. */
  energyPool: EnergyPool;
  /**
   * Hypersync mode only: the Eras on which the Chronossus has a PENDING Solo
   * Hypersync tile (placed via the no-space Capital-Action fallback). Max 3, at
   * most one per Era. A Hypersync Action retrieves the furthest-past one. Empty in
   * every other mode.
   */
  hypersyncTiles: number[];
  /**
   * Variable Anomalies extra module only: the VP penalty of each Anomaly currently
   * held (negative numbers), replacing the flat `anomalies` counter/`ANOMALY_VP`
   * for games with that module — `scoreChronossus` sums this instead when present.
   * `undefined` for every other game (the flat `anomalies` counter is authoritative
   * then); seeded to `[]` at setup when the module is selected.
   */
  anomalyVps?: number[];
}

/** Free-form per-bot state keyed by bot id. Only chronobot is filled for v1. */
export interface GameState {
  config: GameConfig;
  /** Current Era (1-based). */
  era: number;
  /** Whether the Impact has occurred (player toggles when it happens). */
  impact: boolean;
  phase: Phase;
  /** Who is First Player this Era (drives Warp/Action turn order). Era 1 = 'bot'. */
  firstPlayer: 'bot' | 'player';
  /** Whether the human player has already passed this Era's Action Rounds. */
  playerPassed: boolean;
  /**
   * "Bot takes one additional turn after you pass" difficulty: whether that extra
   * turn has already been spent this Era. Reset each Era.
   */
  extraTurnAfterPassUsed: boolean;
  /** Set when the player triggers the End Game (Era 5–6); game ends after the Era. */
  endgameTriggered: boolean;
  chronobot: ChronobotState;
  /** The Chronossus slice — present only in a Chronossus game (attached at setup). */
  chronossus?: ChronossusState;
  /** Instructions produced for the step currently being resolved. */
  currentInstructions: Instruction[];
  finished: boolean;
  log: string[];
}

export function emptyChronobotState(): ChronobotState {
  return {
    exosuitsTotal: 6,
    exosuitsAvailable: 0,
    vp: 0,
    buildingVp: 0,
    resources: { water: 0, gold: 0, titanium: 0, uranium: 0, neutronium: 0 },
    workers: { genius: 0, administrator: 0, engineer: 0, scientist: 0 },
    breakthroughs: { circle: 0, triangle: 0, square: 0 },
    buildings: { factory: 0, lab: 0, powerplant: 0, support: 0 },
    buildingVps: { factory: [], lab: [], powerplant: [], support: [] },
    superprojects: 0,
    superprojectVps: [],
    paradoxes: 0,
    anomalies: 0,
    warpTilesOnTimeline: 0,
    warpTilesTotal: 8,
    timeTravelTrack: 0,
    actionsThisEra: 0,
    totalActions: 0,
    passed: false,
  };
}

export function emptyChronossusState(): ChronossusState {
  return {
    exosuitsTotal: 6,
    exosuitsAvailable: 0,
    vp: 0,
    buildingVp: 0,
    resources: { water: 0, gold: 0, titanium: 0, uranium: 0, neutronium: 0 },
    workers: { genius: 0, administrator: 0, engineer: 0, scientist: 0 },
    breakthroughs: { circle: 0, triangle: 0, square: 0 },
    buildings: { factory: 0, lab: 0, powerplant: 0, support: 0 },
    buildingVps: { factory: [], lab: [], powerplant: [], support: [] },
    superprojects: 0,
    superprojectVps: [],
    paradoxes: 0,
    anomalies: 0,
    warpTilesOnTimeline: 0,
    warpTilesTotal: 8,
    timeTravelTrack: 0,
    actionsThisEra: 0,
    totalActions: 0,
    passed: false,
    energyPool: { ...ENERGY_POOL_START },
    hypersyncTiles: [],
  };
}

export function createInitialState(config: GameConfig): GameState {
  return {
    config,
    era: 1,
    impact: false,
    phase: 'setup',
    firstPlayer: 'bot',
    playerPassed: false,
    extraTurnAfterPassUsed: false,
    endgameTriggered: false,
    chronobot: emptyChronobotState(),
    currentInstructions: [],
    finished: false,
    log: [],
  };
}

export const DEFAULT_CONFIG: GameConfig = {
  bot: 'chronobot' as BotModeId,
  expansions: ['base'] as ExpansionId[],
  difficulty: [],
  playerBoardSide: 'A',
};
