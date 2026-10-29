// Web Speech API engine. Exposes whatever voices the browser or webview reports;
// on several platforms that is not every voice installed (see planificacio.md §4).

import { BCP47, T } from '../i18n';
import type { SpeakOptions, SpeechEngine, VoiceInfo } from './types';

const PREFIX = 'web:';

export class WebSpeechEngine implements SpeechEngine {
  readonly kind = 'web' as const;
  wordBoundaries = false;
  private current: SpeechSynthesisUtterance | null = null;
  private finish: (() => void) | null = null;

  available() { return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined'; }

  private voices(): SpeechSynthesisVoice[] {
    try { return speechSynthesis.getVoices(); } catch { return []; }
  }

  async listVoices(): Promise<VoiceInfo[]> {
    if (!this.available()) return [];
    let vs = this.voices();
    if (!vs.length) {
      // Chrome fills the list asynchronously.
      await new Promise<void>(res => {
        const t = setTimeout(res, 1500);
        speechSynthesis.addEventListener('voiceschanged', () => { clearTimeout(t); res(); }, { once: true });
      });
      vs = this.voices();
    }
    return vs.map(v => ({
      id: PREFIX + v.voiceURI + '|' + v.name,
      name: v.name,
      lang: v.lang,
      engine: T('Navegador', 'Navegador'),
      offline: v.localService,
    }));
  }

  onVoicesChanged(cb: () => void) {
    if (this.available()) speechSynthesis.addEventListener('voiceschanged', cb);
  }

  speak(voiceId: string, text: string, opts: SpeakOptions): Promise<void> {
    this.stop();
    return new Promise<void>(resolve => {
      const u = new SpeechSynthesisUtterance(text);
      const v = this.voices().find(x => PREFIX + x.voiceURI + '|' + x.name === voiceId);
      try {
        if (v) { u.voice = v; u.lang = v.lang; } else { u.lang = BCP47; }
      } catch { /* voice object from another realm */ }
      u.rate = opts.rate; u.pitch = opts.pitch; u.volume = opts.volume;
      let done = false;
      const end = () => {
        if (done) return;
        done = true;
        if (this.current === u) { this.current = null; this.finish = null; }
        resolve();
      };
      u.onend = end;
      u.onerror = end;
      u.onboundary = e => {
        if (e.name && e.name !== 'word') return;
        this.wordBoundaries = true;
        opts.onWord?.(e.charIndex, e.charLength || 0);
      };
      this.current = u;
      this.finish = end;
      try { speechSynthesis.speak(u); } catch { end(); }
    });
  }

  stop() {
    const f = this.finish;
    this.current = null;
    this.finish = null;
    // Cancelling an idle synthesizer can make Safari drop the next utterance.
    try { if (speechSynthesis.speaking || speechSynthesis.pending) speechSynthesis.cancel(); } catch { /* ignore */ }
    f?.();
  }
}
