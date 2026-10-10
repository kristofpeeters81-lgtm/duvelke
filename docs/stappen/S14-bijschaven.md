# S14 · Bijschaven na het proefspel 🔄

**Tegen:** 28/10

## Wat
De bevindingen uit [S13](S13-proefspel.md) oplossen. Elke fix krijgt een eigen commit, en wordt pas gepusht als de tests slagen. Pas de handleiding en het uitlegscherm mee aan.

## Bevindingen

### Ronde 1 (eerste test-spel, 30/09) ✅ 1/10
| # | Bevinding | Oplossing | Commit |
|---|---|---|---|
| 1 | De AI-stem zegt "Schatteeke" en "ES morgens" | Uitspraaklijst in `voice.ts`: "'s morgens" → "smorgens", "da's"/"Windy's" zonder losse "es", gekrulde apostrof, en Kempische verkleinwoorden (-eke, -kes), "ne", "onzen". Schrijfwijzen nagemeten met de klanken die de stem echt maakt (espeak-ng, Nederlands). | 900ae6b |
| 2 | Sabotagetips breken soms de regels of vallen op (bv. "en toen" bij het één-woord-verhaal: twee woorden, en wie het steeds zegt, verraadt zich) | Alle ±900 tips nagekeken op 4 eisen: past in de regels, valt niet op bij herhalen, haalbaar voor een kind, veilig. ±370 herschreven of vervangen. Dezelfde eisen in de AI-prompt en de opdrachteditor. | 6a6c3c6 |
| 3 | Speurderstips passen niet bij de opdracht | Elke opdracht heeft eigen speurderstips (`detective`). De 15 algemene tips blijven enkel als reserve voor eigen opdrachten zonder speurderstips. | 6a6c3c6 |
| 4 | Eigen opnames van Windy naast een AI-Windy: het verschil valt op | **Kenzo zijn machien** (zie hieronder). | 5c6cbdb |

### Ronde 2 (1/10) ✅ 1/10
| # | Bevinding | Oplossing |
|---|---|---|
| 5 | Machien-klank: Licht is het beste | Licht is nu de standaard. Een al bewaarde keuze blijft staan: tik op de tablet één keer op Licht. |
| 6 | Het machien kwam nergens tussen | Zo bedoeld: het machien doet pas mee als er minstens één uitspraak van Windy ingesproken is. Met enkel de AI-stem blijft Windy alles zeggen. |
| 7 | Windy mag zich tijdens de timer meer moeien | Ongeveer elke minuut (45 tot 90 s, `meddleMoments` in `gameplay.ts`) in plaats van één keer halverwege. 12 nieuwe bemoei-uitspraken en 3 nieuwe "bijna om"-uitspraken, achteraan toegevoegd. |
| 8 | In De Test kan je niet terug na een verkeerde keuze | **◀ Vorige vraag** (en vanaf "Klaar!"), enkel zolang de tablet bij dezelfde speler is. Het eerder gekozen antwoord is gemarkeerd. |

### Ronde 3 (1/10) ✅ 1/10
| # | Bevinding | Oplossing |
|---|---|---|
| 9 | Te veel pauze tussen de ingesproken naam en de rest van de zin | Gemeten op de echte opnames: tot 1,5 s stilte rond de naam (randstilte van elk stukje + opstarten van elk los geluid). Nu knipt `stitch()` in `wav.ts` bij het afspelen de stilte aan de randen weg en plakt de stukjes met ±0,12 s pauze aan elkaar tot één geluid. Geldt voor alle opnames, ook toekomstige; de bewaarde opnames blijven ongewijzigd. Zinnen met een naam zijn ±2 s korter. |
| 10 | De map `backups/` stond niet in `.gitignore` | Toegevoegd: back-ups bevatten namen en stemopnames en mogen nooit in de publieke repo. |

### Ronde 4 (3/10) ✅ 3/10
| # | Vraag | Oplossing |
|---|---|---|
| 11 | Windy moet tijdens het spel ook iemand bij naam kunnen noemen ("Allee [X], ge moet wel uw best doen...") | `{speler}` mag nu ook bij Tussendoor moeien, De tijd is bijna om, Opdracht gelukt en Opdracht mislukt (`NAMED_CATEGORIES`). Het spel kiest dan willekeurig een speler (`pickNamed`): iedereen, ook ’t Duvelke (enkel onschuldigen noemen zou iets verraden), nooit twee keer na elkaar dezelfde. Zinnen met een naam doen gewoon mee in de lotting: ±1 op 4. 10 nieuwe ingebouwde zinnen met een naam (achteraan). Ingesproken namen worden gebruikt. |

### Ronde 5 (3/10) ✅ 3/10
| # | Vraag | Oplossing |
|---|---|---|
| 12 | Een effect op de eigen opnames, zodat de stem minder herkenbaar is, met bediening | *Windy → Stem → 🎭 Mijn stem vermommen*: aan/uit en een schuifje van 6 stapjes (halve tonen) lager tot 6 hoger, standaard 3 hoger. Het tempo blijft gelijk (`pitch.ts`: WSOLA-uitrekken + herbemonsteren). Geldt voor alle opnames, ook de namen; enkel bij het afspelen, de opnames blijven ongewijzigd. Proefknop met een eigen opname. Rekentijd ±0,2-0,5 s per zin op een trage tablet, daarna uit de cache. Opnames worden nu op 24 kHz verwerkt. |

### Ronde 6 (3/10) ✅ 3/10
| # | Bevinding | Oplossing |
|---|---|---|
| 13 | De verboden woorden: "Windy leest voor" laat iedereen het woord horen; zelf lezen toont álle woorden; en beide al vóór de timer | Oorzaak: "(niet: ...)" werd aangezien voor een antwoord, dus de lijst leek een vragenlijst. Nieuw: **kaartjes** (`list.turns`, `CardDeck.svelte`) bij de 12 opdrachten waar één speler om de beurt stiekem iets ziet (verboden woorden ×2, uitbeelden, neuriequiz, luchttekenen, rugtekeningen ×3, fluisterketting, lettermannetje, ja-nee aan zee, stuur het standbeeld). Tijdens de timer houdt wie aan de beurt is één kaartje ingedrukt; ✓ Geraden of ⏭ Overslaan geeft het volgende. Het aantal geraden staat al ingevuld bij het resultaat en blijft bewaard na herladen. Windy leest kaartjes nooit voor. |

### Ronde 7 (5/10) ✅ 5/10
Volledige review van alle 303 opdrachten en de quiz: zie [review-opdrachten.md](../review-opdrachten.md).
| # | Bevinding | Oplossing |
|---|---|---|
| 14 | Vragen die Windy voorleest stonden enkel op het uitlegscherm, dus vóór de timer (16 opdrachten) | Met een timer leest Windy ze nu voor terwijl de timer loopt (`ReadAloud` op het timerscherm). De voortgang staat in `current.cards`, zodat herladen verder gaat. Windy moeit zich niet tussendoor terwijl ze voorleest. |
| 15 | Een geheime lijst (hou ingedrukt) verdween op het timerscherm (o.a. Boemvakjes, Blind tekenen) | De lijst staat nu ook op het timerscherm. |
| 16 | "spelleider" bleef staan in sabotage- en speurderstips, rolhints en lijstjes | `hostWording` geldt nu ook daar, en in de terugblik en de bibliotheek. Kaartjes tellen niet meer als voorleeslijst. |
| 17 | Quiz: het juiste antwoord stond nooit op D | Antwoorden geschud per vraag, vast per opdracht (`quizOrder`), dus gelijk na herladen. |
| 18 | "Kaartje voor de Eerste Uitlegger" | Regex hersteld. |
| 19 | Opdrachtteksten | ±190 opdrachten bijgewerkt: rol-tips met een alternatief, onveilige tips vervangen, haalbare doelen, hints/mysteries via een geheime lijst voor het hulpje, voorbereidingen die op voorhand kunnen, geen vaste tijden naast een timer, geen hoofdletters of tekens in voorgelezen tekst, niets over nacht of bed, geen insecten of nat gras in oktober. Nieuwe `quality.test.ts` bewaakt die regels. |

Bewust anders dan in de review voorgesteld: de timers bij Het ja-nee-mysterie en De mysterieverhalen blijven (de geheime lijst staat nu op het timerscherm); De schat van kapitein Kenzo blijft gelukt/mislukt (het doel is de schat vinden), met per niveau precies 3 raadsels zodat de stappen vastliggen; Samen springtouwen krijgt een terugvalregel in plaats van minstens 6 spelers; hoofdletters in geheime lijstjes en kaartjes blijven (Windy leest die nooit voor).

### Ronde 8 (5/10) ✅ 5/10
| # | Vraag | Oplossing |
|---|---|---|
| 20 | Is er rekening gehouden met een meespelend hulpje? | Nee, `gameMasterId` werd tijdens het spel niet gebruikt. Nieuw: `host` op opdrachten die het hulpje leidt (het kent het antwoord, verstopt iets, geeft bevelen). Speelt het hulpje mee, dan krijgt het daar geen rol, kiest het als 't Duvelke zelf tussen eerlijk spelen of iets kleins saboteren (eigen leider-tips per opdracht), en kunnen speurders een tip krijgen om op het hulpje te letten. Het programma kiest dan hoogstens 3 zulke opdrachten (`MAX_HOST_TASKS`), met een badge 🎬. |
| 21 | Laat Windy of het machien overnemen wat het hulpje voorlas | `list.read`: **roepen** (één bevel per tik), **onthouden** (één keer voorlezen, verbergen, nakijken), **hints** (hint per hint, dan het antwoord), **willekeurig** (tijdens de timer op een onverwacht moment iets roepen). Altijd, ook als het hulpje niet meespeelt; "Toch liever zelf voorlezen" blijft. ±30 opdrachten omgezet (`ListReader.svelte`, `RandomCaller.svelte`). Waar het hulpje daarna niets meer leidt, is `host` weg; ±70 opdrachten houden het (verstoppen, ja/nee over een geheim, kijken wie beweegt, voordoen). |

### Ronde 9 (10/10) ✅ 10/10, na het eerste proefspel
| # | Bevinding | Oplossing |
|---|---|---|
| 22 | Eigen opnames werden op het einde afgeknipt | `trimBounds` knipte alles weg wat stiller was dan 1/10 van het luidste stuk, dus ook een zin die op het einde wegzakt. Het einde rekent nu met de achtergrondruis (hoogstens 1/20 van het luidste stuk) en houdt 0,25 s marge. |
| 23 | De Test had maar 1 speler, de ontmaskering begon meteen bij 't Duvelke, de uitslag toonde 1 persoon | Oorzaak: "is weg: overslaan" bij een briefing maakte iemand voor de rest van het spel afwezig (`game.absent`). Nu geldt overslaan enkel die ene keer; De Test, de ontmaskering en de uitslag tonen altijd iedereen. Wie de test oversloeg, staat onder de uitslag. Het menu "Wie is er weg?" is weg. 't Duvelke komt in de ontmaskering altijd als laatste. |

### Ronde 10 (10/10) ✅ 10/10
| # | Vraag | Oplossing |
|---|---|---|
| 24 | Het scherm casten naar een Android TV, zonder geheimen | Gewone schermcast spiegelt alles, en Chrome op Android kan geen tabblad apart casten. Gekozen: een **tweede toestel** als tv-scherm, dat je volledig mag casten. De tablet stuurt enkel `publicState()` (`src/lib/tv/state.ts`: vaste lijst openbare info, nooit het spel); `state.test.ts` bewaakt dat er geen tips, geheime lijstjes, kaartjes of Test-vragen in zitten. Koppelen via WebRTC met twee QR-codes (`qrcode-generator` om te tonen, de ingebouwde `BarcodeDetector` om te scannen, of de code plakken), zonder server of internet, op hetzelfde wifi. Windy spreekt via de tv (`setRemoteSpeech`), met de eigen opnames die de tablet meestuurt; geluidjes en verkleinde bewijsfoto's ook. Valt de verbinding weg, dan speelt de tablet alleen verder; opnieuw koppelen kan altijd. Ook als tweede venster op hetzelfde toestel (BroadcastChannel). Nog op de tablet te testen: QR scannen met de camera, wifi zonder internet, de stem met eigen opnames op de tv. |

### Ronde 11 (10/10) ✅ 10/10, na de eerste proef met het tv-scherm
| # | Bevinding | Oplossing |
|---|---|---|
| 25 | Een cast-knop in de app? | Kan niet: een webapp mag de schermcast van Android niet starten. Op het tv-toestel: twee keer naar beneden vegen → Smart View (geen Google Home nodig). |
| 26 | Op de tv stond de uitleg twee keer | De ondertitel verdwijnt als dezelfde tekst al groot op het scherm staat (uitleg, quizvraag, roddel). |
| 27 | Roddels op de tv zonder figuren en zonder "Josée vertelt soms zever" | De tv toont de roddel zoals de tablet (`tvUi.gossip`): figuur, waarschuwing en tekst, pas als de tablet hem vertelt. |
| 28 | Windy zegt: direct gelukt of niet aanduiden, zonder Volgende | `list.streak`: ✓ Goed / ✗ Fout, fout zet de teller op 0, meteen het volgende bevel; de lijst begint opnieuw als ze op is. Voor de drie Windy-zegt-spelletjes, "Ja en nee zijn verboden" en Tik-tak-tik. o-windy-zegt is nu ook "na elkaar zonder fout". |
| 29 | Waar of niet waar: wat als niet iedereen hetzelfde aanwijst? | `list.unanimous`: extra knop "🤷 Niet iedereen hetzelfde" (telt als fout) bij de vier vragenopdrachten waar iedereen hetzelfde moet kiezen. |
| 30 | De boodschappenlijst ging veel te snel | Onthouden leest elk ding apart met een pauze; één lange lijst wordt twee keer voorgelezen ("Nog één keer"). |
| 31 | Windy moeit zich minder | Sinds Windy veel voorleest, zweeg ze tijdens elke voorleesopdracht. Nu moeit ze zich ook daar, zodra er even niets gezegd wordt (`speechBusy`); enkel bij roepen en willekeurig roepen niet. |

### Ronde 12 (10/10) ✅ 10/10
| # | Vraag | Oplossing |
|---|---|---|
| 32 | Een spel voorbereiden en bewaren, opdrachten testen, slechte eruit, later laden en starten | **Voorbereidingen** (, , ): spelers, hulpje, spelinstellingen (: duur, moeilijkheid, plekken, schat, geheimen; namen en stem blijven de standaard) en programma, met een naam. Wijzigingen pas bewaard bij Opslaan (vingerafdruk → "niet opgeslagen wijzigingen"), ook Opslaan als nieuwe. Als bestand (met de spelers, herkend op naam) en in de back-up. **Proefronde** (): één opdracht echt spelen zonder briefing/roddel/dilemma, nooit bewaard, een lopend spel blijft onaangeroerd; daarna goed / wisselen / eruit. **Na te kijken** ( met reden): niet meer gekozen tot vrijgegeven in de bibliotheek, lijst kopieerbaar. De spelinstellingen staan nu in , gedeeld door Instellingen en Nieuw spel. |

### Kenzo zijn machien
- Een kartonnen robotje dat Kenzo "zelf gemaakt heeft" (`Machine.svelte`). Het leest alles wat Windy niet zelf ingesproken heeft, met de AI-stem door een robot-effect (`robot.ts`: ringmodulatie, filter, bliepje vooraf, gelijk volume). De onvolmaakte AI-stem past zo bij het personage.
- Doet enkel mee als **eigen opnames** aan staan **én** er minstens één uitspraak van Windy ingesproken is (namen tellen niet mee). Anders blijft de AI-stem gewoon Windy.
- De roddels die altijd kloppen komen van het machien ("een machien liegt niet"); de buurvrouw blijft de bron die soms liegt.
- Windy stelt het machien voor in de intro (nieuwe categorie "Het machien", achteraan toegevoegd zodat de ids van bestaande opnames niet verschuiven).
- Instellen bij *Windy → Stem*: aan/uit en de klank (Licht, Robot, Blikken doos). De gewone "Test de stem" test Windy zelf, nooit het machien.

## Nog na te kijken door de gebruiker
- De bemoei-frequentie tijdens de timer: te veel of goed zo?
- Of de nieuwe schrijfwijzen echt beter klinken op de tablet ("schatteke", "efkes", "zakdoekskes", "ne keer", "onzen Kenzo", "'s morgens").
- Het uiterlijk van het machien.
- Een steekproef van de nieuwe sabotage- en speurderstips.
- Tip: vergelijk bij *Windy → Stem* ook eens de gratis Google-stem van Android ("Stem van het toestel", Nederlands (België), offline te downloaden in de Android-instellingen).
