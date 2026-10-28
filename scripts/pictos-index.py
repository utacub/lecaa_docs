#!/usr/bin/env python3
"""Builds the word -> ARASAAC pictogram index of the pictogram pack, for one language (prototype).

Usage: python3 -I scripts/pictos-index.py LANG CATALOG.json FORMS.txt OUT_DIR [IMG_DIR]

LANG:         ca or es.
CATALOG.json: https://api.arasaac.org/api/pictograms/all/<LANG>
FORMS.txt:    one "form lemma tag" per line (EAGLES tags). Catalan: resultats/lt/diccionari.txt of
              https://github.com/Softcatala/catalan-dict-tools (GPL-2.0-or-later / LGPL-2.1-or-later).
              Spanish: made by scripts/pictos-formes-es.py from
              https://github.com/jaumeortola/spanish-dict-tools (LGPL-2.1).
IMG_DIR:      when given, pictograms without an image there are left out (ARASAAC lists a
              few whose image does not exist).
Writes OUT_DIR/index-<LANG>.js, loaded by the app with a <script> tag so that it also works when
the app is opened as a file (file://), where fetch() is not allowed.
"""
import json, os, re, sys, unicodedata
from collections import defaultdict

lang, catalog_path, dict_path, out_dir = sys.argv[1:5]
img_dir = sys.argv[5] if len(sys.argv) > 5 else None
with_image = {int(f[:-4]) for f in os.listdir(img_dir) if f.endswith('.png')} if img_dir else None

def norm(s):
    return unicodedata.normalize('NFC', s).replace('’', "'").strip().lower()

# ---- keyword -> pictograms, best first ----
cands = defaultdict(list)  # keyword -> [(rank, id, type)]
for p in json.load(open(catalog_path, encoding='utf-8')):
    if p.get('sex') or p.get('violence') or (with_image is not None and p['_id'] not in with_image):
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
ALIASES = {
    'ca': {'papa': 'pare', 'papà': 'pare', 'mama': 'mare', 'mamà': 'mare'},
    'es': {'papa': 'papá', 'mama': 'mamá'},
}[lang]
for alias, target in ALIASES.items():
    kw[alias] = kw[target] + [x for i, x in enumerate(kw.get(alias, [])) if kw.get(alias)[i - i % 2] not in kw[target][::2]]

# ---- inflected form -> lemma, for lemmas that have a pictogram ----
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
# A form that is a keyword itself keeps its own pictograms first; its lemmas ("como" -> "comer")
# only add choices.
lem = {}
for form, a in analyses.items():
    out = []
    for _, l, p in sorted(a):
        if not any(x.startswith(l + '|') for x in out):
            out.append(f'{l}|{p}')
    lem[form] = ';'.join(out)

# Function words that get no pictogram when only content words are shown: articles,
# prepositions, conjunctions and weak pronouns. Their pictograms rarely help reading a sentence.
stop = sorted({
    'ca': {
        'el', 'la', 'els', 'les', 'lo', 'los', 'un', 'una', 'uns', 'unes', 'en', 'na',
        'de', 'del', 'dels', 'a', 'al', 'als', 'amb', 'per', 'pel', 'pels', 'cap', 'fins', 'entre', 'des',
        'i', 'o', 'ni', 'que', 'però', 'si', 'perquè', 'doncs',
        'em', 'et', 'es', 'se', 'ens', 'us', 'vos', 'li', 'hi', 'ho', 'me', 'te', 'ne',
        "l'", "d'", "s'", "n'", "m'", "t'",
    },
    'es': {
        'el', 'la', 'los', 'las', 'lo', 'un', 'una', 'unos', 'unas', 'al', 'del',
        'a', 'ante', 'bajo', 'con', 'contra', 'de', 'desde', 'en', 'entre', 'hacia', 'hasta', 'para',
        'por', 'según', 'sin', 'sobre', 'tras',
        'y', 'e', 'o', 'u', 'ni', 'que', 'pero', 'si', 'porque', 'pues', 'aunque', 'sino',
        'me', 'te', 'se', 'nos', 'os', 'le', 'les',
    },
}[lang])

NAMES = {'ca': 'Catalan', 'es': 'Spanish'}
FORMS = {
    'ca': 'Softcatalà, catalan-dict-tools (GPL-2.0-or-later / LGPL-2.1-or-later)',
    'es': 'Jaume Ortolà, spanish-dict-tools (LGPL-2.1)',
}
data = {'v': 1, 'kw': kw, 'lem': lem, 'stop': stop}
js = (f'/* LECAA Docs: {NAMES[lang]} index of ARASAAC pictograms.\n'
      ' * Pictograms: Sergio Palao. Origin: ARASAAC (https://arasaac.org). Licence: CC BY-NC-SA 4.0.\n'
      ' * Owner: Government of Aragon (Spain).\n'
      f' * Inflected forms: {FORMS[lang]}. */\n'
      f'window.LECAA_PICTOS_{lang.upper()}=' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
open(f'{out_dir}/index-{lang}.js', 'w', encoding='utf-8').write(js)
print(f'keywords {len(kw)}, forms {len(lem)}, function words {len(stop)}, {len(js.encode()) / 1e6:.1f} MB')
