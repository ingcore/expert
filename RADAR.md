# INGTEC Automotive Asset Radar

Datengetriebene Plattform zur Identifikation, Bewertung und laufenden
Überwachung hochwertiger Gebraucht-, Performance-, Youngtimer- und
Sammlerfahrzeuge — umgesetzt nach dem PRD „INGTEC Automotive Asset Radar v1.0"
im Corporate Design von INGTEC Inspect.

Start: `npm run dev`, dann **http://localhost:5173/radar.html**

## Das Produktversprechen als Bauprinzip

> Nicht das billigste Fahrzeug finden, sondern das beste tatsächlich verfügbare
> Fahrzeug mit nachvollziehbarer Historie, angemessenem Preis und attraktivem
> langfristigem Asset-Potenzial. — PRD Abschnitt 1

Das ist keine Marketingzeile, sondern eine technische Vorgabe. Sie steht
wörtlich in der Bewertungsfunktion: `preisvorteilPunkte()` in
`engine/buysignal.ts` ist bewusst **nicht monoton**. Ein Fahrzeug 10 % unter
Marktwert bekommt 95 Punkte, eines 40 % darunter nur 20 — weniger als ein
Fahrzeug 15 % über Marktwert. Ein auffällig niedriger Preis ist im
Sammlersegment kein Vorteil, sondern der Hinweis auf einen Umstand, der nicht
im Inserat steht. Genau das prüft ein Test.

## Die tragenden Entscheidungen

**Fahrzeug, Inserat und Beobachtung sind drei verschiedene Dinge** (Abschnitt
7). Ein Fahrzeug überdauert seine Inserate, ein Inserat seine Beobachtungen.
Ohne diese Trennung gibt es keine Historisierung — und ohne Historisierung
kein Produkt, weil jede interessante Aussage aus dem Vergleich zweier
Zeitpunkte entsteht.

**Nichts wird überschrieben.** Gespeichert sind vollständige Beobachtungen;
Änderungen werden abgeleitet, nicht gemeldet. Das Verschwinden einer Angabe
ist deshalb ein eigenes Ereignis und keine leere Zelle.

**Ein Score ist die Liste seiner Beiträge.** Der Zahlenwert entsteht aus ihnen
und kann gar nicht von ihnen abweichen — es gibt keinen zweiten Rechenweg.
Damit ist Abschnitt 38 (Score Governance) nicht als Darstellungsfrage gelöst,
sondern in der Datenstruktur.

**Im Zweifel lieber keine Aussage als eine geratene.** Ohne Modellzuordnung
wird kein Marktwert ausgewiesen. Zwischen den Identitätsschwellen wird nicht
zusammengeführt, sondern zur manuellen Prüfung vorgelegt. Fehlende Merkmale
zählen im Identitätsvergleich weder als Übereinstimmung noch als Widerspruch.

## Umsetzungsstand gegen die PRD

| PRD | Thema | Umsetzung |
|---|---|---|
| 7 | Fahrzeug / Inserat / Beobachtung | `domain/types.ts`, durchgängig getrennt |
| 8, 33 | Connectoren, Rangfolge des Zugriffs | `connectors/` — mobile.de (API), AutoScout24 (Feed), willhaben (Webzugriff), Classic Trader (Partnerzugang, deaktiviert) |
| 9 | Datenaufnahme | vollständiges Feldmodell inkl. Bild-, Text- und Verkaufsdaten |
| 10 | Vehicle Identity Engine | `engine/identitaet.ts` — gewichteter Merkmalsvergleich, VIN entscheidet allein, Grenzfälle zur Prüfung |
| 11 | Historisierung | `engine/historie.ts` — acht Änderungsarten aus Beobachtungsvergleich |
| 12 | Offer Integrity Score | `engine/integritaet.ts` — zehn Komponenten mit der Gewichtung des PRD |
| 13 | Evidence Score | `engine/evidenz.ts` — Behauptungen gegen hinterlegte Unterlagen |
| 14 | Automotive Asset Score | `engine/asset.ts` — 16 Kriterien, zwei davon gemessen statt geschätzt |
| 15 | Individual Vehicle Quality | `engine/qualitaet.ts` — 13 Kriterien des Exemplars |
| 16 | Market Valuation | `engine/bewertung.ts` — Anker aus Kilometerklasse, benannte Faktoren, Konfidenzintervall |
| 17 | Preisentwicklung | `wissen/marktdaten.ts` — 12 Varianten, 24 Monate, Klassen- und Baujahrsschnitte |
| 18 | Market Momentum | `engine/momentum.ts` — sechs Komponenten inkl. Spreizung zum Bestzustand |
| 19 | Restaurationsanalyse | `engine/restauration.ts` — 12 Gewerke, Low/Expected/High, Reserve, Investment Ratio |
| 20 | Technische Knowledge Base | `wissen/risiken.ts` — 23 modelltypische Risiken mit Kosten und Entkräftung |
| 21 | Bildanalyse | Auffälligkeiten als Hinweis, nie als Feststellung |
| 22 | Text Intelligence | `engine/text.ts` — 13 Muster, alle mit Prüfanforderung statt Abwertung |
| 23 | Red Flag Engine | `engine/redflags.ts` — alle zwölf PRD-Regeln plus VIN-Formalprüfung |
| 24 | Firmenwagenmodus | `engine/firmenwagen.ts` — **keine** Grenzwerte im Code, alle Parameter administrativ |
| 25 | Portfolio | `engine/portfolio.ts` — TCO, realisiert/unrealisiert, IRR über exakte Zahlungstermine |
| 26 | Watchlist | neun Status als Kaufprozess, Prüfergebnisse am Eintrag |
| 27 | Alert Engine | Rangschwelle, Entprellung, Erheblichkeitsschwellen |
| 28 | Buy Signal | Mindestbedingungen, kein Ausgleich zwischen ihnen |
| 29 | Oberfläche | Dashboard, Suchmaske, Fahrzeugdetailseite mit allen geforderten Bereichen |
| 30 | Datenmodell | Typnamen entsprechen den Zieltabellen |
| 34 | Datenqualität | `engine/datenqualitaet.ts` — Quelle, Zeitpunkt, Confidence je Feld; Widersprüche bleiben erhalten |
| 35 | Audit Trail | jede Systementscheidung mit altem und neuem Wert |
| 36 | Compliance | je Quelle dokumentiert, offene Fragen sichtbar ausgewiesen |
| 37 | Rollenmodell | sechs Rollen, Parameteränderung nur für Administratoren |
| 38, 39 | Governance und Erklärbarkeit | jeder Score aufklappbar bis zum Einzelbeitrag |
| 40 | Nutzerfeedback | Ground Truth getrennt gespeichert, überschreibt nichts |
| 41 | Dokumente | Extraktion von Datum, Kilometer, Werkstatt, Leistungen, Kosten |
| 42 | Verkäuferanfrage | aus Grundfragen und Modellrisiken, Versand nur nach Freigabe |
| 43 | Kaufprüfung | fahrzeugspezifische Prüfliste mit fünf Ergebnisstufen |
| 44 | Prüfbericht | neun Abschnitte, druckfertig |
| 46 | MVP-Umfang | BMW M3 E90/E92, Audi RS3/RS4/RS5, Porsche 996/997 auf drei Plattformen |

## Architektur

```
src/radar/
  domain/          Typen (Abschnitt 7 und 30), Formatierung, Stichtag
  wissen/          Modellkatalog, Risiken, Marktreihen, Prüf- und
                   Restaurationskatalog, Plattformen samt Compliance
  connectors/      Gemeinsame Schnittstelle, drei Plattformen, Collector-Lauf
  engine/          Alle Bewertungen — rein funktional, ohne Zustand
  daten/           Simulierte Außenwelt und Aufbau des Startbestandes
  state/           Anwendungszustand, Persistenz des Arbeitszustandes
  components/      Bausteine im INGTEC-Design
  views/           Neun Ansichten
```

Die Engines sind reine Funktionen: gleiche Eingabe, gleiche Ausgabe, keine
Seiteneffekte. Ein Test prüft das ausdrücklich. Sie hängen weder an React noch
am Browser und lassen sich unverändert in einen Node- oder PHP-Dienst der
Zielarchitektur (Abschnitt 31) übernehmen.

### Der Weg eines Inserates

```
Plattform → search() → normalize() → Beobachtung
                                        ↓
                          Vehicle Identity Engine
                          ↙                      ↘
              bestehende Fahrzeugakte      neue Akte (+ Grenzfall)
                                        ↓
   Text → Risiken → Momentum → Marktwert → Integrity → Evidence
        → Asset → Quality → Red Flags → Gesamtbewertung → Buy Signal
```

Die Reihenfolge ist nicht beliebig: Der Marktwert braucht den offenen
Instandsetzungsbedarf, der Integrity Score braucht den Marktwert für die
Preisplausibilität, das Buy Signal braucht alles. `engine/analyse.ts` hält sie
an einer Stelle fest.

### Der Datenbestand entsteht durch echte Läufe

Der mitgelieferte Bestand ist **nicht** hingeschrieben. `daten/rohdaten.ts`
erzeugt aus 14 Fahrzeugen plattformtypische Nutzlasten — mobile.de mit
englischen Feldnamen und Kilowatt, AutoScout24 mit deutschen Namen und
formatiertem Preis, willhaben mit reinen Anzeigetexten wie `"€ 39.900,-"` und
`"420 PS (309 kW)"`. Beim Start laufen 34 vollständige Collector-Durchgänge
über alle Beobachtungszeitpunkte. Jede Fahrzeugzuordnung, jede
Beobachtungsreihe und jeder Auditeintrag in der Oberfläche ist damit ein
Ergebnis der Engines und keine Behauptung einer Datei.

Das kostet beim Start etwa 200 Millisekunden und ist der Grund, warum die
Anwendung kurz „Datenbestand wird aufgebaut" anzeigt.

## Was der Datenbestand zeigt

| Fall | Was daran zu sehen ist |
|---|---|
| M3 E92 Interlagosblau | Das Beispiel aus Abschnitt 11: 42.900 → 39.900 → 37.900 €, Händlerwechsel auf eine andere Plattform, Kilometerstand sinkt von 91.300 auf 91.250, „unfallfrei" wird zu „laut Vorbesitzer". Rang D bei Asset Score 86 — ein gutes Modell ist noch kein gutes Fahrzeug. |
| M3 E92 Competition, Alpinweiß | Sechs Unterlagen, Pleuellagerwechsel belegt, Preis unter Marktwert: das einzige **INGTEC BUY SIGNAL** im Bestand. |
| M3 E90 Limousine | Dasselbe Fahrzeug bei demselben Händler auf zwei Plattformen — die Identity Engine führt automatisch zusammen. Erfüllt als einziges das Firmenwagenprofil. |
| M3 E92 „günstig, Export bevorzugt" | Zwei Fotos aus einem fremden Inserat, VIN mit Audi-Herstellerkennung, 34 % unter Marktwert. Sechs Red Flags, Gesamtbewertung 0. |
| RS4 B7 Avant | Ein zweites Inserat bei einem anderen Händler ohne VIN und ohne gemeinsame Bilder → 75 % Übereinstimmung, **Grenzfall zur manuellen Prüfung** statt stiller Zusammenführung. |
| Porsche 996 C4S, Projekt | Restaurationsfall aus Abschnitt 19 mit Korrosionshinweis aus der Bildanalyse, Investment Ratio unter der Wirtschaftlichkeitsschwelle. |
| Porsche 997.1 Carrera S | „Motor überholt" ohne Rechnung — Evidence Score 21. Dazu ein Nutzerbefund (Ground Truth), der die Unfallangabe korrigiert, ohne sie zu überschreiben. |

## Qualitätssicherung

107 Tests für den Radar (207 im Gesamtprojekt):

```bash
npm test                 # gesamte Testsuite
npm run typecheck        # TypeScript ohne Emit
```

Geprüft werden unter anderem:

- **Normalisierung** — deutsche Zahlenformate, kW/PS, Datumsschreibweisen und
  die Unterscheidung von `"Unfallfrei"` und `"Unfallfrei laut Vorbesitzer"`.
  Zusätzlich: Dasselbe Fahrzeug liefert über zwei Plattformen dieselben
  Kernwerte, obwohl die Nutzlasten nichts gemeinsam haben.
- **Identität** — VIN entscheidet allein, ein deutlicher Kilometerrückgang
  schließt aus, eine kleine Abweichung nicht (das ist Sache der Red Flags).
- **Historisierung** — das Beispiel aus Abschnitt 11 vollständig nachgebildet.
- **Bewertung** — Konfidenzintervall wird breiter, wenn Angaben fehlen; ohne
  Modellzuordnung wird kein Wert ausgewiesen.
- **Evidence** — dieselbe Behauptung mit und ohne Rechnung.
- **Buy Signal** — eine fehlende Bedingung genügt; keine Verrechnung.
- **Abnahmekriterien aus Abschnitt 50** — als eigener Testblock, der die
  gesamte Kette durchläuft.
- **Determinismus** — zwei Läufe über denselben Bestand ergeben identische
  Bewertungen.

## Design

Verbindlich nach INGTEC Inspect: Markengrün `#9DC31A` als einzige Akzentfarbe,
keine blaue Interaktionsfarbe, weißes Glas für Information und graues Glas
dort, wo fachlich beurteilt wird. Farbe ist nie das einzige Statusmerkmal —
jeder Score trägt seine Zahl, jeder Rang seinen Buchstaben, jede Red Flag ihr
Wort. Tokens und Grundlayout werden mit dem Brandschutzkonzept-Tool geteilt
(`src/styles/`), die radarspezifischen Bausteine stehen in
`src/radar/styles/radar.css`.

Diagramme sind reines SVG ohne Bibliothek: Für vier Verlaufskurven wäre eine
Diagrammbibliothek schwerer als die gesamte Regel-Engine.

## Offene Punkte gegenüber der PRD

Ehrlich benannt, damit der Stand einschätzbar bleibt:

1. **Kein Backend.** Die Zielarchitektur (Abschnitt 31) ist Laravel,
   PostgreSQL, Redis, OpenSearch, S3 und ein eigener Vision-Service. Umgesetzt
   ist die Anwendungs- und Auswertungsschicht; die Engines sind als portable
   Module aus reinen Daten und Funktionen gebaut. Der Arbeitszustand liegt im
   `localStorage`, der beobachtete Bestand wird bei jedem Start neu erzeugt.
2. **Die Connectoren lesen aus einem mitgelieferten Datenbestand**, nicht aus
   dem Netz. Abruf und Normalisierung sind vollständig getrennt: Für den
   Produktivbetrieb ist ausschließlich der Abrufteil in `demo-basis.ts` gegen
   API, Feed oder Partnerzugang zu tauschen. Die Normalisierung, die
   Änderungserkennung und der gesamte Lauf bleiben unverändert.
3. **Die Marktreihen sind erzeugt, nicht gemessen.** Momentum-Score und
   Marktwert rechnen mit echten Formeln auf einer synthetischen Reihe. Die
   Herkunft steht in der Oberfläche. Im Betrieb wird die Reihe Monat für Monat
   durch beobachtete Inserate ersetzt — das ist der Vermögenswert aus
   Abschnitt 52 und entsteht erst über die Zeit.
4. **Keine KI-Komponente.** Text- und Bildbefunde sind regelbasiert erzeugt.
   Abschnitt 38 sieht Sprach- und Bildmodelle für Textanalyse, Bildanalyse und
   Dokumentklassifikation vor — also für das *Erzeugen* von Eingangsdaten. Die
   Schnittstelle dafür steht: `Textbefund`, `Bildauffaelligkeit` und
   `Fahrzeugdokument.extrahiert` sind genau die Stellen, an denen ein Modell
   liefern würde. Die Bewertung bliebe auch dann regelbasiert.
5. **Bild-Hashes stammen aus dem Datenbestand**, nicht aus echter
   Bildverarbeitung. Der Vergleich über Hamming-Abstände ist vollständig
   implementiert und arbeitet unverändert mit Hashes eines Vision-Services.
6. **Der Modell- und Risikokatalog ist ein Startkorpus.** Zehn Modelle, 23
   Risiken, fachlich plausibel, aber nicht gegen Herstellerunterlagen
   verifiziert. Die Asset-Kriterien sind Einschätzungen; sie sind über die
   Verwaltung änderbar und in der Score-Erklärung mit Begründung sichtbar.
7. **Ein Suchauftrag lässt sich nicht in der Oberfläche anlegen** — nur
   auswählen, aktivieren und pausieren. Die Datenstruktur trägt alles Nötige.
8. **VIN-Prüfung nur formal.** Herstellerkennung und Modelljahr werden geprüft;
   die vollständige Dekodierung steht laut Abschnitt 48 in Phase 3 an.
9. **Keine Auktionsdaten, keine Mobile App, keine externen Kundenkonten** —
   durchgehend Phase 3 und 4.

## Rechtlicher Rahmen

Die Anwendung liefert eine Entscheidungsunterstützung, keine abschließende
technische oder rechtliche Beurteilung (Abschnitt 4). Sie stellt weder Betrug
noch Manipulation fest, ersetzt kein Gutachten und keine steuerliche Beratung,
und sie kontaktiert keinen Verkäufer ohne Freigabe.

Vor Produktivbetrieb sind die in `wissen/plattformen.ts` je Quelle
ausgewiesenen offenen Punkte zu klären — insbesondere die vertragliche
Zulässigkeit des automatisierten Zugriffs dort, wo bislang nur ein technischer
Webzugriff besteht (Abschnitt 36). Die Anwendung weist diese Punkte in der
Ansicht „Quellen und Läufe" sichtbar aus, statt sie zu verschweigen.

---

INGTEC GmbH — TECHNIK.WIRKT
