# TRACK Y — Photoreal COM walkthrough: gaussian splat trained locally on the 3090

Repo: `C:\Users\Martice\bw-quote-tool`; you run in the WORKTREE
`C:\Users\Martice\bw-quote-tool-splat` on branch `s10/com-splat` (node_modules junction
in place). ALWAYS `git -C C:\Users\Martice\bw-quote-tool-splat …`. Obey
`ops/SPRINT_GUIDELINES.md` + `ops/DESIGN.md`. Commit locally with explicit paths,
NEVER push; never write production Firebase; never read `wmp-cemetery-map/`.

## Operator authorization (2026-08-01, verbatim)

"if theres'a nyother software you need feel freee to downloadn ad use my 3090" — you
may download, install and run 3D tooling on this machine (NVIDIA RTX 3090, 24 GB).
Named toolset (stick to these unless one fails, and log exactly what you installed,
from where, and its version): **Postshot** (jawset.com, free beta — has a CLI in
recent builds) as the trainer; fallbacks **Brush** (open-source CLI splat trainer) or
**Nerfstudio** (pip, splatfacto); `imageio-ffmpeg` for frame/clip prep; PlayCanvas
**splat-transform** (npm) for compression/format conversion. Install per-user where
possible; no system-setting changes; document install paths so the operator can
uninstall.

## Goal

A photoreal, navigable 3D walkthrough of the Chapel of Memory Mausoleum, published as
its own page (`MAPS/COM_Walkthrough.html`) beside the clickable crypt map — trained
from the operator's video `D:\Cemetery Photos Misc\Chapel of Memories\20260729_124129.mp4`
(~2.5 min, phone, portrait-rotated). Names visible on crypt fronts are fine to publish
(operator ruling 2026-07-29: his property photos/media may show memorial names).

## Pipeline

1. Prep: extract frames (2–4 fps, dedup blurry ones) or feed the video directly if
   the trainer accepts it. The clip is a single continuous walk — good overlap.
2. Train the splat on the 3090. Budget ~1–2 hours wall clock max for training runs
   total; if quality is poor after two attempts (interiors with motion blur can be),
   report honestly with screenshots rather than burning the night.
3. Clean: crop stray floaters/sky, trim to the building interior
   (splat-transform or Postshot's own tools).
4. Compress for the web: target the smallest format that keeps quality —
   splat-transform's compressed outputs (e.g. SOG/compressed .ply/.splat). **Hard cap
   60 MB committed**; if you cannot get under it, commit nothing heavy and report.
5. Viewer page `MAPS/COM_Walkthrough.html`: self-contained (vendored single-file
   viewer — antimatter15/splat-style WebGL1 for mobile reach, or the PlayCanvas
   engine viewer if clearly better; NO CDN references — GitHub Pages CSP-style
   self-containment is the house rule), family header ("← Quote Tool", link to the
   clickable crypt map `COM_CryptMap.html` and back), touch + mouse orbit/walk
   controls, a short "this is a photographic reconstruction; check the crypt map for
   availability and pricing" note. Add a "Photoreal walkthrough" link/button on the
   COM crypt map header (via its builder + rebuild, gate must stay PASS) and ONE
   guides.html Maps card (pill +1).
6. Heavy intermediates (frames, checkpoints, raw .ply) stay OUTSIDE the repo
   (scratchpad/scratch, gitignored). Committed: the final compressed splat asset,
   the viewer page, builder edit, guides card, build-log entry.

## Verification gates (quote outputs verbatim)

1. Committed asset size printed (`ls -l`), ≤ 60 MB; page self-contained (grep: no
   http(s) URL loads except same-origin).
2. Playwright: the page loads, the splat renders (canvas non-blank — screenshot and
   LOOK; headless may need `--use-gl=angle` or similar flags — document what worked),
   orbit responds, links resolve both ways, zero page errors. Screenshot from at
   least 3 viewpoints including the chapel and one niche wall.
3. `node scripts/verify_com_map.mjs` PASS after the header-link rebuild;
   `verify_guides_page.mjs` ALL OK; `npm run check` 8/0; `npm test` counts never
   fall (contract 1534/31; port-3737 worktree artifact documented).
4. Report: tools installed (name/source/version/path), training settings and wall
   time, quality assessment with honest screenshots, asset size before/after
   compression, gates verbatim, open questions.
