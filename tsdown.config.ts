import { defineConfig } from 'tsdown';
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const componentsDir = 'components';

// Discover components that ship JS.
const names = readdirSync(componentsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .filter((name) => existsSync(join(componentsDir, name, 'component.js')))
  .sort();

// Generate the JS barrel (build-time, gitignored — discovery stays automatic).
const barrel = join(componentsDir, 'index.js');
writeFileSync(barrel, names.map((n) => `export * from './${n}/component.js';`).join('\n') + '\n');

const componentEntries = Object.fromEntries(
  names.map((name) => [name, join(componentsDir, name, 'component.js')]),
);

export default defineConfig([
  // Per-component ESM, each self-contained (no shared chunks), with type declarations.
  // The dist barrel (dist/js/index.js + .d.ts) is generated afterwards by
  // scripts/build-barrel.mjs — re-exporting these files keeps them self-contained.
  {
    entry: componentEntries,
    format: ['esm'],
    outDir: 'dist/js',
    dts: true,
    clean: true,
  },
  // CDN bundles: minified IIFE (global `FiveNine`) + minified ESM. Bundling inlines
  // everything into one file, so the source barrel is the right entry here.
  {
    entry: { 'fivenine-ui': barrel },
    format: ['iife', 'esm'],
    globalName: 'FiveNine',
    platform: 'browser',
    minify: true,
    dts: false,
    outDir: 'dist/cdn',
    clean: true,
  },
]);
