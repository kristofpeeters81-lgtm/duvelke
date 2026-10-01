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

/** Tijdwoorden na 's: "'s morgens" zeg je als "smorgens", niet als "es morgens". */
const S_TIMES = 'morgens|middags|avonds|nachts|ochtends|namiddags|zondags|maandags|dinsdags|woensdags|donderdags|vrijdags|zaterdags|winters|zomers';

/**
 * Uitspraaklijst: woorden die de voorleesstem anders letter per letter spelt of verkeerd beklemtoont.
 * Woorden zonder klinker ("Psst", "Hmm") spelt ze als afkorting; die vervangen of weglaten.
 * De Kempische schrijfwijzen zijn nagemeten met de klanken die de stem echt maakt (espeak-ng, Nederlands).
 */
const PRONUNCIATION: [RegExp, string][] = [
  [/[’‘]/g, "'"], // gekrulde apostrof als gewone
  [new RegExp(String.raw`(?<!\p{L})'s (${S_TIMES})\b`, 'giu'), 's$1'],
  [/(\p{L})'s\b/gu, '$1s'], // Windy's, da's, foto's: geen losse "es"
  // Kempische verkleinwoorden: de stem legt de klemtoon op "-eeke" en "-kès".
  [/(?<=[bcdfghjklmnpqrstvwxz])eke\b/gi, 'ekke'], // schatteke → SCHAT-tekke
  [/(?<=[bcdfghjklmnpqrstvwxz])ekes\b/gi, 'ekkus'], // mannekes
  [/(?<=\p{L}{2})kes\b/giu, 'kus'], // efkes, zakdoekskes, Duvelkes
  [/\bne\b/gi, 'nen'], // "kom ne keer": anders "nee keer"
  [/\bonzen\b/gi, 'onzn'], // onzen Kenzo: klemtoon vooraan
  [/\bp+s+t+\b[.!…]*/gi, ''], // Psst... → gefluister, niet voorlezen
  [/\bs{2,}t*\b[.!…]*/gi, ''], // Sssst
  [/\bsh+t?\b[.!…]*/gi, ''], // Shh
  [/\bhm+\b/gi, 'hum'],
  [/\bmm+\b/gi, 'mjam'],
  [/\bpf+t?\b/gi, 'poeh'],
  [/\bbr{2,}\b/gi, 'boe'],
  [/\bgr{2,}\b/gi, 'grom'],
  [/\btsk\b/gi, 'tja'],
  [/(?<!\p{L})'k\b/giu, 'ik'],
  [/(?<!\p{L})'t\b/giu, 'et'],
  [/(?<!\p{L})'s\b/giu, 'es'],
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
export async function speak(text: string, settings: VoiceSettings, isStale?: () => boolean): Promise<void> {
  if (!settings.enabled || !speechSupported()) return;
  if (!voicesLoaded) {
    voicesCache = await loadDutchVoices();
    voicesLoaded = true;
  }
  // Stemmen laden kan even duren: is de zin intussen niet meer nodig, dan niet meer uitspreken.
  if (isStale?.()) return;

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
