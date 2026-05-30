/**
 * Reconciliación de créditos — verifica el invariante de integridad:
 *
 *   Σ créditos_emitidos (owner_mint)
 *     == Σ saldos_wallets
 *      + Σ saldos_jackpots (pozo en espera de ser ganado)
 *      + Σ retiros_aprobados (salieron del sistema)
 *      + ventaja_de_la_casa  (bets − payouts: créditos "absorbidos")
 *
 * Los jackpots son una reserva del sistema: salen de wallets (vía contribución
 * del 1 % de cada bet) y vuelven al ganar. Si no cuadra → hay un bug.
 *
 * Nota: los seeds iniciales de los jackpots se tratan como "inyección de capital"
 * del propietario; en un sistema de producción deberían registrarse como owner_mint.
 *
 * Uso: npx tsx scripts/reconcile.ts
 */

import postgres from 'postgres';
import { config } from '../packages/api/src/config.js';

const sql = postgres(config.DATABASE_URL, { max: 1 });

async function reconcile() {
  console.log('\n🔍 Verificando integridad del sistema de créditos...\n');

  // Créditos que entraron al sistema
  const [emitted] = await sql`
    SELECT COALESCE(SUM(amount), 0)::bigint AS total
    FROM credit_transactions
    WHERE type = 'owner_mint'
  `;

  // Seeds iniciales de jackpots (capital de la casa inyectado en los pozos)
  const [jpSeeds] = await sql`
    SELECT COALESCE(SUM(seed), 0)::bigint AS total
    FROM jackpots
  `;

  // Estado actual de wallets
  const [wallets] = await sql`
    SELECT COALESCE(SUM(balance), 0)::bigint AS total FROM wallets
  `;

  // Estado actual de pozos jackpot
  const [jpCurrent] = await sql`
    SELECT COALESCE(SUM(current), 0)::bigint AS total FROM jackpots
  `;

  // Retiros aprobados (salieron del sistema)
  const [withdrawn] = await sql`
    SELECT COALESCE(SUM(amount), 0)::bigint AS total
    FROM credit_transactions
    WHERE type = 'player_withdrawal'
  `;

  // Estadísticas de giros
  const [spins] = await sql`
    SELECT
      COALESCE(SUM(bet), 0)::bigint    AS total_bet,
      COALESCE(SUM(payout), 0)::bigint AS total_payout,
      COUNT(*)::int                     AS total_spins
    FROM spins
  `;

  // Histórico de jackpots pagados (por cuánto se ganó en total)
  const [jpWon] = await sql`
    SELECT COALESCE(SUM(last_won_amount), 0)::bigint AS total
    FROM jackpots
    WHERE last_won_amount IS NOT NULL
  `;

  const totalEmitted    = Number(emitted.total);
  const totalJpSeeds    = Number(jpSeeds.total);
  const totalWallets    = Number(wallets.total);
  const totalJpCurrent  = Number(jpCurrent.total);
  const totalWithdrawn  = Number(withdrawn.total);
  const totalBet        = Number(spins.total_bet);
  const totalPayout     = Number(spins.total_payout);
  const totalSpins      = Number(spins.total_spins);
  const totalJpWon      = Number(jpWon.total);

  // Crecimiento neto de los pozos jackpot sobre su seed inicial.
  // Las contribuciones vienen de apuestas de jugadores, por lo que ya están
  // "dentro" de house_edge_bruto. Si no las restamos, se contarían dos veces.
  const jpGrowth = totalJpCurrent - totalJpSeeds;  // positivo cuando el pozo creció

  // Ventaja de la casa: apuestas no devueltas, MENOS lo que fue al jackpot
  // (ese trozo ya está contabilizado en totalJpCurrent).
  const houseEdge = (totalBet - totalPayout) - jpGrowth;   // negativo = casa perdió

  // Créditos que "entran" al sistema: owner_mint + seeds de jackpots
  const totalIn  = totalEmitted + totalJpSeeds;
  // Créditos "ubicados": wallets + jackpots actuales + retirados + absorbidos por casa
  const totalOut = totalWallets + totalJpCurrent + totalWithdrawn + houseEdge;

  const diff = totalIn - totalOut;
  const ok   = diff === 0;

  const fmt = (n: number) => n.toLocaleString('es');

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  CRÉDITOS QUE ENTRARON AL SISTEMA');
  console.log('───────────────────────────────────────────────────────────────');
  console.log(`  Owner mint (owner_mint)              ${fmt(totalEmitted).padStart(15)}`);
  console.log(`  Seeds de jackpots (capital casa)     ${fmt(totalJpSeeds).padStart(15)}`);
  console.log(`  ─────────────────────────────────────────────────────────`);
  console.log(`  TOTAL ENTRADA                        ${fmt(totalIn).padStart(15)}`);
  console.log('');
  console.log('  DÓNDE ESTÁN AHORA');
  console.log('───────────────────────────────────────────────────────────────');
  console.log(`  Σ saldos en wallets                  ${fmt(totalWallets).padStart(15)}`);
  console.log(`  Σ pozos jackpot actuales             ${fmt(totalJpCurrent).padStart(15)}`);
  console.log(`  Σ retiros aprobados                  ${fmt(totalWithdrawn).padStart(15)}`);
  console.log(`  Ventaja de la casa (bet − payout)    ${fmt(houseEdge).padStart(15)}`);
  console.log(`  ─────────────────────────────────────────────────────────`);
  console.log(`  TOTAL SALIDA                         ${fmt(totalOut).padStart(15)}`);
  console.log('───────────────────────────────────────────────────────────────');
  console.log(`  DIFERENCIA                           ${fmt(diff).padStart(15)}  ${ok ? '✅ CUADRA' : '❌ DESAJUSTE'}`);
  console.log('═══════════════════════════════════════════════════════════════');

  console.log('\n  ESTADÍSTICAS DE JUEGO');
  console.log('───────────────────────────────────────────────────────────────');
  console.log(`  Giros totales                        ${fmt(totalSpins).padStart(15)}`);
  console.log(`  Total apostado                       ${fmt(totalBet).padStart(15)}`);
  console.log(`  Total pagado (incl. jackpots)        ${fmt(totalPayout).padStart(15)}`);
  console.log(`  Jackpots pagados (histórico)         ${fmt(totalJpWon).padStart(15)}`);
  if (totalBet > 0) {
    const rtp = ((totalPayout / totalBet) * 100).toFixed(2);
    const edge = (((totalBet - totalPayout) / totalBet) * 100).toFixed(2);
    console.log(`  RTP real                             ${`${rtp} %`.padStart(15)}`);
    console.log(`  Ventaja casa real                    ${`${edge} %`.padStart(15)}`);
  }
  console.log();

  if (ok) {
    console.log('  ✅ Los créditos cuadran perfectamente. Sistema íntegro.\n');
  } else {
    console.error(`  ❌ ¡DESAJUSTE DE ${fmt(Math.abs(diff))} CRÉDITOS! Revisar transacciones.\n`);
    process.exitCode = 1;
  }

  await sql.end();
}

reconcile().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
