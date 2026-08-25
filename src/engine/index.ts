import { chronobot as chronobotMeta } from './bots/chronobotMeta';
import { chronossus as chronossusMeta } from './bots/chronossusMeta';
import { registerBot } from './bots/BotModule';
import { registerEngine } from './bots/soloEngine';
import * as ChronobotEngine from './bots/chronobot';
import * as ChronossusEngine from './bots/chronossus';
import type { EnergyPool } from './state';
import type { EnergyDraw } from './bots/chronossus';

// Register the built-in bots. Additional modules can call registerBot().
registerBot(chronobotMeta);
registerBot(chronossusMeta);

// Register each bot's flow-level engine (the shared Era-loop seam).
registerEngine({
  id: 'chronobot',
  MAX_ERA: ChronobotEngine.MAX_ERA,
  maxEraFor: () => ChronobotEngine.MAX_ERA,
  startNextEra: ChronobotEngine.startNextEra,
});
registerEngine({
  id: 'chronossus',
  MAX_ERA: ChronossusEngine.MAX_ERA,
  // Fractures of Time shortens the game to 5 Eras (rulebook p.4).
  maxEraFor: ChronossusEngine.maxEraFor,
  startNextEra: ChronossusEngine.startNextEra,
});

export * from './types';
export * from './state';
export * from './message';
export { getBot, listBots, registerBot } from './bots/BotModule';
export type { BotModule } from './bots/BotModule';
export { engineFor, registerEngine, hasEngine } from './bots/soloEngine';
export type { SoloEngine } from './bots/soloEngine';

export * from './rules/chronobotActions';
export * from './warpTiles';

// Chronobot guided engine (pure phase functions).
export * as Chronobot from './bots/chronobot';

// Chronossus guided engine (pure phase functions).
export * as Chronossus from './bots/chronossus';
export type { EnergyDraw } from './bots/chronossus';
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

/**
 * Draw from the Chronossus's Energy Pool for the Power Up phase: draw 3 tokens
 * (or all remaining, if fewer) *without replacement* and report how many were
 * energized vs. exhausted. The pool is unchanged here — `Chronossus.resolvePowerUp`
 * applies the removal/return bookkeeping given this draw.
 */
export function drawEnergyPool(pool: EnergyPool): EnergyDraw {
  const bag: boolean[] = [
    ...Array<boolean>(pool.energized).fill(true),
    ...Array<boolean>(pool.exhausted).fill(false),
  ];
  const n = Math.min(3, bag.length);
  let energized = 0;
  let exhausted = 0;
  for (let i = 0; i < n; i++) {
    const j = Math.floor(Math.random() * bag.length);
    if (bag.splice(j, 1)[0]) energized++;
    else exhausted++;
  }
  return { energized, exhausted };
}

/**
 * Roll the Pioneers Adventure die — a plain d6 (its faces carry the Power icon, but the
 * distribution is 1-6, confirmed off the physical die art).
 */
export function rollAdventureDie(): number {
  return 1 + Math.floor(Math.random() * 6);
}

/**
 * Shuffle a deck of Adventure card ids (Fisher-Yates). Randomness lives at the engine
 * boundary, like the dice and the Energy Pool draw, so the Pioneers module stays pure.
 */
export function shuffleAdventureDeck(ids: string[]): string[] {
  const out = [...ids];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
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
