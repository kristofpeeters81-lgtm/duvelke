<script lang="ts">
  import { onDestroy } from 'svelte';
  import { speak, stopAll } from '../lib/speech';
  import { app, lineTemplate } from '../lib/store.svelte';
  import Windy from './Windy.svelte';

  interface Props {
    /** Wat Windy zegt; bij een nieuwe waarde verschijnt het ballonnetje opnieuw. */
    line: { id: string; text: string; key: number } | null;
  }

  let { line }: Props = $props();

  let visible = $state(false);
  let talking = $state(false);
  let hideTimer: ReturnType<typeof setTimeout> | undefined;
  let shown = -1;

  $effect(() => {
    if (!line || line.key === shown) return;
    shown = line.key;
    const current = line;
    visible = true;
    clearTimeout(hideTimer);
    void (async () => {
      await speak(current.text, $state.snapshot(app.settings.voice), {
        lineId: current.id,
        template: lineTemplate(current.id),
        onStart: () => (talking = true),
      });
      talking = false;
      hideTimer = setTimeout(() => (visible = false), 2500);
    })();
  });

  onDestroy(() => {
    clearTimeout(hideTimer);
    if (visible) stopAll();
  });
</script>

{#if visible && line}
  <button type="button" class="popup" aria-live="polite" onclick={() => ((visible = false), stopAll())}>
    <span class="who"><Windy mood="stiekem" size={70} {talking} animated={false} /></span>
    <span class="bubble">{line.text}</span>
  </button>
{/if}

<style>
  .popup {
    position: fixed;
    left: 50%;
    bottom: calc(18px + env(safe-area-inset-bottom));
    transform: translateX(-50%);
    width: min(640px, calc(100% - 24px));
    display: flex;
    align-items: flex-end;
    gap: 8px;
    padding: 0;
    border: none;
    background: none;
    z-index: 80;
    text-align: left;
    cursor: pointer;
    animation: slide 0.45s cubic-bezier(0.3, 1.5, 0.5, 1);
  }

  .who {
    flex: none;
    width: 70px;
  }

  .bubble {
    flex: 1;
    padding: 14px 18px;
    border-radius: 22px 22px 22px 6px;
    background: #fff;
    color: #2a1454;
    font-family: var(--font-title);
    font-size: 1.15rem;
    line-height: 1.3;
    box-shadow: var(--shadow);
  }

  @keyframes slide {
    from {
      transform: translate(-50%, 120%);
    }
  }
</style>
