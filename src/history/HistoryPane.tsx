// HistoryPane — right-docked pane listing the committed turns newest-first.
//
// Shared by both solo-bot views. Reads only the bot-agnostic History fields
// (label / die / effects), so the same pane renders Chronobot and Chronossus turns.

import type { HistoryEntry } from '../game/undo';
import { isSupersededPhaseEntry, labelKey } from '../game/historyLabels';
import HistoryText from './HistoryText';
import { useT } from '../i18n/I18nProvider';

export default function HistoryPane({
  entries,
  onClose,
}: {
  entries: HistoryEntry[];
  onClose: () => void;
}) {
  const t = useT();
  const rows = entries
    .filter((e, i) => !isSupersededPhaseEntry(e, entries[i + 1]))
    .reverse(); // newest first
  return (
    <div className="history-pane">
      <div className="history-head">
        <h3>{t('ui.history.title')}</h3>
        <button className="history-close" onClick={onClose} aria-label={t('ui.history.close')}>
          ×
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="history-empty">{t('ui.history.empty')}</p>
      ) : (
        <ol className="history-list">
          {/* Numbered over the ROWS shown, not the raw stack — a filtered-out arrow
              entry would otherwise leave a gap that reads as a missing turn. */}
          {rows.map((e, i) => (
            // The label is a descriptor now, so it cannot go in a template — it would
            // render every row's key as "[object Object]". Its KEY identifies it.
            <li key={`${rows.length - i}-${labelKey(e) ?? String(e.label)}`} className="history-row">
              <span className="history-num">{rows.length - i}</span>
              <span className="history-main">
                <span className="history-label">
                  {e.die != null && (
                    <span className="bot-die history-die" aria-label={t('ui.history.dieAria', { n: e.die })}>
                      {e.die}
                    </span>
                  )}
                  <HistoryText text={e.label} />
                </span>
                {e.effects.length > 0 && (
                  <ul className="history-effects">
                    {e.effects.map((eff, j) => (
                      <li key={j}><HistoryText text={eff} /></li>
                    ))}
                  </ul>
                )}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/**
 * The same pane, docked over a phase screen.
 *
 * The pane itself is a flex child of the Action Rounds board stage, so before this it was
 * reachable only from that one screen — during Preparation / Paradox / Power Up / Warp /
 * Clean Up there was nowhere showing it, which made a phase's own entries (an Era Zero Warp
 * placement, a Paradox roll) look unlogged when they had in fact been recorded. The wrapper
 * gives it somewhere to sit on those screens; the pane is unchanged.
 */
export function PhaseHistoryDock({
  entries,
  onClose,
}: {
  entries: HistoryEntry[];
  onClose: () => void;
}) {
  return (
    <div className="phase-history-dock">
      <HistoryPane entries={entries} onClose={onClose} />
    </div>
  );
}
