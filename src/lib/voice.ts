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

/**
 * Uitspraaklijst: woorden die de voorleesstem anders letter per letter spelt.
 * Woorden zonder klinker ("Psst", "Hmm") spelt ze als afkorting; die vervangen of weglaten.
 */
const PRONUNCIATION: [RegExp, string][] = [
  [/\bp+s+t+\b[.!…]*/gi, ''], // Psst... → gefluister, niet voorlezen
  [/\bs{2,}t*\b[.!…]*/gi, ''], // Sssst
  [/\bsh+t?\b[.!…]*/gi, ''], // Shh
  [/\bhm+\b/gi, 'hum'],
  [/\bmm+\b/gi, 'mjam'],
  [/\bpf+t?\b/gi, 'poeh'],
  [/\bbr{2,}\b/gi, 'boe'],
  [/\bgr{2,}\b/gi, 'grom'],
  [/\btsk\b/gi, 'tja'],
  [/'k\b/gi, 'ik'],
  [/'t\b/gi, 'et'],
  [/'s\b/gi, 'es'],
];

/** Kempische schrijfwijze omzetten naar iets wat de voorleesstem fatsoenlijk uitspreekt. */
export function toSpeech(text: string): string {
  let out = text.replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, '');
  for (const [pattern, replacement] of PRONUNCIATION) out = out.replace(pattern, replacement);
  return (
    out
      // WOORDEN IN HOOFDLETTERS worden anders als afkorting gespeld: gewoon schrijven.
      .replace(/\b\p{Lu}{2,}\b/gu, (w) => w.charAt(0) + w.slice(1).toLocaleLowerCase('nl-BE'))
      // Beletseltekens als korte pauze
      .replace(/\.{2,}|…/g, ', ')
      .replace(/\s+([,.!?])/g, '$1')
      .replace(/^[\s,.!?]+/, '')
      .replace(/,\s*,/g, ',')
      .replace(/\s+/g, ' ')
      .trim()
  );
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
