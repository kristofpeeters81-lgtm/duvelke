import { describe, expect, it } from 'vitest';
import { afterAnnouncement, createGame, finaleStep, skipCurrent, startTasks, type Game } from '../game';
import { defaultSettings } from '../settings';
import type { ProgramItem } from '../tasks/program';
import { ALL_BUILTIN } from '../tasks/registry';
import type { TaskDef } from '../tasks/types';
import type { Player } from '../types';
import { publicState, unmaskOrder } from './state';

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

const players: Player[] = ['Lotte', 'Noor', 'Emma', 'Mila', 'Bram', 'Papa'].map((name, i) => ({ id: `p${i}`, name, color: '#fff', avatar: '🦊', isAdult: false, createdAt: 0 }));

function itemFor(task: TaskDef, uid: string): ProgramItem {
  const vars = Object.fromEntries(Object.entries(task.vars ?? {}).map(([k, v]) => [k, v.normaal[0] ?? '']));
  return { uid, taskId: task.id, location: task.locations[0] ?? 'binnen', vars, list: task.list ? task.list.items.normaal.slice(0, task.list.pick) : [] };
}

function gameWith(task: TaskDef, seed: number): Game {
  const game = createGame(players, defaultSettings(), null, null, [itemFor(task, 'u1')], seeded(seed));
  startTasks(game);
  return game;
}

/** Alles wat nooit op de tv mag: tips, geheime lijstjes, kaartjes, en wat de app zelf voorleest. */
function secretsOf(task: TaskDef): string[] {
  const out = [...task.sabotage, ...(task.detective ?? []), ...(task.host?.sabotage ?? []), ...(task.host ? [task.host.detective] : [])];
  const list = task.list;
  // Wat Windy toch luidop roept en niet geheim is (roepen, willekeurig), mag wel: dat hoort iedereen.
  const publicCall = list && !list.secret && (list.read === 'roepen' || list.read === 'willekeurig');
  if (list && (list.secret || list.turns || list.read) && !publicCall) {
    // Korte woordjes kunnen toevallig ook in de uitleg staan; die tellen niet.
    out.push(...Object.values(list.items).flat().filter((i) => i.length > 14));
  }
  return out;
}

const risky = ALL_BUILTIN.filter((t) => t.list?.secret || t.list?.turns || t.list?.read);

describe('tv-scherm: nooit iets geheims', () => {
  it.each(risky.map((t) => [t.id, t] as const))('%s', (_id, task) => {
    const game = gameWith(task, 3);
    const secrets = secretsOf(task);
    const check = (where: string): void => {
      const json = JSON.stringify(publicState(game));
      for (const s of secrets) expect(json.includes(s), `${where}: "${s.slice(0, 50)}"`).toBe(false);
      // Wie 't Duvelke is, staat nergens tijdens de opdrachten.
      expect(json).not.toMatch(/"saboteur":true/);
    };
    game.current!.step = 'aankondiging';
    check('aankondiging');
    afterAnnouncement(game);
    check('briefing');
    for (const step of ['uitleg', 'bezig', 'resultaat'] as const) {
      game.current!.step = step;
      check(step);
      game.current!.cards = { index: 1, guessed: 1 };
      check(`${step} na één kaartje`);
    }
  });

  it('toont tijdens de briefing nooit de tips of de onschuldige namen', () => {
    const task = ALL_BUILTIN.find((t) => t.id === 'wasknijper-jacht')!;
    const game = gameWith(task, 4);
    afterAnnouncement(game);
    const json = JSON.stringify(publicState(game));
    for (const card of Object.values(game.current!.briefing!.cards)) expect(json).not.toContain(card.tip);
    expect(publicState(game).state.kind).toBe('wacht');
  });

  it('verklapt ’t Duvelke pas als alle onschuldigen vrijgepleit zijn', () => {
    const task = ALL_BUILTIN.find((t) => t.id === 'wasknijper-jacht')!;
    const game = gameWith(task, 5);
    skipCurrent(game);
    finaleStep(game, 'ontmaskering');
    const innocents = unmaskOrder(game).length;
    expect(innocents).toBe(players.length - game.players.filter((p) => p.role === 'saboteur').length);
    for (let r = 0; r < innocents; r++) {
      game.finale!.reveal = r;
      const s = publicState(game).state;
      if (s.kind !== 'ontmaskering') throw new Error(s.kind);
      expect(s.unmasked).toBe(false);
      expect(s.saboteurs).toEqual([]);
      expect(s.players.some((p) => p.saboteur)).toBe(false);
      expect(s.players.filter((p) => p.cleared)).toHaveLength(r);
    }
    game.finale!.reveal = innocents;
    const s = publicState(game).state;
    if (s.kind !== 'ontmaskering') throw new Error(s.kind);
    expect(s.unmasked).toBe(true);
    expect(s.saboteurs.length).toBeGreaterThan(0);
  });

  it('toont De Test enkel als wachtscherm: geen vragen, geen antwoorden', () => {
    const task = ALL_BUILTIN.find((t) => t.id === 'wasknijper-jacht')!;
    const game = gameWith(task, 6);
    skipCurrent(game);
    finaleStep(game, 'test');
    const json = JSON.stringify(publicState(game));
    for (const q of game.finale!.questions) expect(json).not.toContain(q.text);
    expect(publicState(game).state.kind).toBe('wacht');
  });

  it('toont de rollen enkel als wachtscherm', () => {
    const game = createGame(players, defaultSettings(), null, null, [], seeded(7));
    game.phase = 'rollen';
    const json = JSON.stringify(publicState(game));
    expect(json).not.toMatch(/saboteur|speurneus|bemoeial/i);
  });
});

describe('tv-scherm: de pot verdelen', () => {
  it('toont na de uitslag wie wat krijgt, en alles is verdeeld', () => {
    const settings = { ...defaultSettings(), treasureMode: 'fysiek' as const, treasureItems: [{ id: 'm', name: 'chocolademunten', quantity: 89 }] };
    const task = ALL_BUILTIN.find((t) => t.id === 'wasknijper-jacht')!;
    const game = createGame(players, settings, null, null, [itemFor(task, 'u1')], seeded(8));
    startTasks(game);
    skipCurrent(game);
    finaleStep(game, 'pot');
    const s = publicState(game).state;
    if (s.kind !== 'pot') throw new Error(s.kind);
    expect(s.pot.rows).toHaveLength(players.length);
    expect(s.pot.rows.reduce((sum, r) => sum + Number.parseInt(r.amount, 10), 0)).toBe(89);
    // Sabotageloon voor elk Duvelke, en dat mag nu op de tv: iedereen weet het al.
    expect(s.pot.prizes.filter((p) => p.label === 'Sabotageloon')).toHaveLength(game.players.filter((p) => p.role === 'saboteur').length);
  });

  it('zonder echte schat geen pot', () => {
    const game = gameWith(ALL_BUILTIN.find((t) => t.id === 'wasknijper-jacht')!, 9);
    skipCurrent(game);
    finaleStep(game, 'pot');
    expect(publicState(game).state.kind).toBe('wacht');
  });
});
