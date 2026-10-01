/**
 * Kritische Validierungen vor der PDF-Erzeugung (PRD Abschnitt 16).
 *
 * Die Validierung arbeitet gegen den **zusammengesetzten** Befund, nicht gegen
 * einzelne Eingabefelder. Dadurch werden auch Zustände erkannt, die erst durch
 * nachträgliche Änderungen entstehen — etwa eine Checkliste, die noch die
 * Mindestprüfinhalte der zuvor gewählten Prüfart trägt.
 */

import {
  LEGAL_RESULTS,
  type LegalResult,
  type ReportStatus,
} from './enums';
import { anlagenfremdeFelder } from './schema';
import { mindestpruefinhalte, pruefart } from './legal/pruefart';
import { beurteilePflicht } from './legal/applicability';
import type { Asset, Inspection, Inspector } from './types';

/* ==========================================================================
 * Befundarten
 * ======================================================================= */

export type Schwere =
  /** Verhindert die Erzeugung des Befundes. */
  | 'BLOCKER'
  /** Verhindert die vollständige, grüne Abschlussdarstellung. */
  | 'NICHT_FINAL'
  /** Hinweis ohne Sperrwirkung. */
  | 'WARNUNG';

export const SCHWERE_LABEL: Record<Schwere, string> = Object.freeze({
  BLOCKER: 'blockierend',
  NICHT_FINAL: 'nicht abschließbar',
  WARNUNG: 'Warnung',
});

export interface Pruefmeldung {
  /** Stabile Regelkennung, z. B. "V-03". */
  code: string;
  schwere: Schwere;
  text: string;
  /** Betroffener Bereich für die Navigation in der Oberfläche. */
  bereich:
    | 'pruefart'
    | 'checkliste'
    | 'maengel'
    | 'ergebnis'
    | 'grundlagen'
    | 'stammdaten'
    | 'pruefer';
}

export interface Validierungsergebnis {
  meldungen: Pruefmeldung[];
  blocker: Pruefmeldung[];
  nichtFinal: Pruefmeldung[];
  warnungen: Pruefmeldung[];
  /** Darf der Befund erzeugt werden? */
  erzeugbar: boolean;
  /**
   * Darf der Workflow als vollständig abgeschlossen (grün) dargestellt
   * werden? Setzt zusätzlich die Abwesenheit von `NICHT_FINAL` voraus.
   */
  abschliessbar: boolean;
}

/* ==========================================================================
 * Validierung
 * ======================================================================= */

export interface ValidierungsEingabe {
  inspection: Inspection;
  asset: Asset;
  inspector: Inspector | null;
}

export function validiere({
  inspection,
  asset,
  inspector,
}: ValidierungsEingabe): Validierungsergebnis {
  const m: Pruefmeldung[] = [];
  const art = pruefart(inspection.pruefart);
  const maengel = inspection.findings.filter((f) => f.typ === 'DEFECT');
  const ergebnis = inspection.ergebnis;

  /* ---- V-01/V-02: Prüfart und Prüfinhalt müssen zusammenpassen --------- */
  // „§7-Header + §8-Haupttext" und „§8-Header + §7-Prüfinhalt" (PRD 16).
  const erlaubteInhalte = new Set(
    mindestpruefinhalte(inspection.pruefart, {
      arbeitskorb: asset.attribute.arbeitskorb === true,
    }).map((p) => p.id),
  );
  const gesetzlicheItems = inspection.items.filter((i) => i.herkunft === 'GESETZ');
  const fremdeInhalte = gesetzlicheItems.filter(
    (i) => !erlaubteInhalte.has(i.katalogRef),
  );
  if (fremdeInhalte.length > 0) {
    m.push({
      code: 'V-01',
      schwere: 'BLOCKER',
      bereich: 'checkliste',
      text:
        `Die Checkliste enthält ${fremdeInhalte.length} gesetzliche Prüfinhalte, ` +
        `die nicht zur Prüfart „${art.titelzeile}" gehören ` +
        `(${fremdeInhalte.map((i) => i.katalogRef).join(', ')}). ` +
        'Prüfinhalt und Prüfart müssen aus derselben Prüfart stammen. ' +
        'Die Checkliste ist neu aufzubauen.',
    });
  }
  const fehlendeInhalte = [...erlaubteInhalte].filter(
    (id) => !gesetzlicheItems.some((i) => i.katalogRef === id),
  );
  if (fehlendeInhalte.length > 0) {
    m.push({
      code: 'V-02',
      schwere: 'BLOCKER',
      bereich: 'checkliste',
      text:
        `Die gesetzlichen Mindestprüfinhalte der Prüfart „${art.titelzeile}" sind ` +
        `unvollständig. Es fehlen: ${fehlendeInhalte.join(', ')}.`,
    });
  }

  /* ---- V-03: Abnahme + Weiterbenützung § 6 Abs. 3 ---------------------- */
  if (
    ergebnis !== null &&
    !art.erlaubteErgebnisse.includes(ergebnis)
  ) {
    m.push({
      code: 'V-03',
      schwere: 'BLOCKER',
      bereich: 'ergebnis',
      text:
        `Der Ergebniszustand „${LEGAL_RESULTS[ergebnis].bedeutung}" ist bei der ` +
        `Prüfart „${art.titelzeile}" nicht zulässig. ` +
        (ergebnis === 'DEFECTS_USE_ALLOWED_6_3'
          ? '§ 6 Abs. 3 AM-VO gilt ausschließlich für wiederkehrende Prüfungen.'
          : ''),
    });
  }

  /* ---- V-04: keine Mängel + § 6 Abs. 3 --------------------------------- */
  if (ergebnis === 'DEFECTS_USE_ALLOWED_6_3' && maengel.length === 0) {
    m.push({
      code: 'V-04',
      schwere: 'BLOCKER',
      bereich: 'ergebnis',
      text:
        'Die Weiterbenützung gemäß § 6 Abs. 3 AM-VO setzt mindestens einen ' +
        'festgestellten Mangel voraus. Es ist kein Mangel erfasst.',
    });
  }

  /* ---- V-05: Mängel + kein Benützungsentscheid -------------------------- */
  if (ergebnis === null) {
    m.push({
      code: 'V-05',
      schwere: 'BLOCKER',
      bereich: 'ergebnis',
      text:
        'Es wurde kein Ergebniszustand festgelegt. Der Prüfer muss die ' +
        'Benützungsentscheidung ausdrücklich treffen; sie wird nicht aus der ' +
        'Mängelanzahl abgeleitet.',
    });
  } else if (maengel.length > 0 && ergebnis === 'NO_DEFECTS') {
    m.push({
      code: 'V-05',
      schwere: 'BLOCKER',
      bereich: 'ergebnis',
      text:
        `Es sind ${maengel.length} Mängel erfasst, der Ergebniszustand lautet ` +
        'jedoch „keine Mängel festgestellt". Ergebnis und Mängelliste widersprechen einander.',
    });
  }

  /* ---- V-06: § 6 Abs. 3 ohne Bedingungen -------------------------------- */
  if (ergebnis === 'DEFECTS_USE_ALLOWED_6_3') {
    const w = inspection.weiterbenuetzung;
    const fehlend: string[] = [];
    if (!w.begruendung.trim()) fehlend.push('Begründung des Prüfers');
    if (!w.bedingungen.trim()) fehlend.push('Bedingungen und Einschränkungen');
    if (!w.behebungBis) fehlend.push('spätester Behebungstermin');
    if (w.betroffeneMaengel.length === 0) fehlend.push('betroffene Mängel');
    if (!w.verantwortlichBetreiber.trim())
      fehlend.push('verantwortliche Person des Betreibers');
    if (fehlend.length > 0) {
      m.push({
        code: 'V-06',
        schwere: 'BLOCKER',
        bereich: 'ergebnis',
        text:
          'Die Weiterbenützung gemäß § 6 Abs. 3 AM-VO ist unvollständig ' +
          `dokumentiert. Es fehlen: ${fehlend.join(', ')}.`,
      });
    }

    /* ---- V-07: Information der Arbeitnehmer:innen nicht erfasst --------- */
    const b = inspection.bestaetigungBetreiber;
    if (!b.bestaetigt || !b.name.trim() || !b.datum) {
      m.push({
        code: 'V-07',
        schwere: 'NICHT_FINAL',
        bereich: 'ergebnis',
        text:
          'Die Bestätigung über die Information der betroffenen ' +
          'Arbeitnehmer:innen gemäß § 6 Abs. 3 Z 2 AM-VO liegt nicht vollständig ' +
          'vor. Der Workflow kann nicht als abgeschlossen dargestellt werden.',
      });
    }
  }

  /* ---- V-08: fehlender Prüfer ------------------------------------------ */
  if (!inspector) {
    m.push({
      code: 'V-08',
      schwere: 'BLOCKER',
      bereich: 'pruefer',
      text:
        'Es ist kein Prüfer zugeordnet. § 11 AM-VO verlangt die Angabe des ' +
        'Prüfers bzw. der Prüfstelle im Prüfbefund.',
    });
  } else {
    /* ---- V-14: Freigabeberechtigung (PRD 14) --------------------------- */
    const berechtigt = inspector.qualifikationen.some(
      (q) =>
        q.pruefarten.includes(inspection.pruefart) &&
        q.familien.includes(asset.familie) &&
        (!q.gueltigBis || q.gueltigBis >= inspection.pruefdatum),
    );
    if (!berechtigt) {
      m.push({
        code: 'V-14',
        schwere: 'BLOCKER',
        bereich: 'pruefer',
        text:
          `${inspector.name} ist für die Prüfart „${art.titelzeile}" in Verbindung ` +
          'mit dieser Anlagenfamilie zum Prüfdatum nicht freigabeberechtigt.',
      });
    }
  }

  /* ---- V-09: fehlende Unterschrift ------------------------------------- */
  if (!inspection.unterschriftVorhanden) {
    m.push({
      code: 'V-09',
      schwere: 'BLOCKER',
      bereich: 'pruefer',
      text:
        'Die Unterschrift des Prüfers fehlt. Sie gehört zum Mindestinhalt des ' +
        'Prüfbefundes gemäß § 11 AM-VO.',
    });
  }

  /* ---- V-10: fehlende Prüfinhalte -------------------------------------- */
  if (inspection.items.length === 0) {
    m.push({
      code: 'V-10',
      schwere: 'BLOCKER',
      bereich: 'checkliste',
      text:
        'Es sind keine Prüfinhalte erfasst. § 11 AM-VO verlangt Angaben über ' +
        'die Prüfinhalte im Prüfbefund.',
    });
  } else {
    const offen = inspection.items.filter((i) => i.ergebnis === null);
    if (offen.length > 0) {
      m.push({
        code: 'V-10',
        schwere: 'BLOCKER',
        bereich: 'checkliste',
        text: `${offen.length} von ${inspection.items.length} Prüfpunkten sind nicht beurteilt.`,
      });
    }
  }

  /* ---- V-15: Prüfdatum fehlt (§ 11 AM-VO) ------------------------------ */
  if (!inspection.pruefdatum) {
    m.push({
      code: 'V-15',
      schwere: 'BLOCKER',
      bereich: 'stammdaten',
      text: 'Das Prüfdatum fehlt. Es gehört zum Mindestinhalt gemäß § 11 AM-VO.',
    });
  }

  /* ---- V-11: Norm ohne Ausgabe ----------------------------------------- */
  for (const g of inspection.grundlagen) {
    if (g.kategorie === 'TECHNISCHES_REGELWERK' && !g.ausgabe.trim()) {
      m.push({
        code: 'V-11',
        schwere: 'WARNUNG',
        bereich: 'grundlagen',
        text: `Zur Prüfgrundlage „${g.bezeichnung}" fehlt die Ausgabe bzw. Fassung.`,
      });
    }
  }

  /* ---- V-12: Norm ohne Zuordnung zur Anlagenart ------------------------ */
  for (const g of inspection.grundlagen) {
    if (g.kategorie === 'TECHNISCHES_REGELWERK' && !g.anwendungsgrund.trim()) {
      m.push({
        code: 'V-12',
        schwere: 'WARNUNG',
        bereich: 'grundlagen',
        text:
          `Zur Prüfgrundlage „${g.bezeichnung}" ist kein Anwendungsgrund für diese ` +
          'Anlagenart hinterlegt. Eine Norm wird nicht allein durch die Auswahl ' +
          'der Anlagenart verbindlich — fachliche Freigabe erforderlich.',
      });
    }
  }

  /* ---- V-13: anlagenfremdes Feld --------------------------------------- */
  const fremdeFelder = anlagenfremdeFelder(asset.familie, asset.attribute);
  if (fremdeFelder.length > 0) {
    m.push({
      code: 'V-13',
      schwere: 'BLOCKER',
      bereich: 'stammdaten',
      text:
        `Das Arbeitsmittel trägt ${fremdeFelder.length} Feld(er) aus einer fremden ` +
        `Anlagenfamilie: ${fremdeFelder.join(', ')}. ` +
        'Anlagenspezifische Felder dürfen nicht auf fachfremden Anlagen erscheinen.',
    });
  }

  /* ---- V-16: fachliche Freigabe bei ungewöhnlicher Prüfart ------------- */
  const pflicht = beurteilePflicht(
    { familie: asset.familie, bauart: asset.bauart, attr: asset.attribute },
    inspection.pruefart,
  );
  if (pflicht.freigabePflichtig) {
    const f = inspection.fachfreigabe;
    if (!f.erteilt || !f.begruendung.trim() || !f.freigegebenVon.trim()) {
      m.push({
        code: 'V-16',
        schwere: 'BLOCKER',
        bereich: 'pruefart',
        text:
          `Für diese Anlagenkonfiguration ist die Prüfart „${art.titelzeile}" nicht ` +
          'als Standardprüfpflicht hinterlegt. Eine begründete und protokollierte ' +
          'fachliche Freigabe ist erforderlich.',
      });
    }
  }

  const blocker = m.filter((x) => x.schwere === 'BLOCKER');
  const nichtFinal = m.filter((x) => x.schwere === 'NICHT_FINAL');
  const warnungen = m.filter((x) => x.schwere === 'WARNUNG');

  return {
    meldungen: m,
    blocker,
    nichtFinal,
    warnungen,
    erzeugbar: blocker.length === 0,
    abschliessbar: blocker.length === 0 && nichtFinal.length === 0,
  };
}

/* ==========================================================================
 * Statuswechsel
 * ======================================================================= */

/**
 * Darf der Befund in den Zielstatus wechseln? Ab `SIGNED` ist der Inhalt
 * gesperrt; eine Änderung erzeugt eine neue Dokumentversion (PRD 15).
 */
export function statuswechselErlaubt(
  von: ReportStatus,
  nach: ReportStatus,
  validierung: Validierungsergebnis,
): { erlaubt: boolean; grund?: string } {
  if (von === 'SIGNED' || von === 'SUPERSEDED') {
    return {
      erlaubt: false,
      grund:
        'Der Befund ist signiert und inhaltlich gesperrt. Eine Änderung erzeugt ' +
        'einen neuen Befund mit Bezug auf die ersetzte Version.',
    };
  }
  if (nach === 'DRAFT') return { erlaubt: true };
  if (!validierung.erzeugbar) {
    return {
      erlaubt: false,
      grund: `${validierung.blocker.length} blockierende Prüfmeldung(en) offen.`,
    };
  }
  if (nach === 'SIGNED' && !validierung.abschliessbar) {
    return {
      erlaubt: false,
      grund:
        'Der Workflow ist nicht vollständig abgeschlossen: ' +
        validierung.nichtFinal.map((x) => x.text).join(' '),
    };
  }
  return { erlaubt: true };
}

/** Zulässige Ergebniszustände einer Prüfart für die Oberfläche. */
export function waehlbareErgebnisse(inspection: Inspection): LegalResult[] {
  return [...pruefart(inspection.pruefart).erlaubteErgebnisse];
}
