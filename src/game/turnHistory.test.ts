// The per-turn History change-list, driven through the real engine so the assertions
// track what a turn actually does.

import { describe, it, expect } from 'vitest';
import { summarizeTurn } from './turnHistory';
import { renderEnglish } from '../i18n/msg';
import { summarizeChronossusExtras } from './chronossusHistory';
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

/**
 * Effects for one resolved Action, as the view builds them — rendered in English, because
 * what these tests are about IS the line the player reads. (The descriptors themselves are
 * asserted by key where a rule depends on the key: see `historyLabels.test.ts`.)
 */
const effectsFor = (state: GameState, input: Parameters<typeof Chronossus.resolveAction>[1]) => {
  const pre = state.chronossus!;
  const { state: next, instructions } = Chronossus.resolveAction(state, input);
  return summarizeTurn(pre, next.chronossus!, instructions).map(renderEnglish);
};

describe('summarizeTurn — the +5 VP sets', () => {
  it('reports the Recruit AND the Worker set that completes on it', () => {
    // Three types held; recruiting the fourth completes the set and discards one of each,
    // so the recruited Worker nets to zero in the raw diff.
    const st = stateWith({
      workers: { genius: 1, administrator: 1, engineer: 1, scientist: 0 },
    });
    const out = effectsFor(st, { actionId: 'recruit', placementSpace: 'action', recruitedWorker: 'scientist' });
    expect(out).toContain('Recruited Scientist');
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
    expect(rec).toContain('Recruited Engineer');
    expect(rec.some((e) => e.includes('set completed'))).toBe(false);

    const mine = effectsFor(st, { actionId: 'mine-resource', placementSpace: 'action', minedResources: ['gold'] });
    expect(mine).toContain('Gained gold');
    expect(mine.some((e) => e.includes('set completed'))).toBe(false);
  });
});

describe('summarizeTurn — Assimilate completes the set with an Operator', () => {
  it('reports the Operator, its column, and the set it completed', () => {
    // Fractures' Assimilate recruits an Operator into the topmost empty Worker column —
    // and an Operator counts towards the +5 VP set (Solo Opponents p.13). The set then
    // discards one of each, so BOTH the Operator count and its column net to zero.
    const st = createInitialState({ ...DEFAULT_CONFIG, chronossusMode: 'fractures' });
    st.phase = 'actions';
    st.chronossus = {
      ...emptyChronossusState(),
      exosuitsAvailable: 3,
      fluxPool: { cores: 0, casings: 3, setAside: 0 },
      workers: { genius: 1, administrator: 1, engineer: 1, scientist: 0 },
      placedExosuits: [],
    };
    const pre = st.chronossus;
    const { state: next, instructions } = Chronossus.resolveAction(st, {
      actionId: 'tile-assimilate',
      placementSpace: 'action',
      shape: 'circle',
      operatorsAvailable: true,
    });
    const out = summarizeChronossusExtras(
      pre,
      next.chronossus!,
      summarizeTurn(pre, next.chronossus!, instructions),
    ).map(renderEnglish);
    expect(out).toContain('Recruited an Operator into the Scientist column (wildcard Worker)');
    expect(out).toContain('Worker set completed — discard one of each (+5 VP)');
  });
});
