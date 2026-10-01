/**
 * Technisches Kernmodell des Prüfbefund-Moduls (PRD Abschnitt 17).
 *
 * Die Excel-Datenbanken `Kundendatenbank` und `Anlagendatenbank` werden damit
 * in relationale Stammdaten überführt (PRD 20).
 */

import type {
  AssetStatus,
  FindingSeverity,
  FindingStatus,
  FindingType,
  InspectionTypeId,
  ItemResult,
  LegalResult,
  ReportStatus,
  RuleCategory,
} from './enums';
import type { AssetFamily } from './families';
import type { PflichtStatus } from './legal/applicability';

/* ==========================================================================
 * Kunde und Standort
 * ======================================================================= */

export interface Customer {
  id: string;
  /** Kundennummer nach INGTEC-Schema, z. B. "KD-1042". */
  kundennummer: string;
  name: string;
  strasse: string;
  plz: string;
  ort: string;
  ansprechpartner?: string;
  telefon?: string;
  email?: string;
}

export interface Site {
  id: string;
  customerId: string;
  bezeichnung: string;
  strasse: string;
  plz: string;
  ort: string;
}

/* ==========================================================================
 * Arbeitsmittel
 * ======================================================================= */

export interface Asset {
  /** Eindeutige `asset_id`. */
  id: string;
  customerId: string;
  siteId: string;
  /** Genauer Aufstellungsort innerhalb des Standortes. */
  aufstellungsort: string;
  inventarnummer: string;
  familie: AssetFamily;
  bauart: string;
  /** Interne Bezeichnung des Betreibers. */
  bezeichnung: string;
  hersteller: string;
  type: string;
  /** Serien- bzw. Herstellnummer. */
  seriennummer: string;
  baujahr: number | null;
  /** Datum der Inbetriebnahme, soweit bekannt. */
  inbetriebnahme: string | null;
  /** Hinweis auf das Foto des Typenschildes (Dateiname bzw. Attachment-ID). */
  typenschildFoto: string | null;
  /** Optionale QR-Kennung für die Erfassung vor Ort. */
  qrId: string | null;
  status: AssetStatus;
  /** Typabhängige technische Eigenschaften nach Schema der Familie. */
  attribute: Record<string, unknown>;
  erstelltAm: string;
  geaendertAm: string;
}

/* ==========================================================================
 * Prüfgrundlagen einer Prüfung
 * ======================================================================= */

/**
 * Eine konkret herangezogene Prüfgrundlage. Kategorie, Ausgabe,
 * Anwendungsgrund und Verbindlichkeitsgrund werden getrennt geführt
 * (PRD 8 Schritt 3, PRD 13).
 */
export interface Pruefgrundlage {
  id: string;
  kategorie: RuleCategory;
  /** Bezeichnung, z. B. "ÖNORM EN 12453" oder "Bescheid GZ 123/2019". */
  bezeichnung: string;
  /** Ausgabe bzw. Fassung. Fehlt sie bei Normen, entsteht eine Warnung. */
  ausgabe: string;
  anwendungsgrund: string;
  verbindlichkeitsgrund: string;
  /** Verweis auf den Katalogeintrag, soweit vorhanden. */
  regelRef?: string;
}

/* ==========================================================================
 * Checkliste
 * ======================================================================= */

/** Herkunft eines Prüfpunktes (PRD 8, Schritt 5). */
export type PruefpunktHerkunft =
  | 'GESETZ'
  | 'ARBEITSMITTEL'
  | 'NORM'
  | 'HERSTELLER'
  | 'PROJEKT';

export const HERKUNFT_LABEL: Record<PruefpunktHerkunft, string> = Object.freeze({
  GESETZ: 'gesetzlicher Mindestprüfinhalt',
  ARBEITSMITTEL: 'arbeitsmittelspezifischer Prüfpunkt',
  NORM: 'normativer Prüfpunkt',
  HERSTELLER: 'Herstelleranforderung',
  PROJEKT: 'projektspezifischer Prüfpunkt',
});

export interface InspectionItem {
  id: string;
  /** Verweis auf den Katalogprüfpunkt bzw. den gesetzlichen Prüfinhalt. */
  katalogRef: string;
  herkunft: PruefpunktHerkunft;
  /** Abschnittsüberschrift in der Checkliste. */
  abschnitt: string;
  text: string;
  ergebnis: ItemResult | null;
  bemerkung: string;
  /** Optionaler Messwert mit Einheit. */
  messwert?: string;
  foto?: string;
  /** Verknüpfung zu einem Mangel. */
  findingId?: string;
}

/* ==========================================================================
 * Mängel
 * ======================================================================= */

export interface Finding {
  id: string;
  /** Laufende Nummer innerhalb der Prüfung. */
  nummer: number;
  typ: FindingType;
  beschreibung: string;
  /** Bauteil bzw. Ort des Mangels. */
  bauteil: string;
  /** Technische Grundlage, auf der der Mangel beruht. */
  grundlage: string;
  foto?: string;
  einstufung: FindingSeverity;
  massnahme: string;
  /** Spätester Behebungstermin. */
  frist: string | null;
  status: FindingStatus;
  /**
   * Fachliche Einschätzung, ob der Mangel der Weiterbenützung entgegensteht.
   * Die Rechtsfolge selbst wird ausschließlich über `Inspection.ergebnis`
   * festgelegt (PRD 8, Schritt 6).
   */
  relevantFuerWeiterbenuetzung: boolean;
  /** Entscheidung und Begründung des Prüfers zu diesem Mangel. */
  entscheidungPruefer: string;
}

/* ==========================================================================
 * Änderungen und Vorkommnisse
 * ======================================================================= */

/** Abfrage bei wiederkehrenden Prüfungen (PRD 8, Schritt 4). */
export interface Vorkommnisse {
  wesentlicheAenderung: boolean;
  groessereInstandsetzung: boolean;
  schaden: boolean;
  aussergewoehnlichesEreignis: boolean;
  aenderungSteuerungSoftware: boolean;
  aenderungAufstellungsort: boolean;
  aenderungNutzung: boolean;
  /** Erläuterung, sobald eine Frage mit „ja" beantwortet wurde. */
  erlaeuterung: string;
  /**
   * Beurteilung des Prüfers, ob statt oder zusätzlich zur wiederkehrenden
   * Prüfung ein anderes Prüfregime erforderlich ist.
   */
  anderesPruefregimeErforderlich: boolean;
  anderesPruefregimeBegruendung: string;
}

export function leereVorkommnisse(): Vorkommnisse {
  return {
    wesentlicheAenderung: false,
    groessereInstandsetzung: false,
    schaden: false,
    aussergewoehnlichesEreignis: false,
    aenderungSteuerungSoftware: false,
    aenderungAufstellungsort: false,
    aenderungNutzung: false,
    erlaeuterung: '',
    anderesPruefregimeErforderlich: false,
    anderesPruefregimeBegruendung: '',
  };
}

/** Wurde mindestens eine Frage mit „ja" beantwortet? */
export function hatVorkommnisse(v: Vorkommnisse): boolean {
  return (
    v.wesentlicheAenderung ||
    v.groessereInstandsetzung ||
    v.schaden ||
    v.aussergewoehnlichesEreignis ||
    v.aenderungSteuerungSoftware ||
    v.aenderungAufstellungsort ||
    v.aenderungNutzung
  );
}

/* ==========================================================================
 * Weiterbenützung nach § 6 Abs. 3 AM-VO
 * ======================================================================= */

/**
 * Pflichtangaben, ohne die der Zustand `DEFECTS_USE_ALLOWED_6_3` nicht
 * zulässig ist (PRD 9.5).
 */
export interface Weiterbenuetzung {
  /** Begründung des Prüfers. */
  begruendung: string;
  /** Bedingungen und Einschränkungen der Weiterbenützung. */
  bedingungen: string;
  /** Spätester Behebungstermin. */
  behebungBis: string | null;
  /** IDs der betroffenen Mängel. */
  betroffeneMaengel: string[];
  /** Verantwortliche Person des Betreibers. */
  verantwortlichBetreiber: string;
}

export function leereWeiterbenuetzung(): Weiterbenuetzung {
  return {
    begruendung: '',
    bedingungen: '',
    behebungBis: null,
    betroffeneMaengel: [],
    verantwortlichBetreiber: '',
  };
}

/**
 * Bestätigung des Betreibers über die Information der betroffenen
 * Arbeitnehmer:innen (§ 6 Abs. 3 Z 2 AM-VO). Ohne sie darf der Workflow nicht
 * als vollständig abgeschlossen dargestellt werden (PRD 9.5).
 */
export interface OperatorAcknowledgement {
  bestaetigt: boolean;
  name: string;
  funktion: string;
  datum: string | null;
}

export function leereBestaetigung(): OperatorAcknowledgement {
  return { bestaetigt: false, name: '', funktion: '', datum: null };
}

/* ==========================================================================
 * Prüfer
 * ======================================================================= */

/** Qualifikationsprofil eines Prüfers (PRD 14). */
export interface InspectorQualification {
  /** Prüfarten, für die der Prüfer freigabeberechtigt ist. */
  pruefarten: InspectionTypeId[];
  /** Anlagenfamilien, für die der Prüfer freigabeberechtigt ist. */
  familien: AssetFamily[];
  /** Bezeichnung der Qualifikation im Befund. */
  bezeichnung: string;
  /** Gültigkeit der Qualifikation. */
  gueltigBis: string | null;
}

export interface Inspector {
  id: string;
  name: string;
  /** Qualifikation im Klartext für den Befund (Bereich G). */
  qualifikation: string;
  pruefstelle: string;
  anschrift: string;
  qualifikationen: InspectorQualification[];
}

/* ==========================================================================
 * Fachliche Freigabe eines Overrides
 * ======================================================================= */

/**
 * Protokollierter Override, wenn die gewählte Prüfart für die
 * Anlagenkonfiguration nicht als Standardprüfpflicht hinterlegt ist
 * (PRD 8, Schritt 2).
 */
export interface Fachfreigabe {
  erforderlich: boolean;
  erteilt: boolean;
  /** Status, der die Freigabe ausgelöst hat. */
  anlass: PflichtStatus;
  begruendung: string;
  freigegebenVon: string;
  freigegebenAm: string | null;
}

export function leereFachfreigabe(anlass: PflichtStatus): Fachfreigabe {
  return {
    erforderlich: anlass !== 'STANDARD',
    erteilt: false,
    anlass,
    begruendung: '',
    freigegebenVon: '',
    freigegebenAm: null,
  };
}

/* ==========================================================================
 * Prüfung
 * ======================================================================= */

export interface Inspection {
  id: string;
  assetId: string;
  /** Prüfbefundnummer nach INGTEC-Schema. */
  befundnummer: string;
  /** Die Prüfart — das tragende unveränderliche Objekt des Befundes. */
  pruefart: InspectionTypeId;
  /** Prüfdatum; bestimmt auch den anzuwendenden Rechtsstand (PRD 6). */
  pruefdatum: string;
  inspectorId: string;
  /** Protokollierter Override bei ungewöhnlicher Prüfart-Kombination. */
  fachfreigabe: Fachfreigabe;
  grundlagen: Pruefgrundlage[];
  vorkommnisse: Vorkommnisse;
  items: InspectionItem[];
  findings: Finding[];
  /** Ausdrückliche Ergebnisentscheidung des Prüfers (PRD 8, Schritt 7). */
  ergebnis: LegalResult | null;
  weiterbenuetzung: Weiterbenuetzung;
  bestaetigungBetreiber: OperatorAcknowledgement;
  /** Angewendete Prüflast, soweit einschlägig. */
  prueflast: string;
  /** Beschreibung des durchgeführten Prüfumfanges (Bereich D). */
  pruefumfang: string;
  /** Unterschrift des Prüfers liegt vor (Bereich G, § 11 AM-VO). */
  unterschriftVorhanden: boolean;
  /** Datum der technischen Freigabe. */
  freigabedatum: string | null;
  status: ReportStatus;
  /** Verweis auf den ersetzten Befund, wenn dieser eine Neuausfertigung ist. */
  ersetzt: string | null;
  erstelltAm: string;
  geaendertAm: string;
  /** Revisionssichere Kennzeichnung der erzeugten Dokumentversionen. */
  versionen: ReportVersion[];
}

/* ==========================================================================
 * Dokumentversion und Audit
 * ======================================================================= */

/**
 * Revisionssichere Zuordnung eines erzeugten Befundes zu den Ständen, mit
 * denen er erzeugt wurde (PRD 15, AC-11).
 */
export interface ReportVersion {
  /** Befund-ID des erzeugten Dokuments. */
  befundId: string;
  /** Laufende Version, beginnend bei 1. */
  version: number;
  /** Version des zugrunde liegenden Datensatzes. */
  datensatzVersion: string;
  /** Version der verwendeten Checkliste. */
  checklistenVersion: string;
  /** Stichtag und Version des Rechtsregelstandes. */
  rechtsregelVersion: string;
  /** Version der PDF-Vorlage. */
  templateVersion: string;
  ersteller: string;
  freigeber: string;
  zeitstempel: string;
  /** Hash des finalen PDF-Inhalts. */
  pdfHash: string;
  status: ReportStatus;
}
