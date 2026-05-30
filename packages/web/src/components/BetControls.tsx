const BET_STEPS = [1, 5, 10, 25, 50, 100, 500, 1000];

interface Props {
  bet:            number;
  minBet:         number;
  maxBet:         number;
  onBetChange:    (bet: number) => void;
  onSpin:         () => void;
  disabled:       boolean;
  isFreeSpinRound?: boolean;
}

export function BetControls({ bet, minBet, maxBet, onBetChange, onSpin, disabled, isFreeSpinRound }: Props) {
  const decrease = () => {
    const idx = BET_STEPS.findIndex((s) => s >= bet);
    const prev = idx > 0 ? BET_STEPS[idx - 1] : BET_STEPS[0];
    onBetChange(Math.max(minBet, prev));
  };

  const increase = () => {
    let idx = -1;
    for (let i = BET_STEPS.length - 1; i >= 0; i--) {
      if (BET_STEPS[i] <= bet) { idx = i; break; }
    }
    const next = idx < BET_STEPS.length - 1 ? BET_STEPS[idx + 1] : BET_STEPS[BET_STEPS.length - 1];
    onBetChange(Math.min(maxBet, next));
  };

  return (
    <div className="bet-controls">
      <div className="bet-controls__row">
        <button
          className="bet-btn"
          onClick={decrease}
          disabled={disabled || bet <= minBet}
          aria-label="Reducir apuesta"
        >−</button>

        <div className="bet-display">
          <span className="bet-label">APUESTA</span>
          <span className="bet-amount">{bet.toLocaleString('es')}</span>
        </div>

        <button
          className="bet-btn"
          onClick={increase}
          disabled={disabled || bet >= maxBet}
          aria-label="Aumentar apuesta"
        >+</button>
      </div>

      <button
        className={`spin-btn${disabled ? ' spin-btn--disabled' : ''}${isFreeSpinRound ? ' spin-btn--free' : ''}`}
        onClick={onSpin}
        disabled={disabled}
      >
        {disabled ? '⏳' : isFreeSpinRound ? '🌟 GRATIS' : 'SPIN'}
      </button>
    </div>
  );
}
