/**
 * Geluidseffecten, zelf gemaakt met Web Audio: geen bestanden, geen licenties, altijd offline.
 */
let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(on: boolean): void {
  enabled = on;
}

function audio(): AudioContext | null {
  if (!enabled || typeof AudioContext === 'undefined') return null;
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(freq: number, start: number, duration: number, type: OscillatorType = 'sine', volume = 0.2, slideTo?: number): void {
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime + start;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + duration);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

export const sfx = {
  tap(): void {
    tone(660, 0, 0.08, 'triangle', 0.08);
  },
  tick(): void {
    tone(1200, 0, 0.05, 'square', 0.04);
  },
  /** Laatste seconden van de timer. */
  urgent(): void {
    tone(880, 0, 0.12, 'square', 0.08);
  },
  timeUp(): void {
    [0, 0.25, 0.5].forEach((s) => tone(988, s, 0.2, 'square', 0.15));
    tone(660, 0.8, 0.6, 'sawtooth', 0.12, 330);
    navigator.vibrate?.([300, 100, 300, 100, 600]);
  },
  gem(): void {
    tone(1568, 0, 0.12, 'triangle', 0.12);
    tone(2093, 0.06, 0.18, 'triangle', 0.1);
  },
  success(): void {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.3, 'triangle', 0.16));
  },
  fail(): void {
    tone(392, 0, 0.35, 'sawtooth', 0.1, 370);
    tone(349, 0.35, 0.35, 'sawtooth', 0.1, 330);
    tone(311, 0.7, 0.7, 'sawtooth', 0.1, 220);
  },
  reveal(): void {
    tone(220, 0, 0.6, 'sine', 0.15, 880);
  },
};
