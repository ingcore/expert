/**
 * Berichtszeichen (CD 4.3): Original-Prüfhaken, Original-X und die davon
 * abgeleiteten Zeichen für Berichte. Sie stehen im Bericht in
 * Markenschwarz und immer vor dem Wort, das ihre Bedeutung nennt.
 */
import erfuellt from '@/assets/berichtszeichen/zeichen-erfuellt.svg';
import mangel from '@/assets/berichtszeichen/zeichen-mangel.svg';
import warnung from '@/assets/berichtszeichen/zeichen-warnung.svg';
import hinweis from '@/assets/berichtszeichen/zeichen-hinweis.svg';
import nichtBewertet from '@/assets/berichtszeichen/zeichen-nicht-bewertet.svg';
import massnahme from '@/assets/berichtszeichen/zeichen-massnahme.svg';
import empfehlung from '@/assets/berichtszeichen/zeichen-empfehlung.svg';
import nachpruefung from '@/assets/berichtszeichen/zeichen-nachpruefung.svg';

export type BerichtszeichenArt =
  | 'erfuellt'
  | 'mangel'
  | 'warnung'
  | 'hinweis'
  | 'nicht-bewertet'
  | 'massnahme'
  | 'empfehlung'
  | 'nachpruefung';

/** Grafik, Wort und Ersatzzeichen (Markdown, Klartext) je Berichtszeichen. */
export const BERICHTSZEICHEN: Record<
  BerichtszeichenArt,
  { src: string; wort: string; zeichen: string }
> = {
  erfuellt: { src: erfuellt, wort: 'erfüllt', zeichen: '✓' },
  mangel: { src: mangel, wort: 'Mangel', zeichen: '✕' },
  warnung: { src: warnung, wort: 'Warnung', zeichen: '▲' },
  hinweis: { src: hinweis, wort: 'Hinweis', zeichen: 'ⓘ' },
  'nicht-bewertet': { src: nichtBewertet, wort: 'nicht bewertet', zeichen: '□' },
  massnahme: { src: massnahme, wort: 'Maßnahme', zeichen: '→' },
  empfehlung: { src: empfehlung, wort: 'Empfehlung', zeichen: '◇' },
  nachpruefung: { src: nachpruefung, wort: 'Nachprüfung', zeichen: '↻' },
};

/**
 * Das Zeichen allein; das Wort setzt der Aufrufer sichtbar daneben. Die
 * Grafik ist deshalb für Screenreader ausgeblendet.
 */
export function Berichtszeichen({ art }: { art: BerichtszeichenArt }) {
  const z = BERICHTSZEICHEN[art];
  return (
    <img
      className={`doc__zeichen doc__zeichen--${art}`}
      src={z.src}
      alt=""
      aria-hidden="true"
    />
  );
}
