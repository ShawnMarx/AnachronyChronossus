import { describe, it, expect } from 'vitest';
import {
  MAX_ERA,
  powerUpBase,
  powerUpCap,
  poweredExosuits,
  energyDrawCount,
  poolAfterDraw,
  resolvePowerUp,
  resolveAction,
  wouldPassOn,
  passChronossus,
  actionRoundsEnded,
  startNextEra,
  isPostImpact,
  POST_IMPACT_ERA,
  rollParadox,
  endParadoxPhase,
  resolveWarp,
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

describe('resolveAction — base actions on the Chronossus slice', () => {
  function withExosuits(n: number, extra: Partial<GameState> = {}): GameState {
    const s = chronossusState({ phase: 'actions', ...extra });
    s.chronossus!.exosuitsAvailable = n;
    return s;
  }

  it('Recruit gains a worker + 1 VP and consumes an Exosuit', () => {
    const { state } = resolveAction(withExosuits(4), { actionId: 'recruit' });
    expect(state.chronossus!.vp).toBe(1);
    expect(state.chronossus!.exosuitsAvailable).toBe(3);
    const workerTotal = Object.values(state.chronossus!.workers).reduce((a, b) => a + b, 0);
    expect(workerTotal).toBe(1);
  });

  it('Research with a rolled shape gains that Breakthrough', () => {
    const { state } = resolveAction(withExosuits(4), { actionId: 'research', shape: 'triangle' });
    expect(state.chronossus!.breakthroughs.triangle).toBe(1);
    expect(state.chronossus!.exosuitsAvailable).toBe(3);
  });

  it('Reboot does nothing (no Exosuit, no VP)', () => {
    const { state } = resolveAction(withExosuits(4), { actionId: 'reboot' });
    expect(state.chronossus!.vp).toBe(0);
    expect(state.chronossus!.exosuitsAvailable).toBe(4);
  });

  it('Time Travel with no Warp tiles is Failed (+1 VP, no Exosuit)', () => {
    const { state } = resolveAction(withExosuits(4), { actionId: 'time-travel' });
    expect(state.chronossus!.vp).toBe(1);
    expect(state.chronossus!.timeTravelTrack).toBe(0);
    expect(state.chronossus!.exosuitsAvailable).toBe(4);
  });

  it('Time Travel removes a Warp tile and advances the track', () => {
    const s = withExosuits(4);
    s.chronossus!.warpTilesOnTimeline = 2;
    const { state } = resolveAction(s, { actionId: 'time-travel' });
    expect(state.chronossus!.warpTilesOnTimeline).toBe(1);
    expect(state.chronossus!.timeTravelTrack).toBe(1);
  });

  it('no-space Failed: +1 VP AND discards an active Exosuit (Chronossus nuance)', () => {
    const { state } = resolveAction(withExosuits(4), { actionId: 'mine-resource', noSpaceAvailable: true });
    expect(state.chronossus!.vp).toBe(1);
    expect(state.chronossus!.exosuitsAvailable).toBe(3); // discarded one
  });

  it('Construct is Failed when already at 3 of a type (still places an Exosuit)', () => {
    const s = withExosuits(4);
    s.chronossus!.buildings.factory = 3;
    const { state } = resolveAction(s, { actionId: 'construct-factory' });
    expect(state.chronossus!.vp).toBe(1);
    expect(state.chronossus!.buildings.factory).toBe(3);
    expect(state.chronossus!.exosuitsAvailable).toBe(3);
  });

  it('tile Score gains 2 VP; tile Energy Pack adds an energized core', () => {
    const score = resolveAction(withExosuits(4), { actionId: 'tile-score' }).state;
    expect(score.chronossus!.vp).toBe(2);
    const pack = resolveAction(withExosuits(4), { actionId: 'tile-energy-pack' }).state;
    expect(pack.chronossus!.energyPool.energized).toBe(6); // 5 + 1
  });

  it('increments totalActions each resolve', () => {
    let s = withExosuits(6);
    s = resolveAction(s, { actionId: 'reboot' }).state;
    s = resolveAction(s, { actionId: 'reboot' }).state;
    expect(s.chronossus!.totalActions).toBe(2);
  });
});

describe('passing & end of Action Rounds', () => {
  function withExosuits(n: number, extra: Partial<GameState> = {}): GameState {
    const s = chronossusState({ phase: 'actions', ...extra });
    s.chronossus!.exosuitsAvailable = n;
    return s;
  }

  it('wouldPassOn: true for an Exosuit-placing action at 0 Exosuits', () => {
    const bot = withExosuits(0).chronossus!;
    expect(wouldPassOn(bot, 'construct-factory')).toBe(true);
    expect(wouldPassOn(bot, 'mine-resource')).toBe(true);
    expect(wouldPassOn(bot, 'recruit')).toBe(true);
  });

  it('wouldPassOn: false when Exosuits remain', () => {
    const bot = withExosuits(1).chronossus!;
    expect(wouldPassOn(bot, 'construct-factory')).toBe(false);
  });

  it('wouldPassOn: false for non-placing actions even at 0 Exosuits', () => {
    const bot = withExosuits(0).chronossus!;
    expect(wouldPassOn(bot, 'time-travel')).toBe(false);
    expect(wouldPassOn(bot, 'reboot')).toBe(false);
    expect(wouldPassOn(bot, 'tile-score')).toBe(false);
  });

  it('passChronossus sets the passed flag', () => {
    const { state } = passChronossus(withExosuits(0));
    expect(state.chronossus!.passed).toBe(true);
  });

  it('actionRoundsEnded only when BOTH have passed', () => {
    const base = withExosuits(0);
    expect(actionRoundsEnded(base)).toBe(false);
    const botPassed = passChronossus(base).state;
    expect(actionRoundsEnded(botPassed)).toBe(false); // player hasn't passed
    expect(actionRoundsEnded({ ...botPassed, playerPassed: true })).toBe(true);
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

  it('derives the Impact flag from the new Era (post-Impact from Era 5)', () => {
    // Era 3 → 4 stays pre-Impact; Era 4 → 5 flips to post-Impact and stays true.
    expect(startNextEra(chronossusState({ era: 3, phase: 'cleanup' })).impact).toBe(false);
    expect(startNextEra(chronossusState({ era: 4, phase: 'cleanup' })).impact).toBe(true);
    expect(startNextEra(chronossusState({ era: 5, phase: 'cleanup' })).impact).toBe(true);
  });
});

describe('isPostImpact — same Impact Era as the Chronobot', () => {
  it('is false for Eras 1–4, true for Era 5+', () => {
    expect(POST_IMPACT_ERA).toBe(5);
    expect([1, 2, 3, 4].map(isPostImpact)).toEqual([false, false, false, false]);
    expect([5, 6, 7].map(isPostImpact)).toEqual([true, true, true]);
  });
});

describe('resolveWarp — places the rolled Warp tiles', () => {
  it('adds N Warp tiles and advances to Actions', () => {
    const s = chronossusState({ era: 3, phase: 'warp' });
    s.chronossus!.warpTilesOnTimeline = 1;
    const next = resolveWarp(s, 2);
    expect(next.chronossus!.warpTilesOnTimeline).toBe(3);
    expect(next.phase).toBe('actions');
  });
  it('places nothing on a 0 roll', () => {
    const next = resolveWarp(chronossusState({ era: 3, phase: 'warp' }), 0);
    expect(next.chronossus!.warpTilesOnTimeline).toBe(0);
  });
});

describe('rollParadox — same rules as the Chronobot, on the Chronossus slice', () => {
  it('a blank roll keeps the tracker and does not stop', () => {
    const res = rollParadox(chronossusState({ era: 2, phase: 'paradox' }), 0);
    expect(res.state.chronossus!.paradoxes).toBe(0);
    expect(res.stop).toBe(false);
    expect(res.gainedAnomaly).toBe(false);
  });
  it('reaching 3 gains an Anomaly, removes a Warp tile, resets, and stops', () => {
    const s = chronossusState({ era: 3, phase: 'paradox' });
    s.chronossus!.paradoxes = 2;
    s.chronossus!.warpTilesOnTimeline = 2;
    const res = rollParadox(s, 2); // 2 + 2 = 4 → over 3
    expect(res.gainedAnomaly).toBe(true);
    expect(res.stop).toBe(true);
    expect(res.state.chronossus!.anomalies).toBe(1);
    expect(res.state.chronossus!.warpTilesOnTimeline).toBe(1);
    expect(res.state.chronossus!.paradoxes).toBe(1); // 4 - 3
  });
  it('endParadoxPhase advances to Power Up', () => {
    expect(endParadoxPhase(chronossusState({ era: 2, phase: 'paradox' })).phase).toBe('powerup');
  });
});
