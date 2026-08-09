/**
 * Systemparameter — PRD Abschnitte 24, 27, 28, 37 und 38.
 *
 * Alle Gewichtungen und Schwellen stehen hier an **einer** Stelle und sind
 * administrativ änderbar. Abschnitt 24 verlangt das für die steuerlichen
 * Parameter des Firmenwagenmodus ausdrücklich („dürfen nicht fest im
 * Programmcode hinterlegt werden"); für die Score-Gewichte folgt dasselbe aus
 * Abschnitt 37, wonach Administratoren Score-Gewichtungen verwalten.
 *
 * Die Werte unten sind Vorgaben, keine Konstanten: Die Anwendung liest sie aus
 * dem Zustand, nicht aus diesem Modul. Diese Datei liefert nur die
 * Ausgangsbelegung und die Typen dazu.
 */

import type { AssetKriterium } from '../wissen/modelle';
import type { Alertkanal, Kandidatenrang } from '../domain/types';

/* ==========================================================================
 * Offer Integrity Score — Abschnitt 12
 * ======================================================================= */

export type IntegritaetKomponente =
  | 'datenvollstaendigkeit'
  | 'historienkonsistenz'
  | 'textkonsistenz'
  | 'kilometerplausibilitaet'
  | 'schadenstransparenz'
  | 'bildplausibilitaet'
  | 'verkaeufertransparenz'
  | 'preisplausibilitaet'
  | 'wiederinserierung'
  | 'dokumentationsqualitaet';

export const INTEGRITAET_LABEL: Record<IntegritaetKomponente, string> = {
  datenvollstaendigkeit: 'Datenvollständigkeit',
  historienkonsistenz: 'Historienkonsistenz',
  textkonsistenz: 'Textkonsistenz',
  kilometerplausibilitaet: 'Kilometerplausibilität',
  schadenstransparenz: 'Schadenstransparenz',
  bildplausibilitaet: 'Bildplausibilität',
  verkaeufertransparenz: 'Verkäufertransparenz',
  preisplausibilitaet: 'Preisplausibilität',
  wiederinserierung: 'Wiederinserierungshistorie',
  dokumentationsqualitaet: 'Dokumentationsqualität',
};

/** Beispielgewichtung aus PRD Abschnitt 12. */
export const INTEGRITAET_GEWICHTE: Record<IntegritaetKomponente, number> = {
  datenvollstaendigkeit: 10,
  historienkonsistenz: 15,
  textkonsistenz: 10,
  kilometerplausibilitaet: 15,
  schadenstransparenz: 10,
  bildplausibilitaet: 10,
  verkaeufertransparenz: 10,
  preisplausibilitaet: 10,
  wiederinserierung: 5,
  dokumentationsqualitaet: 5,
};

/* ==========================================================================
 * Evidence Score — Abschnitt 13
 * ======================================================================= */

export type EvidenzKomponente =
  | 'behauptungsdeckung'
  | 'servicenachweis'
  | 'reparaturnachweis'
  | 'zustandsnachweis'
  | 'herkunftsnachweis';

export const EVIDENZ_LABEL: Record<EvidenzKomponente, string> = {
  behauptungsdeckung: 'Deckung der Behauptungen durch Unterlagen',
  servicenachweis: 'Servicenachweis',
  reparaturnachweis: 'Nachweis größerer Reparaturen',
  zustandsnachweis: 'Zustandsnachweis durch Dritte',
  herkunftsnachweis: 'Herkunfts- und Zulassungsnachweis',
};

export const EVIDENZ_GEWICHTE: Record<EvidenzKomponente, number> = {
  behauptungsdeckung: 35,
  servicenachweis: 25,
  reparaturnachweis: 20,
  zustandsnachweis: 12,
  herkunftsnachweis: 8,
};

/* ==========================================================================
 * Automotive Asset Score — Abschnitt 14
 * ======================================================================= */

export const ASSET_GEWICHTE: Record<AssetKriterium, number> = {
  seltenheit: 9,
  'historische-bedeutung': 8,
  antriebskonzept: 9,
  designrelevanz: 5,
  produktionsmenge: 5,
  modellgeneration: 5,
  sondermodellstatus: 4,
  originalitaet: 5,
  marktnachfrage: 8,
  'globale-nachfrage': 6,
  markenstaerke: 8,
  ersatzteilversorgung: 5,
  restaurierbarkeit: 5,
  marktliquiditaet: 6,
  preisentwicklung: 6,
  sammlerrelevanz: 6,
};

/* ==========================================================================
 * Individual Vehicle Quality Score — Abschnitt 15
 * ======================================================================= */

export type QualitaetKriterium =
  | 'laufleistung'
  | 'vorbesitzer'
  | 'originalzustand'
  | 'sonderausstattung'
  | 'farbkombination'
  | 'servicehistorie'
  | 'unfallhistorie'
  | 'technischer-zustand'
  | 'innenraumzustand'
  | 'karosseriezustand'
  | 'umbauten'
  | 'matching-numbers'
  | 'dokumentationsqualitaet';

export const QUALITAET_LABEL: Record<QualitaetKriterium, string> = {
  laufleistung: 'Laufleistung',
  vorbesitzer: 'Vorbesitzer',
  originalzustand: 'Originalzustand',
  sonderausstattung: 'Sonderausstattung',
  farbkombination: 'Farbkombination',
  servicehistorie: 'Servicehistorie',
  unfallhistorie: 'Unfallhistorie',
  'technischer-zustand': 'Technischer Zustand',
  innenraumzustand: 'Innenraumzustand',
  karosseriezustand: 'Karosseriezustand',
  umbauten: 'Umbauten',
  'matching-numbers': 'Matching Numbers',
  dokumentationsqualitaet: 'Dokumentationsqualität',
};

export const QUALITAET_GEWICHTE: Record<QualitaetKriterium, number> = {
  laufleistung: 12,
  vorbesitzer: 6,
  originalzustand: 12,
  sonderausstattung: 7,
  farbkombination: 6,
  servicehistorie: 13,
  unfallhistorie: 13,
  'technischer-zustand': 12,
  innenraumzustand: 5,
  karosseriezustand: 6,
  umbauten: 4,
  'matching-numbers': 2,
  dokumentationsqualitaet: 2,
};

/* ==========================================================================
 * Market Momentum Score — Abschnitt 18
 * ======================================================================= */

export type MomentumKomponente =
  | 'angebotsmenge'
  | 'medianpreis'
  | 'standzeit'
  | 'nachfrage'
  | 'spitzenpreise'
  | 'spreizung';

export const MOMENTUM_LABEL: Record<MomentumKomponente, string> = {
  angebotsmenge: 'Angebotsmenge',
  medianpreis: 'Medianpreis',
  standzeit: 'Standzeit',
  nachfrage: 'Nachfrage (Zu- und Abgänge)',
  spitzenpreise: 'Preise guter Exemplare',
  spreizung: 'Spreizung Durchschnitt zu Bestzustand',
};

export const MOMENTUM_GEWICHTE: Record<MomentumKomponente, number> = {
  angebotsmenge: 20,
  medianpreis: 22,
  standzeit: 18,
  nachfrage: 15,
  spitzenpreise: 15,
  spreizung: 10,
};

/* ==========================================================================
 * Gesamtparameter
 * ======================================================================= */

export interface Systemparameter {
  integritaet: Record<IntegritaetKomponente, number>;
  evidenz: Record<EvidenzKomponente, number>;
  asset: Record<AssetKriterium, number>;
  qualitaet: Record<QualitaetKriterium, number>;
  momentum: Record<MomentumKomponente, number>;

  /** Vehicle Identity Engine — Abschnitt 10. */
  identitaet: {
    /** Ab hier automatische Zuordnung zur selben Fahrzeugakte. */
    schwelleAutomatisch: number;
    /** Darunter bis hier: Grenzfall, manuelle Prüfung. */
    schwelleManuell: number;
    /** Maximaler Hamming-Abstand zweier Bild-Hashes für „gleiches Bild". */
    bildHashSchwelle: number;
  };

  /** Firmenwagenmodus — Abschnitt 24, ausdrücklich konfigurierbar. */
  firmenwagen: {
    anschaffungspreisMax: number;
    mindestalterMonate: number;
    assetMin: number;
    integrityMin: number;
    /** 0–100; wie gut das Fahrzeug betrieblich nutzbar sein muss. */
    nutzbarkeitMin: number;
    /** Steuerlicher Hinweistext — bewusst Text, keine Berechnung. */
    steuerhinweis: string;
  };

  /** Buy Signal — Abschnitt 28. */
  buySignal: {
    integrityMin: number;
    evidenceMin: number;
    assetMin: number;
    qualitaetMin: number;
    /** Höchstens zulässige Abweichung über dem Fair Value, in Prozent. */
    preisabweichungMax: number;
    kritischeRedFlagsErlaubt: number;
  };

  /** Kandidatenränge — Abschnitt 46, priorisierte Kandidatenliste. */
  rang: { a: number; b: number; c: number };

  /** Alert Engine — Abschnitt 27. */
  alerts: {
    preisreduktionProzent: number;
    /** Wie viele Tage ein bereits gemeldeter Sachverhalt gesperrt bleibt. */
    entprellungTage: number;
    standardkanaele: Alertkanal[];
    meldungAbRang: Kandidatenrang;
  };

  /** Datenqualität — Abschnitt 34. */
  datenqualitaet: {
    /** Ab dieser Confidence gilt ein Wert als belastbar. */
    schwelleBelastbar: number;
  };
}

export const VORGABE_PARAMETER: Systemparameter = {
  integritaet: INTEGRITAET_GEWICHTE,
  evidenz: EVIDENZ_GEWICHTE,
  asset: ASSET_GEWICHTE,
  qualitaet: QUALITAET_GEWICHTE,
  momentum: MOMENTUM_GEWICHTE,

  identitaet: {
    schwelleAutomatisch: 88,
    schwelleManuell: 62,
    bildHashSchwelle: 8,
  },

  firmenwagen: {
    anschaffungspreisMax: 40000,
    mindestalterMonate: 60,
    assetMin: 75,
    integrityMin: 75,
    nutzbarkeitMin: 50,
    steuerhinweis:
      'Angemessenheitsgrenze, Vorsteuerabzug und Privatnutzung sind je Einzelfall mit der Steuerberatung abzustimmen. Die Anwendung prüft ausschließlich die hinterlegten Parameter und ersetzt keine steuerliche Beratung.',
  },

  buySignal: {
    integrityMin: 85,
    evidenceMin: 80,
    assetMin: 85,
    qualitaetMin: 80,
    preisabweichungMax: 0,
    kritischeRedFlagsErlaubt: 0,
  },

  rang: { a: 80, b: 68, c: 55 },

  alerts: {
    preisreduktionProzent: 5,
    entprellungTage: 14,
    standardkanaele: ['web', 'email'],
    meldungAbRang: 'B',
  },

  datenqualitaet: {
    schwelleBelastbar: 75,
  },
};

/** Tiefe Kopie der Vorgabe — der Zustand darf die Vorgabe nicht verändern. */
export function vorgabeParameter(): Systemparameter {
  return JSON.parse(JSON.stringify(VORGABE_PARAMETER)) as Systemparameter;
}
