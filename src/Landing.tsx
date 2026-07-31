import { useState } from 'react';
import './Landing.css';
import { peekSavedChronobot, clearSavedChronobot } from './BoardExplorer';
import { useAuth } from './auth/useAuth';
import { isLocalRun } from './auth/bgeAuth';

/** Official Mindclash Games product page for Anachrony. */
const STORE_URL = 'https://mindclashgames.com/our-games/anachrony/';

function formatSavedAt(ms: number): string {
  try {
    return new Date(ms).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return 'an earlier session';
  }
}

interface BotCardProps {
  name: string;
  image: string;
  tagline: string;
  description: string;
  status: 'ready' | 'soon';
  onLaunch?: () => void;
}

function BotCard({ name, image, tagline, description, status, onLaunch }: BotCardProps) {
  const ready = status === 'ready';
  return (
    <button
      className={`bot-card ${ready ? 'ready' : 'soon'}`}
      onClick={ready ? onLaunch : undefined}
      disabled={!ready}
      aria-label={ready ? `Play against the ${name}` : `${name} — coming soon`}
    >
      <div className="bot-card-art">
        <img src={image} alt={`${name} artwork`} />
        {!ready && <span className="soon-badge">Coming Soon</span>}
      </div>
      <div className="bot-card-body">
        <h2>{name}</h2>
        <p className="bot-tagline">{tagline}</p>
        <p className="bot-desc">{description}</p>
        {ready && <span className="bot-cta">Play ▶</span>}
      </div>
    </button>
  );
}

/** Top-right optional-login control on the home screen. */
function LandingAuth() {
  const { user, loading, login, logout } = useAuth();
  if (loading) {
    return (
      <div className="landing-auth" aria-hidden>
        <span className="landing-auth-loading">👤 …</span>
      </div>
    );
  }
  return (
    <div className="landing-auth">
      {user ? (
        <>
          <span className="landing-auth-who">👤 {user.username}</span>
          <button className="landing-auth-btn" onClick={logout}>
            Sign out
          </button>
        </>
      ) : (
        <button className="landing-auth-btn primary" onClick={login}>
          Log in
        </button>
      )}
    </div>
  );
}

export default function Landing({
  onStartChronobot,
  onStartChronossus,
}: {
  onStartChronobot: () => void;
  onStartChronossus: () => void;
}) {
  // When a saved Chronobot game exists, launching prompts continue-vs-new.
  const [prompt, setPrompt] = useState<{ savedAt: number } | null>(null);
  const { user } = useAuth();

  // Chronossus is admin-gated during development: visible to admins and any local
  // run (dev), "Coming Soon" for everyone else.
  const chronossusUnlocked = isLocalRun() || Boolean(user?.isAdmin);

  const launchChronobot = () => {
    const saved = peekSavedChronobot();
    if (saved) setPrompt(saved);
    else onStartChronobot();
  };

  return (
    <div className="landing">
      <LandingAuth />
      <header className="landing-header">
        <img className="landing-logo" src="/favicon-512.png" alt="" />
        <div>
          <h1>Anachrony Solo Assistant</h1>
          <p className="landing-sub">Play against the game's automated Solo opponents</p>
        </div>
      </header>

      <p className="landing-intro">
        An unofficial companion app for running the Solo opponents in{' '}
        <a href={STORE_URL} target="_blank" rel="noreferrer">
          <b>Anachrony</b>
        </a>
        , published by Mindclash Games. It runs the opponent's turns, rolls its dice,
        and tells you where to move its pieces — and teaches you how to play against it
        along the way. You'll need the physical game to play, and you should already know
        (or be willing to learn) the base game on your own.
      </p>

      <div className="bot-grid">
        <BotCard
          name="Chronobot"
          image="/assets/solo/chronobot-hero.jpg"
          tagline="The base-game automa · easiest place to start"
          status="ready"
          description="Supports the base game, with optional difficulty adjustments. A streamlined opponent driven by a handful of Command tokens and the AI die — the best place to begin solo play."
          onLaunch={launchChronobot}
        />
        <BotCard
          name="Chronossus"
          image="/assets/solo/chronossus-hero.jpg"
          tagline={
            chronossusUnlocked
              ? 'The advanced automa · admin preview'
              : 'The advanced automa · more modes, more depth'
          }
          status={chronossusUnlocked ? 'ready' : 'soon'}
          description={
            chronossusUnlocked
              ? 'Admin preview: boots into the Phase-5 Action Rounds debug harness. Tap each action space to see the Chronossus resolve it. Work in progress.'
              : "A deeper opponent that supports most of the game's modes and expansions. Not available yet — it's next on the roadmap once the Chronobot is complete."
          }
          onLaunch={chronossusUnlocked ? onStartChronossus : undefined}
        />
      </div>

      <p className="landing-foot">
        Unofficial fan-made aid. Anachrony and its artwork are © Mindclash Games. This
        app requires owning the physical game.
      </p>

      {prompt && (
        <div className="resume-overlay" onClick={() => setPrompt(null)}>
          <div
            className="resume-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h3>Continue your Chronobot game?</h3>
            <p>
              You have a game in progress, last played on{' '}
              <b>{formatSavedAt(prompt.savedAt)}</b>.
            </p>
            <div className="resume-actions">
              <button
                className="resume-continue"
                onClick={() => {
                  setPrompt(null);
                  onStartChronobot();
                }}
              >
                Continue game
              </button>
              <button
                className="resume-new"
                onClick={() => {
                  clearSavedChronobot();
                  setPrompt(null);
                  onStartChronobot();
                }}
              >
                Start a new game
              </button>
            </div>
            <button className="resume-cancel" onClick={() => setPrompt(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
