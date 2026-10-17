<script lang="ts" module>
  /**
   * Splitst een lijstitem in wat het hulpje vertelt en wat enkel het hulpje mag weten:
   * "Verhaal... Oplossing: ..." of "Vraag? (antwoord)".
   */
  export function splitSecret(item: string): { text: string; answer: string | null; label: string } {
    const sol = item.match(/^(.*?)\s*Oplossing:\s*(.+)$/s);
    if (sol) return { text: (sol[1] ?? '').trim(), answer: (sol[2] ?? '').trim(), label: 'Oplossing' };
    const par = item.match(/^(.*?)\s*\(([^()]*)\)\s*$/s);
    if (par) return { text: (par[1] ?? '').trim(), answer: (par[2] ?? '').trim(), label: 'Antwoord' };
    return { text: item.trim(), answer: null, label: '' };
  }
</script>

<script lang="ts">
  import HoldToReveal from './HoldToReveal.svelte';

  interface Props {
    items: string[];
    /** Welk item er getoond wordt (blijft bewaard tussen het uitleg- en het timerscherm). */
    index?: number;
  }

  let { items, index = $bindable(0) }: Props = $props();

  /** De hele lijst open laten staan: dan kan je scrollen, maar kan wie meekijkt ook meelezen. */
  let open = $state(false);

  const at = $derived(Math.min(Math.max(0, index), Math.max(0, items.length - 1)));
  const many = $derived(items.length > 1);
</script>

{#snippet entry(item: string)}
  {@const s = splitSecret(item)}
  <p class="text">{s.text}</p>
  {#if s.answer}<p class="answer"><span>🔑 {s.label}</span>{s.answer}</p>{/if}
{/snippet}

{#if open}
  <div class="sheet">
    <ol>
      {#each items as item, i (i)}<li>{@render entry(item)}</li>{/each}
    </ol>
  </div>
  <button type="button" class="link" onclick={() => (open = false)}>🙈 Verbergen</button>
{:else}
  <HoldToReveal label={many ? `Hou ingedrukt om te lezen (${at + 1} van ${items.length})` : 'Hou ingedrukt om te lezen'}>
    <div class="sheet one">
      {#if many}<p class="count">{at + 1} van {items.length}</p>{/if}
      {#if items[at] !== undefined}{@render entry(items[at])}{/if}
    </div>
  </HoldToReveal>
  {#if many}
    <div class="nav">
      <button type="button" class="step" disabled={at === 0} onclick={() => (index = at - 1)}>◀ Vorige</button>
      <span>{at + 1} / {items.length}</span>
      <button type="button" class="step" disabled={at === items.length - 1} onclick={() => (index = at + 1)}>Volgende ▶</button>
    </div>
  {/if}
  <button type="button" class="link" onclick={() => (open = true)}>📖 {many ? 'Hele lijst' : 'Lijst'} open laten staan (niemand mag meekijken)</button>
{/if}

<style>
  .sheet {
    border-radius: var(--radius);
    background: #fff8e8;
    color: #2a1454;
    border: 4px solid #7a5222;
    padding: 16px 20px;
    font-size: 1.2rem;
    font-weight: 700;
  }

  .sheet.one {
    min-height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 12px;
    font-size: 1.3rem;
  }

  .sheet ol {
    margin: 0;
    padding-left: 24px;
    display: grid;
    gap: 14px;
  }

  p {
    margin: 0;
  }

  .count {
    font-size: 0.9rem;
    font-weight: 800;
    color: #7a5222;
  }

  .answer {
    margin-top: 8px;
    padding: 8px 12px;
    border-radius: 12px;
    background: #ffe6a8;
    border: 2px dashed #b07a2a;
    font-size: 1rem;
  }

  .answer span {
    display: block;
    font-size: 0.8rem;
    font-weight: 800;
    color: #7a5222;
  }

  .nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-top: 10px;
    font-weight: 800;
  }

  .step {
    border: 2px solid var(--line);
    background: rgba(255, 255, 255, 0.08);
    color: inherit;
    border-radius: 999px;
    padding: 10px 18px;
    font-weight: 800;
    font-size: 1rem;
    cursor: pointer;
  }

  .step:disabled {
    opacity: 0.35;
    cursor: default;
  }

  .link {
    margin-top: 10px;
    background: none;
    border: none;
    color: var(--teal, #29d3c4);
    font-weight: 800;
    text-decoration: underline;
    cursor: pointer;
    padding: 4px 0;
  }
</style>
