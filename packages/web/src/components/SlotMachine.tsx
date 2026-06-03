import { useMemo } from 'react';
import { Reel } from './Reel.tsx';
import { ALL_SYMBOLS } from '../themes/manifest.ts';
import type { SpinResponse, SlotInfo, SpinStep } from '../api/client.ts';

const STOP_DELAYS = [0, 350, 700];

interface Props {
  isSpinning:   boolean;
  result:       SpinResponse | null;
  slotInfo:     SlotInfo | null;
  visibleStep?: SpinStep | null;
}

export function SlotMachine({ isSpinning, result, slotInfo, visibleStep }: Props) {
  // Símbolos del slot actual (para initial grid y ciclo de spin)
  const slotSymbols = useMemo(() => {
    if (slotInfo?.symbols && slotInfo.symbols.length > 0) return slotInfo.symbols;
    return ALL_SYMBOLS;
  }, [slotInfo]);

  // Initial grid: usa el primer símbolo del slot (no cerezas hardcodeadas)
  const initialGrid = useMemo((): string[][] => {
    const sym = slotSymbols[0] ?? 'cherry';
    const numReels = 3;
    const numRows  = slotInfo?.numRows ?? 3;
    return Array.from({ length: numReels }, () => Array.from({ length: numRows }, () => sym));
  }, [slotSymbols, slotInfo?.numRows]);

  const activeStep = visibleStep ?? result?.steps?.[result.steps.length - 1] ?? null;
  const grid       = activeStep?.grid ?? result?.result ?? initialGrid;
  const numReels   = grid.length;
  const paylines   = slotInfo?.paylines ?? [{ id: 1, positions: [1, 1, 1] }];

  const winRowsByReel = useMemo((): number[][] => {
    if (isSpinning) return Array.from({ length: numReels }, () => []);
    const paylineMap = new Map(paylines.map((p) => [p.id, p.positions]));
    const sets: Set<number>[] = Array.from({ length: numReels }, () => new Set());
    const winsToShow = activeStep?.winLines ?? result?.steps?.[result.steps.length - 1]?.winLines ?? [];
    for (const win of winsToShow) {
      const positions = paylineMap.get(win.paylineId);
      if (positions) positions.forEach((row, ri) => sets[ri]?.add(row));
    }
    return sets.map((s) => [...s]);
  }, [activeStep, result, isSpinning, numReels, paylines]);

  const winPaylineIds = useMemo((): Set<number> => {
    if (!result || isSpinning) return new Set();
    const ids = new Set<number>();
    for (const step of result.steps)
      for (const win of step.winLines) ids.add(win.paylineId);
    return ids;
  }, [result, isSpinning]);

  const hasMultiplePaylines = paylines.length > 1;

  return (
    <div className="slot-machine">
      <div className="slot-machine__window">
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
        {!hasMultiplePaylines && <div className="payline-indicator" />}

        <div className="slot-machine__reels">
          {grid.map((reelSymbols, reelIdx) => (
            <Reel
              key={reelIdx}
              finalSymbols={reelSymbols}
              isSpinning={isSpinning}
              stopDelay={STOP_DELAYS[reelIdx] ?? 0}
              winRows={winRowsByReel[reelIdx] ?? []}
              allSymbols={slotSymbols}   // ← símbolos del slot para el ciclo de spinning
            />
          ))}
        </div>
      </div>
    </div>
  );
}
