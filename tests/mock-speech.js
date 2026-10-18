// Fake Catalan voice for headless tests: records what would be spoken.
(() => {
  window.__spoken = [];
  window.__clips = [];
  const voice = { name: 'Prova Català', lang: 'ca-ES', voiceURI: 'prova-ca', localService: true, default: true };
  const listeners = {};
  let current = null, timer = 0;
  const synth = {
    getVoices: () => [voice],
    speak(u) {
      window.__spoken.push(u.text);
      current = u;
      const dur = Math.max(80, u.text.length * 60);
      timer = setTimeout(() => { if (current === u) { current = null; u.onend && u.onend({}); } }, dur);
      setTimeout(() => u.onboundary && u.onboundary({ name: 'word', charIndex: 0, charLength: 3 }), 10);
    },
    cancel() { clearTimeout(timer); const u = current; current = null; if (u && u.onend) u.onend({}); },
    pause() {}, resume() {},
    get speaking() { return !!current; },
    addEventListener(t, f) { (listeners[t] ||= []).push(f); },
    removeEventListener() {},
  };
  window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
  window.showSaveFilePicker = undefined;
  Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
  HTMLMediaElement.prototype.play = function () {
    window.__clips.push(this.src.slice(0, 60));
    setTimeout(() => this.onended && this.onended(), 100);
    return Promise.resolve();
  };
})();
