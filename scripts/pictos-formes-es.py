#!/usr/bin/env python3
"""Spanish inflected forms for the pictogram index: one "form lemma tag" per line.

Usage: python3 -I scripts/pictos-formes-es.py SPANISH_DICT_TOOLS_DIR OUT.txt

SPANISH_DICT_TOOLS_DIR: a copy of https://github.com/jaumeortola/spanish-dict-tools (Jaume
Ortolà, the Spanish dictionary of LanguageTool; LGPL-2.1). Only its data files are read
(diccionari-arrel/): nouns and adjectives with their feminine and irregular plurals, verbs with
their conjugation model, and the word classes listed form by form. This script expands them in
the same way as the project's own Perl tools (fdic-to-lt), leaving out verbs with enclitic
pronouns (dámelo), which a pictogram does not need. Tags are EAGLES, as in LanguageTool.
"""
import os, re, sys

src, out_path = sys.argv[1:3]
root = os.path.join(src, 'diccionari-arrel')
out = set()

def plural(w):
    """Regular Spanish plural (Flexio::plural of spanish-dict-tools)."""
    for a, b in (('án', 'anes'), ('én', 'enes'), ('ín', 'ines'), ('ón', 'ones'), ('ún', 'unes'),
                 ('in', 'ines'), ('an', 'anes'), ('on', 'ones'),
                 ('ás', 'ases'), ('és', 'eses'), ('ís', 'ises'), ('ós', 'oses'), ('ús', 'uses'),
                 ('is', 'ises'), ('y', 'yes'), ('j', 'jes')):
        if w.endswith(a):
            return w[:-len(a)] + b
    if w[-1:] in 'lrdf':
        return w + 'es'
    if w.endswith('z'):
        return w[:-1] + 'ces'
    if w[-1:] in 'aeiouéáóúcmktpb':
        return w + 's'
    return w

def feminine(masc, second):
    if not second.startswith('-'):
        return second
    end = second[1:]
    return re.sub('[eoa]$', '', masc) + end if end == 'a' else None

ENTRY = re.compile(r'^([^#=\s][^=\s]*)(?: ([^=\s\[]+))?\s*((?:\[[^\]]*\]\s*)*)=categories:\s*([A-Z]+);')
def entries(name):
    for line in open(os.path.join(root, name), encoding='utf-8'):
        m = ENTRY.match(line)
        if m:
            yield m.group(1), m.group(2), m.group(3) or '', m.group(4)

def plurals(word, extra):
    m = re.search(r'\[pl\. ([^\]]+)\]', extra)
    return [p.strip() for p in m.group(1).split(' o ')] if m else [plural(word)]

# Nouns: masculine and feminine, singular and plural; the lemma is the first (masculine) form.
for lemma, second, extra, cat in entries('noms-fdic.txt'):
    fem = feminine(lemma, second) if second else None
    g = 'F' if cat.startswith('F') else 'M'
    if 'P' in cat[1:]:  # only plural (gafas): the plural is the lemma
        out.add((lemma, lemma, f'NC{g}P000'))
        continue
    out.add((lemma, lemma, f'NC{g}S000'))
    if 'S' not in cat[1:]:
        for p in ([lemma] if 'I' in cat else plurals(lemma, extra)):
            out.add((p, lemma, f'NC{g}P000'))
    if fem:
        out.add((fem, lemma, 'NCFS000'))
        if 'S' not in cat[1:]:
            out.add((fem if 'I' in cat else plural(fem), lemma, 'NCFP000'))

# Adjectives: the four forms, and the superlative (altísimo) with the lemma of the adjective.
for lemma, second, extra, cat in entries('adjectius-fdic.txt'):
    fem = (feminine(lemma, second) if second else None) or lemma
    inv = 'I' in cat
    forms = [(lemma, 'MS'), (fem, 'FS')]
    if 'S' not in cat[1:]:
        mp = [lemma] if inv else plurals(lemma, extra)
        forms += [(p, 'MP') for p in mp] + [(lemma if inv else plural(fem), 'FP')]
    for f, gn in forms:
        out.add((f, lemma, f'AQ0{gn}0'))
    for sup in re.findall(r'\[sup\. ([^\]]+)\]', extra):
        for s in sup.split(' o '):
            s = s.strip()
            if s.endswith('o'):
                base = s[:-1]
                for f, gn in ((s, 'MS'), (base + 'a', 'FS'), (base + 'os', 'MP'), (base + 'as', 'FP')):
                    out.add((f, lemma, f'AQS{gn}0'))

# Verbs: each model lists, per form, the ending to take off the infinitive and the one to add.
models = {}
VERB = re.compile(r'^([^#].+?)=categories:\s*V[^;]*;\s*model:\s*([^;]+);')
for line in open(os.path.join(root, 'verbs-fdic.txt'), encoding='utf-8'):
    m = VERB.match(line)
    if not m:
        continue
    infinitive, model = m.group(1).strip(), m.group(2).strip()
    clean = re.sub(r'_\d+$', '', infinitive)
    if model not in models:
        rules = []
        path = os.path.join(root, 'models-verbals', model + '.model')
        if os.path.exists(path):
            for row in open(path, encoding='utf-8'):
                if row.startswith('#') or '#' not in row:
                    continue
                f = row.split('#', 1)[0].split()
                if len(f) == 4:
                    rules.append((f[0], f[1], f[3]))
        models[model] = rules
    for take, add, tag in models[model]:
        if not clean.endswith(take):
            continue
        form = clean[:-len(take)] + ('' if add == '0' else add)
        out.add((form, clean, tag))

# Word classes listed form by form: adverbs, determiners, pronouns, prepositions...
for name in sorted(os.listdir(root)):
    if name.endswith('-lt.txt') and name != 'nomspropis-lt.txt':
        for line in open(os.path.join(root, name), encoding='utf-8'):
            f = line.split('#', 1)[0].split()
            if len(f) == 3:
                out.add(tuple(f))

with open(out_path, 'w', encoding='utf-8') as o:
    for row in sorted(out):
        o.write(' '.join(row) + '\n')
print(f'{len(out)} forms, {len({r[1] for r in out})} lemmas, {len(models)} verb models')
