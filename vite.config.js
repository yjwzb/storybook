import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  publicDir: 'public',
  server: { host: '0.0.0.0', port: 5173, strictPort: false },
  preview: { host: '0.0.0.0', port: 4174, strictPort: false },
  build: { target: 'es2022', outDir: 'dist', assetsInlineLimit: 0, sourcemap: false },
  optimizeDeps: { include: ['three'] }
});
