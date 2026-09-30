<script lang="ts">
  import BigButton from '../components/BigButton.svelte';
  import Segmented from '../components/Segmented.svelte';
  import TopBar from '../components/TopBar.svelte';
  import { PLAYER_AVATARS, PLAYER_COLORS } from '../lib/data/looks';
  import { createPlayer, MAX_SAVED_PLAYERS, validatePlayerName } from '../lib/players';
  import { MAX_NAME_LENGTH } from '../lib/settings';
  import { app, deletePlayer, savePlayer, showToast } from '../lib/store.svelte';
  import type { Player } from '../lib/types';

  let editing = $state<Player | null>(null);
  let isNew = $state(false);
  let confirmDelete = $state(false);
  let saving = $state(false);

  const error = $derived(editing ? validatePlayerName(editing.name, app.players, editing.id) : null);

  function startNew(): void {
    if (app.players.length >= MAX_SAVED_PLAYERS) {
      showToast(`Maximum ${MAX_SAVED_PLAYERS} spelers. Verwijder eerst iemand.`, 'error');
      return;
    }
    editing = createPlayer(app.players);
    isNew = true;
    confirmDelete = false;
  }

  function startEdit(player: Player): void {
    editing = { ...player };
    isNew = false;
    confirmDelete = false;
  }

  async function save(): Promise<void> {
    if (!editing || error || saving) return;
    saving = true;
    const ok = await savePlayer({ ...editing, name: editing.name.trim() });
    saving = false;
    if (ok) {
      showToast(isNew ? `${editing.name.trim()} is toegevoegd!` : 'Bewaard!');
      editing = null;
    }
  }

  async function remove(): Promise<void> {
    if (!editing) return;
    const name = editing.name;
    const ok = await deletePlayer(editing.id);
    if (ok) {
      showToast(`${name} is verwijderd.`);
      editing = null;
    }
  }
</script>

<main class="page">
  <TopBar title="Spelers" emoji="👥" />

  <p class="hint">
    Wie hier staat, kan je bij elk nieuw spel aanvinken. Zo moet je de vaste vriendinnen niet telkens opnieuw typen.
  </p>

  <div class="players">
    {#each app.players as player (player.id)}
      <button class="player" type="button" onclick={() => startEdit(player)}>
        <span class="avatar" style="--c:{player.color}">{player.avatar}</span>
        <span class="name">{player.name}</span>
        {#if player.isAdult}<span class="badge">volwassene</span>{/if}
      </button>
    {/each}
    <button class="player add" type="button" onclick={startNew}>
      <span class="avatar plus">＋</span>
      <span class="name">Nieuwe speler</span>
    </button>
  </div>
</main>

{#if editing}
  <div class="overlay" role="presentation" onclick={() => (editing = null)}>
    <div class="sheet" role="dialog" aria-modal="true" aria-label="Speler bewerken" onclick={(e) => e.stopPropagation()} onkeydown={() => {}} tabindex="-1">
      <div class="preview">
        <span class="avatar big" style="--c:{editing.color}">{editing.avatar}</span>
      </div>

      <label class="field-label" for="player-name">Naam</label>
      <input
        id="player-name"
        class="text-input"
        bind:value={editing.name}
        maxlength={MAX_NAME_LENGTH}
        placeholder="bv. Lotte"
        autocomplete="off"
        enterkeyhint="done"
        onkeydown={(e) => e.key === 'Enter' && save()}
      />
      {#if error && editing.name.length > 0}<p class="error">{error}</p>{/if}

      <span class="field-label">Wie is het?</span>
      <Segmented
        label="Kind of volwassene"
        value={editing.isAdult ? 'adult' : 'kid'}
        options={[
          { value: 'kid', label: '🧒 Kind' },
          { value: 'adult', label: '🧑 Volwassene' },
        ]}
        onchange={(v) => editing && (editing.isAdult = v === 'adult')}
      />

      <span class="field-label">Dier</span>
      <div class="picker">
        {#each PLAYER_AVATARS as avatar (avatar)}
          <button type="button" class="pick" aria-pressed={editing.avatar === avatar} onclick={() => editing && (editing.avatar = avatar)}>
            {avatar}
          </button>
        {/each}
      </div>

      <span class="field-label">Kleur</span>
      <div class="picker">
        {#each PLAYER_COLORS as color (color)}
          <button
            type="button"
            class="pick color"
            style="--c:{color}"
            aria-label="Kleur {color}"
            aria-pressed={editing.color === color}
            onclick={() => editing && (editing.color = color)}
          ></button>
        {/each}
      </div>

      <div class="actions">
        <BigButton variant="primary" full disabled={!!error || saving} onclick={save}>
          {isNew ? '✓ Toevoegen' : '✓ Bewaren'}
        </BigButton>
        <BigButton variant="ghost" full onclick={() => (editing = null)}>Annuleren</BigButton>
        {#if !isNew}
          {#if confirmDelete}
            <BigButton variant="danger" full onclick={remove}>Ja, verwijder {editing.name}</BigButton>
          {:else}
            <BigButton variant="danger" full onclick={() => (confirmDelete = true)}>🗑️ Verwijderen</BigButton>
          {/if}
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .players {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 14px;
  }

  .player {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 18px 10px;
    border-radius: var(--radius);
    border: 2px solid var(--line);
    background: var(--bg-raised);
    cursor: pointer;
    box-shadow: var(--shadow);
    transition: transform 0.12s ease;
  }

  .player:active {
    transform: scale(0.96);
  }

  .player.add {
    border-style: dashed;
    background: transparent;
    box-shadow: none;
  }

  .avatar {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-size: 2.4rem;
    background: var(--c);
    box-shadow: inset 0 -6px 0 rgba(0, 0, 0, 0.18), 0 0 0 4px rgba(255, 255, 255, 0.12);
  }

  .avatar.plus {
    background: rgba(255, 255, 255, 0.08);
    color: var(--turquoise);
    font-size: 2rem;
  }

  .avatar.big {
    width: 110px;
    height: 110px;
    font-size: 3.6rem;
  }

  .name {
    font-weight: 800;
    text-align: center;
    word-break: break-word;
  }

  .badge {
    font-size: 0.75rem;
    background: var(--gold);
    color: #3a2500;
    border-radius: 999px;
    padding: 1px 10px;
    font-weight: 800;
  }

  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(10, 0, 30, 0.7);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    z-index: 50;
    animation: fade 0.2s ease;
  }

  .sheet {
    width: min(640px, 100%);
    max-height: 92dvh;
    overflow-y: auto;
    background: var(--bg-raised);
    border-radius: 28px 28px 0 0;
    padding: 20px 20px calc(24px + env(safe-area-inset-bottom));
    animation: slide 0.28s cubic-bezier(0.3, 1.2, 0.6, 1);
    outline: none;
  }

  @media (min-width: 700px) {
    .overlay {
      align-items: center;
    }
    .sheet {
      border-radius: 28px;
    }
  }

  .preview {
    display: flex;
    justify-content: center;
    margin-bottom: 6px;
  }

  .error {
    color: var(--danger);
    font-weight: 700;
    margin: 6px 0 0;
  }

  .picker {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(54px, 1fr));
    gap: 8px;
  }

  .pick {
    height: 54px;
    border-radius: 14px;
    border: 3px solid transparent;
    background: var(--bg-deep);
    font-size: 1.8rem;
    cursor: pointer;
  }

  .pick[aria-pressed='true'] {
    border-color: var(--turquoise);
    background: rgba(41, 211, 196, 0.15);
  }

  .pick.color {
    background: var(--c);
  }

  .pick.color[aria-pressed='true'] {
    border-color: #fff;
    box-shadow: 0 0 0 3px var(--c);
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 24px;
  }

  @keyframes fade {
    from {
      opacity: 0;
    }
  }

  @keyframes slide {
    from {
      transform: translateY(40px);
      opacity: 0;
    }
  }
</style>
