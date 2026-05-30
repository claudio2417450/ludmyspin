import { generateFloat } from './rng.js';
import { checkFreeSpinsTrigger } from './features/freeSpins.js';
import type { SlotConfig, Seeds, SpinResult, SpinStep, WinLine, Paytable } from './types.js';

/**
 * Función pura del motor: (config, apuesta, semillas) → SpinResult.
 * Soporta wilds (sustituyen cualquier símbolo) y disparo de free spins (scatter).
 */
export function spin(config: SlotConfig, bet: number, seeds: Seeds): SpinResult {
  validateBet(config, bet);
  const step = computeStep(config, bet, seeds);

  // Detectar si el giro dispara free spins
  let freeSpinsTriggered = 0;
  if (config.features.freeSpins) {
    freeSpinsTriggered = checkFreeSpinsTrigger(step.grid, config.features.freeSpins);
  }

  return {
    steps:      [step],
    payout:     step.payout,
    multiplier: 1,
    features: {
      multiplier:        1,
      freeSpinsLeft:     freeSpinsTriggered,
      freeSpinsGiven:    freeSpinsTriggered,
      sessionId:         null,
    },
  };
}

function validateBet(config: SlotConfig, bet: number): void {
  if (!Number.isInteger(bet) || bet < config.minBet || bet > config.maxBet) {
    throw new RangeError(`Apuesta ${bet} fuera de rango [${config.minBet}, ${config.maxBet}]`);
  }
}

function computeStep(config: SlotConfig, bet: number, seeds: Seeds): SpinStep {
  const { reels, numRows, paylines, paytable, features } = config;
  const wildSymbol = features.wilds?.symbol;
  const lineBet    = bet / paylines.length;

  const reelPositions = reels.map((strip, i) =>
    Math.floor(generateFloat(seeds.serverSeed, seeds.clientSeed, seeds.nonce, i) * strip.length),
  );

  const grid: string[][] = reels.map((strip, i) => {
    const pos = reelPositions[i];
    return Array.from({ length: numRows }, (_, row) => strip[(pos + row) % strip.length]);
  });

  const winLines: WinLine[] = [];
  for (const payline of paylines) {
    const symbols = payline.positions.map((row, ri) => grid[ri][row]);
    const win = evaluatePayline(payline.id, symbols, paytable, lineBet, wildSymbol);
    if (win) winLines.push(win);
  }

  return {
    reelPositions,
    grid,
    winLines,
    payout: winLines.reduce((sum, w) => sum + w.payout, 0),
  };
}

/**
 * Evalúa una payline con soporte de wilds.
 * El wild sustituye a cualquier símbolo. Si todas las posiciones son wild,
 * se busca 'wild' directamente en la paytable.
 */
function evaluatePayline(
  paylineId: number,
  symbols: string[],
  paytable: Paytable,
  lineBet: number,
  wildSymbol?: string,
): WinLine | null {
  // Símbolo base: el primero que no sea wild (o wild si todos lo son)
  const base = wildSymbol
    ? (symbols.find((s) => s !== wildSymbol) ?? wildSymbol)
    : symbols[0];

  // Contar consecutivos desde la izquierda (wild cuenta como base)
  let consecutive = 0;
  for (const s of symbols) {
    if (s === base || (wildSymbol && s === wildSymbol)) consecutive++;
    else break;
  }

  for (let c = consecutive; c >= 1; c--) {
    const mult = paytable[base]?.[c];
    if (mult != null) {
      return {
        paylineId,
        symbol:     base,
        count:      c,
        multiplier: mult,
        payout:     Math.round(lineBet * mult),
      };
    }
  }
  return null;
}
