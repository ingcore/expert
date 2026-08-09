/**
 * Portfoliorechnung — PRD Abschnitt 25.
 *
 * Der IRR wird gegen von Hand nachvollziehbare Fälle geprüft: Bei einer
 * einzigen Auszahlung und einer einzigen Einzahlung ist die Lösung geschlossen
 * bekannt, und genau daran muss sich das Verfahren messen lassen.
 */

import { describe, expect, it } from 'vitest';
import { berechneFahrzeug, berechnePortfolio, xirr } from './portfolio';
import type { Portfoliofahrzeug } from '../domain/types';

describe('Interner Zinsfuß', () => {
  it('trifft die geschlossene Lösung bei einer Ein- und einer Auszahlung', () => {
    // 10.000 € eingesetzt, nach genau einem Jahr 11.000 € zurück → 10 %.
    const rate = xirr([
      { datum: '2024-01-01', betrag: -10000, bezeichnung: 'Kauf' },
      { datum: '2025-01-01', betrag: 11000, bezeichnung: 'Verkauf' },
    ]);
    expect(rate).not.toBeNull();
    expect((rate as number) * 100).toBeCloseTo(10, 1);
  });

  it('rechnet über mehrere Jahre korrekt auf', () => {
    // 20.000 € → 24.200 € nach zwei Jahren entspricht 10 % p. a.
    const rate = xirr([
      { datum: '2023-01-01', betrag: -20000, bezeichnung: 'Kauf' },
      { datum: '2025-01-01', betrag: 24200, bezeichnung: 'Verkauf' },
    ]);
    expect((rate as number) * 100).toBeCloseTo(10, 1);
  });

  it('liefert einen negativen Zinsfuß bei Verlust', () => {
    const rate = xirr([
      { datum: '2024-01-01', betrag: -10000, bezeichnung: 'Kauf' },
      { datum: '2025-01-01', betrag: 9000, bezeichnung: 'Verkauf' },
    ]);
    expect((rate as number) * 100).toBeCloseTo(-10, 1);
  });

  it('gibt ohne Vorzeichenwechsel kein Ergebnis zurück statt zu raten', () => {
    expect(
      xirr([
        { datum: '2024-01-01', betrag: -1000, bezeichnung: 'a' },
        { datum: '2025-01-01', betrag: -500, bezeichnung: 'b' },
      ]),
    ).toBeNull();
    expect(xirr([{ datum: '2024-01-01', betrag: -1000, bezeichnung: 'a' }])).toBeNull();
  });
});

describe('Fahrzeugkennzahlen', () => {
  const fahrzeug: Portfoliofahrzeug = {
    id: 'pf-test',
    fahrzeugId: null,
    bezeichnung: 'Testfahrzeug',
    modellId: null,
    kaufdatum: '2024-01-01',
    kaufpreis: 30000,
    nebenkosten: 2000,
    kilometerstandKauf: 100000,
    kilometerstandAktuell: 110000,
    marktwertAktuell: 40000,
    verkauf: null,
    transaktionen: [
      { id: 't1', datum: '2024-06-01', art: 'service', bezeichnung: 'Inspektion', betrag: 1500 },
      { id: 't2', datum: '2025-06-01', art: 'versicherung', bezeichnung: 'Versicherung', betrag: 800 },
    ],
  };

  it('rechnet Total Cost of Ownership vollständig', () => {
    const k = berechneFahrzeug(fahrzeug, '2026-01-01T00:00:00.000Z');
    expect(k.anschaffung).toBe(32000);
    expect(k.laufendeKosten).toBe(2300);
    expect(k.tco).toBe(34300);
  });

  it('weist unrealisiertes und realisiertes Ergebnis getrennt aus', () => {
    const offen = berechneFahrzeug(fahrzeug, '2026-01-01T00:00:00.000Z');
    expect(offen.unrealisiert).toBe(40000 - 34300);
    expect(offen.realisiert).toBe(0);

    const verkauft = berechneFahrzeug(
      { ...fahrzeug, verkauf: { datum: '2026-01-01', preis: 41000 } },
      '2026-01-01T00:00:00.000Z',
    );
    expect(verkauft.realisiert).toBe(41000 - 34300);
    expect(verkauft.unrealisiert).toBe(0);
  });

  it('trennt Wertentwicklung des Fahrzeuges vom Ergebnis des eingesetzten Geldes', () => {
    const k = berechneFahrzeug(fahrzeug, '2026-01-01T00:00:00.000Z');
    // Der Fahrzeugwert stieg um gut 15 % pro Jahr …
    expect(k.wertentwicklungProJahr).toBeGreaterThan(14);
    // … der IRR liegt darunter, weil Nebenkosten und Service mitgerechnet werden.
    expect((k.irr as number) * 100).toBeLessThan(k.wertentwicklungProJahr);
  });
});

describe('Portfoliosumme', () => {
  it('summiert über alle Fahrzeuge und rechnet einen Gesamt-IRR', () => {
    const p = berechnePortfolio(
      [
        {
          id: 'a',
          fahrzeugId: null,
          bezeichnung: 'A',
          modellId: null,
          kaufdatum: '2023-01-01',
          kaufpreis: 20000,
          nebenkosten: 0,
          kilometerstandKauf: 0,
          kilometerstandAktuell: 0,
          marktwertAktuell: 26000,
          verkauf: null,
          transaktionen: [],
        },
        {
          id: 'b',
          fahrzeugId: null,
          bezeichnung: 'B',
          modellId: null,
          kaufdatum: '2023-01-01',
          kaufpreis: 10000,
          nebenkosten: 0,
          kilometerstandKauf: 0,
          kilometerstandAktuell: 0,
          marktwertAktuell: 9000,
          verkauf: { datum: '2025-01-01', preis: 9000 },
          transaktionen: [],
        },
      ],
      '2026-01-01T00:00:00.000Z',
    );

    expect(p.anzahl).toBe(2);
    expect(p.imBestand).toBe(1);
    expect(p.gesamtAnschaffung).toBe(30000);
    expect(p.gesamtwert).toBe(26000);
    expect(p.unrealisiert).toBe(6000);
    expect(p.realisiert).toBe(-1000);
    expect(p.portfolioIrr).not.toBeNull();
  });
});
