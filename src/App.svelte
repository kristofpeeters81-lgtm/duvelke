<script lang="ts">
  import { onMount } from 'svelte';
  import Duvelke from './components/Duvelke.svelte';
  import Toast from './components/Toast.svelte';
  import { requestPersistentStorage } from './lib/db';
  import { warmUp } from './lib/speech';
  import { app, initNavigation, loadAll, persistAllNow, persistValue, type PersistKey } from './lib/store.svelte';
  import GameScreen from './screens/Game.svelte';
  import Home from './screens/Home.svelte';
  import NewGame from './screens/NewGame.svelte';
  import Packing from './screens/Packing.svelte';
  import Program from './screens/Program.svelte';
  import Players from './screens/Players.svelte';
  import Settings from './screens/Settings.svelte';
  import Supplies from './screens/Supplies.svelte';
  import VoiceTest from './screens/VoiceTest.svelte';
  import WindyScreen from './screens/WindyScreen.svelte';

  onMount(() => {
    initNavigation();
    // Na het laden het stemmodel alvast opwarmen, zodat Windy's eerste zin vlot komt.
    void loadAll().then(() => setTimeout(() => void warmUp($state.snapshot(app.settings.voice)), 1500));
    void requestPersistentStorage();
  });

  // Automatisch bewaren. Instellingen kort na het typen; het spel meteen bij elke stap, zodat er
  // niets verloren gaat als de tablet plots dicht gaat.
  function autosave(key: PersistKey, read: () => unknown, delay: number): void {
    let timer: ReturnType<typeof setTimeout> | undefined;
    $effect(() => {
      const snapshot = read();
      if (!app.ready || app.loadError) return;
      clearTimeout(timer);
      if (delay === 0) void persistValue(key, snapshot);
      else timer = setTimeout(() => void persistValue(key, snapshot), delay);
    });
  }

  autosave('settings', () => $state.snapshot(app.settings), 400);
  autosave('windyLines', () => $state.snapshot(app.windyLines), 400);
  autosave('game', () => $state.snapshot(app.game), 0);

  onMount(() => {
    const flush = (): void => {
      if (document.visibilityState === 'hidden') persistAllNow();
    };
    document.addEventListener('visibilitychange', flush);
    window.addEventListener('pagehide', persistAllNow);
    return () => {
      document.removeEventListener('visibilitychange', flush);
      window.removeEventListener('pagehide', persistAllNow);
    };
  });
</script>

{#if !app.ready}
  <div class="loading"><Duvelke size={140} /></div>
{:else if app.screen === 'spelers'}
  <Players />
{:else if app.screen === 'instellingen'}
  <Settings />
{:else if app.screen === 'benodigdheden'}
  <Supplies />
{:else if app.screen === 'windy'}
  <WindyScreen />
{:else if app.screen === 'stemtest'}
  <VoiceTest />
{:else if app.screen === 'nieuw-spel'}
  <NewGame />
{:else if app.screen === 'programma'}
  <Program />
{:else if app.screen === 'paklijst'}
  <Packing />
{:else if app.screen === 'spel' && app.game}
  <GameScreen />
{:else}
  <Home />
{/if}

<Toast />

<style>
  .loading {
    min-height: 100dvh;
    display: grid;
    place-items: center;
  }
</style>
