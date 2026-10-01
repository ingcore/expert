/**
 * Ansicht 3 — Neue Prüfung (PRD Abschnitt 21).
 *
 * Deckt die Schritte 2 bis 4 des Prüfworkflows ab: Prüfart bestimmen,
 * Prüfgrundlagen getrennt erfassen und bei wiederkehrenden Prüfungen
 * Änderungen und Vorkommnisse abfragen.
 */

import { useState } from 'react';
import {
  Abschnitt,
  Auswahl,
  Karte,
  LeerZustand,
  Schalter,
  TextBereich,
  TextFeld,
  ZeilenAktion,
} from '@/components/ui';
import {
  RULE_CATEGORY_LABEL,
  type InspectionTypeId,
  type RuleCategory,
} from '@/pruefbefund/domain/enums';
import { bauartLabel, familieLabel } from '@/pruefbefund/domain/families';
import { berechneIntervall, deutsch } from '@/pruefbefund/domain/intervall';
import {
  beurteilePflicht,
  PFLICHT_STATUS_LABEL,
} from '@/pruefbefund/domain/legal/applicability';
import { freigegebenePruefarten, pruefart } from '@/pruefbefund/domain/legal/pruefart';
import { TECHNISCHE_REGELN } from '@/pruefbefund/domain/legal/rules';
import { baueCheckliste } from '@/pruefbefund/domain/checklist';
import { id } from '@/pruefbefund/domain/factory';
import {
  hatVorkommnisse,
  type Pruefgrundlage,
  type Vorkommnisse,
} from '@/pruefbefund/domain/types';
import {
  usePruefbefund,
  usePruefungKontext,
  usePruefungPatch,
} from '@/pruefbefund/state/store';

export function NeuePruefung() {
  const { state, aktivePruefung } = usePruefbefund();
  const patch = usePruefungPatch();
  const { asset, inspector } = usePruefungKontext(aktivePruefung);

  if (!aktivePruefung || !asset) {
    return (
      <LeerZustand
        titel="Keine Prüfung geöffnet"
        text="Legen Sie im Anlagenstamm eine neue Prüfung an."
      />
    );
  }

  const art = pruefart(aktivePruefung.pruefart);
  const beurteilung = beurteilePflicht(
    { familie: asset.familie, bauart: asset.bauart, attr: asset.attribute },
    aktivePruefung.pruefart,
  );
  const letzte = state.pruefungen
    .filter(
      (p) =>
        p.assetId === asset.id &&
        p.id !== aktivePruefung.id &&
        p.pruefart === 'AMVO_8_RECURRING',
    )
    .map((p) => p.pruefdatum)
    .sort()
    .at(-1);

  /** Wechsel der Prüfart baut die Checkliste neu auf (PRD 20). */
  function pruefartWechseln(neu: InspectionTypeId) {
    if (!asset || !aktivePruefung) return;
    const neueBeurteilung = beurteilePflicht(
      { familie: asset.familie, bauart: asset.bauart, attr: asset.attribute },
      neu,
    );
    patch({
      pruefart: neu,
      // Prüfinhalt und Prüfart stammen immer aus derselben Prüfart.
      items: baueCheckliste({
        pruefart: neu,
        familie: asset.familie,
        attribute: asset.attribute,
      }),
      // Ein Ergebnis, das die neue Prüfart nicht kennt, wird verworfen.
      ergebnis:
        aktivePruefung.ergebnis &&
        pruefart(neu).erlaubteErgebnisse.includes(aktivePruefung.ergebnis)
          ? aktivePruefung.ergebnis
          : null,
      fachfreigabe: {
        ...aktivePruefung.fachfreigabe,
        erforderlich: neueBeurteilung.freigabePflichtig,
        anlass: neueBeurteilung.status,
        erteilt: false,
      },
    });
  }

  return (
    <div className="stack stack--lg">
      <div className="page-head">
        <h1 className="page-head__title">Prüfung anlegen</h1>
        <p className="page-head__lead">
          {asset.bezeichnung} · {familieLabel(asset.familie)} ·{' '}
          {bauartLabel(asset.familie, asset.bauart)}
        </p>
      </div>

      {/* ---- Schritt 2 — Prüfart ---------------------------------------- */}
      <Karte
        titel="Prüfart"
        untertitel="Die Prüfart bestimmt Kopf, Haupttext, Prüfinhalt, Ergebnislogik und Befunddarstellung gemeinsam."
      >
        <div className="form-grid form-grid--2">
          <Auswahl
            label="Prüfart"
            wert={aktivePruefung.pruefart}
            optionen={freigegebenePruefarten().map((p) => ({
              value: p.id,
              label: p.label,
            }))}
            onChange={pruefartWechseln}
          />
          <TextFeld
            label="Prüfdatum"
            type="date"
            wert={aktivePruefung.pruefdatum}
            onChange={(v) => patch({ pruefdatum: v })}
            hint="Bestimmt auch den anzuwendenden Rechtsstand."
          />
          <Auswahl
            label="Prüfer"
            wert={aktivePruefung.inspectorId}
            optionen={state.pruefer.map((p) => ({ value: p.id, label: p.name }))}
            onChange={(v) => patch({ inspectorId: v })}
            hint={inspector?.qualifikation}
          />
          <TextFeld
            label="Prüfbefundnummer"
            wert={aktivePruefung.befundnummer}
            onChange={(v) => patch({ befundnummer: v })}
          />
        </div>

        <div
          className={`hinweis-box ${
            beurteilung.freigabePflichtig ? 'hinweis-box--warn' : ''
          }`}
          style={{ marginTop: 'var(--sp-5)' }}
        >
          <strong>
            Rechtsprofil: {beurteilung.profil.label} —{' '}
            {PFLICHT_STATUS_LABEL[beurteilung.status]}
          </strong>
          <p style={{ margin: 'var(--sp-2) 0 0' }}>{beurteilung.begruendung}</p>
          {beurteilung.hinweis && (
            <p style={{ margin: 'var(--sp-2) 0 0' }}>{beurteilung.hinweis}</p>
          )}
        </div>

        {beurteilung.freigabePflichtig && (
          <div style={{ marginTop: 'var(--sp-5)' }}>
            <Abschnitt
              titel="Fachliche Freigabe"
              beschreibung="Ein Override bleibt möglich, muss aber begründet und protokolliert werden."
            >
              <div className="form-grid form-grid--2">
                <TextFeld
                  label="Freigegeben von"
                  wert={aktivePruefung.fachfreigabe.freigegebenVon}
                  onChange={(v) =>
                    patch({
                      fachfreigabe: {
                        ...aktivePruefung.fachfreigabe,
                        freigegebenVon: v,
                      },
                    })
                  }
                />
                <TextFeld
                  label="Freigegeben am"
                  type="date"
                  wert={aktivePruefung.fachfreigabe.freigegebenAm ?? ''}
                  onChange={(v) =>
                    patch({
                      fachfreigabe: {
                        ...aktivePruefung.fachfreigabe,
                        freigegebenAm: v || null,
                      },
                    })
                  }
                />
                <TextBereich
                  label="Begründung"
                  className="span-full"
                  rows={3}
                  wert={aktivePruefung.fachfreigabe.begruendung}
                  onChange={(v) =>
                    patch({
                      fachfreigabe: { ...aktivePruefung.fachfreigabe, begruendung: v },
                    })
                  }
                />
              </div>
              <Schalter
                label="Fachliche Freigabe erteilt"
                wert={aktivePruefung.fachfreigabe.erteilt}
                onChange={(v) =>
                  patch({
                    fachfreigabe: { ...aktivePruefung.fachfreigabe, erteilt: v },
                  })
                }
              />
            </Abschnitt>
          </div>
        )}
      </Karte>

      {/* ---- Prüfintervall ---------------------------------------------- */}
      {art.wiederkehrend && letzte && <IntervallKarte letztePruefung={letzte} />}

      {/* ---- Schritt 3 — Prüfgrundlagen --------------------------------- */}
      <Grundlagen
        grundlagen={aktivePruefung.grundlagen}
        familie={asset.familie}
        rechtsgrundlage={art.titelzeile}
        onChange={(g) => patch({ grundlagen: g })}
      />

      {/* ---- Schritt 4 — Änderungen und Vorkommnisse -------------------- */}
      {art.wiederkehrend && (
        <VorkommnisseKarte
          wert={aktivePruefung.vorkommnisse}
          onChange={(v) => patch({ vorkommnisse: v })}
        />
      )}

      {/* ---- Prüfumfang -------------------------------------------------- */}
      <Karte titel="Prüfumfang und Prüflast">
        <div className="form-grid form-grid--2">
          <TextBereich
            label="Durchgeführter Prüfumfang"
            className="span-full"
            rows={3}
            wert={aktivePruefung.pruefumfang}
            onChange={(v) => patch({ pruefumfang: v })}
            hint="Bleibt das Feld leer, wird der Umfang aus der Checkliste abgeleitet."
          />
          <TextFeld
            label="Prüflast"
            wert={aktivePruefung.prueflast}
            onChange={(v) => patch({ prueflast: v })}
            hint="nur sofern für dieses Arbeitsmittel einschlägig"
          />
        </div>
      </Karte>
    </div>
  );
}

/* ==========================================================================
 * Prüfintervall
 * ======================================================================= */

function IntervallKarte({ letztePruefung }: { letztePruefung: string }) {
  const i = berechneIntervall(letztePruefung);
  return (
    <Karte
      titel="Prüfintervall"
      untertitel="Geplanter und rechtlich spätester Termin werden getrennt geführt."
    >
      <div className="kpi-grid">
        <div className="kpi">
          <span className="kpi__label">Letzte Prüfung</span>
          <span className="kpi__value num">{deutsch(i.letztePruefung)}</span>
        </div>
        <div className="kpi">
          <span className="kpi__label">Geplanter Prüftermin</span>
          <span className="kpi__value num">{deutsch(i.geplant)}</span>
          <span className="kpi__hint">zwölf Monate nach der letzten Prüfung</span>
        </div>
        <div className="kpi kpi--beurteilung">
          <span className="kpi__label">Spätester zulässiger Termin</span>
          <span className="kpi__value num">{deutsch(i.spaetestens)}</span>
          <span className="kpi__hint">{i.begruendung}</span>
        </div>
      </div>
    </Karte>
  );
}

/* ==========================================================================
 * Prüfgrundlagen
 * ======================================================================= */

const KATEGORIEN: RuleCategory[] = [
  'RECHTSGRUNDLAGE',
  'BESCHEID_PROJEKT',
  'TECHNISCHES_REGELWERK',
  'HERSTELLER',
];

function Grundlagen({
  grundlagen,
  familie,
  rechtsgrundlage,
  onChange,
}: {
  grundlagen: Pruefgrundlage[];
  familie: string;
  rechtsgrundlage: string;
  onChange: (g: Pruefgrundlage[]) => void;
}) {
  const [vorlage, setVorlage] = useState('');

  function hinzufuegen(kategorie: RuleCategory) {
    onChange([
      ...grundlagen,
      {
        id: id('grd'),
        kategorie,
        bezeichnung: '',
        ausgabe: '',
        anwendungsgrund: '',
        verbindlichkeitsgrund: '',
      },
    ]);
  }

  function uebernehmen() {
    const regel = TECHNISCHE_REGELN.find((r) => r.rule_id === vorlage);
    if (!regel) return;
    onChange([
      ...grundlagen,
      {
        id: id('grd'),
        kategorie: 'TECHNISCHES_REGELWERK',
        bezeichnung: regel.bezeichnung,
        ausgabe: regel.ausgabe,
        anwendungsgrund: regel.anwendungsgrund,
        verbindlichkeitsgrund: regel.binding_reason,
        regelRef: regel.rule_id,
      },
    ]);
    setVorlage('');
  }

  const passend = TECHNISCHE_REGELN.filter(
    (r) => r.familien.length === 0 || r.familien.includes(familie),
  );

  return (
    <Karte
      titel="Prüfgrundlagen"
      untertitel="Rechtsgrundlagen, Bescheid- und Projektgrundlagen, technische Regelwerke und Herstellergrundlagen werden getrennt geführt."
    >
      <div className="hinweis-box">
        <strong>Rechtsgrundlage der Prüfart:</strong> {rechtsgrundlage}. Sie wird
        aus der Prüfart abgeleitet und ist hier nicht einzeln zu erfassen.
      </div>

      <div className="row row--wrap" style={{ marginTop: 'var(--sp-5)' }}>
        <label className="field" style={{ flex: '1 1 280px' }}>
          <span className="field__label">Technisches Regelwerk übernehmen</span>
          <select
            className="select"
            value={vorlage}
            onChange={(e) => setVorlage(e.target.value)}
          >
            <option value="">bitte wählen</option>
            {passend.map((r) => (
              <option key={r.rule_id} value={r.rule_id}>
                {r.bezeichnung} ({r.ausgabe})
              </option>
            ))}
          </select>
          <span className="field__hint">
            Eine Norm wird nicht allein durch die Auswahl der Anlagenart
            verbindlich — Anwendungs- und Verbindlichkeitsgrund bleiben
            erfassungspflichtig.
          </span>
        </label>
        <button
          type="button"
          className="btn btn--sm"
          disabled={!vorlage}
          onClick={uebernehmen}
        >
          Übernehmen
        </button>
      </div>

      <div className="stack stack--lg" style={{ marginTop: 'var(--sp-6)' }}>
        {KATEGORIEN.map((kat) => {
          const eintraege = grundlagen.filter((g) => g.kategorie === kat);
          return (
            <Abschnitt key={kat} titel={RULE_CATEGORY_LABEL[kat]}>
              {eintraege.length === 0 && (
                <p className="muted">Keine Grundlage erfasst.</p>
              )}
              {eintraege.map((g) => (
                <div key={g.id} className="liste__eintrag">
                  <div className="form-grid form-grid--2" style={{ flex: 1 }}>
                    <TextFeld
                      label="Bezeichnung"
                      wert={g.bezeichnung}
                      onChange={(v) =>
                        onChange(
                          grundlagen.map((x) =>
                            x.id === g.id ? { ...x, bezeichnung: v } : x,
                          ),
                        )
                      }
                    />
                    <TextFeld
                      label="Ausgabe / Fassung"
                      wert={g.ausgabe}
                      onChange={(v) =>
                        onChange(
                          grundlagen.map((x) =>
                            x.id === g.id ? { ...x, ausgabe: v } : x,
                          ),
                        )
                      }
                    />
                    <TextFeld
                      label="Anwendungsgrund"
                      wert={g.anwendungsgrund}
                      onChange={(v) =>
                        onChange(
                          grundlagen.map((x) =>
                            x.id === g.id ? { ...x, anwendungsgrund: v } : x,
                          ),
                        )
                      }
                    />
                    <TextFeld
                      label="Verbindlichkeitsgrund"
                      wert={g.verbindlichkeitsgrund}
                      onChange={(v) =>
                        onChange(
                          grundlagen.map((x) =>
                            x.id === g.id ? { ...x, verbindlichkeitsgrund: v } : x,
                          ),
                        )
                      }
                    />
                  </div>
                  <ZeilenAktion
                    onLoeschen={() =>
                      onChange(grundlagen.filter((x) => x.id !== g.id))
                    }
                  />
                </div>
              ))}
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => hinzufuegen(kat)}
              >
                + {RULE_CATEGORY_LABEL[kat]} ergänzen
              </button>
            </Abschnitt>
          );
        })}
      </div>
    </Karte>
  );
}

/* ==========================================================================
 * Änderungen und Vorkommnisse
 * ======================================================================= */

const FRAGEN: { key: keyof Vorkommnisse; label: string }[] = [
  { key: 'wesentlicheAenderung', label: 'Wesentliche Änderung seit letzter Prüfung?' },
  { key: 'groessereInstandsetzung', label: 'Größere Instandsetzung?' },
  { key: 'schaden', label: 'Schaden?' },
  { key: 'aussergewoehnlichesEreignis', label: 'Außergewöhnliches Ereignis?' },
  { key: 'aenderungSteuerungSoftware', label: 'Änderung der Steuerung oder Software?' },
  { key: 'aenderungAufstellungsort', label: 'Änderung des Aufstellungsortes?' },
  { key: 'aenderungNutzung', label: 'Änderung der Nutzung?' },
];

function VorkommnisseKarte({
  wert,
  onChange,
}: {
  wert: Vorkommnisse;
  onChange: (v: Vorkommnisse) => void;
}) {
  const relevant = hatVorkommnisse(wert);
  return (
    <Karte
      titel="Änderungen und Vorkommnisse seit der letzten Prüfung"
      untertitel="Bei wiederkehrenden Prüfungen verpflichtende Abfrage."
    >
      <div className="stack stack--sm">
        {FRAGEN.map((f) => (
          <Schalter
            key={f.key}
            label={f.label}
            wert={wert[f.key] === true}
            onChange={(v) => onChange({ ...wert, [f.key]: v })}
          />
        ))}
      </div>

      {relevant && (
        <div className="stack" style={{ marginTop: 'var(--sp-5)' }}>
          <div className="hinweis-box hinweis-box--warn">
            Es ist zu prüfen, ob statt oder zusätzlich zur wiederkehrenden Prüfung
            ein anderes Prüfregime erforderlich ist.
          </div>
          <TextBereich
            label="Erläuterung"
            rows={3}
            wert={wert.erlaeuterung}
            onChange={(v) => onChange({ ...wert, erlaeuterung: v })}
          />
          <Schalter
            label="Anderes Prüfregime erforderlich"
            wert={wert.anderesPruefregimeErforderlich}
            onChange={(v) => onChange({ ...wert, anderesPruefregimeErforderlich: v })}
          />
          {wert.anderesPruefregimeErforderlich && (
            <TextBereich
              label="Begründung und erforderliches Prüfregime"
              rows={2}
              wert={wert.anderesPruefregimeBegruendung}
              onChange={(v) =>
                onChange({ ...wert, anderesPruefregimeBegruendung: v })
              }
            />
          )}
        </div>
      )}
    </Karte>
  );
}
