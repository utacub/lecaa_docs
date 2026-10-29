# LECAA Docs

Processador de textos senzill amb funcions de text a veu i pictogrames ARASAAC per ajudar usuaris de CAA a aprendre a escriure, en català, castellà, euskera, gallec, anglès i francès. Comparteix paleta, tipografies (Manrope i Andika) i locucions de sons amb [LECAA](https://github.com/utacub/lecaa), i els idiomes, les veus i els avisos sobre les veus amb LECAA Tecla.

Versió 0.6.0. L'app és gratuïta per a tothom. La planificació completa és a `planificacio.md` del projecte.

## Què fa

- **Sis idiomes**, els de LECAA Tecla: català, castellà, euskera, gallec, anglès i francès. El botó de l'idioma de la barra superior canvia tota l'app: la interfície, els noms de les lletres, els missatges, la veu i els pictogrames. Cada idioma té la seva pròpia configuració (la contrasenya de pantalla completa és comuna). En cada idioma només es mostren les veus d'aquell idioma; en castellà, només les de castellà d'Espanya (`es-ES`); en gallec, després de les gallegues, també les castellanes i les portugueses, perquè no hi ha cap veu gallega lliure que funcioni dins el navegador (la configuració ho explica, com a LECAA Tecla). El document obert es conserva en canviar d'idioma.
  - Euskera, gallec, anglès i francès tradueixen el text català de cada missatge a `src/lang/*.ts`. Aquestes traduccions s'han fet amb Claude, com les de LECAA Tecla, i les ha de revisar algú que parli cada idioma.
  - Només el català i el castellà tenen sons de les lletres enregistrats: en els altres idiomes, l'opció de so no hi és i el feedback de lletra en diu el nom.
  - Quan no es troba cap veu de l'idioma, la configuració explica com instal·lar-ne una a Windows, iOS i macOS i Android.
- **Pictogrames ARASAAC** damunt de les paraules, en els sis idiomes: en acabar una paraula (espai, puntuació o Intro), n'apareix el pictograma damunt. Reconeix formes flexionades (*menjo*, *comemos*, *etxean*, *cans*, *ate*, *mangent*), l'apòstrof (*l'aigua*, *l'eau*, *I'm*) i algunes expressions (*pa amb tomàquet*, *pan con tomate*). Per defecte, no en posa als articles, preposicions, conjuncions i pronoms febles.
  - Botó de la barra d'eines per activar-los i desactivar-los; a la configuració, apartat *Pictogrames ARASAAC*: mida, paraules amb contingut i «Desa'ls tots» per fer-los servir sense connexió (70 MB) a la versió web.
  - **Com es veuen** (Configuració > Pictogrames ARASAAC): *Sempre* (per defecte), *Uns segons* (s'esvaeixen al cap d'1 a 10 segons d'acabar la paraula; es pot triar el temps) o *Només en tocar la paraula*. En els dos últims modes, la paraula on és el cursor o que es toca torna a mostrar el seu pictograma; un pictograma amagat no obre el selector. Als documents desats i impresos hi són sempre tots (`src/pictos.ts`, classes `pictos-fade` i `pictos-caret`).
  - Tocant un pictograma se'n tria un altre per a aquella paraula, o cap (la tria es recorda per a cada idioma).
  - Quan es veuen, també es desen al .docx i al PDF, damunt de cada paraula com a la pantalla (`src/pictos-export.ts`). Al .docx, cada línia són dos paràgrafs (pictogrames i paraules) amb un tabulador centrat per paraula, sense taules, perquè es vegi igual en qualsevol processador de textos i el text es pugui continuar editant (comprovat amb LibreOffice); al PDF el text es pot seleccionar.
  - El fitxer únic obert des del disc necessita la carpeta `pictos` al costat; no pot llegir-ne les imatges per desar-les al document, i desa només el text (ho avisa).
- **Sis tipus de lletra**, totes incloses a l'app i amb llicència lliure (SIL OFL): Andika, Atkinson Hyperlegible, Lexend, OpenDyslexic i dues de **lletra lligada**, Playwrite ES (model escolar) i Playwrite FR Moderne. Es poden aplicar a una part del text o com a lletra de tot el document, i es conserven en desar en .docx (a l'altre ordinador, cal que la lletra hi sigui instal·lada; si no, se'n mostra una de semblant).
- **Sobre LECAA Docs**: el botó ⓘ de la barra superior obre una explicació de l'app i els crèdits, amb els logos de la UTAC, la UB, la Fundació Bosch i Gimpera i els dos departaments de la Generalitat (els mateixos de LECAA).
- **Pantalla completa amb contrasenya**: un botó amaga la barra d'eines i la configuració i posa l'app en pantalla completa. Només se'n surt amb una contrasenya configurada abans (botó 🔒 a la cantonada). Si es prem Esc, el navegador surt de la pantalla completa, però les barres continuen amagades i apareix un botó per tornar-hi. Es manté després de recarregar. És una protecció pensada per a l'aula, no una barrera de seguretat.
- **Editor net**, amb negreta, cursiva, subratllat, mides de lletra, alineació, llistes, taules senzilles i imatges.
- **Lectura a demanda**: llegeix tot, la selecció o des del cursor, amb pausa i atura. Ressalta la frase i, si el motor ho permet, la paraula.
- **Lletreja**: en seleccionar una paraula o menys (sense cap espai al mig; com a màxim un a cada extrem), apareix sota la selecció un menú amb el botó «Lletreja», que diu el nom de cada lletra per ordre (i «majúscula» quan cal) i la ressalta mentre la diu (`src/spell-menu.ts`, `reader.spell`). Desapareix en escriure o en canviar la selecció.
- **Feedback mentre s'escriu**, combinable:
  - frase (en escriure `.` `?` `!` o en prémer Intro); quan es llegeix la frase, la darrera paraula no es llegeix abans per separat;
  - paraula (en prémer l'espai, i opcionalment amb la puntuació);
  - lletra: **nom** ("be", "ce trencada"…, amb veu sintètica) **o so** (locució enregistrada d'Anna o Jordi). Són excloents.
  - "Cap feedback": només sonen els botons de lectura.
- **Protecció del tecleig**: no accepta cap tecla, física o en pantalla, mentre sona el feedback.
- **Usos indeguts del teclat**: 3 o més tecles alhora, 3 tecles en menys de 60 ms, la mateixa lletra 3 vegades, 6 consonants seguides o una tecla mantinguda. Mantenir premuda la tecla d'esborrar (física o del teclat en pantalla) no és un mal ús: va esborrant, com a màxim 4 caràcters per segon. Mostra un avís amable de calma durant 3 segons ("Pensa bé cada lletra que escrius") i bloqueja tota l'activitat. Cada senyal es pot desactivar i el missatge i la durada es poden canviar.
- **Ajust motriu**: ignora la mateixa tecla repetida en menys d'un temps configurable.
- **Teclats**: l'app no té teclat en pantalla propi. Funciona amb el teclat físic (també connectat a una tauleta) i amb el teclat en pantalla de cada sistema: Windows, iPadOS, Android, ChromeOS i Linux. El feedback i les proteccions es calculen a partir del text que entra, perquè molts teclats en pantalla no diuen quina tecla s'ha premut (Android) o componen la paraula. Quan el teclat del sistema tapa la part de baix de la pantalla, l'app s'ajusta a la part visible i el cursor no queda amagat.
- **So a l'iPad i l'iPhone**: el primer toc o la primera tecla desbloqueja el so; els sons de les lletres es descodifiquen per endavant i sonen amb Web Audio, i l'app declara que reprodueix so (Safari 16.4 o posterior) perquè l'interruptor de silenci no els apagui.
- **Veus**: detecta les veus catalanes instal·lades al dispositiu i deixa triar-ne una, amb velocitat, to i volum.
- **Veus catalanes gratuïtes dins l'app** (Configuració > Veu sintètica > Veus catalanes gratuïtes per descarregar). Es descarreguen una vegada, es guarden al dispositiu (IndexedDB) i després funcionen sense connexió a totes les versions, fins i tot al fitxer únic:
  - **Piper**: Ona (63 MB, català central). El motor (fonemitzador espeak-ng i ONNX Runtime en WebAssembly, uns 29 MB) es descarrega amb la veu. Les versions lleugeres d'Ona i Pau s'han retirat per decisió de Marc; si algú les tenia descarregades, l'app n'allibera l'espai.
  - **Piper en castellà d'Espanya** (només a l'app en castellà): Davefx (63 MB, masculina) i Sharvard (77 MB, un model amb una veu femenina i una de masculina). Són les dues veus `es_ES` de qualitat mitjana publicades per Piper; les de qualitat baixa (carlfm, mls) no s'hi han posat.
  - **Piper en euskera**: Maider (femenina) i Antton (masculina), 63 MB cadascuna. **En gallec**, com a LECAA Tecla: Davefx i Tugão (portuguès de Portugal), perquè Piper no té cap veu gallega. En anglès i francès no se n'ofereix cap per descarregar: tots els sistemes en porten.
  - Les veus en línia del navegador (per exemple les naturals de Microsoft a Edge) també es poden triar; a la llista surten marcades "necessita connexió".
- **Els meus documents**: cada document es desa sol al dispositiu (IndexedDB), amb el dia que es va començar i el de l'últim canvi. El botó de la carpeta obre la llista (l'últim canviat primer, amb les primeres paraules), des d'on s'obre un document, se n'esborra un o se n'obre un del dispositiu (.docx, .html, .txt), que s'hi afegeix com a document nou. «Document nou» ja no esborra l'anterior: queda a la llista. Canviar de document no en modifica les dates ni deixa desfer cap al document anterior; un document en blanc no s'hi guarda. El document de les versions anteriors hi surt tal com era (`src/storage.ts`, `src/documents.ts`). En una finestra privada sense IndexedDB només se'n pot guardar un, com abans.
- **Documents**: obrir i desar `.docx` (Google Docs l'obre i l'exporta); imprimir o desar en PDF.
- **Marc teòric**: botó a «Sobre LECAA Docs», just sota «La idea», que obre un text que argumenta les opcions de l'app a partir de la recerca, amb cites i 50 referències en APA 7, en els sis idiomes (`src/framework.ts`, `src/marc-teoric/`). El text original és el català (`ca.ts`); les referències són comunes (`referencies.ts`) i s'han comprovat amb Crossref, PubMed, ERIC o l'editorial; el DOI només hi és quan s'ha pogut confirmar. Les onze referències afegides el 29/10/2026, a partir dels textos que va aportar Marc, s'han comprovat amb el mateix document (Crossref no era accessible des de l'entorn de treball). Diu explícitament quines opcions es basen en evidència indirecta o en la pràctica professional de la UTAC.
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
node tests/pictos.mjs http://localhost:4173/   # pictogrames, també al .docx, al PDF i al fitxer únic
node tests/langs.mjs http://localhost:4173/    # euskera, gallec, anglès i francès
node tests/pwa.mjs http://lecaa.test:4174      # app instal·lada i pictogrames sense connexió (amb `python3 -m http.server 4174 --bind 127.0.0.1 -d dist`)
node tests/voices-langs.mjs http://localhost:4173/   # veus Piper reals d'euskera i gallec (necessita connexió a Hugging Face)
PIPER_DIR=… node tests/neural.mjs http://localhost:4173/   # veus Piper reals (model x_low d'Ona a PIPER_DIR/ona, que fa de model mitjà)
```

## Publicació

La versió web es publica a GitHub Pages: **https://utacub.github.io/lecaa_docs/**. La versió portàtil (fitxer únic) és al costat, a **https://utacub.github.io/lecaa_docs/LECAA-Docs.html**, i també s'enllaça des de «Sobre LECAA Docs».

GitHub Actions (`.github/workflows/build.yml`) fa la feina a cada canvi a `main`: genera la versió web i el fitxer únic, passa les proves al navegador (també amb les veus Piper reals) i, si tot és correcte, publica el lloc. Una sola vegada, cal triar **Settings > Pages > Build and deployment > Source: GitHub Actions** al repositori. Els instal·ladors d'escriptori només es generen amb una etiqueta de versió (`v0.4.0`, per exemple) o a mà des de la pestanya Actions.

- La web funciona sense connexió un cop oberta: el service worker desa tots els fitxers de la versió i, quan se'n publica una de nova, la baixa sola i esborra l'anterior.
- Es pot instal·lar com a app (Chrome, Edge, Chromebook, Android; a l'iPad i l'iPhone, Compartir > Afegeix a la pantalla d'inici).
- Tot funciona amb rutes relatives, de manera que també es pot publicar en qualsevol altre servidor o subcarpeta copiant-hi `dist/`.

## Estructura

```
src/
  main.ts            interfície: barra d'eines, barra de veu, desat
  editor.ts          Tiptap + connexió amb el feedback i la protecció
  feedback.ts        regles de feedback (frase, paraula, lletra)
  letters.ts         noms de les lletres, taula grafia → so, regles de text
  guard.ts           protecció del tecleig, usos indeguts, avís de calma
  reader.ts          lectura a demanda, lletrejar i ressaltat
  spell-menu.ts      menú «Lletreja» sota una paraula seleccionada
  storage.ts         documents desats al dispositiu (IndexedDB)
  documents.ts       finestra «Els meus documents»
  about.ts           «Sobre LECAA Docs»
  framework.ts       «Marc teòric»; el text de cada idioma és a marc-teoric/
  viewport.ts        ajust a la part visible quan s'obre el teclat del sistema
  speech/            motors de veu (navegador i natiu) i locucions
  speech/audio.ts    so amb Web Audio i desbloqueig a l'iPad i l'iPhone
  speech/neural/     veus dins l'app: catàleg, descàrregues, worker Piper
  docio.ts           .docx (mammoth / docx), fitxers del dispositiu
  i18n.ts, lang/     idiomes: T('català', 'castellà') i traduccions a l'euskera, el gallec, l'anglès i el francès
  pictos.ts          pictogrames damunt de les paraules (decoracions de ProseMirror) i tria
  pictos-export.ts   pictogrames al .docx i al PDF
  settings*.ts       configuració i panell
  assets/sons/       sons aïllats d'Anna i Jordi (de LECAA); es/anna: castellà (de LECAA Tecla)
src-tauri/           app d'escriptori i pont natiu de veu (src/tts)
public/pictos/       pictogrames ARASAAC (img/, 192 px) i un índex de paraules per idioma (index-ca.js … index-fr.js)
scripts/pictos-*.py  generació dels índexs (pictos-index.py, pictos-formes.py, pictos-formes-es.py), de les imatges i dels paquets per desar-los tots
```

## Locucions en castellà (sons de les lletres)

En castellà, els sons de les lletres són de la veu de l'Anna (ElevenLabs), a `src/assets/sons/es/anna/`. Des del 28/10/2026, per decisió de Marc, són els mateixos sons de l'activitat «Blanco sobre negro» de LECAA Tecla (`utacub/lecaa_tecla`, `assets/sons/phonemes/`, banc castellà de LECAA Cast) i segueixen la mateixa correspondència entre lletra i so, revisada per Marc el 24/10/2026: c, k i q = /k/; g = /g/; r = /r/; v = /b/; z = /θ/; j = /x/; y = /ʝ/; ñ = /ɲ/; la x (/ʃ/) i la w (/w/) són de l'Anna del banc català, i la h no sona. Substitueixen els de Mateo i Jordi. Els MP3 s'han copiat sense canvis; els tres WAV (/θ/, /x/, /ʝ/) s'han passat a MP3 mono sense canviar-ne el volum. L'origen de cada clip és a `locucions/es.json`.

Cada carpeta de `src/assets/sons/es/` surt com una veu a triar a la compilació següent.

## Pendent de validar

- Les traduccions a l'euskera, el gallec, l'anglès i el francès (`src/lang/*.ts`), fetes amb Claude, i les instruccions per instal·lar veus en aquests idiomes a cada sistema.
- El marc teòric (`src/marc-teoric/`): el text català, i les traduccions al castellà, l'euskera, el gallec, l'anglès i el francès, fetes amb Claude. Set articles no porten DOI perquè no s'ha pogut confirmar (Benson-Goldberg i Erickson, 2020; Ehri, 2014; Fossett i Mirenda, 2006; Foulin, 2005; Graham et al., 2015; Samuels, 1970; Share, 1995). Les pàgines d'Ehri (2014), Erickson et al. (2010), Fossett i Mirenda (2006), Foulin (2005), Graham et al. (2015), Hayes i Flower (1980), Jones et al. (2007), Piasta i Wagner (2010), Raskind i Higgins (1995) i Share (1995), i el número de Samuels (1970), no s'han pogut veure a la font original; Fossett i Mirenda (2006) i Samuels (1970) s'han comprovat a través d'articles que els citen.
- Les fonts afegides al marc teòric el 29/10/2026. Les dues memòries de Garriga Ferriol (2003a, 2003b) són llicències d'estudis del Departament d'Ensenyament no publicades; l'any s'ha deduït del curs 2002-2003, i no tenen DOI ni editorial. El PDF de Collins et al. (2024) no indica el número del volum 36. Ulriksen et al. (2026b) és una publicació avançada en línia sense pàgines, i la data de la cerca no coincideix entre el resum (març del 2023) i el mètode (18 d'octubre del 2024). El resum d'Ulriksen et al. (2026a) descriu les associacions d'una manera poc coherent amb els resultats; el text segueix la taula 3. Caron et al. (2021) s'ha llegit en la versió acceptada de l'autor (PMC), no en la de l'editorial. A Palmqvist et al. (2025), dos autors són propietaris de l'aplicació Animega-is que s'hi avalua. Les diapositives d'Afonso Carballo i Farré Perdiguer sobre la consciència fonològica no s'han citat perquè no tenen data ni editorial, i el seu contingut ja és a Garriga Ferriol (2003b). Que la veu de l'app faci de «veu externa» és una inferència, i el text ho diu.
- Les formes de les paraules en euskera i en anglès surten de regles generals (`scripts/pictos-formes.py`): algunes formes poc habituals no tenen pictograma.
- El .docx amb pictogrames només s'ha comprovat amb LibreOffice (no amb Word ni Google Docs).
- Les taules de castellà: noms de les lletres (RAE i ASALE, 2010) i grafia → so (`src/letters.ts`, `src/phonemes-es.json`).
- La taula de noms de les lletres i la taula grafia → so (`src/letters.ts`).
- Les locucions de sons aïllats, que provenen de LECAA i no s'han revisat fonèticament.
- El comportament de les veus de Speech Platform i de les veus de 32 bits a Windows, i de macOS, en dispositius reals.

## Llicència

LECAA Docs és programari lliure: es distribueix amb la llicència **GNU General Public License 3.0 o posterior** (GPL-3.0-or-later), que és al fitxer `LICENSE`. Es pot fer servir, estudiar, modificar i redistribuir; les versions modificades que es distribueixin s'han de publicar amb la mateixa llicència i amb el codi font. Els documents que es creen amb l'app són de qui els escriu i no queden afectats per la llicència.

La llicència cobreix el codi. **No** cobreix els pictogrames ARASAAC (carpeta `public/pictos`), que són una obra separada amb llicència pròpia (vegeu més avall), ni els logotips de la UTAC, de LECAA, de LECAA Docs ni de les institucions (Universitat de Barcelona, Fundació Bosch i Gimpera i Generalitat de Catalunya), que són marques dels seus titulars i no es poden fer servir sense el seu permís, ni les locucions i les tipografies, que conserven les condicions indicades a continuació.

## Llicències de tercers

Andika, Manrope, Atkinson Hyperlegible, Lexend, OpenDyslexic, Playwrite ES i Playwrite FR Moderne (via Fontsource): SIL Open Font License 1.1. Tiptap, docx, Tauri, ONNX Runtime Web, piper-wasm i vits-web (Diffusion Studio): MIT. El fonemitzador inclou espeak-ng (GPL-3.0), de manera que les versions que el distribueixen s'han de publicar sota una llicència compatible amb la GPL-3.0. Veu Piper Ona: dades de la UPC (Festcat), CC BY-SA 3.0 ES. Veu Piper Davefx: dades d'OHF-Voice, CC0. Veu Piper Sharvard: corpus Sharvard (Universitat d'Edimburg), CC BY 3.0. Veus Piper Maider i Antton: dades d'itzune, CC BY 4.0. Veu Piper Tugão: CC0. Mammoth: BSD-2-Clause. pdfmake (exportació a PDF): MIT. OpenDyslexic per al PDF (els OTF de la seva publicació oficial, [antijingoist/opendyslexic](https://github.com/antijingoist/opendyslexic), a `src/assets/fonts/opendyslexic` amb el text de la llicència): SIL Open Font License 1.1 (Abbie Gonzalez), com la de la pantalla. DOMPurify: MPL-2.0 o Apache-2.0. Lucide: ISC. Les locucions d'Anna i Jordi s'han creat per a LECAA; les castellanes de l'Anna provenen de LECAA Cast i LECAA Tecla. Els logos de la UTAC (`src/assets/marca/utac-negre.webp` per a fons clars i `utac-blanc.webp` per a fons foscos, facilitats per la UTAC) i de LECAA són marques de la UTAC; el de LECAA Docs és el de LECAA amb «Docs» en Lexend.

**Pictogrames** (`public/pictos`): *Autor pictogramas: Sergio Palao. Origen: ARASAAC (https://arasaac.org). Licencia: CC (BY-NC-SA). Propiedad: Gobierno de Aragón (España).* Llicència [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.ca), segons les [condicions d'ús d'ARASAAC](https://arasaac.org/terms-of-use): no es poden fer servir amb finalitat comercial, i les obres que se'n facin s'han de compartir amb la mateixa llicència i citant autor, origen, llicència i propietari. Les imatges s'han reduït a 192 px amb 256 colors. Els documents desats amb pictogrames porten aquesta cita al peu de cada pàgina (.docx i PDF), i la pàgina impresa, al final; la configuració i «Sobre LECAA Docs» també la mostren. Les formes de les paraules de cada índex vénen de [catalan-dict-tools de Softcatalà](https://github.com/Softcatala/catalan-dict-tools) (GPL 2.0 / LGPL 2.1), de [spanish-dict-tools de Jaume Ortolà](https://github.com/jaumeortola/spanish-dict-tools) (LGPL 2.1) i, a través de [FreeLing](https://github.com/TALP-UPC/FreeLing), del diccionari gallec d'OpenTrad (Seminario de Lingüística Informática de la Universidade de Vigo, ampliat per Pablo Gamallo i Marcos Garcia, CC BY-SA 3.0) i del Lefff francès (Benoît Sagot, LGPL-LR); les de l'euskera i l'anglès, de regles pròpies. Detalls a `public/pictos/LLICENCIA.txt`.
