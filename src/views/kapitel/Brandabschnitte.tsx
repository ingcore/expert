import { useAktivesProjekt } from '@/state/store';
import { neuerBrandabschnitt } from '@/domain/factory';
import {
  ABSCHNITT_TYPEN,
  FEUERWIDERSTANDSKLASSEN,
  FW_RANG,
  GK_BY_KEY,
  MAX_BRANDABSCHNITT,
} from '@/domain/catalog';
import {
  Auswahl,
  Karte,
  LeerZustand,
  Schalter,
  TextBereich,
  TextFeld,
  ZahlFeld,
  ZeilenAktion,
} from '@/components/ui';
import { gebaeudeklasseVon } from '@/engine/adapter';
import type { Brandabschnitt } from '@/domain/types';

export function KapitelBrandabschnitte() {
  const { projekt, patch } = useAktivesProjekt();
  if (!projekt) return null;

  const abschnitte = projekt.brandabschnitte;
  const klasse = gebaeudeklasseVon(projekt).klasse;
  const anforderung = klasse ? GK_BY_KEY[klasse].trenndecke : 'REI90';

  function setze(id: string, aenderung: Partial<Brandabschnitt>) {
    patch({
      brandabschnitte: abschnitte.map((b) =>
        b.id === id ? { ...b, ...aenderung } : b,
      ),
    });
  }

  function hinzufuegen() {
    patch({
      brandabschnitte: [...abschnitte, neuerBrandabschnitt(abschnitte.length + 1)],
    });
  }

  function entfernen(id: string) {
    // Zuordnungen der Nutzungseinheiten mit auflösen, damit keine
    // verwaisten Verweise zurückbleiben.
    patch({
      brandabschnitte: abschnitte.filter((b) => b.id !== id),
      nutzungseinheiten: projekt!.nutzungseinheiten.map((n) =>
        n.brandabschnittId === id ? { ...n, brandabschnittId: null } : n,
      ),
    });
  }

  return (
    <Karte
      titel="Brandabschnitte"
      untertitel={
        klasse
          ? `Abschnittsbildung nach OIB-Richtlinie 2, Punkt 3 — erforderlicher Feuerwiderstand für ${klasse}: ${anforderung}`
          : 'Abschnittsbildung nach OIB-Richtlinie 2, Punkt 3 — Gebäudeklasse noch nicht ermittelbar'
      }
      aktion={
        <button type="button" className="btn btn--primary btn--sm" onClick={hinzufuegen}>
          + Abschnitt
        </button>
      }
    >
      {abschnitte.length === 0 ? (
        <LeerZustand
          titel="Keine Brandabschnitte definiert"
          text="Ohne Abschnittsbildung lässt sich die Begrenzung der Brandausbreitung nicht nachweisen."
          aktion={
            <button type="button" className="btn btn--primary" onClick={hinzufuegen}>
              + Ersten Abschnitt anlegen
            </button>
          }
        />
      ) : (
        <div className="liste">
          {abschnitte.map((b, i) => {
            const zugeordnet = projekt.nutzungseinheiten.filter(
              (n) => n.brandabschnittId === b.id,
            );
            const grenze = zugeordnet.length
              ? Math.min(
                  ...zugeordnet.map((n) => MAX_BRANDABSCHNITT[n.nutzungsart]),
                )
              : MAX_BRANDABSCHNITT.sonstige;
            const flaecheKritisch = b.flaeche > grenze;
            const klasseKritisch = FW_RANG[b.trennbauteil] < FW_RANG[anforderung];

            return (
              <div key={b.id} className="liste__eintrag">
                <div className="liste__kopf">
                  <span className="liste__nr">{i + 1}</span>
                  <strong style={{ fontSize: 'var(--fs-md)' }}>
                    {b.bezeichnung}
                  </strong>
                  <span className="badge">
                    {ABSCHNITT_TYPEN.find((t) => t.value === b.typ)?.label}
                  </span>
                  {flaecheKritisch && (
                    <span className="badge badge--warning">Fläche</span>
                  )}
                  {klasseKritisch && (
                    <span className="badge badge--danger">Feuerwiderstand</span>
                  )}
                  <span className="spacer" />
                  <ZeilenAktion onLoeschen={() => entfernen(b.id)} />
                </div>

                <div className="form-grid">
                  <TextFeld
                    label="Bezeichnung"
                    wert={b.bezeichnung}
                    onChange={(bezeichnung) => setze(b.id, { bezeichnung })}
                  />
                  <Auswahl
                    label="Typ"
                    wert={b.typ}
                    optionen={ABSCHNITT_TYPEN}
                    onChange={(typ) => setze(b.id, { typ })}
                  />
                  <ZahlFeld
                    label="Fläche"
                    einheit="m²"
                    wert={b.flaeche}
                    step={10}
                    onChange={(flaeche) => setze(b.id, { flaeche })}
                    hint={`Richtwert: ${grenze.toLocaleString('de-AT')} m²`}
                  />
                  <Auswahl
                    label="Trennbauteil"
                    wert={b.trennbauteil}
                    optionen={FEUERWIDERSTANDSKLASSEN}
                    onChange={(trennbauteil) => setze(b.id, { trennbauteil })}
                    hint={`Erforderlich: ${anforderung}`}
                  />
                  <TextFeld
                    label="Geschoße"
                    wert={b.geschosse}
                    onChange={(geschosse) => setze(b.id, { geschosse })}
                    placeholder="z. B. EG–2.OG"
                  />
                  <div className="field" style={{ justifyContent: 'flex-end' }}>
                    <Schalter
                      label="Abschlüsse und Durchführungen dokumentiert"
                      wert={b.abschluesseDokumentiert}
                      onChange={(abschluesseDokumentiert) =>
                        setze(b.id, { abschluesseDokumentiert })
                      }
                    />
                  </div>
                  <TextBereich
                    label="Beschreibung"
                    wert={b.beschreibung}
                    rows={2}
                    onChange={(beschreibung) => setze(b.id, { beschreibung })}
                    className="span-full"
                  />
                </div>

                {zugeordnet.length > 0 && (
                  <div
                    className="subtle"
                    style={{ marginTop: 'var(--sp-3)', fontSize: 'var(--fs-xs)' }}
                  >
                    Zugeordnete Nutzung:{' '}
                    {zugeordnet.map((n) => n.bezeichnung || 'unbenannt').join(', ')}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Karte>
  );
}
