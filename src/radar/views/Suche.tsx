/**
 * Suchmaske — PRD Abschnitt 29.
 *
 * Filter für Hersteller, Modell, Generation, Motor, Getriebe, Preis,
 * Kilometer, Baujahr, Land, Farbe, Originalität, Score und Verkäuferart.
 *
 * Die Liste ist nach Gesamtbewertung sortiert, nicht nach Preis. Das ist der
 * sichtbarste Unterschied zu einer Fahrzeugbörse und folgt unmittelbar aus dem
 * Produktversprechen in Abschnitt 1.
 */

import { useMemo, useState } from 'react';
import { euro } from '../domain/format';
import { useStore } from '../state/store';
import { MODELLE } from '../wissen/modelle';
import { PLATTFORMEN } from '../wissen/plattformen';
import { passtZuAuftrag } from '../engine/alerts';
import { Fahrzeugzeile } from '../components/Fahrzeugzeile';
import { Karte, Leerzustand, Seitenkopf } from '../components/ui';
import type { Verkaeuferart } from '../domain/types';

interface Filter {
  hersteller: string;
  modellId: string;
  getriebe: string;
  land: string;
  plattform: string;
  verkaeuferart: string;
  preisMax: string;
  kilometerMax: string;
  baujahrMin: string;
  gesamtMin: string;
  nurOriginal: boolean;
  nurOhneKritisch: boolean;
  nurFirmenwagen: boolean;
  suchauftragId: string;
  text: string;
}

const LEER: Filter = {
  hersteller: '',
  modellId: '',
  getriebe: '',
  land: '',
  plattform: '',
  verkaeuferart: '',
  preisMax: '',
  kilometerMax: '',
  baujahrMin: '',
  gesamtMin: '',
  nurOriginal: false,
  nurOhneKritisch: false,
  nurFirmenwagen: false,
  suchauftragId: '',
  text: '',
};

export function Suche({ oeffneFahrzeug }: { oeffneFahrzeug: (id: string) => void }) {
  const { analysen, state } = useStore();
  const [filter, setFilter] = useState<Filter>(LEER);

  const setze = <K extends keyof Filter>(schluessel: K, wert: Filter[K]) =>
    setFilter((f) => ({ ...f, [schluessel]: wert }));

  const gefiltert = useMemo(() => {
    const auftrag = state.arbeit.suchauftraege.find((s) => s.id === filter.suchauftragId);
    return analysen.filter((a) => {
      if (auftrag && !passtZuAuftrag(a, auftrag)) return false;
      if (filter.hersteller && a.aktuell.hersteller !== filter.hersteller) return false;
      if (filter.modellId && a.modell?.id !== filter.modellId) return false;
      if (filter.getriebe && a.aktuell.getriebe !== filter.getriebe) return false;
      if (filter.land && a.aktuell.standortLand !== filter.land) return false;
      if (filter.plattform && a.hauptinserat.plattformId !== filter.plattform) return false;
      if (filter.verkaeuferart && a.aktuell.verkaeuferArt !== filter.verkaeuferart) {
        return false;
      }
      if (filter.preisMax && a.aktuell.preis > Number(filter.preisMax)) return false;
      if (
        filter.kilometerMax &&
        a.aktuell.kilometerstand !== null &&
        a.aktuell.kilometerstand > Number(filter.kilometerMax)
      ) {
        return false;
      }
      if (filter.baujahrMin && (a.baujahr ?? 0) < Number(filter.baujahrMin)) return false;
      if (filter.gesamtMin && a.gesamt.wert < Number(filter.gesamtMin)) return false;
      if (filter.nurOriginal && a.text.befunde.some((b) => b.musterId === 'tuning')) {
        return false;
      }
      if (
        filter.nurOhneKritisch &&
        a.redFlags.some((f) => f.schweregrad === 'kritisch')
      ) {
        return false;
      }
      if (filter.nurFirmenwagen && !a.firmenwagen.geeignet) return false;
      if (filter.text) {
        const suchtext = `${a.aktuell.titel} ${a.aktuell.beschreibung} ${a.aktuell.farbeAussen ?? ''}`.toLowerCase();
        if (!suchtext.includes(filter.text.toLowerCase())) return false;
      }
      return true;
    });
  }, [analysen, filter, state.arbeit.suchauftraege]);

  const gemerkt = new Set(state.arbeit.watchlist.map((w) => w.fahrzeugId));
  const hersteller = [...new Set(analysen.map((a) => a.aktuell.hersteller))].sort();
  const laender = [...new Set(analysen.map((a) => a.aktuell.standortLand))].sort();
  const verkaeuferarten: Verkaeuferart[] = ['haendler', 'privat', 'auktionshaus', 'unbekannt'];

  const summe = gefiltert.reduce((s, a) => s + a.aktuell.preis, 0);
  const vorteil = gefiltert.reduce(
    (s, a) => s + (a.bewertung.fairValue > 0 ? a.bewertung.fairValue - a.aktuell.preis : 0),
    0,
  );

  return (
    <>
      <Seitenkopf
        titel="Suche und Kandidaten"
        lead="Sortiert nach Gesamtbewertung, nicht nach Preis. Ein günstiges Fahrzeug steht hier nur oben, wenn es auch ein gutes ist."
        aktion={
          <button type="button" className="btn" onClick={() => setFilter(LEER)}>
            Filter zurücksetzen
          </button>
        }
      />

      <div className="stack stack--lg">
        <Karte titel="Filter" untertitel="Abschnitt 29 — Suchmaske">
          <div className="filterleiste">
            <label className="field">
              <span className="field__label">Suchauftrag</span>
              <select
                className="select"
                value={filter.suchauftragId}
                onChange={(e) => setze('suchauftragId', e.target.value)}
              >
                <option value="">— kein Auftrag —</option>
                {state.arbeit.suchauftraege.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span className="field__label">Hersteller</span>
              <select
                className="select"
                value={filter.hersteller}
                onChange={(e) => setze('hersteller', e.target.value)}
              >
                <option value="">alle</option>
                {hersteller.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span className="field__label">Modell / Generation</span>
              <select
                className="select"
                value={filter.modellId}
                onChange={(e) => setze('modellId', e.target.value)}
              >
                <option value="">alle</option>
                {MODELLE.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.hersteller} {m.modell} {m.baureihe}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span className="field__label">Getriebe</span>
              <select
                className="select"
                value={filter.getriebe}
                onChange={(e) => setze('getriebe', e.target.value)}
              >
                <option value="">alle</option>
                <option value="handschalter">Handschalter</option>
                <option value="doppelkupplung">Doppelkupplung</option>
                <option value="automatik">Automatik</option>
              </select>
            </label>

            <label className="field">
              <span className="field__label">Land</span>
              <select
                className="select"
                value={filter.land}
                onChange={(e) => setze('land', e.target.value)}
              >
                <option value="">alle</option>
                {laender.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span className="field__label">Plattform</span>
              <select
                className="select"
                value={filter.plattform}
                onChange={(e) => setze('plattform', e.target.value)}
              >
                <option value="">alle</option>
                {PLATTFORMEN.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span className="field__label">Verkäuferart</span>
              <select
                className="select"
                value={filter.verkaeuferart}
                onChange={(e) => setze('verkaeuferart', e.target.value)}
              >
                <option value="">alle</option>
                {verkaeuferarten.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span className="field__label">Preis bis (€)</span>
              <input
                className="input"
                type="number"
                value={filter.preisMax}
                onChange={(e) => setze('preisMax', e.target.value)}
                placeholder="z. B. 40000"
              />
            </label>

            <label className="field">
              <span className="field__label">Kilometer bis</span>
              <input
                className="input"
                type="number"
                value={filter.kilometerMax}
                onChange={(e) => setze('kilometerMax', e.target.value)}
                placeholder="z. B. 140000"
              />
            </label>

            <label className="field">
              <span className="field__label">Baujahr ab</span>
              <input
                className="input"
                type="number"
                value={filter.baujahrMin}
                onChange={(e) => setze('baujahrMin', e.target.value)}
                placeholder="z. B. 2008"
              />
            </label>

            <label className="field">
              <span className="field__label">Gesamtbewertung ab</span>
              <input
                className="input"
                type="number"
                value={filter.gesamtMin}
                onChange={(e) => setze('gesamtMin', e.target.value)}
                placeholder="0–100"
              />
            </label>

            <label className="field">
              <span className="field__label">Freitext</span>
              <input
                className="input"
                type="text"
                value={filter.text}
                onChange={(e) => setze('text', e.target.value)}
                placeholder="Farbe, Ausstattung, Wort im Text"
              />
            </label>
          </div>

          <div className="row row--wrap" style={{ marginTop: 'var(--sp-4)', gap: 'var(--sp-5)' }}>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={filter.nurOriginal}
                onChange={(e) => setze('nurOriginal', e.target.checked)}
              />
              Nur Originalzustand (keine erkannte Leistungssteigerung)
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={filter.nurOhneKritisch}
                onChange={(e) => setze('nurOhneKritisch', e.target.checked)}
              />
              Ohne kritische Red Flag
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={filter.nurFirmenwagen}
                onChange={(e) => setze('nurFirmenwagen', e.target.checked)}
              />
              Nur INGTEC-Firmenwagenprofil
            </label>
          </div>
        </Karte>

        <Karte
          titel={`${gefiltert.length} von ${analysen.length} Fahrzeugen`}
          untertitel={
            gefiltert.length > 0
              ? `Angebotssumme ${euro(summe)} · rechnerischer Preisvorteil gegenüber Marktwert ${euro(vorteil)}`
              : undefined
          }
          beurteilung
          flush
        >
          {gefiltert.length === 0 ? (
            <div style={{ padding: 'var(--sp-5)' }}>
              <Leerzustand
                titel="Kein Fahrzeug erfüllt die Filter"
                text="Lockern Sie die Kriterien oder wählen Sie einen anderen Suchauftrag."
              />
            </div>
          ) : (
            <div className="fahrzeugliste" style={{ padding: 'var(--sp-5)' }}>
              {gefiltert.map((a) => (
                <Fahrzeugzeile
                  key={a.fahrzeugId}
                  analyse={a}
                  gemerkt={gemerkt.has(a.fahrzeugId)}
                  onClick={() => oeffneFahrzeug(a.fahrzeugId)}
                />
              ))}
            </div>
          )}
        </Karte>
      </div>
    </>
  );
}
