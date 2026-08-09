/**
 * Market Valuation Engine — PRD Abschnitt 16.
 *
 * „Die Marktwertberechnung darf nicht auf einfachen Durchschnittspreisen
 * basieren." Der Grund ist einfach: Der Durchschnitt eines Modells beschreibt
 * kein Fahrzeug. Ein 996 C4S mit 90.000 km, Handschaltung und lückenloser
 * Historie und ein 996 C4S mit 190.000 km, Automatik und offenem Vorschaden
 * teilen sich einen Durchschnitt, den keiner von beiden je erzielen wird.
 *
 * Die Engine geht deshalb in zwei Schritten vor:
 *
 *   1. Anker — der Medianpreis der passenden Kilometerklasse aus der
 *      Marktreihe (Abschnitt 17). Damit ist die Laufleistung nicht geschätzt,
 *      sondern beobachtet.
 *   2. Faktoren — benannte, multiplikative Zuschläge und Abschläge für alles,
 *      was das konkrete Fahrzeug vom Klassenmedian unterscheidet.
 *
 * Jeder Faktor trägt seine Begründung und seine Wirkung in Euro. Das
 * Konfidenzintervall entsteht nicht aus einer Faustregel, sondern aus der
 * tatsächlichen Vergleichsbasis: Je dünner der Markt und je mehr Angaben
 * fehlen, desto breiter das Intervall.
 */

import type { InseratDaten, Verkaeuferart } from '../domain/types';
import { begrenze, rundeAuf } from '../domain/format';
import type { Modelldefinition } from '../wissen/modelle';
import {
  aktuellerMonat,
  type Kilometerklasse,
  type Marktreihe,
} from '../wissen/marktdaten';

export interface Wertfaktor {
  schluessel: string;
  label: string;
  /** Multiplikativer Faktor, 1,0 = keine Wirkung. */
  faktor: number;
  /** Wirkung in Euro, bezogen auf den Wert vor diesem Faktor. */
  wirkung: number;
  begruendung: string;
}

export type Liquiditaet = 'hoch' | 'mittel' | 'gering';

export interface Marktbewertung {
  /** Fair Market Value, gerundet auf 100 €. */
  fairValue: number;
  intervall: [number, number];
  angebotspreis: number;
  abweichungEuro: number;
  abweichungProzent: number;
  ankerwert: number;
  ankerherkunft: string;
  faktoren: Wertfaktor[];
  liquiditaet: Liquiditaet;
  /** Erwartete Standzeit dieses Fahrzeuges in Tagen. */
  standzeitTage: number;
  /** Zahl der Vergleichsfahrzeuge, auf denen der Anker beruht. */
  vergleichsbasis: number;
  /** 0–100: wie belastbar die Bewertung ist. */
  konfidenz: number;
  hinweise: string[];
}

/** Farben, die im jeweiligen Segment nachweislich Aufschläge erzielen. */
const GESUCHTE_FARBEN =
  /(interlagos|laguna|imola|estoril|monte\s?carlo|sepang|misano|nogaro|sepangblau|riviera|speed\s?gelb|speedgelb|arktis|karmin|gtsilber|basalt(schwarz)?|schwarz\s?uni|nardo)/i;

/** Farben mit erhöhtem Angebotsanteil und entsprechendem Abschlag. */
const HAEUFIGE_FARBEN = /(alpinweiß|silber|silbergrau|grau\s?metallic|titansilber|eisgrau)/i;

function kilometerklasse(
  reihe: Marktreihe,
  km: number,
): Kilometerklasse | undefined {
  return reihe.nachKilometerklasse.find(
    (k) => km >= k.von && (k.bis === null || km < k.bis),
  );
}

function verkaeuferFaktor(art: Verkaeuferart): { faktor: number; text: string } {
  switch (art) {
    case 'haendler':
      return {
        faktor: 1.03,
        text: 'Händlerangebot — Gewährleistung und Aufbereitung sind im Preisniveau enthalten.',
      };
    case 'auktionshaus':
      return {
        faktor: 0.95,
        text: 'Auktionsware — Zuschlagspreise liegen unter vergleichbaren Festpreisangeboten.',
      };
    case 'privat':
      return { faktor: 1.0, text: 'Privatangebot — Referenzniveau der Marktreihe.' };
    default:
      return { faktor: 0.99, text: 'Verkäuferart nicht bestimmbar — leichter Abschlag.' };
  }
}

export interface Bewertungseingang {
  daten: InseratDaten;
  modell: Modelldefinition | undefined;
  reihe: Marktreihe | undefined;
  /** Markttrend aus dem Momentum-Score, in Prozent. */
  trendProzent: number;
  /** Wie lange das Fahrzeug bereits am Markt ist. */
  angebotsdauerTage: number;
  /** Baujahr aus Erstzulassung oder Produktionsjahr. */
  baujahr: number | null;
  /** Erkannte Leistungssteigerung o. Ä. aus der Textanalyse. */
  tuningErkannt: boolean;
  /** Summe der erwarteten offenen Instandsetzung aus der Risikoanalyse. */
  offenerInstandsetzungsbedarf: number;
}

export function bewerteMarkt(eingang: Bewertungseingang): Marktbewertung {
  const { daten, modell, reihe } = eingang;
  const hinweise: string[] = [];
  const faktoren: Wertfaktor[] = [];

  /* -- Schritt 1: Anker ------------------------------------------------- */
  let anker: number;
  let ankerherkunft: string;
  let vergleichsbasis = 0;

  const klasse =
    reihe && daten.kilometerstand !== null
      ? kilometerklasse(reihe, daten.kilometerstand)
      : undefined;

  if (reihe && klasse) {
    anker = klasse.medianPreis;
    vergleichsbasis = klasse.anzahl;
    ankerherkunft = `Medianpreis der Kilometerklasse ${klasse.label} aus der Marktreihe „${reihe.variante.label}" (${klasse.anzahl} Vergleichsfahrzeuge).`;
  } else if (reihe) {
    const monat = aktuellerMonat(reihe);
    anker = monat.medianPreis;
    vergleichsbasis = monat.angebote;
    ankerherkunft = `Medianpreis der Marktreihe „${reihe.variante.label}" im Monat ${monat.monat}.`;
    hinweise.push(
      'Kein Kilometerstand angegeben — der Anker beruht auf dem Gesamtmedian der Variante.',
    );
  } else if (modell) {
    const b = modell.bewertung;
    const km = daten.kilometerstand ?? b.referenzKm;
    anker = Math.max(
      b.bodenwert,
      b.basispreis - ((km - b.referenzKm) / 1000) * b.kmAbschlagJe1000,
    );
    vergleichsbasis = 0;
    ankerherkunft = `Keine Marktreihe verfügbar — Anker aus der Bewertungsbasis des Modellkatalogs (${b.basispreis} € bei ${b.referenzKm} km).`;
    hinweise.push('Keine beobachtete Marktreihe: Die Bewertung stützt sich auf Katalogparameter.');
  } else {
    // Ohne Modellzuordnung gibt es keinen Marktwert. Ein geschätzter Wert wäre
    // hier schädlicher als gar keiner.
    return {
      fairValue: 0,
      intervall: [0, 0],
      angebotspreis: daten.preis,
      abweichungEuro: 0,
      abweichungProzent: 0,
      ankerwert: 0,
      ankerherkunft: 'Kein Katalogmodell zugeordnet.',
      faktoren: [],
      liquiditaet: 'gering',
      standzeitTage: 0,
      vergleichsbasis: 0,
      konfidenz: 0,
      hinweise: [
        'Fahrzeug konnte keinem Katalogmodell zugeordnet werden — es wird kein Marktwert ausgewiesen.',
      ],
    };
  }

  let wert = anker;
  const anwenden = (
    schluessel: string,
    label: string,
    faktor: number,
    begruendung: string,
  ) => {
    if (Math.abs(faktor - 1) < 0.0005) return;
    const wirkung = wert * (faktor - 1);
    faktoren.push({ schluessel, label, faktor, wirkung, begruendung });
    wert *= faktor;
  };

  /* -- Schritt 2: Faktoren ---------------------------------------------- */

  // Baujahr gegenüber dem Median der Reihe.
  if (reihe && eingang.baujahr !== null && reihe.nachBaujahr.length > 0) {
    const eintrag = reihe.nachBaujahr.find((b) => b.baujahr === eingang.baujahr);
    const mittelwert =
      reihe.nachBaujahr.reduce((s, b) => s + b.medianPreis * b.anzahl, 0) /
      reihe.nachBaujahr.reduce((s, b) => s + b.anzahl, 0);
    if (eintrag && mittelwert > 0) {
      const f = begrenze(eintrag.medianPreis / mittelwert, 0.85, 1.2);
      anwenden(
        'baujahr',
        `Baujahr ${eingang.baujahr}`,
        f,
        `Fahrzeuge des Baujahres ${eingang.baujahr} erzielen in der Reihe ${((f - 1) * 100).toFixed(1)} % gegenüber dem Baujahrsmittel.`,
      );
    } else if (!eintrag) {
      hinweise.push(
        `Für Baujahr ${eingang.baujahr} liegen in der Marktreihe keine Vergleichspreise vor.`,
      );
    }
  }

  // Getriebe.
  if (modell) {
    const f = modell.bewertung.getriebeFaktor[daten.getriebe];
    if (f !== undefined) {
      anwenden(
        'getriebe',
        `Getriebe: ${daten.getriebe}`,
        f,
        f > 1
          ? 'Diese Getriebevariante wird im Markt mit Aufschlag gehandelt.'
          : 'Diese Getriebevariante wird im Markt mit Abschlag gehandelt.',
      );
    } else if (daten.getriebe === 'unbekannt') {
      hinweise.push('Getriebeart nicht angegeben — preisbildendes Merkmal fehlt.');
    }
  }

  // Ausstattung.
  if (modell) {
    const treffer: string[] = [];
    let gesamt = 1;
    for (const [merkmal, faktor] of Object.entries(modell.bewertung.ausstattungsFaktor)) {
      if (daten.ausstattung.includes(merkmal)) {
        treffer.push(merkmal);
        gesamt *= faktor;
      }
    }
    // Deckelung: Ausstattung trägt einen Aufpreis, ersetzt aber kein besseres Auto.
    gesamt = begrenze(gesamt, 0.94, 1.1);
    if (treffer.length > 0) {
      anwenden(
        'ausstattung',
        'Wertrelevante Ausstattung',
        gesamt,
        `Berücksichtigt: ${treffer.join(', ')}.`,
      );
    }
  }

  // Servicehistorie.
  {
    const tabelle: Record<InseratDaten['servicehistorie'], [number, string]> = {
      lueckenlos: [1.05, 'Lückenlose Servicehistorie — im Markt durchgehend mit Aufschlag bewertet.'],
      teilweise: [0.99, 'Teilweise dokumentierte Servicehistorie.'],
      keine: [0.9, 'Keine Servicehistorie — im Segment der stärkste einzelne Abschlag nach dem Unfallschaden.'],
      unbekannt: [0.96, 'Keine Angabe zur Servicehistorie — bis zum Nachweis mit Abschlag bewertet.'],
    };
    const [f, text] = tabelle[daten.servicehistorie];
    anwenden('servicehistorie', 'Servicehistorie', f, text);
  }

  // Unfallhistorie.
  {
    const tabelle: Record<InseratDaten['unfallangabe'], [number, string]> = {
      unfallfrei: [1.0, 'Unfallfreiheit zugesichert — Referenzannahme der Marktreihe.'],
      'unfallfrei-laut-vorbesitzer': [
        0.98,
        'Unfallfreiheit nur weitergegeben, nicht zugesichert.',
      ],
      'vorschaden-repariert': [0.9, 'Reparierter Vorschaden — dauerhafter Marktabschlag.'],
      unfallschaden: [0.72, 'Offener Unfallschaden.'],
      'keine-angabe': [0.95, 'Keine Angabe zur Unfallfreiheit — Risikoabschlag bis zur Klärung.'],
    };
    const [f, text] = tabelle[daten.unfallangabe];
    anwenden('unfall', 'Unfallhistorie', f, text);
  }

  // Vorbesitzer.
  if (daten.vorbesitzer !== null) {
    const f =
      daten.vorbesitzer <= 1
        ? 1.03
        : daten.vorbesitzer === 2
          ? 1.0
          : daten.vorbesitzer === 3
            ? 0.985
            : 0.96;
    anwenden(
      'vorbesitzer',
      `${daten.vorbesitzer} Vorbesitzer`,
      f,
      daten.vorbesitzer <= 1
        ? 'Erstbesitz oder ein Vorbesitzer — im Sammlersegment ein eigenständiger Werttreiber.'
        : daten.vorbesitzer >= 4
          ? 'Viele Halter deuten auf kurze Haltedauern und uneinheitliche Pflege.'
          : 'Übliche Halterzahl.',
    );
  } else {
    hinweise.push('Halterzahl nicht angegeben.');
  }

  // Originalität.
  if (eingang.tuningErkannt) {
    anwenden(
      'originalitaet',
      'Leistungssteigerung / Umbau',
      0.92,
      'Erkannte Leistungssteigerung oder Umbau — im Sammlersegment wertmindernd, unabhängig von der Ausführungsqualität.',
    );
  }

  // Farbe.
  if (daten.farbeAussen) {
    if (GESUCHTE_FARBEN.test(daten.farbeAussen)) {
      anwenden(
        'farbe',
        `Farbe ${daten.farbeAussen}`,
        1.03,
        'Gesuchte Farbe des Segments — kürzere Standzeit und Preisaufschlag.',
      );
    } else if (HAEUFIGE_FARBEN.test(daten.farbeAussen)) {
      anwenden(
        'farbe',
        `Farbe ${daten.farbeAussen}`,
        0.985,
        'Häufige Farbe mit hohem Angebotsanteil.',
      );
    }
  }

  // Land und Herkunft.
  if (daten.fahrzeugland && !['DE', 'AT', 'CH'].includes(daten.fahrzeugland)) {
    anwenden(
      'herkunft',
      `Fahrzeugland ${daten.fahrzeugland}`,
      daten.fahrzeugland === 'US' ? 0.9 : 0.97,
      daten.fahrzeugland === 'US'
        ? 'US-Import: abweichende Ausstattung, eigener Zulassungsweg, engerer Käuferkreis.'
        : 'Import außerhalb des DACH-Raums — Historie schwerer nachvollziehbar.',
    );
  }

  // Verkäuferart.
  {
    const { faktor, text } = verkaeuferFaktor(daten.verkaeuferArt);
    anwenden('verkaeuferart', 'Verkäuferart', faktor, text);
  }

  // Angebotsdauer — der Markt hat bereits abgestimmt.
  if (eingang.angebotsdauerTage > 120) {
    anwenden(
      'angebotsdauer',
      'Angebotsdauer',
      0.97,
      `Seit ${eingang.angebotsdauerTage} Tagen am Markt — der Preis wurde vom Markt bislang nicht bestätigt.`,
    );
  }

  // Markttrend aus dem Momentum-Score.
  if (Math.abs(eingang.trendProzent) >= 0.5) {
    anwenden(
      'markttrend',
      'Markttrend',
      1 + eingang.trendProzent / 100,
      `Market Momentum der Variante: ${eingang.trendProzent > 0 ? '+' : ''}${eingang.trendProzent.toFixed(1)} % auf das Preisniveau.`,
    );
  }

  // Bekannter offener Instandsetzungsbedarf mindert den Wert — aber nur zum
  // Teil. Der Anker ist der Median seiner Kilometerklasse, und dieser Median
  // trägt bereits den üblichen Nachholbedarf eines Fahrzeuges dieses Alters in
  // sich. Voll abgezogen würde derselbe Umstand zweimal bewertet; abgezogen
  // wird deshalb nur der Anteil, um den dieses Fahrzeug über dem Üblichen liegt.
  const ANTEIL_UEBER_MARKTUEBLICH = 0.45;
  if (eingang.offenerInstandsetzungsbedarf > 0) {
    const abzug = Math.min(
      eingang.offenerInstandsetzungsbedarf * ANTEIL_UEBER_MARKTUEBLICH,
      wert * 0.2,
    );
    faktoren.push({
      schluessel: 'instandsetzung',
      label: 'Erwarteter offener Instandsetzungsbedarf',
      faktor: 1 - abzug / wert,
      wirkung: -abzug,
      begruendung: `Modelltypische Arbeiten, die nach Laufleistung fällig und nicht als erledigt belegt sind (Erwartungswert ${Math.round(eingang.offenerInstandsetzungsbedarf).toLocaleString('de-AT')} €). Angesetzt wird der Anteil über dem marktüblichen Nachholbedarf.`,
    });
    wert -= abzug;
  }

  // Gesamtdeckelung gegen den Anker: Kein Fahrzeug ist allein durch
  // Ausstattung, Farbe und Verkäuferart ein Drittel mehr wert als der Median
  // seiner Kilometerklasse. Die Einzelfaktoren sind jeder für sich vertretbar,
  // ihr Produkt ist es nicht mehr.
  const untergrenze = anker * 0.55;
  const obergrenze = anker * 1.32;
  if (wert > obergrenze || wert < untergrenze) {
    const gedeckelt = begrenze(wert, untergrenze, obergrenze);
    hinweise.push(
      `Die Summe der Einzelfaktoren ergäbe ${Math.round(wert).toLocaleString('de-AT')} €. Der Wert ist auf ${Math.round(gedeckelt).toLocaleString('de-AT')} € begrenzt — höchstens 32 % über und 45 % unter dem Median der Vergleichsklasse.`,
    );
    wert = gedeckelt;
  }

  /* -- Schritt 3: Intervall und Konfidenz ------------------------------- */
  const fairValue = rundeAuf(Math.max(wert, modell?.bewertung.bodenwert ?? 0), 100);

  // Das Intervall wird breiter, je dünner die Vergleichsbasis und je mehr
  // preisbildende Angaben fehlen.
  const fehlendeAngaben = [
    daten.kilometerstand === null,
    daten.erstzulassung === null,
    daten.vorbesitzer === null,
    daten.getriebe === 'unbekannt',
    daten.servicehistorie === 'unbekannt',
    daten.unfallangabe === 'keine-angabe',
    daten.farbeAussen === null,
  ].filter(Boolean).length;

  const basisbreite = vergleichsbasis >= 25 ? 0.05 : vergleichsbasis >= 10 ? 0.075 : 0.11;
  const breite = begrenze(basisbreite + fehlendeAngaben * 0.012, 0.05, 0.2);

  const konfidenz = Math.round(
    begrenze(
      100 -
        fehlendeAngaben * 7 -
        (vergleichsbasis >= 25 ? 0 : vergleichsbasis >= 10 ? 10 : 22) -
        (reihe ? 0 : 15),
      10,
      98,
    ),
  );

  const abweichungEuro = daten.preis - fairValue;
  const abweichungProzent = fairValue > 0 ? (abweichungEuro / fairValue) * 100 : 0;

  const dichte = modell?.bewertung.angebotsdichte ?? 0;
  const standzeitBasis = modell?.bewertung.standzeitTage ?? 90;
  const liquiditaet: Liquiditaet =
    dichte >= 100 && standzeitBasis <= 80
      ? 'hoch'
      : dichte >= 40
        ? 'mittel'
        : 'gering';

  // Ein Fahrzeug über Marktwert steht länger, eines darunter kürzer.
  const standzeitTage = Math.round(
    begrenze(standzeitBasis * (1 + abweichungProzent / 100), 10, 400),
  );

  if (fehlendeAngaben >= 3) {
    hinweise.push(
      `${fehlendeAngaben} preisbildende Angaben fehlen — das Konfidenzintervall ist entsprechend breit.`,
    );
  }

  return {
    fairValue,
    intervall: [rundeAuf(fairValue * (1 - breite), 100), rundeAuf(fairValue * (1 + breite), 100)],
    angebotspreis: daten.preis,
    abweichungEuro,
    abweichungProzent,
    ankerwert: anker,
    ankerherkunft,
    faktoren,
    liquiditaet,
    standzeitTage,
    vergleichsbasis,
    konfidenz,
    hinweise,
  };
}
