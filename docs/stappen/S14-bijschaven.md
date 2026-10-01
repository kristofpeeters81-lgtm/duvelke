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
| 4 | Eigen opnames van Windy naast een AI-Windy: het verschil valt op | **Kenzo zijn machien** (zie hieronder). | zie git log |

### Kenzo zijn machien
- Een kartonnen robotje dat Kenzo "zelf gemaakt heeft" (`Machine.svelte`). Het leest alles wat Windy niet zelf ingesproken heeft, met de AI-stem door een robot-effect (`robot.ts`: ringmodulatie, filter, bliepje vooraf, gelijk volume). De onvolmaakte AI-stem past zo bij het personage.
- Doet enkel mee als **eigen opnames** aan staan **én** er minstens één uitspraak van Windy ingesproken is (namen tellen niet mee). Anders blijft de AI-stem gewoon Windy.
- De roddels die altijd kloppen komen van het machien ("een machien liegt niet"); de buurvrouw blijft de bron die soms liegt.
- Windy stelt het machien voor in de intro (nieuwe categorie "Het machien", achteraan toegevoegd zodat de ids van bestaande opnames niet verschuiven).
- Instellen bij *Windy → Stem*: aan/uit en de klank (Licht, Robot, Blikken doos). De gewone "Test de stem" test Windy zelf, nooit het machien.

## Nog na te kijken door de gebruiker
- Welke machine-klank het best werkt op de tablet (standaard: Robot).
- Of de nieuwe schrijfwijzen echt beter klinken op de tablet ("schatteke", "efkes", "zakdoekskes", "ne keer", "onzen Kenzo", "'s morgens").
- Het uiterlijk van het machien.
- Een steekproef van de nieuwe sabotage- en speurderstips.
- Tip: vergelijk bij *Windy → Stem* ook eens de gratis Google-stem van Android ("Stem van het toestel", Nederlands (België), offline te downloaden in de Android-instellingen).
