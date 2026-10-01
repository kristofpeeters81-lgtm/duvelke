<script lang="ts">
  import { untrack } from 'svelte';
  import BigButton from '../../components/BigButton.svelte';
  import WindyBubble from '../../components/WindyBubble.svelte';
  import { afterGossip, multipleSaboteursPossible } from '../../lib/game';
  import { gossipSentence } from '../../lib/secrets';
  import { machineOn } from '../../lib/speech';
  import { app, windySays } from '../../lib/store.svelte';

  const game = $derived(app.game);
  const gossip = $derived(game?.current?.gossip ?? null);
  const multiple = $derived(game ? game.players.filter((p) => p.role === 'saboteur').length > 1 || multipleSaboteursPossible(game.players.length) : false);

  let stage = $state<'intro' | 'roddel'>('intro');
  const intro = untrack(() => windySays('roddel'));

  const sentence = $derived(gossip && game ? gossipSentence(gossip, game.settings.saboteurName, multiple) : '');
  const nbName = $derived(game?.settings.neighbourName ?? 'De buurvrouw');

  // Met eigen opnames leest Kenzo zijn machien de roddels die altijd kloppen: een machien liegt niet.
  const machine = $derived(machineOn(app.settings.voice, app.recordedLineIds));
  const machineName = $derived(`${game?.settings.sonName ?? 'Kenzo'} zijn machien`);
  const windyText = $derived(machine ? `Bliep! Opname gevonden. ${sentence}` : `Ik heb het ZELF gezien! ${sentence}`);
  const neighbourText = $derived(`Hallo schatjes, ${nbName} hier! Ik heb gehoord dat... ${sentence.charAt(0).toLowerCase()}${sentence.slice(1)} Maar dat heb je niet van mij hé!`);

  const log = $derived(game?.gossipLog ?? []);
</script>

{#if game && gossip}
  <div class="stack">
    <h2 class="title">🤫 Roddeltijd!</h2>
    {#if stage === 'intro'}
      {#if intro}{#key intro.id}<WindyBubble text={intro.text} lineId={intro.id} mood="stiekem" size={180} />{/key}{/if}
      <BigButton variant="gold" size="large" full onclick={() => (stage = 'roddel')}>Vertel! ▶</BigButton>
    {:else if gossip.source === 'windy'}
      {#if machine}
        <div class="badge ok">🤖 {machineName} heeft het opgenomen: dit klopt altijd!</div>
      {:else}
        <div class="badge ok">👀 {game.settings.hostName} zag het zelf: dit klopt altijd!</div>
      {/if}
      {#key sentence}<WindyBubble text={windyText} mood="geschokt" size={180} />{/key}
      <BigButton variant="primary" size="large" full onclick={() => app.game && afterGossip(app.game)}>Oei! Verder ▶</BigButton>
    {:else}
      <div class="badge warn">🗣️ Roddel van {nbName}: die vertelt soms zever!</div>
      {#key sentence}<WindyBubble text={neighbourText} speaker="buurvrouw" size={180} />{/key}
      <BigButton variant="primary" size="large" full onclick={() => app.game && afterGossip(app.game)}>Hmm... Verder ▶</BigButton>
    {/if}

    {#if log.length > 0}
      <details class="book">
        <summary>📒 Roddelboekje ({log.length})</summary>
        <ul>
          {#each log as g, i (i)}
            <li>
              <span class="src">{g.source === 'windy' ? '👀' : '🗣️'}</span>
              {gossipSentence(g, game.settings.saboteurName, multiple)}
              <span class="hint small">{g.source === 'windy' ? 'zelf gezien' : 'van de buurvrouw'}</span>
            </li>
          {/each}
        </ul>
      </details>
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

  .badge {
    align-self: center;
    padding: 8px 16px;
    border-radius: 999px;
    font-weight: 800;
    text-align: center;
  }

  .badge.ok {
    background: rgba(41, 211, 196, 0.2);
    color: var(--turquoise);
  }

  .badge.warn {
    background: rgba(255, 79, 163, 0.2);
    color: var(--pink);
  }

  .book {
    background: var(--bg-raised);
    border-radius: var(--radius);
    padding: 14px 18px;
  }

  .book summary {
    font-weight: 800;
    cursor: pointer;
  }

  .book ul {
    list-style: none;
    padding: 0;
    margin: 12px 0 0;
    display: grid;
    gap: 8px;
  }

  .book li {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: baseline;
  }

  .small {
    margin: 0;
    font-size: 0.8rem;
  }
</style>
