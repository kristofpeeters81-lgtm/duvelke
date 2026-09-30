/**
 * Windy is de spelleider; de mens die helpt heet "het hulpje". Opdrachtteksten spreken soms nog
 * over "de spelleider": bij het tonen maken we daar het juiste van.
 * - Heeft de opdracht vragen met antwoorden, dan leest Windy ze voor: "Windy leest/stelt/..."
 * - Al de rest (verstoppen, omdraaien, beoordelen, fotograferen) doet het hulpje.
 */
import type { TaskDef } from './types';

const WINDY_VERBS = 'leest|stelt|noemt|vertelt|zegt|spelt|vraagt|roept';

/** Heeft de opdracht een lijst met antwoorden tussen haakjes (vragen, raadsels, weetjes)? */
export function windyReadsList(task: TaskDef): boolean {
  const items = task.list?.items.normaal ?? [];
  return !!task.list?.secret && items.length > 0 && items.every((i) => /\([^()]*\)\s*$/.test(i));
}

export function hostWording(text: string, task: TaskDef, hostName: string): string {
  let out = text;
  if (windyReadsList(task)) {
    out = out
      .replace(new RegExp(`\\bDe spelleider (${WINDY_VERBS})\\b`, 'g'), `${hostName} $1`)
      .replace(new RegExp(`\\bde spelleider (${WINDY_VERBS})\\b`, 'g'), `${hostName} $1`)
      .replace(/\(antwoorden? enkel voor de spelleider\)/gi, '(Windy zegt het antwoord)')
      .replace(/\(antwoorden? voor de spelleider\)/gi, '(Windy zegt het antwoord)');
  }
  return out
    .replace(/\bDe spelleider\b/g, 'Het hulpje')
    .replace(/\bde spelleider\b/g, 'het hulpje')
    .replace(/\bspelleider\b/g, 'hulpje');
}
