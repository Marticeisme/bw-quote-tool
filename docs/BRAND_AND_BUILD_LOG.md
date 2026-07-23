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

### 2026-07-22 — Batesville catalog expansion (in progress)
Scope agreed with Martice:
- Add missing Batesville products to the four existing catalogs **and** enrich existing
  entries with better data from `INDEX.csv`.
- Build one **new combined Cremation Containers + Rental Caskets** catalog (11 items).
- Color-split casket catalogs (Blue/White/Brown-Copper-Auburn): leave alone for now.
- Misc category (47 items): skipped for now.

Gap analysis vs `INDEX.csv`:

| Catalog | Live | In CSV | Matched | To add |
|---|---|---|---|---|
| Metal Caskets | 27 | 143 | 27 | **116** |
| Wood Caskets | 21 | 61 | 20 | **41** |
| Urns | 113 | 153 | 112 | **41** |
| Keepsakes | 91 | 95 | 84 (by name) | **11** |
| Cremation + Rental | — | 11 | — | **11 (new)** |
| | | | | **220 total** |

Enrichment available: caskets currently show no dimensions or weight — `INDEX.csv` has
`length_in`/`width_in`/`height_in`/`weight_lbs` for all 143 metal and 61 wood. Urns and
keepsakes already show material, volume+cups, and dimensions.

Reconciliation notes:
- Keepsakes are keyed by name slug, not SKU — matching is name-based. 7 live entries
  didn't match the CSV by name (e.g. "Comet Meteor Gray Mini", "Tempest Copper Mini",
  "Gold Urn Engraving Pendant"); likely renames, reconcile on price + dimensions rather
  than guessing.
- `wood-caskets.html` has 1 live SKU not in the CSV: `269150`.
- `urns-guide.html` has 1 live SKU not in the CSV: `264754`.
- Don't drop these — they're presumably intentional BW additions.

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
