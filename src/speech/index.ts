// One entry point for everything that makes sound: synthetic voices from every engine
// available on this device, and the recorded letter sounds. Sequences can be cancelled
// as a whole, and `busy` tells the input guard whether audio feedback is still playing.

import { settings } from '../settings';
import { NativeEngine } from './native';
import { neural } from './neural';
import { isCatalan, type SpeechEngine, type VoiceInfo } from './types';
import { WebSpeechEngine } from './web';

export type { VoiceInfo } from './types';

const clipUrls = import.meta.glob('../assets/sons/*/*.mp3', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

export type SoundItem =
  | { kind: 'tts'; text: string; onWord?: (i: number, len: number) => void }
  | { kind: 'clip'; file: string };

type BusyListener = (busy: boolean) => void;

class SpeechHub {
  readonly engines: SpeechEngine[] = [new NativeEngine(), neural, new WebSpeechEngine()];
  voices: VoiceInfo[] = [];
  private token = 0;
  private audio: HTMLAudioElement | null = null;
  private busyCount = 0;
  private busyListeners = new Set<BusyListener>();
  private voiceListeners = new Set<() => void>();

  constructor() {
    for (const e of this.engines) if (e.available()) e.onVoicesChanged(() => this.refresh());
  }

  get busy() { return this.busyCount > 0; }
  onBusy(l: BusyListener) { this.busyListeners.add(l); }
  onVoices(l: () => void) { this.voiceListeners.add(l); }

  private setBusy(delta: number) {
    const was = this.busy;
    this.busyCount = Math.max(0, this.busyCount + delta);
    if (was !== this.busy) for (const l of this.busyListeners) l(this.busy);
  }

  async refresh() {
    const lists = await Promise.all(this.engines.filter(e => e.available()).map(e => e.listVoices()));
    this.voices = lists.flat();
    for (const l of this.voiceListeners) l();
    return this.voices;
  }

  catalanVoices() { return this.voices.filter(v => isCatalan(v.lang)); }

  // The configured voice, or the best Catalan default: system voices first, then the voices
  // downloaded into the app, offline first.
  currentVoice(): VoiceInfo | null {
    const id = settings.value.voice.id;
    const chosen = id ? this.voices.find(v => v.id === id) : undefined;
    if (chosen) return chosen;
    const ca = this.catalanVoices();
    return ca.find(v => v.id.startsWith('native:') && v.offline !== false)
      ?? ca.find(v => v.id.startsWith('neural:'))
      ?? ca.find(v => v.offline !== false)
      ?? ca[0]
      ?? null;
  }

  private engineFor(v: VoiceInfo) {
    return this.engines.find(e => v.id.startsWith(e.kind + ':'))!;
  }

  wordBoundaries() {
    const v = this.currentVoice();
    return v ? this.engineFor(v).wordBoundaries : false;
  }

  stop() {
    this.token++;
    for (const e of this.engines) if (e.available()) e.stop();
    if (this.audio) { this.audio.pause(); this.audio = null; }
  }

  // Plays the items one after another. A new call (or stop) cancels the previous sequence.
  async play(items: SoundItem[], opts: { lock?: boolean } = {}): Promise<boolean> {
    this.stop();
    const my = this.token;
    const lock = opts.lock !== false;
    if (lock) this.setBusy(+1);
    try {
      for (const item of items) {
        if (my !== this.token) return false;
        if (item.kind === 'tts') await this.say(item.text, item.onWord);
        else await this.clip(item.file);
      }
      return my === this.token;
    } finally {
      if (lock) this.setBusy(-1);
    }
  }

  private async say(text: string, onWord?: (i: number, len: number) => void) {
    const v = this.currentVoice();
    if (!v || !text.trim()) return;
    const { rate, pitch, volume } = settings.value.voice;
    const engine = this.engineFor(v);
    if (engine.reliableEnd) return engine.speak(v.id, text, { rate, pitch, volume, onWord });
    // Safety net: some engines never report the end of an utterance.
    const limit = Math.max(2500, (text.length * 110) / rate) * 2 + 1500;
    await Promise.race([
      engine.speak(v.id, text, { rate, pitch, volume, onWord }),
      new Promise<void>(res => setTimeout(res, limit)),
    ]);
  }

  clipUrl(file: string) {
    return clipUrls[`../assets/sons/${settings.value.recordedVoice}/${file}.mp3`] ?? null;
  }

  private clip(file: string) {
    const url = this.clipUrl(file);
    if (!url) return Promise.resolve();
    return new Promise<void>(resolve => {
      const a = new Audio(url);
      a.volume = settings.value.voice.volume;
      this.audio = a;
      const end = () => { if (this.audio === a) this.audio = null; resolve(); };
      a.onended = end;
      a.onerror = end;
      a.onpause = end;
      setTimeout(end, 4000);
      a.play().catch(end);
    });
  }
}

export const speech = new SpeechHub();
