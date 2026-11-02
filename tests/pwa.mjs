// The app as an installed web app (PWA): its own caches, and the pictograms offline.
// The service worker needs a secure origin that is not localhost (the app does not register it
// there), so the test maps lecaa.test to this computer and treats it as secure.
// The browser keeps its data on disk, as on a real device: the caches of a private context live
// in memory and hide how slow a lookup that reads the whole cache is.
import { chromium } from '@playwright/test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const origin = process.argv[2] || 'http://lecaa.test:4173';
const port = new URL(origin).port || '80';
const profile = mkdtempSync(join(tmpdir(), 'lecaa-pwa-'));
const ctx = await chromium.launchPersistentContext(profile, {
  executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium',
  args: [`--host-resolver-rules=MAP lecaa.test 127.0.0.1:${port}`, `--unsafely-treat-insecure-origin-as-secure=${origin}`],
  viewport: { width: 1280, height: 900 },
});
await ctx.addInitScript({ path: 'tests/mock-speech.js' });
const page = ctx.pages()[0] ?? await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
let failures = 0;
const ok = (cond, msg) => { console.log((cond ? 'OK   ' : 'FAIL ') + msg); if (!cond) failures++; };
const wait = ms => page.waitForTimeout(ms);
const ready = () => page.waitForFunction(() => document.querySelector('.ProseMirror.pictos-on') && window.lecaa);
const clear = () => page.evaluate(() => window.lecaa.editor.chain().command(({ tr }) => { tr.setMeta('lecaa-system', true); return true; }).setContent('').focus('end').run());
const imageOf = word => page.evaluate(async w => {
  const el = [...document.querySelectorAll('.ProseMirror .pw')].find(e => e.dataset.word === w);
  if (!el) return 0;
  const url = getComputedStyle(el, '::before').backgroundImage.match(/url\("(.+)"\)/)[1];
  const i = new Image(); i.src = url; await i.decode().catch(() => {});
  return i.naturalWidth;
}, word);

await page.goto(origin + '/');
// Other apps on the same site (utacub.github.io) keep their caches, like the one the pictogram test
// edition (lecaa_docs_pictos, removed on 29/10/2026) may have left in a browser: it must survive this
// app's service worker.
await page.evaluate(() => caches.open('lecaa-pictos-proto-pictogrames').then(c => c.put('/x', new Response('x'))));
// So must the document and the settings that the test edition left in this browser.
const published = { 'lecaa-pictos-proto:lang': 'es', 'lecaa-pictos-proto:doc': '{"title":"prova"}' };
await page.evaluate(p => Object.entries(p).forEach(([k, v]) => localStorage.setItem(k, v)), published);
await page.evaluate(() => navigator.serviceWorker.ready);
await page.reload();
await page.waitForFunction(() => window.lecaa);
ok(await page.evaluate(p => document.documentElement.lang === 'ca' && Object.entries(p).every(([k, v]) => localStorage.getItem(k) === v), published), 'no llegeix ni canvia el document ni la configuració de la versió de prova');
await ready();
await page.evaluate(() => window.lecaa.settings.update(s => { s.guard.enabled = false; }));
ok(await page.evaluate(() => !!navigator.serviceWorker.controller), 'el service worker controla la pàgina');

const manifest = await page.evaluate(async () => { const m = await (await fetch(document.querySelector('link[rel=manifest]').href)).json(); return m; });
ok(manifest.name === 'LECAA Docs' && manifest.id === '/lecaa_docs/' && manifest.start_url === '/lecaa_docs/', 'manifest de l’app: ' + JSON.stringify({ name: manifest.name, id: manifest.id }));

// The pictograms that are shown are kept.
await page.locator('.ProseMirror').click();
await clear();
await page.keyboard.type('casa gos ', { delay: 40 });
await wait(800);
const kept = await page.evaluate(async () => (await (await caches.open('lecaa-docs-pictogrames')).keys()).map(r => new URL(r.url).pathname));
ok(kept.some(p => p.endsWith('/pictos/index-ca.js')) && kept.some(p => p.endsWith('/img/2317.png')) && kept.some(p => p.endsWith('/img/2517.png')), 'es desen l’índex i els pictogrames que es veuen: ' + kept.length);
ok(await page.evaluate(async () => (await caches.keys()).includes('lecaa-pictos-proto-pictogrames')), 'la memòria cau de la versió de prova no s’esborra');

// Settings: save them all.
await page.click('[aria-label="Configuració"]');
await wait(400);
await page.getByRole('button', { name: /^Desa (’ls tots|la resta)/ }).click();
const t0 = Date.now();
await page.waitForFunction(() => /Tots els pictogrames/.test(document.querySelector('.toast')?.textContent ?? ''), null, { timeout: 600000 });
const statusText = () => [...document.querySelectorAll('.drawer .hint')].map(e => e.textContent).find(t => t.startsWith('Sense connexió'));
await page.waitForFunction(`/: ([\\d.]+) de \\1 /.test((${statusText})() ?? '')`, null, { timeout: 10000 }).catch(() => {});
const status = await page.evaluate(statusText);
ok(/: ([\d.]+) de \1 /.test(status ?? '') && /13\.\d{3} de/.test(status), `es desen tots en ${Math.round((Date.now() - t0) / 1000)} s: ${status}`);
await page.keyboard.press('Escape');

// With every pictogram saved, the service worker finds each one at once: looking them up with
// ignoreSearch made Chromium read the whole cache, over a second for each pictogram.
const lookups = await page.evaluate(async () => {
  const times = [];
  // Pictograms from all over the index, none of them shown in this test.
  const ids = Object.values(window.LECAA_PICTOS_CA.kw).filter((_, i) => i % 997 === 500).map(f => f[0]).slice(0, 8);
  for (const id of ids) {
    const t = performance.now();
    await (await fetch(new URL(`./pictos/img/${id}.png`, document.baseURI).href)).blob();
    times.push(Math.round(performance.now() - t));
  }
  return times;
});
ok(Math.max(...lookups) < 300, 'amb tots els pictogrames desats, el service worker en dona cadascun a l’instant (ms): ' + lookups.join(', '));

// The pictogram of the word being written is fetched before the space, so it appears with it.
await page.click('.drawer [aria-label="Tanca"]').catch(() => {});
await page.waitForSelector('.drawer-backdrop', { state: 'hidden' }).catch(() => {});
await page.locator('.ProseMirror').click();
await clear();
await page.keyboard.type('taula', { delay: 80 });
await wait(300);
const tSpace = await page.evaluate(() => performance.now());
await page.keyboard.press('Space');
await wait(300);
const early = await page.evaluate(t => {
  const el = [...document.querySelectorAll('.ProseMirror .pw')].find(e => e.dataset.word === 'taula');
  const url = el && getComputedStyle(el, '::before').backgroundImage.match(/url\("(.+)"\)/)[1];
  const e = url && performance.getEntriesByName(url).at(-1);
  return e ? Math.round(e.responseEnd - t) : null;
}, tSpace);
ok(early !== null && early <= 0, `el pictograma de la paraula que s’escriu ja és a punt abans de l’espai (${early} ms)`);

// Offline: the app opens and shows pictograms it had never shown.
await ctx.setOffline(true);
await page.reload();
await ready();
await page.evaluate(() => window.lecaa.settings.update(s => { s.guard.enabled = false; }));
await page.locator('.ProseMirror').click();
await clear();
await page.keyboard.type('poma pilota ', { delay: 40 });
await wait(500);
ok(await imageOf('poma') === 192 && await imageOf('pilota') === 192, 'sense connexió, l’app s’obre i mostra pictogrames que no s’havien vist mai');
await page.screenshot({ path: 'test-results/pwa-offline.png' });
await ctx.setOffline(false);

ok(errors.length === 0, 'cap error a la pàgina: ' + JSON.stringify(errors));
await ctx.close();
rmSync(profile, { recursive: true, force: true });
console.log(failures ? `${failures} errors` : 'Tot correcte');
process.exit(failures ? 1 : 0);
