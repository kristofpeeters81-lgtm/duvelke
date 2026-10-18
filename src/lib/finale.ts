/**
 * De finale: De Test (vragen over 't Duvelke), punten, ranglijst en de verdeling van de schat.
 */
import { PROFILE_QUESTIONS } from './data/profile';
import type { TaskResult } from './gameplay';
import type { TreasureItem } from './types';
import { shuffle, type Rng } from './util';

export interface TestPlayer {
  playerId: string;
  name: string;
  role: 'saboteur' | 'speurder';
  speurneus: boolean;
  profile: Record<string, string>;
}

export interface TestOption {
  value: string;
  label: string;
}

export interface TestQuestion {
  id: string;
  kind: 'wie' | 'profiel' | 'rol' | 'joker';
  text: string;
  options: TestOption[];
  /** Juiste waarden (meerdere bij meerdere saboteurs). */
  correct: string[];
}

export interface TestAnswers {
  answers: (string | null)[];
  /** Totale bedenktijd in ms, voor een gelijke stand. */
  ms: number;
}

const PROFILE_TEXT: Record<string, string> = {
  bovenstuk: 'Welke kleur heeft het t-shirt, de trui of het kleedje van {sab}?',
  onderstuk: 'Wat draagt {sab} onderaan?',
  bril: 'Draagt {sab} een bril?',
  haarlengte: 'Hoe lang is het haar van {sab}?',
  haarkleur: 'Welke kleur heeft het haar van {sab}?',
  schoenen: 'Wat heeft {sab} aan de voeten?',
  broerzus: 'Heeft {sab} een broer of zus?',
  eten: 'Wat eet {sab} het allerliefst?',
};

/**
 * Stelt De Test samen: eerst "Wie is 't Duvelke?", dan vragen over eigenschappen,
 * rollen tijdens de opdrachten en jokers. Iedereen krijgt dezelfde vragen.
 */
export function buildTest(
  players: readonly TestPlayer[],
  results: readonly TaskResult[],
  taskTitle: (taskId: string) => string,
  roleCounts: { jokersGiven: Record<string, number> },
  saboteurName: string,
  rng: Rng = Math.random,
): TestQuestion[] {
  const saboteurs = players.filter((p) => p.role === 'saboteur');
  // Vanaf 7 spelers kunnen er meerdere zijn: dan altijd "één van de" zeggen, anders verraadt de tekst hoeveel er zijn.
  const multiple = saboteurs.length > 1 || players.length >= 7;
  const sab = multiple ? `één van de ${saboteurName.replace(/^('t|de|het)\s+/i, '')}s` : saboteurName;
  const questions: TestQuestion[] = [
    {
      id: 'wie',
      kind: 'wie',
      text: `Wie is ${multiple ? 'één van de ' + saboteurName.replace(/^('t|de|het)\s+/i, '') + 's' : saboteurName}?`,
      options: players.map((p) => ({ value: p.playerId, label: p.name })),
      correct: saboteurs.map((s) => s.playerId),
    },
  ];

  // Eigenschappen: 4 keuzes, met antwoorden van andere spelers als afleiders (die zijn geloofwaardig).
  const profileQs = shuffle(PROFILE_QUESTIONS, rng).filter((q) => saboteurs.every((s) => s.profile[q.id] !== undefined));
  for (const q of profileQs.slice(0, 6)) {
    const correct = [...new Set(saboteurs.map((s) => s.profile[q.id] as string))];
    const fromOthers = shuffle([...new Set(players.map((p) => p.profile[q.id]).filter((v): v is string => !!v && !correct.includes(v)))], rng);
    const rest = shuffle(q.options.map((o) => o.value).filter((v) => !correct.includes(v) && !fromOthers.includes(v)), rng);
    const wanted = Math.min(4, q.options.length);
    const values = shuffle([...correct, ...fromOthers, ...rest].slice(0, Math.max(wanted, correct.length)), rng);
    const label = (v: string) => q.options.find((o) => o.value === v)?.label ?? v;
    questions.push({
      id: `profiel-${q.id}`,
      kind: 'profiel',
      text: (PROFILE_TEXT[q.id] ?? q.question).replace('{sab}', sab),
      options: values.map((v) => ({ value: v, label: label(v) })),
      correct,
    });
  }

  // Rollen tijdens de opdrachten: "Was 't Duvelke de Piloot bij De blinde piloot?"
  const withRoles = shuffle(
    results.filter((r) => r.outcome !== 'overgeslagen').flatMap((r) => Object.entries(r.roles).map(([role, ids]) => ({ r, role, ids }))),
    rng,
  );
  for (const { r, role, ids } of withRoles.slice(0, 2)) {
    const yes = ids.some((id) => saboteurs.some((s) => s.playerId === id));
    questions.push({
      id: `rol-${r.uid}-${role}`,
      kind: 'rol',
      text: `Was ${sab} ${role.toLowerCase()} bij "${taskTitle(r.taskId)}"?`,
      options: [
        { value: 'ja', label: 'Ja' },
        { value: 'nee', label: 'Nee' },
      ],
      correct: [yes ? 'ja' : 'nee'],
    });
  }

  if (Object.values(roleCounts.jokersGiven).some((n) => n > 0)) {
    const had = saboteurs.some((s) => (roleCounts.jokersGiven[s.playerId] ?? 0) > 0);
    questions.push({
      id: 'joker',
      kind: 'joker',
      text: `Heeft ${sab} tijdens het spel een Kijk-joker gekregen?`,
      options: [
        { value: 'ja', label: 'Ja' },
        { value: 'nee', label: 'Nee' },
      ],
      correct: [had ? 'ja' : 'nee'],
    });
  }
  return questions;
}

export interface Score {
  playerId: string;
  correct: number;
  total: number;
  /** Had de speler 't Duvelke juist? */
  foundSaboteur: boolean;
  ms: number;
}

export function scoreTest(questions: readonly TestQuestion[], answers: TestAnswers): Omit<Score, 'playerId'> {
  let correct = 0;
  questions.forEach((q, i) => {
    const a = answers.answers[i];
    if (a !== null && a !== undefined && q.correct.includes(a)) correct++;
  });
  const wie = questions.findIndex((q) => q.kind === 'wie');
  const a = wie >= 0 ? answers.answers[wie] : null;
  return { correct, total: questions.length, foundSaboteur: wie >= 0 && !!a && (questions[wie]?.correct.includes(a) ?? false), ms: answers.ms };
}

/**
 * De ranglijst van de speurders (saboteurs doen mee voor de schijn en tellen niet mee).
 * Meeste juist wint; de hoofdvraag telt bij gelijke stand dubbel; daarna wie het snelst was.
 */
export function ranking(players: readonly TestPlayer[], questions: readonly TestQuestion[], all: Record<string, TestAnswers>): Score[] {
  return players
    .filter((p) => p.role !== 'saboteur' && all[p.playerId])
    .map((p) => ({ playerId: p.playerId, ...scoreTest(questions, all[p.playerId] as TestAnswers) }))
    .sort((a, b) => b.correct - a.correct || Number(b.foundSaboteur) - Number(a.foundSaboteur) || a.ms - b.ms);
}

// --- De pot verdelen (echte schat), na de ontmaskering -----------------------------

/**
 * De prijzen bij de pot: winnaar van De Test, sabotageloon en "niet ontmaskerd" voor elk Duvelke,
 * de Speurneus-medaille en de Bemoeial als beste afleider.
 */
export type PrizeKind = 'winnaar' | 'loon' | 'verborgen' | 'speurneus' | 'afleider';

export interface Prize {
  kind: PrizeKind;
  playerId: string;
}

/** De winnaar van De Test krijgt een dubbel prijsdeel, de rest een enkel. */
export const PRIZE_WEIGHT: Record<PrizeKind, number> = { winnaar: 2, loon: 1, verborgen: 1, speurneus: 1, afleider: 1 };

/** Zoveel speurders moeten de Bemoeial aanduiden als 't Duvelke om beste afleider te zijn. */
export const DECOY_VOTES = 2;

export interface PrizeInput {
  /** De winnaar van De Test (zonder de Speurneus), of null als niemand De Test deed. */
  winnerId: string | null;
  saboteurIds: readonly string[];
  /** Hoeveel speurders wie aanduidden bij "Wie is 't Duvelke?". */
  votes: Readonly<Record<string, number>>;
  /** Hoeveel speurders die vraag beantwoordden. */
  voters: number;
  /** Haalde de groep minstens de helft van de schat? */
  groupWins: boolean;
  speurneus: { playerId: string; found: boolean } | null;
  bemoeialId: string | null;
}

/** Wie welke prijs verdiend heeft. */
export function potPrizes(i: PrizeInput): Prize[] {
  const out: Prize[] = [];
  if (i.winnerId) out.push({ kind: 'winnaar', playerId: i.winnerId });
  for (const id of i.saboteurIds) {
    // Sabotageloon altijd; extra als minder dan de helft het juist had, of als de groep de schat niet won.
    out.push({ kind: 'loon', playerId: id });
    if (!i.groupWins || (i.votes[id] ?? 0) * 2 < i.voters) out.push({ kind: 'verborgen', playerId: id });
  }
  if (i.speurneus?.found) out.push({ kind: 'speurneus', playerId: i.speurneus.playerId });
  if (i.bemoeialId && (i.votes[i.bemoeialId] ?? 0) >= DECOY_VOTES) out.push({ kind: 'afleider', playerId: i.bemoeialId });
  return out;
}

/** Wie de speurders aanduidden als 't Duvelke (de antwoorden van 't Duvelke zelf tellen niet: die zijn voor de schijn). */
export function suspectVotes(players: readonly TestPlayer[], questions: readonly TestQuestion[], all: Record<string, TestAnswers>): { votes: Record<string, number>; voters: number } {
  const wie = questions.findIndex((q) => q.kind === 'wie');
  const votes: Record<string, number> = {};
  let voters = 0;
  if (wie < 0) return { votes, voters };
  for (const p of players) {
    const a = p.role === 'saboteur' ? null : all[p.playerId]?.answers[wie];
    if (!a) continue;
    voters++;
    votes[a] = (votes[a] ?? 0) + 1;
  }
  return { votes, voters };
}

export interface PotShare {
  name: string;
  total: number;
  /** Wat de groep met de opdrachten verdiende. */
  earned: number;
  /** Wat iedereen krijgt. */
  base: number;
  /** De prijzen met hun aantal (0 als er niets meer over was). */
  prizes: (Prize & { amount: number })[];
  /** Wie een geluksmuntje kreeg (één extra). */
  lucky: string[];
  /** Het totaal per speler. */
  perPlayer: Record<string, number>;
  /** Moest er herverdeeld worden omdat iemand meer dan anderhalve keer een gewoon deel zou krijgen? */
  capped: boolean;
}

/** Niemand krijgt meer dan zoveel keer wat een gewoon kind krijgt. */
export const MAX_RATIO = 1.5;

/** Het maximum voor één kind: anderhalve keer een gewoon deel, maar altijd minstens één meer (anders is een prijs niets waard). */
function capFor(base: number): number {
  return Math.max(base + 1, Math.floor(base * MAX_RATIO));
}

/**
 * Verdeelt één soort van de echte schat, zodat alles verdeeld wordt en de verschillen klein blijven:
 * 1. het verdiende deel gaat gelijk naar iedereen, ook naar 't Duvelke;
 * 2. uit het gemiste deel komen de prijzen, elk hoogstens een vast stukje (een kwart van een gemiddeld
 *    deel per persoon, de winnaar het dubbele);
 * 3. wat dan nog over is, gaat weer gelijk naar iedereen;
 * 4. de laatste restjes gaan eerst naar prijzen die nog niets kregen, en daarna als geluksmuntjes naar
 *    wie geen prijs heeft (en zijn er nog meer, dan om de beurt naar de prijswinnaars);
 * 5. krijgt iemand dan meer dan anderhalve keer een gewoon deel (bv. twee prijzen, weinig kinderen of veel
 *    snoep), dan wordt het teveel automatisch herverdeeld over iedereen.
 */
export function potShare(item: TreasureItem, fraction: number, playerIds: readonly string[], prizes: readonly Prize[], rng: Rng): PotShare {
  const n = playerIds.length;
  const perPlayer: Record<string, number> = Object.fromEntries(playerIds.map((id) => [id, 0]));
  const earned = Math.round(item.quantity * Math.min(1, Math.max(0, fraction)));
  if (n === 0) return { name: item.name, total: item.quantity, earned, base: 0, prizes: [], lucky: [], perPlayer, capped: false };
  const valid = prizes.filter((p) => playerIds.includes(p.playerId));
  let base = Math.floor(earned / n);
  let pool = item.quantity - base * n;

  const unit = Math.max(1, Math.round(item.quantity / n / 4));
  const weight = valid.reduce((s, p) => s + PRIZE_WEIGHT[p.kind], 0);
  const part = weight > 0 ? Math.min(Math.floor(pool / weight), unit) : 0;
  const won = valid.map((p) => ({ ...p, amount: part * PRIZE_WEIGHT[p.kind] }));
  pool -= part * weight;

  const extra = Math.floor(pool / n);
  base += extra;
  pool -= extra * n;

  // Was er te weinig voor de prijzen (bijna alles verdiend)? Dan gaan de restjes eerst naar de prijzen,
  // in volgorde (de winnaar eerst, tot zijn gewicht), zodat een prijswinnaar nooit minder heeft dan een geluksvogel.
  for (const p of won) {
    if (p.amount > 0) continue;
    const give = Math.min(PRIZE_WEIGHT[p.kind], pool);
    p.amount += give;
    pool -= give;
  }

  const winners = [...new Set(won.map((p) => p.playerId))];
  const others = shuffle(playerIds.filter((id) => !winners.includes(id)), rng);
  const lucky = others.slice(0, Math.min(pool, others.length));
  pool -= lucky.length;
  // Nog restjes over? Om de beurt bij de grootste prijs van elke prijswinnaar.
  const biggest = winners
    .map((id) => won.filter((p) => p.playerId === id).sort((a, b) => b.amount - a.amount)[0])
    .filter((p): p is (typeof won)[number] => !!p)
    .sort((a, b) => b.amount - a.amount);
  for (let i = 0; pool > 0 && biggest.length > 0; i++, pool--) (biggest[i % biggest.length] as (typeof won)[number]).amount += 1;

  const total = (id: string): number => base + lucky.filter((x) => x === id).length + won.filter((p) => p.playerId === id).reduce((s, p) => s + p.amount, 0);
  /** Wat een gewoon kind (zonder prijs) minstens krijgt: daartegen meet het maximum. */
  const regular = (): number => (others.length > 0 ? Math.min(...others.map(total)) : base);

  // Te groot verschil? Afknippen tot het maximum (eerst van de laatste prijzen) en het teveel herverdelen.
  let excess = 0;
  const cap = capFor(regular());
  for (const id of winners) {
    let cut = total(id) - cap;
    for (const p of [...won].reverse()) {
      if (cut <= 0) break;
      if (p.playerId !== id) continue;
      const take = Math.min(cut, p.amount);
      p.amount -= take;
      cut -= take;
      excess += take;
    }
  }
  const capped = excess > 0;
  if (capped) {
    // Gelijk over iedereen: het maximum stijgt mee (anderhalve keer), dus niemand gaat er weer over.
    const more = Math.floor(excess / n);
    base += more;
    excess -= more * n;
    // De laatste restjes, één voor één naar wie op dat moment het minst heeft (eerst gewone kinderen, in de
    // vaste lotingsvolgorde): zo blijft het verschil zo klein mogelijk.
    for (; excess > 0; excess--) {
      const order = [...others, ...winners];
      const low = order.reduce((a, b) => (total(b) < total(a) ? b : a));
      const p = won.find((x) => x.playerId === low);
      if (p) p.amount += 1;
      else lucky.push(low);
    }
  }

  for (const id of playerIds) perPlayer[id] = total(id);
  return { name: item.name, total: item.quantity, earned, base, prizes: won, lucky, perPlayer, capped };
}
