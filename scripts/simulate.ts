/**
 * Simulador masivo de RTP.
 * Uso: npx tsx scripts/simulate.ts --slot classic --spins 1000000 --bet 100
 */
import { parseArgs } from 'node:util';
import { classic, fruits, spin } from '@ludmyspin/engine';
import type { SlotConfig } from '@ludmyspin/engine';
import { randomBytes } from 'node:crypto';

const SLOTS: Record<string, SlotConfig> = { classic, fruits };

const { values } = parseArgs({
  options: {
    slot:  { type: 'string',  default: 'classic'  },
    spins: { type: 'string',  default: '1000000'  },
    bet:   { type: 'string',  default: '100'       },
  },
  strict: false,
});

const slotId   = values.slot   as string;
const numSpins = parseInt(values.spins as string, 10);
const bet      = parseInt(values.bet   as string, 10);

const config = SLOTS[slotId];
if (!config) {
  console.error(`Slot desconocido: "${slotId}". Opciones: ${Object.keys(SLOTS).join(', ')}`);
  process.exit(1);
}

console.log(`\nSimulando ${numSpins.toLocaleString('es')} giros en "${config.name}"...`);
const start = Date.now();

let totalBet    = 0;
let totalPayout = 0;
let hits        = 0;
let maxWin      = 0;
const winDist: Record<string, number> = {};

for (let i = 0; i < numSpins; i++) {
  const serverSeed = randomBytes(16).toString('hex');
  const result = spin(config, bet, { serverSeed, clientSeed: 'simulate', nonce: i });

  totalBet    += bet;
  totalPayout += result.payout;

  if (result.payout > 0) {
    hits++;
    if (result.payout > maxWin) maxWin = result.payout;
    for (const step of result.steps) {
      for (const win of step.winLines) {
        const key = `${win.symbol} x${win.count}`;
        winDist[key] = (winDist[key] ?? 0) + 1;
      }
    }
  }
}

const elapsed = ((Date.now() - start) / 1000).toFixed(2);
const rtp     = ((totalPayout / totalBet) * 100).toFixed(4);
const hitRate = ((hits / numSpins) * 100).toFixed(2);

const rtp_target = config.targetRtp.toFixed(2);
const ok = Math.abs(parseFloat(rtp) - config.targetRtp) < 2 ? '✅' : '⚠️';

console.log(`
┌──────────────────────────────────────────────┐
│  Slot:         ${config.name.padEnd(29)}│
│  Giros:        ${numSpins.toLocaleString('es').padEnd(29)}│
│  Apuesta:      ${(numSpins * bet).toLocaleString('es').padEnd(29)}│
│  Pagado:       ${totalPayout.toLocaleString('es').padEnd(29)}│
├──────────────────────────────────────────────┤
│  RTP real:     ${`${rtp} %  (objetivo: ${rtp_target} %) ${ok}`.padEnd(29)}│
│  Hit rate:     ${`${hitRate} % de giros con premio`.padEnd(29)}│
│  Win máximo:   ${`${maxWin.toLocaleString('es')} créditos`.padEnd(29)}│
│  Tiempo:       ${`${elapsed} s`.padEnd(29)}│
└──────────────────────────────────────────────┘

  Distribución de premios:`);

const sorted = Object.entries(winDist).sort((a, b) => b[1] - a[1]);
for (const [combo, count] of sorted) {
  const pct = ((count / numSpins) * 100).toFixed(3);
  console.log(`    ${combo.padEnd(16)} ${count.toLocaleString('es').padStart(10)} veces  (${pct} %)`);
}
