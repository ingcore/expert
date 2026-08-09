/**
 * Bausteine der Oberfläche im INGTEC-Design.
 *
 * Verbindlich aus dem INGTEC-Inspect-Corporate-Design (siehe
 * `src/styles/tokens.css`): Markengrün als einzige Akzentfarbe, keine blaue
 * Interaktionsfarbe, weißes Glas für Information und graues Glas dort, wo
 * fachlich beurteilt wird — und durchgehend: **Farbe ist nie das einzige
 * Statusmerkmal.** Jeder Score trägt seine Zahl, jeder Rang seinen Buchstaben,
 * jede Red Flag ihr Wort.
 */

import type { ReactNode } from 'react';
import type { Kandidatenrang } from '../domain/types';
import { euro, prozent, zahl } from '../domain/format';
import { scorestufe, type Score, type Scorestufe } from '../engine/erklaerung';
import { SCHWEREGRAD_LABEL, type RedFlag, type Schweregrad } from '../engine/redflags';

/* ==========================================================================
 * Karten und Seitenkopf
 * ======================================================================= */

export function Karte({
  titel,
  untertitel,
  beurteilung,
  aktion,
  flush,
  children,
}: {
  titel?: string;
  untertitel?: string;
  /** Graues Glas: hier wird fachlich beurteilt. */
  beurteilung?: boolean;
  aktion?: ReactNode;
  flush?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={`card ${beurteilung ? 'card--beurteilung' : ''}`}>
      {titel && (
        <header className="card__header">
          <div>
            <h2 className="card__title">{titel}</h2>
            {untertitel && <p className="card__subtitle">{untertitel}</p>}
          </div>
          {aktion}
        </header>
      )}
      <div className={`card__body ${flush ? 'card__body--flush' : ''}`}>{children}</div>
    </section>
  );
}

export function Seitenkopf({
  titel,
  lead,
  aktion,
}: {
  titel: string;
  lead?: string;
  aktion?: ReactNode;
}) {
  return (
    <div className="page-head">
      <div>
        <h1 className="page-head__title">{titel}</h1>
        {lead && <p className="page-head__lead">{lead}</p>}
      </div>
      {aktion}
    </div>
  );
}

export function Kennzahl({
  label,
  wert,
  einheit,
  hinweis,
  ton,
  beurteilung,
}: {
  label: string;
  wert: string | number;
  einheit?: string;
  hinweis?: string;
  ton?: 'gut' | 'warn' | 'gefahr';
  beurteilung?: boolean;
}) {
  return (
    <div
      className={`kpi ${beurteilung ? 'kpi--beurteilung' : ''} ${ton ? `kpi--${ton}` : ''}`}
    >
      <span className="kpi__label">{label}</span>
      <span className="kpi__value">
        {wert}
        {einheit && <span className="kpi__unit">{einheit}</span>}
      </span>
      {hinweis && <span className="kpi__hint">{hinweis}</span>}
    </div>
  );
}

/* ==========================================================================
 * Score-Darstellung
 * ======================================================================= */

const STUFE_TEXT: Record<Scorestufe, string> = {
  gut: 'gut',
  mittel: 'mittel',
  schwach: 'schwach',
  kritisch: 'kritisch',
};

export function Scorebalken({
  label,
  score,
  kurz,
}: {
  label: string;
  score: Score;
  kurz?: boolean;
}) {
  const stufe = scorestufe(score.wert);
  return (
    <div className="scorebalken">
      <div className="scorebalken__kopf">
        <span className="scorebalken__label">{label}</span>
        <span className="scorebalken__wert">
          {score.wert}
          <span className="scorebalken__max"> / 100</span>
        </span>
      </div>
      <div className="scorebalken__spur">
        <div
          className={`scorebalken__fuellung scorebalken__fuellung--${stufe}`}
          style={{ width: `${score.wert}%` }}
        />
      </div>
      {!kurz && (
        <div className="scorebalken__fuss">
          <span>{score.einstufung}</span>
          <span className="mono subtle">Datenbasis {score.datenbasis} %</span>
        </div>
      )}
      <span className="visually-hidden">
        {label}: {score.wert} von 100, Einstufung {STUFE_TEXT[stufe]}.
      </span>
    </div>
  );
}

const RANG_TEXT: Record<Kandidatenrang, string> = {
  A: 'A-Kandidat — Prüfung lohnt',
  B: 'B-Kandidat — beobachten',
  C: 'C-Kandidat — nachrangig',
  D: 'D — nicht weiterverfolgen',
};

export function Rangplakette({ rang, wert }: { rang: Kandidatenrang; wert: number }) {
  return (
    <span className={`rang rang--${rang.toLowerCase()}`} title={RANG_TEXT[rang]}>
      <span className="rang__buchstabe">{rang}</span>
      <span className="rang__wert">{wert}</span>
    </span>
  );
}

export function Signalabzeichen({ ausgeloest }: { ausgeloest: boolean }) {
  if (!ausgeloest) return null;
  return (
    <span className="buysignal-abzeichen">
      <span aria-hidden="true">◆</span> INGTEC BUY SIGNAL
    </span>
  );
}

/* ==========================================================================
 * Status, Ampel, Marken
 * ======================================================================= */

export function Ampel({
  stufe,
  text,
}: {
  stufe: 'gruen' | 'gelb' | 'rot';
  text: string;
}) {
  const symbol = stufe === 'gruen' ? '●' : stufe === 'gelb' ? '◐' : '▲';
  return (
    <span className={`ampel ampel--${stufe}`}>
      <span className="ampel__punkt" aria-hidden="true">
        {symbol}
      </span>
      {text}
    </span>
  );
}

export function Marke({
  ton = 'neutral',
  children,
}: {
  ton?: 'neutral' | 'brand' | 'gut' | 'warn' | 'gefahr';
  children: ReactNode;
}) {
  const klasse =
    ton === 'brand'
      ? 'badge badge--brand'
      : ton === 'gut'
        ? 'badge badge--success'
        : ton === 'warn'
          ? 'badge badge--warning'
          : ton === 'gefahr'
            ? 'badge badge--danger'
            : 'badge';
  return <span className={klasse}>{children}</span>;
}

const SCHWERE_TON: Record<Schweregrad, 'gefahr' | 'warn' | 'neutral'> = {
  kritisch: 'gefahr',
  hoch: 'gefahr',
  mittel: 'warn',
  niedrig: 'neutral',
};

export function RedFlagKarte({ flag }: { flag: RedFlag }) {
  return (
    <article className={`redflag redflag--${flag.schweregrad}`}>
      <header className="redflag__kopf">
        <span className="redflag__grad">
          <span aria-hidden="true">{flag.schweregrad === 'niedrig' ? '◇' : '▲'}</span>{' '}
          {SCHWEREGRAD_LABEL[flag.schweregrad]}
        </span>
        <h3 className="redflag__titel">{flag.titel}</h3>
      </header>
      <p className="redflag__text">{flag.begruendung}</p>
      <p className="redflag__empfehlung">
        <strong>Empfehlung:</strong> {flag.empfehlung}
      </p>
      <footer className="redflag__fuss">
        <span>Quelle: {flag.quelle}</span>
        <span className="mono">{flag.zeitpunkt.slice(0, 10)}</span>
      </footer>
      <span className="visually-hidden">Schweregrad {SCHWEREGRAD_LABEL[flag.schweregrad]}.</span>
      <span className="visually-hidden">{SCHWERE_TON[flag.schweregrad]}</span>
    </article>
  );
}

/* ==========================================================================
 * Diagramme
 * ======================================================================= */

/**
 * Kleine Verlaufskurve.
 *
 * Bewusst als reines SVG ohne Bibliothek: Die Kurve trägt keine Interaktion,
 * und eine Diagrammbibliothek würde für vier Sparklines mehr Gewicht in das
 * Bündel bringen als die gesamte Regel-Engine.
 */
export function Verlaufskurve({
  werte,
  breite = 220,
  hoehe = 52,
  beschriftung,
}: {
  werte: number[];
  breite?: number;
  hoehe?: number;
  beschriftung?: string;
}) {
  if (werte.length < 2) {
    return <p className="subtle">Zu wenige Datenpunkte für einen Verlauf.</p>;
  }
  const min = Math.min(...werte);
  const max = Math.max(...werte);
  const spanne = max - min || 1;
  const dx = breite / (werte.length - 1);

  const punkte = werte.map((w, i) => {
    const x = i * dx;
    const y = hoehe - ((w - min) / spanne) * (hoehe - 6) - 3;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const flaeche = `0,${hoehe} ${punkte.join(' ')} ${breite},${hoehe}`;
  const steigend = werte[werte.length - 1] >= werte[0];

  return (
    <figure className="kurve">
      <svg
        viewBox={`0 0 ${breite} ${hoehe}`}
        width="100%"
        height={hoehe}
        preserveAspectRatio="none"
        role="img"
        aria-label={
          beschriftung ??
          `Verlauf von ${zahl(werte[0])} auf ${zahl(werte[werte.length - 1])}`
        }
      >
        <polygon
          points={flaeche}
          className={`kurve__flaeche ${steigend ? 'kurve__flaeche--steigend' : 'kurve__flaeche--fallend'}`}
        />
        <polyline
          points={punkte.join(' ')}
          className={`kurve__linie ${steigend ? 'kurve__linie--steigend' : 'kurve__linie--fallend'}`}
          fill="none"
        />
      </svg>
      {beschriftung && <figcaption className="kurve__text">{beschriftung}</figcaption>}
    </figure>
  );
}

/** Preisband: Marktwert mit Konfidenzintervall und Angebotspreis darin. */
export function Preisband({
  fairValue,
  intervall,
  angebotspreis,
}: {
  fairValue: number;
  intervall: [number, number];
  angebotspreis: number;
}) {
  const von = Math.min(intervall[0], angebotspreis) * 0.96;
  const bis = Math.max(intervall[1], angebotspreis) * 1.04;
  const anteil = (wert: number) => ((wert - von) / (bis - von)) * 100;

  return (
    <div className="preisband">
      <div className="preisband__spur">
        <div
          className="preisband__intervall"
          style={{
            left: `${anteil(intervall[0])}%`,
            width: `${anteil(intervall[1]) - anteil(intervall[0])}%`,
          }}
        />
        <div className="preisband__fair" style={{ left: `${anteil(fairValue)}%` }} />
        <div className="preisband__angebot" style={{ left: `${anteil(angebotspreis)}%` }} />
      </div>
      <div className="preisband__legende">
        <span>
          <span className="preisband__marke preisband__marke--intervall" aria-hidden="true" />
          Konfidenz {euro(intervall[0])} – {euro(intervall[1])}
        </span>
        <span>
          <span className="preisband__marke preisband__marke--fair" aria-hidden="true" />
          Fair Value {euro(fairValue)}
        </span>
        <span>
          <span className="preisband__marke preisband__marke--angebot" aria-hidden="true" />
          Angebot {euro(angebotspreis)}
        </span>
      </div>
    </div>
  );
}

/* ==========================================================================
 * Erklärbarkeit
 * ======================================================================= */

/** Liste der Score-Beiträge — die Antwort auf „Warum?“ (PRD Abschnitt 39). */
export function Beitragsliste({ score }: { score: Score }) {
  return (
    <div className="beitraege">
      {score.komponenten.map((k) => (
        <details key={k.schluessel} className="komponente">
          <summary className="komponente__kopf">
            <span className="komponente__label">{k.label}</span>
            <span className="komponente__gewicht mono">{k.gewicht} %</span>
            <span className="komponente__punkte mono">{k.punkte}</span>
            <span className="komponente__spur" aria-hidden="true">
              <span
                className={`komponente__fuellung komponente__fuellung--${scorestufe(k.punkte)}`}
                style={{ width: `${k.punkte}%` }}
              />
            </span>
          </summary>
          <ul className="komponente__liste">
            {k.beitraege.map((b, i) => (
              <li key={i} className="beitrag">
                <span
                  className={`beitrag__delta mono ${
                    b.delta === null
                      ? 'beitrag__delta--neutral'
                      : b.delta > 0
                        ? 'beitrag__delta--plus'
                        : 'beitrag__delta--minus'
                  }`}
                >
                  {b.delta === null ? '·' : b.delta > 0 ? `+${b.delta}` : b.delta}
                </span>
                <span className="beitrag__text">
                  {b.text}
                  {b.quelle && <em className="beitrag__quelle">{b.quelle}</em>}
                </span>
              </li>
            ))}
          </ul>
        </details>
      ))}
      {score.hinweise.length > 0 && (
        <ul className="hinweisliste">
          {score.hinweise.map((h, i) => (
            <li key={i}>{h}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Abweichung mit Vorzeichen und Ton. */
export function Abweichung({ prozentwert }: { prozentwert: number }) {
  const ton = prozentwert <= -25 ? 'warn' : prozentwert < 0 ? 'gut' : prozentwert > 12 ? 'warn' : 'neutral';
  return (
    <span className={`abweichung abweichung--${ton}`}>
      {prozent(prozentwert)}
      <span className="visually-hidden">
        {prozentwert < 0 ? ' unter Marktwert' : ' über Marktwert'}
      </span>
    </span>
  );
}

export function Leerzustand({ titel, text }: { titel: string; text: string }) {
  return (
    <div className="empty-state">
      <p className="empty-state__title">{titel}</p>
      <p>{text}</p>
    </div>
  );
}
