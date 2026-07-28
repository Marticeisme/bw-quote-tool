# TRACK M4 — 3D MVC map polish (operator punch list, 2026-07-28)

You are a build track for sprint-06 of the BW Quote Tool
(`C:\Users\Martice\bw-quote-tool`). Obey `ops/SPRINT_GUIDELINES.md` and `ops/DESIGN.md`.
Branch: **`s06/mvc-3d-polish`** from current `main`. The page is LIVE — this branch
merges and deploys only after director audit and the operator push gate.

## Context

`MAPS/MVC_NewGlassFront_NicheMap_1.html` is **generated** — edit
`scripts/build_mvc_map.mjs` (+ `scripts/mvc-niche-data.mjs` for data) and rebuild; NEVER
hand-edit the HTML. Gate: `node scripts/verify_mvc_map.mjs` → `RESULT: PASS — 0
mismatches`. Read `ops/sprints/sprint-06/TRACK-M3-mvc-3d-map.md` and its report context
in `ops/STATE.md` (sprint-06 section) for how the page is put together.

## The operator's five items (his screenshot showed the default view from slightly
BELOW the island, washed-out colors, and bare "WEST" floor labels)

1. **No under-view; start at the front.** The camera must never see the island from
   underneath — clamp pitch so the eye stays at or above a sensible minimum. The
   **initial view is the Front (West) face-on view**, not a 3/4 orbit. Reset returns to
   it.
2. **Overhead doesn't work functionally.** M3 made it an orientation-only view (54°,
   labels on the floor) because straight-down shows only the lid. Either make it
   genuinely useful (e.g. an exploded/plan orientation that shows the four walls
   splayed flat around the island footprint with their MIS strings — pick something a
   counselor can actually use to orient a family) or remove the button. A view that
   "doesn't really work functionally" (his words) must not ship as-is.
3. **Full MIS location strings on the orientation labels.** Where the floor/edges say
   "WEST" etc., show the full location as on the price sheet — `MVC-ISL-W-Level-Space`
   (and the friendly name), "so that the directors know what location it is fully."
   Apply anywhere a bare compass word stands alone.
4. **Colors: adjust and clean up — they are hard to see.** In his screenshot the price
   classes are muddy and low-contrast against the dark room, and lit-floor stripes
   distract. Raise legibility: stronger price-class separation, brighter cell fill or
   text contrast (labels must pass at a glance on a phone), calmer floor/room treatment
   so the island is the subject. Keep the navy/gold brand family. Verify contrast by
   MEASURING (sample rendered pixels or compute WCAG ratios for label-on-fill), then by
   LOOKING at screenshots vs his complaint.
5. **Click = highlight.** Clicking/tapping a niche must visibly light that niche up
   (selected state distinct from hover: e.g. glow/outline + slight brightness), staying
   lit while its detail card is open, cleared on close/other selection. The selection
   must also be visible in the flat wall tabs if the same niche data drives them cheaply
   — if not cheap, 3D-only is acceptable; say which you did.

## Hard constraints

- Prices, refs, rights, dimensions, MIS strings: **byte-identical data** —
  `verify_mvc_map.mjs` must stay `PASS — 0 mismatches`, and no price/ref/rights value
  changes in any view including print.
- Print output stays static-HTML, JS-free, four flat wall grids — re-verify.
- Zoom stays clamped; the new pitch clamp must not break orbit or the face-on buttons.
- No new dependencies. No blueprint imagery. `index.html` untouched.
- Branch `s06/mvc-3d-polish`; explicit staging; `git rev-parse --abbrev-ref HEAD` piped
  into the decision before every commit (`| grep -qx s06/mvc-3d-polish &&`); never push.
- Commits `[s06/mvc-3d-polish] <imperative>` +
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- If you serve the page, use port 3739 and kill your server after.

## Verify (quote verbatim)

1. `node scripts/verify_mvc_map.mjs` → PASS 0 mismatches
2. `npm run check` → `index.html: 8 blocks, 0 errors`
3. `npm test` → counts vs `1300 passed, 0 failed across 26 suites`, never fall
4. Playwright + LOOK (ops/MISTAKES.md #15/#16): initial load IS the front face-on view;
   attempt to orbit under the island → pitch stops at the clamp (read the value);
   overhead replacement/removal shown; the MIS strings visible in the orientation
   labels; before/after color screenshots; a clicked niche visibly highlighted (shot
   with card open), cleared after close. Mobile 375px spot-check. Zero console errors.
5. Print PDF re-rendered with `javaScriptEnabled:false` — 4 pages, prices present.

## Report

Per `SPRINT_GUIDELINES.md` rule 8, including the overhead-view decision you made and
before/after shots listed by filename (gitignored `scratch/_mvc3dpolish/`).
