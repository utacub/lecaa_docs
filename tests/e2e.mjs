import { chromium } from '@playwright/test';
import fs from 'node:fs';
const url = process.argv[2] || 'http://localhost:4173/';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } });
await ctx.addInitScript({ path: 'tests/mock-speech.js' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
let failures = 0;
const ok = (cond, msg) => { console.log((cond ? 'OK   ' : 'FAIL ') + msg); if (!cond) failures++; };
const spoken = () => page.evaluate(() => window.__spoken.slice());
const reset = () => page.evaluate(() => { window.__spoken.length = 0; window.__clips.length = 0; });
const set = fn => page.evaluate(`window.lecaa.settings.update(${fn})`);
const text = () => page.evaluate(() => window.lecaa.editor.getText());
const clear = async () => { await page.evaluate(() => window.lecaa.editor.chain().command(({ tr }) => { tr.setMeta('lecaa-system', true); return true; }).setContent('').focus().run()); await reset(); };
const wait = ms => page.waitForTimeout(ms);

await page.goto(url);
await page.waitForSelector('.ProseMirror');
await wait(300);
const ed = page.locator('.ProseMirror');
await ed.click();

// 1. word on space, sentence on period
await set(`s => { s.feedback = { sentence: true, word: true, wordOnPunct: true, letter: 'off', upperCaseWord: false }; s.lockWhileSpeaking = false; }`);
await clear();
await page.keyboard.type('Hola ', { delay: 120 });
await wait(400);
ok((await spoken()).includes('Hola'), 'paraula en prémer espai: ' + JSON.stringify(await spoken()));
await reset();
await page.keyboard.type('món.', { delay: 120 });
await wait(800);
let sp = await spoken();
ok(sp.at(-2) === 'món' && sp.at(-1) === 'Hola món.', 'paraula + frase en escriure punt: ' + JSON.stringify(sp));

// 2. Enter speaks the unfinished sentence
await clear();
await page.keyboard.type('El gat', { delay: 120 });
await reset();
await page.keyboard.press('Enter');
await wait(600);
sp = await spoken();
ok(sp.includes('El gat'), 'frase en prémer Intro: ' + JSON.stringify(sp));

// 3. letter names
await set(`s => { s.feedback = { sentence: false, word: false, wordOnPunct: false, letter: 'name', upperCaseWord: false }; }`);
await clear();
await page.keyboard.type('bç', { delay: 250 });
await wait(400);
sp = await spoken();
ok(sp.includes('be') && sp.includes('ce trencada'), 'nom de la lletra: ' + JSON.stringify(sp));

// 4. letter sounds (recorded clips)
await set(`s => { s.feedback.letter = 'sound'; s.recordedVoice = 'jordi'; }`);
await clear();
await page.keyboard.type('mx', { delay: 250 });
await wait(400);
const clips = await page.evaluate(() => window.__clips.slice());
ok(clips.length === 2 && (await spoken()).length === 0, 'so de la lletra amb locució: ' + JSON.stringify(clips));

// 5. no feedback
await set(`s => { s.feedback = { sentence: false, word: false, wordOnPunct: false, letter: 'off', upperCaseWord: false }; }`);
await clear();
await page.keyboard.type('Bon dia. ', { delay: 100 });
await wait(300);
ok((await spoken()).length === 0, 'cap feedback mentre s’escriu');
await page.click('text=Llegeix tot');
await wait(1500);
ok((await spoken()).some(t => t.includes('Bon dia')), 'Llegeix tot funciona sense feedback: ' + JSON.stringify(await spoken()));

// 6. triple letter → calm overlay, letter rejected, everything blocked
await clear();
await page.keyboard.type('caa', { delay: 150 });
await page.keyboard.type('a', { delay: 150 });
await wait(100);
ok(await page.locator('.calm').isVisible(), 'avís de calma amb tres lletres iguals');
ok((await page.locator('.calm-text').textContent()) === 'Pensa bé cada lletra que escrius', 'missatge de l’avís');
await page.keyboard.type('xyz', { delay: 100 });
ok((await text()) === 'caa', 'tecles bloquejades durant l’avís: ' + JSON.stringify(await text()));
await wait(3000);
ok(!(await page.locator('.calm').isVisible()), 'l’avís desapareix després de 3 s');
await page.keyboard.type('r', { delay: 100 });
ok((await text()) === 'caar', 'es pot tornar a escriure');

// 7. simultaneous keys
await clear();
await page.keyboard.down('KeyA'); await page.keyboard.down('KeyS'); await page.keyboard.down('KeyD');
await page.keyboard.up('KeyA'); await page.keyboard.up('KeyS'); await page.keyboard.up('KeyD');
await wait(100);
ok(await page.locator('.calm').isVisible(), 'avís amb tres tecles alhora');
await wait(3200);

// 8. burst: three keys in < 60 ms
await clear();
await page.keyboard.type('qwe', { delay: 5 });
await wait(80);
ok(await page.locator('.calm').isVisible(), 'avís amb tecles massa seguides');
await wait(3200);

// 9. lock while speaking
await set(`s => { s.feedback = { sentence: false, word: true, wordOnPunct: true, letter: 'off', upperCaseWord: false }; s.lockWhileSpeaking = true; }`);
await clear();
await page.keyboard.type('Casa ', { delay: 150 });
await wait(40);
await page.keyboard.type('x', { delay: 10 });
ok((await text()) === 'Casa ', 'protecció: tecla rebutjada mentre sona: ' + JSON.stringify(await text()));
await wait(600);
await page.keyboard.type('x', { delay: 10 });
ok((await text()) === 'Casa x', 'protecció: tecla acceptada quan acaba');
await set(`s => { s.lockWhileSpeaking = false; }`);

// 10. on-screen simple keyboard with auto capital
await clear();
await set(`s => { s.keyboard.visible = true; s.keyboard.layout = 'simple'; s.feedback.word = false; }`);
for (const k of ['s', 'o', 'l']) { await page.locator(`.osk .key[data-k="${k}"]`).click(); await wait(150); }
await page.locator('.osk .key[data-a="space"]').click(); await wait(150);
await page.locator('.osk .key[data-k="à"]').click(); await wait(150);
await page.locator('.osk .key[data-a="back"]').click(); await wait(150);
await page.locator('.osk .key[data-a="enter"]').click(); await wait(150);
ok((await page.evaluate(() => window.lecaa.editor.getHTML())) === '<p>Sol </p><p></p>', 'teclat simplificat: ' + await page.evaluate(() => window.lecaa.editor.getHTML()));
ok((await page.locator('.ProseMirror').getAttribute('inputmode')) === 'none', 'teclat del sistema desactivat amb el teclat propi');
await page.screenshot({ path: 'test-results/osk.png' });

// 11. full keyboard dead key
await set(`s => { s.keyboard.layout = 'full'; }`);
await clear();
await page.locator('.osk .key[data-a="dead"][data-k="grave"]').click(); await wait(150);
await page.locator('.osk .key[data-k="e"]').click(); await wait(150);
ok((await text()) === 'è', 'teclat complet: accent amb tecla morta');
await set(`s => { s.keyboard.visible = false; }`);

// 12. docx export / import round trip
await clear();
await page.evaluate(() => window.lecaa.editor.chain().command(({ tr }) => { tr.setMeta('lecaa-system', true); return true; })
  .setContent('<p><strong>Negreta</strong> i normal</p><ul><li><p>pic</p></li></ul><table><tbody><tr><td><p>A1</p></td><td><p>B1</p></td></tr></tbody></table><p><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" alt="punt"></p>').run());
await page.locator('.doc-title').fill('Prova');
const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[aria-label="Desa com a .docx"]')]);
const p = 'test-results/Prova.docx';
await dl.saveAs(p);
ok(fs.statSync(p).size > 1000 && dl.suggestedFilename() === 'Prova.docx', 'exporta .docx: ' + fs.statSync(p).size + ' bytes');
await clear();
const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.click('[aria-label="Obre un document"]')]);
await chooser.setFiles(p);
await wait(800);
const html = await page.evaluate(() => window.lecaa.editor.getHTML());
ok(html.includes('<strong>Negreta</strong>') && html.includes('<table') && html.includes('A1') && html.includes('<img') && html.includes('<li>'), 'importa .docx (negreta, llista, taula, imatge)');

// 13. autosave survives reload
await wait(1200);
await page.reload();
await page.waitForSelector('.ProseMirror');
await wait(500);
ok((await text()).includes('Negreta') && (await page.locator('.doc-title').inputValue()) === 'Prova', 'desat automàtic després de recarregar');

// 14. settings drawer opens and lists the Catalan voice
await page.click('[aria-label="Configuració"]');
await wait(500);
ok((await page.locator('#voice-select option').count()) >= 1, 'la configuració llista la veu catalana');
await page.screenshot({ path: 'test-results/settings.png' });
await page.keyboard.press('Escape');

await page.screenshot({ path: 'test-results/main.png' });
ok(errors.length === 0, 'sense errors a la consola: ' + JSON.stringify(errors));
await browser.close();
console.log(failures ? `${failures} FAILED` : 'ALL OK');
process.exit(failures ? 1 : 0);
