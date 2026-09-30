<script lang="ts">
  import BigButton from '../components/BigButton.svelte';
  import TopBar from '../components/TopBar.svelte';
  import { SUPPLIES, SUPPLY_GROUPS } from '../lib/data/supplies';
  import { newId } from '../lib/ids';
  import { CUSTOM_SUPPLY_EMOJIS, MAX_SUPPLY_LENGTH, validateCustomSupplyLabel } from '../lib/settings';
  import { app, showToast } from '../lib/store.svelte';

  const selected = $derived(new Set(app.settings.supplies));

  let newLabel = $state('');
  let newEmoji = $state(CUSTOM_SUPPLY_EMOJIS[0] ?? '📦');
  let confirmRemove = $state<string | null>(null);

  const addError = $derived(newLabel.trim() === '' ? null : validateCustomSupplyLabel(newLabel, app.settings.customSupplies));

  function toggle(id: string): void {
    app.settings.supplies = selected.has(id)
      ? app.settings.supplies.filter((s) => s !== id)
      : [...app.settings.supplies, id];
  }

  function setGroup(groupId: string, on: boolean): void {
    const ids = SUPPLIES.filter((s) => s.group === groupId).map((s) => s.id);
    const rest = app.settings.supplies.filter((s) => !ids.includes(s));
    app.settings.supplies = on ? [...rest, ...ids] : rest;
  }

  function addCustom(): void {
    const error = validateCustomSupplyLabel(newLabel, app.settings.customSupplies);
    if (error) {
      showToast(error, 'error');
      return;
    }
    const id = `eigen-${newId()}`;
    const label = newLabel.trim();
    app.settings.customSupplies = [...app.settings.customSupplies, { id, label, emoji: newEmoji }];
    // Wat je zelf toevoegt, heb je natuurlijk: meteen aanvinken.
    app.settings.supplies = [...app.settings.supplies, id];
    newLabel = '';
    showToast(`${label} toegevoegd!`);
  }

  function removeCustom(id: string): void {
    app.settings.customSupplies = app.settings.customSupplies.filter((c) => c.id !== id);
    app.settings.supplies = app.settings.supplies.filter((s) => s !== id);
    confirmRemove = null;
  }
</script>

<main class="page">
  <TopBar title="Benodigdheden" emoji="🎒" />

  <p class="hint">
    Vink aan wat je in huis hebt. Het spel kiest enkel opdrachten waarvoor alles aanwezig is, zodat niemand tijdens het
    spel moet gaan zoeken. Je keuze wordt onthouden.
  </p>

  {#each SUPPLY_GROUPS as group (group.id)}
    {@const items = SUPPLIES.filter((s) => s.group === group.id)}
    {@const allOn = items.every((s) => selected.has(s.id))}
    <section class="section">
      <div class="head">
        <h2>{group.label}</h2>
        <button type="button" class="all" onclick={() => setGroup(group.id, !allOn)}>
          {allOn ? 'Niets' : 'Alles'}
        </button>
      </div>
      <div class="chips">
        {#each items as supply (supply.id)}
          <button type="button" class="chip" aria-pressed={selected.has(supply.id)} onclick={() => toggle(supply.id)}>
            <span class="emoji">{supply.emoji}</span>{supply.label}
          </button>
        {/each}
      </div>
    </section>
  {/each}

  <section class="section">
    <h2>✨ Eigen spullen</h2>
    <p class="hint">
      Iets anders in huis, zoals een trampoline, een tent of een parachute? Voeg het toe. Het wordt gebruikt voor je eigen
      opdrachten en de AI houdt er rekening mee bij het bedenken van nieuwe opdrachten.
    </p>

    {#if app.settings.customSupplies.length > 0}
      <div class="chips custom">
        {#each app.settings.customSupplies as item (item.id)}
          <span class="custom-item">
            <button type="button" class="chip" aria-pressed={selected.has(item.id)} onclick={() => toggle(item.id)}>
              <span class="emoji">{item.emoji}</span>{item.label}
            </button>
            {#if confirmRemove === item.id}
              <button type="button" class="remove sure" onclick={() => removeCustom(item.id)}>Wissen?</button>
            {:else}
              <button type="button" class="remove" aria-label="Verwijder {item.label}" onclick={() => (confirmRemove = item.id)}>✕</button>
            {/if}
          </span>
        {/each}
      </div>
    {/if}

    <span class="field-label">Icoontje</span>
    <div class="emojis" role="radiogroup" aria-label="Icoontje">
      {#each CUSTOM_SUPPLY_EMOJIS as emoji (emoji)}
        <button type="button" role="radio" aria-checked={newEmoji === emoji} class="pick" onclick={() => (newEmoji = emoji)}>
          {emoji}
        </button>
      {/each}
    </div>
    <label class="field-label" for="custom-supply">Wat heb je?</label>
    <div class="add">
      <input
        id="custom-supply"
        class="text-input"
        bind:value={newLabel}
        maxlength={MAX_SUPPLY_LENGTH}
        placeholder="bv. trampoline"
        autocomplete="off"
        enterkeyhint="done"
        onkeydown={(e) => e.key === 'Enter' && addCustom()}
      />
      <BigButton variant="secondary" disabled={newLabel.trim() === '' || !!addError} onclick={addCustom}>＋ Toevoegen</BigButton>
    </div>
    {#if addError}<p class="error">{addError}</p>{/if}
  </section>

  <p class="hint center">
    Opdrachten zonder benodigdheden (en dat zijn er veel!) kunnen altijd. Hoe meer je aanvinkt, hoe meer afwisseling.
  </p>
</main>

<style>
  .head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .all {
    border: 2px solid var(--line);
    background: transparent;
    color: var(--turquoise);
    font-weight: 800;
    border-radius: 999px;
    padding: 8px 16px;
    cursor: pointer;
  }

  .custom {
    margin-bottom: 8px;
  }

  .custom-item {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .remove {
    min-width: 44px;
    height: 44px;
    border-radius: 999px;
    border: none;
    background: rgba(255, 255, 255, 0.08);
    color: var(--text-dim);
    font-weight: 800;
    cursor: pointer;
    padding: 0 12px;
  }

  .remove.sure {
    background: var(--danger);
    color: #fff;
  }

  .emojis {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(50px, 1fr));
    gap: 8px;
  }

  .pick {
    height: 50px;
    border-radius: 14px;
    border: 3px solid transparent;
    background: var(--bg-deep);
    font-size: 1.6rem;
    cursor: pointer;
  }

  .pick[aria-checked='true'] {
    border-color: var(--turquoise);
    background: rgba(41, 211, 196, 0.15);
  }

  .add {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  @media (max-width: 520px) {
    .add {
      flex-direction: column;
      align-items: stretch;
    }
  }

  .error {
    color: var(--danger);
    font-weight: 700;
    margin: 8px 0 0;
  }

  .center {
    text-align: center;
  }
</style>
