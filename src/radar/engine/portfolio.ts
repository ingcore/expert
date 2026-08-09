/**
 * Portfolioverwaltung — PRD Abschnitt 25.
 *
 * Aus Kaufdaten, laufenden Kosten und Marktwert entstehen Total Cost of
 * Ownership, realisiertes und unrealisiertes Ergebnis, jährliche
 * Wertentwicklung und interner Zinsfuß.
 *
 * Zum IRR eine Anmerkung, weil er gern falsch gerechnet wird: Ein
 * Sammlerfahrzeug erzeugt über die Haltedauer ausschließlich Auszahlungen
 * (Service, Versicherung, Restaurierung) und genau eine Einzahlung — den
 * Verkauf oder, solange nicht verkauft, den aktuellen Marktwert. Die
 * Zahlungen fallen unregelmäßig an. Deshalb wird hier ein IRR über exakte
 * Zahlungstermine gerechnet (Methode XIRR) und nicht über gleich lange
 * Perioden; der Unterschied liegt bei mehrjährigen Haltedauern schnell im
 * Bereich eines Prozentpunktes.
 */

import type { Portfoliofahrzeug } from '../domain/types';
import { STICHTAG } from '../domain/format';

export interface Zahlung {
  datum: string;
  /** Negativ = Auszahlung, positiv = Einzahlung. */
  betrag: number;
  bezeichnung: string;
}

export interface Fahrzeugkennzahlen {
  fahrzeug: Portfoliofahrzeug;
  /** Anschaffung inklusive Nebenkosten. */
  anschaffung: number;
  laufendeKosten: number;
  /** Total Cost of Ownership: Anschaffung plus alle laufenden Kosten. */
  tco: number;
  /** Aktueller Wert: Verkaufspreis, sonst Marktwert. */
  aktuellerWert: number;
  verkauft: boolean;
  /** Ergebnis vor Verkauf. */
  unrealisiert: number;
  /** Ergebnis nach Verkauf. */
  realisiert: number;
  haltedauerJahre: number;
  /** Jährliche Wertentwicklung des reinen Fahrzeugwertes. */
  wertentwicklungProJahr: number;
  /** Interner Zinsfuß über alle Zahlungen, `null` wenn nicht bestimmbar. */
  irr: number | null;
  zahlungen: Zahlung[];
}

export interface Portfoliokennzahlen {
  fahrzeuge: Fahrzeugkennzahlen[];
  anzahl: number;
  imBestand: number;
  gesamtAnschaffung: number;
  gesamtLaufendeKosten: number;
  gesamtTco: number;
  gesamtwert: number;
  unrealisiert: number;
  realisiert: number;
  /** IRR über alle Zahlungen des gesamten Portfolios. */
  portfolioIrr: number | null;
}

/**
 * Interner Zinsfuß über exakte Zahlungstermine.
 *
 * Bewusst per Bisektion statt Newton-Verfahren: Newton konvergiert bei
 * Zahlungsreihen mit einem einzigen Vorzeichenwechsel schneller, kann aber bei
 * ungünstigen Startwerten divergieren. Bisektion ist langsamer und findet die
 * Lösung immer, solange sie im Suchintervall liegt — bei zwei Dutzend
 * Zahlungen ist die Rechenzeit ohne Bedeutung, ein falsches Ergebnis nicht.
 */
export function xirr(
  zahlungen: Zahlung[],
  untergrenze = -0.95,
  obergrenze = 10,
): number | null {
  if (zahlungen.length < 2) return null;
  const positiv = zahlungen.some((z) => z.betrag > 0);
  const negativ = zahlungen.some((z) => z.betrag < 0);
  if (!positiv || !negativ) return null;

  const t0 = Date.parse(zahlungen[0].datum);
  const barwert = (rate: number): number =>
    zahlungen.reduce((summe, z) => {
      const jahre = (Date.parse(z.datum) - t0) / (365.25 * 86_400_000);
      return summe + z.betrag / Math.pow(1 + rate, jahre);
    }, 0);

  let unten = untergrenze;
  let oben = obergrenze;
  let fUnten = barwert(unten);
  let fOben = barwert(oben);
  if (fUnten * fOben > 0) return null;

  for (let i = 0; i < 200; i++) {
    const mitte = (unten + oben) / 2;
    const fMitte = barwert(mitte);
    if (Math.abs(fMitte) < 1e-7 || oben - unten < 1e-9) return mitte;
    if (fUnten * fMitte < 0) {
      oben = mitte;
      fOben = fMitte;
    } else {
      unten = mitte;
      fUnten = fMitte;
    }
  }
  return (unten + oben) / 2;
}

export function zahlungsreihe(
  fahrzeug: Portfoliofahrzeug,
  stichtag = STICHTAG,
): Zahlung[] {
  const zahlungen: Zahlung[] = [
    {
      datum: fahrzeug.kaufdatum,
      betrag: -(fahrzeug.kaufpreis + fahrzeug.nebenkosten),
      bezeichnung: 'Anschaffung inklusive Nebenkosten',
    },
    ...fahrzeug.transaktionen.map((t) => ({
      datum: t.datum,
      betrag: -t.betrag,
      bezeichnung: t.bezeichnung,
    })),
  ];

  if (fahrzeug.verkauf) {
    zahlungen.push({
      datum: fahrzeug.verkauf.datum,
      betrag: fahrzeug.verkauf.preis,
      bezeichnung: 'Verkaufserlös',
    });
  } else {
    zahlungen.push({
      datum: stichtag.slice(0, 10),
      betrag: fahrzeug.marktwertAktuell,
      bezeichnung: 'Aktueller Marktwert (rechnerischer Abschluss)',
    });
  }

  return zahlungen.sort((a, b) => Date.parse(a.datum) - Date.parse(b.datum));
}

export function berechneFahrzeug(
  fahrzeug: Portfoliofahrzeug,
  stichtag = STICHTAG,
): Fahrzeugkennzahlen {
  const anschaffung = fahrzeug.kaufpreis + fahrzeug.nebenkosten;
  const laufendeKosten = fahrzeug.transaktionen.reduce((s, t) => s + t.betrag, 0);
  const tco = anschaffung + laufendeKosten;
  const aktuellerWert = fahrzeug.verkauf ? fahrzeug.verkauf.preis : fahrzeug.marktwertAktuell;
  const ende = fahrzeug.verkauf ? fahrzeug.verkauf.datum : stichtag;
  const haltedauerJahre = Math.max(
    0.01,
    (Date.parse(ende) - Date.parse(fahrzeug.kaufdatum)) / (365.25 * 86_400_000),
  );

  const zahlungen = zahlungsreihe(fahrzeug, stichtag);

  return {
    fahrzeug,
    anschaffung,
    laufendeKosten,
    tco,
    aktuellerWert,
    verkauft: fahrzeug.verkauf !== null,
    unrealisiert: fahrzeug.verkauf ? 0 : aktuellerWert - tco,
    realisiert: fahrzeug.verkauf ? aktuellerWert - tco : 0,
    haltedauerJahre,
    wertentwicklungProJahr:
      fahrzeug.kaufpreis > 0
        ? (Math.pow(aktuellerWert / fahrzeug.kaufpreis, 1 / haltedauerJahre) - 1) * 100
        : 0,
    irr: xirr(zahlungen),
    zahlungen,
  };
}

export function berechnePortfolio(
  fahrzeuge: Portfoliofahrzeug[],
  stichtag = STICHTAG,
): Portfoliokennzahlen {
  const einzeln = fahrzeuge.map((f) => berechneFahrzeug(f, stichtag));

  const alleZahlungen = einzeln
    .flatMap((f) => f.zahlungen)
    .sort((a, b) => Date.parse(a.datum) - Date.parse(b.datum));

  return {
    fahrzeuge: einzeln,
    anzahl: einzeln.length,
    imBestand: einzeln.filter((f) => !f.verkauft).length,
    gesamtAnschaffung: einzeln.reduce((s, f) => s + f.anschaffung, 0),
    gesamtLaufendeKosten: einzeln.reduce((s, f) => s + f.laufendeKosten, 0),
    gesamtTco: einzeln.reduce((s, f) => s + f.tco, 0),
    gesamtwert: einzeln.filter((f) => !f.verkauft).reduce((s, f) => s + f.aktuellerWert, 0),
    unrealisiert: einzeln.reduce((s, f) => s + f.unrealisiert, 0),
    realisiert: einzeln.reduce((s, f) => s + f.realisiert, 0),
    portfolioIrr: xirr(alleZahlungen),
  };
}
