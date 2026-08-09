/**
 * Datenquellen — PRD Abschnitt 8 und 36.
 *
 * Zwei Dinge werden hier bewusst zusammen geführt und trotzdem strikt
 * getrennt gehalten:
 *
 *   `zugriffsart`  wie technisch zugegriffen wird — Rangfolge nach Abschnitt 8:
 *                  API vor Datenfeed vor Partnerzugang vor lizenziertem
 *                  Drittanbieter vor zulässigem technischen Webzugriff.
 *   `compliance`   ob und in welchem Umfang das rechtlich zulässig ist.
 *
 * Abschnitt 36 verlangt genau diese Trennung: Dass etwas technisch geht, ist
 * kein Argument dafür, dass es erlaubt ist. Jede Quelle, die im MVP nicht
 * abschließend geklärt ist, trägt ihre offenen Fragen sichtbar mit.
 */

import type { Plattform } from '../domain/types';

export const PLATTFORMEN: Plattform[] = [
  {
    id: 'mobile-de',
    name: 'mobile.de',
    kuerzel: 'MOB',
    land: ['DE', 'AT'],
    zugriffsart: 'api',
    aktiv: true,
    compliance: {
      grundlage: 'Händler-/Partner-API mit vertraglicher Nutzungserlaubnis',
      nutzungsbedingungen:
        'Nutzung ausschließlich im Rahmen des Partnervertrags; keine Weitergabe von Rohdaten an Dritte.',
      speicherdauerTage: 1095,
      weiterverwendung:
        'Interne Analyse und Marktstatistik zulässig; Wiederveröffentlichung einzelner Inserate unzulässig.',
      bildrechte:
        'Bilder verbleiben beim Rechteinhaber. Gespeichert werden Wahrnehmungs-Hashes und Verweise, keine Weitergabe von Bilddateien.',
      offeneFragen: [
        'Vertragliche Zulässigkeit der Langzeit-Historisierung über 36 Monate hinaus ist zu bestätigen.',
      ],
    },
  },
  {
    id: 'autoscout24',
    name: 'AutoScout24',
    kuerzel: 'AS24',
    land: ['DE', 'AT', 'IT', 'NL', 'BE'],
    zugriffsart: 'datenfeed',
    aktiv: true,
    compliance: {
      grundlage: 'Händler-Datenfeed über Partnerschnittstelle',
      nutzungsbedingungen:
        'Feed-Nutzung für interne Bewertungszwecke; Abgleichfrequenz vertraglich begrenzt.',
      speicherdauerTage: 1095,
      weiterverwendung:
        'Aggregierte Marktkennzahlen zulässig; personenbezogene Verkäuferdaten nur zweckgebunden.',
      bildrechte:
        'Nur Hashes und Verweise. Keine Speicherung von Bilddateien außerhalb des Analysepuffers.',
      offeneFragen: [
        'Abgleichfrequenz je Zielmodell mit dem Feed-Kontingent abzustimmen.',
      ],
    },
  },
  {
    id: 'willhaben',
    name: 'willhaben',
    kuerzel: 'WH',
    land: ['AT'],
    zugriffsart: 'technischer-webzugriff',
    aktiv: true,
    compliance: {
      grundlage:
        'Kein öffentliches API-Angebot. Zugriff nur im Rahmen der Nutzungsbedingungen und robots.txt.',
      nutzungsbedingungen:
        'Automatisierter Zugriff ist einzelvertraglich zu klären. Bis dahin: niedrige Frequenz, keine Umgehung technischer Schutzmaßnahmen.',
      speicherdauerTage: 365,
      weiterverwendung:
        'Nur interne Entscheidungsunterstützung. Keine Weitergabe, keine Wiederveröffentlichung.',
      bildrechte: 'Keine Bildspeicherung. Ausschließlich Hashes.',
      offeneFragen: [
        'Partner- oder Lizenzzugang anfragen — technischer Webzugriff ist nach Abschnitt 8 die letzte Rangstufe.',
        'Rechtliche Prüfung der automatisierten Abfrage vor Produktivbetrieb erforderlich.',
      ],
    },
  },
  {
    id: 'classic-trader',
    name: 'Classic Trader',
    kuerzel: 'CT',
    land: ['DE', 'AT', 'CH'],
    zugriffsart: 'partnerzugang',
    aktiv: false,
    compliance: {
      grundlage: 'Partnerzugang in Verhandlung',
      nutzungsbedingungen: 'Noch nicht vereinbart.',
      speicherdauerTage: null,
      weiterverwendung: 'Noch nicht vereinbart.',
      bildrechte: 'Noch nicht vereinbart.',
      offeneFragen: [
        'Connector implementiert, Quelle bis zum Vertragsabschluss deaktiviert.',
      ],
    },
  },
];

export function plattform(id: string): Plattform | undefined {
  return PLATTFORMEN.find((p) => p.id === id);
}

export function plattformName(id: string): string {
  return plattform(id)?.name ?? id;
}

/** Rangfolge der Zugriffsarten nach PRD Abschnitt 8 — 1 ist am besten. */
export const ZUGRIFFSRANG: Record<Plattform['zugriffsart'], number> = {
  api: 1,
  datenfeed: 2,
  partnerzugang: 3,
  'lizenzierter-drittanbieter': 4,
  'technischer-webzugriff': 5,
};

export const ZUGRIFFSART_LABEL: Record<Plattform['zugriffsart'], string> = {
  api: 'Offizielle API',
  datenfeed: 'Offizieller Datenfeed',
  partnerzugang: 'Partnerzugang',
  'lizenzierter-drittanbieter': 'Lizenzierter Drittanbieter',
  'technischer-webzugriff': 'Zulässiger technischer Webzugriff',
};
