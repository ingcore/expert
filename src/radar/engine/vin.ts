/**
 * Prüfung der Fahrgestellnummer.
 *
 * Vollständige VIN-Dekodierung ist Sache einer Herstellerdatenbank und steht
 * nach PRD Abschnitt 48 in Phase 3 an. Was ohne externe Quelle **jetzt schon**
 * geht, ist die formale Prüfung — und die deckt genau die Fälle ab, die
 * Abschnitt 23 als Red Flags nennt: eine VIN, deren Herstellerkennung nicht zum
 * angegebenen Hersteller passt, und ein Modelljahr, das nicht zur
 * Erstzulassung passt.
 *
 * Bewusst konservativ: Was nicht sicher geprüft werden kann, gilt als
 * ungeprüft, nicht als falsch.
 */

/** Weltweite Herstellerkennungen der MVP-Marken. */
const WMI: Record<string, string> = {
  WBA: 'BMW',
  WBS: 'BMW',
  WBX: 'BMW',
  WBY: 'BMW',
  '4US': 'BMW',
  '5UX': 'BMW',
  WAU: 'Audi',
  WUA: 'Audi',
  TRU: 'Audi',
  '93U': 'Audi',
  WP0: 'Porsche',
  WP1: 'Porsche',
};

/**
 * Modelljahrcode an Stelle 10. Der Code wiederholt sich alle 30 Jahre; für die
 * hier betrachteten Baujahre ist die Zuordnung eindeutig.
 */
const MODELLJAHR: Record<string, number> = {
  '1': 2001, '2': 2002, '3': 2003, '4': 2004, '5': 2005,
  '6': 2006, '7': 2007, '8': 2008, '9': 2009,
  A: 2010, B: 2011, C: 2012, D: 2013, E: 2014, F: 2015,
  G: 2016, H: 2017, J: 2018, K: 2019, L: 2020, M: 2021,
  N: 2022, P: 2023, R: 2024, S: 2025, T: 2026,
};

/** In einer VIN nicht zulässige Zeichen. */
const UNZULAESSIG = /[IOQ]/;

export interface VinPruefung {
  vin: string;
  formalGueltig: boolean;
  hersteller: string | null;
  modelljahr: number | null;
  befunde: { art: 'fehler' | 'hinweis'; text: string }[];
}

export function pruefeVin(
  vin: string | null,
  angegebenerHersteller: string | null,
  erstzulassung: string | null,
): VinPruefung | null {
  if (!vin) return null;
  const v = vin.toUpperCase().replace(/[\s-]/g, '');
  const befunde: VinPruefung['befunde'] = [];

  if (v.length !== 17) {
    befunde.push({
      art: 'fehler',
      text: `Fahrgestellnummer hat ${v.length} statt 17 Stellen.`,
    });
  }
  if (UNZULAESSIG.test(v)) {
    befunde.push({
      art: 'fehler',
      text: 'Fahrgestellnummer enthält die unzulässigen Zeichen I, O oder Q.',
    });
  }

  const wmi = v.slice(0, 3);
  const hersteller = WMI[wmi] ?? null;
  if (hersteller === null) {
    befunde.push({
      art: 'hinweis',
      text: `Herstellerkennung ${wmi} ist im Katalog nicht hinterlegt — keine Prüfung möglich.`,
    });
  } else if (
    angegebenerHersteller &&
    hersteller.toLowerCase() !== angegebenerHersteller.toLowerCase()
  ) {
    befunde.push({
      art: 'fehler',
      text: `Herstellerkennung ${wmi} steht für ${hersteller}, das Inserat nennt ${angegebenerHersteller}.`,
    });
  }

  const modelljahr = v.length === 17 ? (MODELLJAHR[v[9]] ?? null) : null;
  if (modelljahr !== null && erstzulassung) {
    const ezJahr = Number.parseInt(erstzulassung.slice(0, 4), 10);
    // Ein Fahrzeug wird im Modelljahr oder im Folgejahr erstzugelassen;
    // Vorführ- und Lagerfahrzeuge auch ein Jahr später.
    if (Number.isFinite(ezJahr) && (ezJahr < modelljahr || ezJahr > modelljahr + 2)) {
      befunde.push({
        art: 'fehler',
        text: `Modelljahr der VIN (${modelljahr}) passt nicht zur Erstzulassung ${erstzulassung}.`,
      });
    }
  }

  return {
    vin: v,
    formalGueltig: !befunde.some((b) => b.art === 'fehler'),
    hersteller,
    modelljahr,
    befunde,
  };
}
