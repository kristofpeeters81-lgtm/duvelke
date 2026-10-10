<script lang="ts">
  import BigButton from './BigButton.svelte';
  import { app, prepDirty, savePrep } from '../lib/store.svelte';

  interface Props {
    /** Mag er hier opgeslagen worden (in het programma), of enkel de naam tonen (bij Nieuw spel)? */
    canSave?: boolean;
  }

  let { canSave = true }: Props = $props();

  const d = $derived(app.draft);
  const dirty = $derived(prepDirty(d));
  /** Een naam vragen: voor een nieuwe voorbereiding, of bij "Opslaan als nieuwe". */
  let naming = $state<null | 'save' | 'new'>(null);
  let name = $state('');

  function ask(kind: 'save' | 'new'): void {
    name = kind === 'new' ? `${d?.prep?.name ?? ''} (kopie)`.trim() : (d?.prep?.name ?? '');
    naming = kind;
  }

  function save(): void {
    if (!d) return;
    if (d.prep?.id && d.prep.name) savePrep(d.prep.name);
    else ask('save');
  }

  function confirm(): void {
    if (!name.trim() || !naming) return;
    savePrep(name, naming === 'new');
    naming = null;
  }
</script>

{#if d}
  <div class="bar" class:dirty>
    {#if d.prep}
      <span class="name">📁 {d.prep.name || 'Nieuwe voorbereiding'}</span>
      <span class="state">{d.prep.id ? (dirty ? '● niet opgeslagen wijzigingen' : '✓ opgeslagen') : '● nog niet opgeslagen'}</span>
    {:else}
      <span class="name">Gewoon spel (geen voorbereiding)</span>
    {/if}
    {#if canSave}
      {#if naming}
        <div class="naming">
          <input class="text-input" bind:value={name} maxlength="60" placeholder="Naam, bv. Feest Dieuwke" onkeydown={(e) => e.key === 'Enter' && confirm()} />
          <BigButton variant="gold" disabled={!name.trim()} onclick={confirm}>💾 Bewaar</BigButton>
          <BigButton variant="ghost" onclick={() => (naming = null)}>Annuleer</BigButton>
        </div>
      {:else}
        <div class="buttons">
          {#if d.prep}
            <BigButton variant={dirty || !d.prep.id ? 'gold' : 'ghost'} onclick={save}>💾 Opslaan</BigButton>
            {#if d.prep.id}<BigButton variant="ghost" onclick={() => ask('new')}>Opslaan als nieuwe</BigButton>{/if}
          {:else}
            <BigButton variant="ghost" onclick={() => ask('save')}>💾 Bewaar als voorbereiding</BigButton>
          {/if}
        </div>
      {/if}
    {:else if d.prep}
      <span class="hint small">Opslaan doe je in het volgende scherm (het programma).</span>
    {/if}
  </div>
{/if}

<style>
  .bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 14px;
    padding: 10px 14px;
    border-radius: var(--radius);
    background: var(--bg-raised);
    border: 2px solid var(--line);
    margin-bottom: 14px;
  }

  .bar.dirty {
    border-color: var(--gold);
  }

  .name {
    font-weight: 800;
    font-size: 1.1rem;
  }

  .state {
    color: var(--text-dim);
    font-weight: 700;
    font-size: 0.9rem;
  }

  .dirty .state {
    color: var(--gold);
  }

  .buttons,
  .naming {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    width: 100%;
  }

  .naming input {
    flex: 1;
    min-width: 180px;
  }

  .small {
    font-size: 0.85rem;
    margin: 0;
  }
</style>
