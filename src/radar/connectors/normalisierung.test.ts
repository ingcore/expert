/**
 * Normalisierung — PRD Abschnitt 9 und Abnahmekriterium aus Abschnitt 50
 * („Mindestens 95 % der relevanten Zielinserate werden korrekt normalisiert").
 *
 * Geprüft wird das, woran Normalisierung in der Praxis scheitert: deutsche
 * Zahlenformate, Einheitenwechsel, Datumsschreibweisen und Aufzählungen, die
 * fast gleich aussehen und Verschiedenes bedeuten.
 */

import { describe, expect, it } from 'vitest';
import { lesZahl, lesMonat, alsUnfallangabe, alsGetriebe, kwZuPs } from './typen';
import { normalizeMobile } from './mobile-de';
import { normalizeAutoscout } from './autoscout24';
import { normalizeWillhaben } from './willhaben';
import { MARKT } from '../daten/rohdaten';
import type { RohInserat } from './typen';

function rohAus(externeId: string): { roh: RohInserat; plattform: string } {
  const eintrag = MARKT.find((m) => m.externeId === externeId);
  if (!eintrag) throw new Error(`Inserat ${externeId} nicht im Datenbestand`);
  const stand = eintrag.staende[eintrag.staende.length - 1];
  return {
    roh: {
      plattformId: eintrag.plattformId,
      externeId: eintrag.externeId,
      url: eintrag.url,
      abgerufenAm: stand.zeitpunkt,
      nutzlast: stand.nutzlast,
    },
    plattform: eintrag.plattformId,
  };
}

describe('Lesehilfen', () => {
  it('liest deutsche Zahlenformate richtig', () => {
    expect(lesZahl({ x: 39900 }, 'x')).toBe(39900);
    expect(lesZahl({ x: '39.900' }, 'x')).toBe(39900);
    expect(lesZahl({ x: '€ 39.900,-' }, 'x')).toBe(39900);
    expect(lesZahl({ x: '91.100 km' }, 'x')).toBe(91100);
    expect(lesZahl({ x: '38.900 €' }, 'x')).toBe(38900);
    expect(lesZahl({ x: '1.234,50' }, 'x')).toBe(1234.5);
    expect(lesZahl({ x: '3 Vorbesitzer' }, 'x')).toBe(3);
    expect(lesZahl({ x: '' }, 'x')).toBeNull();
    expect(lesZahl({}, 'x')).toBeNull();
  });

  it('erkennt Monatsangaben in allen vorkommenden Schreibweisen', () => {
    expect(lesMonat({ x: '03/2010' }, 'x')).toBe('2010-03');
    expect(lesMonat({ x: '2010-03' }, 'x')).toBe('2010-03');
    expect(lesMonat({ x: '3.2010' }, 'x')).toBe('2010-03');
    expect(lesMonat({ x: '2010' }, 'x')).toBe('2010-01');
    expect(lesMonat({ x: 'unbekannt' }, 'x')).toBeNull();
  });

  it('rechnet Kilowatt in PS um', () => {
    expect(kwZuPs(309)).toBe(420);
    expect(kwZuPs(null)).toBeNull();
  });

  it('unterscheidet Zusicherung von weitergegebener Aussage', () => {
    // Der Kern von Abschnitt 13: „laut Vorbesitzer" enthält „unfallfrei",
    // bedeutet aber etwas völlig anderes.
    expect(alsUnfallangabe('Unfallfrei')).toBe('unfallfrei');
    expect(alsUnfallangabe('Unfallfrei laut Vorbesitzer')).toBe(
      'unfallfrei-laut-vorbesitzer',
    );
    expect(alsUnfallangabe('Vorschaden, repariert')).toBe('vorschaden-repariert');
    expect(alsUnfallangabe('')).toBe('keine-angabe');
  });

  it('ordnet Getriebebezeichnungen aller Plattformen zu', () => {
    expect(alsGetriebe('MANUAL_GEAR')).toBe('handschalter');
    expect(alsGetriebe('AUTOMATIC_GEAR_DCT')).toBe('doppelkupplung');
    expect(alsGetriebe('Schaltgetriebe')).toBe('handschalter');
    expect(alsGetriebe('Automatik (DSG/S-tronic)')).toBe('doppelkupplung');
    expect(alsGetriebe('Automatik')).toBe('automatik');
    expect(alsGetriebe(null)).toBe('unbekannt');
  });
});

describe('Connector mobile.de', () => {
  it('normalisiert die strukturierte Nutzlast vollständig', () => {
    const { roh } = rohAus('MOB-421990334');
    const d = normalizeMobile(roh, []);

    expect(d.hersteller).toBe('BMW');
    expect(d.modell).toBe('M3');
    expect(d.baureihe).toBe('E92');
    expect(d.leistungPs).toBe(420);
    expect(d.getriebe).toBe('handschalter');
    expect(d.antrieb).toBe('heck');
    expect(d.erstzulassung).toBe('2011-06');
    expect(d.kilometerstand).toBe(96700);
    expect(d.unfallangabe).toBe('unfallfrei');
    expect(d.servicehistorie).toBe('lueckenlos');
    expect(d.vin).toBe('WBSKG91050E123456');
    expect(d.genannteUnterlagen).toContain('motorrechnung');
  });
});

describe('Connector AutoScout24', () => {
  it('gewinnt Zahlen aus formatiertem Text zurück', () => {
    const { roh } = rohAus('AS24-7710445');
    const d = normalizeAutoscout(roh, []);

    expect(d.hersteller).toBe('BMW');
    expect(d.preis).toBe(37500);
    expect(d.kilometerstand).toBe(91250);
    expect(d.leistungPs).toBe(420);
    expect(d.erstzulassung).toBe('2010-03');
    // Das Inserat macht keine Angabe zur Unfallfreiheit — das darf nicht
    // stillschweigend zu „unfallfrei" werden.
    expect(d.unfallangabe).toBe('keine-angabe');
    expect(d.servicehistorie).toBe('unbekannt');
  });
});

describe('Connector willhaben', () => {
  it('normalisiert reine Anzeigetexte', () => {
    const { roh } = rohAus('WH-1182774');
    const d = normalizeWillhaben(roh, []);

    expect(d.hersteller).toBe('Porsche');
    expect(d.modell).toBe('911');
    expect(d.baureihe).toBe('996');
    expect(d.preis).toBe(35000);
    expect(d.kilometerstand).toBe(176400);
    expect(d.leistungPs).toBe(320);
    expect(d.getriebe).toBe('handschalter');
    expect(d.antrieb).toBe('allrad');
    expect(d.erstzulassung).toBe('2003-06');
    expect(d.hubraumCcm).toBe(3596);
    expect(d.standortOrt).toBe('Wien');
    expect(d.standortLand).toBe('AT');
    expect(d.servicehistorie).toBe('keine');
  });

  it('liefert für dasselbe Fahrzeug plattformübergreifend dieselben Kernwerte', () => {
    // Der E90 steht bei demselben Händler auf zwei Plattformen. Wenn die
    // Normalisierung sauber ist, sind Erstzulassung, Kilometerstand, Leistung
    // und Getriebe identisch — trotz völlig verschiedener Nutzlasten.
    const as24 = normalizeAutoscout(rohAus('AS24-6620118').roh, []);
    const wh = normalizeWillhaben(rohAus('WH-1188442').roh, []);

    expect(wh.erstzulassung).toBe(as24.erstzulassung);
    expect(wh.kilometerstand).toBe(as24.kilometerstand);
    expect(wh.leistungPs).toBe(as24.leistungPs);
    expect(wh.getriebe).toBe(as24.getriebe);
    expect(wh.preis).toBe(as24.preis);
  });
});
