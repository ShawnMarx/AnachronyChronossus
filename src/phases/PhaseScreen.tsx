import { useState } from 'react';

const HERO = '/assets/solo/chronobot-hero.jpg';

/**
 * The reusable frame for every non-Action phase (Phases 1–4 & 6, plus Start /
 * Setup). Shows the Chronobot splash banner, the rulebook overview, and the
 * phase's body/controls (`children`); a tab flips to the full board as read-only
 * "Chronobot Status" (`statusView`, provided by the caller). Phase 5 renders the
 * board directly and does not use this frame.
 */
export default function PhaseScreen({
  era,
  phaseNumber,
  phaseName,
  overview,
  onHome,
  headerRight,
  statusView,
  children,
}: {
  era: number;
  phaseNumber: number;
  phaseName: string;
  overview?: string;
  onHome?: () => void;
  /** Optional node (e.g. a VP pill) shown at the right of the header. */
  headerRight?: React.ReactNode;
  /** The full board, rendered read-only under the "Chronobot Status" tab. */
  statusView?: React.ReactNode;
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
        <div className="phase-bar-right">
          {headerRight}
          {statusView && (
            <div className="phase-tabs" role="tablist">
              <button
                role="tab"
                aria-selected={tab === 'phase'}
                className={tab === 'phase' ? 'on' : ''}
                onClick={() => setTab('phase')}
              >
                This Phase
              </button>
              <button
                role="tab"
                aria-selected={tab === 'status'}
                className={tab === 'status' ? 'on' : ''}
                onClick={() => setTab('status')}
              >
                Chronobot Status
              </button>
            </div>
          )}
        </div>
      </header>

      {tab === 'status' && statusView ? (
        <div className="phase-status">{statusView}</div>
      ) : (
        <div className="phase-content">
          <div
            className="phase-hero"
            style={{ backgroundImage: `url(${HERO})` }}
            role="img"
            aria-label="Chronobot"
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
