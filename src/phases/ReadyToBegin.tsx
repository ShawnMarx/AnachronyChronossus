// ReadyToBegin — the "Ready to begin?" splash at the start of each Era's Action
// Rounds. If the bot is First Player it takes the first turn (the button fires
// Take Bot Action); otherwise you play first, then run the bot. Shared by both
// solo-bot views (parameterized by `botName`).

import { useT } from '../i18n/I18nProvider';

export default function ReadyToBegin({
  firstPlayer,
  era,
  botName = 'Chronobot',
  onDismiss,
  onTakeBotAction,
}: {
  firstPlayer: 'bot' | 'player';
  era: number;
  botName?: string;
  onDismiss: () => void;
  onTakeBotAction: () => void;
}) {
  const t = useT();
  const botFirst = firstPlayer === 'bot';
  return (
    <div className="modal-overlay" onClick={onDismiss}>
      <div className="fp-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>{t('ui.ready.title', { era })}</h3>
        <p>{t(botFirst ? 'ui.ready.botFirst' : 'ui.ready.youFirst', { bot: botName })}</p>
        <div className="fp-actions">
          {botFirst ? (
            <button className="phase-primary" onClick={onTakeBotAction}>
              {t('ui.common.takeBotAction')}
            </button>
          ) : (
            <button className="phase-primary" onClick={onDismiss}>
              {t('ui.ready.gotIt')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
