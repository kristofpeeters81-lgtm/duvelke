<script lang="ts">
  import BigButton from '../../components/BigButton.svelte';
  import { sfx } from '../../lib/sfx';
  import { onDestroy, untrack } from 'svelte';
  import { speak, stopAll } from '../../lib/speech';
  import { app } from '../../lib/store.svelte';
  import { QUIZ } from '../../lib/tasks/quiz';
  import type { Difficulty } from '../../lib/types';

  interface Props {
    difficulty: Difficulty;
    questions: number[];
    answers: (number | null)[];
    ondone: (score: number) => void;
  }

  let { difficulty, questions, answers, ondone }: Props = $props();

  // Na herladen verder bij de eerste onbeantwoorde vraag.
  const firstOpen = untrack(() => answers.findIndex((a) => a === null));
  let index = $state(firstOpen === -1 ? 0 : firstOpen);
  let revealed = $state(false);

  const q = $derived(QUIZ[difficulty][questions[index] ?? 0]);
  const chosen = $derived(answers[index] ?? null);
  const score = $derived(answers.filter((a, i) => a !== null && a === QUIZ[difficulty][questions[i] ?? 0]?.answer).length);

  $effect(() => {
    if (q && !revealed) void speak(`${q.q} ${q.options.map((o, i) => `${'ABCD'[i]}: ${o}.`).join(' ')}`, $state.snapshot(app.settings.voice));
  });

  onDestroy(stopAll);

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
      {#each q.options as option, i (i)}
        <button
          type="button"
          class="opt"
          class:right={revealed && i === q.answer}
          class:wrong={revealed && chosen === i && i !== q.answer}
          disabled={revealed}
          onclick={() => choose(i)}
        >
          <span class="letter">{'ABCD'[i]}</span>{option}
        </button>
      {/each}
    </div>
    {#if revealed}
      <p class="feedback">{chosen === q.answer ? '🎉 Juist!' : `😬 Fout! Het juiste antwoord was ${'ABCD'[q.answer]}.`}</p>
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
