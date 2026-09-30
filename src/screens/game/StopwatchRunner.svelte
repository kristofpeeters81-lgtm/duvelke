<script lang="ts">
  import BigButton from '../../components/BigButton.svelte';
  import { sfx } from '../../lib/sfx';

  interface Props {
    stopwatch: { startedAt: number | null; elapsedMs: number | null };
    target: number;
    margin: number;
    ondone: (elapsedSeconds: number) => void;
  }

  let { stopwatch, target, margin, ondone }: Props = $props();

  const elapsed = $derived(stopwatch.elapsedMs !== null ? stopwatch.elapsedMs / 1000 : null);

  function start(): void {
    sfx.reveal();
    stopwatch.startedAt = Date.now();
    stopwatch.elapsedMs = null;
  }

  function stop(): void {
    if (stopwatch.startedAt === null) return;
    stopwatch.elapsedMs = Date.now() - stopwatch.startedAt;
    stopwatch.startedAt = null;
    sfx.timeUp();
  }
</script>

<div class="sw">
  {#if elapsed !== null}
    <p class="result">{elapsed.toFixed(1)} s</p>
    <p class="verdict">
      Doel: {target} seconden.
      {Math.abs(elapsed - target) <= margin ? '🎯 Binnen de marge!' : Math.abs(elapsed - target) <= margin * 2 ? '😅 Net ernaast, de helft van de schat.' : '😬 Te ver ernaast.'}
    </p>
    <BigButton variant="gold" size="large" full onclick={() => ondone(elapsed)}>Naar de schat ▶</BigButton>
    <BigButton variant="ghost" onclick={start}>Opnieuw proberen</BigButton>
  {:else if stopwatch.startedAt !== null}
    <p class="big">🙈</p>
    <p class="hint center">De klok loopt... Ogen dicht en niet luidop tellen! Roepen ze STOP? Tik dan op de knop.</p>
    <button type="button" class="stop" onclick={stop}>STOP</button>
  {:else}
    <p class="big">⏱️</p>
    <p class="hint center">Iedereen ogen dicht? Tik op start. De tijd is niet te zien.</p>
    <BigButton variant="gold" size="large" full onclick={start}>▶ Start de klok</BigButton>
  {/if}
</div>

<style>
  .sw {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    width: min(560px, 100%);
    margin: 0 auto;
  }

  .big {
    font-size: 5rem;
    margin: 0;
  }

  .center {
    text-align: center;
  }

  .stop {
    width: 220px;
    height: 220px;
    border-radius: 50%;
    border: 8px solid #fff;
    background: var(--red);
    color: #fff;
    font-family: var(--font-title);
    font-weight: 700;
    font-size: 3rem;
    cursor: pointer;
    box-shadow: 0 10px 0 #9c1d2a, var(--shadow);
  }

  .stop:active {
    transform: translateY(6px);
    box-shadow: 0 4px 0 #9c1d2a;
  }

  .result {
    font-family: var(--font-title);
    font-weight: 700;
    font-size: 4rem;
    margin: 0;
    color: var(--gold);
  }

  .verdict {
    font-weight: 800;
    text-align: center;
    margin: 0;
  }
</style>
