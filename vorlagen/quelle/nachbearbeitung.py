"""Macht aus roh.docx die Vorlage: Tabellenformatvorlagen, Kapitelnummerierung
an den Überschriftvorlagen, doppelte Standardvorlagen entfernen, Inhaltstyp
Vorlage (.dotx). Aufruf: python3 nachbearbeitung.py <ziel.dotx> [<ziel.docx>]"""
import re, sys, zipfile, os

QUELLE = os.path.join(os.path.dirname(__file__), 'roh.docx')

TABELLENSTILE = '''<w:style w:type="table" w:customStyle="1" w:styleId="IngtecTabelle"><w:name w:val="INGTEC Tabelle"/><w:basedOn w:val="TableNormal"/><w:uiPriority w:val="59"/><w:qFormat/><w:pPr><w:spacing w:before="0" w:after="0" w:line="252" w:lineRule="auto"/><w:jc w:val="left"/></w:pPr><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:tblPr><w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/><w:insideV w:val="nil"/></w:tblBorders><w:tblCellMar><w:top w:w="70" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="70" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tcPr><w:vAlign w:val="top"/></w:tcPr><w:tblStylePr w:type="firstRow"><w:pPr><w:keepNext/></w:pPr><w:rPr><w:b/><w:bCs/></w:rPr><w:tblPr/><w:trPr><w:tblHeader/></w:trPr><w:tcPr><w:tcBorders><w:bottom w:val="single" w:sz="12" w:space="0" w:color="9DC31A"/></w:tcBorders><w:vAlign w:val="bottom"/></w:tcPr></w:tblStylePr><w:tblStylePr w:type="firstCol"><w:rPr><w:b/><w:bCs/></w:rPr></w:tblStylePr></w:style><w:style w:type="table" w:customStyle="1" w:styleId="IngtecDaten"><w:name w:val="INGTEC Datentabelle ohne Linien"/><w:basedOn w:val="TableNormal"/><w:uiPriority w:val="60"/><w:qFormat/><w:pPr><w:spacing w:before="0" w:after="0" w:line="252" w:lineRule="auto"/><w:jc w:val="left"/></w:pPr><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:tblPr><w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders><w:tblCellMar><w:top w:w="70" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="70" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>'''

LOOK = '<w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="1" w:noVBand="1"/>'


def styles(s: str) -> str:
    # doppelte Vorlagen (Standard von docx-js vor den eigenen): die letzte gilt
    for sid in set(re.findall(r'w:styleId="([^"]+)"', s)):
        treffer = list(re.finditer(r'<w:style [^>]*w:styleId="%s".*?</w:style>' % re.escape(sid), s, re.S))
        for m in treffer[:-1][::-1]:
            s = s[:m.start()] + s[m.end():]
    # Kapitelnummerierung an Überschrift 1 und 2
    for sid, lvl in (('Heading1', 0), ('Heading2', 1)):
        # numPr steht im Schema nach keepNext/keepLines, vor spacing
        m = re.search(r'<w:style [^>]*w:styleId="%s".*?<w:spacing\b' % sid, s, re.S)
        k = m.end() - len('<w:spacing')
        s = s[:k] + '<w:numPr><w:ilvl w:val="%d"/><w:numId w:val="90"/></w:numPr>' % lvl + s[k:]
    return s.replace('</w:styles>', TABELLENSTILE + '</w:styles>')


def numbering(s: str) -> str:
    kap = [m for m in re.finditer(r'<w:abstractNum [^>]*w:abstractNumId="(\d+)".*?</w:abstractNum>', s, re.S) if '%1.%2' in m.group(0)][0]
    block = kap.group(0)
    # pStyle steht im Schema nach start/numFmt/lvlRestart, vor isLgl/suff/lvlText
    def pstyle(block, ilvl, vorlage):
        m = re.search(r'<w:lvl w:ilvl="%d"[^>]*>.*?</w:lvl>' % ilvl, block, re.S)
        lvl = m.group(0)
        k = re.search(r'<w:(isLgl|suff|lvlText)\b', lvl)
        lvl = lvl[:k.start()] + '<w:pStyle w:val="%s"/>' % vorlage + lvl[k.start():]
        return block[:m.start()] + lvl + block[m.end():]
    block = pstyle(block, 0, 'Heading1')
    block = pstyle(block, 1, 'Heading2')
    s = s[:kap.start()] + block + s[kap.end():]
    return s.replace('</w:numbering>', '<w:num w:numId="90"><w:abstractNumId w:val="%s"/></w:num></w:numbering>' % kap.group(1))


def tabellen(s: str) -> str:
    def fix(m):
        t = m.group(0)
        t = re.sub(r'<w:tblBorders>.*?</w:tblBorders>', '', t, count=1, flags=re.S)
        if 'w:tblLook' not in t:
            t = t.replace('</w:tblPr>', LOOK + '</w:tblPr>', 1)
        return t
    return re.sub(r'<w:tblPr><w:tblStyle w:val="Ingtec(?:Tabelle|Daten)"/>.*?</w:tblPr>', fix, s, flags=re.S)


def schreibe(ziel: str, vorlage: bool):
    with zipfile.ZipFile(QUELLE) as zin, zipfile.ZipFile(ziel, 'w', zipfile.ZIP_DEFLATED) as zout:
        for info in zin.infolist():
            daten = zin.read(info.filename)
            if info.filename == 'word/styles.xml':
                daten = styles(daten.decode()).encode()
            elif info.filename == 'word/numbering.xml':
                daten = numbering(daten.decode()).encode()
            elif re.match(r'word/(document|footer\d+|header\d+)\.xml', info.filename):
                daten = tabellen(daten.decode()).encode()
            elif info.filename == '[Content_Types].xml' and vorlage:
                daten = daten.decode().replace('wordprocessingml.document.main+xml', 'wordprocessingml.template.main+xml').encode()
            zout.writestr(info, daten)


schreibe(sys.argv[1], True)
if len(sys.argv) > 2:
    schreibe(sys.argv[2], False)
print('ok')
