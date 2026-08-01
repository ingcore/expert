/**
 * INGTEC-Dateibenennungs- und Berichtsnummernschema.
 *
 *   YYMMDD_KD-XXXX_ARTNR
 *   ARTNR = ING-<GB>-<FB>-<AN>-<LA>-<SEQ>
 *
 * Beispiel: 260720_KD-0219_ING-BS-BAU-ALL-FB-001
 *
 * Die Berichtsnummer im Deckblatt und in der Fußzeile entspricht demselben
 * String ohne Dateiendung.
 */

import type { Berichtsnummer, Projekt } from './types';

/** Normalisiert eine Kundennummer auf 4 Stellen mit führenden Nullen. */
export function normalisiereKundennummer(eingabe: string): string {
  const ziffern = eingabe.replace(/\D/g, '');
  if (!ziffern) return '';
  return ziffern.slice(-4).padStart(4, '0');
}

/** Normalisiert die laufende Nummer auf 3 Stellen. */
export function normalisiereSequenz(eingabe: string): string {
  const ziffern = eingabe.replace(/\D/g, '');
  if (!ziffern) return '001';
  return ziffern.slice(-3).padStart(3, '0');
}

/** Formatiert ein ISO-Datum (YYYY-MM-DD) als YYMMDD. */
export function datumsPrefix(isoDatum: string): string {
  const d = new Date(isoDatum);
  if (Number.isNaN(d.getTime())) return '000000';
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
}

/** Baut die Artikelnummer ING-GB-FB-AN-LA-SEQ. */
export function artikelnummer(b: Berichtsnummer): string {
  const anlage = (b.anlage || 'ALL').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return [
    'ING',
    b.geschaeftsbereich,
    b.fachbereich,
    anlage || 'ALL',
    b.leistungsart,
    normalisiereSequenz(b.sequenz),
  ].join('-');
}

/**
 * Baut die vollständige Berichtsnummer (= Dateiname ohne Endung).
 * Diese Zeichenkette erscheint auf dem Deckblatt und in jeder Fußzeile.
 */
export function berichtsnummerString(projekt: Projekt): string {
  const datum = datumsPrefix(projekt.datum);
  const kdnr = normalisiereKundennummer(projekt.auftraggeber.kundennummer);
  return `${datum}_KD-${kdnr || '0000'}_${artikelnummer(projekt.berichtsnummer)}`;
}

/** Dateiname inklusive Endung. */
export function dateiname(projekt: Projekt, endung = 'docx'): string {
  return `${berichtsnummerString(projekt)}.${endung}`;
}

/** SharePoint-Ordnerstruktur je Kunde laut INGTEC-Ablage. */
export const SHAREPOINT_ORDNER = [
  '1_Akquise- Auftrag',
  '2_Dokumente- Bescheide',
  '3_Pläne- Schema',
  '4_Fotos- Checklisten',
  '5_Berichte- Begehungen',
  '6_Aushang- Kennzeichnungen',
] as const;

/** Zielordner für den fertigen Bericht. */
export const BERICHTS_ORDNER = '5_Berichte- Begehungen';
