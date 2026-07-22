import { chronobot } from './bots/chronobot';
import { getBot, registerBot } from './bots/BotModule';
import { chronossus } from './bots/chronossus';
import { createInitialState, type GameState } from './state';
import type { GameConfig } from './types';

// Register the built-in bots. Additional modules (or expansion overlays) can
// call registerBot() at startup.
registerBot(chronossus);
registerBot(chronobot);

export * from './types';
export * from './state';
export { getBot, listBots, registerBot } from './bots/BotModule';
export type { BotModule } from './bots/BotModule';

/** Create a fresh game and run the active bot's setup. */
export function newGame(config: GameConfig): GameState {
  const state = createInitialState(config);
  const bot = getBot(config.bot);
  return { ...state, bot: bot.setup(state) };
}

/** Compute the instructions for the current turn. */
export function planTurn(state: GameState): GameState {
  const bot = getBot(state.config.bot);
  return { ...state, currentTurn: bot.planTurn(state) };
}

/** Resolve the current turn and advance to the next. */
export function endTurn(state: GameState): GameState {
  const bot = getBot(state.config.bot);
  return bot.endTurn(state);
}
