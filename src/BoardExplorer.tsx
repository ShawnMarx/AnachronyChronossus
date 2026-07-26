import { Fragment, useEffect, useState } from 'react';
import './BoardExplorer.css';
import {
  CHRONOBOT_ACTIONS,
  Chronobot,
  DEFAULT_CONFIG,
  MECH_PLACEMENT,
  rollShapeDie,
  type ChronobotActionId,
  type ChronobotState,
  type GameState,
  type Instruction,
} from './engine';
import {
  BOARD_COUNTERS,
  CHRONOBOT_HOTSPOTS,
  type Hotspot,
} from './board/chronobotHotspots';
import { ActionIcon } from './board/ActionIcon';

type PendingStep = null | 'mech' | 'buildingVP';

function isConstructBuilding(a: ChronobotActionId): boolean {
  return a.startsWith('construct-') && a !== 'construct-superproject';
}

/** Value for each board tracking spot. */
function counterValue(
  bot: ChronobotState,
  key: (typeof BOARD_COUNTERS)[number]['key'],
): number {
  switch (key) {
    case 'superproject':
      return bot.superprojects;
    case 'anomaly':
      return bot.anomalies;
    case 'mech':
      return bot.exosuitsAvailable;
    case 'breakthrough':
      return (
        bot.breakthroughs.circle +
        bot.breakthroughs.triangle +
        bot.breakthroughs.square
      );
    default:
      return bot.buildings[key];
  }
}

/**
 * Board-first explorer + debug harness. Tapping an action tile treats it as the
 * rolled action. Because "can a mech be placed?" depends on board state the app
 * can't see, any action that places a mech first prompts the player to Confirm
 * placed / Cannot place before the engine resolves (Cannot place → the failed
 * action that spends no Exosuit and scores 1 VP).
 */

const DEFAULT_PANEL: [number, number, number, number] = [48.5, 2, 50.5, 78];

/** Debug starting state: powered up, 2 Warp tiles on the Timeline, mid-Action-Rounds. */
function initDebugState(): GameState {
  const s = Chronobot.setup({ ...DEFAULT_CONFIG, bot: 'chronobot' });
  return {
    ...s,
    phase: 'actions',
    chronobot: { ...s.chronobot, warpTilesOnTimeline: 2, exosuitsAvailable: 6 },
  };
}

export default function BoardExplorer() {
  const [state, setState] = useState<GameState>(initDebugState);
  const [active, setActive] = useState<Hotspot | null>(null);
  const [pending, setPending] = useState<PendingStep>(null);
  const [result, setResult] = useState<Instruction[]>([]);
  const [outline, setOutline] = useState(true);

  // --- Badge position calibration ---
  const [calibrate, setCalibrate] = useState(false);
  const [positions, setPositions] = useState<Record<string, [number, number]>>(
    () => Object.fromEntries(BOARD_COUNTERS.map((c) => [c.key, c.pos])),
  );
  const [selected, setSelected] = useState<string>(BOARD_COUNTERS[0].key);

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
    const keys: string[] = BOARD_COUNTERS.map((c) => c.key);
    const i = keys.indexOf(selected);
    setSelected(keys[(i + 1) % keys.length]);
  };

  const bot = state.chronobot;

  const reset = () => {
    setState(initDebugState());
    setActive(null);
    setPending(null);
    setResult([]);
  };

  const resolve = (
    h: Hotspot,
    opts: { cannotPlace?: boolean; buildingVP?: number },
  ) => {
    const { state: next, instructions } = Chronobot.takeActionTurn(state, {
      dieRoll: Math.floor(Math.random() * 6) + 1,
      actionId: h.action,
      shape: rollShapeDie(),
      geniusAvailable: false,
      noSpaceAvailable: opts.cannotPlace,
      buildingVP: opts.buildingVP,
    });
    setState(next);
    setResult(instructions);
    setPending(null);
  };

  const onTileClick = (h: Hotspot) => {
    setActive(h);
    setResult([]);
    if (CHRONOBOT_ACTIONS[h.action].placesExosuit) {
      setPending('mech'); // ask before spending a mech
    } else {
      resolve(h, {}); // no mech to place — resolve immediately
    }
  };

  const onConfirmPlace = () => {
    if (!active) return;
    const a = active.action;
    // Successful Construct (building or superproject) → ask for the tile's VP next.
    if (a === 'construct-superproject') {
      const hasBreakthrough =
        bot.breakthroughs.circle +
          bot.breakthroughs.triangle +
          bot.breakthroughs.square >
        0;
      if (bot.superprojects < 3 && hasBreakthrough) setPending('buildingVP');
      else resolve(active, {});
    } else if (isConstructBuilding(a)) {
      const type = a.replace('construct-', '') as keyof typeof bot.buildings;
      if (bot.buildings[type] < 3) setPending('buildingVP');
      else resolve(active, {});
    } else {
      resolve(active, {});
    }
  };

  const onCannotPlace = () => {
    if (active) resolve(active, { cannotPlace: true });
  };

  const onSubmitBuildingVP = (vp: number) => {
    if (active) resolve(active, { buildingVP: vp });
  };

  return (
    <div className="explorer">
      <StatsBar
        bot={state.chronobot}
        outline={outline}
        onToggleOutline={() => setOutline((o) => !o)}
        onReset={reset}
        calibrate={calibrate}
        onToggleCalibrate={() => setCalibrate((c) => !c)}
      />

      <div className="board-stage">
        <div
          className={`board-wrap ${calibrate ? 'calibrating' : ''}`}
          onClick={onBoardClick}
        >
          <img
            src="/assets/solo/board-chronobot.jpg"
            alt="Chronobot solo board"
            className="board"
          />

          {CHRONOBOT_HOTSPOTS.map((h) => {
            const [l, t, w, hgt] = h.rect;
            const def = CHRONOBOT_ACTIONS[h.action];
            const isActive = active?.id === h.id;
            return (
              <button
                key={h.id}
                className={`hotspot ${outline ? 'outlined' : ''} ${isActive ? 'active' : ''}`}
                style={{ left: `${l}%`, top: `${t}%`, width: `${w}%`, height: `${hgt}%` }}
                onClick={() => onTileClick(h)}
                aria-label={def.label}
                title={def.label}
              />
            );
          })}

          {BOARD_COUNTERS.map((c) => {
            const count = counterValue(bot, c.key);
            const [x, y] = positions[c.key] ?? c.pos;
            const sel = calibrate && selected === c.key;
            return (
              <div
                key={c.key}
                className={`count-badge ${sel ? 'cal-selected' : ''}`}
                style={{ left: `${x}%`, top: `${y}%` }}
                title={`${c.label}: ${count}`}
              >
                {calibrate ? (sel ? '◎' : '·') : count}
              </div>
            );
          })}

          {!calibrate && active && (
            <DetailPanel
              hotspot={active}
              pending={pending}
              result={result}
              onConfirmPlace={onConfirmPlace}
              onCannotPlace={onCannotPlace}
              onSubmitBuildingVP={onSubmitBuildingVP}
              onClose={() => {
                setActive(null);
                setPending(null);
                setResult([]);
              }}
            />
          )}
        </div>
      </div>

      {calibrate && (
        <CalibrationPanel
          positions={positions}
          selected={selected}
          onSelect={setSelected}
        />
      )}
    </div>
  );
}

function CalibrationPanel({
  positions,
  selected,
  onSelect,
}: {
  positions: Record<string, [number, number]>;
  selected: string;
  onSelect: (k: string) => void;
}) {
  const literal =
    'export const BOARD_COUNTERS: BoardCounter[] = [\n' +
    BOARD_COUNTERS.map((c) => {
      const [x, y] = positions[c.key] ?? c.pos;
      return `  { key: '${c.key}', pos: [${x}, ${y}], label: '${c.label}' },`;
    }).join('\n') +
    '\n];';
  return (
    <div className="cal-panel">
      <p className="cal-hint">
        <b>Calibrate.</b> Pick a spot, click the board to place it, then arrow-keys
        nudge (0.2% / Shift = 1%). Copy the result to me when done.
      </p>
      <div className="cal-list">
        {BOARD_COUNTERS.map((c) => (
          <button
            key={c.key}
            className={`cal-item ${selected === c.key ? 'on' : ''}`}
            onClick={() => onSelect(c.key)}
          >
            {c.label}{' '}
            <span className="cal-xy">
              {(positions[c.key] ?? c.pos).join(', ')}
            </span>
          </button>
        ))}
      </div>
      <textarea className="cal-out" readOnly value={literal} />
    </div>
  );
}

function StatsBar({
  bot,
  outline,
  onToggleOutline,
  onReset,
  calibrate,
  onToggleCalibrate,
}: {
  bot: ChronobotState;
  outline: boolean;
  onToggleOutline: () => void;
  onReset: () => void;
  calibrate: boolean;
  onToggleCalibrate: () => void;
}) {
  const stats: { label: string; value: string | number }[] = [
    { label: 'VP', value: bot.vp },
    { label: 'Warp', value: bot.warpTilesOnTimeline },
    { label: 'Actions', value: bot.totalActions },
  ];
  return (
    <div className="stats-bar">
      <div className="stats-left">
        <span className="debug-badge">DEBUG</span>
        <div className="stats-row">
          {stats.map((s, i) => (
            <span key={s.label} className={`stat-pill ${i === 0 ? 'lead' : ''}`}>
              <b>{s.value}</b> {s.label}
            </span>
          ))}
        </div>
      </div>
      <div className="stats-controls">
        <label className="outline-toggle" title="Show the tappable tile outlines">
          <input type="checkbox" checked={outline} onChange={onToggleOutline} />
          outlines
        </label>
        <label className="outline-toggle" title="Calibrate badge positions">
          <input type="checkbox" checked={calibrate} onChange={onToggleCalibrate} />
          calibrate
        </label>
        <button className="reset-btn" onClick={onReset}>
          ⟳ Reset
        </button>
      </div>
    </div>
  );
}

/** Short name of the Main-board Action space this action targets. */
function spaceLabel(action: ChronobotActionId): string {
  if (action.startsWith('construct')) return 'Construct';
  return CHRONOBOT_ACTIONS[action].label;
}

function DetailPanel({
  hotspot,
  pending,
  result,
  onConfirmPlace,
  onCannotPlace,
  onSubmitBuildingVP,
  onClose,
}: {
  hotspot: Hotspot;
  pending: PendingStep;
  result: Instruction[];
  onConfirmPlace: () => void;
  onCannotPlace: () => void;
  onSubmitBuildingVP: (vp: number) => void;
  onClose: () => void;
}) {
  const def = CHRONOBOT_ACTIONS[hotspot.action];
  const [l, t, w, h] = hotspot.panel ?? DEFAULT_PANEL;
  const [showMech, setShowMech] = useState(false);
  const toggleMech = () => setShowMech((s) => !s);

  const paragraphs = def.rule.split('\n\n');
  const buildingLabel = def.label.replace('Construct — ', '');
  const isSuperproject = hotspot.action === 'construct-superproject';

  return (
    <div
      className="detail-panel"
      style={{ left: `${l}%`, top: `${t}%`, width: `${w}%`, height: `${h}%` }}
      role="dialog"
      aria-label={def.label}
    >
      <div className="dp-head">
        <div className="dp-title">
          <ActionIcon action={hotspot.action} size={92} />
          <h2>{def.label}</h2>
        </div>
        <button className="dp-close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>
      <div className="dp-body">
        {hotspot.note && <p className="dp-note">{hotspot.note}</p>}

        {/* Step 1 — placement gate for any mech-placing action. */}
        {pending === 'mech' && (
          <div className="place-prompt">
            <p className="pp-instruct">
              Place the Chronobot’s mech on the topmost available{' '}
              <b>{spaceLabel(hotspot.action)}</b> Action space (or a World Council
              space if none are free).
            </p>
            <div className="pp-buttons">
              <button className="pp-confirm" onClick={onConfirmPlace}>
                ✓ Confirm placed
              </button>
              <button className="pp-cannot" onClick={onCannotPlace}>
                ✗ Cannot place
              </button>
            </div>
            <MechRules />
          </div>
        )}

        {/* Step 2 — Construct: take the higher-VP building, enter its printed VP. */}
        {pending === 'buildingVP' && (
          <div className="place-prompt">
            <p className="pp-instruct">
              {isSuperproject ? (
                <>
                  Take the <b>highest-VP Superproject</b> (oldest if tied). Tap its
                  printed VP (3–7).
                </>
              ) : (
                <>
                  Take the higher-VP <b>{buildingLabel}</b> (secondary stack if
                  tied). Tap its printed VP (1–4) — then discard it.
                </>
              )}
            </p>
            <div className="vp-digits">
              {(isSuperproject ? [3, 4, 5, 6, 7] : [1, 2, 3, 4]).map((n) => (
                <button
                  key={n}
                  className="vp-digit"
                  onClick={() => onSubmitBuildingVP(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Resolved outcome. */}
        {!pending && result.length > 0 && (
          <div className="dp-result">
            <p className="dp-result-title">This roll</p>
            <ul>
              {result.map((ins) => (
                <li key={ins.id}>
                  {ins.text}
                  {ins.effect?.vp ? <span className="vp-chip">+{ins.effect.vp} VP</span> : null}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Verbatim rule text. */}
        {paragraphs.map((para, i) => (
          <p key={i} className="dp-rule">
            {renderRule(para, toggleMech)}
          </p>
        ))}

        {/* When not gating, offer the mech rules on demand. */}
        {!pending && def.placesExosuit && (
          <>
            <button className="mech-cta" onClick={toggleMech}>
              🦾 How the Chronobot places its mech {showMech ? '▾' : '▸'}
            </button>
            {showMech && <MechRules />}
          </>
        )}
      </div>
    </div>
  );
}

function MechRules() {
  return (
    <div className="mech-rules">
      <p className="mech-rules-title">Placing the Chronobot’s mech (Exosuit)</p>
      <ul>
        {MECH_PLACEMENT.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Render a verbatim rule paragraph, turning the literal phrase
 * "places an/the Exosuit" into a clickable "how to place a mech" link.
 */
function renderRule(text: string, onMechClick: () => void) {
  const re = /places (?:an|the) Exosuit/g;
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(<Fragment key={key++}>{text.slice(last, m.index)}</Fragment>);
    nodes.push(
      <button key={key++} className="mech-link" onClick={onMechClick}>
        {m[0]}
      </button>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(<Fragment key={key++}>{text.slice(last)}</Fragment>);
  return nodes;
}
