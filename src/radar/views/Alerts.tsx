/**
 * Benachrichtigungen — PRD Abschnitt 27.
 *
 * „Benachrichtigungen dürfen nicht inflationär erzeugt werden.“ Diese Ansicht
 * zeigt deshalb nicht nur, was gemeldet wurde, sondern auch die Regeln, die
 * das Melden begrenzen: Rangschwelle je Suchauftrag, Entprellung und
 * Erheblichkeitsschwellen.
 */

import { datum, relativeZeit } from '../domain/format';
import { useStore } from '../state/store';
import { Karte, Leerzustand, Marke, Seitenkopf } from '../components/ui';

const AUSLOESER_LABEL: Record<string, string> = {
  'neuer-a-kandidat': 'Neuer A-Kandidat',
  preisreduktion: 'Preisreduktion',
  'score-schwelle': 'Score über Mindestwert',
  'kritische-aenderung': 'Kritische Änderung',
  'vergleichbares-fahrzeug': 'Vergleichbares Fahrzeug',
  'inserat-entfernt': 'Inserat entfernt',
  wiederinserierung: 'Wiederinserierung',
};

export function Alertseite({ oeffneFahrzeug }: { oeffneFahrzeug: (id: string) => void }) {
  const { state, dispatch, analyseZu } = useStore();
  const alerts = state.arbeit.alerts;
  const ungelesen = alerts.filter((a) => !a.gelesen).length;

  return (
    <>
      <Seitenkopf
        titel="Benachrichtigungen"
        lead="Gemeldet wird, was eine Handlung auslöst — nicht alles, was sich ändert."
        aktion={
          ungelesen > 0 ? (
            <button
              type="button"
              className="btn"
              onClick={() => dispatch({ typ: 'alerts-alle-gelesen' })}
            >
              Alle als gelesen markieren
            </button>
          ) : undefined
        }
      />

      <div className="stack stack--lg">
        <Karte
          titel="Suchaufträge"
          untertitel="Abschnitt 6.2 — passive Marktüberwachung; die Rangschwelle bestimmt, ab wann gemeldet wird"
        >
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Auftrag</th>
                  <th>Kriterien</th>
                  <th>Meldung ab</th>
                  <th>Kanäle</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {state.arbeit.suchauftraege.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <strong>{s.name}</strong>
                      <div className="subtle" style={{ fontSize: 'var(--fs-2xs)' }}>
                        angelegt {datum(s.angelegtAm)}
                      </div>
                    </td>
                    <td style={{ fontSize: 'var(--fs-xs)' }}>
                      {[
                        s.preisMax !== null && `bis ${s.preisMax.toLocaleString('de-AT')} €`,
                        s.kilometerMax !== null &&
                          `max. ${s.kilometerMax.toLocaleString('de-AT')} km`,
                        s.mindestalterMonate !== null && `ab ${s.mindestalterMonate} Monate alt`,
                        s.getriebe.length > 0 && s.getriebe.join('/'),
                        s.laender.length > 0 && s.laender.join(', '),
                        s.originalzustandBevorzugt && 'Originalzustand',
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </td>
                    <td>
                      <Marke>Rang {s.meldungAbRang}</Marke>
                    </td>
                    <td style={{ fontSize: 'var(--fs-xs)' }}>{s.kanaele.join(', ')}</td>
                    <td>
                      <button
                        type="button"
                        className={`btn btn--sm ${s.aktiv ? 'btn--primary' : ''}`}
                        onClick={() => dispatch({ typ: 'suchauftrag-umschalten', id: s.id })}
                      >
                        {s.aktiv ? 'aktiv' : 'pausiert'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="hinweis-kasten" style={{ marginTop: 'var(--sp-4)' }}>
            Entprellung: Derselbe Sachverhalt am selben Fahrzeug meldet innerhalb von{' '}
            {state.arbeit.parameter.alerts.entprellungTage} Tagen kein zweites Mal.
            Preisreduktionen werden erst ab{' '}
            {state.arbeit.parameter.alerts.preisreduktionProzent} % gemeldet. Buy Signals
            und kritische Feststellungen melden unabhängig vom Rang.
          </p>
        </Karte>

        <Karte
          titel={`${alerts.length} Benachrichtigungen`}
          untertitel={`${ungelesen} ungelesen`}
          beurteilung
        >
          {alerts.length === 0 ? (
            <Leerzustand
              titel="Keine Benachrichtigungen"
              text="Es liegt nichts vor, das die hinterlegten Schwellen erreicht."
            />
          ) : (
            <ul className="stack" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {alerts.map((a) => {
                const analyse = analyseZu(a.fahrzeugId);
                return (
                  <li
                    key={a.id}
                    className={`hinweis-kasten ${
                      a.dringlichkeit === 'hoch'
                        ? 'hinweis-kasten--warn'
                        : ''
                    }`}
                    style={{ opacity: a.gelesen ? 0.65 : 1 }}
                  >
                    <div className="row row--between row--wrap">
                      <strong>{a.titel}</strong>
                      <span className="row" style={{ gap: 'var(--sp-2)' }}>
                        <Marke>{AUSLOESER_LABEL[a.ausloeser] ?? a.ausloeser}</Marke>
                        {a.dringlichkeit === 'hoch' && <Marke ton="gefahr">hoch</Marke>}
                        {!a.gelesen && <Marke ton="brand">neu</Marke>}
                      </span>
                    </div>
                    <p style={{ marginTop: 'var(--sp-2)' }}>{a.text}</p>
                    <div
                      className="row row--between row--wrap"
                      style={{ marginTop: 'var(--sp-3)', fontSize: 'var(--fs-2xs)' }}
                    >
                      <span className="subtle">
                        {relativeZeit(a.zeitpunkt)} · Kanäle: {a.kanaele.join(', ')}
                      </span>
                      <span className="row" style={{ gap: 'var(--sp-2)' }}>
                        {analyse && (
                          <button
                            type="button"
                            className="btn btn--sm"
                            onClick={() => oeffneFahrzeug(a.fahrzeugId)}
                          >
                            Fahrzeugakte öffnen
                          </button>
                        )}
                        {!a.gelesen && (
                          <button
                            type="button"
                            className="btn btn--ghost btn--sm"
                            onClick={() => dispatch({ typ: 'alert-gelesen', id: a.id })}
                          >
                            Gelesen
                          </button>
                        )}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Karte>
      </div>
    </>
  );
}
