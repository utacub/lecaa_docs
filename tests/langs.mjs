// The four languages that came from LECAA Tecla (Basque, Galician, English, French): every text of
// the interface is translated, letter names and voices of each language, and the pictograms with
// their inflected forms. Needs the "pictos" folder next to the app.
import { chromium } from '@playwright/test';
import fs from 'node:fs';
const url = process.argv[2] || 'http://localhost:4173/';
let failures = 0;
const ok = (cond, msg) => { console.log((cond ? 'OK   ' : 'FAIL ') + msg); if (!cond) failures++; };

// 1. Every Catalan text given to T() has its translation in the four dictionaries.
const LIT = String.raw`('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\`(?:[^\`\\]|\\.)*\`)`;
const callRe = new RegExp(String.raw`\bT\(\s*` + LIT + String.raw`\s*,\s*` + LIT, 'g');
const unquote = lit => lit.slice(1, -1).replace(/\\(.)/g, (_, c) => (c === 'n' ? '\n' : c));
const files = fs.readdirSync('src', { recursive: true }).filter(f => f.endsWith('.ts') && !f.startsWith('lang')).map(f => 'src/' + f);
const keys = new Set();
for (const f of files) for (const m of fs.readFileSync(f, 'utf8').matchAll(callRe)) keys.add(unquote(m[1]));
const ONLY = { 'Avís sobre les veus gallegues': ['gl'] };
for (const lang of ['eu', 'gl', 'en', 'fr']) {
  const src = fs.readFileSync(`src/lang/${lang}.ts`, 'utf8');
  const dict = new Map([...src.matchAll(/^ {2}('(?:[^'\\]|\\.)*'): ('(?:[^'\\]|\\.)*'),$/gm)].map(m => [unquote(m[1]), unquote(m[2])]));
  const missing = [...keys].filter(k => !dict.has(k) && (!ONLY[k] || ONLY[k].includes(lang)));
  const placeholders = [...dict].filter(([k, v]) => JSON.stringify(k.match(/\{\w+\}/g)?.sort()) !== JSON.stringify(v.match(/\{\w+\}/g)?.sort()));
  ok(!missing.length && !placeholders.length, `${lang}: ${dict.size} textos traduïts, cap que falti (${keys.size} a l’app)` + (missing.length ? ' FALTEN: ' + JSON.stringify(missing.slice(0, 5)) : '') + (placeholders.length ? ' MARQUES: ' + JSON.stringify(placeholders.slice(0, 3)) : ''));
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.addInitScript({ path: 'tests/mock-speech.js' });
// The fake voices of the other languages (no Galician one: Galician falls back to Spanish).
await ctx.addInitScript(() => {
  const more = [['Proba Euskara', 'eu-ES'], ['Test English', 'en-GB'], ['Test Français', 'fr-FR'], ['Teste Português', 'pt-PT']]
    .map(([name, lang]) => ({ name, lang, voiceURI: name, localService: true, default: false }));
  const base = speechSynthesis.getVoices;
  speechSynthesis.getVoices = () => [...base(), ...more];
});
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const requested = [];
page.on('request', r => { const m = r.url().match(/pictos\/(index-\w+\.js)/); if (m) requested.push(m[1]); });
const wait = ms => page.waitForTimeout(ms);
const pictos = () => page.evaluate(() => [...document.querySelectorAll('.ProseMirror .pw')].map(e => `${e.textContent}:${e.dataset.picto}`));
const clear = () => page.evaluate(() => window.lecaa.editor.chain().command(({ tr }) => { tr.setMeta('lecaa-system', true); return true; }).setContent('').focus().run());

// Words to type, and the pictogram each one must get (2317 house, 2517 dog, 2349 eat,
// 2494 bread, 2248 water, 37642 bread with tomato, 2617 I); "-" means none (function word).
const CASES = {
  eu: { text: 'Txakurrak ogia jaten du etxean eta ura edaten. Ni etxera noa. ', expect: { Txakurrak: 2517, ogia: 2494, jaten: 2349, etxean: 2317, eta: '-', ura: 2248, etxera: 2317, Ni: 2617 },
    ui: { read: 'Irakurri', settings: 'Ezarpenak' }, voice: 'Proba Euskara', names: ['be', 'ixa', 'zeta'], letters: 'bxz' },
  gl: { text: 'Os cans comen pan con tomate na casa. Eu bebo auga. ', expect: { Os: '-', cans: 2517, comen: 2349, 'pan con tomate': 37642, na: '-', casa: 2317, Eu: 2617, auga: 2248 },
    ui: { read: 'Ler', settings: 'Configuración' }, voice: 'Prova Castellano', names: ['be', 'xis', 'zeta'], letters: 'bxz' },
  en: { text: 'The dogs ate bread at my house. I’m drinking cold water. ', expect: { The: '-', dogs: 2517, ate: 2349, bread: 2494, at: '-', house: 2317, 'I’m': 2617, drinking: 2276, water: 2248 },
    ui: { read: 'Read', settings: 'Settings' }, voice: 'Test English', names: ['B', 'X', 'Z'], letters: 'bxz' },
  fr: { text: 'Les chiens mangent du pain à la maison. Je bois de l’eau. ', expect: { Les: '-', chiens: 2517, mangent: 2349, pain: 2494, du: '-', maison: 2317, Je: 2617, 'l’eau': 2248 },
    ui: { read: 'Lire', settings: 'Réglages' }, voice: 'Test Français', names: ['B', 'X', 'Z'], letters: 'bxz' },
};

await page.goto(url);
for (const [lang, c] of Object.entries(CASES)) {
  await page.evaluate(l => localStorage.setItem('lecaa-docs:lang', l), lang);
  requested.length = 0;
  await page.reload();
  await page.waitForFunction(() => document.querySelector('.ProseMirror.pictos-on'));
  await page.evaluate(() => window.lecaa.settings.update(s => { s.guard.enabled = false; s.feedback.sentence = false; s.feedback.word = false; s.feedback.letter = 'off'; }));
  ok(await page.evaluate(() => document.documentElement.lang) === lang, `${lang}: la pàgina és en aquest idioma`);
  const labels = await page.evaluate(() => [...document.querySelectorAll('[aria-label]')].map(e => e.getAttribute('aria-label')));
  ok(labels.includes(c.ui.read) || labels.some(l => l.startsWith(c.ui.read)), `${lang}: botons traduïts (${c.ui.read}): ` + JSON.stringify(labels.slice(0, 6)));

  // pictograms, with inflected forms, elisions and function words
  const ed = page.locator('.ProseMirror');
  await ed.click();
  await clear();
  await page.keyboard.type(c.text, { delay: 20 });
  await wait(200);
  const got = Object.fromEntries((await pictos()).map(x => { const i = x.lastIndexOf(':'); return [x.slice(0, i), Number(x.slice(i + 1))]; }));
  const wrong = Object.entries(c.expect).filter(([w, id]) => (id === '-' ? w in got : got[w] !== id));
  ok(!wrong.length, `${lang}: pictogrames de les paraules i les seves formes: ` + JSON.stringify(got) + (wrong.length ? ' ERRADES: ' + JSON.stringify(wrong) : ''));
  ok(JSON.stringify(requested) === JSON.stringify([`index-${lang}.js`]), `${lang}: només es carrega l’índex d’aquest idioma: ` + JSON.stringify(requested));

  // the voice of the language (Galician: a Spanish one, as there is none) and the letter names
  const voice = await page.evaluate(() => window.lecaa.speech.currentVoice()?.name);
  ok(voice?.startsWith(c.voice), `${lang}: veu per defecte «${voice}»`);
  await page.evaluate(() => window.lecaa.settings.update(s => { s.feedback.letter = 'name'; }));
  await clear();
  await page.evaluate(() => { window.__spoken.length = 0; });
  for (const ch of c.letters) { await page.keyboard.type(ch); await wait(400); }
  const spoken = await page.evaluate(() => window.__spoken.slice());
  ok(JSON.stringify(spoken) === JSON.stringify(c.names), `${lang}: noms de les lletres: ` + JSON.stringify(spoken));

  // the settings: translated, with the voices of the language and their notices
  await page.evaluate(() => window.lecaa.settings.update(s => { s.feedback.letter = 'off'; }));
  await page.locator('.topbar-actions button').last().click();
  await page.waitForSelector('.drawer');
  const drawer = await page.evaluate(() => ({
    title: document.querySelector('#settings-title')?.textContent,
    downloads: [...document.querySelectorAll('.drawer .neural-title')].map(e => e.textContent),
    notice: document.querySelector('.drawer .voice-notice')?.textContent ?? '',
    sound: [...document.querySelectorAll('.drawer input[name=letter]')].map(e => e.value),
  }));
  ok(drawer.title === c.ui.settings, `${lang}: configuració traduïda: «${drawer.title}»`);
  const voicesOk = { eu: ['Maider', 'Antton'], gl: ['Davefx', 'Tugão'], en: [], fr: [] }[lang];
  ok(voicesOk.every(v => drawer.downloads.includes(v)) && drawer.downloads.filter(t => !/pictog|piktog/i.test(t)).length === voicesOk.length,
    `${lang}: veus per descarregar: ` + JSON.stringify(drawer.downloads));
  ok(lang === 'gl' ? /Sabela e Roi/.test(drawer.notice) && /Tugão/.test(drawer.notice) : drawer.notice === '', `${lang}: avís sobre les veus gallegues només en gallec`);
  ok(!drawer.sound.includes('sound'), `${lang}: sense l’opció de so de la lletra (no hi ha locucions)`);
  await page.keyboard.press('Escape');
  await page.evaluate(() => document.querySelector('.drawer-backdrop')?.click());
}
await page.evaluate(() => localStorage.setItem('lecaa-docs:lang', 'ca'));
ok(errors.length === 0, 'cap error a la consola: ' + JSON.stringify(errors));
await browser.close();
console.log(failures ? `${failures} errors` : 'Tot correcte');
process.exit(failures ? 1 : 0);
