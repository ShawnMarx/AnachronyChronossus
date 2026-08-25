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
import { placeWarpTiles, removeWarpTile, warpRemoval, warpTileLabel } from '../warpTiles';
import { msg, plural, type Msg, type MsgList } from '../message';
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
 * The Mine ranking: **fewest first**, ties broken by Neutronium > Uranium > Gold >
 * Titanium (restricted to mineable resources).
 *
 * "It prioritizes Resources it does not have" is about the +5 VP SET — holding one of
 * each is the thing the Chronobot is actually chasing, so the set is the top priority and
 * fewest-of is how it gets there. A zero is always the fewest, so set completion falls out
 * of the same comparison; and after the set fires (one of each discarded) the counts still
 * decide, which a has-it/lacks-it test could not do — it fell straight through to the fixed
 * order and would take a third Neutronium over a lone Titanium.
 */
export function rankMineResources(bot: ChronobotState, counts = bot.resources): Resource[] {
  return [...MINEABLE].sort((a, b) => {
    if (counts[a] !== counts[b]) return counts[a] - counts[b]; // fewest first
    return MINE_PRIORITY.indexOf(a) - MINE_PRIORITY.indexOf(b);
  });
}

/**
 * The 2 Resources it wants most, decided **per pick**: it takes the fewest, counts that
 * one as gained, then decides again. So a type can be taken twice when it is still the
 * fewest afterwards (a Mine space showing two of one Resource), which a single sorted
 * slice could never express.
 */
export function chooseMineResources(bot: ChronobotState): Resource[] {
  const counts = { ...bot.resources };
  const picked: Resource[] = [];
  for (let i = 0; i < 2; i++) {
    const next = rankMineResources(bot, counts)[0];
    picked.push(next);
    counts[next] += 1;
  }
  return picked;
}

/**
 * All 4 tracked Resources in the order the dialog should present them: the
 * Chronobot's full Mine priority (fewest-first, then Neutronium > Uranium >
 * Gold > Titanium). Neutronium is shown for priority context even though Mine
 * spaces don't normally yield it.
 */
export function mineResourceOrder(bot: ChronobotState): Resource[] {
  return [...MINE_PRIORITY].sort((a, b) => {
    if (bot.resources[a] !== bot.resources[b]) return bot.resources[a] - bot.resources[b];
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
// Command tokens & Action paths (Solo Opponents rulebook)
// --------------------------------------------------------------------------
//
// The Chronobot has 4 Command tokens numbered 2–5, moving along two looping
// Action paths on the Solo board. The AI die (the Flux die: faces 2,3,3,4,4,5)
// selects which token activates: it performs the Action on its current path
// step, then advances one step along its path (looping back to the start).
//
// This module owns only the sequences + advancement (pure, testable). The board
// %-coordinates for each step live in `src/board/chronobotPaths.ts` (UI layer).

/** The 4 Chronobot Command tokens, matching the AI die faces. */
export type CommandToken = 2 | 3 | 4 | 5;
export const COMMAND_TOKENS: CommandToken[] = [2, 3, 4, 5];

/** The two Action paths the Command tokens travel. */
export type PathId = 'short' | 'long';

/** A token's location: which path and which step index along it. */
export interface CommandTokenPos {
  path: PathId;
  index: number;
}

/**
 * The ordered Actions on each looping path (Solo Opponents rulebook). The Short
 * path is the board's top tile row; the Long path serpentines the middle + lower
 * rows. Both loop back to index 0 after the last step.
 */
export const CHRONOBOT_PATHS: Record<PathId, ChronobotActionId[]> = {
  short: [
    'construct-support', // Short-1 (Construct Water / Life Support)
    'time-travel', // Short-2
    'construct-superproject', // Short-3
    'remove-anomaly', // Short-4
  ],
  long: [
    'mine-resource', // Long-1
    'construct-powerplant', // Long-2
    'recruit', // Long-3
    'construct-factory', // Long-4
    'reboot', // Long-5
    'recruit-genius-research', // Long-6
    'construct-lab', // Long-7
    'research', // Long-8
  ],
};

/**
 * Where each Command token starts the game (rulebook starting positions):
 *  - 3 → Short-1 (Construct Water)     - 4 → Long-2 (Construct Power Plant)
 *  - 2 → Long-4 (Construct Factory)    - 5 → Long-8 (Research)
 */
export const TOKEN_START: Record<CommandToken, CommandTokenPos> = {
  2: { path: 'long', index: 3 },
  3: { path: 'short', index: 0 },
  4: { path: 'long', index: 1 },
  5: { path: 'long', index: 7 },
};

/**
 * The live state of all 4 Command tokens: where each sits, plus a global stacking
 * order (bottom → top). Two tokens may share a position; the one appearing later
 * in `order` is the one physically on top of the stack.
 */
export interface CommandTokensState {
  positions: Record<CommandToken, CommandTokenPos>;
  order: CommandToken[];
}

/** A fresh set of all 4 Command tokens at their starting positions. */
export function initialCommandTokens(): CommandTokensState {
  return {
    positions: {
      2: { ...TOKEN_START[2] },
      3: { ...TOKEN_START[3] },
      4: { ...TOKEN_START[4] },
      5: { ...TOKEN_START[5] },
    },
    order: [...COMMAND_TOKENS],
  };
}

/** The Action the token at `pos` currently performs. */
export function tokenAction(pos: CommandTokenPos): ChronobotActionId {
  return CHRONOBOT_PATHS[pos.path][pos.index];
}

/** The next step along a path, looping back to the start after the last step. */
export function nextTokenIndex(path: PathId, index: number): number {
  return (index + 1) % CHRONOBOT_PATHS[path].length;
}

/** Advance a token one step along its path (returns a new position). */
export function advanceToken(pos: CommandTokenPos): CommandTokenPos {
  return { path: pos.path, index: nextTokenIndex(pos.path, pos.index) };
}

function samePos(a: CommandTokenPos, b: CommandTokenPos): boolean {
  return a.path === b.path && a.index === b.index;
}

/** Move a token to the top of the global stacking order. */
function toTop(order: CommandToken[], t: CommandToken): CommandToken[] {
  return [...order.filter((x) => x !== t), t];
}

/** The tokens occupying a position, ordered bottom → top. */
export function tokensAtPosition(
  state: CommandTokensState,
  path: PathId,
  index: number,
): CommandToken[] {
  return state.order.filter((t) => samePos(state.positions[t], { path, index }));
}

/**
 * Advance the active Command token one step along its path, applying the stacking
 * rule (Solo Opponents rulebook): a position holds at most two tokens. If the
 * destination already has two, the top one is bumped forward one step *first*,
 * then the active token moves onto the destination (landing on top).
 *
 * With only 3 tokens ever sharing the Long path, a single bump can never cascade
 * (the bumped token's next position is always free), so no recursion is needed.
 */
export function advanceActiveToken(
  state: CommandTokensState,
  token: CommandToken,
  rebootAdvances = false,
): CommandTokensState {
  const positions = { ...state.positions };
  let order = [...state.order];
  const dest = advanceToken(positions[token]);

  const atDest = COMMAND_TOKENS.filter(
    (t) => t !== token && samePos(positions[t], dest),
  );
  if (atDest.length >= 2) {
    // Bump the top token already at the destination forward one step first.
    const top = [...order].reverse().find((t) => atDest.includes(t))!;
    positions[top] = advanceToken(positions[top]);
    order = toTop(order, top);
  }

  positions[token] = dest;
  order = toTop(order, token);
  const result = { positions, order };

  // Difficulty (reboot-advance): if the token just landed on Reboot, advance it
  // once more so it never idles there. Reboot appears once per path, so a single
  // extra step always moves it off — no cascade.
  if (rebootAdvances && tokenAction(dest) === 'reboot') {
    return advanceActiveToken(result, token, false);
  }
  return result;
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
      text: msg('instr.chronobot.setup.board'),
    },
    {
      id: 'setup-exosuits',
      text: msg('instr.chronobot.setup.exosuits'),
      detail: msg('instr.chronobot.setup.exosuits.detail'),
    },
    {
      id: 'setup-commands',
      text: msg('instr.chronobot.setup.commands'),
      detail: msg('instr.chronobot.setup.commands.detail'),
    },
    {
      id: 'setup-banner',
      text: msg('instr.chronobot.setup.banner'),
      detail: msg('instr.chronobot.setup.banner.detail'),
    },
    {
      id: 'setup-endgame',
      text: msg('instr.chronobot.setup.endgame'),
    },
    {
      id: 'setup-player',
      text: msg('instr.chronobot.setup.player'),
    },
  ];
}

// --------------------------------------------------------------------------
// Phase: Paradox
// --------------------------------------------------------------------------

/** Outcome of a single Paradox-die roll during the Paradox phase. */
export interface ParadoxRollResult {
  state: GameState;
  instructions: Instruction[];
  /** The updated Paradox-tracker value after this roll (0–2). */
  paradoxes: number;
  /** True if this roll pushed the tracker to 3, gaining an Anomaly (or would have). */
  gainedAnomaly: boolean;
  /** True once the Chronobot must stop rolling (gained an Anomaly, or capped at 3). */
  stop: boolean;
}

/**
 * Apply a single Paradox-die roll to the Chronobot's tracker. `rolled` is the
 * number the app rolled on the Paradox die (0, 1, or 2). Paradoxes accumulate;
 * reaching 3 resets the tracker to 0 and gains an Anomaly (removing one Warp
 * tile), at which point the Chronobot stops rolling. If it already has 3
 * Anomalies it gains no more (and removes no Warp tile), and also stops.
 *
 * The Chronobot rolls *last* and, unlike you, has no choice — it keeps rolling
 * until it gains an Anomaly (see the phase loop in the UI).
 */
export function rollParadox(state: GameState, rolled: number): ParadoxRollResult {
  const bot = { ...state.chronobot };
  const instructions: Instruction[] = [];
  const gain = Math.max(0, rolled);
  let total = bot.paradoxes + gain;
  let gainedAnomaly = false;
  let stop = false;

  if (total >= 3) {
    gainedAnomaly = true;
    stop = true;
    total -= 3;
    bot.paradoxes = total;
    if (bot.anomalies >= 3) {
      instructions.push({
        id: 'paradox-capped',
        text: msg('instr.chronobot.paradox.capped'),
      });
    } else {
      bot.anomalies += 1;
      // The Paradox phase (2) runs before this Era's Warp phase (4), so everything it has
      // is on a past tile already — the map just has to lose the one it removes.
      const from = warpRemoval(bot, state.era);
      const removed = from.eligible;
      if (removed) {
        bot.warpTilesOnTimeline -= 1;
        if (from.era != null) bot.warpTilesByEra = removeWarpTile(bot.warpTilesByEra, from.era);
      }
      instructions.push({
        id: 'paradox-anomaly',
        text: msg('instr.chronobot.paradox.anomaly', { gain }),
        detail: removed
          ? msg('instr.chronobot.paradox.anomaly.removed', {
              tile:
                from.era != null
                  ? warpTileLabel(from.era)
                  : msg('board.timelineTile.mostOldest'),
              n: total,
            })
          : msg('instr.chronobot.paradox.anomaly.none'),
      });
    }
  } else {
    bot.paradoxes = total;
    instructions.push({
      id: 'paradox-roll',
      text:
        gain === 0
          ? msg('instr.chronobot.paradox.blank')
          : msg('instr.chronobot.paradox.gain', { gain, total }),
    });
  }

  const next: GameState = {
    ...state,
    chronobot: bot,
    currentInstructions: instructions,
    log: [...state.log, `Paradox roll (Era ${state.era}): +${gain} → tracker ${bot.paradoxes}.`],
  };
  return { state: next, instructions, paradoxes: bot.paradoxes, gainedAnomaly, stop };
}

/** Advance out of the Paradox phase to Power Up (call after rolling resolves). */
export function endParadoxPhase(state: GameState): GameState {
  return advance(state, { ...state.chronobot }, 'powerup', [], `Paradox phase done (Era ${state.era}).`);
}

// --------------------------------------------------------------------------
// Phase: Power Up
// --------------------------------------------------------------------------

/** The final Era; the game ends after it (7). */
export const MAX_ERA = 7;

/**
 * Powered Exosuits the Chronobot gets per Era: 6 in Eras 1–4, and 4 in Eras 5–7
 * (fewer late-game, per the rulebook). All its other rules are unchanged.
 */
export function chronobotPoweredExosuits(era: number): number {
  return era >= 5 ? 4 : 6;
}

export function resolvePowerUp(state: GameState): GameState {
  const bot = { ...state.chronobot };
  const count = chronobotPoweredExosuits(state.era);
  bot.exosuitsAvailable = Math.min(count, bot.exosuitsTotal);
  bot.actionsThisEra = 0;
  bot.passed = false;
  const instructions: Instruction[] = [
    {
      id: 'powerup',
      text: msg('instr.chronobot.powerUp', { n: bot.exosuitsAvailable }),
      detail: msg('instr.chronobot.powerUp.detail', { era: state.era }),
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
  // Which Timeline tile they land on is what makes them eligible for Time Travel later.
  bot.warpTilesByEra = placeWarpTiles(bot.warpTilesByEra, state.era, place);
  const instructions: Instruction[] = [
    {
      id: 'warp',
      text:
        place > 0
          ? plural('instr.chronobot.warp.place', place)
          : msg('instr.chronobot.warp.none'),
      detail: msg('instr.chronobot.warp.detail'),
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
    buildingVps: {
      factory: [...state.chronobot.buildingVps.factory],
      lab: [...state.chronobot.buildingVps.lab],
      powerplant: [...state.chronobot.buildingVps.powerplant],
      support: [...state.chronobot.buildingVps.support],
    },
    superprojectVps: [...state.chronobot.superprojectVps],
  };
  const def = actionDef(input.actionId);
  const instr: Instruction[] = [];

  instr.push({
    id: `turn-die-${bot.totalActions}`,
    // The Action's name is a nested descriptor, not `def.label`: it is already published
    // as `action.<id>.label`, so interpolating the English one would put a stray English
    // word in the middle of a translated sentence.
    text: msg('instr.chronobot.turn.die', {
      die: input.dieRoll,
      action: msg(`action.${input.actionId}.label`),
    }),
    detail: def.summary,
  });

  const failNoSpace = () => {
    instr.push({
      id: `fail-nospace-${bot.totalActions}`,
      text: msg('instr.chronobot.failed.noSpace'),
      effect: { vp: 1 },
    });
    bot.vp += 1;
  };
  // `why` is a descriptor, and the "places an Exosuit and" branch is a SEPARATE KEY rather
  // than an interpolated fragment: a conditional English clause dropped into the middle of
  // a sentence has no grammatical home in another language.
  const failCantPerform = (why: Msg) => {
    const place = def.placesExosuit;
    if (place) bot.exosuitsAvailable = Math.max(0, bot.exosuitsAvailable - 1);
    instr.push({
      id: `fail-perform-${bot.totalActions}`,
      text: msg(place ? 'instr.chronobot.failed.placing' : 'instr.chronobot.failed.plain', {
        reason: why,
      }),
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
        text: msg('instr.chronobot.reboot'),
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
          text: msg('instr.chronobot.recruitGenius.genius'),
          effect: { vp: 1 },
        });
        consumeExosuit(bot, def);
      } else {
        instr.push({
          id: `rgr-research-${bot.totalActions}`,
          text: msg('instr.chronobot.recruitGenius.research'),
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
      resolveTimeTravel(bot, instr, state.era);
      break;

    case 'remove-anomaly': {
      const discards = chooseRemoveAnomalyDiscards(bot);
      if (bot.anomalies < 1 || !discards) {
        failCantPerform(
          msg(
            bot.anomalies < 1
              ? 'instr.chronobot.reason.noAnomaly'
              : 'instr.chronobot.reason.lacksCubes',
          ),
        );
      } else {
        for (const r of discards) bot.resources[r] -= 1;
        bot.anomalies -= 1;
        consumeExosuit(bot, def);
        instr.push({
          id: `ra-${bot.totalActions}`,
          text: msg('instr.chronobot.removeAnomaly.done', { cubes: describeCubes(discards) }),
          detail: msg('instr.chronobot.removeAnomaly.detail'),
        });
      }
      break;
    }

    case 'construct-factory':
    case 'construct-lab':
    case 'construct-powerplant':
    case 'construct-support': {
      const type = input.actionId.replace('construct-', '') as keyof ChronobotState['buildings'];
      // `piece.<type>` is the building's published name. The old code sliced it out of the
      // Action label with `replace('Construct — ', '')`, which only works in English.
      const label = msg(`piece.${type}`);
      if (bot.buildings[type] >= 3) {
        failCantPerform(msg('instr.chronobot.reason.threeBuildings', { building: label }));
      } else {
        bot.buildings[type] += 1;
        consumeExosuit(bot, def);
        const vp = input.buildingVP ?? 0;
        if (vp > 0) {
          bot.vp += vp;
          bot.buildingVp += vp;
          bot.buildingVps[type].push(vp);
          instr.push({
            id: `construct-${bot.totalActions}`,
            text: msg('instr.chronobot.construct.knownVp', { building: label, vp }),
            effect: { vp },
          });
        } else {
          instr.push({
            id: `construct-${bot.totalActions}`,
            text: msg('instr.chronobot.construct.recordVp', { building: label }),
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
          msg(
            bot.superprojects >= 3
              ? 'instr.chronobot.reason.threeSuperprojects'
              : 'instr.chronobot.reason.noBreakthrough',
          ),
        );
      } else {
        bot.breakthroughs[discard] -= 1;
        bot.superprojects += 1;
        consumeExosuit(bot, def);
        const vp = input.buildingVP ?? 0;
        if (vp > 0) {
          bot.vp += vp;
          bot.buildingVp += vp;
          bot.superprojectVps.push(vp);
          instr.push({
            id: `superproject-${bot.totalActions}`,
            text: msg('instr.chronobot.superproject.knownVp', {
              shape: msg(`piece.shape.${discard}`),
              vp,
            }),
            effect: { vp },
          });
        } else {
          instr.push({
            id: `superproject-${bot.totalActions}`,
            text: msg('instr.chronobot.superproject.recordVp', {
              shape: msg(`piece.shape.${discard}`),
            }),
            requiresInput: true,
          });
        }
      }
      break;
    }

    case 'evacuation':
      instr.push({
        id: `evac-${bot.totalActions}`,
        text: msg('instr.chronobot.evacuation'),
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
function resolveTimeTravel(bot: ChronobotState, instr: Instruction[], era: number): void {
  // "from the PAST Timeline tile" (rulebook p.5): the tiles this Era's Warp phase put on
  // the current tile are not eligible, so this can fail while its Warp count reads 2.
  const removal = warpRemoval(bot, era);
  if (!removal.eligible) {
    instr.push({
      id: `tt-fail-${bot.totalActions}`,
      // Two whole sentences rather than one with a spliced-in clause: the shared tail
      // ("— Time Travel is Failed; …") reads differently depending on what precedes it.
      text: msg(
        bot.warpTilesOnTimeline > 0
          ? 'instr.chronobot.timeTravel.failCurrentEra'
          : 'instr.chronobot.timeTravel.failNone',
      ),
      effect: { vp: 1 },
    });
    bot.vp += 1;
  } else {
    bot.warpTilesOnTimeline -= 1;
    if (removal.era != null) bot.warpTilesByEra = removeWarpTile(bot.warpTilesByEra, removal.era);
    bot.timeTravelTrack += 1;
    instr.push({
      id: `tt-${bot.totalActions}`,
      text: msg('instr.chronobot.timeTravel.done', {
        tile:
          removal.era != null
            ? warpTileLabel(removal.era)
            : msg('board.timelineTile.mostOldestPast'),
      }),
      detail: msg('instr.chronobot.timeTravel.done.detail', { vp: timeTravelVp(bot) }),
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
      text: msg('instr.chronobot.research.rolled', { shape: msg(`piece.shape.${shape}`) }),
    });
  } else {
    instr.push({
      id: `research-noshape-${bot.totalActions}`,
      text: msg('instr.chronobot.research.roll'),
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
    text: msg('instr.chronobot.recruit.worker', { worker: msg(`piece.${target}`) }),
    detail: msg('instr.chronobot.recruit.detail'),
    effect: { vp: 1 },
  });
  // Set bonus: once it holds all 4 Worker types, discard one of each for +5 VP.
  if (RECRUIT_PRIORITY.every((w) => bot.workers[w] > 0)) {
    for (const w of RECRUIT_PRIORITY) bot.workers[w] -= 1;
    bot.vp += 5;
    instr.push({
      id: `recruit-set-${bot.totalActions}`,
      text: msg('instr.chronobot.recruit.set'),
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
    text: msg('instr.chronobot.mine.gained', {
      cubes: { list: gained.map((r) => msg(`ui.pieceInline.${r}`)), sep: 'msg.cubeJoin', last: 'msg.cubeJoin' },
    }),
    detail: msg('instr.chronobot.mine.detail'),
  });
  // Set bonus: once it holds all 4 tracked Resource types, discard one of each for +5 VP.
  if (SET_BONUS_RESOURCES.every((r) => bot.resources[r] > 0)) {
    for (const r of SET_BONUS_RESOURCES) bot.resources[r] -= 1;
    bot.vp += 5;
    instr.push({
      id: `mine-set-${bot.totalActions}`,
      text: msg('instr.chronobot.mine.set'),
      effect: { vp: 5 },
    });
  }
}

// --------------------------------------------------------------------------
// Passing and end of Actions (rulebook p. 6)
// --------------------------------------------------------------------------

/** The Chronobot never takes fewer than this many Actions per Era (rulebook p. 6). */
export const CHRONOBOT_MIN_ACTIONS = 3;

// --------------------------------------------------------------------------
// Difficulty flags (rulebook p. 6, "Increasing the Difficulty"). Stored in
// GameConfig.difficulty; meaning is defined here.
// --------------------------------------------------------------------------

/** Raise the Chronobot's minimum Actions per Era from 3 to 6. */
export const DIFFICULTY_MIN_ACTIONS_6 = 'min-actions-6';

/**
 * Immediately advance the Command token when it moves onto the Reboot Action,
 * so it performs a real Action on every turn (never idles on Reboot).
 */
export const DIFFICULTY_REBOOT_ADVANCE = 'reboot-advance';

/**
 * Play without your Leader power. Informational only — the app never runs your
 * turn — so it carries no engine effect; shown as a house-rule reminder.
 */
export const DIFFICULTY_NO_LEADER = 'no-leader';

/** The Chronobot takes one additional turn after you have passed. */
export const DIFFICULTY_BOT_EXTRA_TURN = 'bot-extra-turn';

/**
 * Base-game variant: cover the right World Council space with a Hex Unavailable
 * tile. Informational only — it constrains the human's board, which the app
 * never runs — so it carries no engine effect; shown as a setup reminder.
 */
export const DIFFICULTY_HEX_UNAVAILABLE = 'hex-unavailable';

/** The minimum Actions the Chronobot must take this Era — 3, or 6 on hard. */
export function chronobotMinActions(state: GameState): number {
  return state.config.difficulty.includes(DIFFICULTY_MIN_ACTIONS_6)
    ? 6
    : CHRONOBOT_MIN_ACTIONS;
}

export type BotPassDecision =
  | 'continue'
  | 'continue-extra'
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
/**
 * The "bot takes one additional turn after you pass" difficulty applies only in
 * the moment the Chronobot would otherwise pass right after you did — it needs an
 * Exosuit to take a real Action, and only fires once per Era.
 */
function extraTurnApplies(state: GameState): boolean {
  return (
    state.config.difficulty.includes(DIFFICULTY_BOT_EXTRA_TURN) &&
    state.playerPassed &&
    !state.extraTurnAfterPassUsed &&
    botHasExosuit(state.chronobot)
  );
}

export function botPassDecision(state: GameState): BotPassDecision {
  const bot = state.chronobot;
  const min = chronobotMinActions(state);
  if (bot.passed) return 'pass';
  // Rule 2 (the "However" exception) is checked first: it ends the phase even
  // when the bot is out of Exosuits and would otherwise owe a final Time Travel.
  if (state.playerPassed && bot.actionsThisEra >= min) {
    // Difficulty: grant one additional real turn before it passes.
    if (extraTurnApplies(state)) return 'continue-extra';
    return 'pass';
  }
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

  if (
    decision === 'continue' ||
    decision === 'must-continue-min3' ||
    decision === 'continue-extra'
  ) {
    const text =
      decision === 'continue'
        ? 'The Chronobot still has Exosuits — it keeps taking turns. Roll the AI die for its next Action.'
        : decision === 'must-continue-min3'
          ? `The Chronobot has taken ${state.chronobot.actionsThisEra} of its minimum ${min} Actions — it keeps taking turns until it reaches ${min}.`
          : 'Difficulty: the Chronobot takes one additional turn after you passed. Roll the AI die for that Action.';
    const instr: Instruction[] = [
      { id: `pass-continue-${state.chronobot.totalActions}`, text },
    ];
    // Mark the extra turn spent so it only happens once per Era.
    const next =
      decision === 'continue-extra'
        ? { ...state, extraTurnAfterPassUsed: true, currentInstructions: instr }
        : { ...state, currentInstructions: instr };
    return { state: next, instructions: instr };
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
        text: msg('instr.chronobot.pass.finalTimeTravel'),
      },
    ];
    resolveTimeTravel(bot, instr, state.era);
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
        ? msg('instr.chronobot.pass.already')
        : state.playerPassed
          ? msg('instr.chronobot.pass.playerPassed', { min })
          : msg('instr.chronobot.pass.plain'),
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
      text: msg('instr.chronobot.cleanUp.retrieve'),
    },
    {
      id: 'cleanup-collapse',
      text: msg('instr.chronobot.cleanUp.collapse'),
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
    phase: 'preparation',
    playerPassed: false,
    extraTurnAfterPassUsed: false,
    chronobot: { ...state.chronobot, passed: false, actionsThisEra: 0 },
    currentInstructions: [],
    log: [...state.log, `— Era ${state.era + 1} begins —`],
  };
}

// --------------------------------------------------------------------------
// End of game scoring
// --------------------------------------------------------------------------

/** VP lost per Anomaly the Chronobot still holds at game end. */
export const ANOMALY_VP = -3;

export interface ChronobotScore {
  /** During-game VP from tokens/actions, excluding Buildings (Construct tiles). */
  tokenVP: number;
  /** During-game VP from Construct actions (Buildings & Superprojects). */
  buildingVP: number;
  /** tokenVP + buildingVP = the running `bot.vp`. */
  duringGameVP: number;
  /** VP from the Time Travel marker's track position (0/2/4/…/12). */
  timeTravelVP: number;
  /** 1 VP per Breakthrough. */
  breakthroughVP: number;
  /** +2 VP per complete shape set (one of each). */
  shapeSetBonus: number;
  /** Negative: −3 per remaining Anomaly. */
  anomalyVP: number;
  total: number;
}

/**
 * The Chronobot's full VP breakdown — the single source of truth shared by the
 * live top-bar pill and the End-Game score screen. Every scoring avenue is a
 * line item so they visibly sum to `total`.
 */
export function scoreChronobot(bot: ChronobotState): ChronobotScore {
  const breakthroughVP = BREAKTHROUGH_SHAPES.reduce(
    (n, s) => n + bot.breakthroughs[s],
    0,
  );
  const completeSets = Math.min(...BREAKTHROUGH_SHAPES.map((s) => bot.breakthroughs[s]));
  const shapeSetBonus = completeSets * 2;
  const anomalyVP = bot.anomalies * ANOMALY_VP;
  const timeTravelVP = timeTravelVp(bot);
  const buildingVP = bot.buildingVp;
  const tokenVP = bot.vp - buildingVP;
  return {
    tokenVP,
    buildingVP,
    duringGameVP: bot.vp,
    timeTravelVP,
    breakthroughVP,
    shapeSetBonus,
    anomalyVP,
    total: bot.vp + timeTravelVP + breakthroughVP + shapeSetBonus + anomalyVP,
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

/**
 * "1 gold + 2 titanium" as a descriptor. The resource names are the published
 * `ui.pieceInline.*` keys, and the " + " joiner is `msg.cubeJoin` — a key, because a
 * language may not join a list that way.
 */
function describeCubes(cubes: Resource[]): MsgList {
  const counts: Partial<Record<Resource, number>> = {};
  for (const c of cubes) counts[c] = (counts[c] ?? 0) + 1;
  return {
    list: Object.entries(counts).map(([r, n]) =>
      msg('ui.dialog.anomaly.cubes', { n: n ?? 0, resource: msg(`ui.pieceInline.${r}`) }),
    ),
    sep: 'msg.cubeJoin',
    last: 'msg.cubeJoin',
  };
}
