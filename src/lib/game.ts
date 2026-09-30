import { PROFILE_QUESTIONS } from './data/profile';
import { newId } from './ids';
import { normalizeSettings } from './settings';
import type { ProgramItem } from './tasks/program';
import { getTask } from './tasks/registry';
import { assignTaskRoles, pickQuiz, timerSeconds, type Outcome, type TaskResult } from './gameplay';
import type { Player, Settings } from './types';
import { isRecord, shuffle, type Rng } from './util';

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 16;

export type Role = 'saboteur' | 'speurder';
/** 'klaar' = rollen verdeeld zonder programma (oudere spellen); 'opdrachten' = het spel loopt; 'einde' = eindtest. */
export type GamePhase = 'intro' | 'rollen' | 'klaar' | 'opdrachten' | 'einde';

export type TaskStep = 'aankondiging' | 'uitleg' | 'bezig' | 'resultaat' | 'schat' | 'duim';

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
  };
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
  return {
    uid: item.uid,
    step: 'aankondiging',
    roles: assignTaskRoles(task, game.players.map((p) => p.playerId), game.results, rng),
    quiz,
    quizAnswers: quiz.map(() => null),
    timer: seconds === null ? null : { total: seconds, remainingMs: seconds * 1000, endsAt: null },
    stopwatch: { startedAt: null, elapsedMs: null },
    pending: null,
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

const STEPS: TaskStep[] = ['aankondiging', 'uitleg', 'bezig', 'resultaat', 'schat', 'duim'];

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
  };
}