// "Instal·la l'app": installs the online edition as an app (PWA), with its own icon and window.
// Chromium browsers (Chrome, Edge, Samsung Internet…) offer it through beforeinstallprompt, and the
// button then opens the browser's own install prompt. Safari has no prompt: on iPad and iPhone
// (any browser there) and on a Mac, the button shows how to do it from the browser's menus.
// The button is not shown when there is nothing to install: in the installed app itself, in the
// single HTML file, in the desktop app (Tauri), or in a browser that cannot install web apps.
//
// Before installing, a dialog says how much the app takes on the device, recommends wifi and shows
// the room the browser has left. In Chromium it lets the person choose whether all the ARASAAC
// pictograms are downloaded too, its own button opens the browser's prompt, and then it shows the
// download with a progress bar. Safari keeps the installed app's data apart from the browser's, so
// there the dialog only explains it, and the installed app asks the first time it opens.

import { Download, Share, SquarePlus, Wifi, X } from 'lucide';
import { BCP47, T } from './i18n';
import { freeSpace, missingBytes, offlineAppSupported, OfflineError, pictosChoiceSupported, prepare, savedChoice, saveChoice, status, type Choice, type Status } from './offline';
import { inTauri } from './speech/native';
import { h, icon, toast } from './ui';

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// The event can come before the app has built its toolbar: it is kept from the start.
let deferred: InstallPromptEvent | null = null;
let onChange: (() => void) | null = null;
const canInstallHere = !__SINGLE_FILE__ && location.protocol.startsWith('http');
if (canInstallHere) {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault(); // the app's own button offers it, not the browser's mini-infobar
    deferred = e as InstallPromptEvent;
    onChange?.();
  });
  window.addEventListener('appinstalled', () => { deferred = null; onChange?.(); });
}

export const standalone = () =>
  ['standalone', 'fullscreen', 'minimal-ui', 'window-controls-overlay'].some(m => matchMedia(`(display-mode: ${m})`).matches)
  || (navigator as Navigator & { standalone?: boolean }).standalone === true;

// iPadOS says it is a Mac: a Mac with a touch screen is an iPad.
const ua = navigator.userAgent;
const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
// Safari 17 or later on a Mac (macOS Sonoma) can add a web app to the Dock.
const safariVersion = Number(/Version\/(\d+)/.exec(ua)?.[1] ?? 0);
const macSafari = !iOS && /Macintosh/.test(ua) && safariVersion >= 17
  && /Safari\//.test(ua) && !/Chrome|Chromium|CriOS|Edg|OPR|Firefox|FxiOS/.test(ua);

type Way = 'prompt' | 'ios' | 'mac' | null;
function way(): Way {
  if (!canInstallHere || inTauri() || standalone()) return null;
  if (deferred) return 'prompt';
  if (iOS) return 'ios';
  if (macSafari) return 'mac';
  return null;
}

const mb = (bytes: number) => Math.max(bytes > 0 ? 1 : 0, Math.round(bytes / 1_000_000)).toLocaleString(BCP47);

function stepsList(kind: 'ios' | 'mac') {
  return kind === 'ios'
    ? [
        h('li', {}, T('Toca el botó «Compartir»', 'Toca el botón «Compartir»'), ' ', icon(Share), ' ', T('(a dalt o a baix de la pantalla).', '(arriba o abajo de la pantalla).')),
        h('li', {}, T('Tria «Afegir a la pantalla d’inici»', 'Elige «Añadir a pantalla de inicio»'), ' ', icon(SquarePlus), T('. Si no hi és, llisca la llista cap avall.', '. Si no está, desliza la lista hacia abajo.')),
        h('li', {}, T('Toca «Afegir». LECAA Docs apareixerà a la pantalla d’inici com una app més.', 'Toca «Añadir». LECAA Docs aparecerá en la pantalla de inicio como una app más.')),
      ]
    : [
        h('li', {}, T('Al menú «Arxiu» de Safari, tria «Afegir al Dock».', 'En el menú «Archivo» de Safari, elige «Añadir al Dock».')),
        h('li', {}, T('Fes clic a «Afegir». LECAA Docs s’obrirà en una finestra pròpia, des del Dock.', 'Haz clic en «Añadir». LECAA Docs se abrirá en una ventana propia, desde el Dock.')),
      ];
}

// 'prompt': Chromium, before the browser's prompt. 'ios' / 'mac': Safari, before the steps.
// 'setup': the installed app, the first time it opens without a choice (Safari, or a download that
// was never chosen).
type Mode = 'prompt' | 'ios' | 'mac' | 'setup';

export function offlineDialog(mode: Mode, onClose: () => void = () => {}) {
  const choosing = mode === 'prompt' || mode === 'setup';
  let st: Status | null = null;
  let choice: Choice = savedChoice() ?? 'all';
  let running = false;
  const close = () => dlg.close();

  const sizeApp = h('span', { class: 'install-size' });
  const sizeAll = h('span', { class: 'install-size' });
  const radio = (value: Choice, title: string, size: HTMLElement, hint: string) => {
    const input = h('input', { type: 'radio', name: 'install-choice', value, checked: choice === value }) as HTMLInputElement;
    input.addEventListener('change', () => { choice = value; void refreshSpace(); });
    return h('label', { class: 'install-option' }, input,
      h('span', {}, h('strong', {}, title), ' ', size, h('span', { class: 'hint' }, hint)));
  };
  const options = choosing && pictosChoiceSupported
    ? h('fieldset', { class: 'install-options' },
        h('legend', {}, T('Què vols tenir sense connexió?', '¿Qué quieres tener sin conexión?')),
        radio('app', T('Només l’app', 'Solo la app'), sizeApp,
          T('Cada pictograma es desa la primera vegada que surt: sense connexió només es veuen els que ja han sortit.', 'Cada pictograma se guarda la primera vez que sale: sin conexión solo se ven los que ya han salido.')),
        radio('all', T('L’app i tots els pictogrames d’ARASAAC', 'La app y todos los pictogramas de ARASAAC'), sizeAll,
          T('Tots els pictogrames es veuen també sense connexió.', 'Todos los pictogramas se ven también sin conexión.')))
    : null;
  if (!options) choice = choosing ? 'app' : choice;
  const sizeLine = h('p', {});
  const space = h('p', { class: 'install-space', 'aria-live': 'polite' });
  const bar = h('progress', { max: 1, value: 0, 'aria-label': T('Descàrrega de LECAA Docs', 'Descarga de LECAA Docs') }) as HTMLProgressElement;
  const barLabel = h('span', {});
  const progress = h('div', { class: 'neural-progress install-progress', hidden: true }, bar, barLabel);
  const message = h('p', { class: 'install-message', role: 'status', hidden: true });
  const cancel = h('button', { class: 'small-btn', type: 'button', onclick: close }, T('Cancel·la', 'Cancelar'));
  const go = h('button', { class: 'small-btn primary', type: 'button' },
    mode === 'prompt' ? T('Instal·la', 'Instalar') : mode === 'setup' ? T('Descarrega', 'Descargar') : T('Següent', 'Siguiente'));
  if (mode === 'setup') cancel.textContent = T('Ara no', 'Ahora no');

  const body = h('div', { class: 'body' },
    h('p', {}, mode === 'setup'
      ? T('Perquè LECAA Docs funcioni sense connexió, es descarrega en aquest dispositiu.', 'Para que LECAA Docs funcione sin conexión, se descarga en este dispositivo.')
      : T('Instal·lada, l’app s’obre des de la seva icona, ocupa tota la pantalla i funciona sense connexió. Per això es descarrega en aquest dispositiu.', 'Instalada, la app se abre desde su icono, ocupa toda la pantalla y funciona sin conexión. Por eso se descarga en este dispositivo.')),
    options ?? sizeLine,
    h('p', { class: 'install-wifi' }, icon(Wifi), ' ', T('Es recomana fer-ho amb una connexió wifi.', 'Se recomienda hacerlo con una conexión wifi.')),
    space,
    h('p', { class: 'hint' }, T('Les veus Piper (dins l’app) es descarreguen a part, des de Configuració.', 'Las voces Piper (dentro de la app) se descargan aparte, desde Configuración.')),
    progress, message,
    h('div', { class: 'install-actions' }, cancel, go));
  const dlg = h('dialog', { class: 'about install', 'aria-labelledby': 'install-title' },
    h('header', {},
      h('h2', { id: 'install-title' }, mode === 'setup' ? T('LECAA Docs sense connexió', 'LECAA Docs sin conexión') : T('Instal·la LECAA Docs', 'Instalar LECAA Docs')),
      h('button', { class: 'tb', type: 'button', 'aria-label': T('Tanca', 'Cerrar'), onclick: close }, icon(X))),
    body);

  async function refreshSpace() {
    if (!st) return;
    const need = choosing ? missingBytes(st, choice) : missingBytes(st, 'app');
    const free = await freeSpace();
    space.classList.remove('warn');
    if (free === null) { space.textContent = ''; return; }
    if (free < need * 1.1) {
      space.classList.add('warn');
      space.textContent = T('Potser no hi ha prou espai: calen uns {need} MB i el navegador en té {free} MB disponibles.', 'Puede que no haya espacio suficiente: hacen falta unos {need} MB y el navegador tiene {free} MB disponibles.', { need: mb(need), free: mb(free) })
        + (choosing && choice === 'all' ? ' ' + T('Pots triar només l’app.', 'Puedes elegir solo la app.') : '');
    } else {
      space.textContent = T('Espai disponible per a aquesta app al navegador: {free} MB.', 'Espacio disponible para esta app en el navegador: {free} MB.', { free: mb(free) });
    }
  }

  void status().then(s => {
    st = s;
    sizeApp.textContent = T('· {n} MB', '· {n} MB', { n: mb(s.sizes.app) });
    sizeAll.textContent = T('· {n} MB', '· {n} MB', { n: mb(s.sizes.app + s.sizes.pictos) });
    sizeLine.textContent = pictosChoiceSupported
      ? T('L’app ocupa uns {app} MB. Si també vols tots els pictogrames d’ARASAAC sense connexió, són {pictos} MB més: ho podràs triar en obrir l’app instal·lada.', 'La app ocupa unos {app} MB. Si también quieres todos los pictogramas de ARASAAC sin conexión, son {pictos} MB más: podrás elegirlo al abrir la app instalada.', { app: mb(s.sizes.app), pictos: mb(s.sizes.pictos) })
      : T('L’app ocupa uns {app} MB.', 'La app ocupa unos {app} MB.', { app: mb(s.sizes.app) });
    void refreshSpace();
  }).catch(() => {});

  const abort = new AbortController();
  async function download() {
    running = true;
    options?.setAttribute('disabled', '');
    go.hidden = true;
    cancel.textContent = T('Tanca', 'Cerrar');
    message.hidden = true;
    progress.hidden = false;
    const show = (loaded: number, total: number) => {
      bar.max = total || 1; bar.value = loaded;
      barLabel.textContent = T('{x} de {y} MB ({p} %)', '{x} de {y} MB ({p} %)', { x: mb(loaded), y: mb(total), p: total ? Math.floor(loaded / total * 100) : 0 });
    };
    try {
      await prepare(choice, show, abort.signal);
      if (abort.signal.aborted) return;
      bar.value = bar.max;
      message.textContent = T('Fet! LECAA Docs ja funciona sense connexió en aquest dispositiu.', '¡Hecho! LECAA Docs ya funciona sin conexión en este dispositivo.');
      message.className = 'install-message done';
      message.hidden = false;
      cancel.textContent = T('D’acord', 'De acuerdo');
      if (!dlg.open) toast(T('LECAA Docs ja funciona sense connexió', 'LECAA Docs ya funciona sin conexión'));
    } catch (e) {
      message.textContent = !navigator.onLine
        ? T('No hi ha connexió a internet. Torna-ho a provar quan n’hi hagi.', 'No hay conexión a internet. Vuelve a intentarlo cuando la haya.')
        : T('No s’ha pogut descarregar tot. Torna-ho a provar.', 'No se ha podido descargar todo. Vuelve a intentarlo.');
      if (!(e instanceof OfflineError)) console.warn(e);
      message.className = 'install-message warn';
      message.hidden = false;
      go.textContent = T('Reintenta', 'Reintentar');
      go.hidden = false;
      if (!dlg.open) toast(T('No s’ha pogut descarregar tot LECAA Docs. Ho tornarà a provar en obrir-la.', 'No se ha podido descargar todo LECAA Docs. Lo volverá a intentar al abrirla.'));
    } finally {
      running = false;
    }
  }

  go.addEventListener('click', async () => {
    if (running) return;
    if (go.textContent === T('Reintenta', 'Reintentar')) { void download(); return; }
    if (mode === 'ios' || mode === 'mac') {
      // The steps, in the same dialog.
      body.replaceChildren(...[
        h('ol', { class: 'install-steps' }, ...stepsList(mode)),
        pictosChoiceSupported ? h('p', { class: 'hint' }, T('El primer cop que obris l’app instal·lada, podràs triar si també vols tots els pictogrames sense connexió.', 'La primera vez que abras la app instalada, podrás elegir si también quieres todos los pictogramas sin conexión.')) : null,
        h('div', { class: 'install-actions' }, h('button', { class: 'small-btn primary', type: 'button', onclick: close }, T('D’acord', 'De acuerdo'))),
      ].filter(n => n !== null));
      (body.querySelector('.install-actions button') as HTMLButtonElement).focus();
      return;
    }
    saveChoice(choice);
    if (mode === 'prompt' && deferred) {
      const ev = deferred;
      deferred = null; // a prompt can only be shown once
      onChange?.();
      try {
        await ev.prompt(); // still within the click: browsers need it
        const { outcome } = await ev.userChoice;
        if (outcome !== 'accepted') { close(); return; }
        toast(T('LECAA Docs s’està instal·lant', 'LECAA Docs se está instalando'));
      } catch { close(); return; /* the browser refused it: it will offer it again later */ }
    }
    void download();
  });
  // Closing the dialog doesn't stop a download that has started: it finishes in the background.
  dlg.addEventListener('close', () => { dlg.remove(); onClose(); });
  dlg.addEventListener('click', e => { if (e.target === dlg && !running) close(); });
  document.body.append(dlg);
  dlg.showModal();
  go.focus();
  return dlg;
}

// The toolbar button, hidden while there is nothing to install.
export function installButton(): HTMLButtonElement {
  const label = T('Instal·la l’app', 'Instalar la app');
  const btn = h('button', { class: 'vbtn ghost icon-only kiosk-hide install-btn', type: 'button', title: label, 'aria-label': label }, icon(Download));
  const refresh = () => { btn.hidden = way() === null; };
  onChange = refresh;
  for (const m of ['standalone', 'fullscreen', 'minimal-ui', 'window-controls-overlay']) matchMedia(`(display-mode: ${m})`).addEventListener?.('change', refresh);
  btn.addEventListener('click', () => {
    const w = way();
    if (w) offlineDialog(w, () => { refresh(); if (!btn.hidden) btn.focus(); });
  });
  refresh();
  return btn;
}

// The installed app, opened for the first time without a choice: asks it (Safari keeps the
// installed app's data apart, so a choice made in the browser is not there). With a choice, it
// finishes quietly what is missing.
export function firstRunInInstalledApp() {
  if (!offlineAppSupported || !standalone() || savedChoice() !== null || !navigator.onLine) return;
  offlineDialog('setup', () => { if (savedChoice() === null) saveChoice('app'); });
}
