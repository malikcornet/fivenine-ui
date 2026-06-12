// Assembles the full static docs site, statelessly, from git — no deploy-time
// state, every run reproduces the whole site:
//
//   dist-site/
//     (root)            → latest docs, built from the current working tree
//     <version>/        → docs per release tag, each built from its own code
//                         (so examples render that version's actual CSS/JS)
//     versions.json     → { latest, versions } for the docs version switcher
//
// Release tags are `@fivenine-collective/ui@X.Y.Z` (created by changesets).
// Each version builds in a detached git worktree with a frozen install. The
// per-tag build contract — KEEP THIS INTERFACE STABLE ACROSS RELEASES — is:
//
//   pnpm install --frozen-lockfile
//   BASE_PATH=<base>/<version>/ DOCS_VERSION=<version> pnpm run build:docs
//   → site appears in docs/dist
//
// A maintenance branch `docs/<version>` (cut from the tag) is preferred over
// the tag when it exists, so an old version's docs can be fixed without
// touching the immutable release tag.
//
// A version that fails to build is skipped with a warning and left out of
// versions.json — one rotten old tag must never block deploying current docs.
//
// Usage: node scripts/build-site.mjs [--base /repo-name] [--out dist-site] [--latest-only]

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const TAG_PREFIX = '@fivenine-collective/ui@';
// Tags older than this predate the standalone docs app (the multi-target era)
// and cannot build under the contract above.
const FIRST_DOCS_VERSION = '0.2.0';

function arg(name, fallback) {
  const index = process.argv.indexOf(name);
  return index !== -1 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

// Site base: '' for user-root or custom-domain hosting, '/<repo>' for project pages.
const siteBase = arg('--base', '').replace(/\/$/, '');
const outDir = path.resolve(repoRoot, arg('--out', 'dist-site'));
const latestOnly = process.argv.includes('--latest-only');

function run(file, args, { cwd = repoRoot, env = {} } = {}) {
  console.log(`\n$ ${file} ${args.join(' ')}${cwd !== repoRoot ? `  (in ${cwd})` : ''}`);
  execFileSync(file, args, { cwd, stdio: 'inherit', env: { ...process.env, ...env } });
}

function git(args, opts = {}) {
  return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8', ...opts }).trim();
}

const semverDesc = (a, b) => b.localeCompare(a, undefined, { numeric: true });

// --- latest, from the working tree ----------------------------------------------

run('pnpm', ['run', 'build:docs'], { env: { BASE_PATH: `${siteBase}/` } });
fs.rmSync(outDir, { recursive: true, force: true });
fs.cpSync(path.join(repoRoot, 'docs/dist'), outDir, { recursive: true });

// --- released versions, one worktree per tag -------------------------------------

const built = [];
const failed = [];

if (!latestOnly) {
  const releaseVersions = git(['tag', '-l', `${TAG_PREFIX}*`])
    .split('\n')
    .filter(Boolean)
    .map((tag) => tag.slice(TAG_PREFIX.length))
    .filter((v) => v.localeCompare(FIRST_DOCS_VERSION, undefined, { numeric: true }) >= 0)
    .sort(semverDesc);

  for (const version of releaseVersions) {
    let ref = `${TAG_PREFIX}${version}`;
    try {
      git(['rev-parse', '--verify', '--quiet', `origin/docs/${version}`], { stdio: 'pipe' });
      ref = `origin/docs/${version}`; // prefer a maintenance branch when one exists
    } catch {}

    console.log(`\n--- ${version} (from ${ref}) ---`);
    const worktree = fs.mkdtempSync(path.join(os.tmpdir(), `fivenine-docs-${version}-`));
    try {
      run('git', ['worktree', 'add', '--force', '--detach', worktree, ref]);
      run('pnpm', ['install', '--frozen-lockfile'], { cwd: worktree });
      run('pnpm', ['run', 'build:docs'], {
        cwd: worktree,
        env: { BASE_PATH: `${siteBase}/${version}/`, DOCS_VERSION: version },
      });
      fs.cpSync(path.join(worktree, 'docs/dist'), path.join(outDir, version), {
        recursive: true,
      });
      built.push(version);
    } catch (error) {
      failed.push(version);
      console.error(`✗ ${version} failed to build — skipped (${error.message})`);
    } finally {
      try {
        run('git', ['worktree', 'remove', '--force', worktree]);
      } catch {
        fs.rmSync(worktree, { recursive: true, force: true });
      }
    }
  }
}

// --- versions.json ----------------------------------------------------------------

const latest = JSON.parse(
  fs.readFileSync(path.join(repoRoot, 'library/package.json'), 'utf8'),
).version;
fs.writeFileSync(
  path.join(outDir, 'versions.json'),
  `${JSON.stringify({ latest, versions: built }, null, 2)}\n`,
);

console.log(`\n✓ Site assembled at ${path.relative(repoRoot, outDir)} (base "${siteBase || '/'}")`);
console.log(`  latest: ${latest}${latestOnly ? ' (latest only)' : ''}`);
if (built.length > 0) console.log(`  versions: ${built.join(', ')}`);
if (failed.length > 0) console.warn(`  ⚠ failed and skipped: ${failed.join(', ')}`);
