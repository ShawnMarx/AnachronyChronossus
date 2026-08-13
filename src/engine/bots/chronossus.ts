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

import type { GameState, Instruction, EnergyPool, ChronossusState } from '../state';
import type { BreakthroughShape, GameConfig, Resource, Worker } from '../types';
import { BREAKTHROUGH_SHAPES } from '../types';
import {
  actionDef,
  RECRUIT_PRIORITY,
  type ChronobotActionId,
} from '../rules/chronobotActions';
import { CHRONOSSUS_TILES, TILE_ACTION_CODE, tileEffect } from '../../board/chronossusTiles';
import {
  chooseRecruitWorker,
  chooseRemoveAnomalyDiscards,
  chooseBreakthroughDiscard,
  chooseMineResources,
  TIME_TRAVEL_VP,
  type ParadoxRollResult,
} from './chronobot';

/** Highest Era before the game always ends (same as the Chronobot). */
export const MAX_ERA = 7;

/**
 * The first post-Impact Era. The Impact happens during the Clean Up of Era 4, so
 * Eras 1–4 are pre-Impact and Eras 5+ are post-Impact — identical to the Chronobot,
 * and the default for every mode. (Fractures of Time is the planned exception; when
 * it lands it will override this per its own Impact timing.)
 */
export const POST_IMPACT_ERA = 5;

/** Whether a given Era is post-Impact (2+X / max-4 power-up, Collapsing Capital). */
export function isPostImpact(era: number): boolean {
  return era >= POST_IMPACT_ERA;
}

/** D3 — "Extra starting Energy Cores": +1/2/3 energized cores in the starting pool
 *  (chosen via a sub-selector; applied once at setup, not read per-Era). */
export const DIFFICULTY_EXTRA_ENERGY = 'chronossus-extra-energy';

/** D6 — "Fewer (or no) Solo Objectives": setup-text only (reveal-count sub-selector,
 *  0/1/2 instead of the base 3) — no engine logic, the score screen already treats
 *  Solo Objectives as one player-entered tally field regardless of count. */
export const DIFFICULTY_FEWER_OBJECTIVES = 'chronossus-fewer-objectives';

/** Variable Anomalies extra module — can combine with any base mode; standalone of
 *  the main Fractures of Time module (needs only the physical expansion box). */
export const EXTRA_MODULE_VARIABLE_ANOMALIES = 'variable-anomalies';

// --- Fractures of Time (Solo Opponents pp. 11-13) --------------------------
/** Its 5 "Increasing the Difficulty" bullets. The B-side flip is the shared
 *  `chronossus-tiles-b-side`; C14-for-C04 is a tile swap handled in `getMode`; the
 *  extra Glitch is player-side setup text only (the Chronossus never gets Glitches). */
export const DIFFICULTY_FRACTURES_C14 = 'chronossus-fractures-c14';
export const DIFFICULTY_FRACTURES_EXTRA_FLUX = 'chronossus-fractures-extra-flux';
export const DIFFICULTY_FRACTURES_LEFTOVER_FLUX_VP = 'chronossus-fractures-leftover-flux-vp';
export const DIFFICULTY_FRACTURES_PLAYER_GLITCH = 'chronossus-fractures-player-glitch';

/** The Flux Pool at setup: 1 Flux Core + all 3 Empty Flux Casing tokens. */
export const FLUX_POOL_START = { cores: 1, casings: 3, setAside: 0 } as const;
/** VP per Technology the Chronossus holds at the end of the game. */
export const TECHNOLOGY_VP = 3;

/** Whether a mode id runs the Fractures of Time module (including its combos). */
export function isFracturesMode(modeId: string | undefined): boolean {
  return !!modeId && modeId.includes('fractures');
}

// --- Guardians of the Council (Solo Opponents p.16) ------------------------
/** Its "Increasing the Difficulty" bullets. The B-side flip is the shared
 *  `chronossus-tiles-b-side`; these two are the module's own. */
export const DIFFICULTY_GUARDIANS_POSTIMPACT_2VP = 'chronossus-guardians-postimpact-2vp';
export const DIFFICULTY_GUARDIANS_START_1 = 'chronossus-guardians-start-1';

/** Whether a mode id runs the Guardians of the Council module (including its combos). */
export function isGuardiansMode(modeId: string | undefined): boolean {
  return !!modeId && modeId.includes('guardians');
}

/** A figure the Chronossus can put on a board this Era. */
export type Figure = 'exosuit' | 'guardian';

/**
 * Powered figures the Chronossus still has to place this Era — its own Exosuits plus
 * any powered Guardians. This, not `exosuitsAvailable` alone, is what "out of Exosuits"
 * means once Guardians are in play.
 */
export function placeableFigures(bot: ChronossusState): number {
  return bot.exosuitsAvailable + (bot.guardians?.powered ?? 0);
}

/**
 * Which figure the Chronossus spends next: "When deciding which Exosuit to place, the
 * Chronossus places Guardians last" (Solo Opponents p.16). Null when it has none left.
 */
export function nextFigure(bot: ChronossusState): Figure | null {
  if (bot.exosuitsAvailable > 0) return 'exosuit';
  if ((bot.guardians?.powered ?? 0) > 0) return 'guardian';
  return null;
}

/**
 * Spend one powered figure — a plain Exosuit while any remain, else a Guardian — and
 * report which went. Mutates the (already cloned) slice; a no-op returning null when
 * nothing is left. Every place-an-Exosuit and discard-an-active-Exosuit site goes
 * through this, so the Guardians-last rule holds everywhere at once.
 *
 * The Failed-Action discard uses the same order: the rulebook only spells the ordering
 * out for placement, but a Guardian is an Exosuit the bot has, so when it has nothing
 * else active that is what it discards.
 */
export function spendFigure(bot: ChronossusState): Figure | null {
  const which = nextFigure(bot);
  if (which === 'exosuit') bot.exosuitsAvailable -= 1;
  else if (which === 'guardian' && bot.guardians) {
    bot.guardians = { ...bot.guardians, powered: bot.guardians.powered - 1 };
  }
  return which;
}

/** The Capital Actions a Guardian may take from its own Guardian board space (p.16). */
export function isGuardianCapitalAction(actionId: string): boolean {
  const space = blinkSpaceOf(actionId, 'action');
  return space === 'research' || space === 'recruit' || space === 'construct';
}

/**
 * Guardians p.16: "If it wants to take a Capital Action (Research, Recruit, Construct)
 * and there are no Action spaces remaining (including the World Council Action space),
 * it places a Guardian (if it has any) on the reserved Guardian Action space and performs
 * the Capital Action. This means the Action is not a Failed Action."
 *
 * Every Guardian brings its own space — the slot on the Guardian board carrying one of the
 * Chronossus's Path markers, which no other player may use — so having a powered Guardian
 * is the whole condition. There is nothing to ask the player, and the fallback can't run
 * out. It also takes priority over Hypersync's Solo-tile fallback in the combo.
 */
export function canUseGuardianSpace(bot: ChronossusState, actionId: string): boolean {
  return (bot.guardians?.powered ?? 0) > 0 && isGuardianCapitalAction(actionId);
}

/**
 * Apply setup-time adjustments to a fresh Chronossus slice — D3's extra starting
 * Energy Cores (added energized), Variable Anomalies seeding its held-Anomaly
 * VP list (`anomalyVps: []`, distinguishing "using this module, 0 held" from
 * `undefined`/not using it), Fractures seeding its Flux Pool, and Guardians seeding
 * its Guardian counter. Called once when a game begins, before Era 1.
 */
export function applyDifficultySetup(bot: ChronossusState, config: GameConfig): ChronossusState {
  const extra = config.difficulty.includes(DIFFICULTY_EXTRA_ENERGY)
    ? (config.difficultyValues?.[DIFFICULTY_EXTRA_ENERGY] ?? 0)
    : 0;
  const variableAnomalies = config.extraModules?.includes(EXTRA_MODULE_VARIABLE_ANOMALIES) ?? false;
  // Fractures seeds its own subsystems: the Flux Pool (plus any extra starting Flux
  // Cores from that module's difficulty option) and the Technology/Operator counters
  // the Assimilate Action compares. Their presence is what marks a Fractures game,
  // the same way `anomalyVps` marks a Variable Anomalies one.
  const fractures = isFracturesMode(config.chronossusMode);
  const extraFlux = config.difficulty.includes(DIFFICULTY_FRACTURES_EXTRA_FLUX)
    ? (config.difficultyValues?.[DIFFICULTY_FRACTURES_EXTRA_FLUX] ?? 0)
    : 0;
  // Guardians seeds its own counter the same way — its presence marks a Guardians
  // game. The module's difficulty option starts the bot with 1 already enlisted (so
  // the player also places a Path marker on the Guardian board at setup).
  const guardians = isGuardiansMode(config.chronossusMode);
  const startingGuardians = config.difficulty.includes(DIFFICULTY_GUARDIANS_START_1) ? 1 : 0;
  if (extra === 0 && !variableAnomalies && !fractures && !guardians) return bot;
  return {
    ...bot,
    energyPool: { ...bot.energyPool, energized: bot.energyPool.energized + extra },
    ...(variableAnomalies ? { anomalyVps: [] } : {}),
    ...(fractures
      ? {
          fluxPool: { ...FLUX_POOL_START, cores: FLUX_POOL_START.cores + extraFlux },
          technologies: 0,
          operators: 0,
          operatorSlots: {},
        }
      : {}),
    ...(guardians ? { guardians: { owned: startingGuardians, powered: 0 } } : {}),
  };
}

// --------------------------------------------------------------------------
// Fractures of Time: the Flux Pool + Blinking (Solo Opponents pp. 11-13)
// --------------------------------------------------------------------------

/** One of the bot's Exosuits on the Main board (a `placedExosuits` entry). */
export type PlacedExosuit = NonNullable<ChronossusState['placedExosuits']>[number];

/** What a Flux Pool draw produced. */
export type FluxDraw = 'core' | 'casing';

/**
 * Draw one token from the Flux Pool. Caller supplies the roll in [0,1) so the engine
 * stays pure (same contract as the Energy Pool draw).
 *
 * A Flux Core is discarded and triggers the Blink; an Empty Flux Casing is set aside
 * until Clean Up. Returns the drawn token and the pool after removing it.
 */
export function drawFlux(
  pool: NonNullable<ChronossusState['fluxPool']>,
  roll: number,
): { drawn: FluxDraw; pool: NonNullable<ChronossusState['fluxPool']> } {
  const total = pool.cores + pool.casings;
  if (total <= 0) throw new Error('drawFlux: the Flux Pool is empty');
  const drawn: FluxDraw = Math.floor(roll * total) < pool.cores ? 'core' : 'casing';
  return drawn === 'core'
    ? { drawn, pool: { ...pool, cores: pool.cores - 1 } }
    : { drawn, pool: { ...pool, casings: pool.casings - 1, setAside: pool.setAside + 1 } };
}

/**
 * The Exosuits that could Blink for an attempted Action: on the Main board, still
 * holding an Energy Core, and not already on the Action being attempted
 * (Solo Opponents p.11).
 */
export function blinkReadyExosuits(bot: ChronossusState, attemptedAction: string): PlacedExosuit[] {
  const attempted = blinkSpaceOf(attemptedAction, 'action');
  return (bot.placedExosuits ?? []).filter((e) => {
    if (!e.hasCore) return false;
    const space = blinkSpaceOf(e.action, e.space);
    // Not on a Main-board Capital Action space at all, or already on the space the
    // Action being attempted would use.
    return space != null && !(attempted != null && space === attempted);
  });
}

/**
 * Whether the Blink check happens at all: a Blink-ready Exosuit AND at least one Flux
 * Core in the pool.
 *
 * The rulebook's condition is "at least 1 token in the Flux Pool", but with no Flux Cores
 * left the draw can only produce Empty Flux Casings — which change nothing this Era and
 * all return to the pool in Clean Up. Skipping the check there is equivalent, and saves
 * the player a pointless prompt on every placement.
 */
export function shouldCheckBlink(bot: ChronossusState, attemptedAction: string): boolean {
  const pool = bot.fluxPool;
  if (!pool || pool.cores === 0) return false;
  return blinkReadyExosuits(bot, attemptedAction).length > 0;
}

/**
 * A Main-board Capital Action space the Chronossus can Blink *from*. The board has one
 * Construct space and one Recruit space — the app's per-type Action ids (construct-lab,
 * construct-superproject, recruit-genius-research…) are choices made *at* those spaces,
 * not separate spaces — so they collapse here.
 */
export type BlinkSpace = 'research' | 'recruit' | 'construct' | 'mine' | 'world-council';

/**
 * Rule B's ordering: the Capital Action spaces read bottom-left to right and then up —
 * "closest to the bottom Research space" first (Solo Opponents p.12). The app never
 * renders the Main board, so this is the layout expressed as a list.
 */
export const BLINK_SPACE_ORDER: BlinkSpace[] = [
  'research',
  'recruit',
  'construct',
  'mine',
  'world-council',
];

/**
 * VERBATIM Blink rules (Solo Opponents rulebook p. 12) — the check and the A/B selection
 * rules, shown as the collapsible rulebook box on every Blink-check step.
 */
export const BLINK_RULE =
  'Whenever the Chronossus is about to take an Action with an Exosuit, perform the ' +
  'following check:\n' +
  'Does it have a Blink-ready Exosuit and at least 1 token in the Flux Pool?\n' +
  '• If not, proceed to Exosuit placement as normal.\n' +
  '• If yes, draw 1 token from the Flux Pool to perform a Blink check.\n' +
  '» If it is a Flux Core, discard it, then perform a Blink (see below).\n' +
  '» If it is an Empty Flux Casing, put it aside. The Chronossus places an Exosuit or ' +
  'passes, as usual.\n' +
  '\n' +
  'BLINKING\n' +
  'You Blink following the standard rules, as explained in the Fractures of Time ' +
  'expansion. When the Chronossus decides to Blink (see the check above), it must first ' +
  'select which Exosuit to Blink with (if there are multiple Blink-ready ones):\n' +
  '• (A) If any Exosuits are on an Action corresponding to any Command tokens (other than ' +
  'the one currently selected) on the Chronossus’s board, select that Exosuit. If multiple ' +
  'Exosuits meet this requirement, pick the one that matches the Command token with the ' +
  'smaller number.\n' +
  '• (B) If no Exosuits match a Command token, choose the bottom-left-most one (closest to ' +
  'the bottom Research space). Priority goes to Exosuits on lower spaces, if two are tied.';

/** Human-facing name of a Blink-from space (used in the "move its Exosuit" instruction). */
export const BLINK_SPACE_LABEL: Record<BlinkSpace, string> = {
  research: 'Research',
  recruit: 'Recruit',
  construct: 'Construct',
  mine: 'Mine',
  'world-council': 'World Council',
};

/**
 * Which Capital Action space a placement occupies, or `null` when it is not a valid
 * Blink-from position: Time Travel, Remove Anomaly and Reboot place no Exosuit on the
 * Main board, and nothing else the Chronossus takes is on it.
 *
 * The Recruit Genius / Research space counts as Recruit, and only when the Genius side
 * is the valid one.
 */
export function blinkSpaceOf(action: string, space: 'action' | 'world-council'): BlinkSpace | null {
  if (space === 'world-council') return 'world-council';
  if (action.startsWith('construct-')) return 'construct';
  if (action === 'recruit' || action === 'recruit-genius-research') return 'recruit';
  if (action === 'research') return 'research';
  if (action === 'mine-resource') return 'mine';
  return null;
}

/**
 * Fractures' ASSIMILATE Action (Solo Opponents p.13). Roll the Research shape die first:
 *
 *   Circle   → recruit an Operator and gain 1 Flux Core.
 *   Triangle → take a Technology card (preferring the secondary stack).
 *   Square   → whichever it has fewer of, Operator (+1 Flux Core) or Technology;
 *              Operator if tied.
 *
 * Mutates `bot` and returns the phrases describing what it took.
 */
export function assimilate(
  bot: ChronossusState,
  shape?: BreakthroughShape,
  /** Player answer: are there still Operators available in the Valley? */
  operatorsAvailable = true,
): AssimilateResult {
  const res: AssimilateResult = { gains: [], vp: 0 };
  const takeOperator = () => {
    if (!operatorsAvailable) {
      // "If it attempts to recruit an Operator, and there are none left, it is a Failed
      // Action and takes 1 VP." (Solo Opponents p.13) — no Operator, no Flux Core.
      bot.vp += 1;
      res.vp += 1;
      res.gains.push('finds no Operators left — Failed Action: it takes +1 VP instead');
      return;
    }
    // An Operator is a wildcard Worker: it goes into the topmost empty space of the
    // Chronossus's Worker collection and counts as that type for all purposes, the
    // +5 VP set included (Solo Opponents p.13).
    //
    // `operators` is kept as its own count for ONE reason: Assimilate's Square result
    // takes whichever of Operators / Technologies it has fewer of. `operatorSlots`
    // remembers which column each one sits in, so the +5 VP set discard knows how many
    // Operators go back to the Valley supply. Neither needs a tracker of its own in the
    // UI — the Worker columns already show them.
    const slot = operatorWorkerSlot(bot);
    bot.workers[slot] += 1;
    bot.operatorSlots = { ...bot.operatorSlots, [slot]: (bot.operatorSlots?.[slot] ?? 0) + 1 };
    bot.operators = (bot.operators ?? 0) + 1;
    if (bot.fluxPool) bot.fluxPool = { ...bot.fluxPool, cores: bot.fluxPool.cores + 1 };
    res.gains.push(
      `recruits an Operator (place it in the ${slot} space — the topmost empty space of its Worker collection) and gains 1 Flux Core into the Flux Pool`,
    );
    const set = applyWorkerSetBonus(bot);
    if (set) {
      res.vp += 5;
      res.gains.push(set);
    }
  };
  const takeTechnology = () => {
    bot.technologies = (bot.technologies ?? 0) + 1;
    res.gains.push('takes a Technology card (preferring the secondary stack) — worth 3 VP at the end');
  };
  if (shape === 'circle') takeOperator();
  else if (shape === 'triangle') takeTechnology();
  // Square (and any missing roll, which the UI shouldn't produce): fewer of the two.
  else if ((bot.operators ?? 0) <= (bot.technologies ?? 0)) takeOperator();
  else takeTechnology();
  return res;
}

/** What Assimilate does, as phrases to fold into the tile instruction plus the VP it moved. */
export interface AssimilateResult {
  gains: string[];
  vp: number;
}

/**
 * The "topmost empty space of the Chronossus's Worker collection" an Operator fills —
 * the same reading order the Recruit priority uses. With no empty space (only reachable
 * if another Action doubled up a column), it joins the topmost column.
 */
export function operatorWorkerSlot(bot: ChronossusState): Worker {
  return RECRUIT_PRIORITY.find((w) => bot.workers[w] === 0) ?? RECRUIT_PRIORITY[0];
}

/** Whether an Assimilate roll of `shape` would try to recruit an Operator (the UI gates on it). */
export function assimilateTakesOperator(bot: ChronossusState, shape?: BreakthroughShape): boolean {
  if (shape === 'triangle') return false;
  if (shape === 'circle') return true;
  return (bot.operators ?? 0) <= (bot.technologies ?? 0);
}

/** Which rule picked the Blinking Exosuit — surfaced in the UI so a contested call is visible. */
export type BlinkRule = 'command-token' | 'bottom-left';

export interface BlinkSelection {
  exosuit: PlacedExosuit;
  /** The Capital Action space it is on — what the player is told to move it from. */
  space: BlinkSpace;
  rule: BlinkRule;
  /** Set on the 'command-token' rule: the token number the Exosuit's space matches. */
  token?: number;
  /** How many of the bot's Exosuits sit on that same space. With more than one the player
   *  takes the bottom-most — the app can't see which of a space's slots each one is in. */
  sameSpaceCount: number;
}

/**
 * Pick the Exosuit to Blink with (Solo Opponents p.12):
 *
 *   A. An Exosuit on an Action matching any *other* Command token; ties go to the
 *      smaller token number.
 *   B. Otherwise the bottom-left-most one (closest to the bottom Research space), lower
 *      spaces winning ties.
 *
 * `tokenActions` maps each other Command token's number to the Action it currently sits
 * on (view state, so it's injected).
 *
 * An Exosuit on the **World Council** space matches no Command token (that space is not
 * any token's Action), so rule A never selects it, and it sorts last under rule B.
 */
export function selectBlinkExosuit(
  bot: ChronossusState,
  attemptedAction: string,
  tokenActions: Record<number, string>,
): BlinkSelection | null {
  const ready = blinkReadyExosuits(bot, attemptedAction);
  if (ready.length === 0) return null;
  const spaceOf = (e: PlacedExosuit) => blinkSpaceOf(e.action, e.space)!;
  const countOn = (space: BlinkSpace) => ready.filter((e) => spaceOf(e) === space).length;

  // Rule A — an Exosuit on a Capital Action space that another Command token sits on.
  // Tokens name a specific Action (e.g. construct-lab); it is the *space* that matches,
  // so any Construct Exosuit answers a Construct token.
  const tokenSpaces = Object.keys(tokenActions)
    .map(Number)
    .map((t) => ({ token: t, space: blinkSpaceOf(tokenActions[t], 'action') }))
    .filter((t): t is { token: number; space: BlinkSpace } => t.space != null);

  const matches = ready
    .map((e) => {
      const space = spaceOf(e);
      const token = tokenSpaces
        .filter((t) => t.space === space)
        .map((t) => t.token)
        .sort((a, b) => a - b)[0];
      return token == null ? null : { exosuit: e, space, token };
    })
    .filter((m): m is { exosuit: PlacedExosuit; space: BlinkSpace; token: number } => m != null)
    .sort((a, b) => a.token - b.token);

  if (matches.length > 0) {
    const { exosuit, space, token } = matches[0];
    return { exosuit, space, rule: 'command-token', token, sameSpaceCount: countOn(space) };
  }

  // Rule B — bottom-left-most. World Council is last in the order, being at the top.
  const exosuit = [...ready].sort(
    (a, b) => BLINK_SPACE_ORDER.indexOf(spaceOf(a)) - BLINK_SPACE_ORDER.indexOf(spaceOf(b)),
  )[0];
  const space = spaceOf(exosuit);
  return { exosuit, space, rule: 'bottom-left', sameSpaceCount: countOn(space) };
}

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

/** D4 — "One extra powered Exosuit each Era": free +1, or +2 VP per excess if that would
 *  exceed `exosuitsTotal` (the fixed physical-figure count, not the per-Era `powerUpCap`). */
export const DIFFICULTY_EXTRA_POWERUP = 'chronossus-extra-powerup';

/**
 * Resolve the Chronossus's Power Up (Phase 3). The app draws `draw` tokens from
 * the Energy Pool (see `drawEnergyPool` at the engine boundary); this applies
 * the rules: power up `base + energized` Exosuits (capped), update the pool, and
 * advance to Warp. With D4 active, one more Exosuit powers up for free; if that
 * would exceed `exosuitsTotal`, the excess scores +2 VP instead (drawn cores are
 * still removed from the pool either way).
 */
export function resolvePowerUp(state: GameState, draw: EnergyDraw): GameState {
  if (!state.chronossus) throw new Error('resolvePowerUp: no Chronossus state');
  const capped = poweredExosuits(state.impact, draw.energized);
  const extraPowerup = state.config.difficulty?.includes(DIFFICULTY_EXTRA_POWERUP) ?? false;
  const attempted = extraPowerup ? capped + 1 : capped;
  // Guardians p.16: "The Chronossus first powers up as many Guardians as it can, then it
  // powers up its own Exosuits" — they share the same number, Guardians taking it first.
  const guardiansOwned = state.chronossus.guardians?.owned ?? 0;
  const guardiansPowered = Math.min(guardiansOwned, attempted);
  const exosuitsAvailable = Math.min(attempted - guardiansPowered, state.chronossus.exosuitsTotal);
  // D4's excess-to-VP conversion measures against everything it could have powered up:
  // its own Exosuit figures plus the Guardians that just took part of the number.
  const bonusVP =
    Math.max(0, attempted - guardiansPowered - state.chronossus.exosuitsTotal) * 2;
  const bot = {
    ...state.chronossus,
    exosuitsAvailable,
    vp: state.chronossus.vp + bonusVP,
    passed: false,
    energyPool: poolAfterDraw(state.chronossus.energyPool, draw),
    ...(state.chronossus.guardians
      ? { guardians: { ...state.chronossus.guardians, powered: guardiansPowered } }
      : {}),
  };
  const drawnTotal = draw.energized + draw.exhausted;
  const returned = draw.exhausted > 0 ? 1 : 0;
  const instructions: Instruction[] = [
    {
      id: 'powerup',
      text: guardiansPowered
        ? `Power up ${guardiansPowered} of the Chronossus's Guardians` +
          (exosuitsAvailable
            ? ` and ${exosuitsAvailable} of its Exosuits.`
            : ' (that uses up its whole number — no Exosuits power up).')
        : `Power up ${exosuitsAvailable} of the Chronossus's Exosuits.`,
      detail:
        `Drew ${drawnTotal} token${drawnTotal === 1 ? '' : 's'} from the Energy Pool: ` +
        `${draw.energized} Energy + ${draw.exhausted} Exhausted. ${state.impact ? '2' : '3'}+${draw.energized} ` +
        `= ${capped} Exosuit${capped === 1 ? '' : 's'} ` +
        `(max ${powerUpCap(state.impact)} ${state.impact ? 'after' : 'before'} the Impact). ` +
        (guardiansPowered
          ? `It powers up its ${guardiansPowered} Guardian${guardiansPowered === 1 ? '' : 's'} first, then its own Exosuits. `
          : '') +
        (extraPowerup
          ? bonusVP
            ? `Difficulty: +1 free Exosuit would exceed the max of ${state.chronossus.exosuitsTotal} — ` +
              `+${bonusVP} VP instead. `
            : `Difficulty: +1 free Exosuit (${exosuitsAvailable} total). `
          : '') +
        (returned
          ? 'Return 1 drawn Exhausted core to the Pool and remove the rest from the game.'
          : 'Remove all drawn tokens from the game (no Exhausted core to return).'),
      ...(bonusVP ? { effect: { vp: bonusVP } } : {}),
    },
  ];
  return {
    ...state,
    chronossus: bot,
    phase: 'warp',
    currentInstructions: instructions,
    log: [
      ...state.log,
      `Power Up: drew ${draw.energized}E/${draw.exhausted}X → ${exosuitsAvailable} Exosuits` +
      (guardiansPowered ? ` + ${guardiansPowered} Guardians` : '') +
        (bonusVP ? ` + ${bonusVP} VP (difficulty).` : '.'),
    ],
  };
}

// --------------------------------------------------------------------------
// Phase 5: Action Rounds — single-action resolution
// --------------------------------------------------------------------------
//
// The Chronossus's base Actions are the Chronobot's, with one base-game rule
// delta: a Failed Action from *no available space* additionally discards an
// active Exosuit (rulebook p.10). The 3 modular Action tiles (C01–C03) add their
// own small Actions. This resolver takes ONE action and applies it to the
// Chronossus slice — it does NOT advance any Command token (the token/path model
// is Feature 4's generalization; the Phase-5 debug harness drives actions by
// direct tap, not by die + path).

/** Modular Action-tile actions (default A-side setup: C01A/C02A/C03A). */
export type ChronossusTileActionId =
  | 'tile-reboot'
  | 'tile-score'
  | 'tile-energy-pack'
  // Fractures of Time
  | 'tile-assimilate'
  | 'tile-extract'
  | 'tile-power-pack'
  // Guardians of the Council
  | 'tile-acquire-guardian';

/** Every action a Chronossus space can trigger (base actions + tile actions). */
export type ChronossusActionId = ChronobotActionId | ChronossusTileActionId;

export interface ChronossusActionInput {
  actionId: ChronossusActionId;
  /** For Research / Recruit-Genius-Research: the rolled shape (app rolls it). */
  shape?: BreakthroughShape;
  /** For Recruit-Genius-Research: whether a Genius is available on the board. */
  geniusAvailable?: boolean;
  /** Player override: no available Action space at all (Failed, discards Exosuit). */
  noSpaceAvailable?: boolean;
  /**
   * Hypersync mode: no Action space remained, so the Chronossus places a Solo
   * Hypersync tile on the current Era and performs the Capital Action normally
   * (no Exosuit placed, NOT a Failed Action). The UI only sets this when
   * `canPlaceHypersyncTile` is true.
   */
  placeHypersyncTile?: boolean;
  /**
   * Hypersync mode: a Capital Action had no space AND no Hypersync tile could be
   * placed (already one this Era, or 3 pending). Per the Hypersync rules this is a
   * Failed Action worth +1 VP — but, unlike the base no-space fail, it does NOT
   * discard an active Exosuit.
   */
  hypersyncNoTile?: boolean;
  /** For a successful Construct: the printed VP of the tile the player took. */
  buildingVP?: number;
  /** For a Mine action: the 2 Resources granted (defaults to priority choice). */
  minedResources?: Resource[];
  /** For a Recruit action: the Worker granted (defaults to priority choice). */
  recruitedWorker?: Worker;
  /** For a modular tile action: which side is in play (default 'A'). */
  tileSide?: 'A' | 'B';
  /** Overrides the tile family for that action — Fractures' C14-for-C04 swap. */
  tileFamily?: string;
  /**
   * Fractures' Assimilate: the player's answer to "are there Operators left in the
   * Valley?". False makes an Operator branch a Failed Action (+1 VP) per Solo Opponents
   * p.13. Defaults to true.
   */
  operatorsAvailable?: boolean;
  /**
   * Fractures: where this placement went — the printed Capital Action space, or the
   * World Council space it overflowed to. The gate asks the player both questions, and
   * the answer is recorded on `placedExosuits` so Blink selection can use it. Defaults
   * to 'action' (and is ignored outside Fractures games).
   */
  placementSpace?: 'action' | 'world-council';
  /**
   * Fractures: which Action each *other* Command token currently sits on, keyed by token
   * number — view state, needed for Blink selection rule A.
   */
  tokenActions?: Record<number, string>;
  /**
   * Fractures: this Action is being taken by Blinking an already-placed Exosuit instead
   * of placing a new one — the engine moves it, drops its Energy Core, and leaves
   * `exosuitsAvailable` alone.
   */
  blink?: boolean;
  /** Guardians (C11): player answer — is the World Council Action space still free? */
  worldCouncilFree?: boolean;
  /**
   * Guardians (C11): player answer — is a Guardian still available on the Guardian board?
   * Only asked from Era 4 (`shouldAskGuardianAvailable`); defaults to true otherwise.
   */
  guardianAvailable?: boolean;
}

export interface ChronossusActionResult {
  state: GameState;
  instructions: Instruction[];
  /**
   * True when the resolved action was an Autoleap tile — the caller should
   * advance the Command marker ONE EXTRA step (on top of the usual per-turn
   * advance). Only set by tile actions whose B side (or C12B/C13B) autoleaps.
   */
  autoleap?: boolean;
  /**
   * Guardians: which figure this Action actually placed. The engine picks it (Guardians
   * go last), so the view has to be told in order to say "place a Guardian" rather than
   * "place an Exosuit". Undefined when nothing was placed.
   */
  figurePlaced?: Figure;
  /**
   * Guardians: the Action ran off the Guardian board's own space — no Capital Action
   * space was free, so a Guardian went onto a Path-marked slot and the Action resolved
   * normally (NOT a Failed Action, p.16).
   */
  usedGuardianSpace?: boolean;
  /** Guardians (C11): which branch the Acquire Guardian Action resolved to. */
  acquireGuardian?: AcquireGuardianOutcome;
}

/**
 * Fractures: Assimilate and Extract are Action spaces on the **Valley board**, so they
 * take an Exosuit like any Capital Action — unlike the Chronossus-board tiles (Reboot,
 * Score, Energy/Power Pack), which are pure effects.
 *
 * The Chronossus passes rather than take one when it is out of Exosuits. It CAN Blink
 * into a Valley space (an Exosuit moves there from the Main board), but never out of one:
 * these placements are not recorded in `placedExosuits`, and a Blinked-in Exosuit is
 * removed from it, so the Valley board is a Blink destination only.
 */
export const VALLEY_TILE_ACTIONS: ChronossusTileActionId[] = ['tile-assimilate', 'tile-extract'];

/**
 * Whether an Action places an Exosuit — including the Valley board's tile Actions.
 *
 * Guardians' Acquire Guardian is deliberately NOT one: it only places an Exosuit when the
 * World Council space happens to be free, and otherwise spends a Worker instead (p.16). If
 * it counted here, a bot out of Exosuits would PASS on the tile rather than take the
 * Worker option it is still entitled to. `resolveAcquireGuardian` does its own placing.
 */
export function placesExosuitFor(actionId: ChronossusActionId): boolean {
  if (isTileAction(actionId)) return VALLEY_TILE_ACTIONS.includes(actionId);
  return actionDef(actionId).placesExosuit === true;
}

/**
 * Exosuit placements that land somewhere OTHER than the Main board. Every expansion that
 * brings its own board works this way — Fractures' Valley Actions, Hypersync's hex spaces
 * (resolved through `resolveHypersyncAction`, which likewise records nothing), and the
 * same will hold for Pioneers/Guardians when they land.
 *
 * They are Blink **destinations** (an Exosuit can move there from the Main board) but
 * never Blink **sources**, so they are not recorded in `placedExosuits`. Add a new
 * module's off-board Actions here and the Blink rules follow automatically.
 */
export const OFF_MAIN_BOARD_ACTIONS: ChronossusActionId[] = [...VALLEY_TILE_ACTIONS];

/** Whether this Action's Exosuit lands on the Main board (so it could later Blink). */
export function isMainBoardPlacement(actionId: ChronossusActionId): boolean {
  return placesExosuitFor(actionId) && !OFF_MAIN_BOARD_ACTIONS.includes(actionId);
}

const TILE_ACTIONS: Record<ChronossusTileActionId, { label: string }> = {
  'tile-reboot': { label: 'Reboot' },
  'tile-score': { label: 'Score' },
  'tile-energy-pack': { label: 'Energy Pack' },
  'tile-assimilate': { label: 'Assimilate' },
  'tile-extract': { label: 'Extract' },
  'tile-power-pack': { label: 'Power Pack' },
  'tile-acquire-guardian': { label: 'Acquire Guardian' },
};

/** Human-facing label for any Chronossus action id. */
export function chronossusActionLabel(id: ChronossusActionId): string {
  return isTileAction(id) ? TILE_ACTIONS[id].label : actionDef(id).label;
}

function isTileAction(id: ChronossusActionId): id is ChronossusTileActionId {
  return id in TILE_ACTIONS;
}

function cloneChronossus(bot: ChronossusState): ChronossusState {
  return {
    ...bot,
    resources: { ...bot.resources },
    workers: { ...bot.workers },
    breakthroughs: { ...bot.breakthroughs },
    buildings: { ...bot.buildings },
    buildingVps: {
      factory: [...bot.buildingVps.factory],
      lab: [...bot.buildingVps.lab],
      powerplant: [...bot.buildingVps.powerplant],
      support: [...bot.buildingVps.support],
    },
    superprojectVps: [...bot.superprojectVps],
    energyPool: { ...bot.energyPool },
    hypersyncTiles: [...bot.hypersyncTiles],
  };
}

/** D7 — "Failed Actions score VP": replaces the base rule's +1 VP per Failed Action
 *  with +2 VP total, live at the moment each Failed Action resolves. */
export const DIFFICULTY_FAILED_ACTION_VP = 'chronossus-failed-action-vp';

/** VP a Failed Action grants: 2 with D7 active, 1 otherwise (the base rule). */
export function failedActionVP(difficulty: string[] | undefined): number {
  return difficulty?.includes(DIFFICULTY_FAILED_ACTION_VP) ? 2 : 1;
}

/**
 * Resolve a single Chronossus action against the Chronossus slice. Returns the
 * updated state + player instructions. Does not advance any Command token.
 */
export function resolveAction(
  state: GameState,
  input: ChronossusActionInput,
): ChronossusActionResult {
  if (!state.chronossus) throw new Error('resolveAction: no Chronossus state');
  const bot = cloneChronossus(state.chronossus);
  const instr: Instruction[] = [];
  const n = bot.totalActions;
  const failVP = failedActionVP(state.config.difficulty);
  const researchNewShape = state.config.difficulty.includes(DIFFICULTY_RESEARCH_NEW_SHAPE);

  instr.push({
    id: `turn-${n}`,
    text: `The Chronossus takes the "${chronossusActionLabel(input.actionId)}" action.`,
  });

  // Guardians fallback (p.16): a Capital Action with no space left anywhere — World
  // Council included — puts a Guardian on its own Guardian board space and performs the
  // Action normally. Checked FIRST: it beats Hypersync's Solo-tile fallback in the combo,
  // because it is a real placement onto a space reserved for this bot. Every Guardian
  // brings its own Path-marked slot, so having a powered one is the whole condition.
  const usingGuardianSpace =
    (input.noSpaceAvailable === true || input.hypersyncNoTile === true) &&
    canUseGuardianSpace(bot, input.actionId);
  if (usingGuardianSpace) {
    spendFigure(bot); // Exosuits are gone by definition here, so this takes the Guardian
    instr.push({
      id: `guardian-space-${n}`,
      text:
        'No Action space remained (including World Council) — place one of the ' +
        "Chronossus's Guardians on the Guardian board, on a slot marked with one of its " +
        'Path markers, and perform the Action normally.',
      detail:
        'It does not matter which of its marked slots you use. This is NOT a Failed ' +
        'Action, so it takes no +1 VP.',
    });
  }

  // Hypersync fallback: no Action space, but a Solo Hypersync tile is placed on
  // this Era and the Capital Action is performed normally (no Exosuit, NOT a
  // Failed Action). Falls through to the normal switch with placement suppressed.
  const usingHypersyncTile = !usingGuardianSpace && input.placeHypersyncTile === true;
  if (usingGuardianSpace) {
    // fall through to the switch with the placement already made
  } else if (usingHypersyncTile) {
    bot.hypersyncTiles = [...bot.hypersyncTiles, state.era];
    instr.push({
      id: `hs-tile-${n}`,
      text: `No Action space remained — the Chronossus places a Solo Hypersync tile above Era ${state.era} and performs the Action normally (no Exosuit placed, not a Failed Action).`,
      detail:
        'It has a maximum of one Hypersync tile per Era and 3 pending Hypersync tiles total.',
    });
  } else if (input.hypersyncNoTile) {
    // Hypersync Capital Action, no space, and no Hypersync tile available: still a
    // Failed Action from lack of free spaces, so the base rule applies — VP AND
    // discard an active Exosuit.
    bot.vp += failVP;
    spendFigure(bot);
    instr.push({
      id: `hs-fail-notile-${n}`,
      text: `No Action space remained and no Solo Hypersync tile could be placed (max one per Era, 3 pending) — Failed Action: the Chronossus takes +${failVP} VP and additionally discards one active Exosuit.`,
      effect: { vp: failVP },
    });
    return finishAction(state, bot, instr);
  } else if (input.noSpaceAvailable) {
    // Failed from no available space: VP AND discard an active Exosuit (the
    // Chronossus-only nuance vs. the Chronobot).
    bot.vp += failVP;
    spendFigure(bot);
    instr.push({
      id: `fail-nospace-${n}`,
      text: `No available Action space — the Chronossus takes +${failVP} VP and additionally discards one active Exosuit (no Exosuit placed).`,
      effect: { vp: failVP },
    });
    return finishAction(state, bot, instr);
  }

  if (isTileAction(input.actionId)) {
    let tileFigure: Figure | null = null;
    // Valley board Actions take an Exosuit. No free Valley space sends it to the Valley
    // Capital space (p.11, as with World Capital); neither available is a Failed Action,
    // handled by the shared no-space branch above.
    if (VALLEY_TILE_ACTIONS.includes(input.actionId)) {
      const where =
        input.placementSpace === 'world-council'
          ? 'the Valley Capital Action space (no Valley Action space was free)'
          : 'that Valley Action space';
      if (input.blink && bot.fluxPool) {
        // Blinked in from the Main board: the Exosuit moves onto the Valley board and
        // leaves the Blink-from list — nothing on the Valley board can Blink again.
        const sel = selectBlinkExosuit(bot, input.actionId, input.tokenActions ?? {});
        bot.placedExosuits = (bot.placedExosuits ?? []).filter((e) => e !== sel?.exosuit);
        instr.push({
          id: `valley-blink-${n}`,
          text: `Blink: move that Exosuit to ${where} instead of placing a new one.`,
          detail: "Return the moved Exosuit's Energy Core to the supply.",
        });
      } else if (placeableFigures(bot) > 0) {
        const figure = spendFigure(bot);
        tileFigure = figure;
        instr.push({
          id: `valley-place-${n}`,
          text: `Place the Chronossus's ${figure === 'guardian' ? 'Guardian' : 'Exosuit'} on ${where}.`,
          detail:
            'Put an Energy Core from the supply into it. It cannot Blink again from the Valley board.',
        });
      }
    }
    let acquired: ReturnType<typeof resolveAcquireGuardian> | null = null;
    const autoleap = resolveTileAction(
      bot,
      instr,
      input.actionId,
      input.tileSide ?? 'A',
      n,
      input.shape,
      input.tileFamily,
      input.operatorsAvailable ?? true,
      {
        impact: state.impact,
        failVP,
        worldCouncilFree: input.worldCouncilFree ?? false,
        guardianAvailable: input.guardianAvailable ?? true,
        postImpact2VP: state.config.difficulty.includes(DIFFICULTY_GUARDIANS_POSTIMPACT_2VP),
        onResolved: (r) => {
          acquired = r;
        },
      },
    );
    const res = acquired as ReturnType<typeof resolveAcquireGuardian> | null;
    const done = finishAction(state, bot, instr, {
      figurePlaced: res?.figurePlaced ?? tileFigure,
    });
    return {
      ...done,
      autoleap,
      // Acquiring on the World Council space makes the Chronossus the First Player.
      ...(res?.becameFirstPlayer
        ? { state: { ...done.state, firstPlayer: 'bot' as const } }
        : {}),
      ...(res ? { acquireGuardian: res.outcome } : {}),
    };
  }

  const def = actionDef(input.actionId);
  let figurePlaced: Figure | null = null;
  const placeExosuit = () => {
    // The Hypersync-tile fallback places a tile instead of an Exosuit, and some Actions
    // place none at all.
    if (usingHypersyncTile || usingGuardianSpace || !def.placesExosuit) return;
    const fractures = bot.fluxPool != null;
    if (input.blink && fractures) {
      // Fractures: no new Exosuit — the selected one moves here and loses its Energy
      // Core (returned to supply), so it can't Blink again this Era.
      const sel = selectBlinkExosuit(bot, input.actionId, input.tokenActions ?? {});
      bot.placedExosuits = (bot.placedExosuits ?? []).map((e) =>
        e === sel?.exosuit ? { action: input.actionId, space: 'action', hasCore: false } : e,
      );
      return;
    }
    if (placeableFigures(bot) > 0) {
      figurePlaced = spendFigure(bot);
      // Fractures: every placement takes an Energy Core from supply into that Exosuit.
      // Only Main-board placements are recorded — an Exosuit on another expansion's board
      // can never Blink from there (see OFF_MAIN_BOARD_ACTIONS).
      if (fractures && isMainBoardPlacement(input.actionId)) {
        bot.placedExosuits = [
          ...(bot.placedExosuits ?? []),
          {
            action: input.actionId,
            space: input.placementSpace ?? 'action',
            hasCore: true,
          },
        ];
      }
    }
  };
  const failCantPerform = (why: string) => {
    if (def.placesExosuit) spendFigure(bot);
    bot.vp += failVP;
    instr.push({
      id: `fail-perform-${n}`,
      text: `Failed Action: ${why} — the Chronossus ${def.placesExosuit ? 'places an Exosuit and ' : ''}takes +${failVP} VP instead.`,
      effect: { vp: failVP },
    });
  };

  switch (input.actionId) {
    case 'reboot':
      instr.push({ id: `reboot-${n}`, text: 'Reboot: the Chronossus does nothing (no Exosuit, no VP).' });
      break;

    case 'research':
      resolveResearch(bot, instr, input.shape, n, researchNewShape);
      placeExosuit();
      break;

    case 'recruit':
      resolveRecruit(bot, instr, input.recruitedWorker, n);
      placeExosuit();
      break;

    case 'recruit-genius-research':
      if (input.geniusAvailable) {
        bot.workers.genius += 1;
        bot.vp += 1;
        instr.push({ id: `rgr-${n}`, text: 'Recruit a Genius for the Chronossus (+1 VP).', effect: { vp: 1 } });
        placeExosuit();
      } else {
        instr.push({ id: `rgr-res-${n}`, text: 'No Genius available — perform a Research action instead.' });
        resolveResearch(bot, instr, input.shape, n, researchNewShape);
        placeExosuit();
      }
      break;

    case 'mine-resource': {
      const mined = input.minedResources ?? chooseMineResources(bot);
      for (const r of mined) bot.resources[r] += 1;
      placeExosuit();
      instr.push({
        id: `mine-${n}`,
        text: `Mine ${describeCubes(mined)} for the Chronossus.`,
        detail: 'Prioritises Resources it lacks; ties Neutronium > Uranium > Gold > Titanium.',
      });
      applyResourceSetBonus(bot, instr, n);
      break;
    }

    case 'time-travel':
      resolveTimeTravel(bot, instr, n, failVP);
      break;

    case 'remove-anomaly': {
      const discards = chooseRemoveAnomalyDiscards(bot);
      const variableAnomalies = bot.anomalyVps != null;
      const anomalyCount = variableAnomalies ? bot.anomalyVps!.length : bot.anomalies;
      if (anomalyCount < 1 || !discards) {
        failCantPerform(anomalyCount < 1 ? 'it has no Anomaly to remove' : 'it lacks 2 Resource cubes to spend');
      } else {
        for (const r of discards) bot.resources[r] -= 1;
        placeExosuit();
        // Variable Anomalies: REMOVING ANOMALIES — always the largest VP penalty
        // (most negative); no player input needed, the engine already knows every
        // held tile's value.
        let removedText = 'remove 1 Anomaly';
        if (variableAnomalies) {
          const worst = Math.min(...bot.anomalyVps!);
          const idx = bot.anomalyVps!.indexOf(worst);
          bot.anomalyVps = [...bot.anomalyVps!.slice(0, idx), ...bot.anomalyVps!.slice(idx + 1)];
          removedText = `remove its largest-penalty Anomaly (${worst} VP)`;
        } else {
          bot.anomalies -= 1;
        }
        instr.push({
          id: `ra-${n}`,
          text: `Discard ${describeCubes(discards)} from the Chronossus and ${removedText}.`,
          detail: 'Discards the Resources it has most of; ties Titanium > Gold > Uranium > Neutronium (1 Neutronium = 2 cubes).',
        });
      }
      break;
    }

    case 'construct-factory':
    case 'construct-lab':
    case 'construct-powerplant':
    case 'construct-support': {
      const type = input.actionId.replace('construct-', '') as keyof ChronossusState['buildings'];
      const label = def.label.replace('Construct — ', '');
      if (bot.buildings[type] >= 3) {
        failCantPerform(`it already has 3 ${label} buildings`);
      } else {
        bot.buildings[type] += 1;
        placeExosuit();
        const vp = input.buildingVP ?? 0;
        if (vp > 0) {
          bot.vp += vp;
          bot.buildingVp += vp;
          bot.buildingVps[type].push(vp);
          instr.push({ id: `con-${n}`, text: `Give the Chronossus the higher-VP ${label} (secondary stack if tied) — ${vp} VP.`, effect: { vp } });
        } else {
          instr.push({ id: `con-${n}`, text: `Give the Chronossus the higher-VP ${label} (secondary stack if tied); record its printed VP.`, requiresInput: true });
        }
      }
      break;
    }

    case 'construct-superproject': {
      const discard = chooseBreakthroughDiscard(bot);
      if (bot.superprojects >= 3 || !discard) {
        failCantPerform(bot.superprojects >= 3 ? 'it already has 3 Superprojects' : 'it has no Breakthrough to discard');
      } else {
        bot.breakthroughs[discard] -= 1;
        bot.superprojects += 1;
        placeExosuit();
        const vp = input.buildingVP ?? 0;
        if (vp > 0) {
          bot.vp += vp;
          bot.buildingVp += vp;
          bot.superprojectVps.push(vp);
          instr.push({ id: `sp-${n}`, text: `Discard 1 ${discard} Breakthrough, then give the Chronossus the highest-VP face-up Superproject (oldest if tied) — ${vp} VP.`, effect: { vp } });
        } else {
          instr.push({ id: `sp-${n}`, text: `Discard 1 ${discard} Breakthrough, then give the Chronossus the highest-VP face-up Superproject (oldest if tied); record its VP.`, requiresInput: true });
        }
      }
      break;
    }

    case 'evacuation':
      instr.push({ id: `evac-${n}`, text: 'The Chronossus does not take Evacuation here.' });
      break;
  }

  return finishAction(state, bot, instr, {
    figurePlaced: usingGuardianSpace ? 'guardian' : figurePlaced,
    usedGuardianSpace: usingGuardianSpace,
  });
}

/**
 * Resolve a modular tile action from its machine-readable effect (the single
 * source of truth in `TILE_EFFECTS`), for whichever side (A/B) is in play. Applies
 * the flat VP / Energy-Core gains and returns whether the tile Autoleaps (so the
 * view can advance the Command marker one extra step). Hypersync tiles never reach
 * here — they resolve through the Hypersync flow, not the flat effect.
 */
function resolveTileAction(
  bot: ChronossusState,
  instr: Instruction[],
  id: ChronossusTileActionId,
  side: 'A' | 'B',
  n: number,
  shape?: BreakthroughShape,
  tileFamily?: string,
  operatorsAvailable = true,
  guardian?: {
    impact: boolean;
    failVP: number;
    worldCouncilFree: boolean;
    guardianAvailable: boolean;
    postImpact2VP: boolean;
    onResolved: (r: ReturnType<typeof resolveAcquireGuardian>) => void;
  },
): boolean {
  const family = TILE_ACTION_CODE[id].slice(0, -1); // 'C01A' → 'C01'
  // C14 replaces C04 (a Fractures difficulty option) and is resolved through the same
  // Assimilate action, so the caller can override the family via `tileFamily`.
  const code = `${tileFamily ?? family}${side}`;
  const tile = CHRONOSSUS_TILES[code];
  const eff = tileEffect(code);
  const gains: string[] = [];
  if (eff.vp) {
    bot.vp += eff.vp;
    gains.push(`gains ${eff.vp} VP`);
  }
  if (eff.energyCores) {
    bot.energyPool.energized += eff.energyCores;
    gains.push(`gains ${eff.energyCores} Energy Core${eff.energyCores === 1 ? '' : 's'}`);
  }
  if (eff.fluxCores && bot.fluxPool) {
    bot.fluxPool = { ...bot.fluxPool, cores: bot.fluxPool.cores + eff.fluxCores };
    gains.push(
      `gains ${eff.fluxCores} Flux Core${eff.fluxCores === 1 ? '' : 's'} into the Flux Pool`,
    );
  }
  let vp = eff.vp ?? 0;
  if (eff.acquireGuardian && guardian) {
    const res = resolveAcquireGuardian(bot, instr, n, guardian);
    guardian.onResolved(res);
    // The B side's 2 VP are scored above, whatever the branch — the tile grants them for
    // resolving the Action, not for succeeding.
    const name = CHRONOSSUS_TILES[code]?.name ?? id;
    if (eff.autoleap) {
      instr.push({
        id: `tile-${code}-autoleap-${n}`,
        text: `${code} ${name}: advance its Command marker to the next position (Autoleap).`,
      });
    }
    return eff.autoleap === true;
  }
  if (eff.assimilate) {
    const res = assimilate(bot, shape, operatorsAvailable);
    gains.push(...res.gains);
    vp += res.vp;
  }
  const name = tile?.name ?? id;
  let text =
    gains.length > 0
      ? `${code} ${name}: the Chronossus ${gains.join(' and ')}.`
      : `${code} ${name}: the Chronossus does nothing.`;
  if (eff.autoleap) text += ' Then advance its Command marker to the next position (Autoleap).';
  instr.push({
    id: `tile-${code}-${n}`,
    text,
    ...(vp ? { effect: { vp } } : {}),
  });
  return eff.autoleap === true;
}


// --- Guardians: the Acquire Guardian Action (C11, Solo Opponents p.16) -----

/**
 * The Worker the Chronossus spends to acquire a Guardian when the World Council space is
 * taken: "Most > Scientist > Engineer > Administrator > Genius". "Most" is whichever
 * column it holds the most of; the named order breaks ties (and it keeps its Genius
 * longest). Returns null when it has no Workers at all.
 */
export const GUARDIAN_WORKER_PRIORITY: Worker[] = [
  'scientist',
  'engineer',
  'administrator',
  'genius',
];

export function guardianWorkerToSpend(bot: ChronossusState): Worker | null {
  const most = Math.max(...GUARDIAN_WORKER_PRIORITY.map((w) => bot.workers[w]));
  if (most <= 0) return null;
  return GUARDIAN_WORKER_PRIORITY.find((w) => bot.workers[w] === most) ?? null;
}

/**
 * Whether the shared 6 Guardian miniatures could plausibly be gone, i.e. whether the app
 * has to ASK before resolving an Acquire Guardian. The player enlists Guardians too and
 * the app cannot see how many they hold — but the supply cannot empty before Era 4, and
 * from Era 5 the Action is a Failed Action anyway (post-Impact), so Era 4 is the only
 * Era where the question is worth a prompt.
 */
export const GUARDIAN_SUPPLY_QUESTION_ERA = 4;
export function shouldAskGuardianAvailable(era: number): boolean {
  return era >= GUARDIAN_SUPPLY_QUESTION_ERA && !isPostImpact(era);
}

/**
 * Whether an Acquire Guardian should even ASK about the World Council space. It is only an
 * Exosuit-placing Action when the bot has a figure to place; with none, the World Council
 * option is off the table and it goes straight to spending a Worker, so asking would be
 * asking for nothing (the same don't-prompt-for-nothing rule as Fractures' Blink check).
 *
 * Once past that, the only failure paths are "no Guardian remains" and "no Workers left".
 */
export function acquireGuardianAsksWorldCouncil(bot: ChronossusState): boolean {
  return placeableFigures(bot) > 0;
}

/** What an Acquire Guardian resolved to — drives the dialog copy and History. */
export type AcquireGuardianOutcome = 'world-council' | 'worker' | 'failed';

/**
 * Resolve C11 — Acquire Guardian (Solo Opponents p.16). Mutates `bot`, pushes the
 * instructions, and reports which branch ran.
 *
 *   pre-Impact, World Council free  → place a figure there, become First Player, take the
 *                                     leftmost available Guardian (no Action performed)
 *   pre-Impact, World Council taken → spend a Worker (Most > Scientist > Engineer >
 *                                     Administrator > Genius), take a Guardian, no figure
 *   otherwise / post-Impact         → a full Failed Action: +VP AND discard an active
 *                                     Exosuit (the Chronossus-only nuance)
 *
 * Either acquiring branch also has the player put one of the Chronossus's Path markers on
 * an empty Guardian board slot — that slot becomes this Guardian's own Action space.
 */
export function resolveAcquireGuardian(
  bot: ChronossusState,
  instr: Instruction[],
  n: number,
  opts: {
    impact: boolean;
    failVP: number;
    /** Player answer: is the World Council Action space still free? */
    worldCouncilFree: boolean;
    /** Player answer (Era 4+): is a Guardian still available on the Guardian board? */
    guardianAvailable: boolean;
    /** Guardians difficulty: post-Impact this Action scores 2 VP instead. */
    postImpact2VP: boolean;
  },
): { outcome: AcquireGuardianOutcome; figurePlaced: Figure | null; becameFirstPlayer: boolean } {
  const gain = (figure: Figure | null, workerSpent: Worker | null) => {
    bot.guardians = {
      owned: (bot.guardians?.owned ?? 0) + 1,
      powered: bot.guardians?.powered ?? 0,
    };
    return { figure, workerSpent };
  };

  // Post-Impact the Action can no longer acquire anything (p.16). The module's difficulty
  // option scores 2 VP for it instead of the Failed Action's 1.
  if (opts.impact) {
    if (opts.postImpact2VP) {
      bot.vp += 2;
      instr.push({
        id: `guardian-postimpact-${n}`,
        text:
          'The Impact has happened, so the Chronossus can no longer acquire Guardians — ' +
          'difficulty option: it scores 2 VP instead.',
        effect: { vp: 2 },
      });
      return { outcome: 'failed', figurePlaced: null, becameFirstPlayer: false };
    }
    bot.vp += opts.failVP;
    spendFigure(bot);
    instr.push({
      id: `guardian-postimpact-${n}`,
      text:
        'The Impact has happened, so the Chronossus can no longer acquire Guardians — ' +
        `Failed Action: it takes +${opts.failVP} VP and discards one active Exosuit.`,
      effect: { vp: opts.failVP },
    });
    return { outcome: 'failed', figurePlaced: null, becameFirstPlayer: false };
  }

  // No Guardian left on the Guardian board (the 6 are shared with the player).
  if (!opts.guardianAvailable) {
    bot.vp += opts.failVP;
    spendFigure(bot);
    instr.push({
      id: `guardian-none-${n}`,
      text:
        'No Guardian is available to recruit — Failed Action: the Chronossus takes ' +
        `+${opts.failVP} VP and discards one active Exosuit.`,
      effect: { vp: opts.failVP },
    });
    return { outcome: 'failed', figurePlaced: null, becameFirstPlayer: false };
  }

  // Option 1 — the World Council space is free and it has a figure to put there.
  if (opts.worldCouncilFree && placeableFigures(bot) > 0) {
    const figure = spendFigure(bot);
    gain(figure, null);
    instr.push({
      id: `guardian-wc-${n}`,
      text:
        `Place the Chronossus's ${figure === 'guardian' ? 'Guardian' : 'Exosuit'} on the ` +
        'World Council Action space — it becomes the First Player. It performs no Action ' +
        'there; instead it recruits the leftmost available Guardian at no cost.',
      detail:
        "Put one of the Chronossus's Path markers on an empty Guardian board slot for it — " +
        'that slot becomes this Guardian\'s own Action space. (Solo Path markers are not ' +
        'meant to be limited: if they run out, use an unused Path\'s markers.)',
    });
    return { outcome: 'world-council', figurePlaced: figure, becameFirstPlayer: true };
  }

  // Option 2 — World Council taken, or it has no figure to place (in which case this was
  // never an Exosuit Action at all): spend a Worker instead.
  const worker = guardianWorkerToSpend(bot);
  if (worker) {
    bot.workers[worker] -= 1;
    gain(null, worker);
    instr.push({
      id: `guardian-worker-${n}`,
      text:
        `The World Council Action space is taken — the Chronossus spends a ${worker} ` +
        'and recruits the leftmost available Guardian without placing an Exosuit.',
      detail:
        'Worker priority: the one it has most of, then Scientist > Engineer > Administrator > ' +
        "Genius. Put one of the Chronossus's Path markers on an empty Guardian board slot for " +
        "the new Guardian — that slot becomes its own Action space.",
    });
    return { outcome: 'worker', figurePlaced: null, becameFirstPlayer: false };
  }

  // Only one way to get here: the Worker option was the one to take and its pool is empty.
  // (Post-Impact and "no Guardian left" are handled above; a taken World Council space — or
  // no figure to place — just routes to the Worker option.)
  bot.vp += opts.failVP;
  spendFigure(bot);
  instr.push({
    id: `guardian-fail-${n}`,
    text:
      'It has no Workers left to spend on a Guardian — Failed Action: the Chronossus takes ' +
      `+${opts.failVP} VP and discards one active Exosuit.`,
    effect: { vp: opts.failVP },
  });
  return { outcome: 'failed', figurePlaced: null, becameFirstPlayer: false };
}

/** D8 — "Research takes a new Breakthrough shape": on Research, give the Chronossus a
 *  shape it doesn't already have (or the least of). */
export const DIFFICULTY_RESEARCH_NEW_SHAPE = 'chronossus-research-new-shape';

/**
 * D8's candidate shape(s) for a Research Action: whichever shape(s) are tied for the
 * LOWEST count in `bot.breakthroughs` (no fixed priority). Exactly one candidate means
 * take it directly (no roll needed); 2+ candidates means randomize among just those —
 * the caller (UI) rolls the shape die and rerolls if the result lands outside this set.
 */
export function researchShapeCandidates(bot: ChronossusState): BreakthroughShape[] {
  const min = Math.min(...BREAKTHROUGH_SHAPES.map((s) => bot.breakthroughs[s]));
  return BREAKTHROUGH_SHAPES.filter((s) => bot.breakthroughs[s] === min);
}

function resolveResearch(
  bot: ChronossusState,
  instr: Instruction[],
  shape: BreakthroughShape | undefined,
  n: number,
  newShapeDifficulty = false,
): void {
  if (shape) {
    bot.breakthroughs[shape] += 1;
    const text = newShapeDifficulty
      ? `Research (difficulty): the Chronossus takes a Breakthrough shape it doesn't already ` +
        `have (or has the fewest of) — give it any Breakthrough of the ${shape} shape.`
      : `Research: the shape die shows ${shape} — give the Chronossus any Breakthrough of that shape.`;
    instr.push({ id: `res-${n}`, text });
  } else {
    instr.push({ id: `res-${n}`, text: 'Research: roll the shape die and give the Chronossus any Breakthrough of the rolled shape.', requiresInput: true });
  }
}

function resolveRecruit(bot: ChronossusState, instr: Instruction[], recruited: Worker | undefined, n: number): void {
  const target = recruited ?? chooseRecruitWorker(bot);
  if (target) bot.workers[target] += 1;
  bot.vp += 1;
  instr.push({ id: `rec-${n}`, text: `Recruit a ${target} for the Chronossus (+1 VP).`, effect: { vp: 1 } });
  const set = applyWorkerSetBonus(bot);
  if (set) instr.push({ id: `rec-set-${n}`, text: capitalize(set), effect: { vp: 5 } });
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * The +5 VP Worker set: once the Chronossus holds all 4 Worker types it discards one of
 * each. Fractures' Operators sit in the Worker collection as wildcards and count towards
 * their column "for all purposes, including discarding for 5 VPs" (Solo Opponents p.13),
 * so they can be what gets discarded. When a column holds both a plain Worker and an
 * Operator we always discard the **Operator** — the rulebook doesn't specify, and this is
 * the choice the player makes at the table: it puts the Operator back in the Valley
 * supply (where it can matter to the player) and leaves the plain Worker in the column.
 *
 * Mutates `bot` and returns the phrase describing the discard, or null when the set
 * isn't complete.
 */
export function applyWorkerSetBonus(bot: ChronossusState): string | null {
  if (!RECRUIT_PRIORITY.every((w) => bot.workers[w] > 0)) return null;
  let operatorsDiscarded = 0;
  for (const w of RECRUIT_PRIORITY) {
    const ops = bot.operatorSlots?.[w] ?? 0;
    if (ops > 0) {
      bot.operatorSlots = { ...bot.operatorSlots, [w]: ops - 1 };
      operatorsDiscarded += 1;
    }
    bot.workers[w] -= 1;
  }
  if (operatorsDiscarded > 0) {
    bot.operators = Math.max(0, (bot.operators ?? 0) - operatorsDiscarded);
  }
  bot.vp += 5;
  const opsNote =
    operatorsDiscarded === 0
      ? ''
      : operatorsDiscarded === 1
        ? ' (1 of the discarded tokens is an Operator — return it to the Valley supply)'
        : ` (${operatorsDiscarded} of the discarded tokens are Operators — return them to the Valley supply)`;
  return `the Chronossus holds all 4 Worker types — discard one of each and add 5 VP${opsNote}`;
}

const SET_RESOURCES: Resource[] = ['neutronium', 'uranium', 'gold', 'titanium'];
function applyResourceSetBonus(bot: ChronossusState, instr: Instruction[], n: number): void {
  if (SET_RESOURCES.every((r) => bot.resources[r] > 0)) {
    for (const r of SET_RESOURCES) bot.resources[r] -= 1;
    bot.vp += 5;
    instr.push({ id: `mine-set-${n}`, text: 'The Chronossus holds all 4 Resource types — discard one of each and add 5 VP.', effect: { vp: 5 } });
  }
}

function resolveTimeTravel(bot: ChronossusState, instr: Instruction[], n: number, failVP = 1): void {
  if (bot.warpTilesOnTimeline <= 0) {
    bot.vp += failVP;
    instr.push({ id: `tt-${n}`, text: `No Warp tiles remain on the Timeline — Time Travel is Failed; the Chronossus takes +${failVP} VP (no Exosuit).`, effect: { vp: failVP } });
  } else {
    bot.warpTilesOnTimeline -= 1;
    bot.timeTravelTrack += 1;
    const spot = Math.min(bot.timeTravelTrack, TIME_TRAVEL_VP.length - 1);
    instr.push({ id: `tt-${n}`, text: 'Remove one of the Chronossus’s Warp tiles from the Timeline tile where it has the most (oldest if tied); advance its Time Travel marker 1 spot.', detail: `The marker is now worth ${TIME_TRAVEL_VP[spot]} VP.` });
  }
}

function describeCubes(cubes: Resource[]): string {
  const counts: Partial<Record<Resource, number>> = {};
  for (const c of cubes) counts[c] = (counts[c] ?? 0) + 1;
  return Object.entries(counts).map(([r, c]) => `${c} ${r}`).join(' + ');
}

function finishAction(
  state: GameState,
  bot: ChronossusState,
  instr: Instruction[],
  extra?: { figurePlaced?: Figure | null; usedGuardianSpace?: boolean },
): ChronossusActionResult {
  bot.actionsThisEra += 1;
  bot.totalActions += 1;
  const next: GameState = {
    ...state,
    chronossus: bot,
    currentInstructions: instr,
    log: [...state.log, `Chronossus action ${bot.totalActions} (Era ${state.era}).`],
  };
  return {
    state: next,
    instructions: instr,
    ...(extra?.figurePlaced ? { figurePlaced: extra.figurePlaced } : {}),
    ...(extra?.usedGuardianSpace ? { usedGuardianSpace: true } : {}),
  };
}

// --------------------------------------------------------------------------
// Phase 5: passing & end of the Action Rounds
// --------------------------------------------------------------------------
//
// Chronossus passing rule (differs from the Chronobot): "Once the Chronossus has
// run out of Exosuits, it will pass the next time it needs to execute an Action
// that would require placing an Exosuit. The Command token does not advance when
// the Chronossus passes. Once both you and it have passed, the Action Rounds
// Phase ends." Non-Exosuit actions (Time Travel, Reboot) don't trigger a pass.

/**
 * True when taking `actionId` would require placing an Exosuit the Chronossus no
 * longer has — i.e. attempting it makes the Chronossus pass instead.
 */
export function wouldPassOn(bot: ChronossusState, actionId: ChronossusActionId): boolean {
  // Guardians count: it only passes once its Exosuits AND its powered Guardians are gone.
  return placesExosuitFor(actionId) && placeableFigures(bot) <= 0;
}

/**
 * The Chronossus passes for the Era (it is out of Exosuits and the attempted
 * Action would have placed one). Its Command token does not advance.
 */
export function passChronossus(state: GameState): ChronossusActionResult {
  if (!state.chronossus) throw new Error('passChronossus: no Chronossus state');
  const bot = { ...state.chronossus, passed: true };
  const instructions: Instruction[] = [
    {
      id: 'cx-pass',
      text: 'The Chronossus is out of Exosuits and passes. (Its Command token does not advance.)',
    },
  ];
  return {
    state: {
      ...state,
      chronossus: bot,
      currentInstructions: instructions,
      log: [...state.log, `Chronossus passes (Era ${state.era}).`],
    },
    instructions,
  };
}

/** The Action Rounds phase ends once BOTH the player and the Chronossus have passed. */
export function actionRoundsEnded(state: GameState): boolean {
  return state.playerPassed && !!state.chronossus?.passed;
}

/** Verbatim "PASSING AND END OF ACTIONS" rule for the Chronossus (differs from the
 *  Chronobot: no minimum-Actions requirement). Paragraphs split on a blank line. */
export const CHRONOSSUS_PASSING_RULE =
  'Once the Chronossus has run out of Exosuits, it will pass the next time it needs ' +
  'to execute an Action that would require placing an Exosuit. Its Command token does ' +
  'not advance when it passes. Actions that place no Exosuit (such as Time Travel or ' +
  'Reboot) never trigger a pass.\n\n' +
  'Once both you and the Chronossus have passed, the Action Rounds Phase ends. Unlike ' +
  'the Chronobot, the Chronossus has no minimum number of Actions it must take.';

// --------------------------------------------------------------------------
// Hypersync mode — Solo Hypersync tiles + the C12/C13 Hypersync Action
// --------------------------------------------------------------------------
//
// Two linked mechanics:
//  1. The no-space Capital-Action fallback (handled in resolveAction) PLACES a
//     Solo Hypersync tile on the current Era — max one per Era, 3 pending total.
//  2. The C12/C13 Hypersync Action RETRIEVES the furthest-past pending tile:
//     send an Exosuit to a random available Hypersync hex, score 2 VP, remove
//     that tile (no Time Travel advance). If it has no pending tile / no Exosuit /
//     no free hex, it performs a normal Time Travel Action instead. If neither is
//     possible, it is a Failed Action (+1 VP). C12A/B then gain 1 Energy Core;
//     C13B gains 1 VP instead; C13A gains nothing. C12B/C13B also Autoleap.

/** Maximum pending Solo Hypersync tiles the Chronossus may hold at once. */
export const MAX_HYPERSYNC_TILES = 3;
/** The three Hypersync hex spaces (numbered 1–3 on the board). */
export const HYPERSYNC_HEXES = [1, 2, 3] as const;

/** Whether a Solo Hypersync tile can be placed this Era (no-space fallback). */
export function canPlaceHypersyncTile(bot: ChronossusState, era: number): boolean {
  return bot.hypersyncTiles.length < MAX_HYPERSYNC_TILES && !bot.hypersyncTiles.includes(era);
}

/** Summary the UI uses to branch the C12/C13 Hypersync Action. */
export interface HypersyncPlan {
  /** ≥1 pending tile in a PRIOR Era AND an available Exosuit → the branch is open. */
  canHypersync: boolean;
  /** The furthest-past retrievable tile's Era (a Hypersync Action retrieves this). */
  oldestTileEra: number | null;
  hasExosuit: boolean;
  /** How many pending tiles sit in prior Eras (the retrievable ones). */
  pendingCount: number;
}

/**
 * Branch summary for a C12/C13 Hypersync Action in `era`. Only tiles placed in a
 * PRIOR Era are retrievable — a tile placed THIS Era (via the same-Era no-space
 * fallback) is not "in the past" yet, so it never opens the Hypersync branch.
 */
export function hypersyncPlan(bot: ChronossusState, era: number): HypersyncPlan {
  const prior = bot.hypersyncTiles.filter((e) => e < era).sort((a, b) => a - b);
  const hasExosuit = placeableFigures(bot) > 0;
  return {
    canHypersync: prior.length > 0 && hasExosuit,
    oldestTileEra: prior.length ? prior[0] : null,
    hasExosuit,
    pendingCount: prior.length,
  };
}

export type HypersyncOutcome = 'hypersync' | 'time-travel' | 'failed';

export interface HypersyncActionInput {
  /** The tile driving this action (C12A/C12B/C13A/C13B) — sets the post-bonus. */
  code: string;
  outcome: HypersyncOutcome;
  /** The chosen Hypersync hex (1–3), when `outcome` is 'hypersync'. */
  hex?: number;
  /** Fractures combo: this Action is taken by Blinking an Exosuit onto the hex. */
  blink?: boolean;
  /** Fractures combo: the other Command tokens' Actions, for Blink selection rule A. */
  tokenActions?: Record<number, string>;
}

/**
 * Resolve a C12/C13 Hypersync Action given the branch the UI walked the player
 * through (Hypersync hex placement, the Time Travel fallback, or a Failed Action).
 * Applies the retrieve/score, the post-action bonus, and reports Autoleap.
 */
export function resolveHypersyncAction(
  state: GameState,
  input: HypersyncActionInput,
): ChronossusActionResult {
  if (!state.chronossus) throw new Error('resolveHypersyncAction: no Chronossus state');
  const bot = cloneChronossus(state.chronossus);
  const instr: Instruction[] = [];
  const n = bot.totalActions;
  const tile = CHRONOSSUS_TILES[input.code];
  const eff = tileEffect(input.code);
  const name = tile?.name ?? input.code;
  instr.push({ id: `hs-turn-${n}`, text: `The Chronossus takes the "${name}" action (${input.code}).` });

  let succeeded = false;
  if (input.outcome === 'hypersync') {
    // Retrieve the furthest-past tile in a PRIOR Era (not one placed this Era).
    const prior = bot.hypersyncTiles.filter((e) => e < state.era).sort((a, b) => a - b);
    const era = prior[0];
    const arr = [...bot.hypersyncTiles];
    arr.splice(arr.indexOf(era), 1);
    bot.hypersyncTiles = arr;
    // Fractures combo: the Hypersync board is another off-Main-board destination, so it
    // can be Blinked into — the Exosuit moves there and leaves the Blink-from list — but
    // never Blinked out of (nothing on that board is recorded).
    let hsFigure: Figure | null = null;
    if (input.blink && bot.fluxPool) {
      const sel = selectBlinkExosuit(bot, 'time-travel', input.tokenActions ?? {});
      bot.placedExosuits = (bot.placedExosuits ?? []).filter((e) => e !== sel?.exosuit);
    } else {
      hsFigure = spendFigure(bot);
    }
    bot.vp += 2;
    const where = input.hex != null ? `Hypersync hex ${input.hex}` : 'the Hypersync space for its furthest-past pending tile';
    instr.push({
      id: `hs-place-${n}`,
      text: `Send ${hsFigure === 'guardian' ? 'a Guardian' : 'an Exosuit'} to ${where}; the Chronossus scores 2 VP and retrieves its pending Solo Hypersync tile from Era ${era}.`,
      detail:
        'Do NOT advance the Time Travel marker. In post-Impact Eras it ignores the printed effect of Supercharge tiles.',
      effect: { vp: 2 },
    });
    succeeded = true;
  } else if (input.outcome === 'time-travel') {
    const hadWarp = state.chronossus.warpTilesOnTimeline > 0;
    resolveTimeTravel(bot, instr, n, failedActionVP(state.config.difficulty));
    succeeded = hadWarp;
  } else {
    const vp = failedActionVP(state.config.difficulty);
    bot.vp += vp;
    instr.push({
      id: `hs-fail-${n}`,
      text: `Neither a Hypersync nor a Time Travel Action is possible — Failed Action: the Chronossus takes +${vp} VP.`,
      effect: { vp },
    });
  }

  // Post-action bonus, applied only when the action succeeded (C12A/B: +1 Energy
  // Core; C13B: +1 VP; C13A: nothing).
  if (succeeded) {
    if (eff.energyCores) {
      bot.energyPool.energized += eff.energyCores;
      instr.push({
        id: `hs-bonus-e-${n}`,
        text: `Finally, the Chronossus gains ${eff.energyCores} Energy Core${eff.energyCores === 1 ? '' : 's'}.`,
      });
    }
    if (eff.vp) {
      bot.vp += eff.vp;
      instr.push({
        id: `hs-bonus-v-${n}`,
        text: `The Chronossus gains ${eff.vp} VP instead of an Energy Core.`,
        effect: { vp: eff.vp },
      });
    }
  }

  return { ...finishAction(state, bot, instr), autoleap: eff.autoleap === true };
}

// --------------------------------------------------------------------------
// Phase 6: Clean Up
// --------------------------------------------------------------------------

/** Retrieve Exosuits; Collapsing Capital flips happen on the physical board. */
export function resolveCleanUp(state: GameState): GameState {
  if (!state.chronossus) throw new Error('resolveCleanUp: no Chronossus state');
  const bot = {
    ...state.chronossus,
    exosuitsAvailable: 0,
    // Guardians come back too, but they stay OWNED — only the powered-this-Era count
    // resets. Their Path markers never leave the Guardian board (Classic p.10).
    ...(state.chronossus.guardians
      ? { guardians: { ...state.chronossus.guardians, powered: 0 } }
      : {}),
  };
  const instructions: Instruction[] = [
    { id: 'cleanup-retrieve', text: "Retrieve the Chronossus's Exosuits along with your own." },
    {
      id: 'cleanup-collapse',
      text: 'After the Impact, follow the usual procedure for flipping Collapsing Capital tiles.',
    },
  ];
  // Fractures: the Exosuits come off the board, and the Empty Flux Casings set aside by
  // this Era's Blink checks return to the Flux Pool (Solo Opponents p.13).
  if (bot.fluxPool) {
    const setAside = bot.fluxPool.setAside;
    bot.fluxPool = {
      cores: bot.fluxPool.cores,
      casings: bot.fluxPool.casings + setAside,
      setAside: 0,
    };
    bot.placedExosuits = [];
    if (setAside > 0) {
      instructions.push({
        id: 'cleanup-flux-casings',
        text: `Return the ${setAside} Empty Flux Casing${setAside === 1 ? '' : 's'} set aside this Era to the Flux Pool.`,
      });
    }
  }
  return {
    ...state,
    chronossus: bot,
    phase: 'cleanup',
    currentInstructions: instructions,
    log: [...state.log, `Clean Up phase (Era ${state.era}).`],
  };
}

// --------------------------------------------------------------------------
// End of game scoring
// --------------------------------------------------------------------------

export interface ChronossusScore {
  /** During-game VP from tokens/actions, excluding Buildings & Superprojects. */
  tokenVP: number;
  /** During-game VP from Construct — Buildings only (Superprojects broken out). */
  buildingVP: number;
  /** During-game VP from Construct — Superprojects only. */
  superprojectVP: number;
  /** tokenVP + buildingVP + superprojectVP = the running `bot.vp`. */
  duringGameVP: number;
  /** VP from the Time Travel marker's track position. */
  timeTravelVP: number;
  /** 1 VP per Breakthrough. */
  breakthroughVP: number;
  /** +2 VP per complete shape set (one of each). */
  shapeSetBonus: number;
  /** Negative: −3 per remaining Anomaly (same penalty as the Chronobot). */
  anomalyVP: number;
  /** D5 (`chronossus-leftover-energy-vp`): 1 VP per energized core left in the pool. */
  leftoverEnergyVP: number;
  /** Fractures: 3 VP per Technology card the Chronossus holds. 0 in other modes. */
  technologyVP: number;
  /** Fractures difficulty: 1 VP per Flux Core left in the Flux Pool. 0 otherwise. */
  leftoverFluxVP: number;
  total: number;
}

/** VP lost per Anomaly the Chronossus still holds at game end (same as Chronobot). */
export const ANOMALY_VP = -3;

/** D5 — "Leftover Energy Cores score VP": 1 VP per energized core left in the pool. */
export const DIFFICULTY_LEFTOVER_ENERGY_VP = 'chronossus-leftover-energy-vp';

/**
 * The Chronossus's VP breakdown. It does NOT lose VP for Warp tiles left on the
 * Timeline. Scores 1 VP/Breakthrough + 2 per complete shape set. (Solo Objectives
 * are a PLAYER-only scoring line — the Chronossus never scores them.) `difficulty`
 * only affects D5 (leftover Energy Core VP) — every other difficulty option scores
 * live, during the game, straight into `bot.vp`. Shared by the live pill + score screen.
 */
export function scoreChronossus(bot: ChronossusState, difficulty?: string[]): ChronossusScore {
  const breakthroughVP = BREAKTHROUGH_SHAPES.reduce((n, s) => n + bot.breakthroughs[s], 0);
  const completeSets = Math.min(...BREAKTHROUGH_SHAPES.map((s) => bot.breakthroughs[s]));
  const shapeSetBonus = completeSets * 2;
  const spot = Math.min(bot.timeTravelTrack, TIME_TRAVEL_VP.length - 1);
  const timeTravelVP = TIME_TRAVEL_VP[spot];
  const superprojectVP = bot.superprojectVps.reduce((n, v) => n + v, 0);
  const buildingVP = bot.buildingVp - superprojectVP;
  const tokenVP = bot.vp - bot.buildingVp;
  // Fractures: 3 VP per Technology held, plus (difficulty) 1 VP per leftover Flux Core.
  const technologyVP = (bot.technologies ?? 0) * TECHNOLOGY_VP;
  const leftoverFluxVP =
    difficulty?.includes(DIFFICULTY_FRACTURES_LEFTOVER_FLUX_VP) && bot.fluxPool
      ? bot.fluxPool.cores
      : 0;

  // Variable Anomalies (extra module): sum the held tiles' individual VP penalties
  // instead of the flat per-Anomaly ANOMALY_VP.
  const anomalyVP = bot.anomalyVps
    ? bot.anomalyVps.reduce((n, v) => n + v, 0)
    : bot.anomalies * ANOMALY_VP;
  const leftoverEnergyVP = difficulty?.includes(DIFFICULTY_LEFTOVER_ENERGY_VP)
    ? bot.energyPool.energized
    : 0;
  return {
    tokenVP,
    buildingVP,
    superprojectVP,
    duringGameVP: bot.vp,
    timeTravelVP,
    breakthroughVP,
    shapeSetBonus,
    anomalyVP,
    leftoverEnergyVP,
    technologyVP,
    leftoverFluxVP,
    total:
      bot.vp +
      timeTravelVP +
      breakthroughVP +
      shapeSetBonus +
      anomalyVP +
      leftoverEnergyVP +
      technologyVP +
      leftoverFluxVP,
  };
}

// --------------------------------------------------------------------------
// Phase 2: Paradox (identical rules to the Chronobot, on the Chronossus slice)
// --------------------------------------------------------------------------

/**
 * Resolve one Paradox-die roll during the Paradox phase — same rules as the
 * Chronobot: add the roll to the tracker; on reaching 3 it gains 1 Anomaly (−3 VP),
 * removes 1 Warp tile (if any), resets the tracker, and stops rolling.
 *
 * Variable Anomalies (extra module, `bot.anomalyVps != null`): gaining an Anomaly
 * needs the 2 offered tiles' data from the player, which isn't available at roll
 * time — this only flags `gainedAnomaly`/`stop` and resets the tracker; it does NOT
 * touch `anomalyVps`/`warpTilesOnTimeline`. The caller must follow up with
 * `resolveVariableAnomalyGain` once the player reports the 2 tiles.
 */
export function rollParadox(state: GameState, rolled: number): ParadoxRollResult {
  if (!state.chronossus) throw new Error('rollParadox: no Chronossus state');
  const bot = { ...state.chronossus };
  const instructions: Instruction[] = [];
  const gain = Math.max(0, rolled);
  let total = bot.paradoxes + gain;
  let gainedAnomaly = false;
  let stop = false;
  const variableAnomalies = bot.anomalyVps != null;
  const anomalyCount = variableAnomalies ? bot.anomalyVps!.length : bot.anomalies;

  if (total >= 3) {
    gainedAnomaly = true;
    stop = true;
    total -= 3;
    bot.paradoxes = total;
    if (anomalyCount >= 3) {
      instructions.push({
        id: 'paradox-capped',
        text: 'The Chronossus already has 3 Anomalies — it gains no Anomaly and removes no Warp tile. It stops rolling.',
      });
    } else if (variableAnomalies) {
      instructions.push({
        id: 'paradox-anomaly-variable',
        text: `The Chronossus rolls +${gain} Paradox — reaching 3, so it gains an Anomaly and stops rolling.`,
        // No detail: the gain prompt that follows this roll states what to do, and it
        // renders directly under this line — repeating it here just says it twice.
        requiresInput: true,
      });
    } else {
      bot.anomalies += 1;
      const removed = bot.warpTilesOnTimeline > 0;
      if (removed) bot.warpTilesOnTimeline -= 1;
      instructions.push({
        id: 'paradox-anomaly',
        text: `The Chronossus rolls +${gain} Paradox — reaching 3, so it gains 1 Anomaly (−3 VP) and stops rolling.`,
        detail: removed
          ? 'Remove one of the Chronossus’s Warp tiles from the Timeline tile where it has the most (oldest if tied). Its Paradox tracker resets' +
            (total > 0 ? ` to ${total}.` : ' to 0.')
          : 'It has no Warp tiles on the Timeline to remove.',
      });
    }
  } else {
    bot.paradoxes = total;
    instructions.push({
      id: 'paradox-roll',
      text:
        gain === 0
          ? 'The Chronossus rolls a blank — no Paradox this roll. It keeps rolling.'
          : `The Chronossus rolls +${gain} Paradox — its tracker is now ${total}. It keeps rolling.`,
    });
  }

  const next: GameState = {
    ...state,
    chronossus: bot,
    currentInstructions: instructions,
    log: [...state.log, `Paradox roll (Era ${state.era}): +${gain} → tracker ${bot.paradoxes}.`],
  };
  return { state: next, instructions, paradoxes: bot.paradoxes, gainedAnomaly, stop };
}

/** The Variable Anomaly tile the Chronossus took — the player applies the RECEIVING
 *  ANOMALIES criteria to the 2 visible tiles and reports the chosen one's data straight
 *  off the physical tile (no tile-code catalog), same as `buildingVP` for Construct. */
export interface VariableAnomalyCandidate {
  /** The tile's printed VP penalty (negative). */
  vp: number;
  /** Whether this tile lets the Chronossus retrieve a Warp tile right now (checked
   *  against the tile's Before/After Impact icon and the current Impact status). */
  retrieveEligible: boolean;
}

/**
 * Variable Anomalies (extra module) — RECEIVING ANOMALIES: "the Chronossus will select
 * one that will allow it to retrieve a Warp tile. If both or neither do, it will select
 * the one with the smaller VP penalty" (Solo Opponents p.18). The player applies that
 * criteria to the 2 visible tiles and reports the chosen tile; this records it (and its
 * Warp-tile retrieval). Call after `rollParadox` signals `gainedAnomaly` with
 * `bot.anomalyVps` present.
 */
export function resolveVariableAnomalyGain(
  state: GameState,
  chosen: VariableAnomalyCandidate,
): GameState {
  if (!state.chronossus) throw new Error('resolveVariableAnomalyGain: no Chronossus state');
  const bot = {
    ...state.chronossus,
    anomalyVps: [...(state.chronossus.anomalyVps ?? []), chosen.vp],
  };
  const removed = chosen.retrieveEligible && bot.warpTilesOnTimeline > 0;
  if (removed) bot.warpTilesOnTimeline -= 1;
  const instructions: Instruction[] = [
    {
      id: 'variable-anomaly-gain',
      text:
        `The Chronossus takes the ${chosen.vp} VP Anomaly` +
        (chosen.retrieveEligible ? ' and retrieves a Warp tile.' : '.'),
      detail: removed
        ? 'Remove one of the Chronossus’s Warp tiles from the Timeline tile where it has the most (oldest if tied).'
        : chosen.retrieveEligible
          ? 'It has no Warp tiles on the Timeline to remove.'
          : undefined,
    },
  ];
  return {
    ...state,
    chronossus: bot,
    currentInstructions: instructions,
    log: [
      ...state.log,
      `Variable Anomaly gained (${chosen.vp} VP)${removed ? ', retrieved a Warp tile' : ''}.`,
    ],
  };
}

/** Advance out of the Paradox phase to Power Up (call after rolling resolves). */
export function endParadoxPhase(state: GameState): GameState {
  if (!state.chronossus) throw new Error('endParadoxPhase: no Chronossus state');
  return {
    ...state,
    chronossus: { ...state.chronossus },
    phase: 'powerup',
    currentInstructions: [],
    log: [...state.log, `Paradox phase done (Era ${state.era}).`],
  };
}

// --------------------------------------------------------------------------
// Phase 4: Warp
// --------------------------------------------------------------------------

/** Alternate Timelines extra module — combines with any base mode. */
export const EXTRA_MODULE_ALTERNATE_TIMELINES = 'alternate-timelines';
/** Alternate Timelines' own difficulty option: 3 VP per positive effect instead of 2. */
export const DIFFICULTY_ALT_TIMELINES_3VP = 'chronossus-alt-timelines-3vp';

/**
 * Warp phase: place `paradoxes` Warp tiles for the Chronossus (the number rolled
 * on the Paradox die). Same mechanic as the Chronobot — it gains nothing from
 * them and any tiles will do — just on the Chronossus slice. Advances to Actions.
 *
 * Alternate Timelines (extra module): the Chronossus ignores negative/penalty
 * Timeline spaces entirely, but scores 2 VP (3 with its own difficulty option) for
 * each of its newly-placed Warp tiles that landed on a positive-effect space —
 * `positiveSpaces`, reported by the player (the app doesn't track Timeline-tile
 * slot colors). 0 when the module is off, which is a no-op VP-wise.
 */
export function resolveWarp(state: GameState, paradoxes: number, positiveSpaces = 0): GameState {
  if (!state.chronossus) throw new Error('resolveWarp: no Chronossus state');
  const place = Math.max(0, paradoxes);
  const perSpace = state.config.difficulty.includes(DIFFICULTY_ALT_TIMELINES_3VP) ? 3 : 2;
  const bonusVP = positiveSpaces * perSpace;
  const bot = {
    ...state.chronossus,
    warpTilesOnTimeline: state.chronossus.warpTilesOnTimeline + place,
    vp: state.chronossus.vp + bonusVP,
  };
  const instructions: Instruction[] = [
    {
      id: 'warp',
      text:
        place > 0
          ? `Place ${place} Warp tile${place === 1 ? '' : 's'} for the Chronossus on the Timeline.`
          : 'The Chronossus places no Warp tiles this Era.',
      detail:
        'Warping happens in player order. The Chronossus gains nothing for its Warp tiles ' +
        'and it does not matter which tiles it places. (You place your own 0–2 Warp tiles as normal.)' +
        (bonusVP
          ? ` Alternate Timelines: ${positiveSpaces} landed on a positive-effect space — ` +
            `+${bonusVP} VP (${perSpace} each). It ignores negative-space penalties entirely.`
          : ''),
      ...(bonusVP ? { effect: { vp: bonusVP } } : {}),
    },
  ];
  return {
    ...state,
    chronossus: bot,
    phase: 'actions',
    currentInstructions: instructions,
    log: [
      ...state.log,
      `Warp phase (placed ${place}${bonusVP ? `, +${bonusVP} VP Alternate Timelines` : ''}).`,
    ],
  };
}

// --------------------------------------------------------------------------
// Era loop
// --------------------------------------------------------------------------

/** Reset per-Era state and enter the next Era's Preparation (Phase 1). */
export function startNextEra(state: GameState): GameState {
  if (!state.chronossus) throw new Error('startNextEra: no Chronossus state');
  const era = state.era + 1;
  return {
    ...state,
    era,
    // The Impact occurs during Era 4's Clean Up, so it is in effect from Era 5 on
    // (same threshold as the Chronobot). Deriving it here keeps the flag correct
    // for the next Era's Power Up without a manual toggle.
    impact: isPostImpact(era),
    phase: 'preparation',
    playerPassed: false,
    extraTurnAfterPassUsed: false,
    chronossus: { ...state.chronossus, passed: false },
    currentInstructions: [],
    log: [...state.log, `— Era ${era} begins —`],
  };
}
