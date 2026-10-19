// End-to-end check of the in-app Piper voices with real models: downloads (served locally in
// place of Hugging Face), IndexedDB storage, synthesis in the worker and audio playback.
// Usage: PIPER_DIR=/path/with/{ona,es} node tests/neural.mjs http://localhost:4173/
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
const url = process.argv[2] || 'http://localhost:4173/';
const dir = process.env.PIPER_DIR || '/tmp/claude-0/piper';
// The Ona medium model is served by its small x_low sibling (same voice, same pipeline).
const local = {
  'ca_ES-upc_ona-medium.onnx': `${dir}/ona/ca-upc_ona-x-low.onnx`,
  'ca_ES-upc_ona-medium.onnx.json': `${dir}/ona/ca-upc_ona-x-low.onnx.json`,
  // Spanish: Davefx medium is served by the carlfm x_low voice (same espeak "es" pipeline).
  'es_ES-davefx-medium.onnx': `${dir}/es/es-carlfm-x-low.onnx`,
  'es_ES-davefx-medium.onnx.json': `${dir}/es/es-carlfm-x-low.onnx.json`,
};
const npm = f => path.resolve('node_modules', f);
const cdn = {
  'piper_phonemize.wasm': npm('@diffusionstudio/piper-wasm/build/piper_phonemize.wasm'),
  'piper_phonemize.data': npm('@diffusionstudio/piper-wasm/build/piper_phonemize.data'),
  'ort-wasm-simd.wasm': npm('onnxruntime-web/dist/ort-wasm-simd.wasm'),
};
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext();
const hits = [];
await ctx.route('https://huggingface.co/**', r => {
  const f = local[r.request().url().split('/').pop()];
  hits.push(r.request().url());
  return f ? r.fulfill({ status: 200, body: fs.readFileSync(f), headers: { 'Content-Length': String(fs.statSync(f).size), 'Access-Control-Allow-Origin': '*' } }) : r.fulfill({ status: 404 });
});
await ctx.route('https://cdn.jsdelivr.net/**', r => {
  const f = cdn[r.request().url().split('/').pop()];
  hits.push(r.request().url());
  return f ? r.fulfill({ status: 200, body: fs.readFileSync(f), headers: { 'Access-Control-Allow-Origin': '*' } }) : r.fulfill({ status: 404 });
});
await ctx.addInitScript(() => {
  // Record what the app plays through Web Audio.
  window.__played = [];
  const start = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (...a) { window.__played.push(this.buffer.duration); return start.apply(this, a); };
});
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
let failures = 0;
const ok = (cond, msg) => { console.log((cond ? 'OK   ' : 'FAIL ') + msg); if (!cond) failures++; };

await page.goto(url);
await page.waitForFunction(() => document.querySelector('.ProseMirror') && window.lecaa);
await page.click('[aria-label="Configuració"], button:has-text("Configuració")');
await page.waitForSelector('.neural');
await page.evaluate(() => { document.querySelector('.neural').open = true; });
await page.click('[data-install="ona-medium"]');
await page.waitForFunction(() => document.querySelector('.neural-ok'), null, { timeout: 60000 });
ok(true, 'Ona descarregada');
ok(hits.some(h => h.includes('rhasspy/piper-voices') && h.endsWith('ca_ES-upc_ona-medium.onnx')), 'model demanat a Hugging Face (rhasspy)');
await page.waitForFunction(() => window.lecaa?.settings.value.voice.id, null, { timeout: 5000 }).catch(() => null);
const voice = await page.evaluate(() => window.lecaa.settings.value.voice.id);
ok(voice === 'neural:ona-medium', 'la veu descarregada queda seleccionada: ' + voice);
await page.waitForFunction(() => document.querySelector('#voice-select option[value="neural:ona-medium"]'), null, { timeout: 5000 }).catch(() => null);
const opts = await page.evaluate(() => [...document.querySelectorAll('#voice-select option')].map(o => o.textContent));
ok(opts.some(o => o.includes('Ona ·')), 'apareix a la llista de veus');

const t0 = Date.now();
await page.evaluate(() => window.lecaa.speech.play([{ kind: 'tts', text: 'Hola, em dic Ona i parlo català.' }], { lock: false }));
const played = await page.evaluate(() => window.__played.slice());
ok(played.length === 1 && played[0] > 1 && played[0] < 6, `frase sintetitzada i reproduïda (${played[0]?.toFixed(2)} s d’àudio, ${Date.now() - t0} ms en total)`);

// word highlight timings arrive during playback
const words = await page.evaluate(async () => {
  const seen = [];
  await window.lecaa.speech.play([{ kind: 'tts', text: 'El gat menja peix.', onWord: (i, l) => seen.push([i, l]) }], { lock: false });
  return seen;
});
ok(JSON.stringify(words) === JSON.stringify([[0, 2], [3, 3], [7, 5], [13, 4]]), 'paraules marcades durant la lectura: ' + JSON.stringify(words));

// letters (prewarmed + cached) are fast
await page.evaluate(() => window.lecaa.settings.update(s => { s.feedback.letter = 'name'; }));
const t1 = await page.evaluate(async () => { const t = performance.now(); await window.lecaa.speech.play([{ kind: 'tts', text: 'be' }], { lock: false }); return performance.now() - t; });
const t2 = await page.evaluate(async () => { const t = performance.now(); window.__played.length = 0; const p = window.lecaa.speech.play([{ kind: 'tts', text: 'be' }], { lock: false }); await new Promise(r => setTimeout(r, 30)); const started = window.__played.length; await p; return [performance.now() - t, started]; });
ok(t2[1] === 1, `nom de lletra en memòria: sona en < 30 ms (primera vegada ${Math.round(t1)} ms)`);

// stop cuts playback
const stopped = await page.evaluate(async () => {
  const p = window.lecaa.speech.play([{ kind: 'tts', text: 'Aquesta és una frase llarga que aturarem abans que acabi de sonar del tot.' }], { lock: false });
  await new Promise(r => setTimeout(r, 1500));
  const t = performance.now(); window.lecaa.speech.stop(); await p; return performance.now() - t;
});
ok(stopped < 200, `atura la veu a l’instant (${Math.round(stopped)} ms)`);

// offline after reload: no network for the model
hits.length = 0;
await page.reload();
await page.waitForFunction(() => document.querySelector('.ProseMirror') && window.lecaa);
let offline = true;
await ctx.route(/huggingface|jsdelivr/, r => offline ? r.abort('internetdisconnected') : r.fallback());
await page.waitForFunction(() => window.lecaa?.speech.voices.some(v => v.id === 'neural:ona-medium'), null, { timeout: 10000 });
await page.evaluate(() => { window.__played.length = 0; return window.lecaa.speech.play([{ kind: 'tts', text: 'Funciono sense connexió.' }], { lock: false }); });
ok((await page.evaluate(() => window.__played.length)) === 1 && hits.length === 0, 'sense connexió, després de recarregar, continua parlant');
offline = false;

page.on('dialog', d => d.accept());
// uninstall
await page.click('[aria-label="Configuració"], button:has-text("Configuració")');
await page.evaluate(() => { document.querySelector('.neural').open = true; });
await page.click('.neural-item:has-text("Ona") button:has-text("Esborra")');
await page.waitForSelector('[data-install="ona-medium"]');
await page.waitForFunction(() => !window.lecaa.speech.voices.some(v => v.id === 'neural:ona-medium'), null, { timeout: 5000 }).catch(() => null);
ok(!(await page.evaluate(() => window.lecaa.speech.voices.some(v => v.id === 'neural:ona-medium'))), 'es pot esborrar');

// Spanish: its own voices, Spanish phonemes, and the Catalan voice is not offered
await page.evaluate(() => localStorage.setItem('lecaa-docs:lang', 'es'));
await page.reload();
await page.waitForFunction(() => document.querySelector('.ProseMirror') && window.lecaa);
await page.waitForFunction(() => window.lecaa);
await page.click('[aria-label="Configuración"]');
await page.evaluate(() => { document.querySelector('.neural').open = true; });
await page.waitForSelector('[data-install="sharvard-medium"]', { timeout: 15000 }).catch(() => null);
ok(!(await page.locator('[data-install="ona-medium"]').count()) && await page.locator('[data-install="sharvard-medium"]').count() === 1, 'en castellà només s’ofereixen les veus castellanes');
await page.click('[data-install="davefx-medium"]');
await page.waitForFunction(() => document.querySelector('.neural-ok'), null, { timeout: 60000 });
await page.waitForFunction(() => window.lecaa?.settings.value.voice.id === 'neural:davefx-medium', null, { timeout: 5000 }).catch(() => null);
ok((await page.evaluate(() => window.lecaa.settings.value.voice.id)) === 'neural:davefx-medium', 'veu castellana descarregada i seleccionada');
await page.evaluate(() => { window.__played.length = 0; return window.lecaa.speech.play([{ kind: 'tts', text: 'Hola, me llamo Davefx y hablo castellano.' }], { lock: false }); });
const esPlayed = await page.evaluate(() => window.__played.slice());
ok(esPlayed.length === 1 && esPlayed[0] > 1 && esPlayed[0] < 7, `frase castellana sintetitzada (${esPlayed[0]?.toFixed(2)} s)`);
await page.evaluate(() => localStorage.setItem('lecaa-docs:lang', 'ca'));

ok(errors.length === 0, 'sense errors a la consola' + (errors.length ? ': ' + errors.join(' | ') : ''));
await browser.close();
console.log(failures ? `${failures} errors` : 'Tot correcte');
process.exit(failures ? 1 : 0);
