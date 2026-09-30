# Wie is 't Duvelke?

Een offline speurspel zoals *Wie is de Mol?*, voor op één gedeelde tablet. Gemaakt voor een kinderfeest (±10 jaar), maar ook speelbaar met volwassenen.

**Spelen:** https://kristofpeeters81-lgtm.github.io/duvelke/ (installeren via Chrome, daarna werkt alles zonder internet).
**Handleiding:** [HANDLEIDING.md](HANDLEIDING.md) · **Plan en keuzes:** [PLAN.md](PLAN.md)

## Wat zit erin

- Geheime rollen met de tablet die rondgaat: 't Duvelke (1 tot 3), Speurders, en optioneel een Speurneus en een Bemoeial.
- 305 ingebouwde opdrachten voor binnen, tuin, park, bos, strand, straat en dorp, met variaties per moeilijkheid.
- Het spel stelt een programma samen op basis van plek, beschikbare spullen, aantal spelers, moeilijkheid en speelduur.
- Geheime briefings met sabotagetips, Kijk-jokers, dilemma's, roddels (Windy en de buurvrouw), bewijsfoto's.
- De Test, de ontmaskering, de ranglijst, een terugblik en een diavoorstelling.
- Presentatrice **Windy** en **Buurvrouw Josée**, met een Vlaamse AI-stem ([Piper](https://github.com/rhasspy/piper), CC0-stemmen) die in de browser draait. Uitspraken kan je ook zelf inspreken.
- Nieuwe opdrachten laten bedenken door een gratis AI (via een chatbot plakken, of een gratis Gemini-sleutel), altijd gecontroleerd en goedgekeurd.
- Back-up en herstel naar één bestand.

## Techniek

Vite + Svelte 5 + TypeScript, als PWA (vite-plugin-pwa). Alle gegevens blijven op het toestel (IndexedDB en OPFS). Geluidseffecten worden zelf gemaakt met Web Audio.

```bash
npm install
npm run dev      # ontwikkelen
npm test         # unit tests (Vitest)
npm run check    # typecontrole
npm run build    # productie-build
```

Bij elke push naar `main` worden de tests, de typecontrole en de build uitgevoerd, en de app op GitHub Pages gepubliceerd.

Windy is een eigen personage, geïnspireerd op een bekend Vlaams typetje; er worden geen teksten of beelden van het origineel gebruikt.
