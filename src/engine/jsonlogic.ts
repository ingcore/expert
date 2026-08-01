/**
 * Minimaler, sicherer JSON-Logic-Auswerter.
 *
 * Umsetzung von LP-5 („Regeln sind Daten, nicht Code"): Die Bedingung jeder
 * Anforderung liegt als JSON-Ausdruck in der Regeldatenbank und wird hier
 * ausgewertet. Damit lässt sich eine neue OIB-Ausgabe ohne Code-Deployment
 * einpflegen (FR-2.5, NFR-10).
 *
 * Bewusst auf einen kleinen Operatorensatz beschränkt: kein `eval`, kein
 * Zugriff auf globale Objekte, keine Funktionsdefinitionen in Daten.
 */

export type JsonLogic =
  | boolean
  | number
  | string
  | null
  | JsonLogic[]
  | { [operator: string]: JsonLogic };

/** Kontext, gegen den eine Regel ausgewertet wird. */
export type LogicKontext = Record<string, unknown>;

/** Fehler in einem Regelausdruck — deutet auf einen Datenfehler hin. */
export class RegelAusdruckFehler extends Error {
  constructor(
    message: string,
    readonly operator: string,
  ) {
    super(message);
    this.name = 'RegelAusdruckFehler';
  }
}

/** Liest einen ggf. verschachtelten Pfad ("gebaeude.klasse") aus dem Kontext. */
function leseVar(kontext: LogicKontext, pfad: string): unknown {
  if (pfad === '') return kontext;
  let aktuell: unknown = kontext;
  for (const teil of pfad.split('.')) {
    if (aktuell === null || typeof aktuell !== 'object') return undefined;
    aktuell = (aktuell as Record<string, unknown>)[teil];
  }
  return aktuell;
}

/** JSON-Logic-Wahrheitswert: leere Sammlungen und 0 sind falsch. */
export function istWahr(wert: unknown): boolean {
  if (Array.isArray(wert)) return wert.length > 0;
  return Boolean(wert);
}

/** Vergleicht zwei Werte numerisch, wenn beide numerisch interpretierbar sind. */
function vergleiche(a: unknown, b: unknown): number {
  const za = typeof a === 'number' ? a : Number(a);
  const zb = typeof b === 'number' ? b : Number(b);
  if (Number.isFinite(za) && Number.isFinite(zb)) {
    return za === zb ? 0 : za < zb ? -1 : 1;
  }
  const sa = String(a);
  const sb = String(b);
  return sa === sb ? 0 : sa < sb ? -1 : 1;
}

function alsArray(wert: JsonLogic): JsonLogic[] {
  return Array.isArray(wert) ? wert : [wert];
}

/**
 * Wertet einen JSON-Logic-Ausdruck gegen einen Kontext aus.
 *
 * Unterstützte Operatoren:
 *   Zugriff     var, missing
 *   Logik       and, or, not, !!, if
 *   Vergleich   ==, ===, !=, !==, >, >=, <, <=
 *   Mengen      in, containsAny
 *   Arithmetik  +, -, *, /, min, max
 */
export function evaluiere(regel: JsonLogic, kontext: LogicKontext): unknown {
  // Primitive Werte und Arrays von Werten.
  if (regel === null || typeof regel !== 'object') return regel;
  if (Array.isArray(regel)) return regel.map((r) => evaluiere(r, kontext));

  const eintraege = Object.entries(regel);
  if (eintraege.length !== 1) {
    throw new RegelAusdruckFehler(
      `Ein Regelobjekt muss genau einen Operator enthalten, gefunden: ${eintraege.length}`,
      Object.keys(regel).join(','),
    );
  }

  const [operator, rohArgument] = eintraege[0];

  // `and`/`or` werten verzögert aus, damit Kurzschlussverhalten greift.
  if (operator === 'and') {
    let letzter: unknown = true;
    for (const teil of alsArray(rohArgument)) {
      letzter = evaluiere(teil, kontext);
      if (!istWahr(letzter)) return letzter;
    }
    return letzter;
  }

  if (operator === 'or') {
    let letzter: unknown = false;
    for (const teil of alsArray(rohArgument)) {
      letzter = evaluiere(teil, kontext);
      if (istWahr(letzter)) return letzter;
    }
    return letzter;
  }

  if (operator === 'if') {
    const teile = alsArray(rohArgument);
    for (let i = 0; i + 1 < teile.length; i += 2) {
      if (istWahr(evaluiere(teile[i], kontext))) {
        return evaluiere(teile[i + 1], kontext);
      }
    }
    // Ungerades letztes Element ist der Sonst-Zweig.
    return teile.length % 2 === 1
      ? evaluiere(teile[teile.length - 1], kontext)
      : null;
  }

  const args = alsArray(rohArgument).map((a) => evaluiere(a, kontext));
  const [a, b] = args;

  switch (operator) {
    case 'var': {
      const pfad = a === undefined || a === null ? '' : String(a);
      const wert = leseVar(kontext, pfad);
      return wert === undefined ? (b ?? null) : wert;
    }

    case 'missing':
      // Liefert die Pfade, die im Kontext fehlen oder leer sind.
      return args
        .flat()
        .map((p) => String(p))
        .filter((p) => {
          const w = leseVar(kontext, p);
          return w === undefined || w === null || w === '';
        });

    case 'not':
    case '!':
      return !istWahr(a);

    case '!!':
      return istWahr(a);

    case '==':
      // Bewusst lose: "4" und 4 sind in Regeldaten gleichwertig.
      return vergleiche(a, b) === 0;
    case '===':
      return a === b;
    case '!=':
      return vergleiche(a, b) !== 0;
    case '!==':
      return a !== b;
    case '>':
      return vergleiche(a, b) > 0;
    case '>=':
      return vergleiche(a, b) >= 0;
    case '<':
      return vergleiche(a, b) < 0;
    case '<=':
      return vergleiche(a, b) <= 0;

    case 'in':
      if (Array.isArray(b)) return b.some((x) => vergleiche(x, a) === 0);
      if (typeof b === 'string') return b.includes(String(a));
      return false;

    case 'containsAny': {
      // Schnittmenge zweier Mengen — etwa Nutzungsarten im Gebäude.
      const links = Array.isArray(a) ? a : [a];
      const rechts = Array.isArray(b) ? b : [b];
      return links.some((l) => rechts.some((r) => vergleiche(l, r) === 0));
    }

    case '+':
      return args.reduce<number>((s, x) => s + Number(x), 0);
    case '-':
      return args.length === 1 ? -Number(a) : Number(a) - Number(b);
    case '*':
      return args.reduce<number>((s, x) => s * Number(x), 1);
    case '/':
      return Number(a) / Number(b);
    case 'min':
      return Math.min(...args.map(Number));
    case 'max':
      return Math.max(...args.map(Number));

    default:
      throw new RegelAusdruckFehler(
        `Unbekannter Operator „${operator}" im Regelausdruck`,
        operator,
      );
  }
}

/** Wertet einen Ausdruck aus und liefert das Ergebnis als Wahrheitswert. */
export function trifftZu(regel: JsonLogic, kontext: LogicKontext): boolean {
  return istWahr(evaluiere(regel, kontext));
}

/**
 * Prüft einen Regelausdruck auf zulässige Operatoren, ohne ihn auszuwerten.
 * Wird bei der Regelpflege eingesetzt, damit fehlerhafte Daten früh auffallen.
 */
export function pruefeAusdruck(regel: JsonLogic): string[] {
  const erlaubt = new Set([
    'var', 'missing', 'and', 'or', 'not', '!', '!!', 'if',
    '==', '===', '!=', '!==', '>', '>=', '<', '<=',
    'in', 'containsAny', '+', '-', '*', '/', 'min', 'max',
  ]);
  const fehler: string[] = [];

  function gehe(knoten: JsonLogic): void {
    if (knoten === null || typeof knoten !== 'object') return;
    if (Array.isArray(knoten)) {
      knoten.forEach(gehe);
      return;
    }
    for (const [op, arg] of Object.entries(knoten)) {
      if (!erlaubt.has(op)) fehler.push(op);
      gehe(arg);
    }
  }

  gehe(regel);
  return fehler;
}
