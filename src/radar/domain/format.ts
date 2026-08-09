/**
 * Formatierung und Zeitrechnung.
 *
 * `STICHTAG` ist der Bezugszeitpunkt des Datenbestandes. In der Zielarchitektur
 * ist das schlicht „jetzt"; im MVP mit mitgeliefertem Datenbestand muss der
 * Zeitpunkt festliegen, sonst altern Beobachtungshistorie, Marktreihen und
 * Standzeiten gegeneinander und jede Kennzahl driftet mit dem Kalender.
 */

/** Bezugszeitpunkt des Datenbestandes. */
export const STICHTAG = '2026-08-08T08:00:00.000Z';

export const STICHTAG_MS = Date.parse(STICHTAG);

const EUR = new Intl.NumberFormat('de-AT', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const EUR_GENAU = new Intl.NumberFormat('de-AT', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const ZAHL = new Intl.NumberFormat('de-AT', { maximumFractionDigits: 0 });

export function euro(betrag: number | null | undefined): string {
  if (betrag === null || betrag === undefined || !Number.isFinite(betrag)) {
    return '—';
  }
  return EUR.format(betrag);
}

export function euroGenau(betrag: number | null | undefined): string {
  if (betrag === null || betrag === undefined || !Number.isFinite(betrag)) {
    return '—';
  }
  return EUR_GENAU.format(betrag);
}

export function zahl(wert: number | null | undefined): string {
  if (wert === null || wert === undefined || !Number.isFinite(wert)) return '—';
  return ZAHL.format(wert);
}

export function kilometer(wert: number | null | undefined): string {
  if (wert === null || wert === undefined) return '—';
  return `${ZAHL.format(wert)} km`;
}

export function prozent(wert: number | null | undefined, stellen = 1): string {
  if (wert === null || wert === undefined || !Number.isFinite(wert)) return '—';
  const vorzeichen = wert > 0 ? '+' : '';
  return `${vorzeichen}${wert.toFixed(stellen).replace('.', ',')} %`;
}

export function datum(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-AT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function datumZeit(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.toLocaleDateString('de-AT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })}, ${d.toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' })}`;
}

/** `2010-03` → `03/2010`. */
export function monat(m: string | null | undefined): string {
  if (!m) return '—';
  const [jahr, mon] = m.split('-');
  if (!mon) return m;
  return `${mon}/${jahr}`;
}

/** Monatsangabe als Zahl der Monate seit dem Jahr 0 — für Differenzen. */
export function monatsIndex(m: string): number {
  const [jahr, mon] = m.split('-').map(Number);
  return jahr * 12 + (mon - 1);
}

export function monatAusIndex(index: number): string {
  const jahr = Math.floor(index / 12);
  const mon = (index % 12) + 1;
  return `${jahr}-${String(mon).padStart(2, '0')}`;
}

/** Alter in Monaten zwischen Erstzulassung und Stichtag. */
export function alterMonate(erstzulassung: string | null, bis = STICHTAG): number | null {
  if (!erstzulassung) return null;
  const d = new Date(bis);
  const jetzt = d.getUTCFullYear() * 12 + d.getUTCMonth();
  return jetzt - monatsIndex(erstzulassung);
}

export function alterJahre(erstzulassung: string | null, bis = STICHTAG): number | null {
  const m = alterMonate(erstzulassung, bis);
  return m === null ? null : m / 12;
}

export function tageSeit(iso: string, bis = STICHTAG): number {
  return Math.round((Date.parse(bis) - Date.parse(iso)) / 86_400_000);
}

export function tageZwischen(von: string, bis: string): number {
  return Math.round((Date.parse(bis) - Date.parse(von)) / 86_400_000);
}

/** Verschiebt einen ISO-Zeitpunkt um Tage. */
export function plusTage(iso: string, tage: number): string {
  return new Date(Date.parse(iso) + tage * 86_400_000).toISOString();
}

export function relativeZeit(iso: string, bis = STICHTAG): string {
  const tage = tageSeit(iso, bis);
  if (tage <= 0) return 'heute';
  if (tage === 1) return 'gestern';
  if (tage < 31) return `vor ${tage} Tagen`;
  const monate = Math.round(tage / 30.44);
  if (monate < 24) return `vor ${monate} Monaten`;
  return `vor ${Math.round(monate / 12)} Jahren`;
}

/** Begrenzt einen Wert auf ein Intervall. */
export function begrenze(wert: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, wert));
}

/** Rundet auf ein Vielfaches — Marktwerte werden nicht eurogenau ausgewiesen. */
export function rundeAuf(wert: number, schritt: number): number {
  return Math.round(wert / schritt) * schritt;
}

export function median(werte: number[]): number {
  if (werte.length === 0) return 0;
  const s = [...werte].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
}

export function mittel(werte: number[]): number {
  if (werte.length === 0) return 0;
  return werte.reduce((a, b) => a + b, 0) / werte.length;
}
