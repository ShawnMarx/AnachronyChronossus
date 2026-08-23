import { useState } from 'react';
import { Chronobot } from '../engine';
import RulesBox from './RulesBox';
import { useT } from '../i18n/I18nProvider';
import T from '../i18n/Trans';
import { useRule } from '../i18n/localized';
import {
  CHRONOBOT_SETUP_RULE_BULLETS,
  CHRONOBOT_SETUP_RULE_INTRO,
} from '../engine/rules/chronobotActions';

const HERO = '/assets/solo/chronobot-hero.jpg';

/** Difficulty options, as flag + the key stem its label/detail live under. */
const DIFFICULTY_OPTIONS: { flag: string; key: string }[] = [
  { flag: Chronobot.DIFFICULTY_REBOOT_ADVANCE, key: 'rebootAdvance' },
  { flag: Chronobot.DIFFICULTY_NO_LEADER, key: 'noLeader' },
  { flag: Chronobot.DIFFICULTY_BOT_EXTRA_TURN, key: 'botExtraTurn' },
  { flag: Chronobot.DIFFICULTY_MIN_ACTIONS_6, key: 'minActions6' },
  { flag: Chronobot.DIFFICULTY_HEX_UNAVAILABLE, key: 'hexUnavailable' },
];

/**
 * The pre-game flow: Start (flavor) → Difficulty selection → Setup instructions.
 * On finish, `onBegin` receives the chosen difficulty flags and the game enters
 * Era 1, Phase 1 (Preparation).
 */
export default function SetupFlow({
  onHome,
  onBegin,
}: {
  onHome?: () => void;
  onBegin: (difficulty: string[]) => void;
}) {
  const t = useT();
  const setupIntro = useRule('rule.chronobotSetup.intro', CHRONOBOT_SETUP_RULE_INTRO);
  const setupBullets = useRule('rule.chronobotSetup.bullets', CHRONOBOT_SETUP_RULE_BULLETS);
  const [step, setStep] = useState<'flavor' | 'difficulty' | 'setup'>('flavor');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (flag: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(flag)) next.delete(flag);
      else next.add(flag);
      return next;
    });

  const eyebrow = t(
    step === 'flavor'
      ? 'ui.setup.eyebrow.new'
      : step === 'difficulty'
        ? 'ui.setup.eyebrow.difficulty'
        : 'ui.setup.eyebrow.setup',
  );
  const title = t(
    step === 'flavor'
      ? 'ui.setup.title.flavor'
      : step === 'difficulty'
        ? 'ui.setup.title.difficulty'
        : 'ui.setup.title.setup',
  );

  return (
    <div className="phase-screen">
      <header className="phase-bar">
        <div className="phase-bar-left">
          {onHome && (
            <button
              className="home-btn"
              onClick={onHome}
              title={t('ui.setup.home')}
              aria-label={t('ui.setup.home')}
            >
              <img src="/favicon-512.png" alt="" />
            </button>
          )}
          <span className="phase-eyebrow">{eyebrow}</span>
          <h1 className="phase-title">{title}</h1>
        </div>
      </header>

      <div className="phase-content">
        <div
          className="phase-hero"
          style={{ backgroundImage: `url(${HERO})` }}
          role="img"
          aria-label={t('ui.setup.heroAlt')}
        />
        <div className="phase-body">
          {step === 'flavor' && (
            <>
              <div className="setup-actions setup-actions-top">
                <button className="phase-primary" onClick={() => setStep('difficulty')}>
                  {t('ui.setup.continue')} ▶
                </button>
              </div>
              <p className="setup-flavor">{t('ui.setup.flavor')}</p>
            </>
          )}

          {step === 'difficulty' && (
            <>
              <div className="setup-actions setup-actions-top">
                <button className="phase-secondary" onClick={() => setStep('flavor')}>
                  ◀ {t('ui.setup.back')}
                </button>
                <button className="phase-primary" onClick={() => setStep('setup')}>
                  {t('ui.setup.continue')} ▶
                </button>
              </div>
              <p className="phase-note">{t('ui.setup.difficultyNote')}</p>
              <div className="difficulty-list">
                {DIFFICULTY_OPTIONS.map((o) => (
                  <label
                    key={o.flag}
                    className={`difficulty-opt ${selected.has(o.flag) ? 'on' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(o.flag)}
                      onChange={() => toggle(o.flag)}
                    />
                    <span className="difficulty-opt-text">
                      <b>{t(`ui.setup.diff.${o.key}.label`)}</b>
                      <span>{t(`ui.setup.diff.${o.key}.detail`)}</span>
                    </span>
                  </label>
                ))}
              </div>
            </>
          )}

          {step === 'setup' && (
            <>
              <div className="setup-actions setup-actions-top">
                <button className="phase-secondary" onClick={() => setStep('difficulty')}>
                  ◀ {t('ui.setup.back')}
                </button>
                <button className="phase-primary" onClick={() => onBegin([...selected])}>
                  {t('ui.setup.beginEra1')} ▶
                </button>
              </div>
              <div className="setup-modified">
                <h3>{t('ui.setup.app.title')}</h3>
                <p>{t('ui.setup.app.intro')}</p>
                <ul>
                  {t('ui.setup.app.bullets')
                    .split('\n')
                    .map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                </ul>
                <p className="phase-note">
                  <T k="ui.setup.app.vpNote" />
                </p>
              </div>

              {/* Verbatim rulebook setup last, under the app's own instructions —
                  reference material sits below what the player has to act on. */}
              <RulesBox label={t('ui.setup.rulesBoxLabel')} showPreamble>
                <p>{setupIntro}</p>
                <p>
                  {setupBullets.split('\n').map((line, i) => (
                    <span key={i}>
                      {i > 0 && <br />}
                      {line}
                    </span>
                  ))}
                </p>
              </RulesBox>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
