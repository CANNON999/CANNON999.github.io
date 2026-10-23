import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://cannon999.github.io',
  output: 'static',
  trailingSlash: 'always',
  devToolbar: { enabled: false },
});
