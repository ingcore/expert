/**
 * Zustand des Prüfbefund-Moduls mit Persistenz im localStorage.
 *
 * Wie im Brandschutzmodul bewusst ohne externe State-Bibliothek: ein Reducer
 * über React Context genügt und hält die Abhängigkeiten schlank.
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
import {
  DEMO_ARBEITSMITTEL,
  DEMO_KUNDEN,
  DEMO_PRUEFER,
  DEMO_STANDORTE,
} from '@/pruefbefund/domain/factory';
import type {
  Asset,
  Customer,
  Inspection,
  Inspector,
  Site,
} from '@/pruefbefund/domain/types';

export const PB_STORAGE_KEY = 'ingtec.pruefbefund.v1';

export interface PbState {
  kunden: Customer[];
  standorte: Site[];
  arbeitsmittel: Asset[];
  pruefer: Inspector[];
  pruefungen: Inspection[];
  /** Aktuell geöffnetes Arbeitsmittel. */
  aktivesAssetId: string | null;
  /** Aktuell bearbeitete Prüfung. */
  aktivePruefungId: string | null;
  geladen: boolean;
}

export type PbAction =
  | { typ: 'laden'; state: Omit<PbState, 'geladen'> }
  | { typ: 'asset-anlegen'; asset: Asset }
  | { typ: 'asset-aktualisieren'; asset: Asset }
  | { typ: 'asset-loeschen'; id: string }
  | { typ: 'asset-oeffnen'; id: string | null }
  | { typ: 'pruefung-anlegen'; pruefung: Inspection }
  | { typ: 'pruefung-aktualisieren'; pruefung: Inspection }
  | { typ: 'pruefung-loeschen'; id: string }
  | { typ: 'pruefung-oeffnen'; id: string | null }
  | { typ: 'alles-zuruecksetzen' };

function demoZustand(): Omit<PbState, 'geladen'> {
  return {
    kunden: DEMO_KUNDEN,
    standorte: DEMO_STANDORTE,
    arbeitsmittel: DEMO_ARBEITSMITTEL,
    pruefer: DEMO_PRUEFER,
    pruefungen: [],
    aktivesAssetId: null,
    aktivePruefungId: null,
  };
}

const initialState: PbState = { ...demoZustand(), geladen: false };

function reducer(state: PbState, action: PbAction): PbState {
  switch (action.typ) {
    case 'laden':
      return { ...state, ...action.state, geladen: true };

    case 'asset-anlegen':
      return {
        ...state,
        arbeitsmittel: [action.asset, ...state.arbeitsmittel],
        aktivesAssetId: action.asset.id,
      };

    case 'asset-aktualisieren': {
      const aktualisiert: Asset = {
        ...action.asset,
        geaendertAm: new Date().toISOString(),
      };
      return {
        ...state,
        arbeitsmittel: state.arbeitsmittel.map((a) =>
          a.id === aktualisiert.id ? aktualisiert : a,
        ),
      };
    }

    case 'asset-loeschen':
      return {
        ...state,
        arbeitsmittel: state.arbeitsmittel.filter((a) => a.id !== action.id),
        aktivesAssetId:
          state.aktivesAssetId === action.id ? null : state.aktivesAssetId,
      };

    case 'asset-oeffnen':
      return { ...state, aktivesAssetId: action.id };

    case 'pruefung-anlegen':
      return {
        ...state,
        pruefungen: [action.pruefung, ...state.pruefungen],
        aktivePruefungId: action.pruefung.id,
        aktivesAssetId: action.pruefung.assetId,
      };

    case 'pruefung-aktualisieren': {
      const aktualisiert: Inspection = {
        ...action.pruefung,
        geaendertAm: new Date().toISOString(),
      };
      return {
        ...state,
        pruefungen: state.pruefungen.map((p) =>
          p.id === aktualisiert.id ? aktualisiert : p,
        ),
      };
    }

    case 'pruefung-loeschen':
      return {
        ...state,
        pruefungen: state.pruefungen.filter((p) => p.id !== action.id),
        aktivePruefungId:
          state.aktivePruefungId === action.id ? null : state.aktivePruefungId,
      };

    case 'pruefung-oeffnen':
      return { ...state, aktivePruefungId: action.id };

    case 'alles-zuruecksetzen':
      return { ...demoZustand(), geladen: true };

    default:
      return state;
  }
}

interface PbStoreValue {
  state: PbState;
  dispatch: Dispatch<PbAction>;
  aktivesAsset: Asset | null;
  aktivePruefung: Inspection | null;
}

const PbContext = createContext<PbStoreValue | null>(null);

export function PruefbefundProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    let geladen = demoZustand();
    try {
      const roh = localStorage.getItem(PB_STORAGE_KEY);
      if (roh) {
        const parsed = JSON.parse(roh) as Partial<PbState>;
        if (Array.isArray(parsed.arbeitsmittel)) {
          geladen = {
            kunden: parsed.kunden ?? DEMO_KUNDEN,
            standorte: parsed.standorte ?? DEMO_STANDORTE,
            arbeitsmittel: parsed.arbeitsmittel,
            pruefer: parsed.pruefer ?? DEMO_PRUEFER,
            pruefungen: parsed.pruefungen ?? [],
            aktivesAssetId: parsed.aktivesAssetId ?? null,
            aktivePruefungId: parsed.aktivePruefungId ?? null,
          };
        }
      }
    } catch {
      // Beschädigter Speicherstand: mit dem Demobestand neu starten.
      geladen = demoZustand();
    }
    dispatch({ typ: 'laden', state: geladen });
  }, []);

  useEffect(() => {
    if (!state.geladen) return;
    try {
      const { geladen: _geladen, ...rest } = state;
      localStorage.setItem(PB_STORAGE_KEY, JSON.stringify(rest));
    } catch {
      // Speicher voll oder nicht verfügbar — die Anwendung bleibt nutzbar.
    }
  }, [state]);

  const aktivesAsset = useMemo(
    () => state.arbeitsmittel.find((a) => a.id === state.aktivesAssetId) ?? null,
    [state.arbeitsmittel, state.aktivesAssetId],
  );

  const aktivePruefung = useMemo(
    () => state.pruefungen.find((p) => p.id === state.aktivePruefungId) ?? null,
    [state.pruefungen, state.aktivePruefungId],
  );

  const wert = useMemo(
    () => ({ state, dispatch, aktivesAsset, aktivePruefung }),
    [state, aktivesAsset, aktivePruefung],
  );

  return <PbContext.Provider value={wert}>{children}</PbContext.Provider>;
}

export function usePruefbefund(): PbStoreValue {
  const ctx = useContext(PbContext);
  if (!ctx) {
    throw new Error('usePruefbefund muss innerhalb von PruefbefundProvider stehen');
  }
  return ctx;
}

/* ==========================================================================
 * Komfort-Hooks
 * ======================================================================= */

/** Teiländerung der aktiven Prüfung zurückschreiben. */
export function usePruefungPatch() {
  const { aktivePruefung, dispatch } = usePruefbefund();
  return useMemo(
    () => (aenderung: Partial<Inspection>) => {
      if (!aktivePruefung) return;
      dispatch({
        typ: 'pruefung-aktualisieren',
        pruefung: { ...aktivePruefung, ...aenderung },
      });
    },
    [aktivePruefung, dispatch],
  );
}

/** Auflösung der Bezüge einer Prüfung auf die Stammdaten. */
export function usePruefungKontext(pruefung: Inspection | null) {
  const { state } = usePruefbefund();
  return useMemo(() => {
    if (!pruefung) {
      return { asset: null, customer: null, site: null, inspector: null };
    }
    const asset = state.arbeitsmittel.find((a) => a.id === pruefung.assetId) ?? null;
    const customer = asset
      ? (state.kunden.find((k) => k.id === asset.customerId) ?? null)
      : null;
    const site = asset
      ? (state.standorte.find((s) => s.id === asset.siteId) ?? null)
      : null;
    const inspector =
      state.pruefer.find((p) => p.id === pruefung.inspectorId) ?? null;
    return { asset, customer, site, inspector };
  }, [pruefung, state.arbeitsmittel, state.kunden, state.standorte, state.pruefer]);
}
