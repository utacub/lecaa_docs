# LECAA Docs

Processador de textos senzill amb funcions de text a veu per ajudar usuaris de CAA a aprendre a escriure en català i en castellà. Comparteix paleta, tipografies (Manrope i Andika) i locucions de sons amb [LECAA](https://github.com/utacub/lecaa).

Versió 0.3.0. L'app és gratuïta per a tothom. La planificació completa és a `planificacio.md` del projecte.

## Què fa

- **Català i castellà**: el botó *Català | Castellano* de la barra superior canvia tota l'app d'idioma: la interfície, els noms de les lletres, els teclats en pantalla, els missatges i la veu. Cada idioma té la seva pròpia configuració (la contrasenya de pantalla completa és comuna). En cada idioma només es mostren les veus d'aquell idioma; en castellà, només les de castellà d'Espanya (`es-ES`). El document obert es conserva en canviar d'idioma.
- **Sis tipus de lletra**, totes incloses a l'app i amb llicència lliure (SIL OFL): Andika, Atkinson Hyperlegible, Lexend, OpenDyslexic i dues de **lletra lligada**, Playwrite ES (model escolar) i Playwrite FR Moderne. Es poden aplicar a una part del text o com a lletra de tot el document, i es conserven en desar en .docx (a l'altre ordinador, cal que la lletra hi sigui instal·lada; si no, se'n mostra una de semblant).
- **Pantalla completa amb contrasenya**: un botó amaga la barra d'eines i la configuració i posa l'app en pantalla completa. Només se'n surt amb una contrasenya configurada abans (botó 🔒 a la cantonada). Si es prem Esc, el navegador surt de la pantalla completa, però les barres continuen amagades i apareix un botó per tornar-hi. Es manté després de recarregar. És una protecció pensada per a l'aula, no una barrera de seguretat.
- **Editor net**, amb negreta, cursiva, subratllat, mides de lletra, alineació, llistes, taules senzilles i imatges.
- **Lectura a demanda**: llegeix tot, la selecció o des del cursor, amb pausa i atura. Ressalta la frase i, si el motor ho permet, la paraula.
- **Feedback mentre s'escriu**, combinable:
  - frase (en escriure `.` `?` `!` o en prémer Intro); quan es llegeix la frase, la darrera paraula no es llegeix abans per separat;
  - paraula (en prémer l'espai, i opcionalment amb la puntuació);
  - lletra: **nom** ("be", "ce trencada"…, amb veu sintètica) **o so** (locució enregistrada d'Anna o Jordi). Són excloents.
  - "Cap feedback": només sonen els botons de lectura.
- **Protecció del tecleig**: no accepta cap tecla, física o en pantalla, mentre sona el feedback.
- **Usos indeguts del teclat**: 3 o més tecles alhora, 3 tecles en menys de 60 ms, la mateixa lletra 3 vegades, 6 consonants seguides o una tecla mantinguda. Mantenir premuda la tecla d'esborrar (física o en pantalla) no és un mal ús: va esborrant, com a màxim 4 caràcters per segon. Mostra un avís amable de calma durant 3 segons ("Pensa bé cada lletra que escrius") i bloqueja tota l'activitat. Cada senyal es pot desactivar i el missatge i la durada es poden canviar.
- **Ajust motriu**: ignora la mateixa tecla repetida en menys d'un temps configurable.
- **Teclat en pantalla**: simplificat (cada tecla fa una sola cosa) o QWERTY complet amb majúscules i accents.
- **Veus**: detecta les veus catalanes instal·lades al dispositiu i deixa triar-ne una, amb velocitat, to i volum.
- **Veus catalanes gratuïtes dins l'app** (Configuració > Veu sintètica > Veus catalanes gratuïtes per descarregar). Es descarreguen una vegada, es guarden al dispositiu (IndexedDB) i després funcionen sense connexió a totes les versions, fins i tot al fitxer únic:
  - **Piper**: Ona (63 MB, català central). El motor (fonemitzador espeak-ng i ONNX Runtime en WebAssembly, uns 29 MB) es descarrega amb la veu. Les versions lleugeres d'Ona i Pau s'han retirat per decisió de Marc; si algú les tenia descarregades, l'app n'allibera l'espai.
  - **Piper en castellà d'Espanya** (només a l'app en castellà): Davefx (63 MB, masculina) i Sharvard (77 MB, un model amb una veu femenina i una de masculina). Són les dues veus `es_ES` de qualitat mitjana publicades per Piper; les de qualitat baixa (carlfm, mls) no s'hi han posat.
  - Les veus en línia del navegador (per exemple les naturals de Microsoft a Edge) també es poden triar; a la llista surten marcades "necessita connexió".
- **Documents**: desat automàtic al dispositiu; obrir i desar `.docx` (Google Docs l'obre i l'exporta); imprimir o desar en PDF.
- **Sense connexió**: totes les versions funcionen sense Internet.

## Versions

| Versió | Com s'obté | Veus que veu |
|---|---|---|
| Fitxer únic (`LECAA-Docs.html`) | Es descarrega i s'obre amb el navegador | Les que exposa el navegador + Ona (Piper) descarregada |
| Web (`dist/`) | Es publica en un servidor; es pot instal·lar com a app | Les que exposa el navegador + Ona (Piper) descarregada |
| App d'escriptori (Tauri) | Instal·lador per a Windows (64 i 32 bits), macOS i Linux | **Totes les del sistema** + Ona (Piper) descarregada |

L'app d'escriptori llegeix directament les veus del sistema:

- **Windows**: veus SAPI 5 (incloses les afegides amb NaturalVoiceSAPIAdapter o SAPI Unifier), veus OneCore (Herena de Configuració > Veu) i veus de Microsoft Speech Platform 11 (Herena), sense modificar el registre. La versió de 32 bits veu les veus de 32 bits, com el Speech Platform Runtime x86.
- **macOS**: veus del sistema (AVSpeechSynthesizer).
- **Linux**: speech-dispatcher (eSpeak NG, Festival/Festcat, etc.).
- **Android i iOS**: previstos per a la versió següent.

## Desenvolupament

```bash
npm install
npm run dev            # servidor de desenvolupament
npm run build          # versió web a dist/
npm run build:single   # fitxer únic a dist-single/index.html
npx tauri dev          # app d'escriptori en mode desenvolupament
npx tauri build        # instal·ladors a src-tauri/target/release/bundle/
npx vitest run                              # proves unitàries
node tests/e2e.mjs http://localhost:4173/   # proves (amb `npx vite preview --port 4173` engegat)
PIPER_DIR=… node tests/neural.mjs http://localhost:4173/   # veus Piper reals (model x_low d'Ona a PIPER_DIR/ona, que fa de model mitjà)
```

GitHub Actions (`.github/workflows/build.yml`) genera la versió web, el fitxer únic i els instal·ladors per a totes les plataformes d'escriptori.

## Estructura

```
src/
  main.ts            interfície: barra d'eines, barra de veu, desat
  editor.ts          Tiptap + connexió amb el feedback i la protecció
  feedback.ts        regles de feedback (frase, paraula, lletra)
  letters.ts         noms de les lletres, taula grafia → so, regles de text
  guard.ts           protecció del tecleig, usos indeguts, avís de calma
  keyboard.ts        teclats en pantalla
  reader.ts          lectura a demanda i ressaltat
  speech/            motors de veu (navegador i natiu) i locucions
  speech/neural/     veus dins l'app: catàleg, descàrregues, worker Piper
  docio.ts           .docx (mammoth / docx), fitxers del dispositiu
  settings*.ts       configuració i panell
  assets/sons/       sons aïllats d'Anna i Jordi (de LECAA)
src-tauri/           app d'escriptori i pont natiu de veu (src/tts)
```

## Locucions en castellà (sons de les lletres)

L'opció *Sonido de la letra* no apareix en castellà fins que hi hagi locucions. La llista de fonemes, amb el nom de fitxer i el text per generar cada so, és a `locucions/es.json`. Quan s'hagin triat les veus d'ElevenLabs:

```
ELEVENLABS_API_KEY=... node scripts/locucions-elevenlabs.mjs es nom=VOICE_ID [nom2=VOICE_ID2]
```

Desa els clips a `src/assets/sons/es/<nom>/` i, a la compilació següent, cada carpeta surt com una veu a triar. Cal escoltar cada clip, perquè una veu sintètica no sempre fa bé una consonant aïllada.

## Pendent de validar

- Les taules de castellà: noms de les lletres (RAE i ASALE, 2010) i grafia → so (`src/letters.ts`, `src/phonemes-es.json`).
- La taula de noms de les lletres i la taula grafia → so (`src/letters.ts`).
- Les locucions de sons aïllats, que provenen de LECAA i no s'han revisat fonèticament.
- El comportament de les veus de Speech Platform i de les veus de 32 bits a Windows, i de macOS, en dispositius reals.

## Llicències de tercers

Andika, Manrope, Atkinson Hyperlegible, Lexend, OpenDyslexic, Playwrite ES i Playwrite FR Moderne (via Fontsource): SIL Open Font License 1.1. Tiptap, docx, Tauri, ONNX Runtime Web, piper-wasm i vits-web (Diffusion Studio): MIT. El fonemitzador inclou espeak-ng (GPL-3.0), de manera que les versions que el distribueixen s'han de publicar sota una llicència compatible amb la GPL-3.0. Veu Piper Ona: dades de la UPC (Festcat), CC BY-SA 3.0 ES. Veu Piper Davefx: dades d'OHF-Voice, CC0. Veu Piper Sharvard: corpus Sharvard (Universitat d'Edimburg), CC BY 3.0. Mammoth: BSD-2-Clause. DOMPurify: MPL-2.0 o Apache-2.0. Lucide: ISC. Les locucions d'Anna i Jordi s'han creat per a LECAA.
