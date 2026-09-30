import { describe, expect, it } from 'vitest';
import { PROFILE_QUESTIONS } from './data/profile';
import { gossipSentence, makeBriefing, makeGossip, pickInnocent, type Gossip, type SecretPlayer } from './secrets';
import { BUILTIN_TASKS } from './tasks/library';

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

const profile = (over: Record<string, string> = {}) => ({
  bovenstuk: 'blauw',
  onderstuk: 'lange-broek',
  bril: 'nee',
  haarlengte: 'lang',
  haarkleur: 'bruin',
  schoenen: 'witte-schoenen',
  broerzus: 'zus',
  eten: 'pizza',
  ...over,
});

const players: SecretPlayer[] = [
  { playerId: 's', name: 'Sab', role: 'saboteur', speurneus: false, bemoeial: false, profile: profile({ bovenstuk: 'rood', bril: 'ja' }) },
  { playerId: 'n', name: 'Neus', role: 'speurder', speurneus: true, bemoeial: false, profile: profile() },
  { playerId: 'b', name: 'Bem', role: 'speurder', speurneus: false, bemoeial: true, profile: profile({ bovenstuk: 'groen' }) },
  { playerId: 'x', name: 'Xan', role: 'speurder', speurneus: false, bemoeial: false, profile: profile({ bovenstuk: 'geel' }) },
];

const task = BUILTIN_TASKS.find((t) => t.id === 'bekertoren')!;

describe('makeBriefing', () => {
  it('geeft de saboteur een sabotagetip en de anderen een speurderstip', () => {
    const cards = makeBriefing(players, task, { speurneusTurn: false, known: {} }, seeded(1));
    expect(task.sabotage).toContain(cards['s']!.tip);
    for (const id of ['n', 'b', 'x']) expect(task.sabotage).not.toContain(cards[id]!.tip);
    expect(Object.keys(cards)).toHaveLength(4);
  });

  it('geeft de Speurneus een onschuldige naam, nooit zichzelf of de saboteur', () => {
    for (let seed = 1; seed < 50; seed++) {
      const cards = makeBriefing(players, task, { speurneusTurn: true, known: {} }, seeded(seed));
      expect(['b', 'x']).toContain(cards['n']!.innocent);
      expect(cards['s']!.innocent).toBeNull();
    }
  });

  it('herinnert de Bemoeial aan zijn opdracht', () => {
    const cards = makeBriefing(players, task, { speurneusTurn: false, known: {} }, seeded(2));
    expect(cards['b']!.reminder).not.toBeNull();
    expect(cards['x']!.reminder).toBeNull();
  });
});

describe('pickInnocent', () => {
  it('geeft niemand die de speler al kende, en null als iedereen gekend is', () => {
    expect(pickInnocent(players, 'n', ['b'], seeded(3))).toBe('x');
    expect(pickInnocent(players, 'n', ['b', 'x'], seeded(3))).toBeNull();
  });
});

describe('makeGossip', () => {
  it('begint vaag en wordt steeds concreter, zonder herhaling', () => {
    const used: Gossip[] = [];
    for (let i = 0; i < 8; i++) {
      const g = makeGossip(players, used, { neighbourGossip: false }, seeded(i + 1))!;
      expect(g.source).toBe('windy');
      expect(g.truthful).toBe(true);
      expect(g.value).toBe(players[0]!.profile[g.questionId]);
      used.push(g);
    }
    expect(used[0]!.questionId).toBe('eten');
    expect(used.at(-1)!.questionId).toBe('bovenstuk');
    expect(new Set(used.map((g) => g.questionId)).size).toBe(8);
    expect(makeGossip(players, used, { neighbourGossip: false }, seeded(99))).toBeNull();
  });

  it('laat Windy nooit liegen; de buurvrouw soms wel', () => {
    let lies = 0;
    let neighbour = 0;
    for (let seed = 1; seed < 400; seed++) {
      const g = makeGossip(players, [], { neighbourGossip: true }, seeded(seed))!;
      if (g.source === 'windy') expect(g.truthful).toBe(true);
      else neighbour++;
      if (!g.truthful) {
        lies++;
        expect(g.source).toBe('buurvrouw');
        expect(g.value).not.toBe(players[0]!.profile[g.questionId]);
      }
    }
    expect(neighbour).toBeGreaterThan(100);
    expect(lies).toBeGreaterThan(40);
    expect(lies).toBeLessThan(neighbour);
  });
});

describe('roddels bij meerdere Duvelkes', () => {
  it('herhaalt nooit een onderwerp, zodat niet opvalt dat er twee zijn', () => {
    const two = players.map((p) => (p.playerId === 'x' ? { ...p, role: 'saboteur' as const, profile: profile({ eten: 'frietjes' }) } : p));
    const used: Gossip[] = [];
    for (let i = 0; i < 8; i++) {
      const g = makeGossip(two, used, { neighbourGossip: false }, seeded(i + 11));
      if (g) used.push(g);
    }
    expect(new Set(used.map((g) => g.questionId)).size).toBe(used.length);
  });
});

describe('gossipSentence', () => {
  it('maakt voor elke vraag en elk antwoord een zin zonder rare codes', () => {
    for (const q of PROFILE_QUESTIONS) {
      for (const o of q.options) {
        const s = gossipSentence({ questionId: q.id, value: o.value, source: 'windy', truthful: true, aboutId: 's' }, "'t Duvelke", false);
        expect(s, `${q.id}/${o.value}`).toMatch(/^'t Duvelke .+\.$/);
        expect(s).not.toMatch(/-|speciaal|geheim/);
      }
    }
  });

  it('spreekt over "één van de Duvelkes" als er meerdere kunnen zijn', () => {
    expect(gossipSentence({ questionId: 'bril', value: 'ja', source: 'windy', truthful: true, aboutId: 's' }, "'t Duvelke", true)).toBe(
      'Eén van de Duvelkes draagt een bril.',
    );
  });
});
