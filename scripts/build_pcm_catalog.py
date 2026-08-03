# -*- coding: utf-8 -*-
"""
Generate pcm-design-catalog.html from data/pcm-catalog.json.

    python scripts/pcm_extract.py          # books -> images + data/pcm-catalog.json
    python scripts/build_pcm_catalog.py    # data  -> pcm-design-catalog.html

pcm-design-catalog.html IS GENERATED. Edit this script, never the page.

Shape of the page, and why. A counselor sits with a family and needs one thing above
everything else: to put "PCM 1183" on the screen in about a second. So the design number
is the largest thing on every card, there is a dedicated jump box that accepts 1183 /
pcm 1183 / PCM1183, and the 3,973 ornament elements are grouped by the Elements book's
own eighteen categories rather than being poured into one 4,000-card wall.

Elements are rendered on demand. Putting all 3,973 in the DOM at load costs about twenty
thousand nodes for cards nobody has scrolled to; a category renders when it is opened,
when it matches a search, or when a jump lands inside it.

Search is by SUBJECT, not just by number. A family says "roses" or "something with
mountains", never "PCM 1182", so every design carries curated subject tags
(data/pcm-subject-tags.json, tagged by looking at the artwork) resolved into
data/pcm-catalog-tags.json by scripts/pcm_tags.py, and the search box expands the word
typed through a synonym layer before matching. "flowers" finds every flower; "fishing"
finds the rods, the boats and the bass.

NO PRICES ANYWHERE. This is a design-lookup surface; the quote is built in the tool.
"""
import html, json, os, re, sys

sys.stdout.reconfigure(encoding='utf-8')

DATA = 'data/pcm-catalog.json'
TAGS = 'data/pcm-catalog-tags.json'
PAGE = 'pcm-design-catalog.html'

esc = lambda s: html.escape(str(s), quote=True)
norm = lambda s: ' '.join(re.sub(r'[^a-z0-9 ]', ' ', str(s).lower()).split())


def slug(s):
    return re.sub(r'-+', '-', re.sub(r'[^a-z0-9]+', '-', s.lower())).strip('-')


FMT_LABEL = {'flat': 'Flat marker', 'ledger': 'Ledger',
             'individual': 'Individual', 'companion': 'Companion'}

# Order the design groups the way a counselor walks a family through them: the current
# book first, then the 2011 book's individual designs, then companions.
GROUP_ORDER = [
    ('2020 Collection', ['Flat Markers', 'Ledgers']),
    ('Individual Designs', ['Classic', 'Religious', 'Outdoors', 'Floral', 'Misc', 'Child']),
    ('Companion Designs', ['Classic', 'Religious', 'Outdoors', 'Floral', 'Misc', 'Ledgers']),
]

STYLE = """
:root {
  --navy:#3d5a7a; --navy-dark:#2c445e; --navy-deep:#1e3a55;
  --orange:#c8540a; --orange-dark:#a5450a;
  --white:#ffffff; --offwhite:#f4f6f8; --cream:#f8f6f2; --card-white:#fff;
  --warm-border:#e6e1d7; --rule:#ddd6c8;
  --text:#3a4453; --text-dark:#1a2332; --text-muted:#6a7686;
  --sidebar-bg:#f9f8f5;
}
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Source Sans 3',sans-serif;font-size:15px;background:var(--offwhite);color:var(--text);line-height:1.6;}

.site-nav{background:var(--navy);position:sticky;top:0;z-index:100;box-shadow:0 2px 12px rgba(0,0,0,.25);}
.nav-inner{max-width:1600px;margin:0 auto;padding:10px 24px;display:flex;align-items:center;gap:18px;}
.nav-logo{height:22px;width:auto;flex-shrink:0;}
.nav-est{font-family:'Cormorant Garamond',serif;font-size:12px;color:rgba(255,255,255,.5);font-style:italic;white-space:nowrap;}
.nav-spacer{flex:1;}
.nav-back{color:#fff;font-size:12px;font-weight:600;text-decoration:none;padding:6px 12px;border:1px solid rgba(255,255,255,.3);border-radius:6px;white-space:nowrap;}
.nav-back:hover{background:rgba(255,255,255,.12);}

.doc-sheet{max-width:1600px;margin:0 auto;background:var(--cream);box-shadow:0 4px 30px rgba(0,0,0,.08);min-height:100vh;}
.cover{background:var(--navy);padding:56px 48px 48px;position:relative;overflow:hidden;}
.cover::before{content:'';position:absolute;top:50%;left:50%;width:600px;height:600px;background:radial-gradient(circle,rgba(200,84,10,.12) 0%,transparent 70%);transform:translate(-50%,-50%);pointer-events:none;}
.cover-logo{height:34px;width:auto;display:block;margin-bottom:24px;position:relative;}
.cover-kicker{font-size:12px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--orange);margin-bottom:10px;position:relative;}
.cover h1{font-family:'Cormorant Garamond',serif;font-size:44px;font-weight:600;color:#fff;line-height:1.15;margin-bottom:14px;position:relative;}
.cover-sub{font-family:'Cormorant Garamond',serif;font-size:18px;font-style:italic;color:rgba(255,255,255,.72);line-height:1.5;max-width:640px;position:relative;}
.cover-rule{width:50px;height:3px;background:var(--orange);margin:22px 0;border-radius:2px;position:relative;}
.cover-footer{font-size:11px;font-weight:600;letter-spacing:.15em;text-transform:uppercase;color:rgba(255,255,255,.45);position:relative;}

.toolbar{padding:14px 48px;background:var(--sidebar-bg);border-bottom:1px solid var(--rule);display:flex;align-items:center;gap:12px;flex-wrap:wrap;position:sticky;top:42px;z-index:50;}
.jump-wrap{display:flex;align-items:center;gap:8px;background:var(--navy);border-radius:9px;padding:5px 10px 5px 12px;}
.jump-wrap label{color:#fff;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap;}
#pcmJump{width:150px;padding:7px 11px;border:1px solid rgba(255,255,255,.35);border-radius:7px;font-family:'Source Sans 3',sans-serif;font-size:14px;font-weight:600;outline:none;background:#fff;color:var(--navy-deep);}
.jump-note{font-size:12px;color:var(--text-muted);}
.jump-note.miss{color:var(--orange-dark);font-weight:600;}
.toolbar input[type=text],.toolbar select{padding:8px 12px;border:1px solid var(--warm-border);border-radius:8px;font-family:'Source Sans 3',sans-serif;font-size:13.5px;background:var(--white);color:var(--text);outline:none;}
#searchInput{flex:0 0 250px;}
.toolbar select{cursor:pointer;}
.filter-count{color:var(--text-muted);font-size:12.5px;margin-left:auto;font-variant-numeric:tabular-nums;}
.btn-clear{padding:8px 12px;border:none;border-radius:8px;background:none;color:var(--orange);font-family:'Source Sans 3',sans-serif;font-size:13px;font-weight:600;cursor:pointer;}
.btn-clear:hover{text-decoration:underline;}

.contents{padding:18px 48px;background:var(--cream);border-bottom:1px solid var(--rule);display:flex;gap:10px;flex-wrap:wrap;}
.contents a{font-size:12.5px;font-weight:600;color:var(--navy-dark);text-decoration:none;border:1px solid var(--warm-border);background:#fff;border-radius:999px;padding:5px 13px;}
.contents a:hover{border-color:var(--navy);}

.section-wrap{padding:40px 48px 8px;}
.section-head{font-family:'Cormorant Garamond',serif;font-size:30px;font-weight:600;color:var(--navy-deep);margin-bottom:4px;}
.section-note{font-size:13.5px;color:var(--text-muted);max-width:820px;margin-bottom:8px;}
.group{padding:0 48px 26px;}
.group-head{display:flex;align-items:baseline;gap:12px;margin:26px 0 12px;}
.group-head h3{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;color:var(--navy-dark);}
.group-rule{flex:1;height:1px;background:var(--rule);}
.group-count{font-size:12px;font-weight:600;color:var(--text-muted);font-variant-numeric:tabular-nums;}
.group[hidden]{display:none;}

.product-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;}
.product-grid.elements{grid-template-columns:repeat(8,1fr);gap:12px;}
.product-grid.photos{grid-template-columns:repeat(3,1fr);gap:20px;}
.product-grid.reference{grid-template-columns:repeat(3,1fr);gap:20px;}
.product-card{background:var(--card-white);border:1px solid var(--warm-border);border-radius:10px;overflow:hidden;transition:box-shadow .2s,transform .2s,border-color .2s;cursor:zoom-in;}
.product-card:hover{box-shadow:0 6px 24px rgba(0,0,0,.09);transform:translateY(-2px);}
.product-card.flash{border-color:var(--orange);box-shadow:0 0 0 3px rgba(200,84,10,.28);}
.product-img{aspect-ratio:16/10;background:var(--sidebar-bg);overflow:hidden;display:flex;align-items:center;justify-content:center;}
.product-img img{width:100%;height:100%;object-fit:cover;display:block;}
.product-card[data-fmt="ledger"] .product-img{aspect-ratio:10/13;}
.product-card[data-fmt="ledger"] .product-img img{object-fit:contain;}
.product-body{padding:9px 12px 11px;text-align:center;}
.product-detail{font-size:11.5px;color:var(--text-muted);line-height:1.35;min-height:16px;}
.pcm-number{font-family:'Source Sans 3',sans-serif;font-size:16px;font-weight:700;letter-spacing:.04em;color:var(--navy-deep);font-variant-numeric:tabular-nums;margin-top:2px;}
.tag-row{display:flex;flex-wrap:wrap;gap:3px;justify-content:center;margin-top:6px;}
.tag{font-size:10px;line-height:1.5;letter-spacing:.02em;color:var(--text-muted);background:var(--offwhite);border:1px solid var(--warm-border);border-radius:9px;padding:0 6px;white-space:nowrap;}
.tag.hit{color:#fff;background:var(--orange);border-color:var(--orange-dark);font-weight:600;}
.element-card .element-img{aspect-ratio:1/1;background:#fff;display:flex;align-items:center;justify-content:center;padding:9px;}
.element-card .element-img img{max-width:100%;max-height:100%;object-fit:contain;image-rendering:auto;}
.element-card .pcm-number{font-size:10.5px;font-weight:700;letter-spacing:.02em;padding:0 5px 8px;word-break:break-word;line-height:1.25;}
.photo-card .product-img{aspect-ratio:4/3;}
.photo-card .product-body{text-align:left;}
.reference-card .product-img{aspect-ratio:4/3;background:#fff;}
.reference-card .product-img img{object-fit:contain;}
.reference-card .product-body{text-align:left;}
.reference-card .ref-title{font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:600;color:var(--navy-dark);}

.el-cat{border:1px solid var(--warm-border);background:#fff;border-radius:10px;margin-bottom:12px;overflow:hidden;}
.el-cat[hidden]{display:none;}
.el-toggle{width:100%;display:flex;align-items:center;gap:12px;padding:12px 16px;background:none;border:none;cursor:pointer;font-family:'Source Sans 3',sans-serif;font-size:15px;font-weight:600;color:var(--navy-dark);text-align:left;}
.el-toggle:hover{background:var(--sidebar-bg);}
.el-toggle .el-count{margin-left:auto;font-size:12px;font-weight:600;color:var(--text-muted);font-variant-numeric:tabular-nums;}
.el-toggle .el-caret{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;transition:transform .15s;}
.el-cat.open .el-caret{transform:rotate(180deg);}
.el-body{display:none;padding:4px 16px 18px;border-top:1px solid var(--rule);}
.el-cat.open .el-body{display:block;}

.empty-note{padding:26px 48px 40px;font-size:14px;color:var(--text-muted);}
.empty-note[hidden]{display:none;}

.photo-lightbox{position:fixed;inset:0;background:rgba(12,18,26,.92);display:none;align-items:center;justify-content:center;z-index:200;padding:28px;}
.photo-lightbox.active{display:flex;}
.photo-lightbox img{max-width:96vw;max-height:82vh;object-fit:contain;background:#fff;border-radius:6px;}
.lightbox-cap{position:absolute;bottom:22px;left:0;right:0;text-align:center;color:#fff;font-size:15px;font-weight:600;letter-spacing:.05em;}

.doc-footer{background:var(--cream);padding:44px 48px 36px;border-top:1px solid var(--rule);text-align:center;}
.doc-footer .footer-logo{height:24px;width:auto;margin:0 auto 14px;display:block;}
.doc-footer .footer-hours{font-size:14px;color:var(--text);margin-bottom:4px;}
.doc-footer .footer-url{font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--orange);margin-bottom:12px;}
.doc-footer .footer-legal{font-size:12px;color:var(--text-muted);}
.site-footer{padding:22px 24px;background:var(--navy);color:rgba(255,255,255,.6);text-align:center;font-size:12px;}
.site-footer a{color:rgba(255,255,255,.75);text-decoration:none;}

@media(max-width:1200px){.product-grid{grid-template-columns:repeat(3,1fr);}.product-grid.elements{grid-template-columns:repeat(6,1fr);}}
@media(max-width:768px){
  .cover,.toolbar,.contents,.section-wrap,.group,.doc-footer{padding-left:20px;padding-right:20px;}
  .cover h1{font-size:31px;}
  .product-grid{grid-template-columns:repeat(2,1fr);}
  .product-grid.elements{grid-template-columns:repeat(4,1fr);}
  .product-grid.photos,.product-grid.reference{grid-template-columns:1fr;}
  #searchInput{flex:1 1 180px;}
  .filter-count{margin-left:0;}
}

@media print {
  @page{size:letter;margin:0;}
  *{font-variant-ligatures:none;-webkit-font-variant-ligatures:none;}
  body{background:#fff;font-size:9.5pt;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  .site-nav,.site-footer,.toolbar,.contents,.photo-lightbox,.el-toggle,.doc-footer{display:none!important;}
  .doc-sheet{max-width:none;box-shadow:none;}
  .cover{padding:20px 12px 16px;background:var(--navy)!important;}
  .cover h1{font-size:24pt;}
  .section-wrap,.group{padding:12px 12px 6px;}
  .product-card{break-inside:avoid;page-break-inside:avoid;cursor:auto;}
  .product-card:hover{box-shadow:none;transform:none;}
  .el-body{display:block;border-top:none;}
  .tag-row{display:none!important;}
  a{text-decoration:none;color:inherit;}
}
"""


def design_card(d, tags):
    bits = [d['id'].replace('-', ' '), 'pcm ' + str(d['num']), d['cat'], d['sub'],
            FMT_LABEL.get(d['fmt'], d['fmt']), d.get('color') or '', d['book'] + ' book']
    detail = ' &middot; '.join(x for x in [esc(d['color']) if d['color'] else '',
                                           FMT_LABEL.get(d['fmt'], d['fmt'])] if x)
    # The chips are the answer to "why did this card come back for 'flowers'?" - they sit
    # on every card so the vocabulary is discoverable, and the matching one lights up.
    chips = ''.join(f'<span class="tag" data-tag="{esc(t)}">{esc(t.replace("-", " "))}</span>'
                    for t in tags)
    return (
        f'      <div class="product-card design-card" data-id="{esc(d["id"])}" '
        f'data-num="{d["num"]}" data-book="{esc(d["book"])}" data-cat="{esc(d["cat"])}" '
        f'data-sub="{esc(d["sub"])}" data-fmt="{esc(d["fmt"])}" '
        f'data-color="{esc(d["color"])}" data-name="{esc(norm(" ".join(bits)))}" '
        f'data-tags="{esc(" ".join(tags))}">\n'
        f'        <div class="product-img"><img src="{esc(d["img"])}" '
        f'alt="Design PCM {d["num"]}" loading="lazy"></div>\n'
        f'        <div class="product-body">\n'
        f'          <div class="product-detail">{detail}</div>\n'
        f'          <div class="pcm-number">PCM {d["num"]}</div>\n'
        f'          <div class="tag-row">{chips}</div>\n'
        f'        </div>\n'
        f'      </div>')


def photo_card(p):
    return (
        f'      <div class="product-card photo-card" data-name="{esc(norm(p["desc"] + " " + p["src"]))}">\n'
        f'        <div class="product-img"><img src="{esc(p["img"])}" alt="{esc(p["desc"])}" loading="lazy"></div>\n'
        f'        <div class="product-body"><div class="product-detail">{esc(p["desc"])}'
        f' &middot; {esc(p["src"])}</div></div>\n'
        f'      </div>')


def reference_card(r):
    return (
        f'      <div class="product-card reference-card" data-name="{esc(norm(r["title"] + " " + r["desc"]))}">\n'
        f'        <div class="product-img"><img src="{esc(r["img"])}" alt="{esc(r["title"])}" loading="lazy"></div>\n'
        f'        <div class="product-body"><div class="ref-title">{esc(r["title"])}</div>\n'
        f'        <div class="product-detail">{esc(r["desc"])}</div></div>\n'
        f'      </div>')


def build():
    data = json.load(open(DATA, encoding='utf-8'))
    tagdata = json.load(open(TAGS, encoding='utf-8'))
    design_tags = tagdata['designTags']
    stem_tags = tagdata['elementStemTags']
    synonyms = tagdata['synonyms']
    stem_re = re.compile(tagdata['stemRule'])
    designs, elements = data['designs'], data['elements']
    photos, refs = data['photos'], data['reference']

    untagged = [d['id'] for d in designs if not design_tags.get(d['id'])]
    if untagged:
        raise SystemExit('%d design(s) have no subject tags; run scripts/pcm_tags.py: %s'
                         % (len(untagged), ', '.join(untagged[:10])))

    by_group = {}
    for d in designs:
        by_group.setdefault((d['cat'], d['sub']), []).append(d)
    for v in by_group.values():
        v.sort(key=lambda d: d['num'])

    groups_html = []
    for cat, subs in GROUP_ORDER:
        for sub in subs:
            items = by_group.get((cat, sub))
            if not items:
                continue
            gid = slug(cat + '-' + sub)
            cards = '\n'.join(design_card(d, design_tags[d['id']]) for d in items)
            groups_html.append(
                f'    <div class="group" id="group-{gid}" data-group-cat="{esc(cat)}" '
                f'data-group-sub="{esc(sub)}">\n'
                f'      <div class="group-head"><h3>{esc(cat)} &mdash; {esc(sub)}</h3>'
                f'<span class="group-rule"></span>'
                f'<span class="group-count">{len(items)}</span></div>\n'
                f'      <div class="product-grid">\n{cards}\n      </div>\n'
                f'    </div>')
    missing = set(by_group) - {(c, s) for c, subs in GROUP_ORDER for s in subs}
    if missing:
        raise SystemExit('GROUP_ORDER is missing: ' + repr(sorted(missing)))

    el_cats = []
    for cat in [c for c, _, _ in ELEM_ORDER(data)]:
        el_cats.append(cat)
    el_html = []
    for cat in el_cats:
        n = data['elementCats'][cat]
        cid = slug(cat)
        el_html.append(
            f'      <div class="el-cat" id="elcat-{cid}" data-el-cat="{esc(cat)}">\n'
            f'        <button class="el-toggle" type="button" onclick="toggleCat(\'{cid}\')" '
            f'aria-expanded="false" aria-controls="elbody-{cid}">\n'
            f'          <svg class="el-caret" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>\n'
            f'          <span>{esc(cat)}</span><span class="el-count">{n}</span>\n'
            f'        </button>\n'
            f'        <div class="el-body" id="elbody-{cid}">'
            f'<div class="product-grid elements"></div></div>\n'
            f'      </div>')

    # Compact payload: [code, categoryIndex, imagePath, stemIndex].
    # Tags ride on the STEM, not the code - BASS 001..003 share one subject - so the page
    # ships ~540 tag lists instead of 3,973 copies of the same three words.
    cat_index = {c: i for i, c in enumerate(el_cats)}
    stem_list = sorted(stem_tags)
    stem_index = {s: i for i, s in enumerate(stem_list)}
    el_stem_of = lambda code: (stem_re.sub('', str(code)).strip() or str(code).strip())
    payload = []
    for e in elements:
        st = el_stem_of(e['code'])
        if st not in stem_index:
            raise SystemExit('element %r has stem %r with no tags; run scripts/pcm_tags.py'
                             % (e['code'], st))
        payload.append([e['code'], cat_index[e['cat']], e['img'], stem_index[st]])
    stem_tag_payload = [' '.join(stem_tags[s]) for s in stem_list]

    books = sorted({d['book'] for d in designs}, reverse=True)
    cats = [c for c, _ in GROUP_ORDER]
    fmts = sorted({d['fmt'] for d in designs})
    colors = sorted({d['color'] for d in designs if d['color']})

    opt = lambda vals, all_label: '\n'.join(
        [f'        <option value="">{all_label}</option>'] +
        [f'        <option value="{esc(v)}">{esc(lbl)}</option>' for v, lbl in vals])

    page = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>PCM Flat Marker Design Catalog &middot; Bonney Watson</title>
<!-- GENERATED by scripts/build_pcm_catalog.py from data/pcm-catalog.json. Do not edit. -->
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Source+Sans+3:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>{STYLE}</style>
</head>
<body>

<nav class="site-nav">
  <div class="nav-inner">
    <img src="logo.svg" alt="Bonney Watson" class="nav-logo">
    <span class="nav-est">Serving families since 1868</span>
    <span class="nav-spacer"></span>
    <a class="nav-back" href="guides.html">&larr; All Guides</a>
  </div>
</nav>

<div class="doc-sheet">
  <div class="cover">
    <img src="logo.svg" alt="Bonney Watson" class="cover-logo">
    <div class="cover-kicker">Granite Flat Markers</div>
    <h1>PCM Design Catalog</h1>
    <div class="cover-sub">Every flat-marker and ledger design from the Pacific Coast Memorials
      design books, plus the full ornament library &mdash; grouped the way the books group them,
      with the design number on every card so a family can point and we can look it up on the spot.</div>
    <div class="cover-rule"></div>
    <div class="cover-footer">{len(designs)} designs &middot; {len(elements):,} design elements &middot; {len([p for p in photos])} photographed markers</div>
  </div>

  <div class="toolbar">
    <div class="jump-wrap">
      <label for="pcmJump">Go to&nbsp;#</label>
      <input type="text" id="pcmJump" placeholder="1183" autocomplete="off"
             aria-label="Jump to a design or element number">
    </div>
    <span class="jump-note" id="jumpNote">e.g. 1183, PCM 728, BASS 001</span>
    <input type="text" id="searchInput" placeholder="Search by subject &mdash; roses, mountains, fishing&hellip;"
           autocomplete="off" aria-label="Search designs and elements by subject">
    <select id="bookFilter" aria-label="Design book">
{opt([(b, ('2020 Design Book' if b == '2020' else '2011 Design Book')) for b in books], 'Both design books')}
    </select>
    <select id="catFilter" aria-label="Category">
{opt([(c, c) for c in cats], 'All categories')}
    </select>
    <select id="fmtFilter" aria-label="Format">
{opt([(f, FMT_LABEL.get(f, f)) for f in fmts], 'All formats')}
    </select>
    <select id="colorFilter" aria-label="Granite color">
{opt([(c, c) for c in colors], 'All granite colors')}
    </select>
    <button class="btn-clear" type="button" id="clearFilters" onclick="clearAll()">Clear</button>
    <span class="filter-count" id="filterCount"></span>
  </div>

  <div class="contents">
    <a href="#sec-designs">Designs</a>
    <a href="#sec-elements">Design Elements</a>
    <a href="#sec-examples">Installed Examples</a>
    <a href="#sec-reference">Sizes, Colors &amp; Lettering</a>
  </div>

  <div class="section-wrap" id="sec-designs">
    <div class="section-head">Marker Designs</div>
    <div class="section-note">Granite flat markers and ledgers only &mdash; no uprights, no benches,
      no bronze. Groups follow each design book&rsquo;s own sections. Search by what the family
      asks for &mdash; <em>roses</em>, <em>flowers</em>, <em>mountains</em>, <em>fishing</em>,
      <em>praying hands</em> &mdash; and the tags under each card show why it came back.
      Pricing is not shown here; build the quote in the tool.</div>
  </div>
{chr(10).join(groups_html)}

  <div class="section-wrap" id="sec-elements">
    <div class="section-head">Design Elements</div>
    <div class="section-note">{len(elements):,} ornaments, emblems, borders and panels that can be added
      to any of the designs above, in the {len(el_cats)} categories the element book publishes.
      Open a category to browse it, or search by subject, name or number &mdash; searching
      <em>fishing</em> reaches the rods, the boats and the bass.</div>
  </div>
  <div class="group" id="group-elements">
{chr(10).join(el_html)}
  </div>

  <div class="section-wrap" id="sec-examples">
    <div class="section-head">Installed Examples</div>
    <div class="section-note">Granite flat markers photographed on the grounds &mdash; what the designs
      above look like once they are cut, set and weathered in.</div>
  </div>
  <div class="group" id="group-examples">
    <div class="product-grid photos">
{chr(10).join(photo_card(p) for p in photos)}
    </div>
  </div>

  <div class="section-wrap" id="sec-reference">
    <div class="section-head">Sizes, Colors &amp; Lettering</div>
    <div class="section-note">Reference plates from the same books: what sizes a flat marker comes in,
      the granite colors, engraving styles, lettering faces and glass inlay work.</div>
  </div>
  <div class="group" id="group-reference">
    <div class="product-grid reference">
{chr(10).join(reference_card(r) for r in refs)}
    </div>
  </div>

  <div class="empty-note" id="emptyNote" hidden>Nothing matches that search.</div>

  <div class="doc-footer">
    <img src="logo-navy.svg" alt="Bonney Watson" class="footer-logo">
    <div class="footer-hours">Washington Memorial Park &middot; 16445 International Blvd, SeaTac, WA 98188</div>
    <div class="footer-url">bonneywatson.com</div>
    <div class="footer-legal">Designs and design elements &copy; Pacific Coast Memorials. Shown for
      selection purposes; artwork may be adapted to fit the marker size you choose.</div>
  </div>
</div>

<div class="photo-lightbox" id="photoLightbox" onclick="closeLightbox()">
  <img id="lightboxImg" alt="">
  <div class="lightbox-cap" id="lightboxCap"></div>
</div>

<footer class="site-footer">
  <a href="guides.html">&larr; Back to all guides</a>
</footer>

<script>
var EL_CATS = {json.dumps(el_cats)};
var ELEMENTS = {json.dumps(payload, separators=(',', ':'))};
var STEM_TAGS = {json.dumps(stem_tag_payload, separators=(',', ':'))};
var SYNONYMS = {json.dumps(synonyms, separators=(',', ':'))};

var elByCat = [];
EL_CATS.forEach(function () {{ elByCat.push([]); }});
ELEMENTS.forEach(function (e) {{ elByCat[e[1]].push(e); }});
var catSlug = EL_CATS.map(function (c) {{
  return c.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}});
var rendered = EL_CATS.map(function () {{ return false; }});

function esc(s) {{
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}}

/* A category's cards are built the first time anything needs them: opening it, a search
   that matches inside it, or a jump that lands on one of its elements. */
function renderCat(i) {{
  if (rendered[i]) return;
  rendered[i] = true;
  var grid = document.querySelector('#elbody-' + catSlug[i] + ' .product-grid');
  var html = [];
  elByCat[i].forEach(function (e) {{
    html.push('<div class="product-card element-card" data-id="' + esc(e[0]) +
      '" data-name="' + esc(elName(e)) + '" data-tags="' + esc(STEM_TAGS[e[3]]) +
      '"><div class="element-img"><img src="' + esc(e[2]) + '" alt="' + esc(e[0]) +
      '" loading="lazy"></div><div class="pcm-number">' + esc(e[0]) + '</div></div>');
  }});
  grid.innerHTML = html.join('');
}}

function setOpen(i, open) {{
  var el = document.getElementById('elcat-' + catSlug[i]);
  if (!el) return;
  if (open) renderCat(i);
  el.classList.toggle('open', !!open);
  el.querySelector('.el-toggle').setAttribute('aria-expanded', open ? 'true' : 'false');
}}

function toggleCat(slug) {{
  var i = catSlug.indexOf(slug);
  var el = document.getElementById('elcat-' + slug);
  setOpen(i, !el.classList.contains('open'));
}}

var designCards = null;
function cards() {{
  if (!designCards) designCards = Array.prototype.slice.call(
    document.querySelectorAll('.design-card'));
  return designCards;
}}

function norm(s) {{
  return String(s).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\\s+/g, ' ').trim();
}}

function elName(e) {{
  return (e[0] + ' ' + EL_CATS[e[1]] + ' ' + STEM_TAGS[e[3]].replace(/-/g, ' ')).toLowerCase();
}}

/* ---- subject search -----------------------------------------------------------------
   A family says "roses", "something with mountains", "he was a fisherman". None of those
   are on the marker, in the design number, or in the book's section heading, so a plain
   substring search over the card text answers none of them. Every design carries curated
   subject tags and every element inherits tags from its own name; a typed word is expanded
   through the synonym table before it is compared.

   Plural and misspelling tolerance is deliberately cheap: strip a trailing s/es/ies before
   looking the word up. "rose"/"roses", "flower"/"flowers", "puppy"/"puppies" all land on
   the same tag without a stemmer.

   The old whole-query substring test is kept as the first branch, so every number, code,
   category and colour that matched before still matches. Everything here only ADDS hits. */
function singular(w) {{
  if (w.length > 4 && /ies$/.test(w)) return w.slice(0, -3) + 'y';
  if (w.length > 4 && /(ches|shes|sses|xes)$/.test(w)) return w.slice(0, -2);
  if (w.length > 3 && /s$/.test(w) && !/ss$/.test(w)) return w.slice(0, -1);
  return w;
}}

var expandCache = {{}};
function expand(word) {{
  if (expandCache[word]) return expandCache[word];
  var out = {{}}, forms = [word, singular(word), word.replace(/ /g, '')];
  forms.forEach(function (f) {{
    if (!f) return;
    out[f] = 1;
    var syn = SYNONYMS[f];
    if (syn) syn.forEach(function (t) {{ out[t] = 1; }});
  }});
  expandCache[word] = out;
  return out;
}}

/* Which of a card's own tags answered the query - that is what lights up the chips. */
function tagHits(tagStr, terms) {{
  if (!tagStr || !terms.length) return null;
  var have = tagStr.split(' '), hit = {{}}, any = false;
  terms.forEach(function (term) {{
    var want = expand(term);
    have.forEach(function (t) {{
      if (want[t]) {{ hit[t] = 1; any = true; }}
    }});
  }});
  return any ? hit : null;
}}

/* Every term must land, by tag OR by the card's own text. AND across terms, so
   "companion rose" narrows instead of widening. */
function matches(name, tagStr, terms, rawQuery) {{
  if (!terms.length) return true;
  if (name.indexOf(rawQuery) !== -1) return true;
  var have = tagStr ? tagStr.split(' ') : [];
  for (var i = 0; i < terms.length; i++) {{
    var term = terms[i];
    if (name.indexOf(term) !== -1) continue;
    var want = expand(term), ok = false;
    for (var k = 0; k < have.length; k++) {{ if (want[have[k]]) {{ ok = true; break; }} }}
    if (!ok) return false;
  }}
  return true;
}}

function markChips(card, terms) {{
  var row = card.querySelector('.tag-row');
  if (!row) return;
  var hit = tagHits(card.dataset.tags, terms);
  row.querySelectorAll('.tag').forEach(function (chip) {{
    chip.classList.toggle('hit', !!(hit && hit[chip.dataset.tag]));
  }});
}}

function applyFilters() {{
  var q = norm(document.getElementById('searchInput').value);
  var terms = q ? q.split(' ') : [];
  var book = document.getElementById('bookFilter').value;
  var cat = document.getElementById('catFilter').value;
  var fmt = document.getElementById('fmtFilter').value;
  var col = document.getElementById('colorFilter').value;
  var facetsOn = !!(book || cat || fmt || col);
  var shownDesigns = 0;
  var perGroup = {{}};

  cards().forEach(function (c) {{
    var ok = (!book || c.dataset.book === book) &&
             (!cat || c.dataset.cat === cat) &&
             (!fmt || c.dataset.fmt === fmt) &&
             (!col || c.dataset.color === col) &&
             matches(c.dataset.name, c.dataset.tags, terms, q);
    c.style.display = ok ? '' : 'none';
    if (ok) {{
      shownDesigns++;
      var g = c.closest('.group').id;
      perGroup[g] = (perGroup[g] || 0) + 1;
    }}
    markChips(c, terms);
  }});
  document.querySelectorAll('.group[data-group-cat]').forEach(function (g) {{
    g.hidden = !perGroup[g.id];
  }});
  document.getElementById('sec-designs').hidden = shownDesigns === 0;

  /* Elements ignore the design facets — an ornament belongs to no book and no marker
     format — but they must answer the search, including inside a category nobody has
     opened yet, which is why the count comes from the data and not from the DOM. */
  var shownEls = 0;
  EL_CATS.forEach(function (name, i) {{
    var box = document.getElementById('elcat-' + catSlug[i]);
    var n = elByCat[i].length;
    if (q) {{
      n = 0;
      elByCat[i].forEach(function (e) {{
        if (matches(elName(e), STEM_TAGS[e[3]], terms, q)) n++;
      }});
    }}
    shownEls += n;
    box.hidden = (n === 0) || (facetsOn && !q);
    box.querySelector('.el-count').textContent =
      q ? n + ' of ' + elByCat[i].length : String(elByCat[i].length);
    if (q && n > 0) setOpen(i, true);
    /* Every RENDERED category is re-filtered, not just the ones with hits. A jump box
       lookup opens whatever category the number lives in, so by the time a search runs
       several categories may hold cards; leaving the misses displayed left them behind
       a hidden panel, visible again the moment that panel reopened. */
    if (rendered[i]) {{
      box.querySelectorAll('.element-card').forEach(function (c) {{
        c.style.display = matches(c.dataset.name, c.dataset.tags, terms, q) ? '' : 'none';
      }});
    }}
  }});
  var elHidden = (facetsOn && !q) || shownEls === 0;
  document.getElementById('sec-elements').hidden = elHidden;
  document.getElementById('group-elements').hidden = elHidden;
  if (facetsOn && !q) shownEls = 0;   // the count must describe what is on screen

  ['examples', 'reference'].forEach(function (k) {{
    var grp = document.getElementById('group-' + k);
    var n = 0;
    grp.querySelectorAll('.product-card').forEach(function (c) {{
      var ok = !facetsOn && matches(c.dataset.name, '', terms, q);
      c.style.display = ok ? '' : 'none';
      if (ok) n++;
    }});
    grp.hidden = n === 0;
    document.getElementById('sec-' + k).hidden = n === 0;
  }});

  document.getElementById('filterCount').textContent =
    shownDesigns.toLocaleString() + ' designs \\u00b7 ' + shownEls.toLocaleString() + ' elements';
  document.getElementById('emptyNote').hidden = !(shownDesigns === 0 && shownEls === 0);
}}

var flashed = null;
function flash(el) {{
  if (flashed) flashed.classList.remove('flash');
  flashed = el;
  el.classList.add('flash');
  /* Instant, not smooth. Cards below the fold hold their space (every image sits in a
     fixed aspect-ratio box) but a smooth scroll takes ~400ms, and typing the next digit
     of a number restarts it — the counselor watches the page glide past the design. */
  el.scrollIntoView({{ block: 'center' }});
}}

function jump(raw) {{
  var note = document.getElementById('jumpNote');
  var v = String(raw || '').trim();
  if (!v) {{ note.textContent = 'e.g. 1183, PCM 728, BASS 001'; note.classList.remove('miss'); return null; }}
  var digits = v.replace(/^\\s*pcm\\s*/i, '').trim();
  var hit = null;
  if (/^\\d+$/.test(digits)) {{
    hit = cards().filter(function (c) {{ return c.dataset.num === String(parseInt(digits, 10)); }})[0] || null;
  }}
  if (!hit) {{
    var key = norm(v);
    for (var i = 0; i < EL_CATS.length && !hit; i++) {{
      for (var k = 0; k < elByCat[i].length; k++) {{
        if (norm(elByCat[i][k][0]) === key) {{
          setOpen(i, true);
          hit = document.querySelector('#elcat-' + catSlug[i] +
            ' .element-card[data-id="' + elByCat[i][k][0].replace(/"/g, '') + '"]');
          break;
        }}
      }}
    }}
  }}
  if (hit) {{
    if (hit.style.display === 'none') {{ clearAll(true); }}
    var grp = hit.closest('.group');
    if (grp) grp.hidden = false;
    flash(hit);
    note.textContent = 'Found ' + (hit.dataset.id || '');
    note.classList.remove('miss');
    return hit;
  }}
  note.textContent = 'No design or element numbered ' + v;
  note.classList.add('miss');
  return null;
}}

function clearAll(keepJump) {{
  document.getElementById('searchInput').value = '';
  ['bookFilter', 'catFilter', 'fmtFilter', 'colorFilter'].forEach(function (id) {{
    document.getElementById(id).value = '';
  }});
  if (!keepJump) {{
    document.getElementById('pcmJump').value = '';
    document.getElementById('jumpNote').textContent = 'e.g. 1183, PCM 728, BASS 001';
    document.getElementById('jumpNote').classList.remove('miss');
  }}
  applyFilters();
}}

document.addEventListener('click', function (ev) {{
  var card = ev.target.closest && ev.target.closest('.product-card');
  if (!card) return;
  var img = card.querySelector('img');
  if (!img) return;
  document.getElementById('lightboxImg').src = img.src;
  document.getElementById('lightboxCap').textContent =
    (card.querySelector('.pcm-number') || card.querySelector('.ref-title') ||
     card.querySelector('.product-detail') || {{}}).textContent || '';
  document.getElementById('photoLightbox').classList.add('active');
}});
function closeLightbox() {{ document.getElementById('photoLightbox').classList.remove('active'); }}
document.addEventListener('keydown', function (e) {{ if (e.key === 'Escape') closeLightbox(); }});

document.getElementById('searchInput').addEventListener('input', applyFilters);
['bookFilter', 'catFilter', 'fmtFilter', 'colorFilter'].forEach(function (id) {{
  document.getElementById(id).addEventListener('change', applyFilters);
}});
document.getElementById('pcmJump').addEventListener('input', function () {{ jump(this.value); }});
document.getElementById('pcmJump').addEventListener('keydown', function (e) {{
  if (e.key === 'Enter') jump(this.value);
}});

applyFilters();
</script>
</body>
</html>
"""
    with open(PAGE, 'w', encoding='utf-8', newline='\r\n') as f:
        f.write(page)
    kb = os.path.getsize(PAGE) / 1024
    print(f'{PAGE}: {len(designs)} design cards in {len(groups_html)} groups, '
          f'{len(elements)} elements in {len(el_cats)} categories, '
          f'{len(photos)} photos, {len(refs)} reference plates ({kb:.0f} KB)')


def ELEM_ORDER(data):
    """The element book's own index order, which is the order they were extracted in."""
    seen, out = set(), []
    for e in data['elements']:
        if e['cat'] not in seen:
            seen.add(e['cat'])
            out.append((e['cat'], data['elementCats'][e['cat']], slug(e['cat'])))
    return out


if __name__ == '__main__':
    build()
