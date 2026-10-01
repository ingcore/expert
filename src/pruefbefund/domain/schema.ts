/**
 * Typabhängige technische Eigenschaften (PRD Abschnitt 7.2 und 12).
 *
 * Jede Anlagenfamilie besitzt ein **eigenes** Attributschema. Es gibt
 * ausdrücklich keine Universaltabelle mit sämtlichen möglichen Anlagenfeldern.
 *
 * Jede Feldgruppe trägt eine `applicability_rule`. Dadurch kann eine
 * Fahrzeughebebühne kein EN-12453-Schutzniveau erhalten und ein Anschlagpunkt
 * keine Torblattmasse (AC-07).
 */

import { trifftZu, type JsonLogic } from '@/engine/jsonlogic';
import type { AssetFamily } from './families';

/* ==========================================================================
 * Felddefinition
 * ======================================================================= */

export type AttributTyp = 'text' | 'zahl' | 'auswahl' | 'bool';

export interface AttributOption {
  value: string;
  label: string;
}

export interface AttributDef {
  /** Schlüssel innerhalb von `asset.attribute`. */
  key: string;
  label: string;
  typ: AttributTyp;
  einheit?: string;
  optionen?: AttributOption[];
  hinweis?: string;
  /**
   * `applicability_rule` (PRD 12): Familien, in deren Schema das Feld
   * überhaupt vorkommen darf. Ein Feld außerhalb dieser Liste ist ein
   * anlagenfremdes Feld und blockiert die Freigabe.
   */
  familien: AssetFamily[];
  /** Zusätzliche Bedingung über die bereits erfassten Attribute. */
  bedingung?: JsonLogic;
  /** Pflichtfeld innerhalb der Familie. */
  pflicht?: boolean;
}

export interface AttributGruppe {
  /** Stabile ID der Feldgruppe. */
  id: string;
  titel: string;
  /** `applicability_rule` der gesamten Gruppe. */
  familien: AssetFamily[];
  bedingung?: JsonLogic;
  felder: AttributDef[];
}

/* ==========================================================================
 * Schemata je Anlagenfamilie
 * ======================================================================= */

const JA_NEIN: AttributOption[] = [
  { value: 'JA', label: 'vorhanden' },
  { value: 'NEIN', label: 'nicht vorhanden' },
];

/** Tore, Türen und Schranken — Antrieb, Steuerung, Schutzeinrichtungen. */
const GRUPPE_TOR_GEOMETRIE: AttributGruppe = {
  id: 'TOR_GEOMETRIE',
  titel: 'Geometrie und Masse',
  familien: ['TOR', 'TUER', 'BRANDSCHUTZABSCHLUSS'],
  felder: [
    {
      key: 'breite',
      label: 'Lichte Breite',
      typ: 'zahl',
      einheit: 'm',
      familien: ['TOR', 'TUER', 'BRANDSCHUTZABSCHLUSS'],
    },
    {
      key: 'hoehe',
      label: 'Lichte Höhe',
      typ: 'zahl',
      einheit: 'm',
      familien: ['TOR', 'TUER', 'BRANDSCHUTZABSCHLUSS'],
    },
    {
      key: 'torblattflaeche',
      label: 'Torblattfläche',
      typ: 'zahl',
      einheit: 'm²',
      hinweis:
        'Maßgeblich für die Abnahmeprüfpflicht nach oben öffnender Tore über 10 m².',
      familien: ['TOR', 'BRANDSCHUTZABSCHLUSS'],
    },
    {
      key: 'torblattmasse',
      label: 'Torblattmasse',
      typ: 'zahl',
      einheit: 'kg',
      familien: ['TOR', 'BRANDSCHUTZABSCHLUSS'],
    },
    {
      key: 'oeffnungsrichtung',
      label: 'Öffnungsrichtung',
      typ: 'auswahl',
      optionen: [
        { value: 'OBEN', label: 'nach oben öffnend' },
        { value: 'SEITLICH', label: 'seitlich öffnend' },
        { value: 'SCHWENKEND', label: 'schwenkend' },
      ],
      familien: ['TOR', 'TUER', 'BRANDSCHUTZABSCHLUSS'],
    },
  ],
};

const GRUPPE_TOR_ANTRIEB: AttributGruppe = {
  id: 'TOR_ANTRIEB',
  titel: 'Antrieb und Steuerung',
  familien: ['TOR', 'TUER', 'SCHRANKE', 'BRANDSCHUTZABSCHLUSS'],
  felder: [
    {
      key: 'kraftbetrieben',
      label: 'Kraftbetrieben',
      typ: 'bool',
      hinweis:
        'Der Kraftbetrieb entscheidet über das Rechtsprofil — nicht die Bauart.',
      familien: ['TOR', 'TUER', 'SCHRANKE', 'BRANDSCHUTZABSCHLUSS'],
      pflicht: true,
    },
    {
      key: 'antriebsart',
      label: 'Antriebsart',
      typ: 'auswahl',
      optionen: [
        { value: 'ELEKTRISCH', label: 'elektrisch' },
        { value: 'HYDRAULISCH', label: 'hydraulisch' },
        { value: 'PNEUMATISCH', label: 'pneumatisch' },
        { value: 'HAND', label: 'handbetrieben' },
      ],
      familien: ['TOR', 'TUER', 'SCHRANKE', 'BRANDSCHUTZABSCHLUSS'],
    },
    {
      key: 'antriebHersteller',
      label: 'Hersteller Antrieb',
      typ: 'text',
      familien: ['TOR', 'TUER', 'SCHRANKE', 'BRANDSCHUTZABSCHLUSS'],
      bedingung: { '==': [{ var: 'attr.kraftbetrieben' }, true] },
    },
    {
      key: 'antriebType',
      label: 'Antriebstype',
      typ: 'text',
      familien: ['TOR', 'TUER', 'SCHRANKE', 'BRANDSCHUTZABSCHLUSS'],
      bedingung: { '==': [{ var: 'attr.kraftbetrieben' }, true] },
    },
    {
      key: 'spannung',
      label: 'Spannung',
      typ: 'text',
      familien: ['TOR', 'TUER', 'SCHRANKE', 'BRANDSCHUTZABSCHLUSS'],
      bedingung: { '==': [{ var: 'attr.kraftbetrieben' }, true] },
    },
    {
      key: 'steuerungsart',
      label: 'Steuerungsart',
      typ: 'auswahl',
      optionen: [
        { value: 'TOTMANN', label: 'Totmannsteuerung' },
        { value: 'SELBSTHALTUNG', label: 'Selbsthaltung / Impulssteuerung' },
        { value: 'AUTOMATIK', label: 'Automatikbetrieb' },
      ],
      familien: ['TOR', 'TUER', 'SCHRANKE', 'BRANDSCHUTZABSCHLUSS'],
      bedingung: { '==': [{ var: 'attr.kraftbetrieben' }, true] },
    },
    {
      key: 'bedienelemente',
      label: 'Bedienelemente',
      typ: 'text',
      familien: ['TOR', 'TUER', 'SCHRANKE', 'BRANDSCHUTZABSCHLUSS'],
    },
    {
      key: 'notbetaetigung',
      label: 'Notbetätigung',
      typ: 'auswahl',
      optionen: JA_NEIN,
      familien: ['TOR', 'TUER', 'SCHRANKE', 'BRANDSCHUTZABSCHLUSS'],
    },
  ],
};

const GRUPPE_TOR_SCHUTZ: AttributGruppe = {
  id: 'TOR_SCHUTZ',
  titel: 'Sicherheitseinrichtungen und Nutzerklassifizierung',
  // Nutzerklassifizierung nach EN 12453 nur bei Tür-, Tor- und
  // Schrankenprofilen (PRD 12).
  familien: ['TOR', 'TUER', 'SCHRANKE'],
  bedingung: { '==': [{ var: 'attr.kraftbetrieben' }, true] },
  felder: [
    {
      key: 'schliesskantensicherung',
      label: 'Schließkantensicherung',
      typ: 'auswahl',
      optionen: JA_NEIN,
      familien: ['TOR', 'TUER', 'SCHRANKE'],
    },
    {
      key: 'lichtschranke',
      label: 'Lichtschranke / Lichtgitter',
      typ: 'auswahl',
      optionen: JA_NEIN,
      familien: ['TOR', 'TUER', 'SCHRANKE'],
    },
    {
      key: 'absturzsicherung',
      label: 'Absturzsicherung des Torblattes',
      typ: 'auswahl',
      optionen: JA_NEIN,
      familien: ['TOR'],
    },
    {
      key: 'gehtuer',
      label: 'Gehtür / Schlupftür',
      typ: 'auswahl',
      optionen: JA_NEIN,
      familien: ['TOR'],
    },
    {
      key: 'nutzerklassifizierung',
      label: 'Nutzerklassifizierung nach EN 12453',
      typ: 'auswahl',
      optionen: [
        { value: 'KLASSE_1', label: 'Klasse 1 — unterwiesene Person, Totmann' },
        { value: 'KLASSE_2', label: 'Klasse 2 — unterwiesene Personen' },
        { value: 'KLASSE_3', label: 'Klasse 3 — unbegrenzter Nutzerkreis' },
      ],
      hinweis:
        'Nur zulässig, wenn ÖNORM EN 12453 als Prüfgrundlage zugeordnet ist.',
      familien: ['TOR', 'TUER', 'SCHRANKE'],
    },
    {
      key: 'schutzniveau',
      label: 'Schutzniveau nach EN 12453',
      typ: 'text',
      familien: ['TOR', 'TUER', 'SCHRANKE'],
    },
  ],
};

const GRUPPE_BRANDSCHUTZ: AttributGruppe = {
  id: 'BRANDSCHUTZ',
  titel: 'Brandschutztechnische Eigenschaften',
  familien: ['BRANDSCHUTZABSCHLUSS'],
  felder: [
    {
      key: 'feuerwiderstandsklasse',
      label: 'Feuerwiderstandsklasse',
      typ: 'text',
      hinweis: 'Klassifizierung nach EN 13501-2, z. B. EI2 30-C.',
      familien: ['BRANDSCHUTZABSCHLUSS'],
    },
    {
      key: 'feststellanlage',
      label: 'Feststellanlage',
      typ: 'auswahl',
      optionen: JA_NEIN,
      familien: ['BRANDSCHUTZABSCHLUSS'],
    },
    {
      key: 'ausloeseeinrichtung',
      label: 'Auslöseeinrichtung',
      typ: 'text',
      familien: ['BRANDSCHUTZABSCHLUSS'],
      bedingung: { '==': [{ var: 'attr.feststellanlage' }, 'JA'] },
    },
    {
      key: 'zulassungsnummer',
      label: 'Zulassungs- bzw. Prüfzeugnisnummer',
      typ: 'text',
      familien: ['BRANDSCHUTZABSCHLUSS'],
    },
  ],
};

const GRUPPE_FHB: AttributGruppe = {
  id: 'FHB_TECHNIK',
  titel: 'Technische Kenndaten der Hebebühne',
  familien: ['FAHRZEUGHEBEBUEHNE'],
  felder: [
    {
      key: 'tragfaehigkeit',
      label: 'Tragfähigkeit',
      typ: 'zahl',
      einheit: 'kg',
      familien: ['FAHRZEUGHEBEBUEHNE'],
      pflicht: true,
    },
    {
      key: 'hubhoehe',
      label: 'Hubhöhe',
      typ: 'zahl',
      einheit: 'm',
      familien: ['FAHRZEUGHEBEBUEHNE'],
    },
    {
      key: 'antrieb',
      label: 'Antrieb',
      typ: 'auswahl',
      optionen: [
        { value: 'HYDRAULISCH', label: 'hydraulisch' },
        { value: 'SPINDEL', label: 'Spindel' },
        { value: 'ELEKTROMECHANISCH', label: 'elektromechanisch' },
      ],
      familien: ['FAHRZEUGHEBEBUEHNE'],
    },
    {
      key: 'gleichlaufsicherung',
      label: 'Gleichlaufsicherung',
      typ: 'auswahl',
      optionen: JA_NEIN,
      familien: ['FAHRZEUGHEBEBUEHNE'],
    },
    {
      key: 'verriegelung',
      label: 'Mechanische Verriegelung',
      typ: 'auswahl',
      optionen: JA_NEIN,
      familien: ['FAHRZEUGHEBEBUEHNE'],
    },
    {
      key: 'notabsenkung',
      label: 'Notabsenkung',
      typ: 'auswahl',
      optionen: JA_NEIN,
      familien: ['FAHRZEUGHEBEBUEHNE'],
    },
    {
      key: 'auffahrsicherung',
      label: 'Auffahrsicherung',
      typ: 'auswahl',
      optionen: JA_NEIN,
      familien: ['FAHRZEUGHEBEBUEHNE'],
    },
    {
      key: 'endschalter',
      label: 'Endschalter',
      typ: 'auswahl',
      optionen: JA_NEIN,
      familien: ['FAHRZEUGHEBEBUEHNE'],
    },
    {
      key: 'ueberlastsicherung',
      label: 'Überlastsicherung',
      typ: 'auswahl',
      optionen: JA_NEIN,
      familien: ['FAHRZEUGHEBEBUEHNE'],
    },
  ],
};

const GRUPPE_FFZ: AttributGruppe = {
  id: 'FFZ_TECHNIK',
  titel: 'Technische Kenndaten des Flurförderzeuges',
  familien: ['FLURFOERDERZEUG'],
  felder: [
    {
      key: 'tragfaehigkeit',
      label: 'Tragfähigkeit',
      typ: 'zahl',
      einheit: 'kg',
      familien: ['FLURFOERDERZEUG'],
      pflicht: true,
    },
    {
      key: 'lastschwerpunkt',
      label: 'Lastschwerpunkt',
      typ: 'zahl',
      einheit: 'mm',
      familien: ['FLURFOERDERZEUG'],
    },
    {
      key: 'hubhoehe',
      label: 'Hubhöhe',
      typ: 'zahl',
      einheit: 'mm',
      familien: ['FLURFOERDERZEUG'],
    },
    {
      key: 'masttyp',
      label: 'Masttyp',
      typ: 'auswahl',
      optionen: [
        { value: 'STANDARD', label: 'Standardmast' },
        { value: 'DUPLEX', label: 'Duplexmast' },
        { value: 'TRIPLEX', label: 'Triplexmast' },
      ],
      familien: ['FLURFOERDERZEUG'],
    },
    {
      key: 'energieart',
      label: 'Energieart',
      typ: 'auswahl',
      optionen: [
        { value: 'ELEKTRO', label: 'Elektro' },
        { value: 'DIESEL', label: 'Diesel' },
        { value: 'TREIBGAS', label: 'Treibgas' },
        { value: 'BRENNSTOFFZELLE', label: 'Brennstoffzelle' },
      ],
      familien: ['FLURFOERDERZEUG'],
    },
    {
      key: 'bedienart',
      label: 'Bedienart',
      typ: 'auswahl',
      optionen: [
        { value: 'SITZ', label: 'Sitzfahrer' },
        { value: 'STAND', label: 'Standfahrer' },
        { value: 'MITGEHEND', label: 'Mitgänger' },
        { value: 'AUTONOM', label: 'autonom' },
      ],
      familien: ['FLURFOERDERZEUG'],
    },
    {
      key: 'fahrerplatzHubbewegt',
      label: 'Hubbewegter Fahrerplatz',
      typ: 'bool',
      hinweis: 'Begründet ein eigenes Rechtsprofil (PRD 5).',
      familien: ['FLURFOERDERZEUG'],
    },
    {
      key: 'arbeitskorb',
      label: 'Arbeitskorb vorhanden',
      typ: 'bool',
      hinweis:
        'Löst den zusätzlichen Prüfinhalt „Eignung des Hebearbeitsmittels" aus.',
      familien: ['FLURFOERDERZEUG', 'KRAN'],
    },
    {
      key: 'anbaugeraete',
      label: 'Anbaugeräte',
      typ: 'text',
      familien: ['FLURFOERDERZEUG'],
    },
  ],
};

const GRUPPE_KRAN: AttributGruppe = {
  id: 'KRAN_TECHNIK',
  titel: 'Technische Kenndaten des Kranes',
  familien: ['KRAN'],
  felder: [
    {
      key: 'tragfaehigkeit',
      label: 'Tragfähigkeit',
      typ: 'zahl',
      einheit: 'kg',
      familien: ['KRAN'],
      pflicht: true,
    },
    {
      key: 'ausladung',
      label: 'Ausladung',
      typ: 'zahl',
      einheit: 'm',
      familien: ['KRAN'],
    },
    {
      key: 'lastmoment',
      label: 'Lastmoment',
      typ: 'zahl',
      einheit: 'kNm',
      familien: ['KRAN'],
    },
    { key: 'hubwerk', label: 'Hubwerk', typ: 'text', familien: ['KRAN'] },
    { key: 'fahrwerk', label: 'Fahrwerk', typ: 'text', familien: ['KRAN'] },
    { key: 'steuerung', label: 'Steuerung', typ: 'text', familien: ['KRAN'] },
    { key: 'tragmittel', label: 'Tragmittel', typ: 'text', familien: ['KRAN'] },
    {
      key: 'endbegrenzungen',
      label: 'Endbegrenzungen',
      typ: 'auswahl',
      optionen: JA_NEIN,
      familien: ['KRAN'],
    },
    {
      key: 'seilketteGeprueft',
      label: 'Seil- bzw. Kettenprüfung durchgeführt',
      typ: 'auswahl',
      optionen: JA_NEIN,
      familien: ['KRAN', 'LASTAUFNAHMEMITTEL', 'ANSCHLAGMITTEL_LAST'],
    },
  ],
};

const GRUPPE_ABU: AttributGruppe = {
  id: 'ABU_TECHNIK',
  titel: 'Technische Kenndaten der Arbeitsbühne',
  familien: ['ARBEITSBUEHNE'],
  felder: [
    {
      key: 'nennlast',
      label: 'Nennlast',
      typ: 'zahl',
      einheit: 'kg',
      familien: ['ARBEITSBUEHNE'],
      pflicht: true,
    },
    {
      key: 'personenanzahl',
      label: 'Zulässige Personenanzahl',
      typ: 'zahl',
      familien: ['ARBEITSBUEHNE'],
    },
    {
      key: 'arbeitshoehe',
      label: 'Arbeitshöhe',
      typ: 'zahl',
      einheit: 'm',
      familien: ['ARBEITSBUEHNE'],
    },
    {
      key: 'plattformhoehe',
      label: 'Plattformhöhe',
      typ: 'zahl',
      einheit: 'm',
      familien: ['ARBEITSBUEHNE'],
    },
    {
      key: 'reichweite',
      label: 'Seitliche Reichweite',
      typ: 'zahl',
      einheit: 'm',
      familien: ['ARBEITSBUEHNE'],
    },
    {
      key: 'abstuetzung',
      label: 'Abstützung',
      typ: 'auswahl',
      optionen: JA_NEIN,
      familien: ['ARBEITSBUEHNE'],
    },
    {
      key: 'notablass',
      label: 'Notablass / Notsteuerung',
      typ: 'auswahl',
      optionen: JA_NEIN,
      familien: ['ARBEITSBUEHNE'],
    },
  ],
};

const GRUPPE_FOERDER: AttributGruppe = {
  id: 'FOERDER_TECHNIK',
  titel: 'Technische Kenndaten der Förderanlage',
  familien: ['FOERDERANLAGE'],
  felder: [
    {
      key: 'foerderlaenge',
      label: 'Förderlänge',
      typ: 'zahl',
      einheit: 'm',
      familien: ['FOERDERANLAGE'],
    },
    {
      key: 'foerdergeschwindigkeit',
      label: 'Fördergeschwindigkeit',
      typ: 'zahl',
      einheit: 'm/s',
      familien: ['FOERDERANLAGE'],
    },
    {
      key: 'notHalt',
      label: 'Not-Halt-Einrichtung',
      typ: 'auswahl',
      optionen: JA_NEIN,
      familien: ['FOERDERANLAGE'],
    },
    {
      key: 'schutzeinrichtungen',
      label: 'Trennende Schutzeinrichtungen',
      typ: 'text',
      familien: ['FOERDERANLAGE'],
    },
  ],
};

const GRUPPE_ABSAUG: AttributGruppe = {
  id: 'ABSAUG_TECHNIK',
  titel: 'Technische Kenndaten der Absauganlage',
  familien: ['ABSAUGANLAGE'],
  felder: [
    {
      key: 'volumenstrom',
      label: 'Volumenstrom',
      typ: 'zahl',
      einheit: 'm³/h',
      familien: ['ABSAUGANLAGE'],
    },
    {
      key: 'abscheideart',
      label: 'Abscheideart',
      typ: 'text',
      familien: ['ABSAUGANLAGE'],
    },
    {
      key: 'exSchutz',
      label: 'Explosionsschutzkonzept vorhanden',
      typ: 'auswahl',
      optionen: JA_NEIN,
      familien: ['ABSAUGANLAGE'],
    },
    {
      key: 'ueberwachung',
      label: 'Überwachungseinrichtung',
      typ: 'text',
      familien: ['ABSAUGANLAGE'],
    },
  ],
};

const GRUPPE_LAST: AttributGruppe = {
  id: 'LAST_TECHNIK',
  titel: 'Kenndaten des Last- bzw. Anschlagmittels',
  familien: ['LASTAUFNAHMEMITTEL', 'ANSCHLAGMITTEL_LAST'],
  felder: [
    {
      key: 'tragfaehigkeit',
      label: 'Tragfähigkeit',
      typ: 'zahl',
      einheit: 'kg',
      familien: ['LASTAUFNAHMEMITTEL', 'ANSCHLAGMITTEL_LAST'],
      pflicht: true,
    },
    {
      key: 'werkstoff',
      label: 'Werkstoff / Güteklasse',
      typ: 'text',
      familien: ['LASTAUFNAHMEMITTEL', 'ANSCHLAGMITTEL_LAST'],
    },
    {
      key: 'ablegereife',
      label: 'Ablegereifekriterien geprüft',
      typ: 'auswahl',
      optionen: JA_NEIN,
      familien: ['LASTAUFNAHMEMITTEL', 'ANSCHLAGMITTEL_LAST'],
    },
  ],
};

const GRUPPE_PSA: AttributGruppe = {
  id: 'PSA_TECHNIK',
  titel: 'Kenndaten der Anschlageinrichtung gegen Absturz',
  familien: ['ANSCHLAGPUNKT_PSA'],
  felder: [
    {
      key: 'normtyp',
      label: 'Typ nach ÖNORM EN 795',
      typ: 'auswahl',
      optionen: [
        { value: 'TYP_A', label: 'Typ A — strukturelle Verankerung' },
        { value: 'TYP_B', label: 'Typ B — transportabel' },
        { value: 'TYP_C', label: 'Typ C — horizontale Führung, flexibel' },
        { value: 'TYP_D', label: 'Typ D — horizontale Führung, starr' },
        { value: 'TYP_E', label: 'Typ E — Gewichtsanker' },
      ],
      familien: ['ANSCHLAGPUNKT_PSA'],
      pflicht: true,
    },
    {
      key: 'personenanzahl',
      label: 'Zulässige Personenanzahl',
      typ: 'zahl',
      familien: ['ANSCHLAGPUNKT_PSA'],
    },
    {
      key: 'untergrund',
      label: 'Untergrund / Verankerung',
      typ: 'text',
      familien: ['ANSCHLAGPUNKT_PSA'],
    },
    {
      key: 'anzahlPunkte',
      label: 'Anzahl Anschlagpunkte',
      typ: 'zahl',
      familien: ['ANSCHLAGPUNKT_PSA'],
    },
    {
      key: 'montagenachweis',
      label: 'Montagenachweis vorhanden',
      typ: 'auswahl',
      optionen: JA_NEIN,
      familien: ['ANSCHLAGPUNKT_PSA'],
    },
  ],
};

export const ATTRIBUT_GRUPPEN: AttributGruppe[] = [
  GRUPPE_TOR_GEOMETRIE,
  GRUPPE_TOR_ANTRIEB,
  GRUPPE_TOR_SCHUTZ,
  GRUPPE_BRANDSCHUTZ,
  GRUPPE_FHB,
  GRUPPE_FFZ,
  GRUPPE_KRAN,
  GRUPPE_ABU,
  GRUPPE_FOERDER,
  GRUPPE_ABSAUG,
  GRUPPE_LAST,
  GRUPPE_PSA,
];

/* ==========================================================================
 * Auswertung des Schemas
 * ======================================================================= */

/** Auswertungskontext für die Feldbedingungen. */
export interface SchemaKontext {
  familie: AssetFamily;
  bauart: string;
  attr: Record<string, unknown>;
}

/** Gruppen, die für diese Familie überhaupt in Betracht kommen. */
export function gruppenFuerFamilie(familie: AssetFamily): AttributGruppe[] {
  return ATTRIBUT_GRUPPEN.filter((g) => g.familien.includes(familie));
}

/** Gilt die Gruppe im aktuellen Zustand des Arbeitsmittels? */
export function gruppeSichtbar(
  gruppe: AttributGruppe,
  ctx: SchemaKontext,
): boolean {
  if (!gruppe.familien.includes(ctx.familie)) return false;
  if (gruppe.bedingung && !trifftZu(gruppe.bedingung, ctx as never)) return false;
  return true;
}

/** Gilt das Feld im aktuellen Zustand des Arbeitsmittels? */
export function feldSichtbar(feld: AttributDef, ctx: SchemaKontext): boolean {
  if (!feld.familien.includes(ctx.familie)) return false;
  if (feld.bedingung && !trifftZu(feld.bedingung, ctx as never)) return false;
  return true;
}

/** Alle im aktuellen Zustand gültigen Felder, in Schemareihenfolge. */
export function sichtbareFelder(ctx: SchemaKontext): AttributDef[] {
  return ATTRIBUT_GRUPPEN.filter((g) => gruppeSichtbar(g, ctx)).flatMap((g) =>
    g.felder.filter((f) => feldSichtbar(f, ctx)),
  );
}

/** Definition eines Feldes innerhalb der Familie; null, wenn fachfremd. */
export function feldDefinition(
  familie: AssetFamily,
  key: string,
): AttributDef | null {
  for (const gruppe of ATTRIBUT_GRUPPEN) {
    if (!gruppe.familien.includes(familie)) continue;
    const feld = gruppe.felder.find((f) => f.key === key);
    if (feld && feld.familien.includes(familie)) return feld;
  }
  return null;
}

/**
 * Findet anlagenfremde Attribute (AC-07). Jeder gefundene Schlüssel blockiert
 * die Freigabe des Befundes.
 */
export function anlagenfremdeFelder(
  familie: AssetFamily,
  attr: Record<string, unknown>,
): string[] {
  return Object.keys(attr).filter((key) => feldDefinition(familie, key) === null);
}

/** Klartextbeschriftung eines Attributwertes für den Befund. */
export function attributAnzeige(
  feld: AttributDef,
  wert: unknown,
): string | null {
  if (wert === undefined || wert === null || wert === '') return null;
  if (feld.typ === 'bool') return wert === true ? 'ja' : 'nein';
  if (feld.typ === 'auswahl') {
    return feld.optionen?.find((o) => o.value === wert)?.label ?? String(wert);
  }
  if (feld.typ === 'zahl') {
    const zahl = Number(wert);
    if (!Number.isFinite(zahl)) return null;
    const text = zahl.toLocaleString('de-AT', { maximumFractionDigits: 2 });
    return feld.einheit ? `${text} ${feld.einheit}` : text;
  }
  return String(wert);
}
