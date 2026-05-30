import type { SlotConfig } from '../types.js';

/**
 * Slot Bonanza — 3 rodillos, 3 paylines (top/center/bottom), 6 símbolos.
 *
 * Símbolos especiales:
 *   wild    → sustituye cualquier símbolo en las paylines
 *   scatter → no cuenta en paylines; 3+ en el grid = 10 free spins
 *
 * Tira (10 stops): 3× cherry, 2× lemon, 1× orange, 1× seven, 1× wild, 1× scatter, 1× bell
 *
 * RTP teórico aproximado ≈ 95–97 % (verificar con simulate.ts).
 * Usa apuesta mínima de 3 (1 por payline × 3).
 */
const strip = [
  'cherry', 'cherry', 'cherry',
  'lemon',  'lemon',
  'orange',
  'seven',
  'wild',
  'scatter',
  'bell',
];

export const bonanza: SlotConfig = {
  id:      'bonanza',
  name:    'Wild Bonanza',
  reels:   [strip, strip, strip],
  numRows: 3,
  paylines: [
    { id: 1, positions: [0, 0, 0] },  // top
    { id: 2, positions: [1, 1, 1] },  // center
    { id: 3, positions: [2, 2, 2] },  // bottom
  ],
  paytable: {
    cherry:  { 3: 8  },
    lemon:   { 3: 14 },
    orange:  { 3: 25 },
    seven:   { 3: 80 },
    bell:    { 3: 20 },
    wild:    { 3: 50 },  // 3 wilds en línea = premio especial
    // scatter no tiene entrada en paytable — paga mediante free spins
  },
  targetRtp: 96,
  minBet:    3,
  maxBet:    99_999,
  features: {
    wilds: {
      symbol: 'wild',
    },
    freeSpins: {
      triggerSymbol: 'scatter',
      triggerCount:  3,        // 3+ scatter en cualquier posición del grid
      spinsGranted:  10,
    },
  },
};
