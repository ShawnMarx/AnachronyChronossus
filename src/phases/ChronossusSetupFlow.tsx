import { useState } from 'react';
import RulesBox from './RulesBox';
import { CHRONOSSUS_TILES } from '../board/chronossusTiles';
import { getMode } from '../board/chronossusModes';

const HERO = '/assets/solo/chronossus-hero.jpg';
const TILE_ART = (code: string) => `/assets/solo/chronossus/tiles/${code}.png`;

/** The "Flip Action tiles to their B side" difficulty flag (shared with the view). */
export const DIFFICULTY_TILES_B_SIDE = 'chronossus-tiles-b-side';
/** Hypersync-only: take the oldest pending tile's space instead of a random roll. */
export const DIFFICULTY_HYPERSYNC_TARGETED = 'chronossus-hypersync-targeted';

/** Extra difficulty options that only apply to specific modules. */
const MODE_DIFFICULTY: Record<string, DifficultyOption[]> = {
  hypersync: [
    {
      flag: DIFFICULTY_HYPERSYNC_TARGETED,
      label: 'Hypersync: take your oldest tile’s space (no random roll)',
      detail:
        'Instead of randomly selecting a Hypersync Action space, the Chronossus takes the ' +
        'one corresponding to your pending Hypersync tile furthest in the past.',
    },
  ],
};

// Step 1 — intro flavor (verbatim, Solo Opponents rulebook p. 7).
const FLAVOR =
  'When the Path of Unity appeared in our present, altering the course of ' +
  'history, their audacity caused a massive dissonance in the Space-Time ' +
  'Continuum that could not remain unanswered by the cosmos.\n\n' +
  'From the deepest, darkest recesses of the universe, an ancient and ruthless ' +
  'menace emerged. The Chronossus, the Destroyer of Worlds, has awakened with ' +
  'only one purpose: to eliminate the dissonance and consume all broken ' +
  'timelines, including ours.';

/** Step 2 — the single-select module configurations (only Base is available). */
interface ModuleConfig {
  id: string;
  label: string;
  available: boolean;
}
const MODULE_CONFIGS: ModuleConfig[] = [
  { id: 'base', label: 'Base', available: true },
  { id: 'fractures', label: 'Fractures of Time', available: false },
  { id: 'doomsday', label: 'Doomsday', available: false },
  { id: 'pioneers', label: 'Pioneers of New Earth', available: false },
  { id: 'guardians', label: 'Guardians of the Council', available: false },
  { id: 'hypersync', label: 'Hypersync Future Actions', available: true },
  { id: 'fractures+pioneers', label: 'Fractures of Time + Pioneers of New Earth', available: false },
  { id: 'fractures+hypersync', label: 'Fractures of Time + Hypersync Future Actions', available: false },
  { id: 'guardians+hypersync', label: 'Guardians of the Council + Hypersync Future Actions', available: false },
  { id: 'guardians+pioneers', label: 'Guardians of the Council + Pioneers of New Earth', available: false },
];

/** Step 2 — the optional add-on modules (multi-select; none available yet). */
const EXTRA_MODULES: { id: string; label: string }[] = [
  { id: 'variable-anomalies', label: 'Variable Anomalies' },
  { id: 'quantum-loops', label: 'Quantum Loops' },
  { id: 'alternate-timelines', label: 'Alternate Timelines' },
];

/** Difficulty flag for the "cover the right World Council space" option (shared
 *  with the Chronobot); drives the setup wording on the last step. */
const DIFFICULTY_WORLD_COUNCIL = 'chronossus-hex-unavailable';

interface DifficultyOption {
  flag: string;
  label: string;
  detail: string;
}
// Step 3 — the base-game Chronossus difficulty options (Solo Opponents p. 10),
// plus the Chronobot's World Council variant as the last item. Stubbed + disabled
// for now (visible, not selectable) — behavior lands later.
const DIFFICULTY_OPTIONS: DifficultyOption[] = [
  {
    flag: DIFFICULTY_TILES_B_SIDE,
    label: 'Flip Action tiles to their B side',
    detail: 'Flip some or all of the Action tiles to their B side (pick which below).',
  },
  {
    flag: 'chronossus-swap-tiles',
    label: 'Swap Action tiles between spaces',
    detail: 'Swap the Action tiles between the two marked spaces.',
  },
  {
    flag: 'chronossus-extra-energy',
    label: 'Extra starting Energy Cores',
    detail:
      'Increase the number of Energy Cores by 1/2/3 in the Energy Pool at the ' +
      'beginning of the game.',
  },
  {
    flag: 'chronossus-extra-powerup',
    label: 'One extra powered Exosuit each Era',
    detail:
      'The Chronossus powers up one additional Exosuit each Era for free. If this ' +
      'would exceed its maximum number of Exosuits, it gains 2 VPs instead for each ' +
      'excess Energy Core drawn (those Energy Cores are still removed from the game).',
  },
  {
    flag: 'chronossus-leftover-energy-vp',
    label: 'Leftover Energy Cores score VP',
    detail:
      'Each leftover (non-exhausted) Energy Core in the Energy Pool at the end of ' +
      'the game is worth 1 VP to the Chronossus.',
  },
  {
    flag: 'chronossus-fewer-objectives',
    label: 'Fewer (or no) Solo Objectives',
    detail: 'Play with fewer (or no) Solo Objectives.',
  },
  {
    flag: 'chronossus-failed-action-vp',
    label: 'Failed Actions score VP',
    detail: 'The Chronossus gains 2 VPs for each Failed Action.',
  },
  {
    flag: 'chronossus-research-new-shape',
    label: 'Research takes a new Breakthrough shape',
    detail:
      'When taking a Research Action, the Chronossus takes a Breakthrough shape it ' +
      'does not already possess.',
  },
  {
    flag: DIFFICULTY_WORLD_COUNCIL,
    label: 'Cover the right World Council space',
    detail:
      'For a more challenging game, cover the right World Council space with a Hex ' +
      'Unavailable tile.',
  },
];

/**
 * The Chronossus pre-game flow: Intro → Modules → Difficulty → Setup. On finish,
 * `onBegin` receives the chosen difficulty flags and the game enters Era 1,
 * Phase 1 (Preparation). Modules/difficulty are stubbed for now (only Base is
 * available; difficulty options are disabled) — the screens exist so the future
 * modes have a home.
 */
/** What the setup flow hands back when the player begins the game. */
export interface ChronossusSetupResult {
  difficulty: string[];
  /** Selected module id (from CHRONOSSUS_MODES). */
  mode: string;
  /** Per-tile A/B side selection (only families flipped to B appear). */
  tileSides: Record<string, 'A' | 'B'>;
}

export default function ChronossusSetupFlow({
  onHome,
  onBegin,
}: {
  onHome?: () => void;
  onBegin: (result: ChronossusSetupResult) => void;
}) {
  type Step = 'intro' | 'modules' | 'difficulty' | 'setup';
  const [step, setStep] = useState<Step>('intro');
  const [moduleId, setModuleId] = useState<string>('base');
  const [extras, setExtras] = useState<Set<string>>(new Set());
  const [difficulty, setDifficulty] = useState<Set<string>>(new Set());
  // Per-tile side selection; only families set to 'B' are stored.
  const [tileSides, setTileSides] = useState<Record<string, 'B'>>({});

  const blockWorldCouncil = difficulty.has(DIFFICULTY_WORLD_COUNCIL);
  const flipTiles = difficulty.has(DIFFICULTY_TILES_B_SIDE);
  const modeSlots = getMode(moduleId).slots;

  const toggleTileSide = (family: string) =>
    setTileSides((s) => {
      const next = { ...s };
      if (next[family]) delete next[family];
      else next[family] = 'B';
      return next;
    });

  // Only honour B-side flips when the difficulty option is on.
  const effectiveTileSides = (): Record<string, 'A' | 'B'> => (flipTiles ? { ...tileSides } : {});
  const begin = () =>
    onBegin({ difficulty: [...difficulty], mode: moduleId, tileSides: effectiveTileSides() });

  const eyebrow =
    step === 'intro'
      ? 'New Game'
      : step === 'modules'
        ? 'Modules'
        : step === 'difficulty'
          ? 'Difficulty'
          : 'Setup';
  const title =
    step === 'intro'
      ? 'The Chronossus'
      : step === 'modules'
        ? 'Select a Module'
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
          aria-label="Chronossus"
        />
        <div className="phase-body">
          {/* ---- Step 1: Intro ------------------------------------------- */}
          {step === 'intro' && (
            <>
              <div className="setup-actions setup-actions-top">
                <button className="phase-primary" onClick={() => setStep('modules')}>
                  Continue ▶
                </button>
              </div>
              {FLAVOR.split('\n\n').map((para, i) => (
                <p key={i} className="setup-flavor">
                  {para}
                </p>
              ))}
            </>
          )}

          {/* ---- Step 2: Modules ----------------------------------------- */}
          {step === 'modules' && (
            <>
              <div className="setup-actions setup-actions-top">
                <button className="phase-secondary" onClick={() => setStep('intro')}>
                  ◀ Back
                </button>
                <button className="phase-primary" onClick={() => setStep('difficulty')}>
                  Continue ▶
                </button>
              </div>
              <p className="phase-note">
                Choose the module to play. <b>Base</b> and <b>Hypersync Future Actions</b>{' '}
                are available; the others are listed for the modes we’ll be filling in.
              </p>
              <div className="difficulty-list">
                {MODULE_CONFIGS.map((m) => (
                  <label
                    key={m.id}
                    className={`difficulty-opt ${moduleId === m.id ? 'on' : ''} ${
                      m.available ? '' : 'disabled'
                    }`}
                  >
                    <input
                      type="radio"
                      name="cx-module"
                      checked={moduleId === m.id}
                      disabled={!m.available}
                      onChange={() => setModuleId(m.id)}
                    />
                    <span className="difficulty-opt-text">
                      <b>{m.label}</b>
                      {!m.available && <span>Coming soon</span>}
                    </span>
                  </label>
                ))}
              </div>

              <p className="phase-note">
                In addition, any number of these modules may be added (none, some, or
                all). Not available yet — listed for future modes.
              </p>
              <div className="difficulty-list">
                {EXTRA_MODULES.map((m) => (
                  <label key={m.id} className="difficulty-opt disabled">
                    <input
                      type="checkbox"
                      checked={extras.has(m.id)}
                      disabled
                      onChange={() =>
                        setExtras((s) => {
                          const next = new Set(s);
                          if (next.has(m.id)) next.delete(m.id);
                          else next.add(m.id);
                          return next;
                        })
                      }
                    />
                    <span className="difficulty-opt-text">
                      <b>{m.label}</b>
                      <span>Coming soon</span>
                    </span>
                  </label>
                ))}
              </div>

              <p className="phase-note">
                The Interlocking buildings and Neutronide buildings are supported and
                require no additional components or adjustments to the rules.
              </p>
            </>
          )}

          {/* ---- Step 3: Difficulty (stubbed, disabled) ------------------ */}
          {step === 'difficulty' && (
            <>
              <div className="setup-actions setup-actions-top">
                <button className="phase-secondary" onClick={() => setStep('modules')}>
                  ◀ Back
                </button>
                <button className="phase-primary" onClick={() => setStep('setup')}>
                  Continue ▶
                </button>
              </div>
              <p className="phase-note">
                Select one or more options to increase the difficulty against the
                Chronossus, or play with none for the standard game. Most options are
                stubbed for now; <b>Flip Action tiles to their B side</b> is active.
              </p>
              <div className="difficulty-list">
                {[...DIFFICULTY_OPTIONS, ...(MODE_DIFFICULTY[moduleId] ?? [])].map((o) => {
                  const isFlip = o.flag === DIFFICULTY_TILES_B_SIDE;
                  // Active (selectable) options: the tile flip + any mode-specific ones.
                  const enabled = isFlip || o.flag === DIFFICULTY_HYPERSYNC_TARGETED;
                  const on = difficulty.has(o.flag);
                  return (
                    <div key={o.flag}>
                      <label className={`difficulty-opt ${enabled ? '' : 'disabled'} ${on ? 'on' : ''}`}>
                        <input
                          type="checkbox"
                          checked={on}
                          disabled={!enabled}
                          onChange={() =>
                            setDifficulty((s) => {
                              const next = new Set(s);
                              if (next.has(o.flag)) next.delete(o.flag);
                              else next.add(o.flag);
                              return next;
                            })
                          }
                        />
                        <span className="difficulty-opt-text">
                          <b>{o.label}</b>
                          <span>{o.detail}</span>
                        </span>
                      </label>

                      {/* Per-tile A/B flip picker — revealed when the option is on. */}
                      {isFlip && on && (
                        <div className="tile-flip-list">
                          {modeSlots.map((slot) => {
                            const side = tileSides[slot.family] ? 'B' : 'A';
                            const code = `${slot.family}${side}`;
                            const tile = CHRONOSSUS_TILES[code];
                            return (
                              <div
                                key={slot.family}
                                className={`tile-flip-card ${side === 'B' ? 'flipped' : ''}`}
                              >
                                <img
                                  className="tile-flip-art"
                                  src={TILE_ART(code)}
                                  alt={`${tile?.name ?? code} (${code})`}
                                />
                                <div className="tile-flip-text">
                                  <div className="tile-flip-head">
                                    <b>
                                      Slot {slot.slot} · {code} — {tile?.name}
                                    </b>
                                    <button
                                      type="button"
                                      className={`tile-flip-toggle ${side === 'B' ? 'on' : ''}`}
                                      onClick={() => toggleTileSide(slot.family)}
                                      aria-pressed={side === 'B'}
                                    >
                                      {side === 'B' ? 'B side ▸ flip to A' : 'A side ▸ flip to B'}
                                    </button>
                                  </div>
                                  <p>{tile?.rule}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ---- Step 4: Setup ------------------------------------------- */}
          {step === 'setup' && (
            <>
              <div className="setup-actions setup-actions-top">
                <button className="phase-secondary" onClick={() => setStep('difficulty')}>
                  ◀ Back
                </button>
                <button className="phase-primary" onClick={begin}>
                  Begin Era 1 ▶
                </button>
              </div>
              <RulesBox label="Setup — rulebook text" showPreamble>
                <p>
                  Set up a 2-player game with the Chronossus as one of the players. In
                  addition to using the Chronossus’s side of the Solo board, the
                  following changes need to be made during set-up:
                </p>
                <p>
                  • The Chronossus receives its 6 Exosuits and 8 Warp tiles. It does not
                  receive any Starting Assets or Workers.
                  <br />• Leave all Endgame Condition cards in the box and shuffle all
                  Solo Objective cards, revealing 3. Return the rest to the box.
                  <br />• Place the Chronossus board next to the Main board, and place the
                  4 Command tokens on the 4 marked positions. The Chronossus does not use
                  a Focus marker.
                  <br />• Place the Action tiles (marked side up) on the empty spaces of
                  the Chronossus board: C01A, C02A, C03A. (Suggested for your first game;
                  later you may assign them randomly.)
                  <br />• Fill the Chronossus’s Energy Pool container with 5 Energy Core
                  tokens and 5 Exhausted Energy Core tokens.
                  <br />• Place the Chronossus’s Banner on the First Player spot; it is
                  the First Player in the 1st Era. You receive 1 additional Water (for
                  being the second player).
                  <br />• You may still choose to use either the “A” or the “B” side of
                  your Player board.
                  <br />• For a more challenging game, cover the right World Council space
                  with a Hex Unavailable tile.
                </p>
              </RulesBox>

              {/* Per-mode setup additions (verbatim). Each module drops its own
                  section here on top of the base setup above. */}
              {moduleId === 'hypersync' && (
                <RulesBox label="Hypersync Future Actions — setup" showPreamble>
                  <p>
                    Use the 2-player side of the Hypersync board, and cover the right World
                    Council Action space on the Main board with a Hex Unavailable tile (as
                    noted in the Hypersync rules for 2 players).
                  </p>
                  <p>
                    Replace C01A with C12A. Leave C02A and C03A in play. Cover the Time
                    Travel Action space with C13A.
                  </p>
                  <p>Place the Solo Hypersync tiles next to the Chronossus board.</p>
                  <img
                    className="setup-tiles-img"
                    src="/assets/solo/chronossus/hypersync-solo-setup-tiles.png"
                    alt="Solo Hypersync setup tiles"
                  />
                </RulesBox>
              )}

              <div className="setup-modified">
                <h3>Setup for this app</h3>
                <p>
                  Set up a 2-player game with the Chronossus as one of the players.
                  There’s no need for the Chronossus board — this app tracks it for you.
                </p>
                <ul>
                  <li>
                    The Chronossus receives its 6 Exosuits and 8 Warp tiles. It does not
                    receive any Starting Assets or Workers.
                  </li>
                  <li>
                    Leave all Endgame Condition cards in the box and shuffle all Solo
                    Objective cards, revealing 3. Return the rest to the box.
                  </li>
                  <li>The Chronossus does not use a Focus marker.</li>
                  <li>
                    Place the Chronossus’s Banner on the First Player spot; it is the
                    First Player in the 1st Era. You receive 1 additional Water (for being
                    the second player).
                  </li>
                  <li>
                    You may still choose to use either the “A” or the “B” side of your
                    Player board.
                  </li>
                  {blockWorldCouncil && (
                    <li>
                      <b>Cover the right World Council space</b> with a Hex Unavailable
                      tile (difficulty option selected).
                    </li>
                  )}
                  {flipTiles && Object.keys(tileSides).length > 0 && (
                    <li>
                      <b>Flip to the B side</b> (difficulty):{' '}
                      {modeSlots
                        .filter((s) => tileSides[s.family])
                        .map((s) => `${s.family}B (${CHRONOSSUS_TILES[`${s.family}B`]?.name})`)
                        .join(', ')}
                      . Leave the rest on their A side.
                    </li>
                  )}
                </ul>
                <p>
                  This app tracks <b>all</b> of the Chronossus’s VP for you and explains
                  each Action’s rules as it takes them. Building VP is counted as tiles
                  are discarded, rather than placed on the bot’s board. Be ready to place
                  Exosuits and Warp tiles to the board and discard pieces for the bot as
                  prompted.
                </p>
                <p>
                  In addition to your points collected during the game, you score points
                  for the highest level you reached on each Solo Objective. The bot
                  doesn’t score for Solo Objectives.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
