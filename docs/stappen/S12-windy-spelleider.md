# S12 · Windy leidt het spel ✅

**Commit:** 2e30e3d

## Doel
Windy is de spelleider. De mens wordt haar fysieke "hulpje".

## Wat
- `wording.ts`: `hostWording()` maakt van "de spelleider leest/zegt/…" de naam van Windy. Alle andere vermeldingen worden "het hulpje".
- `ReadAloud`: Windy leest geheime lijsten (fabeltjes) voor zonder de antwoorden. Daarna komen "Antwoord? 💡" en "✓ Juist / ✗ Fout".
- `WindyPopup`: Windy bemoeit zich ermee.
  - halverwege de tijd, en vlak voor het einde
  - bij uitleg zonder timer, na 75 s en na 180 s
- Nieuwe soorten uitspraken: bemoeien, tijd, schat-gewonnen, schat-verloren, ontmaskerd, winnaar.
- Windy vertelt de finale: de schat, de ontmaskering ("… is géén Duvelke!") en de ranglijst.
- Overal in de app is "spelleider" vervangen door "hulpje": de schermen, de handleiding en het uitlegscherm.

## Bestanden
`src/lib/tasks/wording.ts`, `src/screens/game/ReadAloud.svelte`, `src/components/WindyPopup.svelte`, `src/screens/game/EndGame.svelte`
