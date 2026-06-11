import path from 'node:path';
import { globSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { PORTS } from '../../scripts/lib/conventions.mjs';

const pkgRoot = path.dirname(fileURLToPath(import.meta.url));
const examplesRoot = path.join(pkgRoot, 'examples');

export default defineConfig({
  root: examplesRoot,
  // Standalone dev serves under /html/; the merged site build passes
  // BASE_PATH=/<repo>/<version>/html/.
  base: process.env.BASE_PATH ?? '/html/',
  server: {
    port: PORTS.html,
    strictPort: true,
    fs: { allow: [path.resolve(pkgRoot, '../..')] },
  },
  build: {
    outDir: path.join(pkgRoot, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      // Every examples/**/index.html is a build entry, so each example page is
      // a standalone static page in the output.
      input: globSync('**/index.html', { cwd: examplesRoot }).map((file) =>
        path.join(examplesRoot, file),
      ),
    },
  },
});
