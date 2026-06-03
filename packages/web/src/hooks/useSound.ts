/**
 * Efectos de sonido:
 * - Slots normales (frutas, bonanza, harvest): Web Audio API generado
 * - World Cup 2026: archivos .wav reales de /sounds/
 */

// ── Web Audio API (slots normales) ────────────────────────────────────────

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq: number, duration: number, type: OscillatorType = 'square', vol = 0.15, delay = 0) {
  const ac   = getCtx();
  const osc  = ac.createOscillator();
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

// ── Archivos .wav reales (World Cup) ──────────────────────────────────────

const audioCache = new Map<string, HTMLAudioElement>();

function playWav(file: string, volume = 1) {
  try {
    let audio = audioCache.get(file);
    if (!audio) {
      audio = new Audio(`/sounds/${file}`);
      audioCache.set(file, audio);
    }
    const clone = audio.cloneNode() as HTMLAudioElement;
    clone.volume = volume;
    clone.play().catch(() => {});
  } catch { /* ignore */ }
}

// ── Interfaz pública ──────────────────────────────────────────────────────

/** Llamar con slotId='worldcup' para usar sonidos reales; cualquier otro usa Web Audio */
export const sfx = {
  spin(slotId?: string) {
    if (slotId === 'worldcup') { playWav('spin.wav', 0.8); return; }
    for (let i = 0; i < 8; i++) tone(80 + i * 15, 0.08, 'sawtooth', 0.06, i * 0.07);
  },

  reelStop(reelIndex: number, slotId?: string) {
    if (slotId === 'worldcup') { playWav('stop.wav', 0.7); return; }
    tone(220 + reelIndex * 80, 0.06, 'square', 0.1, 0);
  },

  smallWin(slotId?: string) {
    if (slotId === 'worldcup') { playWav('win-small.wav'); return; }
    [523, 659, 784].forEach((f, i) => tone(f, 0.12, 'sine', 0.2, i * 0.1));
  },

  bigWin(slotId?: string) {
    if (slotId === 'worldcup') { playWav('win-big.wav'); return; }
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.2, 'sine', 0.25, i * 0.12));
    [523, 659, 784, 1047].forEach(f => tone(f, 0.4, 'sine', 0.15, 0.6));
  },

  jackpot(slotId?: string) {
    if (slotId === 'worldcup') { playWav('jackpot.wav'); return; }
    [523, 659, 784, 1047, 1318, 1568].forEach((f, i) => tone(f, 0.2, 'sine', 0.3, i * 0.1));
    for (let i = 0; i < 6; i++) [1047, 1318].forEach(f => tone(f, 0.08, 'sine', 0.2, 0.7 + i * 0.1));
  },

  freeSpins(slotId?: string) {
    if (slotId === 'worldcup') { playWav('freespins.wav'); return; }
    [392, 494, 587, 740, 880, 1047].forEach((f, i) => tone(f, 0.15, 'triangle', 0.2, i * 0.08));
  },

  click() {
    tone(440, 0.04, 'square', 0.08);
  },

  /** Precargar los .wav para evitar delay en el primer sonido */
  preloadFootball() {
    ['spin', 'stop', 'win-small', 'win-big', 'jackpot', 'freespins'].forEach(name => {
      if (!audioCache.has(`${name}.wav`)) {
        const a = new Audio(`/sounds/${name}.wav`);
        a.preload = 'auto';
        audioCache.set(`${name}.wav`, a);
      }
    });
  },
};
