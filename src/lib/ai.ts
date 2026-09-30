/**
 * Nieuwe opdrachten laten bedenken door een AI.
 * Optie A: de vraag kopiëren naar een gratis chatbot en het antwoord terugplakken (werkt altijd, geen sleutel).
 * Optie B: rechtstreeks via een gratis Google Gemini-sleutel.
 * In beide gevallen controleert validateTask() alles en keurt de spelleider elke opdracht goed.
 */
import { LOCATIONS } from './data/locations';
import { SUPPLIES } from './data/supplies';
import type { CustomSupply, Difficulty, LocationId } from './types';

export interface PromptOptions {
  count: number;
  locations: LocationId[];
  difficulty: Difficulty;
  playerCount: number;
  supplies: string[];
  customSupplies: CustomSupply[];
  theme: string;
  saboteurName: string;
  hostName: string;
  /** Titels die al bestaan, zodat de AI niet hetzelfde verzint. */
  existingTitles: string[];
}

const AGE: Record<Difficulty, string> = {
  makkelijk: 'kinderen van 6 tot 8 jaar',
  normaal: 'kinderen van 9 tot 12 jaar',
  pittig: 'tieners en volwassenen',
};

export function buildPrompt(o: PromptOptions): string {
  const locs = LOCATIONS.filter((l) => o.locations.includes(l.id)).map((l) => `"${l.id}" (${l.label})`);
  const supplies = [
    ...SUPPLIES.filter((s) => o.supplies.includes(s.id)).map((s) => `"${s.id}" (${s.label})`),
    ...o.customSupplies.filter((c) => o.supplies.includes(c.id)).map((c) => `"${c.id}" (${c.label})`),
  ];
  const example = {
    title: 'De ballonnenbrug',
    emoji: '🎈',
    category: 'samenwerken',
    locations: [o.locations[0] ?? 'binnen'],
    supplies: [],
    minPlayers: 3,
    minutes: 6,
    timer: 180,
    difficulties: ['makkelijk', 'normaal', 'pittig'],
    explain: 'Leg uit wat de groep moet doen, in 2 tot 4 zinnen. Gebruik {doel} voor een getal dat per moeilijkheid verschilt.',
    vars: { doel: { makkelijk: [3], normaal: [5], pittig: [8] } },
    scoring: { type: 'aantal', target: '{doel}', unit: 'keer' },
    sabotage: ['Een stiekeme, veilige sabotagetip.', 'Nog een tip.', 'En nog een.'],
    photo: 'Idee voor een leuke bewijsfoto.',
    dilemma: false,
  };
  return [
    `Je bent een creatieve spelontwerper. Bedenk ${o.count} NIEUWE, originele groepsopdrachten voor het spel "Wie is ${o.saboteurName}?", een spel zoals "Wie is de Mol?" voor ${AGE[o.difficulty]} (${o.playerCount} spelers).`,
    `De hele groep werkt samen om edelstenen te verdienen. Eén speler is stiekem ${o.saboteurName}: die probeert de opdracht te laten mislukken zonder op te vallen. De presentatrice heet ${o.hostName}.`,
    '',
    'REGELS:',
    `- Plekken (kies per opdracht uit deze ids): ${locs.join(', ')}.`,
    supplies.length > 0
      ? `- Benodigdheden die beschikbaar zijn (gebruik ENKEL deze ids, of geen): ${supplies.join(', ')}.`
      : '- Er zijn geen speciale benodigdheden: gebruik supplies: [].',
    '- Veilig: niets vies of nat, geen water, geen vuur, geen messen, niet duwen of trekken, niets kapotmaken. Op straat, in het dorp, bos of strand blijft de groep bij een volwassene.',
    '- Sabotagetips (3 of 4): stiekem, subtiel en VEILIG, in de je-vorm.',
    '- Geen wedstrijd tussen kinderen: de groep werkt samen tegen de tijd of voor een doel.',
    '- category is één van: zoeken, raadsels, samenwerken, geheugen, behendigheid, creatief, communicatie, tijdsdruk, speuren, foto, beweging.',
    '- scoring is {"type":"gelukt"} of {"type":"aantal","target":<getal of "{variabele}">,"unit":"..."}.',
    '- Elke {variabele} in explain moet in vars staan, met waarden voor makkelijk, normaal en pittig.',
    '- Taal: Vlaams Nederlands, grappig en duidelijk om voor te lezen.',
    o.theme.trim() ? `- Thema: ${o.theme.trim()}.` : '',
    o.existingTitles.length > 0 ? `- Deze bestaan al, bedenk iets anders: ${o.existingTitles.slice(0, 60).join('; ')}.` : '',
    '',
    `Antwoord ENKEL met een JSON-lijst van ${o.count} opdrachten in een \`\`\`json-codeblok, in exact dit formaat:`,
    '```json',
    JSON.stringify([example], null, 2),
    '```',
  ]
    .filter((line) => line !== '')
    .join('\n');
}

/** Modellen van het gratis Gemini-aanbod, in volgorde van voorkeur. Namen wijzigen soms: dan de volgende proberen. */
export const GEMINI_MODELS = ['gemini-3-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash'];

export class AiError extends Error {}

export async function askGemini(key: string, prompt: string, preferredModel?: string): Promise<{ text: string; model: string }> {
  if (!navigator.onLine) throw new AiError('Er is geen internet. De AI werkt enkel online; het spel zelf niet.');
  const models = preferredModel ? [preferredModel, ...GEMINI_MODELS.filter((m) => m !== preferredModel)] : GEMINI_MODELS;
  let lastError = 'Onbekende fout.';
  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 1, responseMimeType: 'application/json' },
        }),
      });
    } catch {
      throw new AiError('Geen verbinding met Google. Controleer het internet.');
    }
    if (res.status === 404) {
      lastError = `Model ${model} bestaat niet (meer).`;
      continue;
    }
    if (res.status === 400 || res.status === 403) throw new AiError('De sleutel werkt niet. Kijk na of je hem volledig gekopieerd hebt.');
    if (res.status === 429) throw new AiError('Even te veel gevraagd (gratis limiet). Wacht een minuutje en probeer opnieuw.');
    if (!res.ok) {
      lastError = `Google gaf fout ${res.status}.`;
      continue;
    }
    const data: unknown = await res.json();
    const text = (data as { candidates?: { content?: { parts?: { text?: string }[] } }[] })?.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? '')
      .join('');
    if (text) return { text, model };
    lastError = 'De AI gaf een leeg antwoord.';
  }
  throw new AiError(lastError);
}
