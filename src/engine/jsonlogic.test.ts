import { describe, expect, it } from 'vitest';
import {
  evaluiere,
  pruefeAusdruck,
  RegelAusdruckFehler,
  trifftZu,
} from './jsonlogic';

describe('var', () => {
  it('liest einfache und verschachtelte Pfade', () => {
    const kontext = { a: 1, b: { c: 'x' } };
    expect(evaluiere({ var: 'a' }, kontext)).toBe(1);
    expect(evaluiere({ var: 'b.c' }, kontext)).toBe('x');
  });

  it('liefert null für unbekannte Pfade', () => {
    expect(evaluiere({ var: 'fehlt' }, {})).toBeNull();
  });

  it('greift auf einen Vorgabewert zurück', () => {
    expect(evaluiere({ var: ['fehlt', 42] }, {})).toBe(42);
  });
});

describe('Logik', () => {
  it('wertet and und or mit Kurzschluss aus', () => {
    expect(trifftZu({ and: [true, true] }, {})).toBe(true);
    expect(trifftZu({ and: [true, false] }, {})).toBe(false);
    expect(trifftZu({ or: [false, true] }, {})).toBe(true);
    expect(trifftZu({ or: [false, false] }, {})).toBe(false);
  });

  it('negiert korrekt', () => {
    expect(trifftZu({ not: true }, {})).toBe(false);
    expect(trifftZu({ '!': false }, {})).toBe(true);
  });

  it('wertet if mit Sonst-Zweig aus', () => {
    const regel = { if: [{ '>': [{ var: 'n' }, 10] }, 'gross', 'klein'] };
    expect(evaluiere(regel, { n: 20 })).toBe('gross');
    expect(evaluiere(regel, { n: 5 })).toBe('klein');
  });

  it('wertet verkettete if-Zweige aus', () => {
    const regel = {
      if: [
        { '==': [{ var: 'k' }, 'a'] },
        1,
        { '==': [{ var: 'k' }, 'b'] },
        2,
        3,
      ],
    };
    expect(evaluiere(regel, { k: 'a' })).toBe(1);
    expect(evaluiere(regel, { k: 'b' })).toBe(2);
    expect(evaluiere(regel, { k: 'z' })).toBe(3);
  });
});

describe('Vergleiche', () => {
  it('vergleicht numerisch, auch bei Zahlen als Text', () => {
    expect(trifftZu({ '>': [10, 5] }, {})).toBe(true);
    expect(trifftZu({ '==': ['4', 4] }, {})).toBe(true);
    expect(trifftZu({ '===': ['4', 4] }, {})).toBe(false);
  });

  it('prüft Mengenzugehörigkeit', () => {
    expect(trifftZu({ in: ['GK4', ['GK3', 'GK4']] }, {})).toBe(true);
    expect(trifftZu({ in: ['GK1', ['GK3', 'GK4']] }, {})).toBe(false);
  });

  it('prüft Schnittmengen mit containsAny', () => {
    const regel = { containsAny: [{ var: 'arten' }, ['lager', 'produktion']] };
    expect(trifftZu(regel, { arten: ['buero', 'lager'] })).toBe(true);
    expect(trifftZu(regel, { arten: ['buero', 'wohnen'] })).toBe(false);
  });
});

describe('Arithmetik', () => {
  it('rechnet Grundoperationen', () => {
    expect(evaluiere({ '+': [1, 2, 3] }, {})).toBe(6);
    expect(evaluiere({ '*': [2, 3] }, {})).toBe(6);
    expect(evaluiere({ '-': [10, 4] }, {})).toBe(6);
    expect(evaluiere({ max: [6, 3] }, {})).toBe(6);
  });

  it('bildet den Löschmitteleinheiten-Ausdruck ab', () => {
    // max(6, 0,05 × BGF) — der Ausdruck aus der Anforderungsmatrix.
    const regel = { max: [6, { '*': [{ var: 'bgf' }, 0.05] }] };
    expect(evaluiere(regel, { bgf: 4820 })).toBe(241);
    expect(evaluiere(regel, { bgf: 50 })).toBe(6);
  });
});

describe('missing', () => {
  it('nennt fehlende Pflichtfelder', () => {
    const fehlend = evaluiere({ missing: ['a', 'b'] }, { a: 1 });
    expect(fehlend).toEqual(['b']);
  });
});

describe('Sicherheit', () => {
  it('weist unbekannte Operatoren ab', () => {
    expect(() => evaluiere({ exec: ['rm'] } as never, {})).toThrow(
      RegelAusdruckFehler,
    );
  });

  it('weist Objekte mit mehreren Operatoren ab', () => {
    expect(() => evaluiere({ and: [true], or: [true] } as never, {})).toThrow(
      RegelAusdruckFehler,
    );
  });

  it('findet unzulässige Operatoren ohne Auswertung', () => {
    expect(pruefeAusdruck({ and: [{ var: 'a' }] })).toEqual([]);
    expect(pruefeAusdruck({ eval: ['x'] } as never)).toEqual(['eval']);
  });
});

describe('Wahrheitswerte', () => {
  it('behandelt leere Sammlungen als falsch', () => {
    expect(trifftZu({ '!!': [[]] }, {})).toBe(false);
    expect(trifftZu({ '!!': [[1]] }, {})).toBe(true);
    expect(trifftZu({ '!!': [0] }, {})).toBe(false);
  });
});
