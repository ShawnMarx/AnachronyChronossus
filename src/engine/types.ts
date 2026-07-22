// Core domain types for the Anachrony solo-guide engine.
//
// These are intentionally lightweight and expansion-agnostic. The engine's job
// is to *guide* a human player through a bot's turn, not to fully simulate
// Anachrony's rules. Detailed rules live inside each BotModule (see ./bots).

/** The four Anachrony resources tracked on the resource wheels. */
export type Resource = 'water' | 'gold' | 'titanium' | 'uranium';

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
  /** Difficulty / level selector; meaning is defined per bot module. */
  difficulty?: string;
}

/** A resource bundle, e.g. gains or costs. */
export type ResourcePool = Partial<Record<Resource, number>>;
