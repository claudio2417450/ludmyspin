import { createHmac, createHash } from 'node:crypto';

/**
 * Provably fair RNG.
 * Devuelve un float [0, 1) derivado de HMAC-SHA256(serverSeed, "clientSeed:nonce:reelIndex").
 * El jugador puede reproducir cualquier resultado con estos parámetros.
 */
export function generateFloat(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  reelIndex: number,
): number {
  const data = `${clientSeed}:${nonce}:${reelIndex}`;
  const hmac = createHmac('sha256', serverSeed).update(data).digest('hex');
  // Primeros 4 bytes del HMAC → entero sin signo de 32 bits → dividir por 2^32
  const value = parseInt(hmac.slice(0, 8), 16);
  return value / 0x100000000;
}

/**
 * Posición de parada en la tira del rodillo (0 … reelLength-1).
 */
export function generateReelPosition(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  reelIndex: number,
  reelLength: number,
): number {
  return Math.floor(generateFloat(serverSeed, clientSeed, nonce, reelIndex) * reelLength);
}

/**
 * SHA-256(serverSeed) — el hash que el servidor publica ANTES del giro (commit).
 * Tras el giro revela el serverSeed; el jugador verifica que coincide.
 */
export function hashServerSeed(serverSeed: string): string {
  return createHash('sha256').update(serverSeed).digest('hex');
}
