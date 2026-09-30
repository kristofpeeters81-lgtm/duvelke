import * as db from './db';
import { normalizeGame, type Game } from './game';
import { sortPlayers } from './players';
import { defaultSettings, normalizeSettings } from './settings';
import type { ProgramItem } from './tasks/program';
import type { Player, Settings } from './types';
import { emptyLineState, normalizeLineState, type LineContext, type WindyLineState } from './windy';

export type Screen =
  | 'home'
  | 'spelers'
  | 'instellingen'
  | 'benodigdheden'
  | 'windy'
  | 'stemtest'
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

const SCREENS: Screen[] = ['home', 'spelers', 'instellingen', 'benodigdheden', 'windy', 'stemtest', 'nieuw-spel', 'programma', 'paklijst', 'spel'];

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
    const [players, rawSettings, rawLines, rawGame, recorded] = await Promise.all([
      db.getAllPlayers(),
      db.getValue('settings'),
      db.getValue('windyLines'),
      db.getValue('game'),
      db.listRecordingIds(),
    ]);
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
    return true;
  } catch (err) {
    app.players = previous;
    showToast('Verwijderen van de speler is mislukt.', 'error');
    console.error(err);
    return false;
  }
}

export type PersistKey = 'settings' | 'windyLines' | 'game';

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
      const what = { settings: 'de instellingen', windyLines: "Windy's uitspraken", game: 'het spel' }[key];
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