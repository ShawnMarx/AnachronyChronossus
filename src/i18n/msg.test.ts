import { describe, expect, it } from 'vitest';
import { renderMsg, renderAll } from './msg';
import { msg, plural } from '../engine/message';

const CATALOG: Record<string, string> = {
  'msg.list.sep': ', ',
  'msg.list.last': ' and ',
  'test.plain': 'The Chronossus reboots.',
  'test.one': 'Mine {cubes} for the Chronossus.',
  'test.cube': '{n} {resource}',
  'test.resource.titanium': 'Titanium',
  'test.resource.gold': 'Gold',
  'test.cores.one': '+{n} Flux Core',
  'test.cores.other': '+{n} Flux Cores',
};

const t = (key: string, params?: Record<string, string | number>) =>
  (CATALOG[key] ?? key).replace(/\{(\w+)\}/g, (whole, name: string) =>
    params && name in params ? String(params[name]) : whole,
  );

describe('renderMsg', () => {
  it('renders a key with no params', () => {
    expect(renderMsg(t, msg('test.plain'))).toBe('The Chronossus reboots.');
  });

  it('substitutes plain params', () => {
    expect(renderMsg(t, msg('test.cube', { n: 2, resource: 'Gold' }))).toBe('2 Gold');
  });

  it('resolves a nested descriptor param depth-first', () => {
    const cube = msg('test.cube', { n: 1, resource: msg('test.resource.titanium') });
    expect(renderMsg(t, msg('test.one', { cubes: cube }))).toBe(
      'Mine 1 Titanium for the Chronossus.',
    );
  });

  it('joins a list param with the catalog separators', () => {
    const cubes = [
      msg('test.cube', { n: 1, resource: msg('test.resource.titanium') }),
      msg('test.cube', { n: 2, resource: msg('test.resource.gold') }),
    ];
    expect(renderMsg(t, msg('test.one', { cubes }))).toBe(
      'Mine 1 Titanium and 2 Gold for the Chronossus.',
    );
  });

  it('joins three list items with separator and conjunction', () => {
    const parts = [msg('test.resource.gold'), msg('test.resource.titanium'), msg('test.plain')];
    expect(renderMsg(t, msg('test.one', { cubes: parts }))).toBe(
      'Mine Gold, Titanium and The Chronossus reboots. for the Chronossus.',
    );
  });

  it('renders an empty list as an empty string', () => {
    expect(renderMsg(t, msg('test.one', { cubes: [] }))).toBe('Mine  for the Chronossus.');
  });

  // The whole point of D3: a game in progress when this shipped still has finished
  // English sentences on its undo stack, and they must keep rendering as written.
  it('passes a legacy saved sentence through untouched', () => {
    expect(renderMsg(t, 'Place the Chronobot Exosuit on the **Mine**.')).toBe(
      'Place the Chronobot Exosuit on the **Mine**.',
    );
  });

  it('falls back to the key when the catalog has no entry', () => {
    expect(renderMsg(t, msg('test.missing'))).toBe('test.missing');
  });

  it('leaves an unsupplied placeholder as written', () => {
    expect(renderMsg(t, msg('test.cube', { n: 3 }))).toBe('3 {resource}');
  });

  it('renders a list of messages', () => {
    expect(renderAll(t, [msg('test.plain'), 'legacy line'])).toEqual([
      'The Chronossus reboots.',
      'legacy line',
    ]);
  });
});

describe('plural', () => {
  it('picks the .one form for exactly one', () => {
    expect(renderMsg(t, plural('test.cores', 1))).toBe('+1 Flux Core');
  });

  it('picks the .other form for anything else', () => {
    expect(renderMsg(t, plural('test.cores', 3))).toBe('+3 Flux Cores');
    expect(renderMsg(t, plural('test.cores', 0))).toBe('+0 Flux Cores');
  });

  it('carries extra params alongside the count', () => {
    expect(plural('test.cores', 2, { where: 'pool' })).toEqual({
      key: 'test.cores.other',
      params: { where: 'pool', n: 2 },
    });
  });
});
