import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

/**
 * Zwei Anwendungen in einem Projekt:
 *
 *   index.html  INGTEC Brandschutzkonzept-Tool  (src/)
 *   radar.html  INGTEC Automotive Asset Radar   (src/radar/)
 *
 * Sie teilen sich Abhängigkeiten und die Design-Tokens aus `src/styles/`,
 * sind fachlich aber vollständig getrennt.
 *
 * `EINZELBUILD=index|radar` baut nur eine der beiden Anwendungen. Das ist die
 * Voraussetzung für den Einzeldatei-Build: Bei zwei Einstiegspunkten lagert
 * Rollup den gemeinsamen Code in eigene Chunks aus, die sich nicht mehr in
 * eine Datei einbetten lassen.
 */
const nurEine = process.env.EINZELBUILD;

const einstiegspunkte: Record<string, string> = {
  index: fileURLToPath(new URL('./index.html', import.meta.url)),
  radar: fileURLToPath(new URL('./radar.html', import.meta.url)),
};

const input =
  nurEine && einstiegspunkte[nurEine]
    ? { [nurEine]: einstiegspunkte[nurEine] }
    : einstiegspunkte;

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: { input },
  },
  server: {
    host: true,
    port: 5173,
  },
});
