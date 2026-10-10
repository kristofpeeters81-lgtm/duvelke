/**
 * De tv-kant: ontvangt de openbare info van de tablet, toont ze, en spreekt zelf (met de eigen opnames
 * die de tablet doorstuurde). Dit toestel krijgt nooit het spel zelf te zien.
 */
import { playLocal, type SfxName } from '../sfx';
import { prefetch, setRecordedIds, setRecordingSource, speak, stopAll, type RemoteSpeakOptions, type Speaker } from '../speech';
import type { VoiceSettings } from '../types';
import type { TvScreen } from './state';
import { localTransport, rtcViewer, type Transport, type TransportEvents } from './transport';

export type ViewStatus = 'uit' | 'antwoord' | 'lokaal' | 'verbonden' | 'kwijt';

export const view = $state({
  status: 'uit' as ViewStatus,
  /** Code B voor de QR-code. */
  answer: '',
  error: '',
  screen: null as TvScreen | null,
  /** Verschil tussen de klok van dit toestel en die van de tablet (ms). */
  offset: 0,
  caption: null as { text: string; speaker: Speaker } | null,
  recTotal: 0,
  recDone: 0,
  photos: [] as string[],
  hostName: 'Windy',
});

let transport: Transport | null = null;
const recordings = new Map<string, Blob>();
let captionTimer: ReturnType<typeof setTimeout> | undefined;

function fromBase64(data: string, mime: string): Blob {
  const bin = atob(data);
  return new Blob([Uint8Array.from(bin, (c) => c.charCodeAt(0))], { type: mime });
}

function say(m: { id: number; text: string; v: VoiceSettings; options: RemoteSpeakOptions }): void {
  clearTimeout(captionTimer);
  view.caption = { text: m.text, speaker: m.options.voice ? 'buurvrouw' : 'windy' };
  void speak(m.text, m.v, {
    ...m.options,
    onStart: (speaker) => {
      if (view.caption) view.caption.speaker = speaker;
      transport?.send({ t: 'started', id: m.id, speaker });
    },
  }).then(() => {
    transport?.send({ t: 'spoken', id: m.id });
    captionTimer = setTimeout(() => (view.caption = null), 2500);
  });
}

const events: TransportEvents = {
  onopen: () => {
    view.status = 'verbonden';
    view.error = '';
    setRecordingSource(async (id) => {
      const audio = recordings.get(id);
      return audio ? { audio } : undefined;
    });
    transport?.send({ t: 'ready' });
  },
  onclose: () => {
    view.status = 'kwijt';
    view.caption = null;
    stopAll();
  },
  onmessage: (raw) => {
    const m = raw as { t?: string } & Record<string, unknown>;
    switch (m.t) {
      case 'hello':
        view.hostName = typeof m.hostName === 'string' ? m.hostName : 'Windy';
        break;
      case 'screen': {
        const screen = m.screen as TvScreen;
        view.offset = Date.now() - screen.now;
        view.screen = screen;
        break;
      }
      case 'say':
        say(m as unknown as { id: number; text: string; v: VoiceSettings; options: RemoteSpeakOptions });
        break;
      case 'stop':
        stopAll();
        break;
      case 'prefetch':
        void prefetch(String(m.text), m.v as VoiceSettings);
        break;
      case 'sfx':
        playLocal(m.name as SfxName, typeof m.arg === 'number' ? m.arg : undefined);
        break;
      case 'rec-ids': {
        const ids = Array.isArray(m.ids) ? (m.ids as string[]) : [];
        recordings.clear();
        view.recTotal = ids.length;
        view.recDone = 0;
        setRecordedIds(ids);
        break;
      }
      case 'rec':
        recordings.set(String(m.id), fromBase64(String(m.data), String(m.mime || 'audio/webm')));
        view.recDone = recordings.size;
        break;
      case 'photos':
        view.photos = Array.isArray(m.list) ? (m.list as string[]) : [];
        break;
    }
  },
};

/** Code A van de tablet (gescand of geplakt): maakt code B om terug te tonen. */
export async function acceptOffer(code: string): Promise<void> {
  close();
  try {
    view.error = '';
    const res = await rtcViewer(code, events);
    transport = res.transport;
    view.answer = res.code;
    view.status = 'antwoord';
  } catch (err) {
    view.error = err instanceof Error ? err.message : 'Die code klopt niet.';
  }
}

/** Hetzelfde toestel als de tablet (tweede venster). */
export function startLocalViewer(): void {
  close();
  view.status = 'lokaal';
  transport = localTransport('viewer', events);
}

export function close(): void {
  const t = transport;
  transport = null;
  t?.close();
  view.status = 'uit';
  view.answer = '';
}
