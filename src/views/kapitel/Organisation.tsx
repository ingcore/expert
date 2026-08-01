import { useAktivesProjekt } from '@/state/store';
import {
  Abschnitt,
  Karte,
  Schalter,
  TextBereich,
  TextFeld,
  ZahlFeld,
} from '@/components/ui';

export function KapitelOrganisation() {
  const { projekt, patch } = useAktivesProjekt();
  if (!projekt) return null;

  const o = projekt.organisation;

  function setze(aenderung: Partial<typeof o>) {
    patch({ organisation: { ...o, ...aenderung } });
  }

  return (
    <>
      <Karte
        titel="Brandschutzorganisation"
        untertitel="Zuständige Personen nach TRVB O 119"
      >
        <div className="form-grid form-grid--2">
          <div className="field span-full">
            <Schalter
              label="Brandschutzbeauftragter erforderlich"
              wert={o.brandschutzbeauftragterErforderlich}
              onChange={(brandschutzbeauftragterErforderlich) =>
                setze({ brandschutzbeauftragterErforderlich })
              }
            />
          </div>
          <TextFeld
            label="Brandschutzbeauftragter"
            wert={o.brandschutzbeauftragter}
            onChange={(brandschutzbeauftragter) =>
              setze({ brandschutzbeauftragter })
            }
            hint="Namentliche, schriftliche Bestellung erforderlich"
          />
          <ZahlFeld
            label="Anzahl Brandschutzwarte"
            wert={o.brandschutzwarte}
            onChange={(brandschutzwarte) => setze({ brandschutzwarte })}
          />
        </div>
      </Karte>

      <Karte
        titel="Dokumentation"
        untertitel="Ordnung, Pläne und Aufzeichnungen"
      >
        <Abschnitt titel="Vorhandene Unterlagen">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: 'var(--sp-3)',
            }}
          >
            <Schalter
              label="Brandschutzordnung vorhanden"
              wert={o.brandschutzordnungVorhanden}
              onChange={(brandschutzordnungVorhanden) =>
                setze({ brandschutzordnungVorhanden })
              }
            />
            <Schalter
              label="Brandschutzpläne nach TRVB O 121"
              wert={o.brandschutzplaeneVorhanden}
              onChange={(brandschutzplaeneVorhanden) =>
                setze({ brandschutzplaeneVorhanden })
              }
            />
            <Schalter
              label="Feuerwehr-Laufkarten vorhanden"
              wert={o.laufkartenVorhanden}
              onChange={(laufkartenVorhanden) => setze({ laufkartenVorhanden })}
            />
            <Schalter
              label="Brandschutzbuch wird geführt"
              wert={o.brandschutzbuchGefuehrt}
              onChange={(brandschutzbuchGefuehrt) =>
                setze({ brandschutzbuchGefuehrt })
              }
            />
          </div>
        </Abschnitt>

        <div className="form-grid" style={{ marginTop: 'var(--sp-5)' }}>
          <TextFeld
            label="Stand der Brandschutzpläne"
            wert={o.brandschutzplaeneStand}
            onChange={(brandschutzplaeneStand) =>
              setze({ brandschutzplaeneStand })
            }
            placeholder="z. B. 2024-11"
          />
        </div>
      </Karte>

      <Karte
        titel="Übungen und Eigenkontrolle"
        untertitel="Intervalle und letzte Durchführung"
      >
        <div className="form-grid">
          <ZahlFeld
            label="Intervall Räumungsübung"
            einheit="Monate"
            wert={o.raeumungsuebungIntervallMonate}
            onChange={(raeumungsuebungIntervallMonate) =>
              setze({ raeumungsuebungIntervallMonate })
            }
          />
          <TextFeld
            label="Letzte Räumungsübung"
            type="date"
            wert={o.letzteRaeumungsuebung}
            onChange={(letzteRaeumungsuebung) =>
              setze({ letzteRaeumungsuebung })
            }
          />
          <ZahlFeld
            label="Intervall Eigenkontrolle"
            einheit="Monate"
            wert={o.eigenkontrolleIntervallMonate}
            onChange={(eigenkontrolleIntervallMonate) =>
              setze({ eigenkontrolleIntervallMonate })
            }
          />
        </div>

        <TextBereich
          label="Bemerkung"
          wert={o.bemerkung}
          rows={4}
          onChange={(bemerkung) => setze({ bemerkung })}
          className="span-full"
          placeholder="Ausbildungsstand, Bestellungsnachweise, besondere organisatorische Regelungen …"
        />
      </Karte>
    </>
  );
}
