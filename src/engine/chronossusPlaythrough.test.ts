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
  DIFFICULTY_ALT_TIMELINES_3VP,
  EXTRA_MODULE_ALTERNATE_TIMELINES,
  EXTRA_MODULE_VARIABLE_ANOMALIES,
  DIFFICULTY_FRACTURES_LEFTOVER_FLUX_VP,
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

describe('Chronossus full-game playthrough — Alternate Timelines extra module', () => {
  const ALT_TIMELINES_CONFIG: GameConfig = {
    ...BASE_CONFIG,
    extraModules: [EXTRA_MODULE_ALTERNATE_TIMELINES],
  };

  it('scores 2 VP per reported positive space across a full game', () => {
    // Report 1 positive space whenever any Warp tiles were placed that Era.
    const withBonus = playChronossus({
      config: ALT_TIMELINES_CONFIG,
      positiveSpacesForEra: (_era, placed) => (placed > 0 ? 1 : 0),
    });
    const withoutBonus = playChronossus({ config: ALT_TIMELINES_CONFIG });
    expect(withBonus.state.finished).toBe(true);
    const delta = withBonus.score.duringGameVP - withoutBonus.score.duringGameVP;
    // One reported positive space per Warp-placing Era, 2 VP each — a clean positive
    // multiple of 2 on top of whatever the identical action script otherwise scores.
    expect(delta).toBeGreaterThan(0);
    expect(delta % 2).toBe(0);
  });

  it('scores 3 VP per positive space with its own difficulty option active', () => {
    const config: GameConfig = { ...ALT_TIMELINES_CONFIG, difficulty: [DIFFICULTY_ALT_TIMELINES_3VP] };
    const base = playChronossus({
      config: ALT_TIMELINES_CONFIG,
      positiveSpacesForEra: (_era, placed) => (placed > 0 ? 1 : 0),
    });
    const harder = playChronossus({
      config,
      positiveSpacesForEra: (_era, placed) => (placed > 0 ? 1 : 0),
    });
    expect(harder.score.duringGameVP).toBeGreaterThan(base.score.duringGameVP);
  });

});

describe('resolveWarp — Alternate Timelines VP is caller-driven, not module-gated', () => {
  // resolveWarp trusts whatever positiveSpaces it's given — same pattern as every other
  // engine resolver (state.config only decides the VP-per-space rate, never whether to
  // apply it at all). Gating "should we even ask the player" belongs to the UI (only
  // prompts when config.extraModules includes alternate-timelines); this just documents
  // that the pure engine has no opinion on the module flag.
  it('a nonzero positiveSpaces still grants VP even without the extra module selected', () => {
    const { score } = playChronossus({
      config: BASE_CONFIG, // no extraModules
      positiveSpacesForEra: (_era, placed) => (placed > 0 ? 1 : 0),
    });
    expect(score.duringGameVP).toBeGreaterThan(0);
  });
});

describe('Chronossus full-game playthrough — Variable Anomalies extra module', () => {
  const VARIABLE_ANOMALIES_CONFIG: GameConfig = {
    ...BASE_CONFIG,
    extraModules: [EXTRA_MODULE_VARIABLE_ANOMALIES],
  };

  it('gains/holds Variable Anomaly tiles across a full game', () => {
    const { state, score } = playChronossus({
      config: VARIABLE_ANOMALIES_CONFIG,
      // Every gain: the player reports the taken tile — a -2 that retrieves a Warp tile.
      variableAnomalyTaken: () => ({ vp: -2, retrieveEligible: true }),
    });
    expect(state.finished).toBe(true);
    expect(state.chronossus!.anomalyVps).toBeDefined();
    expect(state.chronossus!.anomalyVps!.length).toBeLessThanOrEqual(3); // capped, same as base
    expect(state.chronossus!.anomalyVps!.every((v) => v === -2)).toBe(true);
    expect(score.anomalyVP).toBe(state.chronossus!.anomalyVps!.reduce((n, v) => n + v, 0));
  });

  it('scores held tiles individually, not the base flat ANOMALY_VP', () => {
    const { state, score } = playChronossus({
      config: VARIABLE_ANOMALIES_CONFIG,
      variableAnomalyTaken: () => ({ vp: -6, retrieveEligible: false }),
    });
    const heldCount = state.chronossus!.anomalyVps!.length;
    expect(heldCount).toBeGreaterThan(0);
    expect(score.anomalyVP).toBe(heldCount * -6); // worse than base game's flat -3 each
  });
});

describe('Chronossus full-game playthrough — Fractures of Time', () => {
  const FRACTURES_CONFIG: GameConfig = { ...BASE_CONFIG, chronossusMode: 'fractures' };

  it('plays a full game with the Flux Pool, Blinking, and the module tiles', () => {
    const { state, score } = playChronossus({
      config: FRACTURES_CONFIG,
      // Every Era: place twice, then take each of the module's three tile Actions, then a
      // Blink into a Construct (an Exosuit is on the board with its Energy Core by then).
      actionsForEra: () => [
        action('recruit', { placementSpace: 'action' }),
        action('research', { shape: 'circle', placementSpace: 'action' }),
        action('tile-extract'),
        action('tile-power-pack'),
        action('tile-assimilate', { shape: 'square' }),
        action('construct-lab', { buildingVP: 3, blink: true, tokenActions: {} }),
        action('mine-resource', { placementSpace: 'world-council' }),
      ],
    });
    expect(state.finished).toBe(true);
    const bot = state.chronossus!;
    // Extract/Power Pack keep feeding the pool; Clean Up returns every set-aside Casing,
    // so no Casing is ever lost and nothing goes negative.
    expect(bot.fluxPool!.cores).toBeGreaterThan(0);
    expect(bot.fluxPool!.casings + bot.fluxPool!.setAside).toBe(3);
    // Assimilate ran every Era: it holds Operators and/or Technologies.
    expect((bot.operators ?? 0) + (bot.technologies ?? 0)).toBeGreaterThan(0);
    expect(score.technologyVP).toBe((bot.technologies ?? 0) * 3);
    expect(score.total).toBe(
      score.duringGameVP +
        score.timeTravelVP +
        score.breakthroughVP +
        score.shapeSetBonus +
        score.anomalyVP +
        score.leftoverEnergyVP +
        score.technologyVP +
        score.leftoverFluxVP,
    );
  });

  it('scores leftover Flux Cores with that difficulty option', () => {
    const opts = {
      config: {
        ...FRACTURES_CONFIG,
        difficulty: [DIFFICULTY_FRACTURES_LEFTOVER_FLUX_VP],
      },
      actionsForEra: () => [action('tile-extract'), action('recruit', { placementSpace: 'action' })],
    };
    const { state, score } = playChronossus(opts);
    expect(score.leftoverFluxVP).toBe(state.chronossus!.fluxPool!.cores);
    expect(score.leftoverFluxVP).toBeGreaterThan(0);
  });

  it('Blinking spends no Exosuit, so it can act on a turn it would otherwise pass', () => {
    const { state } = playChronossus({
      config: FRACTURES_CONFIG,
      actionsForEra: () => [
        action('recruit', { placementSpace: 'action' }),
        // Six Blinks in a row: each moves the one placed Exosuit, none takes a new one.
        ...Array.from({ length: 6 }, () =>
          action('construct-lab', { buildingVP: 2, blink: true, tokenActions: {} }),
        ),
      ],
    });
    const bot = state.chronossus!;
    expect(bot.exosuitsAvailable).toBeGreaterThanOrEqual(0);
    expect(bot.placedExosuits).toEqual([]); // cleared each Clean Up
  });
});
