/**
 * Regel-Engine — Herzstück der Anwendung (PRD Abschnitt 8, Schicht 2).
 *
 * Löst die Anforderungsmatrix gegen den Gebäudekontext auf, wendet
 * landesrechtliche Overlays an und vergleicht Soll- mit Istwerten. Es kommt
 * kein Sprachmodell zum Einsatz: Die Engine bestimmt, was gilt (LP-1).
 *
 * Jedes Ergebnis trägt seinen Quellenverweis (LP-3) und eine Confidence-Ampel
 * (PRD 12.3). Fehlt eine Eingabe, entsteht eine Datenlücke statt eines still
 * falschen Urteils (FR-2.8); widersprechen sich Regeln, entsteht ein Konflikt
 * (FR-2.7).
 */

import { evaluiere, trifftZu } from './jsonlogic';
import type { LogicKontext } from './jsonlogic';
import { OIB_RL2_2023 } from './regelwerk/oib-rl2-2023';
import { overlaysFuer } from './regelwerk/overlays';
import { ermittleGebaeudeklasse } from './gebaeudeklasse';
import type { GebaeudeklassenEingabe } from './gebaeudeklasse';
import type {
  Ampel,
  Anforderung,
  AnforderungsErgebnis,
  Bundesland,
  ErgebnisStatus,
  MatrixErgebnis,
  Overlay,
} from './types';

/* ==========================================================================
 * Regelbestand
 * ======================================================================= */

/** Verfügbare OIB-Ausgabestände (FR-2.6). */
export const AUSGABESTAENDE = ['2023-05'] as const;
export type Ausgabestand = (typeof AUSGABESTAENDE)[number];

const MATRIX_NACH_AUSGABE: Record<Ausgabestand, Anforderung[]> = {
  '2023-05': OIB_RL2_2023,
};

export function anforderungenFuer(ausgabe: Ausgabestand): Anforderung[] {
  return MATRIX_NACH_AUSGABE[ausgabe] ?? [];
}

/** Sucht eine Anforderung anhand ihrer ID über alle Ausgabestände. */
export function findeAnforderung(id: string): Anforderung | undefined {
  for (const liste of Object.values(MATRIX_NACH_AUSGABE)) {
    const treffer = liste.find((a) => a.id === id);
    if (treffer) return treffer;
  }
  return undefined;
}

/* ==========================================================================
 * Eingabe der Engine
 * ======================================================================= */

/**
 * Gebäudekontext, gegen den die Matrix ausgewertet wird. Die Feldnamen sind
 * zugleich die in den Regeldaten zulässigen Variablen.
 *
 * Bewusst ohne Index-Signatur: Sie würde `Omit<>` und verwandte Hilfstypen
 * die konkreten Feldtypen verlieren lassen. Für die Auswertung wird der
 * Kontext an der Aufrufstelle auf `LogicKontext` verbreitert.
 */
export interface EngineKontext {
  gebaeudeklasse: string | null;
  fluchtniveau: number | null;
  geschosseOberirdisch: number | null;
  geschosseUnterirdisch: number | null;
  bruttoGrundflaeche: number | null;
  groessterBrandabschnitt: number | null;
  nutzungsarten: string[];
  personenGesamt: number | null;
  risikoklasse: string | null;
  hatKeller: boolean;
}

/**
 * Istwerte aus dem Projekt, je Anforderungs-ID. Fehlt ein Eintrag, gilt der
 * Istwert als nicht erhoben.
 */
export type IstWerte = Record<string, string | number | boolean | null>;

/** Als Abweichung dokumentierte Anforderungen, je Anforderungs-ID. */
export type AbweichungsIndex = Record<string, { begruendung: string; freigegeben: boolean }>;

export interface EngineEingabe {
  ausgabe: Ausgabestand;
  bundesland: Bundesland;
  kontext: EngineKontext;
  gebaeudeklassenEingabe: GebaeudeklassenEingabe;
  istWerte: IstWerte;
  abweichungen: AbweichungsIndex;
}

/* ==========================================================================
 * Vergleichslogik
 * ======================================================================= */

/**
 * Rangfolge der Feuerwiderstandsklassen für den Soll-/Ist-Vergleich.
 * Höherer Rang bedeutet höhere Widerstandsdauer.
 */
const FW_RANG: Record<string, number> = {
  keine: 0,
  'E30-C': 25,
  R30: 30,
  EI30: 30,
  'EI2-30-C': 30,
  'EI30-S': 32,
  REI30: 35,
  R60: 60,
  EI60: 60,
  'EI2-60-C': 60,
  REI60: 65,
  R90: 90,
  EI90: 90,
  'EI2-90-C': 90,
  'EI90-S': 92,
  REI90: 95,
  R120: 120,
  REI120: 120,
  REI180: 180,
};

/** Ordnet eine Feuerwiderstandsklasse ihrem Rang zu; unbekannt ergibt -1. */
export function fwRang(klasse: unknown): number {
  if (typeof klasse !== 'string') return -1;
  return FW_RANG[klasse] ?? -1;
}

/**
 * Vergleicht Ist gegen Soll je nach Sollart.
 * Liefert null, wenn kein Istwert vorliegt.
 */
function vergleicheWerte(
  anforderung: Anforderung,
  soll: unknown,
  ist: unknown,
): boolean | null {
  if (ist === null || ist === undefined || ist === '') return null;

  switch (anforderung.sollArt) {
    case 'feuerwiderstand': {
      const rSoll = fwRang(soll);
      const rIst = fwRang(ist);
      // Unbekannte Klassen sind kein stilles „erfüllt".
      if (rSoll < 0 || rIst < 0) return null;
      return rIst >= rSoll;
    }

    case 'laenge':
    case 'flaeche':
      // Hier ist der Sollwert eine Obergrenze.
      return Number(ist) <= Number(soll);

    case 'breite':
    case 'menge':
      // Hier ist der Sollwert eine Untergrenze.
      return Number(ist) >= Number(soll);

    case 'ja-nein':
      return Boolean(ist) === Boolean(soll);

    case 'text':
      // Qualitative Anforderungen kann die Engine nicht bewerten.
      return null;

    default:
      return null;
  }
}

/** Formuliert die Begründung eines Ergebnisses im Klartext. */
function begruende(
  anforderung: Anforderung,
  status: ErgebnisStatus,
  soll: unknown,
  ist: unknown,
  einheit: string,
): string {
  const sollText = `${soll}${einheit}`;
  const istText = ist === null || ist === '' ? 'nicht erhoben' : `${ist}${einheit}`;

  switch (status) {
    case 'erfuellt':
      if (anforderung.sollArt === 'ja-nein') return 'Gefordert und vorhanden.';
      return `Gefordert ${sollText}, vorhanden ${istText}.`;

    case 'nicht-erfuellt':
      if (anforderung.sollArt === 'ja-nein')
        return 'Gefordert, jedoch nicht vorhanden.';
      if (anforderung.sollArt === 'laenge' || anforderung.sollArt === 'flaeche')
        return `Zulässig höchstens ${sollText}, vorhanden ${istText}.`;
      return `Erforderlich mindestens ${sollText}, vorhanden ${istText}.`;

    case 'abweichung':
      return `Anforderung ${sollText} wird nicht eingehalten (${istText}); als Abweichung dokumentiert und zu kompensieren.`;

    case 'datenluecke':
      return `Erforderlich ${sollText}. Der Istwert ist nicht erhoben, eine Beurteilung ist nicht möglich.`;

    case 'konflikt':
      return 'Mehrere Regeln liefern widersprüchliche Sollwerte. Fachliche Klärung erforderlich.';

    case 'nicht-anwendbar':
      return 'Die Anforderung ist auf dieses Bauwerk nicht anwendbar.';

    default:
      return '';
  }
}

/** Ampelfarbe nach PRD 12.3 anhand des Status. */
function ampelFuer(status: ErgebnisStatus): Ampel {
  switch (status) {
    case 'erfuellt':
    case 'nicht-erfuellt':
      // Deterministisch aus der Engine belegt.
      return 'gruen';
    case 'datenluecke':
      return 'gelb';
    case 'abweichung':
    case 'konflikt':
      // Auslegungsfrage — zwingend Sachverständigenprüfung.
      return 'rot';
    case 'nicht-anwendbar':
      return 'gruen';
    default:
      return 'gelb';
  }
}

/* ==========================================================================
 * Overlay-Anwendung
 * ======================================================================= */

interface OverlayWirkungErgebnis {
  entfaellt: boolean;
  soll: unknown;
  vermerk?: AnforderungsErgebnis['overlay'];
}

function wendeOverlaysAn(
  anforderung: Anforderung,
  basisSoll: unknown,
  overlays: Overlay[],
  kontext: EngineKontext,
): OverlayWirkungErgebnis {
  const passend = overlays.filter((o) => o.anforderungId === anforderung.id);

  for (const o of passend) {
    if (
      o.bedingung !== undefined &&
      !trifftZu(o.bedingung, kontext as unknown as LogicKontext)
    ) {
      continue;
    }

    if (o.wirkung === 'entfaellt') {
      return {
        entfaellt: true,
        soll: basisSoll,
        vermerk: {
          bundesland: o.bundesland,
          wirkung: o.wirkung,
          hinweis: o.hinweis,
          quelle: o.quelle,
        },
      };
    }

    if (o.wirkung === 'ersetzt' && o.soll !== undefined) {
      return {
        entfaellt: false,
        soll: evaluiere(o.soll, kontext as unknown as LogicKontext),
        vermerk: {
          bundesland: o.bundesland,
          wirkung: o.wirkung,
          hinweis: o.hinweis,
          quelle: o.quelle,
        },
      };
    }

    if (o.wirkung === 'ergaenzt') {
      return {
        entfaellt: false,
        soll: basisSoll,
        vermerk: {
          bundesland: o.bundesland,
          wirkung: o.wirkung,
          hinweis: o.hinweis,
          quelle: o.quelle,
        },
      };
    }
  }

  return { entfaellt: false, soll: basisSoll };
}

/* ==========================================================================
 * Hauptauswertung
 * ======================================================================= */

/** Prüft, welche der benötigten Kontextfelder fehlen. */
function fehlendeFelder(anforderung: Anforderung, kontext: EngineKontext): string[] {
  if (!anforderung.benoetigt) return [];
  const flach = kontext as unknown as Record<string, unknown>;
  return anforderung.benoetigt.filter((feld) => {
    const wert = flach[feld];
    if (wert === null || wert === undefined || wert === '') return true;
    if (Array.isArray(wert) && wert.length === 0) return true;
    return false;
  });
}

/**
 * Wertet die vollständige Anforderungsmatrix aus.
 * Laufzeit liegt deutlich unter der Zielvorgabe NFR-1 (< 2 s).
 */
export function werteMatrixAus(eingabe: EngineEingabe): MatrixErgebnis {
  const { ausgabe, bundesland, kontext, istWerte, abweichungen } = eingabe;

  const gebaeudeklasse = ermittleGebaeudeklasse(eingabe.gebaeudeklassenEingabe);

  // Die berechnete Klasse ist maßgeblich — nicht ein eingegebener Wert.
  const auswertungsKontext: EngineKontext = {
    ...kontext,
    gebaeudeklasse: gebaeudeklasse.klasse,
  };

  const overlays = overlaysFuer(bundesland);
  const anforderungen = anforderungenFuer(ausgabe);
  const ergebnisse: AnforderungsErgebnis[] = [];

  // Konfliktprüfung nur innerhalb ausdrücklich benannter Gruppen einander
  // ausschließender Varianten (FR-2.7). Greifen zwei Varianten derselben
  // Gruppe gleichzeitig, widersprechen sich die Regeldaten.
  const gruppenTreffer = new Map<string, { id: string; soll: string }[]>();

  for (const a of anforderungen) {
    let greift: boolean;
    try {
      greift = trifftZu(a.bedingung, auswertungsKontext as unknown as LogicKontext);
    } catch {
      // Fehlerhafter Regelausdruck: als Konflikt ausgeben statt zu scheitern.
      ergebnisse.push({
        anforderungId: a.id,
        bauteil: a.bauteil,
        geschosslage: a.geschosslage,
        bezeichnung: a.bezeichnung,
        sollArt: a.sollArt,
        sollWert: null,
        istWert: null,
        status: 'konflikt',
        ampel: 'rot',
        quelle: a.quelle,
        begruendung:
          'Der hinterlegte Regelausdruck ist fehlerhaft und konnte nicht ausgewertet werden. Die Regelpflege ist zu prüfen.',
      });
      continue;
    }

    if (!greift) continue;

    const fehlend = fehlendeFelder(a, auswertungsKontext);
    const basisSoll = evaluiere(a.soll, auswertungsKontext as unknown as LogicKontext);
    const overlay = wendeOverlaysAn(a, basisSoll, overlays, auswertungsKontext);

    if (overlay.entfaellt) {
      ergebnisse.push({
        anforderungId: a.id,
        bauteil: a.bauteil,
        geschosslage: a.geschosslage,
        bezeichnung: a.bezeichnung,
        sollArt: a.sollArt,
        sollWert: null,
        istWert: null,
        status: 'nicht-anwendbar',
        ampel: 'gruen',
        quelle: a.quelle,
        overlay: overlay.vermerk,
        begruendung: `Die Anforderung entfällt aufgrund landesrechtlicher Regelung. ${overlay.vermerk?.hinweis ?? ''}`.trim(),
      });
      continue;
    }

    const soll = overlay.soll;
    const einheit = a.einheit ? ` ${a.einheit}` : '';

    if (a.konfliktgruppe) {
      const treffer = gruppenTreffer.get(a.konfliktgruppe) ?? [];
      treffer.push({ id: a.id, soll: String(soll) });
      gruppenTreffer.set(a.konfliktgruppe, treffer);
    }

    const ist = istWerte[a.id] ?? null;
    const abweichung = abweichungen[a.id];

    let status: ErgebnisStatus;
    if (fehlend.length > 0) {
      status = 'datenluecke';
    } else {
      const erfuellt = vergleicheWerte(a, soll, ist);
      if (erfuellt === null) {
        status = 'datenluecke';
      } else if (erfuellt) {
        status = 'erfuellt';
      } else {
        status = abweichung ? 'abweichung' : 'nicht-erfuellt';
      }
    }

    ergebnisse.push({
      anforderungId: a.id,
      bauteil: a.bauteil,
      geschosslage: a.geschosslage,
      bezeichnung: a.bezeichnung,
      sollArt: a.sollArt,
      sollWert: soll as string | number | boolean | null,
      istWert: ist,
      einheit: a.einheit,
      status,
      ampel: ampelFuer(status),
      quelle: a.quelle,
      overlay: overlay.vermerk,
      fehlendeAngaben: fehlend.length > 0 ? fehlend : undefined,
      begruendung: begruende(a, status, soll, ist, einheit),
    });
  }

  // Konflikte nachtragen: Mehrere Varianten derselben Gruppe haben gleichzeitig
  // gegriffen und liefern unterschiedliche Sollwerte.
  for (const [gruppe, treffer] of gruppenTreffer) {
    const werte = new Set(treffer.map((t) => t.soll));
    if (treffer.length <= 1 || werte.size <= 1) continue;

    const betroffen = new Set(treffer.map((t) => t.id));
    for (const e of ergebnisse) {
      if (!betroffen.has(e.anforderungId)) continue;
      e.status = 'konflikt';
      e.ampel = 'rot';
      e.begruendung = `Mehrere einander ausschließende Regelvarianten der Gruppe „${gruppe}" greifen gleichzeitig und liefern unterschiedliche Sollwerte (${[...werte].join(', ')}). Die Regeldaten sind zu bereinigen.`;
    }
  }

  return {
    gebaeudeklasse,
    ergebnisse,
    datenluecken: ergebnisse.filter((e) => e.status === 'datenluecke'),
    konflikte: ergebnisse.filter((e) => e.status === 'konflikt'),
    ausgabe,
    bundesland,
    ausgewertetAm: new Date().toISOString(),
  };
}

/* ==========================================================================
 * Kennzahlen
 * ======================================================================= */

export interface MatrixKennzahlen {
  gesamt: number;
  erfuellt: number;
  nichtErfuellt: number;
  abweichung: number;
  datenluecke: number;
  konflikt: number;
  nichtAnwendbar: number;
  /** Anteil beurteilter Anforderungen in Prozent. */
  beurteilungsgrad: number;
}

export function matrixKennzahlen(ergebnis: MatrixErgebnis): MatrixKennzahlen {
  const e = ergebnis.ergebnisse;
  const zaehle = (s: ErgebnisStatus) => e.filter((x) => x.status === s).length;

  const beurteilbar = e.filter((x) => x.status !== 'nicht-anwendbar').length;
  const beurteilt = e.filter(
    (x) =>
      x.status === 'erfuellt' ||
      x.status === 'nicht-erfuellt' ||
      x.status === 'abweichung',
  ).length;

  return {
    gesamt: e.length,
    erfuellt: zaehle('erfuellt'),
    nichtErfuellt: zaehle('nicht-erfuellt'),
    abweichung: zaehle('abweichung'),
    datenluecke: zaehle('datenluecke'),
    konflikt: zaehle('konflikt'),
    nichtAnwendbar: zaehle('nicht-anwendbar'),
    beurteilungsgrad:
      beurteilbar === 0 ? 0 : Math.round((beurteilt / beurteilbar) * 100),
  };
}
