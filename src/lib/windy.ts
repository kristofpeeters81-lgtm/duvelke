import { BUILTIN_LINES, LINE_CATEGORIES, type LineCategory } from './data/windyLines';
import { newId } from './ids';
import { isRecord, pickRandom, type Rng } from './util';

export const MAX_LINE_LENGTH = 220;
export const MAX_CUSTOM_LINES = 300;

export interface WindyLine {
  id: string;
  category: LineCategory;
  text: string;
  builtIn: boolean;
}

export interface WindyLineState {
  custom: WindyLine[];
  /** Ids van ingebouwde uitspraken die uitgezet zijn. */
  disabled: string[];
}

export interface LineContext {
  saboteur: string;
  zoon: string;
  windy: string;
  speler?: string;
}

const CATEGORY_IDS = new Set<string>(LINE_CATEGORIES.map((c) => c.id));

export function emptyLineState(): WindyLineState {
  return { custom: [], disabled: [] };
}

export function normalizeLineState(raw: unknown): WindyLineState {
  if (!isRecord(raw)) return emptyLineState();
  const builtInIds = new Set(BUILTIN_LINES.map((l) => l.id));
  const custom: WindyLine[] = [];
  if (Array.isArray(raw.custom)) {
    for (const item of raw.custom) {
      if (!isRecord(item) || typeof item.text !== 'string' || typeof item.category !== 'string') continue;
      if (!CATEGORY_IDS.has(item.category)) continue;
      const text = item.text.trim().slice(0, MAX_LINE_LENGTH);
      if (text === '') continue;
      custom.push({
        id: typeof item.id === 'string' ? item.id : newId(),
        category: item.category as LineCategory,
        text,
        builtIn: false,
      });
      if (custom.length >= MAX_CUSTOM_LINES) break;
    }
  }
  const disabled = Array.isArray(raw.disabled)
    ? [...new Set(raw.disabled.filter((d): d is string => typeof d === 'string' && builtInIds.has(d)))]
    : [];
  return { custom, disabled };
}

/** Alle uitspraken van een soort, ingebouwd en eigen, met of zonder de uitgezette. */
export function linesFor(category: LineCategory, state: WindyLineState, includeDisabled = false): WindyLine[] {
  const disabled = new Set(state.disabled);
  const builtIn = BUILTIN_LINES.filter((l) => l.category === category && (includeDisabled || !disabled.has(l.id))).map(
    (l) => ({ ...l, builtIn: true }),
  );
  return [...builtIn, ...state.custom.filter((l) => l.category === category)];
}

export function fillPlaceholders(text: string, ctx: LineContext): string {
  return text
    .replaceAll('{saboteur}', ctx.saboteur)
    .replaceAll('{zoon}', ctx.zoon)
    .replaceAll('{windy}', ctx.windy)
    .replaceAll('{speler}', ctx.speler ?? 'de volgende');
}

/**
 * Kiest een uitspraak, bij voorkeur eentje die recent niet gebruikt is.
 * Een uitspraak met {speler} wordt enkel gekozen als er een speler is om in te vullen.
 */
export function pickLine(
  category: LineCategory,
  state: WindyLineState,
  ctx: LineContext,
  recent: readonly string[] = [],
  rng: Rng = Math.random,
): { id: string; text: string } | null {
  const all = linesFor(category, state).filter((l) => ctx.speler !== undefined || !l.text.includes('{speler}'));
  if (all.length === 0) return null;
  const fresh = all.filter((l) => !recent.includes(l.id));
  const line = pickRandom(fresh.length > 0 ? fresh : all, rng);
  if (!line) return null;
  return { id: line.id, text: fillPlaceholders(line.text, ctx) };
}

/** Houdt een korte lijst bij van recent gebruikte uitspraken om herhaling te vermijden. */
export function rememberLine(recent: string[], id: string, max = 25): string[] {
  return [id, ...recent.filter((r) => r !== id)].slice(0, max);
}

export interface RecordingPart {
  id: string;
  template: string;
  label: string;
}

/**
 * Welke stukjes je moet inspreken voor een uitspraak. Een zin met {speler} wordt gesplitst
 * in "vóór de naam" en "na de naam"; de naam zelf spreek je één keer in per speler.
 */
export function recordingParts(line: { id: string; text: string }): RecordingPart[] {
  const pieces = line.text.split('{speler}');
  if (pieces.length === 1) return [{ id: line.id, template: line.text, label: 'De zin' }];
  if (pieces.length > 2) return [];
  const [before = '', after = ''] = pieces;
  const parts: RecordingPart[] = [];
  if (before.trim()) parts.push({ id: `${line.id}:voor`, template: before.trim(), label: '1. Vóór de naam' });
  if (after.trim()) parts.push({ id: `${line.id}:na`, template: after.trim(), label: parts.length ? '2. Na de naam' : 'Na de naam' });
  return parts;
}

export function isFullyRecorded(line: { id: string; text: string }, recorded: readonly string[]): boolean {
  const parts = recordingParts(line);
  return parts.length > 0 && parts.every((p) => recorded.includes(p.id));
}

export function nameRecordingId(playerId: string): string {
  return `naam:${playerId}`;
}