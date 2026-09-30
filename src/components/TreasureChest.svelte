<script lang="ts">
  interface Props {
    gems: number;
    max: number;
    size?: 'klein' | 'groot';
    /** Laat de kist openspringen (bij nieuwe edelstenen). */
    bounce?: boolean;
  }

  let { gems, max, size = 'klein', bounce = false }: Props = $props();

  const pct = $derived(max > 0 ? Math.round((gems / max) * 100) : 0);
</script>

<div class="chest {size}" class:bounce aria-label="{gems} van {max} edelstenen">
  <svg viewBox="0 0 64 56" aria-hidden="true">
    <rect x="6" y="24" width="52" height="28" rx="4" fill="#9a5a24" stroke="#5e3310" stroke-width="3" />
    <rect x="6" y="24" width="52" height="7" fill="#b86f30" />
    <path d="M6 24 Q32 2 58 24 Z" fill="#b86f30" stroke="#5e3310" stroke-width="3" class="lid" />
    <rect x="28" y="22" width="8" height="12" rx="2" fill="#ffcf3f" stroke="#8a6400" stroke-width="2" />
    <circle cx="20" cy="15" r="3.5" fill="#29d3c4" class="spark" />
    <circle cx="44" cy="13" r="3" fill="#ff4fa3" class="spark s2" />
    <path d="M31 8 l3 4 -3 4 -3 -4 z" fill="#ffcf3f" class="spark s3" />
  </svg>
  <div class="txt">
    <span class="gems">💎 {gems}</span>
    {#if size === 'groot'}<span class="of">van {max} mogelijk</span>{/if}
    <span class="bar"><span class="fill" class:low={pct < 50} style="width:{pct}%"></span><span class="half"></span></span>
  </div>
</div>

<style>
  .chest {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .klein svg {
    width: 44px;
  }

  .groot {
    flex-direction: column;
  }

  .groot svg {
    width: 150px;
  }

  .txt {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 90px;
  }

  .groot .txt {
    align-items: center;
    min-width: 220px;
  }

  .gems {
    font-family: var(--font-title);
    font-weight: 700;
    font-size: 1.2rem;
    color: var(--gold);
  }

  .groot .gems {
    font-size: 2.6rem;
  }

  .of {
    color: var(--text-dim);
    font-weight: 700;
  }

  .bar {
    position: relative;
    width: 100%;
    height: 8px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.12);
    overflow: hidden;
  }

  .groot .bar {
    height: 14px;
  }

  .fill {
    position: absolute;
    inset: 0 auto 0 0;
    border-radius: 999px;
    background: linear-gradient(90deg, var(--turquoise), var(--gold));
    transition: width 0.8s cubic-bezier(0.3, 1.2, 0.5, 1);
  }

  .fill.low {
    background: linear-gradient(90deg, var(--pink), var(--gold));
  }

  /* De grens van 50%: daaronder wint 't Duvelke */
  .half {
    position: absolute;
    left: 50%;
    top: 0;
    bottom: 0;
    width: 2px;
    background: rgba(255, 255, 255, 0.6);
  }

  .bounce svg {
    animation: bounce 0.6s cubic-bezier(0.3, 1.8, 0.5, 1);
  }

  .bounce .lid {
    animation: lid 0.8s ease;
    transform-origin: 6px 24px;
  }

  .spark {
    animation: twinkle 2s ease-in-out infinite;
  }

  .s2 {
    animation-delay: 0.6s;
  }

  .s3 {
    animation-delay: 1.2s;
  }

  @keyframes bounce {
    0% {
      transform: scale(1);
    }
    40% {
      transform: scale(1.25) rotate(-6deg);
    }
    100% {
      transform: scale(1);
    }
  }

  @keyframes lid {
    30% {
      transform: rotate(-25deg);
    }
  }

  @keyframes twinkle {
    0%,
    100% {
      opacity: 0.2;
    }
    50% {
      opacity: 1;
    }
  }
</style>
