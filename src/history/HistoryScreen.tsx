// HistoryScreen.tsx — the logged-in player's personal game history.
//
// A modal opened from the ⚙ menu: lists past games (newest-first), deletes one,
// and does BG Stats export/import. Talks to the shared BGE data service via
// src/data/gameData. Distinct from the ⚙ "History" turn-log (that's the current
// game's per-turn change list in localStorage).

import { useEffect, useRef, useState } from 'react';
import './HistoryScreen.css';
import {
  deleteGame,
  exportUrl,
  importGames,
  listMyGames,
  type GameRow,
  type ImportResult,
} from '../data/gameData';

export default function HistoryScreen({ onClose }: { onClose: () => void }) {
  const [rows, setRows] = useState<GameRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setError(null);
    listMyGames()
      .then(setRows)
      .catch(() => setError('Could not load your history. Are you still signed in?'));
  };

  useEffect(load, []);

  const onDelete = async (id: number) => {
    try {
      await deleteGame(id);
      setRows((rs) => (rs ? rs.filter((r) => r.id !== id) : rs));
    } catch {
      setError('Delete failed — try again.');
    }
  };

  const onImportFile = async (file: File) => {
    setImportMsg(null);
    setError(null);
    let data: unknown;
    try {
      data = JSON.parse(await file.text());
    } catch {
      setError('That file is not valid JSON (expected a BG Stats export).');
      return;
    }
    try {
      const dry: ImportResult = await importGames(data, true);
      if (dry.parsed === 0) {
        setError('No plays found in that file.');
        return;
      }
      const done = await importGames(data, false);
      setImportMsg(`Imported ${done.imported} game${done.imported === 1 ? '' : 's'}.`);
      load();
    } catch {
      setError('Import failed — try again.');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="history-screen" onClick={(e) => e.stopPropagation()}>
        <div className="history-head">
          <h2>Your game history</h2>
          <button className="dp-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="history-actions">
          <a className="history-btn" href={exportUrl()} target="_blank" rel="noreferrer">
            ⬇ Export to BG Stats
          </a>
          <button className="history-btn" onClick={() => fileRef.current?.click()}>
            ⬆ Import from BG Stats
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImportFile(f);
              e.target.value = '';
            }}
          />
        </div>

        {importMsg && <p className="history-ok">{importMsg}</p>}
        {error && <p className="history-err">{error}</p>}

        {rows == null && !error ? (
          <p className="history-empty">Loading…</p>
        ) : rows && rows.length === 0 ? (
          <p className="history-empty">
            No games yet. Finish a game and choose <b>Save to my history</b> on the score screen.
          </p>
        ) : (
          <table className="history-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Result</th>
                <th>You</th>
                <th>Bot</th>
                <th>Era</th>
                <th>Difficulty</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows?.map((r) => (
                <tr key={r.id}>
                  <td>{r.played_at}</td>
                  <td className={r.won ? 'win' : 'lose'}>{r.won ? 'Win' : 'Loss'}</td>
                  <td>{r.player_score ?? '—'}</td>
                  <td>{r.bot_score}</td>
                  <td>{r.era_reached ?? '—'}</td>
                  <td>
                    {r.difficulty ?? '—'}
                    {r.source === 'import' && <span className="history-tag">imported</span>}
                  </td>
                  <td>
                    <button
                      className="history-del"
                      onClick={() => onDelete(r.id)}
                      title="Delete this game"
                    >
                      🗑
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
