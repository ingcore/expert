/**
 * Checklistenaufbau (PRD Abschnitt 8, Schritt 5).
 *
 *   gesetzliche Mindestprüfinhalte
 * + arbeitsmittelspezifische Prüfpunkte
 * + normative Prüfpunkte
 * + Herstelleranforderungen
 * + projektspezifische Prüfpunkte
 *
 * Die gesetzlichen Mindestprüfinhalte stammen ausschließlich aus der Prüfart
 * und werden nicht als Fußnotentext geführt, sondern als strukturierte
 * Prüfpunkte (PRD 3.1).
 */

import type { InspectionTypeId } from './enums';
import type { AssetFamily } from './families';
import { mindestpruefinhalte, pruefart } from './legal/pruefart';
import type { InspectionItem, PruefpunktHerkunft } from './types';

/** Version des Checklistenkataloges — wird im Befund mitgeführt (AC-11). */
export const CHECKLISTEN_VERSION = '2026.1';

/* ==========================================================================
 * Katalog arbeitsmittelspezifischer Prüfpunkte
 * ======================================================================= */

export interface KatalogPunkt {
  id: string;
  abschnitt: string;
  text: string;
  herkunft: PruefpunktHerkunft;
  familien: AssetFamily[];
  /** Nur bei bestimmten Prüfarten aufnehmen; fehlt die Angabe, bei allen. */
  pruefarten?: InspectionTypeId[];
  /** Nur aufnehmen, wenn das Attribut gesetzt ist. */
  nurWennAttribut?: string;
}

const K = (
  id: string,
  abschnitt: string,
  text: string,
  familien: AssetFamily[],
  herkunft: PruefpunktHerkunft = 'ARBEITSMITTEL',
  extra: Partial<KatalogPunkt> = {},
): KatalogPunkt => ({ id, abschnitt, text, familien, herkunft, ...extra });

export const PRUEFPUNKT_KATALOG: KatalogPunkt[] = [
  /* ---- Tore, Türen, Schranken ------------------------------------------ */
  K('TOR_01', 'Bauteile', 'Torblatt, Führungen und Laufrollen auf Verschleiß und Beschädigung geprüft.', ['TOR', 'TUER', 'BRANDSCHUTZABSCHLUSS']),
  K('TOR_02', 'Bauteile', 'Federn, Seile, Ketten und Gewichtsausgleich auf Zustand und Spannung geprüft.', ['TOR', 'BRANDSCHUTZABSCHLUSS']),
  K('TOR_03', 'Sicherheitseinrichtungen', 'Absturzsicherung des Torblattes auf Funktion geprüft.', ['TOR']),
  K('TOR_04', 'Sicherheitseinrichtungen', 'Schließkantensicherung auf Funktion und Ansprechverhalten geprüft.', ['TOR', 'TUER', 'SCHRANKE'], 'NORM', { nurWennAttribut: 'schliesskantensicherung' }),
  K('TOR_05', 'Sicherheitseinrichtungen', 'Lichtschranke bzw. Lichtgitter auf Funktion und Überwachung geprüft.', ['TOR', 'TUER', 'SCHRANKE'], 'NORM', { nurWennAttribut: 'lichtschranke' }),
  K('TOR_06', 'Steuerung', 'Befehlseinrichtungen, Totmannfunktion und Endlagen geprüft.', ['TOR', 'TUER', 'SCHRANKE']),
  K('TOR_07', 'Steuerung', 'Notbetätigung und Handnotentriegelung auf Funktion geprüft.', ['TOR', 'TUER', 'SCHRANKE', 'BRANDSCHUTZABSCHLUSS']),
  K('TOR_08', 'Kennzeichnung', 'Kennzeichnung, Warnhinweise und Bedienungsanleitung am Einsatzort vorhanden.', ['TOR', 'TUER', 'SCHRANKE', 'BRANDSCHUTZABSCHLUSS']),
  K('TOR_09', 'Gehtür', 'Gehtür bzw. Schlupftür mit Türkontakt und Selbstschließung geprüft.', ['TOR'], 'ARBEITSMITTEL', { nurWennAttribut: 'gehtuer' }),

  /* ---- Brandschutzabschlüsse ------------------------------------------- */
  K('BSA_01', 'Brandschutz', 'Selbstschließung und vollständiges Schließen in die Zarge geprüft.', ['BRANDSCHUTZABSCHLUSS'], 'NORM'),
  K('BSA_02', 'Brandschutz', 'Feststellanlage und Auslöseeinrichtung auf Funktion geprüft.', ['BRANDSCHUTZABSCHLUSS'], 'NORM', { nurWennAttribut: 'feststellanlage' }),
  K('BSA_03', 'Brandschutz', 'Kennzeichnung, Zulassungsschild und Dichtungen auf Vollständigkeit geprüft.', ['BRANDSCHUTZABSCHLUSS'], 'NORM'),

  /* ---- Fahrzeughebebühnen ---------------------------------------------- */
  K('FHB_01', 'Tragkonstruktion', 'Tragkonstruktion, Schweißnähte und Befestigung im Untergrund geprüft.', ['FAHRZEUGHEBEBUEHNE']),
  K('FHB_02', 'Hubeinrichtung', 'Hydraulik bzw. Spindeln auf Dichtheit, Verschleiß und Tragmutterzustand geprüft.', ['FAHRZEUGHEBEBUEHNE']),
  K('FHB_03', 'Sicherheitseinrichtungen', 'Mechanische Verriegelung und Absturzsicherung auf Funktion geprüft.', ['FAHRZEUGHEBEBUEHNE']),
  K('FHB_04', 'Sicherheitseinrichtungen', 'Gleichlaufsicherung und Überlastsicherung auf Funktion geprüft.', ['FAHRZEUGHEBEBUEHNE']),
  K('FHB_05', 'Sicherheitseinrichtungen', 'Endschalter, Auffahrsicherung und Notabsenkung auf Funktion geprüft.', ['FAHRZEUGHEBEBUEHNE']),
  K('FHB_06', 'Funktionsprüfung', 'Hub- und Senkbewegung mit Prüflast durchgeführt.', ['FAHRZEUGHEBEBUEHNE'], 'ARBEITSMITTEL', { pruefarten: ['AMVO_7_ACCEPTANCE'] }),
  K('FHB_07', 'Dokumentation', 'Betriebsanleitung, Prüfbuch und Kennzeichnung der Tragfähigkeit vorhanden.', ['FAHRZEUGHEBEBUEHNE'], 'HERSTELLER'),

  /* ---- Flurförderzeuge -------------------------------------------------- */
  K('FFZ_01', 'Tragkonstruktion', 'Hubmast, Gabelzinken und Lastaufnahmemittel auf Verschleiß und Risse geprüft.', ['FLURFOERDERZEUG']),
  K('FFZ_02', 'Hydraulik', 'Hydraulikanlage auf Dichtheit und Senkbremsventile geprüft.', ['FLURFOERDERZEUG']),
  K('FFZ_03', 'Bremsen und Lenkung', 'Betriebs- und Feststellbremse sowie Lenkung geprüft.', ['FLURFOERDERZEUG']),
  K('FFZ_04', 'Sicherheitseinrichtungen', 'Fahrerrückhaltesystem, Fahrerschutzdach und Lastschutzgitter geprüft.', ['FLURFOERDERZEUG']),
  K('FFZ_05', 'Sicherheitseinrichtungen', 'Warneinrichtungen, Beleuchtung und Sitzkontaktschalter geprüft.', ['FLURFOERDERZEUG']),
  K('FFZ_06', 'Energieanlage', 'Batterie, Ladeeinrichtung bzw. Treibgasanlage auf Zustand geprüft.', ['FLURFOERDERZEUG']),
  K('FFZ_07', 'Arbeitskorb', 'Eignung und Herstellerfreigabe des Arbeitskorbes in Verbindung mit dem Hebearbeitsmittel geprüft.', ['FLURFOERDERZEUG'], 'HERSTELLER', { nurWennAttribut: 'arbeitskorb' }),
  K('FFZ_08', 'Kennzeichnung', 'Typenschild, Tragfähigkeitsdiagramm und Bedienungsanleitung vorhanden.', ['FLURFOERDERZEUG']),

  /* ---- Krane ------------------------------------------------------------ */
  K('KRA_01', 'Tragkonstruktion', 'Tragkonstruktion, Laufbahn und Verschraubungen geprüft.', ['KRAN']),
  K('KRA_02', 'Hubwerk', 'Hubwerk, Bremse und Getriebe auf Zustand und Funktion geprüft.', ['KRAN']),
  K('KRA_03', 'Tragmittel', 'Seile, Ketten und Haken einschließlich Hakensicherung auf Ablegereife geprüft.', ['KRAN']),
  K('KRA_04', 'Sicherheitseinrichtungen', 'Endbegrenzungen, Überlastsicherung und Not-Halt geprüft.', ['KRAN']),
  K('KRA_05', 'Steuerung', 'Steuerung, Fernsteuerung und Fahrwerksfunktionen geprüft.', ['KRAN']),
  K('KRA_06', 'Funktionsprüfung', 'Funktionsprüfung mit Prüflast durchgeführt.', ['KRAN'], 'ARBEITSMITTEL', { pruefarten: ['AMVO_7_ACCEPTANCE'] }),

  /* ---- Arbeitsbühnen ---------------------------------------------------- */
  K('ABU_01', 'Tragkonstruktion', 'Tragkonstruktion, Gelenke und Hubeinrichtung auf Zustand geprüft.', ['ARBEITSBUEHNE']),
  K('ABU_02', 'Sicherheitseinrichtungen', 'Not-Aus, Notablass und Notsteuerung auf Funktion geprüft.', ['ARBEITSBUEHNE']),
  K('ABU_03', 'Sicherheitseinrichtungen', 'Last- und Neigungsüberwachung sowie Abstützungsüberwachung geprüft.', ['ARBEITSBUEHNE']),
  K('ABU_04', 'Plattform', 'Geländer, Zugang und Anschlagpunkte der Plattform geprüft.', ['ARBEITSBUEHNE']),
  K('ABU_05', 'Funktionsprüfung', 'Funktionsprüfung mit Nennlast durchgeführt.', ['ARBEITSBUEHNE'], 'NORM'),

  /* ---- Förderanlagen ---------------------------------------------------- */
  K('FOE_01', 'Antrieb', 'Antrieb, Umlenkungen und Spannvorrichtungen auf Zustand geprüft.', ['FOERDERANLAGE']),
  K('FOE_02', 'Schutzeinrichtungen', 'Trennende Schutzeinrichtungen und Einzugstellen geprüft.', ['FOERDERANLAGE']),
  K('FOE_03', 'Sicherheitseinrichtungen', 'Not-Halt-Einrichtungen und Seilzugschalter auf Funktion geprüft.', ['FOERDERANLAGE']),

  /* ---- Absauganlagen ---------------------------------------------------- */
  K('ABS_01', 'Luftführung', 'Rohrleitungen, Erfassungselemente und Dichtheit geprüft.', ['ABSAUGANLAGE']),
  K('ABS_02', 'Abscheider', 'Abscheider und Filter auf Zustand und Wartung geprüft.', ['ABSAUGANLAGE']),
  K('ABS_03', 'Überwachung', 'Überwachungs- und Warneinrichtungen auf Funktion geprüft.', ['ABSAUGANLAGE']),
  K('ABS_04', 'Explosionsschutz', 'Maßnahmen des Explosionsschutzes auf Umsetzung geprüft.', ['ABSAUGANLAGE'], 'NORM', { nurWennAttribut: 'exSchutz' }),

  /* ---- Last- und Anschlagtechnik ---------------------------------------- */
  K('LAM_01', 'Zustand', 'Tragende Bauteile auf Verformung, Risse und Korrosion geprüft.', ['LASTAUFNAHMEMITTEL', 'ANSCHLAGMITTEL_LAST']),
  K('LAM_02', 'Ablegereife', 'Ablegereifekriterien nach Herstellervorgabe beurteilt.', ['LASTAUFNAHMEMITTEL', 'ANSCHLAGMITTEL_LAST'], 'HERSTELLER'),
  K('LAM_03', 'Kennzeichnung', 'Kennzeichnung der Tragfähigkeit und Herstellerangaben lesbar.', ['LASTAUFNAHMEMITTEL', 'ANSCHLAGMITTEL_LAST']),

  /* ---- Anschlagpunkte gegen Absturz ------------------------------------- */
  K('APS_01', 'Verankerung', 'Verankerung und Untergrund auf Zustand und Korrosion geprüft.', ['ANSCHLAGPUNKT_PSA'], 'NORM'),
  K('APS_02', 'Anschlagpunkt', 'Anschlagpunkte auf Verformung, Risse und Beschädigung geprüft.', ['ANSCHLAGPUNKT_PSA'], 'NORM'),
  K('APS_03', 'System', 'Führungen, Seil bzw. Schiene und Falldämpfer auf Zustand geprüft.', ['ANSCHLAGPUNKT_PSA'], 'NORM'),
  K('APS_04', 'Dokumentation', 'Montagenachweis, Kennzeichnung und Herstellerdokumentation vorhanden.', ['ANSCHLAGPUNKT_PSA'], 'HERSTELLER'),

  /* ---- Allgemein --------------------------------------------------------- */
  K('ALL_01', 'Umfeld', 'Aufstellungsort, Verkehrswege und Umgebungsbedingungen beurteilt.', [
    'FLURFOERDERZEUG', 'TUER', 'TOR', 'KRAN', 'SCHRANKE', 'FAHRZEUGHEBEBUEHNE',
    'ARBEITSBUEHNE', 'FOERDERANLAGE', 'ABSAUGANLAGE', 'BRANDSCHUTZABSCHLUSS',
    'LASTAUFNAHMEMITTEL', 'ANSCHLAGMITTEL_LAST', 'ANSCHLAGPUNKT_PSA', 'SONSTIGES',
  ]),
];

/* ==========================================================================
 * Aufbau der Checkliste
 * ======================================================================= */

let laufendeNummer = 0;
function itemId(prefix: string): string {
  laufendeNummer += 1;
  return `${prefix}_${laufendeNummer.toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export interface ChecklistenKontext {
  pruefart: InspectionTypeId;
  familie: AssetFamily;
  attribute: Record<string, unknown>;
}

/** Ist das Attribut im Sinne der Katalogbedingung gesetzt? */
function attributGesetzt(attribute: Record<string, unknown>, key: string): boolean {
  const wert = attribute[key];
  if (wert === true) return true;
  if (wert === 'JA') return true;
  return false;
}

/**
 * Baut die Checkliste auf. Die gesetzlichen Mindestprüfinhalte stehen immer
 * voran und stammen ausschließlich aus der gewählten Prüfart — dadurch kann
 * eine §-8-Prüfung keinen §-7-Prüfinhalt tragen (AC-01, AC-02).
 */
export function baueCheckliste(ctx: ChecklistenKontext): InspectionItem[] {
  const art = pruefart(ctx.pruefart);
  const arbeitskorb = attributGesetzt(ctx.attribute, 'arbeitskorb');

  const gesetzlich: InspectionItem[] = mindestpruefinhalte(ctx.pruefart, {
    arbeitskorb,
  }).map((m) => ({
    id: itemId('itm'),
    katalogRef: m.id,
    herkunft: 'GESETZ' as const,
    abschnitt: `Mindestprüfinhalt ${art.kurz}`,
    text: `${m.ziffer}. ${m.text}`,
    ergebnis: null,
    bemerkung: '',
  }));

  const spezifisch: InspectionItem[] = PRUEFPUNKT_KATALOG.filter((k) => {
    if (!k.familien.includes(ctx.familie)) return false;
    if (k.pruefarten && !k.pruefarten.includes(ctx.pruefart)) return false;
    if (k.nurWennAttribut && !attributGesetzt(ctx.attribute, k.nurWennAttribut))
      return false;
    return true;
  }).map((k) => ({
    id: itemId('itm'),
    katalogRef: k.id,
    herkunft: k.herkunft,
    abschnitt: k.abschnitt,
    text: k.text,
    ergebnis: null,
    bemerkung: '',
  }));

  return [...gesetzlich, ...spezifisch];
}

/** Gruppiert die Checkliste für die Darstellung. */
export function nachAbschnitten(
  items: InspectionItem[],
): { abschnitt: string; items: InspectionItem[] }[] {
  const gruppen = new Map<string, InspectionItem[]>();
  for (const item of items) {
    const liste = gruppen.get(item.abschnitt);
    if (liste) liste.push(item);
    else gruppen.set(item.abschnitt, [item]);
  }
  return [...gruppen.entries()].map(([abschnitt, items]) => ({ abschnitt, items }));
}

export interface ChecklistenStand {
  gesamt: number;
  beurteilt: number;
  ok: number;
  mangel: number;
  na: number;
  nichtPruefbar: number;
  offen: number;
  vollstaendig: boolean;
}

export function checklistenStand(items: InspectionItem[]): ChecklistenStand {
  const zaehle = (e: string) => items.filter((i) => i.ergebnis === e).length;
  const beurteilt = items.filter((i) => i.ergebnis !== null).length;
  return {
    gesamt: items.length,
    beurteilt,
    ok: zaehle('OK'),
    mangel: zaehle('MANGEL'),
    na: zaehle('NA'),
    nichtPruefbar: zaehle('NICHT_PRUEFBAR'),
    offen: items.length - beurteilt,
    vollstaendig: items.length > 0 && beurteilt === items.length,
  };
}
