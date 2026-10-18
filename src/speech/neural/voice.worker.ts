// Runs the in-app neural voices off the main thread, so typing stays responsive while a
// sentence is synthesised. Piper (VITS): espeak-ng phonemizer in WebAssembly, then the ONNX model.
// Matxa v2 (Matcha-TTS + WaveNext, BSC): graphemes straight into one end-to-end ONNX model.

import * as ort from 'onnxruntime-web/wasm';
import { matxaIds, type Family } from './catalog';
import { createPiperPhonemize, type PiperPhonemizeModule } from './phonemize-glue.js';

// Runtime files as Blobs: the worker makes its own object URLs, because a worker started from
// the single-file edition (file://) cannot read blob URLs created by the page.
export interface RuntimeFiles {
  phonemizeWasm?: Blob;
  phonemizeData?: Blob;
  ortWasm: Record<string, Blob>; // file name → contents
}

const wasmUrl = (b: Blob) => URL.createObjectURL(new Blob([b], { type: 'application/wasm' }));

export type WorkerRequest =
  | { type: 'load'; id: number; runtime: RuntimeFiles; key: string; family: Family; model: ArrayBuffer; config?: PiperConfig }
  | { type: 'synth'; id: number; text: string; rate: number; speaker?: number };

export type WorkerResponse =
  | { id: number; ok: true; audio?: Float32Array; sampleRate?: number }
  | { id: number; ok: false; error: string };

export interface PiperConfig {
  audio: { sample_rate: number };
  espeak: { voice: string };
  inference: { noise_scale: number; length_scale: number; noise_w: number };
  speaker_id_map?: Record<string, number>;
}

let phonemizer: PiperPhonemizeModule | null = null;
let onLine: ((line: string) => void) | null = null;
let session: ort.InferenceSession | null = null;
let loadedKey = '';
let family: Family = 'piper';
let config: PiperConfig | null = null;
const MATXA_RATE = 22050;

async function ensurePhonemizer(runtime: RuntimeFiles) {
  if (phonemizer) return;
  if (!runtime.phonemizeWasm || !runtime.phonemizeData) throw new Error('phonemizer missing');
  const wasm = wasmUrl(runtime.phonemizeWasm), data = URL.createObjectURL(runtime.phonemizeData);
  phonemizer = await createPiperPhonemize({
    print: line => onLine?.(line),
    printErr: () => { /* espeak-ng prints warnings here */ },
    locateFile: f => f.endsWith('.wasm') ? wasm : f.endsWith('.data') ? data : f,
  });
}

let ortReady = false;
function ensureOrt(runtime: RuntimeFiles) {
  if (ortReady) return;
  ort.env.wasm.numThreads = 1; // no SharedArrayBuffer needed, works from file:// too
  ort.env.wasm.wasmPaths = Object.fromEntries(Object.entries(runtime.ortWasm).map(([k, b]) => [k, wasmUrl(b)])) as unknown as string;
  ortReady = true;
}

function phonemeIds(text: string, voice: string): number[] {
  const ids: number[] = [];
  onLine = line => {
    try { ids.push(...(JSON.parse(line).phoneme_ids as number[])); } catch { /* not a result line */ }
  };
  try {
    // One input line per call; piper-phonemize prints one JSON line per sentence it finds.
    phonemizer!.callMain(['-l', voice, '--input', JSON.stringify([{ text }]), '--espeak_data', '/espeak-ng-data']);
  } finally {
    onLine = null;
  }
  return ids;
}

async function handle(m: WorkerRequest): Promise<WorkerResponse> {
  if (m.type === 'load') {
    if (m.family === 'piper') await ensurePhonemizer(m.runtime);
    if (loadedKey !== m.key) {
      ensureOrt(m.runtime);
      await session?.release();
      session = null;
      session = await ort.InferenceSession.create(new Uint8Array(m.model), { executionProviders: ['wasm'] });
      loadedKey = m.key;
      family = m.family;
      config = m.config ?? null;
    }
    return { id: m.id, ok: true };
  }
  if (!session) throw new Error('No voice loaded');
  if (family === 'matxa') return synthMatxa(m.id, m.text, m.rate, m.speaker ?? 0);
  if (!config) throw new Error('No voice config');
  const ids = phonemeIds(m.text.trim(), config.espeak.voice);
  if (!ids.length) return { id: m.id, ok: true, audio: new Float32Array(0), sampleRate: config.audio.sample_rate };
  const inf = config.inference;
  const feeds: Record<string, ort.Tensor> = {
    input: new ort.Tensor('int64', BigInt64Array.from(ids.map(BigInt)), [1, ids.length]),
    input_lengths: new ort.Tensor('int64', BigInt64Array.from([BigInt(ids.length)]), [1]),
    scales: new ort.Tensor('float32', Float32Array.from([inf.noise_scale, inf.length_scale / m.rate, inf.noise_w]), [3]),
  };
  if (config.speaker_id_map && Object.keys(config.speaker_id_map).length) feeds.sid = new ort.Tensor('int64', BigInt64Array.from([0n]), [1]);
  const out = await session.run(feeds);
  const audio = new Float32Array(out.output.data as Float32Array);
  return { id: m.id, ok: true, audio, sampleRate: config.audio.sample_rate };
}

// Inputs as in the BSC demo for this model (huggingface.co/spaces/BSC-LT/matxa-tts-v2, app.py):
// x, x_lengths, scales [temperature, length scale (higher = slower)], spks. The demo reads the
// waveform from the second output (hfwaveform, after mel_lengths), so the waveform is found by
// its type and size: the largest float output.
async function synthMatxa(id: number, text: string, rate: number, speaker: number): Promise<WorkerResponse> {
  const ids = matxaIds(text);
  if (ids.length < 3) return { id, ok: true, audio: new Float32Array(0), sampleRate: MATXA_RATE };
  const feeds: Record<string, ort.Tensor> = {
    x: new ort.Tensor('int64', BigInt64Array.from(ids.map(BigInt)), [1, ids.length]),
    x_lengths: new ort.Tensor('int64', BigInt64Array.from([BigInt(ids.length)]), [1]),
    scales: new ort.Tensor('float32', Float32Array.from([0.667, 1 / rate]), [2]),
  };
  if (session!.inputNames.includes('spks')) feeds.spks = new ort.Tensor('int64', BigInt64Array.from([BigInt(speaker)]), [1]);
  const out = await session!.run(feeds);
  const tensors = session!.outputNames.map(n => out[n]).filter(Boolean);
  const wav = tensors.filter(t => t.type === 'float32').sort((a, b) => b.size - a.size)[0];
  if (!wav) throw new Error('model without audio output');
  // One sentence per call, so there is no batch padding to trim. The model's other output,
  // mel_lengths, counts spectrogram frames, not samples: using it as a length cut the audio to a
  // few milliseconds.
  const audio = (wav.data as Float32Array).slice();
  if (!audio.length) throw new Error('la veu no ha generat so');
  return { id, ok: true, audio, sampleRate: MATXA_RATE };
}

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  let res: WorkerResponse;
  try { res = await handle(e.data); } catch (err) { res = { id: e.data.id, ok: false, error: String((err as Error)?.message ?? err) }; }
  if (res.ok && res.audio) (self as unknown as Worker).postMessage(res, [res.audio.buffer]);
  else (self as unknown as Worker).postMessage(res);
};
