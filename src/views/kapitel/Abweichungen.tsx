import { useAktivesProjekt } from '@/state/store';
import { neueAbweichung } from '@/domain/factory';
import {
  Karte,
  LeerZustand,
  Schalter,
  TextBereich,
  TextFeld,
  ZeilenAktion,
} from '@/components/ui';
import type { Abweichung } from '@/domain/types';

export function KapitelAbweichungen() {
  const { projekt, patch } = useAktivesProjekt();
  if (!projekt) return null;

  const abweichungen = projekt.abweichungen;

  function setze(id: string, aenderung: Partial<Abweichung>) {
    patch({
      abweichungen: abweichungen.map((a) =>
        a.id === id ? { ...a, ...aenderung } : a,
      ),
    });
  }

  function hinzufuegen() {
    patch({ abweichungen: [...abweichungen, neueAbweichung()] });
  }

  function entfernen(id: string) {
    patch({ abweichungen: abweichungen.filter((a) => a.id !== id) });
  }

  return (
    <Karte
      titel="Abweichungen vom Regelwerk"
      untertitel="Jede Abweichung erfordert eine kompensierende Maßnahme und einen Nachweis der Gleichwertigkeit"
      aktion={
        <button type="button" className="btn btn--primary btn--sm" onClick={hinzufuegen}>
          + Abweichung
        </button>
      }
    >
      {abweichungen.length === 0 ? (
        <LeerZustand
          titel="Keine Abweichungen dokumentiert"
          text="Das Konzept folgt durchgehend dem Regelwerk. Werden Anforderungen nicht eingehalten, sind sie hier mit Kompensation zu dokumentieren."
          aktion={
            <button type="button" className="btn" onClick={hinzufuegen}>
              + Abweichung erfassen
            </button>
          }
        />
      ) : (
        <div className="liste">
          {abweichungen.map((a, i) => {
            const unvollstaendig =
              !a.kompensation.trim() || !a.nachweis.trim();
            return (
              <div key={a.id} className="liste__eintrag">
                <div className="liste__kopf">
                  <span className="liste__nr">{i + 1}</span>
                  <strong style={{ fontSize: 'var(--fs-md)' }}>
                    {a.anforderung || 'Neue Abweichung'}
                  </strong>
                  {a.genehmigt ? (
                    <span className="badge badge--success">Genehmigt</span>
                  ) : (
                    <span className="badge badge--warning">
                      Abstimmung offen
                    </span>
                  )}
                  {unvollstaendig && (
                    <span className="badge badge--danger">Unvollständig</span>
                  )}
                  <span className="spacer" />
                  <ZeilenAktion onLoeschen={() => entfernen(a.id)} />
                </div>

                <div className="stack">
                  <TextFeld
                    label="Betroffene Anforderung"
                    wert={a.anforderung}
                    onChange={(anforderung) => setze(a.id, { anforderung })}
                    placeholder="z. B. Brandabschnittsfläche Produktionshalle (OIB-RL 2, Pkt. 3.1)"
                  />
                  <TextBereich
                    label="Beschreibung der Abweichung"
                    wert={a.beschreibung}
                    rows={3}
                    onChange={(beschreibung) => setze(a.id, { beschreibung })}
                  />
                  <TextBereich
                    label="Kompensierende Maßnahme"
                    wert={a.kompensation}
                    rows={3}
                    onChange={(kompensation) => setze(a.id, { kompensation })}
                    placeholder="Welche zusätzlichen Maßnahmen gleichen die Abweichung aus?"
                  />
                  <TextBereich
                    label="Nachweisführung"
                    wert={a.nachweis}
                    rows={3}
                    onChange={(nachweis) => setze(a.id, { nachweis })}
                    placeholder="Ingenieurmethoden, Vergleichsbetrachtung, Gutachten, Simulation …"
                  />
                  <Schalter
                    label="Von der Behörde genehmigt"
                    wert={a.genehmigt}
                    onChange={(genehmigt) => setze(a.id, { genehmigt })}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Karte>
  );
}
