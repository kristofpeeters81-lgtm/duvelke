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
  const multiple = saboteurs.length > 1;
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

export interface Share {
  name: string;
  total: number;
  earned: number;
  perPerson: number;
  rest: number;
}

/** Hoeveel van de echte schat verdiend is, en hoe je dat eerlijk verdeelt. */
export function physicalShare(items: readonly TreasureItem[], gems: number, max: number, people: number): Share[] {
  const fraction = max > 0 ? Math.min(1, gems / max) : 0;
  return items.map((it) => {
    const earned = Math.round(it.quantity * fraction);
    const perPerson = people > 0 ? Math.floor(earned / people) : 0;
    return { name: it.name, total: it.quantity, earned, perPerson, rest: earned - perPerson * people };
  });
}
