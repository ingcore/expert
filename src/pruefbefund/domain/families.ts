/**
 * Anlagenfamilien und Bauarten (PRD Abschnitt 4).
 *
 * Die Anwendung unterscheidet strikt zwischen **Anlagenfamilie** (fachliche
 * Gattung, bestimmt Rechtsprofil und Attributschema) und **Bauart** (konkrete
 * Ausführung innerhalb der Familie). Beides zusammen entscheidet, welche
 * Prüfpflichten und welche technischen Felder überhaupt in Betracht kommen.
 */

/** Anlagenfamilie des MVP. */
export type AssetFamily =
  | 'FLURFOERDERZEUG'
  | 'TUER'
  | 'TOR'
  | 'KRAN'
  | 'SCHRANKE'
  | 'FAHRZEUGHEBEBUEHNE'
  | 'ARBEITSBUEHNE'
  | 'FOERDERANLAGE'
  | 'ABSAUGANLAGE'
  | 'BRANDSCHUTZABSCHLUSS'
  | 'LASTAUFNAHMEMITTEL'
  | 'ANSCHLAGMITTEL_LAST'
  | 'ANSCHLAGPUNKT_PSA'
  | 'SONSTIGES';

export interface Bauart {
  code: string;
  label: string;
}

export interface FamilyDef {
  code: AssetFamily;
  label: string;
  /** Kurzform für Befundnummer und Listen. */
  kuerzel: string;
  /** Erläuterung der fachlichen Abgrenzung. */
  abgrenzung: string;
  bauarten: Bauart[];
}

/**
 * Anschlagpunkte für persönliche Absturzsicherung sind ausdrücklich eine
 * **eigenständige** Familie und werden nicht mit Anschlagmitteln für Lasten
 * gleichgesetzt (PRD 4 und 5).
 */
export const FAMILIES: FamilyDef[] = [
  {
    code: 'FLURFOERDERZEUG',
    label: 'Flurförderzeuge',
    kuerzel: 'FFZ',
    abgrenzung:
      'Selbstfahrende Arbeitsmittel zum Heben und Befördern von Lasten im Betrieb.',
    bauarten: [
      { code: 'GABELSTAPLER', label: 'Gabelstapler' },
      { code: 'HOCHHUBWAGEN', label: 'Hochhubwagen' },
      { code: 'SCHUBMASTSTAPLER', label: 'Schubmaststapler' },
      { code: 'KOMMISSIONIERSTAPLER', label: 'Kommissionierstapler' },
      { code: 'HOCHREGALSTAPLER', label: 'Hochregalstapler' },
      { code: 'SCHMALGANGSTAPLER', label: 'Schmalgangstapler' },
      { code: 'FTS', label: 'Fahrerloses Transportsystem' },
    ],
  },
  {
    code: 'TUER',
    label: 'Türen',
    kuerzel: 'TUE',
    abgrenzung:
      'Türen in Verkehrs- und Betriebsbereichen; kraftbetriebene Ausführungen sind gesondert zu kennzeichnen.',
    bauarten: [
      { code: 'DREHTUER', label: 'Drehtür' },
      { code: 'SCHIEBETUER', label: 'Schiebetür' },
      { code: 'KARUSSELLTUER', label: 'Karusselltür' },
      { code: 'FALTTUER', label: 'Falttür' },
      { code: 'RUNDBOGENTUER', label: 'Rundlauftür' },
    ],
  },
  {
    code: 'TOR',
    label: 'Tore',
    kuerzel: 'TOR',
    abgrenzung:
      'Tore aller Bauarten; maßgeblich sind Kraftbetrieb und Torblattfläche.',
    bauarten: [
      { code: 'SEKTIONALTOR', label: 'Sektionaltor' },
      { code: 'ROLLTOR', label: 'Rolltor' },
      { code: 'SCHIEBETOR', label: 'Schiebetor' },
      { code: 'ROLLGITTER', label: 'Rollgitter' },
      { code: 'DREHTOR', label: 'Drehtor' },
      { code: 'KIPPTOR', label: 'Kipptor' },
      { code: 'FALTTOR', label: 'Falttor' },
      { code: 'SCHNELLLAUFTOR', label: 'Schnelllauftor' },
    ],
  },
  {
    code: 'KRAN',
    label: 'Krane',
    kuerzel: 'KRA',
    abgrenzung:
      'Hebezeuge mit Lastaufnahme über Tragmittel; die Kranart entscheidet über die Abnahmeprüfpflicht.',
    bauarten: [
      { code: 'BRUECKENKRAN', label: 'Brückenkran' },
      { code: 'SAEULENDREHKRAN', label: 'Säulendrehkran' },
      { code: 'LADEKRAN', label: 'Ladekran' },
      { code: 'MOBILKRAN', label: 'Mobilkran' },
      { code: 'PORTALKRAN', label: 'Portalkran' },
      { code: 'WANDSCHWENKKRAN', label: 'Wandschwenkkran' },
      { code: 'TURMDREHKRAN', label: 'Turmdrehkran' },
    ],
  },
  {
    code: 'SCHRANKE',
    label: 'Schranken',
    kuerzel: 'SCH',
    abgrenzung: 'Kraftbetriebene Absperreinrichtungen im Verkehrsbereich.',
    bauarten: [
      { code: 'HUBSCHRANKE', label: 'Hubschranke' },
      { code: 'DREHSCHRANKE', label: 'Drehschranke' },
      { code: 'POLLER', label: 'Versenkbarer Poller' },
    ],
  },
  {
    code: 'FAHRZEUGHEBEBUEHNE',
    label: 'Fahrzeughebebühnen',
    kuerzel: 'FHB',
    abgrenzung:
      'Hebebühnen zum Anheben von Fahrzeugen; ausdrücklich abnahme- und prüfpflichtig.',
    bauarten: [
      { code: 'ZWEI_SAEULEN', label: 'Zwei-Säulen-Hebebühne' },
      { code: 'VIER_SAEULEN', label: 'Vier-Säulen-Hebebühne' },
      { code: 'SCHERENHEBEBUEHNE', label: 'Scherenhebebühne' },
      { code: 'STEMPELHEBEBUEHNE', label: 'Stempelhebebühne' },
      { code: 'LKW_HEBEBUEHNE', label: 'LKW-Hebebühne' },
      { code: 'MOTORRADHEBEBUEHNE', label: 'Motorradhebebühne' },
    ],
  },
  {
    code: 'ARBEITSBUEHNE',
    label: 'Arbeitsbühnen',
    kuerzel: 'ABU',
    abgrenzung:
      'Hubarbeitsbühnen zum Heben von Personen; Prüfpflicht abhängig von Ausführung und Aufstellung.',
    bauarten: [
      { code: 'SCHERENBUEHNE', label: 'Scherenarbeitsbühne' },
      { code: 'TELESKOPBUEHNE', label: 'Teleskoparbeitsbühne' },
      { code: 'GELENKTELESKOP', label: 'Gelenkteleskoparbeitsbühne' },
      { code: 'RAUPENBUEHNE', label: 'Raupenarbeitsbühne' },
      { code: 'MASTBUEHNE', label: 'Mastarbeitsbühne' },
      { code: 'ANHAENGERBUEHNE', label: 'Anhängerarbeitsbühne' },
    ],
  },
  {
    code: 'FOERDERANLAGE',
    label: 'Förderanlagen',
    kuerzel: 'FOE',
    abgrenzung:
      'Stetige und unstetige Fördertechnik; die Ausführung entscheidet über das Prüfregime.',
    bauarten: [
      { code: 'STETIGFOERDERER', label: 'Stetigförderer' },
      { code: 'STUECKGUTFOERDERER', label: 'Stückgutförderer' },
      { code: 'SCHUETTGUTFOERDERER', label: 'Schüttgutförderer' },
      { code: 'HAENGEFOERDERER', label: 'Hängeförderer' },
    ],
  },
  {
    code: 'ABSAUGANLAGE',
    label: 'Absauganlagen',
    kuerzel: 'ABS',
    abgrenzung:
      'Lufttechnische Anlagen. Kein generisches §-7-/§-8-Profil — eigenes Rechtsprofil erforderlich.',
    bauarten: [
      { code: 'SPAENEABSAUGUNG', label: 'Späneabsaugung' },
      { code: 'SCHWEISSRAUCHABSAUGUNG', label: 'Schweißrauchabsaugung' },
      { code: 'LACKIERKABINE', label: 'Lackierkabine / Spritzstand' },
      { code: 'ZENTRALABSAUGUNG', label: 'Zentralabsauganlage' },
    ],
  },
  {
    code: 'BRANDSCHUTZABSCHLUSS',
    label: 'Brandschutztüren und Brandschutztore',
    kuerzel: 'BSA',
    abgrenzung:
      'Brandschutzabschlüsse. Der Brandschutz allein begründet keine AM-VO-Prüfpflicht (PRD 5).',
    bauarten: [
      { code: 'BS_DREHTUER', label: 'Brandschutz-Drehtür' },
      { code: 'BS_SCHIEBETUER', label: 'Brandschutz-Schiebetür' },
      { code: 'BS_ROLLTOR', label: 'Brandschutz-Rolltor' },
      { code: 'BS_SEKTIONALTOR', label: 'Brandschutz-Sektionaltor' },
      { code: 'RAUCHSCHUTZTUER', label: 'Rauchschutztür' },
    ],
  },
  {
    code: 'LASTAUFNAHMEMITTEL',
    label: 'Lastaufnahmemittel',
    kuerzel: 'LAM',
    abgrenzung:
      'Nicht zum Hebezeug gehörende Einrichtungen zur Aufnahme der Last.',
    bauarten: [
      { code: 'TRAVERSE', label: 'Traverse' },
      { code: 'C_HAKEN', label: 'C-Haken' },
      { code: 'GREIFER', label: 'Greifer' },
      { code: 'VAKUUMHEBER', label: 'Vakuumheber' },
      { code: 'MAGNETHEBER', label: 'Lasthebemagnet' },
    ],
  },
  {
    code: 'ANSCHLAGMITTEL_LAST',
    label: 'Anschlagmittel für Lasten',
    kuerzel: 'ANS',
    abgrenzung:
      'Verbindung zwischen Lastaufnahmemittel und Last — nicht mit Absturzsicherung gleichzusetzen.',
    bauarten: [
      { code: 'RUNDSCHLINGE', label: 'Rundschlinge' },
      { code: 'HEBEBAND', label: 'Hebeband' },
      { code: 'KETTENGEHAENGE', label: 'Kettengehänge' },
      { code: 'SEILGEHAENGE', label: 'Seilgehänge' },
      { code: 'SCHAEKEL', label: 'Schäkel' },
    ],
  },
  {
    code: 'ANSCHLAGPUNKT_PSA',
    label: 'Anschlagpunkte für persönliche Absturzsicherung',
    kuerzel: 'APS',
    abgrenzung:
      'Eigenständige Familie. Anschlageinrichtungen gegen Absturz sind gesondert zu beurteilen und nicht mit Last-Anschlagmitteln gleichzusetzen (PRD 4 und 5).',
    bauarten: [
      { code: 'EINZELANSCHLAGPUNKT', label: 'Einzelanschlagpunkt' },
      { code: 'SEILSICHERUNGSSYSTEM', label: 'Horizontales Seilsicherungssystem' },
      { code: 'SCHIENENSYSTEM', label: 'Schienensystem' },
      { code: 'ANSCHLAGOESE', label: 'Anschlagöse' },
      { code: 'DACHHAKEN', label: 'Dachhaken' },
    ],
  },
  {
    code: 'SONSTIGES',
    label: 'Sonstige Arbeitsmittel',
    kuerzel: 'SON',
    abgrenzung:
      'Arbeitsmittel ohne eigene Familie. Prüfpflicht und Prüfumfang sind einzeln festzulegen.',
    bauarten: [{ code: 'SONSTIGE_BAUART', label: 'sonstige Bauart' }],
  },
];

const FAMILY_INDEX: Record<string, FamilyDef> = Object.fromEntries(
  FAMILIES.map((f) => [f.code, f]),
);

export function familie(code: AssetFamily): FamilyDef {
  const def = FAMILY_INDEX[code];
  if (!def) throw new Error(`Unbekannte Anlagenfamilie: ${code}`);
  return def;
}

export function familieLabel(code: AssetFamily): string {
  return FAMILY_INDEX[code]?.label ?? code;
}

/** Klartext einer Bauart; unbekannte Codes werden unverändert zurückgegeben. */
export function bauartLabel(code: AssetFamily, bauart: string): string {
  return (
    FAMILY_INDEX[code]?.bauarten.find((b) => b.code === bauart)?.label ?? bauart
  );
}

/** Familien, bei denen EN-12453-bezogene Felder überhaupt in Betracht kommen. */
export const FAMILIEN_TORSTEUERUNG: AssetFamily[] = ['TUER', 'TOR', 'SCHRANKE'];
