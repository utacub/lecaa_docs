// The Piper voices of Basque (Maider, Antton) and of Galician (Tugão, European Portuguese), with
// the real models from Hugging Face: download, storage, synthesis in the worker and playback.
// Needs a connection; the CI runs it. PIPER_FAKE=dir serves dir/model.onnx(.json) in place of
// every model, to try the test itself without a connection.
import { chromium } from '@playwright/test';
import fs from 'node:fs';
const url = process.argv[2] || 'http://localhost:4173/';
const fake = process.env.PIPER_FAKE;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext();
if (fake) {
  await ctx.route('https://huggingface.co/**', r => {
    const f = `${fake}/model.onnx${r.request().url().endsWith('.json') ? '.json' : ''}`;
    return r.fulfill({ status: 200, body: fs.readFileSync(f), headers: { 'Content-Length': String(fs.statSync(f).size), 'Access-Control-Allow-Origin': '*' } });
  });
}
await ctx.addInitScript(() => {
  window.__played = [];
  const start = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (...a) { if (this.buffer.length > 1) window.__played.push(this.buffer.duration); return start.apply(this, a); };
});
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
let failures = 0;
const ok = (cond, msg) => { console.log((cond ? 'OK   ' : 'FAIL ') + msg); if (!cond) failures++; };

const CASES = [
  ['eu', 'maider-medium', 'Kaixo, Maider naiz eta euskaraz hitz egiten dut.'],
  ['eu', 'antton-medium', 'Kaixo, Antton naiz eta euskaraz hitz egiten dut.'],
  ['gl', 'tugao-medium', 'Ola, chámome Tugão e falo portugués.'],
];
page.on('requestfailed', r => console.log('failed', r.url().slice(0, 120), r.failure()?.errorText));
await page.goto(url);
for (const [lang, key, text] of CASES) {
  await page.evaluate(l => localStorage.setItem('lecaa-docs:lang', l), lang);
  await page.reload();
  await page.waitForFunction(() => document.querySelector('.ProseMirror') && window.lecaa);
  await page.evaluate(() => window.lecaa.settings.update(s => { s.guard.enabled = false; }));
  await page.locator('.topbar-actions button').last().click();
  await page.waitForSelector('.drawer .neural');
  await page.evaluate(() => { document.querySelector('.neural').open = true; });
  const t0 = Date.now();
  await page.click(`[data-install="${key}"]`);
  const got = await page.waitForFunction(k => window.lecaa.speech.voices.some(v => v.id === 'neural:' + k), key, { timeout: Number(process.env.PIPER_TIMEOUT || 600000) }).then(() => true, () => false);
  ok(got, `${lang}: ${key} descarregada (${Math.round((Date.now() - t0) / 1000)} s)`);
  // The first voice downloaded is chosen by itself; a second one, by hand.
  await page.evaluate(k => window.lecaa.settings.update(s => { s.voice.id = 'neural:' + k; }), key);
  ok(await page.evaluate(() => window.lecaa.speech.currentVoice()?.id) === 'neural:' + key, `${lang}: ${key} és la veu que parla`);
  await page.keyboard.press('Escape');
  await page.evaluate(() => document.querySelector('.drawer-backdrop')?.click());
  await page.evaluate(() => { window.__played.length = 0; });
  const t1 = Date.now();
  await page.evaluate(t => window.lecaa.speech.play([{ kind: 'tts', text: t }], { lock: false }), text);
  const played = await page.evaluate(() => window.__played.slice());
  ok(played.length === 1 && played[0] > 1.2 && played[0] < 8, `${lang}: ${key} diu «${text}» (${played[0]?.toFixed(2)} s d’àudio, ${Date.now() - t1} ms)`);
}
await page.evaluate(() => localStorage.setItem('lecaa-docs:lang', 'ca'));
ok(errors.length === 0, 'cap error a la consola: ' + JSON.stringify(errors));
await browser.close();
console.log(failures ? `${failures} errors` : 'Tot correcte');
process.exit(failures ? 1 : 0);
