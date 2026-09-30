<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { getRecording } from '../lib/db';
  import { playWav, stopPiper } from '../lib/piper';
  import { MAX_RECORDING_MS, MicrophoneDeniedError, recordingSupported, startRecording, type ActiveRecording } from '../lib/recorder';
  import { deleteRecording, saveRecording, showToast } from '../lib/store.svelte';
  import BigButton from './BigButton.svelte';

  interface Segment {
    id: string;
    /** De tekst zoals ze ingesproken moet worden (plaatshouders al ingevuld). */
    text: string;
    label?: string;
  }

  interface Props {
    /** Eén of meer stukjes om in te spreken (bv. vóór en na een naam). */
    segments: Segment[];
    title?: string;
    hint?: string;
    onclose: () => void;
  }

  let { segments, title = '🎤 Zelf inspreken', hint = "Lees de zin voor met je beste Windy-stem. Hou de tablet op zo'n 20 cm van je mond.", onclose }: Props = $props();

  let seg = $state(0);
  const current = $derived(segments[seg] ?? segments[0]);
  const lineId = $derived(current?.id ?? '');
  const text = $derived(current?.text ?? '');

  type Phase = 'klaar' | 'aftellen' | 'opnemen' | 'opgenomen';
  let phase = $state<Phase>('klaar');
  let countdown = $state(3);
  let elapsed = $state(0);
  let take = $state<{ audio: Blob; durationMs: number } | null>(null);
  let existing = $state<{ audio: Blob; durationMs: number } | null>(null);
  let playing = $state(false);

  let active: ActiveRecording | null = null;
  let tick: ReturnType<typeof setInterval> | undefined;

  function loadExisting(id: string): void {
    existing = null;
    void getRecording(id).then((r) => (existing = r ? { audio: r.audio, durationMs: r.durationMs } : null));
  }

  $effect(() => {
    const id = lineId;
    untrack(() => {
      take = null;
      phase = 'klaar';
      loadExisting(id);
    });
  });

  onMount(() => {
    return () => {
      clearInterval(tick);
      active?.cancel();
      stopPiper();
    };
  });

  async function begin(): Promise<void> {
    stopPiper();
    // Eerst de microfoon openen (toestemming vragen), dan pas aftellen.
    try {
      phase = 'aftellen';
      countdown = 3;
      await new Promise<void>((resolve) => {
        tick = setInterval(() => {
          countdown -= 1;
          if (countdown <= 0) {
            clearInterval(tick);
            resolve();
          }
        }, 700);
      });
      active = await startRecording(() => void finish());
      phase = 'opnemen';
      elapsed = 0;
      const startedAt = performance.now();
      tick = setInterval(() => (elapsed = performance.now() - startedAt), 100);
    } catch (err) {
      clearInterval(tick);
      phase = 'klaar';
      if (err instanceof MicrophoneDeniedError) {
        showToast('Geen toegang tot de microfoon. Sta de microfoon toe in Chrome en probeer opnieuw.', 'error');
      } else {
        showToast('Opnemen lukt niet op dit toestel.', 'error');
        console.error(err);
      }
    }
  }

  async function finish(): Promise<void> {
    if (!active) return;
    clearInterval(tick);
    const result = await active.stop();
    active = null;
    if (result.durationMs < 400 || result.audio.size === 0) {
      showToast('Die opname was te kort. Probeer opnieuw.', 'error');
      phase = 'klaar';
      return;
    }
    take = result;
    phase = 'opgenomen';
    void listen(result.audio);
  }

  async function listen(audio: Blob): Promise<void> {
    playing = true;
    await playWav(audio, 1);
    playing = false;
  }

  async function save(): Promise<void> {
    if (!take) return;
    if (await saveRecording(lineId, take.audio, take.durationMs)) {
      if (seg + 1 < segments.length) {
        showToast('Bewaard! Nu het volgende stukje.');
        seg += 1;
      } else {
        showToast('Opname bewaard!');
        onclose();
      }
    }
  }

  async function removeExisting(): Promise<void> {
    if (await deleteRecording(lineId)) {
      existing = null;
      showToast('Opname gewist. De AI-stem neemt het weer over.');
    }
  }

  const seconds = $derived(Math.floor(elapsed / 1000));
  const maxSeconds = MAX_RECORDING_MS / 1000;
</script>

<div class="overlay" role="presentation">
  <div class="sheet" role="dialog" aria-modal="true" aria-label="Uitspraak inspreken">
    <h2>{title}</h2>
    <p class="hint">{hint}</p>
    {#if segments.length > 1}
      <div class="segs">
        {#each segments as s, i (s.id)}
          <button type="button" class="segbtn" aria-pressed={seg === i} onclick={() => (seg = i)}>{s.label ?? `Deel ${i + 1}`}</button>
        {/each}
      </div>
    {/if}
    <blockquote>{text}</blockquote>

    {#if !recordingSupported()}
      <p class="warn">Opnemen lukt niet in deze browser. Gebruik Chrome.</p>
    {:else if phase === 'klaar'}
      <div class="rec-area">
        <button type="button" class="rec" aria-label="Begin met opnemen" onclick={begin}><span class="dot"></span></button>
        <span>Tik om op te nemen</span>
      </div>
      {#if existing}
        <div class="row">
          <BigButton variant="ghost" disabled={playing} onclick={() => existing && listen(existing.audio)}>▶ Huidige opname</BigButton>
          <BigButton variant="danger" onclick={removeExisting}>🗑️ Wis opname</BigButton>
        </div>
      {/if}
    {:else if phase === 'aftellen'}
      <div class="rec-area"><span class="count">{countdown > 0 ? countdown : '🎙️'}</span><span>Maak je klaar...</span></div>
    {:else if phase === 'opnemen'}
      <div class="rec-area">
        <button type="button" class="rec on" aria-label="Stop met opnemen" onclick={finish}><span class="square"></span></button>
        <span class="live">● Opname loopt: {seconds} / {maxSeconds} s. Tik om te stoppen.</span>
      </div>
    {:else if phase === 'opgenomen' && take}
      <div class="row">
        <BigButton variant="ghost" disabled={playing} onclick={() => take && listen(take.audio)}>{playing ? '🔊 Speelt af...' : '▶ Beluister'}</BigButton>
        <BigButton variant="ghost" onclick={() => ((take = null), (phase = 'klaar'))}>🔁 Opnieuw</BigButton>
      </div>
      <BigButton variant="gold" full onclick={save}>💾 Bewaren</BigButton>
    {/if}

    <button type="button" class="close" onclick={onclose}>Sluiten</button>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(10, 0, 30, 0.75);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 60;
    padding: 16px;
  }

  .sheet {
    width: min(560px, 100%);
    max-height: 92dvh;
    overflow-y: auto;
    background: var(--bg-raised);
    border-radius: 28px;
    padding: 22px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    box-shadow: var(--shadow);
  }

  .segs {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .segbtn {
    padding: 8px 14px;
    border-radius: 999px;
    border: 2px solid var(--line);
    background: transparent;
    font-weight: 800;
    cursor: pointer;
  }

  .segbtn[aria-pressed='true'] {
    background: var(--turquoise);
    border-color: var(--turquoise);
    color: #0d2b33;
  }

  blockquote {
    margin: 0;
    padding: 16px 18px;
    border-radius: 18px;
    background: #fff;
    color: #2a1454;
    font-family: var(--font-title);
    font-weight: 500;
    font-size: 1.3rem;
    line-height: 1.35;
  }

  .rec-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 10px 0;
    font-weight: 700;
    color: var(--text-soft);
    text-align: center;
  }

  .rec {
    width: 96px;
    height: 96px;
    border-radius: 50%;
    border: 6px solid #fff;
    background: var(--red);
    display: grid;
    place-items: center;
    cursor: pointer;
    box-shadow: 0 0 0 8px rgba(239, 59, 74, 0.25);
  }

  .rec.on {
    animation: pulse 1.2s ease-in-out infinite;
  }

  .dot {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: #fff;
  }

  .square {
    width: 30px;
    height: 30px;
    border-radius: 6px;
    background: #fff;
  }

  .count {
    font-family: var(--font-title);
    font-weight: 700;
    font-size: 4rem;
    color: var(--gold);
  }

  .live {
    color: var(--red);
  }

  .row {
    display: flex;
    gap: 10px;
    justify-content: center;
    flex-wrap: wrap;
  }

  .warn {
    color: var(--gold);
    font-weight: 700;
  }

  .close {
    align-self: center;
    background: none;
    border: none;
    color: var(--text-dim);
    text-decoration: underline;
    font-weight: 700;
    padding: 10px;
    cursor: pointer;
  }

  @keyframes pulse {
    0%,
    100% {
      box-shadow: 0 0 0 8px rgba(239, 59, 74, 0.25);
    }
    50% {
      box-shadow: 0 0 0 18px rgba(239, 59, 74, 0.1);
    }
  }
</style>
