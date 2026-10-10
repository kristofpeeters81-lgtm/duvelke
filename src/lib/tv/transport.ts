/**
 * De verbinding tussen de tablet (host) en het tv-scherm (viewer).
 * - Tweede toestel: rechtstreeks via WebRTC op hetzelfde wifi, zonder server. Om elkaar te vinden,
 *   wisselen de toestellen één keer een code uit via QR-codes (aanbod van de tablet, antwoord van de tv).
 * - Zelfde toestel (tweede venster, voor "één app casten"): via een BroadcastChannel.
 * Grote berichten (opnames, foto's) worden in stukjes verstuurd.
 */

export interface Transport {
  send(message: unknown): void;
  close(): void;
}

export interface TransportEvents {
  onmessage: (message: unknown) => void;
  onopen: () => void;
  onclose: () => void;
}

/** Een datakanaal neemt geen te grote berichten aan: knip lange berichten in stukjes. */
const CHUNK = 60_000;
let chunkId = 0;

function chunked(raw: string): string[] {
  if (raw.length <= CHUNK) return [raw];
  const id = ++chunkId;
  const n = Math.ceil(raw.length / CHUNK);
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(JSON.stringify({ t: '~', id, i, n, d: raw.slice(i * CHUNK, (i + 1) * CHUNK) }));
  return out;
}

/** Plakt stukjes weer aan elkaar; geeft het volledige bericht terug of null als het nog niet compleet is. */
function assembler(): (raw: string) => unknown {
  const parts = new Map<number, string[]>();
  return (raw) => {
    const msg: unknown = JSON.parse(raw);
    if (typeof msg === 'object' && msg !== null && (msg as { t?: unknown }).t === '~') {
      const c = msg as { id: number; i: number; n: number; d: string };
      const list = parts.get(c.id) ?? [];
      list[c.i] = c.d;
      parts.set(c.id, list);
      if (list.filter((p) => p !== undefined).length < c.n) return null;
      parts.delete(c.id);
      return JSON.parse(list.join(''));
    }
    return msg;
  };
}

// --- Zelfde toestel ---------------------------------------------------------------

const CHANNEL = 'duvelke-tv';

/** Tablet en tv-venster op hetzelfde toestel. Wie eerst luistert, wacht op de ander. */
export function localTransport(role: 'host' | 'viewer', events: TransportEvents): Transport {
  const channel = new BroadcastChannel(CHANNEL);
  const assemble = assembler();
  let open = false;
  let lastSeen = Date.now();
  const hello = (): void => channel.postMessage(JSON.stringify({ t: '§hello', role }));
  channel.onmessage = (e: MessageEvent<string>) => {
    lastSeen = Date.now();
    const msg = assemble(e.data);
    if (msg === null) return;
    const m = msg as { t?: string; role?: string };
    if (m.t === '§hello') {
      if (m.role === role) return;
      if (!open) {
        open = true;
        hello();
        events.onopen();
      }
      return;
    }
    if (m.t === '§ping') return;
    if (m.t === '§bye') {
      if (open) {
        open = false;
        events.onclose();
      }
      return;
    }
    if (open) events.onmessage(msg);
  };
  hello();
  // Gaat dit venster dicht, dan meteen laten weten (anders merkt de ander het pas na enkele seconden).
  const bye = (): void => channel.postMessage(JSON.stringify({ t: '§bye' }));
  window.addEventListener('pagehide', bye);
  // Teken van leven, zodat een gesloten venster opgemerkt wordt.
  const beat = setInterval(() => {
    channel.postMessage(JSON.stringify({ t: '§ping' }));
    if (!open) hello();
    else if (Date.now() - lastSeen > 6000) {
      open = false;
      events.onclose();
    }
  }, 2000);
  return {
    send(message) {
      if (!open) return;
      for (const part of chunked(JSON.stringify(message))) channel.postMessage(part);
    },
    close() {
      clearInterval(beat);
      window.removeEventListener('pagehide', bye);
      bye();
      channel.close();
      if (open) {
        open = false;
        events.onclose();
      }
    },
  };
}

// --- Tweede toestel: WebRTC met een code ------------------------------------------

/** Enkel wat nodig is voor een datakanaal: de rest van de beschrijving laten we weg (kleinere QR-code). */
function slimSdp(sdp: string): string {
  return sdp
    .split(/\r?\n/)
    .filter((l) => l !== '' && !/^a=(extmap-allow-mixed|msid-semantic|ice-options)/.test(l))
    .join('\n');
}

async function pack(kind: 'A' | 'B', sdp: string): Promise<string> {
  const bytes = new TextEncoder().encode(slimSdp(sdp));
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  const zipped = new Uint8Array(await new Response(stream).arrayBuffer());
  let bin = '';
  for (const b of zipped) bin += String.fromCharCode(b);
  return `${kind}${btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
}

async function unpack(code: string, kind: 'A' | 'B'): Promise<string> {
  const clean = code.trim();
  if (!clean.startsWith(kind)) throw new Error(kind === 'A' ? 'Dit is niet de code van de tablet.' : 'Dit is niet de code van de tv.');
  const b64 = clean.slice(1).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  const text = await new Response(stream).text();
  return text.split('\n').join('\r\n') + '\r\n';
}

/**
 * Zonder internet vinden de toestellen elkaar op het wifi rechtstreeks. Is er internet, dan helpt een
 * gratis STUN-server van Google: die vertelt elk toestel enkel zijn eigen netwerkadres (handig als de
 * router de verborgen ".local"-namen van Chrome niet doorgeeft). Er gaat geen spelinfo langs.
 */
const RTC_CONFIG: RTCConfiguration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

/** Wacht tot alle eigen adressen gekend zijn (zonder server zijn dat er maar een paar), hoogstens 4 s. */
function gathered(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((resolve) => {
    const done = (): void => {
      pc.removeEventListener('icegatheringstatechange', check);
      resolve();
    };
    const check = (): void => {
      if (pc.iceGatheringState === 'complete') done();
    };
    pc.addEventListener('icegatheringstatechange', check);
    setTimeout(done, 4000);
  });
}

function wire(pc: RTCPeerConnection, channel: RTCDataChannel, events: TransportEvents): Transport {
  const assemble = assembler();
  let open = false;
  channel.onopen = () => {
    open = true;
    events.onopen();
  };
  channel.onmessage = (e: MessageEvent<string>) => {
    const msg = assemble(e.data);
    if (msg !== null) events.onmessage(msg);
  };
  const lost = (): void => {
    if (!open) return;
    open = false;
    events.onclose();
  };
  channel.onclose = lost;
  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'failed' || pc.connectionState === 'closed' || pc.connectionState === 'disconnected') lost();
  };
  return {
    send(message) {
      if (!open || channel.readyState !== 'open') return;
      for (const part of chunked(JSON.stringify(message))) channel.send(part);
    },
    close() {
      lost();
      channel.close();
      pc.close();
    },
  };
}

/** Tablet: maakt een aanbod (code A) en wacht op het antwoord van de tv (code B). */
export async function rtcHost(
  events: TransportEvents,
): Promise<{ code: string; accept: (answer: string) => Promise<void>; transport: Transport; state: () => string }> {
  const pc = new RTCPeerConnection(RTC_CONFIG);
  const channel = pc.createDataChannel('duvelke', { ordered: true });
  const transport = wire(pc, channel, events);
  await pc.setLocalDescription(await pc.createOffer());
  await gathered(pc);
  const code = await pack('A', pc.localDescription?.sdp ?? '');
  return {
    code,
    transport,
    state: () => `${pc.iceConnectionState}/${pc.connectionState}`,
    accept: async (answer) => {
      await pc.setRemoteDescription({ type: 'answer', sdp: await unpack(answer, 'B') });
    },
  };
}

/** Tv: leest het aanbod (code A) en geeft een antwoord (code B) terug. */
export async function rtcViewer(offer: string, events: TransportEvents): Promise<{ code: string; transport: Transport }> {
  const pc = new RTCPeerConnection(RTC_CONFIG);
  let transport: Transport | null = null;
  const pending: TransportEvents = {
    onmessage: (m) => events.onmessage(m),
    onopen: () => events.onopen(),
    onclose: () => events.onclose(),
  };
  const ready = new Promise<Transport>((resolve) => {
    pc.ondatachannel = (e) => {
      transport = wire(pc, e.channel, pending);
      resolve(transport);
    };
  });
  await pc.setRemoteDescription({ type: 'offer', sdp: await unpack(offer, 'A') });
  await pc.setLocalDescription(await pc.createAnswer());
  await gathered(pc);
  const code = await pack('B', pc.localDescription?.sdp ?? '');
  // Het kanaal komt pas als de tablet het antwoord gescand heeft; tot dan sturen we niets.
  const proxy: Transport = {
    send: (m) => transport?.send(m),
    close: () => {
      if (transport) transport.close();
      else pc.close();
      void ready;
    },
  };
  return { code, transport: proxy };
}
