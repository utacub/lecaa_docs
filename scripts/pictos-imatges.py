#!/usr/bin/env python3
"""Makes the pictogram pack's images: every ARASAAC PNG reduced to SIZE px with 256 colours.

Usage: python3 -I scripts/pictos-imatges.py SOURCE_DIR OUT_DIR [SIZE=192]

SOURCE_DIR holds <id>.png as served by https://static.arasaac.org/pictograms/<id>/<id>_300.png
(lecaa-docs/arasaac/imatges/arasaac-png300.tar in the project files). Needs Pillow.
On a sample of 600 pictograms, 192 px and 256 colours is the lightest format that looks like the
original (about 4.8 KB each, 70 MB for the whole collection).
"""
import os, sys
from multiprocessing import Pool
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
size = int(sys.argv[3]) if len(sys.argv) > 3 else 192

def one(name):
    out = os.path.join(dst, name)
    if os.path.exists(out):
        return
    im = Image.open(os.path.join(src, name)).convert('RGBA').resize((size, size), Image.LANCZOS)
    im.quantize(256, method=Image.Quantize.FASTOCTREE).save(out, optimize=True)

if __name__ == '__main__':
    os.makedirs(dst, exist_ok=True)
    with Pool() as pool:
        pool.map(one, sorted(f for f in os.listdir(src) if f.endswith('.png')), chunksize=64)
    print(len(os.listdir(dst)), 'pictograms')
