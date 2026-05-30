import type { FeaturesConfig } from '../types.js';

type FreeSpinsConfig = NonNullable<FeaturesConfig['freeSpins']>;

/**
 * Comprueba si el grid actual dispara una ronda de giros gratis.
 * Condición por defecto: el símbolo scatter aparece en al menos
 * `triggerCount` posiciones distintas del grid (en cualquier fila o rodillo).
 *
 * @returns Número de free spins concedidos, o 0 si no se disparó.
 */
export function checkFreeSpinsTrigger(
  grid: string[][],
  cfg: FreeSpinsConfig,
): number {
  let count = 0;
  for (const reel of grid) {
    for (const sym of reel) {
      if (sym === cfg.triggerSymbol) count++;
    }
  }
  return count >= cfg.triggerCount ? cfg.spinsGranted : 0;
}
