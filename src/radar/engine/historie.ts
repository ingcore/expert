/**
 * Historisierung — PRD Abschnitt 11.
 *
 * Änderungen werden nicht gemeldet, sondern **abgeleitet**. Gespeichert sind
 * ausschließlich vollständige Beobachtungen; eine Änderung ist der Vergleich
 * zweier aufeinanderfolgender Beobachtungen. Daraus folgt zweierlei:
 *
 *   — Nichts wird überschrieben. Ein Wert, den ein Verkäufer entfernt, ist in
 *     der vorherigen Beobachtung weiterhin vorhanden.
 *   — Das Verschwinden einer Angabe ist ein eigenes Ereignis, kein leeres Feld.
 *     Genau darauf setzt die Red Flag „Unfallfrei-Angabe verschwindet" auf
 *     (Abschnitt 23).
 */

import type {
  Aenderung,
  Beobachtung,
  Inserat,
  InseratDaten,
} from '../domain/types';

/** Feldweise Vergleichsvorschrift. */
interface Feldvergleich {
  feld: keyof InseratDaten;
  bezeichnung: string;
  art: Aenderung['art'];
  /** Textdarstellung des Wertes; `null` bedeutet „nicht angegeben". */
  darstellen: (d: InseratDaten) => string | null;
  /** Zahlenwert für die Differenzbildung, soweit sinnvoll. */
  zahl?: (d: InseratDaten) => number | null;
}

const VERGLEICHE: Feldvergleich[] = [
  {
    feld: 'preis',
    bezeichnung: 'Preis',
    art: 'preis',
    darstellen: (d) => `${d.preis} ${d.waehrung}`,
    zahl: (d) => d.preis,
  },
  {
    feld: 'kilometerstand',
    bezeichnung: 'Kilometerstand',
    art: 'kilometer',
    darstellen: (d) => (d.kilometerstand === null ? null : String(d.kilometerstand)),
    zahl: (d) => d.kilometerstand,
  },
  {
    feld: 'verkaeuferName',
    bezeichnung: 'Verkäufer',
    art: 'verkaeufer',
    darstellen: (d) => d.verkaeuferName,
  },
  {
    feld: 'verkaeuferArt',
    bezeichnung: 'Verkäuferart',
    art: 'verkaeufer',
    darstellen: (d) => d.verkaeuferArt,
  },
  {
    feld: 'standortOrt',
    bezeichnung: 'Standort',
    art: 'standort',
    darstellen: (d) => `${d.standortOrt} (${d.standortLand})`,
  },
  {
    feld: 'titel',
    bezeichnung: 'Titel',
    art: 'text',
    darstellen: (d) => d.titel,
  },
  {
    feld: 'beschreibung',
    bezeichnung: 'Beschreibung',
    art: 'text',
    darstellen: (d) => d.beschreibung,
  },
  {
    feld: 'unfallangabe',
    bezeichnung: 'Unfallangabe',
    art: 'text',
    darstellen: (d) => (d.unfallangabe === 'keine-angabe' ? null : d.unfallangabe),
  },
  {
    feld: 'servicehistorie',
    bezeichnung: 'Servicehistorie',
    art: 'text',
    darstellen: (d) => (d.servicehistorie === 'unbekannt' ? null : d.servicehistorie),
  },
  {
    feld: 'vorbesitzer',
    bezeichnung: 'Vorbesitzer',
    art: 'text',
    darstellen: (d) => (d.vorbesitzer === null ? null : String(d.vorbesitzer)),
    zahl: (d) => d.vorbesitzer,
  },
  {
    feld: 'vin',
    bezeichnung: 'Fahrgestellnummer',
    art: 'text',
    darstellen: (d) => d.vin,
  },
  {
    feld: 'farbeAussen',
    bezeichnung: 'Außenfarbe',
    art: 'text',
    darstellen: (d) => d.farbeAussen,
  },
  {
    feld: 'garantie',
    bezeichnung: 'Garantie',
    art: 'text',
    darstellen: (d) => d.garantie,
  },
  {
    feld: 'umbauten',
    bezeichnung: 'Umbauten',
    art: 'text',
    darstellen: (d) => d.umbauten,
  },
  {
    feld: 'bekannteMaengel',
    bezeichnung: 'Bekannte Mängel',
    art: 'text',
    darstellen: (d) => d.bekannteMaengel,
  },
  {
    feld: 'erstzulassung',
    bezeichnung: 'Erstzulassung',
    art: 'text',
    darstellen: (d) => d.erstzulassung,
  },
];

/** Kürzt lange Texte für die Anzeige in der Änderungsliste. */
function kurz(text: string | null, laenge = 90): string | null {
  if (text === null) return null;
  return text.length <= laenge ? text : `${text.slice(0, laenge - 1)}…`;
}

/**
 * Vergleicht zwei Beobachtungsstände.
 *
 * Wird sowohl für die Historie als auch von den Connectoren als
 * `detectChanges()` verwendet (Abschnitt 33) — bewusst dieselbe Funktion,
 * damit ein Connector keine abweichende Vorstellung davon entwickeln kann,
 * was eine Änderung ist.
 */
export function vergleiche(
  alt: InseratDaten,
  neu: InseratDaten,
  zeitpunkt: string,
): Aenderung[] {
  const liste: Aenderung[] = [];

  for (const v of VERGLEICHE) {
    const a = v.darstellen(alt);
    const n = v.darstellen(neu);
    if (a === n) continue;

    const art: Aenderung['art'] =
      a !== null && n === null
        ? 'angabe-entfernt'
        : a === null && n !== null
          ? 'angabe-ergaenzt'
          : v.art;

    const zahlA = v.zahl?.(alt) ?? null;
    const zahlN = v.zahl?.(neu) ?? null;

    liste.push({
      zeitpunkt,
      art,
      feld: String(v.feld),
      bezeichnung: v.bezeichnung,
      vorher: kurz(a),
      nachher: kurz(n),
      differenz: zahlA !== null && zahlN !== null ? zahlN - zahlA : null,
    });
  }

  // Ausstattung: Zu- und Abgänge einzeln, nicht als Textdiff.
  const altA = new Set(alt.ausstattung);
  const neuA = new Set(neu.ausstattung);
  const entfernt = [...altA].filter((x) => !neuA.has(x));
  const ergaenzt = [...neuA].filter((x) => !altA.has(x));
  if (entfernt.length > 0) {
    liste.push({
      zeitpunkt,
      art: 'ausstattung',
      feld: 'ausstattung',
      bezeichnung: 'Ausstattung entfernt',
      vorher: entfernt.join(', '),
      nachher: null,
      differenz: -entfernt.length,
    });
  }
  if (ergaenzt.length > 0) {
    liste.push({
      zeitpunkt,
      art: 'ausstattung',
      feld: 'ausstattung',
      bezeichnung: 'Ausstattung ergänzt',
      vorher: null,
      nachher: ergaenzt.join(', '),
      differenz: ergaenzt.length,
    });
  }

  // Bilder werden über ihre Hashes verglichen, nicht über die URL: Plattformen
  // vergeben bei jedem Upload neue URLs für dasselbe Bild.
  const altH = new Set(alt.bilder.map((b) => b.phash));
  const neuH = new Set(neu.bilder.map((b) => b.phash));
  const weg = [...altH].filter((h) => !neuH.has(h)).length;
  const dazu = [...neuH].filter((h) => !altH.has(h)).length;
  if (weg > 0 || dazu > 0) {
    liste.push({
      zeitpunkt,
      art: 'fotos',
      feld: 'bilder',
      bezeichnung: 'Bilder',
      vorher: `${alt.bilder.length} Bilder`,
      nachher: `${neu.bilder.length} Bilder (${dazu} neu, ${weg} entfernt)`,
      differenz: neu.bilder.length - alt.bilder.length,
    });
  }

  // Genannte Unterlagen wirken direkt auf den Evidence Score.
  const altU = new Set(alt.genannteUnterlagen);
  const neuU = new Set(neu.genannteUnterlagen);
  const uWeg = [...altU].filter((u) => !neuU.has(u));
  if (uWeg.length > 0) {
    liste.push({
      zeitpunkt,
      art: 'angabe-entfernt',
      feld: 'genannteUnterlagen',
      bezeichnung: 'Genannte Unterlagen entfernt',
      vorher: uWeg.join(', '),
      nachher: null,
      differenz: -uWeg.length,
    });
  }

  return liste;
}

/** Alle Änderungen eines Inserates über seine gesamte Beobachtungsreihe. */
export function inseratHistorie(inserat: Inserat): Aenderung[] {
  const liste: Aenderung[] = [];
  for (let i = 1; i < inserat.beobachtungen.length; i++) {
    const alt = inserat.beobachtungen[i - 1];
    const neu = inserat.beobachtungen[i];
    liste.push(...vergleiche(alt.daten, neu.daten, neu.zeitpunkt));
  }
  return liste;
}

export function ersteBeobachtung(inserat: Inserat): Beobachtung {
  return inserat.beobachtungen[0];
}

export function letzteBeobachtung(inserat: Inserat): Beobachtung {
  return inserat.beobachtungen[inserat.beobachtungen.length - 1];
}

/* ==========================================================================
 * Verläufe
 * ======================================================================= */

export interface Verlaufspunkt {
  zeitpunkt: string;
  wert: number;
  inseratId: string;
  plattformId: string;
}

/** Preisverlauf über alle Inserate eines Fahrzeuges, chronologisch. */
export function preisverlauf(inserate: Inserat[]): Verlaufspunkt[] {
  return inserate
    .flatMap((i) =>
      i.beobachtungen.map((b) => ({
        zeitpunkt: b.zeitpunkt,
        wert: b.daten.preis,
        inseratId: i.id,
        plattformId: i.plattformId,
      })),
    )
    .sort((a, b) => Date.parse(a.zeitpunkt) - Date.parse(b.zeitpunkt));
}

/** Kilometerverlauf über alle Inserate eines Fahrzeuges, chronologisch. */
export function kilometerverlauf(inserate: Inserat[]): Verlaufspunkt[] {
  return inserate
    .flatMap((i) =>
      i.beobachtungen
        .filter((b) => b.daten.kilometerstand !== null)
        .map((b) => ({
          zeitpunkt: b.zeitpunkt,
          wert: b.daten.kilometerstand as number,
          inseratId: i.id,
          plattformId: i.plattformId,
        })),
    )
    .sort((a, b) => Date.parse(a.zeitpunkt) - Date.parse(b.zeitpunkt));
}

export interface Historienkennzahlen {
  /** Tage seit der ersten Beobachtung irgendeines Inserates. */
  beobachtungsdauerTage: number;
  anzahlInserate: number;
  anzahlBeobachtungen: number;
  anzahlPreisaenderungen: number;
  erstpreis: number | null;
  aktuellerPreis: number | null;
  /** Gesamte Preisveränderung in Prozent, negativ bei Reduktion. */
  preisveraenderungProzent: number | null;
  /** Größte einzelne Reduktion in Prozent. */
  groessteReduktionProzent: number | null;
  /** Kilometerstand sinkt irgendwo im Verlauf. */
  kilometerRueckgang: boolean;
  verkaeuferwechsel: number;
  standortwechsel: number;
  /** Zahl unterschiedlicher Plattformen. */
  plattformen: number;
  /** Inserate, die entfernt und später erneut aufgetaucht sind. */
  wiederinserierungen: number;
}

export function historienkennzahlen(
  inserate: Inserat[],
  stichtag: string,
): Historienkennzahlen {
  const alleAenderungen = inserate.flatMap(inseratHistorie);
  const preise = preisverlauf(inserate);
  const km = kilometerverlauf(inserate);

  const erstBeobachtung = inserate
    .map((i) => i.erstEntdeckt)
    .sort()
    .at(0);

  let groesste = 0;
  for (const a of alleAenderungen) {
    if (a.art === 'preis' && a.differenz !== null && a.differenz < 0) {
      const vorher = Number.parseFloat(a.vorher ?? '0');
      if (vorher > 0) {
        groesste = Math.max(groesste, (-a.differenz / vorher) * 100);
      }
    }
  }

  let rueckgang = false;
  for (let i = 1; i < km.length; i++) {
    if (km[i].wert < km[i - 1].wert) rueckgang = true;
  }

  // Verkäuferwechsel innerhalb eines Inserates plus Wechsel zwischen
  // Inseraten desselben Fahrzeuges auf derselben Plattform.
  const verkaeuferInnerhalb = alleAenderungen.filter(
    (a) => a.art === 'verkaeufer' && a.feld === 'verkaeuferName',
  ).length;
  const verkaeuferNamen = new Set(
    inserate.map((i) => letzteBeobachtung(i).daten.verkaeuferName),
  );
  const verkaeuferwechsel = Math.max(
    verkaeuferInnerhalb,
    verkaeuferNamen.size - 1,
  );

  const wiederinserierungen = inserate.filter((i) => {
    // Ein Inserat, das nach einer Pause wieder Beobachtungen bekam.
    for (let k = 1; k < i.beobachtungen.length; k++) {
      const luecke =
        Date.parse(i.beobachtungen[k].zeitpunkt) -
        Date.parse(i.beobachtungen[k - 1].zeitpunkt);
      if (luecke > 45 * 86_400_000) return true;
    }
    return false;
  }).length;

  return {
    beobachtungsdauerTage: erstBeobachtung
      ? Math.round((Date.parse(stichtag) - Date.parse(erstBeobachtung)) / 86_400_000)
      : 0,
    anzahlInserate: inserate.length,
    anzahlBeobachtungen: inserate.reduce((s, i) => s + i.beobachtungen.length, 0),
    anzahlPreisaenderungen: alleAenderungen.filter((a) => a.art === 'preis').length,
    erstpreis: preise.at(0)?.wert ?? null,
    aktuellerPreis: preise.at(-1)?.wert ?? null,
    preisveraenderungProzent:
      preise.length >= 2 && preise[0].wert > 0
        ? ((preise[preise.length - 1].wert - preise[0].wert) / preise[0].wert) * 100
        : null,
    groessteReduktionProzent: groesste > 0 ? groesste : null,
    kilometerRueckgang: rueckgang,
    verkaeuferwechsel,
    standortwechsel: alleAenderungen.filter((a) => a.art === 'standort').length,
    plattformen: new Set(inserate.map((i) => i.plattformId)).size,
    wiederinserierungen,
  };
}
