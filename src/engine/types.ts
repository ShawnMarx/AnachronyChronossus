// Core domain types for the Anachrony solo-guide engine.
//
// These are intentionally lightweight and expansion-agnostic. The engine's job
// is to *guide* a human player through a bot's turn, not to fully simulate
// Anachrony's rules. Detailed rules live inside each BotModule (see ./bots).

/** The five Anachrony resources (Neutronium is the "premium" resource). */
export type Resource = 'water' | 'gold' | 'titanium' | 'uranium' | 'neutronium';

export const RESOURCES: Resource[] = [
  'water',
  'gold',
  'titanium',
  'uranium',
  'neutronium',
];

/** The four Anachrony worker types. */
export type Worker = 'genius' | 'administrator' | 'engineer' | 'scientist';

export const WORKERS: Worker[] = [
  'genius',
  'administrator',
  'engineer',
  'scientist',
];

/** The four primary building types the Chronobot can Construct. */
export type BuildingType = 'factory' | 'lab' | 'powerplant' | 'support';

export const BUILDING_TYPES: BuildingType[] = [
  'factory',
  'lab',
  'powerplant',
  'support',
];

/**
 * Breakthrough "shapes." Anachrony uses three geometric shapes; a "complete
 * shape set" (one of each) is worth bonus VP to the solo bots at game end.
 */
export type BreakthroughShape = 'circle' | 'triangle' | 'square';

export const BREAKTHROUGH_SHAPES: BreakthroughShape[] = [
  'circle',
  'triangle',
  'square',
];

/** Which solo opponent ("bot") is driving the game. */
export type BotModeId =
  | 'chronossus' // The Chronossus automa (default target for this app)
  | 'chronobot'; // The original Chronobot from the base game

/**
 * Expansions that can modify a bot's behaviour or the setup. Kept as string
 * ids so modules can opt in without a hard dependency graph.
 */
export type ExpansionId =
  | 'base'
  | 'exosuit-command' // Exosuit Command Module
  | 'doomsday'
  | 'fractures-of-time'
  | 'classic-vs-new';

export interface GameConfig {
  bot: BotModeId;
  expansions: ExpansionId[];
  /** Difficulty options selected at setup; meaning is defined per bot module. */
  difficulty: string[];
  /** Which side of the player board the human chose (cosmetic to the bot). */
  playerBoardSide?: 'A' | 'B';
  /** Chronossus module in play (id from CHRONOSSUS_MODES; default 'base'). */
  chronossusMode?: string;
  /**
   * Per-tile side selection, keyed by tile family (e.g. 'C01' → 'B'). Only tiles
   * the player flipped to B appear; anything absent is the A side. Set by the
   * "Flip Action tiles to their B side" difficulty option.
   */
  tileSides?: Record<string, 'A' | 'B'>;
}

/** A resource bundle, e.g. gains or costs. */
export type ResourcePool = Partial<Record<Resource, number>>;
