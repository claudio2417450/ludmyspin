import type { SlotConfig } from '../types.js';

/**
 * Slot clásico — 3 rodillos, 1 línea central, 4 símbolos.
 *
 * Tira (10 stops): 4× cherry, 3× lemon, 2× orange, 1× seven
 *
 * RTP teórico exacto = 96.0 %:
 *   P(3c)=0.064 × 6  = 0.384
 *   P(3l)=0.027 × 12 = 0.324
 *   P(3o)=0.008 × 19 = 0.152
 *   P(3s)=0.001 × 100= 0.100
 *                      ──────
 *                      0.960
 */
const strip = [
  'cherry', 'cherry', 'cherry', 'cherry',
  'lemon', 'lemon', 'lemon',
  'orange', 'orange',
  'seven',
];

export const classic: SlotConfig = {
  id: 'classic',
  name: 'Classic 777',
  reels: [strip, strip, strip],
  numRows: 3,
  paylines: [
    { id: 1, positions: [1, 1, 1] }, // fila central
  ],
  paytable: {
    cherry: { 3: 6 },
    lemon:  { 3: 12 },
    orange: { 3: 19 },
    seven:  { 3: 100 },
  },
  targetRtp: 96,
  minBet: 1,
  maxBet: 100_000,
  features: {},
};
