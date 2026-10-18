import { X } from 'lucide';
import { FONTS } from './fonts';
import { guard } from './guard';
import { askNewPassword } from './lock';
import { inTauri } from './speech/native';
import { settings, type LetterMode, type Settings } from './settings';
import { speech, type VoiceInfo } from './speech';
import { neural } from './speech/neural';
import { MODELS } from './speech/neural/catalog';
import { isCatalan } from './speech/types';
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
  const offline = v.offline === false ? ' · necessita connexió' : '';
  return `${v.name} (${v.lang})${offline}`;
}

function noVoicesHelp() {
  const ua = navigator.userAgent;
  const where = /Android/i.test(ua)
    ? 'A Android, instal·la una veu catalana (Google, Acapela o Vocalizer) a Configuració > Accessibilitat > Text a veu. La versió web no pot veure totes les veus d’Android: fes servir l’app per a Android quan estigui disponible.'
    : /iPhone|iPad|Mac OS/i.test(ua)
      ? 'A iOS i macOS, descarrega les veus Jordi, Montse o Pau a Configuració > Accessibilitat > Contingut llegit > Veus. Safari no mostra totes les veus descarregades a la versió web; l’app instal·lable sí que les veurà.'
      : /Windows/i.test(ua)
        ? 'A Windows, afegeix la veu catalana Herena des de Configuració > Hora i idioma > Veu, o instal·la Microsoft Speech Platform amb la veu Herena. L’app per a Windows les detecta totes; el navegador només en veu una part.'
        : 'Instal·la una veu catalana al sistema i torna a carregar la llista.';
  return h('div', { class: 'voice-list-empty' }, 'No s’ha trobat cap veu catalana en aquest dispositiu. ', where,
    ' També pots descarregar una veu catalana gratuïta aquí sota: funciona en qualsevol dispositiu i sense connexió.');
}

const mb = (bytes: number) => `${Math.round(bytes / 1_000_000)} MB`;

// Free Catalan voices that run inside the app: download once, then they work offline.
function neuralVoicesBox(onInstalled: (voiceId: string) => void) {
  const box = h('div', { class: 'neural-list' });
  const render = async () => {
    const rows = await Promise.all(MODELS.map(async m => {
      const st = await neural.state(m.key);
      const status = st.state === 'downloading'
        ? h('div', { class: 'neural-progress' },
          h('progress', { max: st.total || 1, value: st.loaded, 'aria-label': `Descarregant ${m.title}` }),
          h('span', {}, `${mb(st.loaded)} de ${mb(st.total)}`))
        : st.state === 'installed'
          ? h('div', { class: 'row' },
            h('span', { class: 'neural-ok' }, 'Descarregada · funciona sense connexió'),
            h('button', { class: 'small-btn', type: 'button', onclick: async () => {
              if (!confirm(`Vols esborrar ${m.title} d’aquest dispositiu?`)) return;
              await neural.uninstall(m.key);
            } }, 'Esborra'))
          : h('button', { class: 'small-btn', type: 'button', 'data-install': m.key, onclick: async () => {
            if (m.mustAccept && !confirm(`${m.mustAccept}\n\nLlicència: ${m.licenceUrl}`)) return;
            if (!navigator.onLine) { toast('Cal connexió a internet per descarregar la veu'); return; }
            try {
              await neural.install(m.key);
              await speech.refresh();
              toast(`${m.title} ja és a punt`);
              onInstalled('neural:' + m.voices[0].id);
            } catch {
              toast('No s’ha pogut descarregar la veu. Torna-ho a provar més tard.');
            }
          } }, `Descarrega (${mb(await neural.downloadSize(m))})`);
      return h('div', { class: 'neural-item' },
        h('div', { class: 'neural-title' }, m.title, m.experimental ? h('span', { class: 'tag' }, 'experimental') : null),
        h('p', { class: 'hint' }, m.description, ' ', h('a', { href: m.licenceUrl, target: '_blank', rel: 'noopener' }, 'Llicència'), ': ', m.licence),
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
    ...FONTS.map(f => h('option', { value: f.id, style: `font-family: ${f.css}` }, f.label + (f.joined ? ' · lletra lligada' : '')))) as HTMLSelectElement;
  sel.value = settings.value.docFont;
  sel.addEventListener('change', () => upd(x => { x.docFont = sel.value; }));
  return h('div', { class: 'field' }, h('label', { for: 'doc-font' }, 'Lletra del document'), sel);
}

export function openSettings(onClose: () => void) {
  const s = settings.value;
  const backdrop = h('div', { class: 'drawer-backdrop' });
  const close = () => { backdrop.remove(); drawer.remove(); onClose(); };
  backdrop.addEventListener('click', close);

  // ----- full-screen password -----
  const passwordBox = h('div', {});
  const renderPassword = () => passwordBox.replaceChildren(h('div', { class: 'row' },
    h('span', {}, settings.value.lockPassword ? 'Contrasenya configurada.' : 'Encara no hi ha cap contrasenya.'),
    h('button', { class: 'small-btn', type: 'button', onclick: async () => { if (await askNewPassword()) { renderPassword(); toast('Contrasenya desada'); } } },
      settings.value.lockPassword ? 'Canvia la contrasenya' : 'Posa una contrasenya')));
  renderPassword();

  // ----- voice -----
  const voiceBox = h('div', {});
  const renderVoices = () => {
    const all = speech.voices;
    const list = settings.value.voice.showAll ? all : all.filter(v => isCatalan(v.lang));
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
    const catalan = all.filter(v => isCatalan(v.lang)).length;
    voiceBox.replaceChildren(
      catalan === 0 && !settings.value.voice.showAll ? noVoicesHelp() : h('div', { class: 'field' }, h('label', { for: 'voice-select' }, `Veu (${catalan} en català)`), sel),
      h('div', { class: 'row' },
        h('button', { class: 'small-btn', type: 'button', onclick: () => speech.play([{ kind: 'tts', text: 'Hola! Aquesta és la veu que llegirà el que escriguis.' }], { lock: false }) }, 'Prova la veu'),
        h('button', { class: 'small-btn', type: 'button', onclick: async () => { await speech.refresh(); renderVoices(); toast('Llista de veus actualitzada'); } }, 'Torna a buscar veus')),
      h('p', { class: 'hint' }, inTauri()
        ? 'L’app fa servir directament les veus instal·lades al sistema operatiu.'
        : 'Versió web: només es mostren les veus que el navegador permet fer servir. L’app instal·lable en pot detectar més. Les marcades “necessita connexió” (per exemple les veus naturals de Microsoft Edge) són gratuïtes però funcionen en línia.'),
    );
  };
  renderVoices();
  speech.onVoices(() => { if (voiceBox.isConnected) renderVoices(); });
  const neuralBox = h('details', { class: 'neural', open: speech.catalanVoices().length === 0 },
    h('summary', {}, 'Veus catalanes gratuïtes per descarregar'),
    h('p', { class: 'hint' }, 'Es descarreguen una sola vegada i després funcionen dins l’app, sense connexió, en qualsevol dispositiu.'),
    neuralVoicesBox(id => {
      if (!settings.value.voice.id || !speech.voices.some(v => v.id === settings.value.voice.id && v.id.startsWith('neural:'))) upd(x => { x.voice.id = id; });
    }));

  // ----- letter sub-options -----
  const letterBox = h('div', { class: 'subgroup' });
  const renderLetter = () => {
    const mode = settings.value.feedback.letter;
    letterBox.replaceChildren(
      ...(mode === 'name' ? [check('Diu “majúscula” davant d’una lletra majúscula', null, x => x.feedback.upperCaseWord, (x, v) => { x.feedback.upperCaseWord = v; })] : []),
      ...(mode === 'sound' ? [
        h('div', { class: 'hint' }, 'Els sons són locucions enregistrades (les mateixes de LECAA).'),
        radio('recvoice', 'anna', 'Veu de l’Anna', null, settings.value.recordedVoice, () => upd(x => { x.recordedVoice = 'anna'; })),
        radio('recvoice', 'jordi', 'Veu d’en Jordi', null, settings.value.recordedVoice, () => upd(x => { x.recordedVoice = 'jordi'; })),
      ] : []),
    );
  };
  renderLetter();
  const setLetter = (m: LetterMode) => { upd(x => { x.feedback.letter = m; }); renderLetter(); };

  const feedbackBody = h('div', {});
  const renderFeedback = () => {
    const f = settings.value.feedback;
    feedbackBody.replaceChildren(
      h('button', {
        class: 'small-btn', type: 'button',
        onclick: () => { upd(x => { x.feedback.sentence = false; x.feedback.word = false; x.feedback.letter = 'off'; }); renderFeedback(); renderLetter(); },
      }, 'Cap feedback (només els botons de lectura)'),
      check('Frase', 'Es llegeix la frase en escriure un punt, ? o !, o en prémer Intro.', x => x.feedback.sentence, (x, v) => { x.feedback.sentence = v; }),
      check('Paraula', 'Es llegeix cada paraula en prémer l’espai.', x => x.feedback.word, (x, v) => { x.feedback.word = v; }),
      h('div', { class: 'subgroup' }, check('També amb els signes de puntuació', null, x => x.feedback.wordOnPunct, (x, v) => { x.feedback.wordOnPunct = v; })),
      h('div', { class: 'hint' }, 'Lletra (només una de les dues opcions):'),
      radio('letter', 'off', 'Cap so per a les lletres', null, f.letter, () => setLetter('off')),
      radio('letter', 'name', 'Nom de la lletra', '“be”, “ce”, “essa”… amb la veu sintètica', f.letter, () => setLetter('name')),
      radio('letter', 'sound', 'So de la lletra', 'El so més habitual de la lletra, amb veu enregistrada', f.letter, () => setLetter('sound')),
      letterBox,
    );
  };
  renderFeedback();

  const msgInput = h('input', { type: 'text', value: s.guard.message }) as HTMLInputElement;
  msgInput.addEventListener('change', () => upd(x => { x.guard.message = msgInput.value.trim() || 'Pensa bé cada lletra que escrius'; }));

  const debounce = h('select', {}, ...[0, 150, 300, 500, 800].map(ms => {
    const o = h('option', { value: ms }, ms ? `${ms} ms` : 'Desactivat') as HTMLOptionElement;
    o.selected = s.motor.debounceMs === ms;
    return o;
  })) as HTMLSelectElement;
  debounce.addEventListener('change', () => upd(x => { x.motor.debounceMs = Number(debounce.value); }));

  const fileInput = h('input', { type: 'file', accept: '.json', hidden: true }) as HTMLInputElement;
  fileInput.addEventListener('change', async () => {
    const f = fileInput.files?.[0];
    if (!f) return;
    try { settings.replace(JSON.parse(await f.text())); toast('Configuració importada'); close(); } catch { toast('El fitxer no és una configuració vàlida'); }
  });

  const drawer = h('aside', { class: 'drawer', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'settings-title' },
    h('header', {}, h('h2', { id: 'settings-title' }, 'Configuració'),
      h('button', { class: 'tb', type: 'button', 'aria-label': 'Tanca', onclick: close }, icon(X))),
    h('div', { class: 'body' },
      h('fieldset', {}, h('legend', {}, 'Veu sintètica'), voiceBox, neuralBox,
        check('Mostra també veus d’altres llengües', null, x => x.voice.showAll, (x, v) => { x.voice.showAll = v; renderVoices(); }),
        range('Velocitat', 0.5, 1.6, 0.05, x => x.voice.rate, (x, v) => { x.voice.rate = v; }, v => `${Math.round(v * 100)} %`),
        range('To', 0.6, 1.4, 0.05, x => x.voice.pitch, (x, v) => { x.voice.pitch = v; }, v => `${Math.round(v * 100)} %`),
        range('Volum', 0.1, 1, 0.05, x => x.voice.volume, (x, v) => { x.voice.volume = v; }, v => `${Math.round(v * 100)} %`)),
      h('fieldset', {}, h('legend', {}, 'Feedback mentre s’escriu'), feedbackBody),
      h('fieldset', {}, h('legend', {}, 'Protecció del tecleig'),
        check('No acceptar tecles mentre sona el feedback', 'Ni del teclat físic ni del teclat en pantalla. Els botons de lectura i Atura sempre funcionen.', x => x.lockWhileSpeaking, (x, v) => { x.lockWhileSpeaking = v; })),
      h('fieldset', {}, h('legend', {}, 'Usos indeguts del teclat'),
        check('Detecta els usos indeguts', 'Mostra un avís de calma i bloqueja l’activitat uns segons.', x => x.guard.enabled, (x, v) => { x.guard.enabled = v; }),
        h('div', { class: 'subgroup' },
          check('Moltes tecles alhora', '3 o més tecles premudes a la vegada', x => x.guard.simultaneous, (x, v) => { x.guard.simultaneous = v; }),
          check('Tecles molt seguides', '3 tecles diferents en menys de 60 ms', x => x.guard.burst, (x, v) => { x.guard.burst = v; }),
          check('La mateixa lletra 3 vegades seguides', 'En català cap paraula en té tres d’iguals', x => x.guard.repeatLetters, (x, v) => { x.guard.repeatLetters = v; }),
          check('Moltes consonants sense cap vocal', '6 o més', x => x.guard.consonants, (x, v) => { x.guard.consonants = v; }),
          check('Mantenir una tecla premuda', null, x => x.guard.autoRepeat, (x, v) => { x.guard.autoRepeat = v; })),
        h('div', { class: 'field' }, h('label', {}, 'Missatge de l’avís'), msgInput),
        range('Durada de l’avís', 2, 8, 1, x => x.guard.calmMs / 1000, (x, v) => { x.guard.calmMs = v * 1000; }, v => `${v} s`),
        h('button', { class: 'small-btn', type: 'button', onclick: () => { close(); guard.calm(); } }, 'Mostra l’avís')),
      h('fieldset', {}, h('legend', {}, 'Ajust motriu'),
        h('div', { class: 'field' }, h('label', {}, 'Ignora la mateixa tecla repetida en menys de'), debounce),
        h('p', { class: 'hint' }, 'Útil si hi ha tremolor o rebots: evita lletres duplicades sense voler.')),
      h('fieldset', {}, h('legend', {}, 'Teclat en pantalla'),
        radio('layout', 'simple', 'Simplificat', 'Cada tecla fa una sola cosa; només els caràcters necessaris per escriure en català', s.keyboard.layout, () => upd(x => { x.keyboard.layout = 'simple'; })),
        radio('layout', 'full', 'Complet (QWERTY)', 'Amb majúscules, números i accents', s.keyboard.layout, () => upd(x => { x.keyboard.layout = 'full'; })),
        check('Majúscula automàtica a l’inici de frase (teclat simplificat)', null, x => x.keyboard.autoCapital, (x, v) => { x.keyboard.autoCapital = v; }),
        range('Mida de les tecles', 2.2, 5, 0.1, x => x.keyboard.keySize, (x, v) => { x.keyboard.keySize = v; }, v => `${Math.round(v * 16)} px`)),
      h('fieldset', {}, h('legend', {}, 'Lectura i document'),
        check('Ressalta el que s’està llegint', null, x => x.highlight, (x, v) => { x.highlight = v; }),
        range('Mida del text a la pantalla', 16, 40, 1, x => x.docFontSize, (x, v) => { x.docFontSize = v; }, v => `${v} px`),
        fontField()),
      h('fieldset', {}, h('legend', {}, 'Pantalla completa'),
        h('p', { class: 'hint' }, 'El botó de pantalla completa amaga les barres d’eines i la configuració. Només se’n pot sortir amb aquesta contrasenya (botó 🔒 a la cantonada).'),
        passwordBox),
      h('fieldset', {}, h('legend', {}, 'Configuració'),
        check('Protegeix la configuració', 'Cal mantenir premut el botó de configuració 2 segons per obrir-la.', x => x.protectSettings, (x, v) => { x.protectSettings = v; }),
        h('div', { class: 'row' },
          h('button', {
            class: 'small-btn', type: 'button', onclick: () => {
              const a = h('a', { href: URL.createObjectURL(new Blob([JSON.stringify(settings.value, null, 2)], { type: 'application/json' })), download: 'lecaa-docs-configuracio.json' });
              a.click();
            },
          }, 'Exporta'),
          h('button', { class: 'small-btn', type: 'button', onclick: () => fileInput.click() }, 'Importa'),
          fileInput))));

  drawer.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  document.body.append(backdrop, drawer);
  (drawer.querySelector('button') as HTMLButtonElement).focus();
  speech.refresh().then(renderVoices);
}
