<script lang="ts">
  import { untrack } from 'svelte';
  import BigButton from '../../components/BigButton.svelte';
  import Confetti from '../../components/Confetti.svelte';
  import Duvelke from '../../components/Duvelke.svelte';
  import TreasureChest from '../../components/TreasureChest.svelte';
  import WindyBubble from '../../components/WindyBubble.svelte';
  import { physicalShare, ranking } from '../../lib/finale';
  import { finaleStep } from '../../lib/game';
  import { treasure } from '../../lib/gameplay';
  import { gossipSentence } from '../../lib/secrets';
  import { sfx } from '../../lib/sfx';
  import { speak } from '../../lib/speech';
  import { app, go, windySays } from '../../lib/store.svelte';
  import { getTask } from '../../lib/tasks/registry';
  import FinalTest from './FinalTest.svelte';
  import Slideshow from './Slideshow.svelte';

  const game = $derived(app.game);
  const f = $derived(game?.finale ?? null);
  const sab = $derived(game?.settings.saboteurName ?? '');
  const total = $derived(game ? treasure(game.program, game.results, getTask) : { gems: 0, max: 0 });
  const pct = $derived(total.max > 0 ? Math.round((total.gems / total.max) * 100) : 0);
  const groupWins = $derived(pct >= 50);
  const saboteurs = $derived(game?.players.filter((p) => p.role === 'saboteur') ?? []);
  const innocents = $derived(game ? (f ? f.order : []).map((id) => game.players.find((p) => p.playerId === id)).filter((p) => p && p.role !== 'saboteur') : []);
  const ranks = $derived(game && f ? ranking(game.players, f.questions, f.answers) : []);
  const speurneus = $derived(game?.players.find((p) => p.speurneus));
  const speurneusScore = $derived(speurneus && f ? ranks.find((r) => r.playerId === speurneus.playerId) : undefined);
  // Hoofdranglijst zonder de Speurneus: die speelt voor een eigen medaille.
  const mainRanks = $derived(ranks.filter((r) => r.playerId !== speurneus?.playerId));
  const multiple = $derived(saboteurs.length > 1);

  const intro = untrack(() => windySays('einde'));

  function player(id: string) {
    return game?.players.find((p) => p.playerId === id);
  }

  // Windy presenteert de finale.
  let narration = $state<{ id: string; text: string; playerId?: string } | null>(null);
  function narrate(category: Parameters<typeof windySays>[0], speler?: string, playerId?: string): void {
    const line = untrack(() => windySays(category, speler));
    narration = line ? { ...line, playerId } : null;
  }
  function say(text: string): void {
    void speak(text, $state.snapshot(app.settings.voice));
  }

  let narratedStep = '';
  $effect(() => {
    const step = f?.step;
    if (!step || step === narratedStep) return;
    narratedStep = step;
    narration = null;
    if (step === 'schat') untrack(() => (total.max > 0 ? narrate(groupWins ? 'schat-gewonnen' : 'schat-verloren') : null));
  });

  function nextUnmask(): void {
    if (!f) return;
    if (f.reveal < innocents.length) {
      sfx.tap();
      const who = innocents[f.reveal];
      f.reveal += 1;
      if (who && f.reveal < innocents.length) say(`${who.name}... is géén ${sab}!`);
      if (f.reveal === innocents.length) {
        const names = saboteurs.map((s) => s.name).join(' en ');
        setTimeout(() => narrate('ontmaskerd', names, saboteurs.length === 1 ? saboteurs[0]?.playerId : undefined), 2600);
      }
      if (f.reveal === innocents.length) {
        sfx.drumroll(1.8);
        setTimeout(() => sfx.unmask(), 1800);
      }
    }
  }

  function nextRank(): void {
    if (!f) return;
    if (f.reveal < mainRanks.length) {
      f.reveal += 1;
      const place = mainRanks.length - f.reveal + 1;
      const r = mainRanks[place - 1];
      const p = r ? player(r.playerId) : undefined;
      if (p && place > 1) say(`Op plaats ${place}: ${p.name}!`);
      if (p && place === 1) setTimeout(() => narrate('winnaar', p.name, p.playerId), 2200);
      if (f.reveal === mainRanks.length) {
        sfx.drumroll(1.4);
        setTimeout(() => sfx.fanfare(), 1400);
      } else sfx.tap();
    }
  }

  function start(step: Parameters<typeof finaleStep>[1]): void {
    if (!app.game) return;
    finaleStep(app.game, step);
    if (step === 'schat') sfx.drumroll(1.2);
    window.scrollTo(0, 0);
  }

  function endGame(): void {
    app.game = null;
    go('home');
  }

  const unmasked = $derived(f ? f.reveal >= innocents.length : false);
  const shares = $derived(game && game.settings.treasureMode === 'fysiek' ? physicalShare(game.settings.treasureItems, total.gems, total.max, game.players.length) : []);
</script>

{#if game && f}
  {#if f.step === 'intro'}
    <div class="stack center">
      <h2 class="title">🏁 Het moment van de waarheid</h2>
      {#if intro}{#key intro.id}<WindyBubble text={intro.text} lineId={intro.id} mood="geschokt" size={190} />{/key}{/if}
      <div class="card">
        <p><strong>Alle opdrachten zijn gespeeld!</strong> Nu volgt De Test: {f.questions.length} vragen over {sab}.</p>
        <p class="hint">Iedereen antwoordt apart. Wie het meest juist heeft, wint. Bij een gelijke stand wint wie {sab} juist had, en daarna wie het snelst was.</p>
      </div>
      <BigButton variant="gold" size="large" full onclick={() => start('test')}>📝 Start De Test</BigButton>
    </div>
  {:else if f.step === 'test'}
    <FinalTest />
  {:else if f.step === 'schat'}
    <div class="stack center">
      <h2 class="title">💎 De schatkist</h2>
      <TreasureChest gems={total.gems} max={total.max} size="groot" bounce />
      <p class="pct" class:win={groupWins}>{pct}%</p>
      {#if total.max === 0}
        <div class="verdict">🤷 Alle opdrachten werden overgeslagen, dus er is geen schat te verdelen. Niemand wint de schat!</div>
      {:else if groupWins}
        <div class="verdict good">🎉 Meer dan de helft! De groep wint de schat. {sab} is er niet in geslaagd alles te verknoeien!</div>
        {#if groupWins}<Confetti count={60} />{/if}
      {:else}
        <div class="verdict bad">😈 Minder dan de helft... {sab} wint de schat! Wie was het toch?</div>
      {/if}
      {#if shares.length > 0}
        <div class="card">
          <h3>🍬 De echte schat</h3>
          {#if groupWins}
            {#each shares as s (s.name)}
              <p><strong>{s.earned} van de {s.total} {s.name}</strong>: dat is {s.perPerson} per persoon{s.rest > 0 ? `, en ${s.rest} extra voor de winnaar van De Test` : ''}.</p>
            {/each}
          {:else}
            <p>De groep verdiende {pct}% van de schat: {shares.map((s) => `${s.earned} ${s.name}`).join(', ')}. Het is aan het hulpje of {sab} de rest krijgt...</p>
          {/if}
        </div>
      {/if}
      {#if narration}{#key narration.id}<WindyBubble text={narration.text} lineId={narration.id} playerId={narration.playerId} mood="geschokt" size={130} />{/key}{/if}
      <BigButton variant="primary" size="large" full onclick={() => start('ontmaskering')}>Wie is {sab}? ▶</BigButton>
    </div>
  {:else if f.step === 'ontmaskering'}
    <div class="stack center">
      <h2 class="title">🎭 De ontmaskering</h2>
      <p class="hint">{unmasked ? '' : `Tik op "Volgende" om één voor één te zien wie géén ${sab} is.`}</p>
      <div class="cards">
        {#each game.players as p (p.playerId)}
          {@const idx = innocents.findIndex((x) => x?.playerId === p.playerId)}
          {@const cleared = idx >= 0 && idx < f.reveal}
          {@const isSab = p.role === 'saboteur'}
          <div class="pcard" class:cleared class:sab={unmasked && isSab}>
            <span class="av" style="--c:{p.color}">{p.avatar}</span>
            <span class="nm">{p.name}</span>
            {#if cleared}<span class="stamp ok">✓ onschuldig</span>{:else if unmasked && isSab}<span class="stamp">😈</span>{/if}
          </div>
        {/each}
      </div>
      {#if !unmasked}
        <BigButton variant="gold" size="large" full onclick={nextUnmask}>Volgende ▶</BigButton>
      {:else}
        <div class="reveal">
          <Duvelke size={170} />
          <h2>{saboteurs.map((s) => s.name).join(' en ')} {multiple ? 'waren' : 'was'} {sab}!</h2>
        </div>
        <Confetti count={40} />
        {#if narration}{#key narration.id}<WindyBubble text={narration.text} lineId={narration.id} playerId={narration.playerId} mood="geschokt" size={130} />{/key}{/if}
        <BigButton variant="primary" size="large" full onclick={() => start('ranking')}>Wie wint De Test? ▶</BigButton>
      {/if}
    </div>
  {:else if f.step === 'ranking'}
    <div class="stack center">
      <h2 class="title">🏆 De uitslag van De Test</h2>
      <ol class="ranks">
        {#each mainRanks as r, i (r.playerId)}
          {@const p = player(r.playerId)}
          {@const place = i + 1}
          {@const shown = mainRanks.length - f.reveal <= i}
          <li class:shown class:winner={place === 1 && shown}>
            {#if shown}
              <span class="place">{place === 1 ? '👑' : place}</span>
              <span class="av sm" style="--c:{p?.color}">{p?.avatar}</span>
              <span class="nm">{p?.name}</span>
              <span class="sc">{r.correct}/{r.total} {r.foundSaboteur ? '🎯' : ''}</span>
            {:else}
              <span class="place">{place}</span><span class="nm hidden">???</span>
            {/if}
          </li>
        {/each}
      </ol>
      {#if f.reveal < mainRanks.length}
        <BigButton variant="gold" size="large" full onclick={nextRank}>{f.reveal === mainRanks.length - 1 ? '🥁 En de winnaar is...' : 'Volgende ▶'}</BigButton>
      {:else}
        <Confetti count={90} />
        {#if mainRanks[0]}<p class="champ">🎉 Proficiat {player(mainRanks[0].playerId)?.name}: de beste speurder van vandaag!</p>{/if}
        {#if narration}{#key narration.id}<WindyBubble text={narration.text} lineId={narration.id} playerId={narration.playerId} mood="geschokt" size={130} />{/key}{/if}
        {#if speurneus && speurneusScore}
          <div class="card">
            <h3>🔍 De Speurneus-medaille</h3>
            <p>
              {speurneus.name} was stiekem de Speurneus en kreeg onschuldige namen.
              {speurneusScore.foundSaboteur ? `En had ${sab} juist: medaille verdiend! 🥇` : `Maar had ${sab} toch niet juist... Geen medaille!`}
            </p>
          </div>
        {/if}
        <BigButton variant="primary" size="large" full onclick={() => start('terugblik')}>Wat deed {sab} allemaal? ▶</BigButton>
      {/if}
    </div>
  {:else if f.step === 'terugblik'}
    <div class="stack">
      <h2 class="title">🕵️ Wat {sab} stiekem deed</h2>
      {#if game.sabotageLog.length === 0}
        <p class="hint center">Er waren geen geheime briefings in dit spel.</p>
      {:else}
        <ul class="log">
          {#each game.sabotageLog as s, i (i)}
            {@const item = game.program.find((p) => p.uid === s.taskUid)}
            {@const task = item ? getTask(item.taskId) : undefined}
            <li><span class="em">{task?.emoji ?? '❓'}</span><span><strong>{task?.title}</strong>{multiple ? ` (${player(s.playerId)?.name})` : ''}: "{s.tip}"</span></li>
          {/each}
        </ul>
      {/if}
      {#if game.gossipLog.length > 0}
        <h3>🤫 En de roddels?</h3>
        <ul class="log">
          {#each game.gossipLog as g, i (i)}
            <li class:lie={!g.truthful}>
              <span class="em">{g.source === 'windy' ? '👀' : '🗣️'}</span>
              <span>{gossipSentence(g, sab, multiple)} <strong>{g.truthful ? '✓ waar' : '✗ GELOGEN door de buurvrouw!'}</strong></span>
            </li>
          {/each}
        </ul>
      {/if}
      <BigButton variant="primary" size="large" full onclick={() => start('fotos')}>📸 De bewijsfoto's ▶</BigButton>
    </div>
  {:else if f.step === 'fotos'}
    <div class="stack">
      <h2 class="title">📸 De bewijsfoto's</h2>
      <Slideshow gameId={game.id} />
      <BigButton variant="gold" size="large" full onclick={endGame}>🏁 Spel afsluiten</BigButton>
      <BigButton variant="ghost" full onclick={() => go('home')}>🏠 Naar het beginscherm (spel blijft bewaard)</BigButton>
    </div>
  {/if}
{/if}

<style>
  .stack {
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: min(720px, 100%);
    margin: 0 auto;
  }

  .center {
    align-items: center;
    text-align: center;
  }

  .title {
    text-align: center;
    font-size: clamp(1.8rem, 6vw, 2.6rem);
  }

  .card {
    background: var(--bg-raised);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    padding: 16px 18px;
    text-align: left;
    width: 100%;
  }

  .card h3 {
    margin: 0 0 8px;
  }

  .pct {
    font-family: var(--font-title);
    font-weight: 700;
    font-size: 4rem;
    margin: 0;
    color: var(--pink);
  }

  .pct.win {
    color: var(--turquoise);
  }

  .verdict {
    padding: 14px 18px;
    border-radius: var(--radius);
    font-weight: 800;
    font-size: 1.2rem;
  }

  .verdict.good {
    background: rgba(41, 211, 196, 0.2);
  }

  .verdict.bad {
    background: rgba(239, 59, 74, 0.25);
  }

  .cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: 12px;
    width: 100%;
  }

  .pcard {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 16px 8px;
    border-radius: 20px;
    background: var(--bg-raised);
    border: 3px solid var(--line);
    transition: transform 0.4s ease, opacity 0.4s ease, filter 0.4s ease;
  }

  .pcard.cleared {
    opacity: 0.45;
    filter: grayscale(0.8);
    transform: scale(0.94);
  }

  .pcard.sab {
    border-color: var(--red);
    background: rgba(239, 59, 74, 0.3);
    transform: scale(1.08);
    animation: shake 0.6s ease 2;
  }

  .stamp {
    position: absolute;
    top: 8px;
    right: 8px;
    font-weight: 800;
    font-size: 0.8rem;
  }

  .stamp.ok {
    color: var(--turquoise);
  }

  .av {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-size: 2.2rem;
    background: var(--c);
  }

  .av.sm {
    width: 44px;
    height: 44px;
    font-size: 1.5rem;
  }

  .nm {
    font-weight: 800;
  }

  .hidden {
    color: var(--text-dim);
  }

  .reveal {
    display: flex;
    flex-direction: column;
    align-items: center;
    animation: pop 0.8s cubic-bezier(0.3, 1.6, 0.5, 1);
  }

  .reveal h2 {
    font-size: clamp(2rem, 7vw, 3rem);
    color: var(--red);
  }

  .ranks {
    list-style: none;
    padding: 0;
    margin: 0;
    width: 100%;
    display: grid;
    gap: 10px;
  }

  .ranks li {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-radius: 18px;
    background: var(--bg-raised);
    border: 2px solid var(--line);
  }

  .ranks li.shown {
    animation: pop 0.5s cubic-bezier(0.3, 1.6, 0.5, 1);
  }

  .ranks li.winner {
    border-color: var(--gold);
    background: rgba(255, 207, 63, 0.2);
    transform: scale(1.04);
  }

  .place {
    font-family: var(--font-title);
    font-weight: 700;
    font-size: 1.6rem;
    min-width: 40px;
  }

  .sc {
    margin-left: auto;
    font-weight: 800;
    color: var(--gold);
  }

  .champ {
    font-family: var(--font-title);
    font-size: 1.6rem;
    margin: 0;
  }

  .log {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 10px;
  }

  .log li {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    padding: 12px 14px;
    border-radius: 16px;
    background: var(--bg-raised);
  }

  .log li.lie {
    border: 2px solid var(--pink);
  }

  .em {
    font-size: 1.6rem;
  }

  @keyframes pop {
    from {
      transform: scale(0.5);
      opacity: 0;
    }
  }

  @keyframes shake {
    25% {
      transform: scale(1.08) rotate(-4deg);
    }
    75% {
      transform: scale(1.08) rotate(4deg);
    }
  }
</style>
