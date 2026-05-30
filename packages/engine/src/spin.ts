import { generateFloat } from './rng.js';
import { checkFreeSpinsTrigger } from './features/freeSpins.js';
import { evaluateGrid, applyCascade } from './features/cascade.js';
import type { SlotConfig, Seeds, SpinResult, SpinStep, WinLine, Paytable } from './types.js';

const MAX_CASCADE_DEPTH = 5;

/**
 * Función pura del motor: (config, apuesta, semillas) → SpinResult.
 * Soporta wilds, scatter / free spins y cascadas con multiplicador.
 */
export function spin(config: SlotConfig, bet: number, seeds: Seeds): SpinResult {
  validateBet(config, bet);

  if (config.features.cascades) {
    return computeCascadeSpin(config, bet, seeds);
  }

  const step = computeStep(config, bet, seeds);

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

// ── Cascadas ──────────────────────────────────────────────────────────────────

function computeCascadeSpin(config: SlotConfig, bet: number, seeds: Seeds): SpinResult {
  const { paylines, paytable, features, reels } = config;
  const wildSymbol  = features.wilds?.symbol;
  const useMulti    = features.cascadeMultiplier === true;
  const strip       = reels[0]; // todas las tiras son iguales en este slot
  const lineBet     = bet / paylines.length;

  // Paso 0: giro inicial
  const step0 = computeStep(config, bet, seeds);
  const allSteps: SpinStep[] = [step0];
  let totalPayout = step0.payout;

  let currentGrid = step0.grid;
  let currentWins = step0.winLines;
  let cascadeDepth = 0;

  while (currentWins.length > 0 && cascadeDepth < MAX_CASCADE_DEPTH) {
    cascadeDepth++;
    const multiplier = useMulti ? cascadeDepth + 1 : 1;

    // Aplicar cascada: quitar ganadores, caer nuevos símbolos
    currentGrid = applyCascade(
      currentGrid, currentWins, paylines,
      strip, seeds.serverSeed, seeds.clientSeed, seeds.nonce, cascadeDepth,
    );

    // Re-evaluar con el multiplicador de este nivel
    const boostedLineBet = lineBet * multiplier;
    currentWins = evaluateGrid(currentGrid, paylines, paytable, boostedLineBet, wildSymbol);

    const stepPayout = currentWins.reduce((s, w) => s + w.payout, 0);
    totalPayout += stepPayout;

    allSteps.push({
      reelPositions: [],
      grid:          currentGrid,
      winLines:      currentWins,
      payout:        stepPayout,
    });
  }

  return {
    steps:      allSteps,
    payout:     totalPayout,
    multiplier: cascadeDepth > 0 ? cascadeDepth + 1 : 1,
    features: {
      multiplier:     cascadeDepth > 0 ? cascadeDepth + 1 : 1,
      freeSpinsLeft:  0,
      freeSpinsGiven: 0,
      sessionId:      null,
    },
  };
}

// ── Helpers compartidos ───────────────────────────────────────────────────────

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

  const winLines = evaluateGrid(grid, paylines, paytable, lineBet, wildSymbol);

  return {
    reelPositions,
    grid,
    winLines,
    payout: winLines.reduce((sum, w) => sum + w.payout, 0),
  };
}
