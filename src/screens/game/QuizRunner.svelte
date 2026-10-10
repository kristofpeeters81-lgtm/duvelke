<script lang="ts">
  import BigButton from '../../components/BigButton.svelte';
  import { quizOrder } from '../../lib/gameplay';
  import { sfx } from '../../lib/sfx';
  import { onDestroy, untrack } from 'svelte';
  import { speak, stopAll } from '../../lib/speech';
  import { app } from '../../lib/store.svelte';
  import { QUIZ } from '../../lib/tasks/quiz';
  import { tvUi } from '../../lib/tv/host.svelte';
  import type { Difficulty } from '../../lib/types';

  interface Props {
    difficulty: Difficulty;
    questions: number[];
    /** Antwoorden als index in de oorspronkelijke options, niet in de geschudde volgorde. */
    answers: (number | null)[];
    /** Vaste basis voor het schudden van de antwoorden (de uid van de opdracht). */
    seed: string;
    ondone: (score: number) => void;
  }

  let { difficulty, questions, answers, seed, ondone }: Props = $props();

  // Na herladen verder bij de eerste onbeantwoorde vraag.
  const firstOpen = untrack(() => answers.findIndex((a) => a === null));
  // Alles al beantwoord (herladen net na de laatste vraag)? Dan bij de laatste vraag, met het antwoord zichtbaar.
  let index = $state(firstOpen === -1 ? Math.max(0, untrack(() => questions.length) - 1) : firstOpen);
  let revealed = $state(firstOpen === -1);

  const q = $derived(QUIZ[difficulty][questions[index] ?? 0]);
  const chosen = $derived(answers[index] ?? null);
  /** order[plaats op het scherm] = index in q.options */
  const order = $derived(q ? quizOrder(`${seed}:${questions[index] ?? 0}`, q.options.length) : []);
  const rightLetter = $derived(q ? 'ABCD'[order.indexOf(q.answer)] : '');
  const score = $derived(answers.filter((a, i) => a !== null && a === QUIZ[difficulty][questions[i] ?? 0]?.answer).length);

  $effect(() => {
    if (q && !revealed) void speak(`${q.q} ${order.map((o, i) => `${'ABCD'[i]}: ${q.options[o]}.`).join(' ')}`, $state.snapshot(app.settings.voice));
  });

  onDestroy(stopAll);

  // Het tv-scherm toont dezelfde vraag, en het antwoord pas als het hier getoond wordt.
  $effect(() => {
    tvUi.quiz = { index, revealed };
  });
  onDestroy(() => (tvUi.quiz = undefined));

  /** i = index in q.options */
  function choose(i: number): void {
    if (revealed) return;
    answers[index] = i;
    revealed = true;
    if (q && i === q.answer) sfx.success();
    else sfx.fail();
  }

  function next(): void {
    revealed = false;
    if (index + 1 < questions.length) index += 1;
    else ondone(score);
  }
</script>

{#if q}
  <div class="quiz">
    <p class="count">Vraag {index + 1} van {questions.length} · 💎 {score} juist</p>
    <h2>{q.q}</h2>
    <div class="options">
      {#each order as i, pos (i)}
        <button
          type="button"
          class="opt"
          class:right={revealed && i === q.answer}
          class:wrong={revealed && chosen === i && i !== q.answer}
          disabled={revealed}
          onclick={() => choose(i)}
        >
          <span class="letter">{'ABCD'[pos]}</span>{q.options[i]}
        </button>
      {/each}
    </div>
    {#if revealed}
      <p class="feedback">{chosen === q.answer ? '🎉 Juist!' : `😬 Fout! Het juiste antwoord was ${rightLetter}.`}</p>
      <BigButton variant="gold" size="large" full onclick={next}>{index + 1 < questions.length ? 'Volgende vraag ▶' : 'Klaar! Naar de schat ▶'}</BigButton>
    {:else}
      <p class="hint center">Overleg samen en tik dan op één antwoord.</p>
    {/if}
  </div>
{/if}

<style>
  .quiz {
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: min(700px, 100%);
    margin: 0 auto;
  }

  .count {
    margin: 0;
    color: var(--text-dim);
    font-weight: 800;
    text-align: center;
  }

  h2 {
    text-align: center;
    font-size: clamp(1.6rem, 5vw, 2.3rem);
  }

  .options {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  @media (max-width: 520px) {
    .options {
      grid-template-columns: 1fr;
    }
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

  .opt:disabled {
    cursor: default;
  }

  .letter {
    flex: none;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: var(--pink);
    color: #fff;
    font-family: var(--font-title);
  }

  .right {
    border-color: var(--turquoise);
    background: rgba(41, 211, 196, 0.25);
  }

  .wrong {
    border-color: var(--danger);
    background: rgba(255, 90, 106, 0.2);
  }

  .feedback {
    text-align: center;
    font-family: var(--font-title);
    font-size: 1.6rem;
    margin: 0;
  }

  .center {
    text-align: center;
  }
</style>
