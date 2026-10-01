/**
 * Modulhülle „INGTEC PrüfBefund".
 *
 * Führt den Prüfer ohne doppelte Dateneingaben vom Aufruf eines vorhandenen
 * Arbeitsmittels bis zum fertigen Einseitenbefund (PRD Abschnitt 21).
 */

import { useMemo, useState } from 'react';
import { Logo } from '@/components/Logo';
import { checklistenStand } from '@/pruefbefund/domain/checklist';
import { REPORT_STATUS_LABEL } from '@/pruefbefund/domain/enums';
import { neuePruefung } from '@/pruefbefund/domain/factory';
import { pruefart } from '@/pruefbefund/domain/legal/pruefart';
import { validiere } from '@/pruefbefund/domain/validierung';
import { Anlagenstamm } from '@/pruefbefund/views/Anlagenstamm';
import { Arbeitsmittel } from '@/pruefbefund/views/Arbeitsmittel';
import { Befund } from '@/pruefbefund/views/Befund';
import { Checkliste } from '@/pruefbefund/views/Checkliste';
import { Ergebnis } from '@/pruefbefund/views/Ergebnis';
import { Maengel } from '@/pruefbefund/views/Maengel';
import { NeuePruefung } from '@/pruefbefund/views/NeuePruefung';
import { usePruefbefund, usePruefungKontext } from '@/pruefbefund/state/store';

export type PbAnsicht =
  | 'arbeitsmittel'
  | 'anlagenstamm'
  | 'neue-pruefung'
  | 'checkliste'
  | 'maengel'
  | 'ergebnis'
  | 'befund';

/** Ansichten, die eine geöffnete Prüfung voraussetzen. */
const PRUEFUNGS_ANSICHTEN: PbAnsicht[] = [
  'neue-pruefung',
  'checkliste',
  'maengel',
  'ergebnis',
  'befund',
];

export function PruefbefundApp({ onModulWechsel }: { onModulWechsel: () => void }) {
  const { state, aktivesAsset, aktivePruefung, dispatch } = usePruefbefund();
  const [ansicht, setAnsicht] = useState<PbAnsicht>('arbeitsmittel');
  const { asset, inspector } = usePruefungKontext(aktivePruefung);

  const stand = useMemo(
    () => (aktivePruefung ? checklistenStand(aktivePruefung.items) : null),
    [aktivePruefung],
  );

  const validierung = useMemo(
    () =>
      aktivePruefung && asset
        ? validiere({ inspection: aktivePruefung, asset, inspector })
        : null,
    [aktivePruefung, asset, inspector],
  );

  const maengelAnzahl =
    aktivePruefung?.findings.filter((f) => f.typ === 'DEFECT').length ?? 0;

  // Ohne geöffnete Prüfung sind die prüfungsbezogenen Ansichten gesperrt.
  const gesperrt = !aktivePruefung && PRUEFUNGS_ANSICHTEN.includes(ansicht);
  const effektiv: PbAnsicht = gesperrt ? 'arbeitsmittel' : ansicht;

  /** Legt eine Prüfung zum geöffneten Arbeitsmittel an. */
  function pruefungStarten() {
    if (!aktivesAsset) return;
    const customer = state.kunden.find((k) => k.id === aktivesAsset.customerId);
    if (!customer) return;
    const laufend =
      state.pruefungen.filter(
        (p) => p.pruefdatum.slice(0, 4) === new Date().getFullYear().toString(),
      ).length + 1;

    dispatch({
      typ: 'pruefung-anlegen',
      pruefung: neuePruefung({
        asset: aktivesAsset,
        customer,
        // Vorbelegung mit der wiederkehrenden Prüfung; der Prüfer bestimmt
        // die Prüfart im nächsten Schritt ausdrücklich.
        pruefart: 'AMVO_8_RECURRING',
        inspectorId: state.pruefer[0]?.id ?? '',
        laufendeNummer: laufend,
      }),
    });
    setAnsicht('neue-pruefung');
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <Logo className="sidebar__logo" />
          <div className="sidebar__app">PrüfBefund</div>
          <div className="sidebar__claim">
            Eine Prüfart.
            <br />
            Ein Befund. Eine Seite.
          </div>
        </div>

        <nav className="sidebar__nav" aria-label="Hauptnavigation Prüfbefund">
          <div className="sidebar__group">Arbeitsmittel</div>
          <NavKnopf
            aktiv={effektiv === 'arbeitsmittel'}
            icon="⌕"
            label="Suchen / QR"
            anzahl={state.arbeitsmittel.length}
            onClick={() => setAnsicht('arbeitsmittel')}
          />
          <NavKnopf
            aktiv={effektiv === 'anlagenstamm'}
            icon="▤"
            label="Anlagenstamm"
            deaktiviert={!aktivesAsset}
            onClick={() => setAnsicht('anlagenstamm')}
          />

          <div className="sidebar__group">Prüfung</div>
          <NavKnopf
            aktiv={effektiv === 'neue-pruefung'}
            icon="§"
            label="Prüfart und Grundlagen"
            deaktiviert={!aktivePruefung}
            onClick={() => setAnsicht('neue-pruefung')}
          />
          <NavKnopf
            aktiv={effektiv === 'checkliste'}
            icon="✓"
            label="Prüfcheckliste"
            deaktiviert={!aktivePruefung}
            anzahl={stand?.offen || undefined}
            alarm={(stand?.offen ?? 0) > 0}
            onClick={() => setAnsicht('checkliste')}
          />
          <NavKnopf
            aktiv={effektiv === 'maengel'}
            icon="≡"
            label="Mängel"
            deaktiviert={!aktivePruefung}
            anzahl={maengelAnzahl || undefined}
            alarm={maengelAnzahl > 0}
            onClick={() => setAnsicht('maengel')}
          />
          <NavKnopf
            aktiv={effektiv === 'ergebnis'}
            icon="⚖"
            label="Ergebnis"
            deaktiviert={!aktivePruefung}
            anzahl={validierung?.blocker.length || undefined}
            alarm={(validierung?.blocker.length ?? 0) > 0}
            onClick={() => setAnsicht('ergebnis')}
          />
          <NavKnopf
            aktiv={effektiv === 'befund'}
            icon="⎙"
            label="Einseitenbefund"
            deaktiviert={!aktivePruefung}
            onClick={() => setAnsicht('befund')}
          />

          <div className="sidebar__group">Module</div>
          <NavKnopf
            aktiv={false}
            icon="◧"
            label="Brandschutzkonzept"
            onClick={onModulWechsel}
          />
        </nav>

        <div className="sidebar__footer">
          INGTEC GmbH — TECHNIK.WIRKT
          <br />
          PrüfBefund v1.0
        </div>
      </aside>

      <div className="main">
        <header className="topbar no-print">
          <div style={{ minWidth: 0 }}>
            <div className="topbar__eyebrow">
              {aktivesAsset
                ? `${aktivesAsset.inventarnummer || 'ohne Inventarnummer'} · ${
                    aktivesAsset.aufstellungsort || 'ohne Aufstellungsort'
                  }`
                : 'INGTEC GmbH'}
            </div>
            <div className="topbar__title">
              {aktivePruefung
                ? `${pruefart(aktivePruefung.pruefart).titelzeile}`
                : (aktivesAsset?.bezeichnung ?? 'Technisches Prüfwesen — Arbeitsmittel')}
            </div>
          </div>
          <div className="spacer" />
          {aktivePruefung && (
            <>
              <span className="badge badge--brand">
                {REPORT_STATUS_LABEL[aktivePruefung.status]}
              </span>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => {
                  dispatch({ typ: 'pruefung-oeffnen', id: null });
                  setAnsicht('arbeitsmittel');
                }}
              >
                Prüfung schließen
              </button>
            </>
          )}
        </header>

        <main className="content">
          {effektiv === 'arbeitsmittel' && (
            <Arbeitsmittel onOeffnen={() => setAnsicht('anlagenstamm')} />
          )}
          {effektiv === 'anlagenstamm' && (
            <Anlagenstamm onPruefungStarten={pruefungStarten} />
          )}
          {effektiv === 'neue-pruefung' && <NeuePruefung />}
          {effektiv === 'checkliste' && <Checkliste />}
          {effektiv === 'maengel' && <Maengel />}
          {effektiv === 'ergebnis' && <Ergebnis />}
          {effektiv === 'befund' && <Befund />}
        </main>
      </div>
    </div>
  );
}

function NavKnopf({
  aktiv,
  icon,
  label,
  anzahl,
  alarm,
  deaktiviert,
  onClick,
}: {
  aktiv: boolean;
  icon: string;
  label: string;
  anzahl?: number;
  alarm?: boolean;
  deaktiviert?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`navitem ${aktiv ? 'navitem--aktiv' : ''}`}
      onClick={onClick}
      disabled={deaktiviert}
      style={deaktiviert ? { opacity: 0.38, cursor: 'not-allowed' } : undefined}
      aria-current={aktiv ? 'page' : undefined}
    >
      <span className="navitem__icon" aria-hidden="true">
        {icon}
      </span>
      <span>{label}</span>
      {anzahl !== undefined && anzahl > 0 && (
        <span className={`navitem__count ${alarm ? 'navitem__count--alarm' : ''}`}>
          {anzahl}
        </span>
      )}
    </button>
  );
}
