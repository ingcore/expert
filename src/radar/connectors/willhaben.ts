/**
 * Connector willhaben — PRD Abschnitt 8, Zugriffsart „zulässiger technischer
 * Webzugriff".
 *
 * Das ist die unterste Rangstufe aus Abschnitt 8 und die aufwendigste: Es gibt
 * keine strukturierten Felder, sondern nur die Anzeigetexte der Detailseite.
 * Preis, Kilometerstand, Leistung und Erstzulassung müssen aus formatiertem
 * Text zurückgewonnen werden — `"€ 39.900,-"`, `"91.100 km"`,
 * `"420 PS (309 kW)"`, `"03/2010"`.
 *
 * Genau daran zeigt sich, warum die Rangfolge in Abschnitt 8 keine
 * Geschmacksfrage ist: Jede dieser Umwandlungen kann scheitern, und jedes
 * Scheitern erzeugt eine Datenlücke statt eines falschen Wertes. Deshalb ist
 * die Confidence dieser Quelle in `datenqualitaet.ts` niedriger angesetzt.
 *
 * Der rechtliche Rahmen ist in `wissen/plattformen.ts` dokumentiert und
 * ausdrücklich offen: Ein Partner- oder Lizenzzugang ist anzustreben.
 */

import type { InseratDaten } from '../domain/types';
import { plattform } from '../wissen/plattformen';
import { erzeugeConnector } from './demo-basis';
import {
  alsAntrieb,
  alsBelegarten,
  alsBilder,
  alsGetriebe,
  alsServicehistorie,
  alsUnfallangabe,
  alsVerkaeuferart,
  lesListe,
  lesMonat,
  lesText,
  lesZahl,
  type Connector,
  type RohBild,
  type RohInserat,
} from './typen';

/** `M3 E92 Coupé` → Modell, Baureihe, Variante. */
function zerlegeModell(text: string | null): {
  modell: string;
  baureihe: string;
  variante: string;
} {
  if (!text) return { modell: '', baureihe: '', variante: '' };
  const teile = text.trim().split(/\s+/);
  return {
    modell: teile[0] ?? '',
    baureihe: teile[1] ?? '',
    variante: teile.slice(2).join(' '),
  };
}

/** `420 PS (309 kW)` → 420. Ohne PS-Angabe wird aus kW umgerechnet. */
function leistungAus(text: string | null): number | null {
  if (!text) return null;
  const ps = /(\d+)\s*ps/i.exec(text);
  if (ps) return Number.parseInt(ps[1], 10);
  const kw = /(\d+)\s*kw/i.exec(text);
  if (kw) return Math.round(Number.parseInt(kw[1], 10) * 1.35962);
  return null;
}

/** `Wien, AT` → Ort und Land. */
function zerlegeOrt(text: string | null): { ort: string; land: string } {
  if (!text) return { ort: '', land: '' };
  const teile = text.split(',').map((t) => t.trim());
  return { ort: teile[0] ?? '', land: teile[1] ?? '' };
}

/** `S65B40 V8, 3999 ccm` → Motorbezeichnung und Hubraum. */
function zerlegeMotor(text: string | null): { motor: string; hubraum: number | null } {
  if (!text) return { motor: '', hubraum: null };
  const teile = text.split(',');
  const hubraum = /(\d[\d.\s]*)\s*ccm/i.exec(text);
  return {
    motor: teile[0].trim(),
    hubraum: hubraum ? Number.parseInt(hubraum[1].replace(/[.\s]/g, ''), 10) : null,
  };
}

function mwstAus(text: string | null): boolean | null {
  if (!text) return null;
  if (/exkl\.?\s*mwst|ausweisbar/i.test(text) && !/nicht\s+ausweisbar/i.test(text)) return true;
  if (/nicht\s+ausweisbar|inkl\.?\s*mwst/i.test(text)) return false;
  return null;
}

export function normalizeWillhaben(roh: RohInserat, bilder: RohBild[]): InseratDaten {
  const n = roh.nutzlast;
  const { modell, baureihe, variante } = zerlegeModell(lesText(n, 'modellText'));
  const { ort, land } = zerlegeOrt(lesText(n, 'ortText'));
  const { motor, hubraum } = zerlegeMotor(lesText(n, 'motorText'));

  return {
    hersteller: lesText(n, 'marke') ?? '',
    modell,
    baureihe,
    variante,
    motor,
    hubraumCcm: hubraum,
    leistungPs: leistungAus(lesText(n, 'leistungText')),
    getriebe: alsGetriebe(lesText(n, 'getriebeText')),
    antrieb: alsAntrieb(lesText(n, 'antriebText')),
    erstzulassung: lesMonat(n, 'erstzulassungText'),
    produktionsjahr: lesZahl(n, 'baujahrText'),
    kilometerstand: lesZahl(n, 'kilometerstandText'),
    farbeAussen: lesText(n, 'farbeText'),
    farbeInnen: lesText(n, 'innenText'),
    ausstattung: lesListe(n, 'ausstattungListe'),
    vin: lesText(n, 'fahrgestellnummerText'),
    fahrzeugland: lesText(n, 'herkunftText'),
    vorbesitzer: lesZahl(n, 'vorbesitzerText'),
    servicehistorie: alsServicehistorie(lesText(n, 'serviceText')),

    preis: lesZahl(n, 'preisText') ?? 0,
    waehrung: 'EUR',
    mwstAusweisbar: mwstAus(lesText(n, 'mwstText')),
    verkaeuferArt: alsVerkaeuferart(lesText(n, 'anbieterText')),
    verkaeuferName: lesText(n, 'anbietername') ?? '',
    standortOrt: ort,
    standortLand: land,

    titel: lesText(n, 'ueberschrift') ?? '',
    beschreibung: lesText(n, 'beschreibungText') ?? '',
    ausstattungstext: lesText(n, 'ausstattungText'),
    garantie: lesText(n, 'garantieText'),
    unfallangabe: alsUnfallangabe(lesText(n, 'zustandText')),
    serviceangabe: lesText(n, 'servicehinweisText'),
    umbauten: lesText(n, 'umbautenText'),
    bekannteMaengel: lesText(n, 'maengelText'),

    bilder: alsBilder(bilder, `${roh.plattformId}-${roh.externeId}`),
    genannteUnterlagen: alsBelegarten(lesListe(n, 'unterlagenText')),
  };
}

export function connectorWillhaben(): Connector {
  const p = plattform('willhaben');
  if (!p) throw new Error('Plattform willhaben ist nicht konfiguriert.');
  return erzeugeConnector(p, normalizeWillhaben);
}
