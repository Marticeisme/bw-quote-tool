# -*- coding: utf-8 -*-
"""
Build the combined Cremation Containers & Rental Caskets catalog.

Templated from urns-guide.html because that page already has the sectioned
filter/sort logic, the detail modal, and the single-product print sheet. We keep
its head/nav/styles/scripts and swap in a new cover, contents list, and sections.

All 11 products carry exactly construction / interior / suitable-for /
dimensions / weight and none has a finish, so the positional specLabels line up
across both sections.

Run from the repo root:  python scripts/build_cremation_rental.py
"""
import csv, html, os, re, sys

sys.stdout.reconfigure(encoding='utf-8')

SRC = r'D:\Property Cards\Batesville Product Images'
CSVP = os.path.join(SRC, 'INDEX.csv')
TEMPLATE = 'urns-guide.html'
OUT = 'cremation-containers-rental-caskets.html'
# Own directory, matching the casket-images/<type> convention. Deliberately NOT
# the existing cremation-images/, whose files are 298px - built for a different
# layout and too soft for these cards - and which cremation-guide.html owns.
IMGDIR = 'casket-images/cremation'
PX, Q = 800, 82

SECTIONS = [
    ('cat-cremation-containers', 'Cremation Containers', 'Cremation Containers'),
    ('cat-rental-caskets',       'Rental Caskets',       'Rental Caskets'),
]

TITLE = 'Cremation Containers &amp; Rental Caskets'
H1 = 'Cremation Containers &amp; Rental Caskets'
SUB = ('Containers designed for cremation, and rental caskets for a viewing or '
       'service before cremation &mdash; from Batesville.')


def num(v):
    v = (v or '').strip()
    if not v:
        return None
    try:
        return '%g' % float(v)
    except ValueError:
        return v


def clean(f):
    return ' '.join(f.split())


def details_for(r):
    feats = [clean(f) for f in r['features'].split(' ; ') if f.strip()]
    construction = next((f[len('Constructed of '):] for f in feats
                         if f.lower().startswith('constructed of ')), None) \
        or (r['material'] or '').strip() or None
    interior = next((f for f in feats if f.lower().endswith('interior')), None)
    suitable = next((f[len('Suitable for '):] for f in feats
                     if f.lower().startswith('suitable for ')), None)
    if not suitable and any('designed specifically for cremation' in f.lower() for f in feats):
        suitable = 'Cremation'
    L, W, H, wt = num(r['length_in']), num(r['width_in']), num(r['height_in']), num(r['weight_lbs'])
    dims = f'{L} in L x {W} in W x {H} in H' if (L and W and H) else None
    return [d for d in (construction, interior, suitable, dims,
                        f'{wt} lbs' if wt else None) if d]


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


def main():
    rows = list(csv.DictReader(open(CSVP, encoding='utf-8')))
    by_sec = {sid: [r for r in rows if r['category'] == cat]
              for sid, _, cat in SECTIONS}
    # Match the template's default sort direction so the page doesn't load
    # showing "Price: High to Low" over a low-to-high list.
    _tpl = open(TEMPLATE, encoding='utf-8').read()
    _m = re.search(r'id="sortSelect"[^>]*>\s*<option value="([a-z-]+)"', _tpl)
    _desc = (_m.group(1) if _m else 'price-asc') == 'price-desc'
    for sid in by_sec:
        by_sec[sid].sort(key=lambda r: float(r['price_usd']), reverse=_desc)

    from PIL import Image
    os.makedirs(IMGDIR, exist_ok=True)
    added = 0
    for sid, _, cat in SECTIONS:
        for r in by_sec[sid]:
            dst = os.path.join(IMGDIR, r['sku'].strip() + '.jpg')
            if os.path.exists(dst):
                continue
            srcimg = os.path.join(SRC, cat, r['filename'])
            if not os.path.exists(srcimg):
                print('  MISSING IMAGE', r['sku'], r['filename'])
                continue
            Image.open(srcimg).convert('RGB').resize((PX, PX), Image.LANCZOS) \
                .save(dst, 'JPEG', quality=Q, optimize=True)
            added += 1

    s = open(TEMPLATE, encoding='utf-8').read()

    # ---- splice points ----
    cover_i = s.index('  <div class="cover">')
    filter_i = s.index('  <div class="filter-bar', cover_i)
    contents_i = s.index('  <div class="contents">')
    filter_bar = s[filter_i:contents_i]        # keep the search/sort bar verbatim
    first_sec = s.index('  <div class="section-wrap" id="cat-')
    last_sec = s.rfind('  <div class="section-wrap" id="cat-')
    sec_end = s.index('\n    </div>\n  </div>', last_sec) + len('\n    </div>\n  </div>')

    prices = [float(r['price_usd']) for rs in by_sec.values() for r in rs]
    total = len(prices)

    cover = (
        '  <div class="cover">\n'
        '    <img src="logo.svg" alt="Bonney Watson" class="cover-logo">\n'
        '    <div class="cover-kicker">BONNEY WATSON FAMILY GUIDE</div>\n'
        f'    <h1>{H1}</h1>\n'
        f'    <div class="cover-sub">{SUB}</div>\n'
        '    <div class="cover-rule"></div>\n'
        f'    <div class="cover-footer">{total} products &middot; '
        f'${min(prices):,.2f} &ndash; ${max(prices):,.2f}</div>\n'
        '  </div>\n\n'
    )

    contents = ['  <div class="contents">',
                '    <div class="contents-label">In This Guide</div>',
                '    <div class="contents-grid">']
    for i, (sid, title, _) in enumerate(SECTIONS, 1):
        contents.append(
            f'      <div class="contents-item"><span class="contents-num">{i}</span>'
            f'<a href="#{sid}">{title} <span style="color:var(--text-muted);font-weight:400">'
            f'({len(by_sec[sid])})</span></a></div>')
    contents += ['    </div>', '  </div>', '']
    contents = '\n'.join(contents) + '\n'

    secs = []
    for i, (sid, title, _) in enumerate(SECTIONS, 1):
        cards = [build_card(r['sku'].strip(), r['product_name'].strip(),
                            float(r['price_usd']), details_for(r),
                            f'{IMGDIR}/{r["sku"].strip()}.jpg')
                 for r in by_sec[sid]]
        secs.append(
            f'  <div class="section-wrap" id="{sid}">\n'
            f'    <div class="section-kicker">SECTION {i}</div>\n'
            f'    <h2>{title}</h2>\n'
            f'    <div class="section-rule"></div>\n'
            f'    <div class="product-grid" id="grid-{sid}">\n'
            + '\n'.join(cards) +
            '\n    </div>\n  </div>')
    sections = '\n\n'.join(secs)

    out = s[:cover_i] + cover + filter_bar + contents + sections + s[sec_end:]

    out = re.sub(r'<title>[^<]*</title>', f'<title>{TITLE} &middot; Bonney Watson</title>', out, count=1)
    out = re.sub(r'var specLabels = \[[^\]]*\];',
                 "var specLabels = ['Construction', 'Interior', 'Suitable For', 'Dimensions', 'Weight'];",
                 out, count=1)
    out = re.sub(r'(<span class="filter-count" id="filterCount">)[^<]*(</span>)',
                 rf'\g<1>{total} products\g<2>', out, count=1)

    open(OUT, 'w', encoding='utf-8', newline='').write(out)
    print(f'{OUT}: {total} products in {len(SECTIONS)} sections | +{added} images | '
          f'${min(prices):,.2f}-${max(prices):,.2f}')
    for sid, title, _ in SECTIONS:
        print(f'    {sid:28} {len(by_sec[sid]):3}  {title}')


if __name__ == '__main__':
    main()
