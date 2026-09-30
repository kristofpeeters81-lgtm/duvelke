<script lang="ts">
  interface Props {
    size?: number;
    talking?: boolean;
    animated?: boolean;
  }

  let { size = 200, talking = false, animated = true }: Props = $props();
  const skin = '#f3c9a8';
  const skinShade = '#e0a987';
</script>

<!-- Buurvrouw: krulspelden, grote bril, parels. Ze weet altijd alles (of denkt dat toch). -->
<svg class="nb" class:animated class:talking viewBox="0 0 240 300" width={size} height={size * 1.25} role="img" aria-label="De buurvrouw">
  <defs>
    <clipPath id="nb-cardigan"><path d="M26 300 C26 248 66 226 120 226 C174 226 214 248 214 300 Z" /></clipPath>
    <pattern id="nb-flowers" width="26" height="26" patternUnits="userSpaceOnUse">
      <circle cx="6" cy="6" r="3" fill="#fff" opacity="0.6" />
      <circle cx="19" cy="18" r="2.5" fill="#ffe28a" opacity="0.8" />
    </pattern>
  </defs>
  <g class="body">
    <!-- Roze vestje met bloemetjes en knopen -->
    <g clip-path="url(#nb-cardigan)">
      <rect x="0" y="224" width="240" height="80" fill="#f58fb5" />
      <rect x="0" y="224" width="240" height="80" fill="url(#nb-flowers)" />
      <path d="M120 226 L120 300" stroke="#d9608f" stroke-width="3" />
      <circle cx="120" cy="262" r="4" fill="#fff" /><circle cx="120" cy="282" r="4" fill="#fff" />
    </g>
    <path d="M96 222 L120 250 L144 222 Z" fill="#fff" />
    <rect x="106" y="186" width="28" height="40" rx="10" fill={skinShade} />
    <!-- Parelketting -->
    <g fill="#fdf6e8" stroke="#d8cbb0" stroke-width="0.8">
      {#each [0, 1, 2, 3, 4, 5, 6, 7, 8] as i (i)}
        <circle cx={100 + i * 5} cy={220 + Math.sin((i / 8) * Math.PI) * 8} r="3.2" />
      {/each}
    </g>

    <g class="head">
      <!-- Pluizig grijs-paars haar -->
      <circle cx="72" cy="112" r="24" fill="#c8b6e2" />
      <circle cx="168" cy="112" r="24" fill="#c8b6e2" />
      <circle cx="120" cy="78" r="46" fill="#c8b6e2" />
      <ellipse cx="120" cy="138" rx="52" ry="58" fill={skin} />
      <!-- Parel-oorbellen -->
      <circle cx="68" cy="152" r="5" fill="#fdf6e8" stroke="#d8cbb0" />
      <circle cx="172" cy="152" r="5" fill="#fdf6e8" stroke="#d8cbb0" />
      <!-- Krulspelden -->
      <g stroke="#00000022" stroke-width="1.5">
        <rect x="74" y="54" width="22" height="16" rx="8" fill="#7fc8f8" transform="rotate(-25 85 62)" />
        <rect x="100" y="40" width="22" height="16" rx="8" fill="#ff9ecb" transform="rotate(-8 111 48)" />
        <rect x="124" y="40" width="22" height="16" rx="8" fill="#ffe28a" transform="rotate(8 135 48)" />
        <rect x="146" y="54" width="22" height="16" rx="8" fill="#7fc8f8" transform="rotate(25 157 62)" />
        <rect x="112" y="64" width="18" height="14" rx="7" fill="#b7e4a0" />
      </g>
      <!-- Wangen -->
      <circle cx="90" cy="162" r="9" fill="#ff8fa3" opacity="0.4" />
      <circle cx="150" cy="162" r="9" fill="#ff8fa3" opacity="0.4" />
      <!-- Nieuwsgierige wenkbrauwen: hoog opgetrokken -->
      <path d="M86 106 Q98 98 110 104" fill="none" stroke="#8d7aa8" stroke-width="4" stroke-linecap="round" />
      <path d="M130 100 Q142 92 154 100" fill="none" stroke="#8d7aa8" stroke-width="4" stroke-linecap="round" />
      <!-- Ogen, loerend naar opzij -->
      <g class="eyes">
        <circle cx="98" cy="130" r="8" fill="#fff" /><circle cx="142" cy="130" r="8" fill="#fff" />
        <g class="pupils"><circle cx="102" cy="131" r="4.5" fill="#3a2a1e" /><circle cx="146" cy="131" r="4.5" fill="#3a2a1e" /></g>
      </g>
      <!-- Grote paarse bril -->
      <g fill="rgba(200, 230, 255, 0.25)" stroke="#6b3fa0" stroke-width="5">
        <circle cx="98" cy="130" r="18" />
        <circle cx="142" cy="130" r="18" />
      </g>
      <path d="M116 128 Q120 124 124 128" fill="none" stroke="#6b3fa0" stroke-width="4" />
      <path d="M80 126 L68 122 M160 126 L172 122" stroke="#6b3fa0" stroke-width="4" stroke-linecap="round" />
      <!-- Neus en getuite lippen -->
      <path d="M120 142 Q127 154 117 157" fill="none" stroke={skinShade} stroke-width="3.5" stroke-linecap="round" />
      <g class="mouth">
        <ellipse cx="120" cy="174" rx="9" ry="6" fill="#c2185b" />
        <ellipse cx="120" cy="174" rx="4" ry="2.5" fill="#7a0e38" />
      </g>
      <!-- Rimpeltjes van het loeren -->
      <path d="M72 134 l-6 -2 M72 140 l-6 2 M168 134 l6 -2 M168 140 l6 2" stroke={skinShade} stroke-width="2" stroke-linecap="round" />
    </g>
  </g>
</svg>

<style>
  .nb {
    overflow: visible;
    filter: drop-shadow(0 12px 24px rgba(0, 0, 0, 0.35));
  }

  .animated .body {
    animation: lean 3.4s ease-in-out infinite;
    transform-origin: 120px 300px;
  }

  .animated .pupils {
    animation: peek 4s ease-in-out infinite;
  }

  .animated .eyes {
    animation: blink 5.2s infinite;
    transform-origin: 120px 130px;
  }

  .talking .mouth {
    animation: talk 0.24s ease-in-out infinite alternate;
    transform-origin: 120px 174px;
  }

  /* Ze leunt nieuwsgierig naar voren, zoals over de haag */
  @keyframes lean {
    0%,
    100% {
      transform: rotate(-2deg);
    }
    50% {
      transform: rotate(3deg) translateY(-3px);
    }
  }

  @keyframes peek {
    0%,
    40%,
    100% {
      transform: translateX(0);
    }
    50%,
    80% {
      transform: translateX(-8px);
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

  @keyframes talk {
    from {
      transform: scale(0.7, 0.6);
    }
    to {
      transform: scale(1.05, 1.2);
    }
  }
</style>
