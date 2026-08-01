/** Kennzahlen und Auswertungen über ein Projekt bzw. das Portfolio. */

import { SCORE_GEWICHT } from './catalog';
import type { Massnahme, Projekt, SafetyScore } from './types';

export interface MassnahmenKennzahlen {
  gesamt: number;
  offen: number;
  inUmsetzung: number;
  erledigt: number;
  entfallen: number;
  ueberfaellig: number;
  kostenGesamt: number;
  kostenOffen: number;
  /** Verteilung über die SAFETY-SCORE-Stufen. */
  verteilung: Record<SafetyScore, number>;
}

/** Ist eine Maßnahme überfällig? */
export function istUeberfaellig(m: Massnahme, stichtag = new Date()): boolean {
  if (m.status === 'erledigt' || m.status === 'entfallen') return false;
  if (!m.frist) return false;
  const frist = new Date(m.frist);
  if (Number.isNaN(frist.getTime())) return false;
  return frist < stichtag;
}

export function massnahmenKennzahlen(
  massnahmen: Massnahme[],
): MassnahmenKennzahlen {
  const k: MassnahmenKennzahlen = {
    gesamt: massnahmen.length,
    offen: 0,
    inUmsetzung: 0,
    erledigt: 0,
    entfallen: 0,
    ueberfaellig: 0,
    kostenGesamt: 0,
    kostenOffen: 0,
    verteilung: { A: 0, B: 0, C: 0, D: 0, E: 0 },
  };

  for (const m of massnahmen) {
    k.verteilung[m.score] += 1;
    k.kostenGesamt += m.kosten;

    switch (m.status) {
      case 'offen':
        k.offen += 1;
        k.kostenOffen += m.kosten;
        break;
      case 'in-umsetzung':
        k.inUmsetzung += 1;
        k.kostenOffen += m.kosten;
        break;
      case 'erledigt':
        k.erledigt += 1;
        break;
      case 'entfallen':
        k.entfallen += 1;
        break;
    }

    if (istUeberfaellig(m)) k.ueberfaellig += 1;
  }

  return k;
}

/**
 * Risikoindex eines Projekts: gewichtete Summe der offenen Mängel.
 * 0 = keine offenen Mängel. Der Wert ist bewusst unnormiert, damit
 * Projekte untereinander vergleichbar bleiben.
 */
export function risikoindex(projekt: Projekt): number {
  return projekt.massnahmen
    .filter((m) => m.status === 'offen' || m.status === 'in-umsetzung')
    .reduce((s, m) => s + SCORE_GEWICHT[m.score], 0);
}

/** Höchster offener SAFETY-SCORE eines Projekts (null = keine offenen Mängel). */
export function hoechsterScore(projekt: Projekt): SafetyScore | null {
  const reihenfolge: SafetyScore[] = ['E', 'D', 'C', 'B', 'A'];
  const offen = projekt.massnahmen.filter(
    (m) => m.status === 'offen' || m.status === 'in-umsetzung',
  );
  for (const s of reihenfolge) {
    if (offen.some((m) => m.score === s)) return s;
  }
  return null;
}

/**
 * Fertigstellungsgrad des Konzepts in Prozent. Bewertet, wie viele der
 * inhaltlich erforderlichen Abschnitte befüllt sind.
 */
export function vollstaendigkeit(projekt: Projekt): number {
  const kriterien: boolean[] = [
    projekt.titel.trim().length > 0,
    projekt.auftraggeber.name.trim().length > 0,
    /^\d{4}$/.test(projekt.auftraggeber.kundennummer),
    projekt.objekt.bezeichnung.trim().length > 0,
    projekt.objekt.ort.trim().length > 0,
    projekt.bearbeiter.name.trim().length > 0,
    projekt.gebaeude.fluchtniveau > 0,
    projekt.gebaeude.bruttoGrundflaeche > 0,
    projekt.gebaeude.konstruktionsbeschreibung.trim().length > 0,
    projekt.nutzungseinheiten.length > 0,
    projekt.brandabschnitte.length > 0,
    projekt.bauteile.length > 0,
    projekt.fluchtwege.length > 0,
    projekt.loeschhilfen.length > 0,
    projekt.loeschwasser.erforderlich > 0,
    projekt.anlagen.length > 0,
    projekt.organisation.brandschutzordnungVorhanden ||
      projekt.organisation.bemerkung.trim().length > 0,
    projekt.auftragsgegenstand.trim().length > 0,
    projekt.grundlagen.trim().length > 0,
    projekt.conclusio.trim().length > 0,
  ];

  const erfuellt = kriterien.filter(Boolean).length;
  return Math.round((erfuellt / kriterien.length) * 100);
}

/** Summe der Nutzflächen aller Nutzungseinheiten. */
export function gesamtNutzflaeche(projekt: Projekt): number {
  return projekt.nutzungseinheiten.reduce((s, n) => s + n.flaeche, 0);
}

/** Summe der Personenzahlen aller Nutzungseinheiten. */
export function gesamtPersonen(projekt: Projekt): number {
  return projekt.nutzungseinheiten.reduce((s, n) => s + n.personenzahl, 0);
}

/**
 * Flächengewichtete mittlere Brandlast in MJ/m².
 * Nutzungseinheiten ohne ermittelte Brandlast bleiben unberücksichtigt.
 */
export function mittlereBrandlast(projekt: Projekt): number {
  const relevant = projekt.nutzungseinheiten.filter(
    (n) => n.brandlast > 0 && n.flaeche > 0,
  );
  const flaeche = relevant.reduce((s, n) => s + n.flaeche, 0);
  if (flaeche === 0) return 0;
  const summe = relevant.reduce((s, n) => s + n.brandlast * n.flaeche, 0);
  return Math.round(summe / flaeche);
}
