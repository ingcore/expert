/**
 * Preisentwicklung je Modellvariante — Tabelle `model_market_history`,
 * PRD Abschnitt 17.
 *
 * Abschnitt 52 benennt den eigentlichen Vermögenswert des Produkts: nicht die
 * Software, sondern die über Jahre gewachsene Marktreihe. Diese Datei ist die
 * Struktur dafür — 24 Monate je Variante mit Medianpreis, Angebotsmenge,
 * Standzeit, Zu- und Abgängen sowie dem Preis der besten Exemplare.
 *
 * Die Werte des MVP sind aus je Variante hinterlegten Parametern **erzeugt**,
 * nicht gemessen. Das ist bewusst so und offen ausgewiesen: Der Momentum-Score
 * (Abschnitt 18) rechnet auf einer echten Zeitreihe mit echter Formel; die
 * Reihe selbst wird im Betrieb Monat für Monat durch tatsächlich beobachtete
 * Inserate ersetzt. `HERKUNFT` trägt diese Einschränkung mit in die
 * Oberfläche, damit niemand die Kurve für gemessene Realität hält.
 */

import type { Getriebe } from '../domain/types';
import { monatAusIndex, monatsIndex, STICHTAG } from '../domain/format';

export const HERKUNFT =
  'MVP-Startreihe aus hinterlegten Modellparametern erzeugt. Wird im Betrieb durch beobachtete Inserate ersetzt.';

export interface Marktvariante {
  id: string;
  modellId: string;
  label: string;
  getriebe: Getriebe | null;
  /** Karosserie, wo sie preisbildend ist (RS4 B7 Avant, Abschnitt 17). */
  karosserie: string | null;
}

export interface Marktmonat {
  monat: string;
  medianPreis: number;
  durchschnittspreis: number;
  /** Zahl gleichzeitig verfügbarer Angebote im beobachteten Raum. */
  angebote: number;
  standzeitTage: number;
  neueEintraege: number;
  verschwundeneAngebote: number;
  /** Median des besten Zehntels — Grundlage der Spreizung in Abschnitt 18. */
  spitzenPreis: number;
}

export interface Kilometerklasse {
  von: number;
  bis: number | null;
  label: string;
  medianPreis: number;
  anzahl: number;
}

export interface Marktreihe {
  variante: Marktvariante;
  monate: Marktmonat[];
  nachKilometerklasse: Kilometerklasse[];
  nachBaujahr: { baujahr: number; medianPreis: number; anzahl: number }[];
  nachAusstattung: { merkmal: string; aufschlagProzent: number }[];
}

/* ==========================================================================
 * Erzeugung
 * ======================================================================= */

/** Deterministischer Zufallsgenerator — gleiche Eingabe, gleiche Reihe. */
function generator(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

interface Reihenparameter {
  variante: Marktvariante;
  /** Medianpreis vor 24 Monaten. */
  startMedian: number;
  /** Monatliche Preisdrift als Faktor, z. B. 1.004 = +0,4 % pro Monat. */
  preisDrift: number;
  /** Angebotsmenge zu Beginn. */
  startAngebote: number;
  /** Monatliche Veränderung der Angebotsmenge als Faktor. */
  angebotsDrift: number;
  /** Standzeit zu Beginn in Tagen. */
  startStandzeit: number;
  standzeitDrift: number;
  /** Aufschlag der besten Exemplare zu Beginn, als Faktor auf den Median. */
  startSpreizung: number;
  spreizungsDrift: number;
  seed: number;
  nachKilometerklasse: Kilometerklasse[];
  nachBaujahr: { baujahr: number; medianPreis: number; anzahl: number }[];
  nachAusstattung: { merkmal: string; aufschlagProzent: number }[];
}

const MONATE = 24;

function baueReihe(p: Reihenparameter): Marktreihe {
  const rnd = generator(p.seed);
  const heute = new Date(STICHTAG);
  const endIndex = heute.getUTCFullYear() * 12 + heute.getUTCMonth();
  const startIndex = endIndex - (MONATE - 1);

  const monate: Marktmonat[] = [];
  for (let i = 0; i < MONATE; i++) {
    // Rauschen bleibt klein, damit der Trend erkennbar und der Score stabil ist.
    const rauschen = 1 + (rnd() - 0.5) * 0.02;
    const median = Math.round(
      (p.startMedian * Math.pow(p.preisDrift, i) * rauschen) / 100,
    ) * 100;
    const angebote = Math.max(
      4,
      Math.round(p.startAngebote * Math.pow(p.angebotsDrift, i) * (1 + (rnd() - 0.5) * 0.06)),
    );
    const standzeit = Math.max(
      14,
      Math.round(p.startStandzeit * Math.pow(p.standzeitDrift, i) * (1 + (rnd() - 0.5) * 0.05)),
    );
    const spreizung = p.startSpreizung * Math.pow(p.spreizungsDrift, i);
    const neue = Math.max(1, Math.round(angebote / (standzeit / 30.44)));
    const verschwunden = Math.max(
      1,
      Math.round(neue * (1 + (rnd() - 0.5) * 0.3) - (i === 0 ? 0 : 0)),
    );

    monate.push({
      monat: monatAusIndex(startIndex + i),
      medianPreis: median,
      // Der Durchschnitt liegt regelmäßig über dem Median: einzelne sehr gute
      // Fahrzeuge ziehen ihn nach oben, nach unten begrenzt ihn der Bodenwert.
      durchschnittspreis: Math.round((median * (1 + (spreizung - 1) * 0.35)) / 100) * 100,
      angebote,
      standzeitTage: standzeit,
      neueEintraege: neue,
      verschwundeneAngebote: verschwunden,
      spitzenPreis: Math.round((median * spreizung) / 100) * 100,
    });
  }

  return {
    variante: p.variante,
    monate,
    nachKilometerklasse: p.nachKilometerklasse,
    nachBaujahr: p.nachBaujahr,
    nachAusstattung: p.nachAusstattung,
  };
}

/* ==========================================================================
 * Varianten nach PRD Abschnitt 17
 * ======================================================================= */

const PARAMETER: Reihenparameter[] = [
  {
    variante: {
      id: 'bmw-m3-e92-handschalter',
      modellId: 'bmw-m3-e92',
      label: 'BMW M3 E92 Handschalter',
      getriebe: 'handschalter',
      karosserie: 'Coupé',
    },
    startMedian: 39500,
    preisDrift: 1.0075,
    startAngebote: 96,
    angebotsDrift: 0.9885,
    startStandzeit: 92,
    standzeitDrift: 0.9905,
    startSpreizung: 1.28,
    spreizungsDrift: 1.004,
    seed: 1101,
    nachKilometerklasse: [
      { von: 0, bis: 60000, label: 'bis 60.000 km', medianPreis: 58500, anzahl: 14 },
      { von: 60000, bis: 100000, label: '60.000–100.000 km', medianPreis: 45500, anzahl: 38 },
      { von: 100000, bis: 140000, label: '100.000–140.000 km', medianPreis: 37500, anzahl: 27 },
      { von: 140000, bis: null, label: 'über 140.000 km', medianPreis: 30500, anzahl: 12 },
    ],
    nachBaujahr: [
      { baujahr: 2008, medianPreis: 38500, anzahl: 18 },
      { baujahr: 2009, medianPreis: 40500, anzahl: 21 },
      { baujahr: 2010, medianPreis: 43000, anzahl: 24 },
      { baujahr: 2011, medianPreis: 46500, anzahl: 17 },
      { baujahr: 2012, medianPreis: 51000, anzahl: 11 },
    ],
    nachAusstattung: [
      { merkmal: 'Competition-Paket', aufschlagProzent: 5.2 },
      { merkmal: 'Carbon-Dach', aufschlagProzent: 3.1 },
      { merkmal: 'Schalensitze', aufschlagProzent: 2.9 },
      { merkmal: 'EDC-Fahrwerk', aufschlagProzent: 1.2 },
    ],
  },
  {
    variante: {
      id: 'bmw-m3-e92-dkg',
      modellId: 'bmw-m3-e92',
      label: 'BMW M3 E92 DKG',
      getriebe: 'doppelkupplung',
      karosserie: 'Coupé',
    },
    startMedian: 35500,
    preisDrift: 1.0032,
    startAngebote: 128,
    angebotsDrift: 0.9965,
    startStandzeit: 88,
    standzeitDrift: 0.998,
    startSpreizung: 1.24,
    spreizungsDrift: 1.002,
    seed: 1102,
    nachKilometerklasse: [
      { von: 0, bis: 60000, label: 'bis 60.000 km', medianPreis: 52000, anzahl: 11 },
      { von: 60000, bis: 100000, label: '60.000–100.000 km', medianPreis: 41000, anzahl: 44 },
      { von: 100000, bis: 140000, label: '100.000–140.000 km', medianPreis: 33500, anzahl: 39 },
      { von: 140000, bis: null, label: 'über 140.000 km', medianPreis: 27500, anzahl: 21 },
    ],
    nachBaujahr: [
      { baujahr: 2008, medianPreis: 34000, anzahl: 24 },
      { baujahr: 2009, medianPreis: 35500, anzahl: 29 },
      { baujahr: 2010, medianPreis: 38000, anzahl: 31 },
      { baujahr: 2011, medianPreis: 41500, anzahl: 20 },
      { baujahr: 2012, medianPreis: 45500, anzahl: 12 },
    ],
    nachAusstattung: [
      { merkmal: 'Competition-Paket', aufschlagProzent: 4.8 },
      { merkmal: 'Carbon-Dach', aufschlagProzent: 2.8 },
      { merkmal: 'Navigation Professional', aufschlagProzent: 0.6 },
    ],
  },
  {
    variante: {
      id: 'bmw-m3-e90-handschalter',
      modellId: 'bmw-m3-e90',
      label: 'BMW M3 E90 Handschalter',
      getriebe: 'handschalter',
      karosserie: 'Limousine',
    },
    startMedian: 36500,
    preisDrift: 1.0088,
    startAngebote: 26,
    angebotsDrift: 0.984,
    startStandzeit: 118,
    standzeitDrift: 0.9875,
    startSpreizung: 1.3,
    spreizungsDrift: 1.005,
    seed: 1103,
    nachKilometerklasse: [
      { von: 0, bis: 60000, label: 'bis 60.000 km', medianPreis: 56000, anzahl: 4 },
      { von: 60000, bis: 100000, label: '60.000–100.000 km', medianPreis: 43500, anzahl: 9 },
      { von: 100000, bis: 140000, label: '100.000–140.000 km', medianPreis: 35500, anzahl: 8 },
      { von: 140000, bis: null, label: 'über 140.000 km', medianPreis: 29000, anzahl: 5 },
    ],
    nachBaujahr: [
      { baujahr: 2008, medianPreis: 36000, anzahl: 7 },
      { baujahr: 2009, medianPreis: 38500, anzahl: 8 },
      { baujahr: 2010, medianPreis: 41500, anzahl: 6 },
      { baujahr: 2011, medianPreis: 45000, anzahl: 5 },
    ],
    nachAusstattung: [
      { merkmal: 'Competition-Paket', aufschlagProzent: 5.5 },
      { merkmal: 'Schalensitze', aufschlagProzent: 3.2 },
    ],
  },
  {
    variante: {
      id: 'audi-rs4-b7-avant',
      modellId: 'audi-rs4-b7',
      label: 'Audi RS4 B7 Avant',
      getriebe: 'handschalter',
      karosserie: 'Avant',
    },
    startMedian: 36500,
    preisDrift: 1.0095,
    startAngebote: 34,
    angebotsDrift: 0.982,
    startStandzeit: 104,
    standzeitDrift: 0.986,
    startSpreizung: 1.32,
    spreizungsDrift: 1.006,
    seed: 1104,
    nachKilometerklasse: [
      { von: 0, bis: 90000, label: 'bis 90.000 km', medianPreis: 52000, anzahl: 6 },
      { von: 90000, bis: 130000, label: '90.000–130.000 km', medianPreis: 42500, anzahl: 12 },
      { von: 130000, bis: 180000, label: '130.000–180.000 km', medianPreis: 34000, anzahl: 15 },
      { von: 180000, bis: null, label: 'über 180.000 km', medianPreis: 26500, anzahl: 9 },
    ],
    nachBaujahr: [
      { baujahr: 2006, medianPreis: 34500, anzahl: 12 },
      { baujahr: 2007, medianPreis: 37500, anzahl: 16 },
      { baujahr: 2008, medianPreis: 41000, anzahl: 10 },
    ],
    nachAusstattung: [
      { merkmal: 'Recaro-Schalensitze', aufschlagProzent: 2.4 },
      { merkmal: 'Keramikbremse', aufschlagProzent: 4.1 },
      { merkmal: 'DRC original und dicht', aufschlagProzent: 3.6 },
    ],
  },
  {
    variante: {
      id: 'audi-rs4-b7-limousine',
      modellId: 'audi-rs4-b7',
      label: 'Audi RS4 B7 Limousine',
      getriebe: 'handschalter',
      karosserie: 'Limousine',
    },
    startMedian: 31500,
    preisDrift: 1.0062,
    startAngebote: 22,
    angebotsDrift: 0.9905,
    startStandzeit: 112,
    standzeitDrift: 0.994,
    startSpreizung: 1.27,
    spreizungsDrift: 1.003,
    seed: 1105,
    nachKilometerklasse: [
      { von: 0, bis: 90000, label: 'bis 90.000 km', medianPreis: 45000, anzahl: 3 },
      { von: 90000, bis: 130000, label: '90.000–130.000 km', medianPreis: 36500, anzahl: 8 },
      { von: 130000, bis: 180000, label: '130.000–180.000 km', medianPreis: 29500, anzahl: 11 },
      { von: 180000, bis: null, label: 'über 180.000 km', medianPreis: 23000, anzahl: 7 },
    ],
    nachBaujahr: [
      { baujahr: 2006, medianPreis: 29500, anzahl: 9 },
      { baujahr: 2007, medianPreis: 32500, anzahl: 11 },
      { baujahr: 2008, medianPreis: 35500, anzahl: 6 },
    ],
    nachAusstattung: [{ merkmal: 'Keramikbremse', aufschlagProzent: 3.8 }],
  },
  {
    variante: {
      id: 'audi-rs5-b8',
      modellId: 'audi-rs5-b8',
      label: 'Audi RS5 B8',
      getriebe: 'doppelkupplung',
      karosserie: 'Coupé',
    },
    startMedian: 33500,
    preisDrift: 0.9988,
    startAngebote: 88,
    angebotsDrift: 1.004,
    startStandzeit: 78,
    standzeitDrift: 1.0035,
    startSpreizung: 1.22,
    spreizungsDrift: 1.0005,
    seed: 1106,
    nachKilometerklasse: [
      { von: 0, bis: 70000, label: 'bis 70.000 km', medianPreis: 45500, anzahl: 17 },
      { von: 70000, bis: 110000, label: '70.000–110.000 km', medianPreis: 36000, anzahl: 32 },
      { von: 110000, bis: 160000, label: '110.000–160.000 km', medianPreis: 29500, anzahl: 26 },
      { von: 160000, bis: null, label: 'über 160.000 km', medianPreis: 24000, anzahl: 13 },
    ],
    nachBaujahr: [
      { baujahr: 2010, medianPreis: 29500, anzahl: 14 },
      { baujahr: 2011, medianPreis: 31500, anzahl: 19 },
      { baujahr: 2012, medianPreis: 34000, anzahl: 21 },
      { baujahr: 2013, medianPreis: 37500, anzahl: 18 },
      { baujahr: 2014, medianPreis: 41000, anzahl: 12 },
    ],
    nachAusstattung: [
      { merkmal: 'Sportdifferenzial', aufschlagProzent: 2.8 },
      { merkmal: 'Keramikbremse', aufschlagProzent: 5.0 },
    ],
  },
  {
    variante: {
      id: 'audi-rs3-8p',
      modellId: 'audi-rs3-8p',
      label: 'Audi RS3 8P Sportback',
      getriebe: 'doppelkupplung',
      karosserie: 'Sportback',
    },
    startMedian: 25500,
    preisDrift: 1.0068,
    startAngebote: 19,
    angebotsDrift: 0.987,
    startStandzeit: 108,
    standzeitDrift: 0.9915,
    startSpreizung: 1.25,
    spreizungsDrift: 1.0035,
    seed: 1107,
    nachKilometerklasse: [
      { von: 0, bis: 80000, label: 'bis 80.000 km', medianPreis: 34500, anzahl: 4 },
      { von: 80000, bis: 120000, label: '80.000–120.000 km', medianPreis: 28000, anzahl: 7 },
      { von: 120000, bis: 170000, label: '120.000–170.000 km', medianPreis: 22500, anzahl: 8 },
      { von: 170000, bis: null, label: 'über 170.000 km', medianPreis: 18000, anzahl: 4 },
    ],
    nachBaujahr: [
      { baujahr: 2011, medianPreis: 25500, anzahl: 12 },
      { baujahr: 2012, medianPreis: 28000, anzahl: 9 },
    ],
    nachAusstattung: [{ merkmal: 'Sportabgasanlage', aufschlagProzent: 2.1 }],
  },
  {
    variante: {
      id: 'audi-rs3-8v',
      modellId: 'audi-rs3-8v',
      label: 'Audi RS3 8V',
      getriebe: 'doppelkupplung',
      karosserie: 'Sportback / Limousine',
    },
    startMedian: 39500,
    preisDrift: 0.9962,
    startAngebote: 142,
    angebotsDrift: 1.0065,
    startStandzeit: 58,
    standzeitDrift: 1.006,
    startSpreizung: 1.19,
    spreizungsDrift: 0.9995,
    seed: 1108,
    nachKilometerklasse: [
      { von: 0, bis: 50000, label: 'bis 50.000 km', medianPreis: 48500, anzahl: 34 },
      { von: 50000, bis: 90000, label: '50.000–90.000 km', medianPreis: 38500, anzahl: 51 },
      { von: 90000, bis: 130000, label: '90.000–130.000 km', medianPreis: 31000, anzahl: 33 },
      { von: 130000, bis: null, label: 'über 130.000 km', medianPreis: 25500, anzahl: 16 },
    ],
    nachBaujahr: [
      { baujahr: 2016, medianPreis: 32500, anzahl: 22 },
      { baujahr: 2017, medianPreis: 36500, anzahl: 28 },
      { baujahr: 2018, medianPreis: 41000, anzahl: 31 },
      { baujahr: 2019, medianPreis: 45500, anzahl: 24 },
    ],
    nachAusstattung: [
      { merkmal: 'Keramikbremse', aufschlagProzent: 4.2 },
      { merkmal: 'Matrix-LED', aufschlagProzent: 1.3 },
    ],
  },
  {
    variante: {
      id: 'porsche-996-c4s',
      modellId: 'porsche-996-c4s',
      label: 'Porsche 996 C4S',
      getriebe: null,
      karosserie: 'Coupé',
    },
    startMedian: 41500,
    preisDrift: 1.0105,
    startAngebote: 52,
    angebotsDrift: 0.9835,
    startStandzeit: 96,
    standzeitDrift: 0.9855,
    startSpreizung: 1.34,
    spreizungsDrift: 1.0065,
    seed: 1109,
    nachKilometerklasse: [
      { von: 0, bis: 90000, label: 'bis 90.000 km', medianPreis: 62000, anzahl: 9 },
      { von: 90000, bis: 130000, label: '90.000–130.000 km', medianPreis: 49500, anzahl: 18 },
      { von: 130000, bis: 180000, label: '130.000–180.000 km', medianPreis: 41000, anzahl: 16 },
      { von: 180000, bis: null, label: 'über 180.000 km', medianPreis: 33500, anzahl: 8 },
    ],
    nachBaujahr: [
      { baujahr: 2002, medianPreis: 44500, anzahl: 12 },
      { baujahr: 2003, medianPreis: 47000, anzahl: 15 },
      { baujahr: 2004, medianPreis: 50500, anzahl: 13 },
      { baujahr: 2005, medianPreis: 55000, anzahl: 8 },
    ],
    nachAusstattung: [
      { merkmal: 'Handschaltung', aufschlagProzent: 12.4 },
      { merkmal: 'Aerokit', aufschlagProzent: 4.2 },
      { merkmal: 'Sportabgasanlage', aufschlagProzent: 2.0 },
    ],
  },
  {
    variante: {
      id: 'porsche-996-carrera',
      modellId: 'porsche-996-carrera',
      label: 'Porsche 996 Carrera',
      getriebe: null,
      karosserie: 'Coupé / Cabriolet',
    },
    startMedian: 29500,
    preisDrift: 1.0072,
    startAngebote: 118,
    angebotsDrift: 0.9915,
    startStandzeit: 104,
    standzeitDrift: 0.9925,
    startSpreizung: 1.3,
    spreizungsDrift: 1.004,
    seed: 1110,
    nachKilometerklasse: [
      { von: 0, bis: 90000, label: 'bis 90.000 km', medianPreis: 46000, anzahl: 14 },
      { von: 90000, bis: 130000, label: '90.000–130.000 km', medianPreis: 35500, anzahl: 36 },
      { von: 130000, bis: 180000, label: '130.000–180.000 km', medianPreis: 29000, anzahl: 41 },
      { von: 180000, bis: null, label: 'über 180.000 km', medianPreis: 23000, anzahl: 27 },
    ],
    nachBaujahr: [
      { baujahr: 1999, medianPreis: 27500, anzahl: 21 },
      { baujahr: 2001, medianPreis: 29500, anzahl: 24 },
      { baujahr: 2003, medianPreis: 33500, anzahl: 26 },
      { baujahr: 2005, medianPreis: 38500, anzahl: 14 },
    ],
    nachAusstattung: [
      { merkmal: 'Handschaltung', aufschlagProzent: 12.0 },
      { merkmal: 'Aerokit', aufschlagProzent: 5.1 },
    ],
  },
  {
    variante: {
      id: 'porsche-997-carrera-s',
      modellId: 'porsche-997-carrera-s',
      label: 'Porsche 997.1 Carrera S',
      getriebe: null,
      karosserie: 'Coupé',
    },
    startMedian: 46500,
    preisDrift: 1.0058,
    startAngebote: 86,
    angebotsDrift: 0.9925,
    startStandzeit: 82,
    standzeitDrift: 0.9945,
    startSpreizung: 1.29,
    spreizungsDrift: 1.0035,
    seed: 1111,
    nachKilometerklasse: [
      { von: 0, bis: 80000, label: 'bis 80.000 km', medianPreis: 66000, anzahl: 16 },
      { von: 80000, bis: 120000, label: '80.000–120.000 km', medianPreis: 53000, anzahl: 29 },
      { von: 120000, bis: 170000, label: '120.000–170.000 km', medianPreis: 44000, anzahl: 24 },
      { von: 170000, bis: null, label: 'über 170.000 km', medianPreis: 36500, anzahl: 11 },
    ],
    nachBaujahr: [
      { baujahr: 2005, medianPreis: 45500, anzahl: 18 },
      { baujahr: 2006, medianPreis: 48500, anzahl: 22 },
      { baujahr: 2007, medianPreis: 52000, anzahl: 19 },
      { baujahr: 2008, medianPreis: 56500, anzahl: 12 },
    ],
    nachAusstattung: [
      { merkmal: 'Handschaltung', aufschlagProzent: 10.2 },
      { merkmal: 'Sport Chrono', aufschlagProzent: 3.0 },
      { merkmal: 'Schalensitze', aufschlagProzent: 3.1 },
    ],
  },
  {
    variante: {
      id: 'porsche-997-2-carrera-s',
      modellId: 'porsche-997-2-carrera-s',
      label: 'Porsche 997.2 Carrera S',
      getriebe: null,
      karosserie: 'Coupé',
    },
    startMedian: 55500,
    preisDrift: 1.009,
    startAngebote: 68,
    angebotsDrift: 0.987,
    startStandzeit: 74,
    standzeitDrift: 0.9895,
    startSpreizung: 1.3,
    spreizungsDrift: 1.005,
    seed: 1112,
    nachKilometerklasse: [
      { von: 0, bis: 70000, label: 'bis 70.000 km', medianPreis: 78000, anzahl: 14 },
      { von: 70000, bis: 110000, label: '70.000–110.000 km', medianPreis: 63500, anzahl: 22 },
      { von: 110000, bis: 160000, label: '110.000–160.000 km', medianPreis: 52000, anzahl: 18 },
      { von: 160000, bis: null, label: 'über 160.000 km', medianPreis: 43500, anzahl: 7 },
    ],
    nachBaujahr: [
      { baujahr: 2009, medianPreis: 56000, anzahl: 16 },
      { baujahr: 2010, medianPreis: 59500, anzahl: 18 },
      { baujahr: 2011, medianPreis: 64000, anzahl: 15 },
      { baujahr: 2012, medianPreis: 69500, anzahl: 9 },
    ],
    nachAusstattung: [
      { merkmal: 'Handschaltung', aufschlagProzent: 11.8 },
      { merkmal: 'Sport Chrono', aufschlagProzent: 3.2 },
    ],
  },
];

export const MARKTREIHEN: Marktreihe[] = PARAMETER.map(baueReihe);

export function marktreihe(varianteId: string): Marktreihe | undefined {
  return MARKTREIHEN.find((r) => r.variante.id === varianteId);
}

export function reihenFuerModell(modellId: string | null): Marktreihe[] {
  if (!modellId) return [];
  return MARKTREIHEN.filter((r) => r.variante.modellId === modellId);
}

/**
 * Wählt die Marktreihe, die zu einem konkreten Fahrzeug passt.
 *
 * Erst über das Getriebe, dann über die Karosserie — und wenn beides nicht
 * greift, über die erste Reihe des Modells. Ohne Modell gibt es keine Reihe.
 */
export function passendeReihe(
  modellId: string | null,
  getriebe: Getriebe,
  karosseriehinweis?: string | null,
): Marktreihe | undefined {
  const kandidaten = reihenFuerModell(modellId);
  if (kandidaten.length === 0) return undefined;
  if (kandidaten.length === 1) return kandidaten[0];

  const nachGetriebe = kandidaten.filter(
    (r) => r.variante.getriebe === null || r.variante.getriebe === getriebe,
  );
  const basis = nachGetriebe.length > 0 ? nachGetriebe : kandidaten;

  if (karosseriehinweis) {
    const treffer = basis.find(
      (r) =>
        r.variante.karosserie &&
        karosseriehinweis.toLowerCase().includes(r.variante.karosserie.toLowerCase()),
    );
    if (treffer) return treffer;
  }
  return basis[0];
}

/** Letzter Monat einer Reihe. */
export function aktuellerMonat(reihe: Marktreihe): Marktmonat {
  return reihe.monate[reihe.monate.length - 1];
}

/** Monat n Monate vor dem Ende der Reihe. */
export function monatVor(reihe: Marktreihe, abstand: number): Marktmonat {
  const i = Math.max(0, reihe.monate.length - 1 - abstand);
  return reihe.monate[i];
}

/** Vergleichbarkeit prüfen: Reicht die Reihe für eine Aussage? */
export function reihenTiefe(reihe: Marktreihe): number {
  return reihe.monate.length;
}

export { monatsIndex };
