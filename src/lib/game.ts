import { PROFILE_QUESTIONS } from './data/profile';
import { newId } from './ids';
import { normalizeSettings } from './settings';
import type { Player, Settings } from './types';
import { isRecord, shuffle, type Rng } from './util';

export const MIN_PLAYERS = 4;
export const MAX_PLAYERS = 16;

export type Role = 'saboteur' | 'speurder';
export type GamePhase = 'intro' | 'rollen' | 'klaar';

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
}

/**
 * Hoeveel saboteurs? 4–6 spelers: altijd 1. 7–11: 30% kans op 2.
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
  const phases: GamePhase[] = ['intro', 'rollen', 'klaar'];
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
  const revealIndex = typeof raw.revealIndex === 'number' ? Math.min(players.length, Math.max(0, Math.floor(raw.revealIndex))) : 0;

  return {
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
  };
}
