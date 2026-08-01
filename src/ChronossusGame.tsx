// ChronossusGame — the full guided Era flow for the Chronossus.
//
// Structure mirrors the Chronobot (Setup → 1 Preparation → 2 Paradox → 3 Power Up
// → 4 Warp → 5 Action Rounds → 6 Clean Up → next Era | End Game) but uses the
// Chronossus engine + board. It reuses the shared PhaseScreen shell (now
// parameterised with the Chronossus hero/label) and flow.ts sequencing.
//
// DEV STANCE (per plan): boots straight into Phase 5 with 4 powered Exosuits so we
// can reconcile the Action Rounds first. The non-Phase-5 phase bodies are honest
// skeletons for now (overview + Continue / the one engine step that's wired) — we
// reconcile their differences next. A debug phase rail lets you jump around.

import { useState } from 'react';
import './BoardExplorer.css';
import './ChronossusExplorer.css';
import './phases/phases.css';
import PhaseScreen from './phases/PhaseScreen';
import { CHRONOSSUS_PHASE_META, CHRONOSSUS_ENDGAME_RULES } from './phases/chronossusPhaseMeta';
import {
  Chronossus,
  createInitialState,
  emptyChronossusState,
  drawEnergyPool,
  rollShapeDie,
  type GameState,
  type Phase,
} from './engine';
import { finishEra, advanceFromPreparation } from './game/flow';
import type { ChronossusActionInput, EnergyDraw } from './engine/bots/chronossus';
import { CHRONOSSUS_HOTSPOTS, type ChronossusHotspot } from './board/chronossusHotspots';

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

interface LogEntry {
  key: number;
  label: string;
  lines: string[];
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

export default function ChronossusGame({ onHome }: { onHome: () => void }) {
  const [state, setState] = useState<GameState>(initState);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [noSpace, setNoSpace] = useState(false);
  const [lastDraw, setLastDraw] = useState<EnergyDraw | null>(null);
  const bot = state.chronossus!;
  const score = Chronossus.scoreChronossus(bot);

  const log = (label: string, lines: string[]) =>
    setEntries((prev) => [{ key: Date.now() + Math.random(), label, lines }, ...prev]);

  // ---- Phase 5: tap an action space -------------------------------------
  const takeAction = (h: ChronossusHotspot) => {
    const input: ChronossusActionInput = { actionId: h.action };
    if (noSpace) input.noSpaceAvailable = true;
    if (h.action === 'research') input.shape = rollShapeDie();
    if (h.action === 'recruit-genius-research') input.geniusAvailable = true;
    const { state: next, instructions } = Chronossus.resolveAction(state, input);
    setState(next);
    log(h.label, instructions.map((i) => i.text));
  };

  // ---- Phase transitions -------------------------------------------------
  const drawAndPowerUp = () => {
    const draw = drawEnergyPool(bot.energyPool);
    setLastDraw(draw);
    // resolvePowerUp advances to 'warp'; stay on 'powerup' to show the draw result,
    // then the "Continue to Warp" button moves on.
    const next = Chronossus.resolvePowerUp(state, draw);
    setState({ ...next, phase: 'powerup' });
  };
  const endActions = () => setState(Chronossus.resolveCleanUp(state));
  const afterCleanUp = () => {
    const next = finishEra(state); // → endgame, or startNextEra (→ preparation)
    setLastDraw(null);
    setState(next);
  };
  const goPhase = (p: Phase) => setState((s) => ({ ...s, phase: p }));
  const reset = () => {
    setState(initState());
    setEntries([]);
    setNoSpace(false);
    setLastDraw(null);
  };

  // Small stats pill reused across phases.
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

  // ---- Phase 5: Action Rounds (the board harness) ------------------------
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
            <input type="checkbox" checked={noSpace} onChange={(e) => setNoSpace(e.target.checked)} />
            Simulate “no space available”
          </label>
          <button onClick={endActions}>End Actions ▶ Clean Up</button>
        </div>
        <div className="cx-body">
          <div className="board-wrap cx-board">
            <img src="/assets/solo/board-chronossus.jpg" alt="Chronossus solo board" className="board" />
            {CHRONOSSUS_HOTSPOTS.map((h) => (
              <button
                key={h.id}
                className={`hotspot outlined cx-hotspot ${h.id.startsWith('tile-') ? 'cx-tile' : ''}`}
                style={{ left: `${h.rect[0]}%`, top: `${h.rect[1]}%`, width: `${h.rect[2]}%`, height: `${h.rect[3]}%` }}
                onClick={() => takeAction(h)}
                title={h.label}
              >
                <span className="cx-hotspot-label">{h.label}</span>
              </button>
            ))}
          </div>
          <aside className="cx-log">
            <h3>Activation log</h3>
            {entries.length === 0 && <p className="cx-empty">Tap any action space on the board.</p>}
            {entries.map((e) => (
              <div className="cx-entry" key={e.key}>
                <b>{e.label}</b>
                {e.lines.map((l, i) => (
                  <p key={i}>{l}</p>
                ))}
              </div>
            ))}
          </aside>
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
