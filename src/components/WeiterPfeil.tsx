/**
 * Weiter-Pfeil des Deckblatts: drei gleiche Chevrons im Winkel der
 * Skalengrafik (Versatz 1,575 × halbe Höhe), von hell nach dunkel in
 * INGTEC-Grün. Am Bildschirm leuchten sie beim Öffnen einmal nacheinander
 * auf (je 160 ms); bei „Bewegung reduzieren" und im Druck stehen sie still.
 * Der Text nennt das Ziel und ist ein Sprunglink.
 */

const TOENE = ['#d8e7a4', '#c4db76', '#9dc31a'];

function chevron(x: number): string {
  // Armstärke 18, halbe Höhe 20, waagrechter Versatz 1,575 × 20 = 31,5
  return `${x},0 ${x + 18},0 ${x + 49.5},20 ${x + 18},40 ${x},40 ${x + 31.5},20`;
}

export function WeiterPfeil({ ziel, text }: { ziel: string; text: string }) {
  return (
    <a className="weiter-pfeil" href={ziel}>
      <span className="weiter-pfeil__text">{text}</span>
      <svg
        className="weiter-pfeil__zeichen"
        viewBox="0 0 130 40"
        aria-hidden="true"
      >
        {TOENE.map((farbe, i) => (
          <polygon
            key={farbe}
            className="weiter-pfeil__chevron"
            style={{ animationDelay: `${i * 160}ms` }}
            points={chevron(i * 40)}
            fill={farbe}
          />
        ))}
      </svg>
    </a>
  );
}
