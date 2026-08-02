// ReadyToBegin — the "Ready to begin?" splash at the start of each Era's Action
// Rounds. If the bot is First Player it takes the first turn (the button fires
// Take Bot Action); otherwise you play first, then run the bot. Shared by both
// solo-bot views (parameterized by `botName`).

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
  const botFirst = firstPlayer === 'bot';
  return (
    <div className="modal-overlay" onClick={onDismiss}>
      <div className="fp-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>Ready to begin — Era {era}</h3>
        <p>
          {botFirst
            ? `The ${botName} is First Player this Era — it takes the first turn. Press “Take Bot Action” to roll the AI die and resolve it.`
            : `You are First Player this Era. Take your turn on the Main board first, then press “Take Bot Action” for the ${botName}’s turn.`}
        </p>
        <div className="fp-actions">
          {botFirst ? (
            <button className="phase-primary" onClick={onTakeBotAction}>
              Take Bot Action
            </button>
          ) : (
            <button className="phase-primary" onClick={onDismiss}>
              Your turn first — got it
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
