<script lang="ts">
  import { untrack } from 'svelte';
  import BigButton from '../../components/BigButton.svelte';
  import Dossier from '../../components/Dossier.svelte';
  import HoldToReveal from '../../components/HoldToReveal.svelte';
  import WindyBubble from '../../components/WindyBubble.svelte';
  import { PROFILE_QUESTIONS } from '../../lib/data/profile';
  import { startTasks } from '../../lib/game';
  import { app, lineContext } from '../../lib/store.svelte';
  import { pickLine, rememberLine } from '../../lib/windy';

  type Step = 'geef' | 'dossier' | 'vragen' | 'klaar';

  let step = $state<Step>('geef');
  let questionIndex = $state(0);
  let seen = $state(false);

  const game = $derived(app.game);
  const currentId = $derived(game ? game.revealOrder[game.revealIndex] : undefined);
  const current = $derived(game?.players.find((p) => p.playerId === currentId));
  const done = $derived(game ? game.players.filter((p) => p.hasSeenRole).length : 0);
  const question = $derived(PROFILE_QUESTIONS[questionIndex]);

  let passLine = $state('');
  $effect(() => {
    const name = current?.name;
    if (step !== 'geef' || !name) return;
    passLine = untrack(() => {
      if (!app.game) return '';
      const line = pickLine('doorgeven', app.windyLines, lineContext(name), app.game.recentLines);
      if (!line) return `Geef de tablet aan ${name}.`;
      app.game.recentLines = rememberLine(app.game.recentLines, line.id);
      return line.text;
    });
  });

  function iAm(): void {
    seen = false;
    step = 'dossier';
  }

  function dossierRead(): void {
    if (!app.game || !current) return;
    const p = app.game.players.find((x) => x.playerId === current.playerId);
    if (p) p.hasSeenRole = true;
    questionIndex = 0;
    step = 'vragen';
  }

  function answer(value: string): void {
    if (!app.game || !current || !question) return;
    const p = app.game.players.find((x) => x.playerId === current.playerId);
    if (p) p.profile[question.id] = value;
    if (questionIndex + 1 < PROFILE_QUESTIONS.length) {
      questionIndex += 1;
    } else {
      step = 'klaar';
    }
  }

  function next(): void {
    if (!app.game) return;
    app.game.revealIndex += 1;
    step = 'geef';
    if (app.game.revealIndex >= app.game.revealOrder.length) {
      startTasks(app.game);
    }
  }

  /** Iemand is er even niet: achteraan de rij zetten. */
  function later(): void {
    if (!app.game || !currentId) return;
    const order = app.game.revealOrder;
    const rest = order.slice(app.game.revealIndex + 1);
    if (rest.length === 0) return;
    app.game.revealOrder = [...order.slice(0, app.game.revealIndex), ...rest, currentId];
  }
</script>

{#if game && current}
  <div class="progress" aria-label="{done} van {game.players.length} dossiers uitgedeeld">
    {#each game.revealOrder as id, i (id)}
      <span class="dot" class:done={i < game.revealIndex} class:now={i === game.revealIndex}></span>
    {/each}
  </div>

  {#if step === 'geef'}
    <div class="pass">
      {#key passLine}
        <WindyBubble text={passLine} mood="blij" size={150} />
      {/key}
      <div class="target">
        <span class="av" style="--c:{current.color}">{current.avatar}</span>
        <span class="nm">{current.name}</span>
      </div>
      <BigButton variant="gold" size="large" full onclick={iAm}>Ik ben {current.name}</BigButton>
      {#if game.revealIndex < game.revealOrder.length - 1}
        <button type="button" class="link" onclick={later}>{current.name} is er even niet: later</button>
      {/if}
    </div>
  {:else if step === 'dossier'}
    <div class="reveal">
      <p class="instr">Zorg dat niemand meekijkt. Hou je vinger op de map om je dossier te lezen.</p>
      <HoldToReveal onseen={() => (seen = true)} label="Hou ingedrukt om te lezen">
        <Dossier player={current} settings={game.settings} playerCount={game.players.length} />
      </HoldToReveal>
      <BigButton variant="primary" size="large" full disabled={!seen} onclick={dossierRead}>
        {seen ? 'Gelezen! Verder ▶' : 'Eerst je dossier lezen...'}
      </BigButton>
      <button type="button" class="link" onclick={() => (step = 'geef')}>Oeps, ik ben niet {current.name}</button>
    </div>
  {:else if step === 'vragen' && question}
    <div class="questions">
      <p class="qcount">Vraag {questionIndex + 1} van {PROFILE_QUESTIONS.length} · {current.name}</p>
      <h2>{question.question}</h2>
      <div class="options">
        {#each question.options as opt (opt.value)}
          <button type="button" class="opt" aria-pressed={current.profile[question.id] === opt.value} onclick={() => answer(opt.value)}>
            {#if opt.swatch}<span class="sw" style="background:{opt.swatch}"></span>{:else if opt.emoji}<span class="em">{opt.emoji}</span>{/if}
            <span>{opt.label}</span>
          </button>
        {/each}
      </div>
      {#if questionIndex > 0}
        <button type="button" class="link" onclick={() => (questionIndex -= 1)}>◀ Vorige vraag</button>
      {/if}
    </div>
  {:else if step === 'klaar'}
    <div class="finish">
      <div class="big">🤫</div>
      <h2>Dank je, {current.name}!</h2>
      <p>Niets verklappen hé. Geef de tablet nu door.</p>
      <BigButton variant="gold" size="large" full onclick={next}>
        {game.revealIndex + 1 < game.revealOrder.length ? 'Tablet doorgegeven ▶' : 'Iedereen is klaar ▶'}
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

  .pass,
  .reveal,
  .questions,
  .finish {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 18px;
    width: min(620px, 100%);
    margin: 0 auto;
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

  .instr {
    text-align: center;
    color: var(--text-soft);
    font-weight: 700;
    margin: 0;
  }

  .qcount {
    color: var(--text-dim);
    margin: 0;
    font-weight: 700;
  }

  .questions h2 {
    text-align: center;
    font-size: clamp(1.6rem, 5vw, 2.2rem);
  }

  .options {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 12px;
    width: 100%;
  }

  .opt {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 68px;
    padding: 12px 14px;
    border-radius: 18px;
    border: 3px solid var(--line);
    background: var(--bg-raised);
    font-weight: 800;
    font-size: 1.05rem;
    text-align: left;
    cursor: pointer;
    transition: transform 0.1s ease;
  }

  .opt:active {
    transform: scale(0.95);
  }

  .opt[aria-pressed='true'] {
    border-color: var(--turquoise);
  }

  .sw {
    flex: none;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 3px solid rgba(255, 255, 255, 0.6);
  }

  .em {
    font-size: 1.8rem;
  }

  .finish {
    text-align: center;
  }

  .finish .big {
    font-size: 5rem;
  }

  .finish p {
    color: var(--text-soft);
    font-size: 1.2rem;
    margin: 0;
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
