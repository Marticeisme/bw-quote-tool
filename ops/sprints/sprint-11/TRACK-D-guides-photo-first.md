# TRACK D — Guide overhaul wave 1: covers off, MIS sweep, photo-first key guides

Branch `s11/guides-photo-first`, worktree (director supplies path). Obey
`ops/SPRINT_GUIDELINES.md` + `ops/DESIGN.md`. Read `docs/BRAND_AND_BUILD_LOG.md`
before touching guides — brand tokens (navy #466e86, orange #e84610), card
contract, image conventions.

**Ownership guard: do NOT touch `markers-guide.html` or its PDFs** (Track B owns
them, including cover removal and MIS sweep there). Do not touch anything COM
(Track A owns the COM map). Your MAPS edits are MIS-wording only.

## Operator direction (2026-08-02, near-verbatim — this is the design brief)

- "I don't like the idea of a cover page and I don't [like] any of the PDF versions
  right now." → **Remove the generated cover page from ALL guide PDFs** (the s10
  cover system in `scripts/guide-print-system/` is reversed on this point; keep the
  running footer — name/phone/email, Page X of Y — and the range-only pricing rule).
- "Families don't want to be reading paragraphs... they prefer stuff emailed to
  them to be explained concisely and plainly."
- "When it comes to property they would be interested in purchasing, **photos are
  key**. They want to SEE what they would be buying and then be given a price range
  of it. They don't want to read how much it is and then not come away with an idea
  of what it looks like."
- "**Never mention the word MIS** on any guide to a family or any live niche maps
  etc — that information does not need to be disclosed to families."

## 1. Covers off (all ~19 guide PDFs)

Change `scripts/guide-print-system` so no cover sheet is emitted; page 1 is content
under the normal masthead. Rebuild every guide PDF on main's bytes (the
`.build-manifest` staleness gate must pass). The 6-page total cap becomes
effectively 5→6 content pages — keep the cap logic coherent and state what you did.

## 2. MIS sweep (family-facing, minus COM and markers-guide)

Zero rendered "MIS" on: all `*-guide.html` pages + their PDFs, `guides.html`,
`MAPS/GOMN_NicheMap.html` (22), `MAPS/ROAC_NicheMap.html` (8), `MAPS/MVC_...` (6),
`MAPS/TGMP_Map.html` (5), `MAPS/ECL_NicheMap.html` (4). Maps are GENERATED — edit
the data modules/builders and rebuild; never hand-edit map HTML. Reword to
family-appropriate phrasing ("ask us to confirm today's availability"). Comments
and never-rendered fields may keep the word; extend each touched map's gate to
assert zero rendered "MIS" so it can't come back.

## 3. Photo-first redesign — wave-1 targets (5 guides)

`cemetery-property-guide.html`, `urn-gardens-guide.html`,
`glass-front-niches-guide.html`, `granite-niches-guide.html`,
`urn-placement-guide.html`.

Template principles (both web page and PDF; PDF is the priority deliverable):
- A product/place is a PHOTO with a name, a one-or-two-line plain-English
  description, and a **price range** — never a paragraph. Use existing repo photos
  and `D:\Cemetery Photos Misc\` (operator's relaxed photo rule: legible memorial
  plate names in his property photos are fine; living people in frame are not).
- Price ranges only (the s10 range-only rule stands): computed from live data
  modules where a verifier exists — keep `verify_granite_niche_ranges.mjs` /
  `verify_glass_niche_ranges.mjs` and friends green, extending them if figures move
  surfaces.
- Paragraph budget: intro ≤2 short sentences per section; bullets over prose;
  cut anything a counselor would say in person anyway.
- ≤6 pages total per PDF, no cover, running footer.
- Keep every page passing `verify_guide_pages.mjs` / `verify_guides_page.mjs`.

This template is the pattern next sprint rolls out to the remaining guides — write
a short `docs/` note (append to BRAND_AND_BUILD_LOG, don't rewrite) describing the
template so the rollout track can follow it.

## Verification

- Rebuild all PDFs; `scripts/guide-print-system` gates green; zero `file://` (the
  s10 gate); staleness manifest satisfied.
- Grep proof: zero rendered "MIS" across the swept surfaces (show the command and
  empty result; assert it in gates where gates exist).
- All touched map gates re-run green with anchors unchanged (you change WORDING
  only — any inventory/price anchor movement is a bug).
- Full contract: `8 blocks, 0 errors`; `npm test` ≥1538/31 (quote verbatim).
- Renders of the 5 redesigned PDFs (PyMuPDF rasterize) under `scratch/s11d-renders/`
  for the director + operator eyeball.

## Report

Standard format + before/after page counts per PDF, the template note location, and
any guide where a photo simply doesn't exist yet (list them; don't fabricate).
