import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Player } from './types';

/** Een zelf ingesproken uitspraak van Windy. */
export interface Recording {
  lineId: string;
  audio: Blob;
  durationMs: number;
  createdAt: number;
}

interface DuvelkeDB extends DBSchema {
  players: { key: string; value: Player };
  kv: { key: string; value: unknown };
  recordings: { key: string; value: Recording };
}

let dbPromise: Promise<IDBPDatabase<DuvelkeDB>> | null = null;

function db(): Promise<IDBPDatabase<DuvelkeDB>> {
  dbPromise ??= openDB<DuvelkeDB>('duvelke', 2, {
    // Stap voor stap bijwerken, zodat bestaande gegevens op de tablet bewaard blijven.
    upgrade(database, oldVersion) {
      if (oldVersion < 1) {
        database.createObjectStore('players', { keyPath: 'id' });
        database.createObjectStore('kv');
      }
      if (oldVersion < 2) {
        database.createObjectStore('recordings', { keyPath: 'lineId' });
      }
    },
  });
  return dbPromise;
}

export async function getAllPlayers(): Promise<Player[]> {
  return (await db()).getAll('players');
}

export async function putPlayer(player: Player): Promise<void> {
  await (await db()).put('players', player);
}

export async function removePlayer(id: string): Promise<void> {
  await (await db()).delete('players', id);
}

export async function getValue(key: string): Promise<unknown> {
  return (await db()).get('kv', key);
}

export async function setValue(key: string, value: unknown): Promise<void> {
  await (await db()).put('kv', value, key);
}

export async function getRecording(lineId: string): Promise<Recording | undefined> {
  return (await db()).get('recordings', lineId);
}

export async function putRecording(recording: Recording): Promise<void> {
  await (await db()).put('recordings', recording);
}

export async function removeRecording(lineId: string): Promise<void> {
  await (await db()).delete('recordings', lineId);
}

export async function listRecordingIds(): Promise<string[]> {
  return (await db()).getAllKeys('recordings');
}

/** Vraagt de browser om de gegevens niet zomaar op te ruimen bij weinig opslagruimte. */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
