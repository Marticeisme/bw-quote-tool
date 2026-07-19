"""Generate urns-guide.html and keepsake-urns-guide.html with real product photos."""
import json, os, html as html_mod


def categorize_urn(u):
    name = u['name'].lower()
    details = ' '.join(u.get('details', [])).lower()
    vol = 0
    for s in u.get('specs', []):
        if 'Volume' in s:
            try: vol = int(s.split(':')[1].strip().split()[0])
            except: pass
    if 'companion' in name or 'dual capacity' in details or 'dual' in name or 'chest' in name:
        return 'Companion & Dual-Capacity Urns'
    if 'biodegradable' in details or 'biodegradable' in name:
        return 'Biodegradable & Water Urns'
    if 'scatter' in name or 'scatter' in details:
        return 'Scattering Urns'
    if 'keepsake' in name or 'keepsake' in details:
        return 'Keepsake & Sharing Urns'
    if 'mini' in name or 'miniature' in name or (vol > 0 and vol < 20):
        return 'Miniature Urns'
    return 'Full-Size Urns'


def get_material(details):
    for d in details:
        if d.startswith('Constructed of '):
            return d.replace('Constructed of ', '')
    return ''


def get_volume(specs):
    for s in specs:
        if 'Volume' in s:
            return s.split(':')[1].strip()
    return ''


def card_html(item, img_dir):
    name = html_mod.escape(item['name'])
    price = item['price'] if isinstance(item['price'], str) else f"${item['price']:,.2f}"
    item_num = item.get('item_num', '')
    material = get_material(item.get('details', []))
    volume = get_volume(item.get('specs', []))
    img_file = f"{img_dir}/{item_num}.jpeg" if item_num else ''
    if not item_num:
        img_base = os.path.basename(item.get('image', ''))
        img_file = f"{img_dir}/{img_base}"

    detail_parts = []
    if material:
        detail_parts.append(material.replace('®', '').replace('™', ''))
    if volume:
        detail_parts.append(volume)
    detail_html = ''
    for d in detail_parts:
        detail_html += f'            <div class="product-detail">{html_mod.escape(d)}</div>\n'

    is_numeric_item = item_num and item_num.isdigit()
    meta_line = f'            <div class="product-meta">#{item_num}</div>\n' if is_numeric_item else ''

    return (
        f'        <div class="product-card" data-name="{name.lower()}"'
        f' data-item="{item_num}" data-price="{item["price"] if isinstance(item["price"], (int,float)) else 0}">\n'
        f'          <div class="product-img">'
        f'<img src="{img_file}" alt="{name}" loading="lazy"></div>\n'
        f'          <div class="product-body">\n'
        f'            <div class="product-name">{name}</div>\n'
        f'            <div class="product-price">{price}</div>\n'
        f'{detail_html}'
        f'{meta_line}'
        f'          </div>\n'
        f'        </div>\n'
    )


def generate_catalog(title, subtitle, sections, img_dir, out_file, grid_cols=3):
    total = sum(len(items) for _, _, items in sections)
    all_prices = []
    for _, _, items in sections:
        for it in items:
            p = it['price'] if isinstance(it['price'], (int, float)) else float(it['price'].replace('$','').replace(',',''))
            all_prices.append(p)
    price_lo = f"${min(all_prices):,.2f}"
    price_hi = f"${max(all_prices):,.2f}"

    toc_html = ""
    sections_html = ""
    for idx, (sec_id, sec_title, items) in enumerate(sections, 1):
        items.sort(key=lambda x: x['price'] if isinstance(x['price'], (int, float)) else float(x['price'].replace('$','').replace(',','')), reverse=True)
        toc_html += (
            f'      <div class="contents-item"><span class="contents-num">{idx}</span>'
            f'<a href="#{sec_id}">{sec_title} '
            f'<span style="color:var(--text-muted);font-weight:400">({len(items)})</span></a></div>\n'
        )
        cards = ""
        for it in items:
            cards += card_html(it, img_dir)
        sections_html += f"""
  <div class="section-wrap" id="{sec_id}">
    <div class="section-kicker">SECTION {idx}</div>
    <h2>{sec_title}</h2>
    <div class="section-rule"></div>
    <div class="product-grid" id="grid-{sec_id}">
{cards}    </div>
  </div>
"""

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title} &middot; Bonney Watson</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Source+Sans+3:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {{
  --navy:#3d5a7a; --navy-dark:#2c445e; --navy-deep:#1e3a55;
  --orange:#c8540a; --orange-dark:#a5450a; --orange-soft:#dda06e;
  --white:#ffffff; --offwhite:#f4f6f8; --cream:#f8f6f2; --card-white:#fff;
  --warm-border:#e6e1d7; --rule:#ddd6c8;
  --text:#3a4453; --text-dark:#1a2332; --text-muted:#6a7686;
  --sidebar-bg:#f9f8f5;
}}
*{{box-sizing:border-box;margin:0;padding:0;}}
body{{font-family:'Source Sans 3',sans-serif;font-size:15px;background:var(--offwhite);color:var(--text);line-height:1.6;}}

.site-nav{{background:var(--navy);position:sticky;top:0;z-index:100;box-shadow:0 2px 12px rgba(0,0,0,.25);}}
.nav-inner{{max-width:1100px;margin:0 auto;padding:10px 24px;display:flex;align-items:center;gap:18px;}}
.nav-logo{{height:22px;width:auto;flex-shrink:0;}}
.nav-est{{font-family:'Cormorant Garamond',serif;font-size:12px;color:rgba(255,255,255,.5);font-style:italic;white-space:nowrap;}}
.nav-spacer{{flex:1;}}
.nav-back{{color:#fff;font-size:12px;font-weight:600;text-decoration:none;padding:6px 12px;border:1px solid rgba(255,255,255,.3);border-radius:6px;white-space:nowrap;transition:background .15s;}}
.nav-back:hover{{background:rgba(255,255,255,.12);}}

.doc-sheet{{max-width:960px;margin:0 auto;background:var(--cream);border-radius:0 0 4px 4px;box-shadow:0 4px 30px rgba(0,0,0,.08);min-height:100vh;}}

.cover{{background:var(--navy);padding:64px 48px 56px;position:relative;overflow:hidden;}}
.cover::before{{content:'';position:absolute;top:50%;left:50%;width:600px;height:600px;background:radial-gradient(circle,rgba(200,84,10,.12) 0%,transparent 70%);transform:translate(-50%,-50%);pointer-events:none;}}
.cover-logo{{height:34px;width:auto;display:block;margin-bottom:24px;position:relative;}}
.cover-kicker{{font-family:'Source Sans 3',sans-serif;font-size:12px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--orange);margin-bottom:10px;position:relative;}}
.cover h1{{font-family:'Cormorant Garamond',serif;font-size:44px;font-weight:600;color:#fff;line-height:1.15;margin-bottom:16px;position:relative;}}
.cover-sub{{font-family:'Cormorant Garamond',serif;font-size:18px;font-style:italic;color:rgba(255,255,255,.7);line-height:1.5;max-width:540px;position:relative;}}
.cover-rule{{width:50px;height:3px;background:var(--orange);margin:24px 0;border-radius:2px;position:relative;}}
.cover-footer{{font-size:11px;font-weight:600;letter-spacing:.15em;text-transform:uppercase;color:rgba(255,255,255,.4);position:relative;}}

.contents{{padding:40px 48px;border-bottom:1px solid var(--rule);}}
.contents-label{{font-family:'Source Sans 3',sans-serif;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--orange);margin-bottom:18px;}}
.contents-grid{{display:grid;grid-template-columns:1fr 1fr;gap:0;}}
.contents-item{{display:flex;align-items:baseline;gap:12px;padding:12px 0;border-bottom:1px solid var(--rule);}}
.contents-item:nth-last-child(-n+2){{border-bottom:none;}}
.contents-num{{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;color:var(--orange);min-width:20px;}}
.contents-item a{{font-size:14px;font-weight:600;color:var(--navy);text-decoration:none;transition:color .15s;}}
.contents-item a:hover{{color:var(--orange);}}

.filter-bar{{padding:20px 48px;background:var(--sidebar-bg);border-bottom:1px solid var(--rule);display:flex;align-items:center;gap:14px;position:sticky;top:42px;z-index:50;}}
.filter-bar input{{flex:0 0 280px;padding:9px 14px;border:1px solid var(--warm-border);border-radius:8px;font-family:'Source Sans 3',sans-serif;font-size:13.5px;outline:none;background:var(--white);}}
.filter-bar input:focus{{border-color:var(--navy);box-shadow:0 0 0 3px rgba(61,90,122,.1);}}
.filter-count{{color:var(--text-muted);font-size:12.5px;}}
.filter-sort{{padding:8px 12px;border:1px solid var(--warm-border);border-radius:8px;font-family:'Source Sans 3',sans-serif;font-size:13px;background:var(--white);color:var(--text);cursor:pointer;}}

.section-wrap{{padding:48px 48px 40px;}}
.section-wrap + .section-wrap{{border-top:1px solid var(--rule);}}
.section-kicker{{font-family:'Source Sans 3',sans-serif;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--orange);margin-bottom:6px;}}
.section-wrap h2{{font-family:'Cormorant Garamond',serif;font-size:34px;font-weight:600;color:var(--navy-dark);line-height:1.2;margin-bottom:8px;}}
.section-rule{{width:50px;height:2.5px;background:var(--orange);border-radius:2px;margin-bottom:24px;}}

.product-grid{{display:grid;grid-template-columns:repeat({grid_cols},1fr);gap:18px;margin-bottom:32px;}}
.product-card{{background:var(--card-white);border:1px solid var(--warm-border);border-radius:10px;overflow:hidden;transition:box-shadow .2s,transform .2s;}}
.product-card:hover{{box-shadow:0 6px 24px rgba(0,0,0,.08);transform:translateY(-2px);}}
.product-img{{aspect-ratio:1/1;background:var(--sidebar-bg);overflow:hidden;}}
.product-img img{{width:100%;height:100%;object-fit:cover;display:block;}}
.product-body{{padding:12px 14px 14px;}}
.product-name{{font-family:'Cormorant Garamond',serif;font-size:17px;font-weight:600;color:var(--navy-dark);line-height:1.2;margin-bottom:3px;}}
.product-price{{font-family:'Source Sans 3',sans-serif;font-size:16px;font-weight:700;color:var(--navy);margin-bottom:3px;font-variant-numeric:tabular-nums;}}
.product-detail{{font-size:12px;color:var(--text);line-height:1.4;}}
.product-meta{{font-size:10px;color:var(--text-muted);line-height:1.3;margin-top:4px;font-family:monospace;}}

.doc-footer{{background:var(--cream);padding:48px 48px 40px;border-top:1px solid var(--rule);text-align:center;}}
.doc-footer .footer-logo{{height:24px;width:auto;margin:0 auto 14px;display:block;}}
.doc-footer .footer-hours{{font-size:14px;color:var(--text);margin-bottom:4px;}}
.doc-footer .footer-url{{font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--orange);margin-bottom:12px;}}
.doc-footer .footer-legal{{font-size:12px;color:var(--text-muted);}}

.site-footer{{padding:22px 24px;background:var(--navy);color:rgba(255,255,255,.6);text-align:center;font-size:12px;}}
.site-footer a{{color:rgba(255,255,255,.75);text-decoration:none;}}

@media(max-width:768px){{
  .doc-sheet{{margin:0;}}
  .cover,.section-wrap,.contents{{padding-left:24px;padding-right:24px;}}
  .cover h1{{font-size:32px;}}
  .product-grid{{grid-template-columns:1fr 1fr;}}
  .contents-grid{{grid-template-columns:1fr;}}
  .filter-bar{{padding:16px 24px;flex-wrap:wrap;}}
  .filter-bar input{{flex:1 1 200px;}}
}}
@media(max-width:480px){{
  .product-grid{{grid-template-columns:1fr;}}
}}

@media print {{
  @page{{size:letter;margin:.5in;}}
  body{{background:#fff;font-size:10pt;-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
  .site-nav,.site-footer,.nav-back,.filter-bar{{display:none!important;}}
  .doc-sheet{{max-width:none;box-shadow:none;margin:0;border-radius:0;}}
  .cover{{padding:36px 0 30px;border-radius:0;}}
  .cover h1{{font-size:26pt;}}
  .section-wrap,.contents{{padding-left:0;padding-right:0;}}
  .product-card{{break-inside:avoid;}}
  .product-grid{{grid-template-columns:repeat({grid_cols},1fr);gap:10px;}}
  .product-card:hover{{box-shadow:none;transform:none;}}
  .product-name{{font-size:13px;}}
  .product-price{{font-size:12px;}}
  .product-detail{{font-size:9px;}}
  .product-meta{{font-size:8px;}}
}}
</style>
</head>
<body>

<nav class="site-nav no-print">
  <div class="nav-inner">
    <img src="logo.svg" alt="Bonney Watson" class="nav-logo">
    <span class="nav-est">Est. 1868</span>
    <div class="nav-spacer"></div>
    <a class="nav-back" href="guides.html">&larr; All Guides</a>
  </div>
</nav>

<div class="doc-sheet">

  <div class="cover">
    <img src="logo.svg" alt="Bonney Watson" class="cover-logo">
    <div class="cover-kicker">BONNEY WATSON FAMILY GUIDE</div>
    <h1>{title}</h1>
    <div class="cover-sub">{subtitle}</div>
    <div class="cover-rule"></div>
    <div class="cover-footer">{total} products &middot; {price_lo} &ndash; {price_hi}</div>
  </div>

  <div class="filter-bar no-print">
    <input type="text" id="searchInput" placeholder="Search by name or item number&hellip;" oninput="filterCards()">
    <select class="filter-sort" id="sortSelect" onchange="filterCards()">
      <option value="price-desc">Price: High to Low</option>
      <option value="price-asc">Price: Low to High</option>
      <option value="name-asc">Name: A to Z</option>
    </select>
    <span class="filter-count" id="filterCount">{total} products</span>
  </div>

  <div class="contents">
    <div class="contents-label">In This Guide</div>
    <div class="contents-grid">
{toc_html}    </div>
  </div>
{sections_html}
  <div class="doc-footer">
    <img src="logo-navy.svg" alt="Bonney Watson" class="footer-logo">
    <div class="footer-hours">Serving Seattle families since 1868 &middot; Washington Memorial Park</div>
    <div class="footer-url">bonneywatson.com</div>
    <div class="footer-legal">16445 International Blvd, SeaTac, WA 98188 &middot; 206-445-9794<br>All urns by Batesville. Prices subject to change.</div>
  </div>

</div>

<footer class="site-footer no-print">
  <a href="guides.html">&larr; Back to Family Guides &amp; Resources</a>
</footer>

<script>
function filterCards() {{
  var q = document.getElementById('searchInput').value.trim().toLowerCase();
  var sort = document.getElementById('sortSelect').value;
  var cards = Array.from(document.querySelectorAll('.product-card'));
  var visible = 0;
  cards.forEach(function(card) {{
    var name = card.getAttribute('data-name');
    var item = card.getAttribute('data-item');
    var match = !q || name.indexOf(q) > -1 || item.indexOf(q) > -1;
    card.style.display = match ? '' : 'none';
    if (match) visible++;
  }});
  document.querySelectorAll('.section-wrap[id]').forEach(function(sec) {{
    var any = Array.from(sec.querySelectorAll('.product-card')).some(function(c) {{ return c.style.display !== 'none'; }});
    sec.style.display = any ? '' : 'none';
  }});
  document.getElementById('filterCount').textContent = visible + ' product' + (visible === 1 ? '' : 's');
}}
</script>

</body>
</html>"""

    with open(out_file, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f"Written {out_file}: {total} products with photos")


if __name__ == '__main__':
    # --- URN CATALOG ---
    with open('scratch/_urncatalog/products_corrected.json') as f:
        urns = json.load(f)

    cat_order = [
        ('cat-full-size', 'Full-Size Urns'),
        ('cat-companion', 'Companion & Dual-Capacity Urns'),
        ('cat-biodegradable', 'Biodegradable & Water Urns'),
        ('cat-scattering', 'Scattering Urns'),
        ('cat-keepsake', 'Keepsake & Sharing Urns'),
        ('cat-miniature', 'Miniature Urns'),
    ]
    buckets = {title: [] for _, title in cat_order}
    for u in urns:
        cat = categorize_urn(u)
        if cat in buckets:
            buckets[cat].append(u)
        else:
            buckets['Full-Size Urns'].append(u)

    sections = [(sid, stitle, buckets[stitle]) for sid, stitle in cat_order if buckets[stitle]]

    generate_catalog(
        "Urn Catalog",
        "Cremation urns from Batesville — full-size, companion, biodegradable, and keepsake options.",
        sections, "urn-images", "urns-guide.html", grid_cols=4
    )

    # --- KEEPSAKE CATALOG ---
    with open('scratch/_keepsakecatalog/products.json') as f:
        keeps = json.load(f)

    # Normalize price to float
    for k in keeps:
        if isinstance(k['price'], str):
            k['price_float'] = float(k['price'].replace('$', '').replace(',', ''))
        else:
            k['price_float'] = float(k['price'])
        # Set item_num from image filename if not present
        if 'item_num' not in k:
            k['item_num'] = os.path.splitext(os.path.basename(k.get('image', '')))[0]

    # Categorize keepsakes
    keep_cats = {
        'Keepsake Urns': [],
        'Miniature Urns': [],
        'Pendants & Jewelry': [],
        'Wind Chimes & Accessories': [],
    }
    for k in keeps:
        name = k['name'].lower()
        if 'pendant' in name or 'jewelry' in name or 'necklace' in name:
            keep_cats['Pendants & Jewelry'].append(k)
        elif 'wind chime' in name or 'chimes' in name:
            keep_cats['Wind Chimes & Accessories'].append(k)
        elif 'mini' in name or 'miniature' in name:
            keep_cats['Miniature Urns'].append(k)
        else:
            keep_cats['Keepsake Urns'].append(k)

    keep_order = [
        ('cat-keepsake', 'Keepsake Urns'),
        ('cat-miniature', 'Miniature Urns'),
        ('cat-pendants', 'Pendants & Jewelry'),
        ('cat-accessories', 'Wind Chimes & Accessories'),
    ]

    def keepsake_card_html(item):
        name = html_mod.escape(item['name'])
        price = item['price'] if isinstance(item['price'], str) else f"${item['price']:,.2f}"
        item_num = item.get('item_num', '')
        img_base = os.path.basename(item.get('image', ''))
        img_file = f"keepsake-images/{img_base}"
        material = get_material(item.get('details', []))

        detail_html = ''
        if material:
            detail_html = f'            <div class="product-detail">{html_mod.escape(material)}</div>\n'

        price_val = item.get('price_float', 0)
        return (
            f'        <div class="product-card" data-name="{name.lower()}"'
            f' data-item="{item_num}" data-price="{price_val}">\n'
            f'          <div class="product-img">'
            f'<img src="{img_file}" alt="{name}" loading="lazy"></div>\n'
            f'          <div class="product-body">\n'
            f'            <div class="product-name">{name}</div>\n'
            f'            <div class="product-price">{price}</div>\n'
            f'{detail_html}'
            f'          </div>\n'
            f'        </div>\n'
        )

    # Override card_html for keepsakes
    orig_card = card_html
    def card_html_keep(item, img_dir):
        return keepsake_card_html(item)

    # Monkey-patch for keepsake generation
    import types
    keep_sections = [(sid, stitle, keep_cats[stitle]) for sid, stitle in keep_order if keep_cats[stitle]]

    generate_catalog(
        "Keepsake Urn Catalog",
        "Miniature urns, keepsakes, pendants, and memorial accessories from Batesville.",
        keep_sections, "keepsake-images", "keepsake-urns-guide.html", grid_cols=4
    )
