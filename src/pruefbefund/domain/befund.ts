/**
 * Zusammenbau des einseitigen Prüfbefundes (PRD Abschnitt 11).
 *
 * Alle rechtlich tragenden Bestandteile — Titelzeile, Haupttext, Prüfinhalt
 * und Fußnote — werden aus **einem** Objekt abgeleitet: der Prüfart. Es gibt
 * keinen Weg, auf dem ein §-7-Kopf mit §-8-Text zusammentreffen könnte.
 */

import {
  LEGAL_RESULTS,
  type LegalResult,
} from './enums';
import { bauartLabel, familieLabel } from './families';
import { deutsch } from './intervall';
import { pruefart } from './legal/pruefart';
import { regel, regelstandZum, zitat, type Regelstand } from './legal/rules';
import { attributAnzeige, feldDefinition, sichtbareFelder } from './schema';
import type {
  Asset,
  Customer,
  Inspection,
  Inspector,
  Site,
} from './types';
import { hatVorkommnisse } from './types';

/** Version der Befundvorlage — wird revisionssicher mitgeführt (AC-11). */
export const TEMPLATE_VERSION = '2026.1-onepage';

/**
 * Höchstzahl der direkt im Befund dargestellten Mängel. Darüber hinaus bleibt
 * der Prüfbefund einseitig und verweist auf die Anlage M-01 (PRD 11, AC-10).
 */
export const MAX_MAENGEL_IM_BEFUND = 3;

/**
 * Höchstzahl der im Befund dargestellten Zeilen des Prüfgegenstandes.
 *
 * Dasselbe Prinzip wie bei den Mängeln: Der Prüfbefund bleibt einseitig,
 * überzählige technische Kenndaten wandern in die Anlage T-01 (AC-09, AC-10).
 * Der Wert ist an der dichtesten Verdichtungsstufe gemessen.
 */
export const MAX_PRUEFGEGENSTAND_ZEILEN = 30;

/**
 * Typografische Verdichtung der Seite. Sie wird deterministisch aus dem
 * Inhaltsumfang abgeleitet, damit Bildschirm und Druck dieselbe Seite zeigen.
 */
export type Verdichtung = 'normal' | 'dicht' | 'sehr-dicht';

/* ==========================================================================
 * Prüfbefundnummer
 * ======================================================================= */

/**
 * Prüfbefundnummernlogik, übernommen aus `210713_Anlagenprüfung.xlsm`
 * (PRD 20) und auf ein stabiles Schema gebracht:
 *
 *   `PB-<Jahr>-<Kundennummer ohne Präfix>-<Familienkürzel>-<laufend>`
 *
 * Beispiel: `PB-2026-1042-TOR-017`
 */
export function befundnummer(opt: {
  jahr: number;
  kundennummer: string;
  familienKuerzel: string;
  laufend: number;
}): string {
  const kunde = opt.kundennummer.replace(/^KD-?/i, '').trim() || '0000';
  const lfd = String(opt.laufend).padStart(3, '0');
  return `PB-${opt.jahr}-${kunde}-${opt.familienKuerzel}-${lfd}`;
}

/* ==========================================================================
 * Modell des Befundes
 * ======================================================================= */

export interface BefundZeile {
  label: string;
  wert: string;
}

export interface BefundMangel {
  nummer: number;
  beschreibung: string;
  bauteil: string;
  einstufung: string;
  frist: string;
}

export interface BefundModell {
  /* Bereich A */
  kopf: {
    betreiber: string[];
    standort: string[];
    pruefstelle: string[];
    befundnummer: string;
    pruefdatum: string;
  };
  /* Bereich B — ausschließlich eine der beiden Rechtsgrundlagen */
  titel: string;
  titelzeile: string;
  /* Bereich C */
  pruefgegenstand: BefundZeile[];
  /** Verweis auf die Anlage, wenn nicht alle Kenndaten dargestellt werden. */
  pruefgegenstandAnlagenverweis: string | null;
  /* Bereich D */
  pruefung: BefundZeile[];
  haupttext: string[];
  /* Bereich E */
  ergebnis: {
    code: LegalResult;
    zeile: string;
    ton: 'gut' | 'warn' | 'gefahr' | 'neutral';
  };
  /* Bereich F */
  maengel: {
    anzahl: number;
    dargestellt: BefundMangel[];
    /** Verweis auf die Anlage, wenn nicht alle Mängel dargestellt werden. */
    anlagenverweis: string | null;
  };
  /* Bereich G */
  pruefer: BefundZeile[];
  unterschriftVorhanden: boolean;
  /* Bereich H */
  fussnote: string;
  /* Darstellung */
  verdichtung: Verdichtung;
  /* Revisionsangaben */
  regelstand: Regelstand;
  templateVersion: string;
}

/* ==========================================================================
 * Zusammenbau
 * ======================================================================= */

export interface BefundEingabe {
  inspection: Inspection;
  asset: Asset;
  customer: Customer;
  site: Site;
  inspector: Inspector | null;
}

export function baueBefund({
  inspection,
  asset,
  customer,
  site,
  inspector,
}: BefundEingabe): BefundModell {
  // Die Prüfart trägt alles Rechtliche. Sie wird genau einmal aufgelöst.
  const art = pruefart(inspection.pruefart);
  const ergebnis: LegalResult = inspection.ergebnis ?? 'NOT_ASSESSABLE';
  // Rechtsstand nach Prüfdatum, nicht nach dem aktuellen Tag (PRD 6).
  const regelstand = regelstandZum(inspection.pruefdatum);

  /* ---- Bereich C: nur Felder, die für diese Familie definiert sind ----- */
  const stamm: BefundZeile[] = [
    { label: 'Anlagenfamilie', wert: familieLabel(asset.familie) },
    { label: 'Bauart', wert: bauartLabel(asset.familie, asset.bauart) },
    { label: 'Bezeichnung', wert: asset.bezeichnung },
    { label: 'Inventarnummer', wert: asset.inventarnummer },
    { label: 'Hersteller', wert: asset.hersteller },
    { label: 'Type', wert: asset.type },
    { label: 'Serien-/Herstellnummer', wert: asset.seriennummer },
    { label: 'Baujahr', wert: asset.baujahr ? String(asset.baujahr) : '' },
    { label: 'Inbetriebnahme', wert: asset.inbetriebnahme ? deutsch(asset.inbetriebnahme) : '' },
    { label: 'Aufstellungsort', wert: asset.aufstellungsort },
  ].filter((z) => z.wert.trim() !== '');

  // Technische Kenndaten ausschließlich aus dem Schema der Familie. Felder,
  // die für die Anlagenart nicht definiert sind, erscheinen nicht (PRD 11 C).
  const technisch: BefundZeile[] = sichtbareFelder({
    familie: asset.familie,
    bauart: asset.bauart,
    attr: asset.attribute,
  })
    .map((feld) => {
      const def = feldDefinition(asset.familie, feld.key);
      if (!def) return null;
      const wert = attributAnzeige(def, asset.attribute[feld.key]);
      return wert ? { label: def.label, wert } : null;
    })
    .filter((z): z is BefundZeile => z !== null);

  /* ---- Bereich D ------------------------------------------------------- */
  // Tragende Rechtsgrundlage aus dem zum Prüfdatum gültigen Regelstand; fehlt
  // sie dort, wird die Kurzform der Prüfart verwendet statt still zu scheitern.
  const rechtsgrundlage = regel(regelstand, art.rechtsgrundlageRef);
  const grundlagenText = [
    rechtsgrundlage ? zitat(rechtsgrundlage) : art.kurz,
    ...inspection.grundlagen.map((g) =>
      g.ausgabe ? `${g.bezeichnung} (${g.ausgabe})` : g.bezeichnung,
    ),
  ].join('; ');

  const pruefung: BefundZeile[] = [
    { label: 'Prüfdatum', wert: deutsch(inspection.pruefdatum) },
    { label: 'Prüfart', wert: art.titelzeile },
    { label: 'Prüfgrundlagen', wert: grundlagenText },
    {
      label: 'Durchgeführter Prüfumfang',
      wert:
        inspection.pruefumfang.trim() ||
        `${inspection.items.length} Prüfpunkte gemäß ${art.kurz} und zugeordneten Prüfgrundlagen`,
    },
  ];
  if (inspection.prueflast.trim()) {
    pruefung.push({ label: 'Prüflast', wert: inspection.prueflast });
  }
  if (art.wiederkehrend) {
    pruefung.push({
      label: 'Änderungen/Vorkommnisse seit letzter Prüfung',
      wert: hatVorkommnisse(inspection.vorkommnisse)
        ? inspection.vorkommnisse.erlaeuterung.trim() ||
          'ja — siehe Erläuterung in der Prüfdokumentation'
        : 'keine',
    });
  }

  /* ---- Bereich F ------------------------------------------------------- */
  const maengel = inspection.findings.filter((f) => f.typ === 'DEFECT');
  const dargestellt = maengel.slice(0, MAX_MAENGEL_IM_BEFUND).map((f) => ({
    nummer: f.nummer,
    beschreibung: f.beschreibung,
    bauteil: f.bauteil,
    einstufung: f.einstufung,
    frist: f.frist ? deutsch(f.frist) : '—',
  }));
  const anlagenverweis =
    maengel.length > MAX_MAENGEL_IM_BEFUND
      ? `Es wurden ${maengel.length} Mängel festgestellt. Einzelheiten siehe Anlage M-01 zum Prüfbefund.`
      : null;

  /* ---- Bereich G ------------------------------------------------------- */
  const pruefer: BefundZeile[] = inspector
    ? [
        { label: 'Prüfer', wert: inspector.name },
        { label: 'Qualifikation', wert: inspector.qualifikation },
        { label: 'Prüfstelle', wert: inspector.pruefstelle },
        { label: 'Anschrift', wert: inspector.anschrift },
        {
          label: 'Freigabedatum',
          wert: inspection.freigabedatum ? deutsch(inspection.freigabedatum) : '—',
        },
      ]
    : [{ label: 'Prüfer', wert: 'nicht zugeordnet' }];

  const haupttext = art.haupttext({
    pruefdatum: deutsch(inspection.pruefdatum),
    ergebnis,
    bedingungen: inspection.weiterbenuetzung.bedingungen,
  });

  const pruefgegenstand = [...stamm, ...technisch];
  const dargestellterGegenstand = pruefgegenstand.slice(
    0,
    MAX_PRUEFGEGENSTAND_ZEILEN,
  );
  const ueberzaehlig = pruefgegenstand.length - dargestellterGegenstand.length;

  return {
    kopf: {
      betreiber: [
        customer.name,
        `${customer.strasse}`,
        `${customer.plz} ${customer.ort}`,
      ].filter((z) => z.trim() !== ''),
      standort: [
        site.bezeichnung,
        site.strasse,
        `${site.plz} ${site.ort}`,
      ].filter((z) => z.trim() !== ''),
      pruefstelle: inspector
        ? [inspector.pruefstelle, inspector.anschrift]
        : ['INGTEC GmbH'],
      befundnummer: inspection.befundnummer,
      pruefdatum: deutsch(inspection.pruefdatum),
    },
    titel: 'PRÜFBEFUND',
    // Genau eine Rechtsgrundlage — die der Prüfart (PRD 11, Bereich B).
    titelzeile: art.titelzeile,
    pruefgegenstand: dargestellterGegenstand,
    pruefgegenstandAnlagenverweis:
      ueberzaehlig > 0
        ? `Weitere ${ueberzaehlig} technische Kenndaten siehe Anlage T-01 zum Prüfbefund.`
        : null,
    pruefung,
    haupttext,
    ergebnis: {
      code: ergebnis,
      zeile: LEGAL_RESULTS[ergebnis].befundzeile,
      ton: LEGAL_RESULTS[ergebnis].ton,
    },
    maengel: { anzahl: maengel.length, dargestellt, anlagenverweis },
    verdichtung: verdichtungsstufe({
      gegenstandZeilen: dargestellterGegenstand.length,
      pruefungZeilen: pruefung.length,
      maengelZeilen: dargestellt.length,
      haupttextZeichen: haupttext.reduce((n, p) => n + p.length, 0),
      mitAnlagenverweis: anlagenverweis !== null || ueberzaehlig > 0,
    }),
    pruefer,
    unterschriftVorhanden: inspection.unterschriftVorhanden,
    fussnote: art.fussnote,
    regelstand,
    templateVersion: TEMPLATE_VERSION,
  };
}

/* ==========================================================================
 * Verdichtung
 * ======================================================================= */

interface Umfang {
  gegenstandZeilen: number;
  pruefungZeilen: number;
  maengelZeilen: number;
  haupttextZeichen: number;
  mitAnlagenverweis: boolean;
}

/**
 * Leitet die Verdichtungsstufe aus dem Inhaltsumfang ab.
 *
 * Die Gewichte sind an der tatsächlichen Seitenhöhe kalibriert: Eine Zeile des
 * Prüfgegenstandes belegt in zwei Spalten eine halbe Zeilenhöhe, eine Zeile
 * des Prüfungsblocks eine ganze, eine Mangelzeile gut das Doppelte.
 */
export function verdichtungsstufe(u: Umfang): Verdichtung {
  const punkte =
    u.gegenstandZeilen * 0.5 +
    u.pruefungZeilen * 1.1 +
    u.maengelZeilen * 2.2 +
    (u.maengelZeilen > 0 ? 3 : 0) +
    u.haupttextZeichen / 150 +
    (u.mitAnlagenverweis ? 1.2 : 0);

  if (punkte <= 22) return 'normal';
  if (punkte <= 29) return 'dicht';
  return 'sehr-dicht';
}

/* ==========================================================================
 * Revisionssicherung
 * ======================================================================= */

/**
 * Stabiler Hash über den Befundinhalt (FNV-1a, 32 Bit, hexadezimal).
 *
 * Bewusst ohne Krypto-Bibliothek: Der Hash dient der Nachvollziehbarkeit, mit
 * welchem Inhalt eine Dokumentversion erzeugt wurde, nicht der Abwehr
 * gezielter Manipulation.
 */
export function befundHash(modell: BefundModell): string {
  const text = JSON.stringify(modell);
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/** Textfassung für Export und Weitergabe. */
export function befundAlsText(modell: BefundModell): string {
  const zeilen: string[] = [];
  zeilen.push(modell.titel);
  zeilen.push(modell.titelzeile);
  zeilen.push('');
  zeilen.push(`Prüfbefundnummer: ${modell.kopf.befundnummer}`);
  zeilen.push(`Prüfdatum: ${modell.kopf.pruefdatum}`);
  zeilen.push('');
  zeilen.push('EIGENTÜMER / BETREIBER');
  zeilen.push(...modell.kopf.betreiber);
  zeilen.push('');
  zeilen.push('STANDORT');
  zeilen.push(...modell.kopf.standort);
  zeilen.push('');
  zeilen.push('PRÜFGEGENSTAND');
  for (const z of modell.pruefgegenstand) zeilen.push(`  ${z.label}: ${z.wert}`);
  zeilen.push('');
  zeilen.push('PRÜFUNG');
  for (const z of modell.pruefung) zeilen.push(`  ${z.label}: ${z.wert}`);
  zeilen.push('');
  zeilen.push(...modell.haupttext);
  zeilen.push('');
  zeilen.push(`ERGEBNIS: ${modell.ergebnis.zeile}`);
  if (modell.maengel.anzahl > 0) {
    zeilen.push('');
    zeilen.push('MÄNGEL');
    for (const m of modell.maengel.dargestellt) {
      zeilen.push(`  ${m.nummer}. ${m.beschreibung} (${m.bauteil}), Frist ${m.frist}`);
    }
    if (modell.maengel.anlagenverweis) zeilen.push(`  ${modell.maengel.anlagenverweis}`);
  }
  zeilen.push('');
  zeilen.push('PRÜFER');
  for (const z of modell.pruefer) zeilen.push(`  ${z.label}: ${z.wert}`);
  zeilen.push('');
  zeilen.push(modell.fussnote);
  return zeilen.join('\n');
}
