// Which Timeline tile the bot's Warp tiles sit on — the split Time Travel's "past
// Timeline tile" rule turns on.

import { describe, it, expect } from 'vitest';
import { englishText } from './messages';
import {
  currentEraWarpTiles,
  pastWarpTiles,
  placeWarpTiles,
  removeAnyWarpTile,
  removeWarpTile,
  warpRemoval,
  warpTileLabel,
} from './warpTiles';

const bot = (warpTilesByEra: Record<number, number>) => ({
  warpTilesByEra,
  warpTilesOnTimeline: Object.values(warpTilesByEra).reduce((n, c) => n + c, 0),
});

describe('past vs current Era', () => {
  it('counts only earlier Eras as past', () => {
    const b = bot({ 1: 1, 2: 2, 3: 1 });
    expect(pastWarpTiles(b, 3)).toBe(3);
    expect(currentEraWarpTiles(b, 3)).toBe(1);
  });

  it('treats Fractures’ Era Zero tile as past from Era 1 on', () => {
    const b = bot({ 0: 2 });
    expect(pastWarpTiles(b, 1)).toBe(2);
    expect(warpRemoval(b, 1)).toEqual({ era: 0, eligible: true });
    // A descriptor, and Era Zero is its own KEY — "the Era Zero tile" is that tile's name,
    // not "Era 0" with a number substituted in.
    expect(warpTileLabel(0)).toEqual({ key: 'board.timelineTile.eraZero' });
    expect(englishText(warpTileLabel(0))).toBe('the Era Zero tile');
    expect(englishText(warpTileLabel(3))).toBe('the Era 3 Timeline tile');
  });
});

describe('warpRemoval — the tile Time Travel takes from', () => {
  it('picks the past tile with the most, oldest on a tie', () => {
    expect(warpRemoval(bot({ 1: 1, 2: 3, 3: 2 }), 4).era).toBe(2);
    expect(warpRemoval(bot({ 1: 2, 3: 2 }), 4).era).toBe(1); // tie → oldest
  });

  it('is NOT eligible when every tile is on the current Era’s tile', () => {
    const b = bot({ 3: 2 });
    expect(b.warpTilesOnTimeline).toBe(2);
    expect(warpRemoval(b, 3)).toEqual({ era: null, eligible: false });
  });

  it('is not eligible with no tiles at all', () => {
    expect(warpRemoval(bot({}), 2)).toEqual({ era: null, eligible: false });
  });

  it('falls back to the total for a save written before per-Era tracking', () => {
    const legacy = { warpTilesOnTimeline: 2 };
    expect(warpRemoval(legacy, 3)).toEqual({ era: null, eligible: true });
    expect(pastWarpTiles(legacy, 3)).toBe(2);
  });

  it('keeps a part-migrated game working: anonymous older tiles still count as past', () => {
    // A game that started before the map existed: its first tracked Warp phase fills
    // Era 3 while two older tiles carry no Era at all. Those two are on past tiles by
    // definition, and go first — reading them as "not tracked, so nothing" would have
    // taken Time Travel away mid-game.
    const mixed = { warpTilesOnTimeline: 3, warpTilesByEra: { 3: 1 } };
    expect(pastWarpTiles(mixed, 3)).toBe(2);
    expect(currentEraWarpTiles(mixed, 3)).toBe(1);
    expect(warpRemoval(mixed, 3)).toEqual({ era: null, eligible: true });
  });

  it('hands over to the map once the anonymous tiles are gone', () => {
    const mixed = { warpTilesOnTimeline: 2, warpTilesByEra: { 1: 1, 3: 1 } };
    expect(warpRemoval(mixed, 3)).toEqual({ era: 1, eligible: true });
  });
});

describe('placing and removing', () => {
  it('adds to the Era’s tile and drops a key that empties', () => {
    expect(placeWarpTiles({ 1: 1 }, 2, 2)).toEqual({ 1: 1, 2: 2 });
    expect(placeWarpTiles(undefined, 1, 0)).toEqual({});
    expect(removeWarpTile({ 1: 1, 2: 2 }, 1)).toEqual({ 2: 2 });
  });

  it('removeAnyWarpTile ignores the past-tile rule (Adventure cards)', () => {
    expect(removeAnyWarpTile({ 3: 2 })).toEqual({ 3: 1 });
    expect(removeAnyWarpTile({})).toEqual({});
  });
});
