# S02 · Geheime rollen en Windy ✅

**Commits:** 1e6527f, 0a139d5 (minimum 3 spelers)

## Doel
De rollen worden verdeeld terwijl de tablet rondgaat, zonder dat iemand iets verraadt. Windy krijgt een eigen cartoon en uitspraken.

## Wat
- Aantal Duvelkes:
  - 3–6 spelers: 1
  - 7–11 spelers: 1, met 30% kans op 2
  - 12–16 spelers: 1, met 30% kans op 2 en 10% kans op 3
- De Duvelkes weten niet van elkaar.
- Optionele rollen: Speurneus en Bemoeial.
- Iedereen beantwoordt dezelfde profielvragen (`src/lib/data/profile.ts`). Die vragen komen later terug in De Test.
- `HoldToReveal`: je moet ingedrukt houden om iets te zien, zodat niemand per ongeluk iets ziet.
- `Dossier`: alle geheime kaartjes zien er hetzelfde uit.
- Windy is een eigen SVG: een zwarte pruik met blond haar eronder, een gestreepte trui en vier stemmingen.
- Uitsprakenlijst per soort (`src/lib/data/windyLines.ts`) met de plaatshouders {saboteur}, {zoon}, {windy} en {speler}. Je kan uitspraken aan- en uitzetten en zelf toevoegen (`WindyScreen`).

## Bestanden
`src/lib/game.ts`, `windy.ts`, `src/components/Windy|WindyBubble|HoldToReveal|Dossier.svelte`, `src/screens/game/RoleReveal.svelte`

## Testen
`game.test.ts`, `windy.test.ts`
