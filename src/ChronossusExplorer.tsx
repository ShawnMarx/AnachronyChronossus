// ChronossusExplorer — a Phase-5 debug harness for the Chronossus.
//
// Goal (first slice): boot straight into the Action Rounds phase with 4 powered
// Exosuits and let the tester TAP each action space to see the bot's action
// resolve correctly. No Command-token paths, no AI die — direct activation.
// Positions of the hotspots are placeholders (see chronossusHotspots.ts); every
// space is outlined + labeled so activation is verifiable before calibration.

import { useState } from 'react';
import './BoardExplorer.css';
import './ChronossusExplorer.css';
import {
  Chronossus,
  createInitialState,
  emptyChronossusState,
  rollShapeDie,
  type GameState,
} from './engine';
import type { ChronossusActionInput } from './engine/bots/chronossus';
import { CHRONOSSUS_HOTSPOTS, type ChronossusHotspot } from './board/chronossusHotspots';

const DEBUG_EXOSUITS = 4;

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

export default function ChronossusExplorer({ onHome }: { onHome: () => void }) {
  const [state, setState] = useState<GameState>(initState);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [noSpace, setNoSpace] = useState(false);
  const bot = state.chronossus!;

  const takeAction = (h: ChronossusHotspot) => {
    const input: ChronossusActionInput = { actionId: h.action };
    if (noSpace) input.noSpaceAvailable = true;
    if (h.action === 'research') input.shape = rollShapeDie();
    if (h.action === 'recruit-genius-research') {
      input.geniusAvailable = true; // harness assumption
    }
    const { state: next, instructions } = Chronossus.resolveAction(state, input);
    setState(next);
    setEntries((prev) => [
      { key: Date.now() + Math.random(), label: h.label, lines: instructions.map((i) => i.text) },
      ...prev,
    ]);
  };

  const reset = () => {
    setState(initState());
    setEntries([]);
    setNoSpace(false);
  };

  return (
    <div className="chronossus-harness">
      <header className="cx-topbar">
        <button className="cx-home" onClick={onHome} title="Home">
          ⌂ Home
        </button>
        <span className="cx-title">Chronossus · Phase 5 (Action Rounds) · Debug harness</span>
        <div className="cx-stats">
          <span title="Powered Exosuits available">🦾 {bot.exosuitsAvailable} Exo</span>
          <span title="Energy Pool — energized / exhausted">
            🔋 {bot.energyPool.energized}/{bot.energyPool.exhausted}
          </span>
          <span title="Victory Points">⭐ {bot.vp} VP</span>
          <span title="Actions taken">▶ {bot.totalActions}</span>
        </div>
      </header>

      <div className="cx-controls">
        <button onClick={() => setState((s) => ({ ...s, impact: !s.impact }))}>
          Impact: {state.impact ? 'AFTER' : 'BEFORE'}
        </button>
        <label className="cx-check">
          <input type="checkbox" checked={noSpace} onChange={(e) => setNoSpace(e.target.checked)} />
          Simulate “no space available”
        </label>
        <button onClick={reset}>↺ Reset (4 Exosuits)</button>
      </div>

      <div className="cx-body">
        <div className="board-wrap cx-board">
          <img src="/assets/solo/board-chronossus.jpg" alt="Chronossus solo board" className="board" />
          {CHRONOSSUS_HOTSPOTS.map((h) => (
            <button
              key={h.id}
              className={`hotspot outlined cx-hotspot ${h.id.startsWith('tile-') ? 'cx-tile' : ''}`}
              style={{
                left: `${h.rect[0]}%`,
                top: `${h.rect[1]}%`,
                width: `${h.rect[2]}%`,
                height: `${h.rect[3]}%`,
              }}
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
