import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Player } from './types';

/** Een zelf ingesproken uitspraak van Windy. */
export interface Recording {
  lineId: string;
  audio: Blob;
  durationMs: number;
  createdAt: number;
}

/** Een bewijsfoto, enkel op de tablet bewaard. */
export interface Photo {
  id: string;
  gameId: string;
  taskUid: string | null;
  caption: string;
  createdAt: number;
  image: Blob;
}

interface DuvelkeDB extends DBSchema {
  players: { key: string; value: Player };
  kv: { key: string; value: unknown };
  recordings: { key: string; value: Recording };
  photos: { key: string; value: Photo; indexes: { byGame: string } };
}

let dbPromise: Promise<IDBPDatabase<DuvelkeDB>> | null = null;

function db(): Promise<IDBPDatabase<DuvelkeDB>> {
  dbPromise ??= openDB<DuvelkeDB>('duvelke', 3, {
    // Stap voor stap bijwerken, zodat bestaande gegevens op de tablet bewaard blijven.
    upgrade(database, oldVersion) {
      if (oldVersion < 1) {
        database.createObjectStore('players', { keyPath: 'id' });
        database.createObjectStore('kv');
      }
      if (oldVersion < 2) {
        database.createObjectStore('recordings', { keyPath: 'lineId' });
      }
      if (oldVersion < 3) {
        database.createObjectStore('photos', { keyPath: 'id' }).createIndex('byGame', 'gameId');
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

export async function getAllRecordings(): Promise<Recording[]> {
  return (await db()).getAll('recordings');
}

/** Alle spelers vervangen (bij het terugzetten van een back-up). */
export async function replacePlayers(players: Player[]): Promise<void> {
  const tx = (await db()).transaction('players', 'readwrite');
  await tx.store.clear();
  for (const p of players) await tx.store.put(p);
  await tx.done;
}

export async function listRecordingIds(): Promise<string[]> {
  return (await db()).getAllKeys('recordings');
}

export async function putPhoto(photo: Photo): Promise<void> {
  await (await db()).put('photos', photo);
}

export async function getPhotos(gameId: string): Promise<Photo[]> {
  const all = await (await db()).getAllFromIndex('photos', 'byGame', gameId);
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

export async function deletePhoto(id: string): Promise<void> {
  await (await db()).delete('photos', id);
}

/** Foto's ouder dan een aantal dagen opruimen, zodat de tablet niet volloopt. */
export async function deleteOldPhotos(maxAgeDays: number): Promise<void> {
  const database = await db();
  const limit = Date.now() - maxAgeDays * 86400000;
  const tx = database.transaction('photos', 'readwrite');
  for (const photo of await tx.store.getAll()) if (photo.createdAt < limit) await tx.store.delete(photo.id);
  await tx.done;
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
