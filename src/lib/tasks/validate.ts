/**
 * Controle van opdrachten die van buiten komen (AI of zelf gemaakt): alles wordt nagekeken en
 * waar mogelijk verbeterd. Wat niet te redden is, wordt geweigerd met een duidelijke reden.
 */
import { LOCATION_IDS } from '../data/locations';
import { SUPPLIES } from '../data/supplies';
import { newId } from '../ids';
import type { CustomSupply, Difficulty, LocationId } from '../types';
import { isRecord } from '../util';
import type { Scoring, TaskCategory, TaskDef, TaskList, TaskRole, VarOptions } from './types';

export const CATEGORIES: TaskCategory[] = [
  'zoeken',
  'raadsels',
  'samenwerken',
  'geheugen',
  'behendigheid',
  'creatief',
  'quiz',
  'communicatie',
  'tijdsdruk',
  'speuren',
  'foto',
  'beweging',
];
const DIFFICULTIES: Difficulty[] = ['makkelijk', 'normaal', 'pittig'];

export interface ValidationResult {
  task: TaskDef | null;
  errors: string[];
  warnings: string[];
}

function str(v: unknown, max = 600): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30);
}

function strList(v: unknown, max = 40): string[] {
  return Array.isArray(v) ? v.map((x) => str(x, 300)).filter((x) => x !== '').slice(0, max) : [];
}

function varOptions(v: unknown): VarOptions | null {
  if (Array.isArray(v)) {
    const vals = v.filter((x): x is string | number => typeof x === 'string' || typeof x === 'number');
    return vals.length > 0 ? { normaal: vals } : null;
  }
  if (!isRecord(v)) return null;
  const pick = (x: unknown) => (Array.isArray(x) ? x.filter((y): y is string | number => typeof y === 'string' || typeof y === 'number') : undefined);
  const normaal = pick(v.normaal) ?? pick(v.makkelijk) ?? pick(v.pittig);
  if (!normaal || normaal.length === 0) return null;
  const out: VarOptions = { normaal };
  const m = pick(v.makkelijk);
  const p = pick(v.pittig);
  if (m && m.length) out.makkelijk = m;
  if (p && p.length) out.pittig = p;
  return out;
}

/** Woorden die op iets onveiligs of vies wijzen: zulke opdrachten weigeren we. */
const UNSAFE = /\b(mes(sen)?|vuur|aansteker|lucifer|zwemmen|water gooien|nat maken|modder|brandnetel|oversteken zonder|rijweg op|duwen|slaan|schoppen|tackel|klimmen op het dak|vreemden)\b/i;

export function validateTask(
  raw: unknown,
  options: { customSupplies: CustomSupply[]; source: 'ai' | 'eigen'; keepId?: boolean },
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isRecord(raw)) return { task: null, errors: ['Geen geldige opdracht.'], warnings };

  const title = str(raw.title, 60);
  const explain = str(raw.explain, 900);
  if (!title) errors.push('De titel ontbreekt.');
  if (explain.length < 20) errors.push('De uitleg ontbreekt of is te kort.');

  const category = CATEGORIES.includes(raw.category as TaskCategory) ? (raw.category as TaskCategory) : null;
  if (!category) warnings.push('Onbekende soort: "samenwerken" gekozen.');

  const locations = strList(raw.locations).filter((l): l is LocationId => LOCATION_IDS.includes(l as LocationId));
  if (locations.length === 0) errors.push('Geen geldige plek (binnen, tuin, straat, bos, park, dorp of strand).');

  const supplyIds = new Set([...SUPPLIES.map((s) => s.id), ...options.customSupplies.map((c) => c.id)]);
  const labelToId = new Map(
    [...SUPPLIES, ...options.customSupplies].map((s) => [s.label.toLowerCase(), s.id] as const),
  );
  const suppliesIn = strList(raw.supplies);
  const supplies: string[] = [];
  for (const s of suppliesIn) {
    const id = supplyIds.has(s) ? s : labelToId.get(s.toLowerCase());
    if (id) supplies.push(id);
    else warnings.push(`Onbekende benodigdheid "${s}" weggelaten.`);
  }

  const sabotage = strList(raw.sabotage, 6).filter((s) => s.length > 8);
  if (sabotage.length < 2) errors.push('Er zijn minstens 2 sabotagetips nodig.');

  const difficulties = strList(raw.difficulties).filter((d): d is Difficulty => DIFFICULTIES.includes(d as Difficulty));

  const vars: Record<string, VarOptions> = {};
  if (isRecord(raw.vars)) {
    for (const [k, v] of Object.entries(raw.vars)) {
      const opts = varOptions(v);
      if (opts && /^\w+$/.test(k)) vars[k] = opts;
    }
  }

  let scoring: Scoring = { type: 'gelukt' };
  if (isRecord(raw.scoring) && raw.scoring.type === 'aantal') {
    const target = raw.scoring.target;
    const unit = str(raw.scoring.unit, 30) || 'punten';
    if (typeof target === 'number' && target > 0) scoring = { type: 'aantal', target: Math.round(target), unit };
    else if (typeof target === 'string' && /^\{\w+\}$/.test(target.trim())) scoring = { type: 'aantal', target: target.trim(), unit };
    else if (typeof target === 'string' && Number(target) > 0) scoring = { type: 'aantal', target: Math.round(Number(target)), unit };
    else warnings.push('Ongeldig doel: de opdracht wordt "gelukt / mislukt".');
  }

  // Alle {variabelen} in de teksten moeten bestaan.
  const texts = [explain, str(raw.prep, 400), typeof raw.timer === 'string' ? raw.timer : '', scoring.type === 'aantal' ? String(scoring.target) : ''];
  for (const t of texts) {
    for (const m of t.matchAll(/\{(\w+)\}/g)) {
      if (!vars[m[1] as string]) errors.push(`De variabele {${m[1]}} wordt gebruikt maar heeft geen waarden.`);
    }
  }

  let list: TaskList | undefined;
  if (isRecord(raw.list)) {
    const items = isRecord(raw.list.items) ? raw.list.items : { normaal: raw.list.items };
    const normaal = strList(items.normaal ?? items.makkelijk ?? items.pittig);
    if (normaal.length > 0) {
      const pick = typeof raw.list.pick === 'number' ? Math.max(1, Math.min(normaal.length, Math.round(raw.list.pick))) : Math.min(5, normaal.length);
      list = { title: str(raw.list.title, 60) || 'Lijst', items: { normaal }, pick, secret: raw.list.secret === true };
      const m = strList(items.makkelijk);
      const p = strList(items.pittig);
      if (m.length) list.items.makkelijk = m;
      if (p.length) list.items.pittig = p;
    }
  }

  const roles: TaskRole[] = Array.isArray(raw.roles)
    ? raw.roles
        .filter(isRecord)
        .map((r) => ({ name: str(r.name, 30), count: typeof r.count === 'number' ? Math.max(1, Math.min(3, Math.round(r.count))) : 1, hint: str(r.hint, 120) }))
        .filter((r) => r.name !== '')
        .slice(0, 3)
    : [];

  const allText = [title, explain, ...sabotage, str(raw.prep, 400)].join(' ');
  if (UNSAFE.test(allText)) errors.push('Deze opdracht lijkt niet veilig genoeg voor kinderen.');

  if (errors.length > 0) return { task: null, errors, warnings };

  const minutes = typeof raw.minutes === 'number' ? Math.max(2, Math.min(20, Math.round(raw.minutes))) : 8;
  const timer =
    typeof raw.timer === 'number' && raw.timer >= 10 ? Math.min(1200, Math.round(raw.timer)) : typeof raw.timer === 'string' && /^\{\w+\}$/.test(raw.timer) ? raw.timer : undefined;
  const minPlayers = typeof raw.minPlayers === 'number' ? Math.max(3, Math.min(16, Math.round(raw.minPlayers))) : 3;
  const existingId = options.keepId && typeof raw.id === 'string' && raw.id.startsWith(options.source === 'ai' ? 'ai-' : 'eigen-') ? raw.id : null;

  const task: TaskDef = {
    id: existingId ?? `${options.source === 'ai' ? 'ai' : 'eigen'}-${slug(title) || 'opdracht'}-${newId().slice(0, 6)}`,
    title,
    emoji: str(raw.emoji, 8) || '⭐',
    category: category ?? 'samenwerken',
    locations,
    supplies: [...new Set(supplies)],
    minPlayers,
    minutes,
    difficulties: difficulties.length > 0 ? difficulties : [...DIFFICULTIES],
    explain,
    scoring,
    sabotage,
    source: options.source,
  };
  if (timer !== undefined) task.timer = timer;
  const prep = str(raw.prep, 400);
  if (prep) task.prep = prep;
  if (Object.keys(vars).length > 0) task.vars = vars;
  if (roles.length > 0) task.roles = roles;
  if (list) task.list = list;
  const photo = str(raw.photo, 120);
  if (photo) task.photo = photo;
  if (raw.dilemma === true) task.dilemma = true;
  return { task, errors, warnings };
}

/** Haalt een JSON-lijst uit een antwoord van een chatbot (met of zonder ```json-blok). */
export function extractJsonArray(text: string): unknown[] | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidates = [fenced?.[1], text];
  for (const c of candidates) {
    if (!c) continue;
    const start = c.indexOf('[');
    const end = c.lastIndexOf(']');
    if (start === -1 || end <= start) continue;
    try {
      const parsed: unknown = JSON.parse(c.slice(start, end + 1));
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Chatbots zetten soms komma's te veel: die eruit halen en nog eens proberen.
      try {
        const parsed: unknown = JSON.parse(c.slice(start, end + 1).replace(/,\s*([\]}])/g, '$1'));
        if (Array.isArray(parsed)) return parsed;
      } catch {
        /* volgende kandidaat */
      }
    }
  }
  return null;
}
