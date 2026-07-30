# TRACK U — Lake & Rose Urn Garden one-page infographic (exactly 1 printed page)

Repo: `C:\Users\Martice\bw-quote-tool`; you run in the WORKTREE
`C:\Users\Martice\bw-quote-tool-urngarden` on branch `s08/urn-gardens` (node_modules
junction in place). ALWAYS `git -C C:\Users\Martice\bw-quote-tool-urngarden …`. Obey
`ops/SPRINT_GUIDELINES.md` + `ops/DESIGN.md`. Commit locally with explicit paths,
NEVER push. Never write to production Firebase.

**Read `docs/BRAND_AND_BUILD_LOG.md` FIRST**; append your entry when done. You branch
from a main already carrying Tracks F, P, H, Q — read their landed conventions.

## Operator request (2026-07-29)

A ONE-PAGE infographic (prints as exactly 1 page) covering the **Lake Urn Garden** and
the **Rose Urn Garden** at Washington Memorial Park. Photos and starting content come
from his slide: `E:\Downloads\Urn Garden 1 Page Infographic Use Photos.png` — extract
the three photographs from that PNG (flush-marker row; fountain garden bed with
markers; the lake with twin fountains under the magnolia). Content points from the
slide, keep them: what an urn garden is (a memorial garden designed for the placement
of urns with cremated remains); **1 OR 2 rights per space**; options for urns placed
in boulders near the lake as well as cremation posts.

## Prices — operator-directed narrow exception to DESIGN §6

The public repo's `data/prices.json` carries NO Lake/Rose garden prices. The operator
ruled 2026-07-29: take them from the cemetery map repo. That repo is gitignored and
lives only in the MAIN working tree — read it by absolute path:
`C:\Users\Martice\bw-quote-tool\wmp-cemetery-map\data\` (prices.json and/or the
Lake Urn Garden / Rose Urn Garden geojson unit files — RUG is the Rose Urn Garden
section code).

**The exception is PRICE AGGREGATES ONLY.** You may compute, per garden, the min/max
price across sellable spaces (and per option type — lake boulder / cremation post /
garden space — if the data distinguishes them). What crosses into the public repo is
the RANGE FIGURES on the page and a reconciliation script that recomputes them at
gate time by reading the map repo path (skipping gracefully with a clear NOTE when the
folder is absent, like the existing map-dependent test does). **Nothing else crosses:
no space refs, no per-space prices, no statuses, no names, no coordinates — not in
code, comments, fixtures, or your report.** If the map repo's garden data is missing
or ambiguous, STOP on prices: ship the page with the ranges marked as an explicit
TODO note in the report, and escalate — never guess.

## Photos — PII check

The extracted marker-row photo shows memorial plaques. At final resolution every
plaque must be ILLEGIBLE — downscale/crop and zoom the rendered output to verify; if
any name can be read, crop those plaques out or drop the photo. Same for the garden
photo's flush markers. Compress per repo image conventions; stage each file by name.

## Deliverables

1. `urn-gardens-guide.html` — one-page infographic, family brand (navy #466e86 /
   orange #e84610, fleur logo like the slide), covering BOTH gardens: the slide's
   three points, the two gardens named and differentiated (Lake Urn Garden: lakeside
   setting, boulder + cremation-post options; Rose Urn Garden: garden setting), the
   1-or-2-rights-per-space fact, and a price range per garden (plus per-option ranges
   if the data supports them). Print stylesheet = **exactly 1 page**; screen page may
   be one viewport-friendly scroll.
2. PDF registered in `scripts/build_guide_pdfs.mjs`
   (`pdf-assets/Urn Gardens at Washington Memorial Park.pdf` or similar), rebuilt;
   added to `scripts/verify_guide_pages.mjs` with a ==1-page assertion.
3. `guides.html`: ONE card, fitting category, pill bumped, appended after Track Q's.

## Verification gates (quote outputs verbatim)

1. Range-reconciliation script output (or its explicit skip-NOTE when the map repo is
   absent — but in YOUR run it is present, so run it and quote it).
2. PDF page count == 1 (PyMuPDF); `verify_guide_pages.mjs`, `verify_guides_page.mjs`,
   `verify_print_header.mjs` all green.
3. `npm run check` 8/0; `npm test` counts never fall from what you find at branch time.
4. Render the PDF and LOOK; zoom every plaque region and quote your PII verdict per
   photo.
5. Diff hygiene: no edits outside your file set; grep your own diff for any
   `LUG|RUG|-\d+-` style space references that should not have crossed.

## Report

What shipped; branch + commits; verbatim gates; the computed ranges and exactly which
map-repo file(s) they came from; PII verdict per photo; decisions & open questions.
