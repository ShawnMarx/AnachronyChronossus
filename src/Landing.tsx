import { useState } from 'react';
import './Landing.css';
import { peekSavedChronobot, clearSavedChronobot } from './BoardExplorer';
import { peekSavedChronossus, clearSavedChronossus } from './ChronossusGame';
import { useAuth } from './auth/useAuth';
import HistoryScreen from './history/HistoryScreen';
import AdminStats from './history/AdminStats';
import T from './i18n/Trans';
import { useT } from './i18n/I18nProvider';

/** Official Mindclash Games product page for Anachrony. */
const STORE_URL = 'https://mindclashgames.com/our-games/anachrony/';

function formatSavedAt(ms: number, fallback: string): string {
  try {
    return new Date(ms).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return fallback;
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
}

/**
 * Where "Part of BoardGameEdge" points, per environment — the same hostname sniff
 * `bgeAuth.ts` uses for the auth service.
 *
 * Prod was deliberately switched off at first: the landing service listed Anachrony but was
 * only served at `staging.boardgameedge.com`, while the apex was still a "Launching Soon"
 * placeholder, and sending players from a finished app to that was worse than not linking.
 * The apex now serves the real landing service (confirmed 2026-08-22), so the link is live
 * everywhere and this is a plain per-environment URL again.
 */
const BGE_LANDING_URL: string = (() => {
  const h = window.location.hostname;
  if (h === 'localhost' || h.startsWith('127.')) return 'https://staging.boardgameedge.com';
  if (h.includes('staging')) return 'https://staging.boardgameedge.com';
  return 'https://boardgameedge.com';
})();

function BotCard({ name, image, tagline, description, status, onLaunch }: BotCardProps) {
  const ready = status === 'ready';
  const t = useT();
  return (
    <button
      className={`bot-card ${ready ? 'ready' : 'soon'}`}
      onClick={ready ? onLaunch : undefined}
      disabled={!ready}
      aria-label={
        ready ? t('ui.landing.playAgainst', { name }) : t('ui.landing.soonAria', { name })
      }
    >
      <div className="bot-card-art">
        <img src={image} alt={t('ui.landing.artworkAlt', { name })} />
        {!ready && <span className="soon-badge">{t('ui.landing.comingSoon')}</span>}
      </div>
      <div className="bot-card-body">
        <h2>{name}</h2>
        <p className="bot-tagline">{tagline}</p>
        <p className="bot-desc">{description}</p>
        {ready && <span className="bot-cta">{t('ui.landing.play')} ▶</span>}
      </div>
    </button>
  );
}

/**
 * Top-right optional-login control on the home screen. The name is the way in to the
 * player's own play history (and its BG Stats export/import) — until now that lived only
 * in the ⚙ menu of a game in progress, so between games there was no way to reach it.
 *
 * Overall stats is here for the same reason: the in-game ⚙ menu carried it (both bots
 * share `SettingsMenu`), so between games there was nowhere to read it from.
 */
function LandingAuth() {
  const { user, loading, login, logout } = useAuth();
  const t = useT();
  const [showHistory, setShowHistory] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
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
            title={t('ui.landing.auth.historyTitle')}
          >
            👤 {user.username}
          </button>
          {user.isAdmin && (
            <button
              className="landing-auth-who"
              onClick={() => setShowAdmin(true)}
              title={t('ui.landing.auth.overallTitle')}
            >
              📊 {t('ui.landing.auth.overall')}
            </button>
          )}
          <button className="landing-auth-btn" onClick={logout}>
            {t('ui.landing.auth.signOut')}
          </button>
          {showHistory && <HistoryScreen onClose={() => setShowHistory(false)} />}
          {showAdmin && <AdminStats onClose={() => setShowAdmin(false)} />}
        </>
      ) : (
        <button className="landing-auth-btn primary" onClick={login}>
          {t('ui.landing.auth.logIn')}
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
  const t = useT();
  const savedFallback = t('ui.landing.savedAtUnknown');
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
          <h1>{t('ui.landing.title')}</h1>
          <p className="landing-sub">{t('ui.landing.subtitle')}</p>
        </div>
      </header>

      <p className="landing-intro">
        <T k="ui.landing.intro" links={{ store: STORE_URL }} />
      </p>

      <div className="bot-grid">
        <BotCard
          name="Chronobot"
          image="/assets/solo/chronobot-hero.jpg"
          tagline={t('ui.landing.chronobot.tagline')}
          status="ready"
          description={t('ui.landing.chronobot.description')}
          onLaunch={() => launch('chronobot')}
        />
        <BotCard
          name="Chronossus"
          image="/assets/solo/chronossus-hero.jpg"
          tagline={t('ui.landing.chronossus.tagline')}
          status="ready"
          description={t('ui.landing.chronossus.description')}
          onLaunch={() => launch('chronossus')}
        />
      </div>

      <p className="landing-foot landing-bge">
        <T k="ui.landing.partOfBge" links={{ bge: BGE_LANDING_URL }} />
      </p>

      <p className="landing-foot">{t('ui.landing.disclaimer')}</p>

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
                <h3>{t('ui.landing.resume.continueTitle', { bot: botName(prompt.bot) })}</h3>
                <p>
                  <T
                    k="ui.landing.resume.continueBody"
                    params={{ when: formatSavedAt(prompt.savedAt, savedFallback) }}
                  />
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
                    {t('ui.landing.resume.continueBtn')}
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
                    {t('ui.landing.resume.newBtn')}
                  </button>
                </div>
                <button className="resume-cancel" onClick={() => setPrompt(null)}>
                  {t('ui.landing.resume.cancel')}
                </button>
              </>
            ) : (
              <>
                <h3>{t('ui.landing.resume.otherTitle', { bot: botName(prompt.bot) })}</h3>
                <p>
                  <T
                    k="ui.landing.resume.otherBody"
                    params={{
                      other: botName(prompt.otherBot),
                      when: formatSavedAt(prompt.savedAt, savedFallback),
                      bot: botName(prompt.bot),
                    }}
                  />
                </p>
                <div className="resume-actions">
                  <button
                    className="resume-continue"
                    onClick={() => {
                      setPrompt(null);
                      startFor(prompt.otherBot);
                    }}
                  >
                    {t('ui.landing.resume.resumeOther', { other: botName(prompt.otherBot) })}
                  </button>
                  <button
                    className="resume-new"
                    onClick={() => {
                      clearFor(prompt.otherBot);
                      setPrompt(null);
                      startFor(prompt.bot);
                    }}
                  >
                    {t('ui.landing.resume.discardStart', { bot: botName(prompt.bot) })}
                  </button>
                </div>
                <button className="resume-cancel" onClick={() => setPrompt(null)}>
                  {t('ui.landing.resume.cancel')}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
