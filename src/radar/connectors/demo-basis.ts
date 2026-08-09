/**
 * Gemeinsame Grundlage der mitgelieferten Connectoren.
 *
 * Abruf, Suche und Änderungserkennung sind bei allen Plattformen gleich; nur
 * `normalize()` unterscheidet sich, weil nur dort plattformspezifisches Wissen
 * steckt. Die Fassung hier bedient sich aus dem mitgelieferten Datenbestand
 * statt aus dem Netz — Abruf und Normalisierung sind aber vollständig
 * getrennt, sodass für den Produktivbetrieb ausschließlich der Abrufteil
 * gegen API, Feed oder Partnerzugang auszutauschen ist.
 *
 * `Suchkriterien.stand` ist die einzige Zugabe für den Demobetrieb: Damit
 * liefert der Connector den Zustand eines Inserates zu einem vergangenen
 * Zeitpunkt. Ein echter Connector ignoriert das Feld, weil eine Plattform
 * immer nur „jetzt" kennt — die Historie entsteht in dieser Anwendung.
 */

import type { InseratDaten, Plattform } from '../domain/types';
import {
  standardDetectChanges,
  type Connector,
  type RohBild,
  type RohInserat,
  type RohVerkaeufer,
  type Suchkriterien,
} from './typen';
import { marktFuerPlattform, type Marktinserat } from '../daten/rohdaten';

/** Erweiterung der Suchkriterien für den mitgelieferten Datenbestand. */
export interface DemoSuchkriterien extends Suchkriterien {
  /** Zustand zu diesem Zeitpunkt liefern. */
  stand?: string;
}

/** Letzter Stand eines Inserates zum gewünschten Zeitpunkt. */
function standZu(inserat: Marktinserat, zeitpunkt: string | undefined) {
  if (!zeitpunkt) return inserat.staende[inserat.staende.length - 1];
  const grenze = Date.parse(zeitpunkt);
  const passend = inserat.staende.filter((s) => Date.parse(s.zeitpunkt) <= grenze);
  return passend.length > 0 ? passend[passend.length - 1] : null;
}

/** Ist das Inserat zum Zeitpunkt überhaupt online? */
function sichtbar(inserat: Marktinserat, zeitpunkt: string | undefined): boolean {
  if (!zeitpunkt) return inserat.entferntAm === null;
  const t = Date.parse(zeitpunkt);
  if (Date.parse(inserat.staende[0].zeitpunkt) > t) return false;
  if (inserat.entferntAm !== null && Date.parse(inserat.entferntAm) <= t) return false;
  return true;
}

function passtZuKriterien(
  inserat: Marktinserat,
  nutzlast: Record<string, unknown>,
  kriterien: DemoSuchkriterien,
  normalize: (roh: RohInserat, bilder: RohBild[]) => InseratDaten,
): boolean {
  const daten = normalize(
    {
      plattformId: inserat.plattformId,
      externeId: inserat.externeId,
      url: inserat.url,
      abgerufenAm: kriterien.stand ?? new Date().toISOString(),
      nutzlast,
    },
    [],
  );

  if (kriterien.hersteller && kriterien.hersteller.length > 0) {
    if (!kriterien.hersteller.some((h) => h.toLowerCase() === daten.hersteller.toLowerCase())) {
      return false;
    }
  }
  if (kriterien.begriffe && kriterien.begriffe.length > 0) {
    const text = `${daten.titel} ${daten.modell} ${daten.baureihe} ${daten.variante}`.toLowerCase();
    if (!kriterien.begriffe.some((b) => text.includes(b.toLowerCase()))) return false;
  }
  if (kriterien.preisMax !== undefined && daten.preis > kriterien.preisMax) return false;
  if (kriterien.preisMin !== undefined && daten.preis < kriterien.preisMin) return false;
  if (
    kriterien.kilometerMax !== undefined &&
    daten.kilometerstand !== null &&
    daten.kilometerstand > kriterien.kilometerMax
  ) {
    return false;
  }
  if (kriterien.baujahrMin !== undefined && daten.erstzulassung) {
    const jahr = Number.parseInt(daten.erstzulassung.slice(0, 4), 10);
    if (Number.isFinite(jahr) && jahr < kriterien.baujahrMin) return false;
  }
  if (kriterien.laender && kriterien.laender.length > 0) {
    if (!kriterien.laender.includes(daten.standortLand)) return false;
  }
  return true;
}

export function erzeugeConnector(
  plattform: Plattform,
  normalize: (roh: RohInserat, bilder: RohBild[]) => InseratDaten,
): Connector {
  const bestand = () => marktFuerPlattform(plattform.id);

  return {
    plattform,

    async search(kriterien: DemoSuchkriterien): Promise<RohInserat[]> {
      if (!plattform.aktiv) return [];
      return bestand()
        .filter((i) => sichtbar(i, kriterien.stand))
        .map((i) => {
          const stand = standZu(i, kriterien.stand);
          if (!stand) return null;
          if (!passtZuKriterien(i, stand.nutzlast, kriterien, normalize)) return null;
          return {
            plattformId: i.plattformId,
            externeId: i.externeId,
            url: i.url,
            abgerufenAm: kriterien.stand ?? stand.zeitpunkt,
            nutzlast: stand.nutzlast,
          };
        })
        .filter((r): r is RohInserat => r !== null);
    },

    async getListing(externeId: string): Promise<RohInserat | null> {
      const i = bestand().find((x) => x.externeId === externeId);
      if (!i) return null;
      const stand = i.staende[i.staende.length - 1];
      return {
        plattformId: i.plattformId,
        externeId: i.externeId,
        url: i.url,
        abgerufenAm: stand.zeitpunkt,
        nutzlast: stand.nutzlast,
      };
    },

    async getImages(externeId: string): Promise<RohBild[]> {
      const i = bestand().find((x) => x.externeId === externeId);
      if (!i) return [];
      return i.staende[i.staende.length - 1].bilder;
    },

    async getSeller(externeId: string): Promise<RohVerkaeufer | null> {
      const i = bestand().find((x) => x.externeId === externeId);
      return i ? i.verkaeufer : null;
    },

    normalize,
    detectChanges: standardDetectChanges,
  };
}

/**
 * Bilder eines Inserates zu einem Zeitpunkt. Der Collector braucht sie
 * zusammen mit dem passenden Stand; `getImages()` liefert immer den aktuellen.
 */
export function bilderZu(
  plattformId: string,
  externeId: string,
  zeitpunkt: string | undefined,
): RohBild[] {
  const i = marktFuerPlattform(plattformId).find((x) => x.externeId === externeId);
  if (!i) return [];
  const stand = standZu(i, zeitpunkt);
  return stand ? stand.bilder : [];
}

export { standZu, sichtbar };
