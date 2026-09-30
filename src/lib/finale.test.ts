import { describe, expect, it } from 'vitest';
import { buildTest, physicalShare, ranking, scoreTest, type TestAnswers, type TestPlayer } from './finale';
import type { TaskResult } from './gameplay';

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

const prof = (bovenstuk: string, bril: string) => ({
  bovenstuk,
  onderstuk: 'rok',
  bril,
  haarlengte: 'lang',
  haarkleur: 'bruin',
  schoenen: 'laarzen',
  broerzus: 'zus',
  eten: 'pizza',
});

const players: TestPlayer[] = [
  { playerId: 's', name: 'Sab', role: 'saboteur', speurneus: false, profile: prof('rood', 'ja') },
  { playerId: 'a', name: 'Ann', role: 'speurder', speurneus: false, profile: prof('blauw', 'nee') },
  { playerId: 'b', name: 'Bo', role: 'speurder', speurneus: true, profile: prof('groen', 'nee') },
  { playerId: 'c', name: 'Cas', role: 'speurder', speurneus: false, profile: prof('geel', 'nee') },
];

const results: TaskResult[] = [
  { uid: 'u1', taskId: 'blinde-piloot', outcome: 'gelukt', score: null, target: null, gems: 10, maxGems: 10, roles: { Piloot: ['s'] }, rating: 0 },
  { uid: 'u2', taskId: 'uitbeelden', outcome: 'gelukt', score: null, target: null, gems: 10, maxGems: 10, roles: { 'Eerste uitbeelder': ['a'] }, rating: 0 },
];

describe('buildTest', () => {
  const qs = buildTest(players, results, (id) => id, { jokersGiven: { a: 1 } }, "'t Duvelke", seeded(1));

  it('begint met "Wie is \'t Duvelke?" met iedereen als keuze', () => {
    expect(qs[0]!.text).toBe("Wie is 't Duvelke?");
    expect(qs[0]!.options).toHaveLength(4);
    expect(qs[0]!.correct).toEqual(['s']);
  });

  it('stelt eigenschapsvragen met het juiste antwoord erbij en maximum 4 keuzes', () => {
    const profile = qs.filter((q) => q.kind === 'profiel');
    expect(profile.length).toBe(6);
    for (const q of profile) {
      expect(q.options.length).toBeLessThanOrEqual(4);
      expect(q.options.map((o) => o.value)).toEqual(expect.arrayContaining(q.correct));
      expect(new Set(q.options.map((o) => o.value)).size).toBe(q.options.length);
    }
  });

  it('vraagt naar rollen en jokers met het juiste ja/nee', () => {
    const rol = qs.filter((q) => q.kind === 'rol');
    expect(rol).toHaveLength(2);
    const piloot = rol.find((q) => q.text.includes('piloot bij "blinde-piloot"'))!;
    expect(piloot.correct).toEqual(['ja']);
    expect(qs.find((q) => q.kind === 'joker')!.correct).toEqual(['nee']);
  });

  it('aanvaardt bij meerdere saboteurs elk van hen als juist', () => {
    const two = players.map((p) => (p.playerId === 'c' ? { ...p, role: 'saboteur' as const } : p));
    const q = buildTest(two, [], (id) => id, { jokersGiven: {} }, "'t Duvelke", seeded(2));
    expect(q[0]!.text).toBe('Wie is één van de Duvelkes?');
    expect(q[0]!.correct.sort()).toEqual(['c', 's']);
    const kleur = q.find((x) => x.id === 'profiel-bovenstuk');
    if (kleur) expect(kleur.correct.sort()).toEqual(['geel', 'rood']);
  });
});

describe('scoren en rangschikken', () => {
  const qs = buildTest(players, results, (id) => id, { jokersGiven: {} }, "'t Duvelke", seeded(3));
  const perfect = (ms: number): TestAnswers => ({ answers: qs.map((q) => q.correct[0] ?? null), ms });
  const wrong = (ms: number): TestAnswers => ({ answers: qs.map((q) => q.options.find((o) => !q.correct.includes(o.value))?.value ?? null), ms });

  it('telt de juiste antwoorden en of de saboteur gevonden is', () => {
    expect(scoreTest(qs, perfect(1000))).toMatchObject({ correct: qs.length, foundSaboteur: true });
    expect(scoreTest(qs, wrong(1000))).toMatchObject({ correct: 0, foundSaboteur: false });
  });

  it('laat saboteurs niet meedoen en beslist een gelijke stand op snelheid', () => {
    const r = ranking(players, qs, { s: perfect(1), a: perfect(9000), b: perfect(4000), c: wrong(1) });
    expect(r.map((x) => x.playerId)).toEqual(['b', 'a', 'c']);
  });
});

describe('physicalShare', () => {
  it('verdeelt het verdiende deel eerlijk met een rest', () => {
    expect(physicalShare([{ id: '1', name: 'snoepjes', quantity: 40 }], 30, 40, 7)).toEqual([
      { name: 'snoepjes', total: 40, earned: 30, perPerson: 4, rest: 2 },
    ]);
  });

  it('geeft nooit meer dan er is', () => {
    expect(physicalShare([{ id: '1', name: 'stickers', quantity: 10 }], 50, 40, 5)[0]!.earned).toBe(10);
  });
});
