// Builds the merged static site for GitHub Pages:
//
//   dist-site/
//     index.html          → redirects to <latest>/docs/
//     versions.json       → { latest, versions } for the docs version switcher
//     .nojekyll           → required: Blazor ships _framework/ (underscore dirs)
//     <version>/
//       index.html        → redirects to ./docs/
//       docs/             → Astro docs site (statically generated per component)
//       html/             → static example pages
//       react/            → examples SPA (+ per-route index.html copies)
//       blazor/           → published WASM app (+ per-route index.html copies)
//
// versions.json is MERGED with any existing dist-site/versions.json — in CI the
// release workflow seeds that file from the gh-pages branch so previously
// published versions stay listed (their folders are kept by keep_files).
//
// Usage: node scripts/build-site.mjs [--base /repo-name] [--out dist-site]

import { exec, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { loadManifest, readVersion, repoRoot } from './lib/manifest.mjs';

const execAsync = promisify(exec);

function arg(name, fallback) {
  const index = process.argv.indexOf(name);
  return index !== -1 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

// Site base: '' for user-root or custom-domain hosting, '/<repo>' for project pages.
const siteBase = arg('--base', '').replace(/\/$/, '');
const outDir = path.resolve(repoRoot, arg('--out', 'dist-site'));
const version = readVersion();
const manifest = loadManifest();
const versionDir = path.join(outDir, version);

function run(command, env = {}) {
  console.log(`\n$ ${command}`);
  execSync(command, { cwd: repoRoot, stdio: 'inherit', env: { ...process.env, ...env } });
}

// Runs builds concurrently; prints each build's output when it finishes.
async function runAll(commands) {
  const results = await Promise.allSettled(
    commands.map(({ command, env }) =>
      execAsync(command, {
        cwd: repoRoot,
        env: { ...process.env, ...env },
        maxBuffer: 32 * 1024 * 1024,
      }).then((output) => ({ command, ...output })),
    ),
  );
  let failed = false;
  results.forEach((result, i) => {
    const command = commands[i].command;
    if (result.status === 'fulfilled') {
      console.log(`\n$ ${command}\n✓ ok`);
    } else {
      failed = true;
      console.error(`\n$ ${command}\n✗ FAILED`);
      console.error(result.reason.stdout ?? '');
      console.error(result.reason.stderr ?? result.reason.message);
    }
  });
  if (failed) process.exit(1);
}

function basePathFor(target) {
  return `${siteBase}/${version}/${target}/`;
}

// For SPA targets on GitHub Pages there is no fallback routing, so copy the
// app shell into every conventional route directory. (URLs are always
// trailing-slashed — see exampleUrlPath in lib/conventions.mjs — so each
// directory index serves directly, no host redirect involved.)
function prerenderRoutes(targetDir, routes) {
  const shell = fs.readFileSync(path.join(targetDir, 'index.html'));
  for (const route of routes) {
    const routeDir = path.join(targetDir, route);
    fs.mkdirSync(routeDir, { recursive: true });
    fs.writeFileSync(path.join(routeDir, 'index.html'), shell);
  }
}

const exampleRoutes = (target) =>
  manifest.components
    .filter((component) => component.targets[target] !== 'planned')
    .flatMap((component) => component.variants.map((v) => `${component.slug}/${v.slug}`));

// --- build each project with its public base path ---------------------------

run('node scripts/validate.mjs');
run('pnpm --filter @fivenine-collective/ui build');
run('node scripts/sync-blazor-assets.mjs');
await runAll([
  { command: 'pnpm --filter @fivenine-collective/html-examples build', env: { BASE_PATH: basePathFor('html') } },
  { command: 'pnpm --filter @fivenine-collective/react-examples build', env: { BASE_PATH: basePathFor('react') } },
  { command: 'pnpm --filter @fivenine-collective/docs build', env: { BASE_PATH: `${siteBase}/${version}/docs/` } },
  { command: 'dotnet publish targets/blazor/FiveNine.UI.Examples -c Release -o targets/blazor/publish' },
]);

// --- assemble ----------------------------------------------------------------

fs.rmSync(versionDir, { recursive: true, force: true });
fs.mkdirSync(versionDir, { recursive: true });

fs.cpSync(path.join(repoRoot, 'targets/html/dist'), path.join(versionDir, 'html'), { recursive: true });
fs.cpSync(path.join(repoRoot, 'targets/react/examples/dist'), path.join(versionDir, 'react'), { recursive: true });
fs.cpSync(path.join(repoRoot, 'docs/dist'), path.join(versionDir, 'docs'), { recursive: true });
fs.cpSync(path.join(repoRoot, 'targets/blazor/publish/wwwroot'), path.join(versionDir, 'blazor'), { recursive: true });

// Blazor's <base href> is fixed in source for dev; point it at the hosted path.
const blazorIndex = path.join(versionDir, 'blazor/index.html');
const blazorHtml = fs.readFileSync(blazorIndex, 'utf8');
const rewritten = blazorHtml.replace('<base href="/blazor/" />', `<base href="${basePathFor('blazor')}" />`);
if (rewritten === blazorHtml) {
  throw new Error(
    'build-site: could not rewrite <base href="/blazor/" /> in the published Blazor index.html — ' +
      'the tag in targets/blazor/FiveNine.UI.Examples/wwwroot/index.html no longer matches.',
  );
}
fs.writeFileSync(blazorIndex, rewritten);

prerenderRoutes(path.join(versionDir, 'react'), exampleRoutes('react'));
prerenderRoutes(path.join(versionDir, 'blazor'), exampleRoutes('blazor'));

fs.writeFileSync(path.join(versionDir, 'index.html'), '<meta http-equiv="refresh" content="0; url=./docs/" />\n');

// --- site root: versions.json (merged), redirect, .nojekyll ------------------

const versionsFile = path.join(outDir, 'versions.json');
const existingVersions = fs.existsSync(versionsFile)
  ? (JSON.parse(fs.readFileSync(versionsFile, 'utf8')).versions ?? [])
  : [];
const localVersions = fs
  .readdirSync(outDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && /^\d+\.\d+\.\d+/.test(entry.name))
  .map((entry) => entry.name);
const versions = [...new Set([...existingVersions, ...localVersions, version])].sort((a, b) =>
  b.localeCompare(a, undefined, { numeric: true }),
);

fs.writeFileSync(versionsFile, `${JSON.stringify({ latest: version, versions }, null, 2)}\n`);
fs.writeFileSync(path.join(outDir, 'index.html'), `<meta http-equiv="refresh" content="0; url=./${version}/docs/" />\n`);
fs.writeFileSync(path.join(outDir, '.nojekyll'), '');

console.log(`\n✓ Site assembled at ${path.relative(repoRoot, outDir)} (version ${version}, base "${siteBase || '/'}")`);
console.log(`  versions.json: ${versions.join(', ')}`);
