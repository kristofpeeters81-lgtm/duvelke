<script lang="ts">
  import qrcode from 'qrcode-generator';

  interface Props {
    value: string;
    /** Breedte op het scherm. */
    size?: number;
  }

  let { value, size = 300 }: Props = $props();

  // Lage foutcorrectie: dan blijft de code zo grof mogelijk, en een scherm geeft geen vlekken of kreukels.
  const svg = $derived.by(() => {
    const qr = qrcode(0, 'L');
    qr.addData(value);
    qr.make();
    return qr.createSvgTag({ cellSize: 4, margin: 3, scalable: true });
  });
</script>

<div class="qr" style="width:{size}px">
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html svg}
</div>

<style>
  .qr {
    max-width: 100%;
    aspect-ratio: 1;
    background: #fff;
    border-radius: 16px;
    padding: 6px;
    margin: 0 auto;
  }

  .qr :global(svg) {
    width: 100%;
    height: 100%;
    display: block;
  }
</style>
