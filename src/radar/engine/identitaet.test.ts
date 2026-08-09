/**
 * Vehicle Identity Engine — PRD Abschnitt 10.
 *
 * Die Engine muss drei Dinge können, und das dritte ist das schwierigste:
 * zusammenführen, trennen — und zugeben, dass sie es nicht weiß.
 */

import { describe, expect, it } from 'vitest';
import { hammingHex, gleicheBilder, ordneZu, vergleicheFahrzeuge } from './identitaet';
import type { InseratDaten } from '../domain/types';
import { phash } from '../daten/fahrzeugdaten';

const KONTEXT = {
  zeitpunktA: '2026-06-01T00:00:00.000Z',
  zeitpunktB: '2026-05-01T00:00:00.000Z',
  bildHashSchwelle: 8,
  schwelleAutomatisch: 88,
  schwelleManuell: 62,
};

function basis(ueberschreibung: Partial<InseratDaten> = {}): InseratDaten {
  return {
    hersteller: 'BMW',
    modell: 'M3',
    baureihe: 'E92',
    variante: 'Coupé',
    motor: 'S65B40 V8',
    hubraumCcm: 3999,
    leistungPs: 420,
    getriebe: 'handschalter',
    antrieb: 'heck',
    erstzulassung: '2010-03',
    produktionsjahr: 2010,
    kilometerstand: 91100,
    farbeAussen: 'Interlagosblau metallic',
    farbeInnen: 'Novillo Schwarz',
    ausstattung: ['edc-fahrwerk', 'navigation-professional', 'schiebedach'],
    vin: null,
    fahrzeugland: 'DE',
    vorbesitzer: 3,
    servicehistorie: 'teilweise',
    preis: 39900,
    waehrung: 'EUR',
    mwstAusweisbar: true,
    verkaeuferArt: 'haendler',
    verkaeuferName: 'Autohaus A',
    standortOrt: 'Regensburg',
    standortLand: 'DE',
    titel: 'BMW M3 E92',
    beschreibung: 'Beschreibung',
    ausstattungstext: null,
    garantie: null,
    unfallangabe: 'unfallfrei',
    serviceangabe: null,
    umbauten: null,
    bekannteMaengel: null,
    bilder: ['front', 'heck', 'seite', 'cockpit', 'motor', 'felge'].map((m, i) => ({
      id: `b${i}`,
      url: `https://x/${m}.jpg`,
      position: i + 1,
      phash: phash(`m3-${m}`),
      aufgenommen: null,
      merkmale: ['exterieur'],
      auffaelligkeiten: [],
    })),
    genannteUnterlagen: [],
    ...ueberschreibung,
  };
}

describe('Wahrnehmungs-Hashes', () => {
  it('erkennt gleiche Motive und trennt verschiedene deutlich', () => {
    expect(hammingHex(phash('a'), phash('a'))).toBe(0);
    expect(hammingHex(phash('a'), phash('b'))).toBeGreaterThan(8);
  });

  it('gibt bei kaputten Hashes den maximalen Abstand zurück', () => {
    // Ein defekter Hash darf niemals Ähnlichkeit vortäuschen.
    expect(hammingHex('zzzz', 'zzzz')).toBe(64);
    expect(hammingHex('abc', 'abcdef')).toBe(64);
  });

  it('zählt übereinstimmende Bildpaare ohne Mehrfachzuordnung', () => {
    const a = [{ phash: phash('x') }, { phash: phash('y') }];
    const b = [{ phash: phash('x') }, { phash: phash('z') }];
    expect(gleicheBilder(a, b, 8)).toBe(1);
  });
});

describe('Vergleich zweier Inserate', () => {
  it('führt bei identischer VIN sofort zusammen', () => {
    const a = basis({ vin: 'WBSKG91050E123456' });
    const b = basis({ vin: 'WBSKG91050E123456', farbeAussen: 'Schwarz', bilder: [] });
    const v = vergleicheFahrzeuge(a, b, KONTEXT);
    expect(v.score).toBe(100);
    expect(v.entscheidung).toBe('identisch');
  });

  it('schließt bei widersprüchlicher VIN aus — egal wie ähnlich der Rest ist', () => {
    const a = basis({ vin: 'WBSKG91050E123456' });
    const b = basis({ vin: 'WBSKG91050E999999' });
    const v = vergleicheFahrzeuge(a, b, KONTEXT);
    expect(v.score).toBe(0);
    expect(v.entscheidung).toBe('verschieden');
  });

  it('erkennt dasselbe Fahrzeug bei anderem Händler über gemeinsame Bilder', () => {
    const a = basis();
    const b = basis({
      verkaeuferName: 'Sportwagenzentrum',
      standortOrt: 'Rosenheim',
      preis: 38900,
      kilometerstand: 91250,
    });
    const v = vergleicheFahrzeuge(a, b, KONTEXT);
    expect(v.entscheidung).toBe('identisch');
  });

  it('trennt zwei verschiedene Fahrzeuge derselben Baureihe', () => {
    const a = basis();
    const b = basis({
      erstzulassung: '2008-11',
      farbeAussen: 'Alpinweiß',
      farbeInnen: 'Leder Schwarz',
      kilometerstand: 145000,
      getriebe: 'doppelkupplung',
      bilder: [],
    });
    const v = vergleicheFahrzeuge(a, b, KONTEXT);
    expect(v.entscheidung).toBe('verschieden');
  });

  it('wertet einen deutlich sinkenden Kilometerstand als Widerspruch', () => {
    const alt = basis({ kilometerstand: 118000 });
    const neu = basis({ kilometerstand: 91250 });
    const v = vergleicheFahrzeuge(neu, alt, {
      ...KONTEXT,
      zeitpunktA: '2026-06-20T00:00:00.000Z',
      zeitpunktB: '2026-05-01T00:00:00.000Z',
    });
    const km = v.merkmale.find((m) => m.schluessel === 'kilometerstand');
    expect(km?.uebereinstimmung).toBe(0);
  });

  it('toleriert eine kleine Kilometerabweichung bei der Identität', () => {
    // Arbeitsteilung: Für die *Identität* ist ein Rückgang von 50 km
    // bedeutungslos — Händler runden. Dass derselbe Rückgang als Red Flag
    // aufschlägt, ist Sache der Red Flag Engine (Abschnitt 23) und wird dort
    // geprüft. Würde die Identity Engine hier trennen, entstünden zwei Akten
    // und die Auffälligkeit verschwände genau dadurch.
    const alt = basis({ kilometerstand: 91300 });
    const neu = basis({ kilometerstand: 91250 });
    const v = vergleicheFahrzeuge(neu, alt, {
      ...KONTEXT,
      zeitpunktA: '2026-06-20T00:00:00.000Z',
      zeitpunktB: '2026-05-01T00:00:00.000Z',
    });
    expect(v.entscheidung).toBe('identisch');
  });

  it('zählt fehlende Angaben weder als Übereinstimmung noch als Widerspruch', () => {
    const a = basis({ farbeAussen: null, farbeInnen: null, vorbesitzer: null });
    const b = basis();
    const v = vergleicheFahrzeuge(a, b, KONTEXT);
    const farbe = v.merkmale.find((m) => m.schluessel === 'farbe-aussen');
    expect(farbe?.uebereinstimmung).toBeNull();
    expect(v.beurteilbaresGewicht).toBeLessThan(123);
  });
});

describe('Zuordnung zu Fahrzeugakten', () => {
  it('legt bei einem Grenzfall eine neue Akte an, statt zu raten', () => {
    const neu = basis({
      verkaeuferName: 'Klassik Garage',
      standortOrt: 'Graz',
      standortLand: 'AT',
      ausstattung: ['edc-fahrwerk'],
      bilder: [],
    });
    const ergebnis = ordneZu(
      neu,
      '2026-07-01T00:00:00.000Z',
      [
        {
          fahrzeugId: 'fzg-1',
          inseratId: 'i-1',
          daten: basis(),
          zeitpunkt: '2026-05-01T00:00:00.000Z',
        },
      ],
      {
        bildHashSchwelle: 8,
        schwelleAutomatisch: 88,
        schwelleManuell: 62,
      },
    );

    // Entweder eindeutig zugeordnet oder Grenzfall — aber niemals stillschweigend
    // zusammengeführt, wenn die Schwelle nicht erreicht ist.
    if (ergebnis.entscheidung === 'pruefen') {
      expect(ergebnis.fahrzeugId).toBeNull();
      expect(ergebnis.bester?.vergleich.score).toBeLessThan(88);
      expect(ergebnis.bester?.vergleich.score).toBeGreaterThanOrEqual(62);
    } else {
      expect(ergebnis.entscheidung).toBe('identisch');
    }
  });

  it('legt ohne jeden Kandidaten eine neue Akte an', () => {
    const ergebnis = ordneZu(basis(), '2026-07-01T00:00:00.000Z', [], {
      bildHashSchwelle: 8,
      schwelleAutomatisch: 88,
      schwelleManuell: 62,
    });
    expect(ergebnis.entscheidung).toBe('neu');
    expect(ergebnis.fahrzeugId).toBeNull();
  });
});
