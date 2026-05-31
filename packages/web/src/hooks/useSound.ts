/**
 * Efectos de sonido generados con Web Audio API.
 * No requiere archivos de audio externos.
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(
  freq: number,
  duration: number,
  type: OscillatorType = 'square',
  vol = 0.15,
  delay = 0,
) {
  const ac  = getCtx();
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime + delay);
  gain.gain.setValueAtTime(0, ac.currentTime + delay);
  gain.gain.linearRampToValueAtTime(vol, ac.currentTime + delay + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + duration);
  osc.start(ac.currentTime + delay);
  osc.stop(ac.currentTime + delay + duration + 0.05);
}

export const sfx = {
  /** Sonido de rodillos girando — ruido rítmico */
  spin() {
    for (let i = 0; i < 8; i++) {
      tone(80 + i * 15, 0.08, 'sawtooth', 0.06, i * 0.07);
    }
  },

  /** Clic cuando cada rodillo se detiene */
  reelStop(reelIndex: number) {
    tone(220 + reelIndex * 80, 0.06, 'square', 0.1, 0);
  },

  /** Ganancia pequeña — ding ascendente */
  smallWin() {
    const notes = [523, 659, 784];
    notes.forEach((f, i) => tone(f, 0.12, 'sine', 0.2, i * 0.1));
  },

  /** Ganancia grande — fanfare */
  bigWin() {
    const melody = [523, 659, 784, 1047];
    melody.forEach((f, i) => tone(f, 0.2, 'sine', 0.25, i * 0.12));
    // Acorde final
    [523, 659, 784, 1047].forEach(f => tone(f, 0.4, 'sine', 0.15, 0.6));
  },

  /** ¡JACKPOT! — fanfare especial */
  jackpot() {
    const melody = [523, 659, 784, 1047, 1318, 1568];
    melody.forEach((f, i) => tone(f, 0.2, 'sine', 0.3, i * 0.1));
    // Trémolo final
    for (let i = 0; i < 6; i++) {
      [1047, 1318].forEach(f => tone(f, 0.08, 'sine', 0.2, 0.7 + i * 0.1));
    }
  },

  /** Free spins disparados */
  freeSpins() {
    const scale = [392, 494, 587, 740, 880, 1047];
    scale.forEach((f, i) => tone(f, 0.15, 'triangle', 0.2, i * 0.08));
  },

  /** Click en botón */
  click() {
    tone(440, 0.04, 'square', 0.08);
  },
};
