/**
 * Connector AutoScout24 — PRD Abschnitt 8, Zugriffsart „offizieller Datenfeed".
 *
 * Der Feed liefert deutsche Feldnamen und überwiegend Freitext: Der Preis
 * kommt als `"38.900 €"`, der Kilometerstand als `"91.100"`, die Ausstattung
 * als Semikolonliste. Die Auswertung erfolgt deshalb über die Lesehilfen mit
 * deutscher Zahlenkonvention und über Textmuster statt über Wertetabellen.
 *
 * Ein Detail mit Folgen: Der Zustandstext `"Unfallfrei laut Vorbesitzer"`
 * enthält das Wort „Unfallfrei". Wer nur darauf prüft, macht aus einer
 * weitergegebenen Aussage eine Zusicherung — genau die Unterscheidung, auf der
 * der Evidence Score aufbaut. `alsUnfallangabe()` prüft die Zurechnung zuerst.
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

/** `E92 Coupé` → Baureihe und Variante. */
function zerlegeVersion(text: string | null): { baureihe: string; variante: string } {
  if (!text) return { baureihe: '', variante: '' };
  const teile = text.trim().split(/\s+/);
  return { baureihe: teile[0] ?? '', variante: teile.slice(1).join(' ') };
}

export function normalizeAutoscout(roh: RohInserat, bilder: RohBild[]): InseratDaten {
  const n = roh.nutzlast;
  const { baureihe, variante } = zerlegeVersion(lesText(n, 'version'));

  return {
    hersteller: lesText(n, 'marke') ?? '',
    modell: lesText(n, 'modell') ?? '',
    baureihe,
    variante,
    motor: lesText(n, 'motorbezeichnung') ?? '',
    hubraumCcm: lesZahl(n, 'hubraum'),
    leistungPs: kwZuPs(lesZahl(n, 'kw')),
    getriebe: alsGetriebe(lesText(n, 'getriebe')),
    antrieb: alsAntrieb(lesText(n, 'antriebsart')),
    erstzulassung: lesMonat(n, 'ez'),
    produktionsjahr: lesZahl(n, 'baujahr'),
    kilometerstand: lesZahl(n, 'km'),
    farbeAussen: lesText(n, 'farbe'),
    farbeInnen: lesText(n, 'innenausstattung'),
    ausstattung: lesListe(n, 'ausstattung'),
    vin: lesText(n, 'fahrgestellnummer'),
    fahrzeugland: lesText(n, 'herkunftsland'),
    vorbesitzer: lesZahl(n, 'vorbesitzer'),
    servicehistorie: alsServicehistorie(lesText(n, 'serviceheft')),

    preis: lesZahl(n, 'preis') ?? 0,
    waehrung: 'EUR',
    mwstAusweisbar: lesJaNein(n, 'mwstAusweisbar'),
    verkaeuferArt: alsVerkaeuferart(lesText(n, 'anbieter')),
    verkaeuferName: lesText(n, 'anbietername') ?? '',
    standortOrt: lesText(n, 'ort') ?? '',
    standortLand: lesText(n, 'land') ?? '',

    titel: lesText(n, 'titel') ?? '',
    beschreibung: lesText(n, 'beschreibung') ?? '',
    ausstattungstext: lesText(n, 'ausstattungstext'),
    garantie: lesText(n, 'garantie'),
    unfallangabe: alsUnfallangabe(lesText(n, 'zustand')),
    serviceangabe: lesText(n, 'servicehinweis'),
    umbauten: lesText(n, 'umbauten'),
    bekannteMaengel: lesText(n, 'maengel'),

    bilder: alsBilder(bilder, `${roh.plattformId}-${roh.externeId}`),
    genannteUnterlagen: alsBelegarten(lesListe(n, 'unterlagen')),
  };
}

export function connectorAutoscout24(): Connector {
  const p = plattform('autoscout24');
  if (!p) throw new Error('Plattform autoscout24 ist nicht konfiguriert.');
  return erzeugeConnector(p, normalizeAutoscout);
}
