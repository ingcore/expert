import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    // Bilder im Seitenrand (@page) lädt Chromium beim Drucken nur, wenn sie
    // eingebettet sind: Druckgrafiken immer als data-URL.
    assetsInlineLimit: (datei) =>
      datei.includes('/assets/druck/') ? true : undefined,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 5173,
  },
});
