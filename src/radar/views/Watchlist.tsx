/**
 * Watchlist und Kaufprozess — PRD Abschnitt 26.
 *
 * Die Statusfolge aus dem PRD ist zugleich der Kaufprozess: Beobachten,
 * Kontaktieren, Unterlagen angefordert, technisch prüfen, Probefahrt,
 * Verhandlung, Kaufentscheidung — und die beiden Endzustände abgelehnt und
 * gekauft. Damit entsteht ohne zusätzliches Werkzeug ein CRM-artiger Ablauf.
 */

import { datum } from '../domain/format';
import type { WatchlistStatus } from '../domain/types';
import { useStore } from '../state/store';
import { Fahrzeugzeile } from '../components/Fahrzeugzeile';
import { Karte, Leerzustand, Marke, Seitenkopf } from '../components/ui';

const STATUS_REIHE: WatchlistStatus[] = [
  'beobachten',
  'kontaktieren',
  'unterlagen-angefordert',
  'technisch-pruefen',
  'probefahrt',
  'verhandlung',
  'kaufentscheidung',
  'gekauft',
  'abgelehnt',
];

const STATUS_LABEL: Record<WatchlistStatus, string> = {
  beobachten: 'Beobachten',
  kontaktieren: 'Kontaktieren',
  'unterlagen-angefordert': 'Unterlagen angefordert',
  'technisch-pruefen': 'Technisch prüfen',
  probefahrt: 'Probefahrt',
  verhandlung: 'Verhandlung',
  kaufentscheidung: 'Kaufentscheidung',
  abgelehnt: 'Abgelehnt',
  gekauft: 'Gekauft',
};

export function Watchlistseite({
  oeffneFahrzeug,
}: {
  oeffneFahrzeug: (id: string) => void;
}) {
  const { state, dispatch, analyseZu } = useStore();
  const watchlist = state.arbeit.watchlist;

  return (
    <>
      <Seitenkopf
        titel="Watchlist und Kaufprozess"
        lead="Jedes Fahrzeug durchläuft dieselben Stationen. Der Status ist keine Etikette, sondern bestimmt, welche Arbeit als Nächstes ansteht."
      />

      {watchlist.length === 0 ? (
        <Karte>
          <Leerzustand
            titel="Die Watchlist ist leer"
            text="Nehmen Sie auf einer Fahrzeugakte ein Fahrzeug auf, um Prüfergebnisse, Verkäuferanfragen und den Kaufprozess zu erfassen."
          />
        </Karte>
      ) : (
        <div className="stack stack--lg">
          {watchlist.map((eintrag) => {
            const analyse = analyseZu(eintrag.fahrzeugId);
            const geprueft = eintrag.pruefung.filter(
              (p) => p.status !== 'nicht-geprueft',
            ).length;
            const maengel = eintrag.pruefung.filter(
              (p) => p.status === 'mangel' || p.status === 'nicht-bestanden',
            ).length;

            return (
              <Karte
                key={eintrag.id}
                titel={analyse?.aktuell.titel ?? 'Fahrzeug nicht mehr im Bestand'}
                untertitel={`Aufgenommen am ${datum(eintrag.aufgenommenAm)} · zuletzt geändert ${datum(
                  eintrag.geaendertAm,
                )} · verantwortlich ${eintrag.verantwortlich}`}
                beurteilung
                aktion={
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => dispatch({ typ: 'watchlist-entfernen', id: eintrag.id })}
                  >
                    Entfernen
                  </button>
                }
              >
                {analyse && (
                  <div style={{ marginBottom: 'var(--sp-4)' }}>
                    <Fahrzeugzeile
                      analyse={analyse}
                      gemerkt
                      onClick={() => oeffneFahrzeug(analyse.fahrzeugId)}
                    />
                  </div>
                )}

                <div className="row row--wrap" style={{ gap: 'var(--sp-2)', marginBottom: 'var(--sp-4)' }}>
                  {STATUS_REIHE.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`btn btn--sm ${eintrag.status === s ? 'btn--primary' : ''}`}
                      onClick={() => dispatch({ typ: 'watchlist-status', id: eintrag.id, status: s })}
                    >
                      {STATUS_LABEL[s]}
                    </button>
                  ))}
                </div>

                <div className="row row--wrap" style={{ gap: 'var(--sp-3)', marginBottom: 'var(--sp-4)' }}>
                  <Marke ton="brand">Status: {STATUS_LABEL[eintrag.status]}</Marke>
                  {eintrag.anfrageVersendetAm ? (
                    <Marke ton="gut">
                      Verkäuferanfrage freigegeben am {datum(eintrag.anfrageVersendetAm)}
                    </Marke>
                  ) : (
                    <Marke ton="warn">Verkäuferanfrage noch nicht freigegeben</Marke>
                  )}
                  {analyse && (
                    <Marke>
                      {geprueft} von {analyse.pruefpunkte.length} Prüfpunkten bearbeitet
                    </Marke>
                  )}
                  {maengel > 0 && <Marke ton="gefahr">{maengel} Mängel erfasst</Marke>}
                </div>

                <label className="field">
                  <span className="field__label">Bemerkung</span>
                  <textarea
                    className="textarea"
                    rows={2}
                    value={eintrag.bemerkung}
                    onChange={(e) =>
                      dispatch({
                        typ: 'watchlist-bemerkung',
                        id: eintrag.id,
                        text: e.target.value,
                      })
                    }
                    placeholder="Zwischenstand, offene Punkte, Verhandlungsposition …"
                  />
                </label>

                {eintrag.pruefung.length > 0 && analyse && (
                  <div className="table-wrap" style={{ marginTop: 'var(--sp-4)' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Prüfpunkt</th>
                          <th>Ergebnis</th>
                          <th>Geprüft</th>
                        </tr>
                      </thead>
                      <tbody>
                        {eintrag.pruefung
                          .filter((p) => p.status !== 'nicht-geprueft')
                          .map((p) => {
                            const punkt = analyse.pruefpunkte.find((x) => x.id === p.punktId);
                            return (
                              <tr key={p.punktId}>
                                <td style={{ fontSize: 'var(--fs-xs)' }}>
                                  {punkt?.text ?? p.punktId}
                                </td>
                                <td>
                                  {p.status === 'bestanden' ? (
                                    <Marke ton="gut">bestanden</Marke>
                                  ) : p.status === 'hinweis' ? (
                                    <Marke ton="warn">Hinweis</Marke>
                                  ) : (
                                    <Marke ton="gefahr">{p.status}</Marke>
                                  )}
                                </td>
                                <td className="mono nowrap">
                                  {datum(p.geprueftAm)} · {p.geprueftVon}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Karte>
            );
          })}
        </div>
      )}
    </>
  );
}
