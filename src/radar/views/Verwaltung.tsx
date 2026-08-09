/**
 * Verwaltung — PRD Abschnitte 24, 37 und 38.
 *
 * Abschnitt 37 weist Administratoren ausdrücklich die Verwaltung von Quellen,
 * Scoregewichtungen und Systemparametern zu; Abschnitt 24 verlangt, dass die
 * steuerlichen Parameter des Firmenwagenmodus **nicht** im Programmcode
 * stehen. Beides ist hier eingelöst: Jede Zahl, die eine Bewertung beeinflusst,
 * ist auf dieser Seite änderbar, und jede Änderung wirkt sofort auf alle
 * Analysen — sichtbar, nicht versteckt.
 *
 * Abschnitt 38 (Score Governance) ist der Grund für den Erklärungsblock am
 * Ende: Wer Gewichte ändern darf, muss auch sehen, was die Scores überhaupt
 * tun und wo Künstliche Intelligenz eingesetzt wird und wo nicht.
 */

import { useStore } from '../state/store';
import {
  ASSET_GEWICHTE,
  EVIDENZ_LABEL,
  INTEGRITAET_LABEL,
  MOMENTUM_LABEL,
  QUALITAET_LABEL,
  type EvidenzKomponente,
  type IntegritaetKomponente,
  type MomentumKomponente,
  type QualitaetKriterium,
  type Systemparameter,
} from '../engine/gewichte';
import { ASSET_KRITERIUM_LABEL, type AssetKriterium } from '../wissen/modelle';
import { Karte, Kennzahl, Marke, Seitenkopf } from '../components/ui';

export function Verwaltungsseite() {
  const { state, dispatch, benutzer, aktiverBenutzer, analysen } = useStore();
  const p = state.arbeit.parameter;

  function setze(neu: Systemparameter) {
    dispatch({ typ: 'parameter', parameter: neu });
  }

  const darfAendern = aktiverBenutzer.rolle === 'administrator';

  return (
    <>
      <Seitenkopf
        titel="Verwaltung"
        lead="Score-Gewichtungen, Schwellen und Firmenwagenparameter. Jede Änderung wirkt sofort auf alle Bewertungen."
        aktion={
          <button
            type="button"
            className="btn"
            disabled={!darfAendern}
            onClick={() => dispatch({ typ: 'parameter-zuruecksetzen' })}
          >
            Auf Vorgabe zurücksetzen
          </button>
        }
      />

      <div className="stack stack--lg">
        <Karte
          titel="Rolle und Zugriff"
          untertitel="Abschnitt 37 — Management erhält Entscheidungsinformationen, Techniker Prüfdetails, Administratoren die Systemparameter"
        >
          <div className="row row--wrap" style={{ gap: 'var(--sp-2)' }}>
            {benutzer.map((b) => (
              <button
                key={b.id}
                type="button"
                className={`btn btn--sm ${b.id === aktiverBenutzer.id ? 'btn--primary' : ''}`}
                onClick={() => dispatch({ typ: 'benutzer', id: b.id })}
              >
                {b.name} · {b.rolle}
              </button>
            ))}
          </div>
          {!darfAendern && (
            <p className="hinweis-kasten hinweis-kasten--warn" style={{ marginTop: 'var(--sp-4)' }}>
              Die aktuelle Rolle „{aktiverBenutzer.rolle}“ darf Systemparameter einsehen,
              aber nicht ändern. Wechseln Sie auf eine Administratorrolle, um die Gewichte
              zu bearbeiten.
            </p>
          )}
        </Karte>

        <Karte
          titel="INGTEC Firmenwagenmodus"
          untertitel="Abschnitt 24 — diese Parameter dürfen ausdrücklich nicht im Programmcode stehen"
          beurteilung
        >
          <div className="filterleiste">
            <Zahlfeld
              label="Anschaffungspreis maximal (€)"
              wert={p.firmenwagen.anschaffungspreisMax}
              deaktiviert={!darfAendern}
              onChange={(v) =>
                setze({ ...p, firmenwagen: { ...p.firmenwagen, anschaffungspreisMax: v } })
              }
            />
            <Zahlfeld
              label="Mindestalter (Monate)"
              wert={p.firmenwagen.mindestalterMonate}
              deaktiviert={!darfAendern}
              onChange={(v) =>
                setze({ ...p, firmenwagen: { ...p.firmenwagen, mindestalterMonate: v } })
              }
            />
            <Zahlfeld
              label="Asset Score mindestens"
              wert={p.firmenwagen.assetMin}
              deaktiviert={!darfAendern}
              onChange={(v) => setze({ ...p, firmenwagen: { ...p.firmenwagen, assetMin: v } })}
            />
            <Zahlfeld
              label="Integrity Score mindestens"
              wert={p.firmenwagen.integrityMin}
              deaktiviert={!darfAendern}
              onChange={(v) =>
                setze({ ...p, firmenwagen: { ...p.firmenwagen, integrityMin: v } })
              }
            />
            <Zahlfeld
              label="Betriebliche Nutzbarkeit mindestens"
              wert={p.firmenwagen.nutzbarkeitMin}
              deaktiviert={!darfAendern}
              onChange={(v) =>
                setze({ ...p, firmenwagen: { ...p.firmenwagen, nutzbarkeitMin: v } })
              }
            />
          </div>
          <label className="field" style={{ marginTop: 'var(--sp-4)' }}>
            <span className="field__label">Steuerlicher Prüfhinweis (erscheint auf jeder Fahrzeugakte)</span>
            <textarea
              className="textarea"
              rows={3}
              disabled={!darfAendern}
              value={p.firmenwagen.steuerhinweis}
              onChange={(e) =>
                setze({ ...p, firmenwagen: { ...p.firmenwagen, steuerhinweis: e.target.value } })
              }
            />
          </label>
          <p className="hinweis-kasten" style={{ marginTop: 'var(--sp-4)' }}>
            Derzeit erfüllen{' '}
            <strong>{analysen.filter((a) => a.firmenwagen.geeignet).length}</strong> von{' '}
            {analysen.length} Fahrzeugen alle Kriterien.
          </p>
        </Karte>

        <Karte
          titel="Buy Signal"
          untertitel="Abschnitt 28 — Mindestbedingungen; alle müssen erfüllt sein"
          beurteilung
        >
          <div className="filterleiste">
            <Zahlfeld
              label="Integrity mindestens"
              wert={p.buySignal.integrityMin}
              deaktiviert={!darfAendern}
              onChange={(v) => setze({ ...p, buySignal: { ...p.buySignal, integrityMin: v } })}
            />
            <Zahlfeld
              label="Evidence mindestens"
              wert={p.buySignal.evidenceMin}
              deaktiviert={!darfAendern}
              onChange={(v) => setze({ ...p, buySignal: { ...p.buySignal, evidenceMin: v } })}
            />
            <Zahlfeld
              label="Asset mindestens"
              wert={p.buySignal.assetMin}
              deaktiviert={!darfAendern}
              onChange={(v) => setze({ ...p, buySignal: { ...p.buySignal, assetMin: v } })}
            />
            <Zahlfeld
              label="Quality mindestens"
              wert={p.buySignal.qualitaetMin}
              deaktiviert={!darfAendern}
              onChange={(v) => setze({ ...p, buySignal: { ...p.buySignal, qualitaetMin: v } })}
            />
            <Zahlfeld
              label="Preisabweichung höchstens (%)"
              wert={p.buySignal.preisabweichungMax}
              deaktiviert={!darfAendern}
              onChange={(v) =>
                setze({ ...p, buySignal: { ...p.buySignal, preisabweichungMax: v } })
              }
            />
            <Zahlfeld
              label="Kritische Red Flags erlaubt"
              wert={p.buySignal.kritischeRedFlagsErlaubt}
              deaktiviert={!darfAendern}
              onChange={(v) =>
                setze({ ...p, buySignal: { ...p.buySignal, kritischeRedFlagsErlaubt: v } })
              }
            />
          </div>
          <div className="kpi-grid" style={{ marginTop: 'var(--sp-4)' }}>
            <Kennzahl
              label="Aktuell ausgelöste Buy Signals"
              wert={analysen.filter((a) => a.buySignal.ausgeloest).length}
              beurteilung
            />
          </div>
        </Karte>

        <Karte
          titel="Kandidatenränge und Alerts"
          untertitel="Abschnitte 27 und 46"
        >
          <div className="filterleiste">
            <Zahlfeld
              label="Rang A ab"
              wert={p.rang.a}
              deaktiviert={!darfAendern}
              onChange={(v) => setze({ ...p, rang: { ...p.rang, a: v } })}
            />
            <Zahlfeld
              label="Rang B ab"
              wert={p.rang.b}
              deaktiviert={!darfAendern}
              onChange={(v) => setze({ ...p, rang: { ...p.rang, b: v } })}
            />
            <Zahlfeld
              label="Rang C ab"
              wert={p.rang.c}
              deaktiviert={!darfAendern}
              onChange={(v) => setze({ ...p, rang: { ...p.rang, c: v } })}
            />
            <Zahlfeld
              label="Preisreduktion meldet ab (%)"
              wert={p.alerts.preisreduktionProzent}
              deaktiviert={!darfAendern}
              onChange={(v) =>
                setze({ ...p, alerts: { ...p.alerts, preisreduktionProzent: v } })
              }
            />
            <Zahlfeld
              label="Entprellung (Tage)"
              wert={p.alerts.entprellungTage}
              deaktiviert={!darfAendern}
              onChange={(v) => setze({ ...p, alerts: { ...p.alerts, entprellungTage: v } })}
            />
          </div>
          <div className="row row--wrap" style={{ gap: 'var(--sp-3)', marginTop: 'var(--sp-4)' }}>
            {(['A', 'B', 'C', 'D'] as const).map((r) => (
              <Marke key={r}>
                Rang {r}: {analysen.filter((a) => a.gesamt.rang === r).length} Fahrzeuge
              </Marke>
            ))}
          </div>
        </Karte>

        <Karte
          titel="Vehicle Identity Engine"
          untertitel="Abschnitt 10 — Schwellen für automatische Zuordnung und manuelle Prüfung"
          beurteilung
        >
          <div className="filterleiste">
            <Zahlfeld
              label="Automatische Zuordnung ab (%)"
              wert={p.identitaet.schwelleAutomatisch}
              deaktiviert={!darfAendern}
              onChange={(v) =>
                setze({ ...p, identitaet: { ...p.identitaet, schwelleAutomatisch: v } })
              }
            />
            <Zahlfeld
              label="Manuelle Prüfung ab (%)"
              wert={p.identitaet.schwelleManuell}
              deaktiviert={!darfAendern}
              onChange={(v) =>
                setze({ ...p, identitaet: { ...p.identitaet, schwelleManuell: v } })
              }
            />
            <Zahlfeld
              label="Bild-Hash-Schwelle (Hamming)"
              wert={p.identitaet.bildHashSchwelle}
              deaktiviert={!darfAendern}
              onChange={(v) =>
                setze({ ...p, identitaet: { ...p.identitaet, bildHashSchwelle: v } })
              }
            />
          </div>
          <p className="hinweis-kasten hinweis-kasten--warn" style={{ marginTop: 'var(--sp-4)' }}>
            Die Schwellen wirken beim Aufbau des Bestandes. Eine Änderung greift erst nach
            einem Neustart der Anwendung, weil die Zuordnung im Collector-Lauf entschieden
            und im Audit Trail festgehalten wird — eine nachträgliche Umwertung würde die
            Revisionsfähigkeit aus Abschnitt 35 aushebeln.
          </p>
        </Karte>

        <Gewichtskarte
          titel="Offer Integrity Score"
          untertitel="Abschnitt 12 — Beispielgewichtung des PRD als Vorgabe"
          gewichte={p.integritaet}
          labels={INTEGRITAET_LABEL}
          deaktiviert={!darfAendern}
          onChange={(neu) => setze({ ...p, integritaet: neu as Record<IntegritaetKomponente, number> })}
        />

        <Gewichtskarte
          titel="Evidence Score"
          untertitel="Abschnitt 13"
          gewichte={p.evidenz}
          labels={EVIDENZ_LABEL}
          deaktiviert={!darfAendern}
          onChange={(neu) => setze({ ...p, evidenz: neu as Record<EvidenzKomponente, number> })}
        />

        <Gewichtskarte
          titel="Automotive Asset Score"
          untertitel="Abschnitt 14 — sechzehn Kriterien"
          gewichte={p.asset}
          labels={ASSET_KRITERIUM_LABEL}
          deaktiviert={!darfAendern}
          onChange={(neu) => setze({ ...p, asset: neu as Record<AssetKriterium, number> })}
        />

        <Gewichtskarte
          titel="Individual Vehicle Quality Score"
          untertitel="Abschnitt 15 — dreizehn Kriterien"
          gewichte={p.qualitaet}
          labels={QUALITAET_LABEL}
          deaktiviert={!darfAendern}
          onChange={(neu) => setze({ ...p, qualitaet: neu as Record<QualitaetKriterium, number> })}
        />

        <Gewichtskarte
          titel="Market Momentum Score"
          untertitel="Abschnitt 18"
          gewichte={p.momentum}
          labels={MOMENTUM_LABEL}
          deaktiviert={!darfAendern}
          onChange={(neu) => setze({ ...p, momentum: neu as Record<MomentumKomponente, number> })}
        />

        <Karte
          titel="Score Governance"
          untertitel="Abschnitt 38 — was die Anwendung regelbasiert entscheidet und wo Künstliche Intelligenz eingesetzt wird"
          beurteilung
        >
          <dl className="definitionsliste">
            <dt>Bewertung</dt>
            <dd>
              Vollständig regelbasiert. Jeder Score ist die Liste seiner Beiträge; der
              Zahlenwert entsteht aus ihnen und kann nicht von ihnen abweichen.
            </dd>
            <dt>Eingangsdaten</dt>
            <dd>
              Normalisierte Inseratsfelder, Beobachtungshistorie, Wahrnehmungs-Hashes,
              hinterlegte Unterlagen, Modell- und Risikokatalog, Marktreihe.
            </dd>
            <dt>Gewichtungen</dt>
            <dd>Auf dieser Seite änderbar; auf 100 normiert, damit die Skala stabil bleibt.</dd>
            <dt>Rolle der KI</dt>
            <dd>
              Im Zielbild für Textanalyse, Bildanalyse, Dokumentklassifikation und
              semantische Interpretation — also für das Erzeugen von Eingangsdaten. In
              dieser Fassung sind Text- und Bildbefunde regelbasiert erzeugt; ein
              Sprachmodell ist an keiner Bewertung beteiligt.
            </dd>
            <dt>Nicht-Ziele</dt>
            <dd>
              Keine rechtsverbindliche Feststellung von Unfallfreiheit, Betrug oder
              Manipulation; kein Ersatz für Gutachten, Steuer- oder Rechtsberatung
              (Abschnitt 4).
            </dd>
          </dl>
        </Karte>
      </div>
    </>
  );
}

function Zahlfeld({
  label,
  wert,
  deaktiviert,
  onChange,
}: {
  label: string;
  wert: number;
  deaktiviert?: boolean;
  onChange: (wert: number) => void;
}) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <input
        className="input"
        type="number"
        value={wert}
        disabled={deaktiviert}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function Gewichtskarte<K extends string>({
  titel,
  untertitel,
  gewichte,
  labels,
  deaktiviert,
  onChange,
}: {
  titel: string;
  untertitel: string;
  gewichte: Record<K, number>;
  labels: Record<K, string>;
  deaktiviert?: boolean;
  onChange: (neu: Record<string, number>) => void;
}) {
  const schluessel = Object.keys(gewichte) as K[];
  const summe = schluessel.reduce((s, k) => s + gewichte[k], 0);

  return (
    <Karte
      titel={titel}
      untertitel={untertitel}
      aktion={
        <Marke ton={Math.abs(summe - 100) < 0.5 ? 'gut' : 'warn'}>
          Summe {summe.toFixed(0)} %
        </Marke>
      }
    >
      <div className="filterleiste">
        {schluessel.map((k) => (
          <Zahlfeld
            key={k}
            label={labels[k]}
            wert={gewichte[k]}
            deaktiviert={deaktiviert}
            onChange={(v) => onChange({ ...gewichte, [k]: v })}
          />
        ))}
      </div>
      {Math.abs(summe - 100) >= 0.5 && (
        <p className="hinweis-kasten" style={{ marginTop: 'var(--sp-4)' }}>
          Die Gewichte summieren sich nicht auf 100. Das ist zulässig — die Engine
          normiert vor der Berechnung, damit eine unbedachte Änderung die Skala nicht
          verschiebt.
        </p>
      )}
    </Karte>
  );
}

/** Wird nur für den Vergleich mit der Vorgabe benötigt. */
export const VORGABE_ASSET = ASSET_GEWICHTE;
