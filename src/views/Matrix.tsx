import { useMemo, useState } from 'react';
import { useAktivesProjekt } from '@/state/store';
import { matrixKennzahlen } from '@/engine/engine';
import { findeAnforderung } from '@/engine/engine';
import { quelleKurz } from '@/engine/types';
import type {
  AnforderungsErgebnis,
  ErgebnisStatus,
  MatrixErgebnis,
} from '@/engine/types';
import { BUNDESLAENDER } from '@/engine/types';
import { OVERLAY_ABDECKUNG } from '@/engine/regelwerk/overlays';
import { neueAbweichung } from '@/domain/factory';
import { Ampel, AmpelLegende } from '@/components/Ampel';
import { Karte, Kennzahl, LeerZustand } from '@/components/ui';

const STATUS_LABEL: Record<ErgebnisStatus, string> = {
  erfuellt: 'Erfüllt',
  'nicht-erfuellt': 'Nicht erfüllt',
  abweichung: 'Abweichung',
  datenluecke: 'Datenlücke',
  konflikt: 'Regelkonflikt',
  'nicht-anwendbar': 'Nicht anwendbar',
};

/** Symbol je Status — Farbe ist nie das einzige Merkmal (CD Kapitel 1). */
const STATUS_SYMBOL: Record<ErgebnisStatus, string> = {
  erfuellt: '✓',
  'nicht-erfuellt': '✕',
  abweichung: '▲',
  datenluecke: '□',
  konflikt: '≠',
  'nicht-anwendbar': '–',
};

function badgeKlasse(status: ErgebnisStatus): string {
  switch (status) {
    case 'erfuellt':
      return 'badge badge--success';
    case 'nicht-erfuellt':
    case 'konflikt':
      return 'badge badge--danger';
    case 'abweichung':
    case 'datenluecke':
      return 'badge badge--warning';
    default:
      return 'badge';
  }
}

function anzeige(wert: string | number | boolean | null, einheit?: string): string {
  if (wert === null || wert === undefined) return '—';
  if (typeof wert === 'boolean') return wert ? 'vorhanden' : 'nicht vorhanden';
  if (typeof wert === 'number') {
    return `${wert.toLocaleString('de-AT', { maximumFractionDigits: 2 })}${einheit ? ` ${einheit}` : ''}`;
  }
  return String(wert);
}

export function Matrix({ matrix }: { matrix: MatrixErgebnis }) {
  const { projekt, patch } = useAktivesProjekt();
  const [filter, setFilter] = useState<ErgebnisStatus | 'alle'>('alle');
  const [detail, setDetail] = useState<string | null>(null);

  const kennzahlen = useMemo(() => matrixKennzahlen(matrix), [matrix]);

  const gefiltert = useMemo(
    () =>
      filter === 'alle'
        ? matrix.ergebnisse
        : matrix.ergebnisse.filter((e) => e.status === filter),
    [matrix, filter],
  );

  if (!projekt) return <LeerZustand titel="Kein Projekt geöffnet" />;

  const landName =
    BUNDESLAENDER.find((b) => b.code === matrix.bundesland)?.name ??
    matrix.bundesland;
  const overlayGeprueft = OVERLAY_ABDECKUNG[matrix.bundesland];

  /** Legt aus einer nicht erfüllten Anforderung eine Abweichung an (FR-3.1). */
  function alsAbweichung(e: AnforderungsErgebnis) {
    if (!projekt) return;
    if (projekt.abweichungen.some((a) => a.anforderungId === e.anforderungId)) {
      return;
    }
    const neu = neueAbweichung(e.anforderungId);
    neu.anforderung = `${e.bezeichnung} (${quelleKurz(e.quelle)})`;
    neu.beschreibung = e.begruendung;
    patch({ abweichungen: [...projekt.abweichungen, neu] });
  }

  return (
    <div className="stack stack--lg">
      <div className="page-head">
        <div>
          <h1 className="page-head__title">Anforderungsmatrix</h1>
          <p className="page-head__lead">
            Von der Regel-Engine aufgelöste Anforderungen mit Soll-/Ist-Vergleich.
            Jeder Wert stammt aus der Regeldatenbank und ist bis zur Normstelle
            belegt — die Engine bestimmt, was gilt.
          </p>
        </div>
      </div>

      {/* Auswertungsrahmen */}
      <div className="hinweis-box">
        <div className="row row--wrap" style={{ gap: 'var(--sp-5)' }}>
          <span>
            <strong>Ausgabestand:</strong> OIB-RL 2, {matrix.ausgabe}
          </span>
          <span>
            <strong>Bundesland:</strong> {landName}
            {!overlayGeprueft && (
              <span style={{ color: 'var(--warning)' }}>
                {' '}
                — kein geprüfter Overlay-Satz, es gilt die OIB-Anforderung
                unverändert
              </span>
            )}
          </span>
          <span>
            <strong>Gebäudeklasse:</strong>{' '}
            {matrix.gebaeudeklasse.klasse ?? 'nicht ermittelbar'}
          </span>
        </div>
      </div>

      <div className="kpi-grid">
        <Kennzahl
          label="Anforderungen"
          wert={kennzahlen.gesamt}
          hinweis={`${kennzahlen.nichtAnwendbar} nicht anwendbar`}
        />
        <Kennzahl
          label="Erfüllt"
          wert={kennzahlen.erfuellt}
          ton="gut"
          beurteilung
        />
        <Kennzahl
          label="Nicht erfüllt"
          wert={kennzahlen.nichtErfuellt}
          ton={kennzahlen.nichtErfuellt > 0 ? 'gefahr' : 'gut'}
          beurteilung
        />
        <Kennzahl
          label="Abweichungen"
          wert={kennzahlen.abweichung}
          hinweis="dokumentiert und begründet"
          beurteilung
        />
        <Kennzahl
          label="Datenlücken"
          wert={kennzahlen.datenluecke}
          ton={kennzahlen.datenluecke > 0 ? 'warn' : 'gut'}
          hinweis="Beurteilung nicht möglich"
          beurteilung
        />
        <Kennzahl
          label="Beurteilungsgrad"
          wert={kennzahlen.beurteilungsgrad}
          einheit="%"
          beurteilung
        />
      </div>

      {matrix.gebaeudeklasse.klasse === null && (
        <div className="hinweis-box hinweis-box--warn">
          <strong>Gebäudeklasse nicht ermittelbar.</strong> Solange sie
          unbestimmt ist, greifen die klassenabhängigen Anforderungen nicht. Es
          fehlen: {matrix.gebaeudeklasse.fehlendeAngaben.join(', ')}. Die
          Angaben werden im Kapitel „Gebäude“ erfasst.
        </div>
      )}

      {matrix.konflikte.length > 0 && (
        <div className="hinweis-box hinweis-box--gefahr">
          <strong>{matrix.konflikte.length} Regelkonflikt(e).</strong> Mehrere
          einander ausschließende Regelvarianten greifen gleichzeitig. Das
          deutet auf einen Fehler im Regeldatenbestand hin und ist vor der
          Freigabe zu bereinigen.
        </div>
      )}

      <Karte
        titel="Aufgelöste Anforderungen"
        untertitel={`${gefiltert.length} von ${matrix.ergebnisse.length} angezeigt`}
        aktion={
          <div className="pill-row">
            {(
              [
                'alle',
                'nicht-erfuellt',
                'abweichung',
                'datenluecke',
                'erfuellt',
              ] as const
            ).map((f) => (
              <button
                key={f}
                type="button"
                className={`btn btn--sm ${filter === f ? 'btn--dark' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'alle' ? 'Alle' : STATUS_LABEL[f]}
              </button>
            ))}
          </div>
        }
        flush
      >
        {gefiltert.length === 0 ? (
          <LeerZustand
            titel="Keine Anforderungen in dieser Kategorie"
            text={
              matrix.ergebnisse.length === 0
                ? 'Die Matrix ist leer; zuerst werden die Gebäudedaten erfasst.'
                : 'In dieser Kategorie liegt keine Anforderung vor.'
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ minWidth: '240px' }}>Anforderung</th>
                  <th style={{ width: '120px' }}>Soll</th>
                  <th style={{ width: '120px' }}>Ist</th>
                  <th style={{ width: '140px' }}>Status</th>
                  <th style={{ width: '130px' }}>Herkunft</th>
                  <th style={{ minWidth: '200px' }}>Quelle</th>
                </tr>
              </thead>
              <tbody>
                {gefiltert.map((e) => {
                  const offen = detail === e.anforderungId;
                  const anforderung = findeAnforderung(e.anforderungId);
                  const abweichungAngelegt = projekt.abweichungen.some(
                    (a) => a.anforderungId === e.anforderungId,
                  );

                  return (
                    <tr key={e.anforderungId}>
                      <td>
                        <div style={{ fontWeight: 'var(--fw-medium)' }}>
                          {e.bezeichnung}
                        </div>
                        <div
                          className="subtle"
                          style={{ fontSize: 'var(--fs-2xs)' }}
                        >
                          {e.bauteil}
                          {e.geschosslage !== 'alle' && ` · ${e.geschosslage}`}
                        </div>
                        {e.overlay && (
                          <div style={{ marginTop: '0.3rem' }}>
                            <span className="overlay-marke">
                              Landesrecht {e.overlay.bundesland} ·{' '}
                              {e.overlay.wirkung}
                            </span>
                          </div>
                        )}
                        {offen && (
                          <div
                            className="hinweis-box"
                            style={{ marginTop: 'var(--sp-3)' }}
                          >
                            <p>{e.begruendung}</p>
                            {anforderung?.erlaeuterung && (
                              <p style={{ marginTop: 'var(--sp-2)' }}>
                                {anforderung.erlaeuterung}
                              </p>
                            )}
                            {e.overlay?.hinweis && (
                              <p style={{ marginTop: 'var(--sp-2)' }}>
                                <strong>Landesrecht:</strong>{' '}
                                {e.overlay.hinweis} (
                                {quelleKurz(e.overlay.quelle)})
                              </p>
                            )}
                            {e.fehlendeAngaben && (
                              <p style={{ marginTop: 'var(--sp-2)' }}>
                                <strong>Fehlende Angaben:</strong>{' '}
                                {e.fehlendeAngaben.join(', ')}
                              </p>
                            )}
                            <p
                              className="mono subtle"
                              style={{
                                marginTop: 'var(--sp-2)',
                                fontSize: 'var(--fs-2xs)',
                              }}
                            >
                              {e.anforderungId}
                            </p>
                            {e.status === 'nicht-erfuellt' && (
                              <button
                                type="button"
                                className="btn btn--sm"
                                style={{ marginTop: 'var(--sp-3)' }}
                                disabled={abweichungAngelegt}
                                onClick={() => alsAbweichung(e)}
                              >
                                {abweichungAngelegt
                                  ? '✓ Als Abweichung erfasst'
                                  : 'Als Abweichung erfassen'}
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="matrix-zeile__soll">
                        {anzeige(e.sollWert, e.einheit)}
                      </td>
                      <td
                        className={`matrix-zeile__ist ${
                          e.status === 'nicht-erfuellt'
                            ? 'matrix-zeile__ist--abweichend'
                            : ''
                        }`}
                      >
                        {anzeige(e.istWert, e.einheit)}
                      </td>
                      <td>
                        <span className={`${badgeKlasse(e.status)} badge--eigenes-zeichen`}>
                          <span aria-hidden="true">
                            {STATUS_SYMBOL[e.status]}
                          </span>{' '}
                          {STATUS_LABEL[e.status]}
                        </span>
                      </td>
                      <td>
                        <Ampel stufe={e.ampel} />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="quelle-link"
                          onClick={() =>
                            setDetail(offen ? null : e.anforderungId)
                          }
                          aria-expanded={offen}
                        >
                          {quelleKurz(e.quelle)}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Karte>

      <Karte
        titel="Ableitung der Gebäudeklasse"
        untertitel="Schritt für Schritt nachvollziehbar"
      >
        {matrix.gebaeudeklasse.schritte.length === 0 ? (
          <p className="muted">
            Die Ableitung kann noch nicht begonnen werden — es fehlen{' '}
            {matrix.gebaeudeklasse.fehlendeAngaben.join(', ')}.
          </p>
        ) : (
          <ol className="ableitung">
            {matrix.gebaeudeklasse.schritte.map((s) => (
              <li key={s.nr} className="ableitung__schritt">
                <span className="ableitung__nr">{s.nr}</span>
                <div>
                  <div className="ableitung__frage">{s.frage}</div>
                  <div className="ableitung__wert">
                    <strong>{s.wert}</strong> — {s.ergebnis}
                  </div>
                  <div className="ableitung__quelle">{quelleKurz(s.quelle)}</div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Karte>

      <Karte
        titel="Herkunft der Aussagen"
        untertitel="Quellenampel — getrennt vom SAFETY-SCORE"
      >
        <AmpelLegende />
      </Karte>
    </div>
  );
}
