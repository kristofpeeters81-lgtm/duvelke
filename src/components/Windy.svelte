<script lang="ts" module>
  export type WindyMood = 'blij' | 'geschokt' | 'stiekem' | 'boos';
</script>

<script lang="ts">
  interface Props {
    mood?: WindyMood;
    size?: number;
    /** Mond beweegt, alsof ze praat. */
    talking?: boolean;
    animated?: boolean;
  }

  let { mood = 'blij', size = 220, talking = false, animated = true }: Props = $props();

  const skin = '#f6cba8';
  const skinShade = '#e8ae88';

  // Wenkbrauwen per stemming: [links, rechts]
  const brows: Record<WindyMood, [string, string]> = {
    blij: ['M86 116 Q98 108 110 114', 'M130 114 Q142 108 154 116'],
    geschokt: ['M84 106 Q98 94 110 104', 'M130 104 Q142 94 156 106'],
    stiekem: ['M86 118 Q98 116 110 120', 'M130 110 Q142 100 154 108'],
    boos: ['M86 112 Q98 116 110 124', 'M130 124 Q142 116 154 112'],
  };

  // Pupillen: verschuiving (stiekem kijkt opzij)
  const look = $derived(mood === 'stiekem' ? 6 : 0);
</script>

<svg
  class="windy"
  class:animated
  class:talking
  viewBox="0 0 240 300"
  width={size}
  height={size * 1.25}
  role="img"
  aria-label="Windy, de presentatrice"
>
  <defs>
    <clipPath id="windy-sweater">
      <path d="M22 300 C22 246 64 222 120 222 C176 222 218 246 218 300 Z" />
    </clipPath>
    <pattern id="windy-knit" width="8" height="7" patternUnits="userSpaceOnUse">
      <path d="M0 0 L4 5 L8 0" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="1.4" />
    </pattern>
    <linearGradient id="windy-wig" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2b2b33" />
      <stop offset="1" stop-color="#101014" />
    </linearGradient>
  </defs>

  <g class="body">
    <!-- Gestreepte gebreide trui -->
    <g clip-path="url(#windy-sweater)">
      <rect x="0" y="220" width="240" height="80" fill="#5cb3d4" />
      <rect x="0" y="232" width="240" height="7" fill="#2e7ea6" />
      <rect x="0" y="243" width="240" height="6" fill="#9a7552" />
      <rect x="0" y="253" width="240" height="8" fill="#7fd0bf" />
      <rect x="0" y="265" width="240" height="6" fill="#2e7ea6" />
      <rect x="0" y="275" width="240" height="7" fill="#b393d9" />
      <rect x="0" y="286" width="240" height="6" fill="#9a7552" />
      <rect x="0" y="220" width="240" height="80" fill="url(#windy-knit)" />
    </g>
    <!-- Nek en rolkraag -->
    <rect x="104" y="178" width="32" height="40" rx="10" fill={skinShade} />
    <rect x="86" y="204" width="68" height="26" rx="13" fill="#3f93bd" />
    <path d="M92 213 H148 M92 221 H148" stroke="#2e7ea6" stroke-width="3" />

    <g class="head">
      <!-- Oren + oorbellen -->
      <ellipse cx="64" cy="140" rx="9" ry="13" fill={skinShade} />
      <ellipse cx="176" cy="140" rx="9" ry="13" fill={skinShade} />
      <circle cx="64" cy="158" r="5" fill="none" stroke="#ffcf3f" stroke-width="2.5" />
      <circle cx="176" cy="158" r="5" fill="none" stroke="#ffcf3f" stroke-width="2.5" />

      <!-- Gezicht -->
      <ellipse cx="120" cy="134" rx="56" ry="62" fill={skin} />

      <!-- Wangen -->
      <circle cx="88" cy="160" r="10" fill="#ff8fa3" opacity="0.45" />
      <circle cx="152" cy="160" r="10" fill="#ff8fa3" opacity="0.45" />

      <!-- Ogen -->
      <g class="eyes">
        <ellipse cx="98" cy="136" rx="12" ry={mood === 'geschokt' ? 15 : 12} fill="#fff" />
        <ellipse cx="142" cy="136" rx="12" ry={mood === 'geschokt' ? 15 : 12} fill="#fff" />
        <circle cx={98 + look} cy="137" r={mood === 'geschokt' ? 5 : 6} fill="#3a2a1e" />
        <circle cx={142 + look} cy="137" r={mood === 'geschokt' ? 5 : 6} fill="#3a2a1e" />
        <circle cx={100 + look} cy="134" r="2" fill="#fff" />
        <circle cx={144 + look} cy="134" r="2" fill="#fff" />
        {#if mood === 'stiekem'}
          <!-- Halfgesloten oogleden -->
          <path d="M85 132 Q98 124 111 132 L111 126 Q98 118 85 126 Z" fill={skin} />
          <path d="M129 132 Q142 124 155 132 L155 126 Q142 118 129 126 Z" fill={skin} />
        {/if}
        <!-- Wimpers -->
        <path d="M86 126 L82 121 M92 123 L90 117 M154 126 L158 121 M148 123 L150 117" stroke="#1b1b1b" stroke-width="2.2" stroke-linecap="round" />
      </g>

      <!-- Neus -->
      <path d="M121 142 Q129 156 118 158" fill="none" stroke={skinShade} stroke-width="3.5" stroke-linecap="round" />

      <!-- Mond -->
      <g class="mouth">
        {#if mood === 'blij'}
          <path d="M98 168 Q120 194 142 168 Q120 176 98 168 Z" fill="#9c1f38" />
          <path d="M104 170 Q120 176 136 170 L134 175 Q120 179 106 175 Z" fill="#fff" />
          <path d="M98 168 Q120 176 142 168" fill="none" stroke="#d6334f" stroke-width="3" stroke-linecap="round" />
        {:else if mood === 'geschokt'}
          <ellipse cx="120" cy="176" rx="11" ry="14" fill="#7a1024" stroke="#d6334f" stroke-width="3.5" />
        {:else if mood === 'stiekem'}
          <path d="M102 176 Q124 182 140 166" fill="none" stroke="#d6334f" stroke-width="5" stroke-linecap="round" />
        {:else}
          <path d="M102 180 Q120 166 138 180" fill="none" stroke="#d6334f" stroke-width="5" stroke-linecap="round" />
        {/if}
      </g>

      <!-- De pruik: zwarte bob, net niet recht -->
      <g class="wig"><g transform="rotate(-6 120 110)">
        <path
          d="M56 152 C44 92 70 50 120 48 C170 50 196 92 184 152 C186 172 178 184 164 186 L164 112 C150 96 90 96 76 112 L76 186 C62 184 54 172 56 152 Z"
          fill="url(#windy-wig)"
        />
        <!-- Pony: kaarsrecht geknipt -->
        <path d="M74 112 C78 88 96 78 120 78 C144 78 162 88 166 112 C150 102 90 102 74 112 Z" fill="#17171c" />
        <path d="M84 106 L86 92 M100 102 L100 86 M116 100 L116 82 M132 101 L133 84 M148 104 L150 90" stroke="#2f2f38" stroke-width="2" stroke-linecap="round" />
        <!-- Glans -->
        <path d="M78 84 C92 62 118 56 140 60" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="6" stroke-linecap="round" />
      </g></g>

      <!-- Wenkbrauwen over de pony, zoals in een cartoon: zo blijft haar gezicht expressief -->
      {#each brows[mood] as d (d)}
        <path {d} fill="none" stroke={skin} stroke-width="10" stroke-linecap="round" />
        <path {d} fill="none" stroke="#1b1b1b" stroke-width="5" stroke-linecap="round" />
      {/each}

      <!-- Echt blond haar dat onder de scheve pruik uitpiept -->
      <g class="real-hair" fill="#eccb6a" stroke="#c99f3a" stroke-width="1.2">
        <path d="M158 116 C164 124 166 132 161 142 C168 136 172 126 168 114 Z" />
        <path d="M150 118 C152 124 152 128 149 133 C155 129 157 123 156 116 Z" />
        <path d="M166 178 C168 188 176 194 184 190 C178 187 176 182 177 175 Z" />
        <path d="M70 184 C70 192 76 198 84 198 C80 194 79 190 80 185 Z" />
      </g>
    </g>
  </g>
</svg>

<style>
  .windy {
    overflow: visible;
    filter: drop-shadow(0 12px 24px rgba(0, 0, 0, 0.35));
  }

  .animated .body {
    animation: sway 4s ease-in-out infinite;
    transform-origin: 120px 300px;
  }

  .animated .eyes {
    animation: blink 4.6s infinite;
    transform-origin: 120px 136px;
  }

  .animated .wig {
    animation: wiggle 6s ease-in-out infinite;
  }

  .talking .mouth {
    animation: talk 0.26s ease-in-out infinite alternate;
    transform-origin: 120px 172px;
  }

  @keyframes sway {
    0%,
    100% {
      transform: rotate(-1.5deg);
    }
    50% {
      transform: rotate(1.5deg);
    }
  }

  @keyframes blink {
    0%,
    47%,
    51%,
    100% {
      transform: scaleY(1);
    }
    49% {
      transform: scaleY(0.1);
    }
  }

  /* De pruik schuift af en toe een beetje: ze zit nooit goed */
  @keyframes wiggle {
    0%,
    80%,
    100% {
      translate: 0 0;
    }
    85% {
      translate: 3px -2px;
    }
    90% {
      translate: -1px 1px;
    }
  }

  @keyframes talk {
    from {
      transform: scaleY(0.55);
    }
    to {
      transform: scaleY(1.1);
    }
  }
</style>
