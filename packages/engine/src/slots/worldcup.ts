import type { SlotConfig } from '../types.js';

/**
 * Slot World Cup 2026 — 3 rodillos, 3 paylines, wilds (copa).
 *
 * Símbolos (del atlas de jugadores):
 *   'brasil neymar'    × 3  — común
 *   'alemania musiala' × 3  — común
 *   'marruecos Hakimi' × 2  — medio
 *   'noruega Haaland'  × 2  — medio
 *   'argentina messi'  × 1  — raro
 *   'copa2026'         × 1  — WILD (sustituye todo)
 *   Strip total: 12 stops
 *
 * RTP teórico ≈ 96 %  (verificar con simulate.ts --slot worldcup)
 */
const strip = [
  'brasil neymar',    'brasil neymar',    'brasil neymar',
  'alemania musiala', 'alemania musiala', 'alemania musiala',
  'marruecos Hakimi', 'marruecos Hakimi',
  'noruega Haaland',  'noruega Haaland',
  'argentina messi',
  'copa2026',
];

export const worldcup: SlotConfig = {
  id:      'worldcup',
  name:    'World Cup 2026',
  reels:   [strip, strip, strip],
  numRows: 3,
  paylines: [
    { id: 1, positions: [0, 0, 0] },   // top
    { id: 2, positions: [1, 1, 1] },   // center
    { id: 3, positions: [2, 2, 2] },   // bottom
  ],
  paytable: {
    'brasil neymar':    { 3: 4  },
    'alemania musiala': { 3: 5  },
    'marruecos Hakimi': { 3: 9  },
    'noruega Haaland':  { 3: 16 },
    'argentina messi':  { 3: 50 },
    'copa2026':         { 3: 95 },   // 3 copas = premio máximo
  },
  targetRtp: 96,
  minBet:    3,
  maxBet:    99_999,
  features: {
    wilds: { symbol: 'copa2026' },
  },
};
