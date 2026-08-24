// Verbatim rulebook SETUP text, as the Chronossus setup screen shows it.
//
// These are the "CHANGES AT SETUP" blocks from the "Chronobot & Chronossus Solo
// Opponents" rulebook (and, for Quantum Loops / Hypersync, the modules' own books),
// lightly reflowed from the books' bullet lists into running prose — which is how the
// setup screen has always rendered them.
//
// They live here rather than inline in the JSX for the same reason every other rulebook
// quote does: `rule.*` keys are gated behind a locale's `officialRulebook` flag, so a
// translation only replaces them once that language's OFFICIAL edition has been
// transcribed. App-voice setup copy stays in `uiStrings.ts`.
//
// NOTE: `doomsday.ts` and `quantumLoops.ts` each already carry a `*_SETUP_RULE` in the
// books' own headed/bulleted form. Those are not rendered anywhere; these are. Reconciling
// the two is a follow-up (see TODO.md) — merging them would change displayed text, which
// an i18n conversion must not do.

/** Format: paragraphs separated by a blank line; a single newline is a line break. */
export type RuleText = string;

/** Base Chronossus, "CHANGES AT SETUP" (Solo Opponents p. 8). */
export const CX_SETUP_RULE: RuleText =
  'Set up a 2-player game with the Chronossus as one of the players. In addition to ' +
  'using the Chronossus’s side of the Solo board, the following changes need to be made ' +
  'during set-up:\n' +
  '\n' +
  '• The Chronossus receives its 6 Exosuits and 8 Warp tiles. It does not receive any ' +
  'Starting Assets or Workers.\n' +
  '• Leave all Endgame Condition cards in the box and shuffle all Solo Objective cards, ' +
  'revealing 3. Return the rest to the box.\n' +
  '• Place the Chronossus board next to the Main board, and place the 4 Command tokens ' +
  'on the 4 marked positions. The Chronossus does not use a Focus marker.\n' +
  '• Place the Action tiles (marked side up) on the empty spaces of the Chronossus ' +
  'board: C01A, C02A, C03A. (Suggested for your first game; later you may assign them ' +
  'randomly.)\n' +
  '• Fill the Chronossus’s Energy Pool container with 5 Energy Core tokens and 5 ' +
  'Exhausted Energy Core tokens.\n' +
  '• Place the Chronossus’s Banner on the First Player spot; it is the First Player in ' +
  'the 1st Era. You receive 1 additional Water (for being the second player).\n' +
  '• You may still choose to use either the “A” or the “B” side of your Player board.\n' +
  '• For a more challenging game, cover the right World Council space with a Hex ' +
  'Unavailable tile.';

/** Fractures of Time, "CHANGES AT SETUP" (Solo Opponents p. 12). */
export const CX_SETUP_FRACTURES_RULE: RuleText =
  'Setup the Valley board as if it was a 2-Player game.\n' +
  '\n' +
  'Place the following Action tiles (with the marked sides face up) on the empty spaces ' +
  'of the Chronossus board: C04A, C05A and C06A.\n' +
  '\n' +
  'You will need a second container, referred to as the “Flux Pool.” At setup, add 1 ' +
  'Flux Core and all 3 Empty Flux Casing tokens to it.\n' +
  '\n' +
  'The Chronossus does not use a Fracture Device.\n' +
  '\n' +
  'Add the “Technology Cards” and “Flux on Track” Solo Objective cards to the deck ' +
  'before drawing.';

/** Guardians of the Council, "CHANGES AT SETUP" (Solo Opponents p. 16). */
export const CX_SETUP_GUARDIANS_RULE: RuleText =
  'Place the following Action tiles (with the marked sides face up) on the empty spaces ' +
  'of the Chronossus board: C02A to the (I) empty space, C11A to the (II) empty space. ' +
  'Leave C03A in play.\n' +
  '\n' +
  'Add the “Guardians” Solo Objective card to the Solo Objective deck.\n' +
  '\n' +
  'Cover the right World Council Action space with a Hex Unavailable tile (as noted in ' +
  'the Guardians of the Council rules for 2 players).';

/** Pioneers of New Earth, "CHANGES AT SETUP" (Solo Opponents p. 15). */
export const CX_SETUP_PIONEERS_RULE: RuleText =
  'This requires the Classic Expansion Pack to play. All of the Pioneers of New Earth ' +
  'module and Chronossus base rules apply, unless noted below.\n' +
  '\n' +
  'Place the following Action tiles (with the marked sides face up) on the empty spaces ' +
  'of the Chronossus board: C03A to the (I) empty space, C09A to the (II) empty space, ' +
  'C02A to the (III) empty space. C10A replaces the printed “Recruit Genius or Research” ' +
  'Action space.\n' +
  '\n' +
  'Add the “Successful Adventures” Solo Objective card to the Solo Objective deck.\n' +
  '\n' +
  'Give it the Chronossus Exosuit Upgrade board with the “A” side up.';

/** Doomsday, "CHANGES AT SETUP" (Solo Opponents p. 14). */
export const CX_SETUP_DOOMSDAY_RULE: RuleText =
  'This requires the Classic Expansion Pack to play. All of the Doomsday module and the ' +
  'Chronossus base rules apply, unless noted below. We suggest using the “Planned ' +
  'Experiments” variant the first few times you play this against the Chronossus.\n' +
  '\n' +
  'Place the following Action tiles (with the marked sides face up) on the empty spaces ' +
  'of the Chronossus board: C07A to the (I) empty space, C08A to the (II) empty space. ' +
  'Leave C03A in play.\n' +
  '\n' +
  'Add the “Completed Experiments” Solo Objective card to the Solo Objective deck.';

/** Hypersync Future Actions, "CHANGES AT SETUP" (Solo Opponents p. 17). */
export const CX_SETUP_HYPERSYNC_RULE: RuleText =
  'Use the 2-player side of the Hypersync board, and cover the right World Council ' +
  'Action space on the Main board with a Hex Unavailable tile (as noted in the Hypersync ' +
  'rules for 2 players).\n' +
  '\n' +
  'Replace C01A with C12A. Leave C02A and C03A in play. Cover the Time Travel Action ' +
  'space with C13A.\n' +
  '\n' +
  'Place the Solo Hypersync tiles next to the Chronossus board.';

/** Quantum Loops, "CHANGES AT SETUP" (Solo Opponents p. 18). */
export const CX_SETUP_QUANTUM_LOOPS_RULE: RuleText =
  'This requires the Future Imperfect expansion to play. All of the Quantum Loops module ' +
  'and Chronossus base rules apply, unless noted below.\n' +
  '\n' +
  'No changes at Setup. Keep the Quantum Loop cards in a row, adding new ones closest to ' +
  'the draw deck.';

/** Doomsday, the bot's own tracker (Solo Opponents p. 14) — shown on the Path screen. */
export const CX_DOOMSDAY_TRACKER_RULE: RuleText =
  'If it successfully took an Experiment and the Doomsday tracks aren’t yet locked, it ' +
  'moves its preferred marker (Seal Fate or Save Earth), taking any printed VP on ' +
  'it—regardless of which Path that VP belongs to. The Chronossus’s preferred marker is ' +
  'always the opposing one to yours. For example, if you are playing as the Path of ' +
  'Harmony, thus interacting with the Save Earth marker, it will move the Seal Fate ' +
  'marker on its turn as if it was the Path of Salvation.';
