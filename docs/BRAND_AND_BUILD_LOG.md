# Bonney Watson — Brand Reference & Build Log

Running record of what's built, what it's built from, and the conventions to follow.
**Read this first when picking up catalog or guide work.** Add an entry every time
something is pushed.

---

## 1. Brand tokens

Authoritative palette, taken from the catalog/guide CSS `:root` (see `metal-caskets.html`).
Use these exact values — don't invent near-misses.

| Token | Hex | Use |
|---|---|---|
| `--navy` | `#3d5a7a` | Nav bar, cover, product price |
| `--navy-dark` | `#2c445e` | Product names |
| `--navy-deep` | `#1e3a55` | Deep accents |
| `--orange` | `#c8540a` | Kickers, rules, footer URL |
| `--orange-dark` | `#a5450a` | Hover |
| `--orange-soft` | `#dda06e` | Soft accent |
| `--cream` | `#f8f6f2` | Doc sheet background |
| `--offwhite` | `#f4f6f8` | Page background |
| `--warm-border` | `#e6e1d7` | Card borders |
| `--rule` | `#ddd6c8` | Dividers, input underlines |
| `--text` | `#3a4453` | Body |
| `--text-muted` | `#6a7686` | Labels, meta |
| `--sidebar-bg` | `#f9f8f5` | Filter bar, image wells |

Fonts: **Cormorant Garamond** (serif display) + **Source Sans 3** (UI/body), via Google Fonts.
Logos: `logo.svg` (white, for navy backgrounds), `logo-navy.svg` (navy, for light backgrounds).

> Note: an older PDF-generation palette uses navy `#466e86` / orange `#e84610`
> (`GPL-April-2026.pdf` house style, used by the print catalogs and
> `vital-worksheet.html`'s PDF). The HTML catalogs use the `#3d5a7a` / `#c8540a` set above.
> Match whichever surface you're editing rather than unifying them blindly.

---

## 2. The product catalogs

Four live catalogs, all HTML pages in the repo root that also print/download as PDF.
Published via GitHub Pages at `https://marticeisme.github.io/bw-quote-tool/<file>`.

| Catalog | File | Cards | Keyed by | Images |
|---|---|---|---|---|
| Metal Caskets | `metal-caskets.html` | 27 | `data-item` = Batesville SKU | `casket-images/metal/<SKU>.jpg` @800×800 |
| Wood Caskets | `wood-caskets.html` | 21 | `data-item` = Batesville SKU | `casket-images/wood/<SKU>.jpg` @800×800 |
| Urns | `urns-guide.html` | 113 | `data-item` = Batesville SKU | `urn-images/<SKU>.jpeg` @400×400 |
| Keepsakes | `keepsake-urns-guide.html` | 91 | `data-item` = **name slug**, not SKU | `keepsake-images/<Slug>.jpeg` @400×400 |

### Card markup contract

```html
<div class="product-card" data-name="virgo silver" data-item="279131" data-price="1470.0" data-color="silver">
  <div class="product-img"><img src="casket-images/metal/279131.jpg" alt="Virgo Silver" loading="lazy"></div>
  <div class="product-body">
    <div class="product-name">Virgo Silver</div>
    <div class="product-price">$1,470.00</div>
    <div class="product-detail">…</div>   <!-- repeatable -->
    <div class="product-meta">#279131</div>
  </div>
</div>
```

- `data-name` / `data-price` / `data-color` drive the search + sort + filter bar. Keep them in sync.
- `data-color` is metal caskets only.
- **Caskets** use `specLabels = ['Construction','Interior','Finish','Suitable for']` — four
  `product-detail` lines in that order.
- **Urns / keepsakes** use free-form detail lines: material, then
  `NNN cu in (~N.N cups)`, then `H x L x W`.

### Cup conversion (urns & keepsakes only)

`cups = volume_in3 / 14.4`, rendered as `225 cu in (~15.6 cups)`.
Verified against four shipped products; matches the print catalog exactly.
Never show cups for caskets or cremation containers.

---

## 3. Product data source

`D:\Property Cards\Batesville Product Images\` — 510 products, 7 categories.

- `INDEX.csv` is the master file. Join key is `sku`. **UTF-8** — read/write with
  `encoding='utf-8'` explicitly or Windows cp1252 will crash on the `®` characters.
- Images are 1500×1500 JPEG q92 on white. Resolve via the `filename` column, never by
  reconstructing names. Downscale to the per-catalog sizes in the table above.
- Full schema and caveats: `HANDOFF.md` in that folder.

Known characteristics:
- `price_usd` is **Batesville's catalog price**, not BW retail. Martice's decision
  (2026-07-22): publish as-is.
- Stock engraving mockups appear on some photos (a placeholder name/dates). Martice
  confirmed these are fine to ship as examples.
- Caskets have no `volume_in3`. Misc is sparse — only 7/47 have weight. Omit blank
  fields entirely; never render `0` or an empty measurement.
- One known gap: SKU `285967` Denton Rustic Urn has no features/specs at source.

---

## 4. Build log

### 2026-07-22 — Vital Information Worksheet, fillable PDF rebuild
Pushed `7205a3b`. `vital-worksheet.html`.
- At-need PDF rebuilt as a **two-column single Letter page** (77 AcroForm fields);
  pre-need stays roomy single-column with auto-pagination (2 pages, 81 fields).
- Bonney Watson wordmark embedded as base64 so it survives being emailed standalone.
- PDF palette pulled from the page's own CSS (`#466e86` header + 3px `#c8540a` rule,
  `#e6e1d7` dividers, `#ddd6c8` field underlines, navy circle section badges, cream footer).
- Text fields filled `#f8f6f2` so printed blank forms show where to write.
- Added "How Many Certified Death Certificates?" + note that most families order 4–8.
- Pre-fill maps on/screen inputs by **stable key**, not DOM order, so mode-specific
  hidden inputs can't shift values into the wrong fields.
- Verified by rendering the PDF to image (PyMuPDF) and inspecting before pushing.

### 2026-07-22 — Batesville catalog expansion (complete)
Scope agreed with Martice: add missing Batesville products to the four existing
catalogs **and** enrich existing entries from `INDEX.csv`; build one new combined
Cremation Containers + Rental Caskets catalog. Colour-split casket catalogs and the
Misc category (47 items) deliberately left alone.

Result — 220 products added across five catalogs:

| Catalog | Before | After | Notes |
|---|---|---|---|
| `metal-caskets.html` | 27 | **142** | commit `0878f0a` |
| `wood-caskets.html` | 21 | **62** | |
| `urns-guide.html` | 115 | **154** | full-size 116 / companion 18 / bio 13 / scattering 7 |
| `keepsake-urns-guide.html` | 91 | **102** | keepsake 65 / miniature 34 / pendants 2 / accessories 1 |
| `cremation-containers-rental-caskets.html` | — | **11** | new page, 8 containers + 3 rental caskets |

Enrichment: caskets gained exterior dimensions + weight; urns gained weight; keepsakes
gained dimensions, weight, and a visible item number. `specLabels` extended on every
page to keep the modal and print sheet labels aligned.

Build scripts (repeatable, idempotent):
- `scripts/build_metal_caskets.py` — flat grid + colour filter
- `scripts/build_catalogs.py` — wood (flat grid + wood-type filter)
- `scripts/build_sectioned_catalogs.py` — urns, keepsakes (multi-section)
- `scripts/build_cremation_rental.py` — the new page, templated from `urns-guide.html`
- `scripts/verify_catalogs.mjs` — headless checks; `scripts/shot.mjs` — screenshots

Decisions worth remembering:
- **Existing cards keep the section they're already in.** The live grouping encodes
  human judgement the data can't reproduce — "Silver Steel Chest Urn" sits in Full-Size
  while other chest urns sit in Companion. Only genuinely new products are classified,
  and each assignment is printed for review. A classifier validated at only 106/115
  against the existing page, which is why it must not overwrite placements.
- New-urn rules: name→scattering; name/features→biodegradable; volume ≥350 cu in OR
  name matching `companion|dual|memento chest`→companion; else full-size. "Memento
  Chest" is explicit because every one already on the page is filed under Companion
  regardless of capacity; plain "Chest Urn" is NOT a reliable signal.
- **Cards with no CSV row are preserved verbatim.** Seven $49 keepsakes (Comet/Tempest/
  Ellipse minis, engraving pendants) aren't in the Batesville data at all — no CSV
  keepsake is priced under $59 — so they are BW additions, not renames. They keep their
  slug keys and show no item number, which is correct: they have no Batesville SKU.
- Keepsake cards matched to the CSV are re-keyed to the real SKU while keeping their
  existing image filename, so joins are exact without churning 84 images.
- SKU `269150` (Lyra Natural) is filed under Metal Caskets in the CSV but ships in
  `wood-caskets.html`; excluded from metal so families don't see it twice.
  SKU `264754` is a Misc item deliberately placed in the urn catalog. Both preserved.
- DOM card order follows each page's default sort dropdown (metal/wood ascending,
  urns/keepsakes/cremation descending) so a page never loads showing "High to Low"
  over a low-to-high list.
- New page uses `casket-images/cremation/` at 800×800, NOT the existing
  `cremation-images/` — those are 298px, built for a different layout, and owned by
  `cremation-guide.html`.

`guides.html` updated: all four counts refreshed and a card added for the new catalog
(20 cards total).

Verified headless with Playwright — all five pages: 0 JS errors, 0 broken images,
0 duplicate SKUs, search by name and item number, colour/wood filters, both sorts,
and the detail modal.

### 2026-07-22 — Catalog PDFs regenerated from the pages

The `PDF ↓` buttons on `guides.html` point at **static files in `pdf-assets/`** — they
are not generated on the fly. Expanding the catalogs left them stale (Metal Caskets.pdf
was still 6pp / 27 products against a 142-product page). **Any time a catalog's contents
change, rerun `scripts/build_catalog_pdfs.mjs`** or the download and the page disagree.

| PDF | Was | Now |
|---|---|---|
| Metal Caskets.pdf | 6pp (27 products) | **25pp** (142) |
| Wood Caskets.pdf | 5pp (21) | **11pp** (62) |
| Urn Catalog.pdf | 14pp (115) | **15pp** (154) |
| Keepsake Urn Catalog.pdf | 11pp (92) | **11pp** (102) |
| Cremation Containers and Rental Caskets.pdf | — | **2pp** (11) — new |

`scripts/build_catalog_pdfs.mjs` renders each page with Playwright using its own print
stylesheet (`preferCSSPageSize` honours `@page{size:letter;margin:0}`) and
`printBackground` so the navy/cream brand colours survive. Lazy images are forced to
load first, otherwise blank tiles print.

Chromium embeds the full 800px source images even though print shows them ~200pt wide,
so the script then downsamples to 170dpi with Ghostscript. Metal Caskets went 6311 KB →
1884 KB with no visible quality loss. The step is skipped gracefully if Ghostscript
isn't installed. Urn/keepsake PDFs barely shrink because those images are already 400px.

Filename note: the new PDF is "Cremation Containers **and** Rental Caskets.pdf" — an
ampersand in a filename has to be `%26`-encoded in the href and is easy to break.

Print behaviour, consistent across all five pages (inherited by the new page from the
urns template):
- `@page{size:letter;margin:0}` — edge-to-edge, no browser margins
- `print-color-adjust:exact` — brand colours survive "Save as PDF"
- `.no-print` hides the filter bar; `.product-card{break-inside:avoid}` stops cards
  splitting across pages
- every page also has a **per-product print sheet**: click a card → modal → print, which
  renders that single product via `#printSheet` / `#psSpecs`

Sort options are identical on all five (Price Low→High, Price High→Low, Name A→Z), and
**all five now default to Price: Low to High** — urns/keepsakes/cremation previously
defaulted to High→Low. Filters: metal has Colour (12 buckets), wood has Wood Type (4),
the sectioned catalogs rely on their sections instead.

Changing a default sort means **reordering the DOM too** — the build scripts read the
first `<option>` in `#sortSelect` and lay the cards out to match, so a page never loads
showing one order while the dropdown claims another. After changing it, rerun the
relevant build script *and* `build_catalog_pdfs.mjs`, since card order is baked into the
PDF.

---

### 2026-07-22 — guides.html redesigned ("Warm Library")

Rebuilt from the Claude Design handoff (`Bw Quote Tool Guides Redesign.zip`, Option 1a),
treated as a **reference point rather than a literal spec**.

`scripts/build_guides_page.py` reads the categories and cards **out of the existing
page** and re-emits them in the new design, rather than retyping content. This is the
important part: the mock predates the catalog expansion — it still says "27 products" and
omits the Vital Information Worksheet card entirely. Regenerating from the live page means
counts and cards can't regress. Rerun it after adding a guide, or hand-edit the output;
both are fine since it round-trips.

Taken from the mock: warm paper background `#f4efe6`, serif-led type, 3-up card grid with
`flex:1` descriptions so actions bottom-align, gradient section rules
(`linear-gradient(90deg,#d9cdb6,transparent)`), count pills, prominent search with
magnifier, orange primary + ghost PDF buttons, and the meta line as an uppercase rule.

Deliberate departures:
- **Fonts stay Cormorant Garamond + Source Sans 3**, not the mock's Newsreader/Figtree.
  This page is the hub linking to the five catalogs and shouldn't read as a different site.
- **Navy/orange come from the catalog palette** (`#3d5a7a` / `#c8540a`) rather than the
  mock's `#3e6274`, for the same reason.
- Search matches title + description + **category name**, hides empty categories, shows an
  "N of 20 guides" count, and keeps the existing empty state.
- Added print CSS (hides chrome, avoids breaking cards across pages) — the mock had none.

Verified headless: 7 categories, 20 cards, all 34 links resolve to files that exist,
search/empty-state/clear all correct, 0 JS errors.

### 2026-07-23 — guides.html: browser Back button fix

Pushed `442945e`. Martice reported that after opening a guide, the browser Back
button didn't return to the main guides screen — only the in-page "All Guides"
link worked.

Root cause: all 20 internal guide/tool/map card links (`.guide-cta`) had
`target="_blank" rel="noopener"`, so each guide opened in a **new tab** with an
empty history stack. Back had nothing to go back to in that tab; the guide's own
"← All Guides" link was the only way out.

Fix: removed `target="_blank" rel="noopener"` from all 20 internal links so they
navigate in the same tab and build normal history. The external
`bonneywatson.com` footer link keeps `target="_blank"` — that one's correctly a
new-tab case.

Verified: syntax check (0 errors), and a Playwright check from the repo root —
clicked the Metal Caskets card, confirmed navigation stayed in the same tab
(no second page opened), then `page.goBack()` landed back on `guides.html`.

No catalog content changed, so `build_catalog_pdfs.mjs` did not need a rerun.

---

### 2026-07-23 — Single-item print sheet: knock out the white product-photo background

Martice reported the per-product print view (click a card → modal → "Print This
Product") shows the casket/urn photo sitting on a visible white box, since the
product photos are studio cutouts shot on pure white (`255,255,255`, confirmed
by pixel-sampling a metal casket, wood casket, urn, keepsake, and cremation
container — all identical convention, no gradient/shadow).

Fix: added `mix-blend-mode:multiply` to `.ps-photo-wrap img` inside the existing
`@media print{}` block, in all five catalogs — `metal-caskets.html`,
`wood-caskets.html`, `urns-guide.html`, `keepsake-urns-guide.html`,
`cremation-containers-rental-caskets.html`. One line each; verified first that
all five share byte-identical `#printSheet`/`.ps-photo-wrap` markup and CSS
before assuming the rule would drop in everywhere.

Why multiply works cleanly here: the print sheet's page background is already
`#F6F2E9` (near-white, set at `#printSheet` with `print-color-adjust:exact`).
Multiplying a pure-white image pixel against a near-white backdrop resolves to
the backdrop color almost exactly, so the knockout is visually seamless with
no per-image editing. Since the source photos have no soft shadow/vignette,
the technique's usual weakness (muddying shadows) doesn't apply. Non-white
casket/urn colors darken by a negligible ~3-5% (backdrop is a few units short
of pure white), invisible on paper.

Scoped inside `@media print`, targeting only `#psImg` — on-screen catalog grid
thumbnails and the modal preview are untouched. Verified with Playwright across
all five pages: `mix-blend-mode` on `#psImg` is `normal` on screen and
`multiply` under emulated print media; grid thumbnails stay `normal` in both.
Rendered an actual print screenshot (Apollo Silver) to confirm the knockout
looks right, not just that the CSS property is set.

`scripts/build_catalog_pdfs.mjs` does not reference `#printSheet` at all — it
only renders each page's full product grid for the multi-page catalog PDF, a
separate code path from the single-item print sheet. **No PDF rebuild needed**
for this change.

Note for later: the same white-box pattern exists on the on-screen grid
thumbnails and the small thumbnail images inside the full multi-page catalog
PDFs — out of scope here since the ask was specifically the single-item print
view, but the identical technique would apply if that's wanted too.

---

### 2026-07-23 — Grid thumbnails + catalog PDFs: same white-box knockout

Follow-up to the print-sheet fix above. The same white studio background was
visible on (1) the on-screen product-grid thumbnails on all five catalogs, and
(2) the small thumbnail images inside the downloadable multi-page catalog PDFs
(same grid, rendered by `build_catalog_pdfs.mjs`) — both flagged as out of
scope in the print-sheet fix and now addressed.

Fix: added `mix-blend-mode:multiply` to `.product-img img` (the grid card
image rule) in all five catalogs. One line each, same technique as the print
sheet, but a different backdrop: the grid card's own background is
`var(--sidebar-bg)` = `#f9f8f5`, even closer to pure white than the print
sheet's `#F6F2E9`, so the knockout is effectively invisible on screen too.

Did not assume the print-sheet result would transfer — tested in place first
(edited `metal-caskets.html`, screenshotted before/after, reverted if it had
looked wrong). Also stress-tested against the lightest product in the catalog
("Apollo White/Pink," a white-painted casket with a pale pink interior) since
that's the case most likely to show multiply's darkening side effect — no
visible seam or muddying.

Because `.product-img` styling isn't overridden inside either page's
`@media print` block, this single rule automatically carries through into the
catalog PDF render too (same DOM, same CSS) — no separate PDF-specific
change needed.

**Reran `scripts/build_catalog_pdfs.mjs` per the standing gotcha** (this is the
one case above where a catalog's print appearance changed, so the static PDFs
would otherwise go stale). Rendered a regenerated Metal Caskets.pdf page with
PyMuPDF and confirmed the knockout shows there too, including on white and
black caskets.

Verified with Playwright across all five pages: grid thumbnail
`mix-blend-mode` is `multiply`, the print-sheet fix from the previous entry is
still intact and unregressed, and all images load without errors (forced lazy
images to `eager` first — `loading="lazy"` meant most weren't loaded yet at
check time, a test-harness detail, not a product bug).

Remaining out-of-scope spot, noted for later if wanted: the enlarged product
image in the on-click modal (`.product-modal-img`) still shows the white
background — same technique would apply if that's ever requested.

---

### 2026-07-23 — burial-guide.html: drop grave liners, vaults only

Martice: Bonney Watson only offers burial **vaults** at Washington Memorial Park,
not grave liners — the "Outer Burial Containers" card in Section 6 ("Caskets,
Vaults & Markers") listed both as options, which is wrong.

Changes in `burial-guide.html`:
- Removed the `<li><strong>Grave liner</strong> — concrete, most affordable</li>`
  bullet from the Section 6 Outer Burial Containers card, keeping "Burial vault"
  and "Required by cemetery, not by state law."
- Reworded the card's intro sentence from "requires a concrete outer burial
  container (vault or liner)" to "(vault)".
- Found and fixed a second, same-fact dangling reference while checking for
  orphaned liner mentions: Section 2 ("Burial vs. Entombment") described
  ground burial as "sealed with a concrete vault or liner" — dropped "or
  liner" there too, for consistency with Section 6's now vault-only framing.
- No other liner references in the file. (Repo-wide "liner" hits elsewhere —
  vault-guide.html's *interior* liner material call-outs, and an unrelated
  urn accessory literally named "Brass Liner For Cocoa Clock/Symphony Chest"
  — are different things and untouched.)

Didn't add a new link to `vault-guide.html` from this card — the Caskets card
already links out to the casket guides, and that was judged sufficient; no new
cross-references were invented.

**PDF note:** `burial-guide.html` is not part of the `build_catalog_pdfs.mjs`
pipeline (that script only covers the five product catalogs) and no other
script builds `pdf-assets/Burial Guide.pdf` from this page — it appears to be
a one-off/manual export. So there's no rebuild gotcha to satisfy here, but as
of this edit **`Burial Guide.pdf` (dated 2026-07-17) no longer matches the
page** for this specific change. Flagging rather than silently regenerating it
with an improvised process — no established script exists to do it safely.

Verified with Playwright: 0 console errors, Section 6 renders cleanly with two
balanced cards, screenshot checked for a stray bullet/spacing artifact (none).

**Deferred, documented not done:** `pdf-assets/Burial Guide.pdf` (dated
2026-07-17) is being left stale for now — intentional, per Martice. Beyond the
grave-liner wording above, the PDF also has an older content gap: it used to
include a **caskets section explaining wood vs. metal differences**, which the
current `burial-guide.html` page no longer covers the same way (caskets are
now a brief pointer to the separate Metal/Wood Casket Guides, not an
in-page wood-vs-metal comparison). **When the Burial Guide PDF is eventually
regenerated, that caskets / wood-vs-metal content needs to be reconciled
against the current page, not just the liner wording.** No script currently
builds this PDF from the page (see above) — that gap needs solving too before
a rebuild is possible.

---

### 2026-07-23 — Compare feature, all five catalogs

Pushed `adb1490`. New feature, built iteratively on `metal-caskets.html` first and
approved before replicating to `wood-caskets.html`, `urns-guide.html`,
`keepsake-urns-guide.html`, `cremation-containers-rental-caskets.html`.

**What it is:** a "Compare" checkbox on every product card (max 4 selected) feeds a
sticky bottom tray (chips with thumbnail/name/remove, a live count, a disabled-state
+ message once the cap is hit) → "Compare (N)" opens a **full-screen** view with two
tabs:
- **Specs & Differences** — label column + up to 4 item columns; rows that differ
  across the selected items are highlighted (warm tan background, bold text); rows
  that match stay plain. Item # is excluded from diff-highlighting since it's always
  unique and not an interesting distinction.
- **Photos** — large images, sized to fill the full viewport height, not just a
  single width-limited row: 2 items and 3 items each get one full-height row (so all
  panels end up the *same* size); 4 items get a 2x2 quadrant grid. (A 2-on-top/1-hero
  arrangement for 3 items was tried and rejected — splitting into two rows halves
  everyone's height budget, making all three smaller than a single row of 3 does.)
  Clicking any photo (Specs or Photos tab) opens a full lightbox.

**Print, tied to whichever tab is active:** Specs mode prints the diff-highlighted
table; Photos mode prints a 2-column wrapping photo grid (2x2 for 3-4 items, one row
for 2) that fills the page — reusing the exact `mix-blend-mode:multiply` white-knockout
from the earlier print-sheet/grid-thumbnail fix, and the same `body.xxx-printing`
blanket-hide-then-reveal pattern already used by the single-item print sheet.

**Bugs found and fixed during the metal-caskets.html build** (all present in the
replicated files too, fixed from the start there):
- `mix-blend-mode` blends an element's **own** background too — a light background
  set on the same element that has the blend mode never shields it, once
  `object-fit` leaves no gap for that background to show through. Broke the photo
  lightbox (rendered solid black against the dark backdrop) and the tray chips
  (rendered muddy/dark against the navy tray). Fixed both with a separate opaque
  ancestor behind the blended image — the same structural fix the print sheet
  already relied on, just not recognized as the same pattern until it broke twice.
- A `display:block!important` blanket reset (used to force-hide/reveal the whole
  print sheet by body class) has higher specificity than a bare class selector
  since the reset selector carries an ID — any `display:flex/grid!important` meant
  to override it needs the same `body.xxx-printing #sheetId .class` prefix or it
  silently loses. This is also a **pre-existing, unfixed issue in the single-item
  print sheet** (`.ps-masthead`, `.ps-specs li` never actually get their intended
  flex layout in real print output) — flagged, not fixed, since it's out of scope
  for this feature.
- Lightbox image overflowed its own stage: percentage `max-height` doesn't resolve
  against a parent with no explicit height (the stage shrink-wraps its content).
  Fixed by sizing the image in `vw`/`vh` directly instead of `%`.

**Per-catalog field adaptation** — `ROW_LABELS` / `getCardData` are the only
catalog-specific parts, matching each catalog's own existing `specLabels`:

| Catalog | Compare title | Spec fields |
|---|---|---|
| `metal-caskets.html` | Compare Caskets | Construction, Interior, Finish, Suitable for, Dimensions, Weight |
| `wood-caskets.html` | Compare Wood Caskets | (same 6, see below) |
| `urns-guide.html` | Compare Urns | Material, Capacity, Dimensions, Weight |
| `keepsake-urns-guide.html` | Compare Keepsakes | Material, Capacity, Dimensions, Weight |
| `cremation-containers-rental-caskets.html` | Compare Cremation & Rental | Construction, Interior, Suitable For, Dimensions, Weight (no Finish) |

**The variable-detail-count trap:** `metal-caskets.html`'s cards are all uniformly
6 details, so simple positional indexing (`details[i] ↔ specLabels[i]`) works. The
other four catalogs are **not** uniform — and critically, the missing field isn't
always trailing:
- `wood-caskets.html`: 7 cards (cloth-covered/unfinished items) omit **Finish**,
  a *middle* field — positional indexing shifted every field after the gap into
  the wrong labeled row (e.g. Dimensions value showing under "Suitable for").
- `urns-guide.html`: some short cards omit **Capacity** (middle), others omit
  **Weight** (trailing) — inconsistent even within the same detail-count group,
  so there's no single fixed omission pattern to hardcode against.
- `keepsake-urns-guide.html`'s short cards (Miniature Urns, Pendants & Jewelry
  sections) are the safe case — always exactly `[Material, Capacity]`, trailing
  omission only, consistent within each section.
- `cremation-containers-rental-caskets.html` has zero gaps (11/11 uniform).

Fixed for `wood-caskets.html` and `urns-guide.html` with a **content classifier**
instead of positional indexing: each detail string is matched against a pattern
(`lbs$` → Weight, digit+`in`+L/W/H → Dimensions, `cu in` → Capacity, starts with
`burial`/`cremation` → Suitable for, contains `interior`/`finish` → Interior/Finish),
and whichever single detail matches nothing is Construction/Material — verified
(every card has exactly one such value, checked programmatically across all 62 and
all 154 cards, zero collisions). `keepsake-urns-guide.html` and
`cremation-containers-rental-caskets.html` didn't need this — their gaps are clean.

**No `build_catalog_pdfs.mjs` rerun needed** for any of the five files — the compare
UI (`.compare-tray`, `.compare-overlay`, `.compare-toggle`, `.photo-lightbox`) is in
each page's print-hide list, so it can't leak into the multi-page catalog PDF, and
that script doesn't reference the compare feature at all.

Verified per catalog: `scripts/verify_catalogs.mjs`, plus Playwright covering
selection → tray → 4-item cap, both tabs, diff highlighting against that catalog's
real fields (including the previously-broken cards, checked by exact expected
value), photo layouts at 2/3/4 items (equal-size assertion at 3), lightbox, both
print modes, and regression checks against the grid white-knockout, the single-item
print sheet, and search/sort/filter.

### 2026-07-23 — Compare feature: bigger product photo in Specs & Differences

Pushed `b716e68`. Martice reviewed the compare feature's Specs & Differences tab (all five
catalogs) and found the per-column product photo too small relative to the
available room — noticeable empty space below/around the table.

Fix, applied identically to all five catalogs:
- `.compare-col-img` max-width: `130px` → `320px`.
- `.compare-table` max-width: `1300px` → `1500px` (a little extra room per
  column so the bigger image has space to grow into, especially at 4 columns).

`width:100%` was already on `.compare-col-img`, so the image was always bounded
by *whichever is smaller* of the column's own width or the max-width cap — at 4
columns the column width itself is now the binding constraint (photo lands
around 277px, up from the old 130px cap), and at 2-3 columns the new 320px cap
is what's reached (up from the same 130px). Net effect: roughly 2x bigger at
every item count, and the specs table now fills a normal window with no
scrolling needed (verified: `compare-body` `scrollHeight === clientHeight` at
1440x900 with 4 items selected, all five catalogs).

This is a **screen-only** change — `.compare-col-img` is a different class from
the print sheet's `.cmp-col-img` (kept at its existing, already page-fit-tuned
110px), so print output for both modes is untouched. Verified no regression to
the Photos tab (still 2-column grid at 4 items, still equal-size panels at 2-3),
the lightbox (still opens from a Specs-view photo click), the 4-item cap, diff
highlighting, or the grid/print white-knockout, across all five catalogs.
**No `build_catalog_pdfs.mjs` rerun needed** — same reasoning as before, the
compare UI is print-hidden in the main grid stylesheet and untouched here
regardless.

---

### 2026-07-23 — Veterans + Cemetery Property guides added

Two new reference guides drafted elsewhere (approved content, approximated tokens)
integrated onto the house style. `veterans-guide.html`, `cemetery-property-guide.html`,
plus `pdf-assets/Veterans Guide.pdf` (11pp) and `pdf-assets/Cemetery Property Guide.pdf`
(9pp), and two cards in `guides.html` under Getting Started (count 2 → 4, now 22 cards).

Reskin via `scripts/reskin_guides.py` — a **chrome swap + component retokenize**, chosen
over hand-editing 1200 lines so no word of approved content changes. It rebuilds the nav
(→`.site-nav`), hero (→ navy `.cover` inside a `.doc-sheet`), TOC (→`.contents`), and
footer (→`.doc-footer`/`.site-footer`) from pieces extracted out of each source file, then
restyles the body components (`.section`/`.band`/`.note`/`.card`/`.compare`/`.costs`/
`.faq`/`.cta`) to house tokens in place. Verified 0 words lost by word-set diff, 8 sections
each, 0 broken anchors.
- The draft's dark `#1a2744` navy + Lato are gone; house `#3d5a7a`/`#c8540a` + Source Sans 3.
- Full house match (Martice's call) fixed a real bug: the white `logo.svg` was invisible on
  the draft's light topbar/hero.
- Veteran flourishes kept: tricolor stripe now at the base of the navy cover; gold
  benefit-card stars; slate callouts became the house navy `.band`.
- **Watch the regex anchors when reskinning:** the first pass lost content because the TOC
  block ends `</ol></div>`, and a `</div></div>` anchor overshot into Section 1. Anchor on
  `</ol>\s*</div>`.

PDFs print from the pages via `scripts/build_guide_pdfs.mjs` (same engine as
`build_catalog_pdfs.mjs`: `preferCSSPageSize`, `printBackground`, Ghostscript downsample).
Navy cover and `.band` survive print via `print-color-adjust:exact`; the 7-row comparison
table is kept whole and, if it ever splits, `thead{display:table-header-group}` repeats the
header. **Rerun `build_guide_pdfs.mjs` after editing either guide** — same static-PDF trap
as the catalogs.

Content decisions from Martice (these guides name charges, never dollar prices — verified
0 `$` in both HTML and PDF; percentages are rates, allowed):
- Veterans: ECF applies to the half-cost second right of interment; pre-arranging the space
  together protects the half-cost pricing whoever is laid to rest first; the veteran gift is
  a **flat credit** (pay the difference on a higher-priced section) covering ground burial
  and mausoleum spaces. Columbarium niches carry a dollar threshold Martice described that
  the no-dollar rule bars, so the copy says "handled a little differently, so ask us" — his
  approved wording.
- Cemetery Property: ECF rate is **15% ground / 10% niche or crypt**, framed as meeting or
  exceeding the state minimum (not "state-mandated 15%", per the draft's precision rule).
  Section 5 now states the statutory reason — WA endowment-care law ties the deposit to the
  property's **value, not the price paid**, which is why it's owed on a gifted space — with
  no numbered RCW citation (Martice to confirm the exact section before any is cited).

Reciprocal cross-links added: Vault, Marker, and Urn-Placement guides each link back to the
Cemetery Property Guide (which already links out to them). **Those three sibling PDFs were
NOT regenerated** — the link is a relative `.html` href that only works on-screen (dead in a
downloaded PDF), and those pages have complex layouts with no verified PDF builder, so
regenerating risks the live files for a sentence that wouldn't function in PDF form.

### 2026-07-23 — Cremation or Burial guide (third in the batch)

Same drafted template, same reskin path. `cremation-or-burial-guide.html` +
`pdf-assets/Cremation or Burial.pdf` (8pp), card added **first** in Burial & Cremation on
`guides.html` (2 → 3, now 23 cards). It's the decision page that routes to the detailed
Burial Guide and Cremation Guide — deliberately not a condensed version of either.

`scripts/reskin_guides.py` gained a guard (skip if no `.topbar` — i.e. already reskinned)
so re-running it only touches new files, and `.compare .same` (green "identical in both
columns" highlight, this page's convention) is folded into the shared stylesheet next to
`.yes`/`.no`. Verified 0 words lost, 7 sections, 0 broken anchors, all 5 cross-links
resolve, **0 `$`**, **US spelling clean** (draft had had "jewellery"; none now). The
7-row comparison table renders whole in the PDF.

Content is neutral by mandate (Martice serves as many families choosing one as the other) —
the reskin changed no words, so nothing tilts. Four debrief "open items" were delegated to
me (2026-07-23) and I kept everything as approved: Section 6's "…and it is not empty" stays
(deliberate, and the content rules bar softening Section 6), all 9 FAQ entries stay, and the
softer cremation-company survey stats stay (attributed, directional). Martice will review in
detail over the next few days and bring changes if needed.

Reciprocal links: Burial Guide and Cremation Guide each now link to this page near their top
(a family reading either may not have chosen yet). Same on-screen-only reasoning as the
Cemetery Property reciprocals — **`Burial Guide.pdf` and `Cremation Guide.pdf` not
regenerated** (Burial Guide.pdf is intentionally stale already; the link is dead in PDF form
anyway).

### 2026-07-23 — Marker guide True Size Photo Guide printed at 68%

`markers-guide.html`. The ceramic-steel-portrait true-size outlines did not measure true
to life in print, and the 8-inch sizes were missing entirely.

**Root cause (one bug broke everything):** the Marker Size Scale Guide's print rule
`.scale-markers{transform:scale(1.6)}` sat on a full-content-width flex box; scaled, it
became **1152px wide** against an 816px Letter page. That overflow forced the browser/PDF
to shrink the *entire page* by 816/1152 = **0.68** to fit — so every true-size portrait
printed at 68%. Fix: `display:inline-flex` (box hugs its markers) + scale 1.5, so nothing
overflows the page. Confirmed by measuring the rendered PDF: 5×7 oval now 360×504pt =
exactly 5in×7in, 6×6 circle 432×432pt = 6in×6in.

**Belt-and-suspenders:** per-SVG print rules pin each portrait to exact inches
(`#true-size .tsg-diagram svg[width="5in"]{width:5in!important;height:7in!important}`, etc.).

**Missing sizes added:** cross-checked the quote tool's `PORTRAIT_DATA` (index.html) — the
orderable sizes absent from the true-size diagrams were the 8-inch ones. Added **8×10 oval,
8×10 rectangle, 8×8 circle**, each on its own full-bleed page (`.tsg-full` cancels the
doc-sheet's 0.5in padding so an 8in outline fits inside 8.5in with ~0.25in each side, no
re-overflow). Measured true: 8×10 = 576×720pt = 8in×10in, 8×8 = 576×576pt = 8in×8in.
(18×12 rectangle panel can't be shown true-size on Letter — 18in wide. Heart/Square exist
in the guide but not in the quote tool's PORTRAIT_DATA.)

The downloadable `pdf-assets/Granite Marker Guide.pdf` was regenerated from the fixed page
(was 21pp with the bug → 20pp true-size; content identical, only pagination differs).
`markers-guide.html` is now registered in `scripts/build_guide_pdfs.mjs`. To print true to
life the family still must choose **100% / Actual Size**, not Fit to Page — the guide says so.

### 2026-07-23 — Ceramic portrait prices reconciled to the PCM sheet

Martice supplied the authoritative PCM Bronze Portrait price sheet. The **marker guide was
already correct** (all Section 5 + true-size prices match). The **quote tool's
`PORTRAIT_DATA` (index.html) had 5 wrong prices** and was missing two shapes.

Fixed in `PORTRAIT_DATA`:
- rectangle 8×10 color $1,375 → **$2,200**
- rectangle 4×5 B&W $640 → **$646**
- circle 4×4 $965/$520 → **$1,130/$635**
- circle 5×5 color $1,540 → **$1,140**
- circle 8×8 B&W $960 → **$965**

Added shapes (with the `qPortraitShape` dropdown options): **Heart** (4×4 $965/$525, 6×6
$1,375/$745, 8×8 $1,885/$1,320) and **Square** (4×4 $990/$495). Verified headless: the
picker populates the new sizes and returns the right prices; index.html syntax-check clean
(9 blocks, 0 errors). Left OUT of the picker: the **18×12 rectangle panel** — it's a
"Large Portraits, uprights only, please call" item (color-only, B&W N/A), not a standard
flush-marker pick; it stays in the marker guide's table for reference.

One self-inflicted fix: my new 8×8-circle true-size label had B&W $960 (copied from the
stale quote-tool value); corrected to $965 and the marker PDF regenerated.

### 2026-07-23 — Medicaid spend-down guides (family + professional)

Two more drafted guides on Medicaid spend-down / burial exclusions, reskinned onto the
house style. `medicaid-family-guide.html` + `pdf-assets/Medicaid and Planning Ahead.pdf`
(9pp); `medicaid-professional-reference.html` + `pdf-assets/Medicaid Professional
Reference.pdf` (8pp).

**NOT carded on `guides.html`.** Unlike every other guide, these two are deliberately kept
off the family-browsable hub. Martice uses the HTML pages only to show on-screen during
appointments (he navigates to them directly), and hands out the **PDFs**, which he controls
— they are what gets emailed/printed to families. The category was briefly added then
removed at his direction. The pages + PDFs stay live and reachable by direct URL; they just
aren't surfaced anywhere a family would browse. **Do not add guides.html cards for these.**

**Legal-sensitivity note:** these make actionable statements about WA law and Medicaid
eligibility — a reader can be financially harmed by an error. The debrief recommended
legal review *before* going live; **Martice chose to publish both now** (2026-07-23) and
will have them reviewed. The reskin changed **no content** (chrome swap + retokenize only),
so every legally-verified word is intact — confirmed 0 words lost by set diff. Do not
"simplify" any passage in either file; the debrief section 7 lists corrections already made
(state estate-recovery claim on leftover funds; premiums only continue on a payment plan;
ECF is a 10% statutory *minimum* per RCW 68.40.010, never "state-mandated 15%").

Only dollar figure permitted is the **$1,500** statutory revocable-burial-fund cap —
verified: family guide has 1, professional reference has 3, all `$1,500`, no BW pricing.

`scripts/reskin_guides.py` gained: an eyebrow→cover-kicker extraction, a guard for pages
with no TOC (the professional reference has none), and hero-`.cite`→light-band handling.
Its shared stylesheet now also styles `.disclaimer`, `.audience`, `.callout` (=house band),
statute `<table>`s, `.itemlist` (=charge-list), `code`/`a.lawlink`, `.cite`, `.sources`,
and `.contact` (=cta). Professional-reference specifics preserved and verified: the
**audience bar prints as the first line** (dark-on-white in print), all **9 `a.lawlink`
statute citations** and the **7-entry Sources block** intact, both statute comparison
tables render and repeat their header if split. Both disclaimers kept in full.

---

### 2026-07-23 — Compare view: Bonney Watson branding + larger prices

Pushed `1b048a8`. Martice: the on-screen compare view had no BW chrome (plain
white header) and prices too small. All five catalogs, screen-only:
- **Header** now navy (`var(--navy)`) with a 3px `var(--orange)` bottom rule,
  the white `logo.svg`, white title, an **orange** Print Comparison button
  (was navy — invisible on the new navy header), a translucent-white close
  button, and the tab pill group flipped to a light-on-navy segmented control
  (`rgba(255,255,255,.14)` track, white active pill). Mirrors the site nav and
  the print masthead so it reads as Bonney Watson.
- **Prices bigger:** Specs & Differences Price row → 19px navy bold via
  `.compare-table > .compare-table-row:nth-child(2) .compare-value-cell`
  (Price is always `ROW_LABELS[0]`, so header row is child 1, Price is child 2).
  Scoped to `.compare-table` (screen `#compareTable`) — the print table is
  `.cmp-table`, so **print is untouched** (verified: print price cell stays
  11px). Photos-tab price → 23px (was 16px).

Verified across all five: header navy `rgb(61,90,122)` + orange rule + logo +
orange print btn; specs price 19px / photos price 23px; and **no regression** to
either print mode (print price 11px, table still grid), the Photos 2/3/4-item
layouts, the lightbox, the tray/4-item cap, diff highlighting, or the
white-knockout. **No PDF rebuild needed** — screen-only, and the compare UI is
print-hidden regardless.

### 2026-07-23 — Vital worksheet: new 2024 death-certificate fields

`vital-worksheet.html`. WA DOH 422-259 (July 2024) added required fields; added the three
Martice flagged:
- **Sex (M/F/X)** — replaced the old Male/Female "Gender" with Male / Female / Unknown /
  **X (non-binary)**, matching the form.
- **Aliases** — the single "Any Aliases" line became three: **First / Second / Third AKA**.
- **Homelessness** — new question "Did they experience homelessness at the time of, or in
  the month before, death?" with Yes / Probably / No / Unknown, in the residence section.

Touched three things that must stay in lockstep: the on-screen form, and BOTH fillable-PDF
engines (at-need two-column, pre-need single-column). The **key-based prefill** relies on
`TEXT_KEYS`/`CHECK_KEYS` being in exact DOM order — updated both (`aliases`→`alias_1/2/3`;
`gender_*`→`SEX_K` 4 options; `HL_K` inserted after tribal). Verified counts match (37 text
/ 53 checks) and prefill round-trips: filled AKA/DOB/sex_x/homelessness on screen → landed
in the right PDF fields (only sex_x and hl_prob checked, confirmed by reading widget state).

**At-need still prints on ONE page** (85 AcroForm fields, up from 77); pre-need 3 pages
(89). The worksheet generates its fillable PDFs client-side via the "Save Fillable PDF"
button, so there is no static pdf-assets file to rebuild — only the page.

---

### 2026-07-24 — Faceted filters, All Caskets catalog, photo enlarge, Fireside fix, wider layout

From Martice's `Resources Additions 07.24.26.docx`. Five changes; verified headless
(Playwright), all pages 0 JS errors.

**Multi-select checkbox facets on every catalog** (Batesville-style, the doc's motivation).
One **unified inline engine** — auto-detects flat `#productGrid` vs sectioned
`.section-wrap[id]` layouts, and **derives facet values from the cards already in the DOM at
load** (Construction line = Material, `… Interior` line = Fabric, `data-color` = Color), so
**no product-card markup and no build-script regen were needed**. Multi-select = OR within a
facet, AND across facets, with live counts that match Batesville's exactly (Steel 20 ga. =
54, etc.). UI is top-bar dropdown popovers, not a left sidebar — keeps the existing sticky
filter-bar layout. Per-catalog facets: metal = Gauge/Material · Interior Fabric · Color;
wood = Wood Type · Interior Fabric (replaced the old Wood Type `<select>`); urns / keepsakes
/ cremation = Material; all-caskets = Casket Type · Material · Interior Fabric · Color. The
`.filter-bar` CSS + engine are byte-identical across pages (metal is the reference; the rest
were script-replicated). **Facets are in every page's print-hide list, so no PDF rebuild.**

**Click-to-enlarge on the single-product modal** — clicking `#modalImg` opens the existing
Compare `.photo-lightbox` (its z-index bumped 9998 → 10000 so it sits above the modal's
9999). A "Click to enlarge" hint pill sits on the modal image; Escape closes the lightbox
first, the modal second. Only the enlarged lightbox view gets the multiply white-knockout;
the modal thumbnail itself still shows the studio-white bg (unchanged). Supersedes the
earlier "modal-img still white, not yet touched" note.

**`all-caskets.html` — new combined catalog** (204 = 141 metal + 63 wood) so families can
browse and compare across both types on one page. Built by `scripts/build_all_caskets.py`
**from the live `wood-caskets.html`**, deliberately not metal — wood carries the
content-classifier version of Compare, which correctly handles wood's cloth-covered cards
that omit a Finish line (metal's positional Compare would mislabel them). Verified: a
metal-vs-wood-cloth comparison shows Finish "—" for the wood card, not a shifted value. Each
card tagged `data-cat="metal|wood"` to drive the Casket Type facet; image paths
(`casket-images/metal|wood/…`) resolve unchanged since the page is at repo root. Own PDF
(`pdf-assets/All Caskets.pdf`, 35pp; JOBS entry added to `build_catalog_pdfs.mjs`, which now
also accepts filename-substring args e.g. `node scripts/build_catalog_pdfs.mjs all-caskets`)
+ a guides.html card (caskets cat-count 6 → 7).

**Fireside (SKU 269166) miscategorization fix.** It's an **Oak Solid wood casket** that
Batesville's CSV files under "Metal Caskets" (same pattern as Lyra 269150), so it had shipped
in `metal-caskets.html`. Moved to wood: card + image (`casket-images/wood/269166.jpg`), price
placement ($6,385, between Hartfield and Woodhaven Pecan), counts, and both PDFs. Durable:
`build_metal_caskets.py` EXCLUDE is now `{'269150','269166'}`; `build_catalogs.py` wood config
gained `extra_skus={'269166'}`. Metal 142 → **141**, wood 62 → **63**; the metal Material
facet is now cleanly all-metal (the stray "Oak Solid" value is gone).

**Wider layout** — `.doc-sheet` / `.nav-inner` / `.compare-tray-inner` max-width 960/1100 →
**1600px** on all catalogs (Martice: "closer to full width"). Screen-only; the print CSS sets
`max-width:none`, so PDFs are unaffected.

**EOL note:** the catalog HTML files are **LF** (generated by the Python build scripts; git
`core.autocrlf=true`, HEAD blobs are LF — the CRLF rule in CLAUDE.md is about `index.html`).
The Edit tool can flip an edited catalog to CRLF; convert back to LF so the diff stays
content-only. Build scripts that read these files normalize CRLF → LF and write LF.

---

### 2026-07-24 — Who Decides guide (right of disposition) added

Drafted guide + debrief (`who-decides-guide.html`, `who-decides-debrief.md`), integrated the
same way as the earlier drafted guides — `scripts/reskin_guides.py` chrome-swap + retokenize
onto the house style, changing no approved content (verified 0 words lost by multiset diff;
8 sections, 8 TOC items, 0 broken anchors, **$0** — this guide names no pricing). Explains
who can authorize a cremation in WA under **RCW 68.50.160**, deadlocks, deciding in advance,
and what signing commits an authorizing agent to.

- **Two new shared classes** folded into `reskin_guides.py`'s stylesheet in house tokens:
  `.ladder` (the Section 1 priority list — kept a semantic `<ol>` with gold CSS-counter
  numerals; the order is the point) and `.lawcite` (the seven muted statute citations, with a
  `.band .lawcite` light variant for citations inside dark callouts). Print rule tuned so
  `.ladder li` / `.charge-list li` break between rows rather than forcing the whole block
  onto the next page (the debrief's page-break-gap risk) — verified in the rendered PDF: the
  7-row ladder splits cleanly across pages 1–2 and the 9-item Section 7 list across 7–8, each
  row intact.
- **Reskin script bug fixed:** a draft `<link rel="preconnect" href="…fonts.googleapis…">`
  sits before the stylesheet and was the first googleapis match, so the font-swap replaced
  the *preconnect* and left the draft's Lato stylesheet link behind. Reordered to strip
  preconnects first, then target the `…/css2…` stylesheet specifically. (Earlier guides
  predate this because their drafts lacked that preconnect.)
- `pdf-assets/Who Decides.pdf` (10pp) via `scripts/build_guide_pdfs.mjs` — registered there,
  and that script now takes filename-substring args too (`node scripts/build_guide_pdfs.mjs
  who-decides`). guides.html card added under **Getting Started** beside Pre-Planning
  (cat-count 4 → 5).
- **Open items left for Martice** (from debrief §8, not acted on): Section 5 timing citations
  (deliberately uncited pending verification), whether a standalone designated-agent form
  exists for Letters & Forms, confirming the witness-cremation wording against practice, and
  a mismatch on the paper authorization form ("reverse side" vs. blank name lines).

**Follow-up, same day — executor-authority FAQ added** (debrief §8 item 2, at Martice's
request). New ninth FAQ entry, "Does being the executor of the estate let me decide?", placed
directly after the power-of-attorney one since they are the same class of misconception. Says
that being named executor does not by itself put you on the RCW 68.50.160 priority list — the
executor settles the estate, and that authority generally does not begin until the will is
filed with the court, usually after the funeral — and routes the reader to the designated
agent in Section 3. Often the executor *is* the spouse or an adult child, in which case the
right comes through that relationship rather than the title; the entry says so explicitly.
**This copy was written here, not carried over from the approved draft** — unlike the rest of
the guide, which the reskin preserved verbatim. `Who Decides.pdf` regenerated (still 10pp,
still $0). Note that the `E:\Downloads` draft does not contain this entry, so re-running
`reskin_guides.py` against that draft would drop it.

---

## 5. Working rules that keep biting us

- **Never** `git add -A` / `git add .` — stage explicit paths.
- **Never** push `pdf-assets/Needs Bonney Watson Branding/`,
  `pdf-assets/Urn Options Quote 06.25.26/`, or `wmp-cemetery-map/` (real burial PII;
  this repo is public).
- Run a syntax check before every push — these are single-file apps, one JS error
  breaks the page for everyone.
- Verify generated PDFs by actually rendering them (PyMuPDF → PNG → look at it) before
  claiming a fix works.
- The repo is public and served from GitHub Pages. Anything pushed is live immediately.
