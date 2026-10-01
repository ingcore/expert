/**
 * Versionierte Rechts- und Regelwerksengine (PRD Abschnitt 6).
 *
 * Rechtsgrundlagen sind **Daten mit Gültigkeitszeitraum**, nicht statischer
 * Freitext im Frontend. Die anzuwendende Fassung wird über das **Prüfdatum**
 * ermittelt, nicht über den aktuellen Tag. Dadurch bleiben historische Befunde
 * reproduzierbar (PRD 6, AC-08).
 */

import type { BindingReason, RuleType } from '../enums';

/* ==========================================================================
 * Regelsatz
 * ======================================================================= */

export interface LegalRule {
  /** Eindeutige, stabile ID. */
  rule_id: string;
  title: string;
  /** Fundstelle, z. B. "§ 8 Abs. 2 AM-VO". */
  reference: string;
  /** Beginn der Gültigkeit (ISO-Datum). */
  valid_from: string;
  /** Ende der Gültigkeit; null = offen. */
  valid_to: string | null;
  /** Primärquelle. */
  source: string;
  rule_type: RuleType;
  binding_reason: BindingReason;
  /** Fachliche Freigabe der Regel. */
  reviewed_by: string;
  /** Zeitpunkt der fachlichen Freigabe. */
  reviewed_at: string;
  /** Interne Version des Regelsatzes. */
  version: string;
  /** Kurzfassung des Regelinhalts für Anzeige und Befund. */
  inhalt?: string;
}

/** Bündel aller zu einem Stichtag gültigen Regeln. */
export interface Regelstand {
  /** Stichtag der Auswahl — das Prüfdatum. */
  stichtag: string;
  regeln: LegalRule[];
}

/* ==========================================================================
 * Stichtagsauswahl
 * ======================================================================= */

/** Gilt die Regel am Stichtag? Offenes `valid_to` bedeutet unbefristet. */
export function giltAm(regel: LegalRule, stichtag: string): boolean {
  if (stichtag < regel.valid_from) return false;
  if (regel.valid_to && stichtag > regel.valid_to) return false;
  return true;
}

/**
 * Wählt den zum Prüfdatum gültigen Regelstand.
 *
 * Bewusst **nicht** `new Date()`: Ein Befund mit Prüfdatum in der
 * Vergangenheit muss mit der damals geltenden Fassung erzeugt werden.
 */
export function regelstandZum(
  stichtag: string,
  regeln: LegalRule[] = AMVO_REGELN,
): Regelstand {
  return { stichtag, regeln: regeln.filter((r) => giltAm(r, stichtag)) };
}

/** Sucht eine Regel im Stand; `null`, wenn sie am Stichtag nicht gilt. */
export function regel(stand: Regelstand, ruleId: string): LegalRule | null {
  return stand.regeln.find((r) => r.rule_id === ruleId) ?? null;
}

/**
 * Kurzzitat einer Regel für Fließtext und Befund.
 * Bei Normen wird die Ausgabe mitgeführt (PRD 13).
 */
export function zitat(r: LegalRule): string {
  if (r.rule_type === 'NORM' || r.rule_type === 'TRVB') {
    return `${r.reference} (Ausgabe ${r.version})`;
  }
  return r.reference;
}

/* ==========================================================================
 * Stammdatensatz AM-VO
 * ======================================================================= */

const INGTEC_REVIEW = {
  reviewed_by: 'INGTEC GmbH, technische Leitung',
  reviewed_at: '2026-01-15',
};

const AMVO_QUELLE =
  'Verordnung über die Sicherheit und den Gesundheitsschutz bei der Benutzung von Arbeitsmitteln (Arbeitsmittelverordnung — AM-VO), BGBl. II Nr. 164/2000 idgF.';

/**
 * Regelsatz der AM-VO. `valid_from` bildet den im System geführten
 * Fassungsstand ab; ältere Fassungen werden bei Bedarf mit eigenem
 * `valid_to` ergänzt, ohne bestehende Einträge zu verändern.
 */
export const AMVO_REGELN: LegalRule[] = [
  {
    rule_id: 'AMVO_6_2',
    title: 'Arbeitsmittelverordnung',
    reference: '§ 6 Abs. 2 AM-VO',
    valid_from: '2000-06-01',
    valid_to: null,
    source: AMVO_QUELLE,
    rule_type: 'VERORDNUNG',
    binding_reason: 'GESETZLICH',
    ...INGTEC_REVIEW,
    version: '2026.1',
    inhalt:
      'Wird bei einer Prüfung ein Mangel festgestellt, darf das Arbeitsmittel erst nach Behebung des Mangels wieder benutzt werden.',
  },
  {
    rule_id: 'AMVO_6_3',
    title: 'Arbeitsmittelverordnung',
    reference: '§ 6 Abs. 3 AM-VO',
    valid_from: '2000-06-01',
    valid_to: null,
    source: AMVO_QUELLE,
    rule_type: 'VERORDNUNG',
    binding_reason: 'GESETZLICH',
    ...INGTEC_REVIEW,
    version: '2026.1',
    inhalt:
      'Bei wiederkehrenden Prüfungen ist eine Weiterbenützung vor Mängelbehebung zulässig, wenn der Prüfer dies im Prüfbefund ausdrücklich schriftlich festhält (Z 1) und die betroffenen Arbeitnehmer:innen über die Mängel informiert wurden (Z 2).',
  },
  {
    rule_id: 'AMVO_7',
    title: 'Arbeitsmittelverordnung',
    reference: '§ 7 AM-VO',
    valid_from: '2000-06-01',
    valid_to: null,
    source: AMVO_QUELLE,
    rule_type: 'VERORDNUNG',
    binding_reason: 'GESETZLICH',
    ...INGTEC_REVIEW,
    version: '2026.1',
    inhalt:
      'Abnahmeprüfung vor der ersten Inbetriebnahme für die dort angeführten Arbeitsmittel.',
  },
  {
    rule_id: 'AMVO_7_2',
    title: 'Arbeitsmittelverordnung',
    reference: '§ 7 Abs. 2 AM-VO',
    valid_from: '2000-06-01',
    valid_to: null,
    source: AMVO_QUELLE,
    rule_type: 'VERORDNUNG',
    binding_reason: 'GESETZLICH',
    ...INGTEC_REVIEW,
    version: '2026.1',
    inhalt: 'Mindestprüfinhalte der Abnahmeprüfung.',
  },
  {
    rule_id: 'AMVO_8',
    title: 'Arbeitsmittelverordnung',
    reference: '§ 8 AM-VO',
    valid_from: '2000-06-01',
    valid_to: null,
    source: AMVO_QUELLE,
    rule_type: 'VERORDNUNG',
    binding_reason: 'GESETZLICH',
    ...INGTEC_REVIEW,
    version: '2026.1',
    inhalt:
      'Wiederkehrende Prüfung der dort angeführten Arbeitsmittel, mindestens einmal je Kalenderjahr und längstens im Abstand von 15 Monaten.',
  },
  {
    rule_id: 'AMVO_8_2',
    title: 'Arbeitsmittelverordnung',
    reference: '§ 8 Abs. 2 AM-VO',
    valid_from: '2000-06-01',
    valid_to: null,
    source: AMVO_QUELLE,
    rule_type: 'VERORDNUNG',
    binding_reason: 'GESETZLICH',
    ...INGTEC_REVIEW,
    version: '2026.1',
    inhalt: 'Mindestprüfinhalte der wiederkehrenden Prüfung.',
  },
  {
    rule_id: 'AMVO_11',
    title: 'Arbeitsmittelverordnung',
    reference: '§ 11 AM-VO',
    valid_from: '2000-06-01',
    valid_to: null,
    source: AMVO_QUELLE,
    rule_type: 'VERORDNUNG',
    binding_reason: 'GESETZLICH',
    ...INGTEC_REVIEW,
    version: '2026.1',
    inhalt:
      'Mindestinhalt des Prüfbefundes: Prüfdatum, Prüfer bzw. Prüfstelle, Unterschrift, Prüfungsergebnis und Angaben über die Prüfinhalte.',
  },
];

/* ==========================================================================
 * Technische Regelwerke (PRD 13)
 * ======================================================================= */

/**
 * Technisches Regelwerk oder Herstellergrundlage.
 *
 * Eine Norm wird **nicht** allein deshalb verbindlich, weil eine Anlagenart
 * gewählt wurde. Anwendungs- und Verbindlichkeitsgrund sind daher getrennt
 * zu erfassen (PRD 13).
 */
export interface TechnicalRule {
  rule_id: string;
  /** Norm- oder Richtlinienbezeichnung, z. B. "ÖNORM EN 12453". */
  bezeichnung: string;
  /** Ausgabestand, z. B. "2022-09". Pflichtangabe für die Validierung. */
  ausgabe: string;
  rule_type: RuleType;
  /** Warum wird die Grundlage herangezogen? */
  anwendungsgrund: string;
  binding_reason: BindingReason;
  /** Familien, für die die Grundlage sinnvoll zugeordnet werden kann. */
  familien: string[];
  reviewed_by?: string;
  reviewed_at?: string;
}

export const TECHNISCHE_REGELN: TechnicalRule[] = [
  {
    rule_id: 'EN_12453',
    bezeichnung: 'ÖNORM EN 12453',
    ausgabe: '2022-09',
    rule_type: 'NORM',
    anwendungsgrund:
      'Nutzungssicherheit kraftbetriebener Tore — Anforderungen und Prüfverfahren.',
    binding_reason: 'STAND_DER_TECHNIK',
    familien: ['TOR', 'TUER', 'SCHRANKE'],
  },
  {
    rule_id: 'EN_12604',
    bezeichnung: 'ÖNORM EN 12604',
    ausgabe: '2017-08',
    rule_type: 'NORM',
    anwendungsgrund: 'Tore — mechanische Aspekte, Anforderungen und Prüfverfahren.',
    binding_reason: 'STAND_DER_TECHNIK',
    familien: ['TOR', 'TUER'],
  },
  {
    rule_id: 'EN_1493',
    bezeichnung: 'ÖNORM EN 1493',
    ausgabe: '2022-06',
    rule_type: 'NORM',
    anwendungsgrund: 'Fahrzeug-Hebebühnen — Sicherheitsanforderungen.',
    binding_reason: 'STAND_DER_TECHNIK',
    familien: ['FAHRZEUGHEBEBUEHNE'],
  },
  {
    rule_id: 'EN_280',
    bezeichnung: 'ÖNORM EN 280',
    ausgabe: '2022-03',
    rule_type: 'NORM',
    anwendungsgrund: 'Fahrbare Hubarbeitsbühnen — Sicherheitsanforderungen und Prüfung.',
    binding_reason: 'STAND_DER_TECHNIK',
    familien: ['ARBEITSBUEHNE'],
  },
  {
    rule_id: 'EN_13155',
    bezeichnung: 'ÖNORM EN 13155',
    ausgabe: '2020-11',
    rule_type: 'NORM',
    anwendungsgrund: 'Krane — lose Lastaufnahmemittel.',
    binding_reason: 'STAND_DER_TECHNIK',
    familien: ['LASTAUFNAHMEMITTEL', 'KRAN'],
  },
  {
    rule_id: 'EN_795',
    bezeichnung: 'ÖNORM EN 795',
    ausgabe: '2012-10',
    rule_type: 'NORM',
    anwendungsgrund:
      'Anschlageinrichtungen gegen Absturz — Anforderungen und Prüfverfahren.',
    binding_reason: 'STAND_DER_TECHNIK',
    familien: ['ANSCHLAGPUNKT_PSA'],
  },
  {
    rule_id: 'EN_ISO_12100',
    bezeichnung: 'ÖNORM EN ISO 12100',
    ausgabe: '2013-10',
    rule_type: 'NORM',
    anwendungsgrund: 'Sicherheit von Maschinen — Risikobeurteilung und Risikominderung.',
    binding_reason: 'STAND_DER_TECHNIK',
    familien: [],
  },
  {
    rule_id: 'TRVB_151_S',
    bezeichnung: 'TRVB 151 S',
    ausgabe: '2021',
    rule_type: 'TRVB',
    anwendungsgrund:
      'Technische Prüfgrundlage für Brandschutzabschlüsse und deren Feststellanlagen.',
    binding_reason: 'BESCHEIDMAESSIG',
    familien: ['BRANDSCHUTZABSCHLUSS'],
  },
  {
    rule_id: 'EN_ISO_16090',
    bezeichnung: 'ÖNORM EN ISO 16090',
    ausgabe: '2018-12',
    rule_type: 'NORM',
    anwendungsgrund: 'Werkzeugmaschinen — Sicherheit.',
    binding_reason: 'STAND_DER_TECHNIK',
    familien: ['SONSTIGES'],
  },
  {
    rule_id: 'EN_16985',
    bezeichnung: 'ÖNORM EN 16985',
    ausgabe: '2018-12',
    rule_type: 'NORM',
    anwendungsgrund: 'Spritzkabinen für organische Beschichtungsstoffe.',
    binding_reason: 'STAND_DER_TECHNIK',
    familien: ['ABSAUGANLAGE'],
  },
];

const TECHNISCHE_INDEX: Record<string, TechnicalRule> = Object.fromEntries(
  TECHNISCHE_REGELN.map((r) => [r.rule_id, r]),
);

export function technischeRegel(id: string): TechnicalRule | null {
  return TECHNISCHE_INDEX[id] ?? null;
}
