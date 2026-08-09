/**
 * Aufbau des Startbestandes.
 *
 * Der Bestand wird nicht hingeschrieben, sondern **erzeugt**: Für jeden
 * Zeitpunkt, zu dem sich am Markt etwas geändert hat, läuft ein vollständiger
 * Collector-Durchgang. Was am Ende in der Oberfläche steht, ist damit durch
 * dieselbe Kette gegangen wie im Betrieb — Suche, Normalisierung,
 * Identitätszuordnung, Historisierung, Audit Trail.
 *
 * Das kostet beim Start ein paar Millisekunden und ist es wert: Jede
 * Beobachtungsreihe, jede Fahrzeugzuordnung und jeder Auditeintrag im Bestand
 * ist ein echtes Ergebnis der Engines und keine Behauptung dieser Datei.
 */

import type {
  Alert,
  Benutzer,
  Fahrzeugdokument,
  Nutzerbefund,
  Portfoliofahrzeug,
  Suchauftrag,
  Watchlisteintrag,
} from '../domain/types';
import { STICHTAG } from '../domain/format';
import { aktiveConnectoren } from '../connectors/registry';
import {
  fuehreLaufAus,
  leererBestand,
  type Bestand,
  type Laufergebnis,
} from '../connectors/lauf';
import type { Systemparameter } from '../engine/gewichte';
import { vorgabeParameter } from '../engine/gewichte';
import { MARKT } from './rohdaten';
import { SEEDFAHRZEUGE } from './fahrzeugdaten';

export interface Startbestand {
  bestand: Bestand;
  laeufe: Laufergebnis[];
  /**
   * Wahre Zuordnung Seed-Fahrzeug → erzeugte Fahrzeugakten. Die Anwendung
   * verwendet sie nicht; die Tests prüfen damit die Identity Engine.
   */
  wahrheit: Record<string, string[]>;
}

/** Suchkriterien des Dauerauftrags — die MVP-Marken aus Abschnitt 46. */
const SUCHKRITERIEN = {
  hersteller: ['BMW', 'Audi', 'Porsche'],
};

/** Alle Zeitpunkte, zu denen am Markt etwas passiert ist. */
function laufzeitpunkte(): string[] {
  const punkte = new Set<string>();
  for (const inserat of MARKT) {
    for (const stand of inserat.staende) punkte.add(stand.zeitpunkt);
    if (inserat.entferntAm) punkte.add(inserat.entferntAm);
  }
  punkte.add(STICHTAG);
  return [...punkte].sort((a, b) => Date.parse(a) - Date.parse(b));
}

export async function baueStartbestand(
  parameter: Systemparameter = vorgabeParameter(),
): Promise<Startbestand> {
  const bestand: Bestand = leererBestand();
  const connectoren = aktiveConnectoren();
  const laeufe: Laufergebnis[] = [];

  for (const zeitpunkt of laufzeitpunkte()) {
    laeufe.push(
      await fuehreLaufAus(connectoren, bestand, {
        kriterien: SUCHKRITERIEN,
        parameter,
        zeitpunkt,
      }),
    );
  }

  /* -- Unterlagen, Notizen und Nutzerbefunde zuordnen -------------------- */
  const wahrheit: Record<string, string[]> = {};

  for (const seed of SEEDFAHRZEUGE) {
    const zugehoerige = seed.angebote
      .map((a) => bestand.inserate.find((i) => i.externeId === a.externeId))
      .filter((i): i is NonNullable<typeof i> => i !== undefined);

    const fahrzeugIds = [
      ...new Set(zugehoerige.map((i) => i.fahrzeugId).filter((x): x is string => x !== null)),
    ];
    wahrheit[seed.schluessel] = fahrzeugIds;

    const ziel = bestand.fahrzeuge.find((f) => f.id === fahrzeugIds[0]);
    if (!ziel) continue;

    ziel.dokumente = seed.dokumente.map<Fahrzeugdokument>((d, i) => ({
      id: `${ziel.id}-dok-${i + 1}`,
      ...d,
    }));
    for (const dok of ziel.dokumente) {
      ziel.ereignisse.push({
        id: `ev-${ziel.id}-dok-${dok.id}`,
        zeitpunkt: dok.hochgeladenAm,
        art: 'dokument',
        text: `Unterlage hinterlegt: ${dok.bezeichnung}`,
        inseratId: null,
        vorher: null,
        nachher: dok.art,
      });
    }

    ziel.notizen = (seed.notizen ?? []).map((n, i) => ({
      id: `${ziel.id}-notiz-${i + 1}`,
      ...n,
    }));

    ziel.nutzerbefunde = (seed.nutzerbefunde ?? []).map<Nutzerbefund>((b, i) => ({
      id: `${ziel.id}-befund-${i + 1}`,
      ...b,
    }));
    for (const befund of ziel.nutzerbefunde) {
      ziel.ereignisse.push({
        id: `ev-${ziel.id}-befund-${befund.id}`,
        zeitpunkt: befund.zeitpunkt,
        art: 'nutzerbefund',
        text: `Nutzerbefund zu ${befund.feld}: „${befund.befundNutzer}" statt „${befund.behauptungSystem}".`,
        inseratId: null,
        vorher: befund.behauptungSystem,
        nachher: befund.befundNutzer,
      });
      bestand.audit.push({
        id: `audit-${bestand.audit.length + 1}`,
        zeitpunkt: befund.zeitpunkt,
        benutzer: befund.verfasser,
        quelle: 'Nutzerbefund (Ground Truth)',
        objekt: `Fahrzeug ${ziel.id}`,
        feld: befund.feld,
        vorher: befund.behauptungSystem,
        nachher: befund.befundNutzer,
        systementscheidung:
          'Als eigene Quelle mit höchster Confidence gespeichert; die abgeleitete Angabe bleibt erhalten.',
        scoreaenderung: null,
      });
    }

    ziel.ereignisse.sort((a, b) => Date.parse(a.zeitpunkt) - Date.parse(b.zeitpunkt));
  }

  return { bestand, laeufe, wahrheit };
}

/* ==========================================================================
 * Übriger Anwendungszustand
 * ======================================================================= */

export const BENUTZER: Benutzer[] = [
  { id: 'u-1', name: 'H. Ing', rolle: 'administrator' },
  { id: 'u-2', name: 'M. Berger', rolle: 'analyst' },
  { id: 'u-3', name: 'T. Steiner', rolle: 'techniker' },
  { id: 'u-4', name: 'C. Wolf', rolle: 'einkauf' },
  { id: 'u-5', name: 'Geschäftsführung', rolle: 'management' },
];

export function seedSuchauftraege(): Suchauftrag[] {
  return [
    {
      id: 'auf-1',
      name: 'M3 E9x — Sammlerqualität',
      aktiv: true,
      modellIds: ['bmw-m3-e92', 'bmw-m3-e90'],
      preisMax: 60000,
      preisMin: null,
      kilometerMax: 140000,
      baujahrMin: null,
      mindestalterMonate: null,
      getriebe: ['handschalter'],
      laender: ['DE', 'AT', 'IT'],
      originalzustandBevorzugt: true,
      meldungAbRang: 'B',
      kanaele: ['web', 'email'],
      angelegtAm: '2026-01-12T08:00:00.000Z',
    },
    {
      id: 'auf-2',
      name: 'INGTEC Firmenwagen — Performance bis 40.000 €',
      aktiv: true,
      modellIds: [],
      preisMax: 40000,
      preisMin: 15000,
      kilometerMax: 180000,
      baujahrMin: null,
      mindestalterMonate: 60,
      getriebe: [],
      laender: ['DE', 'AT'],
      originalzustandBevorzugt: false,
      meldungAbRang: 'B',
      kanaele: ['web', 'teams'],
      angelegtAm: '2026-02-03T08:00:00.000Z',
    },
    {
      id: 'auf-3',
      name: 'Porsche 911 — Youngtimer-Chancen',
      aktiv: true,
      modellIds: [
        'porsche-996-c4s',
        'porsche-996-carrera',
        'porsche-997-carrera-s',
        'porsche-997-2-carrera-s',
      ],
      preisMax: 70000,
      preisMin: null,
      kilometerMax: null,
      baujahrMin: null,
      mindestalterMonate: null,
      getriebe: ['handschalter'],
      laender: [],
      originalzustandBevorzugt: true,
      meldungAbRang: 'A',
      kanaele: ['web', 'email', 'push'],
      angelegtAm: '2026-03-18T08:00:00.000Z',
    },
  ];
}

export function seedWatchlist(fahrzeugId: string | undefined): Watchlisteintrag[] {
  if (!fahrzeugId) return [];
  return [
    {
      id: 'wl-1',
      fahrzeugId,
      status: 'unterlagen-angefordert',
      aufgenommenAm: '2026-07-18T09:00:00.000Z',
      geaendertAm: '2026-07-29T14:30:00.000Z',
      verantwortlich: 'C. Wolf',
      bemerkung:
        'Verkäuferanfrage freigegeben und versendet. Kaltstartvideo und Unterbodenbilder stehen noch aus.',
      pruefung: [],
      anfrageVersendetAm: '2026-07-29T14:30:00.000Z',
    },
  ];
}

export function seedPortfolio(): Portfoliofahrzeug[] {
  return [
    {
      id: 'pf-1',
      fahrzeugId: null,
      bezeichnung: 'BMW M3 E46 Coupé Handschalter, Laguna Seca Blau',
      modellId: null,
      kaufdatum: '2021-09-14',
      kaufpreis: 34500,
      nebenkosten: 1850,
      kilometerstandKauf: 142000,
      kilometerstandAktuell: 151400,
      marktwertAktuell: 52000,
      verkauf: null,
      transaktionen: [
        { id: 'pt-1', datum: '2021-11-02', art: 'service', bezeichnung: 'Inspektion und Zahnriemenbereich', betrag: 1680 },
        { id: 'pt-2', datum: '2022-04-20', art: 'restauration', bezeichnung: 'Vanos-Überholung und Lagerschalen', betrag: 4200 },
        { id: 'pt-3', datum: '2022-06-11', art: 'reifen', bezeichnung: 'Reifensatz Michelin', betrag: 1120 },
        { id: 'pt-4', datum: '2023-03-08', art: 'versicherung', bezeichnung: 'Oldtimerversicherung 2023', betrag: 640 },
        { id: 'pt-5', datum: '2023-09-19', art: 'service', bezeichnung: 'Ölservice und § 57a', betrag: 520 },
        { id: 'pt-6', datum: '2024-03-05', art: 'versicherung', bezeichnung: 'Oldtimerversicherung 2024', betrag: 660 },
        { id: 'pt-7', datum: '2024-10-22', art: 'wartung', bezeichnung: 'Bremsanlage rundum', betrag: 1980 },
        { id: 'pt-8', datum: '2025-03-11', art: 'versicherung', bezeichnung: 'Oldtimerversicherung 2025', betrag: 680 },
        { id: 'pt-9', datum: '2025-08-30', art: 'service', bezeichnung: 'Ölservice und Achsvermessung', betrag: 740 },
        { id: 'pt-10', datum: '2026-03-14', art: 'versicherung', bezeichnung: 'Oldtimerversicherung 2026', betrag: 700 },
      ],
    },
    {
      id: 'pf-2',
      fahrzeugId: null,
      bezeichnung: 'Porsche 996 Carrera 4S Handschalter, Seal Grey',
      modellId: 'porsche-996-c4s',
      kaufdatum: '2023-05-22',
      kaufpreis: 41000,
      nebenkosten: 2100,
      kilometerstandKauf: 128000,
      kilometerstandAktuell: 139500,
      marktwertAktuell: 51500,
      verkauf: null,
      transaktionen: [
        { id: 'pt-11', datum: '2023-06-30', art: 'restauration', bezeichnung: 'IMS-Umrüstung und RMS', betrag: 3400 },
        { id: 'pt-12', datum: '2023-07-14', art: 'service', bezeichnung: 'Große Inspektion', betrag: 1250 },
        { id: 'pt-13', datum: '2024-04-18', art: 'wartung', bezeichnung: 'Kühlerpakete gereinigt, Leitungen', betrag: 1490 },
        { id: 'pt-14', datum: '2024-11-06', art: 'versicherung', bezeichnung: 'Versicherung 2024/25', betrag: 890 },
        { id: 'pt-15', datum: '2025-09-12', art: 'service', bezeichnung: 'Ölservice und § 57a', betrag: 610 },
        { id: 'pt-16', datum: '2026-02-27', art: 'versicherung', bezeichnung: 'Versicherung 2026', betrag: 910 },
      ],
    },
    {
      id: 'pf-3',
      fahrzeugId: null,
      bezeichnung: 'Audi RS4 B7 Limousine, Avussilber',
      modellId: 'audi-rs4-b7',
      kaufdatum: '2022-02-19',
      kaufpreis: 26900,
      nebenkosten: 1200,
      kilometerstandKauf: 165000,
      kilometerstandAktuell: 189000,
      marktwertAktuell: 28500,
      verkauf: { datum: '2025-06-28', preis: 29500 },
      transaktionen: [
        { id: 'pt-17', datum: '2022-03-30', art: 'restauration', bezeichnung: 'DRC-Umrüstung auf Gewindefahrwerk', betrag: 2650 },
        { id: 'pt-18', datum: '2022-09-15', art: 'service', bezeichnung: 'Walnussstrahlen und Zündkerzen', betrag: 1180 },
        { id: 'pt-19', datum: '2023-05-04', art: 'wartung', bezeichnung: 'Kupplung und ZMS', betrag: 2400 },
        { id: 'pt-20', datum: '2024-06-11', art: 'service', bezeichnung: 'Ölservice und § 57a', betrag: 580 },
        { id: 'pt-21', datum: '2025-02-20', art: 'wartung', bezeichnung: 'Bremsen und Reifen', betrag: 1750 },
      ],
    },
  ];
}

export const SEED_ALERTS: Alert[] = [];
