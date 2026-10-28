// Full-screen writing mode: hides the toolbars and settings, and only a password set beforehand
// ends it. It survives reloads. Browsers always let Esc leave full screen, so the mode then stays
// on (toolbars still hidden) and offers a button to go back to full screen.
// This keeps learners in the editor; it is not a security barrier against an adult with the
// browser's developer tools.

import { T } from './i18n';
import { settings } from './settings';
import { inTauri } from './speech/native';
import { h, toast } from './ui';
import { STORAGE } from './storage-name';

const KEY = `${STORAGE}:locked`;

export async function hashPassword(pw: string): Promise<string> {
  const data = new TextEncoder().encode('lecaa-docs:' + pw);
  try {
    const d = await crypto.subtle.digest('SHA-256', data);
    return 'sha256:' + [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // No Web Crypto (very old browsers): FNV-1a, enough for a classroom lock.
    let x = 0x811c9dc5;
    for (const b of data) { x ^= b; x = Math.imul(x, 0x01000193) >>> 0; }
    return 'fnv:' + x.toString(16);
  }
}

async function setFullscreen(on: boolean) {
  try {
    if (inTauri()) {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().setFullscreen(on);
      return;
    }
    if (on && !document.fullscreenElement) await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    if (!on && document.fullscreenElement) await document.exitFullscreen();
  } catch { /* not allowed here (iframe, iOS): the toolbars are hidden anyway */ }
}

function modal(title: string, text: string, fields: string[], submit: string, onSubmit: (values: string[], show: (msg: string) => void) => Promise<boolean> | boolean) {
  const inputs = fields.map(label => h('input', { type: 'password', class: 'lock-input', 'aria-label': label, placeholder: label, autocomplete: 'off' }) as HTMLInputElement);
  const msg = h('p', { class: 'lock-msg', role: 'alert' });
  const close = () => back.remove();
  const form = h('form', { class: 'lock-card' },
    h('h2', {}, title), h('p', { class: 'hint' }, text), ...inputs, msg,
    h('div', { class: 'row' },
      h('button', { class: 'small-btn', type: 'button', onclick: close }, T('Cancel·la', 'Cancelar')),
      h('button', { class: 'small-btn primary', type: 'submit' }, submit)));
  const back = h('div', { class: 'lock-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': title }, form);
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (await onSubmit(inputs.map(i => i.value), m => { msg.textContent = m; form.classList.remove('shake'); void form.offsetWidth; form.classList.add('shake'); })) close();
  });
  back.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  document.body.append(back);
  inputs[0].focus();
}

// Asks for a new password; resolves true when one was saved.
export function askNewPassword(): Promise<boolean> {
  return new Promise(resolve => {
    let done = false;
    modal(T('Contrasenya per sortir', 'Contraseña para salir'), T('Aquesta contrasenya caldrà per sortir de la pantalla completa. Guarda-la bé.', 'Esta contraseña será necesaria para salir de la pantalla completa. Guárdala bien.'),
      [T('Contrasenya nova', 'Contraseña nueva'), T('Repeteix la contrasenya', 'Repite la contraseña')], T('Desa', 'Guardar'), async ([a, b], show) => {
        if (a.length < 4) { show(T('Ha de tenir 4 caràcters o més.', 'Debe tener 4 caracteres o más.')); return false; }
        if (a !== b) { show(T('Les dues contrasenyes no coincideixen.', 'Las dos contraseñas no coinciden.')); return false; }
        const hash = await hashPassword(a);
        settings.update(s => { s.lockPassword = hash; });
        done = true;
        resolve(true);
        return true;
      });
    const obs = new MutationObserver(() => { if (!document.querySelector('.lock-modal')) { obs.disconnect(); if (!done) resolve(false); } });
    obs.observe(document.body, { childList: true });
  });
}

class Lock {
  private back = h('button', { class: 'lock-return', type: 'button', hidden: true }, T('Torna a la pantalla completa', 'Volver a la pantalla completa'));
  private exitBtn = h('button', { class: 'lock-exit', type: 'button', title: T('Surt de la pantalla completa', 'Salir de la pantalla completa'), 'aria-label': T('Surt de la pantalla completa', 'Salir de la pantalla completa'), hidden: true }, '🔒');
  onChange: (() => void) | null = null;

  get on() { try { return localStorage.getItem(KEY) === '1'; } catch { return document.body.classList.contains('is-kiosk'); } }

  install() {
    this.back.addEventListener('click', () => void setFullscreen(true));
    this.exitBtn.addEventListener('click', () => this.askExit());
    document.body.append(this.back, this.exitBtn);
    document.addEventListener('fullscreenchange', () => this.refresh());
    this.refresh();
  }

  private refresh() {
    const on = this.on;
    document.body.classList.toggle('is-kiosk', on);
    this.exitBtn.hidden = !on;
    this.back.hidden = !on || inTauri() || !!document.fullscreenElement || !document.fullscreenEnabled;
    this.onChange?.();
  }

  async enter() {
    if (!settings.value.lockPassword && !(await askNewPassword())) return;
    try { localStorage.setItem(KEY, '1'); } catch { /* still locked for this session */ }
    document.body.classList.add('is-kiosk');
    await setFullscreen(true);
    this.refresh();
  }

  private askExit() {
    modal(T('Sortir de la pantalla completa', 'Salir de la pantalla completa'), T('Escriu la contrasenya.', 'Escribe la contraseña.'), [T('Contrasenya', 'Contraseña')], T('Surt', 'Salir'), async ([pw], show) => {
      if (await hashPassword(pw) !== settings.value.lockPassword) { show(T('La contrasenya no és correcta.', 'La contraseña no es correcta.')); return false; }
      try { localStorage.removeItem(KEY); } catch { /* ignore */ }
      document.body.classList.remove('is-kiosk');
      await setFullscreen(false);
      this.refresh();
      toast(T('Has sortit de la pantalla completa', 'Has salido de la pantalla completa'));
      return true;
    });
  }
}

export const lock = new Lock();
