import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Ensure Vite resolves index.html relative to this config file
  root: dirname(fileURLToPath(new URL(import.meta.url))),
  base: '/new/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});


