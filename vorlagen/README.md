# INGTEC Berichtsvorlage (Word)

`260926_INGTEC_VORLAGE-BERICHT-001.dotx` ist die Word-Vorlage für Berichte nach
INGTEC Corporate Design, Ausgabe 1.1 (`260925_INGTEC_CD-001`).

## Aufbau

1. **Deckblatt als Einband** (Layout der INGTEC-Objektbewertung): Datum,
   Berichtsnummer, Berichtsart, Gegenstand, Objektstandort, Sachverständiger.
   Deckblatt-Haken, Kerndatenzeile (SAFETY-SCORE · Bewertungsergebnis ·
   Revisionsstand), Firmenzeile und Weiter-Pfeil stehen in der Fußzeile der
   ersten Seite und bleiben dadurch fest am unteren Rand.
2. **Seite 2:** Projektdaten ohne Linien, mit der Zeile SAFETY-SCORE
   („34/100 (Stufe D) — schwerwiegender Mangel“), automatisches Inhaltsverzeichnis.
3. **Bausteine:** Kapitel, INGTEC-Tabelle, Feststellungstabelle mit
   Teilscore-Zeile und Mini-Band, Prüfliste mit Berichtszeichen,
   Bewertungsgrundlage mit Stufen, Rechenregel und Legende der Berichtszeichen.
4. **SAFETY-SCORE Gesamtbewertung:** ScoreVerteilung, Teilscores nur mit Ist,
   Skalengrafik für das Ist, erreichbares Soll als Plakette, Haftungshinweis.

Platzhalter stehen in [eckigen Klammern]. Beim Öffnen fragt Word, ob Felder
aktualisiert werden sollen: mit Ja bestätigen, dann füllen sich
Inhaltsverzeichnis sowie Tabellen- und Abbildungsnummern.

## Formatvorlagen

- Überschrift 1 und 2, automatisch nummeriert (1, 1.1)
- INGTEC Tabelle (Kopflinie 1,5 pt Grün, Zeilenlinien 0,5 pt #BFBFBF, letzte
  Zeile ohne Linie), INGTEC Datentabelle ohne Linien
- INGTEC Beschriftung (Tabelle n / Abbildung n über Feld SEQ), INGTEC
  Seitentitel, INGTEC Deckblatttitel, Deckblatt-Beschriftungen,
  INGTEC Bandtacho Beschriftung, INGTEC Haftungshinweis, INGTEC Fußzeile
- Zeichenvorlagen der Statusfarben (CD 4.2): INGTEC Status Fehler, Warnung,
  erledigt, Information — immer mit Symbol und Wort, etwa „✕ Fehler“

## Grafiken

`grafiken/` enthält die Bilder der Vorlage und die Fassungen zum Tauschen:
`Deckblatt-Haken-A.png` … `-E.png` (Rechtsklick auf den Haken → Bild ändern),
`Skalengrafik-A.png` … `-E.png` für die Gesamtbewertung und den
`Weiter-Pfeil.png`. `grafiken/berichtszeichen/` enthält die Berichtszeichen
(CD 4.3) als SVG und PNG: Original-Prüfhaken (`zeichen-erfuellt`), Original-X
(`zeichen-mangel`), Warnung, Hinweis, nicht bewertet, Maßnahme, Empfehlung und
Nachprüfung. Einfügen als Bild, Höhe 2,6 mm in Tabellen (9 pt) und 3,5 mm im
Fließtext (11 pt), immer vor dem Wort. Das Mini-Band und die ScoreVerteilung in der Vorlage sind
Beispiele; im Bericht erzeugt sie INGTEC Inspect aus den Punkten.

## Neu erzeugen

```bash
npm install --no-save docx@9
node vorlagen/quelle/vorlage.cjs
python3 vorlagen/quelle/nachbearbeitung.py vorlagen/260926_INGTEC_VORLAGE-BERICHT-001.dotx
```

`vorlage.cjs` erzeugt `quelle/roh.docx` (Inhalt, Kopf- und Fußzeilen);
`nachbearbeitung.py` ergänzt die Tabellenformatvorlagen und die
Kapitelnummerierung an den Überschriften und stellt den Inhaltstyp auf
Vorlage (.dotx) um.
