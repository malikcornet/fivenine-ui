import { examplePath } from '../../scripts/lib/conventions.mjs';
import type { TargetId } from './manifest';

// Example sources are pulled straight from the target projects at build time.
// The glob patterns must be literals (vite requirement), but the lookup keys
// are derived from the shared examplePath() convention so they cannot drift
// from validate.mjs or the generator.

const sources: Record<TargetId, Record<string, string>> = {
  html: import.meta.glob('../../targets/html/examples/*/*/index.html', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>,
  react: import.meta.glob('../../targets/react/examples/src/examples/*/*.tsx', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>,
  blazor: import.meta.glob('../../targets/blazor/FiveNine.UI.Examples/Examples/*/*.razor', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>,
};

export function exampleSource(
  target: TargetId,
  component: string,
  variant: string,
): string | undefined {
  return sources[target][`../../${examplePath(target, component, variant)}`];
}
