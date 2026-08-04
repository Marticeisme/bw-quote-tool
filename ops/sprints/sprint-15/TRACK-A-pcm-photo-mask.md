# TRACK A — s15/pcm-photo-mask: remove photographs from the PCM design plates

## Mission

The operator ruled that AI-enhanced photographs embedded in the PCM design plates look
bad (Real-ESRGAN mangles faces — reference: a plate whose oval ceramic portrait of a
child came back visibly warped) and must be **removed entirely**, replaced with the
Bonney Watson logo "or anything you think is best" (judgment delegated to you, within
taste: this is a cemetery catalog families browse).

**The class to remove:** continuous-tone photographic insets — ceramic-photo
reproductions of real people, usually inside an oval or rectangular frame within the
design. **NOT in scope:** etched/laser portraits (line-art engravings derived from
photos are the product itself and STAY), carved figures, any non-photographic art.
Borderline cases: record a verdict and flag them in your report rather than guessing
silently.

## The pipeline you are modifying

- `pcm-design-images/{2020,2011}/*.webp` — 699 shipped plates, ~700px long edge,
  produced once by GPU (Real-ESRGAN x4 from lossless re-exports) or Lanczos fallback
  (22 plates), pinned byte-for-byte in `data/pcm-upscale-manifest.json`
  (sha256/bytes/w/h/method per file, settings block, methodCounts, totalBytes).
- Gate `scripts/verify_pcm_upscale.mjs` (+ suite twin `tests/test-pcm-upscale.mjs`)
  verifies everything against that manifest and asserts the 22-plate fallback set
  EXACTLY in both directions. Your masked plates need the same treatment (below).
- Raw lossless masters: `C:\Users\Martice\bw-quote-tool\scratch\pcm-plates-raw\{2020,2011}\*.png`
  (MAIN tree, gitignored — use that absolute path; your worktree has no scratch).
- Contact-sheet generator exists: `scripts/pcm_contact_sheets.py` (s11 provenance).
- Logo: `logo-navy.svg` at repo root (navy fleur — the official brand mark).

## Deliverables

1. **Census (by eye, all 699).** Regenerate contact sheets from the SHIPPED webps into
   your own scratch dir and eyeball every sheet. List every plate carrying a
   photographic inset. **If the census exceeds 120 plates, STOP and report before
   masking** — that's an operator-scale question.
2. **`data/pcm-photo-masks.json`** (checked in): per affected plate `book/num`, one or
   more regions (bbox in the coordinate space you mask in, shape oval|rect), and a
   short verdict note. Include a `_what`/`_provenance` header like the repo's other
   data files.
3. **`scripts/pcm_photo_mask.py`**: deterministic, idempotent application of that
   region file. Preferred source path: mask the RAW png, then reproduce that plate's
   shipped pipeline (Real-ESRGAN for esrgan-method plates — the ncnn-vulkan binary
   lived in main-tree `scratch/`; check it's still there; the s12 install ruling covers
   reusing it — Lanczos for the 22 resample plates), encoding with the manifest's exact
   settings. **Acceptable fallback** if the GPU path is impractical: decode the shipped
   webp, mask, re-encode once at quality ≥ current — but eyeball three-ups for
   generation loss and say plainly which route shipped and why.
4. **Replacement design** (your call, operator delegated): recommended default — keep
   the drawn frame if one exists, fill the region with a neutral tone sampled from the
   plate's panel interior, center the navy fleur at a modest scale (rasterize
   logo-navy.svg via Playwright from the repo root; run Node from repo root so
   require resolves). Dignified placeholder, not an advertisement. **Eyeball every
   masked plate before/after** — verify-by-looking is binding in this repo; counting
   is necessary and not sufficient.
5. **Manifest update**: edited entries get new bytes/sha256/w/h plus
   `photoMasked: true` and a `maskReason` string; `settings` gains a `photoMask` block
   describing method/source/settings; `totalBytes` recomputed; `methodCounts`
   unchanged (method stays esrgan/resample — masking is orthogonal).
6. **Gate + suite**: `verify_pcm_upscale.mjs` and `tests/test-pcm-upscale.mjs` gain an
   `EXPECT_PHOTO_MASKED` set asserted BOTH directions (a listed plate without
   `photoMasked` fails; a masked plate not listed fails; every masked entry needs a
   reason ≥ 8 chars). Sabotage-prove both directions and record the runs. Rules that
   have bitten before: **a sabotage that changes nothing must itself FAIL**; sources
   are CRLF — any needle matching across lines must tolerate `\r?\n`; a sabotage
   needle must hit the rule/code that APPLIES.
7. **`scripts/verify_pcm_catalog.mjs` byte floors**: masking shrinks
   pcm-design-images bytes. If a floor trips, adjust it honestly (derived from the new
   shipped bytes) and note it in your report. Change NOTHING else in that gate.
8. **Audit artifacts**: copy final before/after three-ups per masked plate plus a
   masked-plates contact sheet to
   `C:\Users\Martice\bw-quote-tool\scratch\s15a-mask-renders\` (absolute path).

## Hard scope walls

- Do NOT touch `scripts/build_pcm_catalog.py`, `pcm-design-catalog.html`,
  `data/pcm-catalog.json`, or any test/gate for the catalog page beyond the byte floor
  in item 7 — the director is editing the compare UI and the photos list in the main
  tree RIGHT NOW; overlapping diffs will conflict the merge.
- Do NOT touch `index.html`, contract generators, guides.
- NEVER call any Firebase save/persist function from any script (live production data;
  a test script wiped it once). Reads only.
- Real Examples photos, element images, reference plates: out of scope (director owns
  the photos list this sprint).

## Discipline

- Work only in your worktree; `git -C <absolute-path>` for every git command; stage
  explicit paths only (never `git add -A`); commit on your branch with clear messages.
- Put Node/Playwright helper scripts in the repo `scratch/` idiom (your worktree's
  scratch), run from repo root.
- Report: the census with per-plate verdicts (borderlines flagged), which mask route
  shipped, EXACT env-pinned commands you ran, gate/suite numbers (per-suite, not just
  totals), and an honest list of anything unverified.
