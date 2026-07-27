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

# The third section, added 2026-07-27 (punch list item 4): "The same caskets must
# also appear in cremation-containers-rental-caskets.html." Its membership is READ
# OUT OF cremation-guide.html section 5 rather than retyped here, because that
# section is the authoritative list ("he confirmed those names are correct") and
# two hand-maintained copies of a product list drift. Matching is by item number,
# which the guide carries in each card's image filename.
CREM_GUIDE = 'cremation-guide.html'


def cremation_casket_skus():
    s = open(CREM_GUIDE, encoding='utf-8').read()
    i = s.index('id="caskets"')
    rest = s[i + 10:]
    nxt = [n for n in (rest.find('<div class="section-wrap"'),
                       rest.find('<div class="urn-subheader"')) if n >= 0]
    sec = rest[:min(nxt)] if nxt else rest
    skus = re.findall(r'(\d{5,7})\.(?:jpg|jpeg|png)', sec)
    seen, out = set(), []
    for k in skus:
        if k not in seen:
            seen.add(k)
            out.append(k)
    return out


# (section id, heading, selector) — selector is a category name or a set of SKUs.
SECTIONS = [
    ('cat-cremation-containers', 'Cremation Containers', {'category': 'Cremation Containers'}),
    ('cat-rental-caskets',       'Rental Caskets',       {'category': 'Rental Caskets'}),
    ('cat-cremation-caskets',    'Caskets Suitable for Cremation', {'skus': None}),
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
    # The compare toggle is part of every product card on every catalog. It was
    # added to the pages after this builder was written, so a rebuild used to
    # silently strip it and verify_catalogs.mjs would report "compare: skipped"
    # (it needs at least two .compare-cb) instead of failing. Emitted here now.
    lines += [
        f'            <div class="product-meta">#{sku}</div>',
        '            <label class="compare-toggle">',
        '              <input type="checkbox" class="compare-cb">',
        '              <span>Compare</span>',
        '            </label>',
        '          </div>',
        '        </div>',
    ]
    return '\n'.join(lines)


def main():
    rows = list(csv.DictReader(open(CSVP, encoding='utf-8')))
    for sid, _, sel in SECTIONS:
        if 'skus' in sel and sel['skus'] is None:
            sel['skus'] = cremation_casket_skus()

    def pick(sel):
        if 'category' in sel:
            return [r for r in rows if r['category'] == sel['category']]
        want = list(sel['skus'])
        by_sku = {r['sku'].strip(): r for r in rows}
        missing = [k for k in want if k not in by_sku]
        for k in missing:
            print(f'  NOT IN INDEX.csv: {k}')
        return [by_sku[k] for k in want if k in by_sku]

    by_sec = {sid: pick(sel) for sid, _, sel in SECTIONS}
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
    for sid, _, _sel in SECTIONS:
        for r in by_sec[sid]:
            dst = os.path.join(IMGDIR, r['sku'].strip() + '.jpg')
            if os.path.exists(dst):
                continue
            # Source folder comes from the ROW's own category, not the section's:
            # the cremation-casket section draws from Wood Caskets (and one row
            # the index files under Metal Caskets).
            srcimg = os.path.join(SRC, r['category'], r['filename'])
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

    # Positional spec rows are only safe while every product has all five details.
    short = [r['sku'].strip() for rs in by_sec.values() for r in rs if len(details_for(r)) != 5]
    if short:
        raise SystemExit('These products do not have exactly 5 details, so the positional '
                         'comparison rows would mislabel them: ' + ', '.join(short))

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
    for i, (sid, title, _sel) in enumerate(SECTIONS, 1):
        contents.append(
            f'      <div class="contents-item"><span class="contents-num">{i}</span>'
            f'<a href="#{sid}">{title} <span style="color:var(--text-muted);font-weight:400">'
            f'({len(by_sec[sid])})</span></a></div>')
    contents += ['    </div>', '  </div>', '']
    contents = '\n'.join(contents) + '\n'

    secs = []
    for i, (sid, title, _sel) in enumerate(SECTIONS, 1):
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

    # The compare tray, print masthead and comparison rows come from the urn
    # template and have to be re-labelled for this catalog. These were hand-edited
    # onto the generated page once and a rebuild silently reverted them to "Compare
    # Urns" / Material-Capacity rows; they are patched here so the builder is
    # actually the source of the page.
    out = out.replace('<div class="compare-title">Compare Urns</div>',
                      '<div class="compare-title">Compare Cremation &amp; Rental</div>')
    out = out.replace('<div class="cmp-masthead-title">Urn Comparison</div>',
                      '<div class="cmp-masthead-title">Cremation &amp; Rental Comparison</div>')
    out = out.replace('<div class="cmp-eyebrow">Urns</div>',
                      '<div class="cmp-eyebrow">Cremation &amp; Rental</div>')
    out = re.sub(r'var ROW_LABELS = \[[^\]]*\];',
                 "var ROW_LABELS = ['Price', 'Construction', 'Interior', 'Suitable For', "
                 "'Dimensions', 'Weight', 'Item #'];", out, count=1)
    out = re.sub(r'var DIFF_ELIGIBLE = \[[^\]]*\];',
                 'var DIFF_ELIGIBLE = [true, true, true, true, true, true, false];', out, count=1)
    # rowValues(): the urn template classifies each detail by its CONTENT, because
    # some urn cards drop a middle field. Every product on this page carries all
    # five of Construction / Interior / Suitable For / Dimensions / Weight — checked
    # at build time below — so positional indexing is correct here, and the urn
    # classifier (which looks for "cu in" capacity) is not.
    out = re.sub(r'  function rowValues\(data\)\{[\s\S]*?\n  \}\n',
                 "  function rowValues(data){\n"
                 "    var vals = [data.price];\n"
                 "    for (var i = 0; i < 5; i++) vals.push(data.details[i] || '—');\n"
                 "    vals.push(data.item);\n"
                 "    return vals;\n"
                 "  }\n", out, count=1)

    open(OUT, 'w', encoding='utf-8', newline='').write(out)
    print(f'{OUT}: {total} products in {len(SECTIONS)} sections | +{added} images | '
          f'${min(prices):,.2f}-${max(prices):,.2f}')
    for sid, title, _sel in SECTIONS:
        print(f'    {sid:28} {len(by_sec[sid]):3}  {title}')


if __name__ == '__main__':
    main()
