// HistoryPane — right-docked pane listing the committed turns newest-first.
//
// Shared by both solo-bot views. Reads only the bot-agnostic History fields
// (label / die / effects), so the same pane renders Chronobot and Chronossus turns.

import type { HistoryEntry } from '../game/undo';
import HistoryText from './HistoryText';

export default function HistoryPane({
  entries,
  onClose,
}: {
  entries: HistoryEntry[];
  onClose: () => void;
}) {
  const rows = [...entries].reverse(); // newest first
  return (
    <div className="history-pane">
      <div className="history-head">
        <h3>History</h3>
        <button className="history-close" onClick={onClose} aria-label="Close history">
          ×
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="history-empty">No turns taken yet.</p>
      ) : (
        <ol className="history-list">
          {rows.map((e, i) => (
            <li key={entries.length - i} className="history-row">
              <span className="history-num">{entries.length - i}</span>
              <span className="history-main">
                <span className="history-label">
                  {e.die != null && (
                    <span className="bot-die history-die" aria-label={`AI die ${e.die}`}>
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
