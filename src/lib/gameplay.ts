/**
 * Spelregels tijdens de opdrachten: rollen verdelen, edelstenen berekenen, de schat.
 * Pure functies, zodat ze makkelijk te testen zijn.
 */
import { fillVars, type ProgramItem } from './tasks/program';
import { QUIZ } from './tasks/quiz';
import type { TaskDef } from './tasks/types';
import type { Difficulty } from './types';
import { shuffle, type Rng } from './util';

export const DEFAULT_GEMS = 10;

export type Outcome = 'gelukt' | 'bijna' | 'mislukt' | 'score' | 'overgeslagen';

export interface TaskResult {
  uid: string;
  taskId: string;
  outcome: Outcome;
  /** Behaalde score bij tellen/quiz/stopwatch. */
  score: number | null;
  target: number | null;
  gems: number;
  maxGems: number;
  /** Wie welke rol had (rolnaam → speler-ids): dat kan later in De Test gevraagd worden. */
  roles: Record<string, string[]>;
  rating: 1 | -1 | 0;
}

export function maxGems(task: TaskDef): number {
  return task.gems ?? DEFAULT_GEMS;
}

export function targetFor(task: TaskDef, item: ProgramItem): number | null {
  const s = task.scoring;
  if (s.type === 'aantal') return Number(fillVars(String(s.target), item.vars)) || null;
  if (s.type === 'quiz') return s.questions;
  if (s.type === 'stopwatch') return Number(fillVars(String(s.seconds), item.vars)) || null;
  return null;
}

export function marginFor(task: TaskDef, item: ProgramItem): number {
  return task.scoring.type === 'stopwatch' ? Number(fillVars(String(task.scoring.margin), item.vars)) || 3 : 0;
}

/** Edelstenen voor gelukt/bijna/mislukt. */
export function gemsForOutcome(task: TaskDef, outcome: 'gelukt' | 'bijna' | 'mislukt'): number {
  const max = maxGems(task);
  return outcome === 'gelukt' ? max : outcome === 'bijna' ? Math.round(max / 2) : 0;
}

/** Edelstenen naar verhouding van een aantal (nooit meer dan het maximum). */
export function gemsForCount(task: TaskDef, count: number, target: number): number {
  if (target <= 0) return 0;
  return Math.round((maxGems(task) * Math.min(Math.max(count, 0), target)) / target);
}

/** Stopwatch: binnen de marge alles, binnen dubbele marge de helft. */
export function gemsForStopwatch(task: TaskDef, elapsedSeconds: number, targetSeconds: number, margin: number): number {
  const off = Math.abs(elapsedSeconds - targetSeconds);
  if (off <= margin) return maxGems(task);
  if (off <= margin * 2) return Math.round(maxGems(task) / 2);
  return 0;
}

export function timerSeconds(task: TaskDef, item: ProgramItem, difficulty: Difficulty): number | null {
  if (task.timer === undefined) return null;
  const base = Number(fillVars(String(task.timer), item.vars));
  if (!Number.isFinite(base) || base <= 0) return null;
  return Math.round(difficulty === 'makkelijk' ? base * 1.3 : base);
}

/**
 * Verdeelt de rollen van een opdracht. Wie al vaak een rol had, komt minder snel aan de beurt,
 * zodat iedereen eens iets mag doen.
 */
export function assignTaskRoles(
  task: TaskDef,
  playerIds: readonly string[],
  previous: readonly TaskResult[],
  rng: Rng = Math.random,
): Record<string, string[]> {
  const counts = new Map(playerIds.map((id) => [id, 0]));
  for (const r of previous) for (const ids of Object.values(r.roles)) for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  const order = shuffle(playerIds, rng).sort((a, b) => (counts.get(a) ?? 0) - (counts.get(b) ?? 0));
  const roles: Record<string, string[]> = {};
  let next = 0;
  for (const role of task.roles ?? []) {
    roles[role.name] = order.slice(next, next + role.count);
    next += role.count;
  }
  return roles;
}

export interface Treasure {
  gems: number;
  /** Maximum dat nog te halen was, zonder overgeslagen opdrachten. */
  max: number;
}

export function treasure(program: readonly ProgramItem[], results: readonly TaskResult[], getTask: (id: string) => TaskDef | undefined): Treasure {
  const byUid = new Map(results.map((r) => [r.uid, r]));
  let max = 0;
  let gems = 0;
  for (const item of program) {
    const result = byUid.get(item.uid);
    if (result?.outcome === 'overgeslagen') continue;
    const task = getTask(item.taskId);
    max += result ? result.maxGems : task ? maxGems(task) : 0;
    gems += result?.gems ?? 0;
  }
  return { gems, max };
}

/** Kiest quizvragen die in dit spel nog niet gesteld zijn. */
export function pickQuiz(difficulty: Difficulty, count: number, alreadyAsked: readonly number[], rng: Rng = Math.random): number[] {
  const all = QUIZ[difficulty].map((_, i) => i);
  const fresh = all.filter((i) => !alreadyAsked.includes(i));
  const pool = fresh.length >= count ? fresh : all;
  return shuffle(pool, rng).slice(0, count);
}
