import { useState } from 'react';
import './Landing.css';
import { peekSavedChronobot, clearSavedChronobot } from './BoardExplorer';
import { peekSavedChronossus, clearSavedChronossus } from './ChronossusGame';
import { useAuth } from './auth/useAuth';
import HistoryScreen from './history/HistoryScreen';

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
  /** Optional build-completeness bar shown at the bottom of the card (0–100). */
  progress?: number;
}

function BotCard({ name, image, tagline, description, status, onLaunch, progress }: BotCardProps) {
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
        {progress != null && (
          <div
            className="upload-bar"
            role="img"
            aria-label={`Uploading: ${progress} percent`}
          >
            <div className="upload-bar-label">Uploading…</div>
            <div className="upload-bar-track">
              <div className="upload-bar-fill" style={{ width: `${progress}%` }} />
            </div>
            <div className="upload-bar-pct">{progress}%</div>
          </div>
        )}
      </div>
    </button>
  );
}

/**
 * Top-right optional-login control on the home screen. The name is the way in to the
 * player's own play history (and its BG Stats export/import) — until now that lived only
 * in the ⚙ menu of a game in progress, so between games there was no way to reach it.
 */
function LandingAuth() {
  const { user, loading, login, logout } = useAuth();
  const [showHistory, setShowHistory] = useState(false);
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
          <button
            className="landing-auth-who"
            onClick={() => setShowHistory(true)}
            title="Your play history, and BG Stats export / import"
          >
            👤 {user.username}
          </button>
          <button className="landing-auth-btn" onClick={logout}>
            Sign out
          </button>
          {showHistory && <HistoryScreen onClose={() => setShowHistory(false)} />}
        </>
      ) : (
        <button className="landing-auth-btn primary" onClick={login}>
          Log in
        </button>
      )}
    </div>
  );
}

type BotId = 'chronobot' | 'chronossus';

export default function Landing({
  onStartChronobot,
  onStartChronossus,
}: {
  onStartChronobot: () => void;
  onStartChronossus: () => void;
}) {
  // Launching prompts continue-vs-new when the clicked bot has a saved game, or a
  // discard-the-other warning when the OTHER opponent has the active game (only
  // one may run at a time).
  const [prompt, setPrompt] = useState<
    | { bot: BotId; kind: 'own'; savedAt: number }
    | { bot: BotId; kind: 'other'; otherBot: BotId; savedAt: number }
    | null
  >(null);
  const otherOf = (b: BotId): BotId => (b === 'chronobot' ? 'chronossus' : 'chronobot');
  const botName = (b: BotId) => (b === 'chronobot' ? 'Chronobot' : 'Chronossus');
  const peekFor = (b: BotId) => (b === 'chronobot' ? peekSavedChronobot() : peekSavedChronossus());
  const clearFor = (b: BotId) =>
    b === 'chronobot' ? clearSavedChronobot() : clearSavedChronossus();
  const startFor = (b: BotId) => (b === 'chronobot' ? onStartChronobot() : onStartChronossus());

  const launch = (bot: BotId) => {
    const own = peekFor(bot);
    if (own) {
      setPrompt({ bot, kind: 'own', savedAt: own.savedAt });
      return;
    }
    const otherB = otherOf(bot);
    const otherSaved = peekFor(otherB);
    if (otherSaved) {
      setPrompt({ bot, kind: 'other', otherBot: otherB, savedAt: otherSaved.savedAt });
      return;
    }
    clearFor(otherB); // defensive: keep only one opponent active
    startFor(bot);
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
          description="Supports the base game, with optional difficulty adjustments. A streamlined opponent driven by a handful of Command tokens and the AI die."
          onLaunch={() => launch('chronobot')}
        />
        <BotCard
          name="Chronossus"
          image="/assets/solo/chronossus-hero.jpg"
          tagline="The advanced automa · more modes, more depth"
          status="ready"
          description="A deeper opponent supporting the base game, Hypersync Future Actions, Fractures of Time, Guardians of the Council, and Pioneers of New Earth, with more modes on the way. The app tracks its Energy Pool, modular Action tiles, and scoring, and explains each Action as it resolves."
          onLaunch={() => launch('chronossus')}
          progress={80}
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
            {prompt.kind === 'own' ? (
              <>
                <h3>Continue your {botName(prompt.bot)} game?</h3>
                <p>
                  You have a game in progress, last played on{' '}
                  <b>{formatSavedAt(prompt.savedAt)}</b>.
                </p>
                <div className="resume-actions">
                  <button
                    className="resume-continue"
                    onClick={() => {
                      clearFor(otherOf(prompt.bot));
                      setPrompt(null);
                      startFor(prompt.bot);
                    }}
                  >
                    Continue game
                  </button>
                  <button
                    className="resume-new"
                    onClick={() => {
                      clearFor(prompt.bot);
                      clearFor(otherOf(prompt.bot));
                      setPrompt(null);
                      startFor(prompt.bot);
                    }}
                  >
                    Start a new game
                  </button>
                </div>
                <button className="resume-cancel" onClick={() => setPrompt(null)}>
                  Cancel
                </button>
              </>
            ) : (
              <>
                <h3>Start a {botName(prompt.bot)} game?</h3>
                <p>
                  You have a saved <b>{botName(prompt.otherBot)}</b> game (last played{' '}
                  <b>{formatSavedAt(prompt.savedAt)}</b>). Only one opponent can be active at a
                  time — starting the {botName(prompt.bot)} will discard it.
                </p>
                <div className="resume-actions">
                  <button
                    className="resume-continue"
                    onClick={() => {
                      setPrompt(null);
                      startFor(prompt.otherBot);
                    }}
                  >
                    Resume {botName(prompt.otherBot)}
                  </button>
                  <button
                    className="resume-new"
                    onClick={() => {
                      clearFor(prompt.otherBot);
                      setPrompt(null);
                      startFor(prompt.bot);
                    }}
                  >
                    Discard &amp; start {botName(prompt.bot)}
                  </button>
                </div>
                <button className="resume-cancel" onClick={() => setPrompt(null)}>
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
