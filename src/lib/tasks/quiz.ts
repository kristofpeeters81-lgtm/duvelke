import type { Difficulty } from '../types';

export interface QuizQuestion {
  q: string;
  options: string[];
  /** Index van het juiste antwoord in options. */
  answer: number;
}

export const QUIZ: Record<Difficulty, QuizQuestion[]> = {
  makkelijk: [
    { q: 'Welk dier zegt "boe"?', options: ['Een koe', 'Een kat', 'Een eend', 'Een schaap'], answer: 0 },
    { q: 'Hoeveel poten heeft een spin?', options: ['6', '8', '4', '10'], answer: 1 },
    { q: 'Welke kleur krijg je als je blauw en geel mengt?', options: ['Paars', 'Oranje', 'Groen', 'Bruin'], answer: 2 },
    { q: 'Wat eet een konijn het liefst?', options: ['Vis', 'Wortels', 'Snoep', 'Vlees'], answer: 1 },
    { q: 'Hoeveel dagen heeft een week?', options: ['5', '6', '7', '8'], answer: 2 },
    { q: 'Welk seizoen komt na de winter?', options: ['Herfst', 'Zomer', 'Lente', 'Winter'], answer: 2 },
    { q: 'Wat is de hoofdstad van België?', options: ['Antwerpen', 'Brussel', 'Gent', 'Brugge'], answer: 1 },
    { q: 'Welk dier is het grootste?', options: ['Olifant', 'Muis', 'Walvis', 'Paard'], answer: 2 },
    { q: 'Waar woont een pinguïn?', options: ['In de woestijn', 'Op de Zuidpool', 'In het regenwoud', 'In de Kempen'], answer: 1 },
    { q: 'Hoeveel is 5 + 5?', options: ['10', '11', '55', '9'], answer: 0 },
    { q: 'Welke vrucht is geel en krom?', options: ['Appel', 'Peer', 'Banaan', 'Kers'], answer: 2 },
    { q: 'Wat heeft een vlinder eerst geweest?', options: ['Een vogel', 'Een rups', 'Een vis', 'Een bij'], answer: 1 },
    { q: 'Welke kleur heeft een ijsbeer?', options: ['Bruin', 'Zwart', 'Wit', 'Grijs'], answer: 2 },
    { q: 'Wat gebruik je om soep te eten?', options: ['Een vork', 'Een mes', 'Een lepel', 'Een rietje'], answer: 2 },
    { q: 'Hoeveel wielen heeft een fiets?', options: ['1', '2', '3', '4'], answer: 1 },
  ],
  normaal: [
    { q: 'Welke planeet staat het dichtst bij de zon?', options: ['Mars', 'Venus', 'Mercurius', 'Aarde'], answer: 2 },
    { q: 'Hoeveel provincies heeft België?', options: ['8', '9', '10', '12'], answer: 2 },
    { q: 'Wat is het grootste land ter wereld?', options: ['China', 'Rusland', 'Canada', 'Brazilië'], answer: 1 },
    { q: 'Hoeveel minuten zitten er in een uur?', options: ['30', '60', '100', '120'], answer: 1 },
    { q: 'Welk dier kan het snelst lopen?', options: ['Leeuw', 'Paard', 'Jachtluipaard', 'Struisvogel'], answer: 2 },
    { q: 'In welke provincie liggen de Kempen vooral?', options: ['Limburg en Antwerpen', 'West-Vlaanderen', 'Henegouwen', 'Luik'], answer: 0 },
    { q: 'Hoe heet het hoogste gebergte ter wereld?', options: ['De Alpen', 'De Pyreneeën', 'De Himalaya', 'De Ardennen'], answer: 2 },
    { q: 'Wat is 7 × 8?', options: ['54', '56', '58', '64'], answer: 1 },
    { q: 'Welk dier is een zoogdier?', options: ['Haai', 'Dolfijn', 'Krokodil', 'Pinguïn'], answer: 1 },
    { q: 'Uit welk land komen de Smurfen oorspronkelijk?', options: ['Frankrijk', 'Nederland', 'België', 'Duitsland'], answer: 2 },
    { q: 'Hoeveel botten heeft een volwassen mens ongeveer?', options: ['106', '206', '306', '56'], answer: 1 },
    { q: 'Wat meet een thermometer?', options: ['Gewicht', 'Temperatuur', 'Lengte', 'Tijd'], answer: 1 },
    { q: 'Welke kleur hebben de sterren op de vlag van Europa?', options: ['Wit', 'Rood', 'Geel', 'Blauw'], answer: 2 },
    { q: 'Wat is de langste rivier van België?', options: ['De Schelde', 'De Maas', 'De Leie', 'De Nete'], answer: 1 },
    { q: 'Hoeveel spelers staan er per ploeg op het veld bij voetbal?', options: ['9', '10', '11', '12'], answer: 2 },
    { q: 'Wie schilderde de Mona Lisa?', options: ['Rubens', 'Van Gogh', 'Leonardo da Vinci', 'Magritte'], answer: 2 },
    { q: 'Welk gas ademen wij in om te leven?', options: ['Zuurstof', 'Helium', 'Koolstofdioxide', 'Stikstof'], answer: 0 },
    { q: 'Hoeveel poten heeft een insect?', options: ['4', '6', '8', '10'], answer: 1 },
  ],
  pittig: [
    { q: 'Wat is de hoofdstad van Australië?', options: ['Sydney', 'Melbourne', 'Canberra', 'Perth'], answer: 2 },
    { q: 'Welk element heeft het symbool "O"?', options: ['Goud', 'Zuurstof', 'IJzer', 'Osmium'], answer: 1 },
    { q: 'In welk jaar werd België onafhankelijk?', options: ['1815', '1830', '1914', '1789'], answer: 1 },
    { q: 'Hoeveel harten heeft een octopus?', options: ['1', '2', '3', '8'], answer: 2 },
    { q: 'Wat is de snelheid van het licht ongeveer?', options: ['300 km per seconde', '300.000 km per seconde', '3.000 km per uur', '30 km per seconde'], answer: 1 },
    { q: 'Welke oceaan is de grootste?', options: ['Atlantische', 'Indische', 'Stille', 'Noordelijke IJszee'], answer: 2 },
    { q: 'Hoeveel kanten heeft een zeshoek plus een achthoek samen?', options: ['12', '14', '16', '48'], answer: 1 },
    { q: 'Welke Belg bedacht de saxofoon?', options: ['Adolphe Sax', 'Hergé', 'Jacques Brel', 'Eddy Merckx'], answer: 0 },
    { q: 'Wat is het kleinste priemgetal?', options: ['0', '1', '2', '3'], answer: 2 },
    { q: 'Welk dier slaapt staand?', options: ['Kat', 'Paard', 'Hond', 'Konijn'], answer: 1 },
    { q: 'Hoeveel tijdzones heeft Rusland ongeveer?', options: ['3', '7', '11', '24'], answer: 2 },
    { q: 'Welke stripheld woont in Moulinsart (Molensloot)?', options: ['Suske', 'Kuifje', 'Nero', 'Jommeke'], answer: 1 },
    { q: 'Wat is 15% van 200?', options: ['15', '20', '30', '45'], answer: 2 },
    { q: 'Waaruit bestaat een diamant?', options: ['Glas', 'Koolstof', 'Kwarts', 'Zout'], answer: 1 },
    { q: 'Hoeveel keer klopt een hart ongeveer per minuut (in rust)?', options: ['10', '70', '200', '500'], answer: 1 },
  ],
};

/** Algemene speurderstips: ze zien er even geheim uit als sabotagetips. */
export const DETECTIVE_TIPS: string[] = [
  'Let op wie als eerste een fout antwoord roept en heel zeker klinkt.',
  'Kijk wie er traag doet als het snel moet gaan.',
  'Onthoud wie er vaak "per ongeluk" iets laat vallen.',
  'Let op wie de groep de verkeerde kant op stuurt.',
  'Kijk wie er veel praat maar weinig doet.',
  'Wie lacht er als het mislukt? Verdacht!',
  'Let op wie er twijfelt aan een antwoord dat eigenlijk juist is.',
  'Kijk naar de handen: wie raakt dingen aan die niet mogen?',
  'Onthoud wie er bij deze opdracht de leiding wil nemen.',
  'Let op wie er net iets te vroeg of te laat reageert.',
  'Wie geeft er "handig" advies dat niet werkt?',
  'Kijk wie er stil wordt als iemand de saboteur zoekt.',
  'Let op wie er dingen vergeet die eigenlijk makkelijk zijn.',
  'Kijk wie er steeds op de verkeerde plek staat.',
  'Let op wie er andere mensen afleidt met grapjes.',
];
