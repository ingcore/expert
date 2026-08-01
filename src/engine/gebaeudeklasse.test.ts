/**
 * Tests der Gebäudeklassenableitung (FR-2.1, FR-2.9).
 *
 * Der Ableitungsweg ist Teil des Prüfprotokolls und wird der Behörde
 * vorgelegt — er darf dem Ergebnis nie widersprechen.
 */

import { describe, expect, it } from 'vitest';
import { ermittleGebaeudeklasse } from './gebaeudeklasse';
import type { GebaeudeklassenEingabe } from './gebaeudeklasse';

function eingabe(
  teil: Partial<GebaeudeklassenEingabe> = {},
): GebaeudeklassenEingabe {
  return {
    fluchtniveau: 5,
    geschosseOberirdisch: 2,
    nutzungseinheitenAnzahl: 1,
    groessteEinheitFlaeche: 150,
    freistehend: true,
    ...teil,
  };
}

describe('Einstufung', () => {
  it('stuft ein freistehendes Einfamilienhaus als GK1 ein', () => {
    expect(ermittleGebaeudeklasse(eingabe()).klasse).toBe('GK1');
  });

  it('stuft bis fünf Einheiten als GK2 ein', () => {
    const r = ermittleGebaeudeklasse(
      eingabe({ nutzungseinheitenAnzahl: 4, freistehend: false }),
    );
    expect(r.klasse).toBe('GK2');
  });

  it('stuft über fünf Einheiten als GK3 ein', () => {
    expect(
      ermittleGebaeudeklasse(eingabe({ nutzungseinheitenAnzahl: 9 })).klasse,
    ).toBe('GK3');
  });

  it('stuft eine Einheit über 400 m² als GK3 ein', () => {
    expect(
      ermittleGebaeudeklasse(eingabe({ groessteEinheitFlaeche: 900 })).klasse,
    ).toBe('GK3');
  });

  it('stuft ab Fluchtniveau über 7 m als GK4 ein', () => {
    expect(ermittleGebaeudeklasse(eingabe({ fluchtniveau: 9.4 })).klasse).toBe(
      'GK4',
    );
  });

  it('stuft vier oberirdische Geschoße als GK4 ein', () => {
    const r = ermittleGebaeudeklasse(
      eingabe({ fluchtniveau: 6.5, geschosseOberirdisch: 4 }),
    );
    expect(r.klasse).toBe('GK4');
  });

  it('stuft ab Fluchtniveau über 11 m als GK5 ein', () => {
    expect(ermittleGebaeudeklasse(eingabe({ fluchtniveau: 14 })).klasse).toBe(
      'GK5',
    );
  });

  it('stuft mehr als vier Geschoße als GK5 ein', () => {
    const r = ermittleGebaeudeklasse(
      eingabe({ fluchtniveau: 10, geschosseOberirdisch: 6 }),
    );
    expect(r.klasse).toBe('GK5');
  });

  it('weist ab 22 m auf die Hochhausrichtlinie hin', () => {
    const r = ermittleGebaeudeklasse(eingabe({ fluchtniveau: 30 }));
    expect(r.hinweise.join(' ')).toContain('2.3');
  });
});

describe('Ableitungsweg', () => {
  const faelle: GebaeudeklassenEingabe[] = [
    eingabe(),
    eingabe({ nutzungseinheitenAnzahl: 4, freistehend: false }),
    eingabe({ nutzungseinheitenAnzahl: 9 }),
    eingabe({ fluchtniveau: 9.4 }),
    eingabe({ fluchtniveau: 6.5, geschosseOberirdisch: 4 }),
    eingabe({ fluchtniveau: 14 }),
    eingabe({ fluchtniveau: 10, geschosseOberirdisch: 6 }),
  ];

  it('schließt bei jedem ermittelten Ergebnis mit einem Ergebnisschritt ab', () => {
    for (const f of faelle) {
      const r = ermittleGebaeudeklasse(f);
      const letzter = r.schritte[r.schritte.length - 1];
      expect(letzter.wert, JSON.stringify(f)).toBe(r.klasse);
    }
  });

  it('nummeriert die Schritte lückenlos ab 1', () => {
    for (const f of faelle) {
      const r = ermittleGebaeudeklasse(f);
      expect(r.schritte.map((s) => s.nr)).toEqual(
        r.schritte.map((_, i) => i + 1),
      );
    }
  });

  it('belegt jeden Schritt mit einer Normstelle (LP-3)', () => {
    for (const f of faelle) {
      for (const s of ermittleGebaeudeklasse(f).schritte) {
        expect(s.quelle.richtlinie).toBeTruthy();
        expect(s.quelle.punkt).toBeTruthy();
      }
    }
  });

  it('widerspricht dem Ergebnis nicht, wenn das Fluchtniveau GK4 erzwingt', () => {
    // Drei Geschoße, aber 9,4 m Fluchtniveau: Der Geschoßschritt darf nicht
    // „Gebäudeklasse 1 bis 3 möglich" behaupten.
    const r = ermittleGebaeudeklasse(
      eingabe({ fluchtniveau: 9.4, geschosseOberirdisch: 3 }),
    );
    expect(r.klasse).toBe('GK4');
    const geschossSchritt = r.schritte.find((s) =>
      s.frage.includes('oberirdische Geschoße'),
    );
    expect(geschossSchritt?.ergebnis).not.toContain('1 bis 3 möglich');
    expect(geschossSchritt?.ergebnis).toContain('schließt');
  });
});

describe('Datenlücken', () => {
  it('ermittelt nichts ohne Fluchtniveau', () => {
    const r = ermittleGebaeudeklasse(eingabe({ fluchtniveau: null }));
    expect(r.klasse).toBeNull();
    expect(r.fehlendeAngaben).toContain('Fluchtniveau');
  });

  it('nennt die fehlenden Angaben für die Unterscheidung GK1 bis GK3', () => {
    const r = ermittleGebaeudeklasse(
      eingabe({ nutzungseinheitenAnzahl: null, freistehend: null }),
    );
    expect(r.klasse).toBeNull();
    expect(r.fehlendeAngaben.length).toBeGreaterThan(0);
  });

  it('braucht für GK4 und GK5 keine Angaben zu den Einheiten', () => {
    const r = ermittleGebaeudeklasse(
      eingabe({
        fluchtniveau: 14,
        nutzungseinheitenAnzahl: null,
        groessteEinheitFlaeche: null,
        freistehend: null,
      }),
    );
    expect(r.klasse).toBe('GK5');
    expect(r.fehlendeAngaben).toEqual([]);
  });
});
