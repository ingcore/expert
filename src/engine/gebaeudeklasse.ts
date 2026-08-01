/**
 * Deterministische Ermittlung der Gebäudeklasse nach OIB-Richtlinie 2,
 * Punkt 1 (FR-2.1).
 *
 * Die Gebäudeklasse wird berechnet und nie eingegeben — sie steuert nahezu
 * alle baulichen Anforderungen. Jeder Ableitungsschritt wird protokolliert,
 * damit der Weg im UI nachvollziehbar dargestellt werden kann (FR-2.9).
 *
 * Reichen die Eingaben nicht aus, liefert die Funktion `klasse: null` samt
 * der fehlenden Felder — es wird bewusst nicht geraten (FR-2.8).
 */

import type {
  AbleitungsSchritt,
  GebaeudeklassenErgebnis,
  Quellenverweis,
} from './types';

/** Eingaben, aus denen sich die Gebäudeklasse ableitet. */
export interface GebaeudeklassenEingabe {
  /** Fußbodenoberkante des obersten Geschoßes in Metern. */
  fluchtniveau: number | null;
  geschosseOberirdisch: number | null;
  /** Anzahl der Wohnungen bzw. Betriebseinheiten. */
  nutzungseinheitenAnzahl: number | null;
  /** Größte Fläche einer einzelnen Nutzungseinheit in m². */
  groessteEinheitFlaeche: number | null;
  /** Freistehend im Sinne der OIB-Begriffsbestimmungen. */
  freistehend: boolean | null;
}

const Q = (punkt: string, zeile?: string): Quellenverweis => ({
  richtlinie: 'OIB-RL 2',
  ausgabe: '2023-05',
  punkt,
  zeile,
});

/** Lesbare Beschriftungen für die Meldung fehlender Angaben. */
const FELD_LABEL: Record<keyof GebaeudeklassenEingabe, string> = {
  fluchtniveau: 'Fluchtniveau',
  geschosseOberirdisch: 'Anzahl oberirdischer Geschoße',
  nutzungseinheitenAnzahl: 'Anzahl der Nutzungseinheiten',
  groessteEinheitFlaeche: 'Größte Fläche einer Nutzungseinheit',
  freistehend: 'Freistehend ja/nein',
};

export function ermittleGebaeudeklasse(
  e: GebaeudeklassenEingabe,
): GebaeudeklassenErgebnis {
  const schritte: AbleitungsSchritt[] = [];
  const hinweise: string[] = [];
  const fehlend: string[] = [];

  // Für jede Ableitung zwingend erforderlich.
  if (e.fluchtniveau === null) fehlend.push(FELD_LABEL.fluchtniveau);
  if (e.geschosseOberirdisch === null) fehlend.push(FELD_LABEL.geschosseOberirdisch);

  if (fehlend.length > 0) {
    return { klasse: null, schritte, fehlendeAngaben: fehlend, hinweise };
  }

  const niveau = e.fluchtniveau as number;
  const geschosse = e.geschosseOberirdisch as number;
  let nr = 1;

  schritte.push({
    nr: nr++,
    frage: 'Wie hoch liegt das Fluchtniveau?',
    wert: `${niveau.toLocaleString('de-AT', { maximumFractionDigits: 2 })} m`,
    ergebnis:
      niveau > 11
        ? 'über 11 m — führt unmittelbar zu Gebäudeklasse 5'
        : niveau > 7
          ? 'über 7 m und höchstens 11 m — Gebäudeklasse 4 oder 5'
          : 'höchstens 7 m — Gebäudeklasse 1 bis 3 möglich',
    quelle: Q('1', 'Begriffsbestimmung Fluchtniveau'),
  });

  // --- Gebäudeklasse 5 ---------------------------------------------------
  if (niveau > 11) {
    schritte.push({
      nr: nr++,
      frage: 'Welche Gebäudeklasse ergibt sich daraus?',
      wert: 'GK5',
      ergebnis: 'Fluchtniveau über 11 m',
      quelle: Q('1', 'Begriffsbestimmung Gebäudeklasse 5'),
    });
    if (niveau > 22) {
      hinweise.push(
        'Fluchtniveau über 22 m: Das Gebäude gilt als Hochhaus, zusätzlich ist OIB-Richtlinie 2.3 anzuwenden.',
      );
    }
    return { klasse: 'GK5', schritte, fehlendeAngaben: [], hinweise };
  }

  // Ein Fluchtniveau über 7 m schließt GK1 bis GK3 bereits aus. Der Schritt
  // muss das mitteilen, sonst widerspricht er dem Endergebnis.
  const niveauErzwingtGk4 = niveau > 7;

  schritte.push({
    nr: nr++,
    frage: 'Wie viele oberirdische Geschoße hat das Gebäude?',
    wert: String(geschosse),
    ergebnis:
      geschosse > 4
        ? 'mehr als vier — Gebäudeklasse 5'
        : geschosse === 4
          ? 'vier — Gebäudeklasse 4'
          : niveauErzwingtGk4
            ? 'höchstens drei, das Fluchtniveau über 7 m schließt die Gebäudeklassen 1 bis 3 jedoch aus'
            : 'höchstens drei — Gebäudeklasse 1 bis 3 möglich',
    quelle: Q('1', 'Begriffsbestimmung Geschoßanzahl'),
  });

  if (geschosse > 4) {
    schritte.push({
      nr: nr++,
      frage: 'Welche Gebäudeklasse ergibt sich daraus?',
      wert: 'GK5',
      ergebnis: 'mehr als vier oberirdische Geschoße',
      quelle: Q('1', 'Begriffsbestimmung Gebäudeklasse 5'),
    });
    return { klasse: 'GK5', schritte, fehlendeAngaben: [], hinweise };
  }

  // --- Gebäudeklasse 4 ---------------------------------------------------
  if (niveauErzwingtGk4 || geschosse === 4) {
    schritte.push({
      nr: nr++,
      frage: 'Welche Gebäudeklasse ergibt sich daraus?',
      wert: 'GK4',
      ergebnis: niveauErzwingtGk4
        ? 'Fluchtniveau über 7 m und höchstens 11 m'
        : 'vier oberirdische Geschoße',
      quelle: Q('1', 'Begriffsbestimmung Gebäudeklasse 4'),
    });
    return { klasse: 'GK4', schritte, fehlendeAngaben: [], hinweise };
  }

  // --- Gebäudeklassen 1 bis 3 --------------------------------------------
  // Ab hier braucht es die Angaben zu Einheiten und Freistehung.
  if (e.nutzungseinheitenAnzahl === null) fehlend.push(FELD_LABEL.nutzungseinheitenAnzahl);
  if (e.freistehend === null) fehlend.push(FELD_LABEL.freistehend);
  if (e.groessteEinheitFlaeche === null)
    fehlend.push(FELD_LABEL.groessteEinheitFlaeche);

  if (fehlend.length > 0) {
    hinweise.push(
      'Bis höchstens drei Geschoße und 7 m Fluchtniveau entscheidet die Anzahl und Größe der Nutzungseinheiten über die Einstufung in GK1, GK2 oder GK3.',
    );
    return { klasse: null, schritte, fehlendeAngaben: fehlend, hinweise };
  }

  const einheiten = e.nutzungseinheitenAnzahl as number;
  const flaeche = e.groessteEinheitFlaeche as number;
  const freistehend = e.freistehend as boolean;

  schritte.push({
    nr: nr++,
    frage: 'Ist das Gebäude freistehend?',
    wert: freistehend ? 'ja' : 'nein',
    ergebnis: freistehend
      ? 'freistehend — Gebäudeklasse 1 möglich'
      : 'nicht freistehend — Gebäudeklasse 1 ausgeschlossen',
    quelle: Q('1', 'Begriffsbestimmung freistehendes Gebäude'),
  });

  schritte.push({
    nr: nr++,
    frage: 'Wie viele Wohnungen bzw. Betriebseinheiten sind vorhanden?',
    wert: String(einheiten),
    ergebnis:
      einheiten <= 2
        ? 'höchstens zwei'
        : einheiten <= 5
          ? 'drei bis fünf'
          : 'mehr als fünf — Gebäudeklasse 3',
    quelle: Q('1', 'Begriffsbestimmung Gebäudeklassen 1 und 2'),
  });

  schritte.push({
    nr: nr++,
    frage: 'Wie groß ist die größte Nutzungseinheit?',
    wert: `${flaeche.toLocaleString('de-AT')} m²`,
    ergebnis:
      flaeche <= 400
        ? 'höchstens 400 m²'
        : 'über 400 m² — Gebäudeklasse 1 und 2 ausgeschlossen',
    quelle: Q('1', 'Begriffsbestimmung Gebäudeklassen 1 und 2'),
  });

  const abschluss = (klasse: 'GK1' | 'GK2' | 'GK3', ergebnis: string) => {
    schritte.push({
      nr: nr++,
      frage: 'Welche Gebäudeklasse ergibt sich daraus?',
      wert: klasse,
      ergebnis,
      quelle: Q('1', `Begriffsbestimmung Gebäudeklasse ${klasse.slice(-1)}`),
    });
    return { klasse, schritte, fehlendeAngaben: [], hinweise };
  };

  if (freistehend && einheiten <= 2 && flaeche <= 400) {
    return abschluss(
      'GK1',
      'freistehend, höchstens zwei Einheiten mit je höchstens 400 m²',
    );
  }

  if (einheiten <= 5 && flaeche <= 400) {
    return abschluss(
      'GK2',
      'höchstens fünf Einheiten mit je höchstens 400 m²',
    );
  }

  return abschluss(
    'GK3',
    'mehr als fünf Einheiten oder eine Einheit über 400 m²',
  );
}
