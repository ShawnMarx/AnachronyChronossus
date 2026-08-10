// Chronossus game "modes" (Base + the expansion modules). Each mode lays its
// modular Action tiles onto the board's tile slots and/or COVERS a printed
// Action space with a tile. This is the single, extensible source of truth both
// the setup screen (which tiles to flip to B) and the play view (which tile art /
// effect sits where) read from — every new module is added here, so it runs under
// the same system rather than as one-off special-casing.
//
// See the mode → tile matrix (memory: chronossus-mode-tile-matrix) transcribed
// from the setup reference table. Only Base and Hypersync are implemented so far.

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

/**
 * `id`'s mode, optionally with Slot I and Slot III's `family` swapped (the
 * `DIFFICULTY_SWAP_TILES` option). Applies uniformly to every mode, since they
 * all share the I/II/III slot scheme — no per-mode special-casing needed.
 */
export function getMode(id: string | undefined, difficulty?: string[]): ChronossusMode {
  const mode = CHRONOSSUS_MODES[id ?? 'base'] ?? CHRONOSSUS_MODES.base;
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
