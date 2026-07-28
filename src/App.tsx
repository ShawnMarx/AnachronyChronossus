import { useMemo, useState } from 'react';
import './App.css';
import {
  AI_DIE_FACES,
  CHRONOBOT_ACTIONS,
  Chronobot,
  listBots,
  rollAiDie,
  rollShapeDie,
  type BotModeId,
  type BreakthroughShape,
  type GameConfig,
  type Instruction,
} from './engine';
import type { ChronobotActionId } from './engine/rules/chronobotActions';
import { useGame } from './useGame';

const bots = listBots();

const DIFFICULTY_OPTIONS: { id: string; label: string }[] = [
  { id: 'reboot-advance', label: 'Advance the token when it lands on Reboot' },
  { id: 'no-leader', label: 'Play without your Leader power' },
  { id: 'extra-turn', label: 'Chronobot takes one extra turn after you pass' },
  { id: 'min-6', label: 'Raise the Chronobot minimum from 3 to 6 Actions' },
];

// Actions shown in the Action-Rounds picker, grouped for scanning.
const ACTION_GROUPS: { title: string; ids: ChronobotActionId[] }[] = [
  { title: 'Gather', ids: ['mine-resource', 'research', 'recruit', 'recruit-genius-research'] },
  {
    title: 'Construct',
    ids: [
      'construct-factory',
      'construct-lab',
      'construct-powerplant',
      'construct-support',
      'construct-superproject',
    ],
  },
  { title: 'Timeline / Other', ids: ['time-travel', 'remove-anomaly', 'reboot', 'evacuation'] },
];

function App() {
  const game = useGame();
  const [bot, setBot] = useState<BotModeId>('chronobot');
  const [difficulty, setDifficulty] = useState<string[]>([]);

  if (!game.state) {
    return (
      <SetupScreen
        bot={bot}
        setBot={setBot}
        difficulty={difficulty}
        setDifficulty={setDifficulty}
        onStart={() => {
          const config: GameConfig = {
            bot,
            expansions: ['base'],
            difficulty,
            playerBoardSide: 'A',
          };
          game.start(config);
        }}
      />
    );
  }

  const { state } = game;
  const meta = bots.find((b) => b.id === state.config.bot);

  if (!meta?.implemented) {
    return (
      <main className="game">
        <p className="notice">
          {meta?.name} isn’t implemented yet — {meta?.description}
        </p>
        <button className="ghost" onClick={game.reset}>
          Back
        </button>
      </main>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1>{meta?.name}</h1>
          <span className="era">
            Era {state.era} · <span className="phase">{state.phase}</span>
          </span>
        </div>
        <div className="topbar-actions">
          <label className="impact-toggle">
            <input
              type="checkbox"
              checked={state.impact}
              onChange={(e) => game.setImpact(e.target.checked)}
            />
            Impact has happened
          </label>
          <button className="ghost" onClick={game.reset}>
            New game
          </button>
        </div>
      </header>

      <div className="columns">
        <main className="main-col">
          <PhasePanel game={game} />
          <InstructionList instructions={state.currentInstructions} />
        </main>
        <aside className="side-col">
          <BotStatus game={game} />
          <BoardView />
          <LogView log={state.log} />
        </aside>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------

function SetupScreen(props: {
  bot: BotModeId;
  setBot: (b: BotModeId) => void;
  difficulty: string[];
  setDifficulty: (d: string[]) => void;
  onStart: () => void;
}) {
  const meta = bots.find((b) => b.id === props.bot);
  return (
    <main className="setup">
      <h1>Anachrony Solo Guide</h1>
      <p className="subtitle">
        Run the solo automa turn by turn — the app rolls the dice and makes the
        bot’s decisions; you just move the pieces.
      </p>

      <label className="field">
        <span>Opponent</span>
        <select value={props.bot} onChange={(e) => props.setBot(e.target.value as BotModeId)}>
          {bots.map((b) => (
            <option key={b.id} value={b.id} disabled={!b.implemented}>
              {b.name}
              {b.implemented ? '' : ' (coming soon)'}
            </option>
          ))}
        </select>
      </label>
      <p className="hint">{meta?.description}</p>

      <fieldset className="field">
        <legend>Increase difficulty (optional)</legend>
        {DIFFICULTY_OPTIONS.map((opt) => (
          <label key={opt.id} className="check">
            <input
              type="checkbox"
              checked={props.difficulty.includes(opt.id)}
              onChange={(e) => {
                props.setDifficulty(
                  e.target.checked
                    ? [...props.difficulty, opt.id]
                    : props.difficulty.filter((d) => d !== opt.id),
                );
              }}
            />
            {opt.label}
          </label>
        ))}
      </fieldset>

      <button
        type="button"
        className="primary"
        disabled={!meta?.implemented}
        onClick={props.onStart}
      >
        Start game
      </button>

      <img
        src="/assets/solo/board-chronobot.jpg"
        alt="Anachrony solo board"
        className="setup-hero"
      />
    </main>
  );
}

// --------------------------------------------------------------------------

type Game = ReturnType<typeof useGame>;

function PhasePanel({ game }: { game: Game }) {
  const state = game.state!;
  switch (state.phase) {
    case 'setup':
      return (
        <section className="phase-panel">
          <h2>Setup</h2>
          <InstructionList instructions={state.currentInstructions} embedded />
          <button className="primary" onClick={game.beginEra}>
            Begin Era 1
          </button>
        </section>
      );
    case 'paradox':
      return (
        <section className="phase-panel">
          <h2>Paradox Phase</h2>
          <p className="explain">
            The Chronobot rolls for Paradoxes last. Resolve its Paradox roll on
            the table; if it gains an Anomaly it stops rolling and removes one of
            its Warp tiles from the Timeline tile where it has the most.
          </p>
          <div className="btn-row">
            <button className="primary" onClick={() => game.resolveParadox(true)}>
              It gained an Anomaly
            </button>
            <button className="secondary" onClick={() => game.resolveParadox(false)}>
              No Anomaly
            </button>
          </div>
        </section>
      );
    case 'powerup':
      return (
        <section className="phase-panel">
          <h2>Power Up Phase</h2>
          <p className="explain">
            {state.impact ? 'Post-Impact: power up 4.' : 'Pre-Impact: power up 6.'}{' '}
            The Chronobot spends no Energy or Water.
          </p>
          <button className="primary" onClick={game.powerUp}>
            Power up the Chronobot
          </button>
        </section>
      );
    case 'warp':
      return (
        <section className="phase-panel">
          <h2>Warp Phase</h2>
          <p className="explain">
            The app rolls the Paradox die for the Chronobot and it places that
            many Warp tiles. You place your own 0–2 as normal.
          </p>
          <button className="primary" onClick={game.rollWarp}>
            Roll &amp; place the Chronobot’s Warp tiles
          </button>
          {game.lastParadoxRoll !== null && (
            <p className="rolled">Paradox die rolled: {game.lastParadoxRoll}</p>
          )}
        </section>
      );
    case 'actions':
      return <ActionRoundsPanel game={game} />;
    case 'cleanup':
      return (
        <section className="phase-panel">
          <h2>Clean Up Phase</h2>
          <InstructionList instructions={state.currentInstructions} embedded />
          <div className="btn-row">
            <button className="primary" onClick={game.nextEra}>
              Next Era →
            </button>
            <button className="secondary" onClick={game.endGame}>
              End game &amp; score
            </button>
          </div>
        </section>
      );
    case 'endgame':
      return <EndGamePanel game={game} />;
    default:
      return null;
  }
}

// --------------------------------------------------------------------------

function ActionRoundsPanel({ game }: { game: Game }) {
  const state = game.state!;
  const bot = state.chronobot;
  const [die, setDie] = useState<number | null>(null);
  const [picked, setPicked] = useState<ChronobotActionId | null>(null);
  const [geniusAvailable, setGeniusAvailable] = useState(false);
  const [noSpace, setNoSpace] = useState(false);

  const decision = Chronobot.botPassDecision(state);
  const canEnd = Chronobot.actionRoundsCanEnd(state);

  const resolve = () => {
    if (!picked || die === null) return;
    const needsShape =
      picked === 'research' ||
      (picked === 'recruit-genius-research' && !geniusAvailable);
    game.takeActionTurn({
      dieRoll: die,
      actionId: picked,
      shape: needsShape ? rollShapeDie() : undefined,
      geniusAvailable,
      noSpaceAvailable: noSpace,
    });
    setDie(null);
    setPicked(null);
    setGeniusAvailable(false);
    setNoSpace(false);
  };

  return (
    <section className="phase-panel">
      <h2>Action Rounds</h2>
      <div className="ar-status">
        <Stat label="Exosuits left" value={bot.exosuitsAvailable} />
        <Stat label="Actions this Era" value={bot.actionsThisEra} />
        <span className={`pass-flag ${state.playerPassed ? 'on' : ''}`}>
          You: {state.playerPassed ? 'passed' : 'active'}
        </span>
        <span className={`pass-flag ${bot.passed ? 'on' : ''}`}>
          Bot: {bot.passed ? 'passed' : 'active'}
        </span>
      </div>

      <p className="explain">
        On the Chronobot’s turn, roll the AI die, then tap the action shown on the
        matching Command token’s current space (check the board). The app makes the
        decision and tells you exactly what to do, then you advance that token along
        its colored arrow.
      </p>

      <div className="die-row">
        <button
          className="primary"
          onClick={() => setDie(rollAiDie(AI_DIE_FACES))}
          disabled={!Chronobot.botHasExosuit(bot) && decision !== 'time-travel-then-pass'}
        >
          🎲 Roll the AI die for the Chronobot
        </button>
        {die !== null && (
          <span className="die-result">
            Rolled <strong>{die}</strong> → act with Command token {die}
          </span>
        )}
      </div>

      {die !== null && (
        <>
          <div className="action-grid">
            {ACTION_GROUPS.map((group) => (
              <div key={group.title} className="action-group">
                <h4>{group.title}</h4>
                {group.ids.map((id) => {
                  const def = CHRONOBOT_ACTIONS[id];
                  return (
                    <button
                      key={id}
                      className={`action-card ${picked === id ? 'selected' : ''}`}
                      onClick={() => setPicked(id)}
                    >
                      <strong>{def.label}</strong>
                      <span>{def.summary}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {picked && (
            <div className="resolve-box">
              <p className="jit">
                <strong>Why:</strong> {CHRONOBOT_ACTIONS[picked].jit}
              </p>
              {picked === 'recruit-genius-research' && (
                <label className="check">
                  <input
                    type="checkbox"
                    checked={geniusAvailable}
                    onChange={(e) => setGeniusAvailable(e.target.checked)}
                  />
                  A Genius is available to recruit
                </label>
              )}
              <label className="check">
                <input
                  type="checkbox"
                  checked={noSpace}
                  onChange={(e) => setNoSpace(e.target.checked)}
                />
                No Action space available (Failed, no Exosuit, +1 VP)
              </label>
              <button className="primary" onClick={resolve}>
                Resolve the Chronobot’s action
              </button>
            </div>
          )}
        </>
      )}

      <div className="pass-controls">
        <p className="decision-hint">{describeDecision(decision)}</p>
        <div className="btn-row">
          {!state.playerPassed && (
            <button className="secondary" onClick={game.playerPass}>
              I pass
            </button>
          )}
          {!bot.passed && decision !== 'continue' && (
            <button className="secondary" onClick={game.botPass}>
              Chronobot passes
            </button>
          )}
          <button className="primary" onClick={game.cleanUp} disabled={!canEnd}>
            End Action Rounds →
          </button>
        </div>
      </div>
    </section>
  );
}

function describeDecision(
  d: ReturnType<typeof Chronobot.botPassDecision>,
): string {
  switch (d) {
    case 'continue':
      return 'The Chronobot still has Exosuits — keep alternating turns.';
    case 'continue-extra':
      return 'Difficulty: the Chronobot takes one additional turn after you passed.';
    case 'must-continue-min3':
      return 'The Chronobot is out of Exosuits but has not taken 3 Actions yet — it keeps taking turns (Time Travel / Reboot) until it reaches 3.';
    case 'time-travel-then-pass':
      return 'The Chronobot is out of Exosuits. It takes a Time Travel action if able, then passes.';
    case 'pass':
      return 'The Chronobot has passed for this Era.';
  }
}

// --------------------------------------------------------------------------

function EndGamePanel({ game }: { game: Game }) {
  const state = game.state!;
  const score = Chronobot.scoreChronobot(state.chronobot);
  const [playerScore, setPlayerScore] = useState('');
  const ps = Number(playerScore);
  const result =
    playerScore === '' || Number.isNaN(ps)
      ? null
      : ps > score.total
        ? 'win'
        : 'lose';
  return (
    <section className="phase-panel">
      <h2>Final Score</h2>
      <table className="score">
        <tbody>
          <tr>
            <td>VP during the game</td>
            <td>{score.duringGameVP}</td>
          </tr>
          <tr>
            <td>Breakthroughs (1 each)</td>
            <td>{score.breakthroughVP}</td>
          </tr>
          <tr>
            <td>Complete shape sets (2 each)</td>
            <td>{score.shapeSetBonus}</td>
          </tr>
          <tr className="total">
            <td>Chronobot total</td>
            <td>{score.total}</td>
          </tr>
        </tbody>
      </table>
      <label className="field">
        <span>Your final score</span>
        <input
          type="number"
          value={playerScore}
          onChange={(e) => setPlayerScore(e.target.value)}
        />
      </label>
      {result && (
        <p className={`result ${result}`}>
          {result === 'win'
            ? `You win! (${ps} vs ${score.total})`
            : `You lose. (${ps} vs ${score.total}) — more points than the Chronobot wins.`}
        </p>
      )}
      <button className="ghost" onClick={game.reset}>
        New game
      </button>
    </section>
  );
}

// --------------------------------------------------------------------------

function InstructionList({
  instructions,
  embedded,
}: {
  instructions: Instruction[];
  embedded?: boolean;
}) {
  if (instructions.length === 0) return null;
  return (
    <section className={embedded ? 'instructions embedded' : 'instructions'}>
      {!embedded && <h3>Do this</h3>}
      <ol>
        {instructions.map((ins) => (
          <InstructionRow key={ins.id} ins={ins} />
        ))}
      </ol>
    </section>
  );
}

function InstructionRow({ ins }: { ins: Instruction }) {
  const [open, setOpen] = useState(false);
  return (
    <li className={ins.requiresInput ? 'needs-input' : ''}>
      <div className="ins-text">
        <strong>{ins.text}</strong>
        {ins.effect?.vp ? <span className="chip">+{ins.effect.vp} VP</span> : null}
        {ins.requiresInput ? <span className="chip input">your call</span> : null}
      </div>
      {ins.detail && (
        <button className="link" onClick={() => setOpen((o) => !o)}>
          {open ? 'hide why' : 'why?'}
        </button>
      )}
      {open && ins.detail && <p className="detail">{ins.detail}</p>}
    </li>
  );
}

// --------------------------------------------------------------------------

function BotStatus({ game }: { game: Game }) {
  const bot = game.state!.chronobot;
  const rows = useMemo(
    () => [
      { label: 'VP', value: bot.vp },
      { label: 'Anomalies', value: `${bot.anomalies} / 3` },
      { label: 'Warp on Timeline', value: bot.warpTilesOnTimeline },
      { label: 'Time Travel track', value: bot.timeTravelTrack },
      { label: 'Superprojects', value: `${bot.superprojects} / 3` },
      { label: 'Total actions', value: bot.totalActions },
    ],
    [bot],
  );
  return (
    <section className="bot-status">
      <h3>Chronobot state</h3>
      <div className="status-grid">
        {rows.map((r) => (
          <Stat key={r.label} label={r.label} value={r.value} />
        ))}
      </div>
      <MiniTable
        title="Resources"
        entries={Object.entries(bot.resources)}
      />
      <MiniTable title="Workers" entries={Object.entries(bot.workers)} />
      <MiniTable
        title="Breakthroughs"
        entries={Object.entries(bot.breakthroughs) as [BreakthroughShape, number][]}
      />
      <MiniTable title="Buildings" entries={Object.entries(bot.buildings)} />
    </section>
  );
}

function MiniTable({
  title,
  entries,
}: {
  title: string;
  entries: [string, number][];
}) {
  return (
    <div className="mini-table">
      <span className="mini-title">{title}</span>
      <div className="mini-cells">
        {entries.map(([k, v]) => (
          <span key={k} className={`mini-cell ${v > 0 ? 'has' : ''}`}>
            {k.slice(0, 3)} <b>{v}</b>
          </span>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="stat">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

function BoardView() {
  const [open, setOpen] = useState(true);
  return (
    <section className="board-view">
      <div className="board-head">
        <h3>Solo board</h3>
        <button className="link" onClick={() => setOpen((o) => !o)}>
          {open ? 'hide' : 'show'}
        </button>
      </div>
      {open && (
        <>
          <img
            src="/assets/solo/board-chronobot.jpg"
            alt="Anachrony solo board — action spaces"
            className="board-img"
          />
          <p className="board-note">
            The Chronobot board. Tokens 1–6 start on the numbered spaces; a rolled
            token performs its space’s action, then advances along the arrows.
          </p>
        </>
      )}
    </section>
  );
}

function LogView({ log }: { log: string[] }) {
  if (log.length === 0) return null;
  return (
    <section className="log">
      <h3>Log</h3>
      <ul>
        {log.slice(-12).map((entry, i) => (
          <li key={i}>{entry}</li>
        ))}
      </ul>
    </section>
  );
}

export default App;
