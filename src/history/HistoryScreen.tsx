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
  importGames,
  listMyGames,
  type GameRow,
  type ImportResult,
} from '../data/gameData';
import { bgStatsFilename, buildBgStatsExport } from '../data/bgStats';
import { useAuth } from '../auth/useAuth';
import { useT } from '../i18n/I18nProvider';
import T from '../i18n/Trans';

export default function HistoryScreen({ onClose }: { onClose: () => void }) {
  const t = useT();
  const { user } = useAuth();
  const [rows, setRows] = useState<GameRow[] | null>(null);
  /** Ticked games. EMPTY means "no selection", which exports everything — so the button
   *  works without anyone having to tick 40 boxes to get what they used to get. */
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setError(null);
    listMyGames()
      .then(setRows)
      .catch(() => setError(t('ui.gameHistory.err.load')));
  };

  useEffect(load, []);

  const togglePick = (id: number) =>
    setPicked((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  /**
   * Export the ticked games, or all of them when nothing is ticked.
   *
   * Built here rather than fetched from the data service: the service exports everything
   * (no selection) and labelled every play "Solo - Chronobot", so a Chronossus game
   * imported as a Chronobot one. See `data/bgStats.ts`.
   */
  const onExport = () => {
    if (!rows || rows.length === 0) return;
    const chosen = picked.size > 0 ? rows.filter((r) => picked.has(r.id)) : rows;
    const file = buildBgStatsExport(chosen, user?.username ?? 'Me');
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = bgStatsFilename(new Date().toISOString().slice(0, 10));
    a.click();
    URL.revokeObjectURL(url);
  };

  const onDelete = async (id: number) => {
    try {
      await deleteGame(id);
      setRows((rs) => (rs ? rs.filter((r) => r.id !== id) : rs));
      setPicked((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
    } catch {
      setError(t('ui.gameHistory.err.delete'));
    }
  };

  const onImportFile = async (file: File) => {
    setImportMsg(null);
    setError(null);
    let data: unknown;
    try {
      data = JSON.parse(await file.text());
    } catch {
      setError(t('ui.gameHistory.err.notJson'));
      return;
    }
    try {
      const dry: ImportResult = await importGames(data, true);
      if (dry.parsed === 0) {
        setError(t('ui.gameHistory.err.noPlays'));
        return;
      }
      const done = await importGames(data, false);
      setImportMsg(t(done.imported === 1 ? 'ui.gameHistory.importedN' : 'ui.gameHistory.importedNPlural', { n: done.imported }));
      load();
    } catch {
      setError(t('ui.gameHistory.err.import'));
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="history-screen" onClick={(e) => e.stopPropagation()}>
        <div className="history-head">
          <h2>{t('ui.gameHistory.title')}</h2>
          <button className="dp-close" onClick={onClose} aria-label={t('ui.gameHistory.close')}>
            ×
          </button>
        </div>

        <div className="history-actions">
          <button className="history-btn" onClick={onExport} disabled={!rows?.length}>
            ⬇{' '}
            {t('ui.gameHistory.export', {
              what:
                picked.size > 0
                  ? t('ui.gameHistory.exportSelected', { n: picked.size })
                  : t('ui.gameHistory.exportAll'),
            })}
          </button>
          <button className="history-btn" onClick={() => fileRef.current?.click()}>
            ⬆ {t('ui.gameHistory.import')}
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
          <p className="history-empty">{t('ui.gameHistory.loading')}</p>
        ) : rows && rows.length === 0 ? (
          <p className="history-empty">
            <T k="ui.gameHistory.none" />
          </p>
        ) : (
          <table className="history-table">
            <thead>
              <tr>
                <th className="history-pick">
                  <input
                    type="checkbox"
                    aria-label={t('ui.gameHistory.selectAll')}
                    checked={!!rows && picked.size === rows.length && rows.length > 0}
                    ref={(el) => {
                      // Some ticked, but not all — show the indeterminate dash.
                      if (el) el.indeterminate = picked.size > 0 && picked.size < (rows?.length ?? 0);
                    }}
                    onChange={(e) =>
                      setPicked(e.target.checked ? new Set(rows?.map((r) => r.id)) : new Set())
                    }
                  />
                </th>
                <th>{t('ui.gameHistory.date')}</th>
                <th>{t('ui.gameHistory.result')}</th>
                <th>{t('ui.gameHistory.you')}</th>
                <th>{t('ui.gameHistory.bot')}</th>
                <th>{t('ui.gameHistory.era')}</th>
                <th>{t('ui.gameHistory.difficulty')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows?.map((r) => (
                <tr key={r.id} className={picked.has(r.id) ? 'picked' : ''}>
                  <td className="history-pick">
                    <input
                      type="checkbox"
                      aria-label={t('ui.gameHistory.selectOne', { date: r.played_at })}
                      checked={picked.has(r.id)}
                      onChange={() => togglePick(r.id)}
                    />
                  </td>
                  <td>{r.played_at}</td>
                  <td className={r.won ? 'win' : 'lose'}>{r.won ? t('ui.gameHistory.win') : t('ui.gameHistory.loss')}</td>
                  <td>{r.player_score ?? '—'}</td>
                  <td>{r.bot_score}</td>
                  <td>{r.era_reached ?? '—'}</td>
                  <td>
                    {r.difficulty ?? '—'}
                    {r.source === 'import' && <span className="history-tag">{t('ui.gameHistory.imported')}</span>}
                  </td>
                  <td>
                    <button
                      className="history-del"
                      onClick={() => onDelete(r.id)}
                      title={t('ui.gameHistory.delete')}
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
