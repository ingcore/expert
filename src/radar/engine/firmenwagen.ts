/**
 * INGTEC Firmenwagenmodus — PRD Abschnitt 24.
 *
 * Der Abschnitt enthält eine ausdrückliche Auflage: „Die steuerlichen Parameter
 * müssen administrativ konfigurierbar sein und dürfen nicht fest im
 * Programmcode hinterlegt werden." Diese Datei enthält deshalb **keine**
 * Grenzwerte. Sie bekommt sie übergeben, prüft dagegen und begründet jedes
 * Ergebnis.
 *
 * Der steuerliche Prüfhinweis ist bewusst ein Text und keine Berechnung.
 * Abschnitt 4 schließt es aus, steuerliche Beratung automatisiert zu ersetzen;
 * die Anwendung stellt fest, ob die hinterlegten Parameter erfüllt sind — mehr
 * darf sie nicht behaupten.
 */

import type { InseratDaten } from '../domain/types';
import { begrenze } from '../domain/format';
import type { Modelldefinition } from '../wissen/modelle';
import type { Systemparameter } from './gewichte';

export interface Firmenwagenkriterium {
  schluessel: string;
  label: string;
  erfuellt: boolean;
  ist: string;
  soll: string;
  begruendung: string;
}

export interface Firmenwagenpruefung {
  geeignet: boolean;
  kriterien: Firmenwagenkriterium[];
  /** 0–100, betriebliche Nutzbarkeit. */
  nutzbarkeit: number;
  nutzbarkeitBegruendung: string[];
  steuerhinweis: string;
}

/**
 * Betriebliche Nutzbarkeit aus Karosserie, Alltagstauglichkeit und Zustand.
 * Ein Coupé mit 190.000 km ist betrieblich etwas anderes als ein Avant mit
 * 90.000 km — und beides ist unabhängig davon, ob das Fahrzeug ein gutes Asset ist.
 */
function bewerteNutzbarkeit(
  daten: InseratDaten,
  modell: Modelldefinition | undefined,
): { wert: number; begruendung: string[] } {
  const begruendung: string[] = [];
  let wert = 50;

  const karosserie = (modell?.karosserie ?? daten.variante ?? '').toLowerCase();
  if (/avant|kombi|sportback|limousine/.test(karosserie)) {
    wert += 25;
    begruendung.push('Karosserie mit vier Türen bzw. Ladeabteil — betrieblich uneingeschränkt einsetzbar.');
  } else if (/coup/.test(karosserie)) {
    wert += 5;
    begruendung.push('Coupé — betrieblich einsetzbar, aber eingeschränkt bei Personen- und Materialtransport.');
  } else if (/cabrio|roadster/.test(karosserie)) {
    wert -= 15;
    begruendung.push('Cabriolet — betriebliche Nutzbarkeit deutlich eingeschränkt.');
  }

  if (daten.kilometerstand !== null) {
    if (daten.kilometerstand > 180000) {
      wert -= 20;
      begruendung.push('Hohe Laufleistung — erhöhte Ausfallwahrscheinlichkeit im Betriebseinsatz.');
    } else if (daten.kilometerstand < 120000) {
      wert += 10;
      begruendung.push('Moderate Laufleistung für den laufenden Einsatz.');
    }
  }

  if (daten.antrieb === 'allrad') {
    wert += 8;
    begruendung.push('Allradantrieb — ganzjährig einsetzbar.');
  }

  if (daten.servicehistorie === 'lueckenlos') {
    wert += 8;
    begruendung.push('Lückenlose Wartung senkt das Ausfallrisiko im Betrieb.');
  } else if (daten.servicehistorie === 'keine') {
    wert -= 12;
    begruendung.push('Ohne Wartungsnachweis ist die Einsatzbereitschaft nicht planbar.');
  }

  return { wert: Math.round(begrenze(wert, 0, 100)), begruendung };
}

export interface Firmenwageneingang {
  daten: InseratDaten;
  modell: Modelldefinition | undefined;
  alterMonate: number | null;
  assetScore: number;
  integrityScore: number;
  /** Kritische, offene technische Risiken. */
  kritischeRisiken: number;
  parameter: Systemparameter['firmenwagen'];
}

export function pruefeFirmenwagen(e: Firmenwageneingang): Firmenwagenpruefung {
  const p = e.parameter;
  const nutzbarkeit = bewerteNutzbarkeit(e.daten, e.modell);

  const kriterien: Firmenwagenkriterium[] = [
    {
      schluessel: 'preis',
      label: 'Anschaffungspreis',
      erfuellt: e.daten.preis <= p.anschaffungspreisMax,
      ist: `${e.daten.preis.toLocaleString('de-AT')} €`,
      soll: `höchstens ${p.anschaffungspreisMax.toLocaleString('de-AT')} €`,
      begruendung:
        e.daten.preis <= p.anschaffungspreisMax
          ? 'Anschaffungspreis liegt innerhalb der hinterlegten Grenze.'
          : 'Anschaffungspreis überschreitet die hinterlegte Grenze.',
    },
    {
      schluessel: 'alter',
      label: 'Alterskriterium',
      erfuellt: e.alterMonate !== null && e.alterMonate >= p.mindestalterMonate,
      ist:
        e.alterMonate === null
          ? 'unbekannt (keine Erstzulassung angegeben)'
          : `${e.alterMonate} Monate`,
      soll: `mindestens ${p.mindestalterMonate} Monate`,
      begruendung:
        e.alterMonate === null
          ? 'Ohne Erstzulassung lässt sich das Alterskriterium nicht prüfen.'
          : e.alterMonate >= p.mindestalterMonate
            ? 'Fahrzeug erfüllt das hinterlegte Mindestalter.'
            : 'Fahrzeug ist jünger als das hinterlegte Mindestalter.',
    },
    {
      schluessel: 'nutzbarkeit',
      label: 'Betriebliche Nutzbarkeit',
      erfuellt: nutzbarkeit.wert >= p.nutzbarkeitMin,
      ist: `${nutzbarkeit.wert} von 100`,
      soll: `mindestens ${p.nutzbarkeitMin}`,
      begruendung: nutzbarkeit.begruendung.join(' '),
    },
    {
      schluessel: 'asset',
      label: 'Asset-Eignung',
      erfuellt: e.assetScore >= p.assetMin,
      ist: `Asset Score ${e.assetScore}`,
      soll: `mindestens ${p.assetMin}`,
      begruendung:
        e.assetScore >= p.assetMin
          ? 'Das Modell erfüllt den geforderten Asset Score — der Firmenwagen ist zugleich Anlage.'
          : 'Das Modell erreicht den geforderten Asset Score nicht.',
    },
    {
      schluessel: 'integrity',
      label: 'Angebotstransparenz',
      erfuellt: e.integrityScore >= p.integrityMin,
      ist: `Integrity Score ${e.integrityScore}`,
      soll: `mindestens ${p.integrityMin}`,
      begruendung:
        e.integrityScore >= p.integrityMin
          ? 'Das Angebot ist ausreichend transparent für eine betriebliche Anschaffung.'
          : 'Das Angebot ist für eine betriebliche Anschaffung nicht ausreichend transparent.',
    },
    {
      schluessel: 'schaden',
      label: 'Kein erheblicher offener Schaden',
      erfuellt:
        e.daten.unfallangabe !== 'unfallschaden' && e.kritischeRisiken === 0,
      ist:
        e.daten.unfallangabe === 'unfallschaden'
          ? 'offener Unfallschaden angegeben'
          : e.kritischeRisiken > 0
            ? `${e.kritischeRisiken} kritische technische Risiken fällig und unbelegt`
            : 'kein erheblicher offener Schaden erkennbar',
      soll: 'kein erheblicher offener Schaden',
      begruendung:
        e.daten.unfallangabe === 'unfallschaden'
          ? 'Ein offener Unfallschaden schließt die betriebliche Anschaffung nach den hinterlegten Regeln aus.'
          : e.kritischeRisiken > 0
            ? 'Kritische, nicht belegte technische Risiken sind vor einer betrieblichen Anschaffung zu klären.'
            : 'Weder Unfallschaden noch offene kritische Risiken.',
    },
  ];

  return {
    geeignet: kriterien.every((k) => k.erfuellt),
    kriterien,
    nutzbarkeit: nutzbarkeit.wert,
    nutzbarkeitBegruendung: nutzbarkeit.begruendung,
    steuerhinweis: p.steuerhinweis,
  };
}
