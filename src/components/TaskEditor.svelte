<script lang="ts">
  import { untrack } from 'svelte';
  import { LOCATIONS } from '../lib/data/locations';
  import { SUPPLIES } from '../lib/data/supplies';
  import { app, saveCustomTask, showToast } from '../lib/store.svelte';
  import { CATEGORY_LABELS } from '../lib/tasks/labels';
  import type { TaskDef } from '../lib/tasks/types';
  import { CATEGORIES, validateTask } from '../lib/tasks/validate';
  import type { LocationId } from '../lib/types';
  import BigButton from './BigButton.svelte';

  interface Props {
    /** Bestaande eigen opdracht om te bewerken, of een ingebouwde als basis voor een kopie. */
    base?: TaskDef | null;
    ondone: () => void;
  }

  let { base = null, ondone }: Props = $props();

  const start = untrack(() => base);
  const editingOwn = start?.source === 'eigen' || start?.source === 'ai';

  let title = $state(start ? (editingOwn ? start.title : `${start.title} (eigen versie)`) : '');
  let emoji = $state(start?.emoji ?? '⭐');
  let category = $state(start?.category ?? 'samenwerken');
  let locations = $state<LocationId[]>(start ? [...start.locations] : [...untrack(() => app.settings.locations)]);
  let supplies = $state<string[]>(start ? [...start.supplies] : []);
  let minutes = $state(start?.minutes ?? 7);
  let timer = $state<number | ''>(typeof start?.timer === 'number' ? start.timer : '');
  let scoringType = $state<'gelukt' | 'aantal'>(start?.scoring.type === 'aantal' ? 'aantal' : 'gelukt');
  const startTarget = start?.scoring.type === 'aantal' ? start.scoring.target : 5;
  let target = $state(typeof startTarget === 'number' ? startTarget : Number(String(startTarget).replace(/\{(\w+)\}/, (_, k: string) => String(start?.vars?.[k]?.normaal[0] ?? 5))) || 5);
  let unit = $state(start?.scoring.type === 'aantal' ? start.scoring.unit : 'punten');
  // Variabelen van een ingebouwde opdracht invullen met de 'normaal'-waarde, zodat de tekst leesbaar is.
  const fill = (s: string): string => s.replace(/\{(\w+)\}/g, (m, k: string) => String(start?.vars?.[k]?.normaal[0] ?? m));
  let explain = $state(start ? fill(start.explain) : '');
  let prep = $state(start?.prep ? fill(start.prep) : '');
  let sabotage = $state<string[]>(start ? [...start.sabotage, '', ''].slice(0, Math.max(3, start.sabotage.length)) : ['', '', '']);
  let detective = $state<string[]>(start?.detective ? [...start.detective, ''].slice(0, Math.max(3, start.detective.length)) : ['', '', '']);
  let photo = $state(start?.photo ?? '');
  let dilemma = $state(start?.dilemma ?? false);
  let errors = $state<string[]>([]);

  const allSupplies = $derived([...SUPPLIES, ...app.settings.customSupplies]);

  function toggle<T>(list: T[], v: T): T[] {
    return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
  }

  function save(): void {
    const raw = {
      id: editingOwn ? start?.id : undefined,
      title,
      emoji,
      category,
      locations,
      supplies,
      minPlayers: 3,
      minutes,
      timer: timer === '' ? undefined : Number(timer),
      explain,
      prep,
      scoring: scoringType === 'aantal' ? { type: 'aantal', target: Number(target), unit } : { type: 'gelukt' },
      sabotage: sabotage.filter((s) => s.trim() !== ''),
      detective: detective.filter((s) => s.trim() !== ''),
      photo,
      dilemma,
      source: editingOwn ? start?.source : 'eigen',
    };
    const source = editingOwn && start?.source === 'ai' ? 'ai' : 'eigen';
    const r = validateTask(raw, { customSupplies: app.settings.customSupplies, source, keepId: editingOwn });
    errors = r.errors;
    if (!r.task) return;
    saveCustomTask(r.task);
    showToast(editingOwn ? 'Opdracht bewaard!' : 'Nieuwe opdracht toegevoegd!');
    ondone();
  }
</script>

<div class="editor">
  <div class="row2">
    <div class="em-field">
      <label class="field-label" for="t-emoji">Icoon</label>
      <input id="t-emoji" class="text-input em" bind:value={emoji} maxlength="4" />
    </div>
    <div class="grow">
      <label class="field-label" for="t-title">Titel</label>
      <input id="t-title" class="text-input" bind:value={title} maxlength="60" placeholder="bv. De trampolinetelling" />
    </div>
  </div>

  <label class="field-label" for="t-cat">Soort</label>
  <select id="t-cat" class="text-input" bind:value={category}>
    {#each CATEGORIES as c (c)}<option value={c}>{CATEGORY_LABELS[c]}</option>{/each}
  </select>

  <span class="field-label">Waar kan het?</span>
  <div class="chips">
    {#each LOCATIONS as l (l.id)}
      <button type="button" class="chip" aria-pressed={locations.includes(l.id)} onclick={() => (locations = toggle(locations, l.id))}>
        <span class="emoji">{l.emoji}</span>{l.label}
      </button>
    {/each}
  </div>

  <label class="field-label" for="t-explain">Uitleg (wordt voorgelezen)</label>
  <textarea id="t-explain" class="text-input area" rows="4" bind:value={explain} maxlength="900" placeholder="Wat moet de groep doen? Wanneer is het gelukt?"></textarea>

  <span class="field-label">Benodigdheden</span>
  <details class="sup">
    <summary>{supplies.length === 0 ? 'Geen (tik om te kiezen)' : supplies.map((id) => allSupplies.find((s) => s.id === id)?.label ?? id).join(', ')}</summary>
    <div class="chips">
      {#each allSupplies as s (s.id)}
        <button type="button" class="chip small" aria-pressed={supplies.includes(s.id)} onclick={() => (supplies = toggle(supplies, s.id))}>
          <span class="emoji">{s.emoji}</span>{s.label}
        </button>
      {/each}
    </div>
  </details>

  <div class="row2">
    <div class="grow">
      <label class="field-label" for="t-min">Duur (minuten)</label>
      <input id="t-min" class="text-input" type="number" min="2" max="20" bind:value={minutes} />
    </div>
    <div class="grow">
      <label class="field-label" for="t-timer">Timer (seconden, mag leeg)</label>
      <input id="t-timer" class="text-input" type="number" min="10" max="1200" bind:value={timer} placeholder="geen" />
    </div>
  </div>

  <span class="field-label">Hoe tel je het resultaat?</span>
  <div class="chips">
    <button type="button" class="chip" aria-pressed={scoringType === 'gelukt'} onclick={() => (scoringType = 'gelukt')}>🎉 Gelukt / bijna / mislukt</button>
    <button type="button" class="chip" aria-pressed={scoringType === 'aantal'} onclick={() => (scoringType = 'aantal')}>🔢 Tellen</button>
  </div>
  {#if scoringType === 'aantal'}
    <div class="row2">
      <div class="grow">
        <label class="field-label" for="t-target">Doel</label>
        <input id="t-target" class="text-input" type="number" min="1" max="999" bind:value={target} />
      </div>
      <div class="grow">
        <label class="field-label" for="t-unit">Wat tel je?</label>
        <input id="t-unit" class="text-input" bind:value={unit} maxlength="30" placeholder="bv. ballen" />
      </div>
    </div>
  {/if}

  <span class="field-label">😈 Sabotagetips voor 't Duvelke (minstens 2)</span>
  {#each sabotage as _, i (i)}
    <input class="text-input tip" bind:value={sabotage[i]} maxlength="200" placeholder="bv. Tel stiekem verkeerd." />
  {/each}
  <button type="button" class="link" onclick={() => (sabotage = [...sabotage, ''])}>+ nog een tip</button>
  <p class="hint">Een goede tip past binnen de regels van de opdracht en valt niet op, ook niet als je hem twee keer doet.</p>

  <span class="field-label">🔎 Speurderstips: waar letten de anderen op? (mag leeg)</span>
  {#each detective as _, i (i)}
    <input class="text-input tip" bind:value={detective[i]} maxlength="200" placeholder="bv. Tel zelf stil mee: klopt het getal?" />
  {/each}
  <button type="button" class="link" onclick={() => (detective = [...detective, ''])}>+ nog een tip</button>

  <label class="field-label" for="t-prep">Voorbereiding voor het hulpje (mag leeg)</label>
  <input id="t-prep" class="text-input" bind:value={prep} maxlength="400" placeholder="bv. Verstop 10 knuffels." />

  <label class="field-label" for="t-photo">Idee voor een bewijsfoto (mag leeg)</label>
  <input id="t-photo" class="text-input" bind:value={photo} maxlength="120" />

  <label class="check"><input type="checkbox" bind:checked={dilemma} /> Na deze opdracht mag er een dilemma (schat of Kijk-joker) komen</label>

  {#if errors.length > 0}
    <ul class="errors">{#each errors as e (e)}<li>{e}</li>{/each}</ul>
  {/if}

  <div class="actions">
    <BigButton variant="gold" onclick={save}>💾 Bewaren</BigButton>
    <BigButton variant="ghost" onclick={ondone}>Annuleren</BigButton>
  </div>
</div>

<style>
  .editor {
    display: flex;
    flex-direction: column;
  }

  .row2 {
    display: flex;
    gap: 12px;
  }

  .grow {
    flex: 1;
  }

  .em-field {
    width: 90px;
  }

  .em {
    text-align: center;
    font-size: 1.6rem;
  }

  select.text-input {
    appearance: auto;
  }

  .area {
    resize: vertical;
  }

  .sup summary {
    cursor: pointer;
    padding: 12px 14px;
    border-radius: var(--radius-sm);
    background: var(--bg-deep);
    border: 2px solid var(--line);
    font-weight: 700;
    margin-bottom: 10px;
  }

  .chip.small {
    min-height: 44px;
    padding: 6px 12px;
    font-size: 0.9rem;
  }

  .tip {
    margin-bottom: 8px;
  }

  .link {
    align-self: flex-start;
    background: none;
    border: none;
    color: var(--turquoise);
    font-weight: 800;
    padding: 4px 0;
    cursor: pointer;
  }

  .check {
    display: flex;
    gap: 10px;
    align-items: center;
    margin: 16px 0 6px;
    font-weight: 700;
  }

  .check input {
    width: 24px;
    height: 24px;
    accent-color: var(--pink);
  }

  .errors {
    color: var(--danger);
    font-weight: 700;
  }

  .actions {
    display: flex;
    gap: 12px;
    margin-top: 16px;
    flex-wrap: wrap;
  }
</style>
