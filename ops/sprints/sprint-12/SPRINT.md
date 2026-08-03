# Sprint 12 — PCM catalog image quality + format search

**OPENED 2026-08-03** (director: Fable session; tracks: Opus per operator). Operator
request: "go over the pcm catalog design elements and photos and improve the quality
with ai. the products are larger now which is helpful but the quality is not very good
at all" — plus, mid-boot: "if i type in companion it should show me all the companion
designs."

## Reality at boot

- Main clean, `main==origin/main` at `1887e92`. `8 blocks, 0 errors`. Full-suite
  baseline run recorded by the director before spawning (STATE has the number).
- Measured image inventory (director probes, 2026-08-03):
  - `pcm-design-images/`: 699 webp, ~358×204. **Source PDFs embed the plates at
    347×199 (72 dpi)** — no more native detail exists; AI super-resolution is the only
    route up. Currently 8.8 MB.
  - `pcm-element-images/`: 3,973 1-bit PNGs at ≤150px. **The Elements book embeds
    270×270 / 360×360 tiles** — a genuine ~2× native gain is available by re-extraction
    alone. Currently 15 MB.
  - `pcm-example-images/`: 30 jpg at 760px, cut from full-res (~4000px) originals in
    `D:\Cemetery Photos Misc\Markers`. Currently 3.6 MB.
  - `pcm-reference-images/`: 13 webp. Currently 0.75 MB.
- Lightbox (post-s11 operator fix) forces plates to `min(96vw,1100px)` — a ~3× browser
  upscale of the 360px plates. That is the visible complaint.

## Operator rulings at boot (2026-08-03)

1. **Scope: all four image classes.**
2. **Repo growth cap: +30 MB total** across all PCM image dirs (current total ~28 MB).
   Hard-gated, per-class budgets below.
3. **Real-ESRGAN (portable ncnn-vulkan) on the RTX 3090, authorized** — standalone
   binary in `scratch/`, nothing system-wide, extends the 2026-08-01 install ruling.
4. **Search: "companion" must return all companion designs** — format/category words
   (companion, individual, ledger, flat …) match designs by `fmt`/`cat`/`sub`, layered
   on top of the E2 subject-tag search.
5. Tracks run on **Opus** (operator-specified).
6. **NO push pre-authorization.** Push is an explicit close-gate ask.

## Tracks

- **TRACK-A — native-resolution re-extraction + format search** (`s12/pcm-native-res`,
  worktree). Elements re-extracted at native ~300px (anti-aliased, budget-encoded),
  photos re-cut at 1600px, reference plates re-rendered; format/category search;
  gates updated. Owns `scripts/pcm_extract.py`, `scripts/build_pcm_catalog.py`,
  `scripts/pcm_tags.py`, `scripts/verify_pcm_catalog.mjs`,
  `tests/test-pcm-catalog.mjs`, element/photo/reference dirs, `data/pcm-*.json`,
  `pcm-design-catalog.html`.
- **TRACK-B — AI super-resolution for the 699 design plates** (`s12/pcm-ai-upscale`,
  worktree). Lossless plate export straight from the PDFs → Real-ESRGAN on the 3090 →
  ~720px webp, committed; NEW standalone gate `scripts/verify_pcm_upscale.mjs` verifies
  the committed artifacts (never re-runs AI). Owns `pcm-design-images/`,
  `scripts/pcm_plate_export.py`, `scripts/pcm_upscale.py`, its gate + suite. Does NOT
  touch Track A's files (data JSON paths unchanged: same `<num>.webp` names).

Size budgets (post-work dir totals, gated): designs ≤ 20 MB · elements ≤ 28 MB ·
photos ≤ 9 MB · references ≤ 1 MB. Sum ≤ 58 MB = current 28 MB + the 30 MB cap.

- **TRACK-C — guide print design** (`s12/guide-print-design`, worktree; ADDED mid-sprint
  2026-08-03 on the operator's complaint + screenshot). Restore BW logos to the guide
  PDFs (reverses the print-hidden ruling), cream full-bleed to the page edge, remove
  the "Bonney Watson" running header, seat the running footer ON the cream; all 19
  PDFs rebuilt; page caps hold at 6; guide gates stay green. Owns
  `scripts/guide-print-system/`, guide-print.css, `*-guide.html` print structure, the
  19 PDFs + `.build-manifest`. Disjoint from A/B (no PCM files).

## Merge order

B → A → C. (B is the headline complaint; A rebuilds `data/pcm-catalog.json` + the HTML
on top of B's plates; C is file-disjoint from both and merges last.) Parallel spawn is
safe: file ownership is disjoint by design; the only shared surface for A/B is the
built HTML, which A regenerates at the end anyway.

## Close checklist

- Both tracks merged `--no-ff`, director re-ran: syntax check, full suite (counts vs
  baseline), `verify_pcm_catalog.mjs`, `verify_pcm_upscale.mjs`, size budgets.
- Director eyeball: lightbox render of ≥6 upscaled designs (incl. a portrait ledger and
  a laser-etch portrait plate — AI artifact risk is highest on faces/fine script),
  ≥6 elements at new size, "companion" and "roses" searches.
- Repo delta measured and reported. Push only on explicit operator word.

## Deferred candidates (carried from the s11-close draft, NOT in this sprint)

1. Photo-first rollout wave 2 (photo gaps: lawn crypts, scattering gardens folder
   EMPTY, ground-burial scene, veterans).
2. Walkthrough re-shoot → COLMAP+Brush rerun → extend the 7-stop path (~45-min gate,
   not in npm test).
3. s11 operator rulings pending: RAD Family niche height/depth; "CONFIRM" chip wording;
   Design Inspiration placement; per-part marker-PDF headers; price-ladder labels;
   boats under "fishing" in PCM search; tag chips always-visible vs search-only.
4. s10 carried: translated guides; family packet C; ROAC D-INT D-5; GOM B-7/B-11;
   ROAC floor-walk camera.
5. Serenity 3D label crowding (LOD floor raise).

## Standing facts for the next director

- Push discipline: another session may push out of band — fetch and check behind-count,
  integrate by MERGE, never rebase a main carrying --no-ff merges.
- Never spawn a main-tree track while merges remain (s11 deviation, twice-learned).
- Check `/__served-tree` before trusting anything on port 3737.
