import { shiftPitch } from './pitch';

/**
 * Kleine geluidshulpjes: wav maken, stilte aan de randen wegknippen en opnames aan elkaar plakken.
 * Alles met Web Audio in de browser, dus offline.
 */

/** Mono 16-bit PCM als wav-bestand. */
export function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const text = (offset: number, s: string): void => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  text(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i] ?? 0));
    view.setInt16(44 + i * 2, v < 0 ? v * 0x8000 : v * 0x7fff, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Waar het geluid echt begint en eindigt (in samples), zonder de stilte aan de randen.
 * Gemeten per blokje van 10 ms; een beetje marge, zodat een zachte "s" of "h" niet weggeknipt wordt.
 */
export function trimBounds(samples: Float32Array, sampleRate: number): { start: number; end: number } {
  const win = Math.max(1, Math.round(sampleRate * 0.01));
  const blocks = Math.ceil(samples.length / win);
  const rms: number[] = [];
  for (let b = 0; b < blocks; b++) {
    let sum = 0;
    const from = b * win;
    const to = Math.min(samples.length, from + win);
    for (let i = from; i < to; i++) sum += (samples[i] ?? 0) ** 2;
    rms.push(Math.sqrt(sum / Math.max(1, to - from)));
  }
  const peak = Math.max(0, ...rms);
  // Ruis van de microfoon telt niet als geluid: hoogstens 1/10 van het luidste stuk, en minstens -40 dB.
  const threshold = Math.max(0.01, peak * 0.1);
  const first = rms.findIndex((r) => r > threshold);
  if (first === -1) return { start: 0, end: samples.length };
  let last = rms.length - 1;
  while (last > first && (rms[last] ?? 0) <= threshold) last--;
  const before = Math.round(sampleRate * 0.04);
  const after = Math.round(sampleRate * 0.12);
  return { start: Math.max(0, first * win - before), end: Math.min(samples.length, (last + 1) * win + after) };
}

/** Pauze tussen twee stukjes, zoals bij een komma. */
const GAP_SECONDS = 0.12;
/** Ruim genoeg voor een stem, en de helft minder rekenwerk voor het vermommen dan 48 kHz. */
const RATE = 24000;

/**
 * Plakt opnames (bv. "kom ne keer hier" + naam + "schatteke") vlot aan elkaar tot één wav,
 * eventueel hoger of lager gemaakt (in halve tonen) om de stem te vermommen.
 */
export async function stitch(pieces: Blob[], semitones = 0): Promise<Blob> {
  const decoder = new OfflineAudioContext(1, 1, RATE);
  const parts: Float32Array[] = [];
  for (const piece of pieces) {
    const audio = await decoder.decodeAudioData(await piece.arrayBuffer());
    const mono = new Float32Array(audio.length);
    for (let c = 0; c < audio.numberOfChannels; c++) {
      const data = audio.getChannelData(c);
      for (let i = 0; i < data.length; i++) mono[i] = (mono[i] ?? 0) + (data[i] ?? 0) / audio.numberOfChannels;
    }
    const { start, end } = trimBounds(mono, RATE);
    parts.push(fade(mono.slice(start, end), RATE));
  }
  const gap = Math.round(RATE * GAP_SECONDS);
  const total = parts.reduce((n, p) => n + p.length, 0) + gap * Math.max(0, parts.length - 1);
  const out = new Float32Array(total);
  let at = 0;
  parts.forEach((p, i) => {
    out.set(p, at);
    at += p.length + (i < parts.length - 1 ? gap : 0);
  });
  return encodeWav(shiftPitch(out, RATE, semitones), RATE);
}

/** Heel korte in- en uitfade, zodat er geen tikje klinkt waar geknipt is. */
function fade(samples: Float32Array, sampleRate: number): Float32Array {
  const n = Math.min(Math.round(sampleRate * 0.008), Math.floor(samples.length / 2));
  for (let i = 0; i < n; i++) {
    const g = i / n;
    samples[i] = (samples[i] ?? 0) * g;
    samples[samples.length - 1 - i] = (samples[samples.length - 1 - i] ?? 0) * g;
  }
  return samples;
}
