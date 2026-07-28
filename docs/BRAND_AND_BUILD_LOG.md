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
- **Open items from debrief §8 — all five now closed.** Section 5 citations and the executor
  FAQ were done (see below). Martice answered the other three on 2026-07-24: the
  **designated-agent form** is signed on a separate sheet and he does not want it surfaced in
  the guide, so Section 3's "give us a copy" stands as written; **"reverse side"** on the
  paper authorization is simply page 2, since the form prints front-to-back, so the reference
  is already correct; and the **witness-cremation** wording is handled in the entry below.

**Follow-up — Section 5 timing citations verified and added.** The debrief's content rule 4
said not to cite that section until the statutes were checked. Checked against the RCW text:

| Section 5 claim | Statute |
|---|---|
| Report of death filed and registered; medical certifier completes their portion | **RCW 70.58A.200** "Reports of death—Filing and registration requirements" — filed with the local registrar within 5 calendar days; §(4) the medical certifier attests to cause/date/time and returns it within 2 calendar days |
| Permit authorizing final disposition, issued once the report is registered | **RCW 70.58A.210** — "A person may not provide for final disposition of human remains until: (a) The report of death has been registered in accordance with RCW 70.58A.200; and (b) …has obtained a burial-transit permit" |
| ME/coroner has released the case | **RCW 68.50.010** (jurisdiction) + **70.58A.200(6)(b)** |

Every Section 5 claim held up; **no prose changed**, one `.lawcite` added after the list.

**The nuance that matters: there is no cremation-release statute in Washington.** Looked
specifically for a cremation-specific ME pre-authorization (many states have one) — it does
not exist here; the WAC that mentions coroner authority (`WAC 246-500-030`) is about
refrigeration and embalming. The hold is real but *indirect*: where the coroner or ME has
jurisdiction under 68.50.010 they become the certifier on the report of death, and
70.58A.200(6)(b) lets them record the cause as pending investigation — an unfinished report
cannot be registered, so no permit issues and no disposition can occur. The citation is
worded to say exactly that. **Citing 68.50.010 on its own would overstate it**, since that
section only defines jurisdiction and says nothing about cremation or releasing remains.

`Who Decides.pdf` rebuilt (203 KB). Still 8 sections, 8 `.lawcite`, 0 `$`.

**Follow-up — witness-cremation entry now names the charge.** Checking the Section 7 line
against practice turned up an omission: it read only *"Witnessing is available — Families may
be present to see the container placed into the chamber if they wish,"* while
`cremation-guide.html` lists **Family witness of the cremation** under Additional Services at
a real price. Two things made the silence misleading — the line sits in *"Before You Sign,
Know This,"* the one section whose job is spelling out what signing commits you to, and the
guide says some version of "costs nothing" **four** times (filing wishes, asking the ME on
your behalf, recording wishes, putting wishes on file), so a family could fairly read
"available" as one more thing included. Now ends: *"There is a charge for it, so ask us when
you arrange."* Follows the house rule for these guides — **name the charge, never the dollar
figure** — so the file stays at 0 `$`. Martice approved the wording. PDF rebuilt, 11pp.

**Follow-up — witnessing confirmed against practice, and the detail Martice volunteered.**
He confirmed families do see the container go into the chamber, so the existing description
is accurate (debrief §8 item 4 fully closed). He also mentioned something the guides did not
say: **once the chamber is closed, the family may press the button to start the cremation
themselves.** Added in both places, in each file's own register — `who-decides-guide.html`
("Once the chamber is closed, you may press the button to begin the cremation yourself", no
contractions, matching that guide) and `cremation-guide.html`, which had priced *Family
witness of the cremation* under Additional Services while saying nothing about what
witnessing actually is. It now carries a short `.prose` note under that table using the
guide's existing **bold lead-in** pattern and its `&rsquo;` contractions, and tells families
to say so ahead of time so it can be scheduled. Both PDFs rebuilt; Who Decides still 0 `$`.

**Register note:** the earlier contraction audit undercounted files that write apostrophes as
`&rsquo;` — `cremation-guide.html` does use contractions, so a plain `it's|you'll` regex
reports zero. Check for the entity too before concluding a guide's register.

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

### 2026-07-24 — Guide voice pass + five guide PDFs brought into the build

Acting on a voice review (`guides-voice-review-debrief.md`, Claude/Cowork against Martice's
voice profile). Reworked five guides, then discovered the downloadable PDFs had three
separate defects and fixed those too.

**Voice edits** (content only; no layout or structure changes):
- `burial-guide.html` — cut "When a loved one passes, it's natural to feel overwhelmed" for
  "Here's what needs to happen, and the order it happens in"; "Meet with Your Counselor" →
  "Meet with Us"; services subtitle dropped "honor their loved one"; added a plain "when
  families choose this" line to each service card.
- `pre-planning-guide.html` — cover and Section 1 subtitle de-brochured; **the three family
  quotes were cut — Martice confirmed they were invented**, and the same-category claim that
  families "consistently say it was the most meaningful gift" went with them. Removing the
  quote sidebar left `.prose-sidebar` a 2-col grid with one child, so the wrapper and its
  now-dead CSS were removed and the prose runs full width. "The 3-Step Process" → "How It
  Works".
- `cremation-guide.html` — killed "deeply personal decision" and the "designed to honor your
  loved one" brochure line. Both replacement claims were checked against the page first:
  there really are four plans, and all four really do include director services, transfer
  into care, and the cremation.
- `scattering-guide.html`, `urn-placement-guide.html` — formal/stacked phrasing plainened.
- "counselor" → "us/we" across all five (Martice's title is Family Service Director; in
  writing he says "us").

**Judgment calls, recorded because they push back on the review:**
- **The review's rule 6, "use contractions throughout", was NOT applied.** Measured first:
  the four guides it praises as gold standard (Cemetery Property, Veterans, Cremation or
  Burial, Who Decides) use **zero** contractions and 35–57 expanded forms; the two it calls
  weakest are the only ones using contractions. The voice profile appears to come from
  Martice's *email* register, not the published-guide register. Applying rule 6 would have
  rewritten the best guides. Each guide was kept in its own register instead.
- **`cremation-or-burial-guide.html` was left alone.** The review promised suggestions for it
  and never listed any; its only flagged hits were Section 6 (which the review itself calls
  outstanding) and a correct endowment-care "in perpetuity".
- **"in perpetuity" (endowment care) and "gift of" (the veteran gift) are real terms, not
  filler** — left in place wherever they carry that meaning.

**PDF defects found and fixed** (all five guides had never been in a build script; their
`pdf-assets` files were one-off exports from July 17–18):
1. **Browser margins.** Every one had been exported with default margins — ~0.6in of white
   frame on all four edges, despite the pages' own `@page{size:letter;margin:0}`. Measured by
   sampling corner pixels: the old files start white, the rebuilt ones start navy `#3d5a7a`
   with a 0px white border on all sides. This is most of why page counts fall so far with no
   content lost (Pre-Planning 7→4, Urn Placement 8→4) — the rest is the on-screen TOC, which
   print CSS hides by design.
2. **Ghostscript was corrupting text.** `shrink()` rebuilds embedded fonts and mangles the
   ToUnicode mapping for the `fi`/`fl` ligatures — "dignified" extracts, Ctrl-Fs and
   copy-pastes as "digni**º**ed" (U+00BA). Chromium's own output is clean; the damage is
   entirely from the downsample, and no font flag prevents it (`-dSubsetFonts=false` and
   `-dEmbedAllFonts=true` both tested). `build_guide_pdfs.mjs` gained a per-job
   `{ noShrink: true }`; text-heavy guides use it, since they have few images and searchable
   text matters more than a couple hundred KB. **Image-heavy catalogs keep the shrink** —
   `All Caskets.pdf` would go 2.8 MB → 9 MB, not worth it for one broken word in a subtitle.
   This defect was already live in `Who Decides.pdf` (3 hits) and `All Caskets.pdf` (1).
   **→ Superseded the same day by the ligature-suppression fix in the next entry; `noShrink`
   was removed and every PDF now keeps the downsample.**
3. **Missing contact details.** These older guides hide `.doc-footer` in print, so a
   downloaded PDF carried no address or phone. Un-hidden for print in all five. The Cremation
   Guide was worse — a *pricing* document whose address lives only in `.site-footer` (site
   chrome, correctly print-hidden), so it had never had contact details in PDF form; its
   `.doc-footer` now carries the standard address / phone / Martice's direct line above the
   existing "prices subject to change" disclaimer.

| PDF | Pages | Size |
|---|---|---|
| Pre-Planning Guide | 7 → 4 | 1451 → 400 KB |
| Burial Guide | 10 → 5 | 878 → 459 KB |
| Cremation Guide | 20 → 14 | 682 → 652 KB |
| Scattering Garden Pricing | 7 → 5 | 355 → 330 KB |
| Urn Placement Options | 8 → 4 | 700 → 382 KB |
| Who Decides | 10 → 10 | 209 → 476 KB (ligature fix) |

**Regenerating `Burial Guide.pdf` finally retires a live factual error**: it still contained
the grave-liner content removed from the page on 2026-07-23 (BW offers vaults only). The
wood-vs-metal casket gap flagged as a blocker in that entry turned out **not** to exist —
checked, the file has no hardwood/veneer/gauge content — so that concern is closed.

All six verified: exactly Letter 612x792, 0px white border, contact footer present, no
U+00BA corruption, and all pages render with 0 JS errors.

**Filter gotcha:** `build_guide_pdfs.mjs`/`build_catalog_pdfs.mjs` args are plain substring
matches, so `burial-guide` also matches `cremation-or-burial-guide.html` and silently
rebuilds it. It was restored from git here. Pass the full filename when a name is a substring
of another.

---

### 2026-07-24 — Ligature suppression: searchable PDFs *and* the image downsample

Follow-up that supersedes the `noShrink` workaround from the entry above. Martice asked to
reword the All Caskets subtitle so the corrupted "filter" wouldn't force us to drop
Ghostscript. Checking first showed the problem was much larger than one word.

**`.product-name` renders in Cormorant Garamond, which forms `fi`/`ft` ligatures**, and
Ghostscript corrupts their ToUnicode mapping — so those product names were **unfindable** in
the built PDFs. Ctrl-F for "Hartfield" in the casket catalog returned nothing.

| PDF | Names missing before |
|---|---|
| All Caskets | 5 — Hartfield, Mansfield, Clifton, Clifton - 28, Unfinished 041M Narrow |
| Wood Caskets | 5 — same |
| Cremation Containers & Rental | 1 — Standard Alternative Container |

Rewording can't fix product names, so the fix is to stop the ligature forming at all:
`*{font-variant-ligatures:none;-webkit-font-variant-ligatures:none}` inside each page's
`@media print` block. With no ligature glyph there is nothing for Ghostscript to corrupt, so
**text stays searchable and the image downsample is kept** — `All Caskets.pdf` is still
2805 KB, not 9 MB. No copy was changed; the subtitle keeps the word "filter".

Applied to all five catalogs (Wood had the same five broken names, not just All Caskets), to
the six guides, and to `reskin_guides.py`'s shared STYLE so future guides inherit it.
`build_all_caskets.py` picks it up automatically since it templates from `wood-caskets.html`
— `all-caskets.html` was regenerated from the script to confirm it round-trips.

**`noShrink` removed from `build_guide_pdfs.mjs`.** With ligatures suppressed the workaround
is unnecessary, so the guides get correct text *and* the downsample — roughly half the size:
Who Decides 476→202 KB, Burial 459→203, Cremation 652→283, Pre-Planning 400→162, Urn
Placement 382→163, Scattering 330→150.

Verified: all six catalogs 0 missing product names and 0 U+00BA; all six guides still
edge-to-edge with the contact footer; `verify_catalogs.mjs` all pages OK; guide pages 0 JS
errors. The rule is print-scoped, so on-screen rendering is untouched.

**Measurement caveat worth keeping:** a naive `name in pdf_text` check reports false missing
names, because long names wrap across lines in the PDF. Normalize whitespace
(`re.sub(r'\s+',' ',...)`) on both sides before comparing — that turned an alarming "63
missing" into a true 0.

**Process note (my error):** running `node scripts/build_guide_pdfs.mjs` with no filter
rebuilt **all twelve** guide PDFs, including the parallel session's two in-flight files
(Cemetery Property, Veterans) and four others out of scope. All six were restored with
`git checkout --`. No content was lost — those guides' HTML is unmodified at HEAD, so their
PDFs were rebuilds of identical source — but **always pass a filter when the working tree has
another session's files in it.**

### 2026-07-24 — Quote tool (index.html): Batesville catalog, CIRGAS IOA, tax footnote

Not guides/catalog work — these are `index.html` (the quoting + contract app) pushes,
logged here because everything that ships gets an entry. Verified with Playwright + xlsx/
pdf inspection, syntax-checked before each push.

**Batesville merchandise — all 510 SKUs into the FH quote tool + search** (commit `278dada`).
Same set as the catalog PDFs (`INDEX.csv`). 68 were missing: 13 urns/keepsakes → `URN_DATA`,
2 cremation containers, 3 rental caskets (new Rental Casket panel), 42 Misc → the Memorial
Merchandise dropdown. Prices matched the CSV to the cent (0 mismatches). Key fix:
`buildPriceIndex()` only scanned DOM `<option>`s, so all 452 caskets/urns — which render into
JS type-ahead dropdowns — were invisible to search and the Price List; fed `CASKET_DATA`/
`URN_DATA` in directly (index 348 → 841). SKU collision guard: #145232 and Standard Brown
share $880 and the container `<select>`'s value IS its saved state, so #145232 carries
`value="880|145232"`.

**Repo-level `CLAUDE.md` added** (commit `41670f5`) so dispatched/cloud sessions inherit the
non-negotiables (syntax check, never commit `wmp-cemetery-map/`, saved quotes are live
Firebase, Acrobat only for the RIC, the two-session rules).

**CIRGAS At-Need fixes** (commit `a077805`):
- Interment Order & Authorization now has **Double Depth + Oversize Vault** (IOA sheet `M29` /
  `P29` checkbox cells, row 29 beside the 1st-Right/Addl-Right boxes). Two Yes/No selects,
  auto-detected on import (double-depth O&C line, oversize vault), written as `X`. Oversize
  also needs the on-form `A88` approval signature (left for the FD).
- CIRGAS commission worksheet **auto-fills Total Payment Received** (`F6`) = the sale total —
  at-need is paid in full, so no field to type. Uses the sale sum, **not** `r.total` (which is
  the commission total).
- **Tax footnote reworded.** Installation/setting of tangible personal property is taxable
  under WA law, so "Services & transportation are exempt" contradicted the taxed vault-setting
  and marker-install. Cemetery/combined now read *"Tax applies to merchandise and its
  installation. Interment and recording services are exempt."*; FH keeps its own wording via a
  new `_taxNoteText(isFH)` helper (`renderSummary`, `_fqRenderHTML`, `_fqBuildPDFBytes`).

**Dead code removed** (commit `4b27adb`): `_buildQuotePDF` (472 lines) — no callers, superseded
by `_fqBuildPDFBytes`. All three download buttons already route through the latter.

Ceramic portrait pricing was verified from this session too (see the "Ceramic portrait prices
reconciled to the PCM sheet" entry above) — all five shapes match the sheet; no change needed.

---

### 2026-07-24 — guides.html: each catalog count lives in exactly one place

Verification pass over `guides.html` (all 25 cards) came back clean — pills match card
counts in all 7 categories, every "Open Guide" and `PDF ↓` target resolves on disk
(including the `viewer.html?file=…` parameter), search and empty state work, cards are a
uniform 241px so the actions bottom-align, 0 broken images, 0 JS errors.

The one thing worth changing was a maintenance hazard rather than a rendering fault: every
catalog card stated its product count **twice** — once in the description and again in the
meta line — and Cremation Containers stated it as a **split** ("8 cremation containers and 3
rental caskets" plus "11 products"), so a catalog change meant editing three numbers that
could silently disagree.

Counts now live **only in the meta line** (`Interactive · N products · printable`) on all six
catalog cards; the descriptions carry prose only. A count-free description was already normal
on this page (the Burial Vault Guide card), so nothing looks out of place. Verified each of
the six counts appears exactly once per card and still matches the live catalog page:
metal 141, wood 63, all-caskets 204, urns 154, keepsakes 102, cremation/rental 11.

Two other cards contain multiple numbers and were deliberately left alone — the niche map
("14 walls (7 letters…)") and the sample-quote card's dollar figure. Neither is a product
count that has to track a catalog.

**`scripts/verify_guides_page.mjs`** is the check, now a permanent script alongside
`verify_catalogs.mjs`. Run from the repo root; **exits non-zero on failure so it can gate a
push**:

```
node scripts/verify_guides_page.mjs
```

It compares each category pill against its card count, resolves every `guide-cta` and
`guide-pdf` href on disk (including the `file=` parameter inside `viewer.html?file=…`),
diffs each catalog card's advertised count against `product-card` occurrences in the real
catalog file, exercises search/no-match/clear, and checks for broken images and JS errors.

**Verified it actually fails** — a checker that only ever prints OK is worthless. Injected
four faults and confirmed each is caught: a wrong count pill, a dead CTA target, a
reintroduced duplicate count, and a stale count (meta saying 140 where the page has 141).

One trap found while testing: the first version matched *number-then-noun*
(`/(\d+)\s*(?:products|caskets)/`) and **silently missed "63 wood caskets"**, because the
adjective sits between the number and the noun — i.e. it missed the duplicate it existed to
catch. It now counts occurrences of the catalog's real number in the card text instead, and
separately looks for any stale `N products`. When adding a check here, break the page on
purpose and confirm it goes red before trusting it.

---

### 2026-07-24 — verify_catalogs.mjs: cover the features that had no tests

Running the catalog checker after the guides one surfaced two holes.

**The default page list was stale.** It named only the original four catalogs, so
`cremation-containers-rental-caskets.html` and the new `all-caskets.html` were never checked
unless passed explicitly — the failure mode where a script prints "ALL PAGES OK" while
skipping the page you most wanted verified. Now lists all six, with a comment to keep it
complete.

**Three features had zero coverage.** The script tested only search and sort, so the facet
filters (now the primary filter UI on all six catalogs), click-to-enlarge, and compare could
all break silently. Added:

- **Facets** — an option's stated count must equal what it actually filters to; OR within a
  facet must equal the sum of the two options' counts; adding a second facet may only narrow;
  Clear restores every card. Driven by dispatching `change` on the checkbox rather than
  clicking, because **the facet panels overlap each other and a real click on a second
  facet's button lands on the first panel in headless.**
- **Click-to-enlarge** — lightbox `src` matches the modal image, its z-index really is above
  the modal, and the first Escape closes the lightbox while leaving the modal open (the
  second closes the modal).
- **Compare** — two cards select into the tray, the overlay opens, the table renders rows.

**Fault-injected to prove the checks fail.** Disabled facet filtering in the engine and
dropped the lightbox z-index back below the modal, then confirmed the output went red:
`"Steel 20 ga." states 54 but filters to 141`, `OR within facet: expected 102, got 141`, and
`above modal false`, exit 1. Restored with `git checkout --` and re-verified clean. (The
AND-across-facets assertion did *not* fire on that particular fault — with filtering disabled
nothing can widen — so it is the weakest of the four; the count assertions are what actually
catch a broken facet.)

Both verify scripts now gate on exit code:

```
node scripts/verify_catalogs.mjs        # all six catalogs
node scripts/verify_guides_page.mjs     # the hub
```

---

### 2026-07-24 — pre-git-guard: verify pages before a push deploys them

`.claude/hooks/pre-git-guard.js` gained **rule 4**: a `git push` is blocked when a page it
would publish fails the repo's own verify scripts. This repo deploys to GitHub Pages on push,
so a broken facet filter or a guides card pointing at a missing file is live for families
immediately — the same reasoning behind the existing index.html syntax gate.

- **Only the touched surfaces are checked.** It diffs `@{upstream}..HEAD` (falling back to
  `origin/main..HEAD`) and runs `verify_catalogs.mjs` only if a catalog page is in the push,
  `verify_guides_page.mjs` only if `guides.html` is. An index.html-only push — the other
  session's normal case — pays nothing.
- **Fails open on infrastructure.** Undeterminable range, missing script, spawn failure, or
  the 4-minute timeout all allow the push. This is a quality gate, not the PII rule; it must
  never make pushing impossible.
- **Escape hatch:** `BW_SKIP_PAGE_VERIFY=1` skips *this rule only* — the PII and
  `git add -A` rules still apply. Used by the hook's own tests, and available when Playwright
  itself is what's broken.

**Fixed a latent bug while in there:** rule 1 called `allow()` (which exits) when index.html
was unreadable, so *any* rule added after it would have been silently skipped in that case.
It now just skips its own check and falls through.

**Proved both halves block, by fault injection rather than assertion.** Committed a catalog
with facet filtering disabled → `Blocking git push: catalog pages failed verification …
metal-caskets.html FAIL`, exit 2. Committed `guides.html` with a wrong category pill →
`Blocking git push: the guides hub failed verification … pill says 9, found 7 cards`, exit 2.
Confirmed the escape hatch returns exit 0 with the break still in place, then restored with
`git reset --soft HEAD~1` + `git checkout HEAD -- <file>` and verified by md5 that HEAD, the
catalog, and the other session's in-flight `index.html` were all byte-identical afterwards.

**Rule 2 had the same false-positive bug rule 3 was already fixed for — and it bit
immediately.** The commit for this very change was blocked, because its message contains the
words *"git add -A"* while describing the escape hatch: rule 2 tested the raw command, and a
heredoc line beginning `git add -A rules still apply` sits right after a newline, so it is
indistinguishable from an invocation. Rule 2 now tests `withoutMessageText(cmd)` like rule 3.
Safe because git never takes pathspecs from `-m`/`--message` or heredoc bodies, so stripping
them cannot hide a real `git add -A` — and a case asserting that a real invocation alongside
such a message *still* blocks is in the suite.

Hook tests: 29 passing (`node .claude/hooks/pre-git-guard.test.js`). The new cases pin the
plumbing, the escape hatch, and the message-vs-invocation distinction; the blocking path is
proved by the injection above, since asserting it in the suite would run Playwright over
every catalog on every test run.

---

### 2026-07-24 — Quote tool (index.html): Family 45-Day Certificate discount

Cemetery discount, from certificate #1390: **15% off all pre-need property within 45 days of a
family member's death** (excludes ECF, 2nd/3rd rights, property exchanges, private estates,
group sales). Added to both cemetery surfaces, verified in Playwright, syntax-checked before
the push. Commit `b3fee97`.

- **Main quote** — new `promo_family45` mode in the Add Discount dropdown ("🎟️ Family
  Certificate" optgroup) and the `isPromo` calc block. Reuses the July-incentive property
  machinery but sets `propPct = 0.15` and **skips the 2nd/3rd-rights fold-in** (July includes
  rights; the cert excludes them). ECF never enters the property base, so it's excluded on both.
- **Cemetery Compare tool** — added `promo_family45`, plus `promo_property` (10% property-only)
  which the compare had been **missing entirely**; its promo set had drifted stale vs the main
  quote. Now synced. July incentives kept in both (Martice's call — keep both, add Family 45).
  The FH compare (`calcFhBTotal`) intentionally has no property promos.

Verified: 15% of a $14,995 space = $2,249.25 with the $2,250 ECF untouched, in both the main
quote and the compare total delta; all promo deltas correct; 0 console errors. The certificate's
"minimum 10% down" is a payment-plan rule, deliberately **not** enforced in the discount math.

---

### 2026-07-27 — Guides audit: 21-item punch list (sprint-04 Track D)

Worked from the punch list Martice supplied on 2026-07-27. Branch `s04/guides-audit`, in a
worktree. **`index.html` was never edited** — Track A held it — only read, twice, to check
marker prices.

**Table alignment (item 1) — the class of bug, not the instance.** `.price-table th` was
`text-align:left` while `td:not(:first-child)` was `text-align:right`, so in the marker guide
"$2,200" sat two inches from the "Color" it belonged under. One rule added
(`th:not(:first-child){text-align:right}`) and **66 misaligned cells across all 10 marker-guide
tables went to 0**. New permanent check: `scripts/verify_table_alignment.mjs` renders every
guide at Letter width in print media and measures real text boxes — 21 tables, 292 cells across
20 pages. Two assertions per cell: the cell's text centre inside its header's column bounds, and
the cell's text sharing an anchor edge (left / right / centre) with its header's text. Proved by
reverting the CSS: 66 failures, exit 1.

**Print headers (item 20).** Print-only override appended to 15 guides and 5 catalogs; the
on-screen cover is untouched, and `scripts/verify_print_header.mjs` reports the print and screen
heights side by side so a regression that shrank the web page instead would be visible. The
printed masthead went from **52.8–87.7 mm to 24.2–36.2 mm**, 28.6–51.5 mm reclaimed per guide,
capped at 40 mm.

**Page shape (items 2, 3, 21).** Burial Vault Guide 12 → 10 pages: all seven urn vaults now on
one page (4 print columns instead of 3, 4:3 card images), and "Complete Pricing at a Glance" on
one. The Service Fees section was removed from the vault guide at his instruction — presentation
only; the $685 / $575 setting fees remain live in the tool, which was not touched. Direct
Cremation 4 → 2 pages: page 1 the quote and the explanation, page 2 the container. Pinned by
`scripts/verify_guide_pages.mjs` (built-PDF page counts via pdf-lib plus print-layout geometry).

**Cremation container photos (item 12) — 11 of 22 were the wrong product.** `cremation-images/`
held a 298 px copy of the catalog photos with the item numbers shuffled: 242414↔279183 and
279179↔177129 were straight swaps, plus seven more. Verified perceptually — each file scored
0.4–0.8 mean absolute difference against a *different* catalog item and 16–30 against the one it
was named for. All 22 references in `cremation-guide.html` and `direct-cremation.html` now point
at `casket-images/*` / `urn-images/*`, which are keyed by item number and covered by
`verify_catalogs.mjs`. Cremation Guide PDF: 56 of 56 product photos embedded, no lazy-load
blanks. **`cremation-images/` is now referenced by nothing — do not source a page from it.**

**Catalog facets (items 4, 13).** `wood-caskets` and `all-caskets` gained a **Cremation** facet
("Cremated in full", 18/18 matched); `urns-guide` gained **Placement** (Ground burial 8/8,
Scattering 10/10). Membership is read out of `cremation-guide.html` §5 / §7 / §9 **by item
number**, taken from each card's image filename — no fuzzy name matching, nothing unmatched.
`cremation-containers-rental-caskets.html` gained a third section carrying the same 18 caskets,
11 → 29 products, and its builder now reads that list out of the cremation guide at build time so
the two cannot drift.

**`build_cremation_rental.py` was stale, and a rebuild silently regressed the page.** It never
emitted the per-card compare toggle (added to the catalogs after the builder was written), and it
reverted the compare tray's labels to "Compare Urns" and its comparison rows to the urn set. All
three are produced by the builder now, plus a build-time assertion that every product has exactly
five details — the positional spec rows mislabel silently otherwise.

**Content corrections** (his words; prose only). *Veterans guide* — a placement-speed row
replaces distance-from-Seattle; "we", not "I"; two sets of paperwork completed in one sitting;
even-handed about Tahoma; Tahoma's headstone is free including its setting; the
VA-medallion-on-granite passage removed; pre-planning and payment plans mentioned. *Who decides*
— the medical certifier's signature promoted over the medical examiner; "the right to decide
comes with the bill" removed; the urn is needed before **release**, not before cremation; and the
note that we usually only do this paperwork for families who have arranged with us.
*Urn placement* — rewritten: an urn may go in a standard grave space anywhere in the cemetery (up
to three, with extra cost for the second and third); the sections built for urn burial are the
**Lake Urn Garden**, one urn per space, **not** section 18; and ground placement needs an urn
vault *or* a burial-rated marble urn. *Vital worksheet* gained a discreet "Sex at birth"
sub-field. *Pre-planning* now says plainly that filing wishes costs nothing and prepaying is
optional.

**Two live price disagreements, escalated and NOT changed** — see
`tests/test-marker-guide-prices.mjs`, which reconciles 14 of 18 marker price cells exactly and
records these four as named exceptions:

1. **32″ × 20″ G1 Tariffed.** The vendor price book cell reads **32610**. On the other 13 rows of
   that sheet Tariffed is Non-Tariffed × 1.20, and 2175 × 1.20 = **2610** exactly. The guide
   prints $4,146.62, which is the typo divided by ten. Three different numbers; needs a ruling.
2. **28″ × 34″, all colour groups.** `index.html` carries the 32 × 20 prices verbatim on the
   28 × 34 row. The price book and the guide agree against it, so **the tool under-quotes a
   28 × 34 marker**. Fixing that means editing `index.html`, which this track could not touch.

**`outside-marker-rules.html` finally has a PDF** (item 11): it was simply never registered in
`build_guide_pdfs.mjs`. Registered, built (4 pages), and linked from `guides.html`.

---

### 2026-07-28 — Terramation guide added (sprint-06 Track G)

New family guide `terramation-guide.html`, written from BW's own on-hand materials rather
than uploading them: the Terramation Description sheet, the 12-page BW/Return Home family
booklet and the Return Home partner training guide, all of which live in gitignored
`reference-docs/internal/` and stay there. Structure and CSS are the `scattering-guide.html`
house pattern (doc-sheet / cover / contents / `.section-wrap` / `.sidebar` / `.doc-footer`)
plus the `.faq` `<details>` component from `who-decides-guide.html`. Eight sections: what it
is, the process, the laying-in ceremony, receiving the soil, where the soil may go, cost,
practical matters, FAQ. Card added to `guides.html` under **Burial & Cremation** (pill 3 → 4).

**Photos: `terramation-images/`, seven JPEGs, 794 KB total.** The booklet has no separately
embedded photographs — every page is one flattened 1650×2550 image — so the usable
photographs were located by bounding-box detection against each page's flat background and
cropped out of the 300 dpi page bitmaps, then inset 22 px to drop the source cards' rounded
corners. The laying-in vessel is a **two-page spread**, reassembled from page 2's right
column and page 3's left column (both y 438–2111, seam invisible). Resized to 1200 px wide
for full-width figures, 1000 for the burlap bags, 720 for the tall vessel, 382 for the
organics trio; JPEG q82 progressive. The "Anatomy of a Wisp" garment photo was **rejected** —
its dotted callout leaders run into the garment and no crop removes them without clipping it;
the Wisp is described in prose instead.

**Pricing is the two GPL figures and nothing else** — Terramation $7,795.00 and Laying in
Ceremony $895.00, with the GPL's own inclusion sentences reproduced verbatim, re-verified
against `pdf-assets/General Price List.pdf` page index 12 with PyMuPDF. No other dollar
amount appears anywhere on the page, deliberately: the guide names the categories that are
priced separately (cemetery property, placement, marker, death certificates, shipping) and
sends the family to a written quote.

**What was deliberately left out**, because a family guide is not a sales document and a
wrong sentence here is one a counselor has to walk back in a living room:

- Everything from the partner training guide's Section 5 — the "Terramation Affinity Test",
  the prospect archetypes, the scripted opening question, all five quizzes. Its *facts* were
  used; none of its sales apparatus was.
- The internal "roughly 60% of families take the full amount" figure.
- Return Home's own published $5,950 direct price. Real, but it measures a different thing
  than BW's $7,795 and printing them together shows a markup with no explanation.
- "Burns no green-house gasses" (terramation is aerobic decomposition — it produces CO₂ by
  definition) and the 87% / 0.84–1.4 t CO₂ figures (provider-commissioned LCA, not confirmed
  peer-reviewed). Replaced with a directional claim the page can defend.
- "First place in the world" → **"the first state in the United States"**, which is verified
  against the Legislature's own SB 5001 page. The booklet's 2017/2018 chronology is wrong and
  was replaced with signed May 2019, effective May 1, 2020.
- The "Funeral Home of the Year / Best of the Best" award (no awarding body or year nameable)
  and "fastest-growing new disposition option in America" (no source).
- The eligibility **list**, including the 500 lb limit no independent source corroborates and
  which omits active TB. Replaced with "a few situations rule it out, we confirm with Return
  Home before anything is arranged."
- The 10 lb medium burlap bag — the booklet says 10, the training guide says 5. The page
  prints only the numbers every source agrees on (≈20 lb large, ≈2 lb small, mini = a large
  handful, 10–15 bags, ~1 cubic yard).
- Soos Creek as a place to sit near the Woodland — single-sourced to the internal doc.
- Religious perspectives, entirely, per Martice's ruling of 2026-07-28.

**Three operator rulings are baked in** (2026-07-28): soil weight prints as **~250 lb** (the
description sheet's 500 lb is superseded and does not appear); terramated remains **can be
placed at WMP in a standard-size plot**, with the family sent to a family service director for
specifics and no gardens/fees/container rules printed; religious perspectives omitted.

**The Woodland is stated as not open for visits.** Return Home's public page calls it a
peaceful resting place and never mentions this; a family that chooses Woodland donation
believing they can visit has been misled about the only thing that matters to them.

Registered in `scripts/build_guide_pdfs.mjs` (→ `pdf-assets/Terramation Guide.pdf`, **9 pages,
795 KB**) and added to `scripts/verify_print_header.mjs` so the 40 mm cap covers it — it
measures **31.3 mm print / 104.9 mm screen**. Verified by looking: all 9 PDF pages rendered
and read, Letter 612×792 with navy to the paper edge, contact footer present, all FAQ answers
printed open, zero U+00BA ligature corruption, all 7 photos embedded and none blank. Page and
card also checked in the browser at 1280 px and 390 px. `verify_guides_page.mjs` green,
26 cards; `npm run check` 8 blocks 0 errors; `npm test` 1300/0 across 26 suites.

---

**MVC New Glass Front Niche Map — 3D rebuild (sprint-06, Track M3).**
`MAPS/MVC_NewGlassFront_NicheMap_1.html` now renders a CSS-3D model of the columbarium island
(orbit, clamped zoom, face-on wall buttons, per-niche detail card) at the same URL;
`guides.html`'s link is unchanged. Printing still yields the four flat per-wall grids, one page
each, and now needs no JavaScript — they are static HTML. The page is generated by
`scripts/build_mvc_map.mjs` from `scripts/mvc-niche-data.mjs`; run
`node scripts/verify_mvc_map.mjs` after any change. Prices/refs/rights are unchanged from the
June 2026 verification (145 openings, 48/51/23/23, $1,870,000). Physical dimensions now come
from Matthews Gibraltar drawing K25-377 (local-only in `reference-docs/internal/`; copyrighted
— never commit or reproduce its imagery) and match its per-unit tables exactly; 30 dimension
strings corrected on the operator's 2026-07-28 approval. Brand tokens unchanged (navy
`#1a2744`, gold `#c8a96e`, Cormorant Garamond + Jost).

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
