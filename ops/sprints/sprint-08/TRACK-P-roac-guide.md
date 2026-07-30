# TRACK P — Granite niches one-page family guide: Rock of Ages + Garden of Meditation (prints ≤2 pages)

Repo: `C:\Users\Martice\bw-quote-tool`; you run in the WORKTREE
`C:\Users\Martice\bw-quote-tool-roacg` on branch `s08/roac-guide` (node_modules junction
in place). ALWAYS `git -C C:\Users\Martice\bw-quote-tool-roacg …`. Obey
`ops/SPRINT_GUIDELINES.md` + `ops/DESIGN.md`. Commit locally with explicit paths, NEVER
push. Never write to production Firebase.

**Read `docs/BRAND_AND_BUILD_LOG.md` FIRST** (brand tokens navy #466e86 / orange
#e84610, card contract, image conventions, the sprint-07 condensed-print conventions) —
and append your entry to it when done.

## Operator request (2026-07-29, verbatim intent)

A one-page guide (screen), printing to NO MORE THAN TWO PAGES, covering **both of
WMP's GRANITE-front niche locations** (operator amendment 2026-07-29: "gomn niches
should be added … since those are the granite niches we have and the others are the
glass front niches"):

1. **Rock of Ages Columbarium (ROAC)** — what a niche is, the benefit, the GENERAL
   PRICE RANGE, and that **each niche comes with two rights**. Photos from
   `D:\Cemetery Photos Misc\ROAC Photos` — "sample the best ones you think of."
2. **Garden of Meditation Niches (GOMN)** — the stepped garden wall. Price range from
   `scripts/gomn-niche-data.mjs` (landed by Track V before you — read it, never the
   sheet). Its distinct rules, presented as ONE connected fact: sold as a companion
   niche (2 inurnment rights) BECAUSE two compact Interlude Urns fit per niche —
   which is why that urn is required; one niche vase included; inscription $605; the
   sheet's "NO PHOTOS ALLOWED" rule carried verbatim. Photos from
   `D:\Cemetery Photos Misc\GOMN Niches` (the front .jpeg + two 2026-07 shots), same
   PII rule.
3. **Terrace Garden Memorial Path (TGN + TGMP)** — operator amendment 2026-07-29:
   "these options need to be added to the granite niche guide as well since these
   are brand new granite niches and other urn placement options." From
   `scripts/tgmp-data.mjs` (landed by Track W before you): the BRAND-NEW TGN granite
   niche bank (40 niches, 2 rights per niche, price range from the module) and the
   other urn placement options along the path — Paradiso benches, cremation posts
   (single/double/carved), the Companion Columbarium with Alcove, the Birdbath —
   presented compactly (a short "other placements along the path, $8,000–$52,000
   with 1–4 rights of interment" band computed from the module, not an item-by-item
   catalog). Photos from `D:\Cemetery Photos Misc\Terrace Garden Memorial Path`,
   same PII rule. Cross-link `MAPS/TGMP_Map.html`.

Frame the guide as "granite niches at Washington Memorial Park" — the counterpart of
the glass-front infographic (Track Q). A short line may note the glass-front
locations exist and point to their maps, without duplicating them. Note ROAC niches
are granite-FRONT (bronze/engraved face, contents not visible) — that is the honest
contrast with glass-front, keep the wording factual.

## Content sources — nothing invented

- **Prices/inventory:** `scripts/roac-niche-data.mjs`, `scripts/gomn-niche-data.mjs`
  AND `scripts/tgmp-data.mjs` (the live datasets in this repo — Tracks V and W land
  the last two before you spawn).
  Compute each general price range FROM AVAILABLE inventory in the module and
  state it as a range ("generally $X–$Y depending on row and location" style). A tiny
  script must reconcile the printed range against the module — the range on the page
  is generated-or-verified, never typed from memory. Fees (O&C, recording, ECF) only
  as that module/map already carries them.
- **Two rights:** each ROAC niche includes TWO inurnment rights (up to two urns).
  Consistent with the tool's capacity model. Say it plainly; do not invent policy
  detail beyond it (no transfer/upgrade claims).
- **What a niche is / benefits:** general, verifiable statements only. These are
  GRANITE-front niches: a permanent granite memorial (ROAC: courtyard columbarium
  structure; GOMN: garden wall) with an engraved/bronze face — contents are not
  visible, which some families prefer for its classic, uniform look; a permanent
  place for family to visit; no ground burial needed; companion capacity via the two
  rights (GOMN: because two Interlude Urns fit). NO claims about religion,
  weather-proofing guarantees, appreciation/investment, or anything the repo cannot
  back. Tone matches the existing guide family (see `urn-placement-guide.html`,
  `terramation-guide.html`).
- **Cross-link:** the live maps `MAPS/ROAC_NicheMap.html` and
  `MAPS/GOMN_NicheMap.html` ("see live availability and
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

1. Price-range reconciliation script output: ALL printed ranges (ROAC, GOMN, TGN,
   and the TGMP other-placements band) equal the min/max available figures in
   `scripts/roac-niche-data.mjs`, `scripts/gomn-niche-data.mjs` and
   `scripts/tgmp-data.mjs` respectively.
2. PDF page count ≤2 (PyMuPDF), `verify_guide_pages.mjs` green including your new cap
   entry; `verify_guides_page.mjs` ALL OK; `verify_print_header.mjs` under cap.
3. `npm run check` 8/0; `npm test` ≥ `1327 passed, 0 failed across 27 suites`.
4. Render the PDF and LOOK; zoom every photo in the final PDF and confirm no legible
   plate text. Screenshots of page + PDF in `scratch/`, listed in the report.
5. Screen page: verify the page renders without JS errors and the card link resolves.

## Report

What shipped; branch + commits; verbatim gates; which photos you picked and why +
the PII check per photo; the computed price range; decisions & open questions.
