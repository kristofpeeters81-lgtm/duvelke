/**
 * Eén ingang voor al het voorlezen, in deze volgorde:
 * 1. een zelf ingesproken opname van die uitspraak (als die bestaat),
 * 2. de Vlaamse AI-stem (als die gedownload is),
 * 3. de voorleesstem van het toestel.
 */
import { getRecording } from './db';
import { BrokenVoiceError, piperSupported, playWav, stopPiper, storedVoices, synthesize } from './piper';
import type { VoiceSettings } from './types';
import { speak as speakDevice, stopSpeaking } from './voice';

let token = 0;
let storedCache: string[] | null = null;

export function invalidateStoredVoices(): void {
  storedCache = null;
}

async function piperReady(v: VoiceSettings): Promise<boolean> {
  if (v.engine !== 'piper' || !piperSupported()) return false;
  storedCache ??= await storedVoices();
  return storedCache.includes(v.piperVoice);
}

export interface SpeakOptions {
  /** Wordt aangeroepen op het moment dat het geluid echt begint. */
  onStart?: () => void;
  /** Id van de uitspraak: dan kan een eigen opname gebruikt worden. */
  lineId?: string;
}

export async function speak(text: string, v: VoiceSettings, options: SpeakOptions = {}): Promise<void> {
  if (!v.enabled || text.trim() === '') return;
  const mine = ++token;
  stopPiper();
  stopSpeaking();

  if (v.useRecordings && options.lineId) {
    try {
      const recording = await getRecording(options.lineId);
      if (mine !== token) return;
      if (recording) {
        options.onStart?.();
        await playWav(recording.audio, 1);
        return;
      }
    } catch (err) {
      console.warn('Opname afspelen mislukt', err);
    }
  }

  if (await piperReady(v)) {
    try {
      const wav = await synthesize(text, v.piperVoice);
      if (mine !== token) return; // intussen al een nieuwere zin gevraagd
      options.onStart?.();
      await playWav(wav, v.piperPitch);
      return;
    } catch (err) {
      if (err instanceof BrokenVoiceError) invalidateStoredVoices();
      console.warn('AI-stem mislukt, terugvallen op de toestelstem', err);
      if (mine !== token) return;
    }
  }
  options.onStart?.();
  await speakDevice(text, v);
}

export function stopAll(): void {
  token++;
  stopPiper();
  stopSpeaking();
}

/** Laadt het stemmodel alvast, zodat de eerste zin in het spel niet lang op zich laat wachten. */
export async function warmUp(v: VoiceSettings): Promise<void> {
  if (!v.enabled || !(await piperReady(v))) return;
  try {
    await synthesize('Hallo.', v.piperVoice);
  } catch {
    invalidateStoredVoices();
  }
}
