interface Props {
  payout:   number;
  currency: string;
  visible:  boolean;
  jackpot?: number;
}

export function WinOverlay({ payout, currency, visible, jackpot = 0 }: Props) {
  if (!visible || payout <= 0) return null;

  const isJackpot = jackpot > 0;

  return (
    <div className={`win-overlay${isJackpot ? ' win-overlay--jackpot' : ''}`} role="status" aria-live="polite">
      <div className="win-overlay__inner">
        {isJackpot && <div className="win-overlay__jackpot-badge">🏆 JACKPOT 🏆</div>}
        <div className="win-overlay__label">{isJackpot ? '¡JACKPOT GANADO!' : '¡GANASTE!'}</div>
        <div className="win-overlay__amount">
          +{payout.toLocaleString('es')}
          <span className="win-overlay__currency"> {currency}</span>
        </div>
      </div>
    </div>
  );
}
