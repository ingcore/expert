/**
 * Ansicht 1 — Arbeitsmittel suchen / QR scannen (PRD Abschnitt 21).
 *
 * Auswahl über Kunde → Standort → Arbeitsmittel, Suche, Inventarnummer,
 * QR-Kennung oder den vorherigen Prüfbefund (PRD 8, Schritt 1).
 */

import { useMemo, useState } from 'react';
import { Karte, LeerZustand } from '@/components/ui';
import { bauartLabel, FAMILIES, familieLabel } from '@/pruefbefund/domain/families';
import { beurteileFaelligkeit, deutsch, heute } from '@/pruefbefund/domain/intervall';
import { pflichtuebersicht } from '@/pruefbefund/domain/legal/applicability';
import { ASSET_STATUS_LABEL } from '@/pruefbefund/domain/enums';
import { usePruefbefund } from '@/pruefbefund/state/store';
import type { Asset } from '@/pruefbefund/domain/types';

export function Arbeitsmittel({
  onOeffnen,
}: {
  onOeffnen: (assetId: string) => void;
}) {
  const { state, dispatch } = usePruefbefund();
  const [suche, setSuche] = useState('');
  const [kundeFilter, setKundeFilter] = useState('');
  const [familieFilter, setFamilieFilter] = useState('');

  const gefiltert = useMemo(() => {
    const q = suche.trim().toLowerCase();
    return state.arbeitsmittel.filter((a) => {
      if (kundeFilter && a.customerId !== kundeFilter) return false;
      if (familieFilter && a.familie !== familieFilter) return false;
      if (!q) return true;
      // Suche über Bezeichnung, Inventarnummer, Serien- und QR-Kennung.
      return [
        a.bezeichnung,
        a.inventarnummer,
        a.seriennummer,
        a.qrId ?? '',
        a.hersteller,
        a.type,
        a.aufstellungsort,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [state.arbeitsmittel, suche, kundeFilter, familieFilter]);

  /** Letzte abgeschlossene Prüfung je Arbeitsmittel. */
  const letztePruefung = useMemo(() => {
    const index = new Map<string, string>();
    for (const p of state.pruefungen) {
      const bisher = index.get(p.assetId);
      if (!bisher || p.pruefdatum > bisher) index.set(p.assetId, p.pruefdatum);
    }
    return index;
  }, [state.pruefungen]);

  return (
    <div className="stack stack--lg">
      <div className="page-head">
        <h1 className="page-head__title">Arbeitsmittel</h1>
        <p className="page-head__lead">
          Auswahl über Kunde und Standort, Suche, Inventarnummer oder QR-Kennung.
          Bei einer wiederkehrenden Prüfung werden die aktuellen Stammdaten
          übernommen — frühere Prüfergebnisse ausdrücklich nicht.
        </p>
      </div>

      <Karte titel="Suche und Filter">
        <div className="form-grid form-grid--2">
          <label className="field">
            <span className="field__label">Suche</span>
            <input
              className="input"
              type="search"
              value={suche}
              placeholder="Bezeichnung, Inventarnummer, Seriennummer oder QR-Kennung"
              onChange={(e) => setSuche(e.target.value)}
            />
            <span className="field__hint">
              Die QR-Kennung kann mit einem Handscanner unmittelbar in dieses Feld
              gelesen werden.
            </span>
          </label>
          <div className="form-grid form-grid--2">
            <label className="field">
              <span className="field__label">Kunde</span>
              <select
                className="select"
                value={kundeFilter}
                onChange={(e) => setKundeFilter(e.target.value)}
              >
                <option value="">alle Kunden</option>
                {state.kunden.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.kundennummer} — {k.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field__label">Anlagenfamilie</span>
              <select
                className="select"
                value={familieFilter}
                onChange={(e) => setFamilieFilter(e.target.value)}
              >
                <option value="">alle Familien</option>
                {FAMILIES.map((f) => (
                  <option key={f.code} value={f.code}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </Karte>

      {gefiltert.length === 0 ? (
        <LeerZustand
          titel="Kein Arbeitsmittel gefunden"
          text="Suchbegriff oder Filter ändern."
        />
      ) : (
        <div className="stack">
          {gefiltert.map((a) => (
            <AssetKarte
              key={a.id}
              asset={a}
              kunde={
                state.kunden.find((k) => k.id === a.customerId)?.name ?? 'Kunde unbekannt'
              }
              standort={
                state.standorte.find((s) => s.id === a.siteId)?.bezeichnung ?? '—'
              }
              letztePruefung={letztePruefung.get(a.id) ?? null}
              onOeffnen={() => {
                dispatch({ typ: 'asset-oeffnen', id: a.id });
                onOeffnen(a.id);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AssetKarte({
  asset,
  kunde,
  standort,
  letztePruefung,
  onOeffnen,
}: {
  asset: Asset;
  kunde: string;
  standort: string;
  letztePruefung: string | null;
  onOeffnen: () => void;
}) {
  // Prüfpflichten stammen aus dem Rechtsprofil, nicht aus der Anlagenart.
  const pflichten = pflichtuebersicht({
    familie: asset.familie,
    bauart: asset.bauart,
    attr: asset.attribute,
  });
  const wiederkehrend = pflichten.find((p) => p.pruefart === 'AMVO_8_RECURRING');
  const faellig =
    letztePruefung && wiederkehrend?.status === 'STANDARD'
      ? beurteileFaelligkeit(letztePruefung, heute())
      : null;

  return (
    <button type="button" className="projekt-karte" onClick={onOeffnen}>
      <div className="row row--between row--wrap">
        <div style={{ minWidth: 0 }}>
          <div className="projekt-karte__titel">{asset.bezeichnung || 'ohne Bezeichnung'}</div>
          <div className="projekt-karte__meta">
            {familieLabel(asset.familie)} · {bauartLabel(asset.familie, asset.bauart)}
            {' · '}
            {asset.hersteller} {asset.type}
          </div>
        </div>
        <div className="pill-row">
          <span className="badge">{asset.inventarnummer || 'ohne Inventarnummer'}</span>
          {asset.status !== 'AKTIV' && (
            <span className="badge badge--warning">
              {ASSET_STATUS_LABEL[asset.status]}
            </span>
          )}
          {faellig?.status === 'FRIST_UEBERSCHRITTEN' && (
            <span className="badge badge--danger">Prüffrist überschritten</span>
          )}
          {faellig?.status === 'PLANTERMIN_UEBERSCHRITTEN' && (
            <span className="badge badge--warning">Plantermin überschritten</span>
          )}
        </div>
      </div>
      <div className="projekt-karte__fuss">
        <span>
          {kunde} · {standort} · {asset.aufstellungsort}
        </span>
        <span className="mono">
          {letztePruefung
            ? `letzte Prüfung ${deutsch(letztePruefung)}${
                faellig ? ` · spätestens ${deutsch(faellig.spaetestens)}` : ''
              }`
            : 'noch keine Prüfung erfasst'}
        </span>
      </div>
    </button>
  );
}
