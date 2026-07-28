import { useState } from 'react';
import { Chronobot } from '../engine';
import RulesBox from './RulesBox';

const HERO = '/assets/solo/chronobot-hero.jpg';

const FLAVOR =
  'The Chronobot was sent back from a devastated alternate future with the ' +
  'objective of finding and eliminating the cause of a war that destroyed ' +
  'everything. Though created with the best intentions, it has identified ' +
  'humanity as the real problem—the root of the destruction to come. ' +
  'Misinterpreting its original task, the Chronobot is now determined to take ' +
  'over the leadership of all humankind, even if it has to destroy the Paths, ' +
  'or the Capital itself, to achieve its goal.';

interface DifficultyOption {
  flag: string;
  label: string;
  detail: string;
}

const DIFFICULTY_OPTIONS: DifficultyOption[] = [
  {
    flag: Chronobot.DIFFICULTY_REBOOT_ADVANCE,
    label: 'Advance off Reboot immediately',
    detail:
      'Immediately advance the token when it moves onto the Reboot Action. This ' +
      'will ensure that it will perform an Action on every turn.',
  },
  {
    flag: Chronobot.DIFFICULTY_NO_LEADER,
    label: 'Play without your Leader power',
    detail: 'Play without using your Leader power.',
  },
  {
    flag: Chronobot.DIFFICULTY_BOT_EXTRA_TURN,
    label: 'One extra Chronobot turn after you pass',
    detail: 'The Chronobot takes one additional turn after you have passed.',
  },
  {
    flag: Chronobot.DIFFICULTY_MIN_ACTIONS_6,
    label: 'Raise minimum Actions to 6',
    detail: "Increase the minimum number of Chronobot's Actions from 3 to 6.",
  },
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
  const [step, setStep] = useState<'flavor' | 'difficulty' | 'setup'>('flavor');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (flag: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(flag)) next.delete(flag);
      else next.add(flag);
      return next;
    });

  const eyebrow =
    step === 'flavor' ? 'New Game' : step === 'difficulty' ? 'Difficulty' : 'Setup';
  const title =
    step === 'flavor'
      ? 'The Chronobot'
      : step === 'difficulty'
        ? 'Increasing the Difficulty'
        : 'Setup Instructions';

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
          <span className="phase-eyebrow">{eyebrow}</span>
          <h1 className="phase-title">{title}</h1>
        </div>
      </header>

      <div className="phase-content">
        <div
          className="phase-hero"
          style={{ backgroundImage: `url(${HERO})` }}
          role="img"
          aria-label="Chronobot"
        />
        <div className="phase-body">
          {step === 'flavor' && (
            <>
              <p className="setup-flavor">{FLAVOR}</p>
              <button className="phase-primary" onClick={() => setStep('difficulty')}>
                Continue ▶
              </button>
            </>
          )}

          {step === 'difficulty' && (
            <>
              <p className="phase-note">
                Select one or more of these options to increase the difficulty of the
                solo game against the Chronobot. You can also play with none for the
                standard game.
              </p>
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
                      <b>{o.label}</b>
                      <span>{o.detail}</span>
                    </span>
                  </label>
                ))}
              </div>
              <div className="setup-actions">
                <button className="phase-secondary" onClick={() => setStep('flavor')}>
                  ◀ Back
                </button>
                <button className="phase-primary" onClick={() => setStep('setup')}>
                  Continue ▶
                </button>
              </div>
            </>
          )}

          {step === 'setup' && (
            <>
              <RulesBox label="Setup — rulebook text" defaultOpen={false}>
                <p>
                  Set up a 2-player game, with the Chronobot as one of the players. Use
                  the Chronobot side of the Solo board. In addition to using the
                  Chronobot’s side of the Solo board, the following changes need to be
                  made during setup:
                </p>
                <p>
                  • The Chronobot receives its 6 Exosuits and 8 Warp tiles; it does not
                  receive any Starting Assets or Workers.
                  <br />• Leave all Endgame Condition cards in the box.
                  <br />• Place the Chronobot board next to the Main board, and place the
                  4 Command tokens on the 4 marked positions. The Chronobot does not use a
                  Focus marker.
                  <br />• Place the Chronobot’s Banner on the First Player spot; it is the
                  First Player in the 1st Era. You receive 1 additional Water (for being
                  the second player).
                  <br />• You may still choose to use either the “A” or the “B” side of
                  your Player board.
                  <br />• For a more challenging game, use the variant rule described in
                  the base game rulebook: cover the right World Council space with a Hex
                  Unavailable tile.
                </p>
              </RulesBox>

              <div className="setup-modified">
                <h3>Setup for this app</h3>
                <p>
                  Set up a 2-player game, with the Chronobot as one of the players.
                  There’s no need for the Chronobot board.
                </p>
                <ul>
                  <li>
                    The Chronobot receives its 6 Exosuits and 8 Warp tiles; it does not
                    receive any Starting Assets or Workers.
                  </li>
                  <li>Leave all Endgame Condition cards in the box.</li>
                  <li>The Chronobot does not use a Focus marker.</li>
                  <li>
                    Place the Chronobot’s Banner on the First Player spot; it is the First
                    Player in the 1st Era. You receive 1 additional Water (for being the
                    second player).
                  </li>
                  <li>You may still choose to use either the “A” or the “B” side of your Player board.</li>
                  <li>
                    For a more challenging game, use the variant rule described in the base
                    game rulebook: cover the right World Council space with a Hex
                    Unavailable tile.
                  </li>
                </ul>
                <p className="phase-note">
                  This app tracks <b>all</b> of the Chronobot’s VP for you and explains
                  each Action’s rules as it takes them. Building VP is counted as tiles
                  are discarded, rather than placed on the bot’s board.
                </p>
              </div>

              <div className="setup-actions">
                <button className="phase-secondary" onClick={() => setStep('difficulty')}>
                  ◀ Back
                </button>
                <button
                  className="phase-primary"
                  onClick={() => onBegin([...selected])}
                >
                  Begin Era 1 ▶
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
