/**
 * Verbindliche Enums des Prüfbefund-Moduls (PRD Abschnitt 18).
 *
 * Diese Werte sind die Schnittstelle zwischen Rechtslogik, Oberfläche und
 * Dokumenterzeugung. Sie werden nirgends aus Freitext abgeleitet und nirgends
 * als Freitext gespeichert.
 */

/* ==========================================================================
 * Prüfart
 * ======================================================================= */

/**
 * Prüfart nach AM-VO. Die Prüfart ist das zentrale unveränderliche Objekt des
 * Moduls: Kopf, Haupttext, Prüfinhalt, Ergebnislogik und PDF-Darstellung
 * werden ausschließlich von ihr abgeleitet (PRD 20).
 */
export type InspectionTypeId =
  | 'AMVO_7_ACCEPTANCE'
  | 'AMVO_8_RECURRING'
  | 'AMVO_9_EXCEPTIONAL'
  | 'AMVO_10_SETUP'
  | 'OTHER';

/** Im MVP freigegebene Prüfarten. Die übrigen sind vorbereitet, aber gesperrt. */
export const MVP_PRUEFARTEN: InspectionTypeId[] = [
  'AMVO_7_ACCEPTANCE',
  'AMVO_8_RECURRING',
];

/* ==========================================================================
 * Rechtsfolge nach § 6 AM-VO
 * ======================================================================= */

/**
 * Zulässige Ergebniszustände (PRD 3.3).
 *
 * Die fachliche Einstufung eines Mangels und die Rechtsfolge nach § 6 AM-VO
 * sind getrennt: Dieser Code ist ausschließlich die Rechtsfolge.
 */
export type LegalResult =
  | 'NO_DEFECTS'
  | 'DEFECTS_USE_ALLOWED_6_3'
  | 'DEFECTS_USE_PROHIBITED'
  | 'NOT_ASSESSABLE';

export interface LegalResultDef {
  code: LegalResult;
  /** Bedeutung in der Oberfläche. */
  bedeutung: string;
  /** Aussage zur Weiterbenützung. */
  weiterbenuetzung: string;
  /** Plakative Ergebniszeile im Befund (PRD 11, Bereich E). */
  befundzeile: string;
  /** Statusfarbe der Ergebnisfläche. */
  ton: 'gut' | 'warn' | 'gefahr' | 'neutral';
  /** Setzt mindestens einen Mangel voraus. */
  setztMangelVoraus: boolean;
}

export const LEGAL_RESULTS: Record<LegalResult, LegalResultDef> = Object.freeze({
  NO_DEFECTS: {
    code: 'NO_DEFECTS',
    bedeutung: 'keine Mängel festgestellt',
    weiterbenuetzung: 'zulässig',
    befundzeile: 'KEINE MÄNGEL',
    ton: 'gut',
    setztMangelVoraus: false,
  },
  DEFECTS_USE_ALLOWED_6_3: {
    code: 'DEFECTS_USE_ALLOWED_6_3',
    bedeutung: 'Mängel, ausdrückliche Weiterbenützung nach § 6 Abs. 3 AM-VO',
    weiterbenuetzung: 'nur unter dokumentierten Voraussetzungen',
    befundzeile: 'MÄNGEL FESTGESTELLT — WEITERBENÜTZUNG ZULÄSSIG UNTER BEDINGUNGEN',
    ton: 'warn',
    setztMangelVoraus: true,
  },
  DEFECTS_USE_PROHIBITED: {
    code: 'DEFECTS_USE_PROHIBITED',
    bedeutung: 'Mängel, keine Weiterbenützung',
    weiterbenuetzung: 'bis Mängelbehebung unzulässig',
    befundzeile: 'MÄNGEL FESTGESTELLT — WEITERBENÜTZUNG NICHT ZULÄSSIG',
    ton: 'gefahr',
    setztMangelVoraus: true,
  },
  NOT_ASSESSABLE: {
    code: 'NOT_ASSESSABLE',
    bedeutung: 'Prüfung nicht vollständig möglich',
    weiterbenuetzung: 'keine positive Aussage zur Weiterbenützung',
    befundzeile: 'PRÜFUNG NICHT VOLLSTÄNDIG MÖGLICH — KEINE AUSSAGE ZUR WEITERBENÜTZUNG',
    ton: 'neutral',
    setztMangelVoraus: false,
  },
});

/* ==========================================================================
 * Befunde einzelner Prüfpunkte und Mängel
 * ======================================================================= */

/** Ergebnis eines einzelnen Prüfpunktes der Checkliste (PRD 8, Schritt 5). */
export type ItemResult = 'OK' | 'MANGEL' | 'NA' | 'NICHT_PRUEFBAR';

export const ITEM_RESULT_LABEL: Record<ItemResult, string> = Object.freeze({
  OK: 'OK',
  MANGEL: 'Mangel',
  NA: 'n. a.',
  NICHT_PRUEFBAR: 'nicht prüfbar',
});

/** Art eines Eintrags in der Mängelliste (PRD 18). */
export type FindingType = 'DEFECT' | 'OBSERVATION' | 'NOTE';

export const FINDING_TYPE_LABEL: Record<FindingType, string> = Object.freeze({
  DEFECT: 'Mangel',
  OBSERVATION: 'Feststellung',
  NOTE: 'Hinweis',
});

/**
 * Fachliche Einstufung eines Mangels. Bewusst getrennt von `LegalResult`:
 * Die Einstufung beschreibt die technische Schwere, nicht die Rechtsfolge
 * (PRD 8, Schritt 6).
 */
export type FindingSeverity = 'GERINGFUEGIG' | 'ERHEBLICH' | 'GEFAHR_IN_VERZUG';

export const FINDING_SEVERITY_LABEL: Record<FindingSeverity, string> =
  Object.freeze({
    GERINGFUEGIG: 'geringfügig',
    ERHEBLICH: 'erheblich',
    GEFAHR_IN_VERZUG: 'Gefahr in Verzug',
  });

/** Bearbeitungsstand eines Mangels. */
export type FindingStatus = 'OFFEN' | 'IN_BEHEBUNG' | 'BEHOBEN' | 'HINFAELLIG';

export const FINDING_STATUS_LABEL: Record<FindingStatus, string> = Object.freeze(
  {
    OFFEN: 'offen',
    IN_BEHEBUNG: 'in Behebung',
    BEHOBEN: 'behoben',
    HINFAELLIG: 'hinfällig',
  },
);

/* ==========================================================================
 * Prüfgrundlagen
 * ======================================================================= */

/**
 * Kategorie einer Prüfgrundlage (PRD 8, Schritt 3). Die Kategorien dürfen in
 * der Datenhaltung nicht vermischt werden.
 */
export type RuleType =
  | 'GESETZ'
  | 'VERORDNUNG'
  | 'BESCHEID'
  | 'NORM'
  | 'TRVB'
  | 'HERSTELLER';

export const RULE_TYPE_LABEL: Record<RuleType, string> = Object.freeze({
  GESETZ: 'Gesetz',
  VERORDNUNG: 'Verordnung',
  BESCHEID: 'Bescheid',
  NORM: 'Norm',
  TRVB: 'TRVB',
  HERSTELLER: 'Herstellerunterlage',
});

/** Gruppierung der Prüfgrundlagen in Oberfläche und Befund. */
export type RuleCategory =
  | 'RECHTSGRUNDLAGE'
  | 'BESCHEID_PROJEKT'
  | 'TECHNISCHES_REGELWERK'
  | 'HERSTELLER';

export const RULE_CATEGORY_LABEL: Record<RuleCategory, string> = Object.freeze({
  RECHTSGRUNDLAGE: 'Rechtsgrundlagen',
  BESCHEID_PROJEKT: 'Bescheid- und Projektgrundlagen',
  TECHNISCHES_REGELWERK: 'Technische Regelwerke',
  HERSTELLER: 'Herstellergrundlagen',
});

/** Grund der Verbindlichkeit einer Grundlage (PRD 6 und 13). */
export type BindingReason =
  | 'GESETZLICH'
  | 'BESCHEIDMAESSIG'
  | 'VERTRAGLICH'
  | 'STAND_DER_TECHNIK'
  | 'PROJEKTBEZOGEN';

export const BINDING_REASON_LABEL: Record<BindingReason, string> = Object.freeze(
  {
    GESETZLICH: 'gesetzlich',
    BESCHEIDMAESSIG: 'bescheidmäßig',
    VERTRAGLICH: 'vertraglich',
    STAND_DER_TECHNIK: 'Stand der Technik',
    PROJEKTBEZOGEN: 'projektbezogen',
  },
);

/* ==========================================================================
 * Befundlebenszyklus
 * ======================================================================= */

/** Status eines Prüfbefundes (PRD 15 und 18). */
export type ReportStatus =
  | 'DRAFT'
  | 'TECHNICAL_REVIEW'
  | 'RELEASED'
  | 'SIGNED'
  | 'SUPERSEDED';

export const REPORT_STATUS_LABEL: Record<ReportStatus, string> = Object.freeze({
  DRAFT: 'Entwurf',
  TECHNICAL_REVIEW: 'Prüfung abgeschlossen',
  RELEASED: 'technisch freigegeben',
  SIGNED: 'signiert',
  SUPERSEDED: 'ersetzt',
});

/** Reihenfolge des Freigabeprozesses; `SUPERSEDED` steht außerhalb der Kette. */
export const REPORT_STATUS_FOLGE: ReportStatus[] = [
  'DRAFT',
  'TECHNICAL_REVIEW',
  'RELEASED',
  'SIGNED',
];

/** Ab `SIGNED` ist der Befund inhaltlich gesperrt (PRD 15). */
export function istGesperrt(status: ReportStatus): boolean {
  return status === 'SIGNED' || status === 'SUPERSEDED';
}

/* ==========================================================================
 * Betriebsstatus eines Arbeitsmittels
 * ======================================================================= */

export type AssetStatus = 'AKTIV' | 'AUSSER_BETRIEB' | 'AUSGESCHIEDEN';

export const ASSET_STATUS_LABEL: Record<AssetStatus, string> = Object.freeze({
  AKTIV: 'aktiv',
  AUSSER_BETRIEB: 'außer Betrieb',
  AUSGESCHIEDEN: 'ausgeschieden',
});
