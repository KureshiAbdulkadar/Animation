import { defineConfig } from 'vite';

export default defineConfig({
  // Use relative paths so deployment works on any subpath (like GitHub Pages)
  base: './',
  build: {
    outDir: 'dist',
  }
});
