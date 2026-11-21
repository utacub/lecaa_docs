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

// The install button: a dialog with the size, wifi and the room left, then the browser's own prompt
// (Chromium) or the steps to follow (Safari on iPad and on a Mac); hidden where there is nothing to
// install (Firefox, the installed app).
const installShown = p => p.evaluate(() => { const b = document.querySelector('.install-btn'); return !!b && !b.hidden && b.offsetWidth > 0; });
const offerPrompt = () => page.evaluate(() => {
  const e = new Event('beforeinstallprompt', { cancelable: true });
  e.prompt = async () => { window.prompted = true; };
  e.userChoice = Promise.resolve({ outcome: 'accepted' });
  window.dispatchEvent(e);
});
await offerPrompt();
ok(await installShown(page), 'Chromium: el botó «Instal·la l’app» és a la barra de dalt');

// A file of the app that went missing (a download cut halfway) is downloaded again by the dialog.
const appCache = await page.evaluate(async () => (await caches.keys()).find(k => /^lecaa-docs-[0-9a-f]{12}$/.test(k)));
const dropped = await page.evaluate(async name => {
  const c = await caches.open(name);
  const r = (await c.keys()).find(r => /\/assets\/pdf-.*\.js$/.test(r.url));
  await c.delete(r);
  return r.url;
}, appCache);

// Without a connection, the download fails and the dialog offers to try again.
await page.click('.install-btn');
await page.waitForSelector('dialog.install .install-size:not(:empty)');
const dlgText = await page.locator('dialog.install').textContent();
const sizesShown = await page.locator('dialog.install .install-size').allTextContents();
ok(sizesShown.length === 2 && sizesShown.every(t => /· \d+ MB/.test(t)) && /wifi/.test(dlgText) && /Només l’app/.test(dlgText) && /tots els pictogrames d’ARASAAC/.test(dlgText),
  'el diàleg diu què ocupa cada opció (només l’app / també tots els pictogrames) i recomana la wifi: ' + sizesShown.join(' '));
await page.waitForFunction(() => document.querySelector('dialog.install .install-space')?.textContent);
ok(/Espai disponible per a aquesta app al navegador: [\d.]+ MB/.test(await page.locator('dialog.install .install-space').textContent()), 'el diàleg mostra l’espai disponible');
ok(await page.evaluate(() => document.querySelector('dialog.install input[value="all"]').checked), 'per defecte, també tots els pictogrames');
await ctx.setOffline(true);
await page.click('dialog.install .small-btn.primary');
await page.waitForSelector('dialog.install .install-message.warn', { timeout: 30000 });
ok(await page.evaluate(() => window.prompted === true) && /Reintenta/.test(await page.locator('dialog.install .small-btn.primary').textContent()),
  'el botó del diàleg obre la finestra d’instal·lació del navegador; sense connexió, avisa i ofereix «Reintenta»: ' + await page.locator('dialog.install .install-message').textContent());
await ctx.setOffline(false);
const labels = [];
await page.exposeFunction('progressLabel', t => labels.push(t));
await page.evaluate(() => new MutationObserver(() => window.progressLabel(document.querySelector('dialog.install .install-progress span').textContent))
  .observe(document.querySelector('dialog.install .install-progress span'), { childList: true, characterData: true, subtree: true }));
await page.click('dialog.install .small-btn.primary');
await page.waitForSelector('dialog.install .install-message.done', { timeout: 300000 });
const last = labels.at(-1) ?? '';
ok(/^(\d+) de \1 MB \(100 %\)$/.test(last) && labels.every(t => /^\d+ de \d+ MB \(\d+ %\)$/.test(t)), `barra de progrés «X de Y MB (Z %)» fins al final: ${labels[0]} … ${last}`);
ok(await page.evaluate(async ([name, url]) => !!(await (await caches.open(name)).match(url)), [appCache, dropped]), 'el fitxer de l’app que faltava torna a ser al dispositiu');
ok(await page.evaluate(() => localStorage.getItem('lecaa-docs:sense-connexio')) === 'all', 'la tria es desa (l’app i tots els pictogrames)');
ok(await page.evaluate(async () => (await navigator.storage.persisted?.()) !== undefined), 'es demana que el navegador no esborri les dades (persist)');
await page.click('dialog.install .install-actions .small-btn:not(.primary)');
await wait(200);
ok(!(await installShown(page)) && await page.evaluate(() => !document.querySelector('dialog.install')), 'després de la instal·lació, el diàleg es tanca i el botó s’amaga');
await page.screenshot({ path: 'test-results/pwa-installed.png' });

// The choice can be changed in the settings: deleting the saved pictograms makes it «only the app».
await page.click('[aria-label="Configuració"]');
await wait(400);
page.once('dialog', d => d.accept());
await page.getByRole('button', { name: 'Esborra’ls' }).click();
await page.getByRole('button', { name: /^Desa’ls tots \(\d+ MB\)$/ }).waitFor({ timeout: 30000 });
ok(await page.evaluate(() => localStorage.getItem('lecaa-docs:sense-connexio')) === 'app', 'a Configuració es pot canviar la tria: «Esborra’ls» la torna a «només l’app», i «Desa’ls tots» mostra els MB');
await page.keyboard.press('Escape');

const SAFARI = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const other = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: [`--host-resolver-rules=MAP lecaa.test 127.0.0.1:${port}`, `--unsafely-treat-insecure-origin-as-secure=${origin}`] });
for (const [name, ua, init, shown, text] of [
  ['iPad', SAFARI, () => { Object.defineProperty(navigator, 'platform', { get: () => 'MacIntel' }); Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 5 }); }, true, 'Afegir a la pantalla d’inici'],
  ['Safari al Mac', SAFARI, () => {}, true, 'Afegir al Dock'],
  ['Firefox', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0', () => {}, false],
]) {
  const c = await other.newContext({ userAgent: ua, viewport: { width: 1180, height: 820 } });
  await c.addInitScript({ path: 'tests/mock-speech.js' });
  await c.addInitScript(init);
  const p = await c.newPage();
  await p.goto(origin + '/');
  await p.waitForFunction(() => window.lecaa);
  const vis = await installShown(p);
  if (!shown) { ok(!vis, `${name}: no hi ha botó d’instal·lar`); await c.close(); continue; }
  await p.click('.install-btn');
  await p.waitForFunction(() => /L’app ocupa uns \d+ MB/.test(document.querySelector('dialog.install')?.textContent ?? ''));
  const before = await p.locator('dialog.install').textContent();
  await p.click('dialog.install .small-btn.primary');
  const steps = await p.locator('dialog.install').textContent();
  await p.keyboard.press('Escape');
  await wait(200);
  ok(vis && /wifi/.test(before) && /\d+ MB més/.test(before) && steps.includes(text) && await p.evaluate(() => !document.querySelector('dialog.install') && document.activeElement.classList.contains('install-btn')),
    `${name}: el botó diu què ocupa, recomana la wifi, i després explica com instal·lar-la («${text}»); es tanca amb Esc`);
  await c.close();
}

// The installed app (iPhone), the first time it opens: asks what to keep offline, and no install button.
{
  const c = await other.newContext({ userAgent: IPHONE, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await c.addInitScript({ path: 'tests/mock-speech.js' });
  await c.addInitScript(() => { Object.defineProperty(navigator, 'standalone', { get: () => true }); });
  const p = await c.newPage();
  await p.goto(origin + '/');
  await p.waitForFunction(() => window.lecaa);
  await p.waitForSelector('dialog.install .install-size:not(:empty)', { timeout: 20000 });
  const title = await p.locator('#install-title').textContent();
  await p.screenshot({ path: 'test-results/pwa-setup-iphone.png' });
  await p.click('dialog.install input[value="app"]');
  await p.click('dialog.install .small-btn.primary');
  await p.waitForSelector('dialog.install .install-message.done', { timeout: 120000 });
  ok(title === 'LECAA Docs sense connexió' && !(await installShown(p)) && await p.evaluate(() => localStorage.getItem('lecaa-docs:sense-connexio')) === 'app',
    'iPhone amb l’app instal·lada: no hi ha botó d’instal·lar, i el primer cop demana què vol sense connexió i ho descarrega');
  await c.close();
}
await other.close();

ok(errors.length === 0, 'cap error a la pàgina: ' + JSON.stringify(errors));
await ctx.close();
rmSync(profile, { recursive: true, force: true });
console.log(failures ? `${failures} errors` : 'Tot correcte');
process.exit(failures ? 1 : 0);
