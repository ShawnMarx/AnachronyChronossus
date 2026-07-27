// The Chronobot automa — the base-game solo opponent.
//
// This module is pure: every function takes state (+ any dice/answers the app
// has already rolled or the player supplied) and returns new state plus the
// Instructions to show. No randomness lives here, so it is fully unit-testable;
// the UI layer rolls dice and feeds the results in.

import type {
  BreakthroughShape,
  GameConfig,
  Resource,
  Worker,
} from '../types';
import { BREAKTHROUGH_SHAPES } from '../types';
import {
  createInitialState,
  emptyChronobotState,
  type ChronobotState,
  type GameState,
  type Instruction,
} from '../state';
import {
  actionDef,
  MINE_PRIORITY,
  RECRUIT_PRIORITY,
  REMOVE_ANOMALY_PRIORITY,
  type ChronobotActionId,
} from '../rules/chronobotActions';

// --------------------------------------------------------------------------
// Pure decision helpers (exported for tests)
// --------------------------------------------------------------------------

/** Resources the Mine can yield (Neutronium is never mined). */
const MINEABLE: Resource[] = ['uranium', 'gold', 'titanium'];

/**
 * The 2 Resource types the Chronobot wants most from a Mine space:
 * prioritise types it does NOT have, breaking ties by Neutronium > Uranium >
 * Gold > Titanium (restricted to mineable resources).
 */
export function rankMineResources(bot: ChronobotState): Resource[] {
  return [...MINEABLE].sort((a, b) => {
    const lackA = bot.resources[a] === 0 ? 0 : 1;
    const lackB = bot.resources[b] === 0 ? 0 : 1;
    if (lackA !== lackB) return lackA - lackB; // lacking first
    return MINE_PRIORITY.indexOf(a) - MINE_PRIORITY.indexOf(b);
  });
}

export function chooseMineResources(bot: ChronobotState): Resource[] {
  return rankMineResources(bot).slice(0, 2);
}

/**
 * All 4 tracked Resources in the order the dialog should present them: the
 * Chronobot's full Mine priority (lacking-first, then Neutronium > Uranium >
 * Gold > Titanium). Neutronium is shown for priority context even though Mine
 * spaces don't normally yield it.
 */
export function mineResourceOrder(bot: ChronobotState): Resource[] {
  return [...MINE_PRIORITY].sort((a, b) => {
    const lackA = bot.resources[a] === 0 ? 0 : 1;
    const lackB = bot.resources[b] === 0 ? 0 : 1;
    if (lackA !== lackB) return lackA - lackB; // lacking first
    return MINE_PRIORITY.indexOf(a) - MINE_PRIORITY.indexOf(b);
  });
}

/** The Worker type the Chronobot targets when recruiting, or null if it has all 4. */
export function chooseRecruitWorker(bot: ChronobotState): Worker | null {
  const target = RECRUIT_PRIORITY.find((w) => bot.workers[w] === 0);
  return target ?? null;
}

/**
 * The Resource cubes the Chronobot discards to Remove an Anomaly. It discards
 * cubes it has most of (Neutronium counts as 2), ties broken by
 * Titanium > Gold > Uranium > Neutronium, until 2 "cube-value" is spent.
 * Returns the list of cubes to remove, or null if it cannot spend 2.
 */
export function chooseRemoveAnomalyDiscards(
  bot: ChronobotState,
): Resource[] | null {
  const pool: Record<Resource, number> = { ...bot.resources };
  const value = (r: Resource) => (r === 'neutronium' ? 2 : 1);
  const picks: Resource[] = [];
  let spent = 0;
  while (spent < 2) {
    const candidates = REMOVE_ANOMALY_PRIORITY.filter((r) => pool[r] > 0);
    if (candidates.length === 0) return null; // not enough to spend
    // most-of first; tie by REMOVE_ANOMALY_PRIORITY order
    candidates.sort((a, b) => {
      if (pool[b] !== pool[a]) return pool[b] - pool[a];
      return REMOVE_ANOMALY_PRIORITY.indexOf(a) - REMOVE_ANOMALY_PRIORITY.indexOf(b);
    });
    const pick = candidates[0];
    pool[pick] -= 1;
    picks.push(pick);
    spent += value(pick);
  }
  return picks;
}

/** The Breakthrough shape the Chronobot discards for a Superproject (most-of; else null). */
export function chooseBreakthroughDiscard(
  bot: ChronobotState,
): BreakthroughShape | null {
  const owned = BREAKTHROUGH_SHAPES.filter((s) => bot.breakthroughs[s] > 0);
  if (owned.length === 0) return null;
  owned.sort((a, b) => bot.breakthroughs[b] - bot.breakthroughs[a]);
  return owned[0];
}

// --------------------------------------------------------------------------
// Setup
// --------------------------------------------------------------------------

export function setup(config: GameConfig): GameState {
  const state = createInitialState(config);
  state.chronobot = emptyChronobotState();
  state.phase = 'setup';
  state.currentInstructions = setupInstructions();
  state.log = ['Game set up. Chronobot is the First Player in Era 1.'];
  return state;
}

function setupInstructions(): Instruction[] {
  return [
    {
      id: 'setup-board',
      text: 'Use the Chronobot side of the Solo board; place it next to the Main board.',
    },
    {
      id: 'setup-exosuits',
      text: 'Give the Chronobot its 6 Exosuits and 8 Warp tiles.',
      detail: 'It receives no Starting Assets and no Workers.',
    },
    {
      id: 'setup-commands',
      text: 'Place the 4 Command tokens on the 4 marked positions on the Chronobot board.',
      detail: 'The Chronobot does not use a Focus marker. Its die is the AI die (the Flux die reused).',
    },
    {
      id: 'setup-banner',
      text: "Place the Chronobot's Banner on the First Player spot — it is First Player in Era 1.",
      detail: 'You take 1 additional Water for being the second player.',
    },
    {
      id: 'setup-endgame',
      text: 'Leave all Endgame Condition cards in the box.',
    },
    {
      id: 'setup-player',
      text: 'Choose the "A" or "B" side of your Player board and set up your own game normally.',
    },
  ];
}

// --------------------------------------------------------------------------
// Phase: Paradox
// --------------------------------------------------------------------------

/**
 * Resolve the Chronobot's Paradox phase. `gainedAnomaly` is what the app rolled
 * (the Chronobot rolls last; on an Anomaly it stops).
 */
export function resolveParadox(state: GameState, gainedAnomaly: boolean): GameState {
  const bot = { ...state.chronobot };
  const instructions: Instruction[] = [];
  if (gainedAnomaly && bot.anomalies >= 3) {
    instructions.push({
      id: 'paradox-capped',
      text: 'The Chronobot already has 3 Anomalies — it gains no Anomaly and removes no Warp tile.',
    });
  } else if (gainedAnomaly) {
    bot.anomalies += 1;
    const removed = bot.warpTilesOnTimeline > 0;
    if (removed) bot.warpTilesOnTimeline -= 1;
    instructions.push({
      id: 'paradox-anomaly',
      text: 'The Chronobot gains 1 Anomaly and stops rolling.',
      detail: removed
        ? 'Remove one of the Chronobot’s Warp tiles from the Timeline tile where it has the most (oldest if tied).'
        : 'It has no Warp tiles on the Timeline to remove.',
    });
  } else {
    instructions.push({
      id: 'paradox-none',
      text: 'The Chronobot gains no Anomaly this Era.',
    });
  }
  return advance(state, bot, 'powerup', instructions, `Paradox phase (Era ${state.era}).`);
}

// --------------------------------------------------------------------------
// Phase: Power Up
// --------------------------------------------------------------------------

export function resolvePowerUp(state: GameState): GameState {
  const bot = { ...state.chronobot };
  const count = state.impact ? 4 : 6;
  bot.exosuitsAvailable = Math.min(count, bot.exosuitsTotal);
  bot.actionsThisEra = 0;
  bot.passed = false;
  const instructions: Instruction[] = [
    {
      id: 'powerup',
      text: `Power up ${bot.exosuitsAvailable} of the Chronobot's Exosuits.`,
      detail:
        (state.impact ? 'Post-Impact' : 'Pre-Impact') +
        ': the Chronobot powers up ' +
        (state.impact ? '4' : '6') +
        ' Exosuits. It neither gains nor spends Energy Cores or Water. Pile the powered-up Exosuit markers on the upper-right hex slot.',
    },
  ];
  return advance(state, bot, 'warp', instructions, `Power Up phase (${bot.exosuitsAvailable} Exosuits).`);
}

// --------------------------------------------------------------------------
// Phase: Warp
// --------------------------------------------------------------------------

/** `paradoxes` is the number the app rolled on the Paradox die (0..3). */
export function resolveWarp(state: GameState, paradoxes: number): GameState {
  const bot = { ...state.chronobot };
  const place = Math.max(0, paradoxes);
  bot.warpTilesOnTimeline += place;
  const instructions: Instruction[] = [
    {
      id: 'warp',
      text: place > 0
        ? `Place ${place} Warp tile${place === 1 ? '' : 's'} for the Chronobot on the Timeline.`
        : 'The Chronobot places no Warp tiles this Era.',
      detail:
        'Warping happens in player order. The Chronobot gains nothing for its Warp tiles and it does not matter which tiles it places. (You place your own 0–2 Warp tiles as normal.)',
    },
  ];
  return advance(state, bot, 'actions', instructions, `Warp phase (placed ${place}).`);
}

// --------------------------------------------------------------------------
// Phase: Action Rounds
// --------------------------------------------------------------------------

export interface ActionTurnInput {
  /** The AI die result (the app rolled it). */
  dieRoll: number;
  /** The action the active Command token landed on (from board / player). */
  actionId: ChronobotActionId;
  /** For Research / Recruit-Genius-Research: the shape die result if rolled. */
  shape?: BreakthroughShape;
  /** For Recruit-Genius-Research: whether a Genius is available on the board. */
  geniusAvailable?: boolean;
  /** Player override: no available Action space at all (Failed, no Exosuit). */
  noSpaceAvailable?: boolean;
  /**
   * For a successful Construct of a building type: the VP printed on the tile
   * the player took. It is added to the Chronobot's score and the tile discarded.
   */
  buildingVP?: number;
  /**
   * For a Mine Resource action: the 2 Resources the player granted from the Mine
   * space actually used. Defaults to `chooseMineResources` when omitted.
   */
  minedResources?: Resource[];
  /**
   * For a Recruit action: the Worker type the player granted (board availability
   * may differ from the priority target). Defaults to `chooseRecruitWorker`.
   */
  recruitedWorker?: Worker;
}

export interface ActionTurnResult {
  state: GameState;
  instructions: Instruction[];
}

/** Whether the Chronobot still has a powered Exosuit to place. */
export function botHasExosuit(bot: ChronobotState): boolean {
  return bot.exosuitsAvailable > 0;
}

/**
 * Resolve a single Chronobot Action-Rounds turn. Returns the updated state and
 * the instructions to show the player.
 */
export function takeActionTurn(
  state: GameState,
  input: ActionTurnInput,
): ActionTurnResult {
  const bot: ChronobotState = {
    ...state.chronobot,
    resources: { ...state.chronobot.resources },
    workers: { ...state.chronobot.workers },
    breakthroughs: { ...state.chronobot.breakthroughs },
    buildings: { ...state.chronobot.buildings },
  };
  const def = actionDef(input.actionId);
  const instr: Instruction[] = [];

  instr.push({
    id: `turn-die-${bot.totalActions}`,
    text: `AI die shows ${input.dieRoll} → the Command token with that number performs the "${def.label}" action on its space, then advances along its colored arrow.`,
    detail: def.summary,
  });

  const failNoSpace = () => {
    instr.push({
      id: `fail-nospace-${bot.totalActions}`,
      text: 'No available Action space — the Chronobot does NOT place an Exosuit and takes +1 VP.',
      effect: { vp: 1 },
    });
    bot.vp += 1;
  };
  const failCantPerform = (why: string) => {
    const place = def.placesExosuit;
    if (place) bot.exosuitsAvailable = Math.max(0, bot.exosuitsAvailable - 1);
    instr.push({
      id: `fail-perform-${bot.totalActions}`,
      text: `Failed Action: ${why} — the Chronobot ${place ? 'places an Exosuit and ' : ''}takes +1 VP instead.`,
      effect: { vp: 1 },
    });
    bot.vp += 1;
  };

  if (input.noSpaceAvailable) {
    failNoSpace();
    return finishTurn(state, bot, instr);
  }

  switch (input.actionId) {
    case 'reboot':
      instr.push({
        id: `reboot-${bot.totalActions}`,
        text: 'Reboot: the Chronobot does nothing (no Exosuit, no VP, not a Failed Action).',
      });
      break;

    case 'research':
      resolveResearch(bot, instr, input.shape);
      consumeExosuit(bot, def);
      break;

    case 'recruit':
      resolveRecruit(bot, instr, input.recruitedWorker);
      consumeExosuit(bot, def);
      break;

    case 'recruit-genius-research':
      if (input.geniusAvailable) {
        bot.workers.genius += 1;
        bot.vp += 1;
        instr.push({
          id: `rgr-genius-${bot.totalActions}`,
          text: 'Recruit a Genius for the Chronobot (+1 VP).',
          effect: { vp: 1 },
        });
        consumeExosuit(bot, def);
      } else {
        instr.push({
          id: `rgr-research-${bot.totalActions}`,
          text: 'No Genius available — perform a Research action instead.',
        });
        resolveResearch(bot, instr, input.shape);
        consumeExosuit(bot, def);
      }
      break;

    case 'mine-resource':
      resolveMine(bot, instr, input.minedResources);
      consumeExosuit(bot, def);
      break;

    case 'time-travel':
      resolveTimeTravel(bot, instr);
      break;

    case 'remove-anomaly': {
      const discards = chooseRemoveAnomalyDiscards(bot);
      if (bot.anomalies < 1 || !discards) {
        failCantPerform(
          bot.anomalies < 1 ? 'it has no Anomaly to remove' : 'it lacks 2 Resource cubes to spend',
        );
      } else {
        for (const r of discards) bot.resources[r] -= 1;
        bot.anomalies -= 1;
        consumeExosuit(bot, def);
        instr.push({
          id: `ra-${bot.totalActions}`,
          text: `Discard ${describeCubes(discards)} from the Chronobot and remove 1 Anomaly.`,
          detail: 'Discards the Resources it has most of; ties: Titanium > Gold > Uranium > Neutronium (1 Neutronium = 2 cubes).',
        });
      }
      break;
    }

    case 'construct-factory':
    case 'construct-lab':
    case 'construct-powerplant':
    case 'construct-support': {
      const type = input.actionId.replace('construct-', '') as keyof ChronobotState['buildings'];
      const label = def.label.replace('Construct — ', '');
      if (bot.buildings[type] >= 3) {
        failCantPerform(`it already has 3 ${label} buildings`);
      } else {
        bot.buildings[type] += 1;
        consumeExosuit(bot, def);
        const vp = input.buildingVP ?? 0;
        if (vp > 0) {
          bot.vp += vp;
          bot.buildingVp += vp;
          instr.push({
            id: `construct-${bot.totalActions}`,
            text: `Give the Chronobot the higher-VP ${label} (secondary stack if tied) — worth ${vp} VP. Add ${vp} to its score, then discard the tile.`,
            effect: { vp },
          });
        } else {
          instr.push({
            id: `construct-${bot.totalActions}`,
            text: `Give the Chronobot the higher-VP ${label} (secondary stack if tied); record its printed VP, then discard the tile.`,
            requiresInput: true,
          });
        }
      }
      break;
    }

    case 'construct-superproject': {
      const discard = chooseBreakthroughDiscard(bot);
      if (bot.superprojects >= 3 || !discard) {
        failCantPerform(
          bot.superprojects >= 3 ? 'it already has 3 Superprojects' : 'it has no Breakthrough to discard',
        );
      } else {
        bot.breakthroughs[discard] -= 1;
        bot.superprojects += 1;
        consumeExosuit(bot, def);
        const vp = input.buildingVP ?? 0;
        if (vp > 0) {
          bot.vp += vp;
          bot.buildingVp += vp;
          instr.push({
            id: `superproject-${bot.totalActions}`,
            text: `Discard 1 ${discard} Breakthrough, then give the Chronobot the highest-VP face-up Superproject (oldest if tied) — worth ${vp} VP. Add ${vp} to its score.`,
            effect: { vp },
          });
        } else {
          instr.push({
            id: `superproject-${bot.totalActions}`,
            text: `Discard 1 ${discard} Breakthrough, then give the Chronobot the highest-VP face-up Superproject (oldest if tied); record its VP.`,
            requiresInput: true,
          });
        }
      }
      break;
    }

    case 'evacuation':
      instr.push({
        id: `evac-${bot.totalActions}`,
        text: 'The Chronobot never takes Evacuation — advance the token per the board routing.',
      });
      break;
  }

  return finishTurn(state, bot, instr);
}

function finishTurn(
  state: GameState,
  bot: ChronobotState,
  instr: Instruction[],
): ActionTurnResult {
  bot.actionsThisEra += 1;
  bot.totalActions += 1;
  const next: GameState = {
    ...state,
    chronobot: bot,
    currentInstructions: instr,
    log: [...state.log, `Chronobot action ${bot.totalActions} (Era ${state.era}).`],
  };
  return { state: next, instructions: instr };
}

function consumeExosuit(bot: ChronobotState, def: { placesExosuit: boolean }): void {
  if (def.placesExosuit && bot.exosuitsAvailable > 0) {
    bot.exosuitsAvailable -= 1;
  }
}

/**
 * Apply a Time Travel Action to `bot`, pushing the player instruction. If it has
 * no Warp tiles on the Timeline the Action is Failed (+1 VP); otherwise it removes
 * one and advances the track. Time Travel never places an Exosuit. Shared by the
 * rolled Action turn and the out-of-Exosuits pass sequence.
 */
function resolveTimeTravel(bot: ChronobotState, instr: Instruction[]): void {
  if (bot.warpTilesOnTimeline <= 0) {
    instr.push({
      id: `tt-fail-${bot.totalActions}`,
      text: 'No Warp tiles remain on the Timeline — Time Travel is Failed; the Chronobot takes +1 VP (no Exosuit).',
      effect: { vp: 1 },
    });
    bot.vp += 1;
  } else {
    bot.warpTilesOnTimeline -= 1;
    bot.timeTravelTrack += 1;
    instr.push({
      id: `tt-${bot.totalActions}`,
      text: 'Remove one of the Chronobot’s Warp tiles from the past Timeline tile where it has the most (oldest if tied); advance its Time Travel marker 1 spot along the track.',
      detail: `Time Travel places no Exosuit. The marker is now worth ${timeTravelVp(bot)} VP.`,
    });
  }
}

function resolveResearch(
  bot: ChronobotState,
  instr: Instruction[],
  shape?: BreakthroughShape,
): void {
  if (shape) {
    bot.breakthroughs[shape] += 1;
    instr.push({
      id: `research-${bot.totalActions}`,
      text: `Research: the shape die shows ${shape} — give the Chronobot any Breakthrough of that shape.`,
    });
  } else {
    instr.push({
      id: `research-noshape-${bot.totalActions}`,
      text: 'Research: roll the shape die and give the Chronobot any Breakthrough of the rolled shape.',
      requiresInput: true,
    });
  }
}

function resolveRecruit(bot: ChronobotState, instr: Instruction[], recruited?: Worker): void {
  const target = recruited ?? chooseRecruitWorker(bot);
  if (target) bot.workers[target] += 1;
  bot.vp += 1;
  instr.push({
    id: `recruit-${bot.totalActions}`,
    text: `Recruit a ${target} for the Chronobot (+1 VP).`,
    detail:
      'Priority: Genius > Administrator > Engineer > Scientist. If unavailable, take the next available type by that order (still +1 VP). No Recruit bonus.',
    effect: { vp: 1 },
  });
  // Set bonus: once it holds all 4 Worker types, discard one of each for +5 VP.
  if (RECRUIT_PRIORITY.every((w) => bot.workers[w] > 0)) {
    for (const w of RECRUIT_PRIORITY) bot.workers[w] -= 1;
    bot.vp += 5;
    instr.push({
      id: `recruit-set-${bot.totalActions}`,
      text: 'The Chronobot now holds all 4 Worker types — discard one of each and add 5 VP to its score.',
      effect: { vp: 5 },
    });
  }
}

/** VP scored for the Chronobot's Time Travel track position (start + 6 advances). */
export const TIME_TRAVEL_VP: number[] = [0, 2, 4, 6, 8, 10, 12];

/** The Time Travel track marker index (clamped to the last spot). */
export function timeTravelSpot(bot: ChronobotState): number {
  return Math.min(Math.max(bot.timeTravelTrack, 0), TIME_TRAVEL_VP.length - 1);
}

/** VP the Chronobot currently scores from its Time Travel track position. */
export function timeTravelVp(bot: ChronobotState): number {
  return TIME_TRAVEL_VP[timeTravelSpot(bot)];
}

/** VP from Breakthroughs: 1 per Breakthrough + 2 per complete shape set (one of each). */
export function breakthroughVp(bot: ChronobotState): number {
  const total = BREAKTHROUGH_SHAPES.reduce((n, s) => n + bot.breakthroughs[s], 0);
  const completeSets = Math.min(...BREAKTHROUGH_SHAPES.map((s) => bot.breakthroughs[s]));
  return total + completeSets * 2;
}

/**
 * All 4 Worker types in the order the Recruit dialog presents them: missing-first,
 * then Genius > Administrator > Engineer > Scientist.
 */
export function recruitWorkerOrder(bot: ChronobotState): Worker[] {
  return [...RECRUIT_PRIORITY].sort((a, b) => {
    const lackA = bot.workers[a] === 0 ? 0 : 1;
    const lackB = bot.workers[b] === 0 ? 0 : 1;
    if (lackA !== lackB) return lackA - lackB; // missing first
    return RECRUIT_PRIORITY.indexOf(a) - RECRUIT_PRIORITY.indexOf(b);
  });
}

/** The 4 Resource types tracked toward the Chronobot's +5 VP set bonus. */
export const SET_BONUS_RESOURCES: Resource[] = ['neutronium', 'uranium', 'gold', 'titanium'];

function resolveMine(bot: ChronobotState, instr: Instruction[], mined?: Resource[]): void {
  const gained = mined && mined.length ? mined : chooseMineResources(bot);
  for (const r of gained) bot.resources[r] += 1;
  instr.push({
    id: `mine-${bot.totalActions}`,
    text: `Mine: give the Chronobot ${gained.join(' + ')} from the Mine space you used.`,
    detail:
      'It wants the 2 Resources it lacks; ties: Neutronium > Uranium > Gold > Titanium.',
  });
  // Set bonus: once it holds all 4 tracked Resource types, discard one of each for +5 VP.
  if (SET_BONUS_RESOURCES.every((r) => bot.resources[r] > 0)) {
    for (const r of SET_BONUS_RESOURCES) bot.resources[r] -= 1;
    bot.vp += 5;
    instr.push({
      id: `mine-set-${bot.totalActions}`,
      text: 'The Chronobot now holds all 4 Resource types — discard one of each and add 5 VP to its score.',
      effect: { vp: 5 },
    });
  }
}

// --------------------------------------------------------------------------
// Passing and end of Actions (rulebook p. 6)
// --------------------------------------------------------------------------

/** The Chronobot never takes fewer than this many Actions per Era (rulebook p. 6). */
export const CHRONOBOT_MIN_ACTIONS = 3;

/**
 * Difficulty flag (rulebook p. 6, "Increasing the Difficulty"): raise the
 * Chronobot's minimum Actions per Era from 3 to 6.
 */
export const DIFFICULTY_MIN_ACTIONS_6 = 'min-actions-6';

/** The minimum Actions the Chronobot must take this Era — 3, or 6 on hard. */
export function chronobotMinActions(state: GameState): number {
  return state.config.difficulty.includes(DIFFICULTY_MIN_ACTIONS_6)
    ? 6
    : CHRONOBOT_MIN_ACTIONS;
}

export type BotPassDecision =
  | 'continue'
  | 'must-continue-min3'
  | 'time-travel-then-pass'
  | 'pass';

/**
 * Whether the Action Rounds phase can end: both players have passed AND the
 * Chronobot has taken at least its minimum Actions for the Era.
 */
export function actionRoundsCanEnd(state: GameState): boolean {
  const bot = state.chronobot;
  return (
    state.playerPassed && bot.passed && bot.actionsThisEra >= chronobotMinActions(state)
  );
}

/**
 * Decide what the Chronobot does on its next turn, per "Passing and End of
 * Actions" (rulebook p. 6):
 *
 *  1. Once it has run out of Exosuits, it takes a Time Travel Action on its next
 *     turn (if able), then passes.
 *  2. However, if you pass *first* (before it has passed) and it has taken at
 *     least its minimum Actions, the Action Rounds Phase ends immediately — this
 *     exception preempts the owed Time Travel of rule 1.
 *  3. If it has not yet reached its minimum, it keeps taking turns until it has.
 */
export function botPassDecision(state: GameState): BotPassDecision {
  const bot = state.chronobot;
  const min = chronobotMinActions(state);
  if (bot.passed) return 'pass';
  // Rule 2 (the "However" exception) is checked first: it ends the phase even
  // when the bot is out of Exosuits and would otherwise owe a final Time Travel.
  if (state.playerPassed && bot.actionsThisEra >= min) return 'pass';
  // Still has Exosuits → keep taking normal Action turns.
  if (botHasExosuit(bot)) return 'continue';
  // Rule 3: below the minimum, it must keep taking turns until it reaches it.
  if (bot.actionsThisEra < min) return 'must-continue-min3';
  // Rule 1: out of Exosuits and at/above the minimum → one Time Travel, then pass.
  return 'time-travel-then-pass';
}

export function markBotPassed(state: GameState): GameState {
  return { ...state, chronobot: { ...state.chronobot, passed: true } };
}

/**
 * Resolve the Chronobot's turn when it is passing (or continuing toward its
 * minimum), driven by `botPassDecision`. The two terminal outcomes mutate state:
 *
 *  - `pass`: mark the bot passed and explain why (met its minimum / immediate end).
 *  - `time-travel-then-pass`: take one Time Travel Action (counts as a turn),
 *    then mark the bot passed.
 *
 * For the "keep going" outcomes (`continue`, `must-continue-min3`) it leaves
 * state unchanged and returns an explanatory instruction — the caller keeps
 * taking normal Action turns via `takeActionTurn`.
 */
export function resolveBotPass(state: GameState): ActionTurnResult {
  const decision = botPassDecision(state);
  const min = chronobotMinActions(state);

  if (decision === 'continue' || decision === 'must-continue-min3') {
    const instr: Instruction[] = [
      {
        id: `pass-continue-${state.chronobot.totalActions}`,
        text:
          decision === 'continue'
            ? 'The Chronobot still has Exosuits — it keeps taking turns. Roll the AI die for its next Action.'
            : `The Chronobot has taken ${state.chronobot.actionsThisEra} of its minimum ${min} Actions — it keeps taking turns until it reaches ${min}.`,
      },
    ];
    return { state: { ...state, currentInstructions: instr }, instructions: instr };
  }

  if (decision === 'time-travel-then-pass') {
    const bot: ChronobotState = {
      ...state.chronobot,
      resources: { ...state.chronobot.resources },
      workers: { ...state.chronobot.workers },
      breakthroughs: { ...state.chronobot.breakthroughs },
      buildings: { ...state.chronobot.buildings },
    };
    const instr: Instruction[] = [
      {
        id: `pass-tt-${bot.totalActions}`,
        text: 'The Chronobot is out of Exosuits — it takes one final Time Travel Action, then passes.',
      },
    ];
    resolveTimeTravel(bot, instr);
    bot.passed = true;
    // finishTurn bumps actionsThisEra / totalActions (the Time Travel counts as a turn).
    return finishTurn(state, bot, instr);
  }

  // decision === 'pass'
  const already = state.chronobot.passed;
  const instr: Instruction[] = [
    {
      id: `pass-${state.chronobot.totalActions}`,
      text: already
        ? 'The Chronobot has already passed for this Era.'
        : state.playerPassed
          ? `You passed and the Chronobot has taken its minimum ${min} Actions — the Action Rounds Phase ends immediately.`
          : 'The Chronobot passes for this Era.',
    },
  ];
  const next = markBotPassed({ ...state, currentInstructions: instr });
  return { state: next, instructions: instr };
}

export function markPlayerPassed(state: GameState): GameState {
  return { ...state, playerPassed: true };
}

// --------------------------------------------------------------------------
// Phase: Clean Up + Era advance
// --------------------------------------------------------------------------

export function resolveCleanUp(state: GameState): GameState {
  const bot = { ...state.chronobot, exosuitsAvailable: 0 };
  const instructions: Instruction[] = [
    {
      id: 'cleanup-retrieve',
      text: "Retrieve the Chronobot's Exosuits along with your own.",
    },
    {
      id: 'cleanup-collapse',
      text: 'After the Impact, follow the usual procedure for flipping Collapsing Capital tiles.',
    },
  ];
  return {
    ...state,
    chronobot: bot,
    phase: 'cleanup',
    currentInstructions: instructions,
    log: [...state.log, `Clean Up phase (Era ${state.era}).`],
  };
}

export function startNextEra(state: GameState): GameState {
  return {
    ...state,
    era: state.era + 1,
    phase: 'paradox',
    playerPassed: false,
    chronobot: { ...state.chronobot, passed: false, actionsThisEra: 0 },
    currentInstructions: [],
    log: [...state.log, `— Era ${state.era + 1} begins —`],
  };
}

// --------------------------------------------------------------------------
// End of game scoring
// --------------------------------------------------------------------------

export interface ChronobotScore {
  duringGameVP: number;
  breakthroughVP: number;
  shapeSetBonus: number;
  total: number;
}

export function scoreChronobot(bot: ChronobotState): ChronobotScore {
  const breakthroughTotal = BREAKTHROUGH_SHAPES.reduce(
    (n, s) => n + bot.breakthroughs[s],
    0,
  );
  const completeSets = Math.min(...BREAKTHROUGH_SHAPES.map((s) => bot.breakthroughs[s]));
  const shapeSetBonus = completeSets * 2;
  return {
    duringGameVP: bot.vp,
    breakthroughVP: breakthroughTotal,
    shapeSetBonus,
    total: bot.vp + breakthroughTotal + shapeSetBonus,
  };
}

// --------------------------------------------------------------------------
// Small helpers
// --------------------------------------------------------------------------

function advance(
  state: GameState,
  bot: ChronobotState,
  nextPhase: GameState['phase'],
  instructions: Instruction[],
  logLine: string,
): GameState {
  return {
    ...state,
    chronobot: bot,
    phase: nextPhase,
    currentInstructions: instructions,
    log: [...state.log, logLine],
  };
}

function describeCubes(cubes: Resource[]): string {
  const counts: Partial<Record<Resource, number>> = {};
  for (const c of cubes) counts[c] = (counts[c] ?? 0) + 1;
  return Object.entries(counts)
    .map(([r, n]) => `${n} ${r}`)
    .join(' + ');
}
