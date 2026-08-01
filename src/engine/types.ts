/**
 * Typen der Regel-Engine.
 *
 * Die Engine bestimmt, *was* gilt (LP-1). Jede Anforderung trägt einen
 * maschinenlesbaren Quellenverweis bis zur Normstelle (LP-3, FR-2.3), und
 * jeder ausgegebene Wert stammt aus einem Ergebnis dieser Engine (LP-2).
 */

import type { JsonLogic } from './jsonlogic';

/* ==========================================================================
 * Quellenverweis
 * ======================================================================= */

/**
 * Verweis auf die Normstelle. Richtlinie, Ausgabe, Punkt, Tabelle und Zeile
 * sind einzeln erfasst, damit der Verweis maschinell auflösbar bleibt und im
 * UI bis zum Normtext anklickbar ist (FR-4.4).
 */
export interface Quellenverweis {
  /** z. B. "OIB-RL 2" oder "K-BO 1996". */
  richtlinie: string;
  /** Ausgabestand, z. B. "2023-05". */
  ausgabe: string;
  /** Punktnummer, z. B. "3.1.2". */
  punkt: string;
  /** Tabellennummer innerhalb des Punktes, sofern einschlägig. */
  tabelle?: string;
  /** Zeilenbezeichnung innerhalb der Tabelle. */
  zeile?: string;
  /** Seitenzahl im Originaldokument, für den Nachweis. */
  seite?: number;
}

/** Kurzform des Verweises für Fließtext und Tabellen. */
export function quelleKurz(q: Quellenverweis): string {
  const teile = [`${q.richtlinie} (${q.ausgabe})`, `Pkt. ${q.punkt}`];
  if (q.tabelle) teile.push(`Tab. ${q.tabelle}`);
  if (q.zeile) teile.push(q.zeile);
  return teile.join(', ');
}

/* ==========================================================================
 * Anforderungsmatrix
 * ======================================================================= */

/** Bauteil- bzw. Themenkategorie einer Anforderung. */
export type AnforderungBauteil =
  | 'tragwerk'
  | 'trennwand'
  | 'decke'
  | 'treppenhaus'
  | 'schacht'
  | 'aussenwand'
  | 'dach'
  | 'tuer'
  | 'durchfuehrung'
  | 'fluchtweg'
  | 'loeschhilfe'
  | 'loeschwasser'
  | 'anlagentechnik'
  | 'organisation';

/** Geschosslage, für die eine Anforderung gilt. */
export type Geschosslage = 'oberirdisch' | 'unterirdisch' | 'alle';

/** Art des geforderten Sollwerts. */
export type SollArt =
  | 'feuerwiderstand' // Klasse nach EN 13501-2, z. B. "REI90"
  | 'laenge' // Meter
  | 'breite' // Meter
  | 'flaeche' // m²
  | 'menge' // l/min, Stück, LE
  | 'ja-nein' // Vorhandensein gefordert
  | 'text'; // qualitative Anforderung

/**
 * Eine Anforderung der Matrix. `bedingung` ist ein JSON-Logic-Ausdruck über
 * dem Gebäudekontext und liegt als Datum vor, nicht als Code (LP-5).
 */
export interface Anforderung {
  /** Stabile ID, z. B. "oib2-2023-3.1.2-tragwerk-ob". */
  id: string;
  bauteil: AnforderungBauteil;
  geschosslage: Geschosslage;
  /** Kurzbezeichnung für Matrix und Dokument. */
  bezeichnung: string;
  /** Bedingung, unter der die Anforderung greift. */
  bedingung: JsonLogic;
  sollArt: SollArt;
  /**
   * Geforderter Wert. Bei `feuerwiderstand` die Klasse, bei numerischen Arten
   * ein JSON-Logic-Ausdruck oder eine Zahl, bei `ja-nein` true.
   */
  soll: JsonLogic;
  /** Einheit für die Anzeige, z. B. "m", "m²", "l/min". */
  einheit?: string;
  quelle: Quellenverweis;
  /** Fachliche Erläuterung; erscheint als Hilfetext, nicht im Konzepttext. */
  erlaeuterung?: string;
  /**
   * Kontextfelder, die zur Auswertung vorhanden sein müssen. Fehlen sie,
   * entsteht eine Datenlücke statt eines stillen Fehlurteils (FR-2.8).
   */
  benoetigt?: string[];
  /**
   * Kennung einander ausschließender Regelvarianten — etwa die vier
   * Gebäudeklassen-Varianten derselben Anforderung. Greifen mehrere
   * Anforderungen derselben Gruppe gleichzeitig, liegt ein echter
   * Regelkonflikt vor (FR-2.7).
   *
   * Ohne Gruppe findet keine Konfliktprüfung statt: Zwei verschiedene
   * Anforderungen an dasselbe Bauteil (Trennwand EI 60 gegenüber
   * Brandabschnittswand REI 90) sind kein Widerspruch, sondern zwei Regeln.
   */
  konfliktgruppe?: string;
}

/* ==========================================================================
 * Bundesland-Overlay
 * ======================================================================= */

/** Kennung der neun österreichischen Bundesländer. */
export type Bundesland = 'W' | 'NOe' | 'OOe' | 'S' | 'T' | 'V' | 'St' | 'K' | 'B';

export const BUNDESLAENDER: { code: Bundesland; name: string }[] = [
  { code: 'W', name: 'Wien' },
  { code: 'NOe', name: 'Niederösterreich' },
  { code: 'OOe', name: 'Oberösterreich' },
  { code: 'S', name: 'Salzburg' },
  { code: 'T', name: 'Tirol' },
  { code: 'V', name: 'Vorarlberg' },
  { code: 'St', name: 'Steiermark' },
  { code: 'K', name: 'Kärnten' },
  { code: 'B', name: 'Burgenland' },
];

/** Wirkung eines Overlays auf eine Anforderung. */
export type OverlayWirkung = 'ersetzt' | 'ergaenzt' | 'entfaellt';

/**
 * Landesrechtliche Regel, die eine OIB-Anforderung überschreibt, ergänzt oder
 * aufhebt. Overlays werden im Ergebnis gekennzeichnet (FR-2.4).
 */
export interface Overlay {
  id: string;
  bundesland: Bundesland;
  /** ID der betroffenen Anforderung. */
  anforderungId: string;
  wirkung: OverlayWirkung;
  /** Zusätzliche Bedingung; fehlt sie, greift das Overlay immer. */
  bedingung?: JsonLogic;
  /** Neuer Sollwert bei `ersetzt`. */
  soll?: JsonLogic;
  /** Ergänzender Hinweis bei `ergaenzt`. */
  hinweis?: string;
  quelle: Quellenverweis;
}

/* ==========================================================================
 * Ergebnis der Auswertung
 * ======================================================================= */

/**
 * Erfüllungsstatus einer Anforderung.
 * `datenluecke` und `konflikt` sind ausdrücklich keine Bewertung, sondern
 * Klärungsbedarf (FR-2.7, FR-2.8).
 */
export type ErgebnisStatus =
  | 'erfuellt'
  | 'nicht-erfuellt'
  | 'abweichung' // als Abweichung dokumentiert und begründet
  | 'datenluecke' // Eingabe fehlt, Beurteilung nicht möglich
  | 'konflikt' // widersprüchliche Regeln
  | 'nicht-anwendbar';

/**
 * Confidence-Ampel nach PRD Abschnitt 12.3. Sie ist von der Quellenampel des
 * INGTEC-Inspect-Modells getrennt und bezeichnet die Herkunft einer Aussage.
 */
export type Ampel =
  | 'gruen' // aus der Regel-Engine, deterministisch belegt
  | 'gelb' // KI- bzw. schablonenformuliert auf Basis grüner Fakten
  | 'rot'; // Auslegungsfrage oder Abweichung, Sachverständigenprüfung zwingend

export interface AnforderungsErgebnis {
  /** Verweis auf die zugrunde liegende Anforderung. */
  anforderungId: string;
  bauteil: AnforderungBauteil;
  geschosslage: Geschosslage;
  bezeichnung: string;
  sollArt: SollArt;
  /** Aufgelöster Sollwert. */
  sollWert: string | number | boolean | null;
  /** Im Projekt erfasster Istwert; null, wenn nicht erhoben. */
  istWert: string | number | boolean | null;
  einheit?: string;
  status: ErgebnisStatus;
  ampel: Ampel;
  quelle: Quellenverweis;
  /** Gesetzt, wenn ein Bundesland-Overlay gewirkt hat (FR-2.4). */
  overlay?: {
    bundesland: Bundesland;
    wirkung: OverlayWirkung;
    hinweis?: string;
    quelle: Quellenverweis;
  };
  /** Fehlende Kontextfelder bei `datenluecke`. */
  fehlendeAngaben?: string[];
  /** Erläuterung des Befunds im Klartext. */
  begruendung: string;
}

/* ==========================================================================
 * Gebäudeklassenableitung
 * ======================================================================= */

/** Ein Schritt der Ableitung, für die schrittweise Darstellung (FR-2.9). */
export interface AbleitungsSchritt {
  nr: number;
  frage: string;
  wert: string;
  ergebnis: string;
  quelle: Quellenverweis;
}

export interface GebaeudeklassenErgebnis {
  /** Ermittelte Klasse; null, wenn die Eingaben nicht ausreichen. */
  klasse: 'GK1' | 'GK2' | 'GK3' | 'GK4' | 'GK5' | null;
  schritte: AbleitungsSchritt[];
  /** Fehlende Angaben, die eine Ermittlung verhindern. */
  fehlendeAngaben: string[];
  /** Zusätzliche Hinweise, etwa auf OIB-RL 2.3 bei Hochhäusern. */
  hinweise: string[];
}

/* ==========================================================================
 * Gesamtergebnis
 * ======================================================================= */

export interface MatrixErgebnis {
  gebaeudeklasse: GebaeudeklassenErgebnis;
  ergebnisse: AnforderungsErgebnis[];
  /** Anforderungen, deren Beurteilung an fehlenden Eingaben scheitert. */
  datenluecken: AnforderungsErgebnis[];
  /** Widersprüchliche Regeln, die eine Klärung erfordern. */
  konflikte: AnforderungsErgebnis[];
  /** Ausgabestand, gegen den ausgewertet wurde. */
  ausgabe: string;
  bundesland: Bundesland;
  /** Zeitpunkt der Auswertung. */
  ausgewertetAm: string;
}
