// INGTEC Berichtsvorlage (.dotx) nach Corporate Design Ausgabe 1.1
// Deckblatt als Einband, Projektdaten und Inhaltsverzeichnis auf Seite 2,
// Formatvorlagen und SAFETY-SCORE-Bausteine. Ausgabe: .docx, danach per
// Nachbearbeitung zur Vorlage (.dotx) mit Tabellenformatvorlage.
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, Header, Footer,
  AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign, LevelFormat, HeadingLevel,
  PageNumber, TabStopType, PageBreak, TableLayoutType, Tab, TableOfContents, SequentialIdentifier,
  HorizontalPositionRelativeFrom, VerticalPositionRelativeFrom, TextWrappingType, LineRuleType,
} = require('docx');

const GRUEN = '9DC31A', SCHWARZ = '1D1D1B', DEZENT = '686F63', BEFUND = 'F2F2F2';
const SCORE = { A: '02A54C', B: '9DC31B', C: 'FFEB5A', D: 'F2BB0A', E: 'E54100' };
const TEXTBREITE = 10174;
const mm = (v) => Math.round((v * 96) / 25.4);
const emu = (v) => Math.round(v * 36000);
const img = (f) => fs.readFileSync(path.join(__dirname, '..', 'grafiken', f));
const bildRun = (f, breiteMm, w, h) => new ImageRun({ type: 'png', data: img(f), transformation: { width: mm(breiteMm), height: Math.round((mm(breiteMm) * h) / w) } });

const run = (text, o = {}) => new TextRun({ text, ...o });
const tabRun = (text, o = {}) => new TextRun({ ...o, children: [new Tab(), text] });
const mono = (t, o = {}) => run(t, { font: 'Consolas', size: 18, ...o });
const plak = (g, size = 18) => run(` ${g} `, { bold: true, size, color: g === 'E' ? 'FFFFFF' : SCHWARZ, shading: { type: ShadingType.CLEAR, color: 'auto', fill: SCORE[g] } });
const p = (children, o = {}) => new Paragraph({ ...o, children: typeof children === 'string' ? [run(children)] : children });
const leer = (after = 120) => new Paragraph({ spacing: { after }, children: [] });

// Beschriftung mit fortlaufender Nummer (Feld SEQ), 8,5 pt kursiv, zentriert
const beschriftung = (art, text) => new Paragraph({ style: 'Beschriftung', children: [run(`${art} `), new SequentialIdentifier(art), run(`: ${text}`)] });

// ---------------------------------------------------------------- Tabellen
// Nur Inhalt und Breiten; Linien, Kopf und erste Spalte kommen aus der
// Tabellenformatvorlage „INGTEC Tabelle“ (Nachbearbeitung unten).
function zelle(inhalt, w, o = {}) {
  const children = Array.isArray(inhalt) ? inhalt : [run(String(inhalt))];
  return new TableCell({
    width: { size: w, type: WidthType.DXA },
    verticalAlign: o.vAlign || VerticalAlign.TOP,
    shading: o.fill ? { type: ShadingType.CLEAR, color: 'auto', fill: o.fill } : undefined,
    children: [new Paragraph({ style: 'Tabellentext', alignment: o.align, children })],
  });
}
function tabelle(spalten, zeilen) {
  const kopf = new TableRow({ tableHeader: true, children: spalten.map((s) => zelle([run(s.t)], s.w, { align: s.align, vAlign: VerticalAlign.BOTTOM })) });
  const rows = zeilen.map((z) => new TableRow({ cantSplit: true, children: (z.zellen || z).map((v, i) => {
    const s = spalten[i];
    const o = { align: s.align, fill: z.fills && z.fills[i], vAlign: z.mitte ? VerticalAlign.CENTER : undefined };
    return zelle(Array.isArray(v) ? v : [run(String(v))], s.w, o);
  }) }));
  return new Table({ style: 'IngtecTabelle', width: { size: spalten.reduce((a, s) => a + s.w, 0), type: WidthType.DXA }, columnWidths: spalten.map((s) => s.w), layout: TableLayoutType.FIXED, rows: [kopf, ...rows] });
}
// Merkmals-/Datentabelle ohne Linien (Deckblatt-Stil, erste Spalte 42 mm)
function daten(paare) {
  const w1 = 2381, w2 = TEXTBREITE - w1;
  return new Table({ style: 'IngtecDaten', width: { size: TEXTBREITE, type: WidthType.DXA }, columnWidths: [w1, w2], layout: TableLayoutType.FIXED,
    rows: paare.map(([a, b]) => new TableRow({ cantSplit: true, children: [zelle([run(a, { bold: true })], w1), zelle([run(b)], w2)] })) });
}

// ---------------------------------------------------------------- Kopf / Fuß
const logo = () => new Paragraph({ alignment: AlignmentType.RIGHT, children: [bildRun('INGTEC-Wortmarke.png', 79, 3000, 549)] });
const kopf = new Header({ children: [logo()] });
const fuss = new Footer({ children: [new Paragraph({ style: 'Fusszeile', tabStops: [{ type: TabStopType.CENTER, position: 5087 }, { type: TabStopType.RIGHT, position: TEXTBREITE }], children: [
  new TextRun({ children: [PageNumber.CURRENT, '/', PageNumber.TOTAL_PAGES] }), run(' '), run('INGTEC', { color: GRUEN }), run(' GmbH'),
  tabRun('[Berichtsnummer]'), new TextRun({ children: [new Tab()] }), bildRun('Signet-Technik-Business-Consulting.png', 34.4, 2600, 748),
] })] });

// Fußzeile des Deckblatts: Haken (hinter dem Text, seitenbezogen), Kerndatenzeile,
// Firmenzeile und Weiter-Pfeil. Sie steht fest am unteren Blattrand.
const HAKEN_B = 125, HAKEN_H = Math.round((125 * 1647) / 2480);
const haken = new ImageRun({ type: 'png', data: img('Deckblatt-Haken-D.png'), transformation: { width: mm(HAKEN_B), height: mm(HAKEN_H) },
  altText: { title: 'Deckblatt-Haken', description: 'SAFETY-SCORE Gesamt Ist — Grafik je Stufe tauschen (Deckblatt-Haken A bis E)', name: 'Deckblatt-Haken' },
  floating: { horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, offset: emu(210 - 13.1 - HAKEN_B) }, verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, offset: emu(186) },
    behindDocument: true, allowOverlap: true, wrap: { type: TextWrappingType.NONE } } });
const kd = (label, wert) => new TableCell({ width: { size: TEXTBREITE / 3, type: WidthType.DXA }, children: [
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [run(label, { size: 20 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [run(wert, { bold: true, size: 24 })] }),
] });
const schraeg = () => run(' / ', { bold: true, color: GRUEN, size: 15 });
const fussDeck = new Footer({ children: [
  new Paragraph({ spacing: { after: 0 }, children: [haken] }),
  new Table({ style: 'IngtecDaten', width: { size: TEXTBREITE, type: WidthType.DXA }, columnWidths: [TEXTBREITE / 3, TEXTBREITE / 3, TEXTBREITE / 3], layout: TableLayoutType.FIXED,
    rows: [new TableRow({ children: [kd('SAFETY-SCORE', '[34]/100 (Stufe [D])'), kd('Bewertungsergebnis', '[schwerwiegender Mangel]'), kd('Revisionsstand', '[TT. Monat JJJJ]')] })] }),
  new Paragraph({ spacing: { after: 0 }, children: [run('', { size: 16 })] }),
  ...Array.from({ length: 6 }, () => new Paragraph({ spacing: { after: 0 }, children: [run('', { size: 16 })] })),
  new Paragraph({ style: 'Fusszeile', spacing: { after: 0 }, children: [
    run('INGTEC', { italics: true, bold: true, color: GRUEN, size: 15 }), run('® GmbH', { size: 15 }), schraeg(),
    run('Firmensitz: Panoramaweg 2', { size: 15 }), schraeg(), run('9851 Seeboden', { size: 15 }), schraeg(), run('Gerichtsstand Klagenfurt', { size: 15 }),
  ] }),
  new Paragraph({ style: 'Fusszeile', tabStops: [{ type: TabStopType.RIGHT, position: TEXTBREITE }], children: [
    run('www.ingtec.at', { size: 15 }), schraeg(), run('office@ingtec.at', { size: 15 }), schraeg(), run('+43 (0) 50318', { size: 15 }), schraeg(), run('ATU 76719678', { size: 15 }),
    tabRun('Gesamtbewertung · Kapitel [14]  ', { bold: true, size: 16 }), bildRun('Weiter-Pfeil.png', 16, 650, 200),
  ] }),
] });

// ---------------------------------------------------------------- Seite 1: Deckblatt (Einband)
const meta = (label, wert) => [
  new Paragraph({ style: 'DeckblattMetaLabel', children: [run(label)] }),
  new Paragraph({ style: 'DeckblattMeta', children: [run(wert)] }),
];
const block = (label, zeilen, o = {}) => [
  new Paragraph({ style: 'DeckblattLabel', children: [run(label, { bold: !!o.fett })] }),
  ...zeilen.map((z, i) => new Paragraph({ style: o.gegenstand ? 'DeckblattGegenstand' : 'DeckblattWert', spacing: { after: i === zeilen.length - 1 ? 420 : 0 }, children: Array.isArray(z) ? z : [run(z)] })),
];
const deckblatt = [
  leer(240),
  ...meta('Datum', '[Wochentag, TT. Monat JJJJ]'),
  ...meta('Berichtsnummer', '[YYMMDD_KD-XXXX_ING-GB-FB-AN-LA-SEQ]'),
  leer(900),
  new Paragraph({ style: 'Deckblatttitel', children: [run('[Berichtsart]')] }),
  ...block('Gegenstand', ['[Gegenstand]'], { gegenstand: true }),
  ...block('Objektstandort', ['[Objektbezeichnung]', '[Straße Nr.]', '[PLZ Ort]']),
  ...block('Sachverständiger', [[run('[Titel] '), run('[Vorname Name]', { bold: true }), run(' [Titel]')]], { fett: true }),
  new Paragraph({ children: [new PageBreak()] }),
];

// ---------------------------------------------------------------- Seite 2: Projektdaten, Inhalt
const seite2 = [
  new Paragraph({ style: 'Seitentitel', children: [run('Projektdaten')] }),
  daten([
    ['Projekt', '[Projektbezeichnung]'],
    ['Gutachtensart', '[Gutachtensart — Anlass]'],
    ['Inspektionsgegenstand', '[Objekt, Anschrift]'],
    ['Auftraggeber', '[Name, Anschrift]'],
    ['Nutzung', '[Nutzungen]'],
    ['Gebäudeklasse', '[GK — Fluchtniveau]'],
  ]),
  beschriftung('Tabelle', 'Projektdaten (Quelle: INGTEC [JJJJ])'),
  new Paragraph({ style: 'Seitentitel', children: [run('Inhaltsverzeichnis')] }),
  new TableOfContents('Inhaltsverzeichnis', { hyperlink: true, headingStyleRange: '1-2' }),
  new Paragraph({ children: [new PageBreak()] }),
];

// ---------------------------------------------------------------- Inhalt: Kapitel und Bausteine
const h1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [run(t)] });
const h2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [run(t)] });
const text = (t) => new Paragraph({ children: [run(t)] });
const inhalt = [
  h1('Auftragsgegenstand'),
  text('[Fließtext Arial 11 pt im Blocksatz. INGTEC im Fließtext kursiv. Einheiten in eckigen Klammern hinter der Beschriftung, jede Aussage mit Quelle bis zur Normstelle.]'),
  h1('Beurteilungsgrundlagen'),
  text('[Rechtsgrundlagen, Normen und Unterlagen mit Ausgabe.]'),
  tabelle([{ t: 'Unterlage', w: 3600 }, { t: 'Stand', w: 1800, align: AlignmentType.CENTER }, { t: 'Herkunft', w: 4774 }], [
    ['[Unterlage]', '[TT.MM.JJJJ]', '[Verfasser]'],
    ['[Unterlage]', '[TT.MM.JJJJ]', '[Verfasser]'],
  ]),
  beschriftung('Tabelle', 'Unterlagen (Quelle: [Quelle])'),

  h1('[Bewertetes Kapitel]'),
  h2('[Teilkapitel]'),
  text('[Beschreibung des Teilkapitels. Die Feststellungen stehen in der folgenden Tabelle; die letzte Zeile fasst sie zum Teilscore zusammen.]'),
  tabelle([{ t: 'Nr.', w: 700, align: AlignmentType.CENTER }, { t: 'Feststellung', w: 7274 }, { t: 'Grad', w: 1100, align: AlignmentType.CENTER }, { t: 'RI', w: 1100, align: AlignmentType.CENTER }], [
    [[run('[3]', { bold: true })], '[Feststellung – Maßnahme: …]', [plak('D')], [mono('8')]],
    [[run('[4]', { bold: true })], '[Feststellung – Maßnahme: …]', [plak('C')], [mono('3')]],
    [[run('[5]', { bold: true })], '[Feststellung – verbleibende Abweichung, keine Maßnahme]', [plak('B')], [mono('1')]],
    { zellen: [[run('')], [run('Teilscore [6.2]', { bold: true, size: 18 }), run('   '), bildRun('Mini-Band-Beispiel-D34-B79.png', 50, 876, 168), run('   '), mono('Ist '), mono('D 34', { bold: true }), mono(' · Soll '), mono('B 79', { bold: true })], [plak('D')], [mono('12')]], fills: [undefined, BEFUND, BEFUND, BEFUND], mitte: true },
  ]),
  beschriftung('Tabelle', 'Feststellungen Teilkapitel [6.2] mit SAFETY-SCORE-Grad, Risikoindex und Teilscore (Quelle: INGTEC [JJJJ])'),
  new Paragraph({ children: [run('Ist [D 34]', { bold: true }), run(' zum Prüfzeitpunkt [TT.MM.JJJJ] · '), run('Soll [B 79]', { bold: true }), run(' nach Umsetzung der Maßnahmen Nr. [3 und 4]; die verbleibende Abweichung Nr. [5] bleibt bestehen.')] }),

  h1('Bewertungsgrundlage — INGTEC SAFETY-SCORE'),
  text('Jede Feststellung erhält einen Grad A bis E. Teilscore = Obergrenze der Stufe der schlechtesten Feststellung minus 0,5 × Risikoindex, höchstens 19 Punkte Abzug, abgerundet. Gesamt = abgerundetes Mittel der Teilscores, höchstens die Obergrenze der Stufe des schlechtesten Teilkapitels. Soll zählt nur verbleibende Abweichungen; Empfehlungen zählen nie.'),
  tabelle([{ t: 'Stufe', w: 900, align: AlignmentType.CENTER }, { t: 'Kurzbewertung', w: 3374 }, { t: 'Frist', w: 1900, align: AlignmentType.CENTER }, { t: 'Punkte', w: 2000, align: AlignmentType.CENTER }, { t: 'Gewicht im RI', w: 2000, align: AlignmentType.CENTER }], [
    ['A', 'Hinweis / kein Mangel', 'keine', '81–100', '0'],
    ['B', 'geringfügiger Mangel', '365 Tage', '61–80', '1'],
    ['C', 'mittlerer Mangel', '180 Tage', '41–60', '3'],
    ['D', 'schwerwiegender Mangel', '30 Tage', '21–40', '8'],
    ['E', 'akuter Mangel', 'sofort', '0–20', '20'],
  ].map(([g, ...r]) => ({ zellen: [[run(g, { bold: true, color: g === 'E' ? 'FFFFFF' : SCHWARZ })], ...r], fills: [SCORE[g]] }))),
  beschriftung('Tabelle', 'SAFETY-SCORE-Stufen (Quelle: INGTEC [JJJJ])'),

  h1('SAFETY-SCORE Gesamtbewertung'),
  text('Der Gesamt-SAFETY-SCORE fasst die Teilscores zusammen. Er folgt dem Mittel der Teilscores, begrenzt durch die Stufe des schlechtesten Teilkapitels.'),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 60 }, children: [bildRun('ScoreVerteilung-Beispiel.png', 170, 2000, 179)] }),
  new Paragraph({ children: [run('[26] Feststellungen zum Prüfzeitpunkt, Risikoindex [43] (Gewichtung A 0, B 1, C 3, D 8, E 20).', { size: 18, color: DEZENT })] }),
  beschriftung('Abbildung', 'Verteilung der Feststellungen nach SAFETY-SCORE-Grad (Quelle: INGTEC [JJJJ])'),
  tabelle([{ t: 'Kap.', w: 900 }, { t: 'Teilkapitel', w: 7174 }, { t: 'Ist', w: 2100, align: AlignmentType.CENTER }], [
    ['[6.1]', '[Teilkapitel]', [plak('A'), mono(' 100')]],
    ['[6.2]', '[Teilkapitel]', [plak('D'), mono(' 34')]],
    { zellen: [[run('')], [run('Gesamt', { bold: true }), run(' (Mittel [67,5] → Deckel [D])')], [plak('D'), mono(' 40')]], fills: [undefined, BEFUND, BEFUND] },
  ]),
  beschriftung('Tabelle', 'Teilscores und Gesamt-SAFETY-SCORE zum Prüfzeitpunkt (Quelle: INGTEC [JJJJ])'),
  new Paragraph({ style: 'BandtachoLabel', tabStops: [{ type: TabStopType.RIGHT, position: TEXTBREITE }], children: [run('Ist · zum Prüfzeitpunkt [TT.MM.JJJJ]'), tabRun('Grad [D]')] }),
  new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, children: [bildRun('Skalengrafik-D.png', 170, 2000, 600)] }),
  new Paragraph({ style: 'BandtachoLabel', children: [run('Soll · erreichbar nach Umsetzung der Maßnahmen Nr. [1 bis 7]')] }),
  new Paragraph({ keepNext: true, children: [plak('B', 20), run(' '), run('[geringfügiger Mangel]', { bold: true }), run(' · [80] Punkte')] }),
  beschriftung('Abbildung', 'SAFETY-SCORE Gesamtbewertung – Ist [D] zum Prüfzeitpunkt [TT.MM.JJJJ]; erreichbar nach Umsetzung der Maßnahmen Nr. [1 bis 7]: Stufe [B] (Quelle: INGTEC [JJJJ])'),
  new Paragraph({ style: 'Haftung', children: [run('Verantwortlichkeit. ', { bold: true }), run('[Haftungshinweis als kursiver Absatz ohne Kasten.]')] }),
];

// ---------------------------------------------------------------- Dokument
const ps = (id, name, run, paragraph, o = {}) => ({ id, name, basedOn: o.basedOn || 'Normal', next: o.next || 'Normal', quickFormat: true, run, paragraph });
const doc = new Document({
  creator: 'INGTEC GmbH', title: 'INGTEC Berichtsvorlage', description: 'Berichtsvorlage nach INGTEC Corporate Design, Ausgabe 1.1',
  features: { updateFields: true },
  styles: {
    default: { document: { run: { font: 'Arial', size: 22, language: { value: 'de-AT' } }, paragraph: { spacing: { after: 120, line: 276, lineRule: LineRuleType.AUTO } } } },
    paragraphStyles: [
      { id: 'Normal', name: 'Normal', run: { font: 'Arial', size: 22 }, paragraph: { alignment: AlignmentType.JUSTIFIED, spacing: { after: 120, line: 276, lineRule: LineRuleType.AUTO } } },
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: 'Arial', size: 28, bold: true, color: '000000' }, paragraph: { alignment: AlignmentType.LEFT, keepNext: true, keepLines: true, spacing: { before: 480, after: 240 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: 'Arial', size: 24, bold: true, color: '000000' }, paragraph: { alignment: AlignmentType.LEFT, keepNext: true, keepLines: true, spacing: { before: 300, after: 160 }, outlineLevel: 1 } },
      ps('Seitentitel', 'INGTEC Seitentitel', { font: 'Microsoft JhengHei UI Light', italics: true, allCaps: true, color: GRUEN, size: 52 }, { alignment: AlignmentType.CENTER, spacing: { before: 360, after: 360 }, keepNext: true }),
      ps('Deckblatttitel', 'INGTEC Deckblatttitel', { font: 'Microsoft JhengHei UI Light', italics: true, allCaps: true, color: GRUEN, size: 78 }, { alignment: AlignmentType.CENTER, spacing: { after: 700 } }),
      ps('DeckblattMetaLabel', 'INGTEC Deckblatt Datum-Beschriftung', { bold: true, size: 16 }, { alignment: AlignmentType.LEFT, indent: { left: 5400 }, spacing: { after: 0 } }, { next: 'DeckblattMeta' }),
      ps('DeckblattMeta', 'INGTEC Deckblatt Datum', { size: 22 }, { alignment: AlignmentType.LEFT, indent: { left: 5400 }, spacing: { after: 160 } }),
      ps('DeckblattLabel', 'INGTEC Deckblatt Beschriftung', { size: 20 }, { alignment: AlignmentType.CENTER, spacing: { after: 40 } }, { next: 'DeckblattWert' }),
      ps('DeckblattWert', 'INGTEC Deckblatt Wert', { size: 24 }, { alignment: AlignmentType.CENTER, spacing: { after: 0 } }),
      ps('DeckblattGegenstand', 'INGTEC Deckblatt Gegenstand', { size: 34, bold: true, italics: true }, { alignment: AlignmentType.CENTER, spacing: { after: 0 } }),
      ps('Beschriftung', 'INGTEC Beschriftung', { size: 17, italics: true }, { alignment: AlignmentType.CENTER, spacing: { before: 80, after: 240 } }),
      ps('Tabellentext', 'INGTEC Tabellentext', { size: 18 }, { alignment: AlignmentType.LEFT, keepNext: true, spacing: { before: 0, after: 0, line: 252, lineRule: LineRuleType.AUTO } }),
      ps('BandtachoLabel', 'INGTEC Bandtacho Beschriftung', { bold: true, allCaps: true, size: 16, color: DEZENT, characterSpacing: 12 }, { alignment: AlignmentType.LEFT, keepNext: true, spacing: { before: 200, after: 60 } }),
      ps('Haftung', 'INGTEC Haftungshinweis', { italics: true, size: 20 }, { spacing: { before: 360, after: 120 } }),
      ps('Fusszeile', 'INGTEC Fußzeile', { size: 16 }, { alignment: AlignmentType.LEFT, spacing: { after: 0 } }),
    ],
  },
  numbering: { config: [{ reference: 'kap', levels: [
    { level: 0, format: LevelFormat.DECIMAL, text: '%1', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 567, hanging: 567 } } } },
    { level: 1, format: LevelFormat.DECIMAL, text: '%1.%2', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 709, hanging: 709 } } } },
  ] }] },
  sections: [{
    properties: { titlePage: true, page: { size: { width: 11906, height: 16838 }, margin: { top: 1635, right: 740, bottom: 1134, left: 992, header: 709, footer: 397 } } },
    headers: { default: kopf, first: new Header({ children: [logo()] }) },
    footers: { default: fuss, first: fussDeck },
    children: [...deckblatt, ...seite2, ...inhalt],
  }],
});

Packer.toBuffer(doc).then((b) => {
  fs.writeFileSync(path.join(__dirname, 'roh.docx'), b);
  console.log('roh.docx', b.length);
});
