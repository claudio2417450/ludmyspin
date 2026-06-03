import { useState, useEffect, useCallback } from 'react';
import { Symbol } from './Symbol.tsx';
import { ALL_SYMBOLS } from '../themes/manifest.ts';

interface Props {
  finalSymbols: string[];
  isSpinning:   boolean;
  stopDelay:    number;
  winRows:      number[];
  /** Símbolos posibles para ciclar durante el spinning (default: frutas) */
  allSymbols?:  string[];
}

export function Reel({ finalSymbols, isSpinning, stopDelay, winRows, allSymbols }: Props) {
  const symbols = allSymbols && allSymbols.length > 0 ? allSymbols : ALL_SYMBOLS;

  const randSymbol = useCallback(() =>
    symbols[Math.floor(Math.random() * symbols.length)],
    [symbols],
  );

  const [shown, setShown]     = useState<string[]>(finalSymbols);
  const [resting, setResting] = useState(true);

  useEffect(() => {
    if (isSpinning) {
      setResting(false);
      const id = setInterval(() => {
        setShown([randSymbol(), randSymbol(), randSymbol()]);
      }, 80);
      return () => clearInterval(id);
    }
    const id = setTimeout(() => {
      setShown(finalSymbols);
      setResting(true);
    }, stopDelay);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpinning]);

  useEffect(() => {
    if (resting) setShown(finalSymbols);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalSymbols]);

  return (
    <div className={`reel${!resting ? ' reel--spinning' : ''}`}>
      {shown.map((sym, rowIdx) => (
        <div key={rowIdx} className="reel__row">
          <Symbol
            name={sym}
            highlighted={resting && winRows.includes(rowIdx)}
            dimmed={resting && winRows.length > 0 && !winRows.includes(rowIdx)}
          />
        </div>
      ))}
    </div>
  );
}
