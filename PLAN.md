# Plan: "Wie is 't Duvelke?"

Een 'Wie is de Mol?'-achtig spel voor kinderen (±10 jaar), gespeeld op één gedeelde Android-tablet.
Eerste gebruik: verjaardag op **26/10/2026** (6 kinderen + 2 volwassenen).

## Uitgangspunten (vastgelegd)

- **Gratis**: geen enkele betalende dienst.
- **Offline speelbaar**: enkel installatie, updates en optionele AI-generatie gebruiken internet.
- **Eén toestel**: een gemeenschappelijke Android-tablet (Chrome). Niets printen.
- **Geen tussentijdse stemmingen, geen afvallers.**
- **Niets vies of nat.** Straat/bos/dorp altijd met een volwassene (label 🧑‍🦺).
- **Taal**: Vlaams Nederlands. Windy spreekt sappig Kempisch.
- **Foto's** blijven op de tablet, nooit uploaden.
- Geen verdachtenboekje, geen printbare kaarten, geen saboteur-mini-missies.

## Techniek

| Onderdeel | Keuze |
|---|---|
| App-type | PWA (installeerbare web-app) via Chrome op Android |
| Code | Vite + TypeScript + Svelte 5 |
| Opslag | IndexedDB (lokaal op de tablet) |
| Hosting | GitHub Pages (gratis, publieke repo zonder persoonlijke data) |
| Graphics | Eigen SVG-illustraties en CSS/SVG-animaties |
| Lettertypes | Meegebundeld (werkt offline) |
| Geluid | Web Audio + CC0-geluiden, Android-voorleesstem (nl-BE) |
| Scherm | Wake Lock (scherm blijft aan), volledig scherm |
| Robuustheid | Spelstand continu bewaard: herstarten gaat verder waar je was |

## Personages

- **'t Duvelke**: de saboteur. Naam instelbaar. Mascotte: klein, ondeugend rood duiveltje.
- **Windy**: presentatrice en roddeltante, geïnspireerd op een bekend bemoeiziek-moeder-typetje. Naam instelbaar.
  - Eigen cartoon, geen portret van een echte persoon.
  - Zwart bobkapsel dat duidelijk een **pruik** is, met plukjes echt (blond) haar eronder.
  - Kleurrijke gestreepte gebreide trui, overdreven gezichtsuitdrukkingen.
  - Sappig Kempisch commentaar, geen letterlijke citaten van het origineel.
  - Toon: moederfrustraties, goedbedoelde bemoeienissen, luid en dramatisch binnenstormen, nuchtere levenswijsheden ("'t komt altijd goed... meestal toch"), verontwaardigd over "lelijke woorden".
  - Vermeldt af en toe haar zoon **"onzen Kenzo"** (de puber die niks wil). Naam instelbaar.
  - **Uitsprakenlijst** per soort (begin, dossiers, doorgeven, opdracht, gelukt, mislukt, roddel, zoon, wijsheid, einde): ingebouwde uitspraken aan/uit te zetten, eigen uitspraken toe te voegen, met plaatshouders {saboteur}, {zoon}, {windy}, {speler}.
  - **Stem**, in volgorde van voorrang:
    1. **Zelf ingesproken** opnames per uitspraak (niet voor uitspraken met {speler}).
    2. **Vlaamse AI-stem Piper "rdh"** (CC0), draait in de browser, één keer downloaden (± 60 MB), daarna offline. Toonhoogte via afspeelsnelheid (standaard 1,2). Uitspraaklijst voor klinkerloze woorden en HOOFDLETTERS.
    3. **Toestelstem** (Android-TTS) als reserve.
  - Later eventueel: de AI-stem nog natuurlijker maken.
  - **Roddels**: 👀 "Ik heb het ZELF gezien!" is altijd waar. 🗣️ "De buurvrouw zei…" is soms gelogen (uit te zetten).

## Rollen

- **'t Duvelke**: 3–6 spelers: 1. 7–11: 1 (30% kans op 2). 12–16: 1 (30% op 2, 10% op 3). Duvelkes weten niet van elkaar.
- **Speurders**: alle anderen.
- **🔍 Speurneus** (optioneel, standaard uit): krijgt gaandeweg onschuldige namen. Speelt voor een aparte Speurneus-medaille.
- **🙋 Bemoeial** (optioneel, standaard uit): bemoeit zich ongevraagd met alles.
- **Spelleider**: meedoen is per spel te kiezen. Speelt die mee, dan ziet die nooit geheime info. Noodknop: "toon enkel mijn eigen rol opnieuw".

## Verloop

### A. Voorbereiding
1. **Spelers**: naam, kleur/avatar, kind of volwassene. De lijst wordt bewaard. Per spel aanvinken wie meedoet (3–16).
2. **Instellingen**: duur (30 min–2,5 u), moeilijkheid (Makkelijk 6–8 / Normaal 9–12 / Pittig tieners+volwassenen), locaties (aanvinken: binnen, tuin, straat/buurt, bos, speeltuin/park, dorp, strand), schat (virtueel of fysiek met inventaris), namen, optionele rollen, buurvrouw-roddels, spelleider speelt mee.
3. **Benodigdheden**: een checklist, die bewaard wordt.
4. **Programma**: de app stelt een programma voor. De spelleider kan wisselen, schrappen, herordenen en vastzetten.
5. **Paklijst** van alles wat klaar moet liggen.

### B. Spel
1. Intro door Windy.
2. Geheime rollen: de tablet gaat rond. Iedereen beantwoordt dezelfde vragen over zichzelf (t-shirtkleur, bril, haar, …).
3. Per opdracht:
   - aankondiging door Windy
   - geheime briefing (elke opdracht of om de 2): iedereen krijgt een kaartje in dezelfde opmaak. 't Duvelke krijgt een sabotagetip, de anderen een speurderstip of onschuldige naam.
   - uitleg met voorleesstem
   - rollen in de opdracht
   - timer
   - 📸 bewijsfoto
   - resultaat → schatten
   - soms een 💎 dilemma: schat of Kijk-joker
   - 👍/👎
4. Tussendoor roddelt Windy.
5. **Kijk-joker**: toont in het geheim één naam die zeker géén Duvelke is.

### C. Einde
1. **De Test**: ±10 vragen per speler. Hoofdvraag "Wie is 't Duvelke?", plus vragen over eigenschappen en rollen in opdrachten. Bij meerdere Duvelkes is een antwoord juist als het past bij minstens één. Bij gelijkstand wint de snelste. Duvelkes doen mee voor de schijn.
2. **Onthulling**: eerst de schat (onder 50% = 't Duvelke wint), dan de ranglijst van laatste naar eerste, dan de ontmaskering.
3. "Wat 't Duvelke stiekem deed": sabotagetips en een diavoorstelling van de foto's.
4. Fysieke schat: voorstel voor een eerlijke verdeling.
5. Foto's bewaren in de galerij.

## Opdrachtenbibliotheek
- 300+ ingebouwde opdrachten in 12 categorieën, met variaties.
- Per opdracht: locaties, benodigdheden, min/max spelers, duur, moeilijkheid, uitleg per niveau, 3–5 sabotagetips, rollen, begeleiderslabel.
- Eigen opdrachten toevoegen en bewerken.
- AI via **optie A** (kopiëren/plakken met een gratis chatbot) en **optie B** (gratis Gemini-sleutel). Na validatie en goedkeuring door de spelleider komen ze met een ✨-label in de databank op de tablet.
- Back-up en herstel naar een bestand.
- Duimpjes beïnvloeden hoe vaak een opdracht gekozen wordt.

## Bouwplanning

| Stap | Klaar tegen | Inhoud |
|---|---|---|
| 1 | 4/10 | Projectbasis, PWA (offline), spelers, instellingen, benodigdheden |
| 2 | 8/10 | Rollen verdelen met de tablet die rondgaat, Windy en 't Duvelke, stem-instellingen |
| 3 | 11/10 | Volledig spel met ±40 opdrachten: briefings, timer, schat, jokers, foto's, roddels |
| 4 | 14/10 | De Test, onthulling, diavoorstelling |
| 5 | 17/10 | Bibliotheek 300+, AI (A + B), eigen opdrachten, back-up |
| 6 | 18–25/10 | Proefspel, bijschaven, handleiding voor de spelleider |
