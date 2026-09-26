/** Fabrikfunktionen für neue Projekte, Listeneinträge und Demodaten. */

import type {
  Abweichung,
  Bauteil,
  Brandabschnitt,
  Brandschutzanlage,
  Fluchtweg,
  Loeschhilfe,
  Massnahme,
  Nutzungseinheit,
  Projekt,
} from './types';

/** Erzeugt eine kollisionsarme ID ohne externe Abhängigkeit. */
export function neueId(prefix = 'id'): string {
  const zufall =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${zufall}`;
}

/** Heutiges Datum als ISO-Datum (YYYY-MM-DD). */
export function heute(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Datum in n Tagen als ISO-Datum. */
export function inTagen(tage: number): string {
  const d = new Date();
  d.setDate(d.getDate() + tage);
  return d.toISOString().slice(0, 10);
}

/* ==========================================================================
 * Leere Listeneinträge
 * ======================================================================= */

export function neueNutzungseinheit(): Nutzungseinheit {
  return {
    id: neueId('ne'),
    bezeichnung: '',
    nutzungsart: 'buero',
    geschoss: 'EG',
    flaeche: 0,
    personenzahl: 0,
    brandlast: 0,
    brandabschnittId: null,
    bemerkung: '',
  };
}

export function neuerBrandabschnitt(index: number): Brandabschnitt {
  return {
    id: neueId('ba'),
    bezeichnung: `BA ${String(index).padStart(2, '0')}`,
    typ: 'BA',
    flaeche: 0,
    trennbauteil: 'REI90',
    geschosse: '',
    abschluesseDokumentiert: false,
    beschreibung: '',
  };
}

export function neuesBauteil(): Bauteil {
  return {
    id: neueId('bt'),
    bezeichnung: '',
    kategorie: 'trennwand',
    istKlasse: 'keine',
    sollKlasse: 'REI90',
    nachweis: '',
    bemerkung: '',
  };
}

export function neuerFluchtweg(): Fluchtweg {
  return {
    id: neueId('fw'),
    bezeichnung: '',
    art: 'hauptfluchtweg',
    laenge: 0,
    breite: 1.2,
    personen: 0,
    fuehrtInsFreie: true,
    sicherheitsbeleuchtung: false,
    fluchtwegorientierung: false,
    panikbeschlag: false,
    bemerkung: '',
  };
}

export function neueLoeschhilfe(): Loeschhilfe {
  return {
    id: neueId('lh'),
    art: 'handfeuerloescher',
    standort: '',
    anzahl: 1,
    loeschmitteleinheiten: 6,
    letztePruefung: '',
    bemerkung: '',
  };
}

export function neueAnlage(): Brandschutzanlage {
  return {
    id: neueId('an'),
    art: 'BMA',
    status: 'vorhanden',
    regelwerk: 'TRVB S 123',
    schutzumfang: '',
    aufschaltung: false,
    letztePruefung: '',
    naechstePruefung: '',
    bemerkung: '',
  };
}

export function neueMassnahme(lfdNr: number): Massnahme {
  return {
    id: neueId('ma'),
    lfdNr,
    bereich: '',
    beschreibung: '',
    massnahme: '',
    art: 'b',
    score: 'C',
    status: 'offen',
    kapitel: '5',
    verbleibend: false,
    grundlage: '',
    frist: inTagen(180),
    verantwortlich: '',
    kosten: 0,
    bemerkung: '',
  };
}

export function neueAbweichung(anforderungId = ''): Abweichung {
  return {
    id: neueId('ab'),
    anforderungId,
    anforderung: '',
    beschreibung: '',
    kompensation: '',
    nachweis: '',
    gleichwertigkeitBeurteiltVon: '',
    gleichwertigkeitBeurteiltAm: '',
    genehmigt: false,
  };
}

/* ==========================================================================
 * Neues Projekt
 * ======================================================================= */

export function neuesProjekt(titel = 'Neues Brandschutzkonzept'): Projekt {
  const jetzt = new Date().toISOString();
  return {
    id: neueId('prj'),
    titel,
    status: 'entwurf',
    anlass: 'bestandsanalyse',
    datum: heute(),
    erstelltAm: jetzt,
    geaendertAm: jetzt,

    bundesland: 'K',
    oibAusgabe: '2023-05',
    klassenEingabe: {
      nutzungseinheitenAnzahl: null,
      groessteEinheitFlaeche: null,
      freistehend: null,
    },
    istWerte: {},
    freigabe: null,
    audit: [],

    auftraggeber: {
      name: '',
      kundennummer: '',
      strasse: '',
      plz: '',
      ort: '',
      ansprechpartner: '',
      telefon: '',
      email: '',
    },
    objekt: {
      bezeichnung: '',
      strasse: '',
      plz: '',
      ort: '',
      katastralgemeinde: '',
      grundstuecksnummer: '',
      baujahr: null,
      behoerde: '',
    },
    bearbeiter: {
      name: '',
      rolle: 'Sachverständiger',
      qualifikation: '',
      email: '',
    },
    berichtsnummer: {
      geschaeftsbereich: 'BS',
      fachbereich: 'BAU',
      anlage: 'ALL',
      leistungsart: 'KON',
      sequenz: '001',
    },

    gebaeude: {
      bauweise: 'massiv',
      fluchtniveau: 0,
      geschosseOberirdisch: 1,
      geschosseUnterirdisch: 0,
      bruttoGrundflaeche: 0,
      groessterBrandabschnitt: 0,
      umbauterRaum: 0,
      risikoklasse: 'normal',
      konstruktionsbeschreibung: '',
    },

    nutzungseinheiten: [],
    brandabschnitte: [],
    bauteile: [],
    fluchtwege: [],
    loeschhilfen: [],
    loeschwasser: {
      menge: 0,
      erforderlich: 0,
      dauer: 0,
      hydrantEntfernung: 0,
      rueckhaltungErforderlich: false,
      bemerkung: '',
    },
    anlagen: [],
    organisation: {
      brandschutzbeauftragterErforderlich: false,
      brandschutzbeauftragter: '',
      brandschutzwarte: 0,
      brandschutzordnungVorhanden: false,
      brandschutzplaeneVorhanden: false,
      brandschutzplaeneStand: '',
      laufkartenVorhanden: false,
      raeumungsuebungIntervallMonate: 12,
      letzteRaeumungsuebung: '',
      eigenkontrolleIntervallMonate: 3,
      brandschutzbuchGefuehrt: false,
      bemerkung: '',
    },
    massnahmen: [],
    abweichungen: [],

    auftragsgegenstand: '',
    grundlagen: '',
    conclusio: '',
  };
}

/* ==========================================================================
 * Demoprojekt
 * ======================================================================= */

/**
 * Beispielprojekt mit realistischen Werten. Es enthält bewusst einige
 * Regelverstöße, damit die Prüflogik unmittelbar sichtbar wird.
 */
export function demoProjekt(): Projekt {
  const p = neuesProjekt('Betriebsgebäude Mustermann — Zubau Produktionshalle');

  p.status = 'in-pruefung';
  p.anlass = 'zubau';
  p.bundesland = 'K';
  p.oibAusgabe = '2023-05';
  // Aus diesen Angaben leitet die Engine GK4 ab (Fluchtniveau 9,4 m).
  p.klassenEingabe = {
    nutzungseinheitenAnzahl: 4,
    groessteEinheitFlaeche: 1620,
    freistehend: true,
  };
  p.berichtsnummer = {
    geschaeftsbereich: 'BS',
    fachbereich: 'BAU',
    anlage: 'ALL',
    leistungsart: 'KON',
    sequenz: '001',
  };

  p.auftraggeber = {
    name: 'Mustermann Metallverarbeitung GmbH',
    kundennummer: '0219',
    strasse: 'Industriestraße 14',
    plz: '9500',
    ort: 'Villach',
    ansprechpartner: 'DI Andrea Mustermann',
    telefon: '+43 4242 12345',
    email: 'office@mustermann-metall.at',
  };

  p.objekt = {
    bezeichnung: 'Produktionshalle Nord mit Bürotrakt',
    strasse: 'Industriestraße 14',
    plz: '9500',
    ort: 'Villach',
    katastralgemeinde: 'Villach-Land',
    grundstuecksnummer: '412/7',
    baujahr: 1998,
    behoerde: 'Magistrat der Stadt Villach, Bauamt',
  };

  p.bearbeiter = {
    name: 'Hannes Schwinger',
    rolle: 'Sachverständiger Brandschutz',
    qualifikation: 'Ingenieurkonsulent, akkreditierter Brandschutzsachverständiger',
    email: 'office@ingtec.at',
  };

  p.gebaeude = {
    bauweise: 'mischbauweise',
    fluchtniveau: 9.4,
    geschosseOberirdisch: 3,
    geschosseUnterirdisch: 1,
    bruttoGrundflaeche: 4820,
    groessterBrandabschnitt: 1850,
    umbauterRaum: 28400,
    risikoklasse: 'erhoeht',
    konstruktionsbeschreibung:
      'Hallentragwerk als Stahlkonstruktion mit Trapezblecheindeckung, Bürotrakt in Massivbauweise (Stahlbetondecken, Ziegelmauerwerk). Trennung zwischen Halle und Bürotrakt über eine durchgehende Brandwand.',
  };

  // --- Brandabschnitte ---------------------------------------------------
  const ba1: Brandabschnitt = {
    id: neueId('ba'),
    bezeichnung: 'BA 01',
    typ: 'BA',
    flaeche: 1850,
    trennbauteil: 'REI90',
    geschosse: 'EG',
    abschluesseDokumentiert: true,
    beschreibung: 'Produktionshalle Nord inklusive Nebenräume.',
  };
  const ba2: Brandabschnitt = {
    id: neueId('ba'),
    bezeichnung: 'BA 02',
    typ: 'BA',
    flaeche: 1240,
    trennbauteil: 'REI60',
    geschosse: 'EG–2.OG',
    abschluesseDokumentiert: false,
    beschreibung: 'Bürotrakt Ost, drei Geschoße.',
  };
  const ba3: Brandabschnitt = {
    id: neueId('ba'),
    bezeichnung: 'BA 03',
    typ: 'BA',
    flaeche: 980,
    trennbauteil: 'REI90',
    geschosse: 'KG',
    abschluesseDokumentiert: true,
    beschreibung: 'Lager- und Technikbereich im Kellergeschoß.',
  };
  p.brandabschnitte = [ba1, ba2, ba3];

  // --- Nutzungseinheiten -------------------------------------------------
  p.nutzungseinheiten = [
    {
      id: neueId('ne'),
      bezeichnung: 'Produktion Metallbearbeitung',
      nutzungsart: 'produktion',
      geschoss: 'EG',
      flaeche: 1620,
      personenzahl: 48,
      brandlast: 420,
      brandabschnittId: ba1.id,
      bemerkung: 'Spanabhebende Fertigung, Kühlschmierstoffe in Kleingebinden.',
    },
    {
      id: neueId('ne'),
      bezeichnung: 'Bürotrakt Verwaltung',
      nutzungsart: 'buero',
      geschoss: 'EG–2.OG',
      flaeche: 1180,
      personenzahl: 62,
      brandlast: 310,
      brandabschnittId: ba2.id,
      bemerkung: 'Großraum- und Einzelbüros, Besprechungsräume.',
    },
    {
      id: neueId('ne'),
      bezeichnung: 'Schulungsraum / Betriebsversammlung',
      nutzungsart: 'versammlung',
      geschoss: '2.OG',
      flaeche: 210,
      personenzahl: 130,
      brandlast: 280,
      brandabschnittId: ba2.id,
      bemerkung: 'Wird auch für Betriebsversammlungen genutzt.',
    },
    {
      id: neueId('ne'),
      bezeichnung: 'Fertigwarenlager',
      nutzungsart: 'lager',
      geschoss: 'KG',
      flaeche: 860,
      personenzahl: 6,
      brandlast: 640,
      brandabschnittId: ba3.id,
      bemerkung: 'Palettenlagerung, Stapelhöhe bis 4,5 m.',
    },
  ];

  // --- Bauteile ----------------------------------------------------------
  p.bauteile = [
    {
      id: neueId('bt'),
      bezeichnung: 'Brandwand Halle / Bürotrakt',
      kategorie: 'trennwand',
      istKlasse: 'REI90',
      sollKlasse: 'REI90',
      nachweis: 'Klassifizierungsbericht KB-2019-114',
      bemerkung: 'Durchgehend bis Oberkante Dach geführt.',
    },
    {
      id: neueId('bt'),
      bezeichnung: 'Decke über Kellergeschoß',
      kategorie: 'decke',
      istKlasse: 'REI60',
      sollKlasse: 'REI90',
      nachweis: '',
      bemerkung: 'Bestand aus Baujahr 1998, Ertüchtigung zu prüfen.',
    },
    {
      id: neueId('bt'),
      bezeichnung: 'Treppenhaus Bürotrakt',
      kategorie: 'treppenhaus',
      istKlasse: 'REI90',
      sollKlasse: 'REI90',
      nachweis: 'Bestandsplan Statik, Positionsnachweis P-12',
      bemerkung: '',
    },
    {
      id: neueId('bt'),
      bezeichnung: 'Brandschutztüren Bürotrakt (6 Stk.)',
      kategorie: 'tuer',
      istKlasse: 'EI2-30-C',
      sollKlasse: 'EI2-90-C',
      nachweis: '',
      bemerkung: 'Türen in der Brandwand — Klasse nicht ausreichend.',
    },
    {
      id: neueId('bt'),
      bezeichnung: 'Elektro-Leitungsdurchführungen Brandwand',
      kategorie: 'durchfuehrung',
      istKlasse: 'EI90',
      sollKlasse: 'EI90',
      nachweis: 'ETA-15/0287, Abschottungsprotokoll 2023-08',
      bemerkung: '',
    },
  ];

  // --- Fluchtwege --------------------------------------------------------
  p.fluchtwege = [
    {
      id: neueId('fw'),
      bezeichnung: 'Hauptfluchtweg Halle West',
      art: 'hauptfluchtweg',
      laenge: 38,
      breite: 1.8,
      personen: 48,
      fuehrtInsFreie: true,
      sicherheitsbeleuchtung: true,
      fluchtwegorientierung: true,
      panikbeschlag: true,
      bemerkung: 'Direkter Ausgang ins Freie über Tor 3.',
    },
    {
      id: neueId('fw'),
      bezeichnung: 'Treppenhaus Bürotrakt Ost',
      art: 'treppenhaus',
      laenge: 26,
      breite: 1.3,
      personen: 130,
      fuehrtInsFreie: true,
      sicherheitsbeleuchtung: true,
      fluchtwegorientierung: true,
      panikbeschlag: false,
      bemerkung: 'Führt über Foyer ins Freie.',
    },
    {
      id: neueId('fw'),
      bezeichnung: 'Fluchtweg Kellergeschoß Lager',
      art: 'nebenfluchtweg',
      laenge: 44,
      breite: 1.1,
      personen: 6,
      fuehrtInsFreie: false,
      sicherheitsbeleuchtung: false,
      fluchtwegorientierung: false,
      panikbeschlag: false,
      bemerkung: 'Führt über Kellergang in das Treppenhaus.',
    },
  ];

  // --- Löschhilfen -------------------------------------------------------
  p.loeschhilfen = [
    {
      id: neueId('lh'),
      art: 'handfeuerloescher',
      standort: 'Produktionshalle, Säulen A1–A6',
      anzahl: 12,
      loeschmitteleinheiten: 9,
      letztePruefung: '2025-09-15',
      bemerkung: 'Pulverlöscher 6 kg, Glutbrandtauglich.',
    },
    {
      id: neueId('lh'),
      art: 'handfeuerloescher',
      standort: 'Bürotrakt, je Geschoß 2 Stück',
      anzahl: 6,
      loeschmitteleinheiten: 6,
      letztePruefung: '2024-03-08',
      bemerkung: 'Schaumlöscher 6 l.',
    },
    {
      id: neueId('lh'),
      art: 'wandhydrant',
      standort: 'Halle Nord und Süd',
      anzahl: 2,
      loeschmitteleinheiten: 0,
      letztePruefung: '2025-09-15',
      bemerkung: 'Wandhydrant Typ 2 mit formstabilem Schlauch.',
    },
  ];

  p.loeschwasser = {
    menge: 1200,
    erforderlich: 1600,
    dauer: 90,
    hydrantEntfernung: 85,
    rueckhaltungErforderlich: true,
    bemerkung:
      'Kühlschmierstoffe und Öle im Produktionsbereich — Löschwasserrückhaltung über Rückhaltebecken geplant.',
  };

  // --- Anlagentechnik ----------------------------------------------------
  p.anlagen = [
    {
      id: neueId('an'),
      art: 'BMA',
      status: 'vorhanden',
      regelwerk: 'TRVB S 123',
      schutzumfang: 'Vollschutz Bürotrakt, Teilschutz Halle (Technikräume)',
      aufschaltung: false,
      letztePruefung: '2025-04-20',
      naechstePruefung: '2026-04-20',
      bemerkung: 'Aufschaltung zur Feuerwehr derzeit nicht realisiert.',
    },
    {
      id: neueId('an'),
      art: 'RWA',
      status: 'vorhanden',
      regelwerk: 'TRVB S 125',
      schutzumfang: 'Produktionshalle, 8 Lichtkuppeln mit RWA-Funktion',
      aufschaltung: false,
      letztePruefung: '2025-06-11',
      naechstePruefung: '2026-06-11',
      bemerkung: '',
    },
    {
      id: neueId('an'),
      art: 'SIB',
      status: 'vorhanden',
      regelwerk: 'ÖVE/ÖNORM E 8002',
      schutzumfang: 'Alle Fluchtwege im Bürotrakt und in der Halle',
      aufschaltung: false,
      letztePruefung: '2025-02-03',
      naechstePruefung: '2026-02-03',
      bemerkung: 'Einzelbatterieanlage.',
    },
    {
      id: neueId('an'),
      art: 'ALA',
      status: 'nachzuruesten',
      regelwerk: 'TRVB S 158',
      schutzumfang: 'Geplant: Sprachalarmierung für Bürotrakt und Halle',
      aufschaltung: false,
      letztePruefung: '',
      naechstePruefung: '',
      bemerkung: 'Erforderlich wegen Schulungsraum mit 130 Personen.',
    },
  ];

  // --- Organisation ------------------------------------------------------
  p.organisation = {
    brandschutzbeauftragterErforderlich: true,
    brandschutzbeauftragter: 'Ing. Markus Perner',
    brandschutzwarte: 3,
    brandschutzordnungVorhanden: true,
    brandschutzplaeneVorhanden: true,
    brandschutzplaeneStand: '2024-11',
    laufkartenVorhanden: false,
    raeumungsuebungIntervallMonate: 12,
    letzteRaeumungsuebung: '2024-05-14',
    eigenkontrolleIntervallMonate: 3,
    brandschutzbuchGefuehrt: true,
    bemerkung:
      'Brandschutzbeauftragter mit gültiger Ausbildung nach TRVB O 117, Bestellung schriftlich dokumentiert.',
  };

  // --- Abweichungen ------------------------------------------------------
  p.abweichungen = [
    {
      id: neueId('ab'),
      anforderungId: 'oib2-2023-3.4-brandabschnitt-flaeche',
      anforderung: 'Brandabschnittsfläche Produktionshalle (OIB-RL 2, Pkt. 3.4)',
      beschreibung:
        'Die Halle bildet mit 1.850 m² einen Brandabschnitt, der den Richtwert für Produktionsnutzung überschreitet.',
      kompensation:
        'Rauch- und Wärmeabzugsanlage nach TRVB S 125 über die gesamte Hallenfläche, zusätzliche Brandmelder im Deckenbereich, freie Anleiterbarkeit von drei Seiten.',
      nachweis:
        'Vergleichsbetrachtung nach OIB-Leitfaden Abweichungen, Rauchsimulation vom 12.03.2025.',
      gleichwertigkeitBeurteiltVon: 'Hannes Schwinger',
      gleichwertigkeitBeurteiltAm: heute(),
      genehmigt: false,
    },
  ];

  // --- Maßnahmen ---------------------------------------------------------
  p.massnahmen = [
    {
      id: neueId('ma'),
      lfdNr: 1,
      bereich: 'Brandwand Halle / Bürotrakt',
      beschreibung:
        'Die sechs Brandschutztüren in der Brandwand weisen nur EI₂ 30-C auf, erforderlich ist EI₂ 90-C.',
      massnahme:
        'Austausch der Türen gegen geprüfte Elemente der Klasse EI₂ 90-C inklusive Verwendbarkeitsnachweis und Montageprotokoll.',
      art: 'b',
      score: 'D',
      status: 'offen',
      kapitel: '5',
      verbleibend: false,
      grundlage: 'OIB-Richtlinie 2, Punkt 3.4',
      frist: inTagen(30),
      verantwortlich: 'Technische Leitung',
      kosten: 18400,
      bemerkung: '',
    },
    {
      id: neueId('ma'),
      lfdNr: 2,
      bereich: 'Brandmeldeanlage',
      beschreibung:
        'Die BMA ist nicht zur Feuerwehr aufgeschaltet; im Alarmfall erfolgt keine automatische Weiterleitung.',
      massnahme:
        'Herstellung der Aufschaltung zur Landeswarnzentrale inklusive Übertragungseinrichtung und Feuerwehr-Bedienfeld.',
      art: 't',
      score: 'D',
      status: 'in-umsetzung',
      kapitel: '8',
      verbleibend: false,
      grundlage: 'TRVB S 123',
      frist: inTagen(45),
      verantwortlich: 'Brandschutzbeauftragter',
      kosten: 6200,
      bemerkung: 'Angebot liegt vor, Beauftragung erfolgt.',
    },
    {
      id: neueId('ma'),
      lfdNr: 3,
      bereich: 'Kellergeschoß Lager',
      beschreibung:
        'Der Fluchtweg aus dem Fertigwarenlager ist 44 m lang und damit für die Risikoklasse „erhöht“ zu lang; zudem fehlen Sicherheitsbeleuchtung und Kennzeichnung.',
      massnahme:
        'Herstellung eines zweiten Fluchtwegs über die bestehende Kellerstiege Nord, Nachrüstung der Sicherheitsbeleuchtung und Fluchtwegorientierung.',
      art: 'b',
      score: 'D',
      status: 'offen',
      kapitel: '6',
      verbleibend: false,
      grundlage: 'OIB-Richtlinie 2, Punkt 5.1',
      frist: inTagen(90),
      verantwortlich: 'Technische Leitung',
      kosten: 24000,
      bemerkung: '',
    },
    {
      id: neueId('ma'),
      lfdNr: 4,
      bereich: 'Bürotrakt, Feuerlöscher',
      beschreibung:
        'Die Überprüfung der Handfeuerlöscher im Bürotrakt liegt mehr als zwei Jahre zurück.',
      massnahme:
        'Überprüfung sämtlicher Löschgeräte durch einen befugten Fachbetrieb und Dokumentation im Brandschutzbuch.',
      art: 'o',
      score: 'C',
      status: 'offen',
      kapitel: '7',
      verbleibend: false,
      grundlage: 'ÖNORM F 1053 i. V. m. TRVB F 124',
      frist: inTagen(60),
      verantwortlich: 'Brandschutzbeauftragter',
      kosten: 850,
      bemerkung: '',
    },
    {
      id: neueId('ma'),
      lfdNr: 5,
      bereich: 'Löschwasserversorgung',
      beschreibung:
        'Die verfügbare Löschwassermenge von 1.200 l/min unterschreitet den ermittelten Bedarf von 1.600 l/min.',
      massnahme:
        'Errichtung eines Löschwasserbehälters mit 60 m³ Nutzinhalt oder Nachweis einer gleichwertigen Ersatzmaßnahme in Abstimmung mit der Feuerwehr.',
      art: 't',
      score: 'D',
      status: 'offen',
      kapitel: '7',
      verbleibend: false,
      grundlage: 'TRVB F 128',
      frist: inTagen(180),
      verantwortlich: 'Geschäftsführung',
      kosten: 47000,
      bemerkung: 'Abstimmung mit der Freiwilligen Feuerwehr Villach läuft.',
    },
    {
      id: neueId('ma'),
      lfdNr: 6,
      bereich: 'Feuerwehr-Laufkarten',
      beschreibung:
        'Für die vorhandene Brandmeldeanlage sind keine Feuerwehr-Laufkarten vorhanden.',
      massnahme:
        'Erstellung von Laufkarten nach TRVB O 121 je Meldergruppe und Hinterlegung beim Feuerwehr-Bedienfeld.',
      art: 'o',
      score: 'C',
      status: 'offen',
      kapitel: '9',
      verbleibend: false,
      grundlage: 'TRVB O 121',
      frist: inTagen(120),
      verantwortlich: 'Brandschutzbeauftragter',
      kosten: 2400,
      bemerkung: '',
    },
    {
      id: neueId('ma'),
      lfdNr: 7,
      bereich: 'Räumungsübung',
      beschreibung:
        'Die letzte Räumungsübung fand im Mai 2024 statt, das festgelegte Intervall von 12 Monaten ist überschritten.',
      massnahme:
        'Durchführung einer Räumungsübung mit Dokumentation und Auswertung im Brandschutzbuch.',
      art: 'o',
      score: 'B',
      status: 'offen',
      kapitel: '9',
      verbleibend: false,
      grundlage: 'TRVB O 119',
      frist: inTagen(90),
      verantwortlich: 'Brandschutzbeauftragter',
      kosten: 0,
      bemerkung: '',
    },
    {
      id: neueId('ma'),
      lfdNr: 8,
      bereich: 'Decke über Kellergeschoß',
      beschreibung:
        'Für die Kellerdecke ist REI 90 erforderlich, der Bestand weist REI 60 auf; ein Verwendbarkeitsnachweis liegt nicht vor.',
      massnahme:
        'Ertüchtigung der Decke durch Brandschutzbekleidung oder Führung eines gleichwertigen Nachweises durch einen Tragwerksplaner.',
      art: 'b',
      score: 'C',
      status: 'offen',
      kapitel: '5',
      verbleibend: false,
      grundlage: 'OIB-Richtlinie 2, Punkt 3',
      frist: inTagen(150),
      verantwortlich: 'Technische Leitung',
      kosten: 31000,
      bemerkung: '',
    },
  ];

  p.auftragsgegenstand =
    'Gegenstand des Auftrages ist die Erstellung eines Brandschutzkonzeptes für den geplanten Zubau der Produktionshalle Nord samt Beurteilung des bestehenden Bürotraktes am Standort Industriestraße 14, 9500 Villach. Das Konzept dient als Grundlage für das baubehördliche Verfahren und beschreibt die baulichen, technischen und organisatorischen Brandschutzmaßnahmen.';

  p.grundlagen =
    'Grundlage der Beurteilung bilden die OIB-Richtlinie 2 „Brandschutz“ in der Fassung 2023, die OIB-Richtlinie 2.1 für Betriebsbauten, die einschlägigen Technischen Richtlinien Vorbeugender Brandschutz (TRVB) sowie die Bestimmungen der Kärntner Bauordnung und der Arbeitsstättenverordnung. Herangezogen wurden weiters die Bestandspläne des Ziviltechnikerbüros Kern vom 14.02.2024, der Einreichplan des Zubaus vom 08.01.2025 sowie die Feststellungen der Begehung vor Ort.';

  p.conclusio =
    'Das Objekt weist in weiten Teilen einen dem Regelwerk entsprechenden Brandschutz auf. Wesentlicher Handlungsbedarf besteht bei den Brandschutztüren in der Brandwand, der fehlenden Aufschaltung der Brandmeldeanlage sowie beim Fluchtweg aus dem Fertigwarenlager. Bei fristgerechter Umsetzung der angeführten Maßnahmen kann dem Zubau aus brandschutztechnischer Sicht zugestimmt werden. Die Abweichung hinsichtlich der Brandabschnittsfläche der Produktionshalle ist durch die vorgesehenen Kompensationsmaßnahmen als gleichwertig zu beurteilen und mit der Behörde abzustimmen.';

  p.gebaeude.groessterBrandabschnitt = Math.max(
    ...p.brandabschnitte.map((b) => b.flaeche),
  );

  return p;
}
