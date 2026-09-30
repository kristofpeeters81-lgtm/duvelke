<script lang="ts" module>
  let rememberedTab: 'stem' | 'uitspraken' = 'stem';
</script>

<script lang="ts">
  import { onMount } from 'svelte';
  import BigButton from '../components/BigButton.svelte';
  import Segmented from '../components/Segmented.svelte';
  import Toggle from '../components/Toggle.svelte';
  import TopBar from '../components/TopBar.svelte';
  import Windy, { type WindyMood } from '../components/Windy.svelte';
  import { LINE_CATEGORIES, type LineCategory } from '../lib/data/windyLines';
  import { newId } from '../lib/ids';
  import { PIPER_VOICES, storedVoices } from '../lib/piper';
  import { defaultVoice, PIPER_PITCH_RANGE, PITCH_RANGE, RATE_RANGE } from '../lib/settings';
  import { speak, stopAll } from '../lib/speech';
  import { app, go, lineContext, showToast } from '../lib/store.svelte';
  import { loadDutchVoices, speechSupported } from '../lib/voice';
  import { fillPlaceholders, linesFor, MAX_CUSTOM_LINES, MAX_LINE_LENGTH, pickLine } from '../lib/windy';

  let tab = $state<'stem' | 'uitspraken'>(rememberedTab);
  $effect(() => {
    rememberedTab = tab;
  });

  // --- Stem ---
  let voices = $state<SpeechSynthesisVoice[]>([]);
  let voicesLoaded = $state(false);
  let talking = $state(false);
  const moods: WindyMood[] = ['blij', 'geschokt', 'stiekem', 'boos'];
  let moodIndex = $state(0);
  let piperStored = $state<string[] | null>(null);
  let testing = $state(false);

  const PIPER_PITCHES = [
    { value: 1, label: 'Gewoon' },
    { value: 1.1, label: 'Iets hoger' },
    { value: 1.2, label: 'Windy' },
    { value: 1.32, label: 'Heel hoog' },
  ];

  function voiceLabel(id: string): string {
    return PIPER_VOICES.find((p) => p.id === id)?.label ?? id;
  }

  onMount(() => {
    void loadDutchVoices().then((v) => {
      voices = v;
      voicesLoaded = true;
    });
    void storedVoices().then((s) => (piperStored = s));
    return () => stopAll();
  });

  const v = $derived(app.settings.voice);

  async function testVoice(text?: string): Promise<void> {
    const line = text ?? pickLine('intro', app.windyLines, lineContext())?.text ?? 'Hallo schatjes, het is hier Windy!';
    testing = true;
    await speak(line, { ...$state.snapshot(app.settings.voice), enabled: true }, {
      onStart: () => {
        testing = false;
        talking = true;
      },
    });
    testing = false;
    talking = false;
  }

  function preset(pitch: number, rate: number): void {
    app.settings.voice.pitch = pitch;
    app.settings.voice.rate = rate;
    void testVoice();
  }

  // --- Uitspraken ---
  let openCategory = $state<LineCategory | null>(null);
  let draft = $state('');
  let confirmDelete = $state<string | null>(null);
  let textarea = $state<HTMLTextAreaElement | undefined>();

  const PLACEHOLDERS = [
    { key: '{saboteur}', label: () => app.settings.saboteurName },
    { key: '{zoon}', label: () => app.settings.sonName },
    { key: '{windy}', label: () => app.settings.hostName },
    { key: '{speler}', label: () => 'naam van een speler' },
  ];

  function toggleBuiltIn(id: string): void {
    const d = app.windyLines.disabled;
    app.windyLines.disabled = d.includes(id) ? d.filter((x) => x !== id) : [...d, id];
  }

  function insert(key: string): void {
    const el = textarea;
    if (!el) {
      draft += key;
      return;
    }
    const start = el.selectionStart ?? draft.length;
    const end = el.selectionEnd ?? draft.length;
    draft = draft.slice(0, start) + key + draft.slice(end);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + key.length, start + key.length);
    });
  }

  function addLine(category: LineCategory): void {
    const text = draft.trim();
    if (!text) return;
    if (app.windyLines.custom.length >= MAX_CUSTOM_LINES) {
      showToast(`Maximum ${MAX_CUSTOM_LINES} eigen uitspraken.`, 'error');
      return;
    }
    app.windyLines.custom = [...app.windyLines.custom, { id: newId(), category, text, builtIn: false }];
    draft = '';
    showToast('Uitspraak toegevoegd!');
  }

  function removeLine(id: string): void {
    app.windyLines.custom = app.windyLines.custom.filter((l) => l.id !== id);
    confirmDelete = null;
  }

  function open(category: LineCategory): void {
    openCategory = openCategory === category ? null : category;
    draft = '';
    confirmDelete = null;
  }

  /** Toont plaatshouders als gekleurde labels in de lijst. */
  function parts(text: string): { t: string; ph: boolean }[] {
    return text.split(/(\{(?:saboteur|zoon|windy|speler)\})/g).filter(Boolean).map((t) => ({ t, ph: /^\{.*\}$/.test(t) }));
  }
</script>

<main class="page">
  <TopBar title={app.settings.hostName} emoji="🎙️" />

  <div class="tabs">
    <Segmented
      label="Onderdeel"
      value={tab}
      options={[
        { value: 'stem', label: '🔊 Stem' },
        { value: 'uitspraken', label: '💬 Uitspraken' },
      ]}
      onchange={(t) => (tab = t)}
    />
  </div>

  {#if tab === 'stem'}
    <section class="section hero">
      <button type="button" class="windy-btn" aria-label="Tik om haar gezicht te veranderen" onclick={() => (moodIndex = (moodIndex + 1) % moods.length)}>
        <Windy mood={moods[moodIndex]} size={170} {talking} />
      </button>
      <p class="hint">Tik op {app.settings.hostName} om haar gezicht te veranderen.</p>
    </section>

    <section class="section">
      <h2>🔊 Voorlezen</h2>
      <Toggle
        label="Voorlezen"
        description="{app.settings.hostName} leest alles hardop voor."
        checked={v.enabled}
        onchange={(on) => (app.settings.voice.enabled = on)}
      />
      <span class="field-label">Welke stem?</span>
      <Segmented
        label="Soort stem"
        value={v.engine}
        options={[
          { value: 'piper', label: '✨ Vlaamse AI-stem', sub: 'aanbevolen' },
          { value: 'toestel', label: '📱 Stem van het toestel', sub: 'reserve' },
        ]}
        onchange={(e) => (app.settings.voice.engine = e)}
      />
    </section>

    {#if v.engine === 'piper'}
      <section class="section">
        <h2>✨ Vlaamse AI-stem</h2>
        {#if piperStored === null}
          <p class="hint">Even kijken welke stemmen er op de tablet staan...</p>
        {:else if !piperStored.includes(v.piperVoice)}
          <p class="warn">
            De stem {voiceLabel(v.piperVoice)} staat nog niet op dit toestel. Download ze eerst (met wifi) in de stemtest.
            Tot dan leest de stem van het toestel voor.
          </p>
        {:else}
          <p class="ok">✓ {voiceLabel(v.piperVoice)} staat op dit toestel en werkt ook zonder internet.</p>
        {/if}

        <span class="field-label">Stem</span>
        <div class="chips">
          {#each PIPER_VOICES as pv (pv.id)}
            <button type="button" class="chip" aria-pressed={v.piperVoice === pv.id} onclick={() => (app.settings.voice.piperVoice = pv.id)}>
              {pv.label}{piperStored?.includes(pv.id) ? ' ✓' : ''}
            </button>
          {/each}
        </div>

        <span class="field-label">Hoe hoog?</span>
        <div class="chips">
          {#each PIPER_PITCHES as p (p.value)}
            <button type="button" class="chip" aria-pressed={Math.abs(v.piperPitch - p.value) < 0.001} onclick={() => ((app.settings.voice.piperPitch = p.value), void testVoice())}>
              {p.label}
            </button>
          {/each}
        </div>
        <input
          type="range"
          min={PIPER_PITCH_RANGE.min}
          max={PIPER_PITCH_RANGE.max}
          step="0.02"
          bind:value={app.settings.voice.piperPitch}
          aria-label="Toonhoogte AI-stem"
        />
        <div class="scale"><span>laag</span><span>hoog</span></div>

        <div class="test">
          <BigButton variant="secondary" full onclick={() => testVoice()}>{testing ? '⏳ Even denken...' : '▶ Test de stem'}</BigButton>
          <button type="button" class="link" onclick={() => go('stemtest')}>🧪 Stemmen downloaden, vergelijken of wissen</button>
        </div>
      </section>
    {:else}
    <section class="section">
      <h2>📱 Stem van het toestel</h2>
      {#if !speechSupported()}
        <p class="warn">Deze browser kan niet voorlezen. Gebruik Chrome op de tablet.</p>
      {:else}
        <label class="field-label" for="voice">Stem</label>
        {#if voicesLoaded && voices.length === 0}
          <p class="warn">
            Geen Nederlandse stem gevonden. Kies liefst de Vlaamse AI-stem hierboven. Wil je toch de stem van het toestel,
            dan op een Samsung: <b>Instellingen → Algemeen beheer → Tekst-naar-spraak</b> (soms onder <b>Taal en invoer</b>).
            Kies als voorkeursengine <b>Spraakservices van Google</b> (anders eerst gratis installeren via de Play Store), tik op
            het tandwiel ernaast → <b>Spraakgegevens installeren</b> → <b>Nederlands (België)</b>.
          </p>
        {:else}
          <select id="voice" class="text-input" bind:value={app.settings.voice.voiceURI}>
            <option value={null}>Automatisch (beste Nederlandse stem)</option>
            {#each voices as voice (voice.voiceURI)}
              <option value={voice.voiceURI}>{voice.name} ({voice.lang}){voice.localService ? '' : ' - online'}</option>
            {/each}
          </select>
          <p class="hint">Stemmen met "online" werken niet zonder internet. Kies liefst een andere.</p>
        {/if}

        <span class="field-label">Snel kiezen</span>
        <div class="presets">
          <button type="button" class="chip" onclick={() => preset(1.35, 1.05)}>🎀 Windy</button>
          <button type="button" class="chip" onclick={() => preset(1.75, 1.15)}>🐭 Nog hoger</button>
          <button type="button" class="chip" onclick={() => preset(1, 1)}>🙂 Gewoon</button>
        </div>

        <label class="field-label" for="pitch">Toonhoogte: {v.pitch.toFixed(2)}</label>
        <input id="pitch" type="range" min={PITCH_RANGE.min} max={PITCH_RANGE.max} step="0.05" bind:value={app.settings.voice.pitch} />
        <div class="scale"><span>laag</span><span>hoog</span></div>

        <label class="field-label" for="rate">Snelheid: {v.rate.toFixed(2)}</label>
        <input id="rate" type="range" min={RATE_RANGE.min} max={RATE_RANGE.max} step="0.05" bind:value={app.settings.voice.rate} />
        <div class="scale"><span>traag</span><span>snel</span></div>

        <div class="test">
          <BigButton variant="secondary" full onclick={() => testVoice()}>▶ Test de stem</BigButton>
          <button
            type="button"
            class="link"
            onclick={() => {
              app.settings.voice = { ...defaultVoice(), enabled: v.enabled, engine: 'toestel' };
            }}>Terug naar standaard</button
          >
        </div>
      {/if}
    </section>
    {/if}
  {:else}
    <section class="section">
      <h2>💬 Wat zegt {app.settings.hostName}?</h2>
      <p class="hint">
        Tik op een soort om de uitspraken te zien. Zet er uit die je niet goed vindt en voeg er zelf toe. Gebruik gerust
        deze woorden, die worden automatisch ingevuld:
      </p>
      <div class="phs">
        {#each PLACEHOLDERS as ph (ph.key)}
          <span class="ph">{ph.key}</span><span class="phl">= {ph.label()}</span>
        {/each}
      </div>
    </section>

    {#each LINE_CATEGORIES as cat (cat.id)}
      {@const all = linesFor(cat.id, app.windyLines, true)}
      {@const active = all.filter((l) => !app.windyLines.disabled.includes(l.id)).length}
      <section class="section cat">
        <button type="button" class="cat-head" aria-expanded={openCategory === cat.id} onclick={() => open(cat.id)}>
          <span class="cat-emoji">{cat.emoji}</span>
          <span class="cat-text">
            <span class="cat-label">{cat.label}</span>
            <span class="cat-hint">{cat.hint}</span>
          </span>
          <span class="cat-count" class:empty={active === 0}>{active}</span>
          <span class="chev" aria-hidden="true">{openCategory === cat.id ? '▲' : '▼'}</span>
        </button>

        {#if openCategory === cat.id}
          <div class="cat-body">
          {#if active === 0}
            <p class="warn">Er staat geen enkele uitspraak aan: {app.settings.hostName} zegt hier dan niets.</p>
          {/if}
          <ul class="lines">
            {#each all as line (line.id)}
              {@const off = app.windyLines.disabled.includes(line.id)}
              <li class:off>
                <button
                  type="button"
                  class="play"
                  aria-label="Beluister"
                  onclick={() => testVoice(fillPlaceholders(line.text, lineContext(app.players[0]?.name ?? 'Lotte')))}>▶</button
                >
                <span class="text">
                  {#each parts(line.text) as part, i (i)}
                    {#if part.ph}<span class="ph">{part.t}</span>{:else}{part.t}{/if}
                  {/each}
                  {#if !line.builtIn}<span class="own">eigen</span>{/if}
                </span>
                {#if line.builtIn}
                  <button type="button" class="onoff" aria-pressed={!off} onclick={() => toggleBuiltIn(line.id)}>
                    {off ? 'uit' : 'aan'}
                  </button>
                {:else if confirmDelete === line.id}
                  <button type="button" class="onoff del sure" onclick={() => removeLine(line.id)}>Wissen?</button>
                {:else}
                  <button type="button" class="onoff del" aria-label="Verwijder" onclick={() => (confirmDelete = line.id)}>🗑️</button>
                {/if}
              </li>
            {/each}
          </ul>

          <label class="field-label" for="new-{cat.id}">Zelf een uitspraak toevoegen</label>
          <textarea
            id="new-{cat.id}"
            class="text-input area"
            rows="3"
            maxlength={MAX_LINE_LENGTH}
            placeholder="bv. Onzen {'{zoon}'} heeft weer al mijn koekjes opgegeten!"
            bind:value={draft}
            bind:this={textarea}
          ></textarea>
          <div class="insert">
            {#each PLACEHOLDERS as ph (ph.key)}
              {#if ph.key !== '{speler}' || cat.id === 'doorgeven'}
                <button type="button" class="ins" onclick={() => insert(ph.key)}>+ {ph.key}</button>
              {/if}
            {/each}
            <span class="left">{MAX_LINE_LENGTH - draft.length}</span>
          </div>
          <div class="add-actions">
            <BigButton variant="ghost" disabled={!draft.trim()} onclick={() => testVoice(fillPlaceholders(draft, lineContext('Lotte')))}>▶ Probeer</BigButton>
            <BigButton variant="secondary" disabled={!draft.trim()} onclick={() => addLine(cat.id)}>＋ Toevoegen</BigButton>
          </div>
          </div>
        {/if}
      </section>
    {/each}
  {/if}
</main>

<style>
  .tabs {
    margin-bottom: 18px;
  }

  .ok {
    color: var(--turquoise);
    font-weight: 800;
  }

  .hero {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .windy-btn {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
  }

  .warn {
    padding: 12px 14px;
    border-radius: var(--radius-sm);
    background: rgba(255, 207, 63, 0.12);
    color: var(--gold);
    font-weight: 700;
  }

  select.text-input {
    appearance: auto;
  }

  .presets {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
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

  .test {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    margin-top: 16px;
  }

  .link {
    background: none;
    border: none;
    color: var(--text-dim);
    text-decoration: underline;
    font-weight: 700;
    padding: 8px;
    cursor: pointer;
  }

  .phs {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 6px 10px;
    align-items: center;
  }

  .ph {
    display: inline-block;
    background: rgba(41, 211, 196, 0.2);
    color: var(--turquoise);
    border-radius: 8px;
    padding: 0 6px;
    font-weight: 800;
  }

  .phl {
    color: var(--text-soft);
  }

  .cat {
    padding: 0;
    overflow: hidden;
  }

  .cat-head {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 16px 20px;
    background: none;
    border: none;
    text-align: left;
    cursor: pointer;
  }

  .cat-emoji {
    font-size: 1.8rem;
  }

  .cat-text {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .cat-label {
    font-family: var(--font-title);
    font-weight: 700;
    font-size: 1.2rem;
  }

  .cat-hint {
    color: var(--text-dim);
    font-size: 0.9rem;
  }

  .cat-count {
    min-width: 36px;
    height: 36px;
    border-radius: 999px;
    background: rgba(41, 211, 196, 0.2);
    color: var(--turquoise);
    font-weight: 800;
    display: grid;
    place-items: center;
  }

  .cat-count.empty {
    background: rgba(255, 207, 63, 0.2);
    color: var(--gold);
  }

  .chev {
    color: var(--text-dim);
  }

  .cat-body {
    padding: 0 20px 20px;
  }

  .lines {
    list-style: none;
    padding: 0;
    display: grid;
    gap: 8px;
  }

  .lines li {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 14px;
    background: var(--bg-deep);
  }

  .lines li.off .text {
    opacity: 0.4;
    text-decoration: line-through;
  }

  .text {
    flex: 1;
  }

  .own {
    margin-left: 6px;
    font-size: 0.75rem;
    background: var(--gold);
    color: #3a2500;
    border-radius: 999px;
    padding: 1px 8px;
    font-weight: 800;
  }

  .play {
    flex: none;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: none;
    background: rgba(255, 79, 163, 0.2);
    color: var(--pink);
    font-size: 1rem;
    cursor: pointer;
  }

  .onoff {
    flex: none;
    min-width: 60px;
    height: 44px;
    border-radius: 999px;
    border: 2px solid var(--line);
    background: transparent;
    color: var(--text-dim);
    font-weight: 800;
    cursor: pointer;
  }

  .onoff[aria-pressed='true'] {
    background: var(--turquoise);
    border-color: var(--turquoise);
    color: #0d2b33;
  }

  .onoff.sure {
    background: var(--danger);
    border-color: var(--danger);
    color: #fff;
  }

  .area {
    resize: vertical;
    font-size: 1.05rem;
  }

  .insert {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    margin-top: 8px;
  }

  .ins {
    border: 2px solid rgba(41, 211, 196, 0.4);
    background: transparent;
    color: var(--turquoise);
    border-radius: 999px;
    padding: 6px 12px;
    font-weight: 800;
    cursor: pointer;
  }

  .left {
    margin-left: auto;
    color: var(--text-dim);
    font-size: 0.85rem;
  }

  .add-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    margin-top: 12px;
    flex-wrap: wrap;
  }
</style>
