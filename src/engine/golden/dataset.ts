/**
 * Golden Dataset (PRD Abschnitt 12.1).
 *
 * Referenzfälle mit manuell festgehaltenem Soll-Ergebnis. Jede Regeländerung
 * läuft dagegen; Abweichungen müssen erklärt werden, bevor deployed wird
 * (FR-5.5, NFR-4: 100 % Korrektheit, keine Ausnahme).
 *
 * WICHTIG — Status
 * ---------------------------------------------------------------------------
 * Die hier hinterlegten Fälle sind konstruierte Referenzfälle zur Absicherung
 * der Engine-Mechanik, NICHT die laut PRD geforderten 15–25 abgeschlossenen,
 * behördlich genehmigten Projekte. Diese sind aus dem Archiv zu erfassen,
 * bevor das Abnahmekriterium 12.4.2 als erfüllt gelten kann.
 */

import type { Bundesland } from '../types';
import type { GebaeudeklassenEingabe } from '../gebaeudeklasse';
import type { EngineKontext, IstWerte } from '../engine';

export interface GoldenFall {
  id: string;
  bezeichnung: string;
  /** Woher der Fall stammt und wer das Soll-Ergebnis verifiziert hat. */
  herkunft: string;
  bundesland: Bundesland;
  ausgabe: '2023-05';
  klassenEingabe: GebaeudeklassenEingabe;
  kontext: Omit<EngineKontext, 'gebaeudeklasse'>;
  istWerte: IstWerte;
  /** Manuell festgehaltenes Soll-Ergebnis. */
  erwartet: {
    gebaeudeklasse: 'GK1' | 'GK2' | 'GK3' | 'GK4' | 'GK5' | null;
    /** Erwartete Sollwerte je Anforderungs-ID. */
    sollwerte: Record<string, string | number | boolean>;
    /** Anforderungen, die nicht erfüllt sein müssen. */
    nichtErfuellt: string[];
  };
}

export const GOLDEN_DATASET: GoldenFall[] = [
  {
    id: 'gold-01-efh',
    bezeichnung: 'Freistehendes Einfamilienhaus, zwei Geschoße',
    herkunft: 'Konstruierter Referenzfall — Grenzfall Gebäudeklasse 1',
    bundesland: 'K',
    ausgabe: '2023-05',
    klassenEingabe: {
      fluchtniveau: 3.2,
      geschosseOberirdisch: 2,
      nutzungseinheitenAnzahl: 1,
      groessteEinheitFlaeche: 180,
      freistehend: true,
    },
    kontext: {
      fluchtniveau: 3.2,
      geschosseOberirdisch: 2,
      geschosseUnterirdisch: 1,
      bruttoGrundflaeche: 320,
      groessterBrandabschnitt: 320,
      nutzungsarten: ['wohnen'],
      personenGesamt: 5,
      risikoklasse: 'normal',
      hatKeller: true,
    },
    istWerte: {},
    erwartet: {
      gebaeudeklasse: 'GK1',
      sollwerte: {
        // GK1 stellt an oberirdische tragende Bauteile keine Anforderung.
        'oib2-2023-2.1-tragwerk-ob-gk1': 'keine',
        // Kellergeschoß bleibt bei GK1/GK2 auf R60.
        'oib2-2023-2.2-tragwerk-ub': 'R60',
        'oib2-2023-3.1-trenndecke-gk1-2': 'REI30',
        'oib2-2023-5.1-fluchtweglaenge': 40,
      },
      nichtErfuellt: [],
    },
  },

  {
    id: 'gold-02-wohnhaus-gk4',
    bezeichnung: 'Wohnhausanlage, vier Geschoße, Fluchtniveau 9,8 m',
    herkunft: 'Konstruierter Referenzfall — Regelfall Gebäudeklasse 4',
    bundesland: 'K',
    ausgabe: '2023-05',
    klassenEingabe: {
      fluchtniveau: 9.8,
      geschosseOberirdisch: 4,
      nutzungseinheitenAnzahl: 16,
      groessteEinheitFlaeche: 95,
      freistehend: true,
    },
    kontext: {
      fluchtniveau: 9.8,
      geschosseOberirdisch: 4,
      geschosseUnterirdisch: 1,
      bruttoGrundflaeche: 2400,
      groessterBrandabschnitt: 620,
      nutzungsarten: ['wohnen'],
      personenGesamt: 48,
      risikoklasse: 'normal',
      hatKeller: true,
    },
    istWerte: {
      'oib2-2023-2.1-tragwerk-ob-gk3-4': 'R60',
      'oib2-2023-3.1-trenndecke-gk3-4': 'REI60',
      'oib2-2023-5.1-fluchtweglaenge': 28,
      'oib2-2023-5.2-fluchtwegbreite': 1.3,
    },
    erwartet: {
      gebaeudeklasse: 'GK4',
      sollwerte: {
        'oib2-2023-2.1-tragwerk-ob-gk3-4': 'R60',
        'oib2-2023-2.2-tragwerk-ub-gk3-5': 'R90',
        'oib2-2023-3.1-trenndecke-gk3-4': 'REI60',
        'oib2-2023-3.2-trennwand-gk4-5': 'EI60',
        'oib2-2023-3.5-treppenhauswand': 'REI60',
        'oib2-2023-5.1-fluchtweglaenge': 40,
      },
      nichtErfuellt: [],
    },
  },

  {
    id: 'gold-03-betrieb-gk5',
    bezeichnung: 'Betriebsgebäude mit Produktion, fünf Geschoße',
    herkunft: 'Konstruierter Referenzfall — Gebäudeklasse 5 mit Betriebsnutzung',
    bundesland: 'K',
    ausgabe: '2023-05',
    klassenEingabe: {
      fluchtniveau: 14.5,
      geschosseOberirdisch: 5,
      nutzungseinheitenAnzahl: 3,
      groessteEinheitFlaeche: 1800,
      freistehend: true,
    },
    kontext: {
      fluchtniveau: 14.5,
      geschosseOberirdisch: 5,
      geschosseUnterirdisch: 1,
      bruttoGrundflaeche: 8200,
      groessterBrandabschnitt: 1850,
      nutzungsarten: ['produktion', 'buero'],
      personenGesamt: 210,
      risikoklasse: 'erhoeht',
      hatKeller: true,
    },
    istWerte: {
      'oib2-2023-2.1-tragwerk-ob-gk5': 'R60',
      'oib2-2023-3.4-brandabschnitt-flaeche': 1850,
      'oib2-2023-5.1-fluchtweglaenge': 34,
      'oib2-2023-6.2-loeschwasser': 1200,
    },
    erwartet: {
      gebaeudeklasse: 'GK5',
      sollwerte: {
        'oib2-2023-2.1-tragwerk-ob-gk5': 'R90',
        'oib2-2023-3.1-trenndecke-gk5': 'REI90',
        'oib2-2023-3.4-brandabschnitt-flaeche': 1200,
        'oib2-2023-5.1-fluchtweglaenge': 30,
        'oib2-2023-6.2-loeschwasser': 1600,
      },
      nichtErfuellt: [
        // R60 unterschreitet die geforderten R90.
        'oib2-2023-2.1-tragwerk-ob-gk5',
        // 1.850 m² überschreiten den Richtwert von 1.200 m² für Produktion.
        'oib2-2023-3.4-brandabschnitt-flaeche',
        // 34 m überschreiten die 30 m der Risikoklasse „erhöht".
        'oib2-2023-5.1-fluchtweglaenge',
        // 1.200 l/min unterschreiten die geforderten 1.600 l/min.
        'oib2-2023-6.2-loeschwasser',
      ],
    },
  },

  {
    id: 'gold-04-beherbergung',
    bezeichnung: 'Beherbergungsbetrieb, drei Geschoße, Fluchtniveau 6,8 m',
    herkunft: 'Konstruierter Referenzfall — nutzungsgetriebene Anforderungen',
    bundesland: 'W',
    ausgabe: '2023-05',
    klassenEingabe: {
      fluchtniveau: 6.8,
      geschosseOberirdisch: 3,
      nutzungseinheitenAnzahl: 24,
      groessteEinheitFlaeche: 420,
      freistehend: false,
    },
    kontext: {
      fluchtniveau: 6.8,
      geschosseOberirdisch: 3,
      geschosseUnterirdisch: 0,
      bruttoGrundflaeche: 1900,
      groessterBrandabschnitt: 950,
      nutzungsarten: ['beherbergung'],
      personenGesamt: 84,
      risikoklasse: 'erhoeht',
      hatKeller: false,
    },
    istWerte: {
      'oib2-2023-6.3-brandmeldeanlage': false,
      'oib2-2023-6.4-alarmierung': true,
    },
    erwartet: {
      // Über 5 Einheiten und über 400 m² schließen GK1 und GK2 aus.
      gebaeudeklasse: 'GK3',
      sollwerte: {
        'oib2-2023-2.1-tragwerk-ob-gk3-4': 'R60',
        'oib2-2023-3.1-trenndecke-gk3-4': 'REI60',
        'oib2-2023-3.4-brandabschnitt-flaeche': 1200,
        'oib2-2023-6.3-brandmeldeanlage': true,
        'oib2-2023-6.4-alarmierung': true,
      },
      nichtErfuellt: [
        // Beherbergung fordert eine BMA, vorhanden ist keine.
        'oib2-2023-6.3-brandmeldeanlage',
      ],
    },
  },

  {
    id: 'gold-05-datenluecke',
    bezeichnung: 'Unvollständige Erfassung — Gebäudeklasse nicht ermittelbar',
    herkunft: 'Konstruierter Referenzfall — Datenlückenverhalten (FR-2.8)',
    bundesland: 'K',
    ausgabe: '2023-05',
    klassenEingabe: {
      fluchtniveau: 5.0,
      geschosseOberirdisch: 2,
      // Die Angaben für die Unterscheidung GK1/GK2/GK3 fehlen.
      nutzungseinheitenAnzahl: null,
      groessteEinheitFlaeche: null,
      freistehend: null,
    },
    kontext: {
      fluchtniveau: 5.0,
      geschosseOberirdisch: 2,
      geschosseUnterirdisch: 0,
      bruttoGrundflaeche: 400,
      groessterBrandabschnitt: 400,
      nutzungsarten: ['buero'],
      personenGesamt: 12,
      risikoklasse: 'normal',
      hatKeller: false,
    },
    istWerte: {},
    erwartet: {
      gebaeudeklasse: null,
      sollwerte: {},
      nichtErfuellt: [],
    },
  },
];
