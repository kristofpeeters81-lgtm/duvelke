import * as db from './db';
import { normalizeGame, type Game } from './game';
import { sortPlayers } from './players';
import { defaultSettings, normalizeSettings } from './settings';
import type { Player } from './types';
import { emptyLineState, normalizeLineState, type LineContext, type WindyLineState } from './windy';

export type Screen = 'home' | 'spelers' | 'instellingen' | 'benodigdheden' | 'windy' | 'stemtest' | 'nieuw-spel' | 'spel';

export const app = $state({
  ready: false,
  loadError: false,
  offlineReady: false,
  screen: 'home' as Screen,
  players: [] as Player[],
  settings: defaultSettings(),
  windyLines: emptyLineState() as WindyLineState,
  game: null as Game | null,
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

const SCREENS: Screen[] = ['home', 'spelers', 'instellingen', 'benodigdheden', 'windy', 'stemtest', 'nieuw-spel', 'spel'];

function screenFromHash(): Screen {
  const hash = location.hash.slice(1);
  return SCREENS.find((s) => s === hash) ?? 'home';
}

/** Of het huidige scherm vanaf het beginscherm geopend werd (dan kan "terug" gewoon history.back doen). */
let openedFromHome = false;

/** Koppelt de schermen aan de URL, zodat de terugknop van Android terug naar het beginscherm gaat i.p.v. de app te sluiten. */
export function initNavigation(): void {
  app.screen = screenFromHash();
  window.addEventListener('hashchange', () => {
    app.screen = screenFromHash();
    if (app.screen === 'home') openedFromHome = false;
    window.scrollTo(0, 0);
  });
}

export function go(screen: Screen): void {
  if (screen === 'home') {
    if (openedFromHome) {
      history.back();
    } else {
      history.replaceState(null, '', location.pathname + location.search);
      app.screen = 'home';
      window.scrollTo(0, 0);
    }
    return;
  }
  // Van "nieuw spel" naar "spel": de geschiedenis vervangen, zodat terug naar het beginscherm gaat.
  if (app.screen === 'nieuw-spel' && screen === 'spel') {
    history.replaceState(null, '', `#${screen}`);
    app.screen = screen;
    window.scrollTo(0, 0);
    return;
  }
  openedFromHome = app.screen === 'home';
  location.hash = screen;
}

export async function loadAll(): Promise<void> {
  try {
    const [players, rawSettings, rawLines, rawGame] = await Promise.all([
      db.getAllPlayers(),
      db.getValue('settings'),
      db.getValue('windyLines'),
      db.getValue('game'),
    ]);
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
