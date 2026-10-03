import { describe, expect, it } from 'vitest';
import { shiftPitch, timeStretch } from './pitch';

const RATE = 24000;

function sine(freq: number, seconds: number): Float32Array {
  return Float32Array.from({ length: Math.round(RATE * seconds) }, (_, i) => 0.5 * Math.sin((2 * Math.PI * freq * i) / RATE));
}

/** Toonhoogte meten via nuldoorgangen (in het midden, weg van de randen). */
function frequency(x: Float32Array): number {
  const from = Math.floor(x.length * 0.2);
  const to = Math.floor(x.length * 0.8);
  let crossings = 0;
  for (let i = from + 1; i < to; i++) if ((x[i - 1] ?? 0) < 0 && (x[i] ?? 0) >= 0) crossings++;
  return crossings / ((to - from) / RATE);
}

describe('stem vermommen', () => {
  it('maakt de stem hoger of lager zonder de lengte te veranderen', () => {
    const x = sine(200, 1);
    const up = shiftPitch(x, RATE, 12);
    const down = shiftPitch(x, RATE, -12);
    expect(up.length).toBe(x.length);
    expect(down.length).toBe(x.length);
    expect(frequency(up)).toBeGreaterThan(380);
    expect(frequency(up)).toBeLessThan(420);
    expect(frequency(down)).toBeGreaterThan(95);
    expect(frequency(down)).toBeLessThan(105);
  });

  it('verschuift met halve tonen: +3 is ongeveer 19% hoger', () => {
    const f = frequency(shiftPitch(sine(200, 1), RATE, 3));
    expect(f / 200).toBeGreaterThan(1.16);
    expect(f / 200).toBeLessThan(1.22);
  });

  it('laat de stem ongemoeid bij 0', () => {
    const x = sine(200, 0.5);
    expect(shiftPitch(x, RATE, 0)).toBe(x);
  });

  it('rekt uit zonder de toon te veranderen', () => {
    const long = timeStretch(sine(200, 1), RATE, 1.5);
    expect(long.length).toBe(36000);
    expect(Math.abs(frequency(long) - 200)).toBeLessThan(8);
  });
});
