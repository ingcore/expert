import { useRef, useState } from 'react';
import { useStore, STORAGE_KEY } from '@/state/store';
import { demoProjekt } from '@/domain/factory';
import { berichtsnummerString } from '@/domain/naming';
import { Karte, Kennzahl } from '@/components/ui';
import type { Projekt } from '@/domain/types';

export function Verwaltung() {
  const { state, dispatch } = useStore();
  const dateiRef = useRef<HTMLInputElement>(null);
  const [meldung, setMeldung] = useState<{
    art: 'ok' | 'fehler';
    text: string;
  } | null>(null);

  const speicherGroesse = (() => {
    try {
      return new Blob([localStorage.getItem(STORAGE_KEY) ?? '']).size;
    } catch {
      return 0;
    }
  })();

  function exportieren() {
    const inhalt = JSON.stringify(
      {
        anwendung: 'INGTEC Brandschutzkonzept-Tool',
        version: 1,
        exportiertAm: new Date().toISOString(),
        projekte: state.projekte,
      },
      null,
      2,
    );

    const blob = new Blob([inhalt], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ingtec-brandschutzkonzepte_${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMeldung({
      art: 'ok',
      text: `${state.projekte.length} Projekt(e) exportiert.`,
    });
  }

  async function importieren(datei: File) {
    try {
      const text = await datei.text();
      const daten = JSON.parse(text) as { projekte?: Projekt[] };

      if (!Array.isArray(daten.projekte)) {
        throw new Error('Die Datei enthält kein Feld „projekte“.');
      }

      const ersetzen = confirm(
        `${daten.projekte.length} Projekt(e) gefunden.\n\n` +
          'OK: bestehende Projekte ERSETZEN\n' +
          'Abbrechen: importierte Projekte HINZUFÜGEN',
      );

      // Beim Hinzufügen neue IDs vergeben, damit bestehende Projekte
      // nicht überschrieben werden.
      const importiert = ersetzen
        ? daten.projekte
        : daten.projekte.map((p) => ({
            ...p,
            id: `prj_${Date.now().toString(36)}_${Math.random()
              .toString(36)
              .slice(2, 8)}`,
          }));

      dispatch({
        typ: 'projekte-ersetzen',
        projekte: ersetzen ? importiert : [...importiert, ...state.projekte],
      });

      setMeldung({
        art: 'ok',
        text: `${daten.projekte.length} Projekt(e) ${
          ersetzen ? 'ersetzt' : 'hinzugefügt'
        }.`,
      });
    } catch (fehler) {
      setMeldung({
        art: 'fehler',
        text: `Import fehlgeschlagen: ${
          fehler instanceof Error ? fehler.message : 'unbekannter Fehler'
        }`,
      });
    }
  }

  function allesLoeschen() {
    if (
      !confirm(
        'Alle Projekte löschen? Diese Aktion kann nicht rückgängig gemacht werden; vorher ist eine Sicherung per Export anzulegen.',
      )
    ) {
      return;
    }
    dispatch({ typ: 'projekte-ersetzen', projekte: [] });
    setMeldung({ art: 'ok', text: 'Alle Projekte wurden gelöscht.' });
  }

  return (
    <div className="stack stack--lg">
      <div className="page-head">
        <div>
          <h1 className="page-head__title">Verwaltung</h1>
          <p className="page-head__lead">
            Datensicherung und Übergabe. Die Projekte liegen ausschließlich lokal
            im Browser dieser Arbeitsstation — eine regelmäßige Sicherung per Export ist erforderlich.
          </p>
        </div>
      </div>

      <div className="kpi-grid">
        <Kennzahl label="Projekte" wert={state.projekte.length} ton="brand" />
        <Kennzahl
          label="Mängel gesamt"
          wert={state.projekte.reduce((s, p) => s + p.massnahmen.length, 0)}
        />
        <Kennzahl
          label="Speicherbelegung"
          wert={(speicherGroesse / 1024).toFixed(1)}
          einheit="KB"
          hinweis="im localStorage"
        />
      </div>

      {meldung && (
        <div
          className={`hinweis-box ${
            meldung.art === 'fehler' ? 'hinweis-box--gefahr' : ''
          }`}
        >
          {meldung.text}
        </div>
      )}

      <Karte
        titel="Datensicherung"
        untertitel="Export und Import als JSON-Datei"
      >
        <div className="stack">
          <p className="muted" style={{ fontSize: 'var(--fs-md)' }}>
            Der Export umfasst alle Projekte mit sämtlichen erfassten Daten. Die
            Datei eignet sich als Sicherung und zur Übergabe an eine andere
            Arbeitsstation.
          </p>
          <div className="row row--wrap">
            <button
              type="button"
              className="btn btn--primary"
              onClick={exportieren}
              disabled={state.projekte.length === 0}
            >
              Alle Projekte exportieren
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => dateiRef.current?.click()}
            >
              Aus Datei importieren
            </button>
            <input
              ref={dateiRef}
              type="file"
              accept="application/json,.json"
              className="visually-hidden"
              onChange={(e) => {
                const datei = e.target.files?.[0];
                if (datei) void importieren(datei);
                e.target.value = '';
              }}
            />
          </div>
        </div>
      </Karte>

      <Karte titel="Projektübersicht" flush>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Projekt</th>
                <th style={{ minWidth: '260px' }}>Berichtsnummer</th>
                <th style={{ width: '90px' }}>Mängel</th>
                <th style={{ width: '150px' }}>Geändert</th>
              </tr>
            </thead>
            <tbody>
              {state.projekte.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div style={{ fontWeight: 'var(--fw-medium)' }}>
                      {p.titel}
                    </div>
                    <div className="subtle" style={{ fontSize: 'var(--fs-xs)' }}>
                      {p.auftraggeber.name || '—'}
                    </div>
                  </td>
                  <td className="mono" style={{ fontSize: 'var(--fs-xs)' }}>
                    {berichtsnummerString(p)}
                  </td>
                  <td className="num">{p.massnahmen.length}</td>
                  <td className="subtle nowrap">
                    {new Date(p.geaendertAm).toLocaleString('de-AT', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </td>
                </tr>
              ))}
              {state.projekte.length === 0 && (
                <tr>
                  <td colSpan={4} className="subtle" style={{ textAlign: 'center' }}>
                    Keine Projekte vorhanden
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Karte>

      <Karte titel="Beispieldaten und Zurücksetzen">
        <div className="stack">
          <p className="muted" style={{ fontSize: 'var(--fs-md)' }}>
            Das Beispielprojekt enthält realistische Werte und bewusst einige
            Regelverstöße, damit die Prüflogik und die Mängelbewertung
            unmittelbar sichtbar werden.
          </p>
          <div className="row row--wrap">
            <button
              type="button"
              className="btn"
              onClick={() => {
                dispatch({ typ: 'projekt-anlegen', projekt: demoProjekt() });
                setMeldung({ art: 'ok', text: 'Beispielprojekt angelegt.' });
              }}
            >
              Beispielprojekt anlegen
            </button>
            <span className="spacer" />
            <button
              type="button"
              className="btn btn--danger"
              onClick={allesLoeschen}
              disabled={state.projekte.length === 0}
            >
              Alle Projekte löschen
            </button>
          </div>
        </div>
      </Karte>
    </div>
  );
}
