<script lang="ts">
  import { onMount } from 'svelte';
  import BigButton from '../../components/BigButton.svelte';
  import { sfx } from '../../lib/sfx';

  interface Props {
    timer: { total: number; remainingMs: number; endsAt: number | null };
    ondone: () => void;
  }

  let { timer, ondone }: Props = $props();

  let now = $state(Date.now());
  let rang = false;

  const left = $derived(timer.endsAt !== null ? Math.max(0, timer.endsAt - now) : timer.remainingMs);
  const running = $derived(timer.endsAt !== null);
  const over = $derived(left <= 0);
  const fraction = $derived(timer.total > 0 ? left / (timer.total * 1000) : 0);
  const secondsLeft = $derived(Math.ceil(left / 1000));
  const label = $derived(`${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`);

  let lastSecond = -1;
  onMount(() => {
    // Een lopende timer blijft lopen, ook na herladen: de eindtijd is bewaard.
    const id = setInterval(() => {
      now = Date.now();
      const s = Math.ceil(left / 1000);
      if (running && s !== lastSecond) {
        lastSecond = s;
        if (s > 0 && s <= 5) sfx.urgent();
        else if (s > 0 && s <= 10) sfx.tick();
      }
      if (running && left <= 0 && !rang) {
        rang = true;
        timer.remainingMs = 0;
        timer.endsAt = null;
        sfx.timeUp();
      }
    }, 200);
    return () => clearInterval(id);
  });

  function start(): void {
    rang = false;
    timer.endsAt = Date.now() + timer.remainingMs;
  }

  function pause(): void {
    timer.remainingMs = left;
    timer.endsAt = null;
  }

  function addTime(seconds: number): void {
    rang = false;
    if (timer.endsAt !== null) timer.endsAt += seconds * 1000;
    else timer.remainingMs += seconds * 1000;
    timer.total += seconds;
  }

  const R = 90;
  const C = 2 * Math.PI * R;
</script>

<div class="timer" class:over class:urgent={running && secondsLeft <= 10}>
  <svg viewBox="0 0 220 220" class="ring" aria-hidden="true">
    <circle cx="110" cy="110" r={R} class="track" />
    <circle cx="110" cy="110" r={R} class="progress" stroke-dasharray={C} stroke-dashoffset={C * (1 - fraction)} />
  </svg>
  <div class="center">
    <span class="time" role="timer" aria-live="off">{over ? '⏰' : label}</span>
    <span class="state">{over ? 'Tijd is om!' : running ? 'bezig...' : timer.remainingMs === timer.total * 1000 ? 'klaar om te starten' : 'gepauzeerd'}</span>
  </div>
</div>

<div class="controls">
  {#if over}
    <BigButton variant="gold" size="large" full onclick={ondone}>Naar het resultaat ▶</BigButton>
    <BigButton variant="ghost" onclick={() => addTime(30)}>+30 seconden</BigButton>
  {:else if running}
    <BigButton variant="ghost" onclick={pause}>⏸ Pauze</BigButton>
    <BigButton variant="ghost" onclick={() => addTime(30)}>+30 s</BigButton>
    <BigButton variant="secondary" onclick={ondone}>✓ Al klaar!</BigButton>
  {:else}
    <BigButton variant="gold" size="large" full onclick={start}>▶ {timer.remainingMs === timer.total * 1000 ? 'Start de timer' : 'Verder'}</BigButton>
    <BigButton variant="ghost" onclick={ondone}>Zonder timer naar het resultaat</BigButton>
  {/if}
</div>

<style>
  .timer {
    position: relative;
    width: min(320px, 80vw);
    aspect-ratio: 1;
    margin: 0 auto;
  }

  .ring {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }

  .track {
    fill: none;
    stroke: rgba(255, 255, 255, 0.1);
    stroke-width: 18;
  }

  .progress {
    fill: none;
    stroke: var(--turquoise);
    stroke-width: 18;
    stroke-linecap: round;
    transition: stroke-dashoffset 0.25s linear, stroke 0.3s;
  }

  .urgent .progress {
    stroke: var(--pink);
  }

  .urgent .time {
    animation: pulse 0.5s ease-in-out infinite alternate;
  }

  .center {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .time {
    font-family: var(--font-title);
    font-weight: 700;
    font-size: clamp(3rem, 14vw, 5rem);
    font-variant-numeric: tabular-nums;
  }

  .state {
    color: var(--text-dim);
    font-weight: 800;
  }

  .over .time {
    animation: shake 0.5s ease 3;
  }

  .controls {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    justify-content: center;
    margin-top: 20px;
  }

  @keyframes pulse {
    to {
      transform: scale(1.12);
      color: var(--pink);
    }
  }

  @keyframes shake {
    25% {
      transform: rotate(-12deg);
    }
    75% {
      transform: rotate(12deg);
    }
  }
</style>
