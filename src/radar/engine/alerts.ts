/**
 * Alert Engine — PRD Abschnitt 27.
 *
 * Der erste Satz des Abschnitts ist die eigentliche Anforderung:
 * „Benachrichtigungen dürfen nicht inflationär erzeugt werden."
 *
 * Ein Alert-System, das zu oft meldet, wird ignoriert und ist damit wertlos —
 * schlimmer als keines, weil es Sicherheit vortäuscht. Drei Mechanismen halten
 * die Menge klein:
 *
 *   1. Rangschwelle — gemeldet wird nur, was den im Suchauftrag hinterlegten
 *      Mindestrang erreicht.
 *   2. Entprellung — derselbe Sachverhalt am selben Fahrzeug meldet innerhalb
 *      der Sperrfrist kein zweites Mal.
 *   3. Erheblichkeit — Preisreduktionen unterhalb der Schwelle, Änderungen
 *      ohne Belang und Wiederholungen bereits gemeldeter Red Flags entfallen.
 */

import type {
  Alert,
  Kandidatenrang,
  Suchauftrag,
} from '../domain/types';
import { STICHTAG, alterMonate, tageSeit } from '../domain/format';
import type { Fahrzeuganalyse } from './analyse';
import type { Systemparameter } from './gewichte';

const RANGWERT: Record<Kandidatenrang, number> = { A: 4, B: 3, C: 2, D: 1 };

/** Prüft, ob ein Fahrzeug die Kriterien eines Suchauftrags erfüllt. */
export function passtZuAuftrag(a: Fahrzeuganalyse, auftrag: Suchauftrag): boolean {
  if (auftrag.modellIds.length > 0) {
    if (!a.modell || !auftrag.modellIds.includes(a.modell.id)) return false;
  }
  if (auftrag.preisMax !== null && a.aktuell.preis > auftrag.preisMax) return false;
  if (auftrag.preisMin !== null && a.aktuell.preis < auftrag.preisMin) return false;
  if (
    auftrag.kilometerMax !== null &&
    a.aktuell.kilometerstand !== null &&
    a.aktuell.kilometerstand > auftrag.kilometerMax
  ) {
    return false;
  }
  if (auftrag.baujahrMin !== null && a.baujahr !== null && a.baujahr < auftrag.baujahrMin) {
    return false;
  }
  if (auftrag.mindestalterMonate !== null) {
    const monate = alterMonate(a.aktuell.erstzulassung);
    if (monate === null || monate < auftrag.mindestalterMonate) return false;
  }
  if (auftrag.getriebe.length > 0 && !auftrag.getriebe.includes(a.aktuell.getriebe)) {
    return false;
  }
  if (auftrag.laender.length > 0 && !auftrag.laender.includes(a.aktuell.standortLand)) {
    return false;
  }
  if (auftrag.originalzustandBevorzugt) {
    // Kein hartes Ausschlusskriterium, sondern eines für erkannte
    // Leistungssteigerungen — Originalzustand „bevorzugt", nicht „zwingend".
    if (a.text.befunde.some((b) => b.musterId === 'tuning')) return false;
  }
  return true;
}

interface Kandidatenmeldung {
  ausloeser: Alert['ausloeser'];
  titel: string;
  text: string;
  dringlichkeit: Alert['dringlichkeit'];
  entprellschluessel: string;
}

function meldungenFuer(
  a: Fahrzeuganalyse,
  parameter: Systemparameter,
  stichtag: string,
): Kandidatenmeldung[] {
  const meldungen: Kandidatenmeldung[] = [];

  /* -- Neuer A-Kandidat --------------------------------------------------- */
  if (a.gesamt.rang === 'A' && a.angebotsdauerTage <= 21) {
    meldungen.push({
      ausloeser: 'neuer-a-kandidat',
      titel: `Neuer A-Kandidat: ${a.bezeichnung}`,
      text: `${a.aktuell.titel} — ${a.aktuell.preis.toLocaleString('de-AT')} € bei einem Marktwert von ${a.bewertung.fairValue.toLocaleString('de-AT')} €. Gesamtbewertung ${a.gesamt.wert} von 100.`,
      dringlichkeit: 'hoch',
      entprellschluessel: `a-kandidat:${a.fahrzeugId}`,
    });
  }

  /* -- Preisreduktion ------------------------------------------------------ */
  const reduktionen = a.aenderungen.filter(
    (x) => x.art === 'preis' && (x.differenz ?? 0) < 0 && tageSeit(x.zeitpunkt, stichtag) <= 30,
  );
  for (const r of reduktionen) {
    const vorher = Number.parseFloat(r.vorher ?? '0');
    const prozent = vorher > 0 ? (-(r.differenz as number) / vorher) * 100 : 0;
    if (prozent < parameter.alerts.preisreduktionProzent) continue;
    meldungen.push({
      ausloeser: 'preisreduktion',
      titel: `Preisreduktion ${prozent.toFixed(1)} %: ${a.bezeichnung}`,
      text: `Der Preis fiel von ${r.vorher} auf ${r.nachher}. Aktuelle Abweichung zum Marktwert: ${a.bewertung.abweichungProzent.toFixed(1)} %.`,
      dringlichkeit: prozent >= 10 ? 'hoch' : 'mittel',
      entprellschluessel: `preis:${a.fahrzeugId}:${r.zeitpunkt.slice(0, 10)}`,
    });
  }

  /* -- Kritische Änderung eines beobachteten Inserates -------------------- */
  for (const flag of a.redFlags.filter(
    (f) => f.schweregrad === 'kritisch' || f.schweregrad === 'hoch',
  )) {
    if (tageSeit(flag.zeitpunkt, stichtag) > 45) continue;
    meldungen.push({
      ausloeser: 'kritische-aenderung',
      titel: `${flag.titel} — ${a.bezeichnung}`,
      text: `${flag.begruendung} Empfehlung: ${flag.empfehlung}`,
      dringlichkeit: flag.schweregrad === 'kritisch' ? 'hoch' : 'mittel',
      entprellschluessel: `redflag:${a.fahrzeugId}:${flag.regel}`,
    });
  }

  /* -- Inserat entfernt ---------------------------------------------------- */
  const entfernt = a.inserate.filter(
    (i) => !i.aktiv && i.entferntAm && tageSeit(i.entferntAm, stichtag) <= 30,
  );
  for (const i of entfernt) {
    meldungen.push({
      ausloeser: 'inserat-entfernt',
      titel: `Inserat entfernt: ${a.bezeichnung}`,
      text: `Das Inserat ${i.externeId} wurde am ${i.entferntAm?.slice(0, 10)} entfernt. Entweder ist das Fahrzeug verkauft, oder es taucht andernorts wieder auf — beides ist für die Marktbeobachtung relevant.`,
      dringlichkeit: 'niedrig',
      entprellschluessel: `entfernt:${i.id}`,
    });
  }

  /* -- Wiederinserierung ---------------------------------------------------- */
  if (a.historie.wiederinserierungen > 0 || a.historie.anzahlInserate > 1) {
    meldungen.push({
      ausloeser: 'wiederinserierung',
      titel: `Mehrfachinserierung erkannt: ${a.bezeichnung}`,
      text: `${a.historie.anzahlInserate} Inserate auf ${a.historie.plattformen} Plattform(en), ${a.historie.wiederinserierungen} Wiederinserierung(en) nach Pause. Beobachtungsdauer ${a.historie.beobachtungsdauerTage} Tage.`,
      dringlichkeit: 'niedrig',
      entprellschluessel: `wieder:${a.fahrzeugId}:${a.historie.anzahlInserate}`,
    });
  }

  /* -- Score über Mindestwert gestiegen ------------------------------------- */
  if (a.buySignal.ausgeloest) {
    meldungen.push({
      ausloeser: 'score-schwelle',
      titel: `INGTEC BUY SIGNAL: ${a.bezeichnung}`,
      text: `Alle Mindestbedingungen erfüllt. ${a.buySignal.naechsteHandlung}`,
      dringlichkeit: 'hoch',
      entprellschluessel: `buysignal:${a.fahrzeugId}`,
    });
  }

  return meldungen;
}

export interface Alertlauf {
  neue: Alert[];
  /** Unterdrückt, weil Rang, Schwelle oder Entprellung dagegenstanden. */
  unterdrueckt: number;
}

export function erzeugeAlerts(
  analysen: Fahrzeuganalyse[],
  auftraege: Suchauftrag[],
  bestehende: Alert[],
  parameter: Systemparameter,
  stichtag = STICHTAG,
): Alertlauf {
  const neue: Alert[] = [];
  let unterdrueckt = 0;
  const sperrfristMs = parameter.alerts.entprellungTage * 86_400_000;

  for (const analyse of analysen) {
    const passende = auftraege.filter((auf) => auf.aktiv && passtZuAuftrag(analyse, auf));
    // Ohne passenden Suchauftrag gilt die Systemvorgabe — sonst würde ein
    // Fahrzeug außerhalb aller Aufträge nie melden, auch bei Buy Signal.
    const mindestrang =
      passende.length > 0
        ? passende.reduce<Kandidatenrang>(
            (min, auf) => (RANGWERT[auf.meldungAbRang] < RANGWERT[min] ? auf.meldungAbRang : min),
            'A',
          )
        : parameter.alerts.meldungAbRang;

    const kanaele =
      passende.length > 0
        ? [...new Set(passende.flatMap((auf) => auf.kanaele))]
        : parameter.alerts.standardkanaele;

    for (const meldung of meldungenFuer(analyse, parameter, stichtag)) {
      // Das Buy Signal und kritische Feststellungen melden unabhängig vom Rang;
      // alles andere unterliegt der Rangschwelle.
      const rangpflichtig =
        meldung.ausloeser !== 'score-schwelle' && meldung.ausloeser !== 'kritische-aenderung';
      if (rangpflichtig && RANGWERT[analyse.gesamt.rang] < RANGWERT[mindestrang]) {
        unterdrueckt++;
        continue;
      }

      const schonGemeldet = [...bestehende, ...neue].some(
        (x) =>
          x.entprellschluessel === meldung.entprellschluessel &&
          Date.parse(stichtag) - Date.parse(x.zeitpunkt) < sperrfristMs,
      );
      if (schonGemeldet) {
        unterdrueckt++;
        continue;
      }

      neue.push({
        id: `alert-${analyse.fahrzeugId}-${meldung.entprellschluessel}`,
        zeitpunkt: stichtag,
        ausloeser: meldung.ausloeser,
        fahrzeugId: analyse.fahrzeugId,
        titel: meldung.titel,
        text: meldung.text,
        dringlichkeit: meldung.dringlichkeit,
        gelesen: false,
        kanaele,
        entprellschluessel: meldung.entprellschluessel,
      });
    }
  }

  return { neue, unterdrueckt };
}
