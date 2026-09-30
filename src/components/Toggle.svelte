<script lang="ts">
  interface Props {
    checked: boolean;
    label: string;
    description?: string;
    onchange: (value: boolean) => void;
  }

  let { checked, label, description = '', onchange }: Props = $props();
</script>

<button class="row" type="button" role="switch" aria-checked={checked} onclick={() => onchange(!checked)}>
  <span class="text">
    <span class="label">{label}</span>
    {#if description}<span class="desc">{description}</span>{/if}
  </span>
  <span class="track" class:on={checked}><span class="knob"></span></span>
</button>

<style>
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    width: 100%;
    padding: 14px 0;
    background: none;
    border: none;
    border-top: 1px solid var(--line);
    text-align: left;
    cursor: pointer;
  }

  .row:first-of-type {
    border-top: none;
  }

  .text {
    display: flex;
    flex-direction: column;
  }

  .label {
    font-weight: 800;
  }

  .desc {
    color: var(--text-dim);
    font-size: 0.92rem;
  }

  .track {
    flex: none;
    width: 68px;
    height: 40px;
    border-radius: 999px;
    background: var(--bg-deep);
    border: 2px solid var(--line);
    position: relative;
    transition: background 0.2s ease;
  }

  .track.on {
    background: var(--turquoise);
    border-color: var(--turquoise);
  }

  .knob {
    position: absolute;
    top: 4px;
    left: 4px;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
    transition: transform 0.2s cubic-bezier(0.3, 1.4, 0.6, 1);
  }

  .on .knob {
    transform: translateX(28px);
  }
</style>
