<script lang="ts" module>
  let rememberedTab: 'bieb' | 'ai' | 'nieuw' = 'bieb';
</script>

<script lang="ts">
  import BigButton from '../components/BigButton.svelte';
  import Segmented from '../components/Segmented.svelte';
  import TaskEditor from '../components/TaskEditor.svelte';
  import TopBar from '../components/TopBar.svelte';
  import { AiError, askGemini, buildPrompt } from '../lib/ai';
  import { LOCATIONS } from '../lib/data/locations';
  import { SUPPLIES } from '../lib/data/supplies';
  import { app, deleteCustomTask, saveCustomTask, showToast } from '../lib/store.svelte';
  import { CATEGORY_LABELS } from '../lib/tasks/labels';
  import { fillVars } from '../lib/tasks/program';
  import { allTasks } from '../lib/tasks/registry';
  import type { TaskCategory, TaskDef } from '../lib/tasks/types';
  import { CATEGORIES, extractJsonArray, validateTask, type ValidationResult } from '../lib/tasks/validate';
  import type { LocationId } from '../lib/types';

  let tab = $state(rememberedTab);
  $effect(() => {
    rememberedTab = tab;
  });

  // --- Bibliotheek ---
  let search = $state('');
  let loc = $state<LocationId | 'alle'>('alle');
  let cat = $state<TaskCategory | 'alle'>('alle');
  let src = $state<'alle' | 'ingebouwd' | 'eigen'>('alle');
  let open = $state<TaskDef | null>(null);
  let showSabotage = $state(false);
  let editing = $state<TaskDef | null | 'nieuw'>(null);
  let confirmDelete = $state(false);

  // Na een wijziging opnieuw berekenen (eigen opdrachten zitten in app.customTasks).
  const tasks = $derived.by(() => {
    void app.customTasks.length;
    void app.customTasks;
    return allTasks();
  });
  const filtered = $derived(
    tasks.filter((t) => {
      if (loc !== 'alle' && !t.locations.includes(loc)) return false;
      if (cat !== 'alle' && t.category !== cat) return false;
      if (src === 'ingebouwd' && t.source && t.source !== 'ingebouwd') return false;
      if (src === 'eigen' && !(t.source === 'eigen' || t.source === 'ai')) return false;
      const q = search.trim().toLowerCase();
      return !q || t.title.toLowerCase().includes(q) || t.explain.toLowerCase().includes(q);
    }),
  );

  const preview = (t: TaskDef): string => fillVars(t.explain, Object.fromEntries(Object.entries(t.vars ?? {}).map(([k, v]) => [k, v.normaal[0] ?? '?'])));
  const own = (t: TaskDef): boolean => t.source === 'eigen' || t.source === 'ai';

  function removeOpen(): void {
    if (!open) return;
    const id = open.id;
    if (app.game?.program.some((p) => p.taskId === id) || app.draft?.program.some((p) => p.taskId === id)) {
      showToast('Deze opdracht zit in het lopende spel of het programma. Haal ze daar eerst weg.', 'error');
      confirmDelete = false;
      return;
    }
    deleteCustomTask(id);
    open = null;
    showToast('Opdracht verwijderd.');
  }

  function supplyLabel(id: string): string {
    const s = SUPPLIES.find((x) => x.id === id) ?? app.settings.customSupplies.find((c) => c.id === id);
    return s ? `${s.emoji} ${s.label}` : id;
  }

  // --- AI ---
  let count = $state(5);
  let theme = $state('');
  let aiLocations = $state<LocationId[]>([...app.settings.locations]);
  let pasted = $state('');
  let copied = $state(false);
  let asking = $state(false);
  let candidates = $state<(ValidationResult & { pick: boolean })[]>([]);
  let keyInput = $state('');
  let showKey = $state(false);

  const prompt = $derived(
    buildPrompt({
      count,
      locations: aiLocations,
      difficulty: app.settings.difficulty,
      playerCount: Math.max(4, app.players.length),
      supplies: app.settings.supplies,
      customSupplies: app.settings.customSupplies,
      theme,
      saboteurName: app.settings.saboteurName,
      hostName: app.settings.hostName,
      existingTitles: tasks.map((t) => t.title),
    }),
  );

  async function copyPrompt(): Promise<void> {
    try {
      await navigator.clipboard.writeText(prompt);
      copied = true;
      showToast('Gekopieerd! Plak het nu in de chatbot.');
    } catch {
      showToast('Kopiëren lukte niet: selecteer de tekst en kopieer met de hand.', 'error');
    }
  }

  function check(text: string): void {
    const list = extractJsonArray(text);
    if (!list) {
      showToast('Ik vind geen opdrachten in die tekst. Kopieer het hele antwoord van de chatbot.', 'error');
      return;
    }
    candidates = list.map((raw) => {
      const r = validateTask(raw, { customSupplies: app.settings.customSupplies, source: 'ai' });
      return { ...r, pick: r.task !== null };
    });
    showToast(`${candidates.filter((c) => c.task).length} van de ${candidates.length} opdrachten zijn in orde.`);
  }

  async function askNow(): Promise<void> {
    asking = true;
    try {
      const { text, model } = await askGemini(app.ai.geminiKey, prompt, app.ai.model || undefined);
      app.ai.model = model;
      check(text);
    } catch (err) {
      showToast(err instanceof AiError ? err.message : 'Er ging iets mis met de AI.', 'error');
    } finally {
      asking = false;
    }
  }

  function addPicked(): void {
    const picked = candidates.filter((c) => c.pick && c.task);
    for (const c of picked) if (c.task) saveCustomTask(c.task);
    showToast(`✨ ${picked.length} nieuwe opdrachten toegevoegd!`);
    candidates = [];
    pasted = '';
    tab = 'bieb';
    src = 'eigen';
  }

  function saveKey(): void {
    app.ai.geminiKey = keyInput.trim();
    app.ai.model = '';
    keyInput = '';
    showToast(app.ai.geminiKey ? 'Sleutel bewaard op deze tablet.' : 'Sleutel verwijderd.');
  }
</script>

<main class="page">
  <TopBar title="Opdrachten" emoji="📚" />

  {#if editing}
    <section class="section">
      <h2>{editing === 'nieuw' ? '✏️ Nieuwe opdracht' : own(editing) ? '✏️ Opdracht bewerken' : '✏️ Eigen versie maken'}</h2>
      <TaskEditor base={editing === 'nieuw' ? null : editing} ondone={() => ((editing = null), (open = null))} />
    </section>
  {:else}
    <div class="tabs">
      <Segmented
        label="Onderdeel"
        value={tab}
        options={[
          { value: 'bieb', label: '📚 Bibliotheek', sub: `${tasks.length} opdrachten` },
          { value: 'ai', label: '✨ Laten bedenken', sub: 'met AI' },
          { value: 'nieuw', label: '✏️ Zelf maken' },
        ]}
        onchange={(t) => (t === 'nieuw' ? (editing = 'nieuw') : (tab = t))}
      />
    </div>

    {#if tab === 'bieb'}
      <section class="section filters">
        <input class="text-input" bind:value={search} placeholder="🔎 Zoeken..." />
        <div class="selects">
          <select class="text-input" bind:value={loc} aria-label="Plek">
            <option value="alle">Alle plekken</option>
            {#each LOCATIONS as l (l.id)}<option value={l.id}>{l.emoji} {l.label}</option>{/each}
          </select>
          <select class="text-input" bind:value={cat} aria-label="Soort">
            <option value="alle">Alle soorten</option>
            {#each CATEGORIES as c (c)}<option value={c}>{CATEGORY_LABELS[c]}</option>{/each}
          </select>
          <select class="text-input" bind:value={src} aria-label="Bron">
            <option value="alle">Alles</option>
            <option value="ingebouwd">Ingebouwd</option>
            <option value="eigen">Eigen & AI</option>
          </select>
        </div>
        <p class="hint small">{filtered.length} opdrachten</p>
      </section>

      <ul class="list">
        {#each filtered as t (t.id)}
          {@const rating = app.taskStats.ratings[t.id] ?? 0}
          <li>
            <button type="button" class="item" onclick={() => ((open = t), (showSabotage = false), (confirmDelete = false))}>
              <span class="em">{t.emoji}</span>
              <span class="info">
                <span class="title">{t.title} {t.source === 'ai' ? '✨' : t.source === 'eigen' ? '✏️' : ''}</span>
                <span class="meta">{CATEGORY_LABELS[t.category]} · {t.locations.map((l) => LOCATIONS.find((x) => x.id === l)?.emoji).join('')} · {t.minutes} min{rating !== 0 ? ` · ${rating > 0 ? '👍' : '👎'}${Math.abs(rating)}` : ''}</span>
              </span>
            </button>
          </li>
        {/each}
      </ul>
    {:else if tab === 'ai'}
      <section class="section">
        <h2>✨ Nieuwe opdrachten laten bedenken</h2>
        <p class="hint">De AI bedenkt opdrachten die passen bij jullie plekken en spullen. Jij keurt ze daarna één voor één goed. Hiervoor is internet nodig; de goedgekeurde opdrachten werken daarna ook offline.</p>
        <div class="row">
          <label class="field-label" for="ai-count">Hoeveel?</label>
          <div class="chips">
            {#each [5, 10, 15] as n (n)}<button type="button" class="chip" aria-pressed={count === n} onclick={() => (count = n)}>{n}</button>{/each}
          </div>
        </div>
        <span class="field-label">Waar?</span>
        <div class="chips">
          {#each LOCATIONS as l (l.id)}
            <button type="button" class="chip" aria-pressed={aiLocations.includes(l.id)} onclick={() => (aiLocations = aiLocations.includes(l.id) ? aiLocations.filter((x) => x !== l.id) : [...aiLocations, l.id])}>
              <span class="emoji">{l.emoji}</span>{l.label}
            </button>
          {/each}
        </div>
        <label class="field-label" for="ai-theme">Thema (mag leeg)</label>
        <input id="ai-theme" class="text-input" bind:value={theme} maxlength="80" placeholder="bv. piraten, ruimte, Halloween, dieren..." />
      </section>

      {#if app.ai.geminiKey}
        <section class="section">
          <h2>🚀 Meteen bedenken (Gemini)</h2>
          <BigButton variant="gold" size="large" full disabled={asking || aiLocations.length === 0} onclick={askNow}>
            {asking ? '⏳ De AI denkt na...' : `✨ Bedenk ${count} opdrachten`}
          </BigButton>
        </section>
      {/if}

      <section class="section">
        <h2>📋 Via een gratis chatbot (werkt altijd)</h2>
        <ol class="steps">
          <li>
            Tik op <strong>Kopieer de vraag</strong>.
            <BigButton variant="secondary" disabled={aiLocations.length === 0} onclick={copyPrompt}>{copied ? '✓ Gekopieerd' : '📋 Kopieer de vraag'}</BigButton>
          </li>
          <li>
            Open een gratis chatbot, plak de vraag en verstuur ze:
            <span class="links">
              <a href="https://chatgpt.com" target="_blank" rel="noopener">ChatGPT</a>
              <a href="https://gemini.google.com" target="_blank" rel="noopener">Gemini</a>
              <a href="https://claude.ai" target="_blank" rel="noopener">Claude</a>
            </span>
          </li>
          <li>Kopieer het hele antwoord (er staat meestal een kopieerknopje onder het codeblok) en plak het hieronder.</li>
        </ol>
        <details class="prompt"><summary>De vraag bekijken</summary><pre>{prompt}</pre></details>
        <textarea class="text-input area" rows="5" bind:value={pasted} placeholder="Plak hier het antwoord van de chatbot..."></textarea>
        <BigButton variant="primary" full disabled={pasted.trim().length < 10} onclick={() => check(pasted)}>🔍 Controleer de opdrachten</BigButton>
      </section>

      {#if candidates.length > 0}
        <section class="section">
          <h2>✅ Goedkeuren</h2>
          <ul class="cands">
            {#each candidates as c, i (i)}
              <li class:bad={!c.task}>
                {#if c.task}
                  <label class="cand">
                    <input type="checkbox" bind:checked={candidates[i]!.pick} />
                    <span>
                      <strong>{c.task.emoji} {c.task.title}</strong> <span class="hint small">{CATEGORY_LABELS[c.task.category]} · {c.task.minutes} min</span><br />
                      {preview(c.task)}
                      {#if c.warnings.length > 0}<br /><span class="warn-txt">⚠️ {c.warnings.join(' ')}</span>{/if}
                    </span>
                  </label>
                {:else}
                  <span>❌ Afgekeurd: {c.errors.join(' ')}</span>
                {/if}
              </li>
            {/each}
          </ul>
          <BigButton variant="gold" size="large" full disabled={!candidates.some((c) => c.pick && c.task)} onclick={addPicked}>
            ＋ Voeg {candidates.filter((c) => c.pick && c.task).length} opdrachten toe
          </BigButton>
        </section>
      {/if}

      <section class="section">
        <button type="button" class="key-head" onclick={() => (showKey = !showKey)}>
          🔑 {app.ai.geminiKey ? 'Gemini-sleutel is ingesteld' : 'Gratis Gemini-sleutel instellen (optioneel)'} {showKey ? '▲' : '▼'}
        </button>
        {#if showKey}
          <ol class="steps">
            <li>Ga naar <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a> en log in met een Google-account.</li>
            <li>Tik op <strong>Create API key</strong> en kopieer de sleutel.</li>
            <li>Plak hem hieronder. <strong>Koppel géén betaalgegevens</strong> aan je Google-account: dan blijft het gratis en kan er nooit iets aangerekend worden.</li>
          </ol>
          <input class="text-input" type="password" bind:value={keyInput} placeholder={app.ai.geminiKey ? '•••••••• (ingesteld)' : 'Plak hier je sleutel'} autocomplete="off" />
          <div class="row">
            <BigButton variant="secondary" disabled={!keyInput.trim()} onclick={saveKey}>Bewaren</BigButton>
            {#if app.ai.geminiKey}<BigButton variant="danger" onclick={() => ((keyInput = ''), saveKey())}>Sleutel verwijderen</BigButton>{/if}
          </div>
          <p class="hint small">De sleutel blijft enkel op deze tablet en gaat nooit mee in een back-up.</p>
        {/if}
      </section>
    {/if}
  {/if}
</main>

{#if open && !editing}
  <div class="overlay" role="presentation" onclick={() => (open = null)}>
    <div class="sheet" role="dialog" aria-modal="true" aria-label={open.title} tabindex="-1" onclick={(e) => e.stopPropagation()} onkeydown={() => {}}>
      <h2>{open.emoji} {open.title}</h2>
      <p class="hint">{CATEGORY_LABELS[open.category]} · {open.minutes} min · {open.locations.map((l) => LOCATIONS.find((x) => x.id === l)?.label).join(', ')}</p>
      <p>{preview(open)}</p>
      {#if open.supplies.length > 0}<p class="hint">Nodig: {open.supplies.map(supplyLabel).join(', ')}</p>{/if}
      {#if open.prep}<p class="hint">📝 {open.prep}</p>{/if}
      <button type="button" class="link" onclick={() => (showSabotage = !showSabotage)}>😈 {showSabotage ? 'Verberg' : 'Toon'} de sabotagetips</button>
      {#if showSabotage}<ul>{#each open.sabotage as s (s)}<li>{s}</li>{/each}</ul>{/if}
      <div class="row">
        {#if own(open)}
          <BigButton variant="secondary" onclick={() => (editing = open)}>✏️ Bewerken</BigButton>
          {#if confirmDelete}
            <BigButton variant="danger" onclick={removeOpen}>Ja, verwijder</BigButton>
          {:else}
            <BigButton variant="danger" onclick={() => (confirmDelete = true)}>🗑️ Verwijderen</BigButton>
          {/if}
        {:else}
          <BigButton variant="secondary" onclick={() => (editing = open)}>✏️ Eigen versie maken</BigButton>
        {/if}
        <BigButton variant="ghost" onclick={() => (open = null)}>Sluiten</BigButton>
      </div>
    </div>
  </div>
{/if}

<style>
  .tabs {
    margin-bottom: 18px;
  }

  .filters {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .selects {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
    gap: 8px;
  }

  select.text-input {
    appearance: auto;
    font-size: 1rem;
  }

  .small {
    margin: 0;
    font-size: 0.85rem;
  }

  .list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 8px;
  }

  .item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px 16px;
    border-radius: 16px;
    border: 1px solid var(--line);
    background: var(--bg-raised);
    text-align: left;
    cursor: pointer;
  }

  .em {
    font-size: 2rem;
  }

  .info {
    display: flex;
    flex-direction: column;
  }

  .title {
    font-family: var(--font-title);
    font-weight: 700;
  }

  .meta {
    color: var(--text-dim);
    font-size: 0.85rem;
  }

  .row {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    align-items: center;
    margin-top: 10px;
  }

  .steps {
    padding-left: 22px;
    display: grid;
    gap: 12px;
  }

  .steps li :global(.btn) {
    margin-top: 8px;
  }

  .links {
    display: flex;
    gap: 14px;
    margin-top: 6px;
  }

  a {
    color: var(--turquoise);
    font-weight: 800;
  }

  .prompt summary {
    cursor: pointer;
    color: var(--text-dim);
    font-weight: 700;
    margin-bottom: 8px;
  }

  pre {
    white-space: pre-wrap;
    font-size: 0.8rem;
    background: var(--bg-deep);
    padding: 12px;
    border-radius: 12px;
    max-height: 240px;
    overflow: auto;
  }

  .area {
    margin: 10px 0;
    resize: vertical;
    font-size: 0.95rem;
  }

  .cands {
    list-style: none;
    padding: 0;
    display: grid;
    gap: 10px;
  }

  .cands li {
    padding: 12px;
    border-radius: 14px;
    background: var(--bg-deep);
  }

  .cands li.bad {
    color: var(--danger);
  }

  .cand {
    display: flex;
    gap: 12px;
    align-items: flex-start;
  }

  .cand input {
    width: 26px;
    height: 26px;
    flex: none;
    accent-color: var(--turquoise);
  }

  .warn-txt {
    color: var(--gold);
    font-size: 0.85rem;
  }

  .key-head {
    width: 100%;
    background: none;
    border: none;
    text-align: left;
    font-weight: 800;
    font-size: 1.05rem;
    cursor: pointer;
  }

  .link {
    background: none;
    border: none;
    color: var(--turquoise);
    font-weight: 800;
    padding: 6px 0;
    cursor: pointer;
  }

  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(10, 0, 30, 0.7);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    z-index: 50;
  }

  .sheet {
    width: min(680px, 100%);
    max-height: 88dvh;
    overflow-y: auto;
    background: var(--bg-raised);
    border-radius: 28px 28px 0 0;
    padding: 22px;
    outline: none;
  }
</style>
