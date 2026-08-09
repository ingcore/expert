/**
 * Connector mobile.de — PRD Abschnitt 8, Zugriffsart „offizielle API".
 *
 * mobile.de liefert strukturierte Felder mit englischen Namen, Aufzählungen
 * als Großbuchstabenkonstanten und die Leistung in Kilowatt. Die Zuordnung der
 * Konstanten steht in Tabellen und nicht in Textmustern: Bei einer klar
 * dokumentierten Schnittstelle ist die exakte Zuordnung richtig, und ein
 * unbekannter Wert soll auffallen statt stillschweigend zum nächstbesten Wert
 * zu werden.
 */

import type {
  Antrieb,
  Getriebe,
  InseratDaten,
  Servicehistorie,
  Unfallangabe,
} from '../domain/types';
import { plattform } from '../wissen/plattformen';
import { erzeugeConnector } from './demo-basis';
import {
  alsBelegarten,
  alsBilder,
  alsVerkaeuferart,
  kwZuPs,
  lesJaNein,
  lesListe,
  lesMonat,
  lesText,
  lesZahl,
  type Connector,
  type RohBild,
  type RohInserat,
} from './typen';

const GETRIEBE: Record<string, Getriebe> = {
  MANUAL_GEAR: 'handschalter',
  AUTOMATIC_GEAR: 'automatik',
  AUTOMATIC_GEAR_DCT: 'doppelkupplung',
  SEMIAUTOMATIC_GEAR: 'automatik',
};

const ANTRIEB: Record<string, Antrieb> = {
  ALL_WHEEL_DRIVE: 'allrad',
  REAR_WHEEL_DRIVE: 'heck',
  FRONT_WHEEL_DRIVE: 'front',
};

const SCHADEN: Record<string, Unfallangabe> = {
  ACCIDENT_FREE: 'unfallfrei',
  ACCIDENT_FREE_ACCORDING_TO_PREVIOUS_OWNER: 'unfallfrei-laut-vorbesitzer',
  REPAIRED_DAMAGE: 'vorschaden-repariert',
  DAMAGED_UNREPAIRED: 'unfallschaden',
  NO_INFORMATION: 'keine-angabe',
};

const SERVICE: Record<string, Servicehistorie> = {
  FULL: 'lueckenlos',
  PARTIAL: 'teilweise',
  NONE: 'keine',
  NOT_SPECIFIED: 'unbekannt',
};

/** `E92 Coupé` → Baureihe `E92`, Variante `Coupé`. */
function zerlegeModellbeschreibung(text: string | null): {
  baureihe: string;
  variante: string;
} {
  if (!text) return { baureihe: '', variante: '' };
  const teile = text.trim().split(/\s+/);
  return { baureihe: teile[0] ?? '', variante: teile.slice(1).join(' ') };
}

export function normalizeMobile(roh: RohInserat, bilder: RohBild[]): InseratDaten {
  const n = roh.nutzlast;
  const { baureihe, variante } = zerlegeModellbeschreibung(lesText(n, 'modelDescription'));

  const getriebeCode = lesText(n, 'gearbox');
  const antriebCode = lesText(n, 'driveType');
  const schadenCode = lesText(n, 'damageCondition');
  const serviceCode = lesText(n, 'fullServiceHistory');

  return {
    hersteller: lesText(n, 'make') ?? '',
    modell: lesText(n, 'model') ?? '',
    baureihe,
    variante,
    motor: lesText(n, 'engineDescription') ?? '',
    hubraumCcm: lesZahl(n, 'cubicCapacity'),
    leistungPs: kwZuPs(lesZahl(n, 'powerKw')),
    getriebe: (getriebeCode && GETRIEBE[getriebeCode]) || 'unbekannt',
    antrieb: (antriebCode && ANTRIEB[antriebCode]) || 'unbekannt',
    erstzulassung: lesMonat(n, 'firstRegistration'),
    produktionsjahr: lesZahl(n, 'constructionYear'),
    kilometerstand: lesZahl(n, 'mileage'),
    farbeAussen: lesText(n, 'exteriorColor'),
    farbeInnen: lesText(n, 'interiorType'),
    ausstattung: lesListe(n, 'features'),
    vin: lesText(n, 'vin'),
    fahrzeugland: lesText(n, 'countryVersion'),
    vorbesitzer: lesZahl(n, 'numberOfPreviousOwners'),
    servicehistorie: (serviceCode && SERVICE[serviceCode]) || 'unbekannt',

    preis: lesZahl(n, 'price') ?? 0,
    waehrung: lesText(n, 'currency') ?? 'EUR',
    mwstAusweisbar: lesJaNein(n, 'vatDeductible'),
    verkaeuferArt: alsVerkaeuferart(lesText(n, 'sellerType')),
    verkaeuferName: lesText(n, 'sellerName') ?? '',
    standortOrt: lesText(n, 'city') ?? '',
    standortLand: lesText(n, 'country') ?? '',

    titel: lesText(n, 'title') ?? '',
    beschreibung: lesText(n, 'description') ?? '',
    ausstattungstext: lesText(n, 'featureText'),
    garantie: lesText(n, 'warranty'),
    unfallangabe: (schadenCode && SCHADEN[schadenCode]) || 'keine-angabe',
    serviceangabe: lesText(n, 'serviceNote'),
    umbauten: lesText(n, 'modifications'),
    bekannteMaengel: lesText(n, 'knownDefects'),

    bilder: alsBilder(bilder, `${roh.plattformId}-${roh.externeId}`),
    genannteUnterlagen: alsBelegarten(lesListe(n, 'documents')),
  };
}

export function connectorMobileDe(): Connector {
  const p = plattform('mobile-de');
  if (!p) throw new Error('Plattform mobile-de ist nicht konfiguriert.');
  return erzeugeConnector(p, normalizeMobile);
}
