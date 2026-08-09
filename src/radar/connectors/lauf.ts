/**
 * Collector-Lauf — die Kette aus PRD Abschnitten 9, 10, 11 und 33.
 *
 *     search() → normalize() → Beobachtung anlegen → Identität zuordnen
 *
 * Vier Entscheidungen prägen den Ablauf:
 *
 * 1. **Eine Beobachtung wird nur bei Änderung gespeichert.** Ein unverändertes
 *    Inserat erhöht `zuletztGesehen` und sonst nichts. Dreißig identische Zeilen
 *    wären keine Historie, sondern Rauschen — und würden die
 *    Änderungserkennung in Abschnitt 11 verwässern.
 *
 * 2. **Zugeordnet wird nur oberhalb der automatischen Schwelle.** Grenzfälle
 *    bekommen eine eigene Fahrzeugakte und werden zur manuellen Prüfung
 *    ausgewiesen (Abschnitt 10). Eine falsche Zusammenführung erzeugt eine
 *    erfundene Historie; das wiegt schwerer als eine Akte zu viel.
 *
 * 3. **Verschwundene Inserate werden nicht gelöscht.** Sie werden inaktiv
 *    gesetzt — die Beobachtungen bleiben, und ein Wiederauftauchen ist
 *    dadurch als Wiederinserierung erkennbar (Abschnitt 23).
 *
 * 4. **Jede Systementscheidung landet im Audit Trail** (Abschnitt 35), auch
 *    die der Identity Engine: mit Wahrscheinlichkeit und Begründung.
 */

import type {
  Auditeintrag,
  Fahrzeug,
  Fahrzeugereignis,
  Inserat,
  InseratDaten,
  Verkaeufer,
} from '../domain/types';
import { erkenneModell } from '../wissen/modelle';
import { letzteBeobachtung } from '../engine/historie';
import { ordneZu, type Identitaetsvergleich } from '../engine/identitaet';
import type { Systemparameter } from '../engine/gewichte';
import { alsVerkaeuferart, type Connector, type Suchkriterien } from './typen';
import { bilderZu, type DemoSuchkriterien } from './demo-basis';

export interface Bestand {
  fahrzeuge: Fahrzeug[];
  inserate: Inserat[];
  verkaeufer: Verkaeufer[];
  audit: Auditeintrag[];
}

export function leererBestand(): Bestand {
  return { fahrzeuge: [], inserate: [], verkaeufer: [], audit: [] };
}

export interface Grenzfall {
  inseratId: string;
  externeId: string;
  kandidatFahrzeugId: string;
  vergleich: Identitaetsvergleich;
}

export interface Laufergebnis {
  laufId: string;
  zeitpunkt: string;
  bestand: Bestand;
  neueInserate: number;
  neueBeobachtungen: number;
  unveraendert: number;
  neueFahrzeuge: number;
  automatischZugeordnet: number;
  grenzfaelle: Grenzfall[];
  entfernte: number;
  aenderungen: number;
  proPlattform: { plattformId: string; gefunden: number; neu: number; geaendert: number }[];
  /** Inserate, deren Normalisierung unvollständig blieb (Abnahmekriterium 50). */
  unvollstaendig: { externeId: string; fehlend: string[] }[];
}

let laufZaehler = 0;

/** Felder, ohne die ein normalisiertes Inserat nicht brauchbar ist. */
function fehlendePflichtfelder(d: InseratDaten): string[] {
  const fehlend: string[] = [];
  if (!d.hersteller) fehlend.push('hersteller');
  if (!d.modell) fehlend.push('modell');
  if (d.preis <= 0) fehlend.push('preis');
  if (!d.titel) fehlend.push('titel');
  if (d.erstzulassung === null) fehlend.push('erstzulassung');
  if (d.kilometerstand === null) fehlend.push('kilometerstand');
  return fehlend;
}

function audit(
  bestand: Bestand,
  eintrag: Omit<Auditeintrag, 'id' | 'benutzer'> & { benutzer?: string },
): void {
  bestand.audit.push({
    id: `audit-${bestand.audit.length + 1}`,
    benutzer: eintrag.benutzer ?? 'System (Collector)',
    ...eintrag,
  });
}

function ereignis(
  fahrzeug: Fahrzeug,
  eintrag: Omit<Fahrzeugereignis, 'id'>,
): void {
  fahrzeug.ereignisse.push({
    id: `ev-${fahrzeug.id}-${fahrzeug.ereignisse.length + 1}`,
    ...eintrag,
  });
}

/**
 * Legt einen Verkäufer an oder aktualisiert ihn.
 *
 * Nach PRD Abschnitt 36 werden nur die Daten gespeichert, die für den
 * Nutzungszweck erforderlich sind: Name, Art, Ort, Land und die Kennzahlen zur
 * Verkäufertransparenz. Kontaktdaten werden ausdrücklich nicht übernommen.
 */
async function verkaeuferAus(
  connector: Connector,
  externeId: string,
  bestand: Bestand,
  fallbackName: string,
): Promise<Verkaeufer> {
  const roh = await connector.getSeller(externeId);
  const id = roh ? `${connector.plattform.id}:${roh.externeId}` : `${connector.plattform.id}:unbekannt`;

  const vorhanden = bestand.verkaeufer.find((v) => v.id === id);
  if (vorhanden) return vorhanden;

  const neu: Verkaeufer = {
    id,
    art: roh ? alsVerkaeuferart(roh.art) : 'unbekannt',
    name: roh?.name ?? fallbackName,
    ort: roh?.ort ?? '',
    land: roh?.land ?? '',
    identitaetBelegt: roh?.identitaetBelegt ?? false,
    seitJahr: roh?.seitJahr ?? null,
    bewertung: roh?.bewertung ?? null,
    anzahlInserate: roh?.anzahlInserate ?? 1,
  };
  bestand.verkaeufer.push(neu);
  return neu;
}

export interface Laufoptionen {
  kriterien: Suchkriterien;
  parameter: Systemparameter;
  /** Zeitpunkt des Laufs. Steuert im Demobetrieb auch den gelieferten Stand. */
  zeitpunkt: string;
}

export async function fuehreLaufAus(
  connectoren: Connector[],
  bestand: Bestand,
  optionen: Laufoptionen,
): Promise<Laufergebnis> {
  laufZaehler += 1;
  const laufId = `lauf-${laufZaehler}`;
  const { zeitpunkt, parameter } = optionen;

  const ergebnis: Laufergebnis = {
    laufId,
    zeitpunkt,
    bestand,
    neueInserate: 0,
    neueBeobachtungen: 0,
    unveraendert: 0,
    neueFahrzeuge: 0,
    automatischZugeordnet: 0,
    grenzfaelle: [],
    entfernte: 0,
    aenderungen: 0,
    proPlattform: [],
    unvollstaendig: [],
  };

  for (const connector of connectoren) {
    const kriterien: DemoSuchkriterien = { ...optionen.kriterien, stand: zeitpunkt };
    const roheInserate = await connector.search(kriterien);
    const plattformStatistik = {
      plattformId: connector.plattform.id,
      gefunden: roheInserate.length,
      neu: 0,
      geaendert: 0,
    };

    const gesehen = new Set<string>();

    for (const roh of roheInserate) {
      gesehen.add(roh.externeId);
      const bilder = bilderZu(connector.plattform.id, roh.externeId, zeitpunkt);
      const daten = connector.normalize(roh, bilder);

      const fehlend = fehlendePflichtfelder(daten);
      if (fehlend.length > 0) {
        ergebnis.unvollstaendig.push({ externeId: roh.externeId, fehlend });
      }

      const inseratId = `${connector.plattform.id}:${roh.externeId}`;
      const vorhanden = bestand.inserate.find((i) => i.id === inseratId);

      if (vorhanden) {
        const alt = letzteBeobachtung(vorhanden).daten;
        const aenderungen = connector.detectChanges(alt, daten, zeitpunkt);

        vorhanden.zuletztGesehen = zeitpunkt;
        if (!vorhanden.aktiv) {
          // Wiederauftauchen nach Entfernung — der Fall aus Abschnitt 23.
          vorhanden.aktiv = true;
          vorhanden.entferntAm = null;
          const fahrzeug = bestand.fahrzeuge.find((f) => f.id === vorhanden.fahrzeugId);
          if (fahrzeug) {
            ereignis(fahrzeug, {
              zeitpunkt,
              art: 'wiederinserierung',
              text: `Inserat ${vorhanden.externeId} auf ${connector.plattform.name} ist wieder online.`,
              inseratId: vorhanden.id,
              vorher: 'entfernt',
              nachher: 'aktiv',
            });
          }
        }

        if (aenderungen.length === 0) {
          ergebnis.unveraendert += 1;
          continue;
        }

        vorhanden.beobachtungen.push({
          id: `${vorhanden.id}:beob-${vorhanden.beobachtungen.length + 1}`,
          zeitpunkt,
          laufId,
          daten,
        });
        ergebnis.neueBeobachtungen += 1;
        ergebnis.aenderungen += aenderungen.length;
        plattformStatistik.geaendert += 1;

        const fahrzeug = bestand.fahrzeuge.find((f) => f.id === vorhanden.fahrzeugId);
        for (const a of aenderungen) {
          audit(bestand, {
            zeitpunkt,
            quelle: connector.plattform.name,
            objekt: `Inserat ${vorhanden.externeId}`,
            feld: a.bezeichnung,
            vorher: a.vorher,
            nachher: a.nachher,
            systementscheidung: 'Neue Beobachtung gespeichert',
            scoreaenderung: null,
          });
          if (fahrzeug) {
            ereignis(fahrzeug, {
              zeitpunkt,
              art:
                a.art === 'preis'
                  ? 'preisaenderung'
                  : a.art === 'kilometer'
                    ? 'kilometeraenderung'
                    : a.art === 'verkaeufer'
                      ? 'verkaeuferwechsel'
                      : a.art === 'standort'
                        ? 'standortwechsel'
                        : a.art === 'fotos'
                          ? 'fotoaenderung'
                          : a.art === 'angabe-entfernt'
                            ? 'angabe-entfernt'
                            : a.art === 'angabe-ergaenzt'
                              ? 'angabe-ergaenzt'
                              : 'textaenderung',
              text: `${a.bezeichnung}: ${a.vorher ?? '—'} → ${a.nachher ?? '—'}`,
              inseratId: vorhanden.id,
              vorher: a.vorher,
              nachher: a.nachher,
            });
          }
        }
        continue;
      }

      /* -- Neues Inserat ------------------------------------------------- */
      const verkaeufer = await verkaeuferAus(
        connector,
        roh.externeId,
        bestand,
        daten.verkaeuferName,
      );

      const inserat: Inserat = {
        id: inseratId,
        plattformId: connector.plattform.id,
        externeId: roh.externeId,
        url: roh.url,
        verkaeuferId: verkaeufer.id,
        fahrzeugId: null,
        erstEntdeckt: zeitpunkt,
        zuletztGesehen: zeitpunkt,
        aktiv: true,
        entferntAm: null,
        beobachtungen: [
          { id: `${inseratId}:beob-1`, zeitpunkt, laufId, daten },
        ],
      };

      /* -- Identitätszuordnung (Abschnitt 10) ---------------------------- */
      const kandidatenbestand = bestand.inserate
        .filter((i) => i.fahrzeugId !== null)
        .map((i) => ({
          fahrzeugId: i.fahrzeugId as string,
          inseratId: i.id,
          daten: letzteBeobachtung(i).daten,
          zeitpunkt: letzteBeobachtung(i).zeitpunkt,
        }));

      const zuordnung = ordneZu(daten, zeitpunkt, kandidatenbestand, {
        bildHashSchwelle: parameter.identitaet.bildHashSchwelle,
        schwelleAutomatisch: parameter.identitaet.schwelleAutomatisch,
        schwelleManuell: parameter.identitaet.schwelleManuell,
      });

      let fahrzeug: Fahrzeug;
      if (zuordnung.fahrzeugId !== null) {
        fahrzeug = bestand.fahrzeuge.find((f) => f.id === zuordnung.fahrzeugId) as Fahrzeug;
        fahrzeug.inseratIds.push(inserat.id);
        inserat.fahrzeugId = fahrzeug.id;
        ergebnis.automatischZugeordnet += 1;

        audit(bestand, {
          zeitpunkt,
          quelle: 'Vehicle Identity Engine',
          objekt: `Inserat ${inserat.externeId}`,
          feld: 'Fahrzeugzuordnung',
          vorher: null,
          nachher: fahrzeug.id,
          systementscheidung: zuordnung.bester?.vergleich.begruendung ?? null,
          scoreaenderung: null,
        });
        ereignis(fahrzeug, {
          zeitpunkt,
          art: 'inserat-zugeordnet',
          text: `Weiteres Inserat auf ${connector.plattform.name} erkannt (${zuordnung.bester?.vergleich.score} % Übereinstimmung).`,
          inseratId: inserat.id,
          vorher: null,
          nachher: inserat.externeId,
        });
      } else {
        const modell = erkenneModell(
          daten.hersteller,
          `${daten.titel} ${daten.modell} ${daten.baureihe} ${daten.variante}`,
        );
        fahrzeug = {
          id: `fzg-${bestand.fahrzeuge.length + 1}`,
          modellId: modell?.id ?? null,
          kennungen: daten.vin
            ? [
                {
                  art: 'vin',
                  wert: daten.vin,
                  quelle: connector.plattform.name,
                  zeitpunkt,
                },
              ]
            : [],
          inseratIds: [inserat.id],
          angelegtAm: zeitpunkt,
          dokumente: [],
          ereignisse: [],
          notizen: [],
          nutzerbefunde: [],
        };
        inserat.fahrzeugId = fahrzeug.id;
        bestand.fahrzeuge.push(fahrzeug);
        ergebnis.neueFahrzeuge += 1;

        ereignis(fahrzeug, {
          zeitpunkt,
          art: 'inserat-neu',
          text: `Fahrzeugakte aus Inserat ${inserat.externeId} auf ${connector.plattform.name} angelegt.`,
          inseratId: inserat.id,
          vorher: null,
          nachher: modell?.id ?? 'kein Modell erkannt',
        });
        audit(bestand, {
          zeitpunkt,
          quelle: 'Vehicle Identity Engine',
          objekt: `Inserat ${inserat.externeId}`,
          feld: 'Fahrzeugzuordnung',
          vorher: null,
          nachher: fahrzeug.id,
          systementscheidung:
            zuordnung.entscheidung === 'pruefen'
              ? `Neue Fahrzeugakte trotz Kandidat mit ${zuordnung.bester?.vergleich.score} % — unterhalb der automatischen Schwelle.`
              : 'Neue Fahrzeugakte, kein passender Kandidat gefunden.',
          scoreaenderung: null,
        });
      }

      if (zuordnung.entscheidung === 'pruefen' && zuordnung.bester) {
        ergebnis.grenzfaelle.push({
          inseratId: inserat.id,
          externeId: inserat.externeId,
          kandidatFahrzeugId: zuordnung.bester.fahrzeugId,
          vergleich: zuordnung.bester.vergleich,
        });
      }

      bestand.inserate.push(inserat);
      ergebnis.neueInserate += 1;
      plattformStatistik.neu += 1;
    }

    /* -- Verschwundene Inserate ------------------------------------------ */
    for (const inserat of bestand.inserate) {
      if (inserat.plattformId !== connector.plattform.id) continue;
      if (!inserat.aktiv) continue;
      if (gesehen.has(inserat.externeId)) continue;

      inserat.aktiv = false;
      inserat.entferntAm = zeitpunkt;
      ergebnis.entfernte += 1;

      const fahrzeug = bestand.fahrzeuge.find((f) => f.id === inserat.fahrzeugId);
      if (fahrzeug) {
        ereignis(fahrzeug, {
          zeitpunkt,
          art: 'inserat-entfernt',
          text: `Inserat ${inserat.externeId} auf ${connector.plattform.name} ist nicht mehr auffindbar.`,
          inseratId: inserat.id,
          vorher: 'aktiv',
          nachher: 'entfernt',
        });
      }
      audit(bestand, {
        zeitpunkt,
        quelle: connector.plattform.name,
        objekt: `Inserat ${inserat.externeId}`,
        feld: 'Status',
        vorher: 'aktiv',
        nachher: 'entfernt',
        systementscheidung: 'Inserat im Suchergebnis nicht mehr enthalten — Beobachtungen bleiben erhalten.',
        scoreaenderung: null,
      });
    }

    ergebnis.proPlattform.push(plattformStatistik);
  }

  return ergebnis;
}
