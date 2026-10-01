/**
 * Eén ingang voor al het voorlezen, in deze volgorde:
 * 1. een zelf ingesproken opname van die uitspraak (als die bestaat),
 * 2. de Vlaamse AI-stem (als die gedownload is),
 * 3. de voorleesstem van het toestel.
 *
 * Met eigen opnames én Kenzo zijn machien aan, leest het machien alles wat niet ingesproken is.
 * Zo klinkt er nooit een AI-stem die doet alsof ze Windy is naast de echte opnames.
 */
import { getRecording } from './db';
import { BrokenVoiceError, piperSupported, playWav, StaleSpeechError, stopPiper, storedVoices, synthesize } from './piper';
import { robotize } from './robot';
import type { VoiceSettings } from './types';
import { speak as speakDevice, stopSpeaking } from './voice';
import { nameRecordingId, recordingParts } from './windy';

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

/** Wie er echt spreekt: Windy (opname of AI-stem), de buurvrouw of Kenzo zijn machien. */
export type Speaker = 'windy' | 'buurvrouw' | 'machien';

/** Is er minstens één uitspraak van Windy zelf ingesproken (namen tellen niet mee)? */
let windyRecorded = false;

function hasWindyRecordings(ids: readonly string[]): boolean {
  return ids.some((id) => !id.startsWith('naam:'));
}

/** De store meldt welke opnames er zijn, zodat speak() weet of het machien meedoet. */
export function setRecordedIds(ids: readonly string[]): void {
  windyRecorded = hasWindyRecordings(ids);
}

/**
 * Leest het machien voor wat niet ingesproken is? Enkel als Windy echt met een opgenomen stem spreekt:
 * zonder één opname blijft de AI-stem gewoon Windy.
 */
export function machineOn(v: VoiceSettings, recordedIds?: readonly string[]): boolean {
  const recorded = recordedIds ? hasWindyRecordings(recordedIds) : windyRecorded;
  return v.enabled && v.useRecordings && v.machine && recorded;
}

export interface SpeakOptions {
  /** Wordt aangeroepen op het moment dat het geluid echt begint, met wie er spreekt. */
  onStart?: (speaker: Speaker) => void;
  /** Id van de uitspraak: dan kan een eigen opname gebruikt worden. */
  lineId?: string;
  /** Andere AI-stem voor deze zin (bv. de buurvrouw). Niet gedownload? Dan de gewone stem, iets lager. */
  voice?: { piperVoice: VoiceSettings['piperVoice']; piperPitch: number };
  /** De uitspraak zoals ze geschreven is (met {speler}), om ingesproken stukjes te vinden. */
  template?: string;
  /** Wie er genoemd wordt: voor de ingesproken naam. */
  playerId?: string;
  /** Altijd het machien laten spreken (om de klank te testen). */
  machine?: boolean;
}

/** Alle ingesproken stukjes van een zin, in volgorde, of null als er één ontbreekt. */
async function recordedPieces(options: SpeakOptions): Promise<Blob[] | null> {
  if (!options.lineId) return null;
  const template = options.template ?? '';
  if (!template.includes('{speler}')) {
    const r = await getRecording(options.lineId);
    return r ? [r.audio] : null;
  }
  if (!options.playerId) return null;
  const parts = recordingParts({ id: options.lineId, text: template });
  if (parts.length === 0) return null;
  const name = await getRecording(nameRecordingId(options.playerId));
  if (!name) return null;
  const before = parts.find((p) => p.id.endsWith(':voor'));
  const after = parts.find((p) => p.id.endsWith(':na'));
  const b = before ? await getRecording(before.id) : undefined;
  const a = after ? await getRecording(after.id) : undefined;
  if ((before && !b) || (after && !a)) return null;
  return [b?.audio, name.audio, a?.audio].filter((x): x is Blob => !!x);
}

export async function speak(text: string, v: VoiceSettings, options: SpeakOptions = {}): Promise<void> {
  if (!v.enabled || text.trim() === '') return;
  const mine = ++token;
  stopPiper();
  stopSpeaking();

  if (v.useRecordings && options.lineId) {
    try {
      const pieces = await recordedPieces(options);
      if (mine !== token) return;
      if (pieces) {
        options.onStart?.(options.voice ? 'buurvrouw' : 'windy');
        for (const piece of pieces) {
          if (mine !== token) return;
          await playWav(piece, 1);
        }
        return;
      }
    } catch (err) {
      console.warn('Opname afspelen mislukt', err);
    }
  }

  if (!options.voice && (options.machine || machineOn(v))) {
    await speakMachine(text, v, mine, options);
    return;
  }

  const speaker: Speaker = options.voice ? 'buurvrouw' : 'windy';
  let chosen = v;
  if (options.voice) {
    const wanted = { ...v, ...options.voice };
    chosen = (await piperReady(wanted)) ? wanted : { ...v, piperPitch: v.piperPitch * 0.85, pitch: v.pitch * 0.85 };
  }

  const ready = await piperReady(chosen);
  if (mine !== token) return;
  if (ready) {
    try {
      const wav = await synthesize(text, chosen.piperVoice, () => mine !== token);
      if (mine !== token) return; // intussen al een nieuwere zin gevraagd
      options.onStart?.(speaker);
      await playWav(wav, chosen.piperPitch);
      return;
    } catch (err) {
      if (err instanceof StaleSpeechError) return;
      if (err instanceof BrokenVoiceError) invalidateStoredVoices();
      console.warn('AI-stem mislukt, terugvallen op de toestelstem', err);
      if (mine !== token) return;
    }
  }
  if (mine !== token) return;
  options.onStart?.(speaker);
  await speakDevice(text, chosen, () => mine !== token);
}

/** Kenzo zijn machien: de AI-stem zonder Windy's hoge toon, door het robot-effect. */
async function speakMachine(text: string, v: VoiceSettings, mine: number, options: SpeakOptions): Promise<void> {
  const ready = await piperReady(v);
  if (mine !== token) return;
  if (ready) {
    try {
      const wav = await synthesize(text, v.piperVoice, () => mine !== token);
      const robot = await robotize(wav, v.machineSound);
      if (mine !== token) return;
      options.onStart?.('machien');
      await playWav(robot, 1);
      return;
    } catch (err) {
      if (err instanceof StaleSpeechError) return;
      if (err instanceof BrokenVoiceError) invalidateStoredVoices();
      console.warn('Machien-stem mislukt, terugvallen op de toestelstem', err);
      if (mine !== token) return;
    }
  }
  if (mine !== token) return;
  options.onStart?.('machien');
  // Toestelstem: laag en vlak, zodat ze toch anders klinkt dan Windy.
  await speakDevice(text, { ...v, pitch: 0.6, rate: 0.95 }, () => mine !== token);
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

/**
 * Een zin alvast klaarmaken (bv. de uitleg van de volgende opdracht), zodat ze meteen klinkt
 * als ze nodig is. Stil: fouten negeren we, voorlezen valt dan gewoon terug op het normale pad.
 */
export async function prefetch(text: string, v: VoiceSettings, isStale?: () => boolean): Promise<void> {
  if (!v.enabled || !text.trim() || !(await piperReady(v))) return;
  try {
    await synthesize(text, v.piperVoice, isStale);
  } catch {
    /* niet erg */
  }
}