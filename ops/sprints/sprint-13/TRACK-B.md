# TRACK-B — Five per-area photo guides (ROAC, MVC niches, ECL, GOMN, Terrace Garden Memorial Path)

You are a track subagent in sprint-13 of the BW Quote Tool. Obey
`ops/SPRINT_GUIDELINES.md` and `ops/DESIGN.md`; read the s12 close entry and the s13
entries at the top of `ops/STATE.md`. Work ONLY in your worktree (`git -C` absolute
paths always). Branch: `s13/area-guides`. Commit locally with `[s13/area-guides]`
prefixes; NEVER push; NEVER write to Firebase.

## The operator's request (2026-08-03, verbatim)

"Then I'd like larger more visual guides for each section that we still have a lot of
inventory for. so one for roac one for mvc new niches one for eternal light columbarium
glass front niches and one for the garden of medicition niches and ones for the
entirety of the terrace garden memorial path. all cleaned up and with the best photos
from each folder included."

## What to build — five NEW standalone guides

| Guide (new file) | Area | Photo folder(s) on `D:\Cemetery Photos Misc\` | Data module (prices/inventory truth) |
|---|---|---|---|
| `roac-guide.html` | Rock of Ages Columbarium (granite, interior + exterior) | `ROAC Photos` | the ROAC map data module in `scripts/` |
| `mvc-niches-guide.html` | MVC island glass-front niches (the "new" niches) | `New MVC Photos` (+ `Old MVC` only if a photo is clearly still-current) | MVC niche data module |
| `ecl-guide.html` | Eternal Light Columbarium glass-front | `Eternal Light Columbarium (NEW)`, `Crystal Niche` (verify what Crystal Niche actually depicts before using) | ECL niche data module |
| `gomn-guide.html` | Garden of Meditation Niches | `GOMN Niches` | GOMN data module |
| `terrace-garden-guide.html` | The ENTIRE Terrace Garden Memorial Path: TGN niche bank + the nine properties + cremation posts | `Terrace Garden Memorial Path`, `Cremation Posts`, `Garden Court and Terrace Garden Maus` (verify relevance per photo) | TGMP map data module |

These are IN ADDITION to the two combined overview guides (granite-niches,
glass-front) that Track A is redesigning in a parallel worktree — do NOT touch Track
A's files: `granite-niches-guide.html`, `glass-front*.html`, `granite-niche-images/`,
its image dirs. Known shared surfaces you WILL touch and must keep minimal + additive:
`guides.html` (five new cards — expect a pill-count merge conflict, it is routine),
the per-guide cap map in `scripts/verify_guide_pages.mjs` (Track A is creating it —
implement yours additively; the director resolves the merge), `.build-manifest.json`.

## Design mandate

- "Larger, more visual": photo-led pages, frames follow the photos (photo-first card
  template in `docs/BRAND_AND_BUILD_LOG.md`, "2026-08-02" entry), generous scale.
  Print cap ≤8 pages per guide, entered in the cap map.
- "Cleaned up": brand palette #466e86/#e84610, the s12 print system (logo top-right,
  full-bleed cream, footer on the cream) — inherit it, don't fork it.
- "Best photos from each folder": LOOK at every candidate at full size; pick for
  product visibility, light, composition. Per-photo verdict in the report. PII rules:
  memorial names/dates in his property photos are FINE; NO operational sticky notes /
  staff paperwork / scheduling info; no faces without reason. Photos land in ONE new
  dir per guide (kebab-case), ~1400px long edge, lean JPEG; report the total size.
- **Inventory honesty**: these areas were chosen because they have inventory. State
  availability at the level the live data modules support (counts, price ranges
  computed from the modules — NEVER hand-typed figures), following the range-only
  pricing rule (computed ranges yes, per-item fee tables no). Every printed figure
  must reconcile through a verifier — extend the existing range verifiers
  (verify_granite_niche_ranges / glass equivalents) or add a
  `verify_area_guide_ranges.mjs` following their pattern, sabotage-proven.
- Each area's specifics honored: fees per the rulings already encoded in the data
  modules (do not restate schedules the modules don't carry); GOMN "NO PHOTOS
  ALLOWED" refers to photos ON the niches — check how the existing pages phrase it
  and carry the same rule statement; TGMP's page states bark beds vs render turf
  honestly (see the TGMP map's precedent).
- Maps cross-links: each guide links its area's 3D/2D map page (they all exist under
  MAPS/) the same way existing guides link maps.

## Verify — look at your work

- Rasterize EVERY page of all five PDFs into `scratch/s13b-renders/`; LOOK at each:
  no fragment crops, logo/cream/footer intact, ≤8 pages each, register gate clean
  (no "MIS", no internal vocabulary — the family-register gate runs in
  verify_guide_pages and must stay green).
- guides.html: five cards added, verify_guides_page green.
- Gates: verify_guide_pages incl. your cap entries (sabotage one guide over-cap →
  named FAIL), your range verifier (sabotage a price → FAIL), staleness gate green
  after rebuilding YOUR five PDFs (+ manifest entries).
- `npm run check` 8/0; full `npm test` in the worktree (junction node_modules;
  quote EXACT env-pinned commands — s12 lesson).

## Report

What shipped; per-guide page map; per-photo curation verdicts; every computed figure
and which verifier pins it; sabotage transcript; verbatim suite counts; render paths;
size delta; honest caveats. Raw facts over polish.
