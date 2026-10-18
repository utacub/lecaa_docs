// In-app neural voices (Piper, Matxa). Voice files are downloaded once, kept in IndexedDB and
// synthesised in a worker, so they work offline in every edition, on any device with a browser.

import { LETTER_NAMES } from '../../letters';
import { settings } from '../../settings';
import type { SpeakOptions, SpeechEngine, VoiceInfo } from '../types';
import { MODELS, modelOf, type NeuralModel } from './catalog';
import { cached, fileStore, type Progress } from './store';
import type { PiperConfig, RuntimeFiles, WorkerRequest, WorkerResponse } from './voice.worker';

type Request = WorkerRequest extends infer T ? T extends WorkerRequest ? Omit<T, 'id'> : never : never;

const PREFIX = 'neural:';
const PIPER_WASM_CDN = 'https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/';
const ORT_CDN = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/';

// Smallest module using a SIMD instruction (as in wasm-feature-detect).
const SIMD = (() => {
  try { return WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11])); } catch { return false; }
})();
const ORT_FILE = SIMD ? 'ort-wasm-simd.wasm' : 'ort-wasm.wasm';

// The online and desktop editions serve the runtime themselves (public/piper); the single-file
// edition, opened from disk, fetches it from jsDelivr the first time.
function runtimeSources(file: string, cdn: string) {
  const own = location.protocol === 'file:' ? [] : [new URL(`piper/${file}`, document.baseURI).href];
  return [...own, cdn + file];
}
const RUNTIME = [
  { key: 'runtime:piper_phonemize.wasm', urls: runtimeSources('piper_phonemize.wasm', PIPER_WASM_CDN), piperOnly: true, bytes: 635_212 },
  { key: 'runtime:piper_phonemize.data', urls: runtimeSources('piper_phonemize.data', PIPER_WASM_CDN), piperOnly: true, bytes: 18_077_249 },
  { key: `runtime:${ORT_FILE}`, urls: runtimeSources(ORT_FILE, ORT_CDN), piperOnly: false, bytes: SIMD ? 10_595_041 : 9_758_086 },
];

export type InstallState = { state: 'none' | 'installed' } | { state: 'downloading'; loaded: number; total: number };

async function createWorker(): Promise<Worker> {
  const mod = __SINGLE_FILE__ ? await import('./voice.worker?worker&inline') : await import('./voice.worker?worker');
  return new mod.default();
}

export class NeuralEngine implements SpeechEngine {
  readonly kind = 'neural' as const;
  readonly wordBoundaries = true; // estimated from the length of each word
  readonly reliableEnd = true;    // always reports the end itself (first loads can take a while)
  private installed = new Set<string>();
  private downloads = new Map<string, { loaded: number; total: number }>();
  private listeners = new Set<() => void>();
  private stateListeners = new Set<() => void>();
  private worker: Worker | null = null;
  private seq = 0;
  private pending = new Map<number, (r: WorkerResponse) => void>();
  private loaded: string | null = null;
  private loading: Promise<void> | null = null;
  private ctx: AudioContext | null = null;
  private source: AudioBufferSourceNode | null = null;
  private finish: (() => void) | null = null;
  private timers: number[] = [];
  private token = 0;
  private cache = new Map<string, AudioBuffer>();
  private scanned: Promise<void> | null = null;

  available() {
    return typeof Worker !== 'undefined' && typeof indexedDB !== 'undefined' && typeof WebAssembly !== 'undefined'
      && typeof window !== 'undefined' && 'AudioContext' in window;
  }

  // ----- installed voices -----

  private scan() {
    this.scanned ??= fileStore.keys().then(keys => {
      this.installed = new Set(MODELS.filter(m => keys.includes(`model:${m.key}`)).map(m => m.key));
    });
    return this.scanned;
  }

  async listVoices(): Promise<VoiceInfo[]> {
    await this.scan();
    return MODELS.filter(m => this.installed.has(m.key)).flatMap(m => m.voices.map(v => ({
      id: PREFIX + v.id,
      name: `${v.name} · ${v.dialect}`,
      lang: 'ca-ES',
      engine: m.family === 'piper' ? 'Veus Piper (dins l’app)' : 'Veus Aina (dins l’app)',
      offline: true,
    })));
  }

  onVoicesChanged(cb: () => void) { this.listeners.add(cb); }
  onStateChanged(cb: () => void) { this.stateListeners.add(cb); }
  private changed(voices: boolean) {
    for (const l of this.stateListeners) l();
    if (voices) for (const l of this.listeners) l();
  }

  async state(key: string): Promise<InstallState> {
    await this.scan();
    const d = this.downloads.get(key);
    if (d) return { state: 'downloading', ...d };
    return { state: this.installed.has(key) ? 'installed' : 'none' };
  }

  // Bytes still to download for a model, including the shared runtime when it is missing.
  async downloadSize(m: NeuralModel) {
    const keys = await fileStore.keys();
    return m.bytes + RUNTIME.filter(r => (!r.piperOnly || m.family === 'piper') && !keys.includes(r.key)).reduce((a, r) => a + r.bytes, 0);
  }

  async install(key: string) {
    const m = MODELS.find(x => x.key === key);
    if (!m || this.downloads.has(key)) return;
    const total = await this.downloadSize(m);
    const parts = new Map<string, number>();
    const progress = (part: string): Progress => loaded => {
      parts.set(part, loaded);
      this.downloads.set(key, { loaded: [...parts.values()].reduce((a, b) => a + b, 0), total });
      this.changed(false);
    };
    this.downloads.set(key, { loaded: 0, total });
    this.changed(false);
    try {
      for (const r of RUNTIME) if (!r.piperOnly || m.family === 'piper') await cached(r.key, r.urls, progress(r.key));
      if (m.config) await cached(`config:${m.key}`, m.config);
      await cached(`model:${m.key}`, m.model, progress('model'));
      this.installed.add(key);
    } finally {
      this.downloads.delete(key);
      this.changed(true);
    }
  }

  async uninstall(key: string) {
    if (this.loaded === key) { this.worker?.terminate(); this.worker = null; this.loaded = null; this.loading = null; }
    await fileStore.delete(`model:${key}`);
    await fileStore.delete(`config:${key}`);
    this.installed.delete(key);
    this.cache.clear();
    this.changed(true);
  }

  // ----- synthesis -----

  // One request at a time; feedback the user is waiting for goes ahead of prewarming.
  private queue: { msg: Request; transfer: Transferable[]; low: boolean; resolve: (r: WorkerResponse) => void }[] = [];
  private running = false;

  private call(msg: Request, transfer: Transferable[] = [], low = false): Promise<WorkerResponse> {
    return new Promise(resolve => {
      const job = { msg, transfer, low, resolve };
      if (low) this.queue.push(job);
      else this.queue.splice(this.queue.findIndex(j => j.low) >>> 0, 0, job);
      void this.pump();
    });
  }

  private async pump() {
    if (this.running) return;
    this.running = true;
    try {
      for (let job = this.queue.shift(); job; job = this.queue.shift()) {
        const id = ++this.seq;
        const res = await new Promise<WorkerResponse>(resolve => {
          this.pending.set(id, resolve);
          this.worker!.postMessage({ ...job!.msg, id }, job!.transfer);
        });
        job.resolve(res);
      }
    } finally { this.running = false; }
  }

  private async runtime(m: NeuralModel): Promise<RuntimeFiles> {
    const get = (key: string) => fileStore.get(key);
    const ortWasm = await get(`runtime:${ORT_FILE}`);
    if (!ortWasm) throw new Error('runtime missing');
    return m.family === 'piper'
      ? { phonemizeWasm: await get('runtime:piper_phonemize.wasm'), phonemizeData: await get('runtime:piper_phonemize.data'), ortWasm: { [ORT_FILE]: ortWasm } }
      : { ortWasm: { [ORT_FILE]: ortWasm } };
  }

  private ensureLoaded(m: NeuralModel): Promise<void> {
    if (this.loaded === m.key) return Promise.resolve();
    if (this.loading) return this.loading.then((): Promise<void> => this.ensureLoaded(m));
    this.loading = (async () => {
      if (!this.worker) {
        this.worker = await createWorker();
        this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
          const r = this.pending.get(e.data.id);
          this.pending.delete(e.data.id);
          r?.(e.data);
        };
      }
      const model = await fileStore.get(`model:${m.key}`);
      if (!model) throw new Error('voice not downloaded');
      const configBlob = m.config ? await fileStore.get(`config:${m.key}`) : undefined;
      const config = configBlob ? JSON.parse(await configBlob.text()) as PiperConfig : undefined;
      const buf = await model.arrayBuffer();
      const r = await this.call({ type: 'load', runtime: await this.runtime(m), key: m.key, family: m.family, model: buf, config }, [buf]);
      if (!r.ok) throw new Error(r.error);
      this.loaded = m.key;
      this.cache.clear();
    })().finally(() => { this.loading = null; });
    return this.loading;
  }

  // Letter names are short and frequent: synthesise them ahead so feedback has no delay.
  private prewarm(voiceId: string, rate: number) {
    if (settings.value.feedback.letter !== 'name') return;
    for (const name of new Set(Object.values(LETTER_NAMES))) void this.buffer(voiceId, name, rate, true).catch(() => null);
  }

  private async buffer(voiceId: string, text: string, rate: number, low = false): Promise<AudioBuffer | null> {
    const m = modelOf(voiceId);
    if (!m) return null;
    const ck = `${voiceId}|${rate}|${text}`;
    const hit = this.cache.get(ck);
    if (hit) return hit;
    const fresh = this.loaded !== m.key;
    await this.ensureLoaded(m);
    if (fresh && !low) this.prewarm(voiceId, rate);
    if (low && this.loaded !== m.key) return null;
    const speaker = m.voices.find(v => v.id === voiceId)?.speaker;
    const r = await this.call({ type: 'synth', text, rate, speaker }, [], low);
    if (!r.ok) throw new Error(r.error);
    if (!r.audio?.length) return null;
    this.ctx ??= new AudioContext();
    const buf = this.ctx.createBuffer(1, r.audio.length, r.sampleRate!);
    buf.copyToChannel(r.audio as Float32Array<ArrayBuffer>, 0);
    if (text.length <= 30) {
      if (this.cache.size > 300) this.cache.delete(this.cache.keys().next().value!);
      this.cache.set(ck, buf);
    }
    return buf;
  }

  async speak(voiceId: string, text: string, opts: SpeakOptions): Promise<void> {
    this.stop();
    const my = ++this.token;
    const id = voiceId.slice(PREFIX.length);
    let buf: AudioBuffer | null;
    try { buf = await this.buffer(id, text, opts.rate); } catch (e) { console.warn('[neural]', e); return; }
    if (!buf || my !== this.token) return;
    const ctx = this.ctx!;
    if (ctx.state === 'suspended') await ctx.resume().catch(() => undefined);
    return new Promise<void>(resolve => {
      const src = ctx.createBufferSource();
      const gain = ctx.createGain();
      gain.gain.value = opts.volume;
      src.buffer = buf;
      src.connect(gain).connect(ctx.destination);
      let done = false;
      const end = () => {
        if (done) return;
        done = true;
        this.clearTimers();
        if (this.source === src) { this.source = null; this.finish = null; }
        resolve();
      };
      src.onended = end;
      this.source = src;
      this.finish = end;
      if (opts.onWord) this.scheduleWords(text, buf!.duration, opts.onWord);
      this.timers.push(window.setTimeout(end, buf!.duration * 1000 + 1500)); // context never started
      src.start();
    });
  }

  // Spreads word highlights over the audio in proportion to word length (an estimate:
  // these models do not report word timings).
  private scheduleWords(text: string, seconds: number, onWord: (i: number, len: number) => void) {
    const words = [...text.matchAll(/[\p{L}\p{N}][\p{L}\p{M}\p{N}'’·-]*/gu)];
    if (!words.length) return;
    const weight = (s: string) => s.length + 2;
    const total = words.reduce((a, w) => a + weight(w[0]), 0);
    let acc = 0;
    for (const w of words) {
      const at = (acc / total) * seconds * 1000;
      this.timers.push(window.setTimeout(() => onWord(w.index!, w[0].length), at));
      acc += weight(w[0]);
    }
  }

  private clearTimers() {
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
  }

  stop() {
    this.token++;
    this.clearTimers();
    const src = this.source, f = this.finish;
    this.source = null;
    this.finish = null;
    try { src?.stop(); } catch { /* not started */ }
    f?.();
  }
}

export const neural = new NeuralEngine();
