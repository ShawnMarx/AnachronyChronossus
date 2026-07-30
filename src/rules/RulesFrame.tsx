import { useEffect, useRef, useState } from 'react';
import { RULES_FRAME_URL } from './gamebrain';
import './RulesFrame.css';

/**
 * The in-app rules reference: a full-viewport overlay whose body is a single
 * persistent GameBrain `<iframe>`. When `open`, a collapsed top bar shows only
 * **◀ Back to Game · ⚙ Settings · 🏠 Landing** (the `settings` node and `onHome`
 * come from the caller so the same ⚙ menu is reused).
 *
 * The iframe is created lazily on first open and then kept mounted forever — the
 * overlay is only hidden via CSS (`display:none`) when closed, never unmounted —
 * so GameBrain's PDF scroll position and session state survive Back-to-Game
 * round-trips. The game view beneath likewise stays mounted, so returning
 * restores the exact prior phase and scroll.
 */
export default function RulesFrame({
  open,
  onBack,
  onHome,
  settings,
}: {
  open: boolean;
  onBack: () => void;
  onHome?: () => void;
  /** The shared ⚙ settings menu, rendered in the collapsed bar. */
  settings?: React.ReactNode;
}) {
  // Lazy: don't load GameBrain until the player first opens the rules.
  const [loaded, setLoaded] = useState(false);
  const everOpened = useRef(false);
  if (open && !everOpened.current) {
    everOpened.current = true;
    if (!loaded) setLoaded(true);
  }

  // Esc returns to the game (matches the ◀ Back to Game control).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onBack]);

  // Nothing in the DOM until the first open, so the frame stays unrequested.
  if (!everOpened.current) return null;

  return (
    <div className="rules-frame" style={{ display: open ? 'flex' : 'none' }}>
      <header className="rules-frame-bar">
        <button className="rules-back" onClick={onBack} title="Return to the game">
          ◀ Back to Game
        </button>
        <span className="rules-frame-title">📖 Rules Reference</span>
        <div className="rules-frame-controls">
          {settings}
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
        </div>
      </header>
      {loaded && (
        <iframe
          id="gamebrain-frame"
          className="rules-frame-iframe"
          title="Anachrony rules reference"
          src={RULES_FRAME_URL}
        />
      )}
    </div>
  );
}

/** The 📖 entry button that opens the rules frame. Placed in the game top bar. */
export function RulesButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="rules-open-btn"
      onClick={onClick}
      title="Open the rules reference"
      aria-label="Open the rules reference"
    >
      📖 Rules
    </button>
  );
}
