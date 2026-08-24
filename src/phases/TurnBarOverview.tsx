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
import { useT } from '../i18n/I18nProvider';

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
  /** Modules in play (base mode + add-ons); omit for a bot with no modules. */
  modes?: string[];
  /** Difficulty option labels to list; omit to hide the section entirely. */
  difficulty?: string[];
  /** Recent bot turns (oldest→newest); the last few show as a mini turn log. */
  entries: HistoryEntry[];
  /** Verbatim passing/end-of-actions rules (paragraphs split on a blank line). */
  passingRule: string;
  onClose: () => void;
}

/**
 * The modules this game is being played with — the base mode (a combo mode arrives already
 * split into its parts) plus any add-ons. It sits directly above the difficulty options,
 * which are the other half of "what game is this".
 */
export function ModeList({ modes }: { modes: string[] }) {
  const t = useT();
  return (
    <div className="eoa-difficulty">
      <span className="eoa-diff-title">{t('ui.turnBar.modesTitle')}</span>
      <ul className="eoa-diff-list">
        {modes.map((m) => (
          <li key={m}>{m}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The selected difficulty options, exactly as the turn overview lists them — a title and
 * a list, collapsing behind a "(N selected)" toggle past three so a heavily-modded game
 * doesn't push everything below it off screen. Exported because the End Game screen shows
 * the same thing, and two hand-written versions drifted.
 */
export function DifficultyList({ difficulty }: { difficulty: string[] }) {
  const t = useT();
  const [showDifficulty, setShowDifficulty] = useState(false);
  return (
    <div className="eoa-difficulty">
      {difficulty.length === 0 ? (
        <>
          <span className="eoa-diff-title">{t('ui.turnBar.difficultyTitle')}</span>
          <span className="eoa-diff-none">{t('ui.turnBar.difficultyNone')}</span>
        </>
      ) : difficulty.length > 3 ? (
        <>
          <button
            type="button"
            className="eoa-diff-toggle"
            onClick={() => setShowDifficulty((s) => !s)}
            aria-expanded={showDifficulty}
          >
            {t('ui.turnBar.difficultyCount', { n: difficulty.length })}{' '}
            {showDifficulty ? '▾' : '▸'}
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
          <span className="eoa-diff-title">{t('ui.turnBar.difficultyTitle')}</span>
          <ul className="eoa-diff-list">
            {difficulty.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default function TurnBarOverview({
  botName,
  era,
  phaseNumber,
  actionsThisEra,
  minActions,
  countLabel,
  extraFlags,
  hint,
  canEnd,
  turnRules,
  extraRules,
  modes,
  difficulty,
  entries,
  passingRule,
  onClose,
}: TurnBarOverviewProps) {
  const t = useT();
  return (
    <div className="eoa-popover">
      <div className="eoa-pop-head">
        <span className="eoa-pop-title">
          {t('ui.turnBar.popTitle', {
            era,
            phase: phaseNumber,
            countLabel: countLabel ?? t('ui.turnBar.countLabel'),
          })}
          <b>{actionsThisEra}</b>
          {minActions != null ? t('ui.turnBar.popMin', { n: minActions }) : ''}
        </span>
        <button className="eoa-pop-close" onClick={onClose} aria-label={t('ui.turnBar.close')}>
          ×
        </button>
      </div>
      {/* Whose turn it is is already obvious from the turn buttons at the top of the
          view, so the pass-state boxes are gone — this row is just the trackers. */}
      {extraFlags && <div className="eoa-flags">{extraFlags}</div>}

      <p className="eoa-hint">{hint}</p>

      {canEnd && (
        <div className="eoa-buttons">
          <span className="eoa-end">{t('ui.turnBar.phaseEnds')}</span>
        </div>
      )}

      {modes && modes.length > 0 && <ModeList modes={modes} />}

      {difficulty && <DifficultyList difficulty={difficulty} />}

      {entries.length > 0 && (
        <div className="eoa-turns">
          <span className="eoa-turns-title">{t('ui.turnBar.recentTurns')}</span>
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
                    {t('ui.turnBar.turnN', { n: entries.length - i })}
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
        <RulesBox label={t('ui.turnBar.botTurnRules', { bot: botName })}>
          <p>{turnRules}</p>
        </RulesBox>
      )}

      {extraRules}

      <RulesBox label={t('ui.turnBar.passingRules')}>
        {passingRule.split('\n\n').map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </RulesBox>
    </div>
  );
}
