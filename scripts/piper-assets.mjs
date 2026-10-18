// Copies the in-browser Piper runtime (phonemizer + ONNX Runtime WebAssembly) into public/piper,
// so the online and desktop editions serve it from their own origin and work offline.
// The single-file edition downloads the same files from jsDelivr the first time instead.
import { copyFileSync, mkdirSync } from 'node:fs';

const out = new URL('../public/piper/', import.meta.url);
mkdirSync(out, { recursive: true });
const files = [
  ['@diffusionstudio/piper-wasm/build/piper_phonemize.wasm', 'piper_phonemize.wasm'],
  ['@diffusionstudio/piper-wasm/build/piper_phonemize.data', 'piper_phonemize.data'],
  ['onnxruntime-web/dist/ort-wasm-simd.wasm', 'ort-wasm-simd.wasm'],
  ['onnxruntime-web/dist/ort-wasm.wasm', 'ort-wasm.wasm'],
];
for (const [from, to] of files) copyFileSync(new URL(`../node_modules/${from}`, import.meta.url), new URL(to, out));
