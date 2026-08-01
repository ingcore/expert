/**
 * Rückabgleich Text ↔ Anforderungsmatrix (PRD Abschnitt 8, Schicht 5).
 *
 * Umsetzung von LP-2: Kein Wert im Ausgabetext ohne Entsprechung in der
 * Matrix. Der Abgleich läuft maschinell und blockiert die Freigabe
 * (FR-5.1, FR-5.2).
 *
 * Das Verfahren entspricht dem Zweitmeinungs-Pass aus PRD 12.2, führt ihn
 * aber deterministisch aus: Alle Feuerwiderstandsklassen, Zahlenwerte und
 * Normstellen im Text werden extrahiert und gegen die Matrix geprüft. Jeder
 * Treffer ohne Entsprechung ist ein Halluzinationskandidat.
 */

import { findeAnforderung } from './engine';
import { BEKANNTE_NORMEN } from './regelwerk/normen';
import type { AnforderungsErgebnis, MatrixErgebnis } from './types';
import { quelleKurz } from './types';

/** Art eines Befunds des Rückabgleichs. */
export type BefundArt =
  | 'feuerwiderstand-ohne-deckung'
  | 'normstelle-ohne-deckung'
  | 'zahlenwert-ohne-deckung';

export interface RueckabgleichBefund {
  art: BefundArt;
  /** Der beanstandete Ausdruck aus dem Text. */
  fundstelle: string;
  /** Abschnitt des Dokuments, in dem er steht. */
  abschnitt: string;
  erlaeuterung: string;
}

export interface RueckabgleichErgebnis {
  befunde: RueckabgleichBefund[];
  /** Blockiert die Freigabe, sobald mindestens ein Befund vorliegt. */
  freigabeBlockiert: boolean;
  /** Anzahl geprüfter Abschnitte. */
  geprueft: number;
}

/** Ein zu prüfender Textabschnitt des Dokuments. */
export interface PruefAbschnitt {
  bezeichnung: string;
  text: string;
}

/* ==========================================================================
 * Muster
 * ======================================================================= */

/** Feuerwiderstandsklassen: R/E/I-Kombination mit Dauer, optional C/S/M. */
const RE_FEUERWIDERSTAND = /\b(?:REI|EI₂|EI2|EI|RE|R|E)\s?-?\s?(?:30|60|90|120|180)(?:\s?-\s?[CSM]\d?)?\b/g;

/** Normstellen: "OIB-RL 2, Pkt. 3.1.2", "TRVB S 123", "ÖNORM EN 13501-2". */
const RE_NORMSTELLE =
  /\b(?:OIB-(?:RL|Richtlinie)\s?\d(?:\.\d)?|TRVB\s?[A-Z]\s?\d{3}|ÖNORM(?:\s?EN)?(?:\s?ISO)?\s?[A-Z]?\s?\d{3,5}(?:-\d+)?|ÖVE\/ÖNORM\s?[A-Z]\s?\d{4}|AStV|ASchG|KennV)\b/g;

/**
 * Zahlenwerte mit brandschutzrelevanter Einheit.
 * Erfasst sowohl gruppierte Schreibweise („1.850 m²") als auch ungruppierte
 * („9999 l/min") — beide kommen in Konzepttexten vor.
 */
const RE_ZAHLENWERT =
  /\b(\d{1,3}(?:[.\s]\d{3})+(?:,\d+)?|\d+(?:,\d+)?)\s?(m²|m³|l\/min|LE|m)\b/g;

/* ==========================================================================
 * Deckungsmengen aus der Matrix
 * ======================================================================= */

/** Normalisiert eine Feuerwiderstandsklasse für den Vergleich. */
function normFw(s: string): string {
  return s.replace(/[\s₂]/g, (c) => (c === '₂' ? '2' : '')).toUpperCase();
}

/** Normalisiert eine Normbezeichnung für den Vergleich. */
function normNorm(s: string): string {
  return s.replace(/\s+/g, ' ').replace(/Richtlinie/i, 'RL').trim().toUpperCase();
}

/** Normalisiert eine Zahl im deutschen Format auf einen Zahlenwert. */
function normZahl(s: string): number {
  return Number(s.replace(/[.\s]/g, '').replace(',', '.'));
}

interface Deckung {
  feuerwiderstand: Set<string>;
  normstellen: Set<string>;
  zahlen: Set<number>;
}

/**
 * Sammelt alle Werte, die durch die Matrix gedeckt sind. Nur was hier
 * vorkommt, darf im Dokument stehen.
 */
function baueDeckung(matrix: MatrixErgebnis, zusatz: Deckung | null): Deckung {
  const d: Deckung = {
    feuerwiderstand: new Set(zusatz?.feuerwiderstand ?? []),
    normstellen: new Set(zusatz?.normstellen ?? []),
    zahlen: new Set(zusatz?.zahlen ?? []),
  };

  const nimmWert = (w: AnforderungsErgebnis['sollWert' | 'istWert']) => {
    if (w === null || w === undefined || typeof w === 'boolean') return;
    if (typeof w === 'number') {
      d.zahlen.add(w);
      // Gerundete Darstellung im Text ebenfalls decken.
      d.zahlen.add(Math.round(w));
      return;
    }
    const s = String(w);
    if (RE_FEUERWIDERSTAND.test(s)) d.feuerwiderstand.add(normFw(s));
    RE_FEUERWIDERSTAND.lastIndex = 0;
    const zahl = Number(s.replace(',', '.'));
    if (Number.isFinite(zahl)) d.zahlen.add(zahl);
  };

  // Der gepflegte Normenkatalog ist die Positivliste zulässiger Zitate.
  // Ein Verweis auf ein reales Regelwerk ist zulässig, auch wenn es nicht in
  // jeder einzelnen Anforderung vorkommt; erfundene Bezeichnungen fallen auf.
  for (const kuerzel of BEKANNTE_NORMEN) {
    d.normstellen.add(normNorm(kuerzel));
  }

  for (const e of matrix.ergebnisse) {
    nimmWert(e.sollWert);
    nimmWert(e.istWert);

    d.normstellen.add(normNorm(e.quelle.richtlinie));
    if (e.overlay) d.normstellen.add(normNorm(e.overlay.quelle.richtlinie));

    // In Begründung und Erläuterung zitierte Regelwerke gelten als gedeckt,
    // weil sie Bestandteil des geprüften Regeldatenbestands sind.
    const texte = [e.begruendung, e.overlay?.hinweis ?? ''];
    const anforderung = findeAnforderung(e.anforderungId);
    if (anforderung?.erlaeuterung) texte.push(anforderung.erlaeuterung);

    for (const text of texte) {
      for (const treffer of text.matchAll(RE_NORMSTELLE)) {
        d.normstellen.add(normNorm(treffer[0]));
      }
    }
  }

  return d;
}

/* ==========================================================================
 * Prüfung
 * ======================================================================= */

/**
 * Gleicht die Textabschnitte gegen die Matrix ab.
 *
 * `zusaetzlicheDeckung` erlaubt es, Werte freizugeben, die nicht aus der
 * Matrix stammen, aber belegt sind — etwa Bestandsmaße aus der Erhebung.
 * Jede solche Freigabe ist eine bewusste fachliche Entscheidung.
 */
export function fuehreRueckabgleichDurch(
  abschnitte: PruefAbschnitt[],
  matrix: MatrixErgebnis,
  zusaetzlicheDeckung?: {
    feuerwiderstand?: string[];
    normstellen?: string[];
    zahlen?: number[];
  },
): RueckabgleichErgebnis {
  const deckung = baueDeckung(matrix, {
    feuerwiderstand: new Set((zusaetzlicheDeckung?.feuerwiderstand ?? []).map(normFw)),
    normstellen: new Set((zusaetzlicheDeckung?.normstellen ?? []).map(normNorm)),
    zahlen: new Set(zusaetzlicheDeckung?.zahlen ?? []),
  });

  const befunde: RueckabgleichBefund[] = [];
  // Je Fundstelle nur einmal melden, sonst ertrinkt der Nutzer in Wiederholungen.
  const gesehen = new Set<string>();

  for (const abschnitt of abschnitte) {
    const text = abschnitt.text ?? '';
    if (!text.trim()) continue;

    for (const treffer of text.matchAll(RE_FEUERWIDERSTAND)) {
      const wert = normFw(treffer[0]);
      const schluessel = `fw:${wert}:${abschnitt.bezeichnung}`;
      if (deckung.feuerwiderstand.has(wert) || gesehen.has(schluessel)) continue;
      gesehen.add(schluessel);
      befunde.push({
        art: 'feuerwiderstand-ohne-deckung',
        fundstelle: treffer[0],
        abschnitt: abschnitt.bezeichnung,
        erlaeuterung:
          'Die Feuerwiderstandsklasse kommt im Text vor, hat aber keine Entsprechung in der Anforderungsmatrix. Entweder fehlt die zugehörige Anforderung oder der Wert ist unbelegt.',
      });
    }

    for (const treffer of text.matchAll(RE_NORMSTELLE)) {
      const wert = normNorm(treffer[0]);
      const schluessel = `norm:${wert}:${abschnitt.bezeichnung}`;
      if (deckung.normstellen.has(wert) || gesehen.has(schluessel)) continue;
      gesehen.add(schluessel);
      befunde.push({
        art: 'normstelle-ohne-deckung',
        fundstelle: treffer[0],
        abschnitt: abschnitt.bezeichnung,
        erlaeuterung:
          'Die zitierte Normstelle ist im geprüften Regeldatenbestand nicht hinterlegt. Zitat prüfen oder Regelwerk ergänzen.',
      });
    }

    for (const treffer of text.matchAll(RE_ZAHLENWERT)) {
      const zahl = normZahl(treffer[1]);
      const schluessel = `zahl:${zahl}${treffer[2]}:${abschnitt.bezeichnung}`;
      if (deckung.zahlen.has(zahl) || gesehen.has(schluessel)) continue;
      gesehen.add(schluessel);
      befunde.push({
        art: 'zahlenwert-ohne-deckung',
        fundstelle: `${treffer[1]} ${treffer[2]}`,
        abschnitt: abschnitt.bezeichnung,
        erlaeuterung:
          'Der Zahlenwert stammt nicht aus der Anforderungsmatrix. Wert aus der Engine übernehmen oder als erhobenen Bestandswert freigeben.',
      });
    }
  }

  return {
    befunde,
    freigabeBlockiert: befunde.length > 0,
    geprueft: abschnitte.filter((a) => a.text?.trim()).length,
  };
}

/** Kurzfassung der Matrixdeckung für das Prüfprotokoll. */
export function deckungsUebersicht(matrix: MatrixErgebnis): string[] {
  return matrix.ergebnisse
    .filter((e) => e.sollWert !== null)
    .map(
      (e) =>
        `${e.bezeichnung}: Soll ${e.sollWert}${e.einheit ? ` ${e.einheit}` : ''} — ${quelleKurz(e.quelle)}`,
    );
}
