import { bundle } from 'lightningcss';
import { existsSync, mkdirSync, readdirSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(new URL('.', import.meta.url)));
const componentsDir = path.join(root, 'components');
const outDir = path.join(root, 'dist', 'css');

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const names = readdirSync(componentsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .filter((name) => existsSync(path.join(componentsDir, name, 'component.css')))
  .sort();

const tokens = path.join(root, 'tokens.css');

// Lightning CSS bundles from a real file entry, resolving @import natively.
const emit = (name, filename) => {
  for (const minify of [false, true]) {
    const { code } = bundle({ filename, minify });
    writeFileSync(path.join(outDir, minify ? `${name}.min.css` : `${name}.css`), code);
  }
};

emit('tokens', tokens);
for (const name of names) emit(name, path.join(componentsDir, name, 'component.css'));

// Combined bundle, tokens first so components resolve against them.
const tmp = path.join(root, '.combined.css');
const sources = [tokens, ...names.map((n) => path.join(componentsDir, n, 'component.css'))];
writeFileSync(tmp, sources.map((f) => `@import ${JSON.stringify(f)};`).join('\n') + '\n');
try {
  emit('fivenine-ui', tmp);
} finally {
  unlinkSync(tmp);
}

console.log(`CSS: tokens + ${names.length} component(s) + combined (pretty + min)`);
