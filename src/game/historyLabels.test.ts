import { describe, it, expect } from 'vitest';
import type { HistoryEntry } from './undo';
import { HISTORY_LABEL, isBotTurnEntry, isSupersededPhaseEntry } from './historyLabels';
import type { Msg } from '../engine/message';

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

// --- Descriptor labels -------------------------------------------------------
// The same two rules, decided on the KEY rather than on English prose. A legacy save
// keeps the prose paths above; everything written from now on takes these.

const keyed = (label: Msg, effects: string[] = []): HistoryEntry =>
  ({ label, effects, die: null }) as unknown as HistoryEntry;

const entered = (era: number, phase: string) =>
  keyed({ key: HISTORY_LABEL.enteredPhase, params: { era, phase } });
const result = (era: number, phase: string) =>
  keyed({ key: HISTORY_LABEL.phaseResult, params: { era, phase } });

describe('isSupersededPhaseEntry — descriptors', () => {
  it('drops the arrow row when the next entry reports that same phase', () => {
    expect(isSupersededPhaseEntry(entered(2, 'warp'), result(2, 'warp'))).toBe(true);
  });

  it('keeps it when the next entry is a different phase', () => {
    expect(isSupersededPhaseEntry(entered(2, 'warp'), result(2, 'paradox'))).toBe(false);
  });

  it('keeps it when the next entry is the same phase in a later Era', () => {
    expect(isSupersededPhaseEntry(entered(2, 'warp'), result(3, 'warp'))).toBe(false);
  });

  it('keeps a phase where nothing happened — the arrow row is its only trace', () => {
    expect(isSupersededPhaseEntry(entered(2, 'warp'), entered(2, 'actions'))).toBe(false);
  });

  it('never drops a row that carries effects or a die', () => {
    const withEffects = keyed({ key: HISTORY_LABEL.enteredPhase, params: { era: 2, phase: 'warp' } }, [
      'Warp tile placed',
    ]);
    expect(isSupersededPhaseEntry(withEffects, result(2, 'warp'))).toBe(false);
  });
});

describe('isBotTurnEntry', () => {
  it('counts a bot Action turn', () => {
    expect(isBotTurnEntry(keyed({ key: HISTORY_LABEL.botTurn }))).toBe(true);
  });

  // The allowlist is the fix: the old prose blocklist counted anything it forgot to
  // exclude, which is how the phase-entry rows came to be counted as turns.
  it('excludes phase entries, phase results and passes', () => {
    for (const key of [
      HISTORY_LABEL.enteredPhase,
      HISTORY_LABEL.phaseResult,
      HISTORY_LABEL.youPassed,
      HISTORY_LABEL.botPassed,
      HISTORY_LABEL.endGame,
    ]) {
      expect(isBotTurnEntry(keyed({ key }))).toBe(false);
    }
  });

  it('still reads a legacy prose label', () => {
    expect(isBotTurnEntry(entry('Era 2 · Construct — Factory · +3 VP'))).toBe(true);
    expect(isBotTurnEntry(entry('Era 2 · → Warp'))).toBe(false);
    expect(isBotTurnEntry(entry('Era 2 · You passed'))).toBe(false);
  });
});
