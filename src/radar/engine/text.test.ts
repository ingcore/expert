/**
 * Text Intelligence Engine — PRD Abschnitt 22.
 *
 * Der entscheidende Satz: Erkannte Formulierungen führen **nicht automatisch
 * zu einer negativen Bewertung**, sie erzeugen gezielte Prüfanforderungen.
 * Genau das wird hier geprüft — samt der Widersprüche zwischen Freitext und
 * strukturierten Feldern.
 */

import { describe, expect, it } from 'vitest';
import { analysiereText, TEXTMUSTER } from './text';
import type { InseratDaten } from '../domain/types';

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
    kilometerstand: 91000,
    farbeAussen: 'Interlagosblau',
    farbeInnen: 'Schwarz',
    ausstattung: [],
    vin: null,
    fahrzeugland: 'DE',
    vorbesitzer: 2,
    servicehistorie: 'teilweise',
    preis: 39900,
    waehrung: 'EUR',
    mwstAusweisbar: true,
    verkaeuferArt: 'haendler',
    verkaeuferName: 'Autohaus',
    standortOrt: 'Regensburg',
    standortLand: 'DE',
    titel: 'BMW M3 E92',
    beschreibung: '',
    ausstattungstext: null,
    garantie: null,
    unfallangabe: 'keine-angabe',
    serviceangabe: null,
    umbauten: null,
    bekannteMaengel: null,
    bilder: [],
    genannteUnterlagen: [],
    ...ueberschreibung,
  };
}

describe('Erkannte Formulierungen (Abschnitt 22)', () => {
  const beispiele: [string, string][] = [
    ['laut Vorbesitzer unfallfrei', 'laut-vorbesitzer'],
    ['Fahrzeug wird im Kundenauftrag angeboten', 'kundenauftrag'],
    ['Kilometer laut Tacho', 'km-laut-tacho'],
    ['Serviceheft verloren', 'serviceheft-verloren'],
    ['leichter Vorschaden vorne', 'leichter-vorschaden'],
    ['Motor überholt bei 120.000 km', 'motor-ueberholt'],
    ['Export bevorzugt', 'export-bevorzugt'],
    ['Verkauf ohne Gewährleistung', 'keine-gewaehrleistung'],
    ['US-Import mit Papieren', 'us-import'],
    ['Keine Angaben zur Unfallfreiheit möglich', 'keine-unfallangabe'],
  ];

  it.each(beispiele)('erkennt „%s"', (text, musterId) => {
    const a = analysiereText(daten({ beschreibung: text }));
    expect(a.befunde.map((b) => b.musterId)).toContain(musterId);
  });

  it('wertet die Formulierungen aus Abschnitt 22 nicht ab, sondern erzeugt Prüfaufträge', () => {
    for (const [text, musterId] of beispiele) {
      const a = analysiereText(daten({ beschreibung: text }));
      const befund = a.befunde.find((b) => b.musterId === musterId);
      expect(befund?.wirkung).toBe(0);
      expect(befund?.pruefanforderung.length).toBeGreaterThan(10);
    }
  });

  it('nennt zu jedem Befund die Fundstelle im Originaltext', () => {
    const a = analysiereText(
      daten({ beschreibung: 'Gepflegtes Fahrzeug. Serviceheft verloren, Rechnungen vorhanden.' }),
    );
    const befund = a.befunde.find((b) => b.musterId === 'serviceheft-verloren');
    expect(befund?.fundstelle).toContain('Serviceheft');
  });

  it('wertet allein die Leistungssteigerung ab — mit ausdrücklicher Begründung', () => {
    const abwertend = TEXTMUSTER.filter((m) => m.wirkung !== 0);
    expect(abwertend.map((m) => m.id)).toEqual(['tuning']);
  });
});

describe('Behauptungen und Belegbedarf (Abschnitt 13)', () => {
  it('erkennt Reparaturbehauptungen samt Kilometerbezug', () => {
    const a = analysiereText(
      daten({ beschreibung: 'Pleuellager wurden bei 82.400 km gewechselt.' }),
    );
    const behauptung = a.behauptungen.find((b) => b.text === 'Pleuellager gewechselt');
    expect(behauptung).toBeDefined();
    expect(behauptung?.beiKilometer).toBe(82400);
    expect(behauptung?.benoetigterBeleg).toContain('motorrechnung');
  });

  it('macht aus einer zugesicherten Unfallfreiheit eine belegfähige Behauptung', () => {
    const a = analysiereText(daten({ unfallangabe: 'unfallfrei' }));
    expect(a.behauptungen.some((b) => b.art === 'unfallfrei')).toBe(true);
  });

  it('gewichtet die weitergegebene Aussage schwächer als die Zusicherung', () => {
    const zugesichert = analysiereText(daten({ unfallangabe: 'unfallfrei' }));
    const weitergegeben = analysiereText(
      daten({ unfallangabe: 'unfallfrei-laut-vorbesitzer' }),
    );
    const a = zugesichert.behauptungen.find((b) => b.art === 'unfallfrei');
    const b = weitergegeben.behauptungen.find((x) => x.art === 'unfallfrei');
    expect((a?.gewicht ?? 0)).toBeGreaterThan(b?.gewicht ?? 0);
  });
});

describe('Widersprüche zwischen Text und strukturierten Feldern', () => {
  it('erkennt „unfallfrei" bei gleichzeitigem Schadenshinweis im Text', () => {
    const a = analysiereText(
      daten({
        unfallangabe: 'unfallfrei',
        beschreibung: 'Front wurde nach einem Vorschaden fachgerecht instandgesetzt.',
      }),
    );
    expect(a.widersprueche.some((w) => w.feld === 'unfallangabe')).toBe(true);
  });

  it('erkennt „lückenlos" bei gleichzeitig verlorenem Serviceheft', () => {
    const a = analysiereText(
      daten({ servicehistorie: 'lueckenlos', beschreibung: 'Serviceheft leider verloren.' }),
    );
    expect(a.widersprueche.some((w) => w.feld === 'servicehistorie')).toBe(true);
  });

  it('erkennt eine abweichende Kilometerangabe im Titel', () => {
    const a = analysiereText(
      daten({ kilometerstand: 91000, titel: 'BMW M3 E92 mit 145.000 km' }),
    );
    expect(a.widersprueche.some((w) => w.feld === 'kilometerstand')).toBe(true);
  });

  it('meldet keinen Widerspruch, wenn Text und Felder zusammenpassen', () => {
    const a = analysiereText(
      daten({
        unfallangabe: 'unfallfrei',
        servicehistorie: 'lueckenlos',
        beschreibung: 'Unfallfrei, lückenlose Servicehistorie im Markenbetrieb.',
      }),
    );
    expect(a.widersprueche).toHaveLength(0);
  });
});
