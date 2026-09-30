<script lang="ts">
  import Duvelke from '../components/Duvelke.svelte';
  import TopBar from '../components/TopBar.svelte';
  import { app } from '../lib/store.svelte';

  const s = $derived(app.settings);
</script>

<main class="page">
  <TopBar title="Hoe werkt het?" emoji="❓" />

  <section class="section hero">
    <Duvelke size={110} />
    <div>
      <h2>Wie is {s.saboteurName}?</h2>
      <p>Eén van jullie is stiekem {s.saboteurName}. Samen doen jullie opdrachten om edelstenen te verdienen, maar {s.saboteurName} probeert alles te laten mislukken, zonder op te vallen. Op het einde raadt iedereen wie het was!</p>
    </div>
  </section>

  <section class="section">
    <h2>🧒 De spelregels (voor de kinderen)</h2>
    <ol>
      <li><strong>Geheim dossier:</strong> iedereen krijgt in het geheim te zien wie hij is. Vertel het aan niemand!</li>
      <li><strong>Opdrachten:</strong> de hele groep werkt samen. Lukt het, dan komen er edelstenen in de schatkist.</li>
      <li><strong>Geheime tips:</strong> voor een opdracht krijgt iedereen stiekem een tipje. {s.saboteurName} krijgt een sabotagetip, de anderen een speurderstip.</li>
      <li><strong>Roddels:</strong> {s.hostName} vertelt wat ze zelf zag: dat klopt altijd. {s.neighbourName} vertelt ook dingen... maar die liegt soms!</li>
      <li><strong>Kijk-joker:</strong> soms kan de groep edelstenen ruilen voor een joker. Wie een joker heeft, mag stiekem één naam zien die zeker onschuldig is.</li>
      <li><strong>De Test:</strong> op het einde beantwoordt iedereen apart vragen over {s.saboteurName}. Wie het meest juist heeft, wint!</li>
      <li><strong>De schat:</strong> haalt de groep minder dan de helft van de edelstenen, dan wint {s.saboteurName} de schat.</li>
    </ol>
    <p class="hint">Er valt niemand af: iedereen speelt mee tot het einde.</p>
  </section>

  <section class="section">
    <h2>🎬 Checklist voor het hulpje van {s.hostName}</h2>
    <ul class="checks">
      <li>🔋 Tablet opgeladen (het scherm blijft aan tijdens het spel).</li>
      <li>📶 Open de app één keer met wifi zodat alles offline klaarstaat ("✅ Klaar om zonder internet te spelen" op het beginscherm).</li>
      <li>🎙️ Download de Vlaamse stem van {s.hostName} (en eventueel die van de buurvrouw) bij <strong>{s.hostName} → Stemtest</strong>.</li>
      <li>👥 Vul de spelers in, en vink bij <strong>Benodigdheden</strong> aan wat je in huis hebt.</li>
      <li>📋 Start een nieuw spel, kijk het programma na en leg alles van de paklijst klaar.</li>
      <li>📸 Tijdens de opdrachten: tik op "Bewijsfoto" voor leuke foto's. Die komen op het einde in een diavoorstelling.</li>
    </ul>
  </section>

  <section class="section">
    <h2>💡 Handig om te weten</h2>
    <ul>
      <li><strong>☰ Menu van het hulpje</strong> (rechtsboven tijdens het spel): rol opnieuw tonen, programma bekijken, een opdracht overslaan of stoppen.</li>
      <li><strong>Tablet per ongeluk dicht?</strong> Geen probleem: het spel gaat verder waar het was, ook de timer.</li>
      <li><strong>Iemand even weg</strong> bij het doorgeven? Tik op "later": die speler komt achteraan.</li>
      <li><strong>Speelt het hulpje niet mee?</strong> Stel een pincode in: dan kan het hulpje stiekem alle rollen bekijken.</li>
      <li><strong>Zelf inspreken:</strong> bij <strong>{s.hostName} → Uitspraken</strong> kan je bij elke zin 🎤 tikken. Namen spreek je in bij <strong>Spelers</strong>.</li>
      <li><strong>Meer opdrachten:</strong> bij <strong>📚 Opdrachten</strong> kan je zelf opdrachten maken of er laten bedenken door een gratis AI.</li>
      <li><strong>Duimpjes:</strong> na elke opdracht 👍 of 👎. Leuke opdrachten komen vaker terug.</li>
    </ul>
  </section>

  <section class="section">
    <h2>🛟 Problemen</h2>
    <dl>
      <dt>Er is geen stem</dt>
      <dd>Download de Vlaamse stem bij {s.hostName} → Stemtest (met wifi). Of zet "Voorlezen" aan bij {s.hostName} → Stem.</dd>
      <dt>De microfoon werkt niet</dt>
      <dd>Chrome vraagt de eerste keer toestemming. Weigerde je? Tik op het slotje naast het adres → Machtigingen → Microfoon toestaan.</dd>
      <dt>De camera opent niet</dt>
      <dd>Geef Chrome toegang tot de camera in de instellingen van de tablet.</dd>
      <dt>Alles kwijt na het wissen van de browsergegevens?</dt>
      <dd>Maak af en toe een back-up bij Instellingen → Back-up. Die kan je later terugzetten.</dd>
    </dl>
  </section>
</main>

<style>
  .hero {
    display: flex;
    gap: 18px;
    align-items: center;
  }

  .hero p {
    margin: 6px 0 0;
  }

  @media (max-width: 560px) {
    .hero {
      flex-direction: column;
      text-align: center;
    }
  }

  ol,
  ul {
    padding-left: 22px;
    display: grid;
    gap: 8px;
  }

  .checks {
    list-style: none;
    padding-left: 0;
  }

  dt {
    font-weight: 800;
    margin-top: 10px;
  }

  dd {
    margin: 4px 0 0;
    color: var(--text-soft);
  }
</style>
