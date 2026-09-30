import { describe, expect, it } from 'vitest';
import { assignRoles, createGame, normalizeGame, saboteurCount } from './game';
import { defaultSettings } from './settings';
import type { Player } from './types';

/** Voorspelbare "random" voor tests (mulberry32). */
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

const ids = (n: number): string[] => Array.from({ length: n }, (_, i) => `p${i + 1}`);

function players(n: number): Player[] {
  return ids(n).map((id) => ({ id, name: id.toUpperCase(), color: '#fff', avatar: '🦊', isAdult: false, createdAt: 0 }));
}

describe('saboteurCount', () => {
  it('geeft altijd 1 saboteur bij 3 tot 6 spelers', () => {
    for (const n of [3, 4, 5, 6]) {
      expect(saboteurCount(n, () => 0)).toBe(1);
      expect(saboteurCount(n, () => 0.99)).toBe(1);
    }
  });

  it('geeft bij 7–11 spelers 2 saboteurs onder de 30%', () => {
    expect(saboteurCount(8, () => 0.29)).toBe(2);
    expect(saboteurCount(8, () => 0.3)).toBe(1);
  });

  it('geeft bij 12+ spelers 10% kans op 3 en 30% op 2', () => {
    expect(saboteurCount(12, () => 0.05)).toBe(3);
    expect(saboteurCount(12, () => 0.2)).toBe(2);
    expect(saboteurCount(12, () => 0.5)).toBe(1);
  });

  it('komt statistisch ongeveer uit op de beloofde kansen', () => {
    const rng = seeded(42);
    let two = 0;
    const runs = 20000;
    for (let i = 0; i < runs; i++) if (saboteurCount(9, rng) === 2) two++;
    expect(two / runs).toBeGreaterThan(0.27);
    expect(two / runs).toBeLessThan(0.33);
  });
});

describe('assignRoles', () => {
  it('weigert te weinig spelers', () => {
    expect(() => assignRoles(ids(2), { speurneus: false, bemoeial: false })).toThrow();
  });

  it('werkt met 3 spelers: 1 saboteur, geen speciale rollen', () => {
    for (let seed = 1; seed < 50; seed++) {
      const r = assignRoles(ids(3), { speurneus: true, bemoeial: true }, seeded(seed));
      expect(r.saboteurs).toHaveLength(1);
      expect(r.speurneus).toBeNull();
      expect(r.bemoeial).toBeNull();
    }
  });

  it('geeft Speurneus en Bemoeial nooit aan een saboteur, en nooit aan dezelfde persoon', () => {
    for (let seed = 1; seed < 300; seed++) {
      const r = assignRoles(ids(10), { speurneus: true, bemoeial: true }, seeded(seed));
      expect(r.speurneus).not.toBeNull();
      expect(r.bemoeial).not.toBeNull();
      expect(r.saboteurs).not.toContain(r.speurneus);
      expect(r.saboteurs).not.toContain(r.bemoeial);
      expect(r.speurneus).not.toBe(r.bemoeial);
    }
  });

  it('laat de speciale rollen weg als er te weinig onschuldigen zijn', () => {
    const r = assignRoles(ids(4), { speurneus: true, bemoeial: true }, seeded(1));
    expect(r.speurneus).toBeNull();
    expect(r.bemoeial).toBeNull();
  });

  it('geeft iedereen ongeveer even vaak de saboteursrol', () => {
    const rng = seeded(7);
    const counts = new Map<string, number>();
    for (let i = 0; i < 6000; i++) {
      for (const s of assignRoles(ids(6), { speurneus: false, bemoeial: false }, rng).saboteurs) {
        counts.set(s, (counts.get(s) ?? 0) + 1);
      }
    }
    for (const id of ids(6)) {
      expect(counts.get(id) ?? 0).toBeGreaterThan(850);
      expect(counts.get(id) ?? 0).toBeLessThan(1150);
    }
  });
});

describe('createGame', () => {
  it('maakt een spel met precies de gekozen spelers en minstens één saboteur', () => {
    const game = createGame(players(8), defaultSettings(), 'p1', null, seeded(3));
    expect(game.players).toHaveLength(8);
    expect(game.players.filter((p) => p.role === 'saboteur').length).toBeGreaterThanOrEqual(1);
    expect(new Set(game.revealOrder)).toEqual(new Set(ids(8)));
    expect(game.phase).toBe('intro');
  });

  it('bewaart geen pincode als de spelleider meespeelt', () => {
    expect(createGame(players(5), defaultSettings(), 'p2', '1234').pin).toBeNull();
    expect(createGame(players(5), defaultSettings(), null, '1234').pin).toBe('1234');
  });
});

describe('normalizeGame', () => {
  it('laat een geldig spel ongewijzigd door een opslag-rondje', () => {
    const game = createGame(players(6), defaultSettings(), null, '4321', seeded(9));
    const roundTrip = normalizeGame(JSON.parse(JSON.stringify(game)));
    expect(roundTrip).toEqual(game);
  });

  it('gooit beschadigde spellen weg', () => {
    const game = createGame(players(6), defaultSettings(), null, null, seeded(9));
    expect(normalizeGame(null)).toBeNull();
    expect(normalizeGame({ ...game, phase: 'raar' })).toBeNull();
    expect(normalizeGame({ ...game, players: game.players.map((p) => ({ ...p, role: 'speurder' })) })).toBeNull();
    expect(normalizeGame({ ...game, revealOrder: game.revealOrder.slice(1) })).toBeNull();
  });
});
