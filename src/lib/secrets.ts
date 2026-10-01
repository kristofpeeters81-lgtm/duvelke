/**
 * Geheime info tijdens het spel: briefingkaartjes, onschuldige namen (Speurneus en Kijk-joker)
 * en roddels over 't Duvelke. Pure functies, met een injecteerbare random voor de tests.
 */
import { PROFILE_QUESTIONS } from './data/profile';
import { DETECTIVE_TIPS } from './tasks/quiz';
import type { TaskDef } from './tasks/types';
import { pickRandom, shuffle, type Rng } from './util';

export interface SecretPlayer {
  playerId: string;
  name: string;
  role: 'saboteur' | 'speurder';
  speurneus: boolean;
  bemoeial: boolean;
  profile: Record<string, string>;
}

export interface BriefingCard {
  /** De hoofdtip (sabotage of speuren). */
  tip: string;
  /** Extra geheim: onschuldige naam voor de Speurneus. */
  innocent: string | null;
  /** Herinnering voor de Bemoeial. */
  reminder: string | null;
}

/** Iemand die zeker géén saboteur is, en die deze speler nog niet kende. */
export function pickInnocent(players: readonly SecretPlayer[], forId: string, known: readonly string[], rng: Rng = Math.random): string | null {
  const candidates = players.filter((p) => p.role !== 'saboteur' && p.playerId !== forId && !known.includes(p.playerId));
  return pickRandom(candidates, rng)?.playerId ?? null;
}

/**
 * Maakt voor iedereen een kaartje. Saboteurs krijgen een sabotagetip die bij de opdracht past,
 * de rest een speurderstip. Iedereen krijgt dus iets geheims: niemand valt op.
 */
export function makeBriefing(
  players: readonly SecretPlayer[],
  task: TaskDef,
  options: { speurneusTurn: boolean; known: Record<string, string[]> },
  rng: Rng = Math.random,
): Record<string, BriefingCard> {
  const sabotage = shuffle(task.sabotage, rng);
  // Tips die bij deze opdracht passen; algemene tips enkel als de opdracht er (bijna) geen heeft.
  const own = task.detective ?? [];
  const tips = shuffle(own.length >= 2 ? own : DETECTIVE_TIPS, rng);
  const cards: Record<string, BriefingCard> = {};
  let s = 0;
  let d = 0;
  for (const p of players) {
    const tip = p.role === 'saboteur' ? (sabotage[s++ % sabotage.length] ?? '') : (tips[d++ % tips.length] ?? '');
    const innocentId = p.speurneus && options.speurneusTurn ? pickInnocent(players, p.playerId, options.known[p.playerId] ?? [], rng) : null;
    cards[p.playerId] = {
      tip,
      innocent: innocentId,
      reminder: p.bemoeial ? 'Vergeet niet: bemoei je overal mee en zucht heel luid!' : null,
    };
  }
  return cards;
}

// --- Roddels -------------------------------------------------------------------

export interface Gossip {
  questionId: string;
  /** De waarde waarover geroddeld wordt (kan gelogen zijn). */
  value: string;
  source: 'windy' | 'buurvrouw';
  truthful: boolean;
  /** Over welke saboteur (bij meerdere). */
  aboutId: string;
}

/** Van vaag naar concreet: eerst dingen die je niet ziet, op het einde wat iedereen kan zien. */
const GOSSIP_ORDER = ['eten', 'broerzus', 'onderstuk', 'schoenen', 'haarlengte', 'bril', 'haarkleur', 'bovenstuk'];

export function makeGossip(
  players: readonly SecretPlayer[],
  used: readonly Gossip[],
  options: { neighbourGossip: boolean },
  rng: Rng = Math.random,
): Gossip | null {
  const saboteurs = players.filter((p) => p.role === 'saboteur');
  const about = pickRandom(saboteurs, rng);
  if (!about) return null;
  // Onderwerpen gelden voor het hele spel: twee roddels over hetzelfde onderwerp zouden verraden dat er meerdere Duvelkes zijn.
  const usedIds = new Set(used.map((g) => g.questionId));
  const questionId = GOSSIP_ORDER.find((q) => !usedIds.has(q) && about.profile[q] !== undefined);
  if (!questionId) return null;
  const truth = about.profile[questionId] as string;
  const fromNeighbour = options.neighbourGossip && rng() < 0.4;
  const lie = fromNeighbour && rng() < 0.5;
  if (!lie) return { questionId, value: truth, source: fromNeighbour ? 'buurvrouw' : 'windy', truthful: true, aboutId: about.playerId };

  // Een geloofwaardige leugen: bij voorkeur iets wat een andere speler écht heeft.
  const question = PROFILE_QUESTIONS.find((q) => q.id === questionId);
  const others = players.map((p) => p.profile[questionId]).filter((v): v is string => !!v && v !== truth);
  const allOptions = question?.options.map((o) => o.value).filter((v) => v !== truth) ?? [];
  const value = pickRandom(others.length > 0 ? others : allOptions, rng) ?? truth;
  return { questionId, value, source: 'buurvrouw', truthful: value === truth, aboutId: about.playerId };
}

const COLORS: Record<string, string> = {
  rood: 'rode',
  oranje: 'oranje',
  geel: 'gele',
  groen: 'groene',
  blauw: 'blauwe',
  paars: 'paarse',
  roze: 'roze',
  wit: 'witte',
  zwart: 'zwarte',
  grijs: 'grijze',
  bruin: 'bruine of beige',
};

/** De roddel als zin, bv. "'t Duvelke heeft vandaag blauwe kleren aan." */
export function gossipSentence(g: Gossip, saboteurName: string, multiple: boolean): string {
  const who = multiple ? `Eén van de ${saboteurName.replace(/^('t|de|het)\s+/i, '')}s` : saboteurName;
  const v = g.value;
  switch (g.questionId) {
    case 'bovenstuk':
      return v === 'veelkleurig' ? `${who} heeft vandaag kleren met veel kleuren aan.` : `${who} heeft vandaag ${COLORS[v] ?? v} kleren aan.`;
    case 'onderstuk':
      return {
        'lange-broek': `${who} draagt een lange broek.`,
        'korte-broek': `${who} draagt een korte broek.`,
        rok: `${who} draagt een rok of een kleedje.`,
        legging: `${who} draagt een legging.`,
      }[v] ?? `${who} draagt iets speciaals.`;
    case 'bril':
      return v === 'ja' ? `${who} draagt een bril.` : `${who} draagt géén bril.`;
    case 'haarlengte':
      return { kort: `${who} heeft kort haar.`, halflang: `${who} heeft haar tot aan de schouders.`, lang: `${who} heeft lang haar.` }[v] ?? `${who} heeft speciaal haar.`;
    case 'haarkleur':
      return {
        blond: `${who} heeft blond haar.`,
        bruin: `${who} heeft bruin haar.`,
        zwart: `${who} heeft zwart haar.`,
        rood: `${who} heeft rood haar.`,
        grijs: `${who} heeft grijs of wit haar.`,
      }[v] ?? `${who} heeft speciaal haar.`;
    case 'schoenen':
      return {
        'witte-schoenen': `${who} heeft witte schoenen aan.`,
        'donkere-schoenen': `${who} heeft donkere schoenen aan.`,
        'kleurige-schoenen': `${who} heeft kleurige schoenen aan.`,
        laarzen: `${who} heeft laarzen aan.`,
        sokken: `${who} loopt op sokken of pantoffels.`,
      }[v] ?? `${who} heeft speciale schoenen.`;
    case 'broerzus':
      return {
        broer: `${who} heeft een broer.`,
        zus: `${who} heeft een zus.`,
        allebei: `${who} heeft een broer én een zus.`,
        geen: `${who} heeft geen broers of zussen.`,
      }[v] ?? `${who} heeft een speciale familie.`;
    case 'eten':
      return v === 'iets-anders'
        ? `${who} eet het liefst iets anders dan frietjes, pizza, pannenkoeken of spaghetti.`
        : `${who} eet het allerliefst ${v}.`;
    default:
      return `${who} heeft een geheim.`;
  }
}
