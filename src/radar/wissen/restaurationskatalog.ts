/**
 * Kostenkatalog der Restaurationsanalyse — PRD Abschnitt 19.
 *
 * Bewertet werden die dort genannten Gewerke. Je Gewerk und Zustandsstufe
 * liegen drei Werte vor: Low, Expected und High Estimate. Die Spanne ist der
 * eigentliche Informationsgehalt — eine Punktschätzung wäre bei einem
 * Restaurationsobjekt eine Behauptung, keine Aussage.
 *
 * Die Beträge gelten für den DACH-Raum inklusive Arbeitszeit einer
 * markenerfahrenen Werkstatt. Der Markenfaktor bildet ab, dass dieselbe
 * Arbeit an einem 911 nicht dasselbe kostet wie an einem A4.
 */

export type Gewerk =
  | 'karosserie'
  | 'lack'
  | 'motor'
  | 'getriebe'
  | 'fahrwerk'
  | 'bremsen'
  | 'innenraum'
  | 'elektrik'
  | 'raeder'
  | 'reifen'
  | 'originalteile'
  | 'dokumentation';

/** 1 = keine Arbeit nötig … 5 = vollständige Erneuerung. */
export type Zustandsstufe = 1 | 2 | 3 | 4 | 5;

export const ZUSTANDSSTUFE_LABEL: Record<Zustandsstufe, string> = {
  1: 'Referenzzustand — keine Arbeit',
  2: 'Gebrauchsspuren — kosmetisch',
  3: 'Instandsetzung erforderlich',
  4: 'Erhebliche Instandsetzung',
  5: 'Vollständige Erneuerung',
};

export interface Kostenspanne {
  low: number;
  expected: number;
  high: number;
}

export interface Gewerkposition {
  gewerk: Gewerk;
  label: string;
  /** Was in diesem Gewerk beurteilt wird. */
  beschreibung: string;
  stufen: Record<Zustandsstufe, Kostenspanne>;
}

export const GEWERKE: Gewerkposition[] = [
  {
    gewerk: 'karosserie',
    label: 'Karosserie',
    beschreibung:
      'Blech, Radläufe, Schweller, Unterboden, Spaltmaße, Korrosion, frühere Instandsetzungen.',
    stufen: {
      1: { low: 0, expected: 0, high: 0 },
      2: { low: 300, expected: 700, high: 1400 },
      3: { low: 1800, expected: 3200, high: 5500 },
      4: { low: 5000, expected: 8500, high: 14000 },
      5: { low: 12000, expected: 19000, high: 32000 },
    },
  },
  {
    gewerk: 'lack',
    label: 'Lackierung',
    beschreibung: 'Lackzustand, Farbabweichungen, Steinschlag, Nachlackierungen.',
    stufen: {
      1: { low: 0, expected: 0, high: 0 },
      2: { low: 400, expected: 900, high: 1800 },
      3: { low: 1800, expected: 3000, high: 4800 },
      4: { low: 4500, expected: 7000, high: 11000 },
      5: { low: 8000, expected: 12500, high: 19000 },
    },
  },
  {
    gewerk: 'motor',
    label: 'Motor',
    beschreibung:
      'Kompression, Ölverbrauch, Dichtheit, modelltypische Schwachstellen, Nebenaggregate.',
    stufen: {
      1: { low: 0, expected: 0, high: 0 },
      2: { low: 600, expected: 1200, high: 2200 },
      3: { low: 2500, expected: 4500, high: 7500 },
      4: { low: 7000, expected: 11000, high: 17000 },
      5: { low: 14000, expected: 21000, high: 32000 },
    },
  },
  {
    gewerk: 'getriebe',
    label: 'Getriebe und Kupplung',
    beschreibung: 'Schaltbarkeit, Kupplung, Zweimassenschwungrad, Ölservice, Mechatronik.',
    stufen: {
      1: { low: 0, expected: 0, high: 0 },
      2: { low: 400, expected: 700, high: 1200 },
      3: { low: 1600, expected: 2600, high: 4000 },
      4: { low: 3500, expected: 5200, high: 8000 },
      5: { low: 6500, expected: 9500, high: 14000 },
    },
  },
  {
    gewerk: 'fahrwerk',
    label: 'Fahrwerk',
    beschreibung: 'Dämpfer, Federn, Lager, Achsvermessung, Lenkung.',
    stufen: {
      1: { low: 0, expected: 0, high: 0 },
      2: { low: 300, expected: 600, high: 1100 },
      3: { low: 1200, expected: 2200, high: 3600 },
      4: { low: 2800, expected: 4500, high: 7000 },
      5: { low: 5000, expected: 7500, high: 11500 },
    },
  },
  {
    gewerk: 'bremsen',
    label: 'Bremsanlage',
    beschreibung: 'Scheiben, Beläge, Sättel, Leitungen; bei Keramik entsprechend höher.',
    stufen: {
      1: { low: 0, expected: 0, high: 0 },
      2: { low: 250, expected: 500, high: 900 },
      3: { low: 900, expected: 1600, high: 2800 },
      4: { low: 2200, expected: 3600, high: 6000 },
      5: { low: 4500, expected: 7500, high: 13000 },
    },
  },
  {
    gewerk: 'innenraum',
    label: 'Innenraum',
    beschreibung: 'Sitze, Lenkrad, Himmel, Teppich, Verkleidungen, Gerüche.',
    stufen: {
      1: { low: 0, expected: 0, high: 0 },
      2: { low: 300, expected: 650, high: 1200 },
      3: { low: 1200, expected: 2200, high: 3800 },
      4: { low: 3000, expected: 5000, high: 8000 },
      5: { low: 6000, expected: 9500, high: 15000 },
    },
  },
  {
    gewerk: 'elektrik',
    label: 'Elektrik und Elektronik',
    beschreibung: 'Steuergeräte, Sensorik, Komfortelektronik, Kabelbaum, Fehlerspeicher.',
    stufen: {
      1: { low: 0, expected: 0, high: 0 },
      2: { low: 200, expected: 450, high: 900 },
      3: { low: 800, expected: 1600, high: 3000 },
      4: { low: 2200, expected: 3800, high: 6500 },
      5: { low: 4500, expected: 7000, high: 12000 },
    },
  },
  {
    gewerk: 'raeder',
    label: 'Räder und Felgen',
    beschreibung: 'Originalität, Bordsteinschäden, Rundlauf, Zweitradsatz.',
    stufen: {
      1: { low: 0, expected: 0, high: 0 },
      2: { low: 250, expected: 500, high: 900 },
      3: { low: 900, expected: 1500, high: 2600 },
      4: { low: 1800, expected: 2800, high: 4500 },
      5: { low: 3200, expected: 4800, high: 7500 },
    },
  },
  {
    gewerk: 'reifen',
    label: 'Bereifung',
    beschreibung: 'Profiltiefe, Alter, Freigabe, gemischte Fabrikate.',
    stufen: {
      1: { low: 0, expected: 0, high: 0 },
      2: { low: 200, expected: 400, high: 700 },
      3: { low: 700, expected: 1100, high: 1700 },
      4: { low: 1100, expected: 1600, high: 2400 },
      5: { low: 1600, expected: 2200, high: 3200 },
    },
  },
  {
    gewerk: 'originalteile',
    label: 'Rückrüstung auf Originalteile',
    beschreibung:
      'Beschaffung und Montage entfernter Originalteile; bei Umbauten der bestimmende Posten.',
    stufen: {
      1: { low: 0, expected: 0, high: 0 },
      2: { low: 400, expected: 900, high: 1800 },
      3: { low: 1800, expected: 3500, high: 6500 },
      4: { low: 4500, expected: 8000, high: 14000 },
      5: { low: 9000, expected: 15000, high: 26000 },
    },
  },
  {
    gewerk: 'dokumentation',
    label: 'Dokumentation und Zulassung',
    beschreibung:
      'Beschaffung fehlender Unterlagen, Gutachten, Eintragungen, Zulassungshistorie.',
    stufen: {
      1: { low: 0, expected: 0, high: 0 },
      2: { low: 150, expected: 300, high: 600 },
      3: { low: 500, expected: 900, high: 1600 },
      4: { low: 1200, expected: 2000, high: 3200 },
      5: { low: 2200, expected: 3500, high: 5500 },
    },
  },
];

/**
 * Markenfaktor auf Teile- und Stundensätze. Grundlage: 1,0 entspricht einem
 * Volumenhersteller mit guter Teileversorgung.
 */
export const MARKENFAKTOR: Record<string, number> = {
  Porsche: 1.4,
  BMW: 1.15,
  Audi: 1.15,
  Mercedes: 1.2,
};

export function markenfaktor(hersteller: string | null | undefined): number {
  if (!hersteller) return 1;
  return MARKENFAKTOR[hersteller] ?? 1;
}

/**
 * Risikoreserve nach PRD Abschnitt 19.
 *
 * Sie ist kein Sicherheitszuschlag aus Vorsicht, sondern der bezifferte
 * Erfahrungssatz, dass bei zerlegtem Fahrzeug regelmäßig Arbeiten sichtbar
 * werden, die vorher niemand sehen konnte. Der Satz steigt mit der Tiefe des
 * Eingriffs.
 */
export function reservesatz(hoechsteStufe: Zustandsstufe): number {
  switch (hoechsteStufe) {
    case 1:
      return 0.05;
    case 2:
      return 0.08;
    case 3:
      return 0.12;
    case 4:
      return 0.18;
    case 5:
      return 0.25;
  }
}

export function gewerk(id: Gewerk): Gewerkposition {
  const g = GEWERKE.find((x) => x.gewerk === id);
  if (!g) throw new Error(`Unbekanntes Gewerk: ${id}`);
  return g;
}
