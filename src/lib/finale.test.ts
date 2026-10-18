import { describe, expect, it } from 'vitest';
import { buildTest, potPrizes, potShare, ranking, scoreTest, suspectVotes, type Prize, type TestAnswers, type TestPlayer } from './finale';
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

describe('niets verraden over het aantal Duvelkes', () => {
  it('zegt vanaf 7 spelers altijd "één van de", ook met maar één Duvelke', () => {
    const seven = [...players, ...['d', 'e', 'f'].map((id) => ({ playerId: id, name: id, role: 'speurder' as const, speurneus: false, profile: prof('wit', 'nee') }))];
    const q = buildTest(seven, [], (id) => id, { jokersGiven: {} }, "'t Duvelke", seeded(4));
    expect(q[0]!.text).toBe('Wie is één van de Duvelkes?');
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

describe('de pot verdelen', () => {
  const coins = { id: 'c', name: 'chocolademunten', quantity: 89 };
  const kids = Array.from({ length: 12 }, (_, i) => `k${i}`);
  const all: Prize[] = [
    { kind: 'winnaar', playerId: 'k0' },
    { kind: 'loon', playerId: 'k1' },
    { kind: 'verborgen', playerId: 'k1' },
    { kind: 'speurneus', playerId: 'k2' },
    { kind: 'afleider', playerId: 'k3' },
  ];
  const sum = (r: Record<string, number>): number => Object.values(r).reduce((a, b) => a + b, 0);

  it('verdeelt alles, en de prijzen blijven binnen proporties (89 munten, 12 kinderen, 70%)', () => {
    const s = potShare(coins, 0.7, kids, all, seeded(1));
    expect(sum(s.perPlayer)).toBe(89);
    expect(s.earned).toBe(62);
    expect(s.base).toBe(6);
    expect(s.perPlayer.k0).toBe(10);
    expect(s.perPlayer.k1).toBe(10);
    expect(s.perPlayer.k2).toBe(8);
    expect(s.perPlayer.k3).toBe(8);
    expect(s.lucky).toHaveLength(5);
    for (const id of s.lucky) expect(['k0', 'k1', 'k2', 'k3']).not.toContain(id);
  });

  it('weinig prijzen: de rest gaat over iedereen, niet naar één kind', () => {
    const s = potShare(coins, 0.7, kids, all.slice(0, 2), seeded(2));
    expect(sum(s.perPlayer)).toBe(89);
    expect(s.perPlayer.k0).toBe(11);
    expect(s.perPlayer.k1).toBe(8);
    expect(Math.max(...Object.values(s.perPlayer))).toBeLessThanOrEqual(11);
  });

  it('alles gehaald: kleine prijzen uit de restjes', () => {
    const s = potShare(coins, 1, kids, all.slice(0, 2), seeded(3));
    expect(sum(s.perPlayer)).toBe(89);
    expect(s.base).toBe(7);
    expect(s.perPlayer.k0).toBe(9);
    expect(s.perPlayer.k1).toBe(8);
  });

  it('niets verdiend of weinig munten: toch alles verdeeld', () => {
    for (const [q, f] of [[89, 0], [5, 0.5], [12, 0.3], [200, 0.55]] as const) {
      const s = potShare({ id: 'x', name: 'x', quantity: q }, f, kids, all, seeded(q));
      expect(sum(s.perPlayer), `${q} ${f}`).toBe(q);
      expect(Math.min(...Object.values(s.perPlayer))).toBeGreaterThanOrEqual(0);
    }
  });

  it('dezelfde loting voor hetzelfde zaadje', () => {
    expect(potShare(coins, 0.7, kids, all, seeded(9)).lucky).toEqual(potShare(coins, 0.7, kids, all, seeded(9)).lucky);
  });

  it('kent de prijzen toe', () => {
    const base = { winnerId: 'w', saboteurIds: ['s'], voters: 10, groupWins: true, speurneus: { playerId: 'n', found: true }, bemoeialId: 'b' };
    expect(potPrizes({ ...base, votes: { s: 6, b: 2 } }).map((p) => p.kind)).toEqual(['winnaar', 'loon', 'speurneus', 'afleider']);
    expect(potPrizes({ ...base, votes: { s: 4, b: 1 } }).map((p) => p.kind)).toEqual(['winnaar', 'loon', 'verborgen', 'speurneus']);
    // De groep verloor: 't Duvelke is sowieso geslaagd.
    expect(potPrizes({ ...base, votes: { s: 9 }, groupWins: false }).map((p) => p.kind)).toContain('verborgen');
    expect(potPrizes({ ...base, votes: {}, speurneus: { playerId: 'n', found: false }, bemoeialId: null }).map((p) => p.kind)).toEqual(['winnaar', 'loon', 'verborgen']);
  });

  it('telt de stemmen zonder die van ’t Duvelke', () => {
    const players: TestPlayer[] = [
      { playerId: 's', name: 'S', role: 'saboteur', speurneus: false, profile: {} },
      { playerId: 'a', name: 'A', role: 'speurder', speurneus: false, profile: {} },
      { playerId: 'b', name: 'B', role: 'speurder', speurneus: false, profile: {} },
      { playerId: 'c', name: 'C', role: 'speurder', speurneus: false, profile: {} },
    ];
    const qs = [{ id: 'wie', kind: 'wie' as const, text: '?', options: [], correct: ['s'] }];
    const r = suspectVotes(players, qs, { s: { answers: ['b'], ms: 1 }, a: { answers: ['s'], ms: 1 }, b: { answers: ['c'], ms: 1 }, c: { answers: [null], ms: 1 } });
    expect(r).toEqual({ votes: { s: 1, c: 1 }, voters: 2 });
  });
});
