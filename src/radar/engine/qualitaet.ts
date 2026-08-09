/**
 * Individual Vehicle Quality Score — PRD Abschnitt 15.
 *
 * Während der Asset Score fragt „Ist diese Baureihe ein Asset?", fragt dieser
 * Score „Ist dieses Exemplar ein gutes Exemplar?". Er ist damit die Antwort auf
 * das zentrale Produktprinzip aus Abschnitt 55: ein wirklich gutes Fahrzeug von
 * einem lediglich billig oder attraktiv dargestellten Fahrzeug zu unterscheiden.
 *
 * Der Score verwendet ausschließlich Merkmale des konkreten Fahrzeuges, nie
 * Eigenschaften der Baureihe. Wo die Datenlage eine Beurteilung nicht hergibt
 * — etwa beim Innenraumzustand ohne Innenraumbilder —, wird das ausgewiesen
 * und die Komponente konservativ, aber nicht vernichtend bewertet. Ein
 * unbekannter Zustand ist kein schlechter Zustand; er ist ein Prüfauftrag.
 */

import type { Fahrzeugdokument, InseratDaten } from '../domain/types';
import { begrenze } from '../domain/format';
import {
  baueScore,
  komponente,
  standardEinstufung,
  type Beitrag,
  type Score,
} from './erklaerung';
import type { QualitaetKriterium } from './gewichte';
import { QUALITAET_LABEL } from './gewichte';
import type { Modelldefinition } from '../wissen/modelle';
import type { Marktreihe } from '../wissen/marktdaten';
import type { Risikoanalyse } from './risikoanalyse';
import type { Textanalyse } from './text';

const GESUCHTE_FARBEN =
  /(interlagos|laguna|imola|estoril|monte\s?carlo|sepang|misano|nogaro|riviera|speed\s?gelb|arktis|karmin|basalt|nardo)/i;
const HAEUFIGE_FARBEN = /(alpinweiß|silber|titansilber|eisgrau|grau\s?metallic)/i;
const GESUCHTE_INNENFARBEN = /(rot|natur|cognac|sattelbraun|zimt|beige|terrakotta|fuchsrot)/i;

export interface Qualitaetseingang {
  daten: InseratDaten;
  modell: Modelldefinition | undefined;
  reihe: Marktreihe | undefined;
  risiken: Risikoanalyse;
  text: Textanalyse;
  dokumente: Fahrzeugdokument[];
  alterJahre: number | null;
  gewichte: Record<QualitaetKriterium, number>;
}

export function bewerteQualitaet(e: Qualitaetseingang): Score {
  const d = e.daten;
  const g = e.gewichte;
  const hinweise: string[] = [];
  let unbekannteKriterien = 0;

  /* -- Laufleistung ------------------------------------------------------ */
  const kmBeitraege: Beitrag[] = [];
  let kmStart = 60;
  if (d.kilometerstand === null) {
    kmBeitraege.push({ text: 'Kein Kilometerstand angegeben.', delta: -25 });
    unbekannteKriterien++;
  } else {
    kmBeitraege.push({
      text: `${d.kilometerstand.toLocaleString('de-AT')} km.`,
      delta: null,
    });
    // Maßstab ist die Kilometerklasse der Marktreihe: Was der Markt als
    // niedrige Laufleistung behandelt, ist eine niedrige Laufleistung.
    if (e.reihe && e.reihe.nachKilometerklasse.length > 0) {
      const klassen = e.reihe.nachKilometerklasse;
      const index = klassen.findIndex(
        (k) => (d.kilometerstand as number) >= k.von && (k.bis === null || (d.kilometerstand as number) < k.bis),
      );
      if (index >= 0) {
        // Beste Klasse 95 Punkte, jede weitere 18 Punkte weniger.
        kmStart = Math.max(20, 95 - index * 18);
        kmBeitraege.push({
          text: `Kilometerklasse „${klassen[index].label}" — Platz ${index + 1} von ${klassen.length} in der Marktreihe.`,
          delta: null,
        });
      }
    } else if (e.modell) {
      const referenz = e.modell.bewertung.referenzKm;
      kmStart = begrenze(95 - ((d.kilometerstand - referenz * 0.5) / referenz) * 60, 20, 95);
      kmBeitraege.push({
        text: `Gemessen an der Referenzlaufleistung des Modells (${referenz.toLocaleString('de-AT')} km).`,
        delta: null,
      });
    }
    if (e.alterJahre !== null && e.alterJahre > 0) {
      const proJahr = d.kilometerstand / e.alterJahre;
      if (proJahr < 3000) {
        kmBeitraege.push({
          text: `Nur ${Math.round(proJahr).toLocaleString('de-AT')} km pro Jahr — Standschäden sind zu prüfen.`,
          delta: -8,
        });
      }
    }
  }
  const laufleistung = komponente(
    'laufleistung',
    QUALITAET_LABEL.laufleistung,
    g.laufleistung,
    kmStart,
    kmBeitraege,
  );

  /* -- Vorbesitzer ------------------------------------------------------- */
  const vBeitraege: Beitrag[] = [];
  let vStart = 55;
  if (d.vorbesitzer === null) {
    vBeitraege.push({ text: 'Halterzahl nicht angegeben.', delta: null });
    unbekannteKriterien++;
  } else {
    vStart = d.vorbesitzer <= 1 ? 95 : d.vorbesitzer === 2 ? 82 : d.vorbesitzer === 3 ? 68 : 45;
    vBeitraege.push({
      text: `${d.vorbesitzer} Vorbesitzer.`,
      delta: null,
    });
    if (d.vorbesitzer >= 5) {
      vBeitraege.push({
        text: 'Viele Halter bei überschaubarem Alter — kurze Haltedauern und wechselnde Pflege.',
        delta: -10,
      });
    }
  }
  const vorbesitzer = komponente(
    'vorbesitzer',
    QUALITAET_LABEL.vorbesitzer,
    g.vorbesitzer,
    vStart,
    vBeitraege,
  );

  /* -- Originalzustand --------------------------------------------------- */
  const oBeitraege: Beitrag[] = [];
  const tuning = e.text.befunde.some((b) => b.musterId === 'tuning');
  const nichtOriginaleFelgen = d.bilder.some((b) =>
    b.merkmale.some((m) => /felgen:(?!original)/.test(m) && /zubehoer|nachruest/.test(m)),
  );
  if (tuning) {
    oBeitraege.push({
      text: 'Leistungssteigerung oder Softwareänderung im Text erkennbar.',
      delta: -30,
    });
  }
  if (d.umbauten && d.umbauten.trim().length > 0) {
    oBeitraege.push({ text: `Angegebene Umbauten: ${d.umbauten}`, delta: -12 });
  }
  if (nichtOriginaleFelgen) {
    oBeitraege.push({ text: 'Nicht originale Räder erkennbar.', delta: -8 });
  }
  if (!tuning && !d.umbauten) {
    oBeitraege.push({ text: 'Keine Umbauten angegeben oder erkennbar.', delta: 8 });
  }
  const originalzustand = komponente(
    'originalzustand',
    QUALITAET_LABEL.originalzustand,
    g.originalzustand,
    82,
    oBeitraege,
  );

  /* -- Sonderausstattung -------------------------------------------------- */
  const sBeitraege: Beitrag[] = [];
  const wertrelevant = e.modell
    ? Object.keys(e.modell.bewertung.ausstattungsFaktor).filter(
        (k) => d.ausstattung.includes(k) && (e.modell as Modelldefinition).bewertung.ausstattungsFaktor[k] > 1,
      )
    : [];
  sBeitraege.push({
    text: `${d.ausstattung.length} Ausstattungsmerkmale gelistet, davon ${wertrelevant.length} wertrelevant.`,
    delta: null,
  });
  if (wertrelevant.length > 0) {
    sBeitraege.push({
      text: `Wertrelevant: ${wertrelevant.join(', ')}.`,
      delta: Math.min(30, wertrelevant.length * 12),
    });
  }
  if (d.ausstattung.length < 3) {
    sBeitraege.push({
      text: 'Kaum Ausstattungsangaben — Bewertung nur eingeschränkt möglich.',
      delta: -10,
    });
    unbekannteKriterien++;
  }
  const sonderausstattung = komponente(
    'sonderausstattung',
    QUALITAET_LABEL.sonderausstattung,
    g.sonderausstattung,
    55,
    sBeitraege,
  );

  /* -- Farbkombination ---------------------------------------------------- */
  const fBeitraege: Beitrag[] = [];
  let fStart = 60;
  if (d.farbeAussen === null) {
    fBeitraege.push({ text: 'Außenfarbe nicht angegeben.', delta: null });
    unbekannteKriterien++;
  } else if (GESUCHTE_FARBEN.test(d.farbeAussen)) {
    fStart = 90;
    fBeitraege.push({
      text: `${d.farbeAussen} zählt zu den gesuchten Farben des Segments.`,
      delta: null,
    });
  } else if (HAEUFIGE_FARBEN.test(d.farbeAussen)) {
    fStart = 50;
    fBeitraege.push({
      text: `${d.farbeAussen} ist im Angebot stark vertreten.`,
      delta: null,
    });
  } else {
    fBeitraege.push({ text: `Außenfarbe ${d.farbeAussen}.`, delta: null });
  }
  if (d.farbeInnen && GESUCHTE_INNENFARBEN.test(d.farbeInnen)) {
    fBeitraege.push({
      text: `Farbige Innenausstattung (${d.farbeInnen}) — im Sammlersegment gesucht.`,
      delta: 12,
    });
  }
  const farbkombination = komponente(
    'farbkombination',
    QUALITAET_LABEL.farbkombination,
    g.farbkombination,
    fStart,
    fBeitraege,
  );

  /* -- Servicehistorie ---------------------------------------------------- */
  const shBeitraege: Beitrag[] = [];
  const shStart =
    d.servicehistorie === 'lueckenlos'
      ? 88
      : d.servicehistorie === 'teilweise'
        ? 58
        : d.servicehistorie === 'keine'
          ? 22
          : 45;
  shBeitraege.push({ text: `Angabe im Inserat: ${d.servicehistorie}.`, delta: null });
  if (d.servicehistorie === 'unbekannt') unbekannteKriterien++;
  const serviceBelege = e.dokumente.filter(
    (x) => x.art === 'serviceheft' || x.art === 'digitale-servicehistorie',
  );
  if (serviceBelege.length > 0) {
    shBeitraege.push({
      text: 'Servicehistorie liegt als Unterlage vor und ist damit überprüfbar.',
      delta: 10,
    });
  } else if (d.servicehistorie === 'lueckenlos') {
    shBeitraege.push({
      text: 'Lückenlosigkeit wird behauptet, aber nicht belegt.',
      delta: -14,
    });
  }
  const servicehistorie = komponente(
    'servicehistorie',
    QUALITAET_LABEL.servicehistorie,
    g.servicehistorie,
    shStart,
    shBeitraege,
  );

  /* -- Unfallhistorie ------------------------------------------------------ */
  const uBeitraege: Beitrag[] = [];
  const uStart =
    d.unfallangabe === 'unfallfrei'
      ? 90
      : d.unfallangabe === 'unfallfrei-laut-vorbesitzer'
        ? 68
        : d.unfallangabe === 'vorschaden-repariert'
          ? 45
          : d.unfallangabe === 'unfallschaden'
            ? 18
            : 40;
  uBeitraege.push({ text: `Angabe im Inserat: ${d.unfallangabe}.`, delta: null });
  if (d.unfallangabe === 'keine-angabe') unbekannteKriterien++;
  const gutachten = e.dokumente.some((x) => x.art === 'gutachten');
  if (gutachten) {
    uBeitraege.push({
      text: 'Gutachten liegt vor — die Angabe ist unabhängig überprüfbar.',
      delta: 8,
    });
  }
  const lackHinweise = d.bilder
    .flatMap((b) => b.auffaelligkeiten)
    .filter((a) => (a.art === 'lackton' || a.art === 'spaltmass') && a.confidence >= 60);
  for (const l of lackHinweise) {
    uBeitraege.push({
      text: `Bildhinweis: ${l.hinweis}`,
      delta: -12,
    });
  }
  const unfallhistorie = komponente(
    'unfallhistorie',
    QUALITAET_LABEL.unfallhistorie,
    g.unfallhistorie,
    uStart,
    uBeitraege,
  );

  /* -- Technischer Zustand -------------------------------------------------- */
  const tBeitraege: Beitrag[] = [];
  const faelligOffen = e.risiken.befunde.filter(
    (b) => b.faellig && !b.belegtErledigt,
  );
  const belegt = e.risiken.befunde.filter((b) => b.belegtErledigt);
  tBeitraege.push({
    text: `${e.risiken.befunde.length} modelltypische Risiken bekannt, ${faelligOffen.length} davon fällig und nicht belegt.`,
    delta: null,
  });
  if (belegt.length > 0) {
    tBeitraege.push({
      text: `Belegt erledigt: ${belegt.map((b) => b.risiko.bezeichnung).join(', ')}.`,
      delta: Math.min(25, belegt.length * 9),
    });
  }
  for (const b of e.risiken.kritischOffen) {
    tBeitraege.push({
      text: `${b.risiko.bezeichnung}: fällig, nicht belegt, kritische Schadensfolge.`,
      delta: -18,
    });
  }
  if (e.risiken.offenerBedarf > 0) {
    tBeitraege.push({
      text: `Erwarteter offener Instandsetzungsbedarf: ${Math.round(e.risiken.offenerBedarf).toLocaleString('de-AT')} €.`,
      delta: -Math.min(25, Math.round(e.risiken.belastung / 3)),
    });
  }
  if (d.bekannteMaengel && d.bekannteMaengel.trim().length > 0) {
    tBeitraege.push({
      text: `Vom Verkäufer genannte Mängel: ${d.bekannteMaengel}`,
      delta: -10,
    });
  }
  const technischerZustand = komponente(
    'technischer-zustand',
    QUALITAET_LABEL['technischer-zustand'],
    g['technischer-zustand'],
    82,
    tBeitraege,
  );

  /* -- Innenraum- und Karosseriezustand aus der Bildanalyse ---------------- */
  const innen = d.bilder
    .flatMap((b) => b.auffaelligkeiten)
    .filter((a) => ['sitzverschleiss', 'lenkradverschleiss', 'verkleidung'].includes(a.art));
  const innenBilder = d.bilder.some((b) => b.merkmale.some((m) => m.startsWith('innenraum')));
  const iBeitraege: Beitrag[] = [];
  if (!innenBilder) {
    iBeitraege.push({
      text: 'Keine Innenraumaufnahmen — Zustand nicht beurteilbar, Besichtigung erforderlich.',
      delta: -15,
    });
    unbekannteKriterien++;
  } else if (innen.length === 0) {
    iBeitraege.push({ text: 'Innenraumbilder ohne erkennbare Auffälligkeiten.', delta: 8 });
  }
  for (const a of innen) {
    iBeitraege.push({ text: `Bildhinweis: ${a.hinweis}`, delta: -10 });
  }
  const innenraumzustand = komponente(
    'innenraumzustand',
    QUALITAET_LABEL.innenraumzustand,
    g.innenraumzustand,
    76,
    iBeitraege,
  );

  const karosserie = d.bilder
    .flatMap((b) => b.auffaelligkeiten)
    .filter((a) => ['lackton', 'spaltmass', 'korrosion', 'unterboden', 'felgenschaden'].includes(a.art));
  const kBeitraege: Beitrag[] = [];
  const unterbodenBilder = d.bilder.some((b) => b.merkmale.some((m) => m.startsWith('unterboden')));
  if (unterbodenBilder) {
    kBeitraege.push({ text: 'Unterbodenaufnahmen vorhanden.', delta: 10 });
  } else {
    kBeitraege.push({
      text: 'Keine Unterbodenaufnahmen — Korrosion nicht beurteilbar.',
      delta: -12,
    });
    unbekannteKriterien++;
  }
  for (const a of karosserie) {
    kBeitraege.push({ text: `Bildhinweis: ${a.hinweis}`, delta: -12 });
  }
  const karosseriezustand = komponente(
    'karosseriezustand',
    QUALITAET_LABEL.karosseriezustand,
    g.karosseriezustand,
    78,
    kBeitraege,
  );

  /* -- Umbauten ------------------------------------------------------------ */
  const umBeitraege: Beitrag[] = [];
  if (!d.umbauten && !tuning) {
    umBeitraege.push({ text: 'Keine Umbauten angegeben.', delta: null });
  } else {
    umBeitraege.push({
      text: tuning
        ? 'Leistungssteigerung erkannt — Rückrüstbarkeit und Eintragung sind zu klären.'
        : `Umbauten angegeben: ${d.umbauten}`,
      delta: tuning ? -35 : -18,
    });
  }
  const umbauten = komponente(
    'umbauten',
    QUALITAET_LABEL.umbauten,
    g.umbauten,
    88,
    umBeitraege,
  );

  /* -- Matching Numbers ----------------------------------------------------- */
  const mnBeitraege: Beitrag[] = [];
  const motorGetauscht = /(austauschmotor|tauschmotor|motor\s+getauscht|neuer\s+motor)/i.test(
    d.beschreibung,
  );
  if (motorGetauscht) {
    mnBeitraege.push({
      text: 'Hinweis auf Motortausch — Matching Numbers nicht mehr gegeben.',
      delta: -45,
    });
  } else {
    mnBeitraege.push({
      text: 'Kein Hinweis auf Aggregattausch. Endgültige Feststellung nur am Fahrzeug möglich.',
      delta: null,
    });
  }
  const matchingNumbers = komponente(
    'matching-numbers',
    QUALITAET_LABEL['matching-numbers'],
    g['matching-numbers'],
    75,
    mnBeitraege,
  );

  /* -- Dokumentationsqualität ------------------------------------------------ */
  const dqBeitraege: Beitrag[] = [];
  dqBeitraege.push({
    text: `${e.dokumente.length} Unterlagen hinterlegt.`,
    delta: Math.min(40, e.dokumente.length * 10),
  });
  if (e.dokumente.length === 0) {
    dqBeitraege.push({ text: 'Keine Unterlagen vorhanden.', delta: -25 });
  }
  const dokumentationsqualitaet = komponente(
    'dokumentationsqualitaet',
    QUALITAET_LABEL.dokumentationsqualitaet,
    g.dokumentationsqualitaet,
    50,
    dqBeitraege,
  );

  if (unbekannteKriterien >= 3) {
    hinweise.push(
      `${unbekannteKriterien} Kriterien sind aus dem Inserat nicht beurteilbar. Der Score ist ein vorläufiger Wert und ersetzt keine Besichtigung.`,
    );
  }
  if (e.risiken.kritischOffen.length > 0) {
    hinweise.push(
      `Kritisch und unbelegt: ${e.risiken.kritischOffen.map((b) => b.risiko.bezeichnung).join(', ')}.`,
    );
  }

  return baueScore(
    [
      laufleistung,
      vorbesitzer,
      originalzustand,
      sonderausstattung,
      farbkombination,
      servicehistorie,
      unfallhistorie,
      technischerZustand,
      innenraumzustand,
      karosseriezustand,
      umbauten,
      matchingNumbers,
      dokumentationsqualitaet,
    ],
    standardEinstufung,
    { datenbasis: begrenze(100 - unbekannteKriterien * 12, 0, 100), hinweise },
  );
}
