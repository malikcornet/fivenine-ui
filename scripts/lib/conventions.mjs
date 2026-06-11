// The single home for every cross-package convention: target list, dev ports,
// slug casing, example file paths, example URL paths, and the manifest schema.
// Consumed by the node scripts, the docs site (build time), the generator, and
// the vite/astro configs. Browser-safe: no node imports.

import { z } from 'zod';

export const TARGETS = ['html', 'react', 'blazor'];

// Dev server ports. launchSettings.json (Blazor) duplicates its port because
// MSBuild cannot read this file — keep them in sync.
export const PORTS = {
  docs: 5100,
  html: 5101,
  react: 5102,
  blazor: 5103,
};

const slugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const statusSchema = z.enum(['stable', 'beta', 'planned']);

export const manifestSchema = z.object({
  components: z.array(
    z.object({
      name: z.string().min(1),
      slug: z.string().regex(slugPattern, 'slug must be kebab-case'),
      description: z.string().min(1),
      status: statusSchema,
      targets: z.object({
        html: statusSchema,
        react: statusSchema,
        blazor: statusSchema,
      }),
      variants: z
        .array(
          z.object({
            slug: z.string().regex(slugPattern, 'variant slug must be kebab-case'),
            title: z.string().min(1),
            description: z.string().min(1),
            // Reserved iframe height in the docs (px), for examples that open
            // overlays (dropdowns, popovers) taller than their resting state.
            minHeight: z.number().int().positive().optional(),
          }),
        )
        .min(1),
    }),
  ),
});

export function pascal(slug) {
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/** Conventional path (relative to the repo root) of an example's source file. */
export function examplePath(target, componentSlug, variantSlug) {
  switch (target) {
    case 'html':
      return `targets/html/examples/${componentSlug}/${variantSlug}/index.html`;
    case 'react':
      return `targets/react/examples/src/examples/${componentSlug}/${variantSlug}.tsx`;
    case 'blazor':
      return `targets/blazor/FiveNine.UI.Examples/Examples/${pascal(componentSlug)}/${pascal(variantSlug)}.razor`;
    default:
      throw new Error(`Unknown target: ${target}`);
  }
}

/** Conventional URL path of a rendered example, relative to the site root.
 *  Always trailing-slashed: every target serves a directory index, so no host
 *  redirect is needed and query params survive on any static host. */
export function exampleUrlPath(target, componentSlug, variantSlug) {
  return `${target}/${componentSlug}/${variantSlug}/`;
}
