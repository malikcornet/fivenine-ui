import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Generates the dist barrel by re-exporting the per-component build outputs, so each
// component file stays self-contained (no shared chunk). Runs after tsdown.
const root = path.dirname(fileURLToPath(new URL('.', import.meta.url)));
const componentsDir = path.join(root, 'components');
const outDir = path.join(root, 'dist', 'js');

const names = readdirSync(componentsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .filter((name) => existsSync(path.join(componentsDir, name, 'component.js')))
  .sort();

const reexports = names.map((name) => `export * from './${name}.js';`).join('\n') + '\n';
writeFileSync(path.join(outDir, 'index.js'), reexports);
writeFileSync(path.join(outDir, 'index.d.ts'), reexports);

console.log(`JS barrel: re-exporting ${names.length} component(s)`);
