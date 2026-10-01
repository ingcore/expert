/**
 * Ansicht 4 — Prüfcheckliste (PRD Abschnitt 21).
 *
 * Jeder Prüfpunkt trägt Ergebnis, Bemerkung, optionalen Messwert, optionales
 * Foto und eine optionale Mangelverknüpfung (PRD 8, Schritt 5).
 */

import { Karte, LeerZustand } from '@/components/ui';
import {
  ITEM_RESULT_LABEL,
  type ItemResult,
} from '@/pruefbefund/domain/enums';
import {
  baueCheckliste,
  checklistenStand,
  nachAbschnitten,
} from '@/pruefbefund/domain/checklist';
import { pruefart } from '@/pruefbefund/domain/legal/pruefart';
import { HERKUNFT_LABEL, type InspectionItem } from '@/pruefbefund/domain/types';
import {
  usePruefbefund,
  usePruefungKontext,
  usePruefungPatch,
} from '@/pruefbefund/state/store';

const ERGEBNISSE: ItemResult[] = ['OK', 'MANGEL', 'NA', 'NICHT_PRUEFBAR'];

export function Checkliste() {
  const { aktivePruefung } = usePruefbefund();
  const patch = usePruefungPatch();
  const { asset } = usePruefungKontext(aktivePruefung);

  if (!aktivePruefung || !asset) {
    return <LeerZustand titel="Keine Prüfung geöffnet" />;
  }

  const art = pruefart(aktivePruefung.pruefart);
  const stand = checklistenStand(aktivePruefung.items);

  function itemAendern(id: string, aenderung: Partial<InspectionItem>) {
    if (!aktivePruefung) return;
    patch({
      items: aktivePruefung.items.map((i) =>
        i.id === id ? { ...i, ...aenderung } : i,
      ),
    });
  }

  function alleAuf(ergebnis: ItemResult) {
    if (!aktivePruefung) return;
    patch({
      items: aktivePruefung.items.map((i) =>
        i.ergebnis === null ? { ...i, ergebnis } : i,
      ),
    });
  }

  function neuAufbauen() {
    if (!aktivePruefung || !asset) return;
    patch({
      items: baueCheckliste({
        pruefart: aktivePruefung.pruefart,
        familie: asset.familie,
        attribute: asset.attribute,
      }),
    });
  }

  return (
    <div className="stack stack--lg">
      <div className="page-head">
        <h1 className="page-head__title">Prüfcheckliste</h1>
        <p className="page-head__lead">
          {art.titelzeile} · {stand.beurteilt} von {stand.gesamt} Prüfpunkten
          beurteilt
        </p>
      </div>

      <Karte titel="Stand der Checkliste">
        <div className="kpi-grid">
          <div className="kpi kpi--gut">
            <span className="kpi__label">OK</span>
            <span className="kpi__value num">{stand.ok}</span>
          </div>
          <div className={`kpi ${stand.mangel > 0 ? 'kpi--gefahr' : ''}`}>
            <span className="kpi__label">Mangel</span>
            <span className="kpi__value num">{stand.mangel}</span>
          </div>
          <div className="kpi">
            <span className="kpi__label">nicht anwendbar</span>
            <span className="kpi__value num">{stand.na}</span>
          </div>
          <div className={`kpi ${stand.nichtPruefbar > 0 ? 'kpi--warn' : ''}`}>
            <span className="kpi__label">nicht prüfbar</span>
            <span className="kpi__value num">{stand.nichtPruefbar}</span>
          </div>
          <div className={`kpi ${stand.offen > 0 ? 'kpi--warn' : 'kpi--gut'}`}>
            <span className="kpi__label">offen</span>
            <span className="kpi__value num">{stand.offen}</span>
          </div>
        </div>

        <div className="row row--wrap" style={{ marginTop: 'var(--sp-5)' }}>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => alleAuf('OK')}
            disabled={stand.offen === 0}
          >
            Offene Punkte auf „OK" setzen
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={neuAufbauen}
          >
            Checkliste aus Prüfart und Anlagenstamm neu aufbauen
          </button>
        </div>
      </Karte>

      {nachAbschnitten(aktivePruefung.items).map((gruppe) => (
        <Karte key={gruppe.abschnitt} titel={gruppe.abschnitt} flush>
          <div className="liste">
            {gruppe.items.map((item, idx) => (
              <PruefpunktZeile
                key={item.id}
                nr={idx + 1}
                item={item}
                maengel={aktivePruefung.findings}
                onChange={(a) => itemAendern(item.id, a)}
              />
            ))}
          </div>
        </Karte>
      ))}
    </div>
  );
}

function PruefpunktZeile({
  nr,
  item,
  maengel,
  onChange,
}: {
  nr: number;
  item: InspectionItem;
  maengel: { id: string; nummer: number; beschreibung: string }[];
  onChange: (a: Partial<InspectionItem>) => void;
}) {
  return (
    <div className="liste__eintrag">
      <span className="liste__nr num">{nr}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="row row--between row--wrap">
          <div style={{ flex: '1 1 320px', minWidth: 0 }}>
            <div>{item.text}</div>
            <div className="subtle">{HERKUNFT_LABEL[item.herkunft]}</div>
          </div>
          <div className="pill-row" role="group" aria-label="Ergebnis des Prüfpunktes">
            {ERGEBNISSE.map((e) => (
              <button
                key={e}
                type="button"
                className={`btn btn--sm ${
                  item.ergebnis === e ? 'btn--dark' : 'btn--ghost'
                }`}
                aria-pressed={item.ergebnis === e}
                onClick={() => onChange({ ergebnis: item.ergebnis === e ? null : e })}
              >
                {ITEM_RESULT_LABEL[e]}
              </button>
            ))}
          </div>
        </div>

        {item.ergebnis !== null && (
          <div className="form-grid form-grid--2" style={{ marginTop: 'var(--sp-3)' }}>
            <label className="field">
              <span className="field__label">Bemerkung</span>
              <input
                className="input"
                value={item.bemerkung}
                onChange={(e) => onChange({ bemerkung: e.target.value })}
              />
            </label>
            <label className="field">
              <span className="field__label">Messwert</span>
              <input
                className="input"
                value={item.messwert ?? ''}
                placeholder="z. B. 142 N Schließkraft"
                onChange={(e) => onChange({ messwert: e.target.value || undefined })}
              />
            </label>
            <label className="field">
              <span className="field__label">Foto</span>
              <input
                className="input"
                value={item.foto ?? ''}
                placeholder="Dateiname bzw. Verweis auf die Anlage"
                onChange={(e) => onChange({ foto: e.target.value || undefined })}
              />
            </label>
            {item.ergebnis === 'MANGEL' && (
              <label className="field">
                <span className="field__label">Verknüpfter Mangel</span>
                <select
                  className="select"
                  value={item.findingId ?? ''}
                  onChange={(e) =>
                    onChange({ findingId: e.target.value || undefined })
                  }
                >
                  <option value="">nicht verknüpft</option>
                  {maengel.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nummer}. {m.beschreibung || 'ohne Beschreibung'}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
