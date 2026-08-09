/**
 * Gesamtkette und Abnahmekriterien — PRD Abschnitte 46 und 50.
 *
 * Dieser Test führt den vollständigen Betriebsablauf aus: Connector-Läufe über
 * alle Beobachtungszeitpunkte, Normalisierung, Identitätszuordnung,
 * Historisierung, Bewertung, Red Flags, Alerts. Geprüft wird anschließend
 * gegen die Erfolgsdefinition aus Abschnitt 50 — jeweils an der Stelle, an der
 * das Kriterium tatsächlich messbar ist.
 */

import { describe, expect, it, beforeAll } from 'vitest';
import { baueStartbestand, seedSuchauftraege, type Startbestand } from './seed';
import { analysiereBestand, type Fahrzeuganalyse } from '../engine/analyse';
import { erzeugeAlerts } from '../engine/alerts';
import { vorgabeParameter } from '../engine/gewichte';
import { PLATTFORMEN } from '../wissen/plattformen';
import { aktiveConnectoren } from '../connectors/registry';

const PARAMETER = vorgabeParameter();

let start: Startbestand;
let analysen: Fahrzeuganalyse[];

beforeAll(async () => {
  start = await baueStartbestand(PARAMETER);
  analysen = analysiereBestand(start.bestand.fahrzeuge, start.bestand.inserate, {
    plattformen: PLATTFORMEN,
    verkaeufer: start.bestand.verkaeufer,
    alleInserate: start.bestand.inserate,
    parameter: PARAMETER,
  });
});

describe('Abnahmekriterien nach PRD Abschnitt 50', () => {
  it('1 — mindestens drei Plattformen sind automatisiert angebunden', () => {
    const aktiv = aktiveConnectoren();
    expect(aktiv.length).toBeGreaterThanOrEqual(3);
    const genutzt = new Set(start.bestand.inserate.map((i) => i.plattformId));
    expect(genutzt.size).toBeGreaterThanOrEqual(3);
  });

  it('2 — mindestens 95 % der Zielinserate werden vollständig normalisiert', () => {
    const unvollstaendig = start.laeufe.flatMap((l) => l.unvollstaendig);
    const quote =
      (start.bestand.inserate.length - unvollstaendig.length) /
      start.bestand.inserate.length;
    expect(quote).toBeGreaterThanOrEqual(0.95);
  });

  it('3 — Mehrfachinserate desselben Fahrzeuges werden erkannt', () => {
    // Der E92 in Interlagosblau steht auf mobile.de und AutoScout24, die
    // E90-Limousine bei demselben Händler auf AutoScout24 und willhaben.
    expect(start.wahrheit['m3-e92-interlagos']).toHaveLength(1);
    expect(start.wahrheit['m3-e90-limousine']).toHaveLength(1);

    const interlagos = analysen.find(
      (a) => a.fahrzeugId === start.wahrheit['m3-e92-interlagos'][0],
    );
    expect(interlagos?.inserate).toHaveLength(2);
    expect(new Set(interlagos?.inserate.map((i) => i.plattformId)).size).toBe(2);
  });

  it('3b — verschiedene Fahrzeuge werden nicht zusammengeführt', () => {
    const alleIds = Object.values(start.wahrheit).flat();
    // Kein Fahrzeug trägt Inserate zweier verschiedener realer Autos.
    const zuordnung = new Map<string, string[]>();
    for (const [schluessel, ids] of Object.entries(start.wahrheit)) {
      for (const id of ids) {
        zuordnung.set(id, [...(zuordnung.get(id) ?? []), schluessel]);
      }
    }
    for (const [, schluessel] of zuordnung) {
      expect(schluessel).toHaveLength(1);
    }
    expect(alleIds.length).toBeGreaterThan(0);
  });

  it('3c — unsichere Fälle werden zur manuellen Prüfung markiert statt geraten', () => {
    // Der RS4 Avant steht ein zweites Mal bei einem anderen Händler, ohne VIN
    // und ohne gemeinsame Bilder. Die Engine darf hier nicht entscheiden.
    const grenzfaelle = start.laeufe.flatMap((l) => l.grenzfaelle);
    expect(grenzfaelle.length).toBeGreaterThan(0);
    for (const g of grenzfaelle) {
      expect(g.vergleich.score).toBeGreaterThanOrEqual(
        PARAMETER.identitaet.schwelleManuell,
      );
      expect(g.vergleich.score).toBeLessThan(PARAMETER.identitaet.schwelleAutomatisch);
      expect(g.vergleich.merkmale.length).toBeGreaterThan(5);
    }
  });

  it('4 — Änderungen an Preis, Kilometer und Beschreibung werden historisiert', () => {
    const mitHistorie = analysen.filter((a) => a.aenderungen.length > 0);
    expect(mitHistorie.length).toBeGreaterThan(5);

    const arten = new Set(analysen.flatMap((a) => a.aenderungen.map((x) => x.art)));
    expect(arten.has('preis')).toBe(true);
    expect(arten.has('kilometer')).toBe(true);
    expect(arten.has('text')).toBe(true);
  });

  it('5 — Zielmodelle lassen sich hinterlegen und greifen', () => {
    const auftraege = seedSuchauftraege();
    expect(auftraege.length).toBeGreaterThanOrEqual(3);
    expect(auftraege.every((a) => a.meldungAbRang)).toBe(true);
  });

  it('6 — es entsteht eine priorisierte Kandidatenliste', () => {
    for (let i = 1; i < analysen.length; i++) {
      expect(analysen[i - 1].gesamt.wert).toBeGreaterThanOrEqual(analysen[i].gesamt.wert);
    }
    const raenge = new Set(analysen.map((a) => a.gesamt.rang));
    // Eine Liste, die alles gleich einstuft, priorisiert nichts.
    expect(raenge.size).toBeGreaterThan(1);
  });

  it('7 — ein Kandidat ist vollständig bewertet, ohne dass Daten nachgeladen werden', () => {
    for (const a of analysen) {
      expect(a.integritaet.komponenten.length).toBe(10);
      expect(a.qualitaet.komponenten.length).toBe(13);
      expect(a.gesamt.anteile.length).toBe(5);
      expect(a.buySignal.bedingungen.length).toBe(6);
      expect(a.pruefpunkte.length).toBeGreaterThan(15);
      expect(a.anfragepunkte.length).toBeGreaterThan(8);
      expect(a.restauration.positionen.length).toBe(12);
    }
  });

  it('8 — A-Kandidaten sind eine kleine, begründete Auswahl', () => {
    const aKandidaten = analysen.filter((a) => a.gesamt.rang === 'A');
    expect(aKandidaten.length).toBeGreaterThan(0);
    expect(aKandidaten.length).toBeLessThanOrEqual(analysen.length / 3);
    for (const a of aKandidaten) {
      expect(a.redFlags.filter((f) => f.schweregrad === 'kritisch')).toHaveLength(0);
      expect(a.gesamt.begruendung.length).toBeGreaterThan(20);
    }
  });
});

describe('Historisierung und Revision', () => {
  it('speichert Beobachtungen, statt Werte zu überschreiben', () => {
    const mehrfach = start.bestand.inserate.filter((i) => i.beobachtungen.length > 1);
    expect(mehrfach.length).toBeGreaterThan(5);
    for (const inserat of mehrfach) {
      const zeiten = inserat.beobachtungen.map((b) => Date.parse(b.zeitpunkt));
      // chronologisch und ohne Dubletten
      for (let i = 1; i < zeiten.length; i++) {
        expect(zeiten[i]).toBeGreaterThan(zeiten[i - 1]);
      }
    }
  });

  it('behält entfernte Inserate samt Beobachtungen', () => {
    const entfernt = start.bestand.inserate.filter((i) => !i.aktiv);
    expect(entfernt.length).toBeGreaterThan(0);
    for (const i of entfernt) {
      expect(i.entferntAm).not.toBeNull();
      expect(i.beobachtungen.length).toBeGreaterThan(0);
    }
  });

  it('dokumentiert jede Systementscheidung im Audit Trail', () => {
    expect(start.bestand.audit.length).toBeGreaterThan(20);
    const identitaet = start.bestand.audit.filter(
      (e) => e.quelle === 'Vehicle Identity Engine',
    );
    expect(identitaet.length).toBe(start.bestand.inserate.length);
    for (const e of identitaet) {
      expect(e.systementscheidung).toBeTruthy();
    }
  });
});

describe('Red Flag Engine an echten Fällen (Abschnitt 23)', () => {
  it('erkennt den sinkenden Kilometerstand aus dem Beispiel in Abschnitt 11', () => {
    const fahrzeug = analysen.find(
      (a) => a.fahrzeugId === start.wahrheit['m3-e92-interlagos'][0],
    );
    const regeln = fahrzeug?.redFlags.map((f) => f.regel) ?? [];
    expect(regeln).toContain('kilometer-sinkt');
    // Die zurückgenommene Zusicherung ist der zweite Teil des Beispiels aus
    // Abschnitt 11: „unfallfrei" wird zu „Unfallfreiheit laut Vorbesitzer".
    expect(regeln).toContain('unfallangabe-verschwindet');
    const kritisch = fahrzeug?.redFlags.find((f) => f.regel === 'kilometer-sinkt');
    expect(kritisch?.schweregrad).toBe('kritisch');
    expect(kritisch?.empfehlung.length).toBeGreaterThan(20);
  });

  it('erkennt wiederverwendete Fotos und die widersprüchliche VIN', () => {
    const fahrzeug = analysen.find(
      (a) => a.fahrzeugId === start.wahrheit['m3-e92-auffaellig'][0],
    );
    const regeln = fahrzeug?.redFlags.map((f) => f.regel) ?? [];
    expect(regeln).toContain('fotos-wiederverwendet');
    expect(regeln).toContain('vin-hersteller');
    expect(regeln).toContain('preis-auffaellig-niedrig');
  });

  it('gibt jeder Feststellung Schweregrad, Begründung, Quelle, Zeitpunkt und Empfehlung', () => {
    for (const flag of analysen.flatMap((a) => a.redFlags)) {
      expect(flag.schweregrad).toBeTruthy();
      expect(flag.begruendung.length).toBeGreaterThan(15);
      expect(flag.quelle.length).toBeGreaterThan(3);
      expect(Number.isNaN(Date.parse(flag.zeitpunkt))).toBe(false);
      expect(flag.empfehlung.length).toBeGreaterThan(15);
    }
  });

  it('meldet für ein sauber dokumentiertes Fahrzeug keine kritische Feststellung', () => {
    const fahrzeug = analysen.find(
      (a) => a.fahrzeugId === start.wahrheit['m3-e92-mineralweiss'][0],
    );
    expect(fahrzeug?.redFlags.filter((f) => f.schweregrad === 'kritisch')).toHaveLength(0);
  });
});

describe('Bewertung im Zusammenspiel', () => {
  it('trennt Modellqualität von Exemplarqualität (Abschnitt 15)', () => {
    const gut = analysen.find(
      (a) => a.fahrzeugId === start.wahrheit['m3-e92-mineralweiss'][0],
    );
    const schlecht = analysen.find(
      (a) => a.fahrzeugId === start.wahrheit['m3-e92-auffaellig'][0],
    );

    // Dieselbe Baureihe, also praktisch derselbe Asset Score …
    expect(Math.abs((gut?.asset.score.wert ?? 0) - (schlecht?.asset.score.wert ?? 0))).toBeLessThan(
      6,
    );
    // … aber ein deutlich verschiedener Individual Vehicle Quality Score.
    expect(gut?.qualitaet.wert ?? 0).toBeGreaterThan((schlecht?.qualitaet.wert ?? 0) + 15);
  });

  it('belohnt Belege: dokumentiertes Fahrzeug hat den höheren Evidence Score', () => {
    const mitBelegen = analysen.find(
      (a) => a.fahrzeugId === start.wahrheit['porsche-996-gut'][0],
    );
    const ohneBelege = analysen.find(
      (a) => a.fahrzeugId === start.wahrheit['porsche-997-1'][0],
    );
    expect(mitBelegen?.evidenz.score.wert ?? 0).toBeGreaterThan(
      (ohneBelege?.evidenz.score.wert ?? 0) + 30,
    );
  });

  it('erzeugt für jedes Fahrzeug eine erklärbare Gesamtbewertung', () => {
    for (const a of analysen) {
      const summe = a.gesamt.anteile.reduce((s, x) => s + (x.punkte * x.gewicht) / 100, 0);
      const erwartet = Math.max(
        0,
        Math.round(summe / (a.gesamt.anteile.reduce((s, x) => s + x.gewicht, 0) / 100)) -
          a.gesamt.redFlagAbzug,
      );
      expect(Math.abs(a.gesamt.wert - erwartet)).toBeLessThanOrEqual(1);
    }
  });

  it('weist ein Buy Signal nur aus, wenn jede Bedingung erfüllt ist', () => {
    for (const a of analysen) {
      const alleErfuellt = a.buySignal.bedingungen.every((b) => b.erfuellt);
      expect(a.buySignal.ausgeloest).toBe(alleErfuellt);
    }
    expect(analysen.some((a) => a.buySignal.ausgeloest)).toBe(true);
  });
});

describe('Alert Engine (Abschnitt 27)', () => {
  it('meldet nicht inflationär und entprellt Wiederholungen', () => {
    const erster = erzeugeAlerts(analysen, seedSuchauftraege(), [], PARAMETER);
    expect(erster.neue.length).toBeGreaterThan(0);
    // Deutlich weniger Meldungen als Fahrzeuge mal Ereignisse.
    expect(erster.neue.length).toBeLessThan(analysen.length * 3);

    const zweiter = erzeugeAlerts(analysen, seedSuchauftraege(), erster.neue, PARAMETER);
    expect(zweiter.neue).toHaveLength(0);
    expect(zweiter.unterdrueckt).toBeGreaterThan(0);
  });

  it('meldet ein Buy Signal unabhängig vom Rang', () => {
    const lauf = erzeugeAlerts(analysen, [], [], PARAMETER);
    const buySignale = analysen.filter((a) => a.buySignal.ausgeloest);
    for (const a of buySignale) {
      expect(lauf.neue.some((x) => x.fahrzeugId === a.fahrzeugId && x.ausloeser === 'score-schwelle')).toBe(
        true,
      );
    }
  });
});

describe('Determinismus', () => {
  it('liefert bei gleichem Bestand exakt dieselbe Bewertung', () => {
    const nochmal = analysiereBestand(start.bestand.fahrzeuge, start.bestand.inserate, {
      plattformen: PLATTFORMEN,
      verkaeufer: start.bestand.verkaeufer,
      alleInserate: start.bestand.inserate,
      parameter: PARAMETER,
    });
    expect(nochmal.map((a) => `${a.fahrzeugId}:${a.gesamt.wert}`)).toEqual(
      analysen.map((a) => `${a.fahrzeugId}:${a.gesamt.wert}`),
    );
  });
});
