import { useMemo } from 'react';
import { useStore } from '@/state/store';
import { pruefeProjekt, befundStatistik } from '@/domain/rules';
import {
  hoechsterScore,
  istUeberfaellig,
  massnahmenKennzahlen,
  risikoindex,
  vollstaendigkeit,
} from '@/domain/stats';
import { SAFETY_SCORES, SCORE_BY_KEY, PROJEKT_STATUS } from '@/domain/catalog';
import {
  Karte,
  Kennzahl,
  LeerZustand,
  ScoreBadge,
  ScoreVerteilung,
} from '@/components/ui';
import type { Ansicht } from '@/App';
import type { Massnahme, Projekt } from '@/domain/types';

interface Props {
  onProjektOeffnen: (id: string) => void;
  onWechsel: (ansicht: Ansicht) => void;
}

const dateFmt = new Intl.DateTimeFormat('de-AT', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

function formatDatum(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : dateFmt.format(d);
}

const euroFmt = new Intl.NumberFormat('de-AT', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

export function Dashboard({ onProjektOeffnen, onWechsel }: Props) {
  const { state } = useStore();
  const projekte = state.projekte;

  const auswertung = useMemo(() => {
    const alleMassnahmen: (Massnahme & { projekt: Projekt })[] = [];
    let fehlerGesamt = 0;
    let warnungGesamt = 0;

    for (const p of projekte) {
      const stat = befundStatistik(pruefeProjekt(p));
      fehlerGesamt += stat.fehler;
      warnungGesamt += stat.warnung;
      for (const m of p.massnahmen) {
        alleMassnahmen.push({ ...m, projekt: p });
      }
    }

    const kennzahlen = massnahmenKennzahlen(alleMassnahmen);

    const kritisch = alleMassnahmen
      .filter(
        (m) =>
          (m.status === 'offen' || m.status === 'in-umsetzung') &&
          (m.score === 'D' || m.score === 'E' || istUeberfaellig(m)),
      )
      .sort((a, b) => {
        const rang = { E: 0, D: 1, C: 2, B: 3, A: 4 };
        const d = rang[a.score] - rang[b.score];
        if (d !== 0) return d;
        return (a.frist || '9999').localeCompare(b.frist || '9999');
      })
      .slice(0, 8);

    const nachRisiko = [...projekte]
      .map((p) => ({ projekt: p, index: risikoindex(p) }))
      .sort((a, b) => b.index - a.index);

    return { kennzahlen, kritisch, fehlerGesamt, warnungGesamt, nachRisiko };
  }, [projekte]);

  if (projekte.length === 0) {
    return (
      <LeerZustand
        titel="Noch keine Projekte angelegt"
        text="Legen Sie ein Brandschutzkonzept an, um mit der Erfassung zu beginnen."
        aktion={
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => onWechsel('projekte')}
          >
            Zur Projektverwaltung
          </button>
        }
      />
    );
  }

  const { kennzahlen, kritisch, fehlerGesamt, warnungGesamt, nachRisiko } =
    auswertung;

  return (
    <div className="stack stack--lg">
      <div className="page-head">
        <div>
          <h1 className="page-head__title">Dashboard</h1>
          <p className="page-head__lead">
            Portfolioübersicht über alle Brandschutzkonzepte: offene Mängel nach
            SAFETY-SCORE, überfällige Fristen und Regelwerksbefunde.
          </p>
        </div>
      </div>

      <div className="kpi-grid">
        <Kennzahl
          label="Projekte"
          wert={projekte.length}
          hinweis={`${projekte.filter((p) => p.status === 'freigegeben').length} freigegeben`}
          ton="brand"
        />
        <Kennzahl
          label="Offene Mängel"
          wert={kennzahlen.offen + kennzahlen.inUmsetzung}
          hinweis={`von ${kennzahlen.gesamt} gesamt`}
          ton={kennzahlen.offen > 0 ? 'warn' : 'gut'}
        />
        <Kennzahl
          label="Überfällig"
          wert={kennzahlen.ueberfaellig}
          hinweis="Frist überschritten"
          ton={kennzahlen.ueberfaellig > 0 ? 'gefahr' : 'gut'}
        />
        <Kennzahl
          label="Regelverstöße"
          wert={fehlerGesamt}
          hinweis={`${warnungGesamt} Warnungen`}
          ton={fehlerGesamt > 0 ? 'gefahr' : 'gut'}
        />
        <Kennzahl
          label="Offene Kosten"
          wert={euroFmt.format(kennzahlen.kostenOffen)}
          hinweis="geschätzte Umsetzung"
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: 'var(--sp-5)',
          alignItems: 'start',
        }}
      >
        <Karte
          titel="Mängel nach SAFETY-SCORE"
          untertitel="Verteilung über alle Projekte"
        >
          <div className="stack">
            <ScoreVerteilung verteilung={kennzahlen.verteilung} />
            <div className="score-legende">
              {SAFETY_SCORES.map((s) => (
                <div key={s.score} className="score-legende__zeile">
                  <span
                    className="score-legende__kuerzel"
                    style={{ background: s.farbe, color: s.textfarbe }}
                  >
                    {s.score}
                  </span>
                  <span>
                    <strong>{kennzahlen.verteilung[s.score]}</strong>{' '}
                    <span className="muted">— {s.kurz}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Karte>

        <Karte
          titel="Projekte nach Risikoindex"
          untertitel="Gewichtete Summe der offenen Mängel"
        >
          <div className="stack stack--sm">
            {nachRisiko.map(({ projekt, index }) => {
              const score = hoechsterScore(projekt);
              const max = Math.max(1, nachRisiko[0]?.index ?? 1);
              return (
                <button
                  key={projekt.id}
                  type="button"
                  className="btn btn--ghost"
                  style={{
                    justifyContent: 'flex-start',
                    padding: 'var(--sp-2) var(--sp-3)',
                    height: 'auto',
                    width: '100%',
                  }}
                  onClick={() => onProjektOeffnen(projekt.id)}
                >
                  <div style={{ width: '100%', textAlign: 'left' }}>
                    <div className="row" style={{ gap: 'var(--sp-2)' }}>
                      <span
                        style={{
                          fontWeight: 'var(--fw-medium)',
                          fontSize: 'var(--fs-md)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {projekt.titel}
                      </span>
                      <span className="spacer" />
                      {score && <ScoreBadge score={score} />}
                      <span className="mono subtle num">{index}</span>
                    </div>
                    <div
                      className="progress__track"
                      style={{ marginTop: '0.35rem' }}
                    >
                      <div
                        className="progress__fill"
                        style={{
                          width: `${(index / max) * 100}%`,
                          background:
                            index > 0
                              ? SCORE_BY_KEY[score ?? 'B'].farbe
                              : 'var(--border)',
                        }}
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Karte>
      </div>

      <Karte
        titel="Dringender Handlungsbedarf"
        untertitel="Mängel der Stufen D und E sowie überfällige Fristen"
        flush
      >
        {kritisch.length === 0 ? (
          <LeerZustand
            titel="Kein dringender Handlungsbedarf"
            text="Derzeit sind keine Mängel der Stufen D oder E offen und keine Fristen überschritten."
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '52px' }}>Score</th>
                  <th>Mangel</th>
                  <th>Projekt</th>
                  <th style={{ width: '110px' }}>Frist</th>
                  <th style={{ width: '120px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {kritisch.map((m) => {
                  const ueberfaellig = istUeberfaellig(m);
                  return (
                    <tr
                      key={`${m.projekt.id}-${m.id}`}
                      onClick={() => onProjektOeffnen(m.projekt.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <ScoreBadge score={m.score} />
                      </td>
                      <td>
                        <div style={{ fontWeight: 'var(--fw-medium)' }}>
                          {m.bereich || '—'}
                        </div>
                        <div className="subtle" style={{ fontSize: 'var(--fs-xs)' }}>
                          {m.beschreibung.slice(0, 120)}
                          {m.beschreibung.length > 120 ? '…' : ''}
                        </div>
                      </td>
                      <td className="subtle">{m.projekt.titel}</td>
                      <td className={ueberfaellig ? '' : 'subtle'}>
                        <span
                          style={
                            ueberfaellig
                              ? {
                                  color: 'var(--danger)',
                                  fontWeight: 'var(--fw-semibold)',
                                }
                              : undefined
                          }
                        >
                          {formatDatum(m.frist)}
                        </span>
                        {ueberfaellig && (
                          <div
                            style={{
                              fontSize: 'var(--fs-2xs)',
                              color: 'var(--danger)',
                            }}
                          >
                            überfällig
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="badge">
                          {m.status === 'in-umsetzung'
                            ? 'In Umsetzung'
                            : 'Offen'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Karte>

      <Karte titel="Projektstatus" untertitel="Bearbeitungsstand und Vollständigkeit" flush>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Projekt</th>
                <th style={{ width: '150px' }}>Status</th>
                <th style={{ width: '180px' }}>Vollständigkeit</th>
                <th style={{ width: '110px' }}>Datum</th>
                <th style={{ width: '90px' }}>Mängel</th>
              </tr>
            </thead>
            <tbody>
              {projekte.map((p) => {
                const k = massnahmenKennzahlen(p.massnahmen);
                const v = vollstaendigkeit(p);
                const statusLabel =
                  PROJEKT_STATUS.find((s) => s.value === p.status)?.label ??
                  p.status;
                return (
                  <tr
                    key={p.id}
                    onClick={() => onProjektOeffnen(p.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <div style={{ fontWeight: 'var(--fw-medium)' }}>
                        {p.titel}
                      </div>
                      <div className="subtle" style={{ fontSize: 'var(--fs-xs)' }}>
                        {p.auftraggeber.name || 'Auftraggeber offen'}
                      </div>
                    </td>
                    <td>
                      <span className="badge">{statusLabel}</span>
                    </td>
                    <td>
                      <div className="progress__track">
                        <div
                          className="progress__fill"
                          style={{ width: `${v}%` }}
                        />
                      </div>
                      <span
                        className="subtle num"
                        style={{ fontSize: 'var(--fs-2xs)' }}
                      >
                        {v}%
                      </span>
                    </td>
                    <td className="subtle nowrap">{formatDatum(p.datum)}</td>
                    <td className="num">
                      {k.offen + k.inUmsetzung}
                      <span className="subtle"> / {k.gesamt}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Karte>
    </div>
  );
}
