/**
 * Anwendungszustand.
 *
 * Der Zustand zerfällt in zwei Teile, und die Trennung ist bewusst:
 *
 *   **Beobachteter Bestand** — Fahrzeuge, Inserate, Beobachtungen, Verkäufer,
 *   Audit Trail. Er entsteht bei jedem Start durch echte Collector-Läufe über
 *   die Connectoren und wird **nicht** gespeichert. In der Zielarchitektur
 *   liegt er in PostgreSQL (PRD Abschnitt 31); ihn im Browser einzufrieren
 *   würde eine Persistenz vortäuschen, die es hier nicht gibt.
 *
 *   **Arbeitszustand** — Watchlist, Prüfergebnisse, Notizen, Nutzerbefunde,
 *   Suchaufträge, Alerts, Portfolio und die Systemparameter. Das ist die
 *   Arbeit des Benutzers, und sie überlebt den Neustart im `localStorage`.
 *
 * Die Analysen sind kein Zustand. Sie werden aus Bestand und Parametern
 * abgeleitet und bei jeder Änderung neu berechnet — für vierzehn Fahrzeuge in
 * wenigen Millisekunden. Ein zwischengespeicherter Score wäre ein Score, der
 * von seinen Eingaben abweichen kann.
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from 'react';

import type {
  Alert,
  Benutzer,
  Notiz,
  Nutzerbefund,
  Portfoliofahrzeug,
  Pruefstatus,
  Suchauftrag,
  Watchlisteintrag,
  WatchlistStatus,
} from '../domain/types';
import { STICHTAG } from '../domain/format';
import { PLATTFORMEN } from '../wissen/plattformen';
import { vorgabeParameter, type Systemparameter } from '../engine/gewichte';
import { analysiereBestand, type Fahrzeuganalyse } from '../engine/analyse';
import { erzeugeAlerts } from '../engine/alerts';
import { rechneRestauration, type Zustandserfassung } from '../engine/restauration';
import { leererBestand, type Bestand, type Grenzfall, type Laufergebnis } from '../connectors/lauf';
import {
  BENUTZER,
  baueStartbestand,
  seedPortfolio,
  seedSuchauftraege,
  seedWatchlist,
} from '../daten/seed';

const SPEICHER = 'ingtec-radar-arbeitszustand-v1';

/* ==========================================================================
 * Zustand
 * ======================================================================= */

export interface Arbeitszustand {
  parameter: Systemparameter;
  suchauftraege: Suchauftrag[];
  watchlist: Watchlisteintrag[];
  portfolio: Portfoliofahrzeug[];
  alerts: Alert[];
  /** Manuell erfasste Restaurationszustände je Fahrzeug. */
  zustaende: Record<string, Zustandserfassung[]>;
  /** Nachträglich erfasste Notizen je Fahrzeug. */
  notizen: Record<string, Notiz[]>;
  /** Nachträglich erfasste Nutzerbefunde je Fahrzeug. */
  befunde: Record<string, Nutzerbefund[]>;
  aktiverBenutzerId: string;
}

export interface Radarzustand {
  bestand: Bestand;
  laeufe: Laufergebnis[];
  arbeit: Arbeitszustand;
}

export type Aktion =
  | { typ: 'bestand-gesetzt'; bestand: Bestand; laeufe: Laufergebnis[] }
  | { typ: 'watchlist-aufnehmen'; fahrzeugId: string }
  | { typ: 'watchlist-vorbelegen'; eintraege: Watchlisteintrag[] }
  | { typ: 'watchlist-status'; id: string; status: WatchlistStatus }
  | { typ: 'watchlist-bemerkung'; id: string; text: string }
  | { typ: 'watchlist-entfernen'; id: string }
  | { typ: 'anfrage-freigeben'; id: string }
  | { typ: 'pruefpunkt'; id: string; punktId: string; status: Pruefstatus; bemerkung: string }
  | { typ: 'alert-gelesen'; id: string }
  | { typ: 'alerts-alle-gelesen' }
  | { typ: 'alerts-erzeugt'; neue: Alert[] }
  | { typ: 'parameter'; parameter: Systemparameter }
  | { typ: 'parameter-zuruecksetzen' }
  | { typ: 'suchauftrag-umschalten'; id: string }
  | { typ: 'notiz'; fahrzeugId: string; text: string }
  | { typ: 'befund'; fahrzeugId: string; feld: string; system: string; nutzer: string; beleg: string }
  | { typ: 'zustand'; fahrzeugId: string; zustand: Zustandserfassung[] }
  | { typ: 'benutzer'; id: string }
  | { typ: 'portfolio-marktwert'; id: string; wert: number };

function jetzt(): string {
  return STICHTAG;
}

function reducer(state: Radarzustand, aktion: Aktion): Radarzustand {
  const arbeit = state.arbeit;

  switch (aktion.typ) {
    case 'bestand-gesetzt':
      return { ...state, bestand: aktion.bestand, laeufe: aktion.laeufe };

    case 'watchlist-aufnehmen': {
      if (arbeit.watchlist.some((w) => w.fahrzeugId === aktion.fahrzeugId)) return state;
      const eintrag: Watchlisteintrag = {
        id: `wl-${Date.now()}`,
        fahrzeugId: aktion.fahrzeugId,
        status: 'beobachten',
        aufgenommenAm: jetzt(),
        geaendertAm: jetzt(),
        verantwortlich: benutzerName(arbeit),
        bemerkung: '',
        pruefung: [],
        anfrageVersendetAm: null,
      };
      return { ...state, arbeit: { ...arbeit, watchlist: [eintrag, ...arbeit.watchlist] } };
    }

    case 'watchlist-vorbelegen':
      if (arbeit.watchlist.length > 0) return state;
      return { ...state, arbeit: { ...arbeit, watchlist: aktion.eintraege } };

    case 'watchlist-status':
      return {
        ...state,
        arbeit: {
          ...arbeit,
          watchlist: arbeit.watchlist.map((w) =>
            w.id === aktion.id ? { ...w, status: aktion.status, geaendertAm: jetzt() } : w,
          ),
        },
      };

    case 'watchlist-bemerkung':
      return {
        ...state,
        arbeit: {
          ...arbeit,
          watchlist: arbeit.watchlist.map((w) =>
            w.id === aktion.id ? { ...w, bemerkung: aktion.text, geaendertAm: jetzt() } : w,
          ),
        },
      };

    case 'watchlist-entfernen':
      return {
        ...state,
        arbeit: { ...arbeit, watchlist: arbeit.watchlist.filter((w) => w.id !== aktion.id) },
      };

    case 'anfrage-freigeben':
      return {
        ...state,
        arbeit: {
          ...arbeit,
          watchlist: arbeit.watchlist.map((w) =>
            w.id === aktion.id
              ? { ...w, anfrageVersendetAm: jetzt(), status: 'unterlagen-angefordert', geaendertAm: jetzt() }
              : w,
          ),
        },
      };

    case 'pruefpunkt':
      return {
        ...state,
        arbeit: {
          ...arbeit,
          watchlist: arbeit.watchlist.map((w) => {
            if (w.id !== aktion.id) return w;
            const ohne = w.pruefung.filter((p) => p.punktId !== aktion.punktId);
            return {
              ...w,
              geaendertAm: jetzt(),
              pruefung: [
                ...ohne,
                {
                  punktId: aktion.punktId,
                  status: aktion.status,
                  bemerkung: aktion.bemerkung,
                  geprueftAm: jetzt(),
                  geprueftVon: benutzerName(arbeit),
                },
              ],
            };
          }),
        },
      };

    case 'alert-gelesen':
      return {
        ...state,
        arbeit: {
          ...arbeit,
          alerts: arbeit.alerts.map((a) => (a.id === aktion.id ? { ...a, gelesen: true } : a)),
        },
      };

    case 'alerts-alle-gelesen':
      return {
        ...state,
        arbeit: { ...arbeit, alerts: arbeit.alerts.map((a) => ({ ...a, gelesen: true })) },
      };

    case 'alerts-erzeugt': {
      const bekannt = new Set(arbeit.alerts.map((a) => a.id));
      const neue = aktion.neue.filter((a) => !bekannt.has(a.id));
      if (neue.length === 0) return state;
      return { ...state, arbeit: { ...arbeit, alerts: [...neue, ...arbeit.alerts] } };
    }

    case 'parameter':
      return { ...state, arbeit: { ...arbeit, parameter: aktion.parameter } };

    case 'parameter-zuruecksetzen':
      return { ...state, arbeit: { ...arbeit, parameter: vorgabeParameter() } };

    case 'suchauftrag-umschalten':
      return {
        ...state,
        arbeit: {
          ...arbeit,
          suchauftraege: arbeit.suchauftraege.map((s) =>
            s.id === aktion.id ? { ...s, aktiv: !s.aktiv } : s,
          ),
        },
      };

    case 'notiz': {
      const bisher = arbeit.notizen[aktion.fahrzeugId] ?? [];
      const neu: Notiz = {
        id: `notiz-${Date.now()}`,
        zeitpunkt: jetzt(),
        verfasser: benutzerName(arbeit),
        text: aktion.text,
      };
      return {
        ...state,
        arbeit: {
          ...arbeit,
          notizen: { ...arbeit.notizen, [aktion.fahrzeugId]: [...bisher, neu] },
        },
      };
    }

    case 'befund': {
      const bisher = arbeit.befunde[aktion.fahrzeugId] ?? [];
      const neu: Nutzerbefund = {
        id: `befund-${Date.now()}`,
        zeitpunkt: jetzt(),
        verfasser: benutzerName(arbeit),
        feld: aktion.feld,
        behauptungSystem: aktion.system,
        befundNutzer: aktion.nutzer,
        beleg: aktion.beleg || null,
      };
      return {
        ...state,
        arbeit: {
          ...arbeit,
          befunde: { ...arbeit.befunde, [aktion.fahrzeugId]: [...bisher, neu] },
        },
      };
    }

    case 'zustand':
      return {
        ...state,
        arbeit: {
          ...arbeit,
          zustaende: { ...arbeit.zustaende, [aktion.fahrzeugId]: aktion.zustand },
        },
      };

    case 'benutzer':
      return { ...state, arbeit: { ...arbeit, aktiverBenutzerId: aktion.id } };

    case 'portfolio-marktwert':
      return {
        ...state,
        arbeit: {
          ...arbeit,
          portfolio: arbeit.portfolio.map((p) =>
            p.id === aktion.id ? { ...p, marktwertAktuell: aktion.wert } : p,
          ),
        },
      };

    default:
      return state;
  }
}

function benutzerName(arbeit: Arbeitszustand): string {
  return BENUTZER.find((b) => b.id === arbeit.aktiverBenutzerId)?.name ?? 'Unbekannt';
}

/* ==========================================================================
 * Persistenz des Arbeitszustandes
 * ======================================================================= */

function ladeArbeitszustand(): Arbeitszustand | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const roh = localStorage.getItem(SPEICHER);
    if (!roh) return null;
    const geladen = JSON.parse(roh) as Partial<Arbeitszustand>;
    // Parameter werden mit der Vorgabe zusammengeführt, damit ein später
    // ergänzter Parameter nicht als `undefined` in die Engines läuft.
    return {
      parameter: { ...vorgabeParameter(), ...(geladen.parameter ?? {}) },
      suchauftraege: geladen.suchauftraege ?? seedSuchauftraege(),
      watchlist: geladen.watchlist ?? [],
      portfolio: geladen.portfolio ?? seedPortfolio(),
      alerts: geladen.alerts ?? [],
      zustaende: geladen.zustaende ?? {},
      notizen: geladen.notizen ?? {},
      befunde: geladen.befunde ?? {},
      aktiverBenutzerId: geladen.aktiverBenutzerId ?? 'u-1',
    };
  } catch {
    return null;
  }
}

function neuerArbeitszustand(): Arbeitszustand {
  return {
    parameter: vorgabeParameter(),
    suchauftraege: seedSuchauftraege(),
    watchlist: [],
    portfolio: seedPortfolio(),
    alerts: [],
    zustaende: {},
    notizen: {},
    befunde: {},
    aktiverBenutzerId: 'u-1',
  };
}

/* ==========================================================================
 * Kontext
 * ======================================================================= */

interface Kontextwert {
  state: Radarzustand;
  dispatch: (aktion: Aktion) => void;
  analysen: Fahrzeuganalyse[];
  analyseZu: (fahrzeugId: string) => Fahrzeuganalyse | undefined;
  grenzfaelle: Grenzfall[];
  benutzer: Benutzer[];
  aktiverBenutzer: Benutzer;
  geladen: boolean;
}

const Kontext = createContext<Kontextwert | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [geladen, setGeladen] = useState(false);
  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    bestand: leererBestand(),
    laeufe: [],
    arbeit: ladeArbeitszustand() ?? neuerArbeitszustand(),
  }));

  // Der beobachtete Bestand entsteht bei jedem Start neu — über echte
  // Connector-Läufe, nicht aus einem gespeicherten Abzug.
  useEffect(() => {
    let abgebrochen = false;
    void baueStartbestand(state.arbeit.parameter).then(({ bestand, laeufe }) => {
      if (abgebrochen) return;
      dispatch({ typ: 'bestand-gesetzt', bestand, laeufe });
      setGeladen(true);
    });
    return () => {
      abgebrochen = true;
    };
    // Absichtlich nur einmal: Ein Parameterwechsel ändert die Bewertung, nicht
    // den beobachteten Bestand.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(SPEICHER, JSON.stringify(state.arbeit));
    } catch {
      // Kein Speicher verfügbar (privater Modus, Kontingent) — die Anwendung
      // arbeitet weiter, nur ohne Persistenz.
    }
  }, [state.arbeit]);

  const analysen = useMemo(() => {
    if (state.bestand.fahrzeuge.length === 0) return [];
    // Notizen und Befunde aus dem Arbeitszustand fließen in die Analyse ein,
    // ohne den beobachteten Bestand zu verändern.
    const fahrzeuge = state.bestand.fahrzeuge.map((f) => ({
      ...f,
      notizen: [...f.notizen, ...(state.arbeit.notizen[f.id] ?? [])],
      nutzerbefunde: [...f.nutzerbefunde, ...(state.arbeit.befunde[f.id] ?? [])],
    }));

    return analysiereBestand(fahrzeuge, state.bestand.inserate, {
      plattformen: PLATTFORMEN,
      verkaeufer: state.bestand.verkaeufer,
      alleInserate: state.bestand.inserate,
      parameter: state.arbeit.parameter,
    }).map((analyse) => {
      const eigener = state.arbeit.zustaende[analyse.fahrzeugId];
      return eigener ? neuBerechnenMitZustand(analyse, eigener) : analyse;
    });
  }, [state.bestand, state.arbeit.parameter, state.arbeit.notizen, state.arbeit.befunde, state.arbeit.zustaende]);

  // Alerts werden aus den Analysen erzeugt, sobald der Bestand steht.
  useEffect(() => {
    if (analysen.length === 0) return;
    const { neue } = erzeugeAlerts(
      analysen,
      state.arbeit.suchauftraege,
      state.arbeit.alerts,
      state.arbeit.parameter,
    );
    if (neue.length > 0) dispatch({ typ: 'alerts-erzeugt', neue });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysen]);

  // Die Watchlist bekommt beim ersten Lauf einen Beispieleintrag, damit der
  // Prozess aus Abschnitt 26 nicht leer beginnt. Welches Fahrzeug das ist,
  // entscheidet die Bewertung — nicht eine im Code hinterlegte Kennung.
  useEffect(() => {
    if (!geladen) return;
    if (state.arbeit.watchlist.length > 0) return;
    const kandidat = analysen.find((a) => a.buySignal.ausgeloest) ?? analysen[0];
    if (!kandidat) return;
    dispatch({ typ: 'watchlist-vorbelegen', eintraege: seedWatchlist(kandidat.fahrzeugId) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geladen, analysen.length]);

  const wert = useMemo<Kontextwert>(
    () => ({
      state,
      dispatch,
      analysen,
      analyseZu: (id: string) => analysen.find((a) => a.fahrzeugId === id),
      grenzfaelle: state.laeufe.flatMap((l) => l.grenzfaelle),
      benutzer: BENUTZER,
      aktiverBenutzer:
        BENUTZER.find((b) => b.id === state.arbeit.aktiverBenutzerId) ?? BENUTZER[0],
      geladen,
    }),
    [state, analysen, geladen],
  );

  return <Kontext.Provider value={wert}>{children}</Kontext.Provider>;
}

/**
 * Ersetzt die Restaurationsrechnung einer Analyse durch eine mit manuell
 * erfasstem Zustand. Alles andere bleibt unverändert — die Zustandserfassung
 * betrifft ausdrücklich nur die Restaurationsrechnung.
 */
function neuBerechnenMitZustand(
  analyse: Fahrzeuganalyse,
  zustand: Zustandserfassung[],
): Fahrzeuganalyse {
  return {
    ...analyse,
    restauration: rechneRestauration({
      kaufpreis: analyse.aktuell.preis,
      zustand,
      hersteller: analyse.aktuell.hersteller,
      reihe: analyse.reihe,
      bewertung: analyse.bewertung,
      kilometerstand: analyse.aktuell.kilometerstand,
    }),
  };
}

export function useStore(): Kontextwert {
  const wert = useContext(Kontext);
  if (!wert) throw new Error('useStore außerhalb des StoreProviders verwendet.');
  return wert;
}
