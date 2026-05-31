import { useState, useEffect, useCallback, useRef } from 'react';
import { SlotMachine }       from '../components/SlotMachine.tsx';
import { BetControls }       from '../components/BetControls.tsx';
import { WinOverlay }        from '../components/WinOverlay.tsx';
import { WinsFeed }          from '../components/WinsFeed.tsx';
import { WithdrawalModal }   from '../components/WithdrawalModal.tsx';
import { FreeSpinsCounter }  from '../components/FreeSpinsCounter.tsx';
import { useJackpotValue }   from '../components/JackpotDisplay.tsx';
import { useSpin }           from '../hooks/useSpin.ts';
import { sfx }               from '../hooks/useSound.ts';
import { api }               from '../api/client.ts';
import type { SlotInfo }     from '../api/client.ts';

const WIN_DISPLAY_MS = 2500;
const INITIAL_BET    = 100;

interface Props {
  balance:       number;
  username:      string;
  onBalance:     (b: number) => void;
  onLogout:      () => void;
  onAdminPanel?: () => void;
}

export function Game({ balance, username, onBalance, onLogout, onAdminPanel }: Props) {
  const [slots, setSlots]         = useState<SlotInfo[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);
  const [bet, setBet]             = useState(INITIAL_BET);
  const [showWin, setShowWin]     = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [jackpotSeed, setJackpotSeed]  = useState<number | null>(null);

  // Cargar slots
  useEffect(() => {
    api.getSlots().then((r) => {
      setSlots(r.slots);
      if (r.slots.length > 0) setSelectedSlot(r.slots[0]);
    }).catch(() => {});
  }, []);

  // Cargar jackpot inicial cuando cambia el slot
  useEffect(() => {
    if (!selectedSlot) return;
    api.getJackpot(selectedSlot.id)
      .then((jp) => setJackpotSeed(jp.current))
      .catch(() => setJackpotSeed(null));
  }, [selectedSlot]);

  const slotId   = selectedSlot?.id ?? 'classic';
  const minBet   = selectedSlot?.minBet ?? 1;
  const maxBet   = selectedSlot?.maxBet ?? 100_000;

  // Jackpot en tiempo real (WebSocket)
  const jackpotValue = useJackpotValue(slotId, jackpotSeed);

  const { phase, result, visibleStep, error, doSpin, resetToIdle } = useSpin(slotId, onBalance);
  const isSpinning  = phase === 'spinning';
  const isCascading = phase === 'cascade';
  const isBusy      = phase !== 'idle';
  const prevPhase   = useRef<typeof phase>('idle');

  const freeSpinsLeft  = result?.features.freeSpinsLeft  ?? 0;
  const freeSpinsGiven = result?.features.freeSpinsGiven ?? 0;

  // ── Sonidos ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase === 'spinning' && prevPhase.current === 'idle') {
      sfx.spin();                         // empieza a girar
    }
    if (phase === 'stopped' && prevPhase.current !== 'stopped') {
      // stop secuencial de rodillos
      [0, 350, 700].forEach((delay, i) =>
        setTimeout(() => sfx.reelStop(i), delay),
      );
      // sonido de resultado 300ms después del último rodillo
      setTimeout(() => {
        const payout = result?.payout ?? 0;
        const isJp   = result?.jackpot?.won === true;
        const isFree = (result?.features.freeSpinsGiven ?? 0) > 0;
        if (isJp)            sfx.jackpot();
        else if (isFree)     sfx.freeSpins();
        else if (payout >= (bet * 10)) sfx.bigWin();
        else if (payout > 0) sfx.smallWin();
      }, 800);
    }
    prevPhase.current = phase;
  }, [phase, result, bet]);

  // Clampear apuesta al rango del slot
  useEffect(() => {
    setBet((prev) => Math.max(minBet, Math.min(maxBet, prev)));
  }, [minBet, maxBet]);

  // Overlay de ganancia
  useEffect(() => {
    if (phase !== 'stopped') return;
    const isJackpotWin = result?.jackpot?.won === true;
    const hasPayout    = (result?.payout ?? 0) > 0;

    if (hasPayout || isJackpotWin) {
      setShowWin(true);
      const t = setTimeout(() => { setShowWin(false); resetToIdle(); }, WIN_DISPLAY_MS);
      return () => clearTimeout(t);
    }
    const t = setTimeout(resetToIdle, 400);
    return () => clearTimeout(t);
  }, [phase, result, resetToIdle]);

  const handleSpin = useCallback(() => {
    if (!isBusy) doSpin(bet);
  }, [isBusy, doSpin, bet]);

  // Atajo teclado
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isBusy && !showWithdraw) { e.preventDefault(); handleSpin(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isBusy, handleSpin, showWithdraw]);

  return (
    <div className="game-screen">
      {/* Header */}
      <header className="game-header">
        <span className="game-header__title">🎰 LuDmySpin</span>
        <div className="game-header__right">
          <span className="game-header__user">👤 {username}</span>
          {onAdminPanel && (
            <button className="game-header__logout" onClick={onAdminPanel}>Panel Admin</button>
          )}
          <button className="game-header__logout" onClick={onLogout}>Salir</button>
        </div>
      </header>

      {/* Saldo */}
      <div className="balance-bar">
        <span className="balance-bar__label">CRÉDITOS</span>
        <span className="balance-bar__amount">{balance.toLocaleString('es')}</span>
        <button className="withdraw-btn" onClick={() => setShowWithdraw(true)} title="Solicitar retiro">
          💸
        </button>
      </div>

      {/* Jackpot */}
      {jackpotValue != null && (
        <div className="jackpot-display">
          <span className="jackpot-display__label">🏆 JACKPOT</span>
          <span className="jackpot-display__amount">{jackpotValue.toLocaleString('es')}</span>
          <span className="jackpot-display__hint">3× SEVEN</span>
        </div>
      )}

      {/* Selector de slot */}
      {slots.length > 1 && (
        <div className="slot-selector">
          {slots.map((s) => (
            <button
              key={s.id}
              className={`slot-tab${selectedSlot?.id === s.id ? ' slot-tab--active' : ''}`}
              onClick={() => { setSelectedSlot(s); resetToIdle(); }}
              disabled={isBusy}
            >
              {s.name}
              {s.paylines.length > 1 && (
                <span className="slot-tab__badge">{s.paylines.length} líneas</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Máquina */}
      <div className="game-main">
        <div className="machine-wrapper">
          <SlotMachine
            isSpinning={isSpinning}
            result={result}
            slotInfo={selectedSlot}
            visibleStep={visibleStep}
          />
          <WinOverlay
            payout={result?.payout ?? 0}
            currency={result?.currency ?? 'credits'}
            visible={showWin}
            jackpot={result?.jackpot?.won ? result.jackpot.amount : 0}
          />
        </div>

        {/* Free spins counter */}
        {(freeSpinsLeft > 0 || freeSpinsGiven > 0) && (
          <FreeSpinsCounter freeSpinsLeft={freeSpinsLeft} freeSpinsGiven={freeSpinsGiven} />
        )}

        {result && !isSpinning && !showWin && freeSpinsLeft === 0 && (
          <div className="last-result">
            {result.payout > 0
              ? <span className="last-result--win">+{result.payout.toLocaleString('es')} créditos</span>
              : <span className="last-result--lose">Sin premio</span>
            }
          </div>
        )}

        {error && <p className="game-error">{error}</p>}
      </div>

      {/* Controles */}
      <BetControls
        bet={bet}
        minBet={minBet}
        maxBet={maxBet}
        onBetChange={setBet}
        onSpin={handleSpin}
        disabled={isBusy}
        isFreeSpinRound={freeSpinsLeft > 0}
      />

      <p className="keyboard-hint">Pulsa <kbd>Espacio</kbd> para girar</p>

      <WinsFeed />

      {showWithdraw && (
        <WithdrawalModal
          balance={balance}
          onClose={() => setShowWithdraw(false)}
          onDone={() => {}}
        />
      )}
    </div>
  );
}
