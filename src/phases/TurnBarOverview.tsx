// TurnBarOverview — the dismissible "Turn" popover opened from the top-bar Turn
// chip. Shows the Era/Phase/turn-count title line, the tracker chips, a status hint,
// the difficulty options and the recent bot turns — then EVERY verbatim rule box in a
// footer at the bottom, the same shape as the Action dialogs (see CLAUDE.md): the
// bot's-turn text, any module rules the view passes in, then the passing rules.
// Shared by both solo-bot views; the bot-specific values come in as props.

import { useState } from 'react';
import RulesBox from './RulesBox';
import HistoryText from '../history/HistoryText';
import type { HistoryEntry } from '../game/undo';

export interface TurnBarOverviewProps {
  botName: string;
  era: number;
  phaseNumber: number | string;
  /** Turns/Actions the bot has taken this Era, shown on the title line. */
  actionsThisEra: number;
  /** Chronobot shows "/ min N"; omit for bots without a minimum. */
  minActions?: number;
  /** Label before the count (default "Bot Actions"). */
  countLabel?: string;
  /** Extra flag chips for the pass-state row (e.g. Chronossus Exo / Energy). */
  extraFlags?: React.ReactNode;
  /** One-line status/decision hint. */
  hint: string;
  /** True when the Action Rounds phase can end (both passed + minimum met). */
  canEnd: boolean;
  /** Verbatim "<bot>'s turn" rulebook text (omit to hide the box). */
  turnRules?: string;
  /**
   * Extra verbatim rule boxes for the active module(s) — rendered in the footer with the
   * other rule boxes. The Chronossus passes its Guardians / module text here.
   */
  extraRules?: React.ReactNode;
  /** Difficulty option labels to list; omit to hide the section entirely. */
  difficulty?: string[];
  /** Recent bot turns (oldest→newest); the last few show as a mini turn log. */
  entries: HistoryEntry[];
  /** Verbatim passing/end-of-actions rules (paragraphs split on a blank line). */
  passingRule: string;
  onClose: () => void;
}

export default function TurnBarOverview({
  botName,
  era,
  phaseNumber,
  actionsThisEra,
  minActions,
  countLabel = 'Bot Actions',
  extraFlags,
  hint,
  canEnd,
  turnRules,
  extraRules,
  difficulty,
  entries,
  passingRule,
  onClose,
}: TurnBarOverviewProps) {
  // Past this many selected options, collapse the list behind a "(N selected)" toggle
  // so a heavily-modded game doesn't push the recent-turns section far down.
  const [showDifficulty, setShowDifficulty] = useState(false);

  return (
    <div className="eoa-popover">
      <div className="eoa-pop-head">
        <span className="eoa-pop-title">
          Era {era} · Phase {phaseNumber} · {countLabel} <b>{actionsThisEra}</b>
          {minActions != null ? ` / min ${minActions}` : ''}
        </span>
        <button className="eoa-pop-close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>
      {/* Whose turn it is is already obvious from the turn buttons at the top of the
          view, so the pass-state boxes are gone — this row is just the trackers. */}
      {extraFlags && <div className="eoa-flags">{extraFlags}</div>}

      <p className="eoa-hint">{hint}</p>

      {canEnd && (
        <div className="eoa-buttons">
          <span className="eoa-end">✓ Action Rounds Phase ends</span>
        </div>
      )}

      {difficulty && (
        <div className="eoa-difficulty">
          {difficulty.length === 0 ? (
            <>
              <span className="eoa-diff-title">Difficulty options</span>
              <span className="eoa-diff-none">Standard game — none selected</span>
            </>
          ) : difficulty.length > 3 ? (
            <>
              <button
                type="button"
                className="eoa-diff-toggle"
                onClick={() => setShowDifficulty((s) => !s)}
                aria-expanded={showDifficulty}
              >
                Difficulty options ({difficulty.length} selected) {showDifficulty ? '▾' : '▸'}
              </button>
              {showDifficulty && (
                <ul className="eoa-diff-list">
                  {difficulty.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <>
              <span className="eoa-diff-title">Difficulty options</span>
              <ul className="eoa-diff-list">
                {difficulty.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {entries.length > 0 && (
        <div className="eoa-turns">
          <span className="eoa-turns-title">Recent bot turns</span>
          <ol className="eoa-turn-list">
            {/* The 3 most recent turns, with the same per-turn detail the History pane
                shows — the overview is a shortcut to History, not a briefer version. */}
            {[...entries]
              .slice(-3)
              .reverse()
              .map((e, i) => (
                <li key={entries.length - i} className="eoa-turn-row">
                  <span className="eoa-turn-n">
                    {e.die != null && <span className="bot-die eoa-turn-die">{e.die}</span>}
                    Turn {entries.length - i}
                  </span>
                  <span className="eoa-turn-main">
                    <span className="eoa-turn-label">
                      <HistoryText text={e.label} />
                    </span>
                    {e.effects.length > 0 && (
                      <ul className="eoa-turn-effects">
                        {e.effects.map((eff, j) => (
                          <li key={j}>
                            <HistoryText text={eff} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </span>
                </li>
              ))}
          </ol>
        </div>
      )}

      {/* Rule boxes live together at the bottom, in a fixed order — the bot's turn, the
          active module's own rules, then passing. Same footer convention the Action and
          module dialogs follow. */}
      {turnRules && (
        <RulesBox label={`${botName}'s turn — rulebook text`}>
          <p>{turnRules}</p>
        </RulesBox>
      )}

      {extraRules}

      <RulesBox label="Passing & End of Actions rules">
        {passingRule.split('\n\n').map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </RulesBox>
    </div>
  );
}
