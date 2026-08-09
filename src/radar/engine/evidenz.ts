/**
 * Evidence Score — PRD Abschnitt 13.
 *
 * „Der Evidence Score bewertet nicht, was behauptet wird, sondern wie gut
 * Aussagen belegt sind."
 *
 * Das ist die schärfste Trennung im ganzen Produkt. Ein Inserat mit dem Satz
 * „Pleuellager bei 82.400 km gewechselt" und einer Werkstattrechnung dazu ist
 * ein anderes Fahrzeug als ein Inserat mit demselben Satz ohne Rechnung —
 * obwohl beide Inserate denselben Text tragen und jeder Preisvergleich sie
 * gleich behandelt.
 *
 * Die Engine sammelt daher zuerst alle belegfähigen Behauptungen (aus der Text
 * Intelligence Engine und den strukturierten Feldern) und prüft dann für jede
 * einzelne, ob eine hinterlegte Unterlage sie deckt. Eine im Inserat nur
 * *genannte* Unterlage deckt nichts — sie ist selbst eine Behauptung.
 */

import type { Belegart, Fahrzeugdokument, InseratDaten } from '../domain/types';
import { baueScore, komponente, standardEinstufung, type Beitrag, type Score } from './erklaerung';
import type { EvidenzKomponente } from './gewichte';
import { EVIDENZ_LABEL } from './gewichte';
import type { Behauptung } from './text';

export const BELEGART_LABEL: Record<Belegart, string> = {
  serviceheft: 'Serviceheft',
  'digitale-servicehistorie': 'Digitale Servicehistorie',
  rechnung: 'Rechnung',
  pickerlbericht: 'Pickerlbericht (§ 57a)',
  'tuev-bericht': 'TÜV-Bericht',
  gutachten: 'Gutachten',
  zulassungshistorie: 'Zulassungshistorie',
  importdokument: 'Importdokument',
  motorrechnung: 'Motorrechnung',
  getrieberechnung: 'Getrieberechnung',
  messprotokoll: 'Messprotokoll',
  vorbesitzerunterlagen: 'Vorbesitzerunterlagen',
  kaufvertrag: 'Kaufvertrag',
  diagnosebericht: 'Diagnosebericht',
};

export interface Belegpruefung {
  behauptung: Behauptung;
  gedeckt: boolean;
  /** Dokument, das die Behauptung deckt. */
  beleg: Fahrzeugdokument | null;
  bewertung: string;
}

export interface Evidenzergebnis {
  score: Score;
  pruefungen: Belegpruefung[];
  /** Anteil der gedeckten Behauptungen, gewichtet. */
  deckungsquote: number;
  /** Was zur Verbesserung fehlt — geht in die Verkäuferanfrage ein. */
  fehlendeBelege: { behauptung: string; benoetigt: Belegart[] }[];
}

/** Deckt ein Dokument eine Behauptung? */
function deckt(dokument: Fahrzeugdokument, behauptung: Behauptung): boolean {
  if (!behauptung.benoetigterBeleg.includes(dokument.art)) return false;
  // Ein Dokument, das ausdrücklich einer Behauptung zugeordnet wurde, deckt sie.
  if (dokument.belegtBehauptungen.includes(behauptung.text)) return true;
  // Sonst genügt eine Übereinstimmung in den extrahierten Leistungen.
  const stichworte = behauptung.text
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length >= 5);
  return dokument.extrahiert.leistungen.some((l) =>
    stichworte.some((s) => l.toLowerCase().includes(s.slice(0, 7))),
  );
}

export interface Evidenzeingang {
  daten: InseratDaten;
  behauptungen: Behauptung[];
  dokumente: Fahrzeugdokument[];
  /** Aktueller Kilometerstand, für die Aktualitätsprüfung der Belege. */
  kilometerstand: number | null;
  gewichte: Record<EvidenzKomponente, number>;
}

export function bewerteEvidenz(e: Evidenzeingang): Evidenzergebnis {
  const g = e.gewichte;
  const vorhanden = new Set(e.dokumente.map((d) => d.art));
  const genannt = new Set(e.daten.genannteUnterlagen);

  /* -- Deckung der einzelnen Behauptungen -------------------------------- */
  const pruefungen: Belegpruefung[] = e.behauptungen.map((b) => {
    const beleg = e.dokumente.find((d) => deckt(d, b)) ?? null;
    return {
      behauptung: b,
      gedeckt: beleg !== null,
      beleg,
      bewertung: beleg
        ? `Belegt durch ${BELEGART_LABEL[beleg.art]} „${beleg.bezeichnung}"${
            beleg.extrahiert.kilometerstand !== null
              ? ` (bei ${beleg.extrahiert.kilometerstand.toLocaleString('de-AT')} km)`
              : ''
          }.`
        : b.benoetigterBeleg.length === 0
          ? 'Nicht belegfähig.'
          : `Unbelegt — erforderlich wäre: ${b.benoetigterBeleg.map((x) => BELEGART_LABEL[x]).join(' oder ')}.`,
    };
  });

  const gewichtSumme = pruefungen.reduce((s, p) => s + p.behauptung.gewicht, 0);
  const gedecktSumme = pruefungen
    .filter((p) => p.gedeckt)
    .reduce((s, p) => s + p.behauptung.gewicht, 0);
  const deckungsquote = gewichtSumme === 0 ? 0 : (gedecktSumme / gewichtSumme) * 100;

  const deckungsBeitraege: Beitrag[] = [];
  if (pruefungen.length === 0) {
    deckungsBeitraege.push({
      text: 'Das Inserat stellt keine belegfähigen Behauptungen auf. Ohne Behauptung gibt es nichts zu belegen — und nichts, worauf man sich stützen könnte.',
      delta: -35,
    });
  } else {
    deckungsBeitraege.push({
      text: `${pruefungen.filter((p) => p.gedeckt).length} von ${pruefungen.length} Behauptungen sind durch Unterlagen gedeckt (gewichtet ${Math.round(deckungsquote)} %).`,
      delta: null,
    });
    for (const p of pruefungen) {
      deckungsBeitraege.push({
        text: `${p.behauptung.text}: ${p.bewertung}`,
        delta: p.gedeckt ? 4 * p.behauptung.gewicht : -6 * p.behauptung.gewicht,
        quelle: p.behauptung.fundstelle,
      });
    }
  }
  const behauptungsdeckung = komponente(
    'behauptungsdeckung',
    EVIDENZ_LABEL.behauptungsdeckung,
    g.behauptungsdeckung,
    pruefungen.length === 0 ? 50 : 45,
    deckungsBeitraege,
  );

  /* -- Servicenachweis --------------------------------------------------- */
  const serviceBeitraege: Beitrag[] = [];
  const serviceDokumente = e.dokumente.filter(
    (d) => d.art === 'serviceheft' || d.art === 'digitale-servicehistorie',
  );
  if (serviceDokumente.length > 0) {
    serviceBeitraege.push({
      text: `${serviceDokumente.map((d) => BELEGART_LABEL[d.art]).join(', ')} liegt vor.`,
      delta: 55,
    });
    const letzterService = serviceDokumente
      .map((d) => d.extrahiert.kilometerstand)
      .filter((k): k is number => k !== null)
      .sort((a, b) => b - a)[0];
    if (letzterService !== undefined && e.kilometerstand !== null) {
      const abstand = e.kilometerstand - letzterService;
      serviceBeitraege.push({
        text: `Letzter dokumentierter Service bei ${letzterService.toLocaleString('de-AT')} km, aktuell ${e.kilometerstand.toLocaleString('de-AT')} km.`,
        delta: abstand > 30000 ? -18 : abstand > 15000 ? -8 : 8,
      });
    }
  } else if (
    genannt.has('serviceheft') ||
    genannt.has('digitale-servicehistorie') ||
    e.daten.servicehistorie === 'lueckenlos'
  ) {
    serviceBeitraege.push({
      text: 'Servicehistorie wird behauptet, liegt aber nicht vor. Die Behauptung ist damit selbst unbelegt.',
      delta: 10,
    });
  } else {
    serviceBeitraege.push({
      text: 'Kein Servicenachweis genannt und keiner vorgelegt.',
      delta: -20,
    });
  }
  const rechnungen = e.dokumente.filter(
    (d) => d.art === 'rechnung' || d.art === 'motorrechnung' || d.art === 'getrieberechnung',
  );
  if (rechnungen.length >= 3) {
    serviceBeitraege.push({
      text: `${rechnungen.length} Einzelrechnungen ergänzen die Servicehistorie.`,
      delta: 12,
    });
  }
  const servicenachweis = komponente(
    'servicenachweis',
    EVIDENZ_LABEL.servicenachweis,
    g.servicenachweis,
    30,
    serviceBeitraege,
  );

  /* -- Reparaturnachweis ------------------------------------------------- */
  const repBeitraege: Beitrag[] = [];
  if (rechnungen.length === 0) {
    repBeitraege.push({ text: 'Keine Reparaturrechnungen hinterlegt.', delta: -25 });
  } else {
    const summe = rechnungen.reduce((s, r) => s + (r.extrahiert.kostenEuro ?? 0), 0);
    repBeitraege.push({
      text: `${rechnungen.length} Rechnungen über zusammen ${summe.toLocaleString('de-AT')} €.`,
      delta: Math.min(45, rechnungen.length * 12),
    });
    const grosse = rechnungen.filter((r) => (r.extrahiert.kostenEuro ?? 0) >= 1500);
    if (grosse.length > 0) {
      repBeitraege.push({
        text: `Darunter ${grosse.length} größere Arbeiten: ${grosse.map((r) => r.bezeichnung).join(', ')}.`,
        delta: 12,
      });
    }
    const ohneKm = rechnungen.filter((r) => r.extrahiert.kilometerstand === null).length;
    if (ohneKm > 0) {
      repBeitraege.push({
        text: `${ohneKm} Rechnungen ohne Kilometerangabe — sie lassen sich der Historie nicht zuordnen.`,
        delta: -8,
      });
    }
  }
  const reparaturnachweis = komponente(
    'reparaturnachweis',
    EVIDENZ_LABEL.reparaturnachweis,
    g.reparaturnachweis,
    45,
    repBeitraege,
  );

  /* -- Zustandsnachweis durch Dritte ------------------------------------- */
  const zBeitraege: Beitrag[] = [];
  const dritte: Belegart[] = ['gutachten', 'pickerlbericht', 'tuev-bericht', 'messprotokoll', 'diagnosebericht'];
  const vorhandeneDritte = dritte.filter((a) => vorhanden.has(a));
  if (vorhandeneDritte.length === 0) {
    zBeitraege.push({
      text: 'Keine Zustandsbeurteilung durch einen Dritten vorhanden.',
      delta: -20,
    });
  } else {
    zBeitraege.push({
      text: `Vorhanden: ${vorhandeneDritte.map((a) => BELEGART_LABEL[a]).join(', ')}.`,
      delta: Math.min(50, vorhandeneDritte.length * 20),
    });
  }
  const zustandsnachweis = komponente(
    'zustandsnachweis',
    EVIDENZ_LABEL.zustandsnachweis,
    g.zustandsnachweis,
    45,
    zBeitraege,
  );

  /* -- Herkunfts- und Zulassungsnachweis --------------------------------- */
  const hBeitraege: Beitrag[] = [];
  const herkunft: Belegart[] = ['zulassungshistorie', 'importdokument', 'vorbesitzerunterlagen', 'kaufvertrag'];
  const vorhandeneHerkunft = herkunft.filter((a) => vorhanden.has(a));
  if (vorhandeneHerkunft.length > 0) {
    hBeitraege.push({
      text: `Vorhanden: ${vorhandeneHerkunft.map((a) => BELEGART_LABEL[a]).join(', ')}.`,
      delta: Math.min(45, vorhandeneHerkunft.length * 22),
    });
  } else {
    hBeitraege.push({ text: 'Keine Unterlagen zur Zulassungs- oder Besitzhistorie.', delta: -18 });
  }
  if (e.daten.vin === null) {
    hBeitraege.push({
      text: 'Ohne Fahrgestellnummer lässt sich die Herkunft nicht unabhängig prüfen.',
      delta: -15,
    });
  }
  if (e.daten.fahrzeugland && !['DE', 'AT', 'CH'].includes(e.daten.fahrzeugland) && !vorhanden.has('importdokument')) {
    hBeitraege.push({
      text: `Fahrzeug aus ${e.daten.fahrzeugland}, aber kein Importdokument hinterlegt.`,
      delta: -15,
    });
  }
  const herkunftsnachweis = komponente(
    'herkunftsnachweis',
    EVIDENZ_LABEL.herkunftsnachweis,
    g.herkunftsnachweis,
    50,
    hBeitraege,
  );

  const score = baueScore(
    [
      behauptungsdeckung,
      servicenachweis,
      reparaturnachweis,
      zustandsnachweis,
      herkunftsnachweis,
    ],
    standardEinstufung,
    {
      datenbasis: e.dokumente.length === 0 ? 45 : Math.min(100, 55 + e.dokumente.length * 9),
      hinweise:
        e.dokumente.length === 0
          ? [
              'Es liegen keine Unterlagen vor. Der Score bewertet damit ausschließlich die Belegsituation, nicht den Zustand des Fahrzeuges.',
            ]
          : [],
    },
  );

  return {
    score,
    pruefungen,
    deckungsquote,
    fehlendeBelege: pruefungen
      .filter((p) => !p.gedeckt && p.behauptung.benoetigterBeleg.length > 0)
      .map((p) => ({
        behauptung: p.behauptung.text,
        benoetigt: p.behauptung.benoetigterBeleg,
      })),
  };
}
