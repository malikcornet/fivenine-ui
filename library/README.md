# @fivenine-collective/ui

[fivenine ui](https://malikcornet.github.io/fivenine-ui/): design tokens, component CSS,
and small framework-agnostic behavior modules. Plain CSS classes and ESM functions — no
framework required, usable from any framework.

```sh
npm install @fivenine-collective/ui
```

## Usage

Everything at once (tokens, light + dark themes, every component):

```css
@import "@fivenine-collective/ui/all.css";
```

A pre-flattened, minified copy of the same bundle ships as `@fivenine-collective/ui/all.min.css` — use it
when loading from a CDN or without a CSS bundler (no `@import` waterfall).

For the smallest output, import only what you use:

```css
@import "@fivenine-collective/ui/tokens.css";        /* primitives + light defaults on :root */
@import "@fivenine-collective/ui/themes/dark.css";   /* optional [data-theme="dark"] overrides */
@import "@fivenine-collective/ui/css/button.css";    /* one file per component */
```

Behavior modules are plain ESM with types, importable per component:

```js
import { attachDropdown } from "@fivenine-collective/ui/dropdown";
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
