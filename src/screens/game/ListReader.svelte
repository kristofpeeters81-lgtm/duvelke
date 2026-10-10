<script lang="ts" module>
  /** "GIRAF: 1) Ik woon in Afrika. 2) Ik ben groot." → het antwoord en de hints apart. */
  export function splitHints(item: string): { answer: string; hints: string[] } {
    const m = item.match(/^([^:]+):\s*(.*)$/s);
    const answer = m ? (m[1] ?? '').trim() : '';
    const rest = m ? (m[2] ?? '') : item;
    const hints = rest
      .split(/\s*\d+\)\s*/)
      .map((h) => h.trim())
      .filter((h) => h !== '');
    return { answer, hints };
  }
</script>

<script lang="ts">
  import { onDestroy } from 'svelte';
  import BigButton from '../../components/BigButton.svelte';
  import Machine from '../../components/Machine.svelte';
  import Windy from '../../components/Windy.svelte';
  import { nextCard, streakNext } from '../../lib/game';
  import { machineOn, prefetch, speak, stopAll } from '../../lib/speech';
  import { app } from '../../lib/store.svelte';
  import { splitAnswer } from './ReadAloud.svelte';

  interface Props {
    items: string[];
    /**
     * roepen: één bevel of opdracht per tik. onthouden: één keer voorlezen, verborgen, daarna nakijken.
     * hints: hint per hint, daarna het antwoord.
     */
    mode: 'roepen' | 'onthouden' | 'hints';
    /** Zoals bij ReadAloud: false = wacht op de timer, true = begin, undefined = startknop. */
    timerRunning?: boolean;
    /** Roepen met ✓/✗ en een teller "op een rij" (zie TaskList.streak). */
    streak?: boolean;
    /** Het doel van die teller, als de opdracht er een heeft. */
    goal?: number | null;
  }

  let { items, mode, timerRunning, streak = false, goal = null }: Props = $props();

  // De voortgang staat in het spel, zodat herladen verder gaat waar het was.
  const cards = $derived(app.game?.current?.cards ?? { index: 0, guessed: 0 });
  const index = $derived(cards.index);
  // Een reeks "op een rij" stopt niet als de lijst op is: dan begint ze gewoon opnieuw.
  const done = $derived(!streak && index >= items.length);
  /** Enkel tellen als er meer dan één ding is (een boodschappenlijst van één blok tel je zelf). */
  const counts = $derived(mode !== 'roepen' && items.length > 1);

  let clicked = $state(false);
  $effect(() => {
    if (timerRunning) clicked = true;
  });
  const started = $derived(clicked || index > 0);

  let shown = $state(false);
  let hint = $state(0);
  let talking = $state(false);

  const item = $derived(items[streak ? index % Math.max(1, items.length) : index] ?? '');
  const memo = $derived(splitAnswer(item));
  const hinted = $derived(splitHints(item));

  function spokenFor(text: string, h: number): string {
    if (mode === 'hints') return `Hint ${h + 1}. ${splitHints(text).hints[h] ?? ''}`;
    if (mode === 'onthouden') return splitAnswer(text).question;
    return text;
  }

  async function say(text: string): Promise<void> {
    talking = false;
    await speak(text, $state.snapshot(app.settings.voice), { onStart: () => (talking = true) });
    talking = false;
  }

  let run = 0;
  const pause = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

  /**
   * Onthouden: elk ding apart, met een korte pauze ertussen, zodat het niet te snel gaat. Is het één
   * lange lijst (een boodschappenlijst), dan nog een tweede keer.
   */
  async function sayMemory(text: string, mine: number): Promise<void> {
    const parts = text.split(/,\s*/).filter((p) => p.trim() !== '');
    const rounds = items.length === 1 && parts.length > 2 ? 2 : 1;
    for (let r = 0; r < rounds; r++) {
      if (r > 0) {
        await pause(1200);
        if (mine !== run || shown) return;
        await say('Nog één keer.');
      }
      for (const part of parts) {
        if (mine !== run || shown) return;
        await say(part);
        await pause(450);
      }
    }
  }

  $effect(() => {
    if (!started || done) return;
    const text = spokenFor(item, hint);
    const mine = ++run;
    if (mode === 'onthouden') void sayMemory(text, mine);
    else void say(text);
    // Het volgende alvast klaarmaken, zodat er geen pauze valt (belangrijk bij "Windy zegt").
    const following = streak ? items[(index + 1) % Math.max(1, items.length)] : items[index + 1];
    const next = mode === 'hints' && hint + 1 < hinted.hints.length ? spokenFor(item, hint + 1) : following && mode !== 'onthouden' ? spokenFor(following, 0) : null;
    if (next) void prefetch(next, $state.snapshot(app.settings.voice));
  });

  onDestroy(stopAll);

  function reveal(): void {
    shown = true;
    if (mode === 'hints') void say(`Het antwoord is: ${hinted.answer}.`);
  }

  function next(right: boolean): void {
    shown = false;
    hint = 0;
    if (app.game) nextCard(app.game, right);
  }

  function streakTap(ok: boolean): void {
    if (app.game) streakNext(app.game, ok);
  }
</script>

{#if done}
  <p class="done">{counts ? `Klaar: ${cards.guessed} van de ${items.length} juist!` : 'Klaar! Alles is voorgelezen.'}</p>
{:else if !started && timerRunning === false}
  <p class="hint center">Start de timer: dan begint {app.settings.hostName} voor te lezen.</p>
{:else if !started}
  <BigButton variant="secondary" full onclick={() => (clicked = true)}>▶ Start het voorlezen</BigButton>
{:else}
  <div class="read">
    <div class="head">
      {#if machineOn(app.settings.voice, app.recordedLineIds)}<Machine size={80} {talking} />{:else}<Windy mood="stiekem" size={80} {talking} />{/if}
      <span class="count">{index + 1} van {items.length}{counts ? ` · ✓ ${cards.guessed} juist` : ''}</span>
    </div>

    {#if mode === 'roepen' && streak}
      <p class="q">{item}</p>
      <p class="streak">🔥 {cards.guessed} op een rij{goal ? ` · doel ${goal}` : ''}{goal && cards.guessed >= goal ? ' · 🎉 Doel gehaald!' : ''}</p>
      <div class="row">
        <BigButton variant="ghost" onclick={() => say(item)}>🔊 Nog eens</BigButton>
        <BigButton variant="secondary" onclick={() => streakTap(true)}>✓ Goed</BigButton>
        <BigButton variant="danger" onclick={() => streakTap(false)}>✗ Fout: opnieuw</BigButton>
      </div>
    {:else if mode === 'roepen'}
      <p class="q">{item}</p>
      <div class="row">
        <BigButton variant="ghost" onclick={() => say(item)}>🔊 Nog eens</BigButton>
        <BigButton variant="primary" onclick={() => next(false)}>Volgende ▶</BigButton>
      </div>
    {:else if mode === 'onthouden'}
      {#if shown}
        <p class="q">{memo.answer ?? memo.question}</p>
        {#if counts}
          <div class="row">
            <BigButton variant="secondary" onclick={() => next(true)}>✓ Juist</BigButton>
            <BigButton variant="ghost" onclick={() => next(false)}>✗ Fout</BigButton>
          </div>
        {:else}
          <BigButton variant="primary" onclick={() => next(false)}>Klaar ▶</BigButton>
        {/if}
      {:else}
        <p class="q hidden">🙈 Goed onthouden!</p>
        <p class="hint center">Zeg het nu samen op. Daarna tik je op Nakijken.</p>
        <BigButton variant="primary" full onclick={reveal}>Nakijken 👀</BigButton>
      {/if}
    {:else}
      <ol class="hints">
        {#each hinted.hints.slice(0, hint + 1) as h, i (i)}<li>{h}</li>{/each}
      </ol>
      {#if shown}
        <p class="a">💡 {hinted.answer}</p>
        <div class="row">
          <BigButton variant="secondary" onclick={() => next(true)}>✓ Geraden</BigButton>
          <BigButton variant="ghost" onclick={() => next(false)}>✗ Niet geraden</BigButton>
        </div>
      {:else}
        <div class="row">
          <BigButton variant="ghost" onclick={() => say(spokenFor(item, hint))}>🔊 Nog eens</BigButton>
          {#if hint + 1 < hinted.hints.length}
            <BigButton variant="secondary" onclick={() => (hint += 1)}>Volgende hint ▶</BigButton>
          {/if}
          <BigButton variant="primary" onclick={reveal}>Antwoord? 💡</BigButton>
        </div>
      {/if}
    {/if}
  </div>
{/if}

<style>
  .done {
    margin: 0;
    font-weight: 800;
    text-align: center;
  }

  .read {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .head {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .count {
    font-weight: 800;
    color: var(--text-dim);
  }

  .q {
    margin: 0;
    padding: 16px 18px;
    border-radius: 18px;
    background: #fff;
    color: #2a1454;
    font-family: var(--font-title);
    font-size: clamp(1.3rem, 4vw, 1.7rem);
    line-height: 1.3;
  }

  .streak {
    margin: 0;
    text-align: center;
    font-weight: 800;
    font-size: 1.3rem;
    color: var(--gold);
  }

  .q.hidden {
    text-align: center;
  }

  .hints {
    margin: 0;
    padding: 12px 16px 12px 36px;
    border-radius: 18px;
    background: #fff;
    color: #2a1454;
    font-weight: 700;
    font-size: 1.15rem;
    display: grid;
    gap: 6px;
  }

  .a {
    margin: 0;
    font-size: 1.4rem;
    font-weight: 800;
    color: var(--gold);
    text-align: center;
  }

  .row {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: center;
  }

  .center {
    text-align: center;
  }
</style>
