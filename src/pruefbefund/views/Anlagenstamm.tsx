/**
 * Ansicht 2 — Anlagenstamm (PRD Abschnitt 21).
 *
 * Allgemeine Pflichtfelder (PRD 7.1) und typabhängige technische
 * Eigenschaften (PRD 7.2). Die technischen Felder werden ausschließlich über
 * das Schema der Anlagenfamilie eingeblendet; fachfremde Felder können so
 * nicht entstehen (PRD 12, AC-07).
 */

import {
  Abschnitt,
  Auswahl,
  Karte,
  LeerZustand,
  Schalter,
  TextFeld,
  ZahlFeld,
} from '@/components/ui';
import {
  ASSET_STATUS_LABEL,
  type AssetStatus,
} from '@/pruefbefund/domain/enums';
import { FAMILIES, familie, type AssetFamily } from '@/pruefbefund/domain/families';
import {
  PFLICHT_STATUS_LABEL,
  pflichtuebersicht,
} from '@/pruefbefund/domain/legal/applicability';
import { pruefart } from '@/pruefbefund/domain/legal/pruefart';
import {
  anlagenfremdeFelder,
  feldSichtbar,
  gruppenFuerFamilie,
  gruppeSichtbar,
  type AttributDef,
} from '@/pruefbefund/domain/schema';
import { usePruefbefund } from '@/pruefbefund/state/store';
import type { Asset } from '@/pruefbefund/domain/types';

export function Anlagenstamm({ onPruefungStarten }: { onPruefungStarten: () => void }) {
  const { state, aktivesAsset, dispatch } = usePruefbefund();

  if (!aktivesAsset) {
    return (
      <LeerZustand
        titel="Kein Arbeitsmittel geöffnet"
        text="Wählen Sie zuerst ein Arbeitsmittel aus."
      />
    );
  }

  const asset = aktivesAsset;
  const ctx = {
    familie: asset.familie,
    bauart: asset.bauart,
    attr: asset.attribute,
  };

  function patch(aenderung: Partial<Asset>) {
    dispatch({ typ: 'asset-aktualisieren', asset: { ...asset, ...aenderung } });
  }

  /**
   * Beim Wechsel der Anlagenfamilie werden die technischen Attribute
   * zurückgesetzt. Ein Übertragen fachfremder Felder ist damit ausgeschlossen.
   */
  function familieWechseln(neu: AssetFamily) {
    patch({
      familie: neu,
      bauart: familie(neu).bauarten[0]?.code ?? '',
      attribute: {},
    });
  }

  function attrSetzen(key: string, wert: unknown) {
    patch({ attribute: { ...asset.attribute, [key]: wert } });
  }

  const fremdeFelder = anlagenfremdeFelder(asset.familie, asset.attribute);
  const pflichten = pflichtuebersicht(ctx);
  const familieDef = familie(asset.familie);

  return (
    <div className="stack stack--lg">
      <div className="page-head">
        <h1 className="page-head__title">{asset.bezeichnung || 'Anlagenstamm'}</h1>
        <p className="page-head__lead">{familieDef.abgrenzung}</p>
      </div>

      {/* ---- Rechtsprofil ------------------------------------------------ */}
      <Karte
        titel="Rechtsprofil"
        untertitel={`${pflichten[0]?.profil.label ?? 'kein Profil'} — die Prüfpflicht wird aus der konkreten Ausführung abgeleitet, nicht aus der Anlagenart.`}
      >
        <div className="stack stack--sm">
          {pflichten.map((p) => (
            <div key={p.pruefart} className={`befund befund--${tonZuStatus(p.status)}`}>
              <div className="befund__marke" aria-hidden="true">
                {p.status === 'STANDARD' ? '✓' : p.status === 'DIFFERENZIERT' ? '▲' : '✕'}
              </div>
              <div>
                <div className="befund__titel">
                  {pruefart(p.pruefart).titelzeile} —{' '}
                  {PFLICHT_STATUS_LABEL[p.status]}
                </div>
                <div className="befund__text">{p.begruendung}</div>
                {p.hinweis && <div className="befund__grundlage">{p.hinweis}</div>}
              </div>
            </div>
          ))}
        </div>
      </Karte>

      {fremdeFelder.length > 0 && (
        <div className="hinweis-box hinweis-box--gefahr">
          <strong>Anlagenfremde Felder:</strong> {fremdeFelder.join(', ')}. Diese
          Felder gehören nicht zum Schema der Anlagenfamilie
          „{familieDef.label}" und blockieren die Befunderzeugung.
          <div style={{ marginTop: 'var(--sp-3)' }}>
            <button
              type="button"
              className="btn btn--sm btn--danger"
              onClick={() => {
                const bereinigt = { ...asset.attribute };
                for (const key of fremdeFelder) delete bereinigt[key];
                patch({ attribute: bereinigt });
              }}
            >
              Fachfremde Felder entfernen
            </button>
          </div>
        </div>
      )}

      {/* ---- Allgemeine Pflichtfelder ----------------------------------- */}
      <Karte titel="Stammdaten" untertitel="Allgemeine Pflichtfelder nach PRD 7.1">
        <div className="form-grid form-grid--2">
          <Auswahl
            label="Kunde / Betreiber"
            wert={asset.customerId}
            optionen={state.kunden.map((k) => ({
              value: k.id,
              label: `${k.kundennummer} — ${k.name}`,
            }))}
            onChange={(v) => patch({ customerId: v })}
          />
          <Auswahl
            label="Standort"
            wert={asset.siteId}
            optionen={state.standorte
              .filter((s) => s.customerId === asset.customerId)
              .map((s) => ({ value: s.id, label: s.bezeichnung }))}
            onChange={(v) => patch({ siteId: v })}
          />
          <TextFeld
            label="Genauer Aufstellungsort"
            wert={asset.aufstellungsort}
            onChange={(v) => patch({ aufstellungsort: v })}
          />
          <TextFeld
            label="Inventarnummer"
            wert={asset.inventarnummer}
            onChange={(v) => patch({ inventarnummer: v })}
          />
          <Auswahl
            label="Anlagenfamilie"
            wert={asset.familie}
            optionen={FAMILIES.map((f) => ({ value: f.code, label: f.label }))}
            onChange={familieWechseln}
            hint="Ein Wechsel setzt die technischen Eigenschaften zurück."
          />
          <Auswahl
            label="Bauart"
            wert={asset.bauart}
            optionen={familieDef.bauarten.map((b) => ({
              value: b.code,
              label: b.label,
            }))}
            onChange={(v) => patch({ bauart: v })}
          />
          <TextFeld
            label="Interne Bezeichnung"
            wert={asset.bezeichnung}
            onChange={(v) => patch({ bezeichnung: v })}
          />
          <TextFeld
            label="Hersteller"
            wert={asset.hersteller}
            onChange={(v) => patch({ hersteller: v })}
          />
          <TextFeld
            label="Type"
            wert={asset.type}
            onChange={(v) => patch({ type: v })}
          />
          <TextFeld
            label="Serien-/Herstellnummer"
            wert={asset.seriennummer}
            onChange={(v) => patch({ seriennummer: v })}
          />
          <ZahlFeld
            label="Baujahr"
            wert={asset.baujahr ?? 0}
            min={1900}
            max={2100}
            onChange={(v) => patch({ baujahr: v || null })}
          />
          <TextFeld
            label="Datum der Inbetriebnahme"
            type="date"
            wert={asset.inbetriebnahme ?? ''}
            onChange={(v) => patch({ inbetriebnahme: v || null })}
            hint="soweit bekannt"
          />
          <TextFeld
            label="QR-Kennung"
            wert={asset.qrId ?? ''}
            onChange={(v) => patch({ qrId: v || null })}
          />
          <TextFeld
            label="Foto des Typenschildes"
            wert={asset.typenschildFoto ?? ''}
            onChange={(v) => patch({ typenschildFoto: v || null })}
            hint="Dateiname bzw. Verweis auf die Anlage"
          />
          <Auswahl
            label="Status"
            wert={asset.status}
            optionen={(Object.keys(ASSET_STATUS_LABEL) as AssetStatus[]).map((s) => ({
              value: s,
              label: ASSET_STATUS_LABEL[s],
            }))}
            onChange={(v) => patch({ status: v })}
          />
        </div>
      </Karte>

      {/* ---- Typabhängige technische Eigenschaften ----------------------- */}
      <Karte
        titel="Technische Eigenschaften"
        untertitel={`Schema der Anlagenfamilie „${familieDef.label}". Felder anderer Familien stehen hier nicht zur Verfügung.`}
      >
        <div className="stack stack--lg">
          {gruppenFuerFamilie(asset.familie).map((gruppe) => {
            const sichtbar = gruppeSichtbar(gruppe, ctx);
            const felder = gruppe.felder.filter((f) => feldSichtbar(f, ctx));
            if (!sichtbar || felder.length === 0) return null;
            return (
              <Abschnitt key={gruppe.id} titel={gruppe.titel}>
                <div className="form-grid form-grid--2">
                  {felder.map((feld) => (
                    <AttributFeld
                      key={feld.key}
                      feld={feld}
                      wert={asset.attribute[feld.key]}
                      onChange={(v) => attrSetzen(feld.key, v)}
                    />
                  ))}
                </div>
              </Abschnitt>
            );
          })}
        </div>
      </Karte>

      <div className="row row--between row--wrap">
        <span className="muted">
          Zuletzt geändert am{' '}
          {new Date(asset.geaendertAm).toLocaleString('de-AT')}
        </span>
        <button type="button" className="btn btn--primary" onClick={onPruefungStarten}>
          Neue Prüfung anlegen
        </button>
      </div>
    </div>
  );
}

function tonZuStatus(status: string): 'info' | 'warnung' | 'fehler' {
  if (status === 'STANDARD') return 'info';
  if (status === 'DIFFERENZIERT') return 'warnung';
  return 'fehler';
}

function AttributFeld({
  feld,
  wert,
  onChange,
}: {
  feld: AttributDef;
  wert: unknown;
  onChange: (wert: unknown) => void;
}) {
  if (feld.typ === 'bool') {
    return (
      <div className="field">
        <span className="field__label">{feld.label}</span>
        <Schalter
          label={wert === true ? 'ja' : 'nein'}
          wert={wert === true}
          onChange={onChange}
        />
        {feld.hinweis && <span className="field__hint">{feld.hinweis}</span>}
      </div>
    );
  }

  if (feld.typ === 'auswahl') {
    return (
      <Auswahl
        label={feld.label}
        wert={typeof wert === 'string' ? wert : ''}
        optionen={[
          { value: '', label: 'nicht erfasst' },
          ...(feld.optionen ?? []),
        ]}
        onChange={(v) => onChange(v || undefined)}
        hint={feld.hinweis}
      />
    );
  }

  if (feld.typ === 'zahl') {
    return (
      <ZahlFeld
        label={feld.label}
        einheit={feld.einheit}
        wert={typeof wert === 'number' ? wert : 0}
        step={0.01}
        onChange={(v) => onChange(v || undefined)}
        hint={feld.hinweis}
      />
    );
  }

  return (
    <TextFeld
      label={feld.label}
      wert={typeof wert === 'string' ? wert : ''}
      onChange={(v) => onChange(v || undefined)}
      hint={feld.hinweis}
    />
  );
}
