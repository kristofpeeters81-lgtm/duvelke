import type { VoiceSettings } from './types';

export function speechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
}

/**
 * Stemmen laden in Chrome asynchroon: de eerste oproep geeft vaak een lege lijst.
 * Nederlandse stemmen eerst, Belgische (nl-BE) helemaal bovenaan.
 */
export function loadDutchVoices(timeoutMs = 2500): Promise<SpeechSynthesisVoice[]> {
  if (!speechSupported()) return Promise.resolve([]);
  const pick = (): SpeechSynthesisVoice[] =>
    speechSynthesis
      .getVoices()
      .filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith('nl'))
      .sort((a, b) => rankVoice(b) - rankVoice(a) || a.name.localeCompare(b.name));

  const now = pick();
  if (now.length > 0) return Promise.resolve(now);

  return new Promise((resolve) => {
    const done = (): void => {
      speechSynthesis.removeEventListener('voiceschanged', done);
      clearTimeout(timer);
      resolve(pick());
    };
    const timer = setTimeout(done, timeoutMs);
    speechSynthesis.addEventListener('voiceschanged', done);
  });
}

function rankVoice(v: SpeechSynthesisVoice): number {
  const lang = v.lang.toLowerCase().replace('_', '-');
  return (lang === 'nl-be' ? 2 : 0) + (v.localService ? 1 : 0);
}

/** Kempische schrijfwijze omzetten naar iets wat de voorleesstem fatsoenlijk uitspreekt. */
export function toSpeech(text: string): string {
  return text
    .replace(/'k\b/gi, 'ik')
    .replace(/'t\b/gi, 'et')
    .replace(/'s\b/gi, 'es')
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

let voicesCache: SpeechSynthesisVoice[] = [];
let voicesLoaded = false;

/** Spreekt de tekst uit; de belofte wordt ingelost als de zin gedaan is (of mislukt). */
export async function speak(text: string, settings: VoiceSettings): Promise<void> {
  if (!settings.enabled || !speechSupported()) return;
  if (!voicesLoaded) {
    voicesCache = await loadDutchVoices();
    voicesLoaded = true;
  }

  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(toSpeech(text));
  const voice = voicesCache.find((v) => v.voiceURI === settings.voiceURI) ?? voicesCache[0];
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  } else {
    utterance.lang = 'nl-BE';
  }
  utterance.pitch = settings.pitch;
  utterance.rate = settings.rate;

  await new Promise<void>((resolve) => {
    // Vangnet: op sommige toestellen komt 'end' nooit.
    const fallback = setTimeout(resolve, 2000 + text.length * 120);
    const finish = (): void => {
      clearTimeout(fallback);
      resolve();
    };
    utterance.onend = finish;
    utterance.onerror = finish;
    speechSynthesis.speak(utterance);
  });
}

export function stopSpeaking(): void {
  if (speechSupported()) speechSynthesis.cancel();
}
