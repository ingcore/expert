/**
 * Anforderungsmatrix OIB-Richtlinie 2 „Brandschutz", Ausgabe 2023-05.
 *
 * WICHTIG — Status des Korpus
 * ---------------------------------------------------------------------------
 * Dies ist der Startkorpus im Sinne von Phase 0 der Roadmap. Die Einträge sind
 * strukturell vollständig (Bedingung, Sollwert, Quellenverweis), inhaltlich
 * aber noch NICHT gegen die Originalrichtlinie und das Golden Dataset
 * verifiziert. Vor produktivem Einsatz ist jeder Eintrag gemäß PRD Abschnitt
 * 8.2 einzeln zu prüfen und gemäß Abschnitt 18, Schritt 2 an mindestens drei
 * abgeschlossenen Projekten gegenzurechnen.
 *
 * Die Datei ist bewusst reine Datenhaltung. Bedingungen sind JSON-Logic-
 * Ausdrücke, keine Funktionen (LP-5) — sie lassen sich unverändert in die
 * Tabelle `anforderungen` der PostgreSQL-Datenbank übernehmen.
 *
 * Kontextfelder, die in Bedingungen verwendet werden dürfen:
 *   gebaeudeklasse          "GK1".."GK5"
 *   fluchtniveau            Zahl, Meter
 *   geschosseOberirdisch    Zahl
 *   geschosseUnterirdisch   Zahl
 *   bruttoGrundflaeche      Zahl, m²
 *   groessterBrandabschnitt Zahl, m²
 *   nutzungsarten           Array der im Gebäude vorkommenden Nutzungsarten
 *   personenGesamt          Zahl
 *   risikoklasse            "normal" | "erhoeht" | "hoch"
 *   hatKeller               boolean
 */

import type { Anforderung } from '../types';

const AUSGABE = '2023-05';
const RL = 'OIB-RL 2';

/** Kürzel für „Gebäudeklasse ist eine der genannten". */
function gk(...klassen: string[]) {
  return { in: [{ var: 'gebaeudeklasse' }, klassen] };
}

export const OIB_RL2_2023: Anforderung[] = [
  /* ======================================================================
   * Punkt 2 — Tragfähigkeit der Konstruktion im Brandfall
   * =================================================================== */
  {
    id: 'oib2-2023-2.1-tragwerk-ob-gk1',
    bauteil: 'tragwerk',
    geschosslage: 'oberirdisch',
    bezeichnung: 'Tragende Bauteile, oberirdische Geschoße',
    bedingung: gk('GK1'),
    sollArt: 'feuerwiderstand',
    soll: 'keine',
    quelle: { richtlinie: RL, ausgabe: AUSGABE, punkt: '2.1', tabelle: '1', zeile: 'GK1, oberirdisch' },
    erlaeuterung:
      'Für Gebäudeklasse 1 besteht für tragende Bauteile oberirdischer Geschoße keine Feuerwiderstandsanforderung.',
    konfliktgruppe: 'tragwerk-oberirdisch',
    benoetigt: ['gebaeudeklasse'],
  },
  {
    id: 'oib2-2023-2.1-tragwerk-ob-gk2',
    bauteil: 'tragwerk',
    geschosslage: 'oberirdisch',
    bezeichnung: 'Tragende Bauteile, oberirdische Geschoße',
    bedingung: gk('GK2'),
    sollArt: 'feuerwiderstand',
    soll: 'R30',
    quelle: { richtlinie: RL, ausgabe: AUSGABE, punkt: '2.1', tabelle: '1', zeile: 'GK2, oberirdisch' },
    konfliktgruppe: 'tragwerk-oberirdisch',
    benoetigt: ['gebaeudeklasse'],
  },
  {
    id: 'oib2-2023-2.1-tragwerk-ob-gk3-4',
    bauteil: 'tragwerk',
    geschosslage: 'oberirdisch',
    bezeichnung: 'Tragende Bauteile, oberirdische Geschoße',
    bedingung: gk('GK3', 'GK4'),
    sollArt: 'feuerwiderstand',
    soll: 'R60',
    quelle: { richtlinie: RL, ausgabe: AUSGABE, punkt: '2.1', tabelle: '1', zeile: 'GK3/GK4, oberirdisch' },
    konfliktgruppe: 'tragwerk-oberirdisch',
    benoetigt: ['gebaeudeklasse'],
  },
  {
    id: 'oib2-2023-2.1-tragwerk-ob-gk5',
    bauteil: 'tragwerk',
    geschosslage: 'oberirdisch',
    bezeichnung: 'Tragende Bauteile, oberirdische Geschoße',
    bedingung: gk('GK5'),
    sollArt: 'feuerwiderstand',
    soll: 'R90',
    quelle: { richtlinie: RL, ausgabe: AUSGABE, punkt: '2.1', tabelle: '1', zeile: 'GK5, oberirdisch' },
    erlaeuterung:
      'Bei Gebäudeklasse 5 ist das Tragwerk oberirdischer Geschoße in R 90 auszuführen; abweichende Ausführungen sind über eine Abweichung mit Kompensation zu führen.',
    konfliktgruppe: 'tragwerk-oberirdisch',
    benoetigt: ['gebaeudeklasse'],
  },
  {
    id: 'oib2-2023-2.2-tragwerk-ub',
    bauteil: 'tragwerk',
    geschosslage: 'unterirdisch',
    bezeichnung: 'Tragende Bauteile, Kellergeschoße',
    bedingung: { and: [{ '>': [{ var: 'geschosseUnterirdisch' }, 0] }, gk('GK1', 'GK2')] },
    sollArt: 'feuerwiderstand',
    soll: 'R60',
    quelle: { richtlinie: RL, ausgabe: AUSGABE, punkt: '2.2', tabelle: '1', zeile: 'GK1/GK2, unterirdisch' },
    konfliktgruppe: 'tragwerk-unterirdisch',
    benoetigt: ['gebaeudeklasse', 'geschosseUnterirdisch'],
  },
  {
    id: 'oib2-2023-2.2-tragwerk-ub-gk3-5',
    bauteil: 'tragwerk',
    geschosslage: 'unterirdisch',
    bezeichnung: 'Tragende Bauteile, Kellergeschoße',
    bedingung: { and: [{ '>': [{ var: 'geschosseUnterirdisch' }, 0] }, gk('GK3', 'GK4', 'GK5')] },
    sollArt: 'feuerwiderstand',
    soll: 'R90',
    quelle: { richtlinie: RL, ausgabe: AUSGABE, punkt: '2.2', tabelle: '1', zeile: 'GK3–GK5, unterirdisch' },
    erlaeuterung:
      'Kellergeschoße sind wegen der erschwerten Brandbekämpfung höher eingestuft als oberirdische Geschoße derselben Gebäudeklasse.',
    konfliktgruppe: 'tragwerk-unterirdisch',
    benoetigt: ['gebaeudeklasse', 'geschosseUnterirdisch'],
  },

  /* ======================================================================
   * Punkt 3 — Ausbreitung von Feuer und Rauch innerhalb des Bauwerks
   * =================================================================== */
  {
    id: 'oib2-2023-3.1-trenndecke-gk1-2',
    bauteil: 'decke',
    geschosslage: 'alle',
    bezeichnung: 'Trenndecken zwischen Nutzungseinheiten',
    bedingung: gk('GK1', 'GK2'),
    sollArt: 'feuerwiderstand',
    soll: 'REI30',
    quelle: { richtlinie: RL, ausgabe: AUSGABE, punkt: '3.1', tabelle: '2', zeile: 'GK1/GK2' },
    konfliktgruppe: 'trenndecke',
    benoetigt: ['gebaeudeklasse'],
  },
  {
    id: 'oib2-2023-3.1-trenndecke-gk3-4',
    bauteil: 'decke',
    geschosslage: 'alle',
    bezeichnung: 'Trenndecken zwischen Nutzungseinheiten',
    bedingung: gk('GK3', 'GK4'),
    sollArt: 'feuerwiderstand',
    soll: 'REI60',
    quelle: { richtlinie: RL, ausgabe: AUSGABE, punkt: '3.1', tabelle: '2', zeile: 'GK3/GK4' },
    konfliktgruppe: 'trenndecke',
    benoetigt: ['gebaeudeklasse'],
  },
  {
    id: 'oib2-2023-3.1-trenndecke-gk5',
    bauteil: 'decke',
    geschosslage: 'alle',
    bezeichnung: 'Trenndecken zwischen Nutzungseinheiten',
    bedingung: gk('GK5'),
    sollArt: 'feuerwiderstand',
    soll: 'REI90',
    quelle: { richtlinie: RL, ausgabe: AUSGABE, punkt: '3.1', tabelle: '2', zeile: 'GK5' },
    konfliktgruppe: 'trenndecke',
    benoetigt: ['gebaeudeklasse'],
  },
  {
    id: 'oib2-2023-3.2-trennwand-gk1-3',
    bauteil: 'trennwand',
    geschosslage: 'alle',
    bezeichnung: 'Trennwände zwischen Nutzungseinheiten',
    bedingung: gk('GK1', 'GK2', 'GK3'),
    sollArt: 'feuerwiderstand',
    soll: 'EI30',
    quelle: { richtlinie: RL, ausgabe: AUSGABE, punkt: '3.2', tabelle: '2', zeile: 'GK1–GK3' },
    konfliktgruppe: 'trennwand-nutzungseinheit',
    benoetigt: ['gebaeudeklasse'],
  },
  {
    id: 'oib2-2023-3.2-trennwand-gk4-5',
    bauteil: 'trennwand',
    geschosslage: 'alle',
    bezeichnung: 'Trennwände zwischen Nutzungseinheiten',
    bedingung: gk('GK4', 'GK5'),
    sollArt: 'feuerwiderstand',
    soll: 'EI60',
    quelle: { richtlinie: RL, ausgabe: AUSGABE, punkt: '3.2', tabelle: '2', zeile: 'GK4/GK5' },
    konfliktgruppe: 'trennwand-nutzungseinheit',
    benoetigt: ['gebaeudeklasse'],
  },
  {
    id: 'oib2-2023-3.3-brandabschnittswand',
    bauteil: 'trennwand',
    geschosslage: 'alle',
    bezeichnung: 'Brandabschnittsbildende Wände',
    bedingung: gk('GK1', 'GK2', 'GK3', 'GK4', 'GK5'),
    sollArt: 'feuerwiderstand',
    soll: { if: [{ in: [{ var: 'gebaeudeklasse' }, ['GK1', 'GK2', 'GK3']] }, 'REI60', 'REI90'] },
    quelle: { richtlinie: RL, ausgabe: AUSGABE, punkt: '3.3', tabelle: '3' },
    erlaeuterung:
      'Brandabschnittsbildende Wände sind über alle Geschoße bis zur Dachhaut zu führen. Öffnungen sind mit Abschlüssen gleicher Widerstandsdauer zu verschließen.',
    benoetigt: ['gebaeudeklasse'],
  },
  {
    id: 'oib2-2023-3.4-brandabschnitt-flaeche',
    bauteil: 'trennwand',
    geschosslage: 'alle',
    bezeichnung: 'Größte zulässige Brandabschnittsfläche',
    bedingung: { '>': [{ var: 'groessterBrandabschnitt' }, 0] },
    sollArt: 'flaeche',
    soll: {
      if: [
        { containsAny: [{ var: 'nutzungsarten' }, ['lager']] },
        800,
        { containsAny: [{ var: 'nutzungsarten' }, ['produktion', 'versammlung', 'gesundheit', 'beherbergung']] },
        1200,
        1600,
      ],
    },
    einheit: 'm²',
    quelle: { richtlinie: RL, ausgabe: AUSGABE, punkt: '3.4', tabelle: '3' },
    erlaeuterung:
      'Richtwert der zusammenhängenden Brandabschnittsfläche. Überschreitungen sind über kompensierende Maßnahmen (Sprinklerschutz, Rauchabschnitte) und einen Gleichwertigkeitsnachweis zu führen.',
    benoetigt: ['groessterBrandabschnitt', 'nutzungsarten'],
  },
  {
    id: 'oib2-2023-3.5-treppenhauswand',
    bauteil: 'treppenhaus',
    geschosslage: 'alle',
    bezeichnung: 'Wände von Treppenhäusern',
    bedingung: gk('GK4', 'GK5'),
    sollArt: 'feuerwiderstand',
    soll: { if: [gk('GK4'), 'REI60', 'REI90'] },
    quelle: { richtlinie: RL, ausgabe: AUSGABE, punkt: '3.5' },
    erlaeuterung:
      'Treppenhäuser sind als eigener Brandabschnitt auszubilden; Zugänge sind mit selbstschließenden, rauchdichten Abschlüssen zu versehen.',
    benoetigt: ['gebaeudeklasse'],
  },
  {
    id: 'oib2-2023-3.6-schacht',
    bauteil: 'schacht',
    geschosslage: 'alle',
    bezeichnung: 'Installationsschächte und -kanäle',
    bedingung: gk('GK3', 'GK4', 'GK5'),
    sollArt: 'feuerwiderstand',
    soll: { if: [gk('GK5'), 'EI90', 'EI60'] },
    quelle: { richtlinie: RL, ausgabe: AUSGABE, punkt: '3.6' },
    benoetigt: ['gebaeudeklasse'],
  },
  {
    id: 'oib2-2023-3.7-durchfuehrung',
    bauteil: 'durchfuehrung',
    geschosslage: 'alle',
    bezeichnung: 'Leitungs- und Rohrdurchführungen in Brandabschnitten',
    bedingung: gk('GK1', 'GK2', 'GK3', 'GK4', 'GK5'),
    sollArt: 'text',
    soll: 'Abschottung in der Widerstandsdauer des durchdrungenen Bauteils, mit Verwendbarkeitsnachweis',
    quelle: { richtlinie: RL, ausgabe: AUSGABE, punkt: '3.7' },
    erlaeuterung:
      'Für jede Abschottung ist ein Verwendbarkeitsnachweis (ETA, Klassifizierungsbericht) und ein Montageprotokoll beizubringen.',
    benoetigt: ['gebaeudeklasse'],
  },
  {
    id: 'oib2-2023-3.8-brandschutztuer-abschnitt',
    bauteil: 'tuer',
    geschosslage: 'alle',
    bezeichnung: 'Abschlüsse in brandabschnittsbildenden Bauteilen',
    bedingung: gk('GK1', 'GK2', 'GK3', 'GK4', 'GK5'),
    sollArt: 'feuerwiderstand',
    soll: { if: [{ in: [{ var: 'gebaeudeklasse' }, ['GK1', 'GK2', 'GK3']] }, 'EI2-60-C', 'EI2-90-C'] },
    quelle: { richtlinie: RL, ausgabe: AUSGABE, punkt: '3.8', tabelle: '3' },
    erlaeuterung:
      'Abschlüsse in brandabschnittsbildenden Bauteilen müssen selbstschließend sein und die halbe bis volle Widerstandsdauer des Bauteils aufweisen.',
    benoetigt: ['gebaeudeklasse'],
  },

  /* ======================================================================
   * Punkt 5 — Fluchtwege und Rettungswege
   * =================================================================== */
  {
    id: 'oib2-2023-5.1-fluchtweglaenge',
    bauteil: 'fluchtweg',
    geschosslage: 'alle',
    bezeichnung: 'Größte zulässige Fluchtweglänge',
    bedingung: { '!!': [{ var: 'risikoklasse' }] },
    sollArt: 'laenge',
    soll: {
      if: [
        { '==': [{ var: 'risikoklasse' }, 'hoch'] },
        20,
        { '==': [{ var: 'risikoklasse' }, 'erhoeht'] },
        30,
        40,
      ],
    },
    einheit: 'm',
    quelle: { richtlinie: RL, ausgabe: AUSGABE, punkt: '5.1' },
    erlaeuterung:
      'Gemessen wird die tatsächliche Gehweglänge vom entferntesten Punkt bis zum Ausgang ins Freie oder in einen anderen Brandabschnitt.',
    benoetigt: ['risikoklasse'],
  },
  {
    id: 'oib2-2023-5.2-fluchtwegbreite',
    bauteil: 'fluchtweg',
    geschosslage: 'alle',
    bezeichnung: 'Mindestbreite von Fluchtwegen',
    bedingung: true,
    sollArt: 'breite',
    soll: 1.2,
    einheit: 'm',
    quelle: { richtlinie: RL, ausgabe: AUSGABE, punkt: '5.2' },
    erlaeuterung:
      'Die nutzbare lichte Breite ist zusätzlich nach der Personenzahl zu bemessen: 0,10 m je 10 Personen, mindestens jedoch 1,20 m.',
  },
  {
    id: 'oib2-2023-5.3-zweiter-fluchtweg',
    bauteil: 'fluchtweg',
    geschosslage: 'alle',
    bezeichnung: 'Zweiter, unabhängiger Fluchtweg',
    bedingung: {
      or: [
        { '>=': [{ var: 'personenGesamt' }, 120] },
        gk('GK4', 'GK5'),
        { containsAny: [{ var: 'nutzungsarten' }, ['versammlung', 'beherbergung', 'gesundheit']] },
      ],
    },
    sollArt: 'ja-nein',
    soll: true,
    quelle: { richtlinie: RL, ausgabe: AUSGABE, punkt: '5.3' },
    erlaeuterung:
      'Es sind mindestens zwei voneinander unabhängige, ins Freie oder in einen sicheren Bereich führende Fluchtwege erforderlich.',
    benoetigt: ['personenGesamt', 'gebaeudeklasse'],
  },
  {
    id: 'oib2-2023-5.4-sicherheitsbeleuchtung',
    bauteil: 'fluchtweg',
    geschosslage: 'alle',
    bezeichnung: 'Sicherheitsbeleuchtung der Fluchtwege',
    bedingung: {
      or: [
        gk('GK4', 'GK5'),
        { '>=': [{ var: 'personenGesamt' }, 120] },
        { '>': [{ var: 'geschosseUnterirdisch' }, 0] },
      ],
    },
    sollArt: 'ja-nein',
    soll: true,
    quelle: { richtlinie: RL, ausgabe: AUSGABE, punkt: '5.4' },
    erlaeuterung:
      'Ausführung nach ÖVE/ÖNORM E 8002. Sie muss bei Ausfall der Allgemeinbeleuchtung ein sicheres Verlassen ermöglichen.',
    benoetigt: ['gebaeudeklasse', 'personenGesamt'],
  },
  {
    id: 'oib2-2023-5.5-fluchtwegkennzeichnung',
    bauteil: 'fluchtweg',
    geschosslage: 'alle',
    bezeichnung: 'Kennzeichnung der Fluchtwege',
    bedingung: true,
    sollArt: 'ja-nein',
    soll: true,
    quelle: { richtlinie: RL, ausgabe: AUSGABE, punkt: '5.5' },
    erlaeuterung:
      'Dauerhafte, gut erkennbare Kennzeichnung nach ÖNORM EN ISO 7010 in Verbindung mit der Kennzeichnungsverordnung.',
  },
  {
    id: 'oib2-2023-5.6-panikbeschlag',
    bauteil: 'fluchtweg',
    geschosslage: 'alle',
    bezeichnung: 'Paniktürverschluss an Notausgängen',
    bedingung: { '>=': [{ var: 'personenGesamt' }, 100] },
    sollArt: 'ja-nein',
    soll: true,
    quelle: { richtlinie: RL, ausgabe: AUSGABE, punkt: '5.6' },
    erlaeuterung:
      'Ausführung nach ÖNORM EN 1125 in Verbindung mit § 20 AStV. Türen müssen ohne Hilfsmittel in Fluchtrichtung zu öffnen sein.',
    benoetigt: ['personenGesamt'],
  },

  /* ======================================================================
   * Punkt 6 — Löschhilfen und Brandbekämpfung
   * =================================================================== */
  {
    id: 'oib2-2023-6.1-erste-loeschhilfe',
    bauteil: 'loeschhilfe',
    geschosslage: 'alle',
    bezeichnung: 'Erste Löschhilfe (Löschmitteleinheiten)',
    bedingung: { '>': [{ var: 'bruttoGrundflaeche' }, 0] },
    sollArt: 'menge',
    soll: { max: [6, { '*': [{ var: 'bruttoGrundflaeche' }, 0.05] }] },
    einheit: 'LE',
    quelle: { richtlinie: RL, ausgabe: AUSGABE, punkt: '6.1' },
    erlaeuterung:
      'Bemessung nach TRVB F 124: 0,05 Löschmitteleinheiten je m² Brutto-Grundfläche, mindestens jedoch 6 LE je Bereich.',
    benoetigt: ['bruttoGrundflaeche'],
  },
  {
    id: 'oib2-2023-6.2-loeschwasser',
    bauteil: 'loeschwasser',
    geschosslage: 'alle',
    bezeichnung: 'Löschwasserbedarf',
    bedingung: { '>': [{ var: 'bruttoGrundflaeche' }, 0] },
    sollArt: 'menge',
    soll: {
      if: [
        { containsAny: [{ var: 'nutzungsarten' }, ['produktion', 'lager']] },
        1600,
        { '>': [{ var: 'bruttoGrundflaeche' }, 3000] },
        1200,
        800,
      ],
    },
    einheit: 'l/min',
    quelle: { richtlinie: RL, ausgabe: AUSGABE, punkt: '6.2' },
    erlaeuterung:
      'Richtwert nach TRVB F 128; der tatsächliche Bedarf ist mit der örtlichen Feuerwehr abzustimmen.',
    benoetigt: ['bruttoGrundflaeche', 'nutzungsarten'],
  },
  {
    id: 'oib2-2023-6.3-brandmeldeanlage',
    bauteil: 'anlagentechnik',
    geschosslage: 'alle',
    bezeichnung: 'Brandmeldeanlage',
    bedingung: {
      or: [
        gk('GK5'),
        { containsAny: [{ var: 'nutzungsarten' }, ['beherbergung', 'gesundheit']] },
        { '>=': [{ var: 'personenGesamt' }, 300] },
      ],
    },
    sollArt: 'ja-nein',
    soll: true,
    quelle: { richtlinie: RL, ausgabe: AUSGABE, punkt: '6.3' },
    erlaeuterung:
      'Ausführung nach TRVB S 123 mit Aufschaltung zu einer ständig besetzten Stelle. Der Schutzumfang ist mit der Behörde abzustimmen.',
    benoetigt: ['gebaeudeklasse', 'nutzungsarten', 'personenGesamt'],
  },
  {
    id: 'oib2-2023-6.4-alarmierung',
    bauteil: 'anlagentechnik',
    geschosslage: 'alle',
    bezeichnung: 'Alarmierungsanlage',
    bedingung: {
      or: [
        { '>=': [{ var: 'personenGesamt' }, 120] },
        { containsAny: [{ var: 'nutzungsarten' }, ['versammlung', 'beherbergung', 'gesundheit']] },
      ],
    },
    sollArt: 'ja-nein',
    soll: true,
    quelle: { richtlinie: RL, ausgabe: AUSGABE, punkt: '6.4' },
    erlaeuterung: 'Ausführung nach TRVB S 158; alle Anwesenden müssen erreichbar sein.',
    benoetigt: ['personenGesamt', 'nutzungsarten'],
  },
  {
    id: 'oib2-2023-6.5-rwa-keller',
    bauteil: 'anlagentechnik',
    geschosslage: 'unterirdisch',
    bezeichnung: 'Rauchabzug für Kellergeschoße',
    bedingung: { '>': [{ var: 'geschosseUnterirdisch' }, 0] },
    sollArt: 'ja-nein',
    soll: true,
    quelle: { richtlinie: RL, ausgabe: AUSGABE, punkt: '6.5' },
    erlaeuterung:
      'Kellergeschoße ohne ausreichende Fensterlüftung benötigen eine Rauchabzugsmöglichkeit nach TRVB S 125.',
    benoetigt: ['geschosseUnterirdisch'],
  },
  {
    id: 'oib2-2023-6.6-rwa-treppenhaus',
    bauteil: 'anlagentechnik',
    geschosslage: 'alle',
    bezeichnung: 'Rauchabzug im Treppenhaus',
    bedingung: gk('GK4', 'GK5'),
    sollArt: 'ja-nein',
    soll: true,
    quelle: { richtlinie: RL, ausgabe: AUSGABE, punkt: '6.6' },
    erlaeuterung:
      'Treppenhäuser der Gebäudeklassen 4 und 5 benötigen an oberster Stelle eine Rauchabzugsöffnung mit Auslösung im Erdgeschoß.',
    benoetigt: ['gebaeudeklasse'],
  },
  {
    id: 'oib2-2023-6.7-feuerwehrzufahrt',
    bauteil: 'organisation',
    geschosslage: 'alle',
    bezeichnung: 'Zufahrt und Aufstellflächen für die Feuerwehr',
    bedingung: gk('GK3', 'GK4', 'GK5'),
    sollArt: 'text',
    soll: 'Befahrbare Zufahrt und Aufstellfläche nach ÖNORM F 2000',
    quelle: { richtlinie: RL, ausgabe: AUSGABE, punkt: '6.7' },
    benoetigt: ['gebaeudeklasse'],
  },
  {
    id: 'oib2-2023-6.8-brandschutzplaene',
    bauteil: 'organisation',
    geschosslage: 'alle',
    bezeichnung: 'Brandschutzpläne',
    bedingung: {
      or: [
        gk('GK5'),
        { containsAny: [{ var: 'nutzungsarten' }, ['produktion', 'lager', 'versammlung', 'gesundheit', 'beherbergung']] },
      ],
    },
    sollArt: 'ja-nein',
    soll: true,
    quelle: { richtlinie: RL, ausgabe: AUSGABE, punkt: '6.8' },
    erlaeuterung: 'Erstellung nach TRVB O 121 und Hinterlegung beim Feuerwehr-Bedienfeld.',
    benoetigt: ['gebaeudeklasse', 'nutzungsarten'],
  },
];
