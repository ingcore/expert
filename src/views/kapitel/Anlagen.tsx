import { useAktivesProjekt } from '@/state/store';
import { neueAnlage } from '@/domain/factory';
import { ANLAGEN_ARTEN, ANLAGEN_STATUS } from '@/domain/catalog';
import {
  Auswahl,
  Karte,
  LeerZustand,
  Schalter,
  TextBereich,
  TextFeld,
  ZeilenAktion,
} from '@/components/ui';
import type { AnlagenArt, Brandschutzanlage } from '@/domain/types';

const ARTEN_OPTIONEN = ANLAGEN_ARTEN.map((a) => ({
  value: a.art,
  label: `${a.art} — ${a.label}`,
}));

export function KapitelAnlagen() {
  const { projekt, patch } = useAktivesProjekt();
  if (!projekt) return null;

  const anlagen = projekt.anlagen;

  function setze(id: string, aenderung: Partial<Brandschutzanlage>) {
    patch({
      anlagen: anlagen.map((a) => (a.id === id ? { ...a, ...aenderung } : a)),
    });
  }

  /** Beim Wechsel der Anlagenart das passende Regelwerk mitführen. */
  function setzeArt(id: string, art: AnlagenArt) {
    const def = ANLAGEN_ARTEN.find((a) => a.art === art);
    setze(id, { art, regelwerk: def?.regelwerk ?? '' });
  }

  function hinzufuegen() {
    patch({ anlagen: [...anlagen, neueAnlage()] });
  }

  function entfernen(id: string) {
    patch({ anlagen: anlagen.filter((a) => a.id !== id) });
  }

  const heute = new Date().toISOString().slice(0, 10);

  return (
    <Karte
      titel="Anlagentechnischer Brandschutz"
      untertitel="Brandschutzanlagen mit Schutzumfang und Prüffristen"
      aktion={
        <button type="button" className="btn btn--primary btn--sm" onClick={hinzufuegen}>
          + Anlage
        </button>
      }
    >
      {anlagen.length === 0 ? (
        <LeerZustand
          titel="Keine Anlagen erfasst"
          text="Erfassen Sie Brandmelde-, Rauchabzugs-, Alarmierungs- und weitere brandschutztechnische Anlagen."
          aktion={
            <button type="button" className="btn btn--primary" onClick={hinzufuegen}>
              + Erste Anlage anlegen
            </button>
          }
        />
      ) : (
        <div className="liste">
          {anlagen.map((a, i) => {
            const def = ANLAGEN_ARTEN.find((x) => x.art === a.art);
            const ueberfaellig =
              a.status === 'vorhanden' &&
              a.naechstePruefung !== '' &&
              a.naechstePruefung < heute;

            return (
              <div key={a.id} className="liste__eintrag">
                <div className="liste__kopf">
                  <span className="liste__nr">{i + 1}</span>
                  <strong style={{ fontSize: 'var(--fs-md)' }}>
                    {def?.label ?? a.art}
                  </strong>
                  <span
                    className={`badge ${
                      a.status === 'vorhanden'
                        ? 'badge--success'
                        : a.status === 'nachzuruesten'
                          ? 'badge--warning'
                          : ''
                    }`}
                  >
                    {ANLAGEN_STATUS.find((s) => s.value === a.status)?.label}
                  </span>
                  {ueberfaellig && (
                    <span className="badge badge--danger">Prüfung fällig</span>
                  )}
                  <span className="spacer" />
                  <ZeilenAktion onLoeschen={() => entfernen(a.id)} />
                </div>

                <div className="form-grid">
                  <Auswahl
                    label="Anlagenart"
                    wert={a.art}
                    optionen={ARTEN_OPTIONEN}
                    onChange={(art) => setzeArt(a.id, art)}
                  />
                  <Auswahl
                    label="Status"
                    wert={a.status}
                    optionen={ANLAGEN_STATUS}
                    onChange={(status) => setze(a.id, { status })}
                  />
                  <TextFeld
                    label="Regelwerk"
                    wert={a.regelwerk}
                    onChange={(regelwerk) => setze(a.id, { regelwerk })}
                  />
                  <TextFeld
                    label="Schutzumfang"
                    wert={a.schutzumfang}
                    onChange={(schutzumfang) => setze(a.id, { schutzumfang })}
                    className="span-full"
                    placeholder="z. B. Vollschutz, Teilschutz EG–2.OG"
                  />
                  <TextFeld
                    label="Letzte Prüfung"
                    type="date"
                    wert={a.letztePruefung}
                    onChange={(letztePruefung) => setze(a.id, { letztePruefung })}
                  />
                  <TextFeld
                    label="Nächste Prüfung"
                    type="date"
                    wert={a.naechstePruefung}
                    onChange={(naechstePruefung) =>
                      setze(a.id, { naechstePruefung })
                    }
                  />
                  <div className="field" style={{ justifyContent: 'flex-end' }}>
                    <Schalter
                      label="Aufschaltung zur Feuerwehr / Alarmzentrale"
                      wert={a.aufschaltung}
                      onChange={(aufschaltung) => setze(a.id, { aufschaltung })}
                    />
                  </div>
                  <TextBereich
                    label="Bemerkung"
                    wert={a.bemerkung}
                    rows={2}
                    onChange={(bemerkung) => setze(a.id, { bemerkung })}
                    className="span-full"
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
