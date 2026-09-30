<script lang="ts">
  import BigButton from '../../components/BigButton.svelte';
  import { gemsForCount, gemsForOutcome, maxGems } from '../../lib/gameplay';
  import type { TaskDef } from '../../lib/tasks/types';

  interface Props {
    task: TaskDef;
    target: number | null;
    onpick: (outcome: 'gelukt' | 'bijna' | 'mislukt' | 'score', gems: number, score: number | null) => void;
  }

  let { task, target, onpick }: Props = $props();

  let count = $state(0);
  const unit = $derived(task.scoring.type === 'aantal' ? task.scoring.unit : '');
</script>

<div class="picker">
  <h2>Hoe ging het?</h2>
  {#if task.scoring.type === 'aantal' && target !== null}
    <p class="hint center">Hoeveel {unit} hebben jullie? Doel: {target}.</p>
    <div class="counter">
      <button type="button" class="step" aria-label="Eén minder" disabled={count <= 0} onclick={() => (count = Math.max(0, count - 1))}>−</button>
      <span class="num">{count}</span>
      <button type="button" class="step" aria-label="Eén meer" onclick={() => (count += 1)}>+</button>
    </div>
    <p class="preview">💎 {gemsForCount(task, count, target)} van {maxGems(task)} edelstenen</p>
    <BigButton variant="gold" size="large" full onclick={() => onpick('score', gemsForCount(task, count, target), count)}>Bevestigen ▶</BigButton>
  {:else}
    <div class="choices">
      <button type="button" class="choice ok" onclick={() => onpick('gelukt', gemsForOutcome(task, 'gelukt'), null)}>
        <span class="em">🎉</span><span>Gelukt!</span><span class="g">💎 {gemsForOutcome(task, 'gelukt')}</span>
      </button>
      <button type="button" class="choice half" onclick={() => onpick('bijna', gemsForOutcome(task, 'bijna'), null)}>
        <span class="em">😅</span><span>Bijna</span><span class="g">💎 {gemsForOutcome(task, 'bijna')}</span>
      </button>
      <button type="button" class="choice no" onclick={() => onpick('mislukt', 0, null)}>
        <span class="em">😬</span><span>Mislukt</span><span class="g">💎 0</span>
      </button>
    </div>
  {/if}
</div>

<style>
  .picker {
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: min(620px, 100%);
    margin: 0 auto;
  }

  h2 {
    text-align: center;
    font-size: 2rem;
  }

  .center {
    text-align: center;
  }

  .counter {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 24px;
  }

  .step {
    width: 84px;
    height: 84px;
    border-radius: 50%;
    border: 3px solid var(--line);
    background: var(--bg-raised);
    font-size: 2.6rem;
    font-weight: 800;
    cursor: pointer;
  }

  .step:disabled {
    opacity: 0.3;
  }

  .num {
    font-family: var(--font-title);
    font-weight: 700;
    font-size: 5rem;
    min-width: 120px;
    text-align: center;
  }

  .preview {
    text-align: center;
    font-weight: 800;
    color: var(--gold);
    margin: 0;
  }

  .choices {
    display: grid;
    gap: 12px;
  }

  .choice {
    display: flex;
    align-items: center;
    gap: 16px;
    min-height: 84px;
    padding: 12px 22px;
    border-radius: 22px;
    border: 3px solid transparent;
    font-family: var(--font-title);
    font-weight: 700;
    font-size: 1.6rem;
    cursor: pointer;
    color: #fff;
  }

  .choice:active {
    transform: scale(0.98);
  }

  .em {
    font-size: 2.4rem;
  }

  .g {
    margin-left: auto;
    font-size: 1.2rem;
    opacity: 0.9;
  }

  .ok {
    background: linear-gradient(180deg, #3fe0cf, #11a597);
    color: #0d2b33;
  }

  .half {
    background: linear-gradient(180deg, #ffe07a, #e0a800);
    color: #3a2500;
  }

  .no {
    background: linear-gradient(180deg, #ff7b8a, #c9303f);
  }
</style>
