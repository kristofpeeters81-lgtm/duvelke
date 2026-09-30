import { PROFILE_QUESTIONS } from './data/profile';
import { newId } from './ids';
import { normalizeSettings } from './settings';
import type { ProgramItem } from './tasks/program';
import { getTask } from './tasks/registry';
import { assignTaskRoles, pickQuiz, timerSeconds, type Outcome, type TaskResult } from './gameplay';
import { makeBriefing, makeGossip, pickInnocent, type BriefingCard, type Gossip } from './secrets';
import { buildTest, type TestAnswers, type TestQuestion } from './finale';
import type { Player, Settings } from './types';
import { isRecord, shuffle, type Rng } from './util';

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 16;

export type Role = 'saboteur' | 'speurder';
/** 'klaar' = rollen verdeeld zonder programma (oudere spellen); 'opdrachten' = het spel loopt; 'einde' = eindtest. */
export type GamePhase = 'intro' | 'rollen' | 'klaar' | 'opdrachten' | 'einde';

export type TaskStep = 'roddel' | 'aankondiging' | 'briefing' | 'uitleg' | 'bezig' | 'resultaat' | 'schat' | 'dilemma' | 'duim';

export interface BriefingState {
  order: string[];
  index: number;
  stage: 'geef' | 'lezen';
  cards: Record<string, BriefingCard & { jokerInnocent: string | null }>;
}

export interface CurrentTask {
  uid: string;
  step: TaskStep;
  roles: Record<string, string[]>;
  /** Indexen van de quizvragen (enkel bij een quiz). */
  quiz: number[];
  quizAnswers: (number | null)[];
  timer: { total: number; remainingMs: number; endsAt: number | null } | null;
  stopwatch: { startedAt: number | null; elapsedMs: number | null };
  /** Het gekozen resultaat, nog voor het duimpje. */
  pending: Omit<TaskResult, 'rating'> | null;
  briefing: BriefingState | null;
  gossip: Gossip | null;
  /** Komt er na deze opdracht een dilemma (schat of Kijk-joker)? */
  dilemma: boolean;
}

export interface GamePlayer {
  playerId: string;
  name: string;
  avatar: string;
  color: string;
  isAdult: boolean;
  role: Role;
  speurneus: boolean;
  bemoeial: boolean;
  /** Antwoorden op de vragen over zichzelf (vraag-id → antwoord). */
  profile: Record<string, string>;
  hasSeenRole: boolean;
}

export interface Game {
  version: 1;
  id: string;
  createdAt: number;
  phase: GamePhase;
  settings: Settings;
  players: GamePlayer[];
  /** Speler-id van de spelleider als die meespeelt, anders null. */
  gameMasterId: string | null;
  /** Pincode voor het rollenoverzicht; enkel als de spelleider niet meespeelt. */
  pin: string | null;
  /** Volgorde waarin de tablet rondgaat (speler-ids). */
  revealOrder: string[];
  revealIndex: number;
  recentLines: string[];
  /** De goedgekeurde opdrachten, in volgorde. */
  program: ProgramItem[];
  /** Welke opdracht nu aan de beurt is (index in program). */
  taskIndex: number;
  current: CurrentTask | null;
  results: TaskResult[];
  /** Al gestelde quizvragen, zodat ze niet terugkomen. */
  askedQuiz: number[];
  /** Kijk-jokers per speler. */
  jokers: Record<string, number>;
  /** Welke onschuldigen elke speler al kent (Speurneus en jokers). */
  known: Record<string, string[]>;
  gossipLog: Gossip[];
  briefingCount: number;
  photoCount: number;
  /** Hoeveel jokers elke speler ooit kreeg (voor De Test). */
  jokersGiven: Record<string, number>;
  /** Welke sabotagetips 't Duvelke kreeg (voor de terugblik). */
  sabotageLog: { taskUid: string; playerId: string; tip: string }[];
  finale: FinaleState | null;
}

export type FinaleStep = 'intro' | 'test' | 'schat' | 'ontmaskering' | 'ranking' | 'terugblik' | 'fotos';

export interface FinaleState {
  step: FinaleStep;
  questions: TestQuestion[];
  order: string[];
  index: number;
  stage: 'geef' | 'vragen' | 'klaar';
  qIndex: number;
  answers: Record<string, TestAnswers>;
  /** Hoe ver de ontmaskering of ranglijst al onthuld is. */
  reveal: number;
}

/**
 * Hoeveel saboteurs? 3–6 spelers: altijd 1. 7–11: 30% kans op 2.
 * 12–16: 30% kans op 2 en 10% kans op 3.
 */
export function saboteurCount(playerCount: number, rng: Rng = Math.random): number {
  if (playerCount <= 6) return 1;
  const roll = rng();
  if (playerCount <= 11) return roll < 0.3 ? 2 : 1;
  if (roll < 0.1) return 3;
  if (roll < 0.4) return 2;
  return 1;
}

export interface RoleAssignment {
  saboteurs: string[];
  speurneus: string | null;
  bemoeial: string | null;
}

/**
 * Verdeelt de rollen. Speurneus en Bemoeial zijn nooit saboteur (en nooit dezelfde persoon),
 * en worden enkel uitgedeeld als er genoeg onschuldige spelers overblijven.
 */
export function assignRoles(
  playerIds: readonly string[],
  options: { speurneus: boolean; bemoeial: boolean },
  rng: Rng = Math.random,
): RoleAssignment {
  if (playerIds.length < MIN_PLAYERS) throw new Error(`Minstens ${MIN_PLAYERS} spelers nodig.`);
  const shuffled = shuffle(playerIds, rng);
  const count = saboteurCount(playerIds.length, rng);
  const saboteurs = shuffled.slice(0, count);
  const innocents = shuffled.slice(count);
  // Minstens 3 gewone speurders naast de speciale rollen, anders wordt het te voorspelbaar.
  let free = innocents.length - 3;
  const speurneus = options.speurneus && free > 0 ? (innocents[0] ?? null) : null;
  if (speurneus) free -= 1;
  const bemoeial = options.bemoeial && free > 0 ? (innocents[speurneus ? 1 : 0] ?? null) : null;
  return { saboteurs, speurneus, bemoeial };
}

export function createGame(
  players: readonly Player[],
  settings: Settings,
  gameMasterId: string | null,
  pin: string | null,
  program: ProgramItem[] = [],
  rng: Rng = Math.random,
): Game {
  const roles = assignRoles(
    players.map((p) => p.id),
    { speurneus: settings.speurneusEnabled, bemoeial: settings.bemoeialEnabled },
    rng,
  );
  const saboteurs = new Set(roles.saboteurs);
  return {
    version: 1,
    id: newId(),
    createdAt: Date.now(),
    phase: 'intro',
    settings: structuredClone(settings),
    players: players.map((p) => ({
      playerId: p.id,
      name: p.name,
      avatar: p.avatar,
      color: p.color,
      isAdult: p.isAdult,
      role: saboteurs.has(p.id) ? 'saboteur' : 'speurder',
      speurneus: roles.speurneus === p.id,
      bemoeial: roles.bemoeial === p.id,
      profile: {},
      hasSeenRole: false,
    })),
    gameMasterId,
    pin: gameMasterId === null ? pin : null,
    revealOrder: shuffle(
      players.map((p) => p.id),
      rng,
    ),
    revealIndex: 0,
    recentLines: [],
    program: structuredClone(program),
    taskIndex: 0,
    current: null,
    results: [],
    askedQuiz: [],
    jokers: {},
    known: {},
    gossipLog: [],
    briefingCount: 0,
    photoCount: 0,
    jokersGiven: {},
    sabotageLog: [],
    finale: null,
  };
}

export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

export function profileComplete(player: GamePlayer): boolean {
  return PROFILE_QUESTIONS.every((q) => typeof player.profile[q.id] === 'string');
}

/** Kan er "op zijn minst" meer dan één saboteur zijn met dit aantal spelers? (Dat mag iedereen weten.) */
export function multipleSaboteursPossible(playerCount: number): boolean {
  return playerCount >= 7;
}

/**
 * Controleert een opgeslagen spel. Een beschadigd spel wordt weggegooid (null) in plaats van
 * half te herstellen: met verkeerde rollen verder spelen is erger dan opnieuw beginnen.
 */
export function normalizeGame(raw: unknown): Game | null {
  if (!isRecord(raw) || raw.version !== 1 || typeof raw.id !== 'string') return null;
  if (!Array.isArray(raw.players) || raw.players.length < MIN_PLAYERS) return null;
  const phases: GamePhase[] = ['intro', 'rollen', 'klaar', 'opdrachten', 'einde'];
  if (!phases.includes(raw.phase as GamePhase)) return null;

  const players: GamePlayer[] = [];
  for (const p of raw.players) {
    if (!isRecord(p) || typeof p.playerId !== 'string' || typeof p.name !== 'string') return null;
    if (p.role !== 'saboteur' && p.role !== 'speurder') return null;
    const profile: Record<string, string> = {};
    if (isRecord(p.profile)) {
      for (const [k, v] of Object.entries(p.profile)) if (typeof v === 'string') profile[k] = v;
    }
    players.push({
      playerId: p.playerId,
      name: p.name,
      avatar: typeof p.avatar === 'string' ? p.avatar : '🙂',
      color: typeof p.color === 'string' ? p.color : '#9aa4b8',
      isAdult: p.isAdult === true,
      role: p.role,
      speurneus: p.speurneus === true,
      bemoeial: p.bemoeial === true,
      profile,
      hasSeenRole: p.hasSeenRole === true,
    });
  }
  if (!players.some((p) => p.role === 'saboteur')) return null;

  const ids = new Set(players.map((p) => p.playerId));
  const revealOrder = Array.isArray(raw.revealOrder) ? raw.revealOrder.filter((id): id is string => typeof id === 'string' && ids.has(id)) : [];
  if (revealOrder.length !== players.length) return null;

  const gameMasterId = typeof raw.gameMasterId === 'string' && ids.has(raw.gameMasterId) ? raw.gameMasterId : null;
  const pin = gameMasterId === null && typeof raw.pin === 'string' && isValidPin(raw.pin) ? raw.pin : null;
  const program = normalizeProgram(raw.program);
  const revealIndex = typeof raw.revealIndex === 'number' ? Math.min(players.length, Math.max(0, Math.floor(raw.revealIndex))) : 0;

  const taskIndex = typeof raw.taskIndex === 'number' ? Math.min(program.length, Math.max(0, Math.floor(raw.taskIndex))) : 0;
  const game: Game = {
    version: 1,
    id: raw.id,
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
    phase: raw.phase as GamePhase,
    settings: normalizeSettings(raw.settings),
    players,
    gameMasterId,
    pin,
    revealOrder,
    revealIndex,
    recentLines: Array.isArray(raw.recentLines) ? raw.recentLines.filter((l): l is string => typeof l === 'string').slice(0, 25) : [],
    program,
    taskIndex,
    current: null,
    results: normalizeResults(raw.results),
    askedQuiz: Array.isArray(raw.askedQuiz) ? raw.askedQuiz.filter((q): q is number => typeof q === 'number') : [],
    jokers: normalizeCounts(raw.jokers, ids),
    known: normalizeKnown(raw.known, ids),
    gossipLog: Array.isArray(raw.gossipLog) ? raw.gossipLog.map(normalizeGossip).filter((g): g is Gossip => g !== null) : [],
    briefingCount: typeof raw.briefingCount === 'number' ? Math.max(0, Math.floor(raw.briefingCount)) : 0,
    photoCount: typeof raw.photoCount === 'number' ? Math.max(0, Math.floor(raw.photoCount)) : 0,
    jokersGiven: normalizeCounts(raw.jokersGiven, ids),
    sabotageLog: Array.isArray(raw.sabotageLog)
      ? raw.sabotageLog.filter((s): s is Game['sabotageLog'][number] => isRecord(s) && typeof s.taskUid === 'string' && typeof s.playerId === 'string' && typeof s.tip === 'string')
      : [],
    finale: null,
  };
  if (game.phase === 'einde') game.finale = normalizeFinale(raw.finale, game) ?? newFinale(game);
  if (game.phase === 'opdrachten') {
    if (game.taskIndex >= game.program.length) game.phase = 'einde';
    else game.current = normalizeCurrent(raw.current, game) ?? newCurrent(game);
  }
  return game;
}

/** Programma-items van onbekende opdrachten (bv. een gewiste eigen opdracht) worden weggelaten. */
export function normalizeProgram(raw: unknown): ProgramItem[] {
  if (!Array.isArray(raw)) return [];
  const items: ProgramItem[] = [];
  for (const item of raw) {
    if (!isRecord(item) || typeof item.taskId !== 'string' || !getTask(item.taskId)) continue;
    const vars: Record<string, string | number> = {};
    if (isRecord(item.vars)) {
      for (const [k, v] of Object.entries(item.vars)) if (typeof v === 'string' || typeof v === 'number') vars[k] = v;
    }
    items.push({
      uid: typeof item.uid === 'string' ? item.uid : newId(),
      taskId: item.taskId,
      location: typeof item.location === 'string' ? (item.location as ProgramItem['location']) : 'binnen',
      vars,
      list: Array.isArray(item.list) ? item.list.filter((l): l is string => typeof l === 'string') : [],
    });
  }
  return items;
}
// --- Verloop van de opdrachten ------------------------------------------------

/** Een verse "huidige opdracht" voor de opdracht op taskIndex. */
export function newCurrent(game: Game, rng: Rng = Math.random): CurrentTask | null {
  const item = game.program[game.taskIndex];
  const task = item ? getTask(item.taskId) : undefined;
  if (!item || !task) return null;
  const quiz = task.scoring.type === 'quiz' ? pickQuiz(game.settings.difficulty, task.scoring.questions, game.askedQuiz, rng) : [];
  const seconds = timerSeconds(task, item, game.settings.difficulty);
  // Vanaf de tweede opdracht komt Windy (of de buurvrouw) eerst roddelen.
  const gossip = game.taskIndex > 0 ? makeGossip(game.players, game.gossipLog, { neighbourGossip: game.settings.neighbourGossip }, rng) : null;
  return {
    uid: item.uid,
    step: gossip ? 'roddel' : 'aankondiging',
    roles: assignTaskRoles(task, game.players.map((p) => p.playerId), game.results, rng),
    quiz,
    quizAnswers: quiz.map(() => null),
    timer: seconds === null ? null : { total: seconds, remainingMs: seconds * 1000, endsAt: null },
    stopwatch: { startedAt: null, elapsedMs: null },
    pending: null,
    briefing: null,
    gossip,
    dilemma: task.dilemma ? rng() < 0.7 : rng() < 0.15,
  };
}

/** Na het uitdelen van de rollen: naar de eerste opdracht (of het oude overzicht zonder programma). */
export function startTasks(game: Game): void {
  if (game.program.length === 0) {
    game.phase = 'klaar';
    return;
  }
  game.phase = 'opdrachten';
  game.taskIndex = 0;
  game.current = newCurrent(game);
}

function nextTask(game: Game): void {
  game.taskIndex += 1;
  if (game.taskIndex >= game.program.length) {
    game.phase = 'einde';
    game.current = null;
    game.finale = newFinale(game);
  } else {
    game.current = newCurrent(game);
  }
}

/** Resultaat bewaren (met duimpje) en door naar de volgende opdracht. */
export function finishCurrent(game: Game, rating: 1 | -1 | 0): TaskResult | null {
  const pending = game.current?.pending;
  if (!pending) return null;
  const result: TaskResult = { ...pending, rating };
  game.results = [...game.results.filter((r) => r.uid !== result.uid), result];
  if (game.current) game.askedQuiz = [...game.askedQuiz, ...game.current.quiz];
  nextTask(game);
  return result;
}

/** De huidige opdracht overslaan: telt niet mee voor de schat. */
export function skipCurrent(game: Game): void {
  const item = game.program[game.taskIndex];
  if (!item || !game.current) return;
  game.results = [
    ...game.results.filter((r) => r.uid !== item.uid),
    { uid: item.uid, taskId: item.taskId, outcome: 'overgeslagen', score: null, target: null, gems: 0, maxGems: 0, roles: game.current.roles, rating: 0 },
  ];
  nextTask(game);
}

const OUTCOMES: Outcome[] = ['gelukt', 'bijna', 'mislukt', 'score', 'overgeslagen'];

function normalizeRoles(raw: unknown): Record<string, string[]> {
  const roles: Record<string, string[]> = {};
  if (!isRecord(raw)) return roles;
  for (const [k, v] of Object.entries(raw)) if (Array.isArray(v)) roles[k] = v.filter((x): x is string => typeof x === 'string');
  return roles;
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

export function normalizeResults(raw: unknown): TaskResult[] {
  if (!Array.isArray(raw)) return [];
  const out: TaskResult[] = [];
  for (const r of raw) {
    if (!isRecord(r) || typeof r.uid !== 'string' || typeof r.taskId !== 'string') continue;
    if (!OUTCOMES.includes(r.outcome as Outcome)) continue;
    out.push({
      uid: r.uid,
      taskId: r.taskId,
      outcome: r.outcome as Outcome,
      score: num(r.score),
      target: num(r.target),
      gems: Math.max(0, num(r.gems) ?? 0),
      maxGems: Math.max(0, num(r.maxGems) ?? 0),
      roles: normalizeRoles(r.roles),
      rating: r.rating === 1 || r.rating === -1 ? r.rating : 0,
    });
  }
  return out;
}

const STEPS: TaskStep[] = ['roddel', 'aankondiging', 'briefing', 'uitleg', 'bezig', 'resultaat', 'schat', 'dilemma', 'duim'];

function normalizeCurrent(raw: unknown, game: Game): CurrentTask | null {
  const item = game.program[game.taskIndex];
  if (!isRecord(raw) || !item || raw.uid !== item.uid || !STEPS.includes(raw.step as TaskStep)) return null;
  const timer = isRecord(raw.timer) && num(raw.timer.total) !== null
    ? { total: num(raw.timer.total)!, remainingMs: num(raw.timer.remainingMs) ?? 0, endsAt: num(raw.timer.endsAt) }
    : null;
  const sw = isRecord(raw.stopwatch) ? raw.stopwatch : {};
  const pendingRaw = isRecord(raw.pending) ? normalizeResults([{ ...raw.pending, rating: 0 }])[0] : undefined;
  const quiz = Array.isArray(raw.quiz) ? raw.quiz.filter((q): q is number => typeof q === 'number') : [];
  const answers = Array.isArray(raw.quizAnswers) ? raw.quizAnswers.map((a) => (typeof a === 'number' ? a : null)) : [];
  let pending: Omit<TaskResult, 'rating'> | null = null;
  if (pendingRaw) {
    const { rating: _rating, ...rest } = pendingRaw;
    pending = rest;
  }
  return {
    uid: item.uid,
    step: raw.step as TaskStep,
    roles: normalizeRoles(raw.roles),
    quiz,
    quizAnswers: quiz.map((_, i) => answers[i] ?? null),
    timer,
    stopwatch: { startedAt: num(sw.startedAt), elapsedMs: num(sw.elapsedMs) },
    pending,
    briefing: normalizeBriefing(raw.briefing, game),
    gossip: normalizeGossip(raw.gossip),
    dilemma: raw.dilemma === true,
  };
}
// --- Briefing, jokers, roddels en dilemma's -------------------------------------

export const JOKER_COST = 5;

function remember(game: Game, playerId: string, innocentId: string): void {
  const list = game.known[playerId] ?? [];
  if (!list.includes(innocentId)) game.known[playerId] = [...list, innocentId];
}

/** Na de aankondiging: eerst de geheime briefing (als die aan de beurt is), anders meteen de uitleg. */
export function afterAnnouncement(game: Game, rng: Rng = Math.random): void {
  const current = game.current;
  const item = game.program[game.taskIndex];
  const task = item ? getTask(item.taskId) : undefined;
  if (!current || !task) return;
  if (game.taskIndex % game.settings.briefingEvery !== 0) {
    current.step = 'uitleg';
    return;
  }
  const cards = makeBriefing(game.players, task, { speurneusTurn: game.briefingCount % 2 === 0, known: game.known }, rng);
  const withJokers: BriefingState['cards'] = {};
  for (const [id, card] of Object.entries(cards)) {
    withJokers[id] = { ...card, jokerInnocent: null };
    if (game.players.find((p) => p.playerId === id)?.role === 'saboteur') game.sabotageLog = [...game.sabotageLog, { taskUid: current.uid, playerId: id, tip: card.tip }];
    if (card.innocent) remember(game, id, card.innocent);
  }
  current.briefing = { order: shuffle(game.players.map((p) => p.playerId), rng), index: 0, stage: 'geef', cards: withJokers };
  game.briefingCount += 1;
  current.step = 'briefing';
}

/** Een Kijk-joker inzetten tijdens de briefing: je ziet één naam die zeker onschuldig is. */
export function useJoker(game: Game, playerId: string, rng: Rng = Math.random): string | null {
  const card = game.current?.briefing?.cards[playerId];
  if (!card || (game.jokers[playerId] ?? 0) <= 0) return null;
  const innocent = pickInnocent(game.players, playerId, game.known[playerId] ?? [], rng);
  game.jokers[playerId] = (game.jokers[playerId] ?? 0) - 1;
  card.jokerInnocent = innocent ?? '';
  if (innocent) remember(game, playerId, innocent);
  return innocent;
}

export function briefingNext(game: Game): void {
  const b = game.current?.briefing;
  if (!b || !game.current) return;
  if (b.stage === 'geef') {
    b.stage = 'lezen';
    return;
  }
  b.index += 1;
  b.stage = 'geef';
  if (b.index >= b.order.length) game.current.step = 'uitleg';
}

/** Iemand is er even niet: achteraan de rij. */
export function briefingLater(game: Game): void {
  const b = game.current?.briefing;
  if (!b) return;
  const [id] = b.order.splice(b.index, 1);
  if (id) b.order.push(id);
}

export function afterGossip(game: Game): void {
  const current = game.current;
  if (!current) return;
  if (current.gossip) game.gossipLog = [...game.gossipLog, current.gossip];
  current.step = 'aankondiging';
}

/** Na de schatkist: een dilemma als dat gepland is én er genoeg edelstenen zijn om te ruilen. */
export function afterTreasure(game: Game): void {
  const current = game.current;
  if (!current) return;
  current.step = current.dilemma && (current.pending?.gems ?? 0) >= 3 ? 'dilemma' : 'duim';
}

/** Dilemma: edelstenen houden, of een deel ruilen voor een Kijk-joker voor één speler. */
export function resolveDilemma(game: Game, jokerTo: string | null): void {
  const current = game.current;
  if (!current?.pending) return;
  if (jokerTo && game.players.some((p) => p.playerId === jokerTo)) {
    const cost = Math.min(current.pending.gems, JOKER_COST);
    current.pending.gems -= cost;
    game.jokers[jokerTo] = (game.jokers[jokerTo] ?? 0) + 1;
    game.jokersGiven[jokerTo] = (game.jokersGiven[jokerTo] ?? 0) + 1;
  }
  current.step = 'duim';
}

function normalizeCounts(raw: unknown, ids: Set<string>): Record<string, number> {
  const out: Record<string, number> = {};
  if (!isRecord(raw)) return out;
  for (const [k, v] of Object.entries(raw)) if (ids.has(k) && typeof v === 'number' && v > 0) out[k] = Math.floor(v);
  return out;
}

function normalizeKnown(raw: unknown, ids: Set<string>): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  if (!isRecord(raw)) return out;
  for (const [k, v] of Object.entries(raw)) if (ids.has(k) && Array.isArray(v)) out[k] = v.filter((x): x is string => typeof x === 'string' && ids.has(x));
  return out;
}

function normalizeGossip(raw: unknown): Gossip | null {
  if (!isRecord(raw) || typeof raw.questionId !== 'string' || typeof raw.value !== 'string' || typeof raw.aboutId !== 'string') return null;
  return {
    questionId: raw.questionId,
    value: raw.value,
    source: raw.source === 'buurvrouw' ? 'buurvrouw' : 'windy',
    truthful: raw.truthful !== false,
    aboutId: raw.aboutId,
  };
}

function normalizeBriefing(raw: unknown, game: Game): BriefingState | null {
  if (!isRecord(raw) || !Array.isArray(raw.order) || !isRecord(raw.cards)) return null;
  const ids = new Set(game.players.map((p) => p.playerId));
  const order = raw.order.filter((id): id is string => typeof id === 'string' && ids.has(id));
  if (order.length !== game.players.length) return null;
  const cards: BriefingState['cards'] = {};
  for (const id of order) {
    const c = raw.cards[id];
    if (!isRecord(c) || typeof c.tip !== 'string') return null;
    cards[id] = {
      tip: c.tip,
      innocent: typeof c.innocent === 'string' ? c.innocent : null,
      reminder: typeof c.reminder === 'string' ? c.reminder : null,
      jokerInnocent: typeof c.jokerInnocent === 'string' ? c.jokerInnocent : null,
    };
  }
  return {
    order,
    index: typeof raw.index === 'number' ? Math.min(order.length, Math.max(0, Math.floor(raw.index))) : 0,
    stage: raw.stage === 'lezen' ? 'lezen' : 'geef',
    cards,
  };
}
// --- Finale -----------------------------------------------------------------------

export function newFinale(game: Game, rng: Rng = Math.random): FinaleState {
  const title = (id: string): string => getTask(id)?.title ?? id;
  return {
    step: 'intro',
    questions: buildTest(game.players, game.results, title, { jokersGiven: game.jokersGiven }, game.settings.saboteurName, rng),
    order: shuffle(game.players.map((p) => p.playerId), rng),
    index: 0,
    stage: 'geef',
    qIndex: 0,
    answers: {},
    reveal: 0,
  };
}

/** Eén antwoord in De Test; na de laatste vraag is die speler klaar. */
export function answerTest(game: Game, value: string, elapsedMs: number): void {
  const f = game.finale;
  const pid = f?.order[f.index];
  if (!f || !pid) return;
  const mine = f.answers[pid] ?? { answers: f.questions.map(() => null), ms: 0 };
  mine.answers[f.qIndex] = value;
  mine.ms += Math.max(0, elapsedMs);
  f.answers[pid] = mine;
  if (f.qIndex + 1 < f.questions.length) f.qIndex += 1;
  else f.stage = 'klaar';
}

/** Tablet naar de volgende speler; na de laatste speler naar de schat. */
export function nextTestPlayer(game: Game): void {
  const f = game.finale;
  if (!f) return;
  if (f.stage === 'geef') {
    f.stage = 'vragen';
    f.qIndex = 0;
    return;
  }
  f.index += 1;
  f.stage = 'geef';
  f.qIndex = 0;
  if (f.index >= f.order.length) {
    f.step = 'schat';
    f.reveal = 0;
  }
}

export function testLater(game: Game): void {
  const f = game.finale;
  if (!f) return;
  const [id] = f.order.splice(f.index, 1);
  if (id) f.order.push(id);
}

export function finaleStep(game: Game, step: FinaleStep): void {
  if (!game.finale) return;
  game.finale.step = step;
  game.finale.reveal = 0;
}

function normalizeFinale(raw: unknown, game: Game): FinaleState | null {
  if (!isRecord(raw) || !Array.isArray(raw.questions) || !Array.isArray(raw.order)) return null;
  const steps: FinaleStep[] = ['intro', 'test', 'schat', 'ontmaskering', 'ranking', 'terugblik', 'fotos'];
  if (!steps.includes(raw.step as FinaleStep)) return null;
  const ids = new Set(game.players.map((p) => p.playerId));
  const order = raw.order.filter((id): id is string => typeof id === 'string' && ids.has(id));
  if (order.length !== game.players.length) return null;
  const questions: TestQuestion[] = [];
  for (const q of raw.questions) {
    if (!isRecord(q) || typeof q.id !== 'string' || typeof q.text !== 'string' || !Array.isArray(q.options) || !Array.isArray(q.correct)) return null;
    questions.push({
      id: q.id,
      kind: q.kind === 'profiel' || q.kind === 'rol' || q.kind === 'joker' ? q.kind : 'wie',
      text: q.text,
      options: q.options.filter((o): o is TestQuestion['options'][number] => isRecord(o) && typeof o.value === 'string' && typeof o.label === 'string'),
      correct: q.correct.filter((c): c is string => typeof c === 'string'),
    });
  }
  const answers: Record<string, TestAnswers> = {};
  if (isRecord(raw.answers)) {
    for (const [id, a] of Object.entries(raw.answers)) {
      if (!ids.has(id) || !isRecord(a) || !Array.isArray(a.answers)) continue;
      const list: unknown[] = a.answers;
      answers[id] = { answers: questions.map((_, i) => (typeof list[i] === 'string' ? (list[i] as string) : null)), ms: typeof a.ms === 'number' ? a.ms : 0 };
    }
  }
  const int = (v: unknown, max: number): number => (typeof v === 'number' ? Math.min(max, Math.max(0, Math.floor(v))) : 0);
  return {
    step: raw.step as FinaleStep,
    questions,
    order,
    index: int(raw.index, order.length),
    stage: raw.stage === 'vragen' || raw.stage === 'klaar' ? raw.stage : 'geef',
    qIndex: int(raw.qIndex, Math.max(0, questions.length - 1)),
    answers,
    reveal: int(raw.reveal, 1000),
  };
}