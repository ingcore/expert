/**
 * INGTEC-Wortmarke. Das SVG stammt aus dem Original-Berichtslayout und wird
 * inline eingebunden, damit die Farben per CSS an den Untergrund angepasst
 * werden können (helle Schrift auf dunkler Seitenleiste).
 */

import logoUrl from '@/assets/ingtec-logo.svg';

export function Logo({ className }: { className?: string }) {
  return (
    <img
      src={logoUrl}
      alt="INGTEC — TECHNIK.WIRKT"
      className={className}
      width={547}
      height={100}
    />
  );
}

export { logoUrl };
