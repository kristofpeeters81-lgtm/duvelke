<script lang="ts">
  import { untrack } from 'svelte';
  import BigButton from '../../components/BigButton.svelte';
  import Dossier from '../../components/Dossier.svelte';
  import HoldToReveal from '../../components/HoldToReveal.svelte';
  import WindyBubble from '../../components/WindyBubble.svelte';
  import type { GamePlayer } from '../../lib/game';
  import { app, go, lineContext, showToast } from '../../lib/store.svelte';
  import { pickLine, rememberLine } from '../../lib/windy';

  type View = 'hub' | 'kies' | 'bevestig' | 'toon' | 'pin' | 'overzicht' | 'stoppen';

  let view = $state<View>('hub');
  let chosen = $state<GamePlayer | null>(null);
  let pinInput = $state('');

  const game = $derived(app.game);

  const hubLine = untrack(() => {
    if (!app.game) return '';
    const line = pickLine('zoon', app.windyLines, lineContext(), app.game.recentLines);
    if (line) app.game.recentLines = rememberLine(app.game.recentLines, line.id);
    return `Alle geheime dossiers zijn uitgedeeld! ${line?.text ?? ''}`.trim();
  });

  function choose(p: GamePlayer): void {
    chosen = p;
    view = 'bevestig';
  }

  function checkPin(): void {
    if (game?.pin && pinInput === game.pin) {
      view = 'overzicht';
    } else {
      showToast('Foute pincode.', 'error');
    }
    pinInput = '';
  }

  function stopGame(): void {
    app.game = null;
    go('home');
  }

  function back(): void {
    view = 'hub';
    chosen = null;
  }
</script>

{#if game}
  {#if view === 'hub'}
    <div class="hub">
      <WindyBubble text={hubLine} mood="blij" size={170} />

      <div class="soon">
        <span class="em">🎯</span>
        <div>
          <strong>De opdrachten komen in de volgende versie.</strong>
          <p>Nu kan je al testen hoe de rollen verdeeld worden en hoe de tablet rondgaat.</p>
        </div>
      </div>

      <div class="actions">
        <BigButton variant="secondary" full onclick={() => (view = 'kies')}>🆘 Toon mijn rol opnieuw</BigButton>
        {#if game.pin}
          <BigButton variant="ghost" full onclick={() => (view = 'pin')}>🔐 Rollenoverzicht spelleider</BigButton>
        {/if}
        <BigButton variant="ghost" full onclick={() => go('home')}>🏠 Naar het beginscherm</BigButton>
        <BigButton variant="danger" full onclick={() => (view = 'stoppen')}>⏹ Spel stoppen</BigButton>
      </div>
    </div>
  {:else if view === 'kies'}
    <div class="panel">
      <h2>Wie ben jij?</h2>
      <p class="hint">Enkel je eigen rol wordt getoond.</p>
      <div class="grid">
        {#each game.players as p (p.playerId)}
          <button type="button" class="pl" onclick={() => choose(p)}>
            <span class="av" style="--c:{p.color}">{p.avatar}</span>
            <span class="nm">{p.name}</span>
          </button>
        {/each}
      </div>
      <BigButton variant="ghost" full onclick={back}>◀ Terug</BigButton>
    </div>
  {:else if view === 'bevestig' && chosen}
    <div class="panel center">
      <span class="av big" style="--c:{chosen.color}">{chosen.avatar}</span>
      <h2>Ben jij echt {chosen.name}?</h2>
      <p class="hint">Stiekem de rol van iemand anders bekijken is valsspelen. Dat doet enkel {game.settings.saboteurName}!</p>
      <BigButton variant="gold" size="large" full onclick={() => (view = 'toon')}>Ja, ik ben {chosen.name}</BigButton>
      <BigButton variant="ghost" full onclick={back}>Nee, terug</BigButton>
    </div>
  {:else if view === 'toon' && chosen}
    <div class="panel">
      <HoldToReveal label="Hou ingedrukt om te lezen">
        <Dossier player={chosen} settings={game.settings} playerCount={game.players.length} />
      </HoldToReveal>
      <BigButton variant="primary" full onclick={back}>Klaar</BigButton>
    </div>
  {:else if view === 'pin'}
    <div class="panel center">
      <h2>🔐 Pincode</h2>
      <p class="hint">Enkel voor de spelleider die niet meespeelt.</p>
      <input
        class="text-input pin"
        type="password"
        inputmode="numeric"
        maxlength="4"
        bind:value={pinInput}
        oninput={() => (pinInput = pinInput.replace(/\D/g, '').slice(0, 4))}
        onkeydown={(e) => e.key === 'Enter' && checkPin()}
        aria-label="Pincode"
      />
      <BigButton variant="primary" full disabled={pinInput.length !== 4} onclick={checkPin}>Openen</BigButton>
      <BigButton variant="ghost" full onclick={back}>◀ Terug</BigButton>
    </div>
  {:else if view === 'overzicht'}
    <div class="panel">
      <h2>Rollenoverzicht</h2>
      <p class="hint">Niet laten zien aan de spelers!</p>
      <ul class="roles">
        {#each game.players as p (p.playerId)}
          <li class:sab={p.role === 'saboteur'}>
            <span class="av small" style="--c:{p.color}">{p.avatar}</span>
            <span class="nm">{p.name}</span>
            <span class="role">
              {p.role === 'saboteur' ? `😈 ${game.settings.saboteurName}` : '🔍 Speurder'}{p.speurneus ? ' · Speurneus' : ''}{p.bemoeial ? ' · Bemoeial' : ''}
            </span>
          </li>
        {/each}
      </ul>
      <BigButton variant="primary" full onclick={back}>Sluiten</BigButton>
    </div>
  {:else if view === 'stoppen'}
    <div class="panel center">
      <h2>Spel stoppen?</h2>
      <p class="hint">Alle rollen en antwoorden van dit spel worden gewist. Dit kan je niet ongedaan maken.</p>
      <BigButton variant="danger" full onclick={stopGame}>Ja, stop het spel</BigButton>
      <BigButton variant="ghost" full onclick={back}>Nee, verder spelen</BigButton>
    </div>
  {/if}
{/if}

<style>
  .hub,
  .panel {
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: min(640px, 100%);
    margin: 0 auto;
  }

  .center {
    align-items: center;
    text-align: center;
  }

  .soon {
    display: flex;
    gap: 14px;
    align-items: center;
    padding: 16px 18px;
    border-radius: var(--radius);
    background: rgba(255, 207, 63, 0.1);
    border: 2px dashed rgba(255, 207, 63, 0.5);
  }

  .soon .em {
    font-size: 2.2rem;
  }

  .soon p {
    margin: 4px 0 0;
    color: var(--text-soft);
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 10px;
  }

  .pl {
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

  .av {
    width: 58px;
    height: 58px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-size: 2rem;
    background: var(--c);
    flex: none;
  }

  .av.big {
    width: 110px;
    height: 110px;
    font-size: 3.6rem;
  }

  .av.small {
    width: 40px;
    height: 40px;
    font-size: 1.4rem;
  }

  .nm {
    font-weight: 800;
    word-break: break-word;
  }

  .pin {
    max-width: 200px;
    font-size: 1.8rem;
    letter-spacing: 0.4em;
    text-align: center;
  }

  .roles {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 8px;
  }

  .roles li {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    border-radius: 14px;
    background: var(--bg-raised);
  }

  .roles li.sab {
    background: rgba(239, 59, 74, 0.25);
    border: 2px solid var(--red);
  }

  .role {
    margin-left: auto;
    font-weight: 700;
    color: var(--text-soft);
    text-align: right;
  }
</style>
