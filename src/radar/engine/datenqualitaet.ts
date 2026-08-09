/**
 * Datenqualität — PRD Abschnitt 34.
 *
 * Jedes Datenfeld trägt Quelle, Zeitpunkt und Confidence. Der entscheidende
 * Satz des Abschnitts lautet: „Widersprüche werden gespeichert und nicht still
 * überschrieben."
 *
 * Genau das ist hier umgesetzt. Es gibt keinen Schreibvorgang, der einen
 * früheren Wert ersetzt. Die Konsolidierung wählt für die Anzeige einen
 * führenden Wert aus, aber sie behält alle konkurrierenden Werte samt Herkunft
 * — und markiert den Widerspruch als solchen. Ein Kilometerstand von 91.200 km
 * aus dem Inserat und 91.198 km aus der Bilderkennung ist kein Fehler; ein
 * Kilometerstand von 91.200 km im Inserat und 118.000 km im Serviceheft ist
 * die wichtigste Information über dieses Fahrzeug.
 */

import type {
  Fahrzeugdokument,
  Inserat,
  Nutzerbefund,
  Plattform,
} from '../domain/types';
import { letzteBeobachtung } from './historie';

export interface Datenpunkt {
  feld: string;
  wert: string;
  /** Rohwert für Zahlenvergleiche, sonst `null`. */
  zahl: number | null;
  quelle: string;
  zeitpunkt: string;
  /** 0–100. */
  confidence: number;
}

export interface Feldkonsolidierung {
  feld: string;
  label: string;
  /** Führender Wert: höchste Confidence, bei Gleichstand der jüngste. */
  fuehrend: Datenpunkt;
  alle: Datenpunkt[];
  widerspruch: boolean;
  hinweis: string;
}

/**
 * Confidence je Zugriffsart. Eine offizielle API liefert strukturierte Felder,
 * ein Webzugriff geparste Texte — der Unterschied ist real und wird beziffert.
 */
const QUELLENCONFIDENCE: Record<Plattform['zugriffsart'], number> = {
  api: 92,
  datenfeed: 90,
  partnerzugang: 88,
  'lizenzierter-drittanbieter': 85,
  'technischer-webzugriff': 80,
};

interface FeldAuszug {
  feld: string;
  label: string;
  wert: (i: Inserat) => { text: string; zahl: number | null } | null;
  /** Toleranz, unterhalb derer Zahlenwerte als gleich gelten. */
  toleranz?: number;
}

const FELDER: FeldAuszug[] = [
  {
    feld: 'kilometerstand',
    label: 'Kilometerstand',
    wert: (i) => {
      const km = letzteBeobachtung(i).daten.kilometerstand;
      return km === null ? null : { text: `${km} km`, zahl: km };
    },
    toleranz: 500,
  },
  {
    feld: 'erstzulassung',
    label: 'Erstzulassung',
    wert: (i) => {
      const ez = letzteBeobachtung(i).daten.erstzulassung;
      return ez === null ? null : { text: ez, zahl: null };
    },
  },
  {
    feld: 'vorbesitzer',
    label: 'Vorbesitzer',
    wert: (i) => {
      const v = letzteBeobachtung(i).daten.vorbesitzer;
      return v === null ? null : { text: String(v), zahl: v };
    },
    toleranz: 0,
  },
  {
    feld: 'vin',
    label: 'Fahrgestellnummer',
    wert: (i) => {
      const v = letzteBeobachtung(i).daten.vin;
      return v === null ? null : { text: v, zahl: null };
    },
  },
  {
    feld: 'farbeAussen',
    label: 'Außenfarbe',
    wert: (i) => {
      const f = letzteBeobachtung(i).daten.farbeAussen;
      return f === null ? null : { text: f, zahl: null };
    },
  },
  {
    feld: 'leistungPs',
    label: 'Leistung',
    wert: (i) => {
      const p = letzteBeobachtung(i).daten.leistungPs;
      return p === null ? null : { text: `${p} PS`, zahl: p };
    },
    toleranz: 5,
  },
  {
    feld: 'unfallangabe',
    label: 'Unfallangabe',
    wert: (i) => {
      const u = letzteBeobachtung(i).daten.unfallangabe;
      return u === 'keine-angabe' ? null : { text: u, zahl: null };
    },
  },
  {
    feld: 'servicehistorie',
    label: 'Servicehistorie',
    wert: (i) => {
      const s = letzteBeobachtung(i).daten.servicehistorie;
      return s === 'unbekannt' ? null : { text: s, zahl: null };
    },
  },
];

export function konsolidiere(
  inserate: Inserat[],
  plattformen: Plattform[],
  dokumente: Fahrzeugdokument[],
  nutzerbefunde: Nutzerbefund[],
): Feldkonsolidierung[] {
  const ergebnis: Feldkonsolidierung[] = [];

  for (const feld of FELDER) {
    const punkte: Datenpunkt[] = [];

    for (const inserat of inserate) {
      const wert = feld.wert(inserat);
      if (!wert) continue;
      const p = plattformen.find((x) => x.id === inserat.plattformId);
      punkte.push({
        feld: feld.feld,
        wert: wert.text,
        zahl: wert.zahl,
        quelle: p?.name ?? inserat.plattformId,
        zeitpunkt: letzteBeobachtung(inserat).zeitpunkt,
        confidence: p ? QUELLENCONFIDENCE[p.zugriffsart] : 75,
      });
    }

    // Dokumente liefern für den Kilometerstand einen unabhängigen Beleg.
    if (feld.feld === 'kilometerstand') {
      for (const dok of dokumente) {
        if (dok.extrahiert.kilometerstand === null) continue;
        punkte.push({
          feld: feld.feld,
          wert: `${dok.extrahiert.kilometerstand} km`,
          zahl: dok.extrahiert.kilometerstand,
          quelle: `Dokument: ${dok.bezeichnung}`,
          zeitpunkt: dok.extrahiert.datum ?? dok.hochgeladenAm,
          confidence: dok.confidence,
        });
      }
    }

    // Nutzerbefunde sind Ground Truth (Abschnitt 40) und stehen über allem.
    for (const befund of nutzerbefunde) {
      if (befund.feld !== feld.feld) continue;
      punkte.push({
        feld: feld.feld,
        wert: befund.befundNutzer,
        zahl: null,
        quelle: `Nutzerbefund: ${befund.verfasser}`,
        zeitpunkt: befund.zeitpunkt,
        confidence: 100,
      });
    }

    if (punkte.length === 0) continue;

    const sortiert = [...punkte].sort(
      (a, b) =>
        b.confidence - a.confidence || Date.parse(b.zeitpunkt) - Date.parse(a.zeitpunkt),
    );
    const fuehrend = sortiert[0];

    const widerspruch = punkte.some((p) => {
      if (p === fuehrend) return false;
      if (p.zahl !== null && fuehrend.zahl !== null) {
        return Math.abs(p.zahl - fuehrend.zahl) > (feld.toleranz ?? 0);
      }
      return p.wert.toLowerCase() !== fuehrend.wert.toLowerCase();
    });

    ergebnis.push({
      feld: feld.feld,
      label: feld.label,
      fuehrend,
      alle: sortiert,
      widerspruch,
      hinweis: widerspruch
        ? `Abweichende Angaben aus ${sortiert.length} Quellen — beide Werte bleiben gespeichert.`
        : punkte.length > 1
          ? `${punkte.length} Quellen stimmen überein.`
          : 'Einzelne Quelle.',
    });
  }

  return ergebnis;
}

/** Anteil der Felder ohne Widerspruch — Eingang in den Integrity Score. */
export function konsistenzquote(felder: Feldkonsolidierung[]): number {
  if (felder.length === 0) return 100;
  const ohne = felder.filter((f) => !f.widerspruch).length;
  return Math.round((ohne / felder.length) * 100);
}

/** Mittlere Confidence der führenden Werte. */
export function mittlereConfidence(felder: Feldkonsolidierung[]): number {
  if (felder.length === 0) return 0;
  return Math.round(
    felder.reduce((s, f) => s + f.fuehrend.confidence, 0) / felder.length,
  );
}
