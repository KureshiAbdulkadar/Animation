import { defineConfig } from 'vite';

export default defineConfig({
  // Use relative paths so deployment works on any subpath (like GitHub Pages)
  base: './',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: './index.html',
        nodejsParticles: './nodejs-particles.html',
        halftoneWaves: './halftone-waves.html',
        kineticGrid: './kinetic-grid.html',
        pixelCascade: './pixel-cascade.html',
        constellation: './constellation.html',
        ghosting: './ghosting.html',
        pixelArt: './pixel-art.html'
      }
    }
  }
});
