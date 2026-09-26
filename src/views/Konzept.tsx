import { useMemo, useState } from 'react';
import { useAktivesProjekt } from '@/state/store';
import { pruefeProjekt } from '@/domain/rules';
import { vollstaendigkeit } from '@/domain/stats';
import { Fortschritt, LeerZustand } from '@/components/ui';
import { KapitelStammdaten } from '@/views/kapitel/Stammdaten';
import { KapitelGebaeude } from '@/views/kapitel/Gebaeude';
import { KapitelNutzung } from '@/views/kapitel/Nutzung';
import { KapitelBrandabschnitte } from '@/views/kapitel/Brandabschnitte';
import { KapitelBauteile } from '@/views/kapitel/Bauteile';
import { KapitelFluchtwege } from '@/views/kapitel/Fluchtwege';
import { KapitelLoeschhilfen } from '@/views/kapitel/Loeschhilfen';
import { KapitelAnlagen } from '@/views/kapitel/Anlagen';
import { KapitelOrganisation } from '@/views/kapitel/Organisation';
import { KapitelAbweichungen } from '@/views/kapitel/Abweichungen';
import { KapitelTexte } from '@/views/kapitel/Texte';

/** Kapitel des Konzepts; `pruefKapitel` verknüpft sie mit den Befunden. */
const KAPITEL = [
  { id: 'stammdaten', label: 'Stammdaten', pruefKapitel: 'Stammdaten' },
  { id: 'gebaeude', label: 'Gebäude', pruefKapitel: 'Gebäudedaten' },
  { id: 'nutzung', label: 'Nutzung', pruefKapitel: 'Nutzung' },
  {
    id: 'brandabschnitte',
    label: 'Brandabschnitte',
    pruefKapitel: 'Brandabschnitte',
  },
  { id: 'bauteile', label: 'Bauteile', pruefKapitel: 'Bauteile' },
  { id: 'fluchtwege', label: 'Fluchtwege', pruefKapitel: 'Fluchtwege' },
  { id: 'loeschhilfen', label: 'Löschhilfen', pruefKapitel: 'Löschhilfen' },
  { id: 'anlagen', label: 'Anlagentechnik', pruefKapitel: 'Anlagentechnik' },
  { id: 'organisation', label: 'Organisation', pruefKapitel: 'Organisation' },
  { id: 'abweichungen', label: 'Abweichungen', pruefKapitel: 'Abweichungen' },
  { id: 'texte', label: 'Berichtstexte', pruefKapitel: '' },
] as const;

type KapitelId = (typeof KAPITEL)[number]['id'];

export function Konzept() {
  const { projekt } = useAktivesProjekt();
  const [aktiv, setAktiv] = useState<KapitelId>('stammdaten');

  const befunde = useMemo(
    () => (projekt ? pruefeProjekt(projekt) : []),
    [projekt],
  );

  if (!projekt) {
    return (
      <LeerZustand
        titel="Kein Projekt geöffnet"
        text="Ein Konzept wird in der Projektverwaltung ausgewählt."
      />
    );
  }

  /**
   * Schwerster Befund je Kapitel — Statuszeichen in der Navigation, immer
   * Symbol und Farbe zusammen, der Wortlaut steht im Tooltip und für
   * Screenreader (CD 4.2).
   */
  function kapitelMarke(
    pruefKapitel: string,
  ): { farbe: string; zeichen: string; text: string } | null {
    if (!pruefKapitel) return null;
    const relevant = befunde.filter((b) => b.kapitel === pruefKapitel);
    if (relevant.some((b) => b.schwere === 'fehler'))
      return { farbe: 'var(--danger)', zeichen: '✕', text: 'Fehler' };
    if (relevant.some((b) => b.schwere === 'warnung'))
      return { farbe: 'var(--warning)', zeichen: '▲', text: 'Warnung' };
    if (relevant.some((b) => b.schwere === 'hinweis'))
      return { farbe: 'var(--status-info)', zeichen: 'ⓘ', text: 'Hinweis' };
    return null;
  }

  return (
    <div className="stack stack--lg">
      <div className="page-head">
        <div>
          <h1 className="page-head__title">Konzept bearbeiten</h1>
          <p className="page-head__lead">
            Erfassung der brandschutztechnischen Grundlagen. Änderungen werden
            unmittelbar gespeichert und laufend gegen das Regelwerk geprüft.
          </p>
        </div>
        <div style={{ minWidth: '210px' }}>
          <Fortschritt
            wert={vollstaendigkeit(projekt)}
            label="Vollständigkeit"
          />
        </div>
      </div>

      <div className="editor">
        <nav className="kapitel-nav" aria-label="Kapitel">
          {KAPITEL.map((k, i) => {
            const marke = kapitelMarke(k.pruefKapitel);
            return (
              <button
                key={k.id}
                type="button"
                className={`kapitel-nav__item ${
                  aktiv === k.id ? 'kapitel-nav__item--aktiv' : ''
                }`}
                onClick={() => setAktiv(k.id)}
                aria-current={aktiv === k.id ? 'true' : undefined}
              >
                <span className="kapitel-nav__nr">{i + 1}</span>
                <span>{k.label}</span>
                {marke && (
                  <span
                    className="kapitel-nav__marke"
                    style={{ color: marke.farbe }}
                    title={`${marke.text} in diesem Kapitel`}
                  >
                    <span aria-hidden="true">{marke.zeichen}</span>
                    <span className="sr-only">{marke.text}</span>
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="stack stack--lg">
          {aktiv === 'stammdaten' && <KapitelStammdaten />}
          {aktiv === 'gebaeude' && <KapitelGebaeude />}
          {aktiv === 'nutzung' && <KapitelNutzung />}
          {aktiv === 'brandabschnitte' && <KapitelBrandabschnitte />}
          {aktiv === 'bauteile' && <KapitelBauteile />}
          {aktiv === 'fluchtwege' && <KapitelFluchtwege />}
          {aktiv === 'loeschhilfen' && <KapitelLoeschhilfen />}
          {aktiv === 'anlagen' && <KapitelAnlagen />}
          {aktiv === 'organisation' && <KapitelOrganisation />}
          {aktiv === 'abweichungen' && <KapitelAbweichungen />}
          {aktiv === 'texte' && <KapitelTexte />}
        </div>
      </div>
    </div>
  );
}
