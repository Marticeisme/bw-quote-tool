# -*- coding: utf-8 -*-
"""
Lossless re-export of the 699 PCM design plates, for AI super-resolution.

    python scripts/pcm_plate_export.py

Writes `scratch/pcm-plates-raw/<book>/<num>.png` — one PNG per plate, rendered from the
design book at the plate's NATIVE embedded resolution (347x199 px, i.e. 72 dpi over the
placement rect). That is all the detail that exists: each plate is drawn as a 347x198 RGB
granite texture with a 347x199 grey artwork layer composited on top, so rendering the page
rect above 72 dpi manufactures nothing.

WHY NOT START FROM THE SHIPPED WEBP. `pcm-design-images/**.webp` is quality-64 lossy at
358x204. Feeding that to a super-resolution model would upscale the compression artifacts
along with the artwork. This script goes back to the books.

WHY NOT `doc.extract_image()`. The two embedded images per plate are separate layers —
the RGB one alone is bare granite with no lettering at all. Only the composited render is
the plate. Rendering the placement rect at 72 dpi reproduces it exactly, losslessly.

The plate-locating logic (page ranges, `design_images` bbox filter, `match_label_to_image`)
is COPIED from `scripts/pcm_extract.py` rather than imported: that file is the catalog
build and is owned elsewhere; this script must not be able to change it. If the two ever
disagree the assertion at the bottom of this file fails loudly — it checks that the
exported (book, num) set is exactly the set of plates already on disk under
`pcm-design-images/`.
"""
import os, re, sys

sys.stdout.reconfigure(encoding='utf-8')

import fitz
from PIL import Image

SRC = os.environ.get('PCM_SRC', r'D:\Cemetery Photos Misc\Markers')
BOOK_2020 = 'PCM2020DesignBook_web.pdf'
BOOK_2011 = 'comp-PCM_DesignBook2011.pdf'

DESIGN_DIR = 'pcm-design-images'
RAW_DIR = os.path.join('scratch', 'pcm-plates-raw')

PCM_RE = re.compile(r'^PCM\s*(\d+)$')


# ---------------------------------------------------------------- copied from pcm_extract

def spans(page):
    out = []
    for b in page.get_text('dict')['blocks']:
        if b['type']:
            continue
        for line in b['lines']:
            for s in line['spans']:
                t = ' '.join(s['text'].split())
                if t:
                    out.append((t, fitz.Rect(s['bbox']), s['size']))
    return out


def design_images(page):
    """Design plates only: dedupe near-identical bboxes, drop page furniture."""
    seen, out = [], []
    for im in page.get_image_info():
        r = fitz.Rect(im['bbox'])
        if not (150 < r.width < 420 and 120 < r.height < 420):
            continue
        if any(abs(r.x0 - q.x0) < 3 and abs(r.y0 - q.y0) < 3 for q in seen):
            continue
        seen.append(r)
        out.append(r)
    return out


def match_label_to_image(labels, imgs):
    """A caption sits directly under its plate and is right-aligned to it."""
    pairs = []
    for text, rect, _ in labels:
        best, bestd = None, 1e9
        for r in imgs:
            if r.y1 > rect.y0 + 1:
                continue
            d = abs(r.x1 - rect.x1) * 2 + (rect.y0 - r.y1)
            if d < bestd:
                best, bestd = r, d
        if best is not None and bestd < 90:
            pairs.append((text, rect, best))
    return pairs


CAT_2011 = re.compile(r'^(Individual|Companion) Designs\s*-\s*(.+)$')


# ---------------------------------------------------------------- export

def render_native(page, rect):
    """72 dpi == 1 px per PDF point == the embedded image's own pixel grid."""
    pm = page.get_pixmap(dpi=72, clip=rect)
    return Image.frombytes('RGB', (pm.width, pm.height), pm.samples)


def plates_2020(doc):
    for pno in range(5, 95):                      # printed pages 6-95
        page = doc[pno]
        labels = [(m.group(1), r, sz) for t, r, sz in spans(page)
                  for m in [PCM_RE.match(t)] if m]
        for num, _lrect, img in match_label_to_image(labels, design_images(page)):
            yield num, page, img


def plates_2011(doc):
    for pno in range(5, 94):                      # printed pages 6-94
        page = doc[pno]
        sp = spans(page)
        head = [t for t, r, sz in sp if sz > 20]
        if not (head and CAT_2011.match(head[0])):
            continue                              # section dividers carry no plates
        labels = [(m.group(1), r, sz) for t, r, sz in sp
                  for m in [PCM_RE.match(t)] if m]
        for num, _lrect, img in match_label_to_image(labels, design_images(page)):
            yield num, page, img


def export(book_file, book_tag):
    doc = fitz.open(os.path.join(SRC, book_file))
    gen = plates_2020(doc) if book_tag == '2020' else plates_2011(doc)
    out_dir = os.path.join(RAW_DIR, book_tag)
    os.makedirs(out_dir, exist_ok=True)
    nums, dups, sizes = [], 0, set()
    # Same overwrite semantics as pcm_extract: a design cross-listed on two pages (PCM 2271)
    # writes twice and the later page wins, so the raw export matches what shipped.
    for num, page, rect in gen:
        if num in nums:
            dups += 1
        else:
            nums.append(num)
        im = render_native(page, rect)
        sizes.add(im.size)
        im.save(os.path.join(out_dir, f'{num}.png'), 'PNG', optimize=True)
    doc.close()
    return nums, dups, sizes


def on_disk(book_tag):
    d = os.path.join(DESIGN_DIR, book_tag)
    return {f[:-5] for f in os.listdir(d) if f.endswith('.webp')}


def main():
    total_bytes = 0
    for book_file, tag in ((BOOK_2020, '2020'), (BOOK_2011, '2011')):
        nums, dups, sizes = export(book_file, tag)
        got, want = set(nums), on_disk(tag)
        extra, missing = got - want, want - got
        print(f'{tag}: exported {len(got)} plates ({dups} cross-listed re-writes), '
              f'pixel sizes {sorted(sizes)}')
        if extra or missing:
            print(f'  MISMATCH vs {DESIGN_DIR}/{tag}: extra={sorted(extra)} '
                  f'missing={sorted(missing)}')
            sys.exit(1)
        total_bytes += sum(os.path.getsize(os.path.join(RAW_DIR, tag, f))
                           for f in os.listdir(os.path.join(RAW_DIR, tag)))
    n = sum(len(os.listdir(os.path.join(RAW_DIR, t))) for t in ('2020', '2011'))
    print(f'\nOK: {n} raw PNGs, {total_bytes/1e6:.2f} MB in {RAW_DIR}')
    if n != 699:
        print(f'EXPECTED 699 plates, got {n}')
        sys.exit(1)


if __name__ == '__main__':
    main()
