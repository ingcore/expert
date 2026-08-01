/**
 * Confidence-Ampel nach PRD Abschnitt 12.3.
 *
 * Sie ist technisch, visuell und sprachlich vom Safety-Score zu trennen: Der
 * Score bewertet den sicherheitstechnischen Zustand, die Ampel die Herkunft
 * und Verlässlichkeit einer Aussage.
 *
 * Farbe ist nie das einzige Merkmal — jede Ampel trägt Text und Symbol
 * (PRD 10.3, Produktgrundsatz P-07).
 */

import type { Ampel as AmpelStufe } from '@/engine/types';

interface AmpelDefinition {
  label: string;
  symbol: string;
  erklaerung: string;
}

export const AMPEL_DEFINITION: Record<AmpelStufe, AmpelDefinition> = {
  gruen: {
    label: 'Engine',
    symbol: '●',
    erklaerung:
      'Aus der Regel-Engine, deterministisch aus der Anforderungsmatrix belegt.',
  },
  gelb: {
    label: 'Formuliert',
    symbol: '◐',
    erklaerung:
      'Auf Basis geprüfter Fakten formuliert oder wegen fehlender Eingaben noch offen. Fachliche Sichtung erforderlich.',
  },
  rot: {
    label: 'Prüfpflicht',
    symbol: '▲',
    erklaerung:
      'Auslegungsfrage, Abweichung oder Regelkonflikt. Zwingend durch den Sachverständigen zu beurteilen.',
  },
};

export function Ampel({
  stufe,
  mitLabel = true,
}: {
  stufe: AmpelStufe;
  mitLabel?: boolean;
}) {
  const def = AMPEL_DEFINITION[stufe];
  return (
    <span className={`ampel ampel--${stufe}`} title={def.erklaerung}>
      <span className="ampel__punkt" aria-hidden="true" />
      <span aria-hidden="true">{def.symbol}</span>
      {mitLabel && <span>{def.label}</span>}
      <span className="visually-hidden">{def.erklaerung}</span>
    </span>
  );
}

/** Legende der drei Stufen, für Prüfungs- und Freigabeansicht. */
export function AmpelLegende() {
  return (
    <div className="stack stack--sm">
      {(['gruen', 'gelb', 'rot'] as AmpelStufe[]).map((stufe) => (
        <div key={stufe} className="row" style={{ alignItems: 'flex-start' }}>
          <Ampel stufe={stufe} />
          <span
            className="muted"
            style={{ fontSize: 'var(--fs-md)', lineHeight: 'var(--lh-snug)' }}
          >
            {AMPEL_DEFINITION[stufe].erklaerung}
          </span>
        </div>
      ))}
    </div>
  );
}
