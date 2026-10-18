# LECAA Docs

Processador de textos senzill amb funcions de text a veu per ajudar usuaris de CAA a aprendre a escriure en català. Comparteix paleta, tipografies (Manrope i Andika) i locucions de sons amb [LECAA](https://github.com/utacub/lecaa).

Versió 0.2.0. L'app és gratuïta per a tothom. La planificació completa és a `planificacio.md` del projecte.

## Què fa

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
  - **Veus Aina (Matxa v2, BSC)**, *experimental*: 16 veus en 5 variants (balear, central, nord-occidental, valencià i septentrional), 273 MB. Abans de descarregar-les, l'usuari ha d'acceptar la llicència no comercial del BSC.
  - Les veus en línia del navegador (per exemple les naturals de Microsoft a Edge) també es poden triar; a la llista surten marcades "necessita connexió".
- **Documents**: desat automàtic al dispositiu; obrir i desar `.docx` (Google Docs l'obre i l'exporta); imprimir o desar en PDF.
- **Sense connexió**: totes les versions funcionen sense Internet.

## Versions

| Versió | Com s'obté | Veus que veu |
|---|---|---|
| Fitxer únic (`LECAA-Docs.html`) | Es descarrega i s'obre amb el navegador | Les que exposa el navegador + Piper i Aina descarregades |
| Web (`dist/`) | Es publica en un servidor; es pot instal·lar com a app | Les que exposa el navegador + Piper i Aina descarregades |
| App d'escriptori (Tauri) | Instal·lador per a Windows (64 i 32 bits), macOS i Linux | **Totes les del sistema** + Piper i Aina descarregades |

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
  speech/neural/     veus dins l'app: catàleg, descàrregues, worker Piper/Matxa
  docio.ts           .docx (mammoth / docx), fitxers del dispositiu
  settings*.ts       configuració i panell
  assets/sons/       sons aïllats d'Anna i Jordi (de LECAA)
src-tauri/           app d'escriptori i pont natiu de veu (src/tts)
```

## Pendent de validar

- La taula de noms de les lletres i la taula grafia → so (`src/letters.ts`).
- Les locucions de sons aïllats, que provenen de LECAA i no s'han revisat fonèticament.
- El comportament de les veus de Speech Platform i de les veus de 32 bits a Windows, i de macOS, en dispositius reals.
- **Veus Aina (Matxa)**: el model real (273 MB) encara no s'ha pogut executar des de l'entorn de desenvolupament, perquè el CDN de Hugging Face hi està bloquejat. L'entrada i la sortida segueixen la demo oficial del BSC per a aquest mateix fitxer ONNX (`app.py` i `text/` a `huggingface.co/spaces/BSC-LT/matxa-tts-v2`): el text es prepara com `catalan_text` (sense puntuació) i l'àudio és la segona sortida del model, no la primera. L'app tria la sortida d'àudio per mida, de manera que funciona amb qualsevol dels dos ordres. Falta mesurar la memòria i la velocitat en un dispositiu real.
- Veus Aina: el model fals de `tests/fixtures/` té les mateixes entrades (`x`, `x_lengths`, `scales`, `spks`) i, com el real, l'àudio a la segona sortida. Si la veu no genera so, l'app ho diu en pantalla en lloc de quedar en silenci.
- Veus Aina: la numeració dels parlants 0 a 7 difereix entre la fitxa del model (Olga 0, Quim 1, Elia 2, Grau 3…) i el `spk_to_id_multiaccent.json` de la demo (Quim 0, Olga 1, Grau 2, Elia 3…). L'app segueix la fitxa; si una veu femenina sona masculina, cal intercanviar els parells.

## Llicències de tercers

Andika i Manrope: SIL Open Font License 1.1. Tiptap, docx, Tauri, ONNX Runtime Web, piper-wasm i vits-web (Diffusion Studio): MIT. El fonemitzador inclou espeak-ng (GPL-3.0), de manera que les versions que el distribueixen s'han de publicar sota una llicència compatible amb la GPL-3.0. Veus Piper Ona i Pau: dades de la UPC (Festcat), CC BY-SA 3.0 ES. Veus Aina (Matxa v2): llicència RAIL no comercial del BSC (custom-ro-nc-openrail-m), només per a finalitats acadèmiques, de recerca o sense ànim de lucre; l'app la mostra i en demana l'acceptació abans de descarregar-les. Mammoth: BSD-2-Clause. DOMPurify: MPL-2.0 o Apache-2.0. Lucide: ISC. Les locucions d'Anna i Jordi s'han creat per a LECAA.
