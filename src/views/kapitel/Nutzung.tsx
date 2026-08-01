import { useAktivesProjekt } from '@/state/store';
import { neueNutzungseinheit } from '@/domain/factory';
import { MAX_BRANDABSCHNITT, NUTZUNGSARTEN } from '@/domain/catalog';
import {
  gesamtNutzflaeche,
  gesamtPersonen,
  mittlereBrandlast,
} from '@/domain/stats';
import {
  Auswahl,
  Karte,
  Kennzahl,
  LeerZustand,
  TextBereich,
  TextFeld,
  ZahlFeld,
  ZeilenAktion,
} from '@/components/ui';
import type { Nutzungseinheit } from '@/domain/types';

export function KapitelNutzung() {
  const { projekt, patch } = useAktivesProjekt();
  if (!projekt) return null;

  const einheiten = projekt.nutzungseinheiten;

  function setze(id: string, aenderung: Partial<Nutzungseinheit>) {
    patch({
      nutzungseinheiten: einheiten.map((n) =>
        n.id === id ? { ...n, ...aenderung } : n,
      ),
    });
  }

  function hinzufuegen() {
    patch({ nutzungseinheiten: [...einheiten, neueNutzungseinheit()] });
  }

  function entfernen(id: string) {
    patch({ nutzungseinheiten: einheiten.filter((n) => n.id !== id) });
  }

  const abschnittOptionen = [
    { value: '', label: '— nicht zugeordnet —' },
    ...projekt.brandabschnitte.map((b) => ({
      value: b.id,
      label: `${b.bezeichnung} (${b.flaeche.toLocaleString('de-AT')} m²)`,
    })),
  ];

  return (
    <>
      <div className="kpi-grid">
        <Kennzahl
          label="Nutzungseinheiten"
          wert={einheiten.length}
          ton="brand"
        />
        <Kennzahl
          label="Nutzfläche"
          wert={gesamtNutzflaeche(projekt).toLocaleString('de-AT')}
          einheit="m²"
        />
        <Kennzahl
          label="Personen"
          wert={gesamtPersonen(projekt)}
          hinweis="höchste gleichzeitige Belegung"
        />
        <Kennzahl
          label="Mittlere Brandlast"
          wert={mittlereBrandlast(projekt)}
          einheit="MJ/m²"
          hinweis="flächengewichtet"
        />
      </div>

      <Karte
        titel="Nutzungseinheiten"
        untertitel="Bereiche, Nutzungsart, Belegung und Brandlast"
        aktion={
          <button type="button" className="btn btn--primary btn--sm" onClick={hinzufuegen}>
            + Einheit
          </button>
        }
      >
        {einheiten.length === 0 ? (
          <LeerZustand
            titel="Keine Nutzungseinheiten erfasst"
            text="Ohne erfasste Nutzung lassen sich Personenzahlen und die daraus folgenden Anforderungen nicht ableiten."
            aktion={
              <button type="button" className="btn btn--primary" onClick={hinzufuegen}>
                + Erste Einheit anlegen
              </button>
            }
          />
        ) : (
          <div className="liste">
            {einheiten.map((n, i) => {
              const grenze = MAX_BRANDABSCHNITT[n.nutzungsart];
              return (
                <div key={n.id} className="liste__eintrag">
                  <div className="liste__kopf">
                    <span className="liste__nr">{i + 1}</span>
                    <strong style={{ fontSize: 'var(--fs-md)' }}>
                      {n.bezeichnung || 'Neue Nutzungseinheit'}
                    </strong>
                    <span className="spacer" />
                    <ZeilenAktion onLoeschen={() => entfernen(n.id)} />
                  </div>

                  <div className="form-grid">
                    <TextFeld
                      label="Bezeichnung"
                      wert={n.bezeichnung}
                      onChange={(bezeichnung) => setze(n.id, { bezeichnung })}
                      className="span-full"
                    />
                    <Auswahl
                      label="Nutzungsart"
                      wert={n.nutzungsart}
                      optionen={NUTZUNGSARTEN}
                      onChange={(nutzungsart) => setze(n.id, { nutzungsart })}
                      hint={`Richtwert Brandabschnitt: ${grenze.toLocaleString('de-AT')} m²`}
                    />
                    <TextFeld
                      label="Geschoß"
                      wert={n.geschoss}
                      onChange={(geschoss) => setze(n.id, { geschoss })}
                      placeholder="EG, 1.OG, KG …"
                    />
                    <ZahlFeld
                      label="Fläche"
                      einheit="m²"
                      wert={n.flaeche}
                      step={10}
                      onChange={(flaeche) => setze(n.id, { flaeche })}
                    />
                    <ZahlFeld
                      label="Personen"
                      wert={n.personenzahl}
                      onChange={(personenzahl) => setze(n.id, { personenzahl })}
                    />
                    <ZahlFeld
                      label="Brandlast"
                      einheit="MJ/m²"
                      wert={n.brandlast}
                      step={10}
                      onChange={(brandlast) => setze(n.id, { brandlast })}
                      hint="0 = nicht ermittelt"
                    />
                    <Auswahl
                      label="Brandabschnitt"
                      wert={n.brandabschnittId ?? ''}
                      optionen={abschnittOptionen}
                      onChange={(id) =>
                        setze(n.id, { brandabschnittId: id || null })
                      }
                    />
                    <TextBereich
                      label="Bemerkung"
                      wert={n.bemerkung}
                      rows={2}
                      onChange={(bemerkung) => setze(n.id, { bemerkung })}
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
