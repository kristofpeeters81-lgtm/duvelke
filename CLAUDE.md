# Wie is 't Duvelke?

Offline speurspel zoals *Wie is de Mol?* voor één gedeelde Android-tablet (Chrome, PWA). Gemaakt voor een kinderfeest (±10 jaar) op 31/10/2026, met 6 kinderen en 2 volwassenen. Presentatrice Windy leidt het spel. Een volwassene of een kind is haar "hulpje".

- **Stappenplan (wat klaar is, wat nog moet, ideeën):** [docs/STAPPENPLAN.md](docs/STAPPENPLAN.md). Lees eerst de index. Open een detailbestand in `docs/stappen/` pas als je die stap nodig hebt.
- **Ontwerp en spelregels:** [PLAN.md](PLAN.md)
- **Handleiding voor het hulpje:** [HANDLEIDING.md](HANDLEIDING.md)
- **Live:** https://kristofpeeters81-lgtm.github.io/duvelke/ (GitHub Actions publiceert bij elke push naar `main`)

## Techniek

Vite 8, Svelte 5 (runes), TypeScript strict, vite-plugin-pwa (Workbox). Opslag in IndexedDB via `idb`. De Vlaamse AI-stem draait in de browser: Piper `nl_BE-rdh-medium` via `@mintplex-labs/piper-tts-web`, met `onnxruntime-web` vastgezet op 1.18.0.

| Map | Inhoud |
|---|---|
| `src/screens/` | Schermen. `game/` bevat alles tijdens het spel. |
| `src/components/` | Herbruikbare onderdelen, waaronder Windy en 't Duvelke (eigen SVG). |
| `src/lib/` | Logica: `game.ts`, `gameplay.ts`, `finale.ts`, `speech.ts`/`piper.ts`/`robot.ts` (Kenzo zijn machien)/`wav.ts` (opnames vlot aan elkaar)/`pitch.ts` (stem vermommen), `db.ts`, `backup.ts`, `ai.ts`. |
| `src/lib/tasks/` | Opdrachtenbibliotheek (305), programma, `wording.ts` (Windy of het hulpje leest voor). |
| `src/lib/data/` | Vaste lijsten: Windy-uitspraken, locaties, spullen, stemmen. |

## Commando's

- `npm run dev` start de ontwikkelserver.
- `npm test` draait Vitest (462 tests).
- `npm run check` draait svelte-check.
- `npm run build` maakt de productiebuild.

De browsertests (Playwright-scripts) staan niet in de repo. Zet ze zo nodig opnieuw op in de scratchpad.

## Regels

- Alles in het Vlaams. Windy spreekt sappig Kempisch.
- Nieuwe Windy-uitspraken in `windyLines.ts` komen altijd **achteraan**. De ids (w001, w002…) volgen de volgorde, en de eigen opnames hangen aan die ids.
- Het spel moet gratis zijn en offline speelbaar. Internet mag enkel voor installatie, de stemdownload en de optionele AI.
- **Publieke repo:** geen persoonlijke gegevens, geen adres, geen Gemini-sleutel. Windy is een eigen personage. Gebruik nooit de naam, citaten of gelijkenis van het echte typetje waarop ze geïnspireerd is.
- Bekijk geen oudere versies van dit spel buiten deze repo. Het spel is bewust van nul gestart.
- Werk in kleine stappen die je kan testen. Commit met Conventional Commits, in het Nederlands.
- Commit en push pas als `npm test` en `npm run check` slagen.
- Controleer vóór elke push met `gh auth status` dat `kristofpeeters81-lgtm` het actieve account is. Lees nooit tokens uit en wissel nooit van account zonder dat erom gevraagd wordt.
- Na elke afgewerkte of nieuwe stap: werk [docs/STAPPENPLAN.md](docs/STAPPENPLAN.md) bij, en ook het detailbestand van die stap.
