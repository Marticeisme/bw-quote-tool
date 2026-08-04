# TRACK G — Terrace Garden Mausoleum map goes 3D (post-close operator round)

You are a track subagent for the BW Quote Tool. Obey `ops/SPRINT_GUIDELINES.md` and
`ops/DESIGN.md`. Worktree `../bw-quote-tool-s14g`, branch `s14/tg-maus-3d`
(`git worktree add ../bw-quote-tool-s14g -b s14/tg-maus-3d`); junction node_modules
from the main tree. Explicit-path commits only; NEVER push; `git -C <abs>` always. No GPU.

## Operator request (2026-08-04, verbatim intent)

"From the video it may be best to make a terrace garden 3d mausoleum map as well."

`MAPS/TG_Mausoleum_Map.html` (sprint-14 Track B: `scripts/tg-maus-data.mjs` →
`build_tg_maus_map.mjs` → `verify_tg_maus_map.mjs`) is currently PLAN-VIEW ONLY. Give
it a 3D view in the house style — **`MAPS/ELM_CryptMap.html` (Track C, this sprint) is
your model**: 3D room view + plan + sections tabs, CSS-3D extruded blocks, kind-by-hue
+ confidence-by-hatch, camera presets, the `scripts/map-movement.mjs` feel, tap
detector and the sprint-06 interaction scars. Read `build_elm_map.mjs` thoroughly
before writing anything — reuse its approach; don't invent a second 3D idiom.

## Geometry sources

1. The existing `tg-maus-data.mjs` footprints (MIS-derived; keep refs/labels/counts
   EXACTLY — this track adds a rendering, not a re-survey).
2. The video: `D:\Cemetery Photos Misc\Terrace Garden Memorial Path\20260803_120633.mp4`
   (8:16) — the authority for HEIGHTS, materials, the covered-walkway roof form, wing
   elevations, family-room fronts, the entrance. Frame extraction via python +
   imageio_ffmpeg (Playwright's ffmpeg cannot demux these clips); frames stay in
   worktree scratch/, never the repo (inscribed crypt fronts with real names).
3. TG splat-reel captures in main-repo `scratch/s14-renders/s14a-renders/TG-stop-*.png`.

This is an OUTDOOR courtyard building — the 3D scene is blocks around an open court
(the Memorial Path), not an interior room. The courtyard link zone to `TGMP_Map.html`
must exist in the 3D view too (a click-through ground zone, like ELM's columbarium
link zone), and the ossuary stays INERT with its pending-ruling note.

## Hard constraints

- GEOMETRY-FIRST rules unchanged: zero prices, zero statuses, "Ask us" everywhere,
  empty slots preserved. Bank refs TGM-W-1..13 / TGM-E-14..28 / TGM-T and every label
  EXACTLY as the data module has them (the gate anchors them).
- Keep the plan + banks-list views working (print path included); the 3D view is an
  ADDITION. All three cross-links to TGMP_Map keep working (header/courtyard/footer)
  and `verify_tgmp_map` stays green (you shouldn't touch its files at all — Track E is
  ACTIVELY REWORKING TGMP's geometry in another worktree; do not read its worktree, do
  not touch `tgmp-data.mjs`/`build_tgmp_map.mjs`/`MAPS/TGMP_Map.html`).
- Extend `verify_tg_maus_map.mjs` for the 3D view (blocks rendered 1:1 with the
  dataset, link zone present, no price/status leakage into 3D cells, tap targets) with
  sabotages both directions on rules that APPLY; keep its existing asserts green.
- Interaction scars: deferred pointer capture, tap detector ≤8px/<700ms, synthetic-
  hover guard, hover freeze mid-drag, preset ease FROM current camera; verify
  interactions with touchscreen.tap() through the real event path, never el.click().
- CRLF; byte-deterministic rebuild; family-register gate wired; don't touch guides.html
  (Track F owns it right now), index.html, other maps, walkthrough files, catalogs.

## Definition of done

- Gate green (quote numbers); npm run check 8/0; npm test exact count + env-pinned
  command (worktree wmp-variance expected); renders: 3D overview, a wing bank face-on
  preset, the courtyard link zone in 3D, plan tab unchanged — in `scratch/s14g-renders/`,
  eyeballed, with 2–3 video frames you matched heights/materials against.
- Report: what the video settled (heights, roof, materials) with timestamps, what
  stayed estimated, exact commands + numbers, anything unverified stated plainly.
