# -*- coding: utf-8 -*-
"""
Rebuild guides.html in the "Warm Library" design.

Content is READ OUT OF THE EXISTING PAGE rather than retyped, so nothing is
dropped or allowed to go stale: categories, card titles, descriptions, meta
lines, search keywords, CTA labels/links and PDF links all carry over exactly as
they are. That matters because the design mock predates the catalog expansion -
it still says "27 products" and omits the Vital Information Worksheet.

Design is taken as a reference, not a literal spec. Deliberate departures:
  * Fonts stay Cormorant Garamond + Source Sans 3, the site's established pair,
    rather than the mock's Newsreader/Figtree - this page is the hub that links
    to the five catalogs and should not look like a different site.
  * Navy/orange come from the catalog palette (#3d5a7a / #c8540a) rather than
    the mock's #3e6274, for the same reason.
  * The warm paper background, gradient section rules, count pills, card
    treatment and prominent search ARE taken from the mock.

The script round-trips its own output: CARD_RE/CAT_RE match exactly the markup
build() emits, so run-after-run is byte-identical (CRLF preserved). Standalone
HTML comments between cards (operator notes) are carried through verbatim. If
the page markup ever drifts from the regexes, the parse-count guard in __main__
aborts without writing — it never overwrites guides.html with an empty shell.

Run from the repo root:  python scripts/build_guides_page.py
"""
import html as _html
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

SRC = OUT = 'guides.html'

CARD_RE = re.compile(
    r'<div class="guide-card"\s+data-name="(?P<kw>[^"]*)">\s*'
    r'<div class="guide-title">(?P<title>.*?)</div>\s*'
    r'<div class="guide-desc">(?P<desc>.*?)</div>\s*'
    r'<span class="guide-meta-info">(?P<meta>.*?)</span>\s*'
    r'<div class="guide-actions">(?P<actions>.*?)</div>\s*</div>',
    re.S)
CAT_RE = re.compile(r'<div class="category" data-cat>\s*<div class="category-header">\s*'
                    r'<h2>(?P<name>.*?)</h2>(?P<body>.*?)(?=<div class="category" data-cat|</div>\s*</div>\s*<div class="no-results")',
                    re.S)
CTA_RE = re.compile(r'<a class="guide-cta" href="(?P<href>[^"]*)"(?P<rest>[^>]*)>(?P<label>.*?)</a>')
PDF_RE = re.compile(r'<a class="guide-pdf" href="(?P<href>[^"]*)"[^>]*>')
# Cards OR standalone HTML comments, in document order. Comments between cards are
# deliberate operator notes (e.g. why the COM Walkthrough card was withdrawn) and
# must survive a rebuild verbatim.
ITEM_RE = re.compile(CARD_RE.pattern + r'|(?P<comment><!--.*?-->)', re.S)


def parse(src):
    s = open(src, encoding='utf-8').read()
    cats = []
    for cm in CAT_RE.finditer(s):
        cards = []
        for m in ITEM_RE.finditer(cm.group('body')):
            if m.group('comment'):
                cards.append(dict(comment=m.group('comment')))
                continue
            cta = CTA_RE.search(m.group('actions'))
            pdf = PDF_RE.search(m.group('actions'))
            cards.append(dict(
                kw=m.group('kw'), title=m.group('title').strip(),
                desc=m.group('desc').strip(), meta=m.group('meta').strip(),
                href=cta.group('href') if cta else '#',
                label=cta.group('label').strip() if cta else 'Open →',
                target='target="_blank" rel="noopener"' if cta and 'target' in cta.group('rest') else '',
                pdf=pdf.group('href') if pdf else None,
            ))
        cats.append((cm.group('name').strip(), cards))
    return cats


CSS = """:root{
  --navy:#3d5a7a; --navy-deep:#2c445e; --ink:#2c4a5a;
  --orange:#c8540a; --orange-dark:#a5410f;
  --paper:#f4efe6; --card:#ffffff;
  --card-border:#ece2ce; --search-border:#e3d9c6; --meta-rule:#f0e9db;
  --body:#5a6b73; --card-body:#6b7176; --meta:#b0a078;
  --pill-bg:#ece2cf; --pill-ink:#a08c6a; --ghost-border:#cdd8dd; --footer-ink:#8a8578;
}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Source Sans 3',sans-serif;font-size:15px;background:var(--paper);color:var(--body);line-height:1.6;-webkit-font-smoothing:antialiased}

/* header */
.site-header{background:var(--navy);position:sticky;top:0;z-index:100;box-shadow:0 2px 12px rgba(0,0,0,.18)}
.header-inner{max-width:1180px;margin:0 auto;padding:0 44px;height:74px;display:flex;align-items:center;gap:16px}
.header-logo{height:34px;width:auto;flex-shrink:0}
.header-div{width:1px;height:26px;background:rgba(255,255,255,.28);flex-shrink:0}
.header-title{font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:600;color:#fff;white-space:nowrap}
.header-spacer{flex:1}
.header-back{color:#fff;font-size:13px;font-weight:600;text-decoration:none;padding:8px 15px;border:1px solid rgba(255,255,255,.45);border-radius:8px;white-space:nowrap;transition:background .15s}
.header-back:hover{background:rgba(255,255,255,.14)}

/* page */
.page-wrap{max-width:1180px;margin:0 auto;padding:46px 44px 60px}
.hero h1{font-family:'Cormorant Garamond',serif;font-size:40px;font-weight:600;color:var(--ink);line-height:1.1;margin-bottom:14px}
.hero p{font-size:16px;line-height:1.6;color:var(--body);max-width:720px;text-wrap:pretty}

/* search */
.search{margin:26px 0 6px;max-width:520px;background:var(--card);border:1px solid var(--search-border);border-radius:12px;padding:12px 18px;display:flex;align-items:center;gap:12px;box-shadow:0 2px 10px rgba(60,60,60,.04)}
.search svg{flex-shrink:0}
.search input{flex:1;border:0;outline:0;background:transparent;font-family:'Source Sans 3',sans-serif;font-size:15px;color:var(--ink)}
.search input::placeholder{color:#9a8f7a}
.search-count{font-size:12.5px;color:var(--meta);margin-top:10px;min-height:1em}

/* category */
.category{margin-top:38px}
.category-header{display:flex;align-items:baseline;gap:14px;margin-bottom:18px}
.category-header h2{font-family:'Cormorant Garamond',serif;font-size:23px;font-weight:600;color:var(--ink);white-space:nowrap}
.cat-rule{flex:1;height:1px;background:linear-gradient(90deg,#d9cdb6,transparent)}
.cat-count{font-size:12px;font-weight:600;color:var(--pill-ink);background:var(--pill-bg);border-radius:999px;padding:3px 11px;flex-shrink:0}

/* cards */
.card-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
.guide-card{background:var(--card);border:1px solid var(--card-border);border-radius:12px;padding:22px 22px 20px;display:flex;flex-direction:column;box-shadow:0 1px 3px rgba(60,50,30,.05);transition:box-shadow .18s,transform .18s}
.guide-card:hover{box-shadow:0 4px 14px rgba(60,50,30,.10);transform:translateY(-2px)}
.guide-title{font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:600;color:var(--ink);line-height:1.25;margin-bottom:9px}
.guide-desc{font-size:13.5px;line-height:1.55;color:var(--card-body);flex:1;text-wrap:pretty;margin-bottom:16px}
.guide-meta-info{display:block;font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--meta);border-top:1px solid var(--meta-rule);padding-top:13px;margin-bottom:14px}
.guide-actions{display:flex;gap:9px;align-items:center;flex-wrap:wrap}
.guide-cta{background:var(--orange);color:#fff;font-size:13px;font-weight:600;text-decoration:none;padding:9px 15px;border-radius:8px;white-space:nowrap;transition:background .15s}
.guide-cta:hover{background:var(--orange-dark)}
.guide-pdf{color:var(--navy);background:var(--card);font-size:13px;font-weight:600;text-decoration:none;padding:9px 13px;border:1px solid var(--ghost-border);border-radius:8px;white-space:nowrap;transition:background .15s,border-color .15s}
.guide-pdf:hover{background:#f4efe6;border-color:var(--navy)}

.no-results{display:none;color:var(--meta);font-size:14px;padding:26px 0}

/* footer */
.site-footer{margin-top:44px;padding-top:26px;border-top:1px solid var(--search-border);display:flex;align-items:center;gap:18px;flex-wrap:wrap}
.site-footer .footer-logo{height:30px;width:auto}
.site-footer .footer-text{font-size:12.5px;line-height:1.6;color:var(--footer-ink)}
.site-footer a{color:var(--orange);text-decoration:none;font-weight:600}
.site-footer a:hover{color:var(--orange-dark)}

@media (max-width:900px){
  .card-grid{grid-template-columns:repeat(2,1fr)}
  .header-inner,.page-wrap{padding-left:24px;padding-right:24px}
  .hero h1{font-size:32px}
}
@media (max-width:600px){
  .card-grid{grid-template-columns:1fr}
  .header-div,.header-title{display:none}
}
@media print{
  .site-header,.search,.search-count,.header-back{display:none!important}
  body{background:#fff}
  .guide-card{break-inside:avoid;page-break-inside:avoid}
  @page{margin:12mm}
}"""

SEARCH_ICON = ('<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9a8f7a" '
               'stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"></circle>'
               '<line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>')

JS = """(function(){
  var input=document.getElementById('filterInput');
  var count=document.getElementById('filterCount');
  var none=document.getElementById('noResults');
  var cards=[].slice.call(document.querySelectorAll('.guide-card'));
  var cats=[].slice.call(document.querySelectorAll('.category'));
  cards.forEach(function(c){
    c._hay=((c.getAttribute('data-name')||'')+' '+c.textContent+' '+
            (c.closest('.category').querySelector('h2').textContent||'')).toLowerCase();
  });
  function apply(){
    var q=(input.value||'').trim().toLowerCase();
    var shown=0;
    cards.forEach(function(c){
      var hit=!q||c._hay.indexOf(q)>-1;
      c.style.display=hit?'':'none';
      if(hit)shown++;
    });
    cats.forEach(function(cat){
      var any=[].slice.call(cat.querySelectorAll('.guide-card')).some(function(c){return c.style.display!=='none';});
      cat.style.display=any?'':'none';
    });
    none.style.display=shown?'none':'block';
    count.textContent=q?(shown+' of '+cards.length+' guides'):'';
  }
  input.addEventListener('input',apply);
  apply();
})();"""


def ncards(cards):
    return sum(1 for c in cards if 'comment' not in c)


def build(cats):
    total = sum(ncards(c) for _, c in cats)
    out = [
        '<!DOCTYPE html>', '<html lang="en">', '<head>', '<meta charset="UTF-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
        '<title>Family Guides &amp; Resources &middot; Bonney Watson</title>',
        '<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Source+Sans+3:wght@300;400;500;600;700&display=swap" rel="stylesheet">',
        '<style>', CSS, '</style>', '</head>', '<body>', '',
        '<header class="site-header">', '  <div class="header-inner">',
        '    <img src="logo.svg" alt="Bonney Watson" class="header-logo">',
        '    <div class="header-div"></div>',
        '    <div class="header-title">Family Guides &amp; Resources</div>',
        '    <div class="header-spacer"></div>',
        '    <a class="header-back" href="index.html">&larr; Quote Tool</a>',
        '  </div>', '</header>', '',
        '<div class="page-wrap">',
        '  <div class="hero">',
        '    <h1>Family Guides &amp; Resources</h1>',
        '    <p>Reference guides, pricing, and catalogs for families planning with Bonney Watson '
        'at Washington Memorial Park. Every guide opens in a built-in viewer where you can browse, '
        'print, or download.</p>',
        '  </div>', '',
        '  <div class="search">', '    ' + SEARCH_ICON,
        '    <input type="text" id="filterInput" placeholder="Search guides, catalogs, or forms&hellip;" '
        'aria-label="Search guides">',
        '  </div>',
        '  <div class="search-count" id="filterCount"></div>', '',
        '  <div id="categories">',
    ]
    for name, cards in cats:
        out += ['',
                '    <div class="category" data-cat>',
                '      <div class="category-header">',
                f'        <h2>{name}</h2>',
                '        <div class="cat-rule"></div>',
                f'        <span class="cat-count">{ncards(cards)}</span>',
                '      </div>',
                '      <div class="card-grid">']
        for c in cards:
            if 'comment' in c:
                out += ['        ' + c['comment']]
                continue
            tgt = ' ' + c['target'] if c['target'] else ''
            acts = f'<a class="guide-cta" href="{c["href"]}"{tgt}>{c["label"]}</a>'
            if c['pdf']:
                acts += f'<a class="guide-pdf" href="{c["pdf"]}" download>PDF &darr;</a>'
            out += [f'        <div class="guide-card" data-name="{c["kw"]}">',
                    f'          <div class="guide-title">{c["title"]}</div>',
                    f'          <div class="guide-desc">{c["desc"]}</div>',
                    f'          <span class="guide-meta-info">{c["meta"]}</span>',
                    f'          <div class="guide-actions">{acts}</div>',
                    '        </div>']
        out += ['      </div>', '    </div>']
    out += ['', '  </div>',
            '  <div class="no-results" id="noResults">No guides match your search.</div>', '',
            '  <footer class="site-footer">',
            '    <img src="logo-navy.svg" alt="Bonney Watson" class="footer-logo">',
            '    <div class="footer-text">Serving Seattle families since 1868 &middot; '
            'Washington Memorial Park &middot; <a href="https://www.bonneywatson.com" target="_blank" '
            'rel="noopener">bonneywatson.com</a><br>16445 International Blvd, SeaTac, WA 98188 '
            '&middot; 206-445-9794</div>',
            '  </footer>', '</div>', '',
            '<script>', JS, '</script>', '</body>', '</html>', '']
    return '\n'.join(out), total


if __name__ == '__main__':
    # HARD GUARD (build-prices.py pattern): if the page's markup has drifted away
    # from CARD_RE/CAT_RE, parsing silently finds nothing — and writing an empty
    # page destroys guides.html. Refuse to write unless every card in the source
    # was actually parsed.
    raw_cards = open(SRC, encoding='utf-8').read().count('<div class="guide-card"')
    cats = parse(SRC)
    total_parsed = sum(ncards(c) for _, c in cats)
    if total_parsed == 0:
        sys.exit(f'ABORT: parsed 0 cards from {SRC} (page has {raw_cards} "guide-card" divs). '
                 'CARD_RE/CAT_RE no longer match the page markup — nothing was written.')
    if total_parsed != raw_cards:
        sys.exit(f'ABORT: parsed {total_parsed} cards but {SRC} contains {raw_cards} '
                 '"guide-card" divs — the regexes are missing cards. Nothing was written.')
    page, total = build(cats)
    open(OUT, 'w', encoding='utf-8', newline='\r\n').write(page)
    print(f'{OUT}: {len(cats)} categories, {total} cards')
    for n, c in cats:
        print(f'    {n:26} {ncards(c)}')
