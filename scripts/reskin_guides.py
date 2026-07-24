# -*- coding: utf-8 -*-
"""
Reskin the drafted Veterans and Cemetery Property guides onto the house style.

Both were drafted with approximated tokens (dark #1a2744 navy, Lato body, a
light centered hero, a .topbar). This swaps the CHROME to match the sibling
guides exactly — navy sticky nav, navy cover block, centered .doc-sheet card,
Source Sans 3, #3d5a7a palette — while leaving every word of the approved body
content untouched. Body components (.section/.band/.note/.card/.compare/.costs/
.faq/.cta) keep their class names and markup; the stylesheet restyles them to
the house look, so no content markup is edited.

Chrome is rebuilt from pieces extracted out of each source file (nav links,
hero text, TOC items) so nothing is retyped.

Run from the repo root:  python scripts/reskin_guides.py
"""
import html
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

FONT_LINK = ('<link href="https://fonts.googleapis.com/css2?'
             'family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&'
             'family=Source+Sans+3:wght@300;400;500;600;700&display=swap" rel="stylesheet">')

STYLE = r"""
:root{
  --navy:#3d5a7a; --navy-dark:#2c445e; --navy-deep:#1e3a55;
  --orange:#c8540a; --orange-dark:#a5450a; --orange-soft:#dda06e;
  --white:#fff; --offwhite:#f4f6f8; --cream:#f8f6f2; --card-white:#fff;
  --warm-border:#e6e1d7; --rule:#ddd6c8;
  --text:#3a4453; --text-dark:#1a2332; --text-muted:#6a7686;
  --sidebar-bg:#f9f8f5; --gold:#b8945a;
  --display:'Cormorant Garamond',Georgia,'Times New Roman',serif;
  --body:'Source Sans 3',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth;scroll-padding-top:70px}
body{font-family:var(--body);font-size:15px;background:var(--offwhite);color:var(--text);line-height:1.6;-webkit-font-smoothing:antialiased}
strong{color:var(--navy-dark);font-weight:700}

/* nav */
.site-nav{background:var(--navy);position:sticky;top:0;z-index:100;box-shadow:0 2px 12px rgba(0,0,0,.25)}
.nav-inner{max-width:1100px;margin:0 auto;padding:10px 24px;display:flex;align-items:center;gap:18px}
.nav-logo{height:22px;width:auto;flex-shrink:0}
.nav-est{font-family:var(--display);font-size:12px;color:rgba(255,255,255,.5);font-style:italic;white-space:nowrap}
.nav-spacer{flex:1}
.nav-links{display:flex;gap:6px;flex-wrap:wrap}
.nav-links a{color:rgba(255,255,255,.75);font-size:12px;font-weight:600;text-decoration:none;padding:5px 12px;border-radius:20px;transition:all .15s;white-space:nowrap}
.nav-links a:hover,.nav-links a:focus-visible{background:rgba(255,255,255,.15);color:#fff}
.nav-back{color:#fff;font-size:12px;font-weight:600;text-decoration:none;padding:6px 12px;border:1px solid rgba(255,255,255,.3);border-radius:6px;white-space:nowrap;margin-left:10px;transition:background .15s}
.nav-back:hover{background:rgba(255,255,255,.12)}

/* doc-sheet + cover */
.doc-sheet{max-width:960px;margin:0 auto;background:var(--cream);border-radius:0 0 4px 4px;box-shadow:0 4px 30px rgba(0,0,0,.08);min-height:100vh}
.cover{background:var(--navy);padding:64px 48px 56px;position:relative;overflow:hidden}
.cover::before{content:'';position:absolute;top:50%;left:50%;width:600px;height:600px;background:radial-gradient(circle,rgba(200,84,10,.12) 0%,transparent 70%);transform:translate(-50%,-50%);pointer-events:none}
.cover-logo{height:34px;width:auto;display:block;margin-bottom:24px;position:relative}
.cover-kicker{font-family:var(--body);font-size:12px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--orange);margin-bottom:10px;position:relative}
.cover h1{font-family:var(--display);font-size:44px;font-weight:600;color:#fff;line-height:1.15;margin-bottom:16px;position:relative}
.cover-sub{font-family:var(--display);font-size:18px;font-style:italic;color:rgba(255,255,255,.7);line-height:1.5;max-width:600px;position:relative}
.cover-rule{width:50px;height:3px;background:var(--orange);margin:24px 0;border-radius:2px;position:relative}
.cover-footer{font-size:11px;font-weight:600;letter-spacing:.15em;text-transform:uppercase;color:rgba(255,255,255,.4);position:relative}
.cover-stripe{position:absolute;left:0;right:0;bottom:0;height:4px;background:linear-gradient(90deg,var(--navy-deep) 0 33.33%,#e9e2d4 33.33% 66.66%,var(--orange) 66.66% 100%);opacity:.9}

/* contents */
.contents{padding:40px 48px;border-bottom:1px solid var(--rule)}
.contents-label{font-family:var(--body);font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--orange);margin-bottom:18px}
.contents-grid{display:grid;grid-template-columns:1fr 1fr;gap:0}
.contents-item{display:flex;align-items:baseline;gap:12px;padding:12px 0;border-bottom:1px solid var(--rule)}
.contents-item:nth-last-child(-n+2){border-bottom:none}
.contents-num{font-family:var(--display);font-size:22px;font-weight:600;color:var(--orange);min-width:20px}
.contents-item a{font-size:14px;font-weight:600;color:var(--navy);text-decoration:none;transition:color .15s}
.contents-item a:hover{color:var(--orange)}

/* sections (drafted class names, restyled to house section-wrap) */
.section{max-width:none;margin:0;padding:48px 48px 40px}
.section + .section{border-top:1px solid var(--rule)}
.section-label{font-family:var(--body);font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--orange);margin:0 0 6px}
.section h2{font-family:var(--display);font-size:34px;font-weight:600;color:var(--navy-dark);line-height:1.2;margin:0 0 8px}
.section .sub{font-family:var(--display);font-size:16px;font-style:italic;color:var(--text-muted);margin:0 0 22px;max-width:none}
.rule{width:50px;height:2.5px;background:var(--orange);border:0;border-radius:2px;margin:0 0 26px}
.section .sub + .rule{margin-top:0}
.section p{margin:0 0 16px;max-width:70ch;font-size:15px;line-height:1.65}
.section p.wide{max-width:none}
.subhead{font-family:var(--display);font-size:24px;color:var(--navy);margin:34px 0 10px;font-weight:600}
a.inline{color:var(--orange);font-weight:700;text-decoration:none}
a.inline:hover{text-decoration:underline}

/* card grid */
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(258px,1fr));gap:16px;margin:8px 0 12px}
.card{background:var(--card-white);border:1px solid var(--warm-border);border-radius:10px;padding:22px 22px 20px}
.card h3{font-family:var(--display);font-size:22px;font-weight:600;color:var(--navy);margin:0 0 8px;line-height:1.2}
.card h3 .star{color:var(--gold);font-size:.9em;margin-right:7px}
.card p{margin:0;font-size:14px;color:var(--text);line-height:1.55}
.card p + p{margin-top:10px}
.card .fig{display:block;font-family:var(--display);font-size:26px;font-weight:700;color:var(--navy);margin:2px 0 4px}

/* dark callout (drafted .band -> house policy-box look) */
.band{background:linear-gradient(135deg,var(--navy) 0%,var(--navy-dark) 100%);color:#fff;border-radius:12px;padding:26px 30px;margin:26px 0 10px;position:relative;overflow:hidden}
.band::after{content:'';position:absolute;top:0;right:0;width:120px;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.04));pointer-events:none}
.band h3{font-family:var(--display);font-size:22px;font-weight:600;color:#fff;margin:0 0 10px}
.band p{margin:0;color:rgba(255,255,255,.88);font-size:14.5px;line-height:1.6;max-width:none}
.band p + p{margin-top:12px}
.band strong{color:var(--orange-soft)}

/* gold-left note callout */
.note{background:var(--card-white);border-left:4px solid var(--orange);border-top:1px solid var(--warm-border);border-right:1px solid var(--warm-border);border-bottom:1px solid var(--warm-border);padding:22px 26px;margin:26px 0 10px;border-radius:0 10px 10px 0}
.note h3{font-family:var(--display);font-size:22px;font-weight:600;color:var(--navy);margin:0 0 8px}
.note p{margin:0;max-width:none;font-size:14.5px;line-height:1.6}
.note p + p{margin-top:12px}

/* comparison table */
.compare{width:100%;border-collapse:collapse;margin:8px 0 12px;background:var(--card-white);border:1px solid var(--warm-border);border-radius:10px;overflow:hidden;font-size:14px}
.compare th,.compare td{padding:14px 16px;text-align:left;vertical-align:top;border-bottom:1px solid var(--rule)}
.compare thead th{background:var(--navy);color:#fff;font-family:var(--display);font-size:18px;font-weight:600;border-bottom:0}
.compare thead th:first-child{background:var(--navy);color:rgba(255,255,255,.55);font-family:var(--body);font-size:11px;letter-spacing:.14em;text-transform:uppercase;font-weight:700}
.compare tbody th{font-weight:700;color:var(--navy);width:23%;background:var(--sidebar-bg);font-size:13px}
.compare tbody tr:last-child th,.compare tbody tr:last-child td{border-bottom:0}
.compare .yes,.compare .same{color:#3a8a3a;font-weight:700}
.compare .no{color:var(--orange-dark);font-weight:700}

/* charge list */
.costs{background:var(--card-white);border:1px solid var(--warm-border);border-radius:10px;padding:6px 26px;margin:8px 0 12px}
.charge-list{list-style:none;margin:0;padding:0}
.charge-list li{padding:16px 0;border-bottom:1px solid var(--rule)}
.charge-list li:last-child{border-bottom:0}
.charge-list strong{display:block;font-family:var(--display);font-size:19px;font-weight:600;color:var(--navy);line-height:1.25;margin-bottom:2px}
.charge-list span{display:block;font-size:14px;color:var(--text-muted);line-height:1.5}

/* faq */
.faq{border-top:1px solid var(--rule);margin-top:8px}
.faq details{border-bottom:1px solid var(--rule)}
.faq summary{cursor:pointer;padding:20px 40px 20px 0;position:relative;font-family:var(--display);font-size:21px;font-weight:600;color:var(--navy);list-style:none}
.faq summary::-webkit-details-marker{display:none}
.faq summary::after{content:"+";position:absolute;right:8px;top:50%;transform:translateY(-50%);font-family:var(--display);font-size:26px;color:var(--orange);line-height:1}
.faq details[open] summary::after{content:"\2013"}
.faq summary:hover,.faq summary:focus-visible{color:var(--orange)}
.faq .answer{padding:0 40px 22px 0}
.faq .answer p{margin:0;max-width:none;font-size:14.5px;line-height:1.6}
.faq .answer p + p{margin-top:12px}

/* cta */
.cta{padding:8px 48px 48px}
.cta-in{background:linear-gradient(135deg,var(--navy) 0%,var(--navy-deep) 100%);border-radius:12px;padding:44px 40px;text-align:center;position:relative;overflow:hidden}
.cta-in h2{font-family:var(--display);font-weight:600;font-size:32px;color:#fff;margin:0 0 12px}
.cta-in p{color:rgba(255,255,255,.82);margin:0 auto 26px;max-width:52ch;font-size:15px}
.btn{display:inline-block;background:var(--orange);color:#fff;text-decoration:none;font-weight:700;font-size:12px;letter-spacing:.1em;text-transform:uppercase;padding:14px 28px;border-radius:6px;transition:background .15s ease}
.btn:hover,.btn:focus-visible{background:var(--orange-dark)}
.btn.ghost{background:transparent;border:1px solid rgba(255,255,255,.35);color:#dbe3ef;margin-left:10px}
.btn.ghost:hover,.btn.ghost:focus-visible{background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.6)}
.cta-in .direct{margin-top:24px;font-size:14px;color:rgba(255,255,255,.7)}
.cta-in .direct a{color:var(--orange-soft);text-decoration:none}
.cta-in .direct a:hover{text-decoration:underline}

/* disclaimer (both medicaid guides) */
.disclaimer{padding:8px 48px 40px}
.disclaimer p{font-size:12.5px;color:var(--text-muted);border-top:1px solid var(--rule);padding-top:18px;margin:0;max-width:none;line-height:1.6}

/* professional reference: audience bar */
.audience{background:var(--navy);color:rgba(255,255,255,.82);text-align:center;padding:11px 28px;font-size:11px;letter-spacing:.16em;text-transform:uppercase;font-weight:700}
.audience strong{color:var(--orange-soft)}

/* .callout == house .band treatment */
.callout{background:linear-gradient(135deg,var(--navy) 0%,var(--navy-dark) 100%);color:#fff;border-radius:12px;padding:26px 30px;margin:22px 0;position:relative;overflow:hidden}
.callout h3{font-family:var(--display);font-size:22px;font-weight:600;color:#fff;margin:0 0 10px}
.callout p{margin:0;color:rgba(255,255,255,.88);font-size:14.5px;line-height:1.6;max-width:none}
.callout p + p{margin-top:10px}
.callout strong{color:var(--orange-soft)}

/* statute tables */
.section table{width:100%;border-collapse:collapse;margin:16px 0 20px;background:var(--card-white);border:1px solid var(--warm-border);border-radius:10px;overflow:hidden;font-size:13.5px}
.section th,.section td{padding:13px 16px;text-align:left;vertical-align:top;border-bottom:1px solid var(--rule)}
.section thead th{background:var(--navy);color:#fff;font-family:var(--display);font-size:18px;font-weight:600;border-bottom:0}
.section thead th:first-child{color:rgba(255,255,255,.55);font-family:var(--body);font-size:11px;letter-spacing:.14em;text-transform:uppercase;font-weight:700}
.section tbody th{font-weight:700;color:var(--navy);width:26%;background:var(--sidebar-bg);font-size:13px}
.section tbody tr:last-child th,.section tbody tr:last-child td{border-bottom:0}

/* itemlist == charge-list treatment */
.itemlist{background:var(--card-white);border:1px solid var(--warm-border);border-radius:10px;padding:4px 24px;margin:16px 0 20px}
.itemlist ul{list-style:none;margin:0;padding:0}
.itemlist li{padding:13px 0;border-bottom:1px solid var(--rule)}
.itemlist li:last-child{border-bottom:0}
.itemlist strong{display:block;font-family:var(--display);font-size:18px;font-weight:600;color:var(--navy);margin-bottom:2px}
.itemlist span{display:block;font-size:13px;color:var(--text-muted)}

/* statute code + hyperlinked citations */
code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.9em;background:var(--sidebar-bg);border:1px solid var(--warm-border);padding:1px 5px;border-radius:3px;color:var(--navy)}
a.lawlink{text-decoration:none;border:0}
a.lawlink code{color:var(--orange);border-color:#e6c6a9;background:#fdf4ec;cursor:pointer}
a.lawlink:hover code,a.lawlink:focus-visible code{background:#f8e6d5;border-color:var(--orange)}
.cite{font-size:13px;color:var(--text-muted);font-weight:600}
.cite a{color:var(--orange);text-decoration:none;font-weight:700}
.cite a:hover{text-decoration:underline}

/* ordered priority ladder (who-decides Section 1) — order is the point, stays an <ol> */
.ladder{list-style:none;margin:8px 0 12px;padding:0;counter-reset:step;background:var(--card-white);border:1px solid var(--warm-border);border-radius:10px}
.ladder li{display:flex;gap:18px;align-items:flex-start;padding:18px 26px;border-bottom:1px solid var(--rule);counter-increment:step}
.ladder li:last-child{border-bottom:0}
.ladder li::before{content:counter(step);font-family:var(--display);font-size:26px;font-weight:700;color:var(--gold);line-height:1.1;min-width:24px}
.ladder strong{display:block;font-family:var(--display);font-size:19px;font-weight:600;color:var(--navy);line-height:1.25;margin-bottom:2px}
.ladder span{display:block;font-size:14px;color:var(--text-muted)}

/* small statute citations (who-decides .lawcite) */
.lawcite{font-size:13px;color:var(--text-muted);margin:-6px 0 22px;max-width:70ch}
.lawcite a{color:var(--orange);font-weight:700;text-decoration:none}
.lawcite a:hover{text-decoration:underline}
.card .lawcite,.band .lawcite{margin:10px 0 0}
.band .lawcite{color:rgba(255,255,255,.6)}
.band .lawcite a{color:var(--orange-soft)}

/* sources block */
.sources{padding:8px 48px 0}
.sources h3{font-family:var(--display);font-size:24px;font-weight:600;color:var(--navy);margin:0 0 4px;border-top:1px solid var(--rule);padding-top:22px}
.sources p.hint{font-size:13px;color:var(--text-muted);margin:0 0 14px}
.sources ul{list-style:none;margin:0;padding:0}
.sources li{padding:9px 0;border-bottom:1px solid var(--rule);font-size:14px}
.sources li:last-child{border-bottom:0}
.sources a{color:var(--navy);font-weight:700;text-decoration:none}
.sources a:hover{color:var(--orange);text-decoration:underline}
.sources .url{display:block;color:var(--text-muted);font-size:12px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;word-break:break-all;margin-top:2px}

/* contact block == cta treatment */
.contact{padding:8px 48px 0}
.contact-in{background:linear-gradient(135deg,var(--navy) 0%,var(--navy-deep) 100%);border-radius:12px;padding:36px 34px}
.contact-in h2{font-family:var(--display);font-weight:600;font-size:28px;color:#fff;margin:0 0 10px}
.contact-in p{color:rgba(255,255,255,.82);margin:0 0 18px;max-width:64ch;font-size:15px}
.contact-in .who{color:var(--orange-soft);font-weight:700;margin:0 0 2px}
.contact-in a{color:var(--orange-soft);text-decoration:none}
.contact-in a:hover{text-decoration:underline}
.contact-in .line{color:rgba(255,255,255,.72);font-size:14px;margin:0 0 3px}

/* footers */
.doc-footer{background:var(--cream);padding:48px 48px 40px;border-top:1px solid var(--rule);text-align:center}
.doc-footer .footer-logo{height:24px;width:auto;margin:0 auto 14px;display:block}
.doc-footer .footer-hours{font-size:14px;color:var(--text);margin-bottom:4px}
.doc-footer .footer-url{font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--orange);margin-bottom:12px;text-decoration:none;display:inline-block}
.doc-footer .footer-legal{font-size:12px;color:var(--text-muted)}
.site-footer{padding:22px 24px;background:var(--navy);color:rgba(255,255,255,.6);text-align:center;font-size:12px}
.site-footer a{color:rgba(255,255,255,.75);text-decoration:none}

a:focus-visible,summary:focus-visible,button:focus-visible{outline:3px solid var(--orange);outline-offset:3px}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}*{transition:none!important;animation:none!important}}

@media (max-width:820px){
  .nav-links{display:none}
  .cover{padding:48px 26px 40px}
  .cover h1{font-size:34px}
  .contents{padding:32px 26px}
  .contents-grid{grid-template-columns:1fr}
  .contents-item:nth-last-child(-n+2){border-bottom:1px solid var(--rule)}
  .contents-item:last-child{border-bottom:none}
  .section,.cta{padding-left:26px;padding-right:26px}
}
@media (max-width:640px){
  .compare,.compare thead,.compare tbody,.compare tr,.compare th,.compare td{display:block;width:100%}
  .compare thead{display:none}
  .compare tbody tr{border-bottom:2px solid var(--navy);padding:4px 0}
  .compare tbody tr:last-child{border-bottom:0}
  .compare tbody th{width:100%;background:var(--sidebar-bg);border-bottom:0;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--text-muted)}
  .compare tbody td{border-bottom:1px solid var(--rule);padding-top:10px}
  .compare tbody td::before{content:attr(data-label);display:block;font-size:10px;letter-spacing:.14em;text-transform:uppercase;font-weight:700;color:var(--orange);margin-bottom:4px}
}

@media print{
  @page{size:letter;margin:0}
  /* No ligature substitution in print: Ghostscript's downsample corrupts the ToUnicode
     map for fi/fl/ft, which makes those words unsearchable in the built PDF. */
  *{font-variant-ligatures:none;-webkit-font-variant-ligatures:none}
  html{background:var(--cream)}
  body{background:var(--cream);font-size:11pt;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .site-nav,.site-footer,.nav-back,.nav-links,.contents,.cta{display:none!important}
  .doc-sheet{max-width:none;box-shadow:none;margin:0;border-radius:0;padding:0 .5in;min-height:auto}
  .cover{padding:20px .5in 16px;margin:0 -.5in;border-radius:0;background:var(--navy)!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .cover h1{font-size:24pt}
  .cover-sub{font-size:12pt}
  .cover-stripe{display:none}
  .section{padding:14px 0 10px;break-inside:auto}
  .section + .section{border-top:1px solid var(--rule)}
  .section h2{break-after:avoid;page-break-after:avoid;font-size:20pt}
  .card,.band,.note,.compare{break-inside:avoid;page-break-inside:avoid}
  .ladder li,.charge-list li{break-inside:avoid;page-break-inside:avoid}
  .band{background:var(--navy)!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .compare thead{display:table-header-group}
  .faq details{break-inside:avoid;page-break-inside:avoid}
  .faq .answer{display:block!important}
  .faq summary::after{display:none}
  .audience{background:#fff!important;color:var(--navy)!important;border-bottom:2px solid var(--navy);padding:0 0 8pt;text-align:left;font-size:8pt}
  .audience strong{color:var(--navy)!important}
  .callout,.contact-in{background:var(--navy)!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .section table,.itemlist,.sources li{break-inside:avoid;page-break-inside:avoid}
  .section thead{display:table-header-group}
  a.lawlink code{color:var(--navy)!important;background:#fff!important;border-color:#999!important}
  .disclaimer,.sources,.contact{padding-left:0;padding-right:0}
  .doc-footer{padding:24px 0 20px;border-top:1px solid var(--rule)}
  .doc-footer .footer-url{display:none}
  a[href^="http"]::after{content:""}
}
"""

FOOTER_HTML = """  <div class="doc-footer">
    <img src="logo-navy.svg" alt="Bonney Watson" class="footer-logo">
    <div class="footer-hours">Serving Seattle families since 1868 &middot; Washington Memorial Park</div>
    <a href="https://www.bonneywatson.com" target="_blank" rel="noopener" class="footer-url">bonneywatson.com</a>
    <div class="footer-legal">16445 International Blvd, SeaTac, WA 98188 &middot; 206-445-9794<br>Martice Morrison &middot; 206-277-5417 &middot; mmorrison@bonneywatson.com</div>
  </div>

</div>

<footer class="site-footer">
  <a href="guides.html">&larr; Back to Family Guides &amp; Resources</a>
</footer>"""


def reskin(path, cover_footer, add_stripe):
    s = open(path, encoding='utf-8').read()
    if '<header class="topbar">' not in s:
        print(f'{path}: already reskinned (no .topbar) — skipping')
        return None

    # ---- head: fonts + style ----
    # Remove preconnects FIRST — a draft's <link rel="preconnect" ...fonts.googleapis...>
    # sits before the stylesheet and would otherwise be the first googleapis match,
    # leaving the real (Lato) stylesheet link behind. Then target the css2 stylesheet.
    s = re.sub(r'<link rel="preconnect"[^>]*>\s*', '', s)
    s = re.sub(r'<link[^>]*fonts\.googleapis\.com/css2[^>]*>', FONT_LINK, s, count=1)
    s = re.sub(r'<style>.*?</style>', '<style>' + STYLE + '</style>', s, count=1, flags=re.S)

    # ---- nav: .topbar -> .site-nav (reuse the page's own section links) ----
    topnav = re.search(r'<nav class="topnav"[^>]*>(.*?)</nav>', s, re.S).group(1)
    links = re.findall(r'<a href="(#[^"]+)"[^>]*>(.*?)</a>', topnav)
    nav_links = '\n'.join(f'      <a href="{h}">{t}</a>' for h, t in links)
    site_nav = (f'<nav class="site-nav">\n  <div class="nav-inner">\n'
                f'    <img src="logo.svg" alt="Bonney Watson" class="nav-logo">\n'
                f'    <span class="nav-est">Est. 1868</span>\n'
                f'    <div class="nav-spacer"></div>\n'
                f'    <div class="nav-links">\n{nav_links}\n    </div>\n'
                f'    <a class="nav-back" href="guides.html">&larr; All Guides</a>\n'
                f'  </div>\n</nav>')
    s = re.sub(r'<header class="topbar">.*?</header>', site_nav, s, count=1, flags=re.S)

    # ---- hero -> doc-sheet + cover ----
    hero = re.search(r'<section class="hero">(.*?)</section>', s, re.S).group(1)
    h1 = re.search(r'<h1>(.*?)</h1>', hero, re.S).group(1).strip()
    lede = re.search(r'<p class="lede">(.*?)</p>', hero, re.S).group(1).strip()
    eb = re.search(r'<p class="eyebrow">(.*?)</p>', hero, re.S)
    kicker = eb.group(1).strip().upper() if eb else 'BONNEY WATSON FAMILY GUIDE'
    # a statute-citation line in the hero (professional reference) moves to a
    # light band just under the cover, where orange links read fine.
    cite_m = re.search(r'<p class="cite">(.*?)</p>', hero, re.S)
    cite_after = (f'\n\n  <div class="cite" style="max-width:none;padding:20px 48px 0">'
                  f'{cite_m.group(1).strip()}</div>' if cite_m else '')
    stripe = '\n    <div class="cover-stripe"></div>' if add_stripe else ''
    cover = (f'<div class="doc-sheet">\n\n  <div class="cover">\n'
             f'    <img src="logo.svg" alt="Bonney Watson" class="cover-logo">\n'
             f'    <div class="cover-kicker">{kicker}</div>\n'
             f'    <h1>{h1}</h1>\n'
             f'    <div class="cover-sub">{lede}</div>\n'
             f'    <div class="cover-rule"></div>\n'
             f'    <div class="cover-footer">{cover_footer}</div>{stripe}\n'
             f'  </div>{cite_after}')
    s = re.sub(r'<section class="hero">.*?</section>', cover, s, count=1, flags=re.S)

    # ---- toc-wrap -> contents (only if the page has a TOC) ----
    toc = re.search(r'<div class="toc-wrap">(.*?</ol>)\s*</div>', s, re.S)
    items = []
    if toc:
        items = re.findall(r'<a href="(#[^"]+)"><span class="num">(\d+)</span>(.*?)</a>',
                           toc.group(1), re.S)
        citems = '\n'.join(
            f'      <div class="contents-item"><span class="contents-num">{n}</span>'
            f'<a href="{h}">{t.strip()}</a></div>' for h, n, t in items)
        contents = (f'  <div class="contents">\n'
                    f'    <div class="contents-label">In This Guide</div>\n'
                    f'    <div class="contents-grid">\n{citems}\n    </div>\n  </div>')
        s = re.sub(r'<div class="toc-wrap">.*?</ol>\s*</div>', contents, s, count=1, flags=re.S)

    # ---- <section class="section"> -> <div class="section">, </section> -> </div> ----
    s = s.replace('<section class="section"', '<div class="section"')
    s = s.replace('</section>', '</div>')

    # ---- footer -> house doc-footer + close doc-sheet + site-footer ----
    s = re.sub(r'<footer>.*?</footer>', FOOTER_HTML, s, count=1, flags=re.S)

    open(path, 'w', encoding='utf-8', newline='').write(s)

    # report
    dollars = s.count('$')
    print(f'{path}: rewritten | nav links {len(links)} | toc items {len(items)} | '
          f"'$' count {dollars}")
    return dollars


if __name__ == '__main__':
    reskin('cemetery-property-guide.html',
           'Interment rights &middot; property types &middot; every charge explained &middot; printable',
           add_stripe=False)
    reskin('veterans-guide.html',
           'VA benefits &middot; veterans sections &middot; marker options &middot; printable',
           add_stripe=True)
    reskin('cremation-or-burial-guide.html',
           'Side by side &middot; what each opens and closes &middot; printable',
           add_stripe=False)
    reskin('medicaid-family-guide.html',
           'Protected money &middot; locking money in &middot; timing &middot; printable',
           add_stripe=False)
    reskin('medicaid-professional-reference.html',
           'Linked statutes &middot; for professional partners &middot; printable',
           add_stripe=False)
    reskin('who-decides-guide.html',
           'Right of disposition &middot; naming an agent &middot; what signing means &middot; printable',
           add_stripe=False)
