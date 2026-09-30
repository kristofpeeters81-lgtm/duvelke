<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    variant?: 'primary' | 'secondary' | 'gold' | 'ghost' | 'danger';
    size?: 'normal' | 'large';
    disabled?: boolean;
    full?: boolean;
    onclick?: () => void;
    children: Snippet;
  }

  let { variant = 'primary', size = 'normal', disabled = false, full = false, onclick, children }: Props = $props();
</script>

<button class="btn {variant} {size}" class:full {disabled} {onclick} type="button">
  {@render children()}
</button>

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    min-height: 56px;
    padding: 12px 24px;
    border: none;
    border-radius: 999px;
    font-family: var(--font-title);
    font-weight: 700;
    font-size: 1.15rem;
    cursor: pointer;
    transition: transform 0.12s ease, filter 0.15s ease, box-shadow 0.15s ease;
    position: relative;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .btn:active:not(:disabled) {
    transform: translateY(3px) scale(0.98);
  }

  .btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .large {
    min-height: 72px;
    font-size: 1.45rem;
    padding: 16px 34px;
  }

  .full {
    width: 100%;
  }

  .primary {
    background: linear-gradient(180deg, #ff6fb5, var(--pink));
    color: #fff;
    box-shadow: 0 6px 0 var(--pink-dark), 0 12px 24px rgba(255, 79, 163, 0.35);
  }

  .secondary {
    background: linear-gradient(180deg, #4fe6d8, var(--turquoise));
    color: #0d2b33;
    box-shadow: 0 6px 0 var(--turquoise-dark), 0 12px 24px rgba(41, 211, 196, 0.25);
  }

  .gold {
    background: linear-gradient(180deg, #ffe07a, var(--gold));
    color: #3a2500;
    box-shadow: 0 6px 0 var(--gold-dark), 0 12px 24px rgba(255, 207, 63, 0.3);
  }

  .ghost {
    background: rgba(255, 255, 255, 0.08);
    color: var(--text);
    border: 2px solid var(--line);
  }

  .danger {
    background: transparent;
    color: var(--danger);
    border: 2px solid var(--danger);
  }

  .primary:active:not(:disabled),
  .secondary:active:not(:disabled),
  .gold:active:not(:disabled) {
    box-shadow: 0 3px 0 rgba(0, 0, 0, 0.25);
  }
</style>
