/**
 * Datenquellen, Collector-Läufe und Compliance — PRD Abschnitte 8, 33, 36
 * und 50.
 *
 * Die Seite führt zusammen, was in der Praxis auseinanderfällt: was technisch
 * abgerufen wird, unter welchen rechtlichen Bedingungen das geschieht, und was
 * die Läufe tatsächlich geliefert haben. Abschnitt 36 verlangt genau diese
 * Dokumentation je Quelle — Zugriffsart, Nutzungsbedingungen, Speicherdauer,
 * Weiterverwendung und Bildrechte.
 *
 * Zusätzlich stehen hier die Grenzfälle der Identity Engine (Abschnitt 10):
 * Inserate, die weder sicher zusammengeführt noch sicher getrennt werden
 * konnten und deshalb eine menschliche Entscheidung brauchen.
 */

import { datumZeit, zahl } from '../domain/format';
import { PLATTFORMEN, ZUGRIFFSART_LABEL, ZUGRIFFSRANG } from '../wissen/plattformen';
import { useStore } from '../state/store';
import { Karte, Kennzahl, Leerzustand, Marke, Seitenkopf } from '../components/ui';

export function Quellenseite({
  oeffneFahrzeug,
}: {
  oeffneFahrzeug: (id: string) => void;
}) {
  const { state, grenzfaelle, analyseZu } = useStore();
  const laeufe = state.laeufe;

  const gesamt = laeufe.reduce(
    (s, l) => ({
      neueInserate: s.neueInserate + l.neueInserate,
      neueBeobachtungen: s.neueBeobachtungen + l.neueBeobachtungen,
      unveraendert: s.unveraendert + l.unveraendert,
      neueFahrzeuge: s.neueFahrzeuge + l.neueFahrzeuge,
      zugeordnet: s.zugeordnet + l.automatischZugeordnet,
      entfernte: s.entfernte + l.entfernte,
      aenderungen: s.aenderungen + l.aenderungen,
      unvollstaendig: s.unvollstaendig + l.unvollstaendig.length,
    }),
    {
      neueInserate: 0,
      neueBeobachtungen: 0,
      unveraendert: 0,
      neueFahrzeuge: 0,
      zugeordnet: 0,
      entfernte: 0,
      aenderungen: 0,
      unvollstaendig: 0,
    },
  );

  const normalisierungsquote =
    gesamt.neueInserate === 0
      ? 100
      : Math.round(((gesamt.neueInserate - gesamt.unvollstaendig) / gesamt.neueInserate) * 100);

  return (
    <>
      <Seitenkopf
        titel="Datenquellen und Läufe"
        lead="Was technisch abgerufen wird, unter welchen Bedingungen — und was die Läufe geliefert haben."
      />

      <div className="stack stack--lg">
        <div className="kpi-grid">
          <Kennzahl
            label="Collector-Läufe"
            wert={laeufe.length}
            hinweis="je Beobachtungszeitpunkt ein vollständiger Durchgang"
          />
          <Kennzahl
            label="Erfasste Inserate"
            wert={gesamt.neueInserate}
            hinweis={`${gesamt.neueFahrzeuge} Fahrzeugakten angelegt`}
          />
          <Kennzahl
            label="Automatisch zugeordnet"
            wert={gesamt.zugeordnet}
            hinweis={`${grenzfaelle.length} Grenzfälle zur manuellen Prüfung`}
            beurteilung
          />
          <Kennzahl
            label="Neue Beobachtungen"
            wert={gesamt.neueBeobachtungen}
            hinweis={`${gesamt.aenderungen} Einzeländerungen, ${gesamt.unveraendert} unverändert`}
          />
          <Kennzahl
            label="Normalisierungsquote"
            wert={`${normalisierungsquote} %`}
            hinweis={`Abnahmekriterium Abschnitt 50: mindestens 95 %`}
            beurteilung
            ton={normalisierungsquote >= 95 ? 'gut' : 'warn'}
          />
          <Kennzahl
            label="Entfernte Inserate"
            wert={gesamt.entfernte}
            hinweis="inaktiv gesetzt, Beobachtungen bleiben erhalten"
          />
        </div>

        <Karte
          titel="Angeschlossene Quellen"
          untertitel="Abschnitt 8 — Rangfolge des Datenzugriffs; Abschnitt 36 — rechtlicher Rahmen je Quelle"
        >
          <div className="stack">
            {[...PLATTFORMEN]
              .sort((a, b) => ZUGRIFFSRANG[a.zugriffsart] - ZUGRIFFSRANG[b.zugriffsart])
              .map((p) => {
                const lauf = laeufe
                  .flatMap((l) => l.proPlattform)
                  .filter((s) => s.plattformId === p.id);
                const gefunden = lauf.reduce((s, x) => s + x.gefunden, 0);
                return (
                  <article key={p.id} className="hinweis-kasten">
                    <div className="row row--between row--wrap">
                      <strong>{p.name}</strong>
                      <span className="row" style={{ gap: 'var(--sp-2)' }}>
                        <Marke>Rang {ZUGRIFFSRANG[p.zugriffsart]}</Marke>
                        <Marke ton={p.zugriffsart === 'api' ? 'gut' : 'neutral'}>
                          {ZUGRIFFSART_LABEL[p.zugriffsart]}
                        </Marke>
                        {p.aktiv ? (
                          <Marke ton="brand">aktiv</Marke>
                        ) : (
                          <Marke ton="warn">deaktiviert</Marke>
                        )}
                      </span>
                    </div>

                    <dl className="definitionsliste" style={{ marginTop: 'var(--sp-3)' }}>
                      <dt>Länder</dt>
                      <dd>{p.land.join(', ')}</dd>
                      <dt>Rechtsgrundlage</dt>
                      <dd>{p.compliance.grundlage}</dd>
                      <dt>Nutzungsbedingungen</dt>
                      <dd>{p.compliance.nutzungsbedingungen}</dd>
                      <dt>Speicherdauer</dt>
                      <dd>
                        {p.compliance.speicherdauerTage === null
                          ? 'nicht vereinbart'
                          : `${zahl(p.compliance.speicherdauerTage)} Tage`}
                      </dd>
                      <dt>Weiterverwendung</dt>
                      <dd>{p.compliance.weiterverwendung}</dd>
                      <dt>Bildrechte</dt>
                      <dd>{p.compliance.bildrechte}</dd>
                      <dt>Abrufe in den Läufen</dt>
                      <dd>{gefunden} Trefferzeilen über {lauf.length} Läufe</dd>
                    </dl>

                    {p.compliance.offeneFragen.length > 0 && (
                      <div className="hinweis-kasten hinweis-kasten--warn" style={{ marginTop: 'var(--sp-3)' }}>
                        <strong>Offen vor Produktivbetrieb:</strong>
                        <ul style={{ margin: '0.35rem 0 0', paddingLeft: 'var(--sp-5)' }}>
                          {p.compliance.offeneFragen.map((f, i) => (
                            <li key={i}>{f}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </article>
                );
              })}
          </div>
        </Karte>

        <Karte
          titel={`Grenzfälle der Identitätszuordnung (${grenzfaelle.length})`}
          untertitel="Abschnitt 10 — zwischen den Schwellen wird nicht zusammengeführt, sondern zur Prüfung vorgelegt"
          beurteilung
        >
          {grenzfaelle.length === 0 ? (
            <Leerzustand
              titel="Keine Grenzfälle"
              text="Alle Inserate konnten eindeutig zugeordnet oder eindeutig getrennt werden."
            />
          ) : (
            <div className="stack">
              {grenzfaelle.map((g) => {
                const analyse = analyseZu(g.kandidatFahrzeugId);
                const inserat = state.bestand.inserate.find((i) => i.id === g.inseratId);
                const eigenes = inserat?.fahrzeugId
                  ? analyseZu(inserat.fahrzeugId)
                  : undefined;
                return (
                  <article key={g.inseratId} className="hinweis-kasten hinweis-kasten--warn">
                    <div className="row row--between row--wrap">
                      <strong>
                        Inserat {g.externeId} — {g.vergleich.score} % Übereinstimmung
                      </strong>
                      <Marke ton="warn">manuelle Prüfung</Marke>
                    </div>
                    <p style={{ marginTop: 'var(--sp-2)' }}>{g.vergleich.begruendung}</p>
                    <p style={{ marginTop: 'var(--sp-2)' }}>
                      Kandidat: {analyse?.aktuell.titel ?? g.kandidatFahrzeugId}
                      {eigenes && ` · eigene Akte: ${eigenes.aktuell.titel}`}
                    </p>

                    <div className="table-wrap" style={{ marginTop: 'var(--sp-3)' }}>
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Merkmal</th>
                            <th className="num">Gewicht</th>
                            <th className="num">Übereinstimmung</th>
                            <th>Hinweis</th>
                          </tr>
                        </thead>
                        <tbody>
                          {g.vergleich.merkmale.map((m) => (
                            <tr key={m.schluessel}>
                              <td>{m.label}</td>
                              <td className="num mono">{m.gewicht}</td>
                              <td className="num mono">
                                {m.uebereinstimmung === null
                                  ? 'nicht beurteilbar'
                                  : `${Math.round(m.uebereinstimmung)} %`}
                              </td>
                              <td style={{ fontSize: 'var(--fs-xs)' }}>{m.hinweis}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="row" style={{ gap: 'var(--sp-3)', marginTop: 'var(--sp-3)' }}>
                      {eigenes && (
                        <button
                          type="button"
                          className="btn btn--sm"
                          onClick={() => oeffneFahrzeug(eigenes.fahrzeugId)}
                        >
                          Eigene Akte öffnen
                        </button>
                      )}
                      {analyse && (
                        <button
                          type="button"
                          className="btn btn--sm"
                          onClick={() => oeffneFahrzeug(analyse.fahrzeugId)}
                        >
                          Kandidat öffnen
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </Karte>

        <Karte
          titel="Laufprotokoll"
          untertitel="Jeder Lauf mit Zeitpunkt, Fundzahl und Ergebnis je Plattform"
          flush
        >
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Lauf</th>
                  <th>Zeitpunkt</th>
                  <th className="num">Neu</th>
                  <th className="num">Beobachtungen</th>
                  <th className="num">Unverändert</th>
                  <th className="num">Zugeordnet</th>
                  <th className="num">Entfernt</th>
                  <th>Plattformen</th>
                </tr>
              </thead>
              <tbody>
                {[...laeufe]
                  .reverse()
                  .slice(0, 40)
                  .map((l) => (
                    <tr key={l.laufId}>
                      <td className="mono">{l.laufId}</td>
                      <td className="mono nowrap">{datumZeit(l.zeitpunkt)}</td>
                      <td className="num mono">{l.neueInserate}</td>
                      <td className="num mono">{l.neueBeobachtungen}</td>
                      <td className="num mono">{l.unveraendert}</td>
                      <td className="num mono">{l.automatischZugeordnet}</td>
                      <td className="num mono">{l.entfernte}</td>
                      <td style={{ fontSize: 'var(--fs-2xs)' }}>
                        {l.proPlattform.map((p) => `${p.plattformId}: ${p.gefunden}`).join(' · ')}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Karte>

        <Karte
          titel="Audit Trail"
          untertitel="Abschnitt 35 — jede Systementscheidung revisionsfähig dokumentiert"
          flush
        >
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Zeitpunkt</th>
                  <th>Benutzer</th>
                  <th>Quelle</th>
                  <th>Objekt</th>
                  <th>Feld</th>
                  <th>Vorher</th>
                  <th>Nachher</th>
                  <th>Entscheidung</th>
                </tr>
              </thead>
              <tbody>
                {[...state.bestand.audit]
                  .sort((a, b) => Date.parse(b.zeitpunkt) - Date.parse(a.zeitpunkt))
                  .slice(0, 60)
                  .map((e) => (
                    <tr key={e.id}>
                      <td className="mono nowrap">{datumZeit(e.zeitpunkt)}</td>
                      <td style={{ fontSize: 'var(--fs-2xs)' }}>{e.benutzer}</td>
                      <td style={{ fontSize: 'var(--fs-2xs)' }}>{e.quelle}</td>
                      <td style={{ fontSize: 'var(--fs-2xs)' }}>{e.objekt}</td>
                      <td style={{ fontSize: 'var(--fs-2xs)' }}>{e.feld}</td>
                      <td className="subtle" style={{ fontSize: 'var(--fs-2xs)' }}>
                        {e.vorher ?? '—'}
                      </td>
                      <td style={{ fontSize: 'var(--fs-2xs)' }}>{e.nachher ?? '—'}</td>
                      <td style={{ fontSize: 'var(--fs-2xs)' }}>{e.systementscheidung ?? '—'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <p className="hinweis-kasten" style={{ margin: 'var(--sp-4)' }}>
            {state.bestand.audit.length} Einträge insgesamt, die jüngsten 60 sind
            dargestellt.
          </p>
        </Karte>
      </div>
    </>
  );
}
