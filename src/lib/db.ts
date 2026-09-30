import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Player } from './types';

interface DuvelkeDB extends DBSchema {
  players: { key: string; value: Player };
  kv: { key: string; value: unknown };
}

let dbPromise: Promise<IDBPDatabase<DuvelkeDB>> | null = null;

function db(): Promise<IDBPDatabase<DuvelkeDB>> {
  dbPromise ??= openDB<DuvelkeDB>('duvelke', 1, {
    upgrade(database) {
      database.createObjectStore('players', { keyPath: 'id' });
      database.createObjectStore('kv');
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
