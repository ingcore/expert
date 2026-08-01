/**
 * Landesrechtliche Overlays (FR-2.4).
 *
 * Ein Overlay überschreibt, ergänzt oder hebt eine OIB-Anforderung für ein
 * bestimmtes Bundesland auf. Im Ergebnis wird jedes wirksame Overlay
 * gekennzeichnet, damit im Konzept sichtbar bleibt, welche Aussage aus
 * Landesrecht statt aus der OIB-Richtlinie stammt.
 *
 * WICHTIG — Status
 * ---------------------------------------------------------------------------
 * Umgesetzt sind die beiden Bundesländer des v1.0-Scope: Kärnten als
 * Hauptgeschäftsgebiet und Wien. Beide Sätze sind strukturell vollständig,
 * inhaltlich aber noch NICHT gegen den Landesgesetzestext verifiziert. Die
 * übrigen sieben Bundesländer folgen in v1.5.
 *
 * Bei fehlendem Overlay-Satz für ein Bundesland gilt die OIB-Anforderung
 * unverändert — das ist der fachlich richtige Rückfall, muss dem Nutzer aber
 * angezeigt werden (siehe `OVERLAY_ABDECKUNG`).
 */

import type { Bundesland, Overlay } from '../types';

/** Für welche Bundesländer ein geprüfter Overlay-Satz vorliegt. */
export const OVERLAY_ABDECKUNG: Record<Bundesland, boolean> = {
  K: true,
  W: true,
  NOe: false,
  OOe: false,
  S: false,
  T: false,
  V: false,
  St: false,
  B: false,
};

export const OVERLAYS: Overlay[] = [
  /* ======================================================================
   * Kärnten — Kärntner Bauordnung, Kärntner Bauvorschriften
   * =================================================================== */
  {
    id: 'ovl-k-fluchtweg-erhoeht',
    bundesland: 'K',
    anforderungId: 'oib2-2023-5.1-fluchtweglaenge',
    wirkung: 'ergaenzt',
    hinweis:
      'Die Kärntner Bauvorschriften verweisen auf die OIB-Richtlinie 2; abweichende Fluchtweglängen sind im Einzelfall mit der Baubehörde abzustimmen.',
    quelle: {
      richtlinie: 'K-BV',
      ausgabe: '2023',
      punkt: '§ 3',
      zeile: 'Verweis auf OIB-Richtlinien',
    },
  },
  {
    id: 'ovl-k-feuerbeschau',
    bundesland: 'K',
    anforderungId: 'oib2-2023-6.8-brandschutzplaene',
    wirkung: 'ergaenzt',
    hinweis:
      'In Kärnten ist zusätzlich die wiederkehrende Feuerbeschau nach dem Kärntner Gefahrenpolizei- und Feuerpolizeigesetz zu berücksichtigen; das Intervall richtet sich nach der Nutzung.',
    quelle: {
      richtlinie: 'K-GFPG',
      ausgabe: '2022',
      punkt: '§ 16',
      zeile: 'Feuerbeschau',
    },
  },
  {
    id: 'ovl-k-loeschwasser-betrieb',
    bundesland: 'K',
    anforderungId: 'oib2-2023-6.2-loeschwasser',
    wirkung: 'ergaenzt',
    bedingung: { containsAny: [{ var: 'nutzungsarten' }, ['produktion', 'lager']] },
    hinweis:
      'Für Betriebsanlagen ist der Löschwasserbedarf mit der örtlich zuständigen Feuerwehr und der Gewerbebehörde abzustimmen; die Zusage der Bereitstellung ist dem Konzept beizulegen.',
    quelle: {
      richtlinie: 'K-BO',
      ausgabe: '1996 i. d. g. F.',
      punkt: '§ 17',
    },
  },

  /* ======================================================================
   * Wien — Wiener Bauordnung, Wiener Bautechnikverordnung
   * =================================================================== */
  {
    id: 'ovl-w-tragwerk-gk5',
    bundesland: 'W',
    anforderungId: 'oib2-2023-2.1-tragwerk-ob-gk5',
    wirkung: 'ergaenzt',
    hinweis:
      'Die Wiener Bautechnikverordnung übernimmt die OIB-Richtlinie 2 mit Abweichungen; bei Gebäuden über 22 m ist zusätzlich OIB-Richtlinie 2.3 anzuwenden.',
    quelle: {
      richtlinie: 'WBTV',
      ausgabe: '2020',
      punkt: '§ 2',
      zeile: 'Anwendung der OIB-Richtlinien',
    },
  },
  {
    id: 'ovl-w-brandabschnitt',
    bundesland: 'W',
    anforderungId: 'oib2-2023-3.4-brandabschnitt-flaeche',
    wirkung: 'ergaenzt',
    hinweis:
      'In Wien ist die Brandabschnittsbildung im Bauverfahren über die Einreichunterlagen nachzuweisen; das BRISE-Prüfverfahren kann eine strukturierte Modellabgabe erfordern.',
    quelle: {
      richtlinie: 'BO für Wien',
      ausgabe: 'i. d. g. F.',
      punkt: '§ 63',
      zeile: 'Einreichunterlagen',
    },
  },
  {
    id: 'ovl-w-fluchtweg-versammlung',
    bundesland: 'W',
    anforderungId: 'oib2-2023-5.3-zweiter-fluchtweg',
    wirkung: 'ergaenzt',
    bedingung: { containsAny: [{ var: 'nutzungsarten' }, ['versammlung']] },
    hinweis:
      'Für Veranstaltungsstätten in Wien gilt zusätzlich das Wiener Veranstaltungsstättengesetz mit eigenen Anforderungen an Ausgänge und Ausgangsbreiten.',
    quelle: {
      richtlinie: 'WVStG',
      ausgabe: 'i. d. g. F.',
      punkt: '§ 12',
    },
  },
];

/** Liefert alle Overlays eines Bundeslandes. */
export function overlaysFuer(bundesland: Bundesland): Overlay[] {
  return OVERLAYS.filter((o) => o.bundesland === bundesland);
}
