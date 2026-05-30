import { useState, useEffect } from 'react';
import { Symbol } from './Symbol.tsx';
import { ALL_SYMBOLS } from '../themes/manifest.ts';

interface Props {
  /** Símbolos finales a mostrar una vez que el rodillo se detenga. */
  finalSymbols: string[];
  isSpinning:   boolean;
  /** Milisegundos de retraso después de que isSpinning=false para detener este rodillo. */
  stopDelay:    number;
  /** Filas con premio (para highlight). Solo aplica cuando el rodillo ya se detuvo. */
  winRows:      number[];
}

function randSymbol() {
  return ALL_SYMBOLS[Math.floor(Math.random() * ALL_SYMBOLS.length)];
}

export function Reel({ finalSymbols, isSpinning, stopDelay, winRows }: Props) {
  const [shown, setShown]     = useState<string[]>(finalSymbols);
  const [resting, setResting] = useState(true);

  useEffect(() => {
    if (isSpinning) {
      setResting(false);
      // Ciclar símbolos aleatoriamente mientras gira
      const id = setInterval(() => {
        setShown([randSymbol(), randSymbol(), randSymbol()]);
      }, 80);
      return () => clearInterval(id);
    }

    // Cuando para: esperar stopDelay y mostrar el resultado final
    const id = setTimeout(() => {
      setShown(finalSymbols);
      setResting(true);
    }, stopDelay);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpinning]);

  // Sincronizar finalSymbols si cambia mientras el rodillo ya está parado
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
