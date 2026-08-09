/**
 * Orchestrierung der Fahrzeugbewertung.
 *
 * Hier laufen alle Engines in der einzig möglichen Reihenfolge zusammen — die
 * Abhängigkeiten sind nicht beliebig:
 *
 *   Text → Risiken → Momentum → Marktwert → Integrity → Evidence
 *        → Asset → Quality → Red Flags → Gesamtbewertung → Buy Signal
 *
 * Der Marktwert braucht den offenen Instandsetzungsbedarf, der Integrity Score
 * braucht den Marktwert (Preisplausibilität), das Buy Signal braucht alles.
 * Diese Datei hält die Reihenfolge an einer Stelle fest, statt sie über die
 * Oberfläche zu verstreuen.
 *
 * Das Ergebnis ist ein vollständiges Bewertungsobjekt je Fahrzeug. Es ist rein
 * abgeleitet: kein Zustand, keine Seiteneffekte, aus denselben Eingaben immer
 * dasselbe Ergebnis. Genau das macht es prüfbar (Abschnitt 38).
 */

import type {
  Aenderung,
  Fahrzeug,
  Inserat,
  InseratDaten,
  Plattform,
  Verkaeufer,
} from '../domain/types';
import { alterJahre as berechneAlterJahre, alterMonate, STICHTAG, tageSeit } from '../domain/format';
import { modell as findeModell, modellBezeichnung, type Modelldefinition } from '../wissen/modelle';
import { passendeReihe, type Marktreihe } from '../wissen/marktdaten';
import { pruefliste, verkaeuferanfrage, type Anfragepunkt, type Pruefpunkt } from '../wissen/pruefkatalog';

import { analysiereText, type Textanalyse } from './text';
import { analysiereRisiken, type Risikoanalyse } from './risikoanalyse';
import { momentum as rechneMomentum, type Momentumergebnis } from './momentum';
import { bewerteMarkt, type Marktbewertung } from './bewertung';
import { bewerteIntegritaet } from './integritaet';
import { bewerteEvidenz, type Evidenzergebnis } from './evidenz';
import { bewerteAsset, type Assetergebnis } from './asset';
import { bewerteQualitaet } from './qualitaet';
import {
  erkenneRedFlags,
  findeFremdverwendeteBilder,
  type RedFlag,
} from './redflags';
import { bewerteGesamt, pruefeBuySignal, type BuySignal, type Gesamtbewertung } from './buysignal';
import { pruefeFirmenwagen, type Firmenwagenpruefung } from './firmenwagen';
import {
  rechneRestauration,
  schlageZustandVor,
  type Restaurationsrechnung,
  type Zustandserfassung,
} from './restauration';
import {
  historienkennzahlen,
  inseratHistorie,
  letzteBeobachtung,
  type Historienkennzahlen,
} from './historie';
import { konsolidiere, type Feldkonsolidierung } from './datenqualitaet';
import type { Score } from './erklaerung';
import type { Systemparameter } from './gewichte';

export interface Analysekontext {
  plattformen: Plattform[];
  verkaeufer: Verkaeufer[];
  /** Alle Inserate im Bestand — für den fahrzeugübergreifenden Bildabgleich. */
  alleInserate: Inserat[];
  parameter: Systemparameter;
  stichtag?: string;
  /** Manuell erfasste Zustandsstufen für die Restaurationsrechnung. */
  zustand?: Zustandserfassung[];
}

export interface Fahrzeuganalyse {
  fahrzeugId: string;
  bezeichnung: string;
  modell: Modelldefinition | undefined;
  /** Das führende Inserat: das aktive mit der jüngsten Beobachtung. */
  hauptinserat: Inserat;
  inserate: Inserat[];
  aktuell: InseratDaten;
  verkaeufer: Verkaeufer | undefined;
  plattform: Plattform | undefined;

  baujahr: number | null;
  alterJahre: number | null;
  alterMonate: number | null;
  angebotsdauerTage: number;

  aenderungen: Aenderung[];
  historie: Historienkennzahlen;
  felder: Feldkonsolidierung[];

  text: Textanalyse;
  risiken: Risikoanalyse;
  reihe: Marktreihe | undefined;
  momentum: Momentumergebnis | null;
  bewertung: Marktbewertung;

  integritaet: Score;
  evidenz: Evidenzergebnis;
  asset: Assetergebnis;
  qualitaet: Score;

  redFlags: RedFlag[];
  gesamt: Gesamtbewertung;
  buySignal: BuySignal;
  firmenwagen: Firmenwagenpruefung;

  zustandsvorschlag: Zustandserfassung[];
  restauration: Restaurationsrechnung;

  pruefpunkte: Pruefpunkt[];
  anfragepunkte: Anfragepunkt[];
}

/** Wählt das führende Inserat: aktiv vor inaktiv, dann jüngste Beobachtung. */
export function hauptinserat(inserate: Inserat[]): Inserat {
  const sortiert = [...inserate].sort((a, b) => {
    if (a.aktiv !== b.aktiv) return a.aktiv ? -1 : 1;
    return Date.parse(b.zuletztGesehen) - Date.parse(a.zuletztGesehen);
  });
  return sortiert[0];
}

export function analysiereFahrzeug(
  fahrzeug: Fahrzeug,
  inserate: Inserat[],
  kontext: Analysekontext,
): Fahrzeuganalyse | null {
  if (inserate.length === 0) return null;

  const stichtag = kontext.stichtag ?? STICHTAG;
  const haupt = hauptinserat(inserate);
  const aktuell = letzteBeobachtung(haupt).daten;

  const modell = findeModell(fahrzeug.modellId);
  const verkaeufer = kontext.verkaeufer.find((v) => v.id === haupt.verkaeuferId);
  const plattform = kontext.plattformen.find((p) => p.id === haupt.plattformId);

  const baujahr =
    aktuell.produktionsjahr ??
    (aktuell.erstzulassung ? Number.parseInt(aktuell.erstzulassung.slice(0, 4), 10) : null);
  const jahre = berechneAlterJahre(aktuell.erstzulassung, stichtag);
  const monate = alterMonate(aktuell.erstzulassung, stichtag);
  // Wie lange das Fahrzeug insgesamt am Markt ist: gerechnet ab der ersten
  // Entdeckung irgendeines seiner Inserate, nicht ab dem jüngsten.
  const angebotsdauerTage = Math.max(
    0,
    ...inserate.map((i) => tageSeit(i.erstEntdeckt, stichtag)),
  );

  /* -- Historie und Datenqualität --------------------------------------- */
  const aenderungen = inserate
    .flatMap(inseratHistorie)
    .sort((a, b) => Date.parse(b.zeitpunkt) - Date.parse(a.zeitpunkt));
  const historie = historienkennzahlen(inserate, stichtag);
  const felder = konsolidiere(
    inserate,
    kontext.plattformen,
    fahrzeug.dokumente,
    fahrzeug.nutzerbefunde,
  );

  /* -- Text und Risiken -------------------------------------------------- */
  const text = analysiereText(aktuell);
  const risiken = analysiereRisiken(fahrzeug.modellId, aktuell, fahrzeug.dokumente, baujahr);

  /* -- Markt -------------------------------------------------------------- */
  const reihe = passendeReihe(
    fahrzeug.modellId,
    aktuell.getriebe,
    `${aktuell.variante} ${aktuell.titel}`,
  );
  const momentum = reihe ? rechneMomentum(reihe, kontext.parameter.momentum) : null;

  const bewertung = bewerteMarkt({
    daten: aktuell,
    modell,
    reihe,
    trendProzent: momentum?.trendProzent ?? 0,
    angebotsdauerTage,
    baujahr,
    tuningErkannt: text.befunde.some((b) => b.musterId === 'tuning'),
    offenerInstandsetzungsbedarf: risiken.offenerBedarf,
  });

  /* -- Bildabgleich über Fahrzeuggrenzen hinweg -------------------------- */
  const fremdverwendeteBilder = findeFremdverwendeteBilder(
    haupt,
    kontext.alleInserate,
    fahrzeug.id,
    kontext.parameter.identitaet.bildHashSchwelle,
  );

  /* -- Scores -------------------------------------------------------------- */
  const integritaet = bewerteIntegritaet({
    daten: aktuell,
    verkaeufer,
    plattform,
    historie,
    text,
    bewertung,
    felder,
    dokumente: fahrzeug.dokumente,
    alterJahre: jahre,
    fremdverwendeteBilder: fremdverwendeteBilder.length,
    gewichte: kontext.parameter.integritaet,
  });

  const evidenz = bewerteEvidenz({
    daten: aktuell,
    behauptungen: text.behauptungen,
    dokumente: fahrzeug.dokumente,
    kilometerstand: aktuell.kilometerstand,
    gewichte: kontext.parameter.evidenz,
  });

  const asset = bewerteAsset(modell, kontext.parameter.asset, momentum, reihe);

  const qualitaet = bewerteQualitaet({
    daten: aktuell,
    modell,
    reihe,
    risiken,
    text,
    dokumente: fahrzeug.dokumente,
    alterJahre: jahre,
    gewichte: kontext.parameter.qualitaet,
  });

  /* -- Red Flags, Gesamtbewertung, Signale -------------------------------- */
  const redFlags = erkenneRedFlags({
    inserate,
    aktuell,
    historie,
    bewertung,
    felder,
    modell,
    fremdverwendeteBilder,
    stichtag,
    alterJahre: jahre,
  });

  const gesamt = bewerteGesamt(
    integritaet,
    evidenz.score,
    asset.score,
    qualitaet,
    bewertung,
    redFlags,
    kontext.parameter,
  );

  const buySignal = pruefeBuySignal(
    integritaet,
    evidenz.score,
    asset.score,
    qualitaet,
    bewertung,
    redFlags,
    kontext.parameter,
  );

  const firmenwagen = pruefeFirmenwagen({
    daten: aktuell,
    modell,
    alterMonate: monate,
    assetScore: asset.score.wert,
    integrityScore: integritaet.wert,
    kritischeRisiken: risiken.kritischOffen.length,
    parameter: kontext.parameter.firmenwagen,
  });

  /* -- Restauration -------------------------------------------------------- */
  const zustandsvorschlag = schlageZustandVor(aktuell, risiken, jahre);
  const restauration = rechneRestauration({
    kaufpreis: aktuell.preis,
    zustand: kontext.zustand ?? zustandsvorschlag,
    hersteller: aktuell.hersteller,
    reihe,
    bewertung,
    kilometerstand: aktuell.kilometerstand,
  });

  return {
    fahrzeugId: fahrzeug.id,
    bezeichnung: fahrzeug.modellId
      ? modellBezeichnung(fahrzeug.modellId)
      : `${aktuell.hersteller} ${aktuell.modell} ${aktuell.baureihe}`.trim(),
    modell,
    hauptinserat: haupt,
    inserate,
    aktuell,
    verkaeufer,
    plattform,
    baujahr,
    alterJahre: jahre,
    alterMonate: monate,
    angebotsdauerTage,
    aenderungen,
    historie,
    felder,
    text,
    risiken,
    reihe,
    momentum,
    bewertung,
    integritaet,
    evidenz,
    asset,
    qualitaet,
    redFlags,
    gesamt,
    buySignal,
    firmenwagen,
    zustandsvorschlag,
    restauration,
    pruefpunkte: pruefliste(
      fahrzeug.modellId,
      baujahr,
      aktuell.kilometerstand,
      aktuell.getriebe,
    ),
    anfragepunkte: verkaeuferanfrage(
      fahrzeug.modellId,
      baujahr,
      aktuell.kilometerstand,
      aktuell.getriebe,
    ),
  };
}

/** Analysiert alle Fahrzeuge eines Bestandes. */
export function analysiereBestand(
  fahrzeuge: Fahrzeug[],
  inserate: Inserat[],
  kontext: Analysekontext,
): Fahrzeuganalyse[] {
  return fahrzeuge
    .map((f) =>
      analysiereFahrzeug(
        f,
        inserate.filter((i) => i.fahrzeugId === f.id),
        kontext,
      ),
    )
    .filter((a): a is Fahrzeuganalyse => a !== null)
    .sort((a, b) => b.gesamt.wert - a.gesamt.wert);
}
