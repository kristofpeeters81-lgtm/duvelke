import * as db from './db';
import { normalizeGame, type Game } from './game';
import { sortPlayers } from './players';
import { defaultSettings, normalizeSettings } from './settings';
import type { ProgramItem } from './tasks/program';
import { setExtraTasks } from './tasks/registry';
import type { TaskDef } from './tasks/types';
import { validateTask } from './tasks/validate';
import type { Player, Settings } from './types';
import { BUILTIN_LINES, type LineCategory } from './data/windyLines';
import { emptyLineState, normalizeLineState, pickLine, rememberLine, type LineContext, type WindyLineState } from './windy';

export type Screen =
  | 'home'
  | 'spelers'
  | 'instellingen'
  | 'benodigdheden'
  | 'windy'
  | 'stemtest'
  | 'opdrachten'
  | 'uitleg'
  | 'nieuw-spel'
  | 'programma'
  | 'paklijst'
  | 'spel';

export interface GameDraft {
  playerIds: string[];
  gameMasterId: string | null;
  pin: string | null;
  settings: Settings;
  program: ProgramItem[];
}
export const app = $state({
  ready: false,
  loadError: false,
  offlineReady: false,
  screen: 'home' as Screen,
  players: [] as Player[],
  settings: defaultSettings(),
  windyLines: emptyLineState() as WindyLineState,
  game: null as Game | null,
  /** Uitspraken waarvan een eigen opname bestaat. */
  recordedLineIds: [] as string[],
  /** Een spel in voorbereiding (spelers, programma), nog niet gestart. */
  draft: null as GameDraft | null,
  /** Duimpjes per opdracht en de recent gespeelde opdrachten (over alle spellen heen). */
  taskStats: { ratings: {} as Record<string, number>, recent: [] as string[] },
  /** Zelf gemaakte en door AI bedachte opdrachten. */
  customTasks: [] as TaskDef[],
  /** Gemini-sleutel: blijft op dit toestel, nooit in een back-up. */
  ai: { geminiKey: '', model: '' },
});

export const toast = $state({ message: '', kind: 'info' as 'info' | 'error', id: 0 });

export function showToast(message: string, kind: 'info' | 'error' = 'info'): void {
  toast.message = message;
  toast.kind = kind;
  toast.id += 1;
}

/** Plaatshouders voor Windy, op basis van het lopende spel of anders de standaardinstellingen. */
export function lineContext(speler?: string): LineContext {
  const s = app.game?.settings ?? app.settings;
  return { saboteur: s.saboteurName, zoon: s.sonName, windy: s.hostName, speler };
}

const SCREENS: Screen[] = ['home', 'spelers', 'instellingen', 'benodigdheden', 'windy', 'stemtest', 'opdrachten', 'uitleg', 'nieuw-spel', 'programma', 'paklijst', 'spel'];

function screenFromHash(): Screen {
  const hash = location.hash.slice(1);
  return SCREENS.find((s) => s === hash) ?? 'home';
}

/** Schermen waar we vandaan komen, zodat "terug" (ook de Android-knop) naar het vorige scherm gaat. */
const backStack: Screen[] = [];

/** Koppelt de schermen aan de URL, zodat de terugknop van Android niet meteen de app sluit. */
export function initNavigation(): void {
  app.screen = screenFromHash();
  window.addEventListener('hashchange', () => {
    const screen = screenFromHash();
    if (backStack.at(-1) === screen) backStack.pop();
    app.screen = screen;
    window.scrollTo(0, 0);
  });
}

function hashFor(screen: Screen): string {
  return screen === 'home' ? location.pathname + location.search : `#${screen}`;
}

export function go(screen: Screen): void {
  if (screen === app.screen) return;
  if (screen === 'home') {
    if (backStack.length > 0) {
      // Helemaal terug in de geschiedenis, zodat de Android-knop daarna de app kan sluiten.
      const steps = backStack.length;
      backStack.length = 0;
      history.go(-steps);
    } else {
      history.replaceState(null, '', hashFor('home'));
      app.screen = 'home';
      window.scrollTo(0, 0);
    }
    return;
  }
  backStack.push(app.screen);
  location.hash = screen;
}

/** Eén scherm terug. */
export function goBack(): void {
  if (backStack.length > 0) history.back();
  else go('home');
}

/** Het huidige scherm vervangen, zonder nieuwe stap in de geschiedenis. */
export function replaceScreen(screen: Screen): void {
  history.replaceState(null, '', hashFor(screen));
  app.screen = screen;
  window.scrollTo(0, 0);
}

/**
 * Naar een scherm gaan alsof je rechtstreeks van het beginscherm komt (bv. paklijst → spel):
 * de voorbereidingsstappen verdwijnen uit de geschiedenis, zodat "terug" naar het beginscherm gaat.
 */
export function startFromHome(screen: Screen): void {
  const steps = backStack.length;
  if (steps === 0) {
    replaceScreen(screen);
    return;
  }
  backStack.length = 0;
  const onPop = (): void => {
    window.removeEventListener('popstate', onPop);
    backStack.push('home');
    history.pushState(null, '', hashFor(screen));
    app.screen = screen;
    window.scrollTo(0, 0);
  };
  window.addEventListener('popstate', onPop);
  history.go(-steps);
}
export async function loadAll(): Promise<void> {
  try {
    const [players, rawSettings, rawLines, rawGame, recorded, rawStats, rawCustom, rawAi] = await Promise.all([
      db.getAllPlayers(),
      db.getValue('settings'),
      db.getValue('windyLines'),
      db.getValue('game'),
      db.listRecordingIds(),
      db.getValue('taskStats'),
      db.getValue('customTasks'),
      db.getValue('ai'),
    ]);
    app.customTasks = normalizeCustomTasks(rawCustom, app.settings.customSupplies);
    setExtraTasks(app.customTasks);
    if (rawAi && typeof rawAi === 'object') {
      const a = rawAi as Record<string, unknown>;
      app.ai = { geminiKey: typeof a.geminiKey === 'string' ? a.geminiKey : '', model: typeof a.model === 'string' ? a.model : '' };
    }
    app.taskStats = normalizeTaskStats(rawStats);
    app.recordedLineIds = recorded;
    app.players = sortPlayers(players);
    app.settings = normalizeSettings(rawSettings);
    app.windyLines = normalizeLineState(rawLines);
    app.game = normalizeGame(rawGame);
    if (rawGame && !app.game) showToast('Het vorige spel was beschadigd en is gestopt.', 'error');
  } catch (err) {
    app.loadError = true;
    showToast('De opgeslagen gegevens konden niet geladen worden.', 'error');
    console.error(err);
  } finally {
    app.ready = true;
  }
}

export async function savePlayer(player: Player): Promise<boolean> {
  const previous = app.players;
  const next = sortPlayers([...previous.filter((p) => p.id !== player.id), player]);
  app.players = next;
  try {
    await db.putPlayer($state.snapshot(player));
    return true;
  } catch (err) {
    app.players = previous;
    showToast('Opslaan van de speler is mislukt.', 'error');
    console.error(err);
    return false;
  }
}

export async function deletePlayer(id: string): Promise<boolean> {
  const previous = app.players;
  app.players = previous.filter((p) => p.id !== id);
  try {
    await db.removePlayer(id);
    // Ook de ingesproken naam opruimen.
    const nameId = `naam:${id}`;
    if (app.recordedLineIds.includes(nameId)) void deleteRecording(nameId);
    return true;
  } catch (err) {
    app.players = previous;
    showToast('Verwijderen van de speler is mislukt.', 'error');
    console.error(err);
    return false;
  }
}

export type PersistKey = 'settings' | 'windyLines' | 'game' | 'taskStats' | 'customTasks' | 'ai';

const lastSaved = new Map<PersistKey, string>();
/** Per sleutel één wachtrij, zodat een oudere versie nooit een nieuwere overschrijft. */
const queues = new Map<PersistKey, Promise<void>>();

/** Bewaart een waarde in de databank, maar enkel als ze echt veranderd is. */
export function persistValue(key: PersistKey, value: unknown): Promise<void> {
  const json = JSON.stringify(value ?? null);
  const run = async (): Promise<void> => {
    if (lastSaved.get(key) === json) return;
    try {
      await db.setValue(key, JSON.parse(json));
      lastSaved.set(key, json);
    } catch (err) {
      const what = { settings: 'de instellingen', windyLines: "Windy's uitspraken", game: 'het spel', taskStats: 'de duimpjes', customTasks: 'de eigen opdrachten', ai: 'de AI-sleutel' }[key];
      showToast(`Opslaan van ${what} is mislukt.`, 'error');
      console.error(err);
    }
  };
  const next = (queues.get(key) ?? Promise.resolve()).then(run);
  queues.set(key, next);
  return next;
}

/** Alles meteen wegschrijven, bv. als de app naar de achtergrond gaat. */
export function persistAllNow(): void {
  if (!app.ready || app.loadError) return;
  void persistValue('settings', $state.snapshot(app.settings));
  void persistValue('windyLines', $state.snapshot(app.windyLines));
  void persistValue('game', $state.snapshot(app.game));
  void persistValue('taskStats', $state.snapshot(app.taskStats));
  void persistValue('customTasks', $state.snapshot(app.customTasks));
  void persistValue('ai', $state.snapshot(app.ai));
}

export function resetSettings(): void {
  // Benodigdheden horen bij het huis en de stem bij de tablet, niet bij het spel: die blijven staan.
  const { supplies, customSupplies, voice } = app.settings;
  app.settings = { ...defaultSettings(), supplies, customSupplies, voice };
}

export async function saveRecording(lineId: string, audio: Blob, durationMs: number): Promise<boolean> {
  try {
    await db.putRecording({ lineId, audio, durationMs, createdAt: Date.now() });
    if (!app.recordedLineIds.includes(lineId)) app.recordedLineIds = [...app.recordedLineIds, lineId];
    return true;
  } catch (err) {
    showToast('Opslaan van de opname is mislukt.', 'error');
    console.error(err);
    return false;
  }
}

export async function deleteRecording(lineId: string): Promise<boolean> {
  try {
    await db.removeRecording(lineId);
    app.recordedLineIds = app.recordedLineIds.filter((id) => id !== lineId);
    return true;
  } catch (err) {
    showToast('Wissen van de opname is mislukt.', 'error');
    console.error(err);
    return false;
  }
}
function normalizeTaskStats(raw: unknown): { ratings: Record<string, number>; recent: string[] } {
  const stats = { ratings: {} as Record<string, number>, recent: [] as string[] };
  if (typeof raw !== 'object' || raw === null) return stats;
  const r = raw as Record<string, unknown>;
  if (typeof r.ratings === 'object' && r.ratings !== null) {
    for (const [k, v] of Object.entries(r.ratings)) if (typeof v === 'number' && Number.isFinite(v)) stats.ratings[k] = Math.max(-10, Math.min(10, v));
  }
  if (Array.isArray(r.recent)) stats.recent = r.recent.filter((x): x is string => typeof x === 'string').slice(0, 30);
  return stats;
}

/** Duimpje en "recent gespeeld" bijhouden voor de keuze van volgende programma's. */
export function recordTaskPlayed(taskId: string, rating: 1 | -1 | 0): void {
  if (rating !== 0) app.taskStats.ratings[taskId] = (app.taskStats.ratings[taskId] ?? 0) + rating;
  app.taskStats.recent = [taskId, ...app.taskStats.recent.filter((id) => id !== taskId)].slice(0, 30);
}
/** Kiest een uitspraak van Windy tijdens het spel en onthoudt ze, zodat ze niet meteen terugkomt. */
export function windySays(category: LineCategory, speler?: string): { id: string; text: string } | null {
  const line = pickLine(category, app.windyLines, lineContext(speler), app.game?.recentLines ?? []);
  if (line && app.game) app.game.recentLines = rememberLine(app.game.recentLines, line.id);
  return line;
}
/** Opgeslagen eigen opdrachten opnieuw controleren: een kapotte opdracht mag het spel niet breken. */
function normalizeCustomTasks(raw: unknown, customSupplies: import('./types').CustomSupply[]): TaskDef[] {
  if (!Array.isArray(raw)) return [];
  const out: TaskDef[] = [];
  for (const t of raw) {
    const source = typeof t === 'object' && t !== null && (t as TaskDef).source === 'ai' ? 'ai' : 'eigen';
    const r = validateTask(t, { customSupplies, source, keepId: true });
    if (r.task && !out.some((x) => x.id === r.task!.id)) out.push(r.task);
  }
  return out;
}

export function saveCustomTask(task: TaskDef): void {
  app.customTasks = [...app.customTasks.filter((t) => t.id !== task.id), task];
  setExtraTasks($state.snapshot(app.customTasks));
}

export function deleteCustomTask(id: string): void {
  app.customTasks = app.customTasks.filter((t) => t.id !== id);
  setExtraTasks($state.snapshot(app.customTasks));
}
/** Maakt een back-upbestand van alles behalve het lopende spel, de foto's en de AI-sleutel. */
export async function exportBackup(): Promise<File> {
  const { makeBackup } = await import('./backup');
  const backup = await makeBackup(
    {
      players: $state.snapshot(app.players),
      settings: $state.snapshot(app.settings),
      windyLines: $state.snapshot(app.windyLines),
      customTasks: $state.snapshot(app.customTasks),
      taskStats: $state.snapshot(app.taskStats),
    },
    await db.getAllRecordings(),
  );
  const date = new Date().toISOString().slice(0, 10);
  return new File([JSON.stringify(backup)], `duvelke-backup-${date}.json`, { type: 'application/json' });
}

/** Zet een back-up terug. Vervangt spelers, instellingen, uitspraken, eigen opdrachten en opnames. */
export async function importBackup(file: File): Promise<string> {
  const { readBackup } = await import('./backup');
  let raw: unknown;
  try {
    raw = JSON.parse(await file.text());
  } catch {
    throw new Error('Dit bestand kan ik niet lezen.');
  }
  const data = readBackup(raw);
  await db.replacePlayers(data.players);
  for (const r of data.recordings) await db.putRecording(r);
  app.players = data.players;
  app.settings = data.settings;
  app.windyLines = data.windyLines;
  app.customTasks = data.customTasks;
  setExtraTasks(data.customTasks);
  app.taskStats = data.taskStats;
  app.recordedLineIds = await db.listRecordingIds();
  return `${data.players.length} spelers, ${data.customTasks.length} eigen opdrachten en ${data.recordings.length} opnames teruggezet.`;
}
/** De geschreven vorm (met plaatshouders) van een uitspraak, om ingesproken stukjes te vinden. */
export function lineTemplate(id: string): string | undefined {
  return BUILTIN_LINES.find((l) => l.id === id)?.text ?? app.windyLines.custom.find((l) => l.id === id)?.text;
}