# @fivenine/ui

Framework-agnostic core of [fivenine ui](https://malikcornet.github.io/fivenine-ui/): design
tokens, component CSS, and small behavior modules. Framework wrappers (e.g.
[`@fivenine/react`](https://www.npmjs.com/package/@fivenine/react)) build on top of this package.

```sh
npm install @fivenine/ui
```

## Usage

Everything at once (tokens, light + dark themes, every component):

```css
@import "@fivenine/ui/all.css";
```

A pre-flattened, minified copy of the same bundle ships as `@fivenine/ui/all.min.css` — use it
when loading from a CDN or without a CSS bundler (no `@import` waterfall).

For the smallest output, import only what you use:

```css
@import "@fivenine/ui/tokens.css";        /* primitives + light defaults on :root */
@import "@fivenine/ui/themes/dark.css";   /* optional [data-theme="dark"] overrides */
@import "@fivenine/ui/css/button.css";    /* one file per component */
```

Behavior modules are plain ESM with types, importable per component:

```js
import { attachDropdown } from "@fivenine/ui/dropdown";
```

## Cascade layers

All styles live in the `fivenine` cascade layer (sublayers `fivenine.tokens`, `fivenine.themes`,
`fivenine.base`, `fivenine.components`). Unlayered application CSS always beats layered CSS, so
overriding any component style needs no extra specificity:

```css
.fn-btn { border-radius: 0; } /* wins — no !important, no specificity games */
```

To pin the order explicitly (only needed if you import granular files in unusual orders), declare
`@layer fivenine.tokens, fivenine.themes, fivenine.base, fivenine.components;` before the imports —
`all.css` already does this.

## Module format

This package is ESM-only and ships untranspiled ES2022. Bundlers, Vite, and modern Node
(`require(esm)` works on Node ≥ 20.19) consume it directly. CSS is declared via `sideEffects`,
so JS imports tree-shake cleanly while CSS imports are never pruned.

## License

[MIT](./LICENSE)
