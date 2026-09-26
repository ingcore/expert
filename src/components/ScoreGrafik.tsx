/**
 * INGTEC SAFETY-SCORE-Bewertungsgrafik.
 *
 * Die fünf Grafiken sind die Originalassets aus dem INGTEC-Berichtslayout
 * (geschützt, ausschließlich für INGTEC-eigene Berichte). Jede zeigt die
 * vollständige Skala A–E mit hervorgehobener Bewertungsstufe und steht laut
 * CD 1.1 nur im Bandtacho der Gesamtbewertung und dort nur für das Ist; sonst
 * trägt die Plakette die Stufe.
 */

import aRated from '@/assets/safety-score/A-rated.svg';
import bRated from '@/assets/safety-score/B-rated.svg';
import cRated from '@/assets/safety-score/C-rated.svg';
import dRated from '@/assets/safety-score/D-rated.svg';
import eRated from '@/assets/safety-score/E-rated.svg';
import { SCORE_BY_KEY } from '@/domain/catalog';
import type { SafetyScore } from '@/domain/types';

const GRAFIKEN: Record<SafetyScore, string> = {
  A: aRated,
  B: bRated,
  C: cRated,
  D: dRated,
  E: eRated,
};

export function ScoreGrafik({
  score,
  breite = 100,
  vollbreite = false,
}: {
  score: SafetyScore;
  /** Darstellungsbreite in Pixeln; das Seitenverhältnis bleibt erhalten. */
  breite?: number;
  /** Volle Breite des umgebenden Blocks (Bandtacho: volle Textbreite). */
  vollbreite?: boolean;
}) {
  const def = SCORE_BY_KEY[score];
  return (
    <img
      src={GRAFIKEN[score]}
      alt={`SAFETY-SCORE ${score} — ${def.kurz}`}
      width={breite}
      height={Math.round((breite * 84.36) / 281.65)}
      style={{ width: vollbreite ? '100%' : breite, height: 'auto' }}
    />
  );
}

export { GRAFIKEN as SCORE_GRAFIKEN };
