import type { Difficulty, LocationId } from '../types';

export type TaskCategory =
  | 'zoeken'
  | 'raadsels'
  | 'samenwerken'
  | 'geheugen'
  | 'behendigheid'
  | 'creatief'
  | 'quiz'
  | 'communicatie'
  | 'tijdsdruk'
  | 'speuren'
  | 'foto'
  | 'beweging';

export type VarValue = string | number;

/** Mogelijke waarden per moeilijkheid; ontbreekt een niveau, dan geldt 'normaal'. */
export interface VarOptions {
  makkelijk?: VarValue[];
  normaal: VarValue[];
  pittig?: VarValue[];
}

export type Scoring =
  /** De spelleider duidt aan: gelukt, bijna of mislukt. */
  | { type: 'gelukt' }
  /** Een aantal tellen; target mag een variabele zijn zoals "{aantal}". */
  | { type: 'aantal'; target: number | string; unit: string }
  /** De app stelt quizvragen en telt zelf de punten. */
  | { type: 'quiz'; questions: number }
  /** Zo dicht mogelijk bij een aantal seconden "stop" roepen; de app meet. */
  | { type: 'stopwatch'; seconds: number | string; margin: number | string };

/** Extra inhoud die de app bij de opdracht toont (woorden, zinnen, zoeklijst...). */
export interface TaskList {
  title: string;
  items: { makkelijk?: string[]; normaal: string[]; pittig?: string[] };
  /** Hoeveel items er gekozen worden. */
  pick: number;
  /** Geheim: enkel voor één persoon, met ingedrukt houden (bv. uitbeeldwoorden). */
  secret: boolean;
}

export interface TaskRole {
  name: string;
  count: number;
  hint: string;
}

export interface TaskDef {
  id: string;
  title: string;
  emoji: string;
  category: TaskCategory;
  locations: LocationId[];
  /** Ids uit data/supplies.ts (of eigen spullen) die nodig zijn. */
  supplies: string[];
  minPlayers: number;
  maxPlayers?: number;
  /** Geschatte duur in minuten, inclusief uitleg. */
  minutes: number;
  /** Timer in seconden (bij 'makkelijk' krijgen ze 30% extra). */
  timer?: number | string;
  difficulties: Difficulty[];
  /** Uitleg voor de groep, met {variabelen}. */
  explain: string;
  explainEasy?: string;
  explainHard?: string;
  /** Wat de spelleider op voorhand moet klaarzetten (komt op de paklijst). */
  prep?: string;
  vars?: Record<string, VarOptions>;
  roles?: TaskRole[];
  list?: TaskList;
  scoring: Scoring;
  /** Maximum aantal edelstenen (standaard 10). */
  gems?: number;
  /** Sabotagetips voor 't Duvelke: stiekem, veilig en niet te opvallend. */
  sabotage: string[];
  /** Kan er na deze opdracht een dilemma (schat of Kijk-joker) komen? */
  dilemma?: boolean;
  /** Idee voor een bewijsfoto. */
  photo?: string;
  /** Opdrachten van de AI of zelf gemaakt. */
  source?: 'ingebouwd' | 'ai' | 'eigen';
}
