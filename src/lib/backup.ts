/**
 * Back-up naar één bestand en terugzetten. Bevat: spelers, instellingen, Windy's uitspraken,
 * eigen/AI-opdrachten, duimpjes en ingesproken opnames. Niet: het lopende spel, foto's en de AI-sleutel.
 */
import type { Recording } from './db';
import { sortPlayers } from './players';
import { normalizeSettings } from './settings';
import type { TaskDef } from './tasks/types';
import { validateTask } from './tasks/validate';
import type { Player, Settings } from './types';
import { isRecord } from './util';
import { normalizeLineState, type WindyLineState } from './windy';

export const BACKUP_KIND = 'wie-is-t-duvelke-backup';

export interface BackupRecording {
  lineId: string;
  durationMs: number;
  createdAt: number;
  mime: string;
  /** base64 */
  data: string;
}

export interface Backup {
  kind: typeof BACKUP_KIND;
  version: 1;
  createdAt: number;
  players: Player[];
  settings: Settings;
  windyLines: WindyLineState;
  customTasks: TaskDef[];
  taskStats: { ratings: Record<string, number>; recent: string[] };
  recordings: BackupRecording[];
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

export function base64ToBlob(data: string, mime: string): Blob {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export async function makeBackup(parts: Omit<Backup, 'kind' | 'version' | 'createdAt' | 'recordings'>, recordings: Recording[]): Promise<Backup> {
  const recs: BackupRecording[] = [];
  for (const r of recordings) {
    recs.push({ lineId: r.lineId, durationMs: r.durationMs, createdAt: r.createdAt, mime: r.audio.type || 'audio/webm', data: await blobToBase64(r.audio) });
  }
  return { kind: BACKUP_KIND, version: 1, createdAt: Date.now(), ...parts, recordings: recs };
}

export class BackupError extends Error {}

/** Controleert een back-upbestand en zet het om naar bruikbare gegevens. Gooit BackupError bij een fout bestand. */
export function readBackup(raw: unknown): Omit<Backup, 'recordings'> & { recordings: Recording[] } {
  if (!isRecord(raw) || raw.kind !== BACKUP_KIND) throw new BackupError('Dit is geen back-up van dit spel.');
  if (raw.version !== 1) throw new BackupError('Deze back-up komt van een nieuwere versie van de app.');
  const settings = normalizeSettings(raw.settings);
  const players: Player[] = [];
  if (Array.isArray(raw.players)) {
    for (const p of raw.players) {
      if (!isRecord(p) || typeof p.id !== 'string' || typeof p.name !== 'string' || p.name.trim() === '') continue;
      players.push({
        id: p.id,
        name: p.name.trim().slice(0, 24),
        color: typeof p.color === 'string' ? p.color : '#9aa4b8',
        avatar: typeof p.avatar === 'string' ? p.avatar : '🙂',
        isAdult: p.isAdult === true,
        createdAt: typeof p.createdAt === 'number' ? p.createdAt : Date.now(),
      });
    }
  }
  const customTasks: TaskDef[] = [];
  if (Array.isArray(raw.customTasks)) {
    for (const t of raw.customTasks) {
      const source = isRecord(t) && t.source === 'ai' ? 'ai' : 'eigen';
      const r = validateTask(t, { customSupplies: settings.customSupplies, source, keepId: true });
      if (r.task) customTasks.push(r.task);
    }
  }
  const stats = isRecord(raw.taskStats) ? raw.taskStats : {};
  const ratings: Record<string, number> = {};
  if (isRecord(stats.ratings)) for (const [k, v] of Object.entries(stats.ratings)) if (typeof v === 'number') ratings[k] = v;
  const recordings: Recording[] = [];
  if (Array.isArray(raw.recordings)) {
    for (const r of raw.recordings) {
      if (!isRecord(r) || typeof r.lineId !== 'string' || typeof r.data !== 'string') continue;
      try {
        recordings.push({
          lineId: r.lineId,
          audio: base64ToBlob(r.data, typeof r.mime === 'string' ? r.mime : 'audio/webm'),
          durationMs: typeof r.durationMs === 'number' ? r.durationMs : 0,
          createdAt: typeof r.createdAt === 'number' ? r.createdAt : Date.now(),
        });
      } catch {
        /* kapotte opname overslaan */
      }
    }
  }
  return {
    kind: BACKUP_KIND,
    version: 1,
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
    players: sortPlayers(players),
    settings,
    windyLines: normalizeLineState(raw.windyLines),
    customTasks,
    taskStats: { ratings, recent: Array.isArray(stats.recent) ? stats.recent.filter((x): x is string => typeof x === 'string') : [] },
    recordings,
  };
}
