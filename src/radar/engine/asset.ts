/**
 * Automotive Asset Score — PRD Abschnitt 14.
 *
 * Der Score bewertet **das Modell**, nicht das Exemplar. Ein E92 M3 hat einen
 * Asset Score, den jedes Fahrzeug dieser Baureihe teilt; ob das konkrete
 * Fahrzeug etwas taugt, beantwortet der Individual Vehicle Quality Score
 * (Abschnitt 15). Genau diese Trennung nennt Abschnitt 15 als Beispiel: Asset
 * Score 90 bei Quality Score 52.
 *
 * Zwei der sechzehn Kriterien werden nicht aus dem Katalog übernommen, sondern
 * aus der beobachteten Marktreihe berechnet: die laufende Preisentwicklung und
 * die Marktliquidität. Sie sind messbar, und gemessene Werte schlagen
 * eingeschätzte. Alle übrigen Kriterien stammen aus dem Modellkatalog und sind
 * dort samt Begründung hinterlegt.
 */

import { begrenze } from '../domain/format';
import {
  baueScore,
  komponente,
  standardEinstufung,
  type Beitrag,
  type Score,
} from './erklaerung';
import type { AssetKriterium, Modelldefinition } from '../wissen/modelle';
import { ASSET_KRITERIUM_LABEL } from '../wissen/modelle';
import type { Momentumergebnis } from './momentum';
import type { Marktreihe } from '../wissen/marktdaten';
import { aktuellerMonat } from '../wissen/marktdaten';

export interface Assetergebnis {
  score: Score;
  /** Kriterien, die aus beobachteten Daten statt aus dem Katalog stammen. */
  gemesseneKriterien: AssetKriterium[];
}

export function bewerteAsset(
  modell: Modelldefinition | undefined,
  gewichte: Record<AssetKriterium, number>,
  momentum: Momentumergebnis | null,
  reihe: Marktreihe | undefined,
): Assetergebnis {
  if (!modell) {
    return {
      score: baueScore([], standardEinstufung, {
        datenbasis: 0,
        hinweise: [
          'Ohne Modellzuordnung lässt sich kein Asset Score bilden. Die Zuordnung ist manuell nachzuholen.',
        ],
      }),
      gemesseneKriterien: [],
    };
  }

  const gemessen: AssetKriterium[] = [];
  const komponenten = (Object.keys(gewichte) as AssetKriterium[]).map((kriterium) => {
    const katalogwert = modell.assetKriterien[kriterium];
    const beitraege: Beitrag[] = [];
    let wert = katalogwert;

    const begruendung = modell.assetBegruendung[kriterium];
    beitraege.push({
      text: begruendung ?? `Katalogbewertung des Modells: ${katalogwert} von 100.`,
      delta: null,
      quelle: 'Modellkatalog',
    });

    // Preisentwicklung: gemessen schlägt eingeschätzt.
    if (kriterium === 'preisentwicklung' && momentum) {
      const gemessenerWert = Math.round(
        begrenze(50 + momentum.kennzahlen.medianpreisProzent * 3.2, 0, 100),
      );
      const differenz = gemessenerWert - katalogwert;
      // Der Katalogwert bleibt sichtbar, der gemessene Wert setzt sich zur
      // Hälfte durch — er beruht auf zwölf Monaten, nicht auf einem Zyklus.
      wert = Math.round(katalogwert + differenz * 0.5);
      beitraege.push({
        text: `Beobachtete Medianpreisentwicklung: ${momentum.kennzahlen.medianpreisProzent >= 0 ? '+' : ''}${momentum.kennzahlen.medianpreisProzent.toFixed(1)} % in zwölf Monaten.`,
        delta: wert - katalogwert,
        quelle: 'Marktreihe',
      });
      gemessen.push(kriterium);
    }

    // Marktliquidität: aus Angebotsdichte und Standzeit der Reihe.
    if (kriterium === 'marktliquiditaet' && reihe) {
      const monat = aktuellerMonat(reihe);
      const gemessenerWert = Math.round(
        begrenze(
          begrenze(monat.angebote / 1.5, 0, 60) + begrenze(100 - monat.standzeitTage, 0, 40),
          0,
          100,
        ),
      );
      const differenz = gemessenerWert - katalogwert;
      wert = Math.round(katalogwert + differenz * 0.5);
      beitraege.push({
        text: `Beobachtet: ${monat.angebote} gleichzeitige Angebote bei ${monat.standzeitTage} Tagen mittlerer Standzeit.`,
        delta: wert - katalogwert,
        quelle: 'Marktreihe',
      });
      gemessen.push(kriterium);
    }

    return komponente(
      kriterium,
      ASSET_KRITERIUM_LABEL[kriterium],
      gewichte[kriterium],
      wert,
      beitraege.filter((b) => b.delta !== 0),
    );
  });

  const hinweise: string[] = [];
  if (!momentum) {
    hinweise.push(
      'Keine Marktreihe verfügbar — Preisentwicklung und Marktliquidität stammen aus dem Katalog statt aus Beobachtungen.',
    );
  }
  if (modell.produktionsmenge === null) {
    hinweise.push('Für dieses Modell liegt keine belastbare Produktionsmenge vor.');
  }

  return {
    score: baueScore(komponenten, assetEinstufung, {
      datenbasis: momentum ? 92 : 70,
      hinweise,
    }),
    gemesseneKriterien: gemessen,
  };
}

export function assetEinstufung(wert: number): string {
  if (wert >= 85) return 'etabliertes Sammlerfahrzeug';
  if (wert >= 75) return 'hohes Asset-Potenzial';
  if (wert >= 65) return 'Asset-Potenzial im Aufbau';
  if (wert >= 50) return 'Gebrauchtfahrzeug mit Perspektive';
  return 'kein Asset-Charakter erkennbar';
}
