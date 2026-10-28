// Pictograms above the words (prototype, Catalan and Spanish). Needs the "pictos" folder next to the app.
import { chromium } from '@playwright/test';
const url = process.argv[2] || 'http://localhost:4173/';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.addInitScript({ path: 'tests/mock-speech.js' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
let failures = 0;
const ok = (cond, msg) => { console.log((cond ? 'OK   ' : 'FAIL ') + msg); if (!cond) failures++; };
const wait = ms => page.waitForTimeout(ms);
const pictos = () => page.evaluate(() => [...document.querySelectorAll('.ProseMirror .pw')].map(e => `${e.textContent}:${e.dataset.picto}`));
const clear = () => page.evaluate(() => window.lecaa.editor.chain().command(({ tr }) => { tr.setMeta('lecaa-system', true); return true; }).setContent('').focus().run());
const cdp = await ctx.newCDPSession(page);
const vkey = async ch => {
  await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Unidentified', windowsVirtualKeyCode: 229 });
  await cdp.send('Input.insertText', { text: ch });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Unidentified', windowsVirtualKeyCode: 229 });
  await wait(120);
};

await page.goto(url);
await page.waitForFunction(() => document.querySelector('.ProseMirror.pictos-on'));
// Typing fast in the test is not a misuse of the keyboard.
await page.evaluate(() => window.lecaa.settings.update(s => { s.guard.enabled = false; }));
const ed = page.locator('.ProseMirror');
await ed.click();
await clear();

// 1. no pictogram while the word is being typed, one as soon as the space is pressed
await page.keyboard.type('casa', { delay: 80 });
ok((await pictos()).length === 0, 'cap pictograma mentre s’escriu «casa»');
await page.keyboard.type(' ', { delay: 80 });
await wait(100);
ok(JSON.stringify(await pictos()) === '["casa:2317"]', 'pictograma de «casa» en prémer l’espai: ' + JSON.stringify(await pictos()));
const img = await page.evaluate(async () => {
  const el = document.querySelector('.ProseMirror .pw');
  const bg = getComputedStyle(el, '::before').backgroundImage.match(/url\("(.+)"\)/)[1];
  const i = new Image(); i.src = bg; await i.decode().catch(() => {});
  return { w: i.naturalWidth, bg };
});
ok(img.w === 192, 'la imatge del pictograma es carrega: ' + JSON.stringify(img));

// 2. inflected forms, elision, function words, expressions of several words
await clear();
await page.keyboard.type('El nen menja pa amb tomàquet i beu l’aigua de la font. ', { delay: 25 });
await wait(150);
const p2 = await pictos();
ok(p2.some(x => x.startsWith('nen:')) && p2.some(x => x.startsWith('menja:')) && p2.some(x => x.startsWith('pa amb tomàquet:37642'))
  && p2.some(x => x.startsWith('beu:')) && p2.some(x => x.startsWith('l’aigua:2248')) && p2.some(x => x.startsWith('font:')), 'formes flexionades, elisió i expressions: ' + JSON.stringify(p2));
ok(!p2.some(x => /^(El|i|de|la):/.test(x)), 'cap pictograma per a «el», «i», «de», «la»');

// 3. the text does not jump when a pictogram appears: lines keep their height
await clear();
const before = await page.evaluate(() => document.querySelector('.ProseMirror p').getBoundingClientRect().height);
await page.keyboard.type('gos ', { delay: 50 });
const after = await page.evaluate(() => document.querySelector('.ProseMirror p').getBoundingClientRect().height);
ok(Math.abs(before - after) < 1, `la línia no canvia d’alçada en aparèixer el pictograma (${before} → ${after})`);

// 4. the Android-style on-screen keyboard (no key, only text) also gets pictograms
await clear();
for (const c of 'sol ') await vkey(c);
ok((await pictos()).some(x => x.startsWith('sol:')), 'teclat en pantalla del sistema: ' + JSON.stringify(await pictos()));

// 4b. keyboards that compose each word (Gboard)
await clear();
for (const word of ['gat', 'blau']) {
  let t = '';
  for (const c of word) { t += c; await cdp.send('Input.imeSetComposition', { text: t, selectionStart: t.length, selectionEnd: t.length }); await wait(120); }
  await cdp.send('Input.insertText', { text: t });
  await wait(80);
  await vkey(' ');
}
ok(JSON.stringify((await pictos()).map(x => x.split(':')[0])) === '["gat","blau"]' && await page.evaluate(() => window.lecaa.editor.getText()) === 'gat blau ', 'teclat que compon les paraules: ' + JSON.stringify(await pictos()));

// 5. tapping the pictogram offers others; the choice is kept for that word
await page.keyboard.type('casa ', { delay: 30 });
const box = await page.evaluate(() => { const r = [...document.querySelectorAll('.ProseMirror .pw')].pop().getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top - 15 }; });
await page.mouse.click(box.x, box.y);
await wait(300);
const opts = await page.evaluate(() => [...document.querySelectorAll('.picto-chooser .picto-option')].length);
ok(opts >= 2, `en tocar el pictograma s’obre el selector amb ${opts} opcions`);
await page.screenshot({ path: 'test-results/pictos-selector.png' });
await page.click('.picto-chooser .picto-option:nth-child(2)');
await wait(150);
ok((await pictos()).some(x => x === 'casa:6964'), 'la tria es manté: ' + JSON.stringify(await pictos()));
ok(await page.evaluate(() => JSON.parse(localStorage.getItem('lecaa-pictos-proto:pictos:ca')).casa === 6964), 'la tria es desa en aquest dispositiu');
await page.click('.ProseMirror .pw[data-word="casa"]', { position: { x: 10, y: -15 } }).catch(() => {});
await wait(200);
await page.click('.picto-chooser .row button:last-child');
await wait(150);

// 6. the toolbar button turns them off and on, and it matches the settings
const btn = page.locator('.toolbar button[aria-label="Pictogrames damunt de les paraules"]');
ok(await btn.getAttribute('aria-pressed') === 'true', 'botó de la barra d’eines premut');
await btn.click();
await wait(150);
ok(!(await page.evaluate(() => document.querySelector('.ProseMirror').classList.contains('pictos-on'))) && (await pictos()).length === 0
  && await page.evaluate(() => window.lecaa.settings.value.pictos.enabled === false), 'el botó els desactiva');
await btn.click();
await wait(150);
ok((await pictos()).length > 0 && await btn.getAttribute('aria-pressed') === 'true', 'el botó els torna a activar');

// 7. the document itself does not change (no pictograms in the saved content)
ok(!JSON.stringify(await page.evaluate(() => window.lecaa.editor.getJSON())).includes('picto'), 'el document desat no conté pictogrames');

// a picture of a longer text
await clear();
await page.evaluate(() => window.lecaa.settings.update(s => { s.docFontSize = 26; }));
await page.keyboard.type('Avui he anat a l’escola amb la mare. He jugat a pilota amb els meus amics i després hem menjat una poma. ', { delay: 10 });
await page.keyboard.type('Demà anirem a la platja', { delay: 10 });
await wait(400);
await page.screenshot({ path: 'test-results/pictos.png' });

// 8. Spanish: its own index, the same pictograms and toolbar button
const requested = [];
page.on('request', r => { if (r.url().includes('/pictos/index-')) requested.push(new URL(r.url()).pathname.split('/').pop()); });
await page.evaluate(() => localStorage.setItem('lecaa-pictos-proto:lang', 'es'));
await page.reload();
await page.waitForFunction(() => document.querySelector('.ProseMirror.pictos-on') && window.lecaa);
await page.evaluate(() => window.lecaa.settings.update(s => { s.guard.enabled = false; }));
await ed.click();
await clear();
await page.keyboard.type('Los perros comen pan con tomate. Yo como ', { delay: 30 });
await wait(200);
const esPictos = await pictos();
const has = w => esPictos.some(p => p.startsWith(w + ':'));
ok(await page.isVisible('.toolbar button[aria-label="Pictogramas encima de las palabras"]')
  && has('perros') && esPictos.includes('comen:2349') && has('pan con tomate') && has('Yo') && esPictos.includes('como:12313') && !has('Los'),
  'en castellà: «perros», «comen» (comer), «pan con tomate», «como»; «los» no: ' + JSON.stringify(esPictos));
ok(JSON.stringify(requested) === '["index-es.js"]', 'en castellà només es carrega l’índex castellà: ' + JSON.stringify(requested));
// «como» is a keyword and also a form of «comer»: the chooser offers both
const como = await page.evaluate(() => { const r = document.querySelector('.ProseMirror .pw[data-word="como"]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top - 15 }; });
await page.mouse.click(como.x, como.y);
await page.waitForSelector('.picto-chooser');
const comoIds = await page.evaluate(() => [...document.querySelectorAll('.picto-chooser .picto-option img')].map(i => i.getAttribute('src').match(/(\d+)\.png/)[1]));
ok(comoIds[0] === '12313' && comoIds.includes('2349'), 'el selector de «como» també ofereix «comer»: ' + JSON.stringify(comoIds.slice(0, 5)));
await page.click('.picto-chooser .picto-option img[src$="/2349.png"]');
await wait(150);
ok((await pictos()).includes('como:2349') && await page.evaluate(() => JSON.parse(localStorage.getItem('lecaa-pictos-proto:pictos:es')).como === 2349 && !JSON.parse(localStorage.getItem('lecaa-pictos-proto:pictos:ca') || '{}').como),
  'la tria en castellà es desa a part de la catalana');
await page.evaluate(() => localStorage.setItem('lecaa-pictos-proto:lang', 'ca'));

ok(errors.length === 0, 'cap error a la consola: ' + JSON.stringify(errors));
await browser.close();
console.log(failures ? `${failures} errors` : 'Tot correcte');
process.exit(failures ? 1 : 0);
