/**
 * Prüfintervall für §-8-Arbeitsmittel (PRD Abschnitt 10).
 *
 * Das System speichert **zwei** Termine:
 *
 *   1. den geplanten Prüftermin — standardmäßig zwölf Monate nach der
 *      letzten Prüfung,
 *   2. den spätesten rechtlich zulässigen Termin aus der Regel „mindestens
 *      einmal pro Kalenderjahr **und** höchstens 15 Monate Abstand".
 *
 * Ein einfaches `Prüfdatum + 15 Monate` wäre falsch: Die Kalenderjahrregel
 * kann früher binden (AC-12).
 */

/* ==========================================================================
 * Datumshilfen — rein kalendarisch, ohne Zeitzonenanteil
 * ======================================================================= */

/** Zerlegt ein ISO-Datum (YYYY-MM-DD) in seine Bestandteile. */
function zerlege(iso: string): { jahr: number; monat: number; tag: number } {
  const [j, m, t] = iso.slice(0, 10).split('-').map(Number);
  if (!Number.isFinite(j) || !Number.isFinite(m) || !Number.isFinite(t)) {
    throw new Error(`Ungültiges Datum: ${iso}`);
  }
  return { jahr: j, monat: m, tag: t };
}

function formatiere(jahr: number, monat: number, tag: number): string {
  const mm = String(monat).padStart(2, '0');
  const tt = String(tag).padStart(2, '0');
  return `${jahr}-${mm}-${tt}`;
}

/** Letzter Tag des Monats — für Monatsadditionen auf Monatsenden. */
function letzterTag(jahr: number, monat: number): number {
  return new Date(Date.UTC(jahr, monat, 0)).getUTCDate();
}

/**
 * Addiert Monate kalendarisch. Der 31. Jänner plus einen Monat ergibt den
 * 28. bzw. 29. Februar, nicht den 2. oder 3. März.
 */
export function plusMonate(iso: string, monate: number): string {
  const { jahr, monat, tag } = zerlege(iso);
  const gesamt = (jahr * 12 + (monat - 1)) + monate;
  const neuesJahr = Math.floor(gesamt / 12);
  const neuerMonat = (gesamt % 12) + 1;
  const maxTag = letzterTag(neuesJahr, neuerMonat);
  return formatiere(neuesJahr, neuerMonat, Math.min(tag, maxTag));
}

/** Differenz in ganzen Monaten zwischen zwei ISO-Daten. */
export function monateZwischen(von: string, bis: string): number {
  const a = zerlege(von);
  const b = zerlege(bis);
  let monate = (b.jahr - a.jahr) * 12 + (b.monat - a.monat);
  if (b.tag < a.tag) monate -= 1;
  return monate;
}

/* ==========================================================================
 * Fälligkeit
 * ======================================================================= */

export interface Intervall {
  /** Datum der letzten Prüfung. */
  letztePruefung: string;
  /** Geplanter Prüftermin — zwölf Monate nach der letzten Prüfung. */
  geplant: string;
  /** Spätester rechtlich zulässiger Termin. */
  spaetestens: string;
  /** Welche der beiden Regeln den späteren Termin begrenzt. */
  massgeblicheRegel: 'KALENDERJAHR' | 'FRIST_15_MONATE';
  /** Begründung im Klartext — erscheint in der Oberfläche. */
  begruendung: string;
}

/**
 * Berechnet geplanten und spätesten Prüftermin.
 *
 * Die Kalenderjahrregel verlangt eine Prüfung in jedem Kalenderjahr: Nach
 * einer Prüfung im Jahr N ist spätestens am 31.12. des Jahres N+1 erneut zu
 * prüfen. Die 15-Monats-Frist begrenzt zusätzlich. Maßgeblich ist der
 * **frühere** der beiden Termine.
 */
export function berechneIntervall(letztePruefung: string): Intervall {
  const { jahr } = zerlege(letztePruefung);

  const geplant = plusMonate(letztePruefung, 12);
  const kalenderjahrEnde = formatiere(jahr + 1, 12, 31);
  const frist15 = plusMonate(letztePruefung, 15);

  const kalenderjahrBindet = kalenderjahrEnde <= frist15;
  const spaetestens = kalenderjahrBindet ? kalenderjahrEnde : frist15;

  return {
    letztePruefung,
    geplant,
    spaetestens,
    massgeblicheRegel: kalenderjahrBindet ? 'KALENDERJAHR' : 'FRIST_15_MONATE',
    begruendung: kalenderjahrBindet
      ? `Maßgeblich ist die Regel „mindestens einmal je Kalenderjahr": Nach der Prüfung im Jahr ${jahr} ist spätestens bis 31.12.${jahr + 1} erneut zu prüfen. Die 15-Monats-Frist liefe erst am ${deutsch(frist15)} ab.`
      : `Maßgeblich ist der Höchstabstand von 15 Monaten: Er endet am ${deutsch(frist15)} und damit vor dem Ende des Kalenderjahres ${jahr + 1}.`,
  };
}

/* ==========================================================================
 * Fälligkeitsstatus
 * ======================================================================= */

export type FaelligkeitsStatus =
  | 'IM_PLAN'
  | 'PLANTERMIN_UEBERSCHRITTEN'
  | 'FRIST_UEBERSCHRITTEN';

export interface Faelligkeit extends Intervall {
  status: FaelligkeitsStatus;
  /** Verbleibende Tage bis zum spätesten zulässigen Termin. */
  tageBisFrist: number;
}

/** Tagesdifferenz zwischen zwei ISO-Daten. */
export function tageZwischen(von: string, bis: string): number {
  const a = Date.parse(`${von.slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${bis.slice(0, 10)}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

/** Beurteilt die Fälligkeit gegenüber einem Stichtag. */
export function beurteileFaelligkeit(
  letztePruefung: string,
  stichtag: string,
): Faelligkeit {
  const intervall = berechneIntervall(letztePruefung);
  const status: FaelligkeitsStatus =
    stichtag > intervall.spaetestens
      ? 'FRIST_UEBERSCHRITTEN'
      : stichtag > intervall.geplant
        ? 'PLANTERMIN_UEBERSCHRITTEN'
        : 'IM_PLAN';
  return {
    ...intervall,
    status,
    tageBisFrist: tageZwischen(stichtag, intervall.spaetestens),
  };
}

/* ==========================================================================
 * Nichtverwendung
 * ======================================================================= */

/**
 * Warnung bei einer Nichtverwendung von mehr als 15 Monaten: Vor neuerlicher
 * Verwendung ist eine Prüfung erforderlich (PRD 10).
 */
export function warnungNichtverwendung(
  letzteVerwendung: string,
  stichtag: string,
): string | null {
  const monate = monateZwischen(letzteVerwendung, stichtag);
  if (monate <= 15) return null;
  return (
    `Das Arbeitsmittel wurde seit ${deutsch(letzteVerwendung)} und damit seit ` +
    `mehr als 15 Monaten (${monate} Monate) nicht verwendet. Vor neuerlicher ` +
    'Verwendung ist eine Prüfung durchzuführen.'
  );
}

/* ==========================================================================
 * Darstellung
 * ======================================================================= */

/** ISO-Datum in österreichischer Schreibweise. */
export function deutsch(iso: string | null): string {
  if (!iso) return '—';
  const { jahr, monat, tag } = zerlege(iso);
  return `${String(tag).padStart(2, '0')}.${String(monat).padStart(2, '0')}.${jahr}`;
}

/** Heutiges Datum als ISO-Tagesdatum. */
export function heute(): string {
  return new Date().toISOString().slice(0, 10);
}
