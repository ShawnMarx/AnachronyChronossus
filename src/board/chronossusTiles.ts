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
  /** Verbatim rulebook effect text (the Appendix summary, pp. 20–21). */
  rule: string;
  /**
   * The longer, verbatim write-up from the tile's own module section (the rulebook
   * prints most new Actions twice: a short Appendix entry and a fuller section).
   * Shown under the Appendix text in the tile dialog's 📖 rules box. Only tiles the
   * rulebook actually elaborates on have one.
   */
  detail?: string;
  /** True for expansion / not-yet-implemented tiles (everything beyond C01–C03A). */
  future?: boolean;
}

// --- Verbatim module-section text (Solo Opponents pp. 11–13, Fractures of Time) ------
// The Appendix (pp. 20–21) summarizes each tile in a sentence; the module section spells
// the same Action out in full. Both are shown — summary first, then this.

/** "NEW ACTION: ASSIMILATE" + "RECRUITING OPERATORS" (Solo Opponents p. 13). */
const ASSIMILATE_DETAIL =
  'NEW ACTION: ASSIMILATE\n' +
  'Before the Chronossus performs the Assimilate Action, roll the Research shape die.\n' +
  'On Circle: It recruits an Operator and gains 1 Flux Core.\n' +
  'On Triangle: It takes a Technology card (preferring the secondary stack).\n' +
  'On Square: It either recruits an Operator (and gains 1 Flux Core) or takes a Technology card, whichever it has fewer of (Operator, if tied).\n' +
  'If it attempts to recruit an Operator, and there are none left, it is a Failed Action and takes 1 VP.\n' +
  '\n' +
  'RECRUITING OPERATORS\n' +
  'Operators function as wildcards. When taken, place the Operator in the topmost empty space of the Chronossus’s Worker collection. It counts towards that Worker type for all purposes, including discarding for 5 VPs.';

/** "NEW ACTION: EXTRACT" (Solo Opponents p. 13). */
const EXTRACT_DETAIL =
  'NEW ACTION: EXTRACT\n' +
  'When the Chronossus takes the Extract Action, it performs both available effects, gaining 2 Flux Cores (into the Flux Pool) and 2 Energy Cores (into the Energy Pool).';

/**
 * Valley placement (Solo Opponents p. 11, "GAMEPLAY CHANGES") — shared by both Valley
 * Actions, which are the only tiles that place an Exosuit.
 */
const VALLEY_PLACEMENT_DETAIL =
  '\n\nGAMEPLAY CHANGES\n' +
  'Just like with the World Capital Action spaces, if there are no available spaces on a Valley Action, the Chronossus places on the Valley Capital Action space instead.\n' +
  'When the Chronossus places an Exosuit on the Main board, take an Energy Core directly from supply and place it in the Exosuit.';

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
    detail: ASSIMILATE_DETAIL + VALLEY_PLACEMENT_DETAIL,
    future: true,
  },
  C04B: {
    code: 'C04B',
    name: 'Assimilate and Score',
    rule: 'Same as C04A but the Chronossus also gains 1 VP.',
    detail: ASSIMILATE_DETAIL + VALLEY_PLACEMENT_DETAIL,
    future: true,
  },
  C05A: {
    code: 'C05A',
    name: 'Extract',
    rule: 'The Chronossus gets both options: it gains 2 Flux Cores into the Flux Pool and 2 Energy Cores into the Energy Pool.',
    detail: EXTRACT_DETAIL + VALLEY_PLACEMENT_DETAIL,
    future: true,
  },
  C05B: {
    code: 'C05B',
    name: 'Efficient Extract',
    rule: 'Same as C05A, but the Chronossus gains 2 extra Flux Cores.',
    detail: EXTRACT_DETAIL + VALLEY_PLACEMENT_DETAIL,
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
    rule: 'The Chronossus sends an Exosuit to a random available Hypersync hex space, receives 2 VPs, and then retrieves the earliest pending Hypersync tile on the Timeline (if able). It ignores the effects of Supercharge tiles. If this is not possible, it performs a normal Time Travel Action. Finally, it gains 1 Energy Core.',
    future: true,
  },
  C12B: {
    code: 'C12B',
    name: 'Hypersync (Autoleap)',
    rule: 'The Chronossus sends an Exosuit to a random available Hypersync hex space, receives 2 VPs, and then retrieves the earliest pending Hypersync tile on the Timeline (if able). It ignores the effects of Supercharge tiles. If this is not possible, it performs a normal Time Travel Action. Finally, it gains 1 Energy Core, then move the Command token to the next position.',
    future: true,
  },
  C13A: {
    code: 'C13A',
    name: 'Hypersync',
    rule: 'The Chronossus sends an Exosuit to a random available Hypersync hex space, receives 2 VPs, and then retrieves the earliest pending Hypersync tile on the Timeline (if able). It ignores the effects of Supercharge tiles. If this is not possible, it performs a normal Time Travel Action.',
    future: true,
  },
  C13B: {
    code: 'C13B',
    name: 'Hypersync',
    rule: 'The Chronossus sends an Exosuit to a random available Hypersync hex space, receives 2 VPs, and then retrieves the earliest pending Hypersync tile on the Timeline (if able). It ignores the effects of Supercharge tiles. If this is not possible, it performs a normal Time Travel Action. Finally, it gains 1 VP.',
    future: true,
  },
  C14A: {
    code: 'C14A',
    name: 'Assimilate and Flux Pack',
    rule: 'Same as C04A, but it gains 1 additional Flux Core.',
    detail: ASSIMILATE_DETAIL + VALLEY_PLACEMENT_DETAIL,
    future: true,
  },
  C14B: {
    code: 'C14B',
    name: 'Assimilate, Score and Flux Pack',
    rule: 'Same as C04B, but it gains 1 additional Flux Core.',
    detail: ASSIMILATE_DETAIL + VALLEY_PLACEMENT_DETAIL,
    future: true,
  },
};

/** The tile code each in-play modular tile action maps to (base A-side setup). */
export const TILE_ACTION_CODE = {
  'tile-reboot': 'C01A',
  'tile-score': 'C02A',
  'tile-energy-pack': 'C03A',
  // Fractures of Time (C14 is the harder Assimilate that replaces C04 with that
  // module's difficulty option, so it shares the Assimilate action id).
  'tile-assimilate': 'C04A',
  'tile-extract': 'C05A',
  'tile-power-pack': 'C06A',
} as const;

/** The side-agnostic tile family for each in-play modular tile action. */
export const TILE_ACTION_FAMILY = {
  'tile-reboot': 'C01',
  'tile-score': 'C02',
  'tile-energy-pack': 'C03',
  'tile-assimilate': 'C04',
  'tile-extract': 'C05',
  'tile-power-pack': 'C06',
} as const;

/** The live tile code (family + selected side) for an in-play tile action. */
export function liveTileCode(
  id: keyof typeof TILE_ACTION_FAMILY,
  tileSides: Record<string, 'A' | 'B'> | undefined,
): string {
  const family = TILE_ACTION_FAMILY[id];
  return `${family}${tileSides?.[family] ?? 'A'}`;
}

/**
 * Machine-readable effect for each implemented tile side. This is the single
 * source of truth the engine applies (the verbatim `rule` text in
 * `CHRONOSSUS_TILES` is what we SHOW the player). Every mode we add drops its
 * tiles in here; anything not listed is treated as "no effect" (a Reboot).
 *
 *  • `vp` / `energyCores` — flat gains the Chronossus applies.
 *  • `autoleap` — after the tile resolves, advance the Command marker an extra
 *    step (the printed "then move the Command token to the next position").
 *  • `hypersync` — the tile performs the C12/C13 Hypersync-or-Time-Travel flow;
 *    its `vp` / `energyCores` are the *post-action* bonus (applied by that flow),
 *    not a flat gain. See the Hypersync mode.
 */
export interface TileEffect {
  vp?: number;
  energyCores?: number;
  autoleap?: boolean;
  hypersync?: boolean;
  /** Fractures: Flux Cores added to the Flux Pool. */
  fluxCores?: number;
  /** Fractures: the Assimilate Action (needs a Research shape-die roll first). */
  assimilate?: boolean;
}

export const TILE_EFFECTS: Record<string, TileEffect> = {
  C01A: {},
  C01B: { vp: 1, autoleap: true },
  C02A: { vp: 2 },
  C02B: { vp: 2, energyCores: 1 },
  C03A: { energyCores: 1 },
  C03B: { energyCores: 1, autoleap: true },
  // Hypersync mode (C12 covers slot I / C13 covers the Time Travel space). The
  // `vp`/`energyCores` here are the bonus the Hypersync flow grants after it
  // resolves (C12: +1 Energy Core; C13A: nothing; C13B: +1 VP).
  // Fractures of Time (C04-C06 fill the three tile slots; C14 replaces C04 with the
  // module's difficulty option). Assimilate resolves through its own shape-die branch.
  C04A: { assimilate: true },
  C04B: { assimilate: true, vp: 1 },
  C05A: { fluxCores: 2, energyCores: 2 },
  C05B: { fluxCores: 4, energyCores: 2 },
  C06A: { energyCores: 1, fluxCores: 1 },
  C06B: { energyCores: 1, fluxCores: 1, autoleap: true },
  C14A: { assimilate: true, fluxCores: 1 },
  C14B: { assimilate: true, vp: 1, fluxCores: 1 },
  C12A: { hypersync: true, energyCores: 1 },
  C12B: { hypersync: true, energyCores: 1, autoleap: true },
  C13A: { hypersync: true },
  C13B: { hypersync: true, vp: 1 },
};

/** Effect lookup for a tile code, defaulting to "no effect". */
export function tileEffect(code: string): TileEffect {
  return TILE_EFFECTS[code] ?? {};
}
