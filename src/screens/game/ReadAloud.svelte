<script lang="ts" module>
  /** Splitst "Vraag? (antwoord)" in vraag en antwoord. */
  export function splitAnswer(item: string): { question: string; answer: string | null } {
    const m = item.match(/^(.*?)\s*\(([^()]*)\)\s*$/s);
    return m ? { question: (m[1] ?? '').trim(), answer: (m[2] ?? '').trim() } : { question: item.trim(), answer: null };
  }

  /** Lijsten met antwoorden voor de spelleider: die kan Windy voorlezen. */
  export function hasAnswers(items: string[]): boolean {
    return items.length > 0 && items.every((i) => splitAnswer(i).answer !== null);
  }
</script>

<script lang="ts">
  import { onDestroy } from 'svelte';
  import BigButton from '../../components/BigButton.svelte';
  import Machine from '../../components/Machine.svelte';
  import Windy from '../../components/Windy.svelte';
  import { machineOn, speak, stopAll } from '../../lib/speech';
  import { app } from '../../lib/store.svelte';

  interface Props {
    items: string[];
    /** Aan het einde: hoeveel er juist geraden waren. */
    ondone?: (correct: number) => void;
  }

  let { items, ondone }: Props = $props();

  let started = $state(false);
  let index = $state(0);
  let showAnswer = $state(false);
  let talking = $state(false);
  let correct = $state(0);

  const current = $derived(splitAnswer(items[index] ?? ''));

  async function say(text: string): Promise<void> {
    talking = false;
    await speak(text, $state.snapshot(app.settings.voice), { onStart: () => (talking = true) });
    talking = false;
  }

  $effect(() => {
    if (!started) return;
    const q = current.question;
    const n = index;
    void say(`${n === 0 ? 'Luister goed. ' : ''}Nummer ${n + 1}. ${q}`);
  });

  onDestroy(stopAll);

  function reveal(): void {
    showAnswer = true;
    void say(`Het antwoord is: ${current.answer ?? ''}.`);
  }

  function next(right: boolean): void {
    if (right) correct += 1;
    showAnswer = false;
    if (index + 1 < items.length) index += 1;
    else ondone?.(correct);
  }
</script>

{#if !started}
  <BigButton variant="secondary" full onclick={() => (started = true)}>▶ Start het voorlezen ({items.length})</BigButton>
{:else}
<div class="read">
  <div class="head">
    {#if machineOn(app.settings.voice, app.recordedLineIds)}<Machine size={90} {talking} />{:else}<Windy mood={showAnswer ? 'geschokt' : 'stiekem'} size={90} {talking} />{/if}
    <span class="count">{index + 1} van {items.length} · ✓ {correct} juist</span>
  </div>
  <p class="q">{current.question}</p>
  {#if showAnswer}
    <p class="a">💡 {current.answer}</p>
    <div class="row">
      <BigButton variant="secondary" onclick={() => next(true)}>✓ Juist geraden</BigButton>
      <BigButton variant="ghost" onclick={() => next(false)}>✗ Fout</BigButton>
    </div>
  {:else}
    <p class="hint center">Overleg samen. Klaar met kiezen? Dan zegt {app.settings.hostName} het antwoord.</p>
    <div class="row">
      <BigButton variant="ghost" onclick={() => say(current.question)}>🔊 Nog eens</BigButton>
      <BigButton variant="primary" onclick={reveal}>Antwoord? 💡</BigButton>
    </div>
  {/if}
</div>
{/if}

<style>
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

  .a {
    margin: 0;
    padding: 12px 16px;
    border-radius: 14px;
    background: rgba(255, 207, 63, 0.18);
    color: var(--gold);
    font-weight: 800;
    font-size: 1.3rem;
  }

  .row {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .center {
    text-align: center;
    margin: 0;
  }
</style>
