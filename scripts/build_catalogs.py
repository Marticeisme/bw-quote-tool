# -*- coding: utf-8 -*-
"""
Rebuild the wood casket / urn / keepsake catalogs from the Batesville INDEX.csv.

For each catalog:
  * adds every SKU in its CSV category that isn't already live
  * enriches EVERY card with the specs the CSV carries but the page never showed
    (caskets gain dimensions + weight; urns and keepsakes gain weight, and
    keepsakes gain dimensions + a visible item number)
  * preserves cards that aren't in the CSV at all, verbatim - those are
    deliberate BW additions, not stale data
  * regenerates the cover count/price range, the filter count, specLabels and
    (wood only) the wood-type filter

Keepsakes are keyed by name slug on the live page. Matched cards are re-keyed to
the Batesville SKU so future joins are exact, while keeping their existing image
filename so no images churn.

Run from the repo root:  python scripts/build_catalogs.py [wood|urns|keepsakes|all]
"""
import csv, html, os, re, sys

sys.stdout.reconfigure(encoding='utf-8')

SRC  = r'D:\Property Cards\Batesville Product Images'
CSVP = os.path.join(SRC, 'INDEX.csv')
CUPS = 14.4  # cu in per cup of cremated remains


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


def feat_ending(feats, suffix):
    for f in feats:
        if f.lower().endswith(suffix):
            return f
    return None


def feat_starting(feats, prefix):
    for f in feats:
        if f.lower().startswith(prefix):
            return f[len(prefix):]
    return None


# ---------- per-catalog detail builders ----------

def casket_details(r, feats):
    construction = feat_starting(feats, 'constructed of ') or (r['material'] or '').strip() or None
    interior = feat_ending(feats, 'interior')
    finish   = feat_ending(feats, 'finish')
    suitable = feat_starting(feats, 'suitable for ')
    L, W, H, wt = num(r['length_in']), num(r['width_in']), num(r['height_in']), num(r['weight_lbs'])
    dims = f'{L} in L x {W} in W x {H} in H' if (L and W and H) else None
    return [d for d in (construction, interior, finish, suitable, dims,
                        f'{wt} lbs' if wt else None) if d]


def urn_details(r, feats):
    material = (r['material'] or '').strip() or None
    vol = num(r['volume_in3'])
    cap = f'{vol} cu in (~{float(vol) / CUPS:.1f} cups)' if vol else None
    L, W, H, wt = num(r['length_in']), num(r['width_in']), num(r['height_in']), num(r['weight_lbs'])
    dims = f'{H} in H x {L} in L x {W} in W' if (L and W and H) else None
    return [d for d in (material, cap, dims, f'{wt} lbs' if wt else None) if d]


WOOD_BUCKETS = [
    ('pine',             'Pine',                  lambda m: m.startswith('Pine')),
    ('hardwood-solid',   'Hardwood Solid',        lambda m: m.endswith('Solid')),
    ('hardwood-veneer',  'Hardwoods &amp; Veneers', lambda m: 'Veneer' in m),
    ('cloth',            'Cloth Covered',         lambda m: 'Cloth' in m),
]


def wood_bucket(material):
    m = (material or '').strip()
    for val, _, test in WOOD_BUCKETS:
        if test(m):
            return val
    return ''


CATALOGS = {
    'wood': dict(
        page='wood-caskets.html', cat='Wood Caskets',
        imgdir='casket-images/wood', ext='jpg', px=800, q=82,
        details=casket_details, noun='caskets',
        speclabels="['Construction', 'Interior', 'Finish', 'Suitable for', 'Dimensions', 'Weight']",
        attr='data-wood', bucket=wood_bucket, filter_id='woodFilter',
        filter_all='All Wood Types', buckets=WOOD_BUCKETS,
    ),
    'urns': dict(
        page='urns-guide.html', cat='Urns',
        imgdir='urn-images', ext='jpeg', px=400, q=80,
        details=urn_details, noun='products',
        speclabels="['Material', 'Capacity', 'Dimensions', 'Weight']",
        attr=None, bucket=None, filter_id=None,
    ),
    'keepsakes': dict(
        page='keepsake-urns-guide.html', cat='Keepsakes',
        imgdir='keepsake-images', ext='jpeg', px=400, q=80,
        details=urn_details, noun='products',
        speclabels="['Material', 'Capacity', 'Dimensions', 'Weight']",
        attr=None, bucket=None, filter_id=None, match_by_name=True,
    ),
}

CARD_RE = re.compile(r'<div class="product-card"')


def split_cards(grid_html):
    """Return list of raw card HTML strings."""
    idxs = [m.start() for m in CARD_RE.finditer(grid_html)]
    out = []
    for a, b in zip(idxs, idxs[1:] + [len(grid_html)]):
        chunk = grid_html[a:b]
        end = chunk.rfind('</div>')          # trailing close of the card
        out.append(chunk[:end + 6].rstrip())
    return out


def card_attr(card, name):
    m = re.search(rf'{name}="([^"]*)"', card)
    return m.group(1) if m else None


def build_card(sku, name, price, details, img, attr=None, attrval=None):
    esc = html.escape
    extra = f' {attr}="{attrval}"' if attr else ''
    lines = [
        f'        <div class="product-card" data-name="{esc(name.lower(), quote=True)}" '
        f'data-item="{sku}" data-price="{price:.1f}"{extra}>',
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
    grid_open = '<div class="product-grid" id="productGrid">'
    i = s.index(grid_open) + len(grid_open)
    j = s.index('\n    </div>\n  </div>', i)
    live_cards = split_cards(s[i:j])

    # index live cards
    live_by_key, live_by_name = {}, {}
    for c in live_cards:
        k = card_attr(c, 'data-item')
        nm = re.search(r'<div class="product-name">([^<]+)</div>', c)
        live_by_key[k] = c
        if nm:
            live_by_name[norm(html.unescape(nm.group(1)))] = (k, c)

    from PIL import Image
    os.makedirs(cfg['imgdir'], exist_ok=True)

    built, added_img, reused_img = [], 0, 0
    consumed = set()

    for r in rows:
        sku = r['sku'].strip()
        name = r['product_name'].strip()
        price = float(r['price_usd'])
        feats = [f.strip() for f in r['features'].split(' ; ') if f.strip()]
        details = cfg['details'](r, feats)

        # locate an existing card (by SKU, or by name for keepsakes)
        prev = live_by_key.get(sku)
        if prev is None and cfg.get('match_by_name'):
            hit = live_by_name.get(norm(name))
            if hit:
                prev, _ = hit[1], consumed.add(hit[0])
        if prev is not None:
            consumed.add(card_attr(prev, 'data-item'))

        # image: reuse the live one if present, else generate from source
        img = None
        if prev is not None:
            m = re.search(r'<img src="([^"]+)"', prev)
            if m:
                img = m.group(1)
                reused_img += 1
        if img is None:
            dst = os.path.join(cfg['imgdir'], f'{sku}.{cfg["ext"]}')
            img = dst.replace(os.sep, '/')
            if not os.path.exists(dst):
                srcimg = os.path.join(SRC, cfg['cat'], r['filename'])
                if os.path.exists(srcimg):
                    im = Image.open(srcimg).convert('RGB').resize((cfg['px'], cfg['px']), Image.LANCZOS)
                    im.save(dst, 'JPEG', quality=cfg['q'], optimize=True)
                    added_img += 1
                else:
                    print('  MISSING IMAGE', sku, r['filename'])

        attrval = cfg['bucket'](r['material']) if cfg.get('bucket') else None
        built.append((price, build_card(sku, name, price, details, img, cfg.get('attr'), attrval)))

    # preserve live cards the CSV doesn't know about
    kept = 0
    for k, c in live_by_key.items():
        if k in consumed:
            continue
        p = card_attr(c, 'data-price')
        built.append((float(p) if p else 0.0, c))
        kept += 1

    built.sort(key=lambda t: t[0])
    cards_html = '\n'.join(c for _, c in built)
    s = s[:i] + '\n' + cards_html + s[j:]

    lo, hi = built[0][0], built[-1][0]
    n = len(built)
    s = re.sub(r'<div class="cover-footer">.*?</div>',
               f'<div class="cover-footer">{n} {cfg["noun"]} &middot; ${lo:,.2f} &ndash; ${hi:,.2f}</div>',
               s, count=1)
    s = re.sub(r'(<span class="filter-count" id="filterCount">)[^<]*(</span>)',
               rf'\g<1>{n} {cfg["noun"]}\g<2>', s, count=1)
    s = re.sub(r'var specLabels = \[[^\]]*\];', f'var specLabels = {cfg["speclabels"]};', s, count=1)

    if cfg.get('filter_id'):
        used = {card_attr(c, cfg['attr']) for _, c in built}
        opts = [f'      <option value="">{cfg["filter_all"]}</option>']
        opts += [f'      <option value="{v}">{lbl}</option>' for v, lbl, _ in cfg['buckets'] if v in used]
        s = re.sub(rf'(<select class="filter-sort" id="{cfg["filter_id"]}" onchange="filterCards\(\)">\n).*?(\n    </select>)',
                   lambda m: m.group(1) + '\n'.join(opts) + m.group(2), s, count=1, flags=re.S)

    open(page, 'w', encoding='utf-8', newline='').write(s)
    print(f'{page}: {n} cards (was {len(live_cards)}) | images +{added_img} new, {reused_img} reused '
          f'| {kept} preserved not-in-CSV | ${lo:,.2f}-${hi:,.2f}')


if __name__ == '__main__':
    which = sys.argv[1] if len(sys.argv) > 1 else 'all'
    for k in (CATALOGS if which == 'all' else [which]):
        run(k)
