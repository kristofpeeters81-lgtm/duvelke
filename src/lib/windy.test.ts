import { describe, expect, it } from 'vitest';
import { BUILTIN_LINES, LINE_CATEGORIES } from './data/windyLines';
import { toSpeech } from './voice';
import { emptyLineState, fillPlaceholders, isFullyRecorded, linesFor, normalizeLineState, pickLine, recordingParts, rememberLine } from './windy';

const ctx = { saboteur: "'t Duvelke", zoon: 'Kenzo', windy: 'Windy' };

describe('ingebouwde uitspraken', () => {
  it('heeft voor elke soort minstens 3 uitspraken met unieke ids', () => {
    for (const cat of LINE_CATEGORIES) {
      expect(BUILTIN_LINES.filter((l) => l.category === cat.id).length).toBeGreaterThanOrEqual(3);
    }
    expect(new Set(BUILTIN_LINES.map((l) => l.id)).size).toBe(BUILTIN_LINES.length);
  });

  it('gebruikt enkel gekende plaatshouders', () => {
    for (const line of BUILTIN_LINES) {
      const rest = line.text.replace(/\{(saboteur|zoon|windy|speler)\}/g, '');
      expect(rest, line.id).not.toMatch(/[{}]/);
    }
  });
});

describe('fillPlaceholders', () => {
  it('vult alle plaatshouders in, ook meermaals', () => {
    expect(fillPlaceholders('{windy} en {windy} zoeken {saboteur}; {zoon} slaapt. {speler}!', { ...ctx, speler: 'Lotte' })).toBe(
      "Windy en Windy zoeken 't Duvelke; Kenzo slaapt. Lotte!",
    );
  });
});

describe('pickLine', () => {
  it('kiest geen uitgezette uitspraken', () => {
    const introIds = BUILTIN_LINES.filter((l) => l.category === 'intro').map((l) => l.id);
    const state = { custom: [], disabled: introIds.slice(1) };
    for (let i = 0; i < 20; i++) expect(pickLine('intro', state, ctx)?.id).toBe(introIds[0]);
  });

  it('geeft null als alles uitgezet is en er geen eigen uitspraken zijn', () => {
    const all = BUILTIN_LINES.filter((l) => l.category === 'einde').map((l) => l.id);
    expect(pickLine('einde', { custom: [], disabled: all }, ctx)).toBeNull();
  });

  it('gebruikt eigen uitspraken', () => {
    const all = BUILTIN_LINES.filter((l) => l.category === 'zoon').map((l) => l.id);
    const state = { custom: [{ id: 'x', category: 'zoon' as const, text: '{zoon} eet chips.', builtIn: false }], disabled: all };
    expect(pickLine('zoon', state, ctx)?.text).toBe('Kenzo eet chips.');
  });

  it('vermijdt recent gebruikte uitspraken zolang er nog andere zijn', () => {
    const lines = linesFor('roddel', emptyLineState());
    const recent = lines.slice(1).map((l) => l.id);
    for (let i = 0; i < 20; i++) expect(pickLine('roddel', emptyLineState(), ctx, recent)?.id).toBe(lines[0]?.id);
  });

  it('kiest geen uitspraak met {speler} als er geen speler is', () => {
    for (let i = 0; i < 30; i++) expect(pickLine('doorgeven', emptyLineState(), ctx)).toBeNull();
    expect(pickLine('doorgeven', emptyLineState(), { ...ctx, speler: 'Noor' })?.text).toContain('Noor');
  });
});

describe('normalizeLineState', () => {
  it('ruimt kapotte data op', () => {
    const state = normalizeLineState({
      custom: [
        { id: 'a', category: 'intro', text: '  Hallo!  ' },
        { id: 'b', category: 'bestaat-niet', text: 'weg' },
        { id: 'c', category: 'intro', text: '   ' },
        'onzin',
      ],
      disabled: ['w001', 'w001', 'bestaat-niet', 5],
    });
    expect(state.custom).toEqual([{ id: 'a', category: 'intro', text: 'Hallo!', builtIn: false }]);
    expect(state.disabled).toEqual(['w001']);
  });
});

describe('rememberLine', () => {
  it('zet de nieuwste vooraan zonder dubbels en begrenst de lengte', () => {
    expect(rememberLine(['a', 'b', 'c'], 'b', 3)).toEqual(['b', 'a', 'c']);
    expect(rememberLine(['a', 'b', 'c'], 'd', 3)).toEqual(['d', 'a', 'b']);
  });
});

describe('toSpeech', () => {
  it('maakt Kempische afkortingen en emoji uitspreekbaar', () => {
    expect(toSpeech("'t Is hier Windy! 'k Zeg niks 😈 hé")).toBe('et Is hier Windy! ik Zeg niks hé');
  });

  it('zegt "\'s morgens" als één woord en leest geen losse "es" na een woord', () => {
    expect(toSpeech("'s Morgens en ’s nachts")).toBe('sMorgens en snachts');
    expect(toSpeech("Da's Windy's pruik en foto's")).toBe('Das Windys pruik en fotos');
    expect(toSpeech('’t Duvelke en ’k weet het')).toBe('et Duvelke en ik weet het');
  });

  it('beklemtoont Kempische verkleinwoorden vooraan', () => {
    expect(toSpeech('Dag schatteke, efkes mijn zakdoekskes.')).toBe('Dag schattekke, efkus mijn zakdoekskus.');
    expect(toSpeech('Kom ne keer, mannekes van onzen Kenzo.')).toBe('Kom nen keer, mannekkus van onzn Kenzo.');
    expect(toSpeech('Een unieke, fysieke opdracht.')).toBe('Een unieke, fysieke opdracht.');
  });

  it('laat klinkerloze tussenwerpsels niet spellen', () => {
    expect(toSpeech('Psst... kom ne keer dichter.')).toBe('kom nen keer dichter.');
    expect(toSpeech('Sssst! Stil!')).toBe('Stil!');
    expect(toSpeech('Hmm. Ik ruik hier iets.')).toBe('hum. Ik ruik hier iets.');
    expect(toSpeech('Mmm, lekker. Pfff, moe. Brrr, koud.')).toBe('mjam, lekker. poeh, moe. boe, koud.');
  });

  it('leest WOORDEN IN HOOFDLETTERS als gewone woorden', () => {
    expect(toSpeech('Ik overdrijf NOOIT. Nooit!')).toBe('Ik overdrijf Nooit. Nooit!');
  });

  it('maakt van beletseltekens een korte pauze', () => {
    expect(toSpeech('Ik wil niet roddelen hé. Maar...')).toBe('Ik wil niet roddelen hé. Maar,');
  });

  it('laat geen enkele ingebouwde uitspraak met een klinkerloos woord achter', () => {
    for (const line of BUILTIN_LINES) {
      const spoken = toSpeech(line.text);
      const words = spoken.split(/[^\p{L}]+/u).filter((w) => w.length > 1);
      // Afkortingen die je in het Vlaams echt letter per letter zegt, mogen wel.
      const spelledOnPurpose = new Set(['gsm', 'tv', 'wc', 'pc']);
      const vowelless = words.filter((w) => !/[aeiouyáéíóúàèëïöü]/i.test(w) && !spelledOnPurpose.has(w.toLowerCase()));
      expect(vowelless, `${line.id}: ${spoken}`).toEqual([]);
    }
  });
});

describe('recordingParts', () => {
  it('splitst een zin met {speler} in vóór en na de naam', () => {
    const parts = recordingParts({ id: 'w011', text: 'Allee, geef de tablet maar aan {speler}. Voorzichtig hé!' });
    expect(parts.map((p) => p.id)).toEqual(['w011:voor', 'w011:na']);
    expect(parts[0]!.template).toBe('Allee, geef de tablet maar aan');
    expect(parts[1]!.template).toBe('. Voorzichtig hé!');
  });

  it('heeft maar één stuk als de naam vooraan staat', () => {
    expect(recordingParts({ id: 'x', text: '{speler}, uw beurt!' }).map((p) => p.id)).toEqual(['x:na']);
  });

  it('gewone zinnen zijn één stuk; volledig ingesproken als alle stukken er zijn', () => {
    expect(recordingParts({ id: 'y', text: 'Hallo!' })).toEqual([{ id: 'y', template: 'Hallo!', label: 'De zin' }]);
    const line = { id: 'z', text: 'A {speler} B' };
    expect(isFullyRecorded(line, ['z:voor'])).toBe(false);
    expect(isFullyRecorded(line, ['z:voor', 'z:na'])).toBe(true);
  });
});