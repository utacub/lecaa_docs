// One shared Web Audio context for the sounds the app plays itself (letter sounds and the
// voices inside the app). Safari on iPad and iPhone only lets a page make sound after a touch
// or a key press, and plays Web Audio through the ringer channel, which the silent switch
// mutes. So the context is unlocked on the first touch or key, the page declares that it
// plays media (Safari 16.4+), and the letter sounds are decoded in advance, so that each one
// starts at once, also when it is triggered long after the last touch.

type AudioSessionNavigator = Navigator & { audioSession?: { type: string } };

let ctx: AudioContext | null = null;

export function audioContext(): AudioContext | null {
  if (ctx) return ctx;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  try {
    const session = (navigator as AudioSessionNavigator).audioSession;
    if (session) session.type = 'playback';
  } catch { /* not supported */ }
  try { ctx = new AC(); } catch { return null; }
  return ctx;
}

// Resumes the context; Safari also suspends it ("interrupted") after a call or in the background.
export async function ready(): Promise<AudioContext | null> {
  const c = audioContext();
  if (c && c.state !== 'running') await c.resume().catch(() => undefined);
  return c;
}

// The first touch or key press unlocks sound for the rest of the session: the context is
// resumed and a silent sample is played, and an empty utterance does the same for speech.
export function installAudioUnlock() {
  let spoke = false;
  const unlock = (e: Event) => {
    const c = audioContext();
    if (c) {
      if (c.state !== 'running') void c.resume().catch(() => undefined);
      try {
        const src = c.createBufferSource();
        src.buffer = c.createBuffer(1, 1, 22050);
        src.connect(c.destination);
        src.start(0);
      } catch { /* ignore */ }
    }
    // Only on a touch: a key press is followed by its own feedback, which unlocks speech anyway.
    if (!spoke && e.type !== 'keydown' && 'speechSynthesis' in window && !speechSynthesis.speaking) {
      spoke = true;
      try {
        const u = new SpeechSynthesisUtterance(' ');
        u.volume = 0;
        speechSynthesis.speak(u);
      } catch { /* ignore */ }
    }
    if (c?.state === 'running' && spoke) for (const t of EVENTS) window.removeEventListener(t, unlock, true);
  };
  const EVENTS = ['pointerdown', 'touchend', 'keydown'];
  for (const t of EVENTS) window.addEventListener(t, unlock, true);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && ctx && ctx.state !== 'running') void ctx.resume().catch(() => undefined); });
}

// ----- decoded letter sounds -----

const decoded = new Map<string, Promise<AudioBuffer | null>>();

export function decodeClip(url: string): Promise<AudioBuffer | null> {
  let p = decoded.get(url);
  if (!p) {
    const c = audioContext();
    p = !c ? Promise.resolve(null) : fetch(url)
      .then(r => r.arrayBuffer())
      // The callback form also works in older Safari.
      .then(data => new Promise<AudioBuffer | null>(res => { c.decodeAudioData(data, res, () => res(null)); }))
      .catch(() => null);
    decoded.set(url, p);
  }
  return p;
}
