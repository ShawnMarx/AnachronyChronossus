import type { BotModeId, ExpansionId } from '../types';

/**
 * Lightweight descriptor for a solo opponent, used by the setup screen and the
 * registry. The actual turn logic for each bot lives in its own module as pure
 * phase functions (see chronobot.ts) rather than behind a single interface —
 * the guided, phase-by-phase flow doesn't fit a one-shot planTurn/endTurn shape.
 */
export interface BotModule {
  id: BotModeId;
  name: string;
  description: string;
  /** Expansions this bot can be played with. */
  supportedExpansions: ExpansionId[];
  /** Whether the full guided engine is implemented yet (vs. scaffold). */
  implemented: boolean;
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
