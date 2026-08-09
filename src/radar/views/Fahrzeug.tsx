/**
 * Fahrzeugdetailseite — PRD Abschnitt 29.
 *
 * Die dort geforderten Bereiche in dieser Reihenfolge: Summary, Scores,
 * Preisbewertung, Historie, Inserate, Bilder, Dokumente, Red Flags, Technische
 * Risiken, Restaurationsrechnung, Marktentwicklung, Notizen — ergänzt um
 * Prüfung (Abschnitt 43), Verkäuferanfrage (Abschnitt 42) und Prüfbericht
 * (Abschnitt 44).
 *
 * Durchgehendes Prinzip ist Abschnitt 39: Jede Zahl auf dieser Seite lässt
 * sich aufklappen, bis ihre Herkunft dasteht. Kein Score ohne Beiträge, kein
 * Marktwert ohne Faktoren, keine Red Flag ohne Quelle und Empfehlung.
 */

import { useMemo, useState } from 'react';
import {
  datum,
  datumZeit,
  euro,
  kilometer,
  monat,
  prozent,
  relativeZeit,
  zahl,
} from '../domain/format';
import { useStore } from '../state/store';
import type { Fahrzeuganalyse } from '../engine/analyse';
import { staerksteBeitraege } from '../engine/erklaerung';
import { BELEGART_LABEL } from '../engine/evidenz';
import { PRUEFBEREICH_LABEL, anfragetext } from '../wissen/pruefkatalog';
import { plattformName, ZUGRIFFSART_LABEL } from '../wissen/plattformen';
import { ASSET_KRITERIUM_LABEL } from '../wissen/modelle';
import { ZUSTANDSSTUFE_LABEL, type Zustandsstufe } from '../wissen/restaurationskatalog';
import { TEXTKATEGORIE_LABEL } from '../engine/text';
import type { Pruefstatus } from '../domain/types';
import {
  Abweichung,
  Beitragsliste,
  Karte,
  Kennzahl,
  Leerzustand,
  Marke,
  Preisband,
  Rangplakette,
  RedFlagKarte,
  Scorebalken,
  Seitenkopf,
  Signalabzeichen,
  Verlaufskurve,
} from '../components/ui';

type Reiter =
  | 'uebersicht'
  | 'scores'
  | 'preis'
  | 'historie'
  | 'inserate'
  | 'bilder'
  | 'dokumente'
  | 'redflags'
  | 'technik'
  | 'restauration'
  | 'markt'
  | 'notizen'
  | 'bericht';

export function Fahrzeugseite({ analyse }: { analyse: Fahrzeuganalyse }) {
  const { state, dispatch } = useStore();
  const [reiter, setReiter] = useState<Reiter>('uebersicht');

  const watchlisteintrag = state.arbeit.watchlist.find(
    (w) => w.fahrzeugId === analyse.fahrzeugId,
  );
  const fahrzeug = state.bestand.fahrzeuge.find((f) => f.id === analyse.fahrzeugId);

  const reiterliste: { id: Reiter; label: string; zahl?: number }[] = [
    { id: 'uebersicht', label: 'Übersicht' },
    { id: 'scores', label: 'Scores' },
    { id: 'preis', label: 'Preisbewertung' },
    { id: 'historie', label: 'Historie', zahl: analyse.aenderungen.length },
    { id: 'inserate', label: 'Inserate', zahl: analyse.inserate.length },
    { id: 'bilder', label: 'Bilder', zahl: analyse.aktuell.bilder.length },
    { id: 'dokumente', label: 'Dokumente', zahl: fahrzeug?.dokumente.length ?? 0 },
    { id: 'redflags', label: 'Red Flags', zahl: analyse.redFlags.length },
    { id: 'technik', label: 'Technik und Prüfung', zahl: analyse.risiken.befunde.length },
    { id: 'restauration', label: 'Restauration' },
    { id: 'markt', label: 'Marktentwicklung' },
    { id: 'notizen', label: 'Notizen' },
    { id: 'bericht', label: 'Prüfbericht' },
  ];

  return (
    <>
      <Seitenkopf
        titel={analyse.aktuell.titel}
        lead={`${analyse.bezeichnung} · ${monat(analyse.aktuell.erstzulassung)} · ${kilometer(
          analyse.aktuell.kilometerstand,
        )} · ${analyse.aktuell.standortOrt} (${analyse.aktuell.standortLand})`}
        aktion={
          <div className="row" style={{ gap: 'var(--sp-3)' }}>
            <Rangplakette rang={analyse.gesamt.rang} wert={analyse.gesamt.wert} />
            {watchlisteintrag ? (
              <Marke ton="brand">In der Watchlist</Marke>
            ) : (
              <button
                type="button"
                className="btn btn--primary"
                onClick={() =>
                  dispatch({ typ: 'watchlist-aufnehmen', fahrzeugId: analyse.fahrzeugId })
                }
              >
                In die Watchlist
              </button>
            )}
          </div>
        }
      />

      <nav className="reiter" aria-label="Bereiche der Fahrzeugakte">
        {reiterliste.map((r) => (
          <button
            key={r.id}
            type="button"
            className={`reiter__knopf ${reiter === r.id ? 'reiter__knopf--aktiv' : ''}`}
            onClick={() => setReiter(r.id)}
            aria-current={reiter === r.id ? 'true' : undefined}
          >
            {r.label}
            {r.zahl !== undefined && r.zahl > 0 && (
              <span className="reiter__zahl">{r.zahl}</span>
            )}
          </button>
        ))}
      </nav>

      {reiter === 'uebersicht' && <Uebersicht analyse={analyse} />}
      {reiter === 'scores' && <Scores analyse={analyse} />}
      {reiter === 'preis' && <Preisbewertung analyse={analyse} />}
      {reiter === 'historie' && <Historie analyse={analyse} />}
      {reiter === 'inserate' && <Inserate analyse={analyse} />}
      {reiter === 'bilder' && <Bilder analyse={analyse} />}
      {reiter === 'dokumente' && <Dokumente analyse={analyse} />}
      {reiter === 'redflags' && <RedFlags analyse={analyse} />}
      {reiter === 'technik' && <Technik analyse={analyse} />}
      {reiter === 'restauration' && <Restauration analyse={analyse} />}
      {reiter === 'markt' && <Marktbereich analyse={analyse} />}
      {reiter === 'notizen' && <Notizen analyse={analyse} />}
      {reiter === 'bericht' && <Bericht analyse={analyse} />}
    </>
  );
}

/* ==========================================================================
 * Übersicht
 * ======================================================================= */

function Uebersicht({ analyse }: { analyse: Fahrzeuganalyse }) {
  const a = analyse;
  const staerken = useMemo(
    () =>
      [
        ...staerksteBeitraege(a.qualitaet, 4),
        ...staerksteBeitraege(a.asset.score, 3),
        ...staerksteBeitraege(a.evidenz.score, 3),
        ...staerksteBeitraege(a.integritaet, 3),
      ]
        .filter((b) => (b.delta ?? 0) !== 0)
        .sort((x, y) => Math.abs(y.delta ?? 0) - Math.abs(x.delta ?? 0))
        .slice(0, 8),
    [a],
  );

  return (
    <div className="stack stack--lg">
      <div className="kpi-grid">
        <Kennzahl
          label="Gesamtbewertung"
          wert={a.gesamt.wert}
          einheit={`/ 100 · Rang ${a.gesamt.rang}`}
          hinweis={a.gesamt.begruendung}
          beurteilung
          ton={a.gesamt.rang === 'A' ? 'gut' : a.gesamt.rang === 'D' ? 'gefahr' : undefined}
        />
        <Kennzahl
          label="Angebotspreis"
          wert={euro(a.aktuell.preis)}
          hinweis={
            a.bewertung.fairValue > 0
              ? `Fair Market Value ${euro(a.bewertung.fairValue)} (${prozent(a.bewertung.abweichungProzent)})`
              : 'kein Marktwert bestimmbar'
          }
        />
        <Kennzahl
          label="Offer Integrity"
          wert={a.integritaet.wert}
          hinweis={a.integritaet.einstufung}
          beurteilung
        />
        <Kennzahl
          label="Individual Vehicle Quality"
          wert={a.qualitaet.wert}
          hinweis={a.qualitaet.einstufung}
          beurteilung
        />
      </div>

      <Karte
        titel="INGTEC BUY SIGNAL"
        untertitel="Abschnitt 28 — alle Mindestbedingungen müssen erfüllt sein; ein Mittelwert genügt nicht"
        beurteilung
      >
        <div className={a.buySignal.ausgeloest ? 'buysignal-tafel' : ''}>
          <div className="row row--between" style={{ marginBottom: 'var(--sp-4)' }}>
            <strong>
              {a.buySignal.ausgeloest
                ? 'Signal ausgelöst'
                : `${a.buySignal.bedingungen.filter((b) => !b.erfuellt).length} von ${a.buySignal.bedingungen.length} Bedingungen offen`}
            </strong>
            <Signalabzeichen ausgeloest={a.buySignal.ausgeloest} />
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Bedingung</th>
                  <th>Ist</th>
                  <th>Soll</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {a.buySignal.bedingungen.map((b) => (
                  <tr key={b.schluessel}>
                    <td>{b.label}</td>
                    <td className="num mono">{b.ist}</td>
                    <td className="num mono">{b.soll}</td>
                    <td>
                      {b.erfuellt ? (
                        <Marke ton="gut">erfüllt</Marke>
                      ) : (
                        <Marke ton="gefahr">offen</Marke>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="hinweis-kasten" style={{ marginTop: 'var(--sp-4)' }}>
            <strong>Empfohlene nächste Handlung:</strong> {a.buySignal.naechsteHandlung}
          </p>
        </div>
      </Karte>

      <div className="raster raster--2">
        <Karte
          titel="Warum empfiehlt das System dieses Fahrzeug?"
          untertitel="Abschnitt 39 — die stärksten Einflüsse, auf den Gesamtscore umgerechnet"
          beurteilung
        >
          {staerken.length === 0 ? (
            <p className="subtle">Keine ausschlaggebenden Einzelbeiträge.</p>
          ) : (
            <ul className="komponente__liste" style={{ padding: 0, borderTop: 'none' }}>
              {staerken.map((b, i) => (
                <li key={i} className="beitrag">
                  <span
                    className={`beitrag__delta mono ${
                      (b.delta ?? 0) > 0 ? 'beitrag__delta--plus' : 'beitrag__delta--minus'
                    }`}
                  >
                    {(b.delta ?? 0) > 0 ? `+${b.delta}` : b.delta}
                  </span>
                  <span className="beitrag__text">
                    {b.text}
                    {b.quelle && <em className="beitrag__quelle">{b.quelle}</em>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Karte>

        <Karte
          titel="INGTEC Firmenwagenmodus"
          untertitel="Abschnitt 24 — Parameter sind in der Verwaltung konfigurierbar"
          beurteilung
        >
          <div className="row row--between" style={{ marginBottom: 'var(--sp-3)' }}>
            <strong>
              {a.firmenwagen.geeignet
                ? 'Alle Kriterien erfüllt'
                : 'Kriterien nicht vollständig erfüllt'}
            </strong>
            {a.firmenwagen.geeignet ? (
              <Marke ton="gut">geeignet</Marke>
            ) : (
              <Marke ton="warn">nicht geeignet</Marke>
            )}
          </div>
          <div className="table-wrap">
            <table className="table">
              <tbody>
                {a.firmenwagen.kriterien.map((k) => (
                  <tr key={k.schluessel}>
                    <td>
                      {k.label}
                      <div className="subtle" style={{ fontSize: 'var(--fs-2xs)' }}>
                        {k.begruendung}
                      </div>
                    </td>
                    <td className="num mono nowrap">{k.ist}</td>
                    <td>
                      {k.erfuellt ? <Marke ton="gut">ja</Marke> : <Marke ton="gefahr">nein</Marke>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="hinweis-kasten hinweis-kasten--warn" style={{ marginTop: 'var(--sp-4)' }}>
            <strong>Steuerlicher Prüfhinweis:</strong> {a.firmenwagen.steuerhinweis}
          </p>
        </Karte>
      </div>

      <Karte titel="Fahrzeugdaten" untertitel="Aktueller Stand des führenden Inserates">
        <dl className="definitionsliste">
          <dt>Modell</dt>
          <dd>{a.bezeichnung}</dd>
          <dt>Motor</dt>
          <dd>
            {a.aktuell.motor}
            {a.aktuell.leistungPs !== null && ` · ${a.aktuell.leistungPs} PS`}
            {a.aktuell.hubraumCcm !== null && ` · ${zahl(a.aktuell.hubraumCcm)} cm³`}
          </dd>
          <dt>Getriebe / Antrieb</dt>
          <dd>
            {a.aktuell.getriebe} / {a.aktuell.antrieb}
          </dd>
          <dt>Erstzulassung</dt>
          <dd>
            {monat(a.aktuell.erstzulassung)}
            {a.alterJahre !== null && ` · ${a.alterJahre.toFixed(1)} Jahre`}
          </dd>
          <dt>Kilometerstand</dt>
          <dd>{kilometer(a.aktuell.kilometerstand)}</dd>
          <dt>Farbe</dt>
          <dd>
            {a.aktuell.farbeAussen ?? '—'} / {a.aktuell.farbeInnen ?? '—'}
          </dd>
          <dt>Vorbesitzer</dt>
          <dd>{a.aktuell.vorbesitzer ?? 'keine Angabe'}</dd>
          <dt>Fahrgestellnummer</dt>
          <dd className="mono">{a.aktuell.vin ?? 'nicht angegeben'}</dd>
          <dt>Servicehistorie</dt>
          <dd>{a.aktuell.servicehistorie}</dd>
          <dt>Unfallangabe</dt>
          <dd>{a.aktuell.unfallangabe}</dd>
          <dt>Ausstattung</dt>
          <dd>{a.aktuell.ausstattung.join(', ') || '—'}</dd>
          <dt>Verkäufer</dt>
          <dd>
            {a.verkaeufer?.name ?? a.aktuell.verkaeuferName} ({a.aktuell.verkaeuferArt})
            {a.verkaeufer?.identitaetBelegt ? ' · Identität belegt' : ' · Identität unbelegt'}
          </dd>
          <dt>Quelle</dt>
          <dd>
            {plattformName(a.hauptinserat.plattformId)}
            {a.plattform && ` · ${ZUGRIFFSART_LABEL[a.plattform.zugriffsart]}`}
          </dd>
          <dt>Am Markt seit</dt>
          <dd>
            {a.angebotsdauerTage} Tagen ({relativeZeit(a.hauptinserat.erstEntdeckt)})
          </dd>
        </dl>
      </Karte>
    </div>
  );
}

/* ==========================================================================
 * Scores
 * ======================================================================= */

function Scores({ analyse }: { analyse: Fahrzeuganalyse }) {
  const a = analyse;
  return (
    <div className="stack stack--lg">
      <Karte
        titel="Gesamtbewertung"
        untertitel="Gewichtete Zusammenführung; Red Flags mindern zusätzlich, damit eine kritische Feststellung nicht wegmittelt"
        beurteilung
      >
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Anteil</th>
                <th className="num">Punkte</th>
                <th className="num">Gewicht</th>
                <th className="num">Beitrag</th>
              </tr>
            </thead>
            <tbody>
              {a.gesamt.anteile.map((x) => (
                <tr key={x.label}>
                  <td>{x.label}</td>
                  <td className="num mono">{x.punkte}</td>
                  <td className="num mono">{x.gewicht} %</td>
                  <td className="num mono">
                    {((x.punkte * x.gewicht) / 100).toFixed(1)}
                  </td>
                </tr>
              ))}
              {a.gesamt.redFlagAbzug > 0 && (
                <tr>
                  <td>Abzug für {a.redFlags.length} Red Flag(s)</td>
                  <td className="num mono">—</td>
                  <td className="num mono">—</td>
                  <td className="num mono">−{a.gesamt.redFlagAbzug}</td>
                </tr>
              )}
              <tr>
                <td>
                  <strong>Gesamt</strong>
                </td>
                <td className="num mono">
                  <strong>{a.gesamt.wert}</strong>
                </td>
                <td />
                <td className="num mono">
                  <strong>Rang {a.gesamt.rang}</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Karte>

      <Karte
        titel="Offer Integrity Score"
        untertitel="Abschnitt 12 — bewertet das Angebot, nicht das Fahrzeug"
        beurteilung
      >
        <Scorebalken label={a.integritaet.einstufung} score={a.integritaet} />
        <div style={{ marginTop: 'var(--sp-4)' }}>
          <Beitragsliste score={a.integritaet} />
        </div>
      </Karte>

      <Karte
        titel="Evidence Score"
        untertitel="Abschnitt 13 — bewertet nicht, was behauptet wird, sondern wie gut es belegt ist"
        beurteilung
      >
        <Scorebalken label={a.evidenz.score.einstufung} score={a.evidenz.score} />
        <div style={{ marginTop: 'var(--sp-4)' }}>
          <Beitragsliste score={a.evidenz.score} />
        </div>
      </Karte>

      <Karte
        titel="Automotive Asset Score"
        untertitel="Abschnitt 14 — Eigenschaft des Modells, nicht des Exemplars"
        beurteilung
      >
        <Scorebalken label={a.asset.score.einstufung} score={a.asset.score} />
        {a.asset.gemesseneKriterien.length > 0 && (
          <p className="hinweis-kasten" style={{ marginTop: 'var(--sp-3)' }}>
            Gemessen statt geschätzt:{' '}
            {a.asset.gemesseneKriterien
              .map((k) => ASSET_KRITERIUM_LABEL[k])
              .join(' und ')}{' '}
            stammen aus der beobachteten Marktreihe und überschreiben den Katalogwert
            hälftig.
          </p>
        )}
        <div style={{ marginTop: 'var(--sp-4)' }}>
          <Beitragsliste score={a.asset.score} />
        </div>
      </Karte>

      <Karte
        titel="Individual Vehicle Quality Score"
        untertitel="Abschnitt 15 — bewertet dieses eine Exemplar"
        beurteilung
      >
        <Scorebalken label={a.qualitaet.einstufung} score={a.qualitaet} />
        <div style={{ marginTop: 'var(--sp-4)' }}>
          <Beitragsliste score={a.qualitaet} />
        </div>
      </Karte>
    </div>
  );
}

/* ==========================================================================
 * Preisbewertung
 * ======================================================================= */

function Preisbewertung({ analyse }: { analyse: Fahrzeuganalyse }) {
  const b = analyse.bewertung;

  if (b.fairValue === 0) {
    return (
      <Karte titel="Marktbewertung" beurteilung>
        <Leerzustand
          titel="Kein Marktwert ausgewiesen"
          text={b.hinweise[0] ?? 'Dem Fahrzeug ist kein Katalogmodell zugeordnet.'}
        />
      </Karte>
    );
  }

  return (
    <div className="stack stack--lg">
      <Karte
        titel="Market Valuation"
        untertitel="Abschnitt 16 — Anker aus der beobachteten Kilometerklasse, danach benannte Faktoren"
        beurteilung
      >
        <div className="kpi-grid" style={{ marginBottom: 'var(--sp-5)' }}>
          <Kennzahl label="Angebotspreis" wert={euro(b.angebotspreis)} />
          <Kennzahl
            label="Fair Market Value"
            wert={euro(b.fairValue)}
            hinweis={`Konfidenz ${b.konfidenz} %`}
            beurteilung
          />
          <Kennzahl
            label="Abweichung"
            wert={prozent(b.abweichungProzent)}
            hinweis={euro(b.abweichungEuro)}
            beurteilung
            ton={
              b.abweichungProzent <= -25
                ? 'warn'
                : b.abweichungProzent < 0
                  ? 'gut'
                  : b.abweichungProzent > 12
                    ? 'warn'
                    : undefined
            }
          />
          <Kennzahl
            label="Marktliquidität"
            wert={b.liquiditaet}
            hinweis={`erwartete Standzeit ${b.standzeitTage} Tage`}
          />
        </div>

        <Preisband
          fairValue={b.fairValue}
          intervall={b.intervall}
          angebotspreis={b.angebotspreis}
        />

        <p className="hinweis-kasten" style={{ marginTop: 'var(--sp-5)' }}>
          <strong>Anker:</strong> {b.ankerherkunft}
        </p>
      </Karte>

      <Karte titel="Wertfaktoren" untertitel="Jeder Faktor mit Wirkung in Euro und Begründung">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Faktor</th>
                <th className="num">Wirkung</th>
                <th className="num">Faktor</th>
                <th>Begründung</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>Ankerwert</strong>
                </td>
                <td className="num mono">
                  <strong>{euro(b.ankerwert)}</strong>
                </td>
                <td className="num mono">—</td>
                <td className="subtle">{b.vergleichsbasis} Vergleichsfahrzeuge</td>
              </tr>
              {b.faktoren.map((f) => (
                <tr key={f.schluessel}>
                  <td>{f.label}</td>
                  <td className={`num mono ${f.wirkung >= 0 ? '' : 'muted'}`}>
                    {f.wirkung >= 0 ? '+' : ''}
                    {euro(Math.round(f.wirkung))}
                  </td>
                  <td className="num mono">{f.faktor.toFixed(3)}</td>
                  <td style={{ fontSize: 'var(--fs-xs)' }}>{f.begruendung}</td>
                </tr>
              ))}
              <tr>
                <td>
                  <strong>Fair Market Value</strong>
                </td>
                <td className="num mono">
                  <strong>{euro(b.fairValue)}</strong>
                </td>
                <td />
                <td className="subtle">
                  Konfidenzintervall {euro(b.intervall[0])} – {euro(b.intervall[1])}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        {b.hinweise.length > 0 && (
          <ul className="hinweisliste" style={{ marginTop: 'var(--sp-4)' }}>
            {b.hinweise.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        )}
      </Karte>

      <Karte titel="Preisverlauf des Fahrzeuges" untertitel="Über alle beobachteten Inserate">
        <Preisverlauf analyse={analyse} />
      </Karte>
    </div>
  );
}

function Preisverlauf({ analyse }: { analyse: Fahrzeuganalyse }) {
  const punkte = analyse.inserate
    .flatMap((i) =>
      i.beobachtungen.map((b) => ({
        zeitpunkt: b.zeitpunkt,
        preis: b.daten.preis,
        km: b.daten.kilometerstand,
        plattform: plattformName(i.plattformId),
        verkaeufer: b.daten.verkaeuferName,
      })),
    )
    .sort((x, y) => Date.parse(x.zeitpunkt) - Date.parse(y.zeitpunkt));

  if (punkte.length < 2) {
    return <p className="subtle">Bisher nur eine Beobachtung — kein Verlauf darstellbar.</p>;
  }

  return (
    <>
      <Verlaufskurve
        werte={punkte.map((p) => p.preis)}
        beschriftung={`${euro(punkte[0].preis)} am ${datum(punkte[0].zeitpunkt)} → ${euro(
          punkte[punkte.length - 1].preis,
        )} am ${datum(punkte[punkte.length - 1].zeitpunkt)}`}
      />
      <div className="table-wrap" style={{ marginTop: 'var(--sp-4)' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Datum</th>
              <th className="num">Preis</th>
              <th className="num">Kilometer</th>
              <th>Verkäufer</th>
              <th>Plattform</th>
            </tr>
          </thead>
          <tbody>
            {punkte.map((p, i) => (
              <tr key={i}>
                <td className="mono">{datum(p.zeitpunkt)}</td>
                <td className="num mono">{euro(p.preis)}</td>
                <td className="num mono">{kilometer(p.km)}</td>
                <td>{p.verkaeufer}</td>
                <td>{p.plattform}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ==========================================================================
 * Historie
 * ======================================================================= */

function Historie({ analyse }: { analyse: Fahrzeuganalyse }) {
  const { state } = useStore();
  const fahrzeug = state.bestand.fahrzeuge.find((f) => f.id === analyse.fahrzeugId);
  const audit = state.bestand.audit.filter(
    (e) =>
      analyse.inserate.some((i) => e.objekt.includes(i.externeId)) ||
      e.objekt.includes(analyse.fahrzeugId),
  );

  return (
    <div className="stack stack--lg">
      <div className="kpi-grid">
        <Kennzahl
          label="Beobachtungsdauer"
          wert={analyse.historie.beobachtungsdauerTage}
          einheit="Tage"
          hinweis={`${analyse.historie.anzahlBeobachtungen} Beobachtungen`}
        />
        <Kennzahl
          label="Preisänderungen"
          wert={analyse.historie.anzahlPreisaenderungen}
          hinweis={
            analyse.historie.preisveraenderungProzent !== null
              ? `insgesamt ${prozent(analyse.historie.preisveraenderungProzent)}`
              : undefined
          }
        />
        <Kennzahl
          label="Verkäuferwechsel"
          wert={analyse.historie.verkaeuferwechsel}
          hinweis={`${analyse.historie.plattformen} Plattformen`}
          ton={analyse.historie.verkaeuferwechsel >= 2 ? 'warn' : undefined}
        />
        <Kennzahl
          label="Kilometerstand"
          wert={analyse.historie.kilometerRueckgang ? 'gesunken' : 'plausibel'}
          hinweis={
            analyse.historie.kilometerRueckgang
              ? 'Rückgang zwischen zwei Beobachtungen'
              : 'monoton steigend'
          }
          beurteilung
          ton={analyse.historie.kilometerRueckgang ? 'gefahr' : 'gut'}
        />
      </div>

      <Karte
        titel="Änderungen"
        untertitel="Abgeleitet aus dem Vergleich aufeinanderfolgender Beobachtungen (Abschnitt 11)"
      >
        {analyse.aenderungen.length === 0 ? (
          <p className="subtle">Seit der ersten Beobachtung unverändert.</p>
        ) : (
          <ul className="zeitleiste">
            {analyse.aenderungen.map((a, i) => (
              <li key={i} className="zeitleiste__eintrag">
                <span className="zeitleiste__zeit">{datum(a.zeitpunkt)}</span>
                <span>
                  <span className="zeitleiste__art">{a.bezeichnung}</span>
                  <div className="zeitleiste__wert">
                    {a.vorher !== null && <del>{a.vorher}</del>}
                    {a.vorher !== null && a.nachher !== null && ' → '}
                    {a.nachher !== null && <ins>{a.nachher}</ins>}
                    {a.differenz !== null && (
                      <span className="mono subtle">
                        {' '}
                        ({a.differenz > 0 ? '+' : ''}
                        {zahl(a.differenz)})
                      </span>
                    )}
                  </div>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Karte>

      <Karte titel="Ereignisse der Fahrzeugakte" untertitel="Tabelle vehicle_events">
        {!fahrzeug || fahrzeug.ereignisse.length === 0 ? (
          <p className="subtle">Keine Ereignisse gespeichert.</p>
        ) : (
          <ul className="zeitleiste">
            {[...fahrzeug.ereignisse]
              .sort((a, b) => Date.parse(b.zeitpunkt) - Date.parse(a.zeitpunkt))
              .map((e) => (
                <li key={e.id} className="zeitleiste__eintrag">
                  <span className="zeitleiste__zeit">{datum(e.zeitpunkt)}</span>
                  <span>
                    <span className="zeitleiste__art">{e.art}</span>
                    <div className="zeitleiste__wert">{e.text}</div>
                  </span>
                </li>
              ))}
          </ul>
        )}
      </Karte>

      <Karte
        titel="Audit Trail"
        untertitel="Abschnitt 35 — Zeitpunkt, Quelle, alter und neuer Wert, Systementscheidung"
      >
        {audit.length === 0 ? (
          <p className="subtle">Keine Auditeinträge zu diesem Fahrzeug.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Zeitpunkt</th>
                  <th>Quelle</th>
                  <th>Feld</th>
                  <th>Vorher</th>
                  <th>Nachher</th>
                  <th>Systementscheidung</th>
                </tr>
              </thead>
              <tbody>
                {[...audit]
                  .sort((a, b) => Date.parse(b.zeitpunkt) - Date.parse(a.zeitpunkt))
                  .map((e) => (
                    <tr key={e.id}>
                      <td className="mono nowrap">{datum(e.zeitpunkt)}</td>
                      <td>{e.quelle}</td>
                      <td>{e.feld}</td>
                      <td className="subtle">{e.vorher ?? '—'}</td>
                      <td>{e.nachher ?? '—'}</td>
                      <td style={{ fontSize: 'var(--fs-2xs)' }}>{e.systementscheidung ?? '—'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </Karte>
    </div>
  );
}

/* ==========================================================================
 * Inserate und Datenqualität
 * ======================================================================= */

function Inserate({ analyse }: { analyse: Fahrzeuganalyse }) {
  return (
    <div className="stack stack--lg">
      <Karte
        titel={`${analyse.inserate.length} Inserat(e) desselben Fahrzeuges`}
        untertitel="Abschnitt 7 — ein Fahrzeug, mehrere Inserate, viele Beobachtungen"
      >
        <div className="stack">
          {analyse.inserate.map((i) => {
            const letzte = i.beobachtungen[i.beobachtungen.length - 1];
            return (
              <div key={i.id} className="hinweis-kasten">
                <div className="row row--between row--wrap">
                  <strong>
                    {plattformName(i.plattformId)} · {i.externeId}
                  </strong>
                  {i.aktiv ? (
                    <Marke ton="gut">aktiv</Marke>
                  ) : (
                    <Marke ton="warn">entfernt am {datum(i.entferntAm)}</Marke>
                  )}
                </div>
                <dl className="definitionsliste" style={{ marginTop: 'var(--sp-3)' }}>
                  <dt>Erstentdeckung</dt>
                  <dd>{datumZeit(i.erstEntdeckt)}</dd>
                  <dt>Zuletzt gesehen</dt>
                  <dd>{datumZeit(i.zuletztGesehen)}</dd>
                  <dt>Beobachtungen</dt>
                  <dd>{i.beobachtungen.length}</dd>
                  <dt>Verkäufer</dt>
                  <dd>{letzte.daten.verkaeuferName}</dd>
                  <dt>Aktueller Preis</dt>
                  <dd>{euro(letzte.daten.preis)}</dd>
                  <dt>URL</dt>
                  <dd className="mono" style={{ wordBreak: 'break-all', fontSize: 'var(--fs-2xs)' }}>
                    {i.url}
                  </dd>
                </dl>
              </div>
            );
          })}
        </div>
      </Karte>

      <Karte
        titel="Datenqualität"
        untertitel="Abschnitt 34 — jedes Feld mit Quelle, Zeitpunkt und Confidence; Widersprüche werden gespeichert, nicht überschrieben"
        beurteilung
      >
        {analyse.felder.length === 0 ? (
          <p className="subtle">Keine konsolidierten Felder.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Feld</th>
                  <th>Führender Wert</th>
                  <th>Quelle</th>
                  <th className="num">Confidence</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {analyse.felder.map((f) => (
                  <tr key={f.feld}>
                    <td>{f.label}</td>
                    <td className="mono">{f.fuehrend.wert}</td>
                    <td>{f.fuehrend.quelle}</td>
                    <td className="num mono">{f.fuehrend.confidence} %</td>
                    <td>
                      {f.widerspruch ? (
                        <>
                          <Marke ton="gefahr">Widerspruch</Marke>
                          <div className="subtle" style={{ fontSize: 'var(--fs-2xs)', marginTop: '0.2rem' }}>
                            {f.alle.map((a) => `${a.wert} (${a.quelle}, ${a.confidence} %)`).join(' · ')}
                          </div>
                        </>
                      ) : (
                        <span className="subtle">{f.hinweis}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Karte>

      <Karte
        titel="Text Intelligence"
        untertitel="Abschnitt 22 — erkannte Formulierungen erzeugen Prüfanforderungen, keine Abwertung"
      >
        {analyse.text.befunde.length === 0 ? (
          <p className="subtle">Keine auffälligen Formulierungen erkannt.</p>
        ) : (
          <div className="stack stack--sm">
            {analyse.text.befunde.map((b) => (
              <div key={b.musterId} className="hinweis-kasten">
                <div className="row row--between row--wrap">
                  <strong>{b.bezeichnung}</strong>
                  <Marke>{TEXTKATEGORIE_LABEL[b.kategorie]}</Marke>
                </div>
                <p style={{ marginTop: 'var(--sp-2)' }}>{b.bedeutung}</p>
                <p style={{ marginTop: 'var(--sp-2)' }}>
                  <strong>Prüfanforderung:</strong> {b.pruefanforderung}
                </p>
                <p className="mono subtle" style={{ marginTop: 'var(--sp-2)', fontSize: 'var(--fs-2xs)' }}>
                  Fundstelle ({b.feld}): „{b.fundstelle}“
                </p>
              </div>
            ))}
          </div>
        )}
      </Karte>
    </div>
  );
}

/* ==========================================================================
 * Bilder
 * ======================================================================= */

function Bilder({ analyse }: { analyse: Fahrzeuganalyse }) {
  const bilder = analyse.aktuell.bilder;
  return (
    <div className="stack stack--lg">
      <Karte
        titel={`Bildanalyse — ${bilder.length} Bilder`}
        untertitel="Abschnitt 21 — die Analyse markiert Auffälligkeiten und trifft keine Schadensfeststellung"
      >
        <p className="hinweis-kasten" style={{ marginBottom: 'var(--sp-4)' }}>
          Die Anwendung zeigt Wahrnehmungs-Hashes und erkannte Merkmale, keine
          Bilddateien. Nach Abschnitt 36 werden Bildrechte nicht durch Speicherung
          berührt; der Hash genügt für Wiedererkennung und Duplikatprüfung.
        </p>
        {bilder.length === 0 ? (
          <p className="subtle">Das Inserat enthält keine Bilder.</p>
        ) : (
          <div className="bildraster">
            {bilder.map((b) => (
              <div
                key={b.id}
                className={`bildkachel ${b.auffaelligkeiten.length > 0 ? 'bildkachel--auffaellig' : ''}`}
              >
                <span className="bildkachel__nr">Bild {b.position}</span>
                <span>{b.merkmale.join(', ') || 'keine Merkmale erkannt'}</span>
                <span className="bildkachel__hash">{b.phash}</span>
                {b.auffaelligkeiten.map((a, i) => (
                  <span key={i} className="bildkachel__hinweis">
                    ▲ {a.hinweis} (Confidence {a.confidence} %)
                  </span>
                ))}
              </div>
            ))}
          </div>
        )}
      </Karte>
    </div>
  );
}

/* ==========================================================================
 * Dokumente
 * ======================================================================= */

function Dokumente({ analyse }: { analyse: Fahrzeuganalyse }) {
  const { state } = useStore();
  const fahrzeug = state.bestand.fahrzeuge.find((f) => f.id === analyse.fahrzeugId);
  const dokumente = fahrzeug?.dokumente ?? [];

  return (
    <div className="stack stack--lg">
      <Karte
        titel={`Unterlagen (${dokumente.length})`}
        untertitel="Abschnitt 41 — extrahiert werden Datum, Kilometerstand, Werkstatt, Leistungen und Kosten"
      >
        {dokumente.length === 0 ? (
          <Leerzustand
            titel="Keine Unterlagen hinterlegt"
            text="Ohne Unterlagen bleibt der Evidence Score niedrig — unabhängig davon, wie gut das Fahrzeug ist. Die Verkäuferanfrage im Bereich „Technik und Prüfung“ listet die fehlenden Belege auf."
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Art</th>
                  <th>Bezeichnung</th>
                  <th>Datum</th>
                  <th className="num">Kilometer</th>
                  <th>Leistungen</th>
                  <th className="num">Kosten</th>
                  <th className="num">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {dokumente.map((d) => (
                  <tr key={d.id}>
                    <td>{BELEGART_LABEL[d.art]}</td>
                    <td>{d.bezeichnung}</td>
                    <td className="mono nowrap">{datum(d.extrahiert.datum)}</td>
                    <td className="num mono">{kilometer(d.extrahiert.kilometerstand)}</td>
                    <td style={{ fontSize: 'var(--fs-xs)' }}>
                      {d.extrahiert.leistungen.join(', ')}
                    </td>
                    <td className="num mono">{euro(d.extrahiert.kostenEuro)}</td>
                    <td className="num mono">{d.confidence} %</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Karte>

      <Karte
        titel="Belegprüfung"
        untertitel="Abschnitt 13 — jede Behauptung des Inserates gegen die vorliegenden Unterlagen"
        beurteilung
      >
        {analyse.evidenz.pruefungen.length === 0 ? (
          <p className="subtle">
            Das Inserat stellt keine belegfähigen Behauptungen auf.
          </p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Behauptung</th>
                  <th>Fundstelle</th>
                  <th>Bewertung</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {analyse.evidenz.pruefungen.map((p) => (
                  <tr key={p.behauptung.id}>
                    <td>
                      {p.behauptung.text}
                      {p.behauptung.beiKilometer !== null && (
                        <div className="subtle" style={{ fontSize: 'var(--fs-2xs)' }}>
                          bei {kilometer(p.behauptung.beiKilometer)}
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: 'var(--fs-2xs)' }} className="subtle">
                      {p.behauptung.fundstelle}
                    </td>
                    <td style={{ fontSize: 'var(--fs-xs)' }}>{p.bewertung}</td>
                    <td>
                      {p.gedeckt ? (
                        <Marke ton="gut">belegt</Marke>
                      ) : (
                        <Marke ton="warn">unbelegt</Marke>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {analyse.evidenz.fehlendeBelege.length > 0 && (
          <p className="hinweis-kasten hinweis-kasten--warn" style={{ marginTop: 'var(--sp-4)' }}>
            <strong>Anzufordern:</strong>{' '}
            {analyse.evidenz.fehlendeBelege
              .map(
                (f) =>
                  `${f.behauptung} (${f.benoetigt.map((b) => BELEGART_LABEL[b]).join(' oder ')})`,
              )
              .join(' · ')}
          </p>
        )}
      </Karte>
    </div>
  );
}

/* ==========================================================================
 * Red Flags
 * ======================================================================= */

function RedFlags({ analyse }: { analyse: Fahrzeuganalyse }) {
  return (
    <Karte
      titel={`Red Flags (${analyse.redFlags.length})`}
      untertitel="Abschnitt 23 — jede Feststellung mit Schweregrad, Begründung, Quelle, Zeitpunkt und Empfehlung"
      beurteilung
    >
      {analyse.redFlags.length === 0 ? (
        <Leerzustand
          titel="Keine Red Flags"
          text="Im beobachteten Verlauf und in den vorliegenden Daten wurde keine Auffälligkeit festgestellt. Das ersetzt keine Besichtigung."
        />
      ) : (
        <div className="stack">
          {analyse.redFlags.map((f) => (
            <RedFlagKarte key={f.id} flag={f} />
          ))}
        </div>
      )}
      <p className="hinweis-kasten" style={{ marginTop: 'var(--sp-4)' }}>
        Nach Abschnitt 4 stellt die Anwendung weder Betrug noch Manipulation
        rechtsverbindlich fest. Red Flags sind Auffälligkeiten, die geprüft werden
        müssen — keine Feststellungen.
      </p>
    </Karte>
  );
}

/* ==========================================================================
 * Technik, Prüfliste, Verkäuferanfrage
 * ======================================================================= */

function Technik({ analyse }: { analyse: Fahrzeuganalyse }) {
  const { state, dispatch, aktiverBenutzer } = useStore();
  const eintrag = state.arbeit.watchlist.find((w) => w.fahrzeugId === analyse.fahrzeugId);

  const bereiche = useMemo(() => {
    const gruppen = new Map<string, typeof analyse.pruefpunkte>();
    for (const p of analyse.pruefpunkte) {
      gruppen.set(p.bereich, [...(gruppen.get(p.bereich) ?? []), p]);
    }
    return [...gruppen.entries()];
  }, [analyse.pruefpunkte]);

  const text = anfragetext(
    `${analyse.bezeichnung}, ${monat(analyse.aktuell.erstzulassung)}, ${kilometer(
      analyse.aktuell.kilometerstand,
    )}`,
    analyse.anfragepunkte,
    aktiverBenutzer.name,
  );

  return (
    <div className="stack stack--lg">
      <Karte
        titel="Modelltypische Risiken"
        untertitel="Abschnitt 20 — Knowledge Base, abgeglichen mit Laufleistung, Inseratstext und Unterlagen"
        beurteilung
      >
        <div className="kpi-grid" style={{ marginBottom: 'var(--sp-4)' }}>
          <Kennzahl
            label="Offener Instandsetzungsbedarf"
            wert={euro(Math.round(analyse.risiken.offenerBedarf))}
            hinweis={`ungünstiger Fall bis ${euro(analyse.risiken.offenerBedarfMaximal)}`}
            beurteilung
            ton={analyse.risiken.offenerBedarf > 4000 ? 'warn' : undefined}
          />
          <Kennzahl
            label="Risikobelastung"
            wert={analyse.risiken.belastung}
            einheit="/ 100"
            hinweis={`${analyse.risiken.kritischOffen.length} kritische Risiken offen`}
            beurteilung
            ton={analyse.risiken.kritischOffen.length > 0 ? 'gefahr' : 'gut'}
          />
        </div>

        {analyse.risiken.befunde.length === 0 ? (
          <p className="subtle">
            Für dieses Modell sind keine Risiken hinterlegt — die Knowledge Base ist
            derzeit auf die MVP-Modelle beschränkt.
          </p>
        ) : (
          <div>
            {analyse.risiken.befunde.map((b) => (
              <div key={b.risiko.id} className="risikozeile">
                <div>
                  <div className="risikozeile__bezeichnung">
                    {b.risiko.bezeichnung}{' '}
                    <span className="subtle" style={{ fontWeight: 400 }}>
                      · {b.risiko.bauteil}
                    </span>{' '}
                    {b.belegtErledigt ? (
                      <Marke ton="gut">belegt erledigt</Marke>
                    ) : b.alsErledigtBehauptet ? (
                      <Marke ton="warn">behauptet erledigt</Marke>
                    ) : b.faellig ? (
                      <Marke ton="gefahr">fällig</Marke>
                    ) : (
                      <Marke>noch nicht fällig</Marke>
                    )}
                  </div>
                  <div className="risikozeile__text">{b.risiko.beschreibung}</div>
                  <div className="risikozeile__text">
                    <strong>Bewertung:</strong> {b.bewertung}
                  </div>
                  <div className="risikozeile__text">
                    <strong>Prüfung:</strong> {b.risiko.pruefpunkt}
                  </div>
                </div>
                <div className="risikozeile__kosten">
                  {euro(b.risiko.kostenVon)} – {euro(b.risiko.kostenBis)}
                  <div className="subtle">
                    Erwartungswert {euro(b.erwartungswert)}
                  </div>
                  <div className="subtle">
                    {b.risiko.schwere} / {b.risiko.wahrscheinlichkeit}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Karte>

      <Karte
        titel={`Technische Prüfliste (${analyse.pruefpunkte.length} Punkte)`}
        untertitel="Abschnitt 43 — Grundkatalog plus je ein Punkt aus jedem einschlägigen Modellrisiko"
        beurteilung
      >
        {!eintrag && (
          <p className="hinweis-kasten" style={{ marginBottom: 'var(--sp-4)' }}>
            Die Prüfergebnisse werden am Watchlist-Eintrag gespeichert. Nehmen Sie das
            Fahrzeug in die Watchlist auf, um Ergebnisse zu erfassen.
          </p>
        )}
        {bereiche.map(([bereich, punkte]) => (
          <div key={bereich} style={{ marginBottom: 'var(--sp-5)' }}>
            <h3 className="section-title">
              {PRUEFBEREICH_LABEL[bereich as keyof typeof PRUEFBEREICH_LABEL] ?? bereich}
            </h3>
            {punkte.map((p) => {
              const ergebnis = eintrag?.pruefung.find((x) => x.punktId === p.id);
              return (
                <div key={p.id} className="pruefzeile">
                  <div>
                    <div className="pruefzeile__text">
                      {p.pflicht && <strong>Pflicht · </strong>}
                      {p.text}
                    </div>
                    <div className="pruefzeile__herkunft">
                      {p.herkunft} · {p.vorOrt ? 'vor Ort' : 'vorab klärbar'}
                    </div>
                  </div>
                  <select
                    className="select"
                    value={ergebnis?.status ?? 'nicht-geprueft'}
                    disabled={!eintrag}
                    onChange={(e) =>
                      eintrag &&
                      dispatch({
                        typ: 'pruefpunkt',
                        id: eintrag.id,
                        punktId: p.id,
                        status: e.target.value as Pruefstatus,
                        bemerkung: ergebnis?.bemerkung ?? '',
                      })
                    }
                  >
                    <option value="nicht-geprueft">nicht geprüft</option>
                    <option value="bestanden">bestanden</option>
                    <option value="nicht-bestanden">nicht bestanden</option>
                    <option value="mangel">Mangel</option>
                    <option value="hinweis">Hinweis</option>
                  </select>
                </div>
              );
            })}
          </div>
        ))}
      </Karte>

      <Karte
        titel={`Verkäuferanfrage (${analyse.anfragepunkte.length} Fragen)`}
        untertitel="Abschnitt 42 — wird niemals automatisch versendet; die Freigabe erfolgt durch den Benutzer"
        aktion={
          eintrag ? (
            eintrag.anfrageVersendetAm ? (
              <Marke ton="gut">freigegeben am {datum(eintrag.anfrageVersendetAm)}</Marke>
            ) : (
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => dispatch({ typ: 'anfrage-freigeben', id: eintrag.id })}
              >
                Anfrage freigeben
              </button>
            )
          ) : undefined
        }
      >
        <ol className="stack stack--sm" style={{ paddingLeft: 'var(--sp-5)' }}>
          {analyse.anfragepunkte.map((p) => (
            <li key={p.id}>
              <strong>{p.frage}</strong>
              <div className="subtle" style={{ fontSize: 'var(--fs-xs)' }}>
                {p.begruendung}
                {p.beleg.length > 0 &&
                  ` · Beleg: ${p.beleg.map((b) => BELEGART_LABEL[b]).join(' oder ')}`}
              </div>
            </li>
          ))}
        </ol>

        <h3 className="section-title" style={{ marginTop: 'var(--sp-5)' }}>
          Anschreiben zur Freigabe
        </h3>
        <pre className="anfragetext">{text}</pre>
      </Karte>
    </div>
  );
}

/* ==========================================================================
 * Restauration
 * ======================================================================= */

function Restauration({ analyse }: { analyse: Fahrzeuganalyse }) {
  const { state, dispatch } = useStore();
  const r = analyse.restauration;
  const erfassung = state.arbeit.zustaende[analyse.fahrzeugId] ?? analyse.zustandsvorschlag;

  function setzeStufe(gewerk: string, stufe: Zustandsstufe) {
    dispatch({
      typ: 'zustand',
      fahrzeugId: analyse.fahrzeugId,
      zustand: erfassung.map((z) =>
        z.gewerk === gewerk ? { ...z, stufe, herkunft: 'manuell' as const } : z,
      ),
    });
  }

  return (
    <div className="stack stack--lg">
      <Karte
        titel="Restaurationsrechnung"
        untertitel="Abschnitt 19 — Kaufpreis plus erwartete Restaurierung plus Reserve gegen den Marktwert nach Aufarbeitung"
        beurteilung
      >
        <div className="kpi-grid" style={{ marginBottom: 'var(--sp-5)' }}>
          <Kennzahl label="Kaufpreis" wert={euro(r.kaufpreis)} />
          <Kennzahl
            label="Restaurierung erwartet"
            wert={euro(r.restaurierungExpected)}
            hinweis={`${euro(r.restaurierungLow)} – ${euro(r.restaurierungHigh)}`}
          />
          <Kennzahl
            label="Reserve"
            wert={euro(r.reserve)}
            hinweis={`${(r.reservesatz * 100).toFixed(0)} % auf den Erwartungswert`}
          />
          <Kennzahl
            label="Gesamtinvestment"
            wert={euro(r.gesamtinvestmentExpected)}
            hinweis={`${euro(r.gesamtinvestmentLow)} – ${euro(r.gesamtinvestmentHigh)}`}
            beurteilung
          />
          <Kennzahl
            label="Marktwert nach Aufarbeitung"
            wert={euro(r.marktwertNachher)}
            hinweis={r.marktwertHerkunft}
            beurteilung
          />
          <Kennzahl
            label="Investment Ratio"
            wert={r.investmentRatio.toFixed(2)}
            hinweis={`ungünstiger Fall ${r.investmentRatioHigh.toFixed(2)}`}
            beurteilung
            ton={r.investmentRatio >= 1.15 ? 'gut' : r.investmentRatio >= 1 ? 'warn' : 'gefahr'}
          />
        </div>

        <p
          className={`hinweis-kasten ${
            r.investmentRatio >= 1.15
              ? ''
              : r.investmentRatio >= 1
                ? 'hinweis-kasten--warn'
                : 'hinweis-kasten--gefahr'
          }`}
        >
          <strong>Beurteilung:</strong> {r.bewertung}
        </p>
      </Karte>

      <Karte
        titel="Zustandserfassung"
        untertitel={`Vorschlag aus Inserat, Bildhinweisen und Risikoanalyse — jederzeit überschreibbar. Markenfaktor ${r.markenfaktor.toFixed(2)}`}
        aktion={
          state.arbeit.zustaende[analyse.fahrzeugId] ? (
            <button
              type="button"
              className="btn btn--sm"
              onClick={() =>
                dispatch({
                  typ: 'zustand',
                  fahrzeugId: analyse.fahrzeugId,
                  zustand: analyse.zustandsvorschlag,
                })
              }
            >
              Auf Vorschlag zurücksetzen
            </button>
          ) : undefined
        }
      >
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Gewerk</th>
                <th>Zustand</th>
                <th>Bemerkung</th>
                <th className="num">Low</th>
                <th className="num">Expected</th>
                <th className="num">High</th>
              </tr>
            </thead>
            <tbody>
              {r.positionen.map((p) => {
                const z = erfassung.find((x) => x.gewerk === p.gewerk);
                return (
                  <tr key={p.gewerk}>
                    <td>{p.label}</td>
                    <td>
                      <select
                        className="select"
                        value={p.stufe}
                        onChange={(e) =>
                          setzeStufe(p.gewerk, Number(e.target.value) as Zustandsstufe)
                        }
                      >
                        {([1, 2, 3, 4, 5] as Zustandsstufe[]).map((s) => (
                          <option key={s} value={s}>
                            {s} — {ZUSTANDSSTUFE_LABEL[s]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ fontSize: 'var(--fs-xs)' }} className="subtle">
                      {p.bemerkung}
                      {z?.herkunft === 'manuell' && ' (manuell gesetzt)'}
                    </td>
                    <td className="num mono">{euro(p.low)}</td>
                    <td className="num mono">{euro(p.expected)}</td>
                    <td className="num mono">{euro(p.high)}</td>
                  </tr>
                );
              })}
              <tr>
                <td colSpan={3}>
                  <strong>Summe</strong>
                </td>
                <td className="num mono">
                  <strong>{euro(r.restaurierungLow)}</strong>
                </td>
                <td className="num mono">
                  <strong>{euro(r.restaurierungExpected)}</strong>
                </td>
                <td className="num mono">
                  <strong>{euro(r.restaurierungHigh)}</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Karte>
    </div>
  );
}

/* ==========================================================================
 * Marktentwicklung des Modells
 * ======================================================================= */

function Marktbereich({ analyse }: { analyse: Fahrzeuganalyse }) {
  if (!analyse.reihe || !analyse.momentum) {
    return (
      <Karte titel="Marktentwicklung" beurteilung>
        <Leerzustand
          titel="Keine Marktreihe verfügbar"
          text="Für dieses Modell liegt keine beobachtete Preisreihe vor. Asset Score und Marktwert stützen sich auf Katalogparameter."
        />
      </Karte>
    );
  }

  const reihe = analyse.reihe;
  const m = analyse.momentum;

  return (
    <div className="stack stack--lg">
      <Karte
        titel={`Market Momentum — ${reihe.variante.label}`}
        untertitel="Abschnitt 18 — erkennt Modelle, deren Markt gerade beginnt anzuziehen"
        beurteilung
      >
        <Scorebalken label={m.einordnung} score={m.score} />
        <div className="kpi-grid" style={{ marginTop: 'var(--sp-5)' }}>
          <Kennzahl
            label="Medianpreis (12 Monate)"
            wert={prozent(m.kennzahlen.medianpreisProzent)}
          />
          <Kennzahl
            label="Angebotsmenge"
            wert={prozent(m.kennzahlen.angebotsmengeProzent)}
          />
          <Kennzahl label="Standzeit" wert={prozent(m.kennzahlen.standzeitProzent)} />
          <Kennzahl
            label="Spreizung zum Bestzustand"
            wert={`${((m.kennzahlen.spreizungAlt - 1) * 100).toFixed(0)} % → ${((m.kennzahlen.spreizungNeu - 1) * 100).toFixed(0)} %`}
            hinweis="Wächst der Abstand, beginnt der Markt Qualität zu bezahlen."
          />
        </div>
        <div style={{ marginTop: 'var(--sp-5)' }}>
          <Beitragsliste score={m.score} />
        </div>
      </Karte>

      <div className="raster raster--2">
        <Karte titel="Medianpreis" untertitel="24 Monate">
          <Verlaufskurve
            werte={reihe.monate.map((x) => x.medianPreis)}
            beschriftung={`${euro(reihe.monate[0].medianPreis)} (${reihe.monate[0].monat}) → ${euro(
              reihe.monate[reihe.monate.length - 1].medianPreis,
            )} (${reihe.monate[reihe.monate.length - 1].monat})`}
          />
        </Karte>
        <Karte titel="Angebotsmenge" untertitel="24 Monate">
          <Verlaufskurve
            werte={reihe.monate.map((x) => x.angebote)}
            beschriftung={`${reihe.monate[0].angebote} → ${reihe.monate[reihe.monate.length - 1].angebote} gleichzeitige Angebote`}
          />
        </Karte>
      </div>

      <Karte titel="Preis nach Kilometerklasse" untertitel="Abschnitt 17">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Klasse</th>
                <th className="num">Medianpreis</th>
                <th className="num">Fahrzeuge</th>
                <th>Dieses Fahrzeug</th>
              </tr>
            </thead>
            <tbody>
              {reihe.nachKilometerklasse.map((k) => {
                const km = analyse.aktuell.kilometerstand;
                const trifft =
                  km !== null && km >= k.von && (k.bis === null || km < k.bis);
                return (
                  <tr key={k.label}>
                    <td>{k.label}</td>
                    <td className="num mono">{euro(k.medianPreis)}</td>
                    <td className="num mono">{k.anzahl}</td>
                    <td>{trifft && <Marke ton="brand">liegt hier</Marke>}</td>
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

/* ==========================================================================
 * Notizen und Nutzerbefunde
 * ======================================================================= */

function Notizen({ analyse }: { analyse: Fahrzeuganalyse }) {
  const { state, dispatch } = useStore();
  const fahrzeug = state.bestand.fahrzeuge.find((f) => f.id === analyse.fahrzeugId);
  const [text, setText] = useState('');
  const [feld, setFeld] = useState('unfallangabe');
  const [nutzerwert, setNutzerwert] = useState('');
  const [beleg, setBeleg] = useState('');

  const notizen = [
    ...(fahrzeug?.notizen ?? []),
    ...(state.arbeit.notizen[analyse.fahrzeugId] ?? []),
  ].sort((a, b) => Date.parse(b.zeitpunkt) - Date.parse(a.zeitpunkt));

  const befunde = [
    ...(fahrzeug?.nutzerbefunde ?? []),
    ...(state.arbeit.befunde[analyse.fahrzeugId] ?? []),
  ].sort((a, b) => Date.parse(b.zeitpunkt) - Date.parse(a.zeitpunkt));

  const systemwert = String(
    (analyse.aktuell as unknown as Record<string, unknown>)[feld] ?? '—',
  );

  return (
    <div className="stack stack--lg">
      <Karte titel="Notizen">
        <div className="stack">
          <label className="field">
            <span className="field__label">Neue Notiz</span>
            <textarea
              className="textarea"
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Beobachtung, Telefonat, Zwischenstand …"
            />
          </label>
          <div>
            <button
              type="button"
              className="btn btn--primary"
              disabled={text.trim().length === 0}
              onClick={() => {
                dispatch({ typ: 'notiz', fahrzeugId: analyse.fahrzeugId, text: text.trim() });
                setText('');
              }}
            >
              Notiz speichern
            </button>
          </div>
        </div>

        {notizen.length === 0 ? (
          <p className="subtle" style={{ marginTop: 'var(--sp-4)' }}>
            Noch keine Notizen.
          </p>
        ) : (
          <ul className="zeitleiste" style={{ marginTop: 'var(--sp-4)' }}>
            {notizen.map((n) => (
              <li key={n.id} className="zeitleiste__eintrag">
                <span className="zeitleiste__zeit">{datum(n.zeitpunkt)}</span>
                <span>
                  <span className="zeitleiste__art">{n.verfasser}</span>
                  <div className="zeitleiste__wert">{n.text}</div>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Karte>

      <Karte
        titel="Nutzerbefund (Ground Truth)"
        untertitel="Abschnitt 40 — Korrekturen werden getrennt von abgeleiteten Informationen gespeichert und überschreiben sie nicht"
        beurteilung
      >
        <div className="filterleiste">
          <label className="field">
            <span className="field__label">Feld</span>
            <select className="select" value={feld} onChange={(e) => setFeld(e.target.value)}>
              <option value="unfallangabe">Unfallangabe</option>
              <option value="kilometerstand">Kilometerstand</option>
              <option value="servicehistorie">Servicehistorie</option>
              <option value="vorbesitzer">Vorbesitzer</option>
              <option value="vin">Fahrgestellnummer</option>
            </select>
          </label>
          <label className="field">
            <span className="field__label">Angabe des Systems</span>
            <input className="input" value={systemwert} readOnly />
          </label>
          <label className="field">
            <span className="field__label">Tatsächlicher Befund</span>
            <input
              className="input"
              value={nutzerwert}
              onChange={(e) => setNutzerwert(e.target.value)}
              placeholder="z. B. vorschaden-repariert"
            />
          </label>
          <label className="field">
            <span className="field__label">Beleg</span>
            <input
              className="input"
              value={beleg}
              onChange={(e) => setBeleg(e.target.value)}
              placeholder="Woher stammt der Befund?"
            />
          </label>
        </div>
        <div style={{ marginTop: 'var(--sp-4)' }}>
          <button
            type="button"
            className="btn btn--primary"
            disabled={nutzerwert.trim().length === 0}
            onClick={() => {
              dispatch({
                typ: 'befund',
                fahrzeugId: analyse.fahrzeugId,
                feld,
                system: systemwert,
                nutzer: nutzerwert.trim(),
                beleg: beleg.trim(),
              });
              setNutzerwert('');
              setBeleg('');
            }}
          >
            Befund erfassen
          </button>
        </div>

        {befunde.length > 0 && (
          <div className="table-wrap" style={{ marginTop: 'var(--sp-5)' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Zeitpunkt</th>
                  <th>Feld</th>
                  <th>System</th>
                  <th>Nutzerbefund</th>
                  <th>Beleg</th>
                </tr>
              </thead>
              <tbody>
                {befunde.map((b) => (
                  <tr key={b.id}>
                    <td className="mono nowrap">{datum(b.zeitpunkt)}</td>
                    <td>{b.feld}</td>
                    <td className="subtle">{b.behauptungSystem}</td>
                    <td>
                      <strong>{b.befundNutzer}</strong>
                    </td>
                    <td style={{ fontSize: 'var(--fs-xs)' }}>{b.beleg ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Karte>
    </div>
  );
}

/* ==========================================================================
 * Prüfbericht
 * ======================================================================= */

function Bericht({ analyse }: { analyse: Fahrzeuganalyse }) {
  const a = analyse;
  return (
    <div className="stack stack--lg">
      <Karte
        titel="Prüfbericht"
        untertitel="Abschnitt 44 — Fahrzeugidentifikation, Angebotsanalyse, Marktbewertung, Historie, Scores, Red Flags, technische Prüfung, Restaurationsbedarf, Kaufempfehlung"
        aktion={
          <button type="button" className="btn btn--primary btn--sm" onClick={() => window.print()}>
            Drucken / als PDF sichern
          </button>
        }
      >
        <section className="stack">
          <h3 className="section-title">1 Fahrzeugidentifikation</h3>
          <dl className="definitionsliste">
            <dt>Fahrzeug</dt>
            <dd>{a.bezeichnung}</dd>
            <dt>Inseratstitel</dt>
            <dd>{a.aktuell.titel}</dd>
            <dt>Fahrgestellnummer</dt>
            <dd className="mono">{a.aktuell.vin ?? 'nicht angegeben'}</dd>
            <dt>Erstzulassung</dt>
            <dd>{monat(a.aktuell.erstzulassung)}</dd>
            <dt>Kilometerstand</dt>
            <dd>{kilometer(a.aktuell.kilometerstand)}</dd>
            <dt>Quelle</dt>
            <dd>
              {plattformName(a.hauptinserat.plattformId)} · {a.hauptinserat.externeId}
            </dd>
          </dl>

          <h3 className="section-title">2 Angebotsanalyse</h3>
          <p>
            Offer Integrity Score {a.integritaet.wert} von 100 ({a.integritaet.einstufung}).
            Evidence Score {a.evidenz.score.wert} von 100. Das Angebot wird seit{' '}
            {a.angebotsdauerTage} Tagen beobachtet, es liegen{' '}
            {a.historie.anzahlBeobachtungen} Beobachtungen aus {a.historie.anzahlInserate}{' '}
            Inserat(en) auf {a.historie.plattformen} Plattform(en) vor.
          </p>

          <h3 className="section-title">3 Marktbewertung</h3>
          {a.bewertung.fairValue > 0 ? (
            <p>
              Angebotspreis {euro(a.aktuell.preis)}, Fair Market Value{' '}
              {euro(a.bewertung.fairValue)} (Konfidenzintervall{' '}
              {euro(a.bewertung.intervall[0])} – {euro(a.bewertung.intervall[1])}),
              Abweichung <Abweichung prozentwert={a.bewertung.abweichungProzent} />.
              Marktliquidität {a.bewertung.liquiditaet}, erwartete Standzeit{' '}
              {a.bewertung.standzeitTage} Tage. {a.bewertung.ankerherkunft}
            </p>
          ) : (
            <p>Kein Marktwert ausgewiesen: {a.bewertung.hinweise.join(' ')}</p>
          )}

          <h3 className="section-title">4 Historie</h3>
          {a.aenderungen.length === 0 ? (
            <p>Im Beobachtungszeitraum keine Änderungen festgestellt.</p>
          ) : (
            <ul>
              {a.aenderungen.slice(0, 12).map((x, i) => (
                <li key={i}>
                  {datum(x.zeitpunkt)} — {x.bezeichnung}: {x.vorher ?? '—'} → {x.nachher ?? '—'}
                </li>
              ))}
            </ul>
          )}

          <h3 className="section-title">5 Scores</h3>
          <div className="table-wrap">
            <table className="table">
              <tbody>
                <tr>
                  <td>Offer Integrity</td>
                  <td className="num mono">{a.integritaet.wert}</td>
                  <td>{a.integritaet.einstufung}</td>
                </tr>
                <tr>
                  <td>Evidence</td>
                  <td className="num mono">{a.evidenz.score.wert}</td>
                  <td>{a.evidenz.score.einstufung}</td>
                </tr>
                <tr>
                  <td>Automotive Asset</td>
                  <td className="num mono">{a.asset.score.wert}</td>
                  <td>{a.asset.score.einstufung}</td>
                </tr>
                <tr>
                  <td>Individual Vehicle Quality</td>
                  <td className="num mono">{a.qualitaet.wert}</td>
                  <td>{a.qualitaet.einstufung}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Gesamtbewertung</strong>
                  </td>
                  <td className="num mono">
                    <strong>{a.gesamt.wert}</strong>
                  </td>
                  <td>
                    <strong>Rang {a.gesamt.rang}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="section-title">6 Red Flags</h3>
          {a.redFlags.length === 0 ? (
            <p>Keine Auffälligkeiten festgestellt.</p>
          ) : (
            <ul>
              {a.redFlags.map((f) => (
                <li key={f.id}>
                  <strong>
                    [{f.schweregrad}] {f.titel}
                  </strong>{' '}
                  — {f.begruendung} <em>Empfehlung: {f.empfehlung}</em>
                </li>
              ))}
            </ul>
          )}

          <h3 className="section-title">7 Technische Prüfung</h3>
          <p>
            {a.pruefpunkte.length} Prüfpunkte, davon{' '}
            {a.pruefpunkte.filter((p) => p.pflicht).length} Pflichtpunkte.
            {a.risiken.kritischOffen.length > 0
              ? ` Kritisch und unbelegt: ${a.risiken.kritischOffen.map((r) => r.risiko.bezeichnung).join(', ')}.`
              : ' Keine kritischen Risiken offen.'}
          </p>

          <h3 className="section-title">8 Restaurationsbedarf</h3>
          <p>
            Erwarteter offener Instandsetzungsbedarf{' '}
            {euro(Math.round(a.risiken.offenerBedarf))}. Gesamtinvestment bei
            Aufarbeitung {euro(a.restauration.gesamtinvestmentExpected)}, Marktwert danach{' '}
            {euro(a.restauration.marktwertNachher)}, Investment Ratio{' '}
            {a.restauration.investmentRatio.toFixed(2)}. {a.restauration.bewertung}
          </p>

          <h3 className="section-title">9 Kaufempfehlung</h3>
          <p>
            <strong>
              {a.buySignal.ausgeloest
                ? 'INGTEC BUY SIGNAL — alle Mindestbedingungen erfüllt.'
                : `Kein Buy Signal. Offen: ${a.buySignal.bedingungen
                    .filter((b) => !b.erfuellt)
                    .map((b) => `${b.label} (${b.ist} statt ${b.soll})`)
                    .join('; ')}.`}
            </strong>
          </p>
          <p>{a.buySignal.naechsteHandlung}</p>

          <p className="hinweis-kasten" style={{ marginTop: 'var(--sp-5)' }}>
            Dieser Bericht ist eine Entscheidungsunterstützung und ersetzt weder eine
            Besichtigung noch ein Gutachten im rechtlichen Sinn (PRD Abschnitt 4). Die
            Bewertung beruht auf den zum{' '}
            {datum(a.hauptinserat.zuletztGesehen)} beobachteten Angaben.
          </p>
        </section>
      </Karte>
    </div>
  );
}
