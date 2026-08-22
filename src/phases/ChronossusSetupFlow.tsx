import { useState } from 'react';
import RulesBox from './RulesBox';
import { CHRONOSSUS_TILES } from '../board/chronossusTiles';
import {
  getMode,
  DIFFICULTY_SWAP_TILES,
  DIFFICULTY_FRACTURES_C14,
  worldCouncilMandatory,
  EXTRA_MODULE_LABELS,
} from '../board/chronossusModes';
import { Chronossus } from '../engine';

const HERO = '/assets/solo/chronossus-hero.jpg';
const TILE_ART = (code: string) => `/assets/solo/chronossus/tiles/${code}.png`;

/** The "Flip Action tiles to their B side" difficulty flag (shared with the view). */
export const DIFFICULTY_TILES_B_SIDE = 'chronossus-tiles-b-side';
/** Hypersync-only: take the oldest pending tile's space instead of a random roll. */
export const DIFFICULTY_HYPERSYNC_TARGETED = 'chronossus-hypersync-targeted';

/** Extra difficulty options that only apply to specific modules. */
/** A mode's own difficulty options — combos ('fractures+hypersync') take both lists. */
export function modeDifficultyFor(modeId: string | undefined): DifficultyOption[] {
  if (!modeId) return [];
  return Object.entries(MODE_DIFFICULTY)
    .filter(([id]) => modeId.includes(id))
    .flatMap(([, opts]) => opts);
}

const MODE_DIFFICULTY: Record<string, DifficultyOption[]> = {
  fractures: [
    {
      flag: DIFFICULTY_FRACTURES_C14,
      label: 'Fractures: replace C04 with C14',
      detail: 'C14 is a more difficult tile — Assimilate, but it also gains 1 additional Flux Core.',
    },
    {
      flag: Chronossus.DIFFICULTY_FRACTURES_EXTRA_FLUX,
      label: 'Fractures: extra starting Flux Cores',
      detail:
        'Increase the number of Flux Cores in the Flux Pool by 1/2/3 at the beginning of ' +
        'the game — a fuller pool means it Blinks more often.',
      values: [1, 2, 3],
    },
    {
      flag: Chronossus.DIFFICULTY_FRACTURES_LEFTOVER_FLUX_VP,
      label: 'Fractures: leftover Flux Cores score',
      detail:
        'Each leftover Flux Core in the Flux Pool at the end of the game is worth 1 VP to ' +
        'the Chronossus.',
    },
    {
      flag: Chronossus.DIFFICULTY_FRACTURES_PLAYER_GLITCH,
      label: 'Fractures: roll a starting Glitch for yourself',
      detail:
        'Roll the Glitch die after setup and place the rolled Glitch for yourself, in ' +
        'addition to the two starting Glitches from the Fractures of Time rules.',
    },
  ],
  guardians: [
    {
      flag: Chronossus.DIFFICULTY_GUARDIANS_POSTIMPACT_2VP,
      label: 'Guardians: Acquire Guardian scores 2 VP post-Impact',
      detail:
        'After the Impact the Chronossus can no longer acquire Guardians. Instead of the ' +
        'usual Failed Action, it scores 2 VPs when it resolves the Acquire Guardian Action.',
    },
    {
      flag: Chronossus.DIFFICULTY_GUARDIANS_START_1,
      label: 'Guardians: it starts the game with 1 Guardian',
      detail:
        'The Chronossus starts with 1 Guardian — place one of its Path markers on an empty ' +
        'Guardian board slot at setup, and give it a Guardian.',
    },
  ],
  pioneers: [
    {
      flag: Chronossus.DIFFICULTY_PIONEERS_BOARD_B,
      label: 'Pioneers: flip its Exosuit Upgrade board to the B side',
      detail:
        'The Chronossus starts with a Power value of 3 instead of 2, and each VP token on ' +
        'its Upgrade board is worth 3 Power instead of 2.',
    },
    {
      flag: Chronossus.DIFFICULTY_PIONEERS_VP_TOKENS_COUNT,
      label: 'Pioneers: VP tokens on the Upgrade board count as VP',
      detail:
        'By default the VP tokens it places when it cannot upgrade a Resource add Power ' +
        'but are not worth VP. With this on, each one also scores 1 VP at the end.',
    },
  ],
  doomsday: [
    {
      flag: Chronossus.DIFFICULTY_DOOMSDAY_NO_PLANNED,
      label: 'Doomsday: play without the Planned Experiments variant',
      detail:
        'By default the Level 2 Experiment stack sits face up and a claimed Experiment is ' +
        'replaced from it immediately. Without the variant the stack is face down and Level 2 ' +
        'Experiments are dealt under the Timeline in the Preparation phase instead — the ' +
        'rulebook suggests keeping the variant on for your first few games.',
    },
    {
      flag: Chronossus.DIFFICULTY_DOOMSDAY_SEED_MARKERS,
      label: 'Doomsday: it starts with Path markers on future Experiments',
      detail:
        'Place 1/2/3 of the Chronossus’s Path markers on future Experiments during setup. ' +
        'They become available to it once they are in the present, so it can execute an ' +
        'Experiment on its very first Experiment Action.',
      values: [1, 2, 3],
    },
  ],
  hypersync: [
    {
      flag: DIFFICULTY_HYPERSYNC_TARGETED,
      label: 'Hypersync: take your oldest tile’s space (no random roll)',
      detail:
        'Instead of randomly selecting a Hypersync Action space to take, the Chronossus ' +
        'takes the one corresponding to one of your pending Hypersync tiles. If you have ' +
        'more than one, it takes the one furthest in the past.',
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
/**
 * Solo Objective cards each module adds to the deck. They are collected into the single
 * base "shuffle and reveal" step rather than one bullet per module — the player searches
 * the Solo Objective deck once.
 */
/** Doomsday: the Path names, for the setup text. */
const PATH_LABEL: Record<Chronossus.PlayerPath, string> = {
  harmony: 'Harmony',
  dominance: 'Dominance',
  salvation: 'Salvation',
  progress: 'Progress',
};

const MODULE_OBJECTIVE_CARDS: [string, string[]][] = [
  ['fractures', ['Technology Cards', 'Flux on Track']],
  ['guardians', ['Guardians']],
  ['pioneers', ['Successful Adventures']],
  ['doomsday', ['Completed Experiments']],
];

const MODULE_CONFIGS: ModuleConfig[] = [
  { id: 'base', label: 'Base', available: true },
  { id: 'fractures', label: 'Fractures of Time', available: true },
  { id: 'doomsday', label: 'Doomsday', available: true },
  { id: 'pioneers', label: 'Pioneers of New Earth', available: true },
  { id: 'guardians', label: 'Guardians of the Council', available: true },
  { id: 'hypersync', label: 'Hypersync Future Actions', available: true },
  { id: 'fractures+pioneers', label: 'Fractures of Time + Pioneers of New Earth', available: true },
  { id: 'fractures+hypersync', label: 'Fractures of Time + Hypersync Future Actions', available: true },
  { id: 'guardians+hypersync', label: 'Guardians of the Council + Hypersync Future Actions', available: true },
  { id: 'guardians+pioneers', label: 'Guardians of the Council + Pioneers of New Earth', available: true },
];

/** Step 2 — the optional add-on modules (multi-select; combine with any base mode). */
interface ExtraModuleConfig {
  id: string;
  label: string;
  available: boolean;
  /** The physical expansion this add-on needs, when it needs one. */
  note?: string;
}
// The labels come from `EXTRA_MODULE_LABELS` so the picker and every place that lists the
// game's modules (the turn overview, End Game) can't drift apart.
const EXTRA_MODULES: ExtraModuleConfig[] = [
  { id: Chronossus.EXTRA_MODULE_VARIABLE_ANOMALIES, available: true },
  { id: Chronossus.EXTRA_MODULE_QUANTUM_LOOPS, available: true },
  { id: Chronossus.EXTRA_MODULE_ALTERNATE_TIMELINES, available: true },
].map((m) => ({ ...m, label: EXTRA_MODULE_LABELS[m.id] ?? m.id }));

/** Extra-module-specific difficulty options (Solo Opponents p.18's own
 *  "Increasing the Difficulty" bullets — only Alternate Timelines has one). */
const EXTRA_MODULE_DIFFICULTY: Record<string, DifficultyOption[]> = {
  [Chronossus.EXTRA_MODULE_QUANTUM_LOOPS]: [
    {
      flag: Chronossus.DIFFICULTY_QL_REMOVE_ON_5,
      label: 'Quantum Loops: also remove a card on a roll of 5',
      detail:
        'The Warp Phase check removes a Quantum Loop card on a roll of 4 or 5, not just a 4.',
    },
    {
      flag: Chronossus.DIFFICULTY_QL_2VP,
      label: 'Quantum Loops: 2 VP per card removed',
      detail: 'When removing a Quantum Loop card, the Chronossus receives 2 VPs.',
    },
  ],
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
  /** Pioneers: where the bot's Adventure cards come from (switchable later in ⚙). */
  adventureDeckMode: 'virtual' | 'shared';
  /** Doomsday: the Path the human is playing — it fixes which tracker the bot moves. */
  doomsdayPlayerPath: Chronossus.PlayerPath;
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
  type Step = 'intro' | 'modules' | 'path' | 'difficulty' | 'setup';
  const [step, setStep] = useState<Step>('intro');
  const [moduleId, setModuleId] = useState<string>('base');
  const [extraModules, setExtraModules] = useState<Set<string>>(new Set());
  /**
   * Pioneers: where the bot's Adventure cards come from. `virtual` (the default) keeps the
   * bot on its own shuffled copy of both decks — the app draws and shows the card art, and
   * your physical decks are never touched. `shared` has the bot draw from your decks, and
   * you tell it which cards came up.
   */
  const [adventureDeckMode, setAdventureDeckMode] = useState<'virtual' | 'shared'>('virtual');
  const [doomsdayPlayerPath, setDoomsdayPlayerPath] =
    useState<Chronossus.PlayerPath>('harmony');
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
  const extraFlux = difficulty.has(Chronossus.DIFFICULTY_FRACTURES_EXTRA_FLUX)
    ? (difficultyValues[Chronossus.DIFFICULTY_FRACTURES_EXTRA_FLUX] ?? 0)
    : 0;
  const playerGlitch = difficulty.has(Chronossus.DIFFICULTY_FRACTURES_PLAYER_GLITCH);
  const startingGuardian = difficulty.has(Chronossus.DIFFICULTY_GUARDIANS_START_1);
  const objectiveCount = fewerObjectives
    ? (difficultyValues[Chronossus.DIFFICULTY_FEWER_OBJECTIVES] ?? 0)
    : 3;
  // Every module that adds Solo Objective cards names them in ONE step with the base
  // "shuffle and reveal" rule — you dig through the deck once, not once per module.
  const objectiveCards = MODULE_OBJECTIVE_CARDS.filter(([id]) => moduleId?.includes(id)).flatMap(
    ([, cards]) => cards,
  );
  const modeSlots = getMode(moduleId, [...difficulty]).slots;
  // Doomsday: Harmony and Dominance interact with "Save Earth", Salvation and Progress with
  // "Seal Fate" — and the Chronossus always takes the opposing one (Solo Opponents p.14).
  const playerTrackerName =
    Chronossus.botTrackerFor(doomsdayPlayerPath) === 'seal-fate' ? 'Save Earth' : 'Seal Fate';
  const botTrackerName = playerTrackerName === 'Save Earth' ? 'Seal Fate' : 'Save Earth';

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
      adventureDeckMode,
      doomsdayPlayerPath,
    });

  const eyebrow =
    step === 'intro'
      ? 'New Game'
      : step === 'modules'
        ? 'Modules'
        : step === 'path'
          ? 'Doomsday'
          : step === 'difficulty'
            ? 'Difficulty'
            : 'Setup';
  const title =
    step === 'intro'
      ? 'The Chronossus'
      : step === 'modules'
        ? 'Select a Module'
        : step === 'path'
          ? 'Choose Your Path'
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
                <button
                  className="phase-primary"
                  onClick={() =>
                    // Doomsday alone needs a per-game answer before anything else can be
                    // said about it — which Doomsday track the player controls.
                    setStep(moduleId.includes('doomsday') ? 'path' : 'difficulty')
                  }
                >
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

              {moduleId.includes('pioneers') && (
                <>
                  <p className="phase-note">
                    <b>Pioneers — where the Chronossus’s Adventure cards come from.</b> You
                    can change this later in the ⚙ menu.
                  </p>
                  <div className="difficulty-list">
                    {(
                      [
                        {
                          id: 'virtual' as const,
                          label: 'Its own deck (recommended)',
                          detail:
                            'The app keeps its own shuffled copy of both Adventure decks, ' +
                            'draws for the Chronossus and shows you the card. Your physical ' +
                            'decks are never touched, so the bot can’t deplete or reorder them.',
                        },
                        {
                          id: 'shared' as const,
                          label: 'Your physical decks',
                          detail:
                            'The Chronossus draws from the same decks you do. The app tells ' +
                            'you its Power and which deck to draw 2 cards from, and you tell ' +
                            'it which cards came up.',
                        },
                      ]
                    ).map((o) => (
                      <label
                        key={o.id}
                        className={`difficulty-opt ${adventureDeckMode === o.id ? 'on' : ''}`}
                      >
                        <input
                          type="radio"
                          name="cx-adventure-deck"
                          checked={adventureDeckMode === o.id}
                          onChange={() => setAdventureDeckMode(o.id)}
                        />
                        <span className="difficulty-opt-text">
                          <b>{o.label}</b>
                          <span>{o.detail}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </>
              )}

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
                        {m.note && <span>{m.note}</span>}
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
          {/* ---- Step 2b: Doomsday's Path (its own screen — the whole module hangs off it) -- */}
          {step === 'path' && (
            <>
              <div className="setup-actions setup-actions-top">
                <button className="phase-secondary" onClick={() => setStep('modules')}>
                  ◀ Back
                </button>
                <button className="phase-primary" onClick={() => setStep('difficulty')}>
                  Continue ▶
                </button>
              </div>
              <p className="phase-note">
                Doomsday gives each Path a side of the Doomsday track. Tell the app which one
                you are playing and it takes the other for the Chronossus — that holds for the
                whole game.
              </p>
              <div className="difficulty-list">
                {(
                  [
                    { id: 'harmony' as const, label: 'Path of Harmony', track: 'Save Earth' },
                    { id: 'dominance' as const, label: 'Path of Dominance', track: 'Save Earth' },
                    { id: 'salvation' as const, label: 'Path of Salvation', track: 'Seal Fate' },
                    { id: 'progress' as const, label: 'Path of Progress', track: 'Seal Fate' },
                  ]
                ).map((o) => (
                  <label
                    key={o.id}
                    className={`difficulty-opt ${doomsdayPlayerPath === o.id ? 'on' : ''}`}
                  >
                    <input
                      type="radio"
                      name="cx-doomsday-path"
                      checked={doomsdayPlayerPath === o.id}
                      onChange={() => setDoomsdayPlayerPath(o.id)}
                    />
                    <span className="difficulty-opt-text">
                      <b>{o.label}</b>
                      <span>
                        You control the <b>{o.track}</b> tracker, moving it{' '}
                        {o.track === 'Save Earth' ? 'up' : 'down'} the track. The Chronossus
                        takes the <b>{o.track === 'Save Earth' ? 'Seal Fate' : 'Save Earth'}</b>{' '}
                        tracker.
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              <p className="phase-note">
                You will move <b>both</b> physical tokens during the game. The app tracks where
                the Chronossus’s marker sits so it knows the VP its Experiments earn, and tells
                you when to advance it — and you will read both trackers’ (+)/(−) symbols
                yourself for the Trajectory roll each Clean Up.
              </p>
              <div className="setup-actions">
                <button className="phase-secondary" onClick={() => setStep('modules')}>
                  ◀ Back
                </button>
                <button className="phase-primary" onClick={() => setStep('difficulty')}>
                  Continue ▶
                </button>
              </div>

              {/* Verbatim rules last, under what the player has to act on. */}
              <RulesBox label="Doomsday — the Chronossus’s tracker" showPreamble>
                <p>
                  If it successfully took an Experiment and the Doomsday tracks aren’t yet
                  locked, it moves its preferred marker (Seal Fate or Save Earth), taking any
                  printed VP on it—regardless of which Path that VP belongs to. The
                  Chronossus’s preferred marker is always the opposing one to yours. For
                  example, if you are playing as the Path of Harmony, thus interacting with
                  the Save Earth marker, it will move the Seal Fate marker on its turn as if
                  it was the Path of Salvation.
                </p>
              </RulesBox>
            </>
          )}

          {step === 'difficulty' && (
            <>
              <div className="setup-actions setup-actions-top">
                <button
                  className="phase-secondary"
                  onClick={() => setStep(moduleId.includes('doomsday') ? 'path' : 'modules')}
                >
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
                  ...modeDifficultyFor(moduleId),
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
                    Leave all Endgame Condition cards in the box.{' '}
                    {objectiveCards.length > 0 && (
                      <>
                        Add the{' '}
                        {objectiveCards.map((card, i) => (
                          <span key={card}>
                            {i > 0 && (i === objectiveCards.length - 1 ? ' and ' : ', ')}
                            <b>“{card}”</b>
                          </span>
                        ))}{' '}
                        Solo Objective card{objectiveCards.length === 1 ? '' : 's'} from your
                        module{objectiveCards.length === 1 ? '' : 's'} to the deck, then{' '}
                      </>
                    )}
                    {objectiveCards.length > 0 ? 'shuffle' : 'Shuffle'} all Solo Objective
                    cards, revealing {objectiveCount}
                    {fewerObjectives ? ' (difficulty option selected)' : ''}. Return the
                    rest to the box.
                  </li>
                  <li>The Chronossus does not use a Focus marker.</li>
                  {/* Fractures' own steps live in its module section below, like every
                      other module's — this list is the base setup. */}
                  {moduleId?.includes('guardians') && (
                    <>
                      <li>
                        Set up the <b>Guardian board</b> as for a 2-player game, and keep the
                        Chronossus’s <b>Path markers</b> to hand — when it acquires a
                        Guardian you place one on an empty Guardian board slot, and that slot
                        becomes that Guardian’s own Action space. (Solo Path markers aren’t
                        meant to be limited; if they run out, use an unused Path’s markers.)
                      </li>
                      <li>
                        The app tracks how many Guardians the Chronossus owns and how many
                        are powered up; you place and retrieve the miniatures as prompted.
                      </li>
                      {startingGuardian && (
                        <li>
                          <b>Give the Chronossus 1 Guardian now</b> and place one of its Path
                          markers on an empty Guardian board slot (difficulty option selected).
                        </li>
                      )}
                    </>
                  )}
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
              {moduleId?.includes('fractures') && (
                <div className="setup-modified">
                  <h3>Fractures of Time setup</h3>
                  <ul>
                    <li>
                      Set up the Timeline with the <b>Era Zero</b> tile and its own
                      face-up Superproject. Straight after setup the app runs a one-off{' '}
                      <b>Era Zero Warp Phase</b> — no other phases — with the Warp tiles
                      going on that tile. Era 1 then runs as usual, including its Paradox
                      phase (normally skipped in the first Era).
                    </li>
                    <li>
                      The Timeline is <b>shorter</b>: three Eras pre-Impact and two
                      post-Impact. The Impact happens in <b>Era 3</b>’s Clean Up and the
                      game ends after <b>Era 5</b>.
                    </li>
                    <li>
                      Set up the <b>Valley board</b> as if it was a 2-player game. The app
                      names the Valley Action the Chronossus takes; you place its Exosuit
                      there (or on the Valley Capital space if no Valley Action space is
                      free).
                    </li>
                    <li>
                      Keep <b>cardboard energized cores</b> to hand — or any alternative
                      marker — to show which of the Chronossus’s Exosuits are ready to
                      Blink: whenever it places an Exosuit on the Main board, put an Energy
                      Core from the supply into that Exosuit.
                    </li>
                    <li>
                      No need for the physical <b>Flux Pool</b> container — the app holds
                      its 1 Flux Core + 3 Empty Flux Casings and draws from it for you
                      {extraFlux > 0 ? ` (+${extraFlux} extra Flux Core${extraFlux === 1 ? '' : 's'}, difficulty option selected)` : ''}.
                    </li>
                    <li>
                      The Chronossus does not use a Fracture Device, never rolls the Flux
                      or Glitch dice, and never receives Glitches.
                    </li>
                    {playerGlitch && (
                      <li>
                        <b>Roll the Glitch die and place that Glitch for yourself</b>, on
                        top of your two starting Glitches (difficulty option selected).
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {moduleId?.includes('guardians') && (
                <div className="setup-modified">
                  <h3>Guardians of the Council setup</h3>
                  <ul>
                    <li>
                      Set up the Guardian board as for a 2-player game, and cover the right
                      World Council Action space with a Hex Unavailable tile (as noted in the
                      Guardians of the Council rules for 2 players).
                    </li>
                    <li>Keep the Chronossus’s Path markers to hand for the Guardian board.</li>
                  </ul>
                </div>
              )}

              {moduleId?.includes('pioneers') && (
                <div className="setup-modified">
                  <h3>Pioneers of New Earth setup</h3>
                  <ul>
                    <li>Place the Adventure board next to the Main board.</li>
                    <li>
                      Give the Chronossus its Exosuit Upgrade board,{' '}
                      <b>
                        {difficulty.has(Chronossus.DIFFICULTY_PIONEERS_BOARD_B) ? 'B' : 'A'}
                      </b>{' '}
                      side up.
                    </li>
                    {adventureDeckMode === 'virtual' ? (
                      <li>
                        The app keeps the Chronossus’s <b>own copy</b> of both Adventure
                        decks — shuffle your two decks and place them on the Adventure board
                        for yourself only. The bot never draws from them.
                      </li>
                    ) : (
                      <li>
                        Shuffle the 5+ and 10+ Adventure decks onto the Adventure board. The
                        Chronossus draws from these <b>same decks</b>, and you tell the app
                        which cards it drew.
                      </li>
                    )}
                    <li>
                      Keep the Chronossus’s Path markers to hand for the Adventure board’s
                      Power slots.
                    </li>
                  </ul>
                </div>
              )}

              {moduleId?.includes('doomsday') && (
                <div className="setup-modified">
                  <h3>Doomsday setup</h3>
                  <ul>
                    <li>
                      Set up the <b>Doomsday board</b>, the Experiment cards and the Impact
                      tile as for a 2-player game — including the{' '}
                      {difficulty.has(Chronossus.DIFFICULTY_DOOMSDAY_NO_PLANNED)
                        ? 'face-down Level 2 stack (you chose to play without the Planned Experiments variant)'
                        : 'face-up Level 2 stack of the Planned Experiments variant'}
                      .
                    </li>
                    <li>
                      Your Path (<b>{PATH_LABEL[doomsdayPlayerPath]}</b>) puts you on the{' '}
                      <b>{playerTrackerName}</b> track — that is the tracker{' '}
                      <b>you</b> advance for your own Experiments. The Chronossus scores on
                      the <b>{botTrackerName}</b> track, always the opposing one.
                    </li>
                    <li>
                      <b>You move both physical tokens.</b> The app tracks where the
                      Chronossus’s marker sits — that is how it knows the VP each of its
                      Experiments earns — and tells you when to advance it. You will need
                      both trackers’ positions yourself each Clean Up, to read the (+) and
                      (−) symbols for the Trajectory roll.
                    </li>
                    <li>
                      Keep the Chronossus’s <b>Path markers</b> to hand for the Experiments.
                    </li>
                    {difficulty.has(Chronossus.DIFFICULTY_DOOMSDAY_SEED_MARKERS) && (
                      <li>
                        Place{' '}
                        <b>
                          {difficultyValues[Chronossus.DIFFICULTY_DOOMSDAY_SEED_MARKERS] ?? 1}
                        </b>{' '}
                        of the Chronossus’s Path markers on future Experiments now
                        (difficulty option selected).
                      </li>
                    )}
                    <li>
                      <b>You run Check for Impact yourself</b> each Clean Up — the app never
                      rolls the Trajectory dice or tracks the Impact tile. It prompts you at
                      the right moment and asks what happened.
                    </li>
                  </ul>
                </div>
              )}

              {extraModules.has(Chronossus.EXTRA_MODULE_QUANTUM_LOOPS) && (
                <div className="setup-modified">
                  <h3>Quantum Loops setup</h3>
                  <ul>
                    <li>
                      Set up the <b>Quantum Loops module</b> as for a 2-player game — the
                      card offer, the draw deck and the Quantum Warp tiles are unchanged.
                    </li>
                    <li>
                      Keep the Quantum Loop cards in a <b>row</b>, adding new ones{' '}
                      <b>closest to the draw deck</b>. That order is what the Chronossus
                      reads: it always removes the card <b>farthest from the draw deck</b>.
                      When you return a card of your own, add it back farthest from the deck
                      too.
                    </li>
                    <li>
                      The app rolls the check for you each Warp Phase in which the Chronossus
                      places a Warp tile, and tells you whether a card leaves play. It never
                      takes or returns a card itself, so anything it removes is gone{' '}
                      <b>permanently</b>.
                    </li>
                    <li>
                      If you gain the <b>“Cosmic Data Leak”</b> card, draw 2 unused Solo
                      Objectives and put them into play.
                    </li>
                  </ul>
                </div>
              )}

              {moduleId?.includes('hypersync') && (
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

              {/* Verbatim rulebook setup last, under the app's own instructions —
                  reference material sits below what the player has to act on. */}
              <RulesBox label="Setup" showPreamble>
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
              {moduleId?.includes('fractures') && (
                <RulesBox label="Fractures of Time — setup" showPreamble>
                  <p>Setup the Valley board as if it was a 2-Player game.</p>
                  <p>
                    Place the following Action tiles (with the marked sides face up) on the
                    empty spaces of the Chronossus board: C04A, C05A and C06A.
                  </p>
                  <p>
                    You will need a second container, referred to as the “Flux Pool.” At
                    setup, add 1 Flux Core and all 3 Empty Flux Casing tokens to it.
                  </p>
                  <p>The Chronossus does not use a Fracture Device.</p>
                  <p>
                    Add the “Technology Cards” and “Flux on Track” Solo Objective cards to
                    the deck before drawing.
                  </p>
                </RulesBox>
              )}

              {moduleId?.includes('guardians') && (
                <RulesBox label="Guardians of the Council — setup" showPreamble>
                  <p>
                    Place the following Action tiles (with the marked sides face up) on the
                    empty spaces of the Chronossus board: C02A to the (I) empty space, C11A
                    to the (II) empty space. Leave C03A in play.
                  </p>
                  <p>Add the “Guardians” Solo Objective card to the Solo Objective deck.</p>
                  <p>
                    Cover the right World Council Action space with a Hex Unavailable tile
                    (as noted in the Guardians of the Council rules for 2 players).
                  </p>
                </RulesBox>
              )}

              {moduleId?.includes('pioneers') && (
                <RulesBox label="Pioneers of New Earth — setup" showPreamble>
                  <p>
                    This requires the Classic Expansion Pack to play. All of the Pioneers of
                    New Earth module and Chronossus base rules apply, unless noted below.
                  </p>
                  <p>
                    Place the following Action tiles (with the marked sides face up) on the
                    empty spaces of the Chronossus board: C03A to the (I) empty space, C09A
                    to the (II) empty space, C02A to the (III) empty space. C10A replaces the
                    printed “Recruit Genius or Research” Action space.
                  </p>
                  <p>
                    Add the “Successful Adventures” Solo Objective card to the Solo Objective
                    deck.
                  </p>
                  <p>Give it the Chronossus Exosuit Upgrade board with the “A” side up.</p>
                </RulesBox>
              )}

              {moduleId?.includes('doomsday') && (
                <RulesBox label="Doomsday — setup" showPreamble>
                  <p>
                    This requires the Classic Expansion Pack to play. All of the Doomsday
                    module and the Chronossus base rules apply, unless noted below. We suggest
                    using the “Planned Experiments” variant the first few times you play this
                    against the Chronossus.
                  </p>
                  <p>
                    Place the following Action tiles (with the marked sides face up) on the
                    empty spaces of the Chronossus board: C07A to the (I) empty space, C08A to
                    the (II) empty space. Leave C03A in play.
                  </p>
                  <p>
                    Add the “Completed Experiments” Solo Objective card to the Solo Objective
                    deck.
                  </p>
                </RulesBox>
              )}

              {moduleId?.includes('hypersync') && (
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

              {extraModules.has(Chronossus.EXTRA_MODULE_QUANTUM_LOOPS) && (
                <RulesBox label="Quantum Loops — setup" showPreamble>
                  <p>
                    This requires the Future Imperfect expansion to play. All of the Quantum
                    Loops module and Chronossus base rules apply, unless noted below.
                  </p>
                  <p>
                    No changes at Setup. Keep the Quantum Loop cards in a row, adding new ones
                    closest to the draw deck.
                  </p>
                </RulesBox>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
