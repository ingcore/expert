/**
 * Offer Integrity Score — PRD Abschnitt 12.
 *
 * Der Score bewertet **das Angebot**, nicht das Fahrzeug. Das ist die
 * wichtigste Unterscheidung dieser Datei: Ein hervorragendes Fahrzeug kann
 * miserabel inseriert sein, und ein durchschnittliches Fahrzeug kann
 * vorbildlich dokumentiert angeboten werden. Wer beides in eine Zahl wirft,
 * verliert genau die Information, wegen der das Produkt gebaut wird.
 *
 * Was hier bewertet wird, ist Transparenz und Widerspruchsfreiheit:
 * Vollständigkeit der Angaben, Konsistenz über die Zeit, Plausibilität von
 * Kilometerstand und Preis, Offenheit bei Schäden, Belegbarkeit des
 * Verkäufers. Die Gewichtung folgt Abschnitt 12 und ist administrativ änderbar.
 */

import type {
  Fahrzeugdokument,
  InseratDaten,
  Plattform,
  Verkaeufer,
} from '../domain/types';
import { begrenze } from '../domain/format';
import {
  baueScore,
  integritaetEinstufung,
  komponente,
  type Beitrag,
  type Score,
} from './erklaerung';
import type { IntegritaetKomponente } from './gewichte';
import { INTEGRITAET_LABEL } from './gewichte';
import type { Historienkennzahlen } from './historie';
import type { Textanalyse } from './text';
import type { Marktbewertung } from './bewertung';
import type { Feldkonsolidierung } from './datenqualitaet';

export interface Integritaetseingang {
  daten: InseratDaten;
  verkaeufer: Verkaeufer | undefined;
  plattform: Plattform | undefined;
  historie: Historienkennzahlen;
  text: Textanalyse;
  bewertung: Marktbewertung;
  felder: Feldkonsolidierung[];
  dokumente: Fahrzeugdokument[];
  /** Alter des Fahrzeuges in Jahren, für die Kilometerplausibilität. */
  alterJahre: number | null;
  /** Bilder, die identisch auch in Inseraten anderer Fahrzeuge vorkommen. */
  fremdverwendeteBilder: number;
  gewichte: Record<IntegritaetKomponente, number>;
}

/** Felder, deren Angabe von einem ernstgemeinten Inserat erwartet wird. */
const PFLICHTFELDER: { schluessel: string; label: string; da: (d: InseratDaten) => boolean }[] =
  [
    { schluessel: 'erstzulassung', label: 'Erstzulassung', da: (d) => d.erstzulassung !== null },
    { schluessel: 'kilometerstand', label: 'Kilometerstand', da: (d) => d.kilometerstand !== null },
    { schluessel: 'leistung', label: 'Leistung', da: (d) => d.leistungPs !== null },
    { schluessel: 'getriebe', label: 'Getriebe', da: (d) => d.getriebe !== 'unbekannt' },
    { schluessel: 'farbeAussen', label: 'Außenfarbe', da: (d) => d.farbeAussen !== null },
    { schluessel: 'farbeInnen', label: 'Innenausstattung', da: (d) => d.farbeInnen !== null },
    { schluessel: 'vorbesitzer', label: 'Vorbesitzer', da: (d) => d.vorbesitzer !== null },
    { schluessel: 'vin', label: 'Fahrgestellnummer', da: (d) => d.vin !== null },
    {
      schluessel: 'servicehistorie',
      label: 'Servicehistorie',
      da: (d) => d.servicehistorie !== 'unbekannt',
    },
    {
      schluessel: 'unfallangabe',
      label: 'Unfallangabe',
      da: (d) => d.unfallangabe !== 'keine-angabe',
    },
    { schluessel: 'ausstattung', label: 'Ausstattungsliste', da: (d) => d.ausstattung.length >= 3 },
    {
      schluessel: 'beschreibung',
      label: 'Aussagekräftige Beschreibung',
      da: (d) => d.beschreibung.length >= 200,
    },
    { schluessel: 'mwst', label: 'Mehrwertsteuerausweis', da: (d) => d.mwstAusweisbar !== null },
    { schluessel: 'fahrzeugland', label: 'Fahrzeugland', da: (d) => d.fahrzeugland !== null },
  ];

export function bewerteIntegritaet(e: Integritaetseingang): Score {
  const g = e.gewichte;
  const d = e.daten;

  /* -- 1. Datenvollständigkeit ------------------------------------------ */
  const fehlend = PFLICHTFELDER.filter((f) => !f.da(d));
  const vollstaendigkeit = komponente(
    'datenvollstaendigkeit',
    INTEGRITAET_LABEL.datenvollstaendigkeit,
    g.datenvollstaendigkeit,
    100,
    [
      {
        text: `${PFLICHTFELDER.length - fehlend.length} von ${PFLICHTFELDER.length} erwarteten Angaben vorhanden.`,
        delta: null,
      },
      ...fehlend.map<Beitrag>((f) => ({
        text: `${f.label} fehlt.`,
        delta: -Math.round(100 / PFLICHTFELDER.length),
      })),
    ],
  );

  /* -- 2. Historienkonsistenz ------------------------------------------- */
  const histBeitraege: Beitrag[] = [];
  const h = e.historie;
  if (h.anzahlBeobachtungen <= 1) {
    histBeitraege.push({
      text: 'Erst eine Beobachtung — die Historie kann noch nichts bestätigen und nichts widerlegen.',
      delta: -18,
    });
  } else {
    histBeitraege.push({
      text: `${h.anzahlBeobachtungen} Beobachtungen über ${h.beobachtungsdauerTage} Tage.`,
      delta: null,
    });
  }
  if (h.kilometerRueckgang) {
    histBeitraege.push({
      text: 'Kilometerstand sinkt im Beobachtungsverlauf.',
      delta: -55,
    });
  }
  const widerspruchsfelder = e.felder.filter((f) => f.widerspruch);
  for (const f of widerspruchsfelder) {
    histBeitraege.push({
      text: `Widersprüchliche Angaben zum Feld ${f.label} aus ${f.alle.length} Quellen.`,
      delta: -12,
    });
  }
  if (h.verkaeuferwechsel >= 2) {
    histBeitraege.push({
      text: `${h.verkaeuferwechsel} Verkäuferwechsel im Beobachtungszeitraum.`,
      delta: -14,
    });
  } else if (h.verkaeuferwechsel === 1) {
    histBeitraege.push({
      text: 'Ein Verkäuferwechsel im Beobachtungszeitraum.',
      delta: -6,
    });
  }
  if (h.standortwechsel >= 2) {
    histBeitraege.push({
      text: `${h.standortwechsel} Standortwechsel im Beobachtungszeitraum.`,
      delta: -8,
    });
  }
  if (h.anzahlPreisaenderungen >= 4) {
    histBeitraege.push({
      text: `${h.anzahlPreisaenderungen} Preisänderungen — häufige Korrekturen deuten auf eine unklare Preisvorstellung.`,
      delta: -6,
    });
  }
  if (h.anzahlBeobachtungen >= 4 && !h.kilometerRueckgang && widerspruchsfelder.length === 0) {
    histBeitraege.push({
      text: 'Über den gesamten Beobachtungszeitraum widerspruchsfrei.',
      delta: 6,
    });
  }
  const historienkonsistenz = komponente(
    'historienkonsistenz',
    INTEGRITAET_LABEL.historienkonsistenz,
    g.historienkonsistenz,
    92,
    histBeitraege,
  );

  /* -- 3. Textkonsistenz ------------------------------------------------ */
  const textBeitraege: Beitrag[] = [];
  for (const w of e.text.widersprueche) {
    textBeitraege.push({
      text: `${w.bezeichnung}: strukturiert „${w.strukturiert}", im Text „${w.imText}".`,
      delta: -22,
      quelle: w.fundstelle,
    });
  }
  for (const b of e.text.befunde.filter((x) => x.wirkung !== 0)) {
    textBeitraege.push({
      text: `${b.bezeichnung}: ${b.bedeutung}`,
      delta: b.wirkung,
      quelle: b.fundstelle,
    });
  }
  const neutraleBefunde = e.text.befunde.filter((x) => x.wirkung === 0);
  if (neutraleBefunde.length > 0) {
    textBeitraege.push({
      text: `${neutraleBefunde.length} Formulierungen erkannt, die Prüfanforderungen auslösen, ohne den Score zu mindern: ${neutraleBefunde.map((b) => b.bezeichnung).join(', ')}.`,
      delta: null,
    });
  }
  if (d.beschreibung.length < 120) {
    textBeitraege.push({
      text: 'Sehr kurze Beschreibung — wenig überprüfbarer Inhalt.',
      delta: -15,
    });
  }
  if (e.text.widersprueche.length === 0 && d.beschreibung.length >= 400) {
    textBeitraege.push({
      text: 'Ausführliche Beschreibung ohne erkennbaren Widerspruch zu den strukturierten Feldern.',
      delta: 6,
    });
  }
  const textkonsistenz = komponente(
    'textkonsistenz',
    INTEGRITAET_LABEL.textkonsistenz,
    g.textkonsistenz,
    92,
    textBeitraege,
  );

  /* -- 4. Kilometerplausibilität ---------------------------------------- */
  const kmBeitraege: Beitrag[] = [];
  if (d.kilometerstand === null) {
    kmBeitraege.push({ text: 'Kein Kilometerstand angegeben.', delta: -45 });
  } else if (e.alterJahre !== null && e.alterJahre > 0) {
    const proJahr = d.kilometerstand / e.alterJahre;
    kmBeitraege.push({
      text: `${Math.round(proJahr).toLocaleString('de-AT')} km pro Jahr über ${e.alterJahre.toFixed(1)} Jahre.`,
      delta: null,
    });
    if (proJahr < 1500) {
      kmBeitraege.push({
        text: 'Auffällig geringe Jahresfahrleistung — Standschäden und Tachomanipulation sind gleichermaßen zu prüfen.',
        delta: -16,
      });
    } else if (proJahr < 4000) {
      kmBeitraege.push({
        text: 'Geringe Jahresfahrleistung — für ein Sammlerfahrzeug erklärbar, aber belegbedürftig.',
        delta: -5,
      });
    } else if (proJahr > 25000) {
      kmBeitraege.push({
        text: 'Hohe Jahresfahrleistung — Verschleißteile sind entsprechend zu prüfen.',
        delta: -8,
      });
    }
  } else {
    kmBeitraege.push({
      text: 'Ohne Erstzulassung lässt sich die Jahresfahrleistung nicht prüfen.',
      delta: -20,
    });
  }
  if (h.kilometerRueckgang) {
    kmBeitraege.push({
      text: 'Der Kilometerstand ist zwischen zwei Beobachtungen gesunken.',
      delta: -60,
    });
  }
  const kmWiderspruch = e.felder.find((f) => f.feld === 'kilometerstand' && f.widerspruch);
  if (kmWiderspruch) {
    kmBeitraege.push({
      text: `Kilometerstand aus mehreren Quellen widersprüchlich: ${kmWiderspruch.alle.map((a) => `${a.wert} (${a.quelle})`).join(' / ')}.`,
      delta: -25,
    });
  }
  if (e.text.befunde.some((b) => b.musterId === 'km-laut-tacho')) {
    kmBeitraege.push({
      text: 'Die Laufleistung wird ausdrücklich nur „laut Tacho" angegeben und damit nicht zugesichert.',
      delta: -10,
    });
  }
  const kilometerplausibilitaet = komponente(
    'kilometerplausibilitaet',
    INTEGRITAET_LABEL.kilometerplausibilitaet,
    g.kilometerplausibilitaet,
    96,
    kmBeitraege,
  );

  /* -- 5. Schadenstransparenz ------------------------------------------- */
  const schadenBeitraege: Beitrag[] = [];
  switch (d.unfallangabe) {
    case 'unfallfrei':
      schadenBeitraege.push({ text: 'Unfallfreiheit ausdrücklich zugesichert.', delta: 8 });
      break;
    case 'unfallfrei-laut-vorbesitzer':
      schadenBeitraege.push({
        text: 'Unfallfreiheit nur weitergegeben („laut Vorbesitzer") — der Verkäufer steht nicht dafür ein.',
        delta: -12,
      });
      break;
    case 'vorschaden-repariert':
      schadenBeitraege.push({
        text: 'Vorschaden offen genannt — das erhöht die Transparenz, auch wenn es den Wert mindert.',
        delta: 4,
      });
      break;
    case 'unfallschaden':
      schadenBeitraege.push({
        text: 'Unfallschaden offen genannt.',
        delta: 0,
      });
      break;
    case 'keine-angabe':
      schadenBeitraege.push({
        text: 'Keine Angabe zur Unfallfreiheit — die für den Wert wichtigste Einzelaussage fehlt.',
        delta: -40,
      });
      break;
  }
  if (
    (d.unfallangabe === 'vorschaden-repariert' || d.unfallangabe === 'unfallschaden') &&
    !d.bekannteMaengel &&
    !/schaden/i.test(d.beschreibung)
  ) {
    schadenBeitraege.push({
      text: 'Der Schaden ist angekreuzt, aber im Text nicht näher beschrieben.',
      delta: -18,
    });
  }
  if (d.bekannteMaengel && d.bekannteMaengel.length > 20) {
    schadenBeitraege.push({
      text: 'Bekannte Mängel werden aktiv aufgeführt.',
      delta: 10,
    });
  }
  const schadenstransparenz = komponente(
    'schadenstransparenz',
    INTEGRITAET_LABEL.schadenstransparenz,
    g.schadenstransparenz,
    80,
    schadenBeitraege,
  );

  /* -- 6. Bildplausibilität --------------------------------------------- */
  const bildBeitraege: Beitrag[] = [];
  const anzahlBilder = d.bilder.length;
  const eindeutig = new Set(d.bilder.map((b) => b.phash)).size;
  bildBeitraege.push({ text: `${anzahlBilder} Bilder im Inserat.`, delta: null });
  if (anzahlBilder === 0) {
    bildBeitraege.push({ text: 'Keine Bilder vorhanden.', delta: -60 });
  } else if (anzahlBilder < 6) {
    bildBeitraege.push({
      text: 'Weniger als sechs Bilder — für ein Fahrzeug dieser Preisklasse zu wenig.',
      delta: -22,
    });
  } else if (anzahlBilder >= 15) {
    bildBeitraege.push({ text: 'Umfangreiche Bilddokumentation.', delta: 8 });
  }
  if (eindeutig < anzahlBilder) {
    bildBeitraege.push({
      text: `${anzahlBilder - eindeutig} Bilder sind Dubletten desselben Motivs.`,
      delta: -10,
    });
  }
  if (e.fremdverwendeteBilder > 0) {
    bildBeitraege.push({
      text: `${e.fremdverwendeteBilder} Bilder erscheinen auch in Inseraten anderer Fahrzeuge.`,
      delta: -35,
    });
  }
  const merkmale = new Set(d.bilder.flatMap((b) => b.merkmale.map((m) => m.split(':')[0])));
  if (!merkmale.has('innenraum')) {
    bildBeitraege.push({ text: 'Keine Innenraumaufnahmen erkennbar.', delta: -12 });
  }
  if (merkmale.has('unterboden')) {
    bildBeitraege.push({ text: 'Unterbodenaufnahmen vorhanden — im Markt selten und aussagekräftig.', delta: 12 });
  }
  if (merkmale.has('motorraum')) {
    bildBeitraege.push({ text: 'Motorraum abgebildet.', delta: 5 });
  }
  const auffaellig = d.bilder.flatMap((b) => b.auffaelligkeiten).filter((a) => a.confidence >= 60);
  for (const a of auffaellig) {
    bildBeitraege.push({
      text: `Bildhinweis: ${a.hinweis} — manuelle Prüfung empfohlen.`,
      delta: -6,
    });
  }
  const bildplausibilitaet = komponente(
    'bildplausibilitaet',
    INTEGRITAET_LABEL.bildplausibilitaet,
    g.bildplausibilitaet,
    86,
    bildBeitraege,
  );

  /* -- 7. Verkäufertransparenz ------------------------------------------ */
  const vBeitraege: Beitrag[] = [];
  const v = e.verkaeufer;
  if (!v) {
    vBeitraege.push({ text: 'Kein Verkäuferprofil vorhanden.', delta: -35 });
  } else {
    vBeitraege.push({
      text: `${v.name}, ${v.ort} (${v.land}), Verkäuferart: ${v.art}.`,
      delta: null,
    });
    if (v.identitaetBelegt) {
      vBeitraege.push({ text: 'Firmenidentität nachvollziehbar (Impressum/Firmenbuch).', delta: 8 });
    } else if (v.art === 'haendler') {
      vBeitraege.push({
        text: 'Gewerblicher Verkäufer ohne nachvollziehbare Firmenidentität.',
        delta: -30,
      });
    }
    if (v.art === 'unbekannt') {
      vBeitraege.push({ text: 'Verkäuferart nicht bestimmbar.', delta: -15 });
    }
    if (v.seitJahr !== null) {
      vBeitraege.push({ text: `Auf der Plattform aktiv seit ${v.seitJahr}.`, delta: 4 });
    }
    if (v.bewertung !== null && v.bewertung < 3.5) {
      vBeitraege.push({
        text: `Unterdurchschnittliche Plattformbewertung (${v.bewertung.toFixed(1)} von 5).`,
        delta: -12,
      });
    }
    if (v.anzahlInserate > 60 && v.art === 'privat') {
      vBeitraege.push({
        text: `${v.anzahlInserate} Inserate bei privatem Verkäuferstatus — Hinweis auf verdeckt gewerblichen Handel.`,
        delta: -25,
      });
    }
  }
  if (e.plattform) {
    vBeitraege.push({
      text: `Quelle: ${e.plattform.name} über ${e.plattform.zugriffsart}.`,
      delta: null,
    });
  }
  if (e.text.befunde.some((b) => b.musterId === 'kundenauftrag')) {
    vBeitraege.push({
      text: 'Verkauf im Kundenauftrag — der Verkäufer kennt das Fahrzeug nicht aus eigener Anschauung.',
      delta: -10,
    });
  }
  const verkaeufertransparenz = komponente(
    'verkaeufertransparenz',
    INTEGRITAET_LABEL.verkaeufertransparenz,
    g.verkaeufertransparenz,
    82,
    vBeitraege,
  );

  /* -- 8. Preisplausibilität -------------------------------------------- */
  const pBeitraege: Beitrag[] = [];
  const abw = e.bewertung.abweichungProzent;
  if (e.bewertung.fairValue === 0) {
    pBeitraege.push({
      text: 'Ohne Modellzuordnung ist kein Preisvergleich möglich.',
      delta: -30,
    });
  } else {
    pBeitraege.push({
      text: `Angebotspreis weicht um ${abw >= 0 ? '+' : ''}${abw.toFixed(1)} % vom Fair Market Value ab.`,
      delta: null,
    });
    if (abw < -30) {
      // Der Kernsatz aus Abschnitt 12: auffällig billig ist kein Vorteil.
      pBeitraege.push({
        text: 'Der Preis liegt weit unter dem Marktwert. Das ist kein Preisvorteil, sondern ein Hinweis auf einen im Inserat nicht genannten Umstand.',
        delta: -55,
      });
    } else if (abw < -18) {
      pBeitraege.push({
        text: 'Deutlich unter Marktwert — Grund ist vor jeder weiteren Bewertung zu klären.',
        delta: -28,
      });
    } else if (abw < -6) {
      pBeitraege.push({ text: 'Leicht unter Marktwert.', delta: 0 });
    } else if (abw > 25) {
      pBeitraege.push({
        text: 'Deutlich über Marktwert — Preisvorstellung ohne erkennbare Grundlage.',
        delta: -20,
      });
    } else if (abw > 12) {
      pBeitraege.push({ text: 'Über Marktwert.', delta: -8 });
    }
    if (e.bewertung.konfidenz < 60) {
      pBeitraege.push({
        text: `Der Marktwert selbst ist nur mit ${e.bewertung.konfidenz} % Konfidenz bestimmbar.`,
        delta: -8,
      });
    }
  }
  if (d.mwstAusweisbar === null) {
    pBeitraege.push({ text: 'Kein Mehrwertsteuerausweis angegeben.', delta: -8 });
  }
  const preisplausibilitaet = komponente(
    'preisplausibilitaet',
    INTEGRITAET_LABEL.preisplausibilitaet,
    g.preisplausibilitaet,
    92,
    pBeitraege,
  );

  /* -- 9. Wiederinserierungshistorie ------------------------------------ */
  const wBeitraege: Beitrag[] = [];
  if (h.anzahlInserate > 1) {
    wBeitraege.push({
      text: `${h.anzahlInserate} Inserate desselben Fahrzeuges auf ${h.plattformen} Plattformen.`,
      delta: h.plattformen > 1 ? -6 : -12,
    });
  }
  if (h.wiederinserierungen > 0) {
    wBeitraege.push({
      text: `${h.wiederinserierungen} Wiederinserierung(en) nach zwischenzeitlicher Abwesenheit.`,
      delta: -18,
    });
  }
  if (h.beobachtungsdauerTage > 180) {
    wBeitraege.push({
      text: `Seit ${h.beobachtungsdauerTage} Tagen im Markt beobachtet.`,
      delta: -12,
    });
  } else if (h.beobachtungsdauerTage > 90) {
    wBeitraege.push({
      text: `Seit ${h.beobachtungsdauerTage} Tagen im Markt beobachtet.`,
      delta: -5,
    });
  }
  if (h.anzahlInserate === 1 && h.beobachtungsdauerTage <= 90) {
    wBeitraege.push({ text: 'Keine auffällige Wiederinserierung.', delta: 0 });
  }
  const wiederinserierung = komponente(
    'wiederinserierung',
    INTEGRITAET_LABEL.wiederinserierung,
    g.wiederinserierung,
    92,
    wBeitraege,
  );

  /* -- 10. Dokumentationsqualität --------------------------------------- */
  const dokBeitraege: Beitrag[] = [];
  const genannt = new Set(d.genannteUnterlagen);
  const vorhanden = new Set(e.dokumente.map((x) => x.art));
  dokBeitraege.push({
    text: `${genannt.size} Unterlagen im Inserat genannt, ${vorhanden.size} Arten tatsächlich hinterlegt.`,
    delta: null,
  });
  if (genannt.size === 0) {
    dokBeitraege.push({ text: 'Keine Unterlagen genannt.', delta: -35 });
  } else {
    dokBeitraege.push({ text: `Genannt: ${[...genannt].join(', ')}.`, delta: 8 });
  }
  if (vorhanden.size > 0) {
    dokBeitraege.push({
      text: `Hinterlegt: ${[...vorhanden].join(', ')}.`,
      delta: 12,
    });
  }
  const nichtEingeloest = [...genannt].filter((x) => !vorhanden.has(x));
  if (vorhanden.size > 0 && nichtEingeloest.length > 0) {
    dokBeitraege.push({
      text: `Genannt, aber nicht vorgelegt: ${nichtEingeloest.join(', ')}.`,
      delta: -10,
    });
  }
  const dokumentationsqualitaet = komponente(
    'dokumentationsqualitaet',
    INTEGRITAET_LABEL.dokumentationsqualitaet,
    g.dokumentationsqualitaet,
    70,
    dokBeitraege,
  );

  /* -- Zusammenführung --------------------------------------------------- */
  const hinweise: string[] = [];
  if (h.anzahlBeobachtungen <= 1) {
    hinweise.push(
      'Nur eine Beobachtung: Historienkonsistenz und Wiederinserierung sind noch nicht belastbar bewertbar.',
    );
  }
  if (e.text.pruefanforderungen.length > 0) {
    hinweise.push(
      `${e.text.pruefanforderungen.length} Prüfanforderungen aus der Textanalyse — sie mindern den Score nicht, sind aber vor einem Kauf abzuarbeiten.`,
    );
  }

  const datenbasis = begrenze(
    100 -
      (h.anzahlBeobachtungen <= 1 ? 25 : 0) -
      fehlend.length * 3 -
      (e.bewertung.fairValue === 0 ? 20 : 0),
    0,
    100,
  );

  return baueScore(
    [
      vollstaendigkeit,
      historienkonsistenz,
      textkonsistenz,
      kilometerplausibilitaet,
      schadenstransparenz,
      bildplausibilitaet,
      verkaeufertransparenz,
      preisplausibilitaet,
      wiederinserierung,
      dokumentationsqualitaet,
    ],
    integritaetEinstufung,
    { datenbasis, hinweise },
  );
}
