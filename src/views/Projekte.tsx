import { useMemo, useState } from 'react';
import { useStore } from '@/state/store';
import { demoProjekt, neuesProjekt } from '@/domain/factory';
import { berichtsnummerString } from '@/domain/naming';
import { PROJEKT_STATUS, KONZEPTANLAESSE } from '@/domain/catalog';
import {
  hoechsterScore,
  massnahmenKennzahlen,
  vollstaendigkeit,
} from '@/domain/stats';
import { Fortschritt, LeerZustand, ScoreBadge } from '@/components/ui';
import type { ProjektStatus } from '@/domain/types';

const dateFmt = new Intl.DateTimeFormat('de-AT', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

function formatDatum(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : dateFmt.format(d);
}

export function Projekte({
  onProjektOeffnen,
}: {
  onProjektOeffnen: (id: string) => void;
}) {
  const { state, dispatch } = useStore();
  const [suche, setSuche] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjektStatus | 'alle'>(
    'alle',
  );

  const gefiltert = useMemo(() => {
    const q = suche.trim().toLowerCase();
    return state.projekte.filter((p) => {
      if (statusFilter !== 'alle' && p.status !== statusFilter) return false;
      if (!q) return true;
      return [
        p.titel,
        p.auftraggeber.name,
        p.auftraggeber.kundennummer,
        p.objekt.bezeichnung,
        p.objekt.ort,
        berichtsnummerString(p),
      ]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [state.projekte, suche, statusFilter]);

  function anlegen() {
    dispatch({ typ: 'projekt-anlegen', projekt: neuesProjekt() });
  }

  function demoAnlegen() {
    dispatch({ typ: 'projekt-anlegen', projekt: demoProjekt() });
  }

  return (
    <div className="stack stack--lg">
      <div className="page-head">
        <div>
          <h1 className="page-head__title">Projekte</h1>
          <p className="page-head__lead">
            Alle Brandschutzkonzepte dieser Arbeitsstation. Die Daten liegen
            lokal im Browser und lassen sich in der Verwaltung exportieren.
          </p>
        </div>
        <div className="row">
          <button type="button" className="btn" onClick={demoAnlegen}>
            Beispielprojekt
          </button>
          <button type="button" className="btn btn--primary" onClick={anlegen}>
            + Neues Konzept
          </button>
        </div>
      </div>

      <div className="filterleiste">
        <label className="field" style={{ flex: '1 1 260px' }}>
          <span className="field__label">Suche</span>
          <input
            className="input"
            type="search"
            value={suche}
            placeholder="Titel, Auftraggeber, Kundennummer, Ort, Berichtsnummer …"
            onChange={(e) => setSuche(e.target.value)}
          />
        </label>
        <label className="field">
          <span className="field__label">Status</span>
          <select
            className="select"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as ProjektStatus | 'alle')
            }
          >
            <option value="alle">Alle</option>
            {PROJEKT_STATUS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {gefiltert.length === 0 ? (
        <LeerZustand
          titel={
            state.projekte.length === 0
              ? 'Noch keine Projekte'
              : 'Keine Treffer'
          }
          text={
            state.projekte.length === 0
              ? 'Legen Sie ein neues Brandschutzkonzept an oder starten Sie mit dem Beispielprojekt.'
              : 'Passen Sie Suchbegriff oder Statusfilter an.'
          }
          aktion={
            state.projekte.length === 0 ? (
              <button
                type="button"
                className="btn btn--primary"
                onClick={anlegen}
              >
                + Neues Konzept
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="projekt-grid">
          {gefiltert.map((p) => {
            const k = massnahmenKennzahlen(p.massnahmen);
            const score = hoechsterScore(p);
            const statusLabel =
              PROJEKT_STATUS.find((s) => s.value === p.status)?.label ??
              p.status;
            const anlassLabel =
              KONZEPTANLAESSE.find((a) => a.value === p.anlass)?.label ??
              p.anlass;

            return (
              <div
                key={p.id}
                className="projekt-karte"
                role="button"
                tabIndex={0}
                onClick={() => onProjektOeffnen(p.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onProjektOeffnen(p.id);
                  }
                }}
              >
                <div>
                  <div className="row" style={{ marginBottom: 'var(--sp-2)' }}>
                    <span className="badge badge--brand">{statusLabel}</span>
                    <span className="badge">{anlassLabel}</span>
                    <span className="spacer" />
                    {score && <ScoreBadge score={score} />}
                  </div>
                  <h2 className="projekt-karte__titel">{p.titel}</h2>
                  <p className="projekt-karte__meta">
                    {p.auftraggeber.name || 'Auftraggeber offen'}
                    {p.auftraggeber.kundennummer &&
                      ` · KD-${p.auftraggeber.kundennummer}`}
                  </p>
                  <p className="projekt-karte__meta">
                    {p.objekt.bezeichnung || 'Objekt nicht benannt'}
                    {p.objekt.ort && `, ${p.objekt.ort}`}
                  </p>
                </div>

                <div className="mono subtle" style={{ fontSize: 'var(--fs-2xs)' }}>
                  {berichtsnummerString(p)}
                </div>

                <Fortschritt
                  wert={vollstaendigkeit(p)}
                  label="Vollständigkeit"
                />

                <div className="projekt-karte__fuss">
                  <span>
                    <strong className="num">{k.offen + k.inUmsetzung}</strong>{' '}
                    offen
                  </span>
                  {k.ueberfaellig > 0 && (
                    <span style={{ color: 'var(--danger)' }}>
                      <strong className="num">{k.ueberfaellig}</strong> überfällig
                    </span>
                  )}
                  <span className="spacer" />
                  <span>{formatDatum(p.datum)}</span>
                  <button
                    type="button"
                    className="btn btn--ghost btn--icon btn--sm"
                    title="Duplizieren"
                    aria-label="Projekt duplizieren"
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatch({ typ: 'projekt-duplizieren', id: p.id });
                    }}
                  >
                    ⧉
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost btn--icon btn--sm"
                    title="Löschen"
                    aria-label="Projekt löschen"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (
                        confirm(
                          `Projekt „${p.titel}“ endgültig löschen? Diese Aktion kann nicht rückgängig gemacht werden.`,
                        )
                      ) {
                        dispatch({ typ: 'projekt-loeschen', id: p.id });
                      }
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
