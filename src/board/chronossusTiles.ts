// Catalog of the Chronossus modular Action tiles (Cnn), both A and B sides.
//
// Names + effect text are VERBATIM from the "Chronobot & Chronossus Solo
// Opponents" rulebook Appendix (pp. 20–21). The base-game default setup uses the
// A sides of C01/C02/C03 (Reboot / Score / Energy Pack); every other tile is
// captured here for later — B sides and the expansion tiles (C04–C14) are NOT
// yet implemented, but their names/text are recorded so the dialogs and future
// features have a single source of truth.

/** One modular Action tile (a single side). */
export interface ModularTile {
  /** Tile code as printed on the tile (e.g. 'C01A'). */
  code: string;
  /** The tile's printed name (e.g. 'Reboot'). */
  name: string;
  /** Verbatim rulebook effect text. */
  rule: string;
  /** True for expansion / not-yet-implemented tiles (everything beyond C01–C03A). */
  future?: boolean;
}

/** Every modular Action tile, keyed by its printed code. */
export const CHRONOSSUS_TILES: Record<string, ModularTile> = {
  // --- Base-game default setup (A sides of C01/C02/C03) --------------------
  C01A: { code: 'C01A', name: 'Reboot', rule: 'The Chronossus does nothing.' },
  C02A: { code: 'C02A', name: 'Score', rule: 'The Chronossus gains 2 VPs.' },
  C03A: { code: 'C03A', name: 'Energy Pack', rule: 'The Chronossus gains 1 Energy Core.' },

  // --- B sides of the base tiles (not yet implemented) --------------------
  C01B: {
    code: 'C01B',
    name: 'Score (Autoleap)',
    rule: 'The Chronossus gains 1 VP, then move the Command token to the next position.',
    future: true,
  },
  C02B: {
    code: 'C02B',
    name: 'Score and Energy Pack',
    rule: 'The Chronossus gains 2 VPs and 1 Energy Core.',
    future: true,
  },
  C03B: {
    code: 'C03B',
    name: 'Energy Pack (Autoleap)',
    rule: 'The Chronossus gains 1 Energy Core, then move the Command token to the next position.',
    future: true,
  },

  // --- Expansion tiles C04–C14 (not yet implemented) ----------------------
  C04A: {
    code: 'C04A',
    name: 'Assimilate',
    rule: 'Roll a Research Shape die.\n» On Circle: The Chronossus recruits an Operator and gains 1 Flux Core.\n» On Triangle: It takes a Technology card (preferring the secondary stack).\n» On Square: It either recruits an Operator (and gains 1 Flux Core) or takes a Technology card, whichever it has fewer of (Operator if tied).',
    future: true,
  },
  C04B: {
    code: 'C04B',
    name: 'Assimilate and Score',
    rule: 'Same as C04A but the Chronossus also gains 1 VP.',
    future: true,
  },
  C05A: {
    code: 'C05A',
    name: 'Extract',
    rule: 'The Chronossus gets both options: it gains 2 Flux Cores into the Flux Pool and 2 Energy Cores into the Energy Pool.',
    future: true,
  },
  C05B: {
    code: 'C05B',
    name: 'Efficient Extract',
    rule: 'Same as C05A, but the Chronossus gains 2 extra Flux Cores.',
    future: true,
  },
  C06A: {
    code: 'C06A',
    name: 'Power Pack',
    rule: 'The Chronossus gains 1 Energy Core and 1 Flux Core.',
    future: true,
  },
  C06B: {
    code: 'C06B',
    name: 'Power Pack (Autoleap)',
    rule: 'The Chronossus gains 1 Energy Core and 1 Flux Core, then move the Command token to the next position.',
    future: true,
  },
  C07A: {
    code: 'C07A',
    name: 'Level 1 Experiment',
    rule: 'The Chronossus executes a Level 1 Experiment then prepares for Experimentation. (See page 14 for details).',
    future: true,
  },
  C07B: {
    code: 'C07B',
    name: 'Level 1 Experiment',
    rule: 'The Chronossus executes a Level 1 Experiment and prepares for Experimentation. Then gains 1 Energy Core.',
    future: true,
  },
  C08A: {
    code: 'C08A',
    name: 'Level 2 Experiment',
    rule: 'The Chronossus executes a Level 2 Experiment then prepares for Experimentation. (See page 14 for details).',
    future: true,
  },
  C08B: {
    code: 'C08B',
    name: 'Level 2 Experiment',
    rule: 'The Chronossus executes a Level 2 Experiment and prepares for Experimentation. Then, gains 1 VP and 1 Energy Core.',
    future: true,
  },
  C09A: {
    code: 'C09A',
    name: 'Adventure',
    rule: 'The Chronossus performs an Adventure, then fulfills a Power Upgrade.',
    future: true,
  },
  C09B: {
    code: 'C09B',
    name: 'Adventure and Score',
    rule: 'Same as C09A, but the Chronossus also gains 1 VP.',
    future: true,
  },
  C10A: {
    code: 'C10A',
    name: 'Adventure',
    rule: 'Same as C09A.',
    future: true,
  },
  C10B: {
    code: 'C10B',
    name: 'Adventure and Energy Pack',
    rule: 'Same as C09A and C10A, but the Chronossus also gains 1 Energy Core.',
    future: true,
  },
  C11A: {
    code: 'C11A',
    name: 'Acquire Guardian (Autoleap)',
    rule: 'The Chronossus places an Exosuit on the World Council space, taking the First Player (if able), but it does not perform an Action. Instead, it recruits the leftmost available Guardian at no additional cost. If the World Council space is already taken, it spends a Worker (Most > Scientist > Engineer > Administrator > Genius), and acquires a Guardian the same way. (See page 16 for details). Then, move the Command token to the next position.',
    future: true,
  },
  C11B: {
    code: 'C11B',
    name: 'Acquire Guardian and Score (Autoleap)',
    rule: 'Same as C11A, but the Chronossus also gains 2 VPs. Then (same as C11A) move the Command token to the next position.',
    future: true,
  },
  C12A: {
    code: 'C12A',
    name: 'Hypersync or Time Travel',
    rule: 'The Chronossus sends an Exosuit to a random available Hypersync hex space, receives 2 VPs, and then retrieves the earliest pending Hypersync tile on the Timeline (if able). It ignores the effects of Supercharge tiles. If this is not possible, it performs a normal Time Travel Action. (See page 17 for details). Finally, it gains 1 Energy Core.',
    future: true,
  },
  C12B: {
    code: 'C12B',
    name: 'Hypersync (Autoleap)',
    rule: 'Same as C12A, then move the Command token to the next position.',
    future: true,
  },
  C13A: {
    code: 'C13A',
    name: 'Hypersync',
    rule: 'Same as C12A, but it does not gain 1 Energy Core.',
    future: true,
  },
  C13B: {
    code: 'C13B',
    name: 'Hypersync',
    rule: 'Same as C12A, but it gains 1 VP instead of 1 Energy Core.',
    future: true,
  },
  C14A: {
    code: 'C14A',
    name: 'Assimilate and Flux Pack',
    rule: 'Same as C04A, but it gains 1 additional Flux Core.',
    future: true,
  },
  C14B: {
    code: 'C14B',
    name: 'Assimilate, Score and Flux Pack',
    rule: 'Same as C04B, but it gains 1 additional Flux Core.',
    future: true,
  },
};

/** The tile code each in-play modular tile action maps to (base A-side setup). */
export const TILE_ACTION_CODE = {
  'tile-reboot': 'C01A',
  'tile-score': 'C02A',
  'tile-energy-pack': 'C03A',
} as const;
