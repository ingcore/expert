import { useMemo, useState } from 'react';
import { Logo } from '@/components/Logo';
import { useStore } from '@/state/store';
import { pruefeProjekt, befundStatistik } from '@/domain/rules';
import { massnahmenKennzahlen } from '@/domain/stats';
import { Dashboard } from '@/views/Dashboard';
import { Projekte } from '@/views/Projekte';
import { Konzept } from '@/views/Konzept';
import { Pruefung } from '@/views/Pruefung';
import { Massnahmen } from '@/views/Massnahmen';
import { Dokument } from '@/views/Dokument';
import { Regelwerk } from '@/views/Regelwerk';
import { Verwaltung } from '@/views/Verwaltung';

export type Ansicht =
  | 'dashboard'
  | 'projekte'
  | 'konzept'
  | 'pruefung'
  | 'massnahmen'
  | 'dokument'
  | 'regelwerk'
  | 'verwaltung';

export function App() {
  const { state, aktivesProjekt, dispatch } = useStore();
  const [ansicht, setAnsicht] = useState<Ansicht>('dashboard');

  const befunde = useMemo(
    () => (aktivesProjekt ? pruefeProjekt(aktivesProjekt) : []),
    [aktivesProjekt],
  );
  const befundStat = useMemo(() => befundStatistik(befunde), [befunde]);
  const massnahmenStat = useMemo(
    () => massnahmenKennzahlen(aktivesProjekt?.massnahmen ?? []),
    [aktivesProjekt],
  );

  // Ohne geöffnetes Projekt sind die projektbezogenen Ansichten gesperrt.
  function wechsle(ziel: Ansicht) {
    setAnsicht(ziel);
  }

  function oeffneProjekt(id: string) {
    dispatch({ typ: 'projekt-oeffnen', id });
    setAnsicht('konzept');
  }

  const projektAnsichten: Ansicht[] = [
    'konzept',
    'pruefung',
    'massnahmen',
    'dokument',
  ];
  const gesperrt = !aktivesProjekt && projektAnsichten.includes(ansicht);
  const effektiveAnsicht: Ansicht = gesperrt ? 'projekte' : ansicht;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <span className="sidebar__plate">
            <Logo className="sidebar__logo" />
          </span>
          <div className="sidebar__app">Brandschutzkonzept-Tool</div>
        </div>

        <nav className="sidebar__nav" aria-label="Hauptnavigation">
          <div className="sidebar__group">Übersicht</div>
          <NavKnopf
            aktiv={effektiveAnsicht === 'dashboard'}
            icon="◧"
            label="Dashboard"
            onClick={() => wechsle('dashboard')}
          />
          <NavKnopf
            aktiv={effektiveAnsicht === 'projekte'}
            icon="▤"
            label="Projekte"
            anzahl={state.projekte.length}
            onClick={() => wechsle('projekte')}
          />

          <div className="sidebar__group">Aktuelles Projekt</div>
          <NavKnopf
            aktiv={effektiveAnsicht === 'konzept'}
            icon="✎"
            label="Konzept"
            deaktiviert={!aktivesProjekt}
            onClick={() => wechsle('konzept')}
          />
          <NavKnopf
            aktiv={effektiveAnsicht === 'pruefung'}
            icon="✓"
            label="Prüfung"
            deaktiviert={!aktivesProjekt}
            anzahl={befundStat.fehler + befundStat.warnung || undefined}
            alarm={befundStat.fehler > 0}
            onClick={() => wechsle('pruefung')}
          />
          <NavKnopf
            aktiv={effektiveAnsicht === 'massnahmen'}
            icon="≡"
            label="Maßnahmen"
            deaktiviert={!aktivesProjekt}
            anzahl={
              massnahmenStat.offen + massnahmenStat.inUmsetzung || undefined
            }
            alarm={massnahmenStat.ueberfaellig > 0}
            onClick={() => wechsle('massnahmen')}
          />
          <NavKnopf
            aktiv={effektiveAnsicht === 'dokument'}
            icon="▦"
            label="Dokument"
            deaktiviert={!aktivesProjekt}
            onClick={() => wechsle('dokument')}
          />

          <div className="sidebar__group">Referenz</div>
          <NavKnopf
            aktiv={effektiveAnsicht === 'regelwerk'}
            icon="§"
            label="Regelwerk"
            onClick={() => wechsle('regelwerk')}
          />
          <NavKnopf
            aktiv={effektiveAnsicht === 'verwaltung'}
            icon="⚙"
            label="Verwaltung"
            onClick={() => wechsle('verwaltung')}
          />
        </nav>

        <div className="sidebar__footer">
          INGTEC GmbH — TECHNIK.WIRKT
          <br />
          Brandschutzkonzept-Tool v1.0
        </div>
      </aside>

      <div className="main">
        <header className="topbar no-print">
          <div style={{ minWidth: 0 }}>
            <div className="topbar__title">
              {aktivesProjekt ? aktivesProjekt.titel : 'Brandschutzkonzept-Tool'}
            </div>
            {aktivesProjekt && (
              <div className="topbar__sub">
                {aktivesProjekt.objekt.bezeichnung || 'Objekt nicht benannt'}
                {aktivesProjekt.objekt.ort && ` · ${aktivesProjekt.objekt.ort}`}
              </div>
            )}
          </div>
          <div className="spacer" />
          {aktivesProjekt && (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => {
                dispatch({ typ: 'projekt-oeffnen', id: null });
                setAnsicht('projekte');
              }}
            >
              Projekt schließen
            </button>
          )}
        </header>

        <main className="content">
          {effektiveAnsicht === 'dashboard' && (
            <Dashboard onProjektOeffnen={oeffneProjekt} onWechsel={wechsle} />
          )}
          {effektiveAnsicht === 'projekte' && (
            <Projekte onProjektOeffnen={oeffneProjekt} />
          )}
          {effektiveAnsicht === 'konzept' && <Konzept />}
          {effektiveAnsicht === 'pruefung' && <Pruefung befunde={befunde} />}
          {effektiveAnsicht === 'massnahmen' && <Massnahmen />}
          {effektiveAnsicht === 'dokument' && <Dokument />}
          {effektiveAnsicht === 'regelwerk' && <Regelwerk />}
          {effektiveAnsicht === 'verwaltung' && <Verwaltung />}
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
        <span
          className={`navitem__count ${alarm ? 'navitem__count--alarm' : ''}`}
        >
          {anzahl}
        </span>
      )}
    </button>
  );
}
