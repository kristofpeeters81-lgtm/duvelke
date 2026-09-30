<script lang="ts">
  import { untrack } from 'svelte';

  interface Props {
    count?: number;
  }
  let { count = 80 }: Props = $props();

  const colors = ['#ff4fa3', '#29d3c4', '#ffcf3f', '#7b6bff', '#8bd346', '#ff8a3d'];
  // Eén keer bij het tonen: de confetti moet niet opnieuw beginnen als count verandert.
  const pieces = Array.from({ length: untrack(() => count) }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 1.8,
    duration: 2.6 + Math.random() * 2.2,
    color: colors[i % colors.length],
    size: 8 + Math.random() * 10,
    rotate: Math.random() * 360,
    round: Math.random() < 0.3,
  }));
</script>

<div class="confetti" aria-hidden="true">
  {#each pieces as p, i (i)}
    <span
      style="left:{p.left}%; animation-delay:{p.delay}s; animation-duration:{p.duration}s; background:{p.color}; width:{p.size}px; height:{p.size * (p.round ? 1 : 0.45)}px; border-radius:{p.round ? '50%' : '2px'}; --r:{p.rotate}deg"
    ></span>
  {/each}
</div>

<style>
  .confetti {
    position: fixed;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
    z-index: 90;
  }

  span {
    position: absolute;
    top: -30px;
    animation-name: fall;
    animation-timing-function: linear;
    animation-iteration-count: 2;
  }

  @keyframes fall {
    from {
      transform: translateY(0) rotate(var(--r));
    }
    to {
      transform: translateY(110vh) rotate(calc(var(--r) + 720deg));
    }
  }
</style>
