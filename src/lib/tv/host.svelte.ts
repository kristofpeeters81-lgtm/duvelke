/**
 * De tablet-kant van het tv-scherm: verbinden, de openbare info doorsturen, en de stem en geluidjes
 * laten klinken op de tv. Valt de verbinding weg, dan speelt de tablet gewoon alleen verder.
 */
import { getPhotos, getRecording } from '../db';
import { setRemoteSfx } from '../sfx';
import { setRemoteSpeech, type RemoteSpeech, type Speaker } from '../speech';
import { app } from '../store.svelte';
import { publicState, type TvUi } from './state';
import { localTransport, rtcHost, type Transport, type TransportEvents } from './transport';

export type TvStatus = 'uit' | 'wacht' | 'verbonden' | 'kwijt';

export const tv = $state({
  status: 'uit' as TvStatus,
  mode: null as 'qr' | 'lokaal' | null,
  /** Code A voor de QR-code. */
  offer: '',
  error: '',
  /** De code van de tv is gescand; nu wachten tot de verbinding er is. */
  connecting: false,
});

/** Wat de tablet nog weet maar niet in het spel bewaart (bv. welke quizvraag op het scherm staat). */
export const tvUi = $state<TvUi>({});

let transport: Transport | null = null;
let accept: ((answer: string) => Promise<void>) | null = null;
let rtcState: (() => string) | null = null;
let connectTimer: ReturnType<typeof setTimeout> | undefined;
let lastScreen = '';
let photosFor = '';

const pending = new Map<number, { done: () => void; onStart?: (speaker: Speaker) => void }>();
let seq = 0;

function send(message: unknown): void {
  transport?.send(message);
}

function finishAll(): void {
  for (const p of pending.values()) p.done();
  pending.clear();
}

const remoteSpeech: RemoteSpeech = {
  // Enkel tijdens het spel; instellingen en stemtests blijven op de tablet.
  active: () => tv.status === 'verbonden' && app.screen === 'spel',
  speak(text, v, options, onStart) {
    finishAll();
    const id = ++seq;
    send({ t: 'say', id, text, v, options });
    return new Promise<void>((resolve) => {
      // Antwoordt de tv niet (meer), dan wachten we niet eeuwig.
      const timer = setTimeout(() => entry.done(), Math.max(15000, text.length * 150));
      const entry = {
        done: () => {
          clearTimeout(timer);
          pending.delete(id);
          resolve();
        },
        onStart,
      };
      pending.set(id, entry);
    });
  },
  stop() {
    send({ t: 'stop' });
    finishAll();
  },
  prefetch(text, v) {
    send({ t: 'prefetch', text, v });
  },
};

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** De eigen opnames (ook de namen) staan enkel op de tablet: stuur ze mee, zodat de tv ze kan afspelen. */
async function sendRecordings(): Promise<void> {
  const ids = [...app.recordedLineIds];
  send({ t: 'rec-ids', ids });
  for (const id of ids) {
    if (tv.status !== 'verbonden') return;
    const r = await getRecording(id);
    if (r) send({ t: 'rec', id, mime: r.audio.type, data: await blobToBase64(r.audio) });
  }
}

/** Verkleinde foto's voor de diavoorstelling op de tv. Ze blijven niet op het tv-toestel staan. */
async function sendPhotos(gameId: string): Promise<void> {
  const photos = await getPhotos(gameId);
  const list: string[] = [];
  for (const p of photos) {
    try {
      const bmp = await createImageBitmap(p.image);
      const scale = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(bmp.width * scale);
      canvas.height = Math.round(bmp.height * scale);
      canvas.getContext('2d')?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
      list.push(canvas.toDataURL('image/jpeg', 0.8));
    } catch {
      /* een kapotte foto slaan we over */
    }
  }
  send({ t: 'photos', list });
}

function pushScreen(): void {
  const screen = publicState(app.game, tvUi);
  const key = JSON.stringify(screen.state) + screen.gems + '/' + screen.max;
  if (key === lastScreen) return;
  lastScreen = key;
  send({ t: 'screen', screen });
  if (screen.state.kind === 'fotos' && app.game && photosFor !== app.game.id) {
    photosFor = app.game.id;
    void sendPhotos(app.game.id);
  }
}

function attach(): void {
  setRemoteSpeech(remoteSpeech);
  setRemoteSfx((name, arg) => send({ t: 'sfx', name, arg }));
  lastScreen = '';
  photosFor = '';
  send({ t: 'hello', hostName: app.settings.hostName });
  pushScreen();
  void sendRecordings();
}

function detach(): void {
  setRemoteSpeech(null);
  setRemoteSfx(null);
  finishAll();
}

const events: TransportEvents = {
  onopen: () => {
    clearTimeout(connectTimer);
    tv.status = 'verbonden';
    tv.connecting = false;
    tv.error = '';
    attach();
  },
  onclose: () => {
    if (tv.status === 'verbonden') tv.status = 'kwijt';
    detach();
  },
  onmessage: (raw) => {
    const m = raw as { t?: string; id?: number; speaker?: Speaker };
    if (m.t === 'started' && m.id !== undefined) pending.get(m.id)?.onStart?.(m.speaker ?? 'windy');
    if (m.t === 'spoken' && m.id !== undefined) pending.get(m.id)?.done();
    if (m.t === 'ready') {
      lastScreen = '';
      pushScreen();
    }
  },
};

// Elke wijziging in het spel: de openbare info opnieuw doorsturen (enkel als ze echt veranderde).
$effect.root(() => {
  $effect(() => {
    if (tv.status !== 'verbonden') return;
    pushScreen();
  });
});

/** Koppelen met een tweede toestel: maakt code A (voor de QR-code). */
export async function startQr(): Promise<void> {
  disconnect();
  tv.mode = 'qr';
  tv.status = 'wacht';
  try {
    const host = await rtcHost(events);
    transport = host.transport;
    accept = host.accept;
    rtcState = host.state;
    tv.offer = host.code;
  } catch (err) {
    tv.error = err instanceof Error ? err.message : String(err);
    tv.status = 'uit';
  }
}

/** Code B van de tv (gescand of geplakt). */
export async function acceptAnswer(code: string): Promise<void> {
  try {
    tv.error = '';
    await accept?.(code);
    tv.connecting = true;
    clearTimeout(connectTimer);
    // Lukt het niet binnen 15 s, dan zeggen we het (meestal ligt het aan het wifi).
    connectTimer = setTimeout(() => {
      if (tv.status === 'verbonden') return;
      tv.connecting = false;
      tv.error = `Verbinden lukt niet. Zitten de tablet en het tv-toestel op hetzelfde wifi-netwerk (geen gastennetwerk, geen mobiele data)? Probeer daarna opnieuw. (${rtcState?.() ?? '?'})`;
    }, 15000);
  } catch (err) {
    tv.error = err instanceof Error ? err.message : 'Die code klopt niet.';
  }
}

/** Het tv-scherm in een tweede venster op dit toestel (voor "één app casten"). */
export function startLocal(): void {
  disconnect();
  tv.mode = 'lokaal';
  tv.status = 'wacht';
  transport = localTransport('host', events);
}

export function disconnect(): void {
  const t = transport;
  transport = null;
  accept = null;
  rtcState = null;
  clearTimeout(connectTimer);
  tv.connecting = false;
  t?.close();
  detach();
  tv.status = 'uit';
  tv.mode = null;
  tv.offer = '';
}
