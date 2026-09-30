<script lang="ts" generics="T extends string | number">
  interface Option {
    value: T;
    label: string;
    sub?: string;
  }

  interface Props {
    options: Option[];
    value: T;
    onchange: (value: T) => void;
    label: string;
  }

  let { options, value, onchange, label }: Props = $props();
</script>

<div class="seg" role="radiogroup" aria-label={label}>
  {#each options as option (option.value)}
    <button
      type="button"
      role="radio"
      aria-checked={option.value === value}
      class:active={option.value === value}
      onclick={() => onchange(option.value)}
    >
      <span class="lbl">{option.label}</span>
      {#if option.sub}<span class="sub">{option.sub}</span>{/if}
    </button>
  {/each}
</div>

<style>
  .seg {
    display: grid;
    grid-auto-columns: 1fr;
    grid-auto-flow: column;
    gap: 6px;
    padding: 6px;
    border-radius: var(--radius-sm);
    background: var(--bg-deep);
    border: 2px solid var(--line);
  }

  button {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 56px;
    padding: 8px 6px;
    border: none;
    border-radius: 10px;
    background: transparent;
    color: var(--text-soft);
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .active {
    background: var(--pink);
    color: #fff;
  }

  .lbl {
    font-family: var(--font-title);
    font-weight: 700;
    font-size: 1.05rem;
  }

  .sub {
    font-size: 0.78rem;
    opacity: 0.85;
  }
</style>
