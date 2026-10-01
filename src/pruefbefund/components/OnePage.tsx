/**
 * Einseitiger A4-Prüfbefund (PRD Abschnitt 11).
 *
 * Die Bereiche A bis H entsprechen eins zu eins der Gliederung des PRD.
 * Der Befund umfasst immer genau eine A4-Seite: Umfangreiche Mängel, Fotos
 * und die Detailcheckliste sind Anlagen und erscheinen hier nur als Verweis
 * (AC-09, AC-10).
 */

import { Logo } from '@/components/Logo';
import type { BefundModell } from '@/pruefbefund/domain/befund';

export function OnePage({ modell }: { modell: BefundModell }) {
  const { kopf, maengel } = modell;

  // Zweispaltige Aufteilung des Prüfgegenstandes (PRD 11, Bereich C).
  const mitte = Math.ceil(modell.pruefgegenstand.length / 2);
  const spalteLinks = modell.pruefgegenstand.slice(0, mitte);
  const spalteRechts = modell.pruefgegenstand.slice(mitte);

  return (
    <article
      className={`onepage onepage--${modell.verdichtung}`}
      aria-label="Prüfbefund, eine A4-Seite"
    >
      {/* ---- Bereich A — Kopf ------------------------------------------- */}
      <header className="onepage__kopf">
        <div className="onepage__kopf-links">
          <h2 className="onepage__block-titel">Eigentümer / Betreiber</h2>
          {kopf.betreiber.map((z, i) => (
            <div key={`b${i}`} className={i === 0 ? 'onepage__stark' : undefined}>
              {z}
            </div>
          ))}
          <h2 className="onepage__block-titel onepage__block-titel--abstand">
            Standort
          </h2>
          {kopf.standort.map((z, i) => (
            <div key={`s${i}`}>{z}</div>
          ))}
        </div>

        <div className="onepage__kopf-rechts">
          <Logo className="onepage__logo" />
          {kopf.pruefstelle.map((z, i) => (
            <div key={`p${i}`} className={i === 0 ? 'onepage__stark' : undefined}>
              {z}
            </div>
          ))}
          <dl className="onepage__kennung">
            <dt>Prüfbefundnummer</dt>
            <dd className="num">{kopf.befundnummer}</dd>
            <dt>Prüfdatum</dt>
            <dd className="num">{kopf.pruefdatum}</dd>
          </dl>
        </div>
      </header>

      {/* ---- Bereich B — Titel ------------------------------------------ */}
      <div className="onepage__titelblock">
        <h1 className="onepage__titel">{modell.titel}</h1>
        {/* Genau eine Rechtsgrundlage — niemals beide (PRD 11, Bereich B). */}
        <p className="onepage__titelzeile">{modell.titelzeile}</p>
      </div>

      {/* ---- Bereich C — Prüfgegenstand --------------------------------- */}
      <section className="onepage__abschnitt">
        <h2 className="onepage__block-titel">Prüfgegenstand</h2>
        <div className="onepage__zweispaltig">
          <Definitionsliste zeilen={spalteLinks} />
          <Definitionsliste zeilen={spalteRechts} />
        </div>
        {modell.pruefgegenstandAnlagenverweis && (
          <p className="onepage__anlagenverweis">
            {modell.pruefgegenstandAnlagenverweis}
          </p>
        )}
      </section>

      {/* ---- Bereich D — Prüfung ---------------------------------------- */}
      <section className="onepage__abschnitt">
        <h2 className="onepage__block-titel">Prüfung</h2>
        <Definitionsliste zeilen={modell.pruefung} breit />
        <div className="onepage__haupttext">
          {modell.haupttext.map((absatz, i) => (
            <p key={i}>{absatz}</p>
          ))}
        </div>
      </section>

      {/* ---- Bereich E — Ergebnis --------------------------------------- */}
      <section
        className={`onepage__ergebnis onepage__ergebnis--${modell.ergebnis.ton}`}
      >
        <span className="onepage__ergebnis-label">Prüfungsergebnis</span>
        <strong className="onepage__ergebnis-text">{modell.ergebnis.zeile}</strong>
      </section>

      {/* ---- Bereich F — Mängel ------------------------------------------ */}
      {maengel.anzahl > 0 && (
        <section className="onepage__abschnitt">
          <h2 className="onepage__block-titel">
            Festgestellte Mängel ({maengel.anzahl})
          </h2>
          <table className="onepage__tabelle">
            <thead>
              <tr>
                <th scope="col" className="onepage__spalte-nr">Nr.</th>
                <th scope="col">Mangel</th>
                <th scope="col" className="onepage__spalte-ort">Bauteil / Ort</th>
                <th scope="col" className="onepage__spalte-frist">Frist</th>
              </tr>
            </thead>
            <tbody>
              {maengel.dargestellt.map((m) => (
                <tr key={m.nummer}>
                  <td className="num">{m.nummer}</td>
                  <td>{m.beschreibung || '—'}</td>
                  <td>{m.bauteil || '—'}</td>
                  <td className="num">{m.frist}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {maengel.anlagenverweis && (
            <p className="onepage__anlagenverweis">{maengel.anlagenverweis}</p>
          )}
        </section>
      )}

      {/* ---- Bereich G — Prüfer ----------------------------------------- */}
      <section className="onepage__pruefer">
        <div>
          <h2 className="onepage__block-titel">Prüfer</h2>
          <Definitionsliste zeilen={modell.pruefer} />
        </div>
        <div className="onepage__unterschrift">
          <div className="onepage__unterschrift-linie" />
          <span>
            {modell.unterschriftVorhanden
              ? 'Unterschrift des Prüfers'
              : 'Unterschrift fehlt — Befund nicht gültig'}
          </span>
        </div>
      </section>

      {/* ---- Bereich H — Fußbereich ------------------------------------- */}
      <footer className="onepage__fuss">
        <p>{modell.fussnote}</p>
        <p className="onepage__revision">
          Rechtsstand zum Prüfdatum {kopf.pruefdatum} · Vorlage{' '}
          {modell.templateVersion} · INGTEC GmbH — TECHNIK.WIRKT
        </p>
      </footer>
    </article>
  );
}

function Definitionsliste({
  zeilen,
  breit = false,
}: {
  zeilen: { label: string; wert: string }[];
  breit?: boolean;
}) {
  if (zeilen.length === 0) return null;
  return (
    <dl className={`onepage__dl ${breit ? 'onepage__dl--breit' : ''}`}>
      {zeilen.map((z) => (
        <div key={z.label} className="onepage__dl-zeile">
          <dt>{z.label}</dt>
          <dd>{z.wert}</dd>
        </div>
      ))}
    </dl>
  );
}
