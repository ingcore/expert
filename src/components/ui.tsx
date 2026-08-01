/** Wiederverwendbare UI-Bausteine im INGTEC-Design. */

import type { ChangeEvent, ReactNode } from 'react';
import { SCORE_BY_KEY } from '@/domain/catalog';
import type { Option } from '@/domain/catalog';
import type { SafetyScore } from '@/domain/types';

/* ==========================================================================
 * Formularfelder
 * ======================================================================= */

interface FeldProps {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}

export function Feld({ label, hint, children, className }: FeldProps) {
  return (
    <label className={`field ${className ?? ''}`}>
      <span className="field__label">{label}</span>
      {children}
      {hint && <span className="field__hint">{hint}</span>}
    </label>
  );
}

interface TextFeldProps {
  label: string;
  wert: string;
  onChange: (wert: string) => void;
  hint?: string;
  placeholder?: string;
  type?: 'text' | 'email' | 'tel' | 'date';
  className?: string;
}

export function TextFeld({
  label,
  wert,
  onChange,
  hint,
  placeholder,
  type = 'text',
  className,
}: TextFeldProps) {
  return (
    <Feld label={label} hint={hint} className={className}>
      <input
        className="input"
        type={type}
        value={wert}
        placeholder={placeholder}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      />
    </Feld>
  );
}

interface ZahlFeldProps {
  label: string;
  wert: number;
  onChange: (wert: number) => void;
  hint?: string;
  /** Einheit, die als Suffix im Hinweis erscheint. */
  einheit?: string;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

export function ZahlFeld({
  label,
  wert,
  onChange,
  hint,
  einheit,
  min = 0,
  max,
  step = 1,
  className,
}: ZahlFeldProps) {
  const beschriftung = einheit ? `${label} [${einheit}]` : label;
  return (
    <Feld label={beschriftung} hint={hint} className={className}>
      <input
        className="input num"
        type="number"
        value={Number.isFinite(wert) ? wert : 0}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const n = Number.parseFloat(e.target.value);
          onChange(Number.isFinite(n) ? n : 0);
        }}
      />
    </Feld>
  );
}

interface AuswahlProps<T extends string> {
  label: string;
  wert: T;
  optionen: Option<T>[];
  onChange: (wert: T) => void;
  hint?: string;
  className?: string;
}

export function Auswahl<T extends string>({
  label,
  wert,
  optionen,
  onChange,
  hint,
  className,
}: AuswahlProps<T>) {
  const aktiv = optionen.find((o) => o.value === wert);
  return (
    <Feld label={label} hint={hint ?? aktiv?.hint} className={className}>
      <select
        className="select"
        value={wert}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {optionen.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Feld>
  );
}

interface TextBereichProps {
  label: string;
  wert: string;
  onChange: (wert: string) => void;
  hint?: string;
  rows?: number;
  placeholder?: string;
  className?: string;
}

export function TextBereich({
  label,
  wert,
  onChange,
  hint,
  rows = 4,
  placeholder,
  className,
}: TextBereichProps) {
  return (
    <Feld label={label} hint={hint} className={className}>
      <textarea
        className="textarea"
        rows={rows}
        value={wert}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </Feld>
  );
}

interface SchalterProps {
  label: string;
  wert: boolean;
  onChange: (wert: boolean) => void;
}

export function Schalter({ label, wert, onChange }: SchalterProps) {
  return (
    <label className="checkbox">
      <input
        type="checkbox"
        checked={wert}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

/* ==========================================================================
 * SAFETY-SCORE
 * ======================================================================= */

export function ScoreBadge({
  score,
  mitText = false,
}: {
  score: SafetyScore;
  mitText?: boolean;
}) {
  const def = SCORE_BY_KEY[score];
  return (
    <span
      className="score-badge"
      style={{ background: def.farbe, color: def.textfarbe }}
      title={`${score} — ${def.kurz}`}
    >
      <span className="score-badge__letter">{score}</span>
      {mitText && <span className="score-badge__text">{def.kurz}</span>}
    </span>
  );
}

/** Waagrechte Verteilungsleiste über die SAFETY-SCORE-Stufen. */
export function ScoreVerteilung({
  verteilung,
}: {
  verteilung: Record<SafetyScore, number>;
}) {
  const gesamt = Object.values(verteilung).reduce((s, n) => s + n, 0);
  if (gesamt === 0) {
    return <div className="score-bar score-bar--leer" aria-hidden="true" />;
  }

  const stufen: SafetyScore[] = ['A', 'B', 'C', 'D', 'E'];
  return (
    <div
      className="score-bar"
      role="img"
      aria-label={stufen
        .filter((s) => verteilung[s] > 0)
        .map((s) => `${verteilung[s]}× Stufe ${s}`)
        .join(', ')}
    >
      {stufen.map((s) =>
        verteilung[s] > 0 ? (
          <span
            key={s}
            className="score-bar__seg"
            style={{
              width: `${(verteilung[s] / gesamt) * 100}%`,
              background: SCORE_BY_KEY[s].farbe,
            }}
            title={`${s}: ${verteilung[s]}`}
          />
        ) : null,
      )}
    </div>
  );
}

/* ==========================================================================
 * Struktur & Anzeige
 * ======================================================================= */

export function Karte({
  titel,
  untertitel,
  aktion,
  children,
  flush = false,
}: {
  titel?: string;
  untertitel?: string;
  aktion?: ReactNode;
  children: ReactNode;
  flush?: boolean;
}) {
  return (
    <section className="card">
      {(titel || aktion) && (
        <header className="card__header">
          <div>
            {titel && <h2 className="card__title">{titel}</h2>}
            {untertitel && <p className="card__subtitle">{untertitel}</p>}
          </div>
          {aktion}
        </header>
      )}
      <div className={`card__body ${flush ? 'card__body--flush' : ''}`}>
        {children}
      </div>
    </section>
  );
}

export function Kennzahl({
  label,
  wert,
  einheit,
  hinweis,
  ton = 'neutral',
}: {
  label: string;
  wert: string | number;
  einheit?: string;
  hinweis?: string;
  ton?: 'neutral' | 'brand' | 'warn' | 'gefahr' | 'gut';
}) {
  return (
    <div className={`kpi kpi--${ton}`}>
      <span className="kpi__label">{label}</span>
      <span className="kpi__value num">
        {wert}
        {einheit && <span className="kpi__unit">{einheit}</span>}
      </span>
      {hinweis && <span className="kpi__hint">{hinweis}</span>}
    </div>
  );
}

export function Fortschritt({
  wert,
  label,
}: {
  wert: number;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, wert));
  return (
    <div className="progress">
      {label && (
        <div className="progress__head">
          <span>{label}</span>
          <span className="num">{clamped}%</span>
        </div>
      )}
      <div
        className="progress__track"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="progress__fill" style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}

export function LeerZustand({
  titel,
  text,
  aktion,
}: {
  titel: string;
  text?: string;
  aktion?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <p className="empty-state__title">{titel}</p>
      {text && <p>{text}</p>}
      {aktion && <div style={{ marginTop: 'var(--sp-5)' }}>{aktion}</div>}
    </div>
  );
}

/** Abschnittsüberschrift innerhalb eines Formulars. */
export function Abschnitt({
  titel,
  beschreibung,
  children,
}: {
  titel: string;
  beschreibung?: string;
  children: ReactNode;
}) {
  return (
    <div className="stack">
      <div>
        <h3 className="section-title">{titel}</h3>
        {beschreibung && (
          <p className="field__hint" style={{ marginTop: '0.25rem' }}>
            {beschreibung}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

/** Zeilenwerkzeug für Listeneinträge (löschen usw.). */
export function ZeilenAktion({
  onLoeschen,
  titel = 'Eintrag entfernen',
}: {
  onLoeschen: () => void;
  titel?: string;
}) {
  return (
    <button
      type="button"
      className="btn btn--ghost btn--icon btn--sm"
      onClick={onLoeschen}
      title={titel}
      aria-label={titel}
    >
      ✕
    </button>
  );
}
