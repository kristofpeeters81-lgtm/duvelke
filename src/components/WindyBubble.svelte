<script lang="ts">
  import type { Snippet } from 'svelte';
  import { app, lineTemplate } from '../lib/store.svelte';
  import { speak, stopAll } from '../lib/speech';
  import Neighbour from './Neighbour.svelte';
  import Windy, { type WindyMood } from './Windy.svelte';

  interface Props {
    text: string;
    /** Id van de uitspraak, zodat een eigen opname afgespeeld kan worden. */
    lineId?: string;
    /** Wie er genoemd wordt (voor ingesproken namen). */
    playerId?: string;
    mood?: WindyMood;
    /** Wie er spreekt: Windy of de buurvrouw (met haar eigen stem). */
    speaker?: 'windy' | 'buurvrouw';
    size?: number;
    /** Knoppen of inhoud onder de ballon. */
    children?: Snippet;
  }

  let { text, lineId, playerId, mood = 'blij', speaker = 'windy', size = 200, children }: Props = $props();

  let talking = $state(false);
  let runId = 0;

  async function say(line: string): Promise<void> {
    const id = ++runId;
    talking = false;
    // De mond beweegt pas als het geluid echt start (de AI-stem heeft even denktijd nodig).
    await speak(line, $state.snapshot(app.settings.voice), {
      lineId,
      playerId,
      template: lineId ? lineTemplate(lineId) : undefined,
      voice: speaker === 'buurvrouw' ? { piperVoice: app.settings.voice.neighbourVoice, piperPitch: app.settings.voice.neighbourPitch } : undefined,
      onStart: () => id === runId && (talking = true),
    });
    if (id === runId) talking = false;
  }

  $effect(() => {
    void say(text);
    return () => {
      runId++;
      stopAll();
    };
  });
</script>

<div class="stage">
  <div class="host">
    {#if speaker === 'buurvrouw'}<Neighbour {size} {talking} />{:else}<Windy {mood} {size} {talking} />{/if}
  </div>
  <div class="bubble" class:nb={speaker === 'buurvrouw'} aria-live="polite">
    <p>{text}</p>
    {#if app.settings.voice.enabled}
      <button type="button" class="replay" aria-label="Nog eens voorlezen" onclick={() => say(text)}>🔊</button>
    {/if}
  </div>
  {#if children}<div class="below">{@render children()}</div>{/if}
</div>

<style>
  .stage {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
  }

  .host {
    animation: enter 0.6s cubic-bezier(0.3, 1.5, 0.5, 1);
  }

  .bubble {
    position: relative;
    width: min(620px, 100%);
    background: #fff;
    color: #2a1454;
    border-radius: 26px;
    padding: 20px 56px 20px 24px;
    box-shadow: 0 8px 0 rgba(0, 0, 0, 0.18), var(--shadow);
    animation: pop 0.35s cubic-bezier(0.3, 1.4, 0.6, 1);
  }

  .bubble.nb {
    background: #ffe3ef;
  }

  .bubble.nb::before {
    border-bottom-color: #ffe3ef;
  }

  .bubble::before {
    content: '';
    position: absolute;
    top: -16px;
    left: 50%;
    transform: translateX(-50%);
    border: 16px solid transparent;
    border-top: 0;
    border-bottom-color: #fff;
  }

  p {
    margin: 0;
    font-family: var(--font-title);
    font-weight: 500;
    font-size: clamp(1.15rem, 3.4vw, 1.5rem);
    line-height: 1.35;
  }

  .replay {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: none;
    background: #efe6ff;
    font-size: 1.3rem;
    cursor: pointer;
  }

  .below {
    margin-top: 18px;
    width: min(620px, 100%);
  }

  @keyframes enter {
    from {
      transform: translateY(40px) scale(0.8);
      opacity: 0;
    }
  }

  @keyframes pop {
    from {
      transform: scale(0.85);
      opacity: 0;
    }
  }
</style>
