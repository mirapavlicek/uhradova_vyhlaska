#!/usr/bin/env python3
"""Vygeneruje datové číselníky simulátoru z tabulek návrhu vyhlášky.

Použití:
    python3 tools/extract_data.py Navrh_uhradove_vyhlasky_2027.docx simulator/src/data

Vytvoří:
    kpp.json         příloha č. 9 – koeficienty poměru počtu pojištěnců (okresy, regiony)
    drg.json         příloha č. 10 – CZ-DRG skupiny části A–I s relativní vahou a KC
    centres.json     příloha č. 10 – statusy center vysoce specializované péče
    dental.json      příloha č. 11 – výkony zubního lékařství, protetika a ortodoncie
    oneDay.json      příloha č. 13 – výkony jednodenní péče
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(__file__))
from extract_tables import extract  # noqa: E402

PARTS = 'ABCDEFGHI'


def num(s):
    s = (s or '').replace('\xa0', ' ').strip()
    if s in ('', '-', '–'):
        return None
    return float(s.replace(' ', '').replace(',', '.'))


def czk(s):
    m = re.fullmatch(r'([\d  ]+)\s*Kč', (s or '').strip())
    return int(re.sub(r'\D', '', m.group(1))) if m else None


def by_annex(tables, annex):
    return [t for t in tables if t['annex'] == annex]


def kpp(tables):
    district, region = by_annex(tables, 9)[:2]
    insurers = district['rows'][0][1:]
    def rows(t):
        return [{'name': r[0], 'k': [num(x) or 0 for x in r[1:]]} for r in t['rows'][1:] if r[0] and re.match(r'\d', r[1] or '')]
    return {'insurers': insurers, 'districts': rows(district), 'regions': rows(region)}


def drg(tables):
    parts = [t for t in by_annex(tables, 10) if t['rows'] and len(t['rows'][0]) > 2 and 'Část' in t['rows'][0][2]]
    out = []
    for t in parts:
        part = re.search(r'Část ([A-I])', t['rows'][0][2]).group(1)
        for r in t['rows'][1:]:
            if not r[1] or not re.match(r'\d\d-[A-Z]\d\d-\d\d', r[1]):
                continue
            centres = r[4] if len(r) > 4 and r[4] not in ('-', '') else ''
            out.append([r[1], part, r[2], num(r[3]) or 0, centres, num(r[5]) if len(r) > 5 else None, num(r[6]) if len(r) > 6 else None])
    return out


def centres(tables):
    t = [t for t in by_annex(tables, 10) if t['rows'] and t['rows'][0][0] == 'Název CVSP'][0]
    return [{'name': r[0], 'code': r[1]} for r in t['rows'][1:] if r[1]]


def dental(tables):
    t11 = by_annex(tables, 11)
    services = []
    for r in t11[0]['rows'][1:]:
        if not re.fullmatch(r'\d{5}', r[0]):
            continue
        name = r[1]
        short = re.split(r'(?<=[a-zá-ž)0-9])\s(?=[A-ZÁ-Ž])', name, maxsplit=1)[0]
        services.append({'code': r[0], 'name': short[:160], 'price': czk(r[3]), 'note': None if czk(r[3]) else r[3]})
    products = []
    for t in t11[1:]:
        group = t['rows'][0][0]
        for r in t['rows'][2:]:
            if len(r) >= 5 and re.fullmatch(r'\d{7}', r[1]):
                products.append({'code': r[1], 'item': r[0], 'name': r[2], 'symbol': r[3], 'price': czk(r[4]), 'group': group})
    return {'services': services, 'products': products}


def one_day(tables):
    t = by_annex(tables, 13)[0]
    return [{'odb': r[0], 'code': r[1], 'drg': r[2], 'name': r[4], 'price': czk(r[5])} for r in t['rows'][1:] if czk(r[5])]


def main():
    src, dest = sys.argv[1], sys.argv[2]
    tables = extract(src)
    os.makedirs(dest, exist_ok=True)
    outputs = {
        'kpp.json': kpp(tables),
        'drg.json': drg(tables),
        'centres.json': centres(tables),
        'dental.json': dental(tables),
        'oneDay.json': one_day(tables),
    }
    for name, data in outputs.items():
        with open(os.path.join(dest, name), 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
        size = len(data) if isinstance(data, list) else {k: len(v) for k, v in data.items()}
        print(f'{name}: {size}')


if __name__ == '__main__':
    main()
