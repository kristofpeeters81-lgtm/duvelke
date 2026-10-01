import { describe, expect, it } from 'vitest';
import { fillVars } from './program';
import { extractJsonArray, validateTask } from './validate';

const opts = { customSupplies: [{ id: 'eigen-1', label: 'Trampoline', emoji: '🪀' }], source: 'ai' as const };

const good = {
  title: 'De trampolinetelling',
  emoji: '🤸',
  category: 'beweging',
  locations: ['tuin', 'maan'],
  supplies: ['bal', 'Trampoline', 'raket'],
  minPlayers: 2,
  minutes: 7,
  timer: 120,
  explain: 'Spring om de beurt op de trampoline en tel samen tot {doel}. Lukt het?',
  vars: { doel: { makkelijk: [10], normaal: [20], pittig: [30] } },
  scoring: { type: 'aantal', target: '{doel}', unit: 'sprongen' },
  sabotage: ['Tel stiekem verkeerd.', 'Spring net iets te traag.', 'Leid de anderen af met grapjes.'],
  dilemma: true,
};

describe('validateTask', () => {
  it('aanvaardt een goede opdracht en ruimt kleine fouten op', () => {
    const r = validateTask(good, opts);
    expect(r.errors).toEqual([]);
    const t = r.task!;
    expect(t.id).toMatch(/^ai-de-trampolinetelling-/);
    expect(t.locations).toEqual(['tuin']);
    expect(t.supplies).toEqual(['bal', 'eigen-1']);
    expect(t.minPlayers).toBe(3);
    expect(t.source).toBe('ai');
    expect(r.warnings.some((w) => w.includes('raket'))).toBe(true);
    expect(fillVars(t.explain, { doel: 20 })).not.toMatch(/\{/);
  });

  it('bewaart speurderstips enkel als er minstens twee zijn', () => {
    const tips = ['Let op wie er net te traag springt.', 'Tel zelf stil mee met de sprongen.'];
    expect(validateTask({ ...good, detective: tips }, opts).task!.detective).toEqual(tips);
    expect(validateTask({ ...good, detective: [tips[0]] }, opts).task!.detective).toBeUndefined();
    expect(validateTask(good, opts).task!.detective).toBeUndefined();
  });

  it('weigert opdrachten zonder uitleg, plek of sabotagetips', () => {
    const r = validateTask({ title: 'X', locations: ['maan'], sabotage: [] }, opts);
    expect(r.task).toBeNull();
    expect(r.errors.length).toBeGreaterThanOrEqual(3);
  });

  it('weigert variabelen zonder waarden', () => {
    const r = validateTask({ ...good, vars: {} }, opts);
    expect(r.task).toBeNull();
    expect(r.errors.join(' ')).toContain('{doel}');
  });

  it('weigert onveilige opdrachten', () => {
    const r = validateTask({ ...good, explain: 'Iedereen gaat zwemmen in de vijver en telt de eenden onderweg.' }, opts);
    expect(r.task).toBeNull();
  });

  it('maakt van een ongeldig doel een gelukt/mislukt-opdracht', () => {
    const r = validateTask({ ...good, explain: 'Spring allemaal samen op de trampoline, zonder te vallen.', vars: undefined, scoring: { type: 'aantal', target: 'veel' } }, opts);
    expect(r.task?.scoring).toEqual({ type: 'gelukt' });
  });
});

describe('extractJsonArray', () => {
  it('haalt JSON uit een chatbot-antwoord met uitleg en codeblok', () => {
    const text = 'Hier zijn je opdrachten!\n```json\n[{"title": "A"}, {"title": "B"},]\n```\nVeel plezier!';
    expect(extractJsonArray(text)).toEqual([{ title: 'A' }, { title: 'B' }]);
  });

  it('werkt ook zonder codeblok en geeft null bij onzin', () => {
    expect(extractJsonArray('[{"title":"A"}]')).toEqual([{ title: 'A' }]);
    expect(extractJsonArray('sorry, dat kan ik niet')).toBeNull();
  });
});
