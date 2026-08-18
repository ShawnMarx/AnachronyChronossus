// Chronossus game "modes" (Base + the expansion modules). Each mode lays its
// modular Action tiles onto the board's tile slots and/or COVERS a printed
// Action space with a tile. This is the single, extensible source of truth both
// the setup screen (which tiles to flip to B) and the play view (which tile art /
// effect sits where) read from — every new module is added here, so it runs under
// the same system rather than as one-off special-casing.
//
// See the mode → tile matrix transcribed from the setup reference table
// (Solo Opponents p.18). Every mode in the matrix is now implemented. Per that page,
// Doomsday combines with NOTHING (hence its single entry, with no combo ids), and
// Fractures+Guardians is not a legal pairing.

/** A modular-tile slot on the board (roman numerals I–III are the native tile
 *  spaces; IV/V mark tiles that COVER a printed Action space). */
export type SlotId = 'I' | 'II' | 'III' | 'IV' | 'V';

/** A printed Action space a mode's tile can cover (columns IV/V of the matrix). */
export type CoveredAction = 'time-travel' | 'recruit-genius-research';

export interface ModeSlot {
  slot: SlotId;
  /** Tile family, side-agnostic (e.g. 'C01'); the live code is family + side. */
  family: string;
  /**
   * The Command-track position key whose marker triggers this tile. For the three
   * native tile slots this is the printed dashed slot (m2p3 / m3s3 / m5s4). For a
   * covering tile (IV/V) it is undefined — the tile is resolved whenever a marker
   * lands on the printed Action space named by `covers`.
   */
  posKey?: string;
  /** Set on IV/V slots: the printed Action space this tile sits on top of. */
  covers?: CoveredAction;
}

export interface ChronossusMode {
  id: string;
  label: string;
  available: boolean;
  slots: ModeSlot[];
}

/** Base-game native tile positions (shared by every mode that doesn't move them). */
const SLOT_I_POS = 'm2p3';
const SLOT_II_POS = 'm3s3';
const SLOT_III_POS = 'm5s4';

export const CHRONOSSUS_MODES: Record<string, ChronossusMode> = {
  base: {
    id: 'base',
    label: 'Base',
    available: true,
    slots: [
      { slot: 'I', family: 'C01', posKey: SLOT_I_POS },
      { slot: 'II', family: 'C02', posKey: SLOT_II_POS },
      { slot: 'III', family: 'C03', posKey: SLOT_III_POS },
    ],
  },
  fractures: {
    id: 'fractures',
    label: 'Fractures of Time',
    available: true,
    slots: [
      // C04/C05/C06 fill the three native tile spaces (Solo Opponents p.11); the
      // C14-for-C04 difficulty swaps slot I's family (see `getMode`).
      { slot: 'I', family: 'C04', posKey: SLOT_I_POS },
      { slot: 'II', family: 'C05', posKey: SLOT_II_POS },
      { slot: 'III', family: 'C06', posKey: SLOT_III_POS },
    ],
  },
  'fractures+hypersync': {
    id: 'fractures+hypersync',
    label: 'Fractures of Time + Hypersync Future Actions',
    available: true,
    // Per the setup matrix: C12 takes slot I, Fractures' Assimilate/Extract fill II/III
    // (Power Pack drops out), and C13 covers Time Travel.
    slots: [
      { slot: 'I', family: 'C12', posKey: SLOT_I_POS },
      { slot: 'II', family: 'C04', posKey: SLOT_II_POS },
      { slot: 'III', family: 'C05', posKey: SLOT_III_POS },
      { slot: 'V', family: 'C13', covers: 'time-travel' },
    ],
  },
  guardians: {
    id: 'guardians',
    label: 'Guardians of the Council',
    available: true,
    slots: [
      // C02A moves to slot I and C11A (Acquire Guardian) takes slot II; C03A stays
      // (Solo Opponents p.16).
      { slot: 'I', family: 'C02', posKey: SLOT_I_POS },
      { slot: 'II', family: 'C11', posKey: SLOT_II_POS },
      { slot: 'III', family: 'C03', posKey: SLOT_III_POS },
    ],
  },
  'guardians+hypersync': {
    id: 'guardians+hypersync',
    label: 'Guardians of the Council + Hypersync Future Actions',
    available: true,
    // Per the setup matrix: C12 takes slot I, C11 keeps slot II, C03 stays, and C13
    // covers Time Travel.
    slots: [
      { slot: 'I', family: 'C12', posKey: SLOT_I_POS },
      { slot: 'II', family: 'C11', posKey: SLOT_II_POS },
      { slot: 'III', family: 'C03', posKey: SLOT_III_POS },
      { slot: 'V', family: 'C13', covers: 'time-travel' },
    ],
  },
  pioneers: {
    id: 'pioneers',
    label: 'Pioneers of New Earth',
    available: true,
    // Solo Opponents p.15: C03A/I, C09A/II, C02A/III, and C10A COVERS the printed
    // "Recruit Genius or Research" space. Pioneers is the first module to use slot IV —
    // every other mode leaves that printed Action showing.
    slots: [
      { slot: 'I', family: 'C03', posKey: SLOT_I_POS },
      { slot: 'II', family: 'C09', posKey: SLOT_II_POS },
      { slot: 'III', family: 'C02', posKey: SLOT_III_POS },
      { slot: 'IV', family: 'C10', covers: 'recruit-genius-research' },
    ],
  },
  doomsday: {
    id: 'doomsday',
    label: 'Doomsday',
    available: true,
    // Solo Opponents p.14: C07A to slot I, C08A to slot II, "Leave C03A in play" (slot III).
    // No covering tile — Doomsday is the only module with nothing on slot IV/V.
    slots: [
      { slot: 'I', family: 'C07', posKey: SLOT_I_POS },
      { slot: 'II', family: 'C08', posKey: SLOT_II_POS },
      { slot: 'III', family: 'C03', posKey: SLOT_III_POS },
    ],
  },
  'fractures+pioneers': {
    id: 'fractures+pioneers',
    label: 'Fractures of Time + Pioneers of New Earth',
    available: true,
    // Per the setup matrix: Fractures' Extract and C14 take I/II, C09 takes III, and
    // C10 covers Genius/Research (the "fourth Action tile" the rulebook calls out for
    // Pioneers combos, p.19).
    slots: [
      { slot: 'I', family: 'C05', posKey: SLOT_I_POS },
      { slot: 'II', family: 'C14', posKey: SLOT_II_POS },
      { slot: 'III', family: 'C09', posKey: SLOT_III_POS },
      { slot: 'IV', family: 'C10', covers: 'recruit-genius-research' },
    ],
  },
  'guardians+pioneers': {
    id: 'guardians+pioneers',
    label: 'Guardians of the Council + Pioneers of New Earth',
    available: true,
    // Per the setup matrix: C03/I, C09/II, C11 (Acquire Guardian)/III, C10 covers
    // Genius/Research.
    slots: [
      { slot: 'I', family: 'C03', posKey: SLOT_I_POS },
      { slot: 'II', family: 'C09', posKey: SLOT_II_POS },
      { slot: 'III', family: 'C11', posKey: SLOT_III_POS },
      { slot: 'IV', family: 'C10', covers: 'recruit-genius-research' },
    ],
  },
  hypersync: {
    id: 'hypersync',
    label: 'Hypersync Future Actions',
    available: true,
    slots: [
      // C12 replaces C01 in slot I; C02/C03 stay; C13 covers the Time Travel space.
      { slot: 'I', family: 'C12', posKey: SLOT_I_POS },
      { slot: 'II', family: 'C02', posKey: SLOT_II_POS },
      { slot: 'III', family: 'C03', posKey: SLOT_III_POS },
      { slot: 'V', family: 'C13', covers: 'time-travel' },
    ],
  },
};

/** The "Swap Action tiles between spaces" difficulty flag (shared with the setup screen). */
export const DIFFICULTY_SWAP_TILES = 'chronossus-swap-tiles';
/** Fractures: "Replace C04 with C14, a more difficult tile" (Solo Opponents p.13). */
export const DIFFICULTY_FRACTURES_C14 = 'chronossus-fractures-c14';

/**
 * `id`'s mode, optionally with Slot I and Slot III's `family` swapped (the
 * `DIFFICULTY_SWAP_TILES` option). Applies uniformly to every mode, since they
 * all share the I/II/III slot scheme — no per-mode special-casing needed.
 */
export function getMode(id: string | undefined, difficulty?: string[]): ChronossusMode {
  let mode = CHRONOSSUS_MODES[id ?? 'base'] ?? CHRONOSSUS_MODES.base;
  // Fractures' C14-for-C04 swap first, so a later I/III swap moves whichever tile
  // actually ends up in slot I.
  if (difficulty?.includes(DIFFICULTY_FRACTURES_C14) && mode.slots.some((s) => s.family === 'C04')) {
    mode = {
      ...mode,
      slots: mode.slots.map((s) => (s.family === 'C04' ? { ...s, family: 'C14' } : s)),
    };
  }
  if (!difficulty?.includes(DIFFICULTY_SWAP_TILES)) return mode;
  const slotI = mode.slots.find((s) => s.slot === 'I');
  const slotIII = mode.slots.find((s) => s.slot === 'III');
  if (!slotI || !slotIII) return mode;
  return {
    ...mode,
    slots: mode.slots.map((s) => {
      if (s.slot === 'I') return { ...s, family: slotIII.family };
      if (s.slot === 'III') return { ...s, family: slotI.family };
      return s;
    }),
  };
}

/** The live tile code for a family given the player's per-tile A/B selection. */
export function tileCodeFor(family: string, tileSides: Record<string, 'A' | 'B'> | undefined): string {
  return `${family}${tileSides?.[family] ?? 'A'}`;
}

/** The mode slot (if any) whose marker sits on a given track position key. */
export function slotAtPos(mode: ChronossusMode, posKey: string): ModeSlot | undefined {
  return mode.slots.find((s) => s.posKey === posKey);
}

/** The mode slot (if any) covering a given printed Action space. */
export function slotCovering(mode: ChronossusMode, action: CoveredAction): ModeSlot | undefined {
  return mode.slots.find((s) => s.covers === action);
}

/**
 * Whether `modeId`'s own setup rules already require covering the right World
 * Council space with a Hex Unavailable tile (Hypersync's 2-player setup note;
 * Guardians of the Council carries the same requirement, Solo Opponents p.16).
 * True for any mode id built from Hypersync or Guardians, including
 * combos (e.g. 'guardians+hypersync', 'fractures+hypersync'). When true, the
 * "Cover the right World Council space" difficulty option (D9) isn't a real choice
 * for that mode — it's mandatory setup, not an optional difficulty increase — so
 * the Setup flow hides the checkbox and states it as a fixed requirement instead.
 */
export function worldCouncilMandatory(modeId: string | undefined): boolean {
  return !!modeId && (modeId.includes('hypersync') || modeId.includes('guardians'));
}
