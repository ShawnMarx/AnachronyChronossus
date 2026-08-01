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

import { useEffect, useState } from 'react';
import './BoardExplorer.css';
import './ChronossusExplorer.css';
import './phases/phases.css';
import PhaseScreen from './phases/PhaseScreen';
import { CHRONOSSUS_PHASE_META, CHRONOSSUS_ENDGAME_RULES } from './phases/chronossusPhaseMeta';
import { DetailPanel, type PendingStep } from './BoardExplorer';
import {
  Chronobot,
  Chronossus,
  CHRONOBOT_ACTIONS,
  createInitialState,
  emptyChronossusState,
  drawEnergyPool,
  rollShapeDie,
  type GameState,
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
} from './board/chronossusHotspots';
import type { Hotspot } from './board/chronobotHotspots';

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
const HS_CENTER = (h: Hotspot): [number, number] => [
  h.rect[0] + h.rect[2] / 2,
  h.rect[1] + h.rect[3] / 2,
];
const CAL_KEYS: string[] = [
  ...CHRONOSSUS_ACTION_HOTSPOTS.map((h) => hsKey(h.id)),
  ...CHRONOSSUS_COMMAND_MARKERS.map((m) => cmdKey(m.num)),
];

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

  // ---- Calibrate mode ----------------------------------------------------
  const [calibrate, setCalibrate] = useState(false);
  const [positions, setPositions] = useState<Record<string, [number, number]>>(() => {
    const seed: Record<string, [number, number]> = {};
    for (const h of CHRONOSSUS_ACTION_HOTSPOTS) seed[hsKey(h.id)] = HS_CENTER(h);
    for (const m of CHRONOSSUS_COMMAND_MARKERS) seed[cmdKey(m.num)] = m.pos;
    return seed;
  });
  const [selected, setSelected] = useState<string>(CAL_KEYS[0]);
  const [hsWidth, setHsWidth] = useState<number>(CHRONOSSUS_ACTION_HOTSPOTS[0].rect[2]);
  const [hsHeight, setHsHeight] = useState<number>(CHRONOSSUS_ACTION_HOTSPOTS[0].rect[3]);
  const [markerWidth, setMarkerWidth] = useState<number>(5);

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
    setPending(null);
  };

  const onTileClick = (h: Hotspot) => {
    if (calibrate) {
      setSelected(hsKey(h.id)); // select instead of activating
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
    setLastDraw(null);
    setCalibrate(false);
  };

  const stats = (
    <div className="cx-stats">
      <span title="Powered Exosuits available">🦾 {bot.exosuitsAvailable} Exo</span>
      <span title="Energy Pool — energized / exhausted">
        🔋 {bot.energyPool.energized}/{bot.energyPool.exhausted}
      </span>
      <span title="Total VP (projected)">⭐ {score.total} VP</span>
    </div>
  );

  const debugRail = (
    <div className="cx-controls">
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
      <button onClick={reset}>↺ Reset</button>
    </div>
  );

  // ---- Phase 5: Action Rounds (the real board) ---------------------------
  if (state.phase === 'actions') {
    return (
      <div className="chronossus-harness">
        <header className="cx-topbar">
          <button className="cx-home" onClick={onHome} title="Home">
            ⌂ Home
          </button>
          <span className="cx-title">
            Chronossus · Era {state.era} · Phase 5 (Action Rounds)
          </span>
          {stats}
        </header>
        {debugRail}
        <div className="cx-controls">
          <button onClick={() => setState((s) => ({ ...s, impact: !s.impact }))}>
            Impact: {state.impact ? 'AFTER' : 'BEFORE'}
          </button>
          <label className="cx-check">
            <input
              type="checkbox"
              checked={calibrate}
              onChange={(e) => {
                closePanel();
                setCalibrate(e.target.checked);
              }}
            />
            Calibrate positions
          </label>
          <button onClick={endActions}>End Actions ▶ Clean Up</button>
        </div>
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
            />
          ) : (
            <aside className="cx-log">
              <h3>How to play Phase 5</h3>
              <p className="cx-empty">
                Tap an action space to open its turn dialog — the pop-up matches the
                Chronobot's exactly. (Command-token paths + the AI die come later.)
              </p>
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
        <header className="cx-topbar">
          <button className="cx-home" onClick={onHome}>⌂ Home</button>
          <span className="cx-title">Chronossus · End Game</span>
          {stats}
        </header>
        {debugRail}
        <div className="cx-score">
          <h2>Chronossus score</h2>
          <table>
            <tbody>
              <tr><td>During-game VP</td><td>{score.duringGameVP}</td></tr>
              <tr><td>Time Travel track</td><td>{score.timeTravelVP}</td></tr>
              <tr><td>Breakthroughs (1 each)</td><td>{score.breakthroughVP}</td></tr>
              <tr><td>Complete shape sets (+2 each)</td><td>{score.shapeSetBonus}</td></tr>
              <tr><td>Solo Objectives (F5)</td><td>{score.soloObjectiveVP}</td></tr>
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
    </div>
  );
}
