/**
 * Datenbestand des MVP — die „Außenwelt".
 *
 * Diese Datei beschreibt Fahrzeuge, Inserate und deren zeitlichen Verlauf so,
 * wie sie tatsächlich am Markt stünden. Sie ist ausdrücklich **nicht** der
 * Anwendungszustand: Aus ihr erzeugt `rohdaten.ts` plattformtypische
 * Nutzlasten, die Connectoren normalisieren diese, und der Collector-Lauf baut
 * daraus Fahrzeugakten, Inserate und Beobachtungen auf.
 *
 * Der Umweg ist Absicht. Die Anwendung bekommt ihren Bestand nicht geschenkt,
 * sondern durchläuft dieselbe Kette wie im Betrieb — Normalisierung,
 * Identitätserkennung, Historisierung. Was in der Oberfläche steht, hat den
 * vollständigen Weg genommen; die Zuordnung mehrerer Inserate zu einem
 * Fahrzeug wird von der Vehicle Identity Engine gefunden und nicht hier
 * behauptet.
 *
 * `schluessel` ist die Wahrheit dieser Datei — welche Inserate real dasselbe
 * Auto zeigen. Die Anwendung sieht ihn nie; die Tests nutzen ihn, um zu
 * prüfen, ob die Identity Engine richtig zusammengeführt hat.
 */

import type {
  Antrieb,
  Belegart,
  Bildauffaelligkeit,
  Fahrzeugdokument,
  Getriebe,
  Nutzerbefund,
  Servicehistorie,
  Unfallangabe,
  Verkaeuferart,
} from '../domain/types';

/* ==========================================================================
 * Bild-Hashes
 * ======================================================================= */

/**
 * Erzeugt aus einer Bildkennung einen 64-Bit-Wahrnehmungs-Hash.
 *
 * Im Betrieb liefert der Vision-Service diesen Wert aus dem Bildinhalt. Hier
 * genügt eine deterministische Ableitung mit einer Eigenschaft, auf die es
 * ankommt: Gleiche Kennung ergibt denselben Hash — dasselbe Foto in zwei
 * Inseraten ist damit erkennbar —, verschiedene Kennungen liegen im
 * Hamming-Abstand weit auseinander und werden nie versehentlich gleichgesetzt.
 */
export function phash(kennung: string): string {
  const teil = (offset: number): string => {
    let h = 0x811c9dc5 ^ offset;
    for (let i = 0; i < kennung.length; i++) {
      h ^= kennung.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(16).padStart(8, '0');
  };
  return teil(0) + teil(0x9e3779b9);
}

export interface SeedBild {
  /** Kennung des Motivs — gleiche Kennung bedeutet dasselbe Foto. */
  motiv: string;
  merkmale: string[];
  auffaelligkeiten?: Bildauffaelligkeit[];
  aufgenommen?: string;
}

export function bilder(
  praefix: string,
  motive: (string | SeedBild)[],
): SeedBild[] {
  return motive.map((m) =>
    typeof m === 'string'
      ? { motiv: `${praefix}-${m}`, merkmale: [merkmalAus(m)] }
      : { ...m, motiv: `${praefix}-${m.motiv}` },
  );
}

function merkmalAus(motiv: string): string {
  if (/innen|cockpit|sitz|lenkrad/.test(motiv)) return 'innenraum';
  if (/motor/.test(motiv)) return 'motorraum';
  if (/unterboden|hebebuehne/.test(motiv)) return 'unterboden';
  if (/felge|rad/.test(motiv)) return 'felgen';
  return 'exterieur';
}

/* ==========================================================================
 * Strukturen
 * ======================================================================= */

export interface Fahrzeugbasis {
  hersteller: string;
  modell: string;
  baureihe: string;
  variante: string;
  motor: string;
  hubraumCcm: number;
  leistungKw: number;
  getriebe: Getriebe;
  antrieb: Antrieb;
  erstzulassung: string;
  produktionsjahr: number | null;
  farbeAussen: string | null;
  farbeInnen: string | null;
  ausstattung: string[];
  ausstattungstext: string | null;
  vin: string | null;
  fahrzeugland: string | null;
  vorbesitzer: number | null;
  mwstAusweisbar: boolean | null;
}

export interface Angebotstand {
  /** Tage vor dem Stichtag, zu denen dieser Stand beobachtet wurde. */
  tage: number;
  preis: number;
  kilometerstand: number | null;
  titel: string;
  beschreibung: string;
  unfall: Unfallangabe;
  service: Servicehistorie;
  serviceangabe?: string | null;
  garantie?: string | null;
  umbauten?: string | null;
  maengel?: string | null;
  ort: string;
  land: string;
  bilder: SeedBild[];
  unterlagen: Belegart[];
  /** Abweichungen von der Fahrzeugbasis in diesem Stand. */
  abweichung?: Partial<Fahrzeugbasis>;
}

export interface SeedVerkaeufer {
  externeId: string;
  name: string;
  art: Verkaeuferart;
  ort: string;
  land: string;
  identitaetBelegt: boolean;
  seitJahr: number | null;
  bewertung: number | null;
  anzahlInserate: number;
}

export interface Angebot {
  plattformId: string;
  externeId: string;
  url: string;
  verkaeufer: SeedVerkaeufer;
  staende: Angebotstand[];
  /** Tage vor Stichtag, an denen das Inserat verschwand. */
  entferntTage?: number;
}

export interface Seedfahrzeug {
  schluessel: string;
  basis: Fahrzeugbasis;
  angebote: Angebot[];
  dokumente: Omit<Fahrzeugdokument, 'id'>[];
  nutzerbefunde?: Omit<Nutzerbefund, 'id'>[];
  notizen?: { zeitpunkt: string; verfasser: string; text: string }[];
}

/* ==========================================================================
 * Verkäufer
 * ======================================================================= */

const V: Record<string, SeedVerkaeufer> = {
  reingruber: {
    externeId: 'mob-h-4471',
    name: 'Autohaus Reingruber GmbH',
    art: 'haendler',
    ort: 'Regensburg',
    land: 'DE',
    identitaetBelegt: true,
    seitJahr: 2009,
    bewertung: 4.4,
    anzahlInserate: 62,
  },
  sportwagenzentrum: {
    externeId: 'as24-d-9912',
    name: 'Sportwagenzentrum Süd e.K.',
    art: 'haendler',
    ort: 'Rosenheim',
    land: 'DE',
    identitaetBelegt: true,
    seitJahr: 2015,
    bewertung: 4.1,
    anzahlInserate: 28,
  },
  privatWien: {
    externeId: 'wh-p-33120',
    name: 'Privatverkäufer (Wien)',
    art: 'privat',
    ort: 'Wien',
    land: 'AT',
    identitaetBelegt: false,
    seitJahr: null,
    bewertung: null,
    anzahlInserate: 1,
  },
  privatMuenchen: {
    externeId: 'mob-p-88213',
    name: 'Privatverkäufer (München)',
    art: 'privat',
    ort: 'München',
    land: 'DE',
    identitaetBelegt: false,
    seitJahr: null,
    bewertung: null,
    anzahlInserate: 2,
  },
  scheinprivat: {
    externeId: 'wh-p-77001',
    name: 'M. K.',
    art: 'privat',
    ort: 'Wiener Neustadt',
    land: 'AT',
    identitaetBelegt: false,
    seitJahr: null,
    bewertung: null,
    anzahlInserate: 84,
  },
  klassikGraz: {
    externeId: 'wh-h-5510',
    name: 'Klassik Garage Graz GmbH',
    art: 'haendler',
    ort: 'Graz',
    land: 'AT',
    identitaetBelegt: true,
    seitJahr: 2012,
    bewertung: 4.7,
    anzahlInserate: 19,
  },
  porscheSpezialist: {
    externeId: 'mob-h-2210',
    name: 'Boxermotor Spezialwerkstatt GmbH',
    art: 'haendler',
    ort: 'Salzburg',
    land: 'AT',
    identitaetBelegt: true,
    seitJahr: 2004,
    bewertung: 4.8,
    anzahlInserate: 11,
  },
  audiZentrum: {
    externeId: 'as24-d-4410',
    name: 'Audi Zentrum Linz — Gebrauchtwagen',
    art: 'haendler',
    ort: 'Linz',
    land: 'AT',
    identitaetBelegt: true,
    seitJahr: 2001,
    bewertung: 4.3,
    anzahlInserate: 140,
  },
  privatBozen: {
    externeId: 'as24-p-6612',
    name: 'Privatverkäufer (Bozen)',
    art: 'privat',
    ort: 'Bozen',
    land: 'IT',
    identitaetBelegt: false,
    seitJahr: null,
    bewertung: null,
    anzahlInserate: 3,
  },
};

/* ==========================================================================
 * Fahrzeuge
 * ======================================================================= */

const M3_E92_INTERLAGOS_BASIS: Fahrzeugbasis = {
  hersteller: 'BMW',
  modell: 'M3',
  baureihe: 'E92',
  variante: 'Coupé',
  motor: 'S65B40 V8',
  hubraumCcm: 3999,
  leistungKw: 309,
  getriebe: 'handschalter',
  antrieb: 'heck',
  erstzulassung: '2010-03',
  produktionsjahr: 2010,
  farbeAussen: 'Interlagosblau metallic',
  farbeInnen: 'Novillo Schwarz',
  ausstattung: ['edc-fahrwerk', 'navigation-professional', 'schiebedach', 'xenon'],
  ausstattungstext: 'EDC, Navigation Professional, Schiebedach, Xenon, Komfortzugang',
  vin: null,
  fahrzeugland: 'DE',
  vorbesitzer: 3,
  mwstAusweisbar: true,
};

export const SEEDFAHRZEUGE: Seedfahrzeug[] = [
  /* ---------------------------------------------------------------------
   * 1 — Der Fall aus PRD Abschnitt 11.
   * Preisverfall über drei Stände, Wechsel des Händlers auf eine andere
   * Plattform, sinkender Kilometerstand und eine abgeschwächte Zusicherung
   * zur Unfallfreiheit. Das Fahrzeug zeigt, wozu Historisierung da ist.
   * ------------------------------------------------------------------ */
  {
    schluessel: 'm3-e92-interlagos',
    basis: M3_E92_INTERLAGOS_BASIS,
    angebote: [
      {
        plattformId: 'mobile-de',
        externeId: 'MOB-418822901',
        url: 'https://suchen.mobile.de/fahrzeuge/details.html?id=418822901',
        verkaeufer: V.reingruber,
        entferntTage: 60,
        staende: [
          {
            tage: 188,
            preis: 42900,
            kilometerstand: 91100,
            titel: 'BMW M3 Coupé E92 Handschalter Interlagosblau',
            beschreibung:
              'BMW M3 Coupé mit dem hochdrehenden V8-Saugmotor und Handschaltung. Fahrzeug ist unfallfrei und in einem sehr gepflegten Zustand. Scheckheft teilweise vorhanden. EDC-Fahrwerk, Navigation Professional, Schiebedach. Wartung zuletzt bei 88.000 km durchgeführt. Besichtigung nach Terminvereinbarung.',
            unfall: 'unfallfrei',
            service: 'teilweise',
            serviceangabe: 'Letzte Inspektion bei 88.000 km',
            ort: 'Regensburg',
            land: 'DE',
            bilder: bilder('m3-interlagos', [
              'front-3-4',
              'heck-3-4',
              'seite-links',
              'cockpit',
              'sitze-vorn',
              'motorraum',
              'felge-vorn-links',
              'tacho',
            ]),
            unterlagen: ['serviceheft'],
          },
          {
            tage: 146,
            preis: 39900,
            kilometerstand: 91100,
            titel: 'BMW M3 Coupé E92 Handschalter Interlagosblau',
            beschreibung:
              'BMW M3 Coupé mit dem hochdrehenden V8-Saugmotor und Handschaltung. Fahrzeug ist unfallfrei und in einem sehr gepflegten Zustand. Scheckheft teilweise vorhanden. EDC-Fahrwerk, Navigation Professional, Schiebedach. Wartung zuletzt bei 88.000 km durchgeführt. Preis reduziert. Besichtigung nach Terminvereinbarung.',
            unfall: 'unfallfrei',
            service: 'teilweise',
            serviceangabe: 'Letzte Inspektion bei 88.000 km',
            ort: 'Regensburg',
            land: 'DE',
            bilder: bilder('m3-interlagos', [
              'front-3-4',
              'heck-3-4',
              'seite-links',
              'cockpit',
              'sitze-vorn',
              'motorraum',
              'felge-vorn-links',
              'tacho',
            ]),
            unterlagen: ['serviceheft'],
          },
          {
            tage: 99,
            preis: 37900,
            kilometerstand: 91300,
            titel: 'BMW M3 Coupé E92 Handschalter Interlagosblau',
            beschreibung:
              'BMW M3 Coupé mit V8-Saugmotor und Handschaltung. Unfallfreiheit laut Vorbesitzer. Scheckheft teilweise vorhanden. EDC-Fahrwerk, Navigation Professional, Schiebedach. Fahrzeug wird im Kundenauftrag angeboten. Preis nochmals reduziert.',
            unfall: 'unfallfrei-laut-vorbesitzer',
            service: 'teilweise',
            serviceangabe: null,
            ort: 'Regensburg',
            land: 'DE',
            bilder: bilder('m3-interlagos', [
              'front-3-4',
              'heck-3-4',
              'seite-links',
              'cockpit',
              'sitze-vorn',
              'felge-vorn-links',
            ]),
            unterlagen: [],
          },
        ],
      },
      {
        plattformId: 'autoscout24',
        externeId: 'AS24-7710445',
        url: 'https://www.autoscout24.at/angebote/7710445',
        verkaeufer: V.sportwagenzentrum,
        staende: [
          {
            tage: 49,
            preis: 38900,
            kilometerstand: 91250,
            titel: 'BMW M3 E92 Coupé 4.0 V8 Handschalter',
            beschreibung:
              'M3 Coupé mit V8 und 6-Gang-Handschaltung in Interlagosblau. Gepflegter Zustand, EDC, Navigation Professional, Schiebedach. Kilometer laut Tacho. Zu den Vorbesitzern liegen uns keine Angaben vor. Probefahrt nach Terminvereinbarung möglich.',
            unfall: 'keine-angabe',
            service: 'unbekannt',
            ort: 'Rosenheim',
            land: 'DE',
            bilder: bilder('m3-interlagos', [
              'front-3-4',
              'heck-3-4',
              'seite-links',
              'cockpit',
              { motiv: 'haendler-front', merkmale: ['exterieur'] },
              { motiv: 'haendler-heck', merkmale: ['exterieur'] },
              { motiv: 'haendler-innen', merkmale: ['innenraum'] },
            ]),
            unterlagen: [],
            abweichung: { vorbesitzer: null },
          },
          {
            tage: 20,
            preis: 38900,
            kilometerstand: 91250,
            titel: 'BMW M3 E92 Coupé 4.0 V8 Handschalter',
            beschreibung:
              'M3 Coupé mit V8 und 6-Gang-Handschaltung in Interlagosblau. Gepflegter Zustand, EDC, Navigation Professional, Schiebedach. Kilometer laut Tacho. Zu den Vorbesitzern liegen uns keine Angaben vor. Probefahrt nach Terminvereinbarung möglich.',
            unfall: 'keine-angabe',
            service: 'unbekannt',
            ort: 'Rosenheim',
            land: 'DE',
            bilder: bilder('m3-interlagos', [
              'front-3-4',
              'heck-3-4',
              'seite-links',
              'cockpit',
              { motiv: 'haendler-front', merkmale: ['exterieur'] },
              { motiv: 'haendler-heck', merkmale: ['exterieur'] },
              { motiv: 'haendler-innen', merkmale: ['innenraum'] },
            ]),
            unterlagen: [],
            abweichung: { vorbesitzer: null },
          },
          {
            tage: 5,
            preis: 37500,
            kilometerstand: 91250,
            titel: 'BMW M3 E92 Coupé 4.0 V8 Handschalter — Preis reduziert',
            beschreibung:
              'M3 Coupé mit V8 und 6-Gang-Handschaltung in Interlagosblau. Gepflegter Zustand, EDC, Navigation Professional, Schiebedach. Kilometer laut Tacho. Zu den Vorbesitzern liegen uns keine Angaben vor. Preis reduziert, Export bevorzugt.',
            unfall: 'keine-angabe',
            service: 'unbekannt',
            ort: 'Rosenheim',
            land: 'DE',
            bilder: bilder('m3-interlagos', [
              'front-3-4',
              'heck-3-4',
              'seite-links',
              'cockpit',
              { motiv: 'haendler-front', merkmale: ['exterieur'] },
              { motiv: 'haendler-heck', merkmale: ['exterieur'] },
              { motiv: 'haendler-innen', merkmale: ['innenraum'] },
            ]),
            unterlagen: [],
            abweichung: { vorbesitzer: null },
          },
        ],
      },
    ],
    dokumente: [],
    notizen: [
      {
        zeitpunkt: '2026-06-25T09:15:00.000Z',
        verfasser: 'H. Ing',
        text: 'Beim Händlerwechsel liegt der ausgewiesene Kilometerstand unter dem letzten Stand des Vorinserats. Vor jeder weiteren Befassung klären.',
      },
    ],
  },

  /* ---------------------------------------------------------------------
   * 2 — Das Gegenstück: vollständig belegt, sauber inseriert, unter
   * Marktwert. Der Fall, für den das Buy Signal gebaut ist.
   * ------------------------------------------------------------------ */
  {
    schluessel: 'm3-e92-mineralweiss',
    basis: {
      hersteller: 'BMW',
      modell: 'M3',
      baureihe: 'E92',
      variante: 'Coupé Competition',
      motor: 'S65B40 V8',
      hubraumCcm: 3999,
      leistungKw: 309,
      getriebe: 'handschalter',
      antrieb: 'heck',
      erstzulassung: '2011-06',
      produktionsjahr: 2011,
      farbeAussen: 'Alpinweiß III',
      farbeInnen: 'Novillo Fuchsrot',
      ausstattung: [
        'competition-paket',
        'carbon-dach',
        'edc-fahrwerk',
        'schalensitze',
        'navigation-professional',
      ],
      ausstattungstext:
        'Competition-Paket, Carbon-Dach, EDC, Schalensitze, Navigation Professional, Harman/Kardon',
      vin: 'WBSKG91050E123456',
      fahrzeugland: 'DE',
      vorbesitzer: 2,
      mwstAusweisbar: false,
    },
    angebote: [
      {
        plattformId: 'mobile-de',
        externeId: 'MOB-421990334',
        url: 'https://suchen.mobile.de/fahrzeuge/details.html?id=421990334',
        verkaeufer: V.privatMuenchen,
        staende: [
          {
            tage: 31,
            preis: 56900,
            kilometerstand: 96400,
            titel: 'BMW M3 E92 Competition Handschalter — lückenlose Historie',
            beschreibung:
              'Verkauft wird mein BMW M3 E92 mit Competition-Paket und Handschaltung. Zweiter Halter seit 2016. Unfallfrei, lückenlose Servicehistorie im BMW-Betrieb, alle Rechnungen vorhanden. Pleuellager wurden bei 82.400 km präventiv gewechselt, Rechnung liegt bei. Drosselklappensteller bei 79.000 km erneuert. Fahrwerkslager und Querlenker bei 91.000 km erneuert. Carbon-Dach, Schalensitze, Novillo Fuchsrot. Zustandsbericht eines Sachverständigen von 03/2026 liegt vor, ebenso die vollständige Zulassungshistorie. Fahrzeug steht auf originalen 19-Zoll-Felgen, Zweitradsatz Winter vorhanden. Keine Umbauten, keine Leistungssteigerung.',
            unfall: 'unfallfrei',
            service: 'lueckenlos',
            serviceangabe:
              'Lückenlos BMW, letzter Service bei 94.800 km inklusive Ölwechsel und Bremsflüssigkeit',
            ort: 'München',
            land: 'DE',
            bilder: bilder('m3-alpinweiss', [
              'front-3-4',
              'heck-3-4',
              'seite-links',
              'seite-rechts',
              'cockpit',
              'sitze-vorn',
              'ruecksitze',
              'motorraum',
              'kofferraum',
              'felge-vorn-links',
              'felge-hinten-rechts',
              'unterboden-hebebuehne',
              'tacho',
              'serviceheft-foto',
              'typenschild',
            ]),
            unterlagen: [
              'serviceheft',
              'rechnung',
              'motorrechnung',
              'gutachten',
              'zulassungshistorie',
            ],
          },
          {
            tage: 9,
            preis: 54900,
            kilometerstand: 96700,
            titel: 'BMW M3 E92 Competition Handschalter — lückenlose Historie',
            beschreibung:
              'Verkauft wird mein BMW M3 E92 mit Competition-Paket und Handschaltung. Zweiter Halter seit 2016. Unfallfrei, lückenlose Servicehistorie im BMW-Betrieb, alle Rechnungen vorhanden. Pleuellager wurden bei 82.400 km präventiv gewechselt, Rechnung liegt bei. Drosselklappensteller bei 79.000 km erneuert. Fahrwerkslager und Querlenker bei 91.000 km erneuert. Carbon-Dach, Schalensitze, Novillo Fuchsrot. Zustandsbericht eines Sachverständigen von 03/2026 liegt vor, ebenso die vollständige Zulassungshistorie. Fahrzeug steht auf originalen 19-Zoll-Felgen, Zweitradsatz Winter vorhanden. Keine Umbauten, keine Leistungssteigerung. Preis leicht angepasst, da mein Nachfolgefahrzeug früher verfügbar ist.',
            unfall: 'unfallfrei',
            service: 'lueckenlos',
            serviceangabe:
              'Lückenlos BMW, letzter Service bei 94.800 km inklusive Ölwechsel und Bremsflüssigkeit',
            ort: 'München',
            land: 'DE',
            bilder: bilder('m3-alpinweiss', [
              'front-3-4',
              'heck-3-4',
              'seite-links',
              'seite-rechts',
              'cockpit',
              'sitze-vorn',
              'ruecksitze',
              'motorraum',
              'kofferraum',
              'felge-vorn-links',
              'felge-hinten-rechts',
              'unterboden-hebebuehne',
              'tacho',
              'serviceheft-foto',
              'typenschild',
            ]),
            unterlagen: [
              'serviceheft',
              'rechnung',
              'motorrechnung',
              'gutachten',
              'zulassungshistorie',
            ],
          },
        ],
      },
    ],
    dokumente: [
      {
        art: 'serviceheft',
        bezeichnung: 'BMW Serviceheft, 11 Einträge 2011–2026',
        hochgeladenAm: '2026-07-14T10:00:00.000Z',
        extrahiert: {
          datum: '2026-02-18',
          kilometerstand: 94800,
          werkstatt: 'BMW Niederlassung München',
          leistungen: ['Ölservice', 'Bremsflüssigkeit', 'Fahrzeugcheck'],
          kostenEuro: 640,
        },
        confidence: 94,
        belegtBehauptungen: ['Lückenlose Servicehistorie'],
      },
      {
        art: 'motorrechnung',
        bezeichnung: 'Pleuellagerwechsel S65, Rechnung 03/2024',
        hochgeladenAm: '2026-07-14T10:02:00.000Z',
        extrahiert: {
          datum: '2024-03-06',
          kilometerstand: 82400,
          werkstatt: 'M-Technik Fischer GmbH',
          leistungen: ['Pleuellager erneuert', 'Ölwanne gedichtet', 'Ölservice'],
          kostenEuro: 3480,
        },
        confidence: 96,
        belegtBehauptungen: ['Pleuellager gewechselt'],
      },
      {
        art: 'rechnung',
        bezeichnung: 'Drosselklappensteller, Rechnung 07/2022',
        hochgeladenAm: '2026-07-14T10:03:00.000Z',
        extrahiert: {
          datum: '2022-07-11',
          kilometerstand: 79000,
          werkstatt: 'BMW Niederlassung München',
          leistungen: ['Drosselklappensteller erneuert', 'Adaption'],
          kostenEuro: 1290,
        },
        confidence: 91,
        belegtBehauptungen: ['Drosselklappensteller erneuert'],
      },
      {
        art: 'rechnung',
        bezeichnung: 'Fahrwerksüberholung, Rechnung 09/2025',
        hochgeladenAm: '2026-07-14T10:04:00.000Z',
        extrahiert: {
          datum: '2025-09-22',
          kilometerstand: 91000,
          werkstatt: 'M-Technik Fischer GmbH',
          leistungen: ['Querlenker erneuert', 'Achslager erneuert', 'Achsvermessung'],
          kostenEuro: 2150,
        },
        confidence: 93,
        belegtBehauptungen: ['Fahrwerk überarbeitet'],
      },
      {
        art: 'gutachten',
        bezeichnung: 'Zustandsbericht Sachverständiger, 03/2026',
        hochgeladenAm: '2026-07-14T10:06:00.000Z',
        extrahiert: {
          datum: '2026-03-02',
          kilometerstand: 95200,
          werkstatt: 'Ing. Bauer, allgemein beeideter Sachverständiger',
          leistungen: ['Zustandsbewertung 2', 'Lackschichtmessung', 'Unfallfreiheit bestätigt'],
          kostenEuro: 380,
        },
        confidence: 97,
        belegtBehauptungen: ['Unfallfrei'],
      },
      {
        art: 'zulassungshistorie',
        bezeichnung: 'Zulassungshistorie, 2 Halter',
        hochgeladenAm: '2026-07-14T10:07:00.000Z',
        extrahiert: {
          datum: '2026-06-30',
          kilometerstand: null,
          werkstatt: null,
          leistungen: ['2 Halter seit Erstzulassung 06/2011'],
          kostenEuro: null,
        },
        confidence: 90,
        belegtBehauptungen: [],
      },
    ],
  },

  /* ---------------------------------------------------------------------
   * 3 — Dasselbe Fahrzeug bei demselben Händler auf zwei Plattformen.
   * Identische Bilder, identische Daten: der einfache Fall für die
   * Identity Engine, an dem sich die Duplikaterkennung messen lassen muss.
   * ------------------------------------------------------------------ */
  {
    schluessel: 'm3-e90-limousine',
    basis: {
      hersteller: 'BMW',
      modell: 'M3',
      baureihe: 'E90',
      variante: 'Limousine',
      motor: 'S65B40 V8',
      hubraumCcm: 3999,
      leistungKw: 309,
      getriebe: 'handschalter',
      antrieb: 'heck',
      erstzulassung: '2009-05',
      produktionsjahr: 2009,
      farbeAussen: 'Alpinweiß',
      farbeInnen: 'Leder Schwarz',
      ausstattung: ['edc-fahrwerk', 'navigation-professional', 'komfortzugang'],
      ausstattungstext: 'EDC, Navigation Professional, Komfortzugang, Sitzheizung',
      vin: null,
      fahrzeugland: 'AT',
      vorbesitzer: 2,
      mwstAusweisbar: true,
    },
    angebote: [
      {
        plattformId: 'autoscout24',
        externeId: 'AS24-6620118',
        url: 'https://www.autoscout24.at/angebote/6620118',
        verkaeufer: V.klassikGraz,
        staende: [
          {
            tage: 72,
            preis: 39900,
            kilometerstand: 118400,
            titel: 'BMW M3 E90 Limousine V8 Handschalter — seltene Karosserie',
            beschreibung:
              'M3 Limousine mit V8-Saugmotor und Handschaltung. Nur rund 9.700 Limousinen wurden gebaut. Zweiter Halter, unfallfrei, Serviceheft lückenlos bei BMW. Fahrzeug wurde nie im Winter bewegt. Pleuellager wurden 2024 bei 108.000 km präventiv gewechselt, Rechnung liegt vor. EDC-Fahrwerk, Navigation Professional. Fahrzeug steht in unserer Halle in Graz und kann jederzeit besichtigt werden.',
            unfall: 'unfallfrei',
            service: 'lueckenlos',
            serviceangabe: 'Serviceheft lückenlos BMW, letzter Service 09/2025 bei 116.000 km',
            ort: 'Graz',
            land: 'AT',
            bilder: bilder('m3-e90', [
              'front-3-4',
              'heck-3-4',
              'seite-links',
              'cockpit',
              'sitze-vorn',
              'motorraum',
              'felge-vorn-links',
              'kofferraum',
              'tacho',
            ]),
            unterlagen: ['serviceheft', 'pickerlbericht', 'motorrechnung'],
          },
          {
            tage: 26,
            preis: 38500,
            kilometerstand: 118400,
            titel: 'BMW M3 E90 Limousine V8 Handschalter — seltene Karosserie',
            beschreibung:
              'M3 Limousine mit V8-Saugmotor und Handschaltung. Nur rund 9.700 Limousinen wurden gebaut. Zweiter Halter, unfallfrei, Serviceheft lückenlos bei BMW. Fahrzeug wurde nie im Winter bewegt. Pleuellager wurden 2024 bei 108.000 km präventiv gewechselt, Rechnung liegt vor. EDC-Fahrwerk, Navigation Professional. Fahrzeug steht in unserer Halle in Graz und kann jederzeit besichtigt werden. Preis angepasst.',
            unfall: 'unfallfrei',
            service: 'lueckenlos',
            serviceangabe: 'Serviceheft lückenlos BMW, letzter Service 09/2025 bei 116.000 km',
            ort: 'Graz',
            land: 'AT',
            bilder: bilder('m3-e90', [
              'front-3-4',
              'heck-3-4',
              'seite-links',
              'cockpit',
              'sitze-vorn',
              'motorraum',
              'felge-vorn-links',
              'kofferraum',
              'tacho',
            ]),
            unterlagen: ['serviceheft', 'pickerlbericht', 'motorrechnung'],
          },
        ],
      },
      {
        plattformId: 'willhaben',
        externeId: 'WH-1188442',
        url: 'https://www.willhaben.at/iad/gebrauchtwagen/d/auto/1188442',
        verkaeufer: V.klassikGraz,
        staende: [
          {
            tage: 70,
            preis: 39900,
            kilometerstand: 118400,
            titel: 'BMW M3 E90 Limousine 4,0 V8 Handschalter',
            beschreibung:
              'M3 Limousine mit V8-Saugmotor und Handschaltung, seltene Karosserievariante. Zweiter Halter, unfallfrei, Serviceheft lückenlos bei BMW. Kein Winterbetrieb. Pleuellager 2024 bei 108.000 km erneuert, Rechnung vorhanden. EDC-Fahrwerk, Navigation Professional. Besichtigung in Graz jederzeit möglich.',
            unfall: 'unfallfrei',
            service: 'lueckenlos',
            serviceangabe: 'Serviceheft lückenlos BMW',
            ort: 'Graz',
            land: 'AT',
            bilder: bilder('m3-e90', [
              'front-3-4',
              'heck-3-4',
              'seite-links',
              'cockpit',
              'sitze-vorn',
              'motorraum',
              'felge-vorn-links',
            ]),
            unterlagen: ['serviceheft', 'pickerlbericht', 'motorrechnung'],
          },
          {
            tage: 24,
            preis: 38500,
            kilometerstand: 118400,
            titel: 'BMW M3 E90 Limousine 4,0 V8 Handschalter',
            beschreibung:
              'M3 Limousine mit V8-Saugmotor und Handschaltung, seltene Karosserievariante. Zweiter Halter, unfallfrei, Serviceheft lückenlos bei BMW. Kein Winterbetrieb. Pleuellager 2024 bei 108.000 km erneuert, Rechnung vorhanden. EDC-Fahrwerk, Navigation Professional. Besichtigung in Graz jederzeit möglich. Preis angepasst.',
            unfall: 'unfallfrei',
            service: 'lueckenlos',
            serviceangabe: 'Serviceheft lückenlos BMW',
            ort: 'Graz',
            land: 'AT',
            bilder: bilder('m3-e90', [
              'front-3-4',
              'heck-3-4',
              'seite-links',
              'cockpit',
              'sitze-vorn',
              'motorraum',
              'felge-vorn-links',
            ]),
            unterlagen: ['serviceheft', 'pickerlbericht', 'motorrechnung'],
          },
        ],
      },
    ],
    dokumente: [
      {
        art: 'serviceheft',
        bezeichnung: 'BMW Serviceheft, 14 Einträge',
        hochgeladenAm: '2026-07-02T08:30:00.000Z',
        extrahiert: {
          datum: '2025-09-15',
          kilometerstand: 116000,
          werkstatt: 'BMW Graz',
          leistungen: ['Ölservice', 'Bremsflüssigkeit'],
          kostenEuro: 520,
        },
        confidence: 92,
        belegtBehauptungen: ['Lückenlose Servicehistorie'],
      },
      {
        art: 'motorrechnung',
        bezeichnung: 'Pleuellagerwechsel S65, Rechnung 06/2024',
        hochgeladenAm: '2026-07-02T08:32:00.000Z',
        extrahiert: {
          datum: '2024-06-13',
          kilometerstand: 108000,
          werkstatt: 'M-Werkstatt Kainz GmbH',
          leistungen: ['Pleuellager erneuert', 'Ölwanne gedichtet', 'Ölservice'],
          kostenEuro: 3620,
        },
        confidence: 95,
        belegtBehauptungen: ['Pleuellager gewechselt'],
      },
      {
        art: 'pickerlbericht',
        bezeichnung: '§ 57a-Begutachtung 04/2026, ohne Mangel',
        hochgeladenAm: '2026-07-02T08:31:00.000Z',
        extrahiert: {
          datum: '2026-04-20',
          kilometerstand: 117800,
          werkstatt: 'Klassik Garage Graz GmbH',
          leistungen: ['Begutachtung ohne Mangel'],
          kostenEuro: 89,
        },
        confidence: 95,
        belegtBehauptungen: [],
      },
    ],
  },

  /* ---------------------------------------------------------------------
   * 4 — Auffällig billig. Fremde Fotos, widersprüchliche VIN,
   * verdeckt gewerblicher Verkäufer. Der Fall, den das Produkt aussortieren
   * soll, statt ihn als Schnäppchen nach oben zu spülen.
   * ------------------------------------------------------------------ */
  {
    schluessel: 'm3-e92-auffaellig',
    basis: {
      hersteller: 'BMW',
      modell: 'M3',
      baureihe: 'E92',
      variante: 'Coupé',
      motor: 'S65B40 V8',
      hubraumCcm: 3999,
      leistungKw: 309,
      getriebe: 'doppelkupplung',
      antrieb: 'heck',
      erstzulassung: '2009-09',
      produktionsjahr: 2009,
      farbeAussen: 'Schwarz uni',
      farbeInnen: 'Leder Schwarz',
      ausstattung: ['navigation-professional'],
      ausstattungstext: 'Navigation, Klima',
      // Herstellerkennung WAU steht für Audi — die Red Flag „Motorisierung
      // widerspricht VIN-Daten" wird ausgelöst.
      vin: 'WAUZZZ8K9BA123987',
      fahrzeugland: 'US',
      vorbesitzer: null,
      mwstAusweisbar: null,
    },
    angebote: [
      {
        plattformId: 'willhaben',
        externeId: 'WH-1204991',
        url: 'https://www.willhaben.at/iad/gebrauchtwagen/d/auto/1204991',
        verkaeufer: V.scheinprivat,
        staende: [
          {
            tage: 17,
            preis: 15900,
            kilometerstand: 128000,
            titel: 'BMW M3 E92 DKG — günstig, Export bevorzugt',
            beschreibung:
              'M3 Coupé DKG, US-Import, Kilometer laut Tacho. Keine Angaben zur Unfallfreiheit möglich, Fahrzeug im Kundenauftrag. Serviceheft verloren. Keine Gewährleistung, gekauft wie gesehen. Export bevorzugt, schnelle Abwicklung erwünscht. Preis VB.',
            unfall: 'keine-angabe',
            service: 'keine',
            ort: 'Wiener Neustadt',
            land: 'AT',
            // Zwei Fotos stammen aus dem Inserat des Interlagos-M3 und
            // lösen den Bildabgleich aus.
            bilder: [
              ...bilder('m3-interlagos', ['front-3-4', 'cockpit']),
              ...bilder('m3-billig', ['seite-rechts', 'heck']),
            ],
            unterlagen: [],
          },
          {
            tage: 3,
            preis: 14500,
            kilometerstand: 128000,
            titel: 'BMW M3 E92 DKG — günstig, Export bevorzugt',
            beschreibung:
              'M3 Coupé DKG, US-Import, Kilometer laut Tacho. Keine Angaben zur Unfallfreiheit möglich, Fahrzeug im Kundenauftrag. Serviceheft verloren. Keine Gewährleistung, gekauft wie gesehen. Export bevorzugt, schnelle Abwicklung erwünscht. Letzter Preis.',
            unfall: 'keine-angabe',
            service: 'keine',
            ort: 'Wiener Neustadt',
            land: 'AT',
            bilder: [
              ...bilder('m3-interlagos', ['front-3-4', 'cockpit']),
              ...bilder('m3-billig', ['seite-rechts', 'heck']),
            ],
            unterlagen: [],
          },
        ],
      },
    ],
    dokumente: [],
  },

  /* ---------------------------------------------------------------------
   * 5 — Audi RS4 B7 Avant, guter Händlerwagen mit DRC-Nachweis.
   * ------------------------------------------------------------------ */
  {
    schluessel: 'rs4-b7-avant',
    basis: {
      hersteller: 'Audi',
      modell: 'RS4',
      baureihe: 'B7',
      variante: 'Avant 4.2 FSI quattro',
      motor: 'BNS 4.2 FSI V8',
      hubraumCcm: 4163,
      leistungKw: 309,
      getriebe: 'handschalter',
      antrieb: 'allrad',
      erstzulassung: '2007-04',
      produktionsjahr: 2007,
      farbeAussen: 'Nogaroblau perleffekt',
      farbeInnen: 'Recaro Leder Schwarz/Silber',
      ausstattung: ['avant', 'recaro-schalensitze', 'bose', 'xenon'],
      ausstattungstext: 'Avant, Recaro-Schalensitze, Bose, Xenon plus, Sportabgasanlage ab Werk',
      vin: 'WAUZZZ8E97A123456',
      fahrzeugland: 'DE',
      vorbesitzer: 3,
      mwstAusweisbar: true,
    },
    angebote: [
      {
        plattformId: 'mobile-de',
        externeId: 'MOB-419774120',
        url: 'https://suchen.mobile.de/fahrzeuge/details.html?id=419774120',
        verkaeufer: V.reingruber,
        staende: [
          {
            tage: 55,
            preis: 36900,
            kilometerstand: 148600,
            titel: 'Audi RS4 B7 Avant 4.2 FSI quattro — DRC neu',
            beschreibung:
              'RS4 Avant in Nogaroblau, die gesuchte Kombination aus Karosserie und Farbe. Dritter Halter, unfallfrei, Serviceheft lückenlos. Das DRC-Fahrwerk wurde 2024 bei 139.000 km komplett instandgesetzt, Rechnung liegt vor. Einlasskanäle wurden bei 132.000 km gereinigt (Walnussstrahlen). Kupplung bei 128.000 km erneuert. Recaro-Schalensitze ohne Verschleiß, Bose-Anlage. Fahrzeug wurde von uns aufbereitet, Bremsscheiben rundum neu.',
            unfall: 'unfallfrei',
            service: 'lueckenlos',
            serviceangabe: 'Lückenlos Audi und markenerfahrene Fachwerkstatt',
            garantie: '12 Monate Händlergarantie',
            ort: 'Regensburg',
            land: 'DE',
            bilder: bilder('rs4-nogaro', [
              'front-3-4',
              'heck-3-4',
              'seite-links',
              'seite-rechts',
              'cockpit',
              'sitze-vorn',
              'kofferraum',
              'motorraum',
              'felge-vorn-links',
              'unterboden-hebebuehne',
              'tacho',
            ]),
            unterlagen: ['serviceheft', 'rechnung', 'gutachten'],
          },
          {
            tage: 12,
            preis: 34900,
            kilometerstand: 148900,
            titel: 'Audi RS4 B7 Avant 4.2 FSI quattro — DRC neu',
            beschreibung:
              'RS4 Avant in Nogaroblau, die gesuchte Kombination aus Karosserie und Farbe. Dritter Halter, unfallfrei, Serviceheft lückenlos. Das DRC-Fahrwerk wurde 2024 bei 139.000 km komplett instandgesetzt, Rechnung liegt vor. Einlasskanäle wurden bei 132.000 km gereinigt (Walnussstrahlen). Kupplung bei 128.000 km erneuert. Recaro-Schalensitze ohne Verschleiß, Bose-Anlage. Fahrzeug wurde von uns aufbereitet, Bremsscheiben rundum neu. Preis reduziert.',
            unfall: 'unfallfrei',
            service: 'lueckenlos',
            serviceangabe: 'Lückenlos Audi und markenerfahrene Fachwerkstatt',
            garantie: '12 Monate Händlergarantie',
            ort: 'Regensburg',
            land: 'DE',
            bilder: bilder('rs4-nogaro', [
              'front-3-4',
              'heck-3-4',
              'seite-links',
              'seite-rechts',
              'cockpit',
              'sitze-vorn',
              'kofferraum',
              'motorraum',
              'felge-vorn-links',
              'unterboden-hebebuehne',
              'tacho',
            ]),
            unterlagen: ['serviceheft', 'rechnung', 'gutachten'],
          },
        ],
      },
      {
        plattformId: 'willhaben',
        externeId: 'WH-1195330',
        url: 'https://www.willhaben.at/iad/gebrauchtwagen/d/auto/1195330',
        verkaeufer: V.klassikGraz,
        staende: [
          {
            tage: 33,
            preis: 35900,
            kilometerstand: 148800,
            titel: 'Audi RS4 Avant 4,2 V8 quattro Nogaroblau',
            beschreibung:
              'RS4 Avant in Nogaroblau mit Handschaltung. Unfallfrei, Serviceheft lückenlos. Fahrwerk wurde überarbeitet. Fahrzeug in unserer Halle in Graz, Besichtigung jederzeit möglich.',
            unfall: 'unfallfrei',
            service: 'lueckenlos',
            ort: 'Graz',
            land: 'AT',
            bilder: bilder('rs4-nogaro-graz', [
              'front-3-4',
              'seite-links',
              'cockpit',
              'felge-vorn-links',
            ]),
            unterlagen: ['serviceheft'],
            abweichung: { vin: null, ausstattung: ['avant', 'xenon'] },
          },
        ],
      },
    ],
    dokumente: [
      {
        art: 'rechnung',
        bezeichnung: 'DRC-Instandsetzung, Rechnung 05/2024',
        hochgeladenAm: '2026-06-20T14:00:00.000Z',
        extrahiert: {
          datum: '2024-05-14',
          kilometerstand: 139000,
          werkstatt: 'quattro-Technik Wiesner',
          leistungen: ['DRC-Fahrwerk instandgesetzt', 'Leitungen erneuert', 'Achsvermessung'],
          kostenEuro: 4260,
        },
        confidence: 94,
        belegtBehauptungen: ['DRC-Fahrwerk instandgesetzt oder umgerüstet'],
      },
      {
        art: 'rechnung',
        bezeichnung: 'Walnussstrahlen Einlasskanäle, 11/2022',
        hochgeladenAm: '2026-06-20T14:02:00.000Z',
        extrahiert: {
          datum: '2022-11-08',
          kilometerstand: 132000,
          werkstatt: 'quattro-Technik Wiesner',
          leistungen: ['Einlasskanäle gereinigt (Walnussstrahlen)', 'Zündkerzen erneuert'],
          kostenEuro: 1180,
        },
        confidence: 92,
        belegtBehauptungen: ['Einlasskanäle gereinigt'],
      },
      {
        art: 'serviceheft',
        bezeichnung: 'Audi Serviceheft, 17 Einträge',
        hochgeladenAm: '2026-06-20T14:03:00.000Z',
        extrahiert: {
          datum: '2026-01-30',
          kilometerstand: 146500,
          werkstatt: 'Audi Zentrum Regensburg',
          leistungen: ['Ölservice', 'Inspektion'],
          kostenEuro: 710,
        },
        confidence: 93,
        belegtBehauptungen: ['Lückenlose Servicehistorie'],
      },
    ],
  },

  /* ---------------------------------------------------------------------
   * 6 — Audi RS4 B7 Limousine, privat, ohne Unterlagen.
   * ------------------------------------------------------------------ */
  {
    schluessel: 'rs4-b7-limousine',
    basis: {
      hersteller: 'Audi',
      modell: 'RS4',
      baureihe: 'B7',
      variante: 'Limousine 4.2 FSI quattro',
      motor: 'BNS 4.2 FSI V8',
      hubraumCcm: 4163,
      leistungKw: 309,
      getriebe: 'handschalter',
      antrieb: 'allrad',
      erstzulassung: '2006-11',
      produktionsjahr: 2006,
      farbeAussen: 'Avussilber',
      farbeInnen: 'Leder Schwarz',
      ausstattung: ['xenon', 'navigation'],
      ausstattungstext: 'Xenon, Navigation, Sitzheizung',
      vin: null,
      fahrzeugland: 'AT',
      vorbesitzer: 4,
      mwstAusweisbar: null,
    },
    angebote: [
      {
        plattformId: 'willhaben',
        externeId: 'WH-1177003',
        url: 'https://www.willhaben.at/iad/gebrauchtwagen/d/auto/1177003',
        verkaeufer: V.privatWien,
        staende: [
          {
            tage: 141,
            preis: 24900,
            kilometerstand: 171200,
            titel: 'Audi RS4 B7 Limousine V8 quattro',
            beschreibung:
              'RS4 Limousine mit V8. Serviceheft leider verloren, Rechnungen der letzten Jahre teilweise vorhanden. Leichter Vorschaden vorne rechts wurde fachgerecht instandgesetzt. DRC-Fahrwerk ist original. Fahrzeug läuft einwandfrei, keine Mängel bekannt.',
            unfall: 'vorschaden-repariert',
            service: 'keine',
            maengel: 'Klimaanlage kühlt schwach',
            ort: 'Wien',
            land: 'AT',
            bilder: bilder('rs4-silber', [
              'front-3-4',
              'heck-3-4',
              'cockpit',
              'motorraum',
              'felge-vorn-links',
            ]),
            unterlagen: [],
          },
          {
            tage: 76,
            preis: 22900,
            kilometerstand: 172400,
            titel: 'Audi RS4 B7 Limousine V8 quattro',
            beschreibung:
              'RS4 Limousine mit V8. Serviceheft leider verloren, Rechnungen der letzten Jahre teilweise vorhanden. Leichter Vorschaden vorne rechts wurde fachgerecht instandgesetzt. DRC-Fahrwerk ist original. Fahrzeug läuft einwandfrei, keine Mängel bekannt. Preis VB.',
            unfall: 'vorschaden-repariert',
            service: 'keine',
            maengel: 'Klimaanlage kühlt schwach',
            ort: 'Wien',
            land: 'AT',
            bilder: bilder('rs4-silber', [
              'front-3-4',
              'heck-3-4',
              'cockpit',
              'motorraum',
              'felge-vorn-links',
            ]),
            unterlagen: [],
          },
          {
            tage: 21,
            preis: 21900,
            kilometerstand: 173100,
            titel: 'Audi RS4 B7 Limousine V8 quattro — letzter Preis',
            beschreibung:
              'RS4 Limousine mit V8. Serviceheft leider verloren. Leichter Vorschaden vorne rechts wurde fachgerecht instandgesetzt. DRC-Fahrwerk ist original. Fahrzeug läuft einwandfrei. Letzter Preis, keine Gewährleistung.',
            unfall: 'vorschaden-repariert',
            service: 'keine',
            maengel: 'Klimaanlage kühlt schwach, DRC beginnt zu schwitzen',
            ort: 'Wien',
            land: 'AT',
            bilder: bilder('rs4-silber', [
              'front-3-4',
              'heck-3-4',
              'cockpit',
              'motorraum',
              'felge-vorn-links',
            ]),
            unterlagen: [],
          },
        ],
      },
    ],
    dokumente: [],
  },

  /* ---------------------------------------------------------------------
   * 7 — Audi RS5 B8, Händlerwagen, unauffällig.
   * ------------------------------------------------------------------ */
  {
    schluessel: 'rs5-b8',
    basis: {
      hersteller: 'Audi',
      modell: 'RS5',
      baureihe: 'B8',
      variante: 'Coupé 4.2 FSI quattro',
      motor: 'CFSA 4.2 FSI V8',
      hubraumCcm: 4163,
      leistungKw: 331,
      getriebe: 'doppelkupplung',
      antrieb: 'allrad',
      erstzulassung: '2013-03',
      produktionsjahr: 2013,
      farbeAussen: 'Daytonagrau perleffekt',
      farbeInnen: 'Leder/Alcantara Schwarz',
      ausstattung: ['sportdifferenzial', 'dynamik-paket', 'bang-olufsen'],
      ausstattungstext: 'Sportdifferenzial, Dynamikpaket, Bang & Olufsen, Schiebedach',
      vin: 'WAUZZZ8T8DA123654',
      fahrzeugland: 'AT',
      vorbesitzer: 2,
      mwstAusweisbar: true,
    },
    angebote: [
      {
        plattformId: 'autoscout24',
        externeId: 'AS24-7401992',
        url: 'https://www.autoscout24.at/angebote/7401992',
        verkaeufer: V.audiZentrum,
        staende: [
          {
            tage: 44,
            preis: 37900,
            kilometerstand: 98400,
            titel: 'Audi RS5 4.2 FSI quattro S tronic',
            beschreibung:
              'RS5 Coupé mit V8-Saugmotor, Sportdifferenzial und Dynamikpaket. Zweiter Halter, unfallfrei, Serviceheft lückenlos im Audi-Betrieb. S-tronic-Ölservice zuletzt bei 91.000 km. Fahrzeug aus erster österreichischer Hand, Nichtraucherfahrzeug. Aufbereitet und mit Werksgarantie-Anschluss verfügbar.',
            unfall: 'unfallfrei',
            service: 'lueckenlos',
            serviceangabe: 'Lückenlos Audi, S-tronic-Service bei 91.000 km',
            garantie: '12 Monate Garantie',
            ort: 'Linz',
            land: 'AT',
            bilder: bilder('rs5-daytona', [
              'front-3-4',
              'heck-3-4',
              'seite-links',
              'cockpit',
              'sitze-vorn',
              'motorraum',
              'felge-vorn-links',
              'kofferraum',
              'tacho',
            ]),
            unterlagen: ['serviceheft', 'digitale-servicehistorie'],
          },
          {
            tage: 8,
            preis: 36500,
            kilometerstand: 99100,
            titel: 'Audi RS5 4.2 FSI quattro S tronic',
            beschreibung:
              'RS5 Coupé mit V8-Saugmotor, Sportdifferenzial und Dynamikpaket. Zweiter Halter, unfallfrei, Serviceheft lückenlos im Audi-Betrieb. S-tronic-Ölservice zuletzt bei 91.000 km. Fahrzeug aus erster österreichischer Hand, Nichtraucherfahrzeug. Preis reduziert.',
            unfall: 'unfallfrei',
            service: 'lueckenlos',
            serviceangabe: 'Lückenlos Audi, S-tronic-Service bei 91.000 km',
            garantie: '12 Monate Garantie',
            ort: 'Linz',
            land: 'AT',
            bilder: bilder('rs5-daytona', [
              'front-3-4',
              'heck-3-4',
              'seite-links',
              'cockpit',
              'sitze-vorn',
              'motorraum',
              'felge-vorn-links',
              'kofferraum',
              'tacho',
            ]),
            unterlagen: ['serviceheft', 'digitale-servicehistorie'],
          },
        ],
      },
    ],
    dokumente: [
      {
        art: 'digitale-servicehistorie',
        bezeichnung: 'Audi Servicehistorie, Auszug 07/2026',
        hochgeladenAm: '2026-07-05T09:00:00.000Z',
        extrahiert: {
          datum: '2026-07-01',
          kilometerstand: 96800,
          werkstatt: 'Audi Zentrum Linz',
          leistungen: ['Ölservice', 'S-tronic-Ölservice bei 91.000 km', 'Inspektion'],
          kostenEuro: 1240,
        },
        confidence: 96,
        belegtBehauptungen: ['Lückenlose Servicehistorie', 'Getriebeservice durchgeführt'],
      },
    ],
  },

  /* ---------------------------------------------------------------------
   * 8 — Audi RS3 8P, seltene erste Generation, privat.
   * ------------------------------------------------------------------ */
  {
    schluessel: 'rs3-8p',
    basis: {
      hersteller: 'Audi',
      modell: 'RS3',
      baureihe: '8P',
      variante: 'Sportback 2.5 TFSI quattro',
      motor: 'CEPA 2.5 TFSI R5',
      hubraumCcm: 2480,
      leistungKw: 250,
      getriebe: 'doppelkupplung',
      antrieb: 'allrad',
      erstzulassung: '2012-02',
      produktionsjahr: 2011,
      farbeAussen: 'Panthergrau',
      farbeInnen: 'Leder/Alcantara Schwarz',
      ausstattung: ['sportabgasanlage', 'navigation'],
      ausstattungstext: 'Sportabgasanlage, Navigation plus, Sitzheizung',
      vin: null,
      fahrzeugland: 'AT',
      vorbesitzer: 3,
      mwstAusweisbar: null,
    },
    angebote: [
      {
        plattformId: 'willhaben',
        externeId: 'WH-1191220',
        url: 'https://www.willhaben.at/iad/gebrauchtwagen/d/auto/1191220',
        verkaeufer: V.privatWien,
        staende: [
          {
            tage: 63,
            preis: 22900,
            kilometerstand: 132400,
            titel: 'Audi RS3 8P Sportback 2,5 TFSI quattro',
            beschreibung:
              'RS3 der ersten Generation, nur zwei Baujahre gebaut. Serviceheft teilweise, Haldex-Service bei 118.000 km gemacht. Steuerkettenspanner wurde auf die aktuelle Version umgerüstet. Unfallfrei laut Vorbesitzer. Fahrzeug läuft einwandfrei.',
            unfall: 'unfallfrei-laut-vorbesitzer',
            service: 'teilweise',
            serviceangabe: 'Haldex-Service bei 118.000 km, Steuerkettenspanner umgerüstet',
            ort: 'Wien',
            land: 'AT',
            bilder: bilder('rs3-8p', [
              'front-3-4',
              'heck-3-4',
              'seite-links',
              'cockpit',
              'sitze-vorn',
              'motorraum',
              'felge-vorn-links',
            ]),
            unterlagen: ['rechnung'],
          },
          {
            tage: 15,
            preis: 21900,
            kilometerstand: 133800,
            titel: 'Audi RS3 8P Sportback 2,5 TFSI quattro',
            beschreibung:
              'RS3 der ersten Generation, nur zwei Baujahre gebaut. Serviceheft teilweise, Haldex-Service bei 118.000 km gemacht. Steuerkettenspanner wurde auf die aktuelle Version umgerüstet. Unfallfrei laut Vorbesitzer. Fahrzeug läuft einwandfrei. Preis VB.',
            unfall: 'unfallfrei-laut-vorbesitzer',
            service: 'teilweise',
            serviceangabe: 'Haldex-Service bei 118.000 km, Steuerkettenspanner umgerüstet',
            ort: 'Wien',
            land: 'AT',
            bilder: bilder('rs3-8p', [
              'front-3-4',
              'heck-3-4',
              'seite-links',
              'cockpit',
              'sitze-vorn',
              'motorraum',
              'felge-vorn-links',
            ]),
            unterlagen: ['rechnung'],
          },
        ],
      },
    ],
    dokumente: [
      {
        art: 'rechnung',
        bezeichnung: 'Steuerkettenspanner und Haldex-Service, 08/2023',
        hochgeladenAm: '2026-06-28T11:00:00.000Z',
        extrahiert: {
          datum: '2023-08-17',
          kilometerstand: 118000,
          werkstatt: 'Fünfzylinder Technik OG',
          leistungen: ['Steuerkettenspanner erneuert', 'Haldex-Service durchgeführt'],
          kostenEuro: 1980,
        },
        confidence: 90,
        belegtBehauptungen: ['Steuerkette erneuert', 'Haldex-Service durchgeführt'],
      },
    ],
  },

  /* ---------------------------------------------------------------------
   * 9 — Audi RS3 8V. Junges Fahrzeug: gutes Auto, schwaches Asset,
   *     scheitert am Firmenwagenfilter.
   * ------------------------------------------------------------------ */
  {
    schluessel: 'rs3-8v',
    basis: {
      hersteller: 'Audi',
      modell: 'RS3',
      baureihe: '8V',
      variante: 'Sportback 2.5 TFSI quattro',
      motor: 'DAZA 2.5 TFSI R5',
      hubraumCcm: 2480,
      leistungKw: 294,
      getriebe: 'doppelkupplung',
      antrieb: 'allrad',
      erstzulassung: '2018-05',
      produktionsjahr: 2018,
      farbeAussen: 'Nardograu',
      farbeInnen: 'Leder Schwarz mit rotem Kontrast',
      ausstattung: ['matrix-led', 'sportabgasanlage', 'schalensitze'],
      ausstattungstext: 'Matrix-LED, Sportabgasanlage, Schalensitze, virtuelles Cockpit',
      vin: 'WUAZZZ8V0JA123321',
      fahrzeugland: 'AT',
      vorbesitzer: 1,
      mwstAusweisbar: true,
    },
    angebote: [
      {
        plattformId: 'mobile-de',
        externeId: 'MOB-422110877',
        url: 'https://suchen.mobile.de/fahrzeuge/details.html?id=422110877',
        verkaeufer: V.audiZentrum,
        staende: [
          {
            tage: 27,
            preis: 43900,
            kilometerstand: 64200,
            titel: 'Audi RS3 Sportback 2.5 TFSI quattro S tronic — Erstbesitz',
            beschreibung:
              'RS3 Sportback mit 400 PS aus erster Hand. Unfallfrei, lückenlose Audi-Servicehistorie, Haldex-Service bei 58.000 km. Matrix-LED, Sportabgasanlage, Schalensitze. Nardograu mit rotem Kontrast. Fahrzeug ohne jede Leistungssteigerung, Originalzustand.',
            unfall: 'unfallfrei',
            service: 'lueckenlos',
            serviceangabe: 'Lückenlos Audi, Haldex-Service bei 58.000 km',
            garantie: '12 Monate Garantie',
            ort: 'Linz',
            land: 'AT',
            bilder: bilder('rs3-8v', [
              'front-3-4',
              'heck-3-4',
              'seite-links',
              'cockpit',
              'sitze-vorn',
              'motorraum',
              'felge-vorn-links',
              'kofferraum',
              'tacho',
            ]),
            unterlagen: ['digitale-servicehistorie'],
          },
        ],
      },
    ],
    dokumente: [
      {
        art: 'digitale-servicehistorie',
        bezeichnung: 'Audi Servicehistorie, Auszug 07/2026',
        hochgeladenAm: '2026-07-16T13:00:00.000Z',
        extrahiert: {
          datum: '2026-07-10',
          kilometerstand: 62900,
          werkstatt: 'Audi Zentrum Linz',
          leistungen: ['Ölservice', 'Haldex-Service durchgeführt bei 58.000 km'],
          kostenEuro: 890,
        },
        confidence: 95,
        belegtBehauptungen: ['Lückenlose Servicehistorie', 'Haldex-Service durchgeführt'],
      },
    ],
  },

  /* ---------------------------------------------------------------------
   * 10 — Porsche 996 C4S als Restaurationsobjekt. Der Fall aus
   *      PRD Abschnitt 19: Kaufpreis 35.000 €, Aufarbeitungsbedarf.
   * ------------------------------------------------------------------ */
  {
    schluessel: 'porsche-996-restauration',
    basis: {
      hersteller: 'Porsche',
      modell: '911',
      baureihe: '996',
      variante: 'Carrera 4S Coupé',
      motor: 'M96/03 3.6 Boxer',
      hubraumCcm: 3596,
      leistungKw: 235,
      getriebe: 'handschalter',
      antrieb: 'allrad',
      erstzulassung: '2003-06',
      produktionsjahr: 2003,
      farbeAussen: 'Basaltschwarz metallic',
      farbeInnen: 'Leder Naturbraun',
      ausstattung: ['sportsitze', 'schiebedach'],
      ausstattungstext: 'Sportsitze, Schiebedach, Klimaautomatik, Bose',
      vin: 'WP0ZZZ99Z4S612345',
      fahrzeugland: 'AT',
      vorbesitzer: 4,
      mwstAusweisbar: null,
    },
    angebote: [
      {
        plattformId: 'willhaben',
        externeId: 'WH-1182774',
        url: 'https://www.willhaben.at/iad/gebrauchtwagen/d/auto/1182774',
        verkaeufer: V.privatWien,
        staende: [
          {
            tage: 96,
            preis: 38500,
            kilometerstand: 176400,
            titel: 'Porsche 911 996 Carrera 4S Handschalter — Projekt',
            beschreibung:
              'Porsche 996 C4S mit der breiten Karosserie und Handschaltung. Fahrzeug stand die letzten drei Jahre in einer trockenen Garage, längere Standzeit. Serviceheft nicht vorhanden, einzelne Rechnungen vorhanden. Motor läuft, Ölverbrauch etwa 0,8 Liter je 1.000 km. Bore Scoring wurde nie untersucht. An den hinteren Radläufen beginnende Korrosion. Innenraum mit deutlichen Gebrauchsspuren, Fahrersitzwange eingerissen. Reifen von 2016. Fahrzeug ist als Restaurationsobjekt zu sehen.',
            unfall: 'keine-angabe',
            service: 'keine',
            maengel:
              'Beginnende Korrosion hintere Radläufe, Fahrersitzwange eingerissen, Reifen überaltert, Klimaanlage ohne Funktion',
            ort: 'Wien',
            land: 'AT',
            bilder: [
              ...bilder('p996-basalt', ['front-3-4', 'heck-3-4', 'seite-links']),
              {
                motiv: 'p996-basalt-radlauf',
                merkmale: ['exterieur'],
                auffaelligkeiten: [
                  {
                    art: 'korrosion',
                    hinweis:
                      'Bild 4: Rostblasen am hinteren Radlauf links erkennbar. Manuelle Prüfung empfohlen.',
                    confidence: 78,
                  },
                ],
              },
              {
                motiv: 'p996-basalt-sitz',
                merkmale: ['innenraum'],
                auffaelligkeiten: [
                  {
                    art: 'sitzverschleiss',
                    hinweis: 'Bild 5: Riss in der Fahrersitzwange erkennbar.',
                    confidence: 84,
                  },
                ],
              },
              ...bilder('p996-basalt', ['cockpit', 'motorraum']),
              {
                motiv: 'p996-basalt-reifen',
                merkmale: ['felgen'],
                auffaelligkeiten: [
                  {
                    art: 'reifenmix',
                    hinweis: 'Bild 8: Unterschiedliche Reifenfabrikate vorne und hinten erkennbar.',
                    confidence: 66,
                  },
                ],
              },
            ],
            unterlagen: ['rechnung'],
          },
          {
            tage: 34,
            preis: 35000,
            kilometerstand: 176400,
            titel: 'Porsche 911 996 Carrera 4S Handschalter — Projekt, Preis reduziert',
            beschreibung:
              'Porsche 996 C4S mit der breiten Karosserie und Handschaltung. Fahrzeug stand die letzten drei Jahre in einer trockenen Garage, längere Standzeit. Serviceheft nicht vorhanden, einzelne Rechnungen vorhanden. Motor läuft, Ölverbrauch etwa 0,8 Liter je 1.000 km. Bore Scoring wurde nie untersucht. An den hinteren Radläufen beginnende Korrosion. Innenraum mit deutlichen Gebrauchsspuren, Fahrersitzwange eingerissen. Reifen von 2016. Fahrzeug ist als Restaurationsobjekt zu sehen. Preis deutlich reduziert.',
            unfall: 'keine-angabe',
            service: 'keine',
            maengel:
              'Beginnende Korrosion hintere Radläufe, Fahrersitzwange eingerissen, Reifen überaltert, Klimaanlage ohne Funktion',
            ort: 'Wien',
            land: 'AT',
            bilder: [
              ...bilder('p996-basalt', ['front-3-4', 'heck-3-4', 'seite-links']),
              {
                motiv: 'p996-basalt-radlauf',
                merkmale: ['exterieur'],
                auffaelligkeiten: [
                  {
                    art: 'korrosion',
                    hinweis:
                      'Bild 4: Rostblasen am hinteren Radlauf links erkennbar. Manuelle Prüfung empfohlen.',
                    confidence: 78,
                  },
                ],
              },
              {
                motiv: 'p996-basalt-sitz',
                merkmale: ['innenraum'],
                auffaelligkeiten: [
                  {
                    art: 'sitzverschleiss',
                    hinweis: 'Bild 5: Riss in der Fahrersitzwange erkennbar.',
                    confidence: 84,
                  },
                ],
              },
              ...bilder('p996-basalt', ['cockpit', 'motorraum']),
              {
                motiv: 'p996-basalt-reifen',
                merkmale: ['felgen'],
                auffaelligkeiten: [
                  {
                    art: 'reifenmix',
                    hinweis: 'Bild 8: Unterschiedliche Reifenfabrikate vorne und hinten erkennbar.',
                    confidence: 66,
                  },
                ],
              },
            ],
            unterlagen: ['rechnung'],
          },
        ],
      },
    ],
    dokumente: [
      {
        art: 'rechnung',
        bezeichnung: 'Kupplung und ZMS, Rechnung 04/2019',
        hochgeladenAm: '2026-07-10T15:00:00.000Z',
        extrahiert: {
          datum: '2019-04-11',
          kilometerstand: 152000,
          werkstatt: 'Porsche Zentrum Wien',
          leistungen: ['Kupplung erneuert', 'Zweimassenschwungrad erneuert'],
          kostenEuro: 2890,
        },
        confidence: 88,
        belegtBehauptungen: ['Kupplung erneuert'],
      },
    ],
  },

  /* ---------------------------------------------------------------------
   * 11 — Porsche 996 C4S in gutem Zustand, Fachbetrieb, mit Endoskopie.
   * ------------------------------------------------------------------ */
  {
    schluessel: 'porsche-996-gut',
    basis: {
      hersteller: 'Porsche',
      modell: '911',
      baureihe: '996',
      variante: 'Carrera 4S Coupé',
      motor: 'M96/03 3.6 Boxer',
      hubraumCcm: 3596,
      leistungKw: 235,
      getriebe: 'handschalter',
      antrieb: 'allrad',
      erstzulassung: '2004-09',
      produktionsjahr: 2004,
      farbeAussen: 'Arktissilber metallic',
      farbeInnen: 'Leder Naturbraun',
      ausstattung: ['sportsitze', 'sportabgasanlage', 'aerokit'],
      ausstattungstext: 'Sportsitze, Sportabgasanlage, Aerokit, Klimaautomatik, Bose',
      vin: 'WP0ZZZ99Z5S620111',
      fahrzeugland: 'AT',
      vorbesitzer: 2,
      mwstAusweisbar: true,
    },
    angebote: [
      {
        plattformId: 'mobile-de',
        externeId: 'MOB-420553311',
        url: 'https://suchen.mobile.de/fahrzeuge/details.html?id=420553311',
        verkaeufer: V.porscheSpezialist,
        staende: [
          {
            tage: 38,
            preis: 62900,
            kilometerstand: 112800,
            titel: 'Porsche 911 996 Carrera 4S Handschalter — Endoskopie liegt vor',
            beschreibung:
              'Porsche 996 Carrera 4S mit Handschaltung, zweiter Halter, unfallfrei. Wir haben das Fahrzeug in unserer Werkstatt vollständig durchgesehen: Endoskopie der Zylinderlaufbahnen ohne Befund, das IMS-Lager wurde 2021 bei 96.000 km auf die verstärkte Ausführung umgerüstet, RMS erneuert. Kühlerpakete gereinigt und auf Korrosion geprüft. Fahrwerk 2024 komplett überholt, Bremsscheiben neu. Serviceheft lückenlos, alle Rechnungen vorhanden. Aerokit, Sportabgasanlage, Naturbraun. Fahrzeug ohne Winterbetrieb, Unterboden trocken.',
            unfall: 'unfallfrei',
            service: 'lueckenlos',
            serviceangabe: 'Lückenlos Porsche und Fachbetrieb, letzter Service 05/2026 bei 111.000 km',
            garantie: '24 Monate Garantie über den Fachbetrieb',
            ort: 'Salzburg',
            land: 'AT',
            bilder: bilder('p996-arktis', [
              'front-3-4',
              'heck-3-4',
              'seite-links',
              'seite-rechts',
              'cockpit',
              'sitze-vorn',
              'motorraum',
              'felge-vorn-links',
              'felge-hinten-rechts',
              'unterboden-hebebuehne',
              'tacho',
              'typenschild',
              'kofferraum',
            ]),
            unterlagen: [
              'serviceheft',
              'rechnung',
              'motorrechnung',
              'gutachten',
              'messprotokoll',
              'pickerlbericht',
            ],
          },
        ],
      },
    ],
    dokumente: [
      {
        art: 'motorrechnung',
        bezeichnung: 'IMS-Umrüstung und RMS, Rechnung 06/2021',
        hochgeladenAm: '2026-07-08T09:00:00.000Z',
        extrahiert: {
          datum: '2021-06-24',
          kilometerstand: 96000,
          werkstatt: 'Boxermotor Spezialwerkstatt GmbH',
          leistungen: ['IMS-Lager erneuert', 'RMS erneuert', 'Kupplung geprüft'],
          kostenEuro: 3260,
        },
        confidence: 96,
        belegtBehauptungen: ['IMS-Lager erneuert'],
      },
      {
        art: 'messprotokoll',
        bezeichnung: 'Endoskopie Zylinderlaufbahnen, 06/2026',
        hochgeladenAm: '2026-07-08T09:02:00.000Z',
        extrahiert: {
          datum: '2026-06-12',
          kilometerstand: 112400,
          werkstatt: 'Boxermotor Spezialwerkstatt GmbH',
          leistungen: ['Endoskopie Zylinder 1–6 ohne Befund', 'Kompressionsmessung'],
          kostenEuro: 290,
        },
        confidence: 97,
        belegtBehauptungen: ['Endoskopie der Zylinderlaufbahnen liegt vor'],
      },
      {
        art: 'rechnung',
        bezeichnung: 'Fahrwerksüberholung und Kühlerpakete, 03/2024',
        hochgeladenAm: '2026-07-08T09:03:00.000Z',
        extrahiert: {
          datum: '2024-03-19',
          kilometerstand: 104500,
          werkstatt: 'Boxermotor Spezialwerkstatt GmbH',
          leistungen: [
            'Stoßdämpfer erneuert',
            'Querlenker erneuert',
            'Kühlerpaket gereinigt',
            'Bremsscheiben erneuert',
          ],
          kostenEuro: 5840,
        },
        confidence: 95,
        belegtBehauptungen: ['Fahrwerk überarbeitet', 'Kühler erneuert oder gereinigt', 'Bremsanlage erneuert'],
      },
      {
        art: 'serviceheft',
        bezeichnung: 'Porsche Serviceheft, 19 Einträge',
        hochgeladenAm: '2026-07-08T09:04:00.000Z',
        extrahiert: {
          datum: '2026-05-08',
          kilometerstand: 111000,
          werkstatt: 'Boxermotor Spezialwerkstatt GmbH',
          leistungen: ['Ölservice', 'Inspektion', 'Bremsflüssigkeit'],
          kostenEuro: 980,
        },
        confidence: 94,
        belegtBehauptungen: ['Lückenlose Servicehistorie'],
      },
      {
        art: 'gutachten',
        bezeichnung: 'Zustandsbericht Note 2, 06/2026',
        hochgeladenAm: '2026-07-08T09:05:00.000Z',
        extrahiert: {
          datum: '2026-06-18',
          kilometerstand: 112500,
          werkstatt: 'Ing. Reiter, Sachverständiger für Klassiker',
          leistungen: ['Zustandsnote 2', 'Lackschichtmessung', 'Unfallfreiheit bestätigt'],
          kostenEuro: 420,
        },
        confidence: 96,
        belegtBehauptungen: ['Unfallfrei'],
      },
      {
        art: 'pickerlbericht',
        bezeichnung: '§ 57a-Begutachtung 05/2026',
        hochgeladenAm: '2026-07-08T09:06:00.000Z',
        extrahiert: {
          datum: '2026-05-08',
          kilometerstand: 111000,
          werkstatt: 'Boxermotor Spezialwerkstatt GmbH',
          leistungen: ['Begutachtung ohne Mangel'],
          kostenEuro: 92,
        },
        confidence: 95,
        belegtBehauptungen: [],
      },
    ],
  },

  /* ---------------------------------------------------------------------
   * 12 — Porsche 997.1 Carrera S mit behaupteter Motorüberholung
   *      ohne Beleg. Das Lehrstück zum Evidence Score.
   * ------------------------------------------------------------------ */
  {
    schluessel: 'porsche-997-1',
    basis: {
      hersteller: 'Porsche',
      modell: '911',
      baureihe: '997.1',
      variante: 'Carrera S Coupé',
      motor: 'M97/01 3.8 Boxer',
      hubraumCcm: 3824,
      leistungKw: 261,
      getriebe: 'handschalter',
      antrieb: 'heck',
      erstzulassung: '2006-07',
      produktionsjahr: 2006,
      farbeAussen: 'Schwarz uni',
      farbeInnen: 'Leder Schwarz',
      ausstattung: ['sport-chrono', 'pasm', 'sportabgasanlage'],
      ausstattungstext: 'Sport Chrono Paket, PASM, Sportabgasanlage, Bose',
      vin: null,
      fahrzeugland: 'IT',
      vorbesitzer: 3,
      mwstAusweisbar: null,
    },
    angebote: [
      {
        plattformId: 'autoscout24',
        externeId: 'AS24-7522018',
        url: 'https://www.autoscout24.it/annunci/7522018',
        verkaeufer: V.privatBozen,
        staende: [
          {
            tage: 58,
            preis: 43900,
            kilometerstand: 134600,
            titel: 'Porsche 911 997 Carrera S Handschalter',
            beschreibung:
              'Porsche 997 Carrera S mit Handschaltung, Sport Chrono, PASM. Motor wurde überholt, seither rund 20.000 km gelaufen. Unfallfrei laut Vorbesitzer. Serviceheft teilweise vorhanden. Fahrzeug in Südtirol, Besichtigung nach Vereinbarung. Preis VB.',
            unfall: 'unfallfrei-laut-vorbesitzer',
            service: 'teilweise',
            serviceangabe: 'Motor überholt, danach regelmäßig gewartet',
            ort: 'Bozen',
            land: 'IT',
            bilder: bilder('p997-schwarz', [
              'front-3-4',
              'heck-3-4',
              'seite-links',
              'cockpit',
              'sitze-vorn',
              'motorraum',
            ]),
            unterlagen: [],
          },
          {
            tage: 11,
            preis: 41900,
            kilometerstand: 135400,
            titel: 'Porsche 911 997 Carrera S Handschalter',
            beschreibung:
              'Porsche 997 Carrera S mit Handschaltung, Sport Chrono, PASM. Motor wurde überholt, seither rund 20.000 km gelaufen. Unfallfrei laut Vorbesitzer. Serviceheft teilweise vorhanden. Fahrzeug in Südtirol, Besichtigung nach Vereinbarung. Letzter Preis.',
            unfall: 'unfallfrei-laut-vorbesitzer',
            service: 'teilweise',
            serviceangabe: 'Motor überholt, danach regelmäßig gewartet',
            ort: 'Bozen',
            land: 'IT',
            bilder: bilder('p997-schwarz', [
              'front-3-4',
              'heck-3-4',
              'seite-links',
              'cockpit',
              'sitze-vorn',
              'motorraum',
            ]),
            unterlagen: [],
          },
        ],
      },
    ],
    dokumente: [],
    nutzerbefunde: [
      {
        zeitpunkt: '2026-07-30T16:20:00.000Z',
        verfasser: 'H. Ing',
        feld: 'unfallangabe',
        behauptungSystem: 'unfallfrei-laut-vorbesitzer',
        befundNutzer: 'vorschaden-repariert',
        beleg:
          'Rückfrage beim Verkäufer: Front wurde 2019 nach Wildunfall instandgesetzt, Rechnung liegt beim Vorbesitzer.',
      },
    ],
  },

  /* ---------------------------------------------------------------------
   * 13 — Porsche 997.2 Carrera S, technisch unkritische Variante.
   * ------------------------------------------------------------------ */
  {
    schluessel: 'porsche-997-2',
    basis: {
      hersteller: 'Porsche',
      modell: '911',
      baureihe: '997.2',
      variante: 'Carrera S Coupé (DFI)',
      motor: 'MA1/01 3.8 DFI Boxer',
      hubraumCcm: 3800,
      leistungKw: 283,
      getriebe: 'handschalter',
      antrieb: 'heck',
      erstzulassung: '2010-04',
      produktionsjahr: 2010,
      farbeAussen: 'Karminrot',
      farbeInnen: 'Leder Schwarz',
      ausstattung: ['sport-chrono', 'pasm', 'sportabgasanlage', 'schalensitze'],
      ausstattungstext: 'Sport Chrono, PASM, Sportabgasanlage, Schalensitze, Bose',
      vin: 'WP0ZZZ99ZAS720456',
      fahrzeugland: 'DE',
      vorbesitzer: 2,
      mwstAusweisbar: true,
    },
    angebote: [
      {
        plattformId: 'mobile-de',
        externeId: 'MOB-421334990',
        url: 'https://suchen.mobile.de/fahrzeuge/details.html?id=421334990',
        verkaeufer: V.porscheSpezialist,
        staende: [
          {
            tage: 41,
            preis: 79900,
            kilometerstand: 89200,
            titel: 'Porsche 911 997.2 Carrera S Handschalter Karminrot',
            beschreibung:
              'Porsche 997.2 Carrera S mit DFI-Motor und Handschaltung — die technisch unkritische Variante ohne Bore-Scoring-Thematik. Zweiter Halter, unfallfrei, digitale Servicehistorie lückenlos. Sport Chrono, PASM, Sportabgasanlage, Schalensitze. Karminrot ist eine Sonderfarbe und im Markt gesucht. Kühlerpakete 2025 gereinigt, Bremsscheiben bei 84.000 km erneuert.',
            unfall: 'unfallfrei',
            service: 'lueckenlos',
            serviceangabe: 'Digitale Servicehistorie lückenlos, letzter Service 04/2026 bei 87.500 km',
            garantie: '24 Monate Garantie über den Fachbetrieb',
            ort: 'Salzburg',
            land: 'AT',
            bilder: bilder('p997-2-karmin', [
              'front-3-4',
              'heck-3-4',
              'seite-links',
              'seite-rechts',
              'cockpit',
              'sitze-vorn',
              'motorraum',
              'felge-vorn-links',
              'unterboden-hebebuehne',
              'tacho',
              'typenschild',
            ]),
            unterlagen: ['digitale-servicehistorie', 'rechnung', 'pickerlbericht'],
          },
          {
            tage: 6,
            preis: 77900,
            kilometerstand: 89600,
            titel: 'Porsche 911 997.2 Carrera S Handschalter Karminrot',
            beschreibung:
              'Porsche 997.2 Carrera S mit DFI-Motor und Handschaltung — die technisch unkritische Variante ohne Bore-Scoring-Thematik. Zweiter Halter, unfallfrei, digitale Servicehistorie lückenlos. Sport Chrono, PASM, Sportabgasanlage, Schalensitze. Karminrot ist eine Sonderfarbe und im Markt gesucht. Kühlerpakete 2025 gereinigt, Bremsscheiben bei 84.000 km erneuert. Preis angepasst.',
            unfall: 'unfallfrei',
            service: 'lueckenlos',
            serviceangabe: 'Digitale Servicehistorie lückenlos, letzter Service 04/2026 bei 87.500 km',
            garantie: '24 Monate Garantie über den Fachbetrieb',
            ort: 'Salzburg',
            land: 'AT',
            bilder: bilder('p997-2-karmin', [
              'front-3-4',
              'heck-3-4',
              'seite-links',
              'seite-rechts',
              'cockpit',
              'sitze-vorn',
              'motorraum',
              'felge-vorn-links',
              'unterboden-hebebuehne',
              'tacho',
              'typenschild',
            ]),
            unterlagen: ['digitale-servicehistorie', 'rechnung', 'pickerlbericht'],
          },
        ],
      },
    ],
    dokumente: [
      {
        art: 'digitale-servicehistorie',
        bezeichnung: 'Porsche Servicehistorie, Auszug 07/2026',
        hochgeladenAm: '2026-07-12T10:00:00.000Z',
        extrahiert: {
          datum: '2026-04-22',
          kilometerstand: 87500,
          werkstatt: 'Porsche Zentrum Salzburg',
          leistungen: ['Ölservice', 'Inspektion', 'Bremsflüssigkeit'],
          kostenEuro: 1120,
        },
        confidence: 96,
        belegtBehauptungen: ['Lückenlose Servicehistorie'],
      },
      {
        art: 'rechnung',
        bezeichnung: 'Kühlerpakete und Bremsscheiben, 2025',
        hochgeladenAm: '2026-07-12T10:01:00.000Z',
        extrahiert: {
          datum: '2025-08-04',
          kilometerstand: 84000,
          werkstatt: 'Boxermotor Spezialwerkstatt GmbH',
          leistungen: ['Kühlerpaket gereinigt', 'Bremsscheiben erneuert'],
          kostenEuro: 3120,
        },
        confidence: 93,
        belegtBehauptungen: ['Kühler erneuert oder gereinigt', 'Bremsanlage erneuert'],
      },
      {
        art: 'pickerlbericht',
        bezeichnung: '§ 57a-Begutachtung 04/2026',
        hochgeladenAm: '2026-07-12T10:02:00.000Z',
        extrahiert: {
          datum: '2026-04-22',
          kilometerstand: 87500,
          werkstatt: 'Porsche Zentrum Salzburg',
          leistungen: ['Begutachtung ohne Mangel'],
          kostenEuro: 92,
        },
        confidence: 95,
        belegtBehauptungen: [],
      },
    ],
  },
];
