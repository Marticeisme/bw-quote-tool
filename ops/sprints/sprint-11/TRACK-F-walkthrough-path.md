# TRACK F — Walkthrough: constrain to the filmed path, label as preview

Branch `s11/walkthrough-path` (small track; runs in wave 3). Obey
`ops/SPRINT_GUIDELINES.md` + `ops/DESIGN.md`. Surface:
`MAPS/COM_Walkthrough.html` (+ its builder/verifier — find them under `scripts/`;
the splat file `MAPS/COM_Walkthrough.splat` is data, don't touch it).

## Context (director-verified 2026-08-02)

The Gaussian-splat walkthrough renders fine (56fps headless, camera responds) but
the reconstruction only reads as "photoreal" near the original filming path;
free-walking off it dissolves into fog (director screenshots in
`scratch/walkthrough-probe/`). Glass-front walls never reconstructed. A re-shoot
is queued for a later sprint. Operator ruling: **constrain the camera to
filmed-path viewpoints, label the page a preview, keep the COM-map link.**

## Work

1. Replace free translation with movement ALONG a path of curated viewpoints
   (stops or a spline through the well-reconstructed region — derive from the
   existing camera data / walk stops; pick positions that LOOK good and prove it
   with screenshots at every stop). Drag-to-look stays free; scroll/arrow keys
   advance/retreat along the path with easing; you can never leave the path.
2. On-page label: photographic preview wording (plain, family-appropriate; it
   already says "photographic reconstruction, not a survey drawing" — add that
   more coverage is coming only if the operator's voice would say it; keep it
   short). Zero "MIS".
3. Keep the existing pixel-readback verifier green; extend it to assert every
   path stop renders ≥ a lit-pixel threshold (this encodes "looks decent" as a
   gate) — the s10 scar: presence checks lie, only pixel readback counts.

## Verification

- Walkthrough gate (gzip-proxy render pass) green incl. new per-stop pixel
  assertions; sabotage one stop position into the fog and show the gate fails.
- Playwright: arrows/scroll move along the path; a wild drag+scroll sequence
  cannot escape (camera position stays within path bounds).
- Full contract: `8 blocks, 0 errors`; `npm test` ≥ the current count (director
  states it at spawn; quote verbatim).
- Screenshots at every stop under `scratch/s11f-renders/`.

## Report

Standard format + the stop list with per-stop lit-pixel percentages.
