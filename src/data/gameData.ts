// gameData.ts — client for the shared BGE game-data service (stats + history).
//
// All calls are credentialed (the bge_session cookie rides same-site to
// data.boardgameedge.com). Everything is optional: it's only used when the
// player is logged in. Endpoints live under /api/anachrony (APP_SLUG).

/** Data-service base URL, detected from hostname (mirrors bgeAuth's AUTH_BASE). */
export const DATA_BASE = (() => {
  const h = window.location.hostname;
  if (h === 'localhost' || h.startsWith('127.')) return 'http://localhost:8012';
  if (h.includes('staging')) return 'https://data.staging.boardgameedge.com';
  return 'https://data.boardgameedge.com';
})();

const API = `${DATA_BASE}/api/anachrony`;

export interface GameSummary {
  played_at?: string | null; // YYYY-MM-DD; server defaults to today
  won: boolean;
  bot_score: number;
  player_score: number | null;
  difficulty: string | null;
  era_reached: number | null;
  payload?: Record<string, unknown> | null;
}

export interface GameRow extends GameSummary {
  id: number;
  app_slug: string;
  user_id: number;
  played_at: string;
  source: 'app' | 'import';
  created_at: string | null;
}

export interface AdminStats {
  app_slug: string;
  games: number;
  wins: number;
  win_rate: number;
  distinct_users: number;
  by_difficulty: Record<string, { games: number; wins: number }>;
}

export interface ImportResult {
  dry_run: boolean;
  parsed: number;
  imported: number;
}

async function jsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

/** POST a finished game. Returns the created row. */
export async function recordGame(summary: GameSummary): Promise<GameRow> {
  const res = await fetch(`${API}/games`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(summary),
  });
  return jsonOrThrow<GameRow>(res);
}

/** This user's games, newest-first. */
export async function listMyGames(): Promise<GameRow[]> {
  const res = await fetch(`${API}/me/games`, { credentials: 'include' });
  return jsonOrThrow<GameRow[]>(res);
}

/** Delete one of the user's own games. */
export async function deleteGame(id: number): Promise<void> {
  const res = await fetch(`${API}/me/games/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
}

/** Admin-only aggregate stats. Throws (403) for non-admins. */
export async function adminStats(): Promise<AdminStats> {
  const res = await fetch(`${API}/admin/stats`, { credentials: 'include' });
  return jsonOrThrow<AdminStats>(res);
}

/** URL of the BG Stats export (credentialed download; open as a navigation). */
export function exportUrl(): string {
  return `${API}/me/games/bgstats`;
}

/** Upload a parsed BG Stats file; dryRun parses without writing. */
export async function importGames(
  data: unknown,
  dryRun: boolean,
): Promise<ImportResult> {
  const res = await fetch(`${API}/me/import?dry_run=${dryRun}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return jsonOrThrow<ImportResult>(res);
}
