<script lang="ts">
  import { onDestroy } from 'svelte';
  import BigButton from '../../components/BigButton.svelte';
  import { speak, stopAll } from '../../lib/speech';
  import { app } from '../../lib/store.svelte';

  interface Props {
    /** Wat er geroepen wordt, bv. ["Duvel!"]. */
    items: string[];
    /** Op het timerscherm: roepen zolang de timer loopt. Zonder timer (undefined): met een start/stop-knop. */
    running?: boolean;
  }

  let { items, running }: Props = $props();

  let on = $state(false);
  const active = $derived(running ?? on);
  let last = $state<string | null>(null);
  let flash = $state(0);

  // Op een onvoorspelbaar moment (6 tot 15 s) iets roepen, zoals het hulpje het zou doen.
  $effect(() => {
    if (!active || items.length === 0) return;
    let timer: ReturnType<typeof setTimeout>;
    const plan = (): void => {
      timer = setTimeout(
        () => {
          const word = items[Math.floor(Math.random() * items.length)] ?? '';
          last = word;
          flash += 1;
          void speak(word, $state.snapshot(app.settings.voice));
          plan();
        },
        6000 + Math.random() * 9000,
      );
    };
    plan();
    return () => clearTimeout(timer);
  });

  onDestroy(stopAll);
</script>

<div class="caller">
  <p class="hint center">{app.settings.hostName} roept af en toe, op een onverwacht moment: <strong>{[...new Set(items)].join(' / ')}</strong></p>
  {#if last}
    {#key flash}<p class="call">{last}</p>{/key}
  {/if}
  {#if running === undefined}
    {#if on}
      <BigButton variant="ghost" full onclick={() => (on = false)}>⏸ Stop met roepen</BigButton>
    {:else}
      <BigButton variant="secondary" full onclick={() => (on = true)}>▶ Begin met roepen</BigButton>
    {/if}
  {:else if !running}
    <p class="hint center">Start de timer: dan begint {app.settings.hostName} te roepen.</p>
  {/if}
</div>

<style>
  .caller {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .center {
    text-align: center;
    margin: 0;
  }

  .call {
    margin: 0;
    text-align: center;
    font-family: var(--font-title);
    font-size: clamp(2rem, 8vw, 3rem);
    color: var(--gold);
    animation: pop 0.5s cubic-bezier(0.3, 1.6, 0.5, 1);
  }

  @keyframes pop {
    from {
      transform: scale(0.4);
      opacity: 0;
    }
  }
</style>
