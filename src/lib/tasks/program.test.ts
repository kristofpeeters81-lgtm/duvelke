import { describe, expect, it } from 'vitest';
import { SUPPLY_IDS } from '../data/supplies';
import { defaultSettings } from '../settings';
import type { Settings } from '../types';
import { BUILTIN_TASKS } from './library';
import { buildProgram, fillVars, packingList, programMinutes, swapItem, whyNot, type PlanContext } from './program';
import { QUIZ } from './quiz';

function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function ctx(settings: Partial<Settings> = {}, playerCount = 8): PlanContext {
  return { settings: { ...defaultSettings(), ...settings }, playerCount, tasks: BUILTIN_TASKS };
}

describe('de opdrachtenbibliotheek', () => {
  it('heeft unieke ids en minstens 40 opdrachten', () => {
    expect(new Set(BUILTIN_TASKS.map((t) => t.id)).size).toBe(BUILTIN_TASKS.length);
    expect(BUILTIN_TASKS.length).toBeGreaterThanOrEqual(40);
  });

  it('gebruikt enkel bestaande benodigdheden', () => {
    for (const t of BUILTIN_TASKS) for (const s of t.supplies) expect(SUPPLY_IDS.has(s), `${t.id}: ${s}`).toBe(true);
  });

  it('heeft voor elke opdracht minstens 3 sabotagetips', () => {
    for (const t of BUILTIN_TASKS) expect(t.sabotage.length, t.id).toBeGreaterThanOrEqual(3);
  });

  it('vult alle variabelen in de teksten in, op elk niveau', () => {
    for (const difficulty of ['makkelijk', 'normaal', 'pittig'] as const) {
      const c = ctx({ difficulty, locations: ['binnen', 'tuin', 'straat', 'bos', 'park', 'dorp', 'strand'], supplies: [...SUPPLY_IDS] });
      for (let seed = 1; seed < 6; seed++) {
        const program = buildProgram({ ...c, ratings: {} }, seeded(seed));
        for (const item of program) {
          const task = BUILTIN_TASKS.find((t) => t.id === item.taskId)!;
          for (const text of [task.explain, task.prep ?? '']) expect(fillVars(text, item.vars), task.id).not.toMatch(/\{\w+\}/);
          if (task.scoring.type === 'aantal' && typeof task.scoring.target === 'string') {
            expect(Number(fillVars(task.scoring.target, item.vars)), task.id).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  it('heeft genoeg quizvragen met geldige antwoorden', () => {
    for (const level of Object.values(QUIZ)) {
      expect(level.length).toBeGreaterThanOrEqual(12);
      for (const q of level) expect(q.answer).toBeLessThan(q.options.length);
    }
  });
});

describe('whyNot', () => {
  const bekertoren = BUILTIN_TASKS.find((t) => t.id === 'bekertoren')!;

  it('weigert opdrachten waarvoor benodigdheden ontbreken', () => {
    expect(whyNot(bekertoren, ctx({ supplies: [] }))).toBe('benodigdheden ontbreken');
    expect(whyNot(bekertoren, ctx({ supplies: ['plastiekbekers'] }))).toBeNull();
  });

  it('weigert opdrachten op andere plekken', () => {
    expect(whyNot(bekertoren, ctx({ supplies: ['plastiekbekers'], locations: ['strand'] }))).not.toBeNull();
  });

  it('weigert opdrachten met te weinig spelers', () => {
    const knoop = BUILTIN_TASKS.find((t) => t.id === 'mensenknoop')!;
    expect(whyNot(knoop, ctx({}, 3))).not.toBeNull();
  });
});

describe('buildProgram', () => {
  it('kiest enkel opdrachten die kunnen', () => {
    const c = ctx({ locations: ['binnen'], supplies: [] });
    for (let seed = 1; seed < 20; seed++) {
      for (const item of buildProgram(c, seeded(seed))) {
        const task = BUILTIN_TASKS.find((t) => t.id === item.taskId)!;
        expect(whyNot(task, c)).toBeNull();
        expect(item.location).toBe('binnen');
      }
    }
  });

  it('past ongeveer in de gekozen speelduur', () => {
    for (const duration of [45, 90, 150]) {
      const c = ctx({ durationMinutes: duration, supplies: [...SUPPLY_IDS] });
      const program = buildProgram(c, seeded(duration));
      expect(program.length).toBeGreaterThanOrEqual(3);
      expect(programMinutes(program, c)).toBeLessThanOrEqual(duration + 15);
    }
  });

  it('geeft een langer spel meer opdrachten', () => {
    const short = buildProgram(ctx({ durationMinutes: 45 }), seeded(1)).length;
    const long = buildProgram(ctx({ durationMinutes: 150 }), seeded(1)).length;
    expect(long).toBeGreaterThan(short);
  });

  it('kiest geen dubbele opdrachten en wisselt af in soort', () => {
    const c = ctx({ durationMinutes: 150, supplies: [...SUPPLY_IDS] });
    const program = buildProgram(c, seeded(5));
    expect(new Set(program.map((p) => p.taskId)).size).toBe(program.length);
    const categories = program.map((p) => BUILTIN_TASKS.find((t) => t.id === p.taskId)!.category);
    expect(new Set(categories).size).toBeGreaterThanOrEqual(Math.min(program.length, 6));
  });

  it('gebruikt elke gekozen plek en zet ze gegroepeerd', () => {
    const c = ctx({ durationMinutes: 120, locations: ['binnen', 'bos'] });
    const program = buildProgram(c, seeded(3));
    const locs = program.map((p) => p.location);
    expect(locs).toContain('binnen');
    expect(locs).toContain('bos');
    expect(locs.indexOf('bos')).toBeGreaterThan(locs.lastIndexOf('binnen'));
  });

  it('laat duimpjes omlaag minder vaak terugkomen', () => {
    let withBad = 0;
    for (let seed = 1; seed < 200; seed++) {
      const program = buildProgram({ ...ctx(), ratings: { 'tel-tot-twintig': -5 } }, seeded(seed));
      if (program.some((p) => p.taskId === 'tel-tot-twintig')) withBad++;
    }
    let without = 0;
    for (let seed = 1; seed < 200; seed++) {
      if (buildProgram(ctx(), seeded(seed)).some((p) => p.taskId === 'tel-tot-twintig')) without++;
    }
    expect(withBad).toBeLessThan(without);
  });
});

describe('swapItem en packingList', () => {
  it('vervangt één opdracht door een andere die nog niet in het programma zit', () => {
    const c = ctx({ supplies: [...SUPPLY_IDS] });
    const program = buildProgram(c, seeded(2));
    const swapped = swapItem(program, 0, c, seeded(9));
    expect(swapped[0]!.taskId).not.toBe(program[0]!.taskId);
    expect(program.slice(1).map((p) => p.taskId)).not.toContain(swapped[0]!.taskId);
    expect(swapped.slice(1)).toEqual(program.slice(1));
  });

  it('verzamelt benodigdheden en voorbereiding zonder dubbels', () => {
    const c = ctx({ supplies: [...SUPPLY_IDS] });
    const program = buildProgram(c, seeded(4));
    const list = packingList(program, BUILTIN_TASKS);
    expect(new Set(list.supplies).size).toBe(list.supplies.length);
    for (const p of list.prep) expect(p.text).not.toMatch(/\{\w+\}/);
  });
});
