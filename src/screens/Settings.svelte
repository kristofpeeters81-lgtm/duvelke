<script lang="ts">
  import BigButton from '../components/BigButton.svelte';
  import Toggle from '../components/Toggle.svelte';
  import TopBar from '../components/TopBar.svelte';
  import GameSettingsFields from '../components/GameSettingsFields.svelte';
  import { MAX_NAME_LENGTH } from '../lib/settings';
  import { app, exportBackup, importBackup, resetSettings, showToast } from '../lib/store.svelte';

  const s = $derived(app.settings);

  let confirmReset = $state(false);

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

  <GameSettingsFields s={app.settings} />

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

  .reset {
    display: flex;
    gap: 12px;
    justify-content: center;
    flex-wrap: wrap;
    margin-top: 10px;
  }
</style>
