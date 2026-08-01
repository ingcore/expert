import { useAktivesProjekt } from '@/state/store';
import {
  FACHBEREICHE,
  GESCHAEFTSBEREICHE,
  KONZEPTANLAESSE,
  LEISTUNGSARTEN,
  PROJEKT_STATUS,
} from '@/domain/catalog';
import {
  berichtsnummerString,
  dateiname,
  normalisiereKundennummer,
} from '@/domain/naming';
import { Abschnitt, Auswahl, Karte, TextFeld, ZahlFeld } from '@/components/ui';

export function KapitelStammdaten() {
  const { projekt, patch } = useAktivesProjekt();
  if (!projekt) return null;

  const { auftraggeber, objekt, bearbeiter, berichtsnummer } = projekt;

  return (
    <>
      <Karte titel="Projekt" untertitel="Bezeichnung, Status und Anlass">
        <div className="form-grid form-grid--2">
          <TextFeld
            label="Projekttitel"
            wert={projekt.titel}
            onChange={(titel) => patch({ titel })}
            className="span-full"
            placeholder="z. B. Betriebsgebäude Mustermann — Zubau Produktionshalle"
          />
          <Auswahl
            label="Status"
            wert={projekt.status}
            optionen={PROJEKT_STATUS}
            onChange={(status) => patch({ status })}
          />
          <Auswahl
            label="Anlass"
            wert={projekt.anlass}
            optionen={KONZEPTANLAESSE}
            onChange={(anlass) => patch({ anlass })}
          />
          <TextFeld
            label="Datum"
            type="date"
            wert={projekt.datum}
            onChange={(datum) => patch({ datum })}
            hint="Erstellungs- bzw. Begehungsdatum, bestimmt das Datumspräfix"
          />
        </div>
      </Karte>

      <Karte titel="Auftraggeber">
        <div className="form-grid form-grid--2">
          <TextFeld
            label="Firma / Name"
            wert={auftraggeber.name}
            onChange={(name) => patch({ auftraggeber: { ...auftraggeber, name } })}
            className="span-full"
          />
          <TextFeld
            label="Kundennummer"
            wert={auftraggeber.kundennummer}
            onChange={(kundennummer) =>
              patch({ auftraggeber: { ...auftraggeber, kundennummer } })
            }
            hint="4-stellig mit führenden Nullen, z. B. 0219"
            placeholder="0219"
          />
          <TextFeld
            label="Ansprechpartner"
            wert={auftraggeber.ansprechpartner}
            onChange={(ansprechpartner) =>
              patch({ auftraggeber: { ...auftraggeber, ansprechpartner } })
            }
          />
          <TextFeld
            label="Straße"
            wert={auftraggeber.strasse}
            onChange={(strasse) =>
              patch({ auftraggeber: { ...auftraggeber, strasse } })
            }
          />
          <TextFeld
            label="PLZ"
            wert={auftraggeber.plz}
            onChange={(plz) => patch({ auftraggeber: { ...auftraggeber, plz } })}
          />
          <TextFeld
            label="Ort"
            wert={auftraggeber.ort}
            onChange={(ort) => patch({ auftraggeber: { ...auftraggeber, ort } })}
          />
          <TextFeld
            label="Telefon"
            type="tel"
            wert={auftraggeber.telefon}
            onChange={(telefon) =>
              patch({ auftraggeber: { ...auftraggeber, telefon } })
            }
          />
          <TextFeld
            label="E-Mail"
            type="email"
            wert={auftraggeber.email}
            onChange={(email) =>
              patch({ auftraggeber: { ...auftraggeber, email } })
            }
          />
        </div>
      </Karte>

      <Karte titel="Objekt" untertitel="Inspektionsgegenstand und Liegenschaft">
        <div className="form-grid form-grid--2">
          <TextFeld
            label="Objektbezeichnung"
            wert={objekt.bezeichnung}
            onChange={(bezeichnung) =>
              patch({ objekt: { ...objekt, bezeichnung } })
            }
            className="span-full"
          />
          <TextFeld
            label="Straße"
            wert={objekt.strasse}
            onChange={(strasse) => patch({ objekt: { ...objekt, strasse } })}
          />
          <TextFeld
            label="PLZ"
            wert={objekt.plz}
            onChange={(plz) => patch({ objekt: { ...objekt, plz } })}
          />
          <TextFeld
            label="Ort"
            wert={objekt.ort}
            onChange={(ort) => patch({ objekt: { ...objekt, ort } })}
          />
          <TextFeld
            label="Katastralgemeinde"
            wert={objekt.katastralgemeinde}
            onChange={(katastralgemeinde) =>
              patch({ objekt: { ...objekt, katastralgemeinde } })
            }
          />
          <TextFeld
            label="Grundstücksnummer"
            wert={objekt.grundstuecksnummer}
            onChange={(grundstuecksnummer) =>
              patch({ objekt: { ...objekt, grundstuecksnummer } })
            }
          />
          <ZahlFeld
            label="Baujahr"
            wert={objekt.baujahr ?? 0}
            min={0}
            max={2100}
            onChange={(baujahr) =>
              patch({ objekt: { ...objekt, baujahr: baujahr || null } })
            }
            hint="0 = unbekannt"
          />
          <TextFeld
            label="Zuständige Behörde"
            wert={objekt.behoerde}
            onChange={(behoerde) => patch({ objekt: { ...objekt, behoerde } })}
            className="span-full"
            placeholder="z. B. Magistrat der Stadt Villach, Bauamt"
          />
        </div>
      </Karte>

      <Karte titel="Bearbeiter" untertitel="Verfasser des Konzepts">
        <div className="form-grid form-grid--2">
          <TextFeld
            label="Name"
            wert={bearbeiter.name}
            onChange={(name) => patch({ bearbeiter: { ...bearbeiter, name } })}
          />
          <TextFeld
            label="Rolle"
            wert={bearbeiter.rolle}
            onChange={(rolle) => patch({ bearbeiter: { ...bearbeiter, rolle } })}
          />
          <TextFeld
            label="Qualifikation"
            wert={bearbeiter.qualifikation}
            onChange={(qualifikation) =>
              patch({ bearbeiter: { ...bearbeiter, qualifikation } })
            }
            className="span-full"
            placeholder="z. B. Ingenieurkonsulent, akkreditierter Brandschutzsachverständiger"
          />
          <TextFeld
            label="E-Mail"
            type="email"
            wert={bearbeiter.email}
            onChange={(email) => patch({ bearbeiter: { ...bearbeiter, email } })}
          />
        </div>
      </Karte>

      <Karte
        titel="Berichtsnummer"
        untertitel="INGTEC-Artikelnummer nach Ablageschema"
      >
        <Abschnitt
          titel="Zusammensetzung"
          beschreibung="Die Berichtsnummer erscheint auf dem Deckblatt und in jeder Fußzeile und entspricht dem Dateinamen ohne Endung."
        >
          <div className="form-grid">
            <Auswahl
              label="Geschäftsbereich"
              wert={berichtsnummer.geschaeftsbereich}
              optionen={GESCHAEFTSBEREICHE}
              onChange={(geschaeftsbereich) =>
                patch({ berichtsnummer: { ...berichtsnummer, geschaeftsbereich } })
              }
            />
            <Auswahl
              label="Fachbereich"
              wert={berichtsnummer.fachbereich}
              optionen={FACHBEREICHE}
              onChange={(fachbereich) =>
                patch({ berichtsnummer: { ...berichtsnummer, fachbereich } })
              }
            />
            <TextFeld
              label="Anlage / Objekt"
              wert={berichtsnummer.anlage}
              onChange={(anlage) =>
                patch({ berichtsnummer: { ...berichtsnummer, anlage } })
              }
              hint="Kürzel, z. B. ALL, BMA, RWA, TUT"
            />
            <Auswahl
              label="Leistungsart"
              wert={berichtsnummer.leistungsart}
              optionen={LEISTUNGSARTEN}
              onChange={(leistungsart) =>
                patch({ berichtsnummer: { ...berichtsnummer, leistungsart } })
              }
              hint="Feuerbeschau immer als FB, nicht als PRF"
            />
            <TextFeld
              label="Laufende Nummer"
              wert={berichtsnummer.sequenz}
              onChange={(sequenz) =>
                patch({ berichtsnummer: { ...berichtsnummer, sequenz } })
              }
              hint="3-stellig, startet je Kombination bei 001"
            />
          </div>
        </Abschnitt>

        <div className="hinweis-box" style={{ marginTop: 'var(--sp-5)' }}>
          <div className="section-title" style={{ marginBottom: '0.35rem' }}>
            Ergebnis
          </div>
          <div
            className="mono"
            style={{
              fontSize: 'var(--fs-lg)',
              color: 'var(--fg)',
              wordBreak: 'break-all',
            }}
          >
            {berichtsnummerString(projekt)}
          </div>
          <div style={{ marginTop: 'var(--sp-2)', fontSize: 'var(--fs-xs)' }}>
            Dateiname: <span className="mono">{dateiname(projekt)}</span>
            {!/^\d{4}$/.test(auftraggeber.kundennummer) && (
              <>
                {' · '}
                <span style={{ color: 'var(--danger)' }}>
                  Kundennummer ergänzen
                  {normalisiereKundennummer(auftraggeber.kundennummer) &&
                    ` (vorgeschlagen: ${normalisiereKundennummer(
                      auftraggeber.kundennummer,
                    )})`}
                </span>
              </>
            )}
          </div>
        </div>
      </Karte>
    </>
  );
}
