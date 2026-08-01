import { useMemo, useState } from 'react';
import { useAktivesProjekt } from '@/state/store';
import { werteProjektAus, matrixKennzahlen } from '@/engine/adapter';
import { fuehreRueckabgleichDurch } from '@/engine/rueckabgleich';
import type { PruefAbschnitt } from '@/engine/rueckabgleich';
import { quelleKurz } from '@/engine/types';
import { neueId } from '@/domain/factory';
import { berichtsnummerString } from '@/domain/naming';
import { Ampel } from '@/components/Ampel';
import {
  Karte,
  Kennzahl,
  LeerZustand,
  Schalter,
  TextBereich,
  TextFeld,
} from '@/components/ui';
import type { AuditEintrag, Freigabe as FreigabeDaten } from '@/domain/types';

const zeitFmt = new Intl.DateTimeFormat('de-AT', {
  dateStyle: 'short',
  timeStyle: 'short',
});

function zeit(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : zeitFmt.format(d);
}

/** Kurzer, stabiler Hash der Eingabe für den Audit-Trail (FR-7.1). */
function hashe(text: string): string {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function Freigabe() {
  const { projekt, patch } = useAktivesProjekt();
  const [name, setName] = useState('');
  const [rolle, setRolle] = useState('Sachverständiger Brandschutz');
  const [ausnahme, setAusnahme] = useState(false);
  const [begruendung, setBegruendung] = useState('');

  const matrix = useMemo(
    () => (projekt ? werteProjektAus(projekt) : null),
    [projekt],
  );

  const abschnitte: PruefAbschnitt[] = useMemo(() => {
    if (!projekt) return [];
    return [
      { bezeichnung: '1 Auftragsgegenstand', text: projekt.auftragsgegenstand },
      { bezeichnung: '2 Beurteilungsgrundlagen', text: projekt.grundlagen },
      {
        bezeichnung: '3 Konstruktion',
        text: projekt.gebaeude.konstruktionsbeschreibung,
      },
      ...projekt.abweichungen.map((a, i) => ({
        bezeichnung: `12.${i + 1} Abweichung`,
        text: `${a.beschreibung} ${a.kompensation} ${a.nachweis}`,
      })),
      { bezeichnung: '13 Conclusio', text: projekt.conclusio },
    ];
  }, [projekt]);

  const rueckabgleich = useMemo(
    () => (matrix ? fuehreRueckabgleichDurch(abschnitte, matrix) : null),
    [abschnitte, matrix],
  );

  if (!projekt || !matrix || !rueckabgleich) {
    return <LeerZustand titel="Kein Projekt geöffnet" />;
  }

  const kennzahlen = matrixKennzahlen(matrix);

  // Freigabesperren nach LP-4 und FR-5.2.
  const sperren: string[] = [];
  if (rueckabgleich.freigabeBlockiert) {
    sperren.push(
      `${rueckabgleich.befunde.length} Befund(e) des Rückabgleichs — Werte im Text ohne Deckung in der Matrix`,
    );
  }
  if (matrix.konflikte.length > 0) {
    sperren.push(`${matrix.konflikte.length} ungelöste(r) Regelkonflikt(e)`);
  }
  if (matrix.gebaeudeklasse.klasse === null) {
    sperren.push('Gebäudeklasse nicht ermittelbar');
  }
  const offeneAbweichungen = projekt.abweichungen.filter(
    (a) => !a.gleichwertigkeitBeurteiltVon.trim(),
  );
  if (offeneAbweichungen.length > 0) {
    sperren.push(
      `${offeneAbweichungen.length} Abweichung(en) ohne Gleichwertigkeitsbeurteilung`,
    );
  }

  const blockiert = sperren.length > 0;
  const darfFreigeben = name.trim().length > 0 && (!blockiert || (ausnahme && begruendung.trim().length > 0));

  function protokolliere(eintrag: Omit<AuditEintrag, 'id' | 'zeitpunkt'>) {
    if (!projekt) return [];
    return [
      ...projekt.audit,
      { ...eintrag, id: neueId('aud'), zeitpunkt: new Date().toISOString() },
    ];
  }

  function freigeben() {
    if (!projekt || !darfFreigeben) return;

    const freigabe: FreigabeDaten = {
      freigegebenVon: name.trim(),
      rolle: rolle.trim(),
      freigegebenAm: new Date().toISOString(),
      rueckabgleichBefunde: rueckabgleich!.befunde.length,
      ausnahme: blockiert && ausnahme,
      ausnahmeBegruendung: blockiert && ausnahme ? begruendung.trim() : '',
    };

    patch({
      freigabe,
      status: 'freigegeben',
      audit: protokolliere({
        art: 'freigabe',
        benutzer: name.trim(),
        beschreibung: blockiert
          ? `Ausnahmefreigabe trotz ${sperren.length} offener Sperre(n): ${begruendung.trim()}`
          : 'Reguläre fachliche Freigabe ohne offene Befunde',
        modell: '',
        eingabeHash: hashe(JSON.stringify(matrix!.ergebnisse)),
        regelstand: `OIB-RL 2 ${matrix!.ausgabe} / ${matrix!.bundesland}`,
      }),
    });
  }

  function widerrufen() {
    if (!projekt?.freigabe) return;
    patch({
      freigabe: null,
      status: 'in-pruefung',
      audit: protokolliere({
        art: 'freigabe-widerrufen',
        benutzer: projekt.freigabe.freigegebenVon,
        beschreibung: 'Freigabe widerrufen, Projekt zurück in Bearbeitung',
        modell: '',
        eingabeHash: '',
        regelstand: `OIB-RL 2 ${matrix!.ausgabe} / ${matrix!.bundesland}`,
      }),
    });
  }

  function protokollExportieren() {
    if (!projekt) return;
    const zeilen: string[] = [];
    zeilen.push(`# Prüfprotokoll — ${projekt.titel}`);
    zeilen.push('');
    zeilen.push(`Berichtsnummer: ${berichtsnummerString(projekt)}`);
    zeilen.push(`Regelstand: OIB-RL 2 ${matrix!.ausgabe}, Bundesland ${matrix!.bundesland}`);
    zeilen.push(`Erzeugt am: ${zeit(new Date().toISOString())}`);
    zeilen.push('');

    zeilen.push('## Ableitung der Gebäudeklasse');
    zeilen.push('');
    for (const s of matrix!.gebaeudeklasse.schritte) {
      zeilen.push(`${s.nr}. ${s.frage} — ${s.wert}: ${s.ergebnis}`);
      zeilen.push(`   Quelle: ${quelleKurz(s.quelle)}`);
    }
    zeilen.push('');
    zeilen.push(
      `Ergebnis: ${matrix!.gebaeudeklasse.klasse ?? 'nicht ermittelbar'}`,
    );
    zeilen.push('');

    zeilen.push('## Anforderungsmatrix');
    zeilen.push('');
    zeilen.push('| Anforderung | Soll | Ist | Status | Herkunft | Quelle |');
    zeilen.push('|---|---|---|---|---|---|');
    for (const e of matrix!.ergebnisse) {
      zeilen.push(
        `| ${e.bezeichnung} | ${e.sollWert ?? '—'} | ${e.istWert ?? '—'} | ${e.status} | ${e.ampel} | ${quelleKurz(e.quelle)} |`,
      );
    }
    zeilen.push('');

    zeilen.push('## Rückabgleich Text gegen Matrix');
    zeilen.push('');
    if (rueckabgleich!.befunde.length === 0) {
      zeilen.push(
        `Ohne Beanstandung. ${rueckabgleich!.geprueft} Abschnitt(e) geprüft.`,
      );
    } else {
      zeilen.push('| Abschnitt | Fundstelle | Art | Erläuterung |');
      zeilen.push('|---|---|---|---|');
      for (const b of rueckabgleich!.befunde) {
        zeilen.push(
          `| ${b.abschnitt} | ${b.fundstelle} | ${b.art} | ${b.erlaeuterung} |`,
        );
      }
    }
    zeilen.push('');

    if (matrix!.datenluecken.length > 0) {
      zeilen.push('## Datenlücken');
      zeilen.push('');
      for (const d of matrix!.datenluecken) {
        zeilen.push(
          `- ${d.bezeichnung}: ${d.fehlendeAngaben?.join(', ') ?? 'Istwert nicht erhoben'}`,
        );
      }
      zeilen.push('');
    }

    zeilen.push('## Freigabevermerk');
    zeilen.push('');
    if (projekt.freigabe) {
      zeilen.push(
        `Freigegeben von ${projekt.freigabe.freigegebenVon} (${projekt.freigabe.rolle}) am ${zeit(projekt.freigabe.freigegebenAm)}.`,
      );
      if (projekt.freigabe.ausnahme) {
        zeilen.push('');
        zeilen.push(
          `**Ausnahmefreigabe.** Begründung: ${projekt.freigabe.ausnahmeBegruendung}`,
        );
      }
    } else {
      zeilen.push('Noch nicht freigegeben.');
    }
    zeilen.push('');
    zeilen.push('---');
    zeilen.push('');
    zeilen.push(
      'Die fachliche und rechtliche Verantwortung für dieses Brandschutzkonzept liegt beim befugten Sachverständigen bzw. Ziviltechniker. Das Werkzeug unterstützt die Erstellung, ersetzt aber keine sachverständige Beurteilung.',
    );

    const blob = new Blob([zeilen.join('\n')], {
      type: 'text/markdown;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${berichtsnummerString(projekt)}_Pruefprotokoll.md`;
    a.click();
    URL.revokeObjectURL(url);

    patch({
      audit: protokolliere({
        art: 'export',
        benutzer: projekt.bearbeiter.name || 'unbekannt',
        beschreibung: 'Prüfprotokoll exportiert',
        modell: '',
        eingabeHash: '',
        regelstand: `OIB-RL 2 ${matrix!.ausgabe} / ${matrix!.bundesland}`,
      }),
    });
  }

  return (
    <div className="stack stack--lg">
      <div className="page-head">
        <div>
          <h1 className="page-head__title">Qualitätssicherung und Freigabe</h1>
          <p className="page-head__lead">
            Der Rückabgleich prüft jeden Wert des Konzepttexts gegen die
            Anforderungsmatrix. Befunde blockieren die Freigabe. Freigegeben
            wird ausschließlich durch eine benannte Person — das System gibt nie
            selbst frei.
          </p>
        </div>
        <button type="button" className="btn" onClick={protokollExportieren}>
          Prüfprotokoll exportieren
        </button>
      </div>

      {/* Freigabestatus */}
      <div
        className={`freigabe-status ${
          projekt.freigabe
            ? 'freigabe-status--frei'
            : blockiert
              ? 'freigabe-status--blockiert'
              : ''
        }`}
      >
        <span className="freigabe-status__icon" aria-hidden="true">
          {projekt.freigabe ? '✓' : blockiert ? '✕' : '○'}
        </span>
        <div>
          {projekt.freigabe ? (
            <>
              <strong>Freigegeben</strong> von{' '}
              {projekt.freigabe.freigegebenVon} ({projekt.freigabe.rolle}) am{' '}
              {zeit(projekt.freigabe.freigegebenAm)}.
              {projekt.freigabe.ausnahme && (
                <div style={{ color: 'var(--danger)', marginTop: '0.3rem' }}>
                  Ausnahmefreigabe: {projekt.freigabe.ausnahmeBegruendung}
                </div>
              )}
            </>
          ) : blockiert ? (
            <>
              <strong>Freigabe gesperrt</strong> — {sperren.length} offene(r)
              Punkt(e).
            </>
          ) : (
            <>
              <strong>Freigabebereit</strong> — keine offenen Befunde.
            </>
          )}
        </div>
        <span className="spacer" />
        {projekt.freigabe && (
          <button type="button" className="btn btn--sm" onClick={widerrufen}>
            Freigabe widerrufen
          </button>
        )}
      </div>

      <div className="kpi-grid">
        <Kennzahl
          label="Rückabgleich"
          wert={rueckabgleich.befunde.length}
          ton={rueckabgleich.befunde.length > 0 ? 'gefahr' : 'gut'}
          hinweis={`${rueckabgleich.geprueft} Abschnitt(e) geprüft`}
          beurteilung
        />
        <Kennzahl
          label="Nicht erfüllt"
          wert={kennzahlen.nichtErfuellt}
          ton={kennzahlen.nichtErfuellt > 0 ? 'warn' : 'gut'}
          beurteilung
        />
        <Kennzahl
          label="Regelkonflikte"
          wert={kennzahlen.konflikt}
          ton={kennzahlen.konflikt > 0 ? 'gefahr' : 'gut'}
          beurteilung
        />
        <Kennzahl
          label="Datenlücken"
          wert={kennzahlen.datenluecke}
          ton={kennzahlen.datenluecke > 0 ? 'warn' : 'gut'}
          beurteilung
        />
      </div>

      {sperren.length > 0 && (
        <Karte titel="Offene Punkte" untertitel="Diese Punkte sperren die Freigabe">
          <ul className="stack stack--sm" style={{ paddingLeft: '1.2rem' }}>
            {sperren.map((s, i) => (
              <li key={i} style={{ fontSize: 'var(--fs-md)' }}>
                {s}
              </li>
            ))}
          </ul>
        </Karte>
      )}

      <Karte
        titel="Befunde des Rückabgleichs"
        untertitel="Werte im Text ohne Entsprechung in der Anforderungsmatrix"
        flush
      >
        {rueckabgleich.befunde.length === 0 ? (
          <LeerZustand
            titel="Ohne Beanstandung"
            text="Jeder Wert im Konzepttext hat eine Entsprechung in der Matrix."
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '180px' }}>Abschnitt</th>
                  <th style={{ width: '120px' }}>Fundstelle</th>
                  <th>Erläuterung</th>
                </tr>
              </thead>
              <tbody>
                {rueckabgleich.befunde.map((b, i) => (
                  <tr key={i}>
                    <td>{b.abschnitt}</td>
                    <td>
                      <strong className="mono">{b.fundstelle}</strong>
                    </td>
                    <td className="muted">{b.erlaeuterung}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Karte>

      {!projekt.freigabe && (
        <section className="card card--beurteilung">
          <header className="card__header">
            <div>
              <h2 className="card__title">Fachliche Freigabe</h2>
              <p className="card__subtitle">
                Die Verantwortung für das Konzept liegt bei der freigebenden
                Person, nicht beim Werkzeug
              </p>
            </div>
          </header>
          <div className="card__body stack">
            <div className="form-grid form-grid--2">
              <TextFeld
                label="Name der freigebenden Person"
                wert={name}
                onChange={setName}
                placeholder="Vor- und Nachname"
              />
              <TextFeld
                label="Rolle / Befugnis"
                wert={rolle}
                onChange={setRolle}
              />
            </div>

            {blockiert && (
              <>
                <div className="hinweis-box hinweis-box--gefahr">
                  Es liegen offene Punkte vor. Eine reguläre Freigabe ist nicht
                  möglich. Eine Ausnahmefreigabe ist nur mit dokumentierter
                  Begründung zulässig und wird im Prüfprotokoll gesondert
                  ausgewiesen.
                </div>
                <Schalter
                  label="Ausnahmefreigabe trotz offener Punkte"
                  wert={ausnahme}
                  onChange={setAusnahme}
                />
                {ausnahme && (
                  <TextBereich
                    label="Begründung, Umfang und Risiko der Ausnahme"
                    wert={begruendung}
                    rows={4}
                    onChange={setBegruendung}
                    placeholder="Warum ist die Freigabe trotz der offenen Punkte fachlich vertretbar?"
                  />
                )}
              </>
            )}

            <div className="row">
              <button
                type="button"
                className="btn btn--primary"
                disabled={!darfFreigeben}
                onClick={freigeben}
              >
                {blockiert ? 'Ausnahmefreigabe erteilen' : 'Konzept freigeben'}
              </button>
              {!name.trim() && (
                <span className="subtle" style={{ fontSize: 'var(--fs-xs)' }}>
                  Name erforderlich
                </span>
              )}
            </div>
          </div>
        </section>
      )}

      <Karte
        titel="Audit-Trail"
        untertitel="Unveränderliches Protokoll aller nachvollziehbarkeitsrelevanten Vorgänge"
        flush
      >
        {projekt.audit.length === 0 ? (
          <LeerZustand
            titel="Noch keine Einträge"
            text="Freigaben und Exporte werden hier protokolliert."
          />
        ) : (
          <div className="card__body">
            {[...projekt.audit].reverse().map((e) => (
              <div key={e.id} className="audit-zeile">
                <span className="subtle nowrap">{zeit(e.zeitpunkt)}</span>
                <span>
                  <span className="badge">{e.art}</span>
                </span>
                <span>
                  {e.beschreibung}
                  <div
                    className="subtle mono"
                    style={{ fontSize: 'var(--fs-2xs)', marginTop: '0.2rem' }}
                  >
                    {e.benutzer}
                    {e.regelstand && ` · ${e.regelstand}`}
                    {e.eingabeHash && ` · ${e.eingabeHash}`}
                  </div>
                </span>
              </div>
            ))}
          </div>
        )}
      </Karte>

      <div className="hinweis-box">
        <strong>Verantwortlichkeit.</strong> Das Konzept wird vom
        Sachverständigen verantwortet, nicht vom Werkzeug. Die Regel-Engine
        leitet Anforderungen deterministisch ab und belegt sie mit der
        Normstelle; die Beurteilung der Gleichwertigkeit bei Abweichungen bleibt
        vollständig beim Menschen.{' '}
        <Ampel stufe="rot" /> markiert Aussagen, die zwingend fachlich zu prüfen
        sind.
      </div>
    </div>
  );
}
