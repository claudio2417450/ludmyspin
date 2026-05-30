export interface SlotConfig {
  id: string;
  name: string;
  /** Tira de símbolos por rodillo. Cada array es la tira completa del rodillo. */
  reels: string[][];
  paytable: Paytable;
  /** Número de filas visibles en pantalla (normalmente 3). */
  numRows: number;
  /** Líneas de pago activas. Una por slot simple; varias para multi-línea. */
  paylines: Payline[];
  /** RTP objetivo en porcentaje (ej: 96 = 96 %). */
  targetRtp: number;
  minBet: number;
  maxBet: number;
  features: FeaturesConfig;
}

/**
 * Tabla de pagos: símbolo → { cantidad_en_línea → multiplicador_sobre_apuesta_por_línea }
 * Ejemplo: { cherry: { 3: 6 } } → 3 cerezas en línea pagan 6× la apuesta de línea.
 * Se puede incluir { cherry: { 2: 1, 3: 6 } } para premios parciales desde la izquierda.
 */
export type Paytable = Record<string, Partial<Record<number, number>>>;

export interface Payline {
  id: number;
  /** Índice de fila (0=top, 1=center, 2=bottom) para cada rodillo. */
  positions: number[];
}

export interface Seeds {
  serverSeed: string;
  clientSeed: string;
  nonce: number;
}

export interface WinLine {
  paylineId: number;
  symbol: string;
  /** Cuántos símbolos consecutivos desde la izquierda forman el premio. */
  count: number;
  multiplier: number;
  payout: number;
}

export interface SpinStep {
  /** Posición de parada en la tira por rodillo. */
  reelPositions: number[];
  /** Cuadrícula visible: grid[rodillo][fila]. */
  grid: string[][];
  winLines: WinLine[];
  payout: number;
}

export interface FeaturesState {
  multiplier:     number;
  freeSpinsLeft:  number;
  /** Cuántos free spins se conceden en ESTE giro (0 si no se disparó). */
  freeSpinsGiven: number;
  sessionId:      string | null;
}

/**
 * Resultado completo de un giro.
 * steps tiene 1 elemento en slots simples; más en cascadas / respins.
 */
export interface SpinResult {
  steps: SpinStep[];
  /** Pago total acumulado de todos los steps. */
  payout: number;
  multiplier: number;
  features: FeaturesState;
}

export interface FeaturesConfig {
  freeSpins?: {
    triggerSymbol: string;
    triggerCount: number;
    spinsGranted: number;
  };
  wilds?: { symbol: string };
  cascades?: boolean;
}
