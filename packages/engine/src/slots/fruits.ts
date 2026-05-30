import type { SlotConfig } from '../types.js';

/**
 * Slot de frutas — 3 rodillos, 3 líneas (top/center/bottom), 5 símbolos.
 *
 * Tira (10 stops): 3× cherry, 3× lemon, 2× orange, 1× plum, 1× seven
 *
 * RTP teórico exacto ≈ 96.4 % por línea (target: 96 %):
 *   P(3c)=0.027 × 8  = 0.216
 *   P(3l)=0.027 × 14 = 0.378
 *   P(3o)=0.008 × 24 = 0.192
 *   P(3p)=0.001 × 78 = 0.078
 *   P(3s)=0.001 × 100= 0.100
 *                      ──────
 *                      0.964
 *
 * Las 3 paylines usan la misma distribución de tira → RTP total = 96.4 %.
 * Apuesta mínima: 3 (1 por línea).
 */
const strip = [
  'cherry', 'cherry', 'cherry',
  'lemon', 'lemon', 'lemon',
  'orange', 'orange',
  'plum',
  'seven',
];

export const fruits: SlotConfig = {
  id: 'fruits',
  name: 'Lucky Fruits',
  reels: [strip, strip, strip],
  numRows: 3,
  paylines: [
    { id: 1, positions: [0, 0, 0] }, // top
    { id: 2, positions: [1, 1, 1] }, // center
    { id: 3, positions: [2, 2, 2] }, // bottom
  ],
  paytable: {
    cherry: { 3: 8 },
    lemon:  { 3: 14 },
    orange: { 3: 24 },
    plum:   { 3: 78 },
    seven:  { 3: 100 },
  },
  targetRtp: 96,
  minBet: 3,
  maxBet: 99_999,
  features: {},
};
