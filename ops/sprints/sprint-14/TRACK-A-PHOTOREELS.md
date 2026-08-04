# TRACK A — Three photoreal walkthrough reels (Gaussian splats on the 3090)

You are a track subagent in sprint-14 of the BW Quote Tool. Obey
`ops/SPRINT_GUIDELINES.md` and `ops/DESIGN.md`. Work in the worktree
`../bw-quote-tool-s14a` on branch `s14/photoreels` (create both:
`git worktree add ../bw-quote-tool-s14a -b s14/photoreels`). A worktree has NO
node_modules — junction it from the main tree
(`New-Item -ItemType Junction -Path <wt>\node_modules -Target C:\Users\Martice\bw-quote-tool\node_modules`).
Commit locally with explicit paths only; NEVER push; never `git add -A`. Use
`git -C <absolute-path>` for every git command.

## Mission

Train three Gaussian-splat scenes from today's walkthrough videos and ship three
interactive walkthrough pages, each following the proven COM walkthrough architecture
(`MAPS/COM_Walkthrough.html` + `MAPS/COM_Walkthrough.splat` — read them first), with the
s11 Track F constrained-path interaction model and the s10/s11 verification gates.

**The reels are committed but NOT LINKED from any family-facing surface.** No cards on
guides.html, no header links, no buttons on map pages. The operator eyeballs each reel
before any linking (a later, separate act). The COM walkthrough's existing delisted state
stays delisted — you REPLACE its asset and page content with the new-footage scene, but do
not re-link it.

## Inputs

| Scene | Video | Duration | Covers |
|---|---|---|---|
| COM | `D:\Cemetery Photos Misc\Chapel of Memories\20260803_122734.mp4` | 14:22 | Chapel of Memories interior (the re-shoot after the s11 fog delisting; prior scar: glass-front niche walls don't reconstruct — check whether the new footage circles back on them and say honestly if they still don't) |
| TG | `D:\Cemetery Photos Misc\Terrace Garden Memorial Path\20260803_120633.mp4` | 8:16 | Terrace Garden Mausoleum + Memorial Path (the path replaced the old pool; they are one connected area) |
| ELM | `D:\Cemetery Photos Misc\Eteernal Light Maus\20260803_121735.mp4` | 9:29 | Eternal Light Mausoleum + Eternal Light Columbarium (the columbarium room is inside the building) |

All 1080p30 HEVC, one continuous shoot (12:06 → 12:17 → 12:27). Supporting still photos
sit in the same three folders — usable as extra registration images if COLMAP benefits.

## Pipeline (proven s10 recipe — reuse, don't reinvent)

1. Frames via imageio-ffmpeg (installed; `python -c "import imageio_ffmpeg; ..."` gives the
   exe). Subsample sensibly (~2–4 fps; more where the camera moves fast). Work in the
   worktree's `scratch/` (gitignored).
2. COLMAP + Brush on the RTX 3090 — authorized standing ruling. Prior installs may
   survive in `C:\Users\Martice\bw-quote-tool-splat\scratch\splat\dl` — check before
   re-downloading. Postshot is DEAD (activation never materialized) — do not retry it.
   Train the three scenes SERIALLY (one GPU). ~20–60 min each; run training as background
   tasks and keep building pages/gates while they run.
3. Splat budget: ≤30 MB per scene. Pages: `MAPS/COM_Walkthrough.html` (rework in place),
   `MAPS/TG_Walkthrough.html`, `MAPS/ELM_Walkthrough.html` + matching `.splat` assets.

## Interaction model (s11 Track F pattern — read STATE.md's Track F/F2 entry)

- Constrained path: a stop polyline through the WELL-RECONSTRUCTED region only; look is
  free, scroll/arrow eases along the path; every escape vector removed (view-matrix
  injection must stay on-path). Never route the path through fog/smear — the s11 delisting
  was exactly this.
- "Photographic preview — more still to come" label on every reel.
- 3D interaction scars apply (pointer capture deferral, tap detector, synthetic-hover
  guard — STATE.md/memory sprint-06 scars).

## Gates (per reel; standalone scripts, NOT wired into npm test — the walkthrough gate
class is too slow for the suite; document runtime)

- Loader NEVER sizes from Content-Length (GitHub Pages gzips); gate runs the full render
  pass behind a gzip proxy and asserts `vertexCount === assetBytes/32`.
- Per-stop PIXEL verification: readPixels with preserveDrawingBuffer, lit ≥85%,
  stdev/colour/detail floors, camera-position readback from the actual draw matrix.
  Sabotage (a stop moved into fog) must FAIL by name. Presence (canvas/GL exists) counts
  for NOTHING.
- Family-register assert (`scripts/_no_mis_assert.mjs`) on all three pages; "MIS" never
  rendered; no real family names legible at any stop — if the footage lingers on
  name-bearing crypt fronts that's expected cemetery reality (operator's photo-PII
  ruling covers his own property photos), but flag anything that reads as operational
  paperwork.

## Definition of done

- Three .splat assets + three pages committed on `s14/photoreels`; all three gates green
  (quote the exact commands + numbers); npm run check 8/0; npm test with your exact count
  + env-pinned command; NOTHING linked family-facing (grep-prove: no anchors to the three
  walkthrough pages outside themselves).
- Report: per-scene training stats (frames used, COLMAP registration rate, iterations,
  final size), path stop counts, gate numbers, honest defects (fog zones, glass-front
  reconstruction quality), and renders of 2–3 stops per reel in `scratch/s14a-renders/`.
