import { describe, it, expect } from 'vitest';
import { computeTheoreticalRtp, simulateRtp } from '../src/rtp.js';
import { classic } from '../src/slots/classic.js';
import { fruits } from '../src/slots/fruits.js';

const SIM_SPINS = 100_000;
const SIM_MARGIN = 0.02; // ±2 % de tolerancia estadística

describe('RTP teórico — classic', () => {
  it('es exactamente 96.0 % (margen ±0.1 %)', () => {
    const rtp = computeTheoreticalRtp(classic);
    expect(rtp).toBeGreaterThanOrEqual(0.959);
    expect(rtp).toBeLessThanOrEqual(0.961);
  });
});

describe('RTP teórico — fruits', () => {
  it('está dentro del ±0.5 % del objetivo 96 %', () => {
    const rtp = computeTheoreticalRtp(fruits);
    expect(rtp).toBeGreaterThanOrEqual(0.955);
    expect(rtp).toBeLessThanOrEqual(0.965);
  });
});

describe('RTP simulado — classic', () => {
  it(`${SIM_SPINS.toLocaleString()} giros se aproximan al 96 % (±${SIM_MARGIN * 100} %)`, () => {
    const rtp = simulateRtp(classic, SIM_SPINS, 100);
    expect(rtp).toBeGreaterThanOrEqual(classic.targetRtp / 100 - SIM_MARGIN);
    expect(rtp).toBeLessThanOrEqual(classic.targetRtp / 100 + SIM_MARGIN);
  });
});

describe('RTP simulado — fruits', () => {
  it(`${SIM_SPINS.toLocaleString()} giros se aproximan al 96 % (±${SIM_MARGIN * 100} %)`, () => {
    const rtp = simulateRtp(fruits, SIM_SPINS, 300);
    expect(rtp).toBeGreaterThanOrEqual(fruits.targetRtp / 100 - SIM_MARGIN);
    expect(rtp).toBeLessThanOrEqual(fruits.targetRtp / 100 + SIM_MARGIN);
  });
});
