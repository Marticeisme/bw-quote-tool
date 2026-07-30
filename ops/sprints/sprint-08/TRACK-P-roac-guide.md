# TRACK P — Rock of Ages one-page family guide (prints ≤2 pages)

Repo: `C:\Users\Martice\bw-quote-tool`; you run in the WORKTREE
`C:\Users\Martice\bw-quote-tool-roacg` on branch `s08/roac-guide` (node_modules junction
in place). ALWAYS `git -C C:\Users\Martice\bw-quote-tool-roacg …`. Obey
`ops/SPRINT_GUIDELINES.md` + `ops/DESIGN.md`. Commit locally with explicit paths, NEVER
push. Never write to production Firebase.

**Read `docs/BRAND_AND_BUILD_LOG.md` FIRST** (brand tokens navy #466e86 / orange
#e84610, card contract, image conventions, the sprint-07 condensed-print conventions) —
and append your entry to it when done.

## Operator request (2026-07-29, verbatim intent)

A one-page guide (screen), printing to NO MORE THAN TWO PAGES, covering the Rock of
Ages Columbarium (ROAC) in more detail: what a glass-front niche is, the benefit of
one, the GENERAL PRICE RANGE of these niches, and that **each niche comes with two
rights**. Uses his real photos from `D:\Cemetery Photos Misc\ROAC Photos` — "sample
the best ones you think of."

## Content sources — nothing invented

- **Prices/inventory:** `scripts/roac-niche-data.mjs` (the live ROAC dataset in this
  repo). Compute the general price range FROM AVAILABLE NICHES in that module and
  state it as a range ("generally $X–$Y depending on row and location" style). A tiny
  script must reconcile the printed range against the module — the range on the page
  is generated-or-verified, never typed from memory. Fees (O&C, recording, ECF) only
  as that module/map already carries them.
- **Two rights:** each ROAC niche includes TWO inurnment rights (up to two urns).
  Consistent with the tool's capacity model. Say it plainly; do not invent policy
  detail beyond it (no transfer/upgrade claims).
- **What a niche is / benefits:** general, verifiable statements only (permanent
  glass-front memorial in a granite courtyard structure, personalization visible
  through the glass, a permanent place for family to visit, no ground burial needed,
  companion capacity via the two rights). NO claims about religion, weather-proofing
  guarantees, appreciation/investment, or anything the repo cannot back. Tone matches
  the existing guide family (see `urn-placement-guide.html`, `terramation-guide.html`).
- **Cross-link:** the live map `MAPS/ROAC_NicheMap.html` ("see live availability and
  exact pricing"), and mention Washington Memorial Park placement.

## Photos — his real ones, PII-guarded

Source `D:\Cemetery Photos Misc\ROAC Photos`. Pick the best 4–6 (sharp, well-lit,
showing: the courtyard/structure wide, a glass-front detail, the granite/bench
setting). **HARD RULE: no legible occupant name, plate text, dates, or portrait of a
person may appear in any published image.** Crop or choose angles so plates are
illegible at final resolution; zoom your rendered output to VERIFY illegibility —
if in doubt, don't use the photo. Resize/compress per the repo's image conventions
(see how `terramation-guide.html` ships its photos) into an appropriately named
folder; stage each by name.

## Deliverables

1. `rock-of-ages-guide.html` — matches the guide family (masthead, brand tokens,
   footer, ≤40 mm print header) with a condensed `@media print` layout (s07 style).
2. PDF: register in `scripts/build_guide_pdfs.mjs` JOBS (e.g.
   `pdf-assets/Rock of Ages Niche Guide.pdf`), rebuild — **≤2 pages**, and add it to
   the ≤4-page FAMILY GUIDE PAGE CAP list in `scripts/verify_guide_pages.mjs` with its
   own ≤2 assertion.
3. `guides.html`: ONE card in the most fitting existing category (not Maps — the map
   already has a card; this is a guide), pill count bumped for that category only.

## Verification gates (quote outputs verbatim)

1. Price-range reconciliation script output: the range printed on the page equals the
   min/max available price in `scripts/roac-niche-data.mjs`.
2. PDF page count ≤2 (PyMuPDF), `verify_guide_pages.mjs` green including your new cap
   entry; `verify_guides_page.mjs` ALL OK; `verify_print_header.mjs` under cap.
3. `npm run check` 8/0; `npm test` ≥ `1327 passed, 0 failed across 27 suites`.
4. Render the PDF and LOOK; zoom every photo in the final PDF and confirm no legible
   plate text. Screenshots of page + PDF in `scratch/`, listed in the report.
5. Screen page: verify the page renders without JS errors and the card link resolves.

## Report

What shipped; branch + commits; verbatim gates; which photos you picked and why +
the PII check per photo; the computed price range; decisions & open questions.
