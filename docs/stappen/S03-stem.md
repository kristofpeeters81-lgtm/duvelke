# S03 · Stem: Vlaamse AI-stem en zelf inspreken ✅

**Commits:** 7ad00c3, 9578e1f, 8ae1ea7, 18ba4ba (namen), 5fe7962 (voorbereiden)

## Doel
Windy klinkt Vlaams en werkt offline.

## Wat
De stem wordt in deze volgorde gekozen:
1. **Een eigen opname** per uitspraak. Namen spreek je apart in, voor de doorgeef-zinnen.
2. **De Piper-stem `nl_BE-rdh-medium`.** Die draait in de browser, wordt één keer gedownload (±60 MB, in OPFS) en werkt daarna offline. De toonhoogte komt van de afspeelsnelheid (standaard 1,2).
3. **De toestelstem** (Web Speech) als reserve.

- Buurvrouw Josée praat met de stem Nathalie.
- Er is een uitspraaklijst voor woorden zonder klinkers en voor HOOFDLETTERS (`toSpeech` in `voice.ts`).
- Zinnen worden één voor één gemaakt, via een wachtrij. Een zin die niet meer nodig is, geeft een `StaleSpeechError`.
- De uitleg van een opdracht wordt alvast op voorhand gemaakt.

## Bestanden
`src/lib/piper.ts`, `speech.ts`, `voice.ts`, `recorder.ts`, `src/components/RecordPanel.svelte`, `src/screens/VoiceTest.svelte`

## Aandachtspunten
- `onnxruntime-web` staat vast op 1.18.0. Nieuwere versies werken niet met piper-tts-web.
- Een half gedownload model geeft een `BrokenVoiceError`. Het wordt dan opgeruimd.
