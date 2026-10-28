// Pictogram prototype as an installed web app (PWA): its own caches, and pictograms offline.
// The service worker needs a secure origin that is not localhost (the app does not register it
// there), so the test maps lecaa.test to this computer and treats it as secure.
import { chromium } from '@playwright/test';
const origin = process.argv[2] || 'http://lecaa.test:4173';
const port = new URL(origin).port || '80';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium',
  args: [`--host-resolver-rules=MAP lecaa.test 127.0.0.1:${port}`, `--unsafely-treat-insecure-origin-as-secure=${origin}`],
});
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.addInitScript({ path: 'tests/mock-speech.js' });
const page = await ctx.newPage();
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
// A cache of the published edition on the same site must survive this edition's service worker.
await page.evaluate(() => caches.open('lecaa-docs-publicada').then(c => c.put('/x', new Response('x'))));
await page.evaluate(() => navigator.serviceWorker.ready);
await page.reload();
await ready();
await page.evaluate(() => window.lecaa.settings.update(s => { s.guard.enabled = false; }));
ok(await page.evaluate(() => !!navigator.serviceWorker.controller), 'el service worker controla la pàgina');

const manifest = await page.evaluate(async () => { const m = await (await fetch(document.querySelector('link[rel=manifest]').href)).json(); return m; });
ok(manifest.name.includes('pictogrames') && manifest.id === './' && manifest.start_url === './', 'manifest propi de la prova: ' + JSON.stringify({ name: manifest.name, id: manifest.id }));

// The pictograms that are shown are kept.
await page.locator('.ProseMirror').click();
await clear();
await page.keyboard.type('casa gos ', { delay: 40 });
await wait(800);
const kept = await page.evaluate(async () => (await (await caches.open('lecaa-pictos-proto-pictogrames')).keys()).map(r => new URL(r.url).pathname));
ok(kept.some(p => p.endsWith('/pictos/index-ca.js')) && kept.some(p => p.endsWith('/img/2317.png')) && kept.some(p => p.endsWith('/img/2517.png')), 'es desen l’índex i els pictogrames que es veuen: ' + kept.length);
ok(await page.evaluate(async () => (await caches.keys()).includes('lecaa-docs-publicada')), 'la memòria cau de la versió publicada no s’esborra');

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
await browser.close();
console.log(failures ? `${failures} errors` : 'Tot correcte');
process.exit(failures ? 1 : 0);
