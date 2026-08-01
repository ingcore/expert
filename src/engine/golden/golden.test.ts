/**
 * Regressionstest gegen das Golden Dataset (FR-5.5, NFR-4).
 *
 * Jede Regeländerung läuft hiergegen. Abweichungen sind zu erklären, bevor
 * deployed wird — die Zielvorgabe ist 100 % Korrektheit ohne Ausnahme.
 */

import { describe, expect, it } from 'vitest';
import { GOLDEN_DATASET } from './dataset';
import { werteMatrixAus } from '../engine';
import type { MatrixErgebnis } from '../types';

function werteFallAus(fall: (typeof GOLDEN_DATASET)[number]): MatrixErgebnis {
  return werteMatrixAus({
    ausgabe: fall.ausgabe,
    bundesland: fall.bundesland,
    kontext: { ...fall.kontext, gebaeudeklasse: null },
    gebaeudeklassenEingabe: fall.klassenEingabe,
    istWerte: fall.istWerte,
    abweichungen: {},
  });
}

describe('Golden Dataset', () => {
  it('enthält mindestens einen Fall je Gebäudeklassenzweig', () => {
    const klassen = new Set(
      GOLDEN_DATASET.map((f) => f.erwartet.gebaeudeklasse),
    );
    expect(klassen.size).toBeGreaterThanOrEqual(4);
  });

  for (const fall of GOLDEN_DATASET) {
    describe(`${fall.id} — ${fall.bezeichnung}`, () => {
      const ergebnis = werteFallAus(fall);

      it('leitet die erwartete Gebäudeklasse ab', () => {
        expect(ergebnis.gebaeudeklasse.klasse).toBe(
          fall.erwartet.gebaeudeklasse,
        );
      });

      it('liefert die erwarteten Sollwerte', () => {
        for (const [id, erwartet] of Object.entries(fall.erwartet.sollwerte)) {
          const treffer = ergebnis.ergebnisse.find(
            (e) => e.anforderungId === id,
          );
          expect(treffer, `Anforderung ${id} fehlt im Ergebnis`).toBeDefined();
          expect(treffer?.sollWert, `Sollwert für ${id}`).toBe(erwartet);
        }
      });

      it('erkennt die erwarteten Nichterfüllungen', () => {
        const nichtErfuellt = new Set(
          ergebnis.ergebnisse
            .filter((e) => e.status === 'nicht-erfuellt')
            .map((e) => e.anforderungId),
        );

        for (const id of fall.erwartet.nichtErfuellt) {
          expect(
            nichtErfuellt.has(id),
            `${id} müsste als nicht erfüllt erkannt werden`,
          ).toBe(true);
        }
      });

      it('meldet keine unerwarteten Nichterfüllungen', () => {
        const erwartet = new Set(fall.erwartet.nichtErfuellt);
        const tatsaechlich = ergebnis.ergebnisse
          .filter((e) => e.status === 'nicht-erfuellt')
          .map((e) => e.anforderungId);

        for (const id of tatsaechlich) {
          expect(
            erwartet.has(id),
            `${id} wird unerwartet als nicht erfüllt gemeldet`,
          ).toBe(true);
        }
      });

      it('gibt jedem Ergebnis einen vollständigen Quellenverweis (LP-3)', () => {
        for (const e of ergebnis.ergebnisse) {
          expect(e.quelle.richtlinie, `${e.anforderungId}: Richtlinie`).toBeTruthy();
          expect(e.quelle.ausgabe, `${e.anforderungId}: Ausgabe`).toBeTruthy();
          expect(e.quelle.punkt, `${e.anforderungId}: Punkt`).toBeTruthy();
        }
      });

      it('setzt eine Confidence-Ampel je Ergebnis (PRD 12.3)', () => {
        for (const e of ergebnis.ergebnisse) {
          expect(['gruen', 'gelb', 'rot']).toContain(e.ampel);
        }
      });
    });
  }
});

describe('Ausgabestand', () => {
  it('fixiert den Ausgabestand im Ergebnis (FR-2.6)', () => {
    const ergebnis = werteFallAus(GOLDEN_DATASET[0]);
    expect(ergebnis.ausgabe).toBe('2023-05');
  });
});

describe('Datenlückenverhalten', () => {
  it('liefert ohne Gebäudeklasse keine baulichen Sollwerte', () => {
    const fall = GOLDEN_DATASET.find((f) => f.id === 'gold-05-datenluecke');
    expect(fall).toBeDefined();
    const ergebnis = werteFallAus(fall!);

    // Ohne Klasse dürfen die klassenabhängigen Anforderungen nicht greifen.
    const klassenAbhaengig = ergebnis.ergebnisse.filter((e) =>
      e.anforderungId.includes('tragwerk'),
    );
    expect(klassenAbhaengig).toHaveLength(0);
  });

  it('nennt die fehlenden Angaben im Klartext', () => {
    const fall = GOLDEN_DATASET.find((f) => f.id === 'gold-05-datenluecke')!;
    const ergebnis = werteFallAus(fall);
    expect(ergebnis.gebaeudeklasse.fehlendeAngaben.length).toBeGreaterThan(0);
  });
});
