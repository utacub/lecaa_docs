#!/usr/bin/env python3
"""Inflected forms of the ARASAAC keywords in English and Basque, for the pictogram index: one
"form lemma tag" per line, as the other dictionaries (EAGLES tags: N noun, V verb, A adjective).

Usage: python3 -I scripts/pictos-formes.py en|eu CATALOG.json OUT.txt

CATALOG.json: https://api.arasaac.org/api/pictograms/all/<lang>

There is no free dictionary of English or Basque forms in the same format with a licence as open
as the others', so the forms are made here with the regular rules of each language, starting from
ARASAAC's own keywords (nouns already come with their plural). A rule can make a form that does
not exist ("singed" for "sing"); nobody writes it, so it does no harm. Only forms that are not
keywords themselves are used for a lemma's pictogram (pictos-index.py).

English: third person (eats), past and participle (cooked, ate, eaten), -ing (eating), with the
common irregular verbs, and comparative and superlative of adjectives (bigger, biggest).
Basque: ARASAAC's nouns and adjectives carry the article (etxea, handia): the bare word (etxe),
the singular and plural cases (etxeak, etxeari, etxearen, etxearekin, etxean, etxera, etxetik,
etxeko, etxeetan...), and the degrees of adjectives (handiago, handiena, handiegi). Verbs are
participles (jan, ikusi, jolastu): imperfective (jaten, ikusten, jolasten), future (jango,
ikusiko), verbal noun (jatea, jateko, jatera) and the participle with -ta/-da.
"""
import json, re, sys

lang, catalog_path, out_path = sys.argv[1:4]
out = set()
WORD = re.compile(r"^[a-zñçü' -]+$")

def keywords():
    for p in json.load(open(catalog_path, encoding='utf-8')):
        for k in p.get('keywords', []):
            w = (k.get('keyword') or '').strip().lower()
            if w and WORD.match(w):
                yield w, k.get('type')

# ---------------------------------------------------------------- English
IRREGULAR = {  # verb: (past, past participle)
    'arise': ('arose', 'arisen'), 'awake': ('awoke', 'awoken'), 'be': ('was were', 'been'), 'bear': ('bore', 'born borne'),
    'beat': ('beat', 'beaten'), 'become': ('became', 'become'), 'begin': ('began', 'begun'), 'bend': ('bent', 'bent'),
    'bet': ('bet', 'bet'), 'bite': ('bit', 'bitten'), 'bleed': ('bled', 'bled'), 'blow': ('blew', 'blown'),
    'break': ('broke', 'broken'), 'breed': ('bred', 'bred'), 'bring': ('brought', 'brought'), 'build': ('built', 'built'),
    'burn': ('burnt burned', 'burnt burned'), 'burst': ('burst', 'burst'), 'buy': ('bought', 'bought'), 'catch': ('caught', 'caught'),
    'choose': ('chose', 'chosen'), 'come': ('came', 'come'), 'cost': ('cost', 'cost'), 'creep': ('crept', 'crept'),
    'cut': ('cut', 'cut'), 'deal': ('dealt', 'dealt'), 'dig': ('dug', 'dug'), 'do': ('did', 'done'), 'draw': ('drew', 'drawn'),
    'dream': ('dreamt dreamed', 'dreamt dreamed'), 'drink': ('drank', 'drunk'), 'drive': ('drove', 'driven'), 'eat': ('ate', 'eaten'),
    'fall': ('fell', 'fallen'), 'feed': ('fed', 'fed'), 'feel': ('felt', 'felt'), 'fight': ('fought', 'fought'), 'find': ('found', 'found'),
    'fly': ('flew', 'flown'), 'forbid': ('forbade', 'forbidden'), 'forget': ('forgot', 'forgotten'), 'forgive': ('forgave', 'forgiven'),
    'freeze': ('froze', 'frozen'), 'get': ('got', 'got gotten'), 'give': ('gave', 'given'), 'go': ('went', 'gone'),
    'grind': ('ground', 'ground'), 'grow': ('grew', 'grown'), 'hang': ('hung hanged', 'hung hanged'), 'have': ('had', 'had'),
    'hear': ('heard', 'heard'), 'hide': ('hid', 'hidden'), 'hit': ('hit', 'hit'), 'hold': ('held', 'held'), 'hurt': ('hurt', 'hurt'),
    'keep': ('kept', 'kept'), 'kneel': ('knelt', 'knelt'), 'knit': ('knitted knit', 'knitted knit'), 'know': ('knew', 'known'),
    'lay': ('laid', 'laid'), 'lead': ('led', 'led'), 'lean': ('leant leaned', 'leant leaned'), 'leap': ('leapt leaped', 'leapt leaped'),
    'learn': ('learnt learned', 'learnt learned'), 'leave': ('left', 'left'), 'lend': ('lent', 'lent'), 'let': ('let', 'let'),
    'lie': ('lay lied', 'lain lied'), 'light': ('lit lighted', 'lit lighted'), 'lose': ('lost', 'lost'), 'make': ('made', 'made'),
    'mean': ('meant', 'meant'), 'meet': ('met', 'met'), 'pay': ('paid', 'paid'), 'put': ('put', 'put'), 'quit': ('quit', 'quit'),
    'read': ('read', 'read'), 'ride': ('rode', 'ridden'), 'ring': ('rang', 'rung'), 'rise': ('rose', 'risen'), 'run': ('ran', 'run'),
    'say': ('said', 'said'), 'see': ('saw', 'seen'), 'seek': ('sought', 'sought'), 'sell': ('sold', 'sold'), 'send': ('sent', 'sent'),
    'set': ('set', 'set'), 'sew': ('sewed', 'sewn sewed'), 'shake': ('shook', 'shaken'), 'shine': ('shone', 'shone'),
    'shoot': ('shot', 'shot'), 'show': ('showed', 'shown showed'), 'shrink': ('shrank', 'shrunk'), 'shut': ('shut', 'shut'),
    'sing': ('sang', 'sung'), 'sink': ('sank', 'sunk'), 'sit': ('sat', 'sat'), 'sleep': ('slept', 'slept'), 'slide': ('slid', 'slid'),
    'smell': ('smelt smelled', 'smelt smelled'), 'speak': ('spoke', 'spoken'), 'spell': ('spelt spelled', 'spelt spelled'),
    'spend': ('spent', 'spent'), 'spill': ('spilt spilled', 'spilt spilled'), 'spin': ('spun', 'spun'), 'spit': ('spat', 'spat'),
    'split': ('split', 'split'), 'spread': ('spread', 'spread'), 'spring': ('sprang', 'sprung'), 'stand': ('stood', 'stood'),
    'steal': ('stole', 'stolen'), 'stick': ('stuck', 'stuck'), 'sting': ('stung', 'stung'), 'stink': ('stank', 'stunk'),
    'strike': ('struck', 'struck'), 'swear': ('swore', 'sworn'), 'sweep': ('swept', 'swept'), 'swim': ('swam', 'swum'),
    'swing': ('swung', 'swung'), 'take': ('took', 'taken'), 'teach': ('taught', 'taught'), 'tear': ('tore', 'torn'),
    'tell': ('told', 'told'), 'think': ('thought', 'thought'), 'throw': ('threw', 'thrown'), 'understand': ('understood', 'understood'),
    'wake': ('woke', 'woken'), 'wear': ('wore', 'worn'), 'weep': ('wept', 'wept'), 'win': ('won', 'won'), 'wind': ('wound', 'wound'),
    'write': ('wrote', 'written'),
}
PRESENT = {'be': 'am is are', 'have': 'has', 'do': 'does', 'go': 'goes'}
ADJ_IRREGULAR = {'good': 'better best', 'bad': 'worse worst', 'far': 'further farther furthest farthest',
                 'little': 'less least', 'many': 'more most', 'much': 'more most', 'well': 'better best'}
VOWEL = 'aeiou'

def cvc(w):  # stop, run, big: the last consonant may be doubled
    return len(w) >= 3 and w[-1] not in VOWEL + 'wxy' and w[-2] in VOWEL and w[-3] not in VOWEL

def en_suffix(w, suf):  # suf starts with a vowel: -ed, -ing, -er, -est
    if suf == 'ing':
        if w.endswith('ie'):
            return {w[:-2] + 'ying'}            # lie -> lying
        if w.endswith('e') and not w.endswith(('ee', 'ye', 'oe')):
            return {w[:-1] + 'ing'}             # make -> making
    else:
        if w.endswith('e'):
            return {w + suf[1:]}                # bake -> baked, nice -> nicer
        if w.endswith('y') and len(w) > 2 and w[-2] not in VOWEL:
            return {w[:-1] + 'i' + suf}         # cry -> cried, happy -> happier
    forms = {w + suf}
    if cvc(w):
        forms.add(w + w[-1] + suf)              # stop -> stopped (and the harmless "visitted")
    return forms

def en_s(w):
    if w.endswith(('s', 'x', 'z', 'ch', 'sh', 'o')):
        return w + 'es'
    if w.endswith('y') and len(w) > 2 and w[-2] not in VOWEL:
        return w[:-1] + 'ies'
    return w + 's'

def english(w, t):
    words = w.split(' ')
    if t == 3:  # verb, or a verb phrase: "brush teeth"
        v, rest = words[0], ' '.join(words[1:])
        if not v.isalpha():
            return
        add = lambda f, tag: out.add(((f + ' ' + rest).strip(), w, tag))
        for f in (PRESENT.get(v) or en_s(v)).split(' '):
            add(f, 'VMIP3S0')
        for f in en_suffix(v, 'ing'):
            add(f, 'VMG0000')
        if v in IRREGULAR:
            past, part = IRREGULAR[v]
            for f in past.split(' '):
                add(f, 'VMIS3S0')
            for f in part.split(' '):
                add(f, 'VMP00SM')
        else:
            for f in en_suffix(v, 'ed'):
                add(f, 'VMIS3S0')
    elif t == 4 and len(words) == 1 and w.isalpha():  # adjective
        if w in ADJ_IRREGULAR:
            for f in ADJ_IRREGULAR[w].split(' '):
                out.add((f, w, 'AQ0CS0'))
        elif len(w) <= 8:  # long adjectives take "more" and "most"
            for suf in ('er', 'est'):
                for f in en_suffix(w, suf):
                    out.add((f, w, 'AQ0CS0'))

# ---------------------------------------------------------------- Basque
def attach(b, suf):
    if b.endswith('a') and suf.startswith('a'):
        return b + suf[1:]          # alaba + -ari = alabari
    if b.endswith('a') and suf.startswith('e'):
        return b[:-1] + suf         # alaba + -ek = alabek
    return b + suf

# The most frequent cases only, so that the index stays light.
SINGULAR = ['a', 'ak', 'ari', 'aren', 'arekin']
PLURAL = ['ek', 'ei', 'en', 'ekin', 'etan', 'etara', 'etatik', 'etako']
AFTER_VOWEL = ['n', 'ra', 'tik', 'ko', 'z']        # etxean, etxera, etxetik, etxeko, oinez
AFTER_CONSONANT = ['ean', 'era', 'etik', 'eko', 'ez']  # lurrean, lurrera, lurretik, lurreko, trenez
DEGREES = ['ago', 'ena', 'egi']                     # handiago, handiena, handiegi

def basque_nominal(w, t):
    if not w.isalpha():             # one word only: expressions keep their keyword form
        return
    # etxea -> etxe (the article). A word whose own last letter is -a (alaba) gets the same forms
    # from "alab-", except the places, which come from the whole word (alaban, alabara...).
    b = w[:-1] if w.endswith('a') and len(w) > 2 else w
    forms = {b} | {attach(b, s) for s in SINGULAR + PLURAL}
    forms |= {b + s for s in (AFTER_VOWEL if b[-1] in VOWEL else AFTER_CONSONANT)}
    if w.endswith('a'):
        forms |= {w + s for s in ('n', 'ra', 'tik', 'ko')}
    if t == 4:
        forms |= {attach(b, s) for s in DEGREES}
    for f in forms:
        out.add((f, w, 'AQ0CS0' if t == 4 else 'NCCS000'))

SIBILANT = ('s', 'z', 'x', 'ts', 'tz', 'tx')
def soften(r):  # idatz- + -ten = idazten, utz- = uzten, itx- = ixten
    for a, b in (('tz', 'z'), ('ts', 's'), ('tx', 'x')):
        if r.endswith(a):
            return r[:-2] + b
    return r

def basque_verb(w):
    words = w.split(' ')
    p, head = words[-1], ' '.join(words[:-1])
    if not p.isalpha() or len(p) < 2:
        return
    stems = set()  # imperfective stems, without -en: jate, ikuste, jolaste, etortze
    radical = None
    if p.endswith(('tu', 'du')):
        radical = p[:-2]
        stems.add((soften(radical) + 'te') if p.endswith('tu') and radical.endswith(SIBILANT) else radical + 'tze')
    elif p.endswith('n'):
        stems.add(p[:-1] + 'te')            # jan -> jaten, egin -> egiten
    elif p.endswith('i') and len(p) > 3:
        r = p[:-1]
        stems.add(soften(r) + 'te' if r.endswith(SIBILANT) else (r[:-1] if r.endswith('rr') else r) + 'tze')
        stems.add(p + 'tze')                # ireki -> irekitzen
    else:
        stems.add(p + 'tze')                # igo -> igotzen, hil -> hiltzen
    forms = {p + ('go' if p.endswith('n') else 'ko'), p + ('da' if p.endswith(('n', 'l')) else 'ta')}
    for s in stems:
        forms |= {s + e for e in ('n', 'a', 'ko', 'ra', 'an', 'rik')}  # jaten, jatea, jateko, jatera, jatean, jaterik
    if radical:
        forms.add(radical)                  # kanta (dezagun)
    for f in forms:
        out.add(((head + ' ' + f).strip(), w, 'VMN0000'))

# ----------------------------------------------------------------
for w, t in keywords():
    if lang == 'en':
        english(w, t)
    elif lang == 'eu':
        if t == 3:
            basque_verb(w)
        elif t in (2, 4, None):
            basque_nominal(w, t)
out = {r for r in out if r[0] and r[0] != r[1]}
with open(out_path, 'w', encoding='utf-8') as o:
    for f, l, tag in sorted(out):
        o.write(f'{f.replace(" ", "_")} {l.replace(" ", "_")} {tag}\n')
print(f'{len(out)} forms of {len({r[1] for r in out})} keywords')
