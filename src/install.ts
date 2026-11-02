// "Instal·la l'app": installs the online edition as an app (PWA), with its own icon and window.
// Chromium browsers (Chrome, Edge, Samsung Internet…) offer it through beforeinstallprompt, and the
// button then opens the browser's own install prompt. Safari has no prompt: on iPad and iPhone
// (any browser there) and on a Mac, the button shows how to do it from the browser's menus.
// The button is not shown when there is nothing to install: in the installed app itself, in the
// single HTML file, in the desktop app (Tauri), or in a browser that cannot install web apps.

import { Download, Share, SquarePlus, X } from 'lucide';
import { T } from './i18n';
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

const standalone = () =>
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

function steps(kind: 'ios' | 'mac', onClose: () => void) {
  const close = () => dlg.close();
  const list = kind === 'ios'
    ? [
        h('li', {}, T('Toca el botó «Compartir»', 'Toca el botón «Compartir»'), ' ', icon(Share), ' ', T('(a dalt o a baix de la pantalla).', '(arriba o abajo de la pantalla).')),
        h('li', {}, T('Tria «Afegir a la pantalla d’inici»', 'Elige «Añadir a pantalla de inicio»'), ' ', icon(SquarePlus), T('. Si no hi és, llisca la llista cap avall.', '. Si no está, desliza la lista hacia abajo.')),
        h('li', {}, T('Toca «Afegir». LECAA Docs apareixerà a la pantalla d’inici com una app més.', 'Toca «Añadir». LECAA Docs aparecerá en la pantalla de inicio como una app más.')),
      ]
    : [
        h('li', {}, T('Al menú «Arxiu» de Safari, tria «Afegir al Dock».', 'En el menú «Archivo» de Safari, elige «Añadir al Dock».')),
        h('li', {}, T('Fes clic a «Afegir». LECAA Docs s’obrirà en una finestra pròpia, des del Dock.', 'Haz clic en «Añadir». LECAA Docs se abrirá en una ventana propia, desde el Dock.')),
      ];
  const dlg = h('dialog', { class: 'about install', 'aria-labelledby': 'install-title' },
    h('header', {},
      h('h2', { id: 'install-title' }, T('Instal·la LECAA Docs', 'Instalar LECAA Docs')),
      h('button', { class: 'tb', type: 'button', 'aria-label': T('Tanca', 'Cerrar'), onclick: close }, icon(X))),
    h('div', { class: 'body' },
      h('p', {}, T('Instal·lada, l’app s’obre des de la seva icona, ocupa tota la pantalla i funciona sense connexió.', 'Instalada, la app se abre desde su icono, ocupa toda la pantalla y funciona sin conexión.')),
      h('ol', { class: 'install-steps' }, ...list)));
  dlg.addEventListener('close', () => { dlg.remove(); onClose(); });
  dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
  document.body.append(dlg);
  dlg.showModal();
}

// The toolbar button, hidden while there is nothing to install.
export function installButton(): HTMLButtonElement {
  const label = T('Instal·la l’app', 'Instalar la app');
  const btn = h('button', { class: 'vbtn ghost icon-only kiosk-hide install-btn', type: 'button', title: label, 'aria-label': label }, icon(Download));
  const refresh = () => { btn.hidden = way() === null; };
  onChange = refresh;
  for (const m of ['standalone', 'fullscreen', 'minimal-ui', 'window-controls-overlay']) matchMedia(`(display-mode: ${m})`).addEventListener?.('change', refresh);
  btn.addEventListener('click', async () => {
    const w = way();
    if (w === 'ios' || w === 'mac') { steps(w, () => btn.focus()); return; }
    if (w !== 'prompt' || !deferred) return;
    const ev = deferred;
    deferred = null; // a prompt can only be shown once
    try {
      await ev.prompt();
      const { outcome } = await ev.userChoice;
      if (outcome === 'accepted') toast(T('LECAA Docs s’està instal·lant', 'LECAA Docs se está instalando'));
    } catch { /* the browser refused it: it will offer it again later */ }
    refresh();
  });
  refresh();
  return btn;
}
