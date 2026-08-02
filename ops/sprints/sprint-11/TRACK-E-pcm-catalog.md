# TRACK E — PCM flat-marker design catalog

Branch `s11/pcm-catalog`, worktree (director supplies path). Obey
`ops/SPRINT_GUIDELINES.md` + `ops/DESIGN.md`; read `docs/BRAND_AND_BUILD_LOG.md`
(catalog card contract, image conventions) and model the page on the existing
casket catalogs (`wood-caskets.html` etc. and their build scripts).

**Scope: granite FLAT markers only. No uprights, no bronze, no benches.**
Publishing ruling: ships public like the other catalogs (Batesville precedent).

## Operator request (2026-08-02, near-verbatim)

- "I want to make a PCM design catalog... the three PDFs **by design** — only the
  categories, with the **PCM number shown at the bottom** in a way that I can
  easily look up designs with families to decide between."
- "I also need the **elements** in there." (ornaments/panels/borders — the 2019
  Design Elements book.)
- "Take the **30 best granite marker photos** in that folder and have them in this
  guide as examples. Also take the photos we have for the granite marker guide and
  include them as well."
- "I envision this tool looking and working similarly to our casket catalogs but
  it will vary slightly."
- "Do a full scope of https://designmemorials.com/ and
  https://pacificcoastmemorials.com/ — there will be helpful tools on those
  websites to include in this."
- "Maybe see if GitHub has any helpful tools or ideas to help with this project."

## Sources

- `D:\Cemetery Photos Misc\Markers\PCM2020DesignBook_web.pdf` (136 MB),
  `comp-PCM_DesignBook2011.pdf` (190 MB),
  `comp-2019-Design-Elements-Book-Final-Revised-Singles.pdf` (1.0 GB — the
  Elements book). Use PyMuPDF page-by-page; never load a whole book into memory.
- 228 real marker JPGs in the same folder — curate the 30 best (sharp, well-lit,
  representative of varied designs/colors; memorial plate names are FINE per the
  operator's standing photo ruling, living people in frame are NOT).
- Photos already shipped in `markers-guide.html` — include them too.
- The two PCM sites: catalog/scope their design-lookup and personalization tools
  (WebFetch/browser); adopt IDEAS (e.g. how they organize designs, search by
  design number, category browsing) — do not hotlink or scrape their assets into
  the repo beyond what the design books already give you.
- GitHub: a brief look for reusable ideas (image-grid/lightbox/PDF-extraction
  patterns) is fine; no new runtime dependencies without listing them in the report.

## Deliverable

`pcm-design-catalog.html` (+ a build script under `scripts/` and a verifier gate,
same architecture as the casket catalogs: data → build → gate, never hand-edit the
output if generated). Requirements:

- Designs extracted from the books, organized by the books' own CATEGORIES, each
  card showing the design image with the **PCM design number clearly at the
  bottom** — the whole point is fast lookup while sitting with a family
  ("show me PCM-####" must be instant: a number search/jump box).
- An **Elements** section (from the 2019 book) organized the same way.
- An **examples gallery**: the 30 curated real photos + the markers-guide photos.
- Flat-granite-only filter applied at extraction: skip upright/bronze/bench
  sections of the books; state in the report which book sections you included and
  excluded.
- NO prices on this page (design lookup only) and zero rendered "MIS".
- A print/PDF story consistent with the other catalogs is welcome but secondary;
  if the extracted image volume makes the PDF huge, ship web-first and say so.
- Card on `guides.html` (or wherever the other catalogs are linked — follow the
  existing pattern; append, expect the usual pill-count merge collision).

Mind repo size: GitHub Pages serves this publicly and the repo is already 12 MB+.
Re-encode extracted images to sensible web sizes (JPEG/WebP, longest edge ~1200px,
thumbnails smaller); report the total byte weight you're adding.

## Verification

- Gate: every design card has an image + PCM number; category counts stated and
  asserted; number-search finds a known sample; zero "MIS"; sabotage-proven.
- `verify_guides_page.mjs` green after the card lands.
- Full contract: `8 blocks, 0 errors`; `npm test` ≥1538/31 (quote verbatim; your
  new gate raises the count).
- Playwright screenshots of the category grid, a design card, number lookup, and
  the examples gallery under `scratch/s11e-renders/`.

## Report

Standard format + per-book extraction census (sections, designs kept/skipped),
the 30-photo selection list, byte weight added, and what you took from each PCM
website (scope notes → which ideas you implemented vs deferred).
