/**
 * Die Prüfart als **ein einziges unveränderliches Objekt** (PRD Abschnitt 20).
 *
 * Kopfzeile, Haupttext, gesetzlicher Prüfinhalt, zulässige Ergebniszustände,
 * Fußnote und PDF-Darstellung werden ausschließlich aus diesem Objekt
 * abgeleitet. Es gibt keinen Pfad, auf dem ein §-7-Kopf mit einem §-8-Text
 * oder umgekehrt zusammentreffen könnte — die Mischbefunde der
 * Excel-Vorlage sind damit strukturell ausgeschlossen (AC-01, AC-02).
 */

import type { InspectionTypeId, LegalResult } from '../enums';

/* ==========================================================================
 * Gesetzlicher Mindestprüfinhalt
 * ======================================================================= */

/**
 * Ein gesetzlicher Mindestprüfinhalt als **strukturierter Prüfpunkt**,
 * nicht als Fußnotentext im PDF (PRD 3.1).
 */
export interface Mindestpruefinhalt {
  /** Stabile ID, z. B. "AMVO_7_2_Z1". */
  id: string;
  /** Ziffer innerhalb der Aufzählung. */
  ziffer: number;
  /** Kurzbezeichnung für Checkliste und Befundfuß. */
  kurz: string;
  /** Vollständiger Prüfinhalt für die Checkliste. */
  text: string;
  /**
   * Nur anwendbar, wenn das Arbeitsmittel diese Eigenschaft trägt.
   * Beispiel: Arbeitskorb-Ziffern greifen nur bei Arbeitskörben.
   */
  nurWenn?: 'ARBEITSKORB';
}

/* ==========================================================================
 * Prüfart-Definition
 * ======================================================================= */

/** Kontext, aus dem der Haupttext gebildet wird. */
export interface TextKontext {
  /** Prüfdatum in der Darstellung des Befundes (z. B. "14.03.2026"). */
  pruefdatum: string;
  ergebnis: LegalResult;
  /** Bedingungen der Weiterbenützung — nur bei § 6 Abs. 3. */
  bedingungen?: string;
}

export interface PruefartDefinition {
  readonly id: InspectionTypeId;
  /** Kurzform, z. B. "§ 7 AM-VO". */
  readonly kurz: string;
  /** Zeile unter dem Titel „PRÜFBEFUND" (PRD 11, Bereich B). */
  readonly titelzeile: string;
  /** Bezeichnung in Listen und Auswahlfeldern. */
  readonly label: string;
  /** Regel-ID der tragenden Rechtsgrundlage. */
  readonly rechtsgrundlageRef: string;
  /** Regel-ID der Mindestprüfinhalte. */
  readonly pruefinhaltRef: string;
  /** Ist die Prüfart eine wiederkehrende Prüfung? */
  readonly wiederkehrend: boolean;
  /** Im MVP freigegeben? */
  readonly freigegeben: boolean;
  /** Gesetzliche Mindestprüfinhalte dieser Prüfart. */
  readonly mindestpruefinhalte: readonly Mindestpruefinhalt[];
  /**
   * Ausschließlich diese Ergebniszustände sind wählbar. Bei der
   * Abnahmeprüfung fehlt `DEFECTS_USE_ALLOWED_6_3` (PRD 3.3, AC-04).
   */
  readonly erlaubteErgebnisse: readonly LegalResult[];
  /** Haupttext des Befundes, abgeleitet aus Prüfart und Ergebnis. */
  readonly haupttext: (ctx: TextKontext) => string[];
  /** Fußzeile über die durchgeführten Prüfinhalte (PRD 11, Bereich H). */
  readonly fussnote: string;
}

/* ==========================================================================
 * § 7 AM-VO — Abnahmeprüfung
 * ======================================================================= */

const MINDESTINHALT_7: readonly Mindestpruefinhalt[] = Object.freeze([
  {
    id: 'AMVO_7_2_Z1',
    ziffer: 1,
    kurz: 'Zustand, Montage, Stabilität',
    text:
      'Ordnungsgemäßer Zustand des Arbeitsmittels sowie ordnungsgemäße Montage und Stabilität.',
  },
  {
    id: 'AMVO_7_2_Z2',
    ziffer: 2,
    kurz: 'Steuer- und Kontrolleinrichtungen',
    text: 'Steuer- und Kontrolleinrichtungen des Arbeitsmittels.',
  },
  {
    id: 'AMVO_7_2_Z3',
    ziffer: 3,
    kurz: 'Funktionsprüfung mit und ohne Belastung',
    text:
      'Erforderlichenfalls Funktionsprüfung des Arbeitsmittels mit und ohne Belastung.',
  },
  {
    id: 'AMVO_7_2_Z4',
    ziffer: 4,
    kurz: 'Sicherheitsfunktionen bei Störungen',
    text:
      'Sicherheitsfunktionen bei vorhersehbaren Störungen und Fehlbedienungen.',
  },
  {
    id: 'AMVO_7_2_Z5',
    ziffer: 5,
    kurz: 'Zu- und Abfuhr von Stoffen und Energien',
    text: 'Sichere Zu- und Abfuhr von Stoffen und Energien.',
  },
  {
    id: 'AMVO_7_2_Z6',
    ziffer: 6,
    kurz: 'Maßnahmen für Restrisiken',
    text: 'Maßnahmen für verbleibende Restrisiken.',
  },
  {
    id: 'AMVO_7_2_Z7',
    ziffer: 7,
    kurz: 'Eignung des Hebearbeitsmittels (Arbeitskorb)',
    text:
      'Bei Arbeitskörben zusätzlich die Eignung des verwendeten Hebearbeitsmittels.',
    nurWenn: 'ARBEITSKORB',
  },
]);

const ABNAHME: PruefartDefinition = Object.freeze({
  id: 'AMVO_7_ACCEPTANCE' as const,
  kurz: '§ 7 AM-VO',
  titelzeile: 'Abnahmeprüfung gemäß § 7 AM-VO',
  label: 'Abnahmeprüfung gemäß § 7 AM-VO',
  rechtsgrundlageRef: 'AMVO_7',
  pruefinhaltRef: 'AMVO_7_2',
  wiederkehrend: false,
  freigegeben: true,
  mindestpruefinhalte: MINDESTINHALT_7,
  // Ohne DEFECTS_USE_ALLOWED_6_3: § 6 Abs. 3 gilt nur für wiederkehrende
  // Prüfungen. Die Auswahl existiert bei der Abnahme nicht (PRD 9.2).
  erlaubteErgebnisse: Object.freeze([
    'NO_DEFECTS',
    'DEFECTS_USE_PROHIBITED',
    'NOT_ASSESSABLE',
  ] as LegalResult[]),
  haupttext: (ctx: TextKontext): string[] => {
    const einleitung =
      `Am ${ctx.pruefdatum} wurde das oben angeführte Arbeitsmittel einer ` +
      'Abnahmeprüfung gemäß § 7 AM-VO unterzogen. Die Prüfung erfolgte unter ' +
      'Berücksichtigung der für das Arbeitsmittel einschlägigen Prüfinhalte ' +
      'gemäß § 7 Abs. 2 AM-VO sowie der angeführten zusätzlichen Prüfgrundlagen.';

    switch (ctx.ergebnis) {
      case 'NO_DEFECTS':
        return [
          einleitung,
          'Bei der Prüfung wurden keine Mängel festgestellt. Aus dem Ergebnis ' +
            'des festgestellten Prüfumfanges ergeben sich keine Einwände gegen ' +
            'die Benützung des Arbeitsmittels.',
        ];
      case 'DEFECTS_USE_PROHIBITED':
        return [
          einleitung,
          'Bei der Prüfung wurden die nachstehend angeführten Mängel ' +
            'festgestellt. Das Arbeitsmittel darf gemäß § 6 Abs. 2 AM-VO erst ' +
            'nach Behebung der festgestellten Mängel benutzt werden.',
        ];
      case 'NOT_ASSESSABLE':
        return [
          einleitung,
          'Die Prüfung konnte nicht vollständig durchgeführt werden. Zum ' +
            'nicht geprüften Umfang wird keine Aussage getroffen; eine ' +
            'positive Aussage zur Benützung des Arbeitsmittels ist auf ' +
            'Grundlage dieses Prüfbefundes nicht möglich.',
        ];
      default:
        // Unerreichbar: `erlaubteErgebnisse` schließt diesen Fall aus und die
        // Validierung blockiert ihn zusätzlich vor der PDF-Erzeugung.
        throw new Error(
          `Ergebniszustand ${ctx.ergebnis} ist bei der Abnahmeprüfung nach § 7 AM-VO nicht zulässig.`,
        );
    }
  },
  fussnote:
    'Geprüft wurden die für dieses Arbeitsmittel einschlägigen Inhalte gemäß ' +
    '§ 7 Abs. 2 AM-VO: ordnungsgemäßer Zustand, Montage und Stabilität; Steuer- ' +
    'und Kontrolleinrichtungen; erforderlichenfalls Funktionsprüfung mit und ohne ' +
    'Belastung; Sicherheitsfunktionen bei vorhersehbaren Störungen und ' +
    'Fehlbedienungen; sichere Zu- und Abfuhr von Stoffen und Energien; Maßnahmen ' +
    'für verbleibende Restrisiken. Der Prüfbefund bezieht sich ausschließlich auf ' +
    'den angeführten Prüfumfang und den Zustand zum Prüfzeitpunkt.',
});

/* ==========================================================================
 * § 8 AM-VO — wiederkehrende Prüfung
 * ======================================================================= */

const MINDESTINHALT_8: readonly Mindestpruefinhalt[] = Object.freeze([
  {
    id: 'AMVO_8_2_Z1',
    ziffer: 1,
    kurz: 'verschleißbehaftete Komponenten',
    text: 'Zustand der verschleißbehafteten Komponenten.',
  },
  {
    id: 'AMVO_8_2_Z2',
    ziffer: 2,
    kurz: 'Einstellung sicherheitsrelevanter Bauteile',
    text:
      'Einstellung sicherheitsrelevanter Bauteile und Sicherheitseinrichtungen.',
  },
  {
    id: 'AMVO_8_2_Z3',
    ziffer: 3,
    kurz: 'Funktionsprüfung sicherheitsrelevanter Bauteile',
    text:
      'Funktionsprüfung der sicherheitsrelevanten Bauteile und Einrichtungen.',
  },
  {
    id: 'AMVO_8_2_Z4',
    ziffer: 4,
    kurz: 'Eignung des Hebearbeitsmittels (Arbeitskorb)',
    text: 'Bei Arbeitskörben zusätzlich die Eignung des Hebearbeitsmittels.',
    nurWenn: 'ARBEITSKORB',
  },
]);

const WIEDERKEHREND: PruefartDefinition = Object.freeze({
  id: 'AMVO_8_RECURRING' as const,
  kurz: '§ 8 AM-VO',
  titelzeile: 'Wiederkehrende Prüfung gemäß § 8 AM-VO',
  label: 'Wiederkehrende Prüfung gemäß § 8 AM-VO',
  rechtsgrundlageRef: 'AMVO_8',
  pruefinhaltRef: 'AMVO_8_2',
  wiederkehrend: true,
  freigegeben: true,
  mindestpruefinhalte: MINDESTINHALT_8,
  erlaubteErgebnisse: Object.freeze([
    'NO_DEFECTS',
    'DEFECTS_USE_ALLOWED_6_3',
    'DEFECTS_USE_PROHIBITED',
    'NOT_ASSESSABLE',
  ] as LegalResult[]),
  haupttext: (ctx: TextKontext): string[] => {
    const einleitung =
      `Am ${ctx.pruefdatum} wurde das oben angeführte Arbeitsmittel einer ` +
      'wiederkehrenden Prüfung gemäß § 8 AM-VO unterzogen. Die Prüfung erfolgte ' +
      'unter Berücksichtigung der für das Arbeitsmittel einschlägigen Prüfinhalte ' +
      'gemäß § 8 Abs. 2 AM-VO sowie der angeführten zusätzlichen Prüfgrundlagen.';

    switch (ctx.ergebnis) {
      case 'NO_DEFECTS':
        // Kein Verweis auf § 6 Abs. 3 im mangelfreien Zustand (AC-03).
        return [
          einleitung,
          'Bei der Prüfung wurden keine Mängel festgestellt. Aus dem Ergebnis ' +
            'des festgestellten Prüfumfanges ergeben sich keine Einwände gegen ' +
            'die weitere Benützung des Arbeitsmittels.',
        ];
      case 'DEFECTS_USE_PROHIBITED':
        return [
          einleitung,
          'Bei der Prüfung wurden Mängel festgestellt. Gemäß § 6 Abs. 2 AM-VO ' +
            'darf das Arbeitsmittel erst nach Behebung der festgestellten Mängel ' +
            'wieder benutzt werden. Eine Weiterbenützung vor Mängelbehebung wird ' +
            'im Rahmen dieses Prüfbefundes nicht bestätigt.',
        ];
      case 'DEFECTS_USE_ALLOWED_6_3':
        return [
          einleitung,
          'Bei der Prüfung wurden Mängel festgestellt. Der Prüfer hält gemäß ' +
            '§ 6 Abs. 3 Z 1 AM-VO schriftlich fest, dass das Arbeitsmittel unter ' +
            'den nachstehend angeführten Bedingungen bereits vor vollständiger ' +
            'Mängelbehebung weiter benutzt werden darf.',
          'Die betroffenen Arbeitnehmer:innen sind gemäß § 6 Abs. 3 Z 2 AM-VO ' +
            'über die festgestellten Mängel zu informieren.',
          `Bedingungen der Weiterbenützung: ${ctx.bedingungen ?? ''}`.trim(),
        ];
      case 'NOT_ASSESSABLE':
        return [
          einleitung,
          'Die Prüfung konnte nicht vollständig durchgeführt werden. Zum nicht ' +
            'geprüften Umfang wird keine Aussage getroffen; eine positive Aussage ' +
            'zur weiteren Benützung des Arbeitsmittels ist auf Grundlage dieses ' +
            'Prüfbefundes nicht möglich.',
        ];
      default:
        throw new Error(`Unbekannter Ergebniszustand: ${ctx.ergebnis}`);
    }
  },
  fussnote:
    'Geprüft wurden die für dieses Arbeitsmittel einschlägigen Inhalte gemäß ' +
    '§ 8 Abs. 2 AM-VO: Zustand der verschleißbehafteten Komponenten; Einstellung ' +
    'sicherheitsrelevanter Bauteile und Sicherheitseinrichtungen; Funktionsprüfung ' +
    'der sicherheitsrelevanten Bauteile und Einrichtungen. Der Prüfbefund bezieht ' +
    'sich ausschließlich auf den angeführten Prüfumfang und den Zustand zum ' +
    'Prüfzeitpunkt.',
});

/* ==========================================================================
 * Registry
 * ======================================================================= */

export const PRUEFARTEN: Readonly<Record<InspectionTypeId, PruefartDefinition>> =
  Object.freeze({
    AMVO_7_ACCEPTANCE: ABNAHME,
    AMVO_8_RECURRING: WIEDERKEHREND,
    // Vorbereitet, im MVP nicht freigegeben (PRD 18).
    AMVO_9_EXCEPTIONAL: Object.freeze({
      ...WIEDERKEHREND,
      id: 'AMVO_9_EXCEPTIONAL' as const,
      kurz: '§ 9 AM-VO',
      titelzeile: 'Außerordentliche Prüfung gemäß § 9 AM-VO',
      label: 'Außerordentliche Prüfung gemäß § 9 AM-VO (nicht freigegeben)',
      rechtsgrundlageRef: 'AMVO_9',
      freigegeben: false,
    }),
    AMVO_10_SETUP: Object.freeze({
      ...ABNAHME,
      id: 'AMVO_10_SETUP' as const,
      kurz: '§ 10 AM-VO',
      titelzeile: 'Prüfung nach Aufstellung gemäß § 10 AM-VO',
      label: 'Prüfung nach Aufstellung gemäß § 10 AM-VO (nicht freigegeben)',
      rechtsgrundlageRef: 'AMVO_10',
      freigegeben: false,
    }),
    OTHER: Object.freeze({
      ...ABNAHME,
      id: 'OTHER' as const,
      kurz: 'sonstige Prüfung',
      titelzeile: 'Sonstige Prüfung',
      label: 'Sonstige Prüfung (nicht freigegeben)',
      freigegeben: false,
    }),
  });

/** Zugriff auf die Prüfart. Wirft bei unbekannter ID — kein stilles Fallback. */
export function pruefart(id: InspectionTypeId): PruefartDefinition {
  const def = PRUEFARTEN[id];
  if (!def) throw new Error(`Unbekannte Prüfart: ${id}`);
  return def;
}

/** Im MVP auswählbare Prüfarten. */
export function freigegebenePruefarten(): PruefartDefinition[] {
  return Object.values(PRUEFARTEN).filter((p) => p.freigegeben);
}

/**
 * Darf dieser Ergebniszustand bei dieser Prüfart gewählt werden?
 * Einzige Quelle der Wahrheit für die Oberfläche und die Validierung.
 */
export function ergebnisZulaessig(
  id: InspectionTypeId,
  ergebnis: LegalResult,
): boolean {
  return pruefart(id).erlaubteErgebnisse.includes(ergebnis);
}

/**
 * Gesetzliche Mindestprüfinhalte der Prüfart, gefiltert nach den
 * Eigenschaften des Arbeitsmittels.
 */
export function mindestpruefinhalte(
  id: InspectionTypeId,
  opt: { arbeitskorb?: boolean } = {},
): Mindestpruefinhalt[] {
  return pruefart(id).mindestpruefinhalte.filter(
    (p) => !p.nurWenn || (p.nurWenn === 'ARBEITSKORB' && opt.arbeitskorb === true),
  );
}
