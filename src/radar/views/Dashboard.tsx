/**
 * Dashboard — PRD Abschnitt 29.
 *
 * Kennzahlen: heute neu erfasste Fahrzeuge, relevante Zielmodelle,
 * A-Kandidaten, Preissenkungen, neue Red Flags, Watchlist, Portfolio.
 *
 * Die Reihenfolge folgt Abschnitt 3, Ziel fünf: Aus vielen Inseraten soll eine
 * sehr kleine Zahl tatsächlich prüfenswerter Kandidaten werden. Deshalb steht
 * oben nicht die Menge des Bestandes, sondern das, was zu tun ist.
 */

import { useMemo } from 'react';
import type { Ansicht } from '../App';
import { euro, prozent, tageSeit } from '../domain/format';
import { useStore } from '../state/store';
import { berechnePortfolio } from '../engine/portfolio';
import { Fahrzeugzeile } from '../components/Fahrzeugzeile';
import { Kennzahl, Karte, Leerzustand, Seitenkopf } from '../components/ui';

export function Dashboard({
  oeffneFahrzeug,
  wechsle,
}: {
  oeffneFahrzeug: (id: string) => void;
  wechsle: (a: Ansicht) => void;
}) {
  const { state, analysen } = useStore();

  const kennzahlen = useMemo(() => {
    const neu = analysen.filter((a) => a.angebotsdauerTage <= 14).length;
    const aKandidaten = analysen.filter((a) => a.gesamt.rang === 'A');
    const buySignale = analysen.filter((a) => a.buySignal.ausgeloest);
    const preissenkungen = analysen.filter((a) =>
      a.aenderungen.some(
        (x) => x.art === 'preis' && (x.differenz ?? 0) < 0 && tageSeit(x.zeitpunkt) <= 30,
      ),
    );
    const redFlags = analysen.flatMap((a) => a.redFlags);
    const kritisch = redFlags.filter((f) => f.schweregrad === 'kritisch');
    const zielmodelle = new Set(
      analysen.filter((a) => a.modell).map((a) => a.modell?.id),
    );
    const beobachteteInserate = state.bestand.inserate.length;
    const beobachtungen = state.bestand.inserate.reduce(
      (s, i) => s + i.beobachtungen.length,
      0,
    );

    return {
      neu,
      aKandidaten,
      buySignale,
      preissenkungen,
      redFlags,
      kritisch,
      zielmodelle: zielmodelle.size,
      beobachteteInserate,
      beobachtungen,
    };
  }, [analysen, state.bestand]);

  const portfolio = useMemo(
    () => berechnePortfolio(state.arbeit.portfolio),
    [state.arbeit.portfolio],
  );

  const gemerkt = new Set(state.arbeit.watchlist.map((w) => w.fahrzeugId));

  return (
    <>
      <Seitenkopf
        titel="Dashboard"
        lead="Was heute Aufmerksamkeit verlangt — und was das System bereits aussortiert hat."
      />

      <div className="kpi-grid" style={{ marginBottom: 'var(--sp-6)' }}>
        <Kennzahl
          label="A-Kandidaten"
          wert={kennzahlen.aKandidaten.length}
          hinweis={`aus ${analysen.length} beobachteten Fahrzeugen`}
          beurteilung
          ton={kennzahlen.aKandidaten.length > 0 ? 'gut' : undefined}
        />
        <Kennzahl
          label="Buy Signals"
          wert={kennzahlen.buySignale.length}
          hinweis="alle Mindestbedingungen erfüllt"
          beurteilung
          ton={kennzahlen.buySignale.length > 0 ? 'gut' : undefined}
        />
        <Kennzahl
          label="Kritische Red Flags"
          wert={kennzahlen.kritisch.length}
          hinweis={`${kennzahlen.redFlags.length} Feststellungen insgesamt`}
          beurteilung
          ton={kennzahlen.kritisch.length > 0 ? 'gefahr' : undefined}
        />
        <Kennzahl
          label="Preissenkungen (30 Tage)"
          wert={kennzahlen.preissenkungen.length}
          hinweis="Fahrzeuge mit reduziertem Preis"
        />
        <Kennzahl
          label="Neu erfasst (14 Tage)"
          wert={kennzahlen.neu}
          hinweis={`${kennzahlen.zielmodelle} Zielmodelle betroffen`}
        />
        <Kennzahl
          label="Beobachtete Inserate"
          wert={kennzahlen.beobachteteInserate}
          hinweis={`${kennzahlen.beobachtungen} gespeicherte Beobachtungen`}
        />
        <Kennzahl
          label="Watchlist"
          wert={state.arbeit.watchlist.length}
          hinweis="Fahrzeuge im Kaufprozess"
        />
        <Kennzahl
          label="Portfoliowert"
          wert={euro(portfolio.gesamtwert)}
          hinweis={`unrealisiert ${euro(portfolio.unrealisiert)}`}
          beurteilung
          ton={portfolio.unrealisiert > 0 ? 'gut' : undefined}
        />
      </div>

      <div className="stack stack--lg">
        <Karte
          titel="Priorisierte Kandidatenliste"
          untertitel="Täglich neu gebildet aus Integrity, Evidence, Asset, Quality und Preisvorteil (Abschnitt 46)"
          beurteilung
          aktion={
            <button type="button" className="btn btn--sm" onClick={() => wechsle('suche')}>
              Alle Fahrzeuge
            </button>
          }
        >
          {analysen.length === 0 ? (
            <Leerzustand
              titel="Noch keine Fahrzeuge"
              text="Der Collector hat keine Inserate gefunden."
            />
          ) : (
            <div className="fahrzeugliste">
              {analysen.slice(0, 6).map((a) => (
                <Fahrzeugzeile
                  key={a.fahrzeugId}
                  analyse={a}
                  gemerkt={gemerkt.has(a.fahrzeugId)}
                  onClick={() => oeffneFahrzeug(a.fahrzeugId)}
                />
              ))}
            </div>
          )}
        </Karte>

        <div className="raster raster--2">
          <Karte
            titel="Kritische Feststellungen"
            untertitel="Red Flags mit höchstem Schweregrad (Abschnitt 23)"
            beurteilung
          >
            {kennzahlen.kritisch.length === 0 ? (
              <p className="subtle">
                Derzeit keine kritische Feststellung im beobachteten Bestand.
              </p>
            ) : (
              <ul className="stack stack--sm" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {kennzahlen.kritisch.slice(0, 5).map((f) => {
                  const fahrzeug = analysen.find((a) => a.redFlags.includes(f));
                  return (
                    <li key={f.id}>
                      <button
                        type="button"
                        className="btn btn--ghost btn--block"
                        style={{ justifyContent: 'flex-start', textAlign: 'left', height: 'auto', padding: 'var(--sp-3)' }}
                        onClick={() => fahrzeug && oeffneFahrzeug(fahrzeug.fahrzeugId)}
                      >
                        <span>
                          <strong>{f.titel}</strong>
                          <br />
                          <span className="subtle">{fahrzeug?.aktuell.titel}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Karte>

          <Karte
            titel="Preisbewegung"
            untertitel="Reduktionen der letzten 30 Tage (Abschnitt 11)"
          >
            {kennzahlen.preissenkungen.length === 0 ? (
              <p className="subtle">Keine Preisreduktionen im Beobachtungszeitraum.</p>
            ) : (
              <ul className="zeitleiste">
                {kennzahlen.preissenkungen.slice(0, 6).map((a) => {
                  const letzte = a.aenderungen.find(
                    (x) => x.art === 'preis' && (x.differenz ?? 0) < 0,
                  );
                  const vorher = Number.parseFloat(letzte?.vorher ?? '0');
                  const anteil = vorher > 0 ? ((letzte?.differenz ?? 0) / vorher) * 100 : 0;
                  return (
                    <li key={a.fahrzeugId} className="zeitleiste__eintrag">
                      <span className="zeitleiste__zeit">
                        {letzte?.zeitpunkt.slice(0, 10)}
                      </span>
                      <span>
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          style={{ padding: 0, height: 'auto', minHeight: 0 }}
                          onClick={() => oeffneFahrzeug(a.fahrzeugId)}
                        >
                          {a.aktuell.titel}
                        </button>
                        <span className="zeitleiste__wert">
                          {' '}
                          <del>{euro(vorher)}</del> → <ins>{euro(a.aktuell.preis)}</ins>{' '}
                          ({prozent(anteil)})
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Karte>
        </div>

        <Karte
          titel="Was das System aussortiert hat"
          untertitel="Abschnitt 55: Das Produkt soll nicht möglichst viele Angebote zeigen, sondern möglichst viele schlechte eliminieren."
        >
          <div className="raster raster--3">
            {(['B', 'C', 'D'] as const).map((rang) => {
              const gruppe = analysen.filter((a) => a.gesamt.rang === rang);
              return (
                <div key={rang} className="hinweis-kasten">
                  <strong>
                    Rang {rang}: {gruppe.length} Fahrzeuge
                  </strong>
                  <br />
                  {gruppe.length === 0
                    ? 'keine'
                    : gruppe
                        .slice(0, 3)
                        .map((a) => a.aktuell.titel)
                        .join(' · ')}
                </div>
              );
            })}
          </div>
        </Karte>
      </div>
    </>
  );
}
