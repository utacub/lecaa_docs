// Saves the reading of the whole document as an MP3 file, made on the device itself (the encoder,
// LAME in JavaScript, is part of the app and works without a connection).
//
// Two ways, depending on the voice:
// - The voices inside the app (Piper) hand their audio to the app: the file is made directly,
//   faster than reading aloud, offline, on every device.
// - The voices of the system and of the browser (for example the natural voices of Microsoft Edge)
//   send their sound straight to the loudspeakers, and the Web Speech API gives no way to get it.
//   The only way a web page can record them is to read the document aloud while it records the
//   sound of the computer through screen sharing (getDisplayMedia) with "share system audio",
//   which Chromium browsers (Edge, Chrome) offer on Windows and ChromeOS. It takes as long as the
//   reading, and it records whatever else sounds on the computer meanwhile.

import type { Editor } from '@tiptap/core';
import { Mp3Encoder } from '@breezystack/lamejs';
import { X } from 'lucide';
import { LANG, T } from './i18n';
import { canOpenInEdge, edgeLink, emptyEdgeLink } from './edge-handoff';
import { collect } from './reader';
import { settings } from './settings';
import { speech, type VoiceInfo } from './speech';
import { audioContext } from './speech/audio';
import { neural } from './speech/neural';
import { MODELS } from './speech/neural/catalog';
import { forSpeech } from './speech/text';
import { h, icon, toast } from './ui';

const KBPS = 64;              // plenty for one voice
const SENTENCE_PAUSE = 0.3;   // seconds of silence between sentences
const PARAGRAPH_PAUSE = 0.7;  // and between paragraphs

export const direct = (v: VoiceInfo) => v.id.startsWith('neural:');

// Recording the sound of the computer: a desktop browser with screen sharing. iPad, iPhone and
// Android browsers cannot share the screen from a page.
const mobile = /Android|iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
export const canCapture = () => !mobile && typeof navigator.mediaDevices?.getDisplayMedia === 'function' && typeof MediaRecorder !== 'undefined';

// Sentences of the document, paragraph by paragraph.
function paragraphs(editor: Editor): string[][] {
  const doc = editor.state.doc;
  const out: string[][] = [];
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    const ss = collect(doc, pos, pos + node.nodeSize).map(s => s.text);
    if (ss.length) out.push(ss);
    return false;
  });
  return out;
}

const duration = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60) % 60).padStart(2, '0')}`;
const tick = () => new Promise(r => setTimeout(r, 0));

// Mono MP3, encoded as the audio arrives.
class Mp3Writer {
  private enc: Mp3Encoder;
  private chunks: Uint8Array<ArrayBuffer>[] = [];
  samples = 0;
  constructor(readonly sampleRate: number) { this.enc = new Mp3Encoder(1, sampleRate, KBPS); }
  private push(b: Uint8Array) { if (b.length) this.chunks.push(new Uint8Array(b)); }
  async add(f: Float32Array, volume = 1) {
    const pcm = new Int16Array(f.length);
    for (let i = 0; i < f.length; i++) {
      const v = Math.max(-1, Math.min(1, f[i] * volume));
      pcm[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
    }
    // In slices, so that the page stays responsive on slow devices.
    for (let i = 0; i < pcm.length; i += 1152 * 64) {
      this.push(this.enc.encodeBuffer(pcm.subarray(i, i + 1152 * 64)));
      await tick();
    }
    this.samples += pcm.length;
  }
  silence(seconds: number) {
    const n = Math.round(seconds * this.sampleRate);
    this.push(this.enc.encodeBuffer(new Int16Array(n)));
    this.samples += n;
  }
  get seconds() { return this.samples / this.sampleRate; }
  finish() { this.push(this.enc.flush()); return new Blob(this.chunks, { type: 'audio/mpeg' }); }
}

// A recording (webm/opus or mp4) as mono samples, without the silence at both ends.
async function decodeRecording(blob: Blob): Promise<{ audio: Float32Array; sampleRate: number; peak: number }> {
  const ctx = audioContext();
  if (!ctx) throw new Error('no Web Audio');
  const data = await blob.arrayBuffer();
  const buf = await new Promise<AudioBuffer>((res, rej) => { ctx.decodeAudioData(data, res, rej); });
  const n = buf.length, chans = buf.numberOfChannels;
  const mono = new Float32Array(n);
  for (let c = 0; c < chans; c++) { const d = buf.getChannelData(c); for (let i = 0; i < n; i++) mono[i] += d[i] / chans; }
  let peak = 0, first = -1, last = -1;
  for (let i = 0; i < n; i++) {
    const a = Math.abs(mono[i]);
    if (a > peak) peak = a;
    if (a > 0.01) { if (first < 0) first = i; last = i; }
  }
  const pad = Math.round(buf.sampleRate * 0.2);
  const audio = first < 0 ? new Float32Array(0) : mono.slice(Math.max(0, first - pad), Math.min(n, last + pad));
  return { audio, sampleRate: buf.sampleRate, peak };
}

export interface Mp3Options {
  title: string;
  save: (blob: Blob) => Promise<boolean>;
  saveDocx: () => Promise<boolean>;
  openSettings: () => void;
  onClose: () => void;
}

export function exportMp3(editor: Editor, opts: Mp3Options) {
  const paras = paragraphs(editor);
  if (!paras.length) { toast(T('El document no té text per llegir.', 'El documento no tiene texto para leer.')); opts.onClose(); return; }
  const total = paras.reduce((a, p) => a + p.length, 0);

  const current = speech.currentVoice();
  // The voices that can be used: the Piper ones always; the others where the sound of the
  // computer can be recorded. The active voice comes first.
  const all = speech.langVoices().filter(v => direct(v) || canCapture());
  const voices = current && all.includes(current) ? [current, ...all.filter(v => v !== current)] : all;
  let chosen = voices[0];
  let running = false;
  const abort = { stop: false };

  const close = () => { abort.stop = true; speech.stop(); dlg.close(); };
  const body = h('div', { class: 'body' });
  const dlg = h('dialog', { class: 'about install mp3-export', 'aria-labelledby': 'mp3-title' },
    h('header', {},
      h('h2', { id: 'mp3-title' }, T('Desa el document en MP3', 'Guardar el documento en MP3')),
      h('button', { class: 'tb', type: 'button', 'aria-label': T('Tanca', 'Cerrar'), onclick: close }, icon(X))),
    body);
  const actions = (...buttons: HTMLElement[]) => h('div', { class: 'install-actions' }, ...buttons);
  const button = (label: string, onclick: () => void, primary = false) =>
    h('button', { class: 'small-btn' + (primary ? ' primary' : ''), type: 'button', onclick }, label);

  // No voice that can be used here: why, and how to get one.
  function noVoice() {
    const offered = MODELS.some(m => m.offer.includes(LANG));
    body.replaceChildren(...[
      current ? h('p', {}, T('En aquest dispositiu, la veu activada ({nom}) no es pot gravar: és del sistema o del navegador, i només es pot gravar el so de l’ordinador amb Edge o Chrome a Windows o a un Chromebook.',
        'En este dispositivo, la voz activada ({nom}) no se puede grabar: es del sistema o del navegador, y solo se puede grabar el sonido del ordenador con Edge o Chrome en Windows o en un Chromebook.', { nom: current.name })) : null,
      h('p', {}, offered
        ? T('Amb una veu Piper (dins l’app) es pot desar en MP3 en qualsevol dispositiu. Se’n pot descarregar una, gratuïta, a Configuració.', 'Con una voz Piper (dentro de la app) se puede guardar en MP3 en cualquier dispositivo. Se puede descargar una, gratuita, en Configuración.')
        : T('En aquesta llengua encara no hi ha cap veu Piper.', 'En este idioma todavía no hay ninguna voz Piper.')),
      offered
        ? actions(button(T('Cancel·la', 'Cancelar'), close), button(T('Obre la configuració', 'Abrir la configuración'), () => { close(); opts.openSettings(); }, true))
        : actions(button(T('D’acord', 'De acuerdo'), close, true)),
      edgeOffer(),
    ].filter(n => n !== null));
  }

  const kindHint = (v: VoiceInfo) => direct(v)
    ? T('Es crea directament, sense connexió.', 'Se crea directamente, sin conexión.')
    : T('Es grava mentre es llegeix en veu alta (dura el mateix que la lectura).', 'Se graba mientras se lee en voz alta (dura lo mismo que la lectura).');

  // Windows outside Edge: the natural voices of Edge are a click away.
  function edgeOffer() {
    if (!canOpenInEdge()) return null;
    const note = h('p', { class: 'install-message', role: 'status', hidden: true });
    const go = button(T('Obre a Edge', 'Abrir en Edge'), async () => {
      const link = await edgeLink(opts.title, editor.getJSON());
      if (link) {
        location.href = link;
        note.textContent = T('S’està obrint Microsoft Edge amb aquest document.', 'Se está abriendo Microsoft Edge con este documento.');
      } else {
        // Too long for the link: saved as .docx, to open it from Edge.
        if (!(await opts.saveDocx())) return;
        location.href = emptyEdgeLink();
        note.textContent = T('El document és massa llarg per passar-lo directament: s’ha desat en .docx. A Edge, obre’l des de «Els meus documents».', 'El documento es demasiado largo para pasarlo directamente: se ha guardado en .docx. En Edge, ábrelo desde «Mis documentos».');
      }
      note.className = 'install-message done';
      note.hidden = false;
    });
    return h('div', { class: 'mp3-edge' },
      h('p', { class: 'hint' }, T('Les veus naturals de Microsoft Edge (com la Joana i l’Enric) només funcionen dins d’Edge. Pots obrir-hi LECAA Docs amb aquest document i desar-lo en MP3 des d’allà.', 'Las voces naturales de Microsoft Edge (como Elvira y Álvaro) solo funcionan dentro de Edge. Puedes abrir allí LECAA Docs con este documento y guardarlo en MP3 desde allí.')),
      actions(go), note);
  }

  // More than one voice: the user picks one.
  function pick() {
    const list = h('fieldset', { class: 'install-options mp3-voices' },
      h('legend', {}, T('Amb quina veu?', '¿Con qué voz?')),
      ...voices.map(v => {
        const input = h('input', { type: 'radio', name: 'mp3-voice', value: v.id, checked: v === chosen }) as HTMLInputElement;
        input.addEventListener('change', () => { chosen = v; });
        return h('label', { class: 'install-option' }, input,
          h('span', {}, h('strong', {}, v.name), v === current ? ` · ${T('activada', 'activada')}` : '', h('span', { class: 'hint' }, kindHint(v))));
      }));
    body.replaceChildren(...[list, actions(button(T('Cancel·la', 'Cancelar'), close), button(T('Següent', 'Siguiente'), start, true)), edgeOffer()].filter(n => n !== null));
    (list.querySelector('input:checked') as HTMLInputElement | null)?.focus();
  }

  function start() { if (direct(chosen)) void makeDirect(); else explainCapture(); }

  // Progress view shared by both ways.
  function progressView(first: string) {
    const bar = h('progress', { max: total, value: 0, 'aria-label': T('Creació de l’MP3', 'Creación del MP3') }) as HTMLProgressElement;
    const label = h('span', {}, first);
    const message = h('p', { class: 'install-message', role: 'status', hidden: true });
    const cancel = button(T('Cancel·la', 'Cancelar'), close);
    body.replaceChildren(
      h('p', {}, T('Veu: {nom}', 'Voz: {nom}', { nom: chosen.name })),
      h('div', { class: 'neural-progress install-progress' }, bar, label), message, actions(cancel));
    cancel.focus();
    let done = 0;
    return {
      step() { bar.value = ++done; label.textContent = T('Frase {x} de {y}', 'Frase {x} de {y}', { x: done, y: total }); },
      label(text: string) { label.textContent = text; },
      fail(text: string) {
        message.textContent = text;
        message.className = 'install-message warn';
        message.hidden = false;
        cancel.textContent = T('Tanca', 'Cerrar');
        running = false;
      },
      // Saving needs a fresh click: browsers only open the save dialog right after one.
      done(blob: Blob, seconds: number) {
        running = false;
        bar.value = total;
        message.textContent = T('Fet! L’àudio dura {temps}.', '¡Hecho! El audio dura {temps}.', { temps: duration(seconds) });
        message.className = 'install-message done';
        message.hidden = false;
        const saveBtn = button(T('Desa l’MP3', 'Guardar el MP3'), async () => {
          if (await opts.save(blob)) { toast(T('Desat com a MP3.', 'Guardado como MP3.')); close(); }
        }, true);
        cancel.textContent = T('Tanca', 'Cerrar');
        cancel.after(saveBtn);
        saveBtn.focus();
      },
    };
  }

  const errorText = (e: unknown) => T('No s’ha pogut crear l’MP3 ({error}).', 'No se ha podido crear el MP3 ({error}).', { error: String((e as Error)?.message ?? e) });

  // Piper: synthesised sentence by sentence and encoded on the way.
  async function makeDirect() {
    if (running) return;
    running = true;
    const view = progressView(T('Preparant la veu…', 'Preparando la voz…'));
    speech.stop();
    const { rate, volume } = settings.value.voice;
    let mp3: Mp3Writer | null = null;
    try {
      for (const [pi, para] of paras.entries()) {
        for (const [si, text] of para.entries()) {
          if (abort.stop) return;
          const { audio, sampleRate } = await neural.synthesize(chosen.id, forSpeech(text), rate);
          if (abort.stop) return;
          if (!mp3) mp3 = new Mp3Writer(sampleRate);
          else if (pi + si > 0) mp3.silence(si ? SENTENCE_PAUSE : PARAGRAPH_PAUSE);
          await mp3.add(audio, volume);
          view.step();
        }
      }
      if (!mp3) throw new Error('no audio');
      view.done(mp3.finish(), mp3.seconds);
    } catch (e) {
      console.warn('[mp3]', e);
      view.fail(errorText(e));
    }
  }

  // Other voices: first, what is going to happen and what to choose in the browser's dialog.
  function explainCapture() {
    body.replaceChildren(
      h('p', {}, T('Aquesta veu no deixa gravar-la directament. L’app llegirà el document en veu alta i en gravarà el so de l’ordinador.', 'Esta voz no deja grabarla directamente. La app leerá el documento en voz alta y grabará el sonido del ordenador.')),
      h('ol', { class: 'install-steps' },
        h('li', {}, T('En el quadre del navegador, tria «Tota la pantalla».', 'En el cuadro del navegador, elige «Toda la pantalla».')),
        h('li', {}, T('Activa «Comparteix també l’àudio del sistema».', 'Activa «Compartir también el audio del sistema».')),
        h('li', {}, T('Fes clic a «Comparteix» i deixa que llegeixi fins al final, sense fer sonar res més.', 'Haz clic en «Compartir» y deja que lea hasta el final, sin hacer sonar nada más.'))),
      h('p', { class: 'hint' }, T('Només es grava el so; la imatge de la pantalla no es desa enlloc.', 'Solo se graba el sonido; la imagen de la pantalla no se guarda en ninguna parte.')),
      actions(button(T('Cancel·la', 'Cancelar'), close), button(T('Comença', 'Empezar'), () => void makeCaptured(), true)));
    (body.querySelector('.primary') as HTMLButtonElement).focus();
  }

  async function makeCaptured() {
    if (running) return;
    running = true;
    let stream: MediaStream;
    try {
      // Called right after the click: browsers only allow it then.
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        systemAudio: 'include',
        selfBrowserSurface: 'include',
        surfaceSwitching: 'exclude',
        monitorTypeSurfaces: 'include',
      } as DisplayMediaStreamOptions);
    } catch (e) {
      running = false;
      if ((e as DOMException)?.name !== 'NotAllowedError') console.warn('[mp3]', e);
      explainCapture();
      return;
    }
    const stopAll = () => { for (const t of stream.getTracks()) t.stop(); };
    const view = progressView(T('Gravant…', 'Grabando…'));
    const tracks = stream.getAudioTracks();
    if (!tracks.length) {
      stopAll();
      view.fail(T('No s’ha compartit cap so. Torna-ho a provar i activa «Comparteix també l’àudio del sistema».', 'No se ha compartido ningún sonido. Vuelve a intentarlo y activa «Compartir también el audio del sistema».'));
      return;
    }
    const type = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find(t => MediaRecorder.isTypeSupported(t));
    const rec = new MediaRecorder(new MediaStream(tracks), type ? { mimeType: type } : undefined);
    const parts: Blob[] = [];
    rec.ondataavailable = e => { if (e.data.size) parts.push(e.data); };
    const stopped = new Promise<void>(res => { rec.onstop = () => res(); });
    // Sharing stopped from the browser's bar: the reading stops too.
    for (const t of stream.getTracks()) t.addEventListener('ended', () => { abort.stop = true; speech.stop(); });
    speech.stop();
    rec.start(1000);
    try {
      await new Promise(r => setTimeout(r, 400));
      for (const [pi, para] of paras.entries()) {
        for (const [si, text] of para.entries()) {
          if (abort.stop) break;
          if (pi + si > 0) await new Promise(r => setTimeout(r, (si ? SENTENCE_PAUSE : PARAGRAPH_PAUSE) * 1000));
          await speech.sayWith(chosen, forSpeech(text));
          view.step();
        }
        if (abort.stop) break;
      }
      await new Promise(r => setTimeout(r, 500));
    } finally {
      if (rec.state !== 'inactive') rec.stop();
      await stopped;
      stopAll();
    }
    if (abort.stop) { if (dlg.open) view.fail(T('S’ha aturat la gravació.', 'Se ha detenido la grabación.')); return; }
    try {
      view.label(T('Creant l’MP3…', 'Creando el MP3…'));
      const { audio, sampleRate, peak } = await decodeRecording(new Blob(parts, { type: rec.mimeType }));
      if (peak < 0.02 || !audio.length) {
        view.fail(T('La gravació no té so. Torna-ho a provar triant «Tota la pantalla» i activant «Comparteix també l’àudio del sistema» (només ho ofereixen Edge i Chrome a Windows i als Chromebooks).',
          'La grabación no tiene sonido. Vuelve a intentarlo eligiendo «Toda la pantalla» y activando «Compartir también el audio del sistema» (solo lo ofrecen Edge y Chrome en Windows y en los Chromebooks).'));
        return;
      }
      const mp3 = new Mp3Writer(sampleRate);
      await mp3.add(audio);
      view.done(mp3.finish(), mp3.seconds);
    } catch (e) {
      console.warn('[mp3]', e);
      view.fail(errorText(e));
    }
  }

  dlg.addEventListener('close', () => { abort.stop = true; speech.stop(); dlg.remove(); opts.onClose(); });
  dlg.addEventListener('click', e => { if (e.target === dlg && !running) close(); });
  document.body.append(dlg);
  dlg.showModal();
  if (!voices.length) noVoice();
  else if (voices.length > 1 || canOpenInEdge()) pick();
  else start();
}
