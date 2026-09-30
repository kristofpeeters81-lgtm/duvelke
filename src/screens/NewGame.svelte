<script lang="ts" module>
  // Blijft bewaard als je even naar "Spelers" gaat om iemand toe te voegen.
  let remembered: { selected: string[]; gameMaster: string | 'geen' | null } = { selected: [], gameMaster: null };
</script>

<script lang="ts">
  import { onMount } from 'svelte';
  import BigButton from '../components/BigButton.svelte';
  import Toggle from '../components/Toggle.svelte';
  import TopBar from '../components/TopBar.svelte';
  import { LOCATIONS } from '../lib/data/locations';
  import { isValidPin, MAX_PLAYERS, MIN_PLAYERS } from '../lib/game';
  import { piperSupported, storedVoices } from '../lib/piper';
  import { formatDuration } from '../lib/settings';
  import { buildProgram } from '../lib/tasks/program';
  import { allTasks } from '../lib/tasks/registry';
  import { app, go, showToast } from '../lib/store.svelte';

  const knownIds = new Set(app.players.map((p) => p.id));
  let selected = $state<string[]>(remembered.selected.filter((id) => knownIds.has(id)));
  let gameMaster = $state<string | 'geen' | null>(remembered.gameMaster);
  let pin = $state('');
  // Per spel aan te passen, zonder de standaardinstellingen te wijzigen.
  let speurneus = $state(app.settings.speurneusEnabled);
  let bemoeial = $state(app.settings.bemoeialEnabled);

  // Waarschuwen als de AI-stem nog niet op de tablet staat: beter nu dan tijdens het feest.
  let voiceMissing = $state(false);
  onMount(() => {
    const v = app.settings.voice;
    if (!v.enabled || v.engine !== 'piper' || !piperSupported()) return;
    void storedVoices().then((s) => (voiceMissing = !s.includes(v.piperVoice)));
  });

  $effect(() => {
    remembered = { selected: [...selected], gameMaster };
  });

  const chosen = $derived(app.players.filter((p) => selected.includes(p.id)));
  const gmStillValid = $derived(gameMaster === 'geen' || (gameMaster !== null && selected.includes(gameMaster)));
  const pinOk = $derived(pin === '' || isValidPin(pin));

  const problem = $derived.by(() => {
    if (chosen.length < MIN_PLAYERS) return `Kies minstens ${MIN_PLAYERS} spelers (nu ${chosen.length}).`;
    if (chosen.length > MAX_PLAYERS) return `Maximum ${MAX_PLAYERS} spelers.`;
    if (!gmStillValid) return 'Duid aan wie de spelleider is.';
    if (!pinOk) return 'De pincode moet uit 4 cijfers bestaan (of leeg laten).';
    return null;
  });

  const s = $derived(app.settings);
  const locationText = $derived(
    LOCATIONS.filter((l) => s.locations.includes(l.id))
      .map((l) => `${l.emoji} ${l.label}`)
      .join(' · '),
  );

  function togglePlayer(id: string): void {
    selected = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
  }

  function start(): void {
    if (problem) {
      showToast(problem, 'error');
      return;
    }
    const settings = { ...$state.snapshot(app.settings), speurneusEnabled: speurneus, bemoeialEnabled: bemoeial };
    const gm = gameMaster === 'geen' ? null : gameMaster;
    const playerIds = chosen.map((p) => p.id);
    // Een eerder aangepast programma behouden als spelers en instellingen niet veranderd zijn.
    const previous = app.draft;
    const same =
      previous !== null &&
      JSON.stringify(previous.playerIds) === JSON.stringify(playerIds) &&
      JSON.stringify(previous.settings) === JSON.stringify(settings);
    const program = same && previous ? previous.program : buildProgram({ settings, playerCount: playerIds.length, tasks: allTasks() });
    app.draft = { playerIds, gameMasterId: gm, pin: gm === null && pin !== '' ? pin : null, settings, program };
    go('programma');
  }
</script>

<main class="page">
  <TopBar title="Nieuw spel" emoji="🎲" />

  <section class="section">
    <div class="head">
      <h2>👥 Wie speelt er mee?</h2>
      <span class="count" class:bad={chosen.length < MIN_PLAYERS}>{chosen.length} / {MAX_PLAYERS}</span>
    </div>
    <p class="hint">Tik op iedereen die er vandaag bij is. Minstens {MIN_PLAYERS}.</p>
    <div class="grid">
      {#each app.players as p (p.id)}
        <button type="button" class="pl" aria-pressed={selected.includes(p.id)} onclick={() => togglePlayer(p.id)}>
          <span class="av" style="--c:{p.color}">{p.avatar}</span>
          <span class="nm">{p.name}</span>
          {#if selected.includes(p.id)}<span class="check">✓</span>{/if}
        </button>
      {/each}
      <button type="button" class="pl add" onclick={() => go('spelers')}>
        <span class="av plus">＋</span>
        <span class="nm">Speler toevoegen</span>
      </button>
    </div>
    {#if app.players.length > 0}
      <div class="quick">
        <button type="button" class="link" onclick={() => (selected = app.players.map((p) => p.id).slice(0, MAX_PLAYERS))}>Iedereen</button>
        <button type="button" class="link" onclick={() => (selected = [])}>Niemand</button>
      </div>
    {/if}
  </section>

  {#if chosen.length > 0}
    <section class="section">
      <h2>🎬 Wie is de spelleider?</h2>
      <p class="hint">
        De spelleider leest voor en duidt resultaten aan. Speelt die mee, dan kan die ook {s.saboteurName} zijn en toont de
        app nooit geheime info aan de spelleider.
      </p>
      <div class="chips">
        {#each chosen as p (p.id)}
          <button type="button" class="chip" aria-pressed={gameMaster === p.id} onclick={() => (gameMaster = p.id)}>
            <span class="emoji">{p.avatar}</span>{p.name}
          </button>
        {/each}
        <button type="button" class="chip" aria-pressed={gameMaster === 'geen'} onclick={() => (gameMaster = 'geen')}>
          <span class="emoji">👤</span>Iemand die niet meespeelt
        </button>
      </div>
      {#if gameMaster === 'geen'}
        <label class="field-label" for="pin">Pincode voor het rollenoverzicht (niet verplicht)</label>
        <p class="hint">Met deze 4 cijfers kan de spelleider later stiekem zien wie wat is, bv. als een kind het vergeten is.</p>
        <input
          id="pin"
          class="text-input pin"
          inputmode="numeric"
          maxlength="4"
          placeholder="bv. 2610"
          bind:value={pin}
          oninput={() => (pin = pin.replace(/\D/g, '').slice(0, 4))}
        />
      {/if}
    </section>
  {/if}

  <section class="section">
    <h2>⚙️ Dit spel</h2>
    {#if voiceMissing}
      <p class="voice-warn">
        🎙️ De Vlaamse stem van {s.hostName} staat nog niet op deze tablet.
        <button type="button" class="link" onclick={() => go('stemtest')}>Nu downloaden (wifi nodig)</button>
      </p>
    {/if}
    <ul class="summary">
      <li><span>🎯</span> {s.difficulty === 'makkelijk' ? 'Makkelijk' : s.difficulty === 'normaal' ? 'Normaal' : 'Pittig'}</li>
      <li><span>⏱️</span> {formatDuration(s.durationMinutes)}</li>
      <li><span>📍</span> {locationText}</li>
      <li><span>💎</span> {s.treasureMode === 'virtueel' ? 'Virtuele schat' : 'Echte schat'}</li>
    </ul>
    <button type="button" class="link" onclick={() => go('instellingen')}>Standaardinstellingen aanpassen</button>
    <div class="toggles">
      <Toggle label="🔍 Speurneus" description="Eén speler krijgt stiekem onschuldige namen." checked={speurneus} onchange={(v) => (speurneus = v)} />
      <Toggle label="🙋 Bemoeial" description="Eén speler moet zich overal mee bemoeien." checked={bemoeial} onchange={(v) => (bemoeial = v)} />
    </div>
  </section>

  <div class="start">
    {#if problem}<p class="problem">{problem}</p>{/if}
    <BigButton variant="gold" size="large" full disabled={!!problem} onclick={start}>Verder: het programma ▶</BigButton>
  </div>
</main>

<style>
  .head {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .count {
    font-family: var(--font-title);
    font-weight: 700;
    color: var(--turquoise);
  }

  .count.bad {
    color: var(--gold);
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 10px;
  }

  .pl {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 14px 6px;
    border-radius: 18px;
    border: 3px solid var(--line);
    background: var(--bg-deep);
    cursor: pointer;
    transition: transform 0.12s ease;
  }

  .pl:active {
    transform: scale(0.95);
  }

  .pl[aria-pressed='true'] {
    border-color: var(--turquoise);
    background: rgba(41, 211, 196, 0.14);
  }

  .pl.add {
    border-style: dashed;
    background: transparent;
  }

  .av {
    width: 58px;
    height: 58px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-size: 2rem;
    background: var(--c);
  }

  .av.plus {
    background: rgba(255, 255, 255, 0.08);
    color: var(--turquoise);
  }

  .nm {
    font-weight: 800;
    text-align: center;
    word-break: break-word;
  }

  .check {
    position: absolute;
    top: 6px;
    right: 8px;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--turquoise);
    color: #0d2b33;
    font-weight: 800;
    display: grid;
    place-items: center;
  }

  .quick {
    display: flex;
    gap: 16px;
    margin-top: 12px;
  }

  .link {
    background: none;
    border: none;
    color: var(--turquoise);
    font-weight: 800;
    padding: 8px 0;
    cursor: pointer;
    text-decoration: underline;
  }

  .pin {
    max-width: 200px;
    font-size: 1.6rem;
    letter-spacing: 0.4em;
    text-align: center;
  }

  .summary {
    list-style: none;
    padding: 0;
    margin: 8px 0;
    display: grid;
    gap: 6px;
  }

  .summary span {
    display: inline-block;
    width: 30px;
  }

  .toggles {
    margin-top: 8px;
  }

  .start {
    margin-top: 10px;
  }

  .voice-warn {
    padding: 10px 14px;
    border-radius: var(--radius-sm);
    background: rgba(255, 207, 63, 0.12);
    color: var(--gold);
    font-weight: 700;
  }

  .problem {
    text-align: center;
    color: var(--gold);
    font-weight: 800;
  }
</style>
