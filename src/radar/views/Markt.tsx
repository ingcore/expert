/**
 * Marktentwicklung — PRD Abschnitte 17 und 18.
 *
 * Abschnitt 52 nennt die Datenhistorie den eigentlichen langfristigen
 * Wettbewerbsvorteil: Nach fünf Jahren weiß das System, wie viele Fahrzeuge
 * einer Variante tatsächlich angeboten wurden, wie lange sie standen und
 * welche Ausstattung Aufschläge erzielte. Diese Ansicht ist die Oberfläche
 * dazu — heute noch mit einer kurzen Reihe, aber mit der richtigen Struktur.
 */

import { useState } from 'react';
import { euro, prozent } from '../domain/format';
import { MARKTREIHEN, HERKUNFT, aktuellerMonat, monatVor } from '../wissen/marktdaten';
import { momentum } from '../engine/momentum';
import { useStore } from '../state/store';
import { Karte, Kennzahl, Marke, Scorebalken, Seitenkopf, Verlaufskurve } from '../components/ui';

export function Marktseite() {
  const { state } = useStore();
  const [gewaehlt, setGewaehlt] = useState(MARKTREIHEN[0].variante.id);

  const reihe = MARKTREIHEN.find((r) => r.variante.id === gewaehlt) ?? MARKTREIHEN[0];
  const m = momentum(reihe, state.arbeit.parameter.momentum);
  const jetzt = aktuellerMonat(reihe);
  const vorJahr = monatVor(reihe, 12);

  const rangliste = MARKTREIHEN.map((r) => ({
    reihe: r,
    ergebnis: momentum(r, state.arbeit.parameter.momentum),
  })).sort((a, b) => b.ergebnis.score.wert - a.ergebnis.score.wert);

  return (
    <>
      <Seitenkopf
        titel="Marktentwicklung"
        lead="Preisentwicklung je Modellvariante und Market Momentum. Gesucht wird nicht das teuerste Modell, sondern das, dessen Markt gerade beginnt anzuziehen."
      />

      <div className="stack stack--lg">
        <Karte
          titel="Market Momentum aller Varianten"
          untertitel="Abschnitt 18 — sinkendes Angebot, steigende Medianpreise, kürzere Standzeiten, wachsende Spreizung"
          beurteilung
        >
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Variante</th>
                  <th className="num">Momentum</th>
                  <th>Einordnung</th>
                  <th className="num">Medianpreis</th>
                  <th className="num">12 Monate</th>
                  <th className="num">Angebot</th>
                  <th className="num">Standzeit</th>
                </tr>
              </thead>
              <tbody>
                {rangliste.map(({ reihe: r, ergebnis }) => {
                  const m0 = aktuellerMonat(r);
                  return (
                    <tr key={r.variante.id}>
                      <td>
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          style={{ padding: 0, height: 'auto', minHeight: 0 }}
                          onClick={() => setGewaehlt(r.variante.id)}
                        >
                          {r.variante.label}
                        </button>
                      </td>
                      <td className="num mono">{ergebnis.score.wert}</td>
                      <td>
                        {ergebnis.score.wert >= 70 ? (
                          <Marke ton="gut">{ergebnis.einordnung}</Marke>
                        ) : ergebnis.score.wert >= 45 ? (
                          <Marke>{ergebnis.einordnung}</Marke>
                        ) : (
                          <Marke ton="warn">{ergebnis.einordnung}</Marke>
                        )}
                      </td>
                      <td className="num mono">{euro(m0.medianPreis)}</td>
                      <td className="num mono">
                        {prozent(ergebnis.kennzahlen.medianpreisProzent)}
                      </td>
                      <td className="num mono">{m0.angebote}</td>
                      <td className="num mono">{m0.standzeitTage} T</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="hinweis-kasten" style={{ marginTop: 'var(--sp-4)' }}>
            <strong>Herkunft der Reihe:</strong> {HERKUNFT}
          </p>
        </Karte>

        <Karte
          titel={reihe.variante.label}
          untertitel={`Marktreihe über ${reihe.monate.length} Monate · ${reihe.variante.karosserie ?? ''} ${
            reihe.variante.getriebe ?? ''
          }`}
          beurteilung
        >
          <div className="kpi-grid" style={{ marginBottom: 'var(--sp-5)' }}>
            <Kennzahl
              label="Medianangebotspreis"
              wert={euro(jetzt.medianPreis)}
              hinweis={`vor 12 Monaten ${euro(vorJahr.medianPreis)}`}
            />
            <Kennzahl
              label="Durchschnittspreis"
              wert={euro(jetzt.durchschnittspreis)}
              hinweis="liegt über dem Median: gute Exemplare ziehen ihn nach oben"
            />
            <Kennzahl
              label="Preis guter Exemplare"
              wert={euro(jetzt.spitzenPreis)}
              hinweis={`${(((jetzt.spitzenPreis / jetzt.medianPreis) - 1) * 100).toFixed(0)} % über dem Median`}
              beurteilung
            />
            <Kennzahl
              label="Marktangebot"
              wert={jetzt.angebote}
              hinweis={`${jetzt.neueEintraege} neu, ${jetzt.verschwundeneAngebote} verschwunden`}
            />
            <Kennzahl
              label="Durchschnittliche Standzeit"
              wert={jetzt.standzeitTage}
              einheit="Tage"
              hinweis={`vor 12 Monaten ${vorJahr.standzeitTage} Tage`}
            />
            <Kennzahl
              label="Market Momentum"
              wert={m.score.wert}
              einheit="/ 100"
              hinweis={m.einordnung}
              beurteilung
              ton={m.score.wert >= 70 ? 'gut' : m.score.wert < 45 ? 'warn' : undefined}
            />
          </div>

          <div className="raster raster--2">
            <div>
              <h3 className="section-title">Medianpreis</h3>
              <Verlaufskurve
                werte={reihe.monate.map((x) => x.medianPreis)}
                beschriftung={`${reihe.monate[0].monat} bis ${jetzt.monat}`}
              />
            </div>
            <div>
              <h3 className="section-title">Angebotsmenge</h3>
              <Verlaufskurve
                werte={reihe.monate.map((x) => x.angebote)}
                beschriftung={`${reihe.monate[0].angebote} → ${jetzt.angebote} gleichzeitige Angebote`}
              />
            </div>
            <div>
              <h3 className="section-title">Standzeit</h3>
              <Verlaufskurve
                werte={reihe.monate.map((x) => x.standzeitTage)}
                beschriftung={`${reihe.monate[0].standzeitTage} → ${jetzt.standzeitTage} Tage`}
              />
            </div>
            <div>
              <h3 className="section-title">Preis guter Exemplare</h3>
              <Verlaufskurve
                werte={reihe.monate.map((x) => x.spitzenPreis)}
                beschriftung={`${euro(reihe.monate[0].spitzenPreis)} → ${euro(jetzt.spitzenPreis)}`}
              />
            </div>
          </div>

          <div style={{ marginTop: 'var(--sp-5)' }}>
            <Scorebalken label={m.einordnung} score={m.score} />
          </div>
        </Karte>

        <div className="raster raster--2">
          <Karte titel="Preis nach Kilometerklasse" untertitel="Abschnitt 17">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Klasse</th>
                    <th className="num">Medianpreis</th>
                    <th className="num">Fahrzeuge</th>
                  </tr>
                </thead>
                <tbody>
                  {reihe.nachKilometerklasse.map((k) => (
                    <tr key={k.label}>
                      <td>{k.label}</td>
                      <td className="num mono">{euro(k.medianPreis)}</td>
                      <td className="num mono">{k.anzahl}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Karte>

          <Karte titel="Preis nach Baujahr" untertitel="Abschnitt 17">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Baujahr</th>
                    <th className="num">Medianpreis</th>
                    <th className="num">Fahrzeuge</th>
                  </tr>
                </thead>
                <tbody>
                  {reihe.nachBaujahr.map((b) => (
                    <tr key={b.baujahr}>
                      <td>{b.baujahr}</td>
                      <td className="num mono">{euro(b.medianPreis)}</td>
                      <td className="num mono">{b.anzahl}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Karte>
        </div>

        <Karte
          titel="Ausstattungsaufschläge"
          untertitel="Welche Merkmale im Markt tatsächlich bezahlt werden (Abschnitt 52)"
        >
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Merkmal</th>
                  <th className="num">Aufschlag</th>
                </tr>
              </thead>
              <tbody>
                {reihe.nachAusstattung.map((a) => (
                  <tr key={a.merkmal}>
                    <td>{a.merkmal}</td>
                    <td className="num mono">{prozent(a.aufschlagProzent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Karte>
      </div>
    </>
  );
}
