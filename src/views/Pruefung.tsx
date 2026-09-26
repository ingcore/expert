import { useMemo, useState } from 'react';
import { useAktivesProjekt } from '@/state/store';
import { befundStatistik } from '@/domain/rules';
import { neueMassnahme } from '@/domain/factory';
import { kapitelAusBefund } from '@/domain/score';
import { SCORE_BY_KEY } from '@/domain/catalog';
import { Karte, Kennzahl, LeerZustand, ScoreBadge } from '@/components/ui';
import type { Befund, BefundSchwere } from '@/domain/types';

const SCHWERE_LABEL: Record<BefundSchwere, string> = {
  fehler: 'Regelverstoß',
  warnung: 'Warnung',
  hinweis: 'Hinweis',
  info: 'Information',
};

export function Pruefung({ befunde }: { befunde: Befund[] }) {
  const { projekt, patch } = useAktivesProjekt();
  const [filter, setFilter] = useState<BefundSchwere | 'alle'>('alle');
  const [uebernommen, setUebernommen] = useState<Set<string>>(new Set());

  const stat = useMemo(() => befundStatistik(befunde), [befunde]);

  const gefiltert = useMemo(
    () => (filter === 'alle' ? befunde : befunde.filter((b) => b.schwere === filter)),
    [befunde, filter],
  );

  if (!projekt) {
    return <LeerZustand titel="Kein Projekt geöffnet" />;
  }

  /** Erzeugt aus einem Befund einen Eintrag in der Mängelliste. */
  function alsMassnahme(befund: Befund, index: number) {
    if (!projekt || !befund.scoreVorschlag) return;

    const naechsteNr =
      projekt.massnahmen.reduce((max, m) => Math.max(max, m.lfdNr), 0) + 1;
    const vorlage = neueMassnahme(naechsteNr);
    const def = SCORE_BY_KEY[befund.scoreVorschlag];
    const frist =
      def.fristTage === null
        ? ''
        : new Date(Date.now() + def.fristTage * 86_400_000)
            .toISOString()
            .slice(0, 10);

    patch({
      massnahmen: [
        ...projekt.massnahmen,
        {
          ...vorlage,
          bereich: befund.kapitel,
          kapitel: kapitelAusBefund(befund.kapitel) ?? vorlage.kapitel,
          beschreibung: `${befund.titel}: ${befund.beschreibung}`,
          massnahme: '',
          score: befund.scoreVorschlag,
          grundlage: befund.grundlage,
          frist,
        },
      ],
    });

    setUebernommen((s) => new Set(s).add(`${befund.regelId}-${index}`));
  }

  return (
    <div className="stack stack--lg">
      <div className="page-head">
        <div>
          <h1 className="page-head__title">Regelwerksprüfung</h1>
          <p className="page-head__lead">
            Automatische Plausibilitätsprüfung des Konzepts gegen OIB-Richtlinie 2,
            TRVB und Arbeitnehmerschutz. Die Prüfung ersetzt keine
            sachverständige Beurteilung, sondern markiert Stellen, die eine
            fachliche Würdigung brauchen.
          </p>
        </div>
      </div>

      <div className="kpi-grid">
        <Kennzahl
          label="Regelverstöße"
          wert={stat.fehler}
          ton={stat.fehler > 0 ? 'gefahr' : 'gut'}
          hinweis="Anforderung nicht eingehalten"
        />
        <Kennzahl
          label="Warnungen"
          wert={stat.warnung}
          ton={stat.warnung > 0 ? 'warn' : 'gut'}
          hinweis="fachliche Prüfung nötig"
        />
        <Kennzahl label="Hinweise" wert={stat.hinweis} ton="brand" />
        <Kennzahl label="Befunde gesamt" wert={stat.gesamt} />
      </div>

      <Karte
        titel="Befunde"
        untertitel={`${gefiltert.length} von ${befunde.length} angezeigt`}
        aktion={
          <div className="pill-row">
            {(['alle', 'fehler', 'warnung', 'hinweis'] as const).map((f) => (
              <button
                key={f}
                type="button"
                className={`btn btn--sm ${filter === f ? 'btn--dark' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'alle' ? 'Alle' : SCHWERE_LABEL[f]}
              </button>
            ))}
          </div>
        }
        flush
      >
        {gefiltert.length === 0 ? (
          <LeerZustand
            titel={
              befunde.length === 0
                ? 'Keine Beanstandungen'
                : 'Keine Befunde in dieser Kategorie'
            }
            text={
              befunde.length === 0
                ? 'Das Konzept erfüllt die geprüften Anforderungen des Regelwerks.'
                : 'Wählen Sie eine andere Kategorie.'
            }
          />
        ) : (
          <div>
            {gefiltert.map((b, i) => {
              const schluessel = `${b.regelId}-${i}`;
              const istUebernommen = uebernommen.has(schluessel);
              return (
                <div key={schluessel} className={`befund befund--${b.schwere}`}>
                  <div className="befund__marke" />
                  <div>
                    <div className="row row--wrap">
                      <span className="befund__titel">{b.titel}</span>
                      <span className="badge">{SCHWERE_LABEL[b.schwere]}</span>
                      {b.scoreVorschlag && (
                        <ScoreBadge score={b.scoreVorschlag} />
                      )}
                      <span className="spacer" />
                      {b.scoreVorschlag && (
                        <button
                          type="button"
                          className="btn btn--sm"
                          disabled={istUebernommen}
                          onClick={() => alsMassnahme(b, i)}
                        >
                          {istUebernommen
                            ? '✓ Übernommen'
                            : 'In Mängelliste übernehmen'}
                        </button>
                      )}
                    </div>
                    <p className="befund__text">{b.beschreibung}</p>
                    <div className="befund__meta">
                      <span className="befund__grundlage">{b.grundlage}</span>
                      <span>Kapitel: {b.kapitel}</span>
                      <span className="mono">{b.regelId}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Karte>
    </div>
  );
}
