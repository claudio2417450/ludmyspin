import { randomBytes } from 'node:crypto';
import { spin } from './spin.js';
import type { SlotConfig } from './types.js';

/**
 * RTP empírico: ejecuta N giros con semillas aleatorias y mide el retorno real.
 * Usa el script scripts/simulate.ts para corridas de millones de giros.
 */
export function simulateRtp(config: SlotConfig, numSpins: number, bet = 100): number {
  let totalBet = 0;
  let totalPayout = 0;

  for (let i = 0; i < numSpins; i++) {
    const serverSeed = randomBytes(16).toString('hex');
    const result = spin(config, bet, { serverSeed, clientSeed: 'simulation', nonce: i });
    totalBet += bet;
    totalPayout += result.payout;
  }

  return totalPayout / totalBet;
}

/**
 * RTP teórico exacto: itera todas las combinaciones posibles de rodillos.
 * Para 3 rodillos × 10 stops = 1 000 combinaciones — instantáneo.
 * No usa RNG; el resultado es matemáticamente preciso.
 */
export function computeTheoreticalRtp(config: SlotConfig, bet = 100): number {
  const { reels, paylines, paytable } = config;
  const lineBet = bet / paylines.length;
  const positions = new Array<number>(reels.length).fill(0);
  let totalPayout = 0;

  function iterate(reelIdx: number): void {
    if (reelIdx === reels.length) {
      for (const payline of paylines) {
        const symbols = payline.positions.map(
          (row, ri) => reels[ri][(positions[ri] + row) % reels[ri].length],
        );
        const first = symbols[0];
        let consecutive = 1;
        while (consecutive < symbols.length && symbols[consecutive] === first) {
          consecutive++;
        }
        for (let c = consecutive; c >= 1; c--) {
          const mult = paytable[first]?.[c];
          if (mult != null) {
            totalPayout += lineBet * mult;
            break;
          }
        }
      }
      return;
    }
    for (let p = 0; p < reels[reelIdx].length; p++) {
      positions[reelIdx] = p;
      iterate(reelIdx + 1);
    }
  }

  iterate(0);
  const totalCombinations = reels.reduce((acc, r) => acc * r.length, 1);
  return totalPayout / (totalCombinations * bet);
}
