/**
 * Restaurationsanalyse — PRD Abschnitt 19.
 *
 * Die Rechnung folgt dem Aufbau aus dem PRD:
 *
 *     Kaufpreis + erwartete Restaurierung + Risikoreserve = Gesamtinvestment
 *     Marktwert nach Aufarbeitung / Gesamtinvestment      = Investment Ratio
 *
 * Zwei Entscheidungen prägen die Umsetzung.
 *
 * Erstens: Es gibt drei Ergebnisse, nicht eines. Low, Expected und High
 * Estimate sind bei einem Restaurationsobjekt keine Verfeinerung, sondern die
 * eigentliche Aussage — wer nur den Erwartungswert nennt, verschweigt das
 * Risiko, um dessentwillen die Rechnung aufgestellt wird.
 *
 * Zweitens: Der Marktwert nach Aufarbeitung wird nicht geschätzt, sondern aus
 * der Marktreihe abgeleitet — aus dem Preisniveau der besten Exemplare in der
 * passenden Kilometerklasse. Eine Restaurierung macht aus einem Fahrzeug ein
 * gutes Exemplar seiner Klasse, nicht ein junges Fahrzeug.
 */

import { rundeAuf } from '../domain/format';
import {
  GEWERKE,
  markenfaktor,
  reservesatz,
  ZUSTANDSSTUFE_LABEL,
  type Gewerk,
  type Zustandsstufe,
} from '../wissen/restaurationskatalog';
import type { InseratDaten } from '../domain/types';
import type { Marktreihe } from '../wissen/marktdaten';
import { aktuellerMonat } from '../wissen/marktdaten';
import type { Risikoanalyse } from './risikoanalyse';
import type { Marktbewertung } from './bewertung';

export interface Zustandserfassung {
  gewerk: Gewerk;
  stufe: Zustandsstufe;
  bemerkung: string;
  /** Wurde die Stufe automatisch vorgeschlagen oder vom Nutzer gesetzt? */
  herkunft: 'vorschlag' | 'manuell';
}

export interface Restaurationsposition {
  gewerk: Gewerk;
  label: string;
  stufe: Zustandsstufe;
  stufeLabel: string;
  bemerkung: string;
  low: number;
  expected: number;
  high: number;
}

export interface Restaurationsrechnung {
  kaufpreis: number;
  positionen: Restaurationsposition[];
  restaurierungLow: number;
  restaurierungExpected: number;
  restaurierungHigh: number;
  reservesatz: number;
  reserve: number;
  gesamtinvestmentLow: number;
  gesamtinvestmentExpected: number;
  gesamtinvestmentHigh: number;
  marktwertNachher: number;
  marktwertHerkunft: string;
  /** Marktwert nach Aufarbeitung geteilt durch das erwartete Gesamtinvestment. */
  investmentRatio: number;
  /** Ratio im ungünstigen Fall (High Estimate). */
  investmentRatioHigh: number;
  bewertung: string;
  markenfaktor: number;
}

/**
 * Schlägt aus Inserat, Bildhinweisen und Risikoanalyse eine Zustandserfassung
 * vor. Der Vorschlag ist ein Startpunkt für die manuelle Erfassung, keine
 * Beurteilung — Abschnitt 4 schließt eine abschließende Zustandsbeurteilung
 * allein anhand von Bildern ausdrücklich aus.
 */
export function schlageZustandVor(
  daten: InseratDaten,
  risiken: Risikoanalyse,
  alterJahre: number | null,
): Zustandserfassung[] {
  const auffaellig = daten.bilder.flatMap((b) => b.auffaelligkeiten);
  const hat = (art: string) => auffaellig.some((a) => a.art === art && a.confidence >= 55);
  const altersstufe: Zustandsstufe = alterJahre === null ? 2 : alterJahre > 18 ? 3 : 2;

  const offen = (bauteil: string) =>
    risiken.befunde.filter(
      (b) => b.risiko.bauteil === bauteil && b.faellig && !b.belegtErledigt,
    );

  const stufeAus = (bedingungen: [boolean, Zustandsstufe][], grund: Zustandsstufe): Zustandsstufe => {
    for (const [wahr, stufe] of bedingungen) if (wahr) return stufe;
    return grund;
  };

  const eintrag = (
    gewerk: Gewerk,
    stufe: Zustandsstufe,
    bemerkung: string,
  ): Zustandserfassung => ({ gewerk, stufe, bemerkung, herkunft: 'vorschlag' });

  return [
    eintrag(
      'karosserie',
      stufeAus(
        [
          [daten.unfallangabe === 'unfallschaden', 4],
          [hat('korrosion'), 4],
          [daten.unfallangabe === 'vorschaden-repariert', 3],
          [hat('spaltmass') || hat('lackton'), 3],
        ],
        altersstufe,
      ),
      hat('korrosion')
        ? 'Bildhinweis auf Korrosion — Umfang nur auf der Hebebühne feststellbar.'
        : 'Vorschlag aus Alter und Inseratsangaben.',
    ),
    eintrag(
      'lack',
      stufeAus([[hat('lackton'), 3], [daten.unfallangabe === 'vorschaden-repariert', 3]], altersstufe),
      hat('lackton') ? 'Bildhinweis auf Farbabweichung.' : 'Vorschlag aus Alter.',
    ),
    eintrag(
      'motor',
      stufeAus(
        [
          [risiken.kritischOffen.length > 0, 4],
          [offen('Motor').length >= 2, 3],
          [offen('Motor').length === 1, 2],
        ],
        1,
      ),
      offen('Motor').length > 0
        ? `Offene Motorrisiken: ${offen('Motor').map((b) => b.risiko.bezeichnung).join(', ')}.`
        : 'Keine fälligen, unbelegten Motorrisiken.',
    ),
    eintrag(
      'getriebe',
      stufeAus([[offen('Getriebe').length >= 1, 3]], 1),
      offen('Getriebe').length > 0
        ? `Offene Risiken: ${offen('Getriebe').map((b) => b.risiko.bezeichnung).join(', ')}.`
        : 'Keine offenen Getrieberisiken.',
    ),
    eintrag(
      'fahrwerk',
      stufeAus([[offen('Fahrwerk').length >= 1, 3]], altersstufe),
      offen('Fahrwerk').length > 0
        ? `Offene Risiken: ${offen('Fahrwerk').map((b) => b.risiko.bezeichnung).join(', ')}.`
        : 'Vorschlag aus Alter und Laufleistung.',
    ),
    eintrag(
      'bremsen',
      stufeAus([[offen('Bremse').length >= 1, 3]], 2),
      'Scheibenstärke ist vor Ort zu messen.',
    ),
    eintrag(
      'innenraum',
      stufeAus([[hat('sitzverschleiss') || hat('lenkradverschleiss'), 3]], altersstufe),
      hat('sitzverschleiss') || hat('lenkradverschleiss')
        ? 'Bildhinweis auf Verschleiß im Innenraum.'
        : 'Vorschlag aus Alter.',
    ),
    eintrag('elektrik', 2, 'Fehlerspeicher ist vor Ort auszulesen.'),
    eintrag(
      'raeder',
      stufeAus([[hat('felgenschaden'), 3]], 2),
      hat('felgenschaden') ? 'Bildhinweis auf Felgenschaden.' : 'Vorschlag aus Alter.',
    ),
    eintrag(
      'reifen',
      stufeAus([[auffaellig.some((a) => a.art === 'reifenmix'), 3]], 2),
      auffaellig.some((a) => a.art === 'reifenmix')
        ? 'Bildhinweis auf unterschiedliche Reifenfabrikate.'
        : 'Reifenalter ist vor Ort zu prüfen.',
    ),
    eintrag(
      'originalteile',
      stufeAus([[Boolean(daten.umbauten), 3]], 1),
      daten.umbauten
        ? `Rückrüstung betrifft: ${daten.umbauten}`
        : 'Keine Umbauten angegeben.',
    ),
    eintrag(
      'dokumentation',
      stufeAus(
        [
          [daten.servicehistorie === 'keine', 4],
          [daten.servicehistorie === 'unbekannt', 3],
          [daten.servicehistorie === 'teilweise', 2],
        ],
        1,
      ),
      `Servicehistorie im Inserat: ${daten.servicehistorie}.`,
    ),
  ];
}

export interface Restaurationseingang {
  kaufpreis: number;
  zustand: Zustandserfassung[];
  hersteller: string | null;
  reihe: Marktreihe | undefined;
  bewertung: Marktbewertung;
  kilometerstand: number | null;
}

export function rechneRestauration(e: Restaurationseingang): Restaurationsrechnung {
  const faktor = markenfaktor(e.hersteller);

  const positionen: Restaurationsposition[] = e.zustand.map((z) => {
    const katalog = GEWERKE.find((g) => g.gewerk === z.gewerk);
    if (!katalog) {
      throw new Error(`Unbekanntes Gewerk in der Zustandserfassung: ${z.gewerk}`);
    }
    const spanne = katalog.stufen[z.stufe];
    return {
      gewerk: z.gewerk,
      label: katalog.label,
      stufe: z.stufe,
      stufeLabel: ZUSTANDSSTUFE_LABEL[z.stufe],
      bemerkung: z.bemerkung,
      low: Math.round(spanne.low * faktor),
      expected: Math.round(spanne.expected * faktor),
      high: Math.round(spanne.high * faktor),
    };
  });

  const restaurierungLow = positionen.reduce((s, p) => s + p.low, 0);
  const restaurierungExpected = positionen.reduce((s, p) => s + p.expected, 0);
  const restaurierungHigh = positionen.reduce((s, p) => s + p.high, 0);

  const hoechsteStufe = positionen.reduce<Zustandsstufe>(
    (max, p) => (p.stufe > max ? p.stufe : max),
    1,
  );
  const satz = reservesatz(hoechsteStufe);
  const reserve = Math.round(restaurierungExpected * satz);

  /* -- Marktwert nach Aufarbeitung -------------------------------------- */
  let marktwertNachher: number;
  let marktwertHerkunft: string;

  if (e.reihe) {
    const monat = aktuellerMonat(e.reihe);
    const spreizung = monat.spitzenPreis / monat.medianPreis;
    const klasse =
      e.kilometerstand !== null
        ? e.reihe.nachKilometerklasse.find(
            (k) => (e.kilometerstand as number) >= k.von && (k.bis === null || (e.kilometerstand as number) < k.bis),
          )
        : undefined;
    const basis = klasse?.medianPreis ?? monat.medianPreis;
    marktwertNachher = rundeAuf(basis * spreizung, 100);
    marktwertHerkunft = `Preisniveau der besten Exemplare${klasse ? ` in der Kilometerklasse ${klasse.label}` : ''} — Median ${basis.toLocaleString('de-AT')} € × Spreizung ${spreizung.toFixed(2)}.`;
  } else {
    marktwertNachher = rundeAuf(e.bewertung.fairValue * 1.25, 100);
    marktwertHerkunft =
      'Keine Marktreihe verfügbar — angenommen wird ein Aufschlag von 25 % auf den aktuellen Fair Market Value.';
  }

  const gesamtLow = e.kaufpreis + restaurierungLow + Math.round(restaurierungLow * satz);
  const gesamtExpected = e.kaufpreis + restaurierungExpected + reserve;
  const gesamtHigh = e.kaufpreis + restaurierungHigh + Math.round(restaurierungHigh * satz);

  const ratio = gesamtExpected > 0 ? marktwertNachher / gesamtExpected : 0;
  const ratioHigh = gesamtHigh > 0 ? marktwertNachher / gesamtHigh : 0;

  return {
    kaufpreis: e.kaufpreis,
    positionen,
    restaurierungLow,
    restaurierungExpected,
    restaurierungHigh,
    reservesatz: satz,
    reserve,
    gesamtinvestmentLow: gesamtLow,
    gesamtinvestmentExpected: gesamtExpected,
    gesamtinvestmentHigh: gesamtHigh,
    marktwertNachher,
    marktwertHerkunft,
    investmentRatio: ratio,
    investmentRatioHigh: ratioHigh,
    bewertung: bewerteRatio(ratio, ratioHigh),
    markenfaktor: faktor,
  };
}

function bewerteRatio(ratio: number, ratioHigh: number): string {
  if (ratio >= 1.3 && ratioHigh >= 1.05) {
    return 'Wirtschaftlich klar darstellbar — auch im ungünstigen Fall bleibt Substanzwert erhalten.';
  }
  if (ratio >= 1.15 && ratioHigh >= 0.95) {
    return 'Wirtschaftlich darstellbar, im ungünstigen Verlauf jedoch ohne Puffer.';
  }
  if (ratio >= 1.0) {
    return 'Grenzwertig: Der Erwartungswert trägt sich knapp, der High Estimate nicht mehr. Nur bei belastbarer Zustandsprüfung weiterverfolgen.';
  }
  return 'Wirtschaftlich nicht darstellbar — das Gesamtinvestment übersteigt den erzielbaren Marktwert.';
}
