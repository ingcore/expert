/**
 * Baut aus dem Vite-Produktionsbuild eine einzelne HTML-Datei.
 *
 * Hintergrund: Zum Ansehen und Teilen ist eine Datei ohne Server praktisch,
 * und gehostete Vorschauen mit strikter Content-Security-Policy laden keine
 * externen Dateien. JavaScript, CSS und Bilder wandern daher inline.
 *
 * Voraussetzung: `vite build` lief bereits, `dist/` ist aktuell.
 */

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const DIST = 'dist';
const ZIEL = 'dist/ingtec-brandschutzkonzept-tool.html';

/** Ersetzt Zeichen, die einen Inline-Script-Block vorzeitig beenden würden. */
function scriptSicher(code) {
  return code
    .replace(/<\/script>/gi, '<\\/script>')
    .replace(/<!--/g, '<\\!--');
}

const html = await readFile(join(DIST, 'index.html'), 'utf8');
const assets = await readdir(join(DIST, 'assets'));

const jsDatei = assets.find((f) => f.endsWith('.js'));
const cssDatei = assets.find((f) => f.endsWith('.css'));
if (!jsDatei || !cssDatei) {
  throw new Error('JS- oder CSS-Bundle nicht gefunden — lief `vite build`?');
}

let js = await readFile(join(DIST, 'assets', jsDatei), 'utf8');
const css = await readFile(join(DIST, 'assets', cssDatei), 'utf8');

/** Maskiert Zeichen mit Sonderbedeutung in regulären Ausdrücken. */
function regexSicher(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Verbliebene Asset-Verweise als Daten-URI einbetten. Gesucht wird nach dem
// Dateinamen samt beliebigem Pfadpräfix — Vite schreibt je nach `base` mal
// "./assets/…", mal "assets/…" oder einen berechneten Pfad.
for (const datei of assets) {
  if (datei === jsDatei || datei === cssDatei) continue;

  const inhalt = await readFile(join(DIST, 'assets', datei));
  const typ = datei.endsWith('.svg')
    ? 'image/svg+xml'
    : datei.endsWith('.png')
      ? 'image/png'
      : datei.endsWith('.jpg') || datei.endsWith('.jpeg')
        ? 'image/jpeg'
        : 'application/octet-stream';
  const dataUri = `data:${typ};base64,${inhalt.toString('base64')}`;

  const muster = new RegExp(`(?:[./\\w-]*/)?${regexSicher(datei)}`, 'g');
  const vorher = js;
  js = js.replace(muster, () => dataUri);
  if (js === vorher) {
    console.warn(`Verweis auf ${datei} nicht gefunden — bleibt extern.`);
  }
}

// Ersetzt wird über Funktionen, nicht über Zeichenketten: In einer
// Ersatzzeichenkette hätten `$&`, `` $` `` und `$1` Sonderbedeutung, und
// minifizierter Code steckt voller Dollarzeichen — das würde ihn zerstören.
const ausgabe = html
  .replace(
    /<script[^>]*\ssrc="[^"]*"[^>]*><\/script>/,
    () => `<script type="module">\n${scriptSicher(js)}\n</script>`,
  )
  .replace(
    /<link[^>]*rel="stylesheet"[^>]*>/,
    () => `<style>\n${css}\n</style>`,
  )
  // Vorlade-Hinweise zeigen auf Dateien, die es in der Einzeldatei nicht
  // mehr gibt, und liefen sonst ins Leere.
  .replace(/<link[^>]*rel="(?:modulepreload|preload)"[^>]*>\s*/g, '');

await writeFile(ZIEL, ausgabe, 'utf8');

const kb = (Buffer.byteLength(ausgabe) / 1024).toFixed(0);
console.log(`${ZIEL} — ${kb} KB`);

// Verbliebene externe Verweise melden, statt sie stillschweigend zu übergehen.
// Geprüft wird nur das Markup: Im gebündelten Code stehen Dateinamen als
// harmlose Zeichenketten, die nichts nachladen.
const markup = ausgabe
  .replace(/<script[\s\S]*?<\/script>/g, '')
  .replace(/<style[\s\S]*?<\/style>/g, '');
const offen = [...markup.matchAll(/(?:src|href)="(?!data:|#)([^"]+)"/g)].map(
  (m) => m[1],
);
if (offen.length > 0) {
  console.warn('Nicht eingebettete Verweise:', offen.join(', '));
} else {
  console.log('Alle Assets eingebettet — die Datei ist eigenständig.');
}
