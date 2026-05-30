import { generateFloat } from '../rng.js';
import type { Payline, Paytable, WinLine } from '../types.js';

/**
 * Evalúa todas las paylines sobre un grid dado.
 * Reutiliza la misma lógica que spin.ts (wilds incluidos).
 */
export function evaluateGrid(
  grid: string[][],
  paylines: Payline[],
  paytable: Paytable,
  lineBet: number,
  wildSymbol?: string,
): WinLine[] {
  const wins: WinLine[] = [];
  for (const pl of paylines) {
    const symbols = pl.positions.map((row, ri) => grid[ri][row]);
    const base = wildSymbol
      ? (symbols.find((s) => s !== wildSymbol) ?? wildSymbol)
      : symbols[0];
    let consecutive = 0;
    for (const s of symbols) {
      if (s === base || (wildSymbol && s === wildSymbol)) consecutive++;
      else break;
    }
    for (let c = consecutive; c >= 1; c--) {
      const mult = paytable[base]?.[c];
      if (mult != null) {
        wins.push({ paylineId: pl.id, symbol: base, count: c, multiplier: mult,
          payout: Math.round(lineBet * mult) });
        break;
      }
    }
  }
  return wins;
}

/**
 * Aplica un paso de cascada:
 * Los rodillos que tuvieron al menos una celda ganadora reciben un conjunto
 * completamente nuevo de símbolos aleatorios (nueva posición en la tira).
 * Los rodillos sin ganadores no cambian.
 *
 * ¿Por qué regeneración completa y no "gravedad"?
 * Con una sola payline central y tiras de 10 stops, la gravedad crea
 * cadenas deterministas (el símbolo adyacente en la tira siempre cae al
 * centro), disparando RTP > 300 %. La regeneración completa rompe esa
 * correlación y mantiene el RTP predecible.
 */
export function applyCascade(
  prevGrid:    string[][],
  winLines:    WinLine[],
  paylines:    Payline[],
  strip:       string[],
  serverSeed:  string,
  clientSeed:  string,
  nonce:       number,
  cascadeIdx:  number,
): string[][] {
  const numRows = prevGrid[0].length;

  // Marcar qué rodillos tuvieron alguna celda ganadora
  const reelHadWin: boolean[] = new Array(prevGrid.length).fill(false);
  for (const win of winLines) {
    const pl = paylines.find((p) => p.id === win.paylineId);
    if (!pl) continue;
    for (let ri = 0; ri < win.count; ri++) reelHadWin[ri] = true;
  }

  return prevGrid.map((reel, reelIdx) => {
    if (!reelHadWin[reelIdx]) return reel;   // sin cambios en rodillos sin ganadores

    // Regenerar el rodillo completo con una nueva posición de tira
    return Array.from({ length: numRows }, (_, rowIdx) => {
      const f = generateFloat(
        serverSeed,
        clientSeed,
        nonce * 10_000 + cascadeIdx * 100 + reelIdx * 10 + rowIdx,
        reelIdx,
      );
      return strip[Math.floor(f * strip.length)];
    });
  });
}
