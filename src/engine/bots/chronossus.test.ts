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
  canPlaceHypersyncTile,
  hypersyncPlan,
  resolveHypersyncAction,
  MAX_HYPERSYNC_TILES,
  scoreChronossus,
  applyDifficultySetup,
  researchShapeCandidates,
  DIFFICULTY_EXTRA_ENERGY,
  DIFFICULTY_EXTRA_POWERUP,
  DIFFICULTY_LEFTOVER_ENERGY_VP,
  DIFFICULTY_FAILED_ACTION_VP,
  DIFFICULTY_RESEARCH_NEW_SHAPE,
  DIFFICULTY_ALT_TIMELINES_3VP,
  EXTRA_MODULE_VARIABLE_ANOMALIES,
  resolveVariableAnomalyGain,
  DIFFICULTY_FRACTURES_EXTRA_FLUX,
  DIFFICULTY_FRACTURES_LEFTOVER_FLUX_VP,
  drawFlux,
  blinkReadyExosuits,
  shouldCheckBlink,
  selectBlinkExosuit,
  resolveCleanUp,
  assimilate,
  assimilateTakesOperator,
  isMainBoardPlacement,
  placesExosuitFor,
  DIFFICULTY_GUARDIANS_START_1,
  nextFigure,
  placeableFigures,
  spendFigure,
  isGuardianCapitalAction,
  canUseGuardianSpace,
  guardianWorkerToSpend,
  shouldAskGuardianAvailable,
  acquireGuardianAsksWorldCouncil,
  DIFFICULTY_GUARDIANS_POSTIMPACT_2VP,
  type EnergyDraw,
  type VariableAnomalyCandidate,
} from './chronossus';
import { drawEnergyPool } from '../index';
import {
  createInitialState,
  emptyChronossusState,
  ENERGY_POOL_START,
  type GameState,
  type EnergyPool,
} from '../state';
import type { GameConfig, Worker as EngineWorker } from '../types';
import type { ChronossusActionInput as ChronossusActionInputType } from './chronossus';
import type { ChronossusState } from '../state';

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

  it('Research states it took a new shape when D8 is active (not "the shape die shows")', () => {
    const s = withExosuits(4, { config: { ...CONFIG, difficulty: [DIFFICULTY_RESEARCH_NEW_SHAPE] } });
    const { state, instructions } = resolveAction(s, { actionId: 'research', shape: 'triangle' });
    expect(state.chronossus!.breakthroughs.triangle).toBe(1);
    const text = instructions.find((i) => i.id.startsWith('res-'))!.text;
    expect(text).toMatch(/doesn't already have/);
    expect(text).not.toMatch(/the shape die shows/);
  });

  it('Research still reads "the shape die shows" when D8 is off (regression)', () => {
    const { instructions } = resolveAction(withExosuits(4), { actionId: 'research', shape: 'triangle' });
    const text = instructions.find((i) => i.id.startsWith('res-'))!.text;
    expect(text).toMatch(/the shape die shows/);
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

  it('no-space Failed: +1 VP AND discards an active Exosuit (every placing action)', () => {
    // The no-space branch runs before the action switch, so it discards for ANY
    // Exosuit-placing action — Mine, Construct, Recruit, Research alike.
    for (const actionId of [
      'mine-resource',
      'construct-factory',
      'recruit',
      'research',
    ] as const) {
      const { state } = resolveAction(withExosuits(4), { actionId, noSpaceAvailable: true });
      expect(state.chronossus!.vp).toBe(1);
      expect(state.chronossus!.exosuitsAvailable).toBe(3); // discarded one, none placed
      expect(state.chronossus!.buildings.factory).toBe(0); // Construct not performed
    }
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

  it('B-side tiles apply their effects and flag Autoleap', () => {
    // C01B Score (Autoleap): +1 VP, autoleap.
    const c01b = resolveAction(withExosuits(4), { actionId: 'tile-reboot', tileSide: 'B' });
    expect(c01b.state.chronossus!.vp).toBe(1);
    expect(c01b.autoleap).toBe(true);
    // C02B Score and Energy Pack: +2 VP, +1 Energy Core, no autoleap.
    const c02b = resolveAction(withExosuits(4), { actionId: 'tile-score', tileSide: 'B' });
    expect(c02b.state.chronossus!.vp).toBe(2);
    expect(c02b.state.chronossus!.energyPool.energized).toBe(6);
    expect(c02b.autoleap).toBeFalsy();
    // C03B Energy Pack (Autoleap): +1 Energy Core, autoleap.
    const c03b = resolveAction(withExosuits(4), { actionId: 'tile-energy-pack', tileSide: 'B' });
    expect(c03b.state.chronossus!.energyPool.energized).toBe(6);
    expect(c03b.autoleap).toBe(true);
  });

  it('A-side tiles never autoleap', () => {
    const a = resolveAction(withExosuits(4), { actionId: 'tile-score' });
    expect(a.autoleap).toBeFalsy();
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

describe('Hypersync mode', () => {
  function hsState(era: number, exosuits: number, tiles: number[] = []): GameState {
    const s = chronossusState({ era, phase: 'actions' });
    s.config.chronossusMode = 'hypersync';
    s.chronossus!.exosuitsAvailable = exosuits;
    s.chronossus!.hypersyncTiles = tiles;
    return s;
  }

  it('canPlaceHypersyncTile: one per Era, max 3 total', () => {
    const bot = emptyChronossusState();
    expect(canPlaceHypersyncTile(bot, 3)).toBe(true);
    bot.hypersyncTiles = [3];
    expect(canPlaceHypersyncTile(bot, 3)).toBe(false); // already one this Era
    expect(canPlaceHypersyncTile(bot, 4)).toBe(true);
    bot.hypersyncTiles = [1, 2, 3];
    expect(canPlaceHypersyncTile(bot, 4)).toBe(false); // at the cap
    expect(bot.hypersyncTiles.length).toBe(MAX_HYPERSYNC_TILES);
  });

  it('no-space Capital Action fallback places a tile and performs normally (no Exosuit, no VP penalty)', () => {
    const s = hsState(3, 4);
    const { state } = resolveAction(s, {
      actionId: 'construct-factory',
      placeHypersyncTile: true,
      buildingVP: 5,
    });
    const bot = state.chronossus!;
    expect(bot.hypersyncTiles).toEqual([3]); // tile placed on this Era
    expect(bot.exosuitsAvailable).toBe(4); // NO Exosuit spent
    expect(bot.buildings.factory).toBe(1); // action performed normally
    expect(bot.vp).toBe(5); // building VP, no Failed +1 VP
  });

  it('no-tile Failed (no space + Hypersync tile unavailable) discards an active Exosuit', () => {
    const s = hsState(4, 3, [4]); // already a tile this Era → cannot place another
    const { state } = resolveAction(s, { actionId: 'construct-factory', hypersyncNoTile: true });
    const bot = state.chronossus!;
    expect(bot.vp).toBe(1); // Failed Action +1 VP
    expect(bot.exosuitsAvailable).toBe(2); // discarded one (3 → 2), base rule applies
    expect(bot.buildings.factory).toBe(0); // action not performed
  });

  it('hypersyncPlan: needs a prior-Era tile AND an Exosuit', () => {
    expect(hypersyncPlan(hsState(4, 1, [2]).chronossus!, 4).canHypersync).toBe(true);
    expect(hypersyncPlan(hsState(4, 0, [2]).chronossus!, 4).canHypersync).toBe(false); // no Exosuit
    expect(hypersyncPlan(hsState(4, 1, []).chronossus!, 4).canHypersync).toBe(false); // no tile
    expect(hypersyncPlan(hsState(4, 1, [3, 1, 2]).chronossus!, 4).oldestTileEra).toBe(1);
  });

  it('hypersyncPlan: a tile in the CURRENT Era is not retrievable', () => {
    // Only a current-Era (4) tile → the Hypersync branch stays closed.
    const plan = hypersyncPlan(hsState(4, 2, [4]).chronossus!, 4);
    expect(plan.canHypersync).toBe(false);
    expect(plan.pendingCount).toBe(0);
    // A prior tile (2) is counted; the current-Era one (4) is not.
    const mixed = hypersyncPlan(hsState(4, 2, [2, 4]).chronossus!, 4);
    expect(mixed.canHypersync).toBe(true);
    expect(mixed.pendingCount).toBe(1);
    expect(mixed.oldestTileEra).toBe(2);
  });

  it('Hypersync Action retrieves the oldest tile, scores 2 VP + bonus, spends an Exosuit', () => {
    const s = hsState(5, 2, [1, 3]);
    const { state, autoleap } = resolveHypersyncAction(s, {
      code: 'C12A',
      outcome: 'hypersync',
      hex: 2,
    });
    const bot = state.chronossus!;
    expect(bot.hypersyncTiles).toEqual([3]); // Era 1 (oldest) retrieved
    expect(bot.exosuitsAvailable).toBe(1); // one Exosuit sent
    expect(bot.vp).toBe(2); // 2 VP (C12A energy bonus is a core, not VP)
    expect(bot.energyPool.energized).toBe(6); // +1 Energy Core bonus
    expect(autoleap).toBeFalsy(); // C12A does not autoleap
  });

  it('C13B scores +1 VP instead of an Energy Core; C12B autoleaps', () => {
    const c13b = resolveHypersyncAction(hsState(5, 2, [1]), {
      code: 'C13B',
      outcome: 'hypersync',
      hex: 1,
    }).state.chronossus!;
    expect(c13b.vp).toBe(3); // 2 + 1 VP bonus
    expect(c13b.energyPool.energized).toBe(5); // no Energy Core
    expect(resolveHypersyncAction(hsState(5, 2, [1]), { code: 'C12B', outcome: 'hypersync', hex: 1 }).autoleap).toBe(true);
  });

  it('Time Travel fallback: no bonus applied on the failed (no-warp) branch', () => {
    const s = hsState(5, 2, []); // no pending tiles → TT branch
    s.chronossus!.warpTilesOnTimeline = 0; // TT itself fails
    const { state } = resolveHypersyncAction(s, { code: 'C12A', outcome: 'time-travel' });
    expect(state.chronossus!.vp).toBe(1); // TT-failed +1 VP, no energy bonus
    expect(state.chronossus!.energyPool.energized).toBe(5);
  });

  it('Failed outcome: +1 VP, no bonus', () => {
    const { state } = resolveHypersyncAction(hsState(5, 0, []), { code: 'C13A', outcome: 'failed' });
    expect(state.chronossus!.vp).toBe(1);
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

  it('Alternate Timelines: positiveSpaces scores 2 VP each by default', () => {
    const s = chronossusState({ era: 3, phase: 'warp' });
    const next = resolveWarp(s, 2, 3);
    expect(next.chronossus!.vp).toBe(6); // 3 positive spaces × 2 VP
    expect(next.chronossus!.warpTilesOnTimeline).toBe(2);
  });

  it('Alternate Timelines: scores 3 VP each with its own difficulty option', () => {
    const s = chronossusState({
      era: 3,
      phase: 'warp',
      config: { ...CONFIG, difficulty: [DIFFICULTY_ALT_TIMELINES_3VP] },
    });
    const next = resolveWarp(s, 2, 3);
    expect(next.chronossus!.vp).toBe(9); // 3 positive spaces × 3 VP
  });

  it('ignores positiveSpaces when omitted (regression, no VP change)', () => {
    const next = resolveWarp(chronossusState({ era: 3, phase: 'warp' }), 2);
    expect(next.chronossus!.vp).toBe(0);
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

describe('scoreChronossus breakout', () => {
  it('separates Superproject VP from Building VP (and tokenVP excludes both)', () => {
    const bot = emptyChronossusState();
    // 4 building VP + 8 superproject VP + 3 token VP = 15 during-game VP.
    bot.buildingVps.factory.push(4);
    bot.superprojectVps.push(8);
    bot.buildingVp = 12; // buildings (4) + superprojects (8), as the engine tracks it
    bot.vp = 15; // includes 3 token VP
    const score = scoreChronossus(bot);
    expect(score.superprojectVP).toBe(8);
    expect(score.buildingVP).toBe(4);
    expect(score.tokenVP).toBe(3);
    // The three during-game lines still reconstruct bot.vp.
    expect(score.buildingVP + score.superprojectVP + score.tokenVP).toBe(bot.vp);
  });

  it('D5: leftover energized cores score VP only when the difficulty flag is set', () => {
    const bot = emptyChronossusState();
    bot.energyPool = { energized: 3, exhausted: 2 };
    const off = scoreChronossus(bot);
    expect(off.leftoverEnergyVP).toBe(0);
    expect(off.total).toBe(0);

    const on = scoreChronossus(bot, [DIFFICULTY_LEFTOVER_ENERGY_VP]);
    expect(on.leftoverEnergyVP).toBe(3); // energized only — exhausted cores don't count
    expect(on.total).toBe(3);
  });
});

describe('applyDifficultySetup — D3 "Extra starting Energy Cores"', () => {
  it('adds the chosen value to energized cores, leaving exhausted untouched', () => {
    const bot = emptyChronossusState();
    const config = { ...CONFIG, difficulty: [DIFFICULTY_EXTRA_ENERGY], difficultyValues: { [DIFFICULTY_EXTRA_ENERGY]: 2 } };
    const next = applyDifficultySetup(bot, config);
    expect(next.energyPool).toEqual({ energized: 7, exhausted: 5 });
  });

  it('is a no-op when the flag is absent', () => {
    const bot = emptyChronossusState();
    const next = applyDifficultySetup(bot, CONFIG);
    expect(next.energyPool).toEqual({ energized: 5, exhausted: 5 });
  });

  it('is a no-op when the flag is set but no value was chosen', () => {
    const bot = emptyChronossusState();
    const config = { ...CONFIG, difficulty: [DIFFICULTY_EXTRA_ENERGY] };
    const next = applyDifficultySetup(bot, config);
    expect(next.energyPool).toEqual({ energized: 5, exhausted: 5 });
  });
});

describe('applyDifficultySetup — Guardians of the Council seeding', () => {
  const guardiansConfig = { ...CONFIG, chronossusMode: 'guardians' };

  it('seeds an empty Guardian counter for a Guardians game', () => {
    const next = applyDifficultySetup(emptyChronossusState(), guardiansConfig);
    expect(next.guardians).toEqual({ owned: 0, powered: 0 });
  });

  it('starts the bot with 1 Guardian under that difficulty option', () => {
    const config = {
      ...guardiansConfig,
      difficulty: [DIFFICULTY_GUARDIANS_START_1],
    };
    expect(applyDifficultySetup(emptyChronossusState(), config).guardians).toEqual({
      owned: 1,
      powered: 0,
    });
  });

  it('seeds the counter in the Hypersync combo too', () => {
    const config = { ...CONFIG, chronossusMode: 'guardians+hypersync' };
    expect(applyDifficultySetup(emptyChronossusState(), config).guardians).toEqual({
      owned: 0,
      powered: 0,
    });
  });

  it('leaves guardians undefined in every other mode', () => {
    expect(applyDifficultySetup(emptyChronossusState(), CONFIG).guardians).toBeUndefined();
    const fractures = { ...CONFIG, chronossusMode: 'fractures' };
    expect(applyDifficultySetup(emptyChronossusState(), fractures).guardians).toBeUndefined();
  });

  it('ignores the start-with-1 option outside a Guardians game', () => {
    const config = { ...CONFIG, difficulty: [DIFFICULTY_GUARDIANS_START_1] };
    expect(applyDifficultySetup(emptyChronossusState(), config).guardians).toBeUndefined();
  });
});

describe('resolvePowerUp — D4 "One extra powered Exosuit each Era"', () => {
  function stateWith(impact: boolean, difficulty: string[] = []): GameState {
    return chronossusState({ impact, config: { ...CONFIG, difficulty } });
  }

  it('adds a free Exosuit when there is room under exosuitsTotal', () => {
    const next = resolvePowerUp(stateWith(false, [DIFFICULTY_EXTRA_POWERUP]), { energized: 1, exhausted: 0 });
    // capped = 3 base + 1 energized = 4; +1 free = 5; exosuitsTotal 6 has room.
    expect(next.chronossus!.exosuitsAvailable).toBe(5);
    expect(next.chronossus!.vp).toBe(0); // no excess, no VP conversion
  });

  it('converts the excess to +2 VP when the free Exosuit would exceed exosuitsTotal', () => {
    // Max draw (3 energized) pre-Impact already caps at exosuitsTotal (6); the +1
    // free Exosuit has nowhere to go, so it converts to VP instead.
    const next = resolvePowerUp(stateWith(false, [DIFFICULTY_EXTRA_POWERUP]), { energized: 3, exhausted: 0 });
    expect(next.chronossus!.exosuitsAvailable).toBe(6); // clamped at exosuitsTotal
    expect(next.chronossus!.vp).toBe(2); // 1 excess × 2 VP
  });

  it('rarely exceeds exosuitsTotal post-Impact (lower cap leaves headroom)', () => {
    const next = resolvePowerUp(stateWith(true, [DIFFICULTY_EXTRA_POWERUP]), { energized: 3, exhausted: 0 });
    // capped = 2 base + 3 energized→cap 4; +1 free = 5 ≤ exosuitsTotal 6.
    expect(next.chronossus!.exosuitsAvailable).toBe(5);
    expect(next.chronossus!.vp).toBe(0);
  });

  it('does nothing extra when the difficulty flag is off', () => {
    const next = resolvePowerUp(stateWith(false, []), { energized: 3, exhausted: 0 });
    expect(next.chronossus!.exosuitsAvailable).toBe(6);
    expect(next.chronossus!.vp).toBe(0);
  });
});

describe('D7 — "Failed Actions score VP" replaces +1 with +2', () => {
  function withExosuits(n: number, difficulty: string[] = []): GameState {
    const s = chronossusState({ phase: 'actions', config: { ...CONFIG, difficulty } });
    s.chronossus!.exosuitsAvailable = n;
    return s;
  }

  it('no-space Failed Action scores +2 instead of +1', () => {
    const { state } = resolveAction(withExosuits(4, [DIFFICULTY_FAILED_ACTION_VP]), {
      actionId: 'recruit',
      noSpaceAvailable: true,
    });
    expect(state.chronossus!.vp).toBe(2);
  });

  it('failCantPerform Failed Action (Construct at max) scores +2 instead of +1', () => {
    const s = withExosuits(4, [DIFFICULTY_FAILED_ACTION_VP]);
    s.chronossus!.buildings.factory = 3;
    const { state } = resolveAction(s, { actionId: 'construct-factory' });
    expect(state.chronossus!.vp).toBe(2);
  });

  it('Time Travel with no Warp tiles Fails for +2 instead of +1', () => {
    const { state } = resolveAction(withExosuits(4, [DIFFICULTY_FAILED_ACTION_VP]), {
      actionId: 'time-travel',
    });
    expect(state.chronossus!.vp).toBe(2);
  });

  it('Hypersync "neither possible" Failed Action scores +2 instead of +1', () => {
    const s = withExosuits(0, [DIFFICULTY_FAILED_ACTION_VP]); // no Exosuit → can't Hypersync
    const { state } = resolveHypersyncAction(s, { code: 'C12A', outcome: 'failed' });
    expect(state.chronossus!.vp).toBe(2);
  });

  it('stays at +1 when the difficulty flag is off (regression)', () => {
    const { state } = resolveAction(withExosuits(4), { actionId: 'recruit', noSpaceAvailable: true });
    expect(state.chronossus!.vp).toBe(1);
  });
});

describe('researchShapeCandidates — D8 "Research takes a new Breakthrough shape"', () => {
  it('all three shapes are candidates when the bot has none of any', () => {
    const bot = emptyChronossusState();
    expect(researchShapeCandidates(bot).sort()).toEqual(['circle', 'square', 'triangle']);
  });

  it('two shapes tied at 0 are candidates once the bot has one of the third', () => {
    const bot = emptyChronossusState();
    bot.breakthroughs.circle = 1;
    expect(researchShapeCandidates(bot).sort()).toEqual(['square', 'triangle']);
  });

  it('a single shape at the strict minimum is the only candidate', () => {
    const bot = emptyChronossusState();
    bot.breakthroughs.circle = 1;
    bot.breakthroughs.triangle = 1;
    expect(researchShapeCandidates(bot)).toEqual(['square']);
  });

  it('the rule generalizes past the first complete set (ties at a higher count)', () => {
    const bot = emptyChronossusState();
    bot.breakthroughs.circle = 2;
    bot.breakthroughs.triangle = 1;
    bot.breakthroughs.square = 1;
    expect(researchShapeCandidates(bot).sort()).toEqual(['square', 'triangle']);
  });
});

describe('applyDifficultySetup — Variable Anomalies seeding', () => {
  it('seeds anomalyVps: [] when the module is selected', () => {
    const bot = emptyChronossusState();
    const config = { ...CONFIG, extraModules: [EXTRA_MODULE_VARIABLE_ANOMALIES] };
    const next = applyDifficultySetup(bot, config);
    expect(next.anomalyVps).toEqual([]);
  });

  it('leaves anomalyVps undefined when the module is off', () => {
    const bot = emptyChronossusState();
    const next = applyDifficultySetup(bot, CONFIG);
    expect(next.anomalyVps).toBeUndefined();
  });
});

describe('Fractures — Flux Pool draws', () => {
  const pool = { cores: 2, casings: 3, setAside: 0 };

  it('draws a Flux Core from the front of the pool and discards it', () => {
    const { drawn, pool: next } = drawFlux(pool, 0);
    expect(drawn).toBe('core');
    expect(next).toEqual({ cores: 1, casings: 3, setAside: 0 });
  });

  it('draws an Empty Flux Casing and sets it aside', () => {
    const { drawn, pool: next } = drawFlux(pool, 0.9);
    expect(drawn).toBe('casing');
    expect(next).toEqual({ cores: 2, casings: 2, setAside: 1 });
  });

  it('splits the odds by the pool contents', () => {
    // 2 cores of 5 tokens: rolls below 0.4 are cores, at/above are casings.
    expect(drawFlux(pool, 0.39).drawn).toBe('core');
    expect(drawFlux(pool, 0.4).drawn).toBe('casing');
  });

  it('throws on an empty pool (the caller checks first)', () => {
    expect(() => drawFlux({ cores: 0, casings: 0, setAside: 3 }, 0)).toThrow();
  });
});

describe('Fractures — Blink readiness and selection', () => {
  const placed = (...entries: [string, 'action' | 'world-council', boolean][]) =>
    entries.map(([action, space, hasCore]) => ({ action, space, hasCore }));
  const withPlaced = (entries: ReturnType<typeof placed>): ChronossusState => ({
    ...emptyChronossusState(),
    fluxPool: { cores: 1, casings: 3, setAside: 0 },
    placedExosuits: entries,
  });

  it('excludes Exosuits without a core and any on the attempted Action', () => {
    const bot = withPlaced(
      placed(['recruit', 'action', true], ['research', 'action', false], ['mine-resource', 'action', true]),
    );
    expect(blinkReadyExosuits(bot, 'mine-resource').map((e) => e.action)).toEqual(['recruit']);
  });

  it('only checks for a Blink with both a ready Exosuit and a token in the pool', () => {
    const bot = withPlaced(placed(['recruit', 'action', true]));
    expect(shouldCheckBlink(bot, 'research')).toBe(true);
    expect(shouldCheckBlink(bot, 'recruit')).toBe(false); // same Action
    expect(shouldCheckBlink({ ...bot, fluxPool: { cores: 0, casings: 0, setAside: 4 } }, 'research')).toBe(
      false,
    );
    // No Flux Cores left: a draw could only produce Casings, which change nothing this
    // Era and all come back in Clean Up — so the check is skipped entirely.
    expect(shouldCheckBlink({ ...bot, fluxPool: { cores: 0, casings: 3, setAside: 0 } }, 'research')).toBe(
      false,
    );
    expect(shouldCheckBlink(emptyChronossusState(), 'research')).toBe(false); // not a Fractures game
  });

  it('Mine and Recruit-Genius are Blink destinations like any other Capital space', () => {
    // Both ask their own placement question in the UI rather than the shared gate, so the
    // check has to be wired in there too — these are the states that must trigger it.
    const bot = withPlaced(placed(['construct-lab', 'action', true]));
    expect(shouldCheckBlink(bot, 'mine-resource')).toBe(true);
    expect(shouldCheckBlink(bot, 'recruit-genius-research')).toBe(true);
    // …and a Genius recruit lands on the Recruit space, so an Exosuit already there is out.
    const onRecruit = withPlaced(placed(['recruit', 'action', true]));
    expect(shouldCheckBlink(onRecruit, 'recruit-genius-research')).toBe(false);
  });

  it('rule A: takes an Exosuit matching a Command token, smaller number winning', () => {
    const bot = withPlaced(placed(['recruit', 'action', true], ['construct-lab', 'action', true]));
    const sel = selectBlinkExosuit(bot, 'research', { 4: 'recruit', 2: 'construct-lab' });
    expect(sel).toMatchObject({ rule: 'command-token', token: 2, space: 'construct' });
    expect(sel!.exosuit.action).toBe('construct-lab');
  });

  it('rule A matches on the Capital Action space, not the Construct type', () => {
    // The token sits on Construct — Superproject; the Exosuit is on Construct — Factory.
    // Both are the board's single Construct space, so they match.
    const bot = withPlaced(placed(['construct-factory', 'action', true]));
    const sel = selectBlinkExosuit(bot, 'research', { 3: 'construct-superproject' });
    expect(sel).toMatchObject({ rule: 'command-token', token: 3, space: 'construct' });
  });

  it('treats every Construct type as one space for the "take the bottom one" count', () => {
    const bot = withPlaced(
      placed(['construct-lab', 'action', true], ['construct-powerplant', 'action', true]),
    );
    const sel = selectBlinkExosuit(bot, 'research', {});
    expect(sel).toMatchObject({ space: 'construct', sameSpaceCount: 2 });
  });

  it('treats Recruit and Recruit Genius / Research as one space', () => {
    const bot = withPlaced(
      placed(['recruit', 'action', true], ['recruit-genius-research', 'action', true]),
    );
    const sel = selectBlinkExosuit(bot, 'research', {});
    expect(sel).toMatchObject({ space: 'recruit', sameSpaceCount: 2 });
  });

  it('skips Exosuits already on the attempted Action\u2019s space (any Construct type)', () => {
    const bot = withPlaced(placed(['construct-lab', 'action', true]));
    expect(blinkReadyExosuits(bot, 'construct-superproject')).toEqual([]);
  });

  it('rule B: bottom-left-most when nothing matches a token', () => {
    const bot = withPlaced(placed(['recruit', 'action', true], ['research', 'action', true]));
    const sel = selectBlinkExosuit(bot, 'mine-resource', {});
    expect(sel).toMatchObject({ rule: 'bottom-left' });
    expect(sel!.exosuit.action).toBe('research'); // first in the order
  });

  it('never picks a World Council Exosuit under rule A, and sorts it last under B', () => {
    const bot = withPlaced(placed(['recruit', 'world-council', true], ['construct-factory', 'action', true]));
    // Even though a token sits on Recruit, that Exosuit is on World Council: rule A skips it.
    const sel = selectBlinkExosuit(bot, 'research', { 2: 'recruit' });
    expect(sel).toMatchObject({ rule: 'bottom-left' });
    expect(sel!.exosuit.action).toBe('construct-factory');
  });

  it('falls back to the World Council Exosuit when it is the only one ready', () => {
    const bot = withPlaced(placed(['recruit', 'world-council', true]));
    const sel = selectBlinkExosuit(bot, 'research', { 2: 'recruit' });
    expect(sel!.exosuit.space).toBe('world-council');
  });

  it('reports how many Exosuits share the chosen space (player takes the bottom one)', () => {
    const bot = withPlaced(placed(['research', 'action', true], ['research', 'action', true]));
    const sel = selectBlinkExosuit(bot, 'recruit', {});
    expect(sel!.sameSpaceCount).toBe(2);
  });


  it('orders Research \u2192 Recruit \u2192 Construct \u2192 Mine \u2192 World Council (rule B)', () => {
    const bot = withPlaced(
      placed(
        ['mine-resource', 'action', true],
        ['construct-lab', 'action', true],
        ['recruit', 'action', true],
        ['research', 'action', true],
      ),
    );
    const pickThenDrop = (state: ChronossusState, picked: string[]): string[] => {
      const sel = selectBlinkExosuit(state, 'time-travel', {});
      if (!sel) return picked;
      return pickThenDrop(
        { ...state, placedExosuits: state.placedExosuits!.filter((e) => e !== sel.exosuit) },
        [...picked, sel.exosuit.action],
      );
    };
    expect(pickThenDrop(bot, [])).toEqual(['research', 'recruit', 'construct-lab', 'mine-resource']);
    // …and World Council really is last, above Mine.
    const withCouncil = withPlaced(
      placed(['recruit', 'world-council', true], ['mine-resource', 'action', true]),
    );
    expect(selectBlinkExosuit(withCouncil, 'research', {})!.space).toBe('mine');
  });

  it('ranks the Recruit Genius / Research space with Recruit', () => {
    const bot = withPlaced(placed(['construct-lab', 'action', true], ['recruit-genius-research', 'action', true]));
    expect(selectBlinkExosuit(bot, 'research', {})!.exosuit.action).toBe('recruit-genius-research');
  });

  it('ignores Exosuits on Actions that are not valid Blink-from positions', () => {
    // Time Travel / Remove Anomaly / Reboot place no Exosuit on the Main board at all.
    const bot = withPlaced(placed(['time-travel', 'action', true]));
    expect(blinkReadyExosuits(bot, 'research')).toEqual([]);
    expect(selectBlinkExosuit(bot, 'research', {})).toBeNull();
  });

  it('returns null when nothing can Blink', () => {
    expect(selectBlinkExosuit(emptyChronossusState(), 'research', {})).toBeNull();
  });
});

describe('Fractures — Assimilate (C04/C14)', () => {
  const fracturesBot = (over: Partial<ChronossusState> = {}): ChronossusState => ({
    ...emptyChronossusState(),
    fluxPool: { cores: 0, casings: 3, setAside: 0 },
    technologies: 0,
    operators: 0,
    ...over,
  });

  it('Circle: recruits an Operator and gains a Flux Core', () => {
    const bot = fracturesBot();
    assimilate(bot, 'circle');
    expect(bot.operators).toBe(1);
    expect(bot.technologies).toBe(0);
    expect(bot.fluxPool!.cores).toBe(1);
  });

  it('Triangle: takes a Technology and no Flux Core', () => {
    const bot = fracturesBot();
    assimilate(bot, 'triangle');
    expect(bot.technologies).toBe(1);
    expect(bot.operators).toBe(0);
    expect(bot.fluxPool!.cores).toBe(0);
  });

  it('Square: takes whichever it has fewer of', () => {
    const fewerTech = fracturesBot({ operators: 2, technologies: 1 });
    assimilate(fewerTech, 'square');
    expect(fewerTech.technologies).toBe(2);

    const fewerOps = fracturesBot({ operators: 1, technologies: 3 });
    assimilate(fewerOps, 'square');
    expect(fewerOps.operators).toBe(2);
  });

  it('Square: Operator on a tie', () => {
    const bot = fracturesBot({ operators: 2, technologies: 2 });
    assimilate(bot, 'square');
    expect(bot.operators).toBe(3);
    expect(bot.technologies).toBe(2);
  });

  it('places the Operator in the topmost empty Worker space, as a wildcard', () => {
    const bot = fracturesBot();
    // Genius is the topmost space; fill it and the next one goes to administrator.
    assimilate(bot, 'circle');
    expect(bot.workers.genius).toBe(1);
    expect(bot.operatorSlots).toEqual({ genius: 1 });
    assimilate(bot, 'circle');
    expect(bot.workers.administrator).toBe(1);
    expect(bot.operators).toBe(2);
  });

  it('Operators count towards the +5 VP Worker set, and are discarded with it', () => {
    const bot = fracturesBot({
      workers: { genius: 0, administrator: 1, engineer: 1, scientist: 1 },
    });
    const before = bot.vp;
    const res = assimilate(bot, 'circle');
    expect(res.vp).toBe(5);
    expect(bot.vp).toBe(before + 5);
    // The set discarded one of each — including the Operator that completed it.
    expect(bot.workers).toEqual({ genius: 0, administrator: 0, engineer: 0, scientist: 0 });
    expect(bot.operators).toBe(0);
    expect(bot.operatorSlots).toEqual({ genius: 0 });
  });

  it('discards the Operator when its column also holds a plain Worker', () => {
    // The Genius column holds a plain Genius *and* an Operator.
    const bot = fracturesBot({
      workers: { genius: 2, administrator: 1, engineer: 1, scientist: 0 },
      operators: 1,
      operatorSlots: { genius: 1 },
    });
    assimilate(bot, 'circle'); // fills scientist (the topmost empty), completing the set
    // Operators are always the discard: the Genius one goes back to the Valley supply and
    // the plain Genius stays, as does the new scientist Operator that completed the set.
    expect(bot.workers.genius).toBe(1);
    expect(bot.operators).toBe(0);
    expect(bot.operatorSlots).toEqual({ genius: 0, scientist: 0 });
  });

  it('no Operators left: Failed Action for 1 VP, no Operator and no Flux Core', () => {
    const bot = fracturesBot();
    const before = bot.vp;
    const res = assimilate(bot, 'circle', false);
    expect(res.vp).toBe(1);
    expect(bot.vp).toBe(before + 1);
    expect(bot.operators).toBe(0);
    expect(bot.fluxPool!.cores).toBe(0);
    expect(bot.workers.genius).toBe(0);
  });

  it('assimilateTakesOperator predicts the branch the gate needs', () => {
    const bot = fracturesBot({ operators: 2, technologies: 1 });
    expect(assimilateTakesOperator(bot, 'circle')).toBe(true);
    expect(assimilateTakesOperator(bot, 'triangle')).toBe(false);
    expect(assimilateTakesOperator(bot, 'square')).toBe(false); // fewer Technologies
    expect(assimilateTakesOperator(fracturesBot({ operators: 1, technologies: 1 }), 'square')).toBe(
      true, // Operator on a tie
    );
  });

  it('the Failed Action resolves through the tile action too', () => {
    const state = chronossusState({
      config: { ...CONFIG, chronossusMode: 'fractures' },
    });
    state.chronossus = { ...state.chronossus!, ...fracturesBot() };
    const { state: next } = resolveAction(state, {
      actionId: 'tile-assimilate',
      shape: 'circle',
      operatorsAvailable: false,
    });
    expect(next.chronossus!.vp).toBe(state.chronossus!.vp + 1);
    expect(next.chronossus!.operators).toBe(0);
  });

  it('resolves through the tile action, with the B side also scoring 1 VP', () => {
    const state = chronossusState({
      config: { ...CONFIG, chronossusMode: 'fractures', tileSides: { C04: 'B' } },
    });
    state.chronossus = { ...state.chronossus!, ...fracturesBot() };
    const { state: next } = resolveAction(state, {
      actionId: 'tile-assimilate',
      tileSide: 'B',
      shape: 'triangle',
    });
    expect(next.chronossus!.technologies).toBe(1);
    expect(next.chronossus!.vp).toBe(state.chronossus!.vp + 1);
  });
});

describe('Fractures — Valley board Actions take an Exosuit', () => {
  const fracturesState = (exosuits = 3) => {
    const st = chronossusState({ config: { ...CONFIG, chronossusMode: 'fractures' } });
    st.chronossus = {
      ...st.chronossus!,
      exosuitsAvailable: exosuits,
      fluxPool: { cores: 1, casings: 3, setAside: 0 },
      technologies: 0,
      operators: 0,
      placedExosuits: [],
    };
    return st;
  };

  it('Assimilate and Extract spend an Exosuit; the Chronossus-board tiles do not', () => {
    for (const id of ['tile-assimilate', 'tile-extract'] as const) {
      const { state: next } = resolveAction(fracturesState(), { actionId: id, shape: 'circle' });
      expect(next.chronossus!.exosuitsAvailable).toBe(2);
    }
    const pack = resolveAction(fracturesState(), { actionId: 'tile-power-pack' }).state;
    expect(pack.chronossus!.exosuitsAvailable).toBe(3);
  });

  it('does not record them as Blink-from positions (they are not on the Main board)', () => {
    const { state: next } = resolveAction(fracturesState(), {
      actionId: 'tile-extract',
      placementSpace: 'action',
    });
    expect(next.chronossus!.placedExosuits).toEqual([]);
    expect(blinkReadyExosuits(next.chronossus!, 'recruit')).toEqual([]);
  });

  it('passes rather than take one when out of Exosuits', () => {
    const bot = fracturesState(0).chronossus!;
    expect(wouldPassOn(bot, 'tile-assimilate')).toBe(true);
    expect(wouldPassOn(bot, 'tile-extract')).toBe(true);
    // The Chronossus-board tiles still resolve with no Exosuits left.
    expect(wouldPassOn(bot, 'tile-power-pack')).toBe(false);
    expect(wouldPassOn(bot, 'tile-reboot')).toBe(false);
  });

  it('names the Valley Capital space when no Valley Action space was free', () => {
    const { instructions } = resolveAction(fracturesState(), {
      actionId: 'tile-extract',
      placementSpace: 'world-council',
    });
    expect(instructions.some((i) => /Valley Capital Action space/.test(i.text))).toBe(true);
  });

  it('can be Blinked INTO: the moved Exosuit leaves the Main board, none is spent', () => {
    const st = fracturesState();
    st.chronossus!.placedExosuits = [
      { action: 'research', space: 'action', hasCore: true },
      { action: 'recruit', space: 'action', hasCore: true },
    ];
    const { state: next, instructions } = resolveAction(st, {
      actionId: 'tile-extract',
      placementSpace: 'action',
      blink: true,
      tokenActions: {},
    });
    // Research is bottom-left-most, so that one moves onto the Valley board and is no
    // longer a Blink-from candidate; Recruit stays.
    expect(next.chronossus!.placedExosuits).toEqual([
      { action: 'recruit', space: 'action', hasCore: true },
    ]);
    expect(next.chronossus!.exosuitsAvailable).toBe(3); // unchanged — no new Exosuit
    expect(instructions.some((i) => /Blink: move that Exosuit/.test(i.text))).toBe(true);
  });

  it('every Main-board Exosuit is Blink-ready for a Valley Action (none is on it)', () => {
    const bot = fracturesState().chronossus!;
    bot.placedExosuits = [{ action: 'research', space: 'action', hasCore: true }];
    expect(blinkReadyExosuits(bot, 'tile-assimilate').map((e) => e.action)).toEqual(['research']);
  });

  it('classifies Main-board vs other-board placements for every module', () => {
    // Main board: these can Blink later.
    for (const id of ['recruit', 'research', 'mine-resource', 'construct-lab'] as const) {
      expect(isMainBoardPlacement(id)).toBe(true);
    }
    // Fractures' Valley board: placements, but never Blink sources.
    for (const id of ['tile-assimilate', 'tile-extract'] as const) {
      expect(placesExosuitFor(id)).toBe(true);
      expect(isMainBoardPlacement(id)).toBe(false);
    }
    // Chronossus-board tiles place nothing at all.
    for (const id of ['tile-power-pack', 'tile-reboot', 'tile-score'] as const) {
      expect(placesExosuitFor(id)).toBe(false);
      expect(isMainBoardPlacement(id)).toBe(false);
    }
  });

  it('Hypersync hex placements are likewise never recorded (their own board)', () => {
    const st = fracturesState();
    st.chronossus!.hypersyncTiles = [1];
    st.chronossus!.placedExosuits = [{ action: 'research', space: 'action', hasCore: true }];
    const { state: next } = resolveHypersyncAction(st, { code: 'C12A', outcome: 'hypersync', hex: 2 });
    expect(next.chronossus!.placedExosuits).toEqual([
      { action: 'research', space: 'action', hasCore: true },
    ]);
    expect(next.chronossus!.exosuitsAvailable).toBe(2); // one sent to the Hypersync board
  });

  it('a Hypersync hex can be Blinked onto in the combo (moved Exosuit leaves the list)', () => {
    const st = fracturesState();
    st.chronossus!.hypersyncTiles = [1];
    st.chronossus!.placedExosuits = [{ action: 'research', space: 'action', hasCore: true }];
    const { state: next } = resolveHypersyncAction(st, {
      code: 'C12A',
      outcome: 'hypersync',
      hex: 2,
      blink: true,
      tokenActions: {},
    });
    expect(next.chronossus!.exosuitsAvailable).toBe(3); // no new Exosuit spent
    expect(next.chronossus!.placedExosuits).toEqual([]); // it is on the Hypersync board now
  });

  it('still resolves the tile effect alongside the placement', () => {
    const { state: next } = resolveAction(fracturesState(), { actionId: 'tile-extract' });
    expect(next.chronossus!.fluxPool!.cores).toBe(3); // 1 + 2
  });
});

describe('Fractures — the module tiles and their B sides', () => {
  const fracturesState = () => {
    const st = chronossusState({ config: { ...CONFIG, chronossusMode: 'fractures' } });
    st.chronossus = {
      ...st.chronossus!,
      exosuitsAvailable: 4,
      fluxPool: { cores: 0, casings: 3, setAside: 0 },
      technologies: 0,
      operators: 0,
      placedExosuits: [],
    };
    return st;
  };

  it('C05 Extract: 2 Flux Cores + 2 Energy Cores (B side: 4 Flux)', () => {
    const a = resolveAction(fracturesState(), { actionId: 'tile-extract' }).state.chronossus!;
    expect(a.fluxPool!.cores).toBe(2);
    expect(a.energyPool.energized).toBe(fracturesState().chronossus!.energyPool.energized + 2);

    const bSide = resolveAction(fracturesState(), { actionId: 'tile-extract', tileSide: 'B' })
      .state.chronossus!;
    expect(bSide.fluxPool!.cores).toBe(4);
  });

  it('C06 Power Pack: 1 Energy + 1 Flux, and the B side Autoleaps', () => {
    const a = resolveAction(fracturesState(), { actionId: 'tile-power-pack' });
    expect(a.state.chronossus!.fluxPool!.cores).toBe(1);
    expect(a.autoleap).toBeFalsy();

    const b = resolveAction(fracturesState(), { actionId: 'tile-power-pack', tileSide: 'B' });
    expect(b.state.chronossus!.fluxPool!.cores).toBe(1);
    expect(b.autoleap).toBe(true);
  });

  it('C14 resolves its own effect through the shared Assimilate action', () => {
    const st = fracturesState();
    const { state: next } = resolveAction(st, {
      actionId: 'tile-assimilate',
      tileFamily: 'C14',
      shape: 'triangle',
    });
    // C14A = Assimilate plus 1 extra Flux Core.
    expect(next.chronossus!.technologies).toBe(1);
    expect(next.chronossus!.fluxPool!.cores).toBe(1);
  });

  it('gains no Flux Cores outside a Fractures game (no pool to add to)', () => {
    const { state: next } = resolveAction(chronossusState(), { actionId: 'tile-extract' });
    expect(next.chronossus!.fluxPool).toBeUndefined();
  });
});

describe('Fractures — placement recording and Blinking through resolveAction', () => {
  const fracturesState = () => {
    const st = chronossusState({ config: { ...CONFIG, chronossusMode: 'fractures' } });
    st.chronossus = {
      ...st.chronossus!,
      exosuitsAvailable: 4,
      fluxPool: { cores: 1, casings: 3, setAside: 0 },
      technologies: 0,
      operators: 0,
      placedExosuits: [],
    };
    return st;
  };

  it('records where a placement went, with its Energy Core', () => {
    const { state: next } = resolveAction(fracturesState(), {
      actionId: 'construct-lab',
      buildingVP: 2,
      placementSpace: 'action',
    });
    expect(next.chronossus!.placedExosuits).toEqual([
      { action: 'construct-lab', space: 'action', hasCore: true },
    ]);
    expect(next.chronossus!.exosuitsAvailable).toBe(3);
  });

  it('records a World Council overflow as such', () => {
    const { state: next } = resolveAction(fracturesState(), {
      actionId: 'recruit',
      placementSpace: 'world-council',
    });
    expect(next.chronossus!.placedExosuits![0].space).toBe('world-council');
  });

  it('Blinking moves the chosen Exosuit and spends no new one', () => {
    const st = fracturesState();
    st.chronossus!.placedExosuits = [{ action: 'research', space: 'action', hasCore: true }];
    const { state: next } = resolveAction(st, {
      actionId: 'construct-lab',
      buildingVP: 3,
      blink: true,
      tokenActions: {},
    });
    expect(next.chronossus!.placedExosuits).toEqual([
      { action: 'construct-lab', space: 'action', hasCore: false },
    ]);
    expect(next.chronossus!.exosuitsAvailable).toBe(4); // unchanged — no new Exosuit
  });

  it('starts recording even if the save predates `placedExosuits` (pool present, list absent)', () => {
    const st = fracturesState();
    delete st.chronossus!.placedExosuits;
    const { state: next } = resolveAction(st, { actionId: 'recruit', placementSpace: 'action' });
    expect(next.chronossus!.placedExosuits).toEqual([
      { action: 'recruit', space: 'action', hasCore: true },
    ]);
  });

  it('leaves non-Fractures games without any placement list', () => {
    const { state: next } = resolveAction(chronossusState(), {
      actionId: 'recruit',
      placementSpace: 'action',
    });
    expect(next.chronossus!.placedExosuits).toBeUndefined();
  });
});

describe('Fractures — Clean Up returns the set-aside Casings', () => {
  it('puts them back in the pool and clears the placed Exosuits', () => {
    const state = chronossusState();
    state.chronossus!.fluxPool = { cores: 1, casings: 1, setAside: 2 };
    state.chronossus!.placedExosuits = [{ action: 'recruit', space: 'action', hasCore: true }];
    const next = resolveCleanUp(state);
    expect(next.chronossus!.fluxPool).toEqual({ cores: 1, casings: 3, setAside: 0 });
    expect(next.chronossus!.placedExosuits).toEqual([]);
    expect(next.currentInstructions.some((i) => i.id === 'cleanup-flux-casings')).toBe(true);
  });

  it('leaves non-Fractures games untouched', () => {
    const next = resolveCleanUp(chronossusState());
    expect(next.chronossus!.fluxPool).toBeUndefined();
    expect(next.currentInstructions.some((i) => i.id === 'cleanup-flux-casings')).toBe(false);
  });
});

describe('scoreChronossus — Fractures VP', () => {
  it('scores 3 VP per Technology', () => {
    const bot = { ...emptyChronossusState(), technologies: 4 };
    expect(scoreChronossus(bot).technologyVP).toBe(12);
  });

  it('scores leftover Flux Cores only with that difficulty option', () => {
    const bot = { ...emptyChronossusState(), fluxPool: { cores: 3, casings: 1, setAside: 0 } };
    expect(scoreChronossus(bot).leftoverFluxVP).toBe(0);
    expect(scoreChronossus(bot, [DIFFICULTY_FRACTURES_LEFTOVER_FLUX_VP]).leftoverFluxVP).toBe(3);
  });

  it('adds both into the total', () => {
    const bot = { ...emptyChronossusState(), technologies: 2, fluxPool: { cores: 1, casings: 0, setAside: 0 } };
    const base = scoreChronossus(emptyChronossusState()).total;
    expect(scoreChronossus(bot, [DIFFICULTY_FRACTURES_LEFTOVER_FLUX_VP]).total).toBe(base + 6 + 1);
  });

  it('is 0 for non-Fractures games', () => {
    const score = scoreChronossus(emptyChronossusState());
    expect(score.technologyVP).toBe(0);
    expect(score.leftoverFluxVP).toBe(0);
  });
});

describe('applyDifficultySetup — Fractures seeding', () => {
  const fracturesConfig = (difficulty: string[] = [], values?: Record<string, number>) => ({
    ...CONFIG,
    chronossusMode: 'fractures',
    difficulty,
    difficultyValues: values,
  });

  it('seeds the Flux Pool and the Technology/Operator counters', () => {
    const bot = applyDifficultySetup(emptyChronossusState(), fracturesConfig());
    expect(bot.fluxPool).toEqual({ cores: 1, casings: 3, setAside: 0 });
    expect(bot.technologies).toBe(0);
    expect(bot.operators).toBe(0);
  });

  it('adds the extra starting Flux Cores from that difficulty option', () => {
    const bot = applyDifficultySetup(
      emptyChronossusState(),
      fracturesConfig([DIFFICULTY_FRACTURES_EXTRA_FLUX], { [DIFFICULTY_FRACTURES_EXTRA_FLUX]: 3 }),
    );
    expect(bot.fluxPool).toEqual({ cores: 4, casings: 3, setAside: 0 });
  });

  it('leaves non-Fractures games without the Fractures fields', () => {
    const bot = applyDifficultySetup(emptyChronossusState(), { ...CONFIG, chronossusMode: 'base' });
    expect(bot.fluxPool).toBeUndefined();
    expect(bot.technologies).toBeUndefined();
  });
});

describe('scoreChronossus — Variable Anomalies scoring', () => {
  it('sums held tile VPs instead of the flat ANOMALY_VP when anomalyVps is present', () => {
    const bot = emptyChronossusState();
    bot.anomalyVps = [-2, -5, -4];
    bot.anomalies = 0; // unused/stale in this mode
    const score = scoreChronossus(bot);
    expect(score.anomalyVP).toBe(-11);
  });

  it('falls back to the flat counter when anomalyVps is absent (regression)', () => {
    const bot = emptyChronossusState();
    bot.anomalies = 2;
    const score = scoreChronossus(bot);
    expect(score.anomalyVP).toBe(-6); // 2 × ANOMALY_VP (-3)
  });
});

describe('rollParadox — Variable Anomalies defers the gain', () => {
  function variableAnomaliesState(overrides: Partial<GameState> = {}): GameState {
    const s = chronossusState({ config: { ...CONFIG, extraModules: [EXTRA_MODULE_VARIABLE_ANOMALIES] }, ...overrides });
    s.chronossus!.anomalyVps = [];
    return s;
  }

  it('reaching 3 requires input and does NOT touch anomalyVps/warpTilesOnTimeline', () => {
    const s = variableAnomaliesState();
    s.chronossus!.paradoxes = 2;
    s.chronossus!.warpTilesOnTimeline = 3;
    const res = rollParadox(s, 1);
    expect(res.gainedAnomaly).toBe(true);
    expect(res.stop).toBe(true);
    expect(res.state.chronossus!.anomalyVps).toEqual([]); // deferred
    expect(res.state.chronossus!.warpTilesOnTimeline).toBe(3); // untouched
    const instr = res.instructions.find((i) => i.id === 'paradox-anomaly-variable');
    expect(instr).toBeDefined();
    expect(instr!.requiresInput).toBe(true);
  });

  it('caps at 3 held Anomalies, same as the flat-counter base game', () => {
    const s = variableAnomaliesState();
    s.chronossus!.paradoxes = 2;
    s.chronossus!.anomalyVps = [-2, -3, -4];
    const res = rollParadox(s, 1);
    expect(res.instructions.find((i) => i.id === 'paradox-capped')).toBeDefined();
    expect(res.state.chronossus!.anomalyVps).toEqual([-2, -3, -4]); // unchanged
  });

  it('base games (no Variable Anomalies) are unaffected (regression)', () => {
    const s = chronossusState({ config: CONFIG });
    s.chronossus!.paradoxes = 2;
    s.chronossus!.warpTilesOnTimeline = 2;
    const res = rollParadox(s, 1);
    expect(res.state.chronossus!.anomalies).toBe(1);
    expect(res.state.chronossus!.warpTilesOnTimeline).toBe(1);
    expect(res.state.chronossus!.anomalyVps).toBeUndefined();
  });
});

describe('resolveVariableAnomalyGain — RECEIVING ANOMALIES rule', () => {
  function stateWithWarp(warpTilesOnTimeline: number): GameState {
    const s = chronossusState({ config: { ...CONFIG, extraModules: [EXTRA_MODULE_VARIABLE_ANOMALIES] } });
    s.chronossus!.anomalyVps = [];
    s.chronossus!.warpTilesOnTimeline = warpTilesOnTimeline;
    return s;
  }

  it('records the taken tile and retrieves a Warp tile when it is eligible', () => {
    const taken: VariableAnomalyCandidate = { vp: -5, retrieveEligible: true };
    const next = resolveVariableAnomalyGain(stateWithWarp(2), taken);
    expect(next.chronossus!.anomalyVps).toEqual([-5]);
    expect(next.chronossus!.warpTilesOnTimeline).toBe(1); // retrieved
  });

  it('leaves the Warp tiles alone when the taken tile does not retrieve', () => {
    const next = resolveVariableAnomalyGain(stateWithWarp(2), { vp: -3, retrieveEligible: false });
    expect(next.chronossus!.anomalyVps).toEqual([-3]);
    expect(next.chronossus!.warpTilesOnTimeline).toBe(2);
  });

  it('does not retrieve below zero Warp tiles even when eligible', () => {
    const next = resolveVariableAnomalyGain(stateWithWarp(0), { vp: -2, retrieveEligible: true });
    expect(next.chronossus!.warpTilesOnTimeline).toBe(0);
  });

  it('appends to existing held anomalies rather than replacing them', () => {
    const s = stateWithWarp(0);
    s.chronossus!.anomalyVps = [-4];
    const next = resolveVariableAnomalyGain(s, { vp: -2, retrieveEligible: false });
    expect(next.chronossus!.anomalyVps).toEqual([-4, -2]);
  });
});

describe('resolveAction remove-anomaly — Variable Anomalies removal rule', () => {
  function withHeldAnomalies(vps: number[]): GameState {
    const s = chronossusState({
      phase: 'actions',
      config: { ...CONFIG, extraModules: [EXTRA_MODULE_VARIABLE_ANOMALIES] },
    });
    s.chronossus!.exosuitsAvailable = 4;
    s.chronossus!.anomalyVps = vps;
    s.chronossus!.resources.titanium = 2; // enough to pay the removal cost
    return s;
  }

  it('always removes the largest penalty (most negative), regardless of order', () => {
    const { state } = resolveAction(withHeldAnomalies([-2, -6, -4]), { actionId: 'remove-anomaly' });
    expect(state.chronossus!.anomalyVps).toEqual([-2, -4]); // -6 removed
  });

  it('fails when there are no held Anomalies (Variable Anomalies mode)', () => {
    const { state } = resolveAction(withHeldAnomalies([]), { actionId: 'remove-anomaly' });
    expect(state.chronossus!.vp).toBe(1); // Failed Action, base +1 VP
  });
});

// --------------------------------------------------------------------------
// Guardians of the Council (Solo Opponents p.16) — Power Up order, placement
// order, the Guardian board fallback, Clean Up and the pass rule.
// --------------------------------------------------------------------------

const GUARDIANS_CONFIG: GameConfig = { ...CONFIG, chronossusMode: 'guardians' };

/** A Guardians-mode game with `owned` Guardians and `powered`/`exosuits` ready. */
function guardiansState(
  guardians: { owned: number; powered: number },
  exosuitsAvailable = 0,
  overrides: Partial<GameState> = {},
): GameState {
  return {
    ...createInitialState(GUARDIANS_CONFIG),
    chronossus: { ...emptyChronossusState(), guardians, exosuitsAvailable },
    phase: 'actions',
    ...overrides,
  };
}

describe('Guardians — placement order (Guardians go last)', () => {
  it('nextFigure prefers a plain Exosuit while any remain', () => {
    const bot = { ...emptyChronossusState(), exosuitsAvailable: 1, guardians: { owned: 2, powered: 2 } };
    expect(nextFigure(bot)).toBe('exosuit');
  });

  it('nextFigure falls to a Guardian once the Exosuits are gone', () => {
    const bot = { ...emptyChronossusState(), exosuitsAvailable: 0, guardians: { owned: 2, powered: 2 } };
    expect(nextFigure(bot)).toBe('guardian');
  });

  it('nextFigure is null when nothing is powered', () => {
    const bot = { ...emptyChronossusState(), exosuitsAvailable: 0, guardians: { owned: 2, powered: 0 } };
    expect(nextFigure(bot)).toBeNull();
    expect(placeableFigures(bot)).toBe(0);
  });

  it('placeableFigures counts Exosuits + powered Guardians', () => {
    const bot = { ...emptyChronossusState(), exosuitsAvailable: 3, guardians: { owned: 2, powered: 2 } };
    expect(placeableFigures(bot)).toBe(5);
  });

  it('spendFigure takes Exosuits first, then Guardians, leaving owned intact', () => {
    const bot = { ...emptyChronossusState(), exosuitsAvailable: 1, guardians: { owned: 2, powered: 2 } };
    expect(spendFigure(bot)).toBe('exosuit');
    expect(bot.exosuitsAvailable).toBe(0);
    expect(spendFigure(bot)).toBe('guardian');
    expect(bot.guardians).toEqual({ owned: 2, powered: 1 });
    expect(spendFigure(bot)).toBe('guardian');
    expect(spendFigure(bot)).toBeNull();
    expect(bot.guardians).toEqual({ owned: 2, powered: 0 }); // owned never drops
  });

  it('a Construct places the Guardian once no Exosuits are left', () => {
    const res = resolveAction(guardiansState({ owned: 1, powered: 1 }, 0), {
      actionId: 'construct-factory',
      buildingVP: 3,
    });
    expect(res.figurePlaced).toBe('guardian');
    expect(res.state.chronossus!.guardians).toEqual({ owned: 1, powered: 0 });
  });

  it('…but spends a plain Exosuit while one remains', () => {
    const res = resolveAction(guardiansState({ owned: 1, powered: 1 }, 2), {
      actionId: 'construct-factory',
      buildingVP: 3,
    });
    expect(res.figurePlaced).toBe('exosuit');
    expect(res.state.chronossus!.exosuitsAvailable).toBe(1);
    expect(res.state.chronossus!.guardians).toEqual({ owned: 1, powered: 1 });
  });
});

describe('Guardians — Power Up powers Guardians first', () => {
  function powerUp(guardiansOwned: number, draw: EnergyDraw, difficulty: string[] = []) {
    const state: GameState = {
      ...createInitialState({ ...GUARDIANS_CONFIG, difficulty }),
      chronossus: { ...emptyChronossusState(), guardians: { owned: guardiansOwned, powered: 0 } },
      phase: 'powerup',
    };
    return resolvePowerUp(state, draw).chronossus!;
  }

  it('the rulebook example: needs 4, has 2 Guardians → 2 Guardians + 2 Exosuits', () => {
    const bot = powerUp(2, { energized: 1, exhausted: 2 }); // pre-Impact 3+1 = 4
    expect(bot.guardians).toEqual({ owned: 2, powered: 2 });
    expect(bot.exosuitsAvailable).toBe(2);
  });

  it('uses the whole number on Guardians when it owns enough', () => {
    const bot = powerUp(5, { energized: 0, exhausted: 3 }); // 3 pre-Impact
    expect(bot.guardians).toEqual({ owned: 5, powered: 3 });
    expect(bot.exosuitsAvailable).toBe(0);
  });

  it('powers up none when it owns none (unchanged base behaviour)', () => {
    const bot = powerUp(0, { energized: 2, exhausted: 1 });
    expect(bot.guardians).toEqual({ owned: 0, powered: 0 });
    expect(bot.exosuitsAvailable).toBe(5);
  });

  it('total placeable never exceeds the powered number', () => {
    const bot = powerUp(2, { energized: 3, exhausted: 0 }); // capped at 6 pre-Impact
    expect(placeableFigures(bot)).toBe(6);
  });

  it('post-Impact the max-4 cap still applies across both', () => {
    const state: GameState = {
      ...createInitialState(GUARDIANS_CONFIG),
      chronossus: { ...emptyChronossusState(), guardians: { owned: 3, powered: 0 } },
      phase: 'powerup',
      impact: true,
    };
    const bot = resolvePowerUp(state, { energized: 3, exhausted: 0 }).chronossus!;
    expect(placeableFigures(bot)).toBe(4);
    expect(bot.guardians!.powered).toBe(3);
    expect(bot.exosuitsAvailable).toBe(1);
  });

  it('D4 converts to VP only once Guardians AND all 6 Exosuit figures are used', () => {
    // Pre-Impact max draw caps at 6; +1 free would be a 7th. With 2 Guardians the bot
    // has capacity for 2 + 6 = 8, so nothing is wasted and no VP is scored.
    const bot = powerUp(2, { energized: 3, exhausted: 0 }, [DIFFICULTY_EXTRA_POWERUP]);
    expect(bot.vp).toBe(0);
    expect(bot.guardians!.powered).toBe(2);
    expect(bot.exosuitsAvailable).toBe(5);
  });
});

describe('Guardians — the Guardian board fallback', () => {
  it('a Capital Action with no space places a Guardian instead of failing', () => {
    const res = resolveAction(guardiansState({ owned: 1, powered: 1 }, 0), {
      actionId: 'research',
      noSpaceAvailable: true,
      shape: 'circle',
    });
    const bot = res.state.chronossus!;
    expect(res.usedGuardianSpace).toBe(true);
    expect(bot.vp).toBe(0); // NOT a Failed Action — no +1 VP
    expect(bot.guardians).toEqual({ owned: 1, powered: 0 });
    expect(bot.breakthroughs.circle).toBe(1); // the Action itself still resolved
  });

  it('spends a GUARDIAN even when powered Exosuits remain (spaces ran out, not figures)', () => {
    const res = resolveAction(guardiansState({ owned: 1, powered: 1 }, 4), {
      actionId: 'construct-factory',
      noSpaceAvailable: true,
      buildingVP: 3,
    });
    const bot = res.state.chronossus!;
    expect(res.usedGuardianSpace).toBe(true);
    expect(bot.guardians).toEqual({ owned: 1, powered: 0 }); // the Guardian went
    expect(bot.exosuitsAvailable).toBe(4); // its Exosuits are untouched
    expect(bot.vp).toBe(3); // the Construct resolved normally — no Failed +1 VP
  });

  it('is offered for Research, Recruit and every Construct — but not Mine', () => {
    expect(isGuardianCapitalAction('research')).toBe(true);
    expect(isGuardianCapitalAction('recruit')).toBe(true);
    expect(isGuardianCapitalAction('recruit-genius-research')).toBe(true);
    expect(isGuardianCapitalAction('construct-factory')).toBe(true);
    expect(isGuardianCapitalAction('construct-superproject')).toBe(true);
    expect(isGuardianCapitalAction('mine-resource')).toBe(false);
    expect(isGuardianCapitalAction('time-travel')).toBe(false);
  });

  it('falls back to the normal Failed Action with no powered Guardian', () => {
    const res = resolveAction(guardiansState({ owned: 1, powered: 0 }, 0), {
      actionId: 'research',
      noSpaceAvailable: true,
    });
    expect(res.usedGuardianSpace).toBeUndefined();
    expect(res.state.chronossus!.vp).toBe(1); // Failed Action VP
  });

  it('canUseGuardianSpace needs both a powered Guardian and a Capital Action', () => {
    const withGuardian = { ...emptyChronossusState(), guardians: { owned: 1, powered: 1 } };
    expect(canUseGuardianSpace(withGuardian, 'construct-factory')).toBe(true);
    expect(canUseGuardianSpace(withGuardian, 'mine-resource')).toBe(false);
    const noneOwned = { ...emptyChronossusState(), guardians: { owned: 0, powered: 0 } };
    expect(canUseGuardianSpace(noneOwned, 'construct-factory')).toBe(false);
  });

  it('beats the Hypersync Solo-tile fallback in the combo', () => {
    const state: GameState = {
      ...createInitialState({ ...CONFIG, chronossusMode: 'guardians+hypersync' }),
      chronossus: { ...emptyChronossusState(), guardians: { owned: 1, powered: 1 } },
      phase: 'actions',
    };
    const res = resolveAction(state, {
      actionId: 'research',
      noSpaceAvailable: true,
      placeHypersyncTile: true,
    });
    expect(res.usedGuardianSpace).toBe(true);
    expect(res.state.chronossus!.hypersyncTiles).toEqual([]); // no tile was placed
  });
});

describe('Guardians — passing and Clean Up', () => {
  it('does not pass while a powered Guardian remains', () => {
    const bot = { ...emptyChronossusState(), exosuitsAvailable: 0, guardians: { owned: 1, powered: 1 } };
    expect(wouldPassOn(bot, 'construct-factory')).toBe(false);
  });

  it('passes once both Exosuits and Guardians are spent', () => {
    const bot = { ...emptyChronossusState(), exosuitsAvailable: 0, guardians: { owned: 1, powered: 0 } };
    expect(wouldPassOn(bot, 'construct-factory')).toBe(true);
  });

  it('Clean Up retrieves the Guardians but keeps them owned', () => {
    const state = guardiansState({ owned: 2, powered: 1 }, 3, { phase: 'cleanup' });
    const bot = resolveCleanUp(state).chronossus!;
    expect(bot.exosuitsAvailable).toBe(0);
    expect(bot.guardians).toEqual({ owned: 2, powered: 0 });
  });

  it('leaves guardians undefined alone in every other mode', () => {
    const state: GameState = { ...chronossusState({ phase: 'cleanup' }) };
    expect(resolveCleanUp(state).chronossus!.guardians).toBeUndefined();
  });
});

describe('Guardians — Acquire Guardian (C11)', () => {
  /** A Guardians game in `era`, with the given Workers and powered figures. */
  function acquireState(
    opts: {
      era?: number;
      impact?: boolean;
      exosuits?: number;
      guardians?: { owned: number; powered: number };
      workers?: Partial<Record<EngineWorker, number>>;
      difficulty?: string[];
    } = {},
  ): GameState {
    const base = createInitialState({ ...GUARDIANS_CONFIG, difficulty: opts.difficulty ?? [] });
    return {
      ...base,
      era: opts.era ?? 1,
      impact: opts.impact ?? false,
      phase: 'actions',
      chronossus: {
        ...emptyChronossusState(),
        exosuitsAvailable: opts.exosuits ?? 3,
        guardians: opts.guardians ?? { owned: 0, powered: 0 },
        workers: { genius: 0, administrator: 0, engineer: 0, scientist: 0, ...opts.workers },
      },
    };
  }
  const acquire = (state: GameState, input: Partial<ChronossusActionInputType> = {}) =>
    resolveAction(state, { actionId: 'tile-acquire-guardian', tileSide: 'A', ...input });

  it('World Council free: places an Exosuit, takes First Player, gains a Guardian', () => {
    const res = acquire(acquireState(), { worldCouncilFree: true });
    const bot = res.state.chronossus!;
    expect(res.acquireGuardian).toBe('world-council');
    expect(res.figurePlaced).toBe('exosuit');
    expect(bot.exosuitsAvailable).toBe(2);
    expect(bot.guardians).toEqual({ owned: 1, powered: 0 });
    expect(res.state.firstPlayer).toBe('bot');
    expect(bot.vp).toBe(0); // no Action performed, no VP on the A side
  });

  it('World Council taken: spends the Worker it has most of, places nothing', () => {
    // Start from "the player is First Player" so the assertion below is meaningful.
    const state = { ...acquireState({ workers: { scientist: 1, engineer: 3 } }), firstPlayer: 'player' as const };
    const res = acquire(state, { worldCouncilFree: false });
    const bot = res.state.chronossus!;
    expect(res.acquireGuardian).toBe('worker');
    expect(bot.workers.engineer).toBe(2); // most-of wins over the listed order
    expect(bot.workers.scientist).toBe(1);
    expect(bot.exosuitsAvailable).toBe(3); // no Exosuit placed
    expect(bot.guardians).toEqual({ owned: 1, powered: 0 });
    expect(res.state.firstPlayer).toBe('player'); // unchanged — no World Council placement
  });

  it('breaks a Worker tie by Scientist > Engineer > Administrator > Genius', () => {
    const bot = {
      ...emptyChronossusState(),
      workers: { genius: 2, administrator: 2, engineer: 2, scientist: 2 },
    };
    expect(guardianWorkerToSpend(bot)).toBe('scientist');
    const noScientist = { ...bot, workers: { ...bot.workers, scientist: 0 } };
    expect(guardianWorkerToSpend(noScientist)).toBe('engineer');
    const geniusOnly = {
      ...bot,
      workers: { genius: 1, administrator: 0, engineer: 0, scientist: 0 },
    };
    expect(guardianWorkerToSpend(geniusOnly)).toBe('genius');
    expect(guardianWorkerToSpend(emptyChronossusState())).toBeNull();
  });

  it('post-Impact it is a full Failed Action — VP and a discarded Exosuit', () => {
    const res = acquire(acquireState({ era: 5, impact: true }), { worldCouncilFree: true });
    const bot = res.state.chronossus!;
    expect(res.acquireGuardian).toBe('failed');
    expect(bot.vp).toBe(1);
    expect(bot.exosuitsAvailable).toBe(2); // discarded one
    expect(bot.guardians).toEqual({ owned: 0, powered: 0 }); // nothing acquired
  });

  it('post-Impact scores 2 VP instead under that difficulty option, with no discard', () => {
    const state = acquireState({
      era: 5,
      impact: true,
      difficulty: [DIFFICULTY_GUARDIANS_POSTIMPACT_2VP],
    });
    const res = acquire(state, { worldCouncilFree: true });
    expect(res.state.chronossus!.vp).toBe(2);
    expect(res.state.chronossus!.exosuitsAvailable).toBe(3);
  });

  it('no Guardian left on the board is a Failed Action', () => {
    const res = acquire(acquireState({ era: 4 }), {
      worldCouncilFree: true,
      guardianAvailable: false,
    });
    expect(res.acquireGuardian).toBe('failed');
    expect(res.state.chronossus!.guardians).toEqual({ owned: 0, powered: 0 });
    expect(res.state.chronossus!.vp).toBe(1);
  });

  it('an empty Worker pool is the only other failure path', () => {
    const res = acquire(acquireState({ exosuits: 0 }), { worldCouncilFree: false });
    expect(res.acquireGuardian).toBe('failed');
    expect(res.state.chronossus!.vp).toBe(1);
    // Same outcome whatever the World Council answer was — it never got that far.
    const free = acquire(acquireState({ exosuits: 0 }), { worldCouncilFree: true });
    expect(free.acquireGuardian).toBe('failed');
  });

  it('only asks about the World Council space when it has a figure to place', () => {
    const withFigure = { ...emptyChronossusState(), exosuitsAvailable: 1 };
    expect(acquireGuardianAsksWorldCouncil(withFigure)).toBe(true);
    const guardianOnly = {
      ...emptyChronossusState(),
      exosuitsAvailable: 0,
      guardians: { owned: 1, powered: 1 },
    };
    expect(acquireGuardianAsksWorldCouncil(guardianOnly)).toBe(true);
    const nothing = { ...emptyChronossusState(), exosuitsAvailable: 0 };
    expect(acquireGuardianAsksWorldCouncil(nothing)).toBe(false);
  });

  it('falls back to the Worker option when it has no figure to place', () => {
    const state = acquireState({ exosuits: 0, workers: { administrator: 1 } });
    const res = acquire(state, { worldCouncilFree: true });
    expect(res.acquireGuardian).toBe('worker');
    expect(res.state.chronossus!.workers.administrator).toBe(0);
    expect(res.state.chronossus!.guardians).toEqual({ owned: 1, powered: 0 });
  });

  it('places its last Guardian on World Council when no Exosuit remains', () => {
    const state = acquireState({ exosuits: 0, guardians: { owned: 1, powered: 1 } });
    const res = acquire(state, { worldCouncilFree: true });
    expect(res.figurePlaced).toBe('guardian');
    expect(res.state.chronossus!.guardians).toEqual({ owned: 2, powered: 0 });
  });

  it('both sides Autoleap; the B side also scores 2 VP', () => {
    const a = acquire(acquireState(), { worldCouncilFree: true, tileSide: 'A' });
    expect(a.autoleap).toBe(true);
    expect(a.state.chronossus!.vp).toBe(0);
    const b = acquire(acquireState(), { worldCouncilFree: true, tileSide: 'B' });
    expect(b.autoleap).toBe(true);
    expect(b.state.chronossus!.vp).toBe(2);
  });

  it('never forces a pass — the Worker option survives an empty Exosuit supply', () => {
    const bot = { ...emptyChronossusState(), exosuitsAvailable: 0 };
    expect(wouldPassOn(bot, 'tile-acquire-guardian')).toBe(false);
    expect(placesExosuitFor('tile-acquire-guardian')).toBe(false);
  });

  it('only asks whether a Guardian is available in Era 4', () => {
    expect(shouldAskGuardianAvailable(1)).toBe(false);
    expect(shouldAskGuardianAvailable(3)).toBe(false);
    expect(shouldAskGuardianAvailable(4)).toBe(true);
    expect(shouldAskGuardianAvailable(5)).toBe(false); // post-Impact: always fails
    expect(shouldAskGuardianAvailable(7)).toBe(false);
  });
});
