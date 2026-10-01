/**
 * Akzeptanzkriterien des MVP (PRD Abschnitt 19).
 *
 * Jeder Test trägt die Nummer des Kriteriums, das er absichert.
 */

import { describe, expect, it } from 'vitest';

import { baueBefund, befundnummer, MAX_MAENGEL_IM_BEFUND } from './befund';
import { baueCheckliste, CHECKLISTEN_VERSION } from './checklist';
import { LEGAL_RESULTS, type LegalResult } from './enums';
import {
  DEMO_ARBEITSMITTEL,
  DEMO_KUNDEN,
  DEMO_PRUEFER,
  DEMO_STANDORTE,
  neuePruefung,
  neuerMangel,
} from './factory';
import { berechneIntervall } from './intervall';
import { beurteilePflicht } from './legal/applicability';
import {
  ergebnisZulaessig,
  freigegebenePruefarten,
  mindestpruefinhalte,
  pruefart,
  PRUEFARTEN,
} from './legal/pruefart';
import { AMVO_REGELN, giltAm, regelstandZum } from './legal/rules';
import { anlagenfremdeFelder, sichtbareFelder } from './schema';
import { validiere } from './validierung';
import type { Asset, Inspection } from './types';

/* ==========================================================================
 * Hilfen
 * ======================================================================= */

const TOR = DEMO_ARBEITSMITTEL.find((a) => a.id === 'ast_demo_tor1')!;
const STAPLER = DEMO_ARBEITSMITTEL.find((a) => a.id === 'ast_demo_stapler1')!;
const HEBEBUEHNE = DEMO_ARBEITSMITTEL.find((a) => a.id === 'ast_demo_hebebuehne1')!;
const ANSCHLAGPUNKT = DEMO_ARBEITSMITTEL.find((a) => a.id === 'ast_demo_anschlag1')!;
const KUNDE = DEMO_KUNDEN[0];
const PRUEFER = DEMO_PRUEFER[0];

/** Legt eine vollständig ausgefüllte, mangelfreie Prüfung an. */
function fertigePruefung(
  asset: Asset,
  art: 'AMVO_7_ACCEPTANCE' | 'AMVO_8_RECURRING',
  ergebnis: LegalResult = 'NO_DEFECTS',
): Inspection {
  const ins = neuePruefung({
    asset,
    customer: KUNDE,
    pruefart: art,
    inspectorId: PRUEFER.id,
    pruefdatum: '2026-03-14',
    laufendeNummer: 17,
  });
  return {
    ...ins,
    items: ins.items.map((i) => ({ ...i, ergebnis: 'OK' as const })),
    ergebnis,
    unterschriftVorhanden: true,
    freigabedatum: '2026-03-14',
    fachfreigabe: {
      ...ins.fachfreigabe,
      erteilt: true,
      begruendung: 'Fachliche Beurteilung im Einzelfall dokumentiert.',
      freigegebenVon: PRUEFER.name,
      freigegebenAm: '2026-03-14',
    },
  };
}

function befundFuer(asset: Asset, ins: Inspection) {
  const site = DEMO_STANDORTE.find((s) => s.id === asset.siteId)!;
  const customer = DEMO_KUNDEN.find((c) => c.id === asset.customerId)!;
  return baueBefund({ inspection: ins, asset, customer, site, inspector: PRUEFER });
}

/* ==========================================================================
 * AC-01 / AC-02 — Prüfarten vermischen sich nicht
 * ======================================================================= */

describe('AC-01 / AC-02 — Trennung von § 7 und § 8', () => {
  it('AC-01: ein §-7-Befund enthält an keiner Stelle §-8-Prüftext', () => {
    const ins = fertigePruefung(HEBEBUEHNE, 'AMVO_7_ACCEPTANCE');
    const befund = befundFuer(HEBEBUEHNE, ins);
    const gesamttext = [
      befund.titelzeile,
      ...befund.haupttext,
      befund.fussnote,
      ...befund.pruefung.map((z) => `${z.label}: ${z.wert}`),
    ].join(' ');

    expect(befund.titelzeile).toBe('Abnahmeprüfung gemäß § 7 AM-VO');
    expect(gesamttext).not.toContain('§ 8');
    expect(gesamttext).not.toContain('wiederkehrende');
    expect(gesamttext).not.toContain('Wiederkehrende');
    expect(gesamttext).toContain('§ 7 Abs. 2 AM-VO');
  });

  it('AC-02: ein §-8-Befund enthält an keiner Stelle §-7-Prüftext', () => {
    const ins = fertigePruefung(TOR, 'AMVO_8_RECURRING');
    const befund = befundFuer(TOR, ins);
    const gesamttext = [
      befund.titelzeile,
      ...befund.haupttext,
      befund.fussnote,
      ...befund.pruefung.map((z) => `${z.label}: ${z.wert}`),
    ].join(' ');

    expect(befund.titelzeile).toBe('Wiederkehrende Prüfung gemäß § 8 AM-VO');
    expect(gesamttext).not.toContain('§ 7');
    expect(gesamttext).not.toContain('Abnahmeprüfung');
    expect(gesamttext).toContain('§ 8 Abs. 2 AM-VO');
  });

  it('die Checkliste trägt ausschließlich die Mindestprüfinhalte der Prüfart', () => {
    const sieben = baueCheckliste({
      pruefart: 'AMVO_7_ACCEPTANCE',
      familie: TOR.familie,
      attribute: TOR.attribute,
    }).filter((i) => i.herkunft === 'GESETZ');
    const acht = baueCheckliste({
      pruefart: 'AMVO_8_RECURRING',
      familie: TOR.familie,
      attribute: TOR.attribute,
    }).filter((i) => i.herkunft === 'GESETZ');

    expect(sieben.every((i) => i.katalogRef.startsWith('AMVO_7_2'))).toBe(true);
    expect(acht.every((i) => i.katalogRef.startsWith('AMVO_8_2'))).toBe(true);
  });

  it('eine Checkliste aus der falschen Prüfart blockiert die Erzeugung', () => {
    // Prüfart nachträglich umgestellt, Checkliste nicht neu aufgebaut.
    const ins = fertigePruefung(TOR, 'AMVO_8_RECURRING');
    const vermischt: Inspection = { ...ins, pruefart: 'AMVO_7_ACCEPTANCE' };
    const ergebnis = validiere({
      inspection: vermischt,
      asset: TOR,
      inspector: PRUEFER,
    });

    expect(ergebnis.erzeugbar).toBe(false);
    expect(ergebnis.blocker.map((b) => b.code)).toContain('V-01');
    expect(ergebnis.blocker.map((b) => b.code)).toContain('V-02');
  });
});

/* ==========================================================================
 * AC-03 / AC-04 / AC-05 — § 6 AM-VO
 * ======================================================================= */

describe('AC-03 bis AC-05 — Rechtsfolge nach § 6 AM-VO', () => {
  it('AC-03: mangelfreie wiederkehrende Prüfung verweist nicht auf § 6 Abs. 3', () => {
    const ins = fertigePruefung(TOR, 'AMVO_8_RECURRING', 'NO_DEFECTS');
    const befund = befundFuer(TOR, ins);
    const text = befund.haupttext.join(' ');

    expect(text).not.toContain('§ 6 Abs. 3');
    expect(text).not.toContain('6 Abs. 3');
    expect(text).toContain('keine Mängel festgestellt');
  });

  it('AC-04: § 6 Abs. 3 ist bei der Abnahmeprüfung nicht wählbar', () => {
    expect(
      ergebnisZulaessig('AMVO_7_ACCEPTANCE', 'DEFECTS_USE_ALLOWED_6_3'),
    ).toBe(false);
    expect(
      ergebnisZulaessig('AMVO_8_RECURRING', 'DEFECTS_USE_ALLOWED_6_3'),
    ).toBe(true);
    expect(
      pruefart('AMVO_7_ACCEPTANCE').erlaubteErgebnisse,
    ).not.toContain('DEFECTS_USE_ALLOWED_6_3');
  });

  it('AC-04: die Textengine verweigert § 6 Abs. 3 bei der Abnahmeprüfung', () => {
    expect(() =>
      pruefart('AMVO_7_ACCEPTANCE').haupttext({
        pruefdatum: '14.03.2026',
        ergebnis: 'DEFECTS_USE_ALLOWED_6_3',
      }),
    ).toThrow(/nicht zulässig/);
  });

  it('AC-04: § 6 Abs. 3 ohne Mangel wird blockiert', () => {
    const ins: Inspection = {
      ...fertigePruefung(TOR, 'AMVO_8_RECURRING', 'DEFECTS_USE_ALLOWED_6_3'),
      findings: [],
    };
    const ergebnis = validiere({ inspection: ins, asset: TOR, inspector: PRUEFER });

    expect(ergebnis.erzeugbar).toBe(false);
    expect(ergebnis.blocker.map((b) => b.code)).toContain('V-04');
  });

  it('AC-04: § 6 Abs. 3 bei Abnahmeprüfung wird blockiert', () => {
    const ins: Inspection = {
      ...fertigePruefung(HEBEBUEHNE, 'AMVO_7_ACCEPTANCE'),
      ergebnis: 'DEFECTS_USE_ALLOWED_6_3',
      findings: [{ ...neuerMangel(1), beschreibung: 'Mangel' }],
    };
    const ergebnis = validiere({
      inspection: ins,
      asset: HEBEBUEHNE,
      inspector: PRUEFER,
    });

    expect(ergebnis.blocker.map((b) => b.code)).toContain('V-03');
  });

  it('AC-05: Abnahmeprüfung mit Mangel schließt die Benützung aus', () => {
    const ins: Inspection = {
      ...fertigePruefung(HEBEBUEHNE, 'AMVO_7_ACCEPTANCE', 'DEFECTS_USE_PROHIBITED'),
      findings: [
        { ...neuerMangel(1), beschreibung: 'Verriegelung ohne Funktion', bauteil: 'Sicherung' },
      ],
    };
    const befund = befundFuer(HEBEBUEHNE, ins);
    const text = befund.haupttext.join(' ');

    expect(text).toContain('§ 6 Abs. 2 AM-VO');
    expect(text).toContain('erst nach Behebung');
    expect(befund.ergebnis.zeile).toBe(
      'MÄNGEL FESTGESTELLT — WEITERBENÜTZUNG NICHT ZULÄSSIG',
    );
    expect(LEGAL_RESULTS[befund.ergebnis.code].weiterbenuetzung).toBe(
      'bis Mängelbehebung unzulässig',
    );
  });

  it('§ 6 Abs. 3 ohne Bedingungen wird blockiert', () => {
    const ins: Inspection = {
      ...fertigePruefung(TOR, 'AMVO_8_RECURRING', 'DEFECTS_USE_ALLOWED_6_3'),
      findings: [{ ...neuerMangel(1), beschreibung: 'Lichtschranke verschmutzt' }],
    };
    const ergebnis = validiere({ inspection: ins, asset: TOR, inspector: PRUEFER });

    expect(ergebnis.blocker.map((b) => b.code)).toContain('V-06');
  });

  it('§ 6 Abs. 3 ohne Information der Arbeitnehmer:innen ist nicht abschließbar', () => {
    const basis = fertigePruefung(TOR, 'AMVO_8_RECURRING', 'DEFECTS_USE_ALLOWED_6_3');
    const mangel = { ...neuerMangel(1), beschreibung: 'Lichtschranke verschmutzt' };
    const ins: Inspection = {
      ...basis,
      findings: [mangel],
      weiterbenuetzung: {
        begruendung: 'Restrisiko durch organisatorische Maßnahmen beherrscht.',
        bedingungen: 'Betrieb ausschließlich im Totmannbetrieb.',
        behebungBis: '2026-04-30',
        betroffeneMaengel: [mangel.id],
        verantwortlichBetreiber: 'Betriebsleitung',
      },
    };
    const ergebnis = validiere({ inspection: ins, asset: TOR, inspector: PRUEFER });

    expect(ergebnis.erzeugbar).toBe(true);
    expect(ergebnis.abschliessbar).toBe(false);
    expect(ergebnis.nichtFinal.map((b) => b.code)).toContain('V-07');
  });

  it('Mängel ohne Benützungsentscheid werden blockiert', () => {
    const ins: Inspection = {
      ...fertigePruefung(TOR, 'AMVO_8_RECURRING'),
      ergebnis: null,
      findings: [{ ...neuerMangel(1), beschreibung: 'Mangel' }],
    };
    const ergebnis = validiere({ inspection: ins, asset: TOR, inspector: PRUEFER });

    expect(ergebnis.blocker.map((b) => b.code)).toContain('V-05');
  });

  it('Mängel bei Ergebnis „keine Mängel" widersprechen einander', () => {
    const ins: Inspection = {
      ...fertigePruefung(TOR, 'AMVO_8_RECURRING', 'NO_DEFECTS'),
      findings: [{ ...neuerMangel(1), beschreibung: 'Mangel' }],
    };
    const ergebnis = validiere({ inspection: ins, asset: TOR, inspector: PRUEFER });

    expect(ergebnis.blocker.map((b) => b.code)).toContain('V-05');
  });
});

/* ==========================================================================
 * AC-06 — Mindestinhalt nach § 11 AM-VO
 * ======================================================================= */

describe('AC-06 — Pflichtinformationen nach § 11 AM-VO', () => {
  it('eine vollständige Prüfung ist erzeugbar', () => {
    const ins = fertigePruefung(TOR, 'AMVO_8_RECURRING');
    const ergebnis = validiere({ inspection: ins, asset: TOR, inspector: PRUEFER });

    expect(ergebnis.blocker).toHaveLength(0);
    expect(ergebnis.erzeugbar).toBe(true);
    expect(ergebnis.abschliessbar).toBe(true);
  });

  it('fehlender Prüfer blockiert', () => {
    const ins = fertigePruefung(TOR, 'AMVO_8_RECURRING');
    const ergebnis = validiere({ inspection: ins, asset: TOR, inspector: null });

    expect(ergebnis.blocker.map((b) => b.code)).toContain('V-08');
  });

  it('fehlende Unterschrift blockiert', () => {
    const ins: Inspection = {
      ...fertigePruefung(TOR, 'AMVO_8_RECURRING'),
      unterschriftVorhanden: false,
    };
    const ergebnis = validiere({ inspection: ins, asset: TOR, inspector: PRUEFER });

    expect(ergebnis.blocker.map((b) => b.code)).toContain('V-09');
  });

  it('fehlende Prüfinhalte blockieren', () => {
    const ins: Inspection = {
      ...fertigePruefung(TOR, 'AMVO_8_RECURRING'),
      items: [],
    };
    const ergebnis = validiere({ inspection: ins, asset: TOR, inspector: PRUEFER });

    expect(ergebnis.blocker.map((b) => b.code)).toContain('V-10');
  });

  it('unbeurteilte Prüfpunkte blockieren', () => {
    const basis = fertigePruefung(TOR, 'AMVO_8_RECURRING');
    const ins: Inspection = {
      ...basis,
      items: basis.items.map((i, idx) => (idx === 0 ? { ...i, ergebnis: null } : i)),
    };
    const ergebnis = validiere({ inspection: ins, asset: TOR, inspector: PRUEFER });

    expect(ergebnis.blocker.map((b) => b.code)).toContain('V-10');
  });

  it('ein nicht freigabeberechtigter Prüfer blockiert', () => {
    // Petra Hofer ist nur für Anschlagpunkte und nur für § 8 berechtigt.
    const ins = fertigePruefung(TOR, 'AMVO_8_RECURRING');
    const ergebnis = validiere({
      inspection: ins,
      asset: TOR,
      inspector: DEMO_PRUEFER[1],
    });

    expect(ergebnis.blocker.map((b) => b.code)).toContain('V-14');
  });
});

/* ==========================================================================
 * AC-07 — anlagenspezifische Felder
 * ======================================================================= */

describe('AC-07 — anlagenspezifische Felder bleiben in ihrer Familie', () => {
  it('eine Fahrzeughebebühne kennt keine EN-12453-Nutzerklassifizierung', () => {
    const felder = sichtbareFelder({
      familie: 'FAHRZEUGHEBEBUEHNE',
      bauart: 'ZWEI_SAEULEN',
      attr: HEBEBUEHNE.attribute,
    }).map((f) => f.key);

    expect(felder).not.toContain('nutzerklassifizierung');
    expect(felder).not.toContain('torblattmasse');
    expect(felder).toContain('gleichlaufsicherung');
  });

  it('ein Tor kennt keine Gleichlaufsicherung der Hebebühne', () => {
    const felder = sichtbareFelder({
      familie: 'TOR',
      bauart: 'SEKTIONALTOR',
      attr: TOR.attribute,
    }).map((f) => f.key);

    expect(felder).not.toContain('gleichlaufsicherung');
    expect(felder).toContain('nutzerklassifizierung');
  });

  it('ein Anschlagpunkt gegen Absturz ist eine eigene Familie ohne Lastfelder', () => {
    const felder = sichtbareFelder({
      familie: 'ANSCHLAGPUNKT_PSA',
      bauart: 'SEILSICHERUNGSSYSTEM',
      attr: ANSCHLAGPUNKT.attribute,
    }).map((f) => f.key);

    expect(felder).toContain('normtyp');
    expect(felder).not.toContain('ablegereife');
    expect(felder).not.toContain('tragfaehigkeit');
  });

  it('ein anlagenfremdes Feld blockiert die Erzeugung', () => {
    const verfaelscht: Asset = {
      ...HEBEBUEHNE,
      attribute: { ...HEBEBUEHNE.attribute, nutzerklassifizierung: 'KLASSE_3' },
    };
    const ins = fertigePruefung(verfaelscht, 'AMVO_7_ACCEPTANCE');
    const ergebnis = validiere({
      inspection: ins,
      asset: verfaelscht,
      inspector: PRUEFER,
    });

    expect(anlagenfremdeFelder('FAHRZEUGHEBEBUEHNE', verfaelscht.attribute)).toEqual([
      'nutzerklassifizierung',
    ]);
    expect(ergebnis.blocker.map((b) => b.code)).toContain('V-13');
  });

  it('der Befund stellt nur Felder der eigenen Familie dar', () => {
    const ins = fertigePruefung(HEBEBUEHNE, 'AMVO_7_ACCEPTANCE');
    const labels = befundFuer(HEBEBUEHNE, ins).pruefgegenstand.map((z) => z.label);

    expect(labels).not.toContain('Nutzerklassifizierung nach EN 12453');
    expect(labels).toContain('Tragfähigkeit');
  });
});

/* ==========================================================================
 * AC-08 — Versionierung der Rechtsstände
 * ======================================================================= */

describe('AC-08 — Rechts- und Normenstände sind versioniert', () => {
  it('jede Regel trägt Gültigkeit, Quelle, Freigabe und Version', () => {
    for (const r of AMVO_REGELN) {
      expect(r.valid_from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(r.source.length).toBeGreaterThan(0);
      expect(r.reviewed_by.length).toBeGreaterThan(0);
      expect(r.reviewed_at).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(r.version.length).toBeGreaterThan(0);
      expect(r.binding_reason).toBeDefined();
    }
  });

  it('der Regelstand richtet sich nach dem Prüfdatum, nicht nach heute', () => {
    const vorInkrafttreten = regelstandZum('1999-01-01');
    const nachInkrafttreten = regelstandZum('2026-03-14');

    expect(vorInkrafttreten.regeln).toHaveLength(0);
    expect(nachInkrafttreten.regeln.length).toBeGreaterThan(0);
    expect(nachInkrafttreten.stichtag).toBe('2026-03-14');
  });

  it('eine befristete Regel gilt außerhalb ihres Zeitraums nicht', () => {
    const befristet = {
      ...AMVO_REGELN[0],
      rule_id: 'TEST',
      valid_from: '2020-01-01',
      valid_to: '2024-12-31',
    };

    expect(giltAm(befristet, '2022-06-01')).toBe(true);
    expect(giltAm(befristet, '2025-06-01')).toBe(false);
    expect(giltAm(befristet, '2019-06-01')).toBe(false);
  });

  it('der Befund führt den Regelstand des Prüfdatums mit', () => {
    const ins = fertigePruefung(TOR, 'AMVO_8_RECURRING');
    const befund = befundFuer(TOR, ins);

    expect(befund.regelstand.stichtag).toBe('2026-03-14');
    expect(befund.regelstand.regeln.map((r) => r.rule_id)).toContain('AMVO_8');
  });
});

/* ==========================================================================
 * AC-09 / AC-10 — Einseitigkeit
 * ======================================================================= */

describe('AC-09 / AC-10 — der Befund bleibt einseitig', () => {
  it('AC-10: ab dem vierten Mangel verweist der Befund auf die Anlage M-01', () => {
    const basis = fertigePruefung(TOR, 'AMVO_8_RECURRING', 'DEFECTS_USE_PROHIBITED');
    const ins: Inspection = {
      ...basis,
      findings: Array.from({ length: 7 }, (_, i) => ({
        ...neuerMangel(i + 1),
        beschreibung: `Mangel ${i + 1}`,
      })),
    };
    const befund = befundFuer(TOR, ins);

    expect(befund.maengel.anzahl).toBe(7);
    expect(befund.maengel.dargestellt).toHaveLength(MAX_MAENGEL_IM_BEFUND);
    expect(befund.maengel.anlagenverweis).toBe(
      'Es wurden 7 Mängel festgestellt. Einzelheiten siehe Anlage M-01 zum Prüfbefund.',
    );
  });

  it('bis zu drei Mängel werden unmittelbar dargestellt', () => {
    const basis = fertigePruefung(TOR, 'AMVO_8_RECURRING', 'DEFECTS_USE_PROHIBITED');
    const ins: Inspection = {
      ...basis,
      findings: [neuerMangel(1), neuerMangel(2)],
    };
    const befund = befundFuer(TOR, ins);

    expect(befund.maengel.dargestellt).toHaveLength(2);
    expect(befund.maengel.anlagenverweis).toBeNull();
  });
});

/* ==========================================================================
 * AC-11 — Revisionssicherheit
 * ======================================================================= */

describe('AC-11 — revisionssichere Zuordnung', () => {
  it('der Befund kennt Checklisten-, Rechtsregel- und Templateversion', () => {
    const ins = fertigePruefung(TOR, 'AMVO_8_RECURRING');
    const befund = befundFuer(TOR, ins);

    expect(CHECKLISTEN_VERSION).toBeTruthy();
    expect(befund.templateVersion).toBe('2026.1-onepage');
    expect(befund.regelstand.regeln.every((r) => r.version)).toBe(true);
  });

  it('die Befundnummer folgt dem INGTEC-Schema', () => {
    expect(
      befundnummer({
        jahr: 2026,
        kundennummer: 'KD-1042',
        familienKuerzel: 'TOR',
        laufend: 17,
      }),
    ).toBe('PB-2026-1042-TOR-017');
  });
});

/* ==========================================================================
 * AC-12 — Prüfintervall
 * ======================================================================= */

describe('AC-12 — geplanter und spätester Prüftermin', () => {
  it('bei einer Prüfung im März bindet die 15-Monats-Frist', () => {
    const i = berechneIntervall('2026-03-14');

    expect(i.geplant).toBe('2027-03-14');
    expect(i.spaetestens).toBe('2027-06-14');
    expect(i.massgeblicheRegel).toBe('FRIST_15_MONATE');
  });

  it('bei einer Prüfung im November bindet die Kalenderjahrregel', () => {
    const i = berechneIntervall('2026-11-20');

    expect(i.geplant).toBe('2027-11-20');
    expect(i.spaetestens).toBe('2027-12-31');
    expect(i.massgeblicheRegel).toBe('KALENDERJAHR');
  });

  it('der späteste Termin ist nie einfach Prüfdatum plus 15 Monate', () => {
    const i = berechneIntervall('2026-11-20');

    // Prüfdatum + 15 Monate wäre der 20.02.2028 — das wäre zu spät.
    expect(i.spaetestens).not.toBe('2028-02-20');
    expect(i.spaetestens < '2028-02-20').toBe(true);
  });
});

/* ==========================================================================
 * Legal Applicability Engine (PRD 5)
 * ======================================================================= */

describe('Legal Applicability Engine', () => {
  it('ein gewöhnlicher Stapler erhält kein §-7-Standardprofil', () => {
    const ctx = {
      familie: STAPLER.familie,
      bauart: STAPLER.bauart,
      attr: STAPLER.attribute,
    };

    expect(beurteilePflicht(ctx, 'AMVO_7_ACCEPTANCE').status).toBe(
      'KEIN_STANDARDPROFIL',
    );
    expect(beurteilePflicht(ctx, 'AMVO_8_RECURRING').status).toBe('STANDARD');
  });

  it('ein kraftbetriebenes Tor trägt beide Standardprüfpflichten', () => {
    const ctx = { familie: TOR.familie, bauart: TOR.bauart, attr: TOR.attribute };

    expect(beurteilePflicht(ctx, 'AMVO_7_ACCEPTANCE').status).toBe('STANDARD');
    expect(beurteilePflicht(ctx, 'AMVO_8_RECURRING').status).toBe('STANDARD');
  });

  it('ein handbetriebenes Tor erhält kein §-7-Standardprofil', () => {
    const ctx = {
      familie: 'TOR' as const,
      bauart: 'DREHTOR',
      attr: { kraftbetrieben: false },
    };

    expect(beurteilePflicht(ctx, 'AMVO_7_ACCEPTANCE').status).toBe(
      'KEIN_STANDARDPROFIL',
    );
  });

  it('ein Brandschutzabschluss erzeugt nicht automatisch § 7 AM-VO', () => {
    const ctx = {
      familie: 'BRANDSCHUTZABSCHLUSS' as const,
      bauart: 'BS_DREHTUER',
      attr: { kraftbetrieben: false },
    };
    const beurteilung = beurteilePflicht(ctx, 'AMVO_7_ACCEPTANCE');

    expect(beurteilung.status).toBe('KEIN_STANDARDPROFIL');
    expect(beurteilung.freigabePflichtig).toBe(true);
    expect(beurteilung.begruendung).toContain('nicht allein wegen des Brandschutzes');
  });

  it('eine Absauganlage hat kein generisches §-7-/§-8-Profil', () => {
    const ctx = {
      familie: 'ABSAUGANLAGE' as const,
      bauart: 'SPAENEABSAUGUNG',
      attr: {},
    };

    expect(beurteilePflicht(ctx, 'AMVO_7_ACCEPTANCE').status).toBe(
      'KEIN_STANDARDPROFIL',
    );
    expect(beurteilePflicht(ctx, 'AMVO_8_RECURRING').status).toBe(
      'KEIN_STANDARDPROFIL',
    );
  });

  it('ein Anschlagpunkt gegen Absturz wird nicht mit Anschlagmitteln gleichgesetzt', () => {
    const psa = beurteilePflicht(
      { familie: 'ANSCHLAGPUNKT_PSA', bauart: 'EINZELANSCHLAGPUNKT', attr: {} },
      'AMVO_8_RECURRING',
    );
    const last = beurteilePflicht(
      { familie: 'ANSCHLAGMITTEL_LAST', bauart: 'RUNDSCHLINGE', attr: {} },
      'AMVO_8_RECURRING',
    );

    expect(psa.status).toBe('KEIN_STANDARDPROFIL');
    expect(last.status).toBe('STANDARD');
    expect(psa.profil.profil_id).not.toBe(last.profil.profil_id);
  });

  it('ein Kran ist bei § 7 differenziert, bei § 8 Standard', () => {
    const ctx = { familie: 'KRAN' as const, bauart: 'BRUECKENKRAN', attr: {} };

    expect(beurteilePflicht(ctx, 'AMVO_7_ACCEPTANCE').status).toBe('DIFFERENZIERT');
    expect(beurteilePflicht(ctx, 'AMVO_8_RECURRING').status).toBe('STANDARD');
  });

  it('ein Stapler mit Arbeitskorb erhält das Sonderfallprofil', () => {
    const beurteilung = beurteilePflicht(
      { familie: 'FLURFOERDERZEUG', bauart: 'GABELSTAPLER', attr: { arbeitskorb: true } },
      'AMVO_7_ACCEPTANCE',
    );

    expect(beurteilung.profil.profil_id).toBe('FFZ_ARBEITSKORB');
    expect(beurteilung.hinweis).toContain('Herstellerfreigabe');
  });

  it('eine nicht hinterlegte Prüfpflicht verlangt eine protokollierte Freigabe', () => {
    const basis = fertigePruefung(STAPLER, 'AMVO_7_ACCEPTANCE');
    const ohneFreigabe: Inspection = {
      ...basis,
      fachfreigabe: { ...basis.fachfreigabe, erteilt: false, begruendung: '' },
    };
    const ergebnis = validiere({
      inspection: ohneFreigabe,
      asset: STAPLER,
      inspector: PRUEFER,
    });

    expect(ergebnis.blocker.map((b) => b.code)).toContain('V-16');
  });
});

/* ==========================================================================
 * Arbeitskorb-Prüfinhalte
 * ======================================================================= */

describe('Mindestprüfinhalte', () => {
  it('die Arbeitskorb-Ziffer erscheint nur bei Arbeitskörben', () => {
    expect(mindestpruefinhalte('AMVO_7_ACCEPTANCE')).toHaveLength(6);
    expect(mindestpruefinhalte('AMVO_7_ACCEPTANCE', { arbeitskorb: true })).toHaveLength(7);
    expect(mindestpruefinhalte('AMVO_8_RECURRING')).toHaveLength(3);
    expect(mindestpruefinhalte('AMVO_8_RECURRING', { arbeitskorb: true })).toHaveLength(4);
  });

  it('im MVP sind genau zwei Prüfarten freigegeben', () => {
    const freigegeben = freigegebenePruefarten().map((p) => p.id);

    expect(freigegeben).toEqual(['AMVO_7_ACCEPTANCE', 'AMVO_8_RECURRING']);
    expect(PRUEFARTEN.AMVO_9_EXCEPTIONAL.freigegeben).toBe(false);
  });
});
