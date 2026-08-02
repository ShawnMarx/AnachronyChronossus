// FirstPlayerPrompt — asked at the end of the Action Rounds phase: does the bot
// control First Player next Era? The answer sets who leads the next Era's Warp +
// Action Rounds, then the view advances to Clean Up. Shared by both solo-bot
// views (parameterized by `botName`).

export default function FirstPlayerPrompt({
  botName = 'Chronobot',
  onAnswer,
  onCancel,
}: {
  botName?: string;
  onAnswer: (playerFirst: boolean) => void;
  onCancel: () => void;
}) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="fp-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>First Player next Era</h3>
        <p>Does the {botName} control First Player (banner placed next to the World Council)?</p>
        <div className="fp-actions">
          <button className="phase-primary" onClick={() => onAnswer(false)}>
            Yes
          </button>
          <button className="phase-secondary" onClick={() => onAnswer(true)}>
            No
          </button>
        </div>
      </div>
    </div>
  );
}
