"""Add non-Batesville urns that Bonney Watson prices in Passare to the urn + keepsake catalogs.

Rule (Martice, 2026-11-18): only urns we actually price (Passare) get a card; photos when we have them.
Prices below were read from Passare's price list (read-only) on 2026-11-18 and match the quote tool's URN_DATA.

Photo sources (vendor brochures Martice saved to C:\\Users\\Martice\\Downloads on 2026-11-18):
  Granville_Urns_CLASSIC_brochure.pdf   -> Granville Classic (Lucinda, Stephen, Holden, Charlotte)
  Granville_Urn_SIGNATURE_brochure.pdf  -> Granville Signature (Alexandra, Carolina, Fortune, Greer, Augustus)
  Raj_Urns_Catalogue_2026.2.20_1.pdf    -> Oberg brass urns (Raj product numbers 9966, 9987, 7722)

Idempotent: removes any card with data-vendor="granville" or "oberg" and re-inserts, sorted by price
within the target section. Writes LF like the other catalog builders.

    python scripts/vendor_urn_cards.py [downloads_dir]
"""
import io, os, re, sys, html
import fitz
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DL = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.expanduser('~'), 'Downloads')
CLASSIC = os.path.join(DL, 'Granville_Urns_CLASSIC_brochure.pdf')
SIGNATURE = os.path.join(DL, 'Granville_Urn_SIGNATURE_brochure.pdf')
RAJ = os.path.join(DL, 'Raj_Urns_Catalogue_2026.2.20_1.pdf')

CARD_PX, BIG_PX, THUMB_PX = 400, 1000, 150
SIG_PAGES = [(3, 'Alexandra'), (4, 'Carolina'), (5, 'Fortune'), (6, 'Greer'), (7, 'Augustus')]
CLASSIC_SRC = {  # collection: (urn (page, img#), keepsake (page, img#)) in get_images() order
    'Lucinda': ((3, 5), (3, 7)), 'Stephen': ((3, 0), (3, 1)),
    'Holden': ((4, 0), (4, 3)), 'Charlotte': ((4, 4), (4, 5)),
}
SIG_WIDTH = {'horizontal': 301, 'vertical': 180, 'memento': 159, 'frame': 211}


def pil_from(doc, page, j):
    im = doc[page - 1].get_images(full=True)[j]
    xref, smask = im[0], im[1]
    pix = fitz.Pixmap(doc, xref)
    if pix.alpha:
        pix = fitz.Pixmap(pix, 0)
    if pix.n >= 4:
        pix = fitz.Pixmap(fitz.csRGB, pix)
    img = Image.frombytes('RGB', (pix.width, pix.height), pix.samples)
    if smask:
        m = fitz.Pixmap(doc, smask)
        mask = Image.frombytes('L', (m.width, m.height), m.samples)
        if mask.size != img.size:
            mask = mask.resize(img.size)
        white = Image.new('RGB', img.size, 'white')
        img = Image.composite(img, white, mask)
    return img


def sig_image(doc, page, kind):
    for j, im in enumerate(doc[page - 1].get_images(full=True)):
        if im[2] == SIG_WIDTH[kind] and im[3] > 150:
            return pil_from(doc, page, j)
    raise SystemExit('no %s image on Signature p%d' % (kind, page))


def squared(img, margin=0.08):
    g = img.convert('L').point(lambda v: 255 if v < 244 else 0)
    box = g.getbbox() or (0, 0) + img.size
    img = img.crop(box)
    w, h = img.size
    s = int(max(w, h) * (1 + 2 * margin))
    out = Image.new('RGB', (s, s), 'white')
    out.paste(img, ((s - w) // 2, (s - h) // 2))
    return out


def save_card(img, rel):
    im = squared(img).resize((CARD_PX, CARD_PX), Image.LANCZOS)
    os.makedirs(os.path.dirname(os.path.join(ROOT, rel)), exist_ok=True)
    im.save(os.path.join(ROOT, rel), quality=85, optimize=True)


def save_gallery(img, base_rel):
    big = squared(img, 0.05)
    if big.width > BIG_PX:
        big = big.resize((BIG_PX, BIG_PX), Image.LANCZOS)
    os.makedirs(os.path.dirname(os.path.join(ROOT, base_rel)), exist_ok=True)
    big.save(os.path.join(ROOT, base_rel + '.jpg'), quality=85, optimize=True, progressive=True)
    big.resize((THUMB_PX, THUMB_PX), Image.LANCZOS).save(os.path.join(ROOT, base_rel + '-t.jpg'), quality=80, optimize=True)
    return base_rel + '.jpg', base_rel + '-t.jpg'


def cups(ci):
    return '%d cu in (~%.1f cups)' % (ci, ci / 14.4375)


# ---- products -------------------------------------------------------------------------------
# page: 'urns' or 'keep'; details as shown on the card; gallery: list of (PIL image, caption)
def build():
    cl, sg, rj = fitz.open(CLASSIC), fitz.open(SIGNATURE), fitz.open(RAJ)
    P = []

    def gal(item, folder, pairs):
        out = []
        for img, cap in pairs:
            b, t = save_gallery(img, '%s/granville/%s-%s' % (folder, item, cap.lower()))
            out.append((b, t, cap))
        return out

    # Granville Signature
    sig = {k: [(sig_image(sg, p, k), name) for p, name in SIG_PAGES] for k in SIG_WIDTH}
    P.append(dict(page='urns', item='granville-signature-horizontal', vendor='granville', price=1620,
                  name='Granville Signature Horizontal Urn',
                  details=['Wood Inlay', cups(220), '4.5 in H x 10.63 in L x 7.13 in W', '3.5 lbs',
                           'Hand-inlaid in Italy; 5 designs'],
                  card=sig['horizontal'][0][0], gallery=gal('signature-horizontal', 'urn-images', sig['horizontal'])))
    P.append(dict(page='urns', item='granville-signature-vertical', vendor='granville', price=1620,
                  name='Granville Signature Vertical Urn',
                  details=['Wood Inlay', cups(165), '9 in H x 5.5 in L x 5.5 in W', '3.2 lbs',
                           'Hand-inlaid in Italy; 5 designs'],
                  card=sig['vertical'][0][0], gallery=gal('signature-vertical', 'urn-images', sig['vertical'])))
    P.append(dict(page='keep', item='granville-signature-memento', vendor='granville', price=900,
                  name='Granville Signature Memento Keepsake',
                  details=['Wood Inlay', cups(10), '4.25 in H x 3.5 in L x 3.5 in W', '1 lb',
                           'Velvet-lined top compartment; remains in the base'],
                  card=sig['memento'][0][0], gallery=gal('signature-memento', 'keepsake-images', sig['memento'])))
    P.append(dict(page='keep', item='granville-signature-frame', vendor='granville', price=490,
                  name='Granville Signature Memento Frame',
                  details=['Wood Inlay', 'Holds a 5 x 7 in photo', '9.5 in H x 7.5 in W x 0.75 in D', '1.2 lbs',
                           'Recessed space for remains on the back'],
                  card=sig['frame'][0][0], gallery=gal('signature-frame', 'keepsake-images', sig['frame'])))

    # Granville Classic
    cu = [(pil_from(cl, *v[0]), k) for k, v in CLASSIC_SRC.items()]
    ck = [(pil_from(cl, *v[1]), k) for k, v in CLASSIC_SRC.items()]
    P.append(dict(page='urns', item='granville-classic-horizontal', vendor='granville', price=1005,
                  name='Granville Classic Horizontal Urn',
                  details=['Wood Inlay', cups(220), '4.5 in H x 10.63 in L x 7.13 in W', '3.5 lbs',
                           'Hand-inlaid in Italy; 4 designs'],
                  card=cu[0][0], gallery=gal('classic-horizontal', 'urn-images', cu)))
    P.append(dict(page='keep', item='granville-classic-keepsake', vendor='granville', price=415,
                  name='Granville Classic Keepsake',
                  details=['Wood Inlay', cups(10), '1.88 in H x 4.5 in L x 3.5 in W', '9 oz',
                           'Hand-inlaid in Italy; 4 designs'],
                  card=ck[0][0], gallery=gal('classic-keepsake', 'keepsake-images', ck)))

    # Oberg brass (Raj product numbers)
    # Priced in Passare, no photo anywhere yet (2026-11-18): placeholder tile. Material only when the
    # Passare name itself states it; nothing else is known, so nothing else is shown.
    for page, grid, item, vendor, meta, price, name, mat, use in [
        ('urns', 'full-size', 'eagle-in-flight', 'bw-stock', None, 2460, 'Eagle in Flight Bronze Urn', 'Bronze', ''),
        ('urns', 'full-size', 'seasons-sundial', 'bw-stock', None, 1730, 'Seasons Sundial Urn', '', ''),
        ('urns', 'full-size', 'flora-maple-memento', 'bw-stock', None, 1230, 'Flora Maple Memento Chest', 'Maple', ''),
        ('urns', 'full-size', 'matthews-interlude', 'matthews', 'Matthews', 665, 'Interlude Urn', '', ''),
        ('urns', 'full-size', 'symphony-memento', 'bw-stock', None, 555, 'Symphony Memento Urn', '', ''),
        ('urns', 'full-size', 'teak-bell-jar-marble', 'bw-stock', None, 535, 'Teak Bell Jar Marble Urn', 'Marble', ''),
        ('urns', 'full-size', 'walters-halo', 'walters', 'Gerri Walters', 505, 'Halo Urn', '', ''),
        ('urns', 'full-size', 'walters-raku-copper', 'walters', 'Gerri Walters', 505, 'Raku Inspired Copper Urn', '', ''),
        ('urns', 'full-size', 'walters-raku-dalphine', 'walters', 'Gerri Walters', 505, 'Raku Inspired Dalphine Urn', '', ''),
        ('urns', 'full-size', 'lleyton', 'bw-stock', None, 450, 'Lleyton Urn', '', ''),
        ('urns', 'full-size', 'suffolk-aluminum', 'bw-stock', None, 395, 'Suffolk Aluminum Urn', 'Aluminum', ''),
        ('urns', 'full-size', 'margaux', 'bw-stock', None, 375, 'Margaux Urn', '', ''),
        ('urns', 'full-size', 'walters-lotus-blossom', 'walters', 'Gerri Walters', 335, 'Lotus Blossom Urn', '', ''),
        ('urns', 'full-size', 'walters-peace', 'walters', 'Gerri Walters', 335, 'Peace Urn', '', ''),
        ('urns', 'full-size', 'walters-pride-of-seattle', 'walters', 'Gerri Walters', 335, 'Pride of Seattle Urn', '', ''),
        ('urns', 'full-size', 'holton-distressed-memento', 'bw-stock', None, 320, 'Holton Distressed Memento Chest', '', ''),
        ('urns', 'full-size', 'bennington-rustic', 'bw-stock', None, 200, 'Bennington Rustic Urn', '', ''),
        ('urns', 'companion', 'ellison-dual-capacity', 'bw-stock', None, 465, 'Ellison Dual Capacity Urn', '', ''),
        ('urns', 'biodegradable', 'spiritual-reflections', 'bw-stock', None, 560, 'Spiritual Reflections Biodegradable Urn', '', ''),
        ('urns', 'scattering', 'multipurpose-scatter', 'bw-stock', None, 235, 'Multipurpose/Scatter Urn', '', 'Scattering'),
        ('keep', 'keepsake', 'walters-raku-heart', 'walters', 'Gerri Walters', 200, 'Raku Inspired Keepsake Heart', '', ''),
    ]:
        P.append(dict(page=page, grid=grid, item=item, vendor=vendor, price=price, name=name,
                      details=[mat] if mat else [], meta=meta or 'Ask to see this one', use=use,
                      card=None, gallery=None))

    for page, item, price, name, src, num, kind in [
        ('urns', 'oberg-american-pride', 260, 'American Pride Urn', (7, 10), '9966-10', 'Full size'),
        ('urns', 'oberg-grecian-blue', 260, 'Grecian Blue Brass Urn', (8, 23), '9987-10', 'Full size'),
        ('urns', 'oberg-blue-loving-doves', 260, 'Blue Loving Doves Urn', (8, 18), '7722-9', 'Full size'),
        ('keep', 'oberg-american-pride-keepsake', 90, 'American Pride Keepsake', (7, 8), '9966-3', 'Keepsake'),
        ('keep', 'oberg-grecian-blue-heart', 105, 'Grecian Blue Brass Heart Keepsake', (8, 13), '9987-H', 'Heart keepsake with stand'),
        ('keep', 'oberg-blue-loving-doves-heart', 105, 'Blue Loving Doves Heart Keepsake', (8, 2), '7722-H', 'Heart keepsake with stand'),
        ('keep', 'oberg-blue-loving-doves-token', 70, 'Blue Loving Doves Token', (8, 1), '7722-3', 'Token keepsake'),
    ]:
        P.append(dict(page=page, item=item, vendor='oberg', price=price, name=name,
                      details=['Brass', kind], meta='Oberg #' + num, card=pil_from(rj, *src), gallery=None))
    for p in P:
        p.setdefault('grid', 'full-size' if p['page'] == 'urns' else 'keepsake')
    return P


PHOTO_DROP = os.path.join(ROOT, 'scratch', 'urn-photos')  # Martice's own photos: <item>.jpg overrides the placeholder


def placeholder(rel):
    from PIL import ImageDraw, ImageFont
    im = Image.new('RGB', (CARD_PX, CARD_PX), (246, 242, 233))
    d = ImageDraw.Draw(im)
    try:
        f1 = ImageFont.truetype(r'C:\Windows\Fonts\georgia.ttf', 26)
        f2 = ImageFont.truetype(r'C:\Windows\Fonts\segoeui.ttf', 17)
    except OSError:
        f1 = f2 = ImageFont.load_default()
    for txt, f, y in [('Photo coming soon', f1, 178), ('Ask to see it in person', f2, 216)]:
        w = d.textlength(txt, font=f)
        d.text(((CARD_PX - w) / 2, y), txt, font=f, fill=(70, 110, 134) if f is f1 else (110, 110, 110))
    d.line([(170, 252), (230, 252)], fill=(232, 70, 16), width=2)
    im.save(os.path.join(ROOT, rel), quality=90)


def card_html(p, img_rel):
    attrs = 'data-name="%s" data-item="%s" data-vendor="%s" data-price="%.1f"' % (
        html.escape(p['name'].lower()), p['item'], p['vendor'], p['price'])
    if p.get('use'):
        attrs += ' data-use="%s"' % p['use']
    if p.get('pending'):
        attrs += ' data-photo="pending"'
    badge = ''
    if p['gallery']:
        val = '|'.join('%s~%s~%s' % (b, t, c) for b, t, c in p['gallery'])
        attrs += ' data-gallery="%s"' % html.escape(val, quote=True)
        badge = ('            <div class="product-gallery-badge"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/>'
                 '<rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>'
                 '<rect x="14" y="14" width="7" height="7"/></svg>See %d designs</div>\n' % len(p['gallery']))
    det = ''.join('            <div class="product-detail">%s</div>\n' % html.escape(d) for d in p['details'])
    meta = p.get('meta') or 'Granville Urns'
    return ('        <div class="product-card" %s>\n'
            '          <div class="product-img"><img src="%s" alt="%s" loading="lazy"></div>\n'
            '          <div class="product-body">\n'
            '            <div class="product-name">%s</div>\n'
            '            <div class="product-price">$%s</div>\n'
            '%s%s'
            '            <div class="product-meta">%s</div>\n'
            '            <label class="compare-toggle">\n'
            '              <input type="checkbox" class="compare-cb">\n'
            '              <span>Compare</span>\n'
            '            </label>\n'
            '          </div>\n'
            '        </div>\n') % (attrs, img_rel, html.escape(p['name']), html.escape(p['name']),
                                   '{:,.2f}'.format(p['price']), det, badge, html.escape(meta))


CARD_RE = re.compile(r'        <div class="product-card" [^>]*>\n.*?\n          </div>\n        </div>\n', re.S)


def patch(path, by_grid):
    """by_grid: {grid_id: [card html]}. Strips every card this script owns, then merges by price."""
    s = io.open(path, 'r', encoding='utf-8', newline='').read().replace('\r\n', '\n')
    s = CARD_RE.sub(lambda m: '' if re.search(r'data-vendor="(granville|oberg|walters|matthews|bw-stock)"', m.group(0)[:400]) else m.group(0), s)
    price = lambda c: float(re.search(r'data-price="([0-9.]+)"', c).group(1))
    report = []
    for grid_id, cards in by_grid.items():
        head = '<div class="product-grid" id="%s">\n' % grid_id
        start = s.index(head) + len(head)
        end = s.index('\n    </div>\n  </div>', start) + 1
        grid = s[start:end]
        existing = CARD_RE.findall(grid)
        assert ''.join(existing) == grid, 'unexpected markup in ' + grid_id
        merged = sorted(existing + cards, key=price)  # stable: new cards land after equal-priced existing ones
        s = s[:start] + ''.join(merged) + s[end:]
        report.append('%s: existing %d + new %d' % (grid_id, len(existing), len(cards)))
    io.open(path, 'w', encoding='utf-8', newline='').write(s)
    return report


def main():
    P = build()
    out = {}
    for p in P:
        folder = 'urn-images' if p['page'] == 'urns' else 'keepsake-images'
        rel = '%s/%s.jpeg' % (folder, p['item'])
        note = '%d designs' % len(p['gallery']) if p['gallery'] else ''
        if p['card'] is None:
            own = os.path.join(PHOTO_DROP, p['item'] + '.jpg')
            if os.path.exists(own):
                save_card(Image.open(own).convert('RGB'), rel); note = 'your photo'
            else:
                placeholder(rel); p['pending'] = True; note = 'PLACEHOLDER'
        else:
            save_card(p['card'], rel)
        out.setdefault((p['page'], p['grid']), []).append(card_html(p, rel))
        print('%-5s %-13s %-40s $%8.2f  %s' % (p['page'], p['grid'], p['name'], p['price'], note))
    for page, f in [('urns', 'urns-guide.html'), ('keep', 'keepsake-urns-guide.html')]:
        by_grid = {'grid-cat-' + g: c for (pg, g), c in out.items() if pg == page}
        print(f, '|', ' ; '.join(patch(os.path.join(ROOT, f), by_grid)))


if __name__ == '__main__':
    main()
