// «Desa com a MP3»: the voice chooser, the direct way with a real Piper voice (served locally in
// place of Hugging Face, as in neural.mjs), and the recording of a system or browser voice through
// screen sharing (getDisplayMedia is replaced by a tone, a silence or a stream without sound).
// Checks the files with ffprobe.
// Usage: PIPER_DIR=/path/with/ona node tests/mp3.mjs http://localhost:4173/
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
const url = process.argv[2] || 'http://localhost:4173/';
const dir = process.env.PIPER_DIR || '/tmp/claude-0/piper';
const local = {
  'ca_ES-upc_ona-medium.onnx': `${dir}/ona/ca-upc_ona-x-low.onnx`,
  'ca_ES-upc_ona-medium.onnx.json': `${dir}/ona/ca-upc_ona-x-low.onnx.json`,
};
const npm = f => path.resolve('node_modules', f);
const cdn = {
  'piper_phonemize.wasm': npm('@diffusionstudio/piper-wasm/build/piper_phonemize.wasm'),
  'piper_phonemize.data': npm('@diffusionstudio/piper-wasm/build/piper_phonemize.data'),
  'ort-wasm-simd.wasm': npm('onnxruntime-web/dist/ort-wasm-simd.wasm'),
};
let failures = 0;
const ok = (cond, msg) => { console.log((cond ? 'OK   ' : 'FAIL ') + msg); if (!cond) failures++; };
const probe = file => JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file], { encoding: 'utf8' }));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } });
const serve = table => r => {
  const f = table[r.request().url().split('/').pop()];
  return f ? r.fulfill({ status: 200, body: fs.readFileSync(f), headers: { 'Content-Length': String(fs.statSync(f).size), 'Access-Control-Allow-Origin': '*' } }) : r.fulfill({ status: 404 });
};
await ctx.route('https://huggingface.co/**', serve(local));
await ctx.route('https://cdn.jsdelivr.net/**', serve(cdn));
await ctx.addInitScript({ path: 'tests/mock-speech.js' });
// Screen sharing: window.__capture = 'tone' | 'silent' | 'noaudio' | 'deny'.
await ctx.addInitScript(() => {
  window.__capture = 'tone';
  window.__captureCalls = 0;
  navigator.mediaDevices.getDisplayMedia = async () => {
    window.__captureCalls++;
    const mode = window.__capture;
    if (mode === 'deny') throw new DOMException('denied', 'NotAllowedError');
    const canvas = Object.assign(document.createElement('canvas'), { width: 16, height: 16 });
    canvas.getContext('2d').fillRect(0, 0, 16, 16);
    const tracks = canvas.captureStream(5).getVideoTracks();
    if (mode !== 'noaudio') {
      const ac = new AudioContext();
      await ac.resume();
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      gain.gain.value = mode === 'silent' ? 0 : 0.5;
      const dest = ac.createMediaStreamDestination();
      osc.connect(gain).connect(dest);
      osc.start();
      tracks.push(...dest.stream.getAudioTracks());
    }
    return new MediaStream(tracks);
  };
});
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error' && !m.location().url.includes('/pictos/')) errors.push(m.text()); });
await page.goto(url);
await page.waitForFunction(() => document.querySelector('.ProseMirror') && window.lecaa);
await page.evaluate(() => window.lecaa.settings.update(s => { s.pictos.enabled = false; }));
const mp3Btn = '[aria-label="Desa com a MP3"]';
const dialog = '.mp3-export';
const closeDialog = () => page.evaluate(() => document.querySelector('.mp3-export')?.close());

// 1. Empty document: a notice, no dialog.
await page.click(mp3Btn);
await page.waitForTimeout(300);
ok(!(await page.locator(dialog).count()) && (await page.textContent('.toast'))?.includes('no té text'), 'document buit: avís, sense diàleg');

const text = 'Hola, em dic Ona. Parlo català.\nAvui fa sol.';
await page.evaluate(t => window.lecaa.editor.commands.setContent(t.split('\n').map(p => `<p>${p}</p>`).join('')), text);
// (Headless Chromium here drops a download name with accents, such as «títol».)
await page.fill('.doc-title', 'Prova MP3');

// 2. Only the browser voice (mock) and capture: one voice, so it goes straight to the steps.
await page.click(mp3Btn);
await page.waitForSelector(dialog);
ok(await page.locator(`${dialog} .install-steps li`).count() === 3 && !(await page.locator(`${dialog} input[type=radio]`).count()), 'una sola veu (del navegador): sense triar, explica com compartir l’àudio del sistema');

// 2a. Denied: back to the steps.
await page.evaluate(() => { window.__capture = 'deny'; });
await page.click(`${dialog} button:has-text("Comença")`);
await page.waitForTimeout(300);
ok(await page.locator(`${dialog} .install-steps`).count() === 1, 'si es cancel·la el quadre del navegador, torna a les instruccions');

// 2b. Shared without sound.
await page.evaluate(() => { window.__capture = 'noaudio'; });
await page.click(`${dialog} button:has-text("Comença")`);
await page.waitForSelector(`${dialog} .install-message.warn`);
ok((await page.textContent(`${dialog} .install-message`)).includes('No s’ha compartit cap so'), 'pantalla compartida sense àudio: ho diu');
await closeDialog();

// 2c. Silent recording.
await page.evaluate(() => { window.__capture = 'silent'; window.__spoken.length = 0; });
await page.click(mp3Btn);
await page.click(`${dialog} button:has-text("Comença")`);
await page.waitForSelector(`${dialog} .install-message.warn`, { timeout: 20000 });
ok((await page.textContent(`${dialog} .install-message`)).includes('no té so'), 'gravació muda: demana «Tota la pantalla» i l’àudio del sistema');
ok(JSON.stringify(await page.evaluate(() => window.__spoken)) === JSON.stringify(['Hola, em dic Ona.', 'Parlo català.', 'Avui fa sol.']), 'llegeix el document frase a frase amb la veu del navegador');
await closeDialog();

// 2d. Recording with sound: an MP3 of about the length of the reading.
await page.evaluate(() => { window.__capture = 'tone'; });
await page.click(mp3Btn);
await page.click(`${dialog} button:has-text("Comença")`);
await page.waitForSelector(`${dialog} .install-message.done`, { timeout: 20000 });
let [download] = await Promise.all([page.waitForEvent('download'), page.click(`${dialog} button:has-text("Desa l’MP3")`)]);
let file = '/tmp/claude-0/mp3-captura.mp3';
await download.saveAs(file);
let info = probe(file);
ok(download.suggestedFilename() === 'Prova MP3.mp3', 'nom del fitxer: ' + download.suggestedFilename());
ok(info.streams[0].codec_name === 'mp3' && info.streams[0].channels === 1 && +info.format.duration > 1.5, `veu del navegador gravada: MP3 mono de ${(+info.format.duration).toFixed(1)} s, ${info.streams[0].sample_rate} Hz`);
ok(!(await page.locator(dialog).count()) && (await page.textContent('.toast'))?.includes('Desat com a MP3'), 'es tanca i diu que s’ha desat');

// 3. Piper Ona downloaded: two voices, so the chooser appears.
await page.click('[aria-label="Configuració"], button:has-text("Configuració")');
await page.waitForSelector('.neural');
await page.evaluate(() => { document.querySelector('.neural').open = true; });
await page.click('[data-install="ona-medium"]');
await page.waitForFunction(() => document.querySelector('.neural-ok'), null, { timeout: 60000 });
await page.keyboard.press('Escape');
await page.evaluate(() => document.querySelector('.drawer-backdrop')?.click());
await page.waitForFunction(() => window.lecaa.speech.voices.some(v => v.id === 'neural:ona-medium'));
await page.evaluate(() => window.lecaa.settings.update(s => { s.voice.id = 'web:prova-ca|Prova Català'; }));
await page.click(mp3Btn);
await page.waitForSelector(`${dialog} input[type=radio]`);
const radios = await page.$$eval(`${dialog} .install-option`, ls => ls.map(l => [l.querySelector('input').checked, l.textContent]));
ok(radios.length === 2 && radios[0][0] && radios[0][1].includes('Prova Català · activada') && radios[1][1].includes('Ona'), 'dues veus: quadre per triar-la, amb l’activada marcada i primer: ' + JSON.stringify(radios.map(r => r[1].split('Es')[0])));
await page.check(`${dialog} input[value="neural:ona-medium"]`);
await page.click(`${dialog} button:has-text("Següent")`);
await page.waitForSelector(`${dialog} .install-message.done`, { timeout: 60000 });
const label = await page.textContent(`${dialog} .install-progress span`);
ok(label === 'Frase 3 de 3', 'progrés: ' + label);
[download] = await Promise.all([page.waitForEvent('download'), page.click(`${dialog} button:has-text("Desa l’MP3")`)]);
file = '/tmp/claude-0/mp3-ona.mp3';
await download.saveAs(file);
info = probe(file);
ok(info.streams[0].codec_name === 'mp3' && info.streams[0].sample_rate === '16000' && +info.format.duration > 2 && +info.format.duration < 12, `veu Piper: MP3 directe de ${(+info.format.duration).toFixed(1)} s, ${info.streams[0].sample_rate} Hz (el model x_low de la prova és de 16 kHz)`);
ok((await page.evaluate(() => window.__captureCalls)) === 4, 'amb la veu Piper no es comparteix la pantalla');

// 4. Without capture (as on an iPad) and only a browser voice: says why and how to get a Piper voice.
await page.evaluate(() => { navigator.mediaDevices.getDisplayMedia = undefined; });
await page.click('[aria-label="Configuració"], button:has-text("Configuració")');
await page.evaluate(() => { document.querySelector('.neural').open = true; });
page.on('dialog', d => d.accept());
await page.click('.neural-item:has-text("Ona") button:has-text("Esborra")');
await page.waitForSelector('[data-install="ona-medium"]');
await page.evaluate(() => document.querySelector('.drawer-backdrop')?.click());
await page.waitForFunction(() => !window.lecaa.speech.voices.some(v => v.id === 'neural:ona-medium'));
await page.click(mp3Btn);
await page.waitForSelector(dialog);
const msg = await page.textContent(`${dialog} .body`);
ok(msg.includes('no es pot gravar') && msg.includes('Configuració') && await page.locator(`${dialog} button:has-text("Obre la configuració")`).count() === 1, 'sense captura ni veu Piper: explica per què i ofereix obrir la configuració');
await page.click(`${dialog} button:has-text("Obre la configuració")`);
ok(await page.locator('.neural').count() === 1, 'obre la configuració');

// 5. «Obre a Edge»: on Windows outside Edge the dialog offers it, and Edge opens the document it brings
// (web edition only: Edge cannot be given the single file opened from the disk).
if (url.startsWith('http')) {
const win = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 },
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36' });
await win.addInitScript({ path: 'tests/mock-speech.js' });
const wp = await win.newPage();
wp.on('pageerror', e => errors.push(String(e)));
await wp.goto(url);
await wp.waitForFunction(() => document.querySelector('.ProseMirror') && window.lecaa);
await wp.evaluate(() => { window.lecaa.settings.update(s => { s.pictos.enabled = false; }); navigator.mediaDevices.getDisplayMedia = undefined; window.lecaa.editor.commands.setContent('<p>Text curt per a Edge.</p>'); });
await wp.click(mp3Btn);
await wp.waitForSelector(`${dialog} button:has-text("Obre a Edge")`);
ok(true, 'Windows fora d’Edge: el quadre ofereix «Obre a Edge»');
await wp.click(`${dialog} button:has-text("Obre a Edge")`);
await wp.waitForSelector(`${dialog} .mp3-edge .install-message:not([hidden])`);
ok((await wp.textContent(`${dialog} .mp3-edge .install-message`)).includes('obrint Microsoft Edge'), 'obre Edge amb el document');
// A long document goes as .docx (in a fresh page: the page above has just launched another app).
await wp.close();
const wp2 = await win.newPage();
wp2.on('pageerror', e => errors.push(String(e)));
await wp2.goto(url);
await wp2.waitForFunction(() => document.querySelector('.ProseMirror') && window.lecaa);
await wp2.evaluate(() => window.lecaa.editor.commands.setContent(Array.from({ length: 200 }, (_, i) => `<p>Paràgraf ${i}: ${Math.random().toString(36).slice(2)} ${Math.random().toString(36).slice(2)}.</p>`).join('')));
await wp2.fill('.doc-title', 'Llarg');
await wp2.click(mp3Btn);
const [docx] = await Promise.all([wp2.waitForEvent('download'), wp2.click(`${dialog} button:has-text("Obre a Edge")`)]);
await wp2.waitForSelector(`${dialog} .mp3-edge .install-message:not([hidden])`);
ok(docx.suggestedFilename().endsWith('.docx') && (await wp2.textContent(`${dialog} .mp3-edge .install-message`)).includes('massa llarg'), 'document llarg: el desa en .docx per obrir-lo a Edge');
await win.close();
// Edge receives it.
const edge = await browser.newContext({ viewport: { width: 1280, height: 900 },
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0' });
await edge.addInitScript({ path: 'tests/mock-speech.js' });
const ep = await edge.newPage();
ep.on('pageerror', e => errors.push(String(e)));
const payload = { title: 'Des de Chrome', content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hola des de Chrome.' }] }, { type: 'image', attrs: { src: 'data:image/png;base64,AAAA' } }] } };
const frag = zlib.deflateRawSync(Buffer.from(JSON.stringify(payload))).toString('base64url');
await ep.goto(url + '#mp3=' + frag);
await ep.waitForSelector(dialog, { timeout: 15000 });
const got = await ep.evaluate(() => ({ title: document.querySelector('.doc-title').value, text: window.lecaa.editor.getText(), imgs: document.querySelectorAll('.ProseMirror img').length, hash: location.hash }));
ok(got.title === 'Des de Chrome' && got.text.includes('Hola des de Chrome.') && got.imgs === 0 && got.hash === '', 'a Edge: obre el document que porta l’enllaç (sense imatges), treu el fragment i mostra el quadre MP3: ' + JSON.stringify(got));
ok(!(await ep.locator(`${dialog} button:has-text("Obre a Edge")`).count()), 'dins d’Edge no s’ofereix «Obre a Edge»');
await edge.close();
}

ok(errors.length === 0, 'sense errors a la consola' + (errors.length ? ': ' + errors.join(' | ') : ''));
await browser.close();
console.log(failures ? `${failures} errors` : 'Tot correcte');
process.exit(failures ? 1 : 0);
