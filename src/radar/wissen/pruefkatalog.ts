/**
 * Prüfkatalog und Verkäuferanfrage — PRD Abschnitte 42 und 43.
 *
 * Beides entsteht aus derselben Quelle: dem allgemeinen Grundkatalog und den
 * modelltypischen Risiken aus `risiken.ts`. Damit ist ausgeschlossen, dass die
 * Prüfliste ein Risiko kennt, nach dem die Verkäuferanfrage nicht fragt — der
 * häufigste Weg, wie in der Praxis genau der eine Punkt untergeht.
 *
 * Die Anfrage wird nie automatisch versendet. PRD Abschnitt 4 nennt das
 * ausdrücklich als Nicht-Ziel; der Versand setzt die Freigabe durch den
 * Benutzer voraus (Abschnitt 42).
 */

import type { Belegart, Getriebe } from '../domain/types';
import { risikenFuer } from './risiken';
import { modell } from './modelle';

export type Pruefbereich =
  | 'identitaet'
  | 'historie'
  | 'karosserie'
  | 'motor'
  | 'antrieb'
  | 'fahrwerk'
  | 'innenraum'
  | 'elektrik'
  | 'unterlagen'
  | 'probefahrt';

export const PRUEFBEREICH_LABEL: Record<Pruefbereich, string> = {
  identitaet: 'Identität',
  historie: 'Historie',
  karosserie: 'Karosserie und Lack',
  motor: 'Motor',
  antrieb: 'Antrieb und Getriebe',
  fahrwerk: 'Fahrwerk und Bremse',
  innenraum: 'Innenraum',
  elektrik: 'Elektrik und Elektronik',
  unterlagen: 'Unterlagen',
  probefahrt: 'Probefahrt',
};

export interface Pruefpunkt {
  id: string;
  bereich: Pruefbereich;
  text: string;
  /** Vor Ort am Fahrzeug oder bereits vorab per Anfrage klärbar. */
  vorOrt: boolean;
  /** Ein nicht bestandener Pflichtpunkt verhindert das Buy Signal. */
  pflicht: boolean;
  /** Woher der Punkt stammt — Grundkatalog oder ein Modellrisiko. */
  herkunft: string;
}

/** Punkte, die für jedes Fahrzeug gelten. */
export const GRUNDKATALOG: Pruefpunkt[] = [
  {
    id: 'id-vin-fahrzeug',
    bereich: 'identitaet',
    text: 'Fahrgestellnummer am Fahrzeug mit Typenschild und Papieren abgleichen.',
    vorOrt: true,
    pflicht: true,
    herkunft: 'Grundkatalog',
  },
  {
    id: 'id-vin-papiere',
    bereich: 'identitaet',
    text: 'Zulassungsbescheinigung Teil I und II auf Vollständigkeit und Echtheit prüfen.',
    vorOrt: true,
    pflicht: true,
    herkunft: 'Grundkatalog',
  },
  {
    id: 'id-schluessel',
    bereich: 'identitaet',
    text: 'Anzahl und Funktion der Schlüssel prüfen; Ersatzschlüssel vorhanden?',
    vorOrt: true,
    pflicht: false,
    herkunft: 'Grundkatalog',
  },
  {
    id: 'hist-km-abgleich',
    bereich: 'historie',
    text: 'Kilometerstand gegen Serviceeinträge, Pickerl-/TÜV-Berichte und frühere Inserate abgleichen.',
    vorOrt: false,
    pflicht: true,
    herkunft: 'Grundkatalog',
  },
  {
    id: 'hist-vorbesitzer',
    bereich: 'historie',
    text: 'Anzahl der Vorbesitzer und Haltedauer aus den Papieren nachvollziehen.',
    vorOrt: true,
    pflicht: false,
    herkunft: 'Grundkatalog',
  },
  {
    id: 'hist-unfall',
    bereich: 'historie',
    text: 'Unfallfreiheit hinterfragen: schriftliche Zusicherung, Lackschichtmessung, Spaltmaße.',
    vorOrt: true,
    pflicht: true,
    herkunft: 'Grundkatalog',
  },
  {
    id: 'kar-lackschicht',
    bereich: 'karosserie',
    text: 'Lackschichtdicke an allen Teilen messen und protokollieren.',
    vorOrt: true,
    pflicht: true,
    herkunft: 'Grundkatalog',
  },
  {
    id: 'kar-spaltmasse',
    bereich: 'karosserie',
    text: 'Spaltmaße rundum prüfen, insbesondere Hauben, Türen, Kotflügel.',
    vorOrt: true,
    pflicht: false,
    herkunft: 'Grundkatalog',
  },
  {
    id: 'kar-unterboden',
    bereich: 'karosserie',
    text: 'Unterboden auf der Hebebühne auf Korrosion, Aufsetzspuren und Instandsetzungen prüfen.',
    vorOrt: true,
    pflicht: true,
    herkunft: 'Grundkatalog',
  },
  {
    id: 'mot-kaltstart',
    bereich: 'motor',
    text: 'Kaltstart beobachten oder Kaltstartvideo anfordern; Geräusche und Rauchbildung dokumentieren.',
    vorOrt: true,
    pflicht: true,
    herkunft: 'Grundkatalog',
  },
  {
    id: 'mot-fehlerspeicher',
    bereich: 'motor',
    text: 'Fehlerspeicher aller Steuergeräte auslesen und ausdrucken lassen.',
    vorOrt: true,
    pflicht: true,
    herkunft: 'Grundkatalog',
  },
  {
    id: 'mot-oel',
    bereich: 'motor',
    text: 'Ölstand, Ölzustand und Ölverbrauch je 1.000 km erfragen und beurteilen.',
    vorOrt: true,
    pflicht: false,
    herkunft: 'Grundkatalog',
  },
  {
    id: 'ant-schaltung',
    bereich: 'antrieb',
    text: 'Alle Gänge im Stand und unter Last schalten; Synchronisation und Kupplung beurteilen.',
    vorOrt: true,
    pflicht: true,
    herkunft: 'Grundkatalog',
  },
  {
    id: 'fw-bremse',
    bereich: 'fahrwerk',
    text: 'Bremsscheibenstärke messen, Beläge und Leitungen beurteilen.',
    vorOrt: true,
    pflicht: false,
    herkunft: 'Grundkatalog',
  },
  {
    id: 'fw-reifen',
    bereich: 'fahrwerk',
    text: 'Reifenalter, Profiltiefe, Fabrikatsmix und Freigabe prüfen.',
    vorOrt: true,
    pflicht: false,
    herkunft: 'Grundkatalog',
  },
  {
    id: 'inn-verschleiss',
    bereich: 'innenraum',
    text: 'Sitzwangen, Lenkrad, Pedale und Schaltknauf gegen den angegebenen Kilometerstand prüfen.',
    vorOrt: true,
    pflicht: true,
    herkunft: 'Grundkatalog',
  },
  {
    id: 'ele-funktion',
    bereich: 'elektrik',
    text: 'Alle Komfort- und Sicherheitsfunktionen durchschalten.',
    vorOrt: true,
    pflicht: false,
    herkunft: 'Grundkatalog',
  },
  {
    id: 'unt-serviceheft',
    bereich: 'unterlagen',
    text: 'Serviceheft und digitale Servicehistorie auf Lückenlosigkeit prüfen.',
    vorOrt: false,
    pflicht: true,
    herkunft: 'Grundkatalog',
  },
  {
    id: 'unt-rechnungen',
    bereich: 'unterlagen',
    text: 'Rechnungssammlung sichten; große Positionen der letzten fünf Jahre zuordnen.',
    vorOrt: false,
    pflicht: false,
    herkunft: 'Grundkatalog',
  },
  {
    id: 'pf-fahrverhalten',
    bereich: 'probefahrt',
    text: 'Probefahrt über mindestens 20 km inklusive Autobahn; Geradeauslauf, Geräusche, Bremsverhalten.',
    vorOrt: true,
    pflicht: true,
    herkunft: 'Grundkatalog',
  },
  {
    id: 'pf-warm',
    bereich: 'probefahrt',
    text: 'Nach der Probefahrt erneut auf Undichtigkeiten und Warmstartverhalten prüfen.',
    vorOrt: true,
    pflicht: false,
    herkunft: 'Grundkatalog',
  },
];

/**
 * Erzeugt die fahrzeugspezifische Prüfliste: Grundkatalog plus je ein Punkt
 * aus jedem einschlägigen Modellrisiko (Abschnitt 20 → Abschnitt 43).
 */
export function pruefliste(
  modellId: string | null,
  baujahr: number | null,
  kilometerstand: number | null,
  getriebe?: Getriebe,
): Pruefpunkt[] {
  const risiken = risikenFuer(modellId, baujahr, kilometerstand, getriebe);
  const ausRisiken: Pruefpunkt[] = risiken.map((r) => ({
    id: `risiko-${r.id}`,
    bereich: bereichFuerBauteil(r.bauteil),
    text: `${r.bezeichnung}: ${r.pruefpunkt}`,
    vorOrt: true,
    pflicht: r.schwere === 'kritisch',
    herkunft: `Modellrisiko ${r.bezeichnung}`,
  }));
  return [...GRUNDKATALOG, ...ausRisiken];
}

function bereichFuerBauteil(bauteil: string): Pruefbereich {
  switch (bauteil) {
    case 'Motor':
    case 'Kühlung':
      return 'motor';
    case 'Getriebe':
    case 'Antrieb':
      return 'antrieb';
    case 'Fahrwerk':
    case 'Bremse':
      return 'fahrwerk';
    case 'Karosserie':
      return 'karosserie';
    default:
      return 'motor';
  }
}

/* ==========================================================================
 * Verkäuferanfrage — Abschnitt 42
 * ======================================================================= */

export interface Anfragepunkt {
  id: string;
  frage: string;
  /** Warum gefragt wird — steht so auch in der Anfrage an den Verkäufer. */
  begruendung: string;
  /** Welche Unterlage die Antwort belegen würde. */
  beleg: Belegart[];
  pflicht: boolean;
}

const ANFRAGE_GRUNDLAGE: Anfragepunkt[] = [
  {
    id: 'anf-vin',
    frage: 'Bitte um die vollständige Fahrgestellnummer (VIN).',
    begruendung:
      'Ohne VIN lassen sich Ausstattung, Produktionsdatum und frühere Inserate nicht gegenprüfen.',
    beleg: ['zulassungshistorie'],
    pflicht: true,
  },
  {
    id: 'anf-vorbesitzer',
    frage: 'Wie viele Vorbesitzer hat das Fahrzeug, und wie lange war der letzte Halter im Besitz?',
    begruendung: 'Haltedauer und Halterzahl sind wesentliche Werttreiber.',
    beleg: ['zulassungshistorie'],
    pflicht: true,
  },
  {
    id: 'anf-unfall',
    frage:
      'Ist das Fahrzeug unfallfrei? Falls Vorschäden bestehen: Umfang, Zeitpunkt und ausführende Werkstatt.',
    begruendung:
      'Die Unfallfreiheit ist die häufigste unbelegte Zusicherung im Markt und muss schriftlich vorliegen.',
    beleg: ['gutachten', 'rechnung'],
    pflicht: true,
  },
  {
    id: 'anf-servicehistorie',
    frage: 'Bitte um Serviceheft bzw. digitale Servicehistorie und die Rechnungssammlung.',
    begruendung: 'Nachweise entscheiden über den Evidence Score und damit über die Bewertung.',
    beleg: ['serviceheft', 'digitale-servicehistorie', 'rechnung'],
    pflicht: true,
  },
  {
    id: 'anf-kaltstart',
    frage: 'Bitte um ein Kaltstartvideo (Motor mindestens acht Stunden gestanden, Ton eingeschaltet).',
    begruendung:
      'Der Kaltstart zeigt Geräusche und Rauchbildung, die im warmen Zustand nicht mehr auffallen.',
    beleg: [],
    pflicht: true,
  },
  {
    id: 'anf-unterboden',
    frage: 'Bitte um Bilder des Unterbodens von der Hebebühne.',
    begruendung: 'Korrosion und Aufsetzspuren sind auf Verkaufsbildern nie zu sehen.',
    beleg: [],
    pflicht: true,
  },
  {
    id: 'anf-umbauten',
    frage: 'Welche Umbauten oder Nachrüstungen wurden vorgenommen? Sind die Originalteile vorhanden?',
    begruendung:
      'Rückrüstung auf Originalzustand ist bei Sammlerfahrzeugen der größte einzelne Kostenblock.',
    beleg: ['rechnung'],
    pflicht: false,
  },
  {
    id: 'anf-maengel',
    frage: 'Welche bekannten Mängel bestehen aktuell?',
    begruendung: 'Offen genannte Mängel erhöhen die Angebotstransparenz und damit den Integrity Score.',
    beleg: [],
    pflicht: false,
  },
  {
    id: 'anf-besichtigung',
    frage: 'Ist eine Besichtigung mit Hebebühne und eigenem Sachverständigen möglich?',
    begruendung: 'Ein ablehnender Verkäufer ist ein eigenständiges Signal.',
    beleg: [],
    pflicht: true,
  },
];

/**
 * Fahrzeugspezifische Anfrageliste: Grundfragen plus je eine Frage aus jedem
 * einschlägigen Modellrisiko. Bei einem E92 M3 stehen so Pleuellager,
 * Drosselklappensteller und DKG-Service automatisch mit in der Anfrage —
 * genau das Beispiel aus Abschnitt 42.
 */
export function verkaeuferanfrage(
  modellId: string | null,
  baujahr: number | null,
  kilometerstand: number | null,
  getriebe?: Getriebe,
): Anfragepunkt[] {
  const risiken = risikenFuer(modellId, baujahr, kilometerstand, getriebe);
  const ausRisiken: Anfragepunkt[] = risiken.map((r) => ({
    id: `anf-risiko-${r.id}`,
    frage: r.frageAnVerkaeufer,
    begruendung: `${r.bezeichnung} — ${r.beschreibung}`,
    beleg: r.entkraeftetDurch,
    pflicht: r.schwere === 'kritisch' || r.schwere === 'hoch',
  }));
  return [...ANFRAGE_GRUNDLAGE, ...ausRisiken];
}

/** Anschreiben zur Anfrage — der Benutzer gibt es vor dem Versand frei. */
export function anfragetext(
  bezeichnung: string,
  punkte: Anfragepunkt[],
  absender: string,
): string {
  const zeilen = punkte.map((p, i) => `${i + 1}. ${p.frage}`);
  return [
    `Betreff: Anfrage zu Ihrem Angebot — ${bezeichnung}`,
    '',
    'Guten Tag,',
    '',
    `wir interessieren uns für das von Ihnen angebotene Fahrzeug (${bezeichnung}) und`,
    'bitten vorab um einige Angaben, damit wir eine Besichtigung sinnvoll vorbereiten können:',
    '',
    ...zeilen,
    '',
    'Für Unterlagen genügt eine Übermittlung als Scan oder Foto.',
    'Vielen Dank für Ihre Rückmeldung.',
    '',
    'Mit freundlichen Grüßen',
    absender,
  ].join('\n');
}

/** Bezeichnung eines Modells für die Anfrage. */
export function anfrageBezeichnung(modellId: string | null): string {
  const m = modell(modellId);
  return m ? `${m.hersteller} ${m.modell} ${m.baureihe}` : 'Fahrzeug';
}
