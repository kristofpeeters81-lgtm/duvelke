<script lang="ts">
  import { onDestroy, onMount } from 'svelte';

  interface Props {
    /** Wordt één keer aangeroepen met de inhoud van de gescande code. */
    onresult: (text: string) => void;
  }

  let { onresult }: Props = $props();

  interface Detector {
    detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>;
  }
  type DetectorCtor = new (options: { formats: string[] }) => Detector;

  let video = $state<HTMLVideoElement>();
  let error = $state('');
  let stream: MediaStream | null = null;
  let timer: ReturnType<typeof setInterval> | undefined;
  let done = false;

  onMount(() => {
    const Ctor = (globalThis as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
    if (!Ctor) {
      error = 'Dit toestel kan geen QR-codes lezen. Typ of plak de code hieronder.';
      return;
    }
    const detector = new Ctor({ formats: ['qr_code'] });
    void navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then(async (s) => {
        stream = s;
        if (!video) return;
        video.srcObject = s;
        await video.play();
        timer = setInterval(async () => {
          if (done || !video || video.readyState < 2) return;
          try {
            const codes = await detector.detect(video);
            const hit = codes.find((c) => c.rawValue);
            if (hit && !done) {
              done = true;
              stop();
              onresult(hit.rawValue);
            }
          } catch {
            /* volgende beeldje */
          }
        }, 250);
      })
      .catch(() => {
        error = 'De camera mag niet gebruikt worden. Geef toestemming, of typ of plak de code hieronder.';
      });
  });

  function stop(): void {
    clearInterval(timer);
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
  }

  onDestroy(stop);
</script>

<div class="scan">
  {#if error}
    <p class="error">{error}</p>
  {:else}
    <!-- svelte-ignore a11y_media_has_caption -->
    <video bind:this={video} playsinline muted></video>
    <p class="hint">Richt de camera op de QR-code.</p>
  {/if}
</div>

<style>
  .scan {
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: center;
  }

  video {
    width: min(100%, 420px);
    aspect-ratio: 1;
    object-fit: cover;
    border-radius: 18px;
    border: 3px solid var(--gold);
    background: #000;
  }

  .hint,
  .error {
    margin: 0;
    text-align: center;
  }

  .error {
    color: var(--red, #ff6b6b);
    font-weight: 700;
  }
</style>
