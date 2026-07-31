import { useEffect, useRef, useState } from 'react';
import { GAMEBRAIN_URL, RULES_FRAME_URL } from './gamebrain';
import './RulesFrame.css';

/** A single PDF/url resource GameBrain reports via `gb:resources`. */
interface Resource {
  name: string;
  type: 'pdf' | 'url';
  file?: string;
  url?: string;
}
type ResourceGroups = Record<string, Resource[]>;

/** Which frame view is active — drives the segmented toolbar highlight. */
type FrameView = 'chat' | 'rules' | 'split';

/**
 * The in-app rules reference: a full-viewport overlay whose body is a single
 * persistent GameBrain `<iframe>`. When `open`, a collapsed top bar shows the
 * **Chat · Resources · Split** segmented control (relayed to the frame via the
 * embed postMessage API) plus **◀ Back to Game · ⚙ Settings · 🏠 Landing** (the
 * `settings` node and `onHome` come from the caller).
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

  const frameRef = useRef<HTMLIFrameElement>(null);
  // The URL opens on the rules (PDF) tab, so that's the initial active view.
  const [view, setView] = useState<FrameView>('rules');
  const [resources, setResources] = useState<ResourceGroups>({});
  const [resMenuOpen, setResMenuOpen] = useState(false);
  const hasResources = Object.keys(resources).length > 0;

  const post = (msg: Record<string, unknown>) =>
    frameRef.current?.contentWindow?.postMessage(msg, GAMEBRAIN_URL);

  // Listen for the frame's messages (only from our iframe's window).
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frameRef.current?.contentWindow) return;
      const d = e.data;
      if (d?.type === 'gb:resources' && d.resources) {
        setResources(d.resources as ResourceGroups);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // Esc returns to the game (matches the ◀ Back to Game control).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onBack]);

  // Close the Resources dropdown on any outside click / Escape while open.
  useEffect(() => {
    if (!resMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.rules-resources')) setResMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setResMenuOpen(false);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [resMenuOpen]);

  const showChat = () => {
    post({ type: 'gb:enableTabbed', tab: 'chat' });
    setView('chat');
    setResMenuOpen(false);
  };
  const showRules = () => {
    post({ type: 'gb:enableTabbed', tab: 'rules' });
    setView('rules');
  };
  const showSplit = () => {
    post({ type: 'gb:disableTabbed' });
    setView('split');
    setResMenuOpen(false);
  };
  const onResourcesClick = () => {
    showRules();
    if (hasResources) setResMenuOpen((v) => !v);
  };
  const openResource = (item: Resource) => {
    setResMenuOpen(false);
    if (item.type === 'url' && item.url) {
      window.open(item.url, '_blank', 'noopener');
      return;
    }
    post({ type: 'gb:enableTabbed', tab: 'rules' });
    post({ type: 'gb:openResource', name: item.name });
    setView('rules');
  };

  // Nothing in the DOM until the first open, so the frame stays unrequested.
  if (!everOpened.current) return null;

  return (
    <div className="rules-frame" style={{ display: open ? 'flex' : 'none' }}>
      <header className="rules-frame-bar">
        <button className="rules-back" onClick={onBack} title="Return to the game">
          ◀ Back to Game
        </button>

        {/* Chat · Resources · Split — relayed to the frame via postMessage. */}
        <div className="rules-seg" role="group" aria-label="Rules view">
          <button
            className={view === 'chat' ? 'on' : ''}
            onClick={showChat}
            aria-pressed={view === 'chat'}
          >
            Chat
          </button>
          <div className="rules-resources">
            <button
              className={view === 'rules' ? 'on' : ''}
              onClick={onResourcesClick}
              aria-pressed={view === 'rules'}
              aria-haspopup={hasResources ? 'menu' : undefined}
              aria-expanded={hasResources ? resMenuOpen : undefined}
            >
              Resources{hasResources ? ' ▾' : ''}
            </button>
            {resMenuOpen && hasResources && (
              <div className="rules-res-menu" role="menu">
                {Object.entries(resources).map(([group, items]) => (
                  <div key={group} className="rules-res-group">
                    <div className="rules-res-group-label">{group}</div>
                    {items.map((item) => (
                      <button
                        key={item.name}
                        className="rules-res-item"
                        role="menuitem"
                        onClick={() => openResource(item)}
                      >
                        {item.type === 'url' ? '🔗 ' : '📄 '}
                        {item.name}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            className={view === 'split' ? 'on' : ''}
            onClick={showSplit}
            aria-pressed={view === 'split'}
            title="Side-by-side chat + rules"
          >
            Split
          </button>
        </div>

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
          ref={frameRef}
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
      📖 <span className="rules-open-label">Rules</span>
    </button>
  );
}
