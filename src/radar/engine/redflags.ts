/**
 * Red Flag Engine — PRD Abschnitt 23.
 *
 * Red Flags sind keine Score-Bestandteile, sondern eigenständige, benannte
 * Feststellungen. Der Unterschied ist wichtig: Ein Score mittelt, eine Red Flag
 * nicht. Ein Fahrzeug mit einem Integrity Score von 84 kann trotzdem einen
 * sinkenden Kilometerstand haben — im Mittelwert verschwindet das, in der Liste
 * der Red Flags nicht.
 *
 * Jede Flag trägt nach Abschnitt 23 fünf Angaben: Schweregrad, Begründung,
 * Quelle, Zeitpunkt und Empfehlung. Die Empfehlung ist Pflicht, nicht Zierde —
 * eine Warnung ohne Handlungsanweisung erzeugt nur Unbehagen.
 *
 * Alle Formulierungen bleiben innerhalb der Nicht-Ziele aus Abschnitt 4: Die
 * Engine stellt Auffälligkeiten fest, sie stellt keinen Betrug fest.
 */

import type { Aenderung, Inserat, InseratDaten } from '../domain/types';
import { datum } from '../domain/format';
import type { Marktbewertung } from './bewertung';
import type { Feldkonsolidierung } from './datenqualitaet';
import type { Historienkennzahlen } from './historie';
import { inseratHistorie, letzteBeobachtung } from './historie';
import type { Modelldefinition } from '../wissen/modelle';
import { pruefeVin } from './vin';

export type Schweregrad = 'kritisch' | 'hoch' | 'mittel' | 'niedrig';

export const SCHWEREGRAD_LABEL: Record<Schweregrad, string> = {
  kritisch: 'Kritisch',
  hoch: 'Hoch',
  mittel: 'Mittel',
  niedrig: 'Niedrig',
};

export const SCHWEREGRAD_RANG: Record<Schweregrad, number> = {
  kritisch: 4,
  hoch: 3,
  mittel: 2,
  niedrig: 1,
};

export interface RedFlag {
  id: string;
  regel: string;
  schweregrad: Schweregrad;
  titel: string;
  begruendung: string;
  /** Woher die Feststellung stammt — Plattform, Historie, Bildanalyse, Text. */
  quelle: string;
  zeitpunkt: string;
  empfehlung: string;
}

export interface RedFlagEingang {
  inserate: Inserat[];
  aktuell: InseratDaten;
  historie: Historienkennzahlen;
  bewertung: Marktbewertung;
  felder: Feldkonsolidierung[];
  modell: Modelldefinition | undefined;
  /** Bild-Hashes, die auch bei anderen Fahrzeugen auftauchen. */
  fremdverwendeteBilder: { phash: string; fremdesInserat: string }[];
  stichtag: string;
  alterJahre: number | null;
}

export function erkenneRedFlags(e: RedFlagEingang): RedFlag[] {
  const flags: RedFlag[] = [];
  const alleAenderungen: { aenderung: Aenderung; inserat: Inserat }[] = e.inserate.flatMap(
    (i) => inseratHistorie(i).map((a) => ({ aenderung: a, inserat: i })),
  );

  const anlegen = (f: Omit<RedFlag, 'id'>) => {
    flags.push({ ...f, id: `rf-${flags.length + 1}-${f.regel}` });
  };

  /* -- 1. Kilometerstand sinkt ------------------------------------------ */
  if (e.historie.kilometerRueckgang) {
    const treffer = alleAenderungen.find(
      (x) => x.aenderung.art === 'kilometer' && (x.aenderung.differenz ?? 0) < 0,
    );
    anlegen({
      regel: 'kilometer-sinkt',
      schweregrad: 'kritisch',
      titel: 'Kilometerstand sinkt im Verlauf',
      begruendung: treffer
        ? `Zwischen zwei Beobachtungen fiel der Kilometerstand von ${treffer.aenderung.vorher} auf ${treffer.aenderung.nachher} km.`
        : 'Der Kilometerstand ist zwischen zwei Beobachtungen gesunken.',
      quelle: treffer
        ? `Beobachtungshistorie, Inserat ${treffer.inserat.externeId}`
        : 'Beobachtungshistorie',
      zeitpunkt: treffer?.aenderung.zeitpunkt ?? e.stichtag,
      empfehlung:
        'Tachostand gegen Serviceeinträge, Pickerl-/TÜV-Berichte und Steuergerätedaten abgleichen. Ohne lückenlose Aufklärung kein Kauf.',
    });
  }

  /* -- 2. Preis außergewöhnlich niedrig --------------------------------- */
  if (e.bewertung.fairValue > 0 && e.bewertung.abweichungProzent < -25) {
    anlegen({
      regel: 'preis-auffaellig-niedrig',
      schweregrad: e.bewertung.abweichungProzent < -35 ? 'hoch' : 'mittel',
      titel: 'Preis liegt auffällig unter dem Marktwert',
      begruendung: `Angebotspreis ${e.aktuell.preis.toLocaleString('de-AT')} € gegenüber einem Fair Market Value von ${e.bewertung.fairValue.toLocaleString('de-AT')} € (${e.bewertung.abweichungProzent.toFixed(1)} %). Im Segment gibt es für einen Abstand dieser Größe fast immer einen Grund, der im Inserat nicht steht.`,
      quelle: 'Market Valuation Engine',
      zeitpunkt: e.stichtag,
      empfehlung:
        'Vor der Besichtigung klären: Schadenshistorie, Motorzustand, Papiere, Eigentumsverhältnisse. Nicht als Preisvorteil behandeln, solange der Grund unbekannt ist.',
    });
  }

  /* -- 3. Unfallfrei-Angabe verschwindet -------------------------------- */
  const unfallEntfernt = alleAenderungen.find(
    (x) =>
      x.aenderung.feld === 'unfallangabe' &&
      (x.aenderung.art === 'angabe-entfernt' ||
        (x.aenderung.vorher === 'unfallfrei' && x.aenderung.nachher !== 'unfallfrei')),
  );
  if (unfallEntfernt) {
    anlegen({
      regel: 'unfallangabe-verschwindet',
      schweregrad: 'hoch',
      titel: 'Angabe zur Unfallfreiheit wurde abgeschwächt oder entfernt',
      begruendung: `Am ${datum(unfallEntfernt.aenderung.zeitpunkt)} änderte sich die Unfallangabe von „${unfallEntfernt.aenderung.vorher ?? 'nicht gesetzt'}" auf „${unfallEntfernt.aenderung.nachher ?? 'keine Angabe'}". Eine Zusicherung wird selten grundlos zurückgenommen.`,
      quelle: `Beobachtungshistorie, Inserat ${unfallEntfernt.inserat.externeId}`,
      zeitpunkt: unfallEntfernt.aenderung.zeitpunkt,
      empfehlung:
        'Grund der Änderung schriftlich erfragen. Lackschichtmessung und Spaltmaßkontrolle sind vor jedem weiteren Schritt durchzuführen.',
    });
  }

  /* -- 4. Verkäufer wechselt mehrfach ----------------------------------- */
  if (e.historie.verkaeuferwechsel >= 2) {
    const letzter = alleAenderungen
      .filter((x) => x.aenderung.art === 'verkaeufer')
      .at(-1);
    anlegen({
      regel: 'verkaeuferwechsel',
      schweregrad: 'mittel',
      titel: `${e.historie.verkaeuferwechsel} Verkäuferwechsel im Beobachtungszeitraum`,
      begruendung:
        'Das Fahrzeug wurde von mehreren Verkäufern angeboten. Das kann Handelsware sein — oder ein Fahrzeug, das nach der Besichtigung mehrfach zurückgegeben wurde.',
      quelle: 'Beobachtungshistorie über alle Inserate',
      zeitpunkt: letzter?.aenderung.zeitpunkt ?? e.stichtag,
      empfehlung:
        'Vorgeschichte beim aktuellen Verkäufer erfragen: Woher stammt das Fahrzeug, wie lange steht es, gab es geplatzte Verkäufe?',
    });
  }

  /* -- 5. Standort wechselt ungewöhnlich häufig ------------------------- */
  if (e.historie.standortwechsel >= 2) {
    anlegen({
      regel: 'standortwechsel',
      schweregrad: 'niedrig',
      titel: `${e.historie.standortwechsel} Standortwechsel`,
      begruendung:
        'Der Standort des Fahrzeuges wechselte mehrfach. Bei Handelsware üblich, bei einem Privatfahrzeug erklärungsbedürftig.',
      quelle: 'Beobachtungshistorie',
      zeitpunkt: e.stichtag,
      empfehlung: 'Aktuellen Standplatz und Verfügbarkeit zur Besichtigung vorab bestätigen lassen.',
    });
  }

  /* -- 6. Fotos aus früheren oder fremden Inseraten --------------------- */
  if (e.fremdverwendeteBilder.length > 0) {
    anlegen({
      regel: 'fotos-wiederverwendet',
      schweregrad: 'hoch',
      titel: `${e.fremdverwendeteBilder.length} Bilder erscheinen auch bei anderen Fahrzeugen`,
      begruendung: `Die Wahrnehmungs-Hashes von ${e.fremdverwendeteBilder.length} Bildern stimmen mit Bildern aus Inserat ${[...new Set(e.fremdverwendeteBilder.map((b) => b.fremdesInserat))].join(', ')} überein, das einer anderen Fahrzeugakte zugeordnet ist.`,
      quelle: 'Bild-Hash-Abgleich',
      zeitpunkt: e.stichtag,
      empfehlung:
        'Aktuelle, individuelle Bilder mit Tagesdatum anfordern (z. B. mit Zettel und Datum im Bild). Ohne eigene Bilder keine Anzahlung.',
    });
  }

  /* -- 7. VIN-Angaben widersprechen sich -------------------------------- */
  const vinFeld = e.felder.find((f) => f.feld === 'vin');
  if (vinFeld?.widerspruch) {
    anlegen({
      regel: 'vin-widerspruch',
      schweregrad: 'kritisch',
      titel: 'Widersprüchliche Fahrgestellnummern',
      begruendung: `Die Quellen nennen unterschiedliche Fahrgestellnummern: ${vinFeld.alle.map((a) => `${a.wert} (${a.quelle})`).join(' / ')}.`,
      quelle: 'Datenkonsolidierung über alle Inserate',
      zeitpunkt: e.stichtag,
      empfehlung:
        'VIN am Fahrzeug, am Typenschild und in beiden Teilen der Zulassungsbescheinigung abgleichen. Bei fortbestehendem Widerspruch abbrechen.',
    });
  }

  const vinPruefung = pruefeVin(
    e.aktuell.vin,
    e.aktuell.hersteller,
    e.aktuell.erstzulassung,
  );
  if (vinPruefung) {
    for (const befund of vinPruefung.befunde.filter((b) => b.art === 'fehler')) {
      anlegen({
        regel: 'vin-formal',
        schweregrad: 'hoch',
        titel: 'Fahrgestellnummer nicht schlüssig',
        begruendung: befund.text,
        quelle: 'Formale VIN-Prüfung',
        zeitpunkt: e.stichtag,
        empfehlung:
          'VIN vom Verkäufer erneut bestätigen lassen und mit den Papieren abgleichen. Übertragungsfehler sind häufig, Abweichungen im Fahrzeugtyp nicht.',
      });
    }
  }

  /* -- 8. Ausstattung passt nicht zum Baujahr --------------------------- */
  if (e.modell && e.aktuell.erstzulassung) {
    const jahr = Number.parseInt(e.aktuell.erstzulassung.slice(0, 4), 10);
    if (Number.isFinite(jahr)) {
      if (jahr < e.modell.bauzeitVon - 1 || jahr > e.modell.bauzeitBis + 1) {
        anlegen({
          regel: 'baujahr-ausserhalb-bauzeit',
          schweregrad: 'mittel',
          titel: 'Erstzulassung liegt außerhalb der Bauzeit des Modells',
          begruendung: `Erstzulassung ${e.aktuell.erstzulassung}, Bauzeit des zugeordneten Modells ${e.modell.bauzeitVon}–${e.modell.bauzeitBis}.`,
          quelle: 'Modellkatalog',
          zeitpunkt: e.stichtag,
          empfehlung:
            'Modellzuordnung prüfen. Möglicherweise handelt es sich um eine andere Baureihe oder um ein Fahrzeug mit später Erstzulassung aus Lagerbestand.',
        });
      }
      // Competition-Paket kam erst 2010; ein früheres Fahrzeug kann es nicht
      // ab Werk haben. Solche Zuordnungen sind der klassische Fall aus §23.
      if (
        e.aktuell.ausstattung.includes('competition-paket') &&
        e.modell.id.startsWith('bmw-m3') &&
        jahr < 2010
      ) {
        anlegen({
          regel: 'ausstattung-vor-einfuehrung',
          schweregrad: 'mittel',
          titel: 'Ausstattung passt nicht zum Baujahr',
          begruendung: `Das Competition-Paket wurde beim M3 E9x erst ab 2010 angeboten; die Erstzulassung ist ${e.aktuell.erstzulassung}.`,
          quelle: 'Modellkatalog und Inseratsangaben',
          zeitpunkt: e.stichtag,
          empfehlung:
            'Ausstattung anhand der Fahrzeugdaten des Herstellers prüfen. Nachgerüstete Teile sind kein Competition-Paket und nicht wertbildend.',
        });
      }
    }
  }

  /* -- 9. Fahrzeugfarbe ändert sich ------------------------------------- */
  const farbwechsel = alleAenderungen.find(
    (x) => x.aenderung.feld === 'farbeAussen' && x.aenderung.vorher && x.aenderung.nachher,
  );
  const farbFeld = e.felder.find((f) => f.feld === 'farbeAussen');
  if (farbwechsel || farbFeld?.widerspruch) {
    anlegen({
      regel: 'farbwechsel',
      schweregrad: 'mittel',
      titel: 'Angabe zur Fahrzeugfarbe ändert sich',
      begruendung: farbwechsel
        ? `Die Farbangabe wechselte von „${farbwechsel.aenderung.vorher}" auf „${farbwechsel.aenderung.nachher}".`
        : `Die Quellen nennen unterschiedliche Farben: ${farbFeld?.alle.map((a) => `${a.wert} (${a.quelle})`).join(' / ')}.`,
      quelle: farbwechsel ? 'Beobachtungshistorie' : 'Datenkonsolidierung',
      zeitpunkt: farbwechsel?.aenderung.zeitpunkt ?? e.stichtag,
      empfehlung:
        'Farbcode am Typenschild ablesen und mit den Papieren abgleichen. Eine Umlackierung ist wertrelevant und offenzulegen.',
    });
  }

  /* -- 10. Baujahr und Erstzulassung unplausibel ------------------------ */
  if (e.aktuell.produktionsjahr !== null && e.aktuell.erstzulassung) {
    const ez = Number.parseInt(e.aktuell.erstzulassung.slice(0, 4), 10);
    if (Number.isFinite(ez) && (ez < e.aktuell.produktionsjahr || ez > e.aktuell.produktionsjahr + 2)) {
      anlegen({
        regel: 'baujahr-erstzulassung',
        schweregrad: 'mittel',
        titel: 'Baujahr und Erstzulassung passen nicht zusammen',
        begruendung: `Produktionsjahr ${e.aktuell.produktionsjahr}, Erstzulassung ${e.aktuell.erstzulassung}.`,
        quelle: 'Inseratsangaben',
        zeitpunkt: e.stichtag,
        empfehlung:
          'Produktionsdatum über die Fahrzeugdaten des Herstellers prüfen. Ein großer Abstand kann auf ein Lagerfahrzeug oder auf einen Datenfehler hindeuten.',
      });
    }
  }

  /* -- 11. Motorisierung widerspricht der VIN --------------------------- */
  if (
    vinPruefung?.hersteller &&
    e.aktuell.hersteller &&
    vinPruefung.hersteller.toLowerCase() !== e.aktuell.hersteller.toLowerCase()
  ) {
    anlegen({
      regel: 'vin-hersteller',
      schweregrad: 'kritisch',
      titel: 'Fahrgestellnummer passt nicht zum angegebenen Fahrzeug',
      begruendung: `Die Herstellerkennung der VIN steht für ${vinPruefung.hersteller}, das Inserat nennt ${e.aktuell.hersteller} ${e.aktuell.modell}.`,
      quelle: 'Formale VIN-Prüfung',
      zeitpunkt: e.stichtag,
      empfehlung:
        'Fahrzeugidentität vor Ort anhand von VIN, Typenschild und Papieren feststellen. Bei fortbestehendem Widerspruch abbrechen.',
    });
  }

  /* -- 12. Servicehistorie weist große Lücken auf ----------------------- */
  if (
    e.aktuell.servicehistorie === 'keine' ||
    (e.aktuell.servicehistorie === 'teilweise' &&
      e.aktuell.kilometerstand !== null &&
      e.aktuell.kilometerstand > 100000)
  ) {
    anlegen({
      regel: 'servicelücke',
      schweregrad: e.aktuell.servicehistorie === 'keine' ? 'hoch' : 'mittel',
      titel:
        e.aktuell.servicehistorie === 'keine'
          ? 'Keine Servicehistorie'
          : 'Servicehistorie nur teilweise dokumentiert',
      begruendung:
        e.aktuell.servicehistorie === 'keine'
          ? 'Für ein Fahrzeug dieses Segments ist eine fehlende Wartungsdokumentation der stärkste einzelne Wertfaktor nach dem Unfallschaden.'
          : `Bei ${e.aktuell.kilometerstand?.toLocaleString('de-AT')} km ist eine nur teilweise dokumentierte Wartung erklärungsbedürftig.`,
      quelle: 'Inseratsangaben',
      zeitpunkt: e.stichtag,
      empfehlung:
        'Digitale Servicehistorie beim Markenbetrieb abfragen und Rechnungssammlung anfordern. Fehlende Nachweise im Preis berücksichtigen.',
    });
  }

  /* -- Ergänzend: lange Standzeit bei mehrfacher Preisreduktion ---------- */
  if (
    e.historie.beobachtungsdauerTage > 150 &&
    (e.historie.groessteReduktionProzent ?? 0) >= 8 &&
    e.historie.anzahlPreisaenderungen >= 2
  ) {
    anlegen({
      regel: 'standzeit-preisdruck',
      schweregrad: 'niedrig',
      titel: 'Lange Standzeit trotz mehrfacher Preisreduktion',
      begruendung: `Das Fahrzeug wird seit ${e.historie.beobachtungsdauerTage} Tagen beobachtet, der Preis wurde ${e.historie.anzahlPreisaenderungen}-mal gesenkt (größte Einzelreduktion ${e.historie.groessteReduktionProzent?.toFixed(1)} %). Der Markt hat das Fahrzeug bislang nicht angenommen.`,
      quelle: 'Beobachtungshistorie',
      zeitpunkt: e.stichtag,
      empfehlung:
        'Als Verhandlungsposition nutzen — und zugleich prüfen, ob dem Markt etwas aufgefallen ist, das im Inserat nicht steht.',
    });
  }

  /* -- Ergänzend: Angebot ohne Fahrgestellnummer ------------------------ */
  if (!e.aktuell.vin && e.aktuell.preis >= 25000) {
    anlegen({
      regel: 'vin-fehlt',
      schweregrad: 'niedrig',
      titel: 'Keine Fahrgestellnummer im Inserat',
      begruendung:
        'Ohne VIN lassen sich Ausstattung, Produktionsdatum und frühere Inserate desselben Fahrzeuges nicht unabhängig prüfen.',
      quelle: 'Inseratsangaben',
      zeitpunkt: e.stichtag,
      empfehlung: 'VIN vor der Besichtigung anfordern — die Anfrage ist im Prüfkatalog enthalten.',
    });
  }

  return flags.sort(
    (a, b) => SCHWEREGRAD_RANG[b.schweregrad] - SCHWEREGRAD_RANG[a.schweregrad],
  );
}

/**
 * Bild-Hashes eines Inserates, die auch in Inseraten anderer Fahrzeuge
 * vorkommen — Grundlage der Red Flag „Fotos stammen aus früheren Inseraten".
 */
export function findeFremdverwendeteBilder(
  inserat: Inserat,
  alleInserate: Inserat[],
  eigenesFahrzeug: string | null,
  schwelle: number,
): { phash: string; fremdesInserat: string }[] {
  const eigene = letzteBeobachtung(inserat).daten.bilder;
  const treffer: { phash: string; fremdesInserat: string }[] = [];

  for (const anderes of alleInserate) {
    if (anderes.id === inserat.id) continue;
    if (eigenesFahrzeug !== null && anderes.fahrzeugId === eigenesFahrzeug) continue;
    const fremde = letzteBeobachtung(anderes).daten.bilder;
    for (const bild of eigene) {
      const passt = fremde.some((f) => hamming(bild.phash, f.phash) <= schwelle);
      if (passt && !treffer.some((t) => t.phash === bild.phash)) {
        treffer.push({ phash: bild.phash, fremdesInserat: anderes.externeId });
      }
    }
  }
  return treffer;
}

const BITS = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4];

function hamming(a: string, b: string): number {
  if (a.length !== b.length || a.length === 0) return 64;
  let d = 0;
  for (let i = 0; i < a.length; i++) {
    const x = Number.parseInt(a[i], 16);
    const y = Number.parseInt(b[i], 16);
    if (Number.isNaN(x) || Number.isNaN(y)) return 64;
    d += BITS[x ^ y];
  }
  return d;
}
