#!/usr/bin/env python3
"""Joins the pack's images in a few large files, so that "save them all" in the settings makes
about ten downloads instead of one per pictogram (13,890).

Usage: python3 -I scripts/pictos-paquets.py PICTOS_DIR [MAX_MB=8]

Reads PICTOS_DIR/img/<id>.png, only for the pictograms that the word indexes (PICTOS_DIR/index-*.js,
one per language) can show, and writes PICTOS_DIR/paquets/<n>.bin (the PNG files one after the
other) and PICTOS_DIR/paquets/index.json: {"v": 1, "files": ["0.bin", …], "parts": [[id, offset,
length, …] per file]}. The app splits them again into one image per pictogram on the device.
"""
import json, os, sys

pictos = sys.argv[1]
max_bytes = int(float(sys.argv[2] if len(sys.argv) > 2 else 8) * 1_000_000)
img, out = os.path.join(pictos, 'img'), os.path.join(pictos, 'paquets')
os.makedirs(out, exist_ok=True)
shown = set()
for name in sorted(os.listdir(pictos)):
    if name.startswith('index-') and name.endswith('.js'):
        src = open(os.path.join(pictos, name), encoding='utf-8').read()
        kw = json.loads(src[src.index('=') + 1:].rstrip().rstrip(';'))['kw']
        shown |= {flat[i] for flat in kw.values() for i in range(0, len(flat), 2)}
ids = sorted(int(f[:-4]) for f in os.listdir(img) if f.endswith('.png') and int(f[:-4]) in shown)
files, parts, buf, part = [], [], bytearray(), []

def flush():
    name = f'{len(files)}.bin'
    open(os.path.join(out, name), 'wb').write(buf)
    files.append(name); parts.append(part[:])

for pid in ids:
    data = open(os.path.join(img, f'{pid}.png'), 'rb').read()
    if buf and len(buf) + len(data) > max_bytes:
        flush(); buf.clear(); part.clear()
    part += [pid, len(buf), len(data)]
    buf += data
if buf:
    flush()
json.dump({'v': 1, 'files': files, 'parts': parts}, open(os.path.join(out, 'index.json'), 'w'), separators=(',', ':'))
print(f'{len(ids)} pictograms in {len(files)} files')
