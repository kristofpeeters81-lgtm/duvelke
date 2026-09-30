import { LOCATIONS } from '../data/locations';
import { newId } from '../ids';
import type { Difficulty, LocationId, Settings } from '../types';
import { pickRandom, shuffle, type Rng } from '../util';
import type { TaskDef, VarValue } from './types';

export interface ProgramItem {
  uid: string;
  taskId: string;
  /** Op welke plek deze opdracht gespeeld wordt. */
  location: LocationId;
  vars: Record<string, VarValue>;
  /** Gekozen items uit de lijst van de opdracht (woorden, zoekdingen...). */
  list: string[];
}

export interface PlanContext {
  settings: Settings;
  playerCount: number;
  tasks: readonly TaskDef[];
  /** Duimpjes van vroeger: +1 per 👍, -1 per 👎. */
  ratings?: Record<string, number>;
  /** Opdrachten die recent gespeeld zijn: minder kans om terug te komen. */
  recentTaskIds?: readonly string[];
}

/** Waarom een opdracht niet kan, of null als ze wel kan. */
export function whyNot(task: TaskDef, ctx: PlanContext): string | null {
  const { settings, playerCount } = ctx;
  if (!task.difficulties.includes(settings.difficulty)) return 'past niet bij deze moeilijkheid';
  if (!task.locations.some((l) => settings.locations.includes(l))) return 'niet op de gekozen plekken';
  if (playerCount < task.minPlayers) return `minstens ${task.minPlayers} spelers nodig`;
  if (task.maxPlayers !== undefined && playerCount > task.maxPlayers) return `maximum ${task.maxPlayers} spelers`;
  const missing = task.supplies.filter((s) => !settings.supplies.includes(s));
  if (missing.length > 0) return 'benodigdheden ontbreken';
  return null;
}

export function eligibleTasks(ctx: PlanContext): TaskDef[] {
  return ctx.tasks.filter((t) => whyNot(t, ctx) === null);
}

export function fillVars(text: string, vars: Record<string, VarValue>): string {
  return text.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? String(vars[key]) : match));
}

function optionsFor<T>(opts: { makkelijk?: T[]; normaal: T[]; pittig?: T[] }, difficulty: Difficulty): T[] {
  const chosen = opts[difficulty];
  return chosen && chosen.length > 0 ? chosen : opts.normaal;
}

/** Maakt een concrete versie van een opdracht: variabelen en lijst worden gekozen. */
export function instantiate(task: TaskDef, ctx: PlanContext, preferred?: LocationId, rng: Rng = Math.random): ProgramItem {
  const difficulty = ctx.settings.difficulty;
  const vars: Record<string, VarValue> = {};
  for (const [key, opts] of Object.entries(task.vars ?? {})) {
    const value = pickRandom(optionsFor(opts, difficulty), rng);
    if (value !== undefined) vars[key] = value;
  }
  const list = task.list ? shuffle(optionsFor(task.list.items, difficulty), rng).slice(0, task.list.pick) : [];
  const possible = ctx.settings.locations.filter((l) => task.locations.includes(l));
  const location = preferred && possible.includes(preferred) ? preferred : (possible[0] ?? task.locations[0] ?? 'binnen');
  return { uid: newId(), taskId: task.id, location, vars, list };
}

// --- Tijdsinschatting -------------------------------------------------------

/** Minuten voor alles buiten de opdrachten: intro, rollen uitdelen en de eindtest met onthulling. */
export function overheadMinutes(playerCount: number): number {
  const intro = 3;
  const roles = 2 + playerCount * 1.0;
  const finalTest = 6 + playerCount * 1.2;
  return Math.round(intro + roles + finalTest);
}

/** Minuten voor één opdracht, inclusief briefing (tablet rondgeven), resultaat en roddel. */
export function taskCost(task: TaskDef, playerCount: number, settings: Settings): number {
  const briefing = (playerCount * 0.3) / settings.briefingEvery;
  const resultAndGossip = 2;
  return task.minutes + briefing + resultAndGossip;
}

export function programMinutes(program: readonly ProgramItem[], ctx: PlanContext): number {
  const byId = new Map(ctx.tasks.map((t) => [t.id, t]));
  const tasks = program.reduce((sum, item) => {
    const task = byId.get(item.taskId);
    return sum + (task ? taskCost(task, ctx.playerCount, ctx.settings) : 0);
  }, 0);
  return Math.round(overheadMinutes(ctx.playerCount) + tasks);
}

// --- Programma samenstellen -------------------------------------------------

function weight(task: TaskDef, chosen: readonly TaskDef[], ctx: PlanContext): number {
  const rating = ctx.ratings?.[task.id] ?? 0;
  let w = Math.min(2, Math.max(0.3, 1 + rating * 0.35));
  if (ctx.recentTaskIds?.includes(task.id)) w *= 0.25;
  const sameCategory = chosen.filter((c) => c.category === task.category).length;
  w *= Math.pow(0.2, sameCategory);
  return w;
}

function weightedPick(candidates: readonly TaskDef[], chosen: readonly TaskDef[], ctx: PlanContext, rng: Rng): TaskDef | undefined {
  const weights = candidates.map((t) => weight(t, chosen, ctx));
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return candidates[0];
  let roll = rng() * total;
  for (let i = 0; i < candidates.length; i++) {
    roll -= weights[i] ?? 0;
    if (roll <= 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}

/** Volgorde van de plekken zoals in de instellingen: zo moet de groep niet heen en weer lopen. */
function locationRank(location: LocationId): number {
  return LOCATIONS.findIndex((l) => l.id === location);
}

export function sortByLocation(program: ProgramItem[]): ProgramItem[] {
  return [...program].sort((a, b) => locationRank(a.location) - locationRank(b.location));
}

/**
 * Stelt een programma samen dat in de speelduur past. Minstens 3 opdrachten
 * (als er zoveel mogelijk zijn), afwisselend in soort en verdeeld over de gekozen plekken.
 */
export function buildProgram(ctx: PlanContext, rng: Rng = Math.random): ProgramItem[] {
  const pool = eligibleTasks(ctx);
  const budget = ctx.settings.durationMinutes - overheadMinutes(ctx.playerCount);
  const chosen: TaskDef[] = [];
  const program: ProgramItem[] = [];
  let used = 0;
  const locations = ctx.settings.locations.filter((l) => pool.some((t) => t.locations.includes(l)));

  while (true) {
    const remaining = budget - used;
    const fits = pool.filter(
      (t) => !chosen.includes(t) && (taskCost(t, ctx.playerCount, ctx.settings) <= remaining || chosen.length < 3),
    );
    if (fits.length === 0 || (chosen.length >= 3 && remaining <= 0)) break;

    // Plekken om beurt aan bod laten komen, zodat elke gekozen plek gebruikt wordt.
    const wanted = locations.length > 0 ? locations[program.length % locations.length] : undefined;
    const atWanted = wanted ? fits.filter((t) => t.locations.includes(wanted)) : fits;
    const task = weightedPick(atWanted.length > 0 ? atWanted : fits, chosen, ctx, rng);
    if (!task) break;
    chosen.push(task);
    program.push(instantiate(task, ctx, wanted, rng));
    used += taskCost(task, ctx.playerCount, ctx.settings);
    if (chosen.length >= 20) break;
  }
  return sortByLocation(program);
}

/** Opdrachten die in de plaats van een andere kunnen komen (nog niet in het programma). */
export function alternatives(program: readonly ProgramItem[], ctx: PlanContext): TaskDef[] {
  const inProgram = new Set(program.map((p) => p.taskId));
  return eligibleTasks(ctx).filter((t) => !inProgram.has(t.id));
}

/** Wisselt één opdracht voor een andere die past, bij voorkeur van een andere soort. */
export function swapItem(program: readonly ProgramItem[], index: number, ctx: PlanContext, rng: Rng = Math.random): ProgramItem[] {
  const current = program[index];
  if (!current) return [...program];
  const byId = new Map(ctx.tasks.map((t) => [t.id, t]));
  const others = program.filter((_, i) => i !== index).map((p) => byId.get(p.taskId)).filter((t): t is TaskDef => !!t);
  const candidates = alternatives(program, ctx);
  if (candidates.length === 0) return [...program];
  const task = weightedPick(shuffle(candidates, rng), others, ctx, rng);
  if (!task) return [...program];
  const next = [...program];
  next[index] = instantiate(task, ctx, current.location, rng);
  return next;
}

// --- Paklijst ---------------------------------------------------------------

export interface PackingList {
  supplies: string[];
  prep: { title: string; emoji: string; text: string }[];
}

export function packingList(program: readonly ProgramItem[], tasks: readonly TaskDef[]): PackingList {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const supplies = new Set<string>();
  const prep: PackingList['prep'] = [];
  for (const item of program) {
    const task = byId.get(item.taskId);
    if (!task) continue;
    task.supplies.forEach((s) => supplies.add(s));
    if (task.prep) prep.push({ title: task.title, emoji: task.emoji, text: fillVars(task.prep, item.vars) });
  }
  return { supplies: [...supplies], prep };
}
