# S11 · Code-review en kwaliteit ✅

**Commits:** 3a1b375 (14 bevindingen), 5fe7962 (prestaties), 7f526e2 (lange knopteksten)

## Belangrijkste fixes
- Afwezige spelers worden overgeslagen in de briefing en in De Test.
- Een onbekende opdracht wordt automatisch overgeslagen.
- Na herladen staat de stap opnieuw op "geef".
- Dubbel tikken wordt geblokkeerd (400 ms).
- Kladversies worden bewaard.
- `RecordPanel` ruimt netjes op.
- De regel "één van de" in de finale geldt vanaf 7 spelers.

## Testen
435 Vitest-tests en 11 browserscenario's met Playwright: spelen, programma, opnemen, stem, gsm, hulpje met nepklok, enz.
