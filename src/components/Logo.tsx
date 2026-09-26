/**
 * INGTEC-Wortmarke als Originaldatei aus dem Berichtslayout. Im dunklen Thema
 * steht die festgelegte Negativfassung (Schriftzug und Signetbalken weiß, das
 * Grün unverändert, CD 2.3); umgeschaltet wird per Stylesheet.
 */

import logoUrl from '@/assets/ingtec-logo.svg';
import logoNegativUrl from '@/assets/ingtec-logo-negativ.svg';

export function Logo({ className }: { className?: string }) {
  return (
    <span className={`logo ${className ?? ''}`}>
      <img
        src={logoUrl}
        alt="INGTEC — TECHNIK.WIRKT"
        className="logo__positiv"
        width={547}
        height={100}
      />
      <img
        src={logoNegativUrl}
        alt="INGTEC — TECHNIK.WIRKT"
        className="logo__negativ"
        width={547}
        height={100}
      />
    </span>
  );
}

export { logoUrl };
