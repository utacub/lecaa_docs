import { X } from 'lucide';
import { FONTS } from './fonts';
import { guard } from './guard';
import { isLangVoice, LANG, T } from './i18n';
import { askNewPassword } from './lock';
import { inTauri } from './speech/native';
import { settings, type LetterMode, type Settings } from './settings';
import { recordedVoices, speech, type VoiceInfo } from './speech';
import { neural } from './speech/neural';
import { MODELS } from './speech/neural/catalog';
import { h, icon, toast } from './ui';

type Upd = (fn: (s: Settings) => void) => void;
const upd: Upd = fn => settings.update(fn);

function check(label: string, sub: string | null, get: (s: Settings) => boolean, set: (s: Settings, v: boolean) => void) {
  const input = h('input', { type: 'checkbox' }) as HTMLInputElement;
  input.checked = get(settings.value);
  input.addEventListener('change', () => upd(s => set(s, input.checked)));
  return h('label', { class: 'opt' }, input, h('span', {}, label, sub ? h('span', { class: 'sub' }, sub) : null));
}

function radio(name: string, value: string, label: string, sub: string | null, current: string, onPick: () => void) {
  const input = h('input', { type: 'radio', name, value }) as HTMLInputElement;
  input.checked = current === value;
  input.addEventListener('change', () => { if (input.checked) onPick(); });
  return h('label', { class: 'opt' }, input, h('span', {}, label, sub ? h('span', { class: 'sub' }, sub) : null));
}

function range(label: string, min: number, max: number, step: number, get: (s: Settings) => number, set: (s: Settings, v: number) => void, fmt: (v: number) => string) {
  const out = h('span', {}, fmt(get(settings.value)));
  const input = h('input', { type: 'range', min, max, step }) as HTMLInputElement;
  input.value = String(get(settings.value));
  input.addEventListener('input', () => { out.textContent = fmt(Number(input.value)); upd(s => set(s, Number(input.value))); });
  return h('div', { class: 'field' }, h('label', {}, label, ': ', out), input);
}

function voiceLabel(v: VoiceInfo) {
  const offline = v.offline === false ? T(' · necessita connexió', ' · necesita conexión') : '';
  return `${v.name} (${v.lang})${offline}`;
}

function noVoicesHelp() {
  const ua = navigator.userAgent;
  const where = LANG === 'es'
    ? /Android/i.test(ua)
      ? 'En Android, instala una voz en español de España (Google o Samsung) en Ajustes > Accesibilidad > Salida de texto a voz.'
      : /iPhone|iPad|Mac OS/i.test(ua)
        ? 'En iOS y macOS, descarga las voces Mónica o Jorge (español de España) en Ajustes > Accesibilidad > Contenido leído > Voces.'
        : /Windows/i.test(ua)
          ? 'En Windows, añade el idioma Español (España) con su voz en Configuración > Hora e idioma > Voz (voces Helena, Laura o Pablo). La app para Windows las detecta todas; el navegador solo ve una parte.'
          : 'Instala una voz en español de España en el sistema y vuelve a cargar la lista.'
    : /Android/i.test(ua)
      ? 'A Android, instal·la una veu catalana (Google, Acapela o Vocalizer) a Configuració > Accessibilitat > Text a veu. La versió web no pot veure totes les veus d’Android: fes servir l’app per a Android quan estigui disponible.'
      : /iPhone|iPad|Mac OS/i.test(ua)
        ? 'A iOS i macOS, descarrega les veus Jordi, Montse o Pau a Configuració > Accessibilitat > Contingut llegit > Veus. Safari no mostra totes les veus descarregades a la versió web; l’app instal·lable sí que les veurà.'
        : /Windows/i.test(ua)
          ? 'A Windows, afegeix la veu catalana Herena des de Configuració > Hora i idioma > Veu, o instal·la Microsoft Speech Platform amb la veu Herena. L’app per a Windows les detecta totes; el navegador només en veu una part.'
          : 'Instal·la una veu catalana al sistema i torna a carregar la llista.';
  return h('div', { class: 'voice-list-empty' },
    T('No s’ha trobat cap veu catalana en aquest dispositiu. ', 'No se ha encontrado ninguna voz en castellano de España en este dispositivo. '), where,
    T(' També pots descarregar una veu catalana gratuïta aquí sota: funciona en qualsevol dispositiu i sense connexió.',
      ' También puedes descargar una voz gratuita aquí abajo: funciona en cualquier dispositivo y sin conexión.'));
}

const mb = (bytes: number) => `${Math.round(bytes / 1_000_000)} MB`;

// Free Catalan voices that run inside the app: download once, then they work offline.
function neuralVoicesBox(onInstalled: (voiceId: string) => void) {
  const box = h('div', { class: 'neural-list' });
  const render = async () => {
    const rows = await Promise.all(MODELS.filter(m => m.lang === LANG).map(async m => {
      const st = await neural.state(m.key);
      const status = st.state === 'downloading'
        ? h('div', { class: 'neural-progress' },
          h('progress', { max: st.total || 1, value: st.loaded, 'aria-label': T(`Descarregant ${m.title}`, `Descargando ${m.title}`) }),
          h('span', {}, `${mb(st.loaded)} ${T('de', 'de')} ${mb(st.total)}`))
        : st.state === 'installed'
          ? h('div', { class: 'row' },
            h('span', { class: 'neural-ok' }, T('Descarregada · funciona sense connexió', 'Descargada · funciona sin conexión')),
            h('button', { class: 'small-btn', type: 'button', onclick: async () => {
              if (!confirm(T(`Vols esborrar ${m.title} d’aquest dispositiu?`, `¿Quieres borrar ${m.title} de este dispositivo?`))) return;
              await neural.uninstall(m.key);
            } }, T('Esborra', 'Borrar')))
          : h('button', { class: 'small-btn', type: 'button', 'data-install': m.key, onclick: async () => {
            if (m.mustAccept && !confirm(`${m.mustAccept}\n\n${T('Llicència', 'Licencia')}: ${m.licenceUrl}`)) return;
            if (!navigator.onLine) { toast(T('Cal connexió a internet per descarregar la veu', 'Hace falta conexión a internet para descargar la voz')); return; }
            try {
              await neural.install(m.key);
              await speech.refresh();
              toast(T(`${m.title} ja és a punt`, `${m.title} ya está lista`));
              onInstalled('neural:' + m.voices[0].id);
            } catch {
              toast(T('No s’ha pogut descarregar la veu. Torna-ho a provar més tard.', 'No se ha podido descargar la voz. Vuelve a intentarlo más tarde.'));
            }
          } }, `${T('Descarrega', 'Descargar')} (${mb(await neural.downloadSize(m))})`);
      return h('div', { class: 'neural-item' },
        h('div', { class: 'neural-title' }, m.title, m.experimental ? h('span', { class: 'tag' }, T('experimental', 'experimental')) : null),
        h('p', { class: 'hint' }, m.description, ' ', h('a', { href: m.licenceUrl, target: '_blank', rel: 'noopener' }, T('Llicència', 'Licencia')), ': ', m.licence),
        status);
    }));
    box.replaceChildren(...rows);
  };
  neural.onStateChanged(() => { if (box.isConnected) void render(); });
  void render();
  return box;
}

function fontField() {
  const sel = h('select', { id: 'doc-font' },
    ...FONTS.map(f => h('option', { value: f.id, style: `font-family: ${f.css}` }, f.label + (f.joined ? T(' · lletra lligada', ' · letra ligada') : '')))) as HTMLSelectElement;
  sel.value = settings.value.docFont;
  sel.addEventListener('change', () => upd(x => { x.docFont = sel.value; }));
  return h('div', { class: 'field' }, h('label', { for: 'doc-font' }, T('Lletra del document', 'Letra del documento')), sel);
}

export function openSettings(onClose: () => void) {
  const s = settings.value;
  const backdrop = h('div', { class: 'drawer-backdrop' });
  const close = () => { backdrop.remove(); drawer.remove(); onClose(); };
  backdrop.addEventListener('click', close);

  // ----- full-screen password -----
  const passwordBox = h('div', {});
  const renderPassword = () => passwordBox.replaceChildren(h('div', { class: 'row' },
    h('span', {}, settings.value.lockPassword ? T('Contrasenya configurada.', 'Contraseña configurada.') : T('Encara no hi ha cap contrasenya.', 'Todavía no hay ninguna contraseña.')),
    h('button', { class: 'small-btn', type: 'button', onclick: async () => { if (await askNewPassword()) { renderPassword(); toast(T('Contrasenya desada', 'Contraseña guardada')); } } },
      settings.value.lockPassword ? T('Canvia la contrasenya', 'Cambiar la contraseña') : T('Posa una contrasenya', 'Poner una contraseña'))));
  renderPassword();

  // ----- voice -----
  const voiceBox = h('div', {});
  const renderVoices = () => {
    const all = speech.voices;
    const list = settings.value.voice.showAll ? all : all.filter(v => isLangVoice(v.lang));
    const current = speech.currentVoice();
    const sel = h('select', { id: 'voice-select' }) as HTMLSelectElement;
    const groups = new Map<string, VoiceInfo[]>();
    for (const v of list) groups.set(v.engine, [...(groups.get(v.engine) ?? []), v]);
    for (const [engine, vs] of groups) {
      const og = h('optgroup', { label: engine });
      for (const v of vs) {
        const o = h('option', { value: v.id }, voiceLabel(v)) as HTMLOptionElement;
        o.selected = current?.id === v.id;
        og.append(o);
      }
      sel.append(og);
    }
    sel.addEventListener('change', () => upd(x => { x.voice.id = sel.value; }));
    const inLang = all.filter(v => isLangVoice(v.lang)).length;
    voiceBox.replaceChildren(
      inLang === 0 && !settings.value.voice.showAll ? noVoicesHelp() : h('div', { class: 'field' }, h('label', { for: 'voice-select' }, T(`Veu (${inLang} en català)`, `Voz (${inLang} en castellano de España)`)), sel),
      h('div', { class: 'row' },
        h('button', { class: 'small-btn', type: 'button', onclick: () => speech.play([{ kind: 'tts', text: T('Hola! Aquesta és la veu que llegirà el que escriguis.', '¡Hola! Esta es la voz que leerá lo que escribas.') }], { lock: false }) }, T('Prova la veu', 'Probar la voz')),
        h('button', { class: 'small-btn', type: 'button', onclick: async () => { await speech.refresh(); renderVoices(); toast(T('Llista de veus actualitzada', 'Lista de voces actualizada')); } }, T('Torna a buscar veus', 'Volver a buscar voces'))),
      h('p', { class: 'hint' }, inTauri()
        ? T('L’app fa servir directament les veus instal·lades al sistema operatiu.', 'La app usa directamente las voces instaladas en el sistema operativo.')
        : T('Versió web: només es mostren les veus que el navegador permet fer servir. L’app instal·lable en pot detectar més. Les marcades “necessita connexió” (per exemple les veus naturals de Microsoft Edge) són gratuïtes però funcionen en línia.',
          'Versión web: solo se muestran las voces que el navegador permite usar. La app instalable puede detectar más. Las marcadas “necesita conexión” (por ejemplo, las voces naturales de Microsoft Edge, como Elvira o Álvaro) son gratuitas pero funcionan en línea.')),
    );
  };
  renderVoices();
  speech.onVoices(() => { if (voiceBox.isConnected) renderVoices(); });
  const neuralBox = h('details', { class: 'neural', open: speech.langVoices().length === 0 },
    h('summary', {}, T('Veus catalanes gratuïtes per descarregar', 'Voces gratuitas en castellano para descargar')),
    h('p', { class: 'hint' }, T('Es descarreguen una sola vegada i després funcionen dins l’app, sense connexió, en qualsevol dispositiu.', 'Se descargan una sola vez y después funcionan dentro de la app, sin conexión, en cualquier dispositivo.')),
    neuralVoicesBox(id => {
      if (!settings.value.voice.id || !speech.voices.some(v => v.id === settings.value.voice.id && v.id.startsWith('neural:'))) upd(x => { x.voice.id = id; });
    }));

  // ----- letter sub-options -----
  const voiceName = (id: string) => ({ anna: 'Veu de l’Anna', jordi: 'Veu d’en Jordi', mateo: 'Voz de Mateo' } as Record<string, string>)[id]
    ?? T('Veu', 'Voz') + ' ' + id.charAt(0).toUpperCase() + id.slice(1).replace(/[-_]/g, ' ');
  const letterBox = h('div', { class: 'subgroup' });
  const renderLetter = () => {
    const mode = settings.value.feedback.letter;
    const current = recordedVoices.includes(settings.value.recordedVoice) ? settings.value.recordedVoice : recordedVoices[0];
    letterBox.replaceChildren(
      ...(mode === 'name' ? [check(T('Diu “majúscula” davant d’una lletra majúscula', 'Dice “mayúscula” delante de una letra mayúscula'), null, x => x.feedback.upperCaseWord, (x, v) => { x.feedback.upperCaseWord = v; })] : []),
      ...(mode === 'sound' ? [
        h('div', { class: 'hint' }, T('Els sons són locucions enregistrades (les mateixes de LECAA).', 'Los sonidos son locuciones grabadas.')),
        // With a single voice there is nothing to choose.
        ...(recordedVoices.length < 2 ? [] : recordedVoices).map(id => radio('recvoice', id, voiceName(id), null, current, () => upd(x => { x.recordedVoice = id; }))),
      ] : []),
    );
  };
  renderLetter();
  const setLetter = (m: LetterMode) => { upd(x => { x.feedback.letter = m; }); renderLetter(); };
  // Spanish letter sounds are recorded later (ElevenLabs); until then the option is not offered.
  const soundsReady = recordedVoices.length > 0;

  const feedbackBody = h('div', {});
  const renderFeedback = () => {
    const f = settings.value.feedback;
    feedbackBody.replaceChildren(
      h('button', {
        class: 'small-btn', type: 'button',
        onclick: () => { upd(x => { x.feedback.sentence = false; x.feedback.word = false; x.feedback.letter = 'off'; }); renderFeedback(); renderLetter(); },
      }, T('Cap feedback (només els botons de lectura)', 'Sin feedback (solo los botones de lectura)')),
      check('Frase', T('Es llegeix la frase en escriure un punt, ? o !, o en prémer Intro.', 'Se lee la frase al escribir un punto, ? o !, o al pulsar Intro.'), x => x.feedback.sentence, (x, v) => { x.feedback.sentence = v; }),
      check(T('Paraula', 'Palabra'), T('Es llegeix cada paraula en prémer l’espai.', 'Se lee cada palabra al pulsar el espacio.'), x => x.feedback.word, (x, v) => { x.feedback.word = v; }),
      h('div', { class: 'subgroup' }, check(T('També amb els signes de puntuació', 'También con los signos de puntuación'), null, x => x.feedback.wordOnPunct, (x, v) => { x.feedback.wordOnPunct = v; })),
      h('div', { class: 'hint' }, T('Lletra (només una de les dues opcions):', 'Letra (solo una de las dos opciones):')),
      radio('letter', 'off', T('Cap so per a les lletres', 'Ningún sonido para las letras'), null, f.letter, () => setLetter('off')),
      radio('letter', 'name', T('Nom de la lletra', 'Nombre de la letra'), T('“be”, “ce”, “essa”… amb la veu sintètica', '“be”, “ce”, “ese”… con la voz sintética'), f.letter, () => setLetter('name')),
      soundsReady
        ? radio('letter', 'sound', T('So de la lletra', 'Sonido de la letra'), T('El so més habitual de la lletra, amb veu enregistrada', 'El sonido más habitual de la letra, con voz grabada'), f.letter, () => setLetter('sound'))
        : h('p', { class: 'hint' }, T('El so de la lletra encara no té locucions enregistrades.', 'El sonido de la letra estará disponible cuando se graben las locuciones en castellano.')),
      letterBox,
    );
  };
  renderFeedback();

  const msgInput = h('input', { type: 'text', value: s.guard.message }) as HTMLInputElement;
  msgInput.addEventListener('change', () => upd(x => { x.guard.message = msgInput.value.trim() || T('Pensa bé cada lletra que escrius', 'Piensa bien cada letra que escribes'); }));

  const debounce = h('select', {}, ...[0, 150, 300, 500, 800].map(ms => {
    const o = h('option', { value: ms }, ms ? `${ms} ms` : T('Desactivat', 'Desactivado')) as HTMLOptionElement;
    o.selected = s.motor.debounceMs === ms;
    return o;
  })) as HTMLSelectElement;
  debounce.addEventListener('change', () => upd(x => { x.motor.debounceMs = Number(debounce.value); }));

  const fileInput = h('input', { type: 'file', accept: '.json', hidden: true }) as HTMLInputElement;
  fileInput.addEventListener('change', async () => {
    const f = fileInput.files?.[0];
    if (!f) return;
    try { settings.replace(JSON.parse(await f.text())); toast(T('Configuració importada', 'Configuración importada')); close(); } catch { toast(T('El fitxer no és una configuració vàlida', 'El archivo no es una configuración válida')); }
  });

  const drawer = h('aside', { class: 'drawer', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'settings-title' },
    h('header', {}, h('h2', { id: 'settings-title' }, T('Configuració', 'Configuración')),
      h('button', { class: 'tb', type: 'button', 'aria-label': T('Tanca', 'Cerrar'), onclick: close }, icon(X))),
    h('div', { class: 'body' },
      h('fieldset', {}, h('legend', {}, T('Veu sintètica', 'Voz sintética')), voiceBox, neuralBox,
        check(T('Mostra també veus d’altres llengües', 'Mostrar también voces de otros idiomas'), null, x => x.voice.showAll, (x, v) => { x.voice.showAll = v; renderVoices(); }),
        range(T('Velocitat', 'Velocidad'), 0.5, 1.6, 0.05, x => x.voice.rate, (x, v) => { x.voice.rate = v; }, v => `${Math.round(v * 100)} %`),
        range(T('To', 'Tono'), 0.6, 1.4, 0.05, x => x.voice.pitch, (x, v) => { x.voice.pitch = v; }, v => `${Math.round(v * 100)} %`),
        range(T('Volum', 'Volumen'), 0.1, 1, 0.05, x => x.voice.volume, (x, v) => { x.voice.volume = v; }, v => `${Math.round(v * 100)} %`)),
      h('fieldset', {}, h('legend', {}, T('Feedback mentre s’escriu', 'Feedback mientras se escribe')), feedbackBody),
      h('fieldset', {}, h('legend', {}, T('Protecció del tecleig', 'Protección del tecleo')),
        check(T('No acceptar tecles mentre sona el feedback', 'No aceptar teclas mientras suena el feedback'), T('Ni del teclat físic ni del teclat en pantalla. Els botons de lectura i Atura sempre funcionen.', 'Ni del teclado físico ni del teclado en pantalla. Los botones de lectura y Detener siempre funcionan.'), x => x.lockWhileSpeaking, (x, v) => { x.lockWhileSpeaking = v; })),
      h('fieldset', {}, h('legend', {}, T('Usos indeguts del teclat', 'Usos indebidos del teclado')),
        check(T('Detecta els usos indeguts', 'Detectar los usos indebidos'), T('Mostra un avís de calma i bloqueja l’activitat uns segons.', 'Muestra un aviso de calma y bloquea la actividad unos segundos.'), x => x.guard.enabled, (x, v) => { x.guard.enabled = v; }),
        h('div', { class: 'subgroup' },
          check(T('Moltes tecles alhora', 'Muchas teclas a la vez'), T('3 o més tecles premudes a la vegada', '3 o más teclas pulsadas a la vez'), x => x.guard.simultaneous, (x, v) => { x.guard.simultaneous = v; }),
          check(T('Tecles molt seguides', 'Teclas muy seguidas'), T('3 tecles diferents en menys de 60 ms', '3 teclas diferentes en menos de 60 ms'), x => x.guard.burst, (x, v) => { x.guard.burst = v; }),
          check(T('La mateixa lletra 3 vegades seguides', 'La misma letra 3 veces seguidas'), T('En català cap paraula en té tres d’iguals', 'En castellano ninguna palabra tiene tres iguales'), x => x.guard.repeatLetters, (x, v) => { x.guard.repeatLetters = v; }),
          check(T('Moltes consonants sense cap vocal', 'Muchas consonantes sin ninguna vocal'), T('6 o més', '6 o más'), x => x.guard.consonants, (x, v) => { x.guard.consonants = v; }),
          check(T('Mantenir una tecla premuda', 'Mantener una tecla pulsada'), T('Excepte la tecla d’esborrar, que continua esborrant (màxim 4 lletres per segon).', 'Excepto la tecla de borrar, que sigue borrando (máximo 4 letras por segundo).'), x => x.guard.autoRepeat, (x, v) => { x.guard.autoRepeat = v; })),
        h('div', { class: 'field' }, h('label', {}, T('Missatge de l’avís', 'Mensaje del aviso')), msgInput),
        range(T('Durada de l’avís', 'Duración del aviso'), 2, 8, 1, x => x.guard.calmMs / 1000, (x, v) => { x.guard.calmMs = v * 1000; }, v => `${v} s`),
        h('button', { class: 'small-btn', type: 'button', onclick: () => { close(); guard.calm(); } }, T('Mostra l’avís', 'Mostrar el aviso'))),
      h('fieldset', {}, h('legend', {}, T('Ajust motriu', 'Ajuste motor')),
        h('div', { class: 'field' }, h('label', {}, T('Ignora la mateixa tecla repetida en menys de', 'Ignorar la misma tecla repetida en menos de')), debounce),
        h('p', { class: 'hint' }, T('Útil si hi ha tremolor o rebots: evita lletres duplicades sense voler.', 'Útil si hay temblor o rebotes: evita letras duplicadas sin querer.'))),
      h('fieldset', {}, h('legend', {}, T('Teclat en pantalla', 'Teclado en pantalla')),
        range(T('Mida de les tecles', 'Tamaño de las teclas'), 2.2, 5, 0.1, x => x.keyboard.keySize, (x, v) => { x.keyboard.keySize = v; }, v => `${Math.round(v * 16)} px`)),
      h('fieldset', {}, h('legend', {}, T('Lectura i document', 'Lectura y documento')),
        check(T('Ressalta el que s’està llegint', 'Resaltar lo que se está leyendo'), null, x => x.highlight, (x, v) => { x.highlight = v; }),
        range(T('Mida del text a la pantalla', 'Tamaño del texto en la pantalla'), 16, 40, 1, x => x.docFontSize, (x, v) => { x.docFontSize = v; }, v => `${v} px`),
        fontField()),
      h('fieldset', {}, h('legend', {}, 'Pantalla completa'),
        h('p', { class: 'hint' }, T('El botó de pantalla completa amaga les barres d’eines i la configuració. Només se’n pot sortir amb aquesta contrasenya (botó 🔒 a la cantonada).', 'El botón de pantalla completa oculta las barras de herramientas y la configuración. Solo se puede salir con esta contraseña (botón 🔒 en la esquina). La contraseña es la misma en los dos idiomas.')),
        passwordBox),
      h('fieldset', {}, h('legend', {}, T('Configuració', 'Configuración')),
        h('p', { class: 'hint' }, T('Cada idioma té la seva pròpia configuració.', 'Cada idioma tiene su propia configuración.')),
        check(T('Protegeix la configuració', 'Proteger la configuración'), T('Cal mantenir premut el botó de configuració 2 segons per obrir-la.', 'Hay que mantener pulsado el botón de configuración 2 segundos para abrirla.'), x => x.protectSettings, (x, v) => { x.protectSettings = v; }),
        h('div', { class: 'row' },
          h('button', {
            class: 'small-btn', type: 'button', onclick: () => {
              const a = h('a', { href: URL.createObjectURL(new Blob([JSON.stringify(settings.value, null, 2)], { type: 'application/json' })), download: T('lecaa-docs-configuracio.json', 'lecaa-docs-configuracion.json') });
              a.click();
            },
          }, T('Exporta', 'Exportar')),
          h('button', { class: 'small-btn', type: 'button', onclick: () => fileInput.click() }, T('Importa', 'Importar')),
          fileInput))));

  drawer.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  document.body.append(backdrop, drawer);
  (drawer.querySelector('button') as HTMLButtonElement).focus();
  speech.refresh().then(renderVoices);
}
