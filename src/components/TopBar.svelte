<script lang="ts">
  import { goBack } from '../lib/store.svelte';

  interface Props {
    title: string;
    emoji?: string;
  }

  let { title, emoji = '' }: Props = $props();
</script>

<header class="topbar">
  <button class="back" type="button" onclick={goBack} aria-label="Terug">
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
      <path d="M15 5 L8 12 L15 19" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  </button>
  <h1>{#if emoji}<span class="emoji">{emoji}</span>{/if}{title}</h1>
</header>

<style>
  .topbar {
    display: flex;
    align-items: center;
    gap: 14px;
    margin: 4px 0 20px;
    padding-top: env(safe-area-inset-top);
  }

  .back {
    flex: none;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    border: 2px solid var(--line);
    background: rgba(255, 255, 255, 0.08);
    display: grid;
    place-items: center;
    cursor: pointer;
  }

  .back:active {
    transform: scale(0.94);
  }

  h1 {
    font-size: clamp(1.6rem, 5vw, 2.2rem);
  }

  .emoji {
    margin-right: 10px;
  }
</style>
