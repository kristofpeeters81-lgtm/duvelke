import { describe, expect, it } from 'vitest';
import { SUPPLY_IDS } from '../data/supplies';
import { fillVars } from './program';
import { ALL_BUILTIN } from './registry';
import { validateTask } from './validate';

const LEVELS = ['makkelijk', 'normaal', 'pittig'] as const;

describe('alle ingebouwde opdrachten', () => {
  it('zijn er minstens 230, met unieke ids', () => {
    expect(ALL_BUILTIN.length).toBeGreaterThanOrEqual(230);
    const ids = ALL_BUILTIN.map((t) => t.id);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(dupes).toEqual([]);
  });

  it.each(ALL_BUILTIN.map((t) => [t.id, t] as const))('%s is geldig en veilig', (_id, t) => {
    for (const s of t.supplies) expect(SUPPLY_IDS.has(s), `benodigdheid ${s}`).toBe(true);
    expect(t.sabotage.length).toBeGreaterThanOrEqual(3);
    expect(t.locations.length).toBeGreaterThan(0);
    expect(t.minutes).toBeGreaterThanOrEqual(2);
    expect(t.minutes).toBeLessThanOrEqual(20);
    expect(['gelukt', 'aantal', 'quiz', 'stopwatch']).toContain(t.scoring.type);
    for (const level of LEVELS) {
      if (!t.difficulties.includes(level)) continue;
      const vars = Object.fromEntries(Object.entries(t.vars ?? {}).map(([k, v]) => [k, (v[level] ?? v.normaal)[0] ?? '']));
      for (const text of [t.explain, t.prep ?? '', String(t.timer ?? ''), t.scoring.type === 'aantal' ? String(t.scoring.target) : '']) {
        expect(fillVars(text, vars), `${level}: ${text.slice(0, 40)}`).not.toMatch(/\{\w+\}/);
      }
      if (t.scoring.type === 'aantal') expect(Number(fillVars(String(t.scoring.target), vars))).toBeGreaterThan(0);
      if (t.list) expect((t.list.items[level] ?? t.list.items.normaal).length).toBeGreaterThanOrEqual(t.list.pick);
    }
    // Dezelfde controle als voor AI-opdrachten: niets onveiligs of kapot.
    if (t.scoring.type === 'gelukt' || t.scoring.type === 'aantal') {
      const r = validateTask({ ...t }, { customSupplies: [], source: 'eigen' });
      expect(r.errors).toEqual([]);
    }
  });

  it('heeft voor elke plek een ruime keuze', () => {
    for (const loc of ['binnen', 'tuin', 'straat', 'bos', 'park', 'dorp', 'strand'] as const) {
      expect(ALL_BUILTIN.filter((t) => t.locations.includes(loc)).length, loc).toBeGreaterThanOrEqual(40);
    }
  });
});