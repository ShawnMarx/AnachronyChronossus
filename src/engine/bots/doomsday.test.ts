import { describe, it, expect } from 'vitest';
import {
  botTrackerFor,
  botVpAt,
  DOOMSDAY_BOTTOM_SLOT,
  DOOMSDAY_START_SLOT,
  DOOMSDAY_TOP_SLOT,
  DOOMSDAY_TRACK,
  isDoomsdayMode,
  isFinalSlot,
  nextSlot,
  tracksLocked,
  type DoomsdayTracker,
  type PlayerPath,
} from './doomsday';

describe('Doomsday — the track', () => {
  it('is one continuous 10-slot ladder, numbered top to bottom', () => {
    expect(DOOMSDAY_TRACK.map((s) => s.slot)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(DOOMSDAY_TOP_SLOT).toBe(1);
    expect(DOOMSDAY_BOTTOM_SLOT).toBe(10);
    expect(DOOMSDAY_START_SLOT).toBe(6);
  });

  it('matches the printed VP columns', () => {
    const printed = DOOMSDAY_TRACK.map((s) => [s.left, s.right]);
    expect(printed).toEqual([
      [0, 3],
      [2, 2],
      [1, 0],
      [1, 0],
      [1, 0],
      [0, 0],
      [1, 0],
      [1, 0],
      [2, 2],
      [0, 2],
    ]);
  });

  it('pays the bot BOTH columns combined, unlike a human who takes only their own side', () => {
    for (const slot of DOOMSDAY_TRACK) {
      expect(slot.botVp).toBe(slot.left + slot.right);
    }
    // The two slots that print a value on each side are the ones this actually changes.
    expect(botVpAt(2)).toBe(4);
    expect(botVpAt(9)).toBe(4);
    // The final slots print on one side only, so combining is a no-op there.
    expect(botVpAt(1)).toBe(3);
    expect(botVpAt(10)).toBe(2);
    // The start slot pays nothing (nobody lands on it by moving).
    expect(botVpAt(DOOMSDAY_START_SLOT)).toBe(0);
  });
});

describe('Doomsday — the bot takes the opposing tracker', () => {
  const cases: [PlayerPath, DoomsdayTracker][] = [
    ['harmony', 'seal-fate'],
    ['dominance', 'seal-fate'],
    ['salvation', 'save-earth'],
    ['progress', 'save-earth'],
  ];
  it.each(cases)('player on %s -> bot moves %s', (path, tracker) => {
    expect(botTrackerFor(path)).toBe(tracker);
  });
});

describe('Doomsday — tracker movement', () => {
  it('moves Save Earth up the ladder and Seal Fate down it', () => {
    expect(nextSlot('save-earth', DOOMSDAY_START_SLOT)).toBe(5);
    expect(nextSlot('seal-fate', DOOMSDAY_START_SLOT)).toBe(7);
  });

  it('clamps at each trackers own end of the ladder', () => {
    expect(nextSlot('save-earth', DOOMSDAY_TOP_SLOT)).toBe(DOOMSDAY_TOP_SLOT);
    expect(nextSlot('seal-fate', DOOMSDAY_BOTTOM_SLOT)).toBe(DOOMSDAY_BOTTOM_SLOT);
  });

  it('only calls a slot final for the tracker that ends there', () => {
    expect(isFinalSlot('save-earth', 1)).toBe(true);
    expect(isFinalSlot('save-earth', 10)).toBe(false);
    expect(isFinalSlot('seal-fate', 10)).toBe(true);
    expect(isFinalSlot('seal-fate', 1)).toBe(false);
  });
});

describe('Doomsday — the tracks lock', () => {
  const open = {
    impactOccurred: false,
    botTracker: 'seal-fate' as DoomsdayTracker,
    botSlot: DOOMSDAY_START_SLOT,
    playerTrackerFinal: false,
  };

  it('stays open mid-track before the Impact', () => {
    expect(tracksLocked(open)).toBe(false);
  });

  it('locks once the Impact has occurred', () => {
    expect(tracksLocked({ ...open, impactOccurred: true })).toBe(true);
  });

  it('locks when the bot reaches its own final slot', () => {
    expect(tracksLocked({ ...open, botSlot: DOOMSDAY_BOTTOM_SLOT })).toBe(true);
    // ...but the other end of the ladder is not the bot's end.
    expect(tracksLocked({ ...open, botSlot: DOOMSDAY_TOP_SLOT })).toBe(false);
  });

  it('locks when the player reports their own tracker is final', () => {
    expect(tracksLocked({ ...open, playerTrackerFinal: true })).toBe(true);
  });
});

describe('Doomsday — mode matching', () => {
  it('matches only the doomsday mode (it combines with nothing)', () => {
    expect(isDoomsdayMode('doomsday')).toBe(true);
    expect(isDoomsdayMode('base')).toBe(false);
    expect(isDoomsdayMode(undefined)).toBe(false);
  });
});
