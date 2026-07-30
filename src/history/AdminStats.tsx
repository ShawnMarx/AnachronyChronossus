// AdminStats.tsx — admin-only aggregate stats across all players.
//
// Modal opened from the ⚙ menu, shown only when the logged-in user is an admin.
// Reads GET /api/anachrony/admin/stats (the server enforces admin; a non-admin
// gets 403 and we show a message).

import { useEffect, useState } from 'react';
import './HistoryScreen.css';
import { adminStats, type AdminStats as Stats } from '../data/gameData';

export default function AdminStats({ onClose }: { onClose: () => void }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminStats()
      .then(setStats)
      .catch(() => setError('Could not load stats (admin only).'));
  }, []);

  const pct = (n: number) => `${Math.round(n * 100)}%`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="history-screen" onClick={(e) => e.stopPropagation()}>
        <div className="history-head">
          <h2>Overall stats</h2>
          <button className="dp-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {error && <p className="history-err">{error}</p>}
        {!stats && !error && <p className="history-empty">Loading…</p>}

        {stats && (
          <>
            <div className="stats-cards">
              <div className="stats-card">
                <span className="stats-num">{stats.games}</span>
                <span className="stats-lbl">Games</span>
              </div>
              <div className="stats-card">
                <span className="stats-num">{pct(stats.win_rate)}</span>
                <span className="stats-lbl">Player win rate</span>
              </div>
              <div className="stats-card">
                <span className="stats-num">{stats.wins}</span>
                <span className="stats-lbl">Player wins</span>
              </div>
              <div className="stats-card">
                <span className="stats-num">{stats.distinct_users}</span>
                <span className="stats-lbl">Players</span>
              </div>
            </div>

            <h3 className="stats-sub">By difficulty</h3>
            {Object.keys(stats.by_difficulty).length === 0 ? (
              <p className="history-empty">No games recorded yet.</p>
            ) : (
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Difficulty</th>
                    <th>Games</th>
                    <th>Wins</th>
                    <th>Win rate</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(stats.by_difficulty).map(([diff, d]) => (
                    <tr key={diff}>
                      <td>{diff}</td>
                      <td>{d.games}</td>
                      <td>{d.wins}</td>
                      <td>{d.games ? pct(d.wins / d.games) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </div>
  );
}
