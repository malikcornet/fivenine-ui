// Copies the core library's distributable files into the Blazor RCL's wwwroot
// so they ship inside the FiveNine.UI NuGet package as static web assets
// (served from _content/FiveNine.UI/fivenine/). Run before any dotnet build.

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { repoRoot } from './lib/manifest.mjs';

const source = path.join(repoRoot, 'library');

// The token CSS is generated; rebuild it if missing or older than its sources.
const tokensCss = path.join(source, 'tokens/tokens.css');
const tokensStale =
  !fs.existsSync(tokensCss) ||
  fs
    .readdirSync(path.join(source, 'src/tokens'))
    .some((file) => fs.statSync(path.join(source, 'src/tokens', file)).mtimeMs > fs.statSync(tokensCss).mtimeMs);
if (tokensStale) {
  execSync('pnpm --filter @fivenine/ui build', { cwd: repoRoot, stdio: 'inherit' });
}
const destination = path.join(repoRoot, 'targets/blazor/FiveNine.UI/wwwroot/fivenine');

fs.rmSync(destination, { recursive: true, force: true });
fs.mkdirSync(destination, { recursive: true });

for (const entry of ['all.css', 'tokens', 'css', 'js']) {
  fs.cpSync(path.join(source, entry), path.join(destination, entry), { recursive: true });
}

console.log(`✓ Synced core assets into ${path.relative(repoRoot, destination)}`);
