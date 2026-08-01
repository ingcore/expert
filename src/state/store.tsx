/**
 * Anwendungszustand mit Persistenz im localStorage.
 *
 * Bewusst ohne externe State-Bibliothek: Ein Reducer über React Context
 * reicht für den Umfang aus und hält die Abhängigkeiten schlank.
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react';
import { demoProjekt, neuesProjekt } from '@/domain/factory';
import type { Projekt } from '@/domain/types';

const STORAGE_KEY = 'ingtec.bsk.v1';

export interface AppState {
  projekte: Projekt[];
  /** Aktuell geöffnetes Projekt (null = Übersicht). */
  aktivesProjektId: string | null;
  /** Wurde der Zustand aus dem Speicher geladen? */
  geladen: boolean;
}

export type Action =
  | { typ: 'laden'; state: Pick<AppState, 'projekte' | 'aktivesProjektId'> }
  | { typ: 'projekt-anlegen'; projekt: Projekt }
  | { typ: 'projekt-aktualisieren'; projekt: Projekt }
  | { typ: 'projekt-loeschen'; id: string }
  | { typ: 'projekt-duplizieren'; id: string }
  | { typ: 'projekt-oeffnen'; id: string | null }
  | { typ: 'projekte-ersetzen'; projekte: Projekt[] };

const initialState: AppState = {
  projekte: [],
  aktivesProjektId: null,
  geladen: false,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.typ) {
    case 'laden':
      return { ...state, ...action.state, geladen: true };

    case 'projekt-anlegen':
      return {
        ...state,
        projekte: [action.projekt, ...state.projekte],
        aktivesProjektId: action.projekt.id,
      };

    case 'projekt-aktualisieren': {
      const aktualisiert: Projekt = {
        ...action.projekt,
        geaendertAm: new Date().toISOString(),
      };
      return {
        ...state,
        projekte: state.projekte.map((p) =>
          p.id === aktualisiert.id ? aktualisiert : p,
        ),
      };
    }

    case 'projekt-loeschen':
      return {
        ...state,
        projekte: state.projekte.filter((p) => p.id !== action.id),
        aktivesProjektId:
          state.aktivesProjektId === action.id ? null : state.aktivesProjektId,
      };

    case 'projekt-duplizieren': {
      const quelle = state.projekte.find((p) => p.id === action.id);
      if (!quelle) return state;
      const jetzt = new Date().toISOString();
      const kopie: Projekt = {
        ...structuredClone(quelle),
        id: `prj_${Date.now().toString(36)}_${Math.random()
          .toString(36)
          .slice(2, 8)}`,
        titel: `${quelle.titel} (Kopie)`,
        status: 'entwurf',
        erstelltAm: jetzt,
        geaendertAm: jetzt,
      };
      return {
        ...state,
        projekte: [kopie, ...state.projekte],
        aktivesProjektId: kopie.id,
      };
    }

    case 'projekt-oeffnen':
      return { ...state, aktivesProjektId: action.id };

    case 'projekte-ersetzen':
      return { ...state, projekte: action.projekte, aktivesProjektId: null };

    default:
      return state;
  }
}

interface StoreValue {
  state: AppState;
  dispatch: Dispatch<Action>;
  aktivesProjekt: Projekt | null;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Einmalig aus dem Speicher laden; beim ersten Start Demodaten anlegen.
  useEffect(() => {
    let geladen: Pick<AppState, 'projekte' | 'aktivesProjektId'> = {
      projekte: [],
      aktivesProjektId: null,
    };

    try {
      const roh = localStorage.getItem(STORAGE_KEY);
      if (roh) {
        const parsed = JSON.parse(roh) as Partial<AppState>;
        if (Array.isArray(parsed.projekte)) {
          geladen = {
            projekte: parsed.projekte,
            aktivesProjektId: parsed.aktivesProjektId ?? null,
          };
        }
      } else {
        geladen = { projekte: [demoProjekt()], aktivesProjektId: null };
      }
    } catch {
      // Beschädigter Speicherstand: mit Demodaten neu starten, statt zu scheitern.
      geladen = { projekte: [demoProjekt()], aktivesProjektId: null };
    }

    dispatch({ typ: 'laden', state: geladen });
  }, []);

  // Nach dem Laden bei jeder Änderung persistieren.
  useEffect(() => {
    if (!state.geladen) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          projekte: state.projekte,
          aktivesProjektId: state.aktivesProjektId,
        }),
      );
    } catch {
      // Speicher voll oder nicht verfügbar — die Anwendung bleibt nutzbar.
    }
  }, [state.projekte, state.aktivesProjektId, state.geladen]);

  const aktivesProjekt = useMemo(
    () => state.projekte.find((p) => p.id === state.aktivesProjektId) ?? null,
    [state.projekte, state.aktivesProjektId],
  );

  const wert = useMemo(
    () => ({ state, dispatch, aktivesProjekt }),
    [state, aktivesProjekt],
  );

  return (
    <StoreContext.Provider value={wert}>{children}</StoreContext.Provider>
  );
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore muss innerhalb von StoreProvider stehen');
  return ctx;
}

/**
 * Komfort-Hook für das aktive Projekt. `patch` schreibt eine Teiländerung
 * zurück in den Store.
 */
export function useAktivesProjekt() {
  const { aktivesProjekt, dispatch } = useStore();

  const patch = useMemo(
    () => (aenderung: Partial<Projekt>) => {
      if (!aktivesProjekt) return;
      dispatch({
        typ: 'projekt-aktualisieren',
        projekt: { ...aktivesProjekt, ...aenderung },
      });
    },
    [aktivesProjekt, dispatch],
  );

  return { projekt: aktivesProjekt, patch };
}

export { neuesProjekt, demoProjekt, STORAGE_KEY };
