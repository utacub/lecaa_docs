import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Online edition: writes sw.js with the list of files of this build (and the size of each one, for
// the progress bar of the install dialog) and a version taken from them. Also writes offline.json,
// the sizes that the install dialog shows: the app (with the word indexes of the pictograms) and
// all the pictograms (the packs made by scripts/pictos-paquets.py, when the build has them).
const PUBLIC_FILES = ['icon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png', 'manifest.webmanifest'];
const PICTO_LANGS = ['ca', 'es', 'eu', 'gl', 'en', 'fr'];
const publicDir = new URL('./public/', import.meta.url);
const fileSize = (url: URL) => { try { return statSync(url).size; } catch { return 0; } };
function serviceWorker(): Plugin {
  return {
    name: 'lecaa-docs-sw',
    apply: 'build',
    enforce: 'post', // after Vite has written index.html into the bundle
    generateBundle(_, bundle) {
      const size = (f: string) => {
        const b = bundle[f];
        if (!b) return fileSize(new URL(f, publicDir));
        return b.type === 'chunk' ? Buffer.byteLength(b.code) : typeof b.source === 'string' ? Buffer.byteLength(b.source) : b.source.byteLength;
      };
      const names = [...Object.keys(bundle).filter(f => f !== 'index.html'), ...PUBLIC_FILES].sort();
      const files = names.map(f => ['./' + f, size(f)] as [string, number]);
      const indexes = PICTO_LANGS.map(l => [`./pictos/index-${l}.js`, fileSize(new URL(`pictos/index-${l}.js`, publicDir))] as [string, number])
        .filter(([, n]) => n > 0);
      const version = createHash('sha256').update(files.map(f => f[0]).join('\n')).digest('hex').slice(0, 12);
      const source = readFileSync(new URL('./src/sw.js', import.meta.url), 'utf8')
        .replace('__VERSION__', version).replace('__FILES__', JSON.stringify(files))
        .replace('__INDEXES__', JSON.stringify(indexes)).replace('__SHELL_BYTES__', String(size('index.html')));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
      // The page is kept twice ('./' and './index.html').
      const app = 2 * size('index.html') + [...files, ...indexes].reduce((n, [, b]) => n + b, 0);
      let pictos = 0;
      try {
        const packs = JSON.parse(readFileSync(new URL('pictos/paquets/index.json', publicDir), 'utf8')) as { parts: number[][] };
        for (const part of packs.parts) for (let i = 2; i < part.length; i += 3) pictos += part[i];
      } catch { /* no packs in this build: the app uses its own estimate */ }
      this.emitFile({ type: 'asset', fileName: 'offline.json', source: JSON.stringify({ version, app, pictos }) });
    },
  };
}

// "single" mode produces one self-contained HTML file (sounds, fonts and code inlined),
// like LECAA's downloadable edition. The default mode is the online/PWA build.
export default defineConfig(({ mode }) => {
  const single = mode === 'single';
  return {
    base: './',
    define: { __SINGLE_FILE__: JSON.stringify(single) },
    plugins: single ? [viteSingleFile()] : [serviceWorker()],
    build: {
      outDir: single ? 'dist-single' : 'dist',
      copyPublicDir: !single, // the single file fetches the voice runtime from jsDelivr instead
      assetsInlineLimit: single ? 100_000_000 : 4096,
      chunkSizeWarningLimit: 4000,
    },
    server: { port: 5173, strictPort: true },
    clearScreen: false,
  };
});
