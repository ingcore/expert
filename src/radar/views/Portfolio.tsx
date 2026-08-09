/**
 * Portfolioverwaltung — PRD Abschnitt 25.
 *
 * Total Cost of Ownership, realisiertes und unrealisiertes Ergebnis, jährliche
 * Wertentwicklung und interner Zinsfuß je Fahrzeug und für das Gesamtportfolio.
 *
 * Der IRR steht bewusst neben der jährlichen Wertentwicklung und nicht statt
 * ihrer: Die Wertentwicklung beschreibt, was das Fahrzeug getan hat; der IRR
 * beschreibt, was das eingesetzte Geld getan hat. Bei einem Sammlerfahrzeug mit
 * laufenden Kosten sind das zwei sehr verschiedene Zahlen.
 */

import { euro, prozent } from '../domain/format';
import { berechnePortfolio } from '../engine/portfolio';
import { useStore } from '../state/store';
import { Karte, Kennzahl, Leerzustand, Marke, Seitenkopf } from '../components/ui';

export function Portfolioseite() {
  const { state, dispatch } = useStore();
  const kennzahlen = berechnePortfolio(state.arbeit.portfolio);

  return (
    <>
      <Seitenkopf
        titel="Portfolio"
        lead="Gekaufte Fahrzeuge mit vollständiger Kostenrechnung. Erst mit den laufenden Kosten wird aus einer Wertsteigerung ein Ergebnis."
      />

      {kennzahlen.anzahl === 0 ? (
        <Karte>
          <Leerzustand
            titel="Kein Fahrzeug im Portfolio"
            text="Übernehmen Sie gekaufte Fahrzeuge in das Portfolio, um Total Cost of Ownership und Wertentwicklung zu verfolgen."
          />
        </Karte>
      ) : (
        <div className="stack stack--lg">
          <div className="kpi-grid">
            <Kennzahl
              label="Fahrzeuge"
              wert={kennzahlen.anzahl}
              hinweis={`${kennzahlen.imBestand} im Bestand`}
            />
            <Kennzahl
              label="Anschaffung gesamt"
              wert={euro(kennzahlen.gesamtAnschaffung)}
              hinweis={`Nebenkosten enthalten`}
            />
            <Kennzahl
              label="Laufende Kosten"
              wert={euro(kennzahlen.gesamtLaufendeKosten)}
              hinweis="Service, Restaurierung, Versicherung, Steuern"
            />
            <Kennzahl
              label="Total Cost of Ownership"
              wert={euro(kennzahlen.gesamtTco)}
              beurteilung
            />
            <Kennzahl
              label="Aktueller Bestandswert"
              wert={euro(kennzahlen.gesamtwert)}
              beurteilung
            />
            <Kennzahl
              label="Unrealisiertes Ergebnis"
              wert={euro(kennzahlen.unrealisiert)}
              beurteilung
              ton={kennzahlen.unrealisiert >= 0 ? 'gut' : 'gefahr'}
            />
            <Kennzahl
              label="Realisiertes Ergebnis"
              wert={euro(kennzahlen.realisiert)}
              beurteilung
              ton={kennzahlen.realisiert >= 0 ? 'gut' : 'gefahr'}
            />
            <Kennzahl
              label="Portfolio-IRR"
              wert={
                kennzahlen.portfolioIrr === null
                  ? '—'
                  : prozent(kennzahlen.portfolioIrr * 100)
              }
              hinweis="interner Zinsfuß über alle Zahlungen"
              beurteilung
              ton={
                kennzahlen.portfolioIrr === null
                  ? undefined
                  : kennzahlen.portfolioIrr >= 0
                    ? 'gut'
                    : 'gefahr'
              }
            />
          </div>

          {kennzahlen.fahrzeuge.map((f) => (
            <Karte
              key={f.fahrzeug.id}
              titel={f.fahrzeug.bezeichnung}
              untertitel={`Kauf am ${f.fahrzeug.kaufdatum} · Haltedauer ${f.haltedauerJahre.toFixed(
                1,
              )} Jahre · ${f.fahrzeug.kilometerstandKauf.toLocaleString('de-AT')} → ${f.fahrzeug.kilometerstandAktuell.toLocaleString('de-AT')} km`}
              beurteilung
              aktion={
                f.verkauft ? (
                  <Marke ton="gut">verkauft am {f.fahrzeug.verkauf?.datum}</Marke>
                ) : (
                  <Marke ton="brand">im Bestand</Marke>
                )
              }
            >
              <div className="kpi-grid" style={{ marginBottom: 'var(--sp-4)' }}>
                <Kennzahl label="Anschaffung" wert={euro(f.anschaffung)} />
                <Kennzahl
                  label="Laufende Kosten"
                  wert={euro(f.laufendeKosten)}
                  hinweis={`${f.fahrzeug.transaktionen.length} Buchungen`}
                />
                <Kennzahl label="Total Cost of Ownership" wert={euro(f.tco)} beurteilung />
                <Kennzahl
                  label={f.verkauft ? 'Verkaufserlös' : 'Marktwert'}
                  wert={euro(f.aktuellerWert)}
                  beurteilung
                />
                <Kennzahl
                  label={f.verkauft ? 'Realisiert' : 'Unrealisiert'}
                  wert={euro(f.verkauft ? f.realisiert : f.unrealisiert)}
                  beurteilung
                  ton={(f.verkauft ? f.realisiert : f.unrealisiert) >= 0 ? 'gut' : 'gefahr'}
                />
                <Kennzahl
                  label="Wertentwicklung p. a."
                  wert={prozent(f.wertentwicklungProJahr)}
                  hinweis="ohne laufende Kosten"
                />
                <Kennzahl
                  label="IRR"
                  wert={f.irr === null ? '—' : prozent(f.irr * 100)}
                  hinweis="mit allen Zahlungen"
                  beurteilung
                  ton={f.irr === null ? undefined : f.irr >= 0 ? 'gut' : 'gefahr'}
                />
                {!f.verkauft && (
                  <label className="kpi">
                    <span className="kpi__label">Marktwert anpassen</span>
                    <input
                      className="input"
                      type="number"
                      value={f.fahrzeug.marktwertAktuell}
                      onChange={(e) =>
                        dispatch({
                          typ: 'portfolio-marktwert',
                          id: f.fahrzeug.id,
                          wert: Number(e.target.value),
                        })
                      }
                    />
                    <span className="kpi__hint">
                      In der Zielarchitektur aus der Bewertungsengine, hier manuell
                      übersteuerbar.
                    </span>
                  </label>
                )}
              </div>

              <details>
                <summary className="section-title" style={{ cursor: 'pointer' }}>
                  Zahlungsreihe ({f.zahlungen.length} Positionen)
                </summary>
                <div className="table-wrap" style={{ marginTop: 'var(--sp-3)' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Datum</th>
                        <th>Position</th>
                        <th className="num">Betrag</th>
                      </tr>
                    </thead>
                    <tbody>
                      {f.zahlungen.map((z, i) => (
                        <tr key={i}>
                          <td className="mono nowrap">{z.datum}</td>
                          <td>{z.bezeichnung}</td>
                          <td className={`num mono ${z.betrag < 0 ? 'muted' : ''}`}>
                            {euro(z.betrag)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </Karte>
          ))}
        </div>
      )}
    </>
  );
}
