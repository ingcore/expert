/**
 * Text Intelligence Engine — PRD Abschnitt 22.
 *
 * Der entscheidende Satz des Abschnitts lautet: Erkannte Formulierungen führen
 * **nicht automatisch zu einer negativen Bewertung**, sie erzeugen gezielte
 * Prüfanforderungen. „Im Kundenauftrag" ist kein Makel, sondern der Hinweis
 * darauf, dass der Verkäufer das Fahrzeug nicht kennt — also ist die
 * Vorbesitzerhistorie beim Halter zu erfragen, nicht beim Händler.
 *
 * Die Engine arbeitet regelbasiert über benannte Muster. Das ist keine
 * Notlösung, sondern die Umsetzung von Abschnitt 38: Ein Sprachmodell darf im
 * Zielbild die semantische Interpretation liefern, die Bewertung bleibt
 * nachvollziehbar. Jeder Befund trägt daher seine Fundstelle mit — ein Nutzer
 * kann jede Ableitung im Originaltext nachlesen.
 */

import type { Belegart, InseratDaten } from '../domain/types';

export type Textkategorie =
  | 'zurechnung'
  | 'gewaehrleistung'
  | 'herkunft'
  | 'zustand'
  | 'dokumentation'
  | 'vermarktung';

export const TEXTKATEGORIE_LABEL: Record<Textkategorie, string> = {
  zurechnung: 'Zurechnung der Aussage',
  gewaehrleistung: 'Gewährleistung',
  herkunft: 'Herkunft',
  zustand: 'Zustandsaussage',
  dokumentation: 'Dokumentation',
  vermarktung: 'Vermarktung',
};

export interface Textmuster {
  id: string;
  muster: RegExp;
  kategorie: Textkategorie;
  bezeichnung: string;
  /** Was die Formulierung tatsächlich bedeutet. */
  bedeutung: string;
  /** Die daraus folgende Prüfanforderung — der eigentliche Zweck. */
  pruefanforderung: string;
  /** Welche Unterlage die Frage abschließend klärt. */
  evidenzbedarf: Belegart[];
  /**
   * Wirkung auf die Textkonsistenz in Punkten. Fast durchgehend 0 — die
   * Formulierung ist ein Prüfauftrag, keine Abwertung. Abweichungen davon sind
   * ausdrücklich begründet.
   */
  wirkung: number;
}

export const TEXTMUSTER: Textmuster[] = [
  {
    id: 'laut-vorbesitzer',
    muster: /laut\s+(vor)?besitzer|nach\s+angaben\s+des\s+vorbesitzers/i,
    kategorie: 'zurechnung',
    bezeichnung: '„laut Vorbesitzer"',
    bedeutung:
      'Der Verkäufer gibt eine fremde Aussage weiter und steht selbst nicht dafür ein.',
    pruefanforderung:
      'Zusicherung schriftlich vom aktuellen Verkäufer einholen oder Aussage durch Unterlagen belegen lassen.',
    evidenzbedarf: ['gutachten', 'rechnung', 'zulassungshistorie'],
    wirkung: 0,
  },
  {
    id: 'kundenauftrag',
    muster: /im\s+kundenauftrag|kommissionsverkauf|vermittlungsauftrag/i,
    kategorie: 'zurechnung',
    bezeichnung: '„im Kundenauftrag"',
    bedeutung:
      'Der Händler vermittelt nur; er kennt das Fahrzeug in der Regel nicht aus eigener Anschauung und haftet nicht wie ein Verkäufer.',
    pruefanforderung:
      'Kontakt zum Halter herstellen; Historie und Unfallfreiheit direkt beim Halter erfragen.',
    evidenzbedarf: ['zulassungshistorie', 'serviceheft'],
    wirkung: 0,
  },
  {
    id: 'km-laut-tacho',
    muster: /km\s*(-|\s)?stand\s+laut\s+tacho|kilometer\s+laut\s+tacho|laut\s+tacho/i,
    kategorie: 'zurechnung',
    bezeichnung: '„Kilometer laut Tacho"',
    bedeutung:
      'Die Laufleistung wird ausdrücklich nicht zugesichert, sondern nur abgelesen.',
    pruefanforderung:
      'Kilometerstand gegen Serviceeinträge, Pickerl-/TÜV-Berichte und frühere Inserate abgleichen.',
    evidenzbedarf: ['serviceheft', 'pickerlbericht', 'tuev-bericht'],
    wirkung: 0,
  },
  {
    id: 'serviceheft-verloren',
    // Zwischen Substantiv und Aussage steht in der Praxis fast immer ein
    // Füllwort („Serviceheft leider verloren") — das Muster lässt es zu.
    muster: /serviceheft\s+(\w+\s+){0,2}(verloren|nicht\s+vorhanden|fehlt)|kein\s+serviceheft/i,
    kategorie: 'dokumentation',
    bezeichnung: '„Serviceheft verloren"',
    bedeutung:
      'Der zentrale Nachweis der Wartungshistorie fehlt. Ersatzweise können Werkstattdaten rekonstruiert werden.',
    pruefanforderung:
      'Digitale Servicehistorie beim Markenbetrieb abfragen; Rechnungssammlung anfordern.',
    evidenzbedarf: ['digitale-servicehistorie', 'rechnung'],
    wirkung: 0,
  },
  {
    id: 'leichter-vorschaden',
    muster: /leichte(r|n)?\s+(vor)?schaden|kleiner\s+vorschaden|bagatellschaden/i,
    kategorie: 'zustand',
    bezeichnung: '„leichter Vorschaden"',
    bedeutung:
      'Ein Schaden wird eingeräumt, sein Umfang aber relativiert. Die Einordnung als „leicht" stammt vom Verkäufer.',
    pruefanforderung:
      'Schadensumfang, Reparaturweg und ausführende Werkstatt belegen lassen; Lackschichtmessung durchführen.',
    evidenzbedarf: ['gutachten', 'rechnung'],
    wirkung: 0,
  },
  {
    id: 'motor-ueberholt',
    muster: /motor\s+(überholt|revidiert|instandgesetzt|neu\s+aufgebaut)|motorrevision/i,
    kategorie: 'zustand',
    bezeichnung: '„Motor überholt"',
    bedeutung:
      'Eine wesentliche und teure Arbeit wird behauptet. Ohne Beleg ist sie wertlos, mit Beleg stark wertsteigernd.',
    pruefanforderung:
      'Motorrechnung mit Umfang, Datum und Kilometerstand anfordern; ausführenden Betrieb prüfen.',
    evidenzbedarf: ['motorrechnung', 'rechnung'],
    wirkung: 0,
  },
  {
    id: 'export-bevorzugt',
    muster: /export\s+(bevorzugt|möglich|willkommen)|nur\s+an\s+export|händler\s*\/?\s*export/i,
    kategorie: 'vermarktung',
    bezeichnung: '„Export bevorzugt"',
    bedeutung:
      'Deutet auf ein Fahrzeug hin, das im Inland schwer verkäuflich ist — häufig wegen Zustand, Papieren oder Vorgeschichte.',
    pruefanforderung:
      'Grund der Exportorientierung erfragen; Zulassungsfähigkeit im Inland prüfen.',
    evidenzbedarf: ['zulassungshistorie', 'pickerlbericht'],
    wirkung: 0,
  },
  {
    id: 'keine-gewaehrleistung',
    muster: /(keine|ohne)\s+(gewährleistung|garantie|sachmängelhaftung)|gekauft\s+wie\s+gesehen/i,
    kategorie: 'gewaehrleistung',
    bezeichnung: '„keine Gewährleistung"',
    bedeutung:
      'Bei privaten Verkäufern üblich und unauffällig. Bei einem gewerblichen Verkäufer ist der Ausschluss gegenüber Verbrauchern unwirksam — der Hinweis deutet dann auf eine Umgehungskonstruktion hin.',
    pruefanforderung:
      'Verkäuferstellung klären: gewerblich oder privat? Bei Händlern die Vertragsgestaltung prüfen lassen.',
    evidenzbedarf: ['kaufvertrag'],
    wirkung: 0,
  },
  {
    id: 'us-import',
    muster: /us[-\s]?import|usa[-\s]?import|amerikanische?s?\s+fahrzeug|kanada[-\s]?import/i,
    kategorie: 'herkunft',
    bezeichnung: '„US-Import"',
    bedeutung:
      'Abweichende Ausstattung, andere Wartungshistorie und ein eigener Zulassungsweg. Wertrelevant, aber nicht negativ per se.',
    pruefanforderung:
      'Importunterlagen, Einzelgenehmigung und Vollständigkeit der Umrüstung prüfen; Historie im Herkunftsland recherchieren.',
    evidenzbedarf: ['importdokument', 'zulassungshistorie', 'gutachten'],
    wirkung: 0,
  },
  {
    id: 'keine-unfallangabe',
    muster:
      /keine\s+angaben?\s+zur\s+unfall|unfallfreiheit\s+(nicht|kann\s+nicht)\s+(bekannt|zugesichert|garantiert)/i,
    kategorie: 'zustand',
    bezeichnung: '„keine Angaben zur Unfallfreiheit"',
    bedeutung:
      'Die für den Wert wichtigste Einzelaussage wird bewusst offengelassen.',
    pruefanforderung:
      'Lackschichtmessung, Spaltmaßkontrolle und Unterbodenbesichtigung sind zwingend.',
    evidenzbedarf: ['gutachten'],
    wirkung: 0,
  },
  {
    id: 'zustand-superlativ',
    muster:
      /(zustand|erhaltung)\s*(:|\s)\s*(1|eins)\b|sammlerzustand|neuwertig|makellos|top\s?zustand/i,
    kategorie: 'vermarktung',
    bezeichnung: 'Zustandssuperlativ',
    bedeutung:
      'Werbende Zustandsbehauptung ohne Prüfmaßstab. Für sich weder gut noch schlecht, aber belegbedürftig.',
    pruefanforderung:
      'Zustandsbehauptung durch aktuelles Gutachten oder Zustandsbericht belegen lassen.',
    evidenzbedarf: ['gutachten'],
    wirkung: 0,
  },
  {
    id: 'preis-vb',
    muster: /\bvb\b|verhandlungsbasis|preis\s+verhandelbar/i,
    kategorie: 'vermarktung',
    bezeichnung: 'Verhandlungsbasis',
    bedeutung:
      'Der genannte Preis ist eine Ausgangsgröße; der Marktvergleich ist entsprechend zu relativieren.',
    pruefanforderung: 'Preisabweichung zum Fair Value als Ausgangswert lesen, nicht als Endpreis.',
    evidenzbedarf: [],
    wirkung: 0,
  },
  {
    id: 'standzeit',
    muster: /stand(zeit)?\s+(lange|jahre)|längere\s+standzeit|scheunenfund/i,
    kategorie: 'zustand',
    bezeichnung: 'Längere Standzeit',
    bedeutung:
      'Standschäden an Dichtungen, Bremsen, Reifen und Kraftstoffsystem sind wahrscheinlich.',
    pruefanforderung:
      'Standschadenprüfung durchführen: Bremsen, Reifenalter, Kraftstoffsystem, alle Flüssigkeiten.',
    evidenzbedarf: ['rechnung'],
    wirkung: 0,
  },
  {
    id: 'tuning',
    muster: /leistungssteigerung|chiptuning|software\s?optimier|tuning|kennfeld/i,
    kategorie: 'zustand',
    bezeichnung: 'Leistungssteigerung',
    bedeutung:
      'Wertmindernd bei Sammlerfahrzeugen und haftungsrelevant, wenn nicht eingetragen.',
    pruefanforderung:
      'Eintragung und Rückrüstbarkeit prüfen; Originalsteuergerät und Originalteile erfragen.',
    evidenzbedarf: ['gutachten', 'rechnung'],
    wirkung: -4,
  },
];

export interface Textbefund {
  musterId: string;
  bezeichnung: string;
  kategorie: Textkategorie;
  bedeutung: string;
  pruefanforderung: string;
  evidenzbedarf: Belegart[];
  wirkung: number;
  /** Der gefundene Textausschnitt samt Umfeld. */
  fundstelle: string;
  /** In welchem Feld gefunden. */
  feld: string;
}

/** Eine im Text aufgestellte, belegfähige Behauptung — Grundlage Abschnitt 13. */
export interface Behauptung {
  id: string;
  /** Kurzform, z. B. „Pleuellager gewechselt". */
  text: string;
  art: 'unfallfrei' | 'reparatur' | 'service' | 'zustand' | 'herkunft';
  fundstelle: string;
  /** Angegebener Kilometerstand der Arbeit, wenn genannt. */
  beiKilometer: number | null;
  /** Welche Unterlage die Behauptung belegen würde. */
  benoetigterBeleg: Belegart[];
  /** Wie stark die Behauptung wirkt, wenn sie belegt ist (Gewicht 1–3). */
  gewicht: number;
}

export interface Widerspruch {
  feld: string;
  bezeichnung: string;
  strukturiert: string;
  imText: string;
  fundstelle: string;
}

export interface Textanalyse {
  befunde: Textbefund[];
  behauptungen: Behauptung[];
  widersprueche: Widerspruch[];
  /** Alle aus den Befunden abgeleiteten Prüfanforderungen, ohne Dopplungen. */
  pruefanforderungen: string[];
}

/* ==========================================================================
 * Behauptungserkennung
 * ======================================================================= */

const ARBEITEN: { muster: RegExp; text: string; beleg: Belegart[]; gewicht: number }[] =
  [
    { muster: /pleuellager/i, text: 'Pleuellager gewechselt', beleg: ['motorrechnung', 'rechnung'], gewicht: 3 },
    { muster: /steuerkette|kettenspanner/i, text: 'Steuerkette erneuert', beleg: ['motorrechnung', 'rechnung'], gewicht: 3 },
    { muster: /\bims\b|zwischenwellenlager/i, text: 'IMS-Lager erneuert', beleg: ['motorrechnung', 'rechnung'], gewicht: 3 },
    { muster: /kupplung|\bzms\b/i, text: 'Kupplung erneuert', beleg: ['getrieberechnung', 'rechnung'], gewicht: 2 },
    { muster: /getriebe(öl|service)|dkg[-\s]?service|s-?tronic/i, text: 'Getriebeservice durchgeführt', beleg: ['getrieberechnung', 'rechnung'], gewicht: 2 },
    { muster: /drosselklappenstell/i, text: 'Drosselklappensteller erneuert', beleg: ['rechnung'], gewicht: 2 },
    { muster: /vanos/i, text: 'VANOS instandgesetzt', beleg: ['rechnung'], gewicht: 2 },
    { muster: /walnuss|einlasskan|entkok/i, text: 'Einlasskanäle gereinigt', beleg: ['rechnung'], gewicht: 2 },
    { muster: /wasserpumpe/i, text: 'Wasserpumpe erneuert', beleg: ['rechnung'], gewicht: 1 },
    { muster: /kühler|kühlerpaket/i, text: 'Kühler erneuert oder gereinigt', beleg: ['rechnung'], gewicht: 1 },
    { muster: /bremsscheiben|bremsanlage/i, text: 'Bremsanlage erneuert', beleg: ['rechnung'], gewicht: 1 },
    { muster: /fahrwerk|stoßdämpfer|querlenker|achslager/i, text: 'Fahrwerk überarbeitet', beleg: ['rechnung'], gewicht: 1 },
    { muster: /haldex/i, text: 'Haldex-Service durchgeführt', beleg: ['rechnung'], gewicht: 1 },
    { muster: /\bdrc\b/i, text: 'DRC-Fahrwerk instandgesetzt oder umgerüstet', beleg: ['rechnung'], gewicht: 2 },
    { muster: /endoskop/i, text: 'Endoskopie der Zylinderlaufbahnen liegt vor', beleg: ['gutachten', 'messprotokoll'], gewicht: 3 },
  ];

const ERLEDIGT = /(gewechselt|erneuert|getauscht|neu|überholt|instandgesetzt|gemacht|durchgeführt|revidiert|gereinigt|liegt\s+vor|vorhanden)/i;

/** Sucht in einem Satz einen Kilometerbezug wie „bei 82.400 km". */
function kilometerBezug(satz: string): number | null {
  const treffer = satz.match(/(\d{1,3}(?:[.\s]\d{3})+|\d{4,6})\s*(?:km|kilometer)/i);
  if (!treffer) return null;
  const zahl = Number.parseInt(treffer[1].replace(/[.\s]/g, ''), 10);
  return Number.isFinite(zahl) ? zahl : null;
}

function saetze(text: string): string[] {
  return text
    .split(/(?<=[.!?;])\s+|\n+|\s\|\s|\s•\s|\s-\s(?=[A-ZÄÖÜ])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function ausschnitt(text: string, index: number, laenge: number): string {
  const von = Math.max(0, index - 40);
  const bis = Math.min(text.length, index + laenge + 40);
  return `${von > 0 ? '…' : ''}${text.slice(von, bis).trim()}${bis < text.length ? '…' : ''}`;
}

/* ==========================================================================
 * Hauptanalyse
 * ======================================================================= */

export function analysiereText(daten: InseratDaten): Textanalyse {
  const felder: { name: string; label: string; text: string }[] = [
    { name: 'titel', label: 'Titel', text: daten.titel },
    { name: 'beschreibung', label: 'Beschreibung', text: daten.beschreibung },
    { name: 'ausstattungstext', label: 'Ausstattung', text: daten.ausstattungstext ?? '' },
    { name: 'garantie', label: 'Garantie', text: daten.garantie ?? '' },
    { name: 'serviceangabe', label: 'Serviceangabe', text: daten.serviceangabe ?? '' },
    { name: 'umbauten', label: 'Umbauten', text: daten.umbauten ?? '' },
    { name: 'bekannteMaengel', label: 'Bekannte Mängel', text: daten.bekannteMaengel ?? '' },
  ];

  const befunde: Textbefund[] = [];
  for (const muster of TEXTMUSTER) {
    for (const feld of felder) {
      if (!feld.text) continue;
      const treffer = muster.muster.exec(feld.text);
      if (!treffer) continue;
      befunde.push({
        musterId: muster.id,
        bezeichnung: muster.bezeichnung,
        kategorie: muster.kategorie,
        bedeutung: muster.bedeutung,
        pruefanforderung: muster.pruefanforderung,
        evidenzbedarf: muster.evidenzbedarf,
        wirkung: muster.wirkung,
        fundstelle: ausschnitt(feld.text, treffer.index, treffer[0].length),
        feld: feld.label,
      });
      break; // Ein Befund je Muster genügt; Häufigkeit ist kein Kriterium.
    }
  }

  /* -- Behauptungen ---------------------------------------------------- */
  const behauptungen: Behauptung[] = [];
  const gesamttext = [
    daten.beschreibung,
    daten.serviceangabe ?? '',
    daten.umbauten ?? '',
  ].join('\n');

  for (const satz of saetze(gesamttext)) {
    if (!ERLEDIGT.test(satz)) continue;
    for (const arbeit of ARBEITEN) {
      if (!arbeit.muster.test(satz)) continue;
      if (behauptungen.some((b) => b.text === arbeit.text)) continue;
      behauptungen.push({
        id: `beh-${behauptungen.length + 1}`,
        text: arbeit.text,
        art: 'reparatur',
        fundstelle: satz,
        beiKilometer: kilometerBezug(satz),
        benoetigterBeleg: arbeit.beleg,
        gewicht: arbeit.gewicht,
      });
    }
  }

  if (daten.unfallangabe === 'unfallfrei') {
    behauptungen.push({
      id: 'beh-unfallfrei',
      text: 'Unfallfrei',
      art: 'unfallfrei',
      fundstelle: 'Strukturierte Angabe des Inserates',
      beiKilometer: null,
      benoetigterBeleg: ['gutachten'],
      gewicht: 3,
    });
  }
  if (daten.unfallangabe === 'unfallfrei-laut-vorbesitzer') {
    behauptungen.push({
      id: 'beh-unfallfrei-vb',
      text: 'Unfallfrei laut Vorbesitzer',
      art: 'unfallfrei',
      fundstelle: 'Strukturierte Angabe des Inserates',
      beiKilometer: null,
      benoetigterBeleg: ['gutachten', 'vorbesitzerunterlagen'],
      gewicht: 2,
    });
  }
  if (daten.servicehistorie === 'lueckenlos') {
    behauptungen.push({
      id: 'beh-service',
      text: 'Lückenlose Servicehistorie',
      art: 'service',
      fundstelle: 'Strukturierte Angabe des Inserates',
      beiKilometer: null,
      benoetigterBeleg: ['serviceheft', 'digitale-servicehistorie'],
      gewicht: 3,
    });
  }

  /* -- Widersprüche zwischen Text und strukturierten Feldern ----------- */
  const widersprueche: Widerspruch[] = [];

  if (
    daten.unfallangabe === 'unfallfrei' &&
    /(vorschaden|unfallschaden|reparierter?\s+schaden|nachlackiert)/i.test(gesamttext)
  ) {
    const t = /(vorschaden|unfallschaden|reparierter?\s+schaden|nachlackiert)/i.exec(
      gesamttext,
    );
    widersprueche.push({
      feld: 'unfallangabe',
      bezeichnung: 'Unfallangabe',
      strukturiert: 'unfallfrei',
      imText: t ? t[0] : 'Schadenshinweis',
      fundstelle: t ? ausschnitt(gesamttext, t.index, t[0].length) : '',
    });
  }

  const SERVICE_FEHLT =
    /(serviceheft\s+(\w+\s+){0,2}(verloren|fehlt|nicht\s+vorhanden)|kein\s+serviceheft|servicelücke)/i;
  if (daten.servicehistorie === 'lueckenlos' && SERVICE_FEHLT.test(gesamttext)) {
    const t = SERVICE_FEHLT.exec(gesamttext);
    widersprueche.push({
      feld: 'servicehistorie',
      bezeichnung: 'Servicehistorie',
      strukturiert: 'lückenlos',
      imText: t ? t[0] : 'Hinweis auf fehlendes Serviceheft',
      fundstelle: t ? ausschnitt(gesamttext, t.index, t[0].length) : '',
    });
  }

  const kmImText = kilometerBezug(daten.titel);
  if (
    kmImText !== null &&
    daten.kilometerstand !== null &&
    Math.abs(kmImText - daten.kilometerstand) > Math.max(2000, daten.kilometerstand * 0.03)
  ) {
    widersprueche.push({
      feld: 'kilometerstand',
      bezeichnung: 'Kilometerstand',
      strukturiert: `${daten.kilometerstand} km`,
      imText: `${kmImText} km`,
      fundstelle: daten.titel,
    });
  }

  if (
    daten.getriebe === 'handschalter' &&
    /\b(automatik|dkg|doppelkupplung|s-?tronic|pdk|tiptronic)\b/i.test(daten.titel)
  ) {
    widersprueche.push({
      feld: 'getriebe',
      bezeichnung: 'Getriebe',
      strukturiert: 'Handschalter',
      imText: 'Automatikbezeichnung im Titel',
      fundstelle: daten.titel,
    });
  }

  const pruefanforderungen = [
    ...new Set(befunde.map((b) => b.pruefanforderung)),
  ];

  return { befunde, behauptungen, widersprueche, pruefanforderungen };
}
