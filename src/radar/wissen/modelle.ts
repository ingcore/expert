/**
 * Modellkatalog — Tabelle `model_definitions`, PRD Abschnitt 30.
 *
 * Der Katalog trägt zwei Dinge, die im Produkt streng auseinandergehalten
 * werden müssen:
 *
 *   `assetKriterien`  Eigenschaften des **Modells** — Seltenheit, Bedeutung,
 *                     Nachfrage. Sie gelten für jeden E92 M3 gleichermaßen und
 *                     speisen den Automotive Asset Score (Abschnitt 14).
 *   `bewertung`       Parameter der Marktwertrechnung (Abschnitt 16).
 *
 * Was das **konkrete** Fahrzeug ausmacht — Laufleistung, Zustand, Historie —
 * steht hier bewusst nicht. Das ist Sache des Individual Vehicle Quality Score
 * (Abschnitt 15). Die Trennung ist der Grund, warum ein Modell mit Asset Score
 * 90 ein einzelnes schlecht umgebautes Exemplar mit Quality Score 52 haben kann.
 *
 * Die Bewertungen sind fachliche Einschätzungen des MVP-Startkorpus
 * (Abschnitt 46) und keine gemessenen Marktwerte. Sie sind über die
 * Verwaltung änderbar und über den Score jederzeit nachvollziehbar.
 */

import type { Antrieb, Getriebe } from '../domain/types';

/** Die sechzehn Kriterien aus PRD Abschnitt 14. */
export type AssetKriterium =
  | 'seltenheit'
  | 'historische-bedeutung'
  | 'antriebskonzept'
  | 'designrelevanz'
  | 'produktionsmenge'
  | 'modellgeneration'
  | 'sondermodellstatus'
  | 'originalitaet'
  | 'marktnachfrage'
  | 'globale-nachfrage'
  | 'markenstaerke'
  | 'ersatzteilversorgung'
  | 'restaurierbarkeit'
  | 'marktliquiditaet'
  | 'preisentwicklung'
  | 'sammlerrelevanz';

export const ASSET_KRITERIUM_LABEL: Record<AssetKriterium, string> = {
  seltenheit: 'Seltenheit',
  'historische-bedeutung': 'Historische Bedeutung',
  antriebskonzept: 'Motor- und Antriebskonzept',
  designrelevanz: 'Designrelevanz',
  produktionsmenge: 'Produktionsmenge',
  modellgeneration: 'Modellgeneration',
  sondermodellstatus: 'Sondermodellstatus',
  originalitaet: 'Originalitätsanspruch der Baureihe',
  marktnachfrage: 'Marktnachfrage',
  'globale-nachfrage': 'Globale Nachfrage',
  markenstaerke: 'Markenstärke',
  ersatzteilversorgung: 'Ersatzteilversorgung',
  restaurierbarkeit: 'Restaurierbarkeit',
  marktliquiditaet: 'Marktliquidität',
  preisentwicklung: 'Laufende Preisentwicklung',
  sammlerrelevanz: 'Langfristige Sammlerrelevanz',
};

/** Parameter der Marktwertrechnung, Abschnitt 16. */
export interface Bewertungsbasis {
  /** Wert eines Referenzexemplars bei `referenzKm` und `referenzAlter`. */
  basispreis: number;
  referenzKm: number;
  referenzAlterJahre: number;
  /** Wertabschlag je 1.000 km oberhalb der Referenz, in Euro. */
  kmAbschlagJe1000: number;
  /** Jährlicher Wertabschlag oberhalb des Referenzalters, als Faktor. */
  alterFaktorProJahr: number;
  /** Wertuntergrenze — unterhalb trägt die Substanz, nicht mehr die Laufleistung. */
  bodenwert: number;
  /** Getriebeaufschläge als Faktor auf den Basiswert. */
  getriebeFaktor: Partial<Record<Getriebe, number>>;
  /** Aufschlagsfähige Ausstattung: Schlüssel → Faktor. */
  ausstattungsFaktor: Record<string, number>;
  /** Typische Standzeit guter Exemplare in Tagen — Grundlage der Liquidität. */
  standzeitTage: number;
  /** Wie viele vergleichbare Fahrzeuge der Markt im Mittel gleichzeitig zeigt. */
  angebotsdichte: number;
}

export interface Modelldefinition {
  id: string;
  hersteller: string;
  modell: string;
  baureihe: string;
  variante: string;
  generation: string;
  bauzeitVon: number;
  bauzeitBis: number;
  motor: string;
  hubraumCcm: number;
  leistungPs: number;
  antrieb: Antrieb;
  karosserie: string;
  /** Weltweite Stückzahl, soweit belastbar bekannt. */
  produktionsmenge: number | null;
  sondermodell: boolean;
  /** Erkennungsmuster für die Modellzuordnung aus Inseratstexten. */
  erkennung: {
    hersteller: string;
    /** Alle Muster werden gegen Titel, Modell und Variante geprüft. */
    muster: RegExp[];
    /** Ausschlussmuster — verhindert Verwechslung benachbarter Baureihen. */
    ausschluss?: RegExp[];
  };
  assetKriterien: Record<AssetKriterium, number>;
  /** Begründungen erscheinen unverändert in der Score-Erklärung (Abschnitt 39). */
  assetBegruendung: Partial<Record<AssetKriterium, string>>;
  bewertung: Bewertungsbasis;
  /** Kurzcharakteristik für die Oberfläche. */
  charakteristik: string;
}

/* ==========================================================================
 * MVP-Modelle nach PRD Abschnitt 46
 * ======================================================================= */

export const MODELLE: Modelldefinition[] = [
  {
    id: 'bmw-m3-e92',
    hersteller: 'BMW',
    modell: 'M3',
    baureihe: 'E92',
    variante: 'Coupé',
    generation: 'E9x (2007–2013)',
    bauzeitVon: 2007,
    bauzeitBis: 2013,
    motor: 'S65B40 V8',
    hubraumCcm: 3999,
    leistungPs: 420,
    antrieb: 'heck',
    karosserie: 'Coupé',
    produktionsmenge: 40092,
    sondermodell: false,
    erkennung: {
      hersteller: 'BMW',
      muster: [/\bm3\b/i, /\be92\b/i],
      ausschluss: [/\be46\b/i, /\bf80\b/i, /\bg80\b/i, /\be90\b/i, /\be93\b/i],
    },
    assetKriterien: {
      seltenheit: 70,
      'historische-bedeutung': 95,
      antriebskonzept: 98,
      designrelevanz: 86,
      produktionsmenge: 64,
      modellgeneration: 94,
      sondermodellstatus: 52,
      originalitaet: 80,
      marktnachfrage: 93,
      'globale-nachfrage': 94,
      markenstaerke: 95,
      ersatzteilversorgung: 86,
      restaurierbarkeit: 88,
      marktliquiditaet: 86,
      preisentwicklung: 92,
      sammlerrelevanz: 96,
    },
    assetBegruendung: {
      antriebskonzept:
        'Einziger M3 mit V8-Saugmotor; hochdrehendes Konzept ohne Nachfolger.',
      'historische-bedeutung':
        'Technischer Sonderweg der Baureihe und letzter M3 ohne Aufladung.',
      sammlerrelevanz:
        'Bereits heute als künftiger Klassiker gehandelt; Bestand guter Exemplare sinkt.',
      produktionsmenge:
        'Über 40.000 Coupés gebaut — verbreitet, aber gute Exemplare werden knapp.',
    },
    bewertung: {
      basispreis: 44500,
      referenzKm: 90000,
      referenzAlterJahre: 15,
      kmAbschlagJe1000: 210,
      alterFaktorProJahr: 0.985,
      bodenwert: 19000,
      getriebeFaktor: { handschalter: 1.09, doppelkupplung: 0.98 },
      ausstattungsFaktor: {
        'competition-paket': 1.05,
        'carbon-dach': 1.03,
        'edc-fahrwerk': 1.01,
        'schalensitze': 1.03,
        'navigation-professional': 1.005,
      },
      standzeitTage: 74,
      angebotsdichte: 180,
    },
    charakteristik:
      'V8-Saugmotor, 8.300 min⁻¹, Heckantrieb. Der Handschalter ist die gesuchte Variante.',
  },
  {
    id: 'bmw-m3-e90',
    hersteller: 'BMW',
    modell: 'M3',
    baureihe: 'E90',
    variante: 'Limousine',
    generation: 'E9x (2007–2013)',
    bauzeitVon: 2008,
    bauzeitBis: 2011,
    motor: 'S65B40 V8',
    hubraumCcm: 3999,
    leistungPs: 420,
    antrieb: 'heck',
    karosserie: 'Limousine',
    produktionsmenge: 9674,
    sondermodell: false,
    erkennung: {
      hersteller: 'BMW',
      muster: [/\be90\b/i, /m3\s+limousine/i],
      ausschluss: [/\be92\b/i, /\be93\b/i],
    },
    assetKriterien: {
      seltenheit: 82,
      'historische-bedeutung': 84,
      antriebskonzept: 95,
      designrelevanz: 66,
      produktionsmenge: 84,
      modellgeneration: 85,
      sondermodellstatus: 45,
      originalitaet: 72,
      marktnachfrage: 74,
      'globale-nachfrage': 76,
      markenstaerke: 92,
      ersatzteilversorgung: 78,
      restaurierbarkeit: 80,
      marktliquiditaet: 66,
      preisentwicklung: 80,
      sammlerrelevanz: 84,
    },
    assetBegruendung: {
      seltenheit:
        'Nur 9.674 Limousinen gegenüber gut 40.000 Coupés — die seltenste Karosserie der Baureihe.',
      marktliquiditaet:
        'Deutlich dünnerer Markt als das Coupé; längere Vermarktungszeiten.',
    },
    bewertung: {
      basispreis: 41500,
      referenzKm: 90000,
      referenzAlterJahre: 15,
      kmAbschlagJe1000: 195,
      alterFaktorProJahr: 0.985,
      bodenwert: 18000,
      getriebeFaktor: { handschalter: 1.1, doppelkupplung: 0.97 },
      ausstattungsFaktor: {
        'competition-paket': 1.05,
        'edc-fahrwerk': 1.01,
        'schalensitze': 1.03,
      },
      standzeitTage: 96,
      angebotsdichte: 42,
    },
    charakteristik:
      'Die seltene Limousinenvariante des V8-M3. Alltagstauglich, im Markt unterbewertet.',
  },
  {
    id: 'audi-rs4-b7',
    hersteller: 'Audi',
    modell: 'RS4',
    baureihe: 'B7',
    variante: '4.2 FSI quattro',
    generation: 'B7 (2006–2008)',
    bauzeitVon: 2006,
    bauzeitBis: 2008,
    motor: 'BNS 4.2 FSI V8',
    hubraumCcm: 4163,
    leistungPs: 420,
    antrieb: 'allrad',
    karosserie: 'Limousine / Avant / Cabriolet',
    produktionsmenge: 10800,
    sondermodell: false,
    erkennung: {
      hersteller: 'Audi',
      muster: [/\brs\s?4\b/i],
      ausschluss: [/\bb5\b/i, /\bb8\b/i, /\bb9\b/i],
    },
    assetKriterien: {
      seltenheit: 78,
      'historische-bedeutung': 80,
      antriebskonzept: 92,
      designrelevanz: 72,
      produktionsmenge: 76,
      modellgeneration: 82,
      sondermodellstatus: 35,
      originalitaet: 66,
      marktnachfrage: 78,
      'globale-nachfrage': 70,
      markenstaerke: 82,
      ersatzteilversorgung: 62,
      restaurierbarkeit: 66,
      marktliquiditaet: 62,
      preisentwicklung: 84,
      sammlerrelevanz: 82,
    },
    assetBegruendung: {
      antriebskonzept:
        'Hochdrehender 4,2-Liter-V8-Sauger mit 8.250 min⁻¹, ausschließlich mit Handschaltung.',
      ersatzteilversorgung:
        'DRC-Fahrwerk und einzelne V8-Teile sind bereits schwer beschaffbar.',
      preisentwicklung:
        'Gute Avant-Exemplare haben in den letzten drei Jahren spürbar angezogen.',
    },
    bewertung: {
      basispreis: 39000,
      referenzKm: 130000,
      referenzAlterJahre: 18,
      kmAbschlagJe1000: 130,
      alterFaktorProJahr: 0.99,
      bodenwert: 15000,
      getriebeFaktor: { handschalter: 1.0 },
      ausstattungsFaktor: {
        avant: 1.08,
        'recaro-schalensitze': 1.02,
        'keramikbremse': 1.04,
        'schiebedach': 0.99,
      },
      standzeitTage: 88,
      angebotsdichte: 55,
    },
    charakteristik:
      'V8-Sauger, quattro, nur Handschalter. Der Avant ist die gesuchteste Karosserie.',
  },
  {
    id: 'audi-rs5-b8',
    hersteller: 'Audi',
    modell: 'RS5',
    baureihe: 'B8',
    variante: '4.2 FSI quattro',
    generation: 'B8 (2010–2015)',
    bauzeitVon: 2010,
    bauzeitBis: 2015,
    motor: 'CFSA 4.2 FSI V8',
    hubraumCcm: 4163,
    leistungPs: 450,
    antrieb: 'allrad',
    karosserie: 'Coupé / Cabriolet',
    produktionsmenge: null,
    sondermodell: false,
    erkennung: {
      hersteller: 'Audi',
      muster: [/\brs\s?5\b/i],
      ausschluss: [/\bb9\b/i, /\btdi\b/i],
    },
    assetKriterien: {
      seltenheit: 60,
      'historische-bedeutung': 68,
      antriebskonzept: 90,
      designrelevanz: 76,
      produktionsmenge: 55,
      modellgeneration: 72,
      sondermodellstatus: 30,
      originalitaet: 64,
      marktnachfrage: 70,
      'globale-nachfrage': 66,
      markenstaerke: 82,
      ersatzteilversorgung: 72,
      restaurierbarkeit: 70,
      marktliquiditaet: 70,
      preisentwicklung: 66,
      sammlerrelevanz: 68,
    },
    assetBegruendung: {
      antriebskonzept:
        'Letzter V8-Sauger im Audi-Mittelklassecoupé, Nachfolger nur noch mit Aufladung.',
      preisentwicklung:
        'Preisboden weitgehend erreicht, Aufwärtsbewegung noch nicht belastbar.',
    },
    bewertung: {
      basispreis: 35000,
      referenzKm: 110000,
      referenzAlterJahre: 13,
      kmAbschlagJe1000: 145,
      alterFaktorProJahr: 0.975,
      bodenwert: 16000,
      getriebeFaktor: { doppelkupplung: 1.0 },
      ausstattungsFaktor: {
        'sportdifferenzial': 1.03,
        'keramikbremse': 1.05,
        'dynamik-paket': 1.02,
      },
      standzeitTage: 82,
      angebotsdichte: 95,
    },
    charakteristik:
      'V8-Sauger mit S-tronic und quattro. Solide Basis, Sammlerthema erst im Entstehen.',
  },
  {
    id: 'audi-rs3-8v',
    hersteller: 'Audi',
    modell: 'RS3',
    baureihe: '8V',
    variante: '2.5 TFSI quattro',
    generation: '8V (2015–2020)',
    bauzeitVon: 2015,
    bauzeitBis: 2020,
    motor: 'DAZA / CZGB 2.5 TFSI R5',
    hubraumCcm: 2480,
    leistungPs: 400,
    antrieb: 'allrad',
    karosserie: 'Sportback / Limousine',
    produktionsmenge: null,
    sondermodell: false,
    erkennung: {
      hersteller: 'Audi',
      muster: [/\brs\s?3\b/i, /\b8v\b/i],
      ausschluss: [/\b8p\b/i, /\b8y\b/i],
    },
    assetKriterien: {
      seltenheit: 48,
      'historische-bedeutung': 62,
      antriebskonzept: 84,
      designrelevanz: 62,
      produktionsmenge: 45,
      modellgeneration: 66,
      sondermodellstatus: 30,
      originalitaet: 55,
      marktnachfrage: 78,
      'globale-nachfrage': 62,
      markenstaerke: 82,
      ersatzteilversorgung: 84,
      restaurierbarkeit: 74,
      marktliquiditaet: 80,
      preisentwicklung: 58,
      sammlerrelevanz: 58,
    },
    assetBegruendung: {
      antriebskonzept:
        'Fünfzylinder-Turbo in der Tradition des Ur-quattro — markenprägend und ohne Wettbewerb.',
      sammlerrelevanz:
        'Sammlerstatus derzeit nicht belegbar; Fahrzeug ist noch Gebrauchtwagen, nicht Asset.',
      preisentwicklung:
        'Noch in der regulären Abschreibung; Bodenbildung nicht abgeschlossen.',
    },
    bewertung: {
      basispreis: 38000,
      referenzKm: 80000,
      referenzAlterJahre: 8,
      kmAbschlagJe1000: 175,
      alterFaktorProJahr: 0.94,
      bodenwert: 19000,
      getriebeFaktor: { doppelkupplung: 1.0 },
      ausstattungsFaktor: {
        'keramikbremse': 1.04,
        'sportabgasanlage': 1.02,
        'matrix-led': 1.01,
        'schalensitze': 1.02,
      },
      standzeitTage: 61,
      angebotsdichte: 150,
    },
    charakteristik:
      'Fünfzylinder-Turbo, 400 PS. Fahrdynamisch stark, als Asset noch nicht etabliert.',
  },
  {
    id: 'audi-rs3-8p',
    hersteller: 'Audi',
    modell: 'RS3',
    baureihe: '8P',
    variante: '2.5 TFSI quattro',
    generation: '8P (2011–2012)',
    bauzeitVon: 2011,
    bauzeitBis: 2012,
    motor: 'CEPA 2.5 TFSI R5',
    hubraumCcm: 2480,
    leistungPs: 340,
    antrieb: 'allrad',
    karosserie: 'Sportback',
    produktionsmenge: 4800,
    sondermodell: false,
    erkennung: {
      hersteller: 'Audi',
      muster: [/\brs\s?3\b/i, /\b8p\b/i],
      ausschluss: [/\b8v\b/i, /\b8y\b/i],
    },
    assetKriterien: {
      seltenheit: 80,
      'historische-bedeutung': 70,
      antriebskonzept: 84,
      designrelevanz: 58,
      produktionsmenge: 82,
      modellgeneration: 70,
      sondermodellstatus: 40,
      originalitaet: 58,
      marktnachfrage: 70,
      'globale-nachfrage': 58,
      markenstaerke: 82,
      ersatzteilversorgung: 68,
      restaurierbarkeit: 70,
      marktliquiditaet: 55,
      preisentwicklung: 76,
      sammlerrelevanz: 70,
    },
    assetBegruendung: {
      seltenheit:
        'Rund 4.800 Stück in nur zwei Modelljahren — die knappste RS3-Generation.',
      marktliquiditaet:
        'Sehr dünner Markt; in DACH stehen selten mehr als zwanzig Fahrzeuge gleichzeitig.',
    },
    bewertung: {
      basispreis: 27500,
      referenzKm: 110000,
      referenzAlterJahre: 14,
      kmAbschlagJe1000: 105,
      alterFaktorProJahr: 0.985,
      bodenwert: 14000,
      getriebeFaktor: { doppelkupplung: 1.0 },
      ausstattungsFaktor: { 'sportabgasanlage': 1.02, 'schalensitze': 1.02 },
      standzeitTage: 94,
      angebotsdichte: 24,
    },
    charakteristik:
      'Erste RS3-Generation, sehr kurze Bauzeit. Der Bestand guter Fahrzeuge ist klein.',
  },
  {
    id: 'porsche-996-c4s',
    hersteller: 'Porsche',
    modell: '911',
    baureihe: '996',
    variante: 'Carrera 4S',
    generation: '996 (1997–2005)',
    bauzeitVon: 2001,
    bauzeitBis: 2005,
    motor: 'M96/03 3.6 Boxer',
    hubraumCcm: 3596,
    leistungPs: 320,
    antrieb: 'allrad',
    karosserie: 'Coupé',
    produktionsmenge: 17000,
    sondermodell: false,
    erkennung: {
      hersteller: 'Porsche',
      muster: [/\b996\b/i, /carrera\s*4s/i],
      ausschluss: [/\b997\b/i, /\b993\b/i, /\b991\b/i],
    },
    assetKriterien: {
      seltenheit: 66,
      'historische-bedeutung': 76,
      antriebskonzept: 80,
      designrelevanz: 70,
      produktionsmenge: 62,
      modellgeneration: 64,
      sondermodellstatus: 55,
      originalitaet: 72,
      marktnachfrage: 74,
      'globale-nachfrage': 82,
      markenstaerke: 96,
      ersatzteilversorgung: 88,
      restaurierbarkeit: 86,
      marktliquiditaet: 76,
      preisentwicklung: 82,
      sammlerrelevanz: 78,
    },
    assetBegruendung: {
      'historische-bedeutung':
        'Erster wassergekühlter 911 — lange unterschätzt, inzwischen als Einstieg in die Baureihe gesucht.',
      designrelevanz:
        'Breite Turbo-Karosserie des C4S wird deutlich höher bewertet als die schmale Carrera-Form.',
      markenstaerke:
        'Porsche 911: über Jahrzehnte belastbarste Wertentwicklung im Segment.',
      preisentwicklung:
        'Der 996 hat den Preisboden verlassen; gute C4S ziehen sichtbar an.',
    },
    bewertung: {
      basispreis: 46000,
      referenzKm: 120000,
      referenzAlterJahre: 21,
      kmAbschlagJe1000: 115,
      alterFaktorProJahr: 1.0,
      bodenwert: 24000,
      getriebeFaktor: { handschalter: 1.12, automatik: 0.9 },
      ausstattungsFaktor: {
        'sportsitze': 1.02,
        'sportabgasanlage': 1.02,
        'schiebedach': 0.99,
        'aerokit': 1.04,
      },
      standzeitTage: 68,
      angebotsdichte: 70,
    },
    charakteristik:
      'Breite Karosserie, Allrad, Handschalter bevorzugt. Bore Scoring und IMS sind zu prüfen.',
  },
  {
    id: 'porsche-996-carrera',
    hersteller: 'Porsche',
    modell: '911',
    baureihe: '996',
    variante: 'Carrera / Carrera 2',
    generation: '996 (1997–2005)',
    bauzeitVon: 1997,
    bauzeitBis: 2005,
    motor: 'M96 3.4 / 3.6 Boxer',
    hubraumCcm: 3387,
    leistungPs: 300,
    antrieb: 'heck',
    karosserie: 'Coupé / Cabriolet',
    produktionsmenge: 118000,
    sondermodell: false,
    erkennung: {
      hersteller: 'Porsche',
      muster: [/\b996\b/i],
      ausschluss: [/\b997\b/i, /\b993\b/i, /carrera\s*4s/i, /turbo/i, /gt3/i],
    },
    assetKriterien: {
      seltenheit: 40,
      'historische-bedeutung': 72,
      antriebskonzept: 74,
      designrelevanz: 52,
      produktionsmenge: 35,
      modellgeneration: 60,
      sondermodellstatus: 20,
      originalitaet: 68,
      marktnachfrage: 62,
      'globale-nachfrage': 70,
      markenstaerke: 96,
      ersatzteilversorgung: 88,
      restaurierbarkeit: 86,
      marktliquiditaet: 72,
      preisentwicklung: 70,
      sammlerrelevanz: 62,
    },
    assetBegruendung: {
      produktionsmenge:
        'Mit rund 118.000 Einheiten die meistgebaute 911-Generation ihrer Zeit.',
      designrelevanz:
        'Die geteilten Frontscheinwerfer bleiben ein Streitpunkt und drücken die Bewertung.',
      restaurierbarkeit:
        'Teileversorgung über Porsche Classic gesichert, Restaurierung wirtschaftlich darstellbar.',
    },
    bewertung: {
      basispreis: 33000,
      referenzKm: 130000,
      referenzAlterJahre: 23,
      kmAbschlagJe1000: 85,
      alterFaktorProJahr: 1.0,
      bodenwert: 18000,
      getriebeFaktor: { handschalter: 1.12, automatik: 0.88 },
      ausstattungsFaktor: {
        'sportsitze': 1.02,
        'sportabgasanlage': 1.02,
        'aerokit': 1.05,
      },
      standzeitTage: 84,
      angebotsdichte: 130,
    },
    charakteristik:
      'Der Einstieg in die 911-Welt. Substanz entscheidet, nicht der Preis.',
  },
  {
    id: 'porsche-997-carrera-s',
    hersteller: 'Porsche',
    modell: '911',
    baureihe: '997.1',
    variante: 'Carrera S',
    generation: '997 (2004–2012)',
    bauzeitVon: 2004,
    bauzeitBis: 2008,
    motor: 'M97/01 3.8 Boxer',
    hubraumCcm: 3824,
    leistungPs: 355,
    antrieb: 'heck',
    karosserie: 'Coupé / Cabriolet',
    produktionsmenge: null,
    sondermodell: false,
    erkennung: {
      hersteller: 'Porsche',
      muster: [/\b997\b/i, /carrera\s*s/i],
      ausschluss: [/\b996\b/i, /\b991\b/i, /turbo/i, /gt3/i, /dfi/i],
    },
    assetKriterien: {
      seltenheit: 50,
      'historische-bedeutung': 74,
      antriebskonzept: 78,
      designrelevanz: 84,
      produktionsmenge: 48,
      modellgeneration: 76,
      sondermodellstatus: 25,
      originalitaet: 70,
      marktnachfrage: 80,
      'globale-nachfrage': 84,
      markenstaerke: 96,
      ersatzteilversorgung: 88,
      restaurierbarkeit: 86,
      marktliquiditaet: 82,
      preisentwicklung: 78,
      sammlerrelevanz: 76,
    },
    assetBegruendung: {
      designrelevanz:
        'Rückkehr zu runden Scheinwerfern; formal die am breitesten akzeptierte moderne 911-Generation.',
      'historische-bedeutung':
        'Letzte 911-Generation mit hydraulischer Lenkung und Schlüsselstart.',
    },
    bewertung: {
      basispreis: 52000,
      referenzKm: 110000,
      referenzAlterJahre: 18,
      kmAbschlagJe1000: 135,
      alterFaktorProJahr: 0.995,
      bodenwert: 28000,
      getriebeFaktor: { handschalter: 1.1, automatik: 0.9 },
      ausstattungsFaktor: {
        'sport-chrono': 1.03,
        'pasm': 1.02,
        'sportabgasanlage': 1.02,
        'schalensitze': 1.03,
      },
      standzeitTage: 64,
      angebotsdichte: 110,
    },
    charakteristik:
      '3,8-Liter-Sauger mit 355 PS. Baujahre bis 2008 mit erhöhtem Bore-Scoring-Risiko.',
  },
  {
    id: 'porsche-997-2-carrera-s',
    hersteller: 'Porsche',
    modell: '911',
    baureihe: '997.2',
    variante: 'Carrera S (DFI)',
    generation: '997 (2004–2012)',
    bauzeitVon: 2008,
    bauzeitBis: 2012,
    motor: 'MA1/01 3.8 DFI Boxer',
    hubraumCcm: 3800,
    leistungPs: 385,
    antrieb: 'heck',
    karosserie: 'Coupé / Cabriolet',
    produktionsmenge: null,
    sondermodell: false,
    erkennung: {
      hersteller: 'Porsche',
      muster: [/\b997\b/i, /dfi/i, /pdk/i],
      ausschluss: [/\b996\b/i, /\b991\b/i, /turbo/i, /gt3/i],
    },
    assetKriterien: {
      seltenheit: 52,
      'historische-bedeutung': 76,
      antriebskonzept: 82,
      designrelevanz: 84,
      produktionsmenge: 50,
      modellgeneration: 80,
      sondermodellstatus: 25,
      originalitaet: 72,
      marktnachfrage: 84,
      'globale-nachfrage': 86,
      markenstaerke: 96,
      ersatzteilversorgung: 90,
      restaurierbarkeit: 86,
      marktliquiditaet: 84,
      preisentwicklung: 84,
      sammlerrelevanz: 82,
    },
    assetBegruendung: {
      antriebskonzept:
        'DFI-Motor ohne die Bore-Scoring-Problematik der Vorgängerbaureihe.',
      preisentwicklung:
        'Gilt als sicherste 997-Wahl; Preise für Handschalter ziehen deutlich an.',
    },
    bewertung: {
      basispreis: 62000,
      referenzKm: 95000,
      referenzAlterJahre: 15,
      kmAbschlagJe1000: 155,
      alterFaktorProJahr: 0.99,
      bodenwert: 34000,
      getriebeFaktor: { handschalter: 1.12, doppelkupplung: 0.97 },
      ausstattungsFaktor: {
        'sport-chrono': 1.03,
        'pasm': 1.02,
        'sportabgasanlage': 1.02,
        'schalensitze': 1.03,
      },
      standzeitTage: 58,
      angebotsdichte: 90,
    },
    charakteristik:
      'Die technisch unkritische 997-Variante. Handschalter sind der gesuchte Aufbau.',
  },
];

export function modell(id: string | null): Modelldefinition | undefined {
  if (!id) return undefined;
  return MODELLE.find((m) => m.id === id);
}

export function modellBezeichnung(id: string | null): string {
  const m = modell(id);
  if (!m) return 'Modell nicht zugeordnet';
  return `${m.hersteller} ${m.modell} ${m.baureihe} ${m.variante}`;
}

/**
 * Ordnet Inseratsangaben einem Katalogmodell zu.
 *
 * Bewusst konservativ: Passt kein Muster eindeutig, bleibt das Ergebnis `null`.
 * Ein falsch zugeordnetes Modell verfälscht Asset Score und Marktwert
 * gleichzeitig — das wiegt schwerer als eine fehlende Zuordnung.
 */
export function erkenneModell(
  hersteller: string,
  suchtext: string,
): Modelldefinition | null {
  const kandidaten = MODELLE.filter(
    (m) => m.erkennung.hersteller.toLowerCase() === hersteller.toLowerCase(),
  );

  const treffer = kandidaten
    .map((m) => {
      if (m.erkennung.ausschluss?.some((r) => r.test(suchtext))) return null;
      const punkte = m.erkennung.muster.filter((r) => r.test(suchtext)).length;
      return punkte > 0 ? { modell: m, punkte } : null;
    })
    .filter((t): t is { modell: Modelldefinition; punkte: number } => t !== null)
    .sort((a, b) => b.punkte - a.punkte);

  if (treffer.length === 0) return null;
  // Bei Gleichstand zweier Modelle ist die Zuordnung nicht eindeutig.
  if (treffer.length > 1 && treffer[0].punkte === treffer[1].punkte) {
    return null;
  }
  return treffer[0].modell;
}
