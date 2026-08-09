/**
 * Gesamtbewertung, Kandidatenrang und INGTEC BUY SIGNAL — PRD Abschnitte 28
 * und 46.
 *
 * Das Buy Signal ist nach Abschnitt 28 „das höchste Systemsignal". Es entsteht
 * nicht aus einem Mittelwert, sondern aus **Mindestbedingungen, die alle
 * erfüllt sein müssen**. Der Unterschied ist entscheidend: Ein Mittelwert
 * erlaubt, eine kritische Schwäche durch Stärken anderswo auszugleichen. Genau
 * das darf beim teuersten Signal des Systems nicht passieren.
 *
 * Der Kandidatenrang ist die weichere Größe darüber: Er ordnet alle Fahrzeuge
 * in eine Reihenfolge, damit aus vielen Inseraten eine kleine Zahl prüfenswerter
 * Kandidaten wird (Abschnitt 3, Ziel fünf). Ein A-Kandidat ist noch kein Buy
 * Signal — er ist ein Fahrzeug, das die Prüfung lohnt.
 */

import type { Kandidatenrang } from '../domain/types';
import { begrenze } from '../domain/format';
import type { Marktbewertung } from './bewertung';
import { staerksteBeitraege, type Score } from './erklaerung';
import type { Systemparameter } from './gewichte';
import type { RedFlag } from './redflags';

/** Gewichte der Gesamtbewertung. */
export const GESAMT_GEWICHTE = {
  integritaet: 22,
  evidenz: 16,
  asset: 24,
  qualitaet: 26,
  preisvorteil: 12,
} as const;

export interface Gesamtbewertung {
  /** 0–100. */
  wert: number;
  rang: Kandidatenrang;
  anteile: { label: string; punkte: number; gewicht: number }[];
  /** Abzug durch Red Flags in Punkten. */
  redFlagAbzug: number;
  begruendung: string;
}

/**
 * Punkte für den Preisvorteil.
 *
 * Nicht linear und ausdrücklich nicht monoton: Ein Fahrzeug 10 % unter
 * Marktwert ist ein Fund, eines 40 % unter Marktwert ist ein Problem. Das ist
 * dieselbe Logik wie in der Preisplausibilität des Integrity Score und folgt
 * dem Produktversprechen aus Abschnitt 1 — nicht das billigste Fahrzeug.
 */
export function preisvorteilPunkte(abweichungProzent: number): number {
  if (abweichungProzent < -30) return 20;
  if (abweichungProzent < -18) return 55;
  if (abweichungProzent <= -8) return 95;
  if (abweichungProzent <= 0) return 85;
  if (abweichungProzent <= 8) return 65;
  if (abweichungProzent <= 18) return 42;
  return 20;
}

export function bewerteGesamt(
  integritaet: Score,
  evidenz: Score,
  asset: Score,
  qualitaet: Score,
  bewertung: Marktbewertung,
  redFlags: RedFlag[],
  parameter: Systemparameter,
): Gesamtbewertung {
  const preisPunkte =
    bewertung.fairValue > 0 ? preisvorteilPunkte(bewertung.abweichungProzent) : 40;

  const anteile = [
    { label: 'Offer Integrity', punkte: integritaet.wert, gewicht: GESAMT_GEWICHTE.integritaet },
    { label: 'Evidence', punkte: evidenz.wert, gewicht: GESAMT_GEWICHTE.evidenz },
    { label: 'Automotive Asset', punkte: asset.wert, gewicht: GESAMT_GEWICHTE.asset },
    { label: 'Individual Vehicle Quality', punkte: qualitaet.wert, gewicht: GESAMT_GEWICHTE.qualitaet },
    { label: 'Preisvorteil', punkte: preisPunkte, gewicht: GESAMT_GEWICHTE.preisvorteil },
  ];

  const gewichtSumme = anteile.reduce((s, a) => s + a.gewicht, 0);
  const basis = anteile.reduce((s, a) => s + a.punkte * a.gewicht, 0) / gewichtSumme;

  // Red Flags mindern die Gesamtbewertung zusätzlich zu ihrer Wirkung in den
  // Einzelscores — eine kritische Feststellung soll nicht wegmitteln.
  const abzug = redFlags.reduce((s, f) => {
    switch (f.schweregrad) {
      case 'kritisch':
        return s + 22;
      case 'hoch':
        return s + 9;
      case 'mittel':
        return s + 3;
      default:
        return s + 1;
    }
  }, 0);

  const wert = Math.round(begrenze(basis - abzug, 0, 100));
  const rang = bestimmeRang(wert, parameter);

  const staerkste = [...anteile].sort((a, b) => b.punkte - a.punkte);
  const begruendung =
    abzug > 0
      ? `${Math.round(basis)} Punkte aus den Einzelscores, abzüglich ${abzug} Punkte für ${redFlags.length} Red Flag(s). Stärkster Beitrag: ${staerkste[0].label} (${staerkste[0].punkte}), schwächster: ${staerkste[staerkste.length - 1].label} (${staerkste[staerkste.length - 1].punkte}).`
      : `${wert} Punkte aus den Einzelscores ohne Red-Flag-Abzug. Stärkster Beitrag: ${staerkste[0].label} (${staerkste[0].punkte}), schwächster: ${staerkste[staerkste.length - 1].label} (${staerkste[staerkste.length - 1].punkte}).`;

  return { wert, rang, anteile, redFlagAbzug: abzug, begruendung };
}

export function bestimmeRang(wert: number, parameter: Systemparameter): Kandidatenrang {
  if (wert >= parameter.rang.a) return 'A';
  if (wert >= parameter.rang.b) return 'B';
  if (wert >= parameter.rang.c) return 'C';
  return 'D';
}

/* ==========================================================================
 * Buy Signal
 * ======================================================================= */

export interface Buybedingung {
  schluessel: string;
  label: string;
  erfuellt: boolean;
  ist: string;
  soll: string;
}

export interface BuySignal {
  ausgeloest: boolean;
  bedingungen: Buybedingung[];
  /** Wesentliche Stärken nach Abschnitt 28. */
  staerken: string[];
  /** Wesentliche Risiken nach Abschnitt 28. */
  risiken: string[];
  /** Empfohlene nächste Handlung nach Abschnitt 28. */
  naechsteHandlung: string;
}

export function pruefeBuySignal(
  integritaet: Score,
  evidenz: Score,
  asset: Score,
  qualitaet: Score,
  bewertung: Marktbewertung,
  redFlags: RedFlag[],
  parameter: Systemparameter,
): BuySignal {
  const p = parameter.buySignal;
  const kritische = redFlags.filter((f) => f.schweregrad === 'kritisch');

  const bedingungen: Buybedingung[] = [
    {
      schluessel: 'integrity',
      label: 'Offer Integrity Score',
      erfuellt: integritaet.wert >= p.integrityMin,
      ist: String(integritaet.wert),
      soll: `≥ ${p.integrityMin}`,
    },
    {
      schluessel: 'evidence',
      label: 'Evidence Score',
      erfuellt: evidenz.wert >= p.evidenceMin,
      ist: String(evidenz.wert),
      soll: `≥ ${p.evidenceMin}`,
    },
    {
      schluessel: 'asset',
      label: 'Automotive Asset Score',
      erfuellt: asset.wert >= p.assetMin,
      ist: String(asset.wert),
      soll: `≥ ${p.assetMin}`,
    },
    {
      schluessel: 'qualitaet',
      label: 'Individual Vehicle Quality Score',
      erfuellt: qualitaet.wert >= p.qualitaetMin,
      ist: String(qualitaet.wert),
      soll: `≥ ${p.qualitaetMin}`,
    },
    {
      schluessel: 'preis',
      label: 'Preis höchstens Fair Value',
      erfuellt:
        bewertung.fairValue > 0 && bewertung.abweichungProzent <= p.preisabweichungMax,
      ist:
        bewertung.fairValue > 0
          ? `${bewertung.abweichungProzent >= 0 ? '+' : ''}${bewertung.abweichungProzent.toFixed(1)} %`
          : 'kein Marktwert bestimmbar',
      soll: `≤ ${p.preisabweichungMax} %`,
    },
    {
      schluessel: 'redflags',
      label: 'Keine kritische Red Flag',
      erfuellt: kritische.length <= p.kritischeRedFlagsErlaubt,
      ist: `${kritische.length} kritische Red Flag(s)`,
      soll: `≤ ${p.kritischeRedFlagsErlaubt}`,
    },
  ];

  const ausgeloest = bedingungen.every((b) => b.erfuellt);

  const staerken = [
    ...staerksteBeitraege(qualitaet, 3),
    ...staerksteBeitraege(asset, 2),
    ...staerksteBeitraege(evidenz, 2),
  ]
    .filter((b) => (b.delta ?? 0) > 0)
    .sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0))
    .slice(0, 5)
    .map((b) => b.text);

  const risiken = [
    ...redFlags.slice(0, 3).map((f) => `${f.titel}: ${f.begruendung}`),
    ...[
      ...staerksteBeitraege(qualitaet, 4),
      ...staerksteBeitraege(integritaet, 4),
    ]
      .filter((b) => (b.delta ?? 0) < 0)
      .sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0))
      .slice(0, 3)
      .map((b) => b.text),
  ];

  const offen = bedingungen.filter((b) => !b.erfuellt);
  const naechsteHandlung = ausgeloest
    ? 'Fahrzeug in die Watchlist übernehmen, Verkäuferanfrage freigeben und Besichtigung mit Hebebühne terminieren.'
    : kritische.length > 0
      ? `Vor jedem weiteren Schritt kritische Feststellung klären: ${kritische[0].titel}.`
      : offen.length === 1
        ? `Eine Bedingung offen — ${offen[0].label} (${offen[0].ist} statt ${offen[0].soll}). Gezielt nachfassen: ${empfehlungZu(offen[0].schluessel)}`
        : `${offen.length} Bedingungen offen. Nächster Schritt: ${empfehlungZu(offen[0].schluessel)}`;

  return { ausgeloest, bedingungen, staerken, risiken, naechsteHandlung };
}

function empfehlungZu(schluessel: string): string {
  switch (schluessel) {
    case 'evidence':
      return 'Unterlagen anfordern (Serviceheft, Rechnungen, Gutachten) — der Evidence Score steigt ausschließlich über Belege.';
    case 'integrity':
      return 'Fehlende Angaben beim Verkäufer erfragen; die Verkäuferanfrage enthält die offenen Punkte bereits.';
    case 'qualitaet':
      return 'Zustandsdetails und Bilder nachfordern, insbesondere Unterboden und Innenraum.';
    case 'preis':
      return 'Preisverhandlung auf Basis der ausgewiesenen Abweichung führen.';
    case 'asset':
      return 'Das Modell erreicht die geforderte Asset-Schwelle nicht — als Gebrauchtfahrzeug bewerten, nicht als Anlage.';
    default:
      return 'Offene Bedingung prüfen.';
  }
}
