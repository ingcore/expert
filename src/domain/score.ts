/**
 * SAFETY-SCORE nach CD Ausgabe 1.1, Kapitel 5: Teilscore je Berichtskapitel
 * und Gesamt-SAFETY-SCORE, jeweils Ist und Soll, Punkte 0–100 (mehr ist besser).
 *
 * Ist  = offene und in Umsetzung befindliche Mängel zum Prüfzeitpunkt.
 * Soll = davon nur die als verbleibend gekennzeichneten Abweichungen
 *        (keine Maßnahme, z. B. kompensierter Bestand).
 *
 * Punkte eines Teilkapitels (vorläufige Festlegung, bis die Bewertungsgrundlage
 * eine eigene Formel vorgibt): Die schlechteste Feststellung bestimmt die Stufe,
 * ihre Obergrenze ist der Ausgangswert; jeder weitere Risikoindexpunkt zieht
 * einen Punkt ab, nie unter die Untergrenze der Stufe.
 * Gesamt: Mittel der Teilscores, höchstens die Obergrenze der Stufe des
 * schlechtesten Teilkapitels.
 */

import { SCORE_GEWICHT } from './catalog';
import type { BerichtsKapitel, Massnahme, SafetyScore } from './types';

export const STUFEN: SafetyScore[] = ['A', 'B', 'C', 'D', 'E'];

/** Punktebereich je Stufe, beide Grenzen eingeschlossen. */
export const PUNKTE_BEREICH: Record<SafetyScore, { von: number; bis: number }> =
  {
    A: { von: 81, bis: 100 },
    B: { von: 61, bis: 80 },
    C: { von: 41, bis: 60 },
    D: { von: 21, bis: 40 },
    E: { von: 0, bis: 20 },
  };

/** Bewertete Kapitel des Berichts mit Titel. */
export const BERICHTS_KAPITEL: { value: BerichtsKapitel; label: string }[] = [
  { value: '5', label: 'Baulicher Brandschutz' },
  { value: '6', label: 'Flucht- und Rettungswege' },
  { value: '7', label: 'Löschhilfen und Löschwasserversorgung' },
  { value: '8', label: 'Anlagentechnischer Brandschutz' },
  { value: '9', label: 'Organisatorischer Brandschutz' },
];

export interface ScoreWert {
  punkte: number;
  stufe: SafetyScore;
}

export interface Teilscore {
  kapitel: BerichtsKapitel;
  /** Feststellungen zum Prüfzeitpunkt, nach lfd. Nr. */
  feststellungen: Massnahme[];
  /** Risikoindex: Summe der Gewichte der Ist-Feststellungen. */
  ri: number;
  ist: ScoreWert;
  soll: ScoreWert;
}

export interface Gesamtscore {
  ist: ScoreWert & { mittel: number };
  soll: ScoreWert & { mittel: number };
}

export function stufeAusPunkten(punkte: number): SafetyScore {
  return STUFEN.find((s) => punkte >= PUNKTE_BEREICH[s].von) ?? 'E';
}

function schlechteste(scores: SafetyScore[]): SafetyScore | null {
  let idx = -1;
  for (const s of scores) idx = Math.max(idx, STUFEN.indexOf(s));
  return idx < 0 ? null : STUFEN[idx];
}

/** Punkte einer Menge von Feststellungen (leer = A 100). */
export function punkteVon(
  feststellungen: Pick<Massnahme, 'score'>[],
): ScoreWert {
  const stufe = schlechteste(feststellungen.map((m) => m.score));
  if (!stufe) return { punkte: 100, stufe: 'A' };
  const ri = feststellungen.reduce((s, m) => s + SCORE_GEWICHT[m.score], 0);
  const { von, bis } = PUNKTE_BEREICH[stufe];
  const punkte = Math.max(von, bis - (ri - SCORE_GEWICHT[stufe]));
  return { punkte, stufe };
}

const istAktiv = (m: Massnahme) =>
  m.status === 'offen' || m.status === 'in-umsetzung';

/** Kapitelzuordnung eines Mangels; ältere Datensätze ohne Kapitel nach Art. */
export function kapitelVon(
  m: Pick<Massnahme, 'kapitel' | 'art'>,
): BerichtsKapitel {
  if (m.kapitel) return m.kapitel;
  return m.art === 't' ? '8' : m.art === 'o' || m.art === 'e' ? '9' : '5';
}

/** Berichtskapitel zum Kapitel eines Regelwerksbefunds (null = keine Zuordnung). */
export function kapitelAusBefund(kapitel: string): BerichtsKapitel | null {
  const zuordnung: Record<string, BerichtsKapitel> = {
    Gebäudedaten: '5',
    Brandabschnitte: '5',
    Bauteile: '5',
    Fluchtwege: '6',
    Löschhilfen: '7',
    Löschwasser: '7',
    Anlagentechnik: '8',
    Organisation: '9',
  };
  return zuordnung[kapitel] ?? null;
}

export function teilscore(
  massnahmen: Massnahme[],
  kapitel: BerichtsKapitel,
): Teilscore {
  const feststellungen = massnahmen
    .filter((m) => istAktiv(m) && kapitelVon(m) === kapitel)
    .sort((a, b) => a.lfdNr - b.lfdNr);
  return {
    kapitel,
    feststellungen,
    ri: feststellungen.reduce((s, m) => s + SCORE_GEWICHT[m.score], 0),
    ist: punkteVon(feststellungen),
    soll: punkteVon(feststellungen.filter((m) => m.verbleibend)),
  };
}

export function teilscores(massnahmen: Massnahme[]): Teilscore[] {
  return BERICHTS_KAPITEL.map((k) => teilscore(massnahmen, k.value));
}

function gesamtWert(werte: ScoreWert[]): ScoreWert & { mittel: number } {
  if (werte.length === 0) return { punkte: 100, stufe: 'A', mittel: 100 };
  const mittel = werte.reduce((s, w) => s + w.punkte, 0) / werte.length;
  const deckel =
    PUNKTE_BEREICH[schlechteste(werte.map((w) => w.stufe)) ?? 'A'].bis;
  const punkte = Math.min(Math.round(mittel), deckel);
  return { punkte, stufe: stufeAusPunkten(punkte), mittel };
}

export function gesamtscore(teile: Teilscore[]): Gesamtscore {
  return {
    ist: gesamtWert(teile.map((t) => t.ist)),
    soll: gesamtWert(teile.map((t) => t.soll)),
  };
}

/** „Ist D 34 · Soll B 79" bzw. „Ist = Soll A 100". */
export function istSollText(ist: ScoreWert, soll: ScoreWert): string {
  if (ist.punkte === soll.punkte)
    return `Ist = Soll ${ist.stufe} ${ist.punkte}`;
  return `Ist ${ist.stufe} ${ist.punkte} · Soll ${soll.stufe} ${soll.punkte}`;
}
