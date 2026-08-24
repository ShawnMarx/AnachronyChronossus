import { Fragment, useState } from 'react';
import RulesBox from './RulesBox';
import { useTiles, useRule } from '../i18n/localized';
import { useT } from '../i18n/I18nProvider';
import T from '../i18n/Trans';
import { UI_STRINGS } from '../i18n/uiStrings';
import {
  getMode,
  DIFFICULTY_SWAP_TILES,
  DIFFICULTY_FRACTURES_C14,
  worldCouncilMandatory,
  EXTRA_MODULE_LABELS,
} from '../board/chronossusModes';
import { Chronossus } from '../engine';
import {
  CX_SETUP_RULE,
  CX_SETUP_FRACTURES_RULE,
  CX_SETUP_GUARDIANS_RULE,
  CX_SETUP_PIONEERS_RULE,
  CX_SETUP_DOOMSDAY_RULE,
  CX_SETUP_HYPERSYNC_RULE,
  CX_SETUP_QUANTUM_LOOPS_RULE,
  CX_DOOMSDAY_TRACKER_RULE,
} from '../engine/rules/chronossusSetupRules';

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
    { flag: DIFFICULTY_FRACTURES_C14, key: 'fracturesC14' },
    { flag: Chronossus.DIFFICULTY_FRACTURES_EXTRA_FLUX, key: 'fracturesExtraFlux', values: [1, 2, 3] },
    { flag: Chronossus.DIFFICULTY_FRACTURES_LEFTOVER_FLUX_VP, key: 'fracturesLeftoverFluxVp' },
    { flag: Chronossus.DIFFICULTY_FRACTURES_PLAYER_GLITCH, key: 'fracturesPlayerGlitch' },
  ],
  guardians: [
    { flag: Chronossus.DIFFICULTY_GUARDIANS_POSTIMPACT_2VP, key: 'guardiansPostimpact2vp' },
    { flag: Chronossus.DIFFICULTY_GUARDIANS_START_1, key: 'guardiansStart1' },
  ],
  pioneers: [
    { flag: Chronossus.DIFFICULTY_PIONEERS_BOARD_B, key: 'pioneersBoardB' },
    { flag: Chronossus.DIFFICULTY_PIONEERS_VP_TOKENS_COUNT, key: 'pioneersVpTokensCount' },
  ],
  doomsday: [
    { flag: Chronossus.DIFFICULTY_DOOMSDAY_NO_PLANNED, key: 'doomsdayNoPlanned' },
    { flag: Chronossus.DIFFICULTY_DOOMSDAY_SEED_MARKERS, key: 'doomsdaySeedMarkers', values: [1, 2, 3] },
  ],
  hypersync: [
    { flag: DIFFICULTY_HYPERSYNC_TARGETED, key: 'hypersyncTargeted' },
  ],
};

// Step 1's intro flavor (verbatim, Solo Opponents rulebook p. 7) lives in
// `ui.cxSetup.flavor`, alongside the Chronobot's.

/** Step 2 — the single-select module configurations (only Base is available). */
interface ModuleConfig {
  /** Also the locale key: `ui.module.<id>`. */
  id: string;
  available: boolean;
}
/**
 * Solo Objective cards each module adds to the deck. They are collected into the single
 * base "shuffle and reveal" step rather than one bullet per module — the player searches
 * the Solo Objective deck once.
 */
/** Doomsday: the locale key for each Path name, used in the setup text. */
const PATH_LABEL_KEY: Record<Chronossus.PlayerPath, string> = {
  harmony: 'ui.path.harmony',
  dominance: 'ui.path.dominance',
  salvation: 'ui.path.salvation',
  progress: 'ui.path.progress',
};

// The card names come from `ui.objectiveCard.*` so they read as they do on that
// language's cards.
const MODULE_OBJECTIVE_CARDS: [string, string[]][] = [
  ['fractures', ['technologyCards', 'fluxOnTrack']],
  ['guardians', ['guardians']],
  ['pioneers', ['successfulAdventures']],
  ['doomsday', ['completedExperiments']],
];

// The name of each configuration comes from `ui.module.<id>` — expansion titles, so a
// locale can use the names printed on that language's boxes.
const MODULE_CONFIGS: ModuleConfig[] = [
  { id: 'base', available: true },
  { id: 'fractures', available: true },
  { id: 'doomsday', available: true },
  { id: 'pioneers', available: true },
  { id: 'guardians', available: true },
  { id: 'hypersync', available: true },
  { id: 'fractures+pioneers', available: true },
  { id: 'fractures+hypersync', available: true },
  { id: 'guardians+hypersync', available: true },
  { id: 'guardians+pioneers', available: true },
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
    { flag: Chronossus.DIFFICULTY_QL_REMOVE_ON_5, key: 'qlRemoveOn5' },
    { flag: Chronossus.DIFFICULTY_QL_2VP, key: 'ql2vp' },
  ],
  [Chronossus.EXTRA_MODULE_ALTERNATE_TIMELINES]: [
    { flag: Chronossus.DIFFICULTY_ALT_TIMELINES_3VP, key: 'altTimelines3vp' },
  ],
};

/** Difficulty flag for the "cover the right World Council space" option (shared
 *  with the Chronobot); drives the setup wording on the last step. */
const DIFFICULTY_WORLD_COUNCIL = 'chronossus-hex-unavailable';

interface DifficultyOption {
  flag: string;
  /**
   * Key stem under `ui.cxSetup.diff.*` for this option's label and detail. The English
   * used to live here; it moved to the locale file so a translation can reach it.
   */
  key: string;
  /** Sub-selector choices (e.g. [1,2,3]) for options with a numeric intensity. */
  values?: number[];
}
// Step 3 — the base-game Chronossus difficulty options (Solo Opponents p. 10),
// plus the Chronobot's World Council variant as the last item.
const DIFFICULTY_OPTIONS: DifficultyOption[] = [
  { flag: DIFFICULTY_TILES_B_SIDE, key: 'tilesBSide' },
  { flag: DIFFICULTY_SWAP_TILES, key: 'swapTiles' },
  { flag: Chronossus.DIFFICULTY_EXTRA_ENERGY, key: 'extraEnergy', values: [1, 2, 3] },
  { flag: Chronossus.DIFFICULTY_EXTRA_POWERUP, key: 'extraPowerup' },
  { flag: Chronossus.DIFFICULTY_LEFTOVER_ENERGY_VP, key: 'leftoverEnergyVp' },
  { flag: Chronossus.DIFFICULTY_FEWER_OBJECTIVES, key: 'fewerObjectives', values: [0, 1, 2] },
  { flag: Chronossus.DIFFICULTY_FAILED_ACTION_VP, key: 'failedActionVp' },
  { flag: Chronossus.DIFFICULTY_RESEARCH_NEW_SHAPE, key: 'researchNewShape' },
  { flag: DIFFICULTY_WORLD_COUNCIL, key: 'worldCouncil' },
];

/**
 * Human-readable label for a stored difficulty flag (for the share/score summary and
 * any other place selected difficulty options are listed). Appends the chosen
 * sub-selector value, if any (e.g. "Extra starting Energy Cores (+2)").
 */
export function chronossusDifficultyLabel(
  flag: string,
  difficultyValues?: Record<string, number>,
  /**
   * Optional translator. This is a pure helper — the share text and score summary call it
   * outside React — so it cannot use a hook. A component passes `useT()`; anything else
   * gets English, which is also what a persisted string should keep.
   */
  translate?: (key: string) => string,
): string {
  const all = [
    ...DIFFICULTY_OPTIONS,
    ...Object.values(MODE_DIFFICULTY).flat(),
    ...Object.values(EXTRA_MODULE_DIFFICULTY).flat(),
  ];
  const found = all.find((o) => o.flag === flag);
  const value = difficultyValues?.[flag];
  const suffix = found?.values && value != null ? ` (${value})` : '';
  if (found) {
    const key = `ui.cxSetup.diff.${found.key}.label`;
    const label = translate?.(key);
    // UI_STRINGS is the English source of truth for these keys, so the pure path still
    // returns real text rather than a bare key.
    const english = UI_STRINGS[key.replace(/^ui\./, '') as keyof typeof UI_STRINGS];
    return (label && label !== key ? label : (english ?? found.key)) + suffix;
  }
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

/**
 * One verbatim setup block. Paragraphs split on a blank line; a single newline inside a
 * paragraph is a line break, which is what the base block's bullet list needs.
 */
function SetupRules({
  label,
  ruleKey,
  fallback,
  children,
}: {
  label: string;
  ruleKey: string;
  fallback: string;
  children?: React.ReactNode;
}) {
  const text = useRule(ruleKey, fallback);
  return (
    <RulesBox label={label} showPreamble>
      {text.split(/\n\s*\n/).map((para, i) => (
        <p key={i}>
          {para.split('\n').map((line, j) => (
            <Fragment key={j}>
              {j > 0 && <br />}
              {line}
            </Fragment>
          ))}
        </p>
      ))}
      {children}
    </RulesBox>
  );
}

/** A collapsible "Coming soon" list of not-yet-available modules / options. */
function ComingSoon({ items }: { items: string[] }) {
  const t = useT();
  if (items.length === 0) return null;
  return (
    <details className="coming-soon">
      <summary>{t('ui.cxSetup.comingSoon', { n: items.length })}</summary>
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
  // The tile catalog in the chosen language (the A/B flip picker shows each tile's
  // verbatim rule text). Hoisted here because the picker renders inside a map.
  const tiles = useTiles();
  const t = useT();
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
  // One markup run rather than a JSX list: `<T>` renders the `**…**`, so the whole
  // sentence stays a single key and a translator can move the list within it.
  const objectiveCardList = objectiveCards
    .map((key) => `**“${t(`ui.objectiveCard.${key}`)}”**`)
    .reduce(
      (acc, name, i) =>
        i === 0
          ? name
          : acc +
            t(
              i === objectiveCards.length - 1
                ? 'ui.cxSetup.app.cardLast'
                : 'ui.cxSetup.app.cardSep',
            ) +
            name,
      '',
    );
  const modeSlots = getMode(moduleId, [...difficulty]).slots;
  // Doomsday: Harmony and Dominance interact with "Save Earth", Salvation and Progress with
  // "Seal Fate" — and the Chronossus always takes the opposing one (Solo Opponents p.14).
  const playerSavesEarth = Chronossus.botTrackerFor(doomsdayPlayerPath) === 'seal-fate';
  const playerTrackerName = t(playerSavesEarth ? 'ui.track.saveEarth' : 'ui.track.sealFate');
  const botTrackerName = t(playerSavesEarth ? 'ui.track.sealFate' : 'ui.track.saveEarth');

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

  const eyebrow = t(
    step === 'intro'
      ? 'ui.cxSetup.eyebrow.new'
      : step === 'modules'
        ? 'ui.cxSetup.eyebrow.modules'
        : step === 'path'
          ? 'ui.cxSetup.eyebrow.doomsday'
          : step === 'difficulty'
            ? 'ui.cxSetup.eyebrow.difficulty'
            : 'ui.cxSetup.eyebrow.setup',
  );
  const title = t(
    step === 'intro'
      ? 'ui.cxSetup.title.intro'
      : step === 'modules'
        ? 'ui.cxSetup.title.modules'
        : step === 'path'
          ? 'ui.cxSetup.title.path'
          : step === 'difficulty'
            ? 'ui.cxSetup.title.difficulty'
            : 'ui.cxSetup.title.setup',
  );

  return (
    <div className="phase-screen">
      <header className="phase-bar">
        <div className="phase-bar-left">
          {onHome && (
            <button
              className="home-btn"
              onClick={onHome}
              title={t('ui.cxSetup.home')}
              aria-label={t('ui.cxSetup.home')}
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
          aria-label={t('ui.cxSetup.heroAlt')}
        />
        <div className="phase-body">
          {/* ---- Step 1: Intro ------------------------------------------- */}
          {step === 'intro' && (
            <>
              <div className="setup-actions setup-actions-top">
                <button className="phase-primary" onClick={() => setStep('modules')}>
                  {t('ui.cxSetup.continue')} ▶
                </button>
              </div>
              {t('ui.cxSetup.flavor')
                .split(/\n\s*\n/)
                .map((para, i) => (
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
                  ◀ {t('ui.cxSetup.back')}
                </button>
                <button
                  className="phase-primary"
                  onClick={() =>
                    // Doomsday alone needs a per-game answer before anything else can be
                    // said about it — which Doomsday track the player controls.
                    setStep(moduleId.includes('doomsday') ? 'path' : 'difficulty')
                  }
                >
                  {t('ui.cxSetup.continue')} ▶
                </button>
              </div>
              <p className="phase-note">
                <T k="ui.cxSetup.modules.note" />
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
                      <b>{t(`ui.module.${m.id}`)}</b>
                    </span>
                  </label>
                ))}
              </div>

              {moduleId.includes('pioneers') && (
                <>
                  <p className="phase-note">
                    <T k="ui.cxSetup.modules.pioneersDeck" />
                  </p>
                  <div className="difficulty-list">
                    {([{ id: 'virtual' as const }, { id: 'shared' as const }]).map((o) => (
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
                          <b>{t(`ui.cxSetup.adventureDeck.${o.id}.label`)}</b>
                          <span>{t(`ui.cxSetup.adventureDeck.${o.id}.detail`)}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </>
              )}

              <p className="phase-note">{t('ui.cxSetup.modules.extras')}</p>
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
                  ...MODULE_CONFIGS.filter((m) => !m.available).map((m) => t(`ui.module.${m.id}`)),
                  ...EXTRA_MODULES.filter((m) => !m.available).map((m) => m.label),
                ]}
              />

              <p className="phase-note">{t('ui.cxSetup.modules.buildings')}</p>
            </>
          )}

          {/* ---- Step 3: Difficulty (stubbed, disabled) ------------------ */}
          {/* ---- Step 2b: Doomsday's Path (its own screen — the whole module hangs off it) -- */}
          {step === 'path' && (
            <>
              <div className="setup-actions setup-actions-top">
                <button className="phase-secondary" onClick={() => setStep('modules')}>
                  ◀ {t('ui.cxSetup.back')}
                </button>
                <button className="phase-primary" onClick={() => setStep('difficulty')}>
                  {t('ui.cxSetup.continue')} ▶
                </button>
              </div>
              <p className="phase-note">{t('ui.cxSetup.path.note')}</p>
              <div className="difficulty-list">
                {(
                  [
                    { id: 'harmony' as const, saves: true },
                    { id: 'dominance' as const, saves: true },
                    { id: 'salvation' as const, saves: false },
                    { id: 'progress' as const, saves: false },
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
                      <b>{t(`ui.cxSetup.path.${o.id}`)}</b>
                      <span>
                        <T
                          k="ui.cxSetup.path.detail"
                          params={{
                            track: t(o.saves ? 'ui.track.saveEarth' : 'ui.track.sealFate'),
                            direction: t(o.saves ? 'ui.cxSetup.path.up' : 'ui.cxSetup.path.down'),
                            botTrack: t(o.saves ? 'ui.track.sealFate' : 'ui.track.saveEarth'),
                          }}
                        />
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              <p className="phase-note">
                <T k="ui.cxSetup.path.bothTokens" />
              </p>
              <div className="setup-actions">
                <button className="phase-secondary" onClick={() => setStep('modules')}>
                  ◀ {t('ui.cxSetup.back')}
                </button>
                <button className="phase-primary" onClick={() => setStep('difficulty')}>
                  {t('ui.cxSetup.continue')} ▶
                </button>
              </div>

              {/* Verbatim rules last, under what the player has to act on. */}
              <SetupRules
                label={t('ui.cxSetup.path.rulesLabel')}
                ruleKey="rule.cxSetup.doomsdayTracker"
                fallback={CX_DOOMSDAY_TRACKER_RULE}
              />
            </>
          )}

          {step === 'difficulty' && (
            <>
              <div className="setup-actions setup-actions-top">
                <button
                  className="phase-secondary"
                  onClick={() => setStep(moduleId.includes('doomsday') ? 'path' : 'modules')}
                >
                  ◀ {t('ui.cxSetup.back')}
                </button>
                <button className="phase-primary" onClick={() => setStep('setup')}>
                  {t('ui.cxSetup.continue')} ▶
                </button>
              </div>
              <p className="phase-note">{t('ui.cxSetup.difficulty.note')}</p>
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
                            <b>{t(`ui.cxSetup.diff.${o.key}.label`)}</b>
                            <span>{t(`ui.cxSetup.diff.${o.key}.detail`)}</span>
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
                            const tile = tiles[code];
                            return (
                              <div
                                key={slot.family}
                                className={`tile-flip-card ${side === 'B' ? 'flipped' : ''}`}
                              >
                                <img
                                  className="tile-flip-art"
                                  src={TILE_ART(code)}
                                  alt={t('ui.cxSetup.tileFlip.alt', {
                                    name: tile?.name ?? code,
                                    code,
                                  })}
                                />
                                <div className="tile-flip-text">
                                  <div className="tile-flip-head">
                                    <b>
                                      {t('ui.cxSetup.tileFlip.head', {
                                        slot: slot.slot,
                                        code,
                                        name: tile?.name ?? code,
                                      })}
                                    </b>
                                    <button
                                      type="button"
                                      className={`tile-flip-toggle ${side === 'B' ? 'on' : ''}`}
                                      onClick={() => toggleTileSide(slot.family)}
                                      aria-pressed={side === 'B'}
                                    >
                                      {t(
                                        side === 'B'
                                          ? 'ui.cxSetup.tileFlip.toA'
                                          : 'ui.cxSetup.tileFlip.toB',
                                      )}
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
                  ◀ {t('ui.cxSetup.back')}
                </button>
                <button className="phase-primary" onClick={begin}>
                  {t('ui.cxSetup.beginEra1')} ▶
                </button>
              </div>
              <div className="setup-modified">
                <h3>{t('ui.cxSetup.app.title')}</h3>
                <p>{t('ui.cxSetup.app.intro')}</p>
                <ul>
                  <li>{t('ui.cxSetup.app.figures')}</li>
                  <li>
                    {t('ui.cxSetup.app.endgameCards')}{' '}
                    {objectiveCards.length > 0 && (
                      <T
                        k={
                          objectiveCards.length === 1
                            ? 'ui.cxSetup.app.addObjectives'
                            : 'ui.cxSetup.app.addObjectivesPlural'
                        }
                        params={{ cards: objectiveCardList }}
                      />
                    )}
                    <T
                      k="ui.cxSetup.app.revealing"
                      params={{
                        shuffle: t(
                          objectiveCards.length > 0
                            ? 'ui.cxSetup.app.shuffleLower'
                            : 'ui.cxSetup.app.shuffleUpper',
                        ),
                        n: objectiveCount,
                        note: fewerObjectives ? t('ui.cxSetup.app.difficultyChosen') : '',
                      }}
                    />
                  </li>
                  <li>{t('ui.cxSetup.app.noFocus')}</li>
                  {/* Fractures' own steps live in its module section below, like every
                      other module's — this list is the base setup. */}
                  {moduleId?.includes('guardians') && (
                    <>
                      <li>
                        <T k="ui.cxSetup.app.guardians.board" />
                      </li>
                      <li>{t('ui.cxSetup.app.guardians.tracked')}</li>
                      {startingGuardian && (
                        <li>
                          <T k="ui.cxSetup.app.guardians.starting" />
                        </li>
                      )}
                    </>
                  )}
                  <li>{t('ui.cxSetup.app.banner')}</li>
                  <li>{t('ui.cxSetup.app.playerBoard')}</li>
                  {(blockWorldCouncil || mandatoryWorldCouncil) && (
                    <li>
                      <T
                        k={
                          mandatoryWorldCouncil
                            ? 'ui.cxSetup.app.worldCouncilRequired'
                            : 'ui.cxSetup.app.worldCouncilOption'
                        }
                      />
                    </li>
                  )}
                </ul>
                <p>
                  <T k="ui.cxSetup.app.vpNote" />
                </p>
                <p>{t('ui.cxSetup.app.objectivesNote')}</p>
              </div>

              {/* Visible per-mode setup steps (below the app rules) — the verbatim
                  Hypersync setup MINUS the tile-layout line the app handles for you. */}
              {moduleId?.includes('fractures') && (
                <div className="setup-modified">
                  <h3>{t('ui.cxSetup.mod.fractures.title')}</h3>
                  <ul>
                    <li>
                      <T k="ui.cxSetup.mod.fractures.eraZero" />
                    </li>
                    <li>
                      <T k="ui.cxSetup.mod.fractures.timeline" />
                    </li>
                    <li>
                      <T k="ui.cxSetup.mod.fractures.valley" />
                    </li>
                    <li>
                      <T k="ui.cxSetup.mod.fractures.cores" />
                    </li>
                    <li>
                      <T
                        k="ui.cxSetup.mod.fractures.fluxPool"
                        params={{
                          extra:
                            extraFlux > 0
                              ? t(
                                  extraFlux === 1
                                    ? 'ui.cxSetup.mod.fractures.extraFlux'
                                    : 'ui.cxSetup.mod.fractures.extraFluxPlural',
                                  { n: extraFlux },
                                )
                              : '',
                        }}
                      />
                    </li>
                    <li>{t('ui.cxSetup.mod.fractures.noDevice')}</li>
                    {playerGlitch && (
                      <li>
                        <T k="ui.cxSetup.mod.fractures.playerGlitch" />
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {moduleId?.includes('guardians') && (
                <div className="setup-modified">
                  <h3>{t('ui.cxSetup.mod.guardians.title')}</h3>
                  <ul>
                    <li>{t('ui.cxSetup.mod.guardians.board')}</li>
                    <li>{t('ui.cxSetup.mod.guardians.markers')}</li>
                  </ul>
                </div>
              )}

              {moduleId?.includes('pioneers') && (
                <div className="setup-modified">
                  <h3>{t('ui.cxSetup.mod.pioneers.title')}</h3>
                  <ul>
                    <li>{t('ui.cxSetup.mod.pioneers.board')}</li>
                    <li>
                      <T
                        k="ui.cxSetup.mod.pioneers.upgrade"
                        params={{
                          side: difficulty.has(Chronossus.DIFFICULTY_PIONEERS_BOARD_B)
                            ? 'B'
                            : 'A',
                        }}
                      />
                    </li>
                    <li>
                      <T
                        k={
                          adventureDeckMode === 'virtual'
                            ? 'ui.cxSetup.mod.pioneers.ownDeck'
                            : 'ui.cxSetup.mod.pioneers.sharedDeck'
                        }
                      />
                    </li>
                    <li>{t('ui.cxSetup.mod.pioneers.markers')}</li>
                  </ul>
                </div>
              )}

              {moduleId?.includes('doomsday') && (
                <div className="setup-modified">
                  <h3>{t('ui.cxSetup.mod.doomsday.title')}</h3>
                  <ul>
                    <li>
                      <T
                        k="ui.cxSetup.mod.doomsday.board"
                        params={{
                          stack: t(
                            difficulty.has(Chronossus.DIFFICULTY_DOOMSDAY_NO_PLANNED)
                              ? 'ui.cxSetup.mod.doomsday.stackNoPlanned'
                              : 'ui.cxSetup.mod.doomsday.stackPlanned',
                          ),
                        }}
                      />
                    </li>
                    <li>
                      <T
                        k="ui.cxSetup.mod.doomsday.path"
                        params={{
                          path: t(PATH_LABEL_KEY[doomsdayPlayerPath]),
                          playerTrack: playerTrackerName,
                          botTrack: botTrackerName,
                        }}
                      />
                    </li>
                    <li>
                      <T k="ui.cxSetup.mod.doomsday.bothTokens" />
                    </li>
                    <li>
                      <T k="ui.cxSetup.mod.doomsday.markers" />
                    </li>
                    {difficulty.has(Chronossus.DIFFICULTY_DOOMSDAY_SEED_MARKERS) && (
                      <li>
                        <T
                          k="ui.cxSetup.mod.doomsday.seedMarkers"
                          params={{
                            n:
                              difficultyValues[Chronossus.DIFFICULTY_DOOMSDAY_SEED_MARKERS] ??
                              1,
                          }}
                        />
                      </li>
                    )}
                    <li>
                      <T k="ui.cxSetup.mod.doomsday.checkImpact" />
                    </li>
                  </ul>
                </div>
              )}

              {extraModules.has(Chronossus.EXTRA_MODULE_QUANTUM_LOOPS) && (
                <div className="setup-modified">
                  <h3>{t('ui.cxSetup.mod.quantumLoops.title')}</h3>
                  <ul>
                    <li>
                      <T k="ui.cxSetup.mod.quantumLoops.module" />
                    </li>
                    <li>
                      <T k="ui.cxSetup.mod.quantumLoops.row" />
                    </li>
                    <li>
                      <T k="ui.cxSetup.mod.quantumLoops.check" />
                    </li>
                    <li>
                      <T k="ui.cxSetup.mod.quantumLoops.leak" />
                    </li>
                  </ul>
                </div>
              )}

              {moduleId?.includes('hypersync') && (
                <div className="setup-modified">
                  <h3>{t('ui.cxSetup.mod.hypersync.title')}</h3>
                  <ul>
                    <li>{t('ui.cxSetup.mod.hypersync.board')}</li>
                    <li>{t('ui.cxSetup.mod.hypersync.tiles')}</li>
                  </ul>
                </div>
              )}

              {/* Verbatim rulebook setup last, under the app's own instructions —
                  reference material sits below what the player has to act on. */}
              <SetupRules
                label={t('ui.cxSetup.rules.base')}
                ruleKey="rule.cxSetup.base"
                fallback={CX_SETUP_RULE}
              />

              {/* Per-mode setup additions (verbatim). Each module drops its own
                  section here on top of the base setup above. */}
              {moduleId?.includes('fractures') && (
                <SetupRules
                  label={t('ui.cxSetup.rules.fractures')}
                  ruleKey="rule.cxSetup.fractures"
                  fallback={CX_SETUP_FRACTURES_RULE}
                />
              )}

              {moduleId?.includes('guardians') && (
                <SetupRules
                  label={t('ui.cxSetup.rules.guardians')}
                  ruleKey="rule.cxSetup.guardians"
                  fallback={CX_SETUP_GUARDIANS_RULE}
                />
              )}

              {moduleId?.includes('pioneers') && (
                <SetupRules
                  label={t('ui.cxSetup.rules.pioneers')}
                  ruleKey="rule.cxSetup.pioneers"
                  fallback={CX_SETUP_PIONEERS_RULE}
                />
              )}

              {moduleId?.includes('doomsday') && (
                <SetupRules
                  label={t('ui.cxSetup.rules.doomsday')}
                  ruleKey="rule.cxSetup.doomsday"
                  fallback={CX_SETUP_DOOMSDAY_RULE}
                />
              )}

              {moduleId?.includes('hypersync') && (
                <SetupRules
                  label={t('ui.cxSetup.rules.hypersync')}
                  ruleKey="rule.cxSetup.hypersync"
                  fallback={CX_SETUP_HYPERSYNC_RULE}
                >
                  <img
                    className="setup-tiles-img"
                    src="/assets/solo/chronossus/hypersync-solo-setup-tiles.png"
                    alt={t('ui.cxSetup.rules.hypersyncTilesAlt')}
                  />
                </SetupRules>
              )}

              {extraModules.has(Chronossus.EXTRA_MODULE_QUANTUM_LOOPS) && (
                <SetupRules
                  label={t('ui.cxSetup.rules.quantumLoops')}
                  ruleKey="rule.cxSetup.quantumLoops"
                  fallback={CX_SETUP_QUANTUM_LOOPS_RULE}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
