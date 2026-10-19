import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Online edition: writes sw.js with the list of files of this build and a version taken from them.
const PUBLIC_FILES = ['icon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'];
function serviceWorker(): Plugin {
  return {
    name: 'lecaa-docs-sw',
    apply: 'build',
    generateBundle(_, bundle) {
      const files = [...Object.keys(bundle).filter(f => f !== 'index.html'), ...PUBLIC_FILES].sort().map(f => './' + f);
      const version = createHash('sha256').update(files.join('\n')).digest('hex').slice(0, 12);
      const source = readFileSync(new URL('./src/sw.js', import.meta.url), 'utf8')
        .replace('__VERSION__', version).replace('__FILES__', JSON.stringify(files));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
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
