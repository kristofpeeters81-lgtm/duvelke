<script lang="ts">
  import BigButton from '../components/BigButton.svelte';
  import Segmented from '../components/Segmented.svelte';
  import Toggle from '../components/Toggle.svelte';
  import TopBar from '../components/TopBar.svelte';
  import { LOCATIONS } from '../lib/data/locations';
  import { newId } from '../lib/ids';
  import {
    DURATION_STEP,
    formatDuration,
    MAX_DURATION,
    MAX_NAME_LENGTH,
    MIN_DURATION,
  } from '../lib/settings';
  import { app, exportBackup, importBackup, resetSettings, showToast } from '../lib/store.svelte';
  import type { LocationId } from '../lib/types';

  const s = $derived(app.settings);

  let newItemName = $state('');
  let newItemQty = $state(10);
  let confirmReset = $state(false);

  function toggleLocation(id: LocationId): void {
    if (s.locations.includes(id)) {
      if (s.locations.length === 1) {
        showToast('Kies minstens één plek om te spelen.', 'error');
        return;
      }
      s.locations = s.locations.filter((l) => l !== id);
    } else {
      s.locations = [...s.locations, id];
    }
  }

  function addTreasureItem(): void {
    const name = newItemName.trim();
    if (!name) return;
    const quantity = Math.min(999, Math.max(1, Math.round(newItemQty || 1)));
    s.treasureItems = [...s.treasureItems, { id: newId(), name, quantity }];
    newItemName = '';
    newItemQty = 10;
  }

  function removeTreasureItem(id: string): void {
    s.treasureItems = s.treasureItems.filter((t) => t.id !== id);
  }

  /** Lege namen niet bewaren: bij het verlaten van het veld terugzetten naar de standaard. */
  function fixName(field: 'saboteurName' | 'hostName' | 'sonName' | 'neighbourName', fallback: string): void {
    if (s[field].trim() === '') s[field] = fallback;
  }

  let backupInput = $state<HTMLInputElement | undefined>();
  let pendingRestore = $state<File | null>(null);
  let busy = $state(false);

  async function makeBackupFile(): Promise<void> {
    busy = true;
    try {
      const file = await exportBackup();
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'Back-up Wie is \'t Duvelke?' });
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
      showToast('Back-up gedownload.');
    } catch (err) {
      console.error(err);
      showToast('De back-up maken is mislukt.', 'error');
    } finally {
      busy = false;
    }
  }

  async function restore(): Promise<void> {
    if (!pendingRestore) return;
    busy = true;
    try {
      showToast(await importBackup(pendingRestore));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Terugzetten mislukt.', 'error');
    } finally {
      pendingRestore = null;
      busy = false;
    }
  }

  const needsAdult = $derived(LOCATIONS.some((l) => l.needsAdult && s.locations.includes(l.id)));
</script>

<main class="page">
  <TopBar title="Instellingen" emoji="⚙️" />
  <p class="hint">Dit zijn de standaardinstellingen. Bij een nieuw spel kan je ze nog aanpassen. Alles wordt meteen bewaard.</p>

  <section class="section">
    <h2>🎭 Namen</h2>
    <p class="hint">Verzin gerust iets anders: de hele app past zich aan.</p>
    <label class="field-label" for="sab-name">De saboteur heet...</label>
    <input
      id="sab-name"
      class="text-input"
      bind:value={s.saboteurName}
      maxlength={MAX_NAME_LENGTH}
      onblur={() => fixName('saboteurName', "'t Duvelke")}
    />
    <label class="field-label" for="host-name">De presentatrice heet...</label>
    <input
      id="host-name"
      class="text-input"
      bind:value={s.hostName}
      maxlength={MAX_NAME_LENGTH}
      onblur={() => fixName('hostName', 'Windy')}
    />
    <label class="field-label" for="son-name">Haar zoon heet...</label>
    <input
      id="son-name"
      class="text-input"
      bind:value={s.sonName}
      maxlength={MAX_NAME_LENGTH}
      onblur={() => fixName('sonName', 'Kenzo')}
    />
    <label class="field-label" for="nb-name">De roddelende buurvrouw heet...</label>
    <input
      id="nb-name"
      class="text-input"
      bind:value={s.neighbourName}
      maxlength={MAX_NAME_LENGTH}
      onblur={() => fixName('neighbourName', 'Buurvrouw Josée')}
    />
  </section>

  <section class="section">
    <h2>⏱️ Speelduur</h2>
    <p class="hint">Inclusief uitleg, geheime briefings en de eindtest.</p>
    <div class="duration">
      <span class="big">{formatDuration(s.durationMinutes)}</span>
      <input
        type="range"
        min={MIN_DURATION}
        max={MAX_DURATION}
        step={DURATION_STEP}
        bind:value={s.durationMinutes}
        aria-label="Speelduur in minuten"
      />
      <div class="scale"><span>{formatDuration(MIN_DURATION)}</span><span>{formatDuration(MAX_DURATION)}</span></div>
    </div>
  </section>

  <section class="section">
    <h2>🎯 Moeilijkheid</h2>
    <p class="hint">Bepaalt de uitleg, de raadsels en de quizvragen.</p>
    <Segmented
      label="Moeilijkheid"
      value={s.difficulty}
      options={[
        { value: 'makkelijk', label: 'Makkelijk', sub: '6–8 jaar' },
        { value: 'normaal', label: 'Normaal', sub: '9–12 jaar' },
        { value: 'pittig', label: 'Pittig', sub: 'tieners & volwassenen' },
      ]}
      onchange={(v) => (s.difficulty = v)}
    />
  </section>

  <section class="section">
    <h2>📍 Waar spelen jullie?</h2>
    <p class="hint">Meerdere plekken mag. Het spel mengt opdrachten van alle aangevinkte plekken.</p>
    <div class="chips">
      {#each LOCATIONS as loc (loc.id)}
        <button type="button" class="chip" aria-pressed={s.locations.includes(loc.id)} onclick={() => toggleLocation(loc.id)}>
          <span class="emoji">{loc.emoji}</span>{loc.label}{#if loc.needsAdult}&nbsp;🦺{/if}
        </button>
      {/each}
    </div>
    {#if needsAdult}
      <p class="note">🦺 Op deze plekken gaat er altijd een volwassene mee.</p>
    {/if}
  </section>

  <section class="section">
    <h2>💎 De schat</h2>
    <p class="hint">Wat verdient de groep met de opdrachten?</p>
    <Segmented
      label="Soort schat"
      value={s.treasureMode}
      options={[
        { value: 'virtueel', label: '💎 Virtueel', sub: 'edelstenen op het scherm' },
        { value: 'fysiek', label: '🍬 Echt', sub: 'snoep, stickers, ...' },
      ]}
      onchange={(v) => (s.treasureMode = v)}
    />
    {#if s.treasureMode === 'fysiek'}
      <p class="hint top">Wat zit er in de echte schatkist? Op het einde zegt het spel hoeveel de groep verdiend heeft en hoe je het eerlijk verdeelt.</p>
      {#each s.treasureItems as item (item.id)}
        <div class="item">
          <span class="qty">{item.quantity}×</span>
          <span class="iname">{item.name}</span>
          <button type="button" class="x" aria-label="Verwijder {item.name}" onclick={() => removeTreasureItem(item.id)}>✕</button>
        </div>
      {/each}
      <div class="add-item">
        <input class="text-input qty-input" type="number" min="1" max="999" bind:value={newItemQty} aria-label="Aantal" />
        <input
          class="text-input"
          bind:value={newItemName}
          maxlength="40"
          placeholder="bv. snoepjes"
          aria-label="Wat"
          onkeydown={(e) => e.key === 'Enter' && addTreasureItem()}
        />
        <BigButton variant="secondary" disabled={!newItemName.trim()} onclick={addTreasureItem}>＋</BigButton>
      </div>
    {/if}
  </section>

  <section class="section">
    <h2>🕵️ Geheimen & roddels</h2>
    <Toggle
      label="Buurvrouw-roddels"
      description="{s.hostName} vertelt ook roddels van de buurvrouw, en die liegt soms."
      checked={s.neighbourGossip}
      onchange={(v) => (s.neighbourGossip = v)}
    />
    <Toggle
      label="🔍 Speurneus"
      description="Iemand krijgt stiekem onschuldige namen en speelt voor een eigen medaille."
      checked={s.speurneusEnabled}
      onchange={(v) => (s.speurneusEnabled = v)}
    />
    <Toggle
      label="🙋 Bemoeial"
      description="Iemand moet zich overal ongevraagd mee bemoeien. Voor durvers!"
      checked={s.bemoeialEnabled}
      onchange={(v) => (s.bemoeialEnabled = v)}
    />
    <span class="field-label">Geheime briefing</span>
    <Segmented
      label="Hoe vaak een geheime briefing"
      value={s.briefingEvery}
      options={[
        { value: 1, label: 'Elke opdracht', sub: 'meer spanning' },
        { value: 2, label: 'Om de 2', sub: 'sneller spel' },
      ]}
      onchange={(v) => (s.briefingEvery = v)}
    />
  </section>

  <section class="section">
    <h2>🔊 Geluid</h2>
    <Toggle label="Geluidseffecten" description="Timer, edelstenen, tromgeroffel en fanfare." checked={s.soundEnabled} onchange={(v) => (s.soundEnabled = v)} />
  </section>

  <section class="section">
    <h2>💾 Back-up</h2>
    <p class="hint">Bewaar spelers, instellingen, Windy's uitspraken en opnames, en je eigen opdrachten in één bestand. Handig om over te zetten naar een andere tablet of als reserve. Foto's en de AI-sleutel zitten er niet in.</p>
    <div class="reset">
      <BigButton variant="secondary" disabled={busy} onclick={makeBackupFile}>💾 Back-up maken</BigButton>
      <BigButton variant="ghost" disabled={busy} onclick={() => backupInput?.click()}>📂 Back-up terugzetten</BigButton>
    </div>
    <input bind:this={backupInput} type="file" accept="application/json,.json" hidden onchange={(e) => ((pendingRestore = e.currentTarget.files?.[0] ?? null), (e.currentTarget.value = ''))} />
    {#if pendingRestore}
      <p class="note">Dit vervangt je spelers, instellingen, uitspraken en eigen opdrachten door die uit <strong>{pendingRestore.name}</strong>. Zeker?</p>
      <div class="reset">
        <BigButton variant="danger" disabled={busy} onclick={restore}>Ja, terugzetten</BigButton>
        <BigButton variant="ghost" onclick={() => (pendingRestore = null)}>Toch niet</BigButton>
      </div>
    {/if}
  </section>

  <div class="reset">
    {#if confirmReset}
      <BigButton
        variant="danger"
        onclick={() => {
          resetSettings();
          confirmReset = false;
          showToast('Standaardinstellingen teruggezet.');
        }}
      >
        Ja, zet alles terug
      </BigButton>
      <BigButton variant="ghost" onclick={() => (confirmReset = false)}>Toch niet</BigButton>
    {:else}
      <BigButton variant="ghost" onclick={() => (confirmReset = true)}>↺ Standaardinstellingen</BigButton>
    {/if}
  </div>
</main>

<style>
  .duration {
    text-align: center;
  }

  .big {
    display: block;
    font-family: var(--font-title);
    font-weight: 700;
    font-size: 2.4rem;
    color: var(--gold);
  }

  input[type='range'] {
    width: 100%;
    height: 44px;
    accent-color: var(--pink);
  }

  .scale {
    display: flex;
    justify-content: space-between;
    color: var(--text-dim);
    font-size: 0.85rem;
  }

  .note {
    margin: 14px 0 0;
    padding: 10px 14px;
    border-radius: var(--radius-sm);
    background: rgba(255, 207, 63, 0.12);
    color: var(--gold);
    font-weight: 700;
  }

  .top {
    margin-top: 16px;
  }

  .item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    border-radius: var(--radius-sm);
    background: var(--bg-deep);
    margin-bottom: 8px;
  }

  .qty {
    font-family: var(--font-title);
    font-weight: 700;
    color: var(--gold);
    min-width: 48px;
  }

  .iname {
    flex: 1;
    font-weight: 700;
  }

  .x {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: none;
    background: rgba(255, 255, 255, 0.08);
    cursor: pointer;
  }

  .add-item {
    display: flex;
    gap: 10px;
    align-items: center;
    margin-top: 10px;
  }

  .qty-input {
    width: 96px;
    flex: none;
  }

  .reset {
    display: flex;
    gap: 12px;
    justify-content: center;
    flex-wrap: wrap;
    margin-top: 10px;
  }
</style>
