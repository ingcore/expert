/**
 * Referenzdaten und Beschriftungen für das Brandschutzkonzept.
 * Quellen: OIB-Richtlinie 2 (Ausgabe 2023), OIB-Begriffsbestimmungen,
 * TRVB-Reihe des Österreichischen Bundesfeuerwehrverbandes, ÖNORM EN 13501.
 */

import type {
  AnlagenArt,
  AnlagenStatus,
  AbschnittTyp,
  BauteilKategorie,
  Bauweise,
  Fachbereich,
  Feuerwiderstandsklasse,
  FluchtwegArt,
  Gebaeudeklasse,
  Geschaeftsbereich,
  Konzeptanlass,
  Leistungsart,
  LoeschhilfeArt,
  MangelArt,
  MassnahmeStatus,
  Nutzungsart,
  ProjektStatus,
  Risikoklasse,
  SafetyScore,
} from './types';

export interface Option<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

/* ==========================================================================
 * SAFETY-SCORE
 * ======================================================================= */

export interface SafetyScoreDefinition {
  score: SafetyScore;
  kurz: string;
  beschreibung: string;
  farbe: string;
  textfarbe: string;
  /** Empfohlene maximale Umsetzungsfrist in Tagen (null = keine Frist). */
  fristTage: number | null;
}

export const SAFETY_SCORES: SafetyScoreDefinition[] = [
  {
    score: 'A',
    kurz: 'Hinweis / kein Mangel',
    beschreibung:
      'Evtl. Hinweis, kein brandschutztechnischer Mangel vorhanden.',
    farbe: 'var(--score-a)',
    textfarbe: 'var(--score-a-ink)',
    fristTage: null,
  },
  {
    score: 'B',
    kurz: 'geringfügiger Mangel',
    beschreibung: 'Kleinere Abweichungen ohne unmittelbare Gefährdung.',
    farbe: 'var(--score-b)',
    textfarbe: 'var(--score-b-ink)',
    fristTage: 365,
  },
  {
    score: 'C',
    kurz: 'mittlerer Mangel',
    beschreibung: 'Erhöhtes Brandrisiko, Maßnahmen erforderlich.',
    farbe: 'var(--score-c)',
    textfarbe: 'var(--score-c-ink)',
    fristTage: 180,
  },
  {
    score: 'D',
    kurz: 'schwerwiegender Mangel',
    beschreibung: 'Hohe Brandgefahr, dringender Handlungsbedarf.',
    farbe: 'var(--score-d)',
    textfarbe: 'var(--score-d-ink)',
    fristTage: 30,
  },
  {
    score: 'E',
    kurz: 'akuter Mangel',
    beschreibung:
      'Unmittelbare Gefahr, Mängel müssen sofort behoben werden.',
    farbe: 'var(--score-e)',
    textfarbe: 'var(--score-e-ink)',
    fristTage: 0,
  },
];

export const SCORE_BY_KEY: Record<SafetyScore, SafetyScoreDefinition> =
  Object.fromEntries(SAFETY_SCORES.map((s) => [s.score, s])) as Record<
    SafetyScore,
    SafetyScoreDefinition
  >;

/** Gewichtung für den aggregierten Risikoindex eines Projekts. */
export const SCORE_GEWICHT: Record<SafetyScore, number> = {
  A: 0,
  B: 1,
  C: 3,
  D: 8,
  E: 20,
};

/* ==========================================================================
 * Gebäudeklassen (OIB-RL 2, Punkt 1)
 * ======================================================================= */

export interface GebaeudeklasseDefinition {
  klasse: Gebaeudeklasse;
  kurz: string;
  beschreibung: string;
  /** Maximales Fluchtniveau in Metern (null = unbegrenzt). */
  maxFluchtniveau: number | null;
  /** Erforderlicher Feuerwiderstand tragender Bauteile oberirdisch. */
  tragwerk: Feuerwiderstandsklasse;
  /** Feuerwiderstand von Trenndecken. */
  trenndecke: Feuerwiderstandsklasse;
}

export const GEBAEUDEKLASSEN: GebaeudeklasseDefinition[] = [
  {
    klasse: 'GK1',
    kurz: 'Freistehend, max. 3 oberirdische Geschoße',
    beschreibung:
      'Freistehendes Gebäude mit höchstens drei oberirdischen Geschoßen, Fluchtniveau bis 7 m, nicht mehr als zwei Wohnungen oder Betriebseinheiten mit je max. 400 m².',
    maxFluchtniveau: 7,
    tragwerk: 'keine',
    trenndecke: 'REI30',
  },
  {
    klasse: 'GK2',
    kurz: 'Gekuppelt/gereiht, max. 3 Geschoße',
    beschreibung:
      'Gebäude mit höchstens drei oberirdischen Geschoßen und einem Fluchtniveau von nicht mehr als 7 m, mit höchstens fünf Wohnungen oder Betriebseinheiten.',
    maxFluchtniveau: 7,
    tragwerk: 'REI30',
    trenndecke: 'REI30',
  },
  {
    klasse: 'GK3',
    kurz: 'Max. 3 Geschoße, Fluchtniveau bis 7 m',
    beschreibung:
      'Gebäude mit höchstens drei oberirdischen Geschoßen und einem Fluchtniveau von nicht mehr als 7 m, das nicht GK1 oder GK2 entspricht.',
    maxFluchtniveau: 7,
    tragwerk: 'REI60',
    trenndecke: 'REI60',
  },
  {
    klasse: 'GK4',
    kurz: 'Fluchtniveau bis 11 m',
    beschreibung:
      'Gebäude mit höchstens vier oberirdischen Geschoßen und einem Fluchtniveau von nicht mehr als 11 m.',
    maxFluchtniveau: 11,
    tragwerk: 'REI60',
    trenndecke: 'REI60',
  },
  {
    klasse: 'GK5',
    kurz: 'Fluchtniveau über 11 m / Sonderbauten',
    beschreibung:
      'Gebäude mit einem Fluchtniveau von mehr als 11 m sowie Gebäude mit mehr als vier oberirdischen Geschoßen; darüber hinaus Bauwerke besonderer Art und Nutzung.',
    maxFluchtniveau: null,
    tragwerk: 'REI90',
    trenndecke: 'REI90',
  },
];

export const GK_BY_KEY: Record<Gebaeudeklasse, GebaeudeklasseDefinition> =
  Object.fromEntries(GEBAEUDEKLASSEN.map((g) => [g.klasse, g])) as Record<
    Gebaeudeklasse,
    GebaeudeklasseDefinition
  >;

/* ==========================================================================
 * Grenzwerte aus dem Regelwerk
 * ======================================================================= */

/**
 * Maximale Fluchtweglängen in Metern.
 * OIB-RL 2 Punkt 5: 40 m im Regelfall; für Bereiche mit erhöhtem Risiko
 * bzw. ohne zweiten Fluchtweg gelten reduzierte Werte.
 */
export const FLUCHTWEG_MAX_LAENGE: Record<Risikoklasse, number> = {
  normal: 40,
  erhoeht: 30,
  hoch: 20,
};

/** Mindestbreite von Fluchtwegen in Metern (OIB-RL 2, Punkt 5.2). */
export const FLUCHTWEG_MIN_BREITE = 1.2;

/**
 * Erforderliche Fluchtwegbreite je 100 Personen in Metern.
 * Faustwert aus OIB-RL 2 / TRVB-Praxis: 0,10 m je Person, mind. 1,20 m.
 */
export const FLUCHTWEG_BREITE_JE_PERSON = 0.01;

/**
 * Maximale Brandabschnittsflächen in m² je Nutzungsart (Richtwerte
 * OIB-RL 2 Punkt 3 bzw. TRVB; im Einzelfall behördlich abweichend).
 */
export const MAX_BRANDABSCHNITT: Record<Nutzungsart, number> = {
  wohnen: 1600,
  buero: 1600,
  handel: 1600,
  produktion: 1200,
  lager: 800,
  garage: 1600,
  versammlung: 1200,
  beherbergung: 1200,
  bildung: 1600,
  gesundheit: 1200,
  sonstige: 1200,
};

/**
 * Personenzahl, ab der eine Nutzungseinheit als Versammlungsstätte mit
 * erhöhten Anforderungen gilt (Sicherheitsbeleuchtung, zweiter Fluchtweg).
 */
export const SCHWELLE_VERSAMMLUNG_PERSONEN = 120;

/**
 * Personenzahl, ab der ein Notausgang mit Panikbeschlag auszuführen ist
 * (AStV § 20 in Verbindung mit ÖNORM EN 1125).
 */
export const SCHWELLE_PANIKBESCHLAG_PERSONEN = 100;

/** Grundschutz Löschmitteleinheiten je m² nach TRVB F 124. */
export const LE_JE_QM = 0.05;

/** Mindest-Löschmitteleinheiten je Geschoß/Bereich nach TRVB F 124. */
export const LE_MINDEST = 6;

/** Maximale Wegstrecke zum nächsten Handfeuerlöscher in Metern. */
export const MAX_WEG_ZU_LOESCHER = 40;

/* ==========================================================================
 * Regelwerkskatalog
 *
 * Einzige Quelle ist der Normenkatalog der Regel-Engine — er ist zugleich die
 * Positivliste des Rückabgleichs. Eine zweite Liste würde auseinanderlaufen.
 * ======================================================================= */

export { NORMENKATALOG as REGELWERKE } from '@/engine/regelwerk/normen';
export type { NormEintrag as Regelwerk } from '@/engine/regelwerk/normen';

/* ==========================================================================
 * Beschriftungen für Auswahlfelder
 * ======================================================================= */

export const NUTZUNGSARTEN: Option<Nutzungsart>[] = [
  { value: 'wohnen', label: 'Wohnen' },
  { value: 'buero', label: 'Büro / Verwaltung' },
  { value: 'handel', label: 'Handel / Verkauf' },
  { value: 'produktion', label: 'Produktion / Werkstätte' },
  { value: 'lager', label: 'Lager' },
  { value: 'garage', label: 'Garage / Stellplatz' },
  { value: 'versammlung', label: 'Versammlungsstätte' },
  { value: 'beherbergung', label: 'Beherbergung' },
  { value: 'bildung', label: 'Bildungseinrichtung' },
  { value: 'gesundheit', label: 'Gesundheit / Pflege' },
  { value: 'sonstige', label: 'Sonstige Nutzung' },
];

export const BAUWEISEN: Option<Bauweise>[] = [
  { value: 'massiv', label: 'Massivbauweise' },
  { value: 'holzbau', label: 'Holzbauweise' },
  { value: 'stahlbau', label: 'Stahlbauweise' },
  { value: 'mischbauweise', label: 'Mischbauweise' },
];

export const RISIKOKLASSEN: Option<Risikoklasse>[] = [
  { value: 'normal', label: 'Normal', hint: 'Fluchtweg bis 40 m' },
  { value: 'erhoeht', label: 'Erhöht', hint: 'Fluchtweg bis 30 m' },
  { value: 'hoch', label: 'Hoch', hint: 'Fluchtweg bis 20 m' },
];

export const FEUERWIDERSTANDSKLASSEN: Option<Feuerwiderstandsklasse>[] = [
  { value: 'keine', label: 'keine Anforderung' },
  { value: 'EI30', label: 'EI 30' },
  { value: 'EI60', label: 'EI 60' },
  { value: 'EI90', label: 'EI 90' },
  { value: 'REI30', label: 'REI 30' },
  { value: 'REI60', label: 'REI 60' },
  { value: 'REI90', label: 'REI 90' },
  { value: 'REI120', label: 'REI 120' },
  { value: 'REI180', label: 'REI 180' },
  { value: 'EI2-30-C', label: 'EI₂ 30-C (Tür)' },
  { value: 'EI2-60-C', label: 'EI₂ 60-C (Tür)' },
  { value: 'EI2-90-C', label: 'EI₂ 90-C (Tür)' },
  { value: 'E30-C', label: 'E 30-C' },
  { value: 'EI30-S', label: 'EI 30-S (rauchdicht)' },
  { value: 'EI90-S', label: 'EI 90-S (rauchdicht)' },
];

/**
 * Rangfolge der Feuerwiderstandsklassen für den Soll-/Ist-Vergleich.
 * Türklassen werden über ihre Widerstandsdauer eingeordnet.
 */
export const FW_RANG: Record<Feuerwiderstandsklasse, number> = {
  keine: 0,
  'E30-C': 25,
  EI30: 30,
  'EI2-30-C': 30,
  'EI30-S': 32,
  REI30: 35,
  EI60: 60,
  'EI2-60-C': 60,
  REI60: 65,
  EI90: 90,
  'EI2-90-C': 90,
  'EI90-S': 92,
  REI90: 95,
  REI120: 120,
  REI180: 180,
};

export const ABSCHNITT_TYPEN: Option<AbschnittTyp>[] = [
  { value: 'BA', label: 'Brandabschnitt' },
  { value: 'BBA', label: 'Brandbekämpfungsabschnitt' },
];

export const BAUTEIL_KATEGORIEN: Option<BauteilKategorie>[] = [
  { value: 'tragwerk', label: 'Tragende Konstruktion' },
  { value: 'aussenwand', label: 'Außenwand / Fassade' },
  { value: 'trennwand', label: 'Brandabschnittswand / Trennwand' },
  { value: 'decke', label: 'Decke' },
  { value: 'dach', label: 'Dach' },
  { value: 'treppenhaus', label: 'Treppenhaus' },
  { value: 'schacht', label: 'Schacht / Installationsschacht' },
  { value: 'tuer', label: 'Brandschutztür / -abschluss' },
  { value: 'verglasung', label: 'Brandschutzverglasung' },
  { value: 'durchfuehrung', label: 'Leitungs-/Rohrdurchführung' },
];

export const FLUCHTWEG_ARTEN: Option<FluchtwegArt>[] = [
  { value: 'hauptfluchtweg', label: 'Hauptfluchtweg' },
  { value: 'nebenfluchtweg', label: 'Nebenfluchtweg' },
  { value: 'notausgang', label: 'Notausgang' },
  { value: 'treppenhaus', label: 'Treppenhaus' },
  { value: 'aussentreppe', label: 'Außentreppe' },
];

export const LOESCHHILFE_ARTEN: Option<LoeschhilfeArt>[] = [
  { value: 'handfeuerloescher', label: 'Handfeuerlöscher' },
  { value: 'wandhydrant', label: 'Wandhydrant' },
  { value: 'loeschdecke', label: 'Löschdecke' },
  { value: 'fahrbarer-loescher', label: 'Fahrbarer Löscher' },
];

export interface AnlagenDefinition {
  art: AnlagenArt;
  label: string;
  regelwerk: string;
}

export const ANLAGEN_ARTEN: AnlagenDefinition[] = [
  { art: 'BMA', label: 'Brandmeldeanlage', regelwerk: 'TRVB S 123' },
  { art: 'RWA', label: 'Rauch- und Wärmeabzug', regelwerk: 'TRVB S 125' },
  { art: 'SPA', label: 'Sprinkleranlage', regelwerk: 'TRVB S 127' },
  { art: 'ALA', label: 'Alarmierungsanlage', regelwerk: 'TRVB S 158' },
  { art: 'SIB', label: 'Sicherheitsbeleuchtung', regelwerk: 'ÖVE/ÖNORM E 8002' },
  { art: 'BSK', label: 'Brandschutzklappen', regelwerk: 'ÖNORM EN 15650' },
  { art: 'FEU', label: 'Feuerwehraufzug / Aufzugsteuerung', regelwerk: 'ÖNORM EN 81-72' },
  { art: 'GAS', label: 'Gaslöschanlage', regelwerk: 'TRVB S 151' },
  { art: 'ENT', label: 'Entrauchung / Druckbelüftung', regelwerk: 'TRVB S 125' },
];

export const ANLAGEN_STATUS: Option<AnlagenStatus>[] = [
  { value: 'vorhanden', label: 'Vorhanden' },
  { value: 'geplant', label: 'Geplant' },
  { value: 'nachzuruesten', label: 'Nachzurüsten' },
  { value: 'nicht-erforderlich', label: 'Nicht erforderlich' },
];

export const MANGEL_ARTEN: Option<MangelArt>[] = [
  { value: 'b', label: 'baulich' },
  { value: 't', label: 'technisch' },
  { value: 'o', label: 'organisatorisch' },
  { value: 'e', label: 'Empfehlung' },
];

export const MASSNAHME_STATUS: Option<MassnahmeStatus>[] = [
  { value: 'offen', label: 'Offen' },
  { value: 'in-umsetzung', label: 'In Umsetzung' },
  { value: 'erledigt', label: 'Erledigt' },
  { value: 'entfallen', label: 'Entfallen' },
];

export const PROJEKT_STATUS: Option<ProjektStatus>[] = [
  { value: 'entwurf', label: 'Entwurf' },
  { value: 'in-pruefung', label: 'In Prüfung' },
  { value: 'freigegeben', label: 'Freigegeben' },
  { value: 'eingereicht', label: 'Bei Behörde eingereicht' },
  { value: 'archiviert', label: 'Archiviert' },
];

export const KONZEPTANLAESSE: Option<Konzeptanlass>[] = [
  { value: 'neubau', label: 'Neubau' },
  { value: 'zubau', label: 'Zubau / Erweiterung' },
  { value: 'umbau', label: 'Umbau' },
  { value: 'nutzungsaenderung', label: 'Nutzungsänderung' },
  { value: 'bestandsanalyse', label: 'Bestandsanalyse' },
  { value: 'feuerbeschau', label: 'Feuerbeschau' },
];

/* ==========================================================================
 * INGTEC-Nummernschema
 * ======================================================================= */

export const GESCHAEFTSBEREICHE: Option<Geschaeftsbereich>[] = [
  { value: 'BS', label: 'BS — Brandschutz' },
  { value: 'MB', label: 'MB — Maschinenbau' },
  { value: 'SZ', label: 'SZ — Sicherheitstechn. Zentrum' },
  { value: 'SV', label: 'SV — Sachverständige' },
  { value: 'GW', label: 'GW — Gewerberecht' },
  { value: 'EX', label: 'EX — Explosionsschutz' },
  { value: 'LOG', label: 'LOG — Logistik / Spesen' },
];

export const FACHBEREICHE: Option<Fachbereich>[] = [
  { value: 'BAU', label: 'BAU — Baulicher Brandschutz' },
  { value: 'TEC', label: 'TEC — Technischer Brandschutz' },
  { value: 'ORG', label: 'ORG — Organisatorischer Brandschutz' },
  { value: 'PRF', label: 'PRF — Prüfungen' },
  { value: 'KTZ', label: 'KTZ — Kontroll-/Prüfbücher' },
  { value: 'GUT', label: 'GUT — Gutachten' },
  { value: 'EAI', label: 'EAI — Einreichung / Verfahren' },
];

export const LEISTUNGSARTEN: Option<Leistungsart>[] = [
  { value: 'KON', label: 'KON — Konzept' },
  { value: 'FB', label: 'FB — Feuerbeschau' },
  { value: 'GA', label: 'GA — Gutachten' },
  { value: 'PLA', label: 'PLA — Planung' },
  { value: 'WKP', label: 'WKP — wiederkehrende Prüfung' },
  { value: 'ABN', label: 'ABN — Abnahme' },
  { value: 'REV', label: 'REV — Revision' },
  { value: 'ABS', label: 'ABS — Abschluss' },
  { value: 'WTG', label: 'WTG — Wartung' },
  { value: 'UNT', label: 'UNT — Unterweisung' },
  { value: 'BSB', label: 'BSB — Brandschutzbeauftragter' },
  { value: 'REG', label: 'REG — Regelwerk' },
  { value: 'KBU', label: 'KBU — Kontrollbuch' },
  { value: 'PBU', label: 'PBU — Prüfbuch' },
  { value: 'SER', label: 'SER — Service' },
];
