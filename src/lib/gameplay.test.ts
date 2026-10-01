import { describe, expect, it } from 'vitest';
import {
  assignTaskRoles,
  gemsForCount,
  gemsForOutcome,
  gemsForStopwatch,
  hurryAtMs,
  meddleMoments,
  pickQuiz,
  targetFor,
  timerSeconds,
  treasure,
  type TaskResult,
} from './gameplay';
import { BUILTIN_TASKS } from './tasks/library';
import type { ProgramItem } from './tasks/program';
import { QUIZ } from './tasks/quiz';

const task = (id: string) => BUILTIN_TASKS.find((t) => t.id === id)!;
const item = (taskId: string, vars: Record<string, string | number> = {}, uid = taskId): ProgramItem => ({ uid, taskId, location: 'binnen', vars, list: [] });

function result(uid: string, gems: number, maxGems = 10, outcome: TaskResult['outcome'] = 'score', roles: Record<string, string[]> = {}): TaskResult {
  return { uid, taskId: uid, outcome, score: null, target: null, gems, maxGems, roles, rating: 0 };
}

describe('edelstenen', () => {
  it('geeft alles bij gelukt, de helft bij bijna en niets bij mislukt', () => {
    const t = task('bekertoren');
    expect(gemsForOutcome(t, 'gelukt')).toBe(10);
    expect(gemsForOutcome(t, 'bijna')).toBe(5);
    expect(gemsForOutcome(t, 'mislukt')).toBe(0);
  });

  it('rekent een aantal naar verhouding, nooit meer dan het maximum', () => {
    const t = task('wasknijper-jacht');
    expect(gemsForCount(t, 6, 12)).toBe(5);
    expect(gemsForCount(t, 20, 12)).toBe(10);
    expect(gemsForCount(t, -3, 12)).toBe(0);
  });

  it('geeft bij de stopwatch alles binnen de marge en de helft binnen dubbele marge', () => {
    const t = task('innerlijke-klok');
    expect(gemsForStopwatch(t, 32, 30, 3)).toBe(10);
    expect(gemsForStopwatch(t, 25, 30, 3)).toBe(5);
    expect(gemsForStopwatch(t, 40, 30, 3)).toBe(0);
  });

  it('haalt het doel uit de variabelen', () => {
    expect(targetFor(task('wasknijper-jacht'), item('wasknijper-jacht', { aantal: 15 }))).toBe(15);
    expect(targetFor(task('windy-quiz'), item('windy-quiz'))).toBe(8);
  });
});

describe('meddleMoments', () => {
  it('laat Windy ongeveer elke minuut moeien, niet vlak voor het einde', () => {
    expect(meddleMoments(240)).toEqual([180000, 120000, 60000]);
    expect(meddleMoments(120)).toEqual([75000]);
    expect(meddleMoments(60)).toEqual([30000]);
    expect(meddleMoments(45)).toEqual([]);
    // Lange timer: hoogstens elke 90 s
    const long = meddleMoments(600);
    expect(long[0]).toBe(510000);
    expect(long.at(-1)!).toBeGreaterThan(hurryAtMs(600)! + 15000);
  });

  it('roept "bijna om" op het laatste kwart, hoogstens 30 s voor het einde', () => {
    expect(hurryAtMs(240)).toBe(30000);
    expect(hurryAtMs(60)).toBe(15000);
    expect(hurryAtMs(30)).toBeNull();
  });
});

describe('timerSeconds', () => {
  it('geeft bij makkelijk 30% extra tijd', () => {
    const t = task('wasknijper-jacht');
    expect(timerSeconds(t, item(t.id), 'normaal')).toBe(300);
    expect(timerSeconds(t, item(t.id), 'makkelijk')).toBe(390);
  });

  it('geeft null voor opdrachten zonder timer', () => {
    expect(timerSeconds(task('dienblad'), item('dienblad'), 'normaal')).toBeNull();
  });
});

describe('assignTaskRoles', () => {
  it('geeft het juiste aantal mensen per rol, zonder dubbels', () => {
    const t = task('springtouw-samen');
    const roles = assignTaskRoles(t, ['a', 'b', 'c', 'd'], []);
    expect(roles['Draaier']).toHaveLength(2);
    expect(new Set(roles['Draaier']).size).toBe(2);
  });

  it('kiest bij voorkeur wie nog geen rol had', () => {
    const t = task('blinde-piloot');
    const previous = [result('x', 0, 10, 'score', { Piloot: ['a'] }), result('y', 0, 10, 'score', { Verteller: ['b'] })];
    for (let i = 0; i < 20; i++) expect(['c']).toContain(assignTaskRoles(t, ['a', 'b', 'c'], previous)['Piloot']![0]);
  });

  it('geeft een lege verdeling voor opdrachten zonder rollen', () => {
    expect(assignTaskRoles(task('bekertoren'), ['a', 'b', 'c'], [])).toEqual({});
  });
});

describe('treasure', () => {
  const program = [item('bekertoren', {}, 'u1'), item('dienblad', {}, 'u2'), item('tijdbom', {}, 'u3')];
  const get = (id: string) => BUILTIN_TASKS.find((t) => t.id === id);

  it('telt behaalde edelstenen en het maximum van alle opdrachten', () => {
    expect(treasure(program, [result('u1', 7)], get)).toEqual({ gems: 7, max: 30 });
  });

  it('telt overgeslagen opdrachten niet mee in het maximum', () => {
    expect(treasure(program, [result('u1', 10), result('u2', 0, 10, 'overgeslagen')], get)).toEqual({ gems: 10, max: 20 });
  });
});

describe('pickQuiz', () => {
  it('kiest geen vragen die al gesteld zijn zolang er genoeg over zijn', () => {
    const asked = [0, 1, 2, 3];
    const picked = pickQuiz('normaal', 8, asked);
    expect(picked).toHaveLength(8);
    expect(picked.some((i) => asked.includes(i))).toBe(false);
    expect(Math.max(...picked)).toBeLessThan(QUIZ.normaal.length);
  });
});
