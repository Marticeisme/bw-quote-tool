# Research: making OUTDOOR photoreels work (sprint-14, 2026-08-03)

Context: the indoor reels (COM marble corridors) reconstruct beautifully; the Terrace
Garden outdoor stretch shows the classic outdoor failure set — spiky "needle" noise on
grass/bark (TG stop 7), smear streaks at frame edges (TG stop 3). Most of the cemetery
is outdoors, so this is the road map for doing outdoor well. Sources at bottom.

## Why outdoor breaks (named failure modes, all visible in our TG reel)

1. **Sky** has no depth — the trainer hallucinates floaters trying to explain it.
2. **Vegetation + wind**: anything that MOVES between frames (leaves, grass blades)
   violates the static-scene assumption → ghosting and spikes. "Needles" are Gaussians
   gone ultra-anisotropic to overfit sparse views; grass is the perfect needle factory.
3. **Auto-exposure drift**: walking sun→shade flickers brightness between frames and
   destabilizes both COLMAP and training. (Phone default = auto.)
4. **Moving sun/shadows** during a long capture = the same wall photographed in two
   lighting states.
5. **Single eye-level pass**: surfaces seen in <3 overlapping frames come out blurry
   or holed; ground dominates the frame while architecture gets glancing coverage.

## The biggest lever is the CAPTURE, not the trainer ($0, next re-shoot)

- **Overcast day, calm wind.** Even light, no moving shadows, no moving foliage. This
  single choice beats every software fix below.
- **Lock exposure** (Samsung Pro Video mode) and use a fast shutter — motion blur on a
  walking capture erases detail the trainer needs. 4K if the phone offers it.
- **Slow, deliberate walk; two passes per route** at different heights (chest-level and
  raised overhead), looping back to the start — loop closure and 70–80% overlap are
  what COLMAP wants.
- **Aim at architecture, not down the path**: keep stable built texture (monuments,
  crypt walls, benches, pavement) as the visual anchor; never let the frame be mostly
  grass or mostly sky. Film feature stops the way the reels will show them.
- **Plan the route like the reel**: arrival (wide, establishes scale) → decision points
  (path forks) → feature stops (the properties), connected — don't orbit a monument
  without connecting it to the walking route.

## Trainer levers we already own (Brush)

- **Brush v0.3 trains "MCMC-like" with a max-splat cap** — better exploration on large
  scenes; raise the cap for outdoor scenes (they need more primitives than corridors).
- **Brush v0.2+ supports MASK FOLDERS** — per-frame masks the trainer ignores. The
  outdoor unlock is **sky masking**: auto-segment sky per frame (any off-the-shelf
  sky-segmentation model runs fine on the 3090) and feed masks so the trainer never
  tries to explain sky with floaters. Same trick can mask our own moving shadow.
- **Post-training cleanup pass**: prune ultra-anisotropic splats (needle filter — the
  practical version of "effective-rank regularization" research) and crop the splat to
  the path corridor's bounding box before web conversion. Cheap, big visual win on
  exactly the TG-stop-7 class of noise.
- Academic follow-ons if we ever need them: EFA-GS / StableGS / Pixel-GS (floater
  suppression), Horizon-GS + DRAGON (aerial+ground fusion) — research-grade, not
  drop-in; noted, not recommended now.

## Scope strategy for "most of the cemetery is outside"

- **Do NOT attempt one whole-grounds splat.** Per-route scenes (what we already built)
  is also what the literature converges on: split captures when the light changes, the
  route stops overlapping, or the file gets big. The maps remain the wayfinding layer;
  reels are feature stops along visitor routes — the existing doctrine holds.
- **Drone + ground fusion** exists (Horizon-GS CVPR 2025, DRAGON, commercial
  aerial-ground merges) and is how campuses/parks get done end-to-end — but it brings
  FAA Part 107, cross-elevation registration pain, and research-grade tooling. Not the
  next step; revisit if a whole-grounds flyover product is ever wanted.

## The one purchase worth considering: a 360 camera (~$430–550)

Insta360-class 360 video is the standard outdoor-grounds workflow now: ONE slow 5-min
walk captures every direction at once (every frame sees the whole scene — coverage that
dozens of careful phone passes can't match), then equirect frames reproject to pinhole
views for COLMAP/Brush (established pipelines exist, incl. fully-hosted ones). Settings
that matter: 8K over high framerate, locked exposure, slow walk, clean lenses. For a
cemetery whose product IS outdoor grounds, this is the highest-leverage hardware dollar
available. Recommendation: if outdoor reels become a priority after this sprint's
eyeball gate, buy the 360 camera before booking a re-shoot day.

## Concrete GitHub tools (checked 2026-08-03)

**Cleanup of what we already trained** (could rescue the TG reel without a re-shoot):
- `francescofugazzi/3dgsconverter` — CLI, GPU-accelerated Statistical Outlier Removal
  + density filtering on .ply/.splat; the scriptable needle/floater pruner that slots
  straight into our build pipeline (deterministic, gateable). FIRST THING TO TRY.
- `playcanvas/supersplat` — free browser editor; hand-crop floaters and background,
  good for one-off surgical fixes the CLI pass misses.
- `smlab-niser/clean-gs` — semantic-mask-guided pruning (3–5 masks remove background
  clutter classes, e.g. sky/grass noise); Python CLI.
- `m-schuetz/Splatshop` / `jason9075/Gaussian-Splat-Editor` — heavier editors; ring
  rendering mode is purpose-built for finding floaters. Backup options.

**360-camera pipeline** (if the camera is bought):
- `nicolasdiolez/360Extractor` — desktop app + CLI: equirect video → rectilinear
  pinhole datasets for COLMAP, with AI operator-removal (masks out the person holding
  the camera — which is otherwise in EVERY frame of a 360 walk).
- `alexmgee/lichtfeld-360-plugin` — full training-ready pipeline: sharpness-aware
  frame selection, SAM-3 auto-masking of the operator, COLMAP with GPU features +
  LightGlue matching. The most complete open pipeline found.
- `Kotohibi/Metashape_360_to_COLMAP_plane` — equirect → 6-face cubemap → COLMAP text;
  simple and scriptable.
- `MrNeRF/awesome-3D-gaussian-splatting` — the living index; check it before any
  future build-vs-buy decision.

Practical sequence this suggests: (1) try 3dgsconverter SOR/density on the existing
TG splat + a SuperSplat pass — maybe the current footage is salvageable; (2) if the
operator wants outdoor at scale, buy the 360 camera and adopt 360Extractor or the
lichtfeld plugin; (3) sky masks via Brush's mask folders on the next phone re-shoot
regardless.

## Gate lesson (already applied this sprint)

Statistical pixel floors (lit %, stdev, detail) CANNOT distinguish sharp noise from
sharp architecture — TG stop 7 passes every floor while being unshowable. The pipeline
now needs an eyeball cull as a standing stage, and stops should be AIMED at
best-reconstructed architecture rather than inheriting the filmed camera's direction.

## Sources

- realhorizons.ai — Outdoor Gaussian Splatting Capture Guide; Insta360 guides
- freegaussian.ai — capture best practices; Insta360-to-splat guide
- volinga.ai — field lessons (wind, vegetation, luminosity)
- github.com/ArthurBrussee/brush — v0.2 mask folders/alpha, v0.3 MCMC-like + max-splat cap
- arXiv: eRank-GS, EFA-GS, StableGS, Pixel-GS, TIDI-GS (needle/floater suppression);
  Horizon-GS (CVPR 2025), DRAGON (aerial+ground); DroneSplat
- splatware.com / splatica.com — 360-video-to-splat workflows
