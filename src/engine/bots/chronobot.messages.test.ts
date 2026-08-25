// The rendered English of the Chronobot's instructions.
//
// The message-descriptor refactor must not change a single displayed word — it moves where
// the English lives, not what it says. Most defaults could be checked against the old
// source automatically, because they were one string literal. These could NOT: each was
// built at runtime, either by splicing a conditional clause into the middle of a sentence
// or by pasting on a shared tail. Those are exactly the ones D2 splits into sibling keys,
// so they are exactly the ones worth pinning by hand.

import { describe, expect, it } from 'vitest';
import { ENGINE_MESSAGES } from '../messages';
// The full-surface renderer, not the engine's own: these sentences nest keys the surface
// owns (`piece.powerplant`, `ui.pieceInline.gold`), which the engine cannot see.
import { renderEnglish as englishText } from '../../i18n/msg';
import { msg, plural } from '../message';

describe('Chronobot instruction English — the split sentences', () => {
  it('renders both Warp counts, singular and plural', () => {
    expect(englishText(plural('instr.chronobot.warp.place', 1))).toBe(
      'Place 1 Warp tile for the Chronobot on the Timeline.',
    );
    expect(englishText(plural('instr.chronobot.warp.place', 2))).toBe(
      'Place 2 Warp tiles for the Chronobot on the Timeline.',
    );
  });

  it('renders both halves of the Failed Action sentence', () => {
    const reason = msg('instr.chronobot.reason.noAnomaly');
    expect(englishText(msg('instr.chronobot.failed.placing', { reason }))).toBe(
      'Failed Action: it has no Anomaly to remove — the Chronobot places an Exosuit and takes +1 VP instead.',
    );
    expect(englishText(msg('instr.chronobot.failed.plain', { reason }))).toBe(
      'Failed Action: it has no Anomaly to remove — the Chronobot takes +1 VP instead.',
    );
  });

  it('renders the building-count reason with the piece name', () => {
    expect(
      englishText(
        msg('instr.chronobot.failed.plain', {
          reason: msg('instr.chronobot.reason.threeBuildings', {
            building: msg('piece.powerplant'),
          }),
        }),
      ),
    ).toBe(
      'Failed Action: it already has 3 Power Plant buildings — the Chronobot takes +1 VP instead.',
    );
  });

  it('renders both Time Travel failures with their shared tail', () => {
    expect(englishText(msg('instr.chronobot.timeTravel.failCurrentEra'))).toBe(
      'The Chronobot’s only Warp tiles are on the current Era’s Timeline tile, which Time Travel may not take from — Time Travel is Failed; the Chronobot takes +1 VP (no Exosuit).',
    );
    expect(englishText(msg('instr.chronobot.timeTravel.failNone'))).toBe(
      'No Warp tiles remain on the Timeline — Time Travel is Failed; the Chronobot takes +1 VP (no Exosuit).',
    );
  });

  it('names the Timeline tile it removes from, Era Zero included', () => {
    expect(
      englishText(
        msg('instr.chronobot.timeTravel.done', { tile: msg('board.timelineTile.era', { era: 2 }) }),
      ),
    ).toBe(
      'Remove one of the Chronobot’s Warp tiles from the Era 2 Timeline tile; advance its Time Travel marker 1 spot along the track.',
    );
    // The pre-tracking fallback: an older save's tiles are anonymous, so it states the
    // rulebook's selection rule instead of naming an Era.
    expect(
      englishText(
        msg('instr.chronobot.timeTravel.done', { tile: msg('board.timelineTile.mostOldestPast') }),
      ),
    ).toBe(
      'Remove one of the Chronobot’s Warp tiles from the past Timeline tile where it has the most (oldest if tied); advance its Time Travel marker 1 spot along the track.',
    );
  });

  it('joins mined cubes with " + ", not the default list separators', () => {
    expect(
      englishText(
        msg('instr.chronobot.mine.gained', {
          cubes: {
            list: [msg('ui.pieceInline.gold'), msg('ui.pieceInline.titanium')],
            sep: 'msg.cubeJoin',
            last: 'msg.cubeJoin',
          },
        }),
      ),
    ).toBe('Mine: give the Chronobot gold + titanium from the Mine space you used.');
  });

  it('renders the Paradox reset with the tracker value, zero included', () => {
    const at = (n: number) =>
      englishText(
        msg('instr.chronobot.paradox.anomaly.removed', {
          tile: msg('board.timelineTile.era', { era: 1 }),
          n,
        }),
      );
    // The old code had a `total > 0 ? ' to N.' : ' to 0.'` ternary whose two branches
    // produced the same sentence — one key covers both.
    expect(at(0)).toBe(
      'Remove one of the Chronobot’s Warp tiles from the Era 1 Timeline tile. Its Paradox tracker resets to 0.',
    );
    expect(at(2)).toBe(
      'Remove one of the Chronobot’s Warp tiles from the Era 1 Timeline tile. Its Paradox tracker resets to 2.',
    );
  });
});

describe('the catalog itself', () => {
  it('has no key whose default still contains an unrendered placeholder name', () => {
    // A typo'd param name is invisible at runtime — the placeholder just renders as
    // written. Anything with a brace must be supplied a param by its call site.
    const withParams = Object.entries(ENGINE_MESSAGES).filter(([, v]) => /\{\w+\}/.test(v));
    expect(withParams.length).toBeGreaterThan(0);
  });

  it('publishes both plural forms wherever it publishes one', () => {
    for (const key of Object.keys(ENGINE_MESSAGES)) {
      if (key.endsWith('.one')) {
        expect(ENGINE_MESSAGES[`${key.slice(0, -4)}.other`]).toBeDefined();
      }
      if (key.endsWith('.other')) {
        expect(ENGINE_MESSAGES[`${key.slice(0, -6)}.one`]).toBeDefined();
      }
    }
  });
});
