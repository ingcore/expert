import { useMemo, useState } from 'react';
import {
  FLUCHTWEG_BREITE_JE_PERSON,
  FLUCHTWEG_MAX_LAENGE,
  FLUCHTWEG_MIN_BREITE,
  GEBAEUDEKLASSEN,
  LE_JE_QM,
  LE_MINDEST,
  MAX_BRANDABSCHNITT,
  MAX_WEG_ZU_LOESCHER,
  NUTZUNGSARTEN,
  REGELWERKE,
  SAFETY_SCORES,
  SCHWELLE_PANIKBESCHLAG_PERSONEN,
  SCHWELLE_VERSAMMLUNG_PERSONEN,
} from '@/domain/catalog';
import { SHAREPOINT_ORDNER } from '@/domain/naming';
import { Karte } from '@/components/ui';

export function Regelwerk() {
  const [suche, setSuche] = useState('');

  const gefiltert = useMemo(() => {
    const q = suche.trim().toLowerCase();
    if (!q) return REGELWERKE;
    return REGELWERKE.filter((r) =>
      `${r.kuerzel} ${r.titel} ${r.bereich}`.toLowerCase().includes(q),
    );
  }, [suche]);

  return (
    <div className="stack stack--lg">
      <div className="page-head">
        <div>
          <h1 className="page-head__title">Regelwerk und Kennwerte</h1>
          <p className="page-head__lead">
            Nachschlagewerk zu den Grenzwerten, die der Prüflogik zugrunde
            liegen. Die Werte sind Richtwerte des österreichischen Regelwerks —
            im Einzelfall können behördliche Vorschreibungen abweichen.
          </p>
        </div>
      </div>

      <Karte
        titel="Gebäudeklassen"
        untertitel="OIB-Richtlinie 2, Punkt 1 — Begriffsbestimmungen"
        flush
      >
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '70px' }}>Klasse</th>
                <th style={{ minWidth: '300px' }}>Beschreibung</th>
                <th style={{ width: '120px' }}>Fluchtniveau</th>
                <th style={{ width: '110px' }}>Tragwerk</th>
                <th style={{ width: '110px' }}>Trenndecke</th>
              </tr>
            </thead>
            <tbody>
              {GEBAEUDEKLASSEN.map((g) => (
                <tr key={g.klasse}>
                  <td>
                    <strong>{g.klasse}</strong>
                  </td>
                  <td>
                    <div style={{ fontWeight: 'var(--fw-medium)' }}>{g.kurz}</div>
                    <div className="subtle" style={{ fontSize: 'var(--fs-xs)' }}>
                      {g.beschreibung}
                    </div>
                  </td>
                  <td className="num nowrap">
                    {g.maxFluchtniveau === null
                      ? 'über 11 m'
                      : `bis ${g.maxFluchtniveau} m`}
                  </td>
                  <td className="mono">
                    {g.tragwerk === 'keine' ? '—' : g.tragwerk}
                  </td>
                  <td className="mono">{g.trenndecke}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Karte>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))',
          gap: 'var(--sp-5)',
          alignItems: 'start',
        }}
      >
        <Karte titel="Fluchtwege" untertitel="OIB-Richtlinie 2, Punkt 5">
          <div className="stack stack--sm">
            <KennwertZeile
              label="Maximale Länge, Risiko normal"
              wert={`${FLUCHTWEG_MAX_LAENGE.normal} m`}
            />
            <KennwertZeile
              label="Maximale Länge, Risiko erhöht"
              wert={`${FLUCHTWEG_MAX_LAENGE.erhoeht} m`}
            />
            <KennwertZeile
              label="Maximale Länge, Risiko hoch"
              wert={`${FLUCHTWEG_MAX_LAENGE.hoch} m`}
            />
            <KennwertZeile
              label="Mindestbreite"
              wert={`${FLUCHTWEG_MIN_BREITE.toFixed(2)} m`}
            />
            <KennwertZeile
              label="Breite je Person"
              wert={`${(FLUCHTWEG_BREITE_JE_PERSON * 100).toFixed(0)} cm/100 P.`}
            />
            <KennwertZeile
              label="Panikbeschlag ab"
              wert={`${SCHWELLE_PANIKBESCHLAG_PERSONEN} Personen`}
            />
            <KennwertZeile
              label="Zweiter Fluchtweg ab"
              wert={`${SCHWELLE_VERSAMMLUNG_PERSONEN} Personen`}
            />
          </div>
        </Karte>

        <Karte titel="Löschhilfen" untertitel="TRVB F 124 und TRVB F 128">
          <div className="stack stack--sm">
            <KennwertZeile
              label="Löschmitteleinheiten je m²"
              wert={`${LE_JE_QM} LE/m²`}
            />
            <KennwertZeile
              label="Mindestausstattung je Bereich"
              wert={`${LE_MINDEST} LE`}
            />
            <KennwertZeile
              label="Maximaler Weg zum Löscher"
              wert={`${MAX_WEG_ZU_LOESCHER} m`}
            />
            <KennwertZeile label="Hydrantenentfernung" wert="max. 150 m" />
            <KennwertZeile
              label="Prüfintervall Feuerlöscher"
              wert="jährlich, längstens 2 Jahre"
            />
          </div>
        </Karte>
      </div>

      <Karte
        titel="Richtwerte für Brandabschnittsflächen"
        untertitel="Nach Nutzungsart — im Einzelfall behördlich abweichend"
        flush
      >
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Nutzungsart</th>
                <th style={{ width: '180px' }}>Maximale Fläche</th>
              </tr>
            </thead>
            <tbody>
              {NUTZUNGSARTEN.map((n) => (
                <tr key={n.value}>
                  <td>{n.label}</td>
                  <td className="num">
                    {MAX_BRANDABSCHNITT[n.value].toLocaleString('de-AT')} m²
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Karte>

      <Karte
        titel="INGTEC SAFETY-SCORE"
        untertitel="Bewertungsgrundlage der Mängelliste"
        flush
      >
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>Grad</th>
                <th style={{ width: '190px' }}>Kurzbewertung</th>
                <th>Beschreibung</th>
                <th style={{ width: '150px' }}>Empfohlene Frist</th>
              </tr>
            </thead>
            <tbody>
              {SAFETY_SCORES.map((s) => (
                <tr key={s.score}>
                  <td>
                    <span
                      className="score-legende__kuerzel"
                      style={{
                        background: s.farbe,
                        color: s.textfarbe,
                        display: 'inline-flex',
                        width: '2rem',
                      }}
                    >
                      {s.score}
                    </span>
                  </td>
                  <td style={{ fontWeight: 'var(--fw-medium)' }}>{s.kurz}</td>
                  <td className="muted">{s.beschreibung}</td>
                  <td className="nowrap">
                    {s.fristTage === null
                      ? '—'
                      : s.fristTage === 0
                        ? 'sofort'
                        : `${s.fristTage} Tage`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Karte>

      <Karte
        titel="Regelwerkskatalog"
        untertitel={`${gefiltert.length} von ${REGELWERKE.length} Einträgen`}
        aktion={
          <input
            className="input"
            type="search"
            value={suche}
            placeholder="Suchen …"
            style={{ maxWidth: '220px' }}
            onChange={(e) => setSuche(e.target.value)}
          />
        }
        flush
      >
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '160px' }}>Kürzel</th>
                <th>Titel</th>
                <th style={{ width: '230px' }}>Bereich</th>
              </tr>
            </thead>
            <tbody>
              {gefiltert.map((r) => (
                <tr key={r.kuerzel}>
                  <td>
                    <strong className="nowrap">{r.kuerzel}</strong>
                  </td>
                  <td>{r.titel}</td>
                  <td className="subtle">{r.bereich}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Karte>

      <Karte
        titel="INGTEC-Ablagestruktur"
        untertitel="Ordner je Kunde auf SharePoint"
      >
        <ol className="stack stack--sm" style={{ paddingLeft: '1.2rem' }}>
          {SHAREPOINT_ORDNER.map((o) => (
            <li key={o} className="mono" style={{ fontSize: 'var(--fs-md)' }}>
              {o}
            </li>
          ))}
        </ol>
        <p className="field__hint" style={{ marginTop: 'var(--sp-4)' }}>
          Fertige Berichte werden unter <strong>5_Berichte- Begehungen</strong>{' '}
          abgelegt, Fotos für die Mängelliste liegen unter{' '}
          <strong>4_Fotos- Checklisten</strong>.
        </p>
      </Karte>
    </div>
  );
}

function KennwertZeile({ label, wert }: { label: string; wert: string }) {
  return (
    <div
      className="row row--between"
      style={{
        paddingBottom: 'var(--sp-2)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <span className="muted" style={{ fontSize: 'var(--fs-md)' }}>
        {label}
      </span>
      <strong className="num nowrap">{wert}</strong>
    </div>
  );
}
