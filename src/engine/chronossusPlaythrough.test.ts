// chronossusPlaythrough.test.ts — end-to-end regression guardrail for the
// Chronossus. Drives a full game (Setup → Eras 1…7 → End Game) through the real
// phase-flow engine via the `playChronossus` helper in `chronossusPlaythrough.ts`,
// asserting it never throws, per-phase invariants hold throughout, and the final
// score is a coherent breakdown.
//
// Adding a new mode variation (e.g. Fractures of Time, PART 3 of
// docs/plans/PLAN_chronossus_difficulty_test_fractures.md): add a new `describe`
// below that calls `playChronossus({ config: { ...CONFIG, expansions: [...],
// chronossusMode: '<mode>' }, actionsForEra: <custom script> })`, overriding only
// `actionsForEra` (and `warpRollForEra` / `paradoxRollCycle` if useful) to exercise
// the mode's new Actions/tiles — see the Hypersync `describe` below for the pattern
// of splicing a mode-specific `Turn` into a couple of Eras and letting the shared
// `defaultActionsForEra` script fill the rest.

import { describe, expect, it } from 'vitest';
import { action, defaultActionsForEra, hypersyncTurn, playChronossus, type Turn } from './chronossusPlaythrough';
import {
  MAX_ERA,
  DIFFICULTY_EXTRA_ENERGY,
  DIFFICULTY_EXTRA_POWERUP,
  DIFFICULTY_LEFTOVER_ENERGY_VP,
  DIFFICULTY_FAILED_ACTION_VP,
} from './bots/chronossus';
import type { GameConfig } from './types';

const BASE_CONFIG: GameConfig = {
  bot: 'chronossus',
  expansions: ['base'],
  difficulty: [],
  playerBoardSide: 'A',
};

describe('Chronossus full-game playthrough — base mode', () => {
  it('runs Setup → Eras 1…MAX_ERA → End Game with no throws and a coherent score', () => {
    const { state, score } = playChronossus({ config: BASE_CONFIG });

    expect(state.finished).toBe(true);
    expect(state.phase).toBe('endgame');
    expect(state.era).toBe(MAX_ERA);
    expect(state.impact).toBe(true);

    // The default script places Exosuits every Era, so it should have earned
    // Buildings, Breakthroughs, and passed with no Exosuits left.
    expect(state.chronossus!.totalActions).toBeGreaterThan(0);
    expect(state.chronossus!.exosuitsAvailable).toBe(0);
    expect(state.chronossus!.passed).toBe(true);
    expect(state.playerPassed).toBe(true);

    // Score breakdown reconstructs the total and each line is finite.
    for (const v of Object.values(score)) expect(Number.isFinite(v)).toBe(true);
    expect(score.total).toBe(
      score.duringGameVP + score.timeTravelVP + score.breakthroughVP + score.shapeSetBonus + score.anomalyVP,
    );
    expect(score.duringGameVP).toBe(state.chronossus!.vp);
  });

  it('is deterministic given the same inputs', () => {
    const a = playChronossus({ config: BASE_CONFIG });
    const b = playChronossus({ config: BASE_CONFIG });
    expect(a.score).toEqual(b.score);
    expect(a.state.chronossus).toEqual(b.state.chronossus);
  });
});

describe('Chronossus full-game playthrough — Hypersync (HFA) mode', () => {
  const HYPERSYNC_CONFIG: GameConfig = { ...BASE_CONFIG, chronossusMode: 'hypersync' };

  /**
   * Era 2: the first turn hits the no-space Capital-Action fallback and places a
   * Solo Hypersync tile instead of an Exosuit. Era 3: the first turn is a C12A
   * Hypersync Action that retrieves that (now prior-Era) tile. Both eras then
   * fall back to the shared default script for their remaining turns.
   */
  function actionsForEra(era: number): Turn[] {
    if (era === 2) {
      return [action('construct-factory', { placeHypersyncTile: true, buildingVP: 4 }), ...defaultActionsForEra(era)];
    }
    if (era === 3) {
      return [hypersyncTurn({ code: 'C12A', outcome: 'hypersync', hex: 1 }), ...defaultActionsForEra(era)];
    }
    return defaultActionsForEra(era);
  }

  it('runs a full game exercising the Hypersync tile placement + retrieval + Autoleap paths', () => {
    const { state, score } = playChronossus({ config: HYPERSYNC_CONFIG, actionsForEra });

    expect(state.finished).toBe(true);
    expect(state.era).toBe(MAX_ERA);

    // The Era-2 tile was retrieved during Era 3 — it should no longer be pending.
    expect(state.chronossus!.hypersyncTiles).not.toContain(2);

    expect(Number.isFinite(score.total)).toBe(true);
    expect(score.total).toBe(
      score.duringGameVP + score.timeTravelVP + score.breakthroughVP + score.shapeSetBonus + score.anomalyVP,
    );
  });
});

describe('Chronossus full-game playthrough — base mode with difficulty options', () => {
  // D3 (extra Energy Cores), D4 (extra powerup), D5 (leftover Energy Core VP), and
  // D7 (Failed Actions score +2) all read live off `state.config.difficulty` through
  // the same resolvers the base playthrough exercises — this variation's only job is
  // confirming the plumbing (setup-time D3 seeding, per-turn D4/D7 checks, end-game D5
  // seam) holds up across a full game, not re-deriving each option's math (covered by
  // dedicated unit tests in bots/chronossus.test.ts).
  const DIFFICULTY_CONFIG: GameConfig = {
    ...BASE_CONFIG,
    difficulty: [
      DIFFICULTY_EXTRA_ENERGY,
      DIFFICULTY_EXTRA_POWERUP,
      DIFFICULTY_LEFTOVER_ENERGY_VP,
      DIFFICULTY_FAILED_ACTION_VP,
    ],
    difficultyValues: { [DIFFICULTY_EXTRA_ENERGY]: 2 },
  };

  it('seeds D3 at setup and completes a full game with D4/D5/D7 active', () => {
    const { state, score } = playChronossus({ config: DIFFICULTY_CONFIG });

    expect(state.finished).toBe(true);
    expect(state.era).toBe(MAX_ERA);

    // D5: the leftover-energy score line only exists because the flag was threaded
    // through to scoreChronossus at End Game.
    expect(score.leftoverEnergyVP).toBe(state.chronossus!.energyPool.energized);
    expect(score.total).toBe(
      score.duringGameVP +
        score.timeTravelVP +
        score.breakthroughVP +
        score.shapeSetBonus +
        score.anomalyVP +
        score.leftoverEnergyVP,
    );
  });

  it('scores at least as much during-game VP as the same script without difficulty (D4/D7 only add)', () => {
    const plain = playChronossus({ config: BASE_CONFIG });
    const harder = playChronossus({ config: DIFFICULTY_CONFIG });
    expect(harder.score.duringGameVP).toBeGreaterThanOrEqual(plain.score.duringGameVP);
  });
});
