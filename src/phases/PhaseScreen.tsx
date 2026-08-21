import { useState } from 'react';

const CHRONOBOT_HERO = '/assets/solo/chronobot-hero.jpg';

/**
 * The reusable frame for every non-Action phase (Phases 1–4 & 6, plus Start /
 * Setup). Shows the bot splash banner, the rulebook overview, and the phase's
 * body/controls (`children`); a **Phase | Board** toggle flips to the full board as
 * read-only bot status (`statusView`, provided by the caller). Phase 5 renders the board
 * directly and does not use this frame.
 *
 * The toggle is a direct child of the header bar rather than part of `headerRight`: on a
 * phone the bar is a two-row grid and the toggle holds the top right of row one, while the
 * pills wrap below it.
 *
 * `hero`/`statusLabel`/`heroAlt` default to the Chronobot so existing callers are
 * unchanged; the Chronossus flow passes its own.
 */
export default function PhaseScreen({
  era,
  phaseNumber,
  phaseName,
  overview,
  onHome,
  headerRight,
  statusView,
  hero = CHRONOBOT_HERO,
  statusLabel = 'Chronobot Status',
  heroAlt = 'Chronobot',
  children,
}: {
  era: number;
  phaseNumber: number;
  phaseName: string;
  overview?: string;
  onHome?: () => void;
  /** Optional node (e.g. a VP pill) shown at the right of the header. */
  headerRight?: React.ReactNode;
  /** The full board, rendered read-only under the bot-status tab. */
  statusView?: React.ReactNode;
  /** Splash-banner image (defaults to the Chronobot hero). */
  hero?: string;
  /** Accessible name for the board tab — the tab itself reads "Board". */
  statusLabel?: string;
  /** Alt/aria text for the hero banner (defaults to "Chronobot"). */
  heroAlt?: string;
  children: React.ReactNode;
}) {
  const [tab, setTab] = useState<'phase' | 'status'>('phase');

  return (
    <div className="phase-screen">
      <header className="phase-bar">
        <div className="phase-bar-left">
          {onHome && (
            <button
              className="home-btn"
              onClick={onHome}
              title="Back to the home screen"
              aria-label="Back to the home screen"
            >
              <img src="/favicon-512.png" alt="" />
            </button>
          )}
          <span className="phase-eyebrow">
            Era {era} · Phase {phaseNumber}
          </span>
          <h1 className="phase-title">{phaseName}</h1>
        </div>
        <div className="phase-bar-right">{headerRight}</div>
        {/* A direct child of the bar, not part of `phase-bar-right`: on a phone the bar
            becomes a two-row grid and this stays pinned to the top right of row one, while
            the pills wrap to row two. Inside the right-hand group it was wrapping down with
            them, into a row that already had too much in it. */}
        {statusView && (
          <div className="phase-tabs" role="tablist">
            <button
              role="tab"
              aria-selected={tab === 'phase'}
              className={tab === 'phase' ? 'on' : ''}
              onClick={() => setTab('phase')}
            >
              Phase
            </button>
            <button
              role="tab"
              aria-selected={tab === 'status'}
              className={tab === 'status' ? 'on' : ''}
              onClick={() => setTab('status')}
              // The tab reads "Board", but which bot's board it is still matters to a
              // screen reader — that is what `statusLabel` carries now.
              title={statusLabel}
              aria-label={statusLabel}
            >
              Board
            </button>
          </div>
        )}
      </header>

      {tab === 'status' && statusView ? (
        <div className="phase-status">{statusView}</div>
      ) : (
        <div className="phase-content">
          <div
            className="phase-hero"
            style={{ backgroundImage: `url(${hero})` }}
            role="img"
            aria-label={heroAlt}
          />
          <div className="phase-body">
            {overview && <p className="phase-overview">{overview}</p>}
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
