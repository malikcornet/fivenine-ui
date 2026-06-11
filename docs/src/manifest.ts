import { parse } from 'yaml';
import raw from '../../manifest/components.yaml?raw';
// Validated at docs build time with the same zod schema the scripts use, so a
// manifest/schema drift fails the build instead of rendering wrong pages.
import { manifestSchema, TARGETS as TARGET_IDS } from '../../scripts/lib/conventions.mjs';

export type TargetId = 'html' | 'react' | 'blazor';
export type Status = 'stable' | 'beta' | 'planned';

export interface Variant {
  slug: string;
  title: string;
  description: string;
  /** Reserved iframe height (px) for examples that open overlays. */
  minHeight?: number;
}

export interface Component {
  name: string;
  slug: string;
  description: string;
  status: Status;
  targets: Record<TargetId, Status>;
  variants: Variant[];
}

export const TARGETS = TARGET_IDS as TargetId[];

export const manifest = manifestSchema.parse(parse(raw)) as { components: Component[] };
