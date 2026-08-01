/**
 * Brücke zwischen Projektdatenmodell und Regel-Engine.
 *
 * Die Engine kennt das Projektmodell nicht — sie arbeitet auf einem flachen
 * Kontext. Diese Schicht übersetzt in beide Richtungen und ist die einzige
 * Stelle, an der beide Welten aufeinandertreffen.
 */

import { werteMatrixAus, matrixKennzahlen } from './engine';
import type { Ausgabestand, EngineKontext, IstWerte, AbweichungsIndex } from './engine';
import { ermittleGebaeudeklasse } from './gebaeudeklasse';
import type { GebaeudeklassenEingabe } from './gebaeudeklasse';
import type { Bundesland, GebaeudeklassenErgebnis, MatrixErgebnis } from './types';
import type { Projekt } from '@/domain/types';

/** Summe der Personenzahlen aller Nutzungseinheiten. */
function personenGesamt(p: Projekt): number {
  return p.nutzungseinheiten.reduce((s, n) => s + n.personenzahl, 0);
}

/** Eingaben für die Gebäudeklassenableitung aus dem Projekt. */
export function klassenEingabeVon(p: Projekt): GebaeudeklassenEingabe {
  const k = p.klassenEingabe;
  return {
    fluchtniveau: p.gebaeude.fluchtniveau > 0 ? p.gebaeude.fluchtniveau : null,
    geschosseOberirdisch:
      p.gebaeude.geschosseOberirdisch > 0 ? p.gebaeude.geschosseOberirdisch : null,
    // Fällt auf die erfassten Nutzungseinheiten zurück, wenn nicht gesondert
    // angegeben — spart Doppelerfassung, bleibt aber übersteuerbar.
    nutzungseinheitenAnzahl:
      k.nutzungseinheitenAnzahl ??
      (p.nutzungseinheiten.length > 0 ? p.nutzungseinheiten.length : null),
    groessteEinheitFlaeche:
      k.groessteEinheitFlaeche ??
      (p.nutzungseinheiten.length > 0
        ? Math.max(...p.nutzungseinheiten.map((n) => n.flaeche))
        : null),
    freistehend: k.freistehend,
  };
}

/** Berechnet die Gebäudeklasse samt Ableitungsweg (FR-2.1, FR-2.9). */
export function gebaeudeklasseVon(p: Projekt): GebaeudeklassenErgebnis {
  return ermittleGebaeudeklasse(klassenEingabeVon(p));
}

/** Baut den Auswertungskontext der Engine aus dem Projekt. */
export function kontextVon(p: Projekt): EngineKontext {
  const g = p.gebaeude;
  return {
    // Wird in der Engine durch die berechnete Klasse überschrieben.
    gebaeudeklasse: null,
    fluchtniveau: g.fluchtniveau > 0 ? g.fluchtniveau : null,
    geschosseOberirdisch: g.geschosseOberirdisch > 0 ? g.geschosseOberirdisch : null,
    geschosseUnterirdisch: g.geschosseUnterirdisch,
    bruttoGrundflaeche: g.bruttoGrundflaeche > 0 ? g.bruttoGrundflaeche : null,
    groessterBrandabschnitt:
      p.brandabschnitte.length > 0
        ? Math.max(...p.brandabschnitte.map((b) => b.flaeche))
        : g.groessterBrandabschnitt > 0
          ? g.groessterBrandabschnitt
          : null,
    nutzungsarten: [...new Set(p.nutzungseinheiten.map((n) => n.nutzungsart))],
    personenGesamt: p.nutzungseinheiten.length > 0 ? personenGesamt(p) : null,
    risikoklasse: g.risikoklasse,
    hatKeller: g.geschosseUnterirdisch > 0,
  };
}

/**
 * Leitet Istwerte für die Matrix ab.
 *
 * Manuell erfasste Werte in `projekt.istWerte` haben Vorrang; darüber hinaus
 * werden Werte aus den Fachkapiteln übernommen, damit dieselbe Angabe nicht
 * zweimal einzugeben ist.
 */
export function istWerteVon(p: Projekt): IstWerte {
  const abgeleitet: IstWerte = {};

  // Fluchtwege: längster Weg und schmalste Breite sind maßgebend.
  if (p.fluchtwege.length > 0) {
    abgeleitet['oib2-2023-5.1-fluchtweglaenge'] = Math.max(
      ...p.fluchtwege.map((f) => f.laenge),
    );
    abgeleitet['oib2-2023-5.2-fluchtwegbreite'] = Math.min(
      ...p.fluchtwege.map((f) => f.breite),
    );
    abgeleitet['oib2-2023-5.3-zweiter-fluchtweg'] =
      p.fluchtwege.filter((f) => f.fuehrtInsFreie).length >= 2;
    abgeleitet['oib2-2023-5.4-sicherheitsbeleuchtung'] = p.fluchtwege.every(
      (f) => f.sicherheitsbeleuchtung,
    );
    abgeleitet['oib2-2023-5.5-fluchtwegkennzeichnung'] = p.fluchtwege.every(
      (f) => f.fluchtwegorientierung,
    );
    abgeleitet['oib2-2023-5.6-panikbeschlag'] = p.fluchtwege
      .filter((f) => f.personen >= 100)
      .every((f) => f.panikbeschlag);
  }

  // Brandabschnitte: größte Fläche gegen den Richtwert.
  if (p.brandabschnitte.length > 0) {
    abgeleitet['oib2-2023-3.4-brandabschnitt-flaeche'] = Math.max(
      ...p.brandabschnitte.map((b) => b.flaeche),
    );
  }

  // Löschhilfen: Summe der Löschmitteleinheiten.
  const le = p.loeschhilfen
    .filter((l) => l.art === 'handfeuerloescher' || l.art === 'fahrbarer-loescher')
    .reduce((s, l) => s + l.anzahl * l.loeschmitteleinheiten, 0);
  if (p.loeschhilfen.length > 0) {
    abgeleitet['oib2-2023-6.1-erste-loeschhilfe'] = le;
  }

  if (p.loeschwasser.menge > 0) {
    abgeleitet['oib2-2023-6.2-loeschwasser'] = p.loeschwasser.menge;
  }

  // Anlagentechnik: Vorhandensein je Anlagenart.
  const anlageVorhanden = (art: string) =>
    p.anlagen.some(
      (a) => a.art === art && (a.status === 'vorhanden' || a.status === 'geplant'),
    );
  if (p.anlagen.length > 0) {
    abgeleitet['oib2-2023-6.3-brandmeldeanlage'] = anlageVorhanden('BMA');
    abgeleitet['oib2-2023-6.4-alarmierung'] = anlageVorhanden('ALA');
    abgeleitet['oib2-2023-6.5-rwa-keller'] =
      anlageVorhanden('RWA') || anlageVorhanden('ENT');
    abgeleitet['oib2-2023-6.6-rwa-treppenhaus'] = anlageVorhanden('RWA');
  }

  abgeleitet['oib2-2023-6.8-brandschutzplaene'] =
    p.organisation.brandschutzplaeneVorhanden;

  // Bauteile: je Kategorie die schwächste erfasste Klasse.
  const schwaechste = (kategorie: string): string | null => {
    const treffer = p.bauteile.filter((b) => b.kategorie === kategorie);
    if (treffer.length === 0) return null;
    return treffer.reduce((min, b) => (b.istKlasse < min ? b.istKlasse : min),
      treffer[0].istKlasse);
  };

  const bauteilZuordnung: Record<string, string[]> = {
    tragwerk: [
      'oib2-2023-2.1-tragwerk-ob-gk1',
      'oib2-2023-2.1-tragwerk-ob-gk2',
      'oib2-2023-2.1-tragwerk-ob-gk3-4',
      'oib2-2023-2.1-tragwerk-ob-gk5',
    ],
    decke: [
      'oib2-2023-3.1-trenndecke-gk1-2',
      'oib2-2023-3.1-trenndecke-gk3-4',
      'oib2-2023-3.1-trenndecke-gk5',
    ],
    trennwand: [
      'oib2-2023-3.2-trennwand-gk1-3',
      'oib2-2023-3.2-trennwand-gk4-5',
      'oib2-2023-3.3-brandabschnittswand',
    ],
    treppenhaus: ['oib2-2023-3.5-treppenhauswand'],
    schacht: ['oib2-2023-3.6-schacht'],
    tuer: ['oib2-2023-3.8-brandschutztuer-abschnitt'],
  };

  for (const [kategorie, ids] of Object.entries(bauteilZuordnung)) {
    const wert = schwaechste(kategorie);
    if (wert === null) continue;
    for (const id of ids) abgeleitet[id] = wert;
  }

  // Manuelle Übersteuerung gewinnt.
  return { ...abgeleitet, ...p.istWerte };
}

/** Index der als Abweichung dokumentierten Anforderungen (FR-3.1). */
export function abweichungsIndexVon(p: Projekt): AbweichungsIndex {
  const index: AbweichungsIndex = {};
  for (const a of p.abweichungen) {
    if (!a.anforderungId) continue;
    index[a.anforderungId] = {
      begruendung: a.beschreibung,
      freigegeben: a.gleichwertigkeitBeurteiltVon.trim().length > 0,
    };
  }
  return index;
}

/** Wertet die Anforderungsmatrix für ein Projekt aus. */
export function werteProjektAus(p: Projekt): MatrixErgebnis {
  return werteMatrixAus({
    ausgabe: p.oibAusgabe as Ausgabestand,
    bundesland: p.bundesland as Bundesland,
    kontext: kontextVon(p),
    gebaeudeklassenEingabe: klassenEingabeVon(p),
    istWerte: istWerteVon(p),
    abweichungen: abweichungsIndexVon(p),
  });
}

export { matrixKennzahlen };
