// chronossusPlaythrough.ts — a reusable, deterministic driver that plays a full
// Chronossus game end to end through the real phase-flow engine (`game/flow.ts`
// + `bots/chronossus.ts`). Used by `chronossusPlaythrough.test.ts` as the shared
// regression guardrail for the base game and every mode variation (Hypersync,
// and later Fractures of Time — see that test file's header for how to add one).
//
// Every random input the physical game would supply (Paradox rolls, Warp rolls,
// Energy Pool draws, the Chronossus's Action choices) is deterministic here so
// the test is stable and its invariant/score assertions are reproducible. Actual
// randomness (`drawEnergyPool`, `rollParadoxDie`, …) is exercised separately by
// its own unit tests in `bots/chronossus.test.ts`.

import { advanceFromPreparation, finishEra, startFirstEra } from '../game/flow';
import {
  createInitialState,
  emptyChronossusState,
  type EnergyPool,
  type GameState,
} from './state';
import { BUILDING_TYPES, type BreakthroughShape, type GameConfig } from './types';
import * as Chronossus from './bots/chronossus';
import type {
  ChronossusActionId,
  ChronossusActionInput,
  ChronossusScore,
  EnergyDraw,
  HypersyncActionInput,
  VariableAnomalyCandidate,
} from './bots/chronossus';

/** One Chronossus turn during Action Rounds: a base/tile Action or a Hypersync Action. */
export type Turn =
  | { kind: 'action'; input: ChronossusActionInput }
  | { kind: 'hypersync'; input: HypersyncActionInput };

export function action(
  actionId: ChronossusActionId,
  extra: Partial<Omit<ChronossusActionInput, 'actionId'>> = {},
): Turn {
  return { kind: 'action', input: { actionId, ...extra } };
}

export function hypersyncTurn(input: HypersyncActionInput): Turn {
  return { kind: 'hypersync', input };
}

const SHAPES: BreakthroughShape[] = ['circle', 'triangle', 'square'];
const CONSTRUCT_IDS: ChronossusActionId[] = [
  'construct-factory',
  'construct-lab',
  'construct-powerplant',
  'construct-support',
];

/**
 * A generous, deterministic Action-Rounds script: cycles Recruit / Mine /
 * Research / Construct (rotating type + shape by Era for variety) / Time
 * Travel / Reboot, repeated enough times to exhaust up to 6 Exosuits. `run`
 * stops issuing new turns once the Chronossus would have to pass, so the
 * length here is just "generous," not exact.
 */
export function defaultActionsForEra(era: number): Turn[] {
  const shape = SHAPES[era % SHAPES.length];
  const constructId = CONSTRUCT_IDS[era % CONSTRUCT_IDS.length];
  const cycle: Turn[] = [
    action('recruit'),
    action('mine-resource'),
    action('research', { shape }),
    action(constructId, { buildingVP: 3 }),
    action('time-travel'),
    action('reboot'),
  ];
  const turns: Turn[] = [];
  for (let i = 0; i < 4; i++) turns.push(...cycle);
  return turns;
}

/** Draws energized cores first, up to 3 (or however many remain) — deterministic. */
export function deterministicEnergyDraw(pool: EnergyPool): EnergyDraw {
  const total = Math.min(3, pool.energized + pool.exhausted);
  const energized = Math.min(total, pool.energized);
  return { energized, exhausted: total - energized };
}

export interface PlaythroughOptions {
  config: GameConfig;
  /** The Chronossus's Action-Rounds script for a given Era. Default: `defaultActionsForEra`. */
  actionsForEra?: (era: number) => Turn[];
  /** Paradoxes placed in the Warp phase for a given Era. Default: `era % 3`. */
  warpRollForEra?: (era: number) => number;
  /** Cycled Paradox-die rolls fed to `rollParadox` until it stops. Default: always 1. */
  paradoxRollCycle?: number[];
  /** Alternate Timelines: positive-effect Warp spaces reported for a given Era's
   *  placed Warp tiles. Default: 0 (no-op unless the module variation overrides it). */
  positiveSpacesForEra?: (era: number, placed: number) => number;
  /** Variable Anomalies: the 2 offered tiles reported whenever `rollParadox` defers a
   *  gain (module active). Default: two -2 VP, non-retrieve-eligible tiles. */
  variableAnomalyCandidates?: () => [VariableAnomalyCandidate, VariableAnomalyCandidate];
}

export interface PlaythroughResult {
  state: GameState;
  score: ChronossusScore;
}

/** Throws if any tracked Chronossus counter has drifted outside its legal range. */
function assertInvariants(state: GameState): void {
  const bot = state.chronossus;
  if (!bot) throw new Error('invariant: missing Chronossus slice');
  if (bot.exosuitsAvailable < 0 || bot.exosuitsAvailable > bot.exosuitsTotal) {
    throw new Error(`invariant: exosuitsAvailable out of range (${bot.exosuitsAvailable}/${bot.exosuitsTotal})`);
  }
  if (bot.anomalies < 0 || bot.anomalies > 3) throw new Error(`invariant: anomalies out of range (${bot.anomalies})`);
  // Variable Anomalies: the held-VP list replaces the flat counter (which stays 0/unused).
  if (bot.anomalyVps && (bot.anomalyVps.length < 0 || bot.anomalyVps.length > 3)) {
    throw new Error(`invariant: anomalyVps out of range (${bot.anomalyVps.length})`);
  }
  if (bot.paradoxes < 0 || bot.paradoxes > 2) throw new Error(`invariant: paradoxes out of range (${bot.paradoxes})`);
  if (bot.energyPool.energized < 0 || bot.energyPool.exhausted < 0) {
    throw new Error('invariant: negative Energy Pool');
  }
  if (bot.warpTilesOnTimeline < 0) throw new Error('invariant: negative warp tiles on the Timeline');
  if (bot.vp < 0) throw new Error('invariant: negative vp');
  for (const type of BUILDING_TYPES) {
    if (bot.buildings[type] > 3) throw new Error(`invariant: too many ${type} buildings (${bot.buildings[type]})`);
  }
  if (bot.superprojects > 3) throw new Error(`invariant: too many superprojects (${bot.superprojects})`);
  if (bot.hypersyncTiles.length > 3) throw new Error('invariant: too many pending Hypersync tiles');
}

/** Runs one Era's Action Rounds: takes `turns` until a pass, then both sides pass. */
function runActionRounds(state: GameState, turns: Turn[]): GameState {
  for (const t of turns) {
    const bot = state.chronossus!;
    if (t.kind === 'action') {
      if (Chronossus.wouldPassOn(bot, t.input.actionId)) break;
      state = Chronossus.resolveAction(state, t.input).state;
    } else {
      state = Chronossus.resolveHypersyncAction(state, t.input).state;
    }
    assertInvariants(state);
  }
  state = Chronossus.passChronossus(state).state;
  return { ...state, playerPassed: true };
}

function setupChronossus(config: GameConfig): GameState {
  const state = createInitialState(config);
  // Mirrors the UI's beginGame: apply setup-time difficulty adjustments (D3) once,
  // before Era 1.
  state.chronossus = Chronossus.applyDifficultySetup(emptyChronossusState(), config);
  state.log = ['Game set up.'];
  return state;
}

/**
 * Drives a full Chronossus game (Setup → Eras 1…MAX_ERA → End Game) through the
 * real `game/flow.ts` sequencing + `bots/chronossus.ts` resolvers, exactly as the
 * UI would call them, with deterministic injected rolls/draws/Actions. Asserts
 * invariants after every phase transition; throws on the first violation.
 */
export function playChronossus(opts: PlaythroughOptions): PlaythroughResult {
  const {
    config,
    actionsForEra = defaultActionsForEra,
    warpRollForEra = (era) => era % 3,
    paradoxRollCycle = [1],
    positiveSpacesForEra = () => 0,
    variableAnomalyCandidates = () => [
      { vp: -2, retrieveEligible: false },
      { vp: -2, retrieveEligible: false },
    ],
  } = opts;

  let state = setupChronossus(config);
  state = startFirstEra(state);
  assertInvariants(state);

  let guard = 0;
  while (!state.finished) {
    if (++guard > 30) throw new Error('playChronossus: guard tripped — Era loop did not terminate');

    state = advanceFromPreparation(state);
    assertInvariants(state);

    if (state.phase === 'paradox') {
      let stop = false;
      let rollGuard = 0;
      while (!stop) {
        if (++rollGuard > 10) throw new Error('playChronossus: guard tripped — Paradox phase did not stop');
        const rolled = paradoxRollCycle[(rollGuard - 1) % paradoxRollCycle.length];
        const res = Chronossus.rollParadox(state, rolled);
        state = res.state;
        stop = res.stop;
        // Variable Anomalies: rollParadox defers the actual gain — resolve it now
        // with the injected 2-tile offer, same as the UI would after player input.
        if (res.instructions.some((i) => i.id === 'paradox-anomaly-variable')) {
          const [a, b] = variableAnomalyCandidates();
          state = Chronossus.resolveVariableAnomalyGain(state, a, b);
        }
      }
      state = Chronossus.endParadoxPhase(state);
      assertInvariants(state);
    }

    const draw = deterministicEnergyDraw(state.chronossus!.energyPool);
    state = Chronossus.resolvePowerUp(state, draw);
    assertInvariants(state);

    const warpPlace = Math.max(0, warpRollForEra(state.era));
    state = Chronossus.resolveWarp(state, warpPlace, positiveSpacesForEra(state.era, warpPlace));
    assertInvariants(state);

    state = runActionRounds(state, actionsForEra(state.era));
    assertInvariants(state);

    state = Chronossus.resolveCleanUp(state);
    assertInvariants(state);

    state = finishEra(state);
  }

  const score = Chronossus.scoreChronossus(state.chronossus!, state.config.difficulty);
  return { state, score };
}
