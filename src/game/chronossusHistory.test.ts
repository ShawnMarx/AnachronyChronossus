// The History effects for module-only state, driven through the real engine so the
// assertions track what a turn actually does (not a hand-built delta).

import { describe, it, expect } from 'vitest';
import { summarizeChronossusExtras } from './chronossusHistory';
import {
  Chronossus,
  createInitialState,
  emptyChronossusState,
  DEFAULT_CONFIG,
  type GameState,
} from '../engine';

const fracturesState = (): GameState => {
  const st = createInitialState({ ...DEFAULT_CONFIG, chronossusMode: 'fractures' });
  st.phase = 'actions';
  st.chronossus = {
    ...emptyChronossusState(),
    exosuitsAvailable: 3,
    fluxPool: { cores: 0, casings: 3, setAside: 0 },
    technologies: 0,
    operators: 0,
    placedExosuits: [],
  };
  return st;
};

/** Effects for one resolved Action, as the view builds them (extras only). */
const extrasFor = (state: GameState, input: Parameters<typeof Chronossus.resolveAction>[1]) => {
  const pre = state.chronossus!;
  const { state: next } = Chronossus.resolveAction(state, input);
  return summarizeChronossusExtras(pre, next.chronossus!, []);
};

describe('Chronossus History extras — Fractures tiles', () => {
  it('Power Pack logs its Flux Core (the Energy Core is logged by the shared summarizer)', () => {
    expect(extrasFor(fracturesState(), { actionId: 'tile-power-pack' })).toEqual([
      '+1 Flux Core to the Flux Pool',
    ]);
  });

  it('Extract logs both of its Flux Cores', () => {
    expect(
      extrasFor(fracturesState(), { actionId: 'tile-extract', placementSpace: 'action' }),
    ).toEqual(['+2 Flux Cores to the Flux Pool']);
  });

  it('Assimilate logs the Technology it took', () => {
    expect(
      extrasFor(fracturesState(), { actionId: 'tile-assimilate', shape: 'triangle' }),
    ).toEqual(['+1 Technology card (3 VP each at the end)']);
  });

  it('Assimilate logs the Operator and its Flux Core, naming the column it filled', () => {
    expect(extrasFor(fracturesState(), { actionId: 'tile-assimilate', shape: 'circle' })).toEqual([
      '+1 Flux Core to the Flux Pool',
      'Recruited an Operator into the genius column (wildcard Worker)',
    ]);
  });

  it('rewrites the shared summarizer’s plain "Recruited genius" line for an Operator', () => {
    const state = fracturesState();
    const pre = state.chronossus!;
    const { state: next } = Chronossus.resolveAction(state, {
      actionId: 'tile-assimilate',
      shape: 'circle',
    });
    const effects = summarizeChronossusExtras(pre, next.chronossus!, [
      'Exosuit placed',
      'Recruited genius',
    ]);
    expect(effects).toEqual([
      'Exosuit placed',
      'Recruited an Operator into the genius column (wildcard Worker)',
      '+1 Flux Core to the Flux Pool',
    ]);
  });

  it('covers the B sides too', () => {
    // C06B Power Pack and C05B Extract still feed the Flux Pool.
    for (const [actionId, side, expected] of [
      ['tile-power-pack', 'B', /Flux Core/],
      ['tile-extract', 'B', /Flux Core/],
    ] as const) {
      const lines = extrasFor(fracturesState(), {
        actionId,
        tileSide: side,
        placementSpace: 'action',
      });
      expect(lines.join(' ')).toMatch(expected);
    }
    // C04B Assimilate (Technology branch) still logs the card.
    expect(
      extrasFor(fracturesState(), {
        actionId: 'tile-assimilate',
        tileSide: 'B',
        shape: 'triangle',
      }).join(' '),
    ).toMatch(/Technology card/);
  });

  it('says nothing for a turn that touches no module state', () => {
    expect(extrasFor(fracturesState(), { actionId: 'reboot' })).toEqual([]);
  });
});

describe('Chronossus History extras — Hypersync tiles', () => {
  const hypersyncState = (): GameState => {
    const st = createInitialState({ ...DEFAULT_CONFIG, chronossusMode: 'hypersync' });
    st.phase = 'actions';
    st.era = 2;
    st.chronossus = {
      ...emptyChronossusState(),
      exosuitsAvailable: 3,
      warpTilesOnTimeline: 3,
    };
    return st;
  };

  it('logs a Solo Hypersync tile going onto the Timeline', () => {
    const state = hypersyncState();
    const pre = state.chronossus!;
    const { state: next } = Chronossus.resolveAction(state, {
      actionId: 'research',
      placeHypersyncTile: true,
    });
    const lines = summarizeChronossusExtras(pre, next.chronossus!, []);
    expect(lines).toContain('Solo Hypersync tile placed on the Timeline');
  });

  it('logs a Solo Hypersync tile being retrieved', () => {
    const state = hypersyncState();
    state.chronossus = { ...state.chronossus!, hypersyncTiles: [1] };
    const pre = state.chronossus;
    const { state: next } = Chronossus.resolveHypersyncAction(state, {
      code: 'C12A',
      outcome: 'hypersync',
    });
    const lines = summarizeChronossusExtras(pre, next.chronossus!, []);
    expect(lines).toContain('Solo Hypersync tile retrieved');
  });
});

describe('summarizeChronossusExtras — Guardians of the Council', () => {
  const base = emptyChronossusState();

  it('logs an acquired Guardian', () => {
    const pre = { ...base, guardians: { owned: 0, powered: 0 } };
    const post = { ...base, guardians: { owned: 1, powered: 0 } };
    expect(summarizeChronossusExtras(pre, post, [])).toContain('Acquired 1 Guardian');
  });

  it('names the Worker an Acquire Guardian spent', () => {
    const pre = {
      ...base,
      guardians: { owned: 0, powered: 0 },
      workers: { ...base.workers, engineer: 2 },
    };
    const post = {
      ...base,
      guardians: { owned: 1, powered: 0 },
      workers: { ...base.workers, engineer: 1 },
    };
    const lines = summarizeChronossusExtras(pre, post, []);
    expect(lines).toContain('Acquired 1 Guardian');
    expect(lines).toContain('Spent a engineer to acquire it');
  });

  it('logs a Guardian being placed (the Exosuit count never moves)', () => {
    const pre = { ...base, guardians: { owned: 2, powered: 2 } };
    const post = { ...base, guardians: { owned: 2, powered: 1 } };
    expect(summarizeChronossusExtras(pre, post, [])).toContain('Placed 1 Guardian');
  });

  it('says nothing for a game without the module', () => {
    expect(summarizeChronossusExtras(base, base, [])).toEqual([]);
  });
});

describe('summarizeChronossusExtras — Guardian board placement', () => {
  const base = emptyChronossusState();
  const pre = { ...base, guardians: { owned: 1, powered: 1 } };
  const post = { ...base, guardians: { owned: 1, powered: 0 } };

  it('names the Guardian board when the Action ran from its own space', () => {
    expect(summarizeChronossusExtras(pre, post, [], { guardianBoard: true })).toContain(
      'Placed 1 Guardian on the Guardian board',
    );
  });

  it('says just "Placed" for an ordinary placement', () => {
    expect(summarizeChronossusExtras(pre, post, [])).toContain('Placed 1 Guardian');
  });
});
