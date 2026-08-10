import { useState } from 'react';
import RulesBox from './RulesBox';
import { CHRONOSSUS_TILES } from '../board/chronossusTiles';
import { getMode, DIFFICULTY_SWAP_TILES, worldCouncilMandatory } from '../board/chronossusModes';
import { Chronossus } from '../engine';

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

/** Step 2 — the optional add-on modules (multi-select; combine with any base mode). */
interface ExtraModuleConfig {
  id: string;
  label: string;
  available: boolean;
}
const EXTRA_MODULES: ExtraModuleConfig[] = [
  { id: 'variable-anomalies', label: 'Variable Anomalies', available: true },
  { id: 'quantum-loops', label: 'Quantum Loops', available: false },
  { id: Chronossus.EXTRA_MODULE_ALTERNATE_TIMELINES, label: 'Alternate Timelines', available: true },
];

/** Extra-module-specific difficulty options (Solo Opponents p.18's own
 *  "Increasing the Difficulty" bullets — only Alternate Timelines has one). */
const EXTRA_MODULE_DIFFICULTY: Record<string, DifficultyOption[]> = {
  [Chronossus.EXTRA_MODULE_ALTERNATE_TIMELINES]: [
    {
      flag: Chronossus.DIFFICULTY_ALT_TIMELINES_3VP,
      label: 'Alternate Timelines: 3 VP per positive effect',
      detail: 'The Chronossus scores 3 VPs per positive effect instead of 2.',
    },
  ],
};

/** Difficulty flag for the "cover the right World Council space" option (shared
 *  with the Chronobot); drives the setup wording on the last step. */
const DIFFICULTY_WORLD_COUNCIL = 'chronossus-hex-unavailable';

interface DifficultyOption {
  flag: string;
  label: string;
  detail: string;
  /** Sub-selector choices (e.g. [1,2,3]) for options with a numeric intensity. */
  values?: number[];
}
// Step 3 — the base-game Chronossus difficulty options (Solo Opponents p. 10),
// plus the Chronobot's World Council variant as the last item.
const DIFFICULTY_OPTIONS: DifficultyOption[] = [
  {
    flag: DIFFICULTY_TILES_B_SIDE,
    label: 'Flip Action tiles to their B side',
    detail: 'Flip some or all of the Action tiles to their B side (pick which below).',
  },
  {
    flag: DIFFICULTY_SWAP_TILES,
    label: 'Swap Action tiles between spaces',
    detail: 'Swap the Action tiles between Slot I and Slot III (the two marked spaces).',
  },
  {
    flag: Chronossus.DIFFICULTY_EXTRA_ENERGY,
    label: 'Extra starting Energy Cores',
    detail:
      'Increase the number of Energy Cores by 1/2/3 in the Energy Pool at the ' +
      'beginning of the game.',
    values: [1, 2, 3],
  },
  {
    flag: Chronossus.DIFFICULTY_EXTRA_POWERUP,
    label: 'One extra powered Exosuit each Era',
    detail:
      'The Chronossus powers up one additional Exosuit each Era for free. If this ' +
      'would exceed its maximum number of Exosuits, it gains 2 VPs instead for each ' +
      'excess Energy Core drawn (those Energy Cores are still removed from the game).',
  },
  {
    flag: Chronossus.DIFFICULTY_LEFTOVER_ENERGY_VP,
    label: 'Leftover Energy Cores score VP',
    detail:
      'Each leftover (non-exhausted) Energy Core in the Energy Pool at the end of ' +
      'the game is worth 1 VP to the Chronossus.',
  },
  {
    flag: Chronossus.DIFFICULTY_FEWER_OBJECTIVES,
    label: 'Fewer (or no) Solo Objectives',
    detail: 'Play with fewer (or no) Solo Objectives.',
    values: [0, 1, 2],
  },
  {
    flag: Chronossus.DIFFICULTY_FAILED_ACTION_VP,
    label: 'Failed Actions score VP',
    detail: 'The Chronossus gains 2 VPs for each Failed Action.',
  },
  {
    flag: Chronossus.DIFFICULTY_RESEARCH_NEW_SHAPE,
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
      'Unavailable tile. (This constrains your own board — the app changes nothing.)',
  },
];

/**
 * Human-readable label for a stored difficulty flag (for the share/score summary and
 * any other place selected difficulty options are listed). Appends the chosen
 * sub-selector value, if any (e.g. "Extra starting Energy Cores (+2)").
 */
export function chronossusDifficultyLabel(
  flag: string,
  difficultyValues?: Record<string, number>,
): string {
  const all = [
    ...DIFFICULTY_OPTIONS,
    ...Object.values(MODE_DIFFICULTY).flat(),
    ...Object.values(EXTRA_MODULE_DIFFICULTY).flat(),
  ];
  const found = all.find((o) => o.flag === flag);
  const value = difficultyValues?.[flag];
  const suffix = found?.values && value != null ? ` (${value})` : '';
  if (found) return found.label + suffix;
  // Fallback: prettify an unknown flag ("chronossus-extra-energy" → "Extra energy").
  const s = flag.replace(/^chronossus-/, '').replace(/-/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1) + suffix;
}

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
  /** Chosen sub-selector value per flag (e.g. 'chronossus-extra-energy' → 2). */
  difficultyValues: Record<string, number>;
  /** Selected extra/add-on module ids (multi-select). */
  extraModules: string[];
}

/** A collapsible "Coming soon" list of not-yet-available modules / options. */
function ComingSoon({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <details className="coming-soon">
      <summary>Coming soon ({items.length})</summary>
      <ul>
        {items.map((label) => (
          <li key={label}>{label}</li>
        ))}
      </ul>
    </details>
  );
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
  const [extraModules, setExtraModules] = useState<Set<string>>(new Set());
  const [difficulty, setDifficulty] = useState<Set<string>>(new Set());
  // Per-tile side selection; only families set to 'B' are stored.
  const [tileSides, setTileSides] = useState<Record<string, 'B'>>({});
  // Chosen sub-selector value per flag (D3 extra energy, D6 fewer objectives).
  const [difficultyValues, setDifficultyValues] = useState<Record<string, number>>({});

  // Hypersync/Guardians (and any combo built from them) require covering the World
  // Council space as part of their OWN setup rules — not an optional difficulty
  // increase there, so D9 isn't offered as a choice for those modes.
  const mandatoryWorldCouncil = worldCouncilMandatory(moduleId);
  const blockWorldCouncil = difficulty.has(DIFFICULTY_WORLD_COUNCIL);
  const flipTiles = difficulty.has(DIFFICULTY_TILES_B_SIDE);
  const fewerObjectives = difficulty.has(Chronossus.DIFFICULTY_FEWER_OBJECTIVES);
  const objectiveCount = fewerObjectives
    ? (difficultyValues[Chronossus.DIFFICULTY_FEWER_OBJECTIVES] ?? 0)
    : 3;
  const modeSlots = getMode(moduleId, [...difficulty]).slots;

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
    onBegin({
      difficulty: [...difficulty],
      mode: moduleId,
      tileSides: effectiveTileSides(),
      difficultyValues,
      extraModules: [...extraModules],
    });

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
                <b>Base</b> is the app designer’s suggested start. The app itself handles
                the extra bookkeeping and complexity of the other modules, giving you a
                more complete opponent as they come online across the game modes.
              </p>
              <div className="difficulty-list">
                {MODULE_CONFIGS.filter((m) => m.available).map((m) => (
                  <label
                    key={m.id}
                    className={`difficulty-opt ${moduleId === m.id ? 'on' : ''}`}
                  >
                    <input
                      type="radio"
                      name="cx-module"
                      checked={moduleId === m.id}
                      onChange={() => setModuleId(m.id)}
                    />
                    <span className="difficulty-opt-text">
                      <b>{m.label}</b>
                    </span>
                  </label>
                ))}
              </div>

              <p className="phase-note">
                Optional add-on modules (combine with any base mode above):
              </p>
              <div className="difficulty-list">
                {EXTRA_MODULES.filter((m) => m.available).map((m) => {
                  const on = extraModules.has(m.id);
                  return (
                    <label key={m.id} className={`difficulty-opt ${on ? 'on' : ''}`}>
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() =>
                          setExtraModules((s) => {
                            const next = new Set(s);
                            if (next.has(m.id)) next.delete(m.id);
                            else next.add(m.id);
                            return next;
                          })
                        }
                      />
                      <span className="difficulty-opt-text">
                        <b>{m.label}</b>
                      </span>
                    </label>
                  );
                })}
              </div>

              <ComingSoon
                items={[
                  ...MODULE_CONFIGS.filter((m) => !m.available).map((m) => m.label),
                  ...EXTRA_MODULES.filter((m) => !m.available).map((m) => m.label),
                ]}
              />

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
                Chronossus, or play with none for the standard game.
              </p>
              <div className="difficulty-list">
                {[
                  ...DIFFICULTY_OPTIONS,
                  ...(MODE_DIFFICULTY[moduleId] ?? []),
                  ...[...extraModules].flatMap((id) => EXTRA_MODULE_DIFFICULTY[id] ?? []),
                ]
                  .filter((o) => !(mandatoryWorldCouncil && o.flag === DIFFICULTY_WORLD_COUNCIL))
                  .map((o) => {
                    const isFlip = o.flag === DIFFICULTY_TILES_B_SIDE;
                    const on = difficulty.has(o.flag);
                    return (
                      <div key={o.flag}>
                        <label className={`difficulty-opt ${on ? 'on' : ''}`}>
                          <input
                            type="checkbox"
                            checked={on}
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

                        {/* Sub-selector — revealed when a numeric-intensity option is on. */}
                        {o.values && on && (
                          <div className="difficulty-sub-values">
                            {o.values.map((v) => (
                              <button
                                key={v}
                                type="button"
                                className={`difficulty-sub-value ${difficultyValues[o.flag] === v ? 'on' : ''}`}
                                aria-pressed={difficultyValues[o.flag] === v}
                                onClick={() =>
                                  setDifficultyValues((s) => ({ ...s, [o.flag]: v }))
                                }
                              >
                                {v}
                              </button>
                            ))}
                          </div>
                        )}

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
                    Objective cards, revealing {objectiveCount}
                    {fewerObjectives ? ' (difficulty option selected)' : ''}. Return the
                    rest to the box.
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
                  {(blockWorldCouncil || mandatoryWorldCouncil) && (
                    <li>
                      <b>Cover the right World Council space</b> with a Hex Unavailable
                      tile{mandatoryWorldCouncil ? ' (required for this mode).' : ' (difficulty option selected).'}
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

              {/* Visible per-mode setup steps (below the app rules) — the verbatim
                  Hypersync setup MINUS the tile-layout line the app handles for you. */}
              {moduleId === 'hypersync' && (
                <div className="setup-modified">
                  <h3>Hypersync Future Actions setup</h3>
                  <ul>
                    <li>
                      Use the 2-player side of the Hypersync board, and cover the right
                      World Council Action space on the Main board with a Hex Unavailable
                      tile (as noted in the Hypersync rules for 2 players).
                    </li>
                    <li>Place the Solo Hypersync tiles next to the Chronossus board.</li>
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
