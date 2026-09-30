import { LOCATION_IDS } from './data/locations';
import { SUPPLIES, SUPPLY_IDS } from './data/supplies';
import { newId } from './ids';
import type { CustomSupply, Difficulty, LocationId, Settings, TreasureItem, TreasureMode } from './types';

export const MIN_DURATION = 30;
export const MAX_DURATION = 150;
export const DURATION_STEP = 15;
export const MAX_NAME_LENGTH = 24;
export const MAX_SUPPLY_LENGTH = 30;
export const MAX_CUSTOM_SUPPLIES = 60;
export const CUSTOM_SUPPLY_EMOJIS = ['📦', '🎁', '🧰', '🪀', '🎯', '🏐', '🪁', '🛹', '🎨', '🧃', '🍪', '🔑', '🪄', '🎺', '🧲', '🕯️'];

export function defaultSettings(): Settings {
  return {
    version: 1,
    saboteurName: "'t Duvelke",
    hostName: 'Windy',
    durationMinutes: 90,
    difficulty: 'normaal',
    locations: ['binnen', 'tuin'],
    treasureMode: 'virtueel',
    treasureItems: [],
    speurneusEnabled: false,
    bemoeialEnabled: false,
    neighbourGossip: true,
    briefingEvery: 1,
    supplies: [],
    customSupplies: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cleanName(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim().slice(0, MAX_NAME_LENGTH);
  return trimmed.length > 0 ? trimmed : fallback;
}

function clampDuration(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  const stepped = Math.round(value / DURATION_STEP) * DURATION_STEP;
  return Math.min(MAX_DURATION, Math.max(MIN_DURATION, stepped));
}

function cleanTreasureItems(value: unknown): TreasureItem[] {
  if (!Array.isArray(value)) return [];
  const items: TreasureItem[] = [];
  for (const raw of value) {
    if (!isRecord(raw) || typeof raw.name !== 'string' || raw.name.trim() === '') continue;
    const quantity = typeof raw.quantity === 'number' && Number.isFinite(raw.quantity)
      ? Math.min(999, Math.max(1, Math.round(raw.quantity)))
      : 1;
    items.push({
      id: typeof raw.id === 'string' ? raw.id : newId(),
      name: raw.name.trim().slice(0, 40),
      quantity,
    });
  }
  return items;
}

function cleanCustomSupplies(value: unknown): CustomSupply[] {
  if (!Array.isArray(value)) return [];
  const result: CustomSupply[] = [];
  const seen = new Set(SUPPLIES.map((s) => s.label.toLocaleLowerCase('nl-BE')));
  for (const raw of value) {
    if (!isRecord(raw) || typeof raw.id !== 'string' || typeof raw.label !== 'string') continue;
    const label = raw.label.trim().slice(0, MAX_SUPPLY_LENGTH);
    const key = label.toLocaleLowerCase('nl-BE');
    if (label === '' || seen.has(key) || SUPPLY_IDS.has(raw.id)) continue;
    seen.add(key);
    result.push({ id: raw.id, label, emoji: typeof raw.emoji === 'string' && raw.emoji !== '' ? raw.emoji : '📦' });
    if (result.length >= MAX_CUSTOM_SUPPLIES) break;
  }
  return result;
}

/** Geeft een foutmelding terug, of null als de eigen benodigdheid toegevoegd mag worden. */
export function validateCustomSupplyLabel(label: string, custom: CustomSupply[]): string | null {
  const trimmed = label.trim();
  if (trimmed === '') return 'Vul in wat je hebt.';
  if (trimmed.length > MAX_SUPPLY_LENGTH) return `Maximum ${MAX_SUPPLY_LENGTH} letters.`;
  if (custom.length >= MAX_CUSTOM_SUPPLIES) return `Maximum ${MAX_CUSTOM_SUPPLIES} eigen spullen.`;
  const key = trimmed.toLocaleLowerCase('nl-BE');
  if (SUPPLIES.some((s) => s.label.toLocaleLowerCase('nl-BE') === key) || custom.some((c) => c.label.toLocaleLowerCase('nl-BE') === key)) {
    return 'Dat staat al in de lijst.';
  }
  return null;
}

/**
 * Zet opgeslagen (mogelijk verouderde of beschadigde) instellingen om naar geldige instellingen.
 * Onbekende of foute waarden vallen terug op de standaard.
 */
export function normalizeSettings(raw: unknown): Settings {
  const d = defaultSettings();
  if (!isRecord(raw)) return d;

  const difficulties: Difficulty[] = ['makkelijk', 'normaal', 'pittig'];
  const treasureModes: TreasureMode[] = ['virtueel', 'fysiek'];

  const locations = Array.isArray(raw.locations)
    ? [...new Set(raw.locations.filter((l): l is LocationId => LOCATION_IDS.includes(l as LocationId)))]
    : d.locations;

  const customSupplies = cleanCustomSupplies(raw.customSupplies);
  const customIds = new Set(customSupplies.map((c) => c.id));
  const supplies = Array.isArray(raw.supplies)
    ? [...new Set(raw.supplies.filter((s): s is string => typeof s === 'string' && (SUPPLY_IDS.has(s) || customIds.has(s))))]
    : d.supplies;

  return {
    version: 1,
    saboteurName: cleanName(raw.saboteurName, d.saboteurName),
    hostName: cleanName(raw.hostName, d.hostName),
    durationMinutes: clampDuration(raw.durationMinutes, d.durationMinutes),
    difficulty: difficulties.includes(raw.difficulty as Difficulty) ? (raw.difficulty as Difficulty) : d.difficulty,
    locations: locations.length > 0 ? locations : d.locations,
    treasureMode: treasureModes.includes(raw.treasureMode as TreasureMode) ? (raw.treasureMode as TreasureMode) : d.treasureMode,
    treasureItems: cleanTreasureItems(raw.treasureItems),
    speurneusEnabled: typeof raw.speurneusEnabled === 'boolean' ? raw.speurneusEnabled : d.speurneusEnabled,
    bemoeialEnabled: typeof raw.bemoeialEnabled === 'boolean' ? raw.bemoeialEnabled : d.bemoeialEnabled,
    neighbourGossip: typeof raw.neighbourGossip === 'boolean' ? raw.neighbourGossip : d.neighbourGossip,
    briefingEvery: raw.briefingEvery === 2 ? 2 : 1,
    supplies,
    customSupplies,
  };
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} uur`;
  return `${h} u ${m} min`;
}
