<script lang="ts">
  import { toast } from '../lib/store.svelte';

  let visible = $state(false);
  let timer: ReturnType<typeof setTimeout> | undefined;

  $effect(() => {
    if (toast.id === 0) return;
    visible = true;
    clearTimeout(timer);
    timer = setTimeout(() => (visible = false), 3500);
    return () => clearTimeout(timer);
  });
</script>

{#if visible}
  <div class="toast {toast.kind}" role="status" aria-live="polite">{toast.message}</div>
{/if}

<style>
  .toast {
    position: fixed;
    left: 50%;
    bottom: calc(24px + env(safe-area-inset-bottom));
    transform: translateX(-50%);
    max-width: calc(100% - 32px);
    padding: 14px 22px;
    border-radius: 999px;
    background: var(--bg-card);
    border: 2px solid var(--turquoise);
    font-weight: 800;
    box-shadow: var(--shadow);
    z-index: 100;
    animation: pop 0.25s cubic-bezier(0.3, 1.4, 0.6, 1);
  }

  .error {
    border-color: var(--danger);
  }

  @keyframes pop {
    from {
      transform: translateX(-50%) translateY(20px) scale(0.9);
      opacity: 0;
    }
  }
</style>
