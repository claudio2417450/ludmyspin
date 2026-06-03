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
  initialSlotId?: string;
  balance:        number;
  username:       string;
  onBalance:      (b: number) => void;
  onLogout:       () => void;
  onLobby?:       () => void;
  onAdminPanel?:  () => void;
}

export function Game({ initialSlotId, balance, username, onBalance, onLogout, onLobby, onAdminPanel }: Props) {
  const [slots, setSlots]               = useState<SlotInfo[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);
  const [bet, setBet]                   = useState(INITIAL_BET);
  const [showWin, setShowWin]           = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [jackpotSeed, setJackpotSeed]   = useState<number | null>(null);

  useEffect(() => {
    api.getSlots().then((r) => {
      setSlots(r.slots);
      // Preseleccionar el slot que viene del lobby (o el primero)
      const initial = initialSlotId
        ? r.slots.find(s => s.id === initialSlotId) ?? r.slots[0]
        : r.slots[0];
      if (initial) setSelectedSlot(initial);
    }).catch(() => {});
  }, [initialSlotId]);

  useEffect(() => {
    if (!selectedSlot) return;
    api.getJackpot(selectedSlot.id).then((jp) => setJackpotSeed(jp.current)).catch(() => setJackpotSeed(null));
  }, [selectedSlot]);

  const slotId = selectedSlot?.id ?? 'classic';
  const minBet = selectedSlot?.minBet ?? 1;
  const maxBet = selectedSlot?.maxBet ?? 100_000;

  const jackpotValue = useJackpotValue(slotId, jackpotSeed);

  const { phase, result, visibleStep, error, doSpin, resetToIdle } = useSpin(slotId, onBalance);
  const isSpinning = phase === 'spinning';
  const isBusy     = phase !== 'idle';
  const prevPhase  = useRef<typeof phase>('idle');

  const freeSpinsLeft  = result?.features.freeSpinsLeft  ?? 0;
  const freeSpinsGiven = result?.features.freeSpinsGiven ?? 0;

  useEffect(() => {
    setBet((prev) => Math.max(minBet, Math.min(maxBet, prev)));
  }, [minBet, maxBet]);

  // Precargar sonidos de fútbol cuando se selecciona el slot
  useEffect(() => {
    if (slotId === 'worldcup') sfx.preloadFootball();
  }, [slotId]);

  // Sonidos — pasan el slotId para elegir banco de sonidos
  useEffect(() => {
    if (phase === 'spinning' && prevPhase.current === 'idle') sfx.spin(slotId);
    if (phase === 'stopped' && prevPhase.current !== 'stopped') {
      [0, 350, 700].forEach((delay, i) => setTimeout(() => sfx.reelStop(i, slotId), delay));
      setTimeout(() => {
        const payout = result?.payout ?? 0;
        if (result?.jackpot?.won)                            sfx.jackpot(slotId);
        else if ((result?.features.freeSpinsGiven ?? 0) > 0) sfx.freeSpins(slotId);
        else if (payout >= bet * 10)                         sfx.bigWin(slotId);
        else if (payout > 0)                                 sfx.smallWin(slotId);
      }, 800);
    }
    prevPhase.current = phase;
  }, [phase, result, bet, slotId]);

  // Win overlay
  useEffect(() => {
    if (phase !== 'stopped') return;
    if ((result?.payout ?? 0) > 0 || result?.jackpot?.won) {
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

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isBusy && !showWithdraw) { e.preventDefault(); handleSpin(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isBusy, handleSpin, showWithdraw]);

  return (
    <div className="game-screen">

      {/* ── Header compacto ─────────────────────────────────────────────── */}
      <header className="game-header">
        <span className="game-header__title">🎰 LuDmySpin</span>
        <div className="game-header__right">
          {jackpotValue != null && (
            <span className="game-header__jackpot">🏆 {jackpotValue.toLocaleString('es')}</span>
          )}
          <span className="game-header__user">👤 {username}</span>
          {onLobby && (
            <button className="game-header__btn" onClick={onLobby} title="Volver al lobby">🏠</button>
          )}
          {onAdminPanel && (
            <button className="game-header__btn" onClick={onAdminPanel}>Admin</button>
          )}
          <button className="game-header__btn" onClick={onLogout}>Salir</button>
        </div>
      </header>

      {/* ── Balance + retiro ────────────────────────────────────────────── */}
      <div className="balance-bar">
        <span className="balance-bar__label">CRÉDITOS</span>
        <span className="balance-bar__amount">{balance.toLocaleString('es')}</span>
        <button className="withdraw-btn" onClick={() => setShowWithdraw(true)} title="Retirar">💸</button>
      </div>

      {/* ── Nombre del slot activo (reemplaza el selector) ─────────────── */}
      {selectedSlot && (
        <div className="game-slot-name">{selectedSlot.name}</div>
      )}

      {/* ── Máquina (área central que se expande) ───────────────────────── */}
      <div className="game-main">
        <div className="machine-wrapper">
          <SlotMachine isSpinning={isSpinning} result={result} slotInfo={selectedSlot} visibleStep={visibleStep} />
          <WinOverlay
            payout={result?.payout ?? 0}
            currency={result?.currency ?? 'credits'}
            visible={showWin}
            jackpot={result?.jackpot?.won ? result.jackpot.amount : 0}
          />
        </div>

        {/* FreeSpins — altura fija para no mover la máquina */}
        <div className="result-row">
          {(freeSpinsLeft > 0 || freeSpinsGiven > 0)
            ? <FreeSpinsCounter freeSpinsLeft={freeSpinsLeft} freeSpinsGiven={freeSpinsGiven} />
            : (
              /* last-result siempre en DOM con visibility para evitar layout shift */
              <div
                className="last-result"
                style={{ visibility: (result && !isSpinning && !showWin) ? 'visible' : 'hidden' }}
              >
                {result && result.payout > 0
                  ? <span className="last-result--win">+{result.payout.toLocaleString('es')}</span>
                  : <span className="last-result--lose">Sin premio</span>
                }
              </div>
          )}
        </div>

        {error && <p className="game-error">{error}</p>}
      </div>

      {/* ── Controles ───────────────────────────────────────────────────── */}
      <BetControls
        bet={bet}
        minBet={minBet}
        maxBet={maxBet}
        onBetChange={setBet}
        onSpin={handleSpin}
        disabled={isBusy}
        isFreeSpinRound={freeSpinsLeft > 0}
      />

      {/* WinsFeed removido del juego — solo visible en panel de admin */}

      {showWithdraw && (
        <WithdrawalModal balance={balance} onClose={() => setShowWithdraw(false)} onDone={() => {}} />
      )}
    </div>
  );
}
