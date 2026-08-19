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

# The two full-colour proof classes' curated text (s21 Tracks B1/B2). Same relationship to
# the proof images that data/pcm-subject-tags.json has to the book plates: somebody looked
# at every one of them and wrote down what is drawn. data/pcm-catalog.json carries the
# image facts (id, number, file, pixels); these carry the words.
DESC = {'single': 'data/pcm-desc-singles.json',
        'companion': 'data/pcm-desc-companions.json'}
SUBJECTS = 'data/pcm-subject-tags.json'

# What a proof card is, per class. `key` is how a catalog row finds its description:
# a companion proof is keyed by its number, a SINGLE proof by its string id, because
# PCM's gallery serves "1148" and "1148-2" as two different designs and on eight of the
# 372 the id and the printed number disagree (id 1148 is design PCM 1448). The number is
# the only thing shown; the id is the only thing joined on. See load_single_proofs().
PROOF_CLASSES = [
    ('single', 'singleProofs', 'singles', 'Single Marker Designs',
     'one name', 'sp'),
    ('companion', 'proofs', 'proofs', 'Companion Designs',
     'two names', 'cp'),
]

# Words that may never enter a proof card's data-name, however they got into the curated
# text. The page's format search is a FACET match, not a substring one, and sprint-12 wrote
# down why: when "companion" also matched the card's own name, stripping the facet off a
# card left it still findable, so the gate's needle landed on an accident instead of on the
# rule. Twenty single-proof descriptions say "a single rose stem" and would have reopened
# exactly that hole for the singles facet, so both class words are stripped rather than
# only the one that happens to collide today.
NAME_STOP = {'single', 'singles', 'companion', 'companions', 'proof', 'proofs',
             'individual', 'ledger', 'ledgers', 'flat'}

esc = lambda s: html.escape(str(s), quote=True)
norm = lambda s: ' '.join(re.sub(r'[^a-z0-9 ]', ' ', str(s).lower()).split())


def slug(s):
    return re.sub(r'-+', '-', re.sub(r'[^a-z0-9]+', '-', s.lower())).strip('-')


FMT_LABEL = {'flat': 'Flat marker', 'ledger': 'Ledger',
             'individual': 'Individual', 'companion': 'Companion'}

# ---- format / category search -------------------------------------------------------
# Operator ruling, sprint-12: typing "companion" must show all companion designs, and by
# extension the format and category words the books themselves use. Most of those words
# already matched by accident, because a card's data-name is built out of its cat/sub/fmt
# labels and the search does a substring test on it. Accident is not a feature:
#
#   * "companions" returned ZERO. The plural/singular tolerance lived only on the tag
#     path, so the one word a counselor is most likely to type in the plural missed.
#   * a "companion" hit lit no chip, so the page never said WHY the card came back —
#     which is precisely the explanation the subject search was built to give.
#
# So the format/category words become real, first-class facets on the card, matched with
# the same singular() rule the tags use, and explained with their own chips.
#
# These two are dropped: they are noise words shared by every group, they already match
# through data-name, and as facets they would put a meaningless chip on 700 cards.
FACET_STOP = {'collection', 'design', 'designs'}


def facet_tokens(*labels):
    """The searchable words in a group/format label, in order, deduped, minus the stops."""
    out = []
    for lab in labels:
        for w in norm(lab).split():
            if w not in FACET_STOP and w not in out:
                out.append(w)
    return out


def design_facets(d):
    """(all facet tokens, [(prefix, label, tokens) ...] for the chips).

    A chip is emitted only when its label CONTRIBUTES a word the earlier chips did not
    already carry. Under the section/theme axis the labels are the section ("Single Marker
    Designs" / "Companion Designs") and the theme, so:

      * a 2011 companion's fmt is already `companion`, the group label adds nothing, and
        it wears one format chip instead of the same word twice;
      * every companion LEDGER — the six from 2011 and the six from 2020 — has fmt
        `ledger`, so the group chip is the only thing that makes typing "companion" reach
        them AND say why. Sprint-12 kept that chip alive with a comment because the
        placement lied; now the placement is true and the chip merely agrees with it;
      * a 2020 plate finally answers "single" / "companion" at all. Before the restructure
        its only group word was "2020 collection", so 113 companion designs were
        unreachable by the word a family actually says.
    """
    seen, chips = [], []
    for prefix, lab in (('format', FMT_LABEL.get(d['fmt'], d['fmt'])),
                        ('group', d['cat']), ('category', d['sub'])):
        toks = facet_tokens(lab)
        new = [t for t in toks if t not in seen]
        if not new:
            continue
        seen.extend(new)
        chips.append((prefix, lab, toks))
    return seen, chips

# TWO top-level design sections, split by the question a family actually asks — one name
# or two — and inside each, the same theme axis over BOTH books (operator ruling,
# 2026-08-15, superseding the s21 layout).
#
# What this replaces and why. The old GROUP_ORDER led with "2020 Collection", i.e. with
# WHICH BOOK A PLATE WAS PRINTED IN, and a family has no idea what that means. Worse, the
# 2020 book prints no sections at all, so its 113 companion designs sat in a bucket called
# "Flat Markers" underneath a heading about a book — invisible to anyone shopping for a
# two-name marker, and unreachable by typing "companion". Book identity survives in exactly
# two places now: the #bookFilter dropdown and the detail panel's Book row.
#
# `sec` is the section-wrap id, `proof_sec` names the full-colour proof panel that leads the
# section (see PROOF_CLASSES) — proofs first, then the plates, which is the 2026-08-07
# ruling re-expressed at the new geometry.
SECTION_ORDER = [
    ('single', 'Single Marker Designs', 'sec-single', 'singles'),
    ('companion', 'Companion Designs', 'sec-companion', 'proofs'),
]
THEME_ORDER = ['Classic', 'Religious', 'Outdoors', 'Floral', 'Misc', 'Child', 'Ledgers']

# CROSS-LISTED PLATE, ruling 2026-08-15 (sprint-23 Track D). PCM 2271 (GREENE) is printed
# TWICE in the 2011 book, under Companion/Religious and again under Companion/Outdoors,
# and data/pcm-catalog.json keeps both rows because the book keeps both. Two rows in two
# different top-level sections was one thing; two cards a few hundred pixels apart inside
# ONE Companion section is just a duplicate to the family reading it. So the page places it
# once, and the choice was made by looking at the plate: a mountain-lake-forest scene fills
# the whole upper two-thirds edge to edge, and the cross is a small circular medallion
# tucked between the two name blocks. Somebody asking for a mountain scene should find it;
# somebody asking for a cross is not looking for this design. Hence Outdoors, not the
# Religious listing that comes first in the book.
# The catalog data is UNCHANGED — 700 rows, crossListed intact — so this costs no
# provenance. The page renders 699 plate cards; the gate pins both numbers.
CROSS_LISTED_HOME = {'2011-2271': 'Outdoors'}

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
html.family-view .nav-back,html.family-view .site-footer{display:none;}

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
/* The proof panel's own intro, sitting under a section head rather than owning one: same
   type, much less air above it, so it reads as part of the section it opens. */
.section-sub{padding:14px 48px 0;}
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
/* format/group/category chips read as the book's own filing, not as a subject somebody
   tagged by looking at the artwork — same shape, italic, so the two never get confused. */
.tag-facet{font-style:italic;}
.element-card .element-img{aspect-ratio:1/1;background:#fff;display:flex;align-items:center;justify-content:center;padding:9px;}
.element-card .element-img img{max-width:100%;max-height:100%;object-fit:contain;image-rendering:auto;}
.element-card .pcm-number{font-size:10.5px;font-weight:700;letter-spacing:.02em;padding:0 5px 8px;word-break:break-word;line-height:1.25;}
.photo-card .product-img{aspect-ratio:4/3;}
/* contain, not cover: several example frames are cropped down to remove the
   photographer's shoes at the bottom edge, which leaves them wider than 4:3. Under
   `cover` the card silently sliced the ends off the widest companion markers, cutting
   the second inscribed panel out of frame — the one thing a marker photo may not do.
   A thin letterbox is the cheaper price. */
.photo-card .product-img img{object-fit:contain;}
.photo-card .product-body{text-align:left;}
/* Companion proofs are `contain` on white for the same reason the example photos are:
   the default `cover` at 16/10 slices the ends off anything that is not 16:10, and on a
   companion marker the end that gets sliced is the second person's inscribed panel. Nine
   of the 232 proofs are portrait (500x800 uprights among the flats) and get the ledger's
   10/13 box instead of being letterboxed into a third of their card. */
.proof-card .product-img{background:#fff;}
.proof-card .product-img img{object-fit:contain;}
.proof-card[data-shape="portrait"] .product-img{aspect-ratio:10/13;}
/* A proof card carries real words now: a title above the number and one sentence below it,
   both written by looking at the artwork (data/pcm-desc-*.json). The title reuses
   `.product-detail` so the compare tray and both printed sheets pick it up through the
   same path every other card uses, rather than needing a second rule that could drift. */
.proof-card .proof-title{font-size:12.5px;font-weight:600;color:var(--navy-dark);line-height:1.3;}
.proof-card .proof-desc{font-size:11.5px;color:var(--text-muted);line-height:1.4;margin-top:4px;}
.reference-card .product-img{aspect-ratio:4/3;background:#fff;}
.reference-card .product-img img{object-fit:contain;}
.reference-card .product-body{text-align:left;}
.reference-card .ref-title{font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:600;color:var(--navy-dark);}

/* `.ex-cat` is the Installed Examples panel. It is a SEPARATE class carrying the same
   look, not a second `.el-cat`: the page's checks read every `.el-cat` and expect it to
   name an element category with a count that matches the element data, and a photo panel
   wearing that class reported itself as an element category with no data behind it. */
.el-cat,.ex-cat{border:1px solid var(--warm-border);background:#fff;border-radius:10px;margin-bottom:12px;overflow:hidden;}
.el-cat[hidden],.ex-cat[hidden]{display:none;}
.el-toggle{width:100%;display:flex;align-items:center;gap:12px;padding:12px 16px;background:none;border:none;cursor:pointer;font-family:'Source Sans 3',sans-serif;font-size:15px;font-weight:600;color:var(--navy-dark);text-align:left;}
.el-toggle:hover{background:var(--sidebar-bg);}
.el-toggle .el-count{margin-left:auto;font-size:12px;font-weight:600;color:var(--text-muted);font-variant-numeric:tabular-nums;}
.el-toggle .el-caret{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;transition:transform .15s;}
.el-cat.open .el-caret,.ex-cat.open .el-caret{transform:rotate(180deg);}
.el-body{display:none;padding:4px 16px 18px;border-top:1px solid var(--rule);}
.el-cat.open .el-body,.ex-cat.open .el-body{display:block;}

.empty-note{padding:26px 48px 40px;font-size:14px;color:var(--text-muted);}
.empty-note[hidden]{display:none;}

.photo-lightbox{position:fixed;inset:0;background:rgba(12,18,26,.92);display:none;align-items:center;justify-content:center;z-index:9999;padding:28px;}
.photo-lightbox.active{display:flex;}
.photo-lightbox img{width:min(96vw,1100px);max-height:74vh;object-fit:contain;background:#fff;border-radius:6px;}
.lightbox-cap{position:absolute;bottom:64px;left:0;right:0;text-align:center;color:#fff;font-size:15px;font-weight:600;letter-spacing:.05em;}
/* The enlarged view's own actions. Operator, 2026-08-07: "when enlarging a single pcm
   image there needs to be an option to print that" — the casket catalogs put a Print
   button on the enlarged product, this page had none. Every card class that can enlarge
   gets it, so the answer to "can I print this one?" is the same wherever he is. */
.lightbox-actions{position:absolute;bottom:18px;left:0;right:0;display:flex;justify-content:center;gap:10px;}
.lightbox-print{display:inline-flex;align-items:center;gap:8px;padding:10px 20px;background:var(--navy);color:#fff;border:none;border-radius:8px;font-family:'Source Sans 3',sans-serif;font-size:14px;font-weight:600;cursor:pointer;}
.lightbox-print:hover{background:var(--navy-dark);}
.lightbox-print svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}

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
  .site-nav,.site-footer,.toolbar,.contents,.photo-lightbox,.el-toggle,.doc-footer,
  .compare-tray,.compare-overlay,.compare-toggle{display:none!important;}
  .doc-sheet{max-width:none;box-shadow:none;}
  .cover{padding:20px 12px 16px;background:var(--navy)!important;}
  .cover h1{font-size:24pt;}
  .section-wrap,.group{padding:12px 12px 6px;}
  .product-card{break-inside:avoid;page-break-inside:avoid;cursor:auto;}
  .product-card:hover{box-shadow:none;transform:none;}
  .el-body{display:block;border-top:none;}
  .tag-row{display:none!important;}
  .compare-toggle{display:none!important;}
  a{text-decoration:none;color:inherit;}
}

/* ================= COMPARE + PRINT ==================================================
   Ported from the six casket catalogs (s09 Track K compare sheet, s11 Track C
   print-what's-filtered) and RE-DERIVED for design plates rather than casket photos.
   What carried over unchanged, because it is page geometry and not product shape:
   the fixed-position compare sheet that CLIPS (so its content must fit one page),
   the static-flow .fs-page stack for the filtered sheet, the masthead/footer bands,
   and the per-count photo caps 334 / 220 / 163 px — those come from
   816px letter - 32px margin - 88px label column, divided N ways, less cell padding,
   and this page prints on the same letter sheet.
   What did NOT carry over: casket photos are square, so their sheets use a 2-column
   photo grid at every count. A design plate is 16:10 and a ledger plate is 10:13, so
   width is even more strongly the binding dimension here — a single full-width column
   beats two half-width ones for 2 and 3 items, and only 4 items are better off in a
   2x2. And the per-count max-HEIGHT caps below exist only because of the ledgers: at
   334px wide a 10:13 ledger is 434px tall, which is the one thing that could push the
   clipping compare sheet past a page. */

.compare-toggle{display:flex;align-items:center;justify-content:center;gap:6px;margin-top:8px;padding-top:8px;border-top:1px solid var(--rule);font-size:11.5px;color:var(--text-muted);cursor:pointer;user-select:none;}
.compare-toggle input{width:14px;height:14px;accent-color:var(--navy);cursor:pointer;}
.compare-toggle input:disabled{cursor:not-allowed;opacity:.4;}
.compare-toggle input:disabled ~ span{opacity:.4;}
.element-card .compare-toggle{margin:0 4px;padding:0 0 7px;border-top:none;font-size:10px;gap:4px;}
.element-card .compare-toggle input{width:12px;height:12px;}
.product-card.comparing{border-color:var(--navy);box-shadow:0 0 0 2px rgba(61,90,122,.18);}

.compare-tray{position:fixed;left:0;right:0;bottom:-120px;background:var(--navy-dark);box-shadow:0 -6px 24px rgba(0,0,0,.2);z-index:500;transition:bottom .25s ease;padding:14px 24px;}
.compare-tray.visible{bottom:0;}
.compare-tray-inner{max-width:1600px;margin:0 auto;display:flex;align-items:center;gap:16px;flex-wrap:wrap;}
.compare-tray-items{display:flex;gap:10px;flex:1;flex-wrap:wrap;min-width:0;}
/* Opaque light pill: the chip thumbnail is a plate on white, and a translucent chip over
   navy turned every plate into a muddy silhouette. */
.compare-chip{display:flex;align-items:center;gap:8px;background:#fff;border-radius:8px;padding:6px 10px 6px 6px;}
.compare-chip img{width:44px;height:30px;object-fit:contain;background:#fff;border-radius:4px;display:block;}
.compare-chip-name{font-size:12.5px;font-weight:600;color:var(--navy-dark);max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.compare-chip-remove{background:none;border:none;color:var(--text-muted);font-size:16px;line-height:1;cursor:pointer;padding:0 2px;}
.compare-chip-remove:hover{color:var(--orange-dark);}
.compare-tray-actions{display:flex;align-items:center;gap:14px;flex-shrink:0;}
.compare-tray-msg{font-size:12px;color:#f3c9a8;}
.compare-tray-clear{background:none;border:none;color:rgba(255,255,255,.7);font-size:13px;cursor:pointer;text-decoration:underline;}
.compare-tray-clear:hover{color:#fff;}
.compare-tray-btn{background:var(--orange);color:#fff;border:none;border-radius:8px;padding:10px 20px;font-family:'Source Sans 3',sans-serif;font-size:14px;font-weight:700;cursor:pointer;white-space:nowrap;}
.compare-tray-btn:hover{background:var(--orange-dark);}
.compare-tray-btn:disabled{background:rgba(255,255,255,.15);color:rgba(255,255,255,.4);cursor:not-allowed;}

.compare-overlay{display:none;position:fixed;inset:0;background:#fff;z-index:9997;}
.compare-overlay.active{display:block;}
.compare-modal{width:100%;height:100%;display:flex;flex-direction:column;}
.compare-header{display:flex;align-items:center;gap:16px;padding:14px 32px;background:var(--navy);border-bottom:3px solid var(--orange);flex-wrap:wrap;flex-shrink:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
.compare-logo{height:26px;width:auto;flex-shrink:0;}
.compare-title{font-family:'Cormorant Garamond',serif;font-size:23px;font-weight:600;color:#fff;margin-right:auto;}
.compare-print-btn{display:inline-flex;align-items:center;gap:8px;padding:10px 18px;background:var(--orange);color:#fff;border:none;border-radius:8px;font-family:'Source Sans 3',sans-serif;font-size:13.5px;font-weight:600;cursor:pointer;white-space:nowrap;}
.compare-print-btn:hover{background:var(--orange-dark);}
.compare-close{width:36px;height:36px;flex-shrink:0;border:none;background:rgba(255,255,255,.16);border-radius:50%;cursor:pointer;font-size:20px;line-height:36px;text-align:center;color:#fff;}
.compare-close:hover{background:rgba(255,255,255,.3);}
/* The overlay's only view is the plates themselves — the operator removed the
   Side-by-Side spec table entirely (2026-08-04): "none of that is important, the
   photos themselves". The body is a flex column so the grid can fill the height. */
.compare-body{flex:1;overflow-y:auto;padding:32px;display:flex;flex-direction:column;}
.compare-photo-grid{display:grid;gap:24px;max-width:1800px;width:100%;margin:0 auto;flex:1;min-height:0;}
.compare-photo-col{display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:0;min-height:0;}
.compare-photo-img-wrap{background:var(--sidebar-bg);border-radius:12px;overflow:hidden;flex:1;width:100%;min-height:140px;display:flex;align-items:center;justify-content:center;cursor:zoom-in;margin-bottom:16px;}
.compare-photo-img-wrap img{max-width:100%;max-height:100%;object-fit:contain;}
.compare-photo-name{font-family:'Source Sans 3',sans-serif;font-size:20px;font-weight:700;letter-spacing:.03em;color:var(--navy-deep);margin-bottom:4px;}
.compare-photo-detail{font-size:13px;color:var(--text-muted);margin-bottom:10px;text-align:center;}
.compare-photo-remove{background:none;border:none;color:var(--text-muted);font-size:12px;cursor:pointer;text-decoration:underline;}
.compare-photo-remove:hover{color:var(--orange-dark);}

@media(max-width:768px){
  .compare-tray-inner{flex-direction:column;align-items:stretch;}
  .compare-tray-actions{justify-content:space-between;}
  .compare-header{padding:14px 18px;gap:12px;}
  .compare-title{width:100%;margin-right:0;}
  .compare-body{padding:20px;}
}

/* ---------- COMPARE PRINT SHEET (plates only, ONE page — it clips) ----------
   The spec-table print mode went with the Side-by-Side view (operator, 2026-08-04);
   what prints is exactly what the overlay shows: the plates. */
#compareSheet{display:none;}
@media print{
  body.compare-printing *{display:none!important;}
  body.compare-printing #compareSheet,
  body.compare-printing #compareSheet *{display:block!important;}
  body.compare-printing #compareSheet{display:flex!important;flex-direction:column;position:fixed;inset:0;width:100%;height:100%;background:#F6F2E9;z-index:99999;-webkit-print-color-adjust:exact;print-color-adjust:exact;}

  /* Layout-critical rules carry the body.compare-printing #compareSheet prefix so they
     out-rank the blanket display:block!important above — that selector carries an ID and
     a bare .cmp-x class would lose to it. */
  body.compare-printing #compareSheet .cmp-masthead{display:flex!important;align-items:center;background:#4B6E81;padding:14px 36px;border-bottom:3px solid #E5480F;}
  .cmp-masthead img{height:36px;width:auto;}
  .cmp-masthead-right{margin-left:auto;text-align:right;}
  .cmp-masthead-title{font-family:'Cormorant Garamond',serif;font-size:16px;font-weight:600;color:#fff;}
  .cmp-masthead-addr{font-size:9px;color:rgba(255,255,255,.6);margin-top:2px;}
  .cmp-eyebrow{font-family:'Source Sans 3',sans-serif;font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#E5480F;padding:12px 36px 0;}
  .cmp-title{font-family:'Cormorant Garamond',serif;font-size:19px;font-weight:700;color:#3b4a52;padding:2px 36px 12px;}

  body.compare-printing #compareSheet .cmp-photo-row{display:grid!important;flex:1;min-height:0;gap:18px;padding:14px 30px 6px;}
  body.compare-printing #compareSheet .cmp-photo-col{display:flex!important;flex-direction:column;align-items:center;justify-content:center;min-width:0;min-height:0;}
  body.compare-printing #compareSheet .cmp-photo-imgwrap{display:flex!important;align-items:center;justify-content:center;flex:1;width:100%;min-height:0;}
  .cmp-photo-imgwrap img{max-width:100%;max-height:100%;object-fit:contain;}
  .cmp-photo-name{font-family:'Source Sans 3',sans-serif;font-size:16px;font-weight:700;letter-spacing:.03em;color:#3b4a52;margin-top:8px;line-height:1.2;text-align:center;}
  .cmp-photo-detail{font-family:'Source Sans 3',sans-serif;font-size:10px;color:#8a9299;margin-top:3px;text-align:center;}

  body.compare-printing #compareSheet .cmp-footer{margin-top:auto;padding:10px 22px;border-top:1px solid #DBD3C4;display:flex!important;align-items:baseline;justify-content:space-between;}
  .cmp-advisor-name{font-family:'Source Sans 3',sans-serif;font-size:12px;font-weight:700;color:#E5480F;}
  .cmp-advisor-role{font-family:'Source Sans 3',sans-serif;font-size:9px;color:#8a9299;}
  .cmp-advisor-contact{font-family:'Source Sans 3',sans-serif;font-size:9px;color:#8a9299;text-align:right;}
}

/* ---------- FILTERED PRINT SHEET (paginated, N designs per page) ----------
   Unlike #compareSheet — position:fixed;height:100%, therefore CLIPPING whatever
   overflows one page — this is a normal static-flow stack of fixed-height .fs-page
   blocks with break-after:page, so a 300-design filter genuinely paginates. */
#filterSheet{display:none;}
.filter-print{display:inline-flex;align-items:center;gap:7px;padding:8px 14px;background:var(--navy);color:#fff;border:none;border-radius:8px;font-family:'Source Sans 3',sans-serif;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;}
.filter-print:hover{background:var(--navy-dark);}
.filter-print:disabled{opacity:.4;cursor:not-allowed;}
.filter-print svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}
.filter-print-pages{font-weight:400;opacity:.78;}
@media print{
  .filter-print{display:none!important;}
  body.filter-printing *{display:none!important;}
  body.filter-printing #filterSheet,
  body.filter-printing #filterSheet *{display:block!important;}
  body.filter-printing #filterSheet{background:#F6F2E9;-webkit-print-color-adjust:exact;print-color-adjust:exact;}

  body.filter-printing #filterSheet .fs-page{display:flex!important;flex-direction:column;box-sizing:border-box;width:8.5in;height:10.92in;overflow:hidden;background:#F6F2E9;break-after:page;page-break-after:always;break-inside:avoid;page-break-inside:avoid;}
  body.filter-printing #filterSheet .fs-page:last-child{break-after:auto;page-break-after:auto;}

  body.filter-printing #filterSheet .fs-masthead{display:flex!important;align-items:center;background:#4B6E81;padding:13px 32px;border-bottom:3px solid #E5480F;flex-shrink:0;}
  .fs-masthead img{height:32px;width:auto;}
  .fs-masthead-right{margin-left:auto;text-align:right;}
  .fs-masthead-title{font-family:'Cormorant Garamond',serif;font-size:17px;font-weight:600;color:#fff;}
  .fs-masthead-addr{font-size:9.5px;color:rgba(255,255,255,.6);margin-top:2px;}

  body.filter-printing #filterSheet .fs-subhead{display:flex!important;align-items:baseline;justify-content:space-between;gap:18px;padding:10px 32px 0;flex-shrink:0;}
  .fs-eyebrow{font-family:'Source Sans 3',sans-serif;font-size:10.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#E5480F;white-space:nowrap;}
  .fs-filters{font-family:'Source Sans 3',sans-serif;font-size:9.5px;color:#8a9299;text-align:right;}

  /* A FIXED 3x4 grid, not auto rows: the last page usually holds fewer than 12, and
     auto rows would stretch two designs over a whole sheet at a size no other page
     uses. Fixed rows keep every plate on every page the same size. */
  body.filter-printing #filterSheet .fs-items{display:grid!important;flex:1;min-height:0;padding:9px 32px 0;gap:10px;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(4,1fr);}
  body.filter-printing #filterSheet.fs-per-6 .fs-items{grid-template-columns:repeat(2,1fr);grid-template-rows:repeat(3,1fr);}
  body.filter-printing #filterSheet .fs-item{display:flex!important;flex-direction:column;min-height:0;min-width:0;border:1px solid #DBD3C4;border-radius:4px;background:#fff;padding:7px 8px 6px;}
  body.filter-printing #filterSheet .fs-photo{display:flex!important;align-items:center;justify-content:center;flex:1;min-height:0;width:100%;}
  .fs-photo img{max-width:100%;max-height:100%;object-fit:contain;}
  body.filter-printing #filterSheet .fs-body{display:block!important;flex-shrink:0;text-align:center;padding-top:5px;}
  .fs-name{font-family:'Source Sans 3',sans-serif;font-size:13px;font-weight:700;letter-spacing:.04em;color:#3b4a52;font-variant-numeric:tabular-nums lining-nums;}
  .fs-detail{font-family:'Source Sans 3',sans-serif;font-size:8.5px;color:#8a9299;margin-top:2px;line-height:1.25;overflow:hidden;}

  body.filter-printing #filterSheet .fs-footer{display:flex!important;align-items:baseline;justify-content:space-between;margin:0 32px;padding:8px 0 11px;border-top:1px solid #DBD3C4;flex-shrink:0;}
  .fs-advisor-name{font-family:'Source Sans 3',sans-serif;font-size:12px;font-weight:700;color:#E5480F;}
  .fs-advisor-role{font-family:'Source Sans 3',sans-serif;font-size:9px;color:#8a9299;}
  .fs-footer-right{text-align:right;}
  .fs-advisor-contact{font-family:'Source Sans 3',sans-serif;font-size:9px;color:#8a9299;}
  .fs-pageno{font-family:'Source Sans 3',sans-serif;font-size:9px;color:#8a9299;margin-top:2px;}
}

/* ---------- SINGLE-DESIGN PRINT SHEET (one design, ONE page) ----------
   The casket catalogs' #printSheet, ported: enlarge a product, press Print, and one
   page comes out with that product's photo, name and specs. This page had an enlarged
   view with no way out of it onto paper (operator, 2026-08-07).

   Same shape as #compareSheet — position:fixed, height:100%, so it CLIPS rather than
   flowing onto a second page. That is deliberate (one design, one page) and it is
   exactly why the gate asserts GEOMETRY, not `scrollHeight - clientHeight`: a clipped
   footer reports no overflow. The photo takes the slack (flex:1) so a long description
   shortens the plate instead of pushing the footer off the sheet.

   Two things the caskets' sheet does not have to do. The number line is the number PCM
   PRINTED (`.pcm-number`, i.e. data-num), never the file id — on eight single proofs
   those differ. And the specs are whatever the card actually carries: a book design has
   book/group/format/colour, a proof has a title and a sentence and nothing else, an
   element has its category. Empty rows are dropped rather than printed as em dashes. */
#designSheet{display:none;}
@media print{
  .lightbox-print{display:none!important;}
  body.design-printing *{display:none!important;}
  body.design-printing #designSheet,
  body.design-printing #designSheet *{display:block!important;}
  /* Beats the blanket rule above: an attribute selector counts as a class, so this is
     one step MORE specific than `#designSheet *`. Without it a hidden title prints as
     an empty band. */
  body.design-printing #designSheet [hidden]{display:none!important;}
  body.design-printing #designSheet{display:flex!important;flex-direction:column;position:fixed;inset:0;width:100%;height:100%;background:#F6F2E9;z-index:99999;-webkit-print-color-adjust:exact;print-color-adjust:exact;}

  /* Layout-critical rules carry the body.design-printing #designSheet prefix so they
     out-rank the blanket display:block!important above — a bare .ds-x class would lose
     to a selector carrying an ID. */
  body.design-printing #designSheet .ds-masthead{display:flex!important;align-items:center;background:#4B6E81;padding:14px 36px;border-bottom:3px solid #E5480F;flex-shrink:0;}
  .ds-masthead img{height:36px;width:auto;}
  .ds-masthead-right{margin-left:auto;text-align:right;}
  .ds-masthead-title{font-family:'Cormorant Garamond',serif;font-size:16px;font-weight:600;color:#fff;}
  .ds-masthead-addr{font-size:9px;color:rgba(255,255,255,.6);margin-top:2px;}
  .ds-eyebrow{font-family:'Source Sans 3',sans-serif;font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#E5480F;padding:13px 36px 0;flex-shrink:0;}

  body.design-printing #designSheet .ds-photo{display:flex!important;align-items:center;justify-content:center;flex:1;min-height:0;margin:12px 36px 0;}
  .ds-photo img{max-width:100%;max-height:100%;object-fit:contain;}

  body.design-printing #designSheet .ds-name-row{display:block!important;text-align:center;padding:16px 36px 10px;border-bottom:2px solid #4B6E81;flex-shrink:0;}
  .ds-name{font-family:'Cormorant Garamond',serif;font-size:32px;font-weight:700;color:#3b4a52;line-height:1.15;font-variant-numeric:tabular-nums lining-nums;}
  .ds-title{font-family:'Source Sans 3',sans-serif;font-size:15px;color:#4B6E81;margin-top:4px;}
  /* Inside the name row, above its rule: the sentence belongs to the design it
     describes, and below the rule it read as the first line of the spec table. */
  .ds-desc{font-family:'Source Sans 3',sans-serif;font-size:12px;line-height:1.45;color:#45525a;padding:8px 0 0;text-align:center;max-width:5.6in;margin:0 auto;}

  body.design-printing #designSheet .ds-specs{display:block!important;padding:4px 36px 0;margin:0;list-style:none;flex-shrink:0;}
  body.design-printing #designSheet .ds-specs li{display:flex!important;align-items:baseline;padding:7px 0;border-bottom:1px solid #EDE5D6;font-size:12px;}
  body.design-printing #designSheet .ds-specs li:last-child{border-bottom:none;}
  .ds-spec-label{font-family:'Source Sans 3',sans-serif;font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#8a9299;width:120px;flex-shrink:0;}
  .ds-spec-value{font-family:'Source Sans 3',sans-serif;color:#45525a;}

  body.design-printing #designSheet .ds-footer{margin-top:auto;padding:11px 36px;border-top:1px solid #DBD3C4;display:flex!important;align-items:baseline;justify-content:space-between;flex-shrink:0;}
  .ds-advisor-name{font-family:'Source Sans 3',sans-serif;font-size:12px;font-weight:700;color:#E5480F;}
  .ds-advisor-role{font-family:'Source Sans 3',sans-serif;font-size:9px;color:#8a9299;}
  .ds-advisor-contact{font-family:'Source Sans 3',sans-serif;font-size:9px;color:#8a9299;text-align:right;}
}
"""


# The compare checkbox. Identical markup on a design card (emitted here) and on an
# element card (emitted by renderCat in the page's own JS), so one selection model
# serves both and a 2020 design can be put beside a 2011 design or an ornament.
COMPARE_TOGGLE = ('          <label class="compare-toggle">'
                  '<input type="checkbox" class="compare-cb"><span>Compare</span></label>\n')


# ---- compare + print, the page's own JS ----------------------------------------------
# Kept OUT of the page f-string on purpose: that template doubles every brace, and this
# is 300 lines of JavaScript. One un-doubled brace in there is a Python error at build
# time, but one MIS-doubled brace is a JS error that only shows up in a browser.
COMPARE_JS = """
/* ---- compare + print -----------------------------------------------------------------
   The casket catalogs already answer "put these side by side" and "print exactly what I
   filtered to", and a counselor moves between those pages and this one in the same
   sitting. Same tray, same 4-item cap, same two tabs, same "Print these N \\u00b7 k pages"
   wording, same clipping-compare-sheet / paginating-filtered-sheet split.

   COMPARE SCOPE: designs AND elements, deliberately. A family choosing between a 2020
   design, a 2011 design and an ornament is choosing between three things that could end
   up on the same marker, and all three carry the one key this page is built around — a
   number. Installed-example photographs and the size/colour reference plates are NOT
   comparable: a photograph of somebody else's finished marker is not an alternative you
   pick, it is what the answer looks like afterwards, and neither carries a number to key
   on. They are excluded from compare and from the printed sheet.

   NO PRICES, here as everywhere on this page. The comparison a family makes here is
   between designs; the quote is built in the tool. */
(function () {
  var DASH = '\\u2014';
  var MAX_COMPARE = 4;

  /* Twelve per printed page, in a fixed 3x4 grid. The casket sheets print THREE, because
     a casket card is a photo beside six lines of construction/interior/finish/weight and
     the family is deciding on one object. A design plate carries no spec list at all —
     a number and one detail line — and it is 16:10, so a 3-wide column at 2.35in still
     renders the plate 1.45in tall, larger than the thumbnail these cards show on screen.
     Twelve also matters because of scale: 700 designs at 3/page is 234 sheets of paper
     and at 12/page it is 59. Measured against 6 (2x3) and 9 (3x3) by rendering all three
     and looking at them; 6 and 9 left most of each cell as white space around a wide,
     short plate. */
  var PER_PAGE = 12;
  var SHEET_TITLE = 'Marker Design Selection';
  var SHEET_EYEBROW = 'Granite Flat Markers';

  /* One view: the plates. The Side-by-Side spec table was removed by the operator
     (2026-08-04) — book/group/granite-color rows were noise next to the designs
     themselves, and the Plates view already puts four in a 2x2. */
  var selected = [];               // card keys, in the order they were picked

  var tray = document.getElementById('compareTray');
  var trayItems = document.getElementById('compareTrayItems');
  var trayMsg = document.getElementById('compareTrayMsg');
  var countEl = document.getElementById('compareCount');
  var openBtn = document.getElementById('compareOpenBtn');
  var overlay = document.getElementById('compareOverlay');
  var photoGridEl = document.getElementById('comparePhotoGrid');

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function byKey(key) {
    var all = document.querySelectorAll('.product-card[data-id]');
    for (var i = 0; i < all.length; i++) if (all[i].dataset.id === key) return all[i];
    return null;
  }

  /* Everything the two views and both printed sheets need, read off the card itself.
     Nothing is looked up in a parallel table, so a card that renders is a card that can
     be compared — which is what lets a lazily-built element card join in. */
  function cardData(card) {
    if (!card) return null;
    var img = card.querySelector('img');
    var numEl = card.querySelector('.pcm-number');
    var subj = (card.dataset.tags || '').split(' ').filter(Boolean)
      .map(function (t) { return t.replace(/-/g, ' '); });
    var d = {
      key: card.dataset.id || '',
      img: img ? img.getAttribute('src') : '',
      number: numEl ? numEl.textContent.trim() : (card.dataset.id || ''),
      subjects: subj.length ? subj.join(', ') : DASH
    };
    if (card.classList.contains('element-card')) {
      var box = card.closest('.el-cat');
      d.type = 'Design element';
      d.book = 'Design Elements';
      d.group = (box && box.dataset.elCat) || DASH;
      d.category = DASH;
      d.format = DASH;
      d.color = DASH;
    } else if (card.classList.contains('proof-card')) {
      /* A full-colour proof has no book, group, category or granite colour: it is not a
         page in a book, it is a picture of the artwork. What it does have that no other
         card has is a TITLE somebody wrote by looking at it, so that is what rides to the
         tray and to both printed sheets. Read off the card rather than looked up, like
         everything else here, so a card that renders is a card that can be compared. */
      d.type = 'Design proof';
      d.book = DASH;
      d.group = DASH;
      d.category = DASH;
      d.format = card.dataset.kind || DASH;
      d.color = DASH;
      d.detail = ((card.querySelector('.proof-title') || {}).textContent || '').trim();
      d.desc = ((card.querySelector('.proof-desc') || {}).textContent || '').trim();
    } else if (card.classList.contains('reference-card')) {
      /* Neither of the last two classes can be compared or reach a filtered sheet —
         they carry no checkbox and shownCards() does not look at them. They are here
         because they CAN be enlarged, and the enlarged view now prints. Without a
         branch they fell to the book-design one below and a photo of a granite sample
         would have printed as a "Marker design" with a blank number. */
      d.type = 'Reference plate';
      d.number = ((card.querySelector('.ref-title') || {}).textContent || '').trim();
      d.detail = ((card.querySelector('.product-detail') || {}).textContent || '').trim();
      d.book = d.group = d.category = d.format = d.color = DASH;
    } else if (card.classList.contains('photo-card')) {
      d.type = 'Installed example';
      d.number = '';
      d.detail = ((card.querySelector('.product-detail') || {}).textContent || '').trim();
      d.book = d.group = d.category = d.format = d.color = DASH;
    } else {
      d.type = 'Marker design';
      d.book = BOOK_LABELS[card.dataset.book] || card.dataset.book || DASH;
      d.group = card.dataset.cat || DASH;
      d.category = card.dataset.sub || DASH;
      d.format = FMT_LABELS[card.dataset.fmt] || card.dataset.fmt || DASH;
      d.color = card.dataset.color || DASH;
    }
    return d;
  }

  /* The same one-line caption the card shows on screen, so a printed sheet and the page
     it came from say the same thing about the same design. */
  function detailLine(d) {
    if (d.detail) return d.detail;
    if (d.type === 'Design element') return d.group;
    return [d.color !== DASH ? d.color : null, d.format !== DASH ? d.format : null]
      .filter(Boolean).join(' \\u00b7 ');
  }

  /* Enlarging from the compare overlay goes through the SAME entry point as enlarging
     from a card, so the enlarged view there carries the Print control too and prints the
     design it is showing — not whatever was enlarged last. */
  function zoom(key) { window.bwOpenLightbox(byKey(key)); }

  function updateCheckboxStates() {
    var cbs = document.querySelectorAll('.compare-cb');
    for (var i = 0; i < cbs.length; i++) {
      var cb = cbs[i];
      var card = cb.closest('.product-card');
      var key = card ? card.dataset.id : null;
      var on = !!key && selected.indexOf(key) > -1;
      cb.checked = on;
      cb.disabled = !on && selected.length >= MAX_COMPARE;
      if (card) card.classList.toggle('comparing', on);
    }
  }

  function renderTray() {
    trayItems.innerHTML = '';
    selected.forEach(function (key) {
      var d = cardData(byKey(key));
      if (!d) return;
      var chip = el('div', 'compare-chip');
      var img = document.createElement('img');
      img.src = d.img; img.alt = d.number;
      var rm = el('button', 'compare-chip-remove');
      rm.type = 'button';
      rm.innerHTML = '&times;';
      rm.setAttribute('aria-label', 'Remove ' + d.number + ' from the comparison');
      rm.addEventListener('click', function () { removeKey(key); });
      chip.appendChild(img);
      chip.appendChild(el('span', 'compare-chip-name', d.number));
      chip.appendChild(rm);
      trayItems.appendChild(chip);
    });
    countEl.textContent = selected.length;
    openBtn.disabled = selected.length < 2;
    tray.classList.toggle('visible', selected.length > 0);
    trayMsg.textContent = selected.length >= MAX_COMPARE
      ? 'Maximum of ' + MAX_COMPARE + ' reached \\u2014 remove one to add another.' : '';
  }

  function addKey(key) {
    if (selected.indexOf(key) > -1) return true;
    if (selected.length >= MAX_COMPARE) return false;
    selected.push(key);
    updateCheckboxStates();
    renderTray();
    return true;
  }

  function removeKey(key) {
    var i = selected.indexOf(key);
    if (i === -1) return;
    selected.splice(i, 1);
    updateCheckboxStates();
    renderTray();
    if (overlay.classList.contains('active')) {
      if (selected.length < 2) closeCompare();
      else renderActivePanel();
    }
  }

  /* Bind whatever cards exist in `root`. Called once for the designs, then again by
     renderCat every time a category materialises its cards. */
  window.bwBindCompare = function (root) {
    var cbs = (root || document).querySelectorAll('.compare-cb');
    for (var i = 0; i < cbs.length; i++) {
      var cb = cbs[i];
      if (cb.dataset.bound) continue;
      cb.dataset.bound = '1';
      var label = cb.closest('.compare-toggle');
      /* The whole card is a click target for the lightbox, so the checkbox has to stop
         its own click from reaching that handler \\u2014 otherwise ticking Compare also
         throws a full-screen image over the page. */
      if (label) label.addEventListener('click', function (e) { e.stopPropagation(); });
      cb.addEventListener('change', function () {
        var card = this.closest('.product-card');
        if (!card) return;
        if (this.checked) addKey(card.dataset.id);
        else removeKey(card.dataset.id);
      });
    }
    updateCheckboxStates();
  };

  function renderPhotoPanel(container, isPrint) {
    container.innerHTML = '';
    var n = selected.length;
    if (!isPrint) {
      if (n <= 3) {
        container.style.gridTemplateColumns = 'repeat(' + n + ', 1fr)';
        container.style.gridTemplateRows = '1fr';
      } else {
        container.style.gridTemplateColumns = 'repeat(2, 1fr)';
        container.style.gridTemplateRows = 'repeat(2, 1fr)';
      }
    } else {
      /* The casket sheet uses two columns at every count because its photos are square.
         A design plate is 16:10, so on a portrait page a single full-width column is
         strictly bigger for two or three plates (7.5in wide, height-capped at ~4.2in,
         against 3.6in in two columns). Only four plates come out ahead in a 2x2. */
      if (n <= 3) {
        container.style.gridTemplateColumns = '1fr';
        container.style.gridTemplateRows = 'repeat(' + n + ', 1fr)';
      } else {
        container.style.gridTemplateColumns = 'repeat(2, 1fr)';
        container.style.gridTemplateRows = 'repeat(2, 1fr)';
      }
    }
    selected.map(function (k) { return cardData(byKey(k)); }).forEach(function (d) {
      var col = el('div', isPrint ? 'cmp-photo-col' : 'compare-photo-col');
      var wrap = el('div', isPrint ? 'cmp-photo-imgwrap' : 'compare-photo-img-wrap');
      var img = document.createElement('img');
      img.src = d.img; img.alt = d.number;
      wrap.appendChild(img);
      if (!isPrint) wrap.addEventListener('click', function () { zoom(d.key); });
      col.appendChild(wrap);
      col.appendChild(el('div', isPrint ? 'cmp-photo-name' : 'compare-photo-name', d.number));
      col.appendChild(el('div', isPrint ? 'cmp-photo-detail' : 'compare-photo-detail',
                         detailLine(d)));
      if (!isPrint) {
        var rm = el('button', 'compare-photo-remove', 'Remove');
        rm.type = 'button';
        rm.addEventListener('click', function () { removeKey(d.key); });
        col.appendChild(rm);
      }
      container.appendChild(col);
    });
  }

  function renderActivePanel() {
    renderPhotoPanel(photoGridEl, false);
  }

  function closeCompare() {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }
  openBtn.addEventListener('click', function () {
    if (selected.length < 2) return;
    renderActivePanel();
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  });
  document.getElementById('compareClose').addEventListener('click', closeCompare);
  overlay.addEventListener('click', function (e) { if (e.target === overlay) closeCompare(); });
  document.getElementById('compareClearBtn').addEventListener('click', function () {
    selected = [];
    updateCheckboxStates();
    renderTray();
    if (overlay.classList.contains('active')) closeCompare();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!document.getElementById('photoLightbox').classList.contains('active')) closeCompare();
  });

  document.getElementById('comparePrintBtn').addEventListener('click', function () {
    renderPhotoPanel(document.getElementById('cmpPhotoRow'), true);
    document.body.classList.add('compare-printing');
    setTimeout(function () { window.print(); }, 100);
    window.addEventListener('afterprint', function handler() {
      document.body.classList.remove('compare-printing');
      window.removeEventListener('afterprint', handler);
    });
  });

  /* Exposed so a headless run can build the sheet without window.print(), which blocks. */
  window.bwCompareSelect = function (keys) {
    selected = [];
    (keys || []).slice(0, MAX_COMPARE).forEach(function (k) { selected.push(k); });
    updateCheckboxStates();
    renderTray();
    return selected.slice();
  };
  window.bwCompareMax = MAX_COMPARE;
  window.bwBuildCompareSheet = function () {
    renderPhotoPanel(document.getElementById('cmpPhotoRow'), true);
    return selected.length;
  };

  // ---------- print what is on screen ----------
  var sheet = document.getElementById('filterSheet');
  var btn = document.getElementById('filterPrintBtn');

  /* What a reader would see if they scrolled: not merely `style.display`, because a
     rendered element category that was CLOSED again still holds its cards with an empty
     inline display, and a facet that hides the whole elements block leaves them the
     same way. Both have to be walked, or the button promises pages of invisible cards. */
  /* ONE query in DOM order, not one pass per class. The proof sections sit ABOVE the book
     designs, so taking the classes in turn would print them in an order the page never
     shows — and the sheet's whole claim is that it prints what is on screen, in the order
     it is on screen. `.ex-cat` joins `.el-cat` in the fold test because the proof panels
     and Installed Examples are that kind of panel, and a folded panel's cards are not on
     screen however open the group around them is. */
  function shownCards() {
    var out = [];
    var list = document.querySelectorAll('.design-card, .proof-card, .element-card');
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if (c.style.display === 'none') continue;
      var g = c.closest('.group');
      if (g && g.hidden) continue;
      var box = c.closest('.el-cat, .ex-cat');
      if (box && (box.hidden || !box.classList.contains('open'))) continue;
      out.push(c);
    }
    return out;
  }

  /* A printed page with no line saying what it is a page OF is a page a family cannot
     put back in context a week later. */
  function activeFilterText() {
    var bits = [];
    var q = document.getElementById('searchInput').value.trim();
    if (q) bits.push('Search: "' + q + '"');
    [['bookFilter', 'Book'], ['catFilter', 'Section or theme'],
     ['fmtFilter', 'Format'], ['colorFilter', 'Granite color']].forEach(function (p) {
      var s = document.getElementById(p[0]);
      if (s && s.value) bits.push(p[1] + ': ' + s.options[s.selectedIndex].textContent.trim());
    });
    return bits.length ? bits.join('  \\u00b7  ') : 'All designs and elements';
  }

  function itemNode(card) {
    var d = cardData(card);
    var item = el('div', 'fs-item');
    var wrap = el('div', 'fs-photo');
    var img = document.createElement('img');
    img.src = d.img; img.alt = d.number;
    wrap.appendChild(img);
    item.appendChild(wrap);
    var body = el('div', 'fs-body');
    body.appendChild(el('div', 'fs-name', d.number));
    body.appendChild(el('div', 'fs-detail', detailLine(d)));
    item.appendChild(body);
    return item;
  }

  function build(cards) {
    sheet.innerHTML = '';
    sheet.className = 'fs-per-' + PER_PAGE;
    var pages = Math.ceil(cards.length / PER_PAGE) || 1;
    var filters = activeFilterText();
    for (var p = 0; p < pages; p++) {
      var page = el('div', 'fs-page');

      var mast = el('div', 'fs-masthead');
      var logo = document.createElement('img');
      logo.src = 'logo.svg'; logo.alt = 'Bonney Watson';
      mast.appendChild(logo);
      var mr = el('div', 'fs-masthead-right');
      mr.appendChild(el('div', 'fs-masthead-title', SHEET_TITLE));
      mr.appendChild(el('div', 'fs-masthead-addr',
        '16445 International Blvd, SeaTac WA 98188 \\u00b7 206-445-9794'));
      mast.appendChild(mr);
      page.appendChild(mast);

      var sub = el('div', 'fs-subhead');
      sub.appendChild(el('div', 'fs-eyebrow', SHEET_EYEBROW));
      sub.appendChild(el('div', 'fs-filters', filters));
      page.appendChild(sub);

      var items = el('div', 'fs-items');
      var end = Math.min((p + 1) * PER_PAGE, cards.length);
      for (var i = p * PER_PAGE; i < end; i++) items.appendChild(itemNode(cards[i]));
      page.appendChild(items);

      var foot = el('div', 'fs-footer');
      var fl = document.createElement('div');
      fl.appendChild(el('div', 'fs-advisor-name', 'Martice Morrison'));
      fl.appendChild(el('div', 'fs-advisor-role',
        'Family Service Advisor \\u00b7 Bonney Watson'));
      foot.appendChild(fl);
      var fr = el('div', 'fs-footer-right');
      fr.appendChild(el('div', 'fs-advisor-contact',
        'mmorrison@bonneywatson.com \\u00b7 206-445-9794'));
      fr.appendChild(el('div', 'fs-pageno', 'Page ' + (p + 1) + ' of ' + pages));
      foot.appendChild(fr);
      page.appendChild(foot);

      sheet.appendChild(page);
    }
    return pages;
  }

  window.bwBuildFilteredSheet = function () { return build(shownCards()); };
  window.bwFilteredPerPage = PER_PAGE;
  window.bwShownCardCount = function () { return shownCards().length; };

  window.printFiltered = function () {
    var cards = shownCards();
    if (!cards.length) return;
    build(cards);
    document.body.classList.add('filter-printing');
    setTimeout(function () { window.print(); }, 100);
    window.addEventListener('afterprint', function handler() {
      document.body.classList.remove('filter-printing');
      window.removeEventListener('afterprint', handler);
    });
  };

  window.bwUpdateFilterPrintBtn = function (n) {
    if (n === undefined) n = shownCards().length;
    var pages = Math.ceil(n / PER_PAGE);
    btn.disabled = !n;
    document.getElementById('filterPrintCount').textContent = n.toLocaleString();
    document.getElementById('filterPrintPages').textContent =
      n ? (' \\u00b7 ' + pages + (pages === 1 ? ' page' : ' pages')) : '';
  };

  // ---------- print ONE design, from the enlarged view ----------
  /* The casket catalogs' pattern, ported: the enlarged product carries a Print button,
     a hidden single-page sheet is filled from that product, a body class swaps the page
     for the sheet in print media, and afterprint takes the class back off.

     Two deviations from wood-caskets.html, both forced by this page:

     1. The caskets read the modal's own DOM (name, price, six fixed spec <li>s in a
        known order). There is no modal here and no fixed spec list — a proof has a title
        and a sentence, a book design has book/group/format/colour, an element has a
        category. So the sheet is filled from cardData(), the same reader the tray and
        both other sheets use, and rows that are DASH are dropped rather than printed.

     2. `body.modal-printing > :not(#printSheet)` (a CHILD combinator) is not portable
        here — #designSheet is not a direct child of <body> on this page, and that rule
        would hide its own ancestor. This page's own convention is used instead:
        blanket-hide, then re-show the sheet by id. */
  var dsSpecs = document.getElementById('dsSpecs');

  function dsLine(id, text) {
    var node = document.getElementById(id);
    node.textContent = text || '';
    node.hidden = !text;
    return text || '';
  }

  /* Exposed so a headless run can build the sheet without window.print(), which blocks. */
  window.bwBuildDesignSheet = function (card) {
    var d = cardData(card);
    if (!d) return null;
    var img = document.getElementById('dsImg');
    img.src = d.img;
    img.alt = d.number || d.type;
    var rows = [['Book', d.book], ['Group', d.group], ['Category', d.category],
                ['Format', d.format], ['Granite color', d.color], ['Subjects', d.subjects]]
      .filter(function (r) { return r[1] && r[1] !== DASH; });
    dsSpecs.innerHTML = '';
    rows.forEach(function (r) {
      var li = document.createElement('li');
      li.appendChild(el('span', 'ds-spec-label', r[0]));
      li.appendChild(el('span', 'ds-spec-value', r[1]));
      dsSpecs.appendChild(li);
    });
    return {
      key: d.key,
      type: dsLine('dsEyebrow', d.type),
      /* The number PCM PRINTED. cardData reads `.pcm-number`, which the builder writes
         from data-num — on eight single proofs the file id is a different number and
         printing it would send a family to the wrong design. */
      number: dsLine('dsName', d.number),
      title: dsLine('dsTitle', detailLine(d)),
      desc: dsLine('dsDesc', d.desc),
      specs: rows.map(function (r) { return r[0]; }),
      img: d.img
    };
  };

  window.printDesign = function (card) {
    if (!card) card = window.bwLightboxCard();
    if (!window.bwBuildDesignSheet(card)) return false;
    document.body.classList.add('design-printing');
    setTimeout(function () { window.print(); }, 100);
    window.addEventListener('afterprint', function handler() {
      document.body.classList.remove('design-printing');
      window.removeEventListener('afterprint', handler);
    });
    return true;
  };

  /* The lightbox closes on any click that reaches it, so the button has to keep its own
     click to itself — otherwise pressing Print dismisses the thing being printed. */
  document.getElementById('lightboxActions')
    .addEventListener('click', function (e) { e.stopPropagation(); });
  document.getElementById('lightboxPrint')
    .addEventListener('click', function () { window.printDesign(); });

  window.bwBindCompare(document);
})();
"""


def design_card(d, tags):
    bits = [d['id'].replace('-', ' '), 'pcm ' + str(d['num']), d['cat'], d['sub'],
            FMT_LABEL.get(d['fmt'], d['fmt']), d.get('color') or '', d['book'] + ' book']
    detail = ' &middot; '.join(x for x in [esc(d['color']) if d['color'] else '',
                                           FMT_LABEL.get(d['fmt'], d['fmt'])] if x)
    # The chips are the answer to "why did this card come back for 'flowers'?" - they sit
    # on every card so the vocabulary is discoverable, and the matching one lights up.
    facets, facet_chips = design_facets(d)
    chips = ''.join(
        f'<span class="tag tag-facet" data-facet="{esc(" ".join(toks))}">'
        f'{prefix}: {esc(lab.lower())}</span>'
        for prefix, lab, toks in facet_chips)
    chips += ''.join(f'<span class="tag" data-tag="{esc(t)}">{esc(t.replace("-", " "))}</span>'
                     for t in tags)
    return (
        f'      <div class="product-card design-card" data-id="{esc(d["id"])}" '
        f'data-num="{d["num"]}" data-book="{esc(d["book"])}" data-cat="{esc(d["cat"])}" '
        f'data-sub="{esc(d["sub"])}" data-fmt="{esc(d["fmt"])}" '
        f'data-color="{esc(d["color"])}" data-name="{esc(norm(" ".join(bits)))}" '
        f'data-tags="{esc(" ".join(tags))}" data-facets="{esc(" ".join(facets))}">\n'
        f'        <div class="product-img"><img src="{esc(d["img"])}" '
        f'alt="Design PCM {d["num"]}" loading="lazy"></div>\n'
        f'        <div class="product-body">\n'
        f'          <div class="product-detail">{detail}</div>\n'
        f'          <div class="pcm-number">PCM {d["num"]}</div>\n'
        f'          <div class="tag-row">{chips}</div>\n'
        f'{COMPARE_TOGGLE}'
        f'        </div>\n'
        f'      </div>')


def photo_card(p):
    return (
        f'      <div class="product-card photo-card" data-name="{esc(norm(p["desc"] + " " + p["src"]))}">\n'
        f'        <div class="product-img"><img src="{esc(p["img"])}" alt="{esc(p["desc"])}" loading="lazy"></div>\n'
        f'        <div class="product-body"><div class="product-detail">{esc(p["desc"])}'
        f' &middot; {esc(p["src"])}</div></div>\n'
        f'      </div>')


def proof_card(p, kind, prefix, meta):
    """A full-colour design proof, single or companion: the same PCM design number the
    books print, but the manufacturer's own proof -- artwork laid onto the real granite
    colour with sample lettering, rather than the book's black-and-white plate.

    Three things the card has to do that a photo or reference card does not.

    It carries `data-num`, so the jump box finds a proof by its PCM number exactly as it
    finds a plate -- and `data-num` is the number PCM PRINTED, never the file id, which on
    eight singles is a different number entirely.

    It carries `data-facets`, so the operator's sprint-12 ruling (typing "companion" shows
    all companion designs) keeps holding for a class that has no fmt/cat/sub of its own,
    and so the same sentence is now true of "single". The facet is a real match through
    singular(), not a substring accident, and the chip lights up to say why the card came
    back.

    And it carries the curated text: a title, one sentence, and the subject tags, all from
    data/pcm-desc-*.json. The tags are the SAME slugs the book plates use, which is the
    point of the shared vocabulary -- one search reaches a plate and a proof of the same
    subject and explains both with the same chip.

    NO SOURCE CHIP. It used to read "source: full-colour proof" beside the format; the
    operator removed it (2026-08-07): "not helpful to a family". The section prose says
    what a proof is once, in words a family can use, instead of every card repeating a
    manufacturing term 619 times. The facet went with the chip -- a facet nothing explains
    is a hit with no reason attached, which is the failure the chips exist to prevent."""
    lang = meta.get('language')
    facets = [kind] + ([lang] if lang else [])
    chips = (f'<span class="tag tag-facet" data-facet="{esc(kind)}">'
             f'format: {esc(kind)}</span>')
    if lang:
        chips += (f'<span class="tag tag-facet" data-facet="{esc(lang)}">'
                  f'language: {esc(lang)}</span>')
    chips += ''.join(f'<span class="tag" data-tag="{esc(t)}">{esc(t.replace("-", " "))}</span>'
                     for t in meta['tags'])
    # The haystack: number, title, sentence, language. NAME_STOP is subtracted afterwards
    # so no format word can reach a card except through its facet -- see NAME_STOP.
    words = [w for w in norm(f'pcm {p["num"]} {p["num"]} {meta["title"]} {meta["desc"]} '
                             f'{lang or ""}').split() if w not in NAME_STOP]
    name = ' '.join(words)
    return (
        f'      <div class="product-card proof-card {kind}-card" '
        f'data-id="{prefix}-{esc(p.get("id", p["num"]))}" data-num="{p["num"]}" '
        f'data-kind="{esc(kind)}" '
        f'data-shape="{"portrait" if p["px"][1] > p["px"][0] else "landscape"}" '
        f'data-name="{esc(name)}" data-tags="{esc(" ".join(meta["tags"]))}" '
        f'data-facets="{esc(" ".join(facets))}">\n'
        f'        <div class="product-img"><img src="{esc(p["img"])}" '
        f'alt="PCM {p["num"]} {kind} design proof" loading="lazy"></div>\n'
        f'        <div class="product-body">\n'
        f'          <div class="product-detail proof-title">{esc(meta["title"])}</div>\n'
        f'          <div class="pcm-number">PCM {p["num"]}</div>\n'
        f'          <div class="proof-desc">{esc(meta["desc"])}</div>\n'
        f'          <div class="tag-row">{chips}</div>\n'
        f'{COMPARE_TOGGLE}'
        f'        </div>\n'
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

    # ---- the two full-colour proof classes ------------------------------------------
    # Each is (rows from the catalog) joined to (curated text) on the class's own key, and
    # the join is asserted BOTH WAYS at build time. A silently unjoined row would ship a
    # card with a blank title, which is precisely the thing a family would notice first and
    # a count-based check would not notice at all.
    vocabulary = json.load(open(SUBJECTS, encoding='utf-8'))['vocabulary']
    classes = []
    for kind, data_key, sec, heading, _who, prefix in PROOF_CLASSES:
        rows = data.get(data_key) or []
        doc = json.load(open(DESC[kind], encoding='utf-8'))['designs']
        keys = [str(r.get('id', r['num'])) for r in rows]
        no_text = [k for k in keys if k not in doc]
        orphan_text = [k for k in doc if k not in set(keys)]
        if no_text or orphan_text:
            raise SystemExit(
                '%s: %d proof(s) with no description (%s) and %d description(s) with no '
                'proof (%s); re-run the import or re-curate %s'
                % (kind, len(no_text), ', '.join(no_text[:6]) or 'none',
                   len(orphan_text), ', '.join(orphan_text[:6]) or 'none', DESC[kind]))
        blank = [k for k in keys if not (doc[k].get('title') or '').strip()
                 or not (doc[k].get('desc') or '').strip()]
        if blank:
            raise SystemExit('%s: %d proof(s) have an empty title or description: %s'
                             % (kind, len(blank), ', '.join(blank[:8])))
        stray = sorted({t for k in keys for t in doc[k]['tags'] if t not in vocabulary})
        if stray:
            raise SystemExit(
                '%s: tag(s) outside the shared vocabulary in %s: %s. The proof classes and '
                'the book plates tag from ONE vocabulary (%s) so that one search reaches '
                'both; add the term there with a gloss, or use the term that already exists.'
                % (kind, DESC[kind], ', '.join(stray), SUBJECTS))
        # How many of this class's numbers the books never printed. Computed, not typed:
        # the split between "a better picture of a plate we already have" and "a design the
        # books do not carry" is the whole reason these ship as their own sections instead
        # of replacing plates, and it must not drift out of date on the page.
        new = len({r['num'] for r in rows} - {d['num'] for d in designs})
        cards = '\n'.join(proof_card(r, kind, prefix, doc[str(r.get('id', r['num']))])
                          for r in rows)
        classes.append(dict(kind=kind, sec=sec, heading=heading, rows=rows,
                            new=new, cards=cards))
    singles_c, comp_c = classes[0], classes[1]
    proofs = comp_c['rows']
    singles = singles_c['rows']

    untagged = [d['id'] for d in designs if not design_tags.get(d['id'])]
    if untagged:
        raise SystemExit('%d design(s) have no subject tags; run scripts/pcm_tags.py: %s'
                         % (len(untagged), ', '.join(untagged[:10])))

    # The card reads its group off data-cat / data-sub, and from here on those two carry the
    # SECTION and the THEME rather than the book's own headings. The book's labels stay in
    # data/pcm-catalog.json as provenance; nothing on the page groups on them any more.
    sec_label = {k: lab for k, lab, _, _ in SECTION_ORDER}
    placed = set()
    by_group = {}
    for d in designs:
        if 'family' not in d or 'theme' not in d:
            raise SystemExit(
                '%s has no family/theme. data/pcm-catalog.json predates the section '
                'restructure — re-run scripts/pcm_extract.py --data.' % d['id'])
        theme = CROSS_LISTED_HOME.get(d['id'], d['theme'])
        if d['id'] in placed:
            continue            # a cross-listed plate is placed once; see CROSS_LISTED_HOME
        placed.add(d['id'])
        d = dict(d, cat=sec_label[d['family']], sub=theme)
        by_group.setdefault((d['family'], theme), []).append(d)
    for v in by_group.values():
        v.sort(key=lambda d: d['num'])

    # A cross-listed row that resolved to a theme its own listings never mention would mean
    # the ruling and the book have drifted apart, and the surviving card would sit under a
    # heading nothing supports.
    for cid, home in CROSS_LISTED_HOME.items():
        rows = [d for d in designs if d['id'] == cid]
        if len(rows) < 2:
            raise SystemExit('%s is in CROSS_LISTED_HOME but is not cross-listed in the '
                             'catalog (%d row(s))' % (cid, len(rows)))
        if home not in {r['theme'] for r in rows}:
            raise SystemExit('%s: CROSS_LISTED_HOME says %r but its listings are %r'
                             % (cid, home, sorted({r['theme'] for r in rows})))

    groups_html = {}
    for fam, lab, _sec, _proof in SECTION_ORDER:
        out = []
        for theme in THEME_ORDER:
            items = by_group.get((fam, theme))
            if not items:
                continue
            gid = slug(fam + '-' + theme)
            cards = '\n'.join(design_card(d, design_tags[d['id']]) for d in items)
            out.append(
                f'    <div class="group" id="group-{gid}" data-group-cat="{esc(lab)}" '
                f'data-group-sub="{esc(theme)}" data-group-family="{esc(fam)}">\n'
                f'      <div class="group-head"><h3>{esc(theme)}</h3>'
                f'<span class="group-rule"></span>'
                f'<span class="group-count">{len(items)}</span></div>\n'
                f'      <div class="product-grid">\n{cards}\n      </div>\n'
                f'    </div>')
        groups_html[fam] = '\n'.join(out)
    # Same guard as before, adapted: a theme nobody ordered would silently not render.
    missing = set(by_group) - {(f, t) for f, _, _, _ in SECTION_ORDER for t in THEME_ORDER}
    if missing:
        raise SystemExit('SECTION_ORDER/THEME_ORDER is missing: ' + repr(sorted(missing)))
    n_cards = sum(len(v) for v in by_group.values())

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

    # ---- the two design sections ----------------------------------------------------
    # Each section opens with its full-colour proofs and then runs the book plates by
    # theme. That is the 2026-08-07 ruling — proofs before plates, because they are the
    # clearest pictures of the artwork we have — held to at the new geometry: it is now
    # true INSIDE each section instead of across the top of the page.
    #
    # The proof panel is the same folding panel Installed Examples is, opening OPEN, so one
    # convention covers every panel on the page. The prose is the operator's own (voice
    # rules in docs/GUIDES_VOICE_DEBRIEF_2026-08.md): first person, contractions, no em
    # dashes, and one sentence saying what a full-colour proof actually is, because "proof"
    # is a manufacturing word and a family has no reason to know it.
    PROSE = {
        'single':
            'Every design here is for a marker with <strong>one name</strong>. The '
            '{plates} black and white plates further down are scans of the design books, '
            'grouped by what they show. Pricing isn&rsquo;t shown here; I build the quote '
            'in the tool.',
        'companion':
            'Every design here is for a marker with <strong>two names</strong> &mdash; one '
            'stone across two spaces. Same arrangement as above: the proofs first, then '
            'the {plates} book plates by theme.',
    }
    PROOF_PROSE = {
        'single':
            'These are Pacific Coast Memorials&rsquo; own <em>full-colour proofs</em>: the '
            'design printed on the granite colour with sample lettering, instead of the '
            'black and white plate the design books use. They&rsquo;re the clearest '
            'pictures I have of these {n} one-name designs, so I put them first. {new} of '
            'these numbers aren&rsquo;t printed in either design book. Search by what '
            'you&rsquo;re looking for, and the tags under each card show why it came back.',
        'companion':
            'The same full-colour proofs for {n} designs made for a marker with two names. '
            'They carry the same PCM numbers as the design books, so the <em>Go to&nbsp;#</em> '
            'box finds them and typing <em>companion</em> reaches all of them. {new} of '
            'these numbers aren&rsquo;t printed in either design book.',
    }
    proof_by_kind = {c['kind']: c for c in classes}
    plate_count = {fam: sum(len(v) for (f, _t), v in by_group.items() if f == fam)
                   for fam, _l, _s, _p in SECTION_ORDER}
    design_sections = []
    for fam, lab, sec, _proof in SECTION_ORDER:
        c = proof_by_kind[fam]
        design_sections.append(
            f'  <div class="section-wrap" id="{sec}">\n'
            f'    <div class="section-head">{esc(lab)}</div>\n'
            f'    <div class="section-note">'
            f'{PROSE[fam].format(plates=plate_count[fam])}</div>\n'
            f'  </div>\n'
            f'  <div class="section-wrap section-sub" id="{sec}-proofs">\n'
            f'    <div class="section-note">'
            f'{PROOF_PROSE[c["kind"]].format(n=len(c["rows"]), new=c["new"])}</div>\n'
            f'  </div>\n'
            f'  <div class="group" id="group-{c["sec"]}">\n'
            f'    <div class="ex-cat open" id="elcat-{c["sec"]}">\n'
            f'      <button class="el-toggle" type="button" '
            f'onclick="togglePanel(\'{c["sec"]}\')"\n'
            f'              aria-expanded="true" aria-controls="elbody-{c["sec"]}">\n'
            f'        <svg class="el-caret" viewBox="0 0 24 24">'
            f'<polyline points="6 9 12 15 18 9"></polyline></svg>\n'
            # The panel used to repeat the section name; now the section head above says
            # it, so the panel says what KIND of card is inside instead.
            f'        <span>Full-colour proofs</span>'
            f'<span class="el-count" id="{c["sec"]}Count">{len(c["rows"])}</span>\n'
            f'      </button>\n'
            f'      <div class="el-body" id="elbody-{c["sec"]}">\n'
            f'        <div class="product-grid">\n{c["cards"]}\n        </div>\n'
            f'      </div>\n'
            f'    </div>\n'
            f'  </div>\n'
            + groups_html[fam])
    design_sections_html = '\n'.join(design_sections)

    books = sorted({d['book'] for d in designs}, reverse=True)
    # One control, two axes. `catFilter` used to list the book's own top-level groups; it
    # now lists the two SECTIONS and the seven THEMES, and applyFilters matches a card on
    # either. A sixth dropdown was the alternative and the toolbar already carries five —
    # and "which section" and "which theme" are the same question a family is asking
    # ("show me companion designs", "show me something religious").
    themes = [t for t in THEME_ORDER if any(f_t[1] == t for f_t in by_group)]
    fmts = sorted({d['fmt'] for d in designs})
    colors = sorted({d['color'] for d in designs if d['color']})

    opt = lambda vals, all_label: '\n'.join(
        [f'        <option value="">{all_label}</option>'] +
        [f'        <option value="{esc(v)}">{esc(lbl)}</option>' for v, lbl in vals])

    optgrp = lambda label, vals: '\n'.join(
        [f'        <optgroup label="{esc(label)}">'] +
        [f'          <option value="{esc(v)}">{esc(lbl)}</option>' for v, lbl in vals] +
        ['        </optgroup>'])
    cat_options = '\n'.join([
        '        <option value="">All sections and themes</option>',
        optgrp('Section', [(lab, lab) for _f, lab, _s, _p in SECTION_ORDER]),
        optgrp('Theme', [(t, t) for t in themes])])

    page = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>PCM Flat Marker Design Catalog &middot; Bonney Watson</title>
<!-- GENERATED by scripts/build_pcm_catalog.py from data/pcm-catalog.json. Do not edit. -->
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Source+Sans+3:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>{STYLE}</style>
<script>if(/[?&]family(=|&|$)/.test(location.search))document.documentElement.classList.add('family-view');</script>
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
    <div class="cover-sub">Every flat-marker and ledger design Pacific Coast Memorials makes,
      plus the full ornament library &mdash; in two sections, one for a marker with one name and
      one for a marker with two, each grouped by what the design shows. The design number is on
      every card so a family can point and we can look it up on the spot.</div>
    <div class="cover-rule"></div>
    <div class="cover-footer">{plate_count['single'] + len(singles):,} single &middot; {plate_count['companion'] + len(proofs):,} companion designs &middot; {len(singles) + len(proofs)} full-colour proofs &middot; {n_cards} book plates &middot; {len(elements):,} design elements &middot; {len([p for p in photos])} photographed markers</div>
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
    <select id="bookFilter" aria-label="Design book or proof set">
{opt([(b, ('2020 Design Book' if b == '2020' else '2011 Design Book')) for b in books] +
     [('single-proofs', 'Single full-colour proofs only'),
      ('companion-proofs', 'Companion full-colour proofs only')],
     'All designs')}
    </select>
    <select id="catFilter" aria-label="Section or theme">
{cat_options}
    </select>
    <select id="fmtFilter" aria-label="Format">
{opt([(f, FMT_LABEL.get(f, f)) for f in fmts], 'All formats')}
    </select>
    <select id="colorFilter" aria-label="Granite color">
{opt([(c, c) for c in colors], 'All granite colors')}
    </select>
    <button class="btn-clear" type="button" id="clearFilters" onclick="clearAll()">Clear</button>
    <span class="filter-count" id="filterCount"></span>
    <button class="filter-print" type="button" id="filterPrintBtn" onclick="printFiltered()">
      <svg viewBox="0 0 24 24"><path d="M6 9V2h12v7"></path><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
      Print these <span id="filterPrintCount">0</span><span class="filter-print-pages" id="filterPrintPages"></span>
    </button>
  </div>

  <div class="contents">
    <a href="#sec-single">Single Marker Designs</a>
    <a href="#sec-companion">Companion Designs</a>
    <a href="#sec-elements">Design Elements</a>
    <a href="#sec-examples">Installed Examples</a>
    <a href="#sec-reference">Sizes, Colors &amp; Lettering</a>
  </div>

{design_sections_html}

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
    <div class="ex-cat open" id="elcat-examples">
      <button class="el-toggle" type="button" onclick="toggleExamples()"
              aria-expanded="true" aria-controls="elbody-examples">
        <svg class="el-caret" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>
        <span>Installed Examples</span><span class="el-count" id="examplesCount">{len(photos)}</span>
      </button>
      <div class="el-body" id="elbody-examples">
        <div class="product-grid photos">
{chr(10).join(photo_card(p) for p in photos)}
        </div>
      </div>
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
  <div class="lightbox-actions" id="lightboxActions">
    <button class="lightbox-print" id="lightboxPrint" type="button">
      <svg viewBox="0 0 24 24"><path d="M6 9V2h12v7"></path><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
      Print This Design
    </button>
  </div>
</div>

<div class="compare-tray" id="compareTray">
  <div class="compare-tray-inner">
    <div class="compare-tray-items" id="compareTrayItems"></div>
    <div class="compare-tray-actions">
      <span class="compare-tray-msg" id="compareTrayMsg"></span>
      <button class="compare-tray-clear" id="compareClearBtn" type="button">Clear all</button>
      <button class="compare-tray-btn" id="compareOpenBtn" type="button">Compare (<span id="compareCount">0</span>)</button>
    </div>
  </div>
</div>

<div class="compare-overlay" id="compareOverlay">
  <div class="compare-modal">
    <div class="compare-header">
      <img src="logo.svg" alt="Bonney Watson" class="compare-logo">
      <div class="compare-title">Compare Designs</div>
      <button class="compare-print-btn" id="comparePrintBtn" type="button">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"></path><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
        Print Comparison
      </button>
      <button class="compare-close" id="compareClose" type="button">&times;</button>
    </div>
    <div class="compare-body">
      <div class="compare-photo-grid" id="comparePhotoGrid"></div>
    </div>
  </div>
</div>

<div id="compareSheet">
  <div class="cmp-masthead">
    <img src="logo.svg" alt="Bonney Watson">
    <div class="cmp-masthead-right">
      <div class="cmp-masthead-title">Marker Design Comparison</div>
      <div class="cmp-masthead-addr">16445 International Blvd, SeaTac WA 98188 &middot; 206-445-9794</div>
    </div>
  </div>
  <div class="cmp-eyebrow">Granite Flat Markers</div>
  <div class="cmp-title" id="cmpTitle">Design Plates</div>
  <div class="cmp-photo-row" id="cmpPhotoRow"></div>
  <div class="cmp-footer">
    <div><div class="cmp-advisor-name">Martice Morrison</div><div class="cmp-advisor-role">Family Service Advisor &middot; Bonney Watson</div></div>
    <div class="cmp-advisor-contact">mmorrison@bonneywatson.com &middot; 206-445-9794</div>
  </div>
</div>

<!-- Pages are built on demand by printFiltered(). -->
<div id="filterSheet"></div>

<!-- One design, one page. Filled by bwBuildDesignSheet() from whatever card is enlarged. -->
<div id="designSheet">
  <div class="ds-masthead">
    <img src="logo.svg" alt="Bonney Watson">
    <div class="ds-masthead-right">
      <div class="ds-masthead-title">Marker Design Selection</div>
      <div class="ds-masthead-addr">16445 International Blvd, SeaTac WA 98188 &middot; 206-445-9794</div>
    </div>
  </div>
  <div class="ds-eyebrow" id="dsEyebrow"></div>
  <div class="ds-photo"><img id="dsImg" src="" alt=""></div>
  <div class="ds-name-row">
    <div class="ds-name" id="dsName"></div>
    <div class="ds-title" id="dsTitle" hidden></div>
    <div class="ds-desc" id="dsDesc" hidden></div>
  </div>
  <ul class="ds-specs" id="dsSpecs"></ul>
  <div class="ds-footer">
    <div><div class="ds-advisor-name">Martice Morrison</div><div class="ds-advisor-role">Family Service Advisor &middot; Bonney Watson</div></div>
    <div class="ds-advisor-contact">mmorrison@bonneywatson.com &middot; 206-445-9794</div>
  </div>
</div>

<footer class="site-footer">
  <a href="guides.html">&larr; Back to all guides</a>
</footer>

<script>
var EL_CATS = {json.dumps(el_cats)};
var ELEMENTS = {json.dumps(payload, separators=(',', ':'))};
var STEM_TAGS = {json.dumps(stem_tag_payload, separators=(',', ':'))};
var SYNONYMS = {json.dumps(synonyms, separators=(',', ':'))};
var FMT_LABELS = {json.dumps(FMT_LABEL, separators=(',', ':'))};
var BOOK_LABELS = {{'2020': '2020 Design Book', '2011': '2011 Design Book'}};
var COMPARE_TOGGLE_HTML = {json.dumps(COMPARE_TOGGLE.strip())};

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
      '" loading="lazy"></div><div class="pcm-number">' + esc(e[0]) + '</div>' +
      COMPARE_TOGGLE_HTML + '</div>');
  }});
  grid.innerHTML = html.join('');
  /* A category can render at any time — opened, searched into, or jumped to — so the
     compare layer re-binds whatever just appeared rather than binding once at load. */
  if (window.bwBindCompare) window.bwBindCompare(grid);
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

/* Installed Examples is the same kind of panel as an element category — one bar with a
   caret and a count, one click to fold it away — because a counselor showing a family
   the 2020 book does not always want thirty photographs of somebody else's marker under
   it. It differs from an element category in exactly one way: it opens OPEN. An element
   category starts closed because 3,973 cards cannot all be in the DOM at once; these
   thirty-five are already there and were visible before this panel existed, so starting
   closed would have HIDDEN content rather than given control over it. */
function toggleExamples(open) {{
  var el = document.getElementById('elcat-examples');
  if (!el) return;
  var on = (open === undefined) ? !el.classList.contains('open') : !!open;
  el.classList.toggle('open', on);
  el.querySelector('.el-toggle').setAttribute('aria-expanded', on ? 'true' : 'false');
}}

/* The two proof panels fold the same way Installed Examples does. One function rather than
   one per panel: they are the same control, and three near-identical copies is how the
   third one quietly stops matching the other two. */
function togglePanel(key, open) {{
  var el = document.getElementById('elcat-' + key);
  if (!el) return;
  var on = (open === undefined) ? !el.classList.contains('open') : !!open;
  el.classList.toggle('open', on);
  el.querySelector('.el-toggle').setAttribute('aria-expanded', on ? 'true' : 'false');
}}

/* The jump box searches DESIGN cards first and the proof classes second, in that order and
   deliberately. 330 proof numbers are also book plates, and the plate is the canonical
   record of the design; somebody who types 2271 should land on the plate, then see the
   proof at the top of the page. The 289 numbers the books never printed have no plate to
   land on, so for those the proof IS the hit — which is why the fallback exists at all
   rather than the jump simply missing.

   Between the two proof classes the order is page order, and it is free to be: no number
   is both a single proof and a companion proof, which the gate asserts rather than
   assumes. */
var designCards = null;
function cards() {{
  if (!designCards) designCards = Array.prototype.slice.call(
    document.querySelectorAll('.design-card'));
  return designCards;
}}

var proofCards = null;
function proofs() {{
  if (!proofCards) proofCards = Array.prototype.slice.call(
    document.querySelectorAll('.proof-card'));
  return proofCards;
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

/* ---- format / category facets -------------------------------------------------------
   A design's format and its book group are searchable words in their own right:
   "companion", "companions", "individual", "ledger", "ledgers", "flat", "flat marker",
   plus the book's own section words. They used to match only as a substring of the
   card's data-name, which meant no plural tolerance ("companions" found nothing) and no
   chip to explain the hit. Both sides are singularised before comparing, so the query
   and the label meet in the middle whichever one carries the s. */
function facetMatch(facetStr, term) {{
  if (!facetStr) return null;
  var have = facetStr.split(' '), t = singular(term);
  for (var i = 0; i < have.length; i++) {{
    var f = have[i];
    if (f === term || f === t || singular(f) === t || singular(f) === term) return f;
  }}
  return null;
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
function matches(name, tagStr, terms, rawQuery, facetStr) {{
  if (!terms.length) return true;
  if (name.indexOf(rawQuery) !== -1) return true;
  var have = tagStr ? tagStr.split(' ') : [];
  for (var i = 0; i < terms.length; i++) {{
    var term = terms[i];
    if (name.indexOf(term) !== -1) continue;
    if (facetMatch(facetStr, term)) continue;
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
    if (chip.dataset.facet !== undefined) {{
      var on = false;
      terms.forEach(function (t) {{ if (facetMatch(chip.dataset.facet, t)) on = true; }});
      chip.classList.toggle('hit', on);
    }} else {{
      chip.classList.toggle('hit', !!(hit && hit[chip.dataset.tag]));
    }}
  }});
}}

function applyFilters() {{
  var q = norm(document.getElementById('searchInput').value);
  var terms = q ? q.split(' ') : [];
  var book = document.getElementById('bookFilter').value;
  var cat = document.getElementById('catFilter').value;
  var fmt = document.getElementById('fmtFilter').value;
  var col = document.getElementById('colorFilter').value;

  /* The design-book dropdown scopes to a PROOF SET as well as to a book (operator ruling,
     2026-08-07: a family should be able to say "just show me the single marker designs").
     Those two values are not books, so they are pulled out here: `bookSel` is the only
     thing that narrows a design card, and `proofSet` is the only thing that scopes the
     proof panels. Adding a second dropdown was the alternative and was rejected — the
     toolbar already carries five controls, and the question "which set am I looking at"
     is the same question the book dropdown was already asking. */
  var PROOF_SETS = {{ 'single-proofs': 'singles', 'companion-proofs': 'proofs' }};
  var proofSet = PROOF_SETS[book] || '';
  var bookSel = proofSet ? '' : book;
  var facetsOn = !!(book || cat || fmt || col);
  var shownDesigns = 0;
  var perGroup = {{}};
  /* Plate cards per SECTION, so a section head can be hidden only when nothing at all is
     left under it -- neither a plate nor a proof. The old page had one `sec-designs` head
     over every plate group and could hide it on a single number; now each head owns a
     proof panel too, and hiding it on the plate count alone would strand the proofs under
     no heading. */
  var perSection = {{ single: 0, companion: 0 }};

  cards().forEach(function (c) {{
    /* catFilter carries BOTH levels of the new axis in one control, so a value matches
       either the section (data-cat) or the theme (data-sub). The two option groups make
       which is which visible in the dropdown; the values cannot collide, because no theme
       is named "Single Marker Designs". */
    var ok = !proofSet &&
             (!bookSel || c.dataset.book === bookSel) &&
             (!cat || c.dataset.cat === cat || c.dataset.sub === cat) &&
             (!fmt || c.dataset.fmt === fmt) &&
             (!col || c.dataset.color === col) &&
             matches(c.dataset.name, c.dataset.tags, terms, q, c.dataset.facets);
    c.style.display = ok ? '' : 'none';
    if (ok) {{
      shownDesigns++;
      var grp = c.closest('.group');
      perGroup[grp.id] = (perGroup[grp.id] || 0) + 1;
      var f = grp.dataset.groupFamily;
      if (f) perSection[f] = (perSection[f] || 0) + 1;
    }}
    markChips(c, terms);
  }});
  document.querySelectorAll('.group[data-group-cat]').forEach(function (g) {{
    g.hidden = !perGroup[g.id];
  }});

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
    if (q && n > 0 && !proofSet) setOpen(i, true);
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
  /* An ornament belongs to no book and to no proof set, so scoping to one hides the
     element library outright — including when a search is running, which is the one case
     the book facets deliberately do NOT hide it in. Scoping is the family saying "show me
     only these", and answering with four thousand ornaments is not that. */
  var elHidden = (facetsOn && !q) || shownEls === 0 || !!proofSet;
  document.getElementById('sec-elements').hidden = elHidden;
  document.getElementById('group-elements').hidden = elHidden;
  if ((facetsOn && !q) || proofSet) shownEls = 0;  // the count must describe the screen

  /* The four non-book classes filter on the search box and on the proof-set scope only —
     a proof, a photograph and a reference plate all sit outside the category/format/colour
     dropdowns, which describe the design books. Proofs DO carry facets ("single",
     "companion", and a language where there is one), so the facet argument is passed for
     all four; photo and reference cards have no data-facets, facetMatch returns null on an
     empty string, and their behaviour is unchanged. That is what makes typing "companion"
     reach the companion proofs and "vietnamese" reach every card with Vietnamese on it. */
  var shownProofs = 0;
  ['singles', 'proofs', 'examples', 'reference'].forEach(function (k) {{
    var grp = document.getElementById('group-' + k);
    var all = grp.querySelectorAll('.product-card');
    /* Scoped to a proof set: that set answers, everything else here steps aside. Scoped to
       a book or a colour: these classes are not in the books, so none of them answer. */
    var allowed = proofSet ? (k === proofSet) : !facetsOn;
    var n = 0;
    all.forEach(function (c) {{
      var ok = allowed && matches(c.dataset.name, c.dataset.tags, terms, q, c.dataset.facets);
      c.style.display = ok ? '' : 'none';
      if (ok) n++;
      markChips(c, terms);
    }});
    grp.hidden = n === 0;
    /* Examples and Reference still own their own section head one-to-one. The two proof
       panels no longer do: they live INSIDE a design section whose head also covers the
       plate groups, so their own intro paragraph folds away with the panel and the section
       head is decided below, once both counts are known. */
    if (k === 'singles' || k === 'proofs') {{
      var fam = (k === 'singles') ? 'single' : 'companion';
      document.getElementById('sec-' + fam + '-proofs').hidden = n === 0;
      perSection[fam] += n;
      shownProofs += n;
    }} else {{
      document.getElementById('sec-' + k).hidden = n === 0;
    }}
    /* The panel's count follows the search exactly the way an element category's does
       ("6 of 35"), so the two read as one control and not as two conventions. */
    if (k !== 'reference') {{
      document.getElementById(k + 'Count').textContent =
        q ? n + ' of ' + all.length : String(all.length);
    }}
  }});

  document.getElementById('sec-single').hidden = perSection.single === 0;
  document.getElementById('sec-companion').hidden = perSection.companion === 0;

  document.getElementById('filterCount').textContent =
    shownDesigns.toLocaleString() + ' designs \\u00b7 ' +
    shownProofs.toLocaleString() + ' proofs \\u00b7 ' +
    shownEls.toLocaleString() + ' elements';
  document.getElementById('emptyNote').hidden =
    !(shownDesigns === 0 && shownProofs === 0 && shownEls === 0);
  if (window.bwUpdateFilterPrintBtn) window.bwUpdateFilterPrintBtn();
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
    if (!hit) {{
      togglePanel('singles', true);
      togglePanel('proofs', true);
      hit = proofs().filter(function (c) {{ return c.dataset.num === String(parseInt(digits, 10)); }})[0] || null;
    }}
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

/* WHICH card is enlarged, not just which image — the Print control has to build a sheet
   for that design (number, title, description, book/format), and an <img> src cannot say
   any of that. Kept here rather than re-derived from the src, because two cards can share
   an image (a cross-listed design is two cards) and the caption already came off the
   card. */
var lightboxCard = null;
window.bwOpenLightbox = function (card) {{
  if (!card) return null;
  var img = card.querySelector('img');
  if (!img) return null;
  lightboxCard = card;
  document.getElementById('lightboxImg').src = img.src;
  document.getElementById('lightboxCap').textContent =
    (card.querySelector('.pcm-number') || card.querySelector('.ref-title') ||
     card.querySelector('.product-detail') || {{}}).textContent || '';
  document.getElementById('photoLightbox').classList.add('active');
  return card;
}};
window.bwLightboxCard = function () {{ return lightboxCard; }};
document.addEventListener('click', function (ev) {{
  var card = ev.target.closest && ev.target.closest('.product-card');
  if (!card) return;
  window.bwOpenLightbox(card);
}});
function closeLightbox() {{
  /* Forgetting the card is part of closing. Print acts on what is ENLARGED, and a stale
     card would let a Print fired after the view closed emit a sheet for a design nobody
     is looking at. */
  lightboxCard = null;
  document.getElementById('photoLightbox').classList.remove('active');
}}
document.addEventListener('keydown', function (e) {{ if (e.key === 'Escape') closeLightbox(); }});

document.getElementById('searchInput').addEventListener('input', applyFilters);
['bookFilter', 'catFilter', 'fmtFilter', 'colorFilter'].forEach(function (id) {{
  document.getElementById(id).addEventListener('change', applyFilters);
}});
document.getElementById('pcmJump').addEventListener('input', function () {{ jump(this.value); }});
document.getElementById('pcmJump').addEventListener('keydown', function (e) {{
  if (e.key === 'Enter') jump(this.value);
}});
{COMPARE_JS}
applyFilters();
</script>
</body>
</html>
"""
    with open(PAGE, 'w', encoding='utf-8', newline='\r\n') as f:
        f.write(page)
    kb = os.path.getsize(PAGE) / 1024
    print('  ' + '; '.join(
        '%s: %s (%d)' % (lab, ', '.join('%s %d' % (t, len(by_group[(f, t)]))
                                        for t in THEME_ORDER if (f, t) in by_group),
                         plate_count[f])
        for f, lab, _s, _p in SECTION_ORDER))
    print(f'{PAGE}: {n_cards} design cards ({len(designs)} catalog rows, '
          f'{len(designs) - n_cards} cross-listed) in '
          f'{sum(len(by_group[k]) > 0 for k in by_group)} groups, '
          f'{len(elements)} elements in {len(el_cats)} categories, '
          f'{len(singles)} single proofs ({singles_c["new"]} not in either book), '
          f'{len(proofs)} companion proofs ({comp_c["new"]} not in either book), '
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
