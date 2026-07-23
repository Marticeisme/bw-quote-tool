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
