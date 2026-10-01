/**
 * Ansicht 5 — Mängel (PRD Abschnitt 21).
 *
 * Die fachliche Einstufung eines Mangels und die Rechtsfolge nach § 6 AM-VO
 * sind getrennte Felder. Die Einstufung hier beschreibt ausschließlich die
 * technische Schwere; die Rechtsfolge legt der Prüfer in der Ergebnisansicht
 * ausdrücklich fest (PRD 8, Schritt 6).
 */

import {
  Auswahl,
  Karte,
  LeerZustand,
  Schalter,
  TextBereich,
  TextFeld,
  ZeilenAktion,
} from '@/components/ui';
import {
  FINDING_SEVERITY_LABEL,
  FINDING_STATUS_LABEL,
  FINDING_TYPE_LABEL,
  type FindingSeverity,
  type FindingStatus,
  type FindingType,
} from '@/pruefbefund/domain/enums';
import { MAX_MAENGEL_IM_BEFUND } from '@/pruefbefund/domain/befund';
import { neuerMangel } from '@/pruefbefund/domain/factory';
import type { Finding } from '@/pruefbefund/domain/types';
import { usePruefbefund, usePruefungPatch } from '@/pruefbefund/state/store';

export function Maengel() {
  const { aktivePruefung } = usePruefbefund();
  const patch = usePruefungPatch();

  if (!aktivePruefung) return <LeerZustand titel="Keine Prüfung geöffnet" />;

  // Eigene Bindung, damit die Einengung auch in den Rückrufen gilt.
  const pruefung = aktivePruefung;
  const findings = pruefung.findings;
  const maengel = findings.filter((f) => f.typ === 'DEFECT');

  function aendern(id: string, aenderung: Partial<Finding>) {
    patch({
      findings: findings.map((f) => (f.id === id ? { ...f, ...aenderung } : f)),
    });
  }

  function anlegen() {
    const naechste = Math.max(0, ...findings.map((f) => f.nummer)) + 1;
    patch({ findings: [...findings, neuerMangel(naechste)] });
  }

  function entfernen(id: string) {
    patch({
      findings: findings
        .filter((f) => f.id !== id)
        // Laufende Nummern bleiben lückenlos.
        .map((f, idx) => ({ ...f, nummer: idx + 1 })),
      // Verknüpfungen in Checkliste und Weiterbenützung mitführen.
      items: pruefung.items.map((i) =>
        i.findingId === id ? { ...i, findingId: undefined } : i,
      ),
      weiterbenuetzung: {
        ...pruefung.weiterbenuetzung,
        betroffeneMaengel: pruefung.weiterbenuetzung.betroffeneMaengel.filter(
          (m) => m !== id,
        ),
      },
    });
  }

  return (
    <div className="stack stack--lg">
      <div className="page-head">
        <h1 className="page-head__title">Mängel und Feststellungen</h1>
        <p className="page-head__lead">
          {maengel.length} Mangel/Mängel erfasst. Bis zu {MAX_MAENGEL_IM_BEFUND}{' '}
          Mängel erscheinen unmittelbar im Befund; darüber hinaus bleibt der
          Prüfbefund einseitig und verweist auf die Anlage M-01.
        </p>
      </div>

      <div className="hinweis-box">
        Die fachliche Einstufung beschreibt die technische Schwere. Die
        Rechtsfolge nach § 6 AM-VO wird davon getrennt in der Ergebnisansicht
        festgelegt und nicht aus der Mängelanzahl abgeleitet.
      </div>

      {findings.length === 0 ? (
        <LeerZustand
          titel="Keine Einträge"
          text="Mängel, Feststellungen und Hinweise werden hier erfasst."
          aktion={
            <button type="button" className="btn btn--primary" onClick={anlegen}>
              Mangel erfassen
            </button>
          }
        />
      ) : (
        <div className="stack">
          {findings.map((f) => (
            <MangelKarte
              key={f.id}
              finding={f}
              onChange={(a) => aendern(f.id, a)}
              onLoeschen={() => entfernen(f.id)}
            />
          ))}
          <button type="button" className="btn" onClick={anlegen}>
            + Weiteren Eintrag erfassen
          </button>
        </div>
      )}
    </div>
  );
}

function MangelKarte({
  finding,
  onChange,
  onLoeschen,
}: {
  finding: Finding;
  onChange: (a: Partial<Finding>) => void;
  onLoeschen: () => void;
}) {
  return (
    <Karte
      titel={`${finding.nummer}. ${FINDING_TYPE_LABEL[finding.typ]}`}
      untertitel={finding.beschreibung || 'ohne Beschreibung'}
      aktion={<ZeilenAktion onLoeschen={onLoeschen} titel="Eintrag entfernen" />}
    >
      <div className="form-grid form-grid--2">
        <Auswahl
          label="Art des Eintrags"
          wert={finding.typ}
          optionen={(Object.keys(FINDING_TYPE_LABEL) as FindingType[]).map((t) => ({
            value: t,
            label: FINDING_TYPE_LABEL[t],
          }))}
          onChange={(v) => onChange({ typ: v })}
          hint={'Nur Einträge der Art „Mangel“ lösen die Rechtsfolge nach § 6 AM-VO aus.'}
        />
        <Auswahl
          label="Fachliche Einstufung"
          wert={finding.einstufung}
          optionen={(Object.keys(FINDING_SEVERITY_LABEL) as FindingSeverity[]).map(
            (s) => ({ value: s, label: FINDING_SEVERITY_LABEL[s] }),
          )}
          onChange={(v) => onChange({ einstufung: v })}
          hint="technische Schwere — nicht die Rechtsfolge"
        />
        <TextBereich
          label="Beschreibung"
          className="span-full"
          rows={2}
          wert={finding.beschreibung}
          onChange={(v) => onChange({ beschreibung: v })}
        />
        <TextFeld
          label="Bauteil / Ort"
          wert={finding.bauteil}
          onChange={(v) => onChange({ bauteil: v })}
        />
        <TextFeld
          label="Technische Grundlage"
          wert={finding.grundlage}
          onChange={(v) => onChange({ grundlage: v })}
          hint="Norm, Herstellervorgabe oder Rechtsgrundlage"
        />
        <TextBereich
          label="Maßnahme"
          className="span-full"
          rows={2}
          wert={finding.massnahme}
          onChange={(v) => onChange({ massnahme: v })}
        />
        <TextFeld
          label="Frist zur Behebung"
          type="date"
          wert={finding.frist ?? ''}
          onChange={(v) => onChange({ frist: v || null })}
        />
        <Auswahl
          label="Status"
          wert={finding.status}
          optionen={(Object.keys(FINDING_STATUS_LABEL) as FindingStatus[]).map(
            (s) => ({ value: s, label: FINDING_STATUS_LABEL[s] }),
          )}
          onChange={(v) => onChange({ status: v })}
        />
        <TextFeld
          label="Foto"
          wert={finding.foto ?? ''}
          onChange={(v) => onChange({ foto: v || undefined })}
          hint="Dateiname bzw. Verweis auf die Anlage"
        />
        <TextBereich
          label="Entscheidung des Prüfers"
          className="span-full"
          rows={2}
          wert={finding.entscheidungPruefer}
          onChange={(v) => onChange({ entscheidungPruefer: v })}
        />
      </div>

      <div style={{ marginTop: 'var(--sp-4)' }}>
        <Schalter
          label="Mangel steht der Weiterbenützung entgegen"
          wert={finding.relevantFuerWeiterbenuetzung}
          onChange={(v) => onChange({ relevantFuerWeiterbenuetzung: v })}
        />
      </div>
    </Karte>
  );
}
