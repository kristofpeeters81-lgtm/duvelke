import { describe, expect, it } from 'vitest';
import { prepFile, prepFingerprint, readPrepFile, withGameFields, type Prep } from './prep';
import { defaultSettings } from './settings';
import type { Player } from './types';

const players: Player[] = [
  { id: 'a', name: 'Lotte', color: '#f00', avatar: '🦊', isAdult: false, createdAt: 1 },
  { id: 'b', name: 'Noor', color: '#0f0', avatar: '🐼', isAdult: false, createdAt: 1 },
  { id: 'c', name: 'Papa', color: '#00f', avatar: '🐻', isAdult: true, createdAt: 1 },
];

const prep: Prep = {
  id: 'v1',
  name: 'Feest Dieuwke',
  createdAt: 1,
  updatedAt: 2,
  playerIds: ['a', 'b', 'c'],
  gameMasterId: 'c',
  settings: { ...defaultSettings(), difficulty: 'pittig', durationMinutes: 150 },
  program: [{ uid: 'u1', taskId: 'kleurenjacht', location: 'binnen', vars: {}, list: ['rood is'] }],
};

describe('voorbereidingen', () => {
  it('merkt wijzigingen aan spelers, hulpje, spelinstellingen en programma', () => {
    const base = prepFingerprint(prep);
    expect(prepFingerprint({ ...prep })).toBe(base);
    expect(prepFingerprint({ ...prep, playerIds: ['a', 'b'] })).not.toBe(base);
    expect(prepFingerprint({ ...prep, gameMasterId: null })).not.toBe(base);
    expect(prepFingerprint({ ...prep, settings: { ...prep.settings, difficulty: 'normaal' } })).not.toBe(base);
    expect(prepFingerprint({ ...prep, program: [] })).not.toBe(base);
    // De stem of de namen horen niet bij het spel: die tellen niet als wijziging.
    expect(prepFingerprint({ ...prep, settings: { ...prep.settings, hostName: 'Wendy' } })).toBe(base);
  });

  it('neemt enkel de spelinstellingen over, niet de namen of de stem', () => {
    const mine = { ...defaultSettings(), hostName: 'Windy', difficulty: 'makkelijk' as const };
    const merged = withGameFields(mine, { ...prep.settings, hostName: 'Iemand anders' });
    expect(merged.difficulty).toBe('pittig');
    expect(merged.durationMinutes).toBe(150);
    expect(merged.hostName).toBe('Windy');
  });

  it('brengt een voorbereiding naar een ander toestel: spelers herkend op naam, of nieuw', () => {
    const file = JSON.parse(JSON.stringify(prepFile(prep, players)));
    const other: Player[] = [{ id: 'x', name: 'lotte', color: '#f00', avatar: '🦊', isAdult: false, createdAt: 1 }];
    const { prep: loaded, newPlayers } = readPrepFile(file, other);
    expect(newPlayers.map((p) => p.name)).toEqual(['Noor', 'Papa']);
    expect(loaded.playerIds[0]).toBe('x');
    expect(loaded.playerIds).toHaveLength(3);
    expect(loaded.gameMasterId).toBe(newPlayers.find((p) => p.name === 'Papa')!.id);
    expect(loaded.program).toHaveLength(1);
    expect(loaded.id).not.toBe(prep.id);
  });

  it('weigert een bestand dat geen voorbereiding is', () => {
    expect(() => readPrepFile({ kind: 'iets anders' }, players)).toThrow(/geen voorbereiding/);
  });
});
