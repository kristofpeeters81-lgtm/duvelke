<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import BigButton from '../components/BigButton.svelte';
  import TreasureChest from '../components/TreasureChest.svelte';
  import WindyBubble from '../components/WindyBubble.svelte';
  import type { WindyMood } from '../components/Windy.svelte';
  import type { LineCategory } from '../lib/data/windyLines';
  import { treasure } from '../lib/gameplay';
  import { app, windySays } from '../lib/store.svelte';
  import { getTask } from '../lib/tasks/registry';
  import { keepScreenOn } from '../lib/wakelock';
  import EndGame from './game/EndGame.svelte';
  import GameMenu from './game/GameMenu.svelte';
  import RoleReveal from './game/RoleReveal.svelte';
  import TaskPlay from './game/TaskPlay.svelte';

  onMount(() => keepScreenOn());

  const game = $derived(app.game);
  const total = $derived(game ? treasure(game.program, game.results, getTask) : { gems: 0, max: 0 });
  let menuOpen = $state(false);

  // De intro: twee begin-uitspraken en één over de geheime dossiers.
  const introPlan: { category: LineCategory; mood: WindyMood }[] = [
    { category: 'intro', mood: 'blij' },
    { category: 'intro', mood: 'geschokt' },
    { category: 'rollen', mood: 'stiekem' },
  ];
  let introStep = $state(0);
  let intro = $state<{ id: string; text: string } | null>(null);

  $effect(() => {
    if (game?.phase === 'intro') {
      const step = introPlan[introStep];
      intro = step ? untrack(() => windySays(step.category)) : null;
    }
  });

  function nextIntro(): void {
    if (!app.game) return;
    const next = introStep + 1;
    if (next >= introPlan.length) {
      app.game.phase = 'rollen';
      return;
    }
    introStep = next;
  }

  const playing = $derived(game?.phase === 'opdrachten' || game?.phase === 'einde');
</script>

{#if game}
  {#if playing}
    <header class="bar">
      <TreasureChest gems={total.gems} max={total.max} />
      {#if game.phase === 'opdrachten'}
        <span class="progress">Opdracht {game.taskIndex + 1}/{game.program.length}</span>
      {/if}
      <button type="button" class="menu" aria-label="Menu van het hulpje" onclick={() => (menuOpen = !menuOpen)}>☰</button>
    </header>
  {/if}

  <main class="page game" class:with-bar={playing}>
    {#if menuOpen}
      <GameMenu onclose={() => (menuOpen = false)} />
    {:else if game.phase === 'intro'}
      <div class="center">
        {#if intro}
          {#key intro.id}
            <WindyBubble text={intro.text} lineId={intro.id} mood={introPlan[introStep]?.mood ?? 'blij'} size={220}>
              <BigButton variant="primary" size="large" full onclick={nextIntro}>Verder ▶</BigButton>
            </WindyBubble>
          {/key}
        {:else}
          <BigButton variant="primary" size="large" full onclick={nextIntro}>Verder ▶</BigButton>
        {/if}
      </div>
    {:else if game.phase === 'rollen'}
      <RoleReveal />
    {:else if game.phase === 'opdrachten'}
      <TaskPlay />
    {:else if game.phase === 'einde'}
      <EndGame />
    {:else}
      <GameMenu />
    {/if}
  </main>
{/if}

<style>
  .bar {
    position: sticky;
    top: 0;
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 14px;
    padding: calc(8px + env(safe-area-inset-top)) 16px 8px;
    background: rgba(27, 12, 58, 0.85);
    backdrop-filter: blur(8px);
    border-bottom: 1px solid var(--line);
  }

  .progress {
    margin-left: auto;
    font-weight: 800;
    color: var(--text-soft);
  }

  .menu {
    margin-left: auto;
    width: 52px;
    height: 52px;
    border-radius: 50%;
    border: 2px solid var(--line);
    background: rgba(255, 255, 255, 0.08);
    font-size: 1.5rem;
    cursor: pointer;
  }

  .progress + .menu {
    margin-left: 0;
  }

  .game {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .game.with-bar {
    min-height: calc(100dvh - 70px);
    justify-content: flex-start;
    padding-top: 20px;
  }

  .center {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
</style>
