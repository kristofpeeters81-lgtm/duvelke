<script lang="ts">
  import { onMount } from 'svelte';
  import { remainingMinutes, type Game } from '../lib/game';

  interface Props {
    game: Game;
    /** De geplande eindtijd hier ook kunnen aanpassen. */
    editable?: boolean;
  }

  let { game, editable = false }: Props = $props();

  let now = $state(Date.now());
  onMount(() => {
    const id = setInterval(() => (now = Date.now()), 30000);
    return () => clearInterval(id);
  });

  const left = $derived(remainingMinutes(game));
  const eta = $derived(new Date(now + left * 60000));
  const etaText = $derived(eta.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' }));
  const end = $derived(game.settings.endTime);
  /** Hoeveel minuten later dan gepland (negatief = op tijd). */
  const late = $derived.by(() => {
    if (!end) return 0;
    const [h, m] = end.split(':').map(Number);
    return Math.round(eta.getHours() * 60 + eta.getMinutes() - ((h ?? 0) * 60 + (m ?? 0)));
  });
</script>

<div class="time" class:late={late > 0}>
  <p class="main">⏱️ Nog ±{left} min · klaar rond <strong>{etaText}</strong></p>
  {#if end}
    <p class="plan">{late > 0 ? `⚠️ ±${late} min later dan gepland (${end})` : `✓ Op tijd voor ${end}`}</p>
    {#if late > 0}<p class="tip">{editable ? "Sla een latere opdracht over via 📋 Programma bekijken → ⏭." : "Sla hieronder een latere opdracht over met ⏭."}</p>{/if}
  {/if}
  {#if editable}
    <label class="edit">
      Geplande eindtijd
      <input class="text-input" type="time" bind:value={game.settings.endTime} />
    </label>
  {/if}
</div>

<style>
  .time {
    padding: 10px 14px;
    border-radius: var(--radius);
    background: var(--bg-raised);
    border: 2px solid var(--line);
    display: grid;
    gap: 4px;
    font-size: 1rem;
    color: var(--text);
    text-align: left;
  }

  .time.late {
    border-color: var(--gold);
  }

  p {
    margin: 0;
  }

  .main {
    font-weight: 800;
  }

  .plan {
    font-weight: 700;
    color: var(--text-dim);
  }

  .late .plan {
    color: var(--gold);
  }

  .tip {
    font-size: 0.9rem;
  }

  .edit {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 700;
    margin-top: 6px;
  }

  .edit input {
    max-width: 140px;
  }
</style>
