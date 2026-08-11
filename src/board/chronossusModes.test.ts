import { describe, it, expect } from 'vitest';
import {
  getMode,
  tileCodeFor,
  slotAtPos,
  slotCovering,
  worldCouncilMandatory,
  DIFFICULTY_SWAP_TILES,
  DIFFICULTY_FRACTURES_C14,
  CHRONOSSUS_MODES,
} from './chronossusModes';

describe('getMode — base lookup', () => {
  it('returns the base mode by default (undefined or unknown id)', () => {
    expect(getMode(undefined)).toBe(CHRONOSSUS_MODES.base);
    expect(getMode('nope')).toBe(CHRONOSSUS_MODES.base);
  });

  it('returns hypersync unmodified when the swap flag is absent', () => {
    const mode = getMode('hypersync');
    expect(mode.slots.find((s) => s.slot === 'I')?.family).toBe('C12');
    expect(mode.slots.find((s) => s.slot === 'III')?.family).toBe('C03');
  });
});

describe('getMode — D2 "swap Action tiles between spaces"', () => {
  it('swaps Slot I and Slot III families on the base mode', () => {
    const swapped = getMode('base', [DIFFICULTY_SWAP_TILES]);
    expect(swapped.slots.find((s) => s.slot === 'I')?.family).toBe('C03');
    expect(swapped.slots.find((s) => s.slot === 'II')?.family).toBe('C02'); // untouched
    expect(swapped.slots.find((s) => s.slot === 'III')?.family).toBe('C01');
  });

  it('swaps Slot I and Slot III families on every mode uniformly (hypersync)', () => {
    const swapped = getMode('hypersync', [DIFFICULTY_SWAP_TILES]);
    expect(swapped.slots.find((s) => s.slot === 'I')?.family).toBe('C03');
    expect(swapped.slots.find((s) => s.slot === 'III')?.family).toBe('C12');
    // Slot V (covers Time Travel) is untouched by the I/III swap.
    expect(swapped.slots.find((s) => s.slot === 'V')?.family).toBe('C13');
  });

  it('does not mutate the shared CHRONOSSUS_MODES registry', () => {
    getMode('base', [DIFFICULTY_SWAP_TILES]);
    expect(CHRONOSSUS_MODES.base.slots.find((s) => s.slot === 'I')?.family).toBe('C01');
  });

  it('preserves posKey/covers while swapping only family', () => {
    const swapped = getMode('base', [DIFFICULTY_SWAP_TILES]);
    const slotI = swapped.slots.find((s) => s.slot === 'I');
    expect(slotI?.posKey).toBe('m2p3'); // unchanged — only the family moved
  });

  it('downstream slotAtPos/slotCovering resolve through the swapped mode', () => {
    const swapped = getMode('base', [DIFFICULTY_SWAP_TILES]);
    expect(slotAtPos(swapped, 'm2p3')?.family).toBe('C03');
    expect(slotAtPos(swapped, 'm5s4')?.family).toBe('C01');
  });

  it('a hypersync-covering slot is still found via slotCovering after a swap', () => {
    const swapped = getMode('hypersync', [DIFFICULTY_SWAP_TILES]);
    expect(slotCovering(swapped, 'time-travel')?.family).toBe('C13');
  });
});

describe('tileCodeFor — D1 "Flip Action tiles to their B side" (config plumbing)', () => {
  it('defaults to the A side when no tileSides entry exists', () => {
    expect(tileCodeFor('C01', undefined)).toBe('C01A');
    expect(tileCodeFor('C01', {})).toBe('C01A');
  });

  it('reads the B side from tileSides when flipped', () => {
    expect(tileCodeFor('C01', { C01: 'B' })).toBe('C01B');
    expect(tileCodeFor('C02', { C01: 'B' })).toBe('C02A'); // untouched family stays A
  });

  it('still resolves the flipped family correctly after a D2 slot swap', () => {
    // D1 + D2 together: tileSides is keyed by family, not slot, so a swap doesn't
    // disturb which family's B-side flip applies.
    const swapped = getMode('base', [DIFFICULTY_SWAP_TILES]);
    const slotI = swapped.slots.find((s) => s.slot === 'I')!; // now family C03
    expect(tileCodeFor(slotI.family, { C03: 'B' })).toBe('C03B');
  });
});

describe('worldCouncilMandatory — D9 is not a real choice for some modes', () => {
  it('is false for base (D9 is a genuine optional difficulty there)', () => {
    expect(worldCouncilMandatory('base')).toBe(false);
    expect(worldCouncilMandatory(undefined)).toBe(false);
  });

  it('is true for Hypersync and Guardians, and any combo built from them', () => {
    expect(worldCouncilMandatory('hypersync')).toBe(true);
    expect(worldCouncilMandatory('guardians')).toBe(true);
    expect(worldCouncilMandatory('guardians+hypersync')).toBe(true);
    expect(worldCouncilMandatory('guardians+pioneers')).toBe(true);
    expect(worldCouncilMandatory('fractures+hypersync')).toBe(true);
  });

  it('is false for other modes/combos that don\'t include either', () => {
    expect(worldCouncilMandatory('fractures')).toBe(false);
    expect(worldCouncilMandatory('pioneers')).toBe(false);
    expect(worldCouncilMandatory('fractures+pioneers')).toBe(false);
  });
});

describe('Fractures of Time mode', () => {
  it('lays C04/C05/C06 into the three native tile slots', () => {
    const mode = getMode('fractures');
    expect(mode.available).toBe(true);
    expect(mode.slots.map((s) => [s.slot, s.family])).toEqual([
      ['I', 'C04'],
      ['II', 'C05'],
      ['III', 'C06'],
    ]);
  });

  it('replaces C04 with C14 under that difficulty option', () => {
    const mode = getMode('fractures', [DIFFICULTY_FRACTURES_C14]);
    expect(mode.slots.find((s) => s.slot === 'I')?.family).toBe('C14');
    expect(mode.slots.find((s) => s.slot === 'II')?.family).toBe('C05');
  });

  it('applies the C14 swap before the I/III tile swap, so slot III gets C14', () => {
    const mode = getMode('fractures', [DIFFICULTY_FRACTURES_C14, DIFFICULTY_SWAP_TILES]);
    expect(mode.slots.find((s) => s.slot === 'I')?.family).toBe('C06');
    expect(mode.slots.find((s) => s.slot === 'III')?.family).toBe('C14');
  });

  it('leaves other modes untouched by the C14 option', () => {
    expect(getMode('base', [DIFFICULTY_FRACTURES_C14]).slots.map((s) => s.family)).toEqual([
      'C01',
      'C02',
      'C03',
    ]);
  });
});
