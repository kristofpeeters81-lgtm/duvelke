# S01 · Projectbasis ✅

**Commits:** d0ab091 (projectbasis), e3691a3 (publiceren via GitHub Pages)

## Doel
Een PWA die je kan installeren en die offline werkt. Ze bewaart een spelerslijst, de instellingen en de benodigdheden.

## Wat
- Vite, Svelte 5 en TypeScript strict. vite-plugin-pwa cachet alles voor offline gebruik.
- IndexedDB (`src/lib/db.ts`) met de stores `players`, `kv`, `recordings` en `photos` (DB-versie 3).
- Spelers: naam, kleur of avatar, kind of volwassene. Per spel vink je aan wie meedoet (3–16).
- Instellingen: duur, moeilijkheid, locaties (vinkjes), schat, namen en optionele rollen.
- Benodigdheden: een checklist die bewaard wordt (`src/lib/data/supplies.ts`).
- Wake Lock: het scherm blijft aan (`src/lib/wakelock.ts`).
- Publicatie: `.github/workflows/deploy.yml` draait test, check en build, met `BASE_PATH=/duvelke/`.

## Bestanden
`src/lib/db.ts`, `store.svelte.ts`, `players.ts`, `settings.ts`, `src/screens/Home|Players|Settings|Supplies.svelte`, `vite.config.ts`

## Testen
`players.test.ts`, `settings.test.ts`

## Aandachtspunten
- Navigatie werkt via de hash in de URL, met een backStack.
- Elke instelling wordt bewaard via `persistValue`, met een eigen wachtrij per sleutel.
