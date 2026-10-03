import { LOCATION_IDS } from './data/locations';
import { DEFAULT_PIPER_VOICE, PIPER_VOICE_IDS } from './data/piperVoices';
import { PITCH_SEMITONES } from './pitch';
import { SUPPLIES, SUPPLY_IDS } from './data/supplies';
import { newId } from './ids';
import { clampNumber, isRecord } from './util';
import type { CustomSupply, Difficulty, LocationId, Settings, TreasureItem, TreasureMode, VoiceSettings } from './types';

export const MIN_DURATION = 30;
export const MAX_DURATION = 150;
export const DURATION_STEP = 15;
export const MAX_NAME_LENGTH = 24;
export const MAX_SUPPLY_LENGTH = 30;
export const MAX_CUSTOM_SUPPLIES = 60;
export const CUSTOM_SUPPLY_EMOJIS = ['📦', '🎁', '🧰', '🪀', '🎯', '🏐', '🪁', '🛹', '🎨', '🧃', '🍪', '🔑', '🪄', '🎺', '🧲', '🕯️'];

export const PITCH_RANGE = { min: 0.5, max: 2 } as const;
export const RATE_RANGE = { min: 0.6, max: 1.5 } as const;

/** Een wat hogere toon dan normaal: "een man die een hoog stemmetje opzet". */
export const PIPER_PITCH_RANGE = { min: 0.85, max: 1.5 } as const;

export function defaultVoice(): VoiceSettings {
  return {
    enabled: true,
    engine: 'piper',
    piperVoice: DEFAULT_PIPER_VOICE,
    piperPitch: 1.2,
    useRecordings: true,
    machine: true,
    machineSound: 'licht',
    disguise: false,
    disguisePitch: 3,
    neighbourVoice: 'nl_BE-nathalie-medium',
    neighbourPitch: 1.05,
    voiceURI: null,
    pitch: 1.35,
    rate: 1.05,
  };
}

function cleanVoice(raw: unknown): VoiceSettings {
  const d = defaultVoice();
  if (!isRecord(raw)) return d;
  return {
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : d.enabled,
    engine: raw.engine === 'toestel' ? 'toestel' : 'piper',
    piperVoice: PIPER_VOICE_IDS.find((id) => id === raw.piperVoice) ?? d.piperVoice,
    piperPitch: clampNumber(raw.piperPitch, PIPER_PITCH_RANGE.min, PIPER_PITCH_RANGE.max, d.piperPitch),
    useRecordings: typeof raw.useRecordings === 'boolean' ? raw.useRecordings : d.useRecordings,
    machine: typeof raw.machine === 'boolean' ? raw.machine : d.machine,
    machineSound: raw.machineSound === 'robot' || raw.machineSound === 'blik' ? raw.machineSound : d.machineSound,
    disguise: typeof raw.disguise === 'boolean' ? raw.disguise : d.disguise,
    disguisePitch: Math.round(clampNumber(raw.disguisePitch, PITCH_SEMITONES.min, PITCH_SEMITONES.max, d.disguisePitch)),
    neighbourVoice: PIPER_VOICE_IDS.find((id) => id === raw.neighbourVoice) ?? d.neighbourVoice,
    neighbourPitch: clampNumber(raw.neighbourPitch, PIPER_PITCH_RANGE.min, PIPER_PITCH_RANGE.max, d.neighbourPitch),
    voiceURI: typeof raw.voiceURI === 'string' && raw.voiceURI !== '' ? raw.voiceURI : null,
    pitch: clampNumber(raw.pitch, PITCH_RANGE.min, PITCH_RANGE.max, d.pitch),
    rate: clampNumber(raw.rate, RATE_RANGE.min, RATE_RANGE.max, d.rate),
  };
}

export function defaultSettings(): Settings {
  return {
    version: 1,
    saboteurName: "'t Duvelke",
    hostName: 'Windy',
    sonName: 'Kenzo',
    neighbourName: 'Buurvrouw Josée',
    voice: defaultVoice(),
    soundEnabled: true,
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
    sonName: cleanName(raw.sonName, d.sonName),
    neighbourName: cleanName(raw.neighbourName, d.neighbourName),
    voice: cleanVoice(raw.voice),
    soundEnabled: typeof raw.soundEnabled === 'boolean' ? raw.soundEnabled : d.soundEnabled,
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
