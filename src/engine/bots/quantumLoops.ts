// quantumLoops.ts — the Quantum Loops add-on module for the Chronossus
// (Solo Opponents p.18; Future Imperfect pp.7–8 for the underlying module).
//
// The smallest module in the matrix, because the Chronossus barely touches it. Its ENTIRE
// involvement is one die roll in the Warp Phase: having placed at least one Warp tile, roll
// the AI die, and on a 4 the card farthest from the player's draw deck is removed from play
// for good. It never takes a card, never returns one, and gains nothing — the removal is
// pure denial unless a difficulty option is on.
//
// Deliberately NOT modelled: the Quantum Loop card row itself. The app never tracks the
// 3-card offer, the face-down deck, which cards are out, or how many have gone. The PLAYER
// takes and returns cards and the Preparation Phase refills the offer, so any model the app
// kept would drift within an Era and no other part of the app would be better for it. The
// removal is an instruction plus a History line, and that is the whole feature — which is
// why this module, alone among them, adds no `ChronossusState` slice at all.

/** Quantum Loops extra module — combines with every base mode, Doomsday included
 *  (Solo Opponents p.19 lists it among the three that don't affect Action tile placement,
 *  and it appears in none of the "cannot be combined with" lists). */
export const EXTRA_MODULE_QUANTUM_LOOPS = 'quantum-loops';

/** Its two "Increasing the Difficulty" bullets (Solo Opponents p.18). */
export const DIFFICULTY_QL_REMOVE_ON_5 = 'chronossus-ql-remove-on-5';
export const DIFFICULTY_QL_2VP = 'chronossus-ql-2vp';

/** VP the Chronossus receives per removed card under `DIFFICULTY_QL_2VP`. */
export const QUANTUM_LOOPS_REMOVAL_VP = 2;

/** The AI-die face that removes a card in the base module. */
export const QUANTUM_LOOPS_REMOVE_ON = 4;
/** The extra face that also removes one under `DIFFICULTY_QL_REMOVE_ON_5`. */
export const QUANTUM_LOOPS_REMOVE_ON_HARD = 5;

/** Whether Quantum Loops is in play for a game config. */
export function isQuantumLoops(extraModules: string[] | undefined): boolean {
  return extraModules?.includes(EXTRA_MODULE_QUANTUM_LOOPS) ?? false;
}

// --------------------------------------------------------------------------
// Verbatim rulebook text (Solo Opponents p.18)
// --------------------------------------------------------------------------

/** The module's opening line. */
export const QUANTUM_LOOPS_REQUIREMENT =
  'THIS REQUIRES THE FUTURE IMPERFECT EXPANSION TO PLAY.\n' +
  'All of the Quantum Loops module and Chronossus base rules apply, unless noted below.';

/** "CHANGES AT SETUP" (Solo Opponents p.18). */
export const QUANTUM_LOOPS_SETUP_RULE =
  'CHANGES AT SETUP\n' +
  'No changes at Setup. Keep the Quantum Loop cards in a row, adding new ones closest to ' +
  'the draw deck.';

/** "4 WARP PHASE" (Solo Opponents p.18) — the whole of the bot's involvement. */
export const QUANTUM_LOOPS_WARP_RULE =
  '4 WARP PHASE\n' +
  'In each Warp Phase, when the Chronossus places at least one warp tile, roll the AI die. ' +
  'On a roll of 4, remove the Quantum Loop card farthest from the draw deck from play.';

/** "5 ACTION ROUNDS PHASE" (Solo Opponents p.18) — why removals are permanent. */
export const QUANTUM_LOOPS_ACTION_RULE =
  '5 ACTION ROUNDS PHASE\n' +
  'The Chronossus does not actually interact with Quantum Loops. It never “returns” them, ' +
  'thus cards removed during the Warp Phase are permanently removed. When you return a ' +
  'card, add it back to the row of Quantum Loop cards farthest from the draw deck.\n' +
  'If you gain the Cosmic Data Leak card, draw 2 unused Solo Objectives and put them into ' +
  'play.';

/** "INCREASING THE DIFFICULTY" (Solo Opponents p.18). */
export const QUANTUM_LOOPS_DIFFICULTY_RULE =
  'INCREASING THE DIFFICULTY\n' +
  'Select one or more of these options to increase the difficulty in ways specific to the ' +
  'Quantum Loops module:\n' +
  '• Also remove a Quantum Loop card on a roll of 5.\n' +
  '• When removing a Quantum Loop card, the Chronossus receives 2 VPs.';

// --------------------------------------------------------------------------
// The check
// --------------------------------------------------------------------------

/** What the Warp Phase's Quantum Loops check came to. */
export interface QuantumLoopsResult {
  /** Whether the check ran at all — false when no Warp tile was placed. */
  rolled: boolean;
  /** Whether the card farthest from the draw deck is removed from play. */
  removes: boolean;
  /** VP the Chronossus receives for the removal (0 without the difficulty option). */
  vp: number;
}

/**
 * Resolve the Warp Phase check. Pure: the caller rolls the AI die, as everywhere else in
 * the engine.
 *
 * The rule is conditioned on the Chronossus having placed at least one Warp tile, so with
 * `tilesPlaced` at 0 there is no roll to report — `rolled` is false and the view shows
 * nothing rather than a die that never mattered.
 */
export function quantumLoopRemoval(opts: {
  tilesPlaced: number;
  roll: number | null;
  difficulty: string[];
}): QuantumLoopsResult {
  const none: QuantumLoopsResult = { rolled: false, removes: false, vp: 0 };
  if (opts.tilesPlaced <= 0 || opts.roll == null) return none;
  const alsoOn5 = opts.difficulty.includes(DIFFICULTY_QL_REMOVE_ON_5);
  const removes =
    opts.roll === QUANTUM_LOOPS_REMOVE_ON || (alsoOn5 && opts.roll === QUANTUM_LOOPS_REMOVE_ON_HARD);
  const scores = removes && opts.difficulty.includes(DIFFICULTY_QL_2VP);
  return { rolled: true, removes, vp: scores ? QUANTUM_LOOPS_REMOVAL_VP : 0 };
}
