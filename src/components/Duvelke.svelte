<script lang="ts">
  interface Props {
    size?: number;
    /** Laat het duiveltje zachtjes op en neer zweven en knipperen. */
    animated?: boolean;
  }

  let { size = 200, animated = true }: Props = $props();
</script>

<svg
  class="duvelke"
  class:animated
  viewBox="0 0 200 200"
  width={size}
  height={size}
  role="img"
  aria-label="Een ondeugend rood duiveltje"
>
  <defs>
    <radialGradient id="duvelke-body" cx="40%" cy="35%" r="70%">
      <stop offset="0" stop-color="#ff6b6b" />
      <stop offset="0.6" stop-color="#ef3b4a" />
      <stop offset="1" stop-color="#b81d35" />
    </radialGradient>
  </defs>
  <ellipse class="shadow" cx="100" cy="188" rx="52" ry="7" fill="rgba(0,0,0,0.3)" />
  <g class="float">
    <g class="tail">
      <path d="M146 148 C176 158 186 140 178 118" fill="none" stroke="#b81d35" stroke-width="7" stroke-linecap="round" />
      <path d="M170 120 L186 106 L186 128 Z" fill="#b81d35" />
    </g>
    <path d="M62 80 C50 62 46 46 50 30 C62 44 74 56 84 66 Z" fill="#ffcf3f" />
    <path d="M138 80 C150 62 154 46 150 30 C138 44 126 56 116 66 Z" fill="#ffcf3f" />
    <ellipse cx="80" cy="170" rx="14" ry="8" fill="#b81d35" />
    <ellipse cx="120" cy="170" rx="14" ry="8" fill="#b81d35" />
    <ellipse cx="100" cy="115" rx="62" ry="58" fill="url(#duvelke-body)" />
    <ellipse cx="66" cy="132" rx="9" ry="6" fill="#ff9aa8" opacity="0.8" />
    <ellipse cx="134" cy="132" rx="9" ry="6" fill="#ff9aa8" opacity="0.8" />
    <g class="eyes">
      <ellipse cx="80" cy="106" rx="15" ry="18" fill="#fff" />
      <ellipse cx="120" cy="106" rx="15" ry="18" fill="#fff" />
      <g class="pupils">
        <circle cx="86" cy="109" r="8" fill="#2a1454" />
        <circle cx="126" cy="109" r="8" fill="#2a1454" />
        <circle cx="89" cy="106" r="2.6" fill="#fff" />
        <circle cx="129" cy="106" r="2.6" fill="#fff" />
      </g>
    </g>
    <path d="M60 84 L94 92" stroke="#6b0f22" stroke-width="7" stroke-linecap="round" />
    <path d="M140 84 L106 92" stroke="#6b0f22" stroke-width="7" stroke-linecap="round" />
    <path d="M70 132 Q102 164 134 126 Q104 144 70 132 Z" fill="#6b0f22" />
    <path d="M84 137 L89 146 L93 138 Z" fill="#fff" />
  </g>
</svg>

<style>
  .duvelke {
    overflow: visible;
    filter: drop-shadow(0 12px 24px rgba(239, 59, 74, 0.35));
  }

  .animated .float {
    animation: float 3.2s ease-in-out infinite;
  }

  .animated .shadow {
    animation: shadow 3.2s ease-in-out infinite;
    transform-origin: 100px 188px;
  }

  .animated .eyes {
    animation: blink 5s infinite;
    transform-origin: 100px 106px;
  }

  .animated .pupils {
    animation: look 7s ease-in-out infinite;
  }

  .animated .tail {
    animation: wag 1.6s ease-in-out infinite;
    transform-origin: 146px 148px;
  }

  @keyframes float {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-10px);
    }
  }

  @keyframes shadow {
    0%,
    100% {
      transform: scaleX(1);
      opacity: 1;
    }
    50% {
      transform: scaleX(0.82);
      opacity: 0.6;
    }
  }

  @keyframes blink {
    0%,
    46%,
    50%,
    100% {
      transform: scaleY(1);
    }
    48% {
      transform: scaleY(0.1);
    }
  }

  /* Stiekem heen en weer kijken */
  @keyframes look {
    0%,
    30%,
    100% {
      transform: translateX(0);
    }
    40%,
    60% {
      transform: translateX(-11px);
    }
    70% {
      transform: translateX(0);
    }
  }

  @keyframes wag {
    0%,
    100% {
      transform: rotate(0deg);
    }
    50% {
      transform: rotate(-10deg);
    }
  }
</style>
