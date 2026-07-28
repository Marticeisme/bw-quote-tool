# TRACK M2 — Clamp zoom-out on the internal WMP map

You are a small build track for sprint-06 of the BW Quote Tool project. Obey
`C:\Users\Martice\bw-quote-tool\ops\SPRINT_GUIDELINES.md` and `ops/DESIGN.md` §6.
**All work happens inside `C:\Users\Martice\bw-quote-tool\wmp-cemetery-map\`** — its own
git repo, local-only, NO remote. You never commit, branch, or edit anything in the parent
public repo, and nothing from the map's data may cross into it.

## The problem (operator, 2026-07-28, with screenshot)

On the internal cemetery map (dev server port 8642), the operator can zoom out until the
entire Puget Sound region fills the screen — the imagery tiles for half of western
Washington render in a tilted 3D view with one stray garden label floating over Seattle.
His words: "This should probably lock at some sort of zoom out and I shouldn't be able to
zoom out like this, should I?" He is right. The map is a cemetery seating chart, not a
regional map.

## The job

Add a zoom floor (and, if the library supports it cleanly, pan bounds) so the view cannot
leave the useful range around Washington Memorial Park:

1. Read `wmp-cemetery-map/index.html` and find the map initialisation (identify the
   library yourself — MapLibre/Leaflet/custom; the screenshot's pitch suggests a GL
   viewer). Find the existing overview framing (the map has a designed overview crop —
   see `docs/` in that repo if present) and derive the floor from it: **the overview zoom
   is the minimum**, give or take a small margin. Do not hardcode a magic number without
   stating how you derived it.
2. Clamp: `minZoom` (and `maxBounds`/equivalent if it does not fight the existing
   navigation — deep links, `#space=` routes, garden fly-tos must still work). If pitch
   at the floor still shows the horizon oddly, consider clamping pitch at low zoom only
   if trivial; otherwise leave pitch alone and note it.
3. Verify with Playwright (run Node from the PARENT repo root so `playwright` resolves;
   the map suite already does this via `scripts/playwright-resolve.mjs` — copy its
   pattern): programmatically attempt to zoom/scroll far out, read the resulting zoom
   level, assert it stops at the floor; confirm a `#space=<sid>` deep link still resolves
   and a garden open/close round-trip still works. Screenshot the fully-zoomed-out state
   and LOOK at it — it should frame the cemetery/overview, not Seattle.
4. If the repo's test layout invites it, add the zoom-floor assertion to an existing
   suite (`render.test.mjs` is the likely home) so a regression fails loudly. Counts may
   rise, never fall.

## Hard rules

- `git -C C:\Users\Martice\bw-quote-tool\wmp-cemetery-map` for EVERY git call — never
  bare `git`, never `cd`-and-forget. That repo has other in-flight work (other sessions);
  stage EXPLICIT paths only (`index.html`, plus any test file you edit). Check
  `git rev-parse --abbrev-ref HEAD` before committing; commit on that repo's `main`
  unless a branch already exists for unrelated in-flight work you'd disturb — if the
  working tree there has uncommitted changes to files YOU need to edit, STOP and report
  instead of stashing or committing around them.
- Never push (no remote exists; never add one). No production Firebase. No screenshots
  containing occupant names in your report or in any file that could reach the parent
  repo — the map renders real names at niche level; keep screenshots at overview/zoom
  levels that show no names, and store them in the parent repo's gitignored `scratch/`.
- Map repo gates before and after: `npm test` there must be green (currently
  19+7+8+11+24 passed and `3/3 unit files valid, 8869 units checked, index ok`).

## Report

Per `SPRINT_GUIDELINES.md` rule 8: what changed, the commit, verbatim before/after gate
outputs, how you derived the floor value, proof the clamp works and deep links survive,
what the director must verify by hand.
