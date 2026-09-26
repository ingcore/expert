/**
 * SAFETY-SCORE im Bericht nach CD Ausgabe 1.1, Kapitel 5:
 * Mini-Band, Plakette, Teilscore-Zeile je Kapitel und Gesamtbewertung Ist/Soll.
 */

import { Berichtszeichen } from '@/components/Berichtszeichen';
import { SCORE_BY_KEY, SCORE_GEWICHT } from '@/domain/catalog';
import {
  BERICHTS_KAPITEL,
  PUNKTE_BEREICH,
  type Gesamtscore,
  type ScoreWert,
  type Teilscore,
} from '@/domain/score';
import type { SafetyScore } from '@/domain/types';
import { ScoreGrafik } from './ScoreGrafik';
import hakenA from '@/assets/deckblatt-haken/A.svg';
import hakenB from '@/assets/deckblatt-haken/B.svg';
import hakenC from '@/assets/deckblatt-haken/C.svg';
import hakenD from '@/assets/deckblatt-haken/D.svg';
import hakenE from '@/assets/deckblatt-haken/E.svg';

/**
 * Deckblatt-Haken: der hervorgehobene Haken der Original-Skalengrafik mit
 * Stufenbuchstaben, hell (Deckkraft 40 %) hinter der Kerndatenzeile —
 * wie im INGTEC-Deckblatt der Objektbewertung.
 */
const HAKEN: Record<SafetyScore, string> = {
  A: hakenA,
  B: hakenB,
  C: hakenC,
  D: hakenD,
  E: hakenE,
};

/** Originalwerte der Skalengrafiken; das Mini-Band nutzt sie unverändert. */
const BAND_FARBE: Record<SafetyScore, string> = {
  A: '#02a54c',
  B: '#9dc31b',
  C: '#ffeb5a',
  D: '#f2bb0a',
  E: '#e54100',
};
/** Linke Oberkante jedes Segments im Koordinatensystem des Bands. */
const SEGMENT_X: Record<SafetyScore, number> = {
  A: 59.38,
  B: 102.48,
  C: 145.58,
  D: 188.68,
  E: 231.78,
};
const SEGMENT_BREITE = 43;

/** Lage eines Markers: die Obergrenze einer Stufe liegt am linken Segmentrand. */
function markerX({ punkte, stufe }: ScoreWert): number {
  const { bis } = PUNKTE_BEREICH[stufe];
  return SEGMENT_X[stufe] + ((bis - punkte) / 20) * SEGMENT_BREITE;
}

function Marker({ wert, soll }: { wert: ScoreWert; soll?: boolean }) {
  const x = markerX(wert);
  const punkte = `${x - 6},-14 ${x + 6},-14 ${x},-1`;
  return soll ? (
    <polygon
      points={punkte}
      fill="#ffffff"
      stroke={BAND_FARBE[wert.stufe]}
      strokeWidth={1.6}
      strokeLinejoin="round"
    />
  ) : (
    <polygon points={punkte} fill={BAND_FARBE[wert.stufe]} />
  );
}

/** Mini-Band A–E mit Ist-Marker (gefüllt) und Soll-Marker (Kontur). */
export function MiniBand({
  ist,
  soll,
  breite = 190,
}: {
  ist: ScoreWert;
  soll: ScoreWert;
  breite?: number;
}) {
  const gleich = ist.punkte === soll.punkte;
  return (
    <svg
      viewBox="-8 -16 292 56"
      width={breite}
      role="img"
      aria-label={
        gleich
          ? `Teilscore Ist gleich Soll ${ist.punkte} Stufe ${ist.stufe}`
          : `Teilscore Ist ${ist.punkte} Stufe ${ist.stufe}, Soll ${soll.punkte} Stufe ${soll.stufe}`
      }
      className="score-teilzeile__band"
    >
      {(Object.keys(SEGMENT_X) as SafetyScore[]).map((s) => {
        const x = SEGMENT_X[s];
        return (
          <polygon
            key={s}
            points={`${x},0 ${x + SEGMENT_BREITE},0 ${x - 16.37},37.68 ${x - 59.36},37.68`}
            fill={BAND_FARBE[s]}
          />
        );
      })}
      {!gleich && <Marker wert={soll} soll />}
      <Marker wert={ist} />
    </svg>
  );
}

/** Plakette: Buchstabe fett auf der Score-Farbe, Kurzbewertung im Tooltip. */
export function Plakette({ stufe }: { stufe: SafetyScore }) {
  const def = SCORE_BY_KEY[stufe];
  return (
    <span
      className="doc__plakette"
      style={{ background: def.farbe, color: def.textfarbe }}
      title={`${stufe} — ${def.kurz}`}
    >
      {stufe}
    </span>
  );
}

function IstSoll({ ist, soll }: { ist: ScoreWert; soll: ScoreWert }) {
  if (ist.punkte === soll.punkte) {
    return (
      <span className="score-teilzeile__wert">
        Ist = Soll <b>{`${ist.stufe} ${ist.punkte}`}</b>
      </span>
    );
  }
  return (
    <span className="score-teilzeile__wert">
      Ist <b>{`${ist.stufe} ${ist.punkte}`}</b> · Soll{' '}
      <b>{`${soll.stufe} ${soll.punkte}`}</b>
    </span>
  );
}

/**
 * Feststellungstabelle eines Kapitels; die letzte Zeile ist der Teilscore
 * auf Befundungsgrau.
 */
export function TeilscoreTabelle({
  teil,
  datum,
  quelle,
}: {
  teil: Teilscore;
  datum: string;
  quelle: string;
}) {
  const behebbar = teil.feststellungen.filter((m) => !m.verbleibend);
  const verbleibend = teil.feststellungen.filter((m) => m.verbleibend);
  const nr = (liste: typeof behebbar) => liste.map((m) => m.lfdNr).join(', ');

  return (
    <>
      <table className="doc__tabelle doc__feststellungen">
        <thead>
          <tr>
            <th style={{ width: '10mm' }}>Nr.</th>
            <th>Feststellung</th>
            <th className="zentriert" style={{ width: '14mm' }}>
              Grad
            </th>
            <th className="zentriert" style={{ width: '12mm' }}>
              RI
            </th>
          </tr>
        </thead>
        <tbody>
          {teil.feststellungen.map((m) => (
            <tr key={m.id}>
              <td>
                <strong>{m.lfdNr}</strong>
              </td>
              <td>
                {m.beschreibung || '—'}
                {m.verbleibend ? (
                  ' – verbleibende Abweichung, keine Maßnahme'
                ) : m.massnahme ? (
                  <>
                    {' – '}
                    <Berichtszeichen art="massnahme" />
                    Maßnahme: {m.massnahme}
                  </>
                ) : null}
              </td>
              <td className="zentriert">
                <Plakette stufe={m.score} />
              </td>
              <td className="zentriert doc__mono">{SCORE_GEWICHT[m.score]}</td>
            </tr>
          ))}
          <tr>
            <td />
            <td className="beurteilung">
              <div className="score-teilzeile">
                <span className="score-teilzeile__titel">
                  Teilscore {teil.kapitel}
                </span>
                <MiniBand ist={teil.ist} soll={teil.soll} />
                <IstSoll ist={teil.ist} soll={teil.soll} />
              </div>
            </td>
            <td className="beurteilung zentriert">
              <Plakette stufe={teil.ist.stufe} />
            </td>
            <td className="beurteilung zentriert doc__mono">{teil.ri}</td>
          </tr>
        </tbody>
      </table>
      <p className="doc__tabellentitel">
        Feststellungen Kapitel {teil.kapitel} mit SAFETY-SCORE-Grad, Risikoindex
        und Teilscore ({quelle})
      </p>
      <p className="doc__istsoll">
        {teil.feststellungen.length === 0 ? (
          <>Keine Feststellung zum Prüfzeitpunkt {datum}.</>
        ) : (
          <>
            <strong>{`Ist ${teil.ist.stufe} ${teil.ist.punkte}`}</strong> zum
            Prüfzeitpunkt {datum} ·{' '}
            <strong>{`Soll ${teil.soll.stufe} ${teil.soll.punkte}`}</strong>{' '}
            {behebbar.length > 0
              ? `nach Umsetzung der Maßnahmen Nr. ${nr(behebbar)}`
              : 'ohne umsetzbare Maßnahme'}
            {verbleibend.length > 0 &&
              `; die verbleibende Abweichung Nr. ${nr(verbleibend)} bleibt bestehen`}
            .
          </>
        )}
      </p>
    </>
  );
}

function zahl1(n: number): string {
  return n.toLocaleString('de-AT', { maximumFractionDigits: 1 });
}

/**
 * Schlusskapitel: Teilscores mit Gesamtzeile, darunter der Bandtacho — nur
 * der Ist-Wert als Originalgrafik; das erreichbare Soll steht klein als
 * Plakette mit Kurzbewertung, damit die große Grafik dem echten Befund
 * vorbehalten bleibt.
 */
export function GesamtBewertung({
  teile,
  gesamt,
  datum,
  quelle,
}: {
  teile: Teilscore[];
  gesamt: Gesamtscore;
  datum: string;
  quelle: string;
}) {
  const massnahmen = teile
    .flatMap((t) => t.feststellungen)
    .filter((m) => !m.verbleibend)
    .map((m) => m.lfdNr)
    .sort((a, b) => a - b);
  const nachMassnahmen =
    massnahmen.length > 0
      ? `nach Umsetzung der Maßnahmen Nr. ${massnahmen.join(', ')}`
      : 'nach Umsetzung der Maßnahmen';
  const titel = (k: string) =>
    BERICHTS_KAPITEL.find((b) => b.value === k)?.label ?? '';
  const zelle = (w: ScoreWert) => (
    <>
      <Plakette stufe={w.stufe} /> <span className="doc__mono">{w.punkte}</span>
    </>
  );
  return (
    <>
      <table className="doc__tabelle">
        <thead>
          <tr>
            <th style={{ width: '14mm' }}>Kap.</th>
            <th>Teilkapitel</th>
            <th className="zentriert" style={{ width: '30mm' }}>
              Ist
            </th>
          </tr>
        </thead>
        <tbody>
          {teile.map((t) => (
            <tr key={t.kapitel}>
              <td>
                <strong>{t.kapitel}</strong>
              </td>
              <td>{titel(t.kapitel)}</td>
              <td className="zentriert">{zelle(t.ist)}</td>
            </tr>
          ))}
          <tr>
            <td />
            <td className="beurteilung">
              <strong>Gesamt</strong> (Mittel {zahl1(gesamt.ist.mittel)} →
              Deckel {deckelStufe(teile.map((t) => t.ist))})
            </td>
            <td className="beurteilung zentriert">{zelle(gesamt.ist)}</td>
          </tr>
        </tbody>
      </table>
      <p className="doc__tabellentitel">
        Teilscores und Gesamt-SAFETY-SCORE zum Prüfzeitpunkt ({quelle})
      </p>
      <div className="score-bandtacho">
        <div className="score-bandtacho__label">
          <span>Ist · zum Prüfzeitpunkt {datum}</span>
          <span>Grad {gesamt.ist.stufe}</span>
        </div>
        <ScoreGrafik score={gesamt.ist.stufe} breite={640} vollbreite />
        <p className="score-bandtacho__soll">
          <span className="score-bandtacho__label">
            <span>Soll · erreichbar {nachMassnahmen}</span>
          </span>
          <span className="score-bandtacho__soll-wert">
            <Plakette stufe={gesamt.soll.stufe} />{' '}
            <strong>{SCORE_BY_KEY[gesamt.soll.stufe].kurz}</strong> ·{' '}
            {gesamt.soll.punkte} Punkte
          </span>
        </p>
      </div>
      <p className="doc__abbildungstitel">
        SAFETY-SCORE Gesamtbewertung – Ist {gesamt.ist.stufe} zum Prüfzeitpunkt{' '}
        {datum}; erreichbar {nachMassnahmen}: Stufe {gesamt.soll.stufe} (
        {quelle})
      </p>
    </>
  );
}

function deckelStufe(werte: ScoreWert[]): SafetyScore {
  const reihenfolge: SafetyScore[] = ['A', 'B', 'C', 'D', 'E'];
  return werte.reduce<SafetyScore>(
    (schlecht, w) =>
      reihenfolge.indexOf(w.stufe) > reihenfolge.indexOf(schlecht)
        ? w.stufe
        : schlecht,
    'A',
  );
}

/**
 * Verteilung der Feststellungen im Bericht: Band im Score-Stil über die
 * Textbreite, darunter die Zählung als Plaketten und die Zeile mit Gesamtzahl
 * und Risikoindex. Kein Score, keine Marker.
 */
export function VerteilungBericht({
  teile,
  quelle,
}: {
  teile: Teilscore[];
  quelle: string;
}) {
  const stufen: SafetyScore[] = ['A', 'B', 'C', 'D', 'E'];
  const alle = teile.flatMap((t) => t.feststellungen);
  const anzahl = (g: SafetyScore) => alle.filter((m) => m.score === g).length;
  const ri = teile.reduce((s, t) => s + t.ri, 0);
  return (
    <div className="doc__verteilung">
      {alle.length === 0 ? (
        <div className="score-verteilung score-verteilung--leer" aria-hidden="true">
          <span className="score-verteilung__seg" style={{ flexBasis: '100%' }} />
        </div>
      ) : (
        <div
          className="score-verteilung"
          role="img"
          aria-label={`Verteilung: ${stufen
            .filter((g) => anzahl(g) > 0)
            .map((g) => `${anzahl(g)}× Stufe ${g}`)
            .join(', ')}`}
        >
          {stufen.map((g) =>
            anzahl(g) > 0 ? (
              <span
                key={g}
                className="score-verteilung__seg"
                style={{
                  flexBasis: `${((anzahl(g) / alle.length) * 100).toFixed(1)}%`,
                  background: BAND_FARBE[g],
                }}
              />
            ) : null,
          )}
        </div>
      )}
      <p className="doc__verteilung-legende">
        {stufen.map((g) => (
          <span key={g}>
            <Plakette stufe={g} /> <span className="doc__mono">{anzahl(g)}</span>
          </span>
        ))}
      </p>
      <p className="doc__verteilung-summe">
        {alle.length} {alle.length === 1 ? 'Feststellung' : 'Feststellungen'}{' '}
        zum Prüfzeitpunkt, Risikoindex {ri} (Gewichtung A 0, B 1, C 3, D 8, E
        20).
      </p>
      <p className="doc__abbildungstitel">
        Verteilung der Feststellungen nach SAFETY-SCORE-Grad ({quelle})
      </p>
    </div>
  );
}

/** Deckblatt-Haken in der Stufenfarbe des Gesamt-Ist. */
export function DeckblattHaken({ stufe }: { stufe: SafetyScore }) {
  return (
    <img
      src={HAKEN[stufe]}
      alt=""
      aria-hidden="true"
      className="doc__deckscore-haken"
    />
  );
}
