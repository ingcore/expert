/**
 * Legal Applicability Engine (PRD Abschnitt 5).
 *
 * Die Software leitet die Prüfpflicht **nicht** aus der Arbeitsmittelart ab.
 * Eine Regel „Gabelstapler → immer § 7 + § 8" ist ausdrücklich unzulässig.
 * Stattdessen entscheidet ein Rechtsprofil, das Familie, Bauart und die
 * konkreten technischen Eigenschaften auswertet.
 *
 * Das Ergebnis ist nie ein stiller Automatismus, sondern einer von drei
 * Zuständen: Standardprüfpflicht, differenzierte Beurteilung oder kein
 * hinterlegtes Standardprofil. Die beiden letzteren verlangen eine
 * dokumentierte fachliche Entscheidung (PRD 8, Schritt 2).
 */

import { trifftZu, type JsonLogic } from '@/engine/jsonlogic';
import type { InspectionTypeId } from '../enums';
import type { AssetFamily } from '../families';

/* ==========================================================================
 * Zustände
 * ======================================================================= */

export type PflichtStatus =
  /** Standardprüfpflicht — ohne weitere Begründung wählbar. */
  | 'STANDARD'
  /** Prüfpflicht besteht, hängt aber von der konkreten Ausführung ab. */
  | 'DIFFERENZIERT'
  /** Kein Standardprofil hinterlegt — fachliche Freigabe erforderlich. */
  | 'KEIN_STANDARDPROFIL';

export const PFLICHT_STATUS_LABEL: Record<PflichtStatus, string> = Object.freeze(
  {
    STANDARD: 'Standardprüfpflicht',
    DIFFERENZIERT: 'differenziert zu beurteilen',
    KEIN_STANDARDPROFIL: 'kein Standardprofil hinterlegt',
  },
);

/** Hinweistext bei rechtlich ungewöhnlicher Kombination (PRD 8, Schritt 2). */
export const HINWEIS_FACHFREIGABE =
  'Für diese Anlagenkonfiguration ist die gewählte Prüfart nicht als ' +
  'Standardprüfpflicht hinterlegt. Fachliche Freigabe erforderlich.';

export interface Pflichtregel {
  pruefart: InspectionTypeId;
  status: PflichtStatus;
  /** Fachliche Begründung — erscheint in der Oberfläche und im Protokoll. */
  begruendung: string;
  /** Regel-ID der tragenden Rechtsgrundlage. */
  regelRef: string;
}

/**
 * Rechtsprofil eines Arbeitsmittels. Mehrere Profile einer Familie werden
 * nach `prioritaet` geordnet; das erste passende gewinnt.
 */
export interface LegalProfile {
  profil_id: string;
  label: string;
  familie: AssetFamily;
  /** Bauarten, für die das Profil gilt; fehlt die Angabe, gilt es für alle. */
  bauarten?: string[];
  /** Zusätzliche Bedingung über die technischen Eigenschaften. */
  bedingung?: JsonLogic;
  /** Höhere Werte werden zuerst geprüft. */
  prioritaet: number;
  pflichten: Pflichtregel[];
  /** Fachlicher Hinweis zum Profil. */
  hinweis?: string;
}

/**
 * Auswertungskontext: flach gehaltene Eigenschaften des Arbeitsmittels.
 * Die technischen Attribute liegen unter `attr.*`.
 */
export interface AssetKontext {
  familie: AssetFamily;
  bauart: string;
  attr: Record<string, unknown>;
}

/* ==========================================================================
 * Profilkatalog
 * ======================================================================= */

const P = (
  pruefart: InspectionTypeId,
  status: PflichtStatus,
  begruendung: string,
  regelRef: string,
): Pflichtregel => ({ pruefart, status, begruendung, regelRef });

/**
 * Profile in fachlicher Reihenfolge. Spezialfälle tragen höhere Priorität als
 * die allgemeinen Familienprofile.
 */
export const LEGAL_PROFILES: LegalProfile[] = [
  /* ---- Türen und Tore ------------------------------------------------- */
  {
    profil_id: 'TOR_KRAFTBETRIEBEN',
    label: 'Kraftbetriebenes Tor',
    familie: 'TOR',
    prioritaet: 100,
    bedingung: { '==': [{ var: 'attr.kraftbetrieben' }, true] },
    pflichten: [
      P(
        'AMVO_7_ACCEPTANCE',
        'STANDARD',
        'Kraftbetriebene Tore unterliegen der Abnahmeprüfpflicht vor der ersten Inbetriebnahme.',
        'AMVO_7',
      ),
      P(
        'AMVO_8_RECURRING',
        'STANDARD',
        'Kraftbetriebene Tore sind wiederkehrend zu prüfen.',
        'AMVO_8',
      ),
    ],
  },
  {
    profil_id: 'TOR_OBEN_OEFFNEND_GROSS',
    label: 'Nach oben öffnendes Tor mit Torblattfläche über 10 m²',
    familie: 'TOR',
    prioritaet: 95,
    bedingung: {
      and: [
        { '==': [{ var: 'attr.oeffnungsrichtung' }, 'OBEN'] },
        { '>': [{ var: 'attr.torblattflaeche' }, 10] },
      ],
    },
    pflichten: [
      P(
        'AMVO_7_ACCEPTANCE',
        'STANDARD',
        'Nach oben öffnende Tore mit einer Torblattfläche über 10 m² unterliegen der Abnahmeprüfpflicht.',
        'AMVO_7',
      ),
      P(
        'AMVO_8_RECURRING',
        'STANDARD',
        'Nach oben öffnende Tore mit einer Torblattfläche über 10 m² sind wiederkehrend zu prüfen.',
        'AMVO_8',
      ),
    ],
  },
  {
    profil_id: 'TOR_HANDBETRIEBEN',
    label: 'Handbetriebenes Tor',
    familie: 'TOR',
    prioritaet: 10,
    pflichten: [
      P(
        'AMVO_7_ACCEPTANCE',
        'KEIN_STANDARDPROFIL',
        'Ein handbetriebenes Tor unterliegt nicht allein aufgrund der Bauart der Abnahmeprüfpflicht. Maßgeblich sind Kraftbetrieb und Torblattfläche.',
        'AMVO_7',
      ),
      P(
        'AMVO_8_RECURRING',
        'DIFFERENZIERT',
        'Die wiederkehrende Prüfpflicht hängt von Ausführung, Torblattfläche und Öffnungsrichtung ab.',
        'AMVO_8',
      ),
    ],
  },
  {
    profil_id: 'TUER_KRAFTBETRIEBEN',
    label: 'Kraftbetriebene Tür',
    familie: 'TUER',
    prioritaet: 100,
    bedingung: { '==': [{ var: 'attr.kraftbetrieben' }, true] },
    pflichten: [
      P(
        'AMVO_7_ACCEPTANCE',
        'STANDARD',
        'Kraftbetriebene Türen unterliegen der Abnahmeprüfpflicht vor der ersten Inbetriebnahme.',
        'AMVO_7',
      ),
      P(
        'AMVO_8_RECURRING',
        'STANDARD',
        'Kraftbetriebene Türen sind wiederkehrend zu prüfen.',
        'AMVO_8',
      ),
    ],
  },
  {
    profil_id: 'TUER_HANDBETRIEBEN',
    label: 'Handbetriebene Tür',
    familie: 'TUER',
    prioritaet: 10,
    pflichten: [
      P(
        'AMVO_7_ACCEPTANCE',
        'KEIN_STANDARDPROFIL',
        'Eine handbetriebene Tür unterliegt nicht allein aufgrund der Bauart der Abnahmeprüfpflicht.',
        'AMVO_7',
      ),
      P(
        'AMVO_8_RECURRING',
        'KEIN_STANDARDPROFIL',
        'Eine handbetriebene Tür unterliegt nicht allein aufgrund der Bauart der wiederkehrenden Prüfpflicht nach § 8 AM-VO.',
        'AMVO_8',
      ),
    ],
  },
  {
    profil_id: 'SCHRANKE_KRAFTBETRIEBEN',
    label: 'Kraftbetriebene Schranke',
    familie: 'SCHRANKE',
    prioritaet: 100,
    bedingung: { '==': [{ var: 'attr.kraftbetrieben' }, true] },
    pflichten: [
      P(
        'AMVO_7_ACCEPTANCE',
        'DIFFERENZIERT',
        'Die Abnahmeprüfpflicht ist anhand der konkreten Ausführung und Einbausituation zu beurteilen.',
        'AMVO_7',
      ),
      P(
        'AMVO_8_RECURRING',
        'STANDARD',
        'Kraftbetriebene Absperreinrichtungen sind wiederkehrend zu prüfen.',
        'AMVO_8',
      ),
    ],
  },

  /* ---- Fahrzeughebebühnen --------------------------------------------- */
  {
    profil_id: 'FHB_STANDARD',
    label: 'Fahrzeughebebühne',
    familie: 'FAHRZEUGHEBEBUEHNE',
    prioritaet: 100,
    pflichten: [
      P(
        'AMVO_7_ACCEPTANCE',
        'STANDARD',
        'Fahrzeughebebühnen sind ausdrücklich von der Abnahmeprüfpflicht erfasst.',
        'AMVO_7',
      ),
      P(
        'AMVO_8_RECURRING',
        'STANDARD',
        'Fahrzeughebebühnen sind ausdrücklich wiederkehrend zu prüfen.',
        'AMVO_8',
      ),
    ],
  },

  /* ---- Krane ----------------------------------------------------------- */
  {
    profil_id: 'KRAN_DIFFERENZIERT',
    label: 'Kran',
    familie: 'KRAN',
    prioritaet: 50,
    pflichten: [
      P(
        'AMVO_7_ACCEPTANCE',
        'DIFFERENZIERT',
        'Bei Kranen bestehen hinsichtlich einzelner Kranarten Differenzierungen. Die Abnahmeprüfpflicht ist anhand der konkreten Kranart zu beurteilen.',
        'AMVO_7',
      ),
      P(
        'AMVO_8_RECURRING',
        'STANDARD',
        'Krane sind wiederkehrend zu prüfen.',
        'AMVO_8',
      ),
    ],
    hinweis:
      'Kranart und Aufstellung sind vor Auswahl der Abnahmeprüfung zu dokumentieren.',
  },

  /* ---- Flurförderzeuge ------------------------------------------------- */
  {
    profil_id: 'FFZ_ARBEITSKORB',
    label: 'Flurförderzeug mit Arbeitskorb',
    familie: 'FLURFOERDERZEUG',
    prioritaet: 110,
    bedingung: { '==': [{ var: 'attr.arbeitskorb' }, true] },
    pflichten: [
      P(
        'AMVO_7_ACCEPTANCE',
        'DIFFERENZIERT',
        'Sonderfall Arbeitskorb: Die Eignung des verwendeten Hebearbeitsmittels und die Herstellerfreigabe sind gesondert zu prüfen.',
        'AMVO_7',
      ),
      P(
        'AMVO_8_RECURRING',
        'STANDARD',
        'Das Arbeitsmittel ist wiederkehrend zu prüfen; bei Arbeitskörben zusätzlich die Eignung des Hebearbeitsmittels.',
        'AMVO_8',
      ),
    ],
    hinweis:
      'Herstellerfreigabe für den Arbeitskorb und die Kombination mit dem Hebearbeitsmittel prüfen.',
  },
  {
    profil_id: 'FFZ_HUBBEWEGTER_FAHRERPLATZ',
    label: 'Hubstapler mit hubbewegtem Fahrerplatz',
    familie: 'FLURFOERDERZEUG',
    prioritaet: 105,
    bedingung: { '==': [{ var: 'attr.fahrerplatzHubbewegt' }, true] },
    pflichten: [
      P(
        'AMVO_7_ACCEPTANCE',
        'DIFFERENZIERT',
        'Hubstapler mit hubbewegtem Fahrerplatz sind gesondert erfasst; die Abnahmeprüfpflicht ist eigens zu beurteilen.',
        'AMVO_7',
      ),
      P(
        'AMVO_8_RECURRING',
        'STANDARD',
        'Selbstfahrende Arbeitsmittel sind wiederkehrend zu prüfen.',
        'AMVO_8',
      ),
    ],
  },
  {
    profil_id: 'FFZ_STANDARD',
    label: 'Selbstfahrendes Flurförderzeug',
    familie: 'FLURFOERDERZEUG',
    prioritaet: 50,
    pflichten: [
      P(
        'AMVO_7_ACCEPTANCE',
        'KEIN_STANDARDPROFIL',
        'Ein gewöhnlicher selbstfahrender Stapler unterliegt nicht allein wegen seiner Bauart der Abnahmeprüfpflicht nach § 7 AM-VO.',
        'AMVO_7',
      ),
      P(
        'AMVO_8_RECURRING',
        'STANDARD',
        'Selbstfahrende Arbeitsmittel sind wiederkehrend zu prüfen.',
        'AMVO_8',
      ),
    ],
  },

  /* ---- Arbeitsbühnen --------------------------------------------------- */
  {
    profil_id: 'ABU_STANDARD',
    label: 'Hubarbeitsbühne',
    familie: 'ARBEITSBUEHNE',
    prioritaet: 50,
    pflichten: [
      P(
        'AMVO_7_ACCEPTANCE',
        'DIFFERENZIERT',
        'Die Abnahmeprüfpflicht hängt von Ausführung und Aufstellung ab und ist im Einzelfall zu beurteilen.',
        'AMVO_7',
      ),
      P(
        'AMVO_8_RECURRING',
        'STANDARD',
        'Hubarbeitsbühnen sind regelmäßig wiederkehrend zu prüfen.',
        'AMVO_8',
      ),
    ],
  },

  /* ---- Förderanlagen --------------------------------------------------- */
  {
    profil_id: 'FOE_STETIG',
    label: 'Stetigförderer',
    familie: 'FOERDERANLAGE',
    prioritaet: 60,
    bauarten: ['STETIGFOERDERER', 'STUECKGUTFOERDERER', 'SCHUETTGUTFOERDERER'],
    pflichten: [
      P(
        'AMVO_7_ACCEPTANCE',
        'KEIN_STANDARDPROFIL',
        'Stetigförderer unterliegen nicht pauschal der Abnahmeprüfpflicht nach § 7 AM-VO.',
        'AMVO_7',
      ),
      P(
        'AMVO_8_RECURRING',
        'DIFFERENZIERT',
        'Die wiederkehrende Prüfpflicht hängt von der konkreten Ausführung ab.',
        'AMVO_8',
      ),
    ],
  },
  {
    profil_id: 'FOE_ALLGEMEIN',
    label: 'Förderanlage',
    familie: 'FOERDERANLAGE',
    prioritaet: 10,
    pflichten: [
      P(
        'AMVO_7_ACCEPTANCE',
        'KEIN_STANDARDPROFIL',
        'Für diese Förderanlage ist keine generische Abnahmeprüfpflicht hinterlegt.',
        'AMVO_7',
      ),
      P(
        'AMVO_8_RECURRING',
        'DIFFERENZIERT',
        'Die wiederkehrende Prüfpflicht ist anhand der Ausführung zu beurteilen.',
        'AMVO_8',
      ),
    ],
  },

  /* ---- Absauganlagen --------------------------------------------------- */
  {
    profil_id: 'ABS_ANDERES_RECHTSPROFIL',
    label: 'Absauganlage — anderes Rechtsprofil',
    familie: 'ABSAUGANLAGE',
    prioritaet: 50,
    pflichten: [
      P(
        'AMVO_7_ACCEPTANCE',
        'KEIN_STANDARDPROFIL',
        'Für Absauganlagen ist kein generisches §-7-Profil hinterlegt. Es kommen andere Rechtsgrundlagen und Prüfregime zur Anwendung.',
        'AMVO_7',
      ),
      P(
        'AMVO_8_RECURRING',
        'KEIN_STANDARDPROFIL',
        'Für Absauganlagen ist kein generisches §-8-Profil hinterlegt. Es kommen andere Rechtsgrundlagen und Prüfregime zur Anwendung.',
        'AMVO_8',
      ),
    ],
    hinweis:
      'Prüfgrundlage gesondert festlegen (Bescheid, Herstellervorgabe, technisches Regelwerk).',
  },

  /* ---- Brandschutzabschlüsse ------------------------------------------ */
  {
    profil_id: 'BSA_KRAFTBETRIEBEN',
    label: 'Kraftbetriebener Brandschutzabschluss',
    familie: 'BRANDSCHUTZABSCHLUSS',
    prioritaet: 100,
    bedingung: { '==': [{ var: 'attr.kraftbetrieben' }, true] },
    pflichten: [
      P(
        'AMVO_7_ACCEPTANCE',
        'DIFFERENZIERT',
        'Maßgeblich ist der Kraftbetrieb, nicht die Brandschutzeigenschaft. Die Abnahmeprüfpflicht ist anhand der konkreten Ausführung zu beurteilen.',
        'AMVO_7',
      ),
      P(
        'AMVO_8_RECURRING',
        'DIFFERENZIERT',
        'Maßgeblich ist der Kraftbetrieb, nicht die Brandschutzeigenschaft.',
        'AMVO_8',
      ),
    ],
    hinweis:
      'Das Brandschutzprüfprofil (TRVB, Bescheid) ist getrennt vom AM-VO-Profil zu führen.',
  },
  {
    profil_id: 'BSA_MANUELL',
    label: 'Manueller Brandschutzabschluss',
    familie: 'BRANDSCHUTZABSCHLUSS',
    prioritaet: 50,
    pflichten: [
      P(
        'AMVO_7_ACCEPTANCE',
        'KEIN_STANDARDPROFIL',
        'Ein manueller Brandschutzabschluss unterliegt nicht allein wegen des Brandschutzes der Abnahmeprüfpflicht nach § 7 AM-VO.',
        'AMVO_7',
      ),
      P(
        'AMVO_8_RECURRING',
        'KEIN_STANDARDPROFIL',
        'Ein manueller Brandschutzabschluss unterliegt nicht allein wegen des Brandschutzes der wiederkehrenden Prüfpflicht nach § 8 AM-VO.',
        'AMVO_8',
      ),
    ],
    hinweis:
      'Prüfgrundlage ist regelmäßig das Brandschutzprofil (TRVB 151 S, Bescheid), nicht die AM-VO.',
  },

  /* ---- Last- und Absturztechnik --------------------------------------- */
  {
    profil_id: 'LAM_STANDARD',
    label: 'Lastaufnahmemittel',
    familie: 'LASTAUFNAHMEMITTEL',
    prioritaet: 50,
    pflichten: [
      P(
        'AMVO_7_ACCEPTANCE',
        'KEIN_STANDARDPROFIL',
        'Für Lastaufnahmeeinrichtungen ist keine generische Abnahmeprüfpflicht hinterlegt.',
        'AMVO_7',
      ),
      P(
        'AMVO_8_RECURRING',
        'STANDARD',
        'Lastaufnahmeeinrichtungen und Anschlagmittel sind wiederkehrend zu prüfen.',
        'AMVO_8',
      ),
    ],
  },
  {
    profil_id: 'ANS_STANDARD',
    label: 'Anschlagmittel für Lasten',
    familie: 'ANSCHLAGMITTEL_LAST',
    prioritaet: 50,
    pflichten: [
      P(
        'AMVO_7_ACCEPTANCE',
        'KEIN_STANDARDPROFIL',
        'Für Anschlagmittel ist keine generische Abnahmeprüfpflicht hinterlegt.',
        'AMVO_7',
      ),
      P(
        'AMVO_8_RECURRING',
        'STANDARD',
        'Anschlagmittel sind wiederkehrend zu prüfen.',
        'AMVO_8',
      ),
    ],
  },
  {
    profil_id: 'APS_EIGENES_PROFIL',
    label: 'Anschlagpunkt für persönliche Absturzsicherung',
    familie: 'ANSCHLAGPUNKT_PSA',
    prioritaet: 50,
    pflichten: [
      P(
        'AMVO_7_ACCEPTANCE',
        'KEIN_STANDARDPROFIL',
        'Anschlageinrichtungen gegen Absturz sind nicht mit Anschlagmitteln für Lasten gleichzusetzen. Für § 7 AM-VO ist kein Standardprofil hinterlegt.',
        'AMVO_7',
      ),
      P(
        'AMVO_8_RECURRING',
        'KEIN_STANDARDPROFIL',
        'Anschlageinrichtungen gegen Absturz sind gesondert zu beurteilen; eine Gleichsetzung mit Last-Anschlagmitteln ist unzulässig.',
        'AMVO_8',
      ),
    ],
    hinweis:
      'Eigenes Prüfprofil auf Grundlage von ÖNORM EN 795 und Herstellervorgaben führen.',
  },

  /* ---- Auffangprofil --------------------------------------------------- */
  {
    profil_id: 'SONSTIGES',
    label: 'Sonstiges Arbeitsmittel',
    familie: 'SONSTIGES',
    prioritaet: 1,
    pflichten: [
      P(
        'AMVO_7_ACCEPTANCE',
        'KEIN_STANDARDPROFIL',
        'Für dieses Arbeitsmittel ist keine Prüfpflicht als Standard hinterlegt.',
        'AMVO_7',
      ),
      P(
        'AMVO_8_RECURRING',
        'KEIN_STANDARDPROFIL',
        'Für dieses Arbeitsmittel ist keine Prüfpflicht als Standard hinterlegt.',
        'AMVO_8',
      ),
    ],
  },
];

/* ==========================================================================
 * Auswertung
 * ======================================================================= */

/** Passt das Profil zu Familie, Bauart und Eigenschaften? */
function passt(profil: LegalProfile, ctx: AssetKontext): boolean {
  if (profil.familie !== ctx.familie) return false;
  if (profil.bauarten && !profil.bauarten.includes(ctx.bauart)) return false;
  if (profil.bedingung && !trifftZu(profil.bedingung, ctx as never)) return false;
  return true;
}

/**
 * Ermittelt das maßgebliche Rechtsprofil. Gibt es keines, wird ein
 * ausdrückliches Auffangprofil erzeugt — nie ein stillschweigendes „gilt".
 */
export function bestimmeProfil(ctx: AssetKontext): LegalProfile {
  const treffer = LEGAL_PROFILES.filter((p) => passt(p, ctx)).sort(
    (a, b) => b.prioritaet - a.prioritaet,
  );
  if (treffer.length > 0) return treffer[0];

  return {
    profil_id: `OHNE_PROFIL_${ctx.familie}`,
    label: 'Kein hinterlegtes Rechtsprofil',
    familie: ctx.familie,
    prioritaet: 0,
    pflichten: [
      P(
        'AMVO_7_ACCEPTANCE',
        'KEIN_STANDARDPROFIL',
        'Für diese Anlagenkonfiguration ist keine Prüfpflicht als Standard hinterlegt.',
        'AMVO_7',
      ),
      P(
        'AMVO_8_RECURRING',
        'KEIN_STANDARDPROFIL',
        'Für diese Anlagenkonfiguration ist keine Prüfpflicht als Standard hinterlegt.',
        'AMVO_8',
      ),
    ],
  };
}

export interface PflichtBeurteilung {
  pruefart: InspectionTypeId;
  status: PflichtStatus;
  begruendung: string;
  regelRef: string;
  profil: LegalProfile;
  /** Verlangt die Kombination eine dokumentierte fachliche Freigabe? */
  freigabePflichtig: boolean;
  /** Hinweistext für die Oberfläche, wenn eine Freigabe nötig ist. */
  hinweis?: string;
}

/**
 * Beurteilt, ob die gewählte Prüfart für dieses Arbeitsmittel als
 * Standardprüfpflicht hinterlegt ist.
 */
export function beurteilePflicht(
  ctx: AssetKontext,
  pruefart: InspectionTypeId,
): PflichtBeurteilung {
  const profil = bestimmeProfil(ctx);
  const regel =
    profil.pflichten.find((p) => p.pruefart === pruefart) ??
    P(
      pruefart,
      'KEIN_STANDARDPROFIL',
      'Für diese Prüfart ist im Rechtsprofil keine Prüfpflicht hinterlegt.',
      '',
    );

  const freigabePflichtig = regel.status !== 'STANDARD';
  return {
    pruefart,
    status: regel.status,
    begruendung: regel.begruendung,
    regelRef: regel.regelRef,
    profil,
    freigabePflichtig,
    hinweis: freigabePflichtig
      ? [HINWEIS_FACHFREIGABE, profil.hinweis].filter(Boolean).join(' ')
      : undefined,
  };
}

/** Alle Prüfpflichten des Profils — für die Anzeige im Anlagenstamm. */
export function pflichtuebersicht(ctx: AssetKontext): PflichtBeurteilung[] {
  const profil = bestimmeProfil(ctx);
  return profil.pflichten.map((r) => ({
    pruefart: r.pruefart,
    status: r.status,
    begruendung: r.begruendung,
    regelRef: r.regelRef,
    profil,
    freigabePflichtig: r.status !== 'STANDARD',
    hinweis: r.status !== 'STANDARD' ? profil.hinweis : undefined,
  }));
}
