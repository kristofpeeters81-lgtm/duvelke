<script lang="ts">
  import BigButton from '../../components/BigButton.svelte';
  import WindyBubble from '../../components/WindyBubble.svelte';
  import { JOKER_COST, resolveDilemma } from '../../lib/game';
  import { sfx } from '../../lib/sfx';
  import { app } from '../../lib/store.svelte';

  const game = $derived(app.game);
  const gems = $derived(game?.current?.pending?.gems ?? 0);
  const cost = $derived(Math.min(gems, JOKER_COST));

  let stage = $state<'kies' | 'wie'>('kies');
  let who = $state<string | null>(null);

  const text = $derived(
    `Amai, ${gems} edelstenen! Maar wacht... ik heb iets speciaals. Een Kijk-joker! Wie die heeft, mag bij een geheime briefing stiekem één naam zien die zeker géén ${game?.settings.saboteurName} is. Ruilen jullie ${cost} edelstenen voor die joker? Beslis samen!`,
  );

  function keep(): void {
    sfx.gem();
    if (app.game) resolveDilemma(app.game, null);
  }

  function give(): void {
    if (!app.game || !who) return;
    sfx.reveal();
    resolveDilemma(app.game, who);
  }
</script>

{#if game}
  <div class="stack">
    <h2 class="title">💎 of 🃏? Het dilemma!</h2>
    {#if stage === 'kies'}
      <WindyBubble {text} mood="stiekem" size={160} />
      <div class="choices">
        <button type="button" class="choice keep" onclick={keep}>
          <span class="em">💎</span>
          <span><strong>Houden</strong><br />Alle {gems} edelstenen in de schatkist</span>
        </button>
        <button type="button" class="choice trade" onclick={() => (stage = 'wie')}>
          <span class="em">🃏</span>
          <span><strong>Ruilen</strong><br />−{cost} edelstenen, één iemand krijgt een Kijk-joker</span>
        </button>
      </div>
    {:else}
      <p class="hint center">Wie krijgt de Kijk-joker? Spreek het samen af.</p>
      <div class="grid">
        {#each game.players as p (p.playerId)}
          <button type="button" class="pl" aria-pressed={who === p.playerId} onclick={() => (who = p.playerId)}>
            <span class="av" style="--c:{p.color}">{p.avatar}</span>
            <span class="nm">{p.name}</span>
            {#if (game.jokers[p.playerId] ?? 0) > 0}<span class="has">🃏×{game.jokers[p.playerId]}</span>{/if}
          </button>
        {/each}
      </div>
      <BigButton variant="gold" size="large" full disabled={!who} onclick={give}>🃏 Geef de joker</BigButton>
      <BigButton variant="ghost" onclick={() => (stage = 'kies')}>◀ Toch niet</BigButton>
    {/if}
  </div>
{/if}

<style>
  .stack {
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: min(680px, 100%);
    margin: 0 auto;
  }

  .title {
    text-align: center;
    font-size: clamp(1.8rem, 6vw, 2.6rem);
  }

  .center {
    text-align: center;
  }

  .choices {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }

  @media (max-width: 560px) {
    .choices {
      grid-template-columns: 1fr;
    }
  }

  .choice {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 20px 14px;
    border-radius: 24px;
    border: 3px solid transparent;
    font-size: 1.1rem;
    text-align: center;
    cursor: pointer;
  }

  .choice strong {
    font-family: var(--font-title);
    font-size: 1.6rem;
  }

  .em {
    font-size: 3.4rem;
  }

  .keep {
    background: linear-gradient(180deg, #3fe0cf, #11a597);
    color: #0d2b33;
  }

  .trade {
    background: linear-gradient(180deg, #c86bff, #7b2fbf);
    color: #fff;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 10px;
  }

  .pl {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 14px 6px;
    border-radius: 18px;
    border: 3px solid var(--line);
    background: var(--bg-raised);
    cursor: pointer;
  }

  .pl[aria-pressed='true'] {
    border-color: var(--gold);
    background: rgba(255, 207, 63, 0.15);
  }

  .av {
    width: 58px;
    height: 58px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-size: 2rem;
    background: var(--c);
  }

  .nm {
    font-weight: 800;
  }

  .has {
    position: absolute;
    top: 6px;
    right: 8px;
    font-size: 0.8rem;
    font-weight: 800;
  }
</style>
