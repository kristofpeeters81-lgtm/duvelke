<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import BigButton from '../components/BigButton.svelte';
  import WindyBubble from '../components/WindyBubble.svelte';
  import type { WindyMood } from '../components/Windy.svelte';
  import type { LineCategory } from '../lib/data/windyLines';
  import { app, lineContext } from '../lib/store.svelte';
  import { keepScreenOn } from '../lib/wakelock';
  import { pickLine, rememberLine } from '../lib/windy';
  import GameHub from './game/GameHub.svelte';
  import RoleReveal from './game/RoleReveal.svelte';

  onMount(() => keepScreenOn());

  const game = $derived(app.game);

  // De intro: twee begin-uitspraken en één over de geheime dossiers.
  const introPlan: { category: LineCategory; mood: WindyMood }[] = [
    { category: 'intro', mood: 'blij' },
    { category: 'intro', mood: 'geschokt' },
    { category: 'rollen', mood: 'stiekem' },
  ];
  let introStep = $state(0);

  function lineFor(category: LineCategory): { id: string; text: string } | null {
    if (!app.game) return null;
    const line = pickLine(category, app.windyLines, lineContext(), app.game.recentLines);
    if (!line) return null;
    app.game.recentLines = rememberLine(app.game.recentLines, line.id);
    return line;
  }

  let intro = $state<{ id: string; text: string } | null>(null);
  $effect(() => {
    if (game?.phase === 'intro') {
      const step = introPlan[introStep];
      intro = step ? untrack(() => lineFor(step.category)) : null;
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
</script>

{#if game}
  <main class="page game">
    {#if game.phase === 'intro'}
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
    {:else}
      <GameHub />
    {/if}
  </main>
{/if}

<style>
  .game {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .center {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
</style>
