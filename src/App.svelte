<script lang="ts">
  import { onMount } from 'svelte';
  import Duvelke from './components/Duvelke.svelte';
  import Toast from './components/Toast.svelte';
  import { requestPersistentStorage } from './lib/db';
  import { app, initNavigation, loadAll, persistSettings } from './lib/store.svelte';
  import Home from './screens/Home.svelte';
  import Players from './screens/Players.svelte';
  import Settings from './screens/Settings.svelte';
  import Supplies from './screens/Supplies.svelte';

  onMount(() => {
    initNavigation();
    void loadAll();
    void requestPersistentStorage();
  });

  // Instellingen automatisch bewaren, kort nadat er iets verandert.
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  $effect(() => {
    const snapshot = $state.snapshot(app.settings);
    if (!app.ready || app.loadError) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => void persistSettings(snapshot), 400);
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
