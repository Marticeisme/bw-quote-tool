"""
Casket facets: size, finish, wood tone, interior fabric/colour and Batesville features
for metal-caskets.html, wood-caskets.html and all-caskets.html.

Source of truth is Batesville's own data, nothing guessed:
  * INDEX.csv `features` = Batesville's "All Features" card for each SKU (captured from the
    showroom 2026-07-22; spot-checked against the public product pages 2026-11-16).
  * Oversize: Batesville's "Dimensions Comfort Index" (batesville.com/caskets/oversize,
    2025) lists the interior width of every oversize casket. Batesville's own rule on that
    page: interior wider than 26 in. = oversize; exterior over 29.5 in. needs an oversize
    vault. The feature "Oversize Burial Vault Required" marks those.

What it writes (idempotent; safe to re-run, and build_all_caskets.py re-runs it):
  * data-size / data-iw / data-finish / data-tone / data-stain / data-ifab / data-icol /
    data-feat / data-bvf on every casket card
  * a short tag row (.product-tags) on each card, never a .product-detail (Compare and the
    print sheets read .product-detail by position / content)
  * the FACETS block for each page, multi-value support in the facet engine
  * Size + Features rows in Compare, and the full Batesville feature list in the modal

Run from the repo root:  python scripts/casket_facets.py
Then rebuild the PDFs:   node scripts/build_catalog_pdfs.mjs metal-caskets wood-caskets all-caskets
"""
import csv, html, io, re, sys

INDEX = r'D:\Property Cards\Batesville Product Images\INDEX.csv'
PAGES = ['metal-caskets.html', 'wood-caskets.html', 'all-caskets.html']

def read(p):  return io.open(p, 'r', encoding='utf-8', newline='').read().replace('\r\n', '\n')
def write(p, s): io.open(p, 'w', encoding='utf-8', newline='').write(s.replace('\r\n', '\n'))

# Interior widths from Batesville's Dimensions Comfort Index (only SKUs we carry).
COMFORT_INTERIOR = {
    '284880': 28, '284883': 28, '245987': 27,                      # Bailey 28, Clifton 28, Mansfield 27
    '246018': 28, '283969': 28, '283976': 28, '283979': 28,        # ON9 Merlot, ON8 Platinum/Auburn Sunset/Violet Bouquet
    '220682': 28, '220680': 28,                                    # OS9 Antique Blue, OS9 Primrose
    '265525': 28, '265526': 28, '274279': 28, '274282': 28,        # Hercules Silver/Black/White/Blue 28
}
SIZE_STD  = 'Standard size'
SIZE_OV   = 'Oversize, fits a standard vault'
SIZE_OVV  = 'Oversize, needs an oversize vault'
SIZE_ORDER = [SIZE_STD, SIZE_OV, SIZE_OVV]

FABRICS = [('Duck Cloth', 'Duck cloth'), ('Meadowlark Cotton', 'Cotton'), ('Crepe', 'Crepe'),
           ('Velvet', 'Velvet'), ('Linwood', 'Linwood'), ('Woven', 'Woven'), ('Eyelet', 'Eyelet')]

# Batesville feature line -> (Features facet label, short card tag or None).
# Order here is the order tags appear on a card.
FEATURE_RULES = [
    (r'^Memory Safe',                              'Memory Safe® keepsake drawer', 'Memory Safe® drawer'),
    (r'^Military Branch Embroidery',               'Military / veterans emblem',    'Veterans emblem'),
    (r'Orthodox Jewish',                           'Meets Orthodox Jewish requirements', 'Orthodox Jewish'),
    (r'^Religious Motif|Pieta',                    'Religious motif',               'Religious motif'),
    (r'^Reversible Pillow',                        'Reversible pillow & overthrow', 'Reversible pillow'),
    (r'^Embroidered (Overthrow|Cap Panel)',        'Embroidered overthrow or cap panel', None),
    (r'[Oo]verlay',                                'Choice of lace or overlay',     None),
    (r'Family Choices|Decorative Kit Personalization|LifeStories Panel',
                                                   'Family Choices® personalization', None),
    (r'Decorative Casket Panel',                   'Accepts a decorative lid panel', None),
    (r'Wood (Embossed )?Bars|Solid Carved Handles', 'Wood bars or handles',         None),
    (r'Antique Hardware',                          'Antique-finish hardware',       None),
    (r'Gold Plated Hardware|Fluted Gold Bars',     'Gold-finish hardware',          None),
    (r'Environmentally friendly|Rough Sawn|Patina Finish', 'Eco-friendly finish',   'Eco-friendly'),
]

FINISH_RULES = [
    (r'^Brushed Finish',                     'Brushed'),
    (r'Dual[- ]Tone Finish',                 'Dual tone'),
    (r'High-Gloss Finish',                   'High gloss'),
    (r'^Satin Finish',                       'Satin'),
    (r'^Shaded Finish',                      'Shaded'),
    (r'Patina Finish',                       'Weathered patina'),
    (r'Ivory-Wash|Grey-Wash',                'Color wash'),
]

TONE = {'Light': 'Light', 'Medium': 'Medium', 'Dark': 'Dark', 'Grey': 'Grey', 'White': 'White'}
TONE_ORDER = ['Light', 'Medium', 'Dark', 'Grey', 'White']

# Feature lines already on the card as .product-detail lines, so the modal's
# "Batesville features" list leaves them out.
REDUNDANT = re.compile(r'^Constructed of|Interior$|^Suitable for|Painted Finish$|Exterior Color$|^Grey Exterior$')

def attr(s): return html.escape(s, quote=True)

def describe(row):
    feats = [f.strip() for f in row['features'].split(' ; ') if f.strip()]
    sku = row['sku']
    width = float(row['width_in'] or 0)
    name = row['product_name']

    # ---- size ----
    needs_vault = any(f == 'Oversize Burial Vault Required' for f in feats) or width > 29.5
    iw = COMFORT_INTERIOR.get(sku)
    # Batesville names its oversize models by interior width ("Hercules Black NGS-28",
    # "Artemis Grey 28"): every "28" model in the Comfort Index is a 28 in. interior. The
    # Artemis and Hercules NGS rows sit below the part of the index Batesville publishes.
    if not iw and re.search(r'(?:^|[\s-])28(?:$|[\s-])', name):
        iw = 28
    if needs_vault:
        m = re.search(r'\b32\b', name)
        iw = iw or (32 if m else None)
        size = SIZE_OVV
    elif iw and iw > 26:
        size = SIZE_OV
    else:
        size, iw = SIZE_STD, None

    # ---- finish / stain / tone ----
    finish = []
    for f in feats:
        for pat, lab in FINISH_RULES:
            if re.search(pat, f) and lab not in finish: finish.append(lab)
    stain = ''
    for f in feats:
        m = re.match(r'^(.+?) Stain$', f)
        if m: stain = m.group(1).strip(); break
    tone = ''
    if row['category'] == 'Wood Caskets':
        for f in feats:
            m = re.match(r'^(\w+) Exterior( Color)?$', f)
            if m and m.group(1) in TONE: tone = TONE[m.group(1)]; break

    # ---- interior ----
    ifab = icol = ''
    for f in feats:
        if not f.endswith('Interior'): continue
        body = re.sub(r'\s+', ' ', f[:-len('Interior')]).strip()
        if body.startswith('No Fabric'):
            ifab = 'No fabric'; break
        for key, lab in FABRICS:
            if body.endswith(key):
                ifab, icol = lab, body[:-len(key)].strip(); break
        if not ifab: ifab = body
        break

    # ---- features ----
    feat, tags = [], []
    for pat, lab, tag in FEATURE_RULES:
        if any(re.search(pat, f) for f in feats):
            feat.append(lab)
            if tag: tags.append(tag)

    # Card tags: size first (the reason this exists), then finish, then features. Max 4.
    card_tags = []
    if size != SIZE_STD:
        t = 'Oversize' + (' · %d in. interior' % iw if iw else '') + (' · oversize vault' if size == SIZE_OVV else '')
        card_tags.append((t, 'size'))
    for lab in finish:
        if lab in ('Brushed', 'Dual tone', 'High gloss'): card_tags.append((lab + ' finish', ''))
    card_tags += [(t, '') for t in tags]
    card_tags = card_tags[:4]

    full = [f for f in feats if not REDUNDANT.search(f)]
    return dict(size=size, iw=iw, finish=finish, stain=stain, tone=tone, ifab=ifab, icol=icol,
                feat=feat, tags=card_tags, full=full)

ATTRS = ['data-size', 'data-iw', 'data-finish', 'data-tone', 'data-stain', 'data-ifab', 'data-icol', 'data-feat', 'data-bvf']
OPEN_RE = re.compile(r'<div class="product-card"[^>]*>')
TAGS_RE = re.compile(r'\n?\s*<div class="product-tags">.*?</div>(?=\s*<div class="product-meta">)', re.S)

def tag_cards(s, rows):
    n = 0
    def fix_card(m):
        nonlocal n
        block = m.group(0)
        op = OPEN_RE.match(block).group(0)
        sku = re.search(r'data-item="([^"]+)"', op).group(1)
        row = rows.get(sku)
        new_op = op
        for a in ATTRS:
            new_op = re.sub(r' %s="[^"]*"' % a, '', new_op)
        block = new_op + block[len(op):]
        block = TAGS_RE.sub('', block)
        if not row: return block
        d = describe(row)
        add = ' data-size="%s"' % attr(d['size'])
        if d['iw']: add += ' data-iw="%d"' % d['iw']
        if d['finish']: add += ' data-finish="%s"' % attr('|'.join(d['finish']))
        if d['tone']: add += ' data-tone="%s"' % attr(d['tone'])
        if d['stain']: add += ' data-stain="%s"' % attr(d['stain'])
        if d['ifab']: add += ' data-ifab="%s"' % attr(d['ifab'])
        if d['icol']: add += ' data-icol="%s"' % attr(d['icol'])
        if d['feat']: add += ' data-feat="%s"' % attr('|'.join(d['feat']))
        if d['full']: add += ' data-bvf="%s"' % attr('|'.join(d['full']))
        block = block.replace(new_op, new_op[:-1] + add + '>', 1)
        if d['tags']:
            chips = ''.join('<span class="ptag%s">%s</span>' % (' ptag-size' if k == 'size' else '', html.escape(t))
                            for t, k in d['tags'])
            block = re.sub(r'(\n(\s*)<div class="product-meta">)',
                           lambda mm: '\n%s<div class="product-tags">%s</div>%s' % (mm.group(2), chips, mm.group(1)),
                           block, count=1)
        n += 1
        return block
    s = re.sub(r'<div class="product-card"[\s\S]*?</label>\s*</div>\s*</div>', fix_card, s)
    return s, n

# ---------------------------------------------------------------- page-level code
V = {
 'type':  "{ key:'cat', label:'Casket Type', value:function(card){ var c=card.getAttribute('data-cat')||''; return c ? c.charAt(0).toUpperCase()+c.slice(1) : ''; } }",
 'size':  "{ key:'size', label:'Size', value:function(card){ return card.getAttribute('data-size')||''; }, order:SIZE_ORDER }",
 'mat':   "{ key:'material', label:'%s', value:firstDetail }",
 'color': "{ key:'color', label:'Color', value:function(card){ var c=card.getAttribute('data-color')||''; return c ? (COLOR_LABELS[c]||c) : ''; } }",
 'tone':  "{ key:'tone', label:'Wood Tone', value:function(card){ return card.getAttribute('data-tone')||''; }, order:TONE_ORDER }",
 'finish':"{ key:'finish', label:'Finish', value:function(card){ return listAttr(card,'data-finish'); } }",
 'stain': "{ key:'stain', label:'Stain', value:function(card){ return card.getAttribute('data-stain')||''; } }",
 'ifab':  "{ key:'fabric', label:'Interior Fabric', value:function(card){ return card.getAttribute('data-ifab')||''; } }",
 'icol':  "{ key:'icolor', label:'Interior Color', value:function(card){ return card.getAttribute('data-icol')||''; } }",
 'feat':  "{ key:'feat', label:'Features', value:function(card){ return listAttr(card,'data-feat'); } }",
 'crem':  "{ key:'cremation', label:'Cremation', value:function(card){ return card.getAttribute('data-cremation')||''; } }",
 'price': "{ key:'price', label:'Price', value:priceBand, order:PRICE_ORDER }",
}
# First facet must be single-valued (verify_catalogs checks OR-within-facet sums on it).
FACET_LISTS = {
 'metal-caskets.html': ['size', ('mat', 'Gauge/Material'), 'color', 'finish', 'ifab', 'icol', 'feat', 'price'],
 'wood-caskets.html':  ['crem', 'size', ('mat', 'Wood Type'), 'tone', 'stain', 'finish', 'ifab', 'icol', 'feat', 'price'],
 'all-caskets.html':   ['type', 'size', ('mat', 'Material'), 'color', 'tone', 'finish', 'ifab', 'icol', 'feat', 'crem', 'price'],
}

HELPERS = ("  /* casket-facets:helpers */\n"
           "  var SIZE_ORDER = ['%s', '%s', '%s'];\n"
           "  var TONE_ORDER = %s;\n"
           "  function listAttr(card, a){ var v=card.getAttribute(a)||''; return v ? v.split('|') : []; }\n"
           "  function facetVals(f, card){ var v=f.value(card); return Array.isArray(v) ? v.filter(Boolean) : (v ? [v] : []); }\n"
           ) % (SIZE_STD, SIZE_OV, SIZE_OVV, repr(TONE_ORDER).replace('"', "'"))

CSS = """/* casket-facets:css */
.product-tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px;}
.ptag{display:inline-block;padding:2px 8px;border-radius:10px;background:rgba(61,90,122,.08);color:var(--navy-dark);font-size:11px;font-weight:600;line-height:1.5;letter-spacing:.01em;}
.ptag-size{background:var(--orange);color:#fff;}
.filter-bar{flex-wrap:wrap;}
.filter-bar .facets{order:10;flex:1 1 100%;}
.product-modal-feats{margin:-8px 0 18px;}
.product-modal-feats h4{font-family:'Source Sans 3',sans-serif;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted);margin:0 0 6px;}
.product-modal-feats ul{list-style:none;padding:0;margin:0;columns:2;column-gap:20px;}
.product-modal-feats li{font-size:13px;color:var(--text);padding:3px 0 3px 14px;position:relative;break-inside:avoid;}
.product-modal-feats li:before{content:'';position:absolute;left:2px;top:10px;width:5px;height:5px;border-radius:50%;background:var(--orange);}
.product-modal-feats .pmf-size{font-weight:600;color:var(--navy-dark);}
@media(max-width:600px){.product-modal-feats ul{columns:1;}}
/* eleven filters wrap to ~4 rows on a phone; a sticky bar that tall hides the cards */
@media(max-width:768px){.filter-bar{position:static;}}
@media print{.product-tags{display:none!important;}}
/* casket-facets:css-end */
"""

MODAL_JS = """<script>
/* casket-facets:modal — full Batesville feature list under the specs in the product modal */
(function(){
  var specs = document.getElementById('modalSpecs');
  if (!specs) return;
  var box = document.getElementById('modalFeats');
  if (!box){ box = document.createElement('div'); box.id='modalFeats'; box.className='product-modal-feats'; specs.parentNode.insertBefore(box, specs.nextSibling); }
  function sizeLine(card){
    var s = card.getAttribute('data-size')||'', iw = card.getAttribute('data-iw');
    if (!s || s.indexOf('Oversize') !== 0) return '';
    return 'Oversize' + (iw ? ' \\u2014 ' + iw + ' in. interior width' : '') + (s.indexOf('needs') > -1 ? ' (needs an oversize burial vault)' : ' (fits a standard burial vault)');
  }
  document.querySelectorAll('.product-card').forEach(function(card){
    card.addEventListener('click', function(){
      var list = (card.getAttribute('data-bvf')||'').split('|').filter(Boolean);
      var sz = sizeLine(card);
      box.innerHTML = '';
      if (!list.length && !sz){ box.hidden = true; return; }
      box.hidden = false;
      var h = document.createElement('h4'); h.textContent = 'Batesville features'; box.appendChild(h);
      var ul = document.createElement('ul');
      if (sz){ var l0=document.createElement('li'); l0.className='pmf-size'; l0.textContent=sz; ul.appendChild(l0); }
      list.forEach(function(t){ if (t === 'Oversize Burial Vault Required') return; var li=document.createElement('li'); li.textContent=t; ul.appendChild(li); });
      box.appendChild(ul);
    });
  });
})();
</script>
<!-- casket-facets:modal-end -->
"""

COMPARE_HELPER = ("  /* casket-facets:compare */\n"
                  "  function bwCasketExtra(sku){\n"
                  "    var c = document.querySelector('.product-card[data-item=\"' + sku + '\"]');\n"
                  "    if (!c) return ['\\u2014', '\\u2014'];\n"
                  "    var s = c.getAttribute('data-size') || '\\u2014', iw = c.getAttribute('data-iw');\n"
                  "    if (iw) s += ' (' + iw + ' in. interior)';\n"
                  "    var f = (c.getAttribute('data-finish') ? c.getAttribute('data-finish').split('|').map(function(x){ return x + ' finish'; }) : [])\n"
                  "      .concat(c.getAttribute('data-feat') ? c.getAttribute('data-feat').split('|') : []);\n"
                  "    return [s, f.length ? f.join(', ') : '\\u2014'];\n"
                  "  }\n")

def must(s, a, what):
    if s.count(a) != 1:
        print('  !! %s: anchor found %d times' % (what, s.count(a))); sys.exit(1)

def patch_page(path, s):
    # ---- CSS ----
    s = re.sub(r'/\* casket-facets:css \*/[\s\S]*?/\* casket-facets:css-end \*/\n', '', s)
    i = s.index('</style>')
    s = s[:i] + CSS + s[i:]

    # ---- facet helpers + list ----
    s = re.sub(r"  /\* casket-facets:helpers \*/\n(?:  .*\n){4}", '', s)
    anchor = '  var FACETS = ['
    must(s, anchor, path + ' FACETS')
    items = []
    for k in FACET_LISTS[path]:
        if isinstance(k, tuple): items.append(V[k[0]] % k[1])
        else: items.append(V[k])
    block = '  var FACETS = [\n' + ',\n'.join('    ' + x for x in items) + '\n  ];'
    s = re.sub(r"  var FACETS = \[\n[\s\S]*?\n  \];", lambda m: block, s, count=1)
    # Helpers go ABOVE the shared price-band ladder: test-catalog-filter-print.mjs requires
    # the text from "// Price bands" to "var FACETS = [" to be byte-identical on all six
    # catalogs, so nothing casket-only may sit inside it.
    ladder = '  // Price bands. One ladder covers every catalog'
    must(s, ladder, path + ' price-band ladder')
    s = s.replace(ladder, HELPERS + ladder, 1)

    # ---- multi-value engine ----
    s = s.replace("allCards.forEach(function(card){ var v=f.value(card); if(v){ counts[v]=(counts[v]||0)+1; } });",
                  "allCards.forEach(function(card){ facetVals(f, card).forEach(function(v){ counts[v]=(counts[v]||0)+1; }); });")
    s = s.replace("if(Object.keys(sel).length && !sel[f.value(card)]) return false;",
                  "if(Object.keys(sel).length && !facetVals(f, card).some(function(v){ return sel[v]; })) return false;")
    if 'facetVals(f, card).some' not in s or 'facetVals(f, card).forEach' not in s:
        print('  !! %s: facet engine not patched' % path); sys.exit(1)

    # ---- compare rows ----
    old_labels = "var ROW_LABELS = ['Price', 'Construction', 'Interior', 'Finish', 'Suitable for', 'Dimensions', 'Weight', 'Item #'];"
    new_labels = "var ROW_LABELS = ['Price', 'Construction', 'Interior', 'Finish', 'Suitable for', 'Dimensions', 'Weight', 'Size', 'Features', 'Item #'];"
    if old_labels in s:
        s = s.replace(old_labels, new_labels, 1)
        s = s.replace("var DIFF_ELIGIBLE = [true, true, true, true, true, true, true, false];",
                      "var DIFF_ELIGIBLE = [true, true, true, true, true, true, true, true, true, false];", 1)
        s = s.replace("var specLabels = ROW_LABELS.slice(1, -1);", "var specLabels = ROW_LABELS.slice(1, 7);", 1)
        # rowValues: push the two new values just before the Item # value
        rv = s.index('function rowValues(data){')
        k = s.index('    vals.push(data.item);', rv)
        s = s[:k] + '    vals = vals.concat(bwCasketExtra(data.sku));\n' + s[k:]
        s = s.replace('  function rowValues(data){', COMPARE_HELPER + '  function rowValues(data){', 1)
    must(s, new_labels, path + ' compare labels')
    must(s, 'vals = vals.concat(bwCasketExtra(data.sku));', path + ' compare values')

    # ---- modal features ----
    s = re.sub(r'<script>\n/\* casket-facets:modal[\s\S]*?<!-- casket-facets:modal-end -->\n', '', s)
    j = s.rindex('</body>')
    s = s[:j] + MODAL_JS + s[j:]
    return s

def main(paths=None):
    rows = {r['sku']: r for r in csv.DictReader(io.open(INDEX, encoding='utf-8'))}
    for p in (paths or PAGES):
        s = read(p)
        s, n = tag_cards(s, rows)
        s = patch_page(p, s)
        write(p, s)
        total = len(re.findall(r'<div class="product-card"', s))
        print('%s: tagged %d / %d cards' % (p, n, total))

if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main(sys.argv[1:] or None)
