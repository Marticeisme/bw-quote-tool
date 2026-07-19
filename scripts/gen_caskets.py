"""Generate metal-caskets.html and wood-caskets.html with real Batesville photos."""
import json

def extract_details(features):
    """Pull key specs from Batesville feature list."""
    construction = ''
    interior = ''
    finish = ''
    stain = ''
    suitable = ''
    exterior_color = ''
    for f in features:
        fl = f.lower()
        if 'constructed of' in fl:
            construction = f.replace('Constructed of ', '')
        elif 'interior' in fl and not interior:
            interior = f
        elif 'painted finish' in fl or 'brushed finish' in fl or 'high-gloss finish' in fl or 'satin finish' in fl:
            if 'Painted Finish' in f:
                finish = f.replace(' Painted Finish', '') + ' painted'
            elif 'Brushed Finish' in f:
                finish = 'Brushed'
            elif 'High-Gloss' in f:
                finish = 'High-gloss'
            elif 'Satin' in f:
                finish = 'Satin'
        elif 'stain' in fl and 'stain' not in (stain or '').lower():
            stain = f
        elif 'suitable for' in fl:
            suitable = f.replace('Suitable for ', '')
        elif 'exterior color' in fl:
            exterior_color = f.replace(' Exterior Color', '')
    details = []
    if construction:
        details.append(construction)
    if interior:
        details.append(interior)
    if stain:
        details.append(stain)
    elif finish:
        details.append(finish + ' finish')
    if suitable:
        details.append(suitable)
    return details


def generate_html(title, subtitle, caskets, img_prefix, out_file):
    caskets.sort(key=lambda x: x['price_num'])
    price_lo = caskets[0]['price']
    price_hi = caskets[-1]['price']
    count = len(caskets)

    cards = ""
    for c in caskets:
        details = extract_details(c.get('features', []))
        detail_lines = ''
        for d in details:
            d = d.replace('™', '').replace('®', '').replace('�', '').strip()
            detail_lines += f'            <div class="product-detail">{d}</div>\n'

        cards += (
            f'        <div class="product-card" data-name="{c["name"].lower()}"'
            f' data-item="{c["item"]}" data-price="{c["price_num"]}">\n'
            f'          <div class="product-img">'
            f'<img src="{c["img"]}" alt="{c["name"]}" loading="lazy"></div>\n'
            f'          <div class="product-body">\n'
            f'            <div class="product-name">{c["name"]}</div>\n'
            f'            <div class="product-price">{c["price"]}</div>\n'
            f'{detail_lines}'
            f'            <div class="product-meta">#{c["item"]}</div>\n'
            f'          </div>\n'
            f'        </div>\n'
        )

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

.filter-bar{{padding:20px 48px;background:var(--sidebar-bg);border-bottom:1px solid var(--rule);display:flex;align-items:center;gap:14px;position:sticky;top:42px;z-index:50;}}
.filter-bar input{{flex:0 0 280px;padding:9px 14px;border:1px solid var(--warm-border);border-radius:8px;font-family:'Source Sans 3',sans-serif;font-size:13.5px;outline:none;background:var(--white);}}
.filter-bar input:focus{{border-color:var(--navy);box-shadow:0 0 0 3px rgba(61,90,122,.1);}}
.filter-count{{color:var(--text-muted);font-size:12.5px;}}
.filter-sort{{padding:8px 12px;border:1px solid var(--warm-border);border-radius:8px;font-family:'Source Sans 3',sans-serif;font-size:13px;background:var(--white);color:var(--text);cursor:pointer;}}

.section-wrap{{padding:48px 48px 40px;}}
.product-grid{{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-bottom:32px;}}
.product-card{{background:var(--card-white);border:1px solid var(--warm-border);border-radius:10px;overflow:hidden;transition:box-shadow .2s,transform .2s;}}
.product-card:hover{{box-shadow:0 6px 24px rgba(0,0,0,.08);transform:translateY(-2px);}}
.product-img{{aspect-ratio:1/1;background:var(--sidebar-bg);overflow:hidden;}}
.product-img img{{width:100%;height:100%;object-fit:cover;display:block;}}
.product-body{{padding:14px 16px 16px;}}
.product-name{{font-family:'Cormorant Garamond',serif;font-size:19px;font-weight:600;color:var(--navy-dark);line-height:1.2;margin-bottom:4px;}}
.product-price{{font-family:'Source Sans 3',sans-serif;font-size:18px;font-weight:700;color:var(--navy);margin-bottom:4px;font-variant-numeric:tabular-nums;}}
.product-detail{{font-size:12.5px;color:var(--text);line-height:1.5;}}
.product-meta{{font-size:11px;color:var(--text-muted);line-height:1.4;margin-top:6px;font-family:monospace;}}

.doc-footer{{background:var(--cream);padding:48px 48px 40px;border-top:1px solid var(--rule);text-align:center;}}
.doc-footer .footer-logo{{height:24px;width:auto;margin:0 auto 14px;display:block;}}
.doc-footer .footer-hours{{font-size:14px;color:var(--text);margin-bottom:4px;}}
.doc-footer .footer-url{{font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--orange);margin-bottom:12px;}}
.doc-footer .footer-legal{{font-size:12px;color:var(--text-muted);}}

.site-footer{{padding:22px 24px;background:var(--navy);color:rgba(255,255,255,.6);text-align:center;font-size:12px;}}
.site-footer a{{color:rgba(255,255,255,.75);text-decoration:none;}}

@media(max-width:768px){{
  .doc-sheet{{margin:0;}}
  .cover,.section-wrap{{padding-left:24px;padding-right:24px;}}
  .cover h1{{font-size:32px;}}
  .product-grid{{grid-template-columns:1fr 1fr;}}
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
  .section-wrap{{padding-left:0;padding-right:0;}}
  .product-card{{break-inside:avoid;}}
  .product-grid{{grid-template-columns:repeat(3,1fr);gap:12px;}}
  .product-card:hover{{box-shadow:none;transform:none;}}
  .product-name{{font-size:14px;}}
  .product-price{{font-size:13px;}}
  .product-detail{{font-size:10px;}}
  .product-meta{{font-size:9px;}}
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
    <div class="cover-footer">{count} caskets &middot; {price_lo} &ndash; {price_hi}</div>
  </div>

  <div class="filter-bar no-print">
    <input type="text" id="searchInput" placeholder="Search by name or item number&hellip;" oninput="filterCards()">
    <select class="filter-sort" id="sortSelect" onchange="filterCards()">
      <option value="price-asc">Price: Low to High</option>
      <option value="price-desc">Price: High to Low</option>
      <option value="name-asc">Name: A to Z</option>
    </select>
    <span class="filter-count" id="filterCount">{count} caskets</span>
  </div>

  <div class="section-wrap">
    <div class="product-grid" id="productGrid">
{cards}    </div>
  </div>

  <div class="doc-footer">
    <img src="logo-navy.svg" alt="Bonney Watson" class="footer-logo">
    <div class="footer-hours">Serving Seattle families since 1868 &middot; Washington Memorial Park</div>
    <div class="footer-url">bonneywatson.com</div>
    <div class="footer-legal">16445 International Blvd, SeaTac, WA 98188 &middot; 206-445-9794<br>All caskets by Batesville. Prices subject to change.</div>
  </div>

</div>

<footer class="site-footer no-print">
  <a href="guides.html">&larr; Back to Family Guides &amp; Resources</a>
</footer>

<script>
function filterCards() {{
  var q = document.getElementById('searchInput').value.trim().toLowerCase();
  var sort = document.getElementById('sortSelect').value;
  var grid = document.getElementById('productGrid');
  var cards = Array.from(grid.querySelectorAll('.product-card'));
  var visible = 0;
  cards.forEach(function(card) {{
    var name = card.getAttribute('data-name');
    var item = card.getAttribute('data-item');
    var match = !q || name.indexOf(q) > -1 || item.indexOf(q) > -1;
    card.style.display = match ? '' : 'none';
    if (match) visible++;
  }});
  if (sort === 'price-asc') cards.sort(function(a,b) {{ return parseFloat(a.dataset.price) - parseFloat(b.dataset.price); }});
  else if (sort === 'price-desc') cards.sort(function(a,b) {{ return parseFloat(b.dataset.price) - parseFloat(a.dataset.price); }});
  else if (sort === 'name-asc') cards.sort(function(a,b) {{ return a.dataset.name.localeCompare(b.dataset.name); }});
  cards.forEach(function(card) {{ grid.appendChild(card); }});
  document.getElementById('filterCount').textContent = visible + ' casket' + (visible === 1 ? '' : 's');
}}
</script>

</body>
</html>"""
    with open(out_file, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f"Written {out_file}: {count} caskets with photos")


if __name__ == '__main__':
    with open('casket-images/metal_data.json') as f:
        metal = json.load(f)
    with open('casket-images/wood_data.json') as f:
        wood = json.load(f)

    generate_html(
        "Metal Caskets",
        "Steel caskets from Batesville suitable for burial — available at Washington Memorial Park.",
        metal, "casket-images/metal", "metal-caskets.html"
    )
    generate_html(
        "Wood Caskets",
        "Hardwood and veneer caskets from Batesville suitable for burial or cremation — available at Washington Memorial Park.",
        wood, "casket-images/wood", "wood-caskets.html"
    )
