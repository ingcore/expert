import { useAktivesProjekt } from '@/state/store';
import { neueLoeschhilfe } from '@/domain/factory';
import { LE_JE_QM, LE_MINDEST, LOESCHHILFE_ARTEN } from '@/domain/catalog';
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
import type { Loeschhilfe } from '@/domain/types';

export function KapitelLoeschhilfen() {
  const { projekt, patch } = useAktivesProjekt();
  if (!projekt) return null;

  const hilfen = projekt.loeschhilfen;
  const lw = projekt.loeschwasser;

  function setze(id: string, aenderung: Partial<Loeschhilfe>) {
    patch({
      loeschhilfen: hilfen.map((l) => (l.id === id ? { ...l, ...aenderung } : l)),
    });
  }

  function hinzufuegen() {
    patch({ loeschhilfen: [...hilfen, neueLoeschhilfe()] });
  }

  function entfernen(id: string) {
    patch({ loeschhilfen: hilfen.filter((l) => l.id !== id) });
  }

  const vorhandeneLE = hilfen
    .filter(
      (l) => l.art === 'handfeuerloescher' || l.art === 'fahrbarer-loescher',
    )
    .reduce((s, l) => s + l.anzahl * l.loeschmitteleinheiten, 0);
  const erforderlicheLE = Math.max(
    LE_MINDEST,
    Math.ceil(projekt.gebaeude.bruttoGrundflaeche * LE_JE_QM),
  );

  return (
    <>
      <div className="kpi-grid">
        <Kennzahl
          label="Vorhandene LE"
          wert={vorhandeneLE}
          hinweis="Löschmitteleinheiten"
          ton={vorhandeneLE >= erforderlicheLE ? 'gut' : 'gefahr'}
        />
        <Kennzahl
          label="Erforderliche LE"
          wert={erforderlicheLE}
          hinweis={`${LE_JE_QM} LE/m² nach TRVB F 124`}
        />
        <Kennzahl
          label="Löschwasser"
          wert={lw.menge.toLocaleString('de-AT')}
          einheit="l/min"
          ton={
            lw.erforderlich > 0 && lw.menge < lw.erforderlich ? 'gefahr' : 'gut'
          }
          hinweis={
            lw.erforderlich > 0
              ? `erforderlich ${lw.erforderlich.toLocaleString('de-AT')} l/min`
              : 'Bedarf noch nicht ermittelt'
          }
        />
        <Kennzahl
          label="Geräte gesamt"
          wert={hilfen.reduce((s, l) => s + l.anzahl, 0)}
          ton="brand"
        />
      </div>

      <Karte
        titel="Löschhilfen"
        untertitel="Erste und erweiterte Löschhilfe nach TRVB F 124"
        aktion={
          <button type="button" className="btn btn--primary btn--sm" onClick={hinzufuegen}>
            + Löschhilfe
          </button>
        }
      >
        {hilfen.length === 0 ? (
          <LeerZustand
            titel="Keine Löschhilfen erfasst"
            text="Hier werden Handfeuerlöscher, Wandhydranten und weitere Löscheinrichtungen erfasst."
            aktion={
              <button type="button" className="btn btn--primary" onClick={hinzufuegen}>
                + Erste Löschhilfe anlegen
              </button>
            }
          />
        ) : (
          <div className="liste">
            {hilfen.map((l, i) => (
              <div key={l.id} className="liste__eintrag">
                <div className="liste__kopf">
                  <span className="liste__nr">{i + 1}</span>
                  <strong style={{ fontSize: 'var(--fs-md)' }}>
                    {LOESCHHILFE_ARTEN.find((a) => a.value === l.art)?.label}
                    {l.standort && ` — ${l.standort}`}
                  </strong>
                  <span className="spacer" />
                  <ZeilenAktion onLoeschen={() => entfernen(l.id)} />
                </div>

                <div className="form-grid">
                  <Auswahl
                    label="Art"
                    wert={l.art}
                    optionen={LOESCHHILFE_ARTEN}
                    onChange={(art) => setze(l.id, { art })}
                  />
                  <TextFeld
                    label="Standort / Bereich"
                    wert={l.standort}
                    onChange={(standort) => setze(l.id, { standort })}
                  />
                  <ZahlFeld
                    label="Anzahl"
                    wert={l.anzahl}
                    min={1}
                    onChange={(anzahl) => setze(l.id, { anzahl })}
                  />
                  <ZahlFeld
                    label="LE je Gerät"
                    wert={l.loeschmitteleinheiten}
                    onChange={(loeschmitteleinheiten) =>
                      setze(l.id, { loeschmitteleinheiten })
                    }
                    hint="Löschmitteleinheiten nach TRVB F 124"
                  />
                  <TextFeld
                    label="Letzte Überprüfung"
                    type="date"
                    wert={l.letztePruefung}
                    onChange={(letztePruefung) => setze(l.id, { letztePruefung })}
                  />
                  <TextBereich
                    label="Bemerkung"
                    wert={l.bemerkung}
                    rows={2}
                    onChange={(bemerkung) => setze(l.id, { bemerkung })}
                    className="span-full"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Karte>

      <Karte
        titel="Löschwasserversorgung"
        untertitel="Bedarfsermittlung nach TRVB F 128"
      >
        <div className="form-grid">
          <ZahlFeld
            label="Verfügbare Menge"
            einheit="l/min"
            wert={lw.menge}
            step={50}
            onChange={(menge) => patch({ loeschwasser: { ...lw, menge } })}
          />
          <ZahlFeld
            label="Erforderliche Menge"
            einheit="l/min"
            wert={lw.erforderlich}
            step={50}
            onChange={(erforderlich) =>
              patch({ loeschwasser: { ...lw, erforderlich } })
            }
          />
          <ZahlFeld
            label="Bereitstellungsdauer"
            einheit="min"
            wert={lw.dauer}
            step={15}
            onChange={(dauer) => patch({ loeschwasser: { ...lw, dauer } })}
          />
          <ZahlFeld
            label="Entfernung zum Hydranten"
            einheit="m"
            wert={lw.hydrantEntfernung}
            step={5}
            onChange={(hydrantEntfernung) =>
              patch({ loeschwasser: { ...lw, hydrantEntfernung } })
            }
            hint="Richtwert: höchstens 150 m"
          />
          <div className="field span-full">
            <Schalter
              label="Löschwasserrückhaltung erforderlich (wassergefährdende Stoffe)"
              wert={lw.rueckhaltungErforderlich}
              onChange={(rueckhaltungErforderlich) =>
                patch({ loeschwasser: { ...lw, rueckhaltungErforderlich } })
              }
            />
          </div>
          <TextBereich
            label="Bemerkung"
            wert={lw.bemerkung}
            rows={3}
            onChange={(bemerkung) => patch({ loeschwasser: { ...lw, bemerkung } })}
            className="span-full"
          />
        </div>
      </Karte>
    </>
  );
}
