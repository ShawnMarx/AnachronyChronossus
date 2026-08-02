// TurnTracker — the shared top-bar "Turn N" pill. On hover (or tap) it opens a
// popover listing the bot's turns for the current Era's Action Rounds, plus an
// optional `extra` block (e.g. the Chronossus Exo + Energy readout).
//
// Both solo-bot views use it: the two bots reach end-of-phase differently
// (min-Actions vs. out-of-Exosuits), so a neutral turn count reads the same for
// both. Turn N = the count of committed bot-turn entries this Era.

import { useEffect, useRef, useState } from 'react';
import AnchoredPopover from './AnchoredPopover';
import type { HistoryEntry } from '../game/undo';

export default function TurnTracker({
  turnNumber,
  entries,
  extra,
  title = 'Bot turns this Era',
}: {
  /** Turns the bot has taken this Era (the pill shows "Turn {turnNumber}"). */
  turnNumber: number;
  /** This-Era bot-turn entries, oldest → newest. */
  entries: HistoryEntry[];
  /** Optional stats block folded into the hover panel (Exo / Energy, etc.). */
  extra?: React.ReactNode;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const show = () => {
    if (ref.current) setRect(ref.current.getBoundingClientRect());
    setOpen(true);
  };
  const hide = () => setOpen(false);

  // Dismiss on Escape or an outside click (covers tap-to-open on touch).
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest('.turn-tracker-wrap') && !t.closest('.turn-popover')) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div
      className="vp-pill-wrap turn-tracker-wrap"
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      <button
        ref={ref}
        type="button"
        className={`stat-pill turn-pill ${open ? 'open' : ''}`}
        onClick={() => (open ? hide() : show())}
        title={title}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        Turn <b>{turnNumber}</b>
      </button>
      {open && (
        <AnchoredPopover rect={rect} className="vp-popover turn-popover">
          <div className="vp-popover-title">{title}</div>
          {entries.length === 0 ? (
            <p className="turn-empty">No turns taken yet this Era.</p>
          ) : (
            <ol className="turn-list">
              {entries.map((e, i) => (
                <li key={i} className="turn-row">
                  <span className="turn-n">
                    {e.die != null && <span className="bot-die turn-die">{e.die}</span>}
                    Turn {i + 1}
                  </span>
                  <span className="turn-label">{e.label}</span>
                </li>
              ))}
            </ol>
          )}
          {extra && <div className="turn-extra">{extra}</div>}
        </AnchoredPopover>
      )}
    </div>
  );
}
