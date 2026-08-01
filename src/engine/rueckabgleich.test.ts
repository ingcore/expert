/**
 * Tests des Rückabgleichs (FR-5.1, FR-5.2).
 *
 * Abnahmekriterium 12.4.3 verlangt den Nachweis, dass der Rückabgleich bei
 * einem künstlich eingeschleusten Fehler blockiert. Genau das prüft die
 * letzte Testgruppe.
 */

import { describe, expect, it } from 'vitest';
import { fuehreRueckabgleichDurch } from './rueckabgleich';
import { werteMatrixAus } from './engine';
import { GOLDEN_DATASET } from './golden/dataset';

const fall = GOLDEN_DATASET.find((f) => f.id === 'gold-02-wohnhaus-gk4')!;

const matrix = werteMatrixAus({
  ausgabe: fall.ausgabe,
  bundesland: fall.bundesland,
  kontext: { ...fall.kontext, gebaeudeklasse: null },
  gebaeudeklassenEingabe: fall.klassenEingabe,
  istWerte: fall.istWerte,
  abweichungen: {},
});

describe('Rückabgleich', () => {
  it('lässt gedeckte Werte durch', () => {
    // R60 und REI60 stammen aus der Matrix dieses Falls.
    const ergebnis = fuehreRueckabgleichDurch(
      [
        {
          bezeichnung: 'Baulicher Brandschutz',
          text: 'Die tragenden Bauteile sind in R60 auszuführen, die Trenndecken in REI60.',
        },
      ],
      matrix,
    );

    expect(ergebnis.befunde).toHaveLength(0);
    expect(ergebnis.freigabeBlockiert).toBe(false);
  });

  it('erkennt eine nicht gedeckte Feuerwiderstandsklasse', () => {
    const ergebnis = fuehreRueckabgleichDurch(
      [
        {
          bezeichnung: 'Baulicher Brandschutz',
          text: 'Die tragenden Bauteile sind in REI180 auszuführen.',
        },
      ],
      matrix,
    );

    expect(ergebnis.freigabeBlockiert).toBe(true);
    expect(ergebnis.befunde[0].art).toBe('feuerwiderstand-ohne-deckung');
    expect(ergebnis.befunde[0].fundstelle).toBe('REI180');
  });

  it('erkennt eine erfundene Normstelle', () => {
    const ergebnis = fuehreRueckabgleichDurch(
      [
        {
          bezeichnung: 'Grundlagen',
          text: 'Die Beurteilung erfolgt nach TRVB S 999.',
        },
      ],
      matrix,
    );

    expect(
      ergebnis.befunde.some((b) => b.art === 'normstelle-ohne-deckung'),
    ).toBe(true);
  });

  it('lässt reale Regelwerke aus dem Normenkatalog durch', () => {
    // Diese Zitate sind fachlich korrekt und dürfen die Freigabe nicht
    // blockieren, auch wenn sie in keiner einzelnen Anforderung vorkommen.
    const ergebnis = fuehreRueckabgleichDurch(
      [
        {
          bezeichnung: 'Grundlagen',
          text: 'Herangezogen wurden die OIB-Richtlinie 2.1, TRVB S 125, ÖNORM EN 1125 sowie die AStV.',
        },
      ],
      matrix,
    );

    expect(
      ergebnis.befunde.filter((b) => b.art === 'normstelle-ohne-deckung'),
    ).toHaveLength(0);
  });

  it('erkennt einen nicht gedeckten Zahlenwert', () => {
    const ergebnis = fuehreRueckabgleichDurch(
      [
        {
          bezeichnung: 'Löschwasser',
          text: 'Es stehen 9999 l/min Löschwasser zur Verfügung.',
        },
      ],
      matrix,
    );

    expect(
      ergebnis.befunde.some((b) => b.art === 'zahlenwert-ohne-deckung'),
    ).toBe(true);
  });

  it('akzeptiert ausdrücklich freigegebene Zusatzwerte', () => {
    const ergebnis = fuehreRueckabgleichDurch(
      [{ bezeichnung: 'Bestand', text: 'Die Bestandsdecke weist REI180 auf.' }],
      matrix,
      { feuerwiderstand: ['REI180'] },
    );

    expect(ergebnis.befunde).toHaveLength(0);
  });

  it('meldet dieselbe Fundstelle je Abschnitt nur einmal', () => {
    const ergebnis = fuehreRueckabgleichDurch(
      [
        {
          bezeichnung: 'Baulicher Brandschutz',
          text: 'REI180 hier, REI180 dort, und nochmals REI180.',
        },
      ],
      matrix,
    );

    expect(
      ergebnis.befunde.filter((b) => b.fundstelle === 'REI180'),
    ).toHaveLength(1);
  });

  it('überspringt leere Abschnitte', () => {
    const ergebnis = fuehreRueckabgleichDurch(
      [
        { bezeichnung: 'Leer', text: '' },
        { bezeichnung: 'Auch leer', text: '   ' },
      ],
      matrix,
    );

    expect(ergebnis.geprueft).toBe(0);
    expect(ergebnis.freigabeBlockiert).toBe(false);
  });
});

describe('Abnahmekriterium 12.4.3 — eingeschleuster Fehler blockiert', () => {
  it('blockiert die Freigabe bei einem gefälschten Wert im Text', () => {
    const sauber = 'Die tragenden Bauteile sind in R60 auszuführen.';
    // Künstlich eingeschleuster Fehler: R60 wird zu R30 verfälscht.
    const verfaelscht = 'Die tragenden Bauteile sind in R30 auszuführen.';

    const vorher = fuehreRueckabgleichDurch(
      [{ bezeichnung: 'Test', text: sauber }],
      matrix,
    );
    const nachher = fuehreRueckabgleichDurch(
      [{ bezeichnung: 'Test', text: verfaelscht }],
      matrix,
    );

    expect(vorher.freigabeBlockiert).toBe(false);
    expect(nachher.freigabeBlockiert).toBe(true);
  });
});
