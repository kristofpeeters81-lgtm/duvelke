/**
 * Vlaamse AI-stemmen (Piper, CC0) die volledig in de browser draaien.
 * Het stemmodel wordt één keer gedownload en in de browseropslag (OPFS) bewaard;
 * de rekenmodules worden door de service worker gecachet. Daarna werkt alles offline.
 */
import type { ProgressCallback } from '@mintplex-labs/piper-tts-web';
import type { PiperVoiceId } from './data/piperVoices';
import { toSpeech } from './voice';

export interface PiperVoice {
  id: PiperVoiceId;
  label: string;
  description: string;
}

export const PIPER_VOICES: PiperVoice[] = [
  { id: 'nl_BE-rdh-medium', label: 'Rdh', description: 'Vlaams, beste kwaliteit (± 60 MB)' },
  { id: 'nl_BE-nathalie-medium', label: 'Nathalie', description: 'Vlaams, beste kwaliteit (± 60 MB)' },
  { id: 'nl_BE-rdh-x_low', label: 'Rdh (klein)', description: 'Vlaams, kleiner en sneller, minder mooi (± 20 MB)' },
  { id: 'nl_BE-nathalie-x_low', label: 'Nathalie (klein)', description: 'Vlaams, kleiner en sneller, minder mooi (± 20 MB)' },
];

type PiperModule = typeof import('@mintplex-labs/piper-tts-web');
let modulePromise: Promise<PiperModule> | null = null;

/** Pas laden als het nodig is: de bibliotheek is groot en niet iedereen gebruikt ze. */
function lib(): Promise<PiperModule> {
  modulePromise ??= import('@mintplex-labs/piper-tts-web');
  return modulePromise;
}

export function piperSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.storage?.getDirectory && typeof WebAssembly !== 'undefined';
}

export async function storedVoices(): Promise<string[]> {
  if (!piperSupported()) return [];
  try {
    return await (await lib()).stored();
  } catch {
    return [];
  }
}

/**
 * Downloadt een stem door er meteen een sessie mee te maken. Bewust niet via tts.download():
 * die wacht niet tot het bestand volledig bewaard is, waardoor de eerste zin een half model leest.
 */
export async function downloadVoice(id: PiperVoiceId, onProgress: (fraction: number) => void): Promise<void> {
  resetSession();
  await getSession(id, (p) => {
    if (p.url.endsWith('.onnx') && p.total > 0) onProgress(p.loaded / p.total);
  });
}

/** Een onvolledig bewaard model (bv. tablet viel uit tijdens het downloaden) herkennen en opruimen. */
export class BrokenVoiceError extends Error {}

export async function removeVoice(id: PiperVoiceId): Promise<void> {
  const tts = await lib();
  await tts.remove(id);
  cache.clear();
  if (currentVoice === id) resetSession();
}

let currentVoice: PiperVoiceId | null = null;
let session: import('@mintplex-labs/piper-tts-web').TtsSession | null = null;

function resetSession(): void {
  session = null;
  currentVoice = null;
}

async function getSession(id: PiperVoiceId, progress?: ProgressCallback) {
  const tts = await lib();
  if (session && currentVoice === id) return session;
  // De bibliotheek hergebruikt standaard één sessie, ook voor een andere stem: die dan eerst loslaten.
  tts.TtsSession._instance = null;
  try {
    session = await tts.TtsSession.create({ voiceId: id, progress });
  } catch (err) {
    tts.TtsSession._instance = null;
    resetSession();
    const message = err instanceof Error ? err.message : String(err);
    if (/protobuf|graph/i.test(message)) {
      await tts.remove(id).catch(() => {});
      throw new BrokenVoiceError(message);
    }
    throw err;
  }
  currentVoice = id;
  return session;
}

/** Kleine cache, zodat "nog eens voorlezen" meteen gaat. */
const cache = new Map<string, Blob>();
const CACHE_MAX = 40;

/** Eén zin tegelijk: het rekenmodel kan niet twee zinnen tegelijk maken. */
let queue: Promise<unknown> = Promise.resolve();

export function synthesize(text: string, id: PiperVoiceId): Promise<Blob> {
  const run = queue.then(() => synthesizeNow(text, id));
  queue = run.catch(() => undefined);
  return run;
}

async function synthesizeNow(text: string, id: PiperVoiceId): Promise<Blob> {
  const spoken = toSpeech(text);
  const key = `${id}|${spoken}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const s = await getSession(id);
  const wav = await s.predict(spoken);
  cache.set(key, wav);
  if (cache.size > CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  return wav;
}

let currentAudio: HTMLAudioElement | null = null;

/**
 * Speelt af. "pitch" versnelt de weergave zonder de toonhoogte te bewaren: zo klinkt de stem hoger
 * (en een klein beetje sneller), zoals iemand die een hoog stemmetje opzet.
 */
export function playWav(wav: Blob, pitch = 1): Promise<void> {
  stopPiper();
  const url = URL.createObjectURL(wav);
  const audio = new Audio(url);
  audio.preservesPitch = false;
  audio.playbackRate = pitch;
  currentAudio = audio;
  return new Promise<void>((resolve) => {
    const done = (): void => {
      URL.revokeObjectURL(url);
      if (currentAudio === audio) currentAudio = null;
      resolve();
    };
    audio.onended = done;
    audio.onerror = done;
    audio.onpause = done;
    audio.play().catch(done);
  });
}

export function stopPiper(): void {
  currentAudio?.pause();
  currentAudio = null;
}
