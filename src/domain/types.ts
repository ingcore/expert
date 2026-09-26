/**
 * Fachliches Datenmodell für Brandschutzkonzepte nach österreichischem
 * Regelwerk (OIB-Richtlinie 2 in der Fassung 2023, TRVB-Reihe, ASchG/AStV).
 *
 * Alle Maße in SI-Einheiten: Längen in Metern, Flächen in m², Volumen in m³,
 * Durchflüsse in l/min, Brandlasten in MJ/m².
 *
 * Die Gebäudeklasse ist bewusst kein Feld dieses Modells: Sie wird von der
 * Regel-Engine aus `klassenEingabe` berechnet und nie eingegeben.
 */

import type { Bundesland } from '@/engine/types';

export type { Bundesland };

/* ==========================================================================
 * Stammdaten
 * ======================================================================= */

/** Geschäftsbereiche laut INGTEC-Artikelnummernschema. */
export type Geschaeftsbereich =
  | 'BS' // Brandschutz
  | 'MB' // Maschinenbau
  | 'SZ' // Sicherheitstechnisches Zentrum
  | 'SV' // Sachverständige
  | 'GW' // Gewerberecht
  | 'EX' // Explosionsschutz
  | 'LOG'; // Logistik/Spesen

/** Fachbereiche laut INGTEC-Artikelnummernschema. */
export type Fachbereich =
  | 'BAU' // Baulicher Brandschutz
  | 'TEC' // Technischer Brandschutz
  | 'ORG' // Organisatorischer Brandschutz
  | 'PRF' // Prüfungen
  | 'KTZ' // Kontroll-/Prüfbücher
  | 'GUT' // Gutachten
  | 'EAI'; // Einreichung/Verfahren

/**
 * Leistungsarten. Sonderregel laut INGTEC-Schema: Feuerbeschau wird immer
 * mit `FB` abgekürzt, `PRF` bleibt allgemeinen Prüfungen vorbehalten.
 */
export type Leistungsart =
  | 'FB' // Feuerbeschau
  | 'WKP' // wiederkehrende Prüfung
  | 'ABN' // Abnahme
  | 'REV' // Revision
  | 'ABS' // Abschluss
  | 'WTG' // Wartung
  | 'KON' // Konzept
  | 'PLA' // Planung
  | 'GA' // Gutachten
  | 'UNT' // Unterweisung
  | 'BSB' // Brandschutzbeauftragter
  | 'REG' // Regelwerk
  | 'KBU' // Kontrollbuch
  | 'PBU' // Prüfbuch
  | 'SER'; // Service

export interface Auftraggeber {
  name: string;
  /** 4-stellige INGTEC-Kundennummer mit führenden Nullen, z. B. "0219". */
  kundennummer: string;
  strasse: string;
  plz: string;
  ort: string;
  ansprechpartner: string;
  telefon: string;
  email: string;
}

export interface Objekt {
  bezeichnung: string;
  strasse: string;
  plz: string;
  ort: string;
  katastralgemeinde: string;
  grundstuecksnummer: string;
  baujahr: number | null;
  /** Zuständige Baubehörde / Gemeinde. */
  behoerde: string;
}

export interface Bearbeiter {
  name: string;
  rolle: string;
  /** z. B. "Ingenieurkonsulent für Maschinenbau", "Brandschutzbeauftragter". */
  qualifikation: string;
  email: string;
}

/* ==========================================================================
 * Gebäude und Bauwerkskenndaten (OIB-RL 2)
 * ======================================================================= */

/**
 * Gebäudeklasse nach OIB-Richtlinie 2, Punkt 1.
 * GK1–GK5 steuern nahezu alle baulichen Anforderungen.
 */
export type Gebaeudeklasse = 'GK1' | 'GK2' | 'GK3' | 'GK4' | 'GK5';

/** Bauweise nach OIB-Begriffsbestimmungen. */
export type Bauweise = 'massiv' | 'holzbau' | 'stahlbau' | 'mischbauweise';

/** Risikoklassen für Sonderbauten / erhöhte Anforderungen. */
export type Risikoklasse = 'normal' | 'erhoeht' | 'hoch';

/**
 * Kenndaten des Bauwerks.
 *
 * `gebaeudeklasse` fehlt hier absichtlich — sie wird von der Regel-Engine aus
 * Fluchtniveau, Geschoßanzahl und Nutzungseinheiten abgeleitet (FR-2.1) und
 * darf nicht als Eingabe geführt werden.
 */
export interface Gebaeudedaten {
  bauweise: Bauweise;
  /** Fluchtniveau: Fußbodenoberkante des obersten Geschoßes in Metern. */
  fluchtniveau: number;
  /** Anzahl oberirdischer Geschoße. */
  geschosseOberirdisch: number;
  /** Anzahl Kellergeschoße. */
  geschosseUnterirdisch: number;
  /** Brutto-Grundfläche gesamt in m². */
  bruttoGrundflaeche: number;
  /** Größte zusammenhängende Brandabschnittsfläche in m². */
  groessterBrandabschnitt: number;
  /** Umbauter Raum in m³. */
  umbauterRaum: number;
  risikoklasse: Risikoklasse;
  /** Freie Beschreibung der Konstruktion und Tragstruktur. */
  konstruktionsbeschreibung: string;
}

/* ==========================================================================
 * Nutzung
 * ======================================================================= */

/**
 * Nutzungsarten mit unterschiedlichen brandschutztechnischen Anforderungen.
 * Wohnen und Büro sind Regelfälle; alle übrigen lösen Zusatzprüfungen aus.
 */
export type Nutzungsart =
  | 'wohnen'
  | 'buero'
  | 'handel'
  | 'produktion'
  | 'lager'
  | 'garage'
  | 'versammlung'
  | 'beherbergung'
  | 'bildung'
  | 'gesundheit'
  | 'sonstige';

export interface Nutzungseinheit {
  id: string;
  bezeichnung: string;
  nutzungsart: Nutzungsart;
  /** Geschoßbezeichnung, z. B. "EG", "1.OG", "KG". */
  geschoss: string;
  flaeche: number;
  /** Höchste gleichzeitig anwesende Personenzahl. */
  personenzahl: number;
  /** Spezifische Brandlast in MJ/m² (0 = nicht ermittelt). */
  brandlast: number;
  /** Zuordnung zu einem Brandabschnitt. */
  brandabschnittId: string | null;
  bemerkung: string;
}

/* ==========================================================================
 * Baulicher Brandschutz
 * ======================================================================= */

/**
 * Feuerwiderstandsklassen nach ÖNORM EN 13501-2.
 * R = Tragfähigkeit, E = Raumabschluss, I = Wärmedämmung,
 * C = Selbstschließeinrichtung, S = Rauchdichtheit.
 */
export type Feuerwiderstandsklasse =
  | 'keine'
  | 'EI30'
  | 'EI60'
  | 'EI90'
  | 'REI30'
  | 'REI60'
  | 'REI90'
  | 'REI120'
  | 'REI180'
  | 'EI2-30-C'
  | 'EI2-60-C'
  | 'EI2-90-C'
  | 'E30-C'
  | 'EI30-S'
  | 'EI90-S';

/** Abschnittstyp: Brandabschnitt oder Brandbekämpfungsabschnitt. */
export type AbschnittTyp = 'BA' | 'BBA';

export interface Brandabschnitt {
  id: string;
  /** Kurzbezeichnung, z. B. "BA 01". */
  bezeichnung: string;
  typ: AbschnittTyp;
  flaeche: number;
  /** Feuerwiderstand der abschnittsbildenden Bauteile. */
  trennbauteil: Feuerwiderstandsklasse;
  /** Geschoße, über die sich der Abschnitt erstreckt. */
  geschosse: string;
  /** Vorhandene Brandschutzklappen/-abschlüsse dokumentiert? */
  abschluesseDokumentiert: boolean;
  beschreibung: string;
}

/** Bauteilkategorien für den Bauteilnachweis. */
export type BauteilKategorie =
  | 'tragwerk'
  | 'aussenwand'
  | 'trennwand'
  | 'decke'
  | 'dach'
  | 'treppenhaus'
  | 'schacht'
  | 'tuer'
  | 'verglasung'
  | 'durchfuehrung';

export interface Bauteil {
  id: string;
  bezeichnung: string;
  kategorie: BauteilKategorie;
  /** Tatsächlich ausgeführte bzw. festgestellte Klasse. */
  istKlasse: Feuerwiderstandsklasse;
  /** Nach Regelwerk erforderliche Klasse. */
  sollKlasse: Feuerwiderstandsklasse;
  /** Nachweisdokument, Verwendbarkeitsnachweis, Prüfzeugnis. */
  nachweis: string;
  bemerkung: string;
}

/* ==========================================================================
 * Flucht- und Rettungswege (OIB-RL 2 Punkt 5)
 * ======================================================================= */

export type FluchtwegArt =
  | 'hauptfluchtweg'
  | 'nebenfluchtweg'
  | 'notausgang'
  | 'treppenhaus'
  | 'aussentreppe';

export interface Fluchtweg {
  id: string;
  bezeichnung: string;
  art: FluchtwegArt;
  /** Tatsächliche Fluchtweglänge in Metern. */
  laenge: number;
  /** Nutzbare lichte Breite in Metern. */
  breite: number;
  /** Anzahl der über diesen Weg zu entfluchtenden Personen. */
  personen: number;
  /** Führt der Weg ins Freie oder in einen sicheren Bereich? */
  fuehrtInsFreie: boolean;
  sicherheitsbeleuchtung: boolean;
  fluchtwegorientierung: boolean;
  /** Panikbeschlag bzw. Notausgangsverschluss vorhanden. */
  panikbeschlag: boolean;
  bemerkung: string;
}

/* ==========================================================================
 * Löschhilfen und Löschwasser (TRVB F 124, TRVB F 128)
 * ======================================================================= */

export type LoeschhilfeArt =
  | 'handfeuerloescher'
  | 'wandhydrant'
  | 'loeschdecke'
  | 'fahrbarer-loescher';

export interface Loeschhilfe {
  id: string;
  art: LoeschhilfeArt;
  /** Aufstellungsort/Bereich. */
  standort: string;
  anzahl: number;
  /** Löschmitteleinheiten je Gerät (LE) nach TRVB F 124. */
  loeschmitteleinheiten: number;
  /** Letzte Überprüfung (ISO-Datum, leer = unbekannt). */
  letztePruefung: string;
  bemerkung: string;
}

export interface Loeschwasserversorgung {
  /** Verfügbare Löschwassermenge in l/min. */
  menge: number;
  /** Erforderliche Menge laut Regelwerk/Behörde in l/min. */
  erforderlich: number;
  /** Dauer der Bereitstellung in Minuten. */
  dauer: number;
  /** Entfernung zum nächsten Hydranten in Metern. */
  hydrantEntfernung: number;
  /** Löschwasserrückhaltung erforderlich (wassergefährdende Stoffe). */
  rueckhaltungErforderlich: boolean;
  bemerkung: string;
}

/* ==========================================================================
 * Anlagentechnischer Brandschutz
 * ======================================================================= */

export type AnlagenArt =
  | 'BMA' // Brandmeldeanlage, TRVB S 123
  | 'RWA' // Rauch- und Wärmeabzug, TRVB S 125
  | 'SPA' // Sprinkleranlage, TRVB S 127
  | 'ALA' // Alarmierungsanlage, TRVB S 158
  | 'SIB' // Sicherheitsbeleuchtung, ÖVE/ÖNORM E 8002
  | 'BSK' // Brandschutzklappen
  | 'FEU' // Feuerwehraufzug / Aufzugsteuerung
  | 'GAS' // Gaslöschanlage
  | 'ENT'; // Entrauchung/Druckbelüftung

/** Ausführungsstatus einer brandschutztechnischen Anlage. */
export type AnlagenStatus =
  | 'vorhanden'
  | 'geplant'
  | 'nachzuruesten'
  | 'nicht-erforderlich';

export interface Brandschutzanlage {
  id: string;
  art: AnlagenArt;
  status: AnlagenStatus;
  /** Anwendbares Regelwerk, z. B. "TRVB S 123". */
  regelwerk: string;
  /** Schutzumfang, z. B. "Vollschutz", "Teilschutz EG–2.OG". */
  schutzumfang: string;
  /** Weiterleitung zur Feuerwehr/Alarmzentrale vorhanden. */
  aufschaltung: boolean;
  letztePruefung: string;
  naechstePruefung: string;
  bemerkung: string;
}

/* ==========================================================================
 * Organisatorischer Brandschutz (TRVB O 119, TRVB O 121)
 * ======================================================================= */

export interface OrganisatorischerBrandschutz {
  brandschutzbeauftragterErforderlich: boolean;
  brandschutzbeauftragter: string;
  brandschutzwarte: number;
  brandschutzordnungVorhanden: boolean;
  /** Brandschutzpläne nach TRVB O 121. */
  brandschutzplaeneVorhanden: boolean;
  brandschutzplaeneStand: string;
  /** Feuerwehr-Laufkarten für die BMA. */
  laufkartenVorhanden: boolean;
  raeumungsuebungIntervallMonate: number;
  letzteRaeumungsuebung: string;
  eigenkontrolleIntervallMonate: number;
  /** Brandschutzbuch/Kontrollbuch geführt. */
  brandschutzbuchGefuehrt: boolean;
  bemerkung: string;
}

/* ==========================================================================
 * Maßnahmen / Mängel mit SAFETY-SCORE
 * ======================================================================= */

/**
 * INGTEC SAFETY-SCORE:
 *  A = Hinweis / kein Mangel
 *  B = geringfügiger Mangel
 *  C = mittlerer Mangel, Maßnahmen erforderlich
 *  D = schwerwiegender Mangel, dringender Handlungsbedarf
 *  E = akuter Mangel, unmittelbare Gefahr
 */
export type SafetyScore = 'A' | 'B' | 'C' | 'D' | 'E';

/** Mangelart laut INGTEC-Mängelliste. */
export type MangelArt =
  | 'b' // baulich
  | 't' // technisch
  | 'o' // organisatorisch
  | 'e'; // Empfehlung

export type MassnahmeStatus = 'offen' | 'in-umsetzung' | 'erledigt' | 'entfallen';

/** Bewertetes Berichtskapitel, dem ein Mangel für den Teilscore zugeordnet ist. */
export type BerichtsKapitel = '5' | '6' | '7' | '8' | '9';

export interface Massnahme {
  id: string;
  /** Laufende Nummer in der Mängelliste. */
  lfdNr: number;
  /** Objekt/Bereich, in dem der Mangel festgestellt wurde. */
  bereich: string;
  beschreibung: string;
  massnahme: string;
  art: MangelArt;
  score: SafetyScore;
  status: MassnahmeStatus;
  /** Berichtskapitel für den Teilscore (CD 1.1, Kapitel 5). */
  kapitel: BerichtsKapitel;
  /**
   * Verbleibende Abweichung ohne Maßnahme (z. B. kompensierter Bestand):
   * bleibt im Soll-Score enthalten.
   */
  verbleibend: boolean;
  /** Rechtsgrundlage/Regelwerk, z. B. "OIB-RL 2, Pkt. 5.2.1". */
  grundlage: string;
  /** Umsetzungsfrist als ISO-Datum. */
  frist: string;
  verantwortlich: string;
  /** Geschätzte Kosten in Euro (0 = nicht bewertet). */
  kosten: number;
  bemerkung: string;
}

/* ==========================================================================
 * Abweichungen im Sinne des OIB-Konzepts
 * ======================================================================= */

export interface Abweichung {
  id: string;
  /**
   * ID der betroffenen Anforderung aus der Matrix. Leer, wenn die Abweichung
   * keiner maschinell geprüften Anforderung zugeordnet ist (FR-3.1).
   */
  anforderungId: string;
  /** Von welcher Anforderung wird abgewichen (Klartext). */
  anforderung: string;
  /** Beschreibung der geplanten Abweichung. */
  beschreibung: string;
  /** Kompensierende Maßnahme. */
  kompensation: string;
  /** Nachweisführung: Ingenieurmethoden, Vergleichsbetrachtung, Gutachten. */
  nachweis: string;
  /**
   * Gleichwertigkeitsbeurteilung — ausschließlich manuell. Das System trifft
   * hierzu keine Aussage (LP-4, FR-3.3).
   */
  gleichwertigkeitBeurteiltVon: string;
  gleichwertigkeitBeurteiltAm: string;
  /** Von der Behörde bereits genehmigt. */
  genehmigt: boolean;
}

/* ==========================================================================
 * Projekt / Konzept
 * ======================================================================= */

export type ProjektStatus =
  | 'entwurf'
  | 'in-pruefung'
  | 'freigegeben'
  | 'eingereicht'
  | 'archiviert';

/* ==========================================================================
 * Freigabe und Nachvollziehbarkeit
 * ======================================================================= */

/**
 * Dokumentierte fachliche Freigabe (LP-4, FR-6.1). Ohne Freigabe ist kein
 * Export möglich; das System gibt nie selbst frei.
 */
export interface Freigabe {
  freigegebenVon: string;
  /** Rolle bzw. Befugnis der freigebenden Person. */
  rolle: string;
  freigegebenAm: string;
  /** Zustand des Rückabgleichs zum Freigabezeitpunkt. */
  rueckabgleichBefunde: number;
  /**
   * Ausnahmefreigabe trotz offener Befunde. Nur mit Begründung zulässig und
   * im Prüfprotokoll gesondert ausgewiesen.
   */
  ausnahme: boolean;
  ausnahmeBegruendung: string;
}

/** Art eines Audit-Eintrags. */
export type AuditArt =
  | 'projekt-angelegt'
  | 'matrix-ausgewertet'
  | 'text-erzeugt'
  | 'rueckabgleich'
  | 'freigabe'
  | 'freigabe-widerrufen'
  | 'export';

/**
 * Eintrag des Audit-Trails (FR-7.1). Entspricht der Tabelle `generierungen`
 * des Zieldatenmodells und ist nach dem Anlegen unveränderlich (FR-7.2).
 */
export interface AuditEintrag {
  id: string;
  art: AuditArt;
  zeitpunkt: string;
  benutzer: string;
  /** Kurzbeschreibung des Vorgangs. */
  beschreibung: string;
  /** Verwendetes Modell bei KI-gestützten Schritten, sonst leer. */
  modell: string;
  /** Hash der Eingabe, damit der Vorgang reproduzierbar bleibt. */
  eingabeHash: string;
  /** Regelstand, gegen den ausgewertet wurde (FR-7.3). */
  regelstand: string;
}

/** Anlass des Konzepts. */
export type Konzeptanlass =
  | 'neubau'
  | 'zubau'
  | 'umbau'
  | 'nutzungsaenderung'
  | 'bestandsanalyse'
  | 'feuerbeschau';

export interface Berichtsnummer {
  geschaeftsbereich: Geschaeftsbereich;
  fachbereich: Fachbereich;
  /** Anlagen-/Objektkürzel, z. B. "ALL", "BMA", "RWA". */
  anlage: string;
  leistungsart: Leistungsart;
  /** 3-stellige laufende Nummer. */
  sequenz: string;
}

export interface Projekt {
  id: string;
  /** Kurztitel des Projekts. */
  titel: string;
  status: ProjektStatus;
  anlass: Konzeptanlass;
  /** Erstellungs-/Begehungsdatum als ISO-Datum. */
  datum: string;
  erstelltAm: string;
  geaendertAm: string;

  /** Bundesland, dessen Overlay anzuwenden ist (FR-1.1, FR-2.4). */
  bundesland: Bundesland;
  /**
   * OIB-Ausgabestand, gegen den ausgewertet wird. Je Projekt fixiert, damit
   * eine Novelle laufende Verfahren nicht verändert (FR-2.6).
   */
  oibAusgabe: string;

  /**
   * Angaben, aus denen die Gebäudeklasse berechnet wird. Die Klasse selbst
   * wird nie eingegeben.
   */
  klassenEingabe: {
    /** Anzahl Wohnungen bzw. Betriebseinheiten. */
    nutzungseinheitenAnzahl: number | null;
    /** Größte Fläche einer einzelnen Nutzungseinheit in m². */
    groessteEinheitFlaeche: number | null;
    freistehend: boolean | null;
  };

  /** Istwerte je Anforderungs-ID für den Soll-/Ist-Vergleich der Engine. */
  istWerte: Record<string, string | number | boolean | null>;

  /** Dokumentierte Freigabe; null, solange nicht freigegeben (LP-4). */
  freigabe: Freigabe | null;

  /** Unveränderlicher Audit-Trail (FR-7.1, FR-7.2). */
  audit: AuditEintrag[];

  auftraggeber: Auftraggeber;
  objekt: Objekt;
  bearbeiter: Bearbeiter;
  berichtsnummer: Berichtsnummer;

  gebaeude: Gebaeudedaten;
  nutzungseinheiten: Nutzungseinheit[];
  brandabschnitte: Brandabschnitt[];
  bauteile: Bauteil[];
  fluchtwege: Fluchtweg[];
  loeschhilfen: Loeschhilfe[];
  loeschwasser: Loeschwasserversorgung;
  anlagen: Brandschutzanlage[];
  organisation: OrganisatorischerBrandschutz;
  massnahmen: Massnahme[];
  abweichungen: Abweichung[];

  /** Freitextkapitel des Konzepts. */
  auftragsgegenstand: string;
  grundlagen: string;
  conclusio: string;
}

/* ==========================================================================
 * Prüfregeln
 * ======================================================================= */

export type BefundSchwere = 'info' | 'hinweis' | 'warnung' | 'fehler';

export interface Befund {
  /** Stabile Regel-ID, z. B. "OIB2-FW-LAENGE". */
  regelId: string;
  schwere: BefundSchwere;
  titel: string;
  beschreibung: string;
  /** Zitierte Rechts-/Regelwerksgrundlage. */
  grundlage: string;
  /** Kapitel, in dem der Befund auftritt. */
  kapitel: string;
  /** Vorschlag für den SAFETY-SCORE, falls daraus eine Maßnahme wird. */
  scoreVorschlag: SafetyScore | null;
}
