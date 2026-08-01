import { useAktivesProjekt } from '@/state/store';
import {
  BAUWEISEN,
  FLUCHTWEG_MAX_LAENGE,
  GEBAEUDEKLASSEN,
  GK_BY_KEY,
  RISIKOKLASSEN,
} from '@/domain/catalog';
import { Auswahl, Karte, TextBereich, ZahlFeld } from '@/components/ui';
import type { Gebaeudeklasse } from '@/domain/types';

export function KapitelGebaeude() {
  const { projekt, patch } = useAktivesProjekt();
  if (!projekt) return null;

  const g = projekt.gebaeude;
  const def = GK_BY_KEY[g.gebaeudeklasse];

  function setzeGebaeude(aenderung: Partial<typeof g>) {
    patch({ gebaeude: { ...g, ...aenderung } });
  }

  /** Leitet die Gebäudeklasse aus Fluchtniveau und Geschoßanzahl ab. */
  function vorschlagKlasse(): Gebaeudeklasse {
    if (g.fluchtniveau > 11 || g.geschosseOberirdisch > 4) return 'GK5';
    if (g.fluchtniveau > 7 || g.geschosseOberirdisch === 4) return 'GK4';
    return 'GK3';
  }

  const vorschlag = vorschlagKlasse();
  const abweichend = vorschlag !== g.gebaeudeklasse;

  return (
    <>
      <Karte
        titel="Einstufung"
        untertitel="Gebäudeklasse nach OIB-Richtlinie 2, Punkt 1"
      >
        <div className="form-grid form-grid--2">
          <Auswahl
            label="Gebäudeklasse"
            wert={g.gebaeudeklasse}
            optionen={GEBAEUDEKLASSEN.map((k) => ({
              value: k.klasse,
              label: `${k.klasse} — ${k.kurz}`,
            }))}
            onChange={(gebaeudeklasse) => setzeGebaeude({ gebaeudeklasse })}
          />
          <Auswahl
            label="Bauweise"
            wert={g.bauweise}
            optionen={BAUWEISEN}
            onChange={(bauweise) => setzeGebaeude({ bauweise })}
          />
          <Auswahl
            label="Risikoklasse"
            wert={g.risikoklasse}
            optionen={RISIKOKLASSEN}
            onChange={(risikoklasse) => setzeGebaeude({ risikoklasse })}
            hint={`Maximale Fluchtweglänge: ${FLUCHTWEG_MAX_LAENGE[g.risikoklasse]} m`}
          />
        </div>

        <div
          className={`hinweis-box ${abweichend ? 'hinweis-box--warn' : ''}`}
          style={{ marginTop: 'var(--sp-5)' }}
        >
          <strong>{def.klasse}</strong> — {def.beschreibung}
          <div style={{ marginTop: 'var(--sp-2)' }}>
            Daraus folgt: Tragwerk mindestens{' '}
            <strong>{def.tragwerk === 'keine' ? 'ohne Anforderung' : def.tragwerk}</strong>
            , Trenndecken mindestens <strong>{def.trenndecke}</strong>.
          </div>
          {abweichend && (
            <div style={{ marginTop: 'var(--sp-3)' }}>
              Aus Fluchtniveau ({g.fluchtniveau} m) und Geschoßanzahl (
              {g.geschosseOberirdisch}) ergibt sich rechnerisch{' '}
              <strong>{vorschlag}</strong>.{' '}
              <button
                type="button"
                className="btn btn--sm"
                style={{ marginLeft: 'var(--sp-2)' }}
                onClick={() => setzeGebaeude({ gebaeudeklasse: vorschlag })}
              >
                Auf {vorschlag} setzen
              </button>
            </div>
          )}
        </div>
      </Karte>

      <Karte titel="Kenndaten" untertitel="Geometrie und Flächen">
        <div className="form-grid">
          <ZahlFeld
            label="Fluchtniveau"
            einheit="m"
            wert={g.fluchtniveau}
            step={0.1}
            onChange={(fluchtniveau) => setzeGebaeude({ fluchtniveau })}
            hint="Fußbodenoberkante des obersten Geschoßes"
          />
          <ZahlFeld
            label="Geschoße oberirdisch"
            wert={g.geschosseOberirdisch}
            onChange={(geschosseOberirdisch) =>
              setzeGebaeude({ geschosseOberirdisch })
            }
          />
          <ZahlFeld
            label="Geschoße unterirdisch"
            wert={g.geschosseUnterirdisch}
            onChange={(geschosseUnterirdisch) =>
              setzeGebaeude({ geschosseUnterirdisch })
            }
          />
          <ZahlFeld
            label="Brutto-Grundfläche"
            einheit="m²"
            wert={g.bruttoGrundflaeche}
            step={10}
            onChange={(bruttoGrundflaeche) =>
              setzeGebaeude({ bruttoGrundflaeche })
            }
          />
          <ZahlFeld
            label="Größter Brandabschnitt"
            einheit="m²"
            wert={g.groessterBrandabschnitt}
            step={10}
            onChange={(groessterBrandabschnitt) =>
              setzeGebaeude({ groessterBrandabschnitt })
            }
            hint={
              projekt.brandabschnitte.length > 0
                ? `Aus Kapitel Brandabschnitte: ${Math.max(
                    ...projekt.brandabschnitte.map((b) => b.flaeche),
                  ).toLocaleString('de-AT')} m²`
                : undefined
            }
          />
          <ZahlFeld
            label="Umbauter Raum"
            einheit="m³"
            wert={g.umbauterRaum}
            step={100}
            onChange={(umbauterRaum) => setzeGebaeude({ umbauterRaum })}
          />
        </div>
      </Karte>

      <Karte titel="Konstruktion">
        <TextBereich
          label="Beschreibung der Tragstruktur und Bauweise"
          wert={g.konstruktionsbeschreibung}
          rows={6}
          onChange={(konstruktionsbeschreibung) =>
            setzeGebaeude({ konstruktionsbeschreibung })
          }
          placeholder="Tragwerk, Deckenaufbauten, Fassade, Dachkonstruktion, brandschutzrelevante Besonderheiten …"
        />
      </Karte>
    </>
  );
}
