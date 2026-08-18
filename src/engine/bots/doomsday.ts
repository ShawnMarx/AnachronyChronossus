// doomsday.ts — the Doomsday module for the Chronossus (Solo Opponents p.14, and the
// Classic Expansion rulebook pp.3–5 for the underlying module).
//
// Pure and UI-agnostic like the rest of the engine: everything the app cannot know —
// whether a marked Experiment is on the Timeline, what its printed VP is, whether the
// Impact occurred — is passed in by the caller.
//
// The module adds one Action, Experiment (tiles C07 / C08), and one piece of state: the
// Chronossus's own tracker on the Doomsday track. Two things are deliberately NOT modelled:
//
//   * The Timeline's Experiment cards. The app asks at the Action instead of tracking which
//     card sits under which tile, because the player can remove one of the Chronossus's Path
//     markers on their own turn and the app would never see it.
//   * The Trajectory dice, the +/- symbols and the Impact tile's position. Check for Impact
//     is the player's job; the app only says WHEN to do it and takes the outcome as input.
//     Hence there is no `+`/`-` data anywhere in this file.

import type { ChronossusState, Instruction } from '../state';

/** Which of the two tracker tokens a side of the table moves. */
export type DoomsdayTracker = 'save-earth' | 'seal-fate';

/** The four Paths, for the one setup question this module asks. */
export type PlayerPath = 'harmony' | 'dominance' | 'salvation' | 'progress';

/** Its two module-specific "Increasing the Difficulty" bullets (the B-side tile flip is the
 *  shared `chronossus-tiles-b-side`, so it is not repeated here). */
export const DIFFICULTY_DOOMSDAY_NO_PLANNED = 'chronossus-doomsday-no-planned';
export const DIFFICULTY_DOOMSDAY_SEED_MARKERS = 'chronossus-doomsday-seed-markers';

/** Whether a mode id runs the Doomsday module. It combines with nothing (Solo Opponents
 *  p.19), so unlike the other modules there is never a combo id to match — but the shape
 *  is kept identical to `isPioneersMode` / `isGuardiansMode` so call sites read the same. */
export function isDoomsdayMode(modeId: string | undefined): boolean {
  return !!modeId && modeId.includes('doomsday');
}

/**
 * One slot of the Doomsday track.
 *
 * The board is a SINGLE ladder of 10 slots, not two half-tracks: both tracker tokens start
 * on slot 6 and travel in opposite directions from there — "Save Earth" up towards slot 1,
 * "Seal Fate" down towards slot 10.
 *
 * Each slot prints a VP value for up to two Paths, one per column, and the four Path symbols
 * in the board's four corners say which column belongs to whom:
 *
 *            | left column          | right column
 *   upward   | Dominance            | Harmony
 *   downward | Progress             | Salvation
 *
 * A human takes only the value on their own Path's side (Classic p.4's two worked examples
 * strike the other one through). The Chronossus does not: it takes "any printed VP on it —
 * regardless of which Path that VP belongs to" (Solo Opponents p.14), so `botVp` is the two
 * columns COMBINED. That is why slots 2 and 9 pay 4 to the bot but only 2 to a player.
 */
export interface DoomsdaySlot {
  /** 1 (topmost) … 10 (bottommost). */
  slot: number;
  /** VP printed on the left column (Dominance above the start, Progress below it). */
  left: number;
  /** VP printed on the right column (Harmony above the start, Salvation below it). */
  right: number;
  /** What the Chronossus gains for landing here: both columns combined. */
  botVp: number;
}

/** The slot both tracker tokens start on. */
export const DOOMSDAY_START_SLOT = 6;
/** The topmost slot — "Save Earth" locked: the Impact is fully mitigated and the game ends. */
export const DOOMSDAY_TOP_SLOT = 1;
/** The bottommost slot — "Seal Fate" locked: the Impact resolves immediately. */
export const DOOMSDAY_BOTTOM_SLOT = 10;

/** The track, top to bottom. Transcribed from the Doomsday board (Classic Expansion p.3)
 *  and confirmed against the physical board. */
export const DOOMSDAY_TRACK: DoomsdaySlot[] = [
  { slot: 1, left: 0, right: 3, botVp: 3 },
  { slot: 2, left: 2, right: 2, botVp: 4 },
  { slot: 3, left: 1, right: 0, botVp: 1 },
  { slot: 4, left: 1, right: 0, botVp: 1 },
  { slot: 5, left: 1, right: 0, botVp: 1 },
  { slot: 6, left: 0, right: 0, botVp: 0 },
  { slot: 7, left: 1, right: 0, botVp: 1 },
  { slot: 8, left: 1, right: 0, botVp: 1 },
  { slot: 9, left: 2, right: 2, botVp: 4 },
  { slot: 10, left: 0, right: 2, botVp: 2 },
];

/**
 * The Chronossus's tracker is always the opposing one to the player's (Solo Opponents p.14):
 * Harmony and Dominance interact with "Save Earth", Salvation and Progress with "Seal Fate",
 * so the bot takes whichever the player does not.
 */
export function botTrackerFor(path: PlayerPath): DoomsdayTracker {
  return path === 'harmony' || path === 'dominance' ? 'seal-fate' : 'save-earth';
}

/** The direction a tracker travels along the ladder: -1 up, +1 down. */
export function trackerStep(tracker: DoomsdayTracker): -1 | 1 {
  return tracker === 'save-earth' ? -1 : 1;
}

/** The slot a tracker reaches by moving one step from `slot`, clamped to the ladder. */
export function nextSlot(tracker: DoomsdayTracker, slot: number): number {
  const next = slot + trackerStep(tracker);
  return Math.min(DOOMSDAY_BOTTOM_SLOT, Math.max(DOOMSDAY_TOP_SLOT, next));
}

/** Whether `slot` is the final (top or bottom) slot for that tracker. */
export function isFinalSlot(tracker: DoomsdayTracker, slot: number): boolean {
  return slot === (tracker === 'save-earth' ? DOOMSDAY_TOP_SLOT : DOOMSDAY_BOTTOM_SLOT);
}

/** What the Chronossus gains for its tracker sitting on `slot` — both columns combined. */
export function botVpAt(slot: number): number {
  return DOOMSDAY_TRACK.find((s) => s.slot === slot)?.botVp ?? 0;
}

/**
 * Whether the tracks are locked, i.e. no further movement is allowed (Classic p.4):
 * after the Impact has occurred, or once EITHER tracker is on its final slot.
 *
 * `playerTrackerFinal` is an input because the player's tracker is not modelled — it comes
 * from the Clean Up question. Experiments may still be conducted for their VP once locked;
 * only the tracker movement (and so the track VP) stops.
 */
export function tracksLocked(opts: {
  impactOccurred: boolean;
  botTracker: DoomsdayTracker;
  botSlot: number;
  playerTrackerFinal: boolean;
}): boolean {
  return (
    opts.impactOccurred || opts.playerTrackerFinal || isFinalSlot(opts.botTracker, opts.botSlot)
  );
}

// --- Verbatim rulebook text ------------------------------------------------------------
// Shown to the player in the setup screen and the Clean Up rule box. The Experiment
// Action's own text lives with its tiles (`EXPERIMENT_DETAIL` in `board/chronossusTiles.ts`),
// matching every other module.

/** The module's opening note (Solo Opponents p.14). */
export const DOOMSDAY_REQUIREMENT =
  'THIS REQUIRES THE CLASSIC EXPANSION PACK TO PLAY.\n' +
  'All of the Doomsday module and the Chronossus base rules apply, unless noted below. ' +
  'We suggest using the “Planned Experiments” variant the first few times you play ' +
  'this against the Chronossus.';

/** "CHANGES AT SETUP" (Solo Opponents p.14). */
export const DOOMSDAY_SETUP_RULE =
  'CHANGES AT SETUP\n' +
  '• Place the following Action tiles (with the marked sides face up) on the empty ' +
  'spaces of the Chronossus board:\n' +
  '  » C07A to the (I) empty space.\n' +
  '  » C08A to the (II) empty space.\n' +
  '• Leave C03A in play.\n' +
  '• Add the “Completed Experiments” Solo Objective card to the Solo Objective deck.';

/** "INCREASING THE DIFFICULTY" (Solo Opponents p.14). */
export const DOOMSDAY_DIFFICULTY_RULE =
  'INCREASING THE DIFFICULTY\n' +
  'Select one or more of these options to increase the difficulty in ways specific to the ' +
  'Doomsday module:\n' +
  '• Flip some or all of the new Action tiles to their B side.\n' +
  '• Play without the Planned Experiments variant.\n' +
  '• Place a Path marker on one or more future Experiments during setup. These are now ' +
  'available to be taken once they are in the present.';

/**
 * "CLEAN UP PHASE — CHANGES / B) CHECK FOR IMPACT" (Classic Expansion p.5).
 *
 * Shown in full even though the app performs none of it — this is the one part of a
 * Doomsday game the player runs themselves, so the rule box IS the instruction.
 */
export const DOOMSDAY_CHECK_FOR_IMPACT_RULE =
  'CLEAN UP PHASE — CHANGES\n' +
  'B) CHECK FOR IMPACT\n' +
  'At the beginning of the Check for Impact phase of each Era, roll the two Trajectory dice, ' +
  'then count the total number of (-) and (+) symbols\n' +
  '• on the Trajectory die roll’s result;\n' +
  '• next to the Doomsday track slots where the “Save Earth” and “Seal ' +
  'Fate” Trackers currently are.\n' +
  'Three things can happen based on the result:\n' +
  '1. If there are more (+) symbols in total than (-), move the Impact tile 1 space to the ' +
  'right on the Timeline track if possible — the Impact will occur one Era later.\n' +
  '2. If there are more (-) symbols in total than (+), move the Impact tile 1 space to the ' +
  'left on the Timeline track — the Impact will occur one Era earlier. If this would ' +
  'move the Impact tile behind the current Era tile, do not move the Impact tile.\n' +
  '3. If the number of (-) and (+) symbols is equal, do not move the Impact tile.\n' +
  '\n' +
  'IMPORTANT: If the “Seal Fate” tracker is on the bottommost spot of the Doomsday ' +
  'track during the Check for Impact phase, do not roll the Trajectory dice - instead, place ' +
  'the Impact tile after the current Timeline tile (regardless of its position) and resolve ' +
  'the Impact immediately.\n' +
  '\n' +
  'IMPORTANT: If the “Save Earth” tracker is on the topmost spot of the Doomsday ' +
  'track, the Impact’s damage to the present is completely mitigated, and the game is ' +
  'over — proceed to Ending the Game. In games where Earth is saved, the Impact is never ' +
  'resolved, so there will be no Evacuation - try to adjust your game plan accordingly!';

/** "OPTIONAL RULE — PLANNED EXPERIMENTS" (Classic Expansion p.5). */
export const DOOMSDAY_PLANNED_EXPERIMENTS_RULE =
  'OPTIONAL RULE — PLANNED EXPERIMENTS\n' +
  'These optional rules are meant for players who are already familiar with the Doomsday ' +
  'module, and prefer planning their Experiment Actions ahead.\n' +
  '• Place the Level 2 Experiment stack face up next to the Doomsday board (instead of ' +
  'face down). The top Level 2 Experiment card will always be visible for everyone.\n' +
  '• Whenever a player claims an Experiment card, immediately replace it with the top ' +
  'Level 2 Experiment from the stack, until the Experiment stack runs out.\n' +
  '• During the Preparation phase, do not place any Level 2 Experiment cards under the ' +
  'Timeline.';

/** The Impact tile starts between the FIFTH and SIXTH Timeline tile (Classic p.3), not the
 *  fourth and fifth — so absent any Check-for-Impact movement the Impact resolves in Era 5's
 *  Clean Up and Era 6 is the first post-Impact Era. Movement is the player's to apply, and
 *  reaches the app as an answer rather than a calculation (see PLAN D1). */
export const DOOMSDAY_DEFAULT_IMPACT_ERA = 5;

/**
 * The Era whose Clean Up resolves the Impact: the player's answer once they have given it,
 * the default until then. Doomsday is the only mode where this is not a constant, because
 * the Impact tile moves during play and the app does not track it.
 */
export function doomsdayImpactEra(bot: Pick<ChronossusState, 'doomsday'> | null | undefined): number {
  return bot?.doomsday?.impactEra ?? DOOMSDAY_DEFAULT_IMPACT_ERA;
}

// --- The Experiment Action -------------------------------------------------------------

/**
 * What the app cannot know and has to ask, at the moment the Action resolves.
 *
 * There is no Timeline model behind these (see the file header): the dialog states the
 * rulebook's selection rule and the player reports what is actually on the table.
 */
export interface ExperimentInput {
  /**
   * Step 1 — is there an Experiment of this tile's level carrying one of the Chronossus's
   * Path markers? The dialog does not ask on the first Experiment Action of a game (no
   * markers can be out yet) and passes `false`, unless the "pre-seed Path markers"
   * difficulty put some out at setup.
   */
  markedAvailable: boolean;
  /** Step 1 — the VP printed on the Experiment it took (2 or 3). Only when it took one. */
  experimentVp?: number;
  /**
   * Step 2 — could a Path marker be placed? False when EVERY face-up Experiment already
   * carries one, which is the only way this step fails (Solo Opponents p.14's NOTE).
   */
  canPrepare: boolean;
}

export interface ExperimentResult {
  level: 1 | 2;
  /** Step 1 succeeded — an Experiment was taken. */
  executed: boolean;
  /** VP from the Experiment card itself. */
  experimentVp: number;
  /** Whether the tracker moved (it does not once the tracks are locked). */
  trackerMoved: boolean;
  fromSlot: number;
  toSlot: number;
  /** VP from the track slot it landed on — both Path columns combined. */
  trackVp: number;
  /** The tracks were already locked, so the Experiment scored but moved nothing. */
  locked: boolean;
  /** Step 2 succeeded — a Path marker was placed for a later turn. */
  prepared: boolean;
  /** Its tracker reached "Save Earth" topmost: the Impact never happens, the game ends. */
  endsGame: boolean;
  /** Its tracker reached "Seal Fate" bottommost: the Impact resolves immediately. */
  impactNow: boolean;
}

/**
 * Resolve an Experiment Action (C07 = Level 1, C08 = Level 2).
 *
 * Two steps, in order, and the rulebook is explicit that either can fail on its own:
 * "It is possible for one of the steps to fail (if none/all of the Experiments have a Path
 * marker, respectively). If this happens, ignore that step." A failed Step 1 does NOT stop
 * Step 2 — the bot can still mark an Experiment for a later turn.
 *
 * Mutates `bot` in place and pushes its instructions, like the other module resolvers.
 */
export function resolveDoomsdayAction(
  bot: ChronossusState,
  instr: Instruction[],
  n: number,
  level: 1 | 2,
  input: ExperimentInput,
): ExperimentResult {
  const d = bot.doomsday;
  if (!d) throw new Error('resolveDoomsdayAction: no Doomsday state');

  const trackerName = d.botTracker === 'save-earth' ? 'Save Earth' : 'Seal Fate';
  const fromSlot = d.botSlot;
  const result: ExperimentResult = {
    level,
    executed: false,
    experimentVp: 0,
    trackerMoved: false,
    fromSlot,
    toSlot: fromSlot,
    trackVp: 0,
    locked: false,
    prepared: false,
    endsGame: false,
    impactNow: false,
  };

  // --- STEP 1: EXECUTE EXPERIMENT -------------------------------------------------------
  if (!input.markedAvailable) {
    instr.push({
      id: `exp-none-${n}`,
      text: `No Level ${level} Experiment carries one of the Chronossus’s Path markers — skip this step.`,
      detail:
        'A step that cannot be performed is simply ignored; the Action still continues to ' +
        'Step 2.',
    });
  } else {
    const vp = input.experimentVp ?? 0;
    result.executed = true;
    result.experimentVp = vp;
    bot.vp += vp;
    d.experimentsCompleted += 1;
    instr.push({
      id: `exp-take-${n}`,
      text:
        `Give the Chronossus the leftmost Level ${level} Experiment on the Timeline carrying ` +
        `one of its Path markers, and discard that marker. It scores the ${vp} VP printed ` +
        `on the card.`,
      ...(vp ? { effect: { vp } } : {}),
    });

    // The tracker only moves while the tracks are open — after the Impact, or once either
    // tracker is on its final slot, "Experiments may still be conducted for their VP
    // values" but nothing moves (Classic p.4).
    result.locked = tracksLocked({
      impactOccurred: d.impactEra != null,
      botTracker: d.botTracker,
      botSlot: d.botSlot,
      playerTrackerFinal: d.playerTrackerFinal,
    });
    if (result.locked) {
      instr.push({
        id: `exp-locked-${n}`,
        text: `The Doomsday tracks are locked, so the ${trackerName} marker does not move.`,
        detail:
          'No movement is allowed once the Impact has occurred or either tracker has reached ' +
          'its final slot — but Experiments still score their VP.',
      });
    } else {
      const toSlot = nextSlot(d.botTracker, d.botSlot);
      const trackVp = botVpAt(toSlot);
      d.botSlot = toSlot;
      bot.vp += trackVp;
      result.trackerMoved = true;
      result.toSlot = toSlot;
      result.trackVp = trackVp;
      instr.push({
        id: `exp-track-${n}`,
        text:
          `Move the ${trackerName} marker one step ${d.botTracker === 'save-earth' ? 'up' : 'down'} ` +
          `the Doomsday track` +
          (trackVp ? `. The Chronossus scores the ${trackVp} VP printed there.` : ' (no VP printed there).'),
        detail:
          trackVp > 0
            ? 'The Chronossus takes any printed VP on the spot regardless of which Path it ' +
              'belongs to, so where a spot prints a value for each Path it takes both.'
            : undefined,
        ...(trackVp ? { effect: { vp: trackVp } } : {}),
      });

      // Reaching its own end of the ladder is a hard stop the app can see for itself.
      if (isFinalSlot(d.botTracker, toSlot)) {
        if (d.botTracker === 'save-earth') {
          result.endsGame = true;
          instr.push({
            id: `exp-earth-saved-${n}`,
            text:
              'The Save Earth marker has reached the topmost slot — the Impact’s damage is ' +
              'completely mitigated and the game is over.',
            detail:
              'In games where Earth is saved the Impact is never resolved, so there is no ' +
              'Evacuation.',
          });
        } else {
          result.impactNow = true;
          instr.push({
            id: `exp-fate-sealed-${n}`,
            text:
              'The Seal Fate marker has reached the bottommost slot — place the Impact tile ' +
              'after the current Timeline tile and resolve the Impact immediately.',
            detail: 'Do not roll the Trajectory dice in this Era’s Check for Impact.',
          });
        }
      }
    }
  }

  // --- STEP 2: PREPARE FOR EXPERIMENTATION ---------------------------------------------
  if (input.canPrepare) {
    result.prepared = true;
    instr.push({
      id: `exp-prepare-${n}`,
      text:
        'Place one of the Chronossus’s Path markers on a face-up Experiment that does not ' +
        'already have one — a Level 1 before a Level 2, and the furthest in the past on the ' +
        'Timeline to break a tie.',
      detail:
        'Never the Experiment under the next Era. Your Focus marker has no effect on this ' +
        'choice.',
    });
  } else {
    instr.push({
      id: `exp-noprepare-${n}`,
      text: 'Every available face-up Experiment already carries a Path marker — skip this step.',
    });
  }

  d.experimentActionRun = true;
  return result;
}

// --- Check for Impact (Clean Up) ---------------------------------------------------------

/**
 * What the player reports after running Check for Impact themselves.
 *
 * The app rolls no Trajectory dice and tracks no Impact tile (PLAN D1) — it asks first
 * whether either tracker has locked in, and only if neither has, whether the Impact
 * occurred. These are those answers.
 */
export type CheckForImpactOutcome =
  /** "Save Earth" is on the topmost slot: the Impact is mitigated and the game ends now. */
  | 'earth-saved'
  /** "Seal Fate" is on the bottommost slot: the Impact resolves immediately. */
  | 'impact-now'
  /** Neither tracker is locked, and the Impact occurred at the end of this Era. */
  | 'impact-occurred'
  /** Neither tracker is locked, and the Impact has not happened yet. */
  | 'not-yet';

/** Whether the Chronossus's own tracker has reached the end of the ladder. */
export function botTrackerLocked(bot: Pick<ChronossusState, 'doomsday'>): boolean {
  const d = bot.doomsday;
  return !!d && isFinalSlot(d.botTracker, d.botSlot);
}

/**
 * Whether this Era's Check for Impact still needs an answer. False once answered, and false
 * once the Impact has happened — after that the tracks are locked and the tile cannot move,
 * so there is nothing left to check.
 */
export function needsImpactCheck(bot: Pick<ChronossusState, 'doomsday'>, era: number): boolean {
  const d = bot.doomsday;
  if (!d) return false;
  if (d.impactEra != null) return false;
  return d.checkedEra !== era;
}

/**
 * Record this Era's Check for Impact. Pure — returns a new slice rather than mutating, since
 * the Clean Up screen commits it as a phase transition rather than as part of a bot turn.
 *
 * `playerTrackerFinal` is only set when the lock came from the PLAYER's tracker; when the
 * Chronossus's own marker is the one on its final slot the lock is already implied by
 * `botSlot`, and claiming otherwise would misreport whose marker ended the game.
 */
export function answerCheckForImpact(
  bot: ChronossusState,
  era: number,
  outcome: CheckForImpactOutcome,
): ChronossusState {
  const d = bot.doomsday;
  if (!d) return bot;
  const lockedByBot = botTrackerLocked(bot);
  const locking = outcome === 'earth-saved' || outcome === 'impact-now';
  return {
    ...bot,
    doomsday: {
      ...d,
      checkedEra: era,
      // "earth-saved" is the one outcome where no Impact EVER happens (Classic p.5: "the
      // Impact is never resolved, so there will be no Evacuation").
      impactEra:
        outcome === 'impact-now' || outcome === 'impact-occurred' ? era : d.impactEra,
      playerTrackerFinal: d.playerTrackerFinal || (locking && !lockedByBot),
      earthSaved: d.earthSaved || outcome === 'earth-saved',
    },
  };
}

/**
 * Whether this game ended with Earth saved — the Impact mitigated entirely, so no Era is
 * post-Impact and there is no Evacuation.
 */
export function earthSaved(bot: Pick<ChronossusState, 'doomsday'> | null | undefined): boolean {
  return bot?.doomsday?.earthSaved === true;
}
