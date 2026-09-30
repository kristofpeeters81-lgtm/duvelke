<script lang="ts">
  import { onMount } from 'svelte';
  import BigButton from '../../components/BigButton.svelte';
  import { getPhotos, type Photo } from '../../lib/db';
  import { showToast } from '../../lib/store.svelte';

  interface Props {
    gameId: string;
  }

  let { gameId }: Props = $props();

  let photos = $state<Photo[]>([]);
  let urls = $state<string[]>([]);
  let index = $state(0);
  let playing = $state(true);
  let loaded = $state(false);

  onMount(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    void getPhotos(gameId).then((p) => {
      photos = p;
      urls = p.map((x) => URL.createObjectURL(x.image));
      loaded = true;
      timer = setInterval(() => {
        if (playing && photos.length > 1) index = (index + 1) % photos.length;
      }, 4000);
    });
    return () => {
      clearInterval(timer);
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  });

  function fileName(p: Photo, i: number): string {
    const date = new Date(p.createdAt).toISOString().slice(0, 10);
    return `duvelke-${date}-${String(i + 1).padStart(2, '0')}.jpg`;
  }

  /** Delen naar de galerij (Android: "Opslaan in Foto's"), anders gewoon downloaden. */
  async function saveAll(): Promise<void> {
    const files = photos.map((p, i) => new File([p.image], fileName(p, i), { type: 'image/jpeg' }));
    try {
      if (navigator.canShare?.({ files })) {
        await navigator.share({ files, title: "Wie is 't Duvelke?" });
        return;
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
    }
    files.forEach((file) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(file);
      a.download = file.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    });
    showToast(`${files.length} foto's gedownload.`);
  }
</script>

{#if !loaded}
  <p class="hint center">Foto's laden...</p>
{:else if photos.length === 0}
  <p class="hint center">Er zijn geen bewijsfoto's genomen in dit spel. Volgende keer: tik op 📸 tijdens de opdrachten!</p>
{:else}
  <div class="show">
    {#key index}
      <figure>
        <img src={urls[index]} alt={photos[index]?.caption} />
        <figcaption>{photos[index]?.caption} · {index + 1}/{photos.length}</figcaption>
      </figure>
    {/key}
    <div class="controls">
      <button type="button" aria-label="Vorige" onclick={() => (index = (index - 1 + photos.length) % photos.length)}>◀</button>
      <button type="button" aria-label={playing ? 'Pauze' : 'Afspelen'} onclick={() => (playing = !playing)}>{playing ? '⏸' : '▶'}</button>
      <button type="button" aria-label="Volgende" onclick={() => (index = (index + 1) % photos.length)}>▶</button>
    </div>
  </div>
  <BigButton variant="secondary" full onclick={saveAll}>💾 Bewaar alle foto's in de galerij</BigButton>
{/if}

<style>
  .center {
    text-align: center;
  }

  .show {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  figure {
    margin: 0;
    border-radius: var(--radius);
    overflow: hidden;
    background: #000;
    animation: fade 0.8s ease;
    box-shadow: var(--shadow);
  }

  img {
    display: block;
    width: 100%;
    max-height: 60dvh;
    object-fit: contain;
    animation: kenburns 4s ease-out;
  }

  figcaption {
    padding: 10px 14px;
    font-weight: 800;
    background: var(--bg-raised);
  }

  .controls {
    display: flex;
    justify-content: center;
    gap: 16px;
  }

  .controls button {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    border: 2px solid var(--line);
    background: rgba(255, 255, 255, 0.08);
    font-size: 1.3rem;
    cursor: pointer;
  }

  @keyframes fade {
    from {
      opacity: 0;
    }
  }

  @keyframes kenburns {
    from {
      transform: scale(1.08);
    }
  }
</style>
