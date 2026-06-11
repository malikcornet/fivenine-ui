import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { manifestSchema } from './conventions.mjs';

export { TARGETS, PORTS, pascal, examplePath, exampleUrlPath, manifestSchema } from './conventions.mjs';

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const manifestPath = path.join(repoRoot, 'manifest/components.yaml');

export function loadManifest() {
  const raw = fs.readFileSync(manifestPath, 'utf8');
  return manifestSchema.parse(parse(raw));
}

/** The lockstep version, owned by changesets via library/package.json. */
export function readVersion() {
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'library/package.json'), 'utf8'));
  return pkg.version;
}
