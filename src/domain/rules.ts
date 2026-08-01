/**
 * Regelwerk-Prüfung ("Plausibilitätsprüfung").
 *
 * Jede Regel prüft einen Teilaspekt des Konzepts gegen das österreichische
 * Regelwerk und liefert Befunde mit Rechtsgrundlage zurück. Die Prüfung ist
 * bewusst konservativ: Sie ersetzt keine sachverständige Beurteilung, sondern
 * markiert Stellen, die eine fachliche Würdigung brauchen.
 */

import {
  FLUCHTWEG_BREITE_JE_PERSON,
  FLUCHTWEG_MAX_LAENGE,
  FLUCHTWEG_MIN_BREITE,
  FW_RANG,
  GK_BY_KEY,
  LE_JE_QM,
  LE_MINDEST,
  MAX_BRANDABSCHNITT,
  SCHWELLE_PANIKBESCHLAG_PERSONEN,
  SCHWELLE_VERSAMMLUNG_PERSONEN,
} from './catalog';
import { gebaeudeklasseVon } from '@/engine/adapter';
import type { Befund, Projekt } from './types';

/** Berechnete Gebäudeklasse; null, wenn die Eingaben nicht ausreichen. */
function klasseVon(p: Projekt) {
  return gebaeudeklasseVon(p).klasse;
}

/** Formatiert eine Zahl mit deutschem Dezimaltrennzeichen. */
function fmt(n: number, digits = 0): string {
  return n.toLocaleString('de-AT', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/* ==========================================================================
 * Einzelregeln
 * ======================================================================= */

/** Plausibilität der Eingaben zur Gebäudeklassenableitung (FR-1.6). */
function pruefeGebaeudeklasse(p: Projekt): Befund[] {
  const befunde: Befund[] = [];
  const ableitung = gebaeudeklasseVon(p);
  const { fluchtniveau, geschosseOberirdisch } = p.gebaeude;

  if (ableitung.klasse === null) {
    befunde.push({
      regelId: 'GK-UNBESTIMMT',
      schwere: 'warnung',
      titel: 'Gebäudeklasse nicht ermittelbar',
      beschreibung: `Die Gebäudeklasse lässt sich noch nicht ableiten. Es fehlen: ${ableitung.fehlendeAngaben.join(', ')}. Ohne Klasse bleibt die gesamte Anforderungsmatrix unbestimmt.`,
      grundlage: 'OIB-Richtlinie 2, Punkt 1 (Begriffsbestimmungen)',
      kapitel: 'Gebäudedaten',
      scoreVorschlag: null,
    });
  }

  for (const hinweis of ableitung.hinweise) {
    befunde.push({
      regelId: 'GK-HINWEIS',
      schwere: 'hinweis',
      titel: 'Hinweis zur Gebäudeklasse',
      beschreibung: hinweis,
      grundlage: 'OIB-Richtlinie 2, Punkt 1',
      kapitel: 'Gebäudedaten',
      scoreVorschlag: null,
    });
  }

  // Eingabeplausibilität: Geschoßanzahl gegen Fluchtniveau.
  if (geschosseOberirdisch > 0 && fluchtniveau > 0) {
    const mittlereGeschosshoehe = fluchtniveau / geschosseOberirdisch;
    if (mittlereGeschosshoehe > 6) {
      befunde.push({
        regelId: 'EIN-GESCHOSSHOEHE-HOCH',
        schwere: 'warnung',
        titel: 'Fluchtniveau und Geschoßanzahl passen nicht zusammen',
        beschreibung: `Aus ${fmt(fluchtniveau, 1)} m Fluchtniveau bei ${geschosseOberirdisch} Geschoß(en) ergibt sich eine mittlere Geschoßhöhe von ${fmt(mittlereGeschosshoehe, 1)} m. Bitte beide Angaben prüfen.`,
        grundlage: 'Eingabeplausibilität',
        kapitel: 'Gebäudedaten',
        scoreVorschlag: null,
      });
    }
    if (mittlereGeschosshoehe < 2.2) {
      befunde.push({
        regelId: 'EIN-GESCHOSSHOEHE-NIEDRIG',
        schwere: 'warnung',
        titel: 'Fluchtniveau erscheint zu gering',
        beschreibung: `Aus ${fmt(fluchtniveau, 1)} m Fluchtniveau bei ${geschosseOberirdisch} Geschoß(en) ergibt sich eine mittlere Geschoßhöhe von ${fmt(mittlereGeschosshoehe, 1)} m. Bitte beide Angaben prüfen.`,
        grundlage: 'Eingabeplausibilität',
        kapitel: 'Gebäudedaten',
        scoreVorschlag: null,
      });
    }
  }

  return befunde;
}

/** Brandabschnittsflächen gegen die Richtwerte je Nutzungsart prüfen. */
function pruefeBrandabschnitte(p: Projekt): Befund[] {
  const befunde: Befund[] = [];
  const klasse = klasseVon(p);
  if (klasse === null) return befunde;
  const def = GK_BY_KEY[klasse];

  if (p.brandabschnitte.length === 0) {
    befunde.push({
      regelId: 'BA-FEHLT',
      schwere: 'warnung',
      titel: 'Keine Brandabschnitte erfasst',
      beschreibung:
        'Für das Konzept ist mindestens ein Brandabschnitt zu definieren. Ohne Abschnittsbildung lässt sich die Ausbreitungsbegrenzung nicht nachweisen.',
      grundlage: 'OIB-Richtlinie 2, Punkt 3',
      kapitel: 'Brandabschnitte',
      scoreVorschlag: 'C',
    });
    return befunde;
  }

  for (const ba of p.brandabschnitte) {
    // Maßgebend ist die anspruchsvollste Nutzung im Abschnitt.
    const nutzungen = p.nutzungseinheiten.filter(
      (n) => n.brandabschnittId === ba.id,
    );
    const grenze = nutzungen.length
      ? Math.min(...nutzungen.map((n) => MAX_BRANDABSCHNITT[n.nutzungsart]))
      : MAX_BRANDABSCHNITT.sonstige;

    if (ba.flaeche > grenze) {
      befunde.push({
        regelId: 'BA-FLAECHE',
        schwere: 'warnung',
        titel: `${ba.bezeichnung}: Brandabschnittsfläche überschritten`,
        beschreibung: `Die Fläche von ${fmt(ba.flaeche)} m² überschreitet den Richtwert von ${fmt(grenze)} m² für die vorhandene Nutzung. Zulässig nur mit kompensierenden Maßnahmen (z. B. Sprinklerschutz, Rauchabschnittsbildung) und entsprechendem Nachweis.`,
        grundlage: 'OIB-Richtlinie 2, Punkt 3.1',
        kapitel: 'Brandabschnitte',
        scoreVorschlag: 'C',
      });
    }

    if (FW_RANG[ba.trennbauteil] < FW_RANG[def.trenndecke]) {
      befunde.push({
        regelId: 'BA-TRENNBAUTEIL',
        schwere: 'fehler',
        titel: `${ba.bezeichnung}: Trennbauteil unterschreitet Anforderung`,
        beschreibung: `Für ${klasse} ist mindestens ${def.trenndecke} erforderlich, ausgeführt bzw. angegeben ist ${ba.trennbauteil}.`,
        grundlage: 'OIB-Richtlinie 2, Punkt 3',
        kapitel: 'Brandabschnitte',
        scoreVorschlag: 'D',
      });
    }

    if (!ba.abschluesseDokumentiert) {
      befunde.push({
        regelId: 'BA-ABSCHLUESSE',
        schwere: 'hinweis',
        titel: `${ba.bezeichnung}: Abschlüsse nicht dokumentiert`,
        beschreibung:
          'Brandschutztüren, Brandschutzklappen und Durchführungen im abschnittsbildenden Bauteil sind zu erfassen und mit Verwendbarkeitsnachweis zu belegen.',
        grundlage: 'OIB-Richtlinie 2, Punkt 3.4',
        kapitel: 'Brandabschnitte',
        scoreVorschlag: 'B',
      });
    }
  }

  return befunde;
}

/** Bauteil-Soll-/Ist-Vergleich. */
function pruefeBauteile(p: Projekt): Befund[] {
  const befunde: Befund[] = [];

  for (const bt of p.bauteile) {
    if (FW_RANG[bt.istKlasse] < FW_RANG[bt.sollKlasse]) {
      befunde.push({
        regelId: 'BT-UNTERSCHREITUNG',
        schwere: 'fehler',
        titel: `${bt.bezeichnung}: Feuerwiderstand unterschritten`,
        beschreibung: `Erforderlich ist ${bt.sollKlasse}, festgestellt wurde ${bt.istKlasse}. Der Bauteil ist zu ertüchtigen oder es ist ein gleichwertiger Nachweis zu führen.`,
        grundlage: 'ÖNORM EN 13501-2 i. V. m. OIB-Richtlinie 2',
        kapitel: 'Bauteile',
        scoreVorschlag: 'D',
      });
    }

    if (!bt.nachweis.trim() && bt.sollKlasse !== 'keine') {
      befunde.push({
        regelId: 'BT-NACHWEIS',
        schwere: 'hinweis',
        titel: `${bt.bezeichnung}: Verwendbarkeitsnachweis fehlt`,
        beschreibung:
          'Für klassifizierte Bauteile ist ein Verwendbarkeitsnachweis (Prüfzeugnis, Klassifizierungsbericht, ETA) beizubringen.',
        grundlage: 'OIB-Richtlinie 2, Punkt 2',
        kapitel: 'Bauteile',
        scoreVorschlag: 'B',
      });
    }
  }

  return befunde;
}

/** Fluchtweglängen, -breiten und Ausstattung prüfen. */
function pruefeFluchtwege(p: Projekt): Befund[] {
  const befunde: Befund[] = [];
  const maxLaenge = FLUCHTWEG_MAX_LAENGE[p.gebaeude.risikoklasse];

  if (p.fluchtwege.length === 0) {
    befunde.push({
      regelId: 'FW-FEHLT',
      schwere: 'warnung',
      titel: 'Keine Fluchtwege erfasst',
      beschreibung:
        'Flucht- und Rettungswege sind zwingender Bestandteil des Brandschutzkonzepts.',
      grundlage: 'OIB-Richtlinie 2, Punkt 5',
      kapitel: 'Fluchtwege',
      scoreVorschlag: 'C',
    });
    return befunde;
  }

  for (const fw of p.fluchtwege) {
    if (fw.laenge > maxLaenge) {
      befunde.push({
        regelId: 'OIB2-FW-LAENGE',
        schwere: 'fehler',
        titel: `${fw.bezeichnung}: Fluchtweglänge überschritten`,
        beschreibung: `Die Länge von ${fmt(fw.laenge, 1)} m überschreitet die für die Risikoklasse „${p.gebaeude.risikoklasse}“ zulässigen ${fmt(maxLaenge)} m. Es ist ein zusätzlicher Fluchtweg vorzusehen oder die Wegführung zu verkürzen.`,
        grundlage: 'OIB-Richtlinie 2, Punkt 5.1',
        kapitel: 'Fluchtwege',
        scoreVorschlag: 'D',
      });
    }

    if (fw.breite < FLUCHTWEG_MIN_BREITE) {
      befunde.push({
        regelId: 'OIB2-FW-BREITE-MIN',
        schwere: 'fehler',
        titel: `${fw.bezeichnung}: Mindestbreite unterschritten`,
        beschreibung: `Die nutzbare Breite beträgt ${fmt(fw.breite, 2)} m, erforderlich sind mindestens ${fmt(FLUCHTWEG_MIN_BREITE, 2)} m.`,
        grundlage: 'OIB-Richtlinie 2, Punkt 5.2',
        kapitel: 'Fluchtwege',
        scoreVorschlag: 'D',
      });
    }

    const erforderlicheBreite = Math.max(
      FLUCHTWEG_MIN_BREITE,
      fw.personen * FLUCHTWEG_BREITE_JE_PERSON,
    );
    if (fw.breite < erforderlicheBreite) {
      befunde.push({
        regelId: 'OIB2-FW-BREITE-PERS',
        schwere: 'warnung',
        titel: `${fw.bezeichnung}: Breite reicht für die Personenzahl nicht`,
        beschreibung: `Für ${fw.personen} Personen sind rechnerisch ${fmt(erforderlicheBreite, 2)} m erforderlich, vorhanden sind ${fmt(fw.breite, 2)} m.`,
        grundlage: 'OIB-Richtlinie 2, Punkt 5.2',
        kapitel: 'Fluchtwege',
        scoreVorschlag: 'C',
      });
    }

    if (fw.personen >= SCHWELLE_PANIKBESCHLAG_PERSONEN && !fw.panikbeschlag) {
      befunde.push({
        regelId: 'ASTV-PANIK',
        schwere: 'fehler',
        titel: `${fw.bezeichnung}: Panikbeschlag erforderlich`,
        beschreibung: `Bei ${fw.personen} Personen ist die Tür mit einem Paniktürverschluss nach ÖNORM EN 1125 auszustatten.`,
        grundlage: 'AStV § 20 i. V. m. ÖNORM EN 1125',
        kapitel: 'Fluchtwege',
        scoreVorschlag: 'D',
      });
    }

    if (!fw.sicherheitsbeleuchtung && fw.personen > 0) {
      befunde.push({
        regelId: 'FW-SIB',
        schwere: 'warnung',
        titel: `${fw.bezeichnung}: Sicherheitsbeleuchtung fehlt`,
        beschreibung:
          'Fluchtwege sind mit einer Sicherheitsbeleuchtung auszustatten, die bei Ausfall der Allgemeinbeleuchtung ein sicheres Verlassen ermöglicht.',
        grundlage: 'ÖVE/ÖNORM E 8002 i. V. m. OIB-Richtlinie 2, Punkt 5',
        kapitel: 'Fluchtwege',
        scoreVorschlag: 'C',
      });
    }

    if (!fw.fluchtwegorientierung) {
      befunde.push({
        regelId: 'FW-KENNZEICHNUNG',
        schwere: 'hinweis',
        titel: `${fw.bezeichnung}: Kennzeichnung fehlt`,
        beschreibung:
          'Flucht- und Rettungswege sind dauerhaft und gut erkennbar nach ÖNORM EN ISO 7010 zu kennzeichnen.',
        grundlage: 'Kennzeichnungsverordnung (KennV) i. V. m. ÖNORM EN ISO 7010',
        kapitel: 'Fluchtwege',
        scoreVorschlag: 'B',
      });
    }
  }

  // Zweiter Fluchtweg bei größeren Personenzahlen.
  const gesamtPersonen = p.nutzungseinheiten.reduce(
    (s, n) => s + n.personenzahl,
    0,
  );
  const wegeInsFreie = p.fluchtwege.filter((f) => f.fuehrtInsFreie).length;
  if (gesamtPersonen >= SCHWELLE_VERSAMMLUNG_PERSONEN && wegeInsFreie < 2) {
    befunde.push({
      regelId: 'FW-ZWEITER-WEG',
      schwere: 'fehler',
      titel: 'Zweiter Fluchtweg erforderlich',
      beschreibung: `Bei ${gesamtPersonen} Personen sind mindestens zwei voneinander unabhängige, ins Freie führende Fluchtwege erforderlich; erfasst ist ${wegeInsFreie === 1 ? 'nur einer' : 'keiner'}.`,
      grundlage: 'OIB-Richtlinie 2, Punkt 5.1',
      kapitel: 'Fluchtwege',
      scoreVorschlag: 'E',
    });
  }

  return befunde;
}

/** Löschhilfen (TRVB F 124) und Löschwasserversorgung (TRVB F 128). */
function pruefeLoeschhilfen(p: Projekt): Befund[] {
  const befunde: Befund[] = [];

  const vorhandeneLE = p.loeschhilfen
    .filter((l) => l.art === 'handfeuerloescher' || l.art === 'fahrbarer-loescher')
    .reduce((s, l) => s + l.anzahl * l.loeschmitteleinheiten, 0);

  const erforderlicheLE = Math.max(
    LE_MINDEST,
    Math.ceil(p.gebaeude.bruttoGrundflaeche * LE_JE_QM),
  );

  if (vorhandeneLE < erforderlicheLE) {
    befunde.push({
      regelId: 'TRVB-F124-LE',
      schwere: 'warnung',
      titel: 'Löschmitteleinheiten nicht ausreichend',
      beschreibung: `Für ${fmt(p.gebaeude.bruttoGrundflaeche)} m² Brutto-Grundfläche sind rechnerisch ${fmt(erforderlicheLE)} LE erforderlich, erfasst sind ${fmt(vorhandeneLE)} LE. Die erste Löschhilfe ist entsprechend zu ergänzen.`,
      grundlage: 'TRVB F 124 — Erste und erweiterte Löschhilfe',
      kapitel: 'Löschhilfen',
      scoreVorschlag: 'C',
    });
  }

  // Prüffristen der Löschgeräte (jährlich nach ÖNORM F 1053).
  const heute = new Date();
  for (const l of p.loeschhilfen) {
    if (!l.letztePruefung) continue;
    const letzte = new Date(l.letztePruefung);
    if (Number.isNaN(letzte.getTime())) continue;
    const monate =
      (heute.getFullYear() - letzte.getFullYear()) * 12 +
      (heute.getMonth() - letzte.getMonth());
    if (monate > 12) {
      befunde.push({
        regelId: 'F1053-PRUEFFRIST',
        schwere: 'warnung',
        titel: `Löschgeräte „${l.standort}“: Überprüfung überfällig`,
        beschreibung: `Die letzte Überprüfung liegt ${monate} Monate zurück. Tragbare Feuerlöscher sind längstens alle zwei Jahre, im Regelfall jährlich zu überprüfen.`,
        grundlage: 'ÖNORM F 1053 i. V. m. TRVB F 124',
        kapitel: 'Löschhilfen',
        scoreVorschlag: monate > 24 ? 'D' : 'C',
      });
    }
  }

  const lw = p.loeschwasser;
  if (lw.erforderlich > 0 && lw.menge < lw.erforderlich) {
    befunde.push({
      regelId: 'TRVB-F128-MENGE',
      schwere: 'fehler',
      titel: 'Löschwasserversorgung unzureichend',
      beschreibung: `Verfügbar sind ${fmt(lw.menge)} l/min, erforderlich sind ${fmt(lw.erforderlich)} l/min. Die Differenz ist über einen Löschwasserbehälter, eine Verstärkung des Netzes oder eine behördlich anerkannte Ersatzmaßnahme abzudecken.`,
      grundlage: 'TRVB F 128 — Löschwasserbedarf',
      kapitel: 'Löschwasser',
      scoreVorschlag: 'D',
    });
  }

  if (lw.hydrantEntfernung > 150 && lw.hydrantEntfernung > 0) {
    befunde.push({
      regelId: 'TRVB-F128-HYDRANT',
      schwere: 'warnung',
      titel: 'Hydrantenentfernung zu groß',
      beschreibung: `Der nächste Hydrant liegt ${fmt(lw.hydrantEntfernung)} m entfernt. Als Richtwert soll die Entfernung 150 m nicht überschreiten.`,
      grundlage: 'TRVB F 128',
      kapitel: 'Löschwasser',
      scoreVorschlag: 'C',
    });
  }

  return befunde;
}

/** Anlagentechnischen Brandschutz auf Erforderlichkeit und Fristen prüfen. */
function pruefeAnlagen(p: Projekt): Befund[] {
  const befunde: Befund[] = [];
  const hat = (art: string) =>
    p.anlagen.some(
      (a) => a.art === art && (a.status === 'vorhanden' || a.status === 'geplant'),
    );

  const gesamtPersonen = p.nutzungseinheiten.reduce(
    (s, n) => s + n.personenzahl,
    0,
  );
  const hatBeherbergung = p.nutzungseinheiten.some(
    (n) => n.nutzungsart === 'beherbergung' || n.nutzungsart === 'gesundheit',
  );

  if (
    (klasseVon(p) === 'GK5' || hatBeherbergung) &&
    !hat('BMA')
  ) {
    befunde.push({
      regelId: 'TRVB-S123-ERF',
      schwere: 'warnung',
      titel: 'Brandmeldeanlage voraussichtlich erforderlich',
      beschreibung: hatBeherbergung
        ? 'Bei Beherbergungs- und Gesundheitsnutzungen ist regelmäßig eine Brandmeldeanlage mit Aufschaltung zur Feuerwehr gefordert.'
        : 'Bei Gebäudeklasse 5 ist im Regelfall eine Brandmeldeanlage vorzusehen. Die Erforderlichkeit ist mit der Behörde abzustimmen.',
      grundlage: 'TRVB S 123 i. V. m. OIB-Richtlinie 2',
      kapitel: 'Anlagentechnik',
      scoreVorschlag: 'C',
    });
  }

  if (p.gebaeude.geschosseUnterirdisch > 0 && !hat('RWA') && !hat('ENT')) {
    befunde.push({
      regelId: 'TRVB-S125-KELLER',
      schwere: 'hinweis',
      titel: 'Entrauchung der Kellergeschoße prüfen',
      beschreibung: `Das Objekt weist ${p.gebaeude.geschosseUnterirdisch} Kellergeschoß(e) auf. Für innenliegende Bereiche ohne Fensterlüftung ist eine Rauchabzugsmöglichkeit nachzuweisen.`,
      grundlage: 'TRVB S 125',
      kapitel: 'Anlagentechnik',
      scoreVorschlag: 'B',
    });
  }

  if (gesamtPersonen >= SCHWELLE_VERSAMMLUNG_PERSONEN && !hat('ALA')) {
    befunde.push({
      regelId: 'TRVB-S158-ALARM',
      schwere: 'warnung',
      titel: 'Alarmierungsanlage erforderlich',
      beschreibung: `Bei ${gesamtPersonen} Personen ist eine Einrichtung zur Alarmierung aller Anwesenden vorzusehen.`,
      grundlage: 'TRVB S 158',
      kapitel: 'Anlagentechnik',
      scoreVorschlag: 'C',
    });
  }

  if (!hat('SIB')) {
    befunde.push({
      regelId: 'E8002-SIB',
      schwere: 'hinweis',
      titel: 'Sicherheitsbeleuchtung nicht erfasst',
      beschreibung:
        'Für Fluchtwege ist eine Sicherheitsbeleuchtung zu erfassen und deren Prüfintervall zu dokumentieren.',
      grundlage: 'ÖVE/ÖNORM E 8002',
      kapitel: 'Anlagentechnik',
      scoreVorschlag: 'B',
    });
  }

  // Überfällige wiederkehrende Prüfungen.
  const heute = new Date();
  for (const a of p.anlagen) {
    if (a.status !== 'vorhanden' || !a.naechstePruefung) continue;
    const faellig = new Date(a.naechstePruefung);
    if (Number.isNaN(faellig.getTime())) continue;
    if (faellig < heute) {
      const tage = Math.floor(
        (heute.getTime() - faellig.getTime()) / 86_400_000,
      );
      befunde.push({
        regelId: 'ANLAGE-PRUEFFRIST',
        schwere: tage > 180 ? 'fehler' : 'warnung',
        titel: `${a.art}: wiederkehrende Prüfung überfällig`,
        beschreibung: `Die Prüfung war am ${faellig.toLocaleDateString('de-AT')} fällig und ist seit ${tage} Tagen überfällig.`,
        grundlage: a.regelwerk || 'TRVB',
        kapitel: 'Anlagentechnik',
        scoreVorschlag: tage > 180 ? 'D' : 'C',
      });
    }
  }

  for (const a of p.anlagen) {
    if (a.art === 'BMA' && a.status === 'vorhanden' && !a.aufschaltung) {
      befunde.push({
        regelId: 'TRVB-S123-AUFSCHALTUNG',
        schwere: 'warnung',
        titel: 'Brandmeldeanlage ohne Aufschaltung',
        beschreibung:
          'Die Brandmeldeanlage ist nicht zur Feuerwehr bzw. zu einer ständig besetzten Stelle aufgeschaltet. Ohne Weiterleitung bleibt die Alarmierung im Anlassfall unwirksam.',
        grundlage: 'TRVB S 123, Abschnitt Alarmorganisation',
        kapitel: 'Anlagentechnik',
        scoreVorschlag: 'D',
      });
    }
  }

  return befunde;
}

/** Organisatorischen Brandschutz prüfen (TRVB O 119 / O 121). */
function pruefeOrganisation(p: Projekt): Befund[] {
  const befunde: Befund[] = [];
  const o = p.organisation;

  if (o.brandschutzbeauftragterErforderlich && !o.brandschutzbeauftragter.trim()) {
    befunde.push({
      regelId: 'TRVB-O119-BSB',
      schwere: 'fehler',
      titel: 'Brandschutzbeauftragter nicht bestellt',
      beschreibung:
        'Für das Objekt ist ein Brandschutzbeauftragter erforderlich, es ist jedoch keine Person namentlich bestellt. Die Bestellung ist nachweislich und schriftlich vorzunehmen.',
      grundlage: 'TRVB O 119 i. V. m. AStV § 25',
      kapitel: 'Organisation',
      scoreVorschlag: 'D',
    });
  }

  if (!o.brandschutzordnungVorhanden) {
    befunde.push({
      regelId: 'TRVB-O119-BSO',
      schwere: 'warnung',
      titel: 'Brandschutzordnung fehlt',
      beschreibung:
        'Eine Brandschutzordnung mit Regelungen zu Verhalten im Brandfall, Alarmierung und Räumung ist zu erstellen und den Anwesenden zur Kenntnis zu bringen.',
      grundlage: 'TRVB O 119',
      kapitel: 'Organisation',
      scoreVorschlag: 'C',
    });
  }

  const hatBMA = p.anlagen.some(
    (a) => a.art === 'BMA' && a.status === 'vorhanden',
  );
  if (hatBMA && !o.laufkartenVorhanden) {
    befunde.push({
      regelId: 'TRVB-O121-LAUFKARTEN',
      schwere: 'warnung',
      titel: 'Feuerwehr-Laufkarten fehlen',
      beschreibung:
        'Bei vorhandener Brandmeldeanlage sind Feuerwehr-Laufkarten bereitzuhalten, damit die Einsatzkräfte Meldergruppen rasch auffinden.',
      grundlage: 'TRVB O 121 / TRVB S 123',
      kapitel: 'Organisation',
      scoreVorschlag: 'C',
    });
  }

  if (!o.brandschutzplaeneVorhanden) {
    befunde.push({
      regelId: 'TRVB-O121-PLAENE',
      schwere: 'hinweis',
      titel: 'Brandschutzpläne fehlen',
      beschreibung:
        'Brandschutzpläne nach TRVB O 121 unterstützen die Feuerwehr im Einsatz und sind für Objekte mit erhöhtem Risiko vorzusehen.',
      grundlage: 'TRVB O 121',
      kapitel: 'Organisation',
      scoreVorschlag: 'B',
    });
  }

  if (!o.brandschutzbuchGefuehrt) {
    befunde.push({
      regelId: 'TRVB-O119-BUCH',
      schwere: 'hinweis',
      titel: 'Brandschutzbuch nicht geführt',
      beschreibung:
        'Eigenkontrollen, Überprüfungen und Unterweisungen sind in einem Brandschutzbuch nachvollziehbar zu dokumentieren.',
      grundlage: 'TRVB O 119',
      kapitel: 'Organisation',
      scoreVorschlag: 'B',
    });
  }

  if (o.letzteRaeumungsuebung && o.raeumungsuebungIntervallMonate > 0) {
    const letzte = new Date(o.letzteRaeumungsuebung);
    if (!Number.isNaN(letzte.getTime())) {
      const heute = new Date();
      const monate =
        (heute.getFullYear() - letzte.getFullYear()) * 12 +
        (heute.getMonth() - letzte.getMonth());
      if (monate > o.raeumungsuebungIntervallMonate) {
        befunde.push({
          regelId: 'ORG-RAEUMUNG',
          schwere: 'warnung',
          titel: 'Räumungsübung überfällig',
          beschreibung: `Die letzte Räumungsübung liegt ${monate} Monate zurück, das festgelegte Intervall beträgt ${o.raeumungsuebungIntervallMonate} Monate.`,
          grundlage: 'TRVB O 119',
          kapitel: 'Organisation',
          scoreVorschlag: 'C',
        });
      }
    }
  }

  return befunde;
}

/** Vollständigkeit der Stammdaten und Abweichungsnachweise. */
function pruefeVollstaendigkeit(p: Projekt): Befund[] {
  const befunde: Befund[] = [];

  if (!/^\d{4}$/.test(p.auftraggeber.kundennummer)) {
    befunde.push({
      regelId: 'ING-KDNR',
      schwere: 'hinweis',
      titel: 'Kundennummer nicht im INGTEC-Format',
      beschreibung:
        'Die Kundennummer ist einheitlich 4-stellig mit führenden Nullen anzugeben (z. B. 0219), damit Dateiname und Ablage dem Schema entsprechen.',
      grundlage: 'INGTEC-Dateibenennungsschema',
      kapitel: 'Stammdaten',
      scoreVorschlag: null,
    });
  }

  if (p.nutzungseinheiten.length === 0) {
    befunde.push({
      regelId: 'NE-FEHLT',
      schwere: 'warnung',
      titel: 'Keine Nutzungseinheiten erfasst',
      beschreibung:
        'Ohne erfasste Nutzung lassen sich Personenzahlen, Brandlasten und die daraus folgenden Anforderungen nicht ableiten.',
      grundlage: 'OIB-Richtlinie 2',
      kapitel: 'Nutzung',
      scoreVorschlag: 'C',
    });
  }

  for (const ne of p.nutzungseinheiten) {
    if (!ne.brandabschnittId) {
      befunde.push({
        regelId: 'NE-OHNE-BA',
        schwere: 'hinweis',
        titel: `${ne.bezeichnung}: keinem Brandabschnitt zugeordnet`,
        beschreibung:
          'Jede Nutzungseinheit ist einem Brandabschnitt zuzuordnen, damit die Abschnittsflächen korrekt bewertet werden können.',
        grundlage: 'OIB-Richtlinie 2, Punkt 3',
        kapitel: 'Nutzung',
        scoreVorschlag: null,
      });
    }
  }

  for (const ab of p.abweichungen) {
    if (!ab.kompensation.trim()) {
      befunde.push({
        regelId: 'ABW-KOMPENSATION',
        schwere: 'fehler',
        titel: `Abweichung „${ab.anforderung}“ ohne Kompensation`,
        beschreibung:
          'Jede Abweichung vom Regelwerk erfordert eine kompensierende Maßnahme und einen nachvollziehbaren Nachweis der Gleichwertigkeit.',
        grundlage: 'OIB-Richtlinie 2, Punkt 0 (Allgemeines)',
        kapitel: 'Abweichungen',
        scoreVorschlag: 'D',
      });
    }
    if (!ab.nachweis.trim()) {
      befunde.push({
        regelId: 'ABW-NACHWEIS',
        schwere: 'warnung',
        titel: `Abweichung „${ab.anforderung}“ ohne Nachweisführung`,
        beschreibung:
          'Die Gleichwertigkeit ist durch Ingenieurmethoden, Vergleichsbetrachtung oder Gutachten zu belegen.',
        grundlage: 'OIB-Richtlinie 2, Punkt 0',
        kapitel: 'Abweichungen',
        scoreVorschlag: 'C',
      });
    }
  }

  // Überfällige Maßnahmen.
  const heute = new Date();
  for (const m of p.massnahmen) {
    if (m.status === 'erledigt' || m.status === 'entfallen' || !m.frist) continue;
    const frist = new Date(m.frist);
    if (Number.isNaN(frist.getTime())) continue;
    if (frist < heute) {
      const tage = Math.floor((heute.getTime() - frist.getTime()) / 86_400_000);
      befunde.push({
        regelId: 'MASSNAHME-FRIST',
        schwere: m.score === 'D' || m.score === 'E' ? 'fehler' : 'warnung',
        titel: `Maßnahme Nr. ${m.lfdNr}: Frist überschritten`,
        beschreibung: `Die Umsetzungsfrist ist seit ${tage} Tagen abgelaufen (SAFETY-SCORE ${m.score}).`,
        grundlage: 'Maßnahmenverfolgung',
        kapitel: 'Maßnahmen',
        scoreVorschlag: null,
      });
    }
  }

  return befunde;
}

/* ==========================================================================
 * Aggregation
 * ======================================================================= */

const REGELN: ((p: Projekt) => Befund[])[] = [
  pruefeGebaeudeklasse,
  pruefeBrandabschnitte,
  pruefeBauteile,
  pruefeFluchtwege,
  pruefeLoeschhilfen,
  pruefeAnlagen,
  pruefeOrganisation,
  pruefeVollstaendigkeit,
];

const SCHWERE_RANG = { fehler: 0, warnung: 1, hinweis: 2, info: 3 } as const;

/** Führt alle Regeln aus und sortiert die Befunde nach Schwere. */
export function pruefeProjekt(projekt: Projekt): Befund[] {
  const befunde = REGELN.flatMap((regel) => regel(projekt));
  return befunde.sort(
    (a, b) => SCHWERE_RANG[a.schwere] - SCHWERE_RANG[b.schwere],
  );
}

export interface PruefStatistik {
  fehler: number;
  warnung: number;
  hinweis: number;
  info: number;
  gesamt: number;
}

export function befundStatistik(befunde: Befund[]): PruefStatistik {
  const stat: PruefStatistik = {
    fehler: 0,
    warnung: 0,
    hinweis: 0,
    info: 0,
    gesamt: befunde.length,
  };
  for (const b of befunde) stat[b.schwere] += 1;
  return stat;
}
