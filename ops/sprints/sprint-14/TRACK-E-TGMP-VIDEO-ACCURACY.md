# TRACK E — TGMP 3D map: match the 2026-08-03 video (post-close operator round)

You are a track subagent for the BW Quote Tool. Obey `ops/SPRINT_GUIDELINES.md` and
`ops/DESIGN.md`. Worktree `../bw-quote-tool-s14e`, branch `s14/tgmp-video-accuracy`
(`git worktree add ../bw-quote-tool-s14e -b s14/tgmp-video-accuracy`); junction
node_modules from the main tree. Explicit-path commits only; NEVER push;
`git -C <abs-path>` always. No GPU.

## Operator request (2026-08-04, verbatim intent)

"the terrace garden memorial path 3d map needs to updated to match whats in the video
more accurately."

The map: `MAPS/TGMP_Map.html`, generated from `scripts/tgmp-data.mjs` →
`scripts/build_tgmp_map.mjs`, gate `scripts/verify_tgmp_map.mjs`. Built in sprint-09
(Track T) from a marketing billboard render (pixel-segmented) cross-checked against
seven site photos — BEFORE any video existed. Now there is 8:16 of walkthrough video:
`D:\Cemetery Photos Misc\Terrace Garden Memorial Path\20260803_120633.mp4`
(1080p30 HEVC), plus the stills in that folder, plus the TG splat-reel stop captures
preserved in main-repo `scratch/s14-renders/s14a-renders/TG-stop-*.png`.

## What to correct (video is the authority for what physically exists)

Re-derive the LAYOUT from the video: the central walk's true shape and the round
flagstone turn-around, where each of the nine TGMP properties actually stands
(benches, columbarium, birdbath, cremation posts), the bark beds' extents, the eight
context planters, and especially the TGN niche bank — s09 flagged its rotation/facing
across the far end as "the weakest estimate, flagged on-page". Fix what the video
contradicts; keep what it confirms; keep the on-page honesty sentences accurate
(update them if an estimate becomes footage-confirmed).

Known from other tracks' viewing of this same video: there is NO pool (gate asserts
it — keep); a boarded plywood panel near an entrance ≈6:40 suggests construction (do
not model; report); if the video shows the Terrace Garden Ossuary structure, do NOT
silently re-add it — its existence ruling is still open with the operator; report
what you see with a timestamp, and only if clearly visible add it as an INERT
unpriced structure like TG_Mausoleum_Map does, stating the pending ruling in your
report.

## Hard constraints

- **Inventory, prices, fees, statuses UNTOUCHED.** Gate anchors that must not move:
  TGN 8×5 grid at $12k/$14k/$16k/$14k/$12k rows, 2 rights/niche; TGMP-1..9 line items;
  $544,000 + $218,000 = $762,000 available; 100 rights; the MVC June-2026 fee schedule
  and its to-the-cent card math ($17,600 / $19,439 / $60,700). Geometry/PLACEMENT only.
- Data module → builder → gate; never hand-edit the page; byte-deterministic rebuild;
  CRLF.
- Update `verify_tgmp_map.mjs`'s LAYOUT section to assert the corrected geometry, with
  sabotages proven both directions on the rules that APPLY.
- Camera scars from s09 stand: the bank-preset fit-solve can go negative-root (clamp
  to orbit exists — keep it working); rotateX(-90) back-faces print mirrored text —
  re-check after moving ground slabs. Movement-runtime asserts must stay green.
- `verify_tg_maus_map.mjs` (the sibling building map) asserts a reciprocal anchor on
  TGMP_Map — keep both link directions green.
- Frame extraction: Playwright's bundled ffmpeg CANNOT demux these HEVC clips. Use
  python + imageio_ffmpeg (proven by Track A: `python -c "import imageio_ffmpeg; ..."`
  gives the exe) — CPU only. Frames/contact sheets go in your worktree `scratch/`
  (gitignored), NEVER in the repo: the footage shows inscribed niche plates with real
  names.
- Don't touch: index.html, guides, other maps (except nothing — TG_Mausoleum link
  stays as-is), walkthrough pages/scripts, catalogs, contract code.

## Definition of done

- Gate green with the new geometry asserts (quote numbers); `npm run check` 8/0;
  `npm test` exact count + env-pinned command (expect the worktree wmp-variance:
  test-contact-csv 134 not 136); renders (overview + bank face-on + path-level walk
  stops) in `scratch/s14e-renders/`, EYEBALLED by you against video frames
  side-by-side.
- Report: every geometry change as before → after with the video timestamp that
  justifies it; what the video could NOT settle (stated honestly); ossuary sighting
  yes/no + timestamp; exact commands run.
