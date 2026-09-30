import type { PiperVoiceId } from './data/piperVoices';

export type LocationId = 'binnen' | 'tuin' | 'straat' | 'bos' | 'park' | 'dorp' | 'strand';
export type Difficulty = 'makkelijk' | 'normaal' | 'pittig';
export type TreasureMode = 'virtueel' | 'fysiek';

export interface Player {
  id: string;
  name: string;
  color: string;
  avatar: string;
  isAdult: boolean;
  createdAt: number;
}

export interface TreasureItem {
  id: string;
  name: string;
  quantity: number;
}

/** Een benodigdheid die de spelleider zelf toevoegde. */
export interface CustomSupply {
  id: string;
  label: string;
  emoji: string;
}

export interface VoiceSettings {
  enabled: boolean;
  /** 'piper' = Vlaamse AI-stem op de tablet zelf; 'toestel' = voorleesstem van Android/Windows. */
  engine: 'piper' | 'toestel';
  piperVoice: PiperVoiceId;
  /** Afspeelsnelheid zonder toonbehoud: hoger = hogere (en iets snellere) stem. */
  piperPitch: number;
  /** Zelf ingesproken uitspraken afspelen als ze bestaan. */
  useRecordings: boolean;
  /** Aparte stem voor de buurvrouw. */
  neighbourVoice: PiperVoiceId;
  neighbourPitch: number;
  /** voiceURI van de toestelstem; null = automatisch een Nederlandse stem kiezen. */
  voiceURI: string | null;
  pitch: number;
  rate: number;
}

export interface Settings {
  version: 1;
  saboteurName: string;
  hostName: string;
  /** De zoon over wie Windy altijd klaagt. */
  sonName: string;
  /** De roddelende buurvrouw. */
  neighbourName: string;
  voice: VoiceSettings;
  /** Geluidseffecten (timer, edelstenen, fanfare). */
  soundEnabled: boolean;
  durationMinutes: number;
  difficulty: Difficulty;
  locations: LocationId[];
  treasureMode: TreasureMode;
  treasureItems: TreasureItem[];
  speurneusEnabled: boolean;
  bemoeialEnabled: boolean;
  neighbourGossip: boolean;
  briefingEvery: 1 | 2;
  /** Ids van de benodigdheden die beschikbaar zijn (zie data/supplies.ts en customSupplies). */
  supplies: string[];
  customSupplies: CustomSupply[];
}
