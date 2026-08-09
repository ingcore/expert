/**
 * Erzeugung plattformtypischer Rohnutzlasten aus dem Datenbestand.
 *
 * Jede Plattform stellt dieselben Sachverhalte anders dar, und genau daran
 * arbeitet sich `normalize()` in den Connectoren ab:
 *
 *   mobile.de     englische Feldnamen, Leistung in kW, Aufzählungen als
 *                 Großbuchstabenkonstanten, Preis als Zahl
 *   AutoScout24   deutsche Feldnamen, Preis als formatierter Text,
 *                 Ausstattung als Semikolonliste, Erstzulassung ISO
 *   willhaben     reine Anzeigetexte — „€ 39.900,-", „91.100 km",
 *                 „420 PS (309 kW)", „03/2010"
 *
 * Diese Datei steht bewusst außerhalb von `connectors/`: Sie ist die
 * simulierte Außenwelt, nicht Teil der Anwendung. Die Connectoren kennen sie
 * nur über die Abrufschnittstelle und dürfen nichts über ihren Aufbau annehmen.
 */

import { STICHTAG_MS } from '../domain/format';
import type { RohBild, RohVerkaeufer } from '../connectors/typen';
import {
  phash,
  SEEDFAHRZEUGE,
  type Angebot,
  type Angebotstand,
  type Fahrzeugbasis,
  type SeedBild,
} from './fahrzeugdaten';

export interface Marktstand {
  zeitpunkt: string;
  nutzlast: Record<string, unknown>;
  bilder: RohBild[];
}

export interface Marktinserat {
  plattformId: string;
  externeId: string;
  url: string;
  verkaeufer: RohVerkaeufer;
  staende: Marktstand[];
  entferntAm: string | null;
  /**
   * Wahres Fahrzeug hinter dem Inserat. Die Anwendung liest dieses Feld nie —
   * es dient ausschließlich dazu, in den Tests zu prüfen, ob die Vehicle
   * Identity Engine richtig zusammengeführt hat.
   */
  wahresFahrzeug: string;
}

function zeitpunkt(tageVorStichtag: number): string {
  return new Date(STICHTAG_MS - tageVorStichtag * 86_400_000).toISOString();
}

function rohbilder(bilder: SeedBild[], plattform: string): RohBild[] {
  return bilder.map((b, i) => ({
    url: `https://bilder.${plattform}/${b.motiv}-${i + 1}.jpg`,
    position: i + 1,
    phash: phash(b.motiv),
    aufgenommen: b.aufgenommen ?? null,
    merkmale: b.merkmale,
    auffaelligkeiten: b.auffaelligkeiten ?? [],
  }));
}

function verbunden(basis: Fahrzeugbasis, stand: Angebotstand): Fahrzeugbasis {
  return { ...basis, ...(stand.abweichung ?? {}) };
}

function psAus(kw: number): number {
  return Math.round(kw * 1.35962);
}

/** `2010-03` → `03/2010`. */
function alsDeutschesDatum(monat: string): string {
  const [jahr, mon] = monat.split('-');
  return `${mon}/${jahr}`;
}

function alsPreistext(preis: number): string {
  return `€ ${preis.toLocaleString('de-AT')},-`;
}

/* ==========================================================================
 * mobile.de
 * ======================================================================= */

const MOBILE_GETRIEBE: Record<string, string> = {
  handschalter: 'MANUAL_GEAR',
  automatik: 'AUTOMATIC_GEAR',
  doppelkupplung: 'AUTOMATIC_GEAR_DCT',
  unbekannt: 'UNKNOWN',
};

const MOBILE_SCHADEN: Record<string, string> = {
  unfallfrei: 'ACCIDENT_FREE',
  'unfallfrei-laut-vorbesitzer': 'ACCIDENT_FREE_ACCORDING_TO_PREVIOUS_OWNER',
  'vorschaden-repariert': 'REPAIRED_DAMAGE',
  unfallschaden: 'DAMAGED_UNREPAIRED',
  'keine-angabe': 'NO_INFORMATION',
};

const MOBILE_SERVICE: Record<string, string> = {
  lueckenlos: 'FULL',
  teilweise: 'PARTIAL',
  keine: 'NONE',
  unbekannt: 'NOT_SPECIFIED',
};

function nutzlastMobile(
  basis: Fahrzeugbasis,
  stand: Angebotstand,
  angebot: Angebot,
): Record<string, unknown> {
  const b = verbunden(basis, stand);
  return {
    make: b.hersteller,
    model: b.modell,
    modelDescription: `${b.baureihe} ${b.variante}`,
    engineDescription: b.motor,
    cubicCapacity: b.hubraumCcm,
    powerKw: b.leistungKw,
    gearbox: MOBILE_GETRIEBE[b.getriebe],
    driveType: b.antrieb === 'allrad' ? 'ALL_WHEEL_DRIVE' : b.antrieb === 'heck' ? 'REAR_WHEEL_DRIVE' : 'FRONT_WHEEL_DRIVE',
    firstRegistration: alsDeutschesDatum(b.erstzulassung),
    constructionYear: b.produktionsjahr,
    mileage: stand.kilometerstand,
    exteriorColor: b.farbeAussen,
    interiorType: b.farbeInnen,
    features: b.ausstattung,
    featureText: b.ausstattungstext,
    vin: b.vin,
    countryVersion: b.fahrzeugland,
    numberOfPreviousOwners: b.vorbesitzer,
    fullServiceHistory: MOBILE_SERVICE[stand.service],
    serviceNote: stand.serviceangabe ?? null,
    damageCondition: MOBILE_SCHADEN[stand.unfall],
    price: stand.preis,
    currency: 'EUR',
    vatDeductible: b.mwstAusweisbar,
    sellerType: angebot.verkaeufer.art === 'haendler' ? 'DEALER' : 'PRIVATE',
    sellerName: angebot.verkaeufer.name,
    city: stand.ort,
    country: stand.land,
    title: stand.titel,
    description: stand.beschreibung,
    warranty: stand.garantie ?? null,
    modifications: stand.umbauten ?? null,
    knownDefects: stand.maengel ?? null,
    documents: stand.unterlagen,
  };
}

/* ==========================================================================
 * AutoScout24
 * ======================================================================= */

const AS24_GETRIEBE: Record<string, string> = {
  handschalter: 'Schaltgetriebe',
  automatik: 'Automatik',
  doppelkupplung: 'Automatik (Doppelkupplung)',
  unbekannt: '',
};

const AS24_SCHADEN: Record<string, string> = {
  unfallfrei: 'Unfallfrei',
  'unfallfrei-laut-vorbesitzer': 'Unfallfrei laut Vorbesitzer',
  'vorschaden-repariert': 'Vorschaden, repariert',
  unfallschaden: 'Unfallschaden',
  'keine-angabe': '',
};

const AS24_SERVICE: Record<string, string> = {
  lueckenlos: 'Ja, lückenlos',
  teilweise: 'Teilweise',
  keine: 'Nein',
  unbekannt: '',
};

function nutzlastAutoscout(
  basis: Fahrzeugbasis,
  stand: Angebotstand,
  angebot: Angebot,
): Record<string, unknown> {
  const b = verbunden(basis, stand);
  return {
    marke: b.hersteller,
    modell: b.modell,
    version: `${b.baureihe} ${b.variante}`,
    motorbezeichnung: b.motor,
    hubraum: `${b.hubraumCcm} cm³`,
    kw: b.leistungKw,
    getriebe: AS24_GETRIEBE[b.getriebe],
    antriebsart: b.antrieb === 'allrad' ? 'Allrad' : b.antrieb === 'heck' ? 'Heck' : 'Front',
    ez: b.erstzulassung,
    baujahr: b.produktionsjahr,
    km: stand.kilometerstand === null ? null : `${stand.kilometerstand.toLocaleString('de-AT')}`,
    farbe: b.farbeAussen,
    innenausstattung: b.farbeInnen,
    ausstattung: b.ausstattung.join('; '),
    ausstattungstext: b.ausstattungstext,
    fahrgestellnummer: b.vin,
    herkunftsland: b.fahrzeugland,
    vorbesitzer: b.vorbesitzer === null ? '' : `${b.vorbesitzer}`,
    serviceheft: AS24_SERVICE[stand.service],
    servicehinweis: stand.serviceangabe ?? '',
    zustand: AS24_SCHADEN[stand.unfall],
    preis: `${stand.preis.toLocaleString('de-AT')} €`,
    mwstAusweisbar: b.mwstAusweisbar === null ? '' : b.mwstAusweisbar ? 'Ja' : 'Nein',
    anbieter: angebot.verkaeufer.art === 'haendler' ? 'Händler' : 'Privatanbieter',
    anbietername: angebot.verkaeufer.name,
    ort: stand.ort,
    land: stand.land,
    titel: stand.titel,
    beschreibung: stand.beschreibung,
    garantie: stand.garantie ?? '',
    umbauten: stand.umbauten ?? '',
    maengel: stand.maengel ?? '',
    unterlagen: stand.unterlagen.join('; '),
  };
}

/* ==========================================================================
 * willhaben — reine Anzeigetexte
 * ======================================================================= */

const WH_GETRIEBE: Record<string, string> = {
  handschalter: 'Schaltgetriebe',
  automatik: 'Automatik',
  doppelkupplung: 'Automatik (DSG/S-tronic)',
  unbekannt: 'keine Angabe',
};

const WH_SCHADEN: Record<string, string> = {
  unfallfrei: 'unfallfrei',
  'unfallfrei-laut-vorbesitzer': 'unfallfrei laut Vorbesitzer',
  'vorschaden-repariert': 'Vorschaden, fachgerecht repariert',
  unfallschaden: 'Unfallschaden',
  'keine-angabe': 'keine Angabe',
};

const WH_SERVICE: Record<string, string> = {
  lueckenlos: 'Serviceheft lückenlos',
  teilweise: 'Serviceheft teilweise',
  keine: 'kein Serviceheft',
  unbekannt: 'keine Angabe',
};

function nutzlastWillhaben(
  basis: Fahrzeugbasis,
  stand: Angebotstand,
  angebot: Angebot,
): Record<string, unknown> {
  const b = verbunden(basis, stand);
  return {
    ueberschrift: stand.titel,
    marke: b.hersteller,
    modellText: `${b.modell} ${b.baureihe} ${b.variante}`,
    motorText: `${b.motor}, ${b.hubraumCcm} ccm`,
    leistungText: `${psAus(b.leistungKw)} PS (${b.leistungKw} kW)`,
    getriebeText: WH_GETRIEBE[b.getriebe],
    antriebText: b.antrieb === 'allrad' ? 'Allradantrieb' : b.antrieb === 'heck' ? 'Hinterradantrieb' : 'Vorderradantrieb',
    erstzulassungText: alsDeutschesDatum(b.erstzulassung),
    baujahrText: b.produktionsjahr === null ? '' : `${b.produktionsjahr}`,
    kilometerstandText:
      stand.kilometerstand === null ? '' : `${stand.kilometerstand.toLocaleString('de-AT')} km`,
    preisText: alsPreistext(stand.preis),
    mwstText: b.mwstAusweisbar === null ? '' : b.mwstAusweisbar ? 'Preis exkl. MwSt. ausweisbar' : 'Preis inkl. MwSt., nicht ausweisbar',
    farbeText: b.farbeAussen ?? '',
    innenText: b.farbeInnen ?? '',
    ausstattungText: b.ausstattungstext ?? '',
    ausstattungListe: b.ausstattung,
    fahrgestellnummerText: b.vin ?? '',
    herkunftText: b.fahrzeugland ?? '',
    vorbesitzerText: b.vorbesitzer === null ? '' : `${b.vorbesitzer} Vorbesitzer`,
    serviceText: WH_SERVICE[stand.service],
    servicehinweisText: stand.serviceangabe ?? '',
    zustandText: WH_SCHADEN[stand.unfall],
    anbieterText: angebot.verkaeufer.art === 'haendler' ? 'Händler' : 'Privat',
    anbietername: angebot.verkaeufer.name,
    ortText: `${stand.ort}, ${stand.land}`,
    beschreibungText: stand.beschreibung,
    garantieText: stand.garantie ?? '',
    umbautenText: stand.umbauten ?? '',
    maengelText: stand.maengel ?? '',
    unterlagenText: stand.unterlagen.join(', '),
  };
}

/* ==========================================================================
 * Zusammenstellung
 * ======================================================================= */

const ERZEUGER: Record<
  string,
  (basis: Fahrzeugbasis, stand: Angebotstand, angebot: Angebot) => Record<string, unknown>
> = {
  'mobile-de': nutzlastMobile,
  autoscout24: nutzlastAutoscout,
  willhaben: nutzlastWillhaben,
};

export const MARKT: Marktinserat[] = SEEDFAHRZEUGE.flatMap((fahrzeug) =>
  fahrzeug.angebote.map<Marktinserat>((angebot) => {
    const erzeuger = ERZEUGER[angebot.plattformId];
    if (!erzeuger) {
      throw new Error(`Kein Rohdatenerzeuger für Plattform ${angebot.plattformId}`);
    }
    return {
      plattformId: angebot.plattformId,
      externeId: angebot.externeId,
      url: angebot.url,
      verkaeufer: {
        externeId: angebot.verkaeufer.externeId,
        name: angebot.verkaeufer.name,
        art: angebot.verkaeufer.art,
        ort: angebot.verkaeufer.ort,
        land: angebot.verkaeufer.land,
        identitaetBelegt: angebot.verkaeufer.identitaetBelegt,
        seitJahr: angebot.verkaeufer.seitJahr,
        bewertung: angebot.verkaeufer.bewertung,
        anzahlInserate: angebot.verkaeufer.anzahlInserate,
      },
      staende: [...angebot.staende]
        .sort((a, b) => b.tage - a.tage)
        .map((stand) => ({
          zeitpunkt: zeitpunkt(stand.tage),
          nutzlast: erzeuger(fahrzeug.basis, stand, angebot),
          bilder: rohbilder(stand.bilder, angebot.plattformId),
        })),
      entferntAm: angebot.entferntTage === undefined ? null : zeitpunkt(angebot.entferntTage),
      wahresFahrzeug: fahrzeug.schluessel,
    };
  }),
);

/** Alle Inserate einer Plattform. */
export function marktFuerPlattform(plattformId: string): Marktinserat[] {
  return MARKT.filter((m) => m.plattformId === plattformId);
}
