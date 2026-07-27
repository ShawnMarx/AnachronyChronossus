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
  | 'paradox'
  | 'powerup'
  | 'warp'
  | 'actions'
  | 'cleanup'
  | 'endgame';

export const PHASE_ORDER: Phase[] = [
  'paradox',
  'powerup',
  'warp',
  'actions',
  'cleanup',
];

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

/** Free-form per-bot state keyed by bot id. Only chronobot is filled for v1. */
export interface GameState {
  config: GameConfig;
  /** Current Era (1-based). */
  era: number;
  /** Whether the Impact has occurred (player toggles when it happens). */
  impact: boolean;
  phase: Phase;
  /** Whether the human player has already passed this Era's Action Rounds. */
  playerPassed: boolean;
  chronobot: ChronobotState;
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
    anomalies: 0,
    warpTilesOnTimeline: 0,
    warpTilesTotal: 8,
    timeTravelTrack: 0,
    actionsThisEra: 0,
    totalActions: 0,
    passed: false,
  };
}

export function createInitialState(config: GameConfig): GameState {
  return {
    config,
    era: 1,
    impact: false,
    phase: 'setup',
    playerPassed: false,
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
