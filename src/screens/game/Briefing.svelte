<script lang="ts">
  import BigButton from '../../components/BigButton.svelte';
  import HoldToReveal from '../../components/HoldToReveal.svelte';
  import { briefingLater, briefingNext, briefingSkip, useJoker } from '../../lib/game';
  import { app } from '../../lib/store.svelte';
  import { getTask } from '../../lib/tasks/registry';

  const game = $derived(app.game);
  const b = $derived(game?.current?.briefing ?? null);
  const pid = $derived(b ? b.order[b.index] : undefined);
  const player = $derived(game?.players.find((p) => p.playerId === pid));
  const card = $derived(pid && b ? b.cards[pid] : undefined);
  const task = $derived(game ? getTask(game.program[game.taskIndex]?.taskId ?? '') : undefined);
  const jokers = $derived(pid ? (game?.jokers[pid] ?? 0) : 0);
  const sab = $derived(game?.settings.saboteurName ?? '');

  let seen = $state(false);
  let confirmJoker = $state(false);

  function name(id: string | null): string {
    return game?.players.find((p) => p.playerId === id)?.name ?? '?';
  }

  function iAm(): void {
    seen = false;
    confirmJoker = false;
    if (app.game) briefingNext(app.game);
  }

  function done(): void {
    if (app.game) briefingNext(app.game);
  }

  function joker(): void {
    if (app.game && pid) useJoker(app.game, pid);
    confirmJoker = false;
    seen = false;
  }
</script>

{#if game && b && player && card}
  <div class="progress" aria-hidden="true">
    {#each b.order as id, i (id)}<span class="dot" class:done={i < b.index} class:now={i === b.index}></span>{/each}
  </div>

  {#if b.stage === 'geef'}
    <div class="stack center">
      <h2>🕵️ Geheime briefing</h2>
      <p class="hint">Iedereen krijgt een geheime tip voor "{task?.title}". Geef de tablet door.</p>
      <div class="target">
        <span class="av" style="--c:{player.color}">{player.avatar}</span>
        <span class="nm">{player.name}</span>
      </div>
      <BigButton variant="gold" size="large" full onclick={iAm}>Ik ben {player.name}</BigButton>
      {#if b.index < b.order.length - 1}
        <button type="button" class="link" onclick={() => app.game && briefingLater(app.game)}>{player.name} is er even niet: later</button>
      {/if}
      <button type="button" class="link" onclick={() => app.game && briefingSkip(app.game)}>{player.name} is weg: overslaan</button>
    </div>
  {:else}
    <div class="stack">
      <p class="hint center">Zorg dat niemand meekijkt en hou je vinger op de map.</p>
      <!-- Na een joker opnieuw aanmaken, zodat het jokerresultaat ook echt gelezen wordt. -->
      {#key card.jokerInnocent}
      <HoldToReveal onseen={() => (seen = true)} minVisibleMs={1200} label="Hou ingedrukt voor je geheime tip">
        <article class="tip-card">
          <header><span class="label">GEHEIME TIP</span><span class="who">{player.avatar} {player.name}</span></header>
          <p class="tip">{card.tip}</p>
          {#if card.innocent}
            <p class="extra">🔍 Speurneus-info: <strong>{name(card.innocent)}</strong> is zeker géén {sab}.</p>
          {/if}
          {#if card.jokerInnocent !== null}
            <p class="extra">
              🃏 Kijk-joker:
              {#if card.jokerInnocent}<strong>{name(card.jokerInnocent)}</strong> is zeker géén {sab}.{:else}je kent alle onschuldigen al!{/if}
            </p>
          {/if}
          {#if card.reminder}<p class="extra">🙋 {card.reminder}</p>{/if}
          <p class="note">Vertel dit aan niemand!</p>
        </article>
      </HoldToReveal>
      {/key}

      {#if jokers > 0 && card.jokerInnocent === null}
        {#if confirmJoker}
          <div class="row">
            <BigButton variant="gold" onclick={joker}>🃏 Ja, joker gebruiken</BigButton>
            <BigButton variant="ghost" onclick={() => (confirmJoker = false)}>Nee, bewaren</BigButton>
          </div>
        {:else}
          <BigButton variant="ghost" full onclick={() => (confirmJoker = true)}>🃏 Kijk-joker gebruiken? (je hebt er {jokers})</BigButton>
        {/if}
      {/if}

      <BigButton variant="primary" size="large" full disabled={!seen} onclick={done}>
        {seen ? 'Gelezen! Geef door ▶' : 'Eerst je tip lezen...'}
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
    width: min(620px, 100%);
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
    animation: bounce 1.6s ease-in-out infinite;
  }

  .av {
    width: 110px;
    height: 110px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-size: 3.8rem;
    background: var(--c);
    box-shadow: 0 0 0 6px rgba(255, 255, 255, 0.15), var(--shadow);
  }

  .nm {
    font-family: var(--font-title);
    font-weight: 700;
    font-size: 2.2rem;
  }

  /* Exact dezelfde opmaak voor iedereen: van op afstand zie je geen verschil. */
  .tip-card {
    height: 100%;
    min-height: 360px;
    border-radius: var(--radius);
    padding: 22px 24px;
    background:
      repeating-linear-gradient(0deg, rgba(42, 20, 84, 0.06) 0 1px, transparent 1px 32px),
      #fff8e8;
    color: #2a1454;
    border: 4px solid #7a5222;
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow: auto;
  }

  .tip-card header {
    display: flex;
    justify-content: space-between;
    font-weight: 800;
  }

  .label {
    font-family: var(--font-title);
    color: #c62828;
    letter-spacing: 0.08em;
  }

  .tip {
    font-family: var(--font-title);
    font-weight: 500;
    font-size: clamp(1.4rem, 4.5vw, 1.9rem);
    line-height: 1.3;
    margin: 0;
  }

  .extra {
    margin: 0;
    background: rgba(41, 211, 196, 0.16);
    border-radius: 12px;
    padding: 10px 12px;
    font-size: 1.1rem;
  }

  .note {
    margin: auto 0 0;
    font-weight: 800;
    color: #6b4a1a;
  }

  .row {
    display: flex;
    gap: 10px;
    justify-content: center;
    flex-wrap: wrap;
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

  @keyframes bounce {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-8px);
    }
  }
</style>
