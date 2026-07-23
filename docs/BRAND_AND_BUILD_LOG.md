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
