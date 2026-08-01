/**
 * Export eines Brandschutzkonzepts als Markdown.
 *
 * Dient als Zwischenformat für die Weiterverarbeitung — etwa zur Übernahme in
 * die INGTEC-Word-Vorlage oder zur Ablage im Kundenordner.
 */

import {
  ANLAGEN_ARTEN,
  ANLAGEN_STATUS,
  BAUTEIL_KATEGORIEN,
  FLUCHTWEG_ARTEN,
  GK_BY_KEY,
  KONZEPTANLAESSE,
  LOESCHHILFE_ARTEN,
  NUTZUNGSARTEN,
  SAFETY_SCORES,
} from '@/domain/catalog';
import { berichtsnummerString } from '@/domain/naming';
import { pruefeProjekt } from '@/domain/rules';
import { gebaeudeklasseVon } from '@/engine/adapter';
import { gesamtNutzflaeche, gesamtPersonen } from '@/domain/stats';
import type { Projekt } from '@/domain/types';

function datum(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('de-AT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
}

function zahl(n: number, digits = 0): string {
  return n.toLocaleString('de-AT', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Maskiert Pipe-Zeichen und Zeilenumbrüche für Markdown-Tabellenzellen. */
function zelle(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\n+/g, ' ');
}

function tabelle(kopf: string[], zeilen: string[][]): string {
  const head = `| ${kopf.join(' | ')} |`;
  const trenn = `| ${kopf.map(() => '---').join(' | ')} |`;
  const body = zeilen.map((z) => `| ${z.map(zelle).join(' | ')} |`).join('\n');
  return [head, trenn, body].join('\n');
}

export function alsMarkdown(projekt: Projekt): string {
  const klasse = gebaeudeklasseVon(projekt).klasse;
  const gk = klasse ? GK_BY_KEY[klasse] : null;
  const anlass =
    KONZEPTANLAESSE.find((a) => a.value === projekt.anlass)?.label ??
    projekt.anlass;
  const teile: string[] = [];

  teile.push(`# Brandschutzkonzept — ${projekt.titel}`);
  teile.push('');
  teile.push(`**Berichtsnummer:** \`${berichtsnummerString(projekt)}\`  `);
  teile.push(`**Datum:** ${datum(projekt.datum)}  `);
  teile.push(`**Anlass:** ${anlass}`);
  teile.push('');

  // ---- Deckblattdaten ----------------------------------------------------
  teile.push('## Stammdaten');
  teile.push('');
  teile.push(
    tabelle(
      ['Feld', 'Wert'],
      [
        ['Auftraggeber', projekt.auftraggeber.name || '—'],
        ['Kundennummer', `KD-${projekt.auftraggeber.kundennummer || '0000'}`],
        [
          'Objekt',
          [
            projekt.objekt.bezeichnung,
            projekt.objekt.strasse,
            `${projekt.objekt.plz} ${projekt.objekt.ort}`.trim(),
          ]
            .filter(Boolean)
            .join(', ') || '—',
        ],
        ['Behörde', projekt.objekt.behoerde || '—'],
        [
          'Sachverständiger',
          [projekt.bearbeiter.name, projekt.bearbeiter.qualifikation]
            .filter(Boolean)
            .join(', ') || '—',
        ],
      ],
    ),
  );
  teile.push('');

  // ---- 1 Auftragsgegenstand ---------------------------------------------
  teile.push('## 1 Auftragsgegenstand');
  teile.push('');
  teile.push(projekt.auftragsgegenstand || '_nicht ausgefüllt_');
  teile.push('');

  // ---- 2 Grundlagen ------------------------------------------------------
  teile.push('## 2 Beurteilungsgrundlagen');
  teile.push('');
  teile.push(projekt.grundlagen || '_nicht ausgefüllt_');
  teile.push('');

  // ---- 3 Gebäudedaten ----------------------------------------------------
  teile.push('## 3 Objekt und Gebäudedaten');
  teile.push('');
  teile.push(
    tabelle(
      ['Kennwert', 'Wert'],
      [
        ['Gebäudeklasse', gk ? `${gk.klasse} — ${gk.kurz}` : 'noch nicht ermittelbar'],
        ['Bauweise', projekt.gebaeude.bauweise],
        ['Fluchtniveau', `${zahl(projekt.gebaeude.fluchtniveau, 1)} m`],
        [
          'Geschoße',
          `${projekt.gebaeude.geschosseOberirdisch} oberirdisch, ${projekt.gebaeude.geschosseUnterirdisch} unterirdisch`,
        ],
        [
          'Brutto-Grundfläche',
          `${zahl(projekt.gebaeude.bruttoGrundflaeche)} m²`,
        ],
        ['Umbauter Raum', `${zahl(projekt.gebaeude.umbauterRaum)} m³`],
        [
          'Größter Brandabschnitt',
          `${zahl(projekt.gebaeude.groessterBrandabschnitt)} m²`,
        ],
        ['Risikoklasse', projekt.gebaeude.risikoklasse],
      ],
    ),
  );
  teile.push('');
  if (projekt.gebaeude.konstruktionsbeschreibung) {
    teile.push('### 3.1 Konstruktion');
    teile.push('');
    teile.push(projekt.gebaeude.konstruktionsbeschreibung);
    teile.push('');
  }

  // ---- 4 Nutzung ---------------------------------------------------------
  if (projekt.nutzungseinheiten.length > 0) {
    teile.push('## 4 Nutzung');
    teile.push('');
    teile.push(
      `Gesamtnutzfläche ${zahl(gesamtNutzflaeche(projekt))} m², höchste gleichzeitige Belegung ${gesamtPersonen(projekt)} Personen.`,
    );
    teile.push('');
    teile.push(
      tabelle(
        ['Bereich', 'Nutzungsart', 'Geschoß', 'Fläche', 'Personen', 'Brandlast'],
        projekt.nutzungseinheiten.map((n) => [
          n.bezeichnung || '—',
          NUTZUNGSARTEN.find((x) => x.value === n.nutzungsart)?.label ??
            n.nutzungsart,
          n.geschoss,
          `${zahl(n.flaeche)} m²`,
          String(n.personenzahl),
          n.brandlast > 0 ? `${zahl(n.brandlast)} MJ/m²` : '—',
        ]),
      ),
    );
    teile.push('');
  }

  // ---- 5 Baulicher Brandschutz -------------------------------------------
  teile.push('## 5 Baulicher Brandschutz');
  teile.push('');

  if (projekt.brandabschnitte.length > 0) {
    teile.push('### 5.1 Brandabschnitte');
    teile.push('');
    teile.push(
      tabelle(
        ['Bezeichnung', 'Typ', 'Fläche', 'Trennbauteil', 'Geschoße'],
        projekt.brandabschnitte.map((b) => [
          b.bezeichnung,
          b.typ,
          `${zahl(b.flaeche)} m²`,
          b.trennbauteil,
          b.geschosse || '—',
        ]),
      ),
    );
    teile.push('');
  }

  if (projekt.bauteile.length > 0) {
    teile.push('### 5.2 Bauteilnachweis');
    teile.push('');
    teile.push(
      tabelle(
        ['Bauteil', 'Kategorie', 'Erforderlich', 'Ausgeführt', 'Nachweis'],
        projekt.bauteile.map((b) => [
          b.bezeichnung || '—',
          BAUTEIL_KATEGORIEN.find((k) => k.value === b.kategorie)?.label ??
            b.kategorie,
          b.sollKlasse,
          b.istKlasse,
          b.nachweis || '—',
        ]),
      ),
    );
    teile.push('');
  }

  // ---- 6 Fluchtwege ------------------------------------------------------
  if (projekt.fluchtwege.length > 0) {
    teile.push('## 6 Flucht- und Rettungswege');
    teile.push('');
    teile.push(
      tabelle(
        ['Bezeichnung', 'Art', 'Länge', 'Breite', 'Personen', 'Ausstattung'],
        projekt.fluchtwege.map((f) => [
          f.bezeichnung || '—',
          FLUCHTWEG_ARTEN.find((a) => a.value === f.art)?.label ?? f.art,
          `${zahl(f.laenge, 1)} m`,
          `${zahl(f.breite, 2)} m`,
          String(f.personen),
          [
            f.sicherheitsbeleuchtung && 'Sicherheitsbeleuchtung',
            f.fluchtwegorientierung && 'Kennzeichnung',
            f.panikbeschlag && 'Panikbeschlag',
            f.fuehrtInsFreie && 'ins Freie',
          ]
            .filter(Boolean)
            .join(', ') || '—',
        ]),
      ),
    );
    teile.push('');
  }

  // ---- 7 Löschhilfen -----------------------------------------------------
  teile.push('## 7 Löschhilfen und Löschwasserversorgung');
  teile.push('');
  if (projekt.loeschhilfen.length > 0) {
    teile.push(
      tabelle(
        ['Art', 'Standort', 'Anzahl', 'LE je Gerät', 'Letzte Prüfung'],
        projekt.loeschhilfen.map((l) => [
          LOESCHHILFE_ARTEN.find((a) => a.value === l.art)?.label ?? l.art,
          l.standort || '—',
          String(l.anzahl),
          String(l.loeschmitteleinheiten || '—'),
          l.letztePruefung ? datum(l.letztePruefung) : '—',
        ]),
      ),
    );
    teile.push('');
  }
  teile.push(
    `Löschwasser: ${zahl(projekt.loeschwasser.menge)} l/min verfügbar, ${zahl(projekt.loeschwasser.erforderlich)} l/min erforderlich, Bereitstellung ${zahl(projekt.loeschwasser.dauer)} min.`,
  );
  teile.push('');

  // ---- 8 Anlagentechnik --------------------------------------------------
  if (projekt.anlagen.length > 0) {
    teile.push('## 8 Anlagentechnischer Brandschutz');
    teile.push('');
    teile.push(
      tabelle(
        ['Anlage', 'Status', 'Regelwerk', 'Schutzumfang', 'Nächste Prüfung'],
        projekt.anlagen.map((a) => [
          ANLAGEN_ARTEN.find((x) => x.art === a.art)?.label ?? a.art,
          ANLAGEN_STATUS.find((s) => s.value === a.status)?.label ?? a.status,
          a.regelwerk || '—',
          a.schutzumfang || '—',
          a.naechstePruefung ? datum(a.naechstePruefung) : '—',
        ]),
      ),
    );
    teile.push('');
  }

  // ---- 9 Organisation ----------------------------------------------------
  const o = projekt.organisation;
  teile.push('## 9 Organisatorischer Brandschutz');
  teile.push('');
  teile.push(
    tabelle(
      ['Aspekt', 'Stand'],
      [
        [
          'Brandschutzbeauftragter',
          o.brandschutzbeauftragter ||
            (o.brandschutzbeauftragterErforderlich
              ? 'erforderlich, nicht bestellt'
              : 'nicht erforderlich'),
        ],
        ['Brandschutzwarte', String(o.brandschutzwarte)],
        [
          'Brandschutzordnung',
          o.brandschutzordnungVorhanden ? 'vorhanden' : 'nicht vorhanden',
        ],
        [
          'Brandschutzpläne',
          o.brandschutzplaeneVorhanden ? 'vorhanden' : 'nicht vorhanden',
        ],
        [
          'Feuerwehr-Laufkarten',
          o.laufkartenVorhanden ? 'vorhanden' : 'nicht vorhanden',
        ],
        [
          'Brandschutzbuch',
          o.brandschutzbuchGefuehrt ? 'geführt' : 'nicht geführt',
        ],
        [
          'Letzte Räumungsübung',
          o.letzteRaeumungsuebung ? datum(o.letzteRaeumungsuebung) : '—',
        ],
      ],
    ),
  );
  teile.push('');

  // ---- 10 Bewertungsgrundlage --------------------------------------------
  teile.push('## 10 Bewertungsgrundlage — INGTEC SAFETY-SCORE');
  teile.push('');
  teile.push(
    tabelle(
      ['Grad', 'Kurzbewertung', 'Beschreibung'],
      SAFETY_SCORES.map((s) => [s.score, s.kurz, s.beschreibung]),
    ),
  );
  teile.push('');

  // ---- 11 Mängelliste ----------------------------------------------------
  if (projekt.massnahmen.length > 0) {
    teile.push('## 11 Mängel- und Maßnahmenliste');
    teile.push('');
    teile.push(
      tabelle(
        ['Nr.', 'Bereich', 'Mangel', 'Maßnahme', 'Art', 'Score', 'Frist', 'Status'],
        projekt.massnahmen.map((m) => [
          String(m.lfdNr),
          m.bereich || '—',
          m.beschreibung,
          m.massnahme || '—',
          m.art,
          m.score,
          m.frist ? datum(m.frist) : '—',
          m.status,
        ]),
      ),
    );
    teile.push('');
    teile.push(
      '_Art: b = baulich, t = technisch, o = organisatorisch, e = Empfehlung_',
    );
    teile.push('');
  }

  // ---- 12 Abweichungen ---------------------------------------------------
  if (projekt.abweichungen.length > 0) {
    teile.push('## 12 Abweichungen vom Regelwerk');
    teile.push('');
    projekt.abweichungen.forEach((a, i) => {
      teile.push(`### 12.${i + 1} ${a.anforderung || 'Abweichung'}`);
      teile.push('');
      teile.push(a.beschreibung || '_keine Beschreibung_');
      teile.push('');
      teile.push(`**Kompensation:** ${a.kompensation || '—'}`);
      teile.push('');
      teile.push(`**Nachweis:** ${a.nachweis || '—'}`);
      teile.push('');
      teile.push(
        `**Behördliche Genehmigung:** ${a.genehmigt ? 'liegt vor' : 'Abstimmung offen'}`,
      );
      teile.push('');
    });
  }

  // ---- 13 Conclusio ------------------------------------------------------
  teile.push('## 13 Conclusio');
  teile.push('');
  teile.push(projekt.conclusio || '_nicht ausgefüllt_');
  teile.push('');

  // ---- Anhang: Prüfbefunde -----------------------------------------------
  const befunde = pruefeProjekt(projekt);
  if (befunde.length > 0) {
    teile.push('---');
    teile.push('');
    teile.push('## Anhang: Befunde der Regelwerksprüfung');
    teile.push('');
    teile.push(
      '_Automatische Plausibilitätsprüfung. Sie ersetzt keine sachverständige Beurteilung._',
    );
    teile.push('');
    teile.push(
      tabelle(
        ['Schwere', 'Kapitel', 'Befund', 'Grundlage'],
        befunde.map((b) => [
          b.schwere,
          b.kapitel,
          `**${b.titel}** — ${b.beschreibung}`,
          b.grundlage,
        ]),
      ),
    );
    teile.push('');
  }

  teile.push('---');
  teile.push('');
  teile.push(
    `INGTEC GmbH — TECHNIK.WIRKT · ${berichtsnummerString(projekt)}`,
  );

  return teile.join('\n');
}
