import { useAktivesProjekt } from '@/state/store';
import {
  BAUWEISEN,
  FLUCHTWEG_MAX_LAENGE,
  GK_BY_KEY,
  RISIKOKLASSEN,
} from '@/domain/catalog';
import { gebaeudeklasseVon } from '@/engine/adapter';
import { quelleKurz } from '@/engine/types';
import {
  Auswahl,
  Karte,
  TextBereich,
  ZahlFeld,
} from '@/components/ui';

export function KapitelGebaeude() {
  const { projekt, patch } = useAktivesProjekt();
  if (!projekt) return null;

  const g = projekt.gebaeude;
  const k = projekt.klassenEingabe;
  const ableitung = gebaeudeklasseVon(projekt);
  const def = ableitung.klasse ? GK_BY_KEY[ableitung.klasse] : null;

  function setzeGebaeude(aenderung: Partial<typeof g>) {
    patch({ gebaeude: { ...g, ...aenderung } });
  }

  function setzeKlassenEingabe(aenderung: Partial<typeof k>) {
    patch({ klassenEingabe: { ...k, ...aenderung } });
  }

  return (
    <>
      <Karte
        titel="Kenndaten"
        untertitel="Geometrie und Flächen — Grundlage der Gebäudeklassenableitung"
      >
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
            label="Umbauter Raum"
            einheit="m³"
            wert={g.umbauterRaum}
            step={100}
            onChange={(umbauterRaum) => setzeGebaeude({ umbauterRaum })}
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
      </Karte>

      <Karte
        titel="Angaben zur Einstufung"
        untertitel="Nur erforderlich, solange Fluchtniveau ≤ 7 m und höchstens drei Geschoße vorliegen"
      >
        <div className="form-grid">
          <ZahlFeld
            label="Anzahl Nutzungseinheiten"
            wert={k.nutzungseinheitenAnzahl ?? 0}
            onChange={(n) =>
              setzeKlassenEingabe({ nutzungseinheitenAnzahl: n || null })
            }
            hint={
              projekt.nutzungseinheiten.length > 0
                ? `0 = aus Kapitel Nutzung übernehmen (${projekt.nutzungseinheiten.length})`
                : '0 = nicht angegeben'
            }
          />
          <ZahlFeld
            label="Größte Nutzungseinheit"
            einheit="m²"
            wert={k.groessteEinheitFlaeche ?? 0}
            step={10}
            onChange={(f) =>
              setzeKlassenEingabe({ groessteEinheitFlaeche: f || null })
            }
            hint="0 = aus Kapitel Nutzung übernehmen"
          />
          <Auswahl
            label="Freistehendes Gebäude"
            wert={
              k.freistehend === null ? '' : k.freistehend ? 'ja' : 'nein'
            }
            optionen={[
              { value: '', label: '— nicht angegeben —' },
              { value: 'ja', label: 'Ja, freistehend' },
              { value: 'nein', label: 'Nein, gekuppelt oder gereiht' },
            ]}
            onChange={(v) =>
              setzeKlassenEingabe({ freistehend: v === '' ? null : v === 'ja' })
            }
          />
        </div>
      </Karte>

      {/* Fachliche Beurteilung — graue Fläche nach INGTEC-Flächenlogik. */}
      <section className="card card--beurteilung">
        <header className="card__header">
          <div>
            <h2 className="card__title">Gebäudeklasse</h2>
            <p className="card__subtitle">
              Von der Regel-Engine abgeleitet — keine Eingabe
            </p>
          </div>
          {ableitung.klasse ? (
            <span className="klasse-plakette">{ableitung.klasse}</span>
          ) : (
            <span className="badge badge--warning">nicht ermittelbar</span>
          )}
        </header>

        <div className="card__body stack">
          {def ? (
            <p className="muted" style={{ fontSize: 'var(--fs-md)' }}>
              {def.beschreibung}
            </p>
          ) : (
            <div className="hinweis-box hinweis-box--warn">
              Die Gebäudeklasse lässt sich noch nicht ableiten. Es fehlen:{' '}
              <strong>{ableitung.fehlendeAngaben.join(', ')}</strong>. Solange
              die Klasse unbestimmt ist, bleibt die Anforderungsmatrix leer.
            </div>
          )}

          {ableitung.schritte.length > 0 && (
            <div>
              <h3 className="section-title" style={{ marginBottom: 'var(--sp-3)' }}>
                Ableitungsweg
              </h3>
              <ol className="ableitung">
                {ableitung.schritte.map((s) => (
                  <li key={s.nr} className="ableitung__schritt">
                    <span className="ableitung__nr">{s.nr}</span>
                    <div>
                      <div className="ableitung__frage">{s.frage}</div>
                      <div className="ableitung__wert">
                        <strong>{s.wert}</strong> — {s.ergebnis}
                      </div>
                      <div className="ableitung__quelle">{quelleKurz(s.quelle)}</div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {ableitung.hinweise.map((h, i) => (
            <div key={i} className="hinweis-box hinweis-box--warn">
              {h}
            </div>
          ))}

          {def && (
            <div className="hinweis-box">
              Daraus folgt: Tragwerk mindestens{' '}
              <strong>
                {def.tragwerk === 'keine' ? 'ohne Anforderung' : def.tragwerk}
              </strong>
              , Trenndecken mindestens <strong>{def.trenndecke}</strong>. Die
              vollständige Ableitung steht in der Anforderungsmatrix.
            </div>
          )}
        </div>
      </section>

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
