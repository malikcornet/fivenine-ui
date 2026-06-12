# fivenine ui

A CSS + JS component library. One npm package — design tokens, component CSS, and small
framework-agnostic behavior modules — documented by an Astro site whose component pages
are MDX with live, iframed HTML examples. The site deploys versioned to GitHub Pages.

## Layout

```
library/                   @fivenine-collective/ui — tokens (Style Dictionary), component CSS, behavior JS (npm)
docs/                      Astro docs site (MDX component pages + standalone example pages)
  src/pages/{slug}.mdx     One MDX page per component: prose, code snippets, <Example> embeds
  src/pages/examples/      Standalone HTML example pages, one per component/variant
scripts/build-site.mjs     Assembles the versioned static site into dist-site/
.changeset/                Changesets config (release automation)
```

Design tokens live in `library/src/tokens/*.json` (base + light + dark);
`library/build-tokens.mjs` (Style Dictionary) generates `library/tokens/*.css` at build
time — edit the JSON, never the generated CSS.

## Examples

Every example is a standalone page at `/examples/{component}/{variant}/` (always
trailing-slashed — each route is a directory index, so no host redirects are involved),
e.g. `/examples/button/primary/`. The docs embed these pages in iframes via the
`<Example>` component, each with its own viewport switcher and light/dark toggle,
independent of the docs theme.

Example pages accept `?theme=light|dark` and `?dimensions=mobile|tablet|desktop`
(375px / 768px / full width) — a stable URL contract that browser tests can target too.
The shell implementing this contract ships in the library
(`@fivenine-collective/ui/example-frame`). Pages postMessage their content height
(including open overlays like dropdown menus) to the docs iframes and accept live
`{type:'fivenine:set'}` messages, so the docs switch theme/viewport without reloading
the frame. Variants that open overlays reserve space with the `minHeight` prop on
`<Example>`.

## Development

```sh
pnpm install
pnpm dev          # builds the library once, then library token watch + docs at http://localhost:5100/
```

Examples are part of the docs app, so editing an example hot-reloads inside the docs page.

Other commands:

```sh
pnpm build                    # build every package
pnpm build:docs               # build library + docs (the per-version build contract, see below)
pnpm build:site               # assemble the FULL versioned site into dist-site/ (latest + every tag)
pnpm lint:packages            # publint + arethetypeswrong (also runs in CI)
pnpm size                     # bundle-size budgets (also runs in CI)
pnpm changeset                # record a changeset alongside your change
```

## Adding a component

1. **Style it** — create `library/css/{slug}.css` wrapped in `@layer fivenine.components`,
   using `--fn-*` tokens only. Need a new token? Add it to `library/src/tokens/*.json`
   (all three files if it's semantic) and run `pnpm --filter @fivenine-collective/ui build`.
2. **Wire it up** — add the `@import` to `library/all.css` and a `./css/{slug}.css` entry
   to the `exports` map in `library/package.json`.
3. **Behavior JS** (only for interactive components — see dropdown): handwrite
   `library/js/{slug}.js` + `{slug}.d.ts`, re-export from `js/index.js`, add a
   `"./{slug}"` subpath export.
4. **Document it** — add `docs/src/pages/{slug}.mdx` (frontmatter: title, description,
   status) with prose and code snippets, plus one standalone example page per variant
   under `docs/src/pages/examples/{slug}/`, embedded with `<Example path="{slug}/{variant}" />`.
   The examples are rendered live in the docs and are the de-facto tests.
5. **Verify** — `pnpm dev` to see it in the docs. CI additionally runs publint/attw and
   the size-limit budget (configured in `library/package.json`) — bump the budget
   consciously if the component is genuinely heavy.
6. **Ship** — `pnpm changeset`, pick a bump, merge.

## Consuming the library

CSS and JS are tree-shakable: import everything, or only what you use.

```js
// everything
import '@fivenine-collective/ui/all.css';

// à la carte
import '@fivenine-collective/ui/tokens.css';
import '@fivenine-collective/ui/themes/light.css';
import '@fivenine-collective/ui/css/button.css';
import { attachDropdown } from '@fivenine-collective/ui/dropdown';
```

Without a bundler, use the pre-flattened `all.min.css` from a CDN and import behavior
modules directly:

```html
<link rel="stylesheet" href="https://unpkg.com/@fivenine-collective/ui/all.min.css" />
<script type="module">
  import { attachDropdown } from 'https://unpkg.com/@fivenine-collective/ui/js/dropdown.js';
</script>
```

## Versioning and releases

Releases are driven by [Changesets](https://github.com/changesets/changesets):

1. With each meaningful change, run `pnpm changeset` and pick a bump.
2. On push to `main`, the release workflow opens/updates a **Version Packages** PR that
   bumps the package and changelog.
3. Merging that PR publishes `@fivenine-collective/ui` to npm and tags the release
   (`@fivenine-collective/ui@X.Y.Z`).

npm auth is trusted publishing (OIDC) — no `NPM_TOKEN` secret; see the comments in
[release.yml](.github/workflows/release.yml) for the one-time bootstrap.

## The docs site is stateless

[docs.yml](.github/workflows/docs.yml) deploys the site as a GitHub Pages artifact (the
repository's Pages source must be **GitHub Actions** — there is no gh-pages branch). Every
deploy reproduces the whole site from git via `pnpm build:site`:

- `/` — latest docs, built from `main`
- `/<version>/` — one folder per release tag (0.2.0 and newer), each built **from its own
  tag's code** in a detached worktree with a frozen install, so old docs render that
  version's actual CSS/JS forever
- `/versions.json` — generated from the tag list; drives the in-page version switcher

Rules that keep this working:

- **The per-tag build contract is stable.** Every release tag must build with
  `pnpm install --frozen-lockfile` + `BASE_PATH=… DOCS_VERSION=… pnpm run build:docs`,
  producing `docs/dist`. Refactor internals freely; keep that interface.
- **Old docs are fixed via maintenance branches, not tags.** Push a branch
  `docs/<version>` cut from the release tag and the next deploy prefers it — release
  tags stay immutable.
- **A rotten old version never blocks a deploy.** Versions that fail to build are
  skipped with a warning and dropped from the switcher.

Deploys run on every push to `main`, after each publish, and on demand
(workflow_dispatch on docs.yml).
