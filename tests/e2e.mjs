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
// System on-screen keyboards (Android, and others with suggestions): no usable key, only text.
const cdp = await ctx.newCDPSession(page);
const vkey = async (ch, delay = 200) => {
  await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Unidentified', windowsVirtualKeyCode: 229 });
  await cdp.send('Input.insertText', { text: ch });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Unidentified', windowsVirtualKeyCode: 229 });
  await wait(delay);
};
const vtype = async (str, delay) => { for (const c of str) await vkey(c, delay); };
// Keyboards that compose each word (Gboard): the text grows with every key.
const compose = async (word, delay = 250) => {
  let t = '';
  for (const c of word) { t += c; await cdp.send('Input.imeSetComposition', { text: t, selectionStart: t.length, selectionEnd: t.length }); await wait(delay); }
  await cdp.send('Input.insertText', { text: t });
  await wait(100);
};

await page.goto(url);
await page.waitForFunction(() => document.querySelector('.ProseMirror') && window.lecaa);
await wait(300);
const ed = page.locator('.ProseMirror');
await ed.click();

// 0. brand: UTAC logo to the left of the LECAA Docs logo, both visible
const brand = await page.evaluate(() => {
  const u = document.querySelector('.brand .utac-logo'), l = document.querySelector('.brand .lecaa-docs-logo');
  const ru = u.getBoundingClientRect(), rl = l.getBoundingClientRect();
  return { loaded: u.complete && u.naturalWidth > 0, alt: u.alt, label: l.getAttribute('aria-label'), left: ru.right <= rl.left, w: rl.width, svg: !!l.querySelector('svg path') };
});
ok(brand.loaded && brand.alt === 'UTAC' && brand.label === 'LECAA Docs' && brand.left && brand.w > 80 && brand.svg, 'logos de la UTAC i de LECAA Docs a la barra: ' + JSON.stringify(brand));

// 0b. "Sobre LECAA Docs" between full screen and settings, with the institutional logos
const order = await page.evaluate(() => [...document.querySelectorAll('.topbar-actions button')].map(b => b.getAttribute('aria-label')));
ok(order.indexOf('Sobre LECAA Docs') === order.indexOf('Pantalla completa') + 1 && order.indexOf('Configuració') === order.indexOf('Sobre LECAA Docs') + 1, 'botó Sobre LECAA Docs entre pantalla completa i configuració: ' + JSON.stringify(order));
await page.click('[aria-label="Sobre LECAA Docs"]');
await wait(500);
const about = await page.evaluate(() => {
  const d = document.querySelector('dialog.about');
  return { open: d?.open, imgs: [...d.querySelectorAll('.about-institutions img')].map(i => i.alt + ':' + (i.complete && i.naturalWidth > 0)), text: d.textContent };
});
ok(about.open && about.imgs.length === 5 && about.imgs.every(x => x.endsWith(':true')) && about.text.includes('La UTAC és un equip de la Universitat de Barcelona i de la Fundació Bosch i Gimpera. Concreta la seva activitat'), 'diàleg Sobre LECAA Docs amb els 5 logos i el text de la UTAC: ' + JSON.stringify(about.imgs));
await page.screenshot({ path: 'test-results/about.png' });
await page.keyboard.press('Escape');
await wait(300);
ok(await page.evaluate(() => !document.querySelector('dialog.about')), 'Esc tanca el diàleg');
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
ok(JSON.stringify(sp) === '["Hola món."]', 'en escriure punt només es llegeix la frase: ' + JSON.stringify(sp));

// 2. Enter speaks the unfinished sentence
await clear();
await page.keyboard.type('El gat', { delay: 120 });
await reset();
await page.keyboard.press('Enter');
await wait(600);
sp = await spoken();
ok(JSON.stringify(sp) === '["El gat"]', 'en prémer Intro només es llegeix la frase, no la darrera paraula: ' + JSON.stringify(sp));

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
ok(clips.length === 2 && clips.every(c => c.startsWith('webaudio:')) && (await spoken()).length === 0, 'so de la lletra amb locució, ja descodificada (Web Audio): ' + JSON.stringify(clips));

// 5. no feedback
await set(`s => { s.feedback = { sentence: false, word: false, wordOnPunct: false, letter: 'off', upperCaseWord: false }; }`);
await clear();
await page.keyboard.type('Bon dia. ', { delay: 100 });
await wait(300);
ok((await spoken()).length === 0, 'cap feedback mentre s’escriu');
await page.click('[aria-label="Llegeix"]');
await wait(1500);
ok((await spoken()).some(t => t.includes('Bon dia')), 'el botó Llegeix funciona sense feedback (cursor al final: llegeix tot): ' + JSON.stringify(await spoken()));

// 5b. one reading button: the selection if there is one, otherwise from the cursor
await clear();
await page.evaluate(() => window.lecaa.editor.chain().command(({ tr }) => { tr.setMeta('lecaa-system', true); return true; }).insertContent('<p>Primera frase.</p><p>Segona frase.</p>').run());
await page.evaluate(() => window.__spoken.length = 0);
await page.evaluate(() => { const ed = window.lecaa.editor; let pos = 0; ed.state.doc.descendants((n, p) => { if (n.isText && n.text.startsWith('Segona')) pos = p; }); ed.commands.setTextSelection(pos); });
await page.click('[aria-label="Llegeix"]');
await wait(1500);
ok((await spoken()).join(' ').includes('Segona') && !(await spoken()).join(' ').includes('Primera'), 'sense selecció llegeix des del cursor: ' + JSON.stringify(await spoken()));
await page.evaluate(() => window.__spoken.length = 0);
await page.evaluate(() => window.lecaa.editor.commands.setTextSelection({ from: 1, to: 8 }));
await page.click('[aria-label="Llegeix"]');
await wait(1500);
ok(JSON.stringify(await spoken()).includes('Primera') && !(await spoken()).join(' ').includes('Segona'), 'amb selecció llegeix només la selecció: ' + JSON.stringify(await spoken()));
ok((await page.locator('.toolbar').count()) === 1 && await page.locator('.topbar [aria-label="Configuració"]').isVisible() && (await page.locator('[aria-label="Teclat"], .osk').count()) === 0, 'tot en dues franges i sense teclat en pantalla propi');

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

// 8b. holding Backspace is allowed, at most 4 deletions per second, without a calm warning
await set(`s => { s.feedback = { sentence: false, word: false, wordOnPunct: false, letter: 'off', upperCaseWord: false }; }`);
await clear();
const held = await page.evaluate(async () => {
  const el = document.querySelector('.ProseMirror');
  const send = repeat => { const e = new KeyboardEvent('keydown', { key: 'Backspace', code: 'Backspace', repeat, bubbles: true, cancelable: true }); el.dispatchEvent(e); return !e.defaultPrevented; };
  let accepted = send(false) ? 1 : 0;
  await new Promise(r => setTimeout(r, 500)); // the system's delay before auto-repeat
  const t0 = performance.now();
  while (performance.now() - t0 < 2000) { if (send(true)) accepted++; await new Promise(r => setTimeout(r, 33)); }
  el.dispatchEvent(new KeyboardEvent('keyup', { key: 'Backspace', code: 'Backspace', bubbles: true }));
  return accepted;
});
ok(held >= 8 && held <= 10, `mantenir esborrar: ${held} esborrats en 2,5 s (màxim 4 per segon)`);
ok(!(await page.locator('.calm').isVisible()), 'mantenir esborrar no mostra l’avís de calma');
// a held letter is still a misuse
await page.evaluate(async () => {
  const el = document.querySelector('.ProseMirror');
  for (let i = 0; i < 10; i++) el.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', code: 'KeyA', repeat: i > 0, bubbles: true, cancelable: true }));
  el.dispatchEvent(new KeyboardEvent('keyup', { key: 'a', code: 'KeyA', bubbles: true }));
});
ok(await page.locator('.calm').isVisible(), 'mantenir una lletra continua sent un mal ús');
await wait(3200);

// 8c. a held delete key on a system on-screen keyboard repeats without telling: 4 per second
await clear();
const vheld = await page.evaluate(async () => {
  const el = document.querySelector('.ProseMirror');
  let accepted = 0;
  const t0 = performance.now();
  while (performance.now() - t0 < 1500) {
    const e = new InputEvent('beforeinput', { inputType: 'deleteContentBackward', bubbles: true, cancelable: true });
    el.dispatchEvent(e);
    if (!e.defaultPrevented) accepted++;
    await new Promise(r => setTimeout(r, 50));
  }
  return accepted;
});
ok(vheld >= 5 && vheld <= 7, `esborrar mantingut al teclat del sistema: ${vheld} en 1,5 s`);
ok(!(await page.locator('.calm').isVisible()), 'esborrar mantingut no mostra l’avís de calma');

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

// 10. system on-screen keyboards (no usable key, only the inserted text)
await set(`s => { s.feedback = { sentence: true, word: true, wordOnPunct: true, letter: 'name', upperCaseWord: false }; s.motor.debounceMs = 300; }`);
await clear();
await vtype('casa ', 200);
await wait(300);
ok((await text()) === 'casa ' && JSON.stringify(await spoken()) === JSON.stringify(['ce', 'a', 'essa', 'a', 'casa']), 'teclat del sistema: lletres i paraula, també amb l’ajust motriu: ' + JSON.stringify([await text(), await spoken()]));
await set(`s => { s.motor.debounceMs = 0; }`);
await clear();
await compose('gat');
await vkey(' ', 400);
ok((await text()) === 'gat ' && JSON.stringify(await spoken()) === JSON.stringify(['ge', 'a', 'te', 'gat']), 'teclat que compon paraules: ' + JSON.stringify([await text(), await spoken()]));
await clear();
await vtype('El gat', 120);
await wait(300);
await reset();
await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
await cdp.send('Input.dispatchKeyEvent', { type: 'char', text: '\r', key: 'Enter' });
await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', windowsVirtualKeyCode: 13 });
await wait(400);
ok(JSON.stringify(await spoken()) === JSON.stringify(['El gat']), 'intro del teclat del sistema llegeix la frase un cop: ' + JSON.stringify(await spoken()));
await clear();
const burst = await page.evaluate(() => {
  const el = document.querySelector('.ProseMirror');
  return [...'qwe'].map(ch => { const e = new InputEvent('beforeinput', { inputType: 'insertText', data: ch, bubbles: true, cancelable: true }); el.dispatchEvent(e); return e.defaultPrevented; });
});
ok(await page.locator('.calm').isVisible() && JSON.stringify(burst) === '[false,false,true]', 'teclat del sistema: tecles molt seguides → calma: ' + JSON.stringify(burst));
await wait(3300);
await clear();
let comp = '';
for (const c of 'aaa') { comp += c; await cdp.send('Input.imeSetComposition', { text: comp, selectionStart: comp.length, selectionEnd: comp.length }); await wait(250); }
ok(await page.locator('.calm').isVisible() && (await text()) === 'aa', 'teclat que compon: la mateixa lletra 3 vegades → calma: ' + JSON.stringify(await text()));
await wait(3300);
await cdp.send('Input.insertText', { text: '' });
await set(`s => { s.feedback = { sentence: false, word: true, wordOnPunct: true, letter: 'off', upperCaseWord: false }; s.lockWhileSpeaking = true; }`);
await clear();
await vtype('Casa ', 150);
await wait(40);
await vkey('x', 10);
ok((await text()) === 'Casa ', 'protecció també amb el teclat del sistema: ' + JSON.stringify(await text()));
await set(`s => { s.lockWhileSpeaking = false; }`);
const edAttrs = await page.evaluate(() => { const e = document.querySelector('.ProseMirror'); return { im: e.getAttribute('inputmode'), ce: e.contentEditable }; });
ok(edAttrs.im !== 'none' && edAttrs.ce === 'true', 'el teclat del sistema es pot obrir: ' + JSON.stringify(edAttrs));

// 11. physical keyboard connected to a tablet: dead key + vowel arrive as a composition
await clear();
await set(`s => { s.feedback.word = false; }`);
await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Dead', code: 'BracketLeft', windowsVirtualKeyCode: 186 });
await cdp.send('Input.imeSetComposition', { text: '`', selectionStart: 1, selectionEnd: 1 });
await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Dead', code: 'BracketLeft', windowsVirtualKeyCode: 186 });
await wait(100);
await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'è', code: 'KeyE', windowsVirtualKeyCode: 69 });
await cdp.send('Input.insertText', { text: 'è' });
await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'e', code: 'KeyE', windowsVirtualKeyCode: 69 });
await wait(300);
ok((await text()) === 'è', 'teclat físic: accent amb tecla morta: ' + JSON.stringify(await text()));

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
await page.waitForFunction(() => document.querySelector('.ProseMirror') && window.lecaa);
await wait(500);
ok((await text()).includes('Negreta') && (await page.locator('.doc-title').inputValue()) === 'Prova', 'desat automàtic després de recarregar');

// 14. settings drawer opens and lists the Catalan voice
await page.click('[aria-label="Configuració"]');
await wait(500);
ok((await page.locator('#voice-select option').count()) >= 1, 'la configuració llista la veu catalana');
await page.screenshot({ path: 'test-results/settings.png' });
await page.keyboard.press('Escape');

await page.click('[aria-label="Tanca"]').catch(() => {});

// 15. fonts: six bundled fonts, two joined; applied to the selection and to the document
await clear();
const fontOpts = await page.locator('.font-select option').allTextContents();
ok(fontOpts.length === 7 && fontOpts.filter(t => t.includes('Lligada')).length === 2, 'sis lletres al selector, dues lligades: ' + JSON.stringify(fontOpts));
await page.evaluate(() => window.lecaa.editor.chain().command(({ tr }) => { tr.setMeta('lecaa-system', true); return true; }).insertContent('Escric amb lletra lligada').selectAll().run());
await page.selectOption('.font-select', 'lligada-es');
const ffHtml = await page.evaluate(() => window.lecaa.editor.getHTML());
ok(ffHtml.includes('Playwrite ES'), 'la lletra lligada s’aplica a la selecció');
const fontsReady = await page.evaluate(async () => { await document.fonts.ready; return ['Playwrite ES', 'Playwrite FR Moderne', 'Lexend', 'Atkinson Hyperlegible', 'OpenDyslexic'].map(f => document.fonts.check(`16px "${f}"`)); });
ok(fontsReady.every(Boolean), 'les lletres es carreguen sense connexió: ' + JSON.stringify(fontsReady));
await set(`s => { s.docFont = 'lexend'; }`);
ok((await page.evaluate(() => getComputedStyle(document.querySelector('.ProseMirror')).fontFamily)).includes('Lexend'), 'lletra del document configurable');
await set(`s => { s.docFont = 'andika'; }`);
await page.screenshot({ path: 'test-results/fonts.png' });

// 15b. text size in points: drop-down plus bigger / smaller buttons, exported to the .docx
await clear();
await page.evaluate(() => window.lecaa.editor.chain().command(({ tr }) => { tr.setMeta('lecaa-system', true); return true; }).insertContent('Mida').selectAll().run());
ok((await page.inputValue('.size-select')) === '14', 'el text sense format és de 14 punts');
await page.selectOption('.size-select', '24');
await page.click('[aria-label="Augmenta la mida de la lletra"]');
await page.click('[aria-label="Augmenta la mida de la lletra"]');
await page.click('[aria-label="Redueix la mida de la lletra"]');
ok((await page.inputValue('.size-select')) === '28', 'desplegable de punts i botons per pujar i baixar: ' + await page.inputValue('.size-select'));
const sizePx = await page.evaluate(() => [parseFloat(getComputedStyle(document.querySelector('.ProseMirror p span')).fontSize), parseFloat(getComputedStyle(document.querySelector('.ProseMirror')).fontSize)]);
ok(Math.abs(sizePx[0] / sizePx[1] - 2) < 0.01, 'a la pantalla, 28 punts és el doble de 14: ' + JSON.stringify(sizePx));
const [dl2] = await Promise.all([page.waitForEvent('download'), page.click('[aria-label="Desa com a .docx"]')]);
await dl2.saveAs('test-results/mida.docx');
const { execSync } = await import('node:child_process');
ok(execSync('unzip -p test-results/mida.docx word/document.xml').toString().includes('<w:sz w:val="56"/>'), 'el .docx desa la mida en punts (28 pt)');
await page.evaluate(() => window.lecaa.editor.chain().selectAll().setFontSize('0.8em').run());
ok((await page.inputValue('.size-select')) === '11', 'una mida fora de la llista (11,2 → 11) es mostra igualment');

// 15c. PDF export: same fonts embedded, text selectable, lists, tables and images
await clear();
await page.evaluate(() => window.lecaa.editor.chain().command(({ tr }) => { tr.setMeta('lecaa-system', true); return true; })
  .setContent('<p><strong>Negreta</strong> i <span style="font-family: \'Playwrite ES\', cursive; font-size: 2em">col·legi lligat</span></p><ol><li><p>primer</p></li><li><p>segon</p></li></ol><table><tbody><tr><td colspan="2"><p>Fusionada</p></td></tr><tr><td><p>A2</p></td><td><p>B2</p></td></tr></tbody></table><p><img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==" alt="punt"></p>').run());
await page.locator('.doc-title').fill('Prova PDF');
const [dl3] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.click('[aria-label="Desa com a PDF"]')]);
await dl3.saveAs('test-results/prova.pdf');
const pdfText = execSync('pdftotext test-results/prova.pdf -').toString().replace(/· /g, '·');
const pdfFonts = execSync('pdffonts test-results/prova.pdf').toString();
ok(dl3.suggestedFilename() === 'Prova PDF.pdf' && ['Negreta', 'col·legi lligat', 'primer', 'segon', 'Fusionada', 'A2', 'B2'].every(t => pdfText.includes(t)), 'desa en PDF amb el text seleccionable: ' + JSON.stringify(pdfText.replace(/\s+/g, ' ').trim()));
ok(/Andika-Bold/.test(pdfFonts) && /PlaywriteES/.test(pdfFonts), 'el PDF porta incrustades les mateixes lletres');
ok(execSync('pdfimages -list test-results/prova.pdf').toString().split('\n').length > 3, 'el PDF inclou la imatge');

// 16. full-screen mode: password set first, toolbars hidden, survives reload, exits only with the password
await page.click('[aria-label="Pantalla completa"]');
await page.fill('.lock-input >> nth=0', 'gat1');
await page.fill('.lock-input >> nth=1', 'gat1');
await page.click('.lock-card button[type=submit]');
await wait(300);
ok(await page.evaluate(() => document.body.classList.contains('is-kiosk')), 'entra en pantalla completa després de posar la contrasenya');
ok(!(await page.locator('.toolbar').isVisible()) && !(await page.locator('[aria-label="Configuració"]').isVisible()), 'amaga la barra d’eines i la configuració');
ok(await page.locator('[aria-label="Llegeix"]').isVisible() && !(await page.locator('.doc-title').isVisible()), 'els botons de lectura continuen visibles');
await page.reload();
await page.waitForFunction(() => document.querySelector('.ProseMirror') && window.lecaa);
await wait(300);
ok(await page.evaluate(() => document.body.classList.contains('is-kiosk')), 'continua bloquejat després de recarregar');
await page.click('.lock-exit');
await page.fill('.lock-input', 'gos');
await page.click('.lock-card button[type=submit]');
await wait(200);
ok(await page.evaluate(() => document.body.classList.contains('is-kiosk')) && (await page.locator('.lock-msg').textContent()).includes('no és correcta'), 'una contrasenya incorrecta no en surt');
await page.fill('.lock-input', 'gat1');
await page.click('.lock-card button[type=submit]');
await wait(300);
ok(!(await page.evaluate(() => document.body.classList.contains('is-kiosk'))) && await page.locator('.toolbar').isVisible(), 'la contrasenya correcta en surt');
await page.screenshot({ path: 'test-results/main.png' });

// 17. Spanish: the language button changes the interface, the configuration, the letters and the voices
await page.evaluate(() => window.lecaa.editor.chain().command(({ tr }) => { tr.setMeta('lecaa-system', true); return true; }).setContent('<p>Texto que se conserva</p>').run());
await set(`s => { s.feedback.word = false; }`); // Catalan configuration, must not leak into Spanish
const caPassword = await page.evaluate(() => window.lecaa.settings.value.lockPassword);
await page.click('.lang-btn');
ok(await page.isVisible('.lang-menu') && (await page.textContent('.lang-btn')).includes('CA'), 'el desplegable d’idioma s’obre i mostra CA');
await page.click('.lang-item[data-lang="es"]');
await page.waitForFunction(() => document.documentElement.lang === 'es' && document.querySelector('.ProseMirror') && window.lecaa);
await wait(400);
ok(await page.locator('[aria-label="Leer"]').isVisible() && await page.locator('[aria-label="Configuración"]').isVisible(), 'la interfície canvia al castellà');
ok((await text()).includes('Texto que se conserva'), 'el document es conserva en canviar d’idioma');
const esCfg = await page.evaluate(() => { const v = window.lecaa.settings.value; return { word: v.feedback.word, message: v.guard.message, pw: v.lockPassword }; });
ok(esCfg.word === true && esCfg.message === 'Piensa bien cada letra que escribes', 'configuració pròpia del castellà: ' + JSON.stringify(esCfg));
ok(esCfg.pw === caPassword && !!caPassword, 'la contrasenya de pantalla completa és la mateixa en els dos idiomes');
ok((await page.evaluate(() => window.lecaa.speech.currentVoice()?.lang)) === 'es-ES', 'fa servir una veu de castellà d’Espanya');
await ed.click();
await set(`s => { s.feedback = { sentence: true, word: true, wordOnPunct: true, letter: 'name', upperCaseWord: false }; }`);
await clear();
await vtype('ñuv', 250);
ok(JSON.stringify(await spoken()) === JSON.stringify(['eñe', 'u', 'uve']), 'noms de les lletres en castellà: ' + JSON.stringify(await spoken()));
await clear();
await page.keyboard.type('Hola amigo ', { delay: 120 });
await wait(400);
ok((await spoken()).includes('amigo'), 'paraula en castellà: ' + JSON.stringify(await spoken()));
await page.click('[aria-label="Configuración"]');
await wait(500);
const esVoices = await page.locator('#voice-select option').allTextContents();
ok(esVoices.length === 1 && esVoices[0].includes('es-ES'), 'només les veus de castellà d’Espanya: ' + JSON.stringify(esVoices));
const neuralTitles = await page.locator('.neural-title').allTextContents();
ok(neuralTitles.some(t => t.includes('Davefx')) && neuralTitles.some(t => t.includes('Sharvard')) && !neuralTitles.some(t => t.includes('Ona')), 'veus per descarregar en castellà: ' + JSON.stringify(neuralTitles));
const recVoices = await page.locator('input[name=recvoice]').count() + await page.locator('input[name=letter][value=sound]').count();
await page.check('input[name=letter][value=sound]');
const recLabels = await page.locator('label:has(input[name=recvoice])').allTextContents();
const recHint = await page.locator('.subgroup .hint').allTextContents();
ok(recLabels.length === 0 && !recHint.join().includes('Mateo'), 'una sola veu per als sons, sense nom: ' + JSON.stringify(recLabels) + recVoices);
await page.screenshot({ path: 'test-results/es-settings.png' });
await page.click('[aria-label="Cerrar"]');
await clear();
await vtype('ma', 300);
ok((await page.evaluate(() => window.__clips.length)) === 2, 'el so de la lletra sona en castellà: ' + JSON.stringify(await page.evaluate(() => window.__clips)));
await page.click('.lang-btn');
await page.keyboard.press('Escape');
ok(await page.isHidden('.lang-menu'), 'Esc tanca el desplegable');
await page.keyboard.press('ArrowDown');
await page.keyboard.press('Enter');
await page.waitForFunction(() => document.documentElement.lang === 'ca' && document.querySelector('.ProseMirror') && window.lecaa);
await wait(400);
ok(await page.locator('[aria-label="Llegeix"]').isVisible() && (await page.evaluate(() => window.lecaa.settings.value.feedback.word)) === false, 'en tornar al català recupera la seva configuració');
ok((await page.evaluate(() => window.lecaa.speech.currentVoice()?.lang)) === 'ca-ES', 'i la veu catalana');
await page.screenshot({ path: 'test-results/ca-again.png' });
// 17. a system on-screen keyboard covers the bottom (iPad, Windows touch): the app fits above it
{
  const c2 = await browser.newContext({ viewport: { width: 1024, height: 768 }, hasTouch: true });
  await c2.addInitScript({ path: 'tests/mock-speech.js' });
  await c2.addInitScript(() => {
    const vv = new EventTarget(); vv.height = 768; vv.width = 1024; vv.scale = 1; vv.offsetTop = 0;
    Object.defineProperty(window, 'visualViewport', { value: vv, configurable: true });
    window.__vv = vv;
  });
  const p2 = await c2.newPage();
  await p2.goto(url);
  await p2.waitForFunction(() => window.lecaa);
  // Where things are, to explain a failure.
  const trace = [];
  const where = step => p2.evaluate(step => {
    const w = document.querySelector('.workspace'), r = window.getSelection().getRangeAt(0).getBoundingClientRect();
    return { step, focus: window.lecaa.editor.isFocused, pictos: document.querySelector('.ProseMirror').classList.contains('pictos-on'), scroll: [w.scrollTop, w.scrollHeight, w.clientHeight], caret: r.bottom };
  }, step).then(x => trace.push(x));
  await p2.evaluate(() => { const ed = window.lecaa.editor; ed.commands.setContent(Array.from({ length: 40 }, (_, i) => `<p>Línia ${i}</p>`).join('')); ed.commands.focus('end'); });
  await where('focus');
  await p2.evaluate(() => { window.__vv.height = 420; window.__vv.dispatchEvent(new Event('resize')); });
  await p2.waitForTimeout(300);
  await where('keyboard');
  const fit = await p2.evaluate(() => ({ body: document.body.getBoundingClientRect().height, caret: window.getSelection().getRangeAt(0).getBoundingClientRect().bottom, toolbar: document.querySelector('.toolbar').getBoundingClientRect().top }));
  const good = fit.body === 420 && fit.caret <= 420 && fit.toolbar >= 0;
  ok(good, 'amb el teclat del sistema obert, el cursor i les barres es veuen: ' + JSON.stringify(fit) + (good ? '' : ' ' + JSON.stringify(trace)));
  await c2.close();
}
ok(errors.length === 0, 'sense errors a la consola: ' + JSON.stringify(errors));
await browser.close();
console.log(failures ? `${failures} FAILED` : 'ALL OK');
process.exit(failures ? 1 : 0);
