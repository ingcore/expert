/**
 * Ansicht 7 — Einseitenbefund: Vorschau, Freigabe, Signatur (PRD 21).
 *
 * Der Freigabeprozess folgt PRD 15:
 *   DRAFT → PRÜFUNG ABGESCHLOSSEN → TECHNISCH FREIGEGEBEN → SIGNIERT
 * Nach der Signatur ist der Befund inhaltlich gesperrt; eine Änderung erzeugt
 * eine neue Dokumentversion mit Bezug auf die ersetzte Fassung.
 */

import { Karte, LeerZustand, Schalter } from '@/components/ui';
import { OnePage } from '@/pruefbefund/components/OnePage';
import {
  baueBefund,
  befundAlsText,
  befundHash,
} from '@/pruefbefund/domain/befund';
import { CHECKLISTEN_VERSION } from '@/pruefbefund/domain/checklist';
import {
  REPORT_STATUS_FOLGE,
  REPORT_STATUS_LABEL,
  istGesperrt,
  type ReportStatus,
} from '@/pruefbefund/domain/enums';
import { heute } from '@/pruefbefund/domain/intervall';
import { statuswechselErlaubt, validiere } from '@/pruefbefund/domain/validierung';
import type { ReportVersion } from '@/pruefbefund/domain/types';
import {
  usePruefbefund,
  usePruefungKontext,
  usePruefungPatch,
} from '@/pruefbefund/state/store';

export function Befund() {
  const { aktivePruefung } = usePruefbefund();
  const patch = usePruefungPatch();
  const { asset, customer, site, inspector } = usePruefungKontext(aktivePruefung);

  if (!aktivePruefung || !asset || !customer || !site) {
    return <LeerZustand titel="Keine Prüfung geöffnet" />;
  }

  const validierung = validiere({ inspection: aktivePruefung, asset, inspector });
  const modell = baueBefund({
    inspection: aktivePruefung,
    asset,
    customer,
    site,
    inspector,
  });
  const hash = befundHash(modell);
  const gesperrt = istGesperrt(aktivePruefung.status);

  const naechsterStatus = naechsterSchritt(aktivePruefung.status);
  const wechsel = naechsterStatus
    ? statuswechselErlaubt(aktivePruefung.status, naechsterStatus, validierung)
    : { erlaubt: false, grund: 'Der Befund ist abgeschlossen.' };

  function statusSetzen(nach: ReportStatus) {
    if (!aktivePruefung) return;
    const versionen: ReportVersion[] =
      nach === 'SIGNED'
        ? [
            ...aktivePruefung.versionen,
            {
              befundId: aktivePruefung.befundnummer,
              version: aktivePruefung.versionen.length + 1,
              datensatzVersion: aktivePruefung.geaendertAm,
              checklistenVersion: CHECKLISTEN_VERSION,
              rechtsregelVersion: `Stichtag ${aktivePruefung.pruefdatum}`,
              templateVersion: modell.templateVersion,
              ersteller: inspector?.name ?? 'unbekannt',
              freigeber: inspector?.name ?? 'unbekannt',
              zeitstempel: new Date().toISOString(),
              pdfHash: hash,
              status: nach,
            },
          ]
        : aktivePruefung.versionen;

    patch({
      status: nach,
      freigabedatum:
        nach === 'RELEASED' || nach === 'SIGNED'
          ? (aktivePruefung.freigabedatum ?? heute())
          : aktivePruefung.freigabedatum,
      versionen,
    });
  }

  return (
    <div className="stack stack--lg">
      <div className="page-head no-print">
        <h1 className="page-head__title">Prüfbefund</h1>
        <p className="page-head__lead">
          Der Prüfbefund umfasst genau eine A4-Seite. Mängelliste, Fotos und
          Detailcheckliste sind Anlagen und werden nicht in den Befund
          aufgenommen.
        </p>
      </div>

      {/* ---- Freigabeprozess --------------------------------------------- */}
      <div className="no-print">
        <Karte titel="Freigabe und Signatur">
          <div className="pill-row" style={{ marginBottom: 'var(--sp-5)' }}>
            {REPORT_STATUS_FOLGE.map((s) => (
              <span
                key={s}
                className={`badge ${
                  aktivePruefung.status === s ? 'badge--brand' : ''
                }`}
              >
                {REPORT_STATUS_LABEL[s]}
              </span>
            ))}
            {aktivePruefung.status === 'SUPERSEDED' && (
              <span className="badge badge--warning">ersetzt</span>
            )}
          </div>

          <div
            className={`freigabe-status ${
              validierung.abschliessbar
                ? 'freigabe-status--frei'
                : 'freigabe-status--blockiert'
            }`}
          >
            <span className="freigabe-status__icon" aria-hidden="true">
              {validierung.abschliessbar ? '✓' : '✕'}
            </span>
            <div>
              <strong>
                {validierung.erzeugbar
                  ? validierung.abschliessbar
                    ? 'Befund freigabefähig'
                    : 'Befund erzeugbar, aber nicht abschließbar'
                  : 'Befunderzeugung blockiert'}
              </strong>
              <div className="subtle">
                {validierung.blocker.length} blockierend ·{' '}
                {validierung.nichtFinal.length} abschlusshemmend ·{' '}
                {validierung.warnungen.length} Warnung(en)
              </div>
            </div>
          </div>

          {!validierung.erzeugbar && (
            <ul className="stack stack--sm" style={{ marginTop: 'var(--sp-4)' }}>
              {validierung.blocker.map((b, i) => (
                <li key={`${b.code}-${i}`} className="befund befund--fehler">
                  <div className="befund__marke" aria-hidden="true">✕</div>
                  <div>
                    <div className="befund__titel">{b.code}</div>
                    <div className="befund__text">{b.text}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div style={{ marginTop: 'var(--sp-5)' }}>
            <Schalter
              label="Unterschrift des Prüfers liegt vor (§ 11 AM-VO)"
              wert={aktivePruefung.unterschriftVorhanden}
              onChange={(v) => patch({ unterschriftVorhanden: v })}
            />
          </div>

          <div className="row row--wrap" style={{ marginTop: 'var(--sp-5)' }}>
            {naechsterStatus && (
              <button
                type="button"
                className="btn btn--primary"
                disabled={!wechsel.erlaubt || gesperrt}
                onClick={() => statusSetzen(naechsterStatus)}
                title={wechsel.grund}
              >
                Weiter zu „{REPORT_STATUS_LABEL[naechsterStatus]}"
              </button>
            )}
            <button
              type="button"
              className="btn"
              onClick={() => window.print()}
              disabled={!validierung.erzeugbar}
            >
              Befund drucken / als PDF sichern
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => {
                void navigator.clipboard?.writeText(befundAlsText(modell));
              }}
            >
              Befundtext kopieren
            </button>
            {aktivePruefung.status !== 'DRAFT' && !gesperrt && (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => statusSetzen('DRAFT')}
              >
                Zurück in Bearbeitung
              </button>
            )}
          </div>

          {wechsel.grund && !wechsel.erlaubt && (
            <p className="muted" style={{ marginTop: 'var(--sp-3)' }}>
              {wechsel.grund}
            </p>
          )}
        </Karte>
      </div>

      {/* ---- Revisionsangaben -------------------------------------------- */}
      <div className="no-print">
        <Karte
          titel="Revisionsangaben"
          untertitel="Jeder finale Befund ist einer Checklisten-, Rechtsregel- und Templateversion zuordenbar."
        >
          <div className="table-wrap">
            <table className="table">
              <tbody>
                <tr>
                  <th scope="row">Befund-ID</th>
                  <td className="mono">{aktivePruefung.befundnummer}</td>
                </tr>
                <tr>
                  <th scope="row">Checklistenversion</th>
                  <td className="mono">{CHECKLISTEN_VERSION}</td>
                </tr>
                <tr>
                  <th scope="row">Rechtsregelstand</th>
                  <td className="mono">
                    Stichtag {aktivePruefung.pruefdatum} ·{' '}
                    {modell.regelstand.regeln.length} Regel(n)
                  </td>
                </tr>
                <tr>
                  <th scope="row">Templateversion</th>
                  <td className="mono">{modell.templateVersion}</td>
                </tr>
                <tr>
                  <th scope="row">Inhaltshash</th>
                  <td className="mono">{hash}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {aktivePruefung.versionen.length > 0 && (
            <div className="table-wrap" style={{ marginTop: 'var(--sp-5)' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Version</th>
                    <th scope="col">Zeitstempel</th>
                    <th scope="col">Freigeber</th>
                    <th scope="col">Hash</th>
                  </tr>
                </thead>
                <tbody>
                  {aktivePruefung.versionen.map((v) => (
                    <tr key={v.version}>
                      <td className="num">{v.version}</td>
                      <td>{new Date(v.zeitstempel).toLocaleString('de-AT')}</td>
                      <td>{v.freigeber}</td>
                      <td className="mono">{v.pdfHash}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Karte>
      </div>

      {/* ---- Einseitenbefund --------------------------------------------- */}
      <div className="onepage-buehne">
        <OnePage modell={modell} />
      </div>
    </div>
  );
}

/** Nächster Schritt in der Freigabekette; null am Ende der Kette. */
function naechsterSchritt(status: ReportStatus): ReportStatus | null {
  const idx = REPORT_STATUS_FOLGE.indexOf(status);
  if (idx < 0 || idx === REPORT_STATUS_FOLGE.length - 1) return null;
  return REPORT_STATUS_FOLGE[idx + 1];
}
