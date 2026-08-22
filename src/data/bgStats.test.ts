import { describe, it, expect } from 'vitest';
import { boardLabel, buildBgStatsExport, describeGame, playUuid } from './bgStats';
import type { GameRow } from './gameData';

const row = (over: Partial<GameRow> = {}): GameRow => ({
  id: 1,
  app_slug: 'anachrony',
  user_id: 2,
  played_at: '2026-08-22',
  source: 'app',
  created_at: null,
  won: true,
  bot_score: 30,
  player_score: 42,
  difficulty: 'Chronossus · Doomsday · Flip Action tiles to their B side',
  era_reached: 7,
  payload: { opponent: 'Chronossus', modes: ['Doomsday'] },
  ...over,
});

describe('reading a saved row', () => {
  it('splits the bot, the modules and the difficulty apart', () => {
    expect(describeGame(row())).toEqual({
      opponent: 'Chronossus',
      modes: ['Doomsday'],
      difficulty: 'Flip Action tiles to their B side',
    });
  });

  it('falls back to the label when there is no payload', () => {
    // Rows written before the payload carried structured fields.
    const r = row({ payload: null, difficulty: 'Chronossus · Base + Quantum Loops · Base' });
    expect(describeGame(r)).toEqual({
      opponent: 'Chronossus',
      modes: ['Base', 'Quantum Loops'],
      difficulty: 'Base',
    });
  });

  it('treats an unlabelled row as difficulty only, with no opponent invented', () => {
    // The oldest Chronobot rows are a bare option list, and imported rows can be anything.
    const r = row({ payload: null, difficulty: 'Extra starting Energy Cores' });
    expect(describeGame(r)).toEqual({
      opponent: null,
      modes: [],
      difficulty: 'Extra starting Energy Cores',
    });
  });
});

describe('the play\u2019s board \u2014 BG Stats\u2019 mode field', () => {
  // BG Stats separates the parts with a FULLWIDTH SOLIDUS, as its own export does:
  // "Solo - Chronossus／Alternate Timelines／Doomsday".
  it('names the opponent AND its modules, separated the way BG Stats does', () => {
    expect(boardLabel(row())).toBe('Solo - Chronossus\uff0fDoomsday');
  });

  it('drops a bare "Base", which is not a mode worth naming', () => {
    expect(boardLabel(row({ payload: { opponent: 'Chronossus', modes: ['Base'] } }))).toBe(
      'Solo - Chronossus',
    );
  });

  it('joins a combo', () => {
    const r = row({
      payload: { opponent: 'Chronossus', modes: ['Base', 'Quantum Loops', 'Doomsday'] },
    });
    expect(boardLabel(r)).toBe('Solo - Chronossus\uff0fQuantum Loops\uff0fDoomsday');
  });

  it('says Chronobot for a Chronobot game — the whole point of the fix', () => {
    // The service wrote "Solo - Chronobot" on EVERY play, so a Doomsday game imported as a
    // Chronobot one. Each side must now say what it actually was.
    expect(boardLabel(row({ payload: { opponent: 'Chronobot' }, difficulty: 'Chronobot · Base' })))
      .toBe('Solo - Chronobot');
  });
});

describe('the opponent seat', () => {
  it('is the anonymous player, with the bot named as its ROLE and flagged isNpc', () => {
    // Naming the bot in `players` would add a person to the player list who does not exist.
    // BG Stats' own export keeps the seat anonymous and puts the identity on the seat.
    const file = buildBgStatsExport([row()], 'Shawn', '2026-08-22 14:00:00');
    expect(file.players).toEqual([
      { id: 1, name: 'Shawn', isAnonymous: false },
      { id: 2, name: 'Anonymous player', isAnonymous: true },
    ]);
    const bot = file.plays[0].playerScores[1];
    expect(bot.role).toBe('Chronossus');
    expect(bot.metaData).toBe('{"isNpc":1}');
    expect(bot.seatOrder).toBe(0);
    // The human's seat carries no role — the app does not know their board or leader.
    expect(file.plays[0].playerScores[0].role).toBeUndefined();
  });
});

describe('re-exporting the same play', () => {
  it('reuses the play uuid, so BG Stats updates rather than duplicating', () => {
    expect(playUuid(7)).toBe(playUuid(7));
    expect(playUuid(7)).not.toBe(playUuid(8));
    expect(playUuid(7)).toMatch(/^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/);
  });
});

describe('the exported file', () => {
  it('keeps the mode out of the comments and the difficulty in', () => {
    const file = buildBgStatsExport([row()], 'ShawnTest');
    expect(file.plays[0].comments).toBe('Flip Action tiles to their B side');
    expect(file.plays[0].comments).not.toMatch(/Chronossus|Doomsday/);
    expect(file.plays[0].board).toBe('Solo - Chronossus\uff0fDoomsday');
  });

  it('names the bot per play, not per player — two bots share one anonymous seat', () => {
    const file = buildBgStatsExport(
      [
        row(),
        row({ id: 2, payload: { opponent: 'Chronobot' }, difficulty: 'Chronobot · Base', won: false }),
      ],
      'ShawnTest',
    );
    // One opponent seat, whichever bot played…
    expect(file.players.map((p) => p.name)).toEqual(['ShawnTest', 'Anonymous player']);
    // …and each play says on its own seat which bot it actually was.
    const [cx, cb] = file.plays;
    expect(cx.playerScores[1].role).toBe('Chronossus');
    expect(cb.playerScores[1].role).toBe('Chronobot');
    expect(cx.board).toContain('Chronossus');
    expect(cb.board).toContain('Chronobot');
  });

  it('exports only the rows it is given \u2014 the selection is the caller\u2019s', () => {
    const three = [row({ id: 1 }), row({ id: 2 }), row({ id: 3 })];
    expect(buildBgStatsExport(three.slice(0, 2), 'x').plays).toHaveLength(2);
  });

  it('carries the scores, the winner and the Era', () => {
    const file = buildBgStatsExport([row()], 'ShawnTest');
    const play = file.plays[0];
    expect(play.rounds).toBe(7);
    expect(play.playDate).toBe('2026-08-22 00:00:00');
    expect(play.playerScores).toEqual([
      {
        metaData: '{}',
        newPlayer: false,
        playerRefId: 1,
        rank: 0,
        score: '42',
        startPlayer: false,
        winner: true,
      },
      {
        metaData: '{"isNpc":1}',
        newPlayer: false,
        playerRefId: 2,
        rank: 0,
        role: 'Chronossus',
        score: '30',
        seatOrder: 0,
        startPlayer: false,
        winner: false,
      },
    ]);
  });

  it('carries the file furniture BG Stats\u2019 own export has', () => {
    const file = buildBgStatsExport([row()], 'Shawn', '2026-08-22 14:00:00');
    expect(file.about).toMatch(/^This is a Play file that can be read by Board Game Stats\./);
    expect(file.games).toHaveLength(1); // the base game only — no expansion entries
    expect(file.games[0].bggId).toBe(185343);
    expect(file.locations).toEqual([{ id: 1, name: 'Home' }]);
    expect(file.userInfo).toEqual({ meRefId: 1 });
    const play = file.plays[0];
    expect(play.playDateYmd).toBe(20260822);
    expect(play.playDate).toBe('2026-08-22 00:00:00');
    expect(play.scoringSetting).toBe(1);
    expect(play.locationRefId).toBe(1);
    expect('expansionPlays' in play).toBe(false);
  });
});
