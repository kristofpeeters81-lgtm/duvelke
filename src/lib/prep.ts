/**
 * Voorbereidingen: een spel op voorhand klaarzetten (wie meedoet, het hulpje, de instellingen van dit
 * spel en het programma), bewaren met een naam, en later terug openen om aan te passen of te starten.
 * Ook als apart bestandje, om naar een ander toestel te brengen.
 */
import { newId } from './ids';
import { normalizeProgram } from './game';
import { normalizeSettings } from './settings';
import type { ProgramItem } from './tasks/program';
import type { Player, Settings } from './types';
import { isRecord } from './util';

export interface Prep {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  playerIds: string[];
  /** Het hulpje als het meespeelt; null = iemand die niet meespeelt. */
  gameMasterId: string | null;
  settings: Settings;
  program: ProgramItem[];
}

/** De instellingen die bij één spel horen. Namen, stem en spullen blijven de standaard van het toestel. */
export const GAME_FIELDS = ['durationMinutes', 'difficulty', 'locations', 'treasureMode', 'treasureItems', 'speurneusEnabled', 'bemoeialEnabled', 'neighbourGossip', 'briefingEvery', 'endTime'] as const;

/** De standaardinstellingen, met de spelinstellingen van een voorbereiding erover. */
export function withGameFields(base: Settings, game: Settings): Settings {
  const out = structuredClone(base);
  for (const k of GAME_FIELDS) (out as unknown as Record<string, unknown>)[k] = structuredClone(game[k]);
  return out;
}

/** Wat er bewaard wordt, als vingerafdruk: zo zie je of er niet-opgeslagen wijzigingen zijn. */
export function prepFingerprint(d: { playerIds: readonly string[]; gameMasterId: string | null; settings: Settings; program: readonly ProgramItem[] }): string {
  const game = Object.fromEntries(GAME_FIELDS.map((k) => [k, d.settings[k]]));
  return JSON.stringify({ p: [...d.playerIds], g: d.gameMasterId, s: game, t: d.program.map((i) => ({ t: i.taskId, l: i.location, v: i.vars, i: i.list })) });
}

function normalizePrep(raw: unknown): Prep | null {
  if (!isRecord(raw) || typeof raw.id !== 'string') return null;
  return {
    id: raw.id,
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim().slice(0, 60) : 'Voorbereiding',
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now(),
    playerIds: Array.isArray(raw.playerIds) ? raw.playerIds.filter((x): x is string => typeof x === 'string') : [],
    gameMasterId: typeof raw.gameMasterId === 'string' ? raw.gameMasterId : null,
    settings: normalizeSettings(raw.settings),
    program: normalizeProgram(raw.program),
  };
}

export function normalizePreps(raw: unknown): Prep[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizePrep).filter((p): p is Prep => p !== null);
}

// --- Als bestand ------------------------------------------------------------------

export const PREP_FILE_KIND = 'duvelke-voorbereiding';

/** Een voorbereiding als bestand, met de spelers erbij (naam, figuurtje, kleur), voor een ander toestel. */
export function prepFile(prep: Prep, players: readonly Player[]): unknown {
  return {
    kind: PREP_FILE_KIND,
    version: 1,
    prep,
    players: players.filter((p) => prep.playerIds.includes(p.id)).map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, color: p.color, isAdult: p.isAdult })),
  };
}

/**
 * Leest een voorbereidingsbestand. Spelers worden herkend aan hun id of hun naam; wie er op dit toestel
 * nog niet is, wordt een nieuwe speler.
 */
export function readPrepFile(raw: unknown, existing: readonly Player[]): { prep: Prep; newPlayers: Player[] } {
  if (!isRecord(raw) || raw.kind !== PREP_FILE_KIND) throw new Error('Dit is geen voorbereiding van Wie is ’t Duvelke?');
  const prep = normalizePrep(raw.prep);
  if (!prep) throw new Error('Deze voorbereiding is beschadigd.');
  const newPlayers: Player[] = [];
  const map = new Map<string, string>();
  for (const p of Array.isArray(raw.players) ? raw.players : []) {
    if (!isRecord(p) || typeof p.id !== 'string' || typeof p.name !== 'string') continue;
    const same = existing.find((e) => e.id === p.id) ?? existing.find((e) => e.name.trim().toLowerCase() === String(p.name).trim().toLowerCase());
    if (same) {
      map.set(p.id, same.id);
      continue;
    }
    const player: Player = {
      id: newId(),
      name: String(p.name).slice(0, 30),
      avatar: typeof p.avatar === 'string' ? p.avatar : '🙂',
      color: typeof p.color === 'string' ? p.color : '#7b6bff',
      isAdult: p.isAdult === true,
      createdAt: Date.now(),
    };
    newPlayers.push(player);
    map.set(p.id, player.id);
  }
  const playerIds = prep.playerIds.map((id) => map.get(id) ?? id).filter((id) => map.has(id) || existing.some((e) => e.id === id) || newPlayers.some((n) => n.id === id));
  return {
    prep: { ...prep, id: newId(), playerIds, gameMasterId: prep.gameMasterId ? (map.get(prep.gameMasterId) ?? null) : null, updatedAt: Date.now() },
    newPlayers,
  };
}
