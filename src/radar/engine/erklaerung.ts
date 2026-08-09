/**
 * Score-Grundlagen und Erklärbarkeit — PRD Abschnitte 38 und 39.
 *
 * Abschnitt 38 verbietet Scores, die ausschließlich aus undurchsichtigen
 * Modellen entstehen: Eingangsdaten, Gewichtung, Berechnung und Begründung
 * müssen darstellbar sein. Abschnitt 39 verlangt, dass jede Empfehlung die
 * Frage beantwortet, warum das System dieses Fahrzeug empfiehlt.
 *
 * Beides ist hier keine Darstellungsfrage, sondern die Datenstruktur selbst:
 * Ein Score **ist** die Liste seiner Beiträge. Der Zahlenwert entsteht aus
 * ihnen und kann gar nicht von ihnen abweichen — es gibt keinen zweiten Pfad,
 * auf dem er berechnet würde.
 *
 * Damit ist auch die Rollenverteilung aus Abschnitt 38 gewahrt: Sprach- und
 * Bildmodelle liefern Eingangsdaten (erkannte Formulierungen, Bildhinweise,
 * Dokumentklassifikation), die Bewertung selbst bleibt regelbasiert.
 */

import { begrenze } from '../domain/format';

/** Ein einzelner, benannter Einfluss auf einen Score. */
export interface Beitrag {
  text: string;
  /** Punktveränderung; `null` bei reinen Feststellungen ohne Wirkung. */
  delta: number | null;
  /** Woher die Information stammt — Inserat, Historie, Dokument, Nutzer. */
  quelle?: string;
}

export interface Scorekomponente {
  schluessel: string;
  label: string;
  /** Gewicht in Prozentpunkten des Gesamtscores. */
  gewicht: number;
  /** Ergebnis der Komponente, 0–100. */
  punkte: number;
  /** Beitrag zum Gesamtscore: `punkte × gewicht / 100`. */
  beitragGesamt: number;
  beitraege: Beitrag[];
}

export interface Score {
  /** 0–100. */
  wert: number;
  komponenten: Scorekomponente[];
  einstufung: string;
  /** Wie gut die Datenlage den Score trägt, 0–100. */
  datenbasis: number;
  /** Punkte, die den Score einschränken, ohne ihn rechnerisch zu verändern. */
  hinweise: string[];
}

/**
 * Baut eine Komponente aus einem Startwert und benannten Beiträgen.
 *
 * Der Startwert ist die neutrale Annahme, wenn nichts bekannt ist. Jeder
 * Beitrag verschiebt sie; das Ergebnis wird auf 0–100 begrenzt. Die
 * Begrenzung wird auf dem letzten Beitrag nicht verrechnet, sondern bleibt
 * als Differenz sichtbar — sonst würde die Erklärung nicht mehr zur Zahl passen.
 */
export function komponente(
  schluessel: string,
  label: string,
  gewicht: number,
  start: number,
  beitraege: Beitrag[],
): Scorekomponente {
  const roh = beitraege.reduce((summe, b) => summe + (b.delta ?? 0), start);
  const punkte = Math.round(begrenze(roh, 0, 100));
  const liste = [...beitraege];
  if (Math.abs(roh - punkte) > 0.5) {
    liste.push({
      text:
        roh > punkte
          ? `Auf 100 Punkte begrenzt (rechnerisch ${Math.round(roh)}).`
          : `Auf 0 Punkte begrenzt (rechnerisch ${Math.round(roh)}).`,
      delta: null,
    });
  }
  return {
    schluessel,
    label,
    gewicht,
    punkte,
    beitragGesamt: Math.round(((punkte * gewicht) / 100) * 10) / 10,
    beitraege: liste,
  };
}

/**
 * Setzt die Komponenten zu einem Score zusammen.
 *
 * Die Gewichte werden auf 100 normiert. Das ist wichtig, weil die Gewichte
 * administrativ änderbar sind (Abschnitt 37) und sonst eine unbedachte
 * Änderung stillschweigend die Skala verschieben würde.
 */
export function baueScore(
  komponenten: Scorekomponente[],
  einstufen: (wert: number) => string,
  optionen: { datenbasis?: number; hinweise?: string[] } = {},
): Score {
  const gewichtSumme = komponenten.reduce((s, k) => s + k.gewicht, 0);
  const wert =
    gewichtSumme === 0
      ? 0
      : Math.round(
          komponenten.reduce((s, k) => s + k.punkte * k.gewicht, 0) / gewichtSumme,
        );

  return {
    wert,
    komponenten,
    einstufung: einstufen(wert),
    datenbasis: Math.round(begrenze(optionen.datenbasis ?? 100, 0, 100)),
    hinweise: optionen.hinweise ?? [],
  };
}

/**
 * Die stärksten Einflüsse eines Scores — Grundlage der Antwort auf
 * „Warum empfiehlt mir das System dieses Fahrzeug?" (Abschnitt 39).
 */
export function staerksteBeitraege(score: Score, anzahl = 6): Beitrag[] {
  return score.komponenten
    .flatMap((k) =>
      k.beitraege
        .filter((b) => b.delta !== null && Math.abs(b.delta) >= 1)
        .map((b) => ({
          ...b,
          // Auf den Gesamtscore umgerechnet, sonst wären Beiträge aus stark und
          // schwach gewichteten Komponenten nicht vergleichbar.
          delta: Math.round(((b.delta as number) * k.gewicht) / 100),
          quelle: b.quelle ?? k.label,
        })),
    )
    .filter((b) => b.delta !== 0)
    .sort((a, b) => Math.abs(b.delta as number) - Math.abs(a.delta as number))
    .slice(0, anzahl);
}

/** Übliche Einstufung für Scores von 0 bis 100. */
export function standardEinstufung(wert: number): string {
  if (wert >= 90) return 'außergewöhnlich';
  if (wert >= 80) return 'hoch';
  if (wert >= 70) return 'grundsätzlich gut';
  if (wert >= 60) return 'erhöhte Prüfung erforderlich';
  if (wert >= 40) return 'erhebliche Auffälligkeiten';
  return 'hohes Risiko';
}

/** Einstufung des Offer Integrity Score nach PRD Abschnitt 12. */
export function integritaetEinstufung(wert: number): string {
  if (wert >= 90) return 'außergewöhnlich transparent';
  if (wert >= 80) return 'hohe Transparenz';
  if (wert >= 70) return 'grundsätzlich plausibel';
  if (wert >= 60) return 'erhöhte Prüfung erforderlich';
  if (wert >= 40) return 'erhebliche Auffälligkeiten';
  return 'hohes Informationsrisiko';
}

/** Ampelstufe eines Scores für die Oberfläche — nie das einzige Merkmal. */
export type Scorestufe = 'gut' | 'mittel' | 'schwach' | 'kritisch';

export function scorestufe(wert: number): Scorestufe {
  if (wert >= 80) return 'gut';
  if (wert >= 65) return 'mittel';
  if (wert >= 45) return 'schwach';
  return 'kritisch';
}
