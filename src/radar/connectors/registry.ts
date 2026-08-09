/**
 * Connector-Verzeichnis.
 *
 * Eine Plattform lässt sich über `plattform.aktiv` abschalten, ohne dass am
 * übrigen System etwas zu ändern wäre (PRD Abschnitt 33). Der Connector für
 * Classic Trader ist implementiert, die Quelle aber deaktiviert, solange der
 * Partnerzugang nicht vertraglich geklärt ist — die Trennung von technischer
 * Möglichkeit und rechtlicher Zulässigkeit aus Abschnitt 36 in der Praxis.
 */

import { connectorAutoscout24 } from './autoscout24';
import { connectorMobileDe } from './mobile-de';
import { connectorWillhaben } from './willhaben';
import type { Connector } from './typen';

export function alleConnectoren(): Connector[] {
  return [connectorMobileDe(), connectorAutoscout24(), connectorWillhaben()];
}

/** Nur die Connectoren, deren Quelle aktiv geschaltet ist. */
export function aktiveConnectoren(): Connector[] {
  return alleConnectoren().filter((c) => c.plattform.aktiv);
}

export function connector(plattformId: string): Connector | undefined {
  return alleConnectoren().find((c) => c.plattform.id === plattformId);
}
