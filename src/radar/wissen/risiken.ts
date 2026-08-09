/**
 * Technische Knowledge Base — Tabelle `model_risks`, PRD Abschnitt 20.
 *
 * Für jedes Modell sind die modelltypischen Schwachstellen hinterlegt. Aus
 * ihnen erzeugt die Anwendung automatisch
 *
 *   — eine fahrzeugspezifische Prüfliste (Abschnitt 43) und
 *   — eine strukturierte Verkäuferanfrage (Abschnitt 42).
 *
 * Jeder Eintrag benennt zusätzlich, **womit** sich das Risiko entkräften lässt
 * (`entkraeftetDurch`). Das ist die Verbindung zum Evidence Score: Eine
 * Behauptung „Pleuellager gemacht" ohne Rechnung wiegt anders als dieselbe
 * Behauptung mit Werkstattbeleg (Abschnitt 13).
 *
 * Die Kostenspannen sind Erfahrungswerte für den DACH-Raum inklusive Arbeit;
 * sie sind Planungsgrößen, keine Kostenvoranschläge.
 */

import type { Belegart, Getriebe } from '../domain/types';

export type Risikowahrscheinlichkeit = 'hoch' | 'mittel' | 'gering';
export type Risikoschwere = 'kritisch' | 'hoch' | 'mittel' | 'gering';

export interface Modellrisiko {
  id: string;
  /** Für welche Katalogmodelle das Risiko gilt. */
  modellIds: string[];
  bauteil: string;
  bezeichnung: string;
  beschreibung: string;
  /** Ab dieser Laufleistung wird das Risiko akut. `null` = laufleistungsunabhängig. */
  relevantAbKm: number | null;
  /** Nur für Fahrzeuge dieser Baujahre. `null` = alle. */
  baujahrVon: number | null;
  baujahrBis: number | null;
  /**
   * Nur für diese Getriebearten. Fehlt die Angabe, gilt das Risiko unabhängig
   * vom Getriebe. Ein Handschalter hat keinen DKG-Ölservice, und eine
   * Prüfliste, die trotzdem danach fragt, verliert an Glaubwürdigkeit.
   */
  giltFuerGetriebe?: Getriebe[];
  wahrscheinlichkeit: Risikowahrscheinlichkeit;
  schwere: Risikoschwere;
  kostenVon: number;
  kostenBis: number;
  /** Was am Fahrzeug konkret zu prüfen ist — Grundlage der Prüfliste. */
  pruefpunkt: string;
  /** Wortlaut für die Verkäuferanfrage. */
  frageAnVerkaeufer: string;
  /** Welche Unterlage das Risiko belastbar entkräftet. */
  entkraeftetDurch: Belegart[];
  /** Textmuster, mit denen ein Inserat die Erledigung behauptet. */
  erledigtMuster: RegExp[];
}

const M3_E9X = ['bmw-m3-e92', 'bmw-m3-e90'];
const P996 = ['porsche-996-c4s', 'porsche-996-carrera'];
const P997_1 = ['porsche-997-carrera-s'];
const P997 = [...P997_1, 'porsche-997-2-carrera-s'];
const RS3 = ['audi-rs3-8p', 'audi-rs3-8v'];

export const MODELLRISIKEN: Modellrisiko[] = [
  /* ---- BMW M3 E9x, Motor S65 ------------------------------------------ */
  {
    id: 's65-pleuellager',
    modellIds: M3_E9X,
    bauteil: 'Motor',
    bezeichnung: 'Pleuellager S65',
    beschreibung:
      'Konstruktiv knappes Lagerspiel. Verschleiß tritt schleichend auf und endet unbehandelt im Motorschaden. Gilt als der bestimmende Kostenfaktor der Baureihe.',
    relevantAbKm: 80000,
    baujahrVon: null,
    baujahrBis: null,
    wahrscheinlichkeit: 'hoch',
    schwere: 'kritisch',
    kostenVon: 2500,
    kostenBis: 4500,
    pruefpunkt:
      'Nachweis des Lagerwechsels prüfen; ohne Nachweis Ölanalyse und Kaltstartgeräusch beurteilen.',
    frageAnVerkaeufer:
      'Wurden die Pleuellager gewechselt? Bitte um Rechnung mit Datum und Kilometerstand.',
    entkraeftetDurch: ['motorrechnung', 'rechnung', 'serviceheft'],
    erledigtMuster: [/pleuellager/i, /rod\s*bearing/i, /lagerschalen/i],
  },
  {
    id: 's65-drosselklappensteller',
    modellIds: M3_E9X,
    bauteil: 'Motor',
    bezeichnung: 'Drosselklappensteller',
    beschreibung:
      'Die Stellmotoren der Einzeldrosselklappen fallen altersbedingt aus. Symptom ist Notlauf; die Reparatur ist beherrschbar, aber paarweise fällig.',
    relevantAbKm: 90000,
    baujahrVon: null,
    baujahrBis: null,
    wahrscheinlichkeit: 'mittel',
    schwere: 'mittel',
    kostenVon: 900,
    kostenBis: 1800,
    pruefpunkt: 'Fehlerspeicher auslesen, Notlaufmeldungen der Vergangenheit prüfen.',
    frageAnVerkaeufer:
      'Wurden die Drosselklappensteller getauscht oder gab es Notlaufmeldungen?',
    entkraeftetDurch: ['rechnung', 'diagnosebericht'],
    erledigtMuster: [/drosselklappenstell/i, /throttle\s*actuator/i],
  },
  {
    id: 's65-vanos',
    modellIds: M3_E9X,
    bauteil: 'Motor',
    bezeichnung: 'VANOS-Verstellung',
    beschreibung:
      'Magnetventile und Verstelleinheit verschleißen. Führt zu Leistungsverlust und Fehlereinträgen, selten zu Folgeschäden.',
    relevantAbKm: 100000,
    baujahrVon: null,
    baujahrBis: null,
    wahrscheinlichkeit: 'mittel',
    schwere: 'mittel',
    kostenVon: 600,
    kostenBis: 2200,
    pruefpunkt: 'VANOS-Adaptionswerte auslesen, Kaltlaufverhalten beurteilen.',
    frageAnVerkaeufer: 'Liegen VANOS-Fehlereinträge vor oder wurden Ventile erneuert?',
    entkraeftetDurch: ['rechnung', 'diagnosebericht'],
    erledigtMuster: [/vanos/i],
  },
  {
    id: 's65-differential',
    modellIds: M3_E9X,
    bauteil: 'Antrieb',
    bezeichnung: 'Hinterachsdifferential',
    beschreibung:
      'Bei Rennstreckeneinsatz und stark gefahrenen Fahrzeugen tritt Geräuschentwicklung auf; das Sperrdifferential ist teuer.',
    relevantAbKm: 100000,
    baujahrVon: null,
    baujahrBis: null,
    wahrscheinlichkeit: 'gering',
    schwere: 'hoch',
    kostenVon: 1800,
    kostenBis: 4000,
    pruefpunkt: 'Lastwechsel- und Geräuschprobe, Ölzustand am Differential prüfen.',
    frageAnVerkaeufer:
      'Wurde das Fahrzeug auf der Rennstrecke bewegt? Gibt es Geräusche aus der Hinterachse?',
    entkraeftetDurch: ['rechnung', 'gutachten'],
    erledigtMuster: [/differential/i, /hinterachsgetriebe/i],
  },
  {
    id: 's65-dkg-service',
    modellIds: M3_E9X,
    giltFuerGetriebe: ['doppelkupplung'],
    bauteil: 'Getriebe',
    bezeichnung: 'DKG-Service',
    beschreibung:
      'Das Doppelkupplungsgetriebe verlangt regelmäßigen Ölservice. Versäumte Intervalle führen zu Kupplungs- und Mechatronikschäden.',
    relevantAbKm: 60000,
    baujahrVon: null,
    baujahrBis: null,
    wahrscheinlichkeit: 'mittel',
    schwere: 'hoch',
    kostenVon: 500,
    kostenBis: 6000,
    pruefpunkt:
      'Nachweis des DKG-Ölservice prüfen; Kupplungsadaption und Schaltverhalten beurteilen.',
    frageAnVerkaeufer:
      'Wann wurde der letzte DKG-Ölservice durchgeführt? Bitte um Beleg.',
    entkraeftetDurch: ['getrieberechnung', 'rechnung', 'digitale-servicehistorie'],
    erledigtMuster: [/dkg[- ]?(service|öl)/i, /getriebeöl/i, /doppelkupplung.*service/i],
  },
  {
    id: 's65-fahrwerkslager',
    modellIds: M3_E9X,
    bauteil: 'Fahrwerk',
    bezeichnung: 'Fahrwerks- und Achslager',
    beschreibung:
      'Gummi-Metall-Lager der Vorder- und Hinterachse altern. Wirkt sich auf Spurtreue und Geräuschniveau aus.',
    relevantAbKm: 110000,
    baujahrVon: null,
    baujahrBis: null,
    wahrscheinlichkeit: 'hoch',
    schwere: 'mittel',
    kostenVon: 800,
    kostenBis: 2500,
    pruefpunkt: 'Achslager und Querlenker auf Riss und Spiel prüfen, Achsvermessung.',
    frageAnVerkaeufer: 'Wurden Achslager oder Querlenker erneuert?',
    entkraeftetDurch: ['rechnung', 'messprotokoll'],
    erledigtMuster: [/querlenker/i, /achslager/i, /fahrwerk.*erneuert/i],
  },

  /* ---- Porsche 996 / 997.1 --------------------------------------------- */
  {
    id: 'm96-bore-scoring',
    modellIds: [...P996, ...P997_1],
    bauteil: 'Motor',
    bezeichnung: 'Bore Scoring (Laufbahnriefen)',
    beschreibung:
      'Riefenbildung in der Zylinderlaufbahn, typisch an Zylinder 5 und 6. Führt zu Ölverbrauch und im Endstadium zum Motorschaden.',
    relevantAbKm: 90000,
    baujahrVon: null,
    baujahrBis: 2008,
    wahrscheinlichkeit: 'mittel',
    schwere: 'kritisch',
    kostenVon: 9000,
    kostenBis: 22000,
    pruefpunkt:
      'Endoskopie der Zylinder 5 und 6 zwingend. Ölverbrauch und Kaltstartgeräusch dokumentieren.',
    frageAnVerkaeufer:
      'Liegt eine aktuelle Endoskopie der Zylinderlaufbahnen vor? Wie hoch ist der Ölverbrauch je 1.000 km?',
    entkraeftetDurch: ['gutachten', 'messprotokoll', 'diagnosebericht'],
    erledigtMuster: [/endoskop/i, /bore\s*scoring/i, /laufbahn/i],
  },
  {
    id: 'm96-ims',
    modellIds: [...P996, ...P997_1],
    bauteil: 'Motor',
    bezeichnung: 'IMS-Lager (Zwischenwelle)',
    beschreibung:
      'Das Lager der Zwischenwelle kann ausfallen und einen Totalschaden des Motors verursachen. Nachrüstlösungen sind etabliert.',
    relevantAbKm: null,
    baujahrVon: null,
    baujahrBis: 2008,
    wahrscheinlichkeit: 'gering',
    schwere: 'kritisch',
    kostenVon: 1800,
    kostenBis: 3500,
    pruefpunkt:
      'Nachweis der IMS-Nachrüstung prüfen; sonst Ölfilter und Ablassschraube auf Metallabrieb kontrollieren.',
    frageAnVerkaeufer:
      'Wurde das IMS-Lager erneuert oder auf eine verstärkte Ausführung umgerüstet?',
    entkraeftetDurch: ['motorrechnung', 'rechnung'],
    erledigtMuster: [/\bims\b/i, /zwischenwellenlager/i],
  },
  {
    id: 'm96-rms',
    modellIds: [...P996, ...P997_1],
    bauteil: 'Motor',
    bezeichnung: 'RMS (Kurbelwellensimmerring)',
    beschreibung:
      'Ölaustritt am hinteren Kurbelwellensimmerring. Für sich harmlos, der Ausbau des Getriebes macht die Reparatur teuer.',
    relevantAbKm: 80000,
    baujahrVon: null,
    baujahrBis: 2008,
    wahrscheinlichkeit: 'mittel',
    schwere: 'mittel',
    kostenVon: 900,
    kostenBis: 1800,
    pruefpunkt: 'Fahrzeug auf der Hebebühne auf Ölfeuchte zwischen Motor und Getriebe prüfen.',
    frageAnVerkaeufer: 'Gibt es Ölaustritt an der Kurbelwelle oder wurde der RMS erneuert?',
    entkraeftetDurch: ['rechnung', 'gutachten'],
    erledigtMuster: [/\brms\b/i, /simmerring/i],
  },
  {
    id: 'p996-kuehlkreislauf',
    modellIds: [...P996, ...P997],
    bauteil: 'Kühlung',
    bezeichnung: 'Kühlkreislauf und Wasserkühler',
    beschreibung:
      'Die Kühler in den Radhäusern setzen sich mit Laub zu und korrodieren von innen. Undichtigkeiten bleiben lange unbemerkt.',
    relevantAbKm: 100000,
    baujahrVon: null,
    baujahrBis: null,
    wahrscheinlichkeit: 'hoch',
    schwere: 'mittel',
    kostenVon: 700,
    kostenBis: 2400,
    pruefpunkt: 'Radhäuser öffnen, Kühlerpakete auf Verschmutzung und Korrosion prüfen.',
    frageAnVerkaeufer: 'Wurden die Kühlerpakete gereinigt oder erneuert?',
    entkraeftetDurch: ['rechnung'],
    erledigtMuster: [/kühler/i, /kühlerpaket/i],
  },
  {
    id: 'p996-aos',
    modellIds: [...P996, ...P997_1],
    bauteil: 'Motor',
    bezeichnung: 'AOS (Öl-Luft-Abscheider)',
    beschreibung:
      'Defekter Abscheider führt zu starkem Rauch beim Start und erhöhtem Ölverbrauch — leicht mit einem Motorschaden zu verwechseln.',
    relevantAbKm: 90000,
    baujahrVon: null,
    baujahrBis: null,
    wahrscheinlichkeit: 'mittel',
    schwere: 'mittel',
    kostenVon: 450,
    kostenBis: 1100,
    pruefpunkt: 'Kaltstart beobachten, Unterdruck im Kurbelgehäuse messen.',
    frageAnVerkaeufer: 'Raucht das Fahrzeug beim Kaltstart? Wurde der AOS erneuert?',
    entkraeftetDurch: ['rechnung', 'diagnosebericht'],
    erledigtMuster: [/\baos\b/i, /ölabscheider/i, /luftabscheider/i],
  },
  {
    id: 'p996-fahrwerk',
    modellIds: [...P996, ...P997],
    bauteil: 'Fahrwerk',
    bezeichnung: 'Fahrwerk und Lager',
    beschreibung:
      'Stoßdämpfer, Domlager und Querlenker sind Verschleißteile; bei Fahrzeugen über 100.000 km meist fällig.',
    relevantAbKm: 100000,
    baujahrVon: null,
    baujahrBis: null,
    wahrscheinlichkeit: 'hoch',
    schwere: 'mittel',
    kostenVon: 1200,
    kostenBis: 3500,
    pruefpunkt: 'Achsvermessung, Sichtprüfung der Dämpfer, Fahrverhalten auf Querfuge.',
    frageAnVerkaeufer: 'Wurde das Fahrwerk überarbeitet? Bitte um Belege.',
    entkraeftetDurch: ['rechnung', 'messprotokoll'],
    erledigtMuster: [/fahrwerk.*(neu|erneuert|überholt)/i, /stoßdämpfer/i],
  },
  {
    id: 'p996-kupplung',
    modellIds: [...P996, ...P997],
    bauteil: 'Getriebe',
    bezeichnung: 'Kupplung und Zweimassenschwungrad',
    beschreibung:
      'Kupplungswechsel verlangt den Ausbau des Triebwerks; das ZMS wird sinnvollerweise mit erneuert.',
    relevantAbKm: 110000,
    baujahrVon: null,
    baujahrBis: null,
    wahrscheinlichkeit: 'mittel',
    schwere: 'mittel',
    kostenVon: 1800,
    kostenBis: 3200,
    pruefpunkt: 'Kupplungsweg und Rupfen beurteilen, Belegprüfung.',
    frageAnVerkaeufer: 'Wann wurde die Kupplung zuletzt erneuert?',
    entkraeftetDurch: ['getrieberechnung', 'rechnung'],
    erledigtMuster: [/kupplung/i, /\bzms\b/i],
  },
  {
    id: 'p996-korrosion',
    modellIds: P996,
    bauteil: 'Karosserie',
    bezeichnung: 'Korrosion an Radläufen und Unterboden',
    beschreibung:
      'Bei Fahrzeugen mit Winterbetrieb treten Korrosion an Radläufen, Schwellern und Unterboden auf; entscheidend für die Substanzbewertung.',
    relevantAbKm: null,
    baujahrVon: null,
    baujahrBis: 2005,
    wahrscheinlichkeit: 'mittel',
    schwere: 'hoch',
    kostenVon: 1500,
    kostenBis: 12000,
    pruefpunkt: 'Unterbodenbilder anfordern, Fahrzeug auf der Hebebühne besichtigen.',
    frageAnVerkaeufer:
      'Bitte um aussagekräftige Unterbodenbilder und Angaben zum Winterbetrieb.',
    entkraeftetDurch: ['gutachten', 'pickerlbericht', 'tuev-bericht'],
    erledigtMuster: [/rostfrei/i, /unterboden.*(top|sehr gut|trocken)/i],
  },

  /* ---- Audi RS4 B7 / RS5 B8 -------------------------------------------- */
  {
    id: 'fsi-carbon-build-up',
    modellIds: ['audi-rs4-b7', 'audi-rs5-b8'],
    bauteil: 'Motor',
    bezeichnung: 'Carbon Build-up (Einlassverkokung)',
    beschreibung:
      'Direkteinspritzung ohne Saugrohrspülung führt zu Ablagerungen an den Einlassventilen. Leistungsverlust und unrunder Lauf sind die Folge.',
    relevantAbKm: 80000,
    baujahrVon: null,
    baujahrBis: null,
    wahrscheinlichkeit: 'hoch',
    schwere: 'mittel',
    kostenVon: 800,
    kostenBis: 1600,
    pruefpunkt: 'Endoskopie der Einlasskanäle, Beleg über Walnussstrahlen prüfen.',
    frageAnVerkaeufer:
      'Wurden die Einlasskanäle gereinigt (Walnussstrahlen)? Wenn ja, bei welchem Kilometerstand?',
    entkraeftetDurch: ['rechnung', 'diagnosebericht'],
    erledigtMuster: [/walnuss/i, /einlasskan/i, /entkok/i, /carbon\s*clean/i],
  },
  {
    id: 'rs4-drc',
    modellIds: ['audi-rs4-b7'],
    bauteil: 'Fahrwerk',
    bezeichnung: 'DRC-Fahrwerk',
    beschreibung:
      'Das hydraulisch quervernetzte DRC-System wird undicht. Originalteile sind knapp; die Umrüstung auf konventionelle Dämpfer ist gängig, aber wertrelevant.',
    relevantAbKm: 90000,
    baujahrVon: null,
    baujahrBis: null,
    wahrscheinlichkeit: 'hoch',
    schwere: 'hoch',
    kostenVon: 1500,
    kostenBis: 5000,
    pruefpunkt: 'Dämpfer und Leitungen auf Ölaustritt prüfen; Umrüstung erfragen und bewerten.',
    frageAnVerkaeufer:
      'Ist das DRC-Fahrwerk original und dicht, oder wurde umgerüstet? Bitte um Beleg.',
    entkraeftetDurch: ['rechnung', 'gutachten'],
    erledigtMuster: [/\bdrc\b/i, /fahrwerk.*umgerüstet/i, /koni|bilstein|kw\s/i],
  },
  {
    id: 'rs4-oelkuehlerleitungen',
    modellIds: ['audi-rs4-b7'],
    bauteil: 'Motor',
    bezeichnung: 'Ölkühlerleitungen',
    beschreibung:
      'Die Leitungen zum Ölkühler werden porös. Ölverlust im Frontbereich ist ein typisches Bild.',
    relevantAbKm: 100000,
    baujahrVon: null,
    baujahrBis: null,
    wahrscheinlichkeit: 'mittel',
    schwere: 'mittel',
    kostenVon: 500,
    kostenBis: 1400,
    pruefpunkt: 'Frontbereich und Ölkühler auf Ölfeuchte prüfen.',
    frageAnVerkaeufer: 'Gibt es Ölverlust im Bereich des Ölkühlers?',
    entkraeftetDurch: ['rechnung'],
    erledigtMuster: [/ölkühlerleitung/i, /ölkühler.*erneuert/i],
  },
  {
    id: 'rs4-kupplung',
    modellIds: ['audi-rs4-b7'],
    bauteil: 'Getriebe',
    bezeichnung: 'Kupplung und ZMS',
    beschreibung:
      'Kupplung und Zweimassenschwungrad sind bei sportlich bewegten Fahrzeugen ab etwa 120.000 km fällig.',
    relevantAbKm: 120000,
    baujahrVon: null,
    baujahrBis: null,
    wahrscheinlichkeit: 'mittel',
    schwere: 'mittel',
    kostenVon: 1600,
    kostenBis: 2800,
    pruefpunkt: 'Kupplungsverhalten unter Last, Rupfen beim Anfahren.',
    frageAnVerkaeufer: 'Wann wurde die Kupplung zuletzt erneuert?',
    entkraeftetDurch: ['getrieberechnung', 'rechnung'],
    erledigtMuster: [/kupplung/i, /\bzms\b/i],
  },
  {
    id: 'rs4-bremsanlage',
    modellIds: ['audi-rs4-b7', 'audi-rs5-b8'],
    bauteil: 'Bremse',
    bezeichnung: 'Bremsanlage',
    beschreibung:
      'Verbundbremsscheiben sind teuer; bei Keramikanlagen liegt der Satz im fünfstelligen Bereich.',
    relevantAbKm: 60000,
    baujahrVon: null,
    baujahrBis: null,
    wahrscheinlichkeit: 'mittel',
    schwere: 'mittel',
    kostenVon: 1200,
    kostenBis: 9000,
    pruefpunkt: 'Scheibenstärke messen, bei Keramik Restdicke und Belagzustand dokumentieren.',
    frageAnVerkaeufer: 'Wie ist der Zustand der Bremsscheiben? Handelt es sich um die Keramikanlage?',
    entkraeftetDurch: ['rechnung', 'messprotokoll', 'pickerlbericht'],
    erledigtMuster: [/bremsscheiben.*(neu|erneuert)/i, /bremsanlage.*neu/i],
  },
  {
    id: 'rs4-unterdruck',
    modellIds: ['audi-rs4-b7'],
    bauteil: 'Motor',
    bezeichnung: 'Unterdrucksystem',
    beschreibung:
      'Poröse Unterdruckschläuche und defekte Ventile führen zu Fehlereinträgen und unrundem Leerlauf.',
    relevantAbKm: 100000,
    baujahrVon: null,
    baujahrBis: null,
    wahrscheinlichkeit: 'mittel',
    schwere: 'gering',
    kostenVon: 250,
    kostenBis: 900,
    pruefpunkt: 'Fehlerspeicher auslesen, Unterdruckleitungen auf Risse prüfen.',
    frageAnVerkaeufer: 'Liegen Fehlereinträge im Bereich Unterdruck oder Sekundärluft vor?',
    entkraeftetDurch: ['diagnosebericht', 'rechnung'],
    erledigtMuster: [/unterdruck/i, /sekundärluft/i],
  },
  {
    id: 'rs5-s-tronic',
    modellIds: ['audi-rs5-b8'],
    giltFuerGetriebe: ['doppelkupplung'],
    bauteil: 'Getriebe',
    bezeichnung: 'S-tronic Ölservice',
    beschreibung:
      'Das Doppelkupplungsgetriebe verlangt einen Ölservice alle 60.000 km. Versäumnisse zeigen sich an Rucken und Mechatronikfehlern.',
    relevantAbKm: 60000,
    baujahrVon: null,
    baujahrBis: null,
    wahrscheinlichkeit: 'mittel',
    schwere: 'hoch',
    kostenVon: 450,
    kostenBis: 4500,
    pruefpunkt: 'Beleg des Getriebeölservice prüfen, Schaltverhalten im Stau beurteilen.',
    frageAnVerkaeufer: 'Wann wurde der letzte S-tronic-Ölservice gemacht?',
    entkraeftetDurch: ['getrieberechnung', 'digitale-servicehistorie', 'rechnung'],
    erledigtMuster: [/s-?tronic.*(service|öl)/i, /getriebeöl/i],
  },

  /* ---- Audi RS3, 2.5 TFSI ---------------------------------------------- */
  {
    id: 'rs3-steuerkette',
    modellIds: ['audi-rs3-8p'],
    bauteil: 'Motor',
    bezeichnung: 'Steuerkettenspanner',
    beschreibung:
      'Frühe 2.5-TFSI-Motoren zeigen Kettenrasseln beim Kaltstart. Unbehandelt drohen Steuerzeitenfehler.',
    relevantAbKm: 90000,
    baujahrVon: 2011,
    baujahrBis: 2012,
    wahrscheinlichkeit: 'mittel',
    schwere: 'hoch',
    kostenVon: 1200,
    kostenBis: 3000,
    pruefpunkt: 'Kaltstartvideo anfordern, auf Rasseln in den ersten Sekunden achten.',
    frageAnVerkaeufer:
      'Bitte um ein Kaltstartvideo. Wurde der Steuerkettenspanner auf die aktuelle Version umgerüstet?',
    entkraeftetDurch: ['motorrechnung', 'rechnung'],
    erledigtMuster: [/steuerkette/i, /kettenspanner/i],
  },
  {
    id: 'rs3-haldex',
    modellIds: RS3,
    bauteil: 'Antrieb',
    bezeichnung: 'Haldex-Service',
    beschreibung:
      'Die Lamellenkupplung des Allradantriebs verlangt regelmäßigen Ölwechsel; sonst leidet die Momentverteilung.',
    relevantAbKm: 60000,
    baujahrVon: null,
    baujahrBis: null,
    wahrscheinlichkeit: 'mittel',
    schwere: 'gering',
    kostenVon: 200,
    kostenBis: 600,
    pruefpunkt: 'Beleg über Haldex-Ölwechsel prüfen.',
    frageAnVerkaeufer: 'Wann wurde der Haldex-Service zuletzt gemacht?',
    entkraeftetDurch: ['rechnung', 'digitale-servicehistorie'],
    erledigtMuster: [/haldex/i],
  },
  {
    id: 'rs3-wasserpumpe',
    modellIds: RS3,
    bauteil: 'Kühlung',
    bezeichnung: 'Wasserpumpe und Thermostat',
    beschreibung:
      'Verbundgehäuse der Wasserpumpe wird undicht; Wechsel meist gemeinsam mit dem Thermostat.',
    relevantAbKm: 90000,
    baujahrVon: null,
    baujahrBis: null,
    wahrscheinlichkeit: 'mittel',
    schwere: 'gering',
    kostenVon: 500,
    kostenBis: 1200,
    pruefpunkt: 'Kühlmittelstand und Motorraum auf Spuren prüfen.',
    frageAnVerkaeufer: 'Wurde die Wasserpumpe bereits erneuert?',
    entkraeftetDurch: ['rechnung'],
    erledigtMuster: [/wasserpumpe/i],
  },
];

/**
 * Liefert die für ein konkretes Fahrzeug einschlägigen Risiken.
 *
 * Gefiltert wird nach Modell, Baujahr und Laufleistung. Ein Risiko, dessen
 * Kilometergrenze noch nicht erreicht ist, verschwindet nicht — es wird als
 * `bevorstehend` gekennzeichnet, weil es die Restaurationsrechnung und die
 * Haltedauer betrifft.
 */
export interface RisikoTreffer {
  risiko: Modellrisiko;
  faellig: boolean;
  /** Im Inserat oder in Unterlagen als erledigt behauptet. */
  alsErledigtAngegeben: boolean;
  /** Durch eine Unterlage belegt erledigt. */
  belegtErledigt: boolean;
}

export function risikenFuer(
  modellId: string | null,
  baujahr: number | null,
  kilometerstand: number | null,
  getriebe?: Getriebe,
): Modellrisiko[] {
  if (!modellId) return [];
  return MODELLRISIKEN.filter((r) => {
    if (!r.modellIds.includes(modellId)) return false;
    if (baujahr !== null) {
      if (r.baujahrVon !== null && baujahr < r.baujahrVon) return false;
      if (r.baujahrBis !== null && baujahr > r.baujahrBis) return false;
    }
    // Bei unbekanntem Getriebe bleibt das Risiko in der Liste: Ein Prüfpunkt
    // zu viel ist harmloser als ein übersehener Getriebeschaden.
    if (r.giltFuerGetriebe && getriebe && getriebe !== 'unbekannt') {
      if (!r.giltFuerGetriebe.includes(getriebe)) return false;
    }
    // Laufleistung filtert nicht aus, sie steuert nur die Fälligkeit.
    void kilometerstand;
    return true;
  });
}

export const SCHWERE_GEWICHT: Record<Risikoschwere, number> = {
  kritisch: 4,
  hoch: 3,
  mittel: 2,
  gering: 1,
};

export const WAHRSCHEINLICHKEIT_FAKTOR: Record<Risikowahrscheinlichkeit, number> =
  {
    hoch: 0.7,
    mittel: 0.35,
    gering: 0.12,
  };
