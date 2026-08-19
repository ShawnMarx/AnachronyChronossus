// The per-turn History change-list, driven through the real engine so the assertions
// track what a turn actually does.

import { describe, it, expect } from 'vitest';
import { summarizeTurn } from './turnHistory';
import {
  Chronossus,
  createInitialState,
  emptyChronossusState,
  DEFAULT_CONFIG,
  type GameState,
} from '../engine';

const stateWith = (over: Partial<ReturnType<typeof emptyChronossusState>>): GameState => {
  const st = createInitialState({ ...DEFAULT_CONFIG, chronossusMode: 'base' });
  st.phase = 'actions';
  st.chronossus = { ...emptyChronossusState(), exosuitsAvailable: 3, ...over };
  return st;
};

/** Effects for one resolved Action, as the view builds them. */
const effectsFor = (state: GameState, input: Parameters<typeof Chronossus.resolveAction>[1]) => {
  const pre = state.chronossus!;
  const { state: next, instructions } = Chronossus.resolveAction(state, input);
  return summarizeTurn(pre, next.chronossus!, instructions);
};

describe('summarizeTurn — the +5 VP sets', () => {
  it('reports the Recruit AND the Worker set that completes on it', () => {
    // Three types held; recruiting the fourth completes the set and discards one of each,
    // so the recruited Worker nets to zero in the raw diff.
    const st = stateWith({
      workers: { genius: 1, administrator: 1, engineer: 1, scientist: 0 },
    });
    const out = effectsFor(st, { actionId: 'recruit', placementSpace: 'action', recruitedWorker: 'scientist' });
    expect(out).toContain('Recruited scientist');
    expect(out).toContain('Worker set completed — discard one of each (+5 VP)');
  });

  it('reports the Mine AND the Resource set that completes on it', () => {
    const st = stateWith({
      resources: { neutronium: 1, uranium: 1, gold: 1, titanium: 0, water: 0 },
    });
    const out = effectsFor(st, { actionId: 'mine-resource', placementSpace: 'action', minedResources: ['titanium'] });
    expect(out).toContain('Gained titanium');
    expect(out).toContain('Resource set completed — discard one of each (+5 VP)');
    // The set's discard is the set line's job — it must not also read as a loose discard.
    expect(out.some((e) => e.startsWith('Discarded '))).toBe(false);
  });

  it('reports a plain Recruit / Mine with no set line', () => {
    const st = stateWith({});
    const rec = effectsFor(st, { actionId: 'recruit', placementSpace: 'action', recruitedWorker: 'engineer' });
    expect(rec).toContain('Recruited engineer');
    expect(rec.some((e) => e.includes('set completed'))).toBe(false);

    const mine = effectsFor(st, { actionId: 'mine-resource', placementSpace: 'action', minedResources: ['gold'] });
    expect(mine).toContain('Gained gold');
    expect(mine.some((e) => e.includes('set completed'))).toBe(false);
  });
});
