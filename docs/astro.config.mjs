import mdx from '@astrojs/mdx';
import { defineConfig } from 'astro/config';

export default defineConfig({
  // Standalone dev serves at /; the versioned site build passes
  // BASE_PATH=/<repo>/<version>/.
  base: process.env.BASE_PATH ?? '/',
  trailingSlash: 'ignore',
  integrations: [mdx()],
  markdown: {
    shikiConfig: { theme: 'github-dark-dimmed' },
  },
  server: { port: 5100 },
});
