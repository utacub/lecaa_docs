# LECAA Docs

Processador de textos senzill amb funcions de text a veu per ajudar usuaris de CAA a aprendre a escriure en català. Comparteix paleta, tipografies (Manrope i Andika) i locucions de sons amb [LECAA](https://github.com/utacub/lecaa).

Versió 0.1.0 (primera versió). La planificació completa és a `planificacio.md` del projecte.

## Què fa

- **Editor net**, amb negreta, cursiva, subratllat, mides de lletra, alineació, llistes, taules senzilles i imatges.
- **Lectura a demanda**: llegeix tot, la selecció o des del cursor, amb pausa i atura. Ressalta la frase i, si el motor ho permet, la paraula.
- **Feedback mentre s'escriu**, combinable:
  - frase (en escriure `.` `?` `!` o en prémer Intro);
  - paraula (en prémer l'espai, i opcionalment amb la puntuació);
  - lletra: **nom** ("be", "ce trencada"…, amb veu sintètica) **o so** (locució enregistrada d'Anna o Jordi). Són excloents.
  - "Cap feedback": només sonen els botons de lectura.
- **Protecció del tecleig**: no accepta cap tecla, física o en pantalla, mentre sona el feedback.
- **Usos indeguts del teclat**: 3 o més tecles alhora, 3 tecles en menys de 60 ms, la mateixa lletra 3 vegades, 6 consonants seguides o una tecla mantinguda. Mostra un avís amable de calma durant 3 segons ("Pensa bé cada lletra que escrius") i bloqueja tota l'activitat. Cada senyal es pot desactivar i el missatge i la durada es poden canviar.
- **Ajust motriu**: ignora la mateixa tecla repetida en menys d'un temps configurable.
- **Teclat en pantalla**: simplificat (cada tecla fa una sola cosa) o QWERTY complet amb majúscules i accents.
- **Veus**: detecta les veus catalanes instal·lades al dispositiu i deixa triar-ne una, amb velocitat, to i volum.
- **Documents**: desat automàtic al dispositiu; obrir i desar `.docx` (Google Docs l'obre i l'exporta); imprimir o desar en PDF.
- **Sense connexió**: totes les versions funcionen sense Internet.

## Versions

| Versió | Com s'obté | Veus que veu |
|---|---|---|
| Fitxer únic (`LECAA-Docs.html`) | Es descarrega i s'obre amb el navegador | Les que exposa el navegador |
| Web (`dist/`) | Es publica en un servidor; es pot instal·lar com a app | Les que exposa el navegador |
| App d'escriptori (Tauri) | Instal·lador per a Windows (64 i 32 bits), macOS i Linux | **Totes les del sistema** |

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
node tests/e2e.mjs http://localhost:4173/   # proves (amb `npx vite preview --port 4173` engegat)
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
  docio.ts           .docx (mammoth / docx), fitxers del dispositiu
  settings*.ts       configuració i panell
  assets/sons/       sons aïllats d'Anna i Jordi (de LECAA)
src-tauri/           app d'escriptori i pont natiu de veu (src/tts)
```

## Pendent de validar

- La taula de noms de les lletres i la taula grafia → so (`src/letters.ts`).
- Les locucions de sons aïllats, que provenen de LECAA i no s'han revisat fonèticament.
- El comportament de les veus de Speech Platform i de les veus de 32 bits a Windows, i de macOS, en dispositius reals.

## Llicències de tercers

Andika i Manrope: SIL Open Font License 1.1. Tiptap, docx, Tauri: MIT. Mammoth: BSD-2-Clause. DOMPurify: MPL-2.0 o Apache-2.0. Lucide: ISC. Les locucions d'Anna i Jordi s'han creat per a LECAA.
