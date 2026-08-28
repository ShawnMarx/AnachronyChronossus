import { describe, it, expect } from 'vitest';
import { isMsg, type Text } from '../message';
import type { GameState } from '../state';
import { Chronossus, createInitialState, emptyChronossusState, DEFAULT_CONFIG } from '../index';
import {
  DIFFICULTY_QL_2VP,
  DIFFICULTY_QL_REMOVE_ON_5,
  EXTRA_MODULE_QUANTUM_LOOPS,
  QUANTUM_LOOPS_REMOVAL_VP,
  isQuantumLoops,
  quantumLoopRemoval,
} from './quantumLoops';

describe('Quantum Loops — the Warp Phase check', () => {
  const check = (roll: number | null, difficulty: string[] = [], tilesPlaced = 1) =>
    quantumLoopRemoval({ tilesPlaced, roll, difficulty });

  it('removes a card on a 4 and nothing else', () => {
    expect(check(4).removes).toBe(true);
    for (const face of [2, 3, 5]) expect(check(face).removes).toBe(false);
  });

  it('also removes on a 5 with that difficulty option', () => {
    expect(check(5, [DIFFICULTY_QL_REMOVE_ON_5]).removes).toBe(true);
    // …and the option doesn't turn any OTHER face into a removal.
    for (const face of [2, 3]) {
      expect(check(face, [DIFFICULTY_QL_REMOVE_ON_5]).removes).toBe(false);
    }
    expect(check(4, [DIFFICULTY_QL_REMOVE_ON_5]).removes).toBe(true);
  });

  it('never rolls when the Chronossus placed no Warp tiles', () => {
    // The rule is conditioned on placing at least one tile — a 4 with nothing placed is
    // not a missed removal, it is a check that never happened.
    expect(check(4, [], 0)).toEqual({ rolled: false, removes: false, vp: 0 });
    expect(check(4, [DIFFICULTY_QL_2VP], 0).vp).toBe(0);
  });

  it('reports a miss as a real result, so the view can show it', () => {
    expect(check(3)).toEqual({ rolled: true, removes: false, vp: 0 });
  });

  it('scores 2 VP only with the option AND an actual removal', () => {
    expect(check(4, [DIFFICULTY_QL_2VP]).vp).toBe(QUANTUM_LOOPS_REMOVAL_VP);
    expect(check(3, [DIFFICULTY_QL_2VP]).vp).toBe(0);
    expect(check(4).vp).toBe(0);
  });

  it('applies both difficulty options together', () => {
    const r = check(5, [DIFFICULTY_QL_REMOVE_ON_5, DIFFICULTY_QL_2VP]);
    expect(r).toEqual({ rolled: true, removes: true, vp: QUANTUM_LOOPS_REMOVAL_VP });
  });

  it('knows when the module is in play', () => {
    expect(isQuantumLoops([EXTRA_MODULE_QUANTUM_LOOPS])).toBe(true);
    expect(isQuantumLoops(['alternate-timelines'])).toBe(false);
    expect(isQuantumLoops(undefined)).toBe(false);
  });
});

// --- through the real Warp resolver -------------------------------------------------------

const warpState = (opts: { extras?: string[]; difficulty?: string[]; era?: number } = {}): GameState => {
  const st = createInitialState({
    ...DEFAULT_CONFIG,
    extraModules: opts.extras ?? [EXTRA_MODULE_QUANTUM_LOOPS],
    difficulty: opts.difficulty ?? [],
  });
  st.era = opts.era ?? 2;
  st.phase = 'warp';
  st.chronossus = { ...emptyChronossusState() };
  return st;
};

const quantumInstruction = (st: GameState) =>
  st.currentInstructions.find((i) => i.id === 'quantum-loops');

/** Which message the instruction IS — the key, not the English it happens to render as. */
const keyOf = (i: { text: Text }): string => (isMsg(i.text) ? i.text.key : i.text);

describe('Quantum Loops — resolveWarp', () => {
  it('emits the removal instruction on a 4, naming the card position in bold', () => {
    const next = Chronossus.resolveWarp(warpState(), 2, 0, false, 4);
    const inst = quantumInstruction(next);
    expect(keyOf(inst!)).toBe('instr.chronossus.quantumLoops.removes');
    expect(next.log.at(-1)).toContain('Quantum Loops card removed');
  });

  it('still reports the check on a miss', () => {
    const next = Chronossus.resolveWarp(warpState(), 1, 0, false, 3);
    const inst = quantumInstruction(next);
    expect(inst).toBeDefined();
    expect(keyOf(inst!)).toBe('instr.chronossus.quantumLoops.keeps');
    expect(next.log.at(-1)).not.toContain('Quantum Loops card removed');
  });

  it('says nothing at all when no Warp tile was placed', () => {
    const next = Chronossus.resolveWarp(warpState(), 0, 0, false, 4);
    expect(quantumInstruction(next)).toBeUndefined();
  });

  it('grants the 2 VP with the difficulty option', () => {
    const st = warpState({ difficulty: [DIFFICULTY_QL_2VP] });
    const before = st.chronossus!.vp;
    const next = Chronossus.resolveWarp(st, 1, 0, false, 4);
    expect(next.chronossus!.vp).toBe(before + QUANTUM_LOOPS_REMOVAL_VP);
    expect(quantumInstruction(next)?.effect?.vp).toBe(QUANTUM_LOOPS_REMOVAL_VP);
  });

  it('grants nothing on a miss, even with the VP option on', () => {
    const st = warpState({ difficulty: [DIFFICULTY_QL_2VP] });
    const before = st.chronossus!.vp;
    const next = Chronossus.resolveWarp(st, 1, 0, false, 2);
    expect(next.chronossus!.vp).toBe(before);
  });

  it('runs in Fractures’ Era Zero Warp too — it is a Warp Phase like any other', () => {
    const next = Chronossus.resolveWarp(warpState({ era: 1 }), 1, 0, true, 4);
    expect(keyOf(quantumInstruction(next)!)).toBe('instr.chronossus.quantumLoops.removes');
    // …and still hands off to Era 1's Preparation, not Action Rounds.
    expect(next.phase).toBe('preparation');
  });

  it('leaves a game without the module bit-for-bit unchanged', () => {
    // Even if a stray roll is passed in: the module gates the whole check.
    const st = warpState({ extras: [] });
    const before = st.chronossus!.vp;
    const next = Chronossus.resolveWarp(st, 2, 0, false, 4);
    expect(quantumInstruction(next)).toBeUndefined();
    expect(next.chronossus!.vp).toBe(before);
    expect(next.log.at(-1)).not.toContain('Quantum Loops');
  });

  it('stacks with Alternate Timelines without either losing its VP', () => {
    const st = warpState({
      extras: [EXTRA_MODULE_QUANTUM_LOOPS, Chronossus.EXTRA_MODULE_ALTERNATE_TIMELINES],
      difficulty: [DIFFICULTY_QL_2VP],
    });
    const before = st.chronossus!.vp;
    // 2 tiles placed, 1 on a positive space (2 VP), and the Quantum Loops removal (2 VP).
    const next = Chronossus.resolveWarp(st, 2, 1, false, 4);
    expect(next.chronossus!.vp).toBe(before + 2 + QUANTUM_LOOPS_REMOVAL_VP);
  });
});
