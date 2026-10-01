<script lang="ts">
  import { app } from '../lib/store.svelte';

  interface Props {
    size?: number;
    talking?: boolean;
    animated?: boolean;
  }

  let { size = 200, talking = false, animated = true }: Props = $props();
  const card = '#c99a5b';
  const cardDark = '#a87a40';
  const tape = '#e8dcb5';
</script>

<!-- Kenzo zijn machien: een kartonnen doos met plakband, flessendopjes als ogen en een lichtjesmond. -->
<svg class="mc" class:animated class:talking viewBox="0 0 240 300" width={size} height={size * 1.25} role="img" aria-label="{app.settings.sonName} zijn machien">
  <g class="body">
    <!-- Antenne met lampje -->
    <path d="M120 58 L120 22" stroke="#555" stroke-width="5" stroke-linecap="round" />
    <path d="M120 40 Q132 34 128 26" stroke="#555" stroke-width="3" fill="none" />
    <circle class="lamp" cx="120" cy="18" r="10" fill="#ff4f5e" stroke="#7a1f28" stroke-width="3" />

    <!-- Hoofd: doos -->
    <rect x="44" y="56" width="152" height="112" rx="8" fill={card} stroke={cardDark} stroke-width="4" />
    <path d="M44 74 L196 74" stroke={cardDark} stroke-width="2" opacity="0.6" />
    <rect x="58" y="50" width="34" height="14" rx="2" fill={tape} opacity="0.9" transform="rotate(-8 75 57)" />
    <!-- Ogen: flessendopjes -->
    <circle cx="88" cy="106" r="20" fill="#3d7bd9" stroke="#24508f" stroke-width="4" />
    <circle cx="152" cy="106" r="20" fill="#3d7bd9" stroke="#24508f" stroke-width="4" />
    <circle class="pupil" cx="91" cy="104" r="7" fill="#fff" />
    <circle class="pupil" cx="155" cy="104" r="7" fill="#fff" />
    <!-- Mond: lichtjes -->
    <rect x="76" y="134" width="88" height="22" rx="6" fill="#222" />
    {#each [0, 1, 2, 3, 4] as i (i)}
      <rect class="led" style="animation-delay: {i * 0.07}s" x={82 + i * 16} y="139" width="12" height="12" rx="2" fill="#7dff8a" />
    {/each}
    <!-- Oren: bouten -->
    <circle cx="40" cy="112" r="9" fill="#9aa3ad" stroke="#5d6670" stroke-width="3" />
    <circle cx="200" cy="112" r="9" fill="#9aa3ad" stroke="#5d6670" stroke-width="3" />

    <!-- Nek -->
    <rect x="104" y="168" width="32" height="14" fill="#9aa3ad" stroke="#5d6670" stroke-width="3" />

    <!-- Lijf: grotere doos met luidspreker en knoppen -->
    <rect x="30" y="180" width="180" height="116" rx="10" fill={card} stroke={cardDark} stroke-width="4" />
    <rect x="150" y="186" width="44" height="14" rx="2" fill={tape} opacity="0.9" transform="rotate(10 172 193)" />
    <circle cx="86" cy="236" r="30" fill="#4a4a4a" stroke="#2c2c2c" stroke-width="4" />
    {#each [-14, 0, 14] as dx (dx)}
      {#each [-14, 0, 14] as dy (dy)}
        <circle cx={86 + dx} cy={236 + dy} r="3.5" fill="#1d1d1d" />
      {/each}
    {/each}
    <circle cx="160" cy="222" r="9" fill="#ffcf3f" stroke="#a17d14" stroke-width="3" />
    <circle cx="186" cy="222" r="9" fill="#ff7ab0" stroke="#a83a69" stroke-width="3" />
    <rect x="146" y="244" width="52" height="10" rx="5" fill="#5d6670" />
    <rect class="slider" x="152" y="241" width="12" height="16" rx="3" fill="#ddd" stroke="#5d6670" stroke-width="2" />
    <!-- Handgeschreven sticker -->
    <text x="120" y="286" text-anchor="middle" font-family="'Comic Sans MS', 'Comic Neue', cursive" font-size="17" font-weight="700" fill="#5a3410">{app.settings.sonName.toUpperCase()}</text>
  </g>
</svg>

<style>
  .mc {
    display: block;
    overflow: visible;
  }

  .animated .body {
    animation: bob 2.6s ease-in-out infinite;
    transform-origin: 120px 300px;
  }

  .lamp {
    animation: blink 1.6s steps(1) infinite;
  }

  .led {
    opacity: 0.25;
  }

  .talking .led {
    animation: talk 0.32s ease-in-out infinite alternate;
  }

  .talking .lamp {
    animation-duration: 0.4s;
  }

  .talking .slider {
    animation: slide 0.9s ease-in-out infinite alternate;
  }

  @keyframes bob {
    50% {
      transform: translateY(-4px) rotate(-1deg);
    }
  }

  @keyframes blink {
    50% {
      fill: #7a1f28;
    }
  }

  @keyframes talk {
    from {
      opacity: 0.25;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes slide {
    to {
      transform: translateX(26px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .animated .body,
    .lamp,
    .talking .led,
    .talking .slider {
      animation: none;
    }

    .talking .led {
      opacity: 1;
    }
  }
</style>
