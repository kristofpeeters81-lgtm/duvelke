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
