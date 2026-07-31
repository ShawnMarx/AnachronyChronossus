import { describe, it, expect } from 'vitest';
import {
  MAX_ERA,
  powerUpBase,
  powerUpCap,
  poweredExosuits,
  energyDrawCount,
  poolAfterDraw,
  resolvePowerUp,
  startNextEra,
  type EnergyDraw,
} from './chronossus';
import { drawEnergyPool } from '../index';
import {
  createInitialState,
  emptyChronossusState,
  ENERGY_POOL_START,
  type GameState,
  type EnergyPool,
} from '../state';
import type { GameConfig } from '../types';

const CONFIG: GameConfig = {
  bot: 'chronossus',
  expansions: ['base'],
  difficulty: [],
  playerBoardSide: 'A',
};

function chronossusState(overrides: Partial<GameState> = {}): GameState {
  return {
    ...createInitialState(CONFIG),
    chronossus: emptyChronossusState(),
    phase: 'powerup',
    ...overrides,
  };
}

describe('Chronossus Energy Pool — constants & math', () => {
  it('starts the pool at 5 energized / 5 exhausted', () => {
    expect(emptyChronossusState().energyPool).toEqual({ energized: 5, exhausted: 5 });
    expect(ENERGY_POOL_START).toEqual({ energized: 5, exhausted: 5 });
  });

  it('power-up base/cap flip on the Impact', () => {
    expect(powerUpBase(false)).toBe(3);
    expect(powerUpCap(false)).toBe(6);
    expect(powerUpBase(true)).toBe(2);
    expect(powerUpCap(true)).toBe(4);
  });

  it('powers up base + energized, capped by Impact', () => {
    expect(poweredExosuits(false, 0)).toBe(3); // 3 + 0
    expect(poweredExosuits(false, 2)).toBe(5); // 3 + 2
    expect(poweredExosuits(false, 3)).toBe(6); // 3 + 3, cap 6
    expect(poweredExosuits(false, 5)).toBe(6); // capped
    expect(poweredExosuits(true, 0)).toBe(2); // 2 + 0
    expect(poweredExosuits(true, 2)).toBe(4); // 2 + 2, cap 4
    expect(poweredExosuits(true, 3)).toBe(4); // capped
  });

  it('draws 3, or all remaining when the pool is depleted', () => {
    expect(energyDrawCount({ energized: 5, exhausted: 5 })).toBe(3);
    expect(energyDrawCount({ energized: 1, exhausted: 1 })).toBe(2);
    expect(energyDrawCount({ energized: 0, exhausted: 0 })).toBe(0);
  });
});

describe('poolAfterDraw — removal & the single returned exhausted core', () => {
  it('removes all drawn, returns exactly one exhausted when any exhausted drawn', () => {
    // draw 1 energized + 2 exhausted from 5/5
    expect(poolAfterDraw({ energized: 5, exhausted: 5 }, { energized: 1, exhausted: 2 })).toEqual({
      energized: 4,
      exhausted: 4, // 5 - 2 + 1
    });
  });

  it('returns nothing when no exhausted were drawn', () => {
    expect(poolAfterDraw({ energized: 5, exhausted: 5 }, { energized: 3, exhausted: 0 })).toEqual({
      energized: 2,
      exhausted: 5,
    });
  });

  it('a single exhausted drawn nets zero pool change for exhausted', () => {
    expect(poolAfterDraw({ energized: 5, exhausted: 5 }, { energized: 0, exhausted: 1 })).toEqual({
      energized: 5,
      exhausted: 5, // 5 - 1 + 1
    });
  });
});

describe('resolvePowerUp', () => {
  it('sets powered Exosuits and updates the pool (before Impact)', () => {
    const draw: EnergyDraw = { energized: 2, exhausted: 1 };
    const next = resolvePowerUp(chronossusState({ impact: false }), draw);
    expect(next.chronossus!.exosuitsAvailable).toBe(5); // 3 + 2
    expect(next.chronossus!.energyPool).toEqual({ energized: 3, exhausted: 5 }); // 5-2, 5-1+1
    expect(next.chronossus!.passed).toBe(false);
    expect(next.phase).toBe('warp');
  });

  it('caps at 4 after the Impact', () => {
    const next = resolvePowerUp(chronossusState({ impact: true }), { energized: 3, exhausted: 0 });
    expect(next.chronossus!.exosuitsAvailable).toBe(4);
    expect(next.chronossus!.energyPool).toEqual({ energized: 2, exhausted: 5 });
  });

  it('all-exhausted draw powers up only the base', () => {
    const next = resolvePowerUp(chronossusState({ impact: false }), { energized: 0, exhausted: 3 });
    expect(next.chronossus!.exosuitsAvailable).toBe(3);
    expect(next.chronossus!.energyPool).toEqual({ energized: 5, exhausted: 3 }); // 5-3+1
  });

  it('throws without a Chronossus slice', () => {
    const bad = { ...createInitialState(CONFIG), chronossus: undefined };
    expect(() => resolvePowerUp(bad, { energized: 1, exhausted: 0 })).toThrow(/no Chronossus/);
  });
});

describe('drawEnergyPool (randomness boundary)', () => {
  it('always draws min(3, pool) tokens within bounds', () => {
    for (let i = 0; i < 500; i++) {
      const pool: EnergyPool = { energized: 5, exhausted: 5 };
      const d = drawEnergyPool(pool);
      expect(d.energized + d.exhausted).toBe(3);
      expect(d.energized).toBeLessThanOrEqual(5);
      expect(d.exhausted).toBeLessThanOrEqual(5);
    }
  });

  it('draws all remaining when fewer than 3 are left', () => {
    const d = drawEnergyPool({ energized: 1, exhausted: 1 });
    expect(d.energized + d.exhausted).toBe(2);
  });

  it('never draws more of a kind than exist', () => {
    for (let i = 0; i < 200; i++) {
      const d = drawEnergyPool({ energized: 0, exhausted: 4 });
      expect(d.energized).toBe(0);
      expect(d.exhausted).toBe(3);
    }
  });
});

describe('startNextEra', () => {
  it('advances the Era and clears the passed flag', () => {
    const s = chronossusState({ era: 2, phase: 'cleanup' });
    s.chronossus!.passed = true;
    const next = startNextEra(s);
    expect(next.era).toBe(3);
    expect(next.phase).toBe('preparation');
    expect(next.chronossus!.passed).toBe(false);
  });

  it('MAX_ERA matches the base game', () => {
    expect(MAX_ERA).toBe(7);
  });
});
