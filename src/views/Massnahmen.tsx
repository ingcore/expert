import { useMemo, useState } from 'react';
import { useAktivesProjekt } from '@/state/store';
import { neueMassnahme } from '@/domain/factory';
import {
  MANGEL_ARTEN,
  MASSNAHME_STATUS,
  SAFETY_SCORES,
  SCORE_BY_KEY,
} from '@/domain/catalog';
import { istUeberfaellig, massnahmenKennzahlen } from '@/domain/stats';
import { BERICHTS_KAPITEL, kapitelVon } from '@/domain/score';
import {
  Auswahl,
  Karte,
  Kennzahl,
  LeerZustand,
  ScoreBadge,
  ScoreVerteilung,
  Schalter,
  TextBereich,
  TextFeld,
  ZahlFeld,
  ZeilenAktion,
} from '@/components/ui';
import type { Massnahme, MassnahmeStatus, SafetyScore } from '@/domain/types';

const euroFmt = new Intl.NumberFormat('de-AT', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

export function Massnahmen() {
  const { projekt, patch } = useAktivesProjekt();
  const [statusFilter, setStatusFilter] = useState<MassnahmeStatus | 'alle'>(
    'alle',
  );
  const [scoreFilter, setScoreFilter] = useState<SafetyScore | 'alle'>('alle');

  const massnahmen = projekt?.massnahmen ?? [];
  const kennzahlen = useMemo(
    () => massnahmenKennzahlen(massnahmen),
    [massnahmen],
  );

  const gefiltert = useMemo(
    () =>
      massnahmen.filter((m) => {
        if (statusFilter !== 'alle' && m.status !== statusFilter) return false;
        if (scoreFilter !== 'alle' && m.score !== scoreFilter) return false;
        return true;
      }),
    [massnahmen, statusFilter, scoreFilter],
  );

  if (!projekt) return <LeerZustand titel="Kein Projekt geöffnet" />;

  function setze(id: string, aenderung: Partial<Massnahme>) {
    patch({
      massnahmen: massnahmen.map((m) =>
        m.id === id ? { ...m, ...aenderung } : m,
      ),
    });
  }

  /** Beim Ändern des Scores die empfohlene Frist mitführen. */
  function setzeScore(id: string, score: SafetyScore) {
    const def = SCORE_BY_KEY[score];
    const frist =
      def.fristTage === null
        ? ''
        : new Date(Date.now() + def.fristTage * 86_400_000)
            .toISOString()
            .slice(0, 10);
    setze(id, { score, frist });
  }

  function hinzufuegen() {
    const naechsteNr =
      massnahmen.reduce((max, m) => Math.max(max, m.lfdNr), 0) + 1;
    patch({ massnahmen: [...massnahmen, neueMassnahme(naechsteNr)] });
  }

  function entfernen(id: string) {
    patch({ massnahmen: massnahmen.filter((m) => m.id !== id) });
  }

  return (
    <div className="stack stack--lg">
      <div className="page-head">
        <div>
          <h1 className="page-head__title">Mängel- und Maßnahmenliste</h1>
          <p className="page-head__lead">
            Bewertung nach INGTEC SAFETY-SCORE. Die Frist wird beim Setzen des
            Scores automatisch aus der Bewertungsstufe vorgeschlagen.
          </p>
        </div>
        <button type="button" className="btn btn--primary" onClick={hinzufuegen}>
          + Mangel erfassen
        </button>
      </div>

      <div className="kpi-grid">
        <Kennzahl
          label="Offen"
          wert={kennzahlen.offen}
          ton={kennzahlen.offen > 0 ? 'warn' : 'gut'}
        />
        <Kennzahl label="In Umsetzung" wert={kennzahlen.inUmsetzung} ton="brand" />
        <Kennzahl
          label="Erledigt"
          wert={kennzahlen.erledigt}
          ton="gut"
          hinweis={`von ${kennzahlen.gesamt} gesamt`}
        />
        <Kennzahl
          label="Überfällig"
          wert={kennzahlen.ueberfaellig}
          ton={kennzahlen.ueberfaellig > 0 ? 'gefahr' : 'gut'}
        />
        <Kennzahl
          label="Offene Kosten"
          wert={euroFmt.format(kennzahlen.kostenOffen)}
          hinweis={`gesamt ${euroFmt.format(kennzahlen.kostenGesamt)}`}
        />
      </div>

      <Karte titel="Verteilung nach SAFETY-SCORE">
        <ScoreVerteilung verteilung={kennzahlen.verteilung} />
      </Karte>

      <div className="filterleiste">
        <label className="field">
          <span className="field__label">Status</span>
          <select
            className="select"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as MassnahmeStatus | 'alle')
            }
          >
            <option value="alle">Alle</option>
            {MASSNAHME_STATUS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field__label">SAFETY-SCORE</span>
          <select
            className="select"
            value={scoreFilter}
            onChange={(e) =>
              setScoreFilter(e.target.value as SafetyScore | 'alle')
            }
          >
            <option value="alle">Alle</option>
            {SAFETY_SCORES.map((s) => (
              <option key={s.score} value={s.score}>
                {s.score} — {s.kurz}
              </option>
            ))}
          </select>
        </label>
      </div>

      {gefiltert.length === 0 ? (
        <LeerZustand
          titel={
            massnahmen.length === 0 ? 'Keine Mängel erfasst' : 'Keine Treffer'
          }
          text={
            massnahmen.length === 0
              ? 'Erfassen Sie Mängel manuell oder übernehmen Sie Befunde aus der Regelwerksprüfung.'
              : 'Passen Sie die Filter an.'
          }
          aktion={
            massnahmen.length === 0 ? (
              <button
                type="button"
                className="btn btn--primary"
                onClick={hinzufuegen}
              >
                + Ersten Mangel erfassen
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="liste">
          {gefiltert.map((m) => {
            const ueberfaellig = istUeberfaellig(m);
            return (
              <div key={m.id} className="liste__eintrag">
                <div className="liste__kopf">
                  <span className="liste__nr">{m.lfdNr}</span>
                  <ScoreBadge score={m.score} mitText />
                  <span className="badge">
                    {MANGEL_ARTEN.find((a) => a.value === m.art)?.label}
                  </span>
                  <span
                    className={`badge ${
                      m.status === 'erledigt' ? 'badge--success' : ''
                    }`}
                  >
                    {MASSNAHME_STATUS.find((s) => s.value === m.status)?.label}
                  </span>
                  {ueberfaellig && (
                    <span className="badge badge--danger">Überfällig</span>
                  )}
                  <span className="spacer" />
                  <ZeilenAktion onLoeschen={() => entfernen(m.id)} />
                </div>

                <div className="stack">
                  <div className="form-grid">
                    <TextFeld
                      label="Bereich / Objekt"
                      wert={m.bereich}
                      onChange={(bereich) => setze(m.id, { bereich })}
                    />
                    <Auswahl
                      label="SAFETY-SCORE"
                      wert={m.score}
                      optionen={SAFETY_SCORES.map((s) => ({
                        value: s.score,
                        label: `${s.score} — ${s.kurz}`,
                      }))}
                      onChange={(score) => setzeScore(m.id, score)}
                      hint={SCORE_BY_KEY[m.score].beschreibung}
                    />
                    <Auswahl
                      label="Art"
                      wert={m.art}
                      optionen={MANGEL_ARTEN}
                      onChange={(art) => setze(m.id, { art })}
                    />
                    <Auswahl
                      label="Berichtskapitel"
                      wert={kapitelVon(m)}
                      optionen={BERICHTS_KAPITEL.map((k) => ({
                        value: k.value,
                        label: `${k.value} ${k.label}`,
                      }))}
                      onChange={(kapitel) => setze(m.id, { kapitel })}
                      hint="Zählt zum Teilscore dieses Kapitels"
                    />
                    <Auswahl
                      label="Status"
                      wert={m.status}
                      optionen={MASSNAHME_STATUS}
                      onChange={(status) => setze(m.id, { status })}
                    />
                  </div>

                  <TextBereich
                    label="Mängelbeschreibung"
                    wert={m.beschreibung}
                    rows={3}
                    onChange={(beschreibung) => setze(m.id, { beschreibung })}
                  />
                  <TextBereich
                    label="Erforderliche Maßnahme"
                    wert={m.massnahme}
                    rows={3}
                    onChange={(massnahme) => setze(m.id, { massnahme })}
                  />
                  <Schalter
                    label="Verbleibende Abweichung ohne Maßnahme (bleibt im Soll-Score)"
                    wert={!!m.verbleibend}
                    onChange={(verbleibend) => setze(m.id, { verbleibend })}
                  />

                  <div className="form-grid">
                    <TextFeld
                      label="Rechtsgrundlage"
                      wert={m.grundlage}
                      onChange={(grundlage) => setze(m.id, { grundlage })}
                      placeholder="z. B. OIB-RL 2, Pkt. 5.2.1"
                    />
                    <TextFeld
                      label="Frist"
                      type="date"
                      wert={m.frist}
                      onChange={(frist) => setze(m.id, { frist })}
                      hint={
                        SCORE_BY_KEY[m.score].fristTage === null
                          ? 'keine Frist erforderlich'
                          : `Empfehlung: ${SCORE_BY_KEY[m.score].fristTage} Tage`
                      }
                    />
                    <TextFeld
                      label="Verantwortlich"
                      wert={m.verantwortlich}
                      onChange={(verantwortlich) =>
                        setze(m.id, { verantwortlich })
                      }
                    />
                    <ZahlFeld
                      label="Geschätzte Kosten"
                      einheit="EUR"
                      wert={m.kosten}
                      step={100}
                      onChange={(kosten) => setze(m.id, { kosten })}
                    />
                  </div>

                  <TextBereich
                    label="Bemerkung"
                    wert={m.bemerkung}
                    rows={2}
                    onChange={(bemerkung) => setze(m.id, { bemerkung })}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
