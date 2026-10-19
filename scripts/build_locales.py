"""Read the approved Excel copy table and build the browser's local dictionaries.
Usage: python scripts/build_locales.py [path/to/copy.xlsx]
Uses only the Python standard library. Does not modify the workbook.
"""
import json
import re
import sys
from pathlib import Path
from zipfile import ZipFile
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'outputs/localization-20261019/Hit Clicker 中英文文案（技能说明扩写）.xlsx'
NS = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}

def read_copy(source):
    result = {'zh-CN': {}, 'en': {}}
    with ZipFile(source) as z:
        strings = []
        if 'xl/sharedStrings.xml' in z.namelist():
            strings = [''.join(t.itertext()) for t in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('s:si', NS)]
        for sheet in ('sheet1.xml', 'sheet2.xml'):
            for row in ET.fromstring(z.read('xl/worksheets/' + sheet)).findall('.//s:sheetData/s:row', NS):
                cells = {}
                for c in row.findall('s:c', NS):
                    col = re.match('[A-Z]+', c.attrib['r'])[0]
                    v = c.find('s:v', NS)
                    value = v.text if v is not None else ''
                    if c.attrib.get('t') == 's': value = strings[int(value)]
                    elif c.attrib.get('t') == 'inlineStr': value = ''.join(c.find('s:is', NS).itertext())
                    cells[col] = value or ''
                key = cells.get('I', '')
                if not re.fullmatch(r'[a-z][a-z0-9_.-]+', key): continue
                if key in result['en']: raise ValueError('Duplicate key: ' + key)
                allowed = set(re.findall(r'\{(\w+)\}', cells.get('G', '')))
                for lang, col in [('zh-CN', 'B'), ('en', 'C')]:
                    if not cells.get(col): raise ValueError('Missing copy: ' + key + ' ' + lang)
                    unknown = set(re.findall(r'\{(\w+)\}', cells[col])) - allowed
                    if unknown: raise ValueError(f'Unknown variables in {key} ({lang}): {sorted(unknown)}')
                    result[lang][key] = cells[col]
    return result

if __name__ == '__main__':
    data = read_copy(SOURCE)
    out = ROOT / 'locales'
    out.mkdir(exist_ok=True)
    for lang, values in data.items():
        (out / (lang + '.json')).write_text(json.dumps(values, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    # A script bundle also works when index.html is opened directly via file://.
    serialized = json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c')
    (out / 'copy.js').write_text('// Generated from the approved Excel workbook.\nwindow.HitCopy=' + serialized + ';\n', encoding='utf-8')
    print(f'Built {len(data["en"])} entries per language from {SOURCE.name}')
