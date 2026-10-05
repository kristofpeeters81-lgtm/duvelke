# Review van alle opdrachten (5/10/2026)

Alle 303 ingebouwde opdrachten en de quizvragen zijn nagekeken. Gecontroleerd: is de opdracht speelbaar, is ze duidelijk uitgelegd, passen de sabotage- en speurderstips bij de opdracht, en klopt het spelverloop in de app. **Status:** alles verwerkt op 5/10/2026 (S14 ronde 7, commits 9f104d7 tot a00580c). Waar bewust van een voorstel is afgeweken, staat in S14.

Legende: 🔴 onspeelbaar of fout mechanisme · 🟠 verwarrend of niet afgestemd · 🟡 klein (taal, uitspraak) · 🔵 past niet bij een dagfeest in oktober

---

## A. Fouten in de app (gecontroleerd in de code)

| # | Probleem | Waar | Gevolg |
|---|---|---|---|
| A1 | 🔴 Windy leest vragen voor (ReadAloud) **enkel op het uitlegscherm**. Op het timerscherm staat een geheime lijst niet meer. | `TaskPlay.svelte` (stap `uitleg` vs `bezig`) | Bij 13 opdrachten met voorleesvragen én timer zijn de vragen al gespeeld voor de timer start: de timer doet niets. Tikt het hulpje meteen op "Naar de timer", dan zijn de vragen weg. Het gaat om: raadseltijd, codeslot, b-windys-boodschappen, b-letterhusselaar, b-geheimschrift, b-ja-nee-mysterie, b-wat-hoort-er-niet-bij, b-achterstevoren, t-raad-en-tik, n-raad-en-vind, n-takjespuzzel, n-schelpensom, n-schat-kapitein-kenzo, o-straatraadsels, o-rekenknoop, o-mysterieverhalen. |
| A2 | 🔴 Een geheime lijst (hou ingedrukt, geen kaartjes) **verdwijnt zodra de timer start**. | `TaskPlay.svelte`, stap `bezig` toont enkel open lijsten | t-boemvakjes (het hulpje moet tijdens het spel het veilige pad kennen), blind-tekenen (de Verteller moet de tekening beschrijven tijdens de timer), b-stille-boodschapper, t-krijtcode, b-flitstekening. |
| A3 | 🟠 "spelleider" wordt enkel vervangen in uitleg, voorbereiding en lijsttitel. **Niet** in sabotagetips, speurderstips, rolhints en lijstitems. | `wording.ts` wordt niet gebruikt in `Briefing.svelte`, de rolhints en de lijstitems | Kinderen lezen "spelleider" op hun geheime tip en in lijstjes ("Zwaai naar de spelleider"). Dat gebeurt in tientallen opdrachten. |
| A4 | 🟠 De paklijst toont enkel `prep`, niet de gekozen lijstitems. | `program.ts` → `packingList` | Een voorbereiding die naar "het bericht van de tablet" verwijst, kan het hulpje op voorhand niet doen: b-geheimschrift, b-flitstekening, t-krijtcode, n-schelpensom. Bij n-schat-kapitein-kenzo hangt de plek van de schat af van welke 3 van de 7 raadsels de app kiest, maar het hulpje begraaft de schat op voorhand. |
| A5 | 🔴 Windy leest een item **in één keer** voor. Bij hints-per-hint-opdrachten hoor je dus alle hints tegelijk. | `ReadAloud.svelte` | n-welk-bosdier, t-kenzos-dierengeheim, o-wie-ben-ik, b-vijf-hints ("na elke hint raden" kan niet). Bij b-ja-nee-mysterie en o-mysterieverhalen moet het hulpje ja of nee antwoorden, maar het kent de oplossing pas als Windy ze luidop voor iedereen zegt. |
| A6 | 🟠 Bij codeslot zegt Windy na elk raadsel meteen het cijfer. "Zeg de volledige code" heeft dan geen zin meer. De juist-telling gaat ook verloren (scoring `gelukt`). | codeslot | |
| A7 | 🟡 Regex `/^eerstes+/i` moet `/^eerste\s+/i` zijn. Nu staat er "Kaartje voor de Eerste Uitlegger", ook als de tweede aan de beurt is. | `TaskPlay.svelte:131` | uitbeelden, o-verboden-woorden, o-luchttekenen. Bij fluisterketting, b-rugtekening en n-rugtekening (rol "Eerste") staat er "Kaartje voor de Eerste". |
| A8 | 🟠 Quiz: het juiste antwoord staat **nooit op D** (5× A, 22× B, 21× C, 0× D). De opties worden niet geschud. | `quiz.ts`, `QuizRunner.svelte` | Slimme kinderen hebben dat snel door. |

**Voorstel om A1 tot en met A4 op te lossen:**
- A1: bij voorleesvragen met een timer leest Windy voor **op het timerscherm**. Op het uitlegscherm komt dan enkel een melding, zoals nu al bij kaartjes. De voortgang (welke vraag, hoeveel juist) bewaren we in `current.cards`, zodat ook herladen werkt.
- A2: een geheime lijst (hou ingedrukt) blijft ook op het timerscherm staan.
- A3: `hostWording` ook toepassen op tips, rolhints en lijstitems.
- A4: de voorbereidingen herschrijven naar "bij de uitleg". Bij kapitein-kenzo: per niveau precies 3 raadsels, zodat de som vastligt.
- A5 en A6: tekstuele aanpassingen, zie hieronder.

---

## B. Patronen die overal terugkomen

1. **Sabotagetips voor één rol, zonder alternatief** (±25 opdrachten). Elke saboteur krijgt maar één tip, en dat vóór de rollen bekend zijn. Een tip zoals "Als Robot: …" laat 't Duvelke met lege handen als het die rol niet krijgt. Omgekeerd werken de andere tips soms niet als het Duvelke die rol wél heeft. Oplossing: "Ben jij X? … Anders: …". Het gaat om: blind-tekenen, blinde-piloot, blind-bouwen, springtouw-samen, wat-is-veranderd, b-warm-koud, b-krantenmode, b-stille-boodschapper, b-wie-is-de-leider, b-verboden-woorden, b-neuriequiz, t-boer-wolf-geit, t-touwlimbo, t-blinde-trein, t-lettermannetje, t-robot-tuinman, t-springslang, n-een-spoor, n-welke-boom, n-voelen-en-zoeken, n-rugtekening, n-ja-nee-aan-zee, n-wiens-voetstap, o-raad-wat-ik-zie, o-verboden-woorden, o-luchttekenen, o-een-woordje-maar, o-stuur-het-standbeeld, o-waar-is-dit, o-kompasmissie, o-letterfotoboek.
2. **Tips die afhangen van een gekozen item of niveau**: kleurenrace ("eerder paars"), o-fietsenspotter, t-voeljacht, t-kaartenstorm, b-kaartenpuzzel, o-verjaardagsrij, t-krokodillenbrug, o-deurenregenboog, patroon, t-geheugenparcours.
3. **Een vaste tijd in de uitleg, terwijl makkelijk 30% extra tijd krijgt**: ballonnen-hooghouden, tijdbom, o-kleurenrace, o-rijmrace, o-oren-wijd-open. Beter: "tot de timer afloopt". Bij opdrachten zonder timer staat niet wie de seconden telt: o-straatcamera, o-mensenmachine, o-flamingokolonie, t-fluitformaties.
4. **Doel = aantal gekozen items, terwijl sommige items van geluk afhangen** (één onvindbaar ding en je haalt het maximum nooit): speurlijst-buurt, o-huisnummerjacht, o-verkeersbordenbingo, t-vormenjacht, t-speeltuinbingo, t-diersporen, t-verrekijker, n-verrekijkerspot, n-wat-zagen-we. "X keer na elkaar" met precies genoeg items: t-tik-tak-tik, t-windy-zegt, b-geen-ja-geen-nee, b-windy-zegt.
5. **Haalbaarheid hangt af van het aantal spelers**: springtouw-samen (onspeelbaar met 4 spelers), mikken-emmer, kranteneiland, o-gedachtenlezers, o-dansketting, o-wie-zei-wat, b-dierenfamilies, b-vouwmonster, o-geluidenverhaal, t-samen-opstaan. Fysiek te zwaar: n-bosslang, n-vloeddijk, n-zandketting.
6. **Uitspraak (Windy leest voor)**: woorden in hoofdletters (WINDY, KENZO, BOEM, STOP, DUVEL, BINGO, NIETS…) en tekens (`=`, `+`, `×`, `−`, `%`, `→`, `km`, `bv.`, Romeinse cijfers). Spelwoorden (b-letterhusselaar "SUM", o-achterstevoren "T-A-K") spreekt Piper uit als één woord.
7. **Unit-zinnen die krom lopen** in "Hoeveel … hebben jullie?": 'juist', 'rondes juist', 'geraden', 'keer', 'dingen juist'. Beter: 'juiste antwoorden', 'juiste rondes', 'geraden dingen'.
8. **Geen einde of geen criterium voor "gelukt"**: n-bosmikado, n-slapende-uil, t-sprongcode (altijd gelukt), spoorzoeker, n-blinde-touwfiguur, n-voetstappenkunst, n-schaduwfiguren, b-krantenmode, b-vouwmonster, t-touwlimbo, t-springslang.

---

## C. Veiligheid (eerst oplossen)

- **schelpenjacht**: de tip "Zoek een eind weg van de emmer" stuurt een kind alleen weg op het strand. → "Breng je schelpen één voor één naar de emmer, zodat je veel heen en weer loopt."
- **balcirkel**: de tip "Gooi naar iemand die net even niet oplet" kan een bal in het gezicht geven. → "Gooi net iets te zacht of te kort."
- **n-tekenspoor**: de tip "Loop snel voorop" kan een kind laten weglopen. → "Wandel vooraan net iets te snel, zodat de anderen een pijl missen."
- **natuurbingo** en **n-strandjuttersbingo**: "afval" kan ook glas zijn. → "een stukje papier- of plastic afval (geen glas!)".
- **kranteneiland**: zet erbij "Niemand wordt opgetild."
- **t-reuzen-en-kabouters**: "Twee reuzen pakken de spelleider op" → "Twee reuzen pakken een kabouter op".

---

## D. Context: dagfeest 14u–18u in oktober

- Geen enkele opdracht gaat over slapen of Halloween. Woorden zoals "slapen" en "ontbijt" komen enkel voor in raadsels en zinnen, en dat is onschuldig. Het open punt "opdrachten noemen slapen" is daarmee afgehandeld.
- 🔵 **b-knuffels-in-het-donker**: "Het is nacht… uit hun bed ontsnapt". → "Windy heeft de gordijnen dichtgedaan, en {aantal} knuffels zijn uit hun mand ontsnapt!"
- 🔵 **b-schaduwtheater**: vraagt een donkere kamer. Zet in de prep: "Kies een kamer die je goed donker krijgt (rolluiken of gordijnen dicht)."
- 🔵 Insecten zijn eind oktober zeldzaam (vlinder, bij, kevertje, mierenstraat): t-speeltuinbingo, t-diersporen, o-dierenspeurders. Liggen of zitten op nat gras: t-fluitformaties, t-schaduwmonster, t-samen-opstaan.

---

## E. Per opdracht

### library.ts (43, waarvan 11 zonder opmerkingen)
- **wasknijper-jacht** 🟡 tip 4: "…in je zak tot de tijd om is" (vlak voor het einde afgeven telt toch mee).
- **kleurenjacht** 🟡 de lijst bevat ook patronen ("gestreept", "glanzend"). Uitleg: "Zoek iets voor elk vakje van de lijst…" en unit 'vakjes'. 🟠 Voeg een speurderstip toe voor "trager zoeken".
- **natuurbingo** 🟡 'mos' → 'een losliggend stukje mos'. Afval: zie C. 🟠 Voeg een speurderstip toe: "Wie twijfelt vaak, ook als het duidelijk klopt?"
- **speurlijst-buurt** 🟠 doel 8 = pick 8, met gelukitems (kat, rokende schoorsteen…) → target 6. 🟡 "met de volwassene" → "met een volwassene".
- **schelpenjacht** 🔴 tip 2: zie C. 🟡 pittig 14 → 12.
- **codeslot** 🔴 A6: timer weg, `scoring: aantal 3 'cijfers'`. Uitleg: "Windy leest drie raadsels voor. Elk antwoord is één cijfer van de code. Overleg en zeg jullie antwoord voor Windy het juiste antwoord zegt." 🟠 Pittig 'helft van 2 plus 2' is dubbelzinnig, '5 aftrekken van 25' wordt ruzie. 🟡 "(7, zeven → even)" → "(7: zeven zonder z wordt even)". Hoofdletters WINDY/DUVELKE/KENZO weg. "Hoe veel" → "Hoeveel".
- **raadseltijd** 🟠 A1. Raadsels die enkel in het Engels werken: 'hoofd en staart (munt)' → 'Wat heeft een oog maar kan niet zien? (een naald)'; 'verkoudheid vangen' → 'Wat heeft bladeren maar is geen boom? (een boek)'; 'toetsen/deur' herformuleren.
- **tel-tot-twintig** 🟡 titel → "Samen tellen" (doel is 12 of 25).
- **mensenknoop** 🟡 + "en niet twee handen van dezelfde persoon".
- **kranteneiland** 🟠 onhaalbaar met 7–8 spelers → doel 1/2/3, unit 'vouwen', zie C.
- **tapijt-omdraaien** 🟡 een handdoek is te klein voor 8 → "een groot laken of deken", supplies 'lakens'.
- **patroon** 🟡 "met je vingers knippen". Tip 3 → "'Eerst stampen, toch?', ook als het anders begon".
- **ballonnen-hooghouden** 🟠 "een volle minuut" → "tot de tijd om is". 🟡 "richting een hoek" → "weg van de groep".
- **lepelrace** 🟡 "de overkant" → "een punt op tien grote stappen".
- **mikken-emmer** 🟠 pittig met 3 spelers onhaalbaar → doel 6. 🟡 "Een bal telt als hij in de emmer blijft liggen."
- **balcirkel** 🟠 tip 3: zie C. 🟡 "de naam van wie je de bal toegooit".
- **uitbeelden** 🟡 A7. + "Na elk geraden woord geef je de tablet door."
- **blind-tekenen** 🔴 A2 (of `turns: true`). 🟠 rol-tips: "Ben jij de Verteller? … Anders: teken één ding aan de verkeerde kant." 🟡 "Lijkt het genoeg?" → "Staan alle dingen ongeveer op de juiste plek?"
- **stoepkrijt-kunst** 🟡 park: "stoep, terras of wandelpad, nooit op de rijweg".
- **dieren-alfabet** 🟠 tip 3 "Geef een hulpje dat niet klopt" botst met de rol hulpje → "Geef een tip die niet klopt". 🟡 "Lastige letters zoals Q mag je één keer overslaan."
- **blinde-piloot** 🟠 alle tips zijn voor wie aanwijzingen geeft. → "Ben jij de Piloot? Stap één keer net te ver door na 'stop'."
- **fluisterketting** 🟡 "Zo gaat het rij rond" → "de rij rond".
- **blind-bouwen** 🟠 rol-tips (Bouwmeester) met alternatief. 🟡 "De Bouwmeester mag zo vaak gaan kijken als nodig."
- **sokkenchaos** 🟡 tip 3 is onlogisch → "Hou één sok vast en zoek lang naar de partner, ook als je die al zag."
- **tijdbom** 🟠 "binnen de minuut" → "voor de tijdbom ontploft".
- **innerlijke-klok** 🟡 "STOP!" → "stop!".
- **wat-is-veranderd** 🟠 tips werken niet als het Duvelke de Detective is → "Ben jij de Detective? Noem één verandering die er niet is."
- **spoorzoeker** 🟠 criterium "gelukt" ontbreekt. 🟡 "Blijf altijd samen", verrassing (snoep) op de paklijst.
- **reuzenwoord** 🟡 de woorden in kleine letters schrijven (anders leest Windy ze slecht).
- **standbeelden** 🟠 de regels zijn omgedraaid uitgelegd → "Zolang het hulpje telt, mag iedereen sluipen. Bij {tellen} draait het zich om: dan staat iedereen stokstijf stil."
- **estafette-letters** 🟡 "een woord dat begint met de letter".
- **springtouw-samen** 🔴 met 4 spelers en 2 draaiers blijven er te weinig springers → minPlayers 6 of minder springers. 🟠 supplies 'lang-touw'. Rol-tips met alternatief.
- Zonder opmerkingen: bekertoren, hoepelketting, dienblad, ik-ga-op-reis, papieren-vliegtuig, rijmrap, zandkasteel, windy-quiz, woordslang, geluiden-raden, fotoposes.

### quiz.ts
- 🟠 A8 (nooit D).
- 🟠 'Langste rivier van België (De Maas)' is betwistbaar → 'Welke rivier stroomt door Namen en Luik?'.
- 🟠 'Welk gas ademen wij in?': we ademen vooral stikstof in, en dat staat bij de opties → 'Welk gas heeft ons lichaam nodig?' en 'Stikstof' vervangen door 'Waterstof'.
- 🟡 'Wat heeft een vlinder eerst geweest' → 'Wat is een vlinder eerst geweest'. 'Winter' als afleider → 'Kerst'. 'Op de Zuidpool' → 'Rond de Zuidpool'. 'In welke provincie' → 'provincies'. Tekens: '5 plus 5', '7 keer 8', '15 procent', '300 duizend kilometer'. 'Moulinsart (Molensloot)' → 'kasteel Molensloot'.
- 🟡 DETECTIVE_TIPS: "als iemand de saboteur zoekt" → "als er over 't Duvelke gepraat wordt". "Wie lacht er als het mislukt?" → "Wie lijkt blij als het mislukt?"

### library-binnen.ts (70, waarvan 29 zonder opmerkingen)
- **b-windys-boodschappen** 🟠 A1. Uitleg: "Zoek telkens het voorwerp; pas dan tikt het hulpje op 'Antwoord?'."
- **b-letterhusselaar** 🟠 A1. "SUM" wordt niet gespeld → 'S U M (mus)', of "het staat ook op het scherm". 🟡 speurderstip "spelleider" → "Windy".
- **b-geheimschrift** 🟠 A1 en A4. Aanbevolen: het antwoord vooraan zetten ('TAART: 20-1-1-18-20'), zodat het een geheim vakje wordt dat het hulpje bij de uitleg overschrijft. Code: "A is 1, B is 2… tot Z is 26". Codes nagerekend: ze kloppen.
- **b-ja-nee-mysterie** 🔴 A5. Timer weg, oplossing niet op het einde tussen ronde haakjes (bv. "[oplossing: …]"), zodat het hulpje ze stiekem leest. Uitleg: "Het hulpje leest stiekem een raar mysterie en vertelt het…"
- **b-kaartenpuzzel** 🟠 tip 3 ("4 en 6") werkt enkel op pittig → "1 en 3, dat mag toch niet?". 🟡 "aas (= 1)" → "de aas telt als 1".
- **b-wat-hoort-er-niet-bij** 🟠 A1. 🟠 '3, 5, 9, 11 (9: deelbaar door 3)' klopt niet (3 is ook deelbaar door 3) → '7, 14, 22, 28 (22: zit niet in de tafel van 7)'. 🟡 ANNA/OTTO → kleine letters.
- **b-achterstevoren** 🟠 A1; spellen lukt niet → "staat ook op het scherm". Tip 3 ("als de tijd bijna om is") → "Vraag één keer 'Nog eens'". Unit 'juiste antwoorden'.
- **b-flitstekening** 🟠 A4: prep → "Bij de uitleg hou jij de geheime lijst ingedrukt en teken je de figuur stiekem."
- **b-weet-jij-het-nog** 🟠 het aantal vragen ontbreekt → "12 vragen… Doel: {doel} van de 12". 🟡 "Gaat de vraag over jou? Dan mag je niet helpen."
- **b-boodschappenlijst** 🟠 pittig: "Staat er een aantal of kleur bij? Dan moet dat ook kloppen."
- **b-krantenmode** 🟠 het Model kan tips 1 en 3 niet uitvoeren → alternatief. Criterium "gelukt" toevoegen.
- **b-vouwmonster** 🟠 criterium "gelukt" toevoegen. Meer spelers dan stroken → "maak twee monsters".
- **b-vijf-hints** 🔴 A5: het antwoord vooraan zetten ('GIRAF: 1) …') zodat het hulpje de hints één voor één geeft. Unit 'geraden dingen'.
- **b-fabeltjes** 🟡 unit; "Het Atomium stelt een ijzerkristal voor".
- **b-hoger-lager** 🟡 unit; "km" → "kilometer"; tip 3 "spelleider".
- **b-verboden-woorden** 🟠 de uitleg zegt niet wat er gebeurt bij een verboden woord → "dan sla je dat kaartje over". Rol-tip met alternatief.
- **b-stille-boodschapper** 🔴 A2. 🟠 rol-tip met alternatief. 🟡 3 lijstitems met "spelleider" (A3).
- **b-wie-is-de-leider** 🟠 rol-tip met alternatief. 🟡 "de kamer uit" → "even weg" (ook in de tuin).
- **b-dierenfamilies** 🟠 "elk dier minstens twee keer" kan niet bij weinig spelers → in de prep: minder dieren kiezen.
- **b-tikkende-tafels**, **b-verstopte-wekker** 🟠 de prep staat op de paklijst, maar een wekker die je op voorhand zet, gaat te vroeg af → "Zet vlak voor deze opdracht…".
- **b-geen-ja-geen-nee**, **b-windy-zegt** 🟡 het doel is groter dan het aantal items → pick op het maximum of "(verzin er zelf bij)". 'Zwaai naar de spelleider' (A3).
- **b-razendsnel-lijstje** 🟡 'mop aan de spelleider' (A3).
- **b-schaduwtheater**, **b-knuffels-in-het-donker** 🔵 zie D.
- 🟡 Kleine punten:
  - b-schatkaart: pittig-var "ondersteboven (en teken de deur er niet op)".
  - b-alfabet-in-huis: foto "van A tot Z" klopt niet; voorbeeld in tip 1.
  - b-warm-koud: "de kamer uit" klopt niet in de tuin; rol-tip.
  - b-wc-rollentoren: tip 3 "spelleider".
  - b-krantenstaaf: "NIET" → "niet".
  - b-kaartenmemory: "Het hulpje telt de beurten."
  - b-kaartenrij: unit.
  - b-knikkergolf: boogjes.
  - b-rugtekening: "wie vooraan zit, tekent".
  - b-woorden-uit-woord: kleine letters.
  - b-indringers: "in deze kamer".
  - b-levend-schilderij en b-camouflage: "handdoeken of dekens", knuffel.
  - b-reuzen-kabouters: ook in de tuin; "spelleider".
  - b-knieballon: reserveballonnen.
- Ontbrekende speurderstip bij één sabotagetip: b-postit-woord, b-ja-nee, b-krantenstaaf, b-stille-rij, b-rietjesbrug.

### library-tuin.ts (65, waarvan 22 zonder opmerkingen)
- **t-vormenjacht** 🟡 "vinkt af" (er zijn geen vinkjes) → "onthoudt". Pittig: vijfhoek, zeshoek en cirkel zijn bijna niet te vinden → target 6.
- **t-kaartenstorm** 🟡 tip "6 en 9" werkt niet op makkelijk (kaarten tot 6).
- **t-voeljacht** 🟡 tip "glad of ruw" werkt alleen als dat item gekozen is.
- **t-speeltuinbingo** 🟡 "BINGO" → "Bingo". 🔵 kevertje → paddenstoel.
- **t-natuuralfabet** 🟠 'WINDY': een natuurding met een Y is er praktisch niet. De volgorde-tips botsen met "of wijs het aan". 🟡 hoofdletters.
- **t-krijtcode** 🟠 A2 en A4: prep → "Bij de uitleg lees je stiekem het woord en schrijf je de code op het terras. Onthoud het woord." 🟡 "1 is A, 2 is B". Codes nagerekend: ze kloppen.
- **t-raad-en-tik** 🟠 A1. Veel antwoorden (schommel, glijbaan, zandbak) staan niet in een gewone tuin → "Staat het hier niet? Wijs dan de plek aan waar het zou kunnen staan."
- **t-boer-wolf-geit** 🔴 rol-tip zonder alternatief. 🟠 "(ook terugvaren telt als een overtocht)": pittig = precies 7.
- **t-ja-nee-tuin** 🟡 "{vragen} vragen per ding".
- **t-lavarivier** 🟡 tip "spelleider"; schaar bij supplies.
- **t-samen-opstaan** 🟠 "per twee" bij een oneven aantal spelers. 🔵 nat gras.
- **t-lopende-band** 🟡 "vooraan de rij" is dubbelzinnig.
- **t-geheugenparcours** 🟡 tip 3 werkt alleen als er gehinkt wordt.
- **t-boemvakjes** 🔴 A2. 🟡 "BOEM" → "Boem", "Je begint op rij 1", unit 'spelers over'. Paden nagekeken: alle twaalf geldig.
- **t-tuinwoordenboek** 🟡 "=" → "is".
- **t-omgekeerd-bowlen** 🟡 tip voor een "coach" die niet bestaat.
- **t-voetgolf** 🟠 de poortjes staan genummerd "in je hoofd" → nummers bij de poortjes leggen.
- **t-touwlimbo** 🟠 rol-tip met alternatief; wat als iemand het touw raakt?
- **t-waar-of-windypraat** 🟡 hoofdletters; unit; "Egels drinken graag melk" is eigenlijk waar → "Melk is gezond voor egels".
- **t-schatten-maar** 🟡 "schaduw van de spelleider" (A3).
- **t-kenzos-dierengeheim** 🔴 A5: uitleg → "Windy leest drie hints voor. Overleg en raad daarna één keer."
- **t-hoepelquiz** 🟡 unit; "met minstens één voet in dezelfde hoepel".
- **t-blinde-trein** 🔴 rol-tip (Machinist) zonder alternatief. 🟡 "=" in de uitleg; speurderstip 1.
- **t-lettermannetje** 🟠 rol-tip (Seiner).
- **t-blinde-boerderij** 🟠 "kiezen stiekem een verschillend dier" spreekt zichzelf tegen → "spreken fluisterend af".
- **t-krokodillenbrug** 🟠 tip past niet bij makkelijk.
- **t-robot-tuinman** 🔴 rol-tip (Robot) zonder alternatief.
- **t-tik-tak-tik** 🟠 te weinig items voor 8 keer na elkaar → pick 14.
- **t-red-de-picknick** 🟡 "twee kinderen" → "twee spelers".
- **t-fluitformaties** 🟠 wie fluit en telt? 🔵 liggen op het gras.
- **t-diersporen** 🟠 target 6 = pick → 5. 🔵 insecten.
- **t-kompasschat** 🟡 het routepapier; "de letter N".
- **t-verrekijker** 🟠 target 6 = pick → 5.
- **t-reuzen-en-kabouters** 🟠 zie C. 🟡 de zon in de hand (in de zon kijken) → wolk.
- **t-schaduwmonster** 🟡 "HOI"; tip 3 laat kinderen in de zon kijken. 🔵 liggen.
- **t-filmaffiche** 🟡 tip 1 gaat uit van een enge titel.
- **t-windy-zegt** 🟠 te weinig items → "(herhalen mag)". 🟡 "NIETS".
- **t-dierenestafette** 🟡 een regel uit tip 3 ontbreekt in de uitleg.
- **t-springslang** 🟠 rol-tip; wat bij een aanraking?
- **t-tweelingparcours** 🟡 "Bouw het parcours voor je de timer start."
- **t-bewegingsdobbel** 🟡 hoofdletters en "="; "Telt iemand fout?"
- **t-sluipschat** 🟡 na de vervanging staat er "het hulpje… dan wijst die" → "dan wijst het".
- **t-sprongcode** 🟠 geen timer en geen limiet, dus altijd gelukt → timer 300.
- Zonder opmerkingen: t-bladerenladder, t-drakeneieren, t-touwfiguur, t-vliegend-dienblad, t-buikbalrups, t-spinnenweb, t-knoop-in-het-touw, t-natuurtweeling, t-frisbee-landing, t-koorddanser, t-stenenmannetje, t-bladerblazers, t-knikkerschijf, t-fabeldier, t-tuinorkest, t-krijtparcours, t-knuffelnest, t-opruimparade, t-schaduwstappen, t-krijtpijlen, t-gezichten-natuur, t-hoepeleilanden.

### library-natuur.ts (60, waarvan ±21 zonder opmerkingen)
- **n-bladerladder** 🟡 wat telt er?
- **n-wat-hoort-hier-niet** 🟡 prep: "Onthoud waar je alles legt."
- **n-strandjuttersbingo** 🟡 afval (zie C).
- **n-strandrecords** 🟡 tip "kleinere schelp" werkt averechts; "rijstkorrel" → "je kleinste teennagel".
- **n-raad-en-vind** 🟠 A1; tip "vraag de spelleider" → "vraag om het raadsel nog eens te horen" (+ speurderstip). 🔵 "schaduw van een boom" bij bewolkt weer.
- **n-takjespuzzel** 🟠 A1; "VI − IV = IX" kan Windy niet voorlezen → in woorden. 🟡 hint in het antwoord van de piramide; prep: lange en korte takjes.
- **n-welk-bosdier** 🔴 A5 → "Windy leest drie aanwijzingen voor, overleg en kies één dier." 🟡 "lijken op visjes".
- **n-schelpensom** 🟠 A1 en A4: de prep "leg de sommen" kan niet → het hulpje legt elke som tijdens het voorlezen. Tekens in woorden.
- **n-schat-kapitein-kenzo** 🔴 A4: de som hangt af van de willekeurige keuze → per niveau precies 3 raadsels en een var `stappen`. 🟡 hoofdletters; startpunt en stapgrootte.
- **n-blinde-touwfiguur**, **n-voetstappenkunst**, **n-schaduwfiguren** 🟡 criterium "gelukt".
- **n-zandketting** 🟠 met 3 spelers onhaalbaar → kortere afstand, "halfvol".
- **n-een-spoor** 🟠 rol-tip ("Ben jij de eerste?").
- **n-boskim**, **n-natuurketting**, **n-wiens-voetstap** 🟡 units.
- **n-wat-zagen-we** 🟠 "kies wat past" maar pick = doel → pick 8. 🟡 item "spelleider"; prep: "Let zelf goed op tijdens de wandeling."
- **n-bosmikado** 🟠 geen einde → "Na de derde mislukte beurt stopt het spel."
- **n-bos-schatten** 🟡 "hand van de spelleider"; "dichtbij genoeg" → "hooguit een kwart ernaast".
- **n-kustquiz** 🟡 twee pittige vragen met hetzelfde antwoord (67).
- **n-welke-boom**, **n-voelen-en-zoeken**, **n-rugtekening**, **n-wiens-voetstap** 🟠 rol-tips.
- **n-ja-nee-aan-zee** 🔴 de Denker blijft dezelfde persoon in alle rondes → rol-tips met alternatief.
- **n-uilentaal** 🟡 "van kort naar lang".
- **n-bosslang**, **n-vloeddijk** 🟠 fysiek onhaalbaar → kortere slang, dijk "een handbreedte hoog", emmers gebruiken.
- **n-schelpensorteermachine** 🟡 prep voor pittig.
- **n-tekenspoor** 🟡 "spelleider"; tip "snel voorop" (zie C).
- **n-kompastocht** 🟠 papier en stiften ontbreken bij supplies; stapgrootte.
- **n-sporendetective** 🟠 Windy leest de beschrijving voor, dus de tekening voegt niets toe → uitleg aanpassen. 🟡 "bv."; het konijnenspoor klopt niet.
- **n-verrekijkerspot** 🟠 doel = pick, met gelukitems.
- **n-bosgezichten** 🟡 tip "spelleider".
- **n-bosfotostrip** 🟠 "Snapt het hulpje het verhaal?" kan niet: het hulpje kent het thema al.
- **n-trucfotos-aan-zee** 🟠 emmers en handdoeken ontbreken bij supplies.
- **n-slapende-uil** 🟠 geen einde → timer 180.
- **n-krabbenleger** 🟡 "voor de tijd om is".
- **n-zandtwister** 🟡 speurderstip "spelleider".

### library-overal.ts (65, waarvan 24 zonder opmerkingen)
- **o-huisnummerjacht** 🟠 doel = pick, met zeldzame items. 🟡 "vinkt af"; even nummers liggen altijd naast elkaar (kies andere items).
- **o-verkeersbordenbingo** 🟠 doel = pick, met zeldzame borden → target 5.
- **o-deurenregenboog** 🟠 door de vaste volgorde blokkeert één zeldzame deur alles erna. 🟡 tip 2.
- **o-fietsenspotter** 🟠 tips hangen af van gekozen items. 🟡 "gekleurde bel".
- **o-straatraadsels**, **o-rekenknoop** 🟠 A1. 🟡 rekenknoop: het appelraadsel is dubbelzinnig.
- **o-wie-ben-ik** 🔴 A5 → "leest drie hints na elkaar voor, daarna één keer raden"; tip 1 aanpassen.
- **o-mysterieverhalen** 🔴 A1 en A5: het hulpje kent de oplossing niet. Oplossing niet op het einde tussen haakjes, timer weg.
- **o-achterstevoren** 🟠 "T-A-K" spreekt Piper uit als "tak" → 'T, A, K'. 🟡 speurderstip "spelleider".
- **o-verjaardagsrij** 🟠 makkelijk heeft geen antwoord om te zeggen; tip "verkeerde maand" past niet bij elk niveau.
- **o-gedachtenlezers** 🟠 met 8 spelers allemaal hetzelfde woord zeggen is te moeilijk → "minstens de helft". 🟡 "Dan hebben jullie een punt".
- **o-vingersom** 🟡 grens voor het getal.
- **o-duvel-tellen**, **o-klapgolf** 🟡 "DUVEL!" → "Duvel!".
- **o-straatcamera** 🟠 niemand meet de kijktijd → "het hulpje telt stil tot {kijktijd}". 🟡 titel "om om".
- **o-wie-zei-wat** 🟠 pittig met 3 spelers onhaalbaar; het hulpje moet 20 antwoorden onthouden → opschrijven, papier en stiften bij supplies.
- **o-flamingokolonie** 🟠 de seconden botsen met de timer → "het hulpje telt luidop".
- **o-mensenmachine** 🟡 wie telt de 20 seconden?
- **o-geluidenverhaal** 🟠 5 woorden voor 8 spelers → pick 8.
- **o-verkeersquiz**, **o-poseer-bij-het-bord** 🟡 "STOP" → "stopbord".
- **o-wat-hoort-er-niet-bij** 🟡 "Welk ding".
- **o-dierenrecords** 🟡 "het jachtluipaard"; "knor knor".
- **o-raad-wat-ik-zie**, **o-verboden-woorden**, **o-luchttekenen**, **o-een-woordje-maar**, **o-stuur-het-standbeeld** (🔴), **o-kompasmissie**, **o-letterfotoboek** 🟠 rol-tips. Bij o-een-woordje-maar staat niet wie de tips doorgeeft. Bij o-letterfotoboek staan de woorden in hoofdletters.
- **o-kleurenrace**, **o-rijmrace**, **o-oren-wijd-open** 🟠 vaste tijd in de uitleg (B3).
- **o-snelle-ogen** 🟡 unit 'dingen'; tip "spelleider".
- **o-nummerplaatspeurder** 🟡 "begint met 1 of 2" klopt voor bijna elke Belgische nummerplaat.
- **o-straatnaamdetective**, **o-dierenspeurders** 🟡 het doel staat niet in de uitleg. 🔵 vlinder of bij.
- **o-waar-is-dit** 🟠 waar zijn de foto's te zien? Rol-tip "Heb jij de tablet?".
- **o-windy-zegt** 🟡 door het schudden komt "Zwaai nog eens" soms vóór het eerste zwaaien; "spelleider".
- **o-dansketting** 🟠 het aantal bewegingen groeit met het aantal spelers → vast {aantal}.
- Zonder opmerkingen: o-brievenbussafari, o-alfabetwandeling, o-vormenjacht, o-buurtschatting, o-broodkruimelspoor, o-geheim-nummer, o-boodschappenlijst, o-achteruit-onthouden, o-stoephinkelbaan, o-neus-oor-klap, o-koorddansers, o-hernoem-de-straat, o-een-woord-verhaal, o-reclamespot, o-waar-of-niet, o-klapt-ge-vlaams, o-rugpost, o-cijferrace, o-straatgezichten, o-reuzen-en-dwergen, o-groeten-uit-de-buurt, o-fotostripverhaal, o-dierenparade, o-volg-kenzo.
