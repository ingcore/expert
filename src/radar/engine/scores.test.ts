/**
 * Scores, Marktbewertung und Restauration.
 *
 * Geprüft werden die Aussagen, die das Produkt von einer Fahrzeugbörse
 * unterscheiden: Ein sehr niedriger Preis ist kein Vorteil, eine Behauptung
 * ohne Beleg ist keine Information, und die Restaurationsrechnung muss die
 * Beispielarithmetik aus Abschnitt 19 tragen.
 */

import { describe, expect, it } from 'vitest';
import { baueScore, komponente, staerksteBeitraege, standardEinstufung } from './erklaerung';
import { bewerteMarkt } from './bewertung';
import { bewerteEvidenz } from './evidenz';
import { preisvorteilPunkte, pruefeBuySignal } from './buysignal';
import { pruefeFirmenwagen } from './firmenwagen';
import { rechneRestauration } from './restauration';
import { momentum } from './momentum';
import { analysiereText } from './text';
import { vorgabeParameter } from './gewichte';
import { modell } from '../wissen/modelle';
import { marktreihe } from '../wissen/marktdaten';
import type { Fahrzeugdokument, InseratDaten } from '../domain/types';
import type { Marktbewertung } from './bewertung';

const PARAMETER = vorgabeParameter();

function daten(ueberschreibung: Partial<InseratDaten> = {}): InseratDaten {
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
    kilometerstand: 91000,
    farbeAussen: 'Interlagosblau metallic',
    farbeInnen: 'Novillo Schwarz',
    ausstattung: ['edc-fahrwerk'],
    vin: null,
    fahrzeugland: 'DE',
    vorbesitzer: 2,
    servicehistorie: 'lueckenlos',
    preis: 45000,
    waehrung: 'EUR',
    mwstAusweisbar: true,
    verkaeuferArt: 'haendler',
    verkaeuferName: 'Autohaus',
    standortOrt: 'Regensburg',
    standortLand: 'DE',
    titel: 'BMW M3 E92 Handschalter',
    beschreibung: 'Gepflegtes Fahrzeug.',
    ausstattungstext: null,
    garantie: null,
    unfallangabe: 'unfallfrei',
    serviceangabe: null,
    umbauten: null,
    bekannteMaengel: null,
    bilder: [],
    genannteUnterlagen: [],
    ...ueberschreibung,
  };
}

function bewerte(ueberschreibung: Partial<InseratDaten> = {}, offenerBedarf = 0) {
  return bewerteMarkt({
    daten: daten(ueberschreibung),
    modell: modell('bmw-m3-e92'),
    reihe: marktreihe('bmw-m3-e92-handschalter'),
    trendProzent: 0,
    angebotsdauerTage: 20,
    baujahr: 2010,
    tuningErkannt: false,
    offenerInstandsetzungsbedarf: offenerBedarf,
  });
}

/* ==========================================================================
 * Erklärbarkeit
 * ======================================================================= */

describe('Score-Grundlagen (Abschnitt 38)', () => {
  it('bildet den Wert ausschließlich aus den Komponenten', () => {
    const score = baueScore(
      [
        komponente('a', 'A', 50, 80, []),
        komponente('b', 'B', 50, 60, []),
      ],
      standardEinstufung,
    );
    expect(score.wert).toBe(70);
  });

  it('normiert die Gewichte, damit eine Änderung die Skala nicht verschiebt', () => {
    const score = baueScore(
      [
        komponente('a', 'A', 200, 80, []),
        komponente('b', 'B', 200, 60, []),
      ],
      standardEinstufung,
    );
    expect(score.wert).toBe(70);
  });

  it('macht eine Begrenzung sichtbar, statt sie zu verschweigen', () => {
    const k = komponente('a', 'A', 100, 90, [{ text: 'starker Bonus', delta: 40 }]);
    expect(k.punkte).toBe(100);
    expect(k.beitraege.some((b) => b.text.includes('begrenzt'))).toBe(true);
  });

  it('rechnet die stärksten Beiträge auf den Gesamtscore um', () => {
    const score = baueScore(
      [
        komponente('a', 'A', 10, 50, [{ text: 'x', delta: 30 }]),
        komponente('b', 'B', 90, 50, [{ text: 'y', delta: 20 }]),
      ],
      standardEinstufung,
    );
    const [staerkster] = staerksteBeitraege(score, 2);
    // 20 Punkte bei 90 % Gewicht wiegen schwerer als 30 bei 10 %.
    expect(staerkster.text).toBe('y');
  });
});

/* ==========================================================================
 * Marktbewertung
 * ======================================================================= */

describe('Market Valuation (Abschnitt 16)', () => {
  it('verankert den Wert in der beobachteten Kilometerklasse', () => {
    const b = bewerte();
    expect(b.fairValue).toBeGreaterThan(0);
    expect(b.ankerherkunft).toContain('Kilometerklasse');
    expect(b.vergleichsbasis).toBeGreaterThan(0);
  });

  it('weist jeden Faktor mit Wirkung in Euro aus', () => {
    const b = bewerte();
    expect(b.faktoren.length).toBeGreaterThan(2);
    for (const f of b.faktoren) {
      expect(f.begruendung.length).toBeGreaterThan(10);
      expect(Number.isFinite(f.wirkung)).toBe(true);
    }
  });

  it('bewertet fehlende Servicehistorie und Vorschaden niedriger', () => {
    const gut = bewerte();
    const schlecht = bewerte({ servicehistorie: 'keine', unfallangabe: 'vorschaden-repariert' });
    expect(schlecht.fairValue).toBeLessThan(gut.fairValue);
  });

  it('verbreitert das Konfidenzintervall, wenn Angaben fehlen', () => {
    const vollstaendig = bewerte();
    const duenn = bewerte({
      vorbesitzer: null,
      farbeAussen: null,
      servicehistorie: 'unbekannt',
      unfallangabe: 'keine-angabe',
    });
    const breiteVoll = vollstaendig.intervall[1] - vollstaendig.intervall[0];
    const breiteDuenn = duenn.intervall[1] - duenn.intervall[0];
    expect(breiteDuenn / duenn.fairValue).toBeGreaterThan(breiteVoll / vollstaendig.fairValue);
    expect(duenn.konfidenz).toBeLessThan(vollstaendig.konfidenz);
  });

  it('zieht offenen Instandsetzungsbedarf nur anteilig ab', () => {
    const ohne = bewerte();
    const mit = bewerte({}, 6000);
    const abzug = ohne.fairValue - mit.fairValue;
    expect(abzug).toBeGreaterThan(0);
    // Der Klassenmedian trägt den üblichen Nachholbedarf bereits in sich.
    expect(abzug).toBeLessThan(6000);
  });

  it('weist ohne Modellzuordnung keinen Marktwert aus, statt zu schätzen', () => {
    const b = bewerteMarkt({
      daten: daten(),
      modell: undefined,
      reihe: undefined,
      trendProzent: 0,
      angebotsdauerTage: 10,
      baujahr: 2010,
      tuningErkannt: false,
      offenerInstandsetzungsbedarf: 0,
    });
    expect(b.fairValue).toBe(0);
    expect(b.konfidenz).toBe(0);
    expect(b.hinweise.length).toBeGreaterThan(0);
  });
});

/* ==========================================================================
 * Preisvorteil
 * ======================================================================= */

describe('Preisvorteil (Abschnitt 1 und 12)', () => {
  it('bewertet ein leicht günstiges Fahrzeug am besten', () => {
    expect(preisvorteilPunkte(-10)).toBeGreaterThan(preisvorteilPunkte(0));
    expect(preisvorteilPunkte(-10)).toBeGreaterThan(preisvorteilPunkte(-20));
  });

  it('behandelt einen auffällig niedrigen Preis nicht als Vorteil', () => {
    // Das Produktversprechen aus Abschnitt 1: nicht das billigste Fahrzeug.
    expect(preisvorteilPunkte(-40)).toBeLessThan(preisvorteilPunkte(15));
  });
});

/* ==========================================================================
 * Evidence
 * ======================================================================= */

describe('Evidence Score (Abschnitt 13)', () => {
  const beschreibung =
    'Pleuellager wurden bei 82.400 km gewechselt. Unfallfrei, lückenlose Servicehistorie.';

  const rechnung: Fahrzeugdokument = {
    id: 'd1',
    art: 'motorrechnung',
    bezeichnung: 'Pleuellagerwechsel',
    hochgeladenAm: '2026-01-01T00:00:00.000Z',
    extrahiert: {
      datum: '2024-03-06',
      kilometerstand: 82400,
      werkstatt: 'M-Technik',
      leistungen: ['Pleuellager erneuert'],
      kostenEuro: 3480,
    },
    confidence: 96,
    belegtBehauptungen: ['Pleuellager gewechselt'],
  };

  it('bewertet dieselbe Behauptung mit Beleg deutlich höher als ohne', () => {
    const eingabe = daten({ beschreibung });
    const text = analysiereText(eingabe);

    const ohne = bewerteEvidenz({
      daten: eingabe,
      behauptungen: text.behauptungen,
      dokumente: [],
      kilometerstand: 91000,
      gewichte: PARAMETER.evidenz,
    });
    const mit = bewerteEvidenz({
      daten: eingabe,
      behauptungen: text.behauptungen,
      dokumente: [rechnung],
      kilometerstand: 91000,
      gewichte: PARAMETER.evidenz,
    });

    expect(mit.score.wert).toBeGreaterThan(ohne.score.wert + 10);
    expect(mit.pruefungen.some((p) => p.gedeckt)).toBe(true);
    expect(ohne.pruefungen.every((p) => !p.gedeckt)).toBe(true);
  });

  it('benennt, welcher Beleg fehlt', () => {
    const eingabe = daten({ beschreibung });
    const text = analysiereText(eingabe);
    const ergebnis = bewerteEvidenz({
      daten: eingabe,
      behauptungen: text.behauptungen,
      dokumente: [],
      kilometerstand: 91000,
      gewichte: PARAMETER.evidenz,
    });
    expect(ergebnis.fehlendeBelege.length).toBeGreaterThan(0);
    expect(ergebnis.fehlendeBelege[0].benoetigt.length).toBeGreaterThan(0);
  });
});

/* ==========================================================================
 * Buy Signal und Firmenwagen
 * ======================================================================= */

describe('Buy Signal (Abschnitt 28)', () => {
  const bewertung: Marktbewertung = {
    fairValue: 50000,
    intervall: [47500, 52500],
    angebotspreis: 47000,
    abweichungEuro: -3000,
    abweichungProzent: -6,
    ankerwert: 48000,
    ankerherkunft: 'Test',
    faktoren: [],
    liquiditaet: 'mittel',
    standzeitTage: 70,
    vergleichsbasis: 30,
    konfidenz: 90,
    hinweise: [],
  };

  function score(wert: number) {
    return baueScore([komponente('x', 'X', 100, wert, [])], standardEinstufung);
  }

  it('löst aus, wenn alle Mindestbedingungen erfüllt sind', () => {
    const s = pruefeBuySignal(
      score(88),
      score(84),
      score(88),
      score(84),
      bewertung,
      [],
      PARAMETER,
    );
    expect(s.ausgeloest).toBe(true);
    expect(s.bedingungen.every((b) => b.erfuellt)).toBe(true);
  });

  it('löst nicht aus, wenn eine einzige Bedingung fehlt — kein Ausgleich', () => {
    const s = pruefeBuySignal(
      score(99),
      score(99),
      score(99),
      score(70), // unter der Schwelle
      bewertung,
      [],
      PARAMETER,
    );
    expect(s.ausgeloest).toBe(false);
    expect(s.naechsteHandlung).toContain('Quality');
  });

  it('löst bei einer kritischen Red Flag nicht aus', () => {
    const s = pruefeBuySignal(
      score(95),
      score(95),
      score(95),
      score(95),
      bewertung,
      [
        {
          id: 'rf-1',
          regel: 'kilometer-sinkt',
          schweregrad: 'kritisch',
          titel: 'Kilometerstand sinkt',
          begruendung: 'Test',
          quelle: 'Test',
          zeitpunkt: '2026-01-01T00:00:00.000Z',
          empfehlung: 'Test',
        },
      ],
      PARAMETER,
    );
    expect(s.ausgeloest).toBe(false);
  });
});

describe('Firmenwagenmodus (Abschnitt 24)', () => {
  it('richtet sich nach den übergebenen Parametern, nicht nach festen Werten', () => {
    const eingang = {
      daten: daten({ preis: 42000 }),
      modell: modell('bmw-m3-e92'),
      alterMonate: 190,
      assetScore: 86,
      integrityScore: 85,
      kritischeRisiken: 0,
      parameter: PARAMETER.firmenwagen,
    };

    const mitVorgabe = pruefeFirmenwagen(eingang);
    expect(mitVorgabe.geeignet).toBe(false);

    const mitHoehererGrenze = pruefeFirmenwagen({
      ...eingang,
      parameter: { ...PARAMETER.firmenwagen, anschaffungspreisMax: 45000 },
    });
    expect(mitHoehererGrenze.geeignet).toBe(true);
  });

  it('schließt Fahrzeuge mit kritischen offenen Risiken aus', () => {
    const p = pruefeFirmenwagen({
      daten: daten({ preis: 30000 }),
      modell: modell('bmw-m3-e92'),
      alterMonate: 190,
      assetScore: 90,
      integrityScore: 90,
      kritischeRisiken: 1,
      parameter: PARAMETER.firmenwagen,
    });
    expect(p.geeignet).toBe(false);
    expect(p.kriterien.find((k) => k.schluessel === 'schaden')?.erfuellt).toBe(false);
  });

  it('gibt einen steuerlichen Prüfhinweis aus, statt selbst zu rechnen', () => {
    const p = pruefeFirmenwagen({
      daten: daten(),
      modell: modell('bmw-m3-e92'),
      alterMonate: 190,
      assetScore: 90,
      integrityScore: 90,
      kritischeRisiken: 0,
      parameter: PARAMETER.firmenwagen,
    });
    expect(p.steuerhinweis).toContain('Steuerberatung');
  });
});

/* ==========================================================================
 * Restauration
 * ======================================================================= */

describe('Restaurationsanalyse (Abschnitt 19)', () => {
  it('rechnet Kaufpreis plus Restaurierung plus Reserve auf das Gesamtinvestment', () => {
    const r = rechneRestauration({
      kaufpreis: 35000,
      zustand: [
        { gewerk: 'karosserie', stufe: 3, bemerkung: '', herkunft: 'manuell' },
        { gewerk: 'lack', stufe: 3, bemerkung: '', herkunft: 'manuell' },
        { gewerk: 'innenraum', stufe: 3, bemerkung: '', herkunft: 'manuell' },
      ],
      hersteller: null,
      reihe: undefined,
      bewertung: {
        fairValue: 40000,
        intervall: [38000, 42000],
        angebotspreis: 35000,
        abweichungEuro: -5000,
        abweichungProzent: -12.5,
        ankerwert: 40000,
        ankerherkunft: '',
        faktoren: [],
        liquiditaet: 'mittel',
        standzeitTage: 80,
        vergleichsbasis: 10,
        konfidenz: 80,
        hinweise: [],
      },
      kilometerstand: 150000,
    });

    const summe = r.positionen.reduce((s, p) => s + p.expected, 0);
    expect(r.restaurierungExpected).toBe(summe);
    expect(r.gesamtinvestmentExpected).toBe(35000 + summe + r.reserve);
    expect(r.reserve).toBe(Math.round(summe * r.reservesatz));
    expect(r.investmentRatio).toBeCloseTo(r.marktwertNachher / r.gesamtinvestmentExpected, 5);
  });

  it('erhöht die Reserve mit der Tiefe des Eingriffs', () => {
    const rechnung = (stufe: 2 | 5) =>
      rechneRestauration({
        kaufpreis: 10000,
        zustand: [{ gewerk: 'lack', stufe, bemerkung: '', herkunft: 'manuell' }],
        hersteller: null,
        reihe: undefined,
        bewertung: {
          fairValue: 20000,
          intervall: [19000, 21000],
          angebotspreis: 10000,
          abweichungEuro: 0,
          abweichungProzent: 0,
          ankerwert: 20000,
          ankerherkunft: '',
          faktoren: [],
          liquiditaet: 'mittel',
          standzeitTage: 80,
          vergleichsbasis: 10,
          konfidenz: 80,
          hinweise: [],
        },
        kilometerstand: 100000,
      });

    expect(rechnung(5).reservesatz).toBeGreaterThan(rechnung(2).reservesatz);
  });

  it('berücksichtigt den Markenfaktor', () => {
    const zustand = [
      { gewerk: 'motor' as const, stufe: 3 as const, bemerkung: '', herkunft: 'manuell' as const },
    ];
    const bewertung = {
      fairValue: 40000,
      intervall: [38000, 42000] as [number, number],
      angebotspreis: 35000,
      abweichungEuro: 0,
      abweichungProzent: 0,
      ankerwert: 40000,
      ankerherkunft: '',
      faktoren: [],
      liquiditaet: 'mittel' as const,
      standzeitTage: 80,
      vergleichsbasis: 10,
      konfidenz: 80,
      hinweise: [],
    };
    const audi = rechneRestauration({
      kaufpreis: 30000,
      zustand,
      hersteller: 'Audi',
      reihe: undefined,
      bewertung,
      kilometerstand: 150000,
    });
    const porsche = rechneRestauration({
      kaufpreis: 30000,
      zustand,
      hersteller: 'Porsche',
      reihe: undefined,
      bewertung,
      kilometerstand: 150000,
    });
    expect(porsche.restaurierungExpected).toBeGreaterThan(audi.restaurierungExpected);
  });
});

/* ==========================================================================
 * Momentum
 * ======================================================================= */

describe('Market Momentum (Abschnitt 18)', () => {
  it('bewertet einen anziehenden Markt höher als einen nachgebenden', () => {
    const anziehend = marktreihe('porsche-996-c4s');
    const nachgebend = marktreihe('audi-rs3-8v');
    expect(anziehend).toBeDefined();
    expect(nachgebend).toBeDefined();

    const a = momentum(anziehend!, PARAMETER.momentum);
    const n = momentum(nachgebend!, PARAMETER.momentum);

    expect(a.score.wert).toBeGreaterThan(n.score.wert);
    expect(a.kennzahlen.medianpreisProzent).toBeGreaterThan(0);
    expect(a.kennzahlen.angebotsmengeProzent).toBeLessThan(0);
  });

  it('dämpft den Markttrend für die Marktwertrechnung auf wenige Prozent', () => {
    const a = momentum(marktreihe('porsche-996-c4s')!, PARAMETER.momentum);
    expect(Math.abs(a.trendProzent)).toBeLessThanOrEqual(3.5);
  });
});
