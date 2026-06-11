# @fivenine/react

React wrappers for [fivenine ui](https://malikcornet.github.io/fivenine-ui/). Thin, zero-runtime
components over the framework-agnostic CSS and behavior in
[`@fivenine/ui`](https://www.npmjs.com/package/@fivenine/ui).

```sh
npm install @fivenine/react
```

## Usage

Styles ship separately in `@fivenine/ui` (a direct dependency of this package, so no extra
install) — import them once at your app root:

```css
@import "@fivenine/ui/all.css";
/* or granular: tokens.css + themes/*.css + css/<component>.css */
```

```tsx
import { Button, Dropdown, DropdownItem } from "@fivenine/react";

<Button variant="secondary">Save</Button>;
```

Per-component subpaths are also exported (`@fivenine/react/button`, `@fivenine/react/dropdown`),
though importing from the root is equally tree-shakable: the package is `sideEffects: false` and
compiled file-per-module, so bundlers drop everything you don't use.

## Requirements

- **React ≥ 19.** Components use React 19's `ref`-as-prop pattern instead of `forwardRef`.
- **ESM-only.** Untranspiled ES2022 modules; works in bundlers, Vite, and modern Node
  (`require(esm)` works on Node ≥ 20.19).

Source maps and declaration maps are published, so go-to-definition lands in the actual `.tsx`
source. Bundle-size budgets are enforced in CI with size-limit.

## License

[MIT](./LICENSE)
