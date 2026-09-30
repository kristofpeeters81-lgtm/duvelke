/**
 * Windy's ingebouwde uitspraken. Allemaal eigen tekst, geïnspireerd op de toon van
 * een bemoeizieke Vlaamse moeder, nooit letterlijke citaten van een bestaand typetje.
 *
 * Plaatshouders: {saboteur}, {zoon}, {windy}, {speler}
 */

export type LineCategory =
  | 'intro'
  | 'rollen'
  | 'doorgeven'
  | 'aankondiging'
  | 'gelukt'
  | 'mislukt'
  | 'roddel'
  | 'zoon'
  | 'wijsheid'
  | 'einde';

export const LINE_CATEGORIES: { id: LineCategory; label: string; emoji: string; hint: string }[] = [
  { id: 'intro', label: 'Begin van het spel', emoji: '👋', hint: 'Als Windy binnenstormt.' },
  { id: 'rollen', label: 'Geheime dossiers', emoji: '🗂️', hint: 'Vlak voor iedereen zijn rol krijgt.' },
  { id: 'doorgeven', label: 'Tablet doorgeven', emoji: '🤲', hint: 'Als de tablet naar de volgende gaat. {speler} = wie de tablet krijgt.' },
  { id: 'aankondiging', label: 'Nieuwe opdracht', emoji: '📣', hint: 'Voor elke opdracht.' },
  { id: 'gelukt', label: 'Opdracht gelukt', emoji: '🎉', hint: 'Als het goed ging.' },
  { id: 'mislukt', label: 'Opdracht mislukt', emoji: '😬', hint: 'Als het slecht ging.' },
  { id: 'roddel', label: 'Begin van een roddel', emoji: '🤫', hint: 'Daarna volgt de roddel zelf.' },
  { id: 'zoon', label: 'Over haar zoon', emoji: '🧢', hint: 'Klagen over {zoon}.' },
  { id: 'wijsheid', label: 'Levenswijsheden', emoji: '🧠', hint: 'Tussendoor, zomaar.' },
  { id: 'einde', label: 'Einde van het spel', emoji: '🏁', hint: 'Voor de test en de onthulling.' },
];

export interface BuiltInLine {
  id: string;
  category: LineCategory;
  text: string;
}

const lines: [LineCategory, string][] = [
  // Begin
  ['intro', "Hallooo schatjes! 't Is hier {windy}! Ik kom efkes kijken of ge alles goed doet. Ik zeg niks hé. Maar ik kijk wel."],
  ['intro', 'Amai, wat een volk! Zijn jullie er klaar voor? Ik heb speciaal mijn schoonste trui aangedaan. Van de solden, maar dat moet niemand weten.'],
  ['intro', "Luister ne keer goed. Iemand van jullie is {saboteur}. Die gaat alles proberen te verknoeien. Wreed stout! Ik zou dat nooit doen. Nooit!"],
  ['intro', "Ik heb onzen {zoon} ook gevraagd om mee te spelen. Maar die lag nog in zijn bed. Om drie uur 's middags! Ocharme."],
  ['intro', 'Oei, is mijn haar goed? Zit het recht? Zeg het maar eerlijk hé. Nee, zeg het toch maar niet.'],
  ['intro', 'Welkom, welkom! Schoenen uit, jas aan de kapstok, en geen gezever. Het spel gaat beginnen!'],

  // Geheime dossiers
  ['rollen', 'Nu wordt het spannend! Iedereen krijgt een geheim dossier. Niet spieken hé, ik zie alles!'],
  ['rollen', "Hou de tablet goed tegen u aan, zodat niemand meekijkt. Ook ik niet. Ik kijk niet. Oké, een klein beetje."],
  ['rollen', 'Geheim is geheim, schatteke. Wat ge ziet, vertelt ge aan niemand. Zelfs niet aan uw mama. Zeker niet aan uw mama!'],
  ['rollen', 'En niet giechelen als ge uw dossier leest! Giechelen is verdacht. Dat weet iedereen.'],

  // Tablet doorgeven
  ['doorgeven', 'Allee, geef de tablet maar aan {speler}. Voorzichtig hé, die is nog niet afbetaald.'],
  ['doorgeven', '{speler}, uw beurt! Goed vasthouden en niet laten vallen.'],
  ['doorgeven', 'Hup, naar {speler} ermee! En de rest: ogen dicht of wegkijken!'],
  ['doorgeven', "{speler}, kom ne keer hier schatteke. 't Is uw beurt."],
  ['doorgeven', 'Volgende! {speler}, ik heb op u gewacht. Echt waar.'],

  // Nieuwe opdracht
  ['aankondiging', "Allee, een nieuwe opdracht! En ik wil geen gezaag horen, verstaan?"],
  ['aankondiging', 'Dit is een makkelijke. Zelfs onzen {zoon} zou dat kunnen. Als hij zijn gsm efkes weglegt.'],
  ['aankondiging', 'Eerst efkes diep ademhalen. In... en uit. Goed zo. Zo doe ik dat ook als de was niet droogt.'],
  ['aankondiging', "Doe uw best, maar niet te hard hé. Straks zweet ge nog en dan moet alles in de was."],
  ['aankondiging', 'Goed luisteren nu. Ik ga het maar één keer zeggen. Oké, misschien twee keer. Drie keer als het moet.'],
  ['aankondiging', "Opgelet! {saboteur} zit misschien al klaar om alles te verpesten. Ogen open!"],

  // Gelukt
  ['gelukt', 'Amai! Da\'s schoon! Ik ben zo trots, ik zou bijna wenen. Waar zijn mijn zakdoekskes?'],
  ['gelukt', 'Zie je wel! Als ge luistert naar {windy}, komt alles goed.'],
  ['gelukt', 'Keigoed! Dat ga ik straks aan de buurvrouw vertellen. Die gaat jaloers zijn.'],
  ['gelukt', "Proficiat! Dat verdient een pannenkoek. Of twee. 't Is feest!"],
  ['gelukt', 'Hoera! Zelfs {saboteur} kon dit niet tegenhouden. Of toch? Hmm...'],

  // Mislukt
  ['mislukt', "Oei oei oei. Da's nu niet bepaald gelukt hé. Maar ik zeg niks."],
  ['mislukt', 'Allee, wat was dat nu? Ik heb al beter gezien. Van onzen {zoon}. En die doet nooit iets.'],
  ['mislukt', 'Geeft niks, schatjes. Morgen is er weer een dag. Of seffens. Seffens is ook goed.'],
  ['mislukt', 'Hmm. Ik ruik hier iets. En het is niet mijn soep. Ik denk dat {saboteur} weer bezig is geweest!'],
  ['mislukt', 'Ocharme toch. Dat was een ramp. Een schone ramp, dat wel.'],

  // Roddel
  ['roddel', 'Psst... kom ne keer dichter. Ik heb iets gehoord...'],
  ['roddel', "Ik wil niet roddelen hé. Echt niet. Maar..."],
  ['roddel', 'Ge hebt dit niet van mij. Maar...'],
  ['roddel', 'Zeg, weet ge wat ik daarnet zag? Hou u vast...'],

  // Over de zoon
  ['zoon', 'Onzen {zoon} zegt dat ik overdrijf. Ik overdrijf NOOIT. Nooit nooit nooit!'],
  ['zoon', 'Onzen {zoon} heeft gisteren zijn kamer opgeruimd. Grapje! Hahaha. Nee serieus, dat gebeurt nooit.'],
  ['zoon', 'Als onzen {zoon} zo goed zou meewerken als jullie, dan zat ik nu op een terraske.'],
  ['zoon', "Onzen {zoon} zei vanmorgen 'goeiemorgen' tegen mij. Ik ben er nog niet goed van."],
  ['zoon', 'Ik vroeg aan onzen {zoon} of hij wilde helpen. Hij deed zijn koptelefoon op. Sympathiek hé.'],

  // Wijsheden
  ['wijsheid', 'Een goede speurder kijkt met zijn ogen, luistert met zijn oren en zwijgt met zijn mond. Dat laatste lukt mij nooit.'],
  ['wijsheid', 'Vertrouw niemand. Behalve {windy}. {windy} is te vertrouwen. Meestal.'],
  ['wijsheid', 'Wie het hardst roept dat hij onschuldig is... die heeft misschien iets te verbergen!'],
  ['wijsheid', 'In mijn tijd hadden we geen tablets. Toen speelden we met een stok. En we waren content!'],
  ['wijsheid', 'Een beetje stress is gezond. Veel stress is ook gezond. Zegt men. Ik weet het niet, ik ben geen dokter.'],

  // Einde
  ['einde', 'Het moment van de waarheid! Ik sta hier te bibberen in mijn trui.'],
  ['einde', 'Wat een dag, wat een dag. Ik ga seffens efkes platliggen.'],
  ['einde', 'Straks weten we het. Wie is {saboteur}? Ik heb zo mijn vermoedens. Maar ik zeg niks.'],
];

export const BUILTIN_LINES: BuiltInLine[] = lines.map(([category, text], i) => ({
  id: `w${String(i + 1).padStart(3, '0')}`,
  category,
  text,
}));
