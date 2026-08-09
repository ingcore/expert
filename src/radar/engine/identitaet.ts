/**
 * Vehicle Identity Engine — PRD Abschnitt 10.
 *
 * Die Engine beantwortet eine einzige Frage: Zeigen zwei Inserate dasselbe
 * physische Fahrzeug? Sie beantwortet sie mit einer Wahrscheinlichkeit, nicht
 * mit ja oder nein — und das aus gutem Grund. Abschnitt 51 benennt die falsche
 * Zusammenführung zweier ähnlicher Fahrzeuge als wesentliches Risiko: Ein
 * fälschlich verschmolzenes Fahrzeug erzeugt eine erfundene Historie, und
 * genau diese Historie ist das, worauf das Produkt seine Aussagen stützt.
 *
 * Deshalb gilt:
 *   — Über der oberen Schwelle wird automatisch zusammengeführt.
 *   — Zwischen den Schwellen entsteht ein Grenzfall zur manuellen Prüfung.
 *   — Widersprüchliche VIN schließt Identität aus, egal wie ähnlich der Rest ist.
 *
 * Fehlende Merkmale zählen nicht als Übereinstimmung und nicht als
 * Widerspruch; sie fallen aus der Gewichtung heraus. Sonst würde ein Inserat
 * mit wenigen Angaben allein durch seine Dürftigkeit zu jedem anderen passen.
 */

import type { InseratDaten } from '../domain/types';
import { begrenze, monatsIndex } from '../domain/format';

export interface Merkmalsvergleich {
  schluessel: string;
  label: string;
  gewicht: number;
  /** 0–100; `null`, wenn das Merkmal in mindestens einem Inserat fehlt. */
  uebereinstimmung: number | null;
  hinweis: string;
}

export type Identitaetsentscheidung = 'identisch' | 'pruefen' | 'verschieden';

export interface Identitaetsvergleich {
  /** Vehicle Identity Confidence Score, 0–100. */
  score: number;
  entscheidung: Identitaetsentscheidung;
  merkmale: Merkmalsvergleich[];
  begruendung: string;
  /** Wie viel Gewicht überhaupt beurteilbar war — Aussagekraft des Scores. */
  beurteilbaresGewicht: number;
}

/* ==========================================================================
 * Bild-Hashes
 * ======================================================================= */

const BITS = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4];

/**
 * Hamming-Abstand zweier 64-Bit-Wahrnehmungs-Hashes in Hexadezimalform.
 *
 * Rückgabe 64 bedeutet „maximal verschieden"; sie wird auch bei ungleicher
 * Länge geliefert, damit ein defekter Hash nie versehentlich Ähnlichkeit
 * vortäuscht.
 */
export function hammingHex(a: string, b: string): number {
  if (a.length !== b.length || a.length === 0) return 64;
  let abstand = 0;
  for (let i = 0; i < a.length; i++) {
    const x = Number.parseInt(a[i], 16);
    const y = Number.parseInt(b[i], 16);
    if (Number.isNaN(x) || Number.isNaN(y)) return 64;
    abstand += BITS[x ^ y];
  }
  return abstand;
}

/** Zahl der Bildpaare, die unterhalb der Schwelle als gleich gelten. */
export function gleicheBilder(
  a: { phash: string }[],
  b: { phash: string }[],
  schwelle: number,
): number {
  let treffer = 0;
  const belegt = new Set<number>();
  for (const bildA of a) {
    let besterIndex = -1;
    let besterAbstand = schwelle + 1;
    b.forEach((bildB, i) => {
      if (belegt.has(i)) return;
      const d = hammingHex(bildA.phash, bildB.phash);
      if (d < besterAbstand) {
        besterAbstand = d;
        besterIndex = i;
      }
    });
    if (besterIndex >= 0 && besterAbstand <= schwelle) {
      belegt.add(besterIndex);
      treffer++;
    }
  }
  return treffer;
}

/* ==========================================================================
 * Hilfsvergleiche
 * ======================================================================= */

function normalisiereText(t: string | null): string | null {
  if (!t) return null;
  return t
    .toLowerCase()
    .replace(/[^a-zäöüß0-9]/g, '')
    .trim() || null;
}

/** Übereinstimmung zweier Mengen als Jaccard-Index in Prozent. */
function jaccard(a: string[], b: string[]): number | null {
  if (a.length === 0 || b.length === 0) return null;
  const mengeA = new Set(a);
  const mengeB = new Set(b);
  const schnitt = [...mengeA].filter((x) => mengeB.has(x)).length;
  const vereinigung = new Set([...mengeA, ...mengeB]).size;
  return (schnitt / vereinigung) * 100;
}

function farbvergleich(a: string | null, b: string | null): number | null {
  const na = normalisiereText(a);
  const nb = normalisiereText(b);
  if (!na || !nb) return null;
  if (na === nb) return 100;
  // Händler schreiben dieselbe Farbe unterschiedlich: „Interlagosblau" und
  // „Interlagos Blau metallic". Teilstring gilt als starke Übereinstimmung.
  if (na.includes(nb) || nb.includes(na)) return 85;
  return 0;
}

/* ==========================================================================
 * Vergleich
 * ======================================================================= */

export interface Vergleichskontext {
  /** Beobachtungszeitpunkt der jeweiligen Daten. */
  zeitpunktA: string;
  zeitpunktB: string;
  /** Maximaler Hamming-Abstand für „gleiches Bild". */
  bildHashSchwelle: number;
  schwelleAutomatisch: number;
  schwelleManuell: number;
}

export function vergleicheFahrzeuge(
  a: InseratDaten,
  b: InseratDaten,
  kontext: Vergleichskontext,
): Identitaetsvergleich {
  const merkmale: Merkmalsvergleich[] = [];

  /* -- VIN: entscheidet allein ---------------------------------------- */
  const vinA = a.vin?.toUpperCase().replace(/\s/g, '') ?? null;
  const vinB = b.vin?.toUpperCase().replace(/\s/g, '') ?? null;
  if (vinA && vinB) {
    const gleich = vinA === vinB;
    merkmale.push({
      schluessel: 'vin',
      label: 'Fahrgestellnummer',
      gewicht: 100,
      uebereinstimmung: gleich ? 100 : 0,
      hinweis: gleich
        ? `VIN in beiden Inseraten identisch (${vinA}).`
        : `VIN widersprechen sich: ${vinA} gegenüber ${vinB}.`,
    });
    return {
      score: gleich ? 100 : 0,
      entscheidung: gleich ? 'identisch' : 'verschieden',
      merkmale,
      begruendung: gleich
        ? 'Identität durch übereinstimmende Fahrgestellnummer belegt.'
        : 'Identität durch abweichende Fahrgestellnummer ausgeschlossen.',
      beurteilbaresGewicht: 100,
    };
  }

  /* -- Modell und Technik ---------------------------------------------- */
  const modellGleich =
    normalisiereText(`${a.hersteller}${a.modell}${a.baureihe}`) ===
    normalisiereText(`${b.hersteller}${b.modell}${b.baureihe}`);
  merkmale.push({
    schluessel: 'modell',
    label: 'Modell und Baureihe',
    gewicht: 10,
    uebereinstimmung: modellGleich ? 100 : 0,
    hinweis: modellGleich
      ? `Beide Inserate: ${a.hersteller} ${a.modell} ${a.baureihe}.`
      : `${a.hersteller} ${a.modell} ${a.baureihe} gegenüber ${b.hersteller} ${b.modell} ${b.baureihe}.`,
  });

  const ezA = a.erstzulassung;
  const ezB = b.erstzulassung;
  merkmale.push({
    schluessel: 'erstzulassung',
    label: 'Erstzulassung',
    gewicht: 16,
    uebereinstimmung:
      ezA && ezB
        ? Math.abs(monatsIndex(ezA) - monatsIndex(ezB)) === 0
          ? 100
          : Math.abs(monatsIndex(ezA) - monatsIndex(ezB)) <= 1
            ? 60 // Händler datieren gelegentlich auf den Zulassungsmonat um.
            : 0
        : null,
    hinweis:
      ezA && ezB
        ? ezA === ezB
          ? `Erstzulassung übereinstimmend (${ezA}).`
          : `Erstzulassung ${ezA} gegenüber ${ezB}.`
        : 'Erstzulassung in mindestens einem Inserat nicht angegeben.',
  });

  merkmale.push({
    schluessel: 'motor',
    label: 'Motorisierung',
    gewicht: 8,
    uebereinstimmung:
      a.leistungPs !== null && b.leistungPs !== null
        ? Math.abs(a.leistungPs - b.leistungPs) <= 5
          ? 100
          : 0
        : null,
    hinweis:
      a.leistungPs !== null && b.leistungPs !== null
        ? `${a.leistungPs} PS gegenüber ${b.leistungPs} PS.`
        : 'Leistungsangabe unvollständig.',
  });

  merkmale.push({
    schluessel: 'getriebe',
    label: 'Getriebe',
    gewicht: 8,
    uebereinstimmung:
      a.getriebe !== 'unbekannt' && b.getriebe !== 'unbekannt'
        ? a.getriebe === b.getriebe
          ? 100
          : 0
        : null,
    hinweis:
      a.getriebe !== 'unbekannt' && b.getriebe !== 'unbekannt'
        ? `${a.getriebe} gegenüber ${b.getriebe}.`
        : 'Getriebeart in mindestens einem Inserat nicht angegeben.',
  });

  /* -- Farbe ----------------------------------------------------------- */
  const farbeAussen = farbvergleich(a.farbeAussen, b.farbeAussen);
  merkmale.push({
    schluessel: 'farbe-aussen',
    label: 'Außenfarbe',
    gewicht: 12,
    uebereinstimmung: farbeAussen,
    hinweis:
      farbeAussen === null
        ? 'Außenfarbe in mindestens einem Inserat nicht angegeben.'
        : `${a.farbeAussen} gegenüber ${b.farbeAussen}.`,
  });

  const farbeInnen = farbvergleich(a.farbeInnen, b.farbeInnen);
  merkmale.push({
    schluessel: 'farbe-innen',
    label: 'Innenausstattung',
    gewicht: 6,
    uebereinstimmung: farbeInnen,
    hinweis:
      farbeInnen === null
        ? 'Innenausstattung in mindestens einem Inserat nicht angegeben.'
        : `${a.farbeInnen} gegenüber ${b.farbeInnen}.`,
  });

  /* -- Kilometerstand über die Zeit ------------------------------------ */
  let kmWert: number | null = null;
  let kmHinweis = 'Kilometerstand in mindestens einem Inserat nicht angegeben.';
  if (a.kilometerstand !== null && b.kilometerstand !== null) {
    const frueher =
      Date.parse(kontext.zeitpunktA) <= Date.parse(kontext.zeitpunktB)
        ? { km: a.kilometerstand, t: kontext.zeitpunktA }
        : { km: b.kilometerstand, t: kontext.zeitpunktB };
    const spaeter =
      frueher.t === kontext.zeitpunktA
        ? { km: b.kilometerstand, t: kontext.zeitpunktB }
        : { km: a.kilometerstand, t: kontext.zeitpunktA };
    const monate = Math.max(
      0,
      (Date.parse(spaeter.t) - Date.parse(frueher.t)) / (86_400_000 * 30.44),
    );
    const zuwachs = spaeter.km - frueher.km;
    // Ein stehendes Sammlerfahrzeug fährt 0 km, ein bewegtes selten mehr als
    // 2.000 km im Monat. Zusätzlich 1.500 km Toleranz für Überführungen.
    const obergrenze = monate * 2000 + 1500;

    if (zuwachs < -500) {
      kmWert = 0;
      kmHinweis = `Kilometerstand sinkt um ${Math.abs(zuwachs)} km zwischen den Beobachtungen.`;
    } else if (zuwachs <= obergrenze) {
      // Je enger der Zuwachs am Erwartbaren liegt, desto stärker das Merkmal.
      kmWert = zuwachs <= 500 ? 100 : begrenze(100 - (zuwachs / obergrenze) * 35, 60, 100);
      kmHinweis = `Kilometerdifferenz ${zuwachs} km bei ${monate.toFixed(1)} Monaten Abstand — plausibel.`;
    } else {
      kmWert = 15;
      kmHinweis = `Kilometerdifferenz ${zuwachs} km ist für ${monate.toFixed(1)} Monate ungewöhnlich hoch.`;
    }
  }
  merkmale.push({
    schluessel: 'kilometerstand',
    label: 'Kilometerstand',
    gewicht: 14,
    uebereinstimmung: kmWert,
    hinweis: kmHinweis,
  });

  /* -- Ausstattung ------------------------------------------------------ */
  const ausstattung = jaccard(a.ausstattung, b.ausstattung);
  merkmale.push({
    schluessel: 'ausstattung',
    label: 'Sonderausstattung',
    gewicht: 12,
    uebereinstimmung: ausstattung === null ? null : begrenze(ausstattung * 1.3, 0, 100),
    hinweis:
      ausstattung === null
        ? 'Ausstattungsliste in mindestens einem Inserat leer.'
        : `${Math.round(ausstattung)} % Überschneidung der Ausstattungsmerkmale.`,
  });

  /* -- Bilder ----------------------------------------------------------- */
  let bildWert: number | null = null;
  let bildHinweis = 'Zu wenige Bilder für einen Vergleich.';
  if (a.bilder.length >= 2 && b.bilder.length >= 2) {
    const treffer = gleicheBilder(a.bilder, b.bilder, kontext.bildHashSchwelle);
    const basis = Math.min(a.bilder.length, b.bilder.length);
    const anteil = treffer / basis;
    bildWert = begrenze(anteil * 130, 0, 100);
    bildHinweis =
      treffer === 0
        ? 'Keine übereinstimmenden Bilder — bei verschiedenen Verkäufern üblich.'
        : `${treffer} von ${basis} Bildern stimmen im Wahrnehmungs-Hash überein.`;
  }
  merkmale.push({
    schluessel: 'bilder',
    label: 'Bildähnlichkeit',
    gewicht: 18,
    uebereinstimmung: bildWert,
    hinweis: bildHinweis,
  });

  /* -- Individuelle Merkmale aus der Bildanalyse ------------------------ */
  const merkmaleA = a.bilder.flatMap((x) => x.merkmale);
  const merkmaleB = b.bilder.flatMap((x) => x.merkmale);
  const individuell = jaccard(merkmaleA, merkmaleB);
  merkmale.push({
    schluessel: 'individuelle-merkmale',
    label: 'Individuelle Merkmale (Felgen, Umbauten, Beschädigungen)',
    gewicht: 10,
    uebereinstimmung: individuell === null ? null : begrenze(individuell * 1.4, 0, 100),
    hinweis:
      individuell === null
        ? 'Keine erkannten Einzelmerkmale zum Vergleich.'
        : `${Math.round(individuell)} % Überschneidung erkannter Einzelmerkmale.`,
  });

  /* -- Standort und Verkäufer ------------------------------------------ */
  const ortGleich =
    normalisiereText(a.standortOrt) === normalisiereText(b.standortOrt);
  const landGleich = a.standortLand === b.standortLand;
  merkmale.push({
    schluessel: 'standort',
    label: 'Standort',
    gewicht: 5,
    uebereinstimmung: ortGleich ? 100 : landGleich ? 45 : 10,
    hinweis: ortGleich
      ? `Gleicher Standort (${a.standortOrt}).`
      : landGleich
        ? `Unterschiedlicher Ort im selben Land (${a.standortOrt} / ${b.standortOrt}).`
        : `Verschiedene Länder (${a.standortLand} / ${b.standortLand}).`,
  });

  const verkaeuferGleich =
    normalisiereText(a.verkaeuferName) === normalisiereText(b.verkaeuferName);
  merkmale.push({
    schluessel: 'verkaeufer',
    label: 'Verkäufer',
    gewicht: 4,
    // Ein Verkäuferwechsel spricht nicht gegen Identität — er ist im
    // Gegenteil der interessanteste Fall (Abschnitt 11).
    uebereinstimmung: verkaeuferGleich ? 100 : 40,
    hinweis: verkaeuferGleich
      ? `Gleicher Verkäufer (${a.verkaeuferName}).`
      : `Verschiedene Verkäufer (${a.verkaeuferName} / ${b.verkaeuferName}).`,
  });

  /* -- Zusammenrechnung -------------------------------------------------- */
  const beurteilbar = merkmale.filter((m) => m.uebereinstimmung !== null);
  const gewichtSumme = beurteilbar.reduce((s, m) => s + m.gewicht, 0);
  const roh =
    gewichtSumme === 0
      ? 0
      : beurteilbar.reduce(
          (s, m) => s + (m.uebereinstimmung as number) * m.gewicht,
          0,
        ) / gewichtSumme;

  // Ein hoher Score aus wenig beurteilbarem Gewicht ist kein hoher Score.
  // Unterhalb von 60 Gewichtspunkten wird gedämpft, statt Sicherheit
  // vorzutäuschen, die die Datenlage nicht hergibt.
  const daempfung = gewichtSumme >= 60 ? 1 : 0.7 + (gewichtSumme / 60) * 0.3;
  const score = Math.round(begrenze(roh * daempfung, 0, 100));

  // Ein harter Widerspruch in einem tragenden Merkmal schließt aus, auch wenn
  // alles andere passt: verschiedene Baureihe, verschiedene Erstzulassung,
  // sinkender Kilometerstand.
  const harterWiderspruch = merkmale.find(
    (m) =>
      m.uebereinstimmung === 0 &&
      ['modell', 'erstzulassung', 'motor', 'getriebe'].includes(m.schluessel),
  );

  let entscheidung: Identitaetsentscheidung;
  let begruendung: string;
  if (harterWiderspruch) {
    entscheidung = 'verschieden';
    begruendung = `Ausgeschlossen: ${harterWiderspruch.label} widerspricht (${harterWiderspruch.hinweis})`;
  } else if (score >= kontext.schwelleAutomatisch) {
    entscheidung = 'identisch';
    begruendung = `${score} % Übereinstimmung — über der Schwelle für automatische Zuordnung (${kontext.schwelleAutomatisch} %).`;
  } else if (score >= kontext.schwelleManuell) {
    entscheidung = 'pruefen';
    begruendung = `${score} % Übereinstimmung — Grenzfall, manuelle Prüfung erforderlich.`;
  } else {
    entscheidung = 'verschieden';
    begruendung = `${score} % Übereinstimmung — unterhalb der Prüfschwelle (${kontext.schwelleManuell} %).`;
  }

  return {
    score: harterWiderspruch ? Math.min(score, 30) : score,
    entscheidung,
    merkmale,
    begruendung,
    beurteilbaresGewicht: gewichtSumme,
  };
}

/* ==========================================================================
 * Zuordnung zu bestehenden Fahrzeugakten
 * ======================================================================= */

export interface Zuordnungskandidat {
  fahrzeugId: string;
  inseratId: string;
  vergleich: Identitaetsvergleich;
}

export interface Zuordnungsergebnis {
  /** Fahrzeugakte, der zugeordnet wird — `null` bei Neuanlage. */
  fahrzeugId: string | null;
  entscheidung: Identitaetsentscheidung | 'neu';
  bester: Zuordnungskandidat | null;
  /** Alle Kandidaten oberhalb der Prüfschwelle, absteigend. */
  kandidaten: Zuordnungskandidat[];
}

/**
 * Sucht zu einem Inserat die passende Fahrzeugakte.
 *
 * Findet sich kein Kandidat über der automatischen Schwelle, wird eine neue
 * Akte angelegt und der beste Grenzfall zur manuellen Prüfung ausgewiesen.
 * Eine automatische Zusammenführung bei „pruefen" findet nicht statt.
 */
export function ordneZu(
  neu: InseratDaten,
  neuZeitpunkt: string,
  bestand: {
    fahrzeugId: string;
    inseratId: string;
    daten: InseratDaten;
    zeitpunkt: string;
  }[],
  kontext: Omit<Vergleichskontext, 'zeitpunktA' | 'zeitpunktB'>,
): Zuordnungsergebnis {
  const kandidaten: Zuordnungskandidat[] = bestand
    .map((b) => ({
      fahrzeugId: b.fahrzeugId,
      inseratId: b.inseratId,
      vergleich: vergleicheFahrzeuge(neu, b.daten, {
        ...kontext,
        zeitpunktA: neuZeitpunkt,
        zeitpunktB: b.zeitpunkt,
      }),
    }))
    .filter((k) => k.vergleich.entscheidung !== 'verschieden')
    .sort((a, b) => b.vergleich.score - a.vergleich.score);

  const bester = kandidaten[0] ?? null;

  if (bester && bester.vergleich.entscheidung === 'identisch') {
    return {
      fahrzeugId: bester.fahrzeugId,
      entscheidung: 'identisch',
      bester,
      kandidaten,
    };
  }

  return {
    fahrzeugId: null,
    entscheidung: bester ? 'pruefen' : 'neu',
    bester,
    kandidaten,
  };
}
