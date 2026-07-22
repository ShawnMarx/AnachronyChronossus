import type { GameState, Instruction } from '../state';
import type { BotModeId, ExpansionId } from '../types';

/**
 * Contract every solo opponent implements. A BotModule is a pure set of
 * functions over GameState — no UI, no side effects — so it can be unit tested
 * in isolation and reused across any front end.
 */
export interface BotModule {
  id: BotModeId;
  name: string;
  description: string;
  /** Expansions this module knows how to react to. */
  supportedExpansions: ExpansionId[];

  /**
   * Perform any bot-specific setup, returning the initial `bot` sub-state.
   * Called once after createInitialState.
   */
  setup(state: GameState): Record<string, unknown>;

  /**
   * Produce the ordered list of instructions for the bot's current turn.
   * Should be deterministic given `state` plus any player-provided input
   * (dice, drawn cards) that the caller has already merged into `state.bot`.
   */
  planTurn(state: GameState): Instruction[];

  /**
   * Advance the game after the player has resolved `state.currentTurn`.
   * Returns the next state. May set `finished`.
   */
  endTurn(state: GameState): GameState;
}

const registry = new Map<BotModeId, BotModule>();

export function registerBot(module: BotModule): void {
  registry.set(module.id, module);
}

export function getBot(id: BotModeId): BotModule {
  const module = registry.get(id);
  if (!module) throw new Error(`No bot module registered for "${id}"`);
  return module;
}

export function listBots(): BotModule[] {
  return [...registry.values()];
}
