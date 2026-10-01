<script lang="ts">
  import BigButton from '../../components/BigButton.svelte';
  import { PROFILE_QUESTIONS } from '../../lib/data/profile';
  import { answerTest, nextTestPlayer, testBack, testLater, testSkip } from '../../lib/game';
  import { sfx } from '../../lib/sfx';
  import { app } from '../../lib/store.svelte';

  const game = $derived(app.game);
  const f = $derived(game?.finale ?? null);
  const pid = $derived(f ? f.order[f.index] : undefined);
  const player = $derived(game?.players.find((p) => p.playerId === pid));
  const question = $derived(f ? f.questions[f.qIndex] : undefined);
  /** Wat deze speler al koos (na "vorige vraag"). */
  const chosen = $derived(f && pid ? (f.answers[pid]?.answers[f.qIndex] ?? null) : null);

  function back(): void {
    if (!app.game) return;
    sfx.tap();
    testBack(app.game);
  }

  let shownAt = $state(performance.now());
  $effect(() => {
    // Nieuwe vraag: de klok voor de bedenktijd opnieuw starten.
    void f?.qIndex;
    void f?.index;
    shownAt = performance.now();
  });

  // Een dubbeltik mag niet meteen de volgende vraag beantwoorden.
  let locked = false;

  function answer(value: string): void {
    if (!app.game || locked) return;
    locked = true;
    setTimeout(() => (locked = false), 400);
    sfx.tap();
    answerTest(app.game, value, performance.now() - shownAt);
  }

  /** Kleurbolletje of icoontje uit de vragenlijst, zodat elk antwoord herkenbaar is. */
  function look(questionId: string, value: string): { swatch?: string; emoji?: string } {
    const q = PROFILE_QUESTIONS.find((x) => `profiel-${x.id}` === questionId);
    const o = q?.options.find((x) => x.value === value);
    return { swatch: o?.swatch, emoji: o?.emoji };
  }
</script>

{#if game && f && player}
  <div class="progress" aria-hidden="true">
    {#each f.order as id, i (id)}<span class="dot" class:done={i < f.index} class:now={i === f.index}></span>{/each}
  </div>

  {#if f.stage === 'geef'}
    <div class="stack center">
      <h2>📝 De Test</h2>
      <p class="hint">Iedereen maakt de test alleen. Niet meekijken en niet voorzeggen!</p>
      <div class="target">
        <span class="av" style="--c:{player.color}">{player.avatar}</span>
        <span class="nm">{player.name}</span>
      </div>
      <BigButton variant="gold" size="large" full onclick={() => app.game && nextTestPlayer(app.game)}>Ik ben {player.name}, start!</BigButton>
      {#if f.index < f.order.length - 1}
        <button type="button" class="link" onclick={() => app.game && testLater(app.game)}>{player.name} is er even niet: later</button>
      {/if}
      <button type="button" class="link" onclick={() => app.game && testSkip(app.game)}>{player.name} is weg: overslaan (telt niet mee)</button>
    </div>
  {:else if f.stage === 'vragen' && question}
    <div class="stack">
      <p class="count">Vraag {f.qIndex + 1} van {f.questions.length} · {player.name}</p>
      <h2 class="q">{question.text}</h2>
      <div class="options" class:people={question.kind === 'wie'}>
        {#each question.options as opt (opt.value)}
          {@const p = question.kind === 'wie' ? game.players.find((x) => x.playerId === opt.value) : undefined}
          {@const l = look(question.id, opt.value)}
          <button type="button" class="opt" class:chosen={chosen === opt.value} aria-pressed={chosen === opt.value} onclick={() => answer(opt.value)}>
            {#if p}<span class="pav" style="--c:{p.color}">{p.avatar}</span>{:else if l.swatch}<span class="sw" style="background:{l.swatch}"></span>{:else if l.emoji}<span class="em">{l.emoji}</span>{/if}
            <span>{opt.label}</span>
          </button>
        {/each}
      </div>
      {#if f.qIndex > 0}
        <button type="button" class="link" onclick={back}>◀ Vorige vraag</button>
      {/if}
    </div>
  {:else}
    <div class="stack center">
      <div class="big">🤐</div>
      <h2>Klaar, {player.name}!</h2>
      <p class="hint">Je antwoorden zijn geheim tot de onthulling. Geef de tablet door.</p>
      <button type="button" class="link" onclick={back}>◀ Toch nog iets veranderen</button>
      <BigButton variant="gold" size="large" full onclick={() => app.game && nextTestPlayer(app.game)}>
        {f.index + 1 < f.order.length ? 'Tablet doorgegeven ▶' : 'Iedereen heeft de test gemaakt ▶'}
      </BigButton>
    </div>
  {/if}
{/if}

<style>
  .progress {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }

  .dot {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.15);
  }

  .dot.done {
    background: var(--turquoise);
  }

  .dot.now {
    background: var(--gold);
    transform: scale(1.3);
  }

  .stack {
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: min(700px, 100%);
    margin: 0 auto;
  }

  .center {
    align-items: center;
    text-align: center;
  }

  .target {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .av {
    width: 110px;
    height: 110px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-size: 3.8rem;
    background: var(--c);
  }

  .nm {
    font-family: var(--font-title);
    font-weight: 700;
    font-size: 2.2rem;
  }

  .count {
    text-align: center;
    color: var(--text-dim);
    font-weight: 800;
    margin: 0;
  }

  .q {
    text-align: center;
    font-size: clamp(1.6rem, 5vw, 2.3rem);
  }

  .options {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .options.people {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }

  .opt {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 76px;
    padding: 12px 16px;
    border-radius: 20px;
    border: 3px solid var(--line);
    background: var(--bg-raised);
    font-weight: 800;
    font-size: 1.2rem;
    text-align: left;
    cursor: pointer;
  }

  .opt.chosen {
    border-color: var(--gold);
    background: rgba(255, 207, 63, 0.14);
  }

  .opt:active {
    transform: scale(0.96);
    border-color: var(--turquoise);
  }

  .pav {
    width: 46px;
    height: 46px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-size: 1.6rem;
    background: var(--c);
    flex: none;
  }

  .sw {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 3px solid rgba(255, 255, 255, 0.6);
    flex: none;
  }

  .big {
    font-size: 5rem;
  }

  .em {
    font-size: 1.8rem;
  }

  .link {
    background: none;
    border: none;
    color: var(--text-dim);
    font-weight: 700;
    text-decoration: underline;
    padding: 10px;
    cursor: pointer;
  }
</style>
