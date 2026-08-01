import { describe, expect, it } from 'vitest';
import { pruefeProjekt, befundStatistik } from './rules';
import { demoProjekt, neuerFluchtweg, neuesProjekt } from './factory';
import type { Projekt } from './types';

/** Findet einen Befund anhand seiner Regel-ID. */
function hatRegel(projekt: Projekt, regelId: string): boolean {
  return pruefeProjekt(projekt).some((b) => b.regelId === regelId);
}

describe('Gebäudeklassenprüfung', () => {
  it('beanstandet ein zu hohes Fluchtniveau für die gewählte Klasse', () => {
    const p = neuesProjekt();
    p.gebaeude.gebaeudeklasse = 'GK3'; // zulässig bis 7 m
    p.gebaeude.fluchtniveau = 12;

    expect(hatRegel(p, 'OIB2-GK-NIVEAU')).toBe(true);
  });

  it('akzeptiert ein passendes Fluchtniveau', () => {
    const p = neuesProjekt();
    p.gebaeude.gebaeudeklasse = 'GK4'; // zulässig bis 11 m
    p.gebaeude.fluchtniveau = 9.4;

    expect(hatRegel(p, 'OIB2-GK-NIVEAU')).toBe(false);
  });

  it('verlangt GK5 bei mehr als vier oberirdischen Geschoßen', () => {
    const p = neuesProjekt();
    p.gebaeude.gebaeudeklasse = 'GK4';
    p.gebaeude.geschosseOberirdisch = 6;

    expect(hatRegel(p, 'OIB2-GK-GESCHOSSE')).toBe(true);
  });

  it('weist bei über 22 m auf die Hochhausrichtlinie hin', () => {
    const p = neuesProjekt();
    p.gebaeude.gebaeudeklasse = 'GK5';
    p.gebaeude.fluchtniveau = 30;

    expect(hatRegel(p, 'OIB2-HOCHHAUS')).toBe(true);
  });
});

describe('Fluchtwegprüfung', () => {
  it('beanstandet eine zu große Fluchtweglänge', () => {
    const p = neuesProjekt();
    p.gebaeude.risikoklasse = 'normal'; // max. 40 m
    p.fluchtwege = [{ ...neuerFluchtweg(), bezeichnung: 'FW1', laenge: 55 }];

    expect(hatRegel(p, 'OIB2-FW-LAENGE')).toBe(true);
  });

  it('beanstandet eine zu geringe Mindestbreite', () => {
    const p = neuesProjekt();
    p.fluchtwege = [{ ...neuerFluchtweg(), bezeichnung: 'FW1', breite: 0.9 }];

    expect(hatRegel(p, 'OIB2-FW-BREITE-MIN')).toBe(true);
  });

  it('verlangt einen Panikbeschlag ab 100 Personen', () => {
    const p = neuesProjekt();
    p.fluchtwege = [
      {
        ...neuerFluchtweg(),
        bezeichnung: 'FW1',
        personen: 120,
        breite: 2,
        panikbeschlag: false,
      },
    ];

    expect(hatRegel(p, 'ASTV-PANIK')).toBe(true);
  });

  it('verlangt einen zweiten Fluchtweg ab 120 Personen', () => {
    const p = neuesProjekt();
    p.nutzungseinheiten = [
      {
        id: 'ne1',
        bezeichnung: 'Saal',
        nutzungsart: 'versammlung',
        geschoss: 'EG',
        flaeche: 300,
        personenzahl: 200,
        brandlast: 0,
        brandabschnittId: null,
        bemerkung: '',
      },
    ];
    p.fluchtwege = [
      { ...neuerFluchtweg(), bezeichnung: 'FW1', fuehrtInsFreie: true },
    ];

    expect(hatRegel(p, 'FW-ZWEITER-WEG')).toBe(true);
  });
});

describe('Löschhilfenprüfung', () => {
  it('beanstandet zu wenige Löschmitteleinheiten', () => {
    const p = neuesProjekt();
    p.gebaeude.bruttoGrundflaeche = 4000; // 0,05 LE/m² → 200 LE erforderlich
    p.loeschhilfen = [];

    expect(hatRegel(p, 'TRVB-F124-LE')).toBe(true);
  });

  it('beanstandet eine unzureichende Löschwasserversorgung', () => {
    const p = neuesProjekt();
    p.loeschwasser.menge = 800;
    p.loeschwasser.erforderlich = 1600;

    expect(hatRegel(p, 'TRVB-F128-MENGE')).toBe(true);
  });
});

describe('Organisationsprüfung', () => {
  it('beanstandet einen nicht bestellten Brandschutzbeauftragten', () => {
    const p = neuesProjekt();
    p.organisation.brandschutzbeauftragterErforderlich = true;
    p.organisation.brandschutzbeauftragter = '';

    expect(hatRegel(p, 'TRVB-O119-BSB')).toBe(true);
  });

  it('erkennt eine ordnungsgemäße Bestellung an', () => {
    const p = neuesProjekt();
    p.organisation.brandschutzbeauftragterErforderlich = true;
    p.organisation.brandschutzbeauftragter = 'Ing. Markus Perner';

    expect(hatRegel(p, 'TRVB-O119-BSB')).toBe(false);
  });
});

describe('Abweichungsprüfung', () => {
  it('verlangt eine Kompensation je Abweichung', () => {
    const p = neuesProjekt();
    p.abweichungen = [
      {
        id: 'ab1',
        anforderung: 'Brandabschnittsfläche',
        beschreibung: 'zu groß',
        kompensation: '',
        nachweis: '',
        genehmigt: false,
      },
    ];

    expect(hatRegel(p, 'ABW-KOMPENSATION')).toBe(true);
    expect(hatRegel(p, 'ABW-NACHWEIS')).toBe(true);
  });
});

describe('Demoprojekt', () => {
  it('erzeugt Befunde, damit die Prüflogik sichtbar wird', () => {
    const stat = befundStatistik(pruefeProjekt(demoProjekt()));

    expect(stat.gesamt).toBeGreaterThan(0);
    expect(stat.fehler).toBeGreaterThan(0);
  });

  it('sortiert Befunde nach Schwere — Fehler zuerst', () => {
    const befunde = pruefeProjekt(demoProjekt());
    const rang = { fehler: 0, warnung: 1, hinweis: 2, info: 3 };

    for (let i = 1; i < befunde.length; i += 1) {
      expect(rang[befunde[i].schwere]).toBeGreaterThanOrEqual(
        rang[befunde[i - 1].schwere],
      );
    }
  });
});
