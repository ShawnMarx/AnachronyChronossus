import type { BotModeId, ExpansionId, GameConfig, ResourcePool } from './types';

/**
 * A single instruction shown to the player during a bot's turn. The UI renders
 * these one at a time (or as a checklist); the player performs the physical
 * action and advances.
 */
export interface Instruction {
  id: string;
  /** Short imperative text, e.g. "Place Chronossus worker on the Mine". */
  text: string;
  /** Optional longer explanation / rules reminder. */
  detail?: string;
  /** Resources the bot gains/loses as a result, for the player to apply. */
  effect?: ResourcePool;
  /** Marks a decision the player must resolve before continuing. */
  requiresInput?: boolean;
}

/** Free-form per-bot state; each BotModule owns the shape of `bot`. */
export interface GameState {
  config: GameConfig;
  /** Current era / round marker (game-defined; 1-based). */
  era: number;
  /** Bot victory points, for quick tracking. */
  botVictoryPoints: number;
  /** Opaque state owned by the active BotModule. */
  bot: Record<string, unknown>;
  /** Instructions produced for the turn currently being resolved. */
  currentTurn: Instruction[];
  /** Whether the game has reached an end condition. */
  finished: boolean;
  log: string[];
}

export function createInitialState(config: GameConfig): GameState {
  return {
    config,
    era: 1,
    botVictoryPoints: 0,
    bot: {},
    currentTurn: [],
    finished: false,
    log: [],
  };
}

export const DEFAULT_CONFIG: GameConfig = {
  bot: 'chronossus' as BotModeId,
  expansions: ['base'] as ExpansionId[],
};
