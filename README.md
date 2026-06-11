# fivenine ui

A component library with one framework-agnostic core and three consumers: plain HTML, React,
and Blazor (WASM standalone). A custom docs site renders live examples from every target by
URL convention and deploys as a versioned static site to GitHub Pages.

## Layout

```
manifest/components.yaml   Source of truth: components, variants, per-target support
library/                   @fivenine-collective/ui — tokens (Style Dictionary), component CSS, behavior JS (npm)
targets/
  html/                    Static example pages (Vite)
  react/                   @fivenine-collective/react wrappers (npm) + examples app in examples/
  blazor/                  FiveNine.UI Razor class lib (NuGet) + one WASM examples host
docs/                      Custom Astro docs site (statically generated, no Storybook)
turbo/generators/          turbo gen templates for scaffolding components
scripts/                   validate, build-site, version/asset sync
.changeset/                Changesets config (release automation)
```

Design tokens live in `library/src/tokens/*.json` (base + light + dark);
`library/build-tokens.mjs` (Style Dictionary) generates `library/tokens/*.css` at build
time — edit the JSON, never the generated CSS.

## The URL convention

Every target serves every example at `/{target}/{component}/{variant}/` (always
trailing-slashed — each route is a directory index, so no host redirects are involved)
on a bare page, e.g. `/react/button/disabled/`. All conventions — target list, dev
ports, slug casing, example file paths, URL paths, and the manifest schema — live in
one module, [scripts/lib/conventions.mjs](scripts/lib/conventions.mjs), consumed by the
scripts, the docs build, the generator, and the vite configs. Example sources live at
conventional paths so the docs can show the code:

| target | example source path |
| ------ | ------------------- |
| html   | `targets/html/examples/{component}/{variant}/index.html` |
| react  | `targets/react/examples/src/examples/{component}/{variant}.tsx` |
| blazor | `targets/blazor/FiveNine.UI.Examples/Examples/{Component}/{Variant}.razor` |

`pnpm validate` enforces this: every variant of every component must have an example file
in every target whose manifest status is `stable` or `beta` (`planned` shows a placeholder
in the docs instead).

Example pages accept `?theme=light|dark` and `?dimensions=mobile|tablet|desktop`
(375px / 768px / full width) — a stable URL contract that browser tests can target too.
The shell implementing this contract ships once in the core library
(`@fivenine-collective/ui/example-frame`) and is used by all three targets. Pages postMessage
their content height (including open overlays like dropdown menus) to the docs iframes
and accept live `{type:'fivenine:set'}` messages, so the docs switch theme/viewport
without reloading the frame (Blazor's runtime never re-boots). Variants that open
overlays can reserve space with `minHeight` in the manifest. In the docs, every example
has its own viewport switcher and light/dark toggle, independent of the docs theme.

## Development

```sh
pnpm install
pnpm dev          # all targets + docs, with hot reload
```

| app    | port | url |
| ------ | ---- | --- |
| docs   | 5100 | http://localhost:5100/docs/ |
| html   | 5101 | http://localhost:5101/html/ |
| react  | 5102 | http://localhost:5102/react/ |
| blazor | 5103 | http://localhost:5103/blazor/ |

In dev, the docs point example iframes directly at the target dev servers (ports above),
so editing an example hot-reloads inside the docs page. On the published site all targets
are served from sibling folders on one origin instead.

Other commands:

```sh
pnpm validate                 # manifest schema + convention checks (also runs in CI)
pnpm build                    # build every package (turbo)
pnpm build:site               # assemble the full static site into dist-site/
pnpm new:component            # scaffold a component (interactive, via turbo gen)
pnpm changeset                # record a changeset alongside your change
```

## Adding a component

```sh
pnpm new:component
```

The generator prompts for a kebab-case slug, display name, description, and variant list,
then scaffolds the whole convention surface in one pass: the manifest entry (status `beta`
for all targets), `library/css/{slug}.css` (pre-wrapped in `@layer fivenine.components`),
the `@import` in `all.css`, the `./css/{slug}.css` export in `library/package.json`, the
React wrapper + its `index.ts` export, the Blazor wrapper, and one example file per
variant per target. It is re-runnable: existing files are left untouched.

Then fill in the blanks:

1. **Style it** — edit `library/css/{slug}.css` using `--fn-*` tokens only. Need a new
   token? Add it to `library/src/tokens/*.json` (all three themes if it's semantic) and
   run `pnpm --filter @fivenine-collective/ui build`.
2. **Implement the wrappers** — the generated React stub is a `div` passthrough in
   `targets/react/src/{Pascal}.tsx` (keep relative imports suffixed `.js` — the build
   targets native ESM); the Blazor stub is `targets/blazor/FiveNine.UI/{Pascal}.razor`.
3. **Write the examples** — they're rendered live in the docs and are the de-facto tests.
4. **Behavior JS** (only for interactive components — see dropdown): handwrite
   `library/js/{slug}.js` + `{slug}.d.ts`, re-export from `js/index.js`, add a
   `"./{slug}"` entry to the library `exports` map, and import it in wrappers via the
   subpath (`@fivenine-collective/ui/{slug}`). The generator does not scaffold this part.
5. **Verify** — `pnpm validate` (manifest ↔ files ↔ exports contract), `pnpm dev` to see
   it in the docs. CI additionally runs publint/attw and the size-limit budgets
   (1–3 kB, configured in the two package.jsons) — bump a budget consciously if the
   component is genuinely heavy.
6. **Ship** — `pnpm changeset`, pick a bump, merge.

Manifest knobs: set a target to `planned` to defer it (validate allows the missing
example; the docs show a placeholder), and give a variant `minHeight` if it opens an
overlay that needs reserved iframe space.

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

React (`@fivenine-collective/react`) wrappers are ESM with per-component entry points
(`@fivenine-collective/react/button`); import the CSS from `@fivenine-collective/ui` yourself.

Blazor (`FiveNine.UI` on NuGet) ships the core assets as static web assets:

```html
<link rel="stylesheet" href="_content/FiveNine.UI/fivenine/all.css" />
```

## Versioning and releases

Releases are driven by [Changesets](https://github.com/changesets/changesets), in lockstep
across `@fivenine-collective/ui`, `@fivenine-collective/react`, and the `FiveNine.UI` NuGet package:

1. With each meaningful change, run `pnpm changeset` and pick a bump (the two npm packages
   are a fixed group, so they always move together).
2. On push to `main`, the release workflow opens/updates a **Version Packages** PR that
   bumps the packages and changelogs. `library/package.json` is the single version source:
   the Blazor csproj reads it via `Directory.Build.props` and the site build reads it for
   the version folder.
3. Merging that PR publishes to npm, packs/pushes NuGet (if `NUGET_API_KEY` is set),
   and deploys the versioned docs site to the `gh-pages` branch — old versions are kept
   and `versions.json` drives the docs version switcher.

npm auth is trusted publishing (OIDC) — no `NPM_TOKEN` secret; see the comments in
[release.yml](.github/workflows/release.yml) for the one-time per-package bootstrap.
The repository's Pages source must be the `gh-pages` branch. Run the workflow manually
(workflow_dispatch) to redeploy the site without publishing packages.
