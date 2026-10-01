import { describe, expect, it } from 'vitest';
import { trimBounds } from './wav';

const RATE = 1000; // blokjes van 10 samples: makkelijk rekenen

/** Stilte (met wat ruis), dan geluid, dan weer stilte. */
function clip(silenceBefore: number, sound: number, silenceAfter: number, noise = 0.003): Float32Array {
  const out = new Float32Array(silenceBefore + sound + silenceAfter);
  for (let i = 0; i < out.length; i++) {
    const inSound = i >= silenceBefore && i < silenceBefore + sound;
    out[i] = inSound ? 0.5 * Math.sin(i) : noise * Math.sin(i * 7);
  }
  return out;
}

describe('trimBounds', () => {
  it('knipt de stilte aan beide kanten weg, met een beetje marge', () => {
    const { start, end } = trimBounds(clip(500, 400, 600), RATE);
    expect(start).toBe(500 - 40);
    expect(end).toBe(900 + 120);
  });

  it('knipt nooit buiten de opname', () => {
    const { start, end } = trimBounds(clip(10, 300, 20), RATE);
    expect(start).toBe(0);
    expect(end).toBe(330);
  });

  it('laat een stille opname (of enkel ruis) ongemoeid', () => {
    const silent = clip(500, 0, 500);
    expect(trimBounds(silent, RATE)).toEqual({ start: 0, end: silent.length });
  });

  it('houdt stillere stukjes midden in de zin', () => {
    const a = clip(300, 200, 0);
    const soft = new Float32Array(300).map((_, i) => 0.08 * Math.sin(i));
    const all = new Float32Array([...a, ...soft, ...clip(0, 200, 400)]);
    const { start, end } = trimBounds(all, RATE);
    expect(start).toBe(260);
    expect(end).toBe(1000 + 120);
  });
});
