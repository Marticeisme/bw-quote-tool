# TRACK-B — AI super-resolution for the 699 PCM design plates

You are a track subagent in sprint-12 of the BW Quote Tool. Obey
`ops/SPRINT_GUIDELINES.md` and `ops/DESIGN.md`. Work ONLY in your worktree
(`git -C` absolute paths always). Branch: `s12/pcm-ai-upscale`. Commit locally with
`[s12/pcm-ai-upscale]` prefixes; NEVER push; NEVER write to Firebase; never call any
save/persist function.

## The problem

`pcm-design-images/{2020,2011}/<num>.webp` — 699 granite flat-marker design plates on
`pcm-design-catalog.html` — are ~358×204 px, extracted by `scripts/pcm_extract.py` from
the two PCM design books at `D:\Cemetery Photos Misc\Markers\` (PCM2020DesignBook_web.pdf,
comp-PCM_DesignBook2011.pdf). The books embed the plates at 347×199 (72 dpi) — that is
ALL the native detail that exists. The page's lightbox now enlarges plates to
`min(96vw, 1100px)`, a ~3× browser upscale, and the operator finds the quality "not very
good at all." Fix: real super-resolution, run once, committed.

## Operator rulings binding this track

- Real-ESRGAN portable **ncnn-vulkan** binary on the RTX 3090 is AUTHORIZED. Download
  the standalone release zip into `scratch/realesrgan/` (gitignored — verify it is
  before downloading; `scratch/` is ignored per DESIGN). Nothing installed system-wide.
- **Size budget: `pcm-design-images/` total ≤ 20 MB after your work** (currently 8.8 MB).
  Hard requirement — tune output px / webp quality to fit.
- Do NOT touch: `scripts/pcm_extract.py`, `scripts/build_pcm_catalog.py`,
  `scripts/pcm_tags.py`, `scripts/verify_pcm_catalog.mjs`, `tests/test-pcm-catalog.mjs`,
  `data/pcm-*.json`, `pcm-design-catalog.html`, or the element/photo/reference image
  dirs. Track A owns them in a parallel worktree. Your output keeps the SAME relative
  paths and filenames (`pcm-design-images/<book>/<num>.webp`) so nothing downstream
  changes.

## Build it

1. **`scripts/pcm_plate_export.py`** — exports each design plate LOSSLESSLY from the
   PDFs into `scratch/pcm-plates-raw/<book>/<num>.png` at the embedded resolution
   (extract the embedded image bytes or render the bbox at its native dpi; NEVER start
   from the shipped q64 webp — that bakes in lossy artifacts before the AI sees them).
   Reuse the plate-locating logic from `scripts/pcm_extract.py` (`design_images`,
   `match_label_to_image`, page ranges 2020 pp.6-95 / 2011 pp.6-94) by copying the
   minimal pieces — do not edit that file. Assert you export exactly the same 699
   (book, num) set that exists on disk today (354 in 2020/ incl. the crossListed
   handling, 345 in 2011/ — derive the true set from the existing files, don't trust
   these counts blindly; PCM 2271 appears in both books).
2. **`scripts/pcm_upscale.py`** — drives realesrgan-ncnn-vulkan over the raw plates
   (model: realesrgan-x4plus; try realesrgan-x4plus-anime on 3 sample line-heavy plates
   and pick the better per your own eyeball of renders — document the choice), then
   downsamples with Lanczos to a final long edge you choose (~720–900 px; the lightbox
   target is 1100 but the 20 MB budget rules — measure, then decide), encodes webp
   (quality tuned to fit budget, floor q70), writes over
   `pcm-design-images/<book>/<num>.webp`, and records
   `data/pcm-upscale-manifest.json`: per-file sha256, width, height, bytes, plus the
   model + scale + final px + quality settings used. The manifest is committed; it is
   how the gate verifies without re-running AI.
3. **Run it on the 3090.** Verify GPU actually engaged (the binary prints the device;
   a CPU fallback would take hours — abort and diagnose if throughput implies CPU).
4. **QUALITY AUDIT — look at your work.** Render before/after pairs for ≥12 plates
   covering the risk classes: laser-etch portraits (faces — AI hallucination risk),
   fine script lettering, dense floral line work, a portrait-orientation ledger, the
   darkest plates. Write pairs to `scratch/s12b-renders/`. If Real-ESRGAN mangles text
   or faces on a class of plates, say so honestly in your report and propose the
   fallback for that class (plain Lanczos from the lossless export still beats today's
   q64 webp). Do not ship a plate whose lettering is less readable than today's.
5. **`scripts/verify_pcm_upscale.mjs`** — standalone gate, exit 1 on failure:
   - exactly the expected file set (derive from manifest; count 699);
   - every file's sha256/dims/bytes match the manifest;
   - every long edge ≥ 700 px (i.e. genuinely upscaled, none skipped);
   - `pcm-design-images/` total ≤ 20 MB;
   - manifest self-consistent (no duplicate entries, settings block present).
   Sabotage-prove it both directions (corrupt a file → named FAIL; restore → PASS) and
   show the transcript in your report.
6. **`tests/test-pcm-upscale.mjs`** — thin suite wrapper that runs the gate so
   `npm test` carries it (follow the pattern of other `tests/test-*.mjs` wrappers; it
   must use `tests/_base.mjs` conventions if it serves anything — it likely just
   spawns the verifier as a subprocess).
7. **Verify nothing else moved:** `git status` shows ONLY your owned paths; run
   `npm run check` (must stay `8 blocks, 0 errors`) and the full `npm test` in your
   worktree (worktrees have no `node_modules` — junction it first; note the count).
   Run `node scripts/verify_pcm_catalog.mjs` too: it must still PASS, since you changed
   only image bytes, not paths — if it asserts image dimensions anywhere and fails,
   STOP and report; renegotiate with the director rather than editing Track A's gate.

## Report

Deliver: what shipped, the settings chosen (model/px/quality) and why, before/after
render paths, the sabotage transcript, suite counts, size arithmetic (per-dir totals),
and every honest caveat (plates where AI output is questionable, anything unverified).
Your final text is the report — raw facts over polish.
