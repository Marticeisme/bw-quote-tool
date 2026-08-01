# TRACK K — Casket comparison: use the page (`s09/casket-compare`)

You are a track subagent. Read `ops/SPRINT_GUIDELINES.md` and `ops/DESIGN.md`, and
**read `docs/BRAND_AND_BUILD_LOG.md` before touching any catalog page** (brand tokens,
card contract, image conventions — append your entry when done, never rewrite it).

## Operator complaint (2026-07-31, with screenshot)

> "Side by side comparison casket photos needs to be much larger. look how much empty
> space is being left on this page. how is a family going to be able to decide on a
> casket like this?"

The screenshot shows the Cremation & Rental "Side-by-Side Comparison" print view:
three caskets across, thumbnail-sized photos (~200px in a 786px-wide render), the
comparison table done by mid-page, and the **bottom half of the sheet empty**.

## Scope

The comparison view (`cmp-title` / comparison overlay + its print layout) exists in
FIVE pages: `all-caskets.html`, `wood-caskets.html`, `metal-caskets.html`,
`cremation-containers-rental-caskets.html`, `keepsake-urns-guide.html` — near-duplicate
markup in each. Fix ALL five consistently.

**Layer discipline — investigate before editing:** `scripts/build_catalogs.py` /
`build_sectioned_catalogs.py` regenerate at least some of these pages. Determine
whether the cmp markup lives in the generator/template or only in the emitted pages.
Edit the layer that survives a rebuild — if the pages are generated, change the
generator and rebuild; if the cmp block was hand-added after generation, change the
pages AND note the regeneration hazard in your report + the build log. The static-PDF
trap applies: if these pages have downloadable PDFs built by
`scripts/build_catalog_pdfs.mjs`, rerun it so downloads don't go stale.

## What "fixed" means

1. **Photos dominate.** At 2–3 items compared, each photo should be roughly 2–3× its
   current rendered size — the empty bottom half of the sheet gets used. Scale with
   the item count (2 items = bigger than 4). Keep aspect ratio, no crops that hide the
   casket form.
2. **The whole sheet is used in print.** The print view should fill a Letter page
   sensibly: big photos on top, table below, advisor footer at the bottom — not a
   strip of content floating in white space. Screen (overlay) view gets the same
   enlargement treatment within its own constraints.
3. Table stays legible and aligned (the sprint-04 alignment gate patterns apply);
   brand tokens per the build log; no regression at 4+ items compared (photos shrink
   gracefully back down).
4. Works for the urns page too (its items are square-ish, not wide — verify it doesn't
   explode).

## Verification

- Playwright renders of the comparison print view before/after for: 2 caskets, 3
  caskets, 4+ items, and 2 urns — in `scratch/s09k-renders/`. LOOK at every one; the
  operator's complaint is visual, so the evidence is visual.
- `node scripts/verify_catalogs.mjs` green; `node scripts/verify_guides_page.mjs`
  green; print-header gate if these pages carry it.
- If PDFs regenerated: page counts stated, spot-rasterized and looked at.
- `npm run check` unchanged (`8 blocks, 0 errors` — you don't touch index.html).
- `npm test` counts not falling (name the count). Port 3737 may be owned by a foreign
  server — use an alternate port with byte-restored tests as prior tracks did.

## Report

Standard format + before/after screenshots listed, the generated-vs-hand-edited
finding stated plainly, and the build-log entry appended.
