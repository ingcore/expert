import { useAktivesProjekt } from '@/state/store';
import { neuesBauteil } from '@/domain/factory';
import {
  BAUTEIL_KATEGORIEN,
  FEUERWIDERSTANDSKLASSEN,
  FW_RANG,
} from '@/domain/catalog';
import { Karte, LeerZustand, ZeilenAktion } from '@/components/ui';
import type { Bauteil } from '@/domain/types';

export function KapitelBauteile() {
  const { projekt, patch } = useAktivesProjekt();
  if (!projekt) return null;

  const bauteile = projekt.bauteile;

  function setze(id: string, aenderung: Partial<Bauteil>) {
    patch({
      bauteile: bauteile.map((b) => (b.id === id ? { ...b, ...aenderung } : b)),
    });
  }

  function hinzufuegen() {
    patch({ bauteile: [...bauteile, neuesBauteil()] });
  }

  function entfernen(id: string) {
    patch({ bauteile: bauteile.filter((b) => b.id !== id) });
  }

  const unterschritten = bauteile.filter(
    (b) => FW_RANG[b.istKlasse] < FW_RANG[b.sollKlasse],
  ).length;

  return (
    <Karte
      titel="Bauteilnachweis"
      untertitel={
        unterschritten > 0
          ? `${unterschritten} Bauteil(e) unterschreiten die erforderliche Klasse`
          : 'Soll-/Ist-Vergleich der Feuerwiderstandsklassen nach ÖNORM EN 13501-2'
      }
      aktion={
        <button type="button" className="btn btn--primary btn--sm" onClick={hinzufuegen}>
          + Bauteil
        </button>
      }
      flush={bauteile.length > 0}
    >
      {bauteile.length === 0 ? (
        <LeerZustand
          titel="Keine Bauteile erfasst"
          text="Hier werden die brandschutzrelevanten Bauteile mit erforderlicher und tatsächlicher Feuerwiderstandsklasse erfasst."
          aktion={
            <button type="button" className="btn btn--primary" onClick={hinzufuegen}>
              + Erstes Bauteil anlegen
            </button>
          }
        />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ minWidth: '200px' }}>Bezeichnung</th>
                <th style={{ minWidth: '170px' }}>Kategorie</th>
                <th style={{ minWidth: '140px' }}>Soll</th>
                <th style={{ minWidth: '140px' }}>Ist</th>
                <th style={{ minWidth: '190px' }}>Nachweis</th>
                <th style={{ minWidth: '170px' }}>Bemerkung</th>
                <th style={{ width: '44px' }} />
              </tr>
            </thead>
            <tbody>
              {bauteile.map((b) => {
                const kritisch = FW_RANG[b.istKlasse] < FW_RANG[b.sollKlasse];
                return (
                  <tr key={b.id}>
                    <td>
                      <input
                        className="input"
                        value={b.bezeichnung}
                        placeholder="Bauteil benennen"
                        onChange={(e) =>
                          setze(b.id, { bezeichnung: e.target.value })
                        }
                      />
                    </td>
                    <td>
                      <select
                        className="select"
                        value={b.kategorie}
                        onChange={(e) =>
                          setze(b.id, {
                            kategorie: e.target.value as Bauteil['kategorie'],
                          })
                        }
                      >
                        {BAUTEIL_KATEGORIEN.map((k) => (
                          <option key={k.value} value={k.value}>
                            {k.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        className="select"
                        value={b.sollKlasse}
                        onChange={(e) =>
                          setze(b.id, {
                            sollKlasse: e.target
                              .value as Bauteil['sollKlasse'],
                          })
                        }
                      >
                        {FEUERWIDERSTANDSKLASSEN.map((f) => (
                          <option key={f.value} value={f.value}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        className="select"
                        value={b.istKlasse}
                        style={
                          kritisch
                            ? {
                                borderColor: 'var(--danger)',
                                color: 'var(--danger)',
                                fontWeight: 'var(--fw-semibold)',
                              }
                            : undefined
                        }
                        onChange={(e) =>
                          setze(b.id, {
                            istKlasse: e.target.value as Bauteil['istKlasse'],
                          })
                        }
                      >
                        {FEUERWIDERSTANDSKLASSEN.map((f) => (
                          <option key={f.value} value={f.value}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        className="input"
                        value={b.nachweis}
                        placeholder="Prüfzeugnis, ETA …"
                        onChange={(e) =>
                          setze(b.id, { nachweis: e.target.value })
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="input"
                        value={b.bemerkung}
                        onChange={(e) =>
                          setze(b.id, { bemerkung: e.target.value })
                        }
                      />
                    </td>
                    <td>
                      <ZeilenAktion onLoeschen={() => entfernen(b.id)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Karte>
  );
}
