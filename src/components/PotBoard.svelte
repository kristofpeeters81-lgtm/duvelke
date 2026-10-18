<script lang="ts">
  import type { PotView } from '../lib/tv/state';

  interface Props {
    pot: PotView;
  }

  let { pot }: Props = $props();

  /** Eén soort: de naam in de titel, enkel getallen in de lijst. */
  const unit = $derived(pot.items.length === 1 ? (pot.items[0]?.name ?? '') : '');
</script>

<div class="pot">
  <div class="card">
    {#each pot.items as it (it.name)}
      <p>De groep verdiende <strong>{it.earned} van de {it.total} {it.name}</strong>. Alles wordt verdeeld: iedereen krijgt er <strong>{it.base}</strong>, en wie een prijs wint, krijgt wat extra.</p>
    {/each}
    {#if pot.capped}
      <p class="fair">⚖️ Herverdeeld: niemand krijgt meer dan anderhalve keer wat een gewoon kind krijgt. Het teveel ging naar iedereen.</p>
    {/if}
  </div>

  {#if pot.prizes.length > 0}
    <div class="card">
      <h3>🏅 De prijzen{unit ? ` (${unit})` : ''}</h3>
      <ul class="prizes">
        {#each pot.prizes as p, i (i)}
          <li>
            <span class="em">{p.emoji}</span>
            <span class="what"><strong>{p.label}: {p.player.name}</strong><small>{p.why}</small></span>
            <span class="amt">{p.amount ? `+${p.amount}` : 'de eer'}</span>
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  {#each pot.lucky as l (l.item)}
    <div class="card luck">
      <h3>🍀 Geluksmuntje{pot.items.length > 1 ? ` (${l.item})` : ''}</h3>
      <p>Windy loot de laatste restjes uit. Eén extra voor: <strong>{l.names.join(', ')}</strong>.</p>
    </div>
  {/each}

  <div class="card">
    <h3>🍫 Wie krijgt wat?{unit ? ` (${unit})` : ''}</h3>
    <ul class="rows">
      {#each pot.rows as r (r.name)}
        <li><span class="av" style="--c:{r.color}">{r.avatar}</span><span class="nm">{r.name}</span><strong class="n" class:wide={!unit}>{r.amount}</strong></li>
      {/each}
    </ul>
  </div>
</div>

<style>
  .pot {
    display: grid;
    gap: 14px;
    width: 100%;
    text-align: left;
  }

  .card p {
    margin: 4px 0;
  }

  .fair {
    font-size: 0.9rem;
    color: var(--text-dim);
  }

  h3 {
    margin: 0 0 8px;
  }

  .prizes,
  .rows {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 8px;
  }

  .prizes li {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .em {
    font-size: 1.6rem;
  }

  .what {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .what small {
    color: var(--text-dim);
    font-weight: 600;
  }

  .amt {
    font-weight: 800;
    color: var(--gold);
    white-space: nowrap;
  }

  .rows {
    grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  }

  .rows li {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.06);
  }

  .av {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--c);
    font-size: 1.1rem;
  }

  .nm {
    flex: 1;
    font-weight: 700;
    overflow-wrap: anywhere;
  }

  .n {
    font-size: 1.3rem;
    color: var(--gold);
  }

  .n.wide {
    font-size: 1rem;
  }
</style>
