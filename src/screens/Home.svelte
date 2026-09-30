<script lang="ts">
  import BigButton from '../components/BigButton.svelte';
  import Duvelke from '../components/Duvelke.svelte';
  import { app, go } from '../lib/store.svelte';

  const title = $derived(`Wie is ${app.settings.saboteurName}?`);
</script>

<main class="page home">
  <div class="stars" aria-hidden="true">
    {#each Array.from({ length: 18 }) as _, i (i)}
      <span style="left:{(i * 53) % 100}%; top:{(i * 37) % 60}%; animation-delay:{(i % 6) * 0.5}s"></span>
    {/each}
  </div>

  <div class="hero">
    <Duvelke size={230} />
    <h1 class="title">{title}</h1>
    <p class="tagline">Iemand van jullie speelt vals... maar wie?</p>
  </div>

  <nav class="menu">
    <BigButton variant="primary" size="large" full disabled>
      ▶ Nieuw spel <span class="soon">binnenkort</span>
    </BigButton>
    <div class="grid">
      <BigButton variant="secondary" full onclick={() => go('spelers')}>
        👥 Spelers <span class="count">{app.players.length}</span>
      </BigButton>
      <BigButton variant="secondary" full onclick={() => go('benodigdheden')}>
        🎒 Benodigdheden <span class="count">{app.settings.supplies.length}</span>
      </BigButton>
    </div>
    <BigButton variant="ghost" full onclick={() => go('instellingen')}>⚙️ Instellingen</BigButton>
  </nav>

  <p class="status" class:ok={app.offlineReady}>
    {app.offlineReady ? '✅ Klaar om zonder internet te spelen' : '⏳ Wordt klaargezet voor offline gebruik...'}
  </p>
</main>

<style>
  .home {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    position: relative;
  }

  .stars span {
    position: fixed;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--gold);
    opacity: 0.5;
    animation: twinkle 3s ease-in-out infinite;
    pointer-events: none;
  }

  @keyframes twinkle {
    0%,
    100% {
      opacity: 0.15;
      transform: scale(0.6);
    }
    50% {
      opacity: 0.8;
      transform: scale(1.2);
    }
  }

  .hero {
    text-align: center;
    margin-bottom: 28px;
  }

  .title {
    font-size: clamp(2.4rem, 9vw, 4.2rem);
    margin-top: 6px;
    background: linear-gradient(180deg, #fff 30%, var(--gold));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    filter: drop-shadow(0 4px 0 rgba(209, 42, 124, 0.9));
  }

  .tagline {
    color: var(--text-soft);
    font-size: 1.15rem;
    margin: 10px 0 0;
  }

  .menu {
    display: flex;
    flex-direction: column;
    gap: 18px;
    width: min(560px, 100%);
    margin: 0 auto;
  }

  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  @media (max-width: 480px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }

  .count {
    background: rgba(0, 0, 0, 0.18);
    border-radius: 999px;
    padding: 0 10px;
    font-size: 0.95rem;
  }

  .soon {
    font-size: 0.8rem;
    background: rgba(0, 0, 0, 0.25);
    border-radius: 999px;
    padding: 2px 10px;
  }

  .status {
    text-align: center;
    color: var(--text-dim);
    font-size: 0.9rem;
    margin-top: 28px;
  }

  .status.ok {
    color: var(--turquoise);
  }
</style>
