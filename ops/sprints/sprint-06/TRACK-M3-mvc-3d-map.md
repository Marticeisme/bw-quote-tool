# TRACK M3 — Rebuild the MVC glass-front niche map as a 3D page

You are a build track for sprint-06 of the BW Quote Tool. Obey
`C:\Users\Martice\bw-quote-tool\ops\SPRINT_GUIDELINES.md` and `ops/DESIGN.md`.
**You work in the git worktree at `C:\Users\Martice\bw-quote-tool-mvc3d`** on branch
`s06/mvc-3d` (already created for you, `node_modules` junctioned). Use
`git -C C:\Users\Martice\bw-quote-tool-mvc3d` for EVERY git call. Never push, never touch
`main`, never touch `index.html` or any file another track owns (`terramation-guide.html`,
`guides.html`, `docs/BRAND_AND_BUILD_LOG.md` are Track G's — hands off; if the brand log
needs an entry, put the text in your REPORT for the director to add at close).

## The operator's decision (2026-07-28)

**The 3D view REPLACES the current 2D page, at the SAME URL** —
`MAPS/MVC_NewGlassFront_NicheMap_1.html` (guides link to it; the URL must not change).
Operator: "Here is the actual blueprint for MVC. Could you build a better map off of
this? Maybe a 3D one?" — and he chose full replacement over a companion page or tab.

**Non-negotiable rider:** counselors PRINT this page as a working reference (its own
overview says so). Replacement must keep a usable print path — `@media print` renders the
flat per-wall grids (the current page's four wall grids + prices are the right print
shape), while screen renders the 3D experience. Losing print would turn an upgrade into
a regression.

## Sources

1. **The fabrication blueprint** (geometry truth):
   `C:\Users\Martice\bw-quote-tool\reference-docs\internal\WA Seatac - Washington Memorial Park GFN2026.02.24.pdf`
   — 4 pages, Matthews Gibraltar drawing K25-377, read it with PyMuPDF from the MAIN
   tree's absolute path above (the folder is gitignored so it does not exist in your
   worktree; the Read tool cannot open PDFs — render pages to PNG and look, and use
   `get_text()` for the dimension tables).
   - Octagonal room: 24'-0" base-to-base across, 12'-0" between side bases, 14'-0" base
     length, entry doors on one face; electrical panel on the interior north side.
   - Island: 11'-3 7/16" long × 3'-9 1/8" wide × 7'-4 3/4" overall height (6'-10 5/8"
     trim height), Units A1/B/C/A2; 145 total openings; bronze frame ("Matthews Dark"),
     flat glass fronts and sides, finished base panel with leveling base, interior LED
     lighting, rosettes at grid intersections, 1'-0" niche depth.
   - Per-unit tables give inside niche dims, urn-opening dims and face-plate dims —
     use them to proportion the 3D cells truthfully.
   **This drawing is Matthews' copyrighted instrument of service. Its dimensions become
   OUR data; its imagery must never be embedded, committed, or reproduced in the page.**
2. **The niche data** (refs/prices/rights truth): the CURRENT
   `MAPS/MVC_NewGlassFront_NicheMap_1.html` in your worktree — its `buildGrid` datasets
   were verified 1:1 against the June 2026 price sheet earlier this sprint (0 mismatches;
   38 before). **Reuse that data verbatim — do not re-derive prices.** Wall ↔ MIS mapping:
   Back Wall (East) `MVC-ISL-E-Level-Space`, Side A (North) `MVC-ISL-N`, Side B (South)
   `MVC-ISL-S`, Front Wall (West, entry) `MVC-ISL-W`. West wall has the access-panel
   void (rows A–C, center); D/E-1 and D/E-2 are 4-right two-level companions on E and W
   walls.

## Build guidance

- **No build step, no CDN.** Recommended approach: **CSS 3D transforms with DOM niches**
  — the island is a rectangular prism with four flat walls; each wall is the existing
  grid laid onto a transformed plane; the room is an octagonal floor + walls; niches stay
  real DOM (clickable, focusable, searchable) rather than WebGL pixels. Drag to orbit,
  pinch/wheel to zoom (CLAMPED — the operator just complained about unbounded zoom on
  the internal map), buttons to face each wall square-on, tap a niche for a detail card
  (ref, MIS string, price, rights, dimensions from the blueprint tables). If you judge
  CSS 3D genuinely insufficient, a vendored (committed, not CDN) three.js is permitted —
  justify it in the report; do not exceed ~700 KB added.
- Keep the page's existing brand feel (navy/gold, Cormorant Garamond) and the pieces
  that still serve: price legend, rights legend, fees note, effective-date footer, the
  Terrace Garden Niches tab and anything else the page hosts beyond the MVC section —
  **inventory what else lives on that page before rewriting it, and carry it over.**
- Mobile matters: counselors hold phones in the columbarium. Touch orbit + tap detail
  must work at 375px wide.
- Accessibility floor: niches are buttons with accessible names ("E-2, $18,000, 2
  rights"); the print view needs no JS.

## Verify (quote outputs verbatim)

1. **Data equality gate:** a script proving the 3D page's niche dataset is IDENTICAL
   (ref/price/rights/wall/geometry) to the pre-rewrite page's dataset — 145 sellable
   openings + panel, per-wall counts 51/23/23/48. Reuse/adapt the sprint's
   `scratch/_mvcniche/diff_html_pdf.mjs` pattern (run against the June sheet extraction
   if simpler: 0 mismatches required).
2. `npm run check` → `index.html: 8 blocks, 0 errors` (untouched; prove it).
3. `npm test` from the WORKTREE → counts vs `1300 passed, 0 failed across 26 suites`,
   noting DESIGN §5's caveat that the count is environment-dependent (the map cross-check
   suite skips outside the main tree — expect 1298-class numbers there; compare per-suite,
   never let a count fall silently).
4. **Playwright, headless, and LOOK** (ops/MISTAKES.md #15/#16): screenshot the 3D view
   from several orbits and each face-on wall, the niche detail card open, mobile width,
   and the PRINT rendering (`page.emulateMedia({media:'print'})` + pdf) — every wall grid
   present with prices. Zero console errors. Say what you looked at.
5. Click-through: a niche on each wall opens the right detail (spot-check at least
   D/E-1 $48K east, C-3 $10K west, a $7K west A-row niche).

## Hard rules

- Branch `s06/mvc-3d` in the worktree only; explicit staging
  (`MAPS/MVC_NewGlassFront_NicheMap_1.html` and only what you own);
  `git rev-parse --abbrev-ref HEAD` before every commit; commits
  `[s06/mvc-3d] <imperative>` + `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- No pushes, no production Firebase, no map-repo (`wmp-cemetery-map/`) data, no real
  names, no blueprint imagery. The blueprint PDF stays where it is.
- Dev server: the worktree has its own tree — if you serve it, use a port OTHER than
  3737 (3739 is free) and kill your server when done.

## Report

Per `SPRINT_GUIDELINES.md` rule 8, plus: your approach choice (CSS 3D vs vendored lib)
and why; the brand-log entry text for the director; anything about the blueprint you
consciously simplified.
