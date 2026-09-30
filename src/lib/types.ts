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
  /** voiceURI van de gekozen stem; null = automatisch een Nederlandse stem kiezen. */
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
  voice: VoiceSettings;
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
