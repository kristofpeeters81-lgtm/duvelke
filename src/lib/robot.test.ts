import { describe, expect, it } from 'vitest';
import { encodeWav } from './wav';
import { defaultSettings, normalizeSettings } from './settings';
import { machineOn, setRecordedIds } from './speech';

describe('encodeWav', () => {
  it('maakt een geldig mono 16-bit wav-bestand', async () => {
    const wav = encodeWav(new Float32Array([0, 1, -1, 2]), 22050);
    const view = new DataView(await wav.arrayBuffer());
    const text = (o: number): string => String.fromCharCode(...[0, 1, 2, 3].map((i) => view.getUint8(o + i)));
    expect(text(0)).toBe('RIFF');
    expect(text(8)).toBe('WAVE');
    expect(view.getUint16(22, true)).toBe(1);
    expect(view.getUint32(24, true)).toBe(22050);
    expect(view.getUint32(40, true)).toBe(8);
    expect(view.getInt16(46, true)).toBe(0x7fff);
    expect(view.getInt16(48, true)).toBe(-0x8000);
    expect(view.getInt16(50, true)).toBe(0x7fff); // te luid wordt afgekapt
  });
});

describe('Kenzo zijn machien', () => {
  it('leest enkel voor als eigen opnames gekozen zijn én Windy echt iets ingesproken heeft', () => {
    const v = defaultSettings().voice;
    const ids = ['w001'];
    expect(machineOn(v, ids)).toBe(true);
    expect(machineOn({ ...v, useRecordings: false }, ids)).toBe(false);
    expect(machineOn({ ...v, machine: false }, ids)).toBe(false);
    expect(machineOn({ ...v, enabled: false }, ids)).toBe(false);
    // Niets ingesproken, of enkel namen: dan blijft de AI-stem Windy.
    expect(machineOn(v, [])).toBe(false);
    expect(machineOn(v, ['naam:p1', 'naam:p2'])).toBe(false);
  });

  it('volgt de opnames die de store meldt', () => {
    const v = defaultSettings().voice;
    setRecordedIds(['naam:p1']);
    expect(machineOn(v)).toBe(false);
    setRecordedIds(['naam:p1', 'w003']);
    expect(machineOn(v)).toBe(true);
    setRecordedIds([]);
  });

  it('bewaart de keuze en vult oude instellingen aan', () => {
    const d = defaultSettings();
    const kept = normalizeSettings({ ...d, voice: { ...d.voice, machine: false, machineSound: 'blik' } });
    expect(kept.voice.machine).toBe(false);
    expect(kept.voice.machineSound).toBe('blik');
    const { machine: _m, machineSound: _s, ...old } = d.voice;
    const upgraded = normalizeSettings({ ...d, voice: { ...old, machineSound: 'raar' } });
    expect(upgraded.voice.machine).toBe(true);
    expect(upgraded.voice.machineSound).toBe('licht');
  });
});
