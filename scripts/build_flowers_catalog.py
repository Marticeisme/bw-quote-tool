"""Build sympathy-flowers.html, the Sympathy Flowers catalog, from scripts/flowers-data.json.

The arrangements are Love's Buds & Blooms' sympathy line (the florist on our grounds at 16445
International Blvd). Data captured from seatacbudsandblooms.com, Sympathy menu, 2026-10-11,
sorted into sections by type of arrangement; photos in flower-images/<SKU>.jpg.

The page is templated from the LIVE urns-guide.html so it carries the same engines as every other
catalog: faceted filters, sort, Compare (Specs & Photos, print), click-to-enlarge, single-product
print sheet, Print What's Filtered, bwPrintWithTitle file naming and the ?family view. Only the
catalog-specific seams are swapped. Idempotent; run from the repo root:

    python scripts/build_flowers_catalog.py
"""
import json, html, re

SRC_TEMPLATE = 'urns-guide.html'
OUT = 'sympathy-flowers.html'
FLORIST = "Love’s Buds &amp; Blooms"

D = json.load(open('scripts/flowers-data.json', encoding='utf-8'))
P = D['products']
SECS = D['sections']
e = lambda s: html.escape(str(s), quote=True)

def money(v):
    return '${:,.2f}'.format(v)

def sizes_line(p):
    return ' · '.join(f"{s['size']} {money(s['price'])}" for s in p['sizes'])

def card(p, sec_title):
    prices = [s['price'] for s in p['sizes']]
    price = money(prices[0]) if len(prices) == 1 else f"{money(min(prices))} &ndash; {money(max(prices))}"
    search = (p['name'] + ' ' + p['flowers'] + ' ' + ' '.join(p['colors'])).lower()
    det = [f'<div class="product-detail">Type: {e(sec_title)}</div>']
    if p['colors']:
        det.append(f'<div class="product-detail">Colors: {e(", ".join(p["colors"]))}</div>')
    if len(p['sizes']) > 1:
        det.append(f'<div class="product-detail">Sizes: {e(sizes_line(p))}</div>')
    det.append(f'<div class="product-detail fl-flowers">Flowers: {e(p["flowers"])}</div>')
    det.append(f'<div class="product-detail fl-about">About: {e(p["desc"])}</div>')
    return f'''        <div class="product-card" data-name="{e(search)}" data-item="{e(p['sku'].lower())}" data-price="{prices[0]}" data-type="{e(sec_title)}" data-colors="{e('|'.join(p['colors']))}">
          <div class="product-img"><img src="flower-images/{e(p['sku'])}.jpg" alt="{e(p['name'])}" loading="lazy"></div>
          <div class="product-body">
            <div class="product-name">{e(p['name'])}</div>
            <div class="product-price">{price}</div>
            {chr(10).join('            ' + d for d in det).strip()}
            <div class="product-meta">#{e(p['sku'])}</div>
            <label class="compare-toggle">
              <input type="checkbox" class="compare-cb">
              <span>Compare</span>
            </label>
          </div>
        </div>'''

# ── pieces ──────────────────────────────────────────────────────────────────────────────
counts = {s['id']: sum(1 for p in P if p['section'] == s['id']) for s in SECS}
secs = [s for s in SECS if counts[s['id']]]
lo, hi = min(p['price'] for p in P), max(max(x['price'] for x in p['sizes']) for p in P)

cover = f'''<div class="cover">
    <img src="logo.svg" alt="Bonney Watson" class="cover-logo">
    <div class="cover-kicker">BONNEY WATSON FAMILY GUIDE</div>
    <h1>Sympathy Flowers</h1>
    <div class="cover-sub">Casket sprays, standing sprays, wreaths, tributes, bouquets and baskets, arranged by {FLORIST}.</div>
    <div class="cover-rule"></div>
    <div class="cover-partner"><span>In partnership with</span><img src="flower-images/loves-logo-white.png" alt="{FLORIST}"></div>
    <div class="cover-footer">{len(P)} arrangements &middot; {money(lo)} &ndash; {money(hi)}</div>
  </div>'''

partner = f'''<div class="partner-note">
    <img src="flower-images/loves-logo.png" alt="{FLORIST}" class="partner-logo">
    <div class="partner-text">
      <div class="partner-kicker">Flowers by {FLORIST}</div>
      <p>Every arrangement in this catalog is designed and made by {FLORIST}, the florist that shares our address at 16445 International Blvd. We offer their flowers on their behalf, and we work hand in hand with them for the families we serve.</p>
      <p class="partner-fine">Prices are {FLORIST}&rsquo; listed prices as of October 2026 and may change. Arrangements with more than one size show each size and its price.</p>
    </div>
  </div>'''

contents = '''<div class="contents">
    <div class="contents-label">In This Guide</div>
    <div class="contents-grid">
''' + '\n'.join(
    f'      <div class="contents-item"><span class="contents-num">{i}</span><a href="#cat-{s["id"]}">{e(s["title"])} <span style="color:var(--text-muted);font-weight:400">({counts[s["id"]]})</span></a></div>'
    for i, s in enumerate(secs, 1)) + '''
    </div>
  </div>'''

sections = '\n\n'.join(
    f'''  <div class="section-wrap" id="cat-{s['id']}">
    <div class="section-kicker">SECTION {i}</div>
    <h2>{e(s['title'])}</h2>
    <div class="section-rule"></div>
    <p class="section-blurb">{e(s['blurb'])}</p>
    <div class="product-grid" id="grid-cat-{s['id']}">
''' + '\n'.join(card(p, s['title']) for p in P if p['section'] == s['id']) + '''
    </div>
  </div>''' for i, s in enumerate(secs, 1))

EXTRA_CSS = '''
/* ── Sympathy Flowers additions ── */
.product-img{aspect-ratio:4/5;background:#fff;}
.product-card .fl-flowers{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;}
.product-card .fl-about{display:none;}
.section-blurb{font-size:14px;color:var(--text-muted);margin:-12px 0 20px;max-width:760px;line-height:1.5;}
.cover-partner{display:flex;align-items:center;gap:14px;margin:4px 0 16px;}
.cover-partner span{font-family:'Source Sans 3',sans-serif;font-size:10.5px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.75);}
.cover-partner img{width:190px;height:auto;display:block;}
.partner-note{display:flex;gap:26px;align-items:center;background:#fff;border:1px solid var(--rule);border-left:4px solid var(--orange);border-radius:8px;padding:18px 24px;margin:0 0 28px;}
.partner-logo{width:190px;height:auto;flex-shrink:0;}
.partner-kicker{font-family:'Source Sans 3',sans-serif;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--orange);margin-bottom:6px;}
.partner-text p{font-size:14.5px;line-height:1.55;color:var(--text);margin:0 0 6px;}
.partner-text p.partner-fine{font-size:12.5px;color:var(--text-muted);margin:0;}
@media (max-width:700px){.partner-note{flex-direction:column;align-items:flex-start;}}
@media print{.cover-partner img{width:150px;}.partner-note{break-inside:avoid;}.section-blurb{font-size:10px;margin:-8px 0 10px;}}
.ps-florist,.cmp-florist{font-family:'Source Sans 3',sans-serif;font-size:10px;letter-spacing:.06em;color:#6a7686;}
'''

# ── assemble from the live urns page ────────────────────────────────────────────────────
t = open(SRC_TEMPLATE, encoding='utf-8').read().replace('\r\n', '\n')
n = 0
def rep(a, b, count=1):
    global t, n
    c = t.count(a)
    assert c == count, (c, a[:90])
    t = t.replace(a, b); n += 1
def rep_re(pat, b):
    global t, n
    t2, k = re.subn(pat, lambda m: b, t, count=1, flags=re.S)
    assert k == 1, pat[:80]
    t = t2; n += 1

rep('<title>Urn Catalog &middot; Bonney Watson</title>', '<title>Sympathy Flowers &middot; Bonney Watson</title>')
rep_re(r'<div class="cover">.*?</div>\n  </div>', cover)
rep_re(r'<div class="contents">.*?\n    </div>\n  </div>', partner + '\n\n  ' + contents)
rep_re(r'  <div class="section-wrap" id="cat-full-size">.*?(?=\n\n  <div class="doc-footer">)', sections + '\n')
rep('All urns by Batesville. Prices subject to change.', f'Flowers designed and made by {FLORIST}, 16445 International Blvd. Prices subject to change.')
rep('placeholder="Search by name or item number&hellip;"', 'placeholder="Search by name, flower or color&hellip;"')
rep('</style>\n<style>html.family-view', EXTRA_CSS + '</style>\n<style>html.family-view')

# Filters: Type, Color (several per card), Price.
rep("var NOUN = 'product';", "var NOUN = 'arrangement';")
rep_re(r"var FACETS = \[\n.*?\n  \];", """var FACETS = [
    { key:'type', label:'Type', value:function(card){ return card.getAttribute('data-type')||''; } },
    { key:'color', label:'Color', value:function(card){ var v=card.getAttribute('data-colors')||''; return v ? v.split('|') : []; } },
    { key:'price', label:'Price', value:priceBand, order:PRICE_ORDER }
  ];
  // A card can carry several values (an arrangement is often more than one color).
  function facetVals(f, card){ var v=f.value(card); return Array.isArray(v) ? v : (v ? [v] : []); }""")
rep("allCards.forEach(function(card){ var v=f.value(card); if(v){ counts[v]=(counts[v]||0)+1; } });",
    "allCards.forEach(function(card){ facetVals(f, card).forEach(function(v){ counts[v]=(counts[v]||0)+1; }); });")
rep("if(Object.keys(sel).length && !sel[f.value(card)]) return false;",
    "if(Object.keys(sel).length && !facetVals(f, card).some(function(v){ return sel[v]; })) return false;")
rep("var item = card.getAttribute('data-item')||'';", "var item = (card.getAttribute('data-item')||'').toLowerCase();")

# Compare: the fields a family weighs for flowers. Details carry their own labels.
rep("var ROW_LABELS = ['Price', 'Material', 'Capacity', 'Dimensions', 'Weight', 'Item #'];",
    "var ROW_LABELS = ['Price', 'Type', 'Sizes', 'Colors', 'Flowers', 'Item #'];")
rep_re(r"  function classifyDetail\(text\)\{.*?\n  \}\n\n  function rowValues\(data\)\{.*?\n  \}\n",
"""  function classifyDetail(text){
    var m = /^(Type|Sizes|Colors|Flowers):\\s*/.exec(text);
    return m ? m[1] : null;
  }

  function rowValues(data){
    var bucket = {};
    data.details.forEach(function(d){
      var label = classifyDetail(d);
      if (label) bucket[label] = d.replace(/^[A-Za-z]+:\\s*/, '');
    });
    var vals = [data.price];
    ROW_LABELS.slice(1, -1).forEach(function(label){
      vals.push(bucket[label] || (label === 'Sizes' ? 'One size' : '\\u2014'));
    });
    vals.push(data.item);
    return vals;
  }
""")

# Wording on every sheet.
rep('<div class="compare-title">Compare Urns</div>', '<div class="compare-title">Compare Arrangements</div>')
rep('<div class="cmp-masthead-title">Urn Comparison</div>', '<div class="cmp-masthead-title">Sympathy Flowers Comparison</div>')
rep('<div class="cmp-eyebrow">Urns</div>', f'<div class="cmp-eyebrow">Sympathy Flowers &middot; by {FLORIST}</div>')
rep('<div class="ps-masthead-title">Urn Selection</div>', '<div class="ps-masthead-title">Sympathy Flowers</div>')
rep('<div class="ps-eyebrow">Urns</div>', f'<div class="ps-eyebrow">Sympathy Flowers &middot; by {FLORIST}</div>')
rep('var SHEET_TITLE   = "Urn Selection";', 'var SHEET_TITLE   = "Sympathy Flowers";')
rep('var SHEET_EYEBROW = "Urns";', "var SHEET_EYEBROW = \"Sympathy Flowers \\u00b7 by Love\\u2019s Buds & Blooms\";")
t = t.replace('Family Service Advisor', 'Family Service Director')

open(OUT, 'w', encoding='utf-8', newline='\n').write(t)
print(f'{OUT}: {len(P)} arrangements in {len(secs)} sections, {n} template edits')
for s in secs: print(f"  {counts[s['id']]:3d}  {s['title']}")
