import { describe, expect, it } from 'vitest';
import {
  afterAnnouncement,
  afterGossip,
  afterTreasure,
  answerTest,
  testBack,
  briefingSkip,
  assignRoles,
  briefingNext,
  createGame,
  finaleStep,
  finishCurrent,
  JOKER_COST,
  newCurrent,
  nextCard,
  nextTestPlayer,
  normalizeGame,
  resolveDilemma,
  saboteurCount,
  skipCurrent,
  startTasks,
  testSkip,
  useJoker,
} from './game';
import { defaultSettings } from './settings';
import type { ProgramItem } from './tasks/program';
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
    const game = createGame(players(8), defaultSettings(), 'p1', null, [], seeded(3));
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

describe('verloop van de opdrachten', () => {
  const program: ProgramItem[] = [
    { uid: 'u1', taskId: 'bekertoren', location: 'binnen', vars: { lagen: 4 }, list: [] },
    { uid: 'u2', taskId: 'windy-quiz', location: 'binnen', vars: { aantal: 8 }, list: [] },
    { uid: 'u3', taskId: 'blinde-piloot', location: 'binnen', vars: {}, list: [] },
  ];

  function started() {
    const game = createGame(players(5), defaultSettings(), null, null, program, seeded(1));
    startTasks(game);
    return game;
  }

  it('start bij de eerste opdracht met een aankondiging', () => {
    const game = started();
    expect(game.phase).toBe('opdrachten');
    expect(game.current?.uid).toBe('u1');
    expect(game.current?.step).toBe('aankondiging');
    expect(game.current?.timer?.total).toBe(180);
  });

  it('bewaart het resultaat en gaat naar de volgende opdracht, met quizvragen', () => {
    const game = started();
    game.current!.pending = { uid: 'u1', taskId: 'bekertoren', outcome: 'gelukt', score: null, target: null, gems: 10, maxGems: 10, roles: {} };
    finishCurrent(game, 1);
    expect(game.results).toHaveLength(1);
    expect(game.results[0]!.rating).toBe(1);
    expect(game.current?.uid).toBe('u2');
    expect(game.current?.quiz).toHaveLength(8);
  });

  it('deelt rollen uit bij opdrachten met rollen', () => {
    const game = started();
    skipCurrent(game);
    skipCurrent(game);
    expect(game.current?.roles['Piloot']).toHaveLength(1);
  });

  it('gaat naar het einde na de laatste opdracht', () => {
    const game = started();
    skipCurrent(game);
    skipCurrent(game);
    skipCurrent(game);
    expect(game.phase).toBe('einde');
    expect(game.current).toBeNull();
    expect(game.results.every((r) => r.outcome === 'overgeslagen')).toBe(true);
  });

  it('gaat na herladen verder op exact dezelfde stap', () => {
    const game = started();
    game.current!.step = 'bezig';
    game.current!.timer!.remainingMs = 42000;
    const back = normalizeGame(JSON.parse(JSON.stringify(game)))!;
    expect(back.current?.step).toBe('bezig');
    expect(back.current?.timer?.remainingMs).toBe(42000);
    expect(back.current?.roles).toEqual(game.current!.roles);
  });

  it('maakt een nieuwe huidige opdracht als de opgeslagen kapot is', () => {
    const game = started();
    const raw = { ...JSON.parse(JSON.stringify(game)), current: { uid: 'verkeerd', step: 'zweven' } };
    expect(normalizeGame(raw)?.current?.uid).toBe('u1');
  });
});

describe('briefing, jokers, roddels en dilemma', () => {
  const program: ProgramItem[] = [
    { uid: 'u1', taskId: 'bekertoren', location: 'binnen', vars: { lagen: 4 }, list: [] },
    { uid: 'u2', taskId: 'codeslot', location: 'binnen', vars: {}, list: [] },
  ];

  function started(speurneus = false) {
    const game = createGame(players(6), { ...defaultSettings(), speurneusEnabled: speurneus }, null, null, program, seeded(4));
    for (const p of game.players) p.profile = { eten: 'pizza', broerzus: 'geen', onderstuk: 'rok', schoenen: 'laarzen', haarlengte: 'lang', bril: 'nee', haarkleur: 'bruin', bovenstuk: 'rood' };
    startTasks(game);
    return game;
  }

  it('deelt iedereen een briefingkaartje uit en gaat daarna naar de uitleg', () => {
    const game = started();
    afterAnnouncement(game);
    const b = game.current!.briefing!;
    expect(game.current!.step).toBe('briefing');
    expect(Object.keys(b.cards)).toHaveLength(6);
    for (let i = 0; i < 12; i++) briefingNext(game);
    expect(game.current!.step).toBe('uitleg');
  });

  it('slaat de briefing over als die om de 2 opdrachten komt', () => {
    const game = started();
    game.settings.briefingEvery = 2;
    game.taskIndex = 1;
    game.current = newCurrent(game);
    afterGossip(game);
    afterAnnouncement(game);
    expect(game.current!.step).toBe('uitleg');
  });

  it('laat een Kijk-joker een onschuldige naam zien en verbruikt de joker', () => {
    const game = started();
    const me = game.players[0]!.playerId;
    game.jokers[me] = 1;
    afterAnnouncement(game);
    const innocent = useJoker(game, me);
    const p = game.players.find((x) => x.playerId === innocent);
    expect(p?.role).toBe('speurder');
    expect(innocent).not.toBe(me);
    expect(game.jokers[me]).toBe(0);
    expect(useJoker(game, me)).toBeNull();
  });

  it('ruilt bij een dilemma edelstenen voor een joker', () => {
    const game = started();
    game.current!.dilemma = true;
    game.current!.pending = { uid: 'u1', taskId: 'bekertoren', outcome: 'gelukt', score: null, target: null, gems: 10, maxGems: 10, roles: {} };
    afterTreasure(game);
    expect(game.current!.step).toBe('dilemma');
    const who = game.players[2]!.playerId;
    resolveDilemma(game, who);
    expect(game.current!.pending!.gems).toBe(10 - JOKER_COST);
    expect(game.jokers[who]).toBe(1);
    expect(game.current!.step).toBe('duim');
  });

  it('begint de tweede opdracht met een roddel die in het logboek komt', () => {
    const game = started();
    game.current!.pending = { uid: 'u1', taskId: 'bekertoren', outcome: 'gelukt', score: null, target: null, gems: 10, maxGems: 10, roles: {} };
    finishCurrent(game, 0);
    expect(game.current!.step).toBe('roddel');
    expect(game.current!.gossip).not.toBeNull();
    afterGossip(game);
    expect(game.gossipLog).toHaveLength(1);
    expect(game.current!.step).toBe('aankondiging');
  });

  it('bewaart briefing, jokers en roddels bij herladen', () => {
    const game = started(true);
    game.jokers[game.players[1]!.playerId] = 2;
    afterAnnouncement(game);
    briefingNext(game);
    const back = normalizeGame(JSON.parse(JSON.stringify(game)))!;
    // Na herladen nooit meteen het kaartje: terug naar "Ik ben ...".
    expect(back.current!.briefing).toEqual({ ...game.current!.briefing!, stage: 'geef' });
    expect(back.jokers).toEqual(game.jokers);
    expect(back.known).toEqual(game.known);
  });
});

describe('afwezige spelers', () => {
  const program: ProgramItem[] = [{ uid: 'u1', taskId: 'bekertoren', location: 'binnen', vars: { lagen: 4 }, list: [] }];

  it('slaat een afwezige speler over in de briefing en De Test, zonder zijn kaartje te tonen', () => {
    const game = createGame(players(5), defaultSettings(), null, null, program, seeded(5));
    startTasks(game);
    afterAnnouncement(game);
    const first = game.current!.briefing!.order[0]!;
    briefingSkip(game);
    expect(game.absent).toEqual([first]);
    expect(game.current!.briefing!.index).toBe(1);
    expect(game.current!.briefing!.stage).toBe('geef');
    skipCurrent(game);
    expect(game.finale!.order).not.toContain(first);
    expect(game.finale!.order).toHaveLength(4);
  });

  it('kan in De Test iemand overslaan die dan niet in de ranglijst komt', () => {
    const game = createGame(players(4), defaultSettings(), null, null, program, seeded(6));
    startTasks(game);
    skipCurrent(game);
    finaleStep(game, 'test');
    const who = game.finale!.order[0]!;
    testSkip(game);
    expect(game.finale!.answers[who]).toBeUndefined();
    expect(game.finale!.index).toBe(1);
  });
});

describe('finale', () => {
  it('start De Test na de laatste opdracht en gaat per speler door de vragen', () => {
    const program: ProgramItem[] = [{ uid: 'u1', taskId: 'bekertoren', location: 'binnen', vars: { lagen: 4 }, list: [] }];
    const game = createGame(players(4), defaultSettings(), null, null, program, seeded(8));
    for (const p of game.players) p.profile = { eten: 'pizza', broerzus: 'geen', onderstuk: 'rok', schoenen: 'laarzen', haarlengte: 'lang', bril: 'nee', haarkleur: 'bruin', bovenstuk: 'rood' };
    startTasks(game);
    skipCurrent(game);
    expect(game.phase).toBe('einde');
    const f = game.finale!;
    expect(f.questions[0]!.kind).toBe('wie');
    finaleStep(game, 'test');
    for (let p = 0; p < 4; p++) {
      nextTestPlayer(game);
      for (let q = 0; q < f.questions.length; q++) answerTest(game, f.questions[q]!.options[0]!.value, 500);
      expect(f.stage).toBe('klaar');
      nextTestPlayer(game);
    }
    expect(f.step).toBe('schat');
    expect(Object.keys(f.answers)).toHaveLength(4);
    const back = normalizeGame(JSON.parse(JSON.stringify(game)))!;
    expect(back.finale).toEqual(game.finale);
  });

  it('laat een speler in de eigen test terugkeren om een antwoord te verbeteren', () => {
    const program: ProgramItem[] = [{ uid: 'u1', taskId: 'bekertoren', location: 'binnen', vars: { lagen: 4 }, list: [] }];
    const game = createGame(players(4), defaultSettings(), null, null, program, seeded(8));
    for (const p of game.players) p.profile = { eten: 'pizza', broerzus: 'geen', onderstuk: 'rok', schoenen: 'laarzen', haarlengte: 'lang', bril: 'nee', haarkleur: 'bruin', bovenstuk: 'rood' };
    startTasks(game);
    skipCurrent(game);
    finaleStep(game, 'test');
    const f = game.finale!;
    const pid = f.order[0]!;
    nextTestPlayer(game);
    testBack(game); // op de eerste vraag: niets te doen
    expect(f.qIndex).toBe(0);
    answerTest(game, f.questions[0]!.options[0]!.value, 500);
    testBack(game);
    expect(f.qIndex).toBe(0);
    answerTest(game, f.questions[0]!.options[1]!.value, 500);
    expect(f.answers[pid]!.answers[0]).toBe(f.questions[0]!.options[1]!.value);
    for (let q = 1; q < f.questions.length; q++) answerTest(game, f.questions[q]!.options[0]!.value, 500);
    expect(f.stage).toBe('klaar');
    // Vanaf "Klaar!" nog terug naar de laatste vraag
    testBack(game);
    expect(f.stage).toBe('vragen');
    expect(f.qIndex).toBe(f.questions.length - 1);
    answerTest(game, f.questions.at(-1)!.options[0]!.value, 500);
    // Na het doorgeven niet meer terug naar de vorige speler
    nextTestPlayer(game);
    expect(f.stage).toBe('geef');
    testBack(game);
    expect(f.stage).toBe('geef');
    expect(f.index).toBe(1);
  });
});

describe('normalizeGame', () => {
  it('laat een geldig spel ongewijzigd door een opslag-rondje', () => {
    const game = createGame(players(6), defaultSettings(), null, '4321', [{ uid: 'u1', taskId: 'bekertoren', location: 'binnen', vars: { lagen: 4 }, list: [] }], seeded(9));
    const roundTrip = normalizeGame(JSON.parse(JSON.stringify(game)));
    expect(roundTrip).toEqual(game);
  });

  it('houdt onbekende opdrachten in het programma (geen verschuiving) en slaat ze over', () => {
    const game = createGame(players(6), defaultSettings(), null, null, [], seeded(9));
    const raw = { ...JSON.parse(JSON.stringify(game)), phase: 'opdrachten', taskIndex: 0, program: [{ uid: 'a', taskId: 'bestaat-niet', location: 'binnen', vars: {}, list: [] }, { uid: 'b', taskId: 'bekertoren', location: 'tuin', vars: { lagen: 3 }, list: [] }] };
    const back = normalizeGame(raw)!;
    expect(back.program.map((p) => p.taskId)).toEqual(['bestaat-niet', 'bekertoren']);
    expect(back.current?.uid).toBe('b');
    expect(back.results[0]).toMatchObject({ uid: 'a', outcome: 'overgeslagen' });
  });

  it('gaat naar de finale als de laatste opdracht verdwenen is, en maakt die finale meteen aan', () => {
    const game = createGame(players(4), defaultSettings(), null, null, [], seeded(9));
    const raw = { ...JSON.parse(JSON.stringify(game)), phase: 'opdrachten', taskIndex: 0, program: [{ uid: 'a', taskId: 'weg', location: 'binnen', vars: {}, list: [] }] };
    const back = normalizeGame(raw)!;
    expect(back.phase).toBe('einde');
    expect(back.finale).not.toBeNull();
  });

  it('gooit beschadigde spellen weg', () => {
    const game = createGame(players(6), defaultSettings(), null, null, [], seeded(9));
    expect(normalizeGame(null)).toBeNull();
    expect(normalizeGame({ ...game, phase: 'raar' })).toBeNull();
    expect(normalizeGame({ ...game, players: game.players.map((p) => ({ ...p, role: 'speurder' })) })).toBeNull();
    expect(normalizeGame({ ...game, revealOrder: game.revealOrder.slice(1) })).toBeNull();
  });
});

describe('kaartjes', () => {
  it('telt geraden kaartjes, slaat over zonder te tellen en onthoudt alles na herladen', () => {
    const program: ProgramItem[] = [{ uid: 'u1', taskId: 'b-verboden-woorden', location: 'binnen', vars: { doel: 5 }, list: ['HOND (niet: blaffen, dier, poes)', 'ZON (niet: warm, geel, lucht)', 'BED (niet: slapen, kussen, nacht)'] }];
    const game = createGame(players(4), defaultSettings(), null, null, program, seeded(3));
    startTasks(game);
    expect(game.current?.cards).toEqual({ index: 0, guessed: 0 });
    nextCard(game, true);
    nextCard(game, false);
    nextCard(game, true);
    expect(game.current?.cards).toEqual({ index: 3, guessed: 2 });
    const back = normalizeGame(JSON.parse(JSON.stringify(game)))!;
    expect(back.current?.cards).toEqual({ index: 3, guessed: 2 });
  });

  it('vult een ontbrekende of kapotte kaartjesstand aan met nul', () => {
    const program: ProgramItem[] = [{ uid: 'u1', taskId: 'uitbeelden', location: 'binnen', vars: {}, list: ['astronaut'] }];
    const game = createGame(players(4), defaultSettings(), null, null, program, seeded(3));
    startTasks(game);
    const raw = JSON.parse(JSON.stringify(game));
    delete raw.current.cards;
    expect(normalizeGame(raw)!.current?.cards).toEqual({ index: 0, guessed: 0 });
    raw.current.cards = { index: 'x', guessed: -4 };
    expect(normalizeGame(raw)!.current?.cards).toEqual({ index: 0, guessed: 0 });
  });
});
