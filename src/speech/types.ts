export interface VoiceInfo {
  id: string;            // unique across engines, e.g. "web:Microsoft Herena" or "native:sapi:…"
  name: string;
  lang: string;          // BCP 47 as reported by the engine
  engine: string;        // human label: "Navegador", "Windows (SAPI 5)", "Speech Platform"…
  offline: boolean | null; // null when the engine does not say
}

export interface SpeakOptions {
  rate: number;   // 0.5 – 2, 1 = normal
  pitch: number;  // 0.5 – 1.5
  volume: number; // 0 – 1
  onWord?: (charIndex: number, charLength: number) => void;
}

export interface SpeechEngine {
  readonly kind: 'web' | 'native' | 'neural';
  available(): boolean;
  listVoices(): Promise<VoiceInfo[]>;
  // Resolves when the utterance ends, fails or is stopped.
  speak(voiceId: string, text: string, opts: SpeakOptions): Promise<void>;
  stop(): void;
  onVoicesChanged(cb: () => void): void;
  readonly wordBoundaries: boolean;
  // True when speak() always settles by itself, so no safety timeout is needed.
  readonly reliableEnd?: boolean;
}

export const isCatalan = (lang: string) => /^ca($|[-_])/i.test(lang.trim());
