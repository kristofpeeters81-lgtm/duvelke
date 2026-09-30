<script lang="ts">
  import { multipleSaboteursPossible, type GamePlayer } from '../lib/game';
  import type { Settings } from '../lib/types';

  interface Props {
    player: GamePlayer;
    settings: Settings;
    playerCount: number;
  }

  let { player, settings, playerCount }: Props = $props();

  const sab = $derived(settings.saboteurName);
  const tipMoment = $derived(settings.briefingEvery === 1 ? 'Voor elke opdracht' : 'Regelmatig');
</script>

<!-- Elk dossier heeft exact dezelfde opmaak en kleuren: van op afstand zie je geen verschil. -->
<article class="dossier">
  <header>
    <span class="label">GEHEIM DOSSIER</span>
    <span class="who"><span class="av" style="--c:{player.color}">{player.avatar}</span>{player.name}</span>
  </header>

  {#if player.role === 'saboteur'}
    <h2>Jij bent {sab}! 😈</h2>
    <p>
      Saboteer stiekem de opdrachten, zodat de groep zo weinig mogelijk schatten verdient. Laat niets merken en doe alsof
      je keihard je best doet. {tipMoment} krijg je een geheime sabotagetip.
    </p>
  {:else}
    <h2>Jij bent Speurder! 🔍</h2>
    <p>
      Help de groep om zoveel mogelijk schatten te verdienen en ontdek wie {sab} is. Let goed op wie er vreemd doet.
      {tipMoment} krijg je een geheime speurderstip.
    </p>
  {/if}

  {#if player.speurneus}
    <p class="extra">
      <strong>Extra geheim: jij bent de Speurneus!</strong> Je krijgt af en toe de naam van iemand die zeker géén {sab}
      is. Je speelt voor de Speurneus-medaille.
    </p>
  {/if}
  {#if player.bemoeial}
    <p class="extra">
      <strong>Extra geheim: jij bent de Bemoeial!</strong> Bemoei je overal mee, geef ongevraagd advies en zucht heel
      luid. Je bent géén {sab}.
    </p>
  {/if}

  {#if multipleSaboteursPossible(playerCount)}
    <p class="note">Opgelet: er kan meer dan één {sab} zijn. Of niet...</p>
  {/if}
  <p class="note">Vertel dit aan niemand!</p>
</article>

<style>
  .dossier {
    height: 100%;
    min-height: 360px;
    border-radius: var(--radius);
    padding: 22px 24px;
    background:
      repeating-linear-gradient(0deg, rgba(42, 20, 84, 0.06) 0 1px, transparent 1px 32px),
      #fff8e8;
    color: #2a1454;
    border: 4px solid #7a5222;
    box-shadow: var(--shadow);
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow: auto;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .label {
    font-family: var(--font-title);
    font-weight: 700;
    color: #c62828;
    letter-spacing: 0.08em;
  }

  .who {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-weight: 800;
  }

  .av {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: var(--c);
    font-size: 1.3rem;
  }

  h2 {
    font-size: clamp(1.8rem, 6vw, 2.5rem);
  }

  p {
    margin: 0;
    font-size: 1.15rem;
  }

  .extra {
    background: rgba(41, 211, 196, 0.16);
    border-radius: 12px;
    padding: 10px 12px;
  }

  .note {
    font-weight: 800;
    color: #6b4a1a;
  }
</style>
