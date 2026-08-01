/**
 * Katalog der bekannten Regelwerke.
 *
 * Der Rückabgleich braucht eine Positivliste zulässiger Normzitate: Ein
 * Verweis auf ein reales, gepflegtes Regelwerk ist zulässig, auch wenn es
 * nicht in jeder einzelnen Anforderung vorkommt. Erfundene Bezeichnungen wie
 * „TRVB S 999" fallen dagegen auf.
 *
 * Der Katalog ist Datenhaltung, keine Logik — er wächst mit dem Korpus.
 */

export interface NormEintrag {
  kuerzel: string;
  titel: string;
  bereich: string;
}

export const NORMENKATALOG: NormEintrag[] = [
  { kuerzel: 'OIB-RL 2', titel: 'Brandschutz', bereich: 'Baulicher Brandschutz' },
  {
    kuerzel: 'OIB-RL 2.1',
    titel: 'Brandschutz bei Betriebsbauten',
    bereich: 'Betriebsbauten',
  },
  {
    kuerzel: 'OIB-RL 2.2',
    titel: 'Brandschutz bei Garagen, überdachten Stellplätzen und Parkdecks',
    bereich: 'Garagen',
  },
  {
    kuerzel: 'OIB-RL 2.3',
    titel: 'Brandschutz bei Gebäuden mit einem Fluchtniveau von über 22 m',
    bereich: 'Hochhäuser',
  },
  {
    kuerzel: 'OIB-RL 4',
    titel: 'Nutzungssicherheit und Barrierefreiheit',
    bereich: 'Nutzungssicherheit',
  },
  { kuerzel: 'TRVB S 123', titel: 'Brandmeldeanlagen', bereich: 'Anlagentechnik' },
  {
    kuerzel: 'TRVB S 125',
    titel: 'Rauch- und Wärmeabzugsanlagen',
    bereich: 'Anlagentechnik',
  },
  {
    kuerzel: 'TRVB S 127',
    titel: 'Ortsfeste Sprinkleranlagen',
    bereich: 'Anlagentechnik',
  },
  { kuerzel: 'TRVB S 151', titel: 'Gaslöschanlagen', bereich: 'Anlagentechnik' },
  { kuerzel: 'TRVB S 158', titel: 'Alarmierungsanlagen', bereich: 'Anlagentechnik' },
  {
    kuerzel: 'TRVB F 124',
    titel: 'Erste und erweiterte Löschhilfe',
    bereich: 'Löschhilfen',
  },
  { kuerzel: 'TRVB F 128', titel: 'Löschwasserbedarf', bereich: 'Löschwasser' },
  {
    kuerzel: 'TRVB O 117',
    titel: 'Ausbildung von Brandschutzbeauftragten',
    bereich: 'Organisation',
  },
  {
    kuerzel: 'TRVB O 119',
    titel: 'Betrieblicher Brandschutz — Organisation',
    bereich: 'Organisation',
  },
  { kuerzel: 'TRVB O 121', titel: 'Brandschutzpläne', bereich: 'Organisation' },
  {
    kuerzel: 'ÖNORM EN 13501',
    titel: 'Klassifizierung von Bauprodukten zum Brandverhalten',
    bereich: 'Bauteilklassifizierung',
  },
  {
    kuerzel: 'ÖNORM EN 1125',
    titel: 'Paniktürverschlüsse mit horizontaler Betätigungsstange',
    bereich: 'Fluchtwege',
  },
  {
    kuerzel: 'ÖNORM EN 15650',
    titel: 'Brandschutzklappen',
    bereich: 'Anlagentechnik',
  },
  {
    kuerzel: 'ÖNORM EN 81-72',
    titel: 'Feuerwehraufzüge',
    bereich: 'Anlagentechnik',
  },
  {
    kuerzel: 'ÖNORM EN ISO 7010',
    titel: 'Graphische Symbole — Sicherheitszeichen',
    bereich: 'Kennzeichnung',
  },
  {
    kuerzel: 'ÖNORM F 1053',
    titel: 'Überprüfung tragbarer Feuerlöscher',
    bereich: 'Löschhilfen',
  },
  {
    kuerzel: 'ÖNORM F 2000',
    titel: 'Zufahrten und Aufstellflächen für die Feuerwehr',
    bereich: 'Feuerwehr',
  },
  {
    kuerzel: 'ÖVE/ÖNORM E 8002',
    titel: 'Starkstromanlagen für bauliche Anlagen mit Menschenansammlungen',
    bereich: 'Sicherheitsbeleuchtung',
  },
  { kuerzel: 'AStV', titel: 'Arbeitsstättenverordnung', bereich: 'Arbeitnehmerschutz' },
  { kuerzel: 'ASchG', titel: 'ArbeitnehmerInnenschutzgesetz', bereich: 'Arbeitnehmerschutz' },
  { kuerzel: 'KennV', titel: 'Kennzeichnungsverordnung', bereich: 'Kennzeichnung' },
];

/** Alle bekannten Kürzel — Positivliste für den Rückabgleich. */
export const BEKANNTE_NORMEN: string[] = NORMENKATALOG.map((n) => n.kuerzel);
