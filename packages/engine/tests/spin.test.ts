import { describe, it, expect } from 'vitest';
import { spin } from '../src/spin.js';
import { classic } from '../src/slots/classic.js';
import { fruits } from '../src/slots/fruits.js';

const seeds = {
  serverSeed: 'test-server-seed-abc123',
  clientSeed: 'test-client-seed',
  nonce: 1,
};

describe('spin() — estructura del resultado', () => {
  it('devuelve un SpinResult con la forma correcta', () => {
    const result = spin(classic, 100, seeds);
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].grid).toHaveLength(classic.reels.length);
    expect(result.steps[0].grid[0]).toHaveLength(classic.numRows);
    expect(typeof result.payout).toBe('number');
    expect(result.payout).toBeGreaterThanOrEqual(0);
    expect(result.features.sessionId).toBeNull();
  });

  it('grid contiene solo símbolos válidos del slot', () => {
    const validSymbols = new Set(classic.reels.flat());
    const { grid } = spin(classic, 100, seeds).steps[0];
    for (const reel of grid) {
      for (const sym of reel) {
        expect(validSymbols.has(sym)).toBe(true);
      }
    }
  });
});

describe('spin() — determinismo y reproducibilidad (provably fair)', () => {
  it('las mismas semillas producen el mismo resultado', () => {
    const r1 = spin(classic, 100, seeds);
    const r2 = spin(classic, 100, seeds);
    expect(r1).toEqual(r2);
  });

  it('semillas distintas (nonce diferente) producen resultados distintos en promedio', () => {
    const results = new Set(
      Array.from({ length: 20 }, (_, i) =>
        JSON.stringify(spin(classic, 100, { ...seeds, nonce: i }).steps[0].reelPositions),
      ),
    );
    // Con 20 nonces distintos es prácticamente imposible que todos coincidan
    expect(results.size).toBeGreaterThan(1);
  });
});

describe('spin() — corrección del pago', () => {
  it('payout escala proporcionalmente con la apuesta', () => {
    const r1 = spin(classic, 100, seeds);
    const r2 = spin(classic, 200, seeds);
    // Mismas semillas → mismos símbolos → payout debe ser el doble
    expect(r2.payout).toBe(r1.payout * 2);
  });

  it('payout siempre es un entero no negativo', () => {
    for (let nonce = 0; nonce < 50; nonce++) {
      const result = spin(classic, 100, { ...seeds, nonce });
      expect(Number.isInteger(result.payout)).toBe(true);
      expect(result.payout).toBeGreaterThanOrEqual(0);
    }
  });

  it('payout del step coincide con la suma de sus winLines', () => {
    for (let nonce = 0; nonce < 100; nonce++) {
      const result = spin(classic, 100, { ...seeds, nonce });
      const step = result.steps[0];
      const computed = step.winLines.reduce((s, w) => s + w.payout, 0);
      expect(step.payout).toBe(computed);
      expect(result.payout).toBe(computed);
    }
  });

  it('winLines referencian paylineIds válidos', () => {
    const validIds = new Set(classic.paylines.map(p => p.id));
    for (let nonce = 0; nonce < 100; nonce++) {
      const { steps } = spin(classic, 100, { ...seeds, nonce });
      for (const win of steps[0].winLines) {
        expect(validIds.has(win.paylineId)).toBe(true);
      }
    }
  });

  it('multiplicador de winLine coincide con el de la paytable', () => {
    for (let nonce = 0; nonce < 200; nonce++) {
      const { steps } = spin(classic, 100, { ...seeds, nonce });
      for (const win of steps[0].winLines) {
        const expected = classic.paytable[win.symbol]?.[win.count];
        expect(win.multiplier).toBe(expected);
      }
    }
  });
});

describe('spin() — validación de apuesta', () => {
  it('rechaza apuesta menor que minBet', () => {
    expect(() => spin(classic, 0, seeds)).toThrow(RangeError);
  });

  it('rechaza apuesta mayor que maxBet', () => {
    expect(() => spin(classic, classic.maxBet + 1, seeds)).toThrow(RangeError);
  });

  it('rechaza apuesta no entera', () => {
    expect(() => spin(classic, 1.5, seeds)).toThrow(RangeError);
  });

  it('acepta apuesta en el límite inferior', () => {
    expect(() => spin(classic, classic.minBet, seeds)).not.toThrow();
  });

  it('acepta apuesta en el límite superior', () => {
    expect(() => spin(classic, classic.maxBet, seeds)).not.toThrow();
  });
});

describe('spin() — slot fruits (3 paylines)', () => {
  it('devuelve grid con 3 rodillos y 3 filas', () => {
    const result = spin(fruits, 300, seeds);
    expect(result.steps[0].grid).toHaveLength(3);
    expect(result.steps[0].grid[0]).toHaveLength(3);
  });

  it('winLines tienen paylineId entre 1 y 3', () => {
    for (let nonce = 0; nonce < 50; nonce++) {
      const { steps } = spin(fruits, 300, { ...seeds, nonce });
      for (const win of steps[0].winLines) {
        expect(win.paylineId).toBeGreaterThanOrEqual(1);
        expect(win.paylineId).toBeLessThanOrEqual(3);
      }
    }
  });
});
