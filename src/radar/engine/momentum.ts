/**
 * Market Momentum Score — PRD Abschnitt 18.
 *
 * Der Score sucht nicht die Modelle, die teuer sind, sondern die, deren Markt
 * gerade beginnt anzuziehen. Das ist eine andere Frage, und sie wird aus der
 * Bewegung der Zeitreihe beantwortet, nicht aus ihrem Niveau:
 *
 *   sinkende Angebotsmenge · steigende Medianpreise · kürzere Standzeiten ·
 *   mehr Abgänge als Zugänge · stärker steigende Preise guter Exemplare ·
 *   wachsende Spreizung zwischen Durchschnitt und Bestzustand
 *
 * Die letzte Größe ist die aussagekräftigste und wird am häufigsten übersehen:
 * Wenn der Abstand zwischen einem durchschnittlichen und einem perfekten
 * Exemplar wächst, beginnt der Markt Qualität zu bezahlen — der zuverlässigste
 * Frühindikator für den Übergang vom Gebrauchtwagen zum Sammlerfahrzeug.
 */

import { begrenze } from '../domain/format';
import { komponente, baueScore, type Score } from './erklaerung';
import type { MomentumKomponente } from './gewichte';
import { MOMENTUM_LABEL } from './gewichte';
import { aktuellerMonat, monatVor, type Marktreihe } from '../wissen/marktdaten';

/** Wie viele Monate zurück verglichen wird. */
const FENSTER = 12;

/** Prozentuale Veränderung, auf ±100 begrenzt. */
function veraenderung(neu: number, alt: number): number {
  if (alt === 0) return 0;
  return begrenze(((neu - alt) / alt) * 100, -100, 100);
}

/**
 * Bildet eine Veränderung auf eine Punktzahl ab.
 *
 * `richtung` = 1 bedeutet: Anstieg ist ein positives Signal (Preise).
 * `richtung` = -1 bedeutet: Rückgang ist positiv (Angebotsmenge, Standzeit).
 * `spanne` ist die Veränderung in Prozent, die 50 Punkte über neutral bringt.
 */
function punkte(veraenderungProzent: number, richtung: 1 | -1, spanne: number): number {
  return begrenze(50 + ((veraenderungProzent * richtung) / spanne) * 50, 0, 100);
}

export interface Momentumergebnis {
  score: Score;
  /** Prozentuale Veränderungen im Betrachtungsfenster. */
  kennzahlen: {
    angebotsmengeProzent: number;
    medianpreisProzent: number;
    standzeitProzent: number;
    spitzenpreisProzent: number;
    spreizungAlt: number;
    spreizungNeu: number;
    abgangsUeberschuss: number;
  };
  /** Markttrend als Faktor für die Marktwertrechnung, ±5 %. */
  trendProzent: number;
  einordnung: string;
}

export function momentum(
  reihe: Marktreihe,
  gewichte: Record<MomentumKomponente, number>,
): Momentumergebnis {
  const jetzt = aktuellerMonat(reihe);
  const damals = monatVor(reihe, FENSTER);

  const angebotsmengeProzent = veraenderung(jetzt.angebote, damals.angebote);
  const medianpreisProzent = veraenderung(jetzt.medianPreis, damals.medianPreis);
  const standzeitProzent = veraenderung(jetzt.standzeitTage, damals.standzeitTage);
  const spitzenpreisProzent = veraenderung(jetzt.spitzenPreis, damals.spitzenPreis);

  const spreizungAlt = damals.spitzenPreis / damals.medianPreis;
  const spreizungNeu = jetzt.spitzenPreis / jetzt.medianPreis;
  const spreizungProzent = veraenderung(spreizungNeu, spreizungAlt);

  // Abgangsüberschuss der letzten sechs Monate: Verschwinden mehr Angebote als
  // neue hinzukommen, schrumpft der verfügbare Bestand.
  const letzte = reihe.monate.slice(-6);
  const zugaenge = letzte.reduce((s, m) => s + m.neueEintraege, 0);
  const abgaenge = letzte.reduce((s, m) => s + m.verschwundeneAngebote, 0);
  const abgangsUeberschuss = zugaenge === 0 ? 0 : ((abgaenge - zugaenge) / zugaenge) * 100;

  const komponenten = [
    komponente(
      'angebotsmenge',
      MOMENTUM_LABEL.angebotsmenge,
      gewichte.angebotsmenge,
      punkte(angebotsmengeProzent, -1, 20),
      [
        {
          text: `Angebotsmenge ${angebotsmengeProzent >= 0 ? 'gestiegen' : 'gesunken'} um ${Math.abs(angebotsmengeProzent).toFixed(1)} % in ${FENSTER} Monaten (${damals.angebote} → ${jetzt.angebote}).`,
          delta: null,
        },
      ],
    ),
    komponente(
      'medianpreis',
      MOMENTUM_LABEL.medianpreis,
      gewichte.medianpreis,
      punkte(medianpreisProzent, 1, 12),
      [
        {
          text: `Medianpreis ${medianpreisProzent >= 0 ? '+' : ''}${medianpreisProzent.toFixed(1)} % in ${FENSTER} Monaten.`,
          delta: null,
        },
      ],
    ),
    komponente(
      'standzeit',
      MOMENTUM_LABEL.standzeit,
      gewichte.standzeit,
      punkte(standzeitProzent, -1, 20),
      [
        {
          text: `Durchschnittliche Standzeit ${damals.standzeitTage} → ${jetzt.standzeitTage} Tage.`,
          delta: null,
        },
      ],
    ),
    komponente(
      'nachfrage',
      MOMENTUM_LABEL.nachfrage,
      gewichte.nachfrage,
      punkte(abgangsUeberschuss, 1, 25),
      [
        {
          text:
            abgangsUeberschuss >= 0
              ? `In sechs Monaten verschwanden ${abgangsUeberschuss.toFixed(0)} % mehr Angebote als neu hinzukamen.`
              : `Es kamen ${Math.abs(abgangsUeberschuss).toFixed(0)} % mehr Angebote hinzu als verschwanden.`,
          delta: null,
        },
      ],
    ),
    komponente(
      'spitzenpreise',
      MOMENTUM_LABEL.spitzenpreise,
      gewichte.spitzenpreise,
      punkte(spitzenpreisProzent, 1, 15),
      [
        {
          text: `Preise guter Exemplare ${spitzenpreisProzent >= 0 ? '+' : ''}${spitzenpreisProzent.toFixed(1)} %.`,
          delta: null,
        },
      ],
    ),
    komponente(
      'spreizung',
      MOMENTUM_LABEL.spreizung,
      gewichte.spreizung,
      punkte(spreizungProzent, 1, 8),
      [
        {
          text: `Aufschlag guter Exemplare auf den Median: ${((spreizungAlt - 1) * 100).toFixed(0)} % → ${((spreizungNeu - 1) * 100).toFixed(0)} %.`,
          delta: null,
        },
        {
          text: 'Wachsende Spreizung zeigt, dass der Markt beginnt, Qualität zu bezahlen.',
          delta: null,
        },
      ],
    ),
  ];

  const score = baueScore(komponenten, einordnen, {
    datenbasis: Math.min(100, (reihe.monate.length / 24) * 100),
  });

  return {
    score,
    kennzahlen: {
      angebotsmengeProzent,
      medianpreisProzent,
      standzeitProzent,
      spitzenpreisProzent,
      spreizungAlt,
      spreizungNeu,
      abgangsUeberschuss,
    },
    // Der Trend geht gedämpft in die Marktwertrechnung ein: Ein Momentum von
    // 100 rechtfertigt keinen Aufschlag von 100 % — nur ein leicht höheres
    // Preisniveau, das die aktuelle Nachfrage abbildet.
    trendProzent: begrenze(((score.wert - 50) / 50) * 3.5, -3.5, 3.5),
    einordnung: einordnen(score.wert),
  };
}

function einordnen(wert: number): string {
  if (wert >= 80) return 'Markt zieht deutlich an';
  if (wert >= 65) return 'Markt zieht an';
  if (wert >= 50) return 'stabil bis leicht steigend';
  if (wert >= 35) return 'stabil bis nachgebend';
  return 'Markt gibt nach';
}
