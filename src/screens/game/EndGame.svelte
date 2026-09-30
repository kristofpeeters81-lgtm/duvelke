<script lang="ts">
  import BigButton from '../../components/BigButton.svelte';
  import TreasureChest from '../../components/TreasureChest.svelte';
  import { treasure } from '../../lib/gameplay';
  import { app, go } from '../../lib/store.svelte';
  import { getTask } from '../../lib/tasks/registry';

  const game = $derived(app.game);
  const total = $derived(game ? treasure(game.program, game.results, getTask) : { gems: 0, max: 0 });
</script>

{#if game}
  <div class="end">
    <h2>🏁 Alle opdrachten zijn gespeeld!</h2>
    <TreasureChest gems={total.gems} max={total.max} size="groot" />
    <p class="hint">De eindtest en de grote onthulling komen hier.</p>
    <BigButton variant="ghost" onclick={() => go('home')}>🏠 Naar het beginscherm</BigButton>
  </div>
{/if}

<style>
  .end {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 18px;
    text-align: center;
  }
</style>
