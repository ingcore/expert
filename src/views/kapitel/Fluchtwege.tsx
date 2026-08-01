import { useAktivesProjekt } from '@/state/store';
import { neuerFluchtweg } from '@/domain/factory';
import {
  FLUCHTWEG_ARTEN,
  FLUCHTWEG_BREITE_JE_PERSON,
  FLUCHTWEG_MAX_LAENGE,
  FLUCHTWEG_MIN_BREITE,
  SCHWELLE_PANIKBESCHLAG_PERSONEN,
} from '@/domain/catalog';
import {
  Auswahl,
  Karte,
  Kennzahl,
  LeerZustand,
  Schalter,
  TextBereich,
  TextFeld,
  ZahlFeld,
  ZeilenAktion,
} from '@/components/ui';
import type { Fluchtweg } from '@/domain/types';

export function KapitelFluchtwege() {
  const { projekt, patch } = useAktivesProjekt();
  if (!projekt) return null;

  const wege = projekt.fluchtwege;
  const maxLaenge = FLUCHTWEG_MAX_LAENGE[projekt.gebaeude.risikoklasse];

  function setze(id: string, aenderung: Partial<Fluchtweg>) {
    patch({
      fluchtwege: wege.map((f) => (f.id === id ? { ...f, ...aenderung } : f)),
    });
  }

  function hinzufuegen() {
    patch({ fluchtwege: [...wege, neuerFluchtweg()] });
  }

  function entfernen(id: string) {
    patch({ fluchtwege: wege.filter((f) => f.id !== id) });
  }

  const insFreie = wege.filter((f) => f.fuehrtInsFreie).length;
  const zuLang = wege.filter((f) => f.laenge > maxLaenge).length;

  return (
    <>
      <div className="kpi-grid">
        <Kennzahl label="Fluchtwege" wert={wege.length} ton="brand" />
        <Kennzahl
          label="Ins Freie führend"
          wert={insFreie}
          ton={insFreie >= 2 ? 'gut' : 'warn'}
          hinweis="voneinander unabhängig"
        />
        <Kennzahl
          label="Zulässige Länge"
          wert={maxLaenge}
          einheit="m"
          hinweis={`Risikoklasse „${projekt.gebaeude.risikoklasse}“`}
        />
        <Kennzahl
          label="Zu lang"
          wert={zuLang}
          ton={zuLang > 0 ? 'gefahr' : 'gut'}
        />
      </div>

      <Karte
        titel="Flucht- und Rettungswege"
        untertitel="Erfassung nach OIB-Richtlinie 2, Punkt 5"
        aktion={
          <button type="button" className="btn btn--primary btn--sm" onClick={hinzufuegen}>
            + Fluchtweg
          </button>
        }
      >
        {wege.length === 0 ? (
          <LeerZustand
            titel="Keine Fluchtwege erfasst"
            text="Flucht- und Rettungswege sind zwingender Bestandteil des Konzepts."
            aktion={
              <button type="button" className="btn btn--primary" onClick={hinzufuegen}>
                + Ersten Fluchtweg anlegen
              </button>
            }
          />
        ) : (
          <div className="liste">
            {wege.map((f, i) => {
              const erforderlicheBreite = Math.max(
                FLUCHTWEG_MIN_BREITE,
                f.personen * FLUCHTWEG_BREITE_JE_PERSON,
              );
              const laengeKritisch = f.laenge > maxLaenge;
              const breiteKritisch = f.breite < erforderlicheBreite;
              const panikFehlt =
                f.personen >= SCHWELLE_PANIKBESCHLAG_PERSONEN && !f.panikbeschlag;

              return (
                <div key={f.id} className="liste__eintrag">
                  <div className="liste__kopf">
                    <span className="liste__nr">{i + 1}</span>
                    <strong style={{ fontSize: 'var(--fs-md)' }}>
                      {f.bezeichnung || 'Neuer Fluchtweg'}
                    </strong>
                    {laengeKritisch && (
                      <span className="badge badge--danger">Länge</span>
                    )}
                    {breiteKritisch && (
                      <span className="badge badge--warning">Breite</span>
                    )}
                    {panikFehlt && (
                      <span className="badge badge--danger">Panikbeschlag</span>
                    )}
                    <span className="spacer" />
                    <ZeilenAktion onLoeschen={() => entfernen(f.id)} />
                  </div>

                  <div className="form-grid">
                    <TextFeld
                      label="Bezeichnung"
                      wert={f.bezeichnung}
                      onChange={(bezeichnung) => setze(f.id, { bezeichnung })}
                      className="span-full"
                    />
                    <Auswahl
                      label="Art"
                      wert={f.art}
                      optionen={FLUCHTWEG_ARTEN}
                      onChange={(art) => setze(f.id, { art })}
                    />
                    <ZahlFeld
                      label="Länge"
                      einheit="m"
                      wert={f.laenge}
                      step={0.5}
                      onChange={(laenge) => setze(f.id, { laenge })}
                      hint={`Zulässig: ${maxLaenge} m`}
                    />
                    <ZahlFeld
                      label="Nutzbare Breite"
                      einheit="m"
                      wert={f.breite}
                      step={0.05}
                      onChange={(breite) => setze(f.id, { breite })}
                      hint={`Erforderlich: ${erforderlicheBreite.toFixed(2)} m`}
                    />
                    <ZahlFeld
                      label="Personen"
                      wert={f.personen}
                      onChange={(personen) => setze(f.id, { personen })}
                    />
                    <div
                      className="field span-full"
                      style={{ gap: 'var(--sp-2)' }}
                    >
                      <span className="field__label">Ausstattung</span>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns:
                            'repeat(auto-fit, minmax(210px, 1fr))',
                          gap: 'var(--sp-2)',
                        }}
                      >
                        <Schalter
                          label="Führt ins Freie / in sicheren Bereich"
                          wert={f.fuehrtInsFreie}
                          onChange={(fuehrtInsFreie) =>
                            setze(f.id, { fuehrtInsFreie })
                          }
                        />
                        <Schalter
                          label="Sicherheitsbeleuchtung"
                          wert={f.sicherheitsbeleuchtung}
                          onChange={(sicherheitsbeleuchtung) =>
                            setze(f.id, { sicherheitsbeleuchtung })
                          }
                        />
                        <Schalter
                          label="Fluchtwegkennzeichnung"
                          wert={f.fluchtwegorientierung}
                          onChange={(fluchtwegorientierung) =>
                            setze(f.id, { fluchtwegorientierung })
                          }
                        />
                        <Schalter
                          label="Panikbeschlag (EN 1125)"
                          wert={f.panikbeschlag}
                          onChange={(panikbeschlag) =>
                            setze(f.id, { panikbeschlag })
                          }
                        />
                      </div>
                    </div>
                    <TextBereich
                      label="Bemerkung"
                      wert={f.bemerkung}
                      rows={2}
                      onChange={(bemerkung) => setze(f.id, { bemerkung })}
                      className="span-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Karte>
    </>
  );
}
