# fivenine-ui

A CSS-first UI component library with optional JavaScript behaviors.

## Structure

Shared design tokens live in `tokens.css` at the repo root; each component lives in `components/<name>/`:

```
tokens.css               # shared custom properties (colors, radii, ...)
components/button/
├── component.css        # the component's styles — reference tokens as bare var(--fn-x);
│                        # tokens.css is a required import
├── component.js         # optional behavior (ESM class with explicit init)
├── <variant>.html       # a variant's markup sample, rendered/shown by the docs
└── <variant>.md         # prose for that variant — owns the title and body, no
                         # embedded code blocks; paired with the .html by basename
```

Variant filenames are only identifiers for pairing `.html` with `.md` — titles and all
display text come from the markdown itself.

## Installation

```sh
npm install fivenine-ui
```

## Usage

### CSS

Import `tokens.css` once (it carries the shared theme variables every component
references), then import only the components you use (tree shaking by subtraction):

```js
import 'fivenine-ui/css/tokens.css';
import 'fivenine-ui/css/button.css';
```

Or everything at once:

```js
import 'fivenine-ui/css';
```

Without a build step, link the combined stylesheet from a CDN:

```html
<link rel="stylesheet" href="https://unpkg.com/fivenine-ui/dist/css/fivenine-ui.min.css" />
```

### JavaScript

Components that need behavior export a class. Import from the root (tree-shakeable) or from the component's own subpath:

```js
import { Button } from 'fivenine-ui';        // barrel, bundlers tree-shake unused components
import { Button } from 'fivenine-ui/button'; // direct, no bundler analysis needed

const [button] = Button.initAll();
button.setLoading(true);
```

Without a build step, use the CDN bundles:

```html
<!-- classic script: everything under the FiveNine global -->
<script src="https://unpkg.com/fivenine-ui/dist/cdn/fivenine-ui.iife.js"></script>
<script>
  FiveNine.Button.initAll();
</script>

<!-- or as a module -->
<script type="module">
  import { Button } from 'https://unpkg.com/fivenine-ui/dist/cdn/fivenine-ui.js';
  Button.initAll();
</script>
```

## Development

```sh
npm install
npm run build
```

The build discovers every folder in `components/` and emits to `dist/`:

- **CSS** — [Lightning CSS](https://lightningcss.dev/) (`scripts/build-css.mjs`):
  - `dist/css/tokens.css` + `.min.css` — shared design tokens
  - `dist/css/<name>.css` + `.min.css` — per component
  - `dist/css/fivenine-ui.css` + `.min.css` — combined, tokens first
- **JS + types** — [tsdown](https://tsdown.dev/) (`tsdown.config.ts`):
  - `dist/js/<name>.js` + `<name>.d.ts` — per-component ESM with type declarations
  - `dist/js/index.js` + `index.d.ts` — barrel re-exporting all components
  - `dist/cdn/fivenine-ui.iife.js` — minified IIFE exposing the `FiveNine` global
  - `dist/cdn/fivenine-ui.js` — minified single-file ESM for `<script type="module">`

The JS barrel (`components/index.js`) is generated at build time and gitignored.
Components without a `component.js` are CSS-only and simply don't appear in the JS outputs.
