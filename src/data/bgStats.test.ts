import { describe, it, expect } from 'vitest';
import { boardLabel, buildBgStatsExport, describeGame } from './bgStats';
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

describe('the play"s board — BG Stats" mode field', () => {
  it('names the opponent AND its modules, so each mode is its own entry', () => {
    expect(boardLabel(row())).toBe('Solo - Chronossus - Doomsday');
  });

  it('drops a bare "Base", which is not a mode worth naming', () => {
    expect(boardLabel(row({ payload: { opponent: 'Chronossus', modes: ['Base'] } }))).toBe(
      'Solo - Chronossus',
    );
  });

  it('joins a combo', () => {
    const r = row({ payload: { opponent: 'Chronossus', modes: ['Base', 'Quantum Loops'] } });
    expect(boardLabel(r)).toBe('Solo - Chronossus - Quantum Loops');
  });

  it('says Chronobot for a Chronobot game — the whole point of the fix', () => {
    // The service wrote "Solo - Chronobot" on EVERY play, so a Doomsday game imported as a
    // Chronobot one. Each side must now say what it actually was.
    expect(boardLabel(row({ payload: { opponent: 'Chronobot' }, difficulty: 'Chronobot · Base' })))
      .toBe('Solo - Chronobot');
  });
});

describe('the exported file', () => {
  it('keeps the mode out of the comments and the difficulty in', () => {
    const file = buildBgStatsExport([row()], 'ShawnTest');
    expect(file.plays[0].comments).toBe('Flip Action tiles to their B side');
    expect(file.plays[0].comments).not.toMatch(/Chronossus|Doomsday/);
    expect(file.plays[0].board).toBe('Solo - Chronossus - Doomsday');
  });

  it('names every opponent that actually appears, not just one', () => {
    const file = buildBgStatsExport(
      [
        row(),
        row({ id: 2, payload: { opponent: 'Chronobot' }, difficulty: 'Chronobot · Base', won: false }),
      ],
      'ShawnTest',
    );
    expect(file.players.map((p) => p.name)).toEqual(['ShawnTest', 'Chronossus', 'Chronobot']);
    // …and each play points at its own opponent.
    const [cx, cb] = file.plays;
    expect(cx.playerScores[1].playerRefId).not.toBe(cb.playerScores[1].playerRefId);
  });

  it('exports only the rows it is given — the selection is the caller"s', () => {
    const three = [row({ id: 1 }), row({ id: 2 }), row({ id: 3 })];
    expect(buildBgStatsExport(three.slice(0, 2), 'x').plays).toHaveLength(2);
  });

  it('carries the scores, the winner and the Era', () => {
    const file = buildBgStatsExport([row()], 'ShawnTest');
    const play = file.plays[0];
    expect(play.rounds).toBe(7);
    expect(play.playDate).toBe('2026-08-22 00:00:00');
    expect(play.playerScores).toEqual([
      { playerRefId: 1, score: '42', winner: true },
      { playerRefId: 2, score: '30', winner: false },
    ]);
  });

  it('keeps the shape the data service emitted, so imports still work', () => {
    const file = buildBgStatsExport([row()], 'ShawnTest');
    expect(file.about).toBe('This is a Play file that can be read by Board Game Stats.');
    expect(file.games).toEqual([{ bggId: 185343, name: 'Anachrony', id: 1 }]);
    expect(file.locations).toEqual([]);
  });
});
