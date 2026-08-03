# -*- coding: utf-8 -*-
"""
Extraction half of the PCM design catalog build. Reads the three PCM books off the
local design-book folder and writes web-sized images plus data/pcm-catalog.json.

    python scripts/pcm_extract.py            # everything
    python scripts/pcm_extract.py --data     # re-derive the JSON, reuse images on disk

WHY PAGE-BY-PAGE. The Elements book is 1.0 GB and the 2011 book 190 MB, almost all of
it full-bleed page backgrounds we never use. Every page here is opened, cropped and
released before the next one; no book is ever materialised in memory.

WHAT GETS INCLUDED — granite FLAT markers only.
  * PCM2020DesignBook_web.pdf   pp. 6-95   354 flat-marker + ledger designs
  * comp-PCM_DesignBook2011.pdf pp. 6-94   346 designs, in the book's OWN categories
  * comp-2019-Design-Elements-Book-Final-Revised-Singles.pdf pp. 10-297  the ornaments
Front matter, NOTES pages, engraving/font/glossary pages and section dividers are
skipped.  Neither design book has an upright, slant, bench or bronze section: the only
occurrences of those words are in the glossaries (2020 pp. 113-115, 2011 pp. 114-116),
which are not extracted.  "Silver Bronze" in the 2020 captions is a GRANITE COLOR, not
a bronze marker — matching on the word alone would have thrown out 18 granite designs.

IMAGE SIZING. The books' embedded design images are 347x199 px natively, so rendering
above ~360 px buys nothing but bytes; elements are line art and go out as 1-bit PNG,
which is ~4x smaller than lossy WebP at this size and visibly cleaner.
"""
import io, json, os, re, sys

sys.stdout.reconfigure(encoding='utf-8')

import fitz
from PIL import Image

SRC = os.environ.get('PCM_SRC', r'D:\Cemetery Photos Misc\Markers')
BOOK_2020 = 'PCM2020DesignBook_web.pdf'
BOOK_2011 = 'comp-PCM_DesignBook2011.pdf'
BOOK_ELEM = 'comp-2019-Design-Elements-Book-Final-Revised-Singles.pdf'

DESIGN_DIR = 'pcm-design-images'
ELEM_DIR = 'pcm-element-images'
PHOTO_DIR = 'pcm-example-images'
REF_DIR = 'pcm-reference-images'
DATA = 'data/pcm-catalog.json'

DESIGN_PX = 360      # longest edge; the source is 347 px, so this is native-ish
ELEM_PX = 150
PHOTO_PX = 760

PCM_RE = re.compile(r'^PCM\s*(\d+)$')
ELEM_RE = re.compile(r"^[A-Z][A-Z0-9 &.'/()-]*\s\d{3}$")

# ---------------------------------------------------------------- helpers

def slug(s):
    return re.sub(r'-+', '-', re.sub(r'[^a-z0-9]+', '-', s.lower())).strip('-')


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


def render(page, rect, px):
    dpi = max(36, int(px / (max(rect.width, rect.height) / 72.0)))
    pm = page.get_pixmap(dpi=dpi, clip=rect)
    return Image.frombytes('RGB', (pm.width, pm.height), pm.samples)


def save_webp(im, path, px, q=64):
    im = im.copy()
    im.thumbnail((px, px), Image.LANCZOS)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path, 'WEBP', quality=q, method=5)
    return os.path.getsize(path)


def trim(im, pad=3):
    """Tighten a crop to its artwork. The Elements pages sit on a grey field and the
    grid cells are loose, so a fixed rect leaves wildly different margins; trimming to
    the ink makes every tile fill its card."""
    g = im.convert('L')
    bg = g.getpixel((0, 0))
    mask = g.point(lambda v: 255 if abs(v - bg) > 28 else 0)
    box = mask.getbbox()
    if not box:
        return im
    x0, y0, x1, y1 = box
    return im.crop((max(0, x0 - pad), max(0, y0 - pad),
                    min(im.width, x1 + pad), min(im.height, y1 + pad)))


def save_lineart(im, path, px, thresh=165):
    im = trim(im)
    g = im.convert('L')
    g.thumbnail((px, px), Image.LANCZOS)
    one = g.point(lambda v: 255 if v > thresh else 0).convert('1')
    os.makedirs(os.path.dirname(path), exist_ok=True)
    one.save(path, 'PNG', optimize=True)
    return os.path.getsize(path)


# ---------------------------------------------------------------- design books

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


def extract_2020(write_images):
    doc = fitz.open(os.path.join(SRC, BOOK_2020))
    out, bytes_ = [], 0
    for pno in range(5, 95):                      # printed pages 6-95
        page = doc[pno]
        sp = spans(page)
        labels = [(m.group(1), r, sz) for t, r, sz in sp for m in [PCM_RE.match(t)] if m]
        colors = [(t, r) for t, r, sz in sp
                   if not PCM_RE.match(t) and 'Copyright' not in t and t not in ('©',)
                   and not t.isdigit() and len(t) < 26 and r.height < 22]
        for num, lrect, img in match_label_to_image(labels, design_images(page)):
            color = ''
            near = [(t, r) for t, r in colors if abs(r.y0 - lrect.y0) < 3 and r.x0 < lrect.x0]
            if near:
                color = max(near, key=lambda tr: tr[1].x0)[0]
            fmt = 'ledger' if img.height > img.width else 'flat'
            rel = f'{DESIGN_DIR}/2020/{num}.webp'
            if write_images:
                bytes_ += save_webp(render(page, img, DESIGN_PX), rel, DESIGN_PX)
            out.append(dict(id=f'2020-{num}', num=int(num), book='2020', page=pno + 1,
                            cat='2020 Collection', sub='Ledgers' if fmt == 'ledger' else 'Flat Markers',
                            fmt=fmt, color=color, img=rel))
        page.clean_contents() if False else None
    doc.close()
    return out, bytes_


CAT_2011 = re.compile(r'^(Individual|Companion) Designs\s*-\s*(.+)$')


def extract_2011(write_images):
    doc = fitz.open(os.path.join(SRC, BOOK_2011))
    out, bytes_ = [], 0
    for pno in range(5, 94):                      # printed pages 6-94
        page = doc[pno]
        sp = spans(page)
        head = [t for t, r, sz in sp if sz > 20]
        m = CAT_2011.match(head[0]) if head else None
        if not m:
            continue                              # section dividers carry no plates
        family, sub = m.group(1), m.group(2).strip().rstrip('.')
        labels = [(mm.group(1), r, sz) for t, r, sz in sp for mm in [PCM_RE.match(t)] if mm]
        for num, lrect, img in match_label_to_image(labels, design_images(page)):
            fmt = ('ledger' if sub.lower().startswith('ledger')
                   else 'companion' if family == 'Companion' else 'individual')
            rel = f'{DESIGN_DIR}/2011/{num}.webp'
            if write_images:
                bytes_ += save_webp(render(page, img, DESIGN_PX), rel, DESIGN_PX)
            out.append(dict(id=f'2011-{num}', num=int(num), book='2011', page=pno + 1,
                            cat=f'{family} Designs', sub=sub, fmt=fmt, color='', img=rel))
    doc.close()
    return out, bytes_


# ---------------------------------------------------------------- elements

# From the Elements book's own index (printed p.3). Page numbers are the printed ones,
# which are also the PDF page numbers in this file.
ELEM_CATS = [
    ('Animals', 10, 50), ('Apparel', 51, 52), ('Cultural', 53, 67), ('Family', 68, 77),
    ('Food & Drink', 78, 79), ('Hobbies', 80, 89), ('Maps & Flags', 90, 92),
    ('Military', 93, 101), ('Music', 102, 106), ('Occupation', 107, 113),
    ('Organization', 114, 121), ('Ornaments', 122, 129), ('Plants', 130, 166),
    ('Religion', 167, 218), ('Scenery', 219, 227), ('Sports', 228, 244),
    ('Transportation', 245, 268), ('Borders & Panels', 270, 297),
]


def elem_cat(printed):
    for name, a, b in ELEM_CATS:
        if a <= printed <= b:
            return name
    return None


ELEM_TOP = 58.0          # below the grey header band on every element page


def content_box(page):
    """x-range that excludes the vertical category tab. The tab flips side between
    recto and verso, and a fixed left margin let it bleed into the right-hand column
    of every recto page — trim() then locked onto the tab's ink instead of the
    ornament's, so the tile showed a sliver of the word RELIGION."""
    left, right = 72.0, page.rect.x1 - 8
    for im in page.get_image_info():
        r = fitz.Rect(im['bbox'])
        if r.height > 250 and r.width < 80:
            if r.x1 < page.rect.x1 / 2:
                left = max(left, r.x1 + 6)
            else:
                right = min(right, r.x0 - 6)
    return left, right


def elem_crops(labels, page, right_aligned):
    """Label-driven grid. Borders & Panels are VECTOR art with no image object at all,
    so matching against embedded images would silently drop 28 pages; the captions are
    the only thing every page has.

    Two caption alignments exist and they need different column boundaries. The 5-up
    ornament grids centre the caption under its tile, so the boundary is the midpoint
    between neighbouring caption CENTRES. Borders & Panels right-aligns the caption to
    its panel's right edge, and using centres there put the boundary inside the next
    panel — every tile came out holding half of its neighbour."""
    rows = []
    for lab in sorted(labels, key=lambda t: t[1].y0):
        if rows and abs(rows[-1][0][1].y0 - lab[1].y0) < 8:
            rows[-1].append(lab)
        else:
            rows.append([lab])
    left, right = content_box(page)
    out = []
    # The top band of a row is only bounded above by the PREVIOUS row's captions, so on a
    # page whose first row of art carries no captions — pp. 270-271 print four unlabelled
    # border-style swatches above PANEL 001-008 — the first crop swallowed them and every
    # one of those eight tiles showed three shapes. Rows on a page are the same height, so
    # the first one is held to the height of the rest.
    bands = []
    prev_bottom = ELEM_TOP
    for row in rows:
        row.sort(key=lambda t: (t[1].x0 + t[1].x1) / 2)
        bands.append([prev_bottom + 4, min(r.y0 for _, r, _ in row) - 2, row])
        prev_bottom = max(r.y1 for _, r, _ in row)
    if len(bands) > 1:
        rest = sorted(b[1] - b[0] for b in bands[1:])
        typical = rest[len(rest) // 2]
        bands[0][0] = max(bands[0][0], bands[0][1] - typical)
    for top, bottom, row in bands:
        for i, (text, rect, _) in enumerate(row):
            if right_aligned:
                x0 = left if i == 0 else row[i - 1][1].x1 + 4
                x1 = rect.x1 + 4
            else:
                c = [(r.x0 + r.x1) / 2 for _, r, _ in row]
                pitch = (c[-1] - c[0]) / (len(c) - 1) if len(c) > 1 else (right - left)
                x0 = left if i == 0 else (c[i - 1] + c[i]) / 2
                x1 = right if i == len(row) - 1 else (c[i] + c[i + 1]) / 2
                x0 = max(left, min(x0, c[i] - pitch / 2 - 2))
                x1 = min(right, max(x1, c[i] + pitch / 2 + 2))
            x0, x1 = max(left, x0), min(right, x1)
            if bottom - top > 20 and x1 - x0 > 20:
                out.append((text, fitz.Rect(x0, top, x1, bottom)))
    return out


def extract_elements(write_images):
    doc = fitz.open(os.path.join(SRC, BOOK_ELEM))
    out, bytes_, used = [], 0, set()
    for pno in range(9, 297):
        printed = pno + 1
        cat = elem_cat(printed)
        if cat is None:
            continue
        page = doc[pno]
        labels = [(t, r, sz) for t, r, sz in spans(page) if ELEM_RE.match(t)]
        if not labels:
            continue
        for code, rect in elem_crops(labels, page, cat == 'Borders & Panels'):
            key = slug(code)
            if key in used:
                continue                          # a handful repeat across pages
            used.add(key)
            rel = f'{ELEM_DIR}/{slug(cat)}/{key}.png'
            if write_images:
                bytes_ += save_lineart(render(page, rect, ELEM_PX * 2), rel, ELEM_PX)
            out.append(dict(code=code, cat=cat, page=printed, img=rel))
    doc.close()
    return out, bytes_


# ---------------------------------------------------------------- photos & reference

# Curated 2026-08-02, then RE-curated the same day after an agent opened all 228 source
# frames full-size instead of judging them off a thumbnail sheet. Eleven of the original
# thirty were replaced: the thumbnail pass could not see leaf litter and grass clippings
# lying ON a stone, low-contrast weathered lettering, or a photographer's shadow, and one
# frame of each fault shipped. Scored on focus, exposure, composition, condition, and
# whether the frame SELLS — a legible, fresh-looking engraving on clean stone.
#
# Rules held to: granite only (bronze plates excluded), no living person and no shoe in
# frame, nothing resting on the stone, and no marker whose lettering has weathered past
# reading. Quality beat variety where they collided — see the tan-granite note below.
#
# Third element is an options dict, all keys optional:
#   crop (l, t, r, b) as fractions of the frame — tightens dead lawn margin, and is how
#         several otherwise-excellent frames lose the photographer's shoes at the bottom
#         edge. It only ever removes pixels; the marker itself is never altered.
#   rot   'ccw' — the frame was shot with the marker on its side.
PHOTOS = [
    (36,  'Blue-grey granite, carved fisherman and musical staff', dict(rot='ccw')),
    (53,  'Dark grey granite, etched ribbon and mountain scene', {}),
    (62,  'Black granite with etched books, cross and ceramic portrait', {}),
    (68,  'Black granite, laser-etched double portrait and garden scene',
          dict(crop=(0.08, 0.10, 1.00, 0.92))),
    (77,  'Rose granite with a color ceramic heart portrait', {}),
    (58,  'Mahogany granite, crisp sandblasted lettering', dict(crop=(0.00, 0.05, 0.80, 0.77))),
    (174, 'Blue pearl granite, laser-etched temple scene with a ceramic double portrait', dict(crop=(0.10, 0.18, 0.72, 0.84))),
    (95,  'Etched Seattle skyline with a ceramic portrait', {}),
    (105, 'Grey granite with an etched angel',
          dict(crop=(0.00, 0.00, 0.88, 0.86))),
    (111, 'Light grey granite, plain panel lettering',
          dict(crop=(0.02, 0.08, 1.00, 0.95))),
    (132, 'Rose granite companion with a carved figure and roses',
          dict(crop=(0.00, 0.00, 1.00, 0.80))),
    (136, 'Rose granite with an etched mountain', {}),
    (139, 'Grey granite companion, mountain and temple etching', {}),
    (147, 'Black granite, praying hands and a color portrait', {}),
    (149, 'Black granite companion, laser-etched family portrait',
          dict(crop=(0.00, 0.00, 1.00, 0.82))),
    (153, 'Red granite companion with an etched mountain treeline',
          dict(crop=(0.00, 0.00, 1.00, 0.80))),
    (170, 'Light grey granite, script lettering and a carved corner panel', {}),
    (176, 'Red granite with a raised cross', {}),
    (177, 'Red granite with an etched portrait medallion', {}),
    (178, 'Red granite companion, praying hands and crosses', {}),
    (180, 'Mahogany granite companion, etched deer and mountain scene',
          dict(crop=(0.00, 0.00, 1.00, 0.78))),
    (187, 'Red granite with an etched forest scene', {}),
    (189, 'Grey granite, plain sans lettering', {}),
    (190, 'Blue-grey granite companion with a mountain-lake vignette',
          dict(crop=(0.02, 0.18, 1.00, 1.00))),
    (195, 'Red granite with an etched wilderness scene', {}),
    (138, 'Black granite laser portrait with Samoan motifs', dict(crop=(0.22, 0.03, 0.92, 0.56))),
    (206, 'Grey granite with a raised cross and scripture',
          dict(crop=(0.00, 0.06, 1.00, 0.94))),
    (216, 'Grey granite with rosary, roses and a color portrait', {}),
    (218, 'Grey granite with an etched rose and cross', {}),
    (219, 'Red granite with a Chinese surname panel',
          dict(crop=(0.06, 0.22, 0.98, 0.92))),
]

# COVERAGE GAP, recorded rather than papered over: there is no shippable TAN granite frame
# in this folder. The only tan flat markers photographed (source indexes 207 and 60) have
# weathered to the point that the lettering is barely readable and both are under leaf
# litter — putting either on the page would sell the family a stone that looks worn out.
# The tan swatch is covered instead by the granite-color reference plates in the same
# catalog. Mahogany, terracotta and brown are covered by 180, 196 and 85.

# Photos already shipping on the granite marker guide — reused in place, no new bytes.
GUIDE_PHOTOS = [
    ('marker-images/Black-granite-marker-flat-marker-F1066.jpg', 'Black granite flat marker'),
    ('marker-images/companion-marker.jpg', 'Companion flat marker'),
    ('marker-images/diamond-etching.jpg', 'Diamond etching'),
    ('marker-images/ceramic-steel-portrait.jpg', 'Ceramic steel portrait'),
    ('marker-images/classic-gray.jpg', 'Classic Gray granite'),
]

REFERENCE = [
    (BOOK_2020, 4, 'Common Flat Marker Sizes', 'Individual, companion and ledger sizes drawn to scale.'),
    (BOOK_2011, 96, 'Granite Colors — Group 1', 'Stone colors in the first color group.'),
    (BOOK_2011, 97, 'Granite Colors — Group 1 continued', 'The rest of the first color group.'),
    (BOOK_2011, 98, 'Granite Colors — Group 2', 'Stone colors in the second color group.'),
    (BOOK_2011, 99, 'Granite Colors — Group 3', 'Stone colors in the third color group.'),
    (BOOK_2020, 98, 'Engraving Styles — 1', 'How lettering and art are cut into the stone.'),
    (BOOK_2020, 99, 'Engraving Styles — 2', 'Continued.'),
    (BOOK_2020, 108, 'Font Styles — 1', 'Lettering faces available.'),
    (BOOK_2020, 109, 'Font Styles — 2', 'Lettering faces available.'),
    (BOOK_2020, 110, 'Font Styles — 3', 'Lettering faces available.'),
    (BOOK_2020, 111, 'Font Styles — 4', 'Lettering faces available.'),
    (BOOK_2020, 112, 'Font Styles — 5', 'Lettering faces available.'),
    (BOOK_2020, 105, 'Glass Inlays', 'Color glass inlay work, as shown on pages 88-89 of the 2020 book.'),
]


def extract_photos(write_images):
    files = sorted(f for f in os.listdir(SRC) if f.lower().endswith('.jpg'))
    out, bytes_ = [], 0
    for idx, desc, opt in PHOTOS:
        src = os.path.join(SRC, files[idx])
        rel = f'{PHOTO_DIR}/marker-{idx:03d}.jpg'
        if write_images:
            im = Image.open(src).convert('RGB')
            if opt.get('rot') == 'ccw':
                im = im.transpose(Image.ROTATE_90)
            box = opt.get('crop')
            if box:
                w, h = im.size
                im = im.crop((int(box[0] * w), int(box[1] * h),
                              int(box[2] * w), int(box[3] * h)))
            im.thumbnail((PHOTO_PX, PHOTO_PX), Image.LANCZOS)
            os.makedirs(PHOTO_DIR, exist_ok=True)
            im.save(rel, 'JPEG', quality=70, optimize=True, progressive=True)
            bytes_ += os.path.getsize(rel)
        out.append(dict(img=rel, desc=desc, src='Washington Memorial Park'))
    for rel, desc in GUIDE_PHOTOS:
        out.append(dict(img=rel, desc=desc, src='Granite Marker Guide'))
    return out, bytes_


def extract_reference(write_images):
    out, bytes_ = [], 0
    for book, printed, title, desc in REFERENCE:
        rel = f'{REF_DIR}/{slug(title)}.webp'
        if write_images:
            doc = fitz.open(os.path.join(SRC, book))
            page = doc[printed - 1]
            bytes_ += save_webp(render(page, page.rect, 1000), rel, 1000, q=70)
            doc.close()
        out.append(dict(img=rel, title=title, desc=desc))
    return out, bytes_


# ---------------------------------------------------------------- main

def main():
    """`--data` reuses whatever is already on disk; `--only=elements,photos` re-renders
    just those parts (the Elements book alone takes ~10 minutes to walk)."""
    write_all = '--data' not in sys.argv
    only = None
    for a in sys.argv[1:]:
        if a.startswith('--only='):
            only = set(a.split('=', 1)[1].split(','))
    wr = lambda part: write_all and (only is None or part in only)
    total = 0

    d2020, b = extract_2020(wr('designs')); total += b
    print(f'2020 book : {len(d2020):4d} designs  ({b/1e6:.2f} MB)')
    d2011, b = extract_2011(wr('designs')); total += b
    print(f'2011 book : {len(d2011):4d} designs  ({b/1e6:.2f} MB)')
    elems, b = extract_elements(wr('elements')); total += b
    print(f'elements  : {len(elems):4d} items    ({b/1e6:.2f} MB)')
    photos, b = extract_photos(wr('photos')); total += b
    print(f'photos    : {len(photos):4d} images   ({b/1e6:.2f} MB)')
    refs, b = extract_reference(wr('reference')); total += b
    print(f'reference : {len(refs):4d} pages    ({b/1e6:.2f} MB)')

    designs = sorted(d2020 + d2011, key=lambda d: (d['book'], d['num']))
    cats = {}
    for d in designs:
        cats.setdefault(d['cat'], {}).setdefault(d['sub'], 0)
        cats[d['cat']][d['sub']] += 1
    ecats = {}
    for e in elems:
        ecats[e['cat']] = ecats.get(e['cat'], 0) + 1

    # A design number can legitimately appear in TWO of the book's sections — PCM 2271
    # (GREENE) is printed under both Companion/Religious and Companion/Outdoors because it
    # carries a cross AND a mountain scene. Both cards stay, because the book lists both,
    # and they share one image because it is one design. Recorded rather than silently
    # deduped: a NEW repeat is far more likely to be an extraction fault.
    where = {}
    for d in designs:
        where.setdefault(d['id'], []).append(d['cat'] + ' / ' + d['sub'])
    cross = {k: v for k, v in where.items() if len(v) > 1}

    os.makedirs('data', exist_ok=True)
    with open(DATA, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(dict(designs=designs, elements=elems, photos=photos,
                       reference=refs, designCats=cats, elementCats=ecats,
                       crossListed=cross),
                  f, indent=0, ensure_ascii=False)
    print(f'\ntotal new image bytes: {total/1e6:.2f} MB')
    print(f'{DATA}: {len(designs)} designs, {len(elems)} elements, '
          f'{len(photos)} photos, {len(refs)} reference pages')
    for c, subs in cats.items():
        print('  ' + c + ': ' + ', '.join(f'{k} {v}' for k, v in subs.items()))
    print('  elements: ' + ', '.join(f'{k} {v}' for k, v in ecats.items()))
    for k, v in cross.items():
        print(f'  cross-listed: {k} in {" + ".join(v)}')


if __name__ == '__main__':
    main()
