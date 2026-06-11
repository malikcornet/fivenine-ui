# fivenine ui

A component library with one framework-agnostic core and three consumers: plain HTML, React,
and Blazor (WASM standalone). A custom docs site renders live examples from every target by
URL convention and deploys as a versioned static site to GitHub Pages.

## Layout

```
manifest/components.yaml   Source of truth: components, variants, per-target support
library/                   @fivenine/ui — tokens (Style Dictionary), component CSS, behavior JS (npm)
targets/
  html/                    Static example pages (Vite)
  react/                   @fivenine/react wrappers (npm) + examples app in examples/
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
(`@fivenine/ui/example-frame`) and is used by all three targets. Pages postMessage
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

## Consuming the library

CSS and JS are tree-shakable: import everything, or only what you use.

```js
// everything
import '@fivenine/ui/all.css';

// à la carte
import '@fivenine/ui/tokens.css';
import '@fivenine/ui/themes/light.css';
import '@fivenine/ui/css/button.css';
import { attachDropdown } from '@fivenine/ui/dropdown';
```

React (`@fivenine/react`) wrappers are ESM with per-component entry points
(`@fivenine/react/button`); import the CSS from `@fivenine/ui` yourself.

Blazor (`FiveNine.UI` on NuGet) ships the core assets as static web assets:

```html
<link rel="stylesheet" href="_content/FiveNine.UI/fivenine/all.css" />
```

## Versioning and releases

Releases are driven by [Changesets](https://github.com/changesets/changesets), in lockstep
across `@fivenine/ui`, `@fivenine/react`, and the `FiveNine.UI` NuGet package:

1. With each meaningful change, run `pnpm changeset` and pick a bump (the two npm packages
   are a fixed group, so they always move together).
2. On push to `main`, the release workflow opens/updates a **Version Packages** PR that
   bumps the packages and changelogs. `library/package.json` is the single version source:
   the Blazor csproj reads it via `Directory.Build.props` and the site build reads it for
   the version folder.
3. Merging that PR publishes to npm, packs/pushes NuGet (if `NUGET_API_KEY` is set),
   and deploys the versioned docs site to the `gh-pages` branch — old versions are kept
   and `versions.json` drives the docs version switcher.

Requires the `NPM_TOKEN` secret. Set the repository's Pages source to the `gh-pages`
branch. Run the workflow manually (workflow_dispatch) to redeploy the site without
publishing packages.
