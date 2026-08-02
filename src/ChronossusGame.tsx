// ChronossusGame — the full guided Era flow for the Chronossus.
//
// Structure mirrors the Chronobot (Setup → 1 Preparation → 2 Paradox → 3 Power Up
// → 4 Warp → 5 Action Rounds → 6 Clean Up → next Era | End Game) but uses the
// Chronossus engine + board. It reuses the shared PhaseScreen shell (now
// parameterised with the Chronossus hero/label) and flow.ts sequencing.
//
// Phase 5 (Action Rounds) reuses the Chronobot's exported `DetailPanel` verbatim
// (passing botName="Chronossus"), so the action pop-ups look and behave EXACTLY
// like the Chronobot's — only the board + coordinates differ. Actions resolve
// through Chronossus.resolveAction (no Command-token advancement yet — the token
// paths are a later feature). A calibrate mode positions the hotspots + markers.
//
// DEV STANCE (per plan): boots straight into Phase 5 with 4 powered Exosuits so we
// can reconcile the Action Rounds first. The non-Phase-5 phase bodies are honest
// skeletons for now; a debug phase rail lets you jump around.

import { useEffect, useRef, useState } from 'react';
import './BoardExplorer.css';
import './ChronossusExplorer.css';
import './phases/phases.css';
import PhaseScreen from './phases/PhaseScreen';
import { CHRONOSSUS_PHASE_META, CHRONOSSUS_ENDGAME_RULES } from './phases/chronossusPhaseMeta';
import { DetailPanel, AnchoredPopover, type PendingStep } from './BoardExplorer';
import { useAuth } from './auth/useAuth';
import {
  Chronobot,
  Chronossus,
  CHRONOBOT_ACTIONS,
  createInitialState,
  emptyChronossusState,
  drawEnergyPool,
  rollShapeDie,
  type GameState,
  type ChronossusState,
  type Phase,
  type Resource,
  type Worker,
  type BreakthroughShape,
  type Instruction,
} from './engine';
import { finishEra, advanceFromPreparation } from './game/flow';
import type { ChronossusActionInput, EnergyDraw } from './engine/bots/chronossus';
import {
  CHRONOSSUS_ACTION_HOTSPOTS,
  CHRONOSSUS_COMMAND_MARKERS,
  CHRONOSSUS_PANEL,
  CHRONOSSUS_COUNTERS,
  CHRONOSSUS_TIME_TRAVEL_TRACK,
  CHRONOSSUS_WARP_MARKER,
  CHRONOSSUS_PARADOX_SLOTS,
} from './board/chronossusHotspots';
import type { BoardCounter, Hotspot } from './board/chronobotHotspots';

const HERO = '/assets/solo/chronossus-hero.jpg';
const DEBUG_EXOSUITS = 4;

/** Boot straight into Phase 5 (Action Rounds) with powered Exosuits (dev). */
function initState(): GameState {
  const base = createInitialState({
    bot: 'chronossus',
    expansions: ['base'],
    difficulty: [],
    playerBoardSide: 'A',
  });
  const bot = emptyChronossusState();
  bot.exosuitsAvailable = DEBUG_EXOSUITS;
  bot.warpTilesOnTimeline = 2; // seed 2 Warp tiles so Time Travel is testable
  return { ...base, chronossus: bot, phase: 'actions', firstPlayer: 'bot' };
}

const PHASE_RAIL: Phase[] = [
  'setup',
  'preparation',
  'paradox',
  'powerup',
  'warp',
  'actions',
  'cleanup',
  'endgame',
];

/** Format a cube list ("2 gold + 1 titanium") for the Remove-Anomaly prompt. */
function describeCubes(cubes: Resource[]): string {
  const counts: Partial<Record<Resource, number>> = {};
  for (const c of cubes) counts[c] = (counts[c] ?? 0) + 1;
  return Object.entries(counts)
    .map(([r, c]) => `${c} ${r}`)
    .join(' + ');
}

function isConstructBuilding(a: string): boolean {
  return a.startsWith('construct-') && a !== 'construct-superproject';
}

// ---- Calibration keys ----------------------------------------------------
const hsKey = (id: string) => `hs_${id}`;
const cmdKey = (num: number) => `cmd_${num}`;
const ttKey = (i: number) => `tt_${i}`;
const pdxKey = (i: number) => `pdx_${i}`;
const WARP_KEY = 'warp';
const HS_CENTER = (h: Hotspot): [number, number] => [
  h.rect[0] + h.rect[2] / 2,
  h.rect[1] + h.rect[3] / 2,
];
const TT_KEYS = CHRONOSSUS_TIME_TRAVEL_TRACK.spots.map((_, i) => ttKey(i));
const PDX_KEYS = CHRONOSSUS_PARADOX_SLOTS.slots.map((_, i) => pdxKey(i));
const CAL_KEYS: string[] = [
  ...CHRONOSSUS_ACTION_HOTSPOTS.map((h) => hsKey(h.id)),
  ...CHRONOSSUS_COMMAND_MARKERS.map((m) => cmdKey(m.num)),
  ...CHRONOSSUS_COUNTERS.map((c) => c.key),
  ...TT_KEYS,
  WARP_KEY,
  ...PDX_KEYS,
];

/** Value for a tracker badge (the Chronossus slice shares the Chronobot's fields). */
function counterValue(bot: ChronossusState, key: BoardCounter['key']): number {
  switch (key) {
    case 'superproject':
      return bot.superprojects;
    case 'anomaly':
      return bot.anomalies;
    case 'mech':
      return bot.exosuitsAvailable;
    case 'breakthrough':
      return bot.breakthroughs.circle + bot.breakthroughs.triangle + bot.breakthroughs.square;
    case 'neutronium':
    case 'uranium':
    case 'gold':
    case 'titanium':
      return bot.resources[key];
    case 'genius':
    case 'administrator':
    case 'engineer':
    case 'scientist':
      return bot.workers[key];
    default:
      return bot.buildings[key];
  }
}

export default function ChronossusGame({ onHome }: { onHome: () => void }) {
  const [state, setState] = useState<GameState>(initState);
  const [lastDraw, setLastDraw] = useState<EnergyDraw | null>(null);

  // ---- Phase 5 action-dialog controller (mirrors BoardExplorer) ----------
  const [active, setActive] = useState<Hotspot | null>(null);
  const [pending, setPending] = useState<PendingStep>(null);
  const [result, setResult] = useState<Instruction[]>([]);
  const [selectedVP, setSelectedVP] = useState<number | null>(null);
  const [selectedResources, setSelectedResources] = useState<Resource[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [rolledShape, setRolledShape] = useState<BreakthroughShape | null>(null);
  const [lastResult, setLastResult] = useState<Instruction[]>([]); // persists in the aside

  // Debug mode (admin-only). On by default — Chronossus is an admin preview and
  // the debug rail (phase jump / Impact / End Actions) is our testing surface.
  const { user } = useAuth();
  const [debug, setDebug] = useState(true);

  // ---- Calibrate mode ----------------------------------------------------
  const [calibrate, setCalibrate] = useState(false);
  const [paradoxes, setParadoxes] = useState(0); // debug: fill 0–3 Paradox slots
  const [positions, setPositions] = useState<Record<string, [number, number]>>(() => {
    const seed: Record<string, [number, number]> = {};
    for (const h of CHRONOSSUS_ACTION_HOTSPOTS) seed[hsKey(h.id)] = HS_CENTER(h);
    for (const m of CHRONOSSUS_COMMAND_MARKERS) seed[cmdKey(m.num)] = m.pos;
    for (const c of CHRONOSSUS_COUNTERS) seed[c.key] = c.pos;
    CHRONOSSUS_TIME_TRAVEL_TRACK.spots.forEach((p, i) => (seed[ttKey(i)] = p));
    seed[WARP_KEY] = CHRONOSSUS_WARP_MARKER.pos;
    CHRONOSSUS_PARADOX_SLOTS.slots.forEach((p, i) => (seed[pdxKey(i)] = p));
    return seed;
  });
  const [selected, setSelected] = useState<string>(CAL_KEYS[0]);
  const [hsWidth, setHsWidth] = useState<number>(CHRONOSSUS_ACTION_HOTSPOTS[0].rect[2]);
  const [hsHeight, setHsHeight] = useState<number>(CHRONOSSUS_ACTION_HOTSPOTS[0].rect[3]);
  const [markerWidth, setMarkerWidth] = useState<number>(5);
  const [ttWidth, setTtWidth] = useState<number>(CHRONOSSUS_TIME_TRAVEL_TRACK.markerWidth);
  const [warpWidth, setWarpWidth] = useState<number>(CHRONOSSUS_WARP_MARKER.width);
  const [paradoxWidth, setParadoxWidth] = useState<number>(CHRONOSSUS_PARADOX_SLOTS.width);

  const bot = state.chronossus!;
  const score = Chronossus.scoreChronossus(bot);

  // Arrow-key nudge for the selected calibration point.
  useEffect(() => {
    if (!calibrate) return;
    const onKey = (e: KeyboardEvent) => {
      const step = e.shiftKey ? 1 : 0.2;
      let dx = 0;
      let dy = 0;
      if (e.key === 'ArrowLeft') dx = -step;
      else if (e.key === 'ArrowRight') dx = step;
      else if (e.key === 'ArrowUp') dy = -step;
      else if (e.key === 'ArrowDown') dy = step;
      else return;
      e.preventDefault();
      setPositions((p) => {
        const [x, y] = p[selected];
        return { ...p, [selected]: [+(x + dx).toFixed(1), +(y + dy).toFixed(1)] };
      });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [calibrate, selected]);

  const onBoardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!calibrate) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = +(((e.clientX - rect.left) / rect.width) * 100).toFixed(1);
    const y = +(((e.clientY - rect.top) / rect.height) * 100).toFixed(1);
    setPositions((p) => ({ ...p, [selected]: [x, y] }));
    const i = CAL_KEYS.indexOf(selected);
    setSelected(CAL_KEYS[(i + 1) % CAL_KEYS.length]);
  };

  // ---- Action resolution -------------------------------------------------
  const closePanel = () => {
    setActive(null);
    setPending(null);
    setResult([]);
    setSelectedVP(null);
    setSelectedResources([]);
    setSelectedWorker(null);
    setRolledShape(null);
  };

  const resolve = (
    h: Hotspot,
    opts: {
      cannotPlace?: boolean;
      buildingVP?: number;
      minedResources?: Resource[];
      recruitedWorker?: Worker;
      shape?: BreakthroughShape;
      geniusAvailable?: boolean;
    },
  ) => {
    const input: ChronossusActionInput = { actionId: h.action };
    if (opts.cannotPlace) input.noSpaceAvailable = true;
    if (opts.buildingVP != null) input.buildingVP = opts.buildingVP;
    if (opts.minedResources) input.minedResources = opts.minedResources;
    if (opts.recruitedWorker) input.recruitedWorker = opts.recruitedWorker;
    if (opts.shape) input.shape = opts.shape;
    if (opts.geniusAvailable) input.geniusAvailable = true;
    const { state: next, instructions } = Chronossus.resolveAction(state, input);
    setState(next);
    setResult(instructions);
    setLastResult(instructions);
    setPending(null);
  };

  const onTileClick = (h: Hotspot) => {
    if (calibrate) {
      setSelected(hsKey(h.id)); // select instead of activating
      return;
    }
    if (bot.passed) return; // the Chronossus has passed for this Era
    // Passing rule: out of Exosuits + this action would place one → the
    // Chronossus passes instead of taking the action (its token doesn't advance).
    if (Chronossus.wouldPassOn(bot, h.action)) {
      const { state: next, instructions } = Chronossus.passChronossus(state);
      setState(next);
      closePanel();
      setLastResult(instructions); // shown in the turn-status aside
      return;
    }
    setActive(h);
    setResult([]);
    setSelectedVP(null);
    setSelectedResources([]);
    setSelectedWorker(null);
    setRolledShape(null);
    if (h.action === 'mine-resource') {
      setPending('mineOpen');
    } else if (h.action === 'recruit-genius-research') {
      setPending('geniusQuestion');
    } else if (h.action === 'remove-anomaly') {
      setPending('removeAnomaly');
    } else if (h.action === 'reboot') {
      setPending('reboot');
    } else if (h.action === 'time-travel' && bot.warpTilesOnTimeline > 0) {
      setPending('timeTravel');
    } else if (CHRONOBOT_ACTIONS[h.action].placesExosuit) {
      setPending('mech');
    } else {
      resolve(h, {});
    }
  };

  const onConfirmPlace = () => {
    if (!active) return;
    const a = active.action;
    if (a === 'construct-superproject') {
      const hasBreakthrough =
        bot.breakthroughs.circle + bot.breakthroughs.triangle + bot.breakthroughs.square > 0;
      if (bot.superprojects < 3 && hasBreakthrough) {
        setSelectedVP(null);
        setPending('buildingVP');
      } else resolve(active, {});
    } else if (isConstructBuilding(a)) {
      const type = a.replace('construct-', '') as keyof typeof bot.buildings;
      if (bot.buildings[type] < 3) {
        setSelectedVP(null);
        setPending('buildingVP');
      } else resolve(active, {});
    } else if (a === 'recruit') {
      if (Chronobot.chooseRecruitWorker(bot)) {
        setSelectedWorker(Chronobot.recruitWorkerOrder(bot)[0]);
        setPending('recruitWorker');
      } else resolve(active, {});
    } else if (a === 'research' || a === 'recruit-genius-research') {
      setRolledShape(rollShapeDie());
      setPending('research');
    } else {
      resolve(active, {});
    }
  };

  const onCannotPlace = () => {
    if (active) resolve(active, { cannotPlace: true });
  };
  const onMineHasSpace = () => {
    setSelectedResources(Chronobot.mineResourceOrder(bot).slice(0, 2));
    setPending('mineResources');
  };
  const onMineNoSpace = () => {
    if (active) resolve(active, { cannotPlace: true });
  };
  const onPickVP = (vp: number) => setSelectedVP(vp);
  const onPickWorker = (w: Worker) => setSelectedWorker(w);
  const onGeniusYes = () => setPending('geniusRecruit');
  const onGeniusNo = () => setPending('mech');
  const onToggleResource = (r: Resource) => {
    setSelectedResources((cur) => {
      const countR = cur.filter((x) => x === r).length;
      if (countR === 2) return cur.filter((x) => x !== r);
      const next = [...cur, r];
      while (next.length > 2) {
        for (let i = next.length - 1; i >= 0; i--) {
          if (next[i] !== r) {
            next.splice(i, 1);
            break;
          }
        }
      }
      return next;
    });
  };

  const startTurn = () => {
    if (pending === 'buildingVP' && selectedVP != null && active) {
      resolve(active, { buildingVP: selectedVP });
    } else if (pending === 'mineResources' && selectedResources.length === 2 && active) {
      resolve(active, { minedResources: selectedResources });
    } else if (pending === 'recruitWorker' && selectedWorker && active) {
      resolve(active, { recruitedWorker: selectedWorker });
    } else if (pending === 'research' && rolledShape && active) {
      resolve(active, { shape: rolledShape });
    } else if (pending === 'geniusRecruit' && active) {
      resolve(active, { geniusAvailable: true });
    } else if (pending === 'removeAnomaly' && active) {
      resolve(active, {});
    } else if (pending === 'reboot' && active) {
      resolve(active, {});
    } else if (pending === 'timeTravel' && active) {
      resolve(active, {});
    }
    closePanel();
  };

  // ---- Phase transitions -------------------------------------------------
  const drawAndPowerUp = () => {
    const draw = drawEnergyPool(bot.energyPool);
    setLastDraw(draw);
    const next = Chronossus.resolvePowerUp(state, draw);
    setState({ ...next, phase: 'powerup' });
  };
  const endActions = () => {
    closePanel();
    setState(Chronossus.resolveCleanUp(state));
  };
  const afterCleanUp = () => {
    const next = finishEra(state);
    setLastDraw(null);
    setState(next);
  };
  const goPhase = (p: Phase) => {
    closePanel();
    setState((s) => ({ ...s, phase: p }));
  };
  const reset = () => {
    setState(initState());
    closePanel();
    setLastResult([]);
    setLastDraw(null);
    setCalibrate(false);
  };
  const changeEra = (d: number) =>
    setState((s) => ({ ...s, era: Math.max(1, Math.min(Chronossus.MAX_ERA, s.era + d)) }));
  const playerPass = () => {
    closePanel();
    setState((s) => ({ ...s, playerPassed: true }));
  };
  const bothPassed = Chronossus.actionRoundsEnded(state);

  const stats = (
    <div className="cx-stats">
      <span title="Powered Exosuits available">🦾 {bot.exosuitsAvailable} Exo</span>
      <span title="Energy Pool — energized / exhausted">
        🔋 {bot.energyPool.energized}/{bot.energyPool.exhausted}
      </span>
      <span title="Total VP (projected)">⭐ {score.total} VP</span>
    </div>
  );

  // Full top bar — mirrors the Chronobot StatsBar (recolored to the Chronossus
  // scheme). The AI-die / pass / undo / history controls are visible-but-disabled
  // stubs for now (those systems land with the Command-token feature).
  const topBar = (
    <div className="stats-bar cx-statsbar">
      <div className="stats-left">
        <button className="home-btn" onClick={onHome} title="Back to the home screen" aria-label="Home">
          <img src="/favicon-512.png" alt="" />
        </button>
        {debug && (
          <span className="debug-badge on" title="Debug mode is on (see the ⚙ menu)">
            🛠 DEBUG
          </span>
        )}
        {debug && (
          <div className="paradox-ctl" title="Set the Era (1–7)">
            <button onClick={() => changeEra(-1)} disabled={state.era <= 1} aria-label="Previous era">−</button>
            <span className="paradox-ctl-val">Era {state.era}</span>
            <button onClick={() => changeEra(1)} disabled={state.era >= Chronossus.MAX_ERA} aria-label="Next era">+</button>
          </div>
        )}
        {debug && (
          <div className="paradox-ctl" title="Set the number of Paradoxes (0–3)">
            <button onClick={() => setParadoxes((n) => Math.max(0, n - 1))} disabled={paradoxes <= 0} aria-label="Fewer paradoxes">−</button>
            <span className="paradox-ctl-val">P {paradoxes}</span>
            <button onClick={() => setParadoxes((n) => Math.min(3, n + 1))} disabled={paradoxes >= 3} aria-label="More paradoxes">+</button>
          </div>
        )}
      </div>
      {!calibrate && (
        <div className="bot-turn">
          <CxVpPill score={score} totalActions={bot.totalActions} />
          <div className="turn-core">
            <button
              className={`take-bot-action ${bot.passed ? 'passed' : ''}`}
              disabled
              title="Tap an action space on the board to take the Chronossus's turn (AI-die automation lands with the Command-token feature)"
            >
              {bot.passed ? '✓ Bot Passed' : 'Take Bot Action'}
            </button>
            <button
              className="you-pass"
              onClick={playerPass}
              disabled={state.playerPassed}
              title="Pass for the Action Rounds phase"
            >
              {state.playerPassed ? '✓ You passed' : 'You Pass'}
            </button>
            <button className="undo-btn" disabled title="Coming soon — Undo lands with per-turn history">
              ↶ Undo
            </button>
          </div>
          <span className="stat-pill" title="Powered Exosuits available">
            🦾 <b>{bot.exosuitsAvailable}</b> Exo
          </span>
          <span className="stat-pill" title="Energy Pool — energized / exhausted">
            🔋 <b>{bot.energyPool.energized}/{bot.energyPool.exhausted}</b>
          </span>
        </div>
      )}
      <div className="stats-controls">
        <button className="rules-open-btn" disabled title="Coming soon — the Chronossus rules reference">
          📖 <span className="rules-open-label">Rules</span>
        </button>
        <CxSettingsMenu
          debug={debug}
          isAdmin={!!user?.isAdmin}
          onToggleDebug={() => setDebug((d) => !d)}
          calibrate={calibrate}
          onToggleCalibrate={() => {
            closePanel();
            setCalibrate((c) => !c);
          }}
          onReset={reset}
        />
      </div>
    </div>
  );

  // Debug testing rail (below the top bar; admin/debug-only): jump phases, toggle
  // Impact, and end the Action Rounds. Hidden when Debug is off.
  const debugRail = debug && (
    <div className="cx-controls cx-debugrail">
      <span className="cx-debug-label">Debug · jump to phase:</span>
      {PHASE_RAIL.map((p) => (
        <button
          key={p}
          className={state.phase === p ? 'cx-rail on' : 'cx-rail'}
          onClick={() => goPhase(p)}
        >
          {p}
        </button>
      ))}
      <button onClick={() => setState((s) => ({ ...s, impact: !s.impact }))}>
        Impact: {state.impact ? 'AFTER' : 'BEFORE'}
      </button>
      <button onClick={endActions}>End Actions ▶ Clean Up</button>
      <button onClick={reset}>↺ Reset</button>
    </div>
  );

  // ---- Phase 5: Action Rounds (the real board) ---------------------------
  if (state.phase === 'actions') {
    return (
      <div className="chronossus-harness">
        {topBar}
        {debugRail}
        <div className="cx-body">
          <div className="board-stage">
            <div
              className={`board-wrap cx-board ${calibrate ? 'calibrating' : ''}`}
              onClick={onBoardClick}
            >
              <img
                src="/assets/solo/board-chronossus.jpg"
                alt="Chronossus solo board"
                className="board"
              />

              {CHRONOSSUS_ACTION_HOTSPOTS.map((h) => {
                const [l, t] = positions[hsKey(h.id)] ?? HS_CENTER(h);
                const isActive = active?.id === h.id;
                const sel = calibrate && selected === hsKey(h.id);
                return (
                  <button
                    key={h.id}
                    // Transparent click target over the tile printed on the board
                    // (no overlaid image). `outlined` only while calibrating.
                    className={`hotspot ${calibrate ? 'outlined' : ''} ${isActive ? 'active' : ''} ${sel ? 'cal-selected' : ''}`}
                    style={{
                      left: `${l}%`,
                      top: `${t}%`,
                      width: `${hsWidth}%`,
                      height: `${hsHeight}%`,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onTileClick(h);
                    }}
                    title={CHRONOBOT_ACTIONS[h.action].label}
                    aria-label={CHRONOBOT_ACTIONS[h.action].label}
                  />
                );
              })}

              {/* Command markers (tokens 2–5). Selectable in calibrate mode. */}
              {CHRONOSSUS_COMMAND_MARKERS.map((m) => {
                const [x, y] = positions[cmdKey(m.num)] ?? m.pos;
                const sel = calibrate && selected === cmdKey(m.num);
                return (
                  <img
                    key={m.num}
                    src={`/assets/solo/commands/chronossus-marker-${m.num}.png`}
                    alt={`Command token ${m.num}`}
                    className={`cx-cmd-marker ${sel ? 'cal-selected' : ''}`}
                    style={{ left: `${x}%`, top: `${y}%`, width: `${markerWidth}%` }}
                    onClick={
                      calibrate
                        ? (e) => {
                            e.stopPropagation();
                            setSelected(cmdKey(m.num));
                          }
                        : undefined
                    }
                  />
                );
              })}

              {/* Count/track badges (buildings, resources, workers, etc.). */}
              {CHRONOSSUS_COUNTERS.map((c) => {
                const [x, y] = positions[c.key] ?? c.pos;
                const sel = calibrate && selected === c.key;
                return (
                  <div
                    key={c.key}
                    className={`count-badge ${sel ? 'cal-selected' : ''}`}
                    style={{ left: `${x}%`, top: `${y}%` }}
                    title={calibrate ? c.label : `${c.label}: ${counterValue(bot, c.key)}`}
                    onClick={
                      calibrate
                        ? (e) => {
                            e.stopPropagation();
                            setSelected(c.key);
                          }
                        : undefined
                    }
                  >
                    {calibrate ? (sel ? '◎' : '·') : counterValue(bot, c.key)}
                  </div>
                );
              })}

              {/* Time Travel marker — at its track spot; all 7 shown while calibrating. */}
              {calibrate
                ? TT_KEYS.map((key, i) => {
                    const [x, y] = positions[key] ?? CHRONOSSUS_TIME_TRAVEL_TRACK.spots[i];
                    return (
                      <img
                        key={key}
                        src="/assets/solo/timetravel-marker.png"
                        alt=""
                        className={`tt-marker ${selected === key ? 'cal-selected' : 'cal-ghost'}`}
                        style={{ left: `${x}%`, top: `${y}%`, width: `${ttWidth}%` }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelected(key);
                        }}
                      />
                    );
                  })
                : (() => {
                    const spot = Math.min(bot.timeTravelTrack, TT_KEYS.length - 1);
                    const [x, y] = positions[ttKey(spot)] ?? CHRONOSSUS_TIME_TRAVEL_TRACK.spots[spot];
                    return (
                      <img
                        src="/assets/solo/timetravel-marker.png"
                        alt="Time Travel marker"
                        className="tt-marker"
                        style={{ left: `${x}%`, top: `${y}%`, width: `${ttWidth}%` }}
                      />
                    );
                  })()}

              {/* Warp-tile marker (image + count underneath). */}
              {(() => {
                const [wx, wy] = positions[WARP_KEY] ?? CHRONOSSUS_WARP_MARKER.pos;
                const sel = calibrate && selected === WARP_KEY;
                return (
                  <div
                    className={`warp-marker ${sel ? 'cal-selected' : ''}`}
                    style={{ left: `${wx}%`, top: `${wy}%`, width: `${warpWidth}%` }}
                    title={`Chronossus Warp tiles on the Timeline: ${bot.warpTilesOnTimeline}`}
                    onClick={
                      calibrate
                        ? (e) => {
                            e.stopPropagation();
                            setSelected(WARP_KEY);
                          }
                        : undefined
                    }
                  >
                    <img className="warp-img" src="/assets/solo/warp-tile.png" alt="Chronossus Warp tile" />
                    <span className="warp-count">{bot.warpTilesOnTimeline}</span>
                  </div>
                );
              })()}

              {/* Paradox slots — only the placed ones show (all 3 while calibrating). */}
              {PDX_KEYS.map((key, i) => {
                const filled = i < paradoxes;
                if (!calibrate && !filled) return null;
                const [px, py] = positions[key] ?? CHRONOSSUS_PARADOX_SLOTS.slots[i];
                const sel = calibrate && selected === key;
                const rot = i === 1 ? -90 : 90;
                return (
                  <img
                    key={key}
                    src="/assets/solo/paradox.png"
                    alt={`Paradox slot ${i + 1}`}
                    title={`Paradox ${paradoxes}`}
                    className={`paradox-slot ${sel ? 'cal-selected' : ''} ${calibrate && !filled ? 'cal-ghost' : ''}`}
                    style={{
                      left: `${px}%`,
                      top: `${py}%`,
                      width: `${paradoxWidth}%`,
                      transform: `translate(-50%, -50%) rotate(${rot}deg)`,
                    }}
                    onClick={
                      calibrate
                        ? (e) => {
                            e.stopPropagation();
                            setSelected(key);
                          }
                        : undefined
                    }
                  />
                );
              })}

              {!calibrate && active && (
                <DetailPanel
                  hotspot={{ ...active, panel: active.panel ?? CHRONOSSUS_PANEL }}
                  readOnly={false}
                  pending={pending}
                  result={result}
                  selectedVP={selectedVP}
                  selectedResources={selectedResources}
                  selectedWorker={selectedWorker}
                  rolledShape={rolledShape}
                  breakthroughs={bot.breakthroughs}
                  removeAnomaly={(() => {
                    const discards = Chronobot.chooseRemoveAnomalyDiscards(bot);
                    return {
                      canRemove: bot.anomalies >= 1 && discards != null,
                      discards: discards ? describeCubes(discards) : '',
                      reason:
                        bot.anomalies < 1
                          ? 'it has no Anomaly to remove'
                          : 'it lacks 2 Resource cubes (or a Neutronium) to spend',
                    };
                  })()}
                  mineOrder={Chronobot.mineResourceOrder(bot)}
                  workerOrder={Chronobot.recruitWorkerOrder(bot)}
                  botName="Chronossus"
                  onConfirmPlace={onConfirmPlace}
                  onCannotPlace={onCannotPlace}
                  onMineHasSpace={onMineHasSpace}
                  onMineNoSpace={onMineNoSpace}
                  onGeniusYes={onGeniusYes}
                  onGeniusNo={onGeniusNo}
                  onPickVP={onPickVP}
                  onToggleResource={onToggleResource}
                  onPickWorker={onPickWorker}
                  onStartTurn={startTurn}
                  onClose={closePanel}
                />
              )}
            </div>
          </div>
          {calibrate ? (
            <CalibrationPanel
              positions={positions}
              selected={selected}
              onSelect={setSelected}
              hsWidth={hsWidth}
              onHsWidth={setHsWidth}
              hsHeight={hsHeight}
              onHsHeight={setHsHeight}
              markerWidth={markerWidth}
              onMarkerWidth={setMarkerWidth}
              ttWidth={ttWidth}
              onTtWidth={setTtWidth}
              warpWidth={warpWidth}
              onWarpWidth={setWarpWidth}
              paradoxWidth={paradoxWidth}
              onParadoxWidth={setParadoxWidth}
            />
          ) : (
            <aside className="cx-log">
              <h3>Action Rounds</h3>
              {bothPassed ? (
                <div className="cx-turn-end">
                  <p>
                    <b>Both players have passed</b> — the Action Rounds phase is over.
                  </p>
                  <button className="phase-primary" onClick={endActions}>
                    Proceed to Clean Up ▶
                  </button>
                </div>
              ) : (
                <>
                  <ul className="cx-turn-status">
                    <li>
                      Chronossus:{' '}
                      <b>{bot.passed ? 'passed' : `${bot.exosuitsAvailable} Exosuit${bot.exosuitsAvailable === 1 ? '' : 's'} left`}</b>
                    </li>
                    <li>You: <b>{state.playerPassed ? 'passed' : 'active'}</b></li>
                  </ul>
                  <p className="cx-empty">
                    Tap an action space to take the Chronossus's turn. When it runs out of
                    Exosuits it passes an Exosuit-placing action; once you both pass, the phase ends.
                  </p>
                </>
              )}
              {lastResult.length > 0 && (
                <div className="cx-entry cx-last-turn">
                  <b>Last turn</b>
                  {lastResult.map((i, idx) => (
                    <p key={idx}>{i.text}</p>
                  ))}
                </div>
              )}
            </aside>
          )}
        </div>
      </div>
    );
  }

  // ---- End Game: score screen -------------------------------------------
  if (state.phase === 'endgame') {
    return (
      <div className="chronossus-harness">
        {topBar}
        {debugRail}
        <div className="cx-score">
          <h2>Chronossus score</h2>
          <table>
            <tbody>
              <tr><td>During-game VP</td><td>{score.duringGameVP}</td></tr>
              <tr><td>Time Travel track</td><td>{score.timeTravelVP}</td></tr>
              <tr><td>Breakthroughs (1 each)</td><td>{score.breakthroughVP}</td></tr>
              <tr><td>Complete shape sets (+2 each)</td><td>{score.shapeSetBonus}</td></tr>
              <tr className="cx-score-total"><td>Total</td><td>{score.total}</td></tr>
            </tbody>
          </table>
          <p className="phase-note">{CHRONOSSUS_ENDGAME_RULES}</p>
        </div>
      </div>
    );
  }

  // ---- Non-Phase-5 phases: shared PhaseScreen shell ----------------------
  const meta = CHRONOSSUS_PHASE_META[state.phase];
  const phaseProps = {
    era: state.era,
    phaseNumber: meta?.number ?? 0,
    phaseName: meta?.name ?? state.phase,
    overview: meta?.overview,
    onHome,
    hero: HERO,
    statusLabel: 'Chronossus Status',
    heroAlt: 'Chronossus',
    headerRight: stats,
  };

  let body: React.ReactNode;
  switch (state.phase) {
    case 'powerup':
      body = (
        <>
          {meta?.rules && <p className="phase-note">{meta.rules}</p>}
          {lastDraw ? (
            <>
              <p className="cx-drawn">
                Drew <b>{lastDraw.energized}</b> Energy + <b>{lastDraw.exhausted}</b> Exhausted →
                powered up <b>{bot.exosuitsAvailable}</b> Exosuit{bot.exosuitsAvailable === 1 ? '' : 's'}.
                Pool now {bot.energyPool.energized}/{bot.energyPool.exhausted}.
              </p>
              <button className="phase-primary" onClick={() => goPhase('warp')}>Continue to Warp ▶</button>
            </>
          ) : (
            <button className="phase-primary" onClick={drawAndPowerUp}>🔋 Draw 3 from the Energy Pool</button>
          )}
        </>
      );
      break;
    case 'warp':
      body = (
        <>
          {meta?.rules && <p className="phase-note">{meta.rules}</p>}
          <button className="phase-primary" onClick={() => goPhase('actions')}>Continue to Action Rounds ▶</button>
        </>
      );
      break;
    case 'cleanup':
      body = (
        <>
          {meta?.rules && <p className="phase-note">{meta.rules}</p>}
          <button className="phase-primary" onClick={afterCleanUp}>
            {state.era >= Chronossus.MAX_ERA ? 'End the Game ▶' : `Finish Era ${state.era} ▶`}
          </button>
        </>
      );
      break;
    case 'preparation':
      body = (
        <button className="phase-primary" onClick={() => setState(advanceFromPreparation(state))}>
          Continue ▶
        </button>
      );
      break;
    default: // setup, paradox — skeletons for now (reconcile later)
      body = (
        <>
          {meta?.rules && <p className="phase-note">{meta.rules}</p>}
          <p className="phase-note">
            (This phase is a placeholder — its Chronossus-specific behavior is reconciled after
            Phase 5.)
          </p>
          <button className="phase-primary" onClick={() => goPhase('powerup')}>Continue ▶</button>
        </>
      );
  }

  return (
    <>
      {debugRail}
      <PhaseScreen {...phaseProps}>{body}</PhaseScreen>
    </>
  );
}

// --------------------------------------------------------------------------
// Calibration panel — emits paste-ready CHRONOSSUS_ACTION_HOTSPOTS +
// CHRONOSSUS_COMMAND_MARKERS literals.
// --------------------------------------------------------------------------
function CalibrationPanel({
  positions,
  selected,
  onSelect,
  hsWidth,
  onHsWidth,
  hsHeight,
  onHsHeight,
  markerWidth,
  onMarkerWidth,
  ttWidth,
  onTtWidth,
  warpWidth,
  onWarpWidth,
  paradoxWidth,
  onParadoxWidth,
}: {
  positions: Record<string, [number, number]>;
  selected: string;
  onSelect: (k: string) => void;
  hsWidth: number;
  onHsWidth: (w: number) => void;
  hsHeight: number;
  onHsHeight: (h: number) => void;
  markerWidth: number;
  onMarkerWidth: (w: number) => void;
  ttWidth: number;
  onTtWidth: (w: number) => void;
  warpWidth: number;
  onWarpWidth: (w: number) => void;
  paradoxWidth: number;
  onParadoxWidth: (w: number) => void;
}) {
  const hotspotLiteral =
    'export const CHRONOSSUS_ACTION_HOTSPOTS: Hotspot[] = [\n' +
    CHRONOSSUS_ACTION_HOTSPOTS.map((h) => {
      const [cx, cy] = positions[hsKey(h.id)] ?? HS_CENTER(h);
      const left = +(cx - hsWidth / 2).toFixed(1);
      const top = +(cy - hsHeight / 2).toFixed(1);
      return `  { id: '${h.id}', action: '${h.action}', rect: [${left}, ${top}, ${hsWidth}, ${hsHeight}] },`;
    }).join('\n') +
    '\n];';
  const markerLiteral =
    'export const CHRONOSSUS_COMMAND_MARKERS: CommandMarkerPos[] = [\n' +
    CHRONOSSUS_COMMAND_MARKERS.map((m) => {
      const [x, y] = positions[cmdKey(m.num)] ?? m.pos;
      return `  { num: ${m.num}, pos: [${x}, ${y}] },`;
    }).join('\n') +
    '\n];';
  const countersLiteral =
    'export const CHRONOSSUS_COUNTERS: BoardCounter[] = [\n' +
    CHRONOSSUS_COUNTERS.map((c) => {
      const [x, y] = positions[c.key] ?? c.pos;
      return `  { key: '${c.key}', pos: [${x}, ${y}], label: '${c.label}' },`;
    }).join('\n') +
    '\n];';
  const ttLiteral =
    'export const CHRONOSSUS_TIME_TRAVEL_TRACK: TimeTravelTrackLayout = {\n  spots: [\n' +
    TT_KEYS.map((key, i) => {
      const [x, y] = positions[key] ?? CHRONOSSUS_TIME_TRAVEL_TRACK.spots[i];
      return `    [${x}, ${y}],`;
    }).join('\n') +
    `\n  ],\n  markerWidth: ${ttWidth},\n};`;
  const [wx, wy] = positions[WARP_KEY] ?? CHRONOSSUS_WARP_MARKER.pos;
  const warpLiteral =
    `export const CHRONOSSUS_WARP_MARKER: WarpMarkerLayout = {\n  pos: [${wx}, ${wy}],\n  width: ${warpWidth},\n};`;
  const paradoxLiteral =
    'export const CHRONOSSUS_PARADOX_SLOTS: ParadoxLayout = {\n  slots: [\n' +
    PDX_KEYS.map((key, i) => {
      const [x, y] = positions[key] ?? CHRONOSSUS_PARADOX_SLOTS.slots[i];
      return `    [${x}, ${y}],`;
    }).join('\n') +
    `\n  ],\n  width: ${paradoxWidth},\n};`;
  const ttLabel = (i: number) => (i === 0 ? 'TT start (0 VP)' : `TT +${i}`);

  const item = (key: string, label: React.ReactNode, def: [number, number]) => (
    <button
      key={key}
      className={`cal-item ${selected === key ? 'on' : ''}`}
      onClick={() => onSelect(key)}
    >
      {label} <span className="cal-xy">{(positions[key] ?? def).join(', ')}</span>
    </button>
  );
  const sizeSlider = (label: string, value: number, onChange: (w: number) => void, max: number) => (
    <label className="cal-size">
      {label}: <b>{value}%</b>
      <input
        type="range"
        min={1}
        max={max}
        step={0.1}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
      />
    </label>
  );

  return (
    <div className="cal-panel">
      <p className="cal-hint">
        <b>Calibrate.</b> Pick a spot, click the board to place it, then arrow-keys
        nudge (0.2% / Shift = 1%). Copy each group's text back into
        <code> chronossusHotspots.ts</code>.
      </p>

      <details className="cal-group" open>
        <summary>Action spaces ({CHRONOSSUS_ACTION_HOTSPOTS.length})</summary>
        <p className="cal-note">Anchor point = center of the tile box.</p>
        {sizeSlider('Tile width', hsWidth, onHsWidth, 20)}
        {sizeSlider('Tile height', hsHeight, onHsHeight, 20)}
        <div className="cal-list">
          {CHRONOSSUS_ACTION_HOTSPOTS.map((h) =>
            item(hsKey(h.id), CHRONOBOT_ACTIONS[h.action].label, HS_CENTER(h)),
          )}
        </div>
        <textarea className="cal-out" readOnly value={hotspotLiteral} />
      </details>

      <details className="cal-group">
        <summary>Command markers ({CHRONOSSUS_COMMAND_MARKERS.length})</summary>
        {sizeSlider('Marker width', markerWidth, onMarkerWidth, 12)}
        <div className="cal-list">
          {CHRONOSSUS_COMMAND_MARKERS.map((m) => item(cmdKey(m.num), `Token ${m.num}`, m.pos))}
        </div>
        <textarea className="cal-out" readOnly value={markerLiteral} />
      </details>

      <details className="cal-group">
        <summary>Count badges ({CHRONOSSUS_COUNTERS.length})</summary>
        <div className="cal-list">
          {CHRONOSSUS_COUNTERS.map((c) => item(c.key, c.label, c.pos))}
        </div>
        <textarea className="cal-out" readOnly value={countersLiteral} />
      </details>

      <details className="cal-group">
        <summary>Time Travel track ({TT_KEYS.length})</summary>
        {sizeSlider('Marker width', ttWidth, onTtWidth, 12)}
        <div className="cal-list">
          {TT_KEYS.map((key, i) => item(key, ttLabel(i), CHRONOSSUS_TIME_TRAVEL_TRACK.spots[i]))}
        </div>
        <textarea className="cal-out" readOnly value={ttLiteral} />
      </details>

      <details className="cal-group">
        <summary>Warp marker</summary>
        {sizeSlider('Marker width', warpWidth, onWarpWidth, 12)}
        <div className="cal-list">{item(WARP_KEY, 'Warp tile', CHRONOSSUS_WARP_MARKER.pos)}</div>
        <textarea className="cal-out" readOnly value={warpLiteral} />
      </details>

      <details className="cal-group">
        <summary>Paradox slots ({PDX_KEYS.length})</summary>
        {sizeSlider('Slot width', paradoxWidth, onParadoxWidth, 12)}
        <div className="cal-list">
          {PDX_KEYS.map((key, i) => item(key, `Paradox ${i + 1}`, CHRONOSSUS_PARADOX_SLOTS.slots[i]))}
        </div>
        <textarea className="cal-out" readOnly value={paradoxLiteral} />
      </details>
    </div>
  );
}

// --------------------------------------------------------------------------
// Top-bar sub-components (mirror the Chronobot's VpPill + SettingsMenu, reusing
// the shared .stats-bar classes; recolored to Chronossus via .chronossus-harness).
// --------------------------------------------------------------------------

/** Expandable VP pill → a Chronossus score breakdown popover. */
function CxVpPill({
  score,
  totalActions,
}: {
  score: ReturnType<typeof Chronossus.scoreChronossus>;
  totalActions: number;
}) {
  const [open, setOpen] = useState(false);
  const pillRef = useRef<HTMLButtonElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest('.vp-pill-wrap') && !t.closest('.vp-popover')) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);
  const toggle = () =>
    setOpen((o) => {
      if (!o && pillRef.current) setRect(pillRef.current.getBoundingClientRect());
      return !o;
    });
  return (
    <div className="vp-pill-wrap">
      <button
        ref={pillRef}
        type="button"
        className={`stat-pill lead vp-pill ${open ? 'open' : ''}`}
        onClick={toggle}
        title="Click for the full VP breakdown"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span className="vp-caret">{open ? '▾' : '▸'}</span>
        <span className="vp-seg">
          <b>{score.total}</b> VP
        </span>
      </button>
      {open && (
        <AnchoredPopover rect={rect} className="vp-popover cx-vp-popover">
          <div className="vp-popover-title">Chronossus VP</div>
          <ul className="score-breakdown">
            <li title="Everything except Buildings, Time Travel & Breakthroughs">
              <span>Token VP</span><b>{score.tokenVP}</b>
            </li>
            <li title="From Construct actions (Buildings & Superprojects)">
              <span>Building VP</span><b>{score.buildingVP}</b>
            </li>
            <li title="From the Time Travel marker's track position (0/2/4/…/12)">
              <span>Time Travel</span><b>{score.timeTravelVP}</b>
            </li>
            <li title="1 VP per Breakthrough">
              <span>Breakthroughs (1 each)</span><b>{score.breakthroughVP}</b>
            </li>
            <li title="+2 VP per complete shape set (one of each)">
              <span>Breakthrough sets (+2 each)</span><b>{score.shapeSetBonus}</b>
            </li>
            <li className="score-sum"><span>Total</span><b>{score.total}</b></li>
            <li className="score-turns"><span>Bot turns taken</span><b>{totalActions}</b></li>
          </ul>
        </AnchoredPopover>
      )}
    </div>
  );
}

/** Top-right ⚙ menu: Debug toggle + Calibrate (admin), and Reset Game. */
function CxSettingsMenu({
  debug,
  isAdmin,
  onToggleDebug,
  calibrate,
  onToggleCalibrate,
  onReset,
}: {
  debug: boolean;
  isAdmin: boolean;
  onToggleDebug: () => void;
  calibrate: boolean;
  onToggleCalibrate: () => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.settings-menu')) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <div className="settings-menu">
      <button
        className={`gear-btn ${debug ? 'debug-on' : ''} ${open ? 'on' : ''}`}
        onClick={() => setOpen((o) => !o)}
        title="Settings"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        ⚙
      </button>
      {open && (
        <div className="settings-dropdown" role="menu">
          {isAdmin && (
            <>
              <button
                className="settings-item toggle"
                onClick={onToggleDebug}
                role="menuitemcheckbox"
                aria-checked={debug}
              >
                <span>Debug mode</span>
                <span className={`sw ${debug ? 'on' : ''}`}>{debug ? 'ON' : 'OFF'}</span>
              </button>
              {debug && (
                <button
                  className="settings-item toggle sub"
                  onClick={onToggleCalibrate}
                  role="menuitemcheckbox"
                  aria-checked={calibrate}
                >
                  <span>Calibrate positions</span>
                  <span className={`sw ${calibrate ? 'on' : ''}`}>{calibrate ? 'ON' : 'OFF'}</span>
                </button>
              )}
              <div className="settings-sep" />
            </>
          )}
          <button className="settings-item danger" onClick={onReset} role="menuitem">
            ⟳ Reset Game
          </button>
        </div>
      )}
    </div>
  );
}
