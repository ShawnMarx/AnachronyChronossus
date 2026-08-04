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
import type { BreakthroughShape, Resource, Worker } from '../types';
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
export type ChronossusTileActionId = 'tile-reboot' | 'tile-score' | 'tile-energy-pack';

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
}

const TILE_ACTIONS: Record<ChronossusTileActionId, { label: string }> = {
  'tile-reboot': { label: 'Reboot' },
  'tile-score': { label: 'Score' },
  'tile-energy-pack': { label: 'Energy Pack' },
};

/** Human-facing label for any Chronossus action id. */
export function chronossusActionLabel(id: ChronossusActionId): string {
  return isTileAction(id) ? TILE_ACTIONS[id].label : actionDef(id).label;
}

function isTileAction(id: ChronossusActionId): id is ChronossusTileActionId {
  return id === 'tile-reboot' || id === 'tile-score' || id === 'tile-energy-pack';
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

  instr.push({
    id: `turn-${n}`,
    text: `The Chronossus takes the "${chronossusActionLabel(input.actionId)}" action.`,
  });

  // Hypersync fallback: no Action space, but a Solo Hypersync tile is placed on
  // this Era and the Capital Action is performed normally (no Exosuit, NOT a
  // Failed Action). Falls through to the normal switch with placement suppressed.
  const usingHypersyncTile = input.placeHypersyncTile === true;
  if (usingHypersyncTile) {
    bot.hypersyncTiles = [...bot.hypersyncTiles, state.era];
    instr.push({
      id: `hs-tile-${n}`,
      text: `No Action space remained — the Chronossus places a Solo Hypersync tile above Era ${state.era} and performs the Action normally (no Exosuit placed, not a Failed Action).`,
      detail:
        'It has a maximum of one Hypersync tile per Era and 3 pending Hypersync tiles total.',
    });
  } else if (input.hypersyncNoTile) {
    // Hypersync Capital Action, no space, and no Hypersync tile available: a Failed
    // Action worth +1 VP — but no Exosuit is discarded (Hypersync override).
    bot.vp += 1;
    instr.push({
      id: `hs-fail-notile-${n}`,
      text: 'No Action space remained and no Solo Hypersync tile could be placed (max one per Era, 3 pending) — Failed Action: the Chronossus takes +1 VP.',
      effect: { vp: 1 },
    });
    return finishAction(state, bot, instr);
  } else if (input.noSpaceAvailable) {
    // Failed from no available space: +1 VP AND discard an active Exosuit (the
    // Chronossus-only nuance vs. the Chronobot).
    bot.vp += 1;
    if (bot.exosuitsAvailable > 0) bot.exosuitsAvailable -= 1;
    instr.push({
      id: `fail-nospace-${n}`,
      text: 'No available Action space — the Chronossus takes +1 VP and additionally discards one active Exosuit (no Exosuit placed).',
      effect: { vp: 1 },
    });
    return finishAction(state, bot, instr);
  }

  if (isTileAction(input.actionId)) {
    const autoleap = resolveTileAction(bot, instr, input.actionId, input.tileSide ?? 'A', n);
    return { ...finishAction(state, bot, instr), autoleap };
  }

  const def = actionDef(input.actionId);
  const placeExosuit = () => {
    // The Hypersync-tile fallback places a tile instead of an Exosuit.
    if (!usingHypersyncTile && def.placesExosuit && bot.exosuitsAvailable > 0) {
      bot.exosuitsAvailable -= 1;
    }
  };
  const failCantPerform = (why: string) => {
    if (def.placesExosuit && bot.exosuitsAvailable > 0) bot.exosuitsAvailable -= 1;
    bot.vp += 1;
    instr.push({
      id: `fail-perform-${n}`,
      text: `Failed Action: ${why} — the Chronossus ${def.placesExosuit ? 'places an Exosuit and ' : ''}takes +1 VP instead.`,
      effect: { vp: 1 },
    });
  };

  switch (input.actionId) {
    case 'reboot':
      instr.push({ id: `reboot-${n}`, text: 'Reboot: the Chronossus does nothing (no Exosuit, no VP).' });
      break;

    case 'research':
      resolveResearch(bot, instr, input.shape, n);
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
        resolveResearch(bot, instr, input.shape, n);
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
      resolveTimeTravel(bot, instr, n);
      break;

    case 'remove-anomaly': {
      const discards = chooseRemoveAnomalyDiscards(bot);
      if (bot.anomalies < 1 || !discards) {
        failCantPerform(bot.anomalies < 1 ? 'it has no Anomaly to remove' : 'it lacks 2 Resource cubes to spend');
      } else {
        for (const r of discards) bot.resources[r] -= 1;
        bot.anomalies -= 1;
        placeExosuit();
        instr.push({
          id: `ra-${n}`,
          text: `Discard ${describeCubes(discards)} from the Chronossus and remove 1 Anomaly.`,
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

  return finishAction(state, bot, instr);
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
): boolean {
  const family = TILE_ACTION_CODE[id].slice(0, -1); // 'C01A' → 'C01'
  const code = `${family}${side}`;
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
  const name = tile?.name ?? id;
  let text =
    gains.length > 0
      ? `${code} ${name}: the Chronossus ${gains.join(' and ')}.`
      : `${code} ${name}: the Chronossus does nothing.`;
  if (eff.autoleap) text += ' Then advance its Command marker to the next position (Autoleap).';
  instr.push({
    id: `tile-${code}-${n}`,
    text,
    ...(eff.vp ? { effect: { vp: eff.vp } } : {}),
  });
  return eff.autoleap === true;
}

function resolveResearch(bot: ChronossusState, instr: Instruction[], shape: BreakthroughShape | undefined, n: number): void {
  if (shape) {
    bot.breakthroughs[shape] += 1;
    instr.push({ id: `res-${n}`, text: `Research: the shape die shows ${shape} — give the Chronossus any Breakthrough of that shape.` });
  } else {
    instr.push({ id: `res-${n}`, text: 'Research: roll the shape die and give the Chronossus any Breakthrough of the rolled shape.', requiresInput: true });
  }
}

function resolveRecruit(bot: ChronossusState, instr: Instruction[], recruited: Worker | undefined, n: number): void {
  const target = recruited ?? chooseRecruitWorker(bot);
  if (target) bot.workers[target] += 1;
  bot.vp += 1;
  instr.push({ id: `rec-${n}`, text: `Recruit a ${target} for the Chronossus (+1 VP).`, effect: { vp: 1 } });
  if (RECRUIT_PRIORITY.every((w) => bot.workers[w] > 0)) {
    for (const w of RECRUIT_PRIORITY) bot.workers[w] -= 1;
    bot.vp += 5;
    instr.push({ id: `rec-set-${n}`, text: 'The Chronossus holds all 4 Worker types — discard one of each and add 5 VP.', effect: { vp: 5 } });
  }
}

const SET_RESOURCES: Resource[] = ['neutronium', 'uranium', 'gold', 'titanium'];
function applyResourceSetBonus(bot: ChronossusState, instr: Instruction[], n: number): void {
  if (SET_RESOURCES.every((r) => bot.resources[r] > 0)) {
    for (const r of SET_RESOURCES) bot.resources[r] -= 1;
    bot.vp += 5;
    instr.push({ id: `mine-set-${n}`, text: 'The Chronossus holds all 4 Resource types — discard one of each and add 5 VP.', effect: { vp: 5 } });
  }
}

function resolveTimeTravel(bot: ChronossusState, instr: Instruction[], n: number): void {
  if (bot.warpTilesOnTimeline <= 0) {
    bot.vp += 1;
    instr.push({ id: `tt-${n}`, text: 'No Warp tiles remain on the Timeline — Time Travel is Failed; the Chronossus takes +1 VP (no Exosuit).', effect: { vp: 1 } });
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

function finishAction(state: GameState, bot: ChronossusState, instr: Instruction[]): ChronossusActionResult {
  bot.actionsThisEra += 1;
  bot.totalActions += 1;
  const next: GameState = {
    ...state,
    chronossus: bot,
    currentInstructions: instr,
    log: [...state.log, `Chronossus action ${bot.totalActions} (Era ${state.era}).`],
  };
  return { state: next, instructions: instr };
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
  if (isTileAction(actionId)) return false;
  return actionDef(actionId).placesExosuit === true && bot.exosuitsAvailable <= 0;
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
  const hasExosuit = bot.exosuitsAvailable > 0;
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
    if (bot.exosuitsAvailable > 0) bot.exosuitsAvailable -= 1;
    bot.vp += 2;
    const where = input.hex != null ? `Hypersync hex ${input.hex}` : 'the Hypersync space for its furthest-past pending tile';
    instr.push({
      id: `hs-place-${n}`,
      text: `Send an Exosuit to ${where}; the Chronossus scores 2 VP and retrieves its pending Solo Hypersync tile from Era ${era}.`,
      detail:
        'Do NOT advance the Time Travel marker. In post-Impact Eras it ignores the printed effect of Supercharge tiles.',
      effect: { vp: 2 },
    });
    succeeded = true;
  } else if (input.outcome === 'time-travel') {
    const hadWarp = state.chronossus.warpTilesOnTimeline > 0;
    resolveTimeTravel(bot, instr, n);
    succeeded = hadWarp;
  } else {
    bot.vp += 1;
    instr.push({
      id: `hs-fail-${n}`,
      text: 'Neither a Hypersync nor a Time Travel Action is possible — Failed Action: the Chronossus takes +1 VP.',
      effect: { vp: 1 },
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
  const bot = { ...state.chronossus, exosuitsAvailable: 0 };
  const instructions: Instruction[] = [
    { id: 'cleanup-retrieve', text: "Retrieve the Chronossus's Exosuits along with your own." },
    {
      id: 'cleanup-collapse',
      text: 'After the Impact, follow the usual procedure for flipping Collapsing Capital tiles.',
    },
  ];
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
  /** During-game VP from tokens/actions, excluding Buildings. */
  tokenVP: number;
  /** During-game VP from Construct actions (Buildings & Superprojects). */
  buildingVP: number;
  /** tokenVP + buildingVP = the running `bot.vp`. */
  duringGameVP: number;
  /** VP from the Time Travel marker's track position. */
  timeTravelVP: number;
  /** 1 VP per Breakthrough. */
  breakthroughVP: number;
  /** +2 VP per complete shape set (one of each). */
  shapeSetBonus: number;
  /** Negative: −3 per remaining Anomaly (same penalty as the Chronobot). */
  anomalyVP: number;
  total: number;
}

/** VP lost per Anomaly the Chronossus still holds at game end (same as Chronobot). */
export const ANOMALY_VP = -3;

/**
 * The Chronossus's VP breakdown. It does NOT lose VP for Warp tiles left on the
 * Timeline. Scores 1 VP/Breakthrough + 2 per complete shape set. (Solo Objectives
 * are a PLAYER-only scoring line — the Chronossus never scores them.) Shared by
 * the live pill + score screen.
 */
export function scoreChronossus(bot: ChronossusState): ChronossusScore {
  const breakthroughVP = BREAKTHROUGH_SHAPES.reduce((n, s) => n + bot.breakthroughs[s], 0);
  const completeSets = Math.min(...BREAKTHROUGH_SHAPES.map((s) => bot.breakthroughs[s]));
  const shapeSetBonus = completeSets * 2;
  const spot = Math.min(bot.timeTravelTrack, TIME_TRAVEL_VP.length - 1);
  const timeTravelVP = TIME_TRAVEL_VP[spot];
  const buildingVP = bot.buildingVp;
  const tokenVP = bot.vp - buildingVP;
  const anomalyVP = bot.anomalies * ANOMALY_VP;
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
// Phase 2: Paradox (identical rules to the Chronobot, on the Chronossus slice)
// --------------------------------------------------------------------------

/**
 * Resolve one Paradox-die roll during the Paradox phase — same rules as the
 * Chronobot: add the roll to the tracker; on reaching 3 it gains 1 Anomaly (−3 VP),
 * removes 1 Warp tile (if any), resets the tracker, and stops rolling.
 */
export function rollParadox(state: GameState, rolled: number): ParadoxRollResult {
  if (!state.chronossus) throw new Error('rollParadox: no Chronossus state');
  const bot = { ...state.chronossus };
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
        text: 'The Chronossus already has 3 Anomalies — it gains no Anomaly and removes no Warp tile. It stops rolling.',
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

/**
 * Warp phase: place `paradoxes` Warp tiles for the Chronossus (the number rolled
 * on the Paradox die). Same mechanic as the Chronobot — it gains nothing from
 * them and any tiles will do — just on the Chronossus slice. Advances to Actions.
 */
export function resolveWarp(state: GameState, paradoxes: number): GameState {
  if (!state.chronossus) throw new Error('resolveWarp: no Chronossus state');
  const place = Math.max(0, paradoxes);
  const bot = {
    ...state.chronossus,
    warpTilesOnTimeline: state.chronossus.warpTilesOnTimeline + place,
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
        'and it does not matter which tiles it places. (You place your own 0–2 Warp tiles as normal.)',
    },
  ];
  return {
    ...state,
    chronossus: bot,
    phase: 'actions',
    currentInstructions: instructions,
    log: [...state.log, `Warp phase (placed ${place}).`],
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
