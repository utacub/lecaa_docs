// "Marc teòric": why the app offers each option, with the research behind it (APA 7 citations).
// The text of each language is a module of its own (src/marc-teoric), loaded when it is opened;
// the references are shared.

import { BookOpen, X } from 'lucide';
import { LANG, T, type Lang } from './i18n';
import { REFERENCES } from './marc-teoric/referencies';
import type { Framework } from './marc-teoric/tipus';
import { h, icon } from './ui';

const TEXTS: Record<Lang, () => Promise<{ default: Framework }>> = {
  ca: () => import('./marc-teoric/ca'),
  es: () => import('./marc-teoric/es'),
  eu: () => import('./marc-teoric/eu'),
  gl: () => import('./marc-teoric/gl'),
  en: () => import('./marc-teoric/en'),
  fr: () => import('./marc-teoric/fr'),
};

// *italics* and links (the DOIs of the references, always at the end).
function rich(text: string): (string | Node)[] {
  return text.split(/(\*[^*]+\*|https:\/\/\S+)/).filter(Boolean).map(part => {
    if (part.startsWith('*') && part.endsWith('*')) return h('em', {}, part.slice(1, -1));
    if (part.startsWith('https://')) return h('a', { href: part, target: '_blank', rel: 'noopener noreferrer', referrerpolicy: 'no-referrer' }, part);
    return part;
  });
}

export function frameworkButton(): HTMLButtonElement {
  const btn = h('button', { class: 'small-btn framework-btn', type: 'button' }, icon(BookOpen), T('Marc teòric', 'Marco teórico')) as HTMLButtonElement;
  btn.addEventListener('click', () => void openFramework(() => btn.focus()));
  return btn;
}

export async function openFramework(onClose: () => void): Promise<void> {
  const fw = (await TEXTS[LANG]()).default;
  const close = () => dlg.close();
  const dlg = h('dialog', { class: 'about framework', 'aria-labelledby': 'framework-title', lang: LANG },
    h('header', {},
      h('h2', { id: 'framework-title' }, T('Marc teòric', 'Marco teórico')),
      h('button', { class: 'tb', type: 'button', 'aria-label': T('Tanca', 'Cerrar'), onclick: close }, icon(X))),
    h('div', { class: 'body', tabindex: '0', role: 'document' },
      ...fw.intro.map(p => h('p', { class: 'framework-intro' }, ...rich(p))),
      ...fw.sections.map(s => h('section', {}, h('h3', {}, s.title), ...s.paras.map(p => h('p', {}, ...rich(p))))),
      h('section', { class: 'framework-refs' },
        h('h3', {}, fw.references),
        h('ul', {}, ...REFERENCES.map(r => h('li', {}, ...rich(r)))))));
  dlg.addEventListener('close', () => { dlg.remove(); onClose(); });
  dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
  document.body.append(dlg);
  dlg.showModal();
  (dlg.querySelector('.body') as HTMLElement).focus();
}
