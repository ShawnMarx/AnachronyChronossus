// The offline queue for finished games. A save that fails must not lose the game —
// especially the lapsed-login case, where the fix (logging in) is a full-page redirect.

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// A minimal localStorage for the node test environment.
const store = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
});

const recordGame = vi.fn();
vi.mock('./gameData', () => ({ recordGame: (g: unknown) => recordGame(g) }));

const { queuePendingGame, pendingGameCount, flushPendingGames } = await import('./pendingGames');

const game = (score: number) => ({
  won: true,
  bot_score: 10,
  player_score: score,
  difficulty: 'Chronossus',
  era_reached: 7,
});

beforeEach(() => {
  store.clear();
  recordGame.mockReset();
});
afterEach(() => vi.unstubAllGlobals);

describe('the pending-game queue', () => {
  it('holds a game and uploads it later', async () => {
    queuePendingGame(game(21));
    expect(pendingGameCount()).toBe(1);
    recordGame.mockResolvedValue({});
    expect(await flushPendingGames()).toEqual({ saved: 1, remaining: 0 });
    expect(pendingGameCount()).toBe(0);
  });

  it('keeps the game when the upload fails again', async () => {
    queuePendingGame(game(21));
    recordGame.mockRejectedValue(new Error('401 Unauthorized'));
    expect(await flushPendingGames()).toEqual({ saved: 0, remaining: 1 });
    expect(pendingGameCount()).toBe(1);
  });

  it('stops at the first failure and keeps the rest', async () => {
    queuePendingGame(game(1));
    queuePendingGame(game(2));
    queuePendingGame(game(3));
    recordGame.mockResolvedValueOnce({}).mockRejectedValue(new Error('503'));
    expect(await flushPendingGames()).toEqual({ saved: 1, remaining: 2 });
    expect(pendingGameCount()).toBe(2);
  });

  it('is a no-op with nothing queued', async () => {
    expect(await flushPendingGames()).toEqual({ saved: 0, remaining: 0 });
    expect(recordGame).not.toHaveBeenCalled();
  });
});
