# TRACK C — Casket & urn catalogs: filters + print-what's-filtered

Branch `s11/catalog-filter-print`, worktree (director supplies path). Obey
`ops/SPRINT_GUIDELINES.md` + `ops/DESIGN.md`; read `docs/BRAND_AND_BUILD_LOG.md`
(catalog build hazards). **Do NOT touch `index.html`** — catalogs are standalone
pages.

## Operator request (2026-08-02, near-verbatim)

"I want to be able to put **filters** on the casket and urn catalogs and then
**print everything that is filtered**. It should work similar to how the compare
function works but limit the amount of caskets to 3 or 4 per page — judgment is
yours."

Director guidance: 3/page for caskets (big photos read better — the operator's
photo-first philosophy), 4/page acceptable for urns/keepsakes. Your call within
that.

## Surfaces

The catalog pages: `wood-caskets.html`, `metal-caskets.html`,
`cremation-containers-rental-caskets.html`, `all-caskets.html`, `urns-guide.html`,
`keepsake-urns-guide.html` (verify the exact set — the compare block ships on six
pages, previously md5-identical across them; keep them identical if that contract
still holds).

**Build-system trap (recorded in the build log): `build_all_caskets.py` templates
the shared block from the WOOD page, `build_cremation_rental` templates from
`urns-guide.html`.** Change the source templates and REBUILD; a hand-edit to a
generated page evaporates on the next regeneration. Re-run the build after your
change and prove the output carries it (the s09 Track K method: rebuild comes back
byte-identical / carries the block).

## Feature

1. **Filters** appropriate to each catalog's data (material/species/finish, price
   band, color, interior, category — derive from what the cards actually carry).
   Filter UI consistent with the existing catalog chrome; live count of matches.
2. **Print filtered**: a "Print these N" action that lays out ONLY the filtered
   items, 3 per page (4 for urns if you judge it better), compare-style cards
   (photo, name, specs, price), footer consistent with the catalog print story.
   Learn from s09 Track K's scars: the compare sheet is position:fixed and
   overflow CLIPS, not paginates — the filtered print must genuinely paginate
   (this is a multi-page flow, unlike compare's one sheet).
3. Compare itself stays working and unchanged in behavior.

## Verification

- `scripts/verify_catalogs.mjs` green; catalog PDFs: if your change affects the
  static print-media output, rerun `build_catalog_pdfs.mjs` (the static-PDF
  staleness trap) — if it doesn't, prove page-1 print-media is identical as Track
  K did.
- New Playwright suite: filter narrows counts correctly on at least two catalogs,
  print layout paginates at 3/page (assert page breaks / element pagination, not
  just CSS present), compare regression intact, six-page block identity preserved
  (or documented if deliberately diverged).
- Full contract: `8 blocks, 0 errors`; `npm test` ≥1538/31 + your new suite
  (quote verbatim).
- Screenshots: filter UI + a 7-item filtered print preview under
  `scratch/s11c-renders/`.

## Report

Standard format + per-catalog filter fields chosen, per-page count chosen and why,
and the md5 story across the six pages.
