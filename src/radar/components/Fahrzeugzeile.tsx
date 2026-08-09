/**
 * Eine Zeile der Kandidatenliste.
 *
 * Sie beantwortet auf einen Blick, was PRD Abschnitt 55 als zentrales
 * Produktprinzip formuliert: Ist das ein wirklich gutes Fahrzeug oder ein
 * lediglich billig dargestelltes? Deshalb steht neben dem Preis immer die
 * Abweichung zum Marktwert, der Rang und — falls vorhanden — die Zahl der
 * kritischen Feststellungen.
 */

import { euro, kilometer, monat, relativeZeit } from '../domain/format';
import type { Fahrzeuganalyse } from '../engine/analyse';
import { plattformName } from '../wissen/plattformen';
import { Abweichung, Marke, Rangplakette, Signalabzeichen } from './ui';

export function Fahrzeugzeile({
  analyse,
  gemerkt,
  onClick,
}: {
  analyse: Fahrzeuganalyse;
  gemerkt?: boolean;
  onClick: () => void;
}) {
  const a = analyse;
  const kritisch = a.redFlags.filter((f) => f.schweregrad === 'kritisch').length;
  const hoch = a.redFlags.filter((f) => f.schweregrad === 'hoch').length;

  return (
    <button
      type="button"
      className={`fahrzeugzeile ${gemerkt ? 'fahrzeugzeile--gemerkt' : ''}`}
      onClick={onClick}
    >
      <Rangplakette rang={a.gesamt.rang} wert={a.gesamt.wert} />

      <div className="fahrzeugzeile__haupt">
        <div className="fahrzeugzeile__titel">{a.aktuell.titel}</div>
        <div className="fahrzeugzeile__meta">
          <span>{monat(a.aktuell.erstzulassung)}</span>
          <span>{kilometer(a.aktuell.kilometerstand)}</span>
          <span>{a.aktuell.getriebe}</span>
          <span>
            {a.aktuell.standortOrt} ({a.aktuell.standortLand})
          </span>
          <span>{plattformName(a.hauptinserat.plattformId)}</span>
          <span>seit {relativeZeit(a.hauptinserat.erstEntdeckt)}</span>
          {a.historie.anzahlInserate > 1 && (
            <span>{a.historie.anzahlInserate} Inserate</span>
          )}
        </div>
      </div>

      <div className="fahrzeugzeile__preis">
        <div className="fahrzeugzeile__betrag">{euro(a.aktuell.preis)}</div>
        <div className="fahrzeugzeile__signale">
          {a.bewertung.fairValue > 0 ? (
            <Abweichung prozentwert={a.bewertung.abweichungProzent} />
          ) : (
            <span className="subtle">kein Marktwert</span>
          )}
          <Signalabzeichen ausgeloest={a.buySignal.ausgeloest} />
          {kritisch > 0 && <Marke ton="gefahr">{kritisch} kritisch</Marke>}
          {kritisch === 0 && hoch > 0 && <Marke ton="warn">{hoch} Red Flags</Marke>}
          {a.firmenwagen.geeignet && <Marke ton="brand">Firmenwagen</Marke>}
        </div>
      </div>
    </button>
  );
}
