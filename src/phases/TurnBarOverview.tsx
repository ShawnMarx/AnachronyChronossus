// TurnBarOverview — the dismissible "Turn" popover opened from the top-bar Turn
// chip. Shows the Era/Phase, pass state, the turn count, a status hint, the
// verbatim "<bot>'s turn" rulebook text, the difficulty options, the recent bot
// turns, and the collapsible passing rules. Shared by both solo-bot views
// (formerly the Chronobot-only EndOfActionsBar); the bot-specific values come in
// as props.

import { useState } from 'react';
import RulesBox from './RulesBox';
import type { HistoryEntry } from '../game/undo';

export interface TurnBarOverviewProps {
  botName: string;
  era: number;
  phaseNumber: number | string;
  playerPassed: boolean;
  botPassed: boolean;
  /** Turns/Actions the bot has taken this Era. */
  actionsThisEra: number;
  /** Chronobot shows "/ min N"; omit for bots without a minimum. */
  minActions?: number;
  /** Label before the count (default "Actions"). */
  countLabel?: string;
  /** Extra flag chips for the pass-state row (e.g. Chronossus Exo / Energy). */
  extraFlags?: React.ReactNode;
  /** One-line status/decision hint. */
  hint: string;
  /** True when the Action Rounds phase can end (both passed + minimum met). */
  canEnd: boolean;
  /** Verbatim "<bot>'s turn" rulebook text (omit to hide the box). */
  turnRules?: string;
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
  playerPassed,
  botPassed,
  actionsThisEra,
  minActions,
  countLabel = 'Actions',
  extraFlags,
  hint,
  canEnd,
  turnRules,
  difficulty,
  entries,
  passingRule,
  onClose,
}: TurnBarOverviewProps) {
  const [showRule, setShowRule] = useState(false);

  return (
    <div className="eoa-popover">
      <div className="eoa-pop-head">
        <span className="eoa-pop-title">
          Era {era} · Phase {phaseNumber}
        </span>
        <button className="eoa-pop-close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>
      <div className="eoa-flags">
        <span className={`eoa-flag ${playerPassed ? 'on' : ''}`}>
          You: {playerPassed ? 'passed' : 'active'}
        </span>
        <span className={`eoa-flag ${botPassed ? 'on' : ''}`}>
          Bot: {botPassed ? 'passed' : 'active'}
        </span>
        <span className="eoa-count">
          {countLabel} <b>{actionsThisEra}</b>
          {minActions != null ? ` / min ${minActions}` : ''}
        </span>
        {extraFlags}
      </div>

      <p className="eoa-hint">{hint}</p>

      {canEnd && (
        <div className="eoa-buttons">
          <span className="eoa-end">✓ Action Rounds Phase ends</span>
        </div>
      )}

      {turnRules && (
        <RulesBox label={`${botName}'s turn — rulebook text`}>
          <p>{turnRules}</p>
        </RulesBox>
      )}

      {difficulty && (
        <div className="eoa-difficulty">
          <span className="eoa-diff-title">Difficulty options</span>
          {difficulty.length === 0 ? (
            <span className="eoa-diff-none">Standard game — none selected</span>
          ) : (
            <ul className="eoa-diff-list">
              {difficulty.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {entries.length > 0 && (
        <div className="eoa-turns">
          <span className="eoa-turns-title">Recent bot turns</span>
          <ol className="eoa-turn-list">
            {[...entries]
              .slice(-5)
              .reverse()
              .map((e, i) => (
                <li key={entries.length - i} className="eoa-turn-row">
                  <span className="eoa-turn-n">
                    {e.die != null && <span className="bot-die eoa-turn-die">{e.die}</span>}
                    Turn {entries.length - i}
                  </span>
                  <span className="eoa-turn-label">{e.label}</span>
                </li>
              ))}
          </ol>
        </div>
      )}

      <div className="eoa-rule">
        <button className="eoa-rule-cta" onClick={() => setShowRule((s) => !s)}>
          📖 Passing &amp; End of Actions rules {showRule ? '▾' : '▸'}
        </button>
        {showRule && (
          <div className="eoa-rule-body">
            {passingRule.split('\n\n').map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
