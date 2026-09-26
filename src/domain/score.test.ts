import { describe, expect, it } from 'vitest';
import { neueMassnahme } from './factory';
import {
  gesamtscore,
  istSollText,
  kapitelAusBefund,
  kapitelVon,
  punkteVon,
  stufeAusPunkten,
  teilscore,
  teilscores,
  type Teilscore,
} from './score';
import type { Massnahme, SafetyScore } from './types';

let nr = 0;
function mangel(score: SafetyScore, o: Partial<Massnahme> = {}): Massnahme {
  return { ...neueMassnahme(++nr), score, kapitel: '6', ...o };
}

describe('Stufen und Punkte', () => {
  it('ordnet Punkte den Stufengrenzen zu', () => {
    expect(stufeAusPunkten(100)).toBe('A');
    expect(stufeAusPunkten(81)).toBe('A');
    expect(stufeAusPunkten(80)).toBe('B');
    expect(stufeAusPunkten(41)).toBe('C');
    expect(stufeAusPunkten(21)).toBe('D');
    expect(stufeAusPunkten(20)).toBe('E');
    expect(stufeAusPunkten(0)).toBe('E');
  });

  it('ohne Feststellung ist A 100', () => {
    expect(punkteVon([])).toEqual({ punkte: 100, stufe: 'A' });
  });

  it('einzelne Feststellungen landen mitten in ihrer Stufe', () => {
    expect(punkteVon([{ score: 'B' }])).toEqual({ punkte: 79, stufe: 'B' });
    expect(punkteVon([{ score: 'C' }])).toEqual({ punkte: 58, stufe: 'C' });
    expect(punkteVon([{ score: 'D' }])).toEqual({ punkte: 36, stufe: 'D' });
    expect(punkteVon([{ score: 'E' }])).toEqual({ punkte: 10, stufe: 'E' });
  });

  it('Deckel der schlechtesten Stufe minus 0,5 × RI (Bandtacho 6.2: D 34)', () => {
    // D 8 + C 3 + B 1 = RI 12: 40 − 6
    expect(punkteVon([{ score: 'D' }, { score: 'C' }, { score: 'B' }])).toEqual(
      {
        punkte: 34,
        stufe: 'D',
      },
    );
  });

  it('höchstens 19 Punkte Abzug, die Stufe bleibt erhalten', () => {
    const viele = Array.from({ length: 20 }, () => ({ score: 'C' as const }));
    expect(punkteVon(viele)).toEqual({ punkte: 41, stufe: 'C' });
  });

  it('Hinweise der Stufe A bleiben bei 100', () => {
    expect(punkteVon([{ score: 'A' }, { score: 'A' }])).toEqual({
      punkte: 100,
      stufe: 'A',
    });
  });
});

describe('Teilscore', () => {
  it('Soll enthält nur verbleibende Abweichungen', () => {
    const liste = [
      mangel('D'),
      mangel('C'),
      mangel('B', { verbleibend: true }),
      mangel('E', { kapitel: '8' }),
    ];
    const t = teilscore(liste, '6');
    expect(t.feststellungen).toHaveLength(3);
    expect(t.ri).toBe(12);
    expect(t.ist).toEqual({ punkte: 34, stufe: 'D' });
    expect(t.soll).toEqual({ punkte: 79, stufe: 'B' });
  });

  it('Empfehlungen zählen nie', () => {
    const t = teilscore([mangel('C', { art: 'e' })], '6');
    expect(t.feststellungen).toHaveLength(0);
    expect(t.ist).toEqual({ punkte: 100, stufe: 'A' });
  });

  it('erledigte und entfallene Mängel zählen nicht', () => {
    const t = teilscore(
      [
        mangel('E', { status: 'erledigt' }),
        mangel('D', { status: 'entfallen' }),
      ],
      '6',
    );
    expect(t.ist).toEqual({ punkte: 100, stufe: 'A' });
  });

  it('ältere Datensätze ohne Kapitel werden nach Art zugeordnet', () => {
    const ohne = { kapitel: undefined as unknown as Massnahme['kapitel'] };
    expect(kapitelVon({ ...ohne, art: 't' })).toBe('8');
    expect(kapitelVon({ ...ohne, art: 'o' })).toBe('9');
    expect(kapitelVon({ ...ohne, art: 'b' })).toBe('5');
  });

  it('ordnet Regelwerksbefunde den Berichtskapiteln zu', () => {
    expect(kapitelAusBefund('Fluchtwege')).toBe('6');
    expect(kapitelAusBefund('Löschwasser')).toBe('7');
    expect(kapitelAusBefund('Stammdaten')).toBeNull();
  });
});

describe('Gesamt-SAFETY-SCORE', () => {
  it('Mittel der Teilscores, gedeckelt auf die schlechteste Stufe', () => {
    // Kapitel 6: D 34, übrige vier ohne Feststellung: Mittel 86,8 → Deckel D 40
    const g = gesamtscore(teilscores([mangel('D'), mangel('C'), mangel('B')]));
    expect(g.ist.mittel).toBeCloseTo(86.8);
    expect(g.ist).toMatchObject({ punkte: 40, stufe: 'D' });
    expect(g.soll).toMatchObject({ punkte: 100, stufe: 'A' });
  });

  it('Bandtacho-Beispiel: Ist D 40, Soll B 80', () => {
    const teil = (ist: number, soll: number) =>
      ({
        ist: { punkte: ist, stufe: stufeAusPunkten(ist) },
        soll: { punkte: soll, stufe: stufeAusPunkten(soll) },
      }) as Teilscore;
    const g = gesamtscore([
      teil(100, 100),
      teil(34, 79),
      teil(57, 100),
      teil(79, 100),
    ]);
    expect(g.ist).toMatchObject({ mittel: 67.5, punkte: 40, stufe: 'D' });
    expect(g.soll).toMatchObject({ mittel: 94.75, punkte: 80, stufe: 'B' });
  });

  it('ohne Deckel wird das Mittel abgerundet', () => {
    const teil = (p: number) =>
      ({
        ist: { punkte: p, stufe: stufeAusPunkten(p) },
        soll: { punkte: p, stufe: stufeAusPunkten(p) },
      }) as Teilscore;
    expect(gesamtscore([teil(100), teil(90), teil(85)]).ist).toMatchObject({
      punkte: 91,
      stufe: 'A',
    });
    expect(gesamtscore([teil(100), teil(99), teil(98)]).ist).toMatchObject({
      punkte: 99,
      stufe: 'A',
    });
  });

  it('formuliert Ist und Soll nach CD', () => {
    expect(
      istSollText({ punkte: 34, stufe: 'D' }, { punkte: 79, stufe: 'B' }),
    ).toBe('Ist D 34 · Soll B 79');
    expect(
      istSollText({ punkte: 100, stufe: 'A' }, { punkte: 100, stufe: 'A' }),
    ).toBe('Ist = Soll A 100');
  });
});
