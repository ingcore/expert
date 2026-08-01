# INGTEC Brandschutzkonzept-Tool

Webanwendung zur Erstellung, Prüfung und Dokumentation von Brandschutzkonzepten
nach österreichischem Regelwerk — im INGTEC Corporate Design.

## Funktionsumfang

**Projektverwaltung**
Mehrere Konzepte parallel, mit Suche, Statusfilter, Duplizieren und einem
Vollständigkeitsindikator je Projekt.

**Konzept-Editor** — elf Kapitel entlang der fachlichen Gliederung:

| # | Kapitel | Inhalt |
|---|---|---|
| 1 | Stammdaten | Auftraggeber, Objekt, Bearbeiter, Berichtsnummer |
| 2 | Gebäude | Gebäudeklasse, Bauweise, Kenndaten, Konstruktion |
| 3 | Nutzung | Nutzungseinheiten mit Fläche, Belegung, Brandlast |
| 4 | Brandabschnitte | BA/BBA mit Fläche und Trennbauteil |
| 5 | Bauteile | Soll-/Ist-Vergleich der Feuerwiderstandsklassen |
| 6 | Fluchtwege | Länge, Breite, Personenzahl, Ausstattung |
| 7 | Löschhilfen | Löschgeräte und Löschwasserversorgung |
| 8 | Anlagentechnik | BMA, RWA, Sprinkler, Alarmierung, Prüffristen |
| 9 | Organisation | Brandschutzbeauftragter, Ordnung, Pläne, Übungen |
| 10 | Abweichungen | Kompensation und Nachweis der Gleichwertigkeit |
| 11 | Berichtstexte | Auftragsgegenstand, Grundlagen, Conclusio |

**Regelwerksprüfung**
Rund 30 Prüfregeln laufen bei jeder Änderung mit und liefern Befunde mit
zitierter Rechtsgrundlage — Gebäudeklassen-Plausibilität, Fluchtweglängen und
-breiten, Panikbeschlag-Schwellen, Brandabschnittsflächen, Bauteilnachweise,
Löschmitteleinheiten, Löschwasserbedarf, Erforderlichkeit und Prüffristen der
Anlagentechnik, organisatorische Pflichten sowie überfällige Maßnahmenfristen.
Jeder Befund lässt sich per Klick in die Mängelliste übernehmen.

**Mängel- und Maßnahmenliste**
Bewertung nach INGTEC SAFETY-SCORE (A–E) mit automatischem Fristvorschlag je
Stufe, Mangelart (baulich / technisch / organisatorisch / Empfehlung), Status,
Verantwortlichkeit und Kostenschätzung.

**Dokumentgenerierung**
Druckfertiger Bericht im INGTEC-Layout mit Deckblatt, 13 Kapiteln, farbcodierter
Mängelliste und Berichtsnummer in der Fußzeile. Ausgabe als PDF über den
Browserdruck oder als Markdown zur Weiterverarbeitung.

**Berichtsnummer und Ablage**
Generator für das INGTEC-Schema `YYMMDD_KD-XXXX_ING-GB-FB-AN-LA-SEQ`
(z. B. `260720_KD-0219_ING-BS-BAU-ALL-FB-001`) samt Kundenordnerstruktur.

**Dashboard**
Portfoliosicht über alle Projekte: SAFETY-SCORE-Verteilung, Risikoindex je
Projekt, dringender Handlungsbedarf und überfällige Fristen.

## Fachliche Grundlagen

Die hinterlegten Grenzwerte stammen aus OIB-Richtlinie 2 (Fassung 2023) samt
Teilrichtlinien 2.1–2.3, der TRVB-Reihe (S 123, S 125, S 127, S 158, F 124,
F 128, O 119, O 121), ÖNORM EN 13501-2, ÖNORM EN 1125, ÖVE/ÖNORM E 8002 sowie
der Arbeitsstättenverordnung. Sie sind unter *Regelwerk* vollständig einsehbar.

Die automatische Prüfung ist eine Plausibilitätskontrolle und ersetzt keine
sachverständige Beurteilung — im Einzelfall können behördliche Vorschreibungen
abweichen.

## Design

Die Corporate Identity ist aus dem produktiven INGTEC-Berichtslayout übernommen:
Wortmarke und Farbwerte (Markengrün `#A5C217`, Anthrazit `#1D1D1B`, Flächenton
`#2C3C43`), Hausschrift Trebuchet MS und die Original-SAFETY-SCORE-Skala
(`#02A54C` → `#E54100`). Die Oberfläche unterstützt helles und dunkles Thema.

## Entwicklung

```bash
npm install
npm run dev        # Entwicklungsserver auf http://localhost:5173
npm run build      # Produktionsbuild nach dist/
npm run preview    # Produktionsbuild lokal ausliefern
npm run typecheck  # TypeScript ohne Emit
npm test           # Testsuite (Vitest)
```

**Stack:** React 18, TypeScript (strict), Vite 5, Vitest. Keine UI-Bibliothek —
das Designsystem liegt als CSS-Custom-Properties in `src/styles/tokens.css`.

## Projektstruktur

```
src/
  domain/      Fachmodell, Regelwerkskatalog, Prüfregeln, Kennzahlen, Nummernschema
  state/       Zustandsverwaltung mit localStorage-Persistenz
  views/       Dashboard, Projekte, Konzept, Prüfung, Maßnahmen, Dokument, Regelwerk
    kapitel/   Die elf Kapiteleditoren
  export/      Markdown-Ausgabe
  components/  UI-Bausteine und Logo
  styles/      Designtokens, Basis-Styles, Layout
  assets/      INGTEC-Wortmarke und SAFETY-SCORE-Grafiken
```

## Datenhaltung

Die Projekte liegen ausschließlich lokal im Browser (`localStorage`) — es gibt
keinen Server und keine Datenübertragung. Über *Verwaltung* lassen sich alle
Projekte als JSON exportieren und wieder importieren; der Export ist zugleich
das Sicherungs- und Übergabeformat.

Beim ersten Start wird ein Beispielprojekt angelegt, das bewusst einige
Regelverstöße enthält, damit Prüflogik und Mängelbewertung unmittelbar sichtbar
werden.

---

INGTEC GmbH — TECHNIK.WIRKT
