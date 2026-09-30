<script lang="ts">
  import { onMount } from 'svelte';
  import BigButton from '../components/BigButton.svelte';
  import TopBar from '../components/TopBar.svelte';
  import Windy from '../components/Windy.svelte';
  import {
    BrokenVoiceError,
    downloadVoice,
    PIPER_VOICES,
    piperSupported,
    playWav,
    removeVoice,
    stopPiper,
    storedVoices,
    synthesize,
    type PiperVoice,
  } from '../lib/piper';
  import { invalidateStoredVoices } from '../lib/speech';
  import { app, lineContext, showToast } from '../lib/store.svelte';
  import { fillPlaceholders } from '../lib/windy';

  const SAMPLES = [
    "Hallooo schatjes! 't Is hier {windy}! Ik kom efkes kijken of ge alles goed doet. Ik zeg niks hé. Maar ik kijk wel.",
    'Onzen {zoon} heeft gisteren zijn kamer opgeruimd. Grapje! Hahaha. Nee serieus, dat gebeurt nooit.',
    'Psst... kom ne keer dichter. Ik heb gehoord dat {saboteur} vandaag iets blauws aanheeft!',
    'Allee, geef de tablet maar aan Lotte. Voorzichtig hé, die is nog niet afbetaald.',
  ];

  const PITCHES = [
    { value: 1, label: 'Gewoon' },
    { value: 1.1, label: 'Iets hoger' },
    { value: 1.2, label: 'Windy' },
    { value: 1.32, label: 'Heel hoog' },
  ];

  let stored = $state<string[]>([]);
  let progress = $state<Record<string, number>>({});
  let busy = $state<string | null>(null);
  let talking = $state(false);
  let sample = $state(0);
  let ownText = $state('');
  let pitch = $state(app.settings.voice.piperPitch);
  let lastTiming = $state<{ voice: string; ms: number } | null>(null);
  const online = $state({ value: typeof navigator === 'undefined' ? true : navigator.onLine });

  onMount(() => {
    void refresh();
    const on = (): void => void (online.value = navigator.onLine);
    window.addEventListener('online', on);
    window.addEventListener('offline', on);
    return () => {
      stopPiper();
      window.removeEventListener('online', on);
      window.removeEventListener('offline', on);
    };
  });

  async function refresh(): Promise<void> {
    invalidateStoredVoices();
    stored = await storedVoices();
  }

  function useForWindy(v: PiperVoice): void {
    app.settings.voice.engine = 'piper';
    app.settings.voice.piperVoice = v.id;
    app.settings.voice.piperPitch = pitch;
    app.settings.voice.enabled = true;
    showToast(`${app.settings.hostName} spreekt nu met ${v.label}!`);
  }

  async function download(v: PiperVoice): Promise<void> {
    if (!online.value) {
      showToast('Voor het downloaden is internet nodig.', 'error');
      return;
    }
    progress[v.id] = 0;
    try {
      await downloadVoice(v.id, (f) => (progress[v.id] = f));
      // Meteen één zin maken: zo worden ook de rekenmodules (uitspraak) opgehaald en bewaard voor offline gebruik.
      await synthesize('Klaar.', v.id);
      showToast(`${v.label} is klaar, ook zonder internet!`);
    } catch (err) {
      console.error(err);
      showToast('Downloaden mislukt. Probeer opnieuw met wifi.', 'error');
    } finally {
      delete progress[v.id];
      await refresh();
    }
  }

  async function remove(v: PiperVoice): Promise<void> {
    await removeVoice(v.id);
    await refresh();
    showToast(`${v.label} is verwijderd.`);
  }

  const text = $derived(ownText.trim() !== '' ? ownText.trim() : fillPlaceholders(SAMPLES[sample] ?? '', lineContext('Lotte')));

  async function listen(v: PiperVoice): Promise<void> {
    if (busy) return;
    busy = v.id;
    try {
      const start = performance.now();
      const wav = await synthesize(text, v.id);
      lastTiming = { voice: v.label, ms: Math.round(performance.now() - start) };
      busy = null;
      talking = true;
      await playWav(wav, pitch);
    } catch (err) {
      console.error(err);
      if (err instanceof BrokenVoiceError) {
        showToast(`De stem ${v.label} was niet volledig gedownload. Download ze opnieuw met wifi.`, 'error');
        await refresh();
      } else {
        showToast('Voorlezen mislukt.', 'error');
      }
    } finally {
      busy = null;
      talking = false;
    }
  }
</script>

<main class="page">
  <TopBar title="Stemtest" emoji="🧪" />

  <section class="section intro">
    <Windy mood="stiekem" size={120} {talking} />
    <div>
      <h2>Vlaamse AI-stemmen</h2>
      <p class="hint">
        Deze stemmen draaien op de tablet zelf en zijn gratis. Je downloadt ze één keer met wifi, daarna werken ze ook
        zonder internet. Probeer ze en kies welke het best bij {app.settings.hostName} past.
      </p>
      {#if !online.value}<p class="warn">Geen internet: je kan enkel al gedownloade stemmen testen.</p>{/if}
    </div>
  </section>

  {#if !piperSupported()}
    <p class="warn">Deze browser ondersteunt de AI-stemmen niet. Gebruik Chrome.</p>
  {:else}
    <section class="section">
      <h2>1. Wat moet ze zeggen?</h2>
      <div class="samples">
        {#each SAMPLES as s, i (i)}
          <button type="button" class="sample" aria-pressed={ownText === '' && sample === i} onclick={() => ((sample = i), (ownText = ''))}>
            {fillPlaceholders(s, lineContext('Lotte'))}
          </button>
        {/each}
      </div>
      <label class="field-label" for="own">Of typ zelf iets</label>
      <input id="own" class="text-input" bind:value={ownText} placeholder="bv. Amai, wat een schoon feestje!" maxlength="200" />
    </section>

    <section class="section">
      <h2>2. Hoe hoog?</h2>
      <p class="hint">Hoger klinkt ook iets sneller, zoals een man die een hoog stemmetje opzet.</p>
      <div class="chips">
        {#each PITCHES as p (p.value)}
          <button type="button" class="chip" aria-pressed={pitch === p.value} onclick={() => (pitch = p.value)}>{p.label}</button>
        {/each}
      </div>
    </section>

    <section class="section">
      <h2>3. Welke stem?</h2>
      <div class="voices">
        {#each PIPER_VOICES as v (v.id)}
          {@const has = stored.includes(v.id)}
          {@const p = progress[v.id]}
          <div class="voice">
            <div class="vinfo">
              <strong>{v.label}</strong>
              <span class="hint small">{v.description}</span>
              {#if has}<span class="ok">✓ Gedownload, werkt offline</span>{/if}
            </div>
            {#if p !== undefined}
              <div class="bar"><div class="fill" style="width:{Math.round(p * 100)}%"></div></div>
              <span class="pct">{Math.round(p * 100)}%</span>
            {:else if has}
              <BigButton variant="secondary" disabled={busy !== null} onclick={() => listen(v)}>
                {busy === v.id ? '⏳ Even denken...' : '▶ Luister'}
              </BigButton>
              {#if app.settings.voice.engine === 'piper' && app.settings.voice.piperVoice === v.id}
                <span class="inuse">🎙️ Stem van {app.settings.hostName}</span>
              {:else}
                <BigButton variant="gold" onclick={() => useForWindy(v)}>Gebruik voor {app.settings.hostName}</BigButton>
              {/if}
              <button type="button" class="link" onclick={() => remove(v)}>Wissen</button>
            {:else}
              <BigButton variant="ghost" disabled={!online.value} onclick={() => download(v)}>⬇ Downloaden</BigButton>
            {/if}
          </div>
        {/each}
      </div>
      {#if lastTiming}
        <p class="hint timing">{lastTiming.voice}: zin gemaakt in {(lastTiming.ms / 1000).toFixed(1)} seconden.</p>
      {/if}
    </section>

    <p class="hint center">
      Tip: download een stem, zet de tablet daarna in vliegtuigmodus en test opnieuw. Werkt het dan nog, dan is alles in orde.
    </p>
  {/if}
</main>

<style>
  .intro {
    display: flex;
    gap: 18px;
    align-items: center;
  }

  @media (max-width: 560px) {
    .intro {
      flex-direction: column;
      text-align: center;
    }
  }

  .warn {
    padding: 12px 14px;
    border-radius: var(--radius-sm);
    background: rgba(255, 207, 63, 0.12);
    color: var(--gold);
    font-weight: 700;
  }

  .samples {
    display: grid;
    gap: 8px;
  }

  .sample {
    text-align: left;
    padding: 12px 14px;
    border-radius: 14px;
    border: 2px solid var(--line);
    background: var(--bg-deep);
    color: var(--text-soft);
    cursor: pointer;
  }

  .sample[aria-pressed='true'] {
    border-color: var(--turquoise);
    color: var(--text);
  }

  .voices {
    display: grid;
    gap: 12px;
  }

  .voice {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px;
    border-radius: 16px;
    background: var(--bg-deep);
    flex-wrap: wrap;
  }

  .vinfo {
    flex: 1;
    min-width: 180px;
    display: flex;
    flex-direction: column;
  }

  .small {
    margin: 0;
  }

  .ok {
    color: var(--turquoise);
    font-weight: 800;
    font-size: 0.9rem;
  }

  .bar {
    flex: 1;
    min-width: 140px;
    height: 14px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.1);
    overflow: hidden;
  }

  .fill {
    height: 100%;
    background: linear-gradient(90deg, var(--turquoise), var(--pink));
    transition: width 0.2s ease;
  }

  .pct {
    font-weight: 800;
    min-width: 48px;
  }

  .link {
    background: none;
    border: none;
    color: var(--text-dim);
    text-decoration: underline;
    cursor: pointer;
    padding: 8px;
  }

  .inuse {
    font-weight: 800;
    color: var(--gold);
  }

  .timing {
    margin-top: 12px;
  }

  .center {
    text-align: center;
  }
</style>
