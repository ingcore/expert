/**
 * Historisierung — PRD Abschnitt 11.
 *
 * Das Beispiel des PRD wird hier eins zu eins nachgebildet: Preisverfall über
 * drei Stände, Kilometerbewegung, abgeschwächte Unfallangabe und ein Wechsel
 * des Händlers. Alle acht in Abschnitt 11 genannten Erkennungen müssen
 * daraus folgen.
 */

import { describe, expect, it } from 'vitest';
import { historienkennzahlen, inseratHistorie, vergleiche } from './historie';
import type { Inserat, InseratDaten } from '../domain/types';

function daten(ueberschreibung: Partial<InseratDaten> = {}): InseratDaten {
  return {
    hersteller: 'BMW',
    modell: 'M3',
    baureihe: 'E92',
    variante: 'Coupé',
    motor: 'S65',
    hubraumCcm: 3999,
    leistungPs: 420,
    getriebe: 'handschalter',
    antrieb: 'heck',
    erstzulassung: '2010-03',
    produktionsjahr: 2010,
    kilometerstand: 91100,
    farbeAussen: 'Interlagosblau',
    farbeInnen: 'Schwarz',
    ausstattung: ['edc-fahrwerk'],
    vin: null,
    fahrzeugland: 'DE',
    vorbesitzer: 3,
    servicehistorie: 'teilweise',
    preis: 42900,
    waehrung: 'EUR',
    mwstAusweisbar: true,
    verkaeuferArt: 'haendler',
    verkaeuferName: 'Autohaus Reingruber',
    standortOrt: 'Regensburg',
    standortLand: 'DE',
    titel: 'BMW M3 E92',
    beschreibung: 'Unfallfrei, gepflegt.',
    ausstattungstext: null,
    garantie: null,
    unfallangabe: 'unfallfrei',
    serviceangabe: null,
    umbauten: null,
    bekannteMaengel: null,
    bilder: [],
    genannteUnterlagen: ['serviceheft'],
    ...ueberschreibung,
  };
}

function inserat(staende: { zeitpunkt: string; daten: InseratDaten }[]): Inserat {
  return {
    id: 'mobile-de:MOB-1',
    plattformId: 'mobile-de',
    externeId: 'MOB-1',
    url: 'https://x',
    verkaeuferId: 'v1',
    fahrzeugId: 'fzg-1',
    erstEntdeckt: staende[0].zeitpunkt,
    zuletztGesehen: staende[staende.length - 1].zeitpunkt,
    aktiv: true,
    entferntAm: null,
    beobachtungen: staende.map((s, i) => ({
      id: `b${i}`,
      zeitpunkt: s.zeitpunkt,
      laufId: 'lauf',
      daten: s.daten,
    })),
  };
}

describe('Vergleich zweier Beobachtungen', () => {
  it('erkennt Preisänderung mit Differenz', () => {
    const a = vergleiche(daten(), daten({ preis: 39900 }), '2026-03-15T00:00:00.000Z');
    const preis = a.find((x) => x.art === 'preis');
    expect(preis?.differenz).toBe(-3000);
  });

  it('unterscheidet das Entfernen einer Angabe von ihrer Änderung', () => {
    const entfernt = vergleiche(
      daten(),
      daten({ unfallangabe: 'keine-angabe' }),
      '2026-05-01T00:00:00.000Z',
    );
    expect(entfernt.find((x) => x.feld === 'unfallangabe')?.art).toBe('angabe-entfernt');

    const geaendert = vergleiche(
      daten(),
      daten({ unfallangabe: 'unfallfrei-laut-vorbesitzer' }),
      '2026-05-01T00:00:00.000Z',
    );
    expect(geaendert.find((x) => x.feld === 'unfallangabe')?.art).toBe('text');
  });

  it('erkennt Verkäufer- und Standortwechsel getrennt', () => {
    const a = vergleiche(
      daten(),
      daten({ verkaeuferName: 'Sportwagenzentrum', standortOrt: 'Rosenheim' }),
      '2026-06-20T00:00:00.000Z',
    );
    expect(a.some((x) => x.art === 'verkaeufer')).toBe(true);
    expect(a.some((x) => x.art === 'standort')).toBe(true);
  });

  it('vergleicht Bilder über Hashes, nicht über URLs', () => {
    const mitBild = daten({
      bilder: [
        {
          id: 'b1',
          url: 'https://alt/1.jpg',
          position: 1,
          phash: 'aaaaaaaaaaaaaaaa',
          aufgenommen: null,
          merkmale: [],
          auffaelligkeiten: [],
        },
      ],
    });
    const neueUrlGleichesBild = daten({
      bilder: [
        {
          id: 'b1',
          url: 'https://neu/9999.jpg',
          position: 1,
          phash: 'aaaaaaaaaaaaaaaa',
          aufgenommen: null,
          merkmale: [],
          auffaelligkeiten: [],
        },
      ],
    });
    const a = vergleiche(mitBild, neueUrlGleichesBild, '2026-06-01T00:00:00.000Z');
    expect(a.some((x) => x.art === 'fotos')).toBe(false);
  });

  it('meldet das Verschwinden genannter Unterlagen', () => {
    const a = vergleiche(daten(), daten({ genannteUnterlagen: [] }), '2026-05-01T00:00:00.000Z');
    expect(a.some((x) => x.feld === 'genannteUnterlagen')).toBe(true);
  });
});

describe('Beispiel aus PRD Abschnitt 11', () => {
  const verlauf = inserat([
    { zeitpunkt: '2026-02-01T00:00:00.000Z', daten: daten() },
    { zeitpunkt: '2026-03-15T00:00:00.000Z', daten: daten({ preis: 39900 }) },
    {
      zeitpunkt: '2026-05-01T00:00:00.000Z',
      daten: daten({
        preis: 37900,
        kilometerstand: 91300,
        unfallangabe: 'unfallfrei-laut-vorbesitzer',
      }),
    },
    {
      zeitpunkt: '2026-06-20T00:00:00.000Z',
      daten: daten({
        preis: 38900,
        kilometerstand: 91250,
        unfallangabe: 'unfallfrei-laut-vorbesitzer',
        verkaeuferName: 'Sportwagenzentrum Süd',
        standortOrt: 'Rosenheim',
      }),
    },
  ]);

  it('leitet alle Änderungen aus den Beobachtungen ab', () => {
    const aenderungen = inseratHistorie(verlauf);
    expect(aenderungen.filter((x) => x.art === 'preis')).toHaveLength(3);
    expect(aenderungen.filter((x) => x.art === 'kilometer')).toHaveLength(2);
    expect(aenderungen.filter((x) => x.art === 'verkaeufer').length).toBeGreaterThan(0);
    expect(aenderungen.filter((x) => x.art === 'standort')).toHaveLength(1);
  });

  it('erkennt den sinkenden Kilometerstand', () => {
    const k = historienkennzahlen([verlauf], '2026-08-08T00:00:00.000Z');
    expect(k.kilometerRueckgang).toBe(true);
  });

  it('rechnet Preisverlauf und größte Reduktion korrekt', () => {
    const k = historienkennzahlen([verlauf], '2026-08-08T00:00:00.000Z');
    expect(k.erstpreis).toBe(42900);
    expect(k.aktuellerPreis).toBe(38900);
    expect(k.preisveraenderungProzent).toBeCloseTo(-9.32, 1);
    expect(k.groessteReduktionProzent).toBeCloseTo(6.99, 1);
  });

  it('überschreibt nichts — die erste Beobachtung bleibt vollständig erhalten', () => {
    expect(verlauf.beobachtungen[0].daten.preis).toBe(42900);
    expect(verlauf.beobachtungen[0].daten.unfallangabe).toBe('unfallfrei');
  });
});
