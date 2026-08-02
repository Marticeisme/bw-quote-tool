# TRACK B — Marker guide split: two PDFs, all-in group prices inside the scale guide

Branch `s11/marker-guides` (spawns after Track D merges — build on D's cover-less
print system). Obey `ops/SPRINT_GUIDELINES.md` + `ops/DESIGN.md`; read
`docs/BRAND_AND_BUILD_LOG.md` first. You own `markers-guide.html` and its PDF
outputs entirely (Track D was ordered to keep off them).

## Operator request (2026-08-02, near-verbatim)

- "The granite marker guide still does not look great... separate the PDF version
  entirely. One of the marker guides will focus on the **marker sizes and colors**
  while the other focuses just on the **photos, diamond etching, and the sizes of
  photos**."
- "I want to very clearly mark the **total price of Group 1, Group 2 and Group 1
  Non-Tariffed markers. The prices should display directly on the marker scale
  guide INSIDE the marker** to save room."
- Ruling at boot: total price = **ALL-IN** (marker + standard engraving +
  setting/foundation fee), labeled so a family knows it's complete. One figure per
  group per marker size.
- Sprint-wide: no cover page, no rendered "MIS", concise/photo-first (families
  shouldn't read paragraphs — photos + plain lines + prices).

## Deliverables

1. **PDF 1 — Marker Sizes & Colors.** The marker scale guide (the true-size /
   to-scale outlines by size) with, INSIDE each marker outline, the all-in totals
   for G1 Tariffed / G1 Non-Tariffed / G2 (three compact labeled figures). Granite
   color swatch groups (the existing color-group sections: G1 Non-Tariffed = Cloud
   White, Misty Pink, PC Violet; G1 Tariffed = Cascade Gray, Classic Gray; G2 =
   Absolute Black, Blue Pearl, Aurora, Bahama Blue, ...). Sizes table stays.
2. **PDF 2 — Photos, Diamond Etching & Photo Sizes.** Porcelain/ceramic photo
   options with their sizes and prices, diamond etching, real example photos.
3. `markers-guide.html` (web) offers BOTH downloads clearly; guides.html card
   updated if its copy names one PDF.

Price source: the tool's own marker pricing (index.html marker options /
`data/prices.json`) — NEVER a printed sheet. Reconcile the engraving + setting fee
amounts from the tool's quote math; if the all-in composition is ambiguous in code,
state exactly which fees you summed in a footnote line on the PDF ("includes
standard engraving and setting") and in your report. Do NOT touch index.html.

## Verification

- Both PDFs build through the print system (cover-less, running footer), each ≤6
  pages; staleness manifest green.
- A verifier (extend the existing marker/guide verifier or add one) reconciles
  every printed all-in figure against the live price source, and asserts zero
  rendered "MIS" + no per-item bare marker prices that violate the range-only rule
  — the all-in group totals ARE the operator-ordered exception; assert exactly
  those appear.
- `verify_guide_pages.mjs` / `verify_guides_page.mjs` green.
- Full contract: `8 blocks, 0 errors`; `npm test` ≥ the count Track D's merge set
  (director will state it; never below 1538/31). Quote verbatim.
- Rasterized renders of both PDFs under `scratch/s11b-renders/` — the in-marker
  price legibility is the thing the operator complained about; LOOK at it.

## Report

Standard format + the fee composition used for "all-in", and both PDFs' page counts.
