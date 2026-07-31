// chronossus.ts — the Chronossus automa's guided engine (pure, UI-agnostic).
//
// The Chronossus is "Chronobot + deltas" (the rulebook itself frames it that
// way). Phases that are identical to the Chronobot — Paradox, Warp, Preparation,
// Clean Up — will call shared code; this module owns the Chronossus-specific
// behavior: the Energy Pool Power Up, modular Action tiles + Autoleap, gaining
// Energy Cores, Solo Objectives, and its own scoring. Randomness (the Energy
// Pool draw, dice) is performed at the engine boundary (see engine/index.ts) and
// passed in, so these functions stay deterministic.
//
// Feature 3 lands the state slice + Power Up. Later features add Action Rounds
// (F4), scoring/Solo Objectives (F5), and the view (F6).

import type { GameState, Instruction, EnergyPool } from '../state';

/** Highest Era before the game always ends (same as the Chronobot). */
export const MAX_ERA = 7;

// --------------------------------------------------------------------------
// Phase 3: Power Up (the Energy Pool)
// --------------------------------------------------------------------------

/** The result of drawing from the Energy Pool: how many of each kind came out. */
export interface EnergyDraw {
  /** Non-exhausted ("energized") cores drawn — each powers up +1 Exosuit. */
  energized: number;
  /** Exhausted cores drawn — contribute nothing to the power-up count. */
  exhausted: number;
}

/** Base Exosuits powered up before adding drawn Energy Cores: 3 pre-Impact, 2 post. */
export function powerUpBase(impact: boolean): number {
  return impact ? 2 : 3;
}

/** Maximum Exosuits that can be powered up this Era: 6 pre-Impact, 4 post. */
export function powerUpCap(impact: boolean): number {
  return impact ? 4 : 6;
}

/** How many tokens are drawn from the pool this Power Up (3, or fewer if depleted). */
export function energyDrawCount(pool: EnergyPool): number {
  return Math.min(3, pool.energized + pool.exhausted);
}

/** Powered Exosuits for a given Impact state and number of energized cores drawn. */
export function poweredExosuits(impact: boolean, energizedDrawn: number): number {
  return Math.min(powerUpBase(impact) + energizedDrawn, powerUpCap(impact));
}

/**
 * Apply the pool bookkeeping after a Power Up draw: remove all drawn tokens from
 * the pool, then return exactly one Exhausted core to it (only if any exhausted
 * were drawn). The pool therefore only shrinks; a drawn exhausted core is the
 * one thing that ever comes back.
 */
export function poolAfterDraw(pool: EnergyPool, draw: EnergyDraw): EnergyPool {
  return {
    energized: pool.energized - draw.energized,
    exhausted: pool.exhausted - draw.exhausted + (draw.exhausted > 0 ? 1 : 0),
  };
}

/**
 * Resolve the Chronossus's Power Up (Phase 3). The app draws `draw` tokens from
 * the Energy Pool (see `drawEnergyPool` at the engine boundary); this applies
 * the rules: power up `base + energized` Exosuits (capped), update the pool, and
 * advance to Warp.
 */
export function resolvePowerUp(state: GameState, draw: EnergyDraw): GameState {
  if (!state.chronossus) throw new Error('resolvePowerUp: no Chronossus state');
  const powered = poweredExosuits(state.impact, draw.energized);
  const bot = {
    ...state.chronossus,
    exosuitsAvailable: Math.min(powered, state.chronossus.exosuitsTotal),
    passed: false,
    energyPool: poolAfterDraw(state.chronossus.energyPool, draw),
  };
  const drawnTotal = draw.energized + draw.exhausted;
  const returned = draw.exhausted > 0 ? 1 : 0;
  const instructions: Instruction[] = [
    {
      id: 'powerup',
      text: `Power up ${bot.exosuitsAvailable} of the Chronossus's Exosuits.`,
      detail:
        `Drew ${drawnTotal} token${drawnTotal === 1 ? '' : 's'} from the Energy Pool: ` +
        `${draw.energized} Energy + ${draw.exhausted} Exhausted. ${state.impact ? '2' : '3'}+${draw.energized} ` +
        `= ${bot.exosuitsAvailable} Exosuit${bot.exosuitsAvailable === 1 ? '' : 's'} ` +
        `(max ${powerUpCap(state.impact)} ${state.impact ? 'after' : 'before'} the Impact). ` +
        (returned
          ? 'Return 1 drawn Exhausted core to the Pool and remove the rest from the game.'
          : 'Remove all drawn tokens from the game (no Exhausted core to return).'),
    },
  ];
  return {
    ...state,
    chronossus: bot,
    phase: 'warp',
    currentInstructions: instructions,
    log: [
      ...state.log,
      `Power Up: drew ${draw.energized}E/${draw.exhausted}X → ${bot.exosuitsAvailable} Exosuits.`,
    ],
  };
}

// --------------------------------------------------------------------------
// Era loop
// --------------------------------------------------------------------------

/** Reset per-Era state and enter the next Era's Preparation (Phase 1). */
export function startNextEra(state: GameState): GameState {
  if (!state.chronossus) throw new Error('startNextEra: no Chronossus state');
  return {
    ...state,
    era: state.era + 1,
    phase: 'preparation',
    playerPassed: false,
    extraTurnAfterPassUsed: false,
    chronossus: { ...state.chronossus, passed: false },
    currentInstructions: [],
    log: [...state.log, `— Era ${state.era + 1} begins —`],
  };
}
