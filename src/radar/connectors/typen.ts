/**
 * Connector-Architektur — PRD Abschnitt 33.
 *
 * Jeder Connector implementiert dieselbe Schnittstelle:
 *
 *     search() · getListing() · getImages() · getSeller() · normalize() · detectChanges()
 *
 * Der Zweck ist in Abschnitt 33 klar benannt: „Dadurch kann eine Plattform
 * ersetzt oder deaktiviert werden, ohne das Gesamtsystem zu verändern." Und in
 * Abschnitt 51 steht der Grund — Plattformen ändern ihre Schnittstellen, und
 * das Produkt darf daran nicht scheitern.
 *
 * Die Rohnutzlast ist bewusst `Record<string, unknown>` und nicht typisiert.
 * Sie kommt von außen; eine Typdeklaration wäre eine Behauptung über fremde
 * Daten, die jederzeit falsch werden kann. Stattdessen liest `normalize()` sie
 * über die Lesehilfen unten defensiv aus — jedes Feld einzeln, jedes fehlende
 * Feld als `null` und nicht als Rateergebnis.
 */

import type {
  Aenderung,
  Antrieb,
  Belegart,
  Bild,
  Getriebe,
  InseratDaten,
  Plattform,
  Servicehistorie,
  Unfallangabe,
  Verkaeuferart,
} from '../domain/types';
import { vergleiche } from '../engine/historie';

/** Suchkriterien eines Connector-Laufs. */
export interface Suchkriterien {
  hersteller?: string[];
  /** Freitextbegriffe, die im Titel vorkommen sollen. */
  begriffe?: string[];
  preisMax?: number;
  preisMin?: number;
  kilometerMax?: number;
  baujahrMin?: number;
  laender?: string[];
}

/** Unveränderte Nutzlast, wie die Plattform sie liefert. */
export interface RohInserat {
  plattformId: string;
  externeId: string;
  url: string;
  /** Zeitpunkt des Abrufs. */
  abgerufenAm: string;
  nutzlast: Record<string, unknown>;
}

export interface RohBild {
  url: string;
  position: number;
  phash: string;
  aufgenommen: string | null;
  merkmale: string[];
  auffaelligkeiten: Bild['auffaelligkeiten'];
}

export interface RohVerkaeufer {
  externeId: string;
  name: string;
  art: string;
  ort: string;
  land: string;
  identitaetBelegt: boolean;
  seitJahr: number | null;
  bewertung: number | null;
  anzahlInserate: number;
}

export interface Connector {
  plattform: Plattform;
  /** Sucht Inserate nach Kriterien. */
  search(kriterien: Suchkriterien): Promise<RohInserat[]>;
  /** Holt ein einzelnes Inserat, etwa für die Inseratprüfung per URL (§6.3). */
  getListing(externeId: string): Promise<RohInserat | null>;
  getImages(externeId: string): Promise<RohBild[]>;
  getSeller(externeId: string): Promise<RohVerkaeufer | null>;
  /** Überführt die Rohnutzlast in das Datenmodell der Anwendung. */
  normalize(roh: RohInserat, bilder: RohBild[]): InseratDaten;
  /** Erkennt Änderungen zwischen zwei normalisierten Ständen. */
  detectChanges(alt: InseratDaten, neu: InseratDaten, zeitpunkt: string): Aenderung[];
}

/* ==========================================================================
 * Lesehilfen für fremde Nutzlasten
 * ======================================================================= */

export function lesText(n: Record<string, unknown>, schluessel: string): string | null {
  const wert = n[schluessel];
  if (typeof wert === 'string' && wert.trim().length > 0) return wert.trim();
  if (typeof wert === 'number') return String(wert);
  return null;
}

/**
 * Liest eine Zahl aus beliebig formatiertem Text.
 *
 * Deckt ab, was in der Praxis vorkommt: `39900`, `"39.900"`, `"€ 39.900,-"`,
 * `"91.100 km"`, `"1.234,50"`. Der Punkt ist im deutschsprachigen Raum
 * Tausendertrenner, das Komma Dezimaltrenner — die naive Auswertung mit
 * `parseFloat` liest aus „39.900" die Zahl 39,9 und ist damit unbrauchbar.
 */
export function lesZahl(n: Record<string, unknown>, schluessel: string): number | null {
  const wert = n[schluessel];
  if (typeof wert === 'number') return Number.isFinite(wert) ? wert : null;
  if (typeof wert !== 'string') return null;

  const bereinigt = wert.replace(/[^\d.,-]/g, '');
  if (bereinigt.length === 0) return null;

  // Letztes Trennzeichen entscheidet: Steht danach eine Gruppe von genau drei
  // Ziffern, war es ein Tausendertrenner; sonst ein Dezimaltrenner.
  const letzterPunkt = bereinigt.lastIndexOf('.');
  const letztesKomma = bereinigt.lastIndexOf(',');
  const letzter = Math.max(letzterPunkt, letztesKomma);

  let zahl: string;
  if (letzter === -1) {
    zahl = bereinigt;
  } else {
    const nachkomma = bereinigt.length - letzter - 1;
    const trenner = bereinigt[letzter];
    if (nachkomma === 3 && trenner === '.') {
      zahl = bereinigt.replace(/\./g, '');
    } else {
      zahl = bereinigt.slice(0, letzter).replace(/[.,]/g, '') + '.' + bereinigt.slice(letzter + 1);
    }
  }

  const ergebnis = Number.parseFloat(zahl.replace(/(?!^)-/g, ''));
  return Number.isFinite(ergebnis) ? ergebnis : null;
}

export function lesListe(n: Record<string, unknown>, schluessel: string): string[] {
  const wert = n[schluessel];
  if (Array.isArray(wert)) return wert.filter((x): x is string => typeof x === 'string');
  if (typeof wert === 'string') {
    return wert
      .split(/[;,|]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  return [];
}

export function lesJaNein(
  n: Record<string, unknown>,
  schluessel: string,
): boolean | null {
  const wert = n[schluessel];
  if (typeof wert === 'boolean') return wert;
  if (typeof wert !== 'string') return null;
  if (/^(ja|yes|true|1)$/i.test(wert.trim())) return true;
  if (/^(nein|no|false|0)$/i.test(wert.trim())) return false;
  return null;
}

/** `03/2010`, `2010-03`, `03.2010`, `2010` → `2010-03` bzw. `2010-01`. */
export function lesMonat(n: Record<string, unknown>, schluessel: string): string | null {
  const text = lesText(n, schluessel);
  if (!text) return null;

  let treffer = /^(\d{1,2})[./](\d{4})$/.exec(text);
  if (treffer) return `${treffer[2]}-${treffer[1].padStart(2, '0')}`;

  treffer = /^(\d{4})-(\d{1,2})/.exec(text);
  if (treffer) return `${treffer[1]}-${treffer[2].padStart(2, '0')}`;

  treffer = /^(\d{4})$/.exec(text);
  if (treffer) return `${treffer[1]}-01`;

  return null;
}

export function kwZuPs(kw: number | null): number | null {
  if (kw === null) return null;
  return Math.round(kw * 1.35962);
}

/* ==========================================================================
 * Zuordnung freier Texte auf die Aufzählungstypen der Anwendung
 * ======================================================================= */

export function alsGetriebe(text: string | null): Getriebe {
  if (!text) return 'unbekannt';
  const t = text.toLowerCase();
  if (/(dkg|doppelkupplung|s-?tronic|pdk|dsg|dct)/.test(t)) return 'doppelkupplung';
  if (/(schalt|manuell|manual|handschalt)/.test(t)) return 'handschalter';
  if (/(automat|tiptronic|steptronic|wandler)/.test(t)) return 'automatik';
  return 'unbekannt';
}

export function alsAntrieb(text: string | null): Antrieb {
  if (!text) return 'unbekannt';
  const t = text.toLowerCase();
  if (/(allrad|quattro|xdrive|4matic|awd|4wd|carrera\s*4)/.test(t)) return 'allrad';
  if (/(heck|rwd|hinterrad)/.test(t)) return 'heck';
  if (/(front|fwd|vorderrad)/.test(t)) return 'front';
  return 'unbekannt';
}

export function alsVerkaeuferart(text: string | null): Verkaeuferart {
  if (!text) return 'unbekannt';
  const t = text.toLowerCase();
  if (/(händler|haendler|dealer|gewerblich|commercial)/.test(t)) return 'haendler';
  if (/(privat|private)/.test(t)) return 'privat';
  if (/(auktion|auction)/.test(t)) return 'auktionshaus';
  return 'unbekannt';
}

export function alsServicehistorie(text: string | null): Servicehistorie {
  if (!text) return 'unbekannt';
  const t = text.toLowerCase();
  if (/(lückenlos|luckenlos|scheckheft|voll|full|komplett)/.test(t)) return 'lueckenlos';
  if (/(teil|partial|einige)/.test(t)) return 'teilweise';
  if (/(kein|none|nicht vorhanden)/.test(t)) return 'keine';
  return 'unbekannt';
}

/**
 * Unfallangabe aus dem Plattformtext.
 *
 * Die Reihenfolge der Prüfungen ist wesentlich: „unfallfrei laut Vorbesitzer"
 * enthält „unfallfrei" und würde bei falscher Reihenfolge als Zusicherung
 * gelesen — genau der Unterschied, den Abschnitt 13 zum Kernthema macht.
 */
export function alsUnfallangabe(text: string | null): Unfallangabe {
  if (!text) return 'keine-angabe';
  const t = text.toLowerCase();
  if (/laut\s+(vor)?besitzer|nach\s+angabe/.test(t) && /unfallfrei/.test(t)) {
    return 'unfallfrei-laut-vorbesitzer';
  }
  if (/(unfallschaden|unrepariert|nicht\s+repariert|beschädigt)/.test(t)) return 'unfallschaden';
  if (/(vorschaden|repariert|instandgesetzt)/.test(t)) return 'vorschaden-repariert';
  if (/unfallfrei|accident.?free/.test(t)) return 'unfallfrei';
  return 'keine-angabe';
}

const BELEGARTEN: Belegart[] = [
  'serviceheft',
  'digitale-servicehistorie',
  'rechnung',
  'pickerlbericht',
  'tuev-bericht',
  'gutachten',
  'zulassungshistorie',
  'importdokument',
  'motorrechnung',
  'getrieberechnung',
  'messprotokoll',
  'vorbesitzerunterlagen',
  'kaufvertrag',
  'diagnosebericht',
];

/**
 * Filtert die von der Plattform genannten Unterlagen auf bekannte Belegarten.
 *
 * Unbekannte Bezeichnungen werden verworfen und nicht geraten: Eine falsch
 * zugeordnete Belegart würde im Evidence Score eine Deckung vortäuschen, die
 * es nicht gibt.
 */
export function alsBelegarten(werte: string[]): Belegart[] {
  const treffer = werte
    .map((w) => w.trim().toLowerCase())
    .map((w) => BELEGARTEN.find((b) => b === w))
    .filter((b): b is Belegart => b !== undefined);
  return [...new Set(treffer)];
}

/** Standardimplementierung von `detectChanges` für alle Connectoren. */
export function standardDetectChanges(
  alt: InseratDaten,
  neu: InseratDaten,
  zeitpunkt: string,
): Aenderung[] {
  return vergleiche(alt, neu, zeitpunkt);
}

/** Wandelt Rohbilder in Bilder des Datenmodells. */
export function alsBilder(roh: RohBild[], praefix: string): Bild[] {
  return roh.map((b, i) => ({
    id: `${praefix}-bild-${i + 1}`,
    url: b.url,
    position: b.position,
    phash: b.phash,
    aufgenommen: b.aufgenommen,
    merkmale: b.merkmale,
    auffaelligkeiten: b.auffaelligkeiten,
  }));
}
