import { chronobot as chronobotMeta } from './bots/chronobotMeta';
import { registerBot } from './bots/BotModule';
import { chronossus } from './bots/chronossus';

// Register the built-in bots. Additional modules can call registerBot().
registerBot(chronobotMeta);
registerBot(chronossus);

export * from './types';
export * from './state';
export { getBot, listBots, registerBot } from './bots/BotModule';
export type { BotModule } from './bots/BotModule';

export * from './rules/chronobotActions';

// Chronobot guided engine (pure phase functions).
export * as Chronobot from './bots/chronobot';
export type {
  CommandToken,
  CommandTokenPos,
  CommandTokensState,
  PathId,
} from './bots/chronobot';

// --------------------------------------------------------------------------
// Dice — the app rolls all bot randomness. These live in the engine boundary
// so the pure phase functions stay deterministic (they receive rolled values).
// --------------------------------------------------------------------------

/** Roll the AI die (the Flux die reused). Faces are configurable; see notes. */
export function rollAiDie(faces: number[] = AI_DIE_FACES): number {
  return faces[Math.floor(Math.random() * faces.length)];
}

/**
 * The AI die (= Anachrony Flux die) faces: a D6 showing 2, 3, 3, 4, 4, 5 — one
 * face per Command token, with 3 and 4 twice as likely. Rolling a number
 * activates the Command token bearing it.
 */
export const AI_DIE_FACES: number[] = [2, 3, 3, 4, 4, 5];

/**
 * Roll the Paradox die: returns the number of Paradoxes gained (0, 1, or 2).
 * The physical die has 6 faces: 1 blank (0), 4 single-Paradox (1), and 1
 * double-Paradox (2). Used by both the Paradox phase and the Chronobot's Warp.
 */
export function rollParadoxDie(): number {
  const faces = [0, 1, 1, 1, 1, 2];
  return faces[Math.floor(Math.random() * faces.length)];
}

/** Roll the Breakthrough shape die. */
export function rollShapeDie(): 'circle' | 'triangle' | 'square' {
  const faces: ('circle' | 'triangle' | 'square')[] = [
    'circle',
    'circle',
    'triangle',
    'triangle',
    'square',
    'square',
  ];
  return faces[Math.floor(Math.random() * faces.length)];
}
