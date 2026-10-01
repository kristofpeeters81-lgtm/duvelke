/**
 * Kenzo zijn machien: de AI-stem door een zelfgemaakt robot-effect, met Web Audio (dus offline).
 * Ringmodulatie geeft de metalen robotklank, een filter maakt er een blikken doos van.
 * Vooraf komt een kort bliepje, zodat je hoort dat het machien aan het woord is.
 */
import type { MachineSound } from './types';
import { encodeWav } from './wav';

interface Preset {
  /** Frequentie van de ringmodulatie: hoger klinkt blikkeriger. */
  ring: number;
  /** Hoeveel robot er door de stem gemengd wordt (0 = gewone stem, 1 = enkel robot). */
  wet: number;
  lowCut: number;
  highCut: number;
}

export const MACHINE_SOUNDS: { id: MachineSound; label: string; sub: string }[] = [
  { id: 'licht', label: 'Licht', sub: 'aanbevolen' },
  { id: 'robot', label: 'Robot', sub: 'meer robot' },
  { id: 'blik', label: 'Blikken doos', sub: 'het grappigst' },
];

const PRESETS: Record<MachineSound, Preset> = {
  licht: { ring: 30, wet: 0.35, lowCut: 150, highCut: 7000 },
  robot: { ring: 55, wet: 0.65, lowCut: 250, highCut: 5000 },
  blik: { ring: 90, wet: 0.6, lowCut: 600, highCut: 3200 },
};

/** Tijd voor het bliepje, vóór de stem begint. */
const LEAD = 0.42;

function beep(ctx: OfflineAudioContext, freq: number, start: number, duration: number, out: AudioNode): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.12, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(out);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

/** Maakt van een gewone AI-zin (wav) de stem van het machien, met een bliepje vooraf. */
export async function robotize(wav: Blob, sound: MachineSound): Promise<Blob> {
  const preset = PRESETS[sound];
  const decoder = new OfflineAudioContext(1, 1, 22050);
  const input = await decoder.decodeAudioData(await wav.arrayBuffer());
  const rate = input.sampleRate;
  const ctx = new OfflineAudioContext(1, Math.ceil((input.duration + LEAD + 0.15) * rate), rate);

  const highpass = ctx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = preset.lowCut;
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = preset.highCut;
  const master = ctx.createGain();
  master.gain.value = 0.95;
  highpass.connect(lowpass).connect(master).connect(ctx.destination);

  const source = ctx.createBufferSource();
  source.buffer = input;
  const dry = ctx.createGain();
  dry.gain.value = 1 - preset.wet;
  // Ringmodulatie: het volume van de stem gaat mee op en neer met een trage sinus (vermenigvuldigen).
  const ring = ctx.createGain();
  ring.gain.value = 0;
  const carrier = ctx.createOscillator();
  carrier.frequency.value = preset.ring;
  const depth = ctx.createGain();
  depth.gain.value = preset.wet * 1.4;
  carrier.connect(depth).connect(ring.gain);
  source.connect(dry).connect(highpass);
  source.connect(ring).connect(highpass);

  beep(ctx, 1320, 0.02, 0.09, ctx.destination);
  beep(ctx, 880, 0.15, 0.13, ctx.destination);
  carrier.start(0);
  source.start(LEAD);

  const rendered = await ctx.startRendering();
  return encodeWav(normalize(rendered.getChannelData(0)), rate);
}

/** Even luid, welke klank je ook kiest: de filters en de ringmodulatie maken de stem stiller. */
export function normalize(samples: Float32Array, peak = 0.9): Float32Array {
  let max = 0;
  for (const x of samples) max = Math.max(max, Math.abs(x));
  if (max === 0) return samples;
  const gain = peak / max;
  return samples.map((x) => x * gain);
}
