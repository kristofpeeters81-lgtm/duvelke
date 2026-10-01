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
  | 'einde'
  | 'tijd'
  | 'bemoeien'
  | 'schat-gewonnen'
  | 'schat-verloren'
  | 'ontmaskerd'
  | 'winnaar'
  | 'machien';

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
  { id: 'bemoeien', label: 'Tussendoor moeien', emoji: '🙋', hint: 'Terwijl de groep met een opdracht bezig is.' },
  { id: 'tijd', label: 'De tijd is bijna om', emoji: '⏰', hint: 'Als de timer bijna afloopt.' },
  { id: 'schat-gewonnen', label: 'Schat gewonnen', emoji: '💎', hint: 'De groep haalde minstens de helft.' },
  { id: 'schat-verloren', label: 'Schat verloren', emoji: '😈', hint: "Minder dan de helft: 't Duvelke wint de schat." },
  { id: 'ontmaskerd', label: 'De ontmaskering', emoji: '🎭', hint: '{speler} = wie het Duvelke was.' },
  { id: 'winnaar', label: 'De winnaar', emoji: '🏆', hint: '{speler} = de winnaar van De Test.' },
  {
    id: 'machien',
    label: 'Het machien',
    emoji: '🤖',
    hint: 'Eén keer bij het begin: Windy stelt het machien voor dat alles voorleest wat niet ingesproken is. Enkel als het machien aan staat.',
  },
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
  // Tussendoor moeien
  ['bemoeien', 'Komaan hé zeg, da kan onzen {zoon} zelfs beter!'],
  ['bemoeien', 'Ik zou het anders doen. Maar ik zeg niks hé. Echt niet. Oké, toch een beetje.'],
  ['bemoeien', 'Amai, wat een chaos! Moet ik komen helpen? Nee? Ik kom toch!'],
  ['bemoeien', 'Wie heeft er hier nu weer niet goed geluisterd? Ik kijk naar niemand. Naar iedereen.'],
  ['bemoeien', 'Pas op hé! Ik zag {saboteur} daar net iets raars doen...'],
  ['bemoeien', 'Allee, samenwerken hé! Niet allemaal tegelijk roepen, ik word er zot van.'],
  ['bemoeien', 'Zo een goed team! Bijna zo goed als ik vroeger. Bijna.'],
  ['bemoeien', 'Mijn pruik staat recht van de spanning!'],
  ['bemoeien', 'Niet zeuren, gewoon doen! Dat zeg ik tegen onzen {zoon} ook altijd. Helpt niks.'],
  ['bemoeien', 'Hmm, ik ruik hier sabotage. Of is het de soep? Nee, sabotage!'],

  // De tijd is bijna om
  ['tijd', 'Allee mannekes, de tijd is bijna om hé!'],
  ['tijd', 'Rap rap rap! Nog efkes en het is gedaan!'],
  ['tijd', 'Tik tak, tik tak... ik word er zenuwachtig van, schatjes!'],
  ['tijd', 'Komaan, nog een klein beetje! Onzen {zoon} zou nu al lang opgegeven hebben.'],
  ['tijd', 'Oei oei, de klok! Ik zeg niks, maar... de klok!'],

  // Schat gewonnen
  ['schat-gewonnen', 'Amai, amai! Meer dan de helft van de schat! {saboteur} heeft verloren, en ik ben zo trots dat mijn pruik ervan wiebelt!'],
  ['schat-gewonnen', 'Hoera! De schatkist zit goed vol! Dat vieren we straks met een pannenkoek.'],
  ['schat-gewonnen', "Da's schoon! {saboteur} heeft alles geprobeerd, maar jullie waren slimmer!"],

  // Schat verloren
  ['schat-verloren', 'Oei oei oei... niet eens de helft. {saboteur} lacht zich een bult!'],
  ['schat-verloren', 'Ocharme, de schatkist is bijna leeg. {saboteur} heeft goed gewerkt, en dat vind ik NIET plezant!'],
  ['schat-verloren', 'Allee zeg! {saboteur} wint de schat. Maar wie was het toch?'],

  // De ontmaskering
  ['ontmaskerd', 'Ik wist het! Ik wist het! {speler}! Ik zei het nog tegen de buurvrouw!'],
  ['ontmaskerd', 'Wat?! {speler}?! Dat had ik nooit gedacht. Oké, een klein beetje wel.'],
  ['ontmaskerd', '{speler}! Stiekemerd! Ge moogt u schamen. Maar goed gespeeld hé!'],

  // De winnaar
  ['winnaar', 'Proficiat {speler}! De beste speurder van vandaag! Ik ben zo trots, ik moet ervan wenen.'],
  ['winnaar', 'Hoera voor {speler}! Zo slim, dat hebt ge zeker van mij geleerd.'],
  ['winnaar', '{speler} wint! Dat verdient een dikke knuffel van {windy}. Kom hier!'],

  // Kenzo zijn machien. Nieuwe uitspraken altijd achteraan: de ids (en dus de opnames) hangen aan de volgorde.
  ['machien', 'Ik heb mijn bril weer nergens liggen. Dus de opdrachten laat ik voorlezen door {zoon} zijn machien. Dat heeft hij zelf gemaakt. Van een doos! Ik ben zo trots.'],
  ['machien', 'Ziet ge die doos? Dat is {zoon} zijn machien. Dat leest alles voor wat ik niet kan onthouden. En dat machien liegt nooit, hé. Niet zoals de buurvrouw.'],
  ['machien', 'Als ik efkes geen tijd heb, dan praat {zoon} zijn machien. Luister daar goed naar. Dat ding weet alles, en het heeft alles gezien!'],

  // Meer moeien tijdens de timer (1/10/2026)
  ['bemoeien', 'Allee mannekes, dat kan toch beter hé! Ik geloof in jullie. Een beetje.'],
  ['bemoeien', 'Allee, allee, allee! Onzen {zoon} kan dat zelfs. En die kan nog geen boterham smeren.'],
  ['bemoeien', 'Ik kijk niet hoor. Ik kijk helemaal niet. Oei, wat doet die daar nu?'],
  ['bemoeien', 'Schatjes, is dat nu de bedoeling? Ik vraag het maar hé.'],
  ['bemoeien', 'Hup hup hup! Niet staan dromen. Dat doet onzen {zoon} al genoeg.'],
  ['bemoeien', 'Amai, als ik zo traag was op mijn werk, dan was ik al lang buiten gevlogen.'],
  ['bemoeien', 'Komaan, een beetje pit! Ik heb mijn koffie er speciaal voor laten koud worden.'],
  ['bemoeien', 'Wie is hier aan het treuzelen? Ik noem geen namen. Maar {saboteur} misschien?'],
  ['bemoeien', 'Oei oei oei, ik kan er niet naar kijken. Ik kijk toch.'],
  ['bemoeien', 'Dat is al heel goed. Bijna. Een klein beetje. Allee, ge zijt bezig hé.'],
  ['bemoeien', 'Samen hé! Niet ieder in zijn eigen hoekje, zoals bij ons aan tafel.'],
  ['bemoeien', 'De buurvrouw zou dat nooit kunnen. Ik wel natuurlijk. Maar ik doe nu niet mee.'],
  ['tijd', 'Allee mannekes, de klok wacht op niemand! Zelfs niet op mij.'],
  ['tijd', 'Nog efkes! Rap rap, voor ik moet beginnen aftellen!'],
  ['tijd', 'Bijna gedaan! Geef alles wat ge hebt, schatjes!'],
];


export const BUILTIN_LINES: BuiltInLine[] = lines.map(([category, text], i) => ({
  id: `w${String(i + 1).padStart(3, '0')}`,
  category,
  text,
}));
