// FirstPlayerPrompt — asked at the end of the Action Rounds phase: does the bot
// control First Player next Era? The answer sets who leads the next Era's Warp +
// Action Rounds, then the view advances to Clean Up. Shared by both solo-bot
// views (parameterized by `botName`).

import { useT } from '../i18n/I18nProvider';

export default function FirstPlayerPrompt({
  botName = 'Chronobot',
  onAnswer,
  onCancel,
}: {
  botName?: string;
  onAnswer: (playerFirst: boolean) => void;
  onCancel: () => void;
}) {
  const t = useT();
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="fp-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>{t('ui.firstPlayer.title')}</h3>
        <p>{t('ui.firstPlayer.ask', { bot: botName })}</p>
        <div className="fp-actions">
          <button className="phase-primary" onClick={() => onAnswer(false)}>
            {t('ui.firstPlayer.yes')}
          </button>
          <button className="phase-secondary" onClick={() => onAnswer(true)}>
            {t('ui.firstPlayer.no')}
          </button>
        </div>
      </div>
    </div>
  );
}
