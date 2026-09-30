import type { LocationId } from '../types';

export interface LocationInfo {
  id: LocationId;
  label: string;
  emoji: string;
  /** Opdrachten op deze plek enkel met een volwassene erbij. */
  needsAdult: boolean;
}

export const LOCATIONS: LocationInfo[] = [
  { id: 'binnen', label: 'Binnen', emoji: '🏠', needsAdult: false },
  { id: 'tuin', label: 'Tuin', emoji: '🌳', needsAdult: false },
  { id: 'straat', label: 'Straat / buurt', emoji: '🏘️', needsAdult: true },
  { id: 'bos', label: 'Bos', emoji: '🌲', needsAdult: true },
  { id: 'park', label: 'Speeltuin / park', emoji: '🛝', needsAdult: true },
  { id: 'dorp', label: 'Dorp', emoji: '⛪', needsAdult: true },
  { id: 'strand', label: 'Strand', emoji: '🏖️', needsAdult: true },
];

export const LOCATION_IDS: LocationId[] = LOCATIONS.map((l) => l.id);
