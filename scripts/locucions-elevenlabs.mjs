// Generates the recorded letter sounds of one language with ElevenLabs, one folder per voice:
//   ELEVENLABS_API_KEY=... node scripts/locucions-elevenlabs.mjs es nom=VOICE_ID [nom2=VOICE_ID2 ...]
// Writes src/assets/sons/es/<nom>/<file>.mp3 for every entry of locucions/es.json (existing files
// are kept unless --force). The next build offers each folder as a voice under "Sonido de la letra".
// Options: --model=eleven_v4 (default), --force, --only=a,e,i

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const lang = args.find(a => !a.includes('=') && !a.startsWith('--'));
const opt = name => args.find(a => a.startsWith(`--${name}=`))?.split('=')[1];
const voices = args.filter(a => a.includes('=') && !a.startsWith('--')).map(a => a.split('='));
const key = process.env.ELEVENLABS_API_KEY;

if (!lang || !voices.length || !key) {
  console.error('Ús: ELEVENLABS_API_KEY=... node scripts/locucions-elevenlabs.mjs es nom=VOICE_ID [...] [--model=...] [--force] [--only=a,e]');
  process.exit(1);
}

const { phonemes } = JSON.parse(readFileSync(join(root, 'locucions', `${lang}.json`), 'utf8'));
const only = opt('only')?.split(',');
const model = opt('model') ?? 'eleven_v4';

for (const [name, voiceId] of voices) {
  if (!/^[a-z0-9_-]+$/.test(name)) throw new Error(`Nom de veu no vàlid: ${name} (lletres minúscules, números, - o _)`);
  const dir = join(root, 'src', 'assets', 'sons', lang, name);
  mkdirSync(dir, { recursive: true });
  for (const p of phonemes) {
    if (only && !only.includes(p.file)) continue;
    const out = join(dir, `${p.file}.mp3`);
    if (existsSync(out) && !args.includes('--force')) continue;
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'content-type': 'application/json', accept: 'audio/mpeg' },
      body: JSON.stringify({ text: p.text, model_id: model }),
    });
    if (!res.ok) throw new Error(`${name}/${p.file}: HTTP ${res.status} ${await res.text()}`);
    writeFileSync(out, Buffer.from(await res.arrayBuffer()));
    console.log(`${name}/${p.file}.mp3`);
  }
}
