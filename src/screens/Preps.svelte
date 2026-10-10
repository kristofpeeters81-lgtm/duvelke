<script lang="ts">
  import BigButton from '../components/BigButton.svelte';
  import TopBar from '../components/TopBar.svelte';
  import { app, deletePrep, importPrep, newPrep, openPrep, prepAsFile, showToast } from '../lib/store.svelte';
  import { getTask } from '../lib/tasks/registry';

  let confirmDelete = $state<string | null>(null);
  let fileInput = $state<HTMLInputElement | undefined>();

  function date(ms: number): string {
    return new Date(ms).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  function names(ids: readonly string[]): string {
    const list = ids.map((id) => app.players.find((p) => p.id === id)?.name).filter(Boolean);
    return list.length > 4 ? `${list.slice(0, 4).join(', ')} en nog ${list.length - 4}` : list.join(', ');
  }

  /** Als bestand bewaren: delen (Android: "Opslaan in Bestanden"), anders gewoon downloaden. */
  async function saveFile(id: string): Promise<void> {
    const file = prepAsFile(id);
    if (!file) return;
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: file.name });
        return;
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
      }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file);
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    showToast('Bestand gedownload.');
  }

  async function loadFile(e: Event): Promise<void> {
    const file = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      showToast(await importPrep(file));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Inladen mislukt.', 'error');
    } finally {
      if (fileInput) fileInput.value = '';
    }
  }
</script>

<main class="page">
  <TopBar title="Voorbereidingen" emoji="📁" />
  <p class="hint">
    Zet een spel op voorhand klaar: wie meedoet, het hulpje, de instellingen en de opdrachten. Test de opdrachten met een proefronde, en start
    later het spel vanuit de voorbereiding. Je kan alles nog aanpassen; het origineel verandert pas als je op Opslaan tikt.
  </p>

  <BigButton variant="gold" size="large" full onclick={newPrep}>＋ Nieuwe voorbereiding</BigButton>

  {#if app.preps.length === 0}
    <p class="empty">Nog geen voorbereidingen.</p>
  {:else}
    <ul class="list">
      {#each app.preps as p (p.id)}
        <li class="prep">
          <button type="button" class="main" onclick={() => openPrep(p.id)}>
            <span class="name">📁 {p.name}</span>
            <span class="meta">👥 {p.playerIds.length} spelers{p.playerIds.length ? `: ${names(p.playerIds)}` : ''}</span>
            <span class="meta">🎯 {p.program.length} opdrachten{p.program.length ? `: ${p.program.slice(0, 3).map((i) => getTask(i.taskId)?.title ?? '?').join(', ')}${p.program.length > 3 ? '...' : ''}` : ''}</span>
            <span class="meta dim">Bewaard {date(p.updatedAt)}</span>
          </button>
          <div class="actions">
            <BigButton variant="primary" onclick={() => openPrep(p.id)}>Openen ▶</BigButton>
            <BigButton variant="ghost" onclick={() => saveFile(p.id)}>💾 Als bestand</BigButton>
            {#if confirmDelete === p.id}
              <BigButton variant="danger" onclick={() => ((confirmDelete = null), deletePrep(p.id))}>Ja, verwijderen</BigButton>
              <BigButton variant="ghost" onclick={() => (confirmDelete = null)}>Toch niet</BigButton>
            {:else}
              <BigButton variant="ghost" onclick={() => (confirmDelete = p.id)}>🗑️</BigButton>
            {/if}
          </div>
        </li>
      {/each}
    </ul>
  {/if}

  <section class="section">
    <h2>📂 Een voorbereiding inladen</h2>
    <p class="hint">Een bestand dat je eerder bewaarde (ook van een ander toestel). Spelers die hier nog niet bestaan, worden toegevoegd.</p>
    <input bind:this={fileInput} type="file" accept="application/json,.json" class="hidden" onchange={loadFile} />
    <BigButton variant="secondary" full onclick={() => fileInput?.click()}>📂 Bestand kiezen</BigButton>
  </section>
</main>

<style>
  .empty {
    text-align: center;
    color: var(--text-dim);
    margin: 24px 0;
  }

  .list {
    list-style: none;
    padding: 0;
    margin: 18px 0;
    display: grid;
    gap: 12px;
  }

  .prep {
    background: var(--bg-raised);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    padding: 12px;
    display: grid;
    gap: 10px;
  }

  .main {
    display: grid;
    gap: 4px;
    text-align: left;
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    padding: 4px;
  }

  .name {
    font-family: var(--font-title);
    font-size: 1.3rem;
  }

  .meta {
    font-weight: 700;
    font-size: 0.95rem;
  }

  .dim {
    color: var(--text-dim);
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .hidden {
    display: none;
  }
</style>
