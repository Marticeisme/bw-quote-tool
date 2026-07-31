# TRACK T — TGMP layout rework: the pool is gone (`s09/tgmp-layout`)

You are a track subagent. Read `ops/SPRINT_GUIDELINES.md` and `ops/DESIGN.md` and obey
them. Branch `s09/tgmp-layout` in your assigned worktree. You touch the TGMP data
module / build script / gate (`scripts/tgmp-*`, `scripts/build_tgmp_map.mjs`,
`scripts/verify_tgmp_map.mjs`, `MAPS/TGMP_Map.html` via rebuild only). Nothing else.

## Operator instruction (Map Issues 07.31.26)

> "Terrace garden memorial path also looks like its going to need a lot of work there
> is not pool anymore the path removed the pool entirely. Review the photos and
> overview mockup in more detail please."

## Sources (LOOK at all of them before touching geometry)

`D:\Cemetery Photos Misc\Terrace Garden Memorial Path\`:
- `COMING SOON Terrace Garden Memorial Path (Billboard (Landscape)) (1).png` — the
  official overhead mockup ("PHASE 2" render): a rectangular garden strip beside the
  mausoleum walkway; large niche-bank wall at one end (TGN); a looping PATH (light
  oval/stadium-shaped walkway) around a green lawn; benches, pedestals, columbarium
  unit, birdbath, and rows of cremation posts arranged around/along the loop; planters
  along the borders. **No pool anywhere.**
- `Screenshot 2026-07-29 203810.png` — the operator's own layout diagram: TGN bank
  5 rows × 8 ($12k/$14k/$16k/$14k/$12k by row, 2 rights per niche) + the 9 Add'l
  Cremation Properties with sales prices and rights (matches what shipped).
- `Terrace Garden Memorial Path Pricingffff.pdf` and the dated `*.jpg` site photos
  (June–July 2026) — the real built state.

The current map presumably renders a pool/water feature from the older concept —
remove it entirely and rebuild the scene to match the mockup + photos: the path loop,
lawn, bench/pedestal/columbarium/birdbath placements, cremation-post rows, planters,
and the TGN wall's true position relative to the path. Geometry is ESTIMATED from
photos/mockup (no fabricated dimensions — follow the ROAC precedent: state no
dimensions where none are sourced).

## Hard invariants (the gate already proves most of these — keep it green)

- Inventory must NOT move: TGN 40 niches $544,000 + 9 properties $218,000 = $762,000 /
  100 rights available; refs unchanged; statuses live data, carried verbatim.
- Fee schedule stays the W2 state: O&C $875 / Rec $235 / Inscription $660 + 10.4% on
  inscription / ECF 10%, card-math anchors $19,439 / $60,700 intact.
- Interaction stack (tap detector, pinned cards, print-follows-highlight) keeps working
  — rerun the map's Playwright suite and extend it for any new scene objects.

## Verification (verbatim outputs)

- `build_tgmp_map.mjs` + `verify_tgmp_map.mjs` PASS, anchors unchanged; add a gate
  assertion that no pool/water object remains (and sabotage it).
- Playwright suite green; screenshots of the new overview + a walkthrough angle in
  `scratch/s09t-renders/` — compare them against the mockup image yourself and say what
  matches and what is still estimated.
- `npm run check` 8/0; `npm test` counts not falling.

## Report

Standard format + an explicit "estimated vs sourced" list for the new geometry.
