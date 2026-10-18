// Native engine: talks to the Rust side of the packaged app (src-tauri/src/tts),
// which reads the operating system's own voice registries (SAPI 5, OneCore and
// Speech Platform on Windows; AVSpeechSynthesizer on macOS; speech-dispatcher on Linux).

import type { SpeakOptions, SpeechEngine, VoiceInfo } from './types';

type TtsEvent = { id: number; kind: 'word' | 'end' | 'error'; charIndex?: number; charLength?: number; message?: string };

const PREFIX = 'native:';

export const inTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export class NativeEngine implements SpeechEngine {
  readonly kind = 'native' as const;
  readonly wordBoundaries = true;
  private pending = new Map<number, { resolve: () => void; onWord?: SpeakOptions['onWord'] }>();
  private listening: Promise<unknown> | null = null;
  private seq = 0;

  available() { return inTauri(); }

  private async invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<T>(cmd, args);
  }

  private ensureListener() {
    if (!this.listening) {
      this.listening = import('@tauri-apps/api/event').then(({ listen }) =>
        listen<TtsEvent>('tts-event', ({ payload }) => {
          const p = this.pending.get(payload.id);
          if (!p) return;
          if (payload.kind === 'word') p.onWord?.(payload.charIndex ?? 0, payload.charLength ?? 0);
          else { this.pending.delete(payload.id); p.resolve(); }
        }));
    }
    return this.listening;
  }

  async listVoices(): Promise<VoiceInfo[]> {
    if (!this.available()) return [];
    try {
      const vs = await this.invoke<VoiceInfo[]>('tts_voices');
      return vs.map(v => ({ ...v, id: PREFIX + v.id }));
    } catch (e) {
      console.warn('tts_voices', e);
      return [];
    }
  }

  onVoicesChanged() { /* native voices are re-listed when the settings drawer opens */ }

  async speak(voiceId: string, text: string, opts: SpeakOptions): Promise<void> {
    await this.ensureListener();
    this.stop();
    const id = ++this.seq;
    return new Promise<void>(resolve => {
      this.pending.set(id, { resolve, onWord: opts.onWord });
      this.invoke('tts_speak', {
        req: { id, voice: voiceId.slice(PREFIX.length), text, rate: opts.rate, pitch: opts.pitch, volume: opts.volume },
      }).catch(() => { this.pending.delete(id); resolve(); });
    });
  }

  stop() {
    for (const [, p] of this.pending) p.resolve();
    this.pending.clear();
    if (this.available()) this.invoke('tts_stop').catch(() => {});
  }
}
