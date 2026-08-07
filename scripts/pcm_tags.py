"""Resolve PCM subject tags: curated design tags + rule-derived element tags.

    data/pcm-catalog.json      (extracted from the books, by pcm_extract.py)
  + data/pcm-subject-tags.json (CURATED BY LOOKING - see that file's _provenance)
  -> data/pcm-catalog-tags.json

The output is what build_pcm_catalog.py bakes into the page. It is derived, so it is
never hand-edited; the curated half is data/pcm-subject-tags.json.

Element tags are keyed by STEM, not by code: BASS 001 / BASS 002 / BASS 003 all carry
the same subject, so the page ships ~550 stems instead of 3,973 code entries and derives
the stem from the code at runtime with the same rule used here.

Fails loudly on: an untagged design, a tag missing from the vocabulary, a synonym that
expands to a tag nobody uses, an element stem the category table cannot place.
"""
import json
import os
import re
import sys
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CATALOG = os.path.join(ROOT, 'data', 'pcm-catalog.json')
CURATED = os.path.join(ROOT, 'data', 'pcm-subject-tags.json')
OUT = os.path.join(ROOT, 'data', 'pcm-catalog-tags.json')

# The two proof classes' curated descriptions (s21 Tracks B1/B2). They carry subject tags
# from the SAME vocabulary the book plates use, which is the whole point: a proof and a
# plate that both show a rose have to answer the same search with the same chip.
DESC_FILES = ['data/pcm-desc-singles.json', 'data/pcm-desc-companions.json']

STEM_RE = re.compile(r'[\s-]*\d+\s*$')


def stem_of(code):
    """BASS 001 -> BASS.  ORNAMENT 12 -> ORNAMENT.  K OF C 4TH DEGREE -> itself."""
    s = STEM_RE.sub('', str(code)).strip()
    return s or str(code).strip()


def slug(name):
    s = re.sub(r'[^a-z0-9]+', '-', str(name).lower()).strip('-')
    return s


def die(msg):
    print('pcm_tags: ' + msg, file=sys.stderr)
    raise SystemExit(1)


def main():
    data = json.load(open(CATALOG, encoding='utf-8'))
    cur = json.load(open(CURATED, encoding='utf-8'))
    vocab = cur['vocabulary']
    design_src = cur['designTags']
    rules = cur['elementRules']
    cat_tags = rules['categoryTags']
    stem_extras = rules['stemExtras']
    flower_stems = set(rules['flowerStems'])

    # ---- designs -----------------------------------------------------------
    design_tags = {}
    missing = []
    for d in data['designs']:
        raw = design_src.get(d['id'])
        if not raw:
            missing.append(d['id'])
            continue
        tags = [t for t in raw.split() if t]
        for t in tags:
            if t not in vocab:
                die('design %s uses tag %r which is not in vocabulary' % (d['id'], t))
        design_tags[d['id']] = sorted(set(tags))
    if missing:
        die('%d design(s) have no curated tags - somebody has to LOOK at them: %s'
            % (len(missing), ', '.join(missing[:12])))

    # ---- elements ----------------------------------------------------------
    stems = {}
    for e in data['elements']:
        st = stem_of(e['code'])
        stems.setdefault(st, set()).add(e['cat'])
    element_stem_tags = {}
    for st, cats in sorted(stems.items()):
        tags = {slug(st)}
        for c in cats:
            if c not in cat_tags:
                die('element category %r has no entry in elementRules.categoryTags' % c)
            tags.update(cat_tags[c])
        if st in flower_stems:
            tags.add('flower')
        tags.update(stem_extras.get(st, []))
        # A stem slug is itself a searchable word even when it is not a curated
        # vocabulary tag (SHIH-TZU, IWL-SEATTLE) - that is the point of the element
        # book naming everything. Only tags the RULES add are checked against vocabulary.
        for t in tags:
            if t != slug(st) and t not in vocab:
                die('element stem %r maps to tag %r which is not in vocabulary' % (st, t))
        element_stem_tags[st] = sorted(tags)

    # ---- the proof classes' curated tags -----------------------------------
    # These are NOT resolved into the output here: they key on a proof id, not on a design
    # row, and build_pcm_catalog.py reads them straight off the description files. They are
    # read here for exactly two reasons, both of which would otherwise rot silently.
    #
    # First, the vocabulary check. A tag somebody typed into a description file that is not
    # in data/pcm-subject-tags.json's vocabulary is the same fault as a design carrying one,
    # and it has to fail in the same place and just as loudly.
    #
    # Second, `used` below is what decides whether a synonym survives. A family word whose
    # only targets are carried by proofs — no plate depicts it — would be dropped as
    # "expanding to nothing", and the word would then reach none of the cards that DO carry
    # it. So the proofs' tags count as used.
    proof_tags = set()
    for rel in DESC_FILES:
        path = os.path.join(ROOT, *rel.split('/'))
        if not os.path.exists(path):
            continue
        doc = json.load(open(path, encoding='utf-8'))
        for did, entry in (doc.get('designs') or {}).items():
            for t in (entry.get('tags') or []):
                if t not in vocab:
                    die('%s: %s uses tag %r which is not in vocabulary' % (rel, did, t))
                proof_tags.add(t)

    # ---- synonyms ----------------------------------------------------------
    used = set()
    for tags in design_tags.values():
        used.update(tags)
    for tags in element_stem_tags.values():
        used.update(tags)
    used.update(proof_tags)
    syn = {}
    for word, targets in cur['synonyms'].items():
        keep = [t for t in targets if t in used]
        if not keep:
            die('synonym %r expands to nothing anything actually carries: %r' % (word, targets))
        syn[word] = keep

    counts = Counter()
    for tags in design_tags.values():
        counts.update(tags)
    el_counts = Counter()
    for e in data['elements']:
        el_counts.update(element_stem_tags[stem_of(e['code'])])

    out = {
        '_generated_by': 'scripts/pcm_tags.py',
        '_source': ['data/pcm-catalog.json', 'data/pcm-subject-tags.json'],
        '_do_not_edit': 'Derived. Edit data/pcm-subject-tags.json and re-run.',
        'stemRule': '[\\s-]*\\d+\\s*$',
        'vocabulary': {t: vocab[t] for t in sorted(used) if t in vocab},
        'synonyms': {k: syn[k] for k in sorted(syn)},
        'designTags': {k: design_tags[k] for k in sorted(design_tags)},
        'elementStemTags': element_stem_tags,
        'designTagCounts': dict(counts.most_common()),
        'elementTagCounts': dict(el_counts.most_common()),
    }
    with open(OUT, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(out, f, indent=1, ensure_ascii=False)
        f.write('\n')

    print('%s: %d designs tagged (%d distinct tags), %d element stems (%d distinct tags), '
          '%d synonyms, %d KB'
          % (os.path.relpath(OUT, ROOT).replace('\\', '/'), len(design_tags), len(counts),
             len(element_stem_tags), len(el_counts), len(syn),
             os.path.getsize(OUT) // 1024))


if __name__ == '__main__':
    main()
