#!/usr/bin/env python3
"""Vypíše tabulky z .docx návrhu vyhlášky spolu s přílohou, ve které se nachází.

Použití:
    python3 tools/extract_tables.py Navrh_uhradove_vyhlasky_2027.docx            # přehled tabulek
    python3 tools/extract_tables.py Navrh_uhradove_vyhlasky_2027.docx --json out.json

Výstup JSON: [{"annex": 11, "index": 3, "rows": [["kód", "název", ...], ...]}, ...]
Pouze standardní knihovna.
"""
import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
ANNEX_RE = re.compile(r'^Příloha č\.\s*(\d+)\s+k vyhlášce')


def text_of(el):
    parts = []
    for node in el.iter():
        if node.tag == W + 't' and node.text:
            parts.append(node.text)
        elif node.tag in (W + 'tab',):
            parts.append(' ')
        elif node.tag in (W + 'br', W + 'cr'):
            parts.append(' ')
    return re.sub(r'\s+', ' ', ''.join(parts)).strip()


def table_rows(tbl):
    rows = []
    for tr in tbl.findall(W + 'tr'):
        cells = []
        for tc in tr.findall(W + 'tc'):
            span = tc.find(f'{W}tcPr/{W}gridSpan')
            text = ' '.join(text_of(p) for p in tc.findall(W + 'p')).strip()
            cells.append(text)
            if span is not None:
                cells.extend([''] * (int(span.get(W + 'val', '1')) - 1))
        rows.append(cells)
    return rows


def extract(path):
    root = ET.fromstring(zipfile.ZipFile(path).read('word/document.xml'))
    body = root.find(W + 'body')
    annex = 0
    out = []
    for el in body:
        if el.tag == W + 'p':
            m = ANNEX_RE.match(text_of(el))
            if m:
                annex = int(m.group(1))
        elif el.tag == W + 'tbl':
            out.append({'annex': annex, 'index': len(out), 'rows': table_rows(el)})
    return out


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    tables = extract(sys.argv[1])
    if '--json' in sys.argv:
        dest = sys.argv[sys.argv.index('--json') + 1]
        with open(dest, 'w', encoding='utf-8') as f:
            json.dump(tables, f, ensure_ascii=False, indent=1)
        print(f'{len(tables)} tabulek → {dest}')
        return
    for t in tables:
        head = t['rows'][0] if t['rows'] else []
        print(f"#{t['index']:>3} příloha {t['annex']:>2}  řádků {len(t['rows']):>5}  | " + ' | '.join(c[:28] for c in head[:6]))


if __name__ == '__main__':
    main()
