<script lang="ts">
  import BigButton from '../components/BigButton.svelte';
  import TopBar from '../components/TopBar.svelte';
  import { SUPPLIES } from '../lib/data/supplies';
  import { createGame } from '../lib/game';
  import { app, go, startFromHome } from '../lib/store.svelte';
  import { packingList } from '../lib/tasks/program';
  import { allTasks } from '../lib/tasks/registry';

  const draft = $derived(app.draft);
  const list = $derived(draft ? packingList(draft.program, allTasks()) : { supplies: [], prep: [] });

  let ticked = $state<string[]>([]);

  function toggle(key: string): void {
    ticked = ticked.includes(key) ? ticked.filter((k) => k !== key) : [...ticked, key];
  }

  function supply(id: string) {
    return SUPPLIES.find((s) => s.id === id) ?? draft?.settings.customSupplies.find((c) => c.id === id);
  }

  const total = $derived(list.supplies.length + list.prep.length);
  const allDone = $derived(total > 0 && ticked.length >= total);

  function start(): void {
    if (!draft) return;
    const players = app.players.filter((p) => draft.playerIds.includes(p.id));
    app.game = createGame($state.snapshot(players), $state.snapshot(draft.settings), draft.gameMasterId, draft.pin, $state.snapshot(draft.program));
    app.draft = null;
    startFromHome('spel');
  }
</script>

<main class="page">
  <TopBar title="Paklijst" emoji="🎒" />

  {#if !draft}
    <p class="hint">Er is geen spel in voorbereiding.</p>
    <BigButton variant="primary" onclick={() => go('nieuw-spel')}>Nieuw spel</BigButton>
  {:else}
    <p class="hint">Leg alles klaar vóór het spel begint, dan moet niemand tijdens het spel iets gaan zoeken. Vink af wat klaarligt.</p>

    {#if list.supplies.length > 0}
      <section class="section">
        <h2>🧺 Klaarleggen</h2>
        <ul class="checks">
          {#each list.supplies as id (id)}
            {@const s = supply(id)}
            <li>
              <button type="button" class="check" aria-pressed={ticked.includes(`s:${id}`)} onclick={() => toggle(`s:${id}`)}>
                <span class="box">{ticked.includes(`s:${id}`) ? '✓' : ''}</span>
                <span class="em">{s?.emoji ?? '📦'}</span>
                <span>{s?.label ?? id}</span>
              </button>
            </li>
          {/each}
        </ul>
      </section>
    {/if}

    {#if list.prep.length > 0}
      <section class="section">
        <h2>📝 Op voorhand voorbereiden</h2>
        <p class="hint">Dit doe je best nu al, of terwijl de kinderen met een andere opdracht bezig zijn.</p>
        <ul class="checks">
          {#each list.prep as p, i (i)}
            <li>
              <button type="button" class="check" aria-pressed={ticked.includes(`p:${i}`)} onclick={() => toggle(`p:${i}`)}>
                <span class="box">{ticked.includes(`p:${i}`) ? '✓' : ''}</span>
                <span class="em">{p.emoji}</span>
                <span><strong>{p.title}:</strong> {p.text}</span>
              </button>
            </li>
          {/each}
        </ul>
      </section>
    {/if}

    {#if total === 0}
      <section class="section">
        <h2>🎉 Niets nodig!</h2>
        <p class="hint">Voor dit programma moet je niets klaarleggen.</p>
      </section>
    {/if}

    <section class="section tip">
      <strong>🔋 Tablet opgeladen?</strong> Het scherm blijft aan tijdens het spel, dat vraagt wat batterij.
    </section>

    <BigButton variant="gold" size="large" full onclick={start}>
      {allDone || total === 0 ? '🎲 Alles klaar: start het spel!' : '🎲 Start het spel'}
    </BigButton>
  {/if}
</main>

<style>
  .checks {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 8px;
  }

  .check {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    border-radius: 14px;
    border: 2px solid var(--line);
    background: var(--bg-deep);
    text-align: left;
    cursor: pointer;
    font-weight: 700;
  }

  .check[aria-pressed='true'] {
    border-color: var(--turquoise);
    color: var(--text-dim);
  }

  .check[aria-pressed='true'] span:last-child {
    text-decoration: line-through;
  }

  .box {
    flex: none;
    width: 30px;
    height: 30px;
    border-radius: 8px;
    border: 2px solid var(--turquoise);
    display: grid;
    place-items: center;
    color: var(--turquoise);
    font-weight: 800;
  }

  .em {
    font-size: 1.5rem;
  }

  .tip {
    background: rgba(41, 211, 196, 0.1);
  }
</style>
