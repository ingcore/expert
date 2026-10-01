/**
 * Ansicht 6 — Prüfergebnis und Benützungsentscheidung (PRD Abschnitt 21).
 *
 * Nach Abschluss aller Prüfpunkte legt der Prüfer den Ergebniszustand
 * **ausdrücklich** fest. Die Anwendung leitet ihn nicht aus der Mängelanzahl
 * ab (PRD 8, Schritt 7). Zur Auswahl stehen ausschließlich die Zustände, die
 * die gewählte Prüfart kennt.
 */

import {
  Karte,
  LeerZustand,
  Schalter,
  TextBereich,
  TextFeld,
} from '@/components/ui';
import { LEGAL_RESULTS, type LegalResult } from '@/pruefbefund/domain/enums';
import { checklistenStand } from '@/pruefbefund/domain/checklist';
import { pruefart } from '@/pruefbefund/domain/legal/pruefart';
import { validiere } from '@/pruefbefund/domain/validierung';
import {
  usePruefbefund,
  usePruefungKontext,
  usePruefungPatch,
} from '@/pruefbefund/state/store';

export function Ergebnis() {
  const { aktivePruefung } = usePruefbefund();
  const patch = usePruefungPatch();
  const { asset, inspector } = usePruefungKontext(aktivePruefung);

  if (!aktivePruefung || !asset) {
    return <LeerZustand titel="Keine Prüfung geöffnet" />;
  }

  const art = pruefart(aktivePruefung.pruefart);
  const stand = checklistenStand(aktivePruefung.items);
  const maengel = aktivePruefung.findings.filter((f) => f.typ === 'DEFECT');
  const validierung = validiere({ inspection: aktivePruefung, asset, inspector });
  const sechsDrei = aktivePruefung.ergebnis === 'DEFECTS_USE_ALLOWED_6_3';

  return (
    <div className="stack stack--lg">
      <div className="page-head">
        <h1 className="page-head__title">Prüfergebnis</h1>
        <p className="page-head__lead">
          {art.titelzeile} · {stand.beurteilt}/{stand.gesamt} Prüfpunkte beurteilt ·{' '}
          {maengel.length} Mangel/Mängel
        </p>
      </div>

      {!stand.vollstaendig && (
        <div className="hinweis-box hinweis-box--warn">
          Es sind noch {stand.offen} Prüfpunkte offen. Der Ergebniszustand ist
          erst nach Abschluss aller Prüfpunkte zu setzen.
        </div>
      )}

      {/* ---- Ergebniszustand -------------------------------------------- */}
      <Karte
        titel="Benützungsentscheidung"
        untertitel={`Zulässige Zustände der Prüfart „${art.titelzeile}".`}
      >
        <div className="stack stack--sm">
          {art.erlaubteErgebnisse.map((code) => (
            <ErgebnisOption
              key={code}
              code={code}
              aktiv={aktivePruefung.ergebnis === code}
              gesperrt={
                LEGAL_RESULTS[code].setztMangelVoraus && maengel.length === 0
              }
              onWaehlen={() => patch({ ergebnis: code })}
            />
          ))}
        </div>

        {/* § 6 Abs. 3 fehlt bei der Abnahmeprüfung vollständig — er wird
            nicht gesperrt dargestellt, sondern existiert dort nicht. */}
        {!art.wiederkehrend && (
          <p className="muted" style={{ marginTop: 'var(--sp-4)' }}>
            Für eine Abnahmeprüfung gemäß § 7 AM-VO besteht keine Auswahl
            „Weiterbenützung gemäß § 6 Abs. 3". Die Ausnahme gilt ausschließlich
            für wiederkehrende Prüfungen.
          </p>
        )}
      </Karte>

      {/* ---- § 6 Abs. 3 AM-VO -------------------------------------------- */}
      {sechsDrei && (
        <Karte
          titel="Weiterbenützung gemäß § 6 Abs. 3 AM-VO"
          untertitel="Sämtliche Felder sind Pflichtangaben."
        >
          <div className="form-grid form-grid--2">
            <TextBereich
              label="Begründung des Prüfers"
              className="span-full"
              rows={3}
              wert={aktivePruefung.weiterbenuetzung.begruendung}
              onChange={(v) =>
                patch({
                  weiterbenuetzung: {
                    ...aktivePruefung.weiterbenuetzung,
                    begruendung: v,
                  },
                })
              }
            />
            <TextBereich
              label="Bedingungen und Einschränkungen"
              className="span-full"
              rows={3}
              wert={aktivePruefung.weiterbenuetzung.bedingungen}
              onChange={(v) =>
                patch({
                  weiterbenuetzung: {
                    ...aktivePruefung.weiterbenuetzung,
                    bedingungen: v,
                  },
                })
              }
              hint="Dieser Text erscheint wörtlich im Prüfbefund."
            />
            <TextFeld
              label="Spätester Behebungstermin"
              type="date"
              wert={aktivePruefung.weiterbenuetzung.behebungBis ?? ''}
              onChange={(v) =>
                patch({
                  weiterbenuetzung: {
                    ...aktivePruefung.weiterbenuetzung,
                    behebungBis: v || null,
                  },
                })
              }
            />
            <TextFeld
              label="Verantwortliche Person des Betreibers"
              wert={aktivePruefung.weiterbenuetzung.verantwortlichBetreiber}
              onChange={(v) =>
                patch({
                  weiterbenuetzung: {
                    ...aktivePruefung.weiterbenuetzung,
                    verantwortlichBetreiber: v,
                  },
                })
              }
            />
          </div>

          <div style={{ marginTop: 'var(--sp-5)' }}>
            <h3 className="section-title">Betroffene Mängel</h3>
            {maengel.length === 0 ? (
              <p className="muted">Kein Mangel erfasst.</p>
            ) : (
              <div className="stack stack--sm" style={{ marginTop: 'var(--sp-3)' }}>
                {maengel.map((m) => (
                  <Schalter
                    key={m.id}
                    label={`${m.nummer}. ${m.beschreibung || 'ohne Beschreibung'}`}
                    wert={aktivePruefung.weiterbenuetzung.betroffeneMaengel.includes(
                      m.id,
                    )}
                    onChange={(an) =>
                      patch({
                        weiterbenuetzung: {
                          ...aktivePruefung.weiterbenuetzung,
                          betroffeneMaengel: an
                            ? [
                                ...aktivePruefung.weiterbenuetzung.betroffeneMaengel,
                                m.id,
                              ]
                            : aktivePruefung.weiterbenuetzung.betroffeneMaengel.filter(
                                (x) => x !== m.id,
                              ),
                        },
                      })
                    }
                  />
                ))}
              </div>
            )}
          </div>

          <div style={{ marginTop: 'var(--sp-6)' }}>
            <h3 className="section-title">
              Information der Arbeitnehmer:innen (§ 6 Abs. 3 Z 2 AM-VO)
            </h3>
            <p className="field__hint" style={{ margin: 'var(--sp-2) 0 var(--sp-4)' }}>
              Ohne diese Bestätigung wird der Workflow nicht als vollständig
              abgeschlossen dargestellt.
            </p>
            <div className="form-grid form-grid--2">
              <TextFeld
                label="Name"
                wert={aktivePruefung.bestaetigungBetreiber.name}
                onChange={(v) =>
                  patch({
                    bestaetigungBetreiber: {
                      ...aktivePruefung.bestaetigungBetreiber,
                      name: v,
                    },
                  })
                }
              />
              <TextFeld
                label="Funktion"
                wert={aktivePruefung.bestaetigungBetreiber.funktion}
                onChange={(v) =>
                  patch({
                    bestaetigungBetreiber: {
                      ...aktivePruefung.bestaetigungBetreiber,
                      funktion: v,
                    },
                  })
                }
              />
              <TextFeld
                label="Datum"
                type="date"
                wert={aktivePruefung.bestaetigungBetreiber.datum ?? ''}
                onChange={(v) =>
                  patch({
                    bestaetigungBetreiber: {
                      ...aktivePruefung.bestaetigungBetreiber,
                      datum: v || null,
                    },
                  })
                }
              />
            </div>
            <div style={{ marginTop: 'var(--sp-4)' }}>
              <Schalter
                label="Information der betroffenen Arbeitnehmer:innen bestätigt"
                wert={aktivePruefung.bestaetigungBetreiber.bestaetigt}
                onChange={(v) =>
                  patch({
                    bestaetigungBetreiber: {
                      ...aktivePruefung.bestaetigungBetreiber,
                      bestaetigt: v,
                    },
                  })
                }
              />
            </div>
          </div>
        </Karte>
      )}

      {/* ---- Prüfmeldungen ----------------------------------------------- */}
      <Karte
        titel="Prüfmeldungen"
        untertitel="Validierung vor der Befunderzeugung"
      >
        {validierung.meldungen.length === 0 ? (
          <p className="muted">Keine Beanstandungen.</p>
        ) : (
          <div className="stack stack--sm">
            {validierung.meldungen.map((meldung, i) => (
              <div
                key={`${meldung.code}-${i}`}
                className={`befund befund--${
                  meldung.schwere === 'BLOCKER'
                    ? 'fehler'
                    : meldung.schwere === 'NICHT_FINAL'
                      ? 'warnung'
                      : 'hinweis'
                }`}
              >
                <div className="befund__marke" aria-hidden="true">
                  {meldung.schwere === 'BLOCKER' ? '✕' : '▲'}
                </div>
                <div>
                  <div className="befund__titel">
                    {meldung.code} ·{' '}
                    {meldung.schwere === 'BLOCKER'
                      ? 'blockiert die Befunderzeugung'
                      : meldung.schwere === 'NICHT_FINAL'
                        ? 'verhindert den Abschluss'
                        : 'Warnung'}
                  </div>
                  <div className="befund__text">{meldung.text}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Karte>
    </div>
  );
}

function ErgebnisOption({
  code,
  aktiv,
  gesperrt,
  onWaehlen,
}: {
  code: LegalResult;
  aktiv: boolean;
  gesperrt: boolean;
  onWaehlen: () => void;
}) {
  const def = LEGAL_RESULTS[code];
  return (
    <button
      type="button"
      className={`card ${aktiv ? 'card--beurteilung' : ''}`}
      onClick={onWaehlen}
      disabled={gesperrt}
      aria-pressed={aktiv}
      style={{
        textAlign: 'left',
        padding: 'var(--sp-4) var(--sp-5)',
        cursor: gesperrt ? 'not-allowed' : 'pointer',
        opacity: gesperrt ? 0.45 : 1,
        borderColor: aktiv ? 'var(--ing-green)' : undefined,
        borderWidth: aktiv ? 2 : undefined,
      }}
    >
      <div className="row row--between row--wrap">
        <div style={{ minWidth: 0 }}>
          <strong>{def.befundzeile}</strong>
          <div className="subtle">{def.bedeutung}</div>
        </div>
        <span className="badge">{def.weiterbenuetzung}</span>
      </div>
      {gesperrt && (
        <div className="subtle" style={{ marginTop: 'var(--sp-2)' }}>
          setzt mindestens einen erfassten Mangel voraus
        </div>
      )}
    </button>
  );
}
