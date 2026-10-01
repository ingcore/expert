/**
 * Erzeugung neuer Datensätze und Demobestand.
 *
 * Der Demobestand bildet die Fälle ab, an denen sich die Regelarchitektur
 * zeigen muss: ein kraftbetriebenes Tor mit Standardprüfpflicht, ein Stapler
 * ohne §-7-Standardprofil, eine Fahrzeughebebühne und ein Anschlagpunkt gegen
 * Absturz als eigenständige Familie.
 */

import { baueCheckliste } from './checklist';
import { befundnummer } from './befund';
import { familie, type AssetFamily } from './families';
import { heute } from './intervall';
import { beurteilePflicht } from './legal/applicability';
import type { InspectionTypeId } from './enums';
import {
  leereBestaetigung,
  leereFachfreigabe,
  leereVorkommnisse,
  leereWeiterbenuetzung,
  type Asset,
  type Customer,
  type Finding,
  type Inspection,
  type Inspector,
  type Site,
} from './types';

/* ==========================================================================
 * IDs
 * ======================================================================= */

let zaehler = 0;

export function id(prefix: string): string {
  zaehler += 1;
  return `${prefix}_${Date.now().toString(36)}${zaehler.toString(36)}${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

/* ==========================================================================
 * Neue Datensätze
 * ======================================================================= */

export function neuesArbeitsmittel(
  customerId: string,
  siteId: string,
  familieCode: AssetFamily,
): Asset {
  const jetzt = new Date().toISOString();
  return {
    id: id('ast'),
    customerId,
    siteId,
    aufstellungsort: '',
    inventarnummer: '',
    familie: familieCode,
    bauart: familie(familieCode).bauarten[0]?.code ?? '',
    bezeichnung: '',
    hersteller: '',
    type: '',
    seriennummer: '',
    baujahr: null,
    inbetriebnahme: null,
    typenschildFoto: null,
    qrId: null,
    status: 'AKTIV',
    attribute: {},
    erstelltAm: jetzt,
    geaendertAm: jetzt,
  };
}

export interface NeuePruefungEingabe {
  asset: Asset;
  customer: Customer;
  pruefart: InspectionTypeId;
  inspectorId: string;
  pruefdatum?: string;
  laufendeNummer: number;
}

/**
 * Legt eine Prüfung an. Die Checkliste wird aus Prüfart und Arbeitsmittel
 * aufgebaut; frühere Prüfergebnisse werden ausdrücklich **nicht** übernommen
 * (PRD 8, Schritt 1).
 */
export function neuePruefung({
  asset,
  customer,
  pruefart,
  inspectorId,
  pruefdatum = heute(),
  laufendeNummer,
}: NeuePruefungEingabe): Inspection {
  const jetzt = new Date().toISOString();
  const pflicht = beurteilePflicht(
    { familie: asset.familie, bauart: asset.bauart, attr: asset.attribute },
    pruefart,
  );

  return {
    id: id('ins'),
    assetId: asset.id,
    befundnummer: befundnummer({
      jahr: Number(pruefdatum.slice(0, 4)),
      kundennummer: customer.kundennummer,
      familienKuerzel: familie(asset.familie).kuerzel,
      laufend: laufendeNummer,
    }),
    pruefart,
    pruefdatum,
    inspectorId,
    fachfreigabe: leereFachfreigabe(pflicht.status),
    grundlagen: [],
    vorkommnisse: leereVorkommnisse(),
    items: baueCheckliste({
      pruefart,
      familie: asset.familie,
      attribute: asset.attribute,
    }),
    findings: [],
    ergebnis: null,
    weiterbenuetzung: leereWeiterbenuetzung(),
    bestaetigungBetreiber: leereBestaetigung(),
    prueflast: '',
    pruefumfang: '',
    unterschriftVorhanden: false,
    freigabedatum: null,
    status: 'DRAFT',
    ersetzt: null,
    erstelltAm: jetzt,
    geaendertAm: jetzt,
    versionen: [],
  };
}

export function neuerMangel(nummer: number): Finding {
  return {
    id: id('fnd'),
    nummer,
    typ: 'DEFECT',
    beschreibung: '',
    bauteil: '',
    grundlage: '',
    einstufung: 'ERHEBLICH',
    massnahme: '',
    frist: null,
    status: 'OFFEN',
    relevantFuerWeiterbenuetzung: true,
    entscheidungPruefer: '',
  };
}

/* ==========================================================================
 * Demobestand
 * ======================================================================= */

const KUNDE_A: Customer = {
  id: 'cus_demo_a',
  kundennummer: 'KD-1042',
  name: 'Mustermetall GmbH',
  strasse: 'Industriestraße 14',
  plz: '4600',
  ort: 'Wels',
  ansprechpartner: 'Betriebsleitung',
  telefon: '+43 7242 000000',
  email: 'technik@mustermetall.example',
};

const KUNDE_B: Customer = {
  id: 'cus_demo_b',
  kundennummer: 'KD-2087',
  name: 'Logistikzentrum Nord GmbH',
  strasse: 'Am Frachtweg 3',
  plz: '4063',
  ort: 'Hörsching',
  ansprechpartner: 'Technisches Facility Management',
};

const STANDORT_A1: Site = {
  id: 'sit_demo_a1',
  customerId: KUNDE_A.id,
  bezeichnung: 'Werk 1 — Fertigung',
  strasse: 'Industriestraße 14',
  plz: '4600',
  ort: 'Wels',
};

const STANDORT_A2: Site = {
  id: 'sit_demo_a2',
  customerId: KUNDE_A.id,
  bezeichnung: 'Werk 2 — Lager und Versand',
  strasse: 'Industriestraße 22',
  plz: '4600',
  ort: 'Wels',
};

const STANDORT_B1: Site = {
  id: 'sit_demo_b1',
  customerId: KUNDE_B.id,
  bezeichnung: 'Halle A — Umschlag',
  strasse: 'Am Frachtweg 3',
  plz: '4063',
  ort: 'Hörsching',
};

function demoAsset(
  teil: Omit<Asset, 'erstelltAm' | 'geaendertAm'>,
): Asset {
  const jetzt = '2026-01-10T08:00:00.000Z';
  return { ...teil, erstelltAm: jetzt, geaendertAm: jetzt };
}

export const DEMO_KUNDEN: Customer[] = [KUNDE_A, KUNDE_B];
export const DEMO_STANDORTE: Site[] = [STANDORT_A1, STANDORT_A2, STANDORT_B1];

export const DEMO_ARBEITSMITTEL: Asset[] = [
  demoAsset({
    id: 'ast_demo_tor1',
    customerId: KUNDE_A.id,
    siteId: STANDORT_A1.id,
    aufstellungsort: 'Halle 1, Nordseite, Tor 3',
    inventarnummer: 'INV-TOR-003',
    familie: 'TOR',
    bauart: 'SEKTIONALTOR',
    bezeichnung: 'Hallentor Nord 3',
    hersteller: 'Hörmann',
    type: 'SPU F42',
    seriennummer: 'HR-884512',
    baujahr: 2019,
    inbetriebnahme: '2019-04-12',
    typenschildFoto: null,
    qrId: 'ING-TOR-003',
    status: 'AKTIV',
    attribute: {
      breite: 4.5,
      hoehe: 4.2,
      torblattflaeche: 18.9,
      torblattmasse: 410,
      oeffnungsrichtung: 'OBEN',
      kraftbetrieben: true,
      antriebsart: 'ELEKTRISCH',
      antriebHersteller: 'Hörmann',
      antriebType: 'WA 300 S4',
      spannung: '400 V / 3 Ph',
      steuerungsart: 'SELBSTHALTUNG',
      bedienelemente: 'Taster innen/außen, Funkhandsender',
      notbetaetigung: 'JA',
      schliesskantensicherung: 'JA',
      lichtschranke: 'JA',
      absturzsicherung: 'JA',
      gehtuer: 'JA',
      nutzerklassifizierung: 'KLASSE_3',
      schutzniveau: 'Schutz durch Kraftbegrenzung und Lichtgitter',
    },
  }),
  demoAsset({
    id: 'ast_demo_stapler1',
    customerId: KUNDE_A.id,
    siteId: STANDORT_A2.id,
    aufstellungsort: 'Lagerhalle, Ladezone West',
    inventarnummer: 'INV-FFZ-011',
    familie: 'FLURFOERDERZEUG',
    bauart: 'GABELSTAPLER',
    bezeichnung: 'Stapler Lager 2',
    hersteller: 'Linde',
    type: 'H25D-02',
    seriennummer: 'LN-2219874',
    baujahr: 2021,
    inbetriebnahme: '2021-06-01',
    typenschildFoto: null,
    qrId: 'ING-FFZ-011',
    status: 'AKTIV',
    attribute: {
      tragfaehigkeit: 2500,
      lastschwerpunkt: 500,
      hubhoehe: 3300,
      masttyp: 'TRIPLEX',
      energieart: 'DIESEL',
      bedienart: 'SITZ',
      fahrerplatzHubbewegt: false,
      arbeitskorb: false,
      anbaugeraete: 'Seitenschieber',
    },
  }),
  demoAsset({
    id: 'ast_demo_hebebuehne1',
    customerId: KUNDE_A.id,
    siteId: STANDORT_A1.id,
    aufstellungsort: 'Werkstatt, Box 2',
    inventarnummer: 'INV-FHB-002',
    familie: 'FAHRZEUGHEBEBUEHNE',
    bauart: 'ZWEI_SAEULEN',
    bezeichnung: 'Hebebühne Werkstatt 2',
    hersteller: 'Nussbaum',
    type: 'Power Lift HF 3S',
    seriennummer: 'NB-556120',
    baujahr: 2023,
    inbetriebnahme: '2023-09-18',
    typenschildFoto: null,
    qrId: 'ING-FHB-002',
    status: 'AKTIV',
    attribute: {
      tragfaehigkeit: 3500,
      hubhoehe: 1.95,
      antrieb: 'HYDRAULISCH',
      gleichlaufsicherung: 'JA',
      verriegelung: 'JA',
      notabsenkung: 'JA',
      auffahrsicherung: 'JA',
      endschalter: 'JA',
      ueberlastsicherung: 'JA',
    },
  }),
  demoAsset({
    id: 'ast_demo_anschlag1',
    customerId: KUNDE_B.id,
    siteId: STANDORT_B1.id,
    aufstellungsort: 'Dachfläche Halle A, Achse 4–9',
    inventarnummer: 'INV-APS-004',
    familie: 'ANSCHLAGPUNKT_PSA',
    bauart: 'SEILSICHERUNGSSYSTEM',
    bezeichnung: 'Seilsicherung Dach Halle A',
    hersteller: 'ABS Safety',
    type: 'ABS-Lock SYS III',
    seriennummer: 'ABS-99210',
    baujahr: 2022,
    inbetriebnahme: '2022-05-20',
    typenschildFoto: null,
    qrId: 'ING-APS-004',
    status: 'AKTIV',
    attribute: {
      normtyp: 'TYP_C',
      personenanzahl: 3,
      untergrund: 'Trapezblech mit Unterkonstruktion',
      anzahlPunkte: 12,
      montagenachweis: 'JA',
    },
  }),
  demoAsset({
    id: 'ast_demo_bsa1',
    customerId: KUNDE_B.id,
    siteId: STANDORT_B1.id,
    aufstellungsort: 'Brandabschnitt A/B, Durchgang EG',
    inventarnummer: 'INV-BSA-007',
    familie: 'BRANDSCHUTZABSCHLUSS',
    bauart: 'BS_DREHTUER',
    bezeichnung: 'Brandschutztür EG A/B',
    hersteller: 'Novoferm',
    type: 'NovoPorta Premio',
    seriennummer: 'NF-310442',
    baujahr: 2020,
    inbetriebnahme: '2020-11-03',
    typenschildFoto: null,
    qrId: 'ING-BSA-007',
    status: 'AKTIV',
    attribute: {
      breite: 1.25,
      hoehe: 2.125,
      oeffnungsrichtung: 'SCHWENKEND',
      kraftbetrieben: false,
      antriebsart: 'HAND',
      feuerwiderstandsklasse: 'EI2 30-C',
      feststellanlage: 'JA',
      ausloeseeinrichtung: 'Rauchmelder mit Haftmagnet',
      zulassungsnummer: 'ETA-13/0123',
    },
  }),
];

export const DEMO_PRUEFER: Inspector[] = [
  {
    id: 'ins_demo_1',
    name: 'Ing. Hannes Mayr',
    qualifikation: 'Zur Prüfung befugte Fachkraft, Allgemein beeideter Sachverständiger',
    pruefstelle: 'INGTEC GmbH',
    anschrift: 'Technologiepark 2, 4600 Wels',
    qualifikationen: [
      {
        bezeichnung: 'Hebetechnik und kraftbetriebene Abschlüsse',
        pruefarten: ['AMVO_7_ACCEPTANCE', 'AMVO_8_RECURRING'],
        familien: [
          'TOR',
          'TUER',
          'SCHRANKE',
          'KRAN',
          'FAHRZEUGHEBEBUEHNE',
          'ARBEITSBUEHNE',
          'FLURFOERDERZEUG',
          'LASTAUFNAHMEMITTEL',
          'ANSCHLAGMITTEL_LAST',
          'BRANDSCHUTZABSCHLUSS',
          'FOERDERANLAGE',
          'ABSAUGANLAGE',
          'SONSTIGES',
        ],
        gueltigBis: null,
      },
    ],
  },
  {
    id: 'ins_demo_2',
    name: 'DI Petra Hofer',
    qualifikation: 'Fachkundige Person für Absturzsicherung und Anschlageinrichtungen',
    pruefstelle: 'INGTEC GmbH',
    anschrift: 'Technologiepark 2, 4600 Wels',
    qualifikationen: [
      {
        bezeichnung: 'Anschlageinrichtungen gegen Absturz',
        pruefarten: ['AMVO_8_RECURRING'],
        familien: ['ANSCHLAGPUNKT_PSA'],
        gueltigBis: '2028-12-31',
      },
    ],
  },
];
