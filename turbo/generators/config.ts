import fs from 'node:fs';
import path from 'node:path';
import type { PlopTypes } from '@turbo/gen';
// Single source of truth for slug casing and example file paths — the same
// module validate.mjs and the docs use, so generated files always land where
// the rest of the pipeline expects them.
import { examplePath, pascal } from '../../scripts/lib/conventions.mjs';

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

interface Answers {
  slug: string;
  name: string;
  description: string;
  variants: string;
  turbo: { paths: { root: string } };
}

// name/description/titles are emitted via the yamlString helper (JSON-quoted,
// which is valid YAML), so user text with ':', '#', or quotes cannot corrupt
// the manifest.
const MANIFEST_ENTRY = `  - name: {{{yamlString name}}}
    slug: {{slug}}
    description: {{{yamlString description}}}
    status: beta
    targets:
      html: beta
      react: beta
      blazor: beta
    variants:
{{#each variantList}}
      - slug: {{this}}
        title: {{{yamlString (variantTitle this)}}}
        description: {{{yamlString (todoDescription this)}}}
{{/each}}`;

export default function generator(plop: PlopTypes.NodePlopAPI): void {
  plop.setHelper('pascal', (slug: string) => pascal(slug));
  plop.setHelper('yamlString', (value: string) => JSON.stringify(value));
  plop.setHelper('todoDescription', (variant: string) => `TODO: describe the ${variant} variant.`);
  plop.setHelper('variantTitle', (slug: string) =>
    slug
      .split('-')
      .map((part, index) => (index === 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
      .join(' '),
  );

  // Appends a rendered template to an existing file, unless `unlessPattern`
  // (a rendered regex, multiline) already matches — anchored, so "button"
  // cannot false-match "button-group". Keeps the generator re-runnable.
  plop.setActionType('append-to-file', (answers, config) => {
    const data = answers as Answers & Record<string, unknown>;
    const { file, template, unlessPattern } = config as unknown as {
      file: string;
      template: string;
      unlessPattern: string;
    };
    const filePath = path.join(data.turbo.paths.root, file);
    const content = fs.readFileSync(filePath, 'utf8');
    if (new RegExp(plop.renderString(unlessPattern, data), 'm').test(content)) {
      return `unchanged: ${file}`;
    }
    fs.writeFileSync(filePath, `${content.trimEnd()}\n${plop.renderString(template, data)}\n`);
    return `appended to: ${file}`;
  });

  // CSS subpath exports are enumerated in library/package.json (no wildcard,
  // so the public API surface stays explicit). Insert the new component's
  // entry, keeping "./package.json" last by convention.
  plop.setActionType('add-css-export', (answers) => {
    const data = answers as Answers;
    const pkgPath = path.join(data.turbo.paths.root, 'library/package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const subpath = `./css/${data.slug}.css`;
    if (pkg.exports[subpath]) return 'unchanged: library/package.json';
    const entries = Object.entries(pkg.exports).filter(([key]) => key !== './package.json');
    entries.push([subpath, subpath], ['./package.json', './package.json']);
    pkg.exports = Object.fromEntries(entries);
    fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
    return `added ${subpath} export to: library/package.json`;
  });

  plop.setGenerator('component', {
    description: 'Scaffold a component across the manifest, core library, and all targets',
    prompts: [
      {
        type: 'input',
        name: 'slug',
        message: 'Component slug (kebab-case):',
        validate: (value: string) => KEBAB.test(value) || 'Must be kebab-case (e.g. "badge").',
      },
      {
        type: 'input',
        name: 'name',
        message: 'Display name:',
        default: (answers: { slug: string }) => pascal(answers.slug),
      },
      {
        type: 'input',
        name: 'description',
        message: 'Description:',
        default: 'TODO: describe this component.',
      },
      {
        type: 'input',
        name: 'variants',
        message: 'Variants (comma-separated slugs):',
        default: 'basic',
        validate: (value: string) =>
          value
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean)
            .every((v) => KEBAB.test(v)) || 'Each variant must be kebab-case.',
      },
    ],
    actions: (data) => {
      const answers = data as Answers;
      const root = '{{ turbo.paths.root }}';
      const slug = answers.slug;
      const variants = answers.variants
        .split(',')
        .map((variant) => variant.trim())
        .filter(Boolean);

      const actions: PlopTypes.ActionType[] = [
        {
          type: 'append-to-file',
          file: 'manifest/components.yaml',
          // Component slug lines are indented 4 spaces (variant slugs are
          // deeper), so this only matches a component with exactly this slug.
          unlessPattern: '^    slug: {{slug}}$',
          template: MANIFEST_ENTRY,
          data: { variantList: variants },
        },
        {
          type: 'add',
          path: `${root}/library/css/{{slug}}.css`,
          templateFile: 'templates/component.css.hbs',
          skipIfExists: true,
        },
        {
          type: 'append-to-file',
          file: 'library/all.css',
          unlessPattern: '^@import "\\./css/{{slug}}\\.css";$',
          template: '@import "./css/{{slug}}.css";',
        },
        {
          type: 'add-css-export',
        },
        {
          type: 'add',
          path: `${root}/targets/react/src/{{pascal slug}}.tsx`,
          templateFile: 'templates/react-wrapper.tsx.hbs',
          skipIfExists: true,
        },
        {
          type: 'append-to-file',
          file: 'targets/react/src/index.ts',
          unlessPattern: "from '\\./{{pascal slug}}\\.js';$",
          template:
            "export { {{pascal slug}}, type {{pascal slug}}Props } from './{{pascal slug}}.js';",
        },
        {
          type: 'add',
          path: `${root}/targets/blazor/FiveNine.UI/{{pascal slug}}.razor`,
          templateFile: 'templates/blazor-wrapper.razor.hbs',
          skipIfExists: true,
        },
      ];

      for (const variant of variants) {
        for (const target of ['html', 'react', 'blazor'] as const) {
          const templates = {
            html: 'templates/example.html.hbs',
            react: 'templates/example.tsx.hbs',
            blazor: 'templates/example.razor.hbs',
          };
          actions.push({
            type: 'add',
            path: `${root}/${examplePath(target, slug, variant)}`,
            templateFile: templates[target],
            data: { variant },
            skipIfExists: true,
          });
        }
      }

      return actions;
    },
  });
}
