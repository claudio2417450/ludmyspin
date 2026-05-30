import { useMemo } from 'react';
import { Reel } from './Reel.tsx';
import type { SpinResponse } from '../api/client.ts';
import type { SlotInfo } from '../api/client.ts';

const INITIAL_GRID: string[][] = [
  ['cherry', 'cherry', 'cherry'],
  ['cherry', 'cherry', 'cherry'],
  ['cherry', 'cherry', 'cherry'],
];

const STOP_DELAYS = [0, 350, 700];

interface Props {
  isSpinning: boolean;
  result:     SpinResponse | null;
  slotInfo:   SlotInfo | null;
}

export function SlotMachine({ isSpinning, result, slotInfo }: Props) {
  const grid     = result?.result ?? INITIAL_GRID;
  const numReels = grid.length;
  const paylines = slotInfo?.paylines ?? [{ id: 1, positions: [1, 1, 1] }];

  // Para cada giro ganador, mapear paylineId → filas ganadoras por rodillo
  const winRowsByReel = useMemo((): number[][] => {
    if (!result || isSpinning) return Array.from({ length: numReels }, () => []);
    const paylineMap = new Map(paylines.map((p) => [p.id, p.positions]));
    const sets: Set<number>[] = Array.from({ length: numReels }, () => new Set());

    for (const step of result.steps) {
      for (const win of step.winLines) {
        const positions = paylineMap.get(win.paylineId);
        if (positions) {
          positions.forEach((row, ri) => sets[ri]?.add(row));
        }
      }
    }
    return sets.map((s) => [...s]);
  }, [result, isSpinning, numReels, paylines]);

  // IDs de paylines que ganaron (para los indicadores)
  const winPaylineIds = useMemo((): Set<number> => {
    if (!result || isSpinning) return new Set();
    const ids = new Set<number>();
    for (const step of result.steps) {
      for (const win of step.winLines) ids.add(win.paylineId);
    }
    return ids;
  }, [result, isSpinning]);

  const hasMultiplePaylines = paylines.length > 1;

  return (
    <div className="slot-machine">
      <div className="slot-machine__window">
        {/* Indicadores de payline (izquierda) */}
        {hasMultiplePaylines && (
          <div className="payline-dots">
            {paylines.map((pl) => (
              <div
                key={pl.id}
                className={`payline-dot${winPaylineIds.has(pl.id) ? ' payline-dot--win' : ''}`}
                title={`Línea ${pl.id}`}
              />
            ))}
          </div>
        )}

        {/* Indicador de línea central (slot clásico) */}
        {!hasMultiplePaylines && <div className="payline-indicator" />}

        <div className="slot-machine__reels">
          {grid.map((reelSymbols, reelIdx) => (
            <Reel
              key={reelIdx}
              finalSymbols={reelSymbols}
              isSpinning={isSpinning}
              stopDelay={STOP_DELAYS[reelIdx] ?? 0}
              winRows={winRowsByReel[reelIdx] ?? []}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
