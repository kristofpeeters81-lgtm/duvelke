/**
 * Kwaliteitsregels voor de ingebouwde opdrachten, uit de review van 5/10/2026. Ze vangen fouten op
 * die het spel niet laten crashen, maar het wel onspeelbaar of verwarrend maken.
 */
import { describe, expect, it } from 'vitest';
import { splitHints } from '../../screens/game/ListReader.svelte';
import { hasAnswers } from '../../screens/game/ReadAloud.svelte';
import { QUIZ } from './quiz';
import { ALL_BUILTIN } from './registry';
import { hostWording, windyReadsList } from './wording';

const LEVELS = ['makkelijk', 'normaal', 'pittig'] as const;
const cases = ALL_BUILTIN.map((t) => [t.id, t] as const);

describe('opdrachten: kwaliteit', () => {
  it.each(cases)('%s: voorlezen of geheim lijstje, op elk niveau hetzelfde', (_id, t) => {
    if (!t.list || t.list.turns || t.list.read) return;
    for (const level of LEVELS) {
      if (!t.difficulties.includes(level)) continue;
      const items = t.list.items[level]?.length ? t.list.items[level] : t.list.items.normaal;
      // Windy leest voor als élk item op "(antwoord)" eindigt; half en half zou op één niveau anders lopen.
      if (t.list.secret) expect(hasAnswers(items), level).toBe(windyReadsList(t));
    }
    // Wat Windy voorleest, telt de app: dan moet er ook geteld worden. Behalve als het doel iets
    // anders is dan juist antwoorden (bij kapitein Kenzo: de schat vinden).
    if (windyReadsList(t) && t.id !== 'n-schat-kapitein-kenzo') expect(t.scoring.type).toBe('aantal');
  });

  it.each(cases)('%s: wat de app zelf voorleest, is goed opgebouwd', (_id, t) => {
    const read = t.list?.read;
    if (!t.list || !read) return;
    const all = Object.values(t.list.items).flat();
    if (read === 'hints') for (const i of all) expect(splitHints(i).hints.length, i).toBeGreaterThanOrEqual(3);
    if (read === 'hints') for (const i of all) expect(splitHints(i).answer, i).not.toBe('');
    // Wat je moet onthouden of raden, mag niet open op het scherm staan.
    if (read === 'onthouden' || read === 'hints') expect(t.list.secret).toBe(true);
    if (read === 'willekeurig') expect(t.timer, 'willekeurig roepen hoort bij een timer').toBeDefined();
  });

  it.each(cases)('%s: "spelleider" wordt overal goed vervangen', (_id, t) => {
    const texts = [t.explain, t.prep ?? '', t.list?.title ?? '', ...t.sabotage, ...(t.detective ?? []), ...(t.roles ?? []).map((r) => r.hint), ...Object.values(t.list?.items ?? {}).flat()];
    for (const text of texts) {
      // Enkel "de spelleider" / "De spelleider" wordt vervangen.
      expect(text).not.toMatch(/Spelleider|spelleiders/);
      expect(hostWording(text, t, 'Windy')).not.toMatch(/\bhulpje,? die\b/);
    }
  });

  it.each(cases)('%s: de uitleg is goed voor te lezen', (_id, t) => {
    const spoken = [t.explain, ...(windyReadsList(t) ? Object.values(t.list?.items ?? {}).flat() : [])];
    for (const text of spoken) {
      expect(text, 'woorden in hoofdletters leest de stem slecht').not.toMatch(/\b[A-ZÀ-Ý]{3,}\b/);
      expect(text, 'tekens leest de stem slecht').not.toMatch(/[=+×→%&✓✗]|\bbv\.|\bkm\b/);
    }
  });

  it.each(cases)('%s: tips voor één rol hebben een alternatief', (_id, t) => {
    // 't Duvelke krijgt één tip, nog voor de rollen bekend zijn.
    for (const tip of t.sabotage) {
      if (/^(Ben jij|Ben je|Als (de )?[A-Z])/.test(tip)) expect(tip, tip).toMatch(/Anders|Zo niet|Ben je (het )?niet|Ben je geen|andere rondes/i);
    }
  });

  it.each(cases)('%s: leidt het hulpje, dan heeft het eigen tips', (_id, t) => {
    if (!t.host) return;
    expect(t.host.sabotage.length).toBeGreaterThanOrEqual(2);
    expect(t.host.detective.length).toBeGreaterThan(10);
    for (const tip of [...t.host.sabotage, t.host.detective]) expect(tip).not.toMatch(/spelleider|saboteur|Duvelke/i);
  });

  it.each(cases)('%s: geen nacht, slapen of Halloween', (_id, t) => {
    expect([t.title, t.explain, t.prep ?? ''].join(' ')).not.toMatch(/\b(nacht|halloween|pyjama|slaapzak|bedtijd)\b/i);
  });
});

describe('quiz', () => {
  it.each(LEVELS)('%s: geldige antwoorden, voorleesbaar', (level) => {
    for (const q of QUIZ[level]) {
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(q.options.length);
      expect(new Set(q.options).size, q.q).toBe(q.options.length);
      expect([q.q, ...q.options].join(' '), q.q).not.toMatch(/[=+×→%&✓✗]|\bkm\b/);
    }
  });
});
