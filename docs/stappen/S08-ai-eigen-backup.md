# S08 · AI-opdrachten, eigen opdrachten en back-up ✅

**Commit:** 73c9fe3

## Wat
- **AI optie A:** je kopieert een prompt naar een gratis chatbot en plakt het antwoord terug.
- **AI optie B:** de app gebruikt een gratis Gemini-sleutel.
- Elke AI-opdracht wordt eerst gecontroleerd (`validate.ts`) en goedgekeurd door het hulpje. Daarna komt ze met een ✨-label in de databank.
- Eigen opdrachten maken en bewerken kan in `TaskEditor`. Een eigen opdracht die in gebruik is, kan je niet wissen.
- **Back-up en herstel** naar een bestand (`backup.ts`). De Gemini-sleutel zit **nooit** in een back-up.

## Testen
`ai.test.ts`, `backup.test.ts`, `validate.test.ts`
