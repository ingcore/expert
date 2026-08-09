/**
 * Anwendungsrahmen — Navigation und Ansichtswechsel.
 *
 * Der Aufbau folgt PRD Abschnitt 29: Dashboard, Suchmaske,
 * Fahrzeugdetailseite. Ergänzt um die Arbeitsbereiche aus den Abschnitten 26
 * (Watchlist), 25 (Portfolio), 17/18 (Marktentwicklung), 27 (Alerts), 8/36
 * (Quellen und Compliance) und 37/38 (Verwaltung, Score Governance).
 */

import { useMemo, useState } from 'react';
import { Logo } from '../components/Logo';
import { useStore } from './state/store';
import { Dashboard } from './views/Dashboard';
import { Suche } from './views/Suche';
import { Fahrzeugseite } from './views/Fahrzeug';
import { Watchlistseite } from './views/Watchlist';
import { Portfolioseite } from './views/Portfolio';
import { Marktseite } from './views/Markt';
import { Alertseite } from './views/Alerts';
import { Quellenseite } from './views/Quellen';
import { Verwaltungsseite } from './views/Verwaltung';

export type Ansicht =
  | 'dashboard'
  | 'suche'
  | 'fahrzeug'
  | 'watchlist'
  | 'portfolio'
  | 'markt'
  | 'alerts'
  | 'quellen'
  | 'verwaltung';

export function App() {
  const { state, analysen, geladen, grenzfaelle, aktiverBenutzer } = useStore();
  const [ansicht, setAnsicht] = useState<Ansicht>('dashboard');
  const [fahrzeugId, setFahrzeugId] = useState<string | null>(null);

  const ungelesen = state.arbeit.alerts.filter((a) => !a.gelesen).length;
  const aKandidaten = analysen.filter((a) => a.gesamt.rang === 'A').length;

  const gewaehlt = useMemo(
    () => analysen.find((a) => a.fahrzeugId === fahrzeugId) ?? null,
    [analysen, fahrzeugId],
  );

  function oeffneFahrzeug(id: string) {
    setFahrzeugId(id);
    setAnsicht('fahrzeug');
  }

  const titel: Record<Ansicht, string> = {
    dashboard: 'Dashboard',
    suche: 'Suche und Kandidaten',
    fahrzeug: gewaehlt ? gewaehlt.bezeichnung : 'Fahrzeug',
    watchlist: 'Watchlist und Kaufprozess',
    portfolio: 'Portfolio',
    markt: 'Marktentwicklung',
    alerts: 'Benachrichtigungen',
    quellen: 'Datenquellen und Läufe',
    verwaltung: 'Verwaltung',
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <Logo className="sidebar__logo" />
          <div className="sidebar__app">Automotive Asset Radar</div>
          <div className="sidebar__claim">
            Nicht das billigste Fahrzeug.
            <br />
            Das beste verfügbare.
          </div>
        </div>

        <nav className="sidebar__nav" aria-label="Hauptnavigation">
          <div className="sidebar__group">Übersicht</div>
          <NavKnopf
            aktiv={ansicht === 'dashboard'}
            icon="◧"
            label="Dashboard"
            onClick={() => setAnsicht('dashboard')}
          />
          <NavKnopf
            aktiv={ansicht === 'suche'}
            icon="▤"
            label="Suche"
            anzahl={analysen.length}
            onClick={() => setAnsicht('suche')}
          />
          <NavKnopf
            aktiv={ansicht === 'alerts'}
            icon="◔"
            label="Benachrichtigungen"
            anzahl={ungelesen || undefined}
            alarm={ungelesen > 0}
            onClick={() => setAnsicht('alerts')}
          />

          <div className="sidebar__group">Arbeit</div>
          <NavKnopf
            aktiv={ansicht === 'fahrzeug'}
            icon="◈"
            label="Fahrzeugakte"
            deaktiviert={!gewaehlt}
            onClick={() => setAnsicht('fahrzeug')}
          />
          <NavKnopf
            aktiv={ansicht === 'watchlist'}
            icon="✓"
            label="Watchlist"
            anzahl={state.arbeit.watchlist.length || undefined}
            onClick={() => setAnsicht('watchlist')}
          />
          <NavKnopf
            aktiv={ansicht === 'portfolio'}
            icon="▦"
            label="Portfolio"
            anzahl={state.arbeit.portfolio.length || undefined}
            onClick={() => setAnsicht('portfolio')}
          />

          <div className="sidebar__group">Markt und System</div>
          <NavKnopf
            aktiv={ansicht === 'markt'}
            icon="◹"
            label="Marktentwicklung"
            onClick={() => setAnsicht('markt')}
          />
          <NavKnopf
            aktiv={ansicht === 'quellen'}
            icon="⊞"
            label="Quellen und Läufe"
            anzahl={grenzfaelle.length || undefined}
            alarm={grenzfaelle.length > 0}
            onClick={() => setAnsicht('quellen')}
          />
          <NavKnopf
            aktiv={ansicht === 'verwaltung'}
            icon="⚙"
            label="Verwaltung"
            onClick={() => setAnsicht('verwaltung')}
          />
        </nav>

        <div className="sidebar__footer">
          {aktiverBenutzer.name} · {aktiverBenutzer.rolle}
          <br />
          {analysen.length} Fahrzeuge, {aKandidaten} A-Kandidaten
          <br />
          INGTEC GmbH — TECHNIK.WIRKT
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <div className="topbar__eyebrow">INGTEC Automotive Asset Radar</div>
            <div className="topbar__title">{titel[ansicht]}</div>
          </div>
        </header>

        <div className="content">
          {!geladen ? (
            <div className="ladeschirm">
              <p className="ladeschirm__titel">Datenbestand wird aufgebaut</p>
              <p className="ladeschirm__text">
                Die Connectoren durchlaufen alle Beobachtungszeitpunkte: Suche,
                Normalisierung, Identitätszuordnung und Historisierung. Der Bestand wird
                bei jedem Start neu erzeugt, damit nichts angezeigt wird, das die
                Engines nicht selbst hergeleitet haben.
              </p>
            </div>
          ) : (
            <>
              {ansicht === 'dashboard' && (
                <Dashboard oeffneFahrzeug={oeffneFahrzeug} wechsle={setAnsicht} />
              )}
              {ansicht === 'suche' && <Suche oeffneFahrzeug={oeffneFahrzeug} />}
              {ansicht === 'fahrzeug' &&
                (gewaehlt ? (
                  <Fahrzeugseite analyse={gewaehlt} />
                ) : (
                  <div className="empty-state">
                    <p className="empty-state__title">Kein Fahrzeug ausgewählt</p>
                    <p>Wählen Sie in der Suche oder auf dem Dashboard ein Fahrzeug aus.</p>
                  </div>
                ))}
              {ansicht === 'watchlist' && <Watchlistseite oeffneFahrzeug={oeffneFahrzeug} />}
              {ansicht === 'portfolio' && <Portfolioseite />}
              {ansicht === 'markt' && <Marktseite />}
              {ansicht === 'alerts' && <Alertseite oeffneFahrzeug={oeffneFahrzeug} />}
              {ansicht === 'quellen' && <Quellenseite oeffneFahrzeug={oeffneFahrzeug} />}
              {ansicht === 'verwaltung' && <Verwaltungsseite />}
            </>
          )}
        </div>
      </main>
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
      aria-current={aktiv ? 'page' : undefined}
    >
      <span className="navitem__icon" aria-hidden="true">
        {icon}
      </span>
      {label}
      {anzahl !== undefined && (
        <span className={`navitem__count ${alarm ? 'navitem__count--alarm' : ''}`}>
          {anzahl}
        </span>
      )}
    </button>
  );
}
