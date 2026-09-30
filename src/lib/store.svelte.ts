import * as db from './db';
import { sortPlayers } from './players';
import { defaultSettings, normalizeSettings } from './settings';
import type { Player, Settings } from './types';

export type Screen = 'home' | 'spelers' | 'instellingen' | 'benodigdheden';

export const app = $state({
  ready: false,
  loadError: false,
  offlineReady: false,
  screen: 'home' as Screen,
  players: [] as Player[],
  settings: defaultSettings(),
});

export const toast = $state({ message: '', kind: 'info' as 'info' | 'error', id: 0 });

export function showToast(message: string, kind: 'info' | 'error' = 'info'): void {
  toast.message = message;
  toast.kind = kind;
  toast.id += 1;
}

const SCREENS: Screen[] = ['home', 'spelers', 'instellingen', 'benodigdheden'];

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
  openedFromHome = app.screen === 'home';
  location.hash = screen;
}

export async function loadAll(): Promise<void> {
  try {
    const [players, rawSettings] = await Promise.all([db.getAllPlayers(), db.getValue('settings')]);
    app.players = sortPlayers(players);
    app.settings = normalizeSettings(rawSettings);
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

let lastSavedSettings = '';

export async function persistSettings(settings: Settings): Promise<void> {
  const json = JSON.stringify(settings);
  if (json === lastSavedSettings) return;
  try {
    await db.setValue('settings', settings);
    lastSavedSettings = json;
  } catch (err) {
    showToast('Opslaan van de instellingen is mislukt.', 'error');
    console.error(err);
  }
}

export function resetSettings(): void {
  // Benodigdheden horen bij het huis, niet bij het spel: die blijven staan.
  const { supplies, customSupplies } = app.settings;
  app.settings = { ...defaultSettings(), supplies, customSupplies };
}
