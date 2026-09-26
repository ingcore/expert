import { useMemo } from 'react';
import { useAktivesProjekt } from '@/state/store';
import { logoUrl } from '@/components/Logo';
import deckblattGrafikUrl from '@/assets/deckblatt-technik-wirkt.png';
import signetUrl from '@/assets/signet-technik-business-consulting.svg';
import { berichtsnummerString, dateiname } from '@/domain/naming';
import {
  ANLAGEN_ARTEN,
  ANLAGEN_STATUS,
  BAUTEIL_KATEGORIEN,
  FLUCHTWEG_ARTEN,
  GK_BY_KEY,
  KONZEPTANLAESSE,
  LOESCHHILFE_ARTEN,
  MANGEL_ARTEN,
  NUTZUNGSARTEN,
  SAFETY_SCORES,
} from '@/domain/catalog';
import { gesamtPersonen, gesamtNutzflaeche } from '@/domain/stats';
import { gebaeudeklasseVon } from '@/engine/adapter';
import { LeerZustand } from '@/components/ui';
import { ScoreGrafik } from '@/components/ScoreGrafik';
import { alsMarkdown } from '@/export/markdown';

const dateFmt = new Intl.DateTimeFormat('de-AT', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const dateLangFmt = new Intl.DateTimeFormat('de-AT', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

function datum(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : dateFmt.format(d);
}

/** Datum in Langform für das Deckblatt („Freitag, 25. September 2026“). */
function datumLang(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : dateLangFmt.format(d);
}

function zahl(n: number, digits = 0): string {
  return n.toLocaleString('de-AT', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function Dokument() {
  const { projekt } = useAktivesProjekt();

  const berichtsnr = useMemo(
    () => (projekt ? berichtsnummerString(projekt) : ''),
    [projekt],
  );

  if (!projekt) return <LeerZustand titel="Kein Projekt geöffnet" />;

  const klasse = gebaeudeklasseVon(projekt).klasse;
  const gk = klasse ? GK_BY_KEY[klasse] : null;
  const quelle = `Quelle: INGTEC ${
    new Date(projekt.datum).getFullYear() || new Date().getFullYear()
  }`;
  const anlassLabel =
    KONZEPTANLAESSE.find((a) => a.value === projekt.anlass)?.label ??
    projekt.anlass;

  function markdownExport() {
    if (!projekt) return;
    const blob = new Blob([alsMarkdown(projekt)], {
      type: 'text/markdown;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = dateiname(projekt, 'md');
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="stack stack--lg">
      <div className="page-head no-print">
        <div>
          <h1 className="page-head__title">Dokument</h1>
          <p className="page-head__lead">
            Druckfertige Vorschau des Brandschutzkonzepts im INGTEC-Layout. Über
            „Drucken“ lässt sich das Dokument als PDF ausgeben; der Ausdruck
            enthält nur den Bericht ohne Bedienoberfläche.
          </p>
        </div>
        <div className="row">
          <button type="button" className="btn" onClick={markdownExport}>
            Als Markdown
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => window.print()}
          >
            Drucken / als PDF
          </button>
        </div>
      </div>

      <div className="hinweis-box no-print">
        Dateiname nach INGTEC-Schema:{' '}
        <span className="mono">{dateiname(projekt)}</span>
      </div>

      <article className="doc">
        {/* ---- Deckblatt --------------------------------------------- */}
        <section className="doc__deckblatt">
          <img
            src={logoUrl}
            alt="INGTEC — TECHNIK.WIRKT"
            className="doc__logo"
          />

          <div className="doc__deckmeta">
            <div>
              <span className="doc__deckmeta-label">Datum</span>
              {datumLang(projekt.datum)}
            </div>
            <div>
              <span className="doc__deckmeta-label">Berichtsnummer</span>
              {berichtsnr}
            </div>
          </div>

          <h1 className="doc__titel">Brandschutzkonzept</h1>

          <table className="doc__tabelle doc__tabelle--deck">
            <tbody>
              <tr>
                <th>Projekt</th>
                <td>{projekt.titel || '—'}</td>
              </tr>
              <tr>
                <th>Gutachtensart</th>
                <td>Brandschutzkonzept — {anlassLabel}</td>
              </tr>
              <tr>
                <th>{'Inspektions\u00ADgegenstand'}</th>
                <td>
                  {projekt.objekt.bezeichnung || '—'}
                  {projekt.objekt.strasse && (
                    <>
                      <br />
                      {projekt.objekt.strasse}, {projekt.objekt.plz}{' '}
                      {projekt.objekt.ort}
                    </>
                  )}
                </td>
              </tr>
              <tr>
                <th>Auftraggeber</th>
                <td>
                  {projekt.auftraggeber.name || '—'}
                  {projekt.auftraggeber.strasse && (
                    <>
                      <br />
                      {projekt.auftraggeber.strasse},{' '}
                      {projekt.auftraggeber.plz} {projekt.auftraggeber.ort}
                    </>
                  )}
                </td>
              </tr>
              <tr>
                <th>Nutzung</th>
                <td>
                  {projekt.nutzungseinheiten.length > 0
                    ? [
                        ...new Set(
                          projekt.nutzungseinheiten.map(
                            (n) =>
                              NUTZUNGSARTEN.find(
                                (x) => x.value === n.nutzungsart,
                              )?.label ?? n.nutzungsart,
                          ),
                        ),
                      ].join(', ')
                    : '—'}
                </td>
              </tr>
              <tr>
                <th>Gebäudeklasse</th>
                <td>{gk ? `${gk.klasse} — ${gk.kurz}` : 'noch nicht ermittelbar'}</td>
              </tr>
            </tbody>
          </table>

          <div className="doc__sachverstaendiger">
            <span className="doc__sachverstaendiger-label">
              Sachverständiger
            </span>
            <strong>{projekt.bearbeiter.name || '—'}</strong>
            {projekt.bearbeiter.qualifikation && (
              <>
                <br />
                {projekt.bearbeiter.qualifikation}
              </>
            )}
          </div>

          <img
            src={deckblattGrafikUrl}
            alt=""
            aria-hidden="true"
            className="doc__deckgrafik"
          />
        </section>

        {/* ---- 1 Auftragsgegenstand ---------------------------------- */}
        <section className="doc__kapitel doc__seitenumbruch">
          <h2>1 Auftragsgegenstand</h2>
          <Absaetze text={projekt.auftragsgegenstand} />
        </section>

        {/* ---- 2 Beurteilungsgrundlagen ------------------------------ */}
        <section className="doc__kapitel">
          <h2>2 Beurteilungsgrundlagen</h2>
          <Absaetze text={projekt.grundlagen} />
        </section>

        {/* ---- 3 Objekt und Gebäudedaten ----------------------------- */}
        <section className="doc__kapitel">
          <h2>3 Objekt und Gebäudedaten</h2>
          <table className="doc__tabelle">
            <tbody>
              <tr>
                <th style={{ width: '52mm' }}>Gebäudeklasse</th>
                <td>
                  {gk ? `${gk.klasse} — ${gk.beschreibung}` : 'noch nicht ermittelbar'}
                </td>
              </tr>
              <tr>
                <th>Bauweise</th>
                <td>{projekt.gebaeude.bauweise}</td>
              </tr>
              <tr>
                <th>Fluchtniveau</th>
                <td>{zahl(projekt.gebaeude.fluchtniveau, 1)} m</td>
              </tr>
              <tr>
                <th>Geschoße</th>
                <td>
                  {projekt.gebaeude.geschosseOberirdisch} oberirdisch,{' '}
                  {projekt.gebaeude.geschosseUnterirdisch} unterirdisch
                </td>
              </tr>
              <tr>
                <th>Brutto-Grundfläche</th>
                <td>{zahl(projekt.gebaeude.bruttoGrundflaeche)} m²</td>
              </tr>
              <tr>
                <th>Umbauter Raum</th>
                <td>{zahl(projekt.gebaeude.umbauterRaum)} m³</td>
              </tr>
              <tr>
                <th>Größter Brandabschnitt</th>
                <td>{zahl(projekt.gebaeude.groessterBrandabschnitt)} m²</td>
              </tr>
              <tr>
                <th>Baujahr</th>
                <td>{projekt.objekt.baujahr ?? '—'}</td>
              </tr>
            </tbody>
          </table>
          <p className="doc__tabellentitel">
            Objekt- und Gebäudedaten ({quelle})
          </p>

          {projekt.gebaeude.konstruktionsbeschreibung && (
            <>
              <h3>3.1 Konstruktion</h3>
              <Absaetze text={projekt.gebaeude.konstruktionsbeschreibung} />
            </>
          )}
        </section>

        {/* ---- 4 Nutzung --------------------------------------------- */}
        {projekt.nutzungseinheiten.length > 0 && (
          <section className="doc__kapitel">
            <h2>4 Nutzung</h2>
            <p>
              Die Gesamtnutzfläche beträgt {zahl(gesamtNutzflaeche(projekt))} m²
              bei einer höchsten gleichzeitigen Belegung von{' '}
              {gesamtPersonen(projekt)} Personen.
            </p>
            <table className="doc__tabelle">
              <thead>
                <tr>
                  <th>Bereich</th>
                  <th>Nutzungsart</th>
                  <th>Geschoß</th>
                  <th>Fläche</th>
                  <th>Personen</th>
                  <th>Brandlast</th>
                </tr>
              </thead>
              <tbody>
                {projekt.nutzungseinheiten.map((n) => (
                  <tr key={n.id}>
                    <td>{n.bezeichnung || '—'}</td>
                    <td>
                      {NUTZUNGSARTEN.find((x) => x.value === n.nutzungsart)
                        ?.label ?? n.nutzungsart}
                    </td>
                    <td>{n.geschoss}</td>
                    <td>{zahl(n.flaeche)} m²</td>
                    <td>{n.personenzahl}</td>
                    <td>{n.brandlast > 0 ? `${zahl(n.brandlast)} MJ/m²` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="doc__tabellentitel">Nutzungseinheiten ({quelle})</p>
          </section>
        )}

        {/* ---- 5 Baulicher Brandschutz ------------------------------- */}
        <section className="doc__kapitel">
          <h2>5 Baulicher Brandschutz</h2>

          {projekt.brandabschnitte.length > 0 && (
            <>
              <h3>5.1 Brandabschnitte</h3>
              <table className="doc__tabelle">
                <thead>
                  <tr>
                    <th>Bezeichnung</th>
                    <th>Typ</th>
                    <th>Fläche</th>
                    <th>Trennbauteil</th>
                    <th>Geschoße</th>
                  </tr>
                </thead>
                <tbody>
                  {projekt.brandabschnitte.map((b) => (
                    <tr key={b.id}>
                      <td>{b.bezeichnung}</td>
                      <td>{b.typ}</td>
                      <td>{zahl(b.flaeche)} m²</td>
                      <td>{b.trennbauteil}</td>
                      <td>{b.geschosse || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="doc__tabellentitel">Brandabschnitte ({quelle})</p>
            </>
          )}

          {projekt.bauteile.length > 0 && (
            <>
              <h3>5.2 Bauteilnachweis</h3>
              <table className="doc__tabelle">
                <thead>
                  <tr>
                    <th>Bauteil</th>
                    <th>Kategorie</th>
                    <th>Erforderlich</th>
                    <th>Ausgeführt</th>
                    <th>Nachweis</th>
                  </tr>
                </thead>
                <tbody>
                  {projekt.bauteile.map((b) => (
                    <tr key={b.id}>
                      <td>{b.bezeichnung || '—'}</td>
                      <td>
                        {BAUTEIL_KATEGORIEN.find((k) => k.value === b.kategorie)
                          ?.label ?? b.kategorie}
                      </td>
                      <td>{b.sollKlasse}</td>
                      <td>{b.istKlasse}</td>
                      <td>{b.nachweis || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="doc__tabellentitel">Bauteilnachweis ({quelle})</p>
            </>
          )}
        </section>

        {/* ---- 6 Flucht- und Rettungswege ---------------------------- */}
        {projekt.fluchtwege.length > 0 && (
          <section className="doc__kapitel">
            <h2>6 Flucht- und Rettungswege</h2>
            <table className="doc__tabelle">
              <thead>
                <tr>
                  <th>Bezeichnung</th>
                  <th>Art</th>
                  <th>Länge</th>
                  <th>Breite</th>
                  <th>Pers.</th>
                  <th>Ausstattung</th>
                </tr>
              </thead>
              <tbody>
                {projekt.fluchtwege.map((f) => {
                  const ausstattung = [
                    f.sicherheitsbeleuchtung && 'Sicherheitsbeleuchtung',
                    f.fluchtwegorientierung && 'Kennzeichnung',
                    f.panikbeschlag && 'Panikbeschlag',
                    f.fuehrtInsFreie && 'ins Freie',
                  ].filter(Boolean);
                  return (
                    <tr key={f.id}>
                      <td>{f.bezeichnung || '—'}</td>
                      <td>
                        {FLUCHTWEG_ARTEN.find((a) => a.value === f.art)?.label ??
                          f.art}
                      </td>
                      <td>{zahl(f.laenge, 1)} m</td>
                      <td>{zahl(f.breite, 2)} m</td>
                      <td>{f.personen}</td>
                      <td>{ausstattung.join(', ') || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="doc__tabellentitel">
              Flucht- und Rettungswege ({quelle})
            </p>
          </section>
        )}

        {/* ---- 7 Löschhilfen und Löschwasser ------------------------- */}
        <section className="doc__kapitel">
          <h2>7 Löschhilfen und Löschwasserversorgung</h2>

          {projekt.loeschhilfen.length > 0 && (
            <>
              <h3>7.1 Löschhilfen</h3>
              <table className="doc__tabelle">
                <thead>
                  <tr>
                    <th>Art</th>
                    <th>Standort</th>
                    <th>Anzahl</th>
                    <th>LE je Gerät</th>
                    <th>Letzte Prüfung</th>
                  </tr>
                </thead>
                <tbody>
                  {projekt.loeschhilfen.map((l) => (
                    <tr key={l.id}>
                      <td>
                        {LOESCHHILFE_ARTEN.find((a) => a.value === l.art)
                          ?.label ?? l.art}
                      </td>
                      <td>{l.standort || '—'}</td>
                      <td>{l.anzahl}</td>
                      <td>{l.loeschmitteleinheiten || '—'}</td>
                      <td>{l.letztePruefung ? datum(l.letztePruefung) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="doc__tabellentitel">Löschhilfen ({quelle})</p>
            </>
          )}

          <h3>7.2 Löschwasserversorgung</h3>
          <table className="doc__tabelle">
            <tbody>
              <tr>
                <th style={{ width: '52mm' }}>Verfügbare Menge</th>
                <td>{zahl(projekt.loeschwasser.menge)} l/min</td>
              </tr>
              <tr>
                <th>Erforderliche Menge</th>
                <td>{zahl(projekt.loeschwasser.erforderlich)} l/min</td>
              </tr>
              <tr>
                <th>Bereitstellungsdauer</th>
                <td>{zahl(projekt.loeschwasser.dauer)} min</td>
              </tr>
              <tr>
                <th>Entfernung Hydrant</th>
                <td>{zahl(projekt.loeschwasser.hydrantEntfernung)} m</td>
              </tr>
              <tr>
                <th>Löschwasserrückhaltung</th>
                <td>
                  {projekt.loeschwasser.rueckhaltungErforderlich
                    ? 'erforderlich'
                    : 'nicht erforderlich'}
                </td>
              </tr>
            </tbody>
          </table>
          <p className="doc__tabellentitel">Löschwasserversorgung ({quelle})</p>
          {projekt.loeschwasser.bemerkung && (
            <Absaetze text={projekt.loeschwasser.bemerkung} />
          )}
        </section>

        {/* ---- 8 Anlagentechnik -------------------------------------- */}
        {projekt.anlagen.length > 0 && (
          <section className="doc__kapitel">
            <h2>8 Anlagentechnischer Brandschutz</h2>
            <table className="doc__tabelle">
              <thead>
                <tr>
                  <th>Anlage</th>
                  <th>Status</th>
                  <th>Regelwerk</th>
                  <th>Schutzumfang</th>
                  <th>Nächste Prüfung</th>
                </tr>
              </thead>
              <tbody>
                {projekt.anlagen.map((a) => (
                  <tr key={a.id}>
                    <td>
                      {ANLAGEN_ARTEN.find((x) => x.art === a.art)?.label ?? a.art}
                    </td>
                    <td>
                      {ANLAGEN_STATUS.find((s) => s.value === a.status)?.label ??
                        a.status}
                    </td>
                    <td>{a.regelwerk || '—'}</td>
                    <td>{a.schutzumfang || '—'}</td>
                    <td>
                      {a.naechstePruefung ? datum(a.naechstePruefung) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="doc__tabellentitel">
              Anlagentechnischer Brandschutz ({quelle})
            </p>
          </section>
        )}

        {/* ---- 9 Organisatorischer Brandschutz ----------------------- */}
        <section className="doc__kapitel">
          <h2>9 Organisatorischer Brandschutz</h2>
          <table className="doc__tabelle">
            <tbody>
              <tr>
                <th style={{ width: '62mm' }}>Brandschutzbeauftragter</th>
                <td>
                  {projekt.organisation.brandschutzbeauftragter ||
                    (projekt.organisation.brandschutzbeauftragterErforderlich
                      ? 'erforderlich, nicht bestellt'
                      : 'nicht erforderlich')}
                </td>
              </tr>
              <tr>
                <th>Brandschutzwarte</th>
                <td>{projekt.organisation.brandschutzwarte}</td>
              </tr>
              <tr>
                <th>Brandschutzordnung</th>
                <td>{jaNein(projekt.organisation.brandschutzordnungVorhanden)}</td>
              </tr>
              <tr>
                <th>Brandschutzpläne (TRVB O 121)</th>
                <td>
                  {jaNein(projekt.organisation.brandschutzplaeneVorhanden)}
                  {projekt.organisation.brandschutzplaeneStand &&
                    `, Stand ${projekt.organisation.brandschutzplaeneStand}`}
                </td>
              </tr>
              <tr>
                <th>Feuerwehr-Laufkarten</th>
                <td>{jaNein(projekt.organisation.laufkartenVorhanden)}</td>
              </tr>
              <tr>
                <th>Brandschutzbuch</th>
                <td>{jaNein(projekt.organisation.brandschutzbuchGefuehrt)}</td>
              </tr>
              <tr>
                <th>Räumungsübung</th>
                <td>
                  Intervall {projekt.organisation.raeumungsuebungIntervallMonate}{' '}
                  Monate
                  {projekt.organisation.letzteRaeumungsuebung &&
                    `, zuletzt ${datum(projekt.organisation.letzteRaeumungsuebung)}`}
                </td>
              </tr>
            </tbody>
          </table>
          <p className="doc__tabellentitel">
            Organisatorischer Brandschutz ({quelle})
          </p>
          {projekt.organisation.bemerkung && (
            <Absaetze text={projekt.organisation.bemerkung} />
          )}
        </section>

        {/* ---- 10 Bewertungsgrundlage -------------------------------- */}
        <section className="doc__kapitel">
          <h2>10 Bewertungsgrundlage — INGTEC SAFETY-SCORE</h2>
          <p>
            Die festgestellten Mängel werden nach dem INGTEC SAFETY-SCORE in fünf
            Stufen bewertet. Die Einstufung bestimmt die Dringlichkeit der
            Umsetzung.
          </p>
          <table className="doc__tabelle">
            <thead>
              <tr>
                <th style={{ width: '38mm' }}>Bewertung</th>
                <th style={{ width: '44mm' }}>Kurzbewertung</th>
                <th>Beschreibung</th>
              </tr>
            </thead>
            <tbody>
              {SAFETY_SCORES.map((s) => (
                <tr key={s.score}>
                  <td className="beurteilung">
                    <ScoreGrafik score={s.score} breite={124} />
                  </td>
                  <td>{s.kurz}</td>
                  <td>{s.beschreibung}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="doc__tabellentitel">
            Bewertungsgrundlage SAFETY-SCORE (Quelle: INGTEC)
          </p>
        </section>

        {/* ---- 11 Mängelliste ---------------------------------------- */}
        {projekt.massnahmen.length > 0 && (
          <section className="doc__kapitel doc__seitenumbruch">
            <h2>11 Mängel- und Maßnahmenliste</h2>
            <table className="doc__tabelle">
              <thead>
                <tr>
                  <th style={{ width: '10mm' }}>Nr.</th>
                  <th style={{ width: '30mm' }}>Bereich</th>
                  <th>Mangel und Maßnahme</th>
                  <th style={{ width: '12mm' }}>Art</th>
                  <th style={{ width: '28mm' }}>SAFETY-SCORE</th>
                  <th style={{ width: '20mm' }}>Frist</th>
                </tr>
              </thead>
              <tbody>
                {projekt.massnahmen.map((m) => (
                  <tr key={m.id}>
                    <td>{m.lfdNr}</td>
                    <td>{m.bereich || '—'}</td>
                    <td>
                      {m.beschreibung}
                      {m.massnahme && (
                        <>
                          <br />
                          <em>Maßnahme: {m.massnahme}</em>
                        </>
                      )}
                      {m.grundlage && (
                        <>
                          <br />
                          <span className="doc__quelle">{m.grundlage}</span>
                        </>
                      )}
                    </td>
                    <td>
                      {MANGEL_ARTEN.find((a) => a.value === m.art)?.value ??
                        m.art}
                    </td>
                    <td className="beurteilung">
                      <ScoreGrafik score={m.score} breite={96} />
                    </td>
                    <td>{m.frist ? datum(m.frist) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="doc__tabellentitel">
              Mängel- und Maßnahmenliste ({quelle})
            </p>
            <p className="doc__legende">
              Art: b = baulich, t = technisch, o = organisatorisch, e = Empfehlung
            </p>
          </section>
        )}

        {/* ---- 12 Abweichungen --------------------------------------- */}
        {projekt.abweichungen.length > 0 && (
          <section className="doc__kapitel">
            <h2>12 Abweichungen vom Regelwerk</h2>
            {projekt.abweichungen.map((a, i) => (
              <div key={a.id} style={{ marginBottom: '5mm' }}>
                <h3>
                  12.{i + 1} {a.anforderung || 'Abweichung'}
                </h3>
                <p>{a.beschreibung}</p>
                <p>
                  <strong>Kompensation:</strong> {a.kompensation || '—'}
                </p>
                <p>
                  <strong>Nachweis:</strong> {a.nachweis || '—'}
                </p>
                <p>
                  <strong>Behördliche Genehmigung:</strong>{' '}
                  {a.genehmigt ? 'liegt vor' : 'Abstimmung offen'}
                </p>
              </div>
            ))}
          </section>
        )}

        {/* ---- 13 Conclusio ------------------------------------------ */}
        <section className="doc__kapitel">
          <h2>13 Conclusio</h2>
          <Absaetze text={projekt.conclusio} />
        </section>

        <div className="doc__haftung">
          <strong>Verantwortlichkeit.</strong> Dieses Brandschutzkonzept wurde
          rechnergestützt erstellt. Die Anforderungen wurden deterministisch aus
          der OIB-Richtlinie 2 ({projekt.oibAusgabe}) abgeleitet und sind je
          Aussage bis zur Normstelle belegt. Die fachliche und rechtliche
          Verantwortung für den Inhalt liegt beim unterfertigten
          Sachverständigen bzw. Ziviltechniker, nicht beim eingesetzten
          Werkzeug. Die Beurteilung der Gleichwertigkeit bei Abweichungen wurde
          ausschließlich sachverständig vorgenommen.
        </div>

        <div className="doc__fuss">
          <span>
            <span className="doc__fuss-marke">INGTEC</span> GmbH
          </span>
          <span>{berichtsnr}</span>
          <img
            src={signetUrl}
            alt="TECHNIK. BUSINESS. CONSULTING."
            className="doc__fuss-signet"
          />
        </div>
      </article>
    </div>
  );
}

function jaNein(wert: boolean): string {
  return wert ? 'vorhanden' : 'nicht vorhanden';
}

/** Bricht Freitext an Leerzeilen in Absätze um. */
function Absaetze({ text }: { text: string }) {
  const teile = text
    .split(/\n\s*\n/)
    .map((t) => t.trim())
    .filter(Boolean);

  if (teile.length === 0) {
    return <p className="doc__leer">— nicht ausgefüllt —</p>;
  }

  return (
    <>
      {teile.map((t, i) => (
        <p key={i}>{t}</p>
      ))}
    </>
  );
}
