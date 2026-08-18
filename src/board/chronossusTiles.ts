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
  /**
   * Verbatim rulebook effect text (the Appendix summary, pp. 20–21), with one deliberate
   * deviation: where the Appendix writes a B side as "Same as C0nA, but …", we restate the
   * A-side text in full and then append the B-side delta. The player is reading the tile
   * in front of them and shouldn't have to go find its other side to learn what it does.
   */
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

/** "NEW ACTION: ACQUIRE GUARDIAN" + the module's gameplay changes (Solo Opponents p.16). */
const ACQUIRE_GUARDIAN_DETAIL =
  'NEW ACTION: ACQUIRE GUARDIAN\n' +
  'IF THIS ACTION IS SELECTED BEFORE IMPACT:\n' +
  '• The Chronossus places an Exosuit on the World Council Action space and becomes the ' +
  'First Player (if possible), but it does not perform an Action. Instead, it recruits the ' +
  'leftmost available Guardian at no additional cost.\n' +
  '• If the World Council Action space is already taken, it spends a Worker (Most > ' +
  'Scientist > Engineer > Administrator > Genius), then acquires a Guardian without placing ' +
  'an Exosuit.\n' +
  'If it cannot do either option, or the Impact has already happened, it gains 1 VP, as if ' +
  'it was a Failed Action.\n' +
  '\n' +
  'GAMEPLAY CHANGES\n' +
  'When deciding which Exosuit to place, the Chronossus places Guardians last. If it wants ' +
  'to take a Capital Action (Research, Recruit, Construct) and there are no Action spaces ' +
  'remaining (including the World Council Action space), it places a Guardian (if it has ' +
  'any) on the reserved Guardian Action space and performs the Capital Action. This means ' +
  'the Action is not a Failed Action, so it does not take 1 VP.\n' +
  '\n' +
  '3 POWER UP PHASE\n' +
  'The Chronossus first powers up as many Guardians as it can, then it powers up its own ' +
  'Exosuits (e.g. if it needs to power up 4 Exosuits and has 2 Guardians, it will power up ' +
  'both of them and 2 of its own).';

/**
 * The Adventure Action's own rulebook section (Solo Opponents p.15), verbatim. Shared by
 * ALL FOUR Pioneers tiles — C09A/B and C10A/B are the same Action, so the 📖 box shows the
 * same generic Adventure rules whichever one is on screen. The tile's OWN bonus is not
 * repeated here: it already leads the box as that tile's Appendix line ("…It also gains 1
 * Energy Core"), which is obvious enough not to need a section of its own.
 *
 * The rulebook's SPECIAL CASES bullets (W → VP, Morale → VP, always-Research, ongoing →
 * 3 VP + Energy Core) are deliberately not here — they are shown per card, at the moment
 * they apply, as the result panel's conversion line.
 */
const ADVENTURE_DETAIL =
  'When taking an Adventure Action, it places an Exosuit on the Adventure hex pool space ' +
  'and one of its Path markers on the highest available strength bonus. Then, it performs ' +
  'two steps, in this order:\n' +
  '\n' +
  'STEP 1: PERFORM ADVENTURE\n' +
  'Sum up the power on the Chronossus\u2019s Exosuit Upgrade board (including the strength ' +
  'bonus from the Path marker): If 9 or higher, it draws 2 cards from 10+ deck; otherwise, ' +
  'it draws 2 cards from the 5+ deck. Then, it rolls the Adventure die and calculates total ' +
  'power the same way as you would.\n' +
  '\n' +
  'It takes the card with the highest power requirement it meets. The unselected card(s) ' +
  'are placed on the bottom of their respective deck(s). If it met neither card\u2019s ' +
  'requirement, it gains 1 VP (and returns both cards to the bottom).\n' +
  'If a card was selected, it receives the card\u2019s benefit then discards the card.\n' +
  '\n' +
  'STEP 2: POWER UPGRADE\n' +
  'It takes a Resource from the Chronossus\u2019s board and moves it to its Exosuit Upgrade ' +
  'board.\n' +
  '\u2022 It must be a Resource that has an available slot on the board.\n' +
  '\u2022 If there are multiple options, it will pick whichever Resource it has the most of.\n' +
  '\u2022 If tied, use this order: Titanium > Gold > Uranium > Neutronium.\n' +
  'If it does not have any Resources that can be placed, or there are no slots available, ' +
  'place 1 VP token straight from the supply on the Exosuit upgrade board instead. These VP ' +
  'tokens add further strength to the Chronossus\u2019s power, but they do not count as VP ' +
  'for the Chronossus by default.\n' +
  '\n' +
  'NOTE: It is possible for one of these steps to fail. If this happens, ignore that step.';

/**
 * "NEW ACTION: EXPERIMENT", its two steps and the NOTE (Solo Opponents p.14). Shared by
 * C07 and C08 — the tile only says WHICH level of Experiment the Chronossus executes.
 */
const EXPERIMENT_DETAIL =
  'When taking an Experiment Action, the Chronossus places an Exosuit on the Experiment ' +
  'hex pool space and performs two steps, in the following order:\n' +
  '\n' +
  'STEP 1: EXECUTE EXPERIMENT\n' +
  'The Chronossus takes an Experiment with a Path marker on it (see Step 2 for adding Path ' +
  'markers) and discards the Path marker. Whether it takes a Level 1 or Level 2 Experiment ' +
  'is shown on the Action tile. If none of that level is available, skip this step. If ' +
  'multiple are available, pick the leftmost available one on the Timeline.\n' +
  '\n' +
  'If it successfully took an Experiment and the Doomsday tracks aren\u2019t yet locked, it ' +
  'moves its preferred marker (Seal Fate or Save Earth), taking any printed VP on it\u2014' +
  'regardless of which Path that VP belongs to. The Chronossus\u2019s preferred marker is ' +
  'always the opposing one to yours. For example, if you are playing as the Path of Harmony, ' +
  'thus interacting with the Save Earth marker, it will move the Seal Fate marker on its turn ' +
  'as if it was the Path of Salvation.\n' +
  '\n' +
  'STEP 2: PREPARE FOR EXPERIMENTATION\n' +
  'It places a Path marker on a face-up Experiment card (except the one under the next Era), ' +
  'that does not yet have one on it. (Your Focus marker has no effect on this.) If there are ' +
  'multiple available ones, pick Level 1 before Level 2 ones; if still tied, pick the ' +
  'furthest in the past on the Timeline.\n' +
  '\n' +
  'NOTE: It is possible for one of the steps to fail (if none/all of the Experiments have a ' +
  'Path marker, respectively). If this happens, ignore that step.\n' +
  '\n' +
  'When you take an Experiment with one of the Chronossus\u2019s Path markers on it, move it ' +
  'onto a face-up Experiment under a later Era (up to the present Era) that does not yet have ' +
  'one. If all of them do, discard the Path marker.';

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
    rule: 'Roll a Research Shape die.\n» On Circle: The Chronossus recruits an Operator and gains 1 Flux Core.\n» On Triangle: It takes a Technology card (preferring the secondary stack).\n» On Square: It either recruits an Operator (and gains 1 Flux Core) or takes a Technology card, whichever it has fewer of (Operator if tied).\nThe Chronossus also gains 1 VP.',
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
    rule: 'The Chronossus gets both options: it gains 2 Flux Cores into the Flux Pool and 2 Energy Cores into the Energy Pool. It gains 2 extra Flux Cores (4 in total).',
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
    detail: EXPERIMENT_DETAIL,
  },
  C07B: {
    code: 'C07B',
    name: 'Level 1 Experiment',
    rule: 'The Chronossus executes a Level 1 Experiment and prepares for Experimentation. Then gains 1 Energy Core.',
    detail: EXPERIMENT_DETAIL,
  },
  C08A: {
    code: 'C08A',
    name: 'Level 2 Experiment',
    rule: 'The Chronossus executes a Level 2 Experiment then prepares for Experimentation. (See page 14 for details).',
    detail: EXPERIMENT_DETAIL,
  },
  C08B: {
    code: 'C08B',
    name: 'Level 2 Experiment',
    rule: 'The Chronossus executes a Level 2 Experiment and prepares for Experimentation. Then, gains 1 VP and 1 Energy Core.',
    detail: EXPERIMENT_DETAIL,
  },
  C09A: {
    code: 'C09A',
    name: 'Adventure',
    rule: 'The Chronossus performs an Adventure, then fulfills a Power Upgrade.',
    detail: ADVENTURE_DETAIL,
  },
  C09B: {
    code: 'C09B',
    name: 'Adventure and Score',
    rule: 'The Chronossus performs an Adventure, then fulfills a Power Upgrade. It also gains 1 VP.',
    detail: ADVENTURE_DETAIL,
  },
  C10A: {
    code: 'C10A',
    name: 'Adventure',
    rule: 'The Chronossus performs an Adventure, then fulfills a Power Upgrade.',
    detail: ADVENTURE_DETAIL,
  },
  C10B: {
    code: 'C10B',
    name: 'Adventure and Energy Pack',
    rule: 'The Chronossus performs an Adventure, then fulfills a Power Upgrade. It also gains 1 Energy Core.',
    detail: ADVENTURE_DETAIL,
  },
  C11A: {
    code: 'C11A',
    name: 'Acquire Guardian (Autoleap)',
    rule: 'The Chronossus places an Exosuit on the World Council space, taking the First Player (if able), but it does not perform an Action. Instead, it recruits the leftmost available Guardian at no additional cost. If the World Council space is already taken, it spends a Worker (Most > Scientist > Engineer > Administrator > Genius), and acquires a Guardian the same way. (See page 16 for details). Then, move the Command token to the next position.',
    detail: ACQUIRE_GUARDIAN_DETAIL,
  },
  C11B: {
    code: 'C11B',
    name: 'Acquire Guardian and Score (Autoleap)',
    rule: 'The Chronossus places an Exosuit on the World Council space, taking the First Player (if able), but it does not perform an Action. Instead, it recruits the leftmost available Guardian at no additional cost. If the World Council space is already taken, it spends a Worker (Most > Scientist > Engineer > Administrator > Genius), and acquires a Guardian the same way. (See page 16 for details). It also gains 2 VPs. Then, move the Command token to the next position.',
    detail: ACQUIRE_GUARDIAN_DETAIL,
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
    rule: 'Roll a Research Shape die.\n» On Circle: The Chronossus recruits an Operator and gains 1 Flux Core.\n» On Triangle: It takes a Technology card (preferring the secondary stack).\n» On Square: It either recruits an Operator (and gains 1 Flux Core) or takes a Technology card, whichever it has fewer of (Operator if tied).\nIt gains 1 additional Flux Core.',
    detail: ASSIMILATE_DETAIL + VALLEY_PLACEMENT_DETAIL,
    future: true,
  },
  C14B: {
    code: 'C14B',
    name: 'Assimilate, Score and Flux Pack',
    rule: 'Roll a Research Shape die.\n» On Circle: The Chronossus recruits an Operator and gains 1 Flux Core.\n» On Triangle: It takes a Technology card (preferring the secondary stack).\n» On Square: It either recruits an Operator (and gains 1 Flux Core) or takes a Technology card, whichever it has fewer of (Operator if tied).\nThe Chronossus also gains 1 VP and 1 additional Flux Core.',
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
  // Doomsday. The two tiles are separate Actions (different Experiment levels), so unlike
  // Pioneers' C09/C10 they never share an action id.
  'tile-experiment-1': 'C07A',
  'tile-experiment-2': 'C08A',
  // Guardians of the Council
  'tile-acquire-guardian': 'C11A',
  // Pioneers of New Earth. C09 sits in a tile slot and C10 covers the printed
  // "Recruit Genius or Research" space; both are the same Adventure Action, so they
  // share an action id and the live family is chosen per placement.
  'tile-adventure': 'C09A',
} as const;

/** The side-agnostic tile family for each in-play modular tile action. */
export const TILE_ACTION_FAMILY = {
  'tile-reboot': 'C01',
  'tile-score': 'C02',
  'tile-energy-pack': 'C03',
  'tile-assimilate': 'C04',
  'tile-extract': 'C05',
  'tile-power-pack': 'C06',
  // Doomsday
  'tile-experiment-1': 'C07',
  'tile-experiment-2': 'C08',
  'tile-acquire-guardian': 'C11',
  'tile-adventure': 'C09',
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
  /** Guardians: the Acquire Guardian Action (its own World Council / Worker branch). */
  acquireGuardian?: boolean;
  /** Pioneers: the Adventure Action (its own two-step flow, needs a die + 2 drawn cards). */
  adventure?: boolean;
  /**
   * Doomsday: the Experiment Action. The value is WHICH level of Experiment the tile
   * executes (C07 = 1, C08 = 2) — the only thing that differs between the two tiles, so
   * it is carried here rather than as a second boolean.
   */
  experiment?: 1 | 2;
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
  // Guardians of the Council. Both sides Autoleap (the printed "then move the Command
  // token to the next position"); the B side also scores 2 VP. The acquisition itself
  // runs through `resolveAcquireGuardian`, not a flat effect.
  C11A: { acquireGuardian: true, autoleap: true },
  C11B: { acquireGuardian: true, autoleap: true, vp: 2 },
  // Doomsday (C07 / C08 fill slots I and II; C03A stays in III). The two steps run through
  // `resolveDoomsdayAction`, not a flat effect — the `vp`/`energyCores` here are only the
  // B sides' printed bonus on top of it.
  C07A: { experiment: 1 },
  C07B: { experiment: 1, energyCores: 1 },
  C08A: { experiment: 2 },
  C08B: { experiment: 2, vp: 1, energyCores: 1 },
  // Pioneers of New Earth. C10A is "same as C09A"; the B sides add a flat bonus on top
  // of the Adventure itself, which runs through `resolveAdventure`, not a flat effect.
  C09A: { adventure: true },
  C09B: { adventure: true, vp: 1 },
  C10A: { adventure: true },
  C10B: { adventure: true, energyCores: 1 },
};

/** Effect lookup for a tile code, defaulting to "no effect". */
export function tileEffect(code: string): TileEffect {
  return TILE_EFFECTS[code] ?? {};
}
