import { describe, expect, it } from 'vitest';
import {
  artikelnummer,
  berichtsnummerString,
  datumsPrefix,
  dateiname,
  normalisiereKundennummer,
  normalisiereSequenz,
} from './naming';
import { neuesProjekt } from './factory';

describe('normalisiereKundennummer', () => {
  it('füllt auf vier Stellen mit führenden Nullen auf', () => {
    expect(normalisiereKundennummer('219')).toBe('0219');
    expect(normalisiereKundennummer('7')).toBe('0007');
  });

  it('entfernt Nicht-Ziffern und behält die letzten vier Stellen', () => {
    expect(normalisiereKundennummer('KD-0219')).toBe('0219');
    expect(normalisiereKundennummer('123456')).toBe('3456');
  });

  it('gibt bei leerer Eingabe einen leeren String zurück', () => {
    expect(normalisiereKundennummer('')).toBe('');
    expect(normalisiereKundennummer('abc')).toBe('');
  });
});

describe('normalisiereSequenz', () => {
  it('füllt auf drei Stellen auf und fällt auf 001 zurück', () => {
    expect(normalisiereSequenz('1')).toBe('001');
    expect(normalisiereSequenz('42')).toBe('042');
    expect(normalisiereSequenz('')).toBe('001');
  });
});

describe('datumsPrefix', () => {
  it('formatiert ein ISO-Datum als YYMMDD', () => {
    expect(datumsPrefix('2026-07-20')).toBe('260720');
    expect(datumsPrefix('2025-01-05')).toBe('250105');
  });

  it('liefert bei ungültigem Datum einen Platzhalter', () => {
    expect(datumsPrefix('kein-datum')).toBe('000000');
  });
});

describe('artikelnummer', () => {
  it('baut die Artikelnummer nach Schema ING-GB-FB-AN-LA-SEQ', () => {
    expect(
      artikelnummer({
        geschaeftsbereich: 'BS',
        fachbereich: 'BAU',
        anlage: 'ALL',
        leistungsart: 'FB',
        sequenz: '1',
      }),
    ).toBe('ING-BS-BAU-ALL-FB-001');
  });

  it('fällt bei fehlendem Anlagenkürzel auf ALL zurück', () => {
    expect(
      artikelnummer({
        geschaeftsbereich: 'BS',
        fachbereich: 'TEC',
        anlage: '',
        leistungsart: 'KON',
        sequenz: '003',
      }),
    ).toBe('ING-BS-TEC-ALL-KON-003');
  });
});

describe('berichtsnummerString', () => {
  it('entspricht dem Beispiel aus dem INGTEC-Ablageschema', () => {
    const p = neuesProjekt();
    p.datum = '2026-07-20';
    p.auftraggeber.kundennummer = '219';
    p.berichtsnummer = {
      geschaeftsbereich: 'BS',
      fachbereich: 'BAU',
      anlage: 'ALL',
      leistungsart: 'FB',
      sequenz: '001',
    };

    expect(berichtsnummerString(p)).toBe(
      '260720_KD-0219_ING-BS-BAU-ALL-FB-001',
    );
    expect(dateiname(p)).toBe('260720_KD-0219_ING-BS-BAU-ALL-FB-001.docx');
  });
});
