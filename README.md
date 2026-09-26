# INGTEC Brandschutzkonzept-Tool (BSK-Tool)

Werkzeug zur Erstellung, Prüfung und Freigabe von Brandschutzkonzepten nach
OIB-Richtlinien — umgesetzt nach dem PRD „Brandschutzkonzept-Tool v1.0" im
Corporate Design von INGTEC Inspect.

## Die tragende Entscheidung

Das Produkt trennt zwei Dinge strikt (PRD Leitprinzip LP-1):

- Eine **deterministische Regel-Engine** bestimmt, *was* gilt. Kein Sprachmodell.
- Eine **Formulierungsschicht** bestimmt, *wie es dasteht*. Niemals umgekehrt.

Alles Weitere folgt daraus.

## Umsetzungsstand gegen die Leitprinzipien

| Prinzip | Umsetzung |
|---|---|
| **LP-1** Engine bestimmt was gilt | `src/engine/` wertet die Anforderungsmatrix ohne LLM aus |
| **LP-2** Jede Zahl stammt aus der Engine | Rückabgleich (`rueckabgleich.ts`) prüft maschinell und blockierend |
| **LP-3** Rückverfolgbar bis zur Normstelle | Jedes Ergebnis trägt `Quellenverweis` mit Richtlinie, Ausgabe, Punkt, Tabelle, Zeile — im UI anklickbar |
| **LP-4** Der Mensch gibt frei | Kein Export ohne benannte Freigabe; Gleichwertigkeit bei Abweichungen ausschließlich manuell |
| **LP-5** Regeln sind Daten, nicht Code | Bedingungen als JSON-Logic in `regelwerk/`, auswertbar ohne Deployment |

## Regel-Engine

```
src/engine/
  jsonlogic.ts              Sicherer Auswerter, kleiner Operatorensatz, kein eval
  types.ts                  Anforderung, Overlay, Ergebnis, Quellenverweis, Ampel
  gebaeudeklasse.ts         Deterministische Ableitung GK1–GK5 mit Schrittprotokoll
  engine.ts                 Auflösung der Matrix, Soll-/Ist-Vergleich, Overlays
  rueckabgleich.ts          Text ↔ Matrix, blockierend
  adapter.ts                Brücke Projektmodell ↔ Engine
  regelwerk/
    oib-rl2-2023.ts         Anforderungsmatrix als Daten
    overlays.ts             Landesrechtliche Overlays (Kärnten, Wien)
    normen.ts               Normenkatalog, zugleich Positivliste des Rückabgleichs
  golden/                   Referenzfälle als Regressionstest
```

Eine Anforderung ist reine Datenhaltung und lässt sich unverändert in die
PostgreSQL-Tabelle `anforderungen` des Zieldatenmodells übernehmen:

```ts
{
  id: 'oib2-2023-5.1-fluchtweglaenge',
  bauteil: 'fluchtweg',
  bedingung: { '!!': [{ var: 'risikoklasse' }] },
  sollArt: 'laenge',
  soll: { if: [{ '==': [{ var: 'risikoklasse' }, 'hoch'] }, 20,
               { '==': [{ var: 'risikoklasse' }, 'erhoeht'] }, 30, 40] },
  einheit: 'm',
  quelle: { richtlinie: 'OIB-RL 2', ausgabe: '2023-05', punkt: '5.1' },
  benoetigt: ['risikoklasse'],
}
```

**Gebäudeklasse wird berechnet, nie eingegeben** — mit protokolliertem
Ableitungsweg (FR-2.9). Reichen die Eingaben nicht, liefert die Engine
`klasse: null` samt fehlender Felder statt zu raten (FR-2.8).

## Funktionsumfang

**Konzept-Editor** — elf Kapitel: Stammdaten, Gebäude, Nutzung,
Brandabschnitte, Bauteile, Fluchtwege, Löschhilfen, Anlagentechnik,
Organisation, Abweichungen, Berichtstexte.

**Anforderungsmatrix** — aufgelöste Anforderungen mit Soll-/Ist-Vergleich,
Status (erfüllt / nicht erfüllt / Abweichung / Datenlücke / Regelkonflikt),
Confidence-Ampel und anklickbarem Quellenverweis. Nicht erfüllte Anforderungen
lassen sich per Klick als Abweichung erfassen.

**Bundesland-Overlay** — landesrechtliche Regeln überschreiben, ergänzen oder
heben OIB-Anforderungen auf; jede Wirkung wird im Ergebnis gekennzeichnet.
Geprüft sind Kärnten und Wien; für die übrigen Bundesländer weist die
Anwendung aus, dass die OIB-Anforderung unverändert gilt.

**Qualitätssicherung und Freigabe** — Rückabgleich aller Werte im Konzepttext
gegen die Matrix, Sperrliste offener Punkte, dokumentierte Freigabe durch eine
benannte Person, Ausnahmefreigabe nur mit Begründung, unveränderlicher
Audit-Trail, Prüfprotokoll als eigenes Dokument.

**Plausibilitätsprüfung** — rund 30 Eingaberegeln mit zitierter
Rechtsgrundlage, ergänzend zur Matrix (FR-1.6).

**Mängelliste** — Bewertung nach INGTEC SAFETY-SCORE A–E mit automatischem
Fristvorschlag, Zuordnung zum Berichtskapitel und Kennzeichnung verbleibender
Abweichungen ohne Maßnahme.

**SAFETY-SCORE** (`src/domain/score.ts`) — Teilscore je Kapitel 5–9 und
Gesamt-SAFETY-SCORE, jeweils Ist und Soll, Punkte 0–100, nach der Rechenregel des
Design Systems: Obergrenze der schlechtesten Stufe (A 100 … E 20) minus
0,5 × Risikoindex, höchstens 19 Punkte Abzug, abgerundet; Gesamt als
abgerundetes Mittel, gedeckelt auf die Stufe des schlechtesten Kapitels. Soll
zählt nur verbleibende Abweichungen, Empfehlungen zählen nie.

**Dokument** — druckfertiges Konzept im INGTEC-Layout mit Deckblatt,
14 Kapiteln, Teilscore-Zeile mit Mini-Band am Ende der Kapitel 5–9,
SAFETY-SCORE-Gesamtbewertung als Schlusskapitel, Verantwortlichkeitsvermerk und Berichtsnummer nach dem Schema
`YYMMDD_KD-XXXX_ING-GB-FB-AN-LA-SEQ`.

## Design

Verbindlich nach INGTEC Corporate Design, Ausgabe 1.1 (`260925_INGTEC_CD-001`),
das bei Widerspruch vor INGTEC Inspect PRD Abschnitt 10 gilt:

| Vorgabe | Umsetzung |
|---|---|
| INGTEC-Grün `#9DC31A`, Link `#5F7600` | `src/styles/tokens.css` |
| Keine blaue Akzent- oder Interaktionsfarbe | durchgehend eingehalten |
| Weißes Glas = Information, graues Glas = Beurteilung | `.card` / `.card--beurteilung` |
| Grau `#F2F2F2` ausschließlich bei Befundung: Teilscore-Zeile und Gesamtbewertung | `--glas-grau`, `.beurteilung` in Tabellen |
| Tabellen ohne senkrechte Linien, Kopflinie 1,5 pt Grün, Zeilenlinie 0,5 pt `#BFBFBF`, letzte Zeile ohne Linie | `.table`, `.doc__tabelle`, `--tabellenlinie` |
| Tabellentitel unter der Tabelle, fortlaufend nummeriert | `.doc__tabellentitel` |
| Bericht: A4, Satzspiegel 28,8 / 13,1 / 20 / 17,5 mm, Kapitel Arial 14 pt fett, Abschnitt 12 pt fett, Titel JhengHei UI Light kursiv in Grün | `.doc`, `@page` |
| Safety-Score-Farben nur für A–E | eigene Tokens, getrennt von der Ampel |
| SAFETY-SCORE: Plakette in Tabellen, Mini-Band in der Teilscore-Zeile je Kapitel, Gesamtbewertung nur mit Ist (Skalengrafik) und dem erreichbaren Soll als Plakette, `ScoreVerteilung` im Score-Stil | `components/Teilscore.tsx`, `components/ui.tsx` |
| Deckblatt als Einband (Layout der Objektbewertung): Titel, Gegenstand, Objektstandort, Sachverständiger; Haken der Skalengrafik in der Stufenfarbe des Gesamt-Ist hinter der Zeile SAFETY-SCORE · Bewertungsergebnis · Revisionsstand; Firmenzeile und Weiter-Pfeil; Projektdaten auf der Folgeseite | `assets/deckblatt-haken/`, `.doc__deckblatt--einband`, `components/WeiterPfeil.tsx` |
| Quellen-/Confidence-Ampel getrennt vom Score | `components/Ampel.tsx` |
| Farbe nie einziges Statusmerkmal | jeder Status trägt Text und Symbol |
| Touch-Ziele ≥ 44 × 44 px | `--touch` |
| Animationen bei „Bewegung reduzieren" aus | `prefers-reduced-motion` |
| Systemschrift in der App, Arial/Jheng Hei im Dokument | `--font-sans`, `.doc` |

Wortmarke, Deckblattgrafik TECHNIK.WIRKT, Fußzeilen-Signet und
Safety-Score-Grafiken sind die Originalassets der INGTEC-Berichtsvorlage und
werden weder nachgebaut noch umgefärbt.

## Referenzprototyp

`prototyp/ingtec-inspect-enterprise.html` ist der hochgeladene INGTEC-Inspect-
Prototyp (Single-File-Anwendung, „Titanium JS"). Er ist die Gestaltungsreferenz
für das Corporate Design und bleibt unverändert erhalten; er ist nicht Teil des
Builds. Beim Umbau der Oberfläche wurde er als verbindliche Vorlage
herangezogen — Markengrün `#9DC31A`, Linkvariante `#5F7600`, Glasflächen,
Score-Farben A–E und die Quellenampel stimmen mit ihm überein.

## Qualitätssicherung

100 Tests: Golden Dataset, Gebäudeklassenableitung, JSON-Logic-Auswerter,
Rückabgleich, Nummernschema, Plausibilitätsregeln.

Der Test `Abnahmekriterium 12.4.3` weist nach, dass ein künstlich
eingeschleuster Fehler im Konzepttext die Freigabe blockiert.

```bash
npm install
npm run dev           # Entwicklungsserver auf http://localhost:5173
npm run build         # Produktionsbuild nach dist/
npm run build:single  # zusätzlich eine eigenständige HTML-Datei
npm run preview       # Produktionsbuild lokal ausliefern
npm run typecheck     # TypeScript ohne Emit
npm test              # Testsuite
```

`npm run build:single` erzeugt
`dist/ingtec-brandschutzkonzept-tool.html` — eine einzelne Datei mit
eingebettetem JavaScript, CSS und Logo (~400 KB). Sie läuft per Doppelklick
im Browser, ohne Server und ohne Netzverbindung, und eignet sich zum Ansehen,
Weitergeben und für Umgebungen mit strikter Content-Security-Policy.

## Offene Punkte gegenüber dem PRD

Ehrlich benannt, damit der Stand einschätzbar bleibt:

1. **Der Regelkorpus ist ein Startkorpus.** Die Einträge sind strukturell
   vollständig, inhaltlich aber noch nicht gegen die Originalrichtlinie
   verifiziert. Phase 0 der Roadmap (~150 Anforderungen aus OIB-RL 2, Punkte
   2–6, plus Gegenprüfung an drei abgeschlossenen Projekten) steht aus.
2. **Das Golden Dataset enthält konstruierte Referenzfälle**, nicht die
   geforderten 15–25 abgeschlossenen, behördlich genehmigten Projekte. Bis
   diese erfasst sind, gilt Abnahmekriterium 12.4.2 als nicht erfüllt.
3. **Kein Backend.** Der Zielstack ist Laravel 12 / PHP 8.3 / PostgreSQL 16
   mit pgvector (NFR-7). Umgesetzt ist die Frontend-Schicht der Zielarchitektur
   (React/TypeScript/Vite, INGTEC Inspect PRD 11.1) samt vollständiger
   Regel-Engine; die Engine ist als portables Modul aus reinen Daten und
   Funktionen gebaut. Projekte liegen derzeit im `localStorage`.
4. **Keine KI-Formulierungsschicht und kein RAG.** Die Konzepttexte werden
   manuell erfasst. Die Schnittstelle dafür ist vorbereitet: Der Rückabgleich
   prüft bereits jeden Textabschnitt gegen die Matrix.
5. **Overlays nur für Kärnten und Wien** (v1.0-Scope); die übrigen sieben
   Bundesländer folgen in v1.5.
6. **Kein SharePoint-Anschluss, keine Diktateingabe, kein Versionsvergleich**
   — durchgehend v1.5-Umfang.

## Rechtlicher Rahmen

Die fachliche und rechtliche Verantwortung für jedes erzeugte
Brandschutzkonzept liegt beim befugten Sachverständigen bzw. Ziviltechniker.
Das Werkzeug leitet Anforderungen ab und belegt sie; es beurteilt keine
Gleichwertigkeit und gibt nichts frei. Die Punkte aus PRD Abschnitt 13
(EU AI Act, Berufsrecht, Urheberrecht, DSGVO, Berufshaftpflicht) sind vor
Produktivbetrieb abzuarbeiten.

---

INGTEC GmbH — TECHNIK.WIRKT
