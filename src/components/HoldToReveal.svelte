<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    /** Wordt aangeroepen zodra de inhoud lang genoeg zichtbaar was om te lezen. */
    onseen?: () => void;
    minVisibleMs?: number;
    label?: string;
    children: Snippet;
  }

  let { onseen, minVisibleMs = 1500, label = 'Hou ingedrukt om te bekijken', children }: Props = $props();

  let holding = $state(false);
  let seen = false;
  let visibleSince = 0;
  let visibleTotal = 0;

  function start(e: PointerEvent): void {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    holding = true;
    visibleSince = performance.now();
    navigator.vibrate?.(30);
  }

  function stop(): void {
    if (!holding) return;
    holding = false;
    visibleTotal += performance.now() - visibleSince;
    if (!seen && visibleTotal >= minVisibleMs) {
      seen = true;
      onseen?.();
    }
  }
</script>

<div
  class="hold"
  class:holding
  role="button"
  tabindex="0"
  aria-label={label}
  onpointerdown={start}
  onpointerup={stop}
  onpointercancel={stop}
  onlostpointercapture={stop}
  oncontextmenu={(e) => e.preventDefault()}
  onkeydown={(e) => {
    if ((e.key === ' ' || e.key === 'Enter') && !holding) {
      holding = true;
      visibleSince = performance.now();
    }
  }}
  onkeyup={stop}
>
  {#if holding}
    <div class="content">{@render children()}</div>
  {:else}
    <div class="cover">
      <span class="stamp">TOP SECRET</span>
      <span class="finger" aria-hidden="true">👆</span>
      <span class="text">{label}</span>
    </div>
  {/if}
</div>

<style>
  .hold {
    position: relative;
    width: 100%;
    min-height: 360px;
    border-radius: var(--radius);
    touch-action: none;
    -webkit-user-select: none;
    user-select: none;
    -webkit-touch-callout: none;
    cursor: pointer;
    outline: none;
  }

  .cover {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 14px;
    border-radius: var(--radius);
    background:
      repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.04) 0 14px, transparent 14px 28px),
      linear-gradient(160deg, #c89b5a, #a8793d);
    border: 4px solid #7a5222;
    box-shadow: var(--shadow);
    color: #3a2508;
  }

  .stamp {
    font-family: var(--font-title);
    font-weight: 700;
    font-size: clamp(1.8rem, 6vw, 2.6rem);
    color: #c62828;
    border: 5px solid #c62828;
    border-radius: 10px;
    padding: 4px 16px;
    transform: rotate(-8deg);
    opacity: 0.85;
  }

  .finger {
    font-size: 3rem;
    animation: press 1.4s ease-in-out infinite;
  }

  .text {
    font-weight: 800;
    font-size: 1.15rem;
  }

  /* De inhoud bepaalt de hoogte: een lange lijst wordt helemaal getoond (scrollen kan niet terwijl je vasthoudt). */
  .content {
    position: relative;
    min-height: inherit;
    display: flex;
    flex-direction: column;
    animation: open 0.18s ease-out;
  }

  .content > :global(*) {
    flex: 1;
  }

  @keyframes press {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(10px) scale(0.92);
    }
  }

  @keyframes open {
    from {
      opacity: 0;
      transform: scale(0.97);
    }
  }
</style>
