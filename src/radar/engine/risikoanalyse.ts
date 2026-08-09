/**
 * Auswertung der technischen Knowledge Base für ein konkretes Fahrzeug —
 * PRD Abschnitt 20.
 *
 * Die Knowledge Base kennt Risiken je Modell. Diese Datei beantwortet für ein
 * einzelnes Fahrzeug drei Fragen:
 *
 *   1. Welche Risiken sind nach Laufleistung und Baujahr fällig?
 *   2. Welche davon behauptet das Inserat als erledigt?
 *   3. Welche davon sind durch eine Unterlage tatsächlich belegt?
 *
 * Der Unterschied zwischen 2 und 3 ist der eigentliche Ertrag. Aus den fälligen
 * und nicht belegten Risiken entsteht der Erwartungswert des offenen
 * Instandsetzungsbedarfs — die Zahl, die in Marktwert, Qualitätsscore und
 * Restaurationsrechnung eingeht.
 */

import type { Fahrzeugdokument, InseratDaten } from '../domain/types';
import {
  risikenFuer,
  SCHWERE_GEWICHT,
  WAHRSCHEINLICHKEIT_FAKTOR,
  type Modellrisiko,
} from '../wissen/risiken';

export interface Risikobefund {
  risiko: Modellrisiko;
  /** Nach Laufleistung bereits fällig. */
  faellig: boolean;
  /** Im Inseratstext als erledigt behauptet. */
  alsErledigtBehauptet: boolean;
  /** Durch eine hinterlegte Unterlage belegt. */
  belegtErledigt: boolean;
  /** Erwartungswert der offenen Kosten in Euro. */
  erwartungswert: number;
  bewertung: string;
}

export interface Risikoanalyse {
  befunde: Risikobefund[];
  /** Summe der Erwartungswerte aller offenen Risiken. */
  offenerBedarf: number;
  /** Summe der High Estimates aller offenen Risiken — der schlechte Fall. */
  offenerBedarfMaximal: number;
  /** Gewichtete Belastung 0–100; 0 = alles erledigt oder unkritisch. */
  belastung: number;
  kritischOffen: Risikobefund[];
}

export function analysiereRisiken(
  modellId: string | null,
  daten: InseratDaten,
  dokumente: Fahrzeugdokument[],
  baujahr: number | null,
): Risikoanalyse {
  const risiken = risikenFuer(modellId, baujahr, daten.kilometerstand, daten.getriebe);
  const text = [
    daten.beschreibung,
    daten.serviceangabe ?? '',
    daten.umbauten ?? '',
    daten.titel,
  ].join('\n');

  const befunde: Risikobefund[] = risiken.map((risiko) => {
    const faellig =
      risiko.relevantAbKm === null ||
      (daten.kilometerstand !== null && daten.kilometerstand >= risiko.relevantAbKm);

    const alsErledigtBehauptet = risiko.erledigtMuster.some((m) => m.test(text));

    const belegtErledigt = dokumente.some((d) => {
      if (!risiko.entkraeftetDurch.includes(d.art)) return false;
      const inhalt = [d.bezeichnung, ...d.extrahiert.leistungen].join(' ');
      return risiko.erledigtMuster.some((m) => m.test(inhalt));
    });

    // Erwartungswert: mittlere Kosten × Eintrittswahrscheinlichkeit. Eine
    // belegte Erledigung setzt ihn auf null, eine bloße Behauptung halbiert
    // ihn — sie ist ein Hinweis, kein Nachweis.
    const mittel = (risiko.kostenVon + risiko.kostenBis) / 2;
    const basis = mittel * WAHRSCHEINLICHKEIT_FAKTOR[risiko.wahrscheinlichkeit];
    const erwartungswert = belegtErledigt
      ? 0
      : Math.round((faellig ? basis : basis * 0.35) * (alsErledigtBehauptet ? 0.5 : 1));

    return {
      risiko,
      faellig,
      alsErledigtBehauptet,
      belegtErledigt,
      erwartungswert,
      bewertung: belegtErledigt
        ? 'Durch Unterlage als erledigt belegt.'
        : alsErledigtBehauptet
          ? 'Im Inserat als erledigt angegeben, aber nicht belegt — Beleg anfordern.'
          : faellig
            ? 'Nach Laufleistung fällig und weder erledigt noch belegt.'
            : 'Noch nicht fällig, aber bei der Haltedauer einzuplanen.',
    };
  });

  const offen = befunde.filter((b) => !b.belegtErledigt);
  const offenerBedarf = offen.reduce((s, b) => s + b.erwartungswert, 0);
  const offenerBedarfMaximal = offen
    .filter((b) => b.faellig)
    .reduce((s, b) => s + b.risiko.kostenBis, 0);

  const maximaleBelastung = befunde.reduce(
    (s, b) => s + SCHWERE_GEWICHT[b.risiko.schwere],
    0,
  );
  const tatsaechlicheBelastung = offen
    .filter((b) => b.faellig)
    .reduce(
      (s, b) => s + SCHWERE_GEWICHT[b.risiko.schwere] * (b.alsErledigtBehauptet ? 0.5 : 1),
      0,
    );

  return {
    befunde,
    offenerBedarf,
    offenerBedarfMaximal,
    belastung:
      maximaleBelastung === 0
        ? 0
        : Math.round((tatsaechlicheBelastung / maximaleBelastung) * 100),
    kritischOffen: offen.filter(
      (b) => b.faellig && b.risiko.schwere === 'kritisch' && !b.alsErledigtBehauptet,
    ),
  };
}
