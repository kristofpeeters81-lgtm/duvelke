<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import BigButton from '../components/BigButton.svelte';
  import Confetti from '../components/Confetti.svelte';
  import Duvelke from '../components/Duvelke.svelte';
  import Machine from '../components/Machine.svelte';
  import Neighbour from '../components/Neighbour.svelte';
  import PotBoard from '../components/PotBoard.svelte';
  import QrCode from '../components/QrCode.svelte';
  import QrScan from '../components/QrScan.svelte';
  import TreasureChest from '../components/TreasureChest.svelte';
  import Windy from '../components/Windy.svelte';
  import { storedVoices } from '../lib/piper';
  import { app, go } from '../lib/store.svelte';
  import { acceptOffer, close, startLocalViewer, view } from '../lib/tv/viewer.svelte';

  let scanning = $state(false);
  let typed = $state('');
  let now = $state(Date.now());
  let photo = $state(0);
  let voiceMissing = $state(false);
  /** De QR-code zo groot als het scherm toelaat: dan scant de tablet ze het makkelijkst. */
  let qrSize = $state(340);
  function fitQr(): void {
    qrSize = Math.max(240, Math.min(window.innerWidth - 48, window.innerHeight - 260, 640));
  }

  const screen = $derived(view.screen);
  const s = $derived(screen?.state ?? null);
  const connected = $derived(view.status === 'verbonden');
  /** Staat wat Windy zegt al groot op het scherm (de uitleg, de quizvraag, de roddel)? Dan geen dubbele ondertitel. */
  const captionOnStage = $derived.by(() => {
    if (!view.caption || !s) return false;
    const key = JSON.stringify(view.caption.text.slice(0, 40)).slice(1, -1);
    return JSON.stringify(s).includes(key);
  });

  // Het scherm mag niet uitgaan zolang het tv-scherm open staat.
  let lock: { release: () => Promise<void> } | null = null;
  async function keepAwake(): Promise<void> {
    try {
      const wl = (navigator as unknown as { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock;
      if (wl && document.visibilityState === 'visible') lock = await wl.request('screen');
    } catch {
      /* niet erg */
    }
  }
  const onVisible = (): void => void keepAwake();

  onMount(() => {
    void keepAwake();
    fitQr();
    window.addEventListener('resize', fitQr);
    document.addEventListener('visibilitychange', onVisible);
    const tick = setInterval(() => (now = Date.now()), 250);
    const slides = setInterval(() => (photo += 1), 4000);
    void storedVoices().then((v) => (voiceMissing = !v.includes(app.settings.voice.piperVoice)));
    return () => {
      clearInterval(tick);
      clearInterval(slides);
      window.removeEventListener('resize', fitQr);
    };
  });

  onDestroy(() => {
    document.removeEventListener('visibilitychange', onVisible);
    void lock?.release();
    close();
  });

  function scanned(code: string): void {
    scanning = false;
    void acceptOffer(code);
  }

  function fullscreen(): void {
    void document.documentElement.requestFullscreen?.().catch(() => {});
  }

  /** Resterende tijd van de timer, met de klok van de tablet omgerekend naar die van dit toestel. */
  function timeLeft(t: { total: number; remainingMs: number; endsAt: number | null }): string {
    const ms = t.endsAt !== null ? Math.max(0, t.endsAt + view.offset - now) : t.remainingMs;
    const sec = Math.ceil(ms / 1000);
    return ms <= 0 && t.endsAt !== null ? '⏰' : `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
  }
</script>

<main class="tv">
  {#if !connected}
    <div class="pair">
      <h1>📺 Tv-scherm</h1>
      {#if view.status === 'antwoord'}
        <p class="big"><strong>Nu de tablet:</strong> tik daar op 📷 <em>Scan de code van de tv</em> en scan deze code.</p>
        <QrCode value={view.answer} size={qrSize} />
        <p class="hint">Tip: zet dit scherm op volle helderheid en hou de tablet er 20 tot 30 cm van.</p>
        <details class="manual">
          <summary>De code als tekst</summary>
          <textarea readonly rows="3">{view.answer}</textarea>
        </details>
      {:else if view.status === 'lokaal'}
        <p class="big">Wachten op de tablet... Kies op de tablet: ☰ → 📺 Tv-scherm → <strong>Op dit toestel</strong>.</p>
      {:else}
        {#if view.status === 'kwijt'}
          <p class="big warn">De verbinding met de tablet is weg. De tablet speelt gewoon verder.</p>
        {/if}
        <p>Op de tablet: ☰ → 📺 <strong>Tv-scherm</strong> → <strong>Koppel een tweede toestel</strong>. Scan dan hier de code die de tablet toont.</p>
        {#if scanning}
          <QrScan onresult={scanned} />
          <BigButton variant="ghost" onclick={() => (scanning = false)}>Stop met scannen</BigButton>
        {:else}
          <BigButton variant="gold" size="large" onclick={() => (scanning = true)}>📷 Scan de code van de tablet</BigButton>
        {/if}
        <details class="manual">
          <summary>Code typen of plakken</summary>
          <textarea bind:value={typed} rows="3" placeholder="Code van de tablet"></textarea>
          <BigButton variant="secondary" disabled={typed.trim() === ''} onclick={() => acceptOffer(typed)}>Verbinden</BigButton>
        </details>
        <button type="button" class="link" onclick={startLocalViewer}>Dit is hetzelfde toestel als de tablet (tweede venster)</button>
      {/if}
      {#if view.error}<p class="warn">{view.error}</p>{/if}
      {#if voiceMissing}
        <p class="hint">Tip: download de AI-stem ook op dit toestel (🎙️ {app.settings.hostName} → Stem), anders spreekt de voorleesstem van het toestel.</p>
      {/if}
      <p class="hint">Versie {__BUILD__}</p>
      <button type="button" class="link" onclick={() => go('home')}>◀ Terug</button>
    </div>
  {:else}
    <header class="bar">
      <span class="brand">🕵️ Wie is ’t Duvelke?</span>
      {#if screen && screen.max > 0}<span class="gems">💎 {screen.gems} / {screen.max}</span>{/if}
      {#if view.recTotal > 0 && view.recDone < view.recTotal}<span class="sync">🎙️ stemmen {view.recDone}/{view.recTotal}</span>{/if}
      <button type="button" class="fs" onclick={fullscreen} aria-label="Volledig scherm">⛶</button>
    </header>

    <section class="stage">
      {#if !s}
        <p class="big">Verbonden! Wachten op het spel...</p>
      {:else if s.kind === 'wacht'}
        <div class="center">
          <span class="huge">{s.emoji}</span>
          <h1>{s.title}</h1>
          {#if s.text}<p class="big">{s.text}</p>{/if}
        </div>
      {:else if s.kind === 'roddel'}
        <div class="center">
          <h1>🤫 Roddeltijd!</h1>
          {#if s.gossip}
            <p class="badge {s.gossip.tone}">{s.gossip.badge}</p>
            <div class="gossip">
              <span class="who">
                {#if s.gossip.speaker === 'machien'}<Machine size={180} talking={!!view.caption} />{:else if s.gossip.speaker === 'buurvrouw'}<Neighbour size={180} talking={!!view.caption} />{:else}<Windy size={180} talking={!!view.caption} mood="geschokt" />{/if}
              </span>
              <p class="bubble">{s.gossip.text}</p>
            </div>
          {:else}
            <Windy size={180} talking={!!view.caption} mood="stiekem" />
            <p class="big">Luister goed...</p>
          {/if}
        </div>
      {:else if s.kind === 'aankondiging'}
        <div class="center">
          <p class="nr">Opdracht {s.nr} van {s.total}</p>
          <span class="huge pop">{s.emoji}</span>
          <h1>{s.title}</h1>
          <div class="tags">{#each s.tags as t (t)}<span class="tag">{t}</span>{/each}</div>
        </div>
      {:else if s.kind === 'opdracht'}
        <div class="task">
          <h2><span>{s.emoji}</span> {s.title} <small>{s.nr}/{s.total}</small></h2>
          {#if s.timer}<div class="timer">{timeLeft(s.timer)}</div>{/if}
          {#if s.quiz}
            <div class="quiz">
              <p class="nr">Vraag {s.quiz.number} van {s.quiz.total}</p>
              <h3>{s.quiz.question}</h3>
              <div class="opts">
                {#each s.quiz.options as o, i (i)}
                  <div class="opt" class:right={s.quiz.right === i} class:wrong={s.quiz.chosen === i && s.quiz.right !== i}><b>{'ABCD'[i]}</b> {o}</div>
                {/each}
              </div>
            </div>
          {:else if s.stopwatch}
            <div class="center">
              {#if s.stopwatch.elapsed !== null}
                <span class="huge">{s.stopwatch.elapsed.toFixed(1)} s</span>
                <p class="big">Doel: {s.stopwatch.target} seconden</p>
              {:else if s.stopwatch.running}
                <span class="huge">🙈</span>
                <p class="big">Ogen dicht en niet luidop tellen!</p>
              {:else}
                <span class="huge">⏱️</span>
                <p class="big">Zo meteen start de klok...</p>
              {/if}
            </div>
          {:else}
            <p class="explain">{s.explain}</p>
          {/if}
          {#if s.roles.length > 0}
            <div class="roles">
              {#each s.roles as r (r.name)}<span class="tag">🎭 {r.name}: {r.players.join(', ')}</span>{/each}
            </div>
          {/if}
          {#if s.list}
            <div class="list">
              <h3>📋 {s.list.title}</h3>
              <ul>{#each s.list.items as it, i (i)}<li>{it}</li>{/each}</ul>
            </div>
          {/if}
          {#if s.note}<p class="note">{s.note}</p>{/if}
          {#if s.waiting}<p class="note">{s.waiting}</p>{/if}
          {#if s.judge}
            <div class="judge">
              <p>🎉 <strong>Gelukt</strong> als {s.judge.gelukt}</p>
              <p>😅 <strong>Bijna</strong> als {s.judge.bijna}</p>
            </div>
          {/if}
        </div>
      {:else if s.kind === 'schat'}
        <div class="center">
          <span class="gain" class:none={s.gain === 0}>{s.gain > 0 ? `+${s.gain} 💎` : '0 💎'}</span>
          {#if screen}<TreasureChest gems={screen.gems} max={screen.max} size="groot" bounce={s.gain > 0} />{/if}
        </div>
      {:else if s.kind === 'eindschat'}
        <div class="center">
          {#if screen}<TreasureChest gems={screen.gems} max={screen.max} size="groot" bounce />{/if}
          <h1>{s.pct}% van de schat</h1>
          <p class="big">{s.groupWins ? '🎉 De groep wint de schat!' : `😈 ${s.saboteurName} wint de schat...`}</p>
          {#if s.groupWins}<Confetti count={60} />{/if}
        </div>
      {:else if s.kind === 'ontmaskering'}
        <div class="center">
          <h1>🎭 De ontmaskering</h1>
          <div class="cards">
            {#each s.players as p (p.name)}
              <div class="pcard" class:cleared={p.cleared} class:sab={p.saboteur}>
                <span class="av" style="--c:{p.color}">{p.avatar}</span>
                <span class="nm">{p.name}</span>
                {#if p.cleared}<span class="stamp ok">✓ onschuldig</span>{:else if p.saboteur}<span class="stamp">😈</span>{/if}
              </div>
            {/each}
          </div>
          {#if s.unmasked}
            <Duvelke size={150} />
            <h1>{s.saboteurs.join(' en ')} {s.saboteurs.length > 1 ? 'waren' : 'was'} {s.saboteurName}!</h1>
            <Confetti count={40} />
          {/if}
        </div>
      {:else if s.kind === 'uitslag'}
        <div class="center">
          <h1>🏆 De uitslag van De Test</h1>
          <ol class="ranks">
            {#each s.rows as r (r.place)}
              <li class:winner={r.place === 1 && r.shown}>
                <span class="place">{r.place === 1 && r.shown ? '👑' : r.place}</span>
                {#if r.shown}<span class="av sm" style="--c:{r.color}">{r.avatar}</span><span class="nm">{r.name}</span><span class="sc">{r.score} {r.found ? '🎯' : ''}</span>{:else}<span class="nm">???</span>{/if}
              </li>
            {/each}
          </ol>
          {#if s.noTest.length > 0}<p>Deden De Test niet mee: {s.noTest.join(', ')}.</p>{/if}
          {#if s.done}<Confetti count={90} />{/if}
        </div>
      {:else if s.kind === 'pot'}
        <div class="task">
          <h2>🍫 De pot verdelen</h2>
          <PotBoard pot={s.pot} />
        </div>
      {:else if s.kind === 'terugblik'}
        <div class="task">
          <h2>😈 Wat deed {s.saboteurName} allemaal?</h2>
          <ul class="log">
            {#each s.items as it, i (i)}<li><span>{it.emoji}</span> <strong>{it.title}</strong>{it.who ? ` (${it.who})` : ''}: “{it.tip}”</li>{/each}
          </ul>
        </div>
      {:else if s.kind === 'fotos'}
        <div class="center">
          {#if view.photos.length > 0}
            {#key photo % view.photos.length}<img class="photo" src={view.photos[photo % view.photos.length]} alt="Bewijsfoto" />{/key}
          {:else}
            <span class="huge">📸</span>
            <h1>De bewijsfoto's</h1>
          {/if}
        </div>
      {/if}
    </section>

    {#if view.caption && !captionOnStage}
      <aside class="caption">
        <span class="who">
          {#if view.caption.speaker === 'machien'}<Machine size={110} talking />{:else if view.caption.speaker === 'buurvrouw'}<Neighbour size={110} talking />{:else}<Windy size={110} talking mood="blij" />{/if}
        </span>
        <p>{view.caption.text}</p>
      </aside>
    {/if}
  {/if}
</main>

<style>
  .tv {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    padding: 16px clamp(16px, 3vw, 40px);
    gap: 12px;
    overflow: hidden;
  }

  .pair {
    width: min(720px, 100%);
    margin: auto;
    display: flex;
    flex-direction: column;
    gap: 14px;
    text-align: center;
  }

  .manual textarea {
    width: 100%;
    font-family: monospace;
    font-size: 0.8rem;
    margin: 8px 0;
  }

  .bar {
    display: flex;
    align-items: center;
    gap: 18px;
    font-weight: 800;
    font-size: clamp(1rem, 2vw, 1.5rem);
  }

  .brand {
    font-family: var(--font-title);
    flex: 1;
  }

  .gems {
    color: var(--gold);
  }

  .sync {
    color: var(--text-dim);
    font-size: 0.9em;
  }

  .fs {
    background: none;
    border: 2px solid var(--line);
    color: inherit;
    border-radius: 10px;
    font-size: 1.2rem;
    padding: 2px 10px;
    cursor: pointer;
  }

  .stage {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .center {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    text-align: center;
    width: 100%;
  }

  h1 {
    font-size: clamp(2rem, 5vw, 4rem);
    margin: 0;
  }

  .huge {
    font-size: clamp(5rem, 14vw, 10rem);
    line-height: 1;
  }

  .pop {
    animation: pop 0.6s cubic-bezier(0.3, 1.6, 0.5, 1);
  }

  .big {
    font-size: clamp(1.3rem, 2.8vw, 2.2rem);
    margin: 0;
  }

  .nr {
    color: var(--text-dim);
    font-weight: 800;
    font-size: clamp(1rem, 2vw, 1.6rem);
    margin: 0;
  }

  .tags,
  .roles {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: center;
  }

  .tag {
    font-weight: 800;
    padding: 6px 16px;
    border-radius: 999px;
    background: var(--bg-deep);
    font-size: clamp(1rem, 2vw, 1.5rem);
  }

  .task {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .task h2 {
    font-size: clamp(1.8rem, 4vw, 3.2rem);
    margin: 0;
    text-align: center;
  }

  .task h2 small {
    color: var(--text-dim);
    font-size: 0.5em;
  }

  .timer {
    font-family: var(--font-title);
    font-size: clamp(4rem, 12vw, 9rem);
    text-align: center;
    color: var(--gold);
    line-height: 1;
  }

  .explain {
    font-size: clamp(1.3rem, 2.8vw, 2.2rem);
    background: var(--bg-raised);
    border-radius: var(--radius);
    padding: 18px 24px;
    margin: 0;
  }

  .note {
    font-size: clamp(1.1rem, 2.2vw, 1.8rem);
    text-align: center;
    font-weight: 800;
    margin: 0;
  }

  .list h3 {
    margin: 0 0 8px;
    font-size: clamp(1.2rem, 2.4vw, 2rem);
  }

  .list ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 10px;
  }

  .list li {
    padding: 10px 14px;
    border-radius: 12px;
    background: var(--bg-deep);
    font-weight: 700;
    font-size: clamp(1rem, 2vw, 1.6rem);
  }

  .quiz h3 {
    font-size: clamp(1.6rem, 3.6vw, 3rem);
    text-align: center;
    margin: 8px 0 16px;
  }

  .opts {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }

  .opt {
    padding: 18px;
    border-radius: 18px;
    background: var(--bg-raised);
    border: 3px solid var(--line);
    font-size: clamp(1.2rem, 2.6vw, 2.2rem);
    font-weight: 800;
  }

  .opt.right {
    border-color: #2bd96b;
    background: rgba(43, 217, 107, 0.2);
  }

  .opt.wrong {
    border-color: var(--red, #ff5a5a);
    background: rgba(255, 90, 90, 0.2);
  }

  .gain {
    font-family: var(--font-title);
    font-size: clamp(3rem, 9vw, 7rem);
    color: var(--gold);
  }

  .gain.none {
    color: var(--text-dim);
  }

  .cards {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    justify-content: center;
  }

  .pcard {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 14px 18px;
    border-radius: 20px;
    background: var(--bg-raised);
    border: 3px solid var(--line);
    min-width: 130px;
  }

  .pcard.cleared {
    opacity: 0.55;
  }

  .pcard.sab {
    border-color: var(--red, #ff5a5a);
    transform: scale(1.1);
  }

  .av {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-size: 2.6rem;
    background: var(--c);
  }

  .av.sm {
    width: 48px;
    height: 48px;
    font-size: 1.6rem;
  }

  .nm {
    font-weight: 800;
    font-size: clamp(1.1rem, 2vw, 1.6rem);
  }

  .stamp {
    font-weight: 800;
    font-size: 1.5rem;
  }

  .stamp.ok {
    color: #2bd96b;
    font-size: 1rem;
  }

  .ranks {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 10px;
    width: min(900px, 100%);
  }

  .ranks li {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 10px 18px;
    border-radius: 16px;
    background: var(--bg-raised);
    font-size: clamp(1.1rem, 2.2vw, 1.8rem);
  }

  .ranks li.winner {
    border: 3px solid var(--gold);
  }

  .place {
    width: 2em;
    font-weight: 800;
  }

  .sc {
    margin-left: auto;
    font-weight: 800;
  }

  .log {
    font-size: clamp(1.1rem, 2.2vw, 1.8rem);
    display: grid;
    gap: 10px;
  }

  .photo {
    max-width: 100%;
    max-height: 78dvh;
    border-radius: 18px;
    animation: fade 0.6s;
  }

  .judge {
    display: grid;
    gap: 8px;
    font-size: clamp(1.1rem, 2.2vw, 1.8rem);
  }

  .judge p {
    margin: 0;
    background: var(--bg-raised);
    border-radius: 14px;
    padding: 10px 16px;
  }

  .badge {
    margin: 0;
    padding: 8px 20px;
    border-radius: 999px;
    font-weight: 800;
    font-size: clamp(1.1rem, 2.4vw, 2rem);
  }

  .badge.ok {
    background: rgba(41, 211, 196, 0.2);
    color: #29d3c4;
  }

  .badge.warn {
    background: rgba(255, 159, 67, 0.2);
    color: #ff9f43;
  }

  .gossip {
    display: flex;
    align-items: center;
    gap: 24px;
    width: 100%;
  }

  .bubble {
    flex: 1;
    margin: 0;
    background: #fff;
    color: #2a1454;
    border-radius: 24px;
    padding: 18px 24px;
    font-size: clamp(1.3rem, 2.8vw, 2.4rem);
    font-weight: 700;
    text-align: left;
  }

  .caption {
    display: flex;
    align-items: center;
    gap: 16px;
    background: #fff;
    color: #2a1454;
    border-radius: 24px;
    padding: 10px 22px 10px 10px;
    box-shadow: var(--shadow);
  }

  .caption p {
    margin: 0;
    font-size: clamp(1.2rem, 2.6vw, 2.2rem);
    font-weight: 700;
  }

  .warn {
    color: var(--red, #ff6b6b);
    font-weight: 800;
  }

  .hint {
    color: var(--text-dim);
  }

  .link {
    background: none;
    border: none;
    color: var(--text-dim);
    text-decoration: underline;
    font-weight: 700;
    padding: 10px;
    cursor: pointer;
  }

  @keyframes pop {
    from {
      transform: scale(0.3);
      opacity: 0;
    }
  }

  @keyframes fade {
    from {
      opacity: 0;
    }
  }
</style>
