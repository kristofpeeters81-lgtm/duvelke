<script lang="ts">
  import BigButton from '../../components/BigButton.svelte';
  import HoldToReveal from '../../components/HoldToReveal.svelte';
  import { nextCard } from '../../lib/game';
  import { sfx } from '../../lib/sfx';
  import { app } from '../../lib/store.svelte';

  interface Props {
    items: string[];
    /** Wie het kaartje leest, bv. "Uitlegger". */
    who: string;
  }

  let { items, who }: Props = $props();

  const cards = $derived(app.game?.current?.cards ?? { index: 0, guessed: 0 });
  const item = $derived(items[cards.index]);
  /** "PIRAAT (niet: schip, schat)" → het woord groot, de verboden woorden eronder. */
  const parts = $derived.by(() => {
    const m = item?.match(/^(.*?)\s*\((niet[^()]*)\)\s*$/is);
    return m ? { main: m[1] ?? '', extra: m[2] ?? '' } : { main: item ?? '', extra: '' };
  });

  function next(guessed: boolean): void {
    if (!app.game) return;
    if (guessed) sfx.gem();
    else sfx.tap();
    nextCard(app.game, guessed);
  }
</script>

<div class="deck">
  <div class="head">
    <h3>🃏 Kaartje voor de {who}</h3>
    <span class="count">{Math.min(cards.index + 1, items.length)} van {items.length} · ✓ {cards.guessed}</span>
  </div>
  {#if item !== undefined}
    <p class="hint small">Enkel de {who} kijkt! De rest kijkt weg.</p>
    {#key cards.index}
      <HoldToReveal label="{who}: hou ingedrukt om te lezen">
        <div class="item">
          <span class="main">{parts.main}</span>
          {#if parts.extra}<span class="extra">{parts.extra}</span>{/if}
        </div>
      </HoldToReveal>
    {/key}
    <div class="row">
      <BigButton variant="secondary" onclick={() => next(true)}>✓ Geraden</BigButton>
      <BigButton variant="ghost" onclick={() => next(false)}>⏭ Overslaan</BigButton>
    </div>
  {:else}
    <p class="done">Alle kaartjes zijn op! ✓ {cards.guessed} geraden.</p>
  {/if}
</div>

<style>
  .deck {
    background: var(--bg-raised);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    padding: 16px 18px;
    box-shadow: var(--shadow);
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 10px;
    flex-wrap: wrap;
  }

  .head h3 {
    margin: 0;
  }

  .count {
    font-weight: 800;
    color: var(--text-dim);
  }

  .item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 18px 12px;
    text-align: center;
  }

  .main {
    font-family: var(--font-title);
    font-size: clamp(1.6rem, 6vw, 2.4rem);
    font-weight: 700;
    line-height: 1.2;
  }

  .extra {
    font-weight: 700;
    color: var(--text-dim);
  }

  .row {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .row :global(button) {
    flex: 1;
  }

  .done {
    margin: 0;
    font-weight: 800;
    text-align: center;
  }
</style>
