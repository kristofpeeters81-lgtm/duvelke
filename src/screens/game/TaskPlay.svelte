<script lang="ts">
  import { untrack } from 'svelte';
  import BigButton from '../../components/BigButton.svelte';
  import HoldToReveal from '../../components/HoldToReveal.svelte';
  import TreasureChest from '../../components/TreasureChest.svelte';
  import WindyBubble from '../../components/WindyBubble.svelte';
  import { LOCATIONS } from '../../lib/data/locations';
  import { SUPPLIES } from '../../lib/data/supplies';
  import PhotoButton from '../../components/PhotoButton.svelte';
  import WindyPopup from '../../components/WindyPopup.svelte';
  import { afterAnnouncement, afterTreasure, finishCurrent } from '../../lib/game';
  import { gemsForStopwatch, marginFor, maxGems, targetFor, treasure, type Outcome } from '../../lib/gameplay';
  import { sfx } from '../../lib/sfx';
  import { prefetch } from '../../lib/speech';
  import { app, recordTaskPlayed, windySays } from '../../lib/store.svelte';
  import { CATEGORY_LABELS } from '../../lib/tasks/labels';
  import { fillVars } from '../../lib/tasks/program';
  import { hostWording } from '../../lib/tasks/wording';
  import { getTask } from '../../lib/tasks/registry';
  import Briefing from './Briefing.svelte';
  import Dilemma from './Dilemma.svelte';
  import GossipScene from './GossipScene.svelte';
  import QuizRunner from './QuizRunner.svelte';
  import ReadAloud, { hasAnswers } from './ReadAloud.svelte';
  import ResultPicker from './ResultPicker.svelte';
  import StopwatchRunner from './StopwatchRunner.svelte';
  import TaskTimer from './TaskTimer.svelte';

  const game = $derived(app.game);
  const current = $derived(game?.current ?? null);
  const item = $derived(game ? game.program[game.taskIndex] : undefined);
  const task = $derived(item ? getTask(item.taskId) : undefined);
  const location = $derived(LOCATIONS.find((l) => l.id === item?.location));
  const explain = $derived(task && item ? hostWording(fillVars(task.explain, item.vars), task, app.settings.hostName) : '');
  const target = $derived(task && item ? targetFor(task, item) : null);
  const total = $derived(game ? treasure(game.program, game.results, getTask) : { gems: 0, max: 0 });

  function name(id: string): string {
    return game?.players.find((p) => p.playerId === id)?.name ?? '?';
  }

  function player(id: string) {
    return game?.players.find((p) => p.playerId === id);
  }

  // Windy: één uitspraak per stap, niet bij elke hertekening een nieuwe.
  let announce = $state<{ id: string; text: string } | null>(null);
  let reaction = $state<{ id: string; text: string; happy: boolean } | null>(null);
  let lastAnnounced = '';
  $effect(() => {
    const uid = current?.uid;
    if (current?.step === 'aankondiging' && uid && uid !== lastAnnounced) {
      lastAnnounced = uid;
      announce = untrack(() => windySays('aankondiging'));
    }
  });

  // De uitleg alvast laten maken door de AI-stem terwijl Windy de opdracht aankondigt. Begint intussen
  // de geheime briefing, dan wordt dat geschrapt: rekenen blokkeert het scherm even, en dat mag niet
  // terwijl iemand zijn kaartje vasthoudt.
  let prefetched = '';
  $effect(() => {
    const step = current?.step;
    if (step === 'aankondiging' && explain && explain !== prefetched) {
      prefetched = explain;
      const voice = untrack(() => $state.snapshot(app.settings.voice));
      void prefetch(explain, voice, () => app.game?.current?.step !== 'aankondiging');
    }
  });

  // Windy moeit zich tussendoor met de opdracht.
  let popup = $state<{ id: string; text: string; key: number } | null>(null);
  let popupKey = 0;
  function moei(category: 'bemoeien' | 'tijd'): void {
    const line = untrack(() => windySays(category));
    if (line) popup = { ...line, key: ++popupKey };
  }

  // Zonder timer: na een tijdje toch eens komen moeien (niet als Windy vragen voorleest).
  $effect(() => {
    const step = current?.step;
    const quiet = !!current?.timer || task?.scoring.type === 'quiz' || task?.scoring.type === 'stopwatch' || (answersList && !selfRead);
    if (step !== 'uitleg' || quiet) return;
    const first = setTimeout(() => moei('bemoeien'), 75000);
    const second = setTimeout(() => moei('bemoeien'), 180000);
    return () => {
      clearTimeout(first);
      clearTimeout(second);
    };
  });

  function go(step: NonNullable<typeof current>['step']): void {
    if (current) current.step = step;
    window.scrollTo(0, 0);
  }

  function startPlaying(): void {
    if (!task || !current) return;
    if (task.scoring.type === 'quiz' || task.scoring.type === 'stopwatch' || current.timer) go('bezig');
    else go('resultaat');
  }

  function setResult(outcome: Outcome, gems: number, score: number | null): void {
    if (!current || !item || !task) return;
    current.pending = { uid: item.uid, taskId: item.taskId, outcome, score, target, gems, maxGems: maxGems(task), roles: $state.snapshot(current.roles) };
    const happy = gems >= maxGems(task) * 0.6;
    const line = windySays(happy ? 'gelukt' : 'mislukt');
    reaction = line ? { ...line, happy } : null;
    if (happy) sfx.success();
    else sfx.fail();
    go('schat');
    // Edelsteen-geluidjes terwijl de kist vult
    for (let i = 0; i < Math.min(gems, 10); i++) setTimeout(() => sfx.gem(), 700 + i * 120);
  }

  function rate(rating: 1 | -1 | 0): void {
    if (!app.game || !item) return;
    const result = finishCurrent(app.game, rating);
    if (result) recordTaskPlayed(result.taskId, rating);
  }

  function supplyLabel(id: string): string {
    const s = SUPPLIES.find((x) => x.id === id) ?? game?.settings.customSupplies.find((c) => c.id === id);
    return s ? `${s.emoji} ${s.label}` : id;
  }

  const answersList = $derived(item ? hasAnswers(item.list) : false);
  let selfRead = $state(false);
  let readDone = $state(false);
  let readScore = $state<number | null>(null);
  $effect(() => {
    void item?.uid;
    selfRead = false;
    readDone = false;
    readScore = null;
  });

  const listOwner = $derived.by(() => {
    const first = current ? Object.values(current.roles)[0]?.[0] : undefined;
    return first ? name(first) : null;
  });
</script>

{#if game && current && item && task}
  {#if current.step === 'roddel'}
    <GossipScene />
  {:else if current.step === 'briefing'}
    <Briefing />
  {:else if current.step === 'dilemma'}
    <Dilemma />
  {:else if current.step === 'aankondiging'}
    <div class="stack">
      {#if announce}
        {#key announce.id}<WindyBubble text={announce.text} lineId={announce.id} mood="blij" size={170} />{/key}
      {/if}
      <div class="card announce">
        <span class="nr">Opdracht {game.taskIndex + 1} van {game.program.length}</span>
        <span class="big-em">{task.emoji}</span>
        <h2>{task.title}</h2>
        <div class="tags">
          <span class="tag">{CATEGORY_LABELS[task.category]}</span>
          {#if location}<span class="tag">{location.emoji} {location.label}{location.needsAdult ? ' · 🦺 met een volwassene' : ''}</span>{/if}
        </div>
      </div>
      <BigButton variant="primary" size="large" full onclick={() => app.game && afterAnnouncement(app.game)}>Wat moeten we doen? ▶</BigButton>
    </div>
  {:else if current.step === 'uitleg'}
    <div class="stack">
      <h2 class="title">{task.emoji} {task.title}</h2>
      {#key item.uid}<WindyBubble text={explain} mood="stiekem" size={120} />{/key}

      {#if Object.keys(current.roles).length > 0}
        <div class="card">
          <h3>🎭 Rollen</h3>
          {#each task.roles ?? [] as role (role.name)}
            <div class="role">
              <strong>{role.name}:</strong>
              {#each current.roles[role.name] ?? [] as id (id)}
                {@const p = player(id)}
                <span class="pchip"><span class="av" style="--c:{p?.color}">{p?.avatar}</span>{p?.name}</span>
              {/each}
              <span class="hint small">{role.hint}</span>
            </div>
          {/each}
        </div>
      {/if}

      {#if task.list && item.list.length > 0}
        {#if task.list.secret && answersList && !selfRead}
          <!-- Vragen met antwoorden: Windy leest voor, dan ziet ook een meespelend hulpje de antwoorden niet. -->
          <div class="card">
            <h3>🔊 {app.settings.hostName} leest voor</h3>
            {#if readDone}
              <p class="hint small">Alles voorgelezen: {readScore} van de {item.list.length} juist! Tik op de knop hieronder.</p>
            {:else}
              <ReadAloud items={item.list} ondone={(n) => ((readDone = true), (readScore = n))} />
            {/if}
            <button type="button" class="link" onclick={() => (selfRead = true)}>🤫 Toch liever zelf stiekem lezen (hulpje speelt niet mee)</button>
          </div>
        {:else if task.list.secret}
          <div class="card">
            <h3>🤫 {hostWording(task.list.title, task, app.settings.hostName)}</h3>
            <p class="hint small">Enkel voor {listOwner ?? 'het hulpje'}! Hou ingedrukt om te lezen.</p>
            <div class="secret">
              <HoldToReveal label="Hou ingedrukt">
                <div class="secret-list">
                  <ol>
                    {#each item.list as entry, i (i)}<li>{entry}</li>{/each}
                  </ol>
                </div>
              </HoldToReveal>
            </div>
          </div>
        {:else}
          <div class="card">
            <h3>📋 {hostWording(task.list.title, task, app.settings.hostName)}</h3>
            <ul class="open-list">
              {#each item.list as entry, i (i)}<li>{entry}</li>{/each}
            </ul>
          </div>
        {/if}
      {/if}

      {#if task.supplies.length > 0}
        <p class="hint">Nodig: {task.supplies.map(supplyLabel).join(', ')}</p>
      {/if}

      <BigButton variant="gold" size="large" full onclick={startPlaying}>
        {task.scoring.type === 'quiz' ? '❓ Start de quiz' : task.scoring.type === 'stopwatch' ? '⏱️ Naar de klok' : current.timer ? '⏱️ Naar de timer' : '✓ Gedaan? Naar het resultaat'}
      </BigButton>
    </div>
  {:else if current.step === 'bezig'}
    <div class="stack">
      <h2 class="title">{task.emoji} {task.title}</h2>
      {#if task.scoring.type === 'quiz'}
        <QuizRunner
          difficulty={game.settings.difficulty}
          questions={current.quiz}
          answers={current.quizAnswers}
          ondone={(score) => setResult('score', Math.round((maxGems(task) * score) / Math.max(1, current.quiz.length)), score)}
        />
      {:else if task.scoring.type === 'stopwatch' && target !== null}
        <StopwatchRunner
          stopwatch={current.stopwatch}
          {target}
          margin={marginFor(task, item)}
          ondone={(s) => setResult('score', gemsForStopwatch(task, s, target, marginFor(task, item)), Math.round(s * 10) / 10)}
        />
      {:else if current.timer}
        <TaskTimer timer={current.timer} ondone={() => go('resultaat')} onmoment={(kind) => moei(kind === 'half' ? 'bemoeien' : 'tijd')} />
        <PhotoButton taskUid={item.uid} caption={task.title} idea={task.photo} />
        <details class="card reminder">
          <summary>📜 Uitleg en rollen</summary>
          <p>{explain}</p>
          {#each Object.entries(current.roles) as [role, ids] (role)}
            <p><strong>{role}:</strong> {ids.map(name).join(', ')}</p>
          {/each}
        </details>
        {#if task.list && !task.list.secret && item.list.length > 0}
          <ul class="open-list compact">
            {#each item.list as entry, i (i)}<li>{entry}</li>{/each}
          </ul>
        {/if}
      {:else}
        <BigButton variant="gold" size="large" full onclick={() => go('resultaat')}>Naar het resultaat ▶</BigButton>
      {/if}
    </div>
  {:else if current.step === 'resultaat'}
    <ResultPicker {task} {target} initial={readScore} onpick={setResult} />
  {:else if current.step === 'schat' && current.pending}
    <div class="stack center">
      <div class="gain" class:none={current.pending.gems === 0}>
        {current.pending.gems > 0 ? `+${current.pending.gems} 💎` : '0 💎'}
      </div>
      <TreasureChest gems={total.gems + current.pending.gems} max={total.max} size="groot" bounce={current.pending.gems > 0} />
      {#if reaction}
        {#key reaction.id}<WindyBubble text={reaction.text} lineId={reaction.id} mood={reaction.happy ? 'blij' : 'geschokt'} size={150} />{/key}
      {/if}
      <PhotoButton taskUid={item.uid} caption={task.title} idea={task.photo} />
      <BigButton variant="primary" size="large" full onclick={() => app.game && afterTreasure(app.game)}>Verder ▶</BigButton>
    </div>
  {:else if current.step === 'duim'}
    <div class="stack center">
      <h2>Vonden jullie dit een leuke opdracht?</h2>
      <p class="hint">Leuke opdrachten komen vaker terug in een volgend spel.</p>
      <div class="thumbs">
        <button type="button" class="thumb" aria-label="Leuk" onclick={() => rate(1)}>👍</button>
        <button type="button" class="thumb" aria-label="Niet leuk" onclick={() => rate(-1)}>👎</button>
      </div>
      <button type="button" class="link" onclick={() => rate(0)}>Overslaan</button>
    </div>
  {/if}
{/if}

<WindyPopup line={popup} />

<style>
  .stack {
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: min(680px, 100%);
    margin: 0 auto;
  }

  .center {
    align-items: center;
    text-align: center;
  }

  .title {
    text-align: center;
    font-size: clamp(1.6rem, 5vw, 2.2rem);
  }

  .card {
    background: var(--bg-raised);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    padding: 16px 18px;
    box-shadow: var(--shadow);
  }

  .card h3 {
    margin: 0 0 10px;
    font-size: 1.2rem;
  }

  .announce {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    text-align: center;
  }

  .announce h2 {
    font-size: clamp(2rem, 7vw, 3rem);
  }

  .nr {
    color: var(--text-dim);
    font-weight: 800;
  }

  .big-em {
    font-size: 5rem;
    animation: pop 0.6s cubic-bezier(0.3, 1.6, 0.5, 1);
  }

  .tags {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: center;
  }

  .tag {
    font-weight: 700;
    padding: 4px 12px;
    border-radius: 999px;
    background: var(--bg-deep);
    color: var(--text-soft);
  }

  .role {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .pchip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px 4px 4px;
    border-radius: 999px;
    background: var(--bg-deep);
    font-weight: 800;
  }

  .av {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: var(--c);
  }

  .small {
    margin: 0;
    font-size: 0.85rem;
  }

  .secret :global(.hold) {
    min-height: 220px;
  }

  .secret-list {
    min-height: 100%;
    border-radius: var(--radius);
    background: #fff8e8;
    color: #2a1454;
    border: 4px solid #7a5222;
    padding: 16px 20px;
    font-size: 1.2rem;
    font-weight: 700;
  }

  .secret-list ol {
    margin: 0;
    padding-left: 24px;
    display: grid;
    gap: 6px;
  }

  .open-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 8px;
  }

  .open-list li {
    padding: 10px 12px;
    border-radius: 12px;
    background: var(--bg-deep);
    font-weight: 700;
  }

  .open-list.compact {
    margin-top: 16px;
  }

  .reminder summary {
    font-weight: 800;
    cursor: pointer;
    padding: 4px 0;
  }

  .reminder p {
    margin: 8px 0 0;
  }

  .gain {
    font-family: var(--font-title);
    font-weight: 700;
    font-size: 3.4rem;
    color: var(--gold);
    animation: rise 1.2s cubic-bezier(0.3, 1.4, 0.5, 1);
  }

  .gain.none {
    color: var(--text-dim);
  }

  .thumbs {
    display: flex;
    gap: 30px;
  }

  .thumb {
    width: 130px;
    height: 130px;
    border-radius: 50%;
    border: 3px solid var(--line);
    background: var(--bg-raised);
    font-size: 4rem;
    cursor: pointer;
  }

  .thumb:active {
    transform: scale(0.92);
  }

  .link {
    background: none;
    border: none;
    color: var(--text-dim);
    text-decoration: underline;
    font-weight: 700;
    padding: 10px;
    cursor: pointer;
  }

  @keyframes pop {
    from {
      transform: scale(0.3);
      opacity: 0;
    }
  }

  @keyframes rise {
    from {
      transform: translateY(40px) scale(0.5);
      opacity: 0;
    }
  }
</style>
