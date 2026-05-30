import type { SlotConfig } from '../types.js';

/**
 * Slot Harvest Cascade — 3 rodillos, 1 payline central, cascadas.
 *
 * DISEÑO CLAVE: la tira intercala símbolos para que el símbolo inmediato
 * encima del ganador sea distinto → las cascadas encadenadas son mucho
 * más raras (el símbolo que "cae" al centro no suele repetir el combo).
 *
 * Tira (10 stops intercalados): cherry, lemon, orange, seven, cherry,
 *                                lemon, orange, wild, cherry, lemon
 *   cherry×3 (0,4,8) · lemon×3 (1,5,9) · orange×2 (2,6) · seven×1 (3) · wild×1 (7)
 *
 * RTP base ≈ 83 %  + contribución de cascadas ≈ 13 % → objetivo 96 %.
 * Verificar con: npx tsx scripts/simulate.ts --slot harvest --spins 1000000
 */
const strip = [
  'cherry', 'lemon', 'orange', 'seven',
  'cherry', 'lemon', 'orange', 'wild',
  'cherry', 'lemon',
];

export const harvest: SlotConfig = {
  id:      'harvest',
  name:    'Harvest Cascade',
  reels:   [strip, strip, strip],
  numRows: 3,
  paylines: [
    { id: 1, positions: [1, 1, 1] },   // única: fila central
  ],
  paytable: {
    cherry: { 3: 3 },
    lemon:  { 3: 4 },
    orange: { 3: 7 },
    seven:  { 3: 23 },
    wild:   { 3: 18 },
  },
  targetRtp: 96,
  minBet:    1,
  maxBet:    100_000,
  features: {
    wilds:    { symbol: 'wild' },
    cascades: true,
    cascadeMultiplier: false,
  },
};
