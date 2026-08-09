/**
 * Baut aus einem Vite-Produktionsbuild eine einzelne HTML-Datei.
 *
 * Hintergrund: Zum Ansehen und Teilen ist eine Datei ohne Server praktisch,
 * und gehostete Vorschauen mit strikter Content-Security-Policy laden keine
 * externen Dateien. JavaScript, CSS und Bilder wandern daher inline.
 *
 * Aufruf:
 *   node scripts/build-single.mjs <einstiegspunkt> <zieldatei>
 *
 * Beispiel:
 *   node scripts/build-single.mjs index ingtec-brandschutzkonzept-tool.html
 *
 * Voraussetzung: `EINZELBUILD=<einstiegspunkt> vite build` lief bereits.
 * Der Build muss genau einen Einstiegspunkt enthalten — sonst lagert Rollup
 * gemeinsamen Code in Chunks aus, die sich nicht einbetten lassen.
 */

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join, basename } from 'node:path';

const DIST = 'dist';
const einstieg = process.argv[2] ?? 'index';
const zielname = process.argv[3] ?? 'ingtec-anwendung.html';
const ZIEL = join(DIST, zielname);

/** Ersetzt Zeichen, die einen Inline-Script-Block vorzeitig beenden würden. */
function scriptSicher(code) {
  return code.replace(/<\/script>/gi, '<\\/script>').replace(/<!--/g, '<\\!--');
}

/** Maskiert Zeichen mit Sonderbedeutung in regulären Ausdrücken. */
function regexSicher(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const html = await readFile(join(DIST, `${einstieg}.html`), 'utf8');
const assets = await readdir(join(DIST, 'assets'));

// Die im Markup tatsächlich referenzierten Dateien bestimmen, statt zu raten:
// Ein Build kann mehrere Bündel enthalten, und das falsche einzubetten ergäbe
// eine Datei, die stillschweigend die andere Anwendung startet.
const jsTreffer = /<script[^>]*\ssrc="([^"]+)"[^>]*><\/script>/.exec(html);
const cssTreffer = /<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/.exec(html);
if (!jsTreffer || !cssTreffer) {
  throw new Error(
    `In dist/${einstieg}.html wurde kein Script- oder Stylesheet-Verweis gefunden — lief der Build?`,
  );
}

const jsDatei = basename(jsTreffer[1]);
const cssDatei = basename(cssTreffer[1]);

let js = await readFile(join(DIST, 'assets', jsDatei), 'utf8');
const css = await readFile(join(DIST, 'assets', cssDatei), 'utf8');

// Der Einstiegspunkt darf keine weiteren Bündel nachladen; sonst wäre die
// Einzeldatei unvollständig, ohne dass es auffiele.
const nachladen = /\bimport\s*\(\s*["'][^"']*\.js["']\s*\)|\bfrom\s*["']\.\/[^"']*\.js["']/.exec(js);
if (nachladen) {
  throw new Error(
    'Das Bündel lädt weitere Dateien nach. Bitte mit EINZELBUILD=<einstiegspunkt> genau eine Anwendung bauen.',
  );
}

// Verbliebene Asset-Verweise als Daten-URI einbetten. Gesucht wird nach dem
// Dateinamen samt beliebigem Pfadpräfix — Vite schreibt je nach `base` mal
// "./assets/…", mal "assets/…" oder einen berechneten Pfad.
for (const datei of assets) {
  if (datei === jsDatei || datei === cssDatei) continue;
  if (datei.endsWith('.js') || datei.endsWith('.css')) continue;

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
  js = js.replace(muster, () => dataUri);
}

// Ersetzt wird über Funktionen, nicht über Zeichenketten: In einer
// Ersatzzeichenkette hätten `$&`, `` $` `` und `$1` Sonderbedeutung, und
// minifizierter Code steckt voller Dollarzeichen — das würde ihn zerstören.
const ausgabe = html
  .replace(
    /<script[^>]*\ssrc="[^"]*"[^>]*><\/script>/,
    () => `<script type="module">\n${scriptSicher(js)}\n</script>`,
  )
  .replace(/<link[^>]*rel="stylesheet"[^>]*>/, () => `<style>\n${css}\n</style>`)
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
const offen = [...markup.matchAll(/(?:src|href)="(?!data:|#)([^"]+)"/g)].map((m) => m[1]);
if (offen.length > 0) {
  console.warn('Nicht eingebettete Verweise:', offen.join(', '));
} else {
  console.log('Alle Assets eingebettet — die Datei ist eigenständig.');
}
