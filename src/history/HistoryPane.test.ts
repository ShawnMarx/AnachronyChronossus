import { describe, it, expect } from 'vitest';
import type { HistoryEntry } from '../game/undo';
import { isSupersededPhaseEntry } from './HistoryPane';

const entry = (label: string, effects: string[] = []): HistoryEntry =>
  ({ label, effects, die: null }) as HistoryEntry;

describe('the bare phase-entry filter', () => {
  it('drops "→ Warp" when the Warp result follows it', () => {
    const arrow = entry('Era 1 · → Warp');
    const result = entry('Era 1 · Warp: placed 1', ['Placed 1 Warp tile on the Timeline']);
    expect(isSupersededPhaseEntry(arrow, result)).toBe(true);
  });

  it('drops "→ Power Up" when the Power Up result follows it', () => {
    const arrow = entry('Era 3 · → Power Up');
    const result = entry('Era 3 · Power Up: 4 Exosuits', ['Drew 2 Energy + 1 Exhausted']);
    expect(isSupersededPhaseEntry(arrow, result)).toBe(true);
  });

  it('keeps a phase whose entry is its only trace', () => {
    // Nothing happened in the Paradox phase — the arrow row is all there is.
    const arrow = entry('Era 2 · → Paradox');
    expect(isSupersededPhaseEntry(arrow, entry('Era 2 · → Power Up'))).toBe(false);
    expect(isSupersededPhaseEntry(arrow, undefined)).toBe(false);
  });

  it('does not match across Eras or across phases', () => {
    expect(
      isSupersededPhaseEntry(entry('Era 1 · → Warp'), entry('Era 2 · Warp: placed 1', ['x'])),
    ).toBe(false);
    expect(
      isSupersededPhaseEntry(entry('Era 1 · → Power Up'), entry('Era 1 · Warp: placed 1', ['x'])),
    ).toBe(false);
  });

  it('never drops an entry that carries its own detail or a die', () => {
    expect(
      isSupersededPhaseEntry(entry('Era 1 · → Clean Up', ['First Player next: you']), entry('Era 1 · Clean Up: x')),
    ).toBe(false);
    const withDie = { ...entry('Era 1 · → Warp'), die: 3 } as HistoryEntry;
    expect(isSupersededPhaseEntry(withDie, entry('Era 1 · Warp: placed 1', ['x']))).toBe(false);
  });
});
