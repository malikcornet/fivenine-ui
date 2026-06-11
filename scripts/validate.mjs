// Validates the manifest schema and enforces the convention contract:
// every component/variant must have an example file in every target that
// claims support (status stable or beta), plus a core CSS file wired into
// all.css and exposed as a package.json subpath export.

import fs from 'node:fs';
import path from 'node:path';
import { TARGETS, examplePath, loadManifest, manifestPath, repoRoot } from './lib/manifest.mjs';

const errors = [];

let manifest;
try {
  manifest = loadManifest();
} catch (error) {
  console.error(`✗ ${path.relative(repoRoot, manifestPath)} failed schema validation:\n`);
  console.error(error.message);
  process.exit(1);
}

const libraryPkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'library/package.json'), 'utf8'));

const seenSlugs = new Set();
for (const component of manifest.components) {
  if (seenSlugs.has(component.slug)) {
    errors.push(`duplicate component slug "${component.slug}"`);
  }
  seenSlugs.add(component.slug);

  const seenVariants = new Set();
  for (const variant of component.variants) {
    if (seenVariants.has(variant.slug)) {
      errors.push(`${component.slug}: duplicate variant slug "${variant.slug}"`);
    }
    seenVariants.add(variant.slug);
  }

  const cssPath = `library/css/${component.slug}.css`;
  if (!fs.existsSync(path.join(repoRoot, cssPath))) {
    errors.push(`${component.slug}: missing core stylesheet ${cssPath}`);
  } else {
    const allCss = fs.readFileSync(path.join(repoRoot, 'library/all.css'), 'utf8');
    if (!allCss.includes(`./css/${component.slug}.css`)) {
      errors.push(`${component.slug}: library/all.css does not import ./css/${component.slug}.css`);
    }
    // CSS exports are enumerated (no wildcard), so each stylesheet must be
    // listed explicitly or consumers cannot import it.
    if (!libraryPkg.exports?.[`./css/${component.slug}.css`]) {
      errors.push(
        `${component.slug}: library/package.json exports is missing "./css/${component.slug}.css"`,
      );
    }
  }

  for (const target of TARGETS) {
    if (component.targets[target] === 'planned') continue;
    for (const variant of component.variants) {
      const file = examplePath(target, component.slug, variant.slug);
      const fullPath = path.join(repoRoot, file);
      if (!fs.existsSync(fullPath)) {
        errors.push(
          `${component.slug}/${variant.slug}: target "${target}" is ${component.targets[target]} but ${file} is missing`,
        );
        continue;
      }
      // Existence is not routability: Blazor routes are free-text @page
      // directives that must match the URL convention exactly.
      if (target === 'blazor') {
        const source = fs.readFileSync(fullPath, 'utf8');
        const expectedRoute = `@page "/${component.slug}/${variant.slug}"`;
        if (!source.includes(expectedRoute)) {
          errors.push(`${component.slug}/${variant.slug}: ${file} does not declare ${expectedRoute}`);
        }
      }
    }
  }
}

if (errors.length > 0) {
  console.error(`✗ Manifest validation failed with ${errors.length} error(s):\n`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

const componentCount = manifest.components.length;
const variantCount = manifest.components.reduce((sum, c) => sum + c.variants.length, 0);
console.log(`✓ Manifest valid: ${componentCount} component(s), ${variantCount} variant(s), all example files present.`);
