# -*- coding: utf-8 -*-
"""
Rebuild the metal casket catalog grid from the Batesville INDEX.csv.

- Adds every Metal Caskets SKU that isn't already live.
- Enriches ALL cards with exterior dimensions + weight (the CSV has these; the
  hand-built cards never showed them).
- Keeps the existing card markup contract so search/sort/filter/modal keep working.
- Regenerates the colour filter, the cover count/price range, and specLabels.

Excludes SKUs that are live in a different catalog (269150 Lyra Natural is
categorised Metal in the CSV but ships in wood-caskets.html).

Run from the repo root:  python scripts/build_metal_caskets.py
"""
import csv, html, os, re, shutil, sys

sys.stdout.reconfigure(encoding='utf-8')

SRC   = r'D:\Property Cards\Batesville Product Images'
CSVP  = os.path.join(SRC, 'INDEX.csv')
CAT   = 'Metal Caskets'
PAGE  = 'metal-caskets.html'
IMGD  = os.path.join('casket-images', 'metal')
IMG_PX, IMG_Q = 800, 82

# Live in another catalog -> don't duplicate here.
EXCLUDE = {'269150'}

# Exterior colour -> (filter value, dropdown label). Order sets dropdown order.
BUCKETS = [
    ('white',  'White',             {'White'}),
    ('ivory',  'Ivory / Champagne', {'Ivory'}),
    ('silver', 'Silver',            {'Silver'}),
    ('grey',   'Grey / Pewter',     {'Grey'}),
    ('black',  'Black',             {'Black'}),
    ('blue',   'Blue',              {'Blue'}),
    ('green',  'Green',             {'Green'}),
    ('purple', 'Purple',            {'Violet'}),
    ('pink',   'Pink / Rose',       {'Pink'}),
    ('red',    'Red / Burgundy',    {'Red', 'Burgundy'}),
    ('brown',  'Brown / Copper',    {'Brown', 'Medium', 'Light'}),
    ('gold',   'Gold',              {'Gold'}),
]
COLOR_OF = {c: val for val, _, cols in BUCKETS for c in cols}


def num(v):
    v = (v or '').strip()
    if not v:
        return None
    try:
        return '%g' % float(v)
    except ValueError:
        return v


def feat_ending(feats, suffix):
    for f in feats:
        if f.lower().endswith(suffix):
            return f
    return None


def derive(r):
    feats = [f.strip() for f in r['features'].split(' ; ') if f.strip()]

    construction = None
    for f in feats:
        if f.lower().startswith('constructed of '):
            construction = f[len('Constructed of '):]
            break
    construction = construction or (r['material'] or '').strip() or None

    interior = feat_ending(feats, 'interior')
    finish   = feat_ending(feats, 'finish')

    suitable = None
    for f in feats:
        if f.lower().startswith('suitable for '):
            suitable = f[len('Suitable for '):]
            break

    raw_color = feat_ending(feats, 'exterior color')
    raw_color = raw_color.replace(' Exterior Color', '').strip() if raw_color else None

    L, W, H, wt = num(r['length_in']), num(r['width_in']), num(r['height_in']), num(r['weight_lbs'])
    dims = f'{L} in L x {W} in W x {H} in H' if (L and W and H) else None
    weight = f'{wt} lbs' if wt else None

    # Order matters: it drives specLabels in the modal.
    details = [d for d in (construction, interior, finish, suitable, dims, weight) if d]

    return {
        'sku': r['sku'].strip(),
        'name': r['product_name'].strip(),
        'price': float(r['price_usd']),
        'color': COLOR_OF.get(raw_color, ''),
        'raw_color': raw_color,
        'details': details,
        'filename': r['filename'],
    }


def card_html(p):
    esc = html.escape
    lines = [
        f'        <div class="product-card" data-name="{esc(p["name"].lower(), quote=True)}" '
        f'data-item="{p["sku"]}" data-price="{p["price"]:.1f}" data-color="{p["color"]}">',
        f'          <div class="product-img"><img src="{IMGD.replace(os.sep, "/")}/{p["sku"]}.jpg" '
        f'alt="{esc(p["name"], quote=True)}" loading="lazy"></div>',
        '          <div class="product-body">',
        f'            <div class="product-name">{esc(p["name"])}</div>',
        f'            <div class="product-price">${p["price"]:,.2f}</div>',
    ]
    lines += [f'            <div class="product-detail">{esc(d)}</div>' for d in p['details']]
    lines += [
        f'            <div class="product-meta">#{p["sku"]}</div>',
        '          </div>',
        '        </div>',
    ]
    return '\n'.join(lines)


def main():
    rows = [r for r in csv.DictReader(open(CSVP, encoding='utf-8')) if r['category'] == CAT]
    prods = [derive(r) for r in rows if r['sku'].strip() not in EXCLUDE]
    prods.sort(key=lambda p: p['price'])

    unmapped = sorted({p['raw_color'] for p in prods if not p['color']})
    if unmapped:
        print('WARNING unmapped colours:', unmapped)

    # ---- images ----
    os.makedirs(IMGD, exist_ok=True)
    from PIL import Image
    added = 0
    for p in prods:
        dst = os.path.join(IMGD, p['sku'] + '.jpg')
        if os.path.exists(dst):
            continue
        src = os.path.join(SRC, CAT, p['filename'])
        if not os.path.exists(src):
            print('  MISSING IMAGE', p['sku'], p['filename'])
            continue
        im = Image.open(src).convert('RGB').resize((IMG_PX, IMG_PX), Image.LANCZOS)
        im.save(dst, 'JPEG', quality=IMG_Q, optimize=True)
        added += 1
    print(f'images: +{added} new, {len(prods)} total referenced')

    # ---- patch the page ----
    s = open(PAGE, encoding='utf-8').read()

    grid_open = '<div class="product-grid" id="productGrid">'
    i = s.index(grid_open) + len(grid_open)
    j = s.index('\n    </div>\n  </div>', i)
    s = s[:i] + '\n' + '\n'.join(card_html(p) for p in prods) + s[j:]

    lo, hi = prods[0]['price'], prods[-1]['price']
    s = re.sub(r'<div class="cover-footer">.*?</div>',
               f'<div class="cover-footer">{len(prods)} caskets &middot; '
               f'${lo:,.2f} &ndash; ${hi:,.2f}</div>', s, count=1)
    s = re.sub(r'(<span class="filter-count" id="filterCount">)[^<]*(</span>)',
               rf'\g<1>{len(prods)} caskets\g<2>', s, count=1)

    used = {p['color'] for p in prods}
    opts = ['      <option value="">All Colors</option>']
    opts += [f'      <option value="{v}">{lbl}</option>' for v, lbl, _ in BUCKETS if v in used]
    s = re.sub(r'(<select class="filter-sort" id="colorFilter" onchange="filterCards\(\)">\n).*?(\n    </select>)',
               lambda m: m.group(1) + '\n'.join(opts) + m.group(2), s, count=1, flags=re.S)

    s = re.sub(r"var specLabels = \[[^\]]*\];",
               "var specLabels = ['Construction', 'Interior', 'Finish', 'Suitable for', "
               "'Dimensions', 'Weight'];", s, count=1)

    open(PAGE, 'w', encoding='utf-8', newline='').write(s)

    n_dims = sum(1 for p in prods if any(' in L x ' in d for d in p['details']))
    n_wt   = sum(1 for p in prods if any(d.endswith(' lbs') for d in p['details']))
    print(f'{PAGE}: {len(prods)} cards  (dimensions on {n_dims}, weight on {n_wt})')
    print(f'price range ${lo:,.2f} - ${hi:,.2f}')
    print('colours used:', ', '.join(sorted(used)))


if __name__ == '__main__':
    main()
