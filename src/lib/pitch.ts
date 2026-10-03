/**
 * Toonhoogte veranderen zonder het tempo te veranderen, om de eigen stem minder herkenbaar te maken.
 * Eerst uitrekken of inkorten zonder de toon te raken (WSOLA: stukjes geluid overlappend aan elkaar
 * leggen op de plek waar ze het best passen), daarna terug naar de oorspronkelijke lengte herbemonsteren.
 * Netto blijft de duur gelijk en verschuift enkel de stem. Pure functies, dus ook in tests bruikbaar.
 */

/** Hoeveel halve tonen het schuifje hoogstens opzij mag. */
export const PITCH_SEMITONES = { min: -6, max: 6 } as const;

/** Langer of korter maken zonder de toonhoogte te veranderen. factor > 1 = langer. */
export function timeStretch(x: Float32Array, rate: number, factor: number): Float32Array {
  const n = Math.max(64, Math.round(rate * 0.04)); // stukjes van 40 ms
  const hopOut = Math.floor(n / 2);
  const hopIn = hopOut / factor;
  const tolerance = Math.round(rate * 0.005); // zoek ±5 ms naar de beste aansluiting
  const outLen = Math.round(x.length * factor);
  const win = new Float32Array(n);
  for (let i = 0; i < n; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / n);

  const y = new Float32Array(outLen + n);
  const weight = new Float32Array(outLen + n);
  let prev = 0;
  for (let k = 0; k * hopOut < outLen; k++) {
    const nominal = Math.round(k * hopIn);
    let start = Math.min(nominal, Math.max(0, x.length - n));
    if (k > 0) {
      // Wat er "natuurlijk" na het vorige stukje zou komen; zoek het stuk dat daar het best op lijkt.
      const target = prev + hopOut;
      let best = -Infinity;
      for (let d = -tolerance; d <= tolerance; d++) {
        const s = nominal + d;
        if (s < 0 || s + n > x.length) continue;
        let c = 0;
        for (let j = 0; j < n && target + j < x.length; j += 3) c += (x[s + j] ?? 0) * (x[target + j] ?? 0);
        if (c > best) {
          best = c;
          start = s;
        }
      }
    }
    const at = k * hopOut;
    for (let j = 0; j < n; j++) {
      const w = win[j] ?? 0;
      y[at + j] = (y[at + j] ?? 0) + (x[start + j] ?? 0) * w;
      weight[at + j] = (weight[at + j] ?? 0) + w;
    }
    prev = start;
  }
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const w = weight[i] ?? 0;
    out[i] = w > 1e-3 ? (y[i] ?? 0) / w : 0;
  }
  return out;
}

/** Herbemonsteren naar een andere lengte (lineair): korter = hoger, langer = lager. */
export function resample(x: Float32Array, length: number): Float32Array {
  const out = new Float32Array(length);
  const step = x.length / length;
  for (let i = 0; i < length; i++) {
    const p = i * step;
    const a = Math.floor(p);
    const t = p - a;
    out[i] = (x[a] ?? 0) * (1 - t) + (x[Math.min(a + 1, x.length - 1)] ?? 0) * t;
  }
  return out;
}

/** De stem hoger (+) of lager (-) in halve tonen, met hetzelfde tempo. */
export function shiftPitch(x: Float32Array, rate: number, semitones: number): Float32Array {
  if (semitones === 0 || x.length === 0) return x;
  const factor = 2 ** (semitones / 12);
  return resample(timeStretch(x, rate, factor), x.length);
}
