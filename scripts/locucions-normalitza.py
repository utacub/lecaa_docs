#!/usr/bin/env python3
"""Prepares a generated letter-sound clip for the app, like the Catalan clips: keeps one stretch
of sound (by default the first: the model often adds an example word after a pause), caps its
length, brings the peak to -1 dBFS, adds 50 ms of silence and short fades at both ends, and writes
a small mono MP3. Needs ffmpeg and numpy.

  python3 scripts/locucions-normalitza.py input.mp3 output.mp3 [--segment N] [--max 0.9]
          [--onset] [--stretch 2] [--then other.mp3]

--segment N   keep the N-th stretch of sound (1 = first); stretches are split by pauses of 60 ms+
--onset       keep only the unvoiced start of the stretch (a fricative before the vowel of a word)
--stretch F   make it F times longer without changing the pitch (for short fricatives)
--then FILE   append the first stretch of another clip (for example k + s = ks)
"""
import argparse, subprocess
import numpy as np

SR = 44100

def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()

def stretches(x, frame=441):
    """(start, end) samples of the stretches of sound, split by pauses of 60 ms or more."""
    n = len(x) // frame
    rms = np.sqrt((x[:n * frame].reshape(n, frame) ** 2).mean(axis=1))
    active = rms > rms.max() * 10 ** (-35 / 20)
    out, i = [], 0
    while i < n:
        if not active[i]:
            i += 1
            continue
        j = last = i
        while j < n and (active[j] or j - last < 6):
            if active[j]:
                last = j
            j += 1
        out.append((i * frame, (last + 1) * frame))
        i = last + 1
    return out

def voiced(f):
    f = f - f.mean()
    ac = np.correlate(f, f, 'full')[len(f) - 1:]
    if ac[0] <= 0:
        return False
    ac /= ac[0]
    return ac[SR // 400:SR // 60].max() > 0.45 and ((f[:-1] * f[1:]) < 0).mean() < 0.25

def piece(path, segment=1, onset=False):
    x = load(path)
    segs = stretches(x)
    a, b = segs[min(segment, len(segs)) - 1]
    y = x[a:b]
    if onset:  # unvoiced start, up to the first run of 3 voiced 10 ms frames
        hop, run, end = 441, 0, len(y)
        for k in range(0, len(y) - 882, hop):
            run = run + 1 if voiced(y[k:k + 882]) else 0
            if run == 3:
                end = k - 2 * hop
                break
        y = y[:max(end, hop)]
    return y

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src'); ap.add_argument('dst')
    ap.add_argument('--segment', type=int, default=1)
    ap.add_argument('--max', type=float, default=0.9)
    ap.add_argument('--onset', action='store_true')
    ap.add_argument('--stretch', type=float, default=1)
    ap.add_argument('--then')
    o = ap.parse_args()
    y = piece(o.src, o.segment, o.onset)
    if o.then:
        y = np.concatenate([y, np.zeros(int(0.02 * SR), np.float32), piece(o.then)])
    y = y[:int(o.max * SR)]
    fade = min(int(0.03 * SR), len(y) // 4)
    if fade:
        y[:fade] *= np.linspace(0, 1, fade); y[-fade:] *= np.linspace(1, 0, fade)
    y *= 10 ** (-1 / 20) / max(float(np.abs(y).max()), 1e-6)
    pad = np.zeros(int(0.05 * SR), np.float32)
    y = np.concatenate([pad, y, pad]).astype(np.float32)
    af = ['-af', f'atempo={1 / o.stretch:.4f}'] if o.stretch != 1 else []
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-i', '-', *af,
                    '-ac', '1', '-ar', str(SR), '-b:a', '64k', o.dst], input=y.tobytes(), check=True)
    print(f'{o.dst}: {len(y) / SR * o.stretch:.2f} s')

if __name__ == '__main__':
    main()
