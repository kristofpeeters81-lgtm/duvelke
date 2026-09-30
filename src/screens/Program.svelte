<script lang="ts">
  import BigButton from '../components/BigButton.svelte';
  import TopBar from '../components/TopBar.svelte';
  import { LOCATIONS } from '../lib/data/locations';
  import { SUPPLIES } from '../lib/data/supplies';
  import { formatDuration } from '../lib/settings';
  import { app, go } from '../lib/store.svelte';
  import { CATEGORY_LABELS } from '../lib/tasks/labels';
  import {
    alternatives,
    buildProgram,
    eligibleTasks,
    fillVars,
    instantiate,
    programMinutes,
    swapItem,
    type PlanContext,
    type ProgramItem,
  } from '../lib/tasks/program';
  import { allTasks, getTask } from '../lib/tasks/registry';
  import type { TaskDef } from '../lib/tasks/types';

  const draft = $derived(app.draft);
  const ctx = $derived<PlanContext | null>(
    draft ? { settings: draft.settings, playerCount: draft.playerIds.length, tasks: allTasks() } : null,
  );
  const minutes = $derived(draft && ctx ? programMinutes(draft.program, ctx) : 0);
  const target = $derived(draft?.settings.durationMinutes ?? 0);
  const possible = $derived(ctx ? eligibleTasks(ctx).length : 0);

  let open = $state<string | null>(null);
  let adding = $state(false);
  let confirmRebuild = $state(false);

  function setProgram(program: ProgramItem[]): void {
    if (app.draft) app.draft.program = program;
  }

  function move(index: number, delta: number): void {
    if (!draft) return;
    const next = [...draft.program];
    const [item] = next.splice(index, 1);
    if (!item) return;
    next.splice(index + delta, 0, item);
    setProgram(next);
  }

  function remove(index: number): void {
    if (!draft) return;
    setProgram(draft.program.filter((_, i) => i !== index));
  }

  function swap(index: number): void {
    if (!draft || !ctx) return;
    setProgram(swapItem($state.snapshot(draft.program), index, ctx));
  }

  function add(task: TaskDef): void {
    if (!draft || !ctx) return;
    setProgram([...draft.program, instantiate(task, ctx)]);
    adding = false;
  }

  function rebuild(): void {
    if (!ctx) return;
    setProgram(buildProgram(ctx));
    confirmRebuild = false;
  }

  function supplyLabel(id: string): string {
    const s = SUPPLIES.find((x) => x.id === id) ?? draft?.settings.customSupplies.find((c) => c.id === id);
    return s ? `${s.emoji} ${s.label}` : id;
  }

  function locationInfo(id: string) {
    return LOCATIONS.find((l) => l.id === id);
  }

  const alternativesByCategory = $derived.by(() => {
    if (!draft || !ctx) return [];
    const groups = new Map<string, TaskDef[]>();
    for (const t of alternatives(draft.program, ctx)) {
      const list = groups.get(t.category) ?? [];
      list.push(t);
      groups.set(t.category, list);
    }
    return [...groups.entries()];
  });
</script>

<main class="page">
  <TopBar title="Het programma" emoji="📋" />

  {#if !draft || !ctx}
    <p class="hint">Er is geen spel in voorbereiding.</p>
    <BigButton variant="primary" onclick={() => go('nieuw-spel')}>Nieuw spel</BigButton>
  {:else}
    <section class="section summary">
      <div>
        <span class="big" class:over={minutes > target + 10}>± {formatDuration(minutes)}</span>
        <span class="hint">van de {formatDuration(target)} die je koos, met rollen en eindtest erbij</span>
      </div>
      <div class="counts">
        <span>{draft.program.length} opdrachten</span>
        <span class="hint">{possible} mogelijk met jullie plekken en spullen</span>
      </div>
    </section>

    {#if possible < 10}
      <p class="warn">
        Er zijn maar {possible} opdrachten mogelijk. Vink meer benodigdheden of plekken aan voor meer afwisseling.
        <button type="button" class="link" onclick={() => go('benodigdheden')}>Benodigdheden</button>
      </p>
    {/if}

    <p class="hint">
      Kijk het programma na. Wissel 🔄 wat je niet ziet zitten, verander de volgorde of schrap iets. Tik op een opdracht om de
      uitleg te lezen.
    </p>

    <ol class="program">
      {#each draft.program as item, i (item.uid)}
        {@const task = getTask(item.taskId)}
        {@const loc = locationInfo(item.location)}
        {#if task}
          <li class="item">
            <button type="button" class="main" aria-expanded={open === item.uid} onclick={() => (open = open === item.uid ? null : item.uid)}>
              <span class="nr">{i + 1}</span>
              <span class="em">{task.emoji}</span>
              <span class="info">
                <span class="title">{task.title}</span>
                <span class="meta">
                  <span class="tag">{CATEGORY_LABELS[task.category]}</span>
                  {#if loc}<span class="tag">{loc.emoji} {loc.label}{loc.needsAdult ? ' 🦺' : ''}</span>{/if}
                  <span class="tag">⏱️ {task.minutes} min</span>
                  {#if task.prep}<span class="tag prep">📝 voorbereiden</span>{/if}
                </span>
              </span>
            </button>
            <div class="actions">
              <button type="button" class="act" aria-label="Omhoog" disabled={i === 0} onclick={() => move(i, -1)}>▲</button>
              <button type="button" class="act" aria-label="Omlaag" disabled={i === draft.program.length - 1} onclick={() => move(i, 1)}>▼</button>
              <button type="button" class="act" aria-label="Wisselen" onclick={() => swap(i)}>🔄</button>
              <button type="button" class="act del" aria-label="Schrappen" onclick={() => remove(i)}>✕</button>
            </div>
            {#if open === item.uid}
              <div class="details">
                <p>{fillVars(task.explain, item.vars)}</p>
                {#if task.supplies.length > 0}
                  <p class="hint">Nodig: {task.supplies.map(supplyLabel).join(', ')}</p>
                {/if}
                {#if task.prep}<p class="hint">📝 Voorbereiding: {fillVars(task.prep, item.vars)}</p>{/if}
              </div>
            {/if}
          </li>
        {/if}
      {/each}
    </ol>

    <div class="tools">
      <BigButton variant="ghost" onclick={() => (adding = true)}>＋ Opdracht toevoegen</BigButton>
      {#if confirmRebuild}
        <BigButton variant="danger" onclick={rebuild}>Ja, alles opnieuw</BigButton>
        <BigButton variant="ghost" onclick={() => (confirmRebuild = false)}>Toch niet</BigButton>
      {:else}
        <BigButton variant="ghost" onclick={() => (confirmRebuild = true)}>🎲 Helemaal opnieuw</BigButton>
      {/if}
    </div>

    <BigButton variant="gold" size="large" full disabled={draft.program.length === 0} onclick={() => go('paklijst')}>
      Goedgekeurd! Naar de paklijst ▶
    </BigButton>
  {/if}
</main>

{#if adding && draft}
  <div class="overlay" role="presentation" onclick={() => (adding = false)}>
    <div class="sheet" role="dialog" aria-modal="true" aria-label="Opdracht toevoegen" tabindex="-1" onclick={(e) => e.stopPropagation()} onkeydown={() => {}}>
      <h2>Opdracht toevoegen</h2>
      {#if alternativesByCategory.length === 0}
        <p class="hint">Alle mogelijke opdrachten staan al in het programma.</p>
      {/if}
      {#each alternativesByCategory as [category, tasks] (category)}
        <h3>{CATEGORY_LABELS[category as TaskDef['category']]}</h3>
        <div class="alts">
          {#each tasks as t (t.id)}
            <button type="button" class="alt" onclick={() => add(t)}>
              <span class="em">{t.emoji}</span>
              <span class="title">{t.title}</span>
              <span class="hint small">{t.minutes} min</span>
            </button>
          {/each}
        </div>
      {/each}
      <BigButton variant="ghost" full onclick={() => (adding = false)}>Sluiten</BigButton>
    </div>
  </div>
{/if}

<style>
  .summary {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }

  .summary > div {
    display: flex;
    flex-direction: column;
  }

  .big {
    font-family: var(--font-title);
    font-weight: 700;
    font-size: 2rem;
    color: var(--gold);
  }

  .big.over {
    color: var(--danger);
  }

  .counts {
    text-align: right;
    font-weight: 800;
  }

  .warn {
    padding: 12px 14px;
    border-radius: var(--radius-sm);
    background: rgba(255, 207, 63, 0.12);
    color: var(--gold);
    font-weight: 700;
  }

  .program {
    list-style: none;
    padding: 0;
    margin: 0 0 18px;
    display: grid;
    gap: 10px;
  }

  .item {
    background: var(--bg-raised);
    border: 1px solid var(--line);
    border-radius: 18px;
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    overflow: hidden;
  }

  .main {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    background: none;
    border: none;
    text-align: left;
    cursor: pointer;
    min-width: 0;
  }

  .nr {
    flex: none;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--bg-deep);
    display: grid;
    place-items: center;
    font-weight: 800;
    color: var(--text-dim);
  }

  .em {
    font-size: 2rem;
    flex: none;
  }

  .info {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .title {
    font-family: var(--font-title);
    font-weight: 700;
    font-size: 1.15rem;
  }

  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .tag {
    font-size: 0.8rem;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 999px;
    background: var(--bg-deep);
    color: var(--text-soft);
  }

  .tag.prep {
    background: rgba(255, 207, 63, 0.15);
    color: var(--gold);
  }

  .actions {
    display: flex;
    gap: 4px;
    padding-right: 10px;
  }

  .act {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    border: 2px solid var(--line);
    background: transparent;
    cursor: pointer;
  }

  .act:disabled {
    opacity: 0.25;
  }

  .act.del {
    color: var(--danger);
  }

  .details {
    grid-column: 1 / -1;
    padding: 0 16px 14px 58px;
  }

  .details p {
    margin: 6px 0;
  }

  @media (max-width: 560px) {
    .item {
      grid-template-columns: 1fr;
    }
    .actions {
      padding: 0 12px 12px;
      justify-content: flex-end;
    }
    .details {
      padding-left: 16px;
    }
  }

  .tools {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: center;
    margin-bottom: 18px;
  }

  .link {
    background: none;
    border: none;
    color: var(--turquoise);
    font-weight: 800;
    text-decoration: underline;
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
    padding: 20px;
    outline: none;
  }

  .sheet h3 {
    margin: 16px 0 8px;
    font-size: 1rem;
    color: var(--text-dim);
  }

  .alts {
    display: grid;
    gap: 8px;
  }

  .alt {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    border-radius: 14px;
    border: 2px solid var(--line);
    background: var(--bg-deep);
    text-align: left;
    cursor: pointer;
  }

  .alt .title {
    flex: 1;
    font-size: 1rem;
  }

  .small {
    margin: 0;
  }
</style>
