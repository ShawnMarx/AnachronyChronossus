// Verbatim module rules the Chronossus's PHASE screens show, as they are shown.
//
// These sit beside the module rule constants in `quantumLoops.ts` / `doomsday.ts`, which
// carry the rulebook's own headed form ("4 WARP PHASE\n…") and are rendered nowhere. What
// the screens actually display is the same text with the heading inline and bold, so that
// is what lives here and what a translator sees.
//
// The `**…**` runs are the emphasis the book prints; these blocks render through `<T>`,
// which turns them into <b>. Every key here starts `rule.`, so it is gated behind a
// locale's `officialRulebook` flag like every other book quote.

/** Alternate Timelines — WARP PHASE (Solo Opponents p. 18). */
export const CX_ALT_TIMELINES_WARP_RULE =
  '**WARP PHASE:** In the Warp Phase, you must decide how many Resources and/or Workers ' +
  'to warp first, then roll for the Chronossus. Place the tiles in turn order, as usual.';

/** Alternate Timelines — how the bot scores warped spaces (Solo Opponents p. 18). */
export const CX_ALT_TIMELINES_SCORING_RULE =
  'It ignores penalties (red spaces), and it receives 2 VPs instead of any positive ' +
  'rewards. You resolve both positive and negative effects as normal.';

/** Alternate Timelines — INCREASING THE DIFFICULTY (Solo Opponents p. 18). */
export const CX_ALT_TIMELINES_DIFFICULTY_RULE =
  '**INCREASING THE DIFFICULTY:** The Chronossus scores 3 VPs per positive effect.';

/** Quantum Loops — WARP PHASE (Solo Opponents p. 18). */
export const CX_QUANTUM_LOOPS_WARP_RULE =
  '**WARP PHASE:** In each Warp Phase, when the Chronossus places at least one warp ' +
  'tile, roll the AI die. On a roll of 4, remove the Quantum Loop card farthest from the ' +
  'draw deck from play.';

/** Quantum Loops — ACTION ROUNDS PHASE (Solo Opponents p. 18). */
export const CX_QUANTUM_LOOPS_ACTION_RULE =
  '**ACTION ROUNDS PHASE:** The Chronossus does not actually interact with Quantum ' +
  'Loops. It never “returns” them, thus cards removed during the Warp Phase are ' +
  'permanently removed. When you return a card, add it back to the row of Quantum Loop ' +
  'cards farthest from the draw deck.';

/** Quantum Loops — INCREASING THE DIFFICULTY, remove on a 5 (Solo Opponents p. 18). */
export const CX_QUANTUM_LOOPS_REMOVE_ON_5_RULE =
  '**INCREASING THE DIFFICULTY:** Also remove a Quantum Loop card on a roll of 5.';

/** Quantum Loops — INCREASING THE DIFFICULTY, 2 VP (Solo Opponents p. 18). */
export const CX_QUANTUM_LOOPS_2VP_RULE =
  '**INCREASING THE DIFFICULTY:** When removing a Quantum Loop card, the Chronossus ' +
  'receives 2 VPs.';

/** Variable Anomalies — CHANGES AT SETUP (Solo Opponents p. 18). */
export const CX_VARIABLE_ANOMALIES_SETUP_RULE =
  '**CHANGES AT SETUP:** The Chronossus ignores all unique effects of the Anomalies and ' +
  'does not receive an Anomaly Remover tile.';

/** Variable Anomalies — RECEIVING ANOMALIES (Solo Opponents p. 18). */
export const CX_VARIABLE_ANOMALIES_RECEIVING_RULE =
  '**RECEIVING ANOMALIES:** When receiving Anomalies, the Chronossus will select one ' +
  'that will allow it to retrieve a Warp tile. If both or neither do, it will select the ' +
  'one with the smaller VP penalty.';

/** Targeted Hypersync — the difficulty option's own rule (Solo Opponents p. 17). */
export const CX_TARGETED_HYPERSYNC_RULE =
  'Instead of randomly selecting a Hypersync Action space to take, the Chronossus takes ' +
  'the one corresponding to one of your pending Hypersync tiles. If you have more than ' +
  'one, it takes the one furthest in the past.';
