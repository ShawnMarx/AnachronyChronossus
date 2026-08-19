// Finished games that couldn't be uploaded yet.
//
// The score screen auto-saves a finished game to the shared BGE data service. That call
// fails for reasons the player can do nothing about mid-tally — most often the shared
// login session lapsing during a long game, which left the screen saying "log in again to
// save this game" with no way to log in and nothing holding the result. Leaving the score
// screen then lost it for good.
//
// So a failed save is kept on this device instead, and uploaded the next time the app
// starts with a logged-in user. Queue FIRST, then offer the login: logging in is a
// full-page redirect, and anything still only in React state is gone by the time it
// returns.

import { recordGame, type GameSummary } from './gameData';

const KEY = 'anachrony:pending-games';
/** Keep the queue bounded; the oldest go first if it ever fills. */
const CAP = 20;

function read(): GameSummary[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? (list as GameSummary[]) : [];
  } catch {
    return [];
  }
}

function write(list: GameSummary[]): void {
  try {
    if (list.length === 0) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify(list.slice(-CAP)));
  } catch {
    // Private-mode / quota: nothing more we can do, and it must not break the score screen.
  }
}

/** Hold a finished game that failed to upload. */
export function queuePendingGame(summary: GameSummary): void {
  write([...read(), summary]);
}

/** How many finished games are waiting to upload. */
export function pendingGameCount(): number {
  return read().length;
}

/**
 * Try to upload everything waiting. Each is dropped from the queue only once the server
 * has taken it, so a failure part-way leaves the rest for next time. Never throws — the
 * callers are effects that must not care.
 */
export async function flushPendingGames(): Promise<{ saved: number; remaining: number }> {
  const list = read();
  if (list.length === 0) return { saved: 0, remaining: 0 };
  let saved = 0;
  for (const game of list) {
    try {
      await recordGame(game);
      saved += 1;
    } catch {
      break; // still logged out, or the service is down — keep this one and the rest
    }
  }
  const remaining = list.slice(saved);
  write(remaining);
  return { saved, remaining: remaining.length };
}
