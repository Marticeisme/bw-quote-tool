# -*- coding: utf-8 -*-
"""
Rebuild the sectioned catalogs (urns, keepsakes) from the Batesville INDEX.csv.

These pages split products across sub-sections (Full-Size / Companion /
Biodegradable / Scattering, and Keepsake / Miniature / Pendants / Accessories).

Design decisions that matter:

* **Existing cards keep the section they're already in.** The live grouping
  contains human judgement the data can't reproduce - e.g. "Silver Steel Chest
  Urn" sits in Full-Size while the other chest urns sit in Companion. A
  classifier that overrode that would quietly undo Martice's choices.
* **Only genuinely new products get classified**, and every such assignment is
  printed for review.
* Cards with no CSV row are preserved verbatim in place (deliberate BW additions,
  e.g. the seven $49 keepsakes Batesville doesn't list).
* Every card is enriched with the specs the CSV has but the page never showed
  (weight everywhere; dimensions + item number on keepsakes).

Run from the repo root:  python scripts/build_sectioned_catalogs.py [urns|keepsakes|all]
"""
import csv, html, os, re, sys

sys.stdout.reconfigure(encoding='utf-8')

SRC  = r'D:\Property Cards\Batesville Product Images'
CSVP = os.path.join(SRC, 'INDEX.csv')
CUPS = 14.4


def num(v):
    v = (v or '').strip()
    if not v:
        return None
    try:
        return '%g' % float(v)
    except ValueError:
        return v


def norm(s):
    return ' '.join(re.sub(r'[^a-z0-9 ]', ' ', s.lower()).split())


def details_for(r):
    material = (r['material'] or '').strip() or None
    vol = num(r['volume_in3'])
    cap = f'{vol} cu in (~{float(vol) / CUPS:.1f} cups)' if vol else None
    L, W, H, wt = num(r['length_in']), num(r['width_in']), num(r['height_in']), num(r['weight_lbs'])
    dims = f'{H} in H x {L} in L x {W} in W' if (L and W and H) else None
    return [d for d in (material, cap, dims, f'{wt} lbs' if wt else None) if d]


def classify_urn(r):
    n, f = r['product_name'].lower(), r['features'].lower()
    v = float(r['volume_in3']) if r['volume_in3'].strip() else 0
    if 'scattering' in n:
        return 'cat-scattering'
    if ('biodegradable' in n or 'earthurn' in n or 'water urn' in n
            or 'biodegradable urns must remain' in f):
        return 'cat-biodegradable'
    # "Memento Chest" is a chest-style urn; every one already on the page is
    # filed under Companion regardless of capacity, so follow that. Plain
    # "Chest Urn" is NOT a reliable signal - Silver Steel Chest Urn sits in
    # Full-Size - so match the specific product line only.
    if v >= 350 or re.search(r'\bcompanion\b|\bdual\b|memento\s*®?\s*chest', n):
        return 'cat-companion'
    return 'cat-full-size'


def classify_keepsake(r):
    n = r['product_name'].lower()
    if re.search(r'pendant|jewelry|bezel', n):
        return 'cat-pendants'
    if re.search(r'chime|accessor', n):
        return 'cat-accessories'
    if re.search(r'\bmini\b|miniature', n):
        return 'cat-miniature'
    return 'cat-keepsake'


CATALOGS = {
    'urns': dict(page='urns-guide.html', cat='Urns', imgdir='urn-images', ext='jpeg',
                 px=400, q=80, noun='products', classify=classify_urn, match_by_name=False),
    'keepsakes': dict(page='keepsake-urns-guide.html', cat='Keepsakes', imgdir='keepsake-images',
                      ext='jpeg', px=400, q=80, noun='products', classify=classify_keepsake,
                      match_by_name=True),
}

SECTION_RE = re.compile(r'(<div class="product-grid" id="grid-(cat-[^"]+)">)(.*?)(\n    </div>)', re.S)
CARD_RE = re.compile(r'<div class="product-card"')


def split_cards(grid_html):
    idxs = [m.start() for m in CARD_RE.finditer(grid_html)]
    out = []
    for a, b in zip(idxs, idxs[1:] + [len(grid_html)]):
        chunk = grid_html[a:b]
        end = chunk.rfind('</div>')
        out.append(chunk[:end + 6].rstrip())
    return out


def attr(card, name):
    m = re.search(rf'{name}="([^"]*)"', card)
    return m.group(1) if m else None


def card_name(card):
    m = re.search(r'<div class="product-name">([^<]+)</div>', card)
    return html.unescape(m.group(1)) if m else ''


def build_card(sku, name, price, details, img):
    esc = html.escape
    lines = [
        f'        <div class="product-card" data-name="{esc(name.lower(), quote=True)}" '
        f'data-item="{sku}" data-price="{price:.1f}">',
        f'          <div class="product-img"><img src="{img}" alt="{esc(name, quote=True)}" loading="lazy"></div>',
        '          <div class="product-body">',
        f'            <div class="product-name">{esc(name)}</div>',
        f'            <div class="product-price">${price:,.2f}</div>',
    ]
    lines += [f'            <div class="product-detail">{esc(d)}</div>' for d in details]
    lines += [
        f'            <div class="product-meta">#{sku}</div>',
        '          </div>',
        '        </div>',
    ]
    return '\n'.join(lines)


def run(key):
    cfg = CATALOGS[key]
    page = cfg['page']
    rows = [r for r in csv.DictReader(open(CSVP, encoding='utf-8')) if r['category'] == cfg['cat']]
    s = open(page, encoding='utf-8').read()

    # --- read existing sections ---
    sections = []          # [(sid, [cards])] in document order
    for m in SECTION_RE.finditer(s):
        sections.append((m.group(2), split_cards(m.group(3))))

    live_by_key, live_by_name, live_section = {}, {}, {}
    for sid, cards in sections:
        for c in cards:
            k = attr(c, 'data-item')
            live_by_key[k] = c
            live_section[k] = sid
            live_by_name[norm(card_name(c))] = k

    from PIL import Image
    os.makedirs(cfg['imgdir'], exist_ok=True)

    assigned = {sid: [] for sid, _ in sections}
    consumed = set()
    new_items, added_img = [], 0

    for r in rows:
        sku, name = r['sku'].strip(), r['product_name'].strip()
        price = float(r['price_usd'])

        k = sku if sku in live_by_key else (live_by_name.get(norm(name)) if cfg['match_by_name'] else None)
        prev = live_by_key.get(k) if k else None

        # image: reuse the live one, else render from source
        img = None
        if prev is not None:
            mm = re.search(r'<img src="([^"]+)"', prev)
            if mm:
                img = mm.group(1)
        if img is None:
            dst = os.path.join(cfg['imgdir'], f'{sku}.{cfg["ext"]}')
            img = dst.replace(os.sep, '/')
            if not os.path.exists(dst):
                srcimg = os.path.join(SRC, cfg['cat'], r['filename'])
                if os.path.exists(srcimg):
                    Image.open(srcimg).convert('RGB').resize(
                        (cfg['px'], cfg['px']), Image.LANCZOS).save(
                        dst, 'JPEG', quality=cfg['q'], optimize=True)
                    added_img += 1
                else:
                    print('  MISSING IMAGE', sku, r['filename'])

        if prev is not None:
            sid = live_section[k]          # keep Martice's placement
            consumed.add(k)
        else:
            sid = cfg['classify'](r)       # new product -> classify
            new_items.append((sid, sku, name, price))

        assigned.setdefault(sid, []).append((price, build_card(sku, name, price, details_for(r), img)))

    # preserve cards with no CSV row, in place
    kept = 0
    for sid, cards in sections:
        for c in cards:
            k = attr(c, 'data-item')
            if k in consumed:
                continue
            p = attr(c, 'data-price')
            assigned[sid].append((float(p) if p else 0.0, c))
            kept += 1

    # Order the DOM to match whatever the sort dropdown defaults to, so the page
    # doesn't load showing "Price: High to Low" over a low-to-high list.
    mdef = re.search(r'id="sortSelect"[^>]*>\s*<option value="([a-z-]+)"', s)
    desc = (mdef.group(1) if mdef else 'price-asc') == 'price-desc'

    # --- write sections back ---
    def repl(m):
        sid = m.group(2)
        items = sorted(assigned.get(sid, []), key=lambda t: t[0], reverse=desc)
        return m.group(1) + '\n' + '\n'.join(c for _, c in items) + m.group(4)

    s = SECTION_RE.sub(repl, s)

    total = sum(len(v) for v in assigned.values())
    prices = [p for v in assigned.values() for p, _ in v]
    lo, hi = min(prices), max(prices)
    s = re.sub(r'<div class="cover-footer">.*?</div>',
               f'<div class="cover-footer">{total} {cfg["noun"]} &middot; ${lo:,.2f} &ndash; ${hi:,.2f}</div>',
               s, count=1)
    s = re.sub(r'(<span class="filter-count" id="filterCount">)[^<]*(</span>)',
               rf'\g<1>{total} {cfg["noun"]}\g<2>', s, count=1)
    s = re.sub(r'var specLabels = \[[^\]]*\];',
               "var specLabels = ['Material', 'Capacity', 'Dimensions', 'Weight'];", s, count=1)

    # "In This Guide" contents counts, e.g. <a href="#cat-full-size">Full-Size Urns <span …>(87)</span></a>
    for sid, _ in sections:
        n = len(assigned.get(sid, []))
        s = re.sub(rf'(href="#{sid}">[^<]*<span[^>]*>\()\d+(\)</span>)',
                   rf'\g<1>{n}\g<2>', s, count=1)
        # section count pills, if the page has them
        s = re.sub(rf'(id="{sid}".*?<span class="cat-count">)[^<]*(</span>)',
                   rf'\g<1>{n}\g<2>', s, count=1, flags=re.S)

    open(page, 'w', encoding='utf-8', newline='').write(s)

    print(f'{page}: {total} cards (was {sum(len(c) for _, c in sections)}) | '
          f'+{added_img} images | {kept} preserved not-in-CSV | ${lo:,.2f}-${hi:,.2f}')
    for sid, _ in sections:
        print(f'    {sid:20} {len(assigned.get(sid, [])):4}')
    if new_items:
        print(f'  --- {len(new_items)} NEW products, auto-classified (review): ---')
        for sid, sku, name, price in sorted(new_items):
            print(f'    {sid:20} {sku:10} ${price:>8,.2f}  {name}')


if __name__ == '__main__':
    which = sys.argv[1] if len(sys.argv) > 1 else 'all'
    for k in (CATALOGS if which == 'all' else [which]):
        run(k)
