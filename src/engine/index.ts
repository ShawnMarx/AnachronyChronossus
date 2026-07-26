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

// --------------------------------------------------------------------------
// Dice — the app rolls all bot randomness. These live in the engine boundary
// so the pure phase functions stay deterministic (they receive rolled values).
// --------------------------------------------------------------------------

/** Roll the AI die (the Flux die reused). Faces are configurable; see notes. */
export function rollAiDie(faces: number[] = AI_DIE_FACES): number {
  return faces[Math.floor(Math.random() * faces.length)];
}

/**
 * The AI die (= Anachrony Flux die) faces. NOTE: to be confirmed against the
 * physical die — kept here as data so it's a one-line fix once verified.
 */
export const AI_DIE_FACES: number[] = [1, 2, 3, 4, 5, 6];

/**
 * Roll the Paradox die: returns the number of Paradoxes (0..3). Approximate
 * distribution for the base game; the app shows the result for the player to
 * confirm against the physical die.
 */
export function rollParadoxDie(): number {
  // Faces roughly: 0,0,1,1,2,3 — mild bias toward low numbers.
  const faces = [0, 0, 1, 1, 2, 3];
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
