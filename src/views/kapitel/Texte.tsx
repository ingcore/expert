import { useAktivesProjekt } from '@/state/store';
import { Karte, TextBereich } from '@/components/ui';

export function KapitelTexte() {
  const { projekt, patch } = useAktivesProjekt();
  if (!projekt) return null;

  return (
    <>
      <Karte
        titel="Auftragsgegenstand"
        untertitel="Kapitel 1 des Berichts — was wurde beauftragt und wozu dient das Konzept"
      >
        <TextBereich
          label="Text"
          wert={projekt.auftragsgegenstand}
          rows={7}
          onChange={(auftragsgegenstand) => patch({ auftragsgegenstand })}
          placeholder="Gegenstand des Auftrages ist die Erstellung eines Brandschutzkonzeptes für …"
        />
      </Karte>

      <Karte
        titel="Beurteilungsgrundlagen"
        untertitel="Herangezogene Rechtsvorschriften, Richtlinien und Unterlagen"
      >
        <TextBereich
          label="Text"
          wert={projekt.grundlagen}
          rows={7}
          onChange={(grundlagen) => patch({ grundlagen })}
          placeholder="Grundlage der Beurteilung bilden die OIB-Richtlinie 2 in der Fassung 2023, die einschlägigen TRVB …"
        />
      </Karte>

      <Karte
        titel="Conclusio"
        untertitel="Zusammenfassende Beurteilung und Empfehlung"
      >
        <TextBereich
          label="Text"
          wert={projekt.conclusio}
          rows={8}
          onChange={(conclusio) => patch({ conclusio })}
          placeholder="Zusammenfassende Beurteilung des brandschutztechnischen Zustands und Empfehlung …"
        />
      </Karte>
    </>
  );
}
