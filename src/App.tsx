import { useState } from 'react';
import './App.css';
import { listBots, type BotModeId, type GameConfig } from './engine';
import { useGame } from './useGame';

const bots = listBots();

function App() {
  const { state, start, next, reset } = useGame();
  const [bot, setBot] = useState<BotModeId>('chronossus');

  if (!state) {
    return (
      <main className="setup">
        <h1>Anachrony Chronossus</h1>
        <p className="subtitle">Solo-guide for the Anachrony automa &amp; Chronobot</p>
        <label className="field">
          <span>Opponent</span>
          <select value={bot} onChange={(e) => setBot(e.target.value as BotModeId)}>
            {bots.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <p className="hint">{bots.find((b) => b.id === bot)?.description}</p>
        <button
          type="button"
          className="primary"
          onClick={() => {
            const config: GameConfig = { bot, expansions: ['base'] };
            start(config);
          }}
        >
          Start game
        </button>
      </main>
    );
  }

  return (
    <main className="game">
      <header>
        <h1>{bots.find((b) => b.id === state.config.bot)?.name}</h1>
        <span className="era">Era {state.era}</span>
        <button type="button" className="ghost" onClick={reset}>
          New game
        </button>
      </header>

      <section className="turn">
        <h2>This turn</h2>
        <ol>
          {state.currentTurn.map((ins) => (
            <li key={ins.id}>
              <strong>{ins.text}</strong>
              {ins.detail && <p className="detail">{ins.detail}</p>}
            </li>
          ))}
        </ol>
        <button type="button" className="primary" onClick={next}>
          Complete era &amp; continue
        </button>
      </section>

      {state.log.length > 0 && (
        <section className="log">
          <h3>Log</h3>
          <ul>
            {state.log.map((entry, i) => (
              <li key={i}>{entry}</li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

export default App;
