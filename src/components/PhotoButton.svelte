<script lang="ts">
  import { putPhoto } from '../lib/db';
  import { newId } from '../lib/ids';
  import { sfx } from '../lib/sfx';
  import { app, showToast } from '../lib/store.svelte';

  interface Props {
    taskUid: string | null;
    caption: string;
    /** Idee voor de foto, als tip onder de knop. */
    idea?: string;
  }

  let { taskUid, caption, idea }: Props = $props();

  let input = $state<HTMLInputElement | undefined>();
  let busy = $state(false);
  let flash = $state(false);

  /** Verkleinen naar maximaal 1600 px: scherp genoeg voor de diavoorstelling, klein genoeg voor de tablet. */
  async function shrink(file: File): Promise<Blob> {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/jpeg', 0.85));
  }

  async function onFile(e: Event): Promise<void> {
    const file = (e.currentTarget as HTMLInputElement).files?.[0];
    (e.currentTarget as HTMLInputElement).value = '';
    if (!file || !app.game) return;
    busy = true;
    try {
      const image = await shrink(file);
      await putPhoto({ id: newId(), gameId: app.game.id, taskUid, caption, createdAt: Date.now(), image });
      app.game.photoCount = (app.game.photoCount ?? 0) + 1;
      sfx.reveal();
      flash = true;
      setTimeout(() => (flash = false), 500);
      showToast('📸 Bewijsfoto bewaard!');
    } catch (err) {
      console.error(err);
      showToast('De foto kon niet bewaard worden.', 'error');
    } finally {
      busy = false;
    }
  }
</script>

<div class="photo">
  <input bind:this={input} type="file" accept="image/*" capture="environment" hidden onchange={onFile} />
  <button type="button" class="btn" disabled={busy} onclick={() => input?.click()}>
    📸 {busy ? 'Bewaren...' : 'Bewijsfoto'}
  </button>
  {#if idea}<span class="idea">Idee: {idea}</span>{/if}
</div>
{#if flash}<div class="flash" aria-hidden="true"></div>{/if}

<style>
  .photo {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    justify-content: center;
  }

  .btn {
    min-height: 52px;
    padding: 8px 20px;
    border-radius: 999px;
    border: 2px solid var(--line);
    background: rgba(255, 255, 255, 0.08);
    font-family: var(--font-title);
    font-weight: 700;
    font-size: 1.1rem;
    cursor: pointer;
  }

  .idea {
    color: var(--text-dim);
    font-size: 0.9rem;
  }

  .flash {
    position: fixed;
    inset: 0;
    background: #fff;
    z-index: 200;
    pointer-events: none;
    animation: flash 0.5s ease-out forwards;
  }

  @keyframes flash {
    from {
      opacity: 0.9;
    }
    to {
      opacity: 0;
    }
  }
</style>
