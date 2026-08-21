// HistoryPane — right-docked pane listing the committed turns newest-first.
//
// Shared by both solo-bot views. Reads only the bot-agnostic History fields
// (label / die / effects), so the same pane renders Chronobot and Chronossus turns.

import type { HistoryEntry } from '../game/undo';
import HistoryText from './HistoryText';

/**
 * Entering a phase commits "Era 1 · → Warp", and the phase's own result then commits
 * "Era 1 · Warp: placed 1" — so Power Up and Warp each showed twice, once with nothing on
 * it. The bare arrow row is dropped when the very next entry reports what that same phase
 * did; a phase where nothing happened keeps its arrow row, since that is its only trace.
 *
 * This is display only: both entries stay on the undo stack, so every phase move is still
 * a separate ↶ Undo step.
 */
export function isSupersededPhaseEntry(entry: HistoryEntry, next: HistoryEntry | undefined): boolean {
  if (entry.effects.length > 0 || entry.die != null) return false;
  const arrow = /^(Era \d+) · → (.+)$/.exec(entry.label);
  if (!arrow || !next) return false;
  return next.label.startsWith(`${arrow[1]} · ${arrow[2]}:`);
}

export default function HistoryPane({
  entries,
  onClose,
}: {
  entries: HistoryEntry[];
  onClose: () => void;
}) {
  const rows = entries
    .filter((e, i) => !isSupersededPhaseEntry(e, entries[i + 1]))
    .reverse(); // newest first
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
          {/* Numbered over the ROWS shown, not the raw stack — a filtered-out arrow
              entry would otherwise leave a gap that reads as a missing turn. */}
          {rows.map((e, i) => (
            <li key={`${rows.length - i}-${e.label}`} className="history-row">
              <span className="history-num">{rows.length - i}</span>
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
