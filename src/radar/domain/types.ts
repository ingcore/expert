/**
 * Domänenmodell des INGTEC Automotive Asset Radar.
 *
 * Verbindlich ist die Dreiteilung aus PRD Abschnitt 7. Sie ist keine
 * Geschmacksfrage, sondern die Voraussetzung dafür, dass Historisierung
 * überhaupt funktioniert:
 *
 *   Fahrzeug      das physische Auto — überdauert jedes Inserat
 *   Inserat       eine Veröffentlichung dieses Autos auf einer Plattform
 *   Beobachtung   der zu einem Zeitpunkt gespeicherte Zustand eines Inserates
 *
 * Ein Fahrzeug kann fünf gleichzeitige Inserate haben, ein Inserat dreißig
 * Beobachtungen. Nichts wird überschrieben; Änderungen entstehen aus dem
 * Vergleich aufeinanderfolgender Beobachtungen (Abschnitt 11).
 *
 * Die Namen der Typen entsprechen den Tabellen aus PRD Abschnitt 30, damit die
 * spätere Übernahme in PostgreSQL keine Übersetzungsschicht braucht.
 */

/* ==========================================================================
 * Elementare Wertetypen
 * ======================================================================= */

/** ISO-Zeitpunkt (`2026-03-15T08:00:00.000Z`). */
export type Zeitpunkt = string;

/** Monatsgenaues Datum (`2010-03`) — Erstzulassungen sind selten taggenau. */
export type Monat = string;

export type Getriebe =
  | 'handschalter'
  | 'automatik'
  | 'doppelkupplung'
  | 'unbekannt';

export type Antrieb = 'heck' | 'front' | 'allrad' | 'unbekannt';

export type Verkaeuferart =
  | 'haendler'
  | 'privat'
  | 'auktionshaus'
  | 'unbekannt';

export type Servicehistorie =
  | 'lueckenlos'
  | 'teilweise'
  | 'keine'
  | 'unbekannt';

/** Wie die Unfallfreiheit im Inserat dargestellt wird (Abschnitt 12, 23). */
export type Unfallangabe =
  | 'unfallfrei'
  | 'unfallfrei-laut-vorbesitzer'
  | 'vorschaden-repariert'
  | 'unfallschaden'
  | 'keine-angabe';

/** Zugriffsweg auf eine Datenquelle, PRD Abschnitt 8 — Reihenfolge ist Rangfolge. */
export type Zugriffsart =
  | 'api'
  | 'datenfeed'
  | 'partnerzugang'
  | 'lizenzierter-drittanbieter'
  | 'technischer-webzugriff';

/* ==========================================================================
 * Plattform und Verkäufer
 * ======================================================================= */

/**
 * Tabelle `platforms`. Der Compliance-Block ist nicht schmückendes Beiwerk:
 * PRD Abschnitt 36 verlangt für jede Quelle die dokumentierte Trennung
 * zwischen technischer Zugriffsmöglichkeit und rechtlicher Zulässigkeit.
 */
export interface Plattform {
  id: string;
  name: string;
  kuerzel: string;
  land: string[];
  zugriffsart: Zugriffsart;
  aktiv: boolean;
  /** Rechtlicher Rahmen der Quelle — Abschnitt 36. */
  compliance: {
    grundlage: string;
    nutzungsbedingungen: string;
    speicherdauerTage: number | null;
    weiterverwendung: string;
    bildrechte: string;
    /** Offen benannte Punkte, die vor Produktivbetrieb zu klären sind. */
    offeneFragen: string[];
  };
}

/** Tabelle `sellers`. */
export interface Verkaeufer {
  id: string;
  art: Verkaeuferart;
  name: string;
  ort: string;
  land: string;
  /** Impressum/Firmenbuch vorhanden — Eingang in die Verkäufertransparenz. */
  identitaetBelegt: boolean;
  seitJahr: number | null;
  bewertung: number | null;
  anzahlInserate: number;
}

/* ==========================================================================
 * Bild
 * ======================================================================= */

/**
 * Tabellen `listing_images` und `image_hashes`.
 *
 * Der Wahrnehmungs-Hash ist ein 64-Bit-Wert in Hexadezimalschreibweise. Er
 * stammt aus dem Collector bzw. dem Vision-Service (PRD Abschnitt 31); die
 * Anwendung rechnet nur noch mit Hamming-Abständen darauf.
 */
export interface Bild {
  id: string;
  url: string;
  position: number;
  phash: string;
  /** Aufnahmezeitpunkt aus EXIF, soweit die Plattform ihn nicht entfernt. */
  aufgenommen: Zeitpunkt | null;
  /** Vom Vision-Service erkannte Merkmale, z. B. `felgen:19-zoll-doppelspeiche`. */
  merkmale: string[];
  /**
   * Auffälligkeiten der Bildanalyse (Abschnitt 21). Bewusst als Hinweis
   * formuliert — nie als Tatsachenfeststellung.
   */
  auffaelligkeiten: Bildauffaelligkeit[];
}

export interface Bildauffaelligkeit {
  art:
    | 'lackton'
    | 'spaltmass'
    | 'felgenschaden'
    | 'sitzverschleiss'
    | 'lenkradverschleiss'
    | 'korrosion'
    | 'unterboden'
    | 'nachruestung'
    | 'reifenmix'
    | 'fehlende-abdeckung'
    | 'verkleidung';
  hinweis: string;
  /** 0–100. Unter 60 wird der Hinweis nur nachrangig ausgewiesen. */
  confidence: number;
}

/* ==========================================================================
 * Inseratsdaten — der Inhalt einer Beobachtung
 * ======================================================================= */

/**
 * Der vollständige normalisierte Zustand eines Inserates zu einem Zeitpunkt.
 * Alles, was PRD Abschnitt 9 als Mindestaufnahme fordert.
 *
 * `null` bedeutet durchgehend „im Inserat nicht angegeben" und wird strikt von
 * einem Wert unterschieden — das Verschwinden einer Angabe ist ein eigenes
 * Ereignis (Abschnitt 11) und kann eine Red Flag auslösen (Abschnitt 23).
 */
export interface InseratDaten {
  /* -- Fahrzeugdaten -------------------------------------------------- */
  hersteller: string;
  modell: string;
  baureihe: string;
  variante: string;
  motor: string;
  hubraumCcm: number | null;
  leistungPs: number | null;
  getriebe: Getriebe;
  antrieb: Antrieb;
  erstzulassung: Monat | null;
  produktionsjahr: number | null;
  kilometerstand: number | null;
  farbeAussen: string | null;
  farbeInnen: string | null;
  ausstattung: string[];
  vin: string | null;
  fahrzeugland: string | null;
  vorbesitzer: number | null;
  servicehistorie: Servicehistorie;

  /* -- Verkaufsdaten -------------------------------------------------- */
  preis: number;
  waehrung: string;
  mwstAusweisbar: boolean | null;
  verkaeuferArt: Verkaeuferart;
  verkaeuferName: string;
  standortOrt: string;
  standortLand: string;

  /* -- Textdaten ------------------------------------------------------ */
  titel: string;
  beschreibung: string;
  ausstattungstext: string | null;
  garantie: string | null;
  unfallangabe: Unfallangabe;
  serviceangabe: string | null;
  umbauten: string | null;
  bekannteMaengel: string | null;

  /* -- Bilddaten ------------------------------------------------------ */
  bilder: Bild[];

  /**
   * Im Inserat genannte oder hochgeladene Unterlagen. Grundlage des Evidence
   * Score (Abschnitt 13) — hier steht nur, was das Inserat behauptet zu haben.
   */
  genannteUnterlagen: Belegart[];
}

/* ==========================================================================
 * Beobachtung, Inserat, Fahrzeug
 * ======================================================================= */

/** Tabelle `listing_snapshots`. */
export interface Beobachtung {
  id: string;
  zeitpunkt: Zeitpunkt;
  /** Welcher Connector-Lauf diese Beobachtung erzeugt hat. */
  laufId: string;
  daten: InseratDaten;
}

/** Tabelle `listings`. */
export interface Inserat {
  id: string;
  plattformId: string;
  /** Inserats-ID der Plattform. */
  externeId: string;
  url: string;
  verkaeuferId: string;
  /** Zuordnung durch die Vehicle Identity Engine; `null` bis zur Zuordnung. */
  fahrzeugId: string | null;
  erstEntdeckt: Zeitpunkt;
  zuletztGesehen: Zeitpunkt;
  aktiv: boolean;
  entferntAm: Zeitpunkt | null;
  /** Chronologisch aufsteigend, mindestens ein Eintrag. */
  beobachtungen: Beobachtung[];
}

/** Tabelle `vehicle_identifiers` — Merkmale, die ein Fahrzeug identifizieren. */
export interface Fahrzeugkennung {
  art: 'vin' | 'kennzeichen' | 'plattform-id' | 'bild-hash';
  wert: string;
  quelle: string;
  zeitpunkt: Zeitpunkt;
}

/**
 * Tabelle `vehicles` — die Fahrzeugakte.
 *
 * Sie hält bewusst kaum eigene Sachdaten: Was über das Fahrzeug bekannt ist,
 * wird aus den zugeordneten Inseraten und den Dokumenten konsolidiert
 * (`engine/datenqualitaet.ts`), damit jeder Wert seine Quelle behält.
 */
export interface Fahrzeug {
  id: string;
  /** Verweis auf `model_definitions`; `null`, wenn kein Modell erkannt wurde. */
  modellId: string | null;
  kennungen: Fahrzeugkennung[];
  inseratIds: string[];
  angelegtAm: Zeitpunkt;
  dokumente: Fahrzeugdokument[];
  ereignisse: Fahrzeugereignis[];
  notizen: Notiz[];
  /** Manuell bestätigte Sachverhalte — Ground Truth, Abschnitt 40. */
  nutzerbefunde: Nutzerbefund[];
}

/* ==========================================================================
 * Dokumente, Ereignisse, Notizen
 * ======================================================================= */

export type Belegart =
  | 'serviceheft'
  | 'digitale-servicehistorie'
  | 'rechnung'
  | 'pickerlbericht'
  | 'tuev-bericht'
  | 'gutachten'
  | 'zulassungshistorie'
  | 'importdokument'
  | 'motorrechnung'
  | 'getrieberechnung'
  | 'messprotokoll'
  | 'vorbesitzerunterlagen'
  | 'kaufvertrag'
  | 'diagnosebericht';

/**
 * Tabelle `vehicle_documents`. Die extrahierten Felder entsprechen
 * Abschnitt 41; sie fließen in den Evidence Score ein.
 */
export interface Fahrzeugdokument {
  id: string;
  art: Belegart;
  bezeichnung: string;
  hochgeladenAm: Zeitpunkt;
  /** Extraktion aus dem Dokument — Abschnitt 41. */
  extrahiert: {
    datum: string | null;
    kilometerstand: number | null;
    werkstatt: string | null;
    leistungen: string[];
    kostenEuro: number | null;
  };
  /** 0–100. Wie sicher die Extraktion ist (Abschnitt 34). */
  confidence: number;
  /** Belegt dieses Dokument eine konkrete Behauptung? */
  belegtBehauptungen: string[];
}

/** Tabelle `vehicle_events` — alles, was dem Fahrzeug widerfahren ist. */
export interface Fahrzeugereignis {
  id: string;
  zeitpunkt: Zeitpunkt;
  art:
    | 'inserat-neu'
    | 'inserat-entfernt'
    | 'inserat-zugeordnet'
    | 'preisaenderung'
    | 'kilometeraenderung'
    | 'textaenderung'
    | 'verkaeuferwechsel'
    | 'standortwechsel'
    | 'fotoaenderung'
    | 'angabe-entfernt'
    | 'angabe-ergaenzt'
    | 'wiederinserierung'
    | 'dokument'
    | 'nutzerbefund'
    | 'status';
  text: string;
  inseratId: string | null;
  /** Für die Revision: alter und neuer Wert bleiben erhalten (Abschnitt 35). */
  vorher: string | null;
  nachher: string | null;
}

export interface Notiz {
  id: string;
  zeitpunkt: Zeitpunkt;
  verfasser: string;
  text: string;
}

/**
 * Nutzerfeedback als Ground Truth (Abschnitt 40). Getrennt von automatisch
 * abgeleiteten Informationen gespeichert — es überschreibt sie nie stillschweigend,
 * sondern tritt als eigene, höher gewichtete Quelle daneben.
 */
export interface Nutzerbefund {
  id: string;
  zeitpunkt: Zeitpunkt;
  verfasser: string;
  feld: string;
  behauptungSystem: string;
  befundNutzer: string;
  /** Belegt der Nutzer seinen Befund? */
  beleg: string | null;
}

/* ==========================================================================
 * Änderungen zwischen Beobachtungen
 * ======================================================================= */

export type Aenderungsart =
  | 'preis'
  | 'kilometer'
  | 'text'
  | 'verkaeufer'
  | 'standort'
  | 'fotos'
  | 'angabe-entfernt'
  | 'angabe-ergaenzt'
  | 'ausstattung'
  | 'sonstiges';

export interface Aenderung {
  zeitpunkt: Zeitpunkt;
  art: Aenderungsart;
  feld: string;
  bezeichnung: string;
  vorher: string | null;
  nachher: string | null;
  /** Vorzeichenbehaftete Differenz bei Zahlenfeldern. */
  differenz: number | null;
}

/* ==========================================================================
 * Watchlist, Portfolio, Alerts
 * ======================================================================= */

export type WatchlistStatus =
  | 'beobachten'
  | 'kontaktieren'
  | 'unterlagen-angefordert'
  | 'technisch-pruefen'
  | 'probefahrt'
  | 'verhandlung'
  | 'kaufentscheidung'
  | 'abgelehnt'
  | 'gekauft';

/** Tabelle `watchlists`. */
export interface Watchlisteintrag {
  id: string;
  fahrzeugId: string;
  status: WatchlistStatus;
  aufgenommenAm: Zeitpunkt;
  geaendertAm: Zeitpunkt;
  verantwortlich: string;
  bemerkung: string;
  /** Abgearbeitete Punkte der technischen Prüfung (Abschnitt 43). */
  pruefung: Pruefpunktergebnis[];
  /** Freigegebene und versendete Verkäuferanfrage (Abschnitt 42). */
  anfrageVersendetAm: Zeitpunkt | null;
}

export type Pruefstatus =
  | 'nicht-geprueft'
  | 'bestanden'
  | 'nicht-bestanden'
  | 'mangel'
  | 'hinweis';

export interface Pruefpunktergebnis {
  punktId: string;
  status: Pruefstatus;
  bemerkung: string;
  geprueftAm: Zeitpunkt | null;
  geprueftVon: string | null;
}

/** Tabelle `portfolio_vehicles`. */
export interface Portfoliofahrzeug {
  id: string;
  fahrzeugId: string | null;
  bezeichnung: string;
  modellId: string | null;
  kaufdatum: string;
  kaufpreis: number;
  nebenkosten: number;
  kilometerstandKauf: number;
  kilometerstandAktuell: number;
  /** Aktueller Marktwert; aus der Bewertungsengine oder manuell gesetzt. */
  marktwertAktuell: number;
  verkauf: { datum: string; preis: number } | null;
  transaktionen: Portfoliotransaktion[];
}

/** Tabelle `portfolio_transactions`. */
export interface Portfoliotransaktion {
  id: string;
  datum: string;
  art:
    | 'service'
    | 'restauration'
    | 'versicherung'
    | 'steuer'
    | 'wartung'
    | 'reifen'
    | 'sonstiges';
  bezeichnung: string;
  betrag: number;
}

export type Alertkanal = 'web' | 'email' | 'push' | 'teams' | 'sms';

/** Tabelle `alerts`. */
export interface Alert {
  id: string;
  zeitpunkt: Zeitpunkt;
  ausloeser:
    | 'neuer-a-kandidat'
    | 'preisreduktion'
    | 'score-schwelle'
    | 'kritische-aenderung'
    | 'vergleichbares-fahrzeug'
    | 'inserat-entfernt'
    | 'wiederinserierung';
  fahrzeugId: string;
  titel: string;
  text: string;
  dringlichkeit: 'hoch' | 'mittel' | 'niedrig';
  gelesen: boolean;
  kanaele: Alertkanal[];
  /** Verhindert, dass derselbe Sachverhalt zweimal meldet (Abschnitt 27). */
  entprellschluessel: string;
}

/* ==========================================================================
 * Suchauftrag
 * ======================================================================= */

/** Zielmodelle und Grenzen eines Such- oder Überwachungsauftrags (§6.1, §6.2). */
export interface Suchauftrag {
  id: string;
  name: string;
  aktiv: boolean;
  modellIds: string[];
  preisMax: number | null;
  preisMin: number | null;
  kilometerMax: number | null;
  baujahrMin: number | null;
  mindestalterMonate: number | null;
  getriebe: Getriebe[];
  laender: string[];
  originalzustandBevorzugt: boolean;
  /** Ab welchem Gesamtrang gemeldet wird — hält die Alert-Flut klein (§27). */
  meldungAbRang: Kandidatenrang;
  kanaele: Alertkanal[];
  angelegtAm: Zeitpunkt;
}

/** Grobklassierung eines Kandidaten; A ist die kleinste und beste Gruppe. */
export type Kandidatenrang = 'A' | 'B' | 'C' | 'D';

/* ==========================================================================
 * Rollen und Audit
 * ======================================================================= */

export type Rolle =
  | 'administrator'
  | 'analyst'
  | 'techniker'
  | 'einkauf'
  | 'management'
  | 'read-only';

export interface Benutzer {
  id: string;
  name: string;
  rolle: Rolle;
}

/** Revisionsfähiger Eintrag nach Abschnitt 35. */
export interface Auditeintrag {
  id: string;
  zeitpunkt: Zeitpunkt;
  benutzer: string;
  quelle: string;
  objekt: string;
  feld: string;
  vorher: string | null;
  nachher: string | null;
  systementscheidung: string | null;
  scoreaenderung: string | null;
}
