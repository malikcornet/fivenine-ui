import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import { PORTS } from '../scripts/lib/conventions.mjs';

const pkgRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // Standalone dev serves under /docs/; the merged site build passes
  // BASE_PATH=/<repo>/<version>/docs/.
  base: process.env.BASE_PATH ?? '/docs/',
  trailingSlash: 'ignore',
  server: { port: PORTS.docs },
  vite: {
    server: {
      // Reads the manifest and example sources from outside the package root.
      fs: { allow: [path.resolve(pkgRoot, '..')] },
      // NOTE: no proxy for /html|/react|/blazor — Astro's dev server answers
      // all text/html requests itself before Vite's proxy runs, so iframe
      // navigations would 404. In dev the docs script points example iframes
      // directly at the target dev server ports instead (see scripts/docs.ts).
    },
  },
});
