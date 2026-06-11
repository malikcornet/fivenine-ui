import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
// @ts-expect-error untyped shared convention module
import { PORTS } from '../../../scripts/lib/conventions.mjs';

const pkgRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  // Standalone dev serves under /react/; the merged site build passes
  // BASE_PATH=/<repo>/<version>/react/.
  base: process.env.BASE_PATH ?? '/react/',
  resolve: {
    // Point at the wrapper sources so editing targets/react/src hot-reloads
    // here without a library build step.
    alias: {
      '@fivenine/react': path.resolve(pkgRoot, '../src/index.ts'),
    },
  },
  server: {
    port: PORTS.react,
    strictPort: true,
    fs: { allow: [path.resolve(pkgRoot, '../../..')] },
  },
});
