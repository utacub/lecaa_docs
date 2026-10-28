#!/usr/bin/env python3
"""Builds the Catalan word -> ARASAAC pictogram index of the pictogram pack (prototype).

Usage: python3 -I scripts/pictos-index.py CATALOG_CA.json DICCIONARI.txt OUT_DIR

CATALOG_CA.json: https://api.arasaac.org/api/pictograms/all/ca
DICCIONARI.txt:  https://github.com/Softcatala/catalan-dict-tools (resultats/lt/diccionari.txt),
                 one "form lemma tag" per line (GPL-2.0-or-later / LGPL-2.1-or-later).
Writes OUT_DIR/index-ca.js, loaded by the app with a <script> tag so that it also works when
the app is opened as a file (file://), where fetch() is not allowed.
"""
import json, re, sys, unicodedata
from collections import defaultdict

catalog_path, dict_path, out_dir = sys.argv[1:4]

def norm(s):
    return unicodedata.normalize('NFC', s).replace('’', "'").strip().lower()

# ---- keyword -> pictograms, best first ----
cands = defaultdict(list)  # keyword -> [(rank, id, type)]
for p in json.load(open(catalog_path, encoding='utf-8')):
    if p.get('sex') or p.get('violence'):
        continue
    for i, k in enumerate(p.get('keywords', [])):
        t = k.get('type') or 0
        for w in (k.get('keyword'), k.get('plural')):
            w = norm(w or '')
            if w:
                cands[w].append(((0 if i == 0 else 1), p['_id'], t))
kw = {}
for w, lst in cands.items():
    seen, flat = set(), []
    for _, pid, t in sorted(lst):  # the picto's main keyword first, then the oldest picto
        if pid not in seen:
            seen.add(pid); flat += [pid, t]
    kw[w] = flat

# Words of the family that children write in another way than ARASAAC's keyword (ARASAAC's "papa"
# is the Pope, and "mama" would be read as a form of "mamar"): their pictograms come first.
ALIASES = {'papa': 'pare', 'papà': 'pare', 'mama': 'mare', 'mamà': 'mare'}
for alias, target in ALIASES.items():
    kw[alias] = kw[target] + [x for i, x in enumerate(kw.get(alias, [])) if kw.get(alias)[i - i % 2] not in kw[target][::2]]

# ---- Softcatalà: inflected form -> lemma, for lemmas that have a pictogram ----
POS_ORDER = 'NVAR'
def pos(tag):
    if tag.startswith('NC') or tag.startswith('NP'): return 'N'
    if tag.startswith('V'): return 'V'
    if tag.startswith('A'): return 'A'
    if tag.startswith('R'): return 'R'
    return ''
analyses = defaultdict(set)
for line in open(dict_path, encoding='utf-8'):
    parts = line.split()
    if len(parts) != 3:
        continue
    form, lemma, tag = norm(parts[0]), norm(parts[1]), parts[2]
    p = pos(tag)
    if p and lemma in kw and form != lemma:
        analyses[form].add((POS_ORDER.index(p), lemma, p))
lem = {}
for form, a in analyses.items():
    if form in kw:
        continue
    out = []
    for _, l, p in sorted(a):
        if not any(x.startswith(l + '|') for x in out):
            out.append(f'{l}|{p}')
    lem[form] = ';'.join(out)

# Function words that get no pictogram when only content words are shown: articles,
# prepositions, conjunctions and weak pronouns. Their pictograms rarely help reading a sentence.
stop = sorted({
    'el', 'la', 'els', 'les', 'lo', 'los', 'un', 'una', 'uns', 'unes', 'en', 'na',
    'de', 'del', 'dels', 'a', 'al', 'als', 'amb', 'per', 'pel', 'pels', 'cap', 'fins', 'entre', 'des',
    'i', 'o', 'ni', 'que', 'però', 'si', 'perquè', 'doncs',
    'em', 'et', 'es', 'se', 'ens', 'us', 'vos', 'li', 'hi', 'ho', 'me', 'te', 'ne',
    "l'", "d'", "s'", "n'", "m'", "t'",
})

data = {'v': 1, 'kw': kw, 'lem': lem, 'stop': stop}
js = ('/* LECAA Docs: Catalan index of ARASAAC pictograms.\n'
      ' * Pictograms: Sergio Palao. Origin: ARASAAC (https://arasaac.org). Licence: CC BY-NC-SA 4.0.\n'
      ' * Owner: Government of Aragon (Spain).\n'
      ' * Inflected forms: Softcatalà, catalan-dict-tools (GPL-2.0-or-later / LGPL-2.1-or-later). */\n'
      'window.LECAA_PICTOS_CA=' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
open(f'{out_dir}/index-ca.js', 'w', encoding='utf-8').write(js)
print(f'keywords {len(kw)}, forms {len(lem)}, function words {len(stop)}, {len(js.encode()) / 1e6:.1f} MB')
