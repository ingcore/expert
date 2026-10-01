# INGTEC Fachanwendungen

Zwei Fachmodule unter einer Oberfläche, im Corporate Design von INGTEC Inspect.
Sie teilen Design-Tokens, Bausteine und den Auswerter für Regelausdrücke,
halten ihre Fachlogik aber vollständig getrennt.

| Modul | Gegenstand | PRD |
|---|---|---|
| **Brandschutzkonzept** | Erstellung, Prüfung und Freigabe von Brandschutzkonzepten nach OIB-Richtlinien | „Brandschutzkonzept-Tool v1.0" |
| **PrüfBefund** | Technisches Prüfwesen Arbeitsmittel: Abnahme- und wiederkehrende Prüfungen nach AM-VO, einseitiger Prüfbefund | „INGTEC Prüfbefund OnePage v1.0" |

Der Wechsel zwischen den Modulen erfolgt in der Seitenleiste unter *Module*.

---

# Modul Brandschutzkonzept (BSK-Tool)

Werkzeug zur Erstellung, Prüfung und Freigabe von Brandschutzkonzepten nach
OIB-Richtlinien — umgesetzt nach dem PRD „Brandschutzkonzept-Tool v1.0".

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
Fristvorschlag, Original-Bewertungsgrafiken im Dokument.

**Dokument** — druckfertiges Konzept im INGTEC-Layout mit Deckblatt,
13 Kapiteln, Verantwortlichkeitsvermerk und Berichtsnummer nach dem Schema
`YYMMDD_KD-XXXX_ING-GB-FB-AN-LA-SEQ`.

## Design

Verbindlich nach INGTEC Inspect PRD Abschnitt 10:

| Vorgabe | Umsetzung |
|---|---|
| INGTEC-Grün `#9DC31A`, Link `#5F7600` | `src/styles/tokens.css` |
| Keine blaue Akzent- oder Interaktionsfarbe | durchgehend eingehalten |
| Weißes Glas = Information, graues Glas = Beurteilung | `.card` / `.card--beurteilung` |
| Safety-Score-Farben nur für A–E | eigene Tokens, getrennt von der Ampel |
| Quellen-/Confidence-Ampel getrennt vom Score | `components/Ampel.tsx` |
| Farbe nie einziges Statusmerkmal | jeder Status trägt Text und Symbol |
| Touch-Ziele ≥ 44 × 44 px | `--touch` |
| Animationen bei „Bewegung reduzieren" aus | `prefers-reduced-motion` |
| Systemschrift in der App, Arial/Jheng Hei im Dokument | `--font-sans`, `.doc` |

Logo und Safety-Score-Grafiken sind die Originalassets und werden weder
nachgebaut noch umgefärbt.

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


---

# Modul PrüfBefund

Erfassung von Arbeitsmitteln, Durchführung von Abnahmeprüfungen und
wiederkehrenden Prüfungen nach AM-VO und automatisierte Erzeugung eines
einseitigen A4-Prüfbefundes.

## Die tragende Entscheidung

> Die Rechtsgrundlage wird niemals aus einem Textbaustein erzeugt.
> Die Rechtsgrundlage bestimmt den gesamten Befund.

Die **Prüfart ist ein einziges unveränderliches Objekt**
(`domain/legal/pruefart.ts`). Titelzeile, Haupttext, gesetzlicher Prüfinhalt,
zulässige Ergebniszustände und Fußnote werden ausschließlich daraus abgeleitet.
Es gibt keinen Pfad, auf dem ein §-7-Kopf mit §-8-Text zusammentreffen könnte —
die Mischbefunde der Excel-Vorlage sind strukturell ausgeschlossen, nicht bloß
durch eine nachgelagerte Prüfung verhindert.

## Aufbau

```
src/pruefbefund/
  domain/
    enums.ts                Ergebniszustände nach § 6 AM-VO, Befundlebenszyklus
    families.ts             Anlagenfamilien und Bauarten
    types.ts                Kernmodell: Asset, Inspection, Finding, Report …
    schema.ts               Attributschema je Familie mit applicability_rule
    checklist.ts            Aufbau der Checkliste aus fünf Quellen
    intervall.ts            Geplanter und rechtlich spätester Prüftermin
    validierung.ts          Kritische Prüfungen vor der Befunderzeugung
    befund.ts               Zusammenbau des Einseitenbefundes, Revisionshash
    factory.ts              Neue Datensätze und Demobestand
    legal/
      rules.ts              Versionierte Regeln mit Gültigkeitszeitraum
      pruefart.ts           § 7 und § 8 samt verbindlicher Textengine
      applicability.ts      Rechtsprofile statt Automatismus je Anlagenart
  components/OnePage.tsx    Bereiche A–H des A4-Befundes
  views/                    Die sieben Ansichten nach PRD 21
  styles/onepage.css        Satzspiegel, Verdichtungsstufen, Druck
```

## Keine Gleichsetzung „Arbeitsmittelart = Prüfpflicht"

Eine Regel `Gabelstapler → immer § 7 + § 8` wäre unzulässig. Stattdessen
entscheidet ein **Rechtsprofil** aus Familie, Bauart und den konkreten
technischen Eigenschaften. Das Ergebnis ist nie ein stiller Automatismus,
sondern einer von drei Zuständen:

| Zustand | Bedeutung | Folge in der Oberfläche |
|---|---|---|
| `STANDARD` | Standardprüfpflicht | ohne weitere Begründung wählbar |
| `DIFFERENZIERT` | Pflicht besteht, hängt von der Ausführung ab | begründete fachliche Freigabe |
| `KEIN_STANDARDPROFIL` | keine Prüfpflicht hinterlegt | begründete fachliche Freigabe |

So erzeugt ein Brandschutzabschluss nicht automatisch „§ 7 AM-VO", nur weil
`Brandschutztür` gewählt wurde; ein gewöhnlicher Stapler erhält kein
§-7-Standardprofil; und Anschlagpunkte gegen Absturz sind eine eigenständige
Anlagenfamilie, die nicht mit Anschlagmitteln für Lasten gleichgesetzt wird.

## Rechtsfolge nach § 6 AM-VO

Vier Ergebniszustände, von der fachlichen Mangeleinstufung getrennt geführt:

| Code | Weiterbenützung |
|---|---|
| `NO_DEFECTS` | zulässig |
| `DEFECTS_USE_ALLOWED_6_3` | nur unter dokumentierten Voraussetzungen |
| `DEFECTS_USE_PROHIBITED` | bis Mängelbehebung unzulässig |
| `NOT_ASSESSABLE` | keine positive Aussage |

`DEFECTS_USE_ALLOWED_6_3` steht bei der Abnahmeprüfung nach § 7 nicht zur
Auswahl — nicht gesperrt, sondern in der Prüfart nicht vorhanden. Die
Textengine wirft, wenn dieser Zustand dort dennoch angefordert wird.

## Versionierte Rechtsstände

Rechtsgrundlagen sind Daten mit Gültigkeitszeitraum. Der anzuwendende Stand
wird über das **Prüfdatum** gewählt, nicht über den aktuellen Tag — historische
Befunde bleiben dadurch reproduzierbar.

## Prüfintervall

Für §-8-Arbeitsmittel werden zwei Termine geführt: der geplante Termin zwölf
Monate nach der letzten Prüfung und der rechtlich späteste aus „mindestens
einmal je Kalenderjahr **und** höchstens 15 Monate Abstand". Maßgeblich ist der
frühere der beiden — ein einfaches `Prüfdatum + 15 Monate` wäre falsch.

## Einseitigkeit

Der Prüfbefund umfasst immer genau eine A4-Seite. Vorschau und Druck führen
denselben Satzspiegel. Wächst der Inhalt, verdichtet sich der Satz in drei
Stufen; reicht auch das nicht, wandern überzählige Mängel in die Anlage M-01
und überzählige technische Kenndaten in die Anlage T-01.

Im Browser gemessen (je genau eine Seite, kein Überlauf): Tor mangelfrei, Tor
mit § 6 Abs. 3 und drei Mängeln, Tor mit sechs Mängeln, Fahrzeughebebühne nach
§ 7 mit drei Mängeln, Anschlagpunkt mangelfrei.

## Kritische Validierungen

`domain/validierung.ts` prüft vor der Befunderzeugung gegen den
zusammengesetzten Befund, nicht gegen einzelne Eingabefelder. Dadurch werden
auch Zustände erkannt, die erst durch nachträgliche Änderungen entstehen — etwa
eine Checkliste, die noch die Mindestprüfinhalte der zuvor gewählten Prüfart
trägt. Meldungen tragen die Schweregrade `BLOCKER`, `NICHT_FINAL` und
`WARNUNG`.

## Akzeptanzkriterien

`domain/akzeptanz.test.ts` deckt AC-01 bis AC-12 des PRD ab; jeder Test trägt
die Nummer des Kriteriums, das er absichert.
