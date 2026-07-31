import { describe, it, expect } from 'vitest';
import { engineFor, hasEngine } from '../index';
import { MAX_ERA, startNextEra } from './chronobot';
import { createInitialState, DEFAULT_CONFIG } from '../state';

describe('soloEngine registry', () => {
  it('resolves the Chronobot flow-level engine', () => {
    const engine = engineFor('chronobot');
    expect(engine.id).toBe('chronobot');
    expect(engine.MAX_ERA).toBe(MAX_ERA);
  });

  it('reports whether an engine is registered (chronossus not yet)', () => {
    expect(hasEngine('chronobot')).toBe(true);
    expect(hasEngine('chronossus')).toBe(false);
  });

  it('throws for an unregistered engine', () => {
    expect(() => engineFor('chronossus')).toThrow(/No solo engine/);
  });

  it('startNextEra dispatches to the same result as the Chronobot function', () => {
    // Drive to a Clean Up so startNextEra is meaningful, then compare paths.
    const base = { ...createInitialState(DEFAULT_CONFIG), phase: 'cleanup' as const, era: 2 };
    const viaEngine = engineFor('chronobot').startNextEra(base);
    const viaFn = startNextEra(base);
    expect(viaEngine).toEqual(viaFn);
  });
});
